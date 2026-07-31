/**
 * Ravalement de façade — no-cost test suite
 * Tests:
 *   RAV-SL1..4  : state-lock resolution (encours → SCAFFOLD_READY_GROUND_CREW, pool_size=1, 2 workers)
 *   RAV-GT1..10 : gate reject_conditions_by_access.SCAFFOLD_READY_GROUND_CREW (10 conditions)
 *   RAV-AL1..2  : alias resolution + condition count
 *   RAV-RT1..2  : RAVALEMENT_SCAFFOLD_RETRY ground-crew text
 */

const { _applySiteRealism, _serviceGroup }     = await import('../resolution/service-resolver.js?bust=rav-tests3');
const { _planBatchWorkerPresence }             = await import('../planning/worker-planner.js?bust=rav-tests3');
const { SERVICE_VISUAL_GATE_RULES, _SERVICE_GATE_ALIASES, RAVALEMENT_SCAFFOLD_RETRY } = await import('../safety/safety-rules.js?bust=rav-tests3');
const { WORKER_SCENE_RULES }                   = await import('../safety/worker-rules.js?bust=rav-tests3');

export async function runRavalementTests() {
  console.group('RAV tests — Ravalement de façade scene-lock + gate');

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

  function resolveRavalement(state_level) {
    const so = {
      _matched_key:     'ravalement',
      _matched_service: 'Ravalement de façade',
      state_level,
      contexte:         'maison_individuelle',
    };
    return JSON.parse(_applySiteRealism(JSON.stringify(so), 0));
  }

  function evalGate(fields) {
    const gate = SERVICE_VISUAL_GATE_RULES['Ravalement de façade'];
    if (!gate) throw new Error('Gate "Ravalement de façade" not found in SERVICE_VISUAL_GATE_RULES');
    const conditions = gate.reject_conditions_by_access?.SCAFFOLD_READY_GROUND_CREW;
    if (!conditions) throw new Error('reject_conditions_by_access.SCAFFOLD_READY_GROUND_CREW not found');
    for (const cond of conditions) {
      if ('value' in cond && fields[cond.field] === cond.value) {
        return { safe: false, first_failed: cond.field, reason: cond.reason };
      }
      if (cond.not_exactly_true && fields[cond.field] !== true) {
        return { safe: false, first_failed: cond.field, reason: cond.reason };
      }
    }
    return { safe: true };
  }

  // ─── RAV-SL: State-lock resolution ─────────────────────────────────────────

  test('RAV-SL1', 'Ravalement encours → state_lock_used=true', () => {
    const r = resolveRavalement('encours');
    assert(r._state_lock_used === true, `_state_lock_used expected true, got ${r._state_lock_used}`);
  });

  test('RAV-SL2', 'Ravalement encours → state_lock_pool_size=1', () => {
    const r = resolveRavalement('encours');
    assert(r._state_lock_pool_size === 1, `_state_lock_pool_size expected 1, got ${r._state_lock_pool_size}`);
  });

  test('RAV-SL3', 'Ravalement encours → _access_configuration=SCAFFOLD_READY_GROUND_CREW', () => {
    const r = resolveRavalement('encours');
    assert(r._access_configuration === 'SCAFFOLD_READY_GROUND_CREW',
      `_access_configuration expected SCAFFOLD_READY_GROUND_CREW, got ${r._access_configuration}`);
    assert(r._access_configuration_source === 'state_lock',
      `_access_configuration_source expected state_lock, got ${r._access_configuration_source}`);
  });

  test('RAV-SL4', 'Ravalement encours → state_worker_minimums[encours]=2, semifinal=2', () => {
    const wRules = WORKER_SCENE_RULES.ravalement;
    assert(wRules.state_worker_minimums?.encours === 2,
      `state_worker_minimums.encours expected 2, got ${wRules.state_worker_minimums?.encours}`);
    assert(wRules.state_worker_minimums?.semifinal === 2,
      `state_worker_minimums.semifinal expected 2, got ${wRules.state_worker_minimums?.semifinal}`);
    assert(!wRules.min_workers_when_visible,
      `min_workers_when_visible should be absent (state-scoped only), got ${wRules.min_workers_when_visible}`);
  });

  test('RAV-SL5', 'Ravalement debut → state_lock_used=false (no _state_for for debut)', () => {
    const r = resolveRavalement('debut');
    assert(r._state_lock_used === false, `_state_lock_used expected false for debut, got ${r._state_lock_used}`);
  });

  // ─── RAV-GT: Gate evaluation (SCAFFOLD_READY_GROUND_CREW branch) ─────────

  const PASS_FIELDS = {
    worker_on_roof_surface:    false,
    interior_painting_visible: false,
    facade_fully_completed:    false,
    all_workers_on_ground:     true,
    scaffold_visible:          true,
    scaffold_coherent:         true,
    worker_on_scaffold:        false,
    facade_work_in_progress:   true,
    service_visual_match:      true,
    worker_count_matches_plan: true,
  };

  test('RAV-GT1', '2 workers au sol + échafaudage visible + ravalement encours → PASS', () => {
    const r = evalGate(PASS_FIELDS);
    assert(r.safe === true, `Expected PASS, got REJECT on ${r.first_failed} (${r.reason})`);
  });

  test('RAV-GT2', 'all_workers_on_ground=false → REJECT access_violation', () => {
    const r = evalGate({ ...PASS_FIELDS, all_workers_on_ground: false });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'access_violation', `Expected access_violation, got ${r.reason}`);
  });

  test('RAV-GT3', 'worker_on_scaffold=true → REJECT critical_violation', () => {
    const r = evalGate({ ...PASS_FIELDS, worker_on_scaffold: true });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'critical_violation', `Expected critical_violation, got ${r.reason}`);
  });

  test('RAV-GT4', 'worker_on_roof_surface=true → REJECT forbidden_roof_scene', () => {
    const r = evalGate({ ...PASS_FIELDS, worker_on_roof_surface: true });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'forbidden_roof_scene', `Expected forbidden_roof_scene, got ${r.reason}`);
  });

  test('RAV-GT5', 'scaffold_visible=false → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, scaffold_visible: false });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'service_visual_mismatch', `Expected service_visual_mismatch, got ${r.reason}`);
  });

  test('RAV-GT6', 'scaffold_coherent=false → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, scaffold_coherent: false });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'service_visual_mismatch', `Expected service_visual_mismatch, got ${r.reason}`);
  });

  test('RAV-GT7', 'interior_painting_visible=true → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, interior_painting_visible: true });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'service_visual_mismatch', `Expected service_visual_mismatch, got ${r.reason}`);
  });

  test('RAV-GT8', 'facade_fully_completed=true → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, facade_fully_completed: true });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'service_visual_mismatch', `Expected service_visual_mismatch, got ${r.reason}`);
  });

  test('RAV-GT9', 'facade_work_in_progress=false → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, facade_work_in_progress: false });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'service_visual_mismatch', `Expected service_visual_mismatch, got ${r.reason}`);
  });

  test('RAV-GT10', 'worker_count_matches_plan=false → REJECT worker_count_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, worker_count_matches_plan: false });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'worker_count_mismatch', `Expected worker_count_mismatch, got ${r.reason}`);
  });

  // ─── RAV-AL: Alias resolution ───────────────────────────────────────────────

  test('RAV-AL1', 'Alias "ravalement de facade" → Ravalement de façade gate exists', () => {
    const canonical = _SERVICE_GATE_ALIASES['ravalement de facade'];
    assert(canonical === 'Ravalement de façade',
      `Expected "Ravalement de façade", got "${canonical}"`);
    assert(SERVICE_VISUAL_GATE_RULES[canonical] !== undefined,
      'Gate "Ravalement de façade" must exist in SERVICE_VISUAL_GATE_RULES');
  });

  test('RAV-AL2', 'Gate "Ravalement de façade" SCAFFOLD_READY_GROUND_CREW has 10 reject_conditions', () => {
    const gate = SERVICE_VISUAL_GATE_RULES['Ravalement de façade'];
    const conditions = gate?.reject_conditions_by_access?.SCAFFOLD_READY_GROUND_CREW;
    assert(conditions && Array.isArray(conditions),
      'reject_conditions_by_access.SCAFFOLD_READY_GROUND_CREW must be an array');
    assert(conditions.length === 10,
      `Expected 10 reject_conditions for SCAFFOLD_READY_GROUND_CREW, got ${conditions.length}`);
  });

  // ─── RAV-RT: Retry injection ────────────────────────────────────────────────

  test('RAV-RT1', 'critical_violation retry → mentions GROUND and SCAFFOLD (ground-crew doctrine)', () => {
    const text = RAVALEMENT_SCAFFOLD_RETRY['critical_violation'];
    assert(typeof text === 'string' && text.length > 20,
      'RAVALEMENT_SCAFFOLD_RETRY[critical_violation] must be a non-empty string');
    assert(text.toUpperCase().includes('GROUND'),
      'critical_violation retry must mention GROUND');
    assert(text.toUpperCase().includes('SCAFFOLD'),
      'critical_violation retry must mention SCAFFOLD');
  });

  test('RAV-RT2', 'access_violation retry → mentions GROUND and SCAFFOLD (ground-crew doctrine)', () => {
    const text = RAVALEMENT_SCAFFOLD_RETRY['access_violation'];
    assert(typeof text === 'string' && text.length > 20,
      'RAVALEMENT_SCAFFOLD_RETRY[access_violation] must be a non-empty string');
    assert(text.toUpperCase().includes('GROUND'),
      'access_violation retry must mention GROUND');
    assert(text.toUpperCase().includes('SCAFFOLD'),
      'access_violation retry must mention SCAFFOLD');
  });

  // ─── Summary ───────────────────────────────────────────────────────────────

  console.log(`\n--- RAV: ${_pass}/${_pass + _fail} ---\n`);
  console.groupEnd();
  return { pass: _pass, fail: _fail, results: _results };
}
