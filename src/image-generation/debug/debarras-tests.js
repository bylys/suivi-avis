/**
 * Débarras — no-cost test suite
 *   DEB-SC1 : Débarras cave encours → DEBARRAS-CAVE-INTERIOR / CELLAR_INTERIOR_CLEAROUT
 *   DEB-SC2 : state_lock_used=true, state_lock_pool_size=1, planned_worker_count propagates
 *   DEB-SC3 : Débarras maison stays on DEBARRAS-MAISON-ENCOURS (no cave regression)
 *   DEB-SC4 : Débarras appartement encours → DEBARRAS-APARTMENT-INTERIOR / APARTMENT_INTERIOR_CLEAROUT
 *   DEB-SC5 : appartement state_lock_used=true, pool_size=1
 *   DEB-SC6 : Débarras grenier encours → DEBARRAS-ATTIC-INTERIOR / ATTIC_INTERIOR_CLEAROUT
 *   DEB-SC7 : grenier state_lock_used=true, pool_size=1
 *   DEB-SC8 : Enlèvement encombrants encours → DEBARRAS-ENCOMBRANTS-EXTERIOR / DRIVEWAY_BULKY_ITEMS_LOADING
 *   DEB-SC9 : encombrants state_lock_used=true, pool_size=1, setting=exterior
 *   DEB-GT1 : PASS — cellar visible, 2 workers, manageable loads, clear path
 *   DEB-GT2 : REJECT — large_item_carried_by_single_worker=true → access_violation
 *   DEB-GT3 : REJECT — exit_path_blocked=true → access_violation
 *   DEB-GT4 : REJECT — worker_carrying_large_item_on_stairs=true → access_violation
 *   DEB-GT5 : REJECT — cellar_interior_visible=false → service_visual_mismatch
 *   DEB-GT6 : REJECT — service_visual_match=false (empty cellar) → service_visual_mismatch
 *   DEB-GT7 : REJECT — service_visual_match=false (renovation, no clearout) → service_visual_mismatch
 *   DEB-GT8 : PASS — apartment interior, 2 workers, active clearout, partial clear, exit open
 *   DEB-GT9 : REJECT — apartment_interior_visible=false → service_visual_mismatch
 *   DEB-GT10: REJECT — active_clearout_visible=false (simple cleaning) → service_visual_mismatch
 *   DEB-GT11: REJECT — partially_cleared_room_visible=false (empty apartment) → service_visual_mismatch
 *   DEB-GT12: REJECT — exit_path_blocked=true → access_violation
 *   DEB-GT13: REJECT — large_item_carried_by_single_worker=true → access_violation
 *   DEB-GT14: PASS — attic visible, stable floor, 2 workers, active clearout, partial clear, exit open
 *   DEB-GT15: REJECT — attic_interior_visible=false → service_visual_mismatch
 *   DEB-GT16: REJECT — stable_attic_floor_visible=false → access_violation
 *   DEB-GT17: REJECT — active_clearout_visible=false → service_visual_mismatch
 *   DEB-GT18: REJECT — partially_cleared_area_visible=false → service_visual_mismatch
 *   DEB-GT19: REJECT — dangerous_load_on_stairs=true → access_violation
 *   DEB-GT20: REJECT — large_item_carried_by_single_worker=true → access_violation
 *   DEB-GT21: PASS — residential exterior + bulky items + active loading + vehicle visible + 2 workers
 *   DEB-GT22: REJECT — bulky_items_visible=false (boxes only) → service_visual_mismatch
 *   DEB-GT23: REJECT — active_loading_visible=false (abandoned pile) → service_visual_mismatch
 *   DEB-GT24: REJECT — partially_loaded_vehicle_visible=false (no vehicle) → service_visual_mismatch
 *   DEB-GT25: REJECT — wild_dumping_scene=true → service_visual_mismatch
 *   DEB-GT26: REJECT — large_item_carried_by_single_worker=true → access_violation
 *   DEB-GT27: REJECT — public_road_obstructed=true → access_violation
 *   DEB-GT28: REJECT — service_visual_match=false (simple box move) → service_visual_mismatch
 *   DEB-SC10: Vider maison succession encours → DEBARRAS-FULL-HOUSE-CLEARANCE / FULL_HOUSE_CLEARANCE
 *   DEB-SC11: Débarras après décès encours → DEBARRAS-FULL-HOUSE-CLEARANCE / FULL_HOUSE_CLEARANCE
 *   DEB-SC12: Vider maison succession → state_lock_used=true, pool_size=1
 *   DEB-SC13: Débarras après décès → state_lock_used=true, pool_size=1
 *   DEB-SC14: NO-COLLISION: Vider maison succession → not DEBARRAS-MAISON-ENCOURS
 *   DEB-SC15: NO-COLLISION: Débarras maison → still DEBARRAS-MAISON-ENCOURS
 *   DEB-GT29: PASS — house interior + full clearance + 2 workers + active
 *   DEB-GT30: REJECT — house_interior_visible=false → service_visual_mismatch
 *   DEB-GT31: REJECT — full_clearance_in_progress_visible=false → service_visual_mismatch
 *   DEB-GT32: REJECT — partially_cleared_rooms_visible=false → service_visual_mismatch
 *   DEB-GT33: REJECT — active_packing_or_removal_visible=false → service_visual_mismatch
 *   DEB-GT34: REJECT — large_item_carried_by_single_worker=true → access_violation
 *   DEB-GT35: REJECT — exit_path_blocked=true → access_violation
 *   DEB-GT36: REJECT — private_sensitive_items_visible=true → service_visual_mismatch
 *   DEB-GT37: REJECT — funerary_items_visible=true → service_visual_mismatch
 *   DEB-GT38: REJECT — dramatic_grief_scene=true → service_visual_mismatch
 *   DEB-GT39: REJECT — service_visual_match=false → service_visual_mismatch
 *   DEB-GT40: REJECT — worker_count_matches_plan=false → worker_count_mismatch
 *   DEB-SC-NOREGx: Cave/Maison/Appt/Grenier routing unaffected
 */

