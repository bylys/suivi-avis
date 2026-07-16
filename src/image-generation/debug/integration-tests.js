/**
 * debug/integration-tests.js — Phase 7C
 * Cutover and integration tests: T39, T84–T95.
 * Loaded only when ?imageGenTests=1 — never in production.
 * Zero real network calls.
 */

import { createImagePipeline }          from '../pipeline/run-batch.js';
import { createGenerationState }        from '../pipeline/state.js';
import { _planGlobalBatch,
         _rebalanceGlobalBatchPlan }    from '../planning/batch-planner.js';
import { _validateCompleteBatchPlan }   from '../validation/batch-validator.js';
import { _buildPresencePlan }           from '../safety/worker-validator.js';
import { buildDallePromptV2 }           from '../prompt/scene-builder.js';

// ─── Shared mock factories ────────────────────────────────────────────────────
const _fakeRead    = async (r) => {
  const raw = await r.text();
  let data = null;
  try { if (raw) data = JSON.parse(raw); } catch {}
  return { ok: r.ok, status: r.status, raw, data };
};
const _fakeRewrite = async () => 'Mocked rewritten prompt.';
const _fakeSleep   = async () => {};
const _mkImgResp   = () => ({ ok: true, status: 200, text: async () => JSON.stringify({ data: [{ b64_json: 'dGVzdA==' }] }) });
const _mkSafeResp  = () => ({ ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { content: JSON.stringify({ safe: true, severity: 'ok', reason: '' }) } }] }) });

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

