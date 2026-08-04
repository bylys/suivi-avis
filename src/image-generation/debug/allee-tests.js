/**
 * Création allée — no-cost test suite
 * Tests:
 *   ALLEE-SL1  : state-lock fires for ^creation allee$ + encours
 *   ALLEE-SL2  : correct visual family and access configuration
 *   ALLEE-SL3  : resolver stamps _planned_worker_count = 1 (end-to-end)
 *   ALLEE-SL4  : _state_lock_used = true
 *   ALLEE-SL5  : state_lock_pool_size = 1
 *   ALLEE-AC1  : Création chemin does NOT trigger Création allée state-lock
 *   ALLEE-AC2  : Empierrement does NOT trigger state-lock
 *   ALLEE-AC3  : Nivellement does NOT trigger state-lock
 *   ALLEE-AC4  : Préparation terrain does NOT trigger state-lock
 *   ALLEE-GT1  : gate loaded for 'Création allée'
 *   ALLEE-GT2  : all 17 mandatory_fields present
 *   ALLEE-GT3  : PASS_FIELDS → safe=true
 *   ALLEE-GT4  : fully_completed_paved_surface_dominant=true → reject
 *   ALLEE-GT5  : jointing_sand_sweeping_dominant=true → reject
 *   ALLEE-GT6  : aggregate_subbase_only_visible=true → reject
 *   ALLEE-GT7  : concrete_slab_dominant=true → reject
 *   ALLEE-GT8  : asphalt_surface_dominant=true → reject
 *   ALLEE-GT9  : general_ground_leveling_dominant=true → reject
 *   ALLEE-GT10 : utility_trench_dominant=true → reject
 *   ALLEE-GT11 : residential_driveway_or_path_visible=false → reject
 *   ALLEE-GT12 : paving_blocks_visible=false → reject
 *   ALLEE-GT13 : active_paver_installation_visible=false → reject
 *   ALLEE-GT14 : partially_paved_and_unfinished_zones_visible=false → reject
 *   ALLEE-GT15 : bedding_sand_visible_in_unfinished_zone=false → reject
 *   ALLEE-GT16 : alignment_tool_visible=false → reject
 *   ALLEE-GT17 : rubber_mallet_or_paver_tool_visible=false → reject
 *   ALLEE-GT18 : worker_stable_on_ground=false → reject
 *   ALLEE-GT19 : service_visual_match=false → reject
 *   ALLEE-GT20 : worker_count_match=false → reject
 *   ALLEE-GT21 : null mandatory field → structured_evidence_incomplete
 *   ALL-WP1    : resolver stamps _planned_worker_count = 1
 *   ALL-WP2    : resolver → planner → _pre_assigned_worker_count = 1
 *   ALL-WP3    : planner conserves exactly 1 worker across 20 seeds
 *   ALL-WP4    : expected=1, visible=1, worker_count_match=true → gate PASS
 *   ALL-WP5    : expected=1, visible=0 or 2, worker_count_match=false → gate REJECT
 *
 * Gate field accounting (17 mandatory_fields):
 *   14 new fields added to _commonGateFields in safety-check.js + run-batch.js:
 *     residential_driveway_or_path_visible, paving_blocks_visible,
 *     active_paver_installation_visible, partially_paved_and_unfinished_zones_visible,
 *     bedding_sand_visible_in_unfinished_zone, alignment_tool_visible,
 *     rubber_mallet_or_paver_tool_visible, fully_completed_paved_surface_dominant,
 *     jointing_sand_sweeping_dominant, aggregate_subbase_only_visible,
 *     concrete_slab_dominant, asphalt_surface_dominant,
 *     general_ground_leveling_dominant, utility_trench_dominant
 *   3 pre-existing generic fields (already in _commonGateFields before this session):
 *     worker_stable_on_ground (pressure-washing gate), service_visual_match (generic),
 *     worker_count_match (generic worker instruction)
 */

const { _applySiteRealism } =
  await import('../resolution/service-resolver.js?bust=allee-sl1');

const { SERVICE_VISUAL_GATE_RULES, _SERVICE_GATE_ALIASES } =
  await import('../safety/safety-rules.js?bust=allee-gt1');

const { _planBatchWorkerPresence } =
  await import('../planning/worker-planner.js?bust=allee-wp1');

