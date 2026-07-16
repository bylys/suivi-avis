/**
 * planning/composition-planner.js — Phase 4 shadow copy (source active : app.js)
 * Planification déterministe des compositions par batch et par métier.
 * Ne pas modifier avant le cutover validé.
 */

import { PHOTO_COMPOSITIONS, _COMPOSITION_DIST, COMPOSITION_RULES_BY_METIER } from '../config/compositions.js';
import { _hashSeed } from '../utils/deterministic.js';

// ─── Batch composition planner ───────────────────────────────────────────────
// Assigns ordered compositions for a group of n images sharing a métier.
// Guarantees: close_detail quota, no consecutive duplicates, min 1 contextual/wide per batch ≥ 2.
function _planBatchCompositions(metier, n, seed) {
  const rules       = COMPOSITION_RULES_BY_METIER[metier] || {};
  const preferred   = rules.preferred_compositions || ['medium_intervention', 'wide_worksite'];
  const allowed     = rules.allowed_compositions   || Object.keys(PHOTO_COMPOSITIONS);
  const maxCloseR   = rules.close_detail_max_ratio ?? 0.20;
  const maxClose    = Math.max(1, Math.floor(n * maxCloseR));
  const minCtx      = rules.minimum_contextual_images_per_batch ?? 1;

  const result = [];
  let closeCount = 0;

  for (let i = 0; i < n; i++) {
    // Force contextual_overview for the last slot if quota not yet met
    const needCtx = minCtx > 0 && i === n - 1 && !result.includes('contextual_overview') && allowed.includes('contextual_overview');
    if (needCtx) { result.push('contextual_overview'); continue; }

    let pool = [...preferred].filter(c => allowed.includes(c));
    if (!pool.length) pool = [...allowed];

    // Enforce close_detail quota
    if (closeCount >= maxClose) pool = pool.filter(c => c !== 'close_detail');

    // Avoid repeating the immediately previous composition
    const last = result[result.length - 1];
    if (pool.length > 1) pool = pool.filter(c => c !== last);
    if (!pool.length) pool = allowed.filter(c => c !== last && (closeCount < maxClose || c !== 'close_detail'));
    if (!pool.length) pool = allowed;

    const comp = pool[_hashSeed(`batchcomp|${metier}|${seed}|${i}`) % pool.length];
    result.push(comp);
    if (comp === 'close_detail') closeCount++;
  }
  return result;
}

export { _planBatchCompositions };
