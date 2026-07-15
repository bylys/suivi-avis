/**
 * validation/batch-validator.js — Phase 4 shadow copy (source active : app.js)
 * Validation du plan batch global et des champs _pre_assigned_*.
 * Ne pas modifier avant le cutover validé.
 */

// ─── Global batch plan validator ──────────────────────────────────────────────
// Throws [INVALID_BATCH_PLAN] if global quotas are not satisfied after rebalancing.
function _validateCompleteBatchPlan(tasks) {
  const comps    = tasks.map(t => t._pre_assigned_composition);
  const failures = [];
  if (comps.filter(c => c === 'close_detail').length > 1) failures.push('close_detail > 1');
  if (!comps.includes('medium_intervention'))             failures.push('no medium_intervention');
  if (!comps.includes('wide_worksite'))                   failures.push('no wide_worksite');
  if (!comps.includes('contextual_overview'))             failures.push('no contextual_overview');
  if (!tasks.some(t => t._pre_assigned_worker_presence === 'workers')) failures.push('no worker scene');
  if (!tasks.some(t => t._pre_assigned_vehicle !== 'absent'))          failures.push('no visible/partial vehicle');
  if (failures.length) throw new Error(`[INVALID_BATCH_PLAN] ${failures.join('; ')}`);
}

function _assertTaskHasBatchPlan(task) {
  const required = [
    '_pre_assigned_composition',
    '_pre_assigned_worker_presence',
    '_pre_assigned_worker_count',
    '_capture_defects_resolved',
    '_batch_plan_id',
  ];
  const missing = required.filter(k => task[k] === undefined || task[k] === null);
  if (missing.length)
    throw new Error(`[INCOMPLETE_BATCH_PLAN] taskId=${task.taskId} missing=${missing.join(',')}`);
}

export { _validateCompleteBatchPlan, _assertTaskHasBatchPlan };
