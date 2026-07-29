/**
 * safety/worker-validator.js — Phase 3 shadow copy (source active : app.js)
 * Fonctions de validation et de description des workers par scène.
 * Ne pas modifier avant le cutover validé.
 */

import { _hashSeed, _pick } from '../utils/deterministic.js';
import { WORKER_SCENE_RULES, _resolveWorkerRule } from './worker-rules.js';

// resolvedRule is optional: when provided (e.g. from scene-resolver after visual_family dispatch)
// it takes precedence over the generic WORKER_SCENE_RULES lookup.
function _buildWorkerDesc(key, n, seed, resolvedRule) {
  const rules = resolvedRule || WORKER_SCENE_RULES[key];
  if (!rules) return 'tradesperson in work clothes naturally at work — seen from behind or in profile, never posing or looking at the camera';
  const action  = _pick(rules.actions,  1, seed + 11)[0] || 'working on the job';
  const posture = _pick(rules.postures, 1, seed + 13)[0] || 'seen from behind or in profile';
  const safety  = (rules.safety_required || []).slice(0, 1).join(', ');
  return `${posture}, ${action}${safety ? ` — ${safety} clearly visible` : ''}`;
}

// Valide la cohérence de la scène worker après _applyVariation.
// En cas d'élément interdit : ajoute exclusions. Si trop grave : supprime les workers.
// Returns { ok, issues, fixedStr }.
// If a scene is dangerous/incoherent and cannot be corrected, falls back to presence='none'.
function _validateWorkerScene(jsonStr) {
  let obj;
  try { obj = JSON.parse(jsonStr); } catch { return { ok: true, issues: [], fixedStr: jsonStr }; }

  // Apply scene_always_exclude regardless of presence (materials, structural rules)
  const _earlyRules = WORKER_SCENE_RULES[obj._matched_key];
  if (_earlyRules?.scene_always_exclude?.length) {
    const patched = Object.assign({}, obj);
    patched.exclude = [...new Set([...(patched.exclude || []), ..._earlyRules.scene_always_exclude])];
    jsonStr = JSON.stringify(patched);
    obj = patched;
  }

  if (obj.var_presence !== 'workers') return { ok: true, issues: [], fixedStr: jsonStr };

  const issues = [];
  const fixed  = Object.assign({}, obj);
  const rules  = _resolveWorkerRule(fixed._matched_key, fixed._resolved_visual_family || null);

  if (!rules) {
    issues.push('missing_dedicated_rules');
    fixed._worker_validation_issues = issues;
    return { ok: false, issues, fixedStr: JSON.stringify(fixed) };
  }

  // 1. Cap max_workers (always fixable)
  if (fixed.var_workers > rules.max_workers) {
    issues.push('too_many_workers');
    fixed.var_workers   = rules.max_workers;
    fixed._worker_count = fixed.var_workers;
  }

  // 2. Always inject forbidden terms into exclude so DALL-E avoids them
  if (rules.forbidden?.length) {
    fixed.exclude = [...new Set([...(fixed.exclude || []), ...rules.forbidden])];
  }

  // 3. Check forbidden scenario in worker description — attempt regen
  const _descHasForbidden = (d) => (rules.forbidden || []).some(f =>
    d.includes(f.toLowerCase().split(' ').slice(0, 4).join(' '))
  );
  if (_descHasForbidden((fixed.var_worker_desc || '').toLowerCase())) {
    issues.push('forbidden_action_in_desc');
    fixed.var_worker_desc = _buildWorkerDesc(fixed._matched_key, fixed.var_workers,
      _hashSeed(`${fixed._matched_key}${fixed._matched_service || ''}regen1`), rules);
  }

  // 4. Check safety terms in description — attempt regen
  const _descMissesSafety = (d) => (rules.safety_required || []).length > 0 &&
    !rules.safety_required.some(s => d.includes(s.split(' ')[0].toLowerCase()));
  if (_descMissesSafety((fixed.var_worker_desc || '').toLowerCase())) {
    issues.push('missing_safety_mention');
    fixed.var_worker_desc = _buildWorkerDesc(fixed._matched_key, fixed.var_workers,
      _hashSeed(`${fixed._matched_key}${fixed._matched_service || ''}regen2`), rules);
  }

  // 5. Final check: if description still fails safety after 2 regen attempts → fallback to none
  const descFinal = (fixed.var_worker_desc || '').toLowerCase();
  const unresolvable = _descHasForbidden(descFinal) ||
    (issues.includes('forbidden_action_in_desc') && _descMissesSafety(descFinal));
  if (unresolvable) {
    issues.push('fallback_to_none');
    fixed.var_presence = 'none';
    fixed.var_workers  = 0;
    fixed.no_people    = true;
    fixed._worker_count = 0;
    delete fixed.var_worker_desc;
    delete fixed._worker_action;
    delete fixed._worker_access_mode;
    delete fixed._worker_safety_mode;
  }

  fixed._worker_validation_issues = issues.length ? issues : null;
  return { ok: issues.length === 0, issues, fixedStr: JSON.stringify(fixed) };
}

// Returns a deterministic shuffled array of presences for a whole batch.
// Guarantees the target distribution across the batch instead of independent per-image rolls.
function _buildPresencePlan(imageCount, stateLevel, key, seed) {
  const _dist = {
    debut:     { workers: 0.60, none: 0.35, indirect: 0.05 },
    encours:   { workers: 0.50, none: 0.45, indirect: 0.05 },
    semifinal: { workers: 0.30, none: 0.65, indirect: 0.05 },
    final:     { workers: 0.075, none: 0.875, indirect: 0.05 },
  };
  const d = _dist[stateLevel] || _dist.encours;
  const n = Math.max(1, imageCount);

  // indirect always at least 0 (rounds to 0 for small batches), workers fills proportionally
  const nIndirect = Math.max(0, Math.min(1, Math.round(n * d.indirect)));
  const remain    = n - nIndirect;
  const nWorkers  = Math.max(0, Math.round(remain * (d.workers / (d.workers + d.none))));
  const nNone     = n - nWorkers - nIndirect;

  const plan = [
    ...Array(nWorkers).fill('workers'),
    ...Array(Math.max(0, nNone)).fill('none'),
    ...Array(nIndirect).fill('indirect'),
  ];

  // Seeded full shuffle using _pick (re-picks entire array = shuffle)
  return _pick(plan, plan.length, seed);
}

function _assertFinalWorkerConsistency(scene) {
  const sceneWorkers  = scene.var_workers || 0;
  const scenePresence = scene.var_presence || 'none';
  const hasWorkers    = sceneWorkers > 0 || scenePresence === 'workers';

  if (hasWorkers && scene.no_people === true) {
    throw new Error(
      `[WORKER_PROMPT_CONTRADICTION] var_workers=${sceneWorkers} var_presence=${scenePresence} but no_people=true`
    );
  }

  if (hasWorkers)  scene.no_people = false;
  if (!hasWorkers) scene.no_people = true;
}

export { _buildWorkerDesc, _validateWorkerScene, _buildPresencePlan, _assertFinalWorkerConsistency };
