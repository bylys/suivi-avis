/**
 * Rejointoiement pierre — no-cost test suite
 * Tests:
 *   REP-SC1..4 : state-lock resolution for Rejointoiement pierre + encours
 *   REP-GT1..11: gate reject_conditions
 *   REP-AL1..2 : alias resolution + gate count
 *   REP-REG1..5: regression — Réparation fissure, Rejointoiement générique, Mur parpaing, Dalle béton unchanged
 */

const { _applySiteRealism }   = await import('../resolution/service-resolver.js?bust=rep-tests1');
const { SERVICE_VISUAL_GATE_RULES, _SERVICE_GATE_ALIASES } = await import('../safety/safety-rules.js?bust=rep-tests1');

export async function runRepointingPierreTests() {
  console.group('REP tests — Rejointoiement pierre state-lock + gate');

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
    const gate = SERVICE_VISUAL_GATE_RULES['Rejointoiement pierre'];
    if (!gate) throw new Error('Gate "Rejointoiement pierre" not found in SERVICE_VISUAL_GATE_RULES');
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

  // ─── REP-SC: Scene resolution ───────────────────────────────────────────────

  test('REP-SC1', 'Rejointoiement pierre encours → _state_lock_used=true', () => {
    const r = resolveScene('Rejointoiement pierre', 'encours');
    assert(r._state_lock_used === true,
      `_state_lock_used expected true, got ${r._state_lock_used}`);
  });

  test('REP-SC2', 'Rejointoiement pierre encours → _state_lock_pool_size=1', () => {
    const r = resolveScene('Rejointoiement pierre', 'encours');
    assert(r._state_lock_pool_size === 1,
      `_state_lock_pool_size expected 1, got ${r._state_lock_pool_size}`);
  });

  test('REP-SC3', 'Rejointoiement pierre encours → _visual_family=MACONNERIE-STONE-REPOINTING-GROUND', () => {
    const r = resolveScene('Rejointoiement pierre', 'encours');
    assert(r._visual_family === 'MACONNERIE-STONE-REPOINTING-GROUND',
      `_visual_family expected MACONNERIE-STONE-REPOINTING-GROUND, got ${r._visual_family}`);
  });

  test('REP-SC4', 'Rejointoiement pierre encours → _access_configuration=GROUND_LEVEL_STONE_REPOINTING', () => {
    const r = resolveScene('Rejointoiement pierre', 'encours');
    assert(r._access_configuration === 'GROUND_LEVEL_STONE_REPOINTING',
      `_access_configuration expected GROUND_LEVEL_STONE_REPOINTING, got ${r._access_configuration}`);
  });

  // ─── REP-GT: Gate evaluation ────────────────────────────────────────────────

  const PASS_FIELDS = {
    natural_stone_wall_visible:                true,
    open_or_degraded_stone_joints_visible:     true,
    active_stone_repointing_visible:           true,
    pointing_tool_in_contact_with_joint:       true,
    fresh_mortar_inside_joints_visible:        true,
    treated_and_untreated_joint_zones_visible: true,
    original_stones_remain_uncovered:          true,
    worker_stable_on_ground:                   true,
    work_area_reachable_from_ground:           true,
    new_stone_wall_construction_visible:       false,
    render_or_plaster_application_visible:     false,
    single_crack_repair_visible:               false,
    service_visual_match:                      true,
    worker_count_match:                        true,
  };

  test('REP-GT1', 'Mur pierre + joints ouverts + application active → PASS', () => {
    const r = evalGate(PASS_FIELDS);
    assert(r.safe === true, `Expected PASS, got REJECT on ${r.first_failed} (${r.reason})`);
  });

  test('REP-GT2', 'single_crack_repair_visible=true → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, single_crack_repair_visible: true });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'service_visual_mismatch', `Expected service_visual_mismatch, got ${r.reason}`);
    assert(r.first_failed === 'single_crack_repair_visible',
      `Expected first_failed=single_crack_repair_visible, got ${r.first_failed}`);
  });

  test('REP-GT3', 'new_stone_wall_construction_visible=true → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, new_stone_wall_construction_visible: true });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'service_visual_mismatch', `Expected service_visual_mismatch, got ${r.reason}`);
  });

  test('REP-GT4', 'render_or_plaster_application_visible=true → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, render_or_plaster_application_visible: true });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'service_visual_mismatch', `Expected service_visual_mismatch, got ${r.reason}`);
  });

  test('REP-GT5', 'natural_stone_wall_visible=false → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, natural_stone_wall_visible: false });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'service_visual_mismatch', `Expected service_visual_mismatch, got ${r.reason}`);
  });

  test('REP-GT6', 'active_stone_repointing_visible=false → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, active_stone_repointing_visible: false });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'service_visual_mismatch', `Expected service_visual_mismatch, got ${r.reason}`);
  });

  test('REP-GT7', 'pointing_tool_in_contact_with_joint=false → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, pointing_tool_in_contact_with_joint: false });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'service_visual_mismatch', `Expected service_visual_mismatch, got ${r.reason}`);
  });

  test('REP-GT8', 'treated_and_untreated_joint_zones_visible=false (mur entièrement rejointoyé) → REJECT state_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, treated_and_untreated_joint_zones_visible: false });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'state_mismatch', `Expected state_mismatch, got ${r.reason}`);
  });

  test('REP-GT9', 'worker_stable_on_ground=false → REJECT access_violation', () => {
    const r = evalGate({ ...PASS_FIELDS, worker_stable_on_ground: false });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'access_violation', `Expected access_violation, got ${r.reason}`);
  });

  test('REP-GT10', 'work_area_reachable_from_ground=false → REJECT access_violation', () => {
    const r = evalGate({ ...PASS_FIELDS, work_area_reachable_from_ground: false });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'access_violation', `Expected access_violation, got ${r.reason}`);
  });

  test('REP-GT11', 'worker_count_match=false → REJECT worker_count_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, worker_count_match: false });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'worker_count_mismatch', `Expected worker_count_mismatch, got ${r.reason}`);
  });

  // ─── REP-AL: Alias resolution ───────────────────────────────────────────────

  test('REP-AL1', 'Alias "rejointoiement pierre" → gate "Rejointoiement pierre" exists', () => {
    const canonical = _SERVICE_GATE_ALIASES['rejointoiement pierre'];
    assert(canonical === 'Rejointoiement pierre',
      `Expected "Rejointoiement pierre", got "${canonical}"`);
    assert(SERVICE_VISUAL_GATE_RULES[canonical] !== undefined,
      'Gate "Rejointoiement pierre" must exist in SERVICE_VISUAL_GATE_RULES');
  });

  test('REP-AL2', 'Gate "Rejointoiement pierre" has 14 reject_conditions', () => {
    const gate = SERVICE_VISUAL_GATE_RULES['Rejointoiement pierre'];
    assert(gate && Array.isArray(gate.reject_conditions),
      'Gate must have reject_conditions array');
    assert(gate.reject_conditions.length === 14,
      `Expected 14 reject_conditions, got ${gate.reject_conditions.length}`);
  });

  // ─── REP-REG: Regression ────────────────────────────────────────────────────

  test('REP-REG1', 'Réparation fissure encours → state_lock_used=false (unchanged)', () => {
    const r = resolveScene('Réparation fissure', 'encours');
    assert(r._state_lock_used === false,
      `Réparation fissure must not gain a state-lock, got state_lock_used=${r._state_lock_used}`);
  });

  test('REP-REG2', 'Rejointoiement encours → state_lock_used=false (no collision with pierre lock)', () => {
    const r = resolveScene('Rejointoiement', 'encours');
    assert(r._state_lock_used === false,
      `Rejointoiement générique must not hit pierre state-lock, got state_lock_used=${r._state_lock_used}`);
  });

  test('REP-REG3', 'Mur parpaing encours → state_lock_used=true (unchanged)', () => {
    const r = resolveScene('Mur parpaing', 'encours');
    assert(r._state_lock_used === true,
      `Mur parpaing state-lock must still resolve, got state_lock_used=${r._state_lock_used}`);
  });

  test('REP-REG4', 'Dalle béton encours → state_lock_used=true (unchanged)', () => {
    const r = resolveScene('Dalle béton', 'encours');
    assert(r._state_lock_used === true,
      `Dalle béton state-lock must still resolve, got state_lock_used=${r._state_lock_used}`);
  });

  test('REP-REG5', 'Rejointoiement pierre début → state_lock_used=false (no lock on début)', () => {
    const r = resolveScene('Rejointoiement pierre', 'debut');
    assert(r._state_lock_used === false,
      `Rejointoiement pierre début must not hit state-lock, got state_lock_used=${r._state_lock_used}`);
  });

  // ─── Summary ───────────────────────────────────────────────────────────────

  console.log(`\n--- REP: ${_pass}/${_pass + _fail} ---\n`);
  console.groupEnd();
  return { pass: _pass, fail: _fail, results: _results };
}
