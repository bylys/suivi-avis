/**
 * debug/service-coverage-audit.js — Phase fix/service-routing-audit
 * Runtime service coverage audit using actual imported modules.
 * Zero Python parser, zero text heuristics — executes the same code paths as the generator.
 *
 * Loaded only when ?imageGenTests=1.
 * Exposed as window._runServiceCoverageAudit().
 *
 * Security: no real API calls, no Slack, no image generation.
 */

import { SERVICE_CATALOG }                          from '../config/service-catalog.js';
import { WORK_SCENES, SITE_REALISM }                from '../services/index.js';
import { _serviceGroup, _applySiteRealism }         from '../resolution/service-resolver.js';
import { buildDallePromptV2 }                       from '../prompt/scene-builder.js';

// ─── Normalization (mirrors scene-builder.js _normalize) ─────────────────────
function _norm(s) {
  return (s || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/['']/g, "'");
}

// ─── Classify one service using the actual runtime logic ─────────────────────

function classifyService(metierKey, serviceLabel) {
  const normalized = _norm(serviceLabel);

  // Step 1: Does a WORK_SCENE entry exist for this metier key?
  if (!Object.prototype.hasOwnProperty.call(WORK_SCENES, metierKey)) {
    return {
      routing_coverage:  'GENERIC_FALLBACK',
      routing_detail:    `No WORK_SCENES key "${metierKey}"`,
      matched_regex:     null,
      fallback_used:     false,
      routing_evidence:  { type: 'no_work_scene', metier_key: metierKey },
    };
  }

  // Step 2: Does SITE_REALISM have an entry?
  if (!Object.prototype.hasOwnProperty.call(SITE_REALISM, metierKey)) {
    return {
      routing_coverage:  'PARTIAL_CONTEXTE',
      routing_detail:    'WORK_SCENE found but no SITE_REALISM entry',
      matched_regex:     null,
      fallback_used:     true,
      routing_evidence:  { type: 'no_site_realism', metier_key: metierKey },
    };
  }

  const entry = SITE_REALISM[metierKey];

  // Step 3: _dispatch: 'service' — depannage_auto
  if (entry._dispatch === 'service') {
    const bucket = _serviceGroup(serviceLabel);
    return {
      routing_coverage: 'ROUTED_TO_SPECIFIC_SCENE',
      routing_detail:   `_dispatch=service, bucket=${bucket}`,
      matched_regex:    'direct_mapping:_serviceGroup',
      fallback_used:    false,
      routing_evidence: { type: 'dispatch_service', bucket, normalized_input: normalized },
    };
  }

  // Step 4: _dispatch: 'contexte' — étanchéité
  // Scenarios are nested inside context keys (e.g. entry.maison.scenarios, entry.immeuble.scenarios).
  // Gather all _for patterns across all context sub-objects and all their scenario arrays.
  if (entry._dispatch === 'contexte') {
    const allScenarios = [];
    for (const [key, value] of Object.entries(entry)) {
      if (key.startsWith('_')) continue;
      if (value && Array.isArray(value.scenarios)) {
        allScenarios.push(...value.scenarios);
      } else if (Array.isArray(value)) {
        allScenarios.push(...value);
      }
    }
    // Also check top-level entry.scenarios (some entries may have it)
    if (Array.isArray(entry.scenarios)) allScenarios.push(...entry.scenarios);

    for (const scenario of allScenarios) {
      if (scenario._for) {
        const rx = new RegExp(scenario._for, 'i');
        if (rx.test(normalized)) {
          return {
            routing_coverage: 'ROUTED_TO_SPECIFIC_SCENE',
            routing_detail:   `_dispatch=contexte, matched _for: ${scenario._for}`,
            matched_regex:    scenario._for,
            fallback_used:    false,
            routing_evidence: { type: 'dispatch_contexte', regex: scenario._for, normalized_input: normalized },
          };
        }
      }
    }
    const hasFallback = allScenarios.some(s => !s._for);
    return {
      routing_coverage: 'PARTIAL_CONTEXTE',
      routing_detail:   `_dispatch=contexte, no _for match${hasFallback ? ', fallback applied' : ''}`,
      matched_regex:    null,
      fallback_used:    hasFallback,
      routing_evidence: { type: 'dispatch_contexte_fallback', normalized_input: normalized },
    };
  }

  // Step 5: flat entry (tools/details but no scenarios) — carrelage, vitrier, débarras
  const hasScenarios = Array.isArray(entry.scenarios) && entry.scenarios.length > 0;
  const hasTools     = Array.isArray(entry.tools) && entry.tools.length > 0;
  if (!hasScenarios && hasTools) {
    return {
      routing_coverage: 'TOOLS_ONLY',
      routing_detail:   'SITE_REALISM is flat (tools/details only, no scenarios)',
      matched_regex:    null,
      fallback_used:    false,
      routing_evidence: { type: 'flat_tools_only', metier_key: metierKey },
    };
  }

  // Step 6: scenarios array — check _for patterns
  if (hasScenarios) {
    const targeted  = [];
    const fallbacks = [];
    for (const scenario of entry.scenarios) {
      if (scenario._for) targeted.push(scenario);
      else fallbacks.push(scenario);
    }

    for (const scenario of targeted) {
      const rx = new RegExp(scenario._for, 'i');
      if (rx.test(normalized)) {
        return {
          routing_coverage: 'ROUTED_TO_SPECIFIC_SCENE',
          routing_detail:   `matched _for: ${scenario._for}`,
          matched_regex:    scenario._for,
          fallback_used:    false,
          routing_evidence: {
            type:            'regex_match',
            source:          `SITE_REALISM["${metierKey}"]`,
            regex:           scenario._for,
            flags:           'i',
            normalized_input: normalized,
          },
        };
      }
    }

    const hasFallback = fallbacks.length > 0;
    return {
      routing_coverage: 'PARTIAL_CONTEXTE',
      routing_detail:   `no _for match${hasFallback ? ', fallback scenario applied' : ', no fallback'}`,
      matched_regex:    null,
      fallback_used:    hasFallback,
      routing_evidence: {
        type:            'no_regex_match',
        source:          `SITE_REALISM["${metierKey}"]`,
        normalized_input: normalized,
        targeted_count:  targeted.length,
        fallback_count:  fallbacks.length,
      },
    };
  }

  return {
    routing_coverage: 'UNMATCHED',
    routing_detail:   'SITE_REALISM entry has neither scenarios nor tools',
    matched_regex:    null,
    fallback_used:    false,
    routing_evidence: { type: 'unmatched', metier_key: metierKey },
  };
}

