/**
 * validation/scene-validator.js — Phase 4 shadow copy (source active : app.js)
 * Validation et correction de la cohérence des scènes résolues.
 * Ne pas modifier avant le cutover validé.
 */

import { WORKER_SCENE_RULES } from '../safety/worker-rules.js';

function _validateResolvedScene(jsonStr) {
  let obj;
  try { obj = JSON.parse(jsonStr); } catch { return { ok: true, issues: [], fixedStr: jsonStr }; }

  const issues  = [];
  const patched = Object.assign({}, obj);
  patched.exclude = [...(obj.exclude || [])];

  // C1: synchronise no_people FROM var_workers — var_workers is the source of truth
  if ((patched.var_workers || 0) > 0 && patched.no_people === true) {
    issues.push('C1: var_workers>0 overrides no_people=true — setting no_people=false');
    patched.no_people = false;
  }

  // C2: domicile context — ensure all triangle exclusions present
  if (patched.location_type === 'domicile' || patched.contexte === 'domicile') {
    const triTerms = ['warning triangle', 'safety triangle', 'emergency warning triangle', 'reflective warning triangle'];
    if (!triTerms.every(t => patched.exclude.includes(t))) {
      issues.push('C2: domicile — adding triangle exclusions');
      patched.exclude = [...new Set([...patched.exclude, ...triTerms])];
    }
  }

  // C3: garage_atelier — no triangle
  if (patched.location_type === 'garage_atelier') {
    const triTerms = ['warning triangle', 'emergency warning triangle'];
    if (!triTerms.every(t => patched.exclude.includes(t))) {
      issues.push('C3: garage_atelier — adding triangle exclusions');
      patched.exclude = [...new Set([...patched.exclude, ...triTerms])];
    }
  }

  // C4: aire_repos safely parked — no triangle
  if (patched.location_type === 'aire_repos' && patched.triangle_rule === 'forbidden_if_safely_parked') {
    const triTerms = ['warning triangle', 'emergency warning triangle'];
    if (!triTerms.every(t => patched.exclude.includes(t))) {
      issues.push('C4: aire_repos safely parked — adding triangle exclusions');
      patched.exclude = [...new Set([...patched.exclude, ...triTerms])];
    }
  }

  // C5: Worker count below min_workers_when_visible — only for human-facing compositions
  // close_detail can legitimately show 0 or 1 worker; never force min for it
  if (patched.var_presence === 'workers' && (patched.var_workers || 0) > 0 && patched.composition !== 'close_detail') {
    const wRules = WORKER_SCENE_RULES[patched._matched_key];
    const minW   = wRules?.min_workers_when_visible || 1;
    if ((patched.var_workers || 0) < minW) {
      issues.push(`C5: ${patched._matched_key} requires min ${minW} workers for composition=${patched.composition || 'default'} — was ${patched.var_workers}`);
      patched.var_workers = minW;
      patched.no_people   = false;
    }
  }

  // C6: toiture — pallet detected in site_tools
  if (patched._matched_key === 'toiture') {
    const toolsStr = JSON.stringify(patched.site_tools || []);
    if (/\bpallet\b/i.test(toolsStr)) {
      issues.push('C6: toiture — pallet in site_tools, adding exclusions');
      patched.exclude = [...new Set([...patched.exclude, 'full industrial pallet on pitched roof', 'pallet on pitched roof slope'])];
    }
  }

  // C7: entrepôt — pallets on roof surface (relevant for toiture/etancheite + entrepôt)
  if (patched.location_type === 'entrepot' && (patched._matched_key === 'toiture' || patched._matched_key === 'etancheite')) {
    patched.exclude = [...new Set([...patched.exclude, 'pallets placed on the roof surface'])];
  }

  // C8: appartement setting must be interior
  if (patched.location_type === 'appartement' && patched.setting !== 'interior') {
    issues.push('C8: appartement location — forcing setting to interior');
    patched.setting = 'interior';
  }

  if (!issues.length) return { ok: true, issues: [], fixedStr: jsonStr };
  return                  { ok: false, issues, fixedStr: JSON.stringify(patched) };
}

export { _validateResolvedScene };
