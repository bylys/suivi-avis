/**
 * planning/batch-requirements.js — Phase 6 final
 * Source unique des règles de planification et de validation des batchs image.
 *
 * Exporte :
 *   getBatchPlanPolicy(tasks)       — politique complète (plannerTargets + validationRequirements)
 *   getBatchPlanRequirements(tasks) — alias backward-compat → validationRequirements seulement
 *
 * plannerTargets   : objectifs que _rebalanceGlobalBatchPlan essaie d'atteindre.
 *   requiredCompositions : même liste pour tous n (legacy parity T55/T57).
 *   maxClose             : cap close_detail appliqué au rebalancer (toujours 1).
 *   minVehicleScenes     : vehicleEligible après steps 1-2 → appelé au step 3.
 *
 * validationRequirements : minimums que _validateCompleteBatchPlan exige (size-aware).
 *   Pour n<4, les exigences sont réduites à ce qui est atteignable.
 *   Pour n≥4, elles correspondent aux règles du rebalancer.
 *
 * Règle absolue : tout changement de quota passe par ce fichier.
 */

import { COMPOSITION_RULES_BY_METIER } from '../config/compositions.js';

function getBatchPlanPolicy(tasks) {
  const n = tasks.length;

  if (n <= 0) {
    return {
      plannerTargets: {
        requiredCompositions: [], maxClose: 1,
        minWorkerScenes: 0, minVehicleScenes: 0, requireDistinctCompositions: false,
      },
      validationRequirements: {
        maxClose: 0, minMedium: 0, minWide: 0, minContextual: 0,
        minMediumOrWide: 0, minNonClose: 0, requireDistinctCompositions: false,
        minWorkerScenes: 0, minVehicleScenes: 0,
      },
    };
  }

  // Worker requis si au moins un groupe métier l'exige
  const workerRequired = tasks.some(t => {
    const rules = COMPOSITION_RULES_BY_METIER[t._planBase?._matched_key || ''] || {};
    return (rules.minimum_worker_images_per_active_batch ?? 1) >= 1;
  });

  // Véhicule eligible si au moins une tâche n'est pas close_detail (ou n≥4)
  const vehicleEligible = n >= 4 ||
    tasks.some(t => (t._pre_assigned_composition || '') !== 'close_detail');

  // Planner targets: objectifs du rebalancer — identiques au REQUIRED_COMPS legacy pour toutes tailles.
  // Pour n<4, les candidates sont souvent vides (protection depletion), mais le contrat reste le même.
  const plannerTargets = {
    requiredCompositions: ['medium_intervention', 'wide_worksite', 'contextual_overview'],
    maxClose: 1,
    minWorkerScenes: 0,           // workers gérés par _planBatchWorkerPresence, pas le rebalancer
    minVehicleScenes: vehicleEligible ? 1 : 0,
    requireDistinctCompositions: false,
  };

  if (n === 1) {
    return {
      plannerTargets,
      validationRequirements: {
        maxClose: 1, minMedium: 0, minWide: 0, minContextual: 0,
        minMediumOrWide: 0, minNonClose: 0, requireDistinctCompositions: false,
        minWorkerScenes: 0,
        minVehicleScenes: vehicleEligible ? 1 : 0,
      },
    };
  }

  if (n === 2) {
    return {
      plannerTargets,
      validationRequirements: {
        maxClose: 1, minMedium: 0, minWide: 0, minContextual: 0,
        minMediumOrWide: 0, minNonClose: 1, requireDistinctCompositions: true,
        minWorkerScenes: workerRequired ? 1 : 0,
        minVehicleScenes: vehicleEligible ? 1 : 0,
      },
    };
  }

  if (n === 3) {
    return {
      plannerTargets,
      validationRequirements: {
        maxClose: 1, minMedium: 0, minWide: 0, minContextual: 1,
        minMediumOrWide: 1, minNonClose: 2, requireDistinctCompositions: false,
        minWorkerScenes: workerRequired ? 1 : 0,
        minVehicleScenes: vehicleEligible ? 1 : 0,
      },
    };
  }

  // n >= 4 : exigences complètes — correspond exactement au comportement de _rebalanceGlobalBatchPlan
  const maxCloseV = Math.max(1, Math.floor(n * 0.2));
  return {
    plannerTargets,
    validationRequirements: {
      maxClose: maxCloseV, minMedium: 1, minWide: 1, minContextual: 1,
      minMediumOrWide: 0, minNonClose: n - maxCloseV, requireDistinctCompositions: false,
      minWorkerScenes: workerRequired ? 1 : 0,
      minVehicleScenes: vehicleEligible ? 1 : 0,
    },
  };
}

// Backward-compat alias — retourne uniquement validationRequirements
const getBatchPlanRequirements = (tasks) => getBatchPlanPolicy(tasks).validationRequirements;

export { getBatchPlanPolicy, getBatchPlanRequirements };