// ─── Public audit function ────────────────────────────────────────────────────

export function generateServiceCoverageAudit() {
  const services = [];
  const summary  = {
    ROUTED_TO_SPECIFIC_SCENE: 0,
    PARTIAL_CONTEXTE:         0,
    TOOLS_ONLY:               0,
    GENERIC_FALLBACK:         0,
    UNMATCHED:                0,
    TOTAL:                    0,
  };

  for (const [metierKey, metierDef] of Object.entries(SERVICE_CATALOG)) {
    for (const serviceLabel of (metierDef.services || [])) {
      const result = classifyService(metierKey, serviceLabel);
      services.push({
        metier:           metierKey,
        service_label:    serviceLabel,
        ...result,
      });
      summary[result.routing_coverage] = (summary[result.routing_coverage] || 0) + 1;
      summary.TOTAL++;
    }
  }

  // Integrity checks
  const errors = [];
  if (summary.TOTAL !== 172) {
    errors.push(`[SERVICE_COVERAGE_TOTAL_MISMATCH] Expected 172, got ${summary.TOTAL}`);
  }
  const seen = new Set();
  for (const svc of services) {
    const k = `${svc.metier}:${svc.service_label}`;
    if (seen.has(k)) errors.push(`[DUPLICATE_SERVICE_KEY] ${k}`);
    seen.add(k);
  }

  return { summary, services, errors, generated_at: new Date().toISOString() };
}

// ─── SR-AUDIT-1: compare runtime vs persisted JSON ───────────────────────────

export async function runAuditParityTest() {
  console.group('[SR-AUDIT-1] Runtime ↔ JSON parity');
  const label = 'SR-AUDIT-1: runtime audit matches docs/service-coverage-audit.json';

  let persistedRaw;
  try {
    const resp = await fetch('/docs/service-coverage-audit.json', { cache: 'no-store' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    persistedRaw = await resp.json();
  } catch (e) {
    console.error(`  ✘ ${label} — could not fetch JSON: ${e.message}`);
    console.groupEnd();
    return { ok: false, label, error: e.message };
  }

  const runtime     = generateServiceCoverageAudit();
  const rtServices  = runtime.services;
  const pServices   = persistedRaw.services || [];

  const failures = [];

  if (rtServices.length !== pServices.length) {
    failures.push(`service count mismatch: runtime=${rtServices.length} persisted=${pServices.length}`);
  }

  for (let i = 0; i < Math.min(rtServices.length, pServices.length); i++) {
    const rt = rtServices[i];
    const p  = pServices[i];
    const id = `[${rt.metier}/${rt.service_label}]`;

    if (rt.metier !== p.metier)
      failures.push(`${id} metier: runtime=${rt.metier} persisted=${p.metier}`);
    if (rt.service_label !== p.service_label)
      failures.push(`${id} service_label mismatch`);
    if (rt.routing_coverage !== p.routing_coverage)
      failures.push(`${id} routing_coverage: runtime=${rt.routing_coverage} persisted=${p.routing_coverage}`);
    if (rt.matched_regex !== p.matched_regex)
      failures.push(`${id} matched_regex: runtime=${rt.matched_regex} persisted=${p.matched_regex}`);
    if (rt.fallback_used !== p.fallback_used)
      failures.push(`${id} fallback_used: runtime=${rt.fallback_used} persisted=${p.fallback_used}`);
  }

  const ok = failures.length === 0 && runtime.errors.length === 0;
  if (ok) {
    console.log(`  ✔ ${label}`);
    console.log(`    ${rtServices.length} services — 100% match`);
  } else {
    console.error(`  ✘ ${label}`);
    failures.forEach(f => console.error(`    · ${f}`));
    runtime.errors.forEach(e => console.error(`    · ${e}`));
  }

  console.groupEnd();
  return { ok, label, failures, integrity_errors: runtime.errors };
}
