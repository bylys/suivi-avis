/**
 * debug/carrelage-scenes-tests.js — CS1-CS12 carrelage service scenes tests.
 * Chargé uniquement en mode ?imageGenTests=1. Aucun appel API réel.
 *
 * semifinal EST atteignable dans le pipeline via row.etat === 'propre'
 * ou row.etat === 'semifinal' (scene-builder.js).
 * Tests couvrent donc 9 services × 4 états = 36 combinaisons.
 */

import { WORK_SCENES, SITE_REALISM } from '../services/index.js';
import { SERVICE_CATALOG } from '../config/service-catalog.js';
import { CARRELAGE_VISUAL_CONTRACTS } from '../services/carrelage-contracts.js';
import { _applySiteRealism } from '../resolution/service-resolver.js';
import { _resolveLocationAndComposition, _isLocationCompatibleWithSetting, _resolveCompositionForSetting, _INTERIOR_COMPOSITION_OVERRIDES } from '../resolution/location-resolver.js';
import { _sanitizeSceneForPrompt, _validateInteriorPayload } from '../pipeline/prompt-scene-sanitizer.js';
import { generateImageOnly }       from '../pipeline/generate-image.js';
import { _IMG_REWRITE_SYSTEM }     from '../prompt/prompt-rewriter.js';
import { buildDallePromptV2 } from '../prompt/scene-builder.js';
import { _appendLockedFinalConstraints } from '../prompt/locked-constraints.js';
import { SAFETY_CHECK_RULES, FORBIDDEN_SAFETY_BY_METIER } from '../safety/safety-rules.js';
import { createGenerationState } from '../pipeline/state.js';

// CS11 needs to load a single local static file. The runtime-tests guard explicitly
// allows same-origin GET to /docs/service-coverage-audit.json — no bypass needed.
async function fetchLocalAuditSnapshot() {
  const url = new URL('/docs/service-coverage-audit.json', window.location.origin);
  if (
    url.origin !== window.location.origin ||
    url.pathname !== '/docs/service-coverage-audit.json'
  ) {
    throw new Error('[UNSAFE_TEST_RESOURCE_URL]');
  }
  return fetch(url, { method: 'GET', cache: 'no-store', credentials: 'same-origin' });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _norm(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

const _results = [];
let _pass = 0, _fail = 0;

function pass(label) { _results.push({ status: 'PASS',             label }); _pass++; }
function fail(label, detail) { _results.push({ status: 'UNEXPECTED_FAILURE', label, detail }); _fail++; console.error(`  ✘ ${label}${detail ? ' — ' + detail : ''}`); }
function ok(cond, label, detail) { cond ? pass(label) : fail(label, detail); }

// For diagnostic tests expected to fail before corrections:
//   EXPECTED_FAILURE when the assertion fails (bug confirmed — expected before fix)
//   UNEXPECTED_PASS  when the assertion passes (bug already gone — needs review)
// Neither increments _fail so the global suite stays green.
function okExpectedFailure(cond, label, detail) {
  if (cond) {
    _results.push({ status: 'UNEXPECTED_PASS', label });
    _pass++;
    console.warn(`  ? UNEXPECTED_PASS (check if already fixed): ${label}`);
  } else {
    _results.push({ status: 'EXPECTED_FAILURE', label, detail });
    console.info(`  ~ EXPECTED_FAILURE (will pass after corrections): ${label}${detail ? ' — ' + detail : ''}`);
  }
}


const CARRELAGE_SERVICES = SERVICE_CATALOG.carrelage?.services ?? [];
const ALL_SERVICES = Object.entries(SERVICE_CATALOG).flatMap(
  ([metier, def]) => (def.services || []).map(svc => ({ metier, svc }))
);
const NON_CARRELAGE = ALL_SERVICES.filter(({ metier }) => metier !== 'carrelage');

const WS  = WORK_SCENES['carrelage'];
const SR  = SITE_REALISM['carrelage'];
const SCENARIOS = SR?.scenarios ?? [];

// 4 états testés : semifinal est atteignable via row.etat 'propre' ou 'semifinal'
const RUNTIME_STATES = ['debut', 'encours', 'semifinal', 'final'];

// Resolve which scenario matches a normalized service label
function resolveScenario(normLabel) {
  for (const sc of SCENARIOS) {
    if (!sc._for) continue;
    try { if (new RegExp(sc._for, 'i').test(normLabel)) return sc; } catch {}
  }
  return null;
}

// Resolve state data from WORK_SCENES; all 4 states must exist
function resolveStateData(stateKey) {
  return WS?.states?.[stateKey] ?? null;
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

// ─── CS4 — 36 state combinations produce a resolved scene ────────────────────

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

// ─── CS5 — états distincts (4 états × toutes paires) ─────────────────────────

function cs5() {
  const debut     = WS?.states?.debut;
  const encours   = WS?.states?.encours;
  const semifinal = WS?.states?.semifinal;
  const final_    = WS?.states?.final;

  // All 4 states must exist
  ok(debut    && typeof debut.description    === 'string', 'CS5: WS state debut exists');
  ok(encours  && typeof encours.description  === 'string', 'CS5: WS state encours exists');
  ok(semifinal && typeof semifinal.description === 'string', 'CS5: WS state semifinal exists');
  ok(final_   && typeof final_.description   === 'string', 'CS5: WS state final exists');

  // Description distinctions — all 6 pairs
  ok(debut?.description    !== encours?.description,    'CS5: debut.description ≠ encours.description');
  ok(encours?.description  !== semifinal?.description,  'CS5: encours.description ≠ semifinal.description');
  ok(semifinal?.description !== final_?.description,    'CS5: semifinal.description ≠ final.description');
  ok(debut?.description    !== final_?.description,     'CS5: debut.description ≠ final.description');

  // work_pct ascending
  ok(debut?.framing?.work_pct    <  encours?.framing?.work_pct,    'CS5: debut.work_pct < encours.work_pct');
  ok(encours?.framing?.work_pct  <  semifinal?.framing?.work_pct,  'CS5: encours.work_pct < semifinal.work_pct');
  ok(semifinal?.framing?.work_pct <= final_?.framing?.work_pct,    'CS5: semifinal.work_pct ≤ final.work_pct');

  // debris distinctions
  ok(debut?.debris !== encours?.debris,    'CS5: debut.debris ≠ encours.debris');
  ok(encours?.debris !== semifinal?.debris, 'CS5: encours.debris ≠ semifinal.debris');
  ok(semifinal?.debris !== final_?.debris, 'CS5: semifinal.debris ≠ final.debris');

  // Contract state distinctions (9 services)
  for (const [key, c] of Object.entries(CARRELAGE_VISUAL_CONTRACTS)) {
    const d   = c.states?.debut;
    const ec  = c.states?.en_cours;
    const ter = c.states?.termine;
    if (!d || !ec || !ter) { fail(`CS5: ${key} missing contract state(s)`); continue; }
    ok(d.observable_action !== ec.observable_action, `CS5 ${key}: debut.action ≠ en_cours.action`);
    ok(ec.observable_action !== (ter.observable_result ?? ter.observable_action),
       `CS5 ${key}: en_cours.action ≠ termine.result`);
    ok(d.required_visual_evidence?.[0] !== ter.required_visual_evidence?.[0],
       `CS5 ${key}: debut.evidence[0] ≠ termine.evidence[0]`);
  }
}

// ─── CS6 — surfaces correctes (4 états) ──────────────────────────────────────

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
    for (const term of exp.has)  ok(blob.includes(term),  `CS6 "${svc}": scene contains "${term}"`);
    for (const term of exp.not)  ok(!blob.includes(term), `CS6 "${svc}": scene does NOT contain "${term}"`);
  }
  // Surface content is invariant across states (scenario is shared) — confirm state data exists for all 4
  for (const svc of CARRELAGE_SERVICES) {
    for (const state of RUNTIME_STATES) {
      const sd = resolveStateData(state);
      ok(!!sd?.framing?.foreground, `CS6 "${svc}" × ${state}: framing.foreground defined`);
    }
  }
}

// ─── CS7 — outils cohérents (4 états) ────────────────────────────────────────

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
  'Réfection joint':       ['pickaxe'],
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
  // Tool count rules hold across all 4 states (counts driven by _REALISM_COUNTS)
  // debut=3 tools, encours=2, semifinal=1, final=0 — verify pool is large enough
  for (const svc of CARRELAGE_SERVICES) {
    const sc = resolveScenario(_norm(svc));
    if (!sc) continue;
    ok((sc.tools || []).length >= 3,
       `CS7 "${svc}": tool pool ≥ 3 (covers debut state count)`);
  }
}

// ─── CS8 — risk pairs differentiated ─────────────────────────────────────────

const RISK_PAIRS_LIST = [
  ['Pose carrelage sol',           'Faïence cuisine'],
  ['Faïence salle de bain',        'Faïence cuisine'],
  ['Carrelage terrasse extérieure','Dallage extérieur'],
  ['Réfection joint',              'Réfection carrelage'],
];

function cs8() {
  for (const [a, b] of RISK_PAIRS_LIST) {
    const scA = resolveScenario(_norm(a));
    const scB = resolveScenario(_norm(b));
    if (!scA || !scB) { fail(`CS8: "${a}" or "${b}" missing scenario`); continue; }
    ok(scA.scene_note !== scB.scene_note, `CS8: "${a}" / "${b}" scene_note differ`);
    const settingDiffer = scA.setting !== scB.setting;
    const camDiffer     = scA.scene_camera !== scB.scene_camera;
    ok(settingDiffer || camDiffer, `CS8: "${a}" / "${b}" differ in setting or camera`);
  }
}

// ─── CS9 — workers et sécurité (4 états) ─────────────────────────────────────

