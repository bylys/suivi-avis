/**
 * roof-waterproofing-gutter-contracts-tests.js
 * Validateur no-cost des contrats visuels toiture / étanchéité / gouttières.
 * Tests RTG-C1 à RTG-C12.
 * Aucun appel réseau. Aucune modification du pipeline de production.
 */

import {
  ROOF_VISUAL_CONTRACTS,
  RTG_FOR_PATTERNS,
  RTG_META,
} from '../services/roof-waterproofing-gutter-contracts.js';

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

function normalize(s) {
  return (s || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ').trim();
}

// ─── Catalogue cluster (39 services) ─────────────────────────────────────────
const CATALOG_CLUSTER_SERVICES = [
  // toiture (11)
  'Rénovation toiture complète', 'Réparation toiture', 'Remplacement tuiles',
  'Remplacement ardoises', 'Couverture neuve', 'Réfection toiture',
  'Charpente', 'Isolation combles', 'Faîtage', 'Zinguerie', 'Solins',
  // nettoyage_toiture (6)
  'Démoussage toiture', 'Nettoyage toiture', 'Traitement hydrofuge toiture',
  'Nettoyage mousse toiture', 'Hydrofuge toiture', 'Traitement anti-mousse toiture',
  // nettoyage_gouttieres (5)
  'Nettoyage gouttières', 'Débouchage gouttières', 'Remplacement gouttières',
  'Entretien gouttières', 'Pose gouttières',
  // etancheite (17)
  'Réparation fuite toiture', 'Recherche de fuite', 'Infiltration toiture',
  'Étanchéité toit terrasse', 'Étanchéité toiture plate',
  'Étanchéité balcon', 'Étanchéité terrasse',
  'Étanchéité EPDM', 'Étanchéité PVC', 'Étanchéité bitume',
  "Réfection d'étanchéité",
  'Réparation solin', 'Réparation Velux', 'Réparation noue',
  'Réparation rive', 'Étanchéité cheminée', 'Étanchéité acrotère',
];

// ─── Services hors-cluster (133 services) ─────────────────────────────────────
const NON_CLUSTER_NORMALIZED = [
  // ravalement (9)
  'ravalement facade','renovation facade','crepi facade',
  'ite isolation par l exterieur','enduit monocouche',
  'enduit hydraulique','nettoyage facade','peinture facade',
  'traitement facade pierre',
  // maconnerie (18)
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
  // vitrier (8)
  'remplacement vitrage brise','remplacement double vitrage',
  'remplacement fenetre pvc','remplacement fenetre aluminium',
  'reparation fenetre','remplacement porte vitree',
  'vitrage securite feuillette','bris de glace urgence',
  // elagage (7)
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
  // nettoyage exterieur (7)
  'nettoyage facade','nettoyage terrasse','nettoyage dallage',
  'nettoyage paves','nettoyage allee','traitement hydrofuge facade',
  'nettoyage haute pression',
  // debarras (8)
  'debarras appartement','debarras maison','debarras cave',
  'debarras grenier','vider maison succession','debarras apres deces',
  'enlevement encombrants','nettoyage encombrants',
];

const REQUIRED_SCHEMA_FIELDS = [
  'service_key','service_label','covers_services','visual_goal','observable_action',
  'required_visual_evidence','forbidden_confusions','allowed_tools',
  'forbidden_tools','work_surface','setting','location_types',
  'worker_rules','safety','states','composition_preferences','for_regex',
];
const REQUIRED_WORKER_FIELDS  = ['presence','min','max'];
const REQUIRED_SAFETY_FIELDS  = ['required','forbidden'];
const REQUIRED_STATE_KEYS     = ['debut','encours','semifinal','final'];
const VALID_COMPOSITIONS      = new Set([
  'close_detail','medium_intervention','wide_worksite','contextual_overview',
]);

export function runRoofContractsTests() {
  _pass = 0; _fail = 0;
  console.group('[ROOF CONTRACTS TESTS] RTG-C1 à RTG-C12');

  const keys      = Object.keys(ROOF_VISUAL_CONTRACTS);
  const contracts = Object.values(ROOF_VISUAL_CONTRACTS);

  // ── RTG-C1 — Parité catalogue ─────────────────────────────────────────────
  console.group('[RTG-C1] Parité catalogue — 39 services couverts');
  for (const label of CATALOG_CLUSTER_SERVICES) {
    const norm = normalize(label);
    let matchCount = 0;
    let matchedKey = null;
    for (const [key, re] of Object.entries(RTG_FOR_PATTERNS)) {
      if (re.test(norm)) { matchCount++; matchedKey = key; }
    }
    ok(matchCount >= 1,
      `RTG-C1: "${label}" couvert par au moins 1 pattern (${matchedKey || 'NONE'})`,
      `matchCount=${matchCount}`);
  }
  console.groupEnd();

  // ── RTG-C2 — Schéma complet ───────────────────────────────────────────────
  console.group('[RTG-C2] Schéma complet');
  for (const c of contracts) {
    for (const field of REQUIRED_SCHEMA_FIELDS) {
      ok(Object.prototype.hasOwnProperty.call(c, field),
        `RTG-C2: [${c.service_key}] champ "${field}" présent`);
    }
    for (const f of REQUIRED_WORKER_FIELDS) {
      ok(Object.prototype.hasOwnProperty.call(c.worker_rules || {}, f),
        `RTG-C2: [${c.service_key}] worker_rules.${f} présent`);
    }
    for (const f of REQUIRED_SAFETY_FIELDS) {
      ok(Object.prototype.hasOwnProperty.call(c.safety || {}, f),
        `RTG-C2: [${c.service_key}] safety.${f} présent`);
    }
    for (const state of REQUIRED_STATE_KEYS) {
      ok(Object.prototype.hasOwnProperty.call(c.states || {}, state),
        `RTG-C2: [${c.service_key}] states.${state} présent`);
      const stateObj = (c.states || {})[state] || {};
      const hasAction  = Object.prototype.hasOwnProperty.call(stateObj, 'observable_action') ||
                         Object.prototype.hasOwnProperty.call(stateObj, 'observable_result');
      ok(hasAction,
        `RTG-C2: [${c.service_key}] states.${state} has observable_action or observable_result`);
      ok(Array.isArray(stateObj.required_visual_evidence) &&
         stateObj.required_visual_evidence.length > 0,
        `RTG-C2: [${c.service_key}] states.${state}.required_visual_evidence non-vide`);
    }
    ok(Array.isArray(c.required_visual_evidence) && c.required_visual_evidence.length > 0,
      `RTG-C2: [${c.service_key}] required_visual_evidence non-vide`);
    ok(Array.isArray(c.forbidden_confusions) && c.forbidden_confusions.length > 0,
      `RTG-C2: [${c.service_key}] forbidden_confusions non-vide`);
    ok(Array.isArray(c.composition_preferences) && c.composition_preferences.length > 0,
      `RTG-C2: [${c.service_key}] composition_preferences non-vide`);
    ok(typeof c.for_regex === 'string' && c.for_regex.length > 0,
      `RTG-C2: [${c.service_key}] for_regex non-vide`);
    ok(Array.isArray(c.covers_services) && c.covers_services.length > 0,
      `RTG-C2: [${c.service_key}] covers_services non-vide`);
  }
  console.groupEnd();

  // ── RTG-C3 — service_key uniques ──────────────────────────────────────────
  console.group('[RTG-C3] service_key uniques');
  const serviceKeys = contracts.map(c => c.service_key);
  const uniqueKeys  = new Set(serviceKeys);
  ok(uniqueKeys.size === serviceKeys.length,
    `RTG-C3: ${uniqueKeys.size} service_key uniques sur ${serviceKeys.length}`);
  console.groupEnd();

  // ── RTG-C4 — for_regex uniques ────────────────────────────────────────────
  console.group('[RTG-C4] for_regex uniques');
  const regexStrings = contracts.map(c => c.for_regex);
  const uniqueRegex  = new Set(regexStrings);
  ok(uniqueRegex.size === regexStrings.length,
    `RTG-C4: ${uniqueRegex.size} for_regex uniques sur ${regexStrings.length}`);
  console.groupEnd();

  // ── RTG-C5 — aucune collision externe ─────────────────────────────────────
  console.group('[RTG-C5] Aucune collision externe (133 services hors-cluster)');
  for (const extLabel of NON_CLUSTER_NORMALIZED) {
    const matches = Object.entries(RTG_FOR_PATTERNS)
      .filter(([, re]) => re.test(extLabel))
      .map(([k]) => k);
    ok(matches.length === 0,
      `RTG-C5: service externe "${extLabel}" → 0 match`,
      `matches: [${matches.join(', ')}]`);
  }
  console.groupEnd();

  // ── RTG-C6 — quatre états distincts ──────────────────────────────────────
  console.group('[RTG-C6] Quatre états visuellement distincts');
  for (const c of contracts) {
    const actions = REQUIRED_STATE_KEYS.map(s => {
      const st = (c.states || {})[s] || {};
      return st.observable_action || st.observable_result || '';
    });
    const uniqueActions = new Set(actions);
    ok(uniqueActions.size === 4,
      `RTG-C6: [${c.service_key}] 4 actions distinctes`,
      `unique=${uniqueActions.size}`);
    const evidenceSets = REQUIRED_STATE_KEYS.map(s => {
      const st = (c.states || {})[s] || {};
      return JSON.stringify((st.required_visual_evidence || []).sort());
    });
    const uniqueEvidence = new Set(evidenceSets);
    ok(uniqueEvidence.size === 4,
      `RTG-C6: [${c.service_key}] 4 jeux de preuves visuelles distincts`);
  }
  console.groupEnd();

  // ── RTG-C7 — outils cohérents ─────────────────────────────────────────────
  console.group('[RTG-C7] Outils cohérents');
  for (const c of contracts) {
    ok(Array.isArray(c.allowed_tools) && c.allowed_tools.length > 0,
      `RTG-C7: [${c.service_key}] allowed_tools non-vide`);
    ok(Array.isArray(c.forbidden_tools) && c.forbidden_tools.length > 0,
      `RTG-C7: [${c.service_key}] forbidden_tools non-vide`);
    const allowed  = new Set((c.allowed_tools  || []).map(t => t.toLowerCase().split(' ')[0]));
    const forbidden = new Set((c.forbidden_tools || []).map(t => t.toLowerCase().split(' ')[0]));
    const overlap  = [...allowed].filter(t => t.length > 3 && forbidden.has(t));
    ok(overlap.length === 0,
      `RTG-C7: [${c.service_key}] aucun outil dans les deux listes simultanément`,
      `overlap: ${overlap.join(', ')}`);
  }
  console.groupEnd();

  // ── RTG-C8 — sécurité non vide (hauteur) ─────────────────────────────────
  console.group('[RTG-C8] Safety.required non vide pour tout contrat de ce cluster');
  // Tous les services de ce cluster impliquent un travail en hauteur ou des risques
  // biochimiques/mécaniques — safety.required est obligatoire sans exception.
  for (const c of contracts) {
    ok(Array.isArray(c.safety.required) && c.safety.required.length > 0,
      `RTG-C8: [${c.service_key}] safety.required non-vide`);
    ok(Array.isArray(c.safety.forbidden) && c.safety.forbidden.length > 0,
      `RTG-C8: [${c.service_key}] safety.forbidden non-vide`);
  }
  // Contrats exposés à une hauteur significative doivent mentionner l'accès
  const HEIGHT_KEYS = [
    'renovation_toiture','reparation_toiture','remplacement_tuiles',
    'faitage','zinguerie','solins','reparation_solin_cheminee',
    'reparation_velux','reparation_noue','reparation_rive_acrotere',
    'reparation_fuite_toiture','nettoyage_gouttieres','debouchage_gouttieres',
    'remplacement_gouttieres',
  ];
  const ACCESS_TERMS = /echelle|ladder|scaffold|harness|harnais|hauteur|roof ladder|echafaudage/i;
  for (const key of HEIGHT_KEYS) {
    const c = ROOF_VISUAL_CONTRACTS[key];
    if (!c) continue;
    const safetyText = [
      ...(c.safety.required || []),
      ...(c.safety.conditional || []),
      ...(c.safety.forbidden || []),
    ].join(' ');
    ok(ACCESS_TERMS.test(safetyText),
      `RTG-C8: [${key}] safety mentionne un outil ou protection d'accès en hauteur`);
  }
  console.groupEnd();

  // ── RTG-C9 — paires à risque différenciées ────────────────────────────────
  console.group('[RTG-C9] Paires à risque différenciées');
  const riskPairs = RTG_META.risk_pairs || [];
  ok(riskPairs.length >= 6,
    `RTG-C9: ${riskPairs.length} paires à risque documentées (min 6)`);
  for (const rp of riskPairs) {
    const [k1, k2] = rp.pair;
    const c1 = ROOF_VISUAL_CONTRACTS[k1];
    const c2 = ROOF_VISUAL_CONTRACTS[k2];
    ok(c1 && c2,
      `RTG-C9: paire [${k1} ↔ ${k2}] — les deux contrats existent`);
    if (!c1 || !c2) continue;
    const fc1 = (c1.forbidden_confusions || []).join(' ').toLowerCase();
    const fc2 = (c2.forbidden_confusions || []).join(' ').toLowerCase();
    ok(fc1.length > 0 && fc2.length > 0,
      `RTG-C9: paire [${k1} ↔ ${k2}] — forbidden_confusions non-vides`);
    ok(fc1 !== fc2,
      `RTG-C9: paire [${k1} ↔ ${k2}] — forbidden_confusions distincts`);
    ok(typeof rp.risk === 'string' && rp.risk.length > 30,
      `RTG-C9: paire [${k1} ↔ ${k2}] — différenciation documentée`);
  }
  console.groupEnd();

  // ── RTG-C10 — compositions compatibles ───────────────────────────────────
  console.group('[RTG-C10] Compositions compatibles');
  for (const c of contracts) {
    const prefs = c.composition_preferences || [];
    ok(prefs.length >= 1 && prefs.length <= 3,
      `RTG-C10: [${c.service_key}] 1-3 composition_preferences`);
    for (const p of prefs) {
      ok(VALID_COMPOSITIONS.has(p),
        `RTG-C10: [${c.service_key}] "${p}" est une valeur valide`);
    }
  }
  // Les services sans-worker (presence: none) ne devraient pas avoir close_detail seul
  for (const c of contracts) {
    if ((c.worker_rules || {}).presence === 'none') {
      const prefs = c.composition_preferences || [];
      const hasWide = prefs.includes('wide_worksite') || prefs.includes('contextual_overview');
      ok(hasWide,
        `RTG-C10: [${c.service_key}] presence=none → au moins une composition large (wide/contextual)`);
    }
  }
  console.groupEnd();

  // ── RTG-C11 — aucun contrat dupliqué ─────────────────────────────────────
  console.group('[RTG-C11] Aucun contrat dupliqué');
  const visualGoals = contracts.map(c => c.visual_goal);
  const uniqueGoals = new Set(visualGoals);
  ok(uniqueGoals.size === visualGoals.length,
    `RTG-C11: ${uniqueGoals.size} visual_goal uniques sur ${visualGoals.length}`);
  const serviceLabels = contracts.map(c => c.service_label);
  const uniqueLabels  = new Set(serviceLabels);
  ok(uniqueLabels.size === serviceLabels.length,
    `RTG-C11: ${uniqueLabels.size} service_label uniques sur ${serviceLabels.length}`);
  console.groupEnd();

  // ── RTG-C12 — source canonique unique ────────────────────────────────────
  console.group('[RTG-C12] Source canonique unique');
  ok(RTG_META.canonical_source === 'src/image-generation/services/roof-waterproofing-gutter-contracts.js',
    'RTG-C12: canonical_source correcte');
  ok(RTG_META.version >= 1,
    `RTG-C12: version >= 1 (got ${RTG_META.version})`);
  ok(RTG_META.contract_count === 19,
    `RTG-C12: contract_count === 19 (got ${RTG_META.contract_count})`);
  ok(RTG_META.service_count === 39,
    `RTG-C12: service_count === 39 (got ${RTG_META.service_count})`);
  ok(keys.length === RTG_META.contract_count,
    `RTG-C12: nombre réel de contrats (${keys.length}) === meta.contract_count (${RTG_META.contract_count})`);
  ok(Array.isArray(RTG_META.metiers_covered) && RTG_META.metiers_covered.length === 4,
    `RTG-C12: 4 métiers couverts`);
  console.groupEnd();

  // ── Résumé ────────────────────────────────────────────────────────────────
  const total = _pass + _fail;
  if (_fail === 0) {
    console.info(`[ROOF CONTRACTS] ✓ ${_pass}/${total} assertions — ALL PASS`);
  } else {
    console.error(`[ROOF CONTRACTS] ✗ ${_fail} échec(s) sur ${total} assertions`);
  }
  console.groupEnd();

  return { pass: _pass, fail: _fail, total };
}
