/**
 * debug/roof-maintenance-mewp-tests.js — ROOF-MAINT1 to ROOF-MAINT15
 * Tests no-cost pour le cluster Entretien de toiture (Priorité 1).
 * Vérifient l'architecture MEWP state-lock pour démoussage, nettoyage toiture,
 * anti-mousse (4 états), SCAFFOLD disabled, et gouttières MEWP.
 * 0 appel API réel. Chargé uniquement en mode ?imageGenTests=1.
 */

import { WORK_SCENES_ROOF as WORK_SCENES, SITE_REALISM_ROOF as SITE_REALISM } from '../services/roof.js?v=5';
import { WORKER_SCENE_RULES } from '../safety/worker-rules.js?v=3';
import { FORBIDDEN_SAFETY_BY_METIER } from '../safety/safety-rules.js?v=4';

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

// ─── ROOF-MAINT4 — gouttières encours → EXTENSION_LADDER_WITH_STANDOFF state_lock pool_size = 1 ───

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
    ok(sc._access_configuration === 'EXTENSION_LADDER_WITH_STANDOFF',
      `${LABEL}: _access_configuration === EXTENSION_LADDER_WITH_STANDOFF (got ${sc._access_configuration})`);
    ok(sc._access_configuration_source === 'state_lock',
      `${LABEL}: _access_configuration_source === state_lock (got ${sc._access_configuration_source})`);

    const excl = (sc.scene_exclude || []).join(' ').toLowerCase();
    ok(excl.includes('mewp') || excl.includes('scaffold') || excl.includes('nacelle'),
      `${LABEL}: scene_exclude contient interdiction MEWP/scaffold pour cette route échelle`);
    ok(excl.includes('second worker') || excl.includes('artificially added'),
      `${LABEL}: scene_exclude contient interdiction second worker artificially added`);

    const tools = (sc.tools || []).join(' ').toLowerCase();
    const note  = (sc.scene_note || '').toLowerCase();
    ok(tools.includes('standoff') || note.includes('standoff'),
      `${LABEL}: scénario nettoyage encours référence le stabilisateur standoff`);
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

// ─── ROOF-MAINT15 — gouttières state_lock toutes séquences ──────────────────
// Nettoyage/débouchage → EXTENSION_LADDER_WITH_STANDOFF (1 worker)
// Remplacement → MEWP (2 workers)

function roofMaint15() {
  const LABEL = 'ROOF-MAINT15';
  const states = ['debut', 'encours', 'semifinal', 'final'];

  // nettoyage + débouchage → EXTENSION_LADDER_WITH_STANDOFF
  const ladderGroups = [
    { label: 'nettoyage', norm: _norm('nettoyage gouttières') },
    { label: 'debouchage', norm: _norm('débouchage gouttières') },
  ];
  for (const { label, norm } of ladderGroups) {
    for (const state of states) {
      const matches = matchScenarios('nettoyage_gouttieres', norm, state);
      ok(matches.length === 1,
        `${LABEL}: gouttières [${label}] state=${state} → pool_size=1 (got ${matches.length})`);
      if (matches.length > 0) {
        const sc = matches[0];
        ok(sc._access_configuration === 'EXTENSION_LADDER_WITH_STANDOFF',
          `${LABEL}: gouttières [${label}] state=${state} → EXTENSION_LADDER_WITH_STANDOFF (got ${sc._access_configuration})`);
        ok(sc._access_configuration_source === 'state_lock',
          `${LABEL}: gouttières [${label}] state=${state} → state_lock (got ${sc._access_configuration_source})`);
      }
    }
  }

  // remplacement → MEWP (unchanged)
  for (const state of states) {
    const matches = matchScenarios('nettoyage_gouttieres', _norm('remplacement gouttières'), state);
    ok(matches.length === 1,
      `${LABEL}: gouttières [remplacement] state=${state} → pool_size=1 (got ${matches.length})`);
    if (matches.length > 0) {
      const sc = matches[0];
      ok(sc._access_configuration === 'MEWP',
        `${LABEL}: gouttières [remplacement] state=${state} → MEWP (got ${sc._access_configuration})`);
      ok(sc._access_configuration_source === 'state_lock',
        `${LABEL}: gouttières [remplacement] state=${state} → state_lock (got ${sc._access_configuration_source})`);
    }
  }
}

// ─── ROOF-MAINT-G : Gouttières — extension ladder with standoff, 1 worker ─────

function textContainsAny(str, terms) {
  const s = (str || '').toLowerCase();
  return terms.some(t => s.includes(t.toLowerCase()));
}

