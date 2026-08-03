/**
 * Dalle béton — no-cost test suite
 * Tests:
 *   DAL-SC1..4 : state-lock resolution for Dalle béton + encours
 *   DAL-GT1..9 : gate reject_conditions
 *   DAL-AL1..2 : alias resolution + gate count
 *   DAL-REG1..3: regression — Mur parpaing, Coulage dalle, Fondation unchanged
 */

const { _applySiteRealism }   = await import('../resolution/service-resolver.js?bust=dal-tests1');
const { SERVICE_VISUAL_GATE_RULES, _SERVICE_GATE_ALIASES } = await import('../safety/safety-rules.js?bust=dal-tests1');

export async function runDalleBetonTests() {
  console.group('DAL tests — Dalle béton state-lock + gate');

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

  function evalGate(fields) {
    const gate = SERVICE_VISUAL_GATE_RULES['Dalle béton'];
    if (!gate) throw new Error('Gate "Dalle béton" not found in SERVICE_VISUAL_GATE_RULES');
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

  // ─── DAL-SC: Scene resolution ───────────────────────────────────────────────

  test('DAL-SC1', 'Dalle béton encours → _state_lock_used=true', () => {
    const r = resolveScene('Dalle béton', 'encours');
    assert(r._state_lock_used === true,
      `_state_lock_used expected true, got ${r._state_lock_used}`);
  });

  test('DAL-SC2', 'Dalle béton encours → _state_lock_pool_size=1', () => {
    const r = resolveScene('Dalle béton', 'encours');
    assert(r._state_lock_pool_size === 1,
      `_state_lock_pool_size expected 1, got ${r._state_lock_pool_size}`);
  });

  test('DAL-SC3', 'Dalle béton encours → _visual_family=MACONNERIE-CONCRETE-SLAB-REBAR', () => {
    const r = resolveScene('Dalle béton', 'encours');
    assert(r._visual_family === 'MACONNERIE-CONCRETE-SLAB-REBAR',
      `_visual_family expected MACONNERIE-CONCRETE-SLAB-REBAR, got ${r._visual_family}`);
  });

  test('DAL-SC4', 'Dalle béton encours → _access_configuration=GROUND_LEVEL_SLAB_PREPARATION', () => {
    const r = resolveScene('Dalle béton', 'encours');
    assert(r._access_configuration === 'GROUND_LEVEL_SLAB_PREPARATION',
      `_access_configuration expected GROUND_LEVEL_SLAB_PREPARATION, got ${r._access_configuration}`);
  });

  // ─── DAL-GT: Gate evaluation ────────────────────────────────────────────────

  const PASS_FIELDS = {
    slab_formwork_visible:                   true,
    reinforcement_mesh_visible:              true,
    reinforcement_mesh_supported_on_spacers: true,
    active_rebar_adjustment_visible:         true,
    partial_slab_preparation_visible:        true,
    compacted_subbase_visible:               true,
    worker_stable_at_ground_level:           true,
    completed_concrete_slab_visible:         false,
    wall_construction_visible:               false,
    service_visual_match:                    true,
    worker_count_match:                      true,
  };

  test('DAL-GT1', 'Coffrage + mesh + ajustement actif → PASS', () => {
    const r = evalGate(PASS_FIELDS);
    assert(r.safe === true, `Expected PASS, got REJECT on ${r.first_failed} (${r.reason})`);
  });

  test('DAL-GT2', 'completed_concrete_slab_visible=true → REJECT state_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, completed_concrete_slab_visible: true });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'state_mismatch',
      `Expected state_mismatch, got ${r.reason}`);
    assert(r.first_failed === 'completed_concrete_slab_visible',
      `Expected first_failed=completed_concrete_slab_visible, got ${r.first_failed}`);
  });

  test('DAL-GT3', 'wall_construction_visible=true → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, wall_construction_visible: true });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'service_visual_mismatch', `Expected service_visual_mismatch, got ${r.reason}`);
  });

  test('DAL-GT4', 'slab_formwork_visible=false → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, slab_formwork_visible: false });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'service_visual_mismatch', `Expected service_visual_mismatch, got ${r.reason}`);
  });

  test('DAL-GT5', 'reinforcement_mesh_visible=false → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, reinforcement_mesh_visible: false });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'service_visual_mismatch', `Expected service_visual_mismatch, got ${r.reason}`);
  });

  test('DAL-GT6', 'reinforcement_mesh_supported_on_spacers=false → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, reinforcement_mesh_supported_on_spacers: false });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'service_visual_mismatch', `Expected service_visual_mismatch, got ${r.reason}`);
  });

  test('DAL-GT7', 'active_rebar_adjustment_visible=false → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, active_rebar_adjustment_visible: false });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'service_visual_mismatch', `Expected service_visual_mismatch, got ${r.reason}`);
  });

  test('DAL-GT8', 'partial_slab_preparation_visible=false → REJECT state_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, partial_slab_preparation_visible: false });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'state_mismatch', `Expected state_mismatch, got ${r.reason}`);
  });

  test('DAL-GT9', 'worker_count_match=false → REJECT worker_count_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, worker_count_match: false });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'worker_count_mismatch', `Expected worker_count_mismatch, got ${r.reason}`);
  });

  // ─── DAL-AL: Alias resolution ───────────────────────────────────────────────

  test('DAL-AL1', 'Alias "dalle beton" → gate "Dalle béton" exists', () => {
    const canonical = _SERVICE_GATE_ALIASES['dalle beton'];
    assert(canonical === 'Dalle béton',
      `Expected "Dalle béton", got "${canonical}"`);
    assert(SERVICE_VISUAL_GATE_RULES[canonical] !== undefined,
      'Gate "Dalle béton" must exist in SERVICE_VISUAL_GATE_RULES');
  });

  test('DAL-AL2', 'Gate "Dalle béton" has 10 reject_conditions', () => {
    const gate = SERVICE_VISUAL_GATE_RULES['Dalle béton'];
    assert(gate && Array.isArray(gate.reject_conditions),
      'Gate must have reject_conditions array');
    assert(gate.reject_conditions.length === 10,
      `Expected 10 reject_conditions, got ${gate.reject_conditions.length}`);
  });

  // ─── DAL-REG: Regression ────────────────────────────────────────────────────

  test('DAL-REG1', 'Mur parpaing encours → state_lock_used=true (unchanged)', () => {
    const r = resolveScene('Mur parpaing', 'encours');
    assert(r._state_lock_used === true,
      `Mur parpaing state-lock must still resolve, got state_lock_used=${r._state_lock_used}`);
  });

  test('DAL-REG2', 'Dalle béton début → state_lock_used=false (no lock on début)', () => {
    const r = resolveScene('Dalle béton', 'debut');
    assert(r._state_lock_used === false,
      `Dalle béton début must not hit state-lock, got state_lock_used=${r._state_lock_used}`);
  });

  test('DAL-REG3', 'Terrasse béton encours → state_lock_used=false (no collision)', () => {
    const r = resolveScene('Terrasse béton', 'encours');
    assert(r._state_lock_used === false,
      `Terrasse béton must not hit dalle beton state-lock, got state_lock_used=${r._state_lock_used}`);
  });

  // ─── Summary ───────────────────────────────────────────────────────────────

  console.log(`\n--- DAL: ${_pass}/${_pass + _fail} ---\n`);
  console.groupEnd();
  return { pass: _pass, fail: _fail, results: _results };
}
