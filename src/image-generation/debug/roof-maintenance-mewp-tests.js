/**
 * debug/roof-maintenance-mewp-tests.js — ROOF-MAINT1 to ROOF-MAINT15
 * Tests no-cost pour le cluster Entretien de toiture (Priorité 1).
 * Vérifient l'architecture MEWP state-lock pour démoussage, nettoyage toiture,
 * anti-mousse (4 états), SCAFFOLD disabled, et gouttières MEWP.
 * 0 appel API réel. Chargé uniquement en mode ?imageGenTests=1.
 */

import { WORK_SCENES, SITE_REALISM } from '../services/index.js?v=2';

// ─── Harness ──────────────────────────────────────────────────────────────────

const _results = [];
let _pass = 0, _fail = 0;

function pass(label)         { _results.push({ status: 'PASS', label }); _pass++; }
function fail(label, detail) { _results.push({ status: 'FAIL', label, detail }); _fail++; console.error(`  ✘ ${label}${detail ? ' — ' + detail : ''}`); }
function ok(cond, label, detail) { cond ? pass(label) : fail(label, detail); }

function _norm(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Collect all active scenarios for a given SITE_REALISM key.
 * Respects _disabled: true — disabled scenarios are excluded.
 */
function getActiveScenarios(srKey) {
  const sr = SITE_REALISM[srKey];
  if (!sr) return [];
  return (sr.scenarios || []).filter(sc => !sc._disabled);
}

/**
 * Collect scenarios matching a _for regex AND (optionally) a _state_for value.
 * Only considers active (non-disabled) scenarios.
 */
function matchScenarios(srKey, normLabel, stateFor = null) {
  return getActiveScenarios(srKey).filter(sc => {
    if (!sc._for) return false;
    try { if (!new RegExp(sc._for, 'i').test(normLabel)) return false; } catch { return false; }
    if (stateFor !== null && sc._state_for !== stateFor) return false;
    return true;
  });
}

// ─── ROOF-MAINT1 — démoussage encours → MEWP state_lock pool_size = 1 ─────────

function roofMaint1() {
  const LABEL = 'ROOF-MAINT1';
  const norm = _norm('demoussage toiture');
  const matches = matchScenarios('nettoyage_toiture', norm, 'encours');

  ok(matches.length === 1,
    `${LABEL}: pool_size encours = 1 (got ${matches.length})`,
    `scenarios: ${JSON.stringify(matches.map(s => ({ _for: s._for, _state_for: s._state_for, access: s._access_configuration })))}`
  );

  if (matches.length > 0) {
    const sc = matches[0];
    ok(sc._access_configuration === 'MEWP',
      `${LABEL}: _access_configuration === MEWP (got ${sc._access_configuration})`);
    ok(sc._access_configuration_source === 'state_lock',
      `${LABEL}: _access_configuration_source === state_lock (got ${sc._access_configuration_source})`);

    const excl = (sc.scene_exclude || []).join(' ').toLowerCase();
    ok(excl.includes('hooked roof ladder') || excl.includes('primary working platform'),
      `${LABEL}: scene_exclude contient interdiction hooked roof ladder comme poste de travail`);
    ok(excl.includes('no worker on roof tiles') || excl.includes('worker on roof tiles'),
      `${LABEL}: scene_exclude contient interdiction worker on roof tiles`);
  }
}

// ─── ROOF-MAINT2 — nettoyage toiture encours → MEWP state_lock pool_size = 1 ──

function roofMaint2() {
  const LABEL = 'ROOF-MAINT2';
  const norm = _norm('nettoyage toiture');
  const matches = matchScenarios('nettoyage_toiture', norm, 'encours');

  ok(matches.length === 1,
    `${LABEL}: pool_size encours = 1 (got ${matches.length})`,
    `scenarios: ${JSON.stringify(matches.map(s => ({ _for: s._for, _state_for: s._state_for, access: s._access_configuration })))}`
  );

  if (matches.length > 0) {
    const sc = matches[0];
    ok(sc._access_configuration === 'MEWP',
      `${LABEL}: _access_configuration === MEWP (got ${sc._access_configuration})`);
    ok(sc._access_configuration_source === 'state_lock',
      `${LABEL}: _access_configuration_source === state_lock (got ${sc._access_configuration_source})`);
  }
}

// ─── ROOF-MAINT3 — anti-mousse encours → MEWP state_lock pool_size = 1 ─────────

function roofMaint3() {
  const LABEL = 'ROOF-MAINT3';
  const norm = _norm('traitement anti-mousse toiture');
  const matches = matchScenarios('nettoyage_toiture', norm, 'encours');

  ok(matches.length === 1,
    `${LABEL}: pool_size encours anti-mousse = 1 (got ${matches.length})`,
    `scenarios: ${JSON.stringify(matches.map(s => ({ _for: s._for, _state_for: s._state_for, access: s._access_configuration, disabled: s._disabled })))}`
  );

  if (matches.length > 0) {
    const sc = matches[0];
    ok(sc._access_configuration === 'MEWP',
      `${LABEL}: _access_configuration === MEWP (got ${sc._access_configuration})`);
    ok(sc._access_configuration_source === 'state_lock',
      `${LABEL}: _access_configuration_source === state_lock (got ${sc._access_configuration_source})`);
  }

  // SCAFFOLD scenario must NOT appear in active pool for encours
  const allActive = getActiveScenarios('nettoyage_toiture');
  const scaffoldEncours = allActive.filter(sc => {
    if (!sc._for) return false;
    try { return new RegExp(sc._for, 'i').test(norm) && sc._access_configuration === 'SCAFFOLD' && sc._state_for === 'encours'; } catch { return false; }
  });
  ok(scaffoldEncours.length === 0,
    `${LABEL}: aucun scénario SCAFFOLD actif dans le pool encours anti-mousse (got ${scaffoldEncours.length})`);

  // Also confirm SCAFFOLD scenario is marked _disabled in the raw scenarios array
  const sr = SITE_REALISM['nettoyage_toiture'];
  const scaffoldRaw = (sr?.scenarios || []).filter(sc =>
    sc._access_configuration === 'SCAFFOLD' && sc._for && /anti.mousse/i.test(sc._for)
  );
  if (scaffoldRaw.length > 0) {
    ok(scaffoldRaw.every(sc => sc._disabled === true),
      `${LABEL}: scénario SCAFFOLD anti-mousse est marqué _disabled: true`);
  } else {
    pass(`${LABEL}: aucun scénario SCAFFOLD anti-mousse (variant supprimé ou jamais créé)`);
  }
}

// ─── ROOF-MAINT4 — gouttières encours → MEWP state_lock pool_size = 1 ───────

function roofMaint4() {
  const LABEL = 'ROOF-MAINT4';
  const norm = _norm('nettoyage gouttières');
  const matches = matchScenarios('nettoyage_gouttieres', norm, 'encours');

  ok(matches.length === 1,
    `${LABEL}: pool_size encours gouttières = 1 (got ${matches.length})`,
    `scenarios: ${JSON.stringify(matches.map(s => ({ _for: s._for, _state_for: s._state_for, access: s._access_configuration })))}`
  );

  if (matches.length > 0) {
    const sc = matches[0];
    ok(sc._access_configuration === 'MEWP',
      `${LABEL}: _access_configuration === MEWP (got ${sc._access_configuration})`);
    ok(sc._access_configuration_source === 'state_lock',
      `${LABEL}: _access_configuration_source === state_lock (got ${sc._access_configuration_source})`);

    const excl = (sc.scene_exclude || []).join(' ').toLowerCase();
    ok(excl.includes('ladder') && (excl.includes('primary work platform') || excl.includes('primary working platform') || excl.includes('this mewp route')),
      `${LABEL}: scene_exclude contient interdiction ladder comme poste de travail principal`);
    ok(excl.includes('single worker') || excl.includes('alone'),
      `${LABEL}: scene_exclude contient interdiction worker seul`);

    const fg = (sc.scene_framing?.foreground || '').toLowerCase();
    ok(!fg.includes('directly under the mewp basket') || fg.includes('not directly'),
      `${LABEL}: Worker 2 n'est pas directement sous la nacelle`);
  }
}

// ─── ROOF-MAINT5 — aucun worker directement sur toiture moussue ──────────────

function roofMaint5() {
  const LABEL = 'ROOF-MAINT5';
  const norm = _norm('demoussage toiture');
  const matches = matchScenarios('nettoyage_toiture', norm, 'encours');

  ok(matches.length === 1, `${LABEL}: scénario encours démoussage présent`);

  if (matches.length > 0) {
    const sc = matches[0];
    const excl = (sc.scene_exclude || []).join(' ').toLowerCase();
    ok(excl.includes('worker on roof tiles'),
      `${LABEL}: scene_exclude contient "no worker on roof tiles"`);
    ok(excl.includes('mossy') || excl.includes('wet tiles'),
      `${LABEL}: scene_exclude contient interdiction mossy/wet tiles`);
    ok(excl.includes('hooked roof ladder') || excl.includes('primary working platform'),
      `${LABEL}: scene_exclude contient interdiction hooked roof ladder comme poste`);

    const sceneNote = (sc.scene_note || '').toLowerCase();
    ok(!sceneNote.includes('standing on') || sceneNote.includes('inside the basket'),
      `${LABEL}: scene_note ne décrit pas de worker debout sur les tuiles`);
  }
}

// ─── ROOF-MAINT6 — debut autorise deux workers au sol ────────────────────────

function roofMaint6() {
  const LABEL = 'ROOF-MAINT6';
  const norm = _norm('demoussage toiture');
  const matches = matchScenarios('nettoyage_toiture', norm, 'debut');

  ok(matches.length > 0, `${LABEL}: scénario _state_for='debut' présent pour démoussage`);

  if (matches.length > 0) {
    const sc = matches[0];
    const framing = JSON.stringify(sc.scene_framing || {}).toLowerCase();
    const note    = (sc.scene_note || '').toLowerCase();
    const desc    = (sc.description || '').toLowerCase();
    const all     = [framing, note, desc].join(' ');

    ok(!all.includes('on secured hooked roof ladder') || all.includes('not yet'),
      `${LABEL}: scénario debut ne montre pas worker sur hooked roof ladder`);
    ok(all.includes('ground level') || all.includes('at ground') || all.includes('au sol'),
      `${LABEL}: scénario debut mentionne workers au sol`);
  }

  const ws = WORK_SCENES['nettoyage_toiture'];
  const debutMid = (ws?.states?.debut?.framing?.midground || '').toLowerCase();
  ok(!debutMid.includes('on secured hooked roof ladder'),
    `${LABEL}: WORK_SCENES.nettoyage_toiture.states.debut.midground ne mentionne pas hooked roof ladder`,
    `got: "${debutMid.slice(0, 120)}..."`);
}

// ─── ROOF-MAINT7 — final autorise deux workers au sol ────────────────────────

function roofMaint7() {
  const LABEL = 'ROOF-MAINT7';
  const norm = _norm('demoussage toiture');
  const matches = matchScenarios('nettoyage_toiture', norm, 'final');

  ok(matches.length > 0, `${LABEL}: scénario _state_for='final' présent pour démoussage`);

  if (matches.length > 0) {
    const sc = matches[0];
    const framing = JSON.stringify(sc.scene_framing || {}).toLowerCase();
    const note    = (sc.scene_note || '').toLowerCase();
    const all     = [framing, note].join(' ');

    ok(!all.includes('on the hooked roof ladder') || all.includes('not elevated'),
      `${LABEL}: scénario final ne montre pas worker sur hooked roof ladder`);
    ok(all.includes('ground level') || all.includes('at ground'),
      `${LABEL}: scénario final mentionne workers au sol`);
  }

  const ws = WORK_SCENES['nettoyage_toiture'];
  const finalMid = (ws?.states?.final?.framing?.midground || '').toLowerCase();
  ok(!finalMid.includes('worker 1 on the hooked roof ladder'),
    `${LABEL}: WORK_SCENES.nettoyage_toiture.states.final.midground ne mentionne pas Worker 1 on the hooked roof ladder`,
    `got: "${finalMid.slice(0, 120)}..."`);
}

// ─── ROOF-MAINT8 — encours interdit inspection-only au sol ───────────────────

function roofMaint8() {
  const LABEL = 'ROOF-MAINT8';
  const norm = _norm('demoussage toiture');
  const matches = matchScenarios('nettoyage_toiture', norm, 'encours');

  ok(matches.length === 1, `${LABEL}: scénario encours présent`);

  if (matches.length > 0) {
    const sc = matches[0];
    const framing = JSON.stringify(sc.scene_framing || {}).toLowerCase();
    const note    = (sc.scene_note || '').toLowerCase();
    const all     = [framing, note].join(' ');

    ok(all.includes('mewp') || all.includes('boom extended') || all.includes('inside the basket'),
      `${LABEL}: scénario encours montre accès élevé MEWP (pas inspection au sol uniquement)`);
    ok(!all.includes('both workers at ground level') && !all.includes('both at ground level'),
      `${LABEL}: scénario encours n'est pas inspection-only au sol`);
  }

  const ws = WORK_SCENES['nettoyage_toiture'];
  const encoursMid = (ws?.states?.encours?.framing?.midground || '').toLowerCase();
  ok(encoursMid.includes('mewp') || encoursMid.includes('basket') || encoursMid.includes('boom'),
    `${LABEL}: WORK_SCENES.nettoyage_toiture.states.encours.midground mentionne MEWP`,
    `got: "${encoursMid.slice(0, 120)}..."`);
}

// ─── ROOF-MAINT9 — Worker 2 hors zone de chute ───────────────────────────────

function roofMaint9() {
  const LABEL = 'ROOF-MAINT9';
  const norm = _norm('demoussage toiture');
  const matches = matchScenarios('nettoyage_toiture', norm, 'encours');

  ok(matches.length === 1, `${LABEL}: scénario encours présent`);

  if (matches.length > 0) {
    const sc = matches[0];
    const excl  = (sc.scene_exclude || []).join(' ').toLowerCase();
    const prot  = (sc.protections    || []).join(' ').toLowerCase();
    const fg    = (sc.scene_framing?.foreground || '').toLowerCase();
    const detail= (sc.chantier_details || []).join(' ').toLowerCase();

    ok(prot.includes('outside the falling') || fg.includes('outside the falling') || detail.includes('outside the falling'),
      `${LABEL}: Worker 2 hors zone de chute mentionné (protections ou foreground ou chantier_details)`);
    ok(excl.includes('under the mewp') || excl.includes('under the basket') || excl.includes('directly under'),
      `${LABEL}: scene_exclude contient interdiction worker sous la nacelle`);
  }
}

// ─── ROOF-MAINT10 — hydrofuge validé reste inchangé ─────────────────────────

function roofMaint10() {
  const LABEL = 'ROOF-MAINT10';
  const norm = _norm('traitement hydrofuge toiture');
  const matches = matchScenarios('nettoyage_toiture', norm, 'encours');

  ok(matches.length >= 1,
    `${LABEL}: scénario encours hydrofuge toujours présent (got ${matches.length})`);

  const mewpLocked = matches.filter(sc =>
    sc._access_configuration === 'MEWP' && sc._access_configuration_source === 'state_lock'
  );
  ok(mewpLocked.length === 1,
    `${LABEL}: exactement 1 scénario MEWP state_lock pour hydrofuge encours (got ${mewpLocked.length})`);

  if (mewpLocked.length > 0) {
    const sc = mewpLocked[0];
    ok(sc._state_for === 'encours',
      `${LABEL}: _state_for === 'encours' (got ${sc._state_for})`);
    ok(sc._access_configuration === 'MEWP',
      `${LABEL}: _access_configuration === 'MEWP' (got ${sc._access_configuration})`);
    ok(sc._access_configuration_source === 'state_lock',
      `${LABEL}: _access_configuration_source === 'state_lock' (got ${sc._access_configuration_source})`);
    const note = (sc.scene_note || '').toLowerCase();
    ok(note.includes('mewp') || note.includes('mobile elevated'),
      `${LABEL}: scene_note hydrofuge mentionne toujours MEWP`);
    ok(note.includes('hydrofuge') || note.includes('waterproof'),
      `${LABEL}: scene_note hydrofuge mentionne toujours hydrofuge`);
  }
}

// ─── ROOF-MAINT11 — anti-mousse debut → workers au sol, pool_size = 1 ────────

function roofMaint11() {
  const LABEL = 'ROOF-MAINT11';
  const norm = _norm('traitement anti-mousse toiture');
  const matches = matchScenarios('nettoyage_toiture', norm, 'debut');

  ok(matches.length === 1,
    `${LABEL}: pool_size debut anti-mousse = 1 (got ${matches.length})`,
    `scenarios: ${JSON.stringify(matches.map(s => ({ _for: s._for, _state_for: s._state_for, access: s._access_configuration })))}`
  );

  if (matches.length > 0) {
    const sc = matches[0];
    ok(sc._access_configuration === 'MEWP',
      `${LABEL}: _access_configuration === MEWP (got ${sc._access_configuration})`);
    ok(sc._access_configuration_source === 'state_lock',
      `${LABEL}: _access_configuration_source === state_lock (got ${sc._access_configuration_source})`);

    // debut must show workers at ground level (MEWP not yet deployed)
    const all = [
      JSON.stringify(sc.scene_framing || {}),
      sc.scene_note || '',
    ].join(' ').toLowerCase();
    ok(all.includes('ground level') || all.includes('at ground') || all.includes('parked') || all.includes('lowered'),
      `${LABEL}: scénario debut anti-mousse décrit workers au sol / MEWP non déployée`);
    ok(!all.includes('boom extended') && !all.includes('worker 1 inside the basket') && !all.includes('inside the mewp basket'),
      `${LABEL}: scénario debut anti-mousse ne montre pas MEWP déployée avec Worker 1 en nacelle`);
  }
}

// ─── ROOF-MAINT12 — anti-mousse semifinal → MEWP state_lock pool_size = 1 ────

function roofMaint12() {
  const LABEL = 'ROOF-MAINT12';
  const norm = _norm('traitement anti-mousse toiture');
  const matches = matchScenarios('nettoyage_toiture', norm, 'semifinal');

  ok(matches.length === 1,
    `${LABEL}: pool_size semifinal anti-mousse = 1 (got ${matches.length})`,
    `scenarios: ${JSON.stringify(matches.map(s => ({ _for: s._for, _state_for: s._state_for, access: s._access_configuration })))}`
  );

  if (matches.length > 0) {
    const sc = matches[0];
    ok(sc._access_configuration === 'MEWP',
      `${LABEL}: _access_configuration === MEWP (got ${sc._access_configuration})`);
    ok(sc._access_configuration_source === 'state_lock',
      `${LABEL}: _access_configuration_source === state_lock (got ${sc._access_configuration_source})`);

    const all = [
      JSON.stringify(sc.scene_framing || {}),
      sc.scene_note || '',
    ].join(' ').toLowerCase();
    ok(all.includes('mewp') && (all.includes('basket') || all.includes('boom')),
      `${LABEL}: scénario semifinal anti-mousse montre MEWP déployée`);
  }
}

// ─── ROOF-MAINT13 — anti-mousse final → workers au sol, pool_size = 1 ────────

function roofMaint13() {
  const LABEL = 'ROOF-MAINT13';
  const norm = _norm('traitement anti-mousse toiture');
  const matches = matchScenarios('nettoyage_toiture', norm, 'final');

  ok(matches.length === 1,
    `${LABEL}: pool_size final anti-mousse = 1 (got ${matches.length})`,
    `scenarios: ${JSON.stringify(matches.map(s => ({ _for: s._for, _state_for: s._state_for, access: s._access_configuration })))}`
  );

  if (matches.length > 0) {
    const sc = matches[0];
    ok(sc._access_configuration === 'MEWP',
      `${LABEL}: _access_configuration === MEWP (got ${sc._access_configuration})`);
    ok(sc._access_configuration_source === 'state_lock',
      `${LABEL}: _access_configuration_source === state_lock (got ${sc._access_configuration_source})`);

    const all = [
      JSON.stringify(sc.scene_framing || {}),
      sc.scene_note || '',
    ].join(' ').toLowerCase();
    ok(all.includes('ground level') || all.includes('at ground') || all.includes('parked') || all.includes('lowered'),
      `${LABEL}: scénario final anti-mousse décrit workers au sol / MEWP abaissée`);
    ok(!all.includes('boom extended') && !all.includes('worker 1 inside the basket') && !all.includes('inside the mewp basket'),
      `${LABEL}: scénario final anti-mousse ne montre pas MEWP déployée avec Worker 1 en nacelle`);
  }
}

// ─── ROOF-MAINT14 — SCAFFOLD anti-mousse désactivé (_disabled: true) ─────────

function roofMaint14() {
  const LABEL = 'ROOF-MAINT14';
  const sr = SITE_REALISM['nettoyage_toiture'];
  const scaffoldRaw = (sr?.scenarios || []).filter(sc =>
    sc._access_configuration === 'SCAFFOLD' && sc._for && /anti.mousse/i.test(sc._for)
  );

  ok(scaffoldRaw.length > 0,
    `${LABEL}: au moins 1 scénario SCAFFOLD anti-mousse présent dans le tableau brut (conservation du variant)`);

  if (scaffoldRaw.length > 0) {
    ok(scaffoldRaw.every(sc => sc._disabled === true),
      `${LABEL}: tous les scénarios SCAFFOLD anti-mousse sont marqués _disabled: true`,
      `found: ${JSON.stringify(scaffoldRaw.map(s => ({ _disabled: s._disabled, _state_for: s._state_for })))}`);
  }

  // Confirm SCAFFOLD doesn't appear in active pool at all
  const norm = _norm('traitement anti-mousse toiture');
  const activeScaffold = getActiveScenarios('nettoyage_toiture').filter(sc => {
    if (!sc._for) return false;
    try { return new RegExp(sc._for, 'i').test(norm) && sc._access_configuration === 'SCAFFOLD'; } catch { return false; }
  });
  ok(activeScaffold.length === 0,
    `${LABEL}: aucun scénario SCAFFOLD anti-mousse actif dans le pool (got ${activeScaffold.length})`);
}

// ─── ROOF-MAINT15 — gouttières MEWP state_lock toutes séquences ──────────────

function roofMaint15() {
  const LABEL = 'ROOF-MAINT15';
  const states = ['debut', 'encours', 'semifinal', 'final'];
  const groups = [
    { label: 'nettoyage', norm: _norm('nettoyage gouttières') },
    { label: 'debouchage', norm: _norm('débouchage gouttières') },
    { label: 'remplacement', norm: _norm('remplacement gouttières') },
  ];

  for (const { label, norm } of groups) {
    for (const state of states) {
      const matches = matchScenarios('nettoyage_gouttieres', norm, state);
      ok(matches.length === 1,
        `${LABEL}: gouttières [${label}] state=${state} → pool_size=1 (got ${matches.length})`);
      if (matches.length > 0) {
        const sc = matches[0];
        ok(sc._access_configuration === 'MEWP',
          `${LABEL}: gouttières [${label}] state=${state} → MEWP (got ${sc._access_configuration})`);
        ok(sc._access_configuration_source === 'state_lock',
          `${LABEL}: gouttières [${label}] state=${state} → state_lock (got ${sc._access_configuration_source})`);
      }
    }
  }
}

// ─── Run all ──────────────────────────────────────────────────────────────────

export async function _runRoofMaintenanceMewpTests() {
  console.group('ROOF-MAINT tests — Entretien de toiture (MEWP state-lock)');

  roofMaint1();
  roofMaint2();
  roofMaint3();
  roofMaint4();
  roofMaint5();
  roofMaint6();
  roofMaint7();
  roofMaint8();
  roofMaint9();
  roofMaint10();
  roofMaint11();
  roofMaint12();
  roofMaint13();
  roofMaint14();
  roofMaint15();

  console.log(`\nROOF-MAINT Results: ${_pass} passed, ${_fail} failed`);
  if (_fail === 0) {
    console.log('%c✔ ROOF-MAINT PASS — All maintenance MEWP tests passed', 'color: green; font-weight: bold');
  } else {
    console.error(`✘ ROOF-MAINT FAIL — ${_fail} test(s) failed`);
  }

  console.groupEnd();

  return { pass: _pass, fail: _fail, results: _results, ok: _fail === 0 };
}

if (typeof window !== 'undefined' && window._imageGenTestMode) {
  window._runRoofMaintenanceMewpTests = _runRoofMaintenanceMewpTests;
  console.log('[ROOF-MAINT] Test suite loaded — call window._runRoofMaintenanceMewpTests() to run');
}
