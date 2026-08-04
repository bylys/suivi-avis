/**
 * papier-peint-tests.js — structured wallpaper installation workflow tests
 * Tests:
 *   WAL-SL1 : papier peint + encours → visual_family = PEINTURE-WALLPAPER-INSTALLATION-INTERIOR
 *   WAL-SL2 : papier peint + encours → access_configuration = GROUND_LEVEL_WALLPAPER_INSTALLATION
 *   WAL-SL3 : papier peint + encours → state_lock_pool_size = 1 (single locked scenario)
 *   WAL-SL4-debut/semifinal/final : encours state-lock NOT selected for non-encours states
 *   WAL-SL4-NR1..3 : generic pool isolation non-regression
 *   WAL-SL5 : papier peint + encours → scene_reset_exclude = true on picked scenario
 *   WAL-AC1 : Peinture intérieure + encours → does NOT match ^papier peint$ lock
 *   WAL-AC2 : Peinture salon + encours      → does NOT match ^papier peint$ lock
 *   WAL-AC3 : Peinture plafond + encours    → does NOT match ^papier peint$ lock
 *   WAL-AC4 : Enduit décoratif              → does NOT match ^papier peint$ lock
 *   WAL-AC5 : Peinture façade               → does NOT match ^papier peint$ lock
 *   WAL-GT1 : alias 'papier peint' → resolves to 'Papier peint' gate
 *   WAL-GT2 : alias 'pose papier peint' → resolves to 'Papier peint' gate
 *   WAL-GT3 : alias 'pose de papier peint' → resolves to 'Papier peint' gate
 *   WAL-GT4 : alias 'installation papier peint' → resolves to 'Papier peint' gate
 *   WAL-GT5 : gate has mandatory_fields (21 fields)
 *   WAL-GT6 : gate has reject_conditions (21 conditions)
 *   WAL-GT7 : gate has reject_conditions_by_access.GROUND_LEVEL_WALLPAPER_INSTALLATION
 *   WAL-GT8 : liquid_paint_roller_application_visible=true → reject (value:true first)
 *   WAL-GT9 : wallpaper_strip_attached_to_wall_visible absent → reject (not_exactly_true)
 *   WAL-GT10: worker_on_ladder=true → reject (access_violation)
 *   WAL-GT11: worker_on_scaffold=true → reject (access_violation)
 *   WAL-GT12: service_visual_match absent → reject (not_exactly_true)
 *   WAL-WP1 : papier peint + encours → _planned_worker_count stamped = 1
 *   WAL-WP2 : 20 seeds → all tasks show exactly 1 worker (state-lock override)
 *   WAL-WP3 : scene_reset_exclude clears WORK_SCENES exclusions (workers/people absent)
 *   WAL-WP4 : scene_exclude positions 0-7 all present in prompt (PromptBuilder slice check)
 *   WAL-PR1 : One tradesperson in final prompt
 *   WAL-PR2 : workers/people NOT in Never include after scene_reset_exclude
 *   WAL-PR3 : resolving Peinture intérieure after Papier peint is unaffected (isolation)
 */

const BUST = 'wal-v2';
const { _applySiteRealism } = await import(`../resolution/service-resolver.js?bust=${BUST}`);
const { _planBatchWorkerPresence } = await import(`../planning/worker-planner.js?bust=${BUST}`);
const { SITE_REALISM } = await import(`../services/index.js?bust=${BUST}`);
const { SERVICE_VISUAL_GATE_RULES, _SERVICE_GATE_ALIASES } = await import(`../safety/safety-rules.js?bust=${BUST}`);
const { PromptBuilder } = await import(`../prompt/prompt-builder.js?bust=${BUST}`);

