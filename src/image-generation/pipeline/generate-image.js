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
import { _sanitizeSceneForPrompt, _validateInteriorPayload } from './prompt-scene-sanitizer.js';
import { SERVICE_VISUAL_MISMATCH_RETRY, SOLIN_SAFETY_RETRY, RAVALEMENT_SCAFFOLD_RETRY, HYDROFUGE_SAFETY_RETRY } from '../safety/safety-rules.js';

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

  // Inject _pre_assigned_worker_count BEFORE _applyVariation so the count
  // is available at scene-resolver line 153 and takes the batch_preassignment branch.
  // Without this, _applyVariation reads undefined → falls to 'rolled' → var_workers=1.
  let _realistWithPlan = realistScene;
  try {
    const _rs = JSON.parse(realistScene);
    _rs._pre_assigned_worker_count = task._pre_assigned_worker_count;
    _realistWithPlan = JSON.stringify(_rs);
  } catch {}

  const variedScene    = _applyVariation(_realistWithPlan, i, presencePlan[i]);

  _assertTaskHasBatchPlan(task);

  let _sceneForResolve = variedScene;
  try {
    const _so = JSON.parse(_sceneForResolve);
    _so._pre_assigned_composition   = task._pre_assigned_composition;
    _so._pre_assigned_vehicle       = task._pre_assigned_vehicle;
    _so._capture_defects_resolved   = task._capture_defects_resolved;
    _so._pre_assigned_worker_count  = task._pre_assigned_worker_count;
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

  const _sceneForPrompt = _sanitizeSceneForPrompt(finalScene);
  const _interiorIssues = _validateInteriorPayload(_sceneForPrompt);
  if (_interiorIssues.length) {
    console.warn(`[InteriorValidate] ${_planBase._matched_key} #${i}: ${_interiorIssues.join(' | ')}`);
  }
  const _gptPrompt = _USE_PROMPT_BUILDER
    ? PromptBuilder.build(_sceneForPrompt)
    : await rewritePromptImpl(_sceneForPrompt, apiKey);

  const _finalSceneObj = JSON.parse(finalScene);
  _assertFinalWorkerConsistency(_finalSceneObj);
  // Stamp resolved access_configuration on task for safety-check routing (after _finalSceneObj is defined)
  task._resolved_access_configuration = _finalSceneObj._access_configuration || null;

  // Preflight guard: when a worker count is pre-assigned, var_workers must match
  // before the Images API is called. Divergence here means the pipeline would
  // generate an image with the wrong worker count — the safety gate would reject
  // it and every retry would fail the same way. Fail fast with no network call.
  const _plannedWC = Number(task._pre_assigned_worker_count);
  const _promptWC  = _finalSceneObj.var_workers ?? 0;
  if (
    _finalSceneObj.var_presence === 'workers' &&
    Number.isInteger(_plannedWC) && _plannedWC >= 1 &&
    _promptWC !== _plannedWC
  ) {
    const _pfErr = new Error('preflight_worker_count_mismatch');
    _pfErr._isPreflight = true;
    _pfErr._plannedWC   = _plannedWC;
    _pfErr._promptWC    = _promptWC;
    throw _pfErr;
  }

  const prompt = _appendLockedFinalConstraints(_gptPrompt, _finalSceneObj);

  // Append service-specific retry note on upstand/mismatch regenerations
  const _MISMATCH_RETRY_CODES = new Set([
    'service_visual_mismatch',
    'missing_horizontal_membrane',
    'missing_vertical_upstand',
    'missing_upstand_treatment',
  ]);
  const _isMismatchRetry = task._imageRetryReason === 'regenerate_after_safety_reject'
    && _MISMATCH_RETRY_CODES.has(task.error);
  const _retryNote = _isMismatchRetry
    ? (SERVICE_VISUAL_MISMATCH_RETRY[_planBase._matched_service] || '')
    : '';

  // Solin/faitage safety retry injection
  const _SOLIN_SAFETY_SERVICES = new Set(['Réparation solin', 'Réfection faîtage', 'Remplacement solin', 'Faîtage']);
  const _isSolinSafetyRetry = task._imageRetryReason === 'regenerate_after_safety_reject'
    && _SOLIN_SAFETY_SERVICES.has(_planBase._matched_service)
    && !!task.error
    && !!SOLIN_SAFETY_RETRY[task.error];
  const _solinRetryNote = _isSolinSafetyRetry ? SOLIN_SAFETY_RETRY[task.error] : '';

  // Ravalement scaffold safety retry injection (keyed by _matched_key, not service string)
  const _isRavalementScaffoldRetry = task._imageRetryReason === 'regenerate_after_safety_reject'
    && _planBase._matched_key === 'ravalement'
    && !!task.error
    && !!RAVALEMENT_SCAFFOLD_RETRY[task.error];
  const _ravalementRetryNote = _isRavalementScaffoldRetry ? RAVALEMENT_SCAFFOLD_RETRY[task.error] : '';

  // Hydrofuge safety retry injection (keyed by _matched_service)
  const _isHydrofugeRetry = task._imageRetryReason === 'regenerate_after_safety_reject'
    && _planBase._matched_service === 'Traitement hydrofuge façade'
    && !!task.error
    && !!HYDROFUGE_SAFETY_RETRY[task.error];
  const _hydrofugeRetryNote = _isHydrofugeRetry ? HYDROFUGE_SAFETY_RETRY[task.error] : '';

  const _activeRetryNote = _retryNote || _solinRetryNote || _ravalementRetryNote || _hydrofugeRetryNote;
  const _finalPrompt = _activeRetryNote ? `${prompt}\n\n${_activeRetryNote}` : prompt;

  const reason = task.imageAttempt === 1 ? 'initial' : (task._imageRetryReason || 'retry_image_error');
  const _reqWorkerSource = _finalSceneObj._worker_count_source || 'rolled';
  const _retryReinforcementKey = (_isMismatchRetry && _retryNote)
    ? _planBase._matched_service
    : _isSolinSafetyRetry
      ? `${_planBase._matched_service}:${task.error}`
      : _isRavalementScaffoldRetry
        ? `${_planBase._matched_service}:${task.error}`
        : _isHydrofugeRetry
          ? `${_planBase._matched_service}:${task.error}`
          : null;
  const _captureDefects    = _finalSceneObj._capture_defects_resolved || [];
  const _captureDefectKeys = _captureDefects.map(d => d.key);
  const _opticalSelected   = _captureDefects.some(d => d.source === 'optical');
  const _captureSource     = _captureDefects.length === 0 ? 'none' : (_captureDefects[0].source || 'light');
  state.counters.imageCalls++;
  state.imageCallLog.push({ type: 'image', runId, taskId: task.taskId, metier: _planBase._matched_key, service: _planBase._matched_service, imageIndex: i, imageAttempt: task.imageAttempt, reason });
  console.log('[IMAGE REQUEST]', JSON.stringify({
    runId, taskId: task.taskId, metier: _planBase._matched_key, service: _planBase._matched_service,
    imageIndex: i, imageAttempt: task.imageAttempt, reason,
    planned_worker_count:   Number.isInteger(_plannedWC) ? _plannedWC : null,
    prompt_worker_count:    _promptWC,
    worker_count_source:    _reqWorkerSource,
    state_lock_used:        _finalSceneObj._state_lock_used ?? null,
    site_realism_build_id:  _finalSceneObj._site_realism_build_id || null,
    retry_reinforcement_key:     _retryReinforcementKey,
    retry_reinforcement_applied: _retryReinforcementKey !== null,
    capture_defect_source:  _captureSource,
    capture_defect_keys:    _captureDefectKeys,
    capture_defect_count:   _captureDefects.length,
    optical_defect_selected: _opticalSelected,
  }));

  const req = buildImageGenerationRequest(_finalPrompt, apiKey);
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

export { buildImageGenerationRequest, generateImageOnly, _sanitizeSceneForPrompt, _validateInteriorPayload };
