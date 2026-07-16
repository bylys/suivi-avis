/**
 * prompt/scene-builder.js — Phase 5 shadow copy (source active : app.js)
 * Construction du SceneJSON initial à partir d'une fiche et des données de service.
 * _getWorkDetail et buildDallePromptV2 acceptent un { lastMatchState } optionnel
 * pour que les tests de parité puissent comparer l'état de _lastMatch sans créer
 * une seconde variable globale. La production ne passe pas ce paramètre.
 * Ne pas modifier avant le cutover validé.
 */

import { WORK_SCENES } from '../services/index.js';
import { CONTEXTE_BY_METIER } from '../config/service-catalog.js';
import { _resolveServiceSetting } from '../resolution/service-resolver.js';

// Mirrors app.js normalizeStr (line 2793) — private to this module
function _normalizeStr(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// ─── INTERIOR_SCENE_BASE ──────────────────────────────────────────────────────
// Verbatim copy — app.js lines 13133–13147
const INTERIOR_SCENE_BASE = {
  camera_position: 'standing naturally inside the room near the doorway, smartphone held at chest height — casual handheld angle',
  framing: {
    work_pct:   55,
    foreground: 'protected floor edge with a canvas drop cloth, paint tray or part of the doorway frame',
    midground:  'wall or ceiling currently being painted — masking tape at the edges, fresh colour against the old',
    background: 'opposite interior wall, ordinary room depth with skirting board, door frame or window frame — no outdoor elements',
  },
  architecture: 'ordinary occupied French residential interior — plaster walls, skirting boards, standard doors and windows',
  light:        'soft natural daylight entering from the room window, supplemented by ordinary indoor ambient ceiling light',
  exclude: [
    'exterior facade', 'street', 'garden', 'pavement', 'scaffolding',
    'roof', 'open sky', 'outdoor architecture', 'house exterior',
  ],
};

// ─── _getCityContext ──────────────────────────────────────────────────────────
// Verbatim copy — app.js lines 4568–4648
function _getCityContext(ville) {
  const v = _normalizeStr(ville || '').toLowerCase();
  const regions = [
    { keys: ['paris', 'boulogne', 'vincennes', 'versailles', 'argenteuil', 'montreuil', 'neuilly', 'creteil', 'nanterre'],
      arch: 'classic Haussmann-style stone buildings with zinc rooftops and wrought-iron balconies',
      light: 'pale urban Île-de-France sky and diffuse city light' },
    { keys: ['lyon', 'villeurbanne', 'bron', 'venissieux'],
      arch: 'Lyonnais buildings with ochre plaster façades and terracotta roofs',
      light: 'soft Rhône valley light under a partly cloudy sky' },
    { keys: ['marseille', 'aix-en-provence', 'toulon', 'martigues'],
      arch: 'Provençal stone houses with pale limestone walls, terracotta roof tiles and blue shutters',
      light: 'bright Mediterranean sunshine, hard shadows, vivid blue sky' },
    { keys: ['bordeaux', 'merignac', 'pessac', 'libourne', 'talence'],
      arch: 'Bordelais Gironde-stone classical facades with dark slate roofs',
      light: 'mild Atlantic light and a pale grey-blue sky' },
    { keys: ['lille', 'roubaix', 'tourcoing', 'villeneuve', 'lens', 'valenciennes', 'dunkerque'],
      arch: 'Flemish red-brick townhouses with stepped gables and arched doorways',
      light: 'flat cold northern light under a wide grey sky' },
    { keys: ['strasbourg', 'mulhouse', 'colmar', 'haguenau'],
      arch: 'Alsatian half-timbered colombage houses with steep dark rooflines and coloured facades',
      light: 'crisp Alsatian light under a pale high-pressure sky' },
    { keys: ['nantes', 'saint-nazaire'],
      arch: 'Loire Atlantique town houses with grey slate roofs and pale stone facades',
      light: 'soft Atlantic Loire light and a pale overcast sky' },
    { keys: ['angers'],
      arch: 'Maine-et-Loire schist and tuffeau stone houses with grey slate roofs',
      light: 'soft Loire Valley light and a slightly overcast pale sky' },
    { keys: ['tours', 'blois', 'orleans', 'chartres', 'amboise'],
      arch: '1970s suburban houses with white rendered facades and dark grey slate roofs typical of Touraine',
      light: 'soft, flat Loire Valley light and a pale milky sky' },
    { keys: ['caen', 'cherbourg', 'alençon', 'argentan'],
      arch: 'light-coloured Pierre de Caen limestone facades and dark slate roofs typical of Normandy',
      light: 'soft, hazy Normandy sky with diffuse Atlantic light' },
    { keys: ['rouen', 'le havre', 'evreux', 'dieppe'],
      arch: 'Norman half-timbered colombage facades or white-rendered post-war buildings with slate roofs',
      light: 'overcast Normandy sky, flat diffuse light' },
    { keys: ['rennes', 'brest', 'quimper', 'saint-brieuc', 'lorient', 'vannes'],
      arch: 'Breton granite stone houses with grey schist slate roofs',
      light: 'soft muted Atlantic Brittany light under a pale overcast sky' },
    { keys: ['toulouse', 'montpellier', 'nimes', 'perpignan', 'carcassonne'],
      arch: 'pink Toulouse brick townhouses or pale Languedoc limestone with clay roman-tile roofs',
      light: 'warm southern light and a clear Mediterranean blue sky' },
    { keys: ['grenoble', 'chambery', 'annecy', 'albertville'],
      arch: 'Alpine-style buildings with wooden balconies and stone basements against a mountain backdrop',
      light: 'crisp clear alpine light and a brilliant high sky' },
    { keys: ['nice', 'cannes', 'antibes', 'grasse', 'frejus'],
      arch: 'Belle Époque villas with pastel ochre and salmon facades and terracotta canal-tile roofs',
      light: 'brilliant Côte d\'Azur sunshine and a deep blue Mediterranean sky' },
    { keys: ['amiens', 'beauvais', 'compiegne', 'soissons'],
      arch: 'red-brick Picard houses with grey slate roofs',
      light: 'flat diffuse northern Picard light under a pale overcast sky' },
    { keys: ['dijon', 'chalon', 'macon', 'auxerre'],
      arch: 'Burgundy tuffeau stone townhouses with distinctive polychrome glazed tile roofs',
      light: 'mild Burgundy continental light under a partly cloudy sky' },
    { keys: ['metz', 'nancy', 'reims', 'troyes'],
      arch: 'golden Lorraine stone townhouses or Champagne chalk-stone facades with slate roofs',
      light: 'clear continental light and a high pale sky' },
    { keys: ['besancon', 'belfort', 'montbeliard'],
      arch: 'Franche-Comté stone houses with steep grey roofs',
      light: 'clear continental Franche-Comté light under a partly cloudy sky' },
    { keys: ['clermont', 'vichy', 'aurillac'],
      arch: 'dark volcanic basalt Auvergne buildings with dark grey steep roofs',
      light: 'clear Massif Central light under an open sky' },
    { keys: ['limoges', 'angouleme', 'perigueux'],
      arch: 'Limousin or Périgord stone houses with brown clay tile or grey slate roofs',
      light: 'mild Atlantic inland light and a soft partly cloudy sky' },
    { keys: ['poitiers', 'la rochelle', 'niort', 'rochefort'],
      arch: 'Poitevin or Charentais pale limestone houses with flat roman clay-tile roofs',
      light: 'Atlantic coastal light and a pale sea-sky' },
    { keys: ['toulon', 'saint-tropez', 'hyeres'],
      arch: 'Provençal village houses with pastel rendered facades and terracotta roof tiles',
      light: 'brilliant Var sunshine and a vivid blue sky' },
  ];
  for (const r of regions) {
    if (r.keys.some(k => v.includes(_normalizeStr(k).toLowerCase()))) return r;
  }
  return {
    arch: 'typical French suburban houses with classic slate rooftops and rendered facades',
    light: 'natural French daylight under a pale European sky'
  };
}

// ─── _getWorkDetail ───────────────────────────────────────────────────────────
// Verbatim logic — app.js lines 4518–4566
// _lm: optional mutable object written with match metadata (mirrors global _lastMatch).
function _getWorkDetail(travaux, _lm) {
  const t = (travaux || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');

  let best = null, bestKey = null, bestFinal = 0, bestCat = null, bestPhrases = [];

  for (const [name, scene] of Object.entries(WORK_SCENES)) {
    const excluded = (scene.exclude_if || []).some(rule => {
      if (typeof rule === 'string') return t.includes(rule);
      return t.includes(rule.phrase) && !t.includes(rule.unless);
    });
    if (excluded) continue;

    let score = 0;
    const matched = [];
    for (const kw of (scene.service_keywords || [])) {
      if (t.includes(kw.phrase)) { score += kw.score; matched.push(kw.phrase); }
    }
    if (score === 0) continue;

    const finalScore = score + (scene.priority || 1) * 0.1;
    if (finalScore > bestFinal) {
      bestFinal = finalScore; best = scene; bestKey = name;
      bestCat = scene.category || name; bestPhrases = matched;
    }
  }

  if (_lm) {
    _lm.matched_category = bestCat || '(fallback)';
    _lm.matched_key      = bestKey || '(fallback)';
    _lm.matched_service  = bestPhrases[0] || (travaux || '');
    _lm.match_score      = Math.round(bestFinal * 10) / 10;
  }

  return best || {
    intro:      travaux || 'renovation work at a residential property',
    setting:    'exterior', secteur: 'contractor', hasWorkers: false,
    camera:     'standing near the work, eye level',
    materials:  [],
    photo_defects: ['JPEG compression artifacts', 'slightly tilted horizon'],
    exclusions: ['workers', 'tools', 'safety equipment', 'people'],
    states: {
      debut:     { framing: { work_pct: 40, foreground: 'first materials staged on site', midground: 'work area prepared, job just starting', background: 'garden or street' }, debris: 'light dust and material packaging', description: 'Work is just starting.' },
      encours:   { framing: { work_pct: 55, foreground: 'materials and construction debris', midground: 'work actively in progress', background: 'adjacent structure or garden' }, debris: 'construction debris and material scraps', description: 'Work is actively underway.' },
      semifinal: { framing: { work_pct: 60, foreground: 'last remaining materials near the wall', midground: 'work nearly complete', background: 'garden or street' }, debris: 'minimal debris, site being tidied', description: 'Work is nearly finished.' },
      final:     { framing: { work_pct: 65, foreground: 'clean site, minimal remaining material', midground: 'completed work visible', background: 'garden, street or neighbouring property' }, debris: 'nearly none', description: 'Work is complete. Clean professional result.' },
    },
  };
}

// ─── buildDallePromptV2 ───────────────────────────────────────────────────────
// Verbatim logic — app.js lines 13171–13239
// { lastMatchState }: optional mutable object populated with match metadata.
// Mirrors the side-effect on global _lastMatch. Tests pass this to verify parity.
function buildDallePromptV2(row, { lastMatchState } = {}) {
  const _lm = lastMatchState || {};
  let work;
  if (row.metier && WORK_SCENES[row.metier]) {
    work = WORK_SCENES[row.metier];
    _lm.matched_category = work.category || row.metier;
    _lm.matched_key      = row.metier;
    _lm.matched_service  = row.travaux || '';
    _lm.match_score      = 20;
  } else {
    work = _getWorkDetail(row.travaux, _lm);
  }
  const city = _getCityContext(row.ville);
  const resolvedSetting = _resolveServiceSetting(row.metier, row.travaux, work.setting);
  const isInt = resolvedSetting === 'interior';

  const stateKey = {
    desordre:  'debut',
    debut:     'debut',
    encours:   'encours',
    propre:    'semifinal',
    semifinal: 'semifinal',
    final:     'final',
  }[row.etat] || 'encours';

  const stateData = work.states?.[stateKey] || work.states?.encours || {};

  const meteo = {
    soleil:  'bright midday sun, short shadows, pale blue sky',
    nuageux: 'flat grey overcast, muted colors',
    brumeux: 'hazy milky overcast, very low contrast',
    pluie:   'dark heavy clouds, wet surfaces',
  }[row.meteo] || (isInt ? 'natural daylight from window' : city.light);

  const _metierCtx  = CONTEXTE_BY_METIER[row.metier];
  const roadContext = _metierCtx
    ? ((_metierCtx.find(o => o.value === row.contexte) || {}).desc || null)
    : ((work.context_map || {})[row.contexte] || null);

  const intBase = (resolvedSetting === 'interior' && work.setting !== 'interior')
    ? INTERIOR_SCENE_BASE : null;

  return JSON.stringify({
    photo_goal:        'work-progress documentation by French contractor, cheap Android smartphone',
    location:          (row.ville || '').trim() ? `${row.ville.trim()}, France` : 'France',
    work_type:         work.intro,
    setting:           resolvedSetting,
    state:             stateData.description || stateKey,
    state_level:       stateKey,
    camera_position:   intBase ? intBase.camera_position : work.camera,
    framing:           intBase ? intBase.framing : (stateData.framing || { work_pct: 55, foreground: '', midground: '', background: '' }),
    site_debris:       stateData.debris  || 'construction debris on site',
    photo_defects:     work.photo_defects,
    architecture:      intBase ? intBase.architecture : city.arch,
    light:             intBase ? intBase.light : meteo,
    contexte:          row.contexte || 'maison',
    roadside_context:  intBase ? null : roadContext,
    exclude:           intBase ? [...intBase.exclude, ...(work.exclusions || [])] : (work.exclusions || []),
    no_people:         !work.hasWorkers,
    _matched_category: _lm.matched_category,
    _matched_key:      _lm.matched_key,
    _matched_service:  _lm.matched_service,
    _match_score:      _lm.match_score,
  }, null, 2);
}

// ─── _validateScene ───────────────────────────────────────────────────────────
// Verbatim copy — app.js lines 13242–13257
function _validateScene(jsonStr) {
  let obj;
  try { obj = JSON.parse(jsonStr); } catch { return ['Invalid JSON scene']; }
  const issues = [];
  if (!obj.work_type)                        issues.push('work_type is missing');
  if (!obj.framing?.foreground)              issues.push('framing.foreground is missing');
  if (!obj.framing?.midground)               issues.push('framing.midground is missing');
  const _bg1 = (obj.framing?.background || '').toLowerCase();
  const _skyOpen1   = /\b(?:open\s+sky|sky\s+(?:in\s+(?:the\s+)?)?background|rooftops?\s+and\s+sky|garden\s+and\s+sky|sky\s+(?:above|overhead)|sky\s+visible\b)/.test(_bg1);
  const _skyWindow1 = /sky\s+(?:visible\s+)?through\s+(?:the\s+)?window|faint\s+sky\s+(?:through|behind)/.test(_bg1);
  if (obj.setting === 'interior' && _skyOpen1 && !_skyWindow1)
    issues.push('interior scene has open sky in background — incoherent');
  if (obj.setting === 'exterior' && (obj.camera_position || '').toLowerCase().includes('inside'))
    issues.push('exterior work but camera is described as inside');
  return issues;
}

// ─── _validateSceneStrict ─────────────────────────────────────────────────────
// Verbatim copy — app.js lines 13259–13282
function _validateSceneStrict(obj) {
  const issues = [];
  if (!obj.work_type)                          issues.push('work_type missing');
  if (!obj.state)                              issues.push('state missing');
  if (!obj.camera_position)                   issues.push('camera_position missing');
  if (!obj.framing?.foreground)               issues.push('framing.foreground missing');
  if (!obj.framing?.midground)                issues.push('framing.midground missing');
  if (!obj.framing?.background)               issues.push('framing.background missing');
  if (typeof obj.framing?.work_pct !== 'number') issues.push('framing.work_pct must be a number');
  if (!obj.site_debris)                       issues.push('site_debris missing');
  if (!obj.architecture)                      issues.push('architecture missing');
  if (!obj.light)                             issues.push('light missing');
  if (!['interior', 'exterior'].includes(obj.setting)) issues.push('setting must be interior or exterior');
  if (!Array.isArray(obj.photo_defects) || obj.photo_defects.length !== 2)
    issues.push('photo_defects must be an array of exactly 2 items');
  const _bg2 = (obj.framing?.background || '').toLowerCase();
  const _skyOpen2   = /\b(?:open\s+sky|sky\s+(?:in\s+(?:the\s+)?)?background|rooftops?\s+and\s+sky|garden\s+and\s+sky|sky\s+(?:above|overhead)|sky\s+visible\b)/.test(_bg2);
  const _skyWindow2 = /sky\s+(?:visible\s+)?through\s+(?:the\s+)?window|faint\s+sky\s+(?:through|behind)/.test(_bg2);
  if (obj.setting === 'interior' && _skyOpen2 && !_skyWindow2)
    issues.push('interior scene has open sky in background — incoherent');
  if (obj.setting === 'exterior' && (obj.camera_position || '').toLowerCase().includes('inside'))
    issues.push('exterior work but camera is inside — incoherent');
  return issues;
}

export {
  INTERIOR_SCENE_BASE,
  _getCityContext,
  _getWorkDetail,
  buildDallePromptV2,
  _validateScene,
  _validateSceneStrict,
};
