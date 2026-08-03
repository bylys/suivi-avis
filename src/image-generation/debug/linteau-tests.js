/**
 * Linteau — no-cost test suite
 * Tests:
 *   LIN-SC1..4  : state-lock resolution Linteau + encours
 *   LIN-AL1..5  : alias resolution + gate structure
 *   LIN-GT1..19 : gate reject_conditions + mandatory_fields
 *   LIN-REG1..5 : regression — Seuil/Escalier/Ouverture/Percement no collision, Ferraillage unchanged
 */

const { _applySiteRealism, _serviceGroup } = await import('../resolution/service-resolver.js?bust=lin-tests2');
const { SERVICE_VISUAL_GATE_RULES, _SERVICE_GATE_ALIASES } = await import('../safety/safety-rules.js?bust=lin-tests2');

export async function runLinteauTests() {
  console.group('LIN tests — Linteau state-lock + gate');

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

  function evalGateLin(fields) {
    const gate = SERVICE_VISUAL_GATE_RULES['Linteau'];
    if (!gate) throw new Error('Gate "Linteau" not found in SERVICE_VISUAL_GATE_RULES');
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
    wall_opening_visible:                       true,
    lintel_visible:                             true,
    lintel_seated_on_both_bearings:             true,
    sufficient_lateral_bearing_visible:         true,
    temporary_supports_visible:                 true,
    masonry_above_supported:                    true,
    active_lintel_adjustment_visible:           true,
    bearing_bed_or_adjustment_evidence_visible: true,
    workers_stable_on_ground:                   true,
    worker_beneath_unsupported_masonry:         false,
    lintel_held_overhead_manually:              false,
    ladder_used_as_workstation:                 false,
    falling_debris_hazard_visible:              false,
    service_visual_match:                       true,
    worker_count_match:                         true,
  };

  // ─── LIN-SC: State-lock ────────────────────────────────────────────────────

  test('LIN-SC1', 'Linteau encours → _state_lock_used=true', () => {
    const r = resolveScene('Linteau', 'encours');
    assert(r._state_lock_used === true,
      `_state_lock_used expected true, got ${r._state_lock_used}`);
  });

  test('LIN-SC2', 'Linteau encours → _state_lock_pool_size=1', () => {
    const r = resolveScene('Linteau', 'encours');
    assert(r._state_lock_pool_size === 1,
      `_state_lock_pool_size expected 1, got ${r._state_lock_pool_size}`);
  });

  test('LIN-SC3', 'Linteau encours → _visual_family=MACONNERIE-LINTEL-GROUND', () => {
    const r = resolveScene('Linteau', 'encours');
    assert(r._visual_family === 'MACONNERIE-LINTEL-GROUND',
      `_visual_family expected MACONNERIE-LINTEL-GROUND, got ${r._visual_family}`);
  });

  test('LIN-SC4', 'Linteau encours → _access_configuration=GROUND_LEVEL_LINTEL_INSTALLATION', () => {
    const r = resolveScene('Linteau', 'encours');
    assert(r._access_configuration === 'GROUND_LEVEL_LINTEL_INSTALLATION',
      `_access_configuration expected GROUND_LEVEL_LINTEL_INSTALLATION, got ${r._access_configuration}`);
  });

  // ─── LIN-AL: Aliases + gate structure ─────────────────────────────────────

  test('LIN-AL1', '"linteau" alias → Linteau', () => {
    const alias = _SERVICE_GATE_ALIASES['linteau'];
    assert(alias === 'Linteau',
      `alias expected "Linteau", got "${alias}"`);
  });

  test('LIN-AL2', '"pose linteau" alias → Linteau', () => {
    const alias = _SERVICE_GATE_ALIASES['pose linteau'];
    assert(alias === 'Linteau',
      `alias expected "Linteau", got "${alias}"`);
  });

  test('LIN-AL3', '"remplacement linteau" alias → Linteau', () => {
    const alias = _SERVICE_GATE_ALIASES['remplacement linteau'];
    assert(alias === 'Linteau',
      `alias expected "Linteau", got "${alias}"`);
  });

  test('LIN-AL4', 'Gate Linteau has 15 mandatory_fields', () => {
    const gate = SERVICE_VISUAL_GATE_RULES['Linteau'];
    assert(gate && Array.isArray(gate.mandatory_fields),
      'Gate Linteau must have mandatory_fields array');
    assert(gate.mandatory_fields.length === 15,
      `Expected 15 mandatory_fields, got ${gate.mandatory_fields.length}`);
  });

  test('LIN-AL5', 'Gate Linteau has 15 reject_conditions', () => {
    const gate = SERVICE_VISUAL_GATE_RULES['Linteau'];
    assert(gate && Array.isArray(gate.reject_conditions),
      'Gate Linteau must have reject_conditions array');
    assert(gate.reject_conditions.length === 15,
      `Expected 15 reject_conditions, got ${gate.reject_conditions.length}`);
  });

  // ─── LIN-GT: Gate evaluation ───────────────────────────────────────────────

  test('LIN-GT1', 'All PASS_FIELDS (15 booleans) → évaluation normale → safe=true', () => {
    const r = evalGateLin({ ...PASS_FIELDS });
    assert(r.safe === true, `Expected safe=true, got safe=${r.safe}, reason=${r.reason}`);
  });

  test('LIN-GT2', 'worker_beneath_unsupported_masonry=true → access_violation', () => {
    const r = evalGateLin({ ...PASS_FIELDS, worker_beneath_unsupported_masonry: true });
    assert(r.safe === false && r.reason === 'access_violation',
      `Expected access_violation, got safe=${r.safe} reason=${r.reason}`);
  });

  test('LIN-GT3', 'lintel_held_overhead_manually=true → access_violation', () => {
    const r = evalGateLin({ ...PASS_FIELDS, lintel_held_overhead_manually: true });
    assert(r.safe === false && r.reason === 'access_violation',
      `Expected access_violation, got safe=${r.safe} reason=${r.reason}`);
  });

  test('LIN-GT4', 'ladder_used_as_workstation=true → access_violation', () => {
    const r = evalGateLin({ ...PASS_FIELDS, ladder_used_as_workstation: true });
    assert(r.safe === false && r.reason === 'access_violation',
      `Expected access_violation, got safe=${r.safe} reason=${r.reason}`);
  });

  test('LIN-GT5', 'falling_debris_hazard_visible=true → safety_hazard', () => {
    const r = evalGateLin({ ...PASS_FIELDS, falling_debris_hazard_visible: true });
    assert(r.safe === false && r.reason === 'safety_hazard',
      `Expected safety_hazard, got safe=${r.safe} reason=${r.reason}`);
  });

  test('LIN-GT6', 'wall_opening_visible=false → service_visual_mismatch', () => {
    const r = evalGateLin({ ...PASS_FIELDS, wall_opening_visible: false });
    assert(r.safe === false && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('LIN-GT7', 'lintel_visible=false → service_visual_mismatch', () => {
    const r = evalGateLin({ ...PASS_FIELDS, lintel_visible: false });
    assert(r.safe === false && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('LIN-GT8', 'lintel_seated_on_both_bearings=false → structural_safety_violation', () => {
    const r = evalGateLin({ ...PASS_FIELDS, lintel_seated_on_both_bearings: false });
    assert(r.safe === false && r.reason === 'structural_safety_violation',
      `Expected structural_safety_violation, got safe=${r.safe} reason=${r.reason}`);
  });

  test('LIN-GT9', 'sufficient_lateral_bearing_visible=false → structural_safety_violation', () => {
    const r = evalGateLin({ ...PASS_FIELDS, sufficient_lateral_bearing_visible: false });
    assert(r.safe === false && r.reason === 'structural_safety_violation',
      `Expected structural_safety_violation, got safe=${r.safe} reason=${r.reason}`);
  });

  test('LIN-GT10', 'temporary_supports_visible=false → structural_safety_violation', () => {
    const r = evalGateLin({ ...PASS_FIELDS, temporary_supports_visible: false });
    assert(r.safe === false && r.reason === 'structural_safety_violation',
      `Expected structural_safety_violation, got safe=${r.safe} reason=${r.reason}`);
  });

  test('LIN-GT11', 'masonry_above_supported=false → structural_safety_violation', () => {
    const r = evalGateLin({ ...PASS_FIELDS, masonry_above_supported: false });
    assert(r.safe === false && r.reason === 'structural_safety_violation',
      `Expected structural_safety_violation, got safe=${r.safe} reason=${r.reason}`);
  });

  test('LIN-GT12', 'active_lintel_adjustment_visible=false → service_visual_mismatch', () => {
    const r = evalGateLin({ ...PASS_FIELDS, active_lintel_adjustment_visible: false });
    assert(r.safe === false && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('LIN-GT13', 'bearing_bed_or_adjustment_evidence_visible=false → service_visual_mismatch', () => {
    const r = evalGateLin({ ...PASS_FIELDS, bearing_bed_or_adjustment_evidence_visible: false });
    assert(r.safe === false && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('LIN-GT14', 'workers_stable_on_ground=false → access_violation', () => {
    const r = evalGateLin({ ...PASS_FIELDS, workers_stable_on_ground: false });
    assert(r.safe === false && r.reason === 'access_violation',
      `Expected access_violation, got safe=${r.safe} reason=${r.reason}`);
  });

  test('LIN-GT15', 'service_visual_match=false → service_visual_mismatch', () => {
    const r = evalGateLin({ ...PASS_FIELDS, service_visual_match: false });
    assert(r.safe === false && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('LIN-GT16', 'worker_count_match=false → worker_count_mismatch', () => {
    const r = evalGateLin({ ...PASS_FIELDS, worker_count_match: false });
    assert(r.safe === false && r.reason === 'worker_count_mismatch',
      `Expected worker_count_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('LIN-GT17', 'un champ obligatoire null → structured_evidence_incomplete (B0)', () => {
    const r = evalGateLin({ ...PASS_FIELDS, lintel_seated_on_both_bearings: null });
    assert(r.safe === false && r.reason === 'structured_evidence_incomplete',
      `Expected structured_evidence_incomplete, got safe=${r.safe} reason=${r.reason}`);
  });

  test('LIN-GT18', 'service_visual_match=true + tous les champs obligatoires null → structured_evidence_incomplete', () => {
    const allNull = {
      wall_opening_visible:                       null,
      lintel_visible:                             null,
      lintel_seated_on_both_bearings:             null,
      sufficient_lateral_bearing_visible:         null,
      temporary_supports_visible:                 null,
      masonry_above_supported:                    null,
      active_lintel_adjustment_visible:           null,
      bearing_bed_or_adjustment_evidence_visible: null,
      workers_stable_on_ground:                   null,
      worker_beneath_unsupported_masonry:         null,
      lintel_held_overhead_manually:              null,
      ladder_used_as_workstation:                 null,
      falling_debris_hazard_visible:              null,
      service_visual_match:                       true,
      worker_count_match:                         true,
    };
    const r = evalGateLin(allNull);
    assert(r.safe === false && r.reason === 'structured_evidence_incomplete',
      `Expected structured_evidence_incomplete, got safe=${r.safe} reason=${r.reason}`);
  });

  test('LIN-GT19', 'mortier non visible mais réglage d\'appui visible (bearing_bed=true, fresh_mortar absent) → PASS', () => {
    // fresh_mortar_at_bearings_visible is NOT in mandatory_fields — its absence must not block PASS
    const r = evalGateLin({ ...PASS_FIELDS, bearing_bed_or_adjustment_evidence_visible: true });
    assert(r.safe === true,
      `Expected safe=true when bearing_bed evidence visible even without mortar, got safe=${r.safe} reason=${r.reason}`);
  });

  // ─── LIN-REG: Regression ──────────────────────────────────────────────────

  test('LIN-REG1', 'Seuil encours → state_lock_used=false, NOT MACONNERIE-LINTEL-GROUND', () => {
    const r = resolveScene('Seuil', 'encours');
    assert(r._state_lock_used !== true || r._visual_family !== 'MACONNERIE-LINTEL-GROUND',
      `Seuil must not hit Linteau state-lock, got state_lock_used=${r._state_lock_used} visual_family=${r._visual_family}`);
  });

  test('LIN-REG2', 'Escalier béton encours → NOT MACONNERIE-LINTEL-GROUND', () => {
    const r = resolveScene('Escalier béton', 'encours');
    assert(r._visual_family !== 'MACONNERIE-LINTEL-GROUND',
      `Escalier béton must not hit Linteau state-lock, got ${r._visual_family}`);
  });

  test('LIN-REG3', 'Ouverture dans mur encours → state_lock_used=false, NOT MACONNERIE-LINTEL-GROUND', () => {
    const r = resolveScene('Ouverture dans mur', 'encours');
    assert(r._state_lock_used !== true,
      `Ouverture dans mur must not have a state-lock, got state_lock_used=${r._state_lock_used}`);
    assert(r._visual_family !== 'MACONNERIE-LINTEL-GROUND',
      `Ouverture dans mur must not hit Linteau visual_family, got ${r._visual_family}`);
  });

  test('LIN-REG4', 'Percement mur encours → state_lock_used=false, NOT MACONNERIE-LINTEL-GROUND', () => {
    const r = resolveScene('Percement mur', 'encours');
    assert(r._state_lock_used !== true,
      `Percement mur must not have a state-lock, got state_lock_used=${r._state_lock_used}`);
    assert(r._visual_family !== 'MACONNERIE-LINTEL-GROUND',
      `Percement mur must not hit Linteau visual_family, got ${r._visual_family}`);
  });

  test('LIN-REG5', 'Ferraillage encours → MACONNERIE-REBAR-ASSEMBLY-GROUND (unchanged)', () => {
    const r = resolveScene('Ferraillage', 'encours');
    assert(r._state_lock_used === true, 'Ferraillage state-lock must still resolve');
    assert(r._visual_family === 'MACONNERIE-REBAR-ASSEMBLY-GROUND',
      `Expected MACONNERIE-REBAR-ASSEMBLY-GROUND, got ${r._visual_family}`);
  });

  // ─── Summary ──────────────────────────────────────────────────────────────

  console.groupEnd();
  const total = _pass + _fail;
  const summary = `LIN: ${_pass}/${total} passed${_fail ? ` — ${_fail} FAILED` : ''}`;
  console.info(`%c${summary}`, _fail ? 'color: red; font-weight: bold' : 'color: green; font-weight: bold');
  return { suite: 'LIN', pass: _pass, fail: _fail, total, results: _results };
}
