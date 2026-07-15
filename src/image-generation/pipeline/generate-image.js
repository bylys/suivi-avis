/**
 * pipeline/generate-image.js — Phase 6 shadow copy (source active : app.js)
 * Génération d'une image unique sans contrôle safety.
 * Deux responsabilités :
 *   - buildImageGenerationRequest : pure, prépare url/headers/body
 *   - generateImageOnly           : injectable deps pour tests sans réseau réel
 * Verbatim — app.js lignes 13749–13831.
 * Ne pas modifier avant le cutover validé.
 */

import { _applySiteRealism }              from '../resolution/service-resolver.js';
import { _applyVariation }                from '../resolution/scene-resolver.js';
import { _resolveLocationAndComposition } from '../resolution/location-resolver.js';
import { _validateResolvedScene }         from '../validation/scene-validator.js';
import { _validateLocationServiceCompatibility } from '../validation/location-validator.js';
import { _validateWorkerScene, _assertFinalWorkerConsistency } from '../safety/worker-validator.js';
import { _validateQuality }               from '../validation/quality-validator.js';
import { _assertTaskHasBatchPlan }        from '../validation/batch-validator.js';
import { PromptBuilder, _USE_PROMPT_BUILDER } from '../prompt/prompt-builder.js';
import { _appendLockedFinalConstraints }  from '../prompt/locked-constraints.js';

// ─── buildImageGenerationRequest ─────────────────────────────────────────────
// Pure — verbatim params from app.js lines 13802–13806.
// model: gpt-image-2, size: 1536×1024, quality: high, output_format: jpeg, compression: 85
function buildImageGenerationRequest(prompt, apiKey) {
  return {
    url:     'https://api.openai.com/v1/images/generations',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      model:              'gpt-image-2',
      prompt,
      n:                  1,
      size:               '1536x1024',
      quality:            'high',
      output_format:      'jpeg',
      output_compression: 85,
    }),
    timeout: 180000,
  };
}

// ─── generateImageOnly ────────────────────────────────────────────────────────
// Same behaviour as _generateImageOnly — app.js lines 13749–13831
// Injectable deps:
//   state            — mutable counters/log (createGenerationState())
//   fetchImpl        — replaces _fetchWithTimeout
//   readResponseImpl — replaces _readResponseOnce
//   rewritePromptImpl— replaces _rewritePromptWithGPT(scene, key)
async function generateImageOnly(task, apiKey, runId, { state, fetchImpl, readResponseImpl, rewritePromptImpl }) {
  const { jsonScene, presencePlan, i, slug, _planBase } = task;
  const realistScene   = _applySiteRealism(jsonScene, i);
  const variedScene    = _applyVariation(realistScene, i, presencePlan[i]);

  _assertTaskHasBatchPlan(task);

  let _sceneForResolve = variedScene;
  try {
    const _so = JSON.parse(_sceneForResolve);
    _so._pre_assigned_composition = task._pre_assigned_composition;
    _so._pre_assigned_vehicle     = task._pre_assigned_vehicle;
    _so._capture_defects_resolved = task._capture_defects_resolved;
    _sceneForResolve = JSON.stringify(_so);
  } catch {}

  const resolvedScene  = _resolveLocationAndComposition(_sceneForResolve, i);
  const sceneValid     = _validateResolvedScene(resolvedScene);
  if (sceneValid.issues?.length)
    console.warn(`[SceneValidate] ${_planBase._matched_key} #${i}: ${sceneValid.issues.join(' | ')}`);
  const locServiceValid = _validateLocationServiceCompatibility(sceneValid.fixedStr);
  if (locServiceValid.issues?.length)
    console.warn(`[LocServiceValid] ${_planBase._matched_key} #${i}: ${locServiceValid.issues.join(' | ')}`);
  const workerResult = _validateWorkerScene(locServiceValid.fixedStr);
  if (workerResult.issues?.length)
    console.warn(`[WorkerScene] ${_planBase._matched_key} #${i}: ${workerResult.issues.join(' | ')}`);

  const _qObj   = JSON.parse(workerResult.fixedStr);
  const _qCheck = _validateQuality(_qObj);
  let finalScene;
  if (_qCheck.ok) {
    finalScene = workerResult.fixedStr;
  } else if (_qCheck.fixedObj) {
    finalScene = JSON.stringify(_qCheck.fixedObj);
    console.warn(`[QualityGate] patched — ${_qObj._matched_key}: ${_qCheck.issues.join(' | ')}`);
  } else {
    finalScene = jsonScene;
    console.warn(`[QualityGate] fallback — ${_qObj._matched_key}: ${_qCheck.issues.join(' | ')}`);
  }

  const _gptPrompt = _USE_PROMPT_BUILDER
    ? PromptBuilder.build(finalScene)
    : await rewritePromptImpl(finalScene, apiKey);

  const _finalSceneObj = JSON.parse(finalScene);
  _assertFinalWorkerConsistency(_finalSceneObj);
  const prompt = _appendLockedFinalConstraints(_gptPrompt, _finalSceneObj);

  const reason = task.imageAttempt === 1 ? 'initial' : (task._imageRetryReason || 'retry_image_error');
  state.counters.imageCalls++;
  state.imageCallLog.push({ type: 'image', runId, taskId: task.taskId, metier: _planBase._matched_key, service: _planBase._matched_service, imageIndex: i, imageAttempt: task.imageAttempt, reason });
  console.log(`[IMAGE REQUEST] runId=${runId} taskId=${task.taskId} metier=${_planBase._matched_key} service=${_planBase._matched_service} imageIndex=${i} imageAttempt=${task.imageAttempt} reason=${reason}`);

  const req = buildImageGenerationRequest(prompt, apiKey);
  let parsed;
  {
    const rawResp = await fetchImpl(req.url, { method: 'POST', headers: req.headers, body: req.body }, req.timeout);
    parsed = await readResponseImpl(rawResp);
  }

  if (!parsed.ok) {
    const errMsg = parsed.data?.error?.message || '';
    if (errMsg.includes('does not exist') || errMsg.includes('not found') || parsed.status === 404) {
      // Fallback to gpt-image-1 — same as legacy lines 13813–13819
      const fallbackBody = JSON.stringify({ model: 'gpt-image-1', prompt, n: 1, size: '1024x1024', quality: 'high', output_format: 'jpeg', output_compression: 85 });
      const fallbackResp = await fetchImpl(
        'https://api.openai.com/v1/images/generations',
        { method: 'POST', headers: req.headers, body: fallbackBody },
        180000
      );
      parsed = await readResponseImpl(fallbackResp);
    }
    if (!parsed.ok) throw new Error(parsed.data?.error?.message || `HTTP ${parsed.status}`);
  }

  const item = parsed.data?.data?.[0];
  if (!item) throw new Error('No image returned by API');
  const b64      = item.b64_json || null;
  const imgUrl   = item.url     || null;
  const filename = `${slug}-${String(i + 1).padStart(2, '0')}.jpg`;
  const src      = b64 ? `data:image/jpeg;base64,${b64}` : imgUrl;

  return { b64, imgUrl, filename, src };
}

export { buildImageGenerationRequest, generateImageOnly };
