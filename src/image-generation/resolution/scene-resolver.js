/**
 * resolution/scene-resolver.js — Phase 3 shadow copy (source active : app.js)
 * Résolution de la variation de scène : caméra, lumière, cadrage, auteur, présence workers.
 * Responsabilité : var_camera, var_light, var_framing, var_author, var_presence, var_workers,
 * no_people, var_worker_desc — champs qui enrichissent la scène avant génération.
 * Ne pas modifier avant le cutover validé.
 */

import { WORK_SCENES } from '../services/index.js';
import { WORKER_SCENE_RULES } from '../safety/worker-rules.js';
import { _buildWorkerDesc } from '../safety/worker-validator.js';
import { _hashSeed, _pick } from '../utils/deterministic.js';

const VARIATION_ENGINE = {
  camera_angles: {
    exterior: [
      'from the garden path, centred on the house facade',
      'from the driveway edge, slight left offset',
      'oblique view from the side, 30° angle to the facade',
      'closer crop, work area fills most of frame',
      'stepped back, wider context showing surrounding garden',
    ],
    interior: [
      'standing in the doorway, full room depth visible',
      'crouching at floor level, work edge prominent in foreground',
      'standing to the side, oblique view of the work surface',
      'slightly elevated angle looking down at the floor',
    ],
    roof: [
      'from the parapet corner, diagonal view across the membrane surface',
      'low angle along the roof surface, parapet at the horizon',
      'wide shot showing the full flat roof with parapet all around',
      'close crop focused on the lap joint or flashing detail',
    ],
    roadside: [
      'from the pavement behind the vehicle, 4 m back',
      'from the side of the road at the vehicle mid-point',
      'slight low angle showing the wheel arch and road surface',
      'wide shot including road and surrounding context',
    ],
    garden: [
      'from the garden entrance, full planting border visible',
      'standing beside the work area, close oblique view',
      'low angle at plant level, open sky visible behind',
      'wide shot showing house facade and garden together',
    ],
    customer: [
      'standing in the garden 5–8 m from the house, phone held loosely at chest height — casual snapshot',
      'from the end of the driveway looking toward the front of the house, full facade in frame',
      'from the pavement in front of the property, slight upward tilt toward the upper storey',
      'standing at the open garden gate, gate post partially framing the left edge',
      'from the terrace or patio, looking across the garden toward the work area on the house',
      'seated in a parked car, taken through the open side window toward the house facade',
      'wide shot from 8–12 m back — full facade and surrounding garden context in frame',
      'from just inside the front door or a ground-floor window, looking out at the work',
      'low angle from the garden path, foreground lawn or paving surface visible below',
    ],
    neighbor: [
      'from the adjacent property\'s driveway, peering slightly sideways over the low fence',
      'from the public pavement across the road, opposite side of the street, slight oblique angle',
      'from the shared garden boundary — hedge or fence post partially in the foreground',
    ],
  },
  light_quality: [
    { text: 'soft overcast light, no hard shadows',           meteo: ['nuageux', 'brumeux', 'auto'] },
    { text: 'bright midday sun, short shadows on ground',     meteo: ['soleil', 'auto'] },
    { text: 'warm afternoon light raking from the left',      meteo: ['soleil', 'auto'] },
    { text: 'slightly hazy morning light, cool tones',        meteo: ['nuageux', 'brumeux', 'auto'] },
    { text: 'flat white sky, very diffuse even light',        meteo: ['nuageux', 'auto'] },
    { text: 'broken cloud, intermittent sunlight patches',    meteo: ['nuageux', 'soleil', 'auto'] },
    { text: 'heavy overcast, grey sky, damp atmosphere',      meteo: ['pluie', 'nuageux', 'auto'] },
    { text: 'flat grey light after recent rain',              meteo: ['pluie', 'auto'] },
  ],
  framing_emphasis: [
    'foreground tools prominent, midground subject clear',
    'balanced foreground and midground, no dominant element',
    'midground as main subject, foreground detail secondary',
    'wide establishing shot, full site context visible',
    'work van or pickup visible in the background — adds professional context without dominating',
    'slightly wide shot, surrounding street or garden environment visible at the frame edges',
  ],
};

