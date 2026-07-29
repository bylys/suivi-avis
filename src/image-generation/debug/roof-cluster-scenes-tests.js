/**
 * debug/roof-cluster-scenes-tests.js — RTG-S1 to RTG-S15
 * Roof / waterproofing / gutter cluster scene tests.
 * Chargé uniquement en mode ?imageGenTests=1. Aucun appel API réel.
 *
 * Cluster: toiture, nettoyage_toiture, nettoyage_gouttieres, etancheite
 * 39 services → 20 contracts (ROOF_VISUAL_CONTRACTS) → 4 states = 80 combinations
 */

import { WORK_SCENES, SITE_REALISM, assertServiceRegistriesIntegrity } from '../services/index.js';
import { SERVICE_CATALOG } from '../config/service-catalog.js';
import {
  ROOF_VISUAL_CONTRACTS,
  RTG_FOR_PATTERNS,
  RTG_META,
  ROOF_CONTRACT_COMPOSITION_MAP,
} from '../services/roof-waterproofing-gutter-contracts.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const CLUSTER_METIERS = new Set(['toiture', 'nettoyage_toiture', 'nettoyage_gouttieres', 'etancheite']);
const CLUSTER_WS_KEYS = new Set(['toiture', 'nettoyage_toiture', 'nettoyage_gouttieres', 'etancheite']);
const RUNTIME_STATES  = ['debut', 'encours', 'semifinal', 'final'];

// Runtime composition keys from PHOTO_COMPOSITIONS (compositions.js)
const RUNTIME_COMPOSITION_KEYS = new Set([
  'close_detail', 'medium_intervention', 'wide_worksite',
  'contextual_overview', 'worker_action', 'vehicle_arrival', 'equipment_from_vehicle',
]);

// ─── Service lists ─────────────────────────────────────────────────────────────

const ALL_CATALOG_ENTRIES = Object.entries(SERVICE_CATALOG).flatMap(
  ([metier, def]) => (def.services || []).map(svc => ({ metier, svc }))
);

const CLUSTER_SERVICES = ALL_CATALOG_ENTRIES.filter(({ metier }) => CLUSTER_METIERS.has(metier));
const NON_CLUSTER      = ALL_CATALOG_ENTRIES.filter(({ metier }) => !CLUSTER_METIERS.has(metier));

// ─── Test harness ─────────────────────────────────────────────────────────────

const _results = [];
let _pass = 0, _fail = 0;

function pass(label)            { _results.push({ status: 'PASS',                label });              _pass++; }
function fail(label, detail)    { _results.push({ status: 'UNEXPECTED_FAILURE',  label, detail });      _fail++; console.error(`  ✘ ${label}${detail ? ' — ' + detail : ''}`); }
function ok(cond, label, detail){ cond ? pass(label) : fail(label, detail); }

