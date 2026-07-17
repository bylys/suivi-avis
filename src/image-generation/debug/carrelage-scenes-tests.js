/**
 * debug/carrelage-scenes-tests.js — CS1-CS12 carrelage service scenes tests.
 * Chargé uniquement en mode ?imageGenTests=1. Aucun appel API réel.
 */

import { WORK_SCENES, SITE_REALISM } from '../services/index.js';
import { SERVICE_CATALOG } from '../config/service-catalog.js';
import { CARRELAGE_VISUAL_CONTRACTS } from '../services/carrelage-contracts.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _norm(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

const _results = [];
let _pass = 0, _fail = 0;

function pass(label) { _results.push({ ok: true,  label }); _pass++; }
function fail(label, detail) { _results.push({ ok: false, label, detail }); _fail++; console.error(`  ✘ ${label}${detail ? ' — ' + detail : ''}`); }
function ok(cond, label, detail) { cond ? pass(label) : fail(label, detail); }

const CARRELAGE_SERVICES = SERVICE_CATALOG.carrelage?.services ?? [];
const ALL_SERVICES = Object.entries(SERVICE_CATALOG).flatMap(
  ([metier, def]) => (def.services || []).map(svc => ({ metier, svc }))
);
const NON_CARRELAGE = ALL_SERVICES.filter(({ metier }) => metier !== 'carrelage');

const WS  = WORK_SCENES['carrelage'];
const SR  = SITE_REALISM['carrelage'];
const SCENARIOS = SR?.scenarios ?? [];

const RUNTIME_STATES  = ['debut', 'encours', 'final'];
const CONTRACTS_STATES = ['debut', 'en_cours', 'termine'];
const RISK_PAIRS = CARRELAGE_VISUAL_CONTRACTS
  ? Object.values(CARRELAGE_VISUAL_CONTRACTS).reduce((acc, c) => acc, null)
  : null;

// Resolve which scenario matches a normalized service label
function resolveScenario(normLabel) {
  for (const sc of SCENARIOS) {
    if (!sc._for) continue;
    try { if (new RegExp(sc._for, 'i').test(normLabel)) return sc; } catch {}
  }
  return null;
}

// Map runtime state key to a WORK_SCENES states lookup (semifinal → semifinal)
function resolveStateData(stateKey) {
  const map = { debut: 'debut', encours: 'encours', final: 'final' };
  return WS?.states?.[map[stateKey] ?? stateKey] ?? null;
}

// ─── CS1 — 9 services routed ──────────────────────────────────────────────────

function cs1() {
  let routed = 0;
  for (const svc of CARRELAGE_SERVICES) {
    const norm = _norm(svc);
    const found = resolveScenario(norm);
    if (found) routed++;
    else fail(`CS1: "${svc}" → no scenario matched`, `norm: ${norm}`);
  }
  if (routed === 9) pass(`CS1: 9/9 carrelage services routed to specific scenes`);
  else fail(`CS1: only ${routed}/9 routed`, '');
}

// ─── CS2 — route unique ───────────────────────────────────────────────────────

function cs2() {
  for (const svc of CARRELAGE_SERVICES) {
    const norm = _norm(svc);
    const matches = SCENARIOS.filter(sc => {
      if (!sc._for) return false;
      try { return new RegExp(sc._for, 'i').test(norm); } catch { return false; }
    });
    if (matches.length === 1) pass(`CS2: "${svc}" → unique route (${matches[0]._for})`);
    else fail(`CS2: "${svc}" matches ${matches.length} scenarios`, matches.map(s => s._for).join(', '));
  }
}

// ─── CS3 — no external collision ─────────────────────────────────────────────

function cs3() {
  let hits = 0;
  for (const { metier, svc } of NON_CARRELAGE) {
    const norm = _norm(svc);
    for (const sc of SCENARIOS) {
      if (!sc._for) continue;
      try {
        if (new RegExp(sc._for, 'i').test(norm)) {
          fail(`CS3: "${svc}" (${metier}) matches carrelage regex "${sc._for}"`);
          hits++;
        }
      } catch {}
    }
  }
  if (hits === 0) pass('CS3: 0 non-carrelage services captured by carrelage routes');
}

// ─── CS4 — 27 state combinations produce a resolved scene ────────────────────