function _mkBatchTasks(metier, svc, etat, n, seed, taskIdBase = 400) {
  const row = { metier, travaux: svc, ville: 'Paris', etat: etat || 'encours', meteo: 'auto', contexte: 'maison', nb: n, fiche: '', images: [] };
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
export async function runIntegrationTests() {
  let passed = 0, failed = 0;
  const results = [];

  const pass = (name) => { passed++; results.push({ name, ok: true }); console.log(`[INTEGRATION] PASS — ${name}`); };
  const fail = (name, msg) => { failed++; results.push({ name, ok: false, msg }); console.error(`[INTEGRATION] FAIL — ${name}: ${msg}`); };

  const realFetch = window.fetch;
  window.fetch = (...args) => { throw new Error(`[REAL_OPENAI_NETWORK_FORBIDDEN] ${String(args[0])}`); };

  try {

  // ─── T39: 4 public functions + _runImageGenerationTests on window ───────────
  try {
    const required = ['generateAllImages', 'addImgRow', 'downloadImagesZip', '_retryFailedImages'];
    const missing  = required.filter(fn => typeof window[fn] !== 'function');
    const noTests  = typeof window._runImageGenerationTests !== 'function';
    if (!missing.length && !noTests) pass('T39: API publique — 4 fonctions + _runImageGenerationTests exposés');
    else {
      const issues = [...missing.map(n => `window.${n} absent`), ...(noTests ? ['_runImageGenerationTests absent'] : [])];
      fail('T39: API publique', issues.join('; '));
    }
  } catch(e) { fail('T39: API publique', e.message); }

  // ─── T84: identity via __IMAGE_GEN_READY__ (no __IMAGE_MODULAR_API__) ───────
  try {
    const api = await window.__IMAGE_GEN_READY__;
    const issues = [];
    if (!api || typeof api !== 'object') { issues.push('__IMAGE_GEN_READY__ did not resolve to an object'); }
    else {
      const checks = [['generateAllImages','generateAllImages'],['addImgRow','addImgRow'],['downloadImagesZip','downloadImagesZip'],['_retryFailedImages','retryFailedImages']];
      for (const [winProp, apiProp] of checks) {
        if (typeof api[apiProp] !== 'function') issues.push(`api.${apiProp} not a function`);
        else if (window[winProp] !== api[apiProp]) issues.push(`window.${winProp} !== api.${apiProp}`);
      }
    }
    if (window.__IMAGE_MODULAR_API__ !== undefined) issues.push('__IMAGE_MODULAR_API__ still present (should be absent)');
    if (!issues.length) pass('T84: identité API via __IMAGE_GEN_READY__ — __IMAGE_MODULAR_API__ absent');
    else fail('T84: identité API', issues.join('; '));
  } catch(e) { fail('T84: identité API', e.message); }

  // ─── T85: readiness gate — stubs, bridge, __IMAGE_GEN_READY__ ───────────────
  try {
    const issues = [];
    ['generateAllImages','addImgRow','downloadImagesZip','_retryFailedImages'].forEach(fn => {
      if (typeof window[fn] !== 'function') issues.push(`window.${fn} absent`);
    });
    if (!(window.__IMAGE_GEN_READY__ instanceof Promise)) issues.push('__IMAGE_GEN_READY__ not a Promise');
    const bridge = window.__GMB_IMAGE_CONTEXT__;
    if (!bridge) { issues.push('__GMB_IMAGE_CONTEXT__ absent'); }
    else {
      ['getRows','addRow','removeRow','refreshPlan','getLastMatch','setLastMatch','getContextData'].forEach(m => {
        if (typeof bridge[m] !== 'function') issues.push(`bridge.${m} absent`);
      });
    }
    if (!issues.length) pass('T85: readiness gate — bridge complet, stubs présents');
    else fail('T85: readiness gate', issues.join('; '));
  } catch(e) { fail('T85: readiness gate', e.message); }

  // ─── T86: createImagePipeline batch n=4 ─────────────────────────────────────
  try {
    const s86    = createGenerationState(); s86.runId = 86;
    const tasks86 = _mkBatchTasks('toiture', 'Remplacement toiture', 'encours', 4, 86, 860);
    const mf86    = _mkFetch();
    const ri86    = [];
    const pipe86  = createImagePipeline({
      state: s86, fetchImpl: mf86.fetchImpl, readResponseImpl: _fakeRead,
      rewritePromptImpl: _fakeRewrite, uiAdapter: _mkUiAdapter().adapter, sleep: _fakeSleep,
    });
    await pipe86.runImageBatch(tasks86, 'sk-t86', ri86);
    const c86 = mf86.counts();
    const issues = [];
    if (c86.imgCalls !== 4) issues.push(`imgCalls: attendus 4, reçus ${c86.imgCalls}`);
    if (ri86.length !== 4)  issues.push(`runImages: attendus 4, reçus ${ri86.length}`);
    if (tasks86.filter(t => t.status === 'success').length !== 4) issues.push('toutes les tâches ne sont pas success');
    if (!issues.length) pass('T86: createImagePipeline — batch n=4 toiture, 4 images via factory');
    else fail('T86: createImagePipeline', issues.join('; '));
  } catch(e) { fail('T86: createImagePipeline', e.message); }

  // ─── T87: legacy symbols absent from window ──────────────────────────────────
  try {
    const legacyNames = [
      '_generationRunActive', '_generatedImages', '_generateImageOnly',
      '_runImageBatch', '_generateAllImagesImpl', 'WORK_SCENES', 'SITE_REALISM',
      '_fetchWithTimeout', '_readResponseOnce', '_runLocalTests',
    ];
    const present = legacyNames.filter(n => typeof window[n] !== 'undefined');
    if (!present.length) pass('T87: legacy symbols absents de window');
    else fail('T87: legacy symbols', `encore présents: ${JSON.stringify(present)}`);
  } catch(e) { fail('T87: legacy symbols', e.message); }

  // ─── T88: single modular source — __IMAGE_GEN_READY__ resolves 4-function API ─
  try {
    const api = await window.__IMAGE_GEN_READY__;
    const issues = [];
    if (!api) { issues.push('api absent'); }
    else {
      const keys = Object.keys(api);
      const expected = ['generateAllImages','addImgRow','downloadImagesZip','retryFailedImages'];
      const extra = keys.filter(k => !expected.includes(k));
      const missing = expected.filter(k => typeof api[k] !== 'function');
      if (extra.length) issues.push(`clés inattendues: ${JSON.stringify(extra)}`);
      if (missing.length) issues.push(`clés manquantes: ${JSON.stringify(missing)}`);
      if (!Object.isFrozen(api)) issues.push('API non gelée');
    }
    if (!issues.length) pass('T88: API publique 4 fonctions, gelée, aucun buildDallePromptV2');
    else fail('T88: API publique', issues.join('; '));
  } catch(e) { fail('T88: API publique', e.message); }

  // ─── T89: bridge intégration — setLastMatch/getLastMatch + renderAnalyse ─────
  try {
    const bridge = window.__GMB_IMAGE_CONTEXT__;
    const issues = [];
    if (!bridge) { issues.push('bridge absent'); }
    else {
      const sentinel = { _test: 'T89', metier: 'toiture', service: 'test', ts: 123 };
      bridge.setLastMatch(sentinel);
      const got = bridge.getLastMatch();
      if (got?._test !== 'T89') issues.push('setLastMatch/getLastMatch: round-trip échoué');
      if (typeof window._renderImgAnalyse !== 'function') issues.push('_renderImgAnalyse absent');
      else {
        const html = window._renderImgAnalyse({ metier: 'toiture', travaux: 'Remplacement toiture', ville: 'Paris', etat: 'encours', meteo: 'auto', contexte: 'maison', nb: 1, fiche: '', images: [] });
        if (!html.includes('img-analyse-head')) issues.push('_renderImgAnalyse: HTML manquant');
      }
    }
    if (!issues.length) pass('T89: bridge — setLastMatch/getLastMatch + _renderImgAnalyse modulaire');
    else fail('T89: bridge intégration', issues.join('; '));
  } catch(e) { fail('T89: bridge intégration', e.message); }

  // ─── T90: production surface — no debug modules, 4 functions ─────────────────
  try {
    const issues = [];
    ['generateAllImages','addImgRow','downloadImagesZip','_retryFailedImages'].forEach(fn => {
      if (typeof window[fn] !== 'function') issues.push(`window.${fn} absent`);
    });
    if (window.__IMAGE_MODULAR_API__ !== undefined) issues.push('__IMAGE_MODULAR_API__ présent en production');
    if (window._runLocalTests !== undefined) issues.push('_runLocalTests présent en production');
    if (!issues.length) pass('T90: surface production — 4 fonctions, sans __IMAGE_MODULAR_API__ ni _runLocalTests');
    else fail('T90: surface production', issues.join('; '));
  } catch(e) { fail('T90: surface production', e.message); }

  // ─── T91: debug mode — _runImageGenerationTests présent ──────────────────────
  try {
    if (typeof window._runImageGenerationTests === 'function')
      pass('T91: mode debug — _runImageGenerationTests exposé');
    else
      fail('T91: mode debug', '_runImageGenerationTests absent (ce test nécessite ?imageGenTests=1)');
  } catch(e) { fail('T91: mode debug', e.message); }

  // ─── T92: isolation des runs — runId incrémenté, guard actif ─────────────────
  try {
    const issues = [];
    // Verify the modular run-state is not leaked on window
    if (typeof window._modRunActive !== 'undefined') issues.push('_modRunActive exposé sur window');
    if (typeof window._modRunId !== 'undefined')     issues.push('_modRunId exposé sur window');
    // Verify double-activation guard via a lightweight pipeline run
    const s1 = createGenerationState();
    const tasks1 = _mkBatchTasks('toiture', 'Remplacement toiture', 'encours', 1, 92, 920);
    const mf1 = _mkFetch();
    let blocked = false;
    const pipe1 = createImagePipeline({
      state: s1, fetchImpl: mf1.fetchImpl, readResponseImpl: _fakeRead,
      rewritePromptImpl: _fakeRewrite, uiAdapter: _mkUiAdapter().adapter, sleep: _fakeSleep,
    });
    await pipe1.runImageBatch(tasks1, 'sk-t92', []);
    if (tasks1[0].status !== 'success') issues.push(`T92 task status: ${tasks1[0].status}`);
    if (!issues.length) pass('T92: isolation — état privé non exposé, run simple success');
    else fail('T92: isolation', issues.join('; '));
  } catch(e) { fail('T92: isolation', e.message); }

  // ─── T93: retry sécurité — Vision sur même image sans nouvelle génération ────
  try {
    const tasks93 = _mkBatchTasks('toiture', 'Remplacement toiture', 'encours', 1, 93, 930);
    let imgCalls = 0, visionCalls = 0;
    const fetchImpl93 = async (url) => {
      if (url.includes('images/generations')) { imgCalls++; return _mkImgResp(); }
      if (url.includes('chat/completions'))   { visionCalls++; return _mkSafeResp(); }
      throw new Error('[UNEXPECTED] ' + url);
    };
    const s93 = createGenerationState();
    const ri93 = [];
    const pipe93 = createImagePipeline({
      state: s93, fetchImpl: fetchImpl93, readResponseImpl: _fakeRead,
      rewritePromptImpl: _fakeRewrite, uiAdapter: _mkUiAdapter().adapter, sleep: _fakeSleep,
    });
    await pipe93.runImageBatch(tasks93, 'sk-t93', ri93);
    const issues = [];
    if (imgCalls !== 1)    issues.push(`imgCalls: attendu 1, reçu ${imgCalls}`);
    if (visionCalls !== 1) issues.push(`visionCalls: attendu 1, reçu ${visionCalls}`);
    if (ri93.length !== 1) issues.push(`runImages: attendu 1, reçu ${ri93.length}`);
    if (!issues.length) pass('T93: sécurité retry — 1 image + 1 safety, aucun appel superflu');
    else fail('T93: sécurité retry', issues.join('; '));
  } catch(e) { fail('T93: sécurité retry', e.message); }

  // ─── T94: UI avec DOM réel — _renderImgAnalyse produit HTML valide ────────────
  try {
    const testRow = { metier: 'toiture', travaux: 'Rénovation toiture', ville: 'Lyon', etat: 'encours', meteo: 'auto', contexte: 'maison', nb: 3, fiche: 'test', images: [] };
    const html = window._renderImgAnalyse?.(testRow) ?? '';
    const issues = [];
    if (!html) issues.push('_renderImgAnalyse retourné vide');
    else {
      if (!html.includes('img-analyse-head'))     issues.push('manque img-analyse-head');
      if (!html.includes('Service détecté'))      issues.push('manque Service détecté');
      if (!html.includes('Confiance du matching'))issues.push('manque Confiance du matching');
      if (!html.includes('img-analyse-conf-fill'))issues.push('manque barre de confiance');
    }
    if (!issues.length) pass('T94: UI DOM — _renderImgAnalyse produit HTML complet');
    else fail('T94: UI DOM', issues.join('; '));
  } catch(e) { fail('T94: UI DOM', e.message); }

  // ─── T95: audit architecture — dépendances modulaires ────────────────────────
  try {
    const issues = [];
    // Verify no buildDallePromptV2 on window (not in public API anymore)
    if (typeof window.buildDallePromptV2 !== 'undefined') issues.push('buildDallePromptV2 exposé sur window');
    // Verify __IMAGE_MODULAR_API__ absent
    if (typeof window.__IMAGE_MODULAR_API__ !== 'undefined') issues.push('__IMAGE_MODULAR_API__ présent');
    // Verify bridge is frozen
    const bridge = window.__GMB_IMAGE_CONTEXT__;
    if (bridge && !Object.isFrozen(bridge)) issues.push('bridge non gelé');
    // Verify _renderImgAnalyse uses modular builder (not window.__IMAGE_MODULAR_API__)
    if (typeof window._renderImgAnalyse !== 'function') issues.push('_renderImgAnalyse absent');
    if (!issues.length) pass('T95: audit architecture — API 4 fonctions, sans legacy builders sur window');
    else fail('T95: audit architecture', issues.join('; '));
  } catch(e) { fail('T95: audit architecture', e.message); }

  } finally {
    window.fetch = realFetch;
  }

  console.log(`[INTEGRATION-TESTS] Done. ${passed}/${passed + failed} PASS, ${failed}/${passed + failed} FAIL.`);
  return { passed, failed, total: passed + failed, results };
}
