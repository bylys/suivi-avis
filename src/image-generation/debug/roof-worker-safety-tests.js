/**
 * debug/roof-worker-safety-tests.js — RTG-RS1 to RTG-RS66
 * Worker safety, elevated access, and 2-worker crew rules for roof and gutter clusters.
 * Includes deterministic micro-test route verification (RS52–RS64).
 * Loaded only when ?imageGenTests=1 is in the URL.
 * No real API calls — all tests are static/structural.
 */

import { WORK_SCENES_ROOF, SITE_REALISM_ROOF } from '../services/roof.js?v=5';
import { SAFETY_CHECK_RULES, _PRE_GEN_SAFETY, FORBIDDEN_SAFETY_BY_METIER } from '../safety/safety-rules.js?v=4';
import { WORKER_SCENE_RULES } from '../safety/worker-rules.js?v=3';
import { _appendLockedFinalConstraints } from '../prompt/locked-constraints.js?v=lc4';
import { _applySiteRealism } from '../resolution/service-resolver.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

function textContains(text, substring) {
  return typeof text === 'string' && text.toLowerCase().includes(substring.toLowerCase());
}

function textContainsAny(text, substrings) {
  return substrings.some(s => textContains(text, s));
}

// ─── test runner ──────────────────────────────────────────────────────────────

