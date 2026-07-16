/**
 * image-generation/index.js — Phase 7A.1
 * Active modular public API — replaces legacy functions from app.js on window.
 * Bridge: window.__GMB_IMAGE_CONTEXT__ is the only authorized cross-domain dependency.
 *
 * Exposes:
 *   window.__IMAGE_MODULAR_API__  — frozen object with direct function references
 *   window.__IMAGE_GEN_READY__    — Promise (set by inline script in index.html)
 *   window.generateAllImages / addImgRow / downloadImagesZip / _retryFailedImages
 */

import { createGenerationState, IMAGE_TASK_STATUS, TERMINAL_STATUSES } from './pipeline/state.js';
import { fetchWithTimeout, readResponseOnce }                           from './pipeline/http.js';
import { createImagePipeline }                                          from './pipeline/run-batch.js';
import { retryFailedImages }                                            from './pipeline/retries.js';
import { createImageUiAdapter }                                         from './ui/img-ui.js';
import { buildDallePromptV2, _validateScene }                           from './prompt/scene-builder.js';
import { rewritePromptWithGPT }                                         from './prompt/prompt-rewriter.js';
import { _buildPresencePlan }                                           from './safety/worker-validator.js';
import { _planGlobalBatch, _rebalanceGlobalBatchPlan }                  from './planning/batch-planner.js';
import { _validateCompleteBatchPlan }                                   from './validation/batch-validator.js';
import { _hashSeed }                                                    from './utils/deterministic.js';

// ─── Module-private state ─────────────────────────────────────────────────────
let _modRunActive       = false;
let _modRunId           = 0;
let _modGeneratedImages = [];
let _modLastTasks       = [];
let _modLastApiKey      = '';

// ─── Internal helpers ─────────────────────────────────────────────────────────
const _slugify = str =>
  (str || 'image').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

const _rewriteImpl = (scene, apiKey) =>
  rewritePromptWithGPT({ prompt: scene, apiKey, fetchImpl: fetchWithTimeout, readResponse: readResponseOnce });

const _bridge = () => window.__GMB_IMAGE_CONTEXT__;

// ─── _modAddRow ───────────────────────────────────────────────────────────────
function _modAddRow() {
  _bridge().addRow();
}

// ─── _modGenerateAll ──────────────────────────────────────────────────────────
async function _modGenerateAll() {
  if (_modRunActive) { console.warn('[Batch] génération déjà en cours — ignoré'); return; }

  const bridge = _bridge();
  const key = document.getElementById('openai-key')?.value.trim();
  if (!key) { alert('Renseigne ta clé API OpenAI (sk-...) en haut de la page.'); return; }

  const rows = bridge.getRows().filter(r => (r.travaux || '').trim());
  if (!rows.length) { alert('Ajoute au moins une ligne avec un type de travaux.'); return; }

  _modRunActive = true;
  _modRunId++;
  const runId = _modRunId;

  const uiAdapter    = createImageUiAdapter();
  const progressWrap = document.getElementById('img-progress-wrap');
  const downloadBtn  = document.getElementById('btn-download-zip');

  uiAdapter.setGenerateButtonDisabled(true);
  uiAdapter.clearGallery();
  uiAdapter.clearSummary();
  if (progressWrap) progressWrap.style.display = 'none';
  if (downloadBtn)  downloadBtn.style.display = 'none';

  // ── Phase 1: build tasks synchronously ───────────────────────────────────
  const tasks = [];
  let taskIdSeq = 0;
  for (const row of rows) {
    row.status = 'running';
    row.images = [];
    const nb = parseInt(row.nb) || 1;

    const jsonScene   = buildDallePromptV2(row);
    const sceneIssues = _validateScene(jsonScene);
    if (sceneIssues.length) {
      row.status = 'error';
      console.warn('[scene validation]', sceneIssues);
      continue;
    }

    const _planBase    = JSON.parse(jsonScene);
    const planSeed     = _hashSeed(`${_planBase._matched_key || ''}${_planBase._matched_service || ''}plan`);
    const presencePlan = _buildPresencePlan(nb, _planBase.state_level, _planBase._matched_key, planSeed);
    const slug         = _slugify(row.fiche || row.travaux);

    for (let i = 0; i < nb; i++) {
      tasks.push({
        taskId: ++taskIdSeq, row, i, nb,
        jsonScene, presencePlan, slug,
        _planBase: Object.assign({}, _planBase),
        status: 'pending', imageAttempt: 0, result: null, error: null,
      });
    }
  }
  if (bridge.refreshPlan) bridge.refreshPlan();

  const total = tasks.length;
  if (total === 0) {
    alert('Aucune image à générer — vérifie que chaque ligne a un type de travaux valide et un métier reconnu.');
    _modRunActive = false;
    uiAdapter.setGenerateButtonDisabled(false);
    return;
  }

  // ── Phase 2: batch planning ───────────────────────────────────────────────
  const batchRunSeed = `${runId}:${Date.now()}`;
  _planGlobalBatch(tasks, batchRunSeed);
  _rebalanceGlobalBatchPlan(tasks, batchRunSeed);
  _validateCompleteBatchPlan(tasks);
  console.log('[BATCH PLAN]', tasks.map(t => ({
    taskId:      t.taskId,
    metier:      t._planBase._matched_key,
    composition: t._pre_assigned_composition,
    vehicle:     t._pre_assigned_vehicle,
    workers:     t._pre_assigned_worker_presence,
  })));

  if (progressWrap) progressWrap.style.display = 'block';

  // ── Phase 3: concurrent generation ───────────────────────────────────────
  const state    = createGenerationState();
  const pipeline = createImagePipeline({
    state, fetchImpl: fetchWithTimeout, readResponseImpl: readResponseOnce,
    rewritePromptImpl: _rewriteImpl, uiAdapter,
  });
  const runImages = [];
  try {
    await pipeline.runImageBatch(tasks, key, runImages);
  } finally {
    if (runId === _modRunId) {
      _modRunActive = false;
      uiAdapter.setGenerateButtonDisabled(false);
      if (progressWrap) progressWrap.style.display = 'none';
    }
  }

  // ── Phase 4: publish + finalize ───────────────────────────────────────────
  _modGeneratedImages = runImages;
  _modLastTasks       = tasks;
  _modLastApiKey      = key;

  const succeeded = tasks.filter(t => t.status === IMAGE_TASK_STATUS.SUCCESS);
  const failed    = tasks.filter(t => TERMINAL_STATUSES.has(t.status) && t.status !== IMAGE_TASK_STATUS.SUCCESS);

  console.log(
    `[BATCH SUMMARY] demandées: ${total} | validées: ${succeeded.length}` +
    (failed.length ? ` | échecs: ${failed.length}` : '')
  );

  if (runImages.length > 0 && downloadBtn) {
    downloadBtn.textContent = runImages.length === 1 ? "↓ Télécharger l'image" : '↓ Télécharger le ZIP';
    downloadBtn.style.display = 'inline-flex';
  }

  uiAdapter.renderBatchSummary(total, succeeded.length, failed, key);
  window._lastFailedTasks = failed.length ? failed : null;
  window._lastApiKey      = key;
}

