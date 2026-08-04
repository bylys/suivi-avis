/**
 * debug/plafond-tests.js — Peinture plafond structured workflow tests
 *
 * PLA-SL1..5   : state-lock resolution (service-resolver)
 * PLA-AC1..4   : access configuration stamping
 * PLA-GT1..18  : gate field / reject / pass logic
 * PLA-WP1..5   : worker propagation (planner → resolver → prompt count)
 * PLA-PR1..4   : prompt text — exclude list, worker instruction, scene_reset_exclude isolation
 *
 * Security: zero real API calls. Loaded only when ?imageGenTests=1.
 */

import { _applySiteRealism, _resolveServiceSetting }  from '../resolution/service-resolver.js';
import { _applyVariation }                             from '../resolution/scene-resolver.js';
import { SERVICE_VISUAL_GATE_RULES, _SERVICE_GATE_ALIASES } from '../safety/safety-rules.js';
import { _planBatchWorkerPresence }                    from '../planning/worker-planner.js';
import { PromptBuilder }                               from '../prompt/prompt-builder.js';
import { SITE_REALISM }                                from '../services/index.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveScene(service_label, state_level) {
  const so = {
    _matched_key:     'peinture',
    _matched_service: service_label,
    state_level,
    contexte:         'maison_individuelle',
  };
  return JSON.parse(_applySiteRealism(JSON.stringify(so), 0));
}

function evalGate(fields) {
  const aliasKey  = _SERVICE_GATE_ALIASES['peinture plafond'] || 'Peinture plafond';
  const gate      = SERVICE_VISUAL_GATE_RULES[aliasKey];
  if (!gate) return { ok: false, reason: 'gate_not_found' };

  // mandatory_fields must all be boolean
  for (const mf of (gate.mandatory_fields || [])) {
    if (typeof fields[mf] !== 'boolean') {
      return { ok: false, reason: 'structured_evidence_incomplete', field: mf };
    }
  }

  // reject_conditions
  for (const cond of (gate.reject_conditions || [])) {
    if (cond.value !== undefined && fields[cond.field] === cond.value)
      return { ok: false, reason: cond.reason, field: cond.field };
    if (cond.not_exactly_true && fields[cond.field] !== true)
      return { ok: false, reason: cond.reason, field: cond.field };
  }

  return { ok: true };
}

function makePassFields(overrides = {}) {
  return {
    interior_ceiling_visible:                            true,
    ceiling_plane_dominant:                              true,
    active_ceiling_roller_contact_visible:               true,
    extension_pole_visible:                              true,
    partial_painted_and_unpainted_ceiling_zones_visible: true,
    paint_tray_or_bucket_visible:                        true,
    floor_drop_cloth_visible:                            true,
    worker_stable_on_floor:                              true,
    wall_painting_dominant:                              false,
    completed_ceiling_dominant:                          false,
    exterior_context_visible:                            false,
    facade_painting_visible:                             false,
    worker_on_ladder:                                    false,
    worker_on_step_ladder:                               false,
    worker_on_scaffold:                                  false,
    spray_painting_dominant:                             false,
    service_visual_match:                                true,
    worker_count_matches_plan:                           true,
    ...overrides,
  };
}

// ─── Test runner ─────────────────────────────────────────────────────────────

let _pass = 0, _fail = 0;
const _results = [];

