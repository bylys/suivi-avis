/**
 * Enduit monocouche / FACADE-ENDUIT-GROUND — no-cost test suite
 *   END-SC1..3 : scénario résolu (GROUND_LEVEL, state-lock, _visual_family)
 *   END-SC2    : state_lock_pool_size=4 (3× no_scaffold + 1× ready_scaffold)
 *   END-SC4    : Ravalement façade → SCAFFOLD_READY_GROUND_CREW
 *   END-GT1..7 : gate GROUND_LEVEL_FACADE_WORK reject_conditions
 *   END-SC5    : no service_worker_maximums + state_worker_minimums.encours === 2
 *   END-GT8    : SCAFFOLD_READY_GROUND_CREW worker_on_scaffold=true → critical_violation
 *   END-DIST1  : scaffold variant distribution 1000 seeds → NO_SCAFFOLD 70–80%, READY 20–30%
 *   END-DIST2  : Ravalement encours always SCAFFOLD_READY_GROUND_CREW (scaffold mandatory)
 *   END-SC6    : Crépi façade encours → GROUND_LEVEL_CREPI_WORK (not GROUND_LEVEL_FACADE_WORK)
 *   END-GT9    : GROUND_LEVEL_CREPI_WORK smooth_render_only=true → service_visual_mismatch
 *   END-GT10   : GROUND_LEVEL_CREPI_WORK textured_crepi_finish_visible=false → service_visual_mismatch
 */