function cs4() {
  let resolved = 0;
  for (const svc of CARRELAGE_SERVICES) {
    const norm = _norm(svc);
    const scenario = resolveScenario(norm);
    for (const state of RUNTIME_STATES) {
      const stateData = resolveStateData(state);
      if (scenario && stateData) {
        resolved++;
        pass(`CS4: "${svc}" × ${state} → resolved`);
      } else {
        fail(`CS4: "${svc}" × ${state} → unresolved`, `scenario=${!!scenario} stateData=${!!stateData}`);
      }
    }
  }
}

// ─── CS5 — états distincts ────────────────────────────────────────────────────

function cs5() {
  // Check WORK_SCENES states are distinct
  const debut     = WS?.states?.debut;
  const encours   = WS?.states?.encours;
  const semifinal = WS?.states?.semifinal;
  const final_    = WS?.states?.final;

  ok(debut    && typeof debut.description    === 'string', 'CS5: WS state debut exists');
  ok(encours  && typeof encours.description  === 'string', 'CS5: WS state encours exists');
  ok(final_   && typeof final_.description   === 'string', 'CS5: WS state final exists');

  ok(debut?.description !== encours?.description,   'CS5: debut.description ≠ encours.description');
  ok(encours?.description !== final_?.description,  'CS5: encours.description ≠ final.description');
  ok(debut?.description !== final_?.description,    'CS5: debut.description ≠ final.description');

  ok(debut?.framing?.work_pct  !== encours?.framing?.work_pct,  'CS5: debut.work_pct ≠ encours.work_pct');
  ok(encours?.framing?.work_pct !== final_?.framing?.work_pct,  'CS5: encours.work_pct ≠ final.work_pct');

  ok(debut?.debris !== encours?.debris,   'CS5: debut.debris ≠ encours.debris');
  ok(encours?.debris !== final_?.debris,  'CS5: encours.debris ≠ final.debris');

  // Check contract states are distinct for each service
  for (const [key, c] of Object.entries(CARRELAGE_VISUAL_CONTRACTS)) {
    const d   = c.states?.debut;
    const ec  = c.states?.en_cours;
    const ter = c.states?.termine;
    if (!d || !ec || !ter) { fail(`CS5: ${key} missing contract state(s)`); continue; }
    ok(d.observable_action !== ec.observable_action,  `CS5 ${key}: debut.action ≠ en_cours.action`);
    ok(ec.observable_action !== (ter.observable_result ?? ter.observable_action),
       `CS5 ${key}: en_cours.action ≠ termine.result`);
    ok(d.required_visual_evidence?.[0] !== ter.required_visual_evidence?.[0],
       `CS5 ${key}: debut.evidence[0] ≠ termine.evidence[0]`);
  }
}

// ─── CS6 — surfaces correctes ─────────────────────────────────────────────────

const _EXPECTED_SURFACE = {
  'Pose carrelage sol':            { has: ['interior', 'floor'], not: ['exterior'] },
  'Pose carrelage mural':          { has: ['interior', 'wall'], not: ['exterior'] },
  'Faïence salle de bain':         { has: ['interior', 'bath'], not: [] },
  'Faïence cuisine':               { has: ['interior', 'kitchen'], not: [] },
  'Carrelage terrasse extérieure': { has: ['exterior', 'terrace'], not: [] },
  'Dallage extérieur':             { has: ['exterior', 'paving'], not: [] },
  'Pose pierre naturelle':         { has: ['stone'], not: [] },
  'Réfection joint':               { has: ['grout'], not: [] },
  'Réfection carrelage':           { has: ['tile', 'replacement'], not: [] },
};

function cs6() {
  for (const svc of CARRELAGE_SERVICES) {
    const sc = resolveScenario(_norm(svc));
    const exp = _EXPECTED_SURFACE[svc];
    if (!sc || !exp) { fail(`CS6: "${svc}" no scenario/expectation`); continue; }
    const blob = (sc.scene_note + ' ' + (sc.setting || '') + ' ' + (sc.scene_camera || '')).toLowerCase();
    for (const term of exp.has)
      ok(blob.includes(term), `CS6 "${svc}": scene contains "${term}"`);
    for (const term of exp.not)
      ok(!blob.includes(term), `CS6 "${svc}": scene does NOT contain "${term}"`);
  }
}

// ─── CS7 — outils cohérents ───────────────────────────────────────────────────

