/**
 * Nettoyage extérieur — no-cost test suite
 *   NEX-SC1 : Nettoyage haute pression + encours → NETTOYAGE-HIGH-PRESSURE-GROUND
 *   NEX-SC2 : Nettoyage haute pression → GROUND_LEVEL_PRESSURE_WASHING
 *   NEX-SC3 : Nettoyage haute pression → state_lock_used=true, pool_size=1, setting=exterior
 *   NEX-SC4 : Nettoyage haute pression → planned_worker_count=1
 *   NEX-SC5 : NO-COLLISION: Nettoyage façade → not NETTOYAGE-HIGH-PRESSURE-GROUND
 *   NEX-SC6 : NO-COLLISION: Nettoyage terrasse → not NETTOYAGE-HIGH-PRESSURE-GROUND
 *   NEX-SC7 : NO-COLLISION: Nettoyage haute pression → not facade scenario
 *   NEX-GT1 : PASS — hard surface + active washing + machine + hose coherent + zones + partial state + stable worker + safe jet
 *   NEX-GT2 : REJECT — ground_hard_surface_visible=false → service_visual_mismatch
 *   NEX-GT3 : REJECT — active_pressure_washing_visible=false (sweeping only) → service_visual_mismatch
 *   NEX-GT4 : REJECT — pressure_washer_visible=false (no machine) → service_visual_mismatch
 *   NEX-GT5 : REJECT — lance_and_hose_coherent=false (hose absent) → service_visual_mismatch
 *   NEX-GT6 : REJECT — dirty_and_clean_zones_visible=false (uniformly dirty) → service_visual_mismatch
 *   NEX-GT7 : REJECT — partial_work_state_visible=false (already entirely clean) → service_visual_mismatch
 *   NEX-GT8 : REJECT — worker_stable_on_ground=false (worker on ladder) → access_violation
 *   NEX-GT9 : REJECT — jet_directed_safely=false (jet toward person) → access_violation
 *   NEX-GT10: REJECT — electrical_hazard_visible=true → access_violation
 *   NEX-GT11: REJECT — dangerous_hose_trip_hazard=true → access_violation
 *   NEX-GT12: REJECT — service_visual_match=false (car washing) → service_visual_mismatch
 *   NEX-GT13: REJECT — worker_count_matches_plan=false → worker_count_mismatch
 *   NEX-ALIAS: _SERVICE_GATE_ALIASES 'nettoyage haute pression' → 'Nettoyage haute pression'
 *   NEX-SAFETY-1: SAFETY_CHECK_RULES['nettoyage'] exists
 *   NEX-SAFETY-2: buildVisionSafetyRequest with Nettoyage haute pression includes gate vision_instruction
 *   NEX-SAFETY-3: SAFETY_CHECK_RULES['nettoyage_toiture'] still exists
 *   NEX-SAFETY-4: SAFETY_CHECK_RULES['nettoyage_gouttieres'] still exists
 */

const { _applySiteRealism }   = await import('../resolution/service-resolver.js?bust=nex-tests2');
const { WORKER_SCENE_RULES }  = await import('../safety/worker-rules.js?bust=nex-tests2');
const { SERVICE_VISUAL_GATE_RULES, _SERVICE_GATE_ALIASES, SAFETY_CHECK_RULES } = await import('../safety/safety-rules.js?bust=nex-tests2');
const { buildVisionSafetyRequest } = await import('../pipeline/safety-check.js?bust=nex-tests2');

