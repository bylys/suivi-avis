/**
 * Fondation / Semelle béton — no-cost test suite
 * Tests:
 *   FON-SC1..6 : state-lock resolution for Fondation + Semelle béton + encours
 *   FON-GT1..12: gate reject_conditions
 *   FON-AL1..2 : alias resolution + gate count
 *   FON-REG1..5: regression — Ferraillage, Dalle béton, Coulage dalle, Fondations profondes, Mur parpaing
 */

const { _applySiteRealism }   = await import('../resolution/service-resolver.js?bust=fon-tests3');
const { SERVICE_VISUAL_GATE_RULES, _SERVICE_GATE_ALIASES } = await import('../safety/safety-rules.js?bust=fon-tests3');

export async function runFondationTests() {
  console.group('FON tests — Fondation / Semelle béton state-lock + gate');

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
    const gate = SERVICE_VISUAL_GATE_RULES['Fondation'];
    if (!gate) throw new Error('Gate "Fondation" not found in SERVICE_VISUAL_GATE_RULES');
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

  // ─── FON-SC: Scene resolution ───────────────────────────────────────────────

  test('FON-SC1', 'Fondation encours → _state_lock_used=true', () => {
    const r = resolveScene('Fondation', 'encours');
    assert(r._state_lock_used === true,
      `_state_lock_used expected true, got ${r._state_lock_used}`);
  });

  test('FON-SC2', 'Fondation encours → _state_lock_pool_size=1', () => {
    const r = resolveScene('Fondation', 'encours');
    assert(r._state_lock_pool_size === 1,
      `_state_lock_pool_size expected 1, got ${r._state_lock_pool_size}`);
  });

  test('FON-SC3', 'Fondation encours → _visual_family=MACONNERIE-STRIP-FOUNDATION-REBAR', () => {
    const r = resolveScene('Fondation', 'encours');
    assert(r._visual_family === 'MACONNERIE-STRIP-FOUNDATION-REBAR',
      `_visual_family expected MACONNERIE-STRIP-FOUNDATION-REBAR, got ${r._visual_family}`);
  });

  test('FON-SC4', 'Fondation encours → _access_configuration=GROUND_LEVEL_SHALLOW_FOUNDATION', () => {
    const r = resolveScene('Fondation', 'encours');
    assert(r._access_configuration === 'GROUND_LEVEL_SHALLOW_FOUNDATION',
      `_access_configuration expected GROUND_LEVEL_SHALLOW_FOUNDATION, got ${r._access_configuration}`);
  });

  test('FON-SC5', 'Semelle béton encours → same state-lock as Fondation', () => {
    const r = resolveScene('Semelle béton', 'encours');
    assert(r._state_lock_used === true, `state_lock_used expected true`);
    assert(r._visual_family === 'MACONNERIE-STRIP-FOUNDATION-REBAR',
      `visual_family expected MACONNERIE-STRIP-FOUNDATION-REBAR, got ${r._visual_family}`);
    assert(r._access_configuration === 'GROUND_LEVEL_SHALLOW_FOUNDATION',
      `access_configuration expected GROUND_LEVEL_SHALLOW_FOUNDATION, got ${r._access_configuration}`);
  });

  test('FON-SC6', 'Fondation début → state_lock_used=false (no lock on début)', () => {
    const r = resolveScene('Fondation', 'debut');
    assert(r._state_lock_used === false,
      `Fondation début must not hit state-lock, got state_lock_used=${r._state_lock_used}`);
  });

  // ─── FON-GT: Gate evaluation ────────────────────────────────────────────────

  const PASS_FIELDS = {
    shallow_foundation_trench_visible:   true,
    strip_footing_rebar_cage_visible:    true,
    rebar_stirrups_visible:              true,
    rebar_supported_off_soil_with_visible_cover_supports: true,
    active_rebar_tying_visible:          true,
    partial_foundation_progress_visible: true,
    excavated_soil_visible:              true,
    worker_stable_at_ground_level:       true,
    work_area_reachable_from_ground:     true,
    worker_inside_trench:                false,
    deep_unprotected_trench_visible:     false,
    slab_formwork_visible:               false,
    horizontal_slab_mesh_dominant:       false,
    fresh_concrete_poured_visible:       false,
    service_visual_match:                true,
    worker_count_match:                  true,
  };

  test('FON-GT1', 'Tranchée + cage + ligature active → PASS', () => {
    const r = evalGate(PASS_FIELDS);
    assert(r.safe === true, `Expected PASS, got REJECT on ${r.first_failed} (${r.reason})`);
  });

  test('FON-GT2', 'worker_inside_trench=true → REJECT access_violation', () => {
    const r = evalGate({ ...PASS_FIELDS, worker_inside_trench: true });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'access_violation', `Expected access_violation, got ${r.reason}`);
    assert(r.first_failed === 'worker_inside_trench',
      `Expected first_failed=worker_inside_trench, got ${r.first_failed}`);
  });

  test('FON-GT3', 'deep_unprotected_trench_visible=true → REJECT critical_violation', () => {
    const r = evalGate({ ...PASS_FIELDS, deep_unprotected_trench_visible: true });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'critical_violation', `Expected critical_violation, got ${r.reason}`);
  });

  test('FON-GT4', 'slab_formwork_visible=true (dalle coffrage) → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, slab_formwork_visible: true });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'service_visual_mismatch', `Expected service_visual_mismatch, got ${r.reason}`);
  });

  test('FON-GT5', 'horizontal_slab_mesh_dominant=true (treillis dalle) → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, horizontal_slab_mesh_dominant: true });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'service_visual_mismatch', `Expected service_visual_mismatch, got ${r.reason}`);
  });

  test('FON-GT6', 'fresh_concrete_poured_visible=true → REJECT state_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, fresh_concrete_poured_visible: true });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'state_mismatch', `Expected state_mismatch, got ${r.reason}`);
  });

  test('FON-GT7', 'shallow_foundation_trench_visible=false → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, shallow_foundation_trench_visible: false });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'service_visual_mismatch', `Expected service_visual_mismatch, got ${r.reason}`);
  });

  test('FON-GT8', 'active_rebar_tying_visible=false (armature simplement stockée) → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, active_rebar_tying_visible: false });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'service_visual_mismatch', `Expected service_visual_mismatch, got ${r.reason}`);
  });

  test('FON-GT9', 'partial_foundation_progress_visible=false → REJECT state_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, partial_foundation_progress_visible: false });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'state_mismatch', `Expected state_mismatch, got ${r.reason}`);
  });

  test('FON-GT10', 'worker_stable_at_ground_level=false (worker dans tranchée) → REJECT access_violation', () => {
    const r = evalGate({ ...PASS_FIELDS, worker_stable_at_ground_level: false });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'access_violation', `Expected access_violation, got ${r.reason}`);
  });

  test('FON-GT11', 'champ positif requis null → REJECT structured_evidence_incomplete (mandatory_fields)', () => {
    const r = evalGate({ ...PASS_FIELDS, shallow_foundation_trench_visible: null });
    assert(r.safe === false, 'Expected REJECT on null required field');
    assert(r.reason === 'structured_evidence_incomplete', `Expected structured_evidence_incomplete, got ${r.reason}`);
    assert(r.first_failed === 'shallow_foundation_trench_visible',
      `Expected first_failed=shallow_foundation_trench_visible, got ${r.first_failed}`);
  });

  test('FON-GT12', 'worker_count_match=false → REJECT worker_count_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, worker_count_match: false });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'worker_count_mismatch', `Expected worker_count_mismatch, got ${r.reason}`);
  });

  test('FON-GT13', 'cales béton visibles sous la cage → PASS', () => {
    const r = evalGate({ ...PASS_FIELDS, rebar_supported_off_soil_with_visible_cover_supports: true });
    assert(r.safe === true, `Expected PASS with cover blocks, got REJECT on ${r.first_failed} (${r.reason})`);
  });

  test('FON-GT14', 'chaises ou distanciers visibles → PASS', () => {
    // chaises métalliques et distanciers plastiques sont des supports valides (même champ)
    const r = evalGate({ ...PASS_FIELDS, rebar_supported_off_soil_with_visible_cover_supports: true });
    assert(r.safe === true, `Expected PASS with rebar chairs/spacers, got REJECT on ${r.first_failed} (${r.reason})`);
  });

  test('FON-GT15', 'cage directement posée sur la terre → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, rebar_supported_off_soil_with_visible_cover_supports: false });
    assert(r.safe === false, 'Expected REJECT when cage rests on soil');
    assert(r.reason === 'service_visual_mismatch', `Expected service_visual_mismatch, got ${r.reason}`);
    assert(r.first_failed === 'rebar_supported_off_soil_with_visible_cover_supports',
      `Expected first_failed=rebar_supported_off_soil_with_visible_cover_supports, got ${r.first_failed}`);
  });

  test('FON-GT16', 'rebar_supported_off_soil_with_visible_cover_supports=null → REJECT structured_evidence_incomplete', () => {
    const r = evalGate({ ...PASS_FIELDS, rebar_supported_off_soil_with_visible_cover_supports: null });
    assert(r.safe === false, 'Expected REJECT on null cover supports field');
    assert(r.reason === 'structured_evidence_incomplete', `Expected structured_evidence_incomplete, got ${r.reason}`);
  });

  test('FON-GT17', 'tous les champs obligatoires booléens → gate procède et PASS', () => {
    // All mandatory fields are booleans in PASS_FIELDS → mandatory check passes → reject_conditions pass → PASS
    const r = evalGate({ ...PASS_FIELDS });
    assert(r.safe === true, `Expected PASS when all mandatory fields are boolean, got REJECT on ${r.first_failed} (${r.reason})`);
  });

  test('FON-GT18', 'champ négatif obligatoire null (worker_inside_trench=null) → REJECT structured_evidence_incomplete', () => {
    // worker_inside_trench is mandatory; null here would have PASSED reject_conditions (value:true check) but mandatory catches it
    const r = evalGate({ ...PASS_FIELDS, worker_inside_trench: null });
    assert(r.safe === false, 'Expected REJECT on null safety-critical negative field');
    assert(r.reason === 'structured_evidence_incomplete', `Expected structured_evidence_incomplete, got ${r.reason}`);
    assert(r.first_failed === 'worker_inside_trench',
      `Expected first_failed=worker_inside_trench, got ${r.first_failed}`);
  });

  test('FON-GT19', 'slab_formwork_visible=null → REJECT structured_evidence_incomplete (not bypassed via value:true check)', () => {
    // Without mandatory_fields, slab_formwork_visible=null would NOT trigger value:true → gate would PASS incorrectly
    const r = evalGate({ ...PASS_FIELDS, slab_formwork_visible: null });
    assert(r.safe === false, 'Expected REJECT on null negative field');
    assert(r.reason === 'structured_evidence_incomplete', `Expected structured_evidence_incomplete, got ${r.reason}`);
  });

  test('FON-GT20', 'service_visual_match=true + tous champs obligatoires null → REJECT structured_evidence_incomplete', () => {
    // service_visual_match=true cannot court-circuit the gate when mandatory fields are absent
    const nullFields = {
      shallow_foundation_trench_visible:                    null,
      strip_footing_rebar_cage_visible:                     null,
      rebar_stirrups_visible:                               null,
      rebar_supported_off_soil_with_visible_cover_supports: null,
      active_rebar_tying_visible:                           null,
      partial_foundation_progress_visible:                  null,
      worker_stable_at_ground_level:                        null,
      worker_inside_trench:                                 null,
      deep_unprotected_trench_visible:                      null,
      slab_formwork_visible:                                null,
      horizontal_slab_mesh_dominant:                        null,
      fresh_concrete_poured_visible:                        null,
      service_visual_match:                                 true,
      worker_count_match:                                   true,
    };
    const r = evalGate(nullFields);
    assert(r.safe === false, 'Expected REJECT when mandatory fields are all null even with service_visual_match=true');
    assert(r.reason === 'structured_evidence_incomplete', `Expected structured_evidence_incomplete, got ${r.reason}`);
  });

  test('FON-GT21', 'visible=1, expected=1 → computed worker_count_match=true', () => {
    // Unit test for computed match formula: visibleWC >= expectedWC
    const visibleWC  = 1;
    const expectedWC = 1;
    const computedMatch = visibleWC >= expectedWC;
    assert(computedMatch === true, `Expected 1 >= 1 = true, got ${computedMatch}`);
    // Gate with worker_count_match=true (computed) → PASS
    const r = evalGate({ ...PASS_FIELDS, worker_count_match: computedMatch });
    assert(r.safe === true, `Expected PASS with computedMatch=true, got REJECT on ${r.first_failed} (${r.reason})`);
  });

  // ─── FON-AL: Alias resolution ───────────────────────────────────────────────

  test('FON-AL1', 'Alias "fondation" + "semelle beton" → gate "Fondation" exists', () => {
    assert(_SERVICE_GATE_ALIASES['fondation'] === 'Fondation',
      `Expected "Fondation" for alias "fondation", got "${_SERVICE_GATE_ALIASES['fondation']}"`);
    assert(_SERVICE_GATE_ALIASES['semelle beton'] === 'Fondation',
      `Expected "Fondation" for alias "semelle beton", got "${_SERVICE_GATE_ALIASES['semelle beton']}"`);
    assert(SERVICE_VISUAL_GATE_RULES['Fondation'] !== undefined,
      'Gate "Fondation" must exist in SERVICE_VISUAL_GATE_RULES');
  });

  test('FON-AL2', 'Gate "Fondation" has 15 reject_conditions et 12 mandatory_fields', () => {
    const gate = SERVICE_VISUAL_GATE_RULES['Fondation'];
    assert(gate && Array.isArray(gate.reject_conditions),
      'Gate must have reject_conditions array');
    assert(gate.reject_conditions.length === 15,
      `Expected 15 reject_conditions, got ${gate.reject_conditions.length}`);
    assert(Array.isArray(gate.mandatory_fields),
      'Gate must have mandatory_fields array');
    assert(gate.mandatory_fields.length === 12,
      `Expected 12 mandatory_fields, got ${gate.mandatory_fields.length}`);
  });

  // ─── FON-REG: Regression ────────────────────────────────────────────────────

  test('FON-REG1', 'Ferraillage encours → state_lock_used=false (no collision)', () => {
    const r = resolveScene('Ferraillage', 'encours');
    assert(r._state_lock_used === false,
      `Ferraillage must not hit Fondation state-lock, got state_lock_used=${r._state_lock_used}`);
  });

  test('FON-REG2', 'Dalle béton encours → MACONNERIE-CONCRETE-SLAB-REBAR (unchanged)', () => {
    const r = resolveScene('Dalle béton', 'encours');
    assert(r._state_lock_used === true, `Dalle béton state-lock must still resolve`);
    assert(r._visual_family === 'MACONNERIE-CONCRETE-SLAB-REBAR',
      `visual_family expected MACONNERIE-CONCRETE-SLAB-REBAR, got ${r._visual_family}`);
  });

  test('FON-REG3', 'Coulage dalle encours → state_lock_used=false (no collision)', () => {
    const r = resolveScene('Coulage dalle', 'encours');
    assert(r._state_lock_used === false,
      `Coulage dalle must not hit Fondation state-lock, got state_lock_used=${r._state_lock_used}`);
  });

  test('FON-REG4', 'Fondations profondes encours → state_lock_used=false (exact regex guard)', () => {
    const r = resolveScene('Fondations profondes', 'encours');
    assert(r._state_lock_used === false,
      `"Fondations profondes" must not match ^(fondation|semelle beton)$, got state_lock_used=${r._state_lock_used}`);
  });

  test('FON-REG5', 'Mur parpaing encours → MACONNERIE-WALL-BLOCK-GROUND (unchanged)', () => {
    const r = resolveScene('Mur parpaing', 'encours');
    assert(r._visual_family === 'MACONNERIE-WALL-BLOCK-GROUND',
      `Mur parpaing visual_family unchanged, got ${r._visual_family}`);
  });

  // ─── Summary ───────────────────────────────────────────────────────────────

  console.log(`\n--- FON: ${_pass}/${_pass + _fail} ---\n`);
  console.groupEnd();
  return { pass: _pass, fail: _fail, results: _results };
}
