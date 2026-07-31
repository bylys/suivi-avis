/**
 * planning/worker-planner.js — Phase 4 shadow copy (source active : app.js)
 * Planification déterministe de la présence workers par batch et par métier.
 * Ne pas modifier avant le cutover validé.
 */

import { COMPOSITION_RULES_BY_METIER } from '../config/compositions.js';
import { WORKER_SCENE_RULES } from '../safety/worker-rules.js';
import { _hashSeed } from '../utils/deterministic.js';
import { _serviceGroup } from '../resolution/service-resolver.js';

// ─── Batch worker presence planner ───────────────────────────────────────────
// Assigns _pre_assigned_worker_presence and _pre_assigned_worker_count per task in a same-métier group.
// Guarantees minimum_worker_images_per_active_batch. Mutates group in place.
function _planBatchWorkerPresence(group, seed) {
  const metier  = group[0]?._planBase?._matched_key || '';
  const rules   = COMPOSITION_RULES_BY_METIER[metier] || {};
  const wRules  = WORKER_SCENE_RULES?.[metier] || {};
  const minWImg = rules.minimum_worker_images_per_active_batch ?? 1;
  let   minW    = wRules.min_workers_when_visible || 1;
  // State-level minimum: e.g. etancheite encours/semifinal require 2 workers
  if (wRules.state_worker_minimums) {
    const stateMin = wRules.state_worker_minimums[group[0]?._planBase?.state_level];
    if (typeof stateMin === 'number' && stateMin > minW) minW = stateMin;
  }
  // Service-level minimum: e.g. depannage_auto crevaison/remorquage require 2 workers
  if (wRules.service_worker_minimums) {
    const svcRaw    = group[0]?._planBase?._matched_service || '';
    const svcBucket = _serviceGroup(svcRaw);
    const svcMin    = wRules.service_worker_minimums[svcBucket];
    if (svcMin && svcMin > minW) minW = svcMin;
  }
  // Service-level maximum: ground-level services (e.g. enduit monocouche) cap the state minimum
  if (wRules.service_worker_maximums) {
    const svcRaw    = group[0]?._planBase?._matched_service || '';
    const svcBucket = svcRaw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const svcMax    = wRules.service_worker_maximums[svcBucket];
    if (typeof svcMax === 'number' && svcMax < minW) minW = svcMax;
  }
  const n       = group.length;
  let workerImages = 0;

  for (let i = 0; i < n; i++) {
    const task = group[i];
    const comp = task._pre_assigned_composition || 'medium_intervention';
    const roll = _hashSeed(`worker|${metier}|${seed}|${i}`) % 100;
    let pres;
    if      (comp === 'close_detail')        pres = roll < 30 ? 'workers' : (roll < 60 ? 'indirect' : 'none');
    else if (comp === 'contextual_overview') pres = roll < 40 ? 'workers' : (roll < 70 ? 'none' : 'indirect');
    else                                     pres = roll < 50 ? 'workers' : (roll < 90 ? 'none' : 'indirect');
    task._pre_assigned_worker_presence = pres;
    task._pre_assigned_worker_count    = pres === 'workers' ? minW : 0;
    if (pres === 'workers') workerImages++;
  }

  // Enforce minimum — promote non-workers images to workers (prefer non-close-detail)
  for (let pass = 0; pass < 2 && workerImages < minWImg; pass++) {
    for (let i = 0; i < n && workerImages < minWImg; i++) {
      const comp = group[i]._pre_assigned_composition || '';
      if (group[i]._pre_assigned_worker_presence !== 'workers' && (pass > 0 || comp !== 'close_detail')) {
        group[i]._pre_assigned_worker_presence = 'workers';
        group[i]._pre_assigned_worker_count    = minW;
        workerImages++;
      }
    }
  }
}

export { _planBatchWorkerPresence };
