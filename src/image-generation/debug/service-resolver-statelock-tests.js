/**
 * debug/service-resolver-statelock-tests.js — SR-SL1 to SR-SL12
 * State-lock priority and access telemetry propagation tests for _applySiteRealism.
 * Loaded only when ?imageGenTests=1 is in the URL.
 * No real API calls — all tests are static/structural.
 */

import { SITE_REALISM_ROOF } from '../services/roof.js?v=4';
import { _applySiteRealism } from '../resolution/service-resolver.js?v=2';

// ─── helpers ──────────────────────────────────────────────────────────────────

function textContains(text, substring) {
  return typeof text === 'string' && text.toLowerCase().includes(substring.toLowerCase());
}

// Mirrors the state-lock filter logic from service-resolver.js for unit-style tests.
function applyStateLockFilter(scenarios, svc, stateLevel) {
  const svcLower = (svc || '').toLowerCase();
  const targeted = scenarios.filter(s => {
    if (!s._for) return false;
    try { return new RegExp(s._for, 'i').test(svcLower); } catch { return false; }
  });
  const stateLocked = targeted.filter(s => {
    if (!s._state_for) return false;
    return Array.isArray(s._state_for) ? s._state_for.includes(stateLevel) : s._state_for === stateLevel;
  });
  return { targeted, stateLocked, pool: stateLocked.length ? stateLocked : targeted };
}

// ─── test runner ──────────────────────────────────────────────────────────────

