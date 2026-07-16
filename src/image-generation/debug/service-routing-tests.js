/**
 * debug/service-routing-tests.js — Phase fix/service-routing-audit
 * Non-regression tests for service routing fixes.
 * Zero real network calls. Run via window._runServiceRoutingTests() when ?imageGenTests=1.
 */

import { _serviceGroup }    from '../resolution/service-resolver.js';
import { buildDallePromptV2 } from '../prompt/scene-builder.js';

// ─── Harness helpers ─────────────────────────────────────────────────────────

function _norm(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function _parsePrompt(row) {
  try { return JSON.parse(buildDallePromptV2(row)); }
  catch { return null; }
}

const _results = [];
let _pass = 0, _fail = 0;

function pass(label) {
  _results.push({ ok: true, label });
  _pass++;
  console.log(`  ✔ ${label}`);
}
function fail(label, detail) {
  _results.push({ ok: false, label, detail });
  _fail++;
  console.error(`  ✘ ${label}${detail ? ' — ' + detail : ''}`);
}
function assert(condition, label, detail) {
  condition ? pass(label) : fail(label, detail);
}

// ─── SR1–SR6: _serviceGroup fixes (dépannage auto) ──────────────────────────

function testServiceGroup() {
  console.group('[Routing] _serviceGroup');

  assert(
    _serviceGroup('Clés enfermées') === 'ouverture',
    'SR1: Clés enfermées → ouverture',
    `got: ${_serviceGroup('Clés enfermées')}`
  );
  assert(
    _serviceGroup('cles enfermees') === 'ouverture',
    'SR2: cles enfermees (normalized input) → ouverture',
    `got: ${_serviceGroup('cles enfermees')}`
  );
  assert(
    _serviceGroup('Déverrouillage voiture') === 'ouverture',
    'SR3: Déverrouillage voiture → ouverture',
    `got: ${_serviceGroup('Déverrouillage voiture')}`
  );
  assert(
    _serviceGroup('deverrouillage voiture') === 'ouverture',
    'SR4: deverrouillage voiture (normalized) → ouverture',
    `got: ${_serviceGroup('deverrouillage voiture')}`
  );
  assert(
    _serviceGroup('Enlèvement véhicule') === 'remorquage',
    'SR5: Enlèvement véhicule → remorquage',
    `got: ${_serviceGroup('Enlèvement véhicule')}`
  );
  assert(
    _serviceGroup('enlevement vehicule') === 'remorquage',
    'SR6: enlevement vehicule (normalized) → remorquage',
    `got: ${_serviceGroup('enlevement vehicule')}`
  );

  // Negative: existing groups must not regress
  assert(_serviceGroup('Batterie à plat')      === 'batterie',  'SR-N1: Batterie à plat → batterie');
  assert(_serviceGroup('Crevaison')             === 'crevaison', 'SR-N2: Crevaison → crevaison');
  assert(_serviceGroup('Remorquage')            === 'remorquage','SR-N3: Remorquage → remorquage');
  assert(_serviceGroup('Ouverture de véhicule') === 'ouverture', 'SR-N4: Ouverture de véhicule → ouverture');

  console.groupEnd();
}

// ─── SR7–SR10: élagage specific scene routing ────────────────────────────────

function assertSpecificScene(metier, travaux, label) {
  const result = _parsePrompt({ metier, travaux });
  if (!result) { fail(label, 'buildDallePromptV2 threw'); return; }
  const key = result._matched_key;
  const isSpecific = key && key !== '(fallback)';
  assert(isSpecific, label, `matched_key=${key}`);
}

function assertNotSameRoute(travaux1, travaux2, labelPrefix) {
  const r1 = _parsePrompt({ travaux: travaux1 });
  const r2 = _parsePrompt({ travaux: travaux2 });
  const key1 = r1?._matched_key;
  const key2 = r2?._matched_key;
  assert(
    key1 !== key2,
    `${labelPrefix}: "${travaux1}" and "${travaux2}" must not share a scene`,
    `both got: ${key1}`
  );
}

function testElagageRouting() {
  console.group('[Routing] Élagage arbre / peuplier');

  assertSpecificScene('élagage', 'Élagage arbre',    'SR7:  Élagage arbre → specific scene');
  assertSpecificScene('élagage', 'elagage arbre',    'SR8:  elagage arbre (normalized) → specific scene');
  assertSpecificScene('élagage', 'Élagage peuplier', 'SR9:  Élagage peuplier → specific scene');
  assertSpecificScene('élagage', 'elagage peuplier', 'SR10: elagage peuplier (normalized) → specific scene');

  // Negative: élagage arbre must NOT route to abattage or paysagiste
  {
    const r = _parsePrompt({ metier: 'élagage', travaux: 'Élagage arbre' });
    assert(r?._matched_key !== 'abattage',  'SR-N5: Élagage arbre must not route to abattage');
    assert(r?._matched_key !== 'paysagiste','SR-N6: Élagage arbre must not route to paysagiste');
  }
  {
    const r = _parsePrompt({ metier: 'élagage', travaux: 'Élagage peuplier' });
    assert(r?._matched_key !== 'abattage',  'SR-N7: Élagage peuplier must not route to abattage');
  }

  console.groupEnd();
}

// ─── SR11–SR14: Peinture façade routing ──────────────────────────────────────

function testPeintureRouting() {
  console.group('[Routing] Peinture façade');

  assertSpecificScene('peinture', 'Peinture façade',  'SR11: Peinture façade → specific scene');
  assertSpecificScene('peinture', 'peinture facade',  'SR12: peinture facade (normalized) → specific scene');
  assertSpecificScene('peinture', 'façade peinture',  'SR13: façade peinture (reversed) → specific scene');
  assertSpecificScene('peinture', 'facade peinture',  'SR14: facade peinture (reversed, normalized) → specific scene');

  // Negative: unrelated peinture services must not route to the same scene as Peinture façade
  {
    const rFacade    = _parsePrompt({ metier: 'peinture', travaux: 'Peinture façade'     });
    const rInterieur = _parsePrompt({ metier: 'peinture', travaux: 'Peinture intérieure' });
    const rNettoyage = _parsePrompt({ metier: 'nettoyage', travaux: 'Nettoyage façade'   });

    assert(
      rFacade?._matched_key !== '(fallback)',
      'SR-N8: Peinture façade must not fall to generic fallback'
    );
    // Peinture intérieure uses peinture WORK_SCENE too, but different SITE_REALISM scenario group
    // Just verify it finds the peinture scene (not another)
    assert(
      rInterieur?._matched_key === 'peinture',
      'SR-N9: Peinture intérieure still routes to peinture (no regression)',
      `got: ${rInterieur?._matched_key}`
    );
    // Nettoyage façade must route to nettoyage, not peinture
    assert(
      rNettoyage?._matched_key === 'nettoyage',
      'SR-N10: Nettoyage façade must route to nettoyage, not peinture',
      `got: ${rNettoyage?._matched_key}`
    );
  }

  console.groupEnd();
}

// ─── Public export ────────────────────────────────────────────────────────────

export async function runServiceRoutingTests() {
  console.group('[SERVICE ROUTING TESTS]');
  _results.length = 0;
  _pass = 0;
  _fail = 0;

  testServiceGroup();
  testElagageRouting();
  testPeintureRouting();

  const total = _pass + _fail;
  console.log(`\n[ROUTING SUMMARY] ${_pass}/${total} passed${_fail ? ` — ${_fail} FAILED` : ' ✔'}`);
  console.groupEnd();

  return {
    passed:  _pass,
    failed:  _fail,
    total,
    results: _results.slice(),
    ok:      _fail === 0,
  };
}