export async function runNettoyageExtTests() {
  console.group('NEX tests — Nettoyage extérieur: Haute pression gate + scenes');

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

  function resolve(matchedKey, matchedService, state_level) {
    const so = {
      _matched_key:     matchedKey,
      _matched_service: matchedService,
      state_level,
      contexte:         'maison_individuelle',
    };
    return JSON.parse(_applySiteRealism(JSON.stringify(so), 0));
  }

  function evalGate(fields) {
    const gate = SERVICE_VISUAL_GATE_RULES['Nettoyage haute pression'];
    assert(gate, 'Gate "Nettoyage haute pression" must exist');
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
    ground_hard_surface_visible:     true,
    active_pressure_washing_visible: true,
    pressure_washer_visible:         true,
    lance_and_hose_coherent:         true,
    dirty_and_clean_zones_visible:   true,
    partial_work_state_visible:      true,
    worker_stable_on_ground:         true,
    jet_directed_safely:             true,
    electrical_hazard_visible:       false,
    dangerous_hose_trip_hazard:      false,
    service_visual_match:            true,
    worker_count_matches_plan:       true,
  };

  // ── Scene resolution tests ──────────────────────────────────────────────────

  test('NEX-SC1', 'Nettoyage haute pression encours → NETTOYAGE-HIGH-PRESSURE-GROUND', () => {
    const r = resolve('nettoyage', 'Nettoyage haute pression', 'encours');
    assert(r._visual_family === 'NETTOYAGE-HIGH-PRESSURE-GROUND',
      `Expected NETTOYAGE-HIGH-PRESSURE-GROUND, got "${r._visual_family}"`);
  });

  test('NEX-SC2', 'Nettoyage haute pression → GROUND_LEVEL_PRESSURE_WASHING', () => {
    const r = resolve('nettoyage', 'Nettoyage haute pression', 'encours');
    assert(r._access_configuration === 'GROUND_LEVEL_PRESSURE_WASHING',
      `Expected GROUND_LEVEL_PRESSURE_WASHING, got "${r._access_configuration}"`);
  });

  test('NEX-SC3', 'Nettoyage haute pression → state_lock_used=true, pool_size=1, setting=exterior', () => {
    const r = resolve('nettoyage', 'Nettoyage haute pression', 'encours');
    assert(r._state_lock_used === true,       `state_lock_used must be true, got ${r._state_lock_used}`);
    assert(r._state_lock_pool_size === 1,     `pool_size must be 1, got ${r._state_lock_pool_size}`);
    assert(r.setting === 'exterior',          `setting must be exterior, got ${r.setting}`);
  });

  test('NEX-SC4', 'Nettoyage haute pression → worker rule applies (nettoyage max_workers=1)', () => {
    const rules = WORKER_SCENE_RULES.nettoyage;
    assert(rules, 'WORKER_SCENE_RULES.nettoyage must exist');
    assert(rules.max_workers === 1, `nettoyage max_workers must be 1, got ${rules.max_workers}`);
    const r = resolve('nettoyage', 'Nettoyage haute pression', 'encours');
    assert(r._visual_family === 'NETTOYAGE-HIGH-PRESSURE-GROUND',
      `Nettoyage haute pression must resolve to NETTOYAGE-HIGH-PRESSURE-GROUND to inherit worker rule`);
  });

  test('NEX-SC5', 'NO-COLLISION: Nettoyage façade → not NETTOYAGE-HIGH-PRESSURE-GROUND', () => {
    const r = resolve('nettoyage', 'Nettoyage façade', 'encours');
    assert(r._visual_family !== 'NETTOYAGE-HIGH-PRESSURE-GROUND',
      `Nettoyage façade must not resolve to NETTOYAGE-HIGH-PRESSURE-GROUND`);
  });

  test('NEX-SC6', 'NO-COLLISION: Nettoyage terrasse → not NETTOYAGE-HIGH-PRESSURE-GROUND', () => {
    const r = resolve('nettoyage', 'Nettoyage terrasse', 'encours');
    assert(r._visual_family !== 'NETTOYAGE-HIGH-PRESSURE-GROUND',
      `Nettoyage terrasse must not resolve to NETTOYAGE-HIGH-PRESSURE-GROUND`);
  });

  test('NEX-SC7', 'NO-COLLISION: Nettoyage haute pression → not facade scenario (no _visual_family from façade scenarios)', () => {
    const r = resolve('nettoyage', 'Nettoyage haute pression', 'encours');
    assert(r._visual_family !== null,
      `Nettoyage haute pression must have a visual_family, got null`);
    assert(r._visual_family === 'NETTOYAGE-HIGH-PRESSURE-GROUND',
      `Must be NETTOYAGE-HIGH-PRESSURE-GROUND, not a facade scenario — got "${r._visual_family}"`);
  });

  // ── Gate tests ──────────────────────────────────────────────────────────────

  test('NEX-GT1', 'PASS — all required fields present and valid', () => {
    const r = evalGate(PASS_FIELDS);
    assert(r.safe === true, `Expected safe=true, got safe=${r.safe}, first_failed=${r.first_failed}`);
  });

  test('NEX-GT2', 'REJECT — ground_hard_surface_visible=false → service_visual_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, ground_hard_surface_visible: false });
    assert(r.safe === false && r.reason === 'service_visual_mismatch',
      `Expected reject/service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('NEX-GT3', 'REJECT — active_pressure_washing_visible=false → service_visual_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, active_pressure_washing_visible: false });
    assert(r.safe === false && r.reason === 'service_visual_mismatch',
      `Expected reject/service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('NEX-GT4', 'REJECT — pressure_washer_visible=false → service_visual_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, pressure_washer_visible: false });
    assert(r.safe === false && r.reason === 'service_visual_mismatch',
      `Expected reject/service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('NEX-GT5', 'REJECT — lance_and_hose_coherent=false → service_visual_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, lance_and_hose_coherent: false });
    assert(r.safe === false && r.reason === 'service_visual_mismatch',
      `Expected reject/service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('NEX-GT6', 'REJECT — dirty_and_clean_zones_visible=false → service_visual_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, dirty_and_clean_zones_visible: false });
    assert(r.safe === false && r.reason === 'service_visual_mismatch',
      `Expected reject/service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('NEX-GT7', 'REJECT — partial_work_state_visible=false (entire surface clean) → service_visual_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, partial_work_state_visible: false });
    assert(r.safe === false && r.reason === 'service_visual_mismatch',
      `Expected reject/service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('NEX-GT8', 'REJECT — worker_stable_on_ground=false (worker on ladder) → access_violation', () => {
    const r = evalGate({ ...PASS_FIELDS, worker_stable_on_ground: false });
    assert(r.safe === false && r.reason === 'access_violation',
      `Expected reject/access_violation, got safe=${r.safe} reason=${r.reason}`);
  });

  test('NEX-GT9', 'REJECT — jet_directed_safely=false (jet toward person) → access_violation', () => {
    const r = evalGate({ ...PASS_FIELDS, jet_directed_safely: false });
    assert(r.safe === false && r.reason === 'access_violation',
      `Expected reject/access_violation, got safe=${r.safe} reason=${r.reason}`);
  });

  test('NEX-GT10', 'REJECT — electrical_hazard_visible=true → access_violation', () => {
    const r = evalGate({ ...PASS_FIELDS, electrical_hazard_visible: true });
    assert(r.safe === false && r.reason === 'access_violation',
      `Expected reject/access_violation, got safe=${r.safe} reason=${r.reason}`);
  });

  test('NEX-GT11', 'REJECT — dangerous_hose_trip_hazard=true → access_violation', () => {
    const r = evalGate({ ...PASS_FIELDS, dangerous_hose_trip_hazard: true });
    assert(r.safe === false && r.reason === 'access_violation',
      `Expected reject/access_violation, got safe=${r.safe} reason=${r.reason}`);
  });

  test('NEX-GT12', 'REJECT — service_visual_match=false (car washing) → service_visual_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, service_visual_match: false });
    assert(r.safe === false && r.reason === 'service_visual_mismatch',
      `Expected reject/service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('NEX-GT13', 'REJECT — worker_count_matches_plan=false → worker_count_mismatch', () => {
    const r = evalGate({ ...PASS_FIELDS, worker_count_matches_plan: false });
    assert(r.safe === false && r.reason === 'worker_count_mismatch',
      `Expected reject/worker_count_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('NEX-ALIAS', '_SERVICE_GATE_ALIASES nettoyage haute pression → Nettoyage haute pression', () => {
    const alias = _SERVICE_GATE_ALIASES['nettoyage haute pression'];
    assert(alias === 'Nettoyage haute pression',
      `Expected 'Nettoyage haute pression', got "${alias}"`);
  });

  // ── Safety trigger tests ────────────────────────────────────────────────────

  test('NEX-SAFETY-1', 'SAFETY_CHECK_RULES[\'nettoyage\'] exists and is a non-empty string', () => {
    const rule = SAFETY_CHECK_RULES['nettoyage'];
    assert(typeof rule === 'string' && rule.length > 20,
      `Expected a non-empty safety prompt for 'nettoyage', got: ${JSON.stringify(rule)}`);
  });

  test('NEX-SAFETY-2', 'buildVisionSafetyRequest with Nettoyage haute pression includes gate vision_instruction', () => {
    const DUMMY_B64 = 'ZHVtbXk='; // base64 "dummy" — no real image
    const req = buildVisionSafetyRequest('nettoyage', DUMMY_B64, 'sk-dummy', 1, 'Nettoyage haute pression', 'GROUND_LEVEL_PRESSURE_WASHING');
    assert(req !== null, 'buildVisionSafetyRequest must return a request object, not null');
    const body = JSON.parse(req.body);
    const textBlock = body.messages[0].content.find(c => c.type === 'text');
    assert(textBlock, 'Request must contain a text content block');
    // The gate's vision_instruction starts with SERVICE VISUAL GATE
    assert(textBlock.text.includes('SERVICE VISUAL GATE'),
      `Expected gate vision_instruction in prompt, got: ${textBlock.text.slice(0, 200)}`);
    // Must include pressure washing gate fields
    assert(textBlock.text.includes('ground_hard_surface_visible'),
      'Prompt must request ground_hard_surface_visible field');
    assert(textBlock.text.includes('active_pressure_washing_visible'),
      'Prompt must request active_pressure_washing_visible field');
    assert(textBlock.text.includes('jet_directed_safely'),
      'Prompt must request jet_directed_safely field');
  });

  test('NEX-SAFETY-3', 'SAFETY_CHECK_RULES[\'nettoyage_toiture\'] still exists — no regression', () => {
    const rule = SAFETY_CHECK_RULES['nettoyage_toiture'];
    assert(typeof rule === 'string' && rule.length > 20,
      `nettoyage_toiture safety rule must still exist, got: ${JSON.stringify(rule)}`);
  });

  test('NEX-SAFETY-4', 'SAFETY_CHECK_RULES[\'nettoyage_gouttieres\'] still exists — no regression', () => {
    const rule = SAFETY_CHECK_RULES['nettoyage_gouttieres'];
    assert(typeof rule === 'string' && rule.length > 20,
      `nettoyage_gouttieres safety rule must still exist, got: ${JSON.stringify(rule)}`);
  });

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log(`\n--- NEX: ${_pass}/${_pass + _fail} ---`);
  if (_fail > 0) console.error(`✘ ${_fail} test(s) FAILED`);
  else console.log(`%c✔ NEX PASS — All nettoyage extérieur tests passed`, 'color: green; font-weight: bold');
  console.groupEnd();
  return { pass: _pass, fail: _fail, results: _results };
}
