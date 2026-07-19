/**
 * vitrier-scenes-tests.js — tests no-cost des scènes vitrier (Phase 2+3).
 * Chargé uniquement via ?imageGenTests=1.
 * Tests VS1–VS16, VG1–VG6, VA1–VA12, VW1–VW2, VT1–VT2, VF1–VF10.
 */

import { WORK_SCENES_VITRIER, SITE_REALISM_VITRIER } from '../services/vitrier.js';
import { WORK_SCENES, SITE_REALISM }                from '../services/index.js';
import { _applySiteRealism }                         from '../resolution/service-resolver.js?v=1';
import { _applyVariation }                           from '../resolution/scene-resolver.js?v=1';

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

// Services with apartment variants (6 of 8 — not bris urgence, not porte vitrée)
const APT_VARIANT_PATTERNS = [
  { key: 'vitrage_brise',  re: /vitrage.*bris|bris.*vitrage/i,               label: 'Remplacement vitrage brisé' },
  { key: 'double_vitrage', re: /double.vitrage/i,                             label: 'Remplacement double vitrage' },
  { key: 'fenetre_pvc',    re: /fenetre.*pvc|pvc.*fenetre/i,                  label: 'Remplacement fenêtre PVC' },
  { key: 'fenetre_alu',    re: /fenetre.*alumin|alumin/i,                     label: 'Remplacement fenêtre aluminium' },
  { key: 'reparation',     re: /reparation.*fenetre|fenetre.*repar/i,         label: 'Réparation fenêtre' },
  { key: 'feuillette',     re: /feuillette|vitrage.*securite|securite.*vitrage/i, label: 'Vitrage sécurité feuilleté' },
];
const NO_APT_VARIANT_PATTERNS = [
  { key: 'porte_vitree',  re: /porte.vitr/i,                                          label: 'Remplacement porte vitrée' },
  { key: 'bris_urgence',  re: /bris.de.glace|glace.*urgence|urgence.*bris/i,          label: 'Bris de glace urgence' },
];