function _applyVariation(jsonStr, imageIndex, presenceOverride) {
  let obj;
  try { obj = JSON.parse(jsonStr); } catch { return jsonStr; }

  const seed = _hashSeed(
    `${obj._matched_key || ''}|${obj._matched_service || ''}|${obj.location || ''}|${obj.state_level || ''}|${imageIndex}`
  );

  // Detect meteo from scene light string to filter compatible light variants
  const lc = (obj.light || '').toLowerCase();
  const meteo = /rain|wet surface|heavy cloud|dark heavy/.test(lc) ? 'pluie'
              : /hazy milky|very low contrast/.test(lc)            ? 'brumeux'
              : /overcast|grey|muted color/.test(lc)               ? 'nuageux'
              : /bright|midday sun|blue sky/.test(lc)              ? 'soleil'
              : 'auto';

  // Camera angles — prefer variation_setting on WORK_SCENES entry over generic setting
  const sceneKey = obj._matched_key;
  const vSetting = (WORK_SCENES[sceneKey] || {}).variation_setting || obj.setting || 'exterior';
  const angleLib = VARIATION_ENGINE.camera_angles[vSetting] || VARIATION_ENGINE.camera_angles.exterior;

  // Light — only pick from options compatible with the chosen meteo
  const lightLib = VARIATION_ENGINE.light_quality.filter(q => q.meteo.includes(meteo)).map(q => q.text);

  obj.var_camera  = _pick(angleLib,                             1, seed     )[0] || null;
  obj.var_light   = obj.time_of_day === 'night'
    ? 'work floodlight as the main light source, dark background, slightly underexposed smartphone photo'
    : (lightLib.length ? _pick(lightLib, 1, seed + 7)[0] : null);
  obj.var_framing = _pick(VARIATION_ENGINE.framing_emphasis,   1, seed + 13)[0] || null;

  // Camera author — customer 80% / contractor 15% / neighbor 5%
  const authorRoll = seed % 100;
  obj.var_author = authorRoll < 80 ? 'customer'
                 : authorRoll < 95 ? 'contractor'
                 : 'neighbor';

  // 3-category presence: none / workers / indirect — state-conditional distribution
  const _presenceDist = {
    debut:     { none: 30, workers: 65, indirect: 5 },
    encours:   { none: 45, workers: 50, indirect: 5 },
    semifinal: { none: 65, workers: 30, indirect: 5 },
    final:     { none: 88, workers:  7, indirect: 5 },
  };
  const _pd = _presenceDist[obj.state_level] || _presenceDist.encours;
  const workerSeed = _hashSeed(`${obj._matched_key || ''}${obj._matched_service || ''}workers${imageIndex}`);
  const workerRoll = workerSeed % 100;
  // presenceOverride from batch plan takes priority over per-image roll
  obj.var_presence = presenceOverride != null ? presenceOverride
                   : (workerRoll < _pd.none ? 'none'
                     : workerRoll < (_pd.none + _pd.workers) ? 'workers'
                     : 'indirect');

  if (obj.var_presence === 'none') {
    obj.var_workers = 0;
    obj.no_people   = true;
  } else if (obj.var_presence === 'indirect') {
    obj.var_workers = 0;
    obj.no_people   = true;
    const _iRules = WORKER_SCENE_RULES[obj._matched_key];
    const _iSeed  = _hashSeed(`${obj._matched_key || ''}${obj._matched_service || ''}indirect${imageIndex}`);
    obj.var_indirect_presence = _iRules
      ? (_pick(_iRules.presence_indirect, 1, _iSeed)[0] || null)
      : null;
  } else {
    const _wRules = WORKER_SCENE_RULES[obj._matched_key];
    const _maxW   = _wRules ? _wRules.max_workers : 2;
    const _cSeed  = _hashSeed(`${obj._matched_key || ''}${obj._matched_service || ''}count${imageIndex}`);
    const _dSeed  = _hashSeed(`${obj._matched_key || ''}${obj._matched_service || ''}desc${imageIndex}`);
    obj.var_workers     = (_cSeed % 100) < 65 ? 1 : Math.min(2, _maxW);
    obj.no_people       = false;
    obj.var_worker_desc = _buildWorkerDesc(obj._matched_key, obj.var_workers, _dSeed);
    // Worker detail debug fields (aligned with _dSeed for determinism)
    if (_wRules) {
      obj._worker_action      = _pick(_wRules.actions, 1, _dSeed + 11)[0] || null;
      obj._worker_access_mode = _pick(_wRules.access,  1, _dSeed + 17)[0] || null;
      obj._worker_safety_mode = (_wRules.safety_required || []).slice(0, 1).join(', ') || null;
    }
  }

  // For customer/neighbor authors, override var_camera with a matching perspective pool
  if (obj.var_author !== 'contractor') {
    const authorPool = obj.var_author === 'neighbor'
      ? (VARIATION_ENGINE.camera_angles.neighbor || VARIATION_ENGINE.camera_angles.exterior)
      : (VARIATION_ENGINE.camera_angles.customer || VARIATION_ENGINE.camera_angles.exterior);
    const authorSeed = _hashSeed(`${obj._matched_key || ''}${obj._matched_service || ''}author${imageIndex}`);
    obj.var_camera = _pick(authorPool, 1, authorSeed)[0] || obj.var_camera;
  }

  // Debug metadata
  obj._camera_author     = obj.var_author;
  obj._worker_count      = obj.var_workers;
  obj._variation_setting = vSetting;
  obj._presence          = obj.var_presence;

  return JSON.stringify(obj);
}

export { _applyVariation };
