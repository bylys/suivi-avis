/**
 * planning/batch-planner.js — Phase 6 final (source active : app.js)
 * Orchestration globale du plan batch : composition, véhicule, défauts, workers.
 *
 * _rebalanceGlobalBatchPlan accepte un paramètre getPolicy injectable (défaut : getBatchPlanPolicy)
 * qui fournit plannerTargets. Utilisé en prod sans argument ; les tests injectent une politique sentinelle.
 */

import { _COMPOSITION_DIST, COMPOSITION_RULES_BY_METIER, CAMERA_COMPOSITIONS } from '../config/compositions.js';
import { PROFESSIONAL_VEHICLE_RULES } from '../config/vehicles.js';
import { _hashSeed } from '../utils/deterministic.js';
import { _planBatchCompositions } from './composition-planner.js';
import { _selectVehiclePresence } from './vehicle-planner.js';
import { _selectCaptureDefects } from './capture-defect-planner.js';
import { _planBatchWorkerPresence } from './worker-planner.js';
import { getBatchPlanPolicy } from './batch-requirements.js';

// ─── Global batch planner ─────────────────────────────────────────────────────
// Groups tasks by métier+service, assigns composition/vehicle/defects/worker plan to each.
// Mutates task objects in place; returns the same tasks array.
function _planGlobalBatch(tasks, runSeed) {
  const groups = {};
  for (const t of tasks) {
    const mk = `${t._planBase._matched_key || ''}|${t._planBase._matched_service || ''}`;
    if (!groups[mk]) groups[mk] = [];
    groups[mk].push(t);
  }

  for (const groupKey of Object.keys(groups)) {
    const group  = groups[groupKey];
    const metier = group[0]._planBase._matched_key || '';
    const n      = group.length;
    const gSeed  = _hashSeed(`${groupKey}|${runSeed}`);
    const comps  = _planBatchCompositions(metier, n, gSeed);

    for (let gi = 0; gi < n; gi++) {
      const task = group[gi];
      const comp = comps[gi];
      const pvS  = _hashSeed(`pv|${groupKey}|${gSeed}|${gi}`) % 100;
      const pv = _selectVehiclePresence(comp, metier, pvS);

      task._pre_assigned_composition   = comp;
      task._pre_assigned_vehicle       = pv;
      task._capture_defects_resolved   = _selectCaptureDefects(gi, n, _hashSeed(`defect|${groupKey}|${gSeed}|${gi}`));
      task._batch_plan_id              = `plan_${groupKey}_${gSeed}_${gi}`;
      task._batch_run_seed             = String(runSeed);
    }
    // Worker presence at batch level
    _planBatchWorkerPresence(group, gSeed);
  }
  return tasks;
}

// ─── Global batch rebalancer ──────────────────────────────────────────────────
// After per-group planning, ensures the FULL batch meets global composition quotas.
// Uses getBatchPlanPolicy (injectable) as the single source for plannerTargets.
// The third argument { getPolicy } is used by tests to inject a sentinel policy;
// production callers omit it and get the default.
function _rebalanceGlobalBatchPlan(tasks, runSeed, { getPolicy = getBatchPlanPolicy } = {}) {
  if (!tasks.length) return tasks;

  // Steps 1–2: use plannerTargets from current task state (compositions pre-swap)
  const { plannerTargets } = getPolicy(tasks);
  const REQUIRED_COMPS = plannerTargets.requiredCompositions;

  // Live counts — rebuilt as we swap
  const counts = {};
  for (const t of tasks) counts[t._pre_assigned_composition] = (counts[t._pre_assigned_composition] || 0) + 1;

  // 1. Cap close_detail at plannerTargets.maxClose
  if ((counts.close_detail || 0) > plannerTargets.maxClose) {
    let excess = counts.close_detail - plannerTargets.maxClose;
    for (const t of tasks) {
      if (!excess) break;
      if (t._pre_assigned_composition !== 'close_detail') continue;
      const metier  = t._planBase?._matched_key || '';
      const allowed = (COMPOSITION_RULES_BY_METIER[metier] || {}).allowed_compositions || Object.keys(CAMERA_COMPOSITIONS);
      if (!allowed.includes('medium_intervention')) continue;
      counts.close_detail--;
      counts.medium_intervention = (counts.medium_intervention || 0) + 1;
      t._pre_assigned_composition = 'medium_intervention';
      excess--;
    }
  }

  // 2. Ensure each required composition appears at least once
  for (const needed of REQUIRED_COMPS) {
    if ((counts[needed] || 0) >= 1) continue;
    // Candidates: current comp is over-represented AND métier allows `needed`
    const candidates = tasks
      .filter(t => {
        if (t._pre_assigned_composition === needed) return false;
        const metier  = t._planBase?._matched_key || '';
        const allowed = (COMPOSITION_RULES_BY_METIER[metier] || {}).allowed_compositions || Object.keys(CAMERA_COMPOSITIONS);
        if (!allowed.includes(needed)) return false;
        const cur = t._pre_assigned_composition;
        // Don't deplete the only occurrence of another required type
        if (REQUIRED_COMPS.includes(cur) && (counts[cur] || 0) <= 1) return false;
        return true;
      })
      .sort((a, b) => (counts[b._pre_assigned_composition] || 0) - (counts[a._pre_assigned_composition] || 0));

    if (!candidates.length) continue;

    const topCount = counts[candidates[0]._pre_assigned_composition] || 0;
    const top      = candidates.filter(t => (counts[t._pre_assigned_composition] || 0) === topCount);
    const chosen   = top[_hashSeed(`rebal|${needed}|${runSeed}`) % top.length];

    counts[chosen._pre_assigned_composition]--;
    chosen._pre_assigned_composition = needed;
    counts[needed] = (counts[needed] || 0) + 1;
  }

  // 3. Ensure at least minVehicleScenes vehicles visible or partial.
  // Policy recomputed here (after steps 1–2) so vehicleEligible reflects final compositions.
  const { plannerTargets: targetsV } = getPolicy(tasks);
  if (targetsV.minVehicleScenes > 0 && !tasks.some(t => t._pre_assigned_vehicle !== 'absent')) {
    const pref = ['wide_worksite', 'medium_intervention', 'vehicle_arrival', 'equipment_from_vehicle'];
    const pvC  = tasks
      .filter(t => t._pre_assigned_composition !== 'close_detail')
      .sort((a, b) => {
        const ia = pref.indexOf(a._pre_assigned_composition);
        const ib = pref.indexOf(b._pre_assigned_composition);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      });
    if (pvC.length) pvC[_hashSeed(`rebal|vehicle|${runSeed}`) % pvC.length]._pre_assigned_vehicle = 'partially_visible';
  }

  return tasks;
}

export { _planGlobalBatch, _rebalanceGlobalBatchPlan };
