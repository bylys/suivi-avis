/**
 * Réparation fissure — no-cost test suite
 * Tests:
 *   FIS-SC1..2 : scénario fissure résolu (maçonnerie, no state-lock, 1 worker ok)
 *   FIS-GT1..6 : gate reject_conditions
 *   FIS-AL1..2 : alias resolution + gate count
 */

const { _applySiteRealism }   = await import('../resolution/service-resolver.js?bust=fis-tests1');
const { WORKER_SCENE_RULES }  = await import('../safety/worker-rules.js?bust=fis-tests1');
const { SERVICE_VISUAL_GATE_RULES, _SERVICE_GATE_ALIASES } = await import('../safety/safety-rules.js?bust=fis-tests1');

export async function runFissureTests() {
  console.group('FIS tests — Réparation fissure gate + scene');

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

  function resolveFissure(state_level) {
    const so = {
      _matched_key:     'maçonnerie',
      _matched_service: 'Réparation fissure',
      state_level,
      contexte:         'maison_individuelle',
    };
    return JSON.parse(_applySiteRealism(JSON.stringify(so), 0));
  }

  function evalGate(fields) {
    const gate = SERVICE_VISUAL_GATE_RULES['Réparation fissure'];
    if (!gate) throw new Error('Gate "Réparation fissure" not found in SERVICE_VISUAL_GATE_RULES');
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

  // ─── FIS-SC: Scene resolution ───────────────────────────────────────────────

  test('FIS-SC1', 'Réparation fissure encours → state_lock_used=false (no state-lock needed)', () => {
    const r = resolveFissure('encours');
    assert(r._state_lock_used === false,
      `_state_lock_used expected false, got ${r._state_lock_used}`);
  });

  test('FIS-SC2', 'Réparation fissure — maçonnerie worker rule: max_workers=2, no min constraint', () => {
    const wRules = WORKER_SCENE_RULES['maçonnerie'];
    assert(wRules, 'WORKER_SCENE_RULES["maçonnerie"] must exist');
    assert(wRules.max_workers === 2,
      `max_workers expected 2, got ${wRules.max_workers}`);
    assert(!wRules.min_workers_when_visible,
      `min_workers_when_visible must be absent (1 worker is sufficient)`);
    assert(!wRules.state_worker_minimums,
      `state_worker_minimums must be absent for maçonnerie fissure`);
  });

  // ─── FIS-GT: Gate evaluation ────────────────────────────────────────────────

  const PASS_FIELDS = {
    facade_crack_visible:            true,
    localized_crack_repair_visible:  true,
    repair_action_in_progress:       true,
    service_visual_match:            true,
    worker_on_ladder_as_workstation: false,
    interior_scene:                  false,
    full_ravalement_visible:         false,
  };

  test('FIS-GT1', 'Fissure visible + réparation partielle + action en cours → PASS', () => {
    const r = evalGate(PASS_FIELDS);
    assert(r.safe === true, `Expected PASS, got REJECT on ${r.first_failed} (${r.reason})`);
  });

  test('FIS-GT2', 'facade_crack_visible=false → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, facade_crack_visible: false });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got ${r.reason}`);
    assert(r.first_failed === 'facade_crack_visible',
      `Expected first_failed=facade_crack_visible, got ${r.first_failed}`);
  });

  test('FIS-GT3', 'repair_action_in_progress=false → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, repair_action_in_progress: false });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'service_visual_mismatch', `Expected service_visual_mismatch, got ${r.reason}`);
  });

  test('FIS-GT4', 'worker_on_ladder_as_workstation=true → REJECT access_violation', () => {
    const r = evalGate({ ...PASS_FIELDS, worker_on_ladder_as_workstation: true });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'access_violation', `Expected access_violation, got ${r.reason}`);
  });

  test('FIS-GT5', 'interior_scene=true → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, interior_scene: true });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'service_visual_mismatch', `Expected service_visual_mismatch, got ${r.reason}`);
  });

  test('FIS-GT6', 'full_ravalement_visible=true → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, full_ravalement_visible: true });
    assert(r.safe === false, 'Expected REJECT');
    assert(r.reason === 'service_visual_mismatch', `Expected service_visual_mismatch, got ${r.reason}`);
  });

  // ─── FIS-AL: Alias resolution ───────────────────────────────────────────────

  test('FIS-AL1', 'Alias "reparation fissure" → gate "Réparation fissure" exists', () => {
    const canonical = _SERVICE_GATE_ALIASES['reparation fissure'];
    assert(canonical === 'Réparation fissure',
      `Expected "Réparation fissure", got "${canonical}"`);
    assert(SERVICE_VISUAL_GATE_RULES[canonical] !== undefined,
      'Gate "Réparation fissure" must exist in SERVICE_VISUAL_GATE_RULES');
  });

  test('FIS-AL2', 'Gate "Réparation fissure" has 7 reject_conditions', () => {
    const gate = SERVICE_VISUAL_GATE_RULES['Réparation fissure'];
    assert(gate && Array.isArray(gate.reject_conditions),
      'Gate must have reject_conditions array');
    assert(gate.reject_conditions.length === 7,
      `Expected 7 reject_conditions, got ${gate.reject_conditions.length}`);
  });

  // ─── Summary ───────────────────────────────────────────────────────────────

  console.log(`\n--- FIS: ${_pass}/${_pass + _fail} ---\n`);
  console.groupEnd();
  return { pass: _pass, fail: _fail, results: _results };
}
