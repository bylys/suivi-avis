/**
 * planning/capture-defect-planner.js — Phase 4 shadow copy (source active : app.js)
 * Sélection déterministe des défauts photographiques par batch.
 * Ne pas modifier avant le cutover validé.
 */

import { CAPTURE_DEFECTS, CAPTURE_DEFECT_GROUPS } from '../config/capture-defects.js';
import { _hashSeed } from '../utils/deterministic.js';

// Returns 1 or 2 defect objects, varied across batch positions, never the same defect twice per image.
// Deterministic finger rule (scoped): only arboriste (elagage/abattage) and paysagiste/taille-de-haie
// apply the 1-in-3 restriction. All other métiers keep the original weighted-random behaviour.
function _selectCaptureDefects(batchIndex, batchTotal, seed, metier, service) {
  const _svc = (service || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const fingerScopeActive =
    metier === 'elagage' || metier === 'abattage' ||
    (metier === 'paysagiste' && /taille.*haie|haie/.test(_svc));
  const fingerAllowed = !fingerScopeActive || batchIndex % 3 === 0;
  const keys   = Object.keys(CAPTURE_DEFECTS).filter(k => k !== 'finger_edge' || fingerAllowed);
  const countS = _hashSeed(`defects|count|${seed}|${batchIndex}`);
  const count  = (countS % 4 === 0) ? 1 : 2;

  // Build defect → family lookup once
  const defectFamily = {};
  for (const [fam, members] of Object.entries(CAPTURE_DEFECT_GROUPS)) {
    for (const m of members) defectFamily[m] = fam;
  }

  const picked = [];
  const used   = new Set();

  for (let p = 0; p < count; p++) {
    // Exclude already-used keys AND all keys in the same family as any already-picked defect
    const usedFamilies = new Set(picked.map(k => defectFamily[k]).filter(Boolean));
    const available = keys.filter(k => !used.has(k) && !usedFamilies.has(defectFamily[k]));
    // Safety fallback: if all remaining keys share a family with picked, allow any unused
    const pool    = available.length ? available : keys.filter(k => !used.has(k));
    const weights = pool.map(k => CAPTURE_DEFECTS[k].weight);
    const totalW  = weights.reduce((a, b) => a + b, 0);
    const roll    = _hashSeed(`defects|pick${p}|${seed}|${batchIndex}`) % totalW;
    let cum = 0, chosen = pool[0];
    for (let i = 0; i < pool.length; i++) {
      cum += weights[i];
      if (roll < cum) { chosen = pool[i]; break; }
    }
    picked.push(chosen);
    used.add(chosen);
  }
  return picked.map(k => ({ key: k, prompt: CAPTURE_DEFECTS[k].prompt }));
}

export { _selectCaptureDefects };
