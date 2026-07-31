/**
 * Débarras — no-cost test suite
 *   DEB-SC1 : Débarras cave encours → DEBARRAS-CAVE-INTERIOR / CELLAR_INTERIOR_CLEAROUT
 *   DEB-SC2 : state_lock_used=true, state_lock_pool_size=1, planned_worker_count propagates
 *   DEB-SC3 : other débarras services (maison, appartement) stay on generic route (no regression)
 *   DEB-GT1 : PASS — cellar visible, 2 workers, manageable loads, clear path
 *   DEB-GT2 : REJECT — large_item_carried_by_single_worker=true → access_violation
 *   DEB-GT3 : REJECT — exit_path_blocked=true → access_violation
 *   DEB-GT4 : REJECT — worker_carrying_large_item_on_stairs=true → access_violation
 *   DEB-GT5 : REJECT — cellar_interior_visible=false → service_visual_mismatch
 *   DEB-GT6 : REJECT — service_visual_match=false (empty cellar) → service_visual_mismatch
 *   DEB-GT7 : REJECT — service_visual_match=false (renovation, no clearout) → service_visual_mismatch
 */

const { _applySiteRealism }   = await import('../resolution/service-resolver.js?bust=deb-tests2');
const { WORKER_SCENE_RULES }  = await import('../safety/worker-rules.js?bust=deb-tests2');
const { SERVICE_VISUAL_GATE_RULES, _SERVICE_GATE_ALIASES } = await import('../safety/safety-rules.js?bust=deb-tests2');

