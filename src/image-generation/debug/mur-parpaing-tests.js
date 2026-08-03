/**
 * Mur parpaing — no-cost test suite
 * Tests:
 *   MAC-SC1..4 : state-lock resolution for Mur parpaing + encours
 *   MAC-GT1..9 : gate reject_conditions
 *   MAC-AL1..2 : alias resolution + gate count
 *   MAC-REG1..4: regression — Réparation fissure, Mur brique, Muret unchanged
 */

const { _applySiteRealism }   = await import('../resolution/service-resolver.js?bust=mac-tests1');
const { WORKER_SCENE_RULES }  = await import('../safety/worker-rules.js?bust=mac-tests1');
const { SERVICE_VISUAL_GATE_RULES, _SERVICE_GATE_ALIASES } = await import('../safety/safety-rules.js?bust=mac-tests1');

export async function runMurParpaingTests() {
  console.group('MAC tests — Mur parpaing state-lock + gate');

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
    const gate = SERVICE_VISUAL_GATE_RULES['Mur parpaing'];
    if (!gate) throw new Error('Gate "Mur parpaing" not found in SERVICE_VISUAL_GATE_RULES');
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

  // ─── MAC-SC: Scene resolution ───────────────────────────────────────────────

  test('MAC-SC1', 'Mur parpaing encours → state_lock_used=true', () => {
    const r = resolveScene('Mur parpaing', 'encours');
    assert(r._state_lock_used === true,
      `_state_lock_used expected true, got ${r._state_lock_used}`);
  });

  test('MAC-SC2', 'Mur parpaing encours → _state_lock_pool_size=1', () => {
    const r = resolveScene('Mur parpaing', 'encours');
    assert(r._state_lock_pool_size === 1,
      `_state_lock_pool_size expected 1, got ${r._state_lock_pool_size}`);
  });

  test('MAC-SC3', 'Mur parpaing encours → _visual_family=MACONNERIE-WALL-BLOCK-GROUND', () => {
    const r = resolveScene('Mur parpaing', 'encours');
    assert(r._visual_family === 'MACONNERIE-WALL-BLOCK-GROUND',
      `_visual_family expected MACONNERIE-WALL-BLOCK-GROUND, got ${r._visual_family}`);
  });

  test('MAC-SC4', 'Mur parpaing encours → _access_configuration=GROUND_LEVEL_BLOCK_WALL', () => {
    const r = resolveScene('Mur parpaing', 'encours');
    assert(r._access_configuration === 'GROUND_LEVEL_BLOCK_WALL',
      `_access_configuration expected GROUND_LEVEL_BLOCK_WALL, got ${r._access_configuration}`);
  });

  // ─── MAC-GT: Gate evaluation ────────────────────────────────────────────────

  const PASS_FIELDS = {
    concrete_block_wall_visible:    true,
    active_block_laying_visible:    true,
    fresh_mortar_visible:           true,
    partial_wall_progress_visible:  true,
    workers_stable_on_ground:       true,
    wall_height_reachable_from_ground: true,
    worker_on_top_of_wall:          false,
    ladder_used_as_workstation:     false,
    wall_above_safe_working_height: false,
    service_visual_match:           true,
    worker_count_match:             true,
  };

  test('MAC-GT1', 'Parpaings + mortier frais + pose active → PASS', () => {
    const r = evalGate(PASS_FIELDS);
    assert(r.safe === true, `Expected PASS, got REJECT on ${r.first_failed} (${r.reason})`);
  });

  test('MAC-GT2', 'worker_on_top_of_wall=true → REJECT critical_violation', () => {
    const r = evalGate({ ...PASS_FIELDS, worker_on_top_of_wall: true });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'critical_violation',
      `Expected critical_violation, got ${r.reason}`);
    assert(r.first_failed === 'worker_on_top_of_wall',
      `Expected first_failed=worker_on_top_of_wall, got ${r.first_failed}`);
  });

  test('MAC-GT3', 'ladder_used_as_workstation=true → REJECT access_violation', () => {
    const r = evalGate({ ...PASS_FIELDS, ladder_used_as_workstation: true });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'access_violation', `Expected access_violation, got ${r.reason}`);
  });

  test('MAC-GT4', 'wall_above_safe_working_height=true → REJECT access_violation', () => {
    const r = evalGate({ ...PASS_FIELDS, wall_above_safe_working_height: true });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'access_violation', `Expected access_violation, got ${r.reason}`);
  });

  test('MAC-GT5', 'concrete_block_wall_visible=false (mur brique rouge) → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, concrete_block_wall_visible: false });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got ${r.reason}`);
    assert(r.first_failed === 'concrete_block_wall_visible',
      `Expected first_failed=concrete_block_wall_visible, got ${r.first_failed}`);
  });

  test('MAC-GT6', 'active_block_laying_visible=false (aucune pose active) → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, active_block_laying_visible: false });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'service_visual_mismatch', `Expected service_visual_mismatch, got ${r.reason}`);
  });

  test('MAC-GT7', 'fresh_mortar_visible=false → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, fresh_mortar_visible: false });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'service_visual_mismatch', `Expected service_visual_mismatch, got ${r.reason}`);
  });

  test('MAC-GT8', 'partial_wall_progress_visible=false (mur terminé) → REJECT state_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, partial_wall_progress_visible: false });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'state_mismatch', `Expected state_mismatch, got ${r.reason}`);
  });

  test('MAC-GT9', 'worker_count_match=false → REJECT worker_count_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, worker_count_match: false });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'worker_count_mismatch', `Expected worker_count_mismatch, got ${r.reason}`);
  });

  // ─── MAC-AL: Alias resolution ───────────────────────────────────────────────

  test('MAC-AL1', 'Alias "mur parpaing" → gate "Mur parpaing" exists', () => {
    const canonical = _SERVICE_GATE_ALIASES['mur parpaing'];
    assert(canonical === 'Mur parpaing',
      `Expected "Mur parpaing", got "${canonical}"`);
    assert(SERVICE_VISUAL_GATE_RULES[canonical] !== undefined,
      'Gate "Mur parpaing" must exist in SERVICE_VISUAL_GATE_RULES');
  });

  test('MAC-AL2', 'Gate "Mur parpaing" has 9 reject_conditions', () => {
    const gate = SERVICE_VISUAL_GATE_RULES['Mur parpaing'];
    assert(gate && Array.isArray(gate.reject_conditions),
      'Gate must have reject_conditions array');
    assert(gate.reject_conditions.length === 9,
      `Expected 9 reject_conditions, got ${gate.reject_conditions.length}`);
  });

  // ─── MAC-REG: Regression ────────────────────────────────────────────────────

  test('MAC-REG1', 'Réparation fissure encours → state_lock_used=false (unchanged)', () => {
    const r = resolveScene('Réparation fissure', 'encours');
    assert(r._state_lock_used === false,
      `_state_lock_used expected false, got ${r._state_lock_used}`);
  });

  test('MAC-REG2', 'Réparation fissure gate: 7 reject_conditions (unchanged)', () => {
    const gate = SERVICE_VISUAL_GATE_RULES['Réparation fissure'];
    assert(gate && gate.reject_conditions.length === 7,
      `Expected 7 reject_conditions for fissure, got ${gate?.reject_conditions?.length}`);
  });

  test('MAC-REG3', 'Mur brique encours → state_lock_used=false (no collision)', () => {
    const r = resolveScene('Mur brique', 'encours');
    assert(r._state_lock_used === false,
      `Mur brique must not hit mur parpaing state-lock, got state_lock_used=${r._state_lock_used}`);
  });

  test('MAC-REG4', 'Muret encours → state_lock_used=false (no collision)', () => {
    const r = resolveScene('Muret', 'encours');
    assert(r._state_lock_used === false,
      `Muret must not hit mur parpaing state-lock, got state_lock_used=${r._state_lock_used}`);
  });

  // ─── Summary ───────────────────────────────────────────────────────────────

  console.log(`\n--- MAC: ${_pass}/${_pass + _fail} ---\n`);
  console.groupEnd();
  return { pass: _pass, fail: _fail, results: _results };
}