const { _applySiteRealism }   = await import('../resolution/service-resolver.js?bust=end-tests5');
const { WORKER_SCENE_RULES }  = await import('../safety/worker-rules.js?bust=end-tests5');
const { SERVICE_VISUAL_GATE_RULES, _SERVICE_GATE_ALIASES } = await import('../safety/safety-rules.js?bust=end-tests5');

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

  test('END-SC2', 'Enduit monocouche encours → state_lock_pool_size=4 (3 no_scaffold + 1 ready_scaffold)', () => {
    const r = resolve('Enduit monocouche', 'encours');
    assert(r._state_lock_pool_size === 4,
      `_state_lock_pool_size expected 4, got ${r._state_lock_pool_size}`);
  });

  test('END-SC3', 'Enduit monocouche encours → _visual_family=FACADE-ENDUIT-GROUND, access_configuration=GROUND_LEVEL_FACADE_WORK', () => {
    const r = resolve('Enduit monocouche', 'encours');
    assert(r._visual_family === 'FACADE-ENDUIT-GROUND',
      `_visual_family expected "FACADE-ENDUIT-GROUND", got "${r._visual_family}"`);
    assert(r._access_configuration === 'GROUND_LEVEL_FACADE_WORK',
      `_access_configuration expected "GROUND_LEVEL_FACADE_WORK", got "${r._access_configuration}"`);
  });

  test('END-SC4', 'Ravalement façade encours → SCAFFOLD_READY_GROUND_CREW (nouvelle doctrine)', () => {
    const r = resolve('Ravalement façade', 'encours');
    assert(r._state_lock_used === true,
      `_state_lock_used expected true, got ${r._state_lock_used}`);
    assert(r._access_configuration === 'SCAFFOLD_READY_GROUND_CREW',
      `_access_configuration expected "SCAFFOLD_READY_GROUND_CREW", got "${r._access_configuration}"`);
    assert(r._visual_family !== 'FACADE-ENDUIT-GROUND',
      `Ravalement façade must NOT get FACADE-ENDUIT-GROUND family`);
  });

  test('END-SC5', 'ravalement: no service_worker_maximums + state_worker_minimums.encours === 2', () => {
    const wRules = WORKER_SCENE_RULES['ravalement'];
    assert(wRules, 'WORKER_SCENE_RULES["ravalement"] must exist');
    assert(!wRules.service_worker_maximums,
      `service_worker_maximums must NOT exist on ravalement (removed by new doctrine)`);
    const minEncours = wRules.state_worker_minimums?.encours;
    assert(minEncours === 2,
      `state_worker_minimums.encours expected 2, got ${minEncours}`);
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

  // ─── Verify SCAFFOLD_READY_GROUND_CREW gate ──────────────────────────────────

  test('END-GT8', 'SCAFFOLD_READY_GROUND_CREW — worker_on_scaffold=true → critical_violation', () => {
    const scaffoldReadyPass = {
      worker_on_roof_surface:    false,
      interior_painting_visible: false,
      facade_fully_completed:    false,
      all_workers_on_ground:     true,
      scaffold_visible:          true,
      scaffold_coherent:         true,
      worker_on_scaffold:        true, // violation: worker is on the scaffold
      facade_work_in_progress:   true,
      service_visual_match:      true,
      worker_count_matches_plan: true,
    };
    const r = evalGate(scaffoldReadyPass, 'SCAFFOLD_READY_GROUND_CREW');
    assert(!r.safe && r.reason === 'critical_violation',
      `Expected critical_violation for worker_on_scaffold, got safe=${r.safe} reason=${r.reason}`);
  });

  // ─── END-DIST: Scaffold variant distribution ────────────────────────────────

  test('END-DIST1', 'FACADE-ENDUIT-GROUND scaffold variant distribution over 1000 seeds: NO_SCAFFOLD 70–80%, READY 20–30%', () => {
    const services = ['Enduit monocouche', 'Enduit hydraulique', 'Crépi façade'];
    let noScaffold = 0;
    let readyScaffold = 0;
    const total = 1000;
    for (let i = 0; i < total; i++) {
      const svc = services[i % services.length];
      const so = JSON.stringify({
        _matched_key:     'ravalement',
        _matched_service: svc,
        state_level:      'encours',
        contexte:         'maison_individuelle',
      });
      const r = JSON.parse(_applySiteRealism(so, i));
      const variant = r._scaffold_variant;
      if (variant === 'no_scaffold') noScaffold++;
      else if (variant === 'ready_scaffold_background') readyScaffold++;
    }
    const noScaffoldPct = (noScaffold / total) * 100;
    const readyPct      = (readyScaffold / total) * 100;
    assert(noScaffoldPct >= 70 && noScaffoldPct <= 80,
      `NO_SCAFFOLD expected 70–80%, got ${noScaffoldPct.toFixed(1)}%`);
    assert(readyPct >= 20 && readyPct <= 30,
      `READY_SCAFFOLD_BACKGROUND expected 20–30%, got ${readyPct.toFixed(1)}%`);
    console.log(`    no_scaffold=${noScaffoldPct.toFixed(1)}%  ready_scaffold=${readyPct.toFixed(1)}%`);
  });

  test('END-DIST2', 'Ravalement façade encours always gets SCAFFOLD_READY_GROUND_CREW (scaffold mandatory)', () => {
    for (let i = 0; i < 20; i++) {
      const so = JSON.stringify({
        _matched_key:     'ravalement',
        _matched_service: 'Ravalement façade',
        state_level:      'encours',
        contexte:         'maison_individuelle',
      });
      const r = JSON.parse(_applySiteRealism(so, i));
      assert(r._access_configuration === 'SCAFFOLD_READY_GROUND_CREW',
        `Ravalement façade seed ${i}: expected SCAFFOLD_READY_GROUND_CREW, got ${r._access_configuration}`);
    }
  });

  // ─── Summary ───────────────────────────────────────────────────────────────

  // ─── END-SC6 / END-GT9 / END-GT10: Crépi façade — GROUND_LEVEL_CREPI_WORK ───

  test('END-SC6', 'Crépi façade encours → _access_configuration=GROUND_LEVEL_CREPI_WORK (not GROUND_LEVEL_FACADE_WORK)', () => {
    const r = resolve('Crépi façade', 'encours');
    assert(r._state_lock_used === true,
      `_state_lock_used expected true, got ${r._state_lock_used}`);
    assert(r._access_configuration === 'GROUND_LEVEL_CREPI_WORK',
      `_access_configuration expected "GROUND_LEVEL_CREPI_WORK", got "${r._access_configuration}"`);
    assert(r._access_configuration !== 'GROUND_LEVEL_FACADE_WORK',
      `Crépi façade must NOT get GROUND_LEVEL_FACADE_WORK`);
    assert(r._visual_family === 'FACADE-ENDUIT-GROUND',
      `_visual_family expected "FACADE-ENDUIT-GROUND", got "${r._visual_family}"`);
    assert(r._state_lock_pool_size === 4,
      `state_lock_pool_size expected 4, got ${r._state_lock_pool_size}`);
  });

  // Crépi gate PASS fields
  const CREPI_PASS_FIELDS = {
    ground_level_work_visible:          true,
    work_area_reachable_from_ground:    true,
    worker_stable_on_ground:            true,
    ladder_used_as_workstation:         false,
    scaffold_required_for_height:       false,
    facade_coating_application_visible: true,
    fresh_render_area_visible:          true,
    partial_work_state_visible:         true,
    textured_crepi_finish_visible:      true,
    smooth_render_only:                 false,
    service_visual_match:               true,
    localized_crack_repair_only:        false,
    worker_count_matches_plan:          true,
  };

  test('END-GT9', 'GROUND_LEVEL_CREPI_WORK — smooth_render_only=true → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...CREPI_PASS_FIELDS, smooth_render_only: true }, 'GROUND_LEVEL_CREPI_WORK');
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch for smooth_render_only=true, got safe=${r.safe} reason=${r.reason}`);
  });

  test('END-GT10', 'GROUND_LEVEL_CREPI_WORK — textured_crepi_finish_visible=false → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...CREPI_PASS_FIELDS, textured_crepi_finish_visible: false }, 'GROUND_LEVEL_CREPI_WORK');
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch for textured_crepi_finish_visible=false, got safe=${r.safe} reason=${r.reason}`);
  });

  // ─── Summary ───────────────────────────────────────────────────────────────

  console.log(`\n--- END: ${_pass}/${_pass + _fail} ---\n`);
  console.groupEnd();
  return { pass: _pass, fail: _fail, results: _results };
}
