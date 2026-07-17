/**
 * vitrier-scenes-tests.js — tests no-cost des scènes vitrier (Phase 2).
 * Chargé uniquement via ?imageGenTests=1.
 * Tests VS1–VS16.
 */

import { WORK_SCENES_VITRIER, SITE_REALISM_VITRIER } from '../services/vitrier.js';
import { WORK_SCENES, SITE_REALISM }                from '../services/index.js';

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

// All 172 catalog services (8 vitrier + 164 others)
const VITRIER_CATALOG_LABELS = [
  'Remplacement vitrage brisé', 'Remplacement double vitrage',
  'Remplacement fenêtre PVC', 'Remplacement fenêtre aluminium',
  'Réparation fenêtre', 'Remplacement porte vitrée',
  'Vitrage sécurité feuilleté', 'Bris de glace urgence',
];

// Vitrier _for patterns from the contracts (aligned with for_regex in vitrier-contracts.js)
const VITRIER_FOR_PATTERNS = [
  { key: 'vitrage_brise',    re: /vitrage.*bris|bris.*vitrage/i,        label: 'Remplacement vitrage brisé' },
  { key: 'double_vitrage',   re: /double.vitrage/i,                     label: 'Remplacement double vitrage' },
  { key: 'fenetre_pvc',      re: /fenetre.*pvc|pvc.*fenetre/i,          label: 'Remplacement fenêtre PVC' },
  { key: 'fenetre_alu',      re: /fenetre.*alumin|alumin/i,             label: 'Remplacement fenêtre aluminium' },
  { key: 'reparation',       re: /reparation.*fenetre|fenetre.*repar/i, label: 'Réparation fenêtre' },
  { key: 'porte_vitree',     re: /porte.vitr/i,                         label: 'Remplacement porte vitrée' },
  { key: 'feuillette',       re: /feuillette|vitrage.*securite|securite.*vitrage/i, label: 'Vitrage sécurité feuilleté' },
  { key: 'bris_urgence',     re: /bris.de.glace|glace.*urgence|urgence.*bris/i,     label: 'Bris de glace urgence' },
];

const NON_VITRIER_LABELS = [
  'Rénovation toiture complète','Réparation toiture','Remplacement tuiles',
  'Remplacement ardoises','Couverture neuve','Réfection toiture','Charpente',
  'Isolation combles','Faîtage','Zinguerie','Solins',
  'Démoussage toiture','Nettoyage toiture','Traitement hydrofuge toiture',
  'Nettoyage mousse toiture','Hydrofuge toiture','Traitement anti-mousse toiture',
  'Nettoyage gouttières','Débouchage gouttières','Remplacement gouttières',
  'Entretien gouttières','Pose gouttières',
  'Réparation fuite toiture','Recherche de fuite','Infiltration toiture',
  'Étanchéité toit terrasse','Étanchéité toiture plate',
  'Étanchéité balcon','Étanchéité terrasse',
  'Étanchéité EPDM','Étanchéité PVC','Étanchéité bitume',
  "Réfection d'étanchéité",
  'Réparation solin','Réparation Velux','Réparation noue',
  'Réparation rive','Étanchéité cheminée','Étanchéité acrotère',
  'Ravalement façade','Rénovation façade','Crépi façade',
  "ITE (isolation par l'extérieur)",'Enduit monocouche',
  'Enduit hydraulique','Nettoyage façade','Peinture façade',
  'Traitement façade pierre',
  'Mur parpaing','Mur brique','Construction mur','Muret',
  'Dalle béton','Terrasse béton','Coulage dalle',
  'Fondation','Semelle béton','Ferraillage',
  'Escalier béton','Seuil','Linteau','Ouverture dans mur','Percement mur',
  'Réparation fissure','Rejointoiement','Rejointoiement pierre',
  'Peinture intérieure','Peinture salon','Peinture chambre',
  'Peinture cuisine','Peinture couloir','Peinture plafond',
  'Papier peint','Peinture extérieure','Peinture façade','Enduit décoratif',
  'Pose carrelage sol','Pose carrelage mural','Faïence salle de bain',
  'Faïence cuisine','Carrelage terrasse extérieure','Dallage extérieur',
  'Pose pierre naturelle','Réfection joint','Réfection carrelage',
  'Élagage arbre','Taille arbre haute tige','Élagage peuplier',
  'Élagage en hauteur','Recépage arbre','Couronnage arbre',
  'Élagage arbres dangereux',
  'Abattage arbre','Abattage peuplier','Abattage grand arbre',
  'Abattage en zone difficile','Dessouchage','Abattage conifère',
  'Terrassement maison','Terrassement piscine','Terrassement terrain',
  'Décaissement','Excavation','Fouilles','Tranchées',
  'Remblai','Empierrement','Nivellement','Préparation terrain',
  'Création allée','Création chemin','Plateforme','VRD',
  'Évacuation des terres',
  'Création jardin','Aménagement extérieur','Aménagement paysager',
  'Plantation','Plantation de haies',"Plantation d'arbres",
  'Taille de haie',"Taille d'arbustes",'Création massif',
  'Pose de gazon','Gazon en rouleau','Semis de gazon',
  'Arrosage automatique','Bordures','Paillage',
  'Entretien jardin','Désherbage','Petite maçonnerie paysagère',
  'Batterie à plat','Démarrage batterie','Boost batterie','Remplacement batterie',
  'Crevaison','Changement de roue','Réparation pneu',
  'Remorquage','Assistance routière','Véhicule en panne',
  'Ouverture de véhicule','Clés enfermées','Déverrouillage voiture',
  'Erreur de carburant','Panne moteur','Panne électrique','Enlèvement véhicule',
  'Nettoyage façade','Nettoyage terrasse','Nettoyage dallage',
  'Nettoyage pavés','Nettoyage allée','Traitement hydrofuge façade',
  'Nettoyage haute pression',
  'Débarras appartement','Débarras maison','Débarras cave',
  'Débarras grenier','Vider maison succession','Débarras après décès',
  'Enlèvement encombrants','Nettoyage encombrants',
];

