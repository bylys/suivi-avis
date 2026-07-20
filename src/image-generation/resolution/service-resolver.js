/**
 * resolution/service-resolver.js — Phase 3 shadow copy (source active : app.js)
 * Résolution du groupe de service, de la scène métier et du setting.
 * Ne pas modifier avant le cutover validé.
 */

import { SITE_REALISM } from '../services/index.js';
import { _hashSeed, _pick } from '../utils/deterministic.js';

const CAMERA_DEFECTS_LIB = {
  common: [
    'slight horizon tilt of 2–3°, phone not perfectly level',
    'mild overexposure in bright sky or wall areas',
    'light JPEG compression artifacts',
    'slight barrel distortion at edges',
    'muted color saturation — smartphone auto mode',
    'minor motion blur on foreground detail',
  ],
  rare: [
    'finger partially visible at frame corner',
    'obvious lens smudge on one side',
    'water droplet on lens surface',
    'partial garden gate post or fence rail at the frame edge',
    'slight thumb shadow at the bottom left corner',
    'work van or truck partially visible at the frame edge — not the main subject',
  ],
};

const _REALISM_COUNTS = {
  debut:     { tools: 3, protections: 2, details: 2 },
  encours:   { tools: 2, protections: 1, details: 2 },
  semifinal: { tools: 1, protections: 0, details: 1 },
  final:     { tools: 0, protections: 0, details: 1 },
};

