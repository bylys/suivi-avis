/**
 * Image generation mode (PRODUCTION / VALIDATION) — no-cost tests (Opus 4.8 speed pass)
 *
 * Both modes produce the SAME image payload (model / quality:high / size 1536x1024 /
 * ratio / format / compression / prompt / timeout all identical). The ONLY functional
 * difference is maxImageAttempts: production=3 (resilience), validation=1 (fast-fail).
 * These tests prove exactly that, and that mode selection has zero business impact
 * (routing / worker planning / gate / Vision never read the mode).
 */

const { buildImageGenerationRequest } = await import('../pipeline/generate-image.js');
const { IMAGE_MODE_CONFIG, getImageMode, setImageMode, imageModeConfig } = await import('../config/image-mode.js');
// Runtime wiring proof (no real network): a failing image mock lets us count how many
// image API calls the pipeline makes per mode = the attempt ceiling actually applied.
const { createImagePipeline }   = await import('../pipeline/run-batch.js');
const { createGenerationState } = await import('../pipeline/state.js');
const { buildDallePromptV2 }    = await import('../prompt/scene-builder.js');
const { _buildPresencePlan }    = await import('../safety/worker-validator.js');
const { _planGlobalBatch, _rebalanceGlobalBatchPlan } = await import('../planning/batch-planner.js');
const { _validateCompleteBatchPlan } = await import('../validation/batch-validator.js');
const { _hashSeed }             = await import('../utils/deterministic.js');