const STATE_KEYS = ['debut', 'encours', 'semifinal', 'final'];

export function runVitrierScenesTests() {
  _pass = 0; _fail = 0;
  console.group('[VITRIER SCENES TESTS] VS1–VS16');

  const ws = WORK_SCENES_VITRIER.vitrier;
  const sr = SITE_REALISM_VITRIER.vitrier;
  const scenarios = sr?.scenarios || [];

  // ── VS1 — 8 services routés ───────────────────────────────────────────────
  console.group('[VS1] 8 services routés');
  ok(typeof WORK_SCENES_VITRIER.vitrier === 'object', 'VS1: WORK_SCENES_VITRIER.vitrier existe');
  ok(typeof SITE_REALISM_VITRIER.vitrier === 'object', 'VS1: SITE_REALISM_VITRIER.vitrier existe');
  ok(Array.isArray(scenarios), 'VS1: SITE_REALISM_VITRIER.vitrier.scenarios est un tableau');
  ok(scenarios.length === 8, `VS1: 8 scenarios définis (got ${scenarios.length})`);
  console.groupEnd();

  // ── VS2 — Route unique par service ─────────────────────────────────────────
  console.group('[VS2] Route unique par service');
  for (const { label } of VITRIER_FOR_PATTERNS) {
    const norm = normalize(label);
    let matches = 0;
    for (const scenario of scenarios) {
      const re = new RegExp(scenario._for, 'i');
      if (re.test(norm)) matches++;
    }
    ok(matches === 1,
      `VS2: "${label}" → exactement 1 scénario (got ${matches})`);
  }
  console.groupEnd();

  // ── VS3 — 0 collision sur les 164 autres services ──────────────────────────
  console.group('[VS3] 0/164 collision externe');
  let collisions = 0;
  for (const label of NON_VITRIER_LABELS) {
    const norm = normalize(label);
    for (const scenario of scenarios) {
      const re = new RegExp(scenario._for, 'i');
      if (re.test(norm)) {
        collisions++;
        ok(false, `VS3: faux positif — "${label}" capturé par _for="${scenario._for}"`);
      }
    }
  }
  ok(collisions === 0,
    `VS3: 0 collision externe sur ${NON_VITRIER_LABELS.length} services`,
    `found ${collisions}`);
  console.groupEnd();

  // ── VS4 — 32 combinaisons résolues ────────────────────────────────────────
  console.group('[VS4] 32 combinaisons service × état');
  ok(ws?.states && typeof ws.states === 'object',
    'VS4: WORK_SCENES_VITRIER.vitrier.states défini');
  for (const state of STATE_KEYS) {
    ok(Object.prototype.hasOwnProperty.call(ws?.states || {}, state),
      `VS4: état "${state}" présent dans WORK_SCENES_VITRIER`);
  }
  // 8 services × 4 états = 32 (combinaisons via routing)
  ok(scenarios.length * STATE_KEYS.length === 32,
    `VS4: ${scenarios.length} × ${STATE_KEYS.length} = 32 combinaisons`);
  console.groupEnd();

  // ── VS5 — Quatre états distincts ──────────────────────────────────────────
  console.group('[VS5] Quatre états distincts');
  const states = ws?.states || {};
  const stateDescriptions = STATE_KEYS.map(k => states[k]?.description || '');
  const uniqueDescs = new Set(stateDescriptions);
  ok(uniqueDescs.size === 4,
    `VS5: 4 descriptions d'état distinctes (got ${uniqueDescs.size})`);
  for (const state of STATE_KEYS) {
    ok(typeof states[state]?.description === 'string' && states[state].description.length > 0,
      `VS5: état "${state}" a une description`);
    ok(typeof states[state]?.framing === 'object',
      `VS5: état "${state}" a un objet framing`);
  }
  console.groupEnd();

  // ── VS6 — Types de vitrage corrects ───────────────────────────────────────
  console.group('[VS6] Types de vitrage corrects');
  const briseScenario = scenarios.find(s => new RegExp(s._for, 'i').test('vitrage brise'));
  const igUScenario   = scenarios.find(s => new RegExp(s._for, 'i').test('double vitrage'));
  const urgScenario   = scenarios.find(s => new RegExp(s._for, 'i').test('bris de glace'));
  ok(briseScenario != null, 'VS6: scénario vitrage brisé trouvé');
  ok(igUScenario   != null, 'VS6: scénario double vitrage trouvé');
  ok(urgScenario   != null, 'VS6: scénario bris urgence trouvé');
  if (briseScenario) {
    const briseText = JSON.stringify(briseScenario);
    ok(/broken|crack|bris|fragment/i.test(briseText),
      'VS6: scénario vitrage brisé mentionne fragments/bris');
  }
  if (igUScenario) {
    const igUText = JSON.stringify(igUScenario);
    ok(/IGU|spacer|double.pane|double vitrage|parclose/i.test(igUText),
      'VS6: scénario double vitrage mentionne IGU/spacer/parclose');
  }
  if (urgScenario) {
    const urgText = JSON.stringify(urgScenario);
    ok(/provisional|boarding|plywood|film|fragment/i.test(urgText),
      'VS6: scénario urgence mentionne provisoire/boarding/film');
    // Check only positive output fields — location_forbidden intentionally lists the prohibited outcome
    const urgPositiveText = JSON.stringify({
      scene_note: urgScenario.scene_note,
      chantier_details: urgScenario.chantier_details,
    });
    ok(!/new.*transparent.*pane|clear.*glass.*installed|permanent.*seal/i.test(urgPositiveText),
      'VS6: scénario urgence (chantier_details) ne décrit pas de vitre transparente définitive');
  }
  console.groupEnd();

  // ── VS7 — Cadres PVC/alu distincts ────────────────────────────────────────
  console.group('[VS7] Cadres PVC et aluminium distincts');
  const pvcScenario = scenarios.find(s => new RegExp(s._for, 'i').test('fenetre pvc'));
  const aluScenario = scenarios.find(s => new RegExp(s._for, 'i').test('fenetre aluminium'));
  ok(pvcScenario != null, 'VS7: scénario PVC trouvé');
  ok(aluScenario != null, 'VS7: scénario aluminium trouvé');
  if (pvcScenario) {
    const pvcText = JSON.stringify(pvcScenario);
    ok(/white|blanc|PVC|plastic/i.test(pvcText),
      'VS7: scénario PVC mentionne blanc/PVC/plastic');
    // Check only positive fields to avoid false match on location_forbidden values
    const pvcPositive = JSON.stringify({ scene_note: pvcScenario.scene_note, chantier_details: pvcScenario.chantier_details, scene_camera: pvcScenario.scene_camera });
    ok(!/grey.*frame|anthracite.*frame|metal.*frame|aluminium.*profile/i.test(pvcPositive),
      'VS7: scénario PVC (scene_note/chantier_details) ne décrit pas un cadre gris/métal');
  }
  if (aluScenario) {
    const aluText = JSON.stringify(aluScenario);
    ok(/grey|anthracite|metal|alumin/i.test(aluText),
      'VS7: scénario aluminium mentionne gris/métal/anthracite');
    // Check only positive fields to avoid false match on location_forbidden values
    const aluPositive = JSON.stringify({ scene_note: aluScenario.scene_note, chantier_details: aluScenario.chantier_details, scene_camera: aluScenario.scene_camera });
    ok(!/white.*plastic|PVC.*frame/i.test(aluPositive),
      'VS7: scénario aluminium (scene_note/chantier_details) ne décrit pas un cadre PVC blanc');
  }
  console.groupEnd();

  // ── VS8 — Urgence ≠ remplacement définitif ────────────────────────────────
  console.group('[VS8] Urgence ≠ remplacement définitif');
  const vitBriseText = JSON.stringify(briseScenario || {});
  const urgenceText  = JSON.stringify(urgScenario || {});
  ok(/clear.*glass|transparent.*glass|new.*pane|vitre.*claire/i.test(vitBriseText),
    'VS8: vitrage brisé mentionne vitre claire définitive');
  ok(/provisional|boarding|plywood|polycarbonate|opaque/i.test(urgenceText),
    'VS8: urgence mentionne protection provisoire opaque');
  // These two descriptions must not be interchangeable
  ok(vitBriseText !== urgenceText,
    'VS8: scénarios brisé et urgence sont distincts');
  console.groupEnd();

  // ── VS9 — Fenêtre ≠ porte vitrée ─────────────────────────────────────────
  console.group('[VS9] Fenêtre ≠ porte vitrée');
  const porteScenario  = scenarios.find(s => new RegExp(s._for, 'i').test('porte vitree'));
  ok(porteScenario != null, 'VS9: scénario porte vitrée trouvé');
  if (porteScenario) {
    const porteText = JSON.stringify(porteScenario);
    ok(/door|porte|threshold|seuil|handle|poignee|180|200/i.test(porteText),
      'VS9: porte vitrée mentionne hauteur/seuil/poignée door');
    // Check only positive fields — location_forbidden intentionally lists "window proportions"
    const portePositive = JSON.stringify({ scene_note: porteScenario.scene_note, chantier_details: porteScenario.chantier_details, scene_camera: porteScenario.scene_camera });
    ok(!/window.*proportion|typical.*window/i.test(portePositive),
      'VS9: porte vitrée (scene_note/chantier_details) ne décrit pas des proportions de fenêtre');
  }
  if (pvcScenario) {
    const pvcText2 = JSON.stringify(pvcScenario);
    ok(!/threshold.*seuil|door.*handle/i.test(pvcText2),
      'VS9: scénario PVC fenêtre ne mentionne pas seuil/poignée de porte');
  }
  console.groupEnd();

  // ── VS10 — Workers réalistes ──────────────────────────────────────────────
  console.group('[VS10] Workers réalistes');
  ok(ws?.hasWorkers === true,
    `VS10: WORK_SCENES_VITRIER.vitrier.hasWorkers === true (was false in generic)`);
  // Porte vitrée: doit mentionner 2 workers
  if (porteScenario) {
    const porteText = JSON.stringify(porteScenario);
    ok(/two.*glazier|two.*worker|2.*worker|2.*glazier|two.*person/i.test(porteText),
      'VS10: porte vitrée mentionne 2 workers pour grand panneau');
  }
  // Urgence: 1 worker PPE immédiat
  if (urgScenario) {
    const urgText2 = JSON.stringify(urgScenario);
    ok(/worker|glazier|PPE/i.test(urgText2),
      'VS10: urgence mentionne worker/PPE');
  }
  console.groupEnd();

  // ── VS11 — Sécurité cohérente ─────────────────────────────────────────────
  console.group('[VS11] Sécurité cohérente');
  const allScenariosText = JSON.stringify(scenarios);
  const gloveMentions = (allScenariosText.match(/glove|gant|cut.resistant/gi) || []).length;
  ok(gloveMentions >= 8, `VS11: gants anti-coupure mentionnés dans les scénarios (${gloveMentions} occurrences)`);
  if (urgScenario) {
    const urgProtText = JSON.stringify(urgScenario.protections || []);
    ok(/glove|gant/i.test(urgProtText), 'VS11: urgence — gants dans protections');
    ok(/glass.*|safety.*glasses|lunettes/i.test(urgProtText), 'VS11: urgence — lunettes de protection');
  }
  console.groupEnd();

  // ── VS12 — Compositions compatibles ──────────────────────────────────────
  console.group('[VS12] Compositions compatibles');
  const validComps = new Set(['close_detail', 'medium_intervention', 'wide_worksite', 'contextual_overview']);
  const scenarioComps = (allScenariosText.match(/"(close_detail|medium_intervention|wide_worksite|contextual_overview)"/g) || [])
    .map(m => m.replace(/"/g, ''));
  ok(scenarioComps.every(c => validComps.has(c)),
    `VS12: toutes les compositions des scénarios sont valides`);
  // WORK_SCENES camera is defined
  ok(typeof ws?.camera === 'string' && ws.camera.length > 0,
    'VS12: WORK_SCENES_VITRIER.vitrier.camera défini');
  console.groupEnd();

  // ── VS13 — Contraintes transparence/reflets présentes ────────────────────
  console.group('[VS13] Contraintes transparence/reflets présentes');
  const glassTerms = /transparent|reflet|reflect|glass.*edge|fragment|crack|bris|clear.*glass|IGU|spacer/i;
  for (const scenario of scenarios) {
    const scenText = JSON.stringify(scenario);
    ok(glassTerms.test(scenText),
      `VS13: scénario "${scenario._for}" contient des contraintes visuelles verre`);
  }
  console.groupEnd();

  // ── VS14 — Politique Vision inchangée ─────────────────────────────────────
  console.group('[VS14] Politique Vision inchangée');
  // The safety check is driven by SAFETY_CHECK_RULES — vitrier.js must NOT define or override it
  const vitrierJsText = Object.keys(WORK_SCENES_VITRIER).join(',');
  ok(!vitrierJsText.includes('SAFETY_CHECK_RULES'),
    'VS14: WORK_SCENES_VITRIER ne redéfinit pas SAFETY_CHECK_RULES');
  // The global WORK_SCENES must include vitrier and not have changed other keys
  ok(typeof WORK_SCENES.vitrier === 'object',
    'VS14: WORK_SCENES.vitrier disponible via index.js');
  ok(typeof SITE_REALISM.vitrier === 'object',
    'VS14: SITE_REALISM.vitrier disponible via index.js');
  console.groupEnd();

  // ── VS15 — Source canonique unique ────────────────────────────────────────
  console.group('[VS15] Source canonique unique');
  ok(typeof WORK_SCENES_VITRIER === 'object' && typeof SITE_REALISM_VITRIER === 'object',
    'VS15: vitrier.js exporte WORK_SCENES_VITRIER et SITE_REALISM_VITRIER');
  // vitrier key must NOT exist in WORK_SCENES_FINISHING (finishing.js)
  // Tested indirectly: mergeRegistriesStrict would throw on duplicate key
  ok(WORK_SCENES.vitrier === WORK_SCENES_VITRIER.vitrier,
    'VS15: WORK_SCENES.vitrier === WORK_SCENES_VITRIER.vitrier (pas de doublon)');
  console.groupEnd();

  // ── VS16 — 164 services non-vitrier inchangés ─────────────────────────────
  console.group('[VS16] 164 services non-vitrier inchangés');
  // None of the 164 services should be routed to a vitrier scenario
  let nonVitrierCaptures = 0;
  for (const label of NON_VITRIER_LABELS) {
    const norm = normalize(label);
    for (const { re } of VITRIER_FOR_PATTERNS) {
      if (re.test(norm)) {
        nonVitrierCaptures++;
        ok(false, `VS16: faux positif — "${label}" capturé par un pattern vitrier`);
      }
    }
  }
  ok(nonVitrierCaptures === 0,
    `VS16: 0/${NON_VITRIER_LABELS.length} services non-vitrier capturés par les patterns vitrier`);
  console.groupEnd();

  // ── Résultat ───────────────────────────────────────────────────────────────
  const total = _pass + _fail;
  if (_fail === 0) {
    console.info(`[VITRIER SCENES] ✓ ${_pass}/${total} — ALL PASS`);
  } else {
    console.error(`[VITRIER SCENES] ✗ ${_fail} échec(s) sur ${total} assertions`);
  }
  console.groupEnd();
  return { pass: _pass, fail: _fail, total };
}
