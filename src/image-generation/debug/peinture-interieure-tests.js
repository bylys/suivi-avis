/**
 * peinture-interieure-tests.js — shared interior wall painting workflow
 * Tests:
 *   PIN-SL1..5  : state-lock resolution for the 5 interior services
 *   PIN-SL6..10 : anti-collision — plafond, papier peint, ext, facade, enduit déco
 *   PIN-AC1..4  : access configuration, visual family, worker count, scene_reset_exclude
 *   PIN-GT1..18 : gate alias, mandatory_fields, PASS, rejects (value:true + not_exactly_true)
 *   PIN-WP1..5  : worker propagation resolver → planner → prompt
 *   PIN-PR1..4  : prompt text verification (worker, Never include, isolation)
 */

const { _applySiteRealism, _resolveServiceSetting }  = await import('../resolution/service-resolver.js?bust=pin-1');
const { _applyVariation }                             = await import('../resolution/scene-resolver.js?bust=pin-1');
const { SERVICE_VISUAL_GATE_RULES, _SERVICE_GATE_ALIASES } = await import('../safety/safety-rules.js?bust=pin-1');
const { _planBatchWorkerPresence }                    = await import('../planning/worker-planner.js?bust=pin-1');
const { PromptBuilder }                               = await import('../prompt/prompt-builder.js?bust=pin-1');
const { SITE_REALISM }                                = await import('../services/index.js?bust=pin-1');