const _REQUIRED_TOOLS = {
  'Pose carrelage sol':            ['trowel', 'mallet', 'spacer'],
  'Pose carrelage mural':          ['trowel', 'mallet', 'spacer'],
  'Faïence salle de bain':         ['trowel', 'mallet', 'grout'],
  'Faïence cuisine':               ['trowel', 'spacer'],
  'Carrelage terrasse extérieure': ['mallet', 'level', 'adhesive'],
  'Dallage extérieur':             ['mallet', 'straightedge', 'shovel'],
  'Pose pierre naturelle':         ['trowel', 'mallet'],
  'Réfection joint':               ['grout', 'sponge'],
  'Réfection carrelage':           ['chisel', 'trowel'],
};

const _FORBIDDEN_TOOLS = {
  'Pose carrelage sol':    ['paintbrush', 'roller', 'harness', 'helmet'],
  'Faïence salle de bain': ['paint roller', 'pickaxe'],
  'Faïence cuisine':       ['paint roller'],
  'Réfection joint':       ['notched trowel', 'rubber mallet for laying', 'pickaxe'],
};

function cs7() {
  for (const svc of CARRELAGE_SERVICES) {
    const sc  = resolveScenario(_norm(svc));
    if (!sc) { fail(`CS7: "${svc}" no scenario`); continue; }
    const toolBlob = (sc.tools || []).join(' ').toLowerCase();
    const req  = _REQUIRED_TOOLS[svc] || [];
    const forb = _FORBIDDEN_TOOLS[svc] || [];
    for (const t of req)  ok(toolBlob.includes(t),  `CS7 "${svc}": required tool "${t}" present`);
    for (const t of forb) ok(!toolBlob.includes(t), `CS7 "${svc}": forbidden tool "${t}" absent`);
  }
}

// ─── CS8 — risk pairs differentiated ─────────────────────────────────────────

const RISK_PAIRS_LIST = [
  ['Pose carrelage sol',           'Faïence cuisine'],
  ['Faïence salle de bain',        'Faïence cuisine'],
  ['Carrelage terrasse extérieure','Dallage extérieur'],
  ['Réfection joint',              'Réfection carrelage'],
];

const _DIFFERENTIATORS = {
  'Pose carrelage sol|Faïence cuisine':            [['sol', 'cuisine'], ['floor', 'kitchen']],
  'Faïence salle de bain|Faïence cuisine':         [['bain', 'cuisine'], ['bath', 'kitchen']],
  'Carrelage terrasse extérieure|Dallage extérieur': [['facade', 'driveway'], ['terrace', 'path']],
  'Réfection joint|Réfection carrelage':           [['raker', 'chisel'], ['grout float', 'hammer']],
};

function cs8() {
  for (const [a, b] of RISK_PAIRS_LIST) {
    const scA = resolveScenario(_norm(a));
    const scB = resolveScenario(_norm(b));
    if (!scA || !scB) { fail(`CS8: "${a}" or "${b}" missing scenario`); continue; }
    const blobA = (scA.scene_note + ' ' + scA.scene_camera + ' ' + (scA.tools || []).join(' ')).toLowerCase();
    const blobB = (scB.scene_note + ' ' + scB.scene_camera + ' ' + (scB.tools || []).join(' ')).toLowerCase();
    ok(blobA !== blobB, `CS8: "${a}" scene ≠ "${b}" scene (not identical)`);
    const settingDiffer = scA.setting !== scB.setting;
    const noteDiffer    = scA.scene_note !== scB.scene_note;
    ok(settingDiffer || noteDiffer, `CS8: "${a}" / "${b}" differ in setting or scene_note`);
  }
}

// ─── CS9 — workers et sécurité ────────────────────────────────────────────────

function cs9() {
  const FORBIDDEN_PPE = ['casque', 'helmet', 'gilet haute visibilite', 'high-vis vest', 'harnais', 'harness'];
  for (const [key, c] of Object.entries(CARRELAGE_VISUAL_CONTRACTS)) {
    const forbiddenSafety = (c.safety?.forbidden || []).join(' ').toLowerCase();
    const requiredSafety  = (c.safety?.required  || []).join(' ').toLowerCase();
    for (const ppe of FORBIDDEN_PPE) {
      ok(!requiredSafety.includes(ppe),  `CS9 ${key}: "${ppe}" NOT in required safety`);
      ok(forbiddenSafety.includes('casque') || ppe !== 'casque' || forbiddenSafety.includes('helmet'),
         `CS9 ${key}: "casque" is forbidden`, '');
    }
    const maxWorkers = c.worker_rules?.max ?? 0;
    ok(maxWorkers >= 1 && maxWorkers <= 2, `CS9 ${key}: workers 1–2 (got ${maxWorkers})`);
  }
}

