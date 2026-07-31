/**
 * Enduit monocouche / FACADE-ENDUIT-GROUND — no-cost test suite
 *   END-SC1..3 : scénario résolu (GROUND_LEVEL, state-lock, _visual_family)
 *   END-SC4    : Ravalement façade reste SCAFFOLD_PLATFORM
 *   END-GT1..7 : gate GROUND_LEVEL_FACADE_WORK reject_conditions
 *   END-SC5    : worker rule 1 worker ok (pas de min ravalement)
 */

const { _applySiteRealism }   = await import('../resolution/service-resolver.js?bust=end-tests2');
const { WORKER_SCENE_RULES }  = await import('../safety/worker-rules.js?bust=end-tests2');
const { SERVICE_VISUAL_GATE_RULES, _SERVICE_GATE_ALIASES } = await import('../safety/safety-rules.js?bust=end-tests2');

export async function runEnduitTests() {
  console.group('END tests — Enduit monocouche FACADE-ENDUIT-GROUND gate + scene');

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

  function resolve(matchedService, state_level) {
    const so = {
      _matched_key:     'ravalement',
      _matched_service: matchedService,
      state_level,
      contexte:         'maison_individuelle',
    };
    return JSON.parse(_applySiteRealism(JSON.stringify(so), 0));
  }

  function evalGate(fields, accessConfiguration) {
    const gate = SERVICE_VISUAL_GATE_RULES['Ravalement de façade'];
    assert(gate, 'Gate "Ravalement de façade" must exist');
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

  // ─── END-SC: Scene resolution ───────────────────────────────────────────────

  test('END-SC1', 'Enduit monocouche encours → state_lock_used=true', () => {
    const r = resolve('Enduit monocouche', 'encours');
    assert(r._state_lock_used === true,
      `_state_lock_used expected true, got ${r._state_lock_used}`);
  });

  test('END-SC2', 'Enduit monocouche encours → state_lock_pool_size=1', () => {
    const r = resolve('Enduit monocouche', 'encours');
    assert(r._state_lock_pool_size === 1,
      `_state_lock_pool_size expected 1, got ${r._state_lock_pool_size}`);
  });

  test('END-SC3', 'Enduit monocouche encours → _visual_family=FACADE-ENDUIT-GROUND, access_configuration=GROUND_LEVEL_FACADE_WORK', () => {
    const r = resolve('Enduit monocouche', 'encours');
    assert(r._visual_family === 'FACADE-ENDUIT-GROUND',
      `_visual_family expected "FACADE-ENDUIT-GROUND", got "${r._visual_family}"`);
    assert(r._access_configuration === 'GROUND_LEVEL_FACADE_WORK',
      `_access_configuration expected "GROUND_LEVEL_FACADE_WORK", got "${r._access_configuration}"`);
  });

  test('END-SC4', 'Ravalement façade encours → reste SCAFFOLD_PLATFORM (inchangé)', () => {
    const r = resolve('Ravalement façade', 'encours');
    assert(r._state_lock_used === true,
      `_state_lock_used expected true, got ${r._state_lock_used}`);
    assert(r._access_configuration === 'SCAFFOLD_PLATFORM',
      `_access_configuration expected "SCAFFOLD_PLATFORM", got "${r._access_configuration}"`);
    assert(r._visual_family !== 'FACADE-ENDUIT-GROUND',
      `Ravalement façade must NOT get FACADE-ENDUIT-GROUND family`);
  });

  test('END-SC5', 'ravalement service_worker_maximums caps encours minimum to 1 for enduit monocouche', () => {
    const wRules = WORKER_SCENE_RULES['ravalement'];
    assert(wRules, 'WORKER_SCENE_RULES["ravalement"] must exist');
    const maxCap = wRules.service_worker_maximums?.['enduit monocouche'];
    assert(maxCap === 1,
      `service_worker_maximums["enduit monocouche"] expected 1, got ${maxCap}`);
  });

  // ─── END-GT: Gate evaluation — GROUND_LEVEL_FACADE_WORK branch ─────────────

  const PASS_FIELDS = {
    ground_level_work_visible:          true,
    work_area_reachable_from_ground:    true,
    worker_stable_on_ground:            true,
    ladder_used_as_workstation:         false,
    scaffold_required_for_height:       false,
    facade_coating_application_visible: true,
    fresh_render_area_visible:          true,
    partial_work_state_visible:         true,
    service_visual_match:               true,
    localized_crack_repair_only:        false,
    worker_count_matches_plan:          true,
  };

  test('END-GT1', 'Worker au sol + zone basse + enduit frais partiel → PASS', () => {
    const r = evalGate(PASS_FIELDS, 'GROUND_LEVEL_FACADE_WORK');
    assert(r.safe === true, `Expected PASS, got REJECT on ${r.first_failed} (${r.reason})`);
  });

  test('END-GT2', 'Absence échafaudage (scaffold_required_for_height=false) → PASS', () => {
    // scaffold_required_for_height=false is the PASS case — no scaffold rejection
    const r = evalGate({ ...PASS_FIELDS, scaffold_required_for_height: false }, 'GROUND_LEVEL_FACADE_WORK');
    assert(r.safe === true, `Expected PASS, got ${r.first_failed}`);
  });

  test('END-GT3', 'scaffold_required_for_height=true (travail à l\'étage) → REJECT access_violation', () => {
    const r = evalGate({ ...PASS_FIELDS, scaffold_required_for_height: true }, 'GROUND_LEVEL_FACADE_WORK');
    assert(!r.safe && r.reason === 'access_violation',
      `Expected access_violation REJECT, got safe=${r.safe} reason=${r.reason}`);
  });

  test('END-GT4', 'ladder_used_as_workstation=true → REJECT access_violation', () => {
    const r = evalGate({ ...PASS_FIELDS, ladder_used_as_workstation: true }, 'GROUND_LEVEL_FACADE_WORK');
    assert(!r.safe && r.reason === 'access_violation',
      `Expected access_violation REJECT, got safe=${r.safe} reason=${r.reason}`);
  });

  test('END-GT5', 'service_visual_match=false (simple peinture) → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, service_visual_match: false }, 'GROUND_LEVEL_FACADE_WORK');
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got ${r.reason}`);
  });

  test('END-GT6', 'localized_crack_repair_only=true → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, localized_crack_repair_only: true }, 'GROUND_LEVEL_FACADE_WORK');
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch for crack-only scene, got ${r.reason}`);
  });

  test('END-GT7', 'partial_work_state_visible=false (façade entièrement terminée) → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, partial_work_state_visible: false }, 'GROUND_LEVEL_FACADE_WORK');
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got ${r.reason}`);
  });

  // ─── Verify SCAFFOLD_PLATFORM branch still requires scaffold fields ──────────

  test('END-GT8', 'SCAFFOLD_PLATFORM branch — scaffold_visible=false still REJECT (gate intact)', () => {
    const scaffoldPassFields = {
      worker_on_roof_surface: false,
      worker_standing_on_guardrail: false,
      worker_on_ladder_as_workstation: false,
      scaffold_visible: false, // missing scaffold
      scaffold_platform_complete: true,
      scaffold_guardrails_visible: true,
      workers_supported_by_platform: true,
      interior_painting_visible: false,
      facade_fully_completed: false,
      facade_work_in_progress: true,
      service_visual_match: true,
      worker_count_matches_plan: true,
    };
    const r = evalGate(scaffoldPassFields, 'SCAFFOLD_PLATFORM');
    assert(!r.safe && r.reason === 'access_violation',
      `Expected access_violation for missing scaffold, got safe=${r.safe} reason=${r.reason}`);
  });

  // ─── Summary ───────────────────────────────────────────────────────────────

  console.log(`\n--- END: ${_pass}/${_pass + _fail} ---\n`);
  console.groupEnd();
  return { pass: _pass, fail: _fail, results: _results };
}
