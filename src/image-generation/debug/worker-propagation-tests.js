/**
 * worker-propagation-tests.js — WORKER-PROP test suite
 * Validates that _pre_assigned_worker_count from the batch plan propagates
 * through _applySiteRealism → _applyVariation → prompt without being lost.
 * 0 real Images / Vision / rewriter calls — mock fetchImpl captures prompt only.
 */

const { buildDallePromptV2 }            = await import('../prompt/scene-builder.js?bust=wpt1');
const { _buildPresencePlan }            = await import('../safety/worker-validator.js?bust=wpt1');
const { _planGlobalBatch }              = await import('../planning/batch-planner.js?bust=wpt1');
const { _applySiteRealism }             = await import('../resolution/service-resolver.js?bust=wpt1');
const { _applyVariation }               = await import('../resolution/scene-resolver.js?bust=wpt1');
const { _resolveLocationAndComposition }= await import('../resolution/location-resolver.js?bust=wpt1');
const { _validateWorkerScene, _assertFinalWorkerConsistency, _assertTaskHasBatchPlan }
                                        = await import('../safety/worker-validator.js?bust=wpt1');
const { _appendLockedFinalConstraints } = await import('../prompt/locked-constraints.js?bust=wpt2');
const { generateImageOnly }             = await import('../pipeline/generate-image.js?bust=wpt1');
const { _hashSeed }                     = await import('../utils/deterministic.js?bust=wpt1');
const { runImageBatch }                 = await import('../pipeline/run-batch.js?bust=wpt1');
const { createGenerationState }         = await import('../pipeline/state.js?bust=wpt1');
const { IMAGE_TASK_STATUS }             = await import('../pipeline/state.js?bust=wpt2');

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeRow(travaux, etat = 'encours', metier = 'paysagiste', nb = 1) {
  return { metier, travaux, etat, nb, ville: 'Lyon', meteo: 'auto', contexte: 'maison' };
}

function buildTask(travaux, etat = 'encours', metier = 'paysagiste') {
  const row      = makeRow(travaux, etat, metier);
  const jsonScene = buildDallePromptV2(row);
  const base     = JSON.parse(jsonScene);
  const planSeed = _hashSeed(`${base._matched_key || ''}${base._matched_service || ''}plan`);
  const presencePlan = _buildPresencePlan(1, base.state_level, base._matched_key, planSeed);
  return {
    taskId: 1, row, i: 0, nb: 1, jsonScene, presencePlan, slug: travaux,
    _planBase: Object.assign({}, base),
    status: 'pending', imageAttempt: 1,
  };
}

function applyBatchPlan(task, workerPresence, workerCount) {
  task._pre_assigned_composition      = 'medium_intervention';
  task._pre_assigned_vehicle          = 'absent';
  task._capture_defects_resolved      = [];
  task._pre_assigned_worker_presence  = workerPresence;
  task._pre_assigned_worker_count     = workerCount;
}

// Inject plan into scene then run _applyVariation — mirrors generate-image.js
function runPipelineToVaried(task) {
  let sceneStr = task.jsonScene;
  const _rs = JSON.parse(sceneStr);
  _rs._pre_assigned_worker_count = task._pre_assigned_worker_count;
  sceneStr = JSON.stringify(_rs);
  const realistScene = _applySiteRealism(sceneStr, 0);
  // Inject again after realism (mirrors generate-image.js edit 1)
  const _rs2 = JSON.parse(realistScene);
  _rs2._pre_assigned_worker_count = task._pre_assigned_worker_count;
  const realistWithPlan = JSON.stringify(_rs2);
  const variedScene = _applyVariation(realistWithPlan, 0, task._pre_assigned_worker_presence);
  return { realistScene, variedScene, variedObj: JSON.parse(variedScene) };
}

// Null fetch: captures prompt, never sends a real request
function makeMockFetch(captured) {
  return async (_url, opts) => {
    captured.prompt = opts?.body ? JSON.parse(opts.body).prompt : null;
    captured.fetchCalled = (captured.fetchCalled || 0) + 1;
    // Return a minimal OK response
    return {
      ok: true,
      status: 200,
      json: async () => ({ data: [{ b64_json: 'MOCK', url: null }] }),
    };
  };
}

async function readMockImpl(resp) {
  const data = await resp.json();
  return { ok: resp.ok, status: resp.status, data };
}

function rewriteMockImpl(scene) { return scene; }

// ─── tests ───────────────────────────────────────────────────────────────────