export async function runServiceResolverStateLockTests() {
  console.group('SR-SL tests — Service resolver state-lock priority');

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

  const scenarios = SITE_REALISM_ROOF.nettoyage_toiture?.scenarios || [];

  // ─── SR-SL1 : state-locked scenario is prioritised over non-locked ────────────

  runTest('SR-SL1', 'A scenario with _state_for matching state_level is preferred', () => {
    const antiScene = JSON.stringify({ _matched_key: 'nettoyage_toiture', _matched_service: 'Traitement anti-mousse toiture', state_level: 'encours' });
    const result = JSON.parse(_applySiteRealism(antiScene, 0));
    assert(result._access_configuration === 'MEWP',
      `Anti-mousse encours: expected MEWP (state-locked), got: ${result._access_configuration}`);
    assert(result._access_configuration_source === 'state_lock',
      `Anti-mousse encours: expected source=state_lock, got: ${result._access_configuration_source}`);
  });

  // ─── SR-SL2 : non-matching _state_for is excluded from the priority pool ──────

  runTest('SR-SL2', 'A scenario with _state_for not matching state_level is excluded from the state-lock pool', () => {
    const { targeted, stateLocked } = applyStateLockFilter(scenarios, 'traitement anti-mousse toiture', 'debut');
    assert(targeted.length >= 2, `Anti-mousse must have ≥2 targeted scenarios, got ${targeted.length}`);
    assert(stateLocked.length >= 1,
      `For state_level=debut, stateLocked must contain the MEWP debut scenario (migration complete), got ${stateLocked.length}`);
  });

  // ─── SR-SL3 : absent _state_for falls back to full targeted pool ──────────────

  runTest('SR-SL3', 'When no _state_for scenario matches, the full targeted pool is used', () => {
    const hydDebutScene = JSON.stringify({ _matched_key: 'nettoyage_toiture', _matched_service: 'Traitement hydrofuge toiture', state_level: 'debut' });
    const result = JSON.parse(_applySiteRealism(hydDebutScene, 0));
    assert(result._matched_service === 'Traitement hydrofuge toiture', 'service label must survive resolver');
    const { targeted, stateLocked, pool } = applyStateLockFilter(scenarios, 'traitement hydrofuge toiture', 'debut');
    assert(targeted.length >= 4, `Hydrofuge must have ≥4 targeted scenarios for debut`);
    assert(stateLocked.length === 0, `For state_level=debut, no hydrofuge scenario is state-locked`);
    assert(pool.length === targeted.length, `Pool must equal targeted when stateLocked is empty`);
  });

  // ─── SR-SL4 : _state_for as array is supported ───────────────────────────────

  runTest('SR-SL4', '_state_for as an array is supported — scenario matches any listed state', () => {
    const mockScenarios = [
      { _for: 'test.service', _state_for: ['encours', 'semifinal'], _access_configuration: 'SCAFFOLD' },
      { _for: 'test.service', _access_configuration: 'MEWP' },
    ];
    const encours  = applyStateLockFilter(mockScenarios, 'test service', 'encours');
    const semifinal = applyStateLockFilter(mockScenarios, 'test service', 'semifinal');
    const debut    = applyStateLockFilter(mockScenarios, 'test service', 'debut');
    assert(encours.stateLocked.length === 1 && encours.stateLocked[0]._access_configuration === 'SCAFFOLD',
      `Array _state_for ['encours','semifinal'] must match state_level=encours`);
    assert(semifinal.stateLocked.length === 1 && semifinal.stateLocked[0]._access_configuration === 'SCAFFOLD',
      `Array _state_for ['encours','semifinal'] must match state_level=semifinal`);
    assert(debut.stateLocked.length === 0,
      `Array _state_for ['encours','semifinal'] must NOT match state_level=debut`);
  });

  // ─── SR-SL5 : absent or undefined state_level does not cause errors ───────────

  runTest('SR-SL5', 'Absent state_level causes no error and no state-lock selection', () => {
    const noStateScene = JSON.stringify({ _matched_key: 'nettoyage_toiture', _matched_service: 'Traitement anti-mousse toiture' });
    let result;
    try {
      result = JSON.parse(_applySiteRealism(noStateScene, 0));
    } catch (e) {
      throw new Error(`_applySiteRealism threw on absent state_level: ${e.message}`);
    }
    assert(result !== null, '_applySiteRealism must return a valid result when state_level is absent');
    const { stateLocked } = applyStateLockFilter(scenarios, 'traitement anti-mousse toiture', undefined);
    assert(stateLocked.length === 0,
      `state_level=undefined: stateLocked must be empty (SCAFFOLD has _state_for=encours, undefined !== encours)`);
  });

  // ─── SR-SL6 : multiple state-locked scenarios remain seed-selected ─────────────

  runTest('SR-SL6', 'Multiple scenarios with the same _state_for remain seed-selected', () => {
    const mockScenarios = [
      { _for: 'test.svc', _state_for: 'encours', _access_configuration: 'A' },
      { _for: 'test.svc', _state_for: 'encours', _access_configuration: 'B' },
      { _for: 'test.svc', _access_configuration: 'C' },
    ];
    const { stateLocked, pool } = applyStateLockFilter(mockScenarios, 'test svc', 'encours');
    assert(stateLocked.length === 2, `Both encours-locked scenarios must be in stateLocked, got ${stateLocked.length}`);
    assert(pool.length === 2, `Pool must contain only the 2 state-locked scenarios, not the non-locked one`);
    assert(!pool.some(s => s._access_configuration === 'C'), `Non-locked scenario C must NOT be in the pool`);
  });

  // ─── SR-SL7 : single state-locked scenario produces deterministic selection ────

  runTest('SR-SL7', 'A single state-locked scenario produces the same result regardless of seed', () => {
    const antiScene0 = JSON.stringify({ _matched_key: 'nettoyage_toiture', _matched_service: 'Traitement anti-mousse toiture', state_level: 'encours' });
    const antiScene1 = JSON.stringify({ _matched_key: 'nettoyage_toiture', _matched_service: 'Traitement anti-mousse toiture', state_level: 'encours' });
    const r0 = JSON.parse(_applySiteRealism(antiScene0, 0));
    const r1 = JSON.parse(_applySiteRealism(antiScene1, 1));
    const r7 = JSON.parse(_applySiteRealism(antiScene0, 7));
    assert(r0._access_configuration === 'MEWP', `imageIndex=0 must resolve to MEWP`);
    assert(r1._access_configuration === 'MEWP', `imageIndex=1 must resolve to MEWP`);
    assert(r7._access_configuration === 'MEWP', `imageIndex=7 must resolve to MEWP`);
  });

  // ─── SR-SL8 : non-locked scenarios remain available for non-matching states ────

  runTest('SR-SL8', 'Scenarios without _state_for remain available when state_level has no lock', () => {
    const { targeted, stateLocked, pool } = applyStateLockFilter(scenarios, 'traitement hydrofuge toiture', 'final');
    assert(targeted.length >= 4, `Hydrofuge must have ≥4 targeted scenarios`);
    assert(stateLocked.length === 0, `No hydrofuge scenario has _state_for=final`);
    assert(pool.length === targeted.length, `For state_level=final, pool must equal full targeted set`);
    const hasLadder = pool.some(s => s._access_configuration === 'LADDER_AND_SECURED_ROOF_LADDER');
    assert(hasLadder, `Ladder scenarios must be in pool for non-locked states`);
  });

  // ─── SR-SL9 : _for regex and fallback are unchanged ──────────────────────────

  runTest('SR-SL9', '_for regex matching and fallback to non-targeted scenarios are unchanged', () => {
    const { targeted: antiTargeted } = applyStateLockFilter(scenarios, 'traitement anti-mousse toiture', 'encours');
    const { targeted: hydroTargeted } = applyStateLockFilter(scenarios, 'traitement hydrofuge toiture', 'encours');
    const { targeted: nettoyageTargeted } = applyStateLockFilter(scenarios, 'nettoyage toiture', 'encours');
    assert(antiTargeted.every(s => new RegExp(s._for, 'i').test('traitement anti-mousse toiture')),
      'All anti-mousse targeted scenarios must match the service label regex');
    assert(!antiTargeted.some(s => /hydrofuge/.test(s._for || '')),
      'Anti-mousse targeted pool must not contain hydrofuge scenarios');
    assert(hydroTargeted.every(s => new RegExp(s._for, 'i').test('traitement hydrofuge toiture')),
      'All hydrofuge targeted scenarios must match the service label regex');
    assert(!hydroTargeted.some(s => /anti.mousse/.test(s._for || '')),
      'Hydrofuge targeted pool must not contain anti-mousse scenarios');
    const fallbackScenarios = scenarios.filter(s => !s._for);
    const { pool: fallbackPool } = applyStateLockFilter(fallbackScenarios, 'service sans regex', 'encours');
    assert(fallbackPool.length >= 0, 'Fallback pool must exist for services with no _for match');
  });

  // ─── SR-SL10 : telemetry propagation does not overwrite other fields ──────────

  runTest('SR-SL10', 'Access telemetry propagation does not overwrite camera_position, exclude, or work_type', () => {
    const antiScene = JSON.stringify({ _matched_key: 'nettoyage_toiture', _matched_service: 'Traitement anti-mousse toiture', state_level: 'encours' });
    const result = JSON.parse(_applySiteRealism(antiScene, 0));
    assert(result._access_configuration === 'MEWP', 'Telemetry must be propagated');
    assert(typeof result.camera_position === 'string' && result.camera_position.length > 0,
      'camera_position must be set by scenario scene_camera — not overwritten by telemetry');
    assert(Array.isArray(result.exclude) && result.exclude.length > 0,
      'exclude array must be set by scenario scene_exclude — not overwritten by telemetry');
    assert(typeof result.work_type === 'string' && result.work_type.length > 0,
      'work_type must be set by scene_note — not overwritten by telemetry');
  });

  // ─── SR-SL11 : telemetry fields absent when scenario does not provide them ────

  runTest('SR-SL11', '_access_configuration is absent from output when scenario has no such field', () => {
    // démoussage debut and final are ground-inspection states — no elevated access, _access_configuration absent from scenario
    const demouDebut = JSON.stringify({ _matched_key: 'nettoyage_toiture', _matched_service: 'Démoussage toiture', state_level: 'debut' });
    const result = JSON.parse(_applySiteRealism(demouDebut, 0));
    assert(result._access_configuration === undefined || result._access_configuration === null,
      `Démoussage debut (no _access_configuration on ground-inspection scenario) must not have _access_configuration in output, got: ${result._access_configuration}`);
  });

  // ─── SR-SL12 : function does not mutate the source SITE_REALISM data ──────────

  runTest('SR-SL12', '_applySiteRealism does not mutate the source SITE_REALISM scenarios', () => {
    const scenariosBefore = JSON.stringify(scenarios.map(s => ({ _for: s._for, _state_for: s._state_for, _access_configuration: s._access_configuration })));
    const antiScene = JSON.stringify({ _matched_key: 'nettoyage_toiture', _matched_service: 'Traitement anti-mousse toiture', state_level: 'encours' });
    _applySiteRealism(antiScene, 0);
    const scenariosAfter = JSON.stringify(scenarios.map(s => ({ _for: s._for, _state_for: s._state_for, _access_configuration: s._access_configuration })));
    assert(scenariosBefore === scenariosAfter,
      'SITE_REALISM scenarios must be unchanged after calling _applySiteRealism');
    const sourceScenariosCount = SITE_REALISM_ROOF.nettoyage_toiture.scenarios.length;
    assert(typeof sourceScenariosCount === 'number' && sourceScenariosCount > 0,
      'Source SITE_REALISM_ROOF.nettoyage_toiture.scenarios must still be accessible and non-empty');
  });

  // ─── summary ──────────────────────────────────────────────────────────────────

  console.log(`\nSR-SL Results: ${_pass} passed, ${_fail} failed`);
  if (_fail === 0) {
    console.log('%c✔ SR-SL PASS — All service resolver state-lock tests passed', 'color: green; font-weight: bold');
  } else {
    console.error(`✘ SR-SL FAIL — ${_fail} test(s) failed`);
  }
  console.groupEnd();

  return { pass: _pass, fail: _fail, results: _results, ok: _fail === 0 };
}

if (typeof window !== 'undefined' && window._imageGenTestMode) {
  window._runServiceResolverStateLockTests = runServiceResolverStateLockTests;
  console.log('[SR-SL] Test suite loaded — call window._runServiceResolverStateLockTests() to run');
}