export async function runPeintureInterieureTests() {
  console.group('PIN tests — shared interior wall painting workflow');

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

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function resolveScene(service_label, state_level) {
    const so = { _matched_key: 'peinture', _matched_service: service_label, state_level, contexte: 'maison_individuelle' };
    return JSON.parse(_applySiteRealism(JSON.stringify(so), 0));
  }

  function buildInteriorWallPrompt(service_label) {
    const resolved = resolveScene(service_label, 'encours');
    resolved._pre_assigned_worker_count = 1;
    const varied = _applyVariation(JSON.stringify(resolved), 0, 'workers');
    return PromptBuilder.build(varied);
  }

  const INTERIOR_WALL_SERVICES = [
    'Peinture intérieure',
    'Peinture salon',
    'Peinture chambre',
    'Peinture cuisine',
    'Peinture couloir',
  ];

  // ─── PIN-SL1..5: state-lock resolves correctly for all 5 services ─────────
  INTERIOR_WALL_SERVICES.forEach((svc, idx) => {
    test(`PIN-SL${idx + 1}`, `${svc} encours → PEINTURE-INTERIOR-WALL-ROLLER state-lock`, () => {
      const result = resolveScene(svc, 'encours');
      assert(result._state_lock_used === true,
        `Expected state_lock_used=true for ${svc}`);
      assert(result._visual_family === 'PEINTURE-INTERIOR-WALL-ROLLER',
        `Expected PEINTURE-INTERIOR-WALL-ROLLER, got ${result._visual_family}`);
      assert(result._access_configuration === 'GROUND_LEVEL_INTERIOR_WALL_ROLLER',
        `Expected GROUND_LEVEL_INTERIOR_WALL_ROLLER, got ${result._access_configuration}`);
      assert(result._state_lock_pool_size === 1,
        `Expected pool_size=1, got ${result._state_lock_pool_size}`);
    });
  });

  // ─── PIN-SL6: Peinture plafond does NOT match this state-lock ────────────
  test('PIN-SL6', 'Peinture plafond → does not match PEINTURE-INTERIOR-WALL-ROLLER', () => {
    const result = resolveScene('Peinture plafond', 'encours');
    assert(result._visual_family !== 'PEINTURE-INTERIOR-WALL-ROLLER',
      `Peinture plafond must not resolve to PEINTURE-INTERIOR-WALL-ROLLER`);
  });

  // ─── PIN-SL7: Papier peint does NOT match this state-lock ────────────────
  test('PIN-SL7', 'Papier peint → does not match PEINTURE-INTERIOR-WALL-ROLLER', () => {
    const result = resolveScene('Papier peint', 'encours');
    assert(result._visual_family !== 'PEINTURE-INTERIOR-WALL-ROLLER',
      `Papier peint must not resolve to PEINTURE-INTERIOR-WALL-ROLLER`);
  });

  // ─── PIN-SL8: Peinture extérieure does NOT match ─────────────────────────
  test('PIN-SL8', 'Peinture extérieure → does not match PEINTURE-INTERIOR-WALL-ROLLER', () => {
    const result = resolveScene('Peinture extérieure', 'encours');
    assert(result._visual_family !== 'PEINTURE-INTERIOR-WALL-ROLLER',
      `Peinture extérieure must not resolve to PEINTURE-INTERIOR-WALL-ROLLER`);
  });

  // ─── PIN-SL9: Peinture façade does NOT match ──────────────────────────────
  test('PIN-SL9', 'Peinture façade → does not match PEINTURE-INTERIOR-WALL-ROLLER', () => {
    const result = resolveScene('Peinture façade', 'encours');
    assert(result._visual_family !== 'PEINTURE-INTERIOR-WALL-ROLLER',
      `Peinture façade must not resolve to PEINTURE-INTERIOR-WALL-ROLLER`);
  });

  // ─── PIN-SL10: Enduit décoratif does NOT match (DEFERRED) ────────────────
  test('PIN-SL10', 'Enduit décoratif (DEFERRED) → does not match PEINTURE-INTERIOR-WALL-ROLLER', () => {
    const result = resolveScene('Enduit décoratif', 'encours');
    assert(result._visual_family !== 'PEINTURE-INTERIOR-WALL-ROLLER',
      `Enduit décoratif must not resolve to PEINTURE-INTERIOR-WALL-ROLLER`);
  });

  // ─── PIN-AC1: access configuration stamped ───────────────────────────────
  test('PIN-AC1', 'resolver stamps _access_configuration = GROUND_LEVEL_INTERIOR_WALL_ROLLER', () => {
    const result = resolveScene('Peinture intérieure', 'encours');
    assert(result._access_configuration === 'GROUND_LEVEL_INTERIOR_WALL_ROLLER',
      `Got ${result._access_configuration}`);
    assert(result._access_configuration_source === 'state_lock',
      `Expected source=state_lock, got ${result._access_configuration_source}`);
    assert(result._access_configuration_randomized === false,
      `Expected randomized=false, got ${result._access_configuration_randomized}`);
  });

  // ─── PIN-AC2: planned_worker_count stamped ───────────────────────────────
  test('PIN-AC2', 'resolver stamps _planned_worker_count = 1', () => {
    const result = resolveScene('Peinture salon', 'encours');
    assert(Number.isInteger(result._planned_worker_count),
      `_planned_worker_count must be an integer, got ${result._planned_worker_count}`);
    assert(result._planned_worker_count === 1,
      `Expected _planned_worker_count=1, got ${result._planned_worker_count}`);
  });

  // ─── PIN-AC3: setting = interior ─────────────────────────────────────────
  test('PIN-AC3', 'resolver stamps setting = interior', () => {
    const result = resolveScene('Peinture chambre', 'encours');
    assert(result.setting === 'interior',
      `Expected setting=interior, got ${result.setting}`);
  });

  // ─── PIN-AC4: scene_reset_exclude wipes inherited workers/people ──────────
  test('PIN-AC4', 'scene_reset_exclude: workers/people absent from obj.exclude after resolution', () => {
    const obj = {
      _matched_key:     'peinture',
      _matched_service: 'Peinture intérieure',
      state_level:      'encours',
      contexte:         'maison_individuelle',
      exclude:          ['workers', 'people', 'ladders'],
    };
    const result = JSON.parse(_applySiteRealism(JSON.stringify(obj), 0));
    assert(!result.exclude.includes('workers'),
      `workers must be absent after scene_reset_exclude — got: ${JSON.stringify(result.exclude)}`);
    assert(!result.exclude.includes('people'),
      `people must be absent after scene_reset_exclude — got: ${JSON.stringify(result.exclude)}`);
    // The scenario's own scene_exclude must appear
    assert(result.exclude.some(e => /ceiling/.test(e) || /plafond/.test(e) || /ladder/.test(e) || /scaffold/.test(e)),
      `scenario scene_exclude items must appear — got: ${JSON.stringify(result.exclude)}`);
  });

  // ─── PIN-GT1: gate alias resolution ──────────────────────────────────────
  const GATE_ALIAS_PAIRS = [
    ['peinture interieure',   'Peinture intérieure'],
    ['peinture intérieure',   'Peinture intérieure'],
    ['peinture salon',        'Peinture intérieure'],
    ['peinture chambre',      'Peinture intérieure'],
    ['peinture cuisine',      'Peinture intérieure'],
    ['peinture couloir',      'Peinture intérieure'],
  ];
  GATE_ALIAS_PAIRS.forEach(([alias, expected], i) => {
    test(`PIN-GT${i + 1}`, `alias "${alias}" → gate key "${expected}"`, () => {
      assert(_SERVICE_GATE_ALIASES[alias] === expected,
        `Expected "${expected}", got "${_SERVICE_GATE_ALIASES[alias]}"`);
    });
  });

  // ─── PIN-GT7: mandatory_fields count = 22 ────────────────────────────────
  test('PIN-GT7', 'gate mandatory_fields count = 22', () => {
    const gate = SERVICE_VISUAL_GATE_RULES['Peinture intérieure'];
    assert(gate, 'Gate "Peinture intérieure" must exist');
    assert(gate.mandatory_fields.length === 22,
      `Expected 22 mandatory_fields, got ${gate.mandatory_fields.length}: ${gate.mandatory_fields.join(', ')}`);
  });

  // ─── PIN-GT8: full PASS scene ─────────────────────────────────────────────
  test('PIN-GT8', 'full PASS: all positive fields true, all negative fields false', () => {
    const gate = SERVICE_VISUAL_GATE_RULES['Peinture intérieure'];
    const conditions = gate.reject_conditions_by_access?.GROUND_LEVEL_INTERIOR_WALL_ROLLER || gate.reject_conditions;
    const obj = {};
    for (const c of conditions) {
      if (c.value === true)           obj[c.field] = false;
      if (c.not_exactly_true === true) obj[c.field] = true;
    }
    const rejects = conditions.filter(c => {
      if (c.value === true)            return obj[c.field] === true;
      if (c.not_exactly_true === true) return obj[c.field] !== true;
      return false;
    });
    assert(rejects.length === 0, `Expected 0 reject conditions, got ${rejects.length}: ${JSON.stringify(rejects)}`);
  });

  // ─── PIN-GT9: ceiling painting → REJECT service_visual_mismatch ─────────
  test('PIN-GT9', 'ceiling_painting_dominant = true → REJECT service_visual_mismatch', () => {
    const gate = SERVICE_VISUAL_GATE_RULES['Peinture intérieure'];
    const conditions = gate.reject_conditions_by_access?.GROUND_LEVEL_INTERIOR_WALL_ROLLER || gate.reject_conditions;
    const rejectCeiling = conditions.find(c => c.field === 'ceiling_painting_dominant' && c.value === true);
    assert(rejectCeiling, 'ceiling_painting_dominant=true must be a reject condition');
    assert(rejectCeiling.reason === 'service_visual_mismatch', `Expected service_visual_mismatch, got ${rejectCeiling.reason}`);
  });

  // ─── PIN-GT10: wallpaper → REJECT ────────────────────────────────────────
  test('PIN-GT10', 'wallpaper_installation_visible = true → REJECT service_visual_mismatch', () => {
    const gate = SERVICE_VISUAL_GATE_RULES['Peinture intérieure'];
    const conditions = gate.reject_conditions_by_access?.GROUND_LEVEL_INTERIOR_WALL_ROLLER || gate.reject_conditions;
    const c = conditions.find(cc => cc.field === 'wallpaper_installation_visible' && cc.value === true);
    assert(c, 'wallpaper_installation_visible=true must be a reject condition');
  });

  // ─── PIN-GT11: decorative plaster → REJECT ───────────────────────────────
  test('PIN-GT11', 'decorative_plaster_application_visible = true → REJECT service_visual_mismatch', () => {
    const gate = SERVICE_VISUAL_GATE_RULES['Peinture intérieure'];
    const conditions = gate.reject_conditions_by_access?.GROUND_LEVEL_INTERIOR_WALL_ROLLER || gate.reject_conditions;
    const c = conditions.find(cc => cc.field === 'decorative_plaster_application_visible' && cc.value === true);
    assert(c, 'decorative_plaster_application_visible=true must be a reject condition');
  });

  // ─── PIN-GT12: exterior context → REJECT ─────────────────────────────────
  test('PIN-GT12', 'exterior_context_visible = true → REJECT service_visual_mismatch', () => {
    const gate = SERVICE_VISUAL_GATE_RULES['Peinture intérieure'];
    const conditions = gate.reject_conditions_by_access?.GROUND_LEVEL_INTERIOR_WALL_ROLLER || gate.reject_conditions;
    const c = conditions.find(cc => cc.field === 'exterior_context_visible' && cc.value === true);
    assert(c, 'exterior_context_visible=true must be a reject condition');
  });

  // ─── PIN-GT13: facade painting → REJECT ──────────────────────────────────
  test('PIN-GT13', 'facade_painting_visible = true → REJECT service_visual_mismatch', () => {
    const gate = SERVICE_VISUAL_GATE_RULES['Peinture intérieure'];
    const conditions = gate.reject_conditions_by_access?.GROUND_LEVEL_INTERIOR_WALL_ROLLER || gate.reject_conditions;
    const c = conditions.find(cc => cc.field === 'facade_painting_visible' && cc.value === true);
    assert(c, 'facade_painting_visible=true must be a reject condition');
  });

  // ─── PIN-GT14: completed wall → REJECT ───────────────────────────────────
  test('PIN-GT14', 'completed_wall_dominant = true → REJECT state_mismatch', () => {
    const gate = SERVICE_VISUAL_GATE_RULES['Peinture intérieure'];
    const conditions = gate.reject_conditions_by_access?.GROUND_LEVEL_INTERIOR_WALL_ROLLER || gate.reject_conditions;
    const c = conditions.find(cc => cc.field === 'completed_wall_dominant' && cc.value === true);
    assert(c, 'completed_wall_dominant=true must be a reject condition');
    assert(c.reason === 'state_mismatch', `Expected state_mismatch, got ${c.reason}`);
  });

  // ─── PIN-GT15: worker on ladder → REJECT access_violation ────────────────
  test('PIN-GT15', 'worker_on_ladder = true → REJECT access_violation', () => {
    const gate = SERVICE_VISUAL_GATE_RULES['Peinture intérieure'];
    const conditions = gate.reject_conditions_by_access?.GROUND_LEVEL_INTERIOR_WALL_ROLLER || gate.reject_conditions;
    const c = conditions.find(cc => cc.field === 'worker_on_ladder' && cc.value === true);
    assert(c, 'worker_on_ladder=true must be a reject condition');
    assert(c.reason === 'access_violation', `Expected access_violation, got ${c.reason}`);
  });

  // ─── PIN-GT16: worker on step ladder → REJECT ────────────────────────────
  test('PIN-GT16', 'worker_on_step_ladder = true → REJECT access_violation', () => {
    const gate = SERVICE_VISUAL_GATE_RULES['Peinture intérieure'];
    const conditions = gate.reject_conditions_by_access?.GROUND_LEVEL_INTERIOR_WALL_ROLLER || gate.reject_conditions;
    const c = conditions.find(cc => cc.field === 'worker_on_step_ladder' && cc.value === true);
    assert(c, 'worker_on_step_ladder=true must be a reject condition');
    assert(c.reason === 'access_violation', `Expected access_violation, got ${c.reason}`);
  });

  // ─── PIN-GT17: worker on furniture → REJECT ──────────────────────────────
  test('PIN-GT17', 'worker_standing_on_furniture = true → REJECT access_violation', () => {
    const gate = SERVICE_VISUAL_GATE_RULES['Peinture intérieure'];
    const conditions = gate.reject_conditions_by_access?.GROUND_LEVEL_INTERIOR_WALL_ROLLER || gate.reject_conditions;
    const c = conditions.find(cc => cc.field === 'worker_standing_on_furniture' && cc.value === true);
    assert(c, 'worker_standing_on_furniture=true must be a reject condition');
    assert(c.reason === 'access_violation', `Expected access_violation, got ${c.reason}`);
  });

  // ─── PIN-GT18: interior_room_visible = null → structured_evidence_incomplete
  test('PIN-GT18', 'interior_room_visible = null → not_exactly_true REJECT (structured_evidence_incomplete)', () => {
    const gate = SERVICE_VISUAL_GATE_RULES['Peinture intérieure'];
    const conditions = gate.reject_conditions_by_access?.GROUND_LEVEL_INTERIOR_WALL_ROLLER || gate.reject_conditions;
    const c = conditions.find(cc => cc.field === 'interior_room_visible' && cc.not_exactly_true);
    assert(c, 'interior_room_visible not_exactly_true must be a reject condition');
    // null !== true → reject fires (structured_evidence_incomplete in practice)
    const obj = { interior_room_visible: null };
    const fires = obj[c.field] !== true;
    assert(fires, 'null should trigger not_exactly_true rejection');
  });

  // ─── PIN-WP1: resolver stamps _planned_worker_count = 1 ──────────────────
  test('PIN-WP1', 'resolver stamps _planned_worker_count = 1 for Peinture cuisine', () => {
    const result = resolveScene('Peinture cuisine', 'encours');
    assert(result._planned_worker_count === 1,
      `Expected 1, got ${result._planned_worker_count}`);
  });

  // ─── PIN-WP2: planner produces _pre_assigned_worker_count = 1 ────────────
  test('PIN-WP2', 'worker planner produces _pre_assigned_worker_count = 1 from state-lock', () => {
    const resolved = resolveScene('Peinture couloir', 'encours');
    const task = { _planBase: resolved, _pre_assigned_composition: 'medium_intervention' };
    _planBatchWorkerPresence([task], 42);
    assert(task._pre_assigned_worker_count === 1,
      `Expected 1, got ${task._pre_assigned_worker_count}`);
    assert(task._pre_assigned_worker_presence === 'workers',
      `Expected workers, got ${task._pre_assigned_worker_presence}`);
  });

  // ─── PIN-WP3: 20 seeds all produce count = 1 ─────────────────────────────
  test('PIN-WP3', '20 seeds all produce _pre_assigned_worker_count = 1', () => {
    for (let seed = 0; seed < 20; seed++) {
      const resolved = resolveScene('Peinture salon', 'encours');
      const task = { _planBase: resolved, _pre_assigned_composition: 'medium_intervention' };
      _planBatchWorkerPresence([task], seed);
      assert(task._pre_assigned_worker_count === 1,
        `Seed ${seed}: Expected count=1, got ${task._pre_assigned_worker_count}`);
    }
  });

  // ─── PIN-WP4: enforce-minimum skips state-locked tasks ───────────────────
  test('PIN-WP4', 'enforce-minimum does not override state-locked count=1', () => {
    // Even when the composition roll would normally give none, state-lock must win
    const resolved = resolveScene('Peinture chambre', 'encours');
    const tasks = Array.from({ length: 5 }, () => ({
      _planBase: resolved, _pre_assigned_composition: 'close_detail',
    }));
    _planBatchWorkerPresence(tasks, 0);
    for (const t of tasks) {
      assert(t._pre_assigned_worker_count === 1,
        `State-lock count overridden by enforce-minimum — got ${t._pre_assigned_worker_count}`);
    }
  });

  // ─── PIN-WP5: _resolveServiceSetting = interior ───────────────────────────
  test('PIN-WP5', '_resolveServiceSetting returns interior for all 5 services', () => {
    for (const svc of INTERIOR_WALL_SERVICES) {
      const setting = _resolveServiceSetting('peinture', svc, 'exterior');
      assert(setting === 'interior',
        `Expected interior for "${svc}", got ${setting}`);
    }
  });

  // ─── PIN-PR1: workers/people absent from Never include ───────────────────
  test('PIN-PR1', 'prompt: workers/people absent from "Never include" section', () => {
    const prompt = buildInteriorWallPrompt('Peinture intérieure');
    // Extract the "Never include:" section
    const neverIdx = prompt.indexOf('Never include:');
    assert(neverIdx !== -1, 'Prompt must contain "Never include:" section');
    const neverSection = prompt.slice(neverIdx);
    assert(!/\bworkers\b/.test(neverSection),
      `"workers" must not appear in Never include — found in: ${neverSection.slice(0, 200)}`);
    assert(!/\bpeople\b/.test(neverSection),
      `"people" must not appear in Never include — found in: ${neverSection.slice(0, 200)}`);
  });

  // ─── PIN-PR2: One tradesperson present in prompt ──────────────────────────
  test('PIN-PR2', 'prompt: "One tradesperson" present in worker instruction', () => {
    const prompt = buildInteriorWallPrompt('Peinture salon');
    assert(/one tradesperson/i.test(prompt),
      `"One tradesperson" must appear in the prompt — not found`);
  });

  // ─── PIN-PR3: Never include has ladder, scaffold, ceiling, exterior ────────
  test('PIN-PR3', 'prompt: Never include has ladder/scaffold/ceiling painting/exterior exclusions', () => {
    const prompt = buildInteriorWallPrompt('Peinture chambre');
    const neverIdx = prompt.indexOf('Never include:');
    assert(neverIdx !== -1, 'Prompt must contain "Never include:" section');
    // No slice limit — the scaffold item is item 10 in a long list
    const neverSection = prompt.slice(neverIdx);
    assert(/ladder/.test(neverSection),   `"ladder" must appear in Never include`);
    assert(/scaffold/.test(neverSection), `"scaffold" must appear in Never include`);
    assert(/ceiling/.test(neverSection) || /plafond/.test(neverSection),
      `ceiling painting exclusion must appear in Never include`);
    assert(/exterior/.test(neverSection) || /facade/.test(neverSection),
      `exterior/facade exclusion must appear in Never include`);
    assert(/wallpaper/.test(neverSection),
      `"wallpaper" must appear in Never include`);
  });

  // ─── PIN-PR4: scene_reset_exclude isolation — does not pollute shared state ─
  // Verify that resolving an interior wall service (which triggers scene_reset_exclude)
  // does not mutate the exclude of a subsequently resolved independent service.
  // Uses Peinture extérieure (exterior scenario, no scene_reset_exclude) as the probe.
  test('PIN-PR4', 'scene_reset_exclude isolation: resolving interior wall does not affect other services', () => {
    const extObj = () => ({
      _matched_key:     'peinture',
      _matched_service: 'Peinture extérieure',
      state_level:      'encours',
      contexte:         'maison_individuelle',
      exclude:          ['sentinel-ext'],
    });

    // Resolve exterior service twice — independently
    const extBefore = JSON.parse(_applySiteRealism(JSON.stringify(extObj()), 0));

    // Now resolve interior wall (triggers scene_reset_exclude on its own obj)
    const interiorObj = {
      _matched_key:     'peinture',
      _matched_service: 'Peinture salon',
      state_level:      'encours',
      contexte:         'maison_individuelle',
      exclude:          ['workers', 'people'],
    };
    JSON.parse(_applySiteRealism(JSON.stringify(interiorObj), 0));

    // Exterior resolution after interior must produce same result as before
    const extAfter = JSON.parse(_applySiteRealism(JSON.stringify(extObj()), 0));

    assert(
      JSON.stringify(extBefore.exclude.sort()) === JSON.stringify(extAfter.exclude.sort()),
      `Exterior exclude changed after resolving interior wall (isolation breach): before=${JSON.stringify(extBefore.exclude)}, after=${JSON.stringify(extAfter.exclude)}`
    );

    // Also verify interior wall workers/people exclusion reset does not propagate to exterior
    assert(extAfter.exclude.includes('sentinel-ext'),
      `sentinel-ext was wiped from exterior service — scene_reset_exclude leaked across services`);
  });

  // ─── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n--- PIN: ${_pass}/${_pass + _fail} ---\n`);
  console.groupEnd();
  return { pass: _pass, fail: _fail, results: _results };
}