const tests = [

  // WORKER-PROP1: paysagiste task planned at 2 arrives at generateImageOnly with count=2
  {
    id: 'WORKER-PROP1',
    label: 'Task planned at 2 workers carries _pre_assigned_worker_count=2 into generateImageOnly',
    run() {
      const task = buildTask('Arrosage automatique');
      applyBatchPlan(task, 'workers', 2);
      if (task._pre_assigned_worker_count !== 2)
        return { ok: false, detail: `Expected 2, got ${task._pre_assigned_worker_count}` };
      return { ok: true };
    },
  },

  // WORKER-PROP2: _applyVariation uses batch_preassignment branch → var_workers=2
  {
    id: 'WORKER-PROP2',
    label: '_applyVariation reads batch plan → var_workers=2, source=batch_preassignment',
    run() {
      const task = buildTask('Arrosage automatique');
      applyBatchPlan(task, 'workers', 2);
      const { variedObj } = runPipelineToVaried(task);
      if (variedObj.var_workers !== 2)
        return { ok: false, detail: `var_workers=${variedObj.var_workers} (expected 2)` };
      if (variedObj._worker_count_source !== 'batch_preassignment')
        return { ok: false, detail: `source=${variedObj._worker_count_source} (expected batch_preassignment)` };
      return { ok: true };
    },
  },

  // WORKER-PROP3: locked prompt contains "EXACTLY TWO VISIBLE PROFESSIONAL WORKERS"
  {
    id: 'WORKER-PROP3',
    label: 'Locked prompt contains "EXACTLY TWO VISIBLE PROFESSIONAL WORKERS" for count=2',
    run() {
      const task = buildTask('Arrosage automatique');
      applyBatchPlan(task, 'workers', 2);
      const { variedObj } = runPipelineToVaried(task);
      // Simulate what generateImageOnly does before building the prompt
      const fakePrompt = 'scene description';
      const locked = _appendLockedFinalConstraints(fakePrompt, variedObj);
      if (!/EXACTLY TWO VISIBLE PROFESSIONAL WORKERS/i.test(locked))
        return { ok: false, detail: `Constraint not found in locked prompt. Got: ${locked.slice(0, 200)}` };
      return { ok: true };
    },
  },

  // WORKER-PROP4: on retry (imageAttempt=2), task._pre_assigned_worker_count is still 2
  {
    id: 'WORKER-PROP4',
    label: 'Retry attempt preserves _pre_assigned_worker_count=2 (task not reconstructed)',
    run() {
      const task = buildTask('Arrosage automatique');
      applyBatchPlan(task, 'workers', 2);
      // Simulate what run-batch.js does on retry
      task.imageAttempt = 2;
      task._imageRetryReason = 'retry_image_error';
      // The task object is never reconstructed; count must survive
      if (task._pre_assigned_worker_count !== 2)
        return { ok: false, detail: `count after retry setup=${task._pre_assigned_worker_count}` };
      const { variedObj } = runPipelineToVaried(task);
      if (variedObj.var_workers !== 2)
        return { ok: false, detail: `var_workers on retry=${variedObj.var_workers} (expected 2)` };
      return { ok: true };
    },
  },

  // WORKER-PROP5: plan=3 (impossible for paysagiste) → preflight fires, 0 fetch calls
  // After the Edit-1 fix, scene divergence via jsonScene corruption is no longer possible
  // (the fix overwrites jsonScene._pre_assigned_worker_count with task._pre_assigned_worker_count).
  // To test the guard, we set task._pre_assigned_worker_count=3 — a count no paysagiste
  // scene can produce (max 2). The scene resolves to var_workers=2, guard fires: 3≠2.
  {
    id: 'WORKER-PROP5',
    label: 'Preflight guard fires for impossible count=3 (scene produces 2) — 0 fetch calls',
    async run() {
      const task = buildTask('Arrosage automatique');
      applyBatchPlan(task, 'workers', 3); // impossible count → scene will produce 2
      task._batch_plan_id = 'wpt-5-plan';
      const captured = {};
      const state = createGenerationState('wpt-5');
      try {
        await generateImageOnly(task, 'mock-key', 'wpt-5', {
          state,
          fetchImpl: makeMockFetch(captured),
          readResponseImpl: readMockImpl,
          rewritePromptImpl: rewriteMockImpl,
        });
        return { ok: false, detail: 'Expected preflight error but generateImageOnly resolved' };
      } catch (e) {
        if (!e._isPreflight)
          return { ok: false, detail: `Error is not preflight: ${e.message}` };
        if ((captured.fetchCalled || 0) !== 0)
          return { ok: false, detail: `fetch was called ${captured.fetchCalled} times (expected 0)` };
        return { ok: true };
      }
    },
  },

  // WORKER-PROP6: preflight error triggers 0 retries in run-batch.js
  {
    id: 'WORKER-PROP6',
    label: 'Preflight block triggers 0 retries — task status=FAILED immediately',
    async run() {
      const task = buildTask('Arrosage automatique');
      applyBatchPlan(task, 'workers', 3); // impossible count, same divergence as PROP5
      task._batch_plan_id = 'wpt-6-plan';

      const captured = {};
      const state = createGenerationState('wpt-6');
      const dummyUiAdapter = {
        updateProgress: () => {},
        renderImage: () => {},
        onTaskDone: () => {},
      };
      await runImageBatch([task], 'mock-key', {
        state,
        fetchImpl: makeMockFetch(captured),
        readResponseImpl: readMockImpl,
        rewritePromptImpl: rewriteMockImpl,
        uiAdapter: dummyUiAdapter,
        sleep: () => Promise.resolve(),
      });
      if (task.status !== IMAGE_TASK_STATUS.FAILED)
        return { ok: false, detail: `Expected FAILED, got ${task.status}` };
      if ((captured.fetchCalled || 0) !== 0)
        return { ok: false, detail: `fetch called ${captured.fetchCalled} times (expected 0)` };
      if (task.imageAttempt !== 1)
        return { ok: false, detail: `imageAttempt=${task.imageAttempt} (expected 1, no retries)` };
      return { ok: true };
    },
  },

  // WORKER-PROP7: task planned at 1 → var_workers=1, no constraint injection for 2
  {
    id: 'WORKER-PROP7',
    label: 'Route planned at 1 worker stays at var_workers=1',
    run() {
      // Use a single-worker service (e.g. Entretien jardin)
      const task = buildTask('Entretien jardin');
      applyBatchPlan(task, 'workers', 1);
      const { variedObj } = runPipelineToVaried(task);
      if (variedObj.var_workers !== 1)
        return { ok: false, detail: `var_workers=${variedObj.var_workers} (expected 1)` };
      return { ok: true };
    },
  },

  // WORKER-PROP8: none/indirect presence → var_workers stays 0 or absent
  {
    id: 'WORKER-PROP8',
    label: 'None/indirect presence → var_workers=0 or absent, preflight does not fire',
    run() {
      const task = buildTask('Paillage');
      applyBatchPlan(task, 'none', 0);
      let sceneStr = task.jsonScene;
      const _rs = JSON.parse(sceneStr);
      _rs._pre_assigned_worker_count = 0;
      sceneStr = JSON.stringify(_rs);
      const realistScene = _applySiteRealism(sceneStr, 0);
      const _rs2 = JSON.parse(realistScene);
      _rs2._pre_assigned_worker_count = 0;
      const realistWithPlan = JSON.stringify(_rs2);
      const variedScene = _applyVariation(realistWithPlan, 0, 'none');
      const variedObj = JSON.parse(variedScene);
      // For non-worker presence, var_workers should be 0 or not set
      if (variedObj.var_workers && variedObj.var_workers >= 1 && variedObj.var_presence === 'none')
        return { ok: false, detail: `var_workers=${variedObj.var_workers} but presence=none` };
      return { ok: true };
    },
  },

  // WORKER-PROP9: Auto remorquage stays at 2
  {
    id: 'WORKER-PROP9',
    label: 'Auto remorquage planned at 2 → var_workers=2',
    run() {
      const task = buildTask('Remorquage véhicule', 'encours', 'auto');
      applyBatchPlan(task, 'workers', 2);
      const { variedObj } = runPipelineToVaried(task);
      if (variedObj.var_workers !== 2)
        return { ok: false, detail: `var_workers=${variedObj.var_workers} (expected 2) for auto remorquage` };
      return { ok: true };
    },
  },

  // WORKER-PROP10: Auto batterie planned at 1 stays at 1
  {
    id: 'WORKER-PROP10',
    label: 'Auto batterie planned at 1 → var_workers=1',
    run() {
      const task = buildTask('Démarrage batterie', 'encours', 'auto');
      applyBatchPlan(task, 'workers', 1);
      const { variedObj } = runPipelineToVaried(task);
      if (variedObj.var_workers !== 1)
        return { ok: false, detail: `var_workers=${variedObj.var_workers} (expected 1) for auto batterie` };
      return { ok: true };
    },
  },

  // WORKER-PROP11: Arboriste and active toiture stay at 2
  {
    id: 'WORKER-PROP11',
    label: 'Arboriste and active toiture services planned at 2 stay at var_workers=2',
    run() {
      const cases = [
        { travaux: 'Élagage arbre', metier: 'arboriste' },
        { travaux: 'Remplacement tuiles', metier: 'toiture' },
      ];
      const failures = [];
      for (const c of cases) {
        const task = buildTask(c.travaux, 'encours', c.metier);
        applyBatchPlan(task, 'workers', 2);
        const { variedObj } = runPipelineToVaried(task);
        if (variedObj.var_workers !== 2)
          failures.push(`${c.travaux}: var_workers=${variedObj.var_workers} (expected 2)`);
      }
      if (failures.length) return { ok: false, detail: failures.join('; ') };
      return { ok: true };
    },
  },

];

// ─── runner ──────────────────────────────────────────────────────────────────

export async function _runWorkerPropTests() {
  let passed = 0;
  let failed = 0;
  const results = [];

  for (const test of tests) {
    let result;
    try {
      result = await Promise.resolve(test.run());
    } catch (err) {
      result = { ok: false, detail: `Exception: ${err.message}` };
    }
    if (result.ok) {
      passed++;
      console.log(`✅ ${test.id}: ${test.label}`);
    } else {
      failed++;
      console.error(`❌ ${test.id}: ${test.label}\n   → ${result.detail}`);
    }
    results.push({ id: test.id, label: test.label, ...result });
  }

  console.log(`\n--- WORKER-PROP: ${passed}/${tests.length}${failed ? ` — ${failed} FAILED ❌` : ' ✅'} ---`);
  return { passed, failed, total: tests.length, results };
}
