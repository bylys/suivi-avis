/**
 * Peinture façade — no-cost test suite
 * Tests:
 *   PFA-SL1..4  : state-lock resolution (encours → PEINTURE-FACADE-MASONRY-ROLLER-EXTERIOR)
 *   PFA-IS1..3  : isolation — encours lock absent for debut/semifinal/final
 *   PFA-AC1..5  : anti-collision — généric extérieur / volets / portail / clôture / enduit décoratif
 *   PFA-GT1..8  : generic gate reject_conditions
 *   PFA-AC1G..3G: access gate GROUND_LEVEL_FACADE_ROLLER_EXTENSION ladder/scaffold rejections
 *   PFA-MF1     : mandatory_fields — null field → structured_evidence_incomplete
 *   PFA-AL1..2  : alias resolution + condition counts
 *   PFA-RG1..2  : regression — metier ravalement, Peinture façade, gate compatible
 *   PFA-TL1     : telemetry — 20 gate fields present in run-batch SAFETY TELEMETRY
 *   PFA-WP1..4  : worker planning — planned_worker_count=1 stamped
 *   PFA-PR1..4  : prompt PromptBuilder — One tradesperson, 8 exclusions, no workers/people in Never include
 */

const { _applySiteRealism }                              = await import('../resolution/service-resolver.js?bust=pfa-v2');
const { _planBatchWorkerPresence }                       = await import('../planning/worker-planner.js?bust=pfa-v2');
const { SERVICE_VISUAL_GATE_RULES, _SERVICE_GATE_ALIASES } = await import('../safety/safety-rules.js?bust=pfa-v2');
const { PromptBuilder }                                  = await import('../prompt/prompt-builder.js?bust=pfa-v2');
const { _sanitizeSceneForPrompt }                        = await import('../pipeline/prompt-scene-sanitizer.js?bust=pfa-v2');

