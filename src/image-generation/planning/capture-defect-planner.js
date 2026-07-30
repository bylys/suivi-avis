/**
 * planning/capture-defect-planner.js — Phase 4 shadow copy (source active : app.js)
 * Sélection déterministe des défauts photographiques par batch.
 * Ne pas modifier avant le cutover validé.
 */

import { CAPTURE_DEFECTS, CAPTURE_DEFECT_OPTICAL_KEYS } from '../config/capture-defects.js';
import { _hashSeed } from '../utils/deterministic.js';

// Distribution: 70% none · 25% one light · 5% one optical (edge-only).
// Single-defect output only — never two defects per image.
// lens_crack is globally disabled (not in pool).
function _selectCaptureDefects(batchIndex, batchTotal, seed, metier, service) {
  const _svc = (service || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  // Finger completely forbidden for gutter cleaning.
  const fingerForbidden =
    metier === 'nettoyage_gouttieres' ||
    /nettoyage.*gouttieres?|entretien.*gouttieres?|curage.*gouttieres?|debouchage.*gouttieres?/.test(_svc);

  // Tier selection: 0–69 = none, 70–94 = light (25%), 95–99 = optical (5%)
  const tierRoll = _hashSeed(`defects|tier|${seed}|${batchIndex}`) % 100;

  if (tierRoll < 70) return [];

  const isOptical = tierRoll >= 95;

  if (isOptical) {
    const pool = CAPTURE_DEFECT_OPTICAL_KEYS.filter(k => !(k === 'finger_edge' && fingerForbidden));
    const key  = pool[_hashSeed(`defects|optical|${seed}|${batchIndex}`) % pool.length];
    return [{ key, prompt: CAPTURE_DEFECTS[key].prompt, source: 'optical' }];
  }

  // Light tier — weighted random from non-optical keys
  const lightKeys = Object.keys(CAPTURE_DEFECTS).filter(k => !CAPTURE_DEFECT_OPTICAL_KEYS.includes(k));
  const weights   = lightKeys.map(k => CAPTURE_DEFECTS[k].weight);
  const totalW    = weights.reduce((a, b) => a + b, 0);
  const roll      = _hashSeed(`defects|light|${seed}|${batchIndex}`) % totalW;
  let cum = 0, chosen = lightKeys[0];
  for (let i = 0; i < lightKeys.length; i++) {
    cum += weights[i];
    if (roll < cum) { chosen = lightKeys[i]; break; }
  }
  return [{ key: chosen, prompt: CAPTURE_DEFECTS[chosen].prompt, source: 'light' }];
}

export { _selectCaptureDefects };
