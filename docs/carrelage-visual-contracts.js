/**
 * docs/carrelage-visual-contracts.js
 * Contrats visuels pour les 9 sous-services carrelage.
 *
 * Chaque objet définit ce qu'une photo DOIT montrer, ce qu'elle ne doit PAS
 * montrer, et comment on distingue ce service des huit autres.
 * Ces contrats sont la source de vérité avant d'écrire les scènes WORK_SCENES
 * et les patterns _for du SITE_REALISM.
 *
 * STATUT : à valider — aucun prompt métier modifié, aucune scène produite.
 */

export const CARRELAGE_VISUAL_CONTRACTS = [

  // ─── 1. Pose carrelage sol ─────────────────────────────────────────────────
  {
    service:       'Pose carrelage sol',
    metier_key:    'carrelage',
    for_regex:     'carrelage sol|pose.*sol|sol.*carrelage',

    visual_goal:
      'Montrer une pose de carreaux sur un sol intérieur en cours de réalisation.',

    required_visual_evidence: [
      'rangées de carreaux déjà posées sur le sol (au moins 30 % de la surface visible)',
      'zone de sol encore nue avec colle fraîche ou mortier-colle visible',
      'croisillons réguliers entre les carreaux posés',
      'transition nette entre zone terminée et zone en attente',
      'outillage au sol : truelle crantée, maillet caoutchouc',
    ],

    forbidden_confusions: [
      'carreaux sur un mur — ce serait "Pose carrelage mural"',
      'contexte de salle de bain identifiable — ce serait "Faïence salle de bain"',
      'contexte cuisine identifiable — ce serait "Faïence cuisine"',
      'espace extérieur — ce serait "Carrelage terrasse extérieure"',
      'travail de jointoiement seul sans pose — ce serait "Réfection joint"',
      'pièce entièrement terminée sans preuve de chantier actif',
    ],

    work_surface:    'sol intérieur (couloir, pièce de vie, entrée)',
    location_types:  ['maison', 'appartement', 'local commercial'],
    setting:         'interior',

    states: {
      debut:     'sol brut ou ancien carrelage déposé, carton de carreaux ouvert, outillage sorti',
      en_cours:  'rangées posées visibles, croisillons, zone de colle fraîche, maillet en usage',
      termine:   'sol entièrement carrelé, joints gris encore humides, seau de rinçage visible',
    },

    common_confusions_detail:
      'Pose carrelage sol ≠ Dallage extérieur (contexte outdoor), ≠ Faïence (mur ou pièce humide), ≠ Pose pierre naturelle (matière)',

    composition_preferences: [
      'angle légèrement bas depuis le coin de la pièce, montrant la longueur du travail',
      'profondeur de champ révélant la progression de la pose',
    ],
  },

  // ─── 2. Pose carrelage mural ───────────────────────────────────────────────
  {
    service:       'Pose carrelage mural',
    metier_key:    'carrelage',
    for_regex:     'carrelage mural|pose.*mur|mur.*carrelage',

    visual_goal:
      'Montrer une pose de carreaux sur un mur intérieur (pas salle de bain, pas cuisine).',

    required_visual_evidence: [
      'carreaux collés sur un mur vertical',
      'rangées horizontales progressant de bas en haut',
      'colle encore visible sur les carreaux pas encore posés',
      'niveau à bulle ou lasers de guidage visible',
      'zone du mur encore nue au-dessus ou à côté des carreaux posés',
    ],

    forbidden_confusions: [
      'carreaux au sol — ce serait "Pose carrelage sol"',
      'baignoire ou bac de douche visible — ce serait "Faïence salle de bain"',
      'plan de travail ou évier cuisine — ce serait "Faïence cuisine"',
      'mur extérieur — pas dans le scope carrelage mural',
    ],

    work_surface:    'mur intérieur (couloir, entrée, local)',
    location_types:  ['maison', 'local commercial'],
    setting:         'interior',

    states: {
      debut:     'mur préparé (enduit, primaire), gabarit posé, premier carré tracé',
      en_cours:  'rangées visibles sur le mur, outils de coupe posés au sol',
      termine:   'mur entièrement carrelé, joints frais, éponge de nettoyage visible',
    },

    common_confusions_detail:
      'Différenciateur clé : surface de travail est VERTICALE. Si pièce humide → faïence SdB ou cuisine.',

    composition_preferences: [
      'cadrage en légère contre-plongée pour montrer la progression verticale',
      'artisan visible de dos ou de côté en train de coller une rangée',
    ],
  },

  // ─── 3. Faïence salle de bain ──────────────────────────────────────────────
  {
    service:       'Faïence salle de bain',
    metier_key:    'carrelage',
    for_regex:     'faience.*salle|salle.*bain|douche|baignoire|sdb',

    visual_goal:
      'Montrer une pose de faïence dans une salle de bain — contexte humide explicite.',

    required_visual_evidence: [
      'baignoire, receveur de douche, ou robinetterie de salle de bain visible dans le cadre',
      'faïence murale en cours de pose autour de ces équipements',
      'joints de silicone ou carreaux en mosaïque petits formats typiques salle de bain',
      'sol carrelé antidérapant ou en cours de pose',
    ],

    forbidden_confusions: [
      'contexte cuisine — ce serait "Faïence cuisine"',
      'mur générique sans équipement sanitaire — ce serait "Pose carrelage mural"',
      'espace extérieur',
    ],

    work_surface:    'murs et sol de salle de bain',
    location_types:  ['maison', 'appartement'],
    setting:         'interior',

    states: {
      debut:     'salle de bain débarrassée, anciens carreaux retirés, receveur visible',
      en_cours:  'faïence à mi-hauteur, outils au sol, baignoire ou douche visible',
      termine:   'pièce entièrement carrelée, joints silicone frais autour des équipements',
    },

    common_confusions_detail:
      'Différenciateur absolu : un équipement sanitaire (bac, baignoire, mitigeur mural) DOIT être visible.',

    composition_preferences: [
      "angle montrant à la fois le mur carrelé et l'équipement de salle de bain",
      'focus sur la transition entre faïence et silicone autour du receveur',
    ],
  },

  // ─── 4. Faïence cuisine ────────────────────────────────────────────────────
  {
    service:       'Faïence cuisine',
    metier_key:    'carrelage',
    for_regex:     'faience.*cuisine|cuisine.*faience|credence',

    visual_goal:
      'Montrer une pose de faïence dans une cuisine — crédence ou mur au-dessus du plan de travail.',

    required_visual_evidence: [
      'plan de travail ou évier de cuisine visible dans le cadre',
      'crédence en cours de pose : carreaux collés derrière la zone cuisson ou évier',
      "coupe de carreaux autour d'une prise encastrée ou d'un robinet mural",
    ],

    forbidden_confusions: [
      'salle de bain — ce serait "Faïence salle de bain"',
      'mur générique sans contexte cuisine — ce serait "Pose carrelage mural"',
    ],

    work_surface:    'crédence et murs de cuisine',
    location_types:  ['maison', 'appartement'],
    setting:         'interior',

    states: {
      debut:     'cuisine vide ou dégagée, traits de guide tracés sur le mur',
      en_cours:  'crédence à moitié posée, découpes autour des prises',
      termine:   'crédence entière, joints frais, plan de travail visible en bas de cadre',
    },

    common_confusions_detail:
      'Différenciateur : plan de travail ou équipement de cuisine DOIT être visible en bas du cadre.',

    composition_preferences: [
      'angle plongeant depuis le haut pour montrer crédence + plan de travail dans le même cadre',
    ],
  },

  // ─── 5. Carrelage terrasse extérieure ─────────────────────────────────────
  {
    service:       'Carrelage terrasse extérieure',
    metier_key:    'carrelage',
    for_regex:     'terrasse|exterieur.*carrelage|carrelage.*exterieur',

    visual_goal:
      'Montrer une pose de carreaux sur une terrasse ou espace de vie extérieur.',

    required_visual_evidence: [
      'espace extérieur clairement identifiable : lumière naturelle directe, ciel ou végétation visible',
      'carreaux grand format posés à plat (20×20 minimum typique terrasse)',
      'transition entre zone posée et zone en cours',
      'joints larges ou plots de fixation visibles si dalles sur plots',
    ],

    forbidden_confusions: [
      'espace intérieur — ce serait "Pose carrelage sol"',
      'allée ou cour sans espace de vie aménagé — ce serait "Dallage extérieur"',
      'galets ou gravillons — hors scope',
    ],

    work_surface:    'terrasse ou balcon extérieur',
    location_types:  ['maison', 'appartement (balcon)', 'local commercial'],
    setting:         'exterior',

    states: {
      debut:     'terrasse débarrassée, chape ou structure de support visible',
      en_cours:  'rangées posées, zone nue visible, outils au sol extérieur',
      termine:   "terrasse entièrement carrelée, joints gris, vue sur l'extérieur",
    },

    common_confusions_detail:
      'Différenciateur : contexte OUTDOOR obligatoire. Terrasse = espace de vie. Dallage = allée/cour fonctionnelle.',

    composition_preferences: [
      "angle légèrement haut montrant la surface de la terrasse et l'environnement extérieur",
      'végétation ou barrière de balcon visible en arrière-plan',
    ],
  },

  // ─── 6. Dallage extérieur ─────────────────────────────────────────────────
  {
    service:       'Dallage extérieur',
    metier_key:    'carrelage',
    for_regex:     'dallage|dalle.*ext|allee|cour|acces',

    visual_goal:
      "Montrer une pose de dalles béton, pierre ou grès dans une allée, cour ou voie d'accès.",

    required_visual_evidence: [
      'contexte extérieur fonctionnel : allée, entrée de propriété, cour',
      'dalles épaisses posées sur sable ou béton de fondation',
      'joints larges entre dalles (>10 mm) typiques des dallages extérieurs',
      'outillage de maçonnerie extérieure : arrosoir, règle de mise à niveau, pioche',
    ],

    forbidden_confusions: [
      'terrasse aménagée avec mobilier — ce serait "Carrelage terrasse extérieure"',
      'espace intérieur',
      'carreaux fins < 10 mm (céramique intérieure)',
    ],

    work_surface:    'allée, cour, entrée de propriété, trottoir privé',
    location_types:  ['maison individuelle', "local commercial', "copropriété'],
    setting:         'exterior',

    states: {
      debut:     'sol décaissé ou chape visible, dalles en stock sur le côté',
      en_cours:  'dalles posées sur 30–60 % de la surface, règle de niveau en action',
      termine:   'allée entièrement dallée, joints sablés, bordures posées',
    },

    common_confusions_detail:
      'Différenciateur : dalles épaisses + contexte fonctionnel (accès, cour). Pas de mobilier de jardin ou de vue de vie.',

    composition_preferences: [
      "angle en léger contre-plongée montrant la profondeur de l'allée",
      "prise depuis l'entrée pour montrer la progression du dallage",
    ],
  },

  // ─── 7. Pose pierre naturelle ─────────────────────────────────────────────
  {
    service:       'Pose pierre naturelle',
    metier_key:    'carrelage',
    for_regex:     'pierre naturelle|travertin|ardoise|marbre|granite|schiste',

    visual_goal:
      'Montrer une pose de dalles en matière naturelle avec la texture distinctive du matériau.',

    required_visual_evidence: [
      'texture de pierre naturelle clairement visible : veinures, porosité, irrégularités de surface',
      'format de dalle généralement irrégulier ou grand format',
      'mortier-colle spécial pierre naturelle (blanc ou gris clair)',
      "transition entre zone posée et zone nue révélant l'épaisseur de la pierre",
    ],

    forbidden_confusions: [
      'carrelage en grès cérame imitant la pierre — texture doit être vraiment naturelle',
      'dallage extérieur fonctionnel — ici la matière (esthétique) est le sujet',
      'faïence en céramique standard',
    ],

    work_surface:    'sol ou mur intérieur ou extérieur, selon le contexte de la commande',
    location_types:  ['maison', 'appartement haut de gamme', 'local commercial'],
    setting:         'interior ou exterior selon contexte',

    states: {
      debut:     'dalles de pierre en stock, sol préparé, joints de dilatation tracés',
      en_cours:  'dalles posées révélant leur texture naturelle, zones de colle blanche visible',
      termine:   'surface polie ou huilée, joints fins, brillance naturelle du matériau',
    },

    common_confusions_detail:
      "Différenciateur : MATIÈRE. La texture non-industrielle de la pierre doit s'imposer visuellement.",

    composition_preferences: [
      'macro ou gros plan révélant les veines et la texture naturelle du matériau',
      'angle rasant sur le sol pour accentuer les reliefs et irrégularités',
    ],
  },

  // ─── 8. Réfection joint ───────────────────────────────────────────────────
  {
    service:       'Réfection joint',
    metier_key:    'carrelage',
    for_regex:     'joint|rejointoiement|refection.*joint|joint.*refection',

    visual_goal:
      'Montrer un travail de rejointoiement : anciens joints retirés et nouveaux appliqués.',

    required_visual_evidence: [
      'carrelage existant (posé depuis longtemps) constituant le fond de la scène',
      'anciens joints noirs ou détériorés clairement visibles dans une zone',
      'outils de rejointoiement : disque à rainurer, éponge, seau de mortier-joint',
      "joint frais gris ou coloré appliqué dans une autre zone en contraste avec l'ancien",
    ],

    forbidden_confusions: [
      'pose de carreaux neufs — les carreaux DOIVENT être déjà en place, anciens',
      'démolition ou Réfection carrelage — aucun carreau arraché visible',
    ],

    work_surface:    'carrelage existant (sol ou mur)',
    location_types:  ['maison', 'appartement', 'local commercial'],
    setting:         'interior',

    states: {
      debut:     'joints anciens grattés dans une zone, poussière de joint visible',
      en_cours:  'moitié des joints refaits, contraste vieux/neuf marqué',
      termine:   'joints uniformément refaits, surface éponge-nettoyée, brillance restaurée',
    },

    common_confusions_detail:
      'Différenciateur absolu : carreaux EXISTANTS + focus sur le joint. Aucun carreau neuf en cours de pose.',

    composition_preferences: [
      'plan rapproché montrant le contraste visuel entre joint ancien et joint neuf',
      'artisan appliquant le joint à la spatule en caoutchouc',
    ],
  },

  // ─── 9. Réfection carrelage ───────────────────────────────────────────────
  {
    service:       'Réfection carrelage',
    metier_key:    'carrelage',
    for_regex:     'refection carrelage|renovation carrelage|remplacement carrelage|carrelage.*refection',

    visual_goal:
      "Montrer une rénovation complète : dépose de l'ancien carrelage et pose du nouveau.",

    required_visual_evidence: [
      "zone où l'ancien carrelage a été arraché (béton ou chape nue visible)",
      'débris et carreaux cassés regroupés en tas dans un coin',
      'zone adjacente où le nouveau carrelage est en cours de pose',
      'transition visible entre les deux états (déposé / en cours de re-pose)',
    ],

    forbidden_confusions: [
      "Pose carrelage sol simple — aucune trace de dépose d'ancien carrelage",
      'Réfection joint — pas de carreaux arrachés ici',
      "chantier entièrement neuf (construction) — ici c'est de la rénovation",
    ],

    work_surface:    'sol ou mur intérieur, contexte rénovation',
    location_types:  ['maison', 'appartement', 'local commercial à rénover'],
    setting:         'interior',

    states: {
      debut:     'ancien carrelage entièrement arraché, béton brut visible, burin et marteau au sol',
      en_cours:  'moitié du sol nu + moitié avec nouveau carrelage posé, contraste fort',
      termine:   'nouveau carrelage posé, joints frais, quelques débris résiduels dans un coin',
    },

    common_confusions_detail:
      'Différenciateur : la DÉPOSE est visible. Carreaux cassés ou sol nu co-existent avec la pose neuve.',

    composition_preferences: [
      "angle montrant la ligne de rupture entre l'ancien sol arraché et le nouveau carrelage",
      "débris bien visibles dans un angle, nouvelle pose dans l'autre",
    ],
  },

];

/**
 * Récapitulatif des _for regex proposés par service.
 * À valider avant implémentation dans SITE_REALISM.
 */
export const CARRELAGE_FOR_PATTERNS = CARRELAGE_VISUAL_CONTRACTS.map(c => ({
  service:   c.service,
  for_regex: c.for_regex,
}));

/**
 * Services sans différenciateur fort en dehors du contexte
 * (pas de _for suffisant — traitement par fallback acceptable) :
 *   → Aucun : tous les 9 services ont un _for proposé.
 *
 * Services à risque de confusion (paires à tester en négatif) :
 *   Pose sol       ↔ Faïence cuisine  (sol intérieur vs crédence)
 *   Faïence SdB    ↔ Faïence cuisine  (équipement sanitaire vs plan de travail)
 *   Terrasse       ↔ Dallage          (espace de vie vs accès fonctionnel)
 *   Réfection joint ↔ Réfection carrelage (joints seuls vs dépose+repose)
 */
