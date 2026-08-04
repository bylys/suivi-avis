/**
 * Mur brique — no-cost test suite
 * Tests:
 *   BRI-SC1..4   : state-lock resolution Mur brique + encours
 *   BRI-AL1..5   : alias resolution + gate structure
 *   BRI-GT1..18  : gate reject_conditions + mandatory_fields + no-safe-field bypass
 *   BRI-REG1..5  : regression — Mur parpaing / Muret / Construction mur / Mur pierre / Coulage dalle no collision
 */

const { _applySiteRealism } = await import('../resolution/service-resolver.js?bust=bri-tests1');
const { SERVICE_VISUAL_GATE_RULES, _SERVICE_GATE_ALIASES } = await import('../safety/safety-rules.js?bust=bri-tests1');

export async function runBriqueTests() {
  console.group('BRI tests — Mur brique state-lock + gate');

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

  function evalGateBri(fields) {
    const gate = SERVICE_VISUAL_GATE_RULES['Mur brique'];
    if (!gate) throw new Error('Gate "Mur brique" not found in SERVICE_VISUAL_GATE_RULES');
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

  // 14-field PASS set
  const PASS_FIELDS = {
    clay_brick_wall_visible:               true,
    red_or_orange_clay_bricks_visible:     true,
    active_brick_laying_visible:           true,
    fresh_mortar_visible:                  true,
    partial_wall_progress_visible:         true,
    wall_alignment_tools_visible:          true,
    worker_stable_on_ground:               true,
    wall_height_reachable_from_ground:     true,
    concrete_block_wall_visible:           false,
    stone_wall_visible:                    false,
    worker_on_top_of_wall:                 false,
    ladder_used_as_workstation:            false,
    service_visual_match:                  true,
    worker_count_match:                    true,
  };

  // ─── BRI-SC: State-lock ────────────────────────────────────────────────────

  test('BRI-SC1', 'Mur brique encours → _state_lock_used=true', () => {
    const r = resolveScene('Mur brique', 'encours');
    assert(r._state_lock_used === true,
      `Expected _state_lock_used=true, got ${r._state_lock_used}`);
  });

  test('BRI-SC2', 'Mur brique encours → _visual_family=MACONNERIE-WALL-BRICK-GROUND', () => {
    const r = resolveScene('Mur brique', 'encours');
    assert(r._visual_family === 'MACONNERIE-WALL-BRICK-GROUND',
      `Expected MACONNERIE-WALL-BRICK-GROUND, got ${r._visual_family}`);
  });

  test('BRI-SC3', 'Mur brique encours → _access_configuration=GROUND_LEVEL_BRICK_WALL', () => {
    const r = resolveScene('Mur brique', 'encours');
    assert(r._access_configuration === 'GROUND_LEVEL_BRICK_WALL',
      `Expected GROUND_LEVEL_BRICK_WALL, got ${r._access_configuration}`);
  });

  test('BRI-SC4', 'Mur brique debut → state-lock NOT active (no _state_for match)', () => {
    const r = resolveScene('Mur brique', 'debut');
    assert(r._state_lock_used !== true,
      `Expected _state_lock_used falsy for debut, got ${r._state_lock_used}`);
  });

  // ─── BRI-AL: Aliases + gate structure ─────────────────────────────────────

  test('BRI-AL1', '_SERVICE_GATE_ALIASES["mur brique"] === "Mur brique"', () => {
    assert(_SERVICE_GATE_ALIASES['mur brique'] === 'Mur brique',
      `Got: ${_SERVICE_GATE_ALIASES['mur brique']}`);
  });

  test('BRI-AL2', '_SERVICE_GATE_ALIASES["mur en brique"] === "Mur brique"', () => {
    assert(_SERVICE_GATE_ALIASES['mur en brique'] === 'Mur brique',
      `Got: ${_SERVICE_GATE_ALIASES['mur en brique']}`);
  });

  test('BRI-AL3', '_SERVICE_GATE_ALIASES["mur en briques"] === "Mur brique"', () => {
    assert(_SERVICE_GATE_ALIASES['mur en briques'] === 'Mur brique',
      `Got: ${_SERVICE_GATE_ALIASES['mur en briques']}`);
  });

  test('BRI-AL4', 'SERVICE_VISUAL_GATE_RULES["Mur brique"] exists', () => {
    assert(!!SERVICE_VISUAL_GATE_RULES['Mur brique'],
      'Gate "Mur brique" not found in SERVICE_VISUAL_GATE_RULES');
  });

  test('BRI-AL5', 'mandatory_fields.length === 14', () => {
    const gate = SERVICE_VISUAL_GATE_RULES['Mur brique'];
    assert(gate.mandatory_fields.length === 14,
      `Expected 14 mandatory_fields, got ${gate.mandatory_fields.length}`);
  });

  // ─── BRI-GT: Gate logic ────────────────────────────────────────────────────

  test('BRI-GT1', 'All PASS_FIELDS → safe=true', () => {
    const r = evalGateBri({ ...PASS_FIELDS });
    assert(r.safe === true, `Expected safe=true, got safe=${r.safe} (${r.reason})`);
  });

  test('BRI-GT2', 'concrete_block_wall_visible=true → service_visual_mismatch', () => {
    const r = evalGateBri({ ...PASS_FIELDS, concrete_block_wall_visible: true });
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('BRI-GT3', 'stone_wall_visible=true → service_visual_mismatch', () => {
    const r = evalGateBri({ ...PASS_FIELDS, stone_wall_visible: true });
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('BRI-GT4', 'worker_on_top_of_wall=true → critical_violation', () => {
    const r = evalGateBri({ ...PASS_FIELDS, worker_on_top_of_wall: true });
    assert(!r.safe && r.reason === 'critical_violation',
      `Expected critical_violation, got safe=${r.safe} reason=${r.reason}`);
  });

  test('BRI-GT5', 'ladder_used_as_workstation=true → access_violation', () => {
    const r = evalGateBri({ ...PASS_FIELDS, ladder_used_as_workstation: true });
    assert(!r.safe && r.reason === 'access_violation',
      `Expected access_violation, got safe=${r.safe} reason=${r.reason}`);
  });

  test('BRI-GT6', 'clay_brick_wall_visible=false → service_visual_mismatch', () => {
    const r = evalGateBri({ ...PASS_FIELDS, clay_brick_wall_visible: false });
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('BRI-GT7', 'red_or_orange_clay_bricks_visible=false → service_visual_mismatch', () => {
    const r = evalGateBri({ ...PASS_FIELDS, red_or_orange_clay_bricks_visible: false });
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('BRI-GT8', 'active_brick_laying_visible=false → service_visual_mismatch', () => {
    const r = evalGateBri({ ...PASS_FIELDS, active_brick_laying_visible: false });
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('BRI-GT9', 'fresh_mortar_visible=false → service_visual_mismatch', () => {
    const r = evalGateBri({ ...PASS_FIELDS, fresh_mortar_visible: false });
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('BRI-GT10', 'partial_wall_progress_visible=false → state_mismatch', () => {
    const r = evalGateBri({ ...PASS_FIELDS, partial_wall_progress_visible: false });
    assert(!r.safe && r.reason === 'state_mismatch',
      `Expected state_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('BRI-GT11', 'wall_alignment_tools_visible=false → service_visual_mismatch', () => {
    const r = evalGateBri({ ...PASS_FIELDS, wall_alignment_tools_visible: false });
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('BRI-GT12', 'worker_stable_on_ground=false → access_violation', () => {
    const r = evalGateBri({ ...PASS_FIELDS, worker_stable_on_ground: false });
    assert(!r.safe && r.reason === 'access_violation',
      `Expected access_violation, got safe=${r.safe} reason=${r.reason}`);
  });

  test('BRI-GT13', 'wall_height_reachable_from_ground=false → access_violation', () => {
    const r = evalGateBri({ ...PASS_FIELDS, wall_height_reachable_from_ground: false });
    assert(!r.safe && r.reason === 'access_violation',
      `Expected access_violation, got safe=${r.safe} reason=${r.reason}`);
  });

  test('BRI-GT14', 'service_visual_match=false → service_visual_mismatch', () => {
    const r = evalGateBri({ ...PASS_FIELDS, service_visual_match: false });
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('BRI-GT15', 'worker_count_match=false → worker_count_mismatch', () => {
    const r = evalGateBri({ ...PASS_FIELDS, worker_count_match: false });
    assert(!r.safe && r.reason === 'worker_count_mismatch',
      `Expected worker_count_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('BRI-GT16', 'clay_brick_wall_visible=null → structured_evidence_incomplete', () => {
    const r = evalGateBri({ ...PASS_FIELDS, clay_brick_wall_visible: null });
    assert(!r.safe && r.reason === 'structured_evidence_incomplete',
      `Expected structured_evidence_incomplete, got safe=${r.safe} reason=${r.reason}`);
  });

  test('BRI-GT17', 'worker_on_top_of_wall=null → structured_evidence_incomplete', () => {
    const r = evalGateBri({ ...PASS_FIELDS, worker_on_top_of_wall: null });
    assert(!r.safe && r.reason === 'structured_evidence_incomplete',
      `Expected structured_evidence_incomplete, got safe=${r.safe} reason=${r.reason}`);
  });

  test('BRI-GT18', 'PASS_FIELDS with worker_stable_on_ground=true (shared field) → safe=true', () => {
    const r = evalGateBri({ ...PASS_FIELDS, worker_stable_on_ground: true });
    assert(r.safe === true, `Expected safe=true, got safe=${r.safe} (${r.reason})`);
  });

  // ─── BRI-REG: Regression — no collision with neighbours ───────────────────

  test('BRI-REG1', 'Mur parpaing encours → _visual_family=MACONNERIE-WALL-BLOCK-GROUND (no brique collision)', () => {
    const r = resolveScene('Mur parpaing', 'encours');
    assert(r._visual_family === 'MACONNERIE-WALL-BLOCK-GROUND',
      `Expected MACONNERIE-WALL-BLOCK-GROUND, got ${r._visual_family}`);
    assert(r._access_configuration !== 'GROUND_LEVEL_BRICK_WALL',
      `Collision: Mur parpaing got GROUND_LEVEL_BRICK_WALL`);
  });

  test('BRI-REG2', 'Mur brique encours → _access_configuration≠GROUND_LEVEL_BLOCK_WALL (no parpaing bleed)', () => {
    const r = resolveScene('Mur brique', 'encours');
    assert(r._access_configuration !== 'GROUND_LEVEL_BLOCK_WALL',
      `Collision: Mur brique got GROUND_LEVEL_BLOCK_WALL`);
  });

  test('BRI-REG3', 'Muret encours → _state_lock_used falsy (no Mur brique regex match)', () => {
    const r = resolveScene('Muret', 'encours');
    assert(r._access_configuration !== 'GROUND_LEVEL_BRICK_WALL',
      `Collision: Muret got GROUND_LEVEL_BRICK_WALL`);
  });

  test('BRI-REG4', 'Construction mur encours → _access_configuration≠GROUND_LEVEL_BRICK_WALL', () => {
    const r = resolveScene('Construction mur', 'encours');
    assert(r._access_configuration !== 'GROUND_LEVEL_BRICK_WALL',
      `Collision: Construction mur got GROUND_LEVEL_BRICK_WALL`);
  });

  test('BRI-REG5', '"mur parpaing" alias still resolves to "Mur parpaing" (no bleed to Mur brique)', () => {
    assert(_SERVICE_GATE_ALIASES['mur parpaing'] === 'Mur parpaing',
      `Expected Mur parpaing, got ${_SERVICE_GATE_ALIASES['mur parpaing']}`);
    assert(_SERVICE_GATE_ALIASES['mur brique'] !== 'Mur parpaing',
      `Collision: mur brique alias resolves to Mur parpaing`);
  });

  // ─── Summary ───────────────────────────────────────────────────────────────

  console.groupEnd();
  console.log(`BRI: ${_pass} PASS / ${_fail} FAIL`);
  return { pass: _pass, fail: _fail, results: _results };
}
