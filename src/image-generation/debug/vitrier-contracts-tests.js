/**
 * vitrier-contracts-tests.js — validateur no-cost des contrats visuels vitrier.
 * Chargé uniquement via ?imageGenTests=1 (voir index.js).
 * Aucun appel réseau. Aucune modification du pipeline de production.
 * Tests VV1–VV14.
 */

import {
  VITRIER_VISUAL_CONTRACTS,
  VITRIER_FOR_PATTERNS,
  VITRIER_META,
} from '../services/vitrier-contracts.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────
let _pass = 0, _fail = 0;
function ok(cond, label, detail = '') {
  if (cond) {
    console.log(`  ✓ ${label}`);
    _pass++;
  } else {
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
    _fail++;
  }
}

// Normalise un service label identically to service-catalog normalization
function normalize(s) {
  return (s || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ').trim();
}

// ─── Service catalog vitrier (source of truth for parité) ────────────────────
const CATALOG_VITRIER_SERVICES = [
  'Remplacement vitrage brisé',
  'Remplacement double vitrage',
  'Remplacement fenêtre PVC',
  'Remplacement fenêtre aluminium',
  'Réparation fenêtre',
  'Remplacement porte vitrée',
  'Vitrage sécurité feuilleté',
  'Bris de glace urgence',
];

// All 164 non-vitrier catalog services — normalized (NFD stripped, non-alphanum → space)
const NON_VITRIER_NORMALIZED = [
  // toiture (11)
  'renovation toiture complete','reparation toiture','remplacement tuiles',
  'remplacement ardoises','couverture neuve','refection toiture',
  'charpente','isolation combles','faitage','zinguerie','solins',
  // nettoyage_toiture (6)
  'demossage toiture','nettoyage toiture','traitement hydrofuge toiture',
  'nettoyage mousse toiture','hydrofuge toiture','traitement anti mousse toiture',
  // nettoyage_gouttieres (5)
  'nettoyage gouttieres','debouchage gouttieres','remplacement gouttieres',
  'entretien gouttieres','pose gouttieres',
  // etancheite (17)
  'reparation fuite toiture','recherche de fuite','infiltration toiture',
  'etancheite toit terrasse','etancheite toiture plate',
  'etancheite balcon','etancheite terrasse',
  'etancheite epdm','etancheite pvc','etancheite bitume',
  'refection d etancheite',
  'reparation solin','reparation velux','reparation noue',
  'reparation rive','etancheite cheminee','etancheite acrotere',
  // ravalement (9)
  'ravalement facade','renovation facade','crepi facade',
  'ite isolation par l exterieur','enduit monocouche',
  'enduit hydraulique','nettoyage facade','peinture facade',
  'traitement facade pierre',
  // maçonnerie (18)
  'mur parpaing','mur brique','construction mur','muret',
  'dalle beton','terrasse beton','coulage dalle',
  'fondation','semelle beton','ferraillage',
  'escalier beton','seuil','linteau','ouverture dans mur','percement mur',
  'reparation fissure','rejointoiement','rejointoiement pierre',
  // peinture (10)
  'peinture interieure','peinture salon','peinture chambre',
  'peinture cuisine','peinture couloir','peinture plafond',
  'papier peint','peinture exterieure','peinture facade','enduit decoratif',
  // carrelage (9)
  'pose carrelage sol','pose carrelage mural','faience salle de bain',
  'faience cuisine','carrelage terrasse exterieure','dallage exterieur',
  'pose pierre naturelle','refection joint','refection carrelage',
  // élagage (7)
  'elagage arbre','taille arbre haute tige','elagage peuplier',
  'elagage en hauteur','recepage arbre','couronnage arbre',
  'elagage arbres dangereux',
  // abattage (6)
  'abattage arbre','abattage peuplier','abattage grand arbre',
  'abattage en zone difficile','dessouchage','abattage conifere',
  // terrassement (16)
  'terrassement maison','terrassement piscine','terrassement terrain',
  'decaissement','excavation','fouilles','tranchees',
  'remblai','empierrement','nivellement','preparation terrain',
  'creation allee','creation chemin','plateforme','vrd',
  'evacuation des terres',
  // paysagiste (18)
  'creation jardin','amenagement exterieur','amenagement paysager',
  'plantation','plantation de haies','plantation d arbres',
  'taille de haie','taille d arbustes','creation massif',
  'pose de gazon','gazon en rouleau','semis de gazon',
  'arrosage automatique','bordures','paillage',
  'entretien jardin','desherbage','petite maconnerie paysagere',
  // depannage_auto (17)
  'batterie a plat','demarrage batterie','boost batterie','remplacement batterie',
  'crevaison','changement de roue','reparation pneu',
  'remorquage','assistance routiere','vehicule en panne',
  'ouverture de vehicule','cles enfermees','deverrouillage voiture',
  'erreur de carburant','panne moteur','panne electrique','enlevement vehicule',
  // nettoyage (7)
  'nettoyage facade','nettoyage terrasse','nettoyage dallage',
  'nettoyage paves','nettoyage allee','traitement hydrofuge facade',
  'nettoyage haute pression',
  // débarras (8)
  'debarras appartement','debarras maison','debarras cave',
  'debarras grenier','vider maison succession','debarras apres deces',
  'enlevement encombrants','nettoyage encombrants',
];

const REQUIRED_STATE_KEYS = ['debut', 'encours', 'semifinal', 'final'];
const REQUIRED_SCHEMA_FIELDS = [
  'service_key','service_label','visual_goal','observable_action',
  'required_visual_evidence','forbidden_confusions','allowed_tools',
  'forbidden_tools','glass_type','frame_type','work_surface','setting',
  'location_types','damage_or_installation_state','worker_rules','safety',
  'states','composition_preferences','for_regex',
];
const REQUIRED_WORKER_FIELDS = ['presence','min','max','posture'];
const REQUIRED_SAFETY_FIELDS = ['required','conditional','forbidden'];
const REQUIRED_STATE_FIELDS  = ['observable_action','required_visual_evidence'];
const FINAL_STATE_FIELDS     = ['observable_result','required_visual_evidence'];

export function runVitrierContractsTests() {
  _pass = 0; _fail = 0;
  console.group('[VITRIER CONTRACTS TESTS] VV1–VV14');

  const keys      = Object.keys(VITRIER_VISUAL_CONTRACTS);
  const contracts = Object.values(VITRIER_VISUAL_CONTRACTS);
  const patternKeys = Object.keys(VITRIER_FOR_PATTERNS);

  // ── VV1 — Nombre exact de contrats ──────────────────────────────────────────
  console.group('[VV1] Nombre exact de contrats');
  ok(keys.length === CATALOG_VITRIER_SERVICES.length,
    `VV1: ${keys.length} contrats === ${CATALOG_VITRIER_SERVICES.length} services catalogue`,
    `got ${keys.length}`);
  console.groupEnd();

  // ── VV2 — Parité SERVICE_CATALOG ────────────────────────────────────────────
  console.group('[VV2] Parité catalogue');
  for (const label of CATALOG_VITRIER_SERVICES) {
    const found = contracts.some(c => c.service_label === label);
    ok(found, `VV2: "${label}" couvert par un contrat`);
  }
  console.groupEnd();

  // ── VV3 — Schéma complet ─────────────────────────────────────────────────────
  console.group('[VV3] Schéma complet');
  for (const c of contracts) {
    for (const field of REQUIRED_SCHEMA_FIELDS) {
      ok(Object.prototype.hasOwnProperty.call(c, field),
        `VV3: [${c.service_key}] champ "${field}" présent`);
    }
    for (const f of REQUIRED_WORKER_FIELDS) {
      ok(Object.prototype.hasOwnProperty.call(c.worker_rules || {}, f),
        `VV3: [${c.service_key}] worker_rules.${f} présent`);
    }
    for (const f of REQUIRED_SAFETY_FIELDS) {
      ok(Object.prototype.hasOwnProperty.call(c.safety || {}, f),
        `VV3: [${c.service_key}] safety.${f} présent`);
    }
    for (const state of REQUIRED_STATE_KEYS) {
      ok(Object.prototype.hasOwnProperty.call(c.states || {}, state),
        `VV3: [${c.service_key}] states.${state} présent`);
      const stateObj = (c.states || {})[state] || {};
      const requiredFields = state === 'final' ? FINAL_STATE_FIELDS : REQUIRED_STATE_FIELDS;
      for (const sf of requiredFields) {
        ok(Object.prototype.hasOwnProperty.call(stateObj, sf),
          `VV3: [${c.service_key}] states.${state}.${sf} présent`);
      }
      ok(Array.isArray(stateObj.required_visual_evidence) && stateObj.required_visual_evidence.length > 0,
        `VV3: [${c.service_key}] states.${state}.required_visual_evidence non-vide`);
    }
    ok(Array.isArray(c.required_visual_evidence) && c.required_visual_evidence.length > 0,
      `VV3: [${c.service_key}] required_visual_evidence non-vide`);
    ok(Array.isArray(c.forbidden_confusions) && c.forbidden_confusions.length > 0,
      `VV3: [${c.service_key}] forbidden_confusions non-vide`);
    ok(Array.isArray(c.composition_preferences) && c.composition_preferences.length > 0,
      `VV3: [${c.service_key}] composition_preferences non-vide`);
    ok(typeof c.for_regex === 'string' && c.for_regex.length > 0,
      `VV3: [${c.service_key}] for_regex non-vide`);
  }
  console.groupEnd();

  // ── VV4 — service_key uniques ────────────────────────────────────────────────
  console.group('[VV4] service_key uniques');
  const serviceKeys = contracts.map(c => c.service_key);
  const uniqueKeys  = new Set(serviceKeys);
  ok(uniqueKeys.size === serviceKeys.length,
    `VV4: ${uniqueKeys.size} service_key uniques sur ${serviceKeys.length}`);
  console.groupEnd();

  // ── VV5 — regex couvre tous les services vitrier ──────────────────────────────
  console.group('[VV5] Regex couvre tous les services vitrier');
  for (const label of CATALOG_VITRIER_SERVICES) {
    const norm = normalize(label);
    let matchCount = 0;
    let matchedKey = null;
    for (const [key, re] of Object.entries(VITRIER_FOR_PATTERNS)) {
      if (re.test(norm)) { matchCount++; matchedKey = key; }
    }
    ok(matchCount === 1,
      `VV5: "${label}" → exactement 1 regex match (${matchedKey})`,
      `matchCount=${matchCount}`);
  }
  console.groupEnd();

  // ── VV6 — aucune collision interne ───────────────────────────────────────────
  console.group('[VV6] Aucune collision interne');
  for (const label of CATALOG_VITRIER_SERVICES) {
    const norm = normalize(label);
    const matches = Object.entries(VITRIER_FOR_PATTERNS)
      .filter(([, re]) => re.test(norm))
      .map(([k]) => k);
    ok(matches.length <= 1,
      `VV6: "${label}" → au plus 1 match interne`,
      `matches: [${matches.join(', ')}]`);
  }
  console.groupEnd();

  // ── VV7 — aucun service externe capturé ──────────────────────────────────────
  console.group('[VV7] Aucun service externe capturé');
  for (const extLabel of NON_VITRIER_NORMALIZED) {
    const matches = Object.entries(VITRIER_FOR_PATTERNS)
      .filter(([, re]) => re.test(extLabel))
      .map(([k]) => k);
    ok(matches.length === 0,
      `VV7: service externe "${extLabel}" → 0 match`,
      `matches: [${matches.join(', ')}]`);
  }
  console.groupEnd();

  // ── VV8 — quatre états distincts ─────────────────────────────────────────────
  console.group('[VV8] Quatre états distincts');
  for (const c of contracts) {
    const actions = REQUIRED_STATE_KEYS.map(s => {
      const st = (c.states || {})[s] || {};
      return st.observable_action || st.observable_result || '';
    });
    const uniqueActions = new Set(actions);
    ok(uniqueActions.size === 4,
      `VV8: [${c.service_key}] 4 actions distinctes`,
      `unique=${uniqueActions.size}: ${actions.map(a => a.slice(0,40)).join(' | ')}`);

    const evidenceSets = REQUIRED_STATE_KEYS.map(s => {
      const st = (c.states || {})[s] || {};
      return JSON.stringify((st.required_visual_evidence || []).sort());
    });
    const uniqueEvidence = new Set(evidenceSets);
    ok(uniqueEvidence.size === 4,
      `VV8: [${c.service_key}] 4 jeux de preuves distincts`);
  }
  console.groupEnd();

  // ── VV9 — paires à risque différenciées ──────────────────────────────────────
  console.group('[VV9] Paires à risque différenciées');
  const riskPairs = VITRIER_META.risk_pairs || [];
  ok(riskPairs.length >= 4,
    `VV9: ${riskPairs.length} paires à risque documentées (min 4)`);
  for (const rp of riskPairs) {
    const [k1, k2] = rp.pair;
    const c1 = VITRIER_VISUAL_CONTRACTS[k1];
    const c2 = VITRIER_VISUAL_CONTRACTS[k2];
    ok(c1 && c2,
      `VV9: paire [${k1} ↔ ${k2}] — les deux contrats existent`);
    if (!c1 || !c2) continue;
    // forbidden_confusions of c1 should reference the other service or its distinguishing feature
    const fc1 = (c1.forbidden_confusions || []).join(' ').toLowerCase();
    const fc2 = (c2.forbidden_confusions || []).join(' ').toLowerCase();
    // At minimum, forbidden_confusions must be non-empty and distinct between the pair
    ok(fc1.length > 0 && fc2.length > 0,
      `VV9: paire [${k1} ↔ ${k2}] — forbidden_confusions non-vides`);
    ok(fc1 !== fc2,
      `VV9: paire [${k1} ↔ ${k2}] — forbidden_confusions distincts`);
    ok(typeof rp.risk === 'string' && rp.risk.length > 20,
      `VV9: paire [${k1} ↔ ${k2}] — différenciation documentée`);
  }
  console.groupEnd();

  // ── VV10 — outils cohérents ──────────────────────────────────────────────────
  console.group('[VV10] Outils cohérents');
  const GLOBALLY_FORBIDDEN = ['tronconneuse','roleau.*peinture','marteau piqueur','outil.*toiture'];
  for (const c of contracts) {
    const allTools = [...(c.allowed_tools || []), ...(c.forbidden_tools || [])].join(' ').toLowerCase();
    for (const bad of GLOBALLY_FORBIDDEN) {
      const re = new RegExp(bad, 'i');
      ok(!re.test((c.allowed_tools || []).join(' ')),
        `VV10: [${c.service_key}] outil incohérent absent de allowed_tools: "${bad}"`);
    }
    // forbidden_tools must contain at least something
    ok(Array.isArray(c.forbidden_tools) && c.forbidden_tools.length > 0,
      `VV10: [${c.service_key}] forbidden_tools non-vide`);
    // allowed_tools must contain at least something
    ok(Array.isArray(c.allowed_tools) && c.allowed_tools.length > 0,
      `VV10: [${c.service_key}] allowed_tools non-vide`);
    // allowed and forbidden must not overlap
    const allowed  = new Set((c.allowed_tools || []).map(t => t.toLowerCase()));
    const forbidden = new Set((c.forbidden_tools || []).map(t => t.toLowerCase()));
    const overlap = [...allowed].filter(t => forbidden.has(t));
    ok(overlap.length === 0,
      `VV10: [${c.service_key}] aucun outil dans les deux listes`,
      `overlap: ${overlap.join(', ')}`);
  }
  console.groupEnd();

  // ── VV11 — workers et sécurité cohérents ─────────────────────────────────────
  console.group('[VV11] Workers et sécurité cohérents');
  for (const c of contracts) {
    const wr = c.worker_rules || {};
    ok(wr.presence === 'required' || wr.presence === 'optional' || wr.presence === 'none',
      `VV11: [${c.service_key}] worker_rules.presence valeur valide`);
    ok(typeof wr.min === 'number' && wr.min >= 0,
      `VV11: [${c.service_key}] worker_rules.min est un nombre >= 0`);
    ok(typeof wr.max === 'number' && wr.max >= wr.min,
      `VV11: [${c.service_key}] worker_rules.max >= min`);
    ok(typeof wr.posture === 'string' && wr.posture.length > 10,
      `VV11: [${c.service_key}] worker_rules.posture décrit`);

    const safetyReq = (c.safety?.required || []).join(' ').toLowerCase();
    // All vitrier services must mention gloves in safety.required
    ok(/gant|glove/i.test(safetyReq),
      `VV11: [${c.service_key}] safety.required mentionne les gants anti-coupure`);

    // Services involving breaking glass must forbid bare hands
    const isGlassBreak = /bris|brise|urgence/.test(c.service_key);
    if (isGlassBreak) {
      const safetyForbidden = (c.safety?.forbidden || []).join(' ').toLowerCase();
      ok(/bare hand|mains nues|sans gant/i.test(safetyForbidden),
        `VV11: [${c.service_key}] safety.forbidden interdit les mains nues`);
    }
  }
  console.groupEnd();

  // ── VV12 — compositions cohérentes ──────────────────────────────────────────
  console.group('[VV12] Compositions cohérentes');
  const VALID_COMPOSITIONS = new Set([
    'close_detail','medium_intervention','wide_worksite','contextual_overview',
  ]);
  for (const c of contracts) {
    const prefs = c.composition_preferences || [];
    ok(prefs.length >= 1 && prefs.length <= 3,
      `VV12: [${c.service_key}] 1-3 composition_preferences`);
    for (const p of prefs) {
      ok(VALID_COMPOSITIONS.has(p),
        `VV12: [${c.service_key}] "${p}" est une composition valide`);
    }
    // Emergency service should not default to wide contextual
    if (c.service_key === 'bris_de_glace_urgence') {
      ok(!prefs.includes('contextual_overview'),
        `VV12: bris_de_glace_urgence n'utilise pas contextual_overview (trop éloigné pour l'urgence)`);
    }
  }
  console.groupEnd();

  // ── VV13 — règles transparence/reflet présentes ───────────────────────────────
  console.group('[VV13] Règles de transparence et reflets');
  const glassTerms = /transparent|reflet|reflect|bord.*vitre|edge|vitre.*invisible|fragment|fissure|crack|broken/i;
  for (const c of contracts) {
    const allText = [
      ...(c.required_visual_evidence || []),
      ...(c.forbidden_confusions || []),
      ...(Object.values(c.states || {}).flatMap(s =>
        [...(s.required_visual_evidence || []), s.observable_action || '', s.observable_result || '']
      )),
    ].join(' ');
    ok(glassTerms.test(allText),
      `VV13: [${c.service_key}] contient une référence aux propriétés visuelles du verre`);
  }
  // Vitrage brisé must mention fragments or cracks
  const brise = VITRIER_VISUAL_CONTRACTS.remplacement_vitrage_brise;
  const briseText = [...(brise?.required_visual_evidence || [])].join(' ');
  ok(/fissure|crack|bris|fragment|broken/i.test(briseText),
    'VV13: remplacement_vitrage_brise mentionne explicitement fissures/fragments');
  // Bris urgence must mention fragments on floor
  const urgence = VITRIER_VISUAL_CONTRACTS.bris_de_glace_urgence;
  const urgenceText = [...(urgence?.required_visual_evidence || [])].join(' ');
  ok(/fragment/i.test(urgenceText),
    'VV13: bris_de_glace_urgence mentionne fragments');
  console.groupEnd();

  // ── VV14 — source canonique unique ────────────────────────────────────────────
  console.group('[VV14] Source canonique unique');
  ok(VITRIER_META.canonical_source === 'src/image-generation/services/vitrier-contracts.js',
    'VV14: canonical_source pointe vers vitrier-contracts.js');
  ok(VITRIER_META.metier === 'vitrier',
    'VV14: VITRIER_META.metier = vitrier');
  ok(VITRIER_META.version >= 1,
    `VV14: VITRIER_META.version >= 1 (got ${VITRIER_META.version})`);
  ok(VITRIER_META.service_count === 8,
    `VV14: VITRIER_META.service_count === 8 (got ${VITRIER_META.service_count})`);
  console.groupEnd();

  // ── Résumé ────────────────────────────────────────────────────────────────────
  const total = _pass + _fail;
  if (_fail === 0) {
    console.info(`[VITRIER CONTRACTS] ✓ ${_pass}/${total} assertions — ALL PASS`);
  } else {
    console.error(`[VITRIER CONTRACTS] ✗ ${_fail} échec(s) sur ${total} assertions`);
  }
  console.groupEnd();

  return { pass: _pass, fail: _fail, total };
}
