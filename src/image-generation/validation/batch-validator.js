/**
 * validation/batch-validator.js — Phase 6 correction (source active : app.js)
 * Validation du plan batch global et des champs _pre_assigned_*.
 * Utilise getBatchPlanRequirements (batch-requirements.js) comme source unique des quotas.
 * Ne pas modifier avant le cutover validé.
 */

import { getBatchPlanRequirements } from '../planning/batch-requirements.js';

// ─── Global batch plan validator ──────────────────────────────────────────────
// Throws [INVALID_BATCH_PLAN] if the planned batch does not meet size-appropriate quotas.
// Quotas are defined in getBatchPlanRequirements — same source used by _rebalanceGlobalBatchPlan
// for n≥4, ensuring planner and validator are always aligned.
function _validateCompleteBatchPlan(tasks) {
  const req     = getBatchPlanRequirements(tasks);
  const comps   = tasks.map(t => t._pre_assigned_composition);
  const failures = [];

  // close_detail cap
  if (comps.filter(c => c === 'close_detail').length > req.maxClose)
    failures.push(`close_detail > ${req.maxClose}`);

  // specific composition minimums
  if (req.minMedium    > 0 && !comps.includes('medium_intervention'))
    failures.push('no medium_intervention');
  if (req.minWide      > 0 && !comps.includes('wide_worksite'))
    failures.push('no wide_worksite');
  if (req.minContextual > 0 && !comps.includes('contextual_overview'))
    failures.push('no contextual_overview');
  if (req.minMediumOrWide > 0 &&
      !comps.includes('medium_intervention') && !comps.includes('wide_worksite'))
    failures.push('no medium_intervention or wide_worksite');

  // for n=2: all compositions must be distinct
  if (req.requireDistinctCompositions && new Set(comps).size < comps.length)
    failures.push('compositions not all distinct');

  // worker scenes
  if (req.minWorkerScenes > 0 &&
      !tasks.some(t => t._pre_assigned_worker_presence === 'workers'))
    failures.push('no worker scene');

  // vehicle scenes
  if (req.minVehicleScenes > 0 &&
      !tasks.some(t => t._pre_assigned_vehicle !== 'absent'))
    failures.push('no visible/partial vehicle');

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
