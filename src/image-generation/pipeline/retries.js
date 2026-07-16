/**
 * pipeline/retries.js — Phase 6 shadow copy (source active : app.js)
 * Relance des tâches échouées sans replanification du batch.
 * Verbatim — app.js lignes 14009–14054.
 * Injectable deps pour tests sans DOM.
 * Ne pas modifier avant le cutover validé.
 */

import { IMAGE_TASK_STATUS, TERMINAL_STATUSES } from './state.js';
import { runImageBatch } from './run-batch.js';

// ─── retryFailedImages ────────────────────────────────────────────────────────
// Same behaviour as _retryFailedImages — app.js lines 14009–14054
// Preserves taskId, batch_plan_id, composition, workers, vehicle, defects.
// deps: same shape as runImageBatch deps
async function retryFailedImages(tasks, apiKey, { state, fetchImpl, readResponseImpl, rewritePromptImpl, uiAdapter, sleep = (ms) => new Promise(r => setTimeout(r, ms)) }) {
  if (!tasks?.length || !apiKey) return [];

  // Reset task state — preserve all batch plan fields (no replan)
  tasks.forEach(t => {
    t.status       = IMAGE_TASK_STATUS.PENDING;
    t.imageAttempt = 0;
    t.error        = null;
    t.result       = null;
  });

  const retryImages = [];
  try {
    await runImageBatch(tasks, apiKey, { state, fetchImpl, readResponseImpl, rewritePromptImpl, uiAdapter, sleep, runImages: retryImages });
  } finally {
    // Merge retry successes into state.generatedImages (dedup by taskId)
    for (const img of retryImages) {
      if (!state.generatedImages.some(e => e.taskId === img.taskId)) {
        state.generatedImages.push(img);
      }
    }
  }

  return retryImages;
}

export { retryFailedImages };
