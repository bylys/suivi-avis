/**
 * debug/carrelage-contracts-tests.js — feat/carrelage-visual-contracts
 * CV1 : vérification import ES module + exports attendus.
 * CV5-CV7 : validation des regex _for via le moteur JS natif (RegExp).
 * Chargé uniquement en mode ?imageGenTests=1.
 * Aucune modification WORK_SCENES / SITE_REALISM. Aucun appel API réel.
 */

import { SERVICE_CATALOG } from '../config/service-catalog.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _norm(s) {
  return (s || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}

const _results = [];
let _pass = 0, _fail = 0;

function pass(label) { _results.push({ ok: true, label }); _pass++; console.log(`  ✔ ${label}`); }
function fail(label, detail) { _results.push({ ok: false, label, detail }); _fail++; console.error(`  ✘ ${label}${detail ? ' — ' + detail : ''}`); }
function assert(cond, label, detail) { cond ? pass(label) : fail(label, detail); }

// ─── CV1 : import ES module ───────────────────────────────────────────────────

async function testModuleImport() {
  console.group('[CV1] Import ES module');

  let mod;
  try {
    mod = await import('/docs/carrelage-visual-contracts.js?v=1');
  } catch (e) {
    fail('CV1-IMPORT: module importable', e.message);
    console.groupEnd();
    return null;
  }
  pass('CV1-IMPORT: module importable sans SyntaxError');

  const contracts = mod.CARRELAGE_VISUAL_CONTRACTS;
  assert(contracts && typeof contracts === 'object' && !Array.isArray(contracts),
    'CV1-EXPORT: CARRELAGE_VISUAL_CONTRACTS est un objet (non tableau)',
    typeof contracts
  );

  const keys = contracts ? Object.keys(contracts) : [];
  assert(keys.length === 9,
    `CV1-COUNT: 9 contrats exportés (${keys.length}/9)`,
    `keys: ${keys.join(', ')}`
  );

  assert(typeof mod.CARRELAGE_FOR_PATTERNS === 'object',
    'CV1-PATTERNS: CARRELAGE_FOR_PATTERNS exporté'
  );
  assert(typeof mod.CARRELAGE_META === 'object',
    'CV1-META: CARRELAGE_META exporté'
  );

  console.groupEnd();
  return mod;
}

// ─── CV5-CV7 : regex validation ───────────────────────────────────────────────

function testRegexCoverage(contracts) {
  console.group('[CV5-CV7] Regex _for validation');

  const carrelageServices = SERVICE_CATALOG.carrelage?.services ?? [];
  const allServices = Object.entries(SERVICE_CATALOG).flatMap(
    ([metier, def]) => (def.services || []).map(svc => ({ metier, svc }))
  );
  const nonCarrelage = allServices.filter(({ metier }) => metier !== 'carrelage');
  const contractList = Object.values(contracts);

  // CV5 : each carrelage service must match exactly one contract regex
  console.group('[CV5] Chaque service carrelage → exactement un contrat');
  for (const svc of carrelageServices) {
    const norm = _norm(svc);
    const matches = contractList.filter(c => {
      if (!c.for_regex) return false;
      try { return new RegExp(c.for_regex, 'i').test(norm); } catch { return false; }
    });
    if (matches.length === 1) {
      pass(`CV5: "${svc}" → ${matches[0].service_key}`);
    } else if (matches.length === 0) {
      fail(`CV5: "${svc}" → aucun contrat (norm: "${norm}")`);
    } else {
      fail(`CV5: "${svc}" → ${matches.length} contrats`, matches.map(c => c.service_key).join(', '));
    }
  }
  console.groupEnd();

  // CV6 : no two contract regexes should match each other's service label
  console.group('[CV6] Aucune collision intra-carrelage');
  for (const ci of contractList) {
    for (const cj of contractList) {
      if (ci.service_key === cj.service_key || !cj.for_regex) continue;
      const norm = _norm(ci.service_label);
      try {
        if (new RegExp(cj.for_regex, 'i').test(norm)) {
          fail(
            `CV6: "${ci.service_label}" matche aussi ${cj.service_key}`,
            `regex: ${cj.for_regex}`
          );
        }
      } catch { /* invalid regex already caught in CV5 */ }
    }
  }
  if (_fail === 0 || !_results.some(r => !r.ok && r.label.startsWith('CV6'))) {
    pass('CV6: aucune collision intra-carrelage');
  }
  console.groupEnd();

  // CV7 : no non-carrelage service should match any carrelage regex
  console.group('[CV7] Aucun service non-carrelage capturé');
  let crossHits = 0;
  for (const { metier, svc } of nonCarrelage) {
    const norm = _norm(svc);
    for (const c of contractList) {
      if (!c.for_regex) continue;
      try {
        if (new RegExp(c.for_regex, 'i').test(norm)) {
          fail(`CV7: "${svc}" (${metier}) matche ${c.service_key}`, c.for_regex);
          crossHits++;
        }
      } catch { /* ignore */ }
    }
  }
  if (crossHits === 0) pass('CV7: 0 service non-carrelage capturé');
  console.groupEnd();

  console.groupEnd();
}

// ─── Public export ────────────────────────────────────────────────────────────

export async function runCarrelageContractsTests() {
  console.group('[CARRELAGE CONTRACTS TESTS]');
  _results.length = 0;
  _pass = 0;
  _fail = 0;

  const mod = await testModuleImport();
  if (mod && mod.CARRELAGE_VISUAL_CONTRACTS) {
    testRegexCoverage(mod.CARRELAGE_VISUAL_CONTRACTS);
  }

  const total = _pass + _fail;
  console.log(`\n[CARRELAGE CONTRACTS SUMMARY] ${_pass}/${total} passed${_fail ? ` — ${_fail} FAILED` : ' ✔'}`);
  console.groupEnd();

  return { passed: _pass, failed: _fail, total, results: _results.slice(), ok: _fail === 0 };
}