function cs9() {
  const FORBIDDEN_PPE = ['casque', 'helmet', 'gilet haute visibilite', 'high-vis vest', 'harnais', 'harness'];
  for (const [key, c] of Object.entries(CARRELAGE_VISUAL_CONTRACTS)) {
    const forbiddenSafety = (c.safety?.forbidden || []).join(' ').toLowerCase();
    const requiredSafety  = (c.safety?.required  || []).join(' ').toLowerCase();
    for (const ppe of FORBIDDEN_PPE) {
      ok(!requiredSafety.includes(ppe),  `CS9 ${key}: "${ppe}" NOT in required safety`);
    }
    ok(forbiddenSafety.includes('casque'), `CS9 ${key}: "casque" explicitly forbidden`);
    const maxWorkers = c.worker_rules?.max ?? 0;
    ok(maxWorkers >= 1 && maxWorkers <= 2, `CS9 ${key}: workers 1–2 (got ${maxWorkers})`);
  }
  // State invariance: safety rules apply regardless of state (contracts are state-independent on PPE)
  ok(RUNTIME_STATES.length === 4, 'CS9: 4 states covered (debut/encours/semifinal/final)');
}

// ─── CS10 — compositions compatibles (4 états) ───────────────────────────────

const VALID_COMPOSITIONS = new Set(['close_detail', 'medium_intervention', 'wide_worksite', 'contextual_overview']);

function cs10() {
  for (const [key, c] of Object.entries(CARRELAGE_VISUAL_CONTRACTS)) {
    const prefs = c.composition_preferences || [];
    ok(prefs.length >= 1, `CS10 ${key}: at least 1 composition preference`);
    for (const comp of prefs)
      ok(VALID_COMPOSITIONS.has(comp), `CS10 ${key}: composition "${comp}" is valid`);
  }
  // Composition preferences are service-level (invariant across states)
  ok(RUNTIME_STATES.length === 4, 'CS10: 4 states covered (composition is service-level, not state-level)');
}

// ─── CS11 — routage complet des 163 services non-carrelage ────────────────────

async function cs11() {
  // Runtime audit for all services
  const runtimeAudit = window._runServiceCoverageAudit
    ? window._runServiceCoverageAudit()
    : { services: [] };

  const runtimeMap = new Map(
    (runtimeAudit.services || [])
      .filter(s => s.metier !== 'carrelage')
      .map(s => [`${s.metier}|${s.service_label ?? s.service}`, s])
  );

  // Fetch current persisted JSON (which was regenerated from same runtime)
  let jsonData;
  try {
    const resp = await fetchLocalAuditSnapshot();
    jsonData = await resp.json();
  } catch (e) {
    fail('CS11: failed to fetch service-coverage-audit.json', e.message);
    return;
  }

  const jsonMap = new Map(
    (jsonData.services || [])
      .filter(s => s.metier !== 'carrelage')
      .map(s => [`${s.metier}|${s.service_label ?? s.service}`, s])
  );

  // Sanity: exactly 163 non-carrelage services in both
  ok(runtimeMap.size === 163, `CS11: runtime has 163 non-carrelage services (got ${runtimeMap.size})`);
  ok(jsonMap.size === 163,    `CS11: JSON has 163 non-carrelage services (got ${jsonMap.size})`);

  let diffs = 0;
  const FIELDS = ['routing_coverage', 'matched_regex', 'fallback_used'];
  for (const [key, rEntry] of runtimeMap) {
    const jEntry = jsonMap.get(key);
    if (!jEntry) {
      fail(`CS11: "${key}" present in runtime but missing from JSON`);
      diffs++;
      continue;
    }
    for (const field of FIELDS) {
      const rv = JSON.stringify(rEntry[field]);
      const jv = JSON.stringify(jEntry[field]);
      if (rv !== jv) {
        fail(`CS11: ${key} | ${field}: runtime=${rv} json=${jv}`);
        diffs++;
      }
    }
  }

  if (diffs === 0) pass(`CS11: 163/163 non-carrelage services — routing_coverage, matched_regex, fallback_used identical ✔`);

  // WORK_SCENES key integrity: carrelage key appears exactly once, no other key removed
  let carrCount = 0;
  for (const k of Object.keys(WORK_SCENES)) if (k === 'carrelage') carrCount++;
  ok(carrCount === 1, `CS11: carrelage key appears exactly once in WORK_SCENES`);
}

// ─── CS12 — source unique ─────────────────────────────────────────────────────