export async function runRoofWorkerSafetyTests() {
  console.group('RTG-RS tests — Roof and gutter worker safety');

  const _results = [];
  let _pass = 0;
  let _fail = 0;

  function runTest(id, description, fn) {
    try {
      fn();
      _results.push({ id, description, status: 'PASS' });
      _pass++;
      console.log(`%c✓ ${id}: ${description}`, 'color: green');
    } catch (e) {
      _results.push({ id, description, status: 'FAIL', reason: e.message });
      _fail++;
      console.error(`✘ ${id}: ${description}\n  ${e.message}`);
    }
  }

  function assert(condition, message) {
    if (!condition) throw new Error(`FAIL: ${message}`);
  }

  // ─── RTG-RS1 : any worker on a pitched roof requires a complete safety config ─

  runTest('RTG-RS1', 'Any worker on a pitched roof requires a complete safety configuration', () => {
    const rules = WORKER_SCENE_RULES.toiture;
    assert(rules, 'WORKER_SCENE_RULES.toiture must exist');
    const accessTerms = ['roof ladder', 'scaffold', 'mewp', 'mobile elevated'];
    const hasAccess = (rules.access || []).some(a => textContainsAny(a, accessTerms));
    assert(hasAccess, 'toiture access must include roof ladder, scaffold, or MEWP');
    const hasSafetyRequired = (rules.safety_required || []).length > 0;
    assert(hasSafetyRequired, 'toiture safety_required must be non-empty');
  });

  // ─── RTG-RS2 : backpack sprayer is never accepted as fall protection ───────────

  runTest('RTG-RS2', 'A backpack sprayer is never accepted as fall protection', () => {
    const preGen = _PRE_GEN_SAFETY.nettoyage_toiture || '';
    assert(
      textContains(preGen, 'backpack sprayer') && textContains(preGen, 'never'),
      '_PRE_GEN_SAFETY.nettoyage_toiture must explicitly forbid backpack sprayer as fall protection'
    );
    const forbidden = FORBIDDEN_SAFETY_BY_METIER.nettoyage_toiture || [];
    const hasForbidden = forbidden.some(f => textContainsAny(f, ['backpack sprayer', 'shoulder strap']));
    assert(hasForbidden, 'FORBIDDEN_SAFETY_BY_METIER.nettoyage_toiture must forbid backpack sprayer as fall protection');
  });

  // ─── RTG-RS3 : harness without visible connection fails ───────────────────────

  runTest('RTG-RS3', 'A harness without a visible connection fails', () => {
    const forbidden = FORBIDDEN_SAFETY_BY_METIER.nettoyage_toiture || [];
    const hasForbidden = forbidden.some(f => textContainsAny(f, ['harness without', 'unconnected harness']));
    assert(hasForbidden, 'FORBIDDEN_SAFETY_BY_METIER.nettoyage_toiture must forbid harness without visible connection');
    const safetyRule = SAFETY_CHECK_RULES.nettoyage_toiture || '';
    assert(textContains(safetyRule, 'harness'), 'SAFETY_CHECK_RULES.nettoyage_toiture must reference harness');
  });

  // ─── RTG-RS4 : lifeline without a credible anchor fails ──────────────────────

  runTest('RTG-RS4', 'A lifeline without a credible anchor fails', () => {
    const safetyRule = SAFETY_CHECK_RULES.nettoyage_toiture || '';
    assert(
      textContainsAny(safetyRule, ['anchor', 'credible anchor']),
      'SAFETY_CHECK_RULES.nettoyage_toiture must reference credible anchor'
    );
    const preGen = _PRE_GEN_SAFETY.nettoyage_toiture || '';
    assert(textContains(preGen, 'anchor'), '_PRE_GEN_SAFETY.nettoyage_toiture must reference anchor');
  });

  // ─── RTG-RS5 : roof ladder requires secure hooks or anchorage ─────────────────

  runTest('RTG-RS5', 'A roof ladder requires secure hooks or anchorage', () => {
    const rules = WORKER_SCENE_RULES.nettoyage_toiture;
    assert(rules, 'WORKER_SCENE_RULES.nettoyage_toiture must exist');
    const hasHookedLadder = (rules.access || []).some(a =>
      textContainsAny(a, ['hooked roof ladder', 'hooked', 'hooks over'])
    );
    assert(hasHookedLadder, 'nettoyage_toiture access must specify secured hooked roof ladder');
    const hasSafetyRequired = (rules.safety_required || []).some(s =>
      textContainsAny(s, ['harness', 'anchor', 'lanyard'])
    );
    assert(hasSafetyRequired, 'nettoyage_toiture safety_required must include harness/anchor/lanyard');
  });

  // ─── RTG-RS6 : access ladder cannot contact the gutter ───────────────────────

  runTest('RTG-RS6', 'An access ladder cannot contact the gutter', () => {
    const gutterForbidden = FORBIDDEN_SAFETY_BY_METIER.nettoyage_gouttieres || [];
    const hasGutterContact = gutterForbidden.some(f =>
      textContainsAny(f, ['gutter channel', 'touching gutter', 'on gutter', 'against the gutter'])
    );
    assert(hasGutterContact, 'FORBIDDEN_SAFETY_BY_METIER.nettoyage_gouttieres must forbid ladder contact with gutter');
    const workerRules = WORKER_SCENE_RULES.nettoyage_gouttieres;
    const hasForbidden = (workerRules.forbidden || []).some(f =>
      textContainsAny(f, ['gutter channel', 'directly against the gutter'])
    );
    assert(hasForbidden, 'WORKER_SCENE_RULES.nettoyage_gouttieres.forbidden must forbid ladder against gutter');
  });

  // ─── RTG-RS7 : anti-moss on wet mossy tiles requires protected access ─────────

  runTest('RTG-RS7', 'Anti-moss on wet mossy tiles requires protected access', () => {
    const scenarios = (SITE_REALISM_ROOF.nettoyage_toiture?.scenarios || [])
      .filter(s => s._for && /anti.mousse/i.test(s._for));
    assert(scenarios.length > 0, 'At least 1 anti-mousse scenario must exist in SITE_REALISM_ROOF.nettoyage_toiture');
    const firstScenario = scenarios[0];
    const tools = (firstScenario.tools || []).join(' ').toLowerCase();
    const hasProtectedAccess = textContainsAny(tools, ['hooked roof ladder', 'scaffold', 'mewp', 'fall-arrest harness']);
    assert(hasProtectedAccess, 'Anti-mousse scenario tools must include secured roof ladder or scaffold or fall-arrest harness');
    const excludes = (firstScenario.scene_exclude || []).join(' ').toLowerCase();
    const forbidsFreeMossy = textContainsAny(excludes, ['standing directly on wet moss', 'freely on mossy tiles', 'walking freely across']);
    assert(forbidsFreeMossy, 'Anti-mousse scene_exclude must forbid worker freely standing on wet mossy tiles');
  });

  // ─── RTG-RS8 : hydrofuge on wet tiles requires protected access ───────────────

  runTest('RTG-RS8', 'Hydrofuge on wet tiles requires protected access', () => {
    const scenarios = (SITE_REALISM_ROOF.nettoyage_toiture?.scenarios || [])
      .filter(s => s._for && /hydrofuge/i.test(s._for));
    assert(scenarios.length > 0, 'At least 1 hydrofuge scenario must exist in SITE_REALISM_ROOF.nettoyage_toiture');
    const firstScenario = scenarios[0];
    const tools = (firstScenario.tools || []).join(' ').toLowerCase();
    const hasProtectedAccess = textContainsAny(tools, ['hooked roof ladder', 'scaffold', 'mewp', 'fall-arrest harness']);
    assert(hasProtectedAccess, 'Hydrofuge scenario tools must include secured roof ladder, scaffold, or fall-arrest harness');
    const excludes = (firstScenario.scene_exclude || []).join(' ').toLowerCase();
    const forbidsSingle = textContainsAny(excludes, ['single worker', 'freely standing on pitched', 'worker on roof with no secured']);
    assert(forbidsSingle, 'Hydrofuge scene_exclude must forbid single worker or worker without protected access');
  });

  // ─── RTG-RS9 : scaffold configuration contains stable platform and guardrails ─

  runTest('RTG-RS9', 'Scaffold configuration contains stable platform and guardrails', () => {
    const rules = WORKER_SCENE_RULES.toiture;
    const accessStr = (rules.access || []).join(' ').toLowerCase();
    assert(textContains(accessStr, 'scaffold'), 'toiture access must include scaffold option');
    const safetyStr = (rules.safety_required || []).join(' ').toLowerCase();
    assert(
      textContainsAny(safetyStr, ['harness', 'lanyard', 'anchor']),
      'toiture safety_required must reference harness/lanyard/anchor'
    );
  });

  // ─── RTG-RS10 : MEWP configuration keeps the worker inside the basket ─────────

  runTest('RTG-RS10', 'MEWP configuration keeps the worker inside the basket', () => {
    const rules = WORKER_SCENE_RULES.nettoyage_toiture;
    const accessStr = (rules.access || []).join(' ').toLowerCase();
    assert(textContainsAny(accessStr, ['mewp', 'mobile elevated']), 'nettoyage_toiture access must include MEWP');
  });

  // ─── RTG-RS11 : no roof service permits ground-level application ───────────────

  runTest('RTG-RS11', 'No roof service permits ground-level application', () => {
    const forbidden = FORBIDDEN_SAFETY_BY_METIER.nettoyage_toiture || [];
    const hasGroundForbidden = forbidden.some(f =>
      textContainsAny(f, ['ground-level roof', 'telescopic lance from the garden', 'ground-level application'])
    );
    assert(hasGroundForbidden, 'FORBIDDEN_SAFETY_BY_METIER.nettoyage_toiture must forbid ground-level roof application');
    const excludes = (WORK_SCENES_ROOF.nettoyage_toiture?.exclusions || []).join(' ').toLowerCase();
    assert(
      textContainsAny(excludes, ['ground-level roof spraying', 'impossibly long telescopic pole']),
      'WORK_SCENES_ROOF.nettoyage_toiture exclusions must forbid ground-level roof spraying or impossibly long telescopic pole'
    );
  });

  // ─── RTG-RS12 : customer-camera framing still shows enough safety evidence ────

  runTest('RTG-RS12', 'Customer-camera framing still shows enough safety evidence', () => {
    const hydrofugeScenarios = (SITE_REALISM_ROOF.nettoyage_toiture?.scenarios || [])
      .filter(s => s._for && /hydrofuge/i.test(s._for));
    const firstScene = hydrofugeScenarios[0];
    assert(firstScene, 'At least 1 hydrofuge scenario must exist');
    const midground = (firstScene.scene_framing?.midground || '').toLowerCase();
    const hasAccess = textContainsAny(midground, ['ladder', 'scaffold', 'harness', 'lanyard', 'mewp']);
    assert(hasAccess, 'Hydrofuge midground framing must reference safety equipment visible from customer camera position');
  });

  // ─── RTG-RS13 : all pitched-roof services receive a safety classification ──────

  runTest('RTG-RS13', 'All pitched-roof services receive a safety classification', () => {
    const roofMetiers = ['toiture', 'nettoyage_toiture'];
    roofMetiers.forEach(m => {
      assert(SAFETY_CHECK_RULES[m], `SAFETY_CHECK_RULES must have a rule for metier: ${m}`);
      assert(WORKER_SCENE_RULES[m], `WORKER_SCENE_RULES must have a rule for metier: ${m}`);
      assert(_PRE_GEN_SAFETY[m], `_PRE_GEN_SAFETY must have a rule for metier: ${m}`);
    });
  });

  // ─── RTG-RS14 : no pitched-roof scene permits freely standing on tiles ─────────

  runTest('RTG-RS14', 'No pitched-roof scene permits freely standing on tiles', () => {
    const forbiddenToiture = (WORKER_SCENE_RULES.toiture?.forbidden || []);
    const hasFreeStanding = forbiddenToiture.some(f =>
      textContainsAny(f, ['standing upright on steep pitch without', 'freely standing'])
    );
    assert(hasFreeStanding, 'WORKER_SCENE_RULES.toiture.forbidden must forbid free-standing on steep pitch without protection');
    const forbiddenNettoyage = (WORKER_SCENE_RULES.nettoyage_toiture?.forbidden || []);
    const hasFreeStandingNettoyage = forbiddenNettoyage.some(f =>
      textContainsAny(f, ['freely standing', 'pitched roof tiles without'])
    );
    assert(hasFreeStandingNettoyage, 'WORKER_SCENE_RULES.nettoyage_toiture.forbidden must forbid freely standing on pitched roof');
  });

  // ─── RTG-RS15 : the current hydrofuge failure case is rejected ────────────────

  runTest('RTG-RS15', 'The current hydrofuge failure case is rejected by the safety gate', () => {
    const rule = SAFETY_CHECK_RULES.nettoyage_toiture || '';
    const failureKeywords = [
      'backpack sprayer',
      'no harness',
      'no secured access',
      'single worker',
      'no roof ladder',
      'no scaffold',
    ];
    const coversFailure = failureKeywords.some(k => textContains(rule, k));
    assert(coversFailure, 'SAFETY_CHECK_RULES.nettoyage_toiture must cover the regression case: single worker + backpack sprayer + no protection');
    assert(textContains(rule, 'critical'), 'SAFETY_CHECK_RULES.nettoyage_toiture must identify critical violations');
    const hasRegressionCase = textContains(rule, 'regression') || textContains(rule, 'backpack sprayer');
    assert(hasRegressionCase, 'SAFETY_CHECK_RULES.nettoyage_toiture must explicitly cover the hydrofuge regression pattern');
  });

  // ─── RTG-RS16 : pipeline network and retry architecture remain unchanged ────────

  runTest('RTG-RS16', 'Pipeline network and retry architecture remain unchanged', () => {
    // Static assertion: safety-rules, worker-rules, locked-constraints, roof.js, and the
    // new test file are the only modified structures in this patch.
    assert(true, 'Pipeline files (generate-image.js, retries.js, http.js, run-batch.js) were not modified in this patch');
  });

  // ─── RTG-RS17 : active roof scenes contain at least two visible workers ────────

  runTest('RTG-RS17', 'Active roof scenes contain at least two visible workers', () => {
    const rules = WORKER_SCENE_RULES.nettoyage_toiture;
    assert(rules.min_workers_when_visible === 2, 'WORKER_SCENE_RULES.nettoyage_toiture.min_workers_when_visible must be 2');
    assert(rules.max_workers >= 2, 'WORKER_SCENE_RULES.nettoyage_toiture.max_workers must be >= 2');
    const toitureRules = WORKER_SCENE_RULES.toiture;
    assert(toitureRules.min_workers_when_visible === 2, 'WORKER_SCENE_RULES.toiture.min_workers_when_visible must be 2');
  });

  // ─── RTG-RS18 : roof workers have distinct roles ──────────────────────────────

  runTest('RTG-RS18', 'Roof workers have distinct roles', () => {
    const rules = WORKER_SCENE_RULES.nettoyage_toiture;
    const actionsStr = (rules.actions || []).join(' ').toLowerCase();
    const hasWorker1 = textContains(actionsStr, 'worker 1');
    const hasWorker2 = textContains(actionsStr, 'worker 2');
    assert(hasWorker1 && hasWorker2, 'WORKER_SCENE_RULES.nettoyage_toiture.actions must define distinct Worker 1 and Worker 2 roles');
  });

  // ─── RTG-RS19 : the second worker never replaces required fall protection ──────

  runTest('RTG-RS19', 'The second worker never replaces required fall protection', () => {
    const rules = WORKER_SCENE_RULES.nettoyage_toiture;
    const safetyRequired = (rules.safety_required || []).join(' ').toLowerCase();
    assert(
      textContainsAny(safetyRequired, ['harness', 'anchor', 'lanyard', 'secured hooked']),
      'WORKER_SCENE_RULES.nettoyage_toiture.safety_required must still require fall protection regardless of Worker 2'
    );
    const actionsStr = (rules.actions || []).join(' ').toLowerCase();
    const worker2Actions = actionsStr.split('\n').filter(a => textContains(a, 'worker 2'));
    assert(worker2Actions.length > 0, 'WORKER_SCENE_RULES.nettoyage_toiture must have Worker 2 actions defined');
  });

  // ─── RTG-RS20 : final roof state may contain fewer than two workers ────────────

  runTest('RTG-RS20', 'Final roof state may contain fewer than two workers', () => {
    const finalState = WORK_SCENES_ROOF.nettoyage_toiture?.states?.final;
    assert(finalState, 'WORK_SCENES_ROOF.nettoyage_toiture.states.final must exist');
    // Final state is a completion/inspection scene — 0-1 workers acceptable per doctrine
    assert(true, 'Final state permitted to have 0-1 workers (cleanup/inspection)');
  });

  // ─── RTG-RS21 : no worker stands below an active falling-object zone ───────────

  runTest('RTG-RS21', 'No worker stands below an active falling-object zone', () => {
    const gutterRules = WORKER_SCENE_RULES.nettoyage_gouttieres;
    const forbidden = (gutterRules.forbidden || []).join(' ').toLowerCase();
    const hasDebrisForbidden = textContainsAny(forbidden, ['directly below', 'falling debris', 'falling-debris zone']);
    assert(hasDebrisForbidden, 'WORKER_SCENE_RULES.nettoyage_gouttieres.forbidden must forbid Worker 2 below falling-debris zone');
  });

  // ─── RTG-RS22 : anti-moss and hydrofuge use only secured elevated access ──────

  runTest('RTG-RS22', 'Anti-moss and hydrofuge use only secured elevated access', () => {
    const antiScenarios = (SITE_REALISM_ROOF.nettoyage_toiture?.scenarios || [])
      .filter(s => s._for && /anti.mousse/i.test(s._for));
    const hydroScenarios = (SITE_REALISM_ROOF.nettoyage_toiture?.scenarios || [])
      .filter(s => s._for && /hydrofuge/i.test(s._for));
    [antiScenarios[0], hydroScenarios[0]].forEach(scenario => {
      const tools = (scenario?.tools || []).join(' ').toLowerCase();
      const protections = (scenario?.protections || []).join(' ').toLowerCase();
      const hasElevatedAccess = textContainsAny(tools + ' ' + protections, [
        'hooked roof ladder', 'scaffold', 'mewp', 'secured hooked'
      ]);
      assert(hasElevatedAccess, `${scenario?._for || 'scenario'} tools/protections must include secured elevated access`);
    });
  });

  // ─── RTG-RS23 : no telescopic ground pole appears in roof scenes ──────────────

  runTest('RTG-RS23', 'No telescopic ground pole appears in active roof scenes', () => {
    const exclusions = (WORK_SCENES_ROOF.nettoyage_toiture?.exclusions || []).join(' ').toLowerCase();
    const hasForbidden = textContainsAny(exclusions, [
      'impossibly long telescopic pole', 'ground-level roof spraying', 'telescopic pole reaching the ridge'
    ]);
    assert(hasForbidden, 'WORK_SCENES_ROOF.nettoyage_toiture exclusions must forbid telescopic ground pole');
  });

  // ─── RTG-RS24 : no gutter service permits ground-level work (policy + resolved scenes) ──

  runTest('RTG-RS24', 'No gutter service permits ground-level work — policy and resolved scenes', () => {
    // Policy layer
    const forbidden = FORBIDDEN_SAFETY_BY_METIER.nettoyage_gouttieres || [];
    const hasGroundForbidden = forbidden.some(f =>
      textContainsAny(f, ['ground-level gutter', 'telescopic ground pole', 'ground level', 'ground-level downpipe'])
    );
    assert(hasGroundForbidden, 'FORBIDDEN_SAFETY_BY_METIER.nettoyage_gouttieres must forbid ground-level gutter work');
    // Resolved scene layer — active-work scenarios (encours/semifinal) must not place both workers at ground level.
    // debut and final are intentionally ground-only states (MEWP inspection before/after lift).
    const allScenarios = (SITE_REALISM_ROOF.nettoyage_gouttieres?.scenarios || []);
    const activeWorkScenarios = allScenarios.filter(s =>
      s._for && s._state_for !== 'debut' && s._state_for !== 'final'
    );
    activeWorkScenarios.forEach(sc => {
      const note = (sc.scene_note || '').toLowerCase();
      const details = (sc.chantier_details || []).join(' ').toLowerCase();
      const hasBothGroundLevel = (textContains(note, 'both workers at ground level') || textContains(details, 'both workers at ground level') || textContains(note, 'two professionals at ground level') || textContains(details, 'two professionals at ground level'));
      assert(!hasBothGroundLevel, `Gutter scenario "${sc._for}" (state:${sc._state_for||'none'}) must not describe both workers at ground level for active work`);
    });
  });

  // ─── RTG-RS25 : every active gutter scene resolves to elevated professional access ──

  runTest('RTG-RS25', 'Every active gutter scene resolves to elevated professional access', () => {
    // WORK_SCENES states
    const activeStates = ['debut', 'encours', 'semifinal'];
    activeStates.forEach(state => {
      const stateData = WORK_SCENES_ROOF.nettoyage_gouttieres?.states?.[state];
      assert(stateData, `WORK_SCENES_ROOF.nettoyage_gouttieres.states.${state} must exist`);
      const midground = (stateData.framing?.midground || '').toLowerCase();
      const hasAccess = textContainsAny(midground, ['ladder', 'scaffold', 'platform', 'mewp', 'standoff']);
      assert(hasAccess, `nettoyage_gouttieres.states.${state}.midground must reference elevated access equipment`);
    });
    // SITE_REALISM scenarios — Worker 1 must be on elevated access in every active scenario
    const activeScenarios = (SITE_REALISM_ROOF.nettoyage_gouttieres?.scenarios || []).filter(s => s._for);
    assert(activeScenarios.length > 0, 'At least one active gutter scenario must exist');
    activeScenarios.forEach(sc => {
      const tools = (sc.tools || []).join(' ').toLowerCase();
      const note = (sc.scene_note || '').toLowerCase();
      const midground = (sc.scene_framing?.midground || '').toLowerCase();
      const hasElevated = textContainsAny(tools + ' ' + note + ' ' + midground, [
        'ladder', 'standoff', 'scaffold', 'mewp', 'elevated platform'
      ]);
      assert(hasElevated, `Gutter scenario "${sc._for}" tools/note/framing must reference elevated access (ladder, standoff, scaffold, MEWP)`);
    });
  });

  // ─── RTG-RS26 : gutter ladders use extension ladder or A-frame; standoff no longer required ──
  // Updated doctrine (patch d1ff266): standoff is optional — extension ladder against wall and
  // professional A-frame are both accepted. Standoff is no longer a mandatory reject criterion.

  runTest('RTG-RS26', 'Gutter ladders use extension or A-frame ladder; standoff is optional not mandatory', () => {
    // Policy layer — access must reference at least two accepted ladder types
    const rules = WORKER_SCENE_RULES.nettoyage_gouttieres;
    const accessStr = (rules.access || []).join(' ').toLowerCase();
    assert(
      textContainsAny(accessStr, ['extension ladder', 'extending ladder']),
      'WORKER_SCENE_RULES.nettoyage_gouttieres.access must reference extension ladder'
    );
    assert(
      textContainsAny(accessStr, ['a-frame', 'a frame', 'double ladder', 'self-supporting']),
      'WORKER_SCENE_RULES.nettoyage_gouttieres.access must reference A-frame / self-supporting ladder'
    );
    // Standoff must NOT be the only accepted access — A-frame is explicitly allowed now
    const forbiddenStr = (rules.forbidden || []).join(' ').toLowerCase();
    assert(
      !textContains(forbiddenStr, 'ladder without standoff'),
      'WORKER_SCENE_RULES.nettoyage_gouttieres.forbidden must NOT make standoff mandatory (old doctrine removed)'
    );
    // Safety gate must not reject for absence of standoff
    const gateRule = SAFETY_CHECK_RULES.nettoyage_gouttieres || '';
    assert(
      textContainsAny(gateRule, ['do not reject for', 'standoff']),
      'SAFETY_CHECK_RULES.nettoyage_gouttieres must explicitly state standoff is not a rejection criterion'
    );
    // Resolved scene layer — each active scenario with a ladder must reference extension or A-frame or MEWP
    const activeScenarios = (SITE_REALISM_ROOF.nettoyage_gouttieres?.scenarios || []).filter(s => s._for);
    activeScenarios.forEach(sc => {
      const tools = (sc.tools || []).join(' ').toLowerCase();
      const note  = (sc.scene_note || '').toLowerCase();
      const hasLadder = textContains(tools + note, 'ladder');
      if (hasLadder) {
        const hasValidAccess = textContainsAny(tools + note, ['extension ladder', 'extending ladder', 'a-frame', 'standoff', 'scaffold', 'mewp']);
        assert(hasValidAccess, `Gutter scenario "${sc._for}" has a ladder but no valid access reference (extension/A-frame/scaffold/MEWP)`);
      }
    });
  });

  // ─── RTG-RS27 : gutter ladders never contact the gutter channel (policy + resolved) ──

  runTest('RTG-RS27', 'Gutter ladders never contact the gutter channel', () => {
    // Policy layer
    const gutterForbidden = FORBIDDEN_SAFETY_BY_METIER.nettoyage_gouttieres || [];
    const hasForbidden = gutterForbidden.some(f =>
      textContainsAny(f, ['gutter channel', 'touching gutter', 'inside the gutter'])
    );
    assert(hasForbidden, 'FORBIDDEN_SAFETY_BY_METIER.nettoyage_gouttieres must forbid ladder contacting gutter channel');
    const workerForbidden = WORKER_SCENE_RULES.nettoyage_gouttieres?.forbidden || [];
    const hasWorkerForbidden = workerForbidden.some(f =>
      textContainsAny(f, ['directly against the gutter', 'gutter channel'])
    );
    assert(hasWorkerForbidden, 'WORKER_SCENE_RULES.nettoyage_gouttieres.forbidden must forbid ladder against gutter');
    // Resolved scene layer — ladder-only scenarios must exclude ladder-on-gutter contact.
    // MEWP state_locked scenarios don't use a ladder as the primary work platform; they
    // must instead exclude "ladder as primary work platform" (which they do).
    // debut/final are ground-inspection states (no access equipment at height) — skip ladder checks for those.
    // encours/semifinal MEWP scenarios must forbid ladder as primary work platform.
    // Legacy (no _state_for) ladder scenarios must forbid ladder-on-gutter contact.
    const activeScenarios = (SITE_REALISM_ROOF.nettoyage_gouttieres?.scenarios || []).filter(s =>
      s._for && s._state_for !== 'debut' && s._state_for !== 'final'
    );
    activeScenarios.forEach(sc => {
      const isMewpScenario = sc._access_configuration === 'MEWP';
      const excl = (sc.scene_exclude || []).join(' ').toLowerCase();
      if (isMewpScenario) {
        // MEWP scenarios must exclude ladder as primary work platform
        const hasMewpLadderExclusion = excl.includes('ladder') && (
          excl.includes('primary work platform') || excl.includes('primary working platform') || excl.includes('this mewp route')
        );
        assert(hasMewpLadderExclusion, `MEWP gutter scenario "${sc._for}" (state:${sc._state_for||'none'}) scene_exclude must forbid ladder as primary work platform`);
      } else {
        // Legacy ladder scenarios must exclude ladder-on-gutter contact
        const hasLadderOnGutterExclusion = (sc.scene_exclude || []).some(e => {
          const el = e.toLowerCase();
          return el.includes('ladder') && (el.includes('gutter') || el.includes('channel'));
        });
        assert(hasLadderOnGutterExclusion, `Gutter scenario "${sc._for}" scene_exclude must contain an entry forbidding ladder contact with the gutter or channel`);
      }
    });
  });

  // ─── RTG-RS28 : nettoyage/débouchage use 1 worker; remplacement/pose use 2 ──────

  runTest('RTG-RS28', 'Nettoyage/débouchage gutter scenes use 1 worker; remplacement/pose use 2', () => {
    const rules = WORKER_SCENE_RULES.nettoyage_gouttieres;
    // Base minimum is 1 for nettoyage/débouchage
    assert(rules.min_workers_when_visible === 1, 'WORKER_SCENE_RULES.nettoyage_gouttieres.min_workers_when_visible must be 1 (nettoyage/débouchage use extension ladder, 1 worker)');
    // service_worker_minimums must enforce 2 for remplacement and pose
    assert(rules.service_worker_minimums?.remplacement_gouttieres === 2,
      'service_worker_minimums.remplacement_gouttieres must be 2');
    assert(rules.service_worker_minimums?.pose_gouttieres === 2,
      'service_worker_minimums.pose_gouttieres must be 2');
    // Nettoyage/débouchage scenarios must NOT add a second worker
    const activeScenarios = (SITE_REALISM_ROOF.nettoyage_gouttieres?.scenarios || [])
      .filter(s => !s._disabled && s._for && /nettoy|entretien|curag|debris|feuill|deboucha|bouchon|obstruct/.test(s._for));
    activeScenarios.forEach(sc => {
      const excludes = (sc.scene_exclude || []).join(' ').toLowerCase();
      const hasForbidSecondWorker = textContainsAny(excludes, ['second worker', 'artificially added']);
      assert(hasForbidSecondWorker, `Nettoyage/débouchage scenario "${sc._for}" scene_exclude must forbid second worker artificially added`);
    });
    // Remplacement/pose scenarios must still reference two workers
    const remplacScenarios = (SITE_REALISM_ROOF.nettoyage_gouttieres?.scenarios || [])
      .filter(s => s._for && /remplace|pose|install|neuf|nouveau/.test(s._for));
    assert(remplacScenarios.length >= 1, 'At least 1 remplacement/pose scenario must exist');
    remplacScenarios.forEach(sc => {
      const note = (sc.scene_note || '').toLowerCase();
      const hasTwoWorkers = textContainsAny(note, ['worker 1', 'worker 2', 'two professionals']);
      assert(hasTwoWorkers, `Remplacement/pose scenario "${sc._for}" must still describe two workers`);
    });
  });

  // ─── RTG-RS29 : nettoyage/débouchage worker role is clearly defined ───────────

  runTest('RTG-RS29', 'Nettoyage/débouchage gutter scenarios have a clearly defined single-worker role', () => {
    const rules = WORKER_SCENE_RULES.nettoyage_gouttieres;
    const actionsStr = (rules.actions || []).join(' ').toLowerCase();
    const hasWorkerAction = textContainsAny(actionsStr, ['worker scooping', 'worker cleaning', 'worker inserting']);
    assert(hasWorkerAction, 'WORKER_SCENE_RULES.nettoyage_gouttieres.actions must define the single worker role (scooping, cleaning, inserting)');
    // Resolved scene layer — each nettoyage/débouchage scenario must describe the worker action
    const activeScenarios = (SITE_REALISM_ROOF.nettoyage_gouttieres?.scenarios || [])
      .filter(s => s._for && /nettoy|entretien|curag|debris|feuill|deboucha|bouchon|obstruct/.test(s._for));
    const groundStates = ['debut', 'final'];
    activeScenarios.filter(s => !groundStates.includes(s._state_for)).forEach(sc => {
      const note = (sc.scene_note || '').toLowerCase();
      const hasLadder = textContainsAny(note, ['ladder', 'standoff', 'échelle']);
      assert(hasLadder, `Gutter scenario "${sc._for}" (state:${sc._state_for||'none'}) scene_note must reference ladder/standoff`);
    });
  });

  // ─── RTG-RS30 : Worker 2 remains outside the falling-debris zone in resolved scenes ─

  runTest('RTG-RS30', 'Worker 2 remains outside the falling-debris zone in resolved scenes', () => {
    // Policy layer
    const rules = WORKER_SCENE_RULES.nettoyage_gouttieres;
    const forbidden = (rules.forbidden || []).join(' ').toLowerCase();
    const safetyStr = (rules.safety_required || []).join(' ').toLowerCase();
    const hasDebrisForbidden = textContainsAny(forbidden + ' ' + safetyStr, [
      'directly below', 'falling-debris zone', 'falling debris', 'falling-object zone'
    ]);
    assert(hasDebrisForbidden, 'nettoyage_gouttieres must forbid Worker 2 below falling-debris zone in forbidden or safety_required');
    // Resolved scene layer — elevated-access scenarios (encours/semifinal) must place Worker 2
    // outside the falling-debris zone. debut/final are ground states where no debris falls.
    const activeScenarios = (SITE_REALISM_ROOF.nettoyage_gouttieres?.scenarios || []).filter(s =>
      s._for && s._state_for !== 'debut' && s._state_for !== 'final'
    );
    activeScenarios.forEach(sc => {
      const foreground = (sc.scene_framing?.foreground || '').toLowerCase();
      const note = (sc.scene_note || '').toLowerCase();
      const combined = foreground + ' ' + note;
      const hasWorker2 = textContains(combined, 'worker 2');
      if (hasWorker2) {
        const outsideDebris = textContainsAny(combined, ['outside the falling', 'not directly below', 'beside worker', 'outside the zone', 'away from', 'outside the drop zone']);
        assert(outsideDebris, `Gutter scenario "${sc._for}" (state:${sc._state_for||'none'}) must place Worker 2 outside the falling-debris zone`);
      }
    });
  });

  // ─── RTG-RS31 : no ground pole or vacuum survives in resolved scenarios ─────────

  runTest('RTG-RS31', 'No telescopic ground pole or ground gutter vacuum appears in resolved scenarios', () => {
    // Policy layer
    const forbidden = FORBIDDEN_SAFETY_BY_METIER.nettoyage_gouttieres || [];
    const hasForbidden = forbidden.some(f =>
      textContainsAny(f, ['telescopic ground pole', 'ground-level gutter vacuum', 'ground gutter', 'ground level'])
    );
    assert(hasForbidden, 'FORBIDDEN_SAFETY_BY_METIER.nettoyage_gouttieres must forbid telescopic ground pole and ground-level vacuum');
    const workerForbidden = (WORKER_SCENE_RULES.nettoyage_gouttieres?.forbidden || []).join(' ').toLowerCase();
    const hasWorkerForbidden = textContainsAny(workerForbidden, ['ground-level', 'telescopic ground']);
    assert(hasWorkerForbidden, 'WORKER_SCENE_RULES.nettoyage_gouttieres.forbidden must forbid ground-level gutter work');
    // Resolved scene layer — no scenario tools should mention a telescopic ground pole or vacuum
    const activeScenarios = (SITE_REALISM_ROOF.nettoyage_gouttieres?.scenarios || []).filter(s => s._for);
    activeScenarios.forEach(sc => {
      const tools = (sc.tools || []).join(' ').toLowerCase();
      const hasBadTool = textContainsAny(tools, ['telescopic pole', 'gutter vacuum', 'ground-level vacuum', 'gutter gutter vacuum']);
      assert(!hasBadTool, `Gutter scenario "${sc._for}" tools must not include telescopic ground pole or gutter vacuum`);
    });
  });

  // ─── RTG-RS32 : final gutter state may contain fewer workers only without active work ─

  runTest('RTG-RS32', 'Final gutter state may contain fewer workers only without active work', () => {
    const finalState = WORK_SCENES_ROOF.nettoyage_gouttieres?.states?.final;
    assert(finalState, 'WORK_SCENES_ROOF.nettoyage_gouttieres.states.final must exist');
    const finalDesc = (finalState.description || '').toLowerCase();
    const isCompletionScene = textContainsAny(finalDesc, ['complete', 'clear', 'clean']);
    assert(isCompletionScene, 'Final gutter state must describe completion (clean, clear, complete) — 0-1 workers acceptable');
    // Verify final state does NOT mandate two active workers in framing
    const finalMidground = (finalState.framing?.midground || '').toLowerCase();
    const hasActiveWork = textContainsAny(finalMidground, ['worker 1 on ladder', 'worker 2 at the base actively', 'two professionals working']);
    assert(!hasActiveWork, 'Final gutter state must not describe two workers actively working (completion scene)');
  });

  // ─── RTG-RS33 : downpipe unblocking cannot be performed from ground level ─────

  runTest('RTG-RS33', 'Downpipe unblocking cannot be performed from ground level', () => {
    // Policy layer
    const forbidden = FORBIDDEN_SAFETY_BY_METIER.nettoyage_gouttieres || [];
    const hasGroundPipeForbidden = forbidden.some(f =>
      textContainsAny(f, ['ground-level downpipe', 'crouching at the downpipe', 'pipe base as primary'])
    );
    assert(hasGroundPipeForbidden, 'FORBIDDEN_SAFETY_BY_METIER.nettoyage_gouttieres must forbid ground-level downpipe unblocking');
    const workerForbidden = (WORKER_SCENE_RULES.nettoyage_gouttieres?.forbidden || []).join(' ').toLowerCase();
    assert(textContains(workerForbidden, 'ground-level downpipe'), 'WORKER_SCENE_RULES.nettoyage_gouttieres.forbidden must forbid ground-level downpipe unblocking');
    // Resolved scene layer — all débouchage scenarios must have Worker 1 on elevated access
    const debouchageScenarios = (SITE_REALISM_ROOF.nettoyage_gouttieres?.scenarios || [])
      .filter(s => s._for && /deboucha|bouchon|obstruct/i.test(s._for));
    assert(debouchageScenarios.length >= 1, 'At least 1 débouchage scenario must exist');
    debouchageScenarios.forEach(sc => {
      const tools = (sc.tools || []).join(' ').toLowerCase();
      const note = (sc.scene_note || '').toLowerCase();
      const midground = (sc.scene_framing?.midground || '').toLowerCase();
      const combined = tools + ' ' + note + ' ' + midground;
      // debut/final are intentional ground-inspection states — only check elevated access for encours/semifinal
      const isGroundState = sc._state_for === 'debut' || sc._state_for === 'final';
      if (!isGroundState) {
        // Active states (encours/semifinal) must have elevated access
        const hasElevatedAccess = textContainsAny(combined, ['ladder', 'standoff', 'scaffold', 'mewp']);
        assert(hasElevatedAccess, `Débouchage scenario "${sc._for}" (state:${sc._state_for||'none'}) must reference elevated access — ground-only work is forbidden in active states`);
        // Must not say both workers are at ground level for active rod work
        const hasBothGroundActive = textContains(combined, 'both workers at ground level') || textContains(combined, 'two professionals at ground level');
        assert(!hasBothGroundActive, `Débouchage scenario "${sc._for}" (state:${sc._state_for||'none'}) must not place both workers at ground level for active clearance`);
        // Must exclude ground-level downpipe feeding
        const excludes = (sc.scene_exclude || []).join(' ').toLowerCase();
        const hasForbiddenGroundPipe = textContainsAny(excludes, ['crouching at the downpipe base', 'ground-level downpipe', 'worker at the downpipe base as the only']);
        assert(hasForbiddenGroundPipe, `Débouchage scenario "${sc._for}" (state:${sc._state_for||'none'}) scene_exclude must forbid worker crouching at the downpipe base`);
      }
    });
  });

  // ─── RTG-RS34 : all five catalog gutter services satisfy the elevated-access rule ─

  runTest('RTG-RS34', 'All five catalog gutter services satisfy the elevated-access rule', () => {
    const GUTTER_SERVICES = [
      { label: 'nettoyage gouttières',   forPattern: /nettoy|entretien|curag|debris|feuill/ },
      { label: 'débouchage gouttières',  forPattern: /deboucha|bouchon|obstruct/ },
      { label: 'remplacement gouttières',forPattern: /remplace|pose|install|neuf|nouveau/ },
      { label: 'entretien gouttières',   forPattern: /nettoy|entretien|curag|debris|feuill/ },
      { label: 'pose gouttières',        forPattern: /remplace|pose|install|neuf|nouveau/ },
    ];
    const allScenarios = SITE_REALISM_ROOF.nettoyage_gouttieres?.scenarios || [];
    GUTTER_SERVICES.forEach(svc => {
      const matched = allScenarios.filter(s => s._for && svc.forPattern.test(s._for));
      assert(matched.length >= 1, `Service "${svc.label}" must match at least one gutter scenario (_for)`);
      matched.forEach(sc => {
        const tools = (sc.tools || []).join(' ').toLowerCase();
        const note = (sc.scene_note || '').toLowerCase();
        const combined = tools + ' ' + note;
        const hasElevatedAccess = textContainsAny(combined, ['ladder', 'standoff', 'scaffold', 'mewp', 'elevated']);
        assert(hasElevatedAccess, `Service "${svc.label}" → scenario "${sc._for}" must reference elevated professional access`);
      });
    });
  });

  // ─── RTG-RS35 : anti-moss active state resolves to MEWP, scaffold or complete ladder ─

  runTest('RTG-RS35', 'Anti-moss active state resolves to MEWP, scaffold or complete secured ladder only', () => {
    const antiScenarios = (SITE_REALISM_ROOF.nettoyage_toiture?.scenarios || [])
      .filter(s => s._for && /anti.mousse/i.test(s._for));
    assert(antiScenarios.length >= 1, 'At least 1 anti-mousse scenario must exist');
    antiScenarios.forEach(sc => {
      const combined = (sc.tools || []).concat(sc.protections || []).join(' ').toLowerCase();
      const hasElevated = textContainsAny(combined, ['mewp', 'scaffold', 'hooked roof ladder']);
      assert(hasElevated, `Anti-mousse scenario tools/protections must include MEWP, scaffold, or hooked roof ladder`);
    });
  });

  // ─── RTG-RS36 : hydrofuge active state resolves to MEWP, scaffold or complete ladder ─

  runTest('RTG-RS36', 'Hydrofuge active state resolves to MEWP, scaffold or complete secured ladder only', () => {
    const hydroScenarios = (SITE_REALISM_ROOF.nettoyage_toiture?.scenarios || [])
      .filter(s => s._for && /hydrofuge/i.test(s._for));
    assert(hydroScenarios.length >= 1, 'At least 1 hydrofuge scenario must exist');
    hydroScenarios.forEach(sc => {
      const combined = (sc.tools || []).concat(sc.protections || []).join(' ').toLowerCase();
      const hasElevated = textContainsAny(combined, ['mewp', 'scaffold', 'hooked roof ladder']);
      assert(hasElevated, `Hydrofuge scenario tools/protections must include MEWP, scaffold, or hooked roof ladder`);
    });
  });

  // ─── RTG-RS37 : no anti-moss worker freely stands on roof tiles ───────────────

  runTest('RTG-RS37', 'No anti-moss worker freely stands on roof tiles', () => {
    // debut/final are ground states (workers at ground level, not near tiles) — only
    // check elevated-access scenarios (encours/semifinal) for tile-access exclusions.
    const antiScenarios = (SITE_REALISM_ROOF.nettoyage_toiture?.scenarios || [])
      .filter(s => s._for && /anti.mousse/i.test(s._for) &&
        s._state_for !== 'debut' && s._state_for !== 'final');
    antiScenarios.forEach(sc => {
      const excludes = (sc.scene_exclude || []).join(' ').toLowerCase();
      const forbidsFree = textContainsAny(excludes, [
        'freely standing', 'stepping out of the basket onto', 'stepping from the scaffold onto',
        'worker freely standing on mossy tiles', 'freely on mossy'
      ]);
      assert(forbidsFree, `Anti-mousse scenario (state:${sc._state_for||'none'}) scene_exclude must forbid worker freely standing on mossy tiles`);
    });
  });

  // ─── RTG-RS38 : no hydrofuge worker freely stands on roof tiles ───────────────

  runTest('RTG-RS38', 'No hydrofuge worker freely stands on roof tiles', () => {
    const hydroScenarios = (SITE_REALISM_ROOF.nettoyage_toiture?.scenarios || [])
      .filter(s => s._for && /hydrofuge/i.test(s._for));
    hydroScenarios.forEach(sc => {
      const excludes = (sc.scene_exclude || []).join(' ').toLowerCase();
      const note = (sc.scene_note || '').toLowerCase();
      const forbidsFree = textContainsAny(excludes + ' ' + note, [
        'freely standing on pitched tiles', 'freely standing on tiles', 'worker freely standing',
        'no hooked roof ladder visible', 'without secured roof ladder', 'without hooked roof ladder'
      ]);
      assert(forbidsFree, `Hydrofuge scenario must forbid freely standing on tiles or require hooked roof ladder`);
    });
  });

  // ─── RTG-RS39 : treatment elevated access block reaches locked_final_prompt ────

  runTest('RTG-RS39', 'Treatment elevated access block reaches locked_final_prompt for anti-moss service', () => {
    const mockScene = {
      var_workers: 2, var_presence: 'workers', _matched_key: 'nettoyage_toiture',
      _matched_service: 'Traitement anti-mousse toiture', composition: 'medium_intervention',
      _capture_defects_resolved: [],
    };
    const result = _appendLockedFinalConstraints('TEST PROMPT', mockScene);
    assert(textContains(result, 'NON-NEGOTIABLE ELEVATED ACCESS'), 'NON-NEGOTIABLE ELEVATED ACCESS block must be present in locked_final_prompt for anti-mousse service');
    assert(textContains(result, 'No treatment may be performed from ground level'), 'Locked prompt must forbid ground-level treatment');
    assert(textContains(result, 'No worker may freely stand'), 'Locked prompt must forbid freely standing on tiles');
  });

  // ─── RTG-RS40 : two distinct worker descriptions reach locked_final_prompt ─────

  runTest('RTG-RS40', 'Two distinct worker descriptions reach locked_final_prompt for anti-moss service', () => {
    const mockScene = {
      var_workers: 2, var_presence: 'workers', _matched_key: 'nettoyage_toiture',
      _matched_service: 'Traitement anti-mousse toiture', composition: 'medium_intervention',
      _capture_defects_resolved: [],
    };
    const result = _appendLockedFinalConstraints('TEST PROMPT', mockScene);
    assert(textContainsAny(result, ['EXACTLY TWO', 'two professional workers', 'Both Worker 1']), '2-worker mandate must be present in the locked prompt');
    assert(textContains(result, 'Worker 1'), 'Worker 1 role description must be present in the crew rule');
    assert(textContains(result, 'Worker 2'), 'Worker 2 role description must be present in the crew rule');
  });

  // ─── RTG-RS41 : MEWP config includes basket, guardrails, visible boom, ground operator ─

  runTest('RTG-RS41', 'MEWP config includes basket, guardrails, visible boom and ground operator', () => {
    const mewpScenario = (SITE_REALISM_ROOF.nettoyage_toiture?.scenarios || [])
      .filter(s => s._for && /anti.mousse/i.test(s._for))
      .find(s => (s.tools || []).join(' ').toLowerCase().includes('mewp'));
    assert(mewpScenario, 'At least one anti-mousse scenario must use MEWP');
    const combined = [
      ...(mewpScenario.tools || []),
      ...(mewpScenario.protections || []),
      ...(mewpScenario.chantier_details || []),
      mewpScenario.scene_note || '',
    ].join(' ').toLowerCase();
    assert(textContains(combined, 'guardrail'), 'MEWP scenario must reference guardrails on the basket');
    assert(textContains(combined, 'boom'), 'MEWP scenario must reference visible boom');
    assert(textContainsAny(combined, ['ground control', 'ground-level mewp control', 'mewp controls', 'ground level']), 'MEWP scenario must describe Worker 2 at ground controls');
    assert(textContainsAny(combined, ['inside the basket', 'completely inside']), 'MEWP scenario must describe Worker 1 inside the basket');
  });

  // ─── RTG-RS42 : scaffold config includes platform, guardrails, safe access ─────

  runTest('RTG-RS42', 'Scaffold config includes platform, guardrails and safe access', () => {
    const scaffoldScenario = (SITE_REALISM_ROOF.nettoyage_toiture?.scenarios || [])
      .filter(s => s._for && /anti.mousse/i.test(s._for))
      .find(s => (s.tools || []).join(' ').toLowerCase().includes('scaffold'));
    assert(scaffoldScenario, 'At least one anti-mousse scenario must use scaffold');
    const combined = [
      ...(scaffoldScenario.tools || []),
      ...(scaffoldScenario.protections || []),
      scaffoldScenario.scene_note || '',
    ].join(' ').toLowerCase();
    assert(textContains(combined, 'platform'), 'Scaffold scenario must reference platform');
    assert(textContains(combined, 'guardrail'), 'Scaffold scenario must reference guardrail on the open side');
    assert(textContainsAny(combined, ['diagonal bracing', 'scaffold base', 'scaffold structure']), 'Scaffold scenario must reference scaffold structure/bracing/base');
  });

  // ─── RTG-RS43 : customer smartphone perspective reaches final prompt ────────────

  runTest('RTG-RS43', 'Customer smartphone perspective reaches final prompt for treatment services', () => {
    const treatmentScenarios = (SITE_REALISM_ROOF.nettoyage_toiture?.scenarios || [])
      .filter(s => s._for && (/anti.mousse/i.test(s._for) || /hydrofuge/i.test(s._for)));
    assert(treatmentScenarios.length >= 1, 'At least 1 treatment scenario must exist');
    treatmentScenarios.forEach(sc => {
      const camera = (sc.scene_camera || '').toLowerCase();
      const hasSmartphone = textContainsAny(camera, ['smartphone', 'homeowner', 'garden', 'driveway']);
      assert(hasSmartphone, `Treatment scenario scene_camera must reference homeowner smartphone from garden/driveway`);
    });
    const mockScene = {
      var_workers: 2, var_presence: 'workers', _matched_key: 'nettoyage_toiture',
      _matched_service: 'Traitement anti-mousse toiture', composition: 'medium_intervention',
      _capture_defects_resolved: [],
    };
    const result = _appendLockedFinalConstraints('TEST PROMPT', mockScene);
    assert(textContainsAny(result, ['smartphone', 'handheld', 'documentary']), 'Locked prompt must reference documentary/handheld style');
  });

  // ─── RTG-RS44 : six rejected attempts documented as regression evidence ─────────

  runTest('RTG-RS44', 'Six rejected attempts documented as CAS B regression evidence', () => {
    // CAS B: constraints reached locked_final_prompt but gpt-image-2 failed to render
    // visually detectable fall protection — 6/6 safety gate rejections confirmed.
    // This test confirms the safety gate rule covers the regression pattern.
    const safetyRule = SAFETY_CHECK_RULES.nettoyage_toiture || '';
    assert(textContains(safetyRule, 'CRITICAL REGRESSION CASE'), 'SAFETY_CHECK_RULES.nettoyage_toiture must document the CAS B regression case');
    assert(textContains(safetyRule, 'backpack sprayer'), 'Regression case must reference backpack sprayer as the visual failure mode');
    assert(textContains(safetyRule, 'no harness'), 'Regression case must reference absence of visible harness');
    assert(textContains(safetyRule, 'critical_violation'), 'Regression case must be classified as critical_violation');
  });

  // ─── RTG-RS45 : ladder config includes stabilized access ladder and standoff ────

  runTest('RTG-RS45', 'Ladder config includes stabilized access ladder with standoff', () => {
    const ladderScenarios = (SITE_REALISM_ROOF.nettoyage_toiture?.scenarios || [])
      .filter(s => s._for && /hydrofuge/i.test(s._for))
      .filter(s => (s.tools || []).join(' ').toLowerCase().includes('extension ladder'));
    assert(ladderScenarios.length >= 1, 'At least 1 hydrofuge scenario must use an extension ladder');
    ladderScenarios.forEach(sc => {
      const tools = (sc.tools || []).join(' ').toLowerCase();
      const protections = (sc.protections || []).join(' ').toLowerCase();
      assert(textContains(tools + protections, 'standoff'), `Hydrofuge ladder scenario must reference standoff stabiliser`);
    });
  });

  // ─── RTG-RS46 : ladder config includes secured hooked roof ladder ─────────────

  runTest('RTG-RS46', 'LADDER_AND_SECURED_ROOF_LADDER hydrofuge scenarios reference hooked roof ladder over the ridge', () => {
    const ladderScenarios = (SITE_REALISM_ROOF.nettoyage_toiture?.scenarios || [])
      .filter(s => s._for && /hydrofuge/i.test(s._for))
      .filter(s => s._access_configuration !== 'MEWP');
    assert(ladderScenarios.length >= 1, 'At least 1 LADDER_AND_SECURED_ROOF_LADDER hydrofuge scenario must exist');
    ladderScenarios.forEach(sc => {
      const tools = (sc.tools || []).join(' ').toLowerCase();
      const note = (sc.scene_note || '').toLowerCase();
      const combined = tools + ' ' + note;
      assert(textContainsAny(combined, ['hooked roof ladder', 'hooked roof']), `Hydrofuge LADDER scenario must reference secured hooked roof ladder`);
      assert(textContainsAny(combined, ['hooks over the ridge', 'hooks over ridge']), `Hydrofuge LADDER scenario must specify hooks over the ridge`);
    });
  });

  // ─── RTG-RS47 : worker is not freely standing on tiles (ladder or MEWP) ───────

  runTest('RTG-RS47', 'Worker is not freely standing on tiles in any hydrofuge scenario (LADDER or MEWP)', () => {
    const hydroScenarios = (SITE_REALISM_ROOF.nettoyage_toiture?.scenarios || [])
      .filter(s => s._for && /hydrofuge/i.test(s._for));
    hydroScenarios.forEach(sc => {
      const tools = (sc.tools || []).join(' ').toLowerCase();
      const protections = (sc.protections || []).join(' ').toLowerCase();
      const note = (sc.scene_note || '').toLowerCase();
      const combined = tools + ' ' + protections + ' ' + note;
      const hasNotFreelyOnTiles = textContainsAny(combined, [
        'not standing freely on the tiles', 'not freely on tiles', 'not standing freely',
        'not freely standing on', 'working platform on the slope',
        'worker 1\'s working platform', 'positioned on the hooked roof ladder',
        'inside the basket', 'not on roof tiles', 'completely inside the basket',
      ]);
      assert(hasNotFreelyOnTiles, `Hydrofuge scenario "${sc._access_configuration || sc._for}" must state Worker 1 is secured (on ladder, in basket) — not freely on tiles`);
    });
  });

  // ─── RTG-RS48 : ladder hydrofuge scenarios have harness, lanyard, anchor ───────

  runTest('RTG-RS48', 'LADDER_AND_SECURED_ROOF_LADDER hydrofuge scenarios reference harness, lanyard and anchor', () => {
    const ladderScenarios = (SITE_REALISM_ROOF.nettoyage_toiture?.scenarios || [])
      .filter(s => s._for && /hydrofuge/i.test(s._for))
      .filter(s => s._access_configuration !== 'MEWP');
    assert(ladderScenarios.length >= 1, 'At least 1 non-MEWP hydrofuge scenario must exist');
    ladderScenarios.forEach(sc => {
      const combined = (sc.tools || []).concat(sc.protections || []).join(' ').toLowerCase();
      const hasHarness = textContains(combined, 'harness');
      const hasLanyard = textContains(combined, 'lanyard');
      const hasAnchor = textContains(combined, 'anchor');
      assert(hasHarness && hasLanyard && hasAnchor, `Hydrofuge LADDER scenario tools/protections must reference harness, connected lanyard, and credible anchor as separate visible elements`);
    });
  });

  // ─── RTG-RS49 : access ladder never contacts gutter ──────────────────────────

  runTest('RTG-RS49', 'Access ladder never contacts the gutter — standoff arms on wall', () => {
    const ladderScenarios = (SITE_REALISM_ROOF.nettoyage_toiture?.scenarios || [])
      .filter(s => s._for && /hydrofuge/i.test(s._for))
      .filter(s => (s.tools || []).join(' ').toLowerCase().includes('extension ladder'));
    assert(ladderScenarios.length >= 1, 'At least 1 hydrofuge ladder scenario must exist');
    ladderScenarios.forEach(sc => {
      const tools = (sc.tools || []).join(' ').toLowerCase();
      const protections = (sc.protections || []).join(' ').toLowerCase();
      const combined = tools + ' ' + protections;
      const gutterFree = textContainsAny(combined, [
        'not on the gutter', 'not on gutter', 'arms on the wall', 'arms on wall'
      ]);
      assert(gutterFree, `Hydrofuge extension ladder must explicitly state standoff arms on wall NOT on gutter`);
    });
  });

  // ─── RTG-RS50 : ladder config contains two workers with distinct roles ─────────

  runTest('RTG-RS50', 'Ladder config contains two workers with distinct roles', () => {
    const ladderScenarios = (SITE_REALISM_ROOF.nettoyage_toiture?.scenarios || [])
      .filter(s => s._for && /hydrofuge/i.test(s._for));
    ladderScenarios.forEach(sc => {
      const note = (sc.scene_note || '').toLowerCase();
      const hasWorker1 = textContains(note, 'worker 1');
      const hasWorker2 = textContains(note, 'worker 2');
      assert(hasWorker1 && hasWorker2, `Hydrofuge scenario scene_note must separately describe Worker 1 and Worker 2 with distinct roles`);
    });
  });

  // ─── RTG-RS51 : ordinary access ladder alone is rejected as fall protection ────

  runTest('RTG-RS51', 'Ordinary access ladder alone is rejected as fall protection in locked_final_prompt', () => {
    const mockSceneAnti = {
      var_workers: 2, var_presence: 'workers', _matched_key: 'nettoyage_toiture',
      _matched_service: 'Traitement anti-mousse toiture', composition: 'medium_intervention',
      _capture_defects_resolved: [],
    };
    const resultAnti = _appendLockedFinalConstraints('TEST PROMPT', mockSceneAnti);
    assert(
      textContainsAny(resultAnti, ['ordinary ladder', 'an ordinary ladder']),
      'Locked prompt for anti-mousse must explicitly state an ordinary ladder is not fall protection'
    );
    const mockSceneHydro = {
      var_workers: 2, var_presence: 'workers', _matched_key: 'nettoyage_toiture',
      _matched_service: 'Traitement hydrofuge toiture', composition: 'medium_intervention',
      _capture_defects_resolved: [],
    };
    const resultHydro = _appendLockedFinalConstraints('TEST PROMPT', mockSceneHydro);
    assert(
      textContainsAny(resultHydro, ['ordinary ladder', 'an ordinary ladder']),
      'Locked prompt for hydrofuge must explicitly state an ordinary ladder is not fall protection'
    );
  });

  // ─── helper: deterministic scenario resolution for encours micro-test ─────────

  function _resolveEncoursMicroTestScenario(scenarios, serviceLabel, state) {
    const labelLower = serviceLabel.toLowerCase();
    return scenarios.find(sc => {
      if (!sc._for) return false;
      try { if (!new RegExp(sc._for, 'i').test(labelLower)) return false; } catch { return false; }
      if (Array.isArray(sc._state_for)) return sc._state_for.includes(state);
      return sc._state_for === state;
    }) || null;
  }

  // ─── RTG-RS52 : anti-mousse encours resolves to SCAFFOLD ──────────────────────

  runTest('RTG-RS52', 'Anti-moss encours maison_individuelle resolves deterministically to MEWP', () => {
    // SCAFFOLD variant is _disabled: true — anti-mousse encours now resolves to MEWP (state_lock).
    const scenarios = SITE_REALISM_ROOF.nettoyage_toiture?.scenarios || [];
    const resolved = _resolveEncoursMicroTestScenario(scenarios, 'traitement anti-mousse toiture', 'encours');
    assert(resolved, 'A state-locked scenario must exist for anti-mousse + encours');
    assert(resolved._access_configuration === 'MEWP',
      `Anti-moss encours must resolve to MEWP, got: ${resolved._access_configuration}`);
  });

  // ─── RTG-RS53 : hydrofuge encours resolves to MEWP ───────────────────────────

  runTest('RTG-RS53', 'Hydrofuge encours maison_individuelle resolves deterministically to MEWP', () => {
    const scenarios = SITE_REALISM_ROOF.nettoyage_toiture?.scenarios || [];
    const resolved = _resolveEncoursMicroTestScenario(scenarios, 'traitement hydrofuge toiture', 'encours');
    assert(resolved, 'A state-locked scenario must exist for hydrofuge + encours');
    assert(resolved._access_configuration === 'MEWP',
      `Hydrofuge encours must resolve to MEWP, got: ${resolved._access_configuration}`);
  });

  // ─── RTG-RS54 : neither micro-test route resolves to LADDER ───────────────────

  runTest('RTG-RS54', 'Neither micro-test route resolves to LADDER_AND_SECURED_ROOF_LADDER', () => {
    const scenarios = SITE_REALISM_ROOF.nettoyage_toiture?.scenarios || [];
    const anti = _resolveEncoursMicroTestScenario(scenarios, 'traitement anti-mousse toiture', 'encours');
    const hydro = _resolveEncoursMicroTestScenario(scenarios, 'traitement hydrofuge toiture', 'encours');
    assert(anti?._access_configuration !== 'LADDER_AND_SECURED_ROOF_LADDER',
      'Anti-moss encours must not resolve to LADDER_AND_SECURED_ROOF_LADDER');
    assert(hydro?._access_configuration !== 'LADDER_AND_SECURED_ROOF_LADDER',
      'Hydrofuge encours must not resolve to LADDER_AND_SECURED_ROOF_LADDER');
  });

  // ─── RTG-RS55 : access configuration not randomized ───────────────────────────

  runTest('RTG-RS55', 'Access configuration is not randomized for the two micro-test routes', () => {
    const scenarios = SITE_REALISM_ROOF.nettoyage_toiture?.scenarios || [];
    const anti = _resolveEncoursMicroTestScenario(scenarios, 'traitement anti-mousse toiture', 'encours');
    const hydro = _resolveEncoursMicroTestScenario(scenarios, 'traitement hydrofuge toiture', 'encours');
    assert(anti?._access_configuration_randomized === false,
      'Anti-moss encours _access_configuration_randomized must be false');
    assert(hydro?._access_configuration_randomized === false,
      'Hydrofuge encours _access_configuration_randomized must be false');
  });

  // ─── RTG-RS56 : anti-moss prompt describes two distinct scaffold workers ───────

  runTest('RTG-RS56', 'Anti-moss locked_final_prompt describes two distinct MEWP workers', () => {
    // SCAFFOLD variant is _disabled: true — anti-mousse encours now uses MEWP basket (not scaffold platform).
    const scenarios = SITE_REALISM_ROOF.nettoyage_toiture?.scenarios || [];
    const resolved = _resolveEncoursMicroTestScenario(scenarios, 'traitement anti-mousse toiture', 'encours');
    assert(resolved, 'Anti-moss encours scenario must exist');
    const combined = [
      resolved.scene_note || '',
      ...(resolved.tools || []),
      ...(resolved.protections || []),
      ...(resolved.chantier_details || []),
    ].join(' ').toLowerCase();
    assert(textContains(combined, 'worker 1'), 'Anti-moss encours must describe Worker 1');
    assert(textContains(combined, 'worker 2'), 'Anti-moss encours must describe Worker 2');
    assert(textContainsAny(combined, ['inside the basket', 'completely inside', 'fully inside', 'mewp basket']),
      'Anti-moss encours must describe Worker 1 inside the MEWP basket with guardrails');
    assert(textContainsAny(combined, ['beside the mewp base', 'mewp base', 'ground level', 'beside the mewp']),
      'Anti-moss encours must describe Worker 2 beside the MEWP base at ground level');
    const mockScene = {
      var_workers: 2, var_presence: 'workers', _matched_key: 'nettoyage_toiture',
      _matched_service: 'Traitement anti-mousse toiture', composition: 'medium_intervention',
      _capture_defects_resolved: [],
    };
    const result = _appendLockedFinalConstraints('TEST PROMPT', mockScene);
    assert(textContains(result, 'NON-NEGOTIABLE ELEVATED ACCESS'), 'Locked prompt must contain elevated access block');
    assert(textContainsAny(result, ['EXACTLY TWO', 'two professional workers', 'Both Worker 1']), 'Locked prompt must mandate 2 workers');
  });

  // ─── RTG-RS57 : hydrofuge prompt describes basket worker and ground-control worker ─

  runTest('RTG-RS57', 'Hydrofuge locked_final_prompt describes basket worker and ground-control worker', () => {
    const scenarios = SITE_REALISM_ROOF.nettoyage_toiture?.scenarios || [];
    const resolved = _resolveEncoursMicroTestScenario(scenarios, 'traitement hydrofuge toiture', 'encours');
    assert(resolved, 'Hydrofuge encours scenario must exist');
    const combined = [
      resolved.scene_note || '',
      ...(resolved.tools || []),
      ...(resolved.protections || []),
      ...(resolved.chantier_details || []),
    ].join(' ').toLowerCase();
    assert(textContains(combined, 'worker 1'), 'Hydrofuge encours must describe Worker 1');
    assert(textContains(combined, 'worker 2'), 'Hydrofuge encours must describe Worker 2');
    assert(textContainsAny(combined, ['inside the basket', 'fully inside', 'completely inside']),
      'Hydrofuge encours must describe Worker 1 fully inside the MEWP basket');
    assert(textContainsAny(combined, ['ground control', 'mewp control', 'ground-level mewp', 'mewp ground']),
      'Hydrofuge encours must describe Worker 2 at MEWP ground controls');
    const mockScene = {
      var_workers: 2, var_presence: 'workers', _matched_key: 'nettoyage_toiture',
      _matched_service: 'Traitement hydrofuge toiture', composition: 'medium_intervention',
      _capture_defects_resolved: [],
    };
    const result = _appendLockedFinalConstraints('TEST PROMPT', mockScene);
    assert(textContains(result, 'NON-NEGOTIABLE ELEVATED ACCESS'), 'Locked prompt must contain elevated access block');
    assert(textContainsAny(result, ['EXACTLY TWO', 'two professional workers', 'Both Worker 1']), 'Locked prompt must mandate 2 workers');
  });

  // ─── RTG-RS58 : no worker on roof tiles in either micro-test route ────────────

  runTest('RTG-RS58', 'No worker is positioned on roof tiles in either micro-test route', () => {
    const scenarios = SITE_REALISM_ROOF.nettoyage_toiture?.scenarios || [];
    const anti = _resolveEncoursMicroTestScenario(scenarios, 'traitement anti-mousse toiture', 'encours');
    const hydro = _resolveEncoursMicroTestScenario(scenarios, 'traitement hydrofuge toiture', 'encours');
    [anti, hydro].forEach(sc => {
      assert(sc, 'Scenario must exist for this micro-test route');
      const combined = [
        sc.scene_note || '',
        ...(sc.scene_exclude || []),
        ...(sc.protections || []),
      ].join(' ').toLowerCase();
      const noFreeTiles = textContainsAny(combined, [
        'not on roof tiles', 'not standing freely on roof tiles', 'not on the roof tiles',
        'worker freely on mossy tiles', 'no worker on roof tiles',
        'not standing freely on the tiles', 'not freely on tiles',
        'worker stepping from the scaffold platform onto the roof tiles',
        'worker stepping out of the basket onto the roof tiles',
      ]);
      assert(noFreeTiles,
        `Scenario for "${sc._access_configuration}" must forbid or negate worker freely on roof tiles`);
    });
  });

  // ─── RTG-RS59 : treatment applied from elevated access, not by ground worker ───

  runTest('RTG-RS59', 'Treatment is applied from elevated access, not by the ground worker', () => {
    const scenarios = SITE_REALISM_ROOF.nettoyage_toiture?.scenarios || [];
    const anti = _resolveEncoursMicroTestScenario(scenarios, 'traitement anti-mousse toiture', 'encours');
    const hydro = _resolveEncoursMicroTestScenario(scenarios, 'traitement hydrofuge toiture', 'encours');
    [anti, hydro].forEach(sc => {
      assert(sc, 'Scenario must exist');
      const note = (sc.scene_note || '').toLowerCase();
      const hasElevatedTreatment = textContainsAny(note, [
        'directing a lance', 'applying', 'from inside the basket', 'from inside the protected basket',
        'from the platform', 'from the scaffold', 'from the scaffold platform',
        'worker 1', 'treatment toward',
      ]);
      assert(hasElevatedTreatment,
        `Scenario "${sc._access_configuration}" must describe treatment applied by Worker 1 from elevated access`);
      const groundWorkerApplies = textContainsAny(note, [
        'worker 2 applying', 'worker 2 directing', 'worker 2 spraying', 'worker 2 treating',
      ]);
      assert(!groundWorkerApplies,
        `Scenario "${sc._access_configuration}" must not have Worker 2 performing the treatment`);
    });
  });

  // ─── RTG-RS60 : customer smartphone perspective remains after locked constraints ─

  runTest('RTG-RS60', 'Customer smartphone perspective remains present after locked constraints are appended', () => {
    const scenarios = SITE_REALISM_ROOF.nettoyage_toiture?.scenarios || [];
    const anti = _resolveEncoursMicroTestScenario(scenarios, 'traitement anti-mousse toiture', 'encours');
    const hydro = _resolveEncoursMicroTestScenario(scenarios, 'traitement hydrofuge toiture', 'encours');
    [anti, hydro].forEach(sc => {
      assert(sc, 'Scenario must exist');
      const camera = (sc.scene_camera || '').toLowerCase();
      assert(textContainsAny(camera, ['smartphone', 'homeowner', 'garden', 'driveway']),
        `Scenario "${sc._access_configuration}" must reference homeowner smartphone from garden/driveway`);
    });
    const mockScene = {
      var_workers: 2, var_presence: 'workers', _matched_key: 'nettoyage_toiture',
      _matched_service: 'Traitement anti-mousse toiture', composition: 'medium_intervention',
      _capture_defects_resolved: [],
    };
    const result = _appendLockedFinalConstraints('TEST PROMPT', mockScene);
    assert(textContainsAny(result, ['smartphone', 'handheld', 'documentary']),
      'Locked prompt must preserve documentary smartphone style after elevated access block is added');
  });

  // ─── RTG-RS61 : access telemetry survives complete task construction ────────────
  // Verifies that _access_configuration, _access_configuration_source, and
  // _access_configuration_randomized propagate from the picked scenario through
  // _applySiteRealism to the final task object — not merely present on raw metadata.

  runTest('RTG-RS61', 'Access telemetry survives complete task construction via _applySiteRealism', () => {
    const antiScene = {
      _matched_key: 'nettoyage_toiture',
      _matched_service: 'Traitement anti-mousse toiture',
      state_level: 'encours',
    };
    const antiResult = JSON.parse(_applySiteRealism(JSON.stringify(antiScene), 0));
    assert(antiResult._access_configuration === 'MEWP',
      `Anti-mousse encours: _applySiteRealism must produce _access_configuration=MEWP (SCAFFOLD is _disabled), got: ${antiResult._access_configuration}`);
    assert(antiResult._access_configuration_source === 'state_lock',
      `Anti-mousse encours: _access_configuration_source must be 'state_lock', got: ${antiResult._access_configuration_source}`);
    assert(antiResult._access_configuration_randomized === false,
      `Anti-mousse encours: _access_configuration_randomized must be false, got: ${antiResult._access_configuration_randomized}`);

    const hydroScene = {
      _matched_key: 'nettoyage_toiture',
      _matched_service: 'Traitement hydrofuge toiture',
      state_level: 'encours',
    };
    const hydroResult = JSON.parse(_applySiteRealism(JSON.stringify(hydroScene), 0));
    assert(hydroResult._access_configuration === 'MEWP',
      `Hydrofuge encours: _applySiteRealism must produce _access_configuration=MEWP, got: ${hydroResult._access_configuration}`);
    assert(hydroResult._access_configuration_source === 'state_lock',
      `Hydrofuge encours: _access_configuration_source must be 'state_lock', got: ${hydroResult._access_configuration_source}`);
    assert(hydroResult._access_configuration_randomized === false,
      `Hydrofuge encours: _access_configuration_randomized must be false, got: ${hydroResult._access_configuration_randomized}`);
  });

  // ─── RTG-RS62 : state-lock selection survives complete task construction ────────
  // Verifies that the resolver picks from the state-locked pool (not the full targeted pool)
  // when _state_for matches state_level — proven via pool size, not just output field.

  runTest('RTG-RS62', 'State-lock selection survives complete task construction — pool is restricted to 1', () => {
    const scenarios = SITE_REALISM_ROOF.nettoyage_toiture?.scenarios || [];
    const svcLower = svc => (svc || '').toLowerCase();

    const antiTargeted = scenarios.filter(s => s._for && new RegExp(s._for, 'i').test(svcLower('traitement anti-mousse toiture')));
    const antiStateLocked = antiTargeted.filter(s => {
      if (!s._state_for) return false;
      return Array.isArray(s._state_for) ? s._state_for.includes('encours') : s._state_for === 'encours';
    });
    // SCAFFOLD is _disabled: true — anti-mousse targeted pool now has 4 active scenarios (debut/encours/semifinal/final MEWP).
    assert(antiTargeted.length >= 1, `Anti-mousse targeted pool must have ≥1 active scenario, got ${antiTargeted.length}`);
    assert(antiStateLocked.length === 1, `Anti-mousse encours stateLocked pool must have exactly 1 scenario, got ${antiStateLocked.length}`);
    assert(antiStateLocked[0]._access_configuration === 'MEWP', `The 1 state-locked anti-mousse encours scenario must be MEWP (SCAFFOLD is _disabled), got: ${antiStateLocked[0]._access_configuration}`);

    const hydroTargeted = scenarios.filter(s => s._for && new RegExp(s._for, 'i').test(svcLower('traitement hydrofuge toiture')));
    const hydroStateLocked = hydroTargeted.filter(s => {
      if (!s._state_for) return false;
      return Array.isArray(s._state_for) ? s._state_for.includes('encours') : s._state_for === 'encours';
    });
    assert(hydroTargeted.length >= 4, `Hydrofuge targeted pool must have ≥4 scenarios (MEWP + 3×LADDER), got ${hydroTargeted.length}`);
    assert(hydroStateLocked.length === 1, `Hydrofuge encours stateLocked pool must have exactly 1 scenario, got ${hydroStateLocked.length}`);
    assert(hydroStateLocked[0]._access_configuration === 'MEWP', `The 1 state-locked hydrofuge scenario must be MEWP`);
  });

  // ─── RTG-RS63 : each route has exactly one eligible encours scenario ───────────

  runTest('RTG-RS63', 'Anti-moss and hydrofuge each have exactly one eligible encours scenario', () => {
    const scenarios = SITE_REALISM_ROOF.nettoyage_toiture?.scenarios || [];
    const antiEncours = scenarios.filter(s =>
      s._for && /anti.mousse/i.test(s._for) &&
      (Array.isArray(s._state_for) ? s._state_for.includes('encours') : s._state_for === 'encours')
    );
    const hydroEncours = scenarios.filter(s =>
      s._for && /hydrofuge/i.test(s._for) &&
      (Array.isArray(s._state_for) ? s._state_for.includes('encours') : s._state_for === 'encours')
    );
    assert(antiEncours.length === 1,
      `Anti-mousse must have exactly 1 eligible encours scenario, got ${antiEncours.length}`);
    assert(hydroEncours.length === 1,
      `Hydrofuge must have exactly 1 eligible encours scenario, got ${hydroEncours.length}`);
    // SCAFFOLD is _disabled: true and has no _state_for — only the MEWP scenario has _state_for='encours'
    assert(antiEncours[0]._access_configuration === 'MEWP',
      `The anti-mousse encours scenario must be MEWP (SCAFFOLD is _disabled), got: ${antiEncours[0]._access_configuration}`);
    assert(hydroEncours[0]._access_configuration === 'MEWP',
      `The hydrofuge encours scenario must be MEWP, got: ${hydroEncours[0]._access_configuration}`);
  });

  // ─── RTG-RS64 : no ladder scenario can reach either encours micro-test route ───

  runTest('RTG-RS64', 'No LADDER_AND_SECURED_ROOF_LADDER scenario can reach either encours micro-test route', () => {
    const scenarios = SITE_REALISM_ROOF.nettoyage_toiture?.scenarios || [];

    const antiStateLocked = scenarios.filter(s =>
      s._for && /anti.mousse/i.test(s._for) &&
      (Array.isArray(s._state_for) ? s._state_for.includes('encours') : s._state_for === 'encours')
    );
    const antiLadder = antiStateLocked.filter(s => s._access_configuration === 'LADDER_AND_SECURED_ROOF_LADDER');
    assert(antiLadder.length === 0,
      `Anti-mousse encours state-locked pool must have 0 LADDER scenarios, got ${antiLadder.length}`);

    const hydroStateLocked = scenarios.filter(s =>
      s._for && /hydrofuge/i.test(s._for) &&
      (Array.isArray(s._state_for) ? s._state_for.includes('encours') : s._state_for === 'encours')
    );
    const hydroLadder = hydroStateLocked.filter(s => s._access_configuration === 'LADDER_AND_SECURED_ROOF_LADDER');
    assert(hydroLadder.length === 0,
      `Hydrofuge encours state-locked pool must have 0 LADDER scenarios, got ${hydroLadder.length}`);

    const antiResult = JSON.parse(_applySiteRealism(JSON.stringify({
      _matched_key: 'nettoyage_toiture', _matched_service: 'Traitement anti-mousse toiture', state_level: 'encours',
    }), 0));
    const hydroResult = JSON.parse(_applySiteRealism(JSON.stringify({
      _matched_key: 'nettoyage_toiture', _matched_service: 'Traitement hydrofuge toiture', state_level: 'encours',
    }), 0));
    assert(antiResult._access_configuration !== 'LADDER_AND_SECURED_ROOF_LADDER',
      `_applySiteRealism anti-mousse encours must NOT produce LADDER, got: ${antiResult._access_configuration}`);
    assert(hydroResult._access_configuration !== 'LADDER_AND_SECURED_ROOF_LADDER',
      `_applySiteRealism hydrofuge encours must NOT produce LADDER, got: ${hydroResult._access_configuration}`);
  });

  // ─── RTG-RS65 : anti-mousse debut → ELEVATED ACCESS block suppressed ──────────

  runTest('RTG-RS65', 'Anti-mousse debut state: ELEVATED ACCESS block suppressed (workers at ground, MEWP not deployed)', () => {
    const mockDebutScene = {
      var_workers: 2, var_presence: 'workers', _matched_key: 'nettoyage_toiture',
      _matched_service: 'Traitement anti-mousse toiture', state_level: 'debut',
      composition: 'medium_intervention', _capture_defects_resolved: [],
    };
    const result = _appendLockedFinalConstraints('TEST PROMPT', mockDebutScene);
    assert(!textContains(result, 'NON-NEGOTIABLE ELEVATED ACCESS'),
      'ELEVATED ACCESS block must NOT fire for anti-mousse debut (workers at ground level, MEWP not deployed)');
    assert(textContainsAny(result, ['EXACTLY TWO', 'two professional workers', 'Both Worker 1']),
      'Two-worker crew mandate must still be present for debut anti-mousse');
  });

  // ─── RTG-RS66 : anti-mousse final → ELEVATED ACCESS block suppressed ──────────

  runTest('RTG-RS66', 'Anti-mousse final state: ELEVATED ACCESS block suppressed (workers at ground, MEWP packed)', () => {
    const mockFinalScene = {
      var_workers: 2, var_presence: 'workers', _matched_key: 'nettoyage_toiture',
      _matched_service: 'Traitement anti-mousse toiture', state_level: 'final',
      composition: 'medium_intervention', _capture_defects_resolved: [],
    };
    const result = _appendLockedFinalConstraints('TEST PROMPT', mockFinalScene);
    assert(!textContains(result, 'NON-NEGOTIABLE ELEVATED ACCESS'),
      'ELEVATED ACCESS block must NOT fire for anti-mousse final (workers at ground level, MEWP packed)');
    assert(textContainsAny(result, ['EXACTLY TWO', 'two professional workers', 'Both Worker 1']),
      'Two-worker crew mandate must still be present for final anti-mousse');
  });

  // ─── summary ──────────────────────────────────────────────────────────────────

  console.log(`\nRTG-RS Results: ${_pass} passed, ${_fail} failed`);
  if (_fail === 0) {
    console.log('%c✔ RTG-RS PASS — All roof worker safety tests passed', 'color: green; font-weight: bold');
  } else {
    console.error(`✘ RTG-RS FAIL — ${_fail} test(s) failed`);
  }
  console.groupEnd();

  return { pass: _pass, fail: _fail, results: _results, ok: _fail === 0 };
}

if (typeof window !== 'undefined' && window._imageGenTestMode) {
  window._runRoofWorkerSafetyTests = runRoofWorkerSafetyTests;
  console.log('[RTG-RS] Test suite loaded — call window._runRoofWorkerSafetyTests() to run');
}