const { _applySiteRealism }   = await import('../resolution/service-resolver.js?bust=deb-tests6');
const { WORKER_SCENE_RULES }  = await import('../safety/worker-rules.js?bust=deb-tests6');
const { SERVICE_VISUAL_GATE_RULES, _SERVICE_GATE_ALIASES } = await import('../safety/safety-rules.js?bust=deb-tests6');

export async function runDebarrasTests() {
  console.group('DEB tests — Débarras cave + appartement + grenier + encombrants + full-clearance gates + scenes');

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

  test('DEB-SC3', 'Débarras maison → DEBARRAS-MAISON-ENCOURS (no cave regression)', () => {
    const r = resolve('Débarras maison', 'encours');
    assert(r._visual_family === 'DEBARRAS-MAISON-ENCOURS',
      `Débarras maison must get DEBARRAS-MAISON-ENCOURS, got "${r._visual_family}"`);
    assert(r._access_configuration !== 'CELLAR_INTERIOR_CLEAROUT',
      `Débarras maison must NOT get CELLAR_INTERIOR_CLEAROUT, got "${r._access_configuration}"`);
    assert(r._access_configuration !== 'APARTMENT_INTERIOR_CLEAROUT',
      `Débarras maison must NOT get APARTMENT_INTERIOR_CLEAROUT, got "${r._access_configuration}"`);
  });

  test('DEB-SC4', 'Débarras appartement encours → DEBARRAS-APARTMENT-INTERIOR + APARTMENT_INTERIOR_CLEAROUT', () => {
    const r = resolve('Débarras appartement', 'encours');
    assert(r._visual_family === 'DEBARRAS-APARTMENT-INTERIOR',
      `_visual_family expected "DEBARRAS-APARTMENT-INTERIOR", got "${r._visual_family}"`);
    assert(r._access_configuration === 'APARTMENT_INTERIOR_CLEAROUT',
      `_access_configuration expected "APARTMENT_INTERIOR_CLEAROUT", got "${r._access_configuration}"`);
    assert(r.setting === 'interior',
      `setting expected "interior", got "${r.setting}"`);
  });

  test('DEB-SC5', 'Débarras appartement encours → state_lock_used=true, pool_size=1', () => {
    const r = resolve('Débarras appartement', 'encours');
    assert(r._state_lock_used === true,
      `_state_lock_used expected true, got ${r._state_lock_used}`);
    assert(r._state_lock_pool_size === 1,
      `_state_lock_pool_size expected 1, got ${r._state_lock_pool_size}`);
  });

  test('DEB-SC6', 'Débarras grenier encours → DEBARRAS-ATTIC-INTERIOR + ATTIC_INTERIOR_CLEAROUT', () => {
    const r = resolve('Débarras grenier', 'encours');
    assert(r._visual_family === 'DEBARRAS-ATTIC-INTERIOR',
      `_visual_family expected "DEBARRAS-ATTIC-INTERIOR", got "${r._visual_family}"`);
    assert(r._access_configuration === 'ATTIC_INTERIOR_CLEAROUT',
      `_access_configuration expected "ATTIC_INTERIOR_CLEAROUT", got "${r._access_configuration}"`);
    assert(r.setting === 'interior',
      `setting expected "interior", got "${r.setting}"`);
  });

  test('DEB-SC7', 'Débarras grenier encours → state_lock_used=true, pool_size=1', () => {
    const r = resolve('Débarras grenier', 'encours');
    assert(r._state_lock_used === true,
      `_state_lock_used expected true, got ${r._state_lock_used}`);
    assert(r._state_lock_pool_size === 1,
      `_state_lock_pool_size expected 1, got ${r._state_lock_pool_size}`);
  });

  test('DEB-SC8', 'Enlèvement encombrants encours → DEBARRAS-ENCOMBRANTS-EXTERIOR + DRIVEWAY_BULKY_ITEMS_LOADING', () => {
    const r = resolve('Enlèvement encombrants', 'encours');
    assert(r._visual_family === 'DEBARRAS-ENCOMBRANTS-EXTERIOR',
      `_visual_family expected "DEBARRAS-ENCOMBRANTS-EXTERIOR", got "${r._visual_family}"`);
    assert(r._access_configuration === 'DRIVEWAY_BULKY_ITEMS_LOADING',
      `_access_configuration expected "DRIVEWAY_BULKY_ITEMS_LOADING", got "${r._access_configuration}"`);
    assert(r.setting === 'exterior',
      `setting expected "exterior", got "${r.setting}"`);
  });

  test('DEB-SC9', 'Enlèvement encombrants encours → state_lock_used=true, pool_size=1', () => {
    const r = resolve('Enlèvement encombrants', 'encours');
    assert(r._state_lock_used === true,
      `_state_lock_used expected true, got ${r._state_lock_used}`);
    assert(r._state_lock_pool_size === 1,
      `_state_lock_pool_size expected 1, got ${r._state_lock_pool_size}`);
    assert(r._access_configuration === 'DRIVEWAY_BULKY_ITEMS_LOADING',
      `access_configuration must be DRIVEWAY_BULKY_ITEMS_LOADING, got "${r._access_configuration}"`);
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

  // ─── DEB-GT: Gate evaluation — APARTMENT_INTERIOR_CLEAROUT branch ────────

  const APPT_PASS_FIELDS = {
    apartment_interior_visible:          true,
    active_clearout_visible:             true,
    partially_cleared_room_visible:      true,
    clear_exit_path_visible:             true,
    manageable_loads_visible:            true,
    large_item_carried_by_single_worker: false,
    exit_path_blocked:                   false,
    service_visual_match:                true,
    worker_count_matches_plan:           true,
  };

  test('DEB-GT8', 'Apartment interior + 2 workers + active clearout + partial clear + exit open → PASS', () => {
    const r = evalGate(APPT_PASS_FIELDS, 'APARTMENT_INTERIOR_CLEAROUT');
    assert(r.safe === true, `Expected PASS, got REJECT on ${r.first_failed} (${r.reason})`);
  });

  test('DEB-GT9', 'apartment_interior_visible=false → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...APPT_PASS_FIELDS, apartment_interior_visible: false }, 'APARTMENT_INTERIOR_CLEAROUT');
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('DEB-GT10', 'active_clearout_visible=false (simple cleaning) → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...APPT_PASS_FIELDS, active_clearout_visible: false }, 'APARTMENT_INTERIOR_CLEAROUT');
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('DEB-GT11', 'partially_cleared_room_visible=false (empty apartment) → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...APPT_PASS_FIELDS, partially_cleared_room_visible: false }, 'APARTMENT_INTERIOR_CLEAROUT');
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('DEB-GT12', 'exit_path_blocked=true → REJECT access_violation', () => {
    const r = evalGate({ ...APPT_PASS_FIELDS, exit_path_blocked: true }, 'APARTMENT_INTERIOR_CLEAROUT');
    assert(!r.safe && r.reason === 'access_violation',
      `Expected access_violation, got safe=${r.safe} reason=${r.reason}`);
  });

  test('DEB-GT13', 'large_item_carried_by_single_worker=true → REJECT access_violation', () => {
    const r = evalGate({ ...APPT_PASS_FIELDS, large_item_carried_by_single_worker: true }, 'APARTMENT_INTERIOR_CLEAROUT');
    assert(!r.safe && r.reason === 'access_violation',
      `Expected access_violation, got safe=${r.safe} reason=${r.reason}`);
  });

  // ─── DEB-GT: Gate evaluation — ATTIC_INTERIOR_CLEAROUT branch ───────────

  const ATTIC_PASS_FIELDS = {
    attic_interior_visible:              true,
    stable_attic_floor_visible:          true,
    active_clearout_visible:             true,
    partially_cleared_area_visible:      true,
    clear_exit_path_visible:             true,
    manageable_loads_visible:            true,
    large_item_carried_by_single_worker: false,
    dangerous_load_on_stairs:            false,
    open_unprotected_hatch_hazard:       false,
    service_visual_match:                true,
    worker_count_matches_plan:           true,
  };

  test('DEB-GT14', 'Attic visible + stable floor + 2 workers + active clearout + partial clear → PASS', () => {
    const r = evalGate(ATTIC_PASS_FIELDS, 'ATTIC_INTERIOR_CLEAROUT');
    assert(r.safe === true, `Expected PASS, got REJECT on ${r.first_failed} (${r.reason})`);
  });

  test('DEB-GT15', 'attic_interior_visible=false (regular room) → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...ATTIC_PASS_FIELDS, attic_interior_visible: false }, 'ATTIC_INTERIOR_CLEAROUT');
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('DEB-GT16', 'stable_attic_floor_visible=false (exposed joists, no boarding) → REJECT access_violation', () => {
    const r = evalGate({ ...ATTIC_PASS_FIELDS, stable_attic_floor_visible: false }, 'ATTIC_INTERIOR_CLEAROUT');
    assert(!r.safe && r.reason === 'access_violation',
      `Expected access_violation, got safe=${r.safe} reason=${r.reason}`);
  });

  test('DEB-GT17', 'active_clearout_visible=false (simple cleaning) → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...ATTIC_PASS_FIELDS, active_clearout_visible: false }, 'ATTIC_INTERIOR_CLEAROUT');
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('DEB-GT18', 'partially_cleared_area_visible=false (empty attic) → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...ATTIC_PASS_FIELDS, partially_cleared_area_visible: false }, 'ATTIC_INTERIOR_CLEAROUT');
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('DEB-GT19', 'dangerous_load_on_stairs=true → REJECT access_violation', () => {
    const r = evalGate({ ...ATTIC_PASS_FIELDS, dangerous_load_on_stairs: true }, 'ATTIC_INTERIOR_CLEAROUT');
    assert(!r.safe && r.reason === 'access_violation',
      `Expected access_violation, got safe=${r.safe} reason=${r.reason}`);
  });

  test('DEB-GT20', 'large_item_carried_by_single_worker=true → REJECT access_violation', () => {
    const r = evalGate({ ...ATTIC_PASS_FIELDS, large_item_carried_by_single_worker: true }, 'ATTIC_INTERIOR_CLEAROUT');
    assert(!r.safe && r.reason === 'access_violation',
      `Expected access_violation, got safe=${r.safe} reason=${r.reason}`);
  });

  // ─── DEB-GT: Gate evaluation — DRIVEWAY_BULKY_ITEMS_LOADING branch ──────

  const ENC_PASS_FIELDS = {
    residential_exterior_visible:        true,
    bulky_items_visible:                 true,
    active_loading_visible:              true,
    partially_loaded_vehicle_visible:    true,
    clear_carrying_path_visible:         true,
    vehicle_safely_parked:               true,
    large_item_carried_by_single_worker: false,
    wild_dumping_scene:                  false,
    public_road_obstructed:              false,
    service_visual_match:                true,
    worker_count_matches_plan:           true,
  };

  test('DEB-GT21', 'Residential exterior + bulky items + active loading + vehicle + 2 workers → PASS', () => {
    const r = evalGate(ENC_PASS_FIELDS, 'DRIVEWAY_BULKY_ITEMS_LOADING');
    assert(r.safe === true, `Expected PASS, got REJECT on ${r.first_failed} (${r.reason})`);
  });

  test('DEB-GT22', 'bulky_items_visible=false (boxes/bags only, no bulky item) → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...ENC_PASS_FIELDS, bulky_items_visible: false }, 'DRIVEWAY_BULKY_ITEMS_LOADING');
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('DEB-GT23', 'active_loading_visible=false (items abandoned, no handling) → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...ENC_PASS_FIELDS, active_loading_visible: false }, 'DRIVEWAY_BULKY_ITEMS_LOADING');
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('DEB-GT24', 'partially_loaded_vehicle_visible=false (no vehicle present) → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...ENC_PASS_FIELDS, partially_loaded_vehicle_visible: false }, 'DRIVEWAY_BULKY_ITEMS_LOADING');
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('DEB-GT25', 'wild_dumping_scene=true (abandoned pile, no loading) → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...ENC_PASS_FIELDS, wild_dumping_scene: true }, 'DRIVEWAY_BULKY_ITEMS_LOADING');
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('DEB-GT26', 'large_item_carried_by_single_worker=true (fridge alone) → REJECT access_violation', () => {
    const r = evalGate({ ...ENC_PASS_FIELDS, large_item_carried_by_single_worker: true }, 'DRIVEWAY_BULKY_ITEMS_LOADING');
    assert(!r.safe && r.reason === 'access_violation',
      `Expected access_violation, got safe=${r.safe} reason=${r.reason}`);
  });

  test('DEB-GT27', 'public_road_obstructed=true (pavement blocked) → REJECT access_violation', () => {
    const r = evalGate({ ...ENC_PASS_FIELDS, public_road_obstructed: true }, 'DRIVEWAY_BULKY_ITEMS_LOADING');
    assert(!r.safe && r.reason === 'access_violation',
      `Expected access_violation, got safe=${r.safe} reason=${r.reason}`);
  });

  test('DEB-GT28', 'service_visual_match=false (simple box relocation, no bulky item) → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...ENC_PASS_FIELDS, service_visual_match: false }, 'DRIVEWAY_BULKY_ITEMS_LOADING');
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  // ─── DEBARRAS-FULL-HOUSE-CLEARANCE — scene routing ───────────────────────

  test('DEB-SC10', 'Vider maison succession encours → DEBARRAS-FULL-HOUSE-CLEARANCE + FULL_HOUSE_CLEARANCE', () => {
    const r = resolve('Vider maison succession', 'encours');
    assert(r._visual_family === 'DEBARRAS-FULL-HOUSE-CLEARANCE',
      `Expected DEBARRAS-FULL-HOUSE-CLEARANCE, got "${r._visual_family}"`);
    assert(r._access_configuration === 'FULL_HOUSE_CLEARANCE',
      `Expected FULL_HOUSE_CLEARANCE, got "${r._access_configuration}"`);
    assert(r.setting === 'interior',
      `Expected setting=interior, got "${r.setting}"`);
  });

  test('DEB-SC11', 'Débarras après décès encours → DEBARRAS-FULL-HOUSE-CLEARANCE + FULL_HOUSE_CLEARANCE', () => {
    const r = resolve('Débarras après décès', 'encours');
    assert(r._visual_family === 'DEBARRAS-FULL-HOUSE-CLEARANCE',
      `Expected DEBARRAS-FULL-HOUSE-CLEARANCE, got "${r._visual_family}"`);
    assert(r._access_configuration === 'FULL_HOUSE_CLEARANCE',
      `Expected FULL_HOUSE_CLEARANCE, got "${r._access_configuration}"`);
  });

  test('DEB-SC12', 'Vider maison succession encours → state_lock_used=true, pool_size=1', () => {
    const r = resolve('Vider maison succession', 'encours');
    assert(r._state_lock_used === true,
      `Expected _state_lock_used=true, got ${r._state_lock_used}`);
    assert(r._state_lock_pool_size === 1,
      `Expected _state_lock_pool_size=1, got ${r._state_lock_pool_size}`);
  });

  test('DEB-SC13', 'Débarras après décès encours → state_lock_used=true, pool_size=1', () => {
    const r = resolve('Débarras après décès', 'encours');
    assert(r._state_lock_used === true,
      `Expected _state_lock_used=true, got ${r._state_lock_used}`);
    assert(r._state_lock_pool_size === 1,
      `Expected _state_lock_pool_size=1, got ${r._state_lock_pool_size}`);
  });

  test('DEB-SC14', 'NO-COLLISION: Vider maison succession → not DEBARRAS-MAISON-ENCOURS', () => {
    const r = resolve('Vider maison succession', 'encours');
    assert(r._visual_family !== 'DEBARRAS-MAISON-ENCOURS',
      `Collision: Vider maison succession must not route to DEBARRAS-MAISON-ENCOURS, got "${r._visual_family}"`);
  });

  test('DEB-SC15', 'NO-COLLISION: Débarras maison → still DEBARRAS-MAISON-ENCOURS after _for tightening', () => {
    const r = resolve('Débarras maison', 'encours');
    assert(r._visual_family === 'DEBARRAS-MAISON-ENCOURS',
      `Expected DEBARRAS-MAISON-ENCOURS, got "${r._visual_family}"`);
  });

  // ─── DEBARRAS-FULL-HOUSE-CLEARANCE — gate tests ───────────────────────────

  const FHC_PASS_FIELDS = {
    house_interior_visible:             true,
    full_clearance_in_progress_visible: true,
    partially_cleared_rooms_visible:    true,
    active_packing_or_removal_visible:  true,
    clear_exit_path_visible:            true,
    large_item_carried_by_single_worker: false,
    exit_path_blocked:                  false,
    private_sensitive_items_visible:    false,
    funerary_items_visible:             false,
    dramatic_grief_scene:               false,
    service_visual_match:               true,
    worker_count_matches_plan:          true,
  };

  test('DEB-GT29', 'FULL_HOUSE_CLEARANCE PASS — all fields valid', () => {
    const r = evalGate({ ...FHC_PASS_FIELDS }, 'FULL_HOUSE_CLEARANCE');
    assert(r.safe === true,
      `Expected PASS, got safe=${r.safe} reason=${r.reason}`);
  });

  test('DEB-GT30', 'house_interior_visible=false → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...FHC_PASS_FIELDS, house_interior_visible: false }, 'FULL_HOUSE_CLEARANCE');
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('DEB-GT31', 'full_clearance_in_progress_visible=false (simple small move) → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...FHC_PASS_FIELDS, full_clearance_in_progress_visible: false }, 'FULL_HOUSE_CLEARANCE');
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('DEB-GT32', 'partially_cleared_rooms_visible=false (entirely empty house) → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...FHC_PASS_FIELDS, partially_cleared_rooms_visible: false }, 'FULL_HOUSE_CLEARANCE');
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('DEB-GT33', 'active_packing_or_removal_visible=false (idle workers) → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...FHC_PASS_FIELDS, active_packing_or_removal_visible: false }, 'FULL_HOUSE_CLEARANCE');
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('DEB-GT34', 'large_item_carried_by_single_worker=true → REJECT access_violation', () => {
    const r = evalGate({ ...FHC_PASS_FIELDS, large_item_carried_by_single_worker: true }, 'FULL_HOUSE_CLEARANCE');
    assert(!r.safe && r.reason === 'access_violation',
      `Expected access_violation, got safe=${r.safe} reason=${r.reason}`);
  });

  test('DEB-GT35', 'exit_path_blocked=true → REJECT access_violation', () => {
    const r = evalGate({ ...FHC_PASS_FIELDS, exit_path_blocked: true }, 'FULL_HOUSE_CLEARANCE');
    assert(!r.safe && r.reason === 'access_violation',
      `Expected access_violation, got safe=${r.safe} reason=${r.reason}`);
  });

  test('DEB-GT36', 'private_sensitive_items_visible=true (readable documents) → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...FHC_PASS_FIELDS, private_sensitive_items_visible: true }, 'FULL_HOUSE_CLEARANCE');
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('DEB-GT37', 'funerary_items_visible=true (urns / memorial candles) → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...FHC_PASS_FIELDS, funerary_items_visible: true }, 'FULL_HOUSE_CLEARANCE');
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('DEB-GT38', 'dramatic_grief_scene=true (person grieving) → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...FHC_PASS_FIELDS, dramatic_grief_scene: true }, 'FULL_HOUSE_CLEARANCE');
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('DEB-GT39', 'service_visual_match=false (simple cleaning, no removal) → REJECT service_visual_mismatch', () => {
    const r = evalGate({ ...FHC_PASS_FIELDS, service_visual_match: false }, 'FULL_HOUSE_CLEARANCE');
    assert(!r.safe && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('DEB-GT40', 'worker_count_matches_plan=false → REJECT worker_count_mismatch', () => {
    const r = evalGate({ ...FHC_PASS_FIELDS, worker_count_matches_plan: false }, 'FULL_HOUSE_CLEARANCE');
    assert(!r.safe && r.reason === 'worker_count_mismatch',
      `Expected worker_count_mismatch, got safe=${r.safe} reason=${r.reason}`);
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
