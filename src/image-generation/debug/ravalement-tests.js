/**
 * Ravalement de façade — no-cost test suite
 * Tests:
 *   RAV-SL1..4  : state-lock resolution (encours → SCAFFOLD_PLATFORM, pool_size=1, 2 workers)
 *   RAV-GT1..8  : gate reject_conditions (scaffold visible, complete, guardrails, workers on platform,
 *                  worker on roof/guardrail/ladder, interior painting, finished facade, service match,
 *                  worker count)
 */

const { _applySiteRealism, _serviceGroup }     = await import('../resolution/service-resolver.js?bust=rav-tests2');
const { _planBatchWorkerPresence }             = await import('../planning/worker-planner.js?bust=rav-tests2');
const { SERVICE_VISUAL_GATE_RULES, _SERVICE_GATE_ALIASES, RAVALEMENT_SCAFFOLD_RETRY } = await import('../safety/safety-rules.js?bust=rav-tests2');
const { WORKER_SCENE_RULES }                   = await import('../safety/worker-rules.js?bust=rav-tests2');

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

  // ─── RAV-SL: State-lock resolution ─────────────────────────────────────────

  test('RAV-SL1', 'Ravalement encours → state_lock_used=true', () => {
    const r = resolveRavalement('encours');
    assert(r._state_lock_used === true, `_state_lock_used expected true, got ${r._state_lock_used}`);
  });

  test('RAV-SL2', 'Ravalement encours → state_lock_pool_size=1', () => {
    const r = resolveRavalement('encours');
    assert(r._state_lock_pool_size === 1, `_state_lock_pool_size expected 1, got ${r._state_lock_pool_size}`);
  });

  test('RAV-SL3', 'Ravalement encours → _access_configuration=SCAFFOLD_PLATFORM', () => {
    const r = resolveRavalement('encours');
    assert(r._access_configuration === 'SCAFFOLD_PLATFORM',
      `_access_configuration expected SCAFFOLD_PLATFORM, got ${r._access_configuration}`);
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

  // ─── RAV-GT: Gate evaluation ────────────────────────────────────────────────

  const PASS_FIELDS = {
    scaffold_visible:               true,
    scaffold_platform_complete:     true,
    scaffold_guardrails_visible:    true,
    scaffold_stable_and_supported:  true,
    workers_supported_by_platform:  true,
    worker_standing_on_guardrail:   false,
    worker_on_ladder_as_workstation: false,
    worker_on_roof_surface:         false,
    interior_painting_visible:      false,
    facade_work_in_progress:        true,
    facade_fully_completed:         false,
    service_visual_match:           true,
    worker_count_matches_plan:      true,
  };

  test('RAV-GT1', 'Complete scaffold + 2 workers + active render → PASS', () => {
    const r = evalGate(PASS_FIELDS);
    assert(r.safe === true, `Expected PASS, got REJECT on ${r.first_failed} (${r.reason})`);
  });

  test('RAV-GT2', 'scaffold_platform_complete=false → REJECT access_violation', () => {
    const r = evalGate({ ...PASS_FIELDS, scaffold_platform_complete: false });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'access_violation', `Expected access_violation, got ${r.reason}`);
    assert(r.first_failed === 'scaffold_platform_complete',
      `Expected first_failed=scaffold_platform_complete, got ${r.first_failed}`);
  });

  test('RAV-GT3', 'scaffold_guardrails_visible=false → REJECT critical_violation', () => {
    const r = evalGate({ ...PASS_FIELDS, scaffold_guardrails_visible: false });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'critical_violation', `Expected critical_violation, got ${r.reason}`);
  });

  test('RAV-GT4', 'worker_on_ladder_as_workstation=true → REJECT access_violation', () => {
    const r = evalGate({ ...PASS_FIELDS, worker_on_ladder_as_workstation: true });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'access_violation', `Expected access_violation, got ${r.reason}`);
  });

  test('RAV-GT5', 'worker_on_roof_surface=true → REJECT forbidden_roof_scene', () => {
    const r = evalGate({ ...PASS_FIELDS, worker_on_roof_surface: true });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'forbidden_roof_scene', `Expected forbidden_roof_scene, got ${r.reason}`);
  });

  test('RAV-GT6', 'interior_painting_visible=true → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, interior_painting_visible: true });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'service_visual_mismatch', `Expected service_visual_mismatch, got ${r.reason}`);
  });

  test('RAV-GT7', 'facade_fully_completed=true → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, facade_fully_completed: true });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'service_visual_mismatch', `Expected service_visual_mismatch, got ${r.reason}`);
  });

  test('RAV-GT8', 'worker_count_matches_plan=false → REJECT worker_count_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, worker_count_matches_plan: false });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'worker_count_mismatch', `Expected worker_count_mismatch, got ${r.reason}`);
  });

  test('RAV-GT9', 'worker_standing_on_guardrail=true → REJECT critical_violation', () => {
    const r = evalGate({ ...PASS_FIELDS, worker_standing_on_guardrail: true });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'critical_violation', `Expected critical_violation, got ${r.reason}`);
  });

  test('RAV-GT10', 'scaffold_visible=false → REJECT access_violation (fires before incomplete platform)', () => {
    const r = evalGate({ ...PASS_FIELDS, scaffold_visible: false, scaffold_platform_complete: false });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'access_violation', `Expected access_violation, got ${r.reason}`);
  });

  // ─── RAV-AL: Alias resolution ───────────────────────────────────────────────

  test('RAV-AL1', 'Alias "ravalement de facade" → Ravalement de façade gate exists', () => {
    const canonical = _SERVICE_GATE_ALIASES['ravalement de facade'];
    assert(canonical === 'Ravalement de façade',
      `Expected "Ravalement de façade", got "${canonical}"`);
    assert(SERVICE_VISUAL_GATE_RULES[canonical] !== undefined,
      'Gate "Ravalement de façade" must exist in SERVICE_VISUAL_GATE_RULES');
  });

  test('RAV-AL2', 'Gate "Ravalement de façade" has 12 reject_conditions', () => {
    const gate = SERVICE_VISUAL_GATE_RULES['Ravalement de façade'];
    assert(gate && Array.isArray(gate.reject_conditions),
      'Gate must have reject_conditions array');
    assert(gate.reject_conditions.length === 12,
      `Expected 12 reject_conditions, got ${gate.reject_conditions.length}`);
  });

  // ─── RAV-RT: Retry injection ────────────────────────────────────────────────

  test('RAV-RT1', 'critical_violation retry → RAVALEMENT_SCAFFOLD_RETRY has guardrail text', () => {
    const text = RAVALEMENT_SCAFFOLD_RETRY['critical_violation'];
    assert(typeof text === 'string' && text.length > 20,
      'RAVALEMENT_SCAFFOLD_RETRY[critical_violation] must be a non-empty string');
    assert(text.toUpperCase().includes('GUARDRAIL'),
      'critical_violation retry must mention GUARDRAIL');
  });

  test('RAV-RT2', 'access_violation retry → cumulative: contains both platform and guardrail text', () => {
    const text = RAVALEMENT_SCAFFOLD_RETRY['access_violation'];
    assert(typeof text === 'string' && text.length > 20,
      'RAVALEMENT_SCAFFOLD_RETRY[access_violation] must be a non-empty string');
    assert(text.toUpperCase().includes('PLATFORM') || text.toUpperCase().includes('DECK'),
      'access_violation retry must mention PLATFORM or DECK');
    assert(text.toUpperCase().includes('GUARDRAIL'),
      'access_violation retry must also mention GUARDRAIL (cumulative)');
  });

  // ─── Summary ───────────────────────────────────────────────────────────────

  console.log(`\n--- RAV: ${_pass}/${_pass + _fail} ---\n`);
  console.groupEnd();
  return { pass: _pass, fail: _fail, results: _results };
}
