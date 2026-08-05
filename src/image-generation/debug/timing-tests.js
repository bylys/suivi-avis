/**
 * timing-tests.js — TIM test suite
 * Validates per-task performance telemetry in run-batch.js.
 * 0 real API calls — all mocked.
 */

const { createImagePipeline }  = await import('../pipeline/run-batch.js?bust=tim1');
const { createGenerationState } = await import('../pipeline/state.js?bust=tim1');
const { buildDallePromptV2 }   = await import('../prompt/scene-builder.js?bust=tim1');
const { _buildPresencePlan }   = await import('../safety/worker-validator.js?bust=tim1');
const { _planGlobalBatch }     = await import('../planning/batch-planner.js?bust=tim1');
const { _rebalanceGlobalBatchPlan } = await import('../planning/batch-planner.js?bust=tim1');
const { _validateCompleteBatchPlan } = await import('../validation/batch-validator.js?bust=tim1');

// ─── helpers ─────────────────────────────────────────────────────────────────

const _fakeRead = async (r) => {
  const raw = await r.text();
  let data = null;
  try { if (raw) data = JSON.parse(raw); } catch {}
  return { ok: r.ok, status: r.status, raw, data };
};
const _fakeSleep   = async () => {};
const _fakeRewrite = async () => 'Mocked rewritten prompt.';

const _mkImgResp  = () => ({ ok: true, status: 200, text: async () => JSON.stringify({ data: [{ b64_json: 'dGVzdA==' }] }) });
const _mkSafeResp = () => ({ ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { content: JSON.stringify({ safe: true, severity: 'ok', reason: '' }) } }] }) });
const _mkSafeFail = () => ({ ok: false, status: 500, text: async () => '' });
const _mkSafeReject = () => ({ ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { content: JSON.stringify({ safe: false, severity: 'critical', reason: 'test reject' }) } }] }) });

function _mkFetch(opts = {}) {
  let imgCalls = 0, visionCalls = 0;
  const fetchImpl = async (url) => {
    if (url.includes('images/generations')) { imgCalls++; return opts.imgFn ? opts.imgFn(imgCalls) : _mkImgResp(); }
    if (url.includes('chat/completions'))   { visionCalls++; return opts.visionFn ? opts.visionFn(visionCalls) : _mkSafeResp(); }
    throw new Error('[UNEXPECTED_URL] ' + url);
  };
  return { fetchImpl, counts: () => ({ imgCalls, visionCalls }) };
}

function _mkUiAdapter() {
  const calls = { updateProgress: 0, renderImage: [], tasksDone: [] };
  return {
    adapter: {
      updateProgress: () => { calls.updateProgress++; },
      renderImage:    (src, filename, label) => { calls.renderImage.push({ src: src?.slice(0, 20), filename, label }); },
      onTaskDone:     (task) => { calls.tasksDone.push(task.taskId); },
    },
    calls,
  };
}

function _mkTasks(metier, travaux, n, seed, taskIdBase = 700) {
  const row = { metier, travaux, ville: 'Paris', etat: 'encours', meteo: 'auto', contexte: 'maison', nb: n, fiche: '', images: [] };
  const jsonScene    = buildDallePromptV2(row);
  const _planBase    = JSON.parse(jsonScene);
  const presencePlan = _buildPresencePlan(n, _planBase.state_level, _planBase._matched_key, seed);
  const tasks = [];
  for (let i = 0; i < n; i++) {
    tasks.push({ taskId: taskIdBase + i, row, i, nb: n, jsonScene, presencePlan: presencePlan.slice(), slug: metier, _planBase: Object.assign({}, _planBase), status: 'pending', imageAttempt: 0, result: null, error: null });
  }
  _planGlobalBatch(tasks, seed);
  _rebalanceGlobalBatchPlan(tasks, seed);
  _validateCompleteBatchPlan(tasks);
  return tasks;
}

// ─── Test runner ──────────────────────────────────────────────────────────────

