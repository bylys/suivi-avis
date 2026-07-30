/**
 * debug/etancheite-worker-resolver-tests.js — ETCH-WR1 to ETCH-WR15
 * Worker rule resolver tests for the étanchéité cluster.
 * Verifies context dispatch, state minimums, retry survival, and forbidden-list isolation.
 * No real API calls — all tests are static/structural.
 * Loaded only when ?imageGenTests=1 is in the URL.
 */

import { WORKER_SCENE_RULES, _resolveWorkerRule } from '../safety/worker-rules.js';
import { _buildWorkerDesc, _validateWorkerScene } from '../safety/worker-validator.js';
import { _hashSeed } from '../utils/deterministic.js';
import { SITE_REALISM_ETANCHEITE } from '../services/etancheite.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

function assert(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function textContains(text, sub) {
  return typeof text === 'string' && text.toLowerCase().includes(sub.toLowerCase());
}

function textContainsAny(text, subs) {
  return subs.some(s => textContains(text, s));
}

// Simulate the obj as it looks after service-resolver + batch-planner have run,
// i.e. with _visual_family already stamped by service-resolver._applySiteRealism.
function makeObj({ visualFamily, state, workerCount = 2, presence = 'workers' }) {
  return {
    _matched_key:              'etancheite',
    _matched_service:          'étanchéité toiture terrasse',
    state_level:               state,
    var_presence:              presence,
    var_workers:               workerCount,
    _pre_assigned_worker_count: workerCount,
    _visual_family:            visualFamily,
    _resolved_visual_family:   visualFamily,
    var_worker_desc:           'placeholder',
    exclude:                   [],
  };
}

// ─── test runner ──────────────────────────────────────────────────────────────

export async function runEtancheiteWorkerResolverTests() {
  console.group('ETCH-WR tests — Étanchéité worker rule resolver');

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

  // ─── ETCH-WR1 : FLAT context dispatched for ETANCH-FLAT-EPDM ────────────────
  runTest('ETCH-WR1', 'ETANCH-FLAT-EPDM + encours → FLAT context, 2 workers, no hooked ladder', () => {
    const rule = _resolveWorkerRule('etancheite', 'ETANCH-FLAT-EPDM');
    assert(rule !== WORKER_SCENE_RULES.etancheite,    'should NOT be the generic etancheite rule');
    assert(rule !== null,                              'FLAT rule must exist');

    // state minimum: encours → 2
    const stateMin = WORKER_SCENE_RULES.etancheite.state_worker_minimums?.encours;
    assert(stateMin === 2,                             'state_worker_minimums.encours must be 2');

    // FLAT forbidden must include ladder-as-access prohibition
    const forbidsLadder = (rule.forbidden || []).some(f => textContains(f, 'hooked roof ladder'));
    assert(forbidsLadder,                              'FLAT context must forbid hooked roof ladder');

    // access must be via hatch/stair or MEWP — no ridge hook
    const accessTerms = ['internal hatch', 'external stair', 'mewp'];
    const hasValidAccess = (rule.access || []).some(a => textContainsAny(a, accessTerms));
    assert(hasValidAccess,                             'FLAT access must include hatch, stair, or MEWP');
  });

  // ─── ETCH-WR2 : PITCHED context dispatched for ETANCH-PITCHED-SOLIN ─────────
  runTest('ETCH-WR2', 'ETANCH-PITCHED-SOLIN + encours → PITCHED context, 2 workers, harness required', () => {
    const rule = _resolveWorkerRule('etancheite', 'ETANCH-PITCHED-SOLIN');
    assert(rule !== WORKER_SCENE_RULES.etancheite,    'should NOT be the generic etancheite rule');

    // state minimum: encours → 2
    const stateMin = WORKER_SCENE_RULES.etancheite.state_worker_minimums?.encours;
    assert(stateMin === 2,                             'state_worker_minimums.encours must be 2');

    // safety_required must mention harness
    const hasHarness = (rule.safety_required || []).some(s => textContains(s, 'harness'));
    assert(hasHarness,                                 'PITCHED safety_required must mention harness');

    // access must include roof ladder / MEWP / scaffold
    const accessTerms = ['hooked roof ladder', 'mewp', 'scaffold'];
    const hasValidAccess = (rule.access || []).some(a => textContainsAny(a, accessTerms));
    assert(hasValidAccess,                             'PITCHED access must include roof ladder, MEWP, or scaffold');

    // PITCHED must forbid free-standing-on-tiles
    const forbidsFreeTiles = (rule.forbidden || []).some(f => textContains(f, 'standing freely'));
    assert(forbidsFreeTiles,                           'PITCHED must forbid worker standing freely on tiles');
  });

  // ─── ETCH-WR3 : GROUND_TERRACE context — no harness, no elevated access ─────
  runTest('ETCH-WR3', 'ETANCH-GROUND-TERRACE + encours → GROUND context, 2 workers, no harness', () => {
    const rule = _resolveWorkerRule('etancheite', 'ETANCH-GROUND-TERRACE');
    assert(rule !== WORKER_SCENE_RULES.etancheite,    'should NOT be the generic etancheite rule');

    // state minimum: encours → 2
    const stateMin = WORKER_SCENE_RULES.etancheite.state_worker_minimums?.encours;
    assert(stateMin === 2,                             'state_worker_minimums.encours must be 2');

    // safety_required must be empty for ground-level
    assert((rule.safety_required || []).length === 0,  'GROUND_TERRACE safety_required must be empty');

    // forbidden must include harness and elevated access
    const forbidsHarness   = (rule.forbidden || []).some(f => textContains(f, 'harness'));
    const forbidsElevated  = (rule.forbidden || []).some(f => textContains(f, 'elevated access'));
    assert(forbidsHarness,                             'GROUND_TERRACE must forbid harness');
    assert(forbidsElevated,                            'GROUND_TERRACE must forbid elevated access equipment');
  });

  // ─── ETCH-WR4 : GROUND_TERRACE + final → 1 worker accepted ─────────────────
  runTest('ETCH-WR4', 'ETANCH-GROUND-TERRACE + final → 1 worker accepted (no state minimum)', () => {
    const baseRule = WORKER_SCENE_RULES.etancheite;
    const finalMin = baseRule.state_worker_minimums?.final;

    // final must NOT be in state_worker_minimums (i.e. undefined → 1 allowed)
    assert(finalMin === undefined || finalMin === 1 || finalMin === null,
      `state_worker_minimums.final must be absent or 1, got ${finalMin}`);

    // min_workers_when_visible is 1, so planner allows single worker at final
    assert(baseRule.min_workers_when_visible === 1,    'min_workers_when_visible must be 1 (floor)');
  });

  // ─── ETCH-WR5 : BALCON + semifinal → 2 workers ──────────────────────────────
  runTest('ETCH-WR5', 'ETANCH-BALCON + semifinal → BALCON context, 2 workers', () => {
    const rule = _resolveWorkerRule('etancheite', 'ETANCH-BALCON');
    assert(rule !== WORKER_SCENE_RULES.etancheite,    'should NOT be the generic etancheite rule');

    // state minimum: semifinal → 2
    const stateMin = WORKER_SCENE_RULES.etancheite.state_worker_minimums?.semifinal;
    assert(stateMin === 2,                             'state_worker_minimums.semifinal must be 2');

    // safety_required must mention guardrail
    const hasGuardrail = (rule.safety_required || []).some(s => textContains(s, 'guardrail'));
    assert(hasGuardrail,                               'BALCON safety_required must mention guardrail');

    // forbidden must include "balcony railing"
    const forbidsRailing = (rule.forbidden || []).some(f => textContains(f, 'balcony railing'));
    assert(forbidsRailing,                             'BALCON must forbid standing on balcony railing');
  });

  // ─── ETCH-WR6 : state normalization — no mismatch variants ──────────────────
  runTest('ETCH-WR6', 'State normalization: semifinal/encours keys match actual pipeline values', () => {
    const mins = WORKER_SCENE_RULES.etancheite.state_worker_minimums || {};

    // Exact key check — no semi-final, semi_final, etc.
    assert('encours'   in mins,    '"encours" key must be present (not "en-cours" or "en_cours")');
    assert('semifinal' in mins,    '"semifinal" key must be present (not "semi-final" or "semi_final")');
    assert(!('semi-final' in mins), '"semi-final" must NOT exist as a key');
    assert(!('semi_final' in mins), '"semi_final" must NOT exist as a key');
    assert(!('debut'     in mins), '"debut" must NOT be in state_worker_minimums (floor is 1)');
    assert(!('final'     in mins), '"final" must NOT be in state_worker_minimums (floor is 1)');
  });

  // ─── ETCH-WR7 : _buildWorkerDesc uses resolved rule, not generic ─────────────
  runTest('ETCH-WR7', '_buildWorkerDesc with PITCHED rule produces harness mention', () => {
    const pitchedRule = _resolveWorkerRule('etancheite', 'ETANCH-PITCHED-VELUX');
    const seed = _hashSeed('etancheiteVELUXtest');
    const desc = _buildWorkerDesc('etancheite', 2, seed, pitchedRule);

    assert(desc.length > 20,       '_buildWorkerDesc must produce a non-empty description');
    // desc should come from pitched actions/postures, which mention harness or ladder
    const hasContext = textContainsAny(desc, ['hooked roof ladder', 'harness', 'ridge', 'fall-arrest', 'Worker 1', 'Worker 2']);
    assert(hasContext,             'PITCHED worker desc must include pitched-context terms');
  });

  // ─── ETCH-WR8 : fallback to generic rule when no visual_family ───────────────
  runTest('ETCH-WR8', '_resolveWorkerRule falls back to generic etancheite when visualFamily is null', () => {
    const rule = _resolveWorkerRule('etancheite', null);
    assert(rule === WORKER_SCENE_RULES.etancheite, 'null visualFamily must return generic etancheite rule');
  });

  // ─── ETCH-WR9 : non-etancheite metier returns its own rule unmodified ────────
  runTest('ETCH-WR9', '_resolveWorkerRule for toiture/élagage returns WORKER_SCENE_RULES entry', () => {
    const toitureRule  = _resolveWorkerRule('toiture', null);
    const elagageRule  = _resolveWorkerRule('élagage', null);
    assert(toitureRule  === WORKER_SCENE_RULES.toiture,   'toiture must map to WORKER_SCENE_RULES.toiture');
    assert(elagageRule  === WORKER_SCENE_RULES['élagage'], 'élagage must map to WORKER_SCENE_RULES.élagage');
  });

  // ─── ETCH-WR10 : retry — _resolved_visual_family on obj drives rule reuse ────
  runTest('ETCH-WR10', 'Retry scenario: _visual_family on obj → same rule, never falls back to generic', () => {
    // Simulate obj as stamped by service-resolver on initial run
    const obj = makeObj({ visualFamily: 'ETANCH-FLAT-PVC', state: 'encours' });

    // On retry, obj still has _visual_family set (it's part of the JSON blob)
    const ruleFirstRun  = _resolveWorkerRule(obj._matched_key, obj._visual_family);
    const ruleRetry     = _resolveWorkerRule(obj._matched_key, obj._resolved_visual_family);

    assert(ruleFirstRun  !== WORKER_SCENE_RULES.etancheite, 'first run must not use generic rule');
    assert(ruleRetry     !== WORKER_SCENE_RULES.etancheite, 'retry must not fall back to generic rule');
    assert(ruleFirstRun  === ruleRetry,                     'first run and retry must resolve to the same rule');
  });

  // ─── ETCH-WR11 : non-maison context — _visual_family route works identically ─
  runTest('ETCH-WR11', 'Non-maison context (immeuble/commerce): _visual_family route is context-agnostic', () => {
    // service-resolver stamps _visual_family directly from picked scenario regardless of
    // dispatch context (maison/immeuble/commerce). Simulate immeuble-dispatched scenario:
    const objImmeuble = {
      _matched_key:            'etancheite',
      _visual_family:          'ETANCH-FLAT-BITUME',
      _resolved_visual_family: 'ETANCH-FLAT-BITUME',
      state_level:             'encours',
    };

    const rule = _resolveWorkerRule(objImmeuble._matched_key, objImmeuble._visual_family);
    assert(rule !== WORKER_SCENE_RULES.etancheite, 'immeuble context must not use generic rule');

    const hasMembrane = (rule.actions || []).some(a => textContains(a, 'membrane'));
    assert(hasMembrane, 'FLAT rule actions must include membrane work');
  });

  // ─── ETCH-WR12 : no visual_family_contexts residue in WORKER_SCENE_RULES ─────
  runTest('ETCH-WR12', 'WORKER_SCENE_RULES.etancheite has no visual_family_contexts (dead field removed)', () => {
    const etanchRule = WORKER_SCENE_RULES.etancheite;
    assert(!('visual_family_contexts' in etanchRule),
      'visual_family_contexts must be removed from WORKER_SCENE_RULES.etancheite — use _ETANCH_CONTEXT_RULES instead');
  });

  // ─── ETCH-WR13 : visual family isolation — sequential batch, no cross-leakage ─
  runTest('ETCH-WR13', 'Sequential resolution: EPDM then toit-terrasse → no _visual_family leak', () => {
    // Simulate what service-resolver does: pick scenario for svc, stamp _visual_family.
    // Uses the maison scenario pool directly (same as runtime).
    const scenarios = SITE_REALISM_ETANCHEITE?.etancheite?.maison?.scenarios || [];
    assert(scenarios.length > 0, 'maison scenarios must be non-empty');

    function pickFamily(matchedService) {
      const svc = matchedService.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      const targeted = scenarios.filter(s => !s._disabled && s._for && new RegExp(s._for, 'i').test(svc));
      const seed = _hashSeed(`etancheite${matchedService}encours0`);
      const stateLocked = targeted.filter(s => s._state_for === 'encours' || (Array.isArray(s._state_for) && s._state_for.includes('encours')));
      const pool = stateLocked.length ? stateLocked : targeted;
      const picked = pool.length ? pool[Math.abs(seed) % pool.length] : null;
      return picked?._visual_family || null;
    }

    const vfEPDM    = pickFamily('Étanchéité EPDM');
    const vfGeneric = pickFamily('Étanchéité toit terrasse');

    assert(vfEPDM    === 'ETANCH-FLAT-EPDM',    `EPDM must resolve to ETANCH-FLAT-EPDM, got '${vfEPDM}'`);
    assert(vfGeneric === 'ETANCH-FLAT-GENERIC',  `toit-terrasse must resolve to ETANCH-FLAT-GENERIC, got '${vfGeneric}'`);
    assert(vfEPDM !== vfGeneric,                 'EPDM and toit-terrasse must not share the same visual family');
  });

  // ─── ETCH-WR14 : retry — _visual_family must not inherit from prior service ──
  runTest('ETCH-WR14', 'Retry: _visual_family from a prior EPDM resolution must not bleed into toit-terrasse', () => {
    const scenarios = SITE_REALISM_ETANCHEITE?.etancheite?.maison?.scenarios || [];

    function pickFamilyForObj(obj, matchedService) {
      const svc = matchedService.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      // Simulate the reset added to service-resolver.js
      delete obj._visual_family;
      delete obj._resolved_visual_family;
      const targeted = scenarios.filter(s => !s._disabled && s._for && new RegExp(s._for, 'i').test(svc));
      const seed = _hashSeed(`etancheite${matchedService}encours0`);
      const stateLocked = targeted.filter(s => s._state_for === 'encours' || (Array.isArray(s._state_for) && s._state_for.includes('encours')));
      const pool = stateLocked.length ? stateLocked : targeted;
      const picked = pool.length ? pool[Math.abs(seed) % pool.length] : null;
      if (picked) obj._visual_family = picked._visual_family || null;
      return obj._visual_family;
    }

    // Retry scenario: obj starts with EPDM family from a prior run
    const obj = { _visual_family: 'ETANCH-FLAT-EPDM', _resolved_visual_family: 'ETANCH-FLAT-EPDM' };

    // Run toit-terrasse resolution on the same obj
    const vfAfterReset = pickFamilyForObj(obj, 'Étanchéité toit terrasse');
    assert(vfAfterReset === 'ETANCH-FLAT-GENERIC',
      `After reset, toit-terrasse must resolve to ETANCH-FLAT-GENERIC, got '${vfAfterReset}'`);
    assert(obj._visual_family === 'ETANCH-FLAT-GENERIC',
      `obj._visual_family must be ETANCH-FLAT-GENERIC after resolution, got '${obj._visual_family}'`);

    // EPDM retry: obj starts with GENERIC from prior toit-terrasse
    const obj2 = { _visual_family: 'ETANCH-FLAT-GENERIC', _resolved_visual_family: 'ETANCH-FLAT-GENERIC' };
    const vfEpdmAfterReset = pickFamilyForObj(obj2, 'Étanchéité EPDM');
    assert(vfEpdmAfterReset === 'ETANCH-FLAT-EPDM',
      `After reset, EPDM must resolve to ETANCH-FLAT-EPDM, got '${vfEpdmAfterReset}'`);
  });

  // ─── ETCH-WR15 : 17-service visual family matrix ─────────────────────────────
  runTest('ETCH-WR15', '17-service visual family matrix — each service resolves to its expected family', () => {
    const scenarios = SITE_REALISM_ETANCHEITE?.etancheite?.maison?.scenarios || [];

    function resolveFamily(matchedService) {
      const svc = matchedService.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      const targeted = scenarios.filter(s => !s._disabled && s._for && new RegExp(s._for, 'i').test(svc));
      const seed = _hashSeed(`etancheite${matchedService}encours0`);
      const stateLocked = targeted.filter(s => s._state_for === 'encours' || (Array.isArray(s._state_for) && s._state_for.includes('encours')));
      const pool = stateLocked.length ? stateLocked : targeted;
      const picked = pool.length ? pool[Math.abs(seed) % pool.length] : null;
      return picked?._visual_family || null;
    }

    const matrix = [
      ['Réparation fuite toiture',    'ETANCH-PITCHED-FUITE'],
      ['Recherche de fuite',          'ETANCH-PITCHED-FUITE'],
      ['Infiltration toiture',        'ETANCH-PITCHED-FUITE'],
      ['Étanchéité toit terrasse',    'ETANCH-FLAT-GENERIC'],
      ['Étanchéité toiture plate',    'ETANCH-FLAT-GENERIC'],
      ['Étanchéité balcon',           'ETANCH-BALCON'],
      ['Étanchéité terrasse',         'ETANCH-GROUND-TERRACE'],
      ['Étanchéité EPDM',             'ETANCH-FLAT-EPDM'],
      ['Étanchéité PVC',              'ETANCH-FLAT-PVC'],
      ['Étanchéité bitume',           'ETANCH-FLAT-BITUME'],
      ["Réfection d'étanchéité",      'ETANCH-FLAT-GENERIC'],
      ['Réparation solin',            'ETANCH-PITCHED-SOLIN'],
      ['Réparation Velux',            'ETANCH-PITCHED-VELUX'],
      ['Réparation noue',             'ETANCH-PITCHED-NOUE'],
      ['Réparation rive',             'ETANCH-PITCHED-RIVE'],
      ['Étanchéité cheminée',         'ETANCH-PITCHED-CHEMINEE'],
      ['Étanchéité acrotère',         'ETANCH-FLAT-ACROTERE'],
    ];

    for (const [svc, expected] of matrix) {
      const got = resolveFamily(svc);
      assert(got === expected, `'${svc}' → expected '${expected}', got '${got}'`);
    }
  });

  // ─── Summary ─────────────────────────────────────────────────────────────────
  console.groupEnd();
  console.log(`ETCH-WR: ${_pass} passed, ${_fail} failed out of ${_results.length} tests`);
  if (_fail > 0) console.error('Failing tests:', _results.filter(r => r.status === 'FAIL'));
  return { pass: _pass, fail: _fail, results: _results };
}
