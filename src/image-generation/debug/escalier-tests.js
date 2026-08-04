/**
 * Escalier béton — no-cost test suite
 * Tests:
 *   ESC-SC1..5   : state-lock resolution Escalier béton + encours
 *   ESC-AL1..6   : alias resolution + gate structure
 *   ESC-GT1..23  : gate reject_conditions + mandatory_fields + no-safe-field bypass
 *   ESC-REG1..6  : regression — Seuil/Linteau/Dalle/Ferraillage/Ouverture/Percement no collision
 */

const { _applySiteRealism } = await import('../resolution/service-resolver.js?bust=esc-tests4');
const { SERVICE_VISUAL_GATE_RULES, _SERVICE_GATE_ALIASES } = await import('../safety/safety-rules.js?bust=esc-tests4');
const { checkImageSafety } = await import('../pipeline/safety-check.js?bust=esc-tests4');

export async function runEscalierTests() {
  console.group('ESC tests — Escalier béton state-lock + gate');

  const _results = [];
  let _pass = 0;
  let _fail = 0;

  function test(id, desc, fn) {
    try {
      fn();
      _results.push({ id, desc, status: 'PASS' });
      _pass++;
      console.log(`%c✓ ${id}: ${desc}`, 'color: green');
    } catch (e) {
      _results.push({ id, desc, status: 'FAIL', reason: e.message });
      _fail++;
      console.error(`✘ ${id}: ${desc}\n  ${e.message}`);
    }
  }

  function assert(cond, msg) { if (!cond) throw new Error(`FAIL: ${msg}`); }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function resolveScene(service, state_level) {
    const so = {
      _matched_key:     'maçonnerie',
      _matched_service: service,
      state_level,
      contexte:         'maison_individuelle',
    };
    return JSON.parse(_applySiteRealism(JSON.stringify(so), 0));
  }

  // Evaluate using the gate's fallback reject_conditions (no access config — backward compat)
  function evalGateEsc(fields) {
    const gate = SERVICE_VISUAL_GATE_RULES['Escalier béton'];
    if (!gate) throw new Error('Gate "Escalier béton" not found in SERVICE_VISUAL_GATE_RULES');
    if (gate.mandatory_fields) {
      for (const mf of gate.mandatory_fields) {
        if (typeof fields[mf] !== 'boolean') {
          return { safe: false, first_failed: mf, reason: 'structured_evidence_incomplete' };
        }
      }
    }
    for (const cond of gate.reject_conditions) {
      if ('value' in cond && fields[cond.field] === cond.value) {
        return { safe: false, first_failed: cond.field, reason: cond.reason };
      }
      if (cond.not_exactly_true && fields[cond.field] !== true) {
        return { safe: false, first_failed: cond.field, reason: cond.reason };
      }
    }
    return { safe: true };
  }

  // 19-field exterior PASS
  const PASS_FIELDS = {
    residential_building_entrance_visible:           true,
    small_exterior_concrete_stair_context_visible:   true,
    stepped_stair_formwork_visible:                  true,
    distinct_riser_boards_visible:                   true,
    side_formwork_panels_visible:                    true,
    three_or_four_step_profile_visible:              true,
    ground_supported_compacted_base_visible:         true,
    formwork_bracing_or_stakes_visible:              true,
    active_stair_formwork_adjustment_visible:        true,
    worker_stable_at_ground_level:                   true,
    worker_standing_on_formwork:                     false,
    worker_standing_on_rebar:                        false,
    suspended_stair_formwork_visible:                false,
    fresh_concrete_filling_all_steps_visible:        false,
    large_slab_area_dominant:                        false,
    threshold_only_work_visible:                     false,
    lintel_work_visible:                             false,
    service_visual_match:                            true,
    worker_count_match:                              true,
  };

  // ─── ESC-SC: State-lock ────────────────────────────────────────────────────

  test('ESC-SC1', 'Escalier béton encours → _state_lock_used=true', () => {
    const r = resolveScene('Escalier béton', 'encours');
    assert(r._state_lock_used === true,
      `Expected _state_lock_used=true, got ${r._state_lock_used}`);
  });

  test('ESC-SC2', 'Escalier béton encours → _state_lock_pool_size=1', () => {
    const r = resolveScene('Escalier béton', 'encours');
    assert(r._state_lock_pool_size === 1,
      `Expected pool_size=1, got ${r._state_lock_pool_size}`);
  });

  test('ESC-SC3', 'Escalier béton encours → _visual_family=MACONNERIE-CONCRETE-STAIR-FORMWORK-GROUND', () => {
    const r = resolveScene('Escalier béton', 'encours');
    assert(r._visual_family === 'MACONNERIE-CONCRETE-STAIR-FORMWORK-GROUND',
      `Expected MACONNERIE-CONCRETE-STAIR-FORMWORK-GROUND, got ${r._visual_family}`);
  });

  test('ESC-SC4', 'Escalier béton encours → _access_configuration=GROUND_LEVEL_STAIR_FORMWORK', () => {
    const r = resolveScene('Escalier béton', 'encours');
    assert(r._access_configuration === 'GROUND_LEVEL_STAIR_FORMWORK',
      `Expected GROUND_LEVEL_STAIR_FORMWORK, got ${r._access_configuration}`);
  });

  test('ESC-SC5', 'Escalier béton planifie → _state_lock_used=false (shared pool)', () => {
    const r = resolveScene('Escalier béton', 'planifie');
    assert(r._state_lock_used !== true,
      `Expected state_lock_used=false for planifie, got _state_lock_used=${r._state_lock_used}`);
  });

  // ─── ESC-AL: Aliases + gate structure ─────────────────────────────────────

  test('ESC-AL1', '"escalier beton" alias → Escalier béton', () => {
    const alias = _SERVICE_GATE_ALIASES['escalier beton'];
    assert(alias === 'Escalier béton',
      `alias expected "Escalier béton", got "${alias}"`);
  });

  test('ESC-AL2', '"escalier béton" alias → Escalier béton', () => {
    const alias = _SERVICE_GATE_ALIASES['escalier béton'];
    assert(alias === 'Escalier béton',
      `alias expected "Escalier béton", got "${alias}"`);
  });

  test('ESC-AL3', '"coffrage escalier beton" alias → Escalier béton', () => {
    const alias = _SERVICE_GATE_ALIASES['coffrage escalier beton'];
    assert(alias === 'Escalier béton',
      `alias expected "Escalier béton", got "${alias}"`);
  });

  test('ESC-AL4', '"coffrage escalier béton" alias → Escalier béton', () => {
    const alias = _SERVICE_GATE_ALIASES['coffrage escalier béton'];
    assert(alias === 'Escalier béton',
      `alias expected "Escalier béton", got "${alias}"`);
  });

  test('ESC-AL5', 'Gate "Escalier béton" has 19 mandatory_fields', () => {
    const gate = SERVICE_VISUAL_GATE_RULES['Escalier béton'];
    assert(gate && Array.isArray(gate.mandatory_fields),
      'Gate "Escalier béton" must have mandatory_fields array');
    assert(gate.mandatory_fields.length === 19,
      `Expected 19 mandatory_fields, got ${gate.mandatory_fields.length}`);
  });

  test('ESC-AL6', 'Gate "Escalier béton" has 19 fallback reject_conditions', () => {
    const gate = SERVICE_VISUAL_GATE_RULES['Escalier béton'];
    assert(gate && Array.isArray(gate.reject_conditions),
      'Gate "Escalier béton" must have reject_conditions array');
    assert(gate.reject_conditions.length === 19,
      `Expected 19 fallback reject_conditions, got ${gate.reject_conditions.length}`);
  });

  // ─── ESC-GT: Gate evaluation ───────────────────────────────────────────────

  test('ESC-GT1', 'All PASS_FIELDS (19 booleans) → safe=true', () => {
    const r = evalGateEsc({ ...PASS_FIELDS });
    assert(r.safe === true, `Expected safe=true, got safe=${r.safe}, reason=${r.reason}`);
  });

  test('ESC-GT2', 'worker_standing_on_formwork=true → safety_hazard', () => {
    const r = evalGateEsc({ ...PASS_FIELDS, worker_standing_on_formwork: true });
    assert(r.safe === false && r.reason === 'safety_hazard',
      `Expected safety_hazard, got safe=${r.safe} reason=${r.reason}`);
  });

  test('ESC-GT3', 'worker_standing_on_rebar=true → safety_hazard', () => {
    const r = evalGateEsc({ ...PASS_FIELDS, worker_standing_on_rebar: true });
    assert(r.safe === false && r.reason === 'safety_hazard',
      `Expected safety_hazard, got safe=${r.safe} reason=${r.reason}`);
  });

  test('ESC-GT4', 'suspended_stair_formwork_visible=true → access_violation', () => {
    const r = evalGateEsc({ ...PASS_FIELDS, suspended_stair_formwork_visible: true });
    assert(r.safe === false && r.reason === 'access_violation',
      `Expected access_violation, got safe=${r.safe} reason=${r.reason}`);
  });

  test('ESC-GT5', 'fresh_concrete_filling_all_steps_visible=true → state_mismatch', () => {
    const r = evalGateEsc({ ...PASS_FIELDS, fresh_concrete_filling_all_steps_visible: true });
    assert(r.safe === false && r.reason === 'state_mismatch',
      `Expected state_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('ESC-GT6', 'large_slab_area_dominant=true → service_visual_mismatch (anti-dalle collision)', () => {
    const r = evalGateEsc({ ...PASS_FIELDS, large_slab_area_dominant: true });
    assert(r.safe === false && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('ESC-GT7', 'threshold_only_work_visible=true → service_visual_mismatch (anti-seuil collision)', () => {
    const r = evalGateEsc({ ...PASS_FIELDS, threshold_only_work_visible: true });
    assert(r.safe === false && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('ESC-GT8', 'lintel_work_visible=true → service_visual_mismatch (anti-linteau collision)', () => {
    const r = evalGateEsc({ ...PASS_FIELDS, lintel_work_visible: true });
    assert(r.safe === false && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('ESC-GT9', 'residential_building_entrance_visible=false → service_visual_mismatch', () => {
    const r = evalGateEsc({ ...PASS_FIELDS, residential_building_entrance_visible: false });
    assert(r.safe === false && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('ESC-GT10', 'small_exterior_concrete_stair_context_visible=false → service_visual_mismatch', () => {
    const r = evalGateEsc({ ...PASS_FIELDS, small_exterior_concrete_stair_context_visible: false });
    assert(r.safe === false && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('ESC-GT11', 'stepped_stair_formwork_visible=false → service_visual_mismatch', () => {
    const r = evalGateEsc({ ...PASS_FIELDS, stepped_stair_formwork_visible: false });
    assert(r.safe === false && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('ESC-GT12', 'distinct_riser_boards_visible=false → service_visual_mismatch', () => {
    const r = evalGateEsc({ ...PASS_FIELDS, distinct_riser_boards_visible: false });
    assert(r.safe === false && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('ESC-GT13', 'side_formwork_panels_visible=false → service_visual_mismatch', () => {
    const r = evalGateEsc({ ...PASS_FIELDS, side_formwork_panels_visible: false });
    assert(r.safe === false && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('ESC-GT14', 'three_or_four_step_profile_visible=false → service_visual_mismatch', () => {
    const r = evalGateEsc({ ...PASS_FIELDS, three_or_four_step_profile_visible: false });
    assert(r.safe === false && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('ESC-GT15', 'ground_supported_compacted_base_visible=false → service_visual_mismatch', () => {
    const r = evalGateEsc({ ...PASS_FIELDS, ground_supported_compacted_base_visible: false });
    assert(r.safe === false && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('ESC-GT16', 'formwork_bracing_or_stakes_visible=false → service_visual_mismatch', () => {
    const r = evalGateEsc({ ...PASS_FIELDS, formwork_bracing_or_stakes_visible: false });
    assert(r.safe === false && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('ESC-GT17', 'active_stair_formwork_adjustment_visible=false → state_mismatch', () => {
    const r = evalGateEsc({ ...PASS_FIELDS, active_stair_formwork_adjustment_visible: false });
    assert(r.safe === false && r.reason === 'state_mismatch',
      `Expected state_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('ESC-GT18', 'worker_stable_at_ground_level=false → access_violation', () => {
    const r = evalGateEsc({ ...PASS_FIELDS, worker_stable_at_ground_level: false });
    assert(r.safe === false && r.reason === 'access_violation',
      `Expected access_violation, got safe=${r.safe} reason=${r.reason}`);
  });

  test('ESC-GT19', 'service_visual_match=false → service_visual_mismatch', () => {
    const r = evalGateEsc({ ...PASS_FIELDS, service_visual_match: false });
    assert(r.safe === false && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('ESC-GT20', 'worker_count_match=false → worker_count_mismatch', () => {
    const r = evalGateEsc({ ...PASS_FIELDS, worker_count_match: false });
    assert(r.safe === false && r.reason === 'worker_count_mismatch',
      `Expected worker_count_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('ESC-GT21', 'un champ obligatoire null → structured_evidence_incomplete (B0)', () => {
    const r = evalGateEsc({ ...PASS_FIELDS, stepped_stair_formwork_visible: null });
    assert(r.safe === false && r.reason === 'structured_evidence_incomplete',
      `Expected structured_evidence_incomplete, got safe=${r.safe} reason=${r.reason}`);
  });

  test('ESC-GT22', 'service_visual_match=true mais tous les champs obligatoires null → structured_evidence_incomplete', () => {
    const allNull = {
      residential_building_entrance_visible:           null,
      small_exterior_concrete_stair_context_visible:   null,
      stepped_stair_formwork_visible:                  null,
      distinct_riser_boards_visible:                   null,
      side_formwork_panels_visible:                    null,
      three_or_four_step_profile_visible:              null,
      ground_supported_compacted_base_visible:         null,
      formwork_bracing_or_stakes_visible:              null,
      active_stair_formwork_adjustment_visible:        null,
      worker_stable_at_ground_level:                   null,
      worker_standing_on_formwork:                     null,
      worker_standing_on_rebar:                        null,
      suspended_stair_formwork_visible:                null,
      fresh_concrete_filling_all_steps_visible:        null,
      large_slab_area_dominant:                        null,
      threshold_only_work_visible:                     null,
      lintel_work_visible:                             null,
      service_visual_match:                            true,
      worker_count_match:                              true,
    };
    const r = evalGateEsc(allNull);
    assert(r.safe === false && r.reason === 'structured_evidence_incomplete',
      `Expected structured_evidence_incomplete, got safe=${r.safe} reason=${r.reason}`);
  });

  // ─── ESC-REG: Regression — anti-collision ─────────────────────────────────

  test('ESC-REG1', 'Seuil encours → aucune collision famille Escalier', () => {
    const r = resolveScene('Seuil', 'encours');
    assert(r._visual_family !== 'MACONNERIE-CONCRETE-STAIR-FORMWORK-GROUND',
      `Seuil must not hit Escalier state-lock, got visual_family=${r._visual_family}`);
  });

  test('ESC-REG2', 'Linteau encours → aucune collision famille Escalier', () => {
    const r = resolveScene('Linteau', 'encours');
    assert(r._visual_family !== 'MACONNERIE-CONCRETE-STAIR-FORMWORK-GROUND',
      `Linteau must not hit Escalier state-lock, got visual_family=${r._visual_family}`);
  });

  test('ESC-REG3', 'Dalle béton encours → aucune collision famille Escalier', () => {
    const r = resolveScene('Dalle béton', 'encours');
    assert(r._visual_family !== 'MACONNERIE-CONCRETE-STAIR-FORMWORK-GROUND',
      `Dalle béton must not hit Escalier state-lock, got visual_family=${r._visual_family}`);
  });

  test('ESC-REG4', 'Ferraillage encours → aucune collision famille Escalier', () => {
    const r = resolveScene('Ferraillage', 'encours');
    assert(r._visual_family !== 'MACONNERIE-CONCRETE-STAIR-FORMWORK-GROUND',
      `Ferraillage must not hit Escalier state-lock, got visual_family=${r._visual_family}`);
  });

  test('ESC-REG5', 'Ouverture dans mur encours → aucune collision famille Escalier', () => {
    const r = resolveScene('Ouverture dans mur', 'encours');
    assert(r._visual_family !== 'MACONNERIE-CONCRETE-STAIR-FORMWORK-GROUND',
      `Ouverture dans mur must not hit Escalier state-lock, got visual_family=${r._visual_family}`);
  });

  test('ESC-REG6', 'Percement mur encours → aucune collision famille Escalier', () => {
    const r = resolveScene('Percement mur', 'encours');
    assert(r._visual_family !== 'MACONNERIE-CONCRETE-STAIR-FORMWORK-GROUND',
      `Percement mur must not hit Escalier state-lock, got visual_family=${r._visual_family}`);
  });

  // ─── ESC-GT23 : gate évalue sans champ safe (cause réelle du check_failed) ──
  await (async () => {
    const PASS_NO_SAFE = {
      residential_building_entrance_visible:           true,
      small_exterior_concrete_stair_context_visible:   true,
      stepped_stair_formwork_visible:                  true,
      distinct_riser_boards_visible:                   true,
      side_formwork_panels_visible:                    true,
      three_or_four_step_profile_visible:              true,
      ground_supported_compacted_base_visible:         true,
      formwork_bracing_or_stakes_visible:              true,
      active_stair_formwork_adjustment_visible:        true,
      worker_stable_at_ground_level:                   true,
      worker_standing_on_formwork:                     false,
      worker_standing_on_rebar:                        false,
      suspended_stair_formwork_visible:                false,
      fresh_concrete_filling_all_steps_visible:        false,
      large_slab_area_dominant:                        false,
      threshold_only_work_visible:                     false,
      lintel_work_visible:                             false,
      service_visual_match:                            true,
      worker_count_match:                              true,
      // NO safe field — mirrors real Vision response from gate instruction
    };
    const _fakeB64 = 'AAAA';
    const _fetchOk = async () => ({ ok: true, status: 200 });
    const _readOk  = async () => ({ ok: true, status: 200, data: { choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(PASS_NO_SAFE) } }] } });
    const result = await checkImageSafety(_fakeB64, 'maçonnerie', 'sk-test', {
      fetchImpl: _fetchOk, readResponseImpl: _readOk,
      expectedWorkerCount: 1, matchedService: 'Escalier béton', accessConfiguration: null,
    });
    test('ESC-GT23', 'Vision sans safe → gate ESC évaluée → safe=true (pas check_failed)', () => {
      assert(!result.checkFailed, `got checkFailed=true, reason=${result.reason}`);
      assert(result.safe === true, `expected safe=true, got safe=${result.safe}`);
      assert(result.service_gate === 'Escalier béton', `expected service_gate=Escalier béton, got ${result.service_gate}`);
      assert(result.decision_source === 'structured_service_gate', `expected decision_source=structured_service_gate, got ${result.decision_source}`);
    });
  })();

  // ─── Summary ───────────────────────────────────────────────────────────────

  const total = _pass + _fail;
  console.log(`[ESC-TESTS] Done. ${_pass}/${total} PASS, ${_fail}/${total} FAIL.`);
  console.groupEnd();
  return { suite: 'ESC', pass: _pass, fail: _fail, total, results: _results };
}

window._runEscalierTests = runEscalierTests;