function test(id, label, fn) {
  try {
    fn();
    _pass++;
    _results.push({ ok: true,  label: `${id}: ${label}` });
    console.log(`  ✔ ${id}: ${label}`);
  } catch (e) {
    _fail++;
    _results.push({ ok: false, label: `${id}: ${label}`, error: e.message });
    console.error(`  ✘ ${id}: ${label} — ${e.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// ─── PLA-SL: State-lock resolution ───────────────────────────────────────────

export function runPlafondTests() {
  console.group('[PLA] Peinture plafond tests');

  // PLA-SL1: Peinture plafond + encours → state-lock used, correct visual family
  test('PLA-SL1', 'Peinture plafond + encours → state_lock_used=true, PEINTURE-CEILING-ROLLER-INTERIOR', () => {
    const r = resolveScene('Peinture plafond', 'encours');
    assert(r._state_lock_used === true,
      `Expected _state_lock_used=true, got ${r._state_lock_used}`);
    assert(r._visual_family === 'PEINTURE-CEILING-ROLLER-INTERIOR',
      `Expected PEINTURE-CEILING-ROLLER-INTERIOR, got ${r._visual_family}`);
  });

  // PLA-SL2: state-lock pool size = 1 (single scenario for this exact service+state)
  test('PLA-SL2', 'state_lock_pool_size=1', () => {
    const r = resolveScene('Peinture plafond', 'encours');
    assert(r._state_lock_pool_size === 1,
      `Expected _state_lock_pool_size=1, got ${r._state_lock_pool_size}`);
  });

  // PLA-SL3: planned_worker_count stamped = 1
  test('PLA-SL3', '_planned_worker_count=1 stamped by resolver', () => {
    const r = resolveScene('Peinture plafond', 'encours');
    assert(r._planned_worker_count === 1,
      `Expected _planned_worker_count=1, got ${r._planned_worker_count}`);
  });

  // PLA-SL4: setting = interior
  test('PLA-SL4', 'setting=interior from state-lock', () => {
    const r = resolveScene('Peinture plafond', 'encours');
    assert(r.setting === 'interior',
      `Expected setting=interior, got ${r.setting}`);
  });

  // PLA-SL5: Non-matching services do NOT enter state-lock
  const nonMatching = [
    'Peinture intérieure', 'Peinture salon', 'Peinture chambre',
    'Peinture cuisine', 'Peinture couloir', 'Papier peint',
    'Peinture extérieure', 'Peinture façade',
  ];
  for (const svc of nonMatching) {
    test('PLA-SL5', `"${svc}" + encours does NOT resolve to PEINTURE-CEILING-ROLLER-INTERIOR`, () => {
      const r = resolveScene(svc, 'encours');
      assert(r._visual_family !== 'PEINTURE-CEILING-ROLLER-INTERIOR',
        `"${svc}" should not resolve to PEINTURE-CEILING-ROLLER-INTERIOR but got ${r._visual_family}`);
    });
  }

  // ─── PLA-AC: Access configuration ─────────────────────────────────────────

  test('PLA-AC1', '_access_configuration=GROUND_LEVEL_CEILING_ROLLER', () => {
    const r = resolveScene('Peinture plafond', 'encours');
    assert(r._access_configuration === 'GROUND_LEVEL_CEILING_ROLLER',
      `Expected GROUND_LEVEL_CEILING_ROLLER, got ${r._access_configuration}`);
  });

  test('PLA-AC2', '_access_configuration_source=state_lock', () => {
    const r = resolveScene('Peinture plafond', 'encours');
    assert(r._access_configuration_source === 'state_lock',
      `Expected state_lock, got ${r._access_configuration_source}`);
  });

  test('PLA-AC3', '_access_configuration_randomized=false', () => {
    const r = resolveScene('Peinture plafond', 'encours');
    assert(r._access_configuration_randomized === false,
      `Expected false, got ${r._access_configuration_randomized}`);
  });

  test('PLA-AC4', 'exclude does NOT contain "workers" or "people" after scene_reset_exclude', () => {
    const r = resolveScene('Peinture plafond', 'encours');
    const excl = r.exclude || [];
    assert(!excl.includes('workers'),
      `"workers" found in exclude after scene_reset_exclude: [${excl.join(', ')}]`);
    assert(!excl.includes('people'),
      `"people" found in exclude after scene_reset_exclude: [${excl.join(', ')}]`);
  });

  // ─── PLA-GT: Gate logic ────────────────────────────────────────────────────

  test('PLA-GT1', 'gate alias "peinture plafond" → Peinture plafond', () => {
    const resolved = _SERVICE_GATE_ALIASES['peinture plafond'];
    assert(resolved === 'Peinture plafond',
      `Expected 'Peinture plafond', got ${resolved}`);
  });

  test('PLA-GT2', 'gate alias "peinture de plafond" → Peinture plafond', () => {
    const resolved = _SERVICE_GATE_ALIASES['peinture de plafond'];
    assert(resolved === 'Peinture plafond',
      `Expected 'Peinture plafond', got ${resolved}`);
  });

  test('PLA-GT3', 'gate alias "peindre plafond" → Peinture plafond', () => {
    const resolved = _SERVICE_GATE_ALIASES['peindre plafond'];
    assert(resolved === 'Peinture plafond',
      `Expected 'Peinture plafond', got ${resolved}`);
  });

  test('PLA-GT4', 'SERVICE_VISUAL_GATE_RULES["Peinture plafond"] exists with 18 mandatory_fields', () => {
    const gate = SERVICE_VISUAL_GATE_RULES['Peinture plafond'];
    assert(gate !== undefined, 'Gate not found');
    assert(gate.mandatory_fields?.length === 18,
      `Expected 18 mandatory_fields, got ${gate.mandatory_fields?.length}`);
  });

  test('PLA-GT5', 'all mandatory_fields are boolean in a PASS payload', () => {
    const fields = makePassFields();
    const gate = SERVICE_VISUAL_GATE_RULES['Peinture plafond'];
    for (const mf of gate.mandatory_fields) {
      assert(typeof fields[mf] === 'boolean', `Field ${mf} is not boolean in pass payload`);
    }
  });

  test('PLA-GT6', 'full PASS payload → gate passes', () => {
    const r = evalGate(makePassFields());
    assert(r.ok === true, `Expected PASS, got ${JSON.stringify(r)}`);
  });

  test('PLA-GT7', 'wall_painting_dominant=true → REJECT service_visual_mismatch', () => {
    const r = evalGate(makePassFields({ wall_painting_dominant: true }));
    assert(r.ok === false && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got ${JSON.stringify(r)}`);
  });

  test('PLA-GT8', 'completed_ceiling_dominant=true → REJECT state_mismatch', () => {
    const r = evalGate(makePassFields({ completed_ceiling_dominant: true }));
    assert(r.ok === false && r.reason === 'state_mismatch',
      `Expected state_mismatch, got ${JSON.stringify(r)}`);
  });

  test('PLA-GT9', 'exterior_context_visible=true → REJECT service_visual_mismatch', () => {
    const r = evalGate(makePassFields({ exterior_context_visible: true }));
    assert(r.ok === false && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got ${JSON.stringify(r)}`);
  });

  test('PLA-GT10', 'facade_painting_visible=true → REJECT service_visual_mismatch', () => {
    const r = evalGate(makePassFields({ facade_painting_visible: true }));
    assert(r.ok === false && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got ${JSON.stringify(r)}`);
  });

  test('PLA-GT11', 'worker_on_ladder=true → REJECT access_violation', () => {
    const r = evalGate(makePassFields({ worker_on_ladder: true }));
    assert(r.ok === false && r.reason === 'access_violation',
      `Expected access_violation, got ${JSON.stringify(r)}`);
  });

  test('PLA-GT12', 'worker_on_step_ladder=true → REJECT access_violation', () => {
    const r = evalGate(makePassFields({ worker_on_step_ladder: true }));
    assert(r.ok === false && r.reason === 'access_violation',
      `Expected access_violation, got ${JSON.stringify(r)}`);
  });

  test('PLA-GT13', 'worker_on_scaffold=true → REJECT access_violation', () => {
    const r = evalGate(makePassFields({ worker_on_scaffold: true }));
    assert(r.ok === false && r.reason === 'access_violation',
      `Expected access_violation, got ${JSON.stringify(r)}`);
  });

  test('PLA-GT14', 'spray_painting_dominant=true → REJECT service_visual_mismatch', () => {
    const r = evalGate(makePassFields({ spray_painting_dominant: true }));
    assert(r.ok === false && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got ${JSON.stringify(r)}`);
  });

  test('PLA-GT15', 'interior_ceiling_visible=false → REJECT service_visual_mismatch', () => {
    const r = evalGate(makePassFields({ interior_ceiling_visible: false }));
    assert(r.ok === false && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got ${JSON.stringify(r)}`);
  });

  test('PLA-GT16', 'extension_pole_visible=false → REJECT service_visual_mismatch', () => {
    const r = evalGate(makePassFields({ extension_pole_visible: false }));
    assert(r.ok === false && r.reason === 'service_visual_mismatch',
      `Expected service_visual_mismatch, got ${JSON.stringify(r)}`);
  });

  test('PLA-GT17', 'null field → structured_evidence_incomplete REJECT', () => {
    const r = evalGate(makePassFields({ interior_ceiling_visible: null }));
    assert(r.ok === false && r.reason === 'structured_evidence_incomplete',
      `Expected structured_evidence_incomplete, got ${JSON.stringify(r)}`);
  });

  test('PLA-GT18', 'worker_count_matches_plan=false → REJECT worker_count_mismatch', () => {
    const r = evalGate(makePassFields({ worker_count_matches_plan: false }));
    assert(r.ok === false && r.reason === 'worker_count_mismatch',
      `Expected worker_count_mismatch, got ${JSON.stringify(r)}`);
  });

  // ─── PLA-WP: Worker propagation ────────────────────────────────────────────

  // PLA-WP1: resolver stamps _planned_worker_count=1
  test('PLA-WP1', 'resolver stamps _planned_worker_count=1', () => {
    const r = resolveScene('Peinture plafond', 'encours');
    assert(Number.isInteger(r._planned_worker_count) && r._planned_worker_count === 1,
      `Expected integer 1, got ${r._planned_worker_count}`);
  });

  // PLA-WP2: planner produces _pre_assigned_worker_count=1 from state-lock
  test('PLA-WP2', 'planner: _pre_assigned_worker_count=1 from state-lock', () => {
    const resolved = resolveScene('Peinture plafond', 'encours');
    const task = {
      taskId:                      0,
      _planBase:                   resolved,
      _pre_assigned_composition:   'medium_intervention',
    };
    _planBatchWorkerPresence([task], 0);
    assert(task._pre_assigned_worker_count === 1,
      `Expected 1, got ${task._pre_assigned_worker_count}`);
    assert(task._pre_assigned_worker_presence === 'workers',
      `Expected 'workers', got ${task._pre_assigned_worker_presence}`);
  });

  // PLA-WP3: 20 seeds → always exactly 1 worker, presence='workers'
  test('PLA-WP3', '20 seeds all produce exactly 1 worker', () => {
    const resolved = resolveScene('Peinture plafond', 'encours');
    for (let seed = 0; seed < 20; seed++) {
      const task = {
        taskId:                    seed,
        _planBase:                 resolved,
        _pre_assigned_composition: 'medium_intervention',
      };
      _planBatchWorkerPresence([task], seed);
      assert(task._pre_assigned_worker_count === 1,
        `seed ${seed}: expected count=1, got ${task._pre_assigned_worker_count}`);
      assert(task._pre_assigned_worker_presence === 'workers',
        `seed ${seed}: expected presence='workers', got ${task._pre_assigned_worker_presence}`);
    }
  });

  // PLA-WP4: state-lock is not overridden by enforce-minimum loop
  test('PLA-WP4', 'enforce-minimum loop skips state-locked tasks', () => {
    const resolved = resolveScene('Peinture plafond', 'encours');
    // Build a group of 3 tasks — first is state-locked, others are generic
    const tasks = [
      { taskId: 0, _planBase: resolved,                                 _pre_assigned_composition: 'medium_intervention' },
      { taskId: 1, _planBase: { _matched_key: 'peinture' },            _pre_assigned_composition: 'close_detail' },
      { taskId: 2, _planBase: { _matched_key: 'peinture' },            _pre_assigned_composition: 'close_detail' },
    ];
    _planBatchWorkerPresence(tasks, 99);
    assert(tasks[0]._pre_assigned_worker_count === 1,
      `State-locked task should remain count=1, got ${tasks[0]._pre_assigned_worker_count}`);
  });

  // PLA-WP5: _resolveServiceSetting('peinture', 'Peinture plafond') = 'interior'
  test('PLA-WP5', '_resolveServiceSetting(peinture, Peinture plafond) = interior', () => {
    const s = _resolveServiceSetting('peinture', 'Peinture plafond', 'exterior');
    assert(s === 'interior',
      `Expected interior, got ${s}`);
  });

  // ─── PLA-PR: Prompt text verification ────────────────────────────────────────

  // Helper: build full prompt text for Peinture plafond encours with workers
  function buildPlafondPrompt() {
    const resolved = resolveScene('Peinture plafond', 'encours');
    resolved._pre_assigned_worker_count = 1;
    const varied = _applyVariation(JSON.stringify(resolved), 0, 'workers');
    return PromptBuilder.build(varied);
  }

  // PLA-PR1: "workers" and "people" absent from Never include section;
  //          "One tradesperson" instruction present
  test('PLA-PR1', 'prompt: "workers"/"people" absent from Never include, "One tradesperson" present', () => {
    const prompt = buildPlafondPrompt();
    // "Never include" line must not contain "workers" or "people"
    const neverLine = prompt.split('\n').find(l => l.startsWith('Never include:')) || '';
    assert(!neverLine.toLowerCase().includes('workers'),
      `"workers" found in Never include line: "${neverLine}"`);
    assert(!neverLine.toLowerCase().includes('people'),
      `"people" found in Never include line: "${neverLine}"`);
    // Worker instruction must be present
    assert(prompt.includes('One tradesperson') || prompt.includes('One painter') || /[Oo]ne .+tradesperson/.test(prompt),
      `"One tradesperson" instruction not found in prompt`);
  });

  // PLA-PR2: Never include explicitly lists ladder, stepladder, scaffold,
  //          exterior painting / facade / wall painting dominant
  test('PLA-PR2', 'prompt Never include: ladder, scaffold, exterior painting, facade, wall painting', () => {
    const prompt = buildPlafondPrompt();
    const neverLine = prompt.split('\n').find(l => l.startsWith('Never include:')) || prompt;
    const nl = neverLine.toLowerCase();
    assert(nl.includes('ladder'),          `"ladder" missing from Never include: "${neverLine}"`);
    assert(nl.includes('scaffold'),        `"scaffold" missing from Never include: "${neverLine}"`);
    assert(nl.includes('exterior'),        `"exterior" missing from Never include: "${neverLine}"`);
    assert(nl.includes('facade'),          `"facade" missing from Never include: "${neverLine}"`);
    assert(nl.includes('wall painting'),   `"wall painting" missing from Never include: "${neverLine}"`);
  });

  // PLA-PR3: A peinture scenario WITHOUT scene_reset_exclude preserves
  //          pre-existing exclude entries intact
  test('PLA-PR3', 'no scene_reset_exclude → pre-existing exclude entries preserved', () => {
    const so = {
      _matched_key:     'peinture',
      _matched_service: 'Peinture intérieure',
      state_level:      'encours',
      contexte:         'maison_individuelle',
      exclude:          ['workers', 'people', 'sentinel_marker'],
    };
    const r = JSON.parse(_applySiteRealism(JSON.stringify(so), 0));
    const excl = r.exclude || [];
    assert(excl.includes('workers'),
      `"workers" was removed from exclude without scene_reset_exclude`);
    assert(excl.includes('people'),
      `"people" was removed from exclude without scene_reset_exclude`);
    assert(excl.includes('sentinel_marker'),
      `"sentinel_marker" was removed from exclude without scene_reset_exclude`);
  });

  // PLA-PR4: scene_reset_exclude on Peinture plafond does NOT affect other
  //          peinture services resolved in the same context
  test('PLA-PR4', 'scene_reset_exclude scoped: Peinture salon exclude unchanged after Peinture plafond resolution', () => {
    // Resolve plafond — this must NOT mutate any shared state
    resolveScene('Peinture plafond', 'encours');

    // Now resolve Peinture salon with pre-seeded exclude — must survive intact
    const so = {
      _matched_key:     'peinture',
      _matched_service: 'Peinture salon',
      state_level:      'encours',
      contexte:         'maison_individuelle',
      exclude:          ['workers', 'people'],
    };
    const r = JSON.parse(_applySiteRealism(JSON.stringify(so), 1));
    const excl = r.exclude || [];
    assert(excl.includes('workers'),
      `"workers" missing from Peinture salon exclude after Peinture plafond was resolved — shared state mutation`);
    assert(excl.includes('people'),
      `"people" missing from Peinture salon exclude after Peinture plafond was resolved — shared state mutation`);
  });

  console.log(`\n--- PLA: ${_pass}/${_pass + _fail} ---\n`);
  console.groupEnd();
  return { pass: _pass, fail: _fail, results: _results };
}