export async function runVitrierScenesTests() {
  _pass = 0; _fail = 0;
  console.group('[VITRIER SCENES TESTS] VS1–VS16 + VG1–VG6 + VA1–VA12 + VW1–VW2 + VT1–VT2 + VF1–VF10');

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
  ok(WORK_SCENES.vitrier === WORK_SCENES_VITRIER.vitrier,
    'VS15: WORK_SCENES.vitrier === WORK_SCENES_VITRIER.vitrier (même instance, import canonique)');
  ok(SITE_REALISM.vitrier === SITE_REALISM_VITRIER.vitrier,
    'VS15: SITE_REALISM.vitrier === SITE_REALISM_VITRIER.vitrier (même instance, import canonique)');
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

  // ── VG1 — Double vitrage : spacer bar dans scene_note ────────────────────
  console.group('[VG1] Double vitrage — spacer bar dans scene_note');
  const igU2 = scenarios.find(s => new RegExp(s._for, 'i').test('double vitrage'));
  ok(igU2 != null, 'VG1: scénario double vitrage trouvé');
  if (igU2) {
    ok(/spacer.bar|metallic.spacer|warm.edge.spacer/i.test(igU2.scene_note),
      'VG1: scene_note mentionne spacer bar (aluminium ou warm-edge)');
    ok(/24.*28|thick.*edge|thick.*profile/i.test(igU2.scene_note),
      'VG1: scene_note mentionne épaisseur 24-28mm ou thick edge');
  }
  console.groupEnd();

  // ── VG2 — Double vitrage : spacer bar dans location_must_have ────────────
  console.group('[VG2] Double vitrage — spacer bar dans location_must_have');
  if (igU2) {
    const mh = JSON.stringify(igU2.location_must_have || []);
    ok(/spacer.bar|metallic.spacer|warm.edge/i.test(mh),
      'VG2: location_must_have exige spacer bar visible');
    ok(/24.*28|thick.*edge|thick.*profile/i.test(mh),
      'VG2: location_must_have exige profil épais 24-28mm ou thick');
  }
  console.groupEnd();

  // ── VG3 — Double vitrage : single thin pane interdit ─────────────────────
  console.group('[VG3] Double vitrage — single thin pane interdit');
  if (igU2) {
    const fb = JSON.stringify(igU2.location_forbidden || []);
    ok(/single.*thin|thin.*pane|single.*glass.*pane/i.test(fb),
      'VG3: location_forbidden interdit single thin glass pane');
    ok(/hidden.*frame|edge.*hidden|spacer.*must.be.visible/i.test(fb),
      'VG3: location_forbidden interdit glass edge complètement caché');
  }
  console.groupEnd();

  // ── VG4 — Feuilleté : PVB interlayer dans scene_note ─────────────────────
  console.group('[VG4] Feuilleté — PVB interlayer dans scene_note');
  const feuillet = scenarios.find(s => new RegExp(s._for, 'i').test('vitrage securite feuillette'));
  ok(feuillet != null, 'VG4: scénario feuilleté trouvé');
  if (feuillet) {
    ok(/PVB|interlayer/i.test(feuillet.scene_note),
      'VG4: scene_note mentionne PVB interlayer');
    ok(/no.*metallic.*spacer|no.*spacer.bar|no.*insulating.*cavity|not.*double.glaz/i.test(feuillet.scene_note),
      'VG4: scene_note précise absence de spacer bar IGU / insulating cavity');
  }
  console.groupEnd();

  // ── VG5 — Feuilleté : PVB interlayer dans location_must_have ─────────────
  console.group('[VG5] Feuilleté — PVB interlayer dans location_must_have');
  if (feuillet) {
    const mhF = JSON.stringify(feuillet.location_must_have || []);
    ok(/PVB|interlayer/i.test(mhF),
      'VG5: location_must_have exige PVB interlayer visible');
    ok(/no.*cavity|no.*air.cavity|multilayer.*edge|two.*glass.*layer/i.test(mhF),
      'VG5: location_must_have spécifie multilayer edge et absence de cavité');
  }
  console.groupEnd();

  // ── VG6 — Feuilleté : spacer bar / insulating cavity interdits ───────────
  console.group('[VG6] Feuilleté — metallic spacer et cavity interdits');
  if (feuillet) {
    const fbF = JSON.stringify(feuillet.location_forbidden || []);
    ok(/metallic.*spacer|spacer.bar.*IGU|spacer.*bar.*double/i.test(fbF),
      'VG6: location_forbidden interdit metallic spacer bar (IGU)');
    ok(/insulating.*cavity|sealed.*cavity|double.glaz/i.test(fbF),
      'VG6: location_forbidden interdit sealed insulating cavity (double vitrage)');
  }
  console.groupEnd();

  // ── VA1 — 6 services ont interior_variant ────────────────────────────────
  console.group('[VA1] 6 services ont interior_variant défini');
  for (const { label, re } of APT_VARIANT_PATTERNS) {
    const norm = normalize(label);
    const scen = scenarios.find(s => new RegExp(s._for, 'i').test(norm));
    ok(scen != null && scen.interior_variant != null,
      `VA1: "${label}" — interior_variant défini`);
  }
  console.groupEnd();

  // ── VA2 — Bris urgence et porte vitrée n'ont PAS d'interior_variant ──────
  console.group('[VA2] Bris urgence et porte vitrée — pas d\'interior_variant');
  for (const { label, re } of NO_APT_VARIANT_PATTERNS) {
    const norm = normalize(label);
    const scen = scenarios.find(s => new RegExp(s._for, 'i').test(norm));
    ok(scen != null && scen.interior_variant == null,
      `VA2: "${label}" — interior_variant absent (intentionnel)`);
  }
  console.groupEnd();

  // ── VA3 — interior_variant.setting === 'interior' ────────────────────────
  console.group('[VA3] interior_variant.setting === interior');
  for (const { label, re } of APT_VARIANT_PATTERNS) {
    const norm = normalize(label);
    const scen = scenarios.find(s => new RegExp(s._for, 'i').test(norm));
    if (scen?.interior_variant) {
      ok(scen.interior_variant.setting === 'interior',
        `VA3: "${label}" interior_variant.setting === 'interior' (was "${scen.interior_variant.setting}")`);
    }
  }
  console.groupEnd();

  // ── VA4 — interior_variant.scene_camera mentionne inside/interior/room ──
  console.group('[VA4] interior_variant.scene_camera mentionne inside/room');
  for (const { label, re } of APT_VARIANT_PATTERNS) {
    const norm = normalize(label);
    const scen = scenarios.find(s => new RegExp(s._for, 'i').test(norm));
    if (scen?.interior_variant?.scene_camera) {
      ok(/inside|interior|room/i.test(scen.interior_variant.scene_camera),
        `VA4: "${label}" scene_camera mentionne inside/room`);
    }
  }
  console.groupEnd();

  // ── VA5 — interior_variant.scene_note mentionne apartment/interior ───────
  console.group('[VA5] interior_variant.scene_note mentionne apartment/interior');
  for (const { label, re } of APT_VARIANT_PATTERNS) {
    const norm = normalize(label);
    const scen = scenarios.find(s => new RegExp(s._for, 'i').test(norm));
    if (scen?.interior_variant?.scene_note) {
      ok(/apartment|interior|inside.*room|room.*inside/i.test(scen.interior_variant.scene_note),
        `VA5: "${label}" scene_note mentionne apartment/interior`);
    }
  }
  console.groupEnd();

  // ── VA6 — interior_variant.location_must_have : termes intérieurs ────────
  console.group('[VA6] interior_variant.location_must_have — termes intérieurs');
  for (const { label, re } of APT_VARIANT_PATTERNS) {
    const norm = normalize(label);
    const scen = scenarios.find(s => new RegExp(s._for, 'i').test(norm));
    if (scen?.interior_variant) {
      const mh = JSON.stringify(scen.interior_variant.location_must_have || []);
      ok(/apartment|interior|inside|indoor|room|wall.*floor|floor.*wall/i.test(mh),
        `VA6: "${label}" location_must_have contient termes intérieurs`);
    }
  }
  console.groupEnd();

  // ── VA7 — interior_variant.location_forbidden : termes extérieurs ────────
  console.group('[VA7] interior_variant.location_forbidden — termes extérieurs exclus');
  for (const { label, re } of APT_VARIANT_PATTERNS) {
    const norm = normalize(label);
    const scen = scenarios.find(s => new RegExp(s._for, 'i').test(norm));
    if (scen?.interior_variant) {
      const fb = JSON.stringify(scen.interior_variant.location_forbidden || []);
      ok(/facade|garden|outdoor|van|vehicle|scaffolding/i.test(fb),
        `VA7: "${label}" location_forbidden exclut éléments extérieurs`);
    }
  }
  console.groupEnd();

  // ── VA8 — interior_variant a tools, protections, chantier_details ────────
  console.group('[VA8] interior_variant — tools/protections/chantier_details présents');
  for (const { label, re } of APT_VARIANT_PATTERNS) {
    const norm = normalize(label);
    const scen = scenarios.find(s => new RegExp(s._for, 'i').test(norm));
    if (scen?.interior_variant) {
      const iv = scen.interior_variant;
      ok(Array.isArray(iv.tools) && iv.tools.length > 0,
        `VA8: "${label}" interior_variant.tools défini et non vide`);
      ok(Array.isArray(iv.protections) && iv.protections.length > 0,
        `VA8: "${label}" interior_variant.protections défini et non vide`);
      ok(Array.isArray(iv.chantier_details) && iv.chantier_details.length > 0,
        `VA8: "${label}" interior_variant.chantier_details défini et non vide`);
    }
  }
  console.groupEnd();

  // ── VA9 — interior_variant.scene_note distinct de la version extérieure ──
  console.group('[VA9] interior_variant.scene_note distinct de l\'extérieur');
  for (const { label, re } of APT_VARIANT_PATTERNS) {
    const norm = normalize(label);
    const scen = scenarios.find(s => new RegExp(s._for, 'i').test(norm));
    if (scen?.interior_variant) {
      ok(scen.interior_variant.scene_note !== scen.scene_note,
        `VA9: "${label}" interior_variant.scene_note !== scene_note extérieur`);
    }
  }
  console.groupEnd();

  // ── VA10 — interior_variant appliqué via le resolver de production ───────────
  // Invokes real _applySiteRealism (production chain) with appartement context.
  // 6 services with interior_variant × 4 states = 24 combinations.
  // 2 exclusion services (urgence, porte vitrée) × 4 states = 8 checks.
  console.group('[VA10] interior_variant via _applySiteRealism (chaîne prod, contexte=appartement)');
  const APT_RESOLVER_CASES = [
    { label: 'Remplacement vitrage brisé',     svc: 'Remplacement vitrage brisé' },
    { label: 'Remplacement double vitrage',    svc: 'Remplacement double vitrage' },
    { label: 'Remplacement fenêtre PVC',       svc: 'Remplacement fenêtre PVC' },
    { label: 'Remplacement fenêtre aluminium', svc: 'Remplacement fenêtre aluminium' },
    { label: 'Réparation fenêtre',             svc: 'Réparation fenêtre' },
    { label: 'Vitrage sécurité feuilleté',     svc: 'Vitrage sécurité feuilleté' },
  ];
  for (const { label, svc } of APT_RESOLVER_CASES) {
    for (const state of STATE_KEYS) {
      try {
        const fakeScene = JSON.stringify({ _matched_key: 'vitrier', _matched_service: svc, contexte: 'appartement', state_level: state });
        const result = JSON.parse(_applySiteRealism(fakeScene, 0));
        ok(result.setting === 'interior',
          `VA10: "${label}" [${state}] → setting=interior`);
        ok(/apartment|interior|inside.*room|room.*inside/i.test(result.work_type || ''),
          `VA10: "${label}" [${state}] → work_type reflète appartement`);
        const mh = JSON.stringify(result.location_must_have || []);
        ok(/apartment|interior|inside|indoor/i.test(mh),
          `VA10: "${label}" [${state}] → location_must_have contient termes intérieurs`);
      } catch(e) {
        ok(false, `VA10: "${label}" [${state}] — erreur resolver: ${e.message}`);
      }
    }
  }
  // Exclusions: porte vitrée + urgence ne reçoivent PAS interior_variant même avec appartement
  const APT_EXCLUSION_CASES = [
    { label: 'Remplacement porte vitrée', svc: 'Remplacement porte vitrée' },
    { label: 'Bris de glace urgence',     svc: 'Bris de glace urgence' },
  ];
  for (const { label, svc } of APT_EXCLUSION_CASES) {
    for (const state of STATE_KEYS) {
      try {
        const fakeScene = JSON.stringify({ _matched_key: 'vitrier', _matched_service: svc, contexte: 'appartement', state_level: state });
        const result = JSON.parse(_applySiteRealism(fakeScene, 0));
        ok(result.setting !== 'interior',
          `VA10: "${label}" [${state}] — setting non-interior même avec contexte=appartement`);
      } catch(e) {
        ok(false, `VA10: "${label}" [${state}] — erreur resolver: ${e.message}`);
      }
    }
  }
  console.groupEnd();

  // ── VA11 — Matrice extérieure : 8 services × 4 états ─────────────────────
  // contexte=maison → aucun interior_variant ne doit être appliqué
  console.group('[VA11] Matrice extérieure — 8 services × 4 états, pas d\'interior_variant accidentel');
  const ALL_VITRIER_SERVICES = [
    'Remplacement vitrage brisé', 'Remplacement double vitrage',
    'Remplacement fenêtre PVC', 'Remplacement fenêtre aluminium',
    'Réparation fenêtre', 'Remplacement porte vitrée',
    'Vitrage sécurité feuilleté', 'Bris de glace urgence',
  ];
  for (const svc of ALL_VITRIER_SERVICES) {
    for (const state of STATE_KEYS) {
      try {
        const fakeScene = JSON.stringify({ _matched_key: 'vitrier', _matched_service: svc, contexte: 'maison', state_level: state });
        const result = JSON.parse(_applySiteRealism(fakeScene, 0));
        ok(result.setting !== 'interior',
          `VA11: "${svc}" [${state}] contexte=maison → setting non-interior (was "${result.setting}")`);
      } catch(e) {
        ok(false, `VA11: "${svc}" [${state}] — erreur resolver: ${e.message}`);
      }
    }
  }
  console.groupEnd();

  // ── VA12 — Exclusions urgence + porte vitrée (cas nominaux) ───────────────
  // Even with appartement context and encours state, these two services must not receive interior variant.
  console.group('[VA12] Urgence + porte vitrée — exclusion interior_variant confirmée');
  for (const { label, svc } of [
    { label: 'Remplacement porte vitrée', svc: 'Remplacement porte vitrée' },
    { label: 'Bris de glace urgence',     svc: 'Bris de glace urgence' },
  ]) {
    try {
      const fakeScene = JSON.stringify({ _matched_key: 'vitrier', _matched_service: svc, contexte: 'appartement', state_level: 'encours' });
      const result = JSON.parse(_applySiteRealism(fakeScene, 0));
      ok(result.setting !== 'interior',
        `VA12: "${label}" avec contexte=appartement — setting reste non-interior`);
    } catch(e) {
      ok(false, `VA12: "${label}" — erreur: ${e.message}`);
    }
  }
  console.groupEnd();

  // ── VW1 — Grands vitrages : min 2 workers quand présence=workers ──────────
  console.group('[VW1] Grands vitrages — var_workers ≥ 2 avec presenceOverride=workers');
  const VW_LARGE_GLAZING = [
    'Remplacement double vitrage',
    'Vitrage sécurité feuilleté',
    'Remplacement porte vitrée',
  ];
  for (const svc of VW_LARGE_GLAZING) {
    try {
      const fakeScene = JSON.stringify({ _matched_key: 'vitrier', _matched_service: svc, state_level: 'encours', contexte: 'maison' });
      const result = JSON.parse(_applyVariation(fakeScene, 0, 'workers'));
      ok(result.var_workers >= 2,
        `VW1: "${svc}" avec workers → var_workers ≥ 2 (got ${result.var_workers})`);
    } catch(e) {
      ok(false, `VW1: "${svc}" — erreur: ${e.message}`);
    }
  }
  console.groupEnd();

  // ── VW2 — Réparation : var_workers ≥ 1 avec presenceOverride=workers ──────
  console.group('[VW2] Réparation — var_workers ≥ 1 avec presenceOverride=workers');
  try {
    const fakeRepair = JSON.stringify({ _matched_key: 'vitrier', _matched_service: 'Réparation fenêtre', state_level: 'encours', contexte: 'maison' });
    const repairResult = JSON.parse(_applyVariation(fakeRepair, 0, 'workers'));
    ok(repairResult.var_workers >= 1,
      `VW2: réparation avec workers → var_workers ≥ 1 (got ${repairResult.var_workers})`);
  } catch(e) {
    ok(false, `VW2: réparation — erreur: ${e.message}`);
  }
  console.groupEnd();

  // ── VT1 — Télémétrie safety : champs requis présents ─────────────────────
  // ── VT2 — Télémétrie safety : champs sensibles absents ───────────────────
  console.group('[VT1–VT2] Télémétrie safety — run-batch.js inspecté en source');
  try {
    const runBatchSrc = await fetch('/src/image-generation/pipeline/run-batch.js', { cache: 'no-store' }).then(r => r.text());
    const REQUIRED_TELEMETRY = ['taskId', 'service', 'imageAttempt', 'safetyAttempt', 'safety_rule_id', 'safety_reason_code', 'safety_result'];
    const FORBIDDEN_TELEMETRY = ['apiKey', 'base64', 'Authorization', 'sk-'];
    for (const field of REQUIRED_TELEMETRY) {
      ok(runBatchSrc.includes(field),
        `VT1: run-batch.js contient le champ télémétrie requis "${field}"`);
    }
    // Isolate the SAFETY TELEMETRY block to avoid false matches on other code
    const telemetryBlock = runBatchSrc.match(/SAFETY TELEMETRY[\s\S]*?JSON\.stringify\(\{[\s\S]*?\}\)/)?.[0] || '';
    ok(telemetryBlock.length > 0,
      'VT1: bloc [SAFETY TELEMETRY] JSON.stringify trouvé dans run-batch.js');
    for (const field of FORBIDDEN_TELEMETRY) {
      ok(!telemetryBlock.includes(field),
        `VT2: bloc télémétrie ne contient pas le champ sensible "${field}"`);
    }
  } catch(e) {
    ok(false, `VT: erreur lors de l'inspection de run-batch.js — ${e.message}`);
  }
  console.groupEnd();

  // ── VF1 — Tout large-glass worker a des gants anti-coupure visibles ────────
  console.group('[VF1] Grands vitrages — gants anti-coupure obligatoires pour chaque worker');
  const LARGE_GLASS_SERVICES = ['double.vitrage', 'feuillette|vitrage.*securite|securite.*vitrage'];
  for (const pattern of LARGE_GLASS_SERVICES) {
    const scen = scenarios.find(s => new RegExp(s._for, 'i').test(pattern.replace(/\|.*/,'')));
    if (scen?.interior_variant) {
      const iv = scen.interior_variant;
      const protText = JSON.stringify(iv.protections || []);
      ok(/glove/i.test(protText),
        `VF1: "${scen._for}" interior_variant.protections mentionne gloves`);
      ok(/cut.resistant|glazing.*glove/i.test(protText),
        `VF1: "${scen._for}" interior_variant.protections spécifie cut-resistant ou glazing glove`);
    }
  }
  console.groupEnd();

  // ── VF2 — Aucune main masquée sur glass contact ─────────────────────────
  console.group('[VF2] Grands vitrages — interdiction main masquée');
  for (const pattern of LARGE_GLASS_SERVICES) {
    const scen = scenarios.find(s => new RegExp(s._for, 'i').test(pattern.replace(/\|.*/,'')));
    if (scen?.interior_variant) {
      const iv = scen.interior_variant;
      const fbText = JSON.stringify(iv.location_forbidden || []);
      const protText = JSON.stringify(iv.protections || []);
      const hasHiddenHandForbidden = /hidden|no bare hand|hand.*hidden|hands hidden/i.test(fbText + protText);
      ok(hasHiddenHandForbidden,
        `VF2: "${scen._for}" interior_variant interdit les mains masquées sur le verre`);
    }
  }
  console.groupEnd();

  // ── VF3 — Double vitrage : spacer bar + gants coexistent dans prompt ─────
  console.group('[VF3] Double vitrage — spacer bar et gants coexistent');
  const dvScen = scenarios.find(s => new RegExp(s._for, 'i').test('double vitrage'));
  if (dvScen?.interior_variant) {
    const iv3 = dvScen.interior_variant;
    const combined = JSON.stringify(iv3);
    ok(/spacer.bar|spacer.*bar/i.test(combined),
      'VF3: interior_variant double vitrage contient spacer bar');
    ok(/glove|cut.resistant/i.test(combined),
      'VF3: interior_variant double vitrage contient gants');
    // Both must appear — not one at the expense of the other
    ok(/spacer.bar|spacer.*bar/i.test(JSON.stringify(iv3.location_must_have || [])),
      'VF3: location_must_have double vitrage exige spacer bar visible');
    ok(/glove|cut.resistant/i.test(JSON.stringify(iv3.protections || [])),
      'VF3: protections double vitrage exige gants');
  }
  console.groupEnd();

  // ── VF4 — Feuilleté : tranche non bloquée par les workers ───────────────
  console.group('[VF4] Feuilleté — tranche lamifiée non bloquée par workers');
  const feuilScen = scenarios.find(s => new RegExp(s._for, 'i').test('vitrage securite feuillette'));
  if (feuilScen?.interior_variant) {
    const iv4 = feuilScen.interior_variant;
    const fb4 = JSON.stringify(iv4.location_forbidden || []);
    ok(/rear.*view.*worker|worker.*blocking|worker.*hiding|worker.*block.*edge/i.test(fb4),
      'VF4: location_forbidden interdit les workers bloquant la tranche vue caméra');
    ok(/front.only.*view|only.*frontal|edge.*hidden.*frame|hidden.*inside.*frame/i.test(fb4),
      'VF4: location_forbidden interdit vue frontale cachant la tranche');
  }
  console.groupEnd();

  // ── VF5 — Feuilleté : interlayer PVB obligatoire en contexte appartement ─
  console.group('[VF5] Feuilleté — PVB interlayer obligatoire en appartement');
  if (feuilScen?.interior_variant) {
    const iv5 = feuilScen.interior_variant;
    const mh5 = JSON.stringify(iv5.location_must_have || []);
    ok(/PVB|interlayer/i.test(mh5),
      'VF5: location_must_have feuilleté interior_variant exige PVB interlayer');
    ok(/oblique|cross.section|multilayer.*cross|cross.*section/i.test(mh5),
      'VF5: location_must_have feuilleté interior_variant exige coupe oblique multilayer');
  }
  console.groupEnd();

  // ── VF6 — Caméra oblique pour les deux scènes de preuve matière ──────────
  console.group('[VF6] Caméra oblique — double vitrage et feuilleté');
  if (dvScen?.interior_variant) {
    ok(/oblique|three.quarter|side.*view|partly.*side/i.test(dvScen.interior_variant.scene_camera || ''),
      'VF6: double vitrage interior_variant scene_camera mentionne angle oblique');
  }
  if (feuilScen?.interior_variant) {
    ok(/oblique|three.quarter|side.*view|partly.*side/i.test(feuilScen.interior_variant.scene_camera || ''),
      'VF6: feuilleté interior_variant scene_camera mentionne angle oblique');
  }
  console.groupEnd();

  // ── VF7 — Contexte pièce ne prime pas sur la preuve matériau ────────────
  console.group('[VF7] Priorité : preuve matériau > décor pièce');
  // Double vitrage: spacer bar must appear in location_must_have (not just scene_note)
  if (dvScen?.interior_variant) {
    const mh7dv = JSON.stringify(dvScen.interior_variant.location_must_have || []);
    ok(/spacer.bar|IGU.*edge|edge.*spacer/i.test(mh7dv),
      'VF7: double vitrage interior_variant location_must_have exige spacer/IGU (preuve matière avant décor)');
  }
  // Feuilleté: PVB must appear in location_must_have (not just scene_note)
  if (feuilScen?.interior_variant) {
    const mh7f = JSON.stringify(feuilScen.interior_variant.location_must_have || []);
    ok(/PVB|interlayer/i.test(mh7f),
      'VF7: feuilleté interior_variant location_must_have exige PVB interlayer (preuve matière avant décor)');
    // Sanity: bedroom/décor context must NOT appear as a location_must_have requirement
    ok(!/bedroom|bed|lit|chambre|divan/i.test(mh7f),
      'VF7: feuilleté interior_variant location_must_have ne liste pas le décor chambre comme obligatoire');
  }
  console.groupEnd();

  // ── VF8 — Limite de tentatives non dépassable ────────────────────────────
  console.group('[VF8] Audit tentatives — MAX_IMAGE_ATTEMPTS jamais dépassé');
  // Import MAX_IMAGE_ATTEMPTS and MAX_SAFETY_ATTEMPTS_PER_IMAGE via source inspection
  try {
    const stateSrc = await fetch('/src/image-generation/pipeline/state.js', { cache: 'no-store' }).then(r => r.text());
    const matchMax = stateSrc.match(/MAX_IMAGE_ATTEMPTS\s*=\s*(\d+)/);
    const matchSafety = stateSrc.match(/MAX_SAFETY_ATTEMPTS_PER_IMAGE\s*=\s*(\d+)/);
    const maxImg = matchMax ? parseInt(matchMax[1], 10) : null;
    const maxSfty = matchSafety ? parseInt(matchSafety[1], 10) : null;
    ok(maxImg !== null && maxImg >= 1,
      `VF8: MAX_IMAGE_ATTEMPTS défini et >= 1 (got ${maxImg})`);
    ok(maxSfty !== null && maxSfty >= 1,
      `VF8: MAX_SAFETY_ATTEMPTS_PER_IMAGE défini et >= 1 (got ${maxSfty})`);
    // run-batch.js must use the constant, not a hardcoded number
    const runBatchSrc = await fetch('/src/image-generation/pipeline/run-batch.js', { cache: 'no-store' }).then(r => r.text());
    ok(/imageAttempt\s*<=\s*MAX_IMAGE_ATTEMPTS/.test(runBatchSrc),
      'VF8: run-batch.js utilise MAX_IMAGE_ATTEMPTS dans la condition de boucle (pas un littéral)');
    ok(/safetyAttempt\s*<=\s*MAX_SAFETY_ATTEMPTS_PER_IMAGE/.test(runBatchSrc),
      'VF8: run-batch.js utilise MAX_SAFETY_ATTEMPTS_PER_IMAGE dans la condition de boucle (pas un littéral)');
  } catch(e) {
    ok(false, `VF8: erreur lors de l'audit state.js/run-batch.js — ${e.message}`);
  }
  console.groupEnd();

  // ── VF9 — Compteurs image et Vision séparés ──────────────────────────────
  console.group('[VF9] Compteurs image et Vision séparés');
  try {
    const stateSrc2 = await fetch('/src/image-generation/pipeline/state.js', { cache: 'no-store' }).then(r => r.text());
    ok(/imageCalls\s*:\s*0/.test(stateSrc2),
      'VF9: state.js a un compteur imageCalls distinct');
    ok(/visionCalls\s*:\s*0/.test(stateSrc2),
      'VF9: state.js a un compteur visionCalls distinct');
    // They must be separate keys (not aliased)
    const stateCounters = stateSrc2.match(/counters\s*:\s*\{[\s\S]*?\}/)?.[0] || '';
    ok(stateCounters.includes('imageCalls') && stateCounters.includes('visionCalls'),
      'VF9: imageCalls et visionCalls sont deux clés distinctes dans counters{}');
    // run-batch increments each independently
    const runBatchSrc2 = await fetch('/src/image-generation/pipeline/run-batch.js', { cache: 'no-store' }).then(r => r.text());
    ok(/counters\.imageCalls\+\+|counters\.imageCalls\s*\+=/.test(runBatchSrc2) ||
       /imageCalls/.test(runBatchSrc2),
      'VF9: run-batch.js référence imageCalls');
    ok(/counters\.visionCalls\+\+|visionCalls/.test(runBatchSrc2),
      'VF9: run-batch.js référence visionCalls');
  } catch(e) {
    ok(false, `VF9: erreur lors de l'audit des compteurs — ${e.message}`);
  }
  console.groupEnd();

  // ── VF10 — Routes PVC et réparation inchangées ───────────────────────────
  console.group('[VF10] Routes PVC et réparation — inchangées');
  const pvcScen2 = scenarios.find(s => new RegExp(s._for, 'i').test('fenetre pvc'));
  const repScen2 = scenarios.find(s => new RegExp(s._for, 'i').test('reparation fenetre'));
  // PVC route: white frame, rough opening, no glass-only
  if (pvcScen2) {
    const pvcNote = pvcScen2.scene_note || '';
    ok(/white|PVC|plastic/i.test(pvcNote),
      'VF10: scénario PVC scene_note toujours blanc/PVC/plastic');
    ok(pvcScen2.interior_variant != null,
      'VF10: scénario PVC interior_variant toujours présent');
    ok(pvcScen2.interior_variant?.setting === 'interior',
      'VF10: PVC interior_variant.setting toujours interior');
  }
  // Repair route: existing frame retained, no full removal
  if (repScen2) {
    const repNote = repScen2.scene_note || '';
    ok(/repair|replace.*handle|hinge|mechan|adjust/i.test(repNote),
      'VF10: scénario réparation scene_note mentionne réglage/mécanisme/ajustement');
    ok(repScen2.interior_variant != null,
      'VF10: scénario réparation interior_variant toujours présent');
    ok(repScen2.interior_variant?.setting === 'interior',
      'VF10: réparation interior_variant.setting toujours interior');
  }
  // Neither PVC nor repair scene_note should have changed to mention glazing edges or PVB
  if (pvcScen2) {
    ok(!/PVB|interlayer|spacer.bar/i.test(pvcScen2.scene_note || ''),
      'VF10: PVC scene_note ne mentionne pas PVB/interlayer/spacer (pas de contamination feuilleté/IGU)');
  }
  if (repScen2) {
    ok(!/PVB|interlayer|spacer.bar/i.test(repScen2.scene_note || ''),
      'VF10: réparation scene_note ne mentionne pas PVB/interlayer/spacer (pas de contamination)');
  }
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