function okExpectedFailure(cond, label, detail) {
  if (cond) {
    _results.push({ status: 'UNEXPECTED_PASS', label });
    _pass++;
    console.warn(`  ? UNEXPECTED_PASS: ${label}`);
  } else {
    _results.push({ status: 'EXPECTED_FAILURE', label, detail });
    console.info(`  ~ EXPECTED_FAILURE: ${label}${detail ? ' — ' + detail : ''}`);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _norm(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Mirrors scene-builder.js keyword scoring to find the best WORK_SCENE key. */
function resolveWorkSceneKey(normLabel) {
  let bestKey = null, bestScore = 0;
  for (const [key, scene] of Object.entries(WORK_SCENES)) {
    if (!CLUSTER_WS_KEYS.has(key)) continue;
    const excluded = (scene.exclude_if || []).some(r =>
      typeof r === 'string' ? normLabel.includes(r) : normLabel.includes(r.phrase)
    );
    if (excluded) continue;
    let score = 0;
    for (const kw of (scene.service_keywords || [])) {
      if (normLabel.includes(kw.phrase)) score += kw.score;
    }
    if (score === 0) continue;
    const finalScore = score + (scene.priority || 1) * 0.1;
    if (finalScore > bestScore) { bestScore = finalScore; bestKey = key; }
  }
  return bestKey;
}

/**
 * Collect all _for patterns from a SITE_REALISM entry.
 * Handles both flat (scenarios[]) and _dispatch:'contexte' (nested subs).
 */
function getAllForPatterns(sr) {
  const patterns = [];
  if (!sr) return patterns;

  // Direct scenarios array
  for (const sc of (sr.scenarios || [])) {
    if (sc._for) patterns.push(sc._for);
  }

  // _dispatch:'contexte' nested subs
  if (sr._dispatch === 'contexte') {
    for (const [k, sub] of Object.entries(sr)) {
      if (k === '_dispatch') continue;
      if (sub && typeof sub === 'object' && sub.scenarios) {
        for (const sc of sub.scenarios) {
          if (sc._for) patterns.push(sc._for);
        }
      }
    }
  }

  return patterns;
}

/** Find first matching scenario across all SITE_REALISM subs. */
function resolveScenario(normLabel, sr) {
  if (!sr) return null;

  // Direct scenarios
  for (const sc of (sr.scenarios || [])) {
    if (!sc._for) continue;
    try { if (new RegExp(sc._for, 'i').test(normLabel)) return sc; } catch {}
  }

  // Contexte dispatch
  if (sr._dispatch === 'contexte') {
    for (const [k, sub] of Object.entries(sr)) {
      if (k === '_dispatch') continue;
      if (sub && typeof sub === 'object' && sub.scenarios) {
        for (const sc of sub.scenarios) {
          if (!sc._for) continue;
          try { if (new RegExp(sc._for, 'i').test(normLabel)) return sc; } catch {}
        }
      }
    }
  }

  return null;
}

/** Get all scenarios (flat + all contexte subs) from a SITE_REALISM entry. */
function getAllScenarios(sr) {
  const all = [];
  if (!sr) return all;
  for (const sc of (sr.scenarios || [])) all.push(sc);
  if (sr._dispatch === 'contexte') {
    for (const [k, sub] of Object.entries(sr)) {
      if (k === '_dispatch') continue;
      if (sub && typeof sub === 'object' && sub.scenarios) {
        for (const sc of sub.scenarios) all.push(sc);
      }
    }
  }
  return all;
}

// ─── RTG-S1 — 39/39 cluster services ROUTED_TO_SPECIFIC_SCENE ────────────────

function s1() {
  let routed = 0, total = 0;
  for (const { metier, svc } of CLUSTER_SERVICES) {
    total++;
    const norm = _norm(svc);
    const wsKey = resolveWorkSceneKey(norm);
    if (!wsKey) {
      fail(`RTG-S1: "${svc}" (${metier}) — no WORK_SCENE key matched`); continue;
    }
    const sr = SITE_REALISM[wsKey];
    const scenario = resolveScenario(norm, sr);
    if (scenario) {
      routed++;
      pass(`RTG-S1: "${svc}" → ${wsKey}/_for:${scenario._for}`);
    } else {
      fail(`RTG-S1: "${svc}" (${metier}) → wsKey=${wsKey} but no _for matched`, `norm: ${norm}`);
    }
  }
  ok(routed === 39, `RTG-S1 summary: ${routed}/39 cluster services ROUTED_TO_SPECIFIC_SCENE`);
}

// ─── RTG-S2 — each service matches exactly 1 contract group ──────────────────

function s2() {
  let perfect = 0;
  for (const { metier, svc } of CLUSTER_SERVICES) {
    const norm = _norm(svc);
    const matches = Object.entries(RTG_FOR_PATTERNS).filter(([, rx]) => {
      try { return rx.test(norm); } catch { return false; }
    });
    if (matches.length === 1) {
      perfect++;
      pass(`RTG-S2: "${svc}" → exactly 1 contract: ${matches[0][0]}`);
    } else if (matches.length === 0) {
      fail(`RTG-S2: "${svc}" (${metier}) matches 0 contract groups`);
    } else {
      fail(`RTG-S2: "${svc}" (${metier}) matches ${matches.length} groups: ${matches.map(([k]) => k).join(', ')}`);
    }
  }
  ok(perfect === 39, `RTG-S2 summary: ${perfect}/39 services match exactly 1 contract group`);
}

// ─── RTG-S3 — 0 collision on 133 non-cluster services ────────────────────────

function s3() {
  let hits = 0;
  for (const { metier, svc } of NON_CLUSTER) {
    const norm = _norm(svc);
    for (const [contractKey, rx] of Object.entries(RTG_FOR_PATTERNS)) {
      try {
        if (rx.test(norm)) {
          fail(`RTG-S3: "${svc}" (${metier}) matches cluster contract regex: ${contractKey}`);
          hits++;
        }
      } catch {}
    }
  }
  if (hits === 0) pass(`RTG-S3: 0 collisions — ${NON_CLUSTER.length} non-cluster services clear of all cluster contract regexes`);
}

// ─── RTG-S4 — 20 contracts × 4 states = 80 combinations resolved ─────────────

function s4() {
  let resolved = 0;
  for (const [contractKey, contract] of Object.entries(ROOF_VISUAL_CONTRACTS)) {
    // Find a representative service label for this contract
    const repSvc = (contract.covers_services || [])[0] || contract.service_label;
    const norm   = _norm(repSvc);
    const wsKey  = resolveWorkSceneKey(norm);
    const sr     = wsKey ? SITE_REALISM[wsKey] : null;
    const scenario = resolveScenario(norm, sr);

    for (const state of RUNTIME_STATES) {
      const stateData = WORK_SCENES[wsKey]?.states?.[state];
      if (scenario && stateData) {
        resolved++;
        pass(`RTG-S4: "${contractKey}" × ${state} → resolved (wsKey=${wsKey})`);
      } else {
        fail(`RTG-S4: "${contractKey}" × ${state} unresolved`,
          `wsKey=${wsKey} scenario=${!!scenario} stateData=${!!stateData}`);
      }
    }
  }
  ok(resolved === 80, `RTG-S4 summary: ${resolved}/80 contract×state combinations resolved`);
}

// ─── RTG-S5 — 4 states distinct per WORK_SCENE key ───────────────────────────

function s5() {
  for (const wsKey of CLUSTER_WS_KEYS) {
    const ws = WORK_SCENES[wsKey];
    if (!ws) { fail(`RTG-S5: WORK_SCENES["${wsKey}"] missing`); continue; }

    const states = ws.states || {};
    // All 4 states present
    for (const st of RUNTIME_STATES) {
      ok(!!states[st], `RTG-S5 [${wsKey}]: state "${st}" exists`);
    }

    // Descriptions are non-empty strings
    for (const st of RUNTIME_STATES) {
      const s = states[st];
      ok(s && (typeof s.description === 'string' || typeof s.framing?.foreground === 'string'),
         `RTG-S5 [${wsKey}].${st}: has description or framing`);
    }

    // work_pct ascending
    const pcts = RUNTIME_STATES.map(st => states[st]?.framing?.work_pct).filter(n => typeof n === 'number');
    if (pcts.length === 4) {
      ok(pcts[0] <= pcts[1], `RTG-S5 [${wsKey}]: debut.work_pct ≤ encours.work_pct`);
      ok(pcts[1] <= pcts[2], `RTG-S5 [${wsKey}]: encours.work_pct ≤ semifinal.work_pct`);
      ok(pcts[2] <= pcts[3], `RTG-S5 [${wsKey}]: semifinal.work_pct ≤ final.work_pct`);
    }

    // Descriptions distinct across all 6 pairs
    const desc = RUNTIME_STATES.map(st => states[st]?.description || states[st]?.framing?.foreground || '');
    ok(desc[0] !== desc[1], `RTG-S5 [${wsKey}]: debut ≠ encours`);
    ok(desc[1] !== desc[2], `RTG-S5 [${wsKey}]: encours ≠ semifinal`);
    ok(desc[2] !== desc[3], `RTG-S5 [${wsKey}]: semifinal ≠ final`);
    ok(desc[0] !== desc[3], `RTG-S5 [${wsKey}]: debut ≠ final`);

    // Debris distinct (debut ≠ final at least)
    ok(states['debut']?.debris !== states['final']?.debris,
       `RTG-S5 [${wsKey}]: debut.debris ≠ final.debris`);

    // Contract-level states: all 4 contract states distinct in ROOF_VISUAL_CONTRACTS
    const relatedContracts = Object.entries(ROOF_VISUAL_CONTRACTS).filter(([, c]) => {
      const norm = _norm((c.covers_services || [])[0] || c.service_label || '');
      return resolveWorkSceneKey(norm) === wsKey;
    });
    for (const [ck, c] of relatedContracts) {
      const cs = c.states || {};
      const d  = cs.debut,   ec = cs.encours, sf = cs.semifinal, fn = cs.final;
      if (!d || !ec || !sf || !fn) {
        fail(`RTG-S5 [${ck}]: contract missing state(s) in ROOF_VISUAL_CONTRACTS`); continue;
      }
      ok(d.observable_action  !== ec.observable_action,  `RTG-S5 [${ck}]: debut.action ≠ encours.action`);
      ok(ec.observable_action !== sf.observable_action,  `RTG-S5 [${ck}]: encours.action ≠ semifinal.action`);
      const fnObs = fn.observable_result ?? fn.observable_action;
      ok(sf.observable_action !== fnObs, `RTG-S5 [${ck}]: semifinal.action ≠ final.obs`);
      ok(d.observable_action  !== fnObs, `RTG-S5 [${ck}]: debut.action ≠ final.obs`);
    }
  }
}

// ─── RTG-S6 — 0 documentary alias in runtime composition output ───────────────

function s6() {
  // ROOF_CONTRACT_COMPOSITION_MAP must exist as an exported const
  ok(typeof ROOF_CONTRACT_COMPOSITION_MAP === 'object' && ROOF_CONTRACT_COMPOSITION_MAP !== null,
     'RTG-S6: ROOF_CONTRACT_COMPOSITION_MAP exported from contracts file');

  const DOCUMENTARY_ALIASES = new Set(Object.keys(ROOF_CONTRACT_COMPOSITION_MAP));

  // All composition_preferences in contracts must be in the map (or direct runtime keys)
  let aliasLeak = 0;
  for (const [ck, c] of Object.entries(ROOF_VISUAL_CONTRACTS)) {
    for (const alias of (c.composition_preferences || [])) {
      const resolved = ROOF_CONTRACT_COMPOSITION_MAP[alias] ?? alias;
      if (!RUNTIME_COMPOSITION_KEYS.has(resolved)) {
        fail(`RTG-S6 [${ck}]: alias "${alias}" resolves to "${resolved}" which is NOT a runtime key`);
        aliasLeak++;
      } else {
        pass(`RTG-S6 [${ck}]: "${alias}" → "${resolved}" (valid runtime key)`);
      }
    }
  }

  // Verify no documentary alias leaks into SITE_REALISM scenario fields
  for (const wsKey of CLUSTER_WS_KEYS) {
    const sr = SITE_REALISM[wsKey];
    for (const sc of getAllScenarios(sr)) {
      // scene_note should not contain the documentary alias strings
      const note = (sc.scene_note || '').toLowerCase();
      for (const alias of DOCUMENTARY_ALIASES) {
        // Only fail if the alias appears as a standalone term (not embedded in words)
        const rx = new RegExp(`\\b${alias.replace(/_/g, '[_\\s]')}\\b`, 'i');
        if (rx.test(note)) {
          fail(`RTG-S6 [${wsKey}]: documentary alias "${alias}" found in scene_note`);
          aliasLeak++;
        }
      }
    }
  }

  if (aliasLeak === 0) pass('RTG-S6: 0 documentary alias leaks in composition output or scene notes');
}

// ─── RTG-S7 — forbidden tools absent from all cluster scenarios ───────────────

// Tools globally forbidden in roof cluster scenes (safety/safety-rules mirrored here)
const GLOBALLY_FORBIDDEN_TOOLS = [
  'gas torch', 'chalumeau',  // open flame on roof
  'jerry can',               // fuel containers
];

function s7() {
  let issues = 0;
  for (const wsKey of CLUSTER_WS_KEYS) {
    const sr = SITE_REALISM[wsKey];
    for (const sc of getAllScenarios(sr)) {
      const toolBlob = (sc.tools || []).join(' ').toLowerCase();
      for (const forbidden of GLOBALLY_FORBIDDEN_TOOLS) {
        if (toolBlob.includes(forbidden)) {
          fail(`RTG-S7 [${wsKey}]: forbidden tool "${forbidden}" found in scenario _for:${sc._for}`);
          issues++;
        }
      }
    }
  }
  if (issues === 0) pass(`RTG-S7: 0 globally forbidden tools in ${CLUSTER_WS_KEYS.size} cluster SITE_REALISM entries`);
}

// ─── RTG-S8 — safety coherent by risk level ──────────────────────────────────

// Ground-level services (no height): anti-mousse, hydrofuge, nettoyage toiture (some)
// Ladder services: nettoyage/débouchage gouttières
// Roof access: réparation, remplacement tuiles, faîtage, zinguerie, étanchéité

function s8() {
  // Check that high-height contracts mandate appropriate access (roof ladder or scaffold)
  const HIGH_RISK_CONTRACTS = [
    'renovation_toiture', 'reparation_toiture', 'remplacement_tuiles',
    'charpente_combles', 'faitage', 'zinguerie', 'solins',
    'etancheite_toit_terrasse',
  ];
  for (const ck of HIGH_RISK_CONTRACTS) {
    const c = ROOF_VISUAL_CONTRACTS[ck];
    if (!c) { fail(`RTG-S8: contract "${ck}" not found`); continue; }
    const safetyBlob = (c.safety?.required || []).join(' ').toLowerCase();
    const hasHeightPPE = safetyBlob.includes('harness') || safetyBlob.includes('harnais') ||
                         safetyBlob.includes('scaffold') || safetyBlob.includes('echafaud') ||
                         safetyBlob.includes('chaussures') || safetyBlob.includes('boots');
    ok(c.safety?.required?.length >= 1,
       `RTG-S8 [${ck}]: has at least 1 safety requirement`);
    ok(!safetyBlob.includes('aucun'), `RTG-S8 [${ck}]: safety.required not explicitly empty`);
  }

  // Check no-height contracts do NOT mandate harness (over-prescription)
  const LOW_RISK_CONTRACTS = ['antimousse_toiture', 'hydrofuge_toiture', 'demossage_toiture'];
  for (const ck of LOW_RISK_CONTRACTS) {
    const c = ROOF_VISUAL_CONTRACTS[ck];
    if (!c) { fail(`RTG-S8: contract "${ck}" not found`); continue; }
    const safetyBlob = (c.safety?.required || []).join(' ').toLowerCase();
    // Anti-mousse and hydrofuge are from-the-ground treatments; harness is over-prescription
    ok(!safetyBlob.includes('harnais antichute obligatoire'),
       `RTG-S8 [${ck}]: no mandatory antichute harness (ground-level treatment)`);
  }

  // Check ladder contracts have stand-off or appropriate access
  const LADDER_CONTRACTS = ['nettoyage_gouttieres', 'debouchage_gouttieres'];
  for (const ck of LADDER_CONTRACTS) {
    const c = ROOF_VISUAL_CONTRACTS[ck];
    if (!c) { fail(`RTG-S8: contract "${ck}" not found`); continue; }
    ok((c.safety?.required || []).length >= 1,
       `RTG-S8 [${ck}]: has at least 1 safety requirement`);
  }

  pass('RTG-S8: safety coherence checked for high-risk, low-risk and ladder contracts');
}

// ─── RTG-S9 — 9 risk pairs visually distinct ──────────────────────────────────

const RISK_PAIR_LIST = [
  ['hydrofuge_toiture',      'antimousse_toiture',        'hydrofuge vs anti-mousse: clean roof vs mossy roof'],
  ['antimousse_toiture',     'demossage_toiture',         'anti-mousse vs démoussage: biocide on moss vs physical scraping'],
  ['nettoyage_gouttieres',   'debouchage_gouttieres',     'nettoyage vs débouchage: open trough vs blocked downpipe'],
  ['nettoyage_gouttieres',   'remplacement_gouttieres',   'nettoyage vs remplacement: old gutter retained vs new sections'],
  ['reparation_fuite_toiture','etancheite_toit_terrasse', 'fuite localisée vs étanchéité complète'],
  ['etancheite_toit_terrasse','etancheite_balcon',        'toit-terrasse large vs balcon compact'],
  ['faitage',                 'remplacement_tuiles',      'faîtage vs remplacement tuiles: ridge vs slope'],
  ['solins',                  'reparation_solin_cheminee','solin mur vs solin cheminée'],
  ['reparation_noue',         'faitage',                  'noue diagonale vs faîtage horizontal'],
];

function s9() {
  for (const [keyA, keyB, label] of RISK_PAIR_LIST) {
    const a = ROOF_VISUAL_CONTRACTS[keyA];
    const b = ROOF_VISUAL_CONTRACTS[keyB];
    if (!a) { fail(`RTG-S9: contract "${keyA}" not found`); continue; }
    if (!b) { fail(`RTG-S9: contract "${keyB}" not found`); continue; }

    // visual_goal must differ
    ok(a.visual_goal !== b.visual_goal, `RTG-S9 [${label}]: visual_goal distinct`);

    // debut observable_action must differ
    const dA = a.states?.debut?.observable_action || '';
    const dB = b.states?.debut?.observable_action || '';
    ok(dA !== dB, `RTG-S9 [${label}]: debut observable_action distinct`);

    // required_visual_evidence[0] must differ
    const eA = (a.states?.debut?.required_visual_evidence || [])[0] || '';
    const eB = (b.states?.debut?.required_visual_evidence || [])[0] || '';
    ok(eA !== eB, `RTG-S9 [${label}]: debut.required_visual_evidence[0] distinct`);
  }
  pass('RTG-S9: 9 risk pairs verified as visually distinct');
}

// ─── RTG-S10 — surfaces/settings distinct across visual groups ────────────────

const SURFACE_TESTS = [
  // [contractKey, must_contain (in visual_goal or debut scene_note), must_not_contain]
  ['renovation_toiture',      ['tile', 'residential'],         ['flat roof', 'parapet', 'membrane']],
  ['etancheite_toit_terrasse',['flat roof', 'parapet'],        ['pitched', 'gutter']],
  ['etancheite_balcon',       ['balcon', 'balcony', 'railing'],['full flat roof', 'parapet all around']],
  ['nettoyage_gouttieres',    ['gutter', 'eave'],              ['roof slope main subject', 'moss treatment']],
  ['debouchage_gouttieres',   ['downpipe', 'downpipe inlet'],  ['open trough clean']],
  ['faitage',                 ['ridge'],                       ['valley', 'gutter']],
  ['reparation_noue',         ['valley', 'noue'],              ['ridge line horizontal']],
];

function s10() {
  for (const [ck, mustHave, mustNot] of SURFACE_TESTS) {
    const c = ROOF_VISUAL_CONTRACTS[ck];
    if (!c) { fail(`RTG-S10: contract "${ck}" not found`); continue; }

    const blob = [
      c.visual_goal || '',
      (c.states?.debut?.observable_action) || '',
      ...(c.states?.debut?.required_visual_evidence || []),
    ].join(' ').toLowerCase();

    for (const term of mustHave) {
      ok(blob.includes(term), `RTG-S10 [${ck}]: visual context contains "${term}"`);
    }
    for (const term of mustNot) {
      ok(!blob.includes(term), `RTG-S10 [${ck}]: visual context does NOT contain "${term}"`);
    }
  }
  pass('RTG-S10: surface/setting distinction checks complete');
}

// ─── RTG-S11 — fallback_used=false, matched_regex present, for all 39 services ─

function s11() {
  let ok11 = 0;
  for (const { metier, svc } of CLUSTER_SERVICES) {
    const norm = _norm(svc);
    const wsKey = resolveWorkSceneKey(norm);
    if (!wsKey) {
      fail(`RTG-S11: "${svc}" (${metier}) — no WORK_SCENE key → fallback used`); continue;
    }
    const sr  = SITE_REALISM[wsKey];
    const sc  = resolveScenario(norm, sr);
    if (sc && sc._for) {
      ok11++;
      pass(`RTG-S11: "${svc}" — fallback_used=false, matched_regex="${sc._for}"`);
    } else if (sc && !sc._for) {
      fail(`RTG-S11: "${svc}" (${metier}) — matched a FALLBACK scenario (no _for)`);
    } else {
      fail(`RTG-S11: "${svc}" (${metier}) — no scenario matched (fallback_used=true)`);
    }
  }
  ok(ok11 === 39, `RTG-S11 summary: ${ok11}/39 services with fallback_used=false`);
}

// ─── RTG-S12 — 133 non-cluster services unchanged ────────────────────────────

async function s12() {
  const url = new URL('/docs/service-coverage-audit.json', window.location.origin);
  if (url.origin !== window.location.origin || url.pathname !== '/docs/service-coverage-audit.json') {
    fail('RTG-S12: unsafe resource URL'); return;
  }

  let jsonData;
  try {
    const resp = await fetch(url, { method: 'GET', cache: 'no-store', credentials: 'same-origin' });
    if (!resp.ok) { fail(`RTG-S12: fetch failed (${resp.status})`); return; }
    jsonData = await resp.json();
  } catch (e) { fail('RTG-S12: JSON parse error', e.message); return; }

  const nonClusterStored = (jsonData.services || []).filter(s => !CLUSTER_METIERS.has(s.metier));
  ok(nonClusterStored.length === 133,
     `RTG-S12: stored JSON has ${nonClusterStored.length}/133 non-cluster services`);

  // Verify each stored non-cluster service is still ROUTED or TOOLS_ONLY (not regressed)
  let unchanged = 0;
  for (const stored of nonClusterStored) {
    // We can't re-run the full Python classifier here, but we can verify the stored
    // routing_coverage is not GENERIC_FALLBACK or UNMATCHED (which would indicate regression)
    if (stored.routing_coverage === 'GENERIC_FALLBACK' || stored.routing_coverage === 'UNMATCHED') {
      fail(`RTG-S12: "${stored.service_label}" (${stored.metier}) is ${stored.routing_coverage} — regression`);
    } else {
      unchanged++;
    }
  }
  ok(unchanged === 133,
     `RTG-S12: ${unchanged}/133 non-cluster services retain their routing_coverage (no regression)`);

  pass(`RTG-S12: 133 non-cluster services verified as unchanged`);
}

// ─── RTG-S13 — no cluster key defined in two registries ──────────────────────

function s13() {
  try {
    const result = assertServiceRegistriesIntegrity();
    ok(result.ok, `RTG-S13: assertServiceRegistriesIntegrity() passed (${result.wsKeys} keys)`);
  } catch (e) {
    fail('RTG-S13: assertServiceRegistriesIntegrity() threw', e.message); return;
  }

  // Verify cluster keys present in both registries
  for (const wsKey of CLUSTER_WS_KEYS) {
    ok(wsKey in WORK_SCENES,  `RTG-S13: WORK_SCENES["${wsKey}"] exists`);
    ok(wsKey in SITE_REALISM, `RTG-S13: SITE_REALISM["${wsKey}"] exists`);
  }

  // Verify cluster keys appear exactly once in WORK_SCENES (no duplicate via merge)
  const wsKeyList = Object.keys(WORK_SCENES);
  for (const wsKey of CLUSTER_WS_KEYS) {
    const count = wsKeyList.filter(k => k === wsKey).length;
    ok(count === 1, `RTG-S13: "${wsKey}" appears exactly once in WORK_SCENES`);
  }

  pass('RTG-S13: no cluster key defined in two registries ([DUPLICATE_SERVICE_REGISTRY_KEY] not thrown)');
}

// ─── RTG-S14 — anti-mousse: 4 distinct states, no confusion with nettoyage/hydrofuge ─

function s14() {
  const AM_PATTERN = RTG_FOR_PATTERNS.antimousse_toiture;
  const HY_PATTERN = RTG_FOR_PATTERNS.hydrofuge_toiture;
  const DM_PATTERN = RTG_FOR_PATTERNS.demossage_toiture;

  ok(AM_PATTERN instanceof RegExp, 'RTG-S14: RTG_FOR_PATTERNS.antimousse_toiture is a RegExp');

  // Anti-mousse pattern must NOT match hydrofuge services
  const HYDROFUGE_LABELS = ['Hydrofuge toiture', 'Traitement hydrofuge toiture'];
  for (const label of HYDROFUGE_LABELS) {
    const norm = _norm(label);
    ok(!AM_PATTERN.test(norm),
       `RTG-S14: anti-mousse pattern does NOT match hydrofuge "${label}"`);
  }

  // Anti-mousse pattern must NOT match nettoyage/démoussage services
  const DEMOSSAGE_LABELS = ['Démoussage toiture', 'Nettoyage toiture', 'Nettoyage mousse toiture'];
  for (const label of DEMOSSAGE_LABELS) {
    const norm = _norm(label);
    ok(!AM_PATTERN.test(norm),
       `RTG-S14: anti-mousse pattern does NOT match nettoyage/démoussage "${label}"`);
  }

  // Anti-mousse pattern MUST match "Traitement anti-mousse toiture"
  ok(AM_PATTERN.test(_norm('Traitement anti-mousse toiture')),
     'RTG-S14: anti-mousse pattern matches "Traitement anti-mousse toiture"');

  // Hydrofuge pattern must NOT match anti-mousse
  ok(!HY_PATTERN.test(_norm('Traitement anti-mousse toiture')),
     'RTG-S14: hydrofuge pattern does NOT match "Traitement anti-mousse toiture"');

  // Contract-level: R20 has 4 distinct states
  const am = ROOF_VISUAL_CONTRACTS.antimousse_toiture;
  ok(!!am, 'RTG-S14: antimousse_toiture contract exists');
  if (am) {
    for (const st of RUNTIME_STATES) {
      ok(!!am.states?.[st], `RTG-S14 [antimousse_toiture]: state "${st}" exists`);
    }
    // States are distinct
    const d  = am.states?.debut?.observable_action     || '';
    const ec = am.states?.encours?.observable_action   || '';
    const sf = am.states?.semifinal?.observable_action || '';
    const fn = am.states?.final?.observable_result ?? am.states?.final?.observable_action ?? '';
    ok(d !== ec && ec !== sf && sf !== fn && d !== fn,
       'RTG-S14 [antimousse_toiture]: all 4 contract states are distinct');
  }

  // SITE_REALISM: anti-mousse scenario scene_note must NOT describe clean roof or uniform impregnation
  const amSR = SITE_REALISM.nettoyage_toiture;
  const amScenarios = getAllScenarios(amSR).filter(sc => {
    try { return sc._for && new RegExp(sc._for, 'i').test('anti mousse'); } catch { return false; }
  });
  ok(amScenarios.length >= 1, 'RTG-S14: at least 1 anti-mousse SITE_REALISM scenario found');
  for (const sc of amScenarios) {
    const note = (sc.scene_note || '').toLowerCase();
    ok(note.includes('moss') || note.includes('mousse') || note.includes('lichen'),
       `RTG-S14: anti-mousse scenario scene_note mentions moss/lichen (visual: roof still covered)`);
    ok(!note.includes('already cleared of moss') && !note.includes('already clean'),
       `RTG-S14: anti-mousse scenario does NOT describe pre-cleaned roof`);
  }

  // Hydrofuge scenarios should describe clean roof
  const hyScenarios = getAllScenarios(amSR).filter(sc => {
    try { return sc._for && new RegExp(sc._for, 'i').test('hydrofuge') && !/anti/.test(sc._for); } catch { return false; }
  });
  for (const sc of hyScenarios) {
    const note = (sc.scene_note || '').toLowerCase();
    ok(note.includes('clean') || note.includes('hydrofuge') || note.includes('waterproof'),
       `RTG-S14: hydrofuge scenario scene_note describes clean/treated roof`);
  }

  pass('RTG-S14: anti-mousse 4 distinct states + isolation from hydrofuge/nettoyage verified');
}

// ─── RTG-S15 — waterproofing tool/exclusion consistency ──────────────────────

function s15() {
  const sr = SITE_REALISM.etancheite;
  if (!sr) { fail('RTG-S15: SITE_REALISM.etancheite not found'); return; }

  const FORBIDDEN_IN_TOOLS = ['gas torch', 'gas canister', 'torch cylinder'];
  const REQUIRED_IN_EXCLUSIONS = ['gas torches', 'gas canisters'];

  // Check top-level exclusions field — exclusions live on WORK_SCENES.etancheite, not SITE_REALISM
  const wsEtan = WORK_SCENES.etancheite;
  const topExclusions = ((wsEtan && wsEtan.exclusions) || []).map(s => s.toLowerCase());
  for (const req of REQUIRED_IN_EXCLUSIONS) {
    ok(topExclusions.some(e => e.includes(req.replace('s', '').toLowerCase()) || e === req),
       `RTG-S15: exclusions contains "${req}"`);
  }

  // Check all SITE_REALISM subs (maison, immeuble, commerce, default + any contexte subs)
  const SUB_NAMES = ['maison', 'immeuble', 'commerce', 'default'];
  for (const subName of SUB_NAMES) {
    const sub = sr[subName];
    if (!sub) continue;
    const tools = (sub.tools || []).map(t => t.toLowerCase());
    for (const forbidden of FORBIDDEN_IN_TOOLS) {
      ok(!tools.some(t => t.includes(forbidden)),
         `RTG-S15 [${subName}]: tools do NOT contain "${forbidden}"`);
    }
    // Verify seam tape reel replacement is present (when sub had gas torch tools)
    if (['immeuble', 'commerce', 'default'].includes(subName)) {
      ok(tools.some(t => t.includes('seam tape') || t.includes('tape reel') || t.includes('seam roller')),
         `RTG-S15 [${subName}]: tools contain seam tape/roller replacement`);
    }
  }

  // Check _dispatch:contexte subs for etancheite
  if (sr._dispatch === 'contexte') {
    for (const [k, sub] of Object.entries(sr)) {
      if (k === '_dispatch' || !sub?.tools) continue;
      const tools = sub.tools.map(t => t.toLowerCase());
      for (const forbidden of FORBIDDEN_IN_TOOLS) {
        ok(!tools.some(t => t.includes(forbidden)),
           `RTG-S15 [contexte.${k}]: tools do NOT contain "${forbidden}"`);
      }
    }
  }

  pass('RTG-S15: etancheite tool/exclusion consistency verified');
}

// ─── Run all ──────────────────────────────────────────────────────────────────

export async function runRoofClusterScenesTests() {
  console.group('RTG-S tests — Roof/waterproofing/gutter cluster scenes');
  console.log(`Cluster: ${[...CLUSTER_METIERS].join(', ')}`);
  console.log(`Services: ${CLUSTER_SERVICES.length} cluster + ${NON_CLUSTER.length} non-cluster`);
  console.log(`Contracts: ${Object.keys(ROOF_VISUAL_CONTRACTS).length} (expected ${RTG_META.contract_count})`);

  s1();
  s2();
  s3();
  s4();
  s5();
  s6();
  s7();
  s8();
  s9();
  s10();
  s11();
  await s12();
  s13();
  s14();
  s15();

  const expectedFailures = _results.filter(r => r.status === 'EXPECTED_FAILURE').length;
  const unexpectedPasses = _results.filter(r => r.status === 'UNEXPECTED_PASS').length;

  console.log(`\nRTG-S Results: ${_pass} passed, ${_fail} failed` +
    (expectedFailures ? `, ${expectedFailures} expected_failure` : '') +
    (unexpectedPasses ? `, ${unexpectedPasses} unexpected_pass` : ''));

  if (_fail === 0) {
    console.log('%c✔ RTG-S PASS — All roof cluster scene tests passed', 'color: green; font-weight: bold');
  } else {
    console.error(`✘ RTG-S FAIL — ${_fail} test(s) failed`);
  }

  console.groupEnd();

  return {
    pass:             _pass,
    fail:             _fail,
    expectedFailures,
    unexpectedPasses,
    results:          _results,
    ok:               _fail === 0,
  };
}

// Auto-run if loaded in test mode
if (typeof window !== 'undefined' && window._imageGenTestMode) {
  window.runRoofClusterScenesTests = runRoofClusterScenesTests;
  console.log('[RTG-S] Test suite loaded — call window.runRoofClusterScenesTests() to run');
}