export async function runTimingTests() {
  let passed = 0, failed = 0;
  const results = [];

  const pass = (name) => { passed++; results.push({ name, ok: true }); console.log(`[TIMING] PASS — ${name}`); };
  const fail = (name, msg) => { failed++; results.push({ name, ok: false, msg }); console.error(`[TIMING] FAIL — ${name}: ${msg}`); };

  const realFetch = window.fetch;
  window.fetch = (...args) => { throw new Error(`[REAL_OPENAI_NETWORK_FORBIDDEN] ${String(args[0])}`); };

  try {

    // ─── TIM-1: normal success → timing fields present and consistent ────────
    try {
      const tasks1 = _mkTasks('toiture', 'Réparation toiture', 1, 1701, 701);
      const s1 = createGenerationState({ runId: 'tim1', tasks: tasks1 });
      const mf1 = _mkFetch();
      const pipe1 = createImagePipeline({ state: s1, fetchImpl: mf1.fetchImpl, readResponseImpl: _fakeRead, rewritePromptImpl: _fakeRewrite, uiAdapter: _mkUiAdapter().adapter, sleep: _fakeSleep });
      await pipe1.run(tasks1, 'sk-test');
      const t = tasks1[0];
      const issues = [];
      if (!t._timing)                                                           issues.push('_timing absent');
      if (t._failureType !== 'SUCCESS')                                        issues.push(`_failureType=${t._failureType}`);
      if (t._timing?.generation_ms < 0)                                        issues.push('generation_ms < 0');
      if (t._timing?.vision_ms < 0)                                            issues.push('vision_ms < 0');
      if (t._timing?.total_ms < 0)                                             issues.push('total_ms < 0');
      if (t._timing?.total_ms < t._timing?.generation_ms + t._timing?.vision_ms) issues.push('total_ms < generation_ms + vision_ms');
      if (t._timing?.generation_attempts !== 1)                                issues.push(`generation_attempts=${t._timing?.generation_attempts}`);
      if (t._timing?.vision_attempts !== 1)                                    issues.push(`vision_attempts=${t._timing?.vision_attempts}`);
      if (!issues.length) pass('TIM-1: success path — timing fields present and consistent');
      else fail('TIM-1', issues.join('; '));
    } catch(e) { fail('TIM-1', e.message); }

    // ─── TIM-2: vision retry → vision_attempts=2, vision_ms cumulates, sleep > 0
    try {
      const tasks2 = _mkTasks('toiture', 'Réparation toiture', 1, 1702, 702);
      const s2 = createGenerationState({ runId: 'tim2', tasks: tasks2 });
      let visionCall2 = 0;
      const mf2 = _mkFetch({ visionFn: () => { visionCall2++; return visionCall2 === 1 ? _mkSafeFail() : _mkSafeResp(); } });
      let sleepCalled = false;
      const fakeSleep2 = async () => { sleepCalled = true; };
      const pipe2 = createImagePipeline({ state: s2, fetchImpl: mf2.fetchImpl, readResponseImpl: _fakeRead, rewritePromptImpl: _fakeRewrite, uiAdapter: _mkUiAdapter().adapter, sleep: fakeSleep2 });
      await pipe2.run(tasks2, 'sk-test');
      const t = tasks2[0];
      const issues = [];
      if (t._timing?.vision_attempts !== 2)                                    issues.push(`vision_attempts=${t._timing?.vision_attempts}`);
      if (t._timing?.vision_ms < 0)                                            issues.push('vision_ms < 0');
      if (!sleepCalled)                                                         issues.push('vision retry sleep not called');
      if (t._failureType !== 'SUCCESS')                                        issues.push(`_failureType=${t._failureType}`);
      if (!issues.length) pass('TIM-2: vision retry — vision_attempts=2, sleep called');
      else fail('TIM-2', issues.join('; '));
    } catch(e) { fail('TIM-2', e.message); }

    // ─── TIM-3: preflight failure → generation_attempts=0, vision_attempts=0 ─
    try {
      // 'Arrosage automatique' paysagiste scene produces 2 workers max; plan with 3 triggers preflight
      const row3 = { metier: 'paysagiste', travaux: 'Arrosage automatique', ville: 'Lyon', etat: 'encours', meteo: 'auto', contexte: 'maison', nb: 1, fiche: '', images: [] };
      const jsonScene3 = buildDallePromptV2(row3);
      const _planBase3 = JSON.parse(jsonScene3);
      const presencePlan3 = _buildPresencePlan(1, _planBase3.state_level, _planBase3._matched_key, 1703);
      const task3 = { taskId: 703, row: row3, i: 0, nb: 1, jsonScene: jsonScene3, presencePlan: presencePlan3.slice(), slug: 'paysagiste', _planBase: Object.assign({}, _planBase3), status: 'pending', imageAttempt: 0, result: null, error: null };
      // Force impossible worker count
      task3._pre_assigned_worker_presence = 'workers';
      task3._pre_assigned_worker_count    = 3;
      task3._pre_assigned_composition     = 'medium_intervention';
      task3._pre_assigned_vehicle         = 'absent';
      task3._capture_defects_resolved     = [];
      const tasks3 = [task3];
      const s3 = createGenerationState({ runId: 'tim3', tasks: tasks3 });
      const mf3 = _mkFetch();
      const pipe3 = createImagePipeline({ state: s3, fetchImpl: mf3.fetchImpl, readResponseImpl: _fakeRead, rewritePromptImpl: _fakeRewrite, uiAdapter: _mkUiAdapter().adapter, sleep: _fakeSleep });
      await pipe3.run(tasks3, 'sk-test');
      const t = tasks3[0];
      const issues = [];
      if (t._timing?.generation_attempts !== 0) issues.push(`generation_attempts=${t._timing?.generation_attempts}`);
      if (t._timing?.vision_attempts !== 0)     issues.push(`vision_attempts=${t._timing?.vision_attempts}`);
      if (t._failureType !== 'PREFLIGHT_FAILURE') issues.push(`_failureType=${t._failureType}`);
      if (mf3.counts().imgCalls !== 0)           issues.push(`imgCalls=${mf3.counts().imgCalls} (expected 0)`);
      if (!issues.length) pass('TIM-3: preflight failure — generation_attempts=0, vision_attempts=0');
      else fail('TIM-3', issues.join('; '));
    } catch(e) { fail('TIM-3', e.message); }

    // ─── TIM-4: image API failure → failure_type=IMAGE_API_FAILURE, vision_attempts=0
    try {
      const tasks4 = _mkTasks('toiture', 'Réparation toiture', 1, 1704, 704);
      const s4 = createGenerationState({ runId: 'tim4', tasks: tasks4 });
      const mf4 = _mkFetch({ imgFn: () => ({ ok: false, status: 500, text: async () => '' }) });
      const pipe4 = createImagePipeline({ state: s4, fetchImpl: mf4.fetchImpl, readResponseImpl: _fakeRead, rewritePromptImpl: _fakeRewrite, uiAdapter: _mkUiAdapter().adapter, sleep: _fakeSleep });
      await pipe4.run(tasks4, 'sk-test');
      const t = tasks4[0];
      const issues = [];
      if (t._failureType !== 'IMAGE_API_FAILURE')  issues.push(`_failureType=${t._failureType}`);
      if (t._timing?.vision_attempts !== 0)         issues.push(`vision_attempts=${t._timing?.vision_attempts}`);
      if (!issues.length) pass('TIM-4: image API failure — failure_type=IMAGE_API_FAILURE, vision_attempts=0');
      else fail('TIM-4', issues.join('; '));
    } catch(e) { fail('TIM-4', e.message); }

    // ─── TIM-5: gate reject (all attempts) → failure_type=VISUAL_REJECT ───────
    try {
      const tasks5 = _mkTasks('toiture', 'Réparation toiture', 1, 1705, 705);
      const s5 = createGenerationState({ runId: 'tim5', tasks: tasks5 });
      const mf5 = _mkFetch({ visionFn: () => _mkSafeReject() });
      const pipe5 = createImagePipeline({ state: s5, fetchImpl: mf5.fetchImpl, readResponseImpl: _fakeRead, rewritePromptImpl: _fakeRewrite, uiAdapter: _mkUiAdapter().adapter, sleep: _fakeSleep });
      await pipe5.run(tasks5, 'sk-test');
      const t = tasks5[0];
      const issues = [];
      if (t._failureType !== 'VISUAL_REJECT')       issues.push(`_failureType=${t._failureType}`);
      if (t._timing?.safety_rejections < 1)          issues.push(`safety_rejections=${t._timing?.safety_rejections}`);
      if (!issues.length) pass('TIM-5: gate reject — failure_type=VISUAL_REJECT, safety_rejections >= 1');
      else fail('TIM-5', issues.join('; '));
    } catch(e) { fail('TIM-5', e.message); }

  } finally {
    window.fetch = realFetch;
  }

  console.log(`[TIMING] ${passed}/${passed + failed} passed`);
  return { passed, failed, results };
}
