/**
 * planning/batch-requirements.js — Phase 6 correction
 * Source unique des quotas batch utilisée par le planner (n≥4) et le validator (tous n).
 *
 * Pour n<4, les exigences sont réduites à ce qui est réellement atteignable avec le nombre
 * de tâches disponibles. Pour n≥4, elles correspondent exactement aux règles codées dans
 * _rebalanceGlobalBatchPlan (medium, wide, contextual, worker, véhicule).
 *
 * Règle absolue : batch-planner.js et batch-validator.js utilisent cette même source
 * de vérité. Tout changement de quota passe par ce fichier.
 */

import { COMPOSITION_RULES_BY_METIER } from '../config/compositions.js';

/**
 * Retourne les exigences minimales d'un plan batch en fonction du nombre de tâches.
 *
 * Champs retournés :
 *   maxClose               — nombre maximum de tâches close_detail autorisées
 *   minMedium              — minimum de medium_intervention requis
 *   minWide                — minimum de wide_worksite requis
 *   minContextual          — minimum de contextual_overview requis
 *   minMediumOrWide        — minimum de (medium_intervention OU wide_worksite) requis
 *   requireDistinctCompositions — toutes les compositions du batch doivent être distinctes
 *   minWorkerScenes        — minimum de tâches avec worker_presence='workers' requis
 *   minVehicleScenes       — minimum de tâches avec vehicle != 'absent' requis
 *
 * Appel attendu APRÈS _planGlobalBatch + _rebalanceGlobalBatchPlan (les champs
 * _pre_assigned_* sont déjà positionnés sur chaque tâche).
 *
 * @param {Object[]} tasks
 * @returns {Object}
 */
function getBatchPlanRequirements(tasks) {
  const n = tasks.length;

  if (n <= 0) {
    return {
      maxClose: 0, minMedium: 0, minWide: 0, minContextual: 0, minMediumOrWide: 0,
      requireDistinctCompositions: false, minWorkerScenes: 0, minVehicleScenes: 0,
    };
  }

  // Worker requis si au moins un groupe métier l'exige (minimum_worker_images_per_active_batch >= 1)
  const workerRequired = tasks.some(t => {
    const rules = COMPOSITION_RULES_BY_METIER[t._planBase?._matched_key || ''] || {};
    return (rules.minimum_worker_images_per_active_batch ?? 1) >= 1;
  });

  // Véhicule possible si au moins une tâche n'est pas close_detail
  // (le rebalancer garantit ce cas pour n>=4 via le cap maxClose=1)
  const vehicleEligible = n >= 4 ||
    tasks.some(t => (t._pre_assigned_composition || '') !== 'close_detail');

  if (n === 1) {
    return {
      maxClose: 1, minMedium: 0, minWide: 0, minContextual: 0, minMediumOrWide: 0,
      requireDistinctCompositions: false,
      minWorkerScenes: 0,
      minVehicleScenes: vehicleEligible ? 1 : 0,
    };
  }

  if (n === 2) {
    return {
      maxClose: 1, minMedium: 0, minWide: 0, minContextual: 0, minMediumOrWide: 0,
      requireDistinctCompositions: true,
      minWorkerScenes: workerRequired ? 1 : 0,
      minVehicleScenes: vehicleEligible ? 1 : 0,
    };
  }

  if (n === 3) {
    return {
      maxClose: 1, minMedium: 0, minWide: 0, minContextual: 1, minMediumOrWide: 1,
      requireDistinctCompositions: false,
      minWorkerScenes: workerRequired ? 1 : 0,
      minVehicleScenes: vehicleEligible ? 1 : 0,
    };
  }

  // n >= 4 : exigences complètes — correspond exactement au comportement de _rebalanceGlobalBatchPlan
  return {
    maxClose: Math.max(1, Math.floor(n * 0.2)),
    minMedium: 1, minWide: 1, minContextual: 1, minMediumOrWide: 0,
    requireDistinctCompositions: false,
    minWorkerScenes: workerRequired ? 1 : 0,
    minVehicleScenes: vehicleEligible ? 1 : 0,
  };
}

export { getBatchPlanRequirements };
