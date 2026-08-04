/**
 * Excavation — no-cost test suite
 * Tests:
 *   EXC-SC1..4   : state-lock resolution Excavation + encours
 *   EXC-AL1..2   : alias resolution
 *   EXC-GT1..20  : gate reject_conditions + mandatory_fields
 *   EXC-REG1..6  : regression — Décaissement / Fouilles / Terrassement maison / Tranchée / VRD no collision
 */

const { _applySiteRealism } = await import('../resolution/service-resolver.js?bust=exc-tests2');
const { SERVICE_VISUAL_GATE_RULES, _SERVICE_GATE_ALIASES } = await import('../safety/safety-rules.js?bust=exc-tests2');
const { _planBatchWorkerPresence } = await import('../planning/worker-planner.js?bust=exc-tests2');

export async function runExcavationTests() {
  console.group('EXC tests — Excavation state-lock + gate');

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
      _matched_key:     'terrassement',
      _matched_service: service,
      state_level,
      contexte:         'maison_individuelle',
    };
    return JSON.parse(_applySiteRealism(JSON.stringify(so), 0));
  }

  function evalGateExc(fields) {
    const gate = SERVICE_VISUAL_GATE_RULES['Excavation'];
    if (!gate) throw new Error('Gate "Excavation" not found in SERVICE_VISUAL_GATE_RULES');
    if (gate.mandatory_fields) {
      for (const mf of gate.mandatory_fields) {
        const v = fields[mf];
        if (typeof v !== 'boolean') {
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
    open_excavation_visible:                          true,
    active_excavator_operation_visible:               true,
    bucket_in_contact_with_soil:                      true,
    freshly_removed_soil_pile_visible:                true,
    partial_excavation_progress_visible:              true,
    residential_groundworks_context_visible:          true,
    excavator_stable_on_level_ground:                 true,
    person_inside_open_excavation:                    false,
    person_under_or_near_bucket:                      false,
    person_between_machine_and_excavation_edge:       false,
    machine_dangerously_close_to_structure:           false,
    unsupported_vertical_deep_excavation_visible:     false,
    trench_utility_installation_dominant:             false,
    foundation_rebar_visible:                         false,
    backfilling_dominant:                             false,
    ground_leveling_only_visible:                     false,
    large_industrial_site_dominant:                   false,
    machine_operator_inside_cab_visible:              true,
    ground_worker_count_is_zero:                      true,
    ground_worker_count_match:                        true,
    service_visual_match:                             true,
  };

  // ─── EXC-SC: State-lock resolution ────────────────────────────────────────

  test('EXC-SC1', 'Excavation encours → _visual_family=TERRASSEMENT-ACTIVE-EXCAVATION-GROUND', () => {
    const r = resolveScene('Excavation', 'encours');
    assert(r._visual_family === 'TERRASSEMENT-ACTIVE-EXCAVATION-GROUND',
      `Expected TERRASSEMENT-ACTIVE-EXCAVATION-GROUND, got ${r._visual_family}`);
  });

  test('EXC-SC2', 'Excavation encours → _access_configuration=MACHINE_OPERATED_OPEN_EXCAVATION', () => {
    const r = resolveScene('Excavation', 'encours');
    assert(r._access_configuration === 'MACHINE_OPERATED_OPEN_EXCAVATION',
      `Expected MACHINE_OPERATED_OPEN_EXCAVATION, got ${r._access_configuration}`);
  });

  test('EXC-SC3', 'Excavation encours → _planned_worker_count=0 propagé par le resolver', () => {
    const r = resolveScene('Excavation', 'encours');
    assert(r._planned_worker_count === 0,
      `Expected _planned_worker_count=0, got ${r._planned_worker_count}`);
  });

  test('EXC-SC4', 'Excavation terminé → _visual_family≠TERRASSEMENT-ACTIVE-EXCAVATION-GROUND (state-lock ne s\'applique pas)', () => {
    const r = resolveScene('Excavation', 'terminé');
    assert(r._visual_family !== 'TERRASSEMENT-ACTIVE-EXCAVATION-GROUND',
      `Expected _visual_family≠TERRASSEMENT-ACTIVE-EXCAVATION-GROUND for terminé, got ${r._visual_family}`);
  });

  // ─── EXC-AL: Alias resolution ─────────────────────────────────────────────

  test('EXC-AL1', "alias 'excavation' → gate 'Excavation'", () => {
    assert(_SERVICE_GATE_ALIASES['excavation'] === 'Excavation',
      `Expected "Excavation", got "${_SERVICE_GATE_ALIASES['excavation']}"`);
  });

  test('EXC-AL2', "alias 'travaux excavation' → gate 'Excavation'", () => {
    assert(_SERVICE_GATE_ALIASES['travaux excavation'] === 'Excavation',
      `Expected "Excavation", got "${_SERVICE_GATE_ALIASES['travaux excavation']}"`);
  });

  // ─── EXC-GT: Gate evaluation ──────────────────────────────────────────────

  test('EXC-GT1', 'PASS_FIELDS complets → safe=true', () => {
    const r = evalGateExc(PASS_FIELDS);
    assert(r.safe === true, `Expected safe=true, got safe=${r.safe} first_failed=${r.first_failed}`);
  });

  test('EXC-GT2', 'person_inside_open_excavation=true → access_violation', () => {
    const r = evalGateExc({ ...PASS_FIELDS, person_inside_open_excavation: true });
    assert(!r.safe && r.reason === 'access_violation',
      `Expected access_violation, got safe=${r.safe} reason=${r.reason}`);
  });

  test('EXC-GT3', 'person_under_or_near_bucket=true → access_violation', () => {
    const r = evalGateExc({ ...PASS_FIELDS, person_under_or_near_bucket: true });
    assert(!r.safe && r.reason === 'access_violation',
      `Expected access_violation, got safe=${r.safe} reason=${r.reason}`);
  });

  test('EXC-GT4', 'person_between_machine_and_excavation_edge=true → access_violation', () => {
    const r = evalGateExc({ ...PASS_FIELDS, person_between_machine_and_excavation_edge: true });
    assert(!r.safe && r.reason === 'access_violation',
      `Expected access_violation, got safe=${r.safe} reason=${r.reason}`);
  });

  test('EXC-GT5', 'machine_dangerously_close_to_structure=true → critical_violation', () => {
    const r = evalGateExc({ ...PASS_FIELDS, machine_dangerously_close_to_structure: true });
    assert(!r.safe && r.reason === 'critical_violation',
      `Expected critical_violation, got safe=${r.safe} reason=${r.reason}`);
  });

  test('EXC-GT6', 'unsupported_vertical_deep_excavation_visible=true → critical_violation', () => {
    const r = evalGateExc({ ...PASS_FIELDS, unsupported_vertical_deep_excavation_visible: true });
    assert(!r.safe && r.reason === 'critical_violation',
      `Expected critical_violation, got safe=${r.safe} reason=${r.reason}`);
  });

  test('EXC-GT7', 'trench_utility_installation_dominant=true → service_visual_mismatch', () => {
    const r = evalGateExc({ ...PASS_FIELDS, trench_utility_installation_dominant: true });
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('EXC-GT8', 'foundation_rebar_visible=true → service_visual_mismatch', () => {
    const r = evalGateExc({ ...PASS_FIELDS, foundation_rebar_visible: true });
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('EXC-GT9', 'backfilling_dominant=true → service_visual_mismatch', () => {
    const r = evalGateExc({ ...PASS_FIELDS, backfilling_dominant: true });
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('EXC-GT10', 'ground_leveling_only_visible=true → service_visual_mismatch', () => {
    const r = evalGateExc({ ...PASS_FIELDS, ground_leveling_only_visible: true });
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('EXC-GT11', 'large_industrial_site_dominant=true → service_visual_mismatch', () => {
    const r = evalGateExc({ ...PASS_FIELDS, large_industrial_site_dominant: true });
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('EXC-GT12', 'open_excavation_visible=false → service_visual_mismatch', () => {
    const r = evalGateExc({ ...PASS_FIELDS, open_excavation_visible: false });
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('EXC-GT13', 'active_excavator_operation_visible=false → service_visual_mismatch', () => {
    const r = evalGateExc({ ...PASS_FIELDS, active_excavator_operation_visible: false });
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('EXC-GT14', 'bucket_in_contact_with_soil=false → service_visual_mismatch', () => {
    const r = evalGateExc({ ...PASS_FIELDS, bucket_in_contact_with_soil: false });
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('EXC-GT15', 'freshly_removed_soil_pile_visible=false → service_visual_mismatch', () => {
    const r = evalGateExc({ ...PASS_FIELDS, freshly_removed_soil_pile_visible: false });
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('EXC-GT16', 'partial_excavation_progress_visible=false → state_mismatch', () => {
    const r = evalGateExc({ ...PASS_FIELDS, partial_excavation_progress_visible: false });
    assert(!r.safe && r.reason === 'state_mismatch',
      `Expected state_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('EXC-GT17', 'residential_groundworks_context_visible=false → service_visual_mismatch', () => {
    const r = evalGateExc({ ...PASS_FIELDS, residential_groundworks_context_visible: false });
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('EXC-GT18', 'excavator_stable_on_level_ground=false → access_violation', () => {
    const r = evalGateExc({ ...PASS_FIELDS, excavator_stable_on_level_ground: false });
    assert(!r.safe && r.reason === 'access_violation',
      `Expected access_violation, got safe=${r.safe} reason=${r.reason}`);
  });

  test('EXC-GT19', 'service_visual_match=false → service_visual_mismatch', () => {
    const r = evalGateExc({ ...PASS_FIELDS, service_visual_match: false });
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('EXC-GT20', 'ground_worker_count_match=false → worker_count_mismatch', () => {
    const r = evalGateExc({ ...PASS_FIELDS, ground_worker_count_match: false });
    assert(!r.safe && r.reason === 'worker_count_mismatch',
      `Expected worker_count_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  // ─── EXC-REG: Anti-collision regressions ──────────────────────────────────

  test('EXC-REG1', 'Décaissement encours → _visual_family≠TERRASSEMENT-ACTIVE-EXCAVATION-GROUND', () => {
    const r = resolveScene('Décaissement', 'encours');
    assert(r._visual_family !== 'TERRASSEMENT-ACTIVE-EXCAVATION-GROUND',
      `Décaissement must not collide with Excavation visual family, got ${r._visual_family}`);
  });

  test('EXC-REG2', 'Fouilles encours → _visual_family≠TERRASSEMENT-ACTIVE-EXCAVATION-GROUND', () => {
    const r = resolveScene('Fouilles', 'encours');
    assert(r._visual_family !== 'TERRASSEMENT-ACTIVE-EXCAVATION-GROUND',
      `Fouilles must not collide with Excavation visual family, got ${r._visual_family}`);
  });

  test('EXC-REG3', 'Terrassement maison encours → _visual_family≠TERRASSEMENT-ACTIVE-EXCAVATION-GROUND', () => {
    const r = resolveScene('Terrassement maison', 'encours');
    assert(r._visual_family !== 'TERRASSEMENT-ACTIVE-EXCAVATION-GROUND',
      `Terrassement maison must not collide with Excavation visual family, got ${r._visual_family}`);
  });

  test('EXC-REG4', 'Tranchée encours → _visual_family≠TERRASSEMENT-ACTIVE-EXCAVATION-GROUND', () => {
    const r = resolveScene('Tranchée', 'encours');
    assert(r._visual_family !== 'TERRASSEMENT-ACTIVE-EXCAVATION-GROUND',
      `Tranchée must not collide with Excavation visual family, got ${r._visual_family}`);
  });

  test('EXC-REG5', 'VRD encours → _access_configuration≠MACHINE_OPERATED_OPEN_EXCAVATION', () => {
    const r = resolveScene('VRD', 'encours');
    assert(r._access_configuration !== 'MACHINE_OPERATED_OPEN_EXCAVATION',
      `VRD must not collide with Excavation access_configuration, got ${r._access_configuration}`);
  });

  test('EXC-REG6', 'Excavation terminé → _access_configuration≠MACHINE_OPERATED_OPEN_EXCAVATION', () => {
    const r = resolveScene('Excavation', 'terminé');
    assert(r._access_configuration !== 'MACHINE_OPERATED_OPEN_EXCAVATION',
      `Excavation terminé must not use state-lock access_configuration, got ${r._access_configuration}`);
  });

  // ─── EXC-WP: Worker planning ──────────────────────────────────────────────

  test('EXC-WP1', 'Excavation encours state-lock → _planned_worker_count=0 (propagé par resolver)', () => {
    // Same assertion as SC3 — dedicated WP test for explicitness
    const r = resolveScene('Excavation', 'encours');
    assert(r._planned_worker_count === 0,
      `Expected _planned_worker_count=0, got ${r._planned_worker_count}`);
    assert(r._state_lock_used === true,
      `Expected _state_lock_used=true, got ${r._state_lock_used}`);
  });

  test('EXC-WP2', 'conducteur visible dans la cabine + ground_worker_count_is_zero=true → PASS', () => {
    const fields = {
      ...PASS_FIELDS,
      machine_operator_inside_cab_visible: true,
      ground_worker_count_is_zero:         true,
      ground_worker_count_match:           true,
    };
    const r = evalGateExc(fields);
    assert(r.safe === true,
      `Expected safe=true when operator in cab and no ground worker, got safe=${r.safe} first_failed=${r.first_failed}`);
  });

  test('EXC-WP3', '1 personne visible génériquement (conducteur cabine) → ground_worker_count_is_zero=true exclut le conducteur → PASS', () => {
    // Operator visible inside cab — must not count as ground worker; ground_worker_count_is_zero must stay true
    const fields = {
      ...PASS_FIELDS,
      machine_operator_inside_cab_visible: true,
      ground_worker_count_is_zero:         true,   // operator NOT counted as ground worker
      ground_worker_count_match:           true,
    };
    const r = evalGateExc(fields);
    assert(r.safe === true,
      `Expected safe=true — cab operator must not count as ground worker, got safe=${r.safe} first_failed=${r.first_failed}`);
  });

  test('EXC-WP4', '1 personne au sol + 0 planifié → ground_worker_count_is_zero=false → worker_count_mismatch', () => {
    const fields = {
      ...PASS_FIELDS,
      ground_worker_count_is_zero: false,  // 1 ground worker visible
      ground_worker_count_match:   false,  // 1 visible ≠ 0 planned
    };
    const r = evalGateExc(fields);
    assert(!r.safe && r.reason === 'worker_count_mismatch',
      `Expected worker_count_mismatch on ground_worker_count_is_zero, got safe=${r.safe} reason=${r.reason} first_failed=${r.first_failed}`);
  });

  test('EXC-WPC', 'planner chain: resolver → worker-planner → _pre_assigned_worker_count=0 (Number.isInteger, zero honoured)', () => {
    // Verify the full chain: resolver sets _planned_worker_count=0, planner honours it.
    // Must fail if planner uses value || default (zero would be lost).
    const resolved = resolveScene('Excavation', 'encours');
    assert(Number.isInteger(resolved._planned_worker_count) && resolved._planned_worker_count === 0,
      `Resolver must set _planned_worker_count=0, got ${resolved._planned_worker_count}`);
    // Build a minimal group that mimics what run-batch produces
    const task = {
      _planBase: { _matched_key: 'terrassement', _matched_service: 'Excavation', state_level: 'encours', _planned_worker_count: resolved._planned_worker_count },
      _pre_assigned_composition: 'medium_intervention',
    };
    // Run planner with a fixed seed — result must always be none/0 regardless of stochastic roll
    for (let seed = 0; seed < 20; seed++) {
      const group = [{ ...task, _planBase: { ...task._planBase } }];
      _planBatchWorkerPresence(group, `test-seed-${seed}`);
      assert(group[0]._pre_assigned_worker_count === 0,
        `seed ${seed}: expected _pre_assigned_worker_count=0, got ${group[0]._pre_assigned_worker_count}`);
      assert(group[0]._pre_assigned_worker_presence === 'none',
        `seed ${seed}: expected presence=none, got ${group[0]._pre_assigned_worker_presence}`);
    }
  });

  test('EXC-WPD', 'gate: 1 personne visible générique + conducteur cabine + ground_worker_count_is_zero=true → PASS; inverse ground_worker_count_is_zero=false → REJECT first_failed=ground_worker_count_is_zero', () => {
    // Integration: visible person count generic=1, operator in cab, no ground worker
    const passFields = {
      ...PASS_FIELDS,
      machine_operator_inside_cab_visible: true,
      ground_worker_count_is_zero:         true,
      ground_worker_count_match:           true,
    };
    const rPass = evalGateExc(passFields);
    assert(rPass.safe === true,
      `Expected PASS for operator-in-cab + zero ground workers, got safe=${rPass.safe} first_failed=${rPass.first_failed}`);
    // Inverse: operator in cab + 1 person on ground + planned 0
    const rejectFields = {
      ...PASS_FIELDS,
      machine_operator_inside_cab_visible: true,
      ground_worker_count_is_zero:         false,
      ground_worker_count_match:           false,
    };
    const rReject = evalGateExc(rejectFields);
    assert(!rReject.safe && rReject.reason === 'worker_count_mismatch',
      `Expected REJECT worker_count_mismatch, got safe=${rReject.safe} reason=${rReject.reason} first_failed=${rReject.first_failed}`);
    assert(rReject.first_failed === 'ground_worker_count_is_zero' || rReject.first_failed === 'ground_worker_count_match',
      `Expected first_failed to be ground_worker_count_is_zero or ground_worker_count_match, got ${rReject.first_failed}`);
  });

  // ─── Summary ───────────────────────────────────────────────────────────────

  console.log(`\n--- EXC: ${_pass}/${_pass + _fail} ---\n`);
  console.groupEnd();
  return { pass: _pass, fail: _fail, results: _results };
}