export async function runImageModeTests() {
  console.group('MODE tests — PRODUCTION / VALIDATION (same image, attempts differ)');
  const _results = [];
  let _pass = 0, _fail = 0;
  function test(id, desc, fn) {
    try { fn(); _results.push({ id, desc, status: 'PASS' }); _pass++; console.log(`%c✓ ${id}: ${desc}`, 'color: green'); }
    catch (e) { _results.push({ id, desc, status: 'FAIL', reason: e.message }); _fail++; console.error(`✘ ${id}: ${desc}\n  ${e.message}`); }
  }
  function assert(cond, msg) { if (!cond) throw new Error(`FAIL: ${msg}`); }

  const req  = (mode) => buildImageGenerationRequest('PROMPT_X', 'sk-test', mode);
  const body = (mode) => JSON.parse(req(mode).body);

  test('MODE-1', 'PRODUCTION: quality=high, size=1536x1024, timeout=300000, maxImageAttempts=3', () => {
    const r = req('production'); const b = JSON.parse(r.body);
    assert(b.quality === 'high', `quality=${b.quality}`);
    assert(b.size === '1536x1024', `size=${b.size}`);
    assert(r.timeout === 300000, `timeout=${r.timeout}`);
    assert(IMAGE_MODE_CONFIG.production.maxImageAttempts === 3, `maxImageAttempts=${IMAGE_MODE_CONFIG.production.maxImageAttempts}`);
  });

  test('MODE-2', 'VALIDATION: quality=high, size=1536x1024, timeout=300000, maxImageAttempts=1', () => {
    const r = req('validation'); const b = JSON.parse(r.body);
    assert(b.quality === 'high', `quality=${b.quality}`);
    assert(b.size === '1536x1024', `size=${b.size}`);
    assert(r.timeout === 300000, `timeout=${r.timeout}`);
    assert(IMAGE_MODE_CONFIG.validation.maxImageAttempts === 1, `maxImageAttempts=${IMAGE_MODE_CONFIG.validation.maxImageAttempts}`);
  });

  test('MODE-3', 'Image payload IDENTICAL across modes (same quality/size/timeout/prompt/etc.)', () => {
    const p = body('production'), v = body('validation');
    assert(p.model === v.model && p.model === 'gpt-image-2', 'model differs');
    assert(p.n === v.n && p.n === 1, 'n differs');
    assert(p.size === v.size && p.size === '1536x1024', 'size/ratio differs');
    assert(p.quality === v.quality && p.quality === 'high', 'quality must be identical (both high)');
    assert(p.output_format === v.output_format && p.output_format === 'jpeg', 'format differs');
    assert(p.output_compression === v.output_compression && p.output_compression === 85, 'compression differs');
    assert(p.prompt === v.prompt && p.prompt === 'PROMPT_X', 'prompt differs');
    assert(req('production').timeout === req('validation').timeout && req('production').timeout === 300000, 'timeout differs');
  });

  test('MODE-4', 'ONLY functional difference is maxImageAttempts (3 vs 1)', () => {
    assert(IMAGE_MODE_CONFIG.production.maxImageAttempts === 3, 'prod attempts');
    assert(IMAGE_MODE_CONFIG.validation.maxImageAttempts === 1, 'valid attempts');
    // every image-payload-affecting field is equal; only the attempt ceiling differs
    assert(imageModeConfig('production').quality === imageModeConfig('validation').quality, 'quality must match');
    assert(imageModeConfig('production').size === imageModeConfig('validation').size, 'size must match');
    assert(imageModeConfig('production').timeout === imageModeConfig('validation').timeout, 'timeout must match');
  });

  test('MODE-5', 'Default global mode is production', () => {
    assert(getImageMode() === 'production', `default mode=${getImageMode()}`);
  });

  test('MODE-6', 'setImageMode accepts only known modes; unknown ignored (never silent switch)', () => {
    const restore = getImageMode();
    try {
      assert(setImageMode('validation') === 'validation', 'should accept validation');
      assert(getImageMode() === 'validation', 'mode not set');
      assert(setImageMode('bogus') === 'validation', 'unknown mode must be ignored (unchanged)');
      assert(setImageMode('production') === 'production', 'should accept production');
    } finally { setImageMode(restore); }
  });

  // ─── MODE-7/8: runtime attempt-ceiling wiring (no real network) ─────────────

  const _fakeRead = async (r) => { const raw = await r.text(); let data=null; try{ if(raw) data=JSON.parse(raw);}catch{} return { ok:r.ok, status:r.status, raw, data }; };
  const _fakeRewrite = async () => 'mock prompt';
  const _fakeSleep   = async () => {};
  const _uiAdapter   = { updateProgress(){}, renderImage(){}, onTaskDone(){} };

  // Image API always fails with a NON-404 error → technical failure → the pipeline
  // retries up to the mode ceiling. Count the image calls = attempts actually run.
  function _mkFailingImageFetch() {
    let imgCalls = 0;
    const fetchImpl = async (url) => {
      if (String(url).includes('images/generations')) {
        imgCalls++;
        return { ok:false, status:500, text: async () => JSON.stringify({ error: { message: 'mock server error' } }) };
      }
      // rewriter path is stubbed via rewritePromptImpl, so no chat/completions call expected
      throw new Error('[UNEXPECTED_URL] ' + url);
    };
    return { fetchImpl, count: () => imgCalls };
  }

  async function _countImageAttempts(mode) {
    const restore = getImageMode();
    setImageMode(mode);
    try {
      const row = { metier:'maçonnerie', travaux:'Mur parpaing', etat:'En cours', contexte:'maison_individuelle', ville:'Lyon', meteo:'auto', nb:1, fiche:'', images:[] };
      const _planBase = JSON.parse(buildDallePromptV2(row));
      const planSeed  = _hashSeed(`${_planBase._matched_key||''}${_planBase._matched_service||''}plan`);
      const pp        = _buildPresencePlan(1, _planBase.state_level, _planBase._matched_key, planSeed);
      const task = { taskId:1, row, i:0, nb:1, jsonScene:JSON.stringify(_planBase), presencePlan:pp, slug:'mp', _planBase:Object.assign({},_planBase), status:'pending', imageAttempt:0, result:null, error:null };
      _planGlobalBatch([task],'modewire'); _rebalanceGlobalBatchPlan([task],'modewire'); _validateCompleteBatchPlan([task]);
      const mf = _mkFailingImageFetch();
      const state = createGenerationState({ runId:'modewire-'+mode });
      const pipe = createImagePipeline({ state, fetchImpl: mf.fetchImpl, readResponseImpl: _fakeRead, rewritePromptImpl: _fakeRewrite, uiAdapter: _uiAdapter, sleep: _fakeSleep });
      await pipe.runImageBatch([task], 'sk-test', []);
      return mf.count();
    } finally { setImageMode(restore); }
  }

  // async runtime tests (test() helper is sync-only, so record MODE-7/8 directly)
  const atest = async (id, desc, want, mode) => {
    try {
      const n = await _countImageAttempts(mode);
      if (n === want) { _results.push({ id, desc, status:'PASS' }); _pass++; console.log(`%c✓ ${id}: ${desc}`, 'color: green'); }
      else { _results.push({ id, desc, status:'FAIL', reason:`expected ${want} image attempts, got ${n}` }); _fail++; console.error(`✘ ${id}: expected ${want}, got ${n}`); }
    } catch(e) { _results.push({ id, desc, status:'FAIL', reason:e.message }); _fail++; console.error(`✘ ${id}: ${e.message}`); }
  };
  await atest('MODE-7', 'PRODUCTION runtime → 3 image attempts on repeated failure', 3, 'production');
  await atest('MODE-8', 'VALIDATION runtime → 1 image attempt (fast-fail)', 1, 'validation');

  console.log(`\n--- MODE: ${_pass}/${_pass + _fail} ---\n`);
  console.groupEnd();
  return { pass: _pass, fail: _fail, results: _results };
}
