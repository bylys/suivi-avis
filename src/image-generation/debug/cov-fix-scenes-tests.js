/**
 * debug/cov-fix-scenes-tests.js — COV-FIX1 to COV-FIX10
 * Targeted corrections for four couverture scene defects observed in micro-test.
 * Chargé uniquement en mode ?imageGenTests=1. Aucun appel API réel.
 *
 * Services tested: Charpente (toiture), Remplacement tuiles (toiture),
 *                  Réparation fuite toiture (etancheite), Réparation toiture (toiture)
 */

import { WORK_SCENES, SITE_REALISM } from '../services/index.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const _results = [];
let _pass = 0, _fail = 0;

function pass(label)         { _results.push({ status: 'PASS',               label }); _pass++; }
function fail(label, detail) { _results.push({ status: 'UNEXPECTED_FAILURE', label, detail }); _fail++; console.error(`  ✘ ${label}${detail ? ' — ' + detail : ''}`); }
function ok(cond, label, detail) { cond ? pass(label) : fail(label, detail); }

function _norm(str) {
  return (str || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ').trim();
}

function _resolveKey(normLabel) {
  let bestKey = null, bestScore = 0;
  for (const [key, scene] of Object.entries(WORK_SCENES)) {
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

/** Collect all scenarios from a SITE_REALISM entry (flat or dispatch). */
function _allScenarios(sr) {
  if (!sr) return [];
  const out = [];
  for (const sc of (sr.scenarios || [])) out.push(sc);
  if (sr._dispatch === 'contexte') {
    for (const [k, sub] of Object.entries(sr)) {
      if (k === '_dispatch') continue;
      if (sub && typeof sub === 'object' && sub.scenarios) {
        for (const sc of sub.scenarios) out.push(sc);
      }
    }
  }
  return out;
}

/** Find first scenario matching normLabel within a SITE_REALISM entry. */
function _matchScenario(normLabel, sr) {
  for (const sc of _allScenarios(sr)) {
    if (!sc._for) continue;
    try { if (new RegExp(sc._for, 'i').test(normLabel)) return sc; } catch {}
  }
  return null;
}

/** All scenarios matching normLabel within a SITE_REALISM entry. */
function _allMatching(normLabel, sr) {
  return _allScenarios(sr).filter(sc => {
    if (!sc._for) return false;
    try { return new RegExp(sc._for, 'i').test(normLabel); } catch { return false; }
  });
}

function _hasText(val, ...terms) {
  const str = JSON.stringify(val || '').toLowerCase();
  return terms.some(t => str.includes(t.toLowerCase()));
}

function _lacksText(val, ...terms) {
  return !_hasText(val, ...terms);
}

// ─── Service fixtures ──────────────────────────────────────────────────────────

const N_CHARPENTE     = _norm('Charpente');
const N_REMPLA_TUILE  = _norm('Remplacement tuiles');
const N_FUITE         = _norm('Réparation fuite toiture');
const N_REPAR_TOIT    = _norm('Réparation toiture');

const K_CHARPENTE    = _resolveKey(N_CHARPENTE);
const K_REMPLA_TUILE = _resolveKey(N_REMPLA_TUILE);
const K_FUITE        = _resolveKey(N_FUITE);
const K_REPAR_TOIT   = _resolveKey(N_REPAR_TOIT);

const SR_TOITURE     = SITE_REALISM['toiture'];
const SR_ETANCHEITE  = SITE_REALISM['etancheite'];

const SC_CHARPENTE    = _matchScenario(N_CHARPENTE,    SR_TOITURE);
const SC_REMPLA1      = _matchScenario(N_REMPLA_TUILE, SR_TOITURE);
const SC_REMPLA_ALL   = _allMatching(N_REMPLA_TUILE,   SR_TOITURE);
const SC_FUITE_ALL    = _allMatching(N_FUITE,          SR_ETANCHEITE);
const SC_REPAR_ALL    = _allMatching(N_REPAR_TOIT,     SR_TOITURE);

// ─── COV-FIX1: charpente camera never on scaffold or roof structure ────────────

function covFix1() {
  ok(K_CHARPENTE === 'toiture',
    'COV-FIX1a: charpente routes to toiture key',
    `got: ${K_CHARPENTE}`);

  ok(SC_CHARPENTE !== null,
    'COV-FIX1b: charpente scenario found',
    'no scenario matched');

  if (SC_CHARPENTE) {
    const cam = (SC_CHARPENTE.scene_camera || '').toLowerCase();
    ok(_lacksText(cam, 'on the rafter', 'on the scaffold', 'scaffold board', 'at the eave level, framing'),
      'COV-FIX1c: charpente camera not on scaffold or rafter surface',
      `camera: ${cam}`);

    ok(_hasText(cam, 'garden', 'driveway', 'jardin', 'allée', 'upstairs', 'window', 'homeowner'),
      'COV-FIX1d: charpente camera from homeowner ground position',
      `camera: ${cam}`);
  }

  // Check all charpente scenarios
  const charScenarios = _allMatching(N_CHARPENTE, SR_TOITURE);
  for (const sc of charScenarios) {
    const cam = (sc.scene_camera || '').toLowerCase();
    ok(_lacksText(cam, 'on the rafter surface', 'at the eave level, framing the bare timber'),
      `COV-FIX1e: charpente scenario camera not on rafter/eave-level close-up (${sc.scene_camera?.slice(0,40)})`,
      `camera: ${cam}`);
  }
}

// ─── COV-FIX2: tile replacement includes one visible missing/broken tile ───────

function covFix2() {
  ok(SC_REMPLA_ALL.length > 0,
    'COV-FIX2a: remplacement tuiles has at least one scenario',
    'no scenarios matched');

  const rempla1 = SC_REMPLA_ALL[0];
  if (rempla1) {
    const body = JSON.stringify(rempla1).toLowerCase();
    ok(_hasText(body, 'crack', 'broken', 'damaged tile', 'missing', 'cracked', 'empty gap', 'broken tile', 'broken face'),
      'COV-FIX2b: first remplacement tuiles scenario references a damaged/missing/broken tile',
      'no crack/broken/missing/gap language found');
  }

  // At least one scenario should mention the empty gap or missing tile explicitly
  const anyGap = SC_REMPLA_ALL.some(sc =>
    _hasText(JSON.stringify(sc), 'empty gap', 'empty course gap', 'cracked', 'broken tile', 'missing tile', 'damaged tile')
  );
  ok(anyGap,
    'COV-FIX2c: at least one remplacement tuiles scenario shows gap/missing/damaged tile',
    'no scenario references damaged/missing tile or gap');
}

// ─── COV-FIX3: tile replacement includes one actively handled replacement tile ─

function covFix3() {
  const anyHeld = SC_REMPLA_ALL.some(sc =>
    _hasText(JSON.stringify(sc),
      'replacement tile', 'guiding the new tile', 'held', 'holding the replacement', 'replacement tile ready',
      'worker 1', 'guiding')
  );
  ok(anyHeld,
    'COV-FIX3a: at least one remplacement tuiles scenario shows Worker 1 actively handling replacement tile',
    'no scenario references actively guided/held replacement tile by Worker 1');

  const installSc = SC_REMPLA_ALL.find(sc =>
    _hasText(JSON.stringify(sc), 'guiding the new', 'sliding', 'into the gap', 'into position')
  );
  ok(installSc !== undefined,
    'COV-FIX3b: a remplacement tuiles scenario describes installation (sliding into gap)',
    'no scenario mentions tile sliding into gap or position');
}

// ─── COV-FIX4: replacement stock at ground level ──────────────────────────────

function covFix4() {
  const anyGroundStock = SC_REMPLA_ALL.some(sc =>
    _hasText(JSON.stringify(sc), 'ground level', 'pallet', 'tarp', 'wall base', 'at the base')
  );
  ok(anyGroundStock,
    'COV-FIX4a: at least one remplacement tuiles scenario places tile stock at ground level (pallet/tarp/wall base)',
    'no ground-level stock reference found');

  const anyExcludes = SC_REMPLA_ALL.some(sc => {
    const ex = JSON.stringify(sc.scene_exclude || []).toLowerCase();
    return ex.includes('tile pile on roof') || ex.includes('tile stock on the ladder') || ex.includes('tile pile on');
  });
  ok(anyExcludes,
    'COV-FIX4b: at least one remplacement tuiles scenario excludes tile pile on roof/scaffold/ladder',
    'no exclusion found for tile pile on roof');
}

// ─── COV-FIX5: leak repair has no loose slate/debris stock on roof ─────────────

function covFix5() {
  ok(K_FUITE === 'etancheite',
    'COV-FIX5a: réparation fuite toiture routes to etancheite key',
    `got: ${K_FUITE}`);

  ok(SC_FUITE_ALL.length > 0,
    'COV-FIX5b: fuite scenarios found in etancheite',
    'no fuite scenario found');

  for (const sc of SC_FUITE_ALL) {
    const debris = (sc.scene_debris || '').toLowerCase();
    ok(_lacksText(debris, 'placed beside the open section', 'beside the repair zone'),
      `COV-FIX5c: fuite debris not described as placed on roof surface (${debris.slice(0,60)})`,
      `debris: ${debris}`);

    const ex = JSON.stringify(sc.scene_exclude || []).toLowerCase();
    ok(ex.includes('tile debris') || ex.includes('debris stacked on the roof'),
      `COV-FIX5d: fuite scenario excludes tile/debris stack on roof surface`,
      `scene_exclude: ${ex.slice(0,100)}`);

    const details = JSON.stringify(sc.chantier_details || []).toLowerCase();
    ok(_hasText(details, 'ground level', 'wall base'),
      `COV-FIX5e: fuite chantier_details places removed tiles at ground level`,
      `details: ${details.slice(0,120)}`);
  }
}

// ─── COV-FIX6: Worker 2 outside falling-object zone ──────────────────────────

function covFix6() {
  // Remplacement tuiles: Worker 2 laterally offset, outside drop zone, at ground level, or at secure anchor
  // (MODERATE_PITCH uses chimney/gable anchor — also a valid safe position outside the work/drop zone)
  for (const sc of SC_REMPLA_ALL) {
    const framing = JSON.stringify(sc.scene_framing || {}).toLowerCase();
    ok(_hasText(framing, 'laterally offset', 'outside the drop zone', 'outside drop zone', 'ground level', 'anchor point', 'secure anchor'),
      `COV-FIX6a: remplacement tuiles Worker 2 outside drop zone (${sc.scene_note?.slice(0,50)})`,
      `framing foreground: ${(sc.scene_framing?.foreground || '').slice(0,80)}`);
  }

  // Fuite toiture: Worker 2 laterally offset
  for (const sc of SC_FUITE_ALL) {
    const framing = JSON.stringify(sc.scene_framing || {}).toLowerCase();
    ok(_hasText(framing, 'laterally offset', 'outside the drop zone', 'outside drop zone'),
      `COV-FIX6b: fuite scenario Worker 2 laterally offset / outside drop zone (${sc.scene_note?.slice(0,50)})`,
      `framing foreground: ${(sc.scene_framing?.foreground || '').slice(0,80)}`);
  }
}

// ─── COV-FIX7: roof repair encours uses secured hooked roof ladder ────────────

function covFix7() {
  ok(K_REPAR_TOIT === 'toiture',
    'COV-FIX7a: réparation toiture routes to toiture key',
    `got: ${K_REPAR_TOIT}`);

  ok(SC_REPAR_ALL.length > 0,
    'COV-FIX7b: réparation toiture has matching scenarios',
    'no scenario matched');

  for (const sc of SC_REPAR_ALL) {
    const body = JSON.stringify(sc).toLowerCase();
    ok(_hasText(body, 'hooked roof ladder', 'roof ladder', 'cat ladder'),
      `COV-FIX7c: réparation toiture scenario requires hooked/cat roof ladder (${sc.scene_note?.slice(0,50)})`,
      `no hooked ladder found in scenario`);
  }
}

// ─── COV-FIX8: roof repair requires two workers ───────────────────────────────

function covFix8() {
  for (const sc of SC_REPAR_ALL) {
    const body = JSON.stringify(sc).toLowerCase();
    ok(_hasText(body, 'two professionals', 'worker 1', 'worker 2'),
      `COV-FIX8a: réparation toiture scenario has two workers (${sc.scene_note?.slice(0,50)})`,
      'no two-worker language found');
  }
}

// ─── COV-FIX9: réparation toiture worker cannot freely stand on steep tiles ───

function covFix9() {
  // MODERATE_PITCH scenario must NOT match "reparation toiture" anymore
  const moderatePitchScenarios = _allScenarios(SR_TOITURE).filter(sc =>
    sc.pitch_class === 'MODERATE_PITCH'
  );

  const moderateMatchesRepar = moderatePitchScenarios.some(sc => {
    if (!sc._for) return false;
    try { return new RegExp(sc._for, 'i').test(N_REPAR_TOIT); } catch { return false; }
  });

  ok(!moderateMatchesRepar,
    'COV-FIX9a: no MODERATE_PITCH scenario matches "reparation toiture" (hooked ladder mandatory for réparation toiture)',
    'a MODERATE_PITCH scenario still matches réparation toiture');

  // STEEP_PITCH scenarios for réparation toiture must prevent free standing on tiles
  for (const sc of SC_REPAR_ALL) {
    const body = JSON.stringify(sc).toLowerCase();
    ok(sc.pitch_class !== 'MODERATE_PITCH',
      `COV-FIX9b: réparation toiture scenario is not MODERATE_PITCH (${sc.scene_note?.slice(0,50)})`,
      `pitch_class: ${sc.pitch_class}`);

    const note = (sc.scene_note || '').toLowerCase();
    ok(_lacksText(note, 'kneeling directly on the dry stable tile', 'standing on the dry stable tile', 'standing freely on tiles'),
      `COV-FIX9c: réparation toiture scenario does not allow free standing on tiles (${note.slice(0,60)})`,
      'found forbidden "freely standing on tiles" language');
  }
}

// ─── COV-FIX10: all four corrected routes retain homeowner camera doctrine ─────

function covFix10() {
  const fixtures = [
    { label: 'Charpente',               sc: SC_CHARPENTE,   norm: N_CHARPENTE },
    { label: 'Remplacement tuiles',     sc: SC_REMPLA1,     norm: N_REMPLA_TUILE },
    { label: 'Réparation fuite toiture',sc: SC_FUITE_ALL[0],norm: N_FUITE },
    { label: 'Réparation toiture',      sc: SC_REPAR_ALL[0],norm: N_REPAR_TOIT },
  ];

  for (const { label, sc } of fixtures) {
    if (!sc) { fail(`COV-FIX10: ${label} scenario not resolved`, 'null'); continue; }
    const cam = (sc.scene_camera || '').toLowerCase();
    ok(_hasText(cam, 'garden', 'driveway', 'window', 'upstairs', 'homeowner', 'jardin', 'allée', 'courtyard', 'terrace'),
      `COV-FIX10a: ${label} camera from homeowner position`,
      `camera: ${cam.slice(0,80)}`);

    ok(_lacksText(cam, 'crouching on the roof', 'on the rafter surface', 'at the eave level, framing the bare timber', 'on the scaffold board'),
      `COV-FIX10b: ${label} camera not on roof/scaffold/rafter`,
      `camera: ${cam.slice(0,80)}`);
  }
}

// ─── Runner ───────────────────────────────────────────────────────────────────

export async function runCovFixScenesTests() {
  console.group('[COV-FIX] Couverture targeted corrections — 10 tests');
  console.info('  toiture WS key:', K_CHARPENTE, K_REMPLA_TUILE, K_REPAR_TOIT);
  console.info('  etancheite WS key:', K_FUITE);
  console.info('  charpente scenarios found:', _allMatching(N_CHARPENTE, SR_TOITURE).length);
  console.info('  rempla-tuiles scenarios found:', SC_REMPLA_ALL.length);
  console.info('  fuite scenarios found:', SC_FUITE_ALL.length);
  console.info('  répar-toiture scenarios found:', SC_REPAR_ALL.length);

  covFix1();
  covFix2();
  covFix3();
  covFix4();
  covFix5();
  covFix6();
  covFix7();
  covFix8();
  covFix9();
  covFix10();

  console.groupEnd();

  const total = _pass + _fail;
  console.info(`[COV-FIX] ${_pass}/${total} passed${_fail ? ` — ${_fail} FAILED` : ''}`);

  return {
    suite:   'COV-FIX',
    pass:    _pass,
    fail:    _fail,
    total,
    results: _results,
  };
}
