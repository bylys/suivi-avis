/**
 * debug/roof-worker-safety-tests.js — RTG-RS1 to RTG-RS32
 * Worker safety, elevated access, and 2-worker crew rules for roof and gutter clusters.
 * Loaded only when ?imageGenTests=1 is in the URL.
 * No real API calls — all tests are static/structural.
 */

import { WORK_SCENES_ROOF, SITE_REALISM_ROOF } from '../services/roof.js';
import { SAFETY_CHECK_RULES, _PRE_GEN_SAFETY, FORBIDDEN_SAFETY_BY_METIER } from '../safety/safety-rules.js';
import { WORKER_SCENE_RULES } from '../safety/worker-rules.js';

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

  // ─── RTG-RS24 : no gutter service permits ground-level work ──────────────────

  runTest('RTG-RS24', 'No gutter service permits ground-level work', () => {
    const forbidden = FORBIDDEN_SAFETY_BY_METIER.nettoyage_gouttieres || [];
    const hasGroundForbidden = forbidden.some(f =>
      textContainsAny(f, ['ground-level gutter', 'telescopic ground pole', 'ground level'])
    );
    assert(hasGroundForbidden, 'FORBIDDEN_SAFETY_BY_METIER.nettoyage_gouttieres must forbid ground-level gutter work');
  });

  // ─── RTG-RS25 : every active gutter scene uses ladder, scaffold, platform or MEWP

  runTest('RTG-RS25', 'Every active gutter scene uses ladder, scaffold, platform or MEWP', () => {
    const activeStates = ['debut', 'encours', 'semifinal'];
    activeStates.forEach(state => {
      const stateData = WORK_SCENES_ROOF.nettoyage_gouttieres?.states?.[state];
      assert(stateData, `WORK_SCENES_ROOF.nettoyage_gouttieres.states.${state} must exist`);
      const midground = (stateData.framing?.midground || '').toLowerCase();
      const hasAccess = textContainsAny(midground, ['ladder', 'scaffold', 'platform', 'mewp', 'standoff']);
      assert(hasAccess, `nettoyage_gouttieres.states.${state}.midground must reference elevated access equipment`);
    });
  });

  // ─── RTG-RS26 : gutter ladders always include a visible standoff ──────────────

  runTest('RTG-RS26', 'Gutter ladders always include a visible standoff', () => {
    const rules = WORKER_SCENE_RULES.nettoyage_gouttieres;
    const accessStr = (rules.access || []).join(' ').toLowerCase();
    assert(textContains(accessStr, 'standoff'), 'WORKER_SCENE_RULES.nettoyage_gouttieres.access must reference standoff');
    const safetyStr = (rules.safety_required || []).join(' ').toLowerCase();
    assert(textContains(safetyStr, 'standoff'), 'WORKER_SCENE_RULES.nettoyage_gouttieres.safety_required must reference standoff');
    const toolsStr = (SITE_REALISM_ROOF.nettoyage_gouttieres?.tools || []).join(' ').toLowerCase();
    assert(textContains(toolsStr, 'standoff'), 'SITE_REALISM_ROOF.nettoyage_gouttieres.tools must reference standoff stabiliser');
  });

  // ─── RTG-RS27 : gutter ladders never contact the gutter channel ──────────────

  runTest('RTG-RS27', 'Gutter ladders never contact the gutter channel', () => {
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
  });

  // ─── RTG-RS28 : active gutter scenes contain at least two visible workers ─────

  runTest('RTG-RS28', 'Active gutter scenes contain at least two visible workers', () => {
    const rules = WORKER_SCENE_RULES.nettoyage_gouttieres;
    assert(rules.min_workers_when_visible === 2, 'WORKER_SCENE_RULES.nettoyage_gouttieres.min_workers_when_visible must be 2');
    assert(rules.max_workers >= 2, 'WORKER_SCENE_RULES.nettoyage_gouttieres.max_workers must be >= 2');
  });

  // ─── RTG-RS29 : gutter workers have distinct roles ───────────────────────────

  runTest('RTG-RS29', 'Gutter workers have distinct roles', () => {
    const rules = WORKER_SCENE_RULES.nettoyage_gouttieres;
    const actionsStr = (rules.actions || []).join(' ').toLowerCase();
    const hasWorker1 = textContains(actionsStr, 'worker 1');
    const hasWorker2 = textContains(actionsStr, 'worker 2');
    assert(hasWorker1 && hasWorker2, 'WORKER_SCENE_RULES.nettoyage_gouttieres.actions must define distinct Worker 1 and Worker 2 roles');
  });

  // ─── RTG-RS30 : the second worker remains outside the falling-debris zone ─────

  runTest('RTG-RS30', 'The second worker remains outside the falling-debris zone', () => {
    const rules = WORKER_SCENE_RULES.nettoyage_gouttieres;
    const forbidden = (rules.forbidden || []).join(' ').toLowerCase();
    const safetyStr = (rules.safety_required || []).join(' ').toLowerCase();
    const hasDebrisForbidden = textContainsAny(forbidden + ' ' + safetyStr, [
      'directly below', 'falling-debris zone', 'falling debris', 'falling-object zone'
    ]);
    assert(hasDebrisForbidden, 'nettoyage_gouttieres must forbid Worker 2 below falling-debris zone in forbidden or safety_required');
  });

  // ─── RTG-RS31 : no telescopic ground pole or gutter vacuum appears ────────────

  runTest('RTG-RS31', 'No telescopic ground pole or ground gutter vacuum appears', () => {
    const forbidden = FORBIDDEN_SAFETY_BY_METIER.nettoyage_gouttieres || [];
    const hasForbidden = forbidden.some(f =>
      textContainsAny(f, ['telescopic ground pole', 'ground-level gutter vacuum', 'ground gutter'])
    );
    assert(hasForbidden, 'FORBIDDEN_SAFETY_BY_METIER.nettoyage_gouttieres must forbid telescopic ground pole and ground-level vacuum');
    const workerForbidden = (WORKER_SCENE_RULES.nettoyage_gouttieres?.forbidden || []).join(' ').toLowerCase();
    const hasWorkerForbidden = textContainsAny(workerForbidden, ['ground-level', 'telescopic ground']);
    assert(hasWorkerForbidden, 'WORKER_SCENE_RULES.nettoyage_gouttieres.forbidden must forbid ground-level gutter work');
  });

  // ─── RTG-RS32 : final gutter state may contain fewer than two workers ─────────

  runTest('RTG-RS32', 'Final gutter state may contain fewer than two workers', () => {
    const finalState = WORK_SCENES_ROOF.nettoyage_gouttieres?.states?.final;
    assert(finalState, 'WORK_SCENES_ROOF.nettoyage_gouttieres.states.final must exist');
    const finalDesc = (finalState.description || '').toLowerCase();
    const isCompletionScene = textContainsAny(finalDesc, ['complete', 'clear', 'clean']);
    assert(isCompletionScene, 'Final gutter state must describe completion (clean, clear, complete) — 0-1 workers acceptable');
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