function _serviceGroup(matchedService) {
  const s = (matchedService || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (/batterie|demarrage|boost/.test(s))                                           return 'batterie';
  if (/crevaison|roue|pneu/.test(s))                                                return 'crevaison';
  if (/remorquage|remorque|transport|treuil|enlevement.*vehicule|enlevement.*voiture/.test(s)) return 'remorquage';
  if (/ouverture|ouvert|cles.*enferm|deverrouillage|verrouillage/.test(s))          return 'ouverture';
  return 'default';
}

function _applySiteRealism(jsonStr, imageIndex) {
  let obj;
  try { obj = JSON.parse(jsonStr); } catch { return jsonStr; }

  const sceneKey   = obj._matched_key;
  const realismRaw = SITE_REALISM[sceneKey];
  const counts     = _REALISM_COUNTS[obj.state_level] || _REALISM_COUNTS.encours;
  const seed       = _hashSeed(`${sceneKey || ''}${obj.state_level || ''}${imageIndex}`);

  // Dispatch: select sub-entry by service or contexte when _dispatch is set
  let realism = realismRaw;
  if (realismRaw) {
    if (realismRaw._dispatch === 'service') {
      const bucket = _serviceGroup(obj._matched_service);
      realism = realismRaw[bucket] || realismRaw.default || null;
    } else if (realismRaw._dispatch === 'contexte') {
      realism = realismRaw[obj.contexte] || realismRaw.default || null;
    }
    // Level 3: scenario pool — seed-pick by sub-service trigger
    let _intVariant = null;
    if (realism && Array.isArray(realism.scenarios)) {
      const trigger = realism._trigger_service;
      const svc = (obj._matched_service || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      if (!trigger || new RegExp(trigger).test(svc)) {
        const scenSeed = _hashSeed(`${sceneKey}${obj._matched_service || ''}${obj.state_level || ''}${imageIndex}`);
        const targeted  = realism.scenarios.filter(s => s._for && new RegExp(s._for, 'i').test(svc));
        const fallback  = realism.scenarios.filter(s => !s._for);
        const pool      = targeted.length ? targeted : fallback;
        const picked    = pool.length ? _pick(pool, 1, scenSeed)[0] : null;
        if (picked) {
          realism = Object.assign({}, realism, picked);
          if (realism.scene_camera)  obj.camera_position = realism.scene_camera;
          if (realism.scene_framing) obj.framing          = realism.scene_framing;
          if (realism.scene_debris)  obj.site_debris      = realism.scene_debris;
          if (Array.isArray(realism.scene_exclude)) obj.exclude = [...(obj.exclude || []), ...realism.scene_exclude];
          if (realism.time_of_day) obj.time_of_day = realism.time_of_day;
          if (realism.setting)    obj.setting     = realism.setting;
          if (realism.work_surface)                      obj.work_surface     = realism.work_surface;
          if (Array.isArray(realism.location_must_have)) obj.location_must_have = realism.location_must_have;
          if (Array.isArray(realism.location_forbidden)) obj.location_forbidden = realism.location_forbidden;
          if (realism.scene_contexte)                    obj.contexte           = realism.scene_contexte;
          _intVariant = picked.interior_variant || null;
        }
      }
    }
    // Inject context-specific description into work_type for PromptBuilder
    if (realism && realism.scene_note) obj.work_type = realism.scene_note;
    // Apply interior variant when contexte is appartement and scenario defines one
    if (_intVariant && /^(appartement|studio)$/.test(obj.contexte || '')) {
      if (_intVariant.scene_note)           obj.work_type           = _intVariant.scene_note;
      if (_intVariant.scene_camera)         obj.camera_position     = _intVariant.scene_camera;
      if (_intVariant.scene_framing)        obj.framing             = _intVariant.scene_framing;
      if (_intVariant.setting)              obj.setting             = _intVariant.setting;
      if (Array.isArray(_intVariant.location_must_have)) obj.location_must_have = _intVariant.location_must_have;
      if (Array.isArray(_intVariant.location_forbidden)) obj.location_forbidden = _intVariant.location_forbidden;
      realism = Object.assign({}, realism, {
        tools:            _intVariant.tools            || realism?.tools,
        protections:      _intVariant.protections      || realism?.protections,
        chantier_details: _intVariant.chantier_details || realism?.chantier_details,
      });
    }
  }

  // Camera defects — drawn from global library (2 common, rare at ~5%)
  const defects = _pick(CAMERA_DEFECTS_LIB.common, 2, seed + 3);
  if (_hashSeed(`${sceneKey}${imageIndex}rare`) % 20 === 0) {
    const rare = _pick(CAMERA_DEFECTS_LIB.rare, 1, seed + 4);
    if (rare.length) defects.push(rare[0]);
  }
  obj.photo_defects = defects;

  // Realism layer — only when scene has data (graceful stub passthrough)
  if (realism) {
    obj.site_tools       = _pick(realism.tools,            counts.tools,       seed);
    obj.site_protections = _pick(realism.protections,      counts.protections, seed + 1);
    obj.site_details     = _pick(realism.chantier_details, counts.details,     seed + 2);
  }

  return JSON.stringify(obj);
}

function _resolveServiceSetting(metier, travaux, defaultSetting) {
  const svc = (travaux || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const met = (metier  || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (met === 'peinture') {
    if (/chambre|salon|cuisine|couloir|plafond|interieur|interieure|cage.*escal|boiserie.*int|papier.*peint|enduit.*decor/.test(svc))
      return 'interior';
    if (/facade|volet|portail|cloture|exterieur|exterieure|boiserie.*ext|sous.*face|soffit/.test(svc))
      return 'exterior';
  }
  if (met === 'debarras') {
    if (/cave|appartement|studio|grenier|sous.*sol|comble|interieur|interieure|piece|bureau|chambre|couloir/.test(svc))
      return 'interior';
  }
  if (met === 'carrelage') {
    // Explicit exterior services — must precede interior check and defaultSetting.
    // Without this, WORK_SCENES['carrelage'].setting='interior' would propagate to terrasse/dallage.
    if (/terrasse|dallage|ext[eé]rieur/.test(svc))
      return 'exterior';
    if (/salle.*bain|salle.*eau|cuisine.*sol|salon.*sol|chambre.*sol|couloir.*sol|interieur|interieure/.test(svc))
      return 'interior';
  }
  return defaultSetting;
}

export { _serviceGroup, _applySiteRealism, _resolveServiceSetting };