// ─── _modRetryFailed ──────────────────────────────────────────────────────────
async function _modRetryFailed() {
  if (_modRunActive) { console.warn('[Retry] génération déjà en cours'); return; }
  const key         = _modLastApiKey || document.getElementById('openai-key')?.value.trim();
  const failedTasks = _modLastTasks.filter(t => TERMINAL_STATUSES.has(t.status) && t.status !== IMAGE_TASK_STATUS.SUCCESS);
  if (!key || !failedTasks.length) return;

  _modRunActive = true;
  _modRunId++;
  const runId     = _modRunId;
  const uiAdapter  = createImageUiAdapter();
  const progressWrap = document.getElementById('img-progress-wrap');

  uiAdapter.setGenerateButtonDisabled(true);
  uiAdapter.clearSummary();
  if (progressWrap) progressWrap.style.display = 'block';

  const state = createGenerationState();
  let retryImages = [];
  try {
    retryImages = await retryFailedImages(failedTasks, key, {
      state, fetchImpl: fetchWithTimeout, readResponseImpl: readResponseOnce,
      rewritePromptImpl: _rewriteImpl, uiAdapter,
    });
  } finally {
    if (runId === _modRunId) {
      _modRunActive = false;
      uiAdapter.setGenerateButtonDisabled(false);
      if (progressWrap) progressWrap.style.display = 'none';
    }
  }

  for (const img of retryImages) {
    if (!_modGeneratedImages.some(e => e.taskId === img.taskId)) _modGeneratedImages.push(img);
  }

  const downloadBtn = document.getElementById('btn-download-zip');
  if (_modGeneratedImages.length > 0 && downloadBtn) {
    downloadBtn.textContent = _modGeneratedImages.length === 1 ? "↓ Télécharger l'image" : '↓ Télécharger le ZIP';
    downloadBtn.style.display = 'inline-flex';
  }

  const stillFailed = failedTasks.filter(t => TERMINAL_STATUSES.has(t.status) && t.status !== IMAGE_TASK_STATUS.SUCCESS);
  uiAdapter.renderBatchSummary(failedTasks.length, retryImages.length, stillFailed, key);
  window._lastFailedTasks = stillFailed.length ? stillFailed : null;
  window._lastApiKey      = key;
}

// ─── _modDownloadZip ──────────────────────────────────────────────────────────
async function _modDownloadZip() {
  const images = _modGeneratedImages;
  if (!images.length) return;

  if (images.length === 1) {
    const { b64, url, filename } = images[0];
    if (b64) {
      const a = document.createElement('a');
      a.href = `data:image/jpeg;base64,${b64}`;
      a.download = filename;
      a.click();
    } else if (url) {
      window.open(url, '_blank');
    }
    return;
  }

  const JSZip = window.JSZip;
  if (!JSZip) { alert('JSZip non chargé.'); return; }
  const zip    = new JSZip();
  const folder = zip.folder('images-gmb');
  let added    = 0;
  for (const { b64, filename } of images) {
    if (b64) { folder.file(filename, b64, { base64: true }); added++; }
  }
  if (!added) { alert('Impossible de récupérer les images (URLs expirées ?).'); return; }
  const blob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'images-gmb.zip';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
}

// ─── Public API — frozen object with direct function references ───────────────
// T84 verifies identity: window.generateAllImages === window.__IMAGE_MODULAR_API__.generateAllImages
const publicApi = Object.freeze({
  generateAllImages: _modGenerateAll,
  addImgRow:         _modAddRow,
  downloadImagesZip: _modDownloadZip,
  retryFailedImages: _modRetryFailed,
});

Object.defineProperty(window, '__IMAGE_MODULAR_API__', {
  value:        publicApi,
  writable:     false,
  configurable: false,
  enumerable:   false,
});

// Assign window.* from publicApi — stubs set in index.html are replaced here.
window.generateAllImages  = publicApi.generateAllImages;
window.addImgRow          = publicApi.addImgRow;
window.downloadImagesZip  = publicApi.downloadImagesZip;
window._retryFailedImages = publicApi.retryFailedImages;

// Signal readiness — resolves window.__IMAGE_GEN_READY__ (set in index.html inline script).
window.dispatchEvent(new CustomEvent('imagegen:ready', { detail: publicApi }));

console.info('[IMAGE MODULE 7A.1] Modular API active and ready');
