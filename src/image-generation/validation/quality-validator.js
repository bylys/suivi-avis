/**
 * validation/quality-validator.js — Phase 4 shadow copy (source active : app.js)
 * Règles de qualité métier et détection de contradictions dans les scènes.
 * Ne pas modifier avant le cutover validé.
 */

import { _serviceGroup } from '../resolution/service-resolver.js';

const QUALITY_RULES = [
  {
    id:       'batterie_no_tyre',
    key:      'depannage_auto',
    when:     (obj) => _serviceGroup(obj._matched_service) === 'batterie',
    scan:     ['site_tools', 'site_details', 'framing'],
    forbidden: /hydraulic.?jack|lug.?wrench|spare.?wheel|flat.?tyre|flat.?tire|wheel.?nut/i,
    issue:    'batterie dispatch — outils de crevaison détectés (cric / roue)',
    fix:      { type: 'addExclusions', terms: ['hydraulic jack', 'lug wrench', 'spare wheel', 'flat tyre', 'wheel nuts'] },
  },
  {
    id:       'crevaison_no_cables',
    key:      'depannage_auto',
    when:     (obj) => _serviceGroup(obj._matched_service) === 'crevaison',
    scan:     ['site_tools', 'site_details'],
    forbidden: /jump.?start|booster.?pack|battery.*booster|jump.*cable|clamp.*connector.*battery|battery.*terminal/i,
    issue:    'crevaison dispatch — câbles / booster détectés',
    fix:      { type: 'addExclusions', terms: ['jump-start cable', 'battery booster pack', 'booster clamp', 'battery terminal clamp'] },
  },
  {
    id:       'etancheite_maison_no_immeuble',
    key:      'etancheite',
    when:     (obj) => obj.contexte === 'maison',
    scan:     ['framing', 'camera_position', 'work_type'],
    forbidden: /parapet.?wall|hvac|rooftop.*(?:equip|technical|machin)|ventilation.?stack|broad.*membrane|large.*flat.*roof|multi.?storey/i,
    issue:    'étanchéité maison — éléments toiture immeuble détectés',
    fix:      { type: 'addExclusions', terms: ['parapet wall', 'HVAC units', 'rooftop technical equipment', 'ventilation stack', 'large flat roof', 'broad membrane surface'] },
  },
  {
    id:       'nettoyage_toiture_no_mixed',
    key:      'nettoyage_toiture',
    when:     () => true,
    scan:     ['framing', 'site_details', 'work_type'],
    forbidden: /two.*type|mixed.*tile|different.*tile|patchwork.*roof|partly.*clean|partial.*clean|dirty.*streak.*facade|green.*runoff.*wall/i,
    issue:    'nettoyage toiture — tuiles mixtes ou coulures façade détectées',
    fix:      { type: 'addExclusions', terms: ['two different tile types', 'mixed roofing materials on same pitch', 'partially cleaned roof', 'dirty streaks on facade', 'green runoff on wall'] },
  },
  {
    id:       'nettoyage_gouttieres_no_roof',
    key:      'nettoyage_gouttieres',
    when:     () => true,
    scan:     ['framing', 'work_type', 'camera_position'],
    forbidden: /roof.*(?:main|subject|treated|clean)|cleaning.*roof.*tile|treated.*roof|moss.*remov.*roof/i,
    issue:    'nettoyage gouttières — toiture comme sujet principal ou traitée détectée',
    fix:      { type: 'addExclusions', terms: ['roof as main subject', 'moss removal on roof tiles', 'partially cleaned roof', 'roof cleaning patterns'] },
  },
  {
    id:       'toiture_no_cleaning',
    key:      'toiture',
    when:     () => true,
    scan:     ['site_tools', 'work_type', 'framing'],
    forbidden: /pressure.?wash|karcher|cleaning.?machine|nettoyage.*haute.?pression/i,
    issue:    'couverture — nettoyeur haute pression / nettoyage détecté',
    fix:      { type: 'addExclusions', terms: ['pressure washer', 'pressure washing machine', 'karcher', 'cleaning machine'] },
  },
  {
    id:       'peinture_int_no_ext_refs',
    key:      'peinture',
    when:     (obj) => obj.setting === 'interior',
    scan:     ['camera_position', 'work_type', 'roadside_context'],
    forbidden: /\b(?:facade|pavement|scaffold(?:ing)?|exterior.?wall|garden.?path|street.?level|house.?front|from.?the.?street|from.?outside)\b/i,
    issue:    'peinture intérieure — références extérieures détectées',
    fix:      { type: 'addExclusions', terms: ['facade', 'pavement', 'scaffolding', 'exterior wall', 'street view', 'garden path', 'house exterior'] },
  },
  {
    id:       'peinture_ext_no_int_refs',
    key:      'peinture',
    when:     (obj) => obj.setting === 'exterior',
    scan:     ['camera_position', 'work_type'],
    forbidden: /\b(?:ceiling|bedroom|living.?room|indoor|interior.?room|drop.?cloth.?on.?(?:the\s+)?\w+.?floor|room.?interior|standing.?in.?the.?(?:room|doorway))\b/i,
    issue:    'peinture extérieure — références intérieures détectées',
    fix:      { type: 'addExclusions', terms: ['bedroom', 'living room', 'ceiling interior', 'indoor furniture', 'interior room'] },
  },
];

function _validateQuality(obj) {
  const matchedKey = obj._matched_key || '';
  const issues     = [];
  let   allFixed   = true;
  const patched    = Object.assign({}, obj, { exclude: [...(obj.exclude || [])] });

  for (const rule of QUALITY_RULES) {
    if (rule.key !== matchedKey && rule.key !== '*') continue;
    if (!rule.when(obj)) continue;

    const haystack = rule.scan.map(f => {
      if (f === 'framing') return JSON.stringify(obj.framing || {});
      const v = obj[f];
      return Array.isArray(v) ? v.join(' ') : (v || '');
    }).join(' ');

    if (!rule.forbidden.test(haystack)) continue;

    issues.push(rule.issue);
    console.warn(`[QualityGate] ${rule.id}: ${rule.issue}`);

    if (rule.fix?.type === 'addExclusions') {
      patched.exclude.push(...rule.fix.terms);
    } else {
      allFixed = false;
    }
  }

  if (issues.length === 0) return { ok: true,  issues: [],    fixedObj: null };
  if (allFixed)            return { ok: false,  issues,        fixedObj: patched };
  return                          { ok: false,  issues,        fixedObj: null };
}

export { QUALITY_RULES, _validateQuality };