export async function runPapierPeintTests() {
  console.group('WAL tests — Papier peint structured workflow');

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

  // ─── Helpers ────────────────────────────────────────────────────────────────
  function resolveObj(service, state) {
    const obj = {
      _matched_key:     'peinture',
      _matched_service: service,
      state_level:      state,
      contexte:         'maison_individuelle',
      exclude:          ['workers', 'people', 'ladders', 'paint rollers', 'brushes', 'buckets'],
    };
    return JSON.parse(_applySiteRealism(JSON.stringify(obj), 0));
  }

  function makeWorkerTask(plannedWC) {
    const planBase = { _matched_key: 'peinture', state_level: 'encours' };
    if (Number.isInteger(plannedWC)) planBase._planned_worker_count = plannedWC;
    return {
      _planBase:                    planBase,
      _pre_assigned_composition:    'medium_intervention',
      _pre_assigned_worker_presence: 'none',
      _pre_assigned_worker_count:    0,
    };
  }

  function gateReject(gateName, imageObj) {
    const gate = SERVICE_VISUAL_GATE_RULES[gateName];
    if (!gate) throw new Error(`Gate '${gateName}' not found`);
    const conds = gate.reject_conditions;
    for (const c of conds) {
      if ('value' in c && imageObj[c.field] === c.value) return { rejected: true, field: c.field, reason: c.reason };
      if (c.not_exactly_true && imageObj[c.field] !== true)   return { rejected: true, field: c.field, reason: c.reason };
    }
    return { rejected: false };
  }

  function gateRejectByAccess(gateName, accessConfig, imageObj) {
    const gate = SERVICE_VISUAL_GATE_RULES[gateName];
    if (!gate) throw new Error(`Gate '${gateName}' not found`);
    const conds = gate.reject_conditions_by_access?.[accessConfig];
    if (!conds) throw new Error(`No reject_conditions_by_access.${accessConfig} in gate '${gateName}'`);
    for (const c of conds) {
      if ('value' in c && imageObj[c.field] === c.value) return { rejected: true, field: c.field, reason: c.reason };
      if (c.not_exactly_true && imageObj[c.field] !== true)   return { rejected: true, field: c.field, reason: c.reason };
    }
    return { rejected: false };
  }

  // ─── WAL-SL1: state-lock → correct visual_family ──────────────────────────
  test('WAL-SL1', 'papier peint + encours → _visual_family = PEINTURE-WALLPAPER-INSTALLATION-INTERIOR', () => {
    const result = resolveObj('Papier peint', 'encours');
    assert(result._visual_family === 'PEINTURE-WALLPAPER-INSTALLATION-INTERIOR',
      `Expected PEINTURE-WALLPAPER-INSTALLATION-INTERIOR, got ${result._visual_family}`);
  });

  // ─── WAL-SL2: state-lock → correct access_configuration ──────────────────
  test('WAL-SL2', 'papier peint + encours → _access_configuration = GROUND_LEVEL_WALLPAPER_INSTALLATION', () => {
    const result = resolveObj('Papier peint', 'encours');
    assert(result._access_configuration === 'GROUND_LEVEL_WALLPAPER_INSTALLATION',
      `Expected GROUND_LEVEL_WALLPAPER_INSTALLATION, got ${result._access_configuration}`);
  });

  // ─── WAL-SL3: pool_size = 1 ───────────────────────────────────────────────
  test('WAL-SL3', 'papier peint + encours → single locked scenario (state_lock_pool_size = 1)', () => {
    const peinture = SITE_REALISM['peinture'];
    assert(peinture, 'peinture not found in SITE_REALISM');
    const lockCandidates = (peinture.scenarios || []).filter(s =>
      s._state_for === 'encours' && /^\^papier peint\$$/.test(s._for)
    );
    assert(lockCandidates.length === 1,
      `Expected exactly 1 state-lock scenario for ^papier peint$, found ${lockCandidates.length}`);
  });

  // ─── WAL-SL4: non-encours states → wallpaper encours scenario never selected ────
  for (const badState of ['debut', 'semifinal', 'final']) {
    test(`WAL-SL4-${badState}`, `papier peint + ${badState} → encours state-lock NOT selected`, () => {
      const result = resolveObj('Papier peint', badState);
      assert(result._visual_family !== 'PEINTURE-WALLPAPER-INSTALLATION-INTERIOR',
        `_visual_family must NOT be PEINTURE-WALLPAPER-INSTALLATION-INTERIOR for state=${badState}, got ${result._visual_family}`);
      assert(result._access_configuration !== 'GROUND_LEVEL_WALLPAPER_INSTALLATION',
        `_access_configuration must NOT be GROUND_LEVEL_WALLPAPER_INSTALLATION for state=${badState}, got ${result._access_configuration}`);
      assert(result._selected_scenario_state_for !== 'encours',
        `_selected_scenario_state_for must NOT be 'encours' for state=${badState}, got ${result._selected_scenario_state_for}`);
    });
  }

  // ─── WAL-SL4-NR: generic pool isolation non-regression ───────────────────────
  // Scenario with _state_for='encours' + request 'encours' → selected, state_lock_used=true
  test('WAL-SL4-NR1', '_state_for=encours + request encours → selected, state_lock_used=true', () => {
    const result = resolveObj('Papier peint', 'encours');
    assert(result._state_lock_used === true,
      `Expected _state_lock_used=true for encours, got ${result._state_lock_used}`);
    assert(result._selected_scenario_state_for === 'encours',
      `Expected _selected_scenario_state_for=encours, got ${result._selected_scenario_state_for}`);
  });
  // Scenario with _state_for='encours' + request 'debut' → NOT selected (pool isolated)
  test('WAL-SL4-NR2', '_state_for=encours + request debut → encours scenario absent from pool', () => {
    const result = resolveObj('Papier peint', 'debut');
    assert(result._selected_scenario_state_for !== 'encours',
      `Encours scenario leaked into debut pool — _selected_scenario_state_for=${result._selected_scenario_state_for}`);
  });
  // Non-_state_for scenario remains accessible for any state
  test('WAL-SL4-NR3', 'non-_state_for scenario (Peinture intérieure) accessible for debut', () => {
    const result = resolveObj('Peinture intérieure', 'debut');
    // Generic interior paint scenarios have no _state_for — they should be picked
    assert(result._selected_scenario_state_for === null || result._selected_scenario_state_for === undefined,
      `Peinture intérieure/debut: expected no state_for on picked scenario, got ${result._selected_scenario_state_for}`);
  });

  // ─── WAL-SL5: scene_reset_exclude = true on locked scenario ──────────────
  test('WAL-SL5', 'papier peint + encours → picked scenario has scene_reset_exclude = true', () => {
    const peinture = SITE_REALISM['peinture'];
    const lock = (peinture.scenarios || []).find(s =>
      s._state_for === 'encours' && /^\^papier peint\$$/.test(s._for)
    );
    assert(lock, 'state-lock scenario not found');
    assert(lock.scene_reset_exclude === true,
      `Expected scene_reset_exclude = true, got ${lock.scene_reset_exclude}`);
  });

  // ─── WAL-AC1: Peinture intérieure does not match ^papier peint$ ──────────
  test('WAL-AC1', 'Peinture intérieure + encours does NOT match papier peint state-lock', () => {
    const result = resolveObj('Peinture intérieure', 'encours');
    assert(result._visual_family !== 'PEINTURE-WALLPAPER-INSTALLATION-INTERIOR',
      'Peinture intérieure matched the Papier peint state-lock — collision detected');
  });

  // ─── WAL-AC2: Peinture salon does not match ^papier peint$ ───────────────
  test('WAL-AC2', 'Peinture salon + encours does NOT match papier peint state-lock', () => {
    const result = resolveObj('Peinture salon', 'encours');
    assert(result._visual_family !== 'PEINTURE-WALLPAPER-INSTALLATION-INTERIOR',
      'Peinture salon matched the Papier peint state-lock — collision detected');
  });

  // ─── WAL-AC3: Peinture plafond does not match ^papier peint$ ─────────────
  test('WAL-AC3', 'Peinture plafond + encours does NOT match papier peint state-lock', () => {
    const result = resolveObj('Peinture plafond', 'encours');
    assert(result._visual_family !== 'PEINTURE-WALLPAPER-INSTALLATION-INTERIOR',
      'Peinture plafond matched the Papier peint state-lock — collision detected');
  });

  // ─── WAL-AC4: Enduit décoratif does not match ^papier peint$ ─────────────
  test('WAL-AC4', 'Enduit décoratif does NOT match papier peint state-lock', () => {
    const result = resolveObj('Enduit décoratif', 'encours');
    assert(result._visual_family !== 'PEINTURE-WALLPAPER-INSTALLATION-INTERIOR',
      'Enduit décoratif matched the Papier peint state-lock — collision detected');
  });

  // ─── WAL-AC5: Peinture façade does not match ^papier peint$ ──────────────
  test('WAL-AC5', 'Peinture façade does NOT match papier peint state-lock', () => {
    const result = resolveObj('Peinture façade', 'encours');
    assert(result._visual_family !== 'PEINTURE-WALLPAPER-INSTALLATION-INTERIOR',
      'Peinture façade matched the Papier peint state-lock — collision detected');
  });

  // ─── WAL-GT1..4: alias resolution ────────────────────────────────────────
  const aliases = [
    ['papier peint',            'WAL-GT1'],
    ['pose papier peint',       'WAL-GT2'],
    ['pose de papier peint',    'WAL-GT3'],
    ['installation papier peint', 'WAL-GT4'],
  ];
  for (const [alias, id] of aliases) {
    test(id, `alias '${alias}' → 'Papier peint' gate`, () => {
      const resolved = _SERVICE_GATE_ALIASES[alias];
      assert(resolved === 'Papier peint',
        `Expected 'Papier peint', got '${resolved}'`);
    });
  }

  // ─── WAL-GT5: mandatory_fields count ────────────────────────────────────
  test('WAL-GT5', 'gate has 21 mandatory_fields', () => {
    const gate = SERVICE_VISUAL_GATE_RULES['Papier peint'];
    assert(gate, "Gate 'Papier peint' not found in SERVICE_VISUAL_GATE_RULES");
    assert(Array.isArray(gate.mandatory_fields), 'mandatory_fields must be an array');
    assert(gate.mandatory_fields.length === 21,
      `Expected 21 mandatory_fields, got ${gate.mandatory_fields.length}`);
  });

  // ─── WAL-GT6: reject_conditions count ────────────────────────────────────
  test('WAL-GT6', 'gate has 21 reject_conditions', () => {
    const gate = SERVICE_VISUAL_GATE_RULES['Papier peint'];
    assert(Array.isArray(gate.reject_conditions), 'reject_conditions must be an array');
    assert(gate.reject_conditions.length === 21,
      `Expected 21 reject_conditions, got ${gate.reject_conditions.length}`);
  });

  // ─── WAL-GT7: reject_conditions_by_access ────────────────────────────────
  test('WAL-GT7', 'gate has reject_conditions_by_access.GROUND_LEVEL_WALLPAPER_INSTALLATION', () => {
    const gate = SERVICE_VISUAL_GATE_RULES['Papier peint'];
    assert(gate.reject_conditions_by_access, 'reject_conditions_by_access missing');
    const byAccess = gate.reject_conditions_by_access['GROUND_LEVEL_WALLPAPER_INSTALLATION'];
    assert(Array.isArray(byAccess) && byAccess.length === 21,
      `Expected 21 conditions in GROUND_LEVEL_WALLPAPER_INSTALLATION, got ${byAccess?.length}`);
  });

  // ─── WAL-GT8: liquid_paint_roller_application_visible=true → reject ───────
  test('WAL-GT8', 'liquid_paint_roller_application_visible=true → rejected (service_visual_mismatch)', () => {
    const img = {
      liquid_paint_roller_application_visible:           true,
      paint_tray_dominant:                               false,
      decorative_plaster_application_visible:            false,
      completed_wallpapered_wall_dominant:               false,
      ceiling_wallpapering_dominant:                     false,
      exterior_context_visible:                          false,
      worker_on_ladder:                                  false,
      worker_on_step_ladder:                             false,
      worker_on_scaffold:                                false,
      worker_standing_on_furniture:                      false,
      interior_wall_visible:                             true,
      wallpaper_strip_attached_to_wall_visible:          true,
      active_wallpaper_positioning_or_smoothing_visible: true,
      wallpaper_smoothing_tool_in_contact_visible:       true,
      vertical_wallpaper_edge_or_seam_visible:           true,
      partial_installed_and_unfinished_wall_zones_visible: true,
      wallpaper_roll_paste_or_installation_materials_visible: true,
      floor_drop_cloth_visible:                          true,
      worker_stable_on_floor:                            true,
      service_visual_match:                              true,
      worker_count_match:                                true,
    };
    const r = gateReject('Papier peint', img);
    assert(r.rejected, 'Expected rejection for liquid_paint_roller_application_visible=true');
    assert(r.reason === 'service_visual_mismatch', `Expected service_visual_mismatch, got ${r.reason}`);
  });

  // ─── WAL-GT9: wallpaper_strip absent → reject ────────────────────────────
  test('WAL-GT9', 'wallpaper_strip_attached_to_wall_visible absent → rejected (not_exactly_true)', () => {
    const img = {
      liquid_paint_roller_application_visible:           false,
      paint_tray_dominant:                               false,
      decorative_plaster_application_visible:            false,
      completed_wallpapered_wall_dominant:               false,
      ceiling_wallpapering_dominant:                     false,
      exterior_context_visible:                          false,
      worker_on_ladder:                                  false,
      worker_on_step_ladder:                             false,
      worker_on_scaffold:                                false,
      worker_standing_on_furniture:                      false,
      interior_wall_visible:                             true,
      // wallpaper_strip_attached_to_wall_visible intentionally absent
      active_wallpaper_positioning_or_smoothing_visible: true,
      wallpaper_smoothing_tool_in_contact_visible:       true,
      vertical_wallpaper_edge_or_seam_visible:           true,
      partial_installed_and_unfinished_wall_zones_visible: true,
      wallpaper_roll_paste_or_installation_materials_visible: true,
      floor_drop_cloth_visible:                          true,
      worker_stable_on_floor:                            true,
      service_visual_match:                              true,
      worker_count_match:                                true,
    };
    const r = gateReject('Papier peint', img);
    assert(r.rejected, 'Expected rejection for missing wallpaper_strip_attached_to_wall_visible');
    assert(r.field === 'wallpaper_strip_attached_to_wall_visible',
      `Expected field wallpaper_strip_attached_to_wall_visible, got ${r.field}`);
  });

  // ─── WAL-GT10: worker_on_ladder=true → reject (access_violation) ─────────
  test('WAL-GT10', 'worker_on_ladder=true → rejected (access_violation)', () => {
    const img = {
      liquid_paint_roller_application_visible:           false,
      paint_tray_dominant:                               false,
      decorative_plaster_application_visible:            false,
      completed_wallpapered_wall_dominant:               false,
      ceiling_wallpapering_dominant:                     false,
      exterior_context_visible:                          false,
      worker_on_ladder:                                  true,
      worker_on_step_ladder:                             false,
      worker_on_scaffold:                                false,
      worker_standing_on_furniture:                      false,
      interior_wall_visible:                             true,
      wallpaper_strip_attached_to_wall_visible:          true,
      active_wallpaper_positioning_or_smoothing_visible: true,
      wallpaper_smoothing_tool_in_contact_visible:       true,
      vertical_wallpaper_edge_or_seam_visible:           true,
      partial_installed_and_unfinished_wall_zones_visible: true,
      wallpaper_roll_paste_or_installation_materials_visible: true,
      floor_drop_cloth_visible:                          true,
      worker_stable_on_floor:                            false,
      service_visual_match:                              true,
      worker_count_match:                                true,
    };
    const r = gateReject('Papier peint', img);
    assert(r.rejected, 'Expected rejection for worker_on_ladder=true');
    assert(r.reason === 'access_violation', `Expected access_violation, got ${r.reason}`);
  });

  // ─── WAL-GT11: worker_on_scaffold=true → reject (access_violation) ────────
  test('WAL-GT11', 'worker_on_scaffold=true → rejected (access_violation)', () => {
    const img = {
      liquid_paint_roller_application_visible:           false,
      paint_tray_dominant:                               false,
      decorative_plaster_application_visible:            false,
      completed_wallpapered_wall_dominant:               false,
      ceiling_wallpapering_dominant:                     false,
      exterior_context_visible:                          false,
      worker_on_ladder:                                  false,
      worker_on_step_ladder:                             false,
      worker_on_scaffold:                                true,
      worker_standing_on_furniture:                      false,
      interior_wall_visible:                             true,
      wallpaper_strip_attached_to_wall_visible:          true,
      active_wallpaper_positioning_or_smoothing_visible: true,
      wallpaper_smoothing_tool_in_contact_visible:       true,
      vertical_wallpaper_edge_or_seam_visible:           true,
      partial_installed_and_unfinished_wall_zones_visible: true,
      wallpaper_roll_paste_or_installation_materials_visible: true,
      floor_drop_cloth_visible:                          true,
      worker_stable_on_floor:                            false,
      service_visual_match:                              true,
      worker_count_match:                                true,
    };
    const r = gateReject('Papier peint', img);
    assert(r.rejected, 'Expected rejection for worker_on_scaffold=true');
    assert(r.reason === 'access_violation', `Expected access_violation, got ${r.reason}`);
  });

  // ─── WAL-GT12: service_visual_match absent → reject ──────────────────────
  test('WAL-GT12', 'service_visual_match absent → rejected (service_visual_mismatch)', () => {
    const img = {
      liquid_paint_roller_application_visible:           false,
      paint_tray_dominant:                               false,
      decorative_plaster_application_visible:            false,
      completed_wallpapered_wall_dominant:               false,
      ceiling_wallpapering_dominant:                     false,
      exterior_context_visible:                          false,
      worker_on_ladder:                                  false,
      worker_on_step_ladder:                             false,
      worker_on_scaffold:                                false,
      worker_standing_on_furniture:                      false,
      interior_wall_visible:                             true,
      wallpaper_strip_attached_to_wall_visible:          true,
      active_wallpaper_positioning_or_smoothing_visible: true,
      wallpaper_smoothing_tool_in_contact_visible:       true,
      vertical_wallpaper_edge_or_seam_visible:           true,
      partial_installed_and_unfinished_wall_zones_visible: true,
      wallpaper_roll_paste_or_installation_materials_visible: true,
      floor_drop_cloth_visible:                          true,
      worker_stable_on_floor:                            true,
      // service_visual_match intentionally absent
      worker_count_match:                                true,
    };
    const r = gateReject('Papier peint', img);
    assert(r.rejected, 'Expected rejection for service_visual_match absent');
    assert(r.field === 'service_visual_match',
      `Expected field service_visual_match, got ${r.field}`);
  });

  // ─── WAL-WP1: _planned_worker_count stamped = 1 ──────────────────────────
  test('WAL-WP1', 'papier peint + encours → _planned_worker_count stamped = 1', () => {
    const result = resolveObj('Papier peint', 'encours');
    assert(result._planned_worker_count === 1,
      `Expected _planned_worker_count = 1, got ${result._planned_worker_count}`);
  });

  // ─── WAL-WP2: 20 seeds → all 1 worker (state-lock override) ─────────────
  test('WAL-WP2', '20 seeds → all tasks have exactly 1 worker (state-lock override)', () => {
    for (let seed = 0; seed < 20; seed++) {
      const task = makeWorkerTask(1);
      _planBatchWorkerPresence([task], seed);
      assert(task._pre_assigned_worker_presence === 'workers',
        `Seed ${seed}: expected workers, got ${task._pre_assigned_worker_presence}`);
      assert(task._pre_assigned_worker_count === 1,
        `Seed ${seed}: expected count=1, got ${task._pre_assigned_worker_count}`);
    }
  });

  // ─── WAL-WP3: scene_reset_exclude clears inherited peinture exclusions ────
  test('WAL-WP3', 'scene_reset_exclude clears inherited WORK_SCENES exclusions (workers/people absent)', () => {
    const result = resolveObj('Papier peint', 'encours');
    // WORK_SCENES['peinture'].exclusions = ['ladders','paint rollers','brushes','buckets','workers','people']
    // scene_reset_exclude = true should have cleared these before appending scene_exclude
    const bad = ['workers', 'people'].filter(x => (result.exclude || []).includes(x));
    assert(bad.length === 0,
      `Inherited exclusions NOT cleared by scene_reset_exclude — still present: ${bad.join(', ')}`);
  });

  // ─── WAL-WP4: scene_exclude positions 0-7 present in prompt ──────────────
  test('WAL-WP4', 'scene_exclude first 8 items appear in PromptBuilder Never include section', () => {
    const peinture = SITE_REALISM['peinture'];
    const lock = (peinture.scenarios || []).find(s =>
      s._state_for === 'encours' && /^\^papier peint\$$/.test(s._for)
    );
    assert(lock, 'state-lock scenario not found');
    const sliced = (lock.scene_exclude || []).slice(0, 8);
    assert(sliced.length === 8,
      `Expected 8 scene_exclude items for PromptBuilder slice, got ${sliced.length}`);
    // All 8 must be non-empty strings
    for (let i = 0; i < sliced.length; i++) {
      assert(typeof sliced[i] === 'string' && sliced[i].length > 0,
        `scene_exclude[${i}] is not a valid non-empty string`);
    }
    // Positions 4-6 must contain ladder/step-ladder/scaffold (safety-critical)
    const critical = ['ladder', 'step ladder', 'scaffold'];
    const slicedText = sliced.join('\n');
    for (const term of critical) {
      assert(slicedText.toLowerCase().includes(term),
        `Safety-critical term '${term}' is outside PromptBuilder slice (positions 0-7)`);
    }
  });

  // ─── WAL-PR1: One tradesperson in prompt ──────────────────────────────────
  test('WAL-PR1', 'papier peint encours → prompt contains "One tradesperson"', () => {
    const obj = resolveObj('Papier peint', 'encours');
    obj.var_workers  = 1;
    obj.var_presence = 'workers';
    const prompt = PromptBuilder.build(JSON.stringify(obj));
    assert(typeof prompt === 'string' && prompt.length > 0, 'PromptBuilder.build returned empty');
    assert(
      prompt.includes('One tradesperson') || prompt.includes('one tradesperson'),
      `Expected "One tradesperson" in prompt, got excerpt: ...${prompt.slice(0, 200)}...`
    );
  });

  // ─── WAL-PR2: workers/people NOT in Never include ─────────────────────────
  test('WAL-PR2', 'workers and people NOT in Never include section of prompt', () => {
    const obj = resolveObj('Papier peint', 'encours');
    obj.var_workers  = 1;
    obj.var_presence = 'workers';
    const prompt = PromptBuilder.build(JSON.stringify(obj));
    const neverInclude = prompt.split('Never include:')[1] || '';
    assert(!neverInclude.toLowerCase().includes('; workers;') && !neverInclude.toLowerCase().startsWith('workers'),
      `"workers" found in Never include — scene_reset_exclude did not clear inherited exclusions`);
    assert(!neverInclude.toLowerCase().includes('; people;') && !neverInclude.toLowerCase().startsWith('people'),
      `"people" found in Never include — scene_reset_exclude did not clear inherited exclusions`);
  });

  // ─── WAL-PR3: Peinture intérieure resolve unaffected after Papier peint ───
  test('WAL-PR3', 'Peinture intérieure resolve after Papier peint is fully isolated', () => {
    // Resolve Papier peint first
    resolveObj('Papier peint', 'encours');
    // Then resolve Peinture intérieure — must NOT pick the wallpaper state-lock
    const result = resolveObj('Peinture intérieure', 'encours');
    assert(result._visual_family !== 'PEINTURE-WALLPAPER-INSTALLATION-INTERIOR',
      'Peinture intérieure was polluted by Papier peint resolve — _visual_family wrongly set to wallpaper family');
    // Must produce a paint-roller scene (scene_note is stamped into work_type by service-resolver)
    const note = (result.work_type || '').toLowerCase();
    assert(
      note.includes('paint') || note.includes('roller') || note.includes('wall') || note.includes('mur') || note.includes('peinture'),
      `Peinture intérieure work_type does not look like a paint scene: "${result.work_type}"`
    );
  });

  // ─── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n--- WAL: ${_pass}/${_pass + _fail} ---\n`);
  console.groupEnd();
  return { pass: _pass, fail: _fail, results: _results };
}