export async function runAlleeTests() {
  console.group('ALLEE tests — Création allée state-lock + gate + worker planning');

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

  function resolveScene(service_label, state_level) {
    const so = {
      _matched_key:     'terrassement',
      _matched_service: service_label,
      state_level,
      contexte:         'maison_individuelle',
    };
    return JSON.parse(_applySiteRealism(JSON.stringify(so), 0));
  }

  function evalGate(fields) {
    const gate = SERVICE_VISUAL_GATE_RULES['Création allée'];
    if (!gate) throw new Error('Gate "Création allée" not found in SERVICE_VISUAL_GATE_RULES');
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

  // ─── State-lock tests ────────────────────────────────────────────────────────

  const _resolved = resolveScene('Création allée', 'encours');

  test('ALLEE-SL1', '^creation allee$ + encours → state-lock fires', () => {
    assert(_resolved._state_lock_used === true,
      `Expected _state_lock_used=true, got ${_resolved._state_lock_used}`);
  });

  test('ALLEE-SL2', 'visual family = TERRASSEMENT-PAVER-DRIVEWAY-INSTALLATION, access = GROUND_LEVEL_PAVER_INSTALLATION', () => {
    assert(_resolved._visual_family === 'TERRASSEMENT-PAVER-DRIVEWAY-INSTALLATION',
      `Expected TERRASSEMENT-PAVER-DRIVEWAY-INSTALLATION, got ${_resolved._visual_family}`);
    assert(_resolved._access_configuration === 'GROUND_LEVEL_PAVER_INSTALLATION',
      `Expected GROUND_LEVEL_PAVER_INSTALLATION, got ${_resolved._access_configuration}`);
    assert(_resolved._access_configuration_source === 'state_lock',
      `Expected _access_configuration_source=state_lock, got ${_resolved._access_configuration_source}`);
  });

  test('ALLEE-SL3', 'resolver stamps _planned_worker_count = 1 on resolved service object', () => {
    assert(_resolved._planned_worker_count === 1,
      `Expected _planned_worker_count=1 on resolver output, got ${_resolved._planned_worker_count} — ` +
      'planned_worker_count in scenario must traverse state-lock → service resolver → _planned_worker_count');
  });

  test('ALLEE-SL4', '_state_lock_used = true', () => {
    assert(_resolved._state_lock_used === true,
      `Expected _state_lock_used=true, got ${_resolved._state_lock_used}`);
  });

  test('ALLEE-SL5', 'state_lock_pool_size = 1 (single scenario in locked pool)', () => {
    assert(_resolved._state_lock_pool_size === 1,
      `Expected _state_lock_pool_size=1, got ${_resolved._state_lock_pool_size}`);
  });

  // ─── Anti-collision tests ─────────────────────────────────────────────────────

  const _collision_cases = [
    { service_label: 'Création chemin',   id: 'ALLEE-AC1' },
    { service_label: 'Empierrement',      id: 'ALLEE-AC2' },
    { service_label: 'Nivellement',       id: 'ALLEE-AC3' },
    { service_label: 'Préparation terrain', id: 'ALLEE-AC4' },
  ];

  for (const { service_label, id } of _collision_cases) {
    const _r = resolveScene(service_label, 'encours');
    test(id, `${service_label} does NOT trigger Création allée state-lock`, () => {
      assert(_r._visual_family !== 'TERRASSEMENT-PAVER-DRIVEWAY-INSTALLATION',
        `${service_label} must not resolve to TERRASSEMENT-PAVER-DRIVEWAY-INSTALLATION — got ${_r._visual_family}`);
    });
  }

  // ─── Gate structure tests ─────────────────────────────────────────────────────

  const _gateKey = _SERVICE_GATE_ALIASES['creation allee'] ?? 'Création allée';
  const _gate    = SERVICE_VISUAL_GATE_RULES[_gateKey];

  test('ALLEE-GT1', "gate loaded for 'Création allée'", () => {
    assert(_gate !== undefined,
      `SERVICE_VISUAL_GATE_RULES['${_gateKey}'] is undefined`);
    assert(Array.isArray(_gate.mandatory_fields),
      'mandatory_fields must be an array');
    assert(Array.isArray(_gate.reject_conditions),
      'reject_conditions must be an array');
  });

  const _EXPECTED_MANDATORY = [
    'residential_driveway_or_path_visible',
    'paving_blocks_visible',
    'active_paver_installation_visible',
    'partially_paved_and_unfinished_zones_visible',
    'bedding_sand_visible_in_unfinished_zone',
    'alignment_tool_visible',
    'rubber_mallet_or_paver_tool_visible',
    'worker_stable_on_ground',
    'fully_completed_paved_surface_dominant',
    'jointing_sand_sweeping_dominant',
    'aggregate_subbase_only_visible',
    'concrete_slab_dominant',
    'asphalt_surface_dominant',
    'general_ground_leveling_dominant',
    'utility_trench_dominant',
    'service_visual_match',
    'worker_count_match',
  ];

  test('ALLEE-GT2', 'all 17 mandatory_fields present in gate', () => {
    for (const field of _EXPECTED_MANDATORY) {
      assert(_gate.mandatory_fields.includes(field),
        `mandatory_fields missing: ${field}`);
    }
    assert(_gate.mandatory_fields.length === 17,
      `Expected 17 mandatory_fields, got ${_gate.mandatory_fields.length}`);
  });

  // ─── Gate evaluation tests ────────────────────────────────────────────────────

  const PASS_FIELDS = {
    residential_driveway_or_path_visible:         true,
    paving_blocks_visible:                        true,
    active_paver_installation_visible:            true,
    partially_paved_and_unfinished_zones_visible: true,
    bedding_sand_visible_in_unfinished_zone:      true,
    alignment_tool_visible:                       true,
    rubber_mallet_or_paver_tool_visible:          true,
    worker_stable_on_ground:                      true,
    fully_completed_paved_surface_dominant:       false,
    jointing_sand_sweeping_dominant:              false,
    aggregate_subbase_only_visible:               false,
    concrete_slab_dominant:                       false,
    asphalt_surface_dominant:                     false,
    general_ground_leveling_dominant:             false,
    utility_trench_dominant:                      false,
    service_visual_match:                         true,
    worker_count_match:                           true,
  };

  test('ALLEE-GT3', 'PASS_FIELDS → safe=true', () => {
    const r = evalGate(PASS_FIELDS);
    assert(r.safe === true,
      `Expected safe=true, got safe=${r.safe}, reason=${r.reason}, first_failed=${r.first_failed}`);
  });

  const _negativeRejects = [
    { field: 'fully_completed_paved_surface_dominant', id: 'ALLEE-GT4' },
    { field: 'jointing_sand_sweeping_dominant',        id: 'ALLEE-GT5' },
    { field: 'aggregate_subbase_only_visible',         id: 'ALLEE-GT6' },
    { field: 'concrete_slab_dominant',                 id: 'ALLEE-GT7' },
    { field: 'asphalt_surface_dominant',               id: 'ALLEE-GT8' },
    { field: 'general_ground_leveling_dominant',       id: 'ALLEE-GT9' },
    { field: 'utility_trench_dominant',                id: 'ALLEE-GT10' },
  ];

  for (const { field, id } of _negativeRejects) {
    test(id, `${field}=true → reject (safe=false)`, () => {
      const r = evalGate({ ...PASS_FIELDS, [field]: true });
      assert(r.safe === false,
        `Expected safe=false when ${field}=true, got safe=${r.safe}`);
    });
  }

  const _positiveRejects = [
    { field: 'residential_driveway_or_path_visible',         id: 'ALLEE-GT11' },
    { field: 'paving_blocks_visible',                        id: 'ALLEE-GT12' },
    { field: 'active_paver_installation_visible',            id: 'ALLEE-GT13' },
    { field: 'partially_paved_and_unfinished_zones_visible', id: 'ALLEE-GT14' },
    { field: 'bedding_sand_visible_in_unfinished_zone',      id: 'ALLEE-GT15' },
    { field: 'alignment_tool_visible',                       id: 'ALLEE-GT16' },
    { field: 'rubber_mallet_or_paver_tool_visible',          id: 'ALLEE-GT17' },
    { field: 'worker_stable_on_ground',                      id: 'ALLEE-GT18' },
    { field: 'service_visual_match',                         id: 'ALLEE-GT19' },
    { field: 'worker_count_match',                           id: 'ALLEE-GT20' },
  ];

  for (const { field, id } of _positiveRejects) {
    test(id, `${field}=false → reject (safe=false)`, () => {
      const r = evalGate({ ...PASS_FIELDS, [field]: false });
      assert(r.safe === false,
        `Expected safe=false when ${field}=false, got safe=${r.safe}`);
    });
  }

  test('ALLEE-GT21', 'null mandatory field → structured_evidence_incomplete (safe=false)', () => {
    const r = evalGate({ ...PASS_FIELDS, paving_blocks_visible: null });
    assert(r.safe === false,
      `Expected safe=false on null field, got safe=${r.safe}`);
    assert(r.reason === 'structured_evidence_incomplete',
      `Expected structured_evidence_incomplete, got reason=${r.reason}`);
  });

  // ─── Worker planning end-to-end tests ─────────────────────────────────────────

  // ALL-WP1: resolver must stamp _planned_worker_count = 1
  test('ALL-WP1', 'resolver output carries _planned_worker_count = 1 (not undefined, not 2)', () => {
    assert(Number.isInteger(_resolved._planned_worker_count),
      `Expected _planned_worker_count to be an integer, got ${typeof _resolved._planned_worker_count}`);
    assert(_resolved._planned_worker_count === 1,
      `Expected _planned_worker_count=1, got ${_resolved._planned_worker_count} — ` +
      'terrassement default minW=2 must be overridden by state-lock planned_worker_count=1');
  });

  // ALL-WP2: resolver → worker planner → _pre_assigned_worker_count = 1
  test('ALL-WP2', 'resolver → worker planner → _pre_assigned_worker_count = 1 (not generic minW=2)', () => {
    const task = { taskId: 0, _planBase: _resolved, _pre_assigned_composition: 'medium_intervention' };
    _planBatchWorkerPresence([task], 42);
    assert(task._pre_assigned_worker_presence === 'workers',
      `Expected worker presence=workers, got ${task._pre_assigned_worker_presence}`);
    assert(task._pre_assigned_worker_count === 1,
      `Expected _pre_assigned_worker_count=1, got ${task._pre_assigned_worker_count} — ` +
      'state-lock must override terrassement generic minW=2');
  });

  // ALL-WP3: across 20 seeds, planner always produces exactly 1 worker (never 0, never 2)
  test('ALL-WP3', 'across 20 seeds, planner always assigns exactly 1 worker (no stochastic drift)', () => {
    const failures = [];
    for (let seed = 0; seed < 20; seed++) {
      const task = { taskId: 0, _planBase: _resolved, _pre_assigned_composition: 'medium_intervention' };
      _planBatchWorkerPresence([task], seed);
      const c = task._pre_assigned_worker_count;
      const p = task._pre_assigned_worker_presence;
      if (p !== 'workers' || c !== 1) {
        failures.push(`seed=${seed}: presence=${p}, count=${c}`);
      }
    }
    assert(failures.length === 0,
      `Stochastic drift detected in ${failures.length}/20 seeds: ${failures.slice(0,3).join('; ')}`);
  });

  // ALL-WP4: expected=1, visible=1, worker_count_match=true → gate PASS
  test('ALL-WP4', 'expected_worker_count=1, visible_worker_count=1, worker_count_match=true → gate PASS', () => {
    const r = evalGate({ ...PASS_FIELDS, worker_count_match: true });
    assert(r.safe === true,
      `Expected safe=true when visible=1 matches expected=1, got safe=${r.safe}, reason=${r.reason}`);
  });

  // ALL-WP5: expected=1, visible=0 or 2, worker_count_match=false → gate REJECT
  test('ALL-WP5', 'worker_count_match=false (visible=0 or visible=2) → REJECT worker_count_mismatch', () => {
    const r0 = evalGate({ ...PASS_FIELDS, worker_count_match: false });
    assert(r0.safe === false,
      `Expected safe=false when worker_count_match=false (visible=0), got safe=${r0.safe}`);
    assert(r0.reason === 'worker_count_mismatch',
      `Expected reason=worker_count_mismatch, got ${r0.reason}`);
    // visible=2 also fails (worker_count_match=false covers both under- and over-count)
    const r2 = evalGate({ ...PASS_FIELDS, worker_count_match: false });
    assert(r2.safe === false,
      `Expected safe=false when worker_count_match=false (visible=2), got safe=${r2.safe}`);
  });

  // ─── Summary ─────────────────────────────────────────────────────────────────

  console.log(`\n--- ALLEE: ${_pass}/${_pass + _fail} ---\n`);
  console.groupEnd();
  return { pass: _pass, fail: _fail, results: _results };
}
