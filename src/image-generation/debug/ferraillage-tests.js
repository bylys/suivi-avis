/**
 * Ferraillage — no-cost test suite
 * Tests:
 *   FER-SC1..4  : state-lock resolution Ferraillage + encours
 *   FER-AL1..5  : alias resolution + gate structure
 *   FER-GT1..16 : gate reject_conditions + mandatory_fields
 *   FER-REG1..5 : regression — ferraillage dalle, Fondation, Dalle béton, no FON collision, no DAL collision
 */

const { _applySiteRealism }   = await import('../resolution/service-resolver.js?bust=fer-tests1');
const { SERVICE_VISUAL_GATE_RULES, _SERVICE_GATE_ALIASES } = await import('../safety/safety-rules.js?bust=fer-tests1');

export async function runFerraillageTests() {
  console.group('FER tests — Ferraillage state-lock + gate');

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

  function evalGateFer(fields) {
    const gate = SERVICE_VISUAL_GATE_RULES['Ferraillage'];
    if (!gate) throw new Error('Gate "Ferraillage" not found in SERVICE_VISUAL_GATE_RULES');
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

  const PASS_FIELDS = {
    reinforcement_cage_visible:       true,
    longitudinal_rebar_visible:       true,
    regular_stirrups_visible:         true,
    active_rebar_tying_visible:       true,
    tying_tool_in_contact_with_rebar: true,
    partial_rebar_assembly_visible:   true,
    rebar_supported_on_low_stands:    true,
    worker_stable_at_ground_level:    true,
    worker_standing_on_rebar:         false,
    foundation_trench_dominant:       false,
    horizontal_slab_mesh_dominant:    false,
    fresh_concrete_visible:           false,
    concrete_pouring_visible:         false,
    formwork_removal_visible:         false,
    service_visual_match:             true,
    worker_count_match:               true,
  };

  // ─── FER-SC: State-lock ─────────────────────────────────────────────────────

  test('FER-SC1', 'Ferraillage encours → _state_lock_used=true', () => {
    const r = resolveScene('Ferraillage', 'encours');
    assert(r._state_lock_used === true,
      `_state_lock_used expected true, got ${r._state_lock_used}`);
  });

  test('FER-SC2', 'Ferraillage encours → _state_lock_pool_size=1', () => {
    const r = resolveScene('Ferraillage', 'encours');
    assert(r._state_lock_pool_size === 1,
      `_state_lock_pool_size expected 1, got ${r._state_lock_pool_size}`);
  });

  test('FER-SC3', 'Ferraillage encours → _visual_family=MACONNERIE-REBAR-ASSEMBLY-GROUND', () => {
    const r = resolveScene('Ferraillage', 'encours');
    assert(r._visual_family === 'MACONNERIE-REBAR-ASSEMBLY-GROUND',
      `_visual_family expected MACONNERIE-REBAR-ASSEMBLY-GROUND, got ${r._visual_family}`);
  });

  test('FER-SC4', 'Ferraillage encours → _access_configuration=GROUND_LEVEL_REBAR_FABRICATION', () => {
    const r = resolveScene('Ferraillage', 'encours');
    assert(r._access_configuration === 'GROUND_LEVEL_REBAR_FABRICATION',
      `_access_configuration expected GROUND_LEVEL_REBAR_FABRICATION, got ${r._access_configuration}`);
  });

  // ─── FER-AL: Aliases + gate structure ──────────────────────────────────────

  test('FER-AL1', '"ferraillage" alias → Ferraillage', () => {
    const alias = _SERVICE_GATE_ALIASES['ferraillage'];
    assert(alias === 'Ferraillage',
      `alias expected "Ferraillage", got "${alias}"`);
  });

  test('FER-AL2', '"travaux de ferraillage" alias → Ferraillage', () => {
    const alias = _SERVICE_GATE_ALIASES['travaux de ferraillage'];
    assert(alias === 'Ferraillage',
      `alias expected "Ferraillage", got "${alias}"`);
  });

  test('FER-AL3', '"assemblage armature" alias → Ferraillage', () => {
    const alias = _SERVICE_GATE_ALIASES['assemblage armature'];
    assert(alias === 'Ferraillage',
      `alias expected "Ferraillage", got "${alias}"`);
  });

  test('FER-AL4', 'Gate Ferraillage has 14 mandatory_fields', () => {
    const gate = SERVICE_VISUAL_GATE_RULES['Ferraillage'];
    assert(gate && Array.isArray(gate.mandatory_fields),
      'Gate Ferraillage must have mandatory_fields array');
    assert(gate.mandatory_fields.length === 14,
      `Expected 14 mandatory_fields, got ${gate.mandatory_fields.length}`);
  });

  test('FER-AL5', 'Gate Ferraillage has 16 reject_conditions', () => {
    const gate = SERVICE_VISUAL_GATE_RULES['Ferraillage'];
    assert(gate && Array.isArray(gate.reject_conditions),
      'Gate Ferraillage must have reject_conditions array');
    assert(gate.reject_conditions.length === 16,
      `Expected 16 reject_conditions, got ${gate.reject_conditions.length}`);
  });

  // ─── FER-GT: Gate evaluation ────────────────────────────────────────────────

  test('FER-GT1', 'All PASS_FIELDS → safe=true', () => {
    const r = evalGateFer({ ...PASS_FIELDS });
    assert(r.safe === true, `Expected safe=true, got safe=${r.safe}, reason=${r.reason}`);
  });

  test('FER-GT2', 'worker_standing_on_rebar=true → access_violation', () => {
    const r = evalGateFer({ ...PASS_FIELDS, worker_standing_on_rebar: true });
    assert(r.safe === false && r.reason === 'access_violation',
      `Expected access_violation, got safe=${r.safe} reason=${r.reason}`);
  });

  test('FER-GT3', 'foundation_trench_dominant=true → service_visual_mismatch', () => {
    const r = evalGateFer({ ...PASS_FIELDS, foundation_trench_dominant: true });
    assert(r.safe === false && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('FER-GT4', 'horizontal_slab_mesh_dominant=true → service_visual_mismatch', () => {
    const r = evalGateFer({ ...PASS_FIELDS, horizontal_slab_mesh_dominant: true });
    assert(r.safe === false && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('FER-GT5', 'fresh_concrete_visible=true → state_mismatch', () => {
    const r = evalGateFer({ ...PASS_FIELDS, fresh_concrete_visible: true });
    assert(r.safe === false && r.reason === 'state_mismatch',
      `Expected state_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('FER-GT6', 'concrete_pouring_visible=true → state_mismatch', () => {
    const r = evalGateFer({ ...PASS_FIELDS, concrete_pouring_visible: true });
    assert(r.safe === false && r.reason === 'state_mismatch',
      `Expected state_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('FER-GT7', 'formwork_removal_visible=true → state_mismatch', () => {
    const r = evalGateFer({ ...PASS_FIELDS, formwork_removal_visible: true });
    assert(r.safe === false && r.reason === 'state_mismatch',
      `Expected state_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('FER-GT8', 'reinforcement_cage_visible=false (cage stockée sans action) → service_visual_mismatch', () => {
    const r = evalGateFer({ ...PASS_FIELDS, reinforcement_cage_visible: false });
    assert(r.safe === false && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('FER-GT9', 'active_rebar_tying_visible=false (worker not tying) → service_visual_mismatch', () => {
    const r = evalGateFer({ ...PASS_FIELDS, active_rebar_tying_visible: false });
    assert(r.safe === false && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('FER-GT10', 'tying_tool_in_contact_with_rebar=false → service_visual_mismatch', () => {
    const r = evalGateFer({ ...PASS_FIELDS, tying_tool_in_contact_with_rebar: false });
    assert(r.safe === false && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('FER-GT11', 'rebar_supported_on_low_stands=false (cage in trench) → service_visual_mismatch', () => {
    const r = evalGateFer({ ...PASS_FIELDS, rebar_supported_on_low_stands: false });
    assert(r.safe === false && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('FER-GT12', 'worker_stable_at_ground_level=false → access_violation', () => {
    const r = evalGateFer({ ...PASS_FIELDS, worker_stable_at_ground_level: false });
    assert(r.safe === false && r.reason === 'access_violation',
      `Expected access_violation, got safe=${r.safe} reason=${r.reason}`);
  });

  test('FER-GT13', 'service_visual_match=false → service_visual_mismatch', () => {
    const r = evalGateFer({ ...PASS_FIELDS, service_visual_match: false });
    assert(r.safe === false && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('FER-GT14', 'worker_count_match=false → worker_count_mismatch', () => {
    const r = evalGateFer({ ...PASS_FIELDS, worker_count_match: false });
    assert(r.safe === false && r.reason === 'worker_count_mismatch',
      `Expected worker_count_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('FER-GT15', 'reinforcement_cage_visible=null → structured_evidence_incomplete (mandatory_fields B0)', () => {
    const r = evalGateFer({ ...PASS_FIELDS, reinforcement_cage_visible: null });
    assert(r.safe === false && r.reason === 'structured_evidence_incomplete',
      `Expected structured_evidence_incomplete, got safe=${r.safe} reason=${r.reason}`);
  });

  test('FER-GT16', 'service_visual_match=true + all 14 mandatory fields null → structured_evidence_incomplete', () => {
    const allNull = {
      reinforcement_cage_visible:       null,
      longitudinal_rebar_visible:       null,
      regular_stirrups_visible:         null,
      active_rebar_tying_visible:       null,
      tying_tool_in_contact_with_rebar: null,
      partial_rebar_assembly_visible:   null,
      rebar_supported_on_low_stands:    null,
      worker_stable_at_ground_level:    null,
      worker_standing_on_rebar:         null,
      foundation_trench_dominant:       null,
      horizontal_slab_mesh_dominant:    null,
      fresh_concrete_visible:           null,
      concrete_pouring_visible:         null,
      formwork_removal_visible:         null,
      service_visual_match:             true,
      worker_count_match:               true,
    };
    const r = evalGateFer(allNull);
    assert(r.safe === false && r.reason === 'structured_evidence_incomplete',
      `Expected structured_evidence_incomplete, got safe=${r.safe} reason=${r.reason}`);
  });

  // ─── FER-REG: Regression ───────────────────────────────────────────────────

  test('FER-REG1', '"ferraillage dalle" alias → Dalle béton (not Ferraillage gate)', () => {
    const alias = _SERVICE_GATE_ALIASES['ferraillage dalle'];
    assert(alias === 'Dalle béton',
      `"ferraillage dalle" must alias to "Dalle béton", got "${alias}"`);
  });

  test('FER-REG2', 'Fondation encours → MACONNERIE-STRIP-FOUNDATION-REBAR (unchanged)', () => {
    const r = resolveScene('Fondation', 'encours');
    assert(r._state_lock_used === true, 'Fondation state-lock must still resolve');
    assert(r._visual_family === 'MACONNERIE-STRIP-FOUNDATION-REBAR',
      `visual_family expected MACONNERIE-STRIP-FOUNDATION-REBAR, got ${r._visual_family}`);
  });

  test('FER-REG3', 'Dalle béton encours → MACONNERIE-CONCRETE-SLAB-REBAR (unchanged)', () => {
    const r = resolveScene('Dalle béton', 'encours');
    assert(r._state_lock_used === true, 'Dalle béton state-lock must still resolve');
    assert(r._visual_family === 'MACONNERIE-CONCRETE-SLAB-REBAR',
      `visual_family expected MACONNERIE-CONCRETE-SLAB-REBAR, got ${r._visual_family}`);
  });

  test('FER-REG4', 'Ferraillage encours → NOT MACONNERIE-STRIP-FOUNDATION-REBAR (no FON collision)', () => {
    const r = resolveScene('Ferraillage', 'encours');
    assert(r._visual_family !== 'MACONNERIE-STRIP-FOUNDATION-REBAR',
      `Ferraillage must not hit Fondation state-lock, got ${r._visual_family}`);
  });

  test('FER-REG5', 'Ferraillage encours → NOT MACONNERIE-CONCRETE-SLAB-REBAR (no DAL collision)', () => {
    const r = resolveScene('Ferraillage', 'encours');
    assert(r._visual_family !== 'MACONNERIE-CONCRETE-SLAB-REBAR',
      `Ferraillage must not hit Dalle béton state-lock, got ${r._visual_family}`);
  });

  // ─── Summary ───────────────────────────────────────────────────────────────

  console.groupEnd();
  const total = _pass + _fail;
  const summary = `FER: ${_pass}/${total} passed${_fail ? ` — ${_fail} FAILED` : ''}`;
  console.info(`%c${summary}`, _fail ? 'color: red; font-weight: bold' : 'color: green; font-weight: bold');
  return { suite: 'FER', pass: _pass, fail: _fail, total, results: _results };
}