function roofMaintG1() {
  console.group('ROOF-MAINT-G1 — Nettoyage gouttières encours utilise une échelle avec stabilisateur');
  const sr = SITE_REALISM['nettoyage_gouttieres'];
  const scenarios = (sr?.scenarios || []).filter(s =>
    s._for && /nettoy|entretien|curag|debris|feuill/.test(s._for) && s._state_for === 'encours'
  );
  ok(scenarios.length >= 1, 'ROOF-MAINT-G1-A: au moins 1 scénario nettoyage gouttières encours', `got ${scenarios.length}`);
  for (const sc of scenarios) {
    const tools = (sc.tools || []).join(' ').toLowerCase();
    const note  = (sc.scene_note || '').toLowerCase();
    const hasLadder   = textContainsAny(tools + ' ' + note, ['extension ladder', 'standoff', 'ladder with standoff']);
    const hasStandoff = textContainsAny(tools + ' ' + note, ['standoff']);
    ok(hasLadder,   `ROOF-MAINT-G1-B: scénario nettoyage encours doit référencer une extension ladder`, tools.slice(0, 100));
    ok(hasStandoff, `ROOF-MAINT-G1-C: scénario nettoyage encours doit avoir un stabilisateur (standoff)`, tools.slice(0, 100));
    ok(sc._access_configuration === 'EXTENSION_LADDER_WITH_STANDOFF',
      `ROOF-MAINT-G1-D: _access_configuration doit être EXTENSION_LADDER_WITH_STANDOFF, got: ${sc._access_configuration}`);
  }
  console.groupEnd();
}

function roofMaintG2() {
  console.group('ROOF-MAINT-G2 — Nettoyage gouttières encours exige exactement 1 worker');
  const rules = WORKER_SCENE_RULES.nettoyage_gouttieres;
  ok(rules.min_workers_when_visible === 1,
    `ROOF-MAINT-G2-A: min_workers_when_visible doit être 1, got: ${rules.min_workers_when_visible}`);
  const svcMins = rules.service_worker_minimums || {};
  ok(svcMins.remplacement_gouttieres === 2, `ROOF-MAINT-G2-B: service_worker_minimums.remplacement_gouttieres doit être 2`);
  ok(svcMins.pose_gouttieres === 2, `ROOF-MAINT-G2-C: service_worker_minimums.pose_gouttieres doit être 2`);
  const sr = SITE_REALISM['nettoyage_gouttieres'];
  const scenarios = (sr?.scenarios || []).filter(s =>
    s._for && /nettoy|entretien|curag|debris|feuill|deboucha|bouchon|obstruct/.test(s._for) && s._state_for === 'encours'
  );
  for (const sc of scenarios) {
    const excludes = (sc.scene_exclude || []).join(' ').toLowerCase();
    ok(textContainsAny(excludes, ['second worker', 'artificially added']),
      `ROOF-MAINT-G2-D: scénario "${sc._for}" encours doit interdire second worker artificially added`);
  }
  console.groupEnd();
}

function roofMaintG3() {
  console.group('ROOF-MAINT-G3 — Échelle ne repose jamais sur la gouttière');
  const forbidden = FORBIDDEN_SAFETY_BY_METIER.nettoyage_gouttieres || [];
  ok(
    forbidden.some(f => f.toLowerCase().includes('gutter channel') || f.toLowerCase().includes('gutter') && f.toLowerCase().includes('ladder')),
    'ROOF-MAINT-G3-A: FORBIDDEN_SAFETY_BY_METIER.nettoyage_gouttieres doit interdire échelle contre gouttière'
  );
  const workerForbidden = (WORKER_SCENE_RULES.nettoyage_gouttieres?.forbidden || []).join(' ').toLowerCase();
  ok(textContainsAny(workerForbidden, ['gutter channel', 'gutter trough']),
    'ROOF-MAINT-G3-B: WORKER_SCENE_RULES.nettoyage_gouttieres.forbidden doit interdire échelle dans/contre la gouttière');
  const sr = SITE_REALISM['nettoyage_gouttieres'];
  const scenarios = (sr?.scenarios || []).filter(s => s._for);
  for (const sc of scenarios) {
    const tools = (sc.tools || []).join(' ').toLowerCase();
    const excludes = (sc.scene_exclude || []).join(' ').toLowerCase();
    const combined = tools + ' ' + excludes;
    if (textContainsAny(combined, ['ladder'])) {
      ok(!textContainsAny(tools, ['ladder resting on the gutter', 'ladder against the gutter', 'ladder on the gutter']),
        `ROOF-MAINT-G3-C: scénario "${sc._for}" outils ne doivent pas décrire une échelle reposant sur la gouttière`);
    }
  }
  console.groupEnd();
}

function roofMaintG4() {
  console.group('ROOF-MAINT-G4 — Worker ne monte jamais sur le toit (nettoyage/débouchage)');
  const sr = SITE_REALISM['nettoyage_gouttieres'];
  const scenarios = (sr?.scenarios || []).filter(s =>
    s._for && /nettoy|entretien|curag|debris|feuill|deboucha|bouchon|obstruct/.test(s._for)
  );
  for (const sc of scenarios) {
    const note    = (sc.scene_note || '').toLowerCase();
    const midground = (sc.scene_framing?.midground || '').toLowerCase();
    const excludes  = (sc.scene_exclude || []).join(' ').toLowerCase();
    ok(!textContainsAny(note + ' ' + midground, ['worker on roof', 'standing on the roof', 'on the tiles']),
      `ROOF-MAINT-G4-A: scénario "${sc._for}" ne doit pas décrire worker sur le toit`);
    ok(textContainsAny(excludes, ['worker on roof', 'roof']) || !textContainsAny(note, ['roof']),
      `ROOF-MAINT-G4-B: scénario "${sc._for}" doit exclure worker on roof (ou ne pas le mentionner)`);
  }
  console.groupEnd();
}

