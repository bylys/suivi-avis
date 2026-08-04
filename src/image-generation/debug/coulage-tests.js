/**
 * Coulage dalle — no-cost test suite
 * Tests:
 *   COU-SC1..4   : state-lock resolution Coulage dalle + encours
 *   COU-AL1..4   : alias resolution + gate structure
 *   COU-GT1..22  : gate reject_conditions + mandatory_fields + no-safe-field bypass
 *   COU-REG1..5  : regression — Dalle béton / Ferraillage / Fondation / Terrasse béton / Escalier béton no collision
 */

const { _applySiteRealism } = await import('../resolution/service-resolver.js?bust=cou-tests2');
const { SERVICE_VISUAL_GATE_RULES, _SERVICE_GATE_ALIASES } = await import('../safety/safety-rules.js?bust=cou-tests2');
const { checkImageSafety } = await import('../pipeline/safety-check.js?bust=cou-tests2');

export async function runCoulageTests() {
  console.group('COU tests — Coulage dalle state-lock + gate');

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

  function evalGateCou(fields) {
    const gate = SERVICE_VISUAL_GATE_RULES['Coulage dalle'];
    if (!gate) throw new Error('Gate "Coulage dalle" not found in SERVICE_VISUAL_GATE_RULES');
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

  // 21-field PASS set
  const PASS_FIELDS = {
    slab_formwork_visible:                               true,
    fresh_concrete_actively_poured_visible:              true,
    concrete_delivery_source_visible:                    true,
    delivery_source_connected_to_pour:                   true,
    partial_poured_and_unpoured_zones_visible:           true,
    reinforcement_visible_in_unpoured_zone:              true,
    active_concrete_screeding_or_spreading_visible:      true,
    workers_stable_outside_fresh_concrete:               true,
    worker_standing_in_fresh_concrete:                   false,
    worker_standing_on_reinforcement:                    false,
    reinforcement_unstable_or_displaced_by_worker:       false,
    reinforcement_insufficiently_supported:              false,
    visible_mesh_deformation_under_worker:               false,
    worker_posture_unstable_on_reinforcement:            false,
    protruding_rebar_impalement_hazard_visible:          false,
    completed_slab_dominant:                             false,
    prepour_rebar_preparation_only:                      false,
    foundation_trench_dominant:                          false,
    large_industrial_construction_dominant:              false,
    service_visual_match:                                true,
    worker_count_match:                                  true,
  };

  // ─── COU-SC: State-lock ────────────────────────────────────────────────────

  test('COU-SC1', 'Coulage dalle encours → _state_lock_used=true', () => {
    const r = resolveScene('Coulage dalle', 'encours');
    assert(r._state_lock_used === true,
      `Expected _state_lock_used=true, got ${r._state_lock_used}`);
  });

  test('COU-SC2', 'Coulage dalle encours → _visual_family=MACONNERIE-CONCRETE-SLAB-POUR', () => {
    const r = resolveScene('Coulage dalle', 'encours');
    assert(r._visual_family === 'MACONNERIE-CONCRETE-SLAB-POUR',
      `Expected MACONNERIE-CONCRETE-SLAB-POUR, got ${r._visual_family}`);
  });

  test('COU-SC3', 'Coulage dalle encours → _access_configuration=GROUND_LEVEL_SLAB_POUR', () => {
    const r = resolveScene('Coulage dalle', 'encours');
    assert(r._access_configuration === 'GROUND_LEVEL_SLAB_POUR',
      `Expected GROUND_LEVEL_SLAB_POUR, got ${r._access_configuration}`);
  });

  test('COU-SC4', 'Coulage dalle debut → state-lock NOT active (no _state_for match)', () => {
    const r = resolveScene('Coulage dalle', 'debut');
    assert(r._state_lock_used !== true,
      `Expected _state_lock_used falsy for debut, got ${r._state_lock_used}`);
  });

  // ─── COU-AL: Aliases + gate structure ─────────────────────────────────────

  test('COU-AL1', '_SERVICE_GATE_ALIASES["coulage dalle"] === "Coulage dalle"', () => {
    assert(_SERVICE_GATE_ALIASES['coulage dalle'] === 'Coulage dalle',
      `Got: ${_SERVICE_GATE_ALIASES['coulage dalle']}`);
  });

  test('COU-AL2', '_SERVICE_GATE_ALIASES["coulage dalle beton"] === "Coulage dalle" (not Dalle béton)', () => {
    assert(_SERVICE_GATE_ALIASES['coulage dalle beton'] === 'Coulage dalle',
      `Got: ${_SERVICE_GATE_ALIASES['coulage dalle beton']}`);
  });

  test('COU-AL3', 'SERVICE_VISUAL_GATE_RULES["Coulage dalle"] exists', () => {
    assert(!!SERVICE_VISUAL_GATE_RULES['Coulage dalle'],
      'Gate "Coulage dalle" not found in SERVICE_VISUAL_GATE_RULES');
  });

  test('COU-AL4', 'mandatory_fields.length === 21', () => {
    const gate = SERVICE_VISUAL_GATE_RULES['Coulage dalle'];
    assert(gate.mandatory_fields.length === 21,
      `Expected 21 mandatory_fields, got ${gate.mandatory_fields.length}`);
  });

  // ─── COU-GT: Gate logic ────────────────────────────────────────────────────

  test('COU-GT1', 'PASS_FIELDS → safe=true', () => {
    const r = evalGateCou({ ...PASS_FIELDS });
    assert(r.safe === true, `Expected safe=true, got safe=${r.safe}, failed=${r.first_failed}`);
  });

  test('COU-GT2', 'worker_standing_in_fresh_concrete=true → safety_violation', () => {
    const r = evalGateCou({ ...PASS_FIELDS, worker_standing_in_fresh_concrete: true });
    assert(!r.safe && r.reason === 'safety_violation',
      `Expected safety_violation, got ${r.reason}`);
  });

  test('COU-GT3', 'worker_standing_on_reinforcement=true alone → PASS (informational only)', () => {
    const r = evalGateCou({ ...PASS_FIELDS, worker_standing_on_reinforcement: true });
    assert(r.safe === true,
      `worker_standing_on_reinforcement alone must not reject — got safe=${r.safe}, reason=${r.reason}`);
  });

  test('COU-GT4', 'completed_slab_dominant=true → state_mismatch', () => {
    const r = evalGateCou({ ...PASS_FIELDS, completed_slab_dominant: true });
    assert(!r.safe && r.reason === 'state_mismatch',
      `Expected state_mismatch, got ${r.reason}`);
  });

  test('COU-GT5', 'prepour_rebar_preparation_only=true → state_mismatch', () => {
    const r = evalGateCou({ ...PASS_FIELDS, prepour_rebar_preparation_only: true });
    assert(!r.safe && r.reason === 'state_mismatch',
      `Expected state_mismatch, got ${r.reason}`);
  });

  test('COU-GT6', 'foundation_trench_dominant=true → service_visual_mismatch', () => {
    const r = evalGateCou({ ...PASS_FIELDS, foundation_trench_dominant: true });
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got ${r.reason}`);
  });

  test('COU-GT7', 'large_industrial_construction_dominant=true → service_visual_mismatch', () => {
    const r = evalGateCou({ ...PASS_FIELDS, large_industrial_construction_dominant: true });
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got ${r.reason}`);
  });

  test('COU-GT8', 'slab_formwork_visible=false → service_visual_mismatch', () => {
    const r = evalGateCou({ ...PASS_FIELDS, slab_formwork_visible: false });
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got ${r.reason}`);
  });

  test('COU-GT9', 'slab_formwork_visible=null → structured_evidence_incomplete', () => {
    const r = evalGateCou({ ...PASS_FIELDS, slab_formwork_visible: null });
    assert(!r.safe && r.reason === 'structured_evidence_incomplete',
      `Expected structured_evidence_incomplete, got ${r.reason}`);
  });

  test('COU-GT10', 'fresh_concrete_actively_poured_visible=false → state_mismatch', () => {
    const r = evalGateCou({ ...PASS_FIELDS, fresh_concrete_actively_poured_visible: false });
    assert(!r.safe && r.reason === 'state_mismatch',
      `Expected state_mismatch, got ${r.reason}`);
  });

  test('COU-GT11', 'concrete_delivery_source_visible=false → service_visual_mismatch', () => {
    const r = evalGateCou({ ...PASS_FIELDS, concrete_delivery_source_visible: false });
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got ${r.reason}`);
  });

  test('COU-GT12', 'delivery_source_connected_to_pour=false → service_visual_mismatch', () => {
    const r = evalGateCou({ ...PASS_FIELDS, delivery_source_connected_to_pour: false });
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got ${r.reason}`);
  });

  test('COU-GT13', 'partial_poured_and_unpoured_zones_visible=false → state_mismatch', () => {
    const r = evalGateCou({ ...PASS_FIELDS, partial_poured_and_unpoured_zones_visible: false });
    assert(!r.safe && r.reason === 'state_mismatch',
      `Expected state_mismatch, got ${r.reason}`);
  });

  test('COU-GT14', 'reinforcement_visible_in_unpoured_zone=false → service_visual_mismatch', () => {
    const r = evalGateCou({ ...PASS_FIELDS, reinforcement_visible_in_unpoured_zone: false });
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got ${r.reason}`);
  });

  test('COU-GT15', 'active_concrete_screeding_or_spreading_visible=false → service_visual_mismatch', () => {
    const r = evalGateCou({ ...PASS_FIELDS, active_concrete_screeding_or_spreading_visible: false });
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got ${r.reason}`);
  });

  test('COU-GT16', 'workers_stable_outside_fresh_concrete=false → access_violation', () => {
    const r = evalGateCou({ ...PASS_FIELDS, workers_stable_outside_fresh_concrete: false });
    assert(!r.safe && r.reason === 'access_violation',
      `Expected access_violation, got ${r.reason}`);
  });

  test('COU-GT17', 'service_visual_match=false → service_visual_mismatch', () => {
    const r = evalGateCou({ ...PASS_FIELDS, service_visual_match: false });
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got ${r.reason}`);
  });

  test('COU-GT18', 'worker_count_match=false → worker_count_mismatch', () => {
    const r = evalGateCou({ ...PASS_FIELDS, worker_count_match: false });
    assert(!r.safe && r.reason === 'worker_count_mismatch',
      `Expected worker_count_mismatch, got ${r.reason}`);
  });

  test('COU-GT19', 'missing mandatory field (undefined) → structured_evidence_incomplete', () => {
    const partial = { ...PASS_FIELDS };
    delete partial.concrete_delivery_source_visible;
    const r = evalGateCou(partial);
    assert(!r.safe && r.reason === 'structured_evidence_incomplete',
      `Expected structured_evidence_incomplete, got ${r.reason}`);
  });

  test('COU-GT20', 'checkImageSafety: safe=true when all PASS_FIELDS present', async () => {
    const obj = {
      ...PASS_FIELDS,
      safe: false,
      severity: 'none',
      _access_configuration: 'GROUND_LEVEL_SLAB_POUR',
      _matched_service: 'coulage dalle',
      var_workers: 2,
      var_presence: 'workers',
    };
    const result = await checkImageSafety(obj, 'Coulage dalle');
    assert(result.safe === true,
      `Expected safe=true from checkImageSafety, got safe=${result.safe}, reason=${result.reason}`);
  });

  test('COU-GT21', 'checkImageSafety: worker_standing_in_fresh_concrete=true → safe=false', async () => {
    const obj = {
      ...PASS_FIELDS,
      worker_standing_in_fresh_concrete: true,
      safe: true,
      severity: 'none',
      _access_configuration: 'GROUND_LEVEL_SLAB_POUR',
      _matched_service: 'coulage dalle',
      var_workers: 2,
      var_presence: 'workers',
    };
    const result = await checkImageSafety(obj, 'Coulage dalle');
    assert(result.safe === false,
      `Expected safe=false, got safe=${result.safe}`);
  });

  test('COU-GT22', 'gate has no "safe" field in mandatory_fields (bypass guard)', () => {
    const gate = SERVICE_VISUAL_GATE_RULES['Coulage dalle'];
    assert(!gate.mandatory_fields.includes('safe'),
      '"safe" must not appear in mandatory_fields');
  });

  test('COU-GT23', 'worker on stable mesh, no hazards → PASS', () => {
    const r = evalGateCou({
      ...PASS_FIELDS,
      worker_standing_on_reinforcement:              true,
      reinforcement_unstable_or_displaced_by_worker: false,
      reinforcement_insufficiently_supported:        false,
      visible_mesh_deformation_under_worker:         false,
      worker_posture_unstable_on_reinforcement:      false,
      protruding_rebar_impalement_hazard_visible:    false,
    });
    assert(r.safe === true,
      `Worker on stable mesh with no hazards must PASS — got safe=${r.safe}, reason=${r.reason}`);
  });

  test('COU-GT24', 'reinforcement_unstable_or_displaced_by_worker=true → access_violation', () => {
    const r = evalGateCou({ ...PASS_FIELDS, reinforcement_unstable_or_displaced_by_worker: true });
    assert(!r.safe && r.reason === 'access_violation',
      `Expected access_violation, got ${r.reason}`);
  });

  test('COU-GT25', 'reinforcement_insufficiently_supported=true → access_violation', () => {
    const r = evalGateCou({ ...PASS_FIELDS, reinforcement_insufficiently_supported: true });
    assert(!r.safe && r.reason === 'access_violation',
      `Expected access_violation, got ${r.reason}`);
  });

  test('COU-GT26', 'visible_mesh_deformation_under_worker=true → access_violation', () => {
    const r = evalGateCou({ ...PASS_FIELDS, visible_mesh_deformation_under_worker: true });
    assert(!r.safe && r.reason === 'access_violation',
      `Expected access_violation, got ${r.reason}`);
  });

  test('COU-GT27', 'worker_posture_unstable_on_reinforcement=true → access_violation', () => {
    const r = evalGateCou({ ...PASS_FIELDS, worker_posture_unstable_on_reinforcement: true });
    assert(!r.safe && r.reason === 'access_violation',
      `Expected access_violation, got ${r.reason}`);
  });

  test('COU-GT28', 'protruding_rebar_impalement_hazard_visible=true → access_violation', () => {
    const r = evalGateCou({ ...PASS_FIELDS, protruding_rebar_impalement_hazard_visible: true });
    assert(!r.safe && r.reason === 'access_violation',
      `Expected access_violation, got ${r.reason}`);
  });

  // ─── COU-REG: Regression — no collision ───────────────────────────────────

  test('COU-REG1', 'Dalle béton encours → _visual_family stays MACONNERIE-CONCRETE-SLAB-REBAR (not POUR)', () => {
    const r = resolveScene('Dalle béton', 'encours');
    assert(r._visual_family !== 'MACONNERIE-CONCRETE-SLAB-POUR',
      `Dalle béton collision: got ${r._visual_family}`);
  });

  test('COU-REG2', 'Ferraillage encours → no Coulage dalle state-lock', () => {
    const r = resolveScene('Ferraillage', 'encours');
    assert(r._access_configuration !== 'GROUND_LEVEL_SLAB_POUR',
      `Ferraillage collision: got access_configuration=${r._access_configuration}`);
  });

  test('COU-REG3', 'Fondation encours → no Coulage dalle state-lock', () => {
    const r = resolveScene('Fondation', 'encours');
    assert(r._access_configuration !== 'GROUND_LEVEL_SLAB_POUR',
      `Fondation collision: got access_configuration=${r._access_configuration}`);
  });

  test('COU-REG4', '_SERVICE_GATE_ALIASES["dalle beton"] === "Dalle béton" (not Coulage dalle)', () => {
    assert(_SERVICE_GATE_ALIASES['dalle beton'] === 'Dalle béton',
      `Got: ${_SERVICE_GATE_ALIASES['dalle beton']}`);
  });

  test('COU-REG5', 'Escalier béton encours → no Coulage dalle state-lock', () => {
    const r = resolveScene('Escalier béton', 'encours');
    assert(r._access_configuration !== 'GROUND_LEVEL_SLAB_POUR',
      `Escalier collision: got access_configuration=${r._access_configuration}`);
  });

  // ─── Summary ───────────────────────────────────────────────────────────────

  console.groupEnd();
  const total = _pass + _fail;
  console.log(`COU: ${_pass}/${total} PASS${_fail ? ` — ${_fail} FAIL` : ''}`);
  return { pass: _pass, fail: _fail, total, results: _results };
}