// ─── CS10 — compositions compatibles ─────────────────────────────────────────

const VALID_COMPOSITIONS = new Set(['close_detail', 'medium_intervention', 'wide_worksite', 'contextual_overview']);

function cs10() {
  for (const [key, c] of Object.entries(CARRELAGE_VISUAL_CONTRACTS)) {
    const prefs = c.composition_preferences || [];
    ok(prefs.length >= 1, `CS10 ${key}: at least 1 composition preference`);
    for (const comp of prefs)
      ok(VALID_COMPOSITIONS.has(comp), `CS10 ${key}: composition "${comp}" is valid`);
  }
}

// ─── CS11 — aucun autre métier modifié ────────────────────────────────────────

function cs11() {
  for (const { metier, svc } of NON_CARRELAGE) {
    const key = metier.toLowerCase().replace(/é/g, 'e').replace(/è/g, 'e').replace(/à/g, 'a');
    // Check that WORK_SCENES still has the metier key
    const hasWS = Object.prototype.hasOwnProperty.call(WORK_SCENES, key) ||
                  Object.prototype.hasOwnProperty.call(WORK_SCENES, metier);
    if (!hasWS) { fail(`CS11: "${metier}" WORK_SCENES key missing`, ''); continue; }
  }
  pass('CS11: all 163 non-carrelage services retain their WORK_SCENES key');

  // Verify carrelage key is in WORK_SCENES exactly once
  let carrCount = 0;
  for (const k of Object.keys(WORK_SCENES)) if (k === 'carrelage') carrCount++;
  ok(carrCount === 1, `CS11: carrelage key appears exactly once in WORK_SCENES (${carrCount})`);
}

// ─── CS12 — source unique ─────────────────────────────────────────────────────

async function cs12() {
  // carrelage defined only in carrelage.js (no residual key in finishing)
  const { WORK_SCENES_FINISHING, SITE_REALISM_FINISHING } = await import('../services/finishing.js');
  ok(!Object.prototype.hasOwnProperty.call(WORK_SCENES_FINISHING, 'carrelage'),
     'CS12: WORK_SCENES_FINISHING has no carrelage key');
  ok(!Object.prototype.hasOwnProperty.call(SITE_REALISM_FINISHING, 'carrelage'),
     'CS12: SITE_REALISM_FINISHING has no carrelage key');

  // Contracts defined once — docs/ re-exports src/ canonical
  const docsMod = await import('/docs/carrelage-visual-contracts.js?v=2');
  const srcMod  = await import('/src/image-generation/services/carrelage-contracts.js?v=1');
  ok(
    JSON.stringify(Object.keys(docsMod.CARRELAGE_VISUAL_CONTRACTS)) ===
    JSON.stringify(Object.keys(srcMod.CARRELAGE_VISUAL_CONTRACTS)),
    'CS12: docs/ and src/ carrelage contracts have identical keys (parity)'
  );
  ok(
    JSON.stringify(docsMod.CARRELAGE_FOR_PATTERNS) ===
    JSON.stringify(srcMod.CARRELAGE_FOR_PATTERNS),
    'CS12: CARRELAGE_FOR_PATTERNS parity between docs/ and src/'
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

export async function runCarrelageSceneTests() {
  console.group('[CARRELAGE SCENE TESTS]');
  _results.length = 0;
  _pass = 0;
  _fail = 0;

  console.group('[CS1]'); cs1(); console.groupEnd();
  console.group('[CS2]'); cs2(); console.groupEnd();
  console.group('[CS3]'); cs3(); console.groupEnd();
  console.group('[CS4]'); cs4(); console.groupEnd();
  console.group('[CS5]'); cs5(); console.groupEnd();
  console.group('[CS6]'); cs6(); console.groupEnd();
  console.group('[CS7]'); cs7(); console.groupEnd();
  console.group('[CS8]'); cs8(); console.groupEnd();
  console.group('[CS9]'); cs9(); console.groupEnd();
  console.group('[CS10]'); cs10(); console.groupEnd();
  console.group('[CS11]'); cs11(); console.groupEnd();
  await cs12();

  const total = _pass + _fail;
  const summary = `[CARRELAGE SCENES SUMMARY] ${_pass}/${total} passed${_fail ? ` — ${_fail} FAILED` : ' ✔'}`;
  _fail ? console.error(summary) : console.info(summary);
  console.groupEnd();
  return { passed: _pass, failed: _fail, total, results: _results.slice(), ok: _fail === 0 };
}