function roofMaintG5() {
  console.group('ROOF-MAINT-G5 — Débouchage conserve une action spécifique avec tige/clearing tool');
  const sr = SITE_REALISM['nettoyage_gouttieres'];
  const debouchageScenarios = (sr?.scenarios || []).filter(s =>
    s._for && /deboucha|bouchon|obstruct/.test(s._for) && s._state_for === 'encours'
  );
  ok(debouchageScenarios.length >= 1, 'ROOF-MAINT-G5-A: au moins 1 scénario débouchage encours', `got ${debouchageScenarios.length}`);
  for (const sc of debouchageScenarios) {
    const tools  = (sc.tools || []).join(' ').toLowerCase();
    const note   = (sc.scene_note || '').toLowerCase();
    const combined = tools + ' ' + note;
    ok(textContainsAny(combined, ['rod', 'flexible', 'clearing tool', 'drain', 'junction']),
      `ROOF-MAINT-G5-B: scénario débouchage "${sc._for}" doit référencer une tige, tool flexible, ou action à la jonction`);
    ok(!textContainsAny(combined, ['simple leaf removal', 'removing leaves only', 'leaf removal only']),
      `ROOF-MAINT-G5-C: scénario débouchage "${sc._for}" ne doit pas décrire un simple retrait de feuilles`);
  }
  console.groupEnd();
}

function roofMaintG6() {
  console.group('ROOF-MAINT-G6 — Remplacement et pose gouttières conservent 2 workers');
  const sr = SITE_REALISM['nettoyage_gouttieres'];
  const remplacScenarios = (sr?.scenarios || []).filter(s =>
    s._for && /remplace|pose|install|neuf|nouveau/.test(s._for)
  );
  ok(remplacScenarios.length >= 1, 'ROOF-MAINT-G6-A: au moins 1 scénario remplacement/pose', `got ${remplacScenarios.length}`);
  for (const sc of remplacScenarios) {
    const note    = (sc.scene_note || '').toLowerCase();
    const details = (sc.chantier_details || []).join(' ').toLowerCase();
    ok(textContainsAny(note + ' ' + details, ['worker 1', 'worker 2', 'two professionals']),
      `ROOF-MAINT-G6-B: scénario remplacement/pose "${sc._for}" doit décrire 2 workers`);
  }
  const svcMins = WORKER_SCENE_RULES.nettoyage_gouttieres?.service_worker_minimums || {};
  ok(svcMins.remplacement_gouttieres === 2, 'ROOF-MAINT-G6-C: service_worker_minimums.remplacement_gouttieres === 2');
  ok(svcMins.pose_gouttieres === 2, 'ROOF-MAINT-G6-D: service_worker_minimums.pose_gouttieres === 2');
  console.groupEnd();
}

function roofMaintG7() {
  console.group('ROOF-MAINT-G7 — Aucune nacelle (MEWP) sur nettoyage/entretien/débouchage ordinaires');
  const sr = SITE_REALISM['nettoyage_gouttieres'];
  const noMewpScenarios = (sr?.scenarios || []).filter(s =>
    s._for && /nettoy|entretien|curag|debris|feuill|deboucha|bouchon|obstruct/.test(s._for)
  );
  for (const sc of noMewpScenarios) {
    ok(sc._access_configuration !== 'MEWP',
      `ROOF-MAINT-G7-A: scénario "${sc._for}" (state:${sc._state_for||'none'}) _access_configuration ne doit pas être MEWP`);
    const tools = (sc.tools || []).join(' ').toLowerCase();
    const note  = (sc.scene_note || '').toLowerCase();
    ok(!textContainsAny(tools + ' ' + note, ['mewp boom', 'mewp basket', 'mewp wheeled', 'mewp with extending', 'nacelle']),
      `ROOF-MAINT-G7-B: scénario nettoyage/débouchage "${sc._for}" ne doit pas décrire une nacelle MEWP`);
  }
  // Remplacement/pose may still use MEWP
  const remplacScenarios = (sr?.scenarios || []).filter(s =>
    s._for && /remplace|pose|install|neuf|nouveau/.test(s._for)
  );
  ok(remplacScenarios.some(s => s._access_configuration === 'MEWP'),
    'ROOF-MAINT-G7-C: au moins 1 scénario remplacement/pose doit conserver MEWP comme access_configuration');
  console.groupEnd();
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
  roofMaintG1();
  roofMaintG2();
  roofMaintG3();
  roofMaintG4();
  roofMaintG5();
  roofMaintG6();
  roofMaintG7();

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