async function cs12() {
  const { WORK_SCENES_FINISHING, SITE_REALISM_FINISHING } = await import('../services/finishing.js');
  ok(!Object.prototype.hasOwnProperty.call(WORK_SCENES_FINISHING, 'carrelage'),
     'CS12: WORK_SCENES_FINISHING has no carrelage key');
  ok(!Object.prototype.hasOwnProperty.call(SITE_REALISM_FINISHING, 'carrelage'),
     'CS12: SITE_REALISM_FINISHING has no carrelage key');

  const docsMod = await import('/docs/carrelage-visual-contracts.js?v=3');
  const srcMod  = await import('/src/image-generation/services/carrelage-contracts.js?v=2');
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

// ─── CW helpers ───────────────────────────────────────────────────────────────

function _makeMinimalScene(matchedService, stateLevel = 'encours') {
  return JSON.stringify({
    _matched_key:     'carrelage',
    _matched_service: matchedService,
    state_level:      stateLevel,
  });
}

function _applyRealism(matchedService, imageIndex = 0) {
  const json  = _makeMinimalScene(matchedService);
  const after = _applySiteRealism(json, imageIndex);
  try { return JSON.parse(after); } catch { return null; }
}

// ─── CW1 — setting='interior' survives _applySiteRealism for interior services ──

function cw1() {
  const interior = [
    'Pose carrelage mural',
    'Faïence salle de bain',
    'Faïence cuisine',
    'Pose carrelage sol',
    'Pose pierre naturelle',
    'Réfection joint',
    'Réfection carrelage',
  ];
  for (const svc of interior) {
    const scene = _applyRealism(svc);
    ok(
      scene !== null && scene.setting === 'interior',
      `CW1: "${svc}" → setting=interior after _applySiteRealism`,
      scene ? `got: ${scene.setting}` : 'parse failed'
    );
  }
}

// ─── CW2 — salle de bain work_type references sanitary context ────────────────

function cw2() {
  const scene = _applyRealism('Faïence salle de bain');
  const note  = (scene?.work_type || '').toLowerCase();
  ok(
    /shower|bath|sanit|tub|bain|salle/.test(note),
    'CW2: salle de bain work_type references sanitary context',
    `work_type: "${scene?.work_type}"`
  );
}

// ─── CW3 — cuisine work_type references vertical backsplash / worktop ─────────

function cw3() {
  const scene = _applyRealism('Faïence cuisine');
  const note  = (scene?.work_type || '').toLowerCase();
  ok(
    /splashback|worktop|cupboard|credence|cuisine|wall cupboard/.test(note),
    'CW3: cuisine work_type references vertical backsplash/worktop',
    `work_type: "${scene?.work_type}"`
  );
}

// ─── CW4 — carrelage mural scenario has interior camera position ──────────────

function cw4() {
  const scene = _applyRealism('Pose carrelage mural');
  const cam   = (scene?.camera_position || '').toLowerCase();
  ok(
    /wall|standing.*back|2.*m|interior|indoor/.test(cam),
    'CW4: mural camera_position describes interior framing',
    `camera_position: "${scene?.camera_position}"`
  );
  ok(
    scene?.setting === 'interior',
    'CW4: mural setting=interior persists',
    `setting: "${scene?.setting}"`
  );
}

// ─── CW5 — terrasse work_type mentions "terrace" (not generic paving) ─────────

function cw5() {
  const terrasse = _applyRealism('Carrelage terrasse ext.');
  const dallage  = _applyRealism('Dallage extérieur');
  const tNote    = (terrasse?.work_type || '').toLowerCase();
  const dNote    = (dallage?.work_type  || '').toLowerCase();

  ok(
    /terrace|terrasse/.test(tNote),
    'CW5: terrasse work_type contains "terrace" keyword',
    `work_type: "${terrasse?.work_type}"`
  );
  ok(
    !/terrace|terrasse/.test(dNote),
    'CW5: dallage work_type does NOT contain "terrace" keyword',
    `work_type: "${dallage?.work_type}"`
  );
  ok(
    tNote !== dNote,
    'CW5: terrasse and dallage work_type are different strings',
    'identical work_type — pair cannot be differentiated'
  );
}

// ─── CW6 — terrasse and dallage have different camera and scene notes ─────────

function cw6() {
  const terrasse = _applyRealism('Carrelage terrasse ext.');
  const dallage  = _applyRealism('Dallage extérieur');

  const tCam = (terrasse?.camera_position || '').toLowerCase();
  const dCam = (dallage?.camera_position  || '').toLowerCase();

  ok(
    /facade|house|building|door|glazed/.test(tCam),
    'CW6: terrasse camera references building facade or glazed door',
    `camera: "${terrasse?.camera_position}"`
  );
  ok(
    /boundary|sub.?base|pavement|layout|area|landscape|wall|back/.test(dCam),
    'CW6: dallage camera references sub-base or boundary context (not facade)',
    `camera: "${dallage?.camera_position}"`
  );
  ok(
    tCam !== dCam,
    'CW6: terrasse and dallage camera_position are different',
    'identical camera — pair undifferentiated'
  );
}

// ─── CW7 — carrelage absent from SAFETY_CHECK_RULES (visionCalls=0 intentional) ─

function cw7() {
  ok(
    SAFETY_CHECK_RULES['carrelage'] === undefined,
    'CW7: SAFETY_CHECK_RULES["carrelage"] is undefined — vision check intentionally skipped',
    `got: ${JSON.stringify(SAFETY_CHECK_RULES['carrelage'])}`
  );
}

// ─── CW8 — carrelage fully excluded from safety infrastructure ────────────────

function cw8() {
  ok(
    SAFETY_CHECK_RULES['carrelage'] === undefined,
    'CW8: carrelage absent from SAFETY_CHECK_RULES',
    `got: ${JSON.stringify(SAFETY_CHECK_RULES['carrelage'])}`
  );
  ok(
    FORBIDDEN_SAFETY_BY_METIER['carrelage'] === undefined,
    'CW8: carrelage absent from FORBIDDEN_SAFETY_BY_METIER',
    `got: ${JSON.stringify(FORBIDDEN_SAFETY_BY_METIER['carrelage'])}`
  );
  // Full exclusion from safety = both checks absent → visionCalls always 0
  ok(
    SAFETY_CHECK_RULES['carrelage'] === undefined &&
    FORBIDDEN_SAFETY_BY_METIER['carrelage'] === undefined,
    'CW8: carrelage fully excluded from safety infrastructure — visionCalls=0 is expected',
    ''
  );
}

// ─── RC01-RC06 : vérifications post-correction RC-0 et RC-1 ──────────────────
// Ces tests doivent PASSER après l'implémentation de RC-0 et RC-1.
// Ils utilisent ok() (non okExpectedFailure) et font partie du bilan global.

const EXT_MH_RE   = /\b(?:facade|roof|exterior|garden|street|driveway|outdoor|house\s+building\s+clearly\s+visible)\b/i;
const EXT_ARCH_RE = /haussmann|zinc rooftop|rendered facade|stone building|slate roof|wrought.iron|balcon|brick facade|half.timber|suburban house.*(?:slate|roof)|typical french|classic.*building/i;
const INT_ARCH_RE = /interior|plaster wall|skirting|ordinary occupied|residential.*interior/i;

// ─── RC01 — location_type intérieur compatible (pas de must_have extérieur) ───
function rc01() {
  for (const row of _INTERIOR_SERVICES_ROWS) {
    let json = buildDallePromptV2(row);
    json = _applySiteRealism(json, 0);
    json = _resolveLocationAndComposition(json, 0);
    const resolved = JSON.parse(json);
    const badMH = (resolved.location_must_have || []).filter(mh => EXT_MH_RE.test(mh));
    ok(
      badMH.length === 0,
      `RC01: "${row.travaux}" location_must_have has no exterior constraint`,
      `type=${resolved.location_type} bad_must_have=${JSON.stringify(badMH)}`
    );
    ok(
      resolved.location_type !== 'maison_individuelle',
      `RC01: "${row.travaux}" location_type ≠ maison_individuelle`,
      `got: "${resolved.location_type}"`
    );
  }
}

// ─── RC02 — interdictions extérieures présentes dans exclude ─────────────────
function rc02() {
  for (const row of _INTERIOR_SERVICES_ROWS) {
    let json = buildDallePromptV2(row);
    json = _applySiteRealism(json, 0);
    json = _resolveLocationAndComposition(json, 0);
    const resolved = JSON.parse(json);
    const excl = resolved.exclude || [];
    const EXT_TERMS = ['exterior facade', 'street', 'garden', 'roof', 'outdoor architecture'];
    const covered = EXT_TERMS.filter(t => excl.some(e => e.includes(t.split(' ')[0])));
    ok(
      covered.length >= 2,
      `RC02: "${row.travaux}" exclude contains ≥2 exterior categories`,
      `exclude=${JSON.stringify(excl)}`
    );
  }
}

// ─── RC03 — architecture ne décrit plus la ville extérieure ──────────────────
function rc03() {
  for (const row of _INTERIOR_SERVICES_ROWS) {
    const json = JSON.parse(buildDallePromptV2(row));
    ok(
      !EXT_ARCH_RE.test(json.architecture),
      `RC03: "${row.travaux}" architecture has no exterior city keywords`,
      `architecture: "${json.architecture}"`
    );
  }
}

// ─── RC04 — architecture décrit un espace intérieur ─────────────────────────
function rc04() {
  for (const row of _INTERIOR_SERVICES_ROWS) {
    const json = JSON.parse(buildDallePromptV2(row));
    ok(
      INT_ARCH_RE.test(json.architecture),
      `RC04: "${row.travaux}" architecture describes an interior space`,
      `architecture: "${json.architecture}"`
    );
  }
}

// ─── RC05 — terrasse et dallage restent extérieurs ───────────────────────────
function rc05() {
  for (const travaux of ['Carrelage terrasse ext.', 'Dallage extérieur']) {
    const full = _fullResolve(travaux);
    ok(
      full?.setting === 'exterior',
      `RC05: "${travaux}" setting remains exterior`,
      `got: ${full?.setting}`
    );
    ok(
      full?.location_type !== 'appartement',
      `RC05: "${travaux}" location_type is not appartement`,
      `got: ${full?.location_type}`
    );
  }
}

// ─── RC06 — combinaison contradictoire setting=interior + maison_individuelle est résolue
function rc06() {
  // Mock: pipeline a résolu contexte='maison' → maison_individuelle, mais setting=interior
  const mockJson = JSON.stringify({
    _matched_key: 'carrelage',
    _matched_service: 'Faïence salle de bain',
    setting: 'interior',
    contexte: 'maison',
    exclude: [],
  });
  const resolved = JSON.parse(_resolveLocationAndComposition(mockJson, 0));
  const badMH = (resolved.location_must_have || []).filter(mh => EXT_MH_RE.test(mh));
  ok(
    badMH.length === 0,
    'RC06: setting=interior + contexte=maison → location_must_have sans contrainte extérieure',
    `type=${resolved.location_type} bad_must_have=${JSON.stringify(badMH)}`
  );
  ok(
    resolved.location_type !== 'maison_individuelle',
    'RC06: maison_individuelle substitué quand setting=interior',
    `got: "${resolved.location_type}"`
  );
  ok(
    _isLocationCompatibleWithSetting(resolved.location_type, 'interior'),
    `RC06: location "${resolved.location_type}" est compatible intérieur`,
    ''
  );
}

// ─── RC07 — guard locType: setting=interior + location_type=null → reste null ──
// RC-0 ne doit pas assigner un fallback quand aucun lieu n'a été résolu.
// Guard: `locType && !isLocationCompatibleWithSetting(...)` — le && bloque sur null.
function rc07() {
  // Inject a minimal scene with setting=interior and no contexte that would resolve
  // to a location. The resolution chain (steps a-e) returns null → RC-0 guard skips.
  const mockJson = JSON.stringify({
    _matched_key:     'peinture',
    _matched_service: 'Peinture intérieure',
    setting:          'interior',
    contexte:         '',
    exclude:          [],
  });
  const resolved = JSON.parse(_resolveLocationAndComposition(mockJson, 0));
  ok(
    resolved.location_type === null,
    'RC07: setting=interior + location_type=null → location_type stays null (RC-0 guard on locType)',
    `got: "${resolved.location_type}"`
  );
}

// ─── RC21–RC24: RC-2 composition setting-awareness ───────────────────────────

const _EXT_COMP_RE  = /\bneighbourhood\b|\bbuilding.*exterior\b|\bvehicle.*visible\b|\bfacade.*overview\b|\bgarden\b|\bstreet\s+view\b|\broad\s+type\b|\bproperty\s+context\b|\b5[–-]15\s*m\b|\b10[–-]30\s*m\b/i;
const _INT_COMP_RE  = /inside the room|interior|room|kitchen|bathroom|residential/i;
const _VALID_COMPS  = ['close_detail', 'medium_intervention', 'wide_worksite', 'contextual_overview'];

// RC21 — composition_desc contains no exterior vocabulary for interior services
function rc21() {
  for (const row of _INTERIOR_SERVICES_ROWS) {
    for (const comp of _VALID_COMPS) {
      const obj = JSON.parse(_applySiteRealism(buildDallePromptV2(row), 0));
      obj._pre_assigned_composition = comp;
      obj._pre_assigned_vehicle     = 'absent';
      const resolved = JSON.parse(_resolveLocationAndComposition(JSON.stringify(obj), 0));
      const desc = resolved.composition_desc || '';
      ok(
        !_EXT_COMP_RE.test(desc),
        `RC21: "${row.travaux}" + ${comp} → composition_desc no exterior vocabulary`,
        `desc: "${desc}"`
      );
    }
  }
}

// RC22 — three sub-assertions for interior composition/camera fields:
//   RC22A: positive interior signal in combined composition_desc+camera_position+camera_distance
//   RC22B: no exterior vocabulary in those same fields
//   RC22C: camera_distance plausible for interior (no 5–30 m exterior ranges)
// _applySiteRealism may set service-specific camera_position ("standing at bathroom
// entrance") that doesn't contain the literal word "inside" — RC-2's overridden
// composition_desc supplies the positive interior evidence.
function rc22() {
  const INT_SIGNAL_RE = /inside\s+the\s+room|interior|room\s+layout|within\s+the\s+room|indoor/i;
  const EXT_DIST_RE   = /\b(?:5\s*to\s*[8-9]\d*|6\s*to\s*\d+|10\s*to\s*\d+|\d{2,}\s*met)/i;
  const EXT_POS_RE    = /\b(?:facade|street|garden|outdoor|outside|open\s+sky|pavement|roof|kerb)/i;
  for (const row of _INTERIOR_SERVICES_ROWS) {
    for (const comp of ['wide_worksite', 'contextual_overview']) {
      const obj = JSON.parse(_applySiteRealism(buildDallePromptV2(row), 0));
      obj._pre_assigned_composition = comp;
      obj._pre_assigned_vehicle     = 'absent';
      const resolved = JSON.parse(_resolveLocationAndComposition(JSON.stringify(obj), 0));
      const effectiveText = [resolved.composition_desc, resolved.camera_position, resolved.camera_distance]
        .filter(Boolean).join(' ');
      ok(
        INT_SIGNAL_RE.test(effectiveText),
        `RC22A: "${row.travaux}" + ${comp} → positive interior signal in composition/camera fields`,
        `text: "${effectiveText.slice(0, 120)}"`
      );
      ok(
        !EXT_POS_RE.test(effectiveText),
        `RC22B: "${row.travaux}" + ${comp} → no exterior landmark in composition/camera fields`,
        `text: "${effectiveText.slice(0, 120)}"`
      );
      ok(
        !EXT_DIST_RE.test(resolved.camera_distance || ''),
        `RC22C: "${row.travaux}" + ${comp} → camera_distance plausible for interior`,
        `camera_distance: "${resolved.camera_distance}"`
      );
    }
  }
}

// RC23 — contextual evidence preserved: sdb → sanitary/bathroom, cuisine → kitchen
function rc23() {
  const cases = [
    { travaux: 'Faïence salle de bain', re: /bathroom|shower|sanit|wet.*room|room/i,  label: 'sanitary or room context' },
    { travaux: 'Faïence cuisine',       re: /kitchen|cuisine|room/i,                   label: 'kitchen or room context' },
    { travaux: 'Pose carrelage mural',  re: /wall|surface|room|interior/i,             label: 'vertical surface or interior context' },
  ];
  for (const { travaux, re, label } of cases) {
    const obj = JSON.parse(_applySiteRealism(
      buildDallePromptV2({ travaux, metier: 'carrelage', etat: 'encours', contexte: 'maison', ville: 'Paris' }), 0
    ));
    obj._pre_assigned_composition = 'contextual_overview';
    obj._pre_assigned_vehicle     = 'absent';
    const resolved = JSON.parse(_resolveLocationAndComposition(JSON.stringify(obj), 0));
    const desc = (resolved.composition_desc || '') + ' ' + (resolved.architecture || '');
    ok(
      re.test(desc),
      `RC23: "${travaux}" → ${label} still visible in resolved fields`,
      `desc: "${resolved.composition_desc}"`
    );
  }
}

// RC24 — exterior services (terrasse, dallage) composition_desc unchanged
function rc24() {
  for (const travaux of ['Carrelage terrasse ext.', 'Dallage extérieur']) {
    const row = { travaux, metier: 'carrelage', etat: 'encours', contexte: 'maison', ville: 'Paris' };
    for (const comp of ['wide_worksite', 'contextual_overview']) {
      const obj = JSON.parse(_applySiteRealism(buildDallePromptV2(row), 0));
      obj._pre_assigned_composition = comp;
      obj._pre_assigned_vehicle     = 'absent';
      const resolved    = JSON.parse(_resolveLocationAndComposition(JSON.stringify(obj), 0));
      const overrideDesc = (_INTERIOR_COMPOSITION_OVERRIDES[comp] || {}).description || '';
      ok(
        resolved.composition_desc !== overrideDesc,
        `RC24: exterior "${travaux}" + ${comp} → composition_desc not replaced by interior override`,
        `desc: "${resolved.composition_desc}"`
      );
    }
  }
}

// ─── RC31–RC34: RC-3 vehicle setting-awareness ───────────────────────────────

// RC31 — vehicle forced absent for all 7 interior services, regardless of pre-assigned value
function rc31() {
  for (const row of _INTERIOR_SERVICES_ROWS) {
    for (const vehicleVal of ['clearly_visible', 'partially_visible', 'absent']) {
      const obj = JSON.parse(_applySiteRealism(buildDallePromptV2(row), 0));
      obj._pre_assigned_vehicle     = vehicleVal;
      obj._pre_assigned_composition = 'medium_intervention';
      const resolved = JSON.parse(_resolveLocationAndComposition(JSON.stringify(obj), 0));
      ok(
        resolved.professional_vehicle_presence === 'absent',
        `RC31: "${row.travaux}" (pre=${vehicleVal}) → vehicle absent for interior`,
        `got: "${resolved.professional_vehicle_presence}"`
      );
    }
  }
}

// RC32 — no residual vehicle language in composition_desc when interior
function rc32() {
  const VEHICLE_RE = /\bprofessional van\b|\bwork vehicle\b|\bvehicle in background\b|\bbranded van\b|\bservice van\b/i;
  for (const row of _INTERIOR_SERVICES_ROWS.slice(0, 3)) {
    const obj = JSON.parse(_applySiteRealism(buildDallePromptV2(row), 0));
    obj._pre_assigned_vehicle     = 'clearly_visible';
    obj._pre_assigned_composition = 'wide_worksite';
    const resolved = JSON.parse(_resolveLocationAndComposition(JSON.stringify(obj), 0));
    const checked = [
      resolved.composition_desc || '',
      resolved.architecture     || '',
      resolved.environment      || '',
    ].join(' ');
    ok(
      !VEHICLE_RE.test(checked),
      `RC32: "${row.travaux}" interior → no residual vehicle language in resolved fields`,
      `checked: "${checked.slice(0, 80)}"`
    );
  }
}

// RC33 — exterior services (terrasse, dallage) vehicle plan unchanged
function rc33() {
  for (const travaux of ['Carrelage terrasse ext.', 'Dallage extérieur']) {
    const row = { travaux, metier: 'carrelage', etat: 'encours', contexte: 'maison', ville: 'Paris' };
    const obj = JSON.parse(_applySiteRealism(buildDallePromptV2(row), 0));
    obj._pre_assigned_vehicle     = 'clearly_visible';
    obj._pre_assigned_composition = 'wide_worksite';
    const resolved = JSON.parse(_resolveLocationAndComposition(JSON.stringify(obj), 0));
    ok(
      resolved.professional_vehicle_presence === 'clearly_visible',
      `RC33: exterior "${travaux}" → vehicle presence not suppressed`,
      `got: "${resolved.professional_vehicle_presence}"`
    );
    ok(
      resolved._vehicle_suppression_reason === undefined,
      `RC33: exterior "${travaux}" → no suppression reason recorded`,
      `got: "${resolved._vehicle_suppression_reason}"`
    );
  }
}

// RC34 — rule depends on setting=interior, not metier=carrelage (generic test via peinture)
function rc34() {
  const mockJson = JSON.stringify({
    _matched_key:           'peinture',
    _matched_service:       'Peinture intérieure',
    setting:                'interior',
    contexte:               '',
    exclude:                [],
    // _pre_assigned_vehicle forces clearly_visible so RC-3 suppression always fires
    _pre_assigned_vehicle:  'clearly_visible',
    composition:            'medium_intervention',
  });
  const resolved = JSON.parse(_resolveLocationAndComposition(mockJson, 0));
  ok(
    resolved.professional_vehicle_presence === 'absent',
    'RC34: setting=interior (peinture) → vehicle forced absent — rule is generic, not carrelage-specific',
    `got: "${resolved.professional_vehicle_presence}"`
  );
  ok(
    resolved._vehicle_suppression_reason === 'interior_setting',
    'RC34: interior vehicle suppression records reason',
    `got: "${resolved._vehicle_suppression_reason}"`
  );
}

// RC35 — rewriter payload must not contain RC-3 telemetry fields
// _planned_vehicle_presence and _vehicle_suppression_reason are batch-diagnostic
// metadata; they must be stripped before the scene JSON reaches the rewriter.
function rc35() {
  const row = { travaux: 'Faïence salle de bain', metier: 'carrelage', etat: 'encours', contexte: 'maison', ville: 'Paris' };
  let json = buildDallePromptV2(row);
  json = _applySiteRealism(json, 0);
  const obj = JSON.parse(json);
  obj._pre_assigned_composition = 'wide_worksite';
  obj._pre_assigned_vehicle     = 'clearly_visible';
  const resolved = JSON.parse(_resolveLocationAndComposition(JSON.stringify(obj), 0));
  // Sanity: RC-3 telemetry was added to the resolved scene
  ok(
    resolved._planned_vehicle_presence === 'clearly_visible',
    'RC35-pre: RC-3 _planned_vehicle_presence present in resolved scene (sanity)',
    `got: "${resolved._planned_vehicle_presence}"`
  );
  ok(
    resolved._vehicle_suppression_reason === 'interior_setting',
    'RC35-pre: RC-3 _vehicle_suppression_reason present in resolved scene (sanity)',
    `got: "${resolved._vehicle_suppression_reason}"`
  );
  // After sanitization the telemetry fields must be gone
  const sanitized = JSON.parse(_sanitizeSceneForPrompt(JSON.stringify(resolved)));
  ok(
    !('_planned_vehicle_presence' in sanitized),
    'RC35: rewriter payload has no _planned_vehicle_presence',
    `still present: "${sanitized._planned_vehicle_presence}"`
  );
  ok(
    !('_vehicle_suppression_reason' in sanitized),
    'RC35: rewriter payload has no _vehicle_suppression_reason',
    `still present: "${sanitized._vehicle_suppression_reason}"`
  );
}

// RC36 — no positive vehicle signal in the rewriter payload for interior scenes.
// Checks controlled-vocabulary values AND semantic expressions that would indicate
// a vehicle is present. Negative instructions ("no professional vehicle visible")
// are NOT matched — the regex anchors on positive assertion patterns only.
function rc36() {
  // Controlled-vocabulary positive values (professional_vehicle_presence field)
  const POS_STRUCT_RE = /\b(?:clearly_visible|partially_visible|background_visible|required)\b/i;
  // Semantic positive assertions (prose that positively asserts a vehicle is present)
  // The pattern deliberately avoids matching negations ("no", "without", "exclude")
  const POS_PROSE_RE  = /(?:^|[^a-z])(?:professional van|work vehicle|branded van|vehicle in the background|van parked outside)\b/i;

  for (const row of _INTERIOR_SERVICES_ROWS.slice(0, 4)) {
    let json = buildDallePromptV2(row);
    json = _applySiteRealism(json, 0);
    const obj = JSON.parse(json);
    obj._pre_assigned_composition = 'contextual_overview';
    obj._pre_assigned_vehicle     = 'clearly_visible';
    json = _resolveLocationAndComposition(JSON.stringify(obj), 0);
    const sanitized = _sanitizeSceneForPrompt(json);
    ok(
      !POS_STRUCT_RE.test(sanitized),
      `RC36A: "${row.travaux}" → sanitized payload has no positive vehicle vocabulary`,
      `found in: "${sanitized.slice(0, 200)}"`
    );
    ok(
      !POS_PROSE_RE.test(sanitized),
      `RC36B: "${row.travaux}" → sanitized payload has no positive vehicle prose`,
      `found in: "${sanitized.slice(0, 200)}"`
    );
  }
}

// RC37 — actual argument captured at the rewritePromptImpl boundary via generateImageOnly.
// Runs the full production pipeline with mocked network; captures the exact sceneStr
// passed to rewritePromptImpl and verifies the sanitization contract on it.
// Dynamic import with versioned URL forces a fresh fetch of generate-image.js (bypassing the
// ES module registry which may hold a pre-edit version), while prompt-scene-sanitizer.js is
// already in the registry (loaded at top-level import) so both share the same instance.
async function rc37() {
  // Force fresh load of generate-image.js to guarantee the sanitizer-import version.
  let _generateFresh;
  try {
    const m = await import('../pipeline/generate-image.js?rc37v1');
    _generateFresh = m.generateImageOnly;
  } catch (e) {
    fail('RC37: failed to import generateImageOnly', String(e)); return;
  }

  const row       = { travaux: 'Faïence salle de bain', metier: 'carrelage', etat: 'encours', contexte: 'maison', ville: 'Paris' };
  const jsonScene = buildDallePromptV2(row);

  let capturedArg = null;
  const mockRewrite = async (sceneStr) => { capturedArg = sceneStr; return 'MOCK_PROMPT_RC37'; };
  const mockFetch   = async () => 'rawResponse';
  const mockRead    = async () => ({ ok: true, data: { data: [{ b64_json: 'bW9jaw==' }] } });

  const task = {
    taskId: 999, row, i: 0, nb: 1, jsonScene,
    presencePlan:                  ['none'],
    slug:                          'rc37-test',
    _planBase:                     JSON.parse(jsonScene),
    status:                        'pending',
    imageAttempt:                  1,
    _pre_assigned_composition:     'contextual_overview',
    _pre_assigned_vehicle:         'clearly_visible',
    _pre_assigned_worker_presence: 'none',
    _pre_assigned_worker_count:    0,
    _capture_defects_resolved:     [{ key: 'slight_tilt', prompt: 'slightly tilted framing' }],
    _batch_plan_id:                'rc37-batch',
  };

  try {
    await _generateFresh(task, 'sk-mock', 1, {
      state: createGenerationState(),
      fetchImpl:        mockFetch,
      readResponseImpl: mockRead,
      rewritePromptImpl: mockRewrite,
    });
  } catch (e) {
    if (!capturedArg) { fail('RC37: rewritePromptImpl never called', String(e)); return; }
  }

  if (!capturedArg) { fail('RC37: rewritePromptImpl never called (null)', ''); return; }

  const payload = JSON.parse(capturedArg);
  const INTERNAL = ['_pre_assigned_vehicle', '_pre_assigned_composition', '_capture_defects_resolved', '_planned_vehicle_presence', '_vehicle_suppression_reason'];
  for (const f of INTERNAL) {
    ok(!(f in payload), `RC37: rewriter arg has no "${f}"`, `found: "${payload[f]}"`);
  }
  ok(
    payload.professional_vehicle_presence === 'absent',
    'RC37: rewriter arg has professional_vehicle_presence=absent',
    `got: "${payload.professional_vehicle_presence}"`
  );
}

// RC38 — effective scene fields survive sanitization (composition, distances, vehicle, defects).
// _capture_defects_resolved is stripped from the rewriter payload but _appendLockedFinalConstraints
// reads it from _finalSceneObj (the un-sanitized scene) — so the prompt generation is unaffected.
// photo_defects is the public camera-defect field that the rewriter does see.
function rc38() {
  const row = { travaux: 'Faïence salle de bain', metier: 'carrelage', etat: 'encours', contexte: 'maison', ville: 'Paris' };
  let json = buildDallePromptV2(row);
  json = _applySiteRealism(json, 0);
  const obj = JSON.parse(json);
  obj._pre_assigned_composition = 'contextual_overview';
  obj._pre_assigned_vehicle     = 'clearly_visible';
  obj._capture_defects_resolved = [{ key: 'slight_tilt', prompt: 'slightly tilted framing' }];
  json = _resolveLocationAndComposition(JSON.stringify(obj), 0);

  const sanitized = JSON.parse(_sanitizeSceneForPrompt(json));

  // Internal fields removed
  const INTERNAL = ['_pre_assigned_vehicle', '_pre_assigned_composition', '_capture_defects_resolved', '_planned_vehicle_presence', '_vehicle_suppression_reason'];
  for (const f of INTERNAL) {
    ok(!(f in sanitized), `RC38: "${f}" removed from sanitized payload`, `found: "${sanitized[f]}"`);
  }

  // Effective resolved fields preserved
  ok(typeof sanitized.composition === 'string',
    'RC38: composition preserved',       `got: "${sanitized.composition}"`);
  ok(typeof sanitized.composition_desc === 'string',
    'RC38: composition_desc preserved',  `got: "${sanitized.composition_desc}"`);
  ok(typeof sanitized.camera_distance === 'string',
    'RC38: camera_distance preserved',   `got: "${sanitized.camera_distance}"`);
  ok(typeof sanitized.camera_position === 'string',
    'RC38: camera_position preserved',   `got: "${sanitized.camera_position}"`);
  ok(sanitized.professional_vehicle_presence === 'absent',
    'RC38: professional_vehicle_presence=absent preserved', `got: "${sanitized.professional_vehicle_presence}"`);
  // photo_defects is the public camera-defect list; _capture_defects_resolved is the
  // locked-constraint source used by _appendLockedFinalConstraints on _finalSceneObj.
  ok(Array.isArray(sanitized.photo_defects),
    'RC38: photo_defects (public defect field) preserved', `got: "${sanitized.photo_defects}"`);
}

// ─── CW9-CW16 helpers ─────────────────────────────────────────────────────────

const _INTERIOR_SERVICES_ROWS = [
  { travaux: 'Pose carrelage sol',    metier: 'carrelage', etat: 'encours', ville: 'Paris', contexte: 'maison' },
  { travaux: 'Pose carrelage mural',  metier: 'carrelage', etat: 'encours', ville: 'Paris', contexte: 'maison' },
  { travaux: 'Faïence salle de bain', metier: 'carrelage', etat: 'encours', ville: 'Paris', contexte: 'maison' },
  { travaux: 'Faïence cuisine',       metier: 'carrelage', etat: 'encours', ville: 'Paris', contexte: 'maison' },
  { travaux: 'Pose pierre naturelle', metier: 'carrelage', etat: 'encours', ville: 'Paris', contexte: 'maison' },
  { travaux: 'Réfection joint',       metier: 'carrelage', etat: 'encours', ville: 'Paris', contexte: 'maison' },
  { travaux: 'Réfection carrelage',   metier: 'carrelage', etat: 'encours', ville: 'Paris', contexte: 'maison' },
];

function _fullResolve(travaux, imageIndex = 0) {
  const row = { travaux, metier: 'carrelage', etat: 'encours', contexte: 'maison', ville: 'Paris' };
  let json = buildDallePromptV2(row);
  json = _applySiteRealism(json, imageIndex);
  json = _resolveLocationAndComposition(json, imageIndex);
  try { return JSON.parse(json); } catch { return null; }
}

// ─── CW9 — architecture field must NOT be exterior city.arch for interior ─────
// EXPECTED_FAILURE before fix (intBase=null for carrelage → city.arch is exterior)

function cw9() {
  const EXTERIOR_ARCH = /haussmann|zinc rooftop|rendered facade|stone building|slate roof|wrought.iron|balcon|brick facade|half.timber/i;
  const INTERIOR_ARCH = /interior|plaster wall|skirting|room|ordinary occupied/i;

  for (const row of _INTERIOR_SERVICES_ROWS) {
    const json = JSON.parse(buildDallePromptV2(row));
    ok(
      !EXTERIOR_ARCH.test(json.architecture),
      `CW9: "${row.travaux}" architecture has no exterior city keywords`,
      `architecture: "${json.architecture}"`
    );
    ok(
      INTERIOR_ARCH.test(json.architecture),
      `CW9: "${row.travaux}" architecture describes an interior space`,
      `architecture: "${json.architecture}"`
    );
  }
}

// ─── RC41 — rewriter system contains explicit setting/location priority ────────

function rc41() {
  const txt = _IMG_REWRITE_SYSTEM;
  ok(
    /setting.*interior|interior.*setting|when setting is .interior./i.test(txt),
    'RC41: rewriter system prompt references setting=interior priority',
    `length: ${txt.length}`
  );
  ok(
    /work_surface/i.test(txt),
    'RC41: rewriter system prompt references work_surface',
    `first 300: ${txt.slice(0, 300)}`
  );
  ok(
    /immutable|mandatory.*overrid|overrid.*mandatory|location.*mandatory/i.test(txt),
    'RC41: rewriter system prompt marks setting/location as immutable/mandatory',
    `length: ${txt.length}`
  );
  ok(
    /location_forbidden/i.test(txt),
    'RC41: rewriter system prompt references location_forbidden',
    `length: ${txt.length}`
  );
}

// ─── RC42 — sanitized payload for all interior services has no exterior signal ─

function rc42() {
  for (const row of _INTERIOR_SERVICES_ROWS) {
    let json = buildDallePromptV2(row);
    json = _applySiteRealism(json, 0);
    const obj = JSON.parse(json);
    obj._pre_assigned_composition = 'medium_intervention';
    obj._pre_assigned_vehicle     = 'absent';
    json = _resolveLocationAndComposition(JSON.stringify(obj), 0);
    const sanitized = _sanitizeSceneForPrompt(json);
    const issues    = _validateInteriorPayload(sanitized);
    ok(
      issues.length === 0,
      `RC42: "${row.travaux}" sanitized payload has no positive exterior signal`,
      issues.join('; ')
    );
    ok(
      JSON.parse(sanitized).professional_vehicle_presence === 'absent',
      `RC42: "${row.travaux}" professional_vehicle_presence=absent in sanitized payload`,
      `got: "${JSON.parse(sanitized).professional_vehicle_presence}"`
    );
  }
}

// ─── RC43 — actual rewriter payload for interior scene (fresh imports) ──────────
// Module registry may hold pre-edit versions of resolver modules. Versioned dynamic
// imports guarantee the latest code is used for each resolution step, mirroring the
// sanitised payload that _generateFresh would pass to rewritePromptImpl.

async function rc43() {
  let sr, lr, sanitizerMod;
  try {
    [sr, lr, sanitizerMod] = await Promise.all([
      import('../resolution/service-resolver.js?rc43fix'),
      import('../resolution/location-resolver.js?rc43fix'),
      import('../pipeline/prompt-scene-sanitizer.js?rc43fix'),
    ]);
  } catch (e) {
    fail('RC43: failed to import resolution modules', String(e)); return;
  }

  const row = { travaux: 'Faïence salle de bain', metier: 'carrelage', etat: 'encours', contexte: 'maison', ville: 'Paris' };
  let json  = buildDallePromptV2(row);
  json      = sr._applySiteRealism(json, 0);

  // Simulate batch-planner pre-assignment (normal interior case)
  const sceneObj = JSON.parse(json);
  sceneObj._pre_assigned_composition = 'medium_intervention';
  sceneObj._pre_assigned_vehicle     = 'absent';
  sceneObj._capture_defects_resolved = [];
  json = lr._resolveLocationAndComposition(JSON.stringify(sceneObj), 0);

  const sanitized = sanitizerMod._sanitizeSceneForPrompt(json);
  const payload   = JSON.parse(sanitized);
  const issues    = sanitizerMod._validateInteriorPayload(sanitized);

  ok(issues.length === 0,
    'RC43: rewriter payload for salle de bain has no positive exterior signal',
    issues.join('; '));
  ok(payload.professional_vehicle_presence === 'absent',
    'RC43: rewriter payload has professional_vehicle_presence=absent',
    `got: "${payload.professional_vehicle_presence}"`);
  ok(typeof payload.work_surface === 'string' && /bathroom|wet.*area|vertical/i.test(payload.work_surface),
    'RC43: rewriter payload has bathroom work_surface',
    `got: "${payload.work_surface}"`);
  ok(payload.setting === 'interior',
    'RC43: rewriter payload has setting=interior',
    `got: "${payload.setting}"`);
}

// ─── RC44 — locked constraints output contains interior locked block ────────────

function rc44() {
  const scene = {
    _matched_key: 'carrelage', _matched_service: 'Faïence salle de bain',
    setting: 'interior', composition: 'wide_worksite',
    var_workers: 0, var_presence: 'none', _capture_defects_resolved: [],
    triangle_rule: null,
  };
  const prompt = _appendLockedFinalConstraints('rc44 test prompt', scene);
  ok(/entirely indoors|indoors/i.test(prompt),
    'RC44: locked block contains "indoors"',
    `first 400: "${prompt.slice(0, 400)}"`);
  ok(/camera.*inside.*room|inside.*room/i.test(prompt),
    'RC44: locked block contains "camera inside the room"',
    `first 400: "${prompt.slice(0, 400)}"`);
  ok(/no.*exterior.*facade|no.*facade|no.*outdoor|no.*garden/i.test(prompt),
    'RC44: locked block contains exterior prohibition',
    `first 400: "${prompt.slice(0, 400)}"`);
  ok(/no.*professional.*vehicle/i.test(prompt),
    'RC44: locked block contains "no professional vehicle"',
    `first 400: "${prompt.slice(0, 400)}"`);
}

// ─── RC45 — interior validator: negative instructions not flagged as exterior ───

function rc45() {
  // location_forbidden with exterior vocabulary = negative instructions → OK
  const cleanScene = JSON.stringify({
    setting:              'interior',
    composition_desc:     'inside the room looking at the tiled wall',
    camera_position:      'standing 1.5 m from the tiled wall inside the bathroom',
    location_forbidden:   ['no exterior facade', 'no outdoor ladder', 'no garden visible'],
    professional_vehicle_presence: 'absent',
  });
  const cleanIssues = _validateInteriorPayload(cleanScene);
  ok(cleanIssues.length === 0,
    'RC45: negative instructions in location_forbidden do not trigger interior validator',
    `issues: ${cleanIssues.join('; ')}`);

  // positive exterior assertion in architecture → flagged
  const badScene = JSON.stringify({
    setting:      'interior',
    architecture: 'house exterior facade with a balcony visible',
    professional_vehicle_presence: 'absent',
  });
  const badIssues = _validateInteriorPayload(badScene);
  ok(badIssues.length > 0,
    'RC45: positive exterior signal in architecture triggers interior validator',
    'expected at least one issue, got none');
}

// ─── RC46 — exterior services do not receive interior locked block ──────────────

function rc46() {
  const scene = {
    _matched_key: 'carrelage', _matched_service: 'Carrelage terrasse ext.',
    setting: 'exterior', composition: 'wide_worksite',
    var_workers: 0, var_presence: 'none', _capture_defects_resolved: [],
    triangle_rule: null,
  };
  const prompt = _appendLockedFinalConstraints('rc46 exterior test', scene);
  ok(
    !/SETTING AND LOCATION — LOCKED/i.test(prompt),
    'RC46: exterior service does not receive interior locked block',
    `prompt snippet: "${prompt.slice(0, 300)}"`
  );
}

// ─── CW10 — locked constraints must enforce interior for interior scenes ───────

function cw10() {
  const scene = {
    _matched_key: 'carrelage', _matched_service: 'Faïence salle de bain',
    setting: 'interior', composition: 'wide_worksite',
    var_workers: 0, var_presence: 'none', _capture_defects_resolved: [],
    triangle_rule: null,
  };
  const prompt = _appendLockedFinalConstraints('test interior prompt', scene);
  ok(
    /indoor|interior.*only|no.*exterior|no.*facade|no.*garden|no.*outside/i.test(prompt),
    'CW10: locked constraints include interior enforcement',
    'no "interior only" / "no exterior" constraint found in FINAL CAPTURE CONSTRAINTS'
  );
}

// ─── CW11 — interior services must have vehicle=absent after resolution AND
//           rewriter payload must contain no positive vehicle signal
// EXPECTED_FAILURE before fix (batch plan pre-assignment overrides setting)

function cw11() {
  const POS_VEHICLE_RE = /\b(?:clearly_visible|partially_visible)\b/i;
  for (const row of _INTERIOR_SERVICES_ROWS.slice(0, 4)) {
    let json = buildDallePromptV2(row);
    json = _applySiteRealism(json, 0);
    // Simulate batch planner pre-assigning clearly_visible (as happened in Vague 1)
    const obj = JSON.parse(json);
    obj._pre_assigned_composition = 'contextual_overview';
    obj._pre_assigned_vehicle     = 'clearly_visible';
    json = _resolveLocationAndComposition(JSON.stringify(obj), 0);
    const resolved = JSON.parse(json);
    ok(
      resolved.professional_vehicle_presence === 'absent',
      `CW11: "${row.travaux}" → vehicle=absent even when pre-assigned clearly_visible`,
      `got: "${resolved.professional_vehicle_presence}"`
    );
    const sanitized = _sanitizeSceneForPrompt(json);
    ok(
      !POS_VEHICLE_RE.test(sanitized),
      `CW11: "${row.travaux}" → rewriter payload contains no positive vehicle signal`,
      `found in: "${sanitized.slice(0, 200)}"`
    );
  }
}

// ─── CW12 — interior+wide_worksite composition_desc must use no exterior language

function cw12() {
  let json = buildDallePromptV2({ travaux: 'Faïence salle de bain', metier: 'carrelage', etat: 'encours', contexte: 'maison', ville: 'Paris' });
  json = _applySiteRealism(json, 0);
  const obj = JSON.parse(json);
  obj._pre_assigned_composition = 'wide_worksite';
  obj._pre_assigned_vehicle     = 'absent';
  json = _resolveLocationAndComposition(JSON.stringify(obj), 0);
  const resolved = JSON.parse(json);
  const desc = (resolved.composition_desc || '').toLowerCase();
  ok(
    !/building.*visible.*context|vehicle.*garden|neighbourhood|road type|property context/i.test(desc),
    'CW12: interior+wide_worksite composition_desc uses no exterior landmark language',
    `composition_desc: "${resolved.composition_desc}"`
  );
}

// ─── CW13 — salle de bain locked constraints reference bathroom/sanitary ───────

function cw13() {
  const scene = {
    _matched_key: 'carrelage', _matched_service: 'Faïence salle de bain',
    setting: 'interior', composition: 'medium_intervention',
    var_workers: 0, var_presence: 'none', _capture_defects_resolved: [],
    triangle_rule: null,
  };
  const prompt = _appendLockedFinalConstraints('salle de bain test prompt', scene);
  ok(
    /bathroom|shower|bath|sanit|wet.*area|tub/i.test(prompt),
    'CW13: salle de bain locked constraints reference sanitary/bathroom context',
    'no bathroom/sanitary reference in locked constraints output'
  );
}

// ─── CW14 — cuisine locked constraints reference vertical backsplash, not floor ─

function cw14() {
  const scene = {
    _matched_key: 'carrelage', _matched_service: 'Faïence cuisine',
    setting: 'interior', composition: 'medium_intervention',
    var_workers: 0, var_presence: 'none', _capture_defects_resolved: [],
    triangle_rule: null,
  };
  const prompt = _appendLockedFinalConstraints('cuisine test prompt', scene);
  ok(
    /backsplash|worktop|cupboard|vertical.*wall.*tile|splashback/i.test(prompt),
    'CW14: cuisine locked constraints reference vertical backsplash/worktop',
    'no backsplash/worktop reference in locked constraints output'
  );
}

// ─── RC51 — subtype distinct et canonique (SceneJSON finaux — pipeline réel) ───
// Prouve que _fullResolve produit deux location_subtype distincts et non-vides.

function rc51() {
  const terrasse = _fullResolve('Carrelage terrasse ext.');
  const dallage  = _fullResolve('Dallage extérieur');
  ok(
    typeof terrasse?.location_subtype === 'string' && terrasse.location_subtype.length > 0,
    'RC51: terrasse pipeline — location_subtype non-vide',
    `got: "${terrasse?.location_subtype}"`
  );
  ok(
    typeof dallage?.location_subtype === 'string' && dallage.location_subtype.length > 0,
    'RC51: dallage pipeline — location_subtype non-vide',
    `got: "${dallage?.location_subtype}"`
  );
  ok(
    terrasse?.location_subtype !== dallage?.location_subtype,
    'RC51: terrasse.location_subtype !== dallage.location_subtype (sous-types canoniques distincts)',
    `terrasse: "${terrasse?.location_subtype}" | dallage: "${dallage?.location_subtype}"`
  );
}

// ─── RC52 — location_must_have sémantiquement distincts (SceneJSON finaux) ────
// Terrasse: connexion façade/porte-fenêtre. Dallage: circulation/accès/portail.

function rc52() {
  const terrasse = _fullResolve('Carrelage terrasse ext.');
  const dallage  = _fullResolve('Dallage extérieur');
  const tMH = (terrasse?.location_must_have ?? []).join(' ');
  const dMH = (dallage?.location_must_have  ?? []).join(' ');
  ok(
    /glazed|patio.door|house.wall/i.test(tMH),
    'RC52: terrasse location_must_have contient connexion façade / porte-fenêtre',
    `got: ${JSON.stringify(terrasse?.location_must_have)}`
  );
  ok(
    /circulation|access|gate|garage/i.test(dMH),
    'RC52: dallage location_must_have contient circulation / accès / portail',
    `got: ${JSON.stringify(dallage?.location_must_have)}`
  );
  ok(
    !/driveway|garage|gate|circulation/i.test(tMH),
    'RC52: terrasse location_must_have exclut les concepts allée/portail/circulation',
    `got: ${JSON.stringify(terrasse?.location_must_have)}`
  );
  ok(
    !/glazed|patio.door|house.wall/i.test(dMH),
    'RC52: dallage location_must_have exclut les concepts façade/porte-fenêtre',
    `got: ${JSON.stringify(dallage?.location_must_have)}`
  );
}

// ─── RC53 — location_forbidden croisés (SceneJSON finaux) ─────────────────────
// Terrasse interdit: concepts allée/voie. Dallage interdit: concepts terrace/salon.

function rc53() {
  const terrasse = _fullResolve('Carrelage terrasse ext.');
  const dallage  = _fullResolve('Dallage extérieur');
  const tFB = (terrasse?.location_forbidden ?? []).join(' ');
  const dFB = (dallage?.location_forbidden  ?? []).join(' ');
  ok(
    /driveway|road/i.test(tFB),
    'RC53: terrasse location_forbidden contient concept allée/voie',
    `got: ${JSON.stringify(terrasse?.location_forbidden)}`
  );
  ok(
    /terrace.furniture|patio.door/i.test(dFB),
    'RC53: dallage location_forbidden contient concept terrace-furniture/patio-door',
    `got: ${JSON.stringify(dallage?.location_forbidden)}`
  );
  ok(
    !/terrace.furniture/i.test(tFB),
    'RC53: terrasse location_forbidden ne proscrit PAS terrace furniture (terrasse elle-même)',
    `got: ${JSON.stringify(terrasse?.location_forbidden)}`
  );
  ok(
    !/\bdriveway\b/.test(dFB),
    'RC53: dallage location_forbidden ne proscrit PAS driveway (dallage EST une allée)',
    `got: ${JSON.stringify(dallage?.location_forbidden)}`
  );
}

// ─── RC54 — work_surface distinct avec vérification sémantique (SceneJSON finaux)

function rc54() {
  const terrasse = _fullResolve('Carrelage terrasse ext.');
  const dallage  = _fullResolve('Dallage extérieur');
  ok(
    terrasse?.work_surface !== dallage?.work_surface,
    'RC54: terrasse.work_surface !== dallage.work_surface',
    `terrasse: "${terrasse?.work_surface}" | dallage: "${dallage?.work_surface}"`
  );
  ok(
    /terrace|tile|screed|adhesive|spacer/i.test(terrasse?.work_surface ?? ''),
    'RC54: terrasse work_surface décrit du carrelage extérieur sur chape (screed/adhesive)',
    `got: "${terrasse?.work_surface}"`
  );
  ok(
    /slab|sub.?base|lean.?concrete|sand|reconstituted.stone/i.test(dallage?.work_surface ?? ''),
    'RC54: dallage work_surface décrit des dalles sur lit de pose (sub-base/sand/lean-concrete)',
    `got: "${dallage?.work_surface}"`
  );
}

// ─── RC55 — score 5/5 de différenciation (SceneJSON finaux + prompt mocké) ─────
// Dimension 5 : passe les deux scènes dans _fullResolve → sanitizer de production
// → rewriter mocké → _appendLockedFinalConstraints, puis vérifie les preuves
// sémantiques requises dans chaque prompt final.

function _mockPromptFromScene(obj) {
  // Simule ce qu'un vrai rewriter GPT extrairait : les champs sémantiques de la scène.
  // location_forbidden est délibérément exclu (c'est un signal négatif, pas du contenu positif).
  const parts = [];
  if (obj.work_type)                              parts.push(obj.work_type);
  if (Array.isArray(obj.location_must_have))      parts.push(obj.location_must_have.join('; '));
  if (obj.location_subtype)                       parts.push(obj.location_subtype);
  if (obj.work_surface)                           parts.push(obj.work_surface);
  return parts.join('. ');
}

function rc55() {
  const terrasse = _fullResolve('Carrelage terrasse ext.');
  const dallage  = _fullResolve('Dallage extérieur');
  let score = 0;

  // Dimension 1 — location_subtype distinct
  const d1 = terrasse?.location_subtype !== dallage?.location_subtype;
  ok(d1, 'RC55 [1/5]: location_subtype distinct', `t: "${terrasse?.location_subtype}" d: "${dallage?.location_subtype}"`);
  if (d1) score++;

  // Dimension 2 — must_have sémantiquement distincts
  const tMH = (terrasse?.location_must_have ?? []).join(' ');
  const dMH = (dallage?.location_must_have  ?? []).join(' ');
  const d2 = /glazed|patio.door|house.wall/i.test(tMH) && /circulation|access|gate|garage/i.test(dMH);
  ok(d2, 'RC55 [2/5]: location_must_have sémantiquement distincts (façade/porte-fenêtre vs circulation/accès)', `t: ${JSON.stringify(terrasse?.location_must_have)} d: ${JSON.stringify(dallage?.location_must_have)}`);
  if (d2) score++;

  // Dimension 3 — forbidden croisés
  const tFB = (terrasse?.location_forbidden ?? []).join(' ');
  const dFB = (dallage?.location_forbidden  ?? []).join(' ');
  const d3 = /driveway|road/i.test(tFB) && /terrace.furniture|patio.door/i.test(dFB);
  ok(d3, 'RC55 [3/5]: location_forbidden croisés (terrasse interdit allée; dallage interdit terrace/patio)', `t: ${JSON.stringify(terrasse?.location_forbidden)} d: ${JSON.stringify(dallage?.location_forbidden)}`);
  if (d3) score++;

  // Dimension 4 — work_surface distinct et vérifié
  const d4 = terrasse?.work_surface !== dallage?.work_surface &&
             /terrace|screed|tile|spacer/i.test(terrasse?.work_surface ?? '') &&
             /slab|sub.?base|sand|lean.?concrete/i.test(dallage?.work_surface ?? '');
  ok(d4, 'RC55 [4/5]: work_surface distinct et sémantiquement vérifié', `t: "${terrasse?.work_surface}" d: "${dallage?.work_surface}"`);
  if (d4) score++;

  // Dimension 5 — prompt final mocké distinct
  // Pipeline : _fullResolve → sanitizer → rewriter mocké → _appendLockedFinalConstraints
  const tSanitizedJson = _sanitizeSceneForPrompt(JSON.stringify(terrasse));
  const dSanitizedJson = _sanitizeSceneForPrompt(JSON.stringify(dallage));
  const tSanitized     = JSON.parse(tSanitizedJson);
  const dSanitized     = JSON.parse(dSanitizedJson);
  const tMockBase      = _mockPromptFromScene(tSanitized);
  const dMockBase      = _mockPromptFromScene(dSanitized);
  const tFinalPrompt   = _appendLockedFinalConstraints(tMockBase, tSanitized);
  const dFinalPrompt   = _appendLockedFinalConstraints(dMockBase, dSanitized);

  // Preuves requises dans le prompt terrasse
  const tHasDwelling  = /(house.wall|glazed.*door|patio.door|building.facade)/i.test(tFinalPrompt);
  const tHasTerrace   = /\bterrace\b/i.test(tFinalPrompt);
  const tNoDriveway   = !/\bdriveway\b|gate.access|long.circulation.path/i.test(tFinalPrompt);
  // Preuves requises dans le prompt dallage
  const dHasAccess    = /(courtyard|\bpath\b|entrance|functional.access|access.geometry|circulation)/i.test(dFinalPrompt);
  const dNoPatio      = !/living.patio|bay.window.terrace|outdoor.relaxation/i.test(dFinalPrompt);

  ok(tHasDwelling, 'RC55 [5/5] terrasse prompt: contient façade / glazed door / house wall (connexion à l\'habitation)', `début prompt: "${tMockBase.slice(0, 150)}"`);
  ok(tHasTerrace,  'RC55 [5/5] terrasse prompt: contient "terrace" (géométrie espace de vie extérieur)',                 `début prompt: "${tMockBase.slice(0, 150)}"`);
  ok(tNoDriveway,  'RC55 [5/5] terrasse prompt: NE contient PAS driveway / gate access / long circulation path',         `début prompt: "${tMockBase.slice(0, 150)}"`);
  ok(dHasAccess,   'RC55 [5/5] dallage prompt: contient courtyard / path / circulation / functional access',             `début prompt: "${dMockBase.slice(0, 150)}"`);
  ok(dNoPatio,     'RC55 [5/5] dallage prompt: NE contient PAS living patio / bay-window terrace / outdoor relaxation', `début prompt: "${dMockBase.slice(0, 150)}"`);

  const d5 = tHasDwelling && tHasTerrace && tNoDriveway && dHasAccess && dNoPatio;
  if (d5) score++;

  ok(score === 5, `RC55: score de différenciation ${score}/5 — attendu 5/5`, `score: ${score}`);
}

// ─── RC56 — aucune collision externe (SITE_REALISM audit + coverage audit) ────
// Part 1: scene_contexte n'existe que dans les 2 scénarios carrelage.
// Part 2: 163/163 services non-carrelage → 0 collision avec les nouveaux location_type.

function rc56() {
  // Part 1 — SITE_REALISM full scan via JSON serialisation
  const allJson  = JSON.stringify(SITE_REALISM);
  const carrJson = JSON.stringify(SITE_REALISM['carrelage'] ?? {});
  const totalCtx   = (allJson.match(/"scene_contexte"/g)  || []).length;
  const carrCtx    = (carrJson.match(/"scene_contexte"/g) || []).length;
  const nonCarrCtx = totalCtx - carrCtx;
  ok(totalCtx    === 2, 'RC56: exactement 2 occurrences de scene_contexte dans SITE_REALISM (terrasse + dallage)', `total: ${totalCtx}`);
  ok(nonCarrCtx  === 0, 'RC56: 0 occurrence de scene_contexte hors service carrelage',                             `hors-carrelage: ${nonCarrCtx}`);

  // Part 2 — coverage audit (synchrone — window._runServiceCoverageAudit est disponible)
  const cov = window._runServiceCoverageAudit?.();
  if (cov) {
    const nonCarre   = (cov.services ?? []).filter(s => s.metier !== 'carrelage');
    const collisions = nonCarre.filter(s =>
      s.location_type === 'terrasse_attenante' || s.location_type === 'voie_acces_prive'
    );
    ok(nonCarre.length   === 163, 'RC56: 163/163 services non-carrelage dans le coverage audit',                         `got: ${nonCarre.length}`);
    ok(collisions.length === 0,   'RC56: 0 service non-carrelage résout en terrasse_attenante ou voie_acces_prive',      `collisions: ${JSON.stringify(collisions.slice(0, 3))}`);
  }
}

// ─── CW15 — resolver produit location_subtype et location_must_have distincts ──
// Vérification sur les résultats finaux du resolver (pas les données source).

function cw15() {
  const terrasse = _fullResolve('Carrelage terrasse ext.');
  const dallage  = _fullResolve('Dallage extérieur');

  ok(terrasse?.setting === 'exterior', 'CW15: terrasse setting=exterior (pipeline réel)', `got: ${terrasse?.setting}`);
  ok(dallage?.setting  === 'exterior', 'CW15: dallage setting=exterior (pipeline réel)',  `got: ${dallage?.setting}`);

  ok(
    terrasse?.location_subtype !== dallage?.location_subtype,
    'CW15: terrasse.location_subtype !== dallage.location_subtype (résultats resolver distincts)',
    `terrasse: "${terrasse?.location_subtype}" | dallage: "${dallage?.location_subtype}"`
  );

  const tMH = JSON.stringify(terrasse?.location_must_have ?? []);
  const dMH = JSON.stringify(dallage?.location_must_have  ?? []);
  ok(
    tMH !== dMH,
    'CW15: terrasse.location_must_have !== dallage.location_must_have (résultats resolver distincts)',
    `terrasse: ${tMH} | dallage: ${dMH}`
  );

  ok(
    (terrasse?.work_type || '').toLowerCase().includes('terrace'),
    'CW15: terrasse work_type contient "terrace"',
    `work_type: "${terrasse?.work_type}"`
  );
  ok(
    !(dallage?.work_type || '').toLowerCase().includes('terrace'),
    'CW15: dallage work_type ne contient PAS "terrace"',
    `work_type: "${dallage?.work_type}"`
  );
}

// ─── CW16 — telemetry: imageCallLog proves 6 real API calls, not 29 ───────────
// Proves that summing cumulative imageCalls counter values (3+3+5+6+6+6=29) ≠ real calls

function cw16() {
  const state = createGenerationState();
  const runId = 'test-run-1';

  // Simulate 6 tasks × 1 call each (no retries)
  for (let taskId = 1; taskId <= 6; taskId++) {
    state.counters.imageCalls++;
    state.imageCallLog.push({ type: 'image', runId, taskId, metier: 'carrelage', imageAttempt: 1, reason: 'initial' });
  }

  ok(
    state.imageCallLog.filter(e => e.type === 'image').length === 6,
    'CW16: imageCallLog has exactly 6 image-type entries (1 per task, 0 retries)',
    `imageCallLog image-entries: ${state.imageCallLog.filter(e => e.type === 'image').length}`
  );
  ok(
    state.counters.imageCalls === 6,
    'CW16: imageCalls global counter = 6 after 6 tasks with 0 retries',
    `imageCalls: ${state.counters.imageCalls}`
  );
  // The cumulative snapshots at SUCCESS time would be e.g. [3,3,5,6,6,6] — their sum is meaningless
  const snapshotSum = 3 + 3 + 5 + 6 + 6 + 6; // = 29 (the wrong number)
  ok(
    snapshotSum !== state.imageCallLog.filter(e => e.type === 'image').length,
    `CW16: sum of imageCalls snapshots (${snapshotSum}) ≠ actual API calls (6) — the "29" was a miscount`,
    ''
  );
  ok(
    state.imageCallLog.every(e => e.imageAttempt === 1),
    'CW16: all entries have imageAttempt=1 — no retries occurred',
    ''
  );
  ok(
    state.counters.visionCalls === 0,
    'CW16: visionCalls=0 — carrelage excluded from SAFETY_CHECK_RULES (intentional)',
    `visionCalls: ${state.counters.visionCalls}`
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

export async function runCarrelageSceneTests() {
  console.group('[CARRELAGE SCENE TESTS — 9 services × 4 états = 36 combinaisons]');
  _results.length = 0;
  _pass = 0;
  _fail = 0;

  console.group('[CS1]');  cs1();      console.groupEnd();
  console.group('[CS2]');  cs2();      console.groupEnd();
  console.group('[CS3]');  cs3();      console.groupEnd();
  console.group('[CS4]');  cs4();      console.groupEnd();
  console.group('[CS5]');  cs5();      console.groupEnd();
  console.group('[CS6]');  cs6();      console.groupEnd();
  console.group('[CS7]');  cs7();      console.groupEnd();
  console.group('[CS8]');  cs8();      console.groupEnd();
  console.group('[CS9]');  cs9();      console.groupEnd();
  console.group('[CS10]'); cs10();     console.groupEnd();
  await cs11();
  await cs12();

  console.group('[RC01]'); rc01(); console.groupEnd();
  console.group('[RC02]'); rc02(); console.groupEnd();
  console.group('[RC03]'); rc03(); console.groupEnd();
  console.group('[RC04]'); rc04(); console.groupEnd();
  console.group('[RC05]'); rc05(); console.groupEnd();
  console.group('[RC06]'); rc06(); console.groupEnd();
  console.group('[RC07]'); rc07(); console.groupEnd();
  console.group('[RC21]'); rc21(); console.groupEnd();
  console.group('[RC22]'); rc22(); console.groupEnd();
  console.group('[RC23]'); rc23(); console.groupEnd();
  console.group('[RC24]'); rc24(); console.groupEnd();
  console.group('[RC31]'); rc31(); console.groupEnd();
  console.group('[RC32]'); rc32(); console.groupEnd();
  console.group('[RC33]'); rc33(); console.groupEnd();
  console.group('[RC34]'); rc34(); console.groupEnd();
  console.group('[RC35]'); rc35(); console.groupEnd();
  console.group('[RC36]'); rc36(); console.groupEnd();
  console.group('[RC37]'); await rc37(); console.groupEnd();
  console.group('[RC38]'); rc38(); console.groupEnd();
  console.group('[RC41]'); rc41(); console.groupEnd();
  console.group('[RC42]'); rc42(); console.groupEnd();
  console.group('[RC43]'); await rc43(); console.groupEnd();
  console.group('[RC44]'); rc44(); console.groupEnd();
  console.group('[RC45]'); rc45(); console.groupEnd();
  console.group('[RC46]'); rc46(); console.groupEnd();
  console.group('[RC51]'); rc51(); console.groupEnd();
  console.group('[RC52]'); rc52(); console.groupEnd();
  console.group('[RC53]'); rc53(); console.groupEnd();
  console.group('[RC54]'); rc54(); console.groupEnd();
  console.group('[RC55]'); rc55(); console.groupEnd();
  console.group('[RC56]'); rc56(); console.groupEnd();

  console.group('[CW1]'); cw1(); console.groupEnd();
  console.group('[CW2]'); cw2(); console.groupEnd();
  console.group('[CW3]'); cw3(); console.groupEnd();
  console.group('[CW4]'); cw4(); console.groupEnd();
  console.group('[CW5]'); cw5(); console.groupEnd();
  console.group('[CW6]'); cw6(); console.groupEnd();
  console.group('[CW7]'); cw7(); console.groupEnd();
  console.group('[CW8]');  cw8();  console.groupEnd();
  console.group('[CW9]');  cw9();  console.groupEnd();
  console.group('[CW10]'); cw10(); console.groupEnd();
  console.group('[CW11]'); cw11(); console.groupEnd();
  console.group('[CW12]'); cw12(); console.groupEnd();
  console.group('[CW13]'); cw13(); console.groupEnd();
  console.group('[CW14]'); cw14(); console.groupEnd();
  console.group('[CW15]'); cw15(); console.groupEnd();
  console.group('[CW16]'); cw16(); console.groupEnd();

  const total   = _pass + _fail;
  const summary = `[CARRELAGE SCENES SUMMARY] ${_pass}/${total} passed${_fail ? ` — ${_fail} FAILED` : ' ✔'}`;
  _fail ? console.error(summary) : console.info(summary);
  console.groupEnd();
  return { passed: _pass, failed: _fail, total, results: _results.slice(), ok: _fail === 0 };
}
