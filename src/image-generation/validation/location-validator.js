/**
 * validation/location-validator.js — Phase 4 shadow copy (source active : app.js)
 * Validation de la compatibilité sous-type / service / métier.
 * Ne pas modifier avant le cutover validé.
 */

import { LOCATION_RULES, LOCATION_SUBTYPE_COMPATIBILITY } from '../config/locations.js';
import { _normalizeLocationKey, _resolveCompatibleSubtype, _resolveWorkSurface } from '../resolution/location-resolver.js';
import { _hashSeed } from '../utils/deterministic.js';

function _validateLocationServiceCompatibility(jsonStr) {
  let obj;
  try { obj = JSON.parse(jsonStr); } catch { return { ok: true, issues: [], fixedStr: jsonStr }; }

  const issues  = [];
  const patched = Object.assign({}, obj);
  const locType  = patched.location_type;
  const locSub   = patched.location_subtype;
  if (!locType || !LOCATION_RULES[locType]) return { ok: true, issues: [], fixedStr: jsonStr };

  const normKey     = _normalizeLocationKey(patched._matched_key    || '');
  const normService = _normalizeLocationKey(patched._matched_service || '');
  const allSubtypes = LOCATION_RULES[locType].subtypes || [];

  // LSC1 — subtype not in the location's declared list
  if (locSub && !allSubtypes.includes(locSub)) {
    issues.push(`LSC1: "${locSub}" not in LOCATION_RULES.${locType}.subtypes — re-resolving`);
    patched.location_subtype = _resolveCompatibleSubtype({
      locationType: locType, normKey, normService,
      seed: _hashSeed(`${normKey}|${normService}|fix`),
    });
  }

  const combined = normService + ' ' + normKey;

  // LSC2 — toiture/couverture + immeuble_parties_communes
  if ((combined.includes('toiture') || combined.includes('couverture')) && locSub === 'immeuble_parties_communes') {
    issues.push('LSC2: toiture/couverture cannot use immeuble_parties_communes — correcting to immeuble_toiture_inclinee');
    patched.location_subtype = 'immeuble_toiture_inclinee';
  }

  // LSC3 — étanchéité membrane/toit-terrasse + immeuble_toiture_inclinee
  if ((combined.includes('terrasse') || combined.includes('membrane')) && locSub === 'immeuble_toiture_inclinee') {
    issues.push('LSC3: étanchéité toit-terrasse/membrane contradicts immeuble_toiture_inclinee — correcting');
    patched.location_subtype = 'immeuble_toit_terrasse';
  }

  // LSC4 — terrassement + scaffold/renovation subtype
  if (combined.includes('terrassement') && locSub === 'building renovation site with scaffold and hoarding') {
    issues.push('LSC4: terrassement incompatible with scaffold renovation — correcting');
    patched.location_subtype = allSubtypes.find(s => s.includes('trench') || s.includes('construction')) || allSubtypes[0];
  }

  // LSC5 — ravalement + immeuble but subtype is not immeuble_facade
  if (combined.includes('ravalement') && locType === 'immeuble' && locSub && locSub !== 'immeuble_facade') {
    issues.push(`LSC5: ravalement requires immeuble_facade — was "${locSub}"`);
    patched.location_subtype = 'immeuble_facade';
  }

  // Recompute work_surface after potential subtype correction
  const finalSub = patched.location_subtype;
  if (finalSub) {
    patched.work_surface = _resolveWorkSurface(finalSub, normService);
  }

  return {
    ok:       issues.length === 0,
    issues,
    fixedStr: JSON.stringify(patched),
  };
}

export { _validateLocationServiceCompatibility };