export async function runPfaTests() {
  console.group('PFA tests — Peinture façade scene-lock + gate');

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

  function resolvePeintureFacade(state_level, imageIndex = 0) {
    const so = {
      _matched_key:     'peinture',
      _matched_service: 'Peinture façade',
      state_level,
      contexte:         'maison_individuelle',
      exclude:          [],
    };
    return JSON.parse(_applySiteRealism(JSON.stringify(so), imageIndex));
  }

  function resolveService(matchedKey, matchedService, state_level, imageIndex = 0) {
    const so = {
      _matched_key:     matchedKey,
      _matched_service: matchedService,
      state_level,
      contexte:         'maison_individuelle',
      exclude:          [],
    };
    return JSON.parse(_applySiteRealism(JSON.stringify(so), imageIndex));
  }

  function evalGenericGate(fields) {
    const gate = SERVICE_VISUAL_GATE_RULES['Peinture façade'];
    if (!gate) throw new Error('Gate "Peinture façade" not found in SERVICE_VISUAL_GATE_RULES');
    const conditions = gate.reject_conditions;
    if (!conditions) throw new Error('reject_conditions not found on gate "Peinture façade"');
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

  function evalAccessGate(fields) {
    const gate = SERVICE_VISUAL_GATE_RULES['Peinture façade'];
    if (!gate) throw new Error('Gate "Peinture façade" not found in SERVICE_VISUAL_GATE_RULES');
    const conditions = gate.reject_conditions_by_access?.GROUND_LEVEL_FACADE_ROLLER_EXTENSION;
    if (!conditions) throw new Error('reject_conditions_by_access.GROUND_LEVEL_FACADE_ROLLER_EXTENSION not found');
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

  // ─── PFA-SL: State-lock resolution ─────────────────────────────────────────

  test('PFA-SL1', 'Peinture façade encours → state_lock_used=true', () => {
    const r = resolvePeintureFacade('encours');
    assert(r._state_lock_used === true, `_state_lock_used expected true, got ${r._state_lock_used}`);
  });

  test('PFA-SL2', 'Peinture façade encours → state_lock_pool_size=1', () => {
    const r = resolvePeintureFacade('encours');
    assert(r._state_lock_pool_size === 1, `_state_lock_pool_size expected 1, got ${r._state_lock_pool_size}`);
  });

  test('PFA-SL3', 'Peinture façade encours → _visual_family=PEINTURE-FACADE-MASONRY-ROLLER-EXTERIOR', () => {
    const r = resolvePeintureFacade('encours');
    assert(r._visual_family === 'PEINTURE-FACADE-MASONRY-ROLLER-EXTERIOR',
      `_visual_family expected PEINTURE-FACADE-MASONRY-ROLLER-EXTERIOR, got ${r._visual_family}`);
  });

  test('PFA-SL4', 'Peinture façade encours → _access_configuration=GROUND_LEVEL_FACADE_ROLLER_EXTENSION, source=state_lock', () => {
    const r = resolvePeintureFacade('encours');
    assert(r._access_configuration === 'GROUND_LEVEL_FACADE_ROLLER_EXTENSION',
      `_access_configuration expected GROUND_LEVEL_FACADE_ROLLER_EXTENSION, got ${r._access_configuration}`);
    assert(r._access_configuration_source === 'state_lock',
      `_access_configuration_source expected state_lock, got ${r._access_configuration_source}`);
  });

  // ─── PFA-IS: Isolation — autres états n'activent pas le state-lock ──────────

  test('PFA-IS1', 'Peinture façade debut → state_lock_used=false', () => {
    const r = resolvePeintureFacade('debut');
    assert(r._state_lock_used === false, `state_lock expected false for debut, got ${r._state_lock_used}`);
  });

  test('PFA-IS2', 'Peinture façade semifinal → state_lock_used=false', () => {
    const r = resolvePeintureFacade('semifinal');
    assert(r._state_lock_used === false, `state_lock expected false for semifinal, got ${r._state_lock_used}`);
  });

  test('PFA-IS3', 'Peinture façade final → state_lock_used=false', () => {
    const r = resolvePeintureFacade('final');
    assert(r._state_lock_used === false, `state_lock expected false for final, got ${r._state_lock_used}`);
  });

  // ─── PFA-AC: Anti-collision — services voisins ne triggent pas le state-lock

  test('PFA-AC1', 'Peinture extérieure encours → state_lock_used=false (regex ^peinture facade$ ne matche pas)', () => {
    const r = resolveService('peinture', 'Peinture extérieure', 'encours');
    assert(r._state_lock_used === false,
      `Peinture extérieure must not activate the facade state-lock, got _state_lock_used=${r._state_lock_used}`);
  });

  test('PFA-AC2', 'Peinture volets encours → state_lock_used=false', () => {
    const r = resolveService('peinture', 'Peinture volets', 'encours');
    assert(r._state_lock_used === false,
      `Peinture volets must not activate the facade state-lock, got _state_lock_used=${r._state_lock_used}`);
  });

  test('PFA-AC3', 'Peinture portail encours → state_lock_used=false', () => {
    const r = resolveService('peinture', 'Peinture portail', 'encours');
    assert(r._state_lock_used === false,
      `Peinture portail must not activate the facade state-lock, got _state_lock_used=${r._state_lock_used}`);
  });

  test('PFA-AC4', 'Peinture clôture encours → state_lock_used=false', () => {
    const r = resolveService('peinture', 'Peinture clôture', 'encours');
    assert(r._state_lock_used === false,
      `Peinture clôture must not activate the facade state-lock, got _state_lock_used=${r._state_lock_used}`);
  });

  test('PFA-AC5', 'Enduit décoratif encours → own INTERIOR lock, NOT the facade PFA family', () => {
    // Recovered Opus 4.8: Enduit décoratif now has its own interior state-lock
    // (PEINTURE-ENDUIT-DECORATIF-INTERIOR). It must NOT hijack the peinture-façade
    // PFA family (PEINTURE-FACADE-MASONRY-ROLLER-EXTERIOR).
    const r = resolveService('peinture', 'Enduit décoratif', 'encours');
    assert(r._visual_family === 'PEINTURE-ENDUIT-DECORATIF-INTERIOR',
      `Expected interior decorative-plaster family, got ${r._visual_family}`);
    assert(r._visual_family !== 'PEINTURE-FACADE-MASONRY-ROLLER-EXTERIOR',
      'Enduit décoratif must not activate the facade PFA state-lock');
  });

  // ─── PFA-GT: Generic gate reject_conditions ────────────────────────────────

  const PASS_FIELDS_GENERIC = {
    exterior_building_facade_visible:                 true,
    masonry_or_rendered_facade_surface_visible:       true,
    facade_surface_dominant:                          true,
    active_roller_contact_with_facade_visible:        true,
    extension_pole_visible:                           true,
    partial_painted_and_unpainted_facade_zones_visible: true,
    fresh_facade_paint_visible:                       true,
    paint_bucket_or_tray_visible:                     true,
    worker_stable_on_ground:                          true,
    shutters_or_shutter_panels_dominant:              false,
    gate_or_fence_dominant:                           false,
    exterior_woodwork_painting_dominant:              false,
    interior_context_visible:                         false,
    completed_facade_dominant:                        false,
    decorative_render_application_visible:            false,
    pressure_washing_visible:                         false,
    spray_painting_dominant:                          false,
    worker_on_ladder:                                 false,
    worker_on_step_ladder:                            false,
    worker_on_scaffold:                               false,
    service_visual_match:                             true,
    worker_count_match:                               true,
  };

  test('PFA-GT1', 'Façade maçonnée partiellement peinte + rouleau actif → gate générique PASS', () => {
    const r = evalGenericGate(PASS_FIELDS_GENERIC);
    assert(r.safe === true, `Expected PASS, got REJECT on ${r.first_failed} (${r.reason})`);
  });

  test('PFA-GT2', 'shutters_or_shutter_panels_dominant=true → REJECT service_visual_mismatch', () => {
    const r = evalGenericGate({ ...PASS_FIELDS_GENERIC, shutters_or_shutter_panels_dominant: true });
    assert(r.safe === false && r.reason === 'service_visual_mismatch',
      `Expected REJECT service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('PFA-GT3', 'gate_or_fence_dominant=true → REJECT service_visual_mismatch', () => {
    const r = evalGenericGate({ ...PASS_FIELDS_GENERIC, gate_or_fence_dominant: true });
    assert(r.safe === false && r.reason === 'service_visual_mismatch',
      `Expected REJECT service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('PFA-GT4', 'exterior_woodwork_painting_dominant=true → REJECT service_visual_mismatch', () => {
    const r = evalGenericGate({ ...PASS_FIELDS_GENERIC, exterior_woodwork_painting_dominant: true });
    assert(r.safe === false && r.reason === 'service_visual_mismatch',
      `Expected REJECT service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('PFA-GT5', 'completed_facade_dominant=true → REJECT service_visual_mismatch', () => {
    const r = evalGenericGate({ ...PASS_FIELDS_GENERIC, completed_facade_dominant: true });
    assert(r.safe === false && r.reason === 'service_visual_mismatch',
      `Expected REJECT service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('PFA-GT6', 'pressure_washing_visible=true → REJECT service_visual_mismatch', () => {
    const r = evalGenericGate({ ...PASS_FIELDS_GENERIC, pressure_washing_visible: true });
    assert(r.safe === false && r.reason === 'service_visual_mismatch',
      `Expected REJECT service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('PFA-GT7', 'interior_context_visible=true → REJECT service_visual_mismatch', () => {
    const r = evalGenericGate({ ...PASS_FIELDS_GENERIC, interior_context_visible: true });
    assert(r.safe === false && r.reason === 'service_visual_mismatch',
      `Expected REJECT service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  test('PFA-GT8', 'worker_stable_on_ground=false → REJECT access_violation', () => {
    const r = evalGenericGate({ ...PASS_FIELDS_GENERIC, worker_stable_on_ground: false });
    assert(r.safe === false && r.reason === 'access_violation',
      `Expected REJECT access_violation, got safe=${r.safe} reason=${r.reason}`);
  });

  // ─── PFA-AC1G..3G: Access gate GROUND_LEVEL_FACADE_ROLLER_EXTENSION ─────────

  const PASS_FIELDS_ACCESS = { ...PASS_FIELDS_GENERIC };

  test('PFA-AC1G', 'GROUND_LEVEL_FACADE_ROLLER_EXTENSION: façade OK + worker au sol → PASS', () => {
    const r = evalAccessGate(PASS_FIELDS_ACCESS);
    assert(r.safe === true, `Expected PASS, got REJECT on ${r.first_failed} (${r.reason})`);
  });

  test('PFA-AC2G', 'GROUND_LEVEL_FACADE_ROLLER_EXTENSION: worker_on_ladder=true → REJECT access_violation', () => {
    const r = evalAccessGate({ ...PASS_FIELDS_ACCESS, worker_on_ladder: true });
    assert(r.safe === false && r.reason === 'access_violation',
      `Expected REJECT access_violation, got safe=${r.safe} reason=${r.reason}`);
  });

  test('PFA-AC3G', 'GROUND_LEVEL_FACADE_ROLLER_EXTENSION: worker_on_step_ladder=true → REJECT access_violation', () => {
    const r = evalAccessGate({ ...PASS_FIELDS_ACCESS, worker_on_step_ladder: true });
    assert(r.safe === false && r.reason === 'access_violation',
      `Expected REJECT access_violation, got safe=${r.safe} reason=${r.reason}`);
  });

  test('PFA-AC4G', 'GROUND_LEVEL_FACADE_ROLLER_EXTENSION: worker_on_scaffold=true → REJECT access_violation', () => {
    const r = evalAccessGate({ ...PASS_FIELDS_ACCESS, worker_on_scaffold: true });
    assert(r.safe === false && r.reason === 'access_violation',
      `Expected REJECT access_violation, got safe=${r.safe} reason=${r.reason}`);
  });

  test('PFA-AC5G', 'GROUND_LEVEL_FACADE_ROLLER_EXTENSION: extension_pole_visible=false → REJECT service_visual_mismatch', () => {
    const r = evalAccessGate({ ...PASS_FIELDS_ACCESS, extension_pole_visible: false });
    assert(r.safe === false && r.reason === 'service_visual_mismatch',
      `Expected REJECT service_visual_mismatch, got safe=${r.safe} reason=${r.reason}`);
  });

  // ─── PFA-MF: Mandatory fields ───────────────────────────────────────────────

  test('PFA-MF1', 'mandatory_fields present on gate — champ null → structured_evidence_incomplete', () => {
    const gate = SERVICE_VISUAL_GATE_RULES['Peinture façade'];
    assert(Array.isArray(gate?.mandatory_fields) && gate.mandatory_fields.length > 0,
      'mandatory_fields must be a non-empty array on gate "Peinture façade"');
    assert(gate.mandatory_fields.includes('exterior_building_facade_visible'),
      'mandatory_fields must include exterior_building_facade_visible');
    assert(gate.mandatory_fields.includes('worker_stable_on_ground'),
      'mandatory_fields must include worker_stable_on_ground');
    assert(gate.mandatory_fields.includes('service_visual_match'),
      'mandatory_fields must include service_visual_match');
    assert(gate.mandatory_fields.includes('worker_count_match'),
      'mandatory_fields must include worker_count_match');
    assert(gate.mandatory_fields.includes('paint_bucket_or_tray_visible'),
      'mandatory_fields must include paint_bucket_or_tray_visible');
  });

  // ─── PFA-TL: Telemetry — tous les champs obligatoires de la gate présents dans run-batch ─────

  test('PFA-TL1', 'run-batch SAFETY TELEMETRY inclut les 20 champs de la gate Peinture façade', async () => {
    const runBatchSrc = await fetch('./src/image-generation/pipeline/run-batch.js').then(r => r.text());
    const REQUIRED = [
      'exterior_building_facade_visible',
      'masonry_or_rendered_facade_surface_visible',
      'facade_surface_dominant',
      'active_roller_contact_with_facade_visible',
      'extension_pole_visible',
      'partial_painted_and_unpainted_facade_zones_visible',
      'fresh_facade_paint_visible',
      'paint_bucket_or_tray_visible',
      'shutters_or_shutter_panels_dominant',
      'gate_or_fence_dominant',
      'exterior_woodwork_painting_dominant',
      'interior_context_visible',
      'completed_facade_dominant',
      'decorative_render_application_visible',
      'spray_painting_dominant',
      'worker_on_ladder',
      'worker_on_step_ladder',
      'worker_on_scaffold',
      'worker_stable_on_ground',
      'worker_count_match',
    ];
    for (const field of REQUIRED) {
      assert(runBatchSrc.includes(field),
        `run-batch.js SAFETY TELEMETRY missing field: ${field}`);
    }
  });

  // ─── PFA-AL: Alias resolution ───────────────────────────────────────────────

  test('PFA-AL1', 'Alias "peinture facade" → "Peinture façade" gate exists', () => {
    const canonical = _SERVICE_GATE_ALIASES['peinture facade'];
    assert(canonical === 'Peinture façade',
      `Expected "Peinture façade", got "${canonical}"`);
    assert(SERVICE_VISUAL_GATE_RULES[canonical] !== undefined,
      'Gate "Peinture façade" must exist in SERVICE_VISUAL_GATE_RULES');
  });

  test('PFA-AL2', 'Alias "peinture de facade" → "Peinture façade"; reject_conditions_by_access.GROUND_LEVEL has ≥5 conditions', () => {
    const canonical = _SERVICE_GATE_ALIASES['peinture de facade'];
    assert(canonical === 'Peinture façade',
      `Expected "Peinture façade", got "${canonical}"`);
    const gate = SERVICE_VISUAL_GATE_RULES['Peinture façade'];
    const conditions = gate?.reject_conditions_by_access?.GROUND_LEVEL_FACADE_ROLLER_EXTENSION;
    assert(Array.isArray(conditions) && conditions.length >= 5,
      `reject_conditions_by_access.GROUND_LEVEL_FACADE_ROLLER_EXTENSION must have ≥5 conditions, got ${conditions?.length}`);
  });

  // ─── PFA-RG: Régression Ravalement ────────────────────────────────────────

  test('PFA-RG1', 'metier=ravalement, Peinture façade encours → routing inchangé (state_lock_used=false, accès null)', () => {
    const r = resolveService('ravalement', 'Peinture façade', 'encours');
    assert(r._state_lock_used === false,
      `ravalement+Peinture façade must NOT use the peinture state-lock, got _state_lock_used=${r._state_lock_used}`);
    assert(!r._access_configuration || r._access_configuration === null,
      `ravalement+Peinture façade must have no _access_configuration, got ${r._access_configuration}`);
  });

  test('PFA-RG2', 'Gate "Peinture façade" generic conditions compatible avec scène ravalement valide', () => {
    const RAVA_PASS = {
      exterior_building_facade_visible:                 true,
      masonry_or_rendered_facade_surface_visible:       true,
      facade_surface_dominant:                          true,
      active_roller_contact_with_facade_visible:        true,
      extension_pole_visible:                           true,
      partial_painted_and_unpainted_facade_zones_visible: true,
      fresh_facade_paint_visible:                       true,
      paint_bucket_or_tray_visible:                     false,
      worker_stable_on_ground:                          true,
      shutters_or_shutter_panels_dominant:              false,
      gate_or_fence_dominant:                           false,
      exterior_woodwork_painting_dominant:              false,
      interior_context_visible:                         false,
      completed_facade_dominant:                        false,
      decorative_render_application_visible:            false,
      pressure_washing_visible:                         false,
      spray_painting_dominant:                          false,
      worker_on_ladder:                                 false,
      worker_on_step_ladder:                            false,
      worker_on_scaffold:                               false,
      service_visual_match:                             true,
      worker_count_match:                               true,
    };
    const r = evalGenericGate(RAVA_PASS);
    assert(r.safe === true,
      `ravalement valid scene must PASS generic gate, got REJECT on ${r.first_failed} (${r.reason})`);
  });

  // ─── PFA-WP: Worker planning ────────────────────────────────────────────────

  test('PFA-WP1', 'Peinture façade encours → _planned_worker_count=1 stamped by resolver', () => {
    const r = resolvePeintureFacade('encours');
    assert(r._planned_worker_count === 1,
      `_planned_worker_count expected 1, got ${r._planned_worker_count}`);
  });

  test('PFA-WP2', 'worker planner → _pre_assigned_worker_count=1 for encours', () => {
    const baseObj = resolvePeintureFacade('encours');
    const task = {
      taskId: 'pfa-wp2',
      _planBase: { ...baseObj, _matched_key: 'peinture', _matched_service: 'Peinture façade' },
    };
    const group = [task];
    _planBatchWorkerPresence(group, 'peinture');
    assert(task._pre_assigned_worker_count === 1,
      `_pre_assigned_worker_count expected 1, got ${task._pre_assigned_worker_count}`);
  });

  test('PFA-WP3', 'worker planner → _pre_assigned_worker_presence=workers for encours', () => {
    const baseObj = resolvePeintureFacade('encours');
    const task = {
      taskId: 'pfa-wp3',
      _planBase: { ...baseObj, _matched_key: 'peinture', _matched_service: 'Peinture façade' },
    };
    const group = [task];
    _planBatchWorkerPresence(group, 'peinture');
    assert(task._pre_assigned_worker_presence === 'workers',
      `_pre_assigned_worker_presence expected workers, got ${task._pre_assigned_worker_presence}`);
  });

  test('PFA-WP4', 'Peinture façade encours: 20 seeds → toujours _planned_worker_count=1', () => {
    for (let i = 0; i < 20; i++) {
      const r = resolvePeintureFacade('encours', i);
      assert(r._planned_worker_count === 1,
        `seed ${i}: _planned_worker_count expected 1, got ${r._planned_worker_count}`);
    }
  });

  // ─── PFA-PR: Prompt PromptBuilder — exclusions et présence worker ────────────

  function buildPfaPrompt(state_level = 'encours', imageIndex = 0) {
    const resolved = resolvePeintureFacade(state_level, imageIndex);
    const task = { taskId: 'pfa-pr', _planBase: { ...resolved, _matched_key: 'peinture', _matched_service: 'Peinture façade' } };
    _planBatchWorkerPresence([task], 'peinture');
    const sanitized = _sanitizeSceneForPrompt(JSON.stringify(resolved));
    return { prompt: PromptBuilder.build(sanitized), resolved };
  }

  test('PFA-PR1', 'Prompt encours contient "One tradesperson" (planned_worker_count=1, no_people=false)', () => {
    const { prompt, resolved } = buildPfaPrompt('encours');
    assert(!resolved.no_people,
      `no_people must be false/absent on encours scene, got ${resolved.no_people}`);
    assert(prompt.includes('One '),
      'Prompt must contain "One " (tradesperson). Got: ' + prompt.substring(0, 200));
  });

  test('PFA-PR2', 'Never include contient les 8 exclusions prioritaires (shutter, gate, woodwork, ladder, step ladder, scaffold, spray, interior)', () => {
    const { prompt } = buildPfaPrompt('encours');
    const neverInclude = prompt.match(/Never include: ([^.]+)\./)?.[1] ?? '';
    const checks = [
      ['shutter', 'shutters as the main subject'],
      ['gate or fence', 'gate or fence as the main subject'],
      ['exterior woodwork', 'exterior woodwork painting'],
      ['ladder', 'ladder'],
      ['step ladder', 'step ladder'],
      ['scaffold', 'scaffold'],
      ['spray painting', 'spray painting'],
      ['interior scene', 'interior scene'],
    ];
    for (const [needle, label] of checks) {
      assert(neverInclude.toLowerCase().includes(needle),
        `Never include must contain "${label}". Got: ${neverInclude}`);
    }
  });

  test('PFA-PR3', '"workers" et "people" absents de Never include (no_people=false → présence humaine requise)', () => {
    const { prompt } = buildPfaPrompt('encours');
    const neverInclude = prompt.match(/Never include: ([^.]+)\./)?.[1] ?? '';
    assert(!neverInclude.toLowerCase().includes('"workers"') && !neverInclude.toLowerCase().includes('"people"'),
      'workers / people must NOT appear in Never include. Got: ' + neverInclude);
    const standalone = neverInclude.split(';').map(s => s.trim().toLowerCase());
    assert(!standalone.includes('workers') && !standalone.includes('people'),
      'workers / people must NOT be standalone Never include entries. Got: ' + neverInclude);
  });

  test('PFA-PR4', 'Peinture extérieure non affectée par scene_reset_exclude (exclude non vidé)', () => {
    const soPext = {
      _matched_key:     'peinture',
      _matched_service: 'Peinture extérieure',
      state_level:      'encours',
      contexte:         'maison_individuelle',
      exclude:          ['test_sentinel'],
    };
    const rPext = JSON.parse(_applySiteRealism(JSON.stringify(soPext), 0));
    const sanitized = _sanitizeSceneForPrompt(JSON.stringify(rPext));
    const prompt = PromptBuilder.build(sanitized);
    assert(prompt.includes('test_sentinel'),
      `Peinture extérieure must not clear the exclude array (scene_reset_exclude=false). Got prompt excerpt: ${prompt.substring(0, 300)}`);
  });

  // ─── Summary ───────────────────────────────────────────────────────────────

  console.log(`\n--- PFA: ${_pass}/${_pass + _fail} ---\n`);
  console.groupEnd();
  return { pass: _pass, fail: _fail, results: _results };
}
