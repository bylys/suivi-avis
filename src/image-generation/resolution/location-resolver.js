/**
 * resolution/location-resolver.js — Phase 3 shadow copy (source active : app.js)
 * Résolution du lieu, du sous-type et de la surface de travail pour une scène image.
 * Ne pas modifier avant le cutover validé.
 */

import {
  LOCATION_RULES, TRIANGLE_RULES,
  _CONTEXTE_TO_LOCATION, _CONTEXTE_OPTIONS_TO_LOCATION,
  LOCATION_ALIASES, DEFAULT_LOCATION_BY_METIER,
  LOCATION_SUBTYPE_COMPATIBILITY,
  WORK_SURFACE_BY_SUBTYPE, WORK_SURFACE_SERVICE_OVERRIDES,
} from '../config/locations.js';
import { PHOTO_COMPOSITIONS, _COMPOSITION_DIST, CAMERA_COMPOSITIONS } from '../config/compositions.js';
import { PROFESSIONAL_VEHICLE_RULES } from '../config/vehicles.js';
import { _hashSeed, _pick } from '../utils/deterministic.js';

function _normalizeLocationKey(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function _resolveCompatibleSubtype({ locationType, normKey, normService, seed }) {
  const allSubtypes = LOCATION_RULES[locationType]?.subtypes || [];
  if (!allSubtypes.length) return null;

  const compat = LOCATION_SUBTYPE_COMPATIBILITY[locationType];
  if (!compat) return _pick(allSubtypes, 1, seed)[0] || null;

  // Search longest key first (object insertion order is already specificity-ordered)
  const combined = normService + ' ' + normKey;
  let pool = null;
  for (const k of Object.keys(compat)) {
    if (combined.includes(k)) { pool = compat[k]; break; }
  }
  if (!pool) pool = allSubtypes; // no match → unrestricted

  const valid = pool.filter(s => allSubtypes.includes(s));
  return _pick(valid.length ? valid : allSubtypes, 1, seed)[0] || null;
}

// ─── Resolve work_surface from subtype + service ─────────────────────────────────────────────────
function _resolveWorkSurface(subtype, normService) {
  // Service keyword overrides take priority
  for (const k of Object.keys(WORK_SURFACE_SERVICE_OVERRIDES)) {
    if (normService.includes(k)) return WORK_SURFACE_SERVICE_OVERRIDES[k];
  }
  // Subtype-specific default, then fallback to the subtype string itself
  return WORK_SURFACE_BY_SUBTYPE[subtype] || (subtype ? String(subtype) : null);
}

function _resolveLocationAndComposition(jsonStr, imageIndex) {
  let obj;
  try { obj = JSON.parse(jsonStr); } catch { return jsonStr; }

  const key  = obj._matched_key || '';
  const ctx  = obj.contexte || '';

  // 1. Location type — 5-step resolution chain (first match wins)
  const normCtx  = _normalizeLocationKey(ctx);
  const normKey  = _normalizeLocationKey(key);
  const locType  = _CONTEXTE_TO_LOCATION[key]?.[ctx]          // a. specific métier map
                || _CONTEXTE_OPTIONS_TO_LOCATION[ctx]          // b. generic CONTEXTE_OPTIONS
                || LOCATION_ALIASES[normCtx]                   // c. alias / synonym
                || (LOCATION_RULES[normCtx] ? normCtx : null)  // d. direct LOCATION_RULES match
                || DEFAULT_LOCATION_BY_METIER[normKey]         // e. per-métier fallback
                || null;
  if (!locType || !LOCATION_RULES[locType]) {
    console.warn(`[LOCATION_UNRESOLVED] métier=${key} contexte=${ctx}`);
  }
  const locRules = locType ? LOCATION_RULES[locType] : null;
  obj.location_type = locType || null;

  if (locRules) {
    const stSeed     = _hashSeed(`${key}|${ctx}|subtype${imageIndex}`);
    const normKey    = _normalizeLocationKey(key);
    const normSvc    = _normalizeLocationKey(obj._matched_service || '');

    // Subtype — compatibility-aware selection (service + métier drive the eligible list)
    obj.location_subtype = _resolveCompatibleSubtype({
      locationType: locType, normKey, normService: normSvc, seed: stSeed,
    });

    // Work surface — derived from subtype + service
    if (obj.location_subtype) {
      obj.work_surface = _resolveWorkSurface(obj.location_subtype, normSvc);
    }

    // Pick 1-2 core must_have elements (not all — avoid prompt overload)
    const coreSeed = _hashSeed(`${key}|${ctx}|core${imageIndex}`);
    const coreN    = locRules.must_have.length > 1 ? (1 + (coreSeed % 2)) : 1;
    obj.location_must_have = _pick(locRules.must_have, coreN, coreSeed);

    // Pick 1-3 optional supporting details from may_have
    if (locRules.may_have?.length) {
      const suppSeed = _hashSeed(`${key}|${ctx}|supp${imageIndex}`);
      const suppN    = Math.min(3, locRules.may_have.length, 1 + (suppSeed % 3));
      obj.location_supporting = _pick(locRules.may_have, suppN, suppSeed);
    }

    if (locRules.forbidden?.length) {
      obj.exclude = [...new Set([...(obj.exclude || []), ...locRules.forbidden])];
    }
  }

  // 2. Triangle rule — forbidden locations get explicit triangle exclusions
  const triRules = TRIANGLE_RULES[locType] || null;
  obj.triangle_rule = triRules ? triRules.default : null;
  if (triRules?.default === 'forbidden') {
    obj.exclude = [...new Set([...(obj.exclude || []), 'warning triangle', 'safety triangle', 'emergency warning triangle'])];
  }

  // 3. Composition — batch-pre-assigned or weighted draw per métier
  if (obj._pre_assigned_composition && PHOTO_COMPOSITIONS[obj._pre_assigned_composition]) {
    obj.composition = obj._pre_assigned_composition;
  } else {
    const compDist = _COMPOSITION_DIST[key] || _COMPOSITION_DIST.default;
    const compRoll = _hashSeed(`${key}|${ctx}|comp${imageIndex}`) % 100;
    let cumulative = 0;
    obj.composition = 'medium_intervention';
    for (const comp in compDist) {
      cumulative += compDist[comp];
      if (compRoll < cumulative) { obj.composition = comp; break; }
    }
  }
  const compDef = PHOTO_COMPOSITIONS[obj.composition];
  if (compDef) obj.composition_desc = compDef.description;
  // Camera distance from CAMERA_COMPOSITIONS
  const camCompDef = CAMERA_COMPOSITIONS[obj.composition];
  if (camCompDef) obj.camera_distance = camCompDef.distance;

  // 4. Professional vehicle — generalized for all métiers, linked to composition
  {
    const pvSeed   = _hashSeed(`${key}|${ctx}|pvehicle${imageIndex}`);
    const pvRoll   = pvSeed % 100;
    const comp     = obj.composition;
    const pvRules  = PROFESSIONAL_VEHICLE_RULES[key] || {};
    const d        = pvRules.dist || { clearly_visible: 35, partially_visible: 25, absent: 40 };
    let pvPresence;
    if (obj._pre_assigned_vehicle) {
      pvPresence = obj._pre_assigned_vehicle;
    } else if (comp === 'vehicle_arrival') {
      pvPresence = 'clearly_visible';
    } else if (comp === 'equipment_from_vehicle') {
      pvPresence = pvRoll < 70 ? 'clearly_visible' : 'partially_visible';
    } else if (comp === 'close_detail') {
      pvPresence = pvRoll < 85 ? 'absent' : 'partially_visible';
    } else {
      pvPresence = pvRoll < d.clearly_visible                           ? 'clearly_visible'
                 : pvRoll < (d.clearly_visible + d.partially_visible)  ? 'partially_visible'
                 : 'absent';
    }
    obj.professional_vehicle_presence = pvPresence;
  }

  return JSON.stringify(obj);
}

export { _normalizeLocationKey, _resolveCompatibleSubtype, _resolveWorkSurface, _resolveLocationAndComposition };
