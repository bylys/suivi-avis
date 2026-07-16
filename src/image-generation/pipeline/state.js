/**
 * pipeline/state.js — Phase 6 shadow copy (source active : app.js)
 * Constantes de statut, limites de retry, et factory d'état de génération.
 * Le singleton generationState est destiné au cutover Phase 7 — pas encore
 * utilisé par le pipeline actif.
 * Ne pas modifier avant le cutover validé.
 */

// ─── IMAGE_TASK_STATUS ────────────────────────────────────────────────────────
// Verbatim — app.js lines 13624–13633
const IMAGE_TASK_STATUS = {
  PENDING:             'pending',
  GENERATING:          'generating',
  CHECKING_SAFETY:     'checking_safety',
  RETRYING:            'retrying',
  SUCCESS:             'success',
  FAILED:              'failed',
  REJECTED_SAFETY:     'rejected_safety',
  SAFETY_CHECK_FAILED: 'safety_check_failed',
};

// ─── TERMINAL_STATUSES ────────────────────────────────────────────────────────
// Verbatim — app.js lines 13634–13637
const TERMINAL_STATUSES = new Set([
  IMAGE_TASK_STATUS.SUCCESS,
  IMAGE_TASK_STATUS.FAILED,
  IMAGE_TASK_STATUS.REJECTED_SAFETY,
  IMAGE_TASK_STATUS.SAFETY_CHECK_FAILED,
]);

// ─── Retry limits ─────────────────────────────────────────────────────────────
// Verbatim — app.js lines 13638–13639
const MAX_IMAGE_ATTEMPTS            = 3;
const MAX_SAFETY_ATTEMPTS_PER_IMAGE = 3;

// ─── createGenerationState ────────────────────────────────────────────────────
// Factory for isolated test state and future singleton.
// Does NOT include DOM refs, API keys in logs, or rejected images.
function createGenerationState() {
  return {
    runActive:       false,
    runId:           null,
    runSeed:         null,
    generatedImages: [],
    imageCallLog:    [],
    lastFailedTasks: [],
    counters: {
      requested:          0,
      imageCalls:         0,
      visionCalls:        0,
      validated:          0,
      visionFailures:     0,
      criticalRejections: 0,
    },
  };
}

// ─── Singleton — for Phase 7 cutover ─────────────────────────────────────────
// Not wired into production yet.
const generationState = createGenerationState();

export {
  IMAGE_TASK_STATUS,
  TERMINAL_STATUSES,
  MAX_IMAGE_ATTEMPTS,
  MAX_SAFETY_ATTEMPTS_PER_IMAGE,
  createGenerationState,
  generationState,
};