export async function runDebarrasTests() {
  console.group('DEB tests — Débarras cave DEBARRAS-CAVE-INTERIOR gate + scene');

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

  function resolve(matchedService, state_level) {
    const so = {
      _matched_key:     'débarras',
      _matched_service: matchedService,
      state_level,
      contexte:         'maison_individuelle',
    };
    return JSON.parse(_applySiteRealism(JSON.stringify(so), 0));
  }

  function evalGate(fields, accessConfiguration) {
    const gate = SERVICE_VISUAL_GATE_RULES['Débarras'];
    assert(gate, 'Gate "Débarras" must exist');
    const conditions = (accessConfiguration && gate.reject_conditions_by_access?.[accessConfiguration])
      ? gate.reject_conditions_by_access[accessConfiguration]
      : gate.reject_conditions;
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

  // ─── DEB-SC: Scene resolution ────────────────────────────────────────────

  test('DEB-SC1', 'Débarras cave encours → DEBARRAS-CAVE-INTERIOR + CELLAR_INTERIOR_CLEAROUT', () => {
    const r = resolve('Débarras cave', 'encours');
    assert(r._visual_family === 'DEBARRAS-CAVE-INTERIOR',
      `_visual_family expected "DEBARRAS-CAVE-INTERIOR", got "${r._visual_family}"`);
    assert(r._access_configuration === 'CELLAR_INTERIOR_CLEAROUT',
      `_access_configuration expected "CELLAR_INTERIOR_CLEAROUT", got "${r._access_configuration}"`);
    assert(r.setting === 'interior',
      `setting expected "interior", got "${r.setting}"`);
  });

  test('DEB-SC2', 'Débarras cave encours → state_lock_used=true, pool_size=1', () => {
    const r = resolve('Débarras cave', 'encours');
    assert(r._state_lock_used === true,
      `_state_lock_used expected true, got ${r._state_lock_used}`);
    assert(r._state_lock_pool_size === 1,
      `_state_lock_pool_size expected 1, got ${r._state_lock_pool_size}`);
  });

  test('DEB-SC3', 'Débarras maison stays on generic route (no regression)', () => {
    const r = resolve('Débarras maison', 'encours');
    assert(r._visual_family !== 'DEBARRAS-CAVE-INTERIOR',
      `Débarras maison must NOT get DEBARRAS-CAVE-INTERIOR, got "${r._visual_family}"`);
    assert(r._access_configuration !== 'CELLAR_INTERIOR_CLEAROUT',
      `Débarras maison must NOT get CELLAR_INTERIOR_CLEAROUT, got "${r._access_configuration}"`);
  });

  // ─── DEB-GT: Gate evaluation — CELLAR_INTERIOR_CLEAROUT branch ──────────

  const PASS_FIELDS = {
    cellar_interior_visible:              true,
    clear_carrying_path_visible:          true,
    manageable_loads_visible:             true,
    large_item_carried_by_single_worker:  false,
    worker_carrying_large_item_on_stairs: false,
    stair_handrail_obstructed:            false,
    exit_path_blocked:                    false,
    service_visual_match:                 true,
    worker_count_matches_plan:            true,
  };

  test('DEB-GT1', 'Cellar visible + 2 workers + manageable loads + clear path → PASS', () => {
    const r = evalGate(PASS_FIELDS, 'CELLAR_INTERIOR_CLEAROUT');
    assert(r.safe === true, `Expected PASS, got REJECT on ${r.first_failed} (${r.reason})`);
  });

  test('DEB-GT2', 'large_item_carried_by_single_worker=true → REJECT access_violation', () => {
    const r = evalGate({ ...PASS_FIELDS, large_item_carried_by_single_worker: true }, 'CELLAR_INTERIOR_CLEAROUT');
    assert(!r.safe && r.reason === 'access_violation',
      `Expected access_violation, got safe=${r.safe} reason=${r.reason}`);
  });

  test('DEB-GT3', 'exit_path_blocked=true → REJECT access_violation', () => {
    const r = evalGate({ ...PASS_FIELDS, exit_path_blocked: true }, 'CELLAR_INTERIOR_CLEAROUT');
    assert(!r.safe && r.reason === 'access_violation',
      `Expected access_violation, got safe=${r.safe} reason=${r.reason}`);
  });

  test('DEB-GT4', 'worker_carrying_large_item_on_stairs=true → REJECT access_violation', () => {
    const r = evalGate({ ...PASS_FIELDS, worker_carrying_large_item_on_stairs: true }, 'CELLAR_INTERIOR_CLEAROUT');
    assert(!r.safe && r.reason === 'access_violation',
      `Expected access_violation, got safe=${r.safe} reason=${r.reason}`);
  });

  test('DEB-GT5', 'cellar_interior_visible=false (exterior scene or modern room) → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, cellar_interior_visible: false }, 'CELLAR_INTERIOR_CLEAROUT');
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('DEB-GT6', 'service_visual_match=false (cellar completely empty) → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, service_visual_match: false }, 'CELLAR_INTERIOR_CLEAROUT');
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('DEB-GT7', 'service_visual_match=false (renovation, no clearout) → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, service_visual_match: false, cellar_interior_visible: true }, 'CELLAR_INTERIOR_CLEAROUT');
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  // ─── Verify gate + aliases exist ─────────────────────────────────────────

  test('DEB-ALIAS', '_SERVICE_GATE_ALIASES maps "debarras cave" → "Débarras"', () => {
    assert(_SERVICE_GATE_ALIASES['debarras cave'] === 'Débarras',
      `Expected alias "debarras cave" → "Débarras", got "${_SERVICE_GATE_ALIASES['debarras cave']}"`);
  });

  test('DEB-WORKER', 'WORKER_SCENE_RULES.débarras state_worker_minimums.encours === 2', () => {
    const wRules = WORKER_SCENE_RULES['débarras'];
    assert(wRules, 'WORKER_SCENE_RULES["débarras"] must exist');
    assert(wRules.state_worker_minimums?.encours === 2,
      `state_worker_minimums.encours expected 2, got ${wRules.state_worker_minimums?.encours}`);
    assert(wRules.state_worker_minimums?.semifinal === 2,
      `state_worker_minimums.semifinal expected 2, got ${wRules.state_worker_minimums?.semifinal}`);
  });

  // ─── Summary ─────────────────────────────────────────────────────────────

  console.log(`\n--- DEB: ${_pass}/${_pass + _fail} ---\n`);
  console.groupEnd();
  return { pass: _pass, fail: _fail, results: _results };
}
