/**
 * docs/carrelage-visual-contracts.js — feat/carrelage-visual-contracts
 * Contrats visuels pour les 9 sous-services carrelage.
 * Source de vérité avant d'écrire les scènes WORK_SCENES / SITE_REALISM.
 *
 * STATUT : en validation — aucun WORK_SCENES / SITE_REALISM modifié.
 */

export const CARRELAGE_VISUAL_CONTRACTS = {

  pose_carrelage_sol: {
    service_key:   'pose_carrelage_sol',
    service_label: 'Pose carrelage sol',

    visual_goal:
      'Montrer une pose de carreaux sur un sol intérieur en cours : rangées posées, '
      + 'croisillons, colle visible, transition entre zone finie et zone nue.',

    observable_action:
      'un carreleur à genoux applique de la colle crantée sur le sol et pose des carreaux '
      + 'rangée par rangée en les nivelant avec des croisillons et un maillet en caoutchouc',

    required_visual_evidence: [
      'rangées de carreaux déjà posées (au moins 30 % de la surface visible)',
      'zone de sol encore nue avec colle fraîche ou mortier-colle visible',
      'croisillons réguliers entre les carreaux posés',
      'transition nette entre zone terminée et zone en attente',
      'truelle crantée ou maillet au sol à côté du carreleur',
    ],

    forbidden_confusions: [
      'carreaux sur un mur — serait "Pose carrelage mural"',
      'baignoire, receveur ou robinetterie sanitaire visible — serait "Faïence salle de bain"',
      'plan de travail ou évier cuisine — serait "Faïence cuisine"',
      'contexte extérieur (terrasse, allée) — serait "Carrelage terrasse" ou "Dallage"',
      'jointoiement seul sans pose de carreaux — serait "Réfection joint"',
      'texture pierre naturelle dominante — serait "Pose pierre naturelle"',
      'pièce vide entièrement terminée sans preuve de chantier actif',
    ],

    allowed_tools: [
      'truelle crantée (peigne à colle)',
      'maillet en caoutchouc',
      'croisillons ou clips de nivellement',
      'seau de mortier-colle',
      'niveau à bulle ou laser de nivellement',
      'coupe-carreaux ou carrelette',
      'éponge et seau de rinçage',
    ],

    forbidden_tools: [
      'rouleau de peinture',
      'marteau-piqueur (sauf dépose préalable déjà terminée)',
      'truelle lisse seule (sans croisillons)',
      'pistolet à mastiquer',
    ],

    work_surface:   ['sol intérieur — couloir, pièce de vie, entrée, séjour'],
    setting:        ['interior'],
    location_types: ['maison', 'appartement', 'local commercial'],

    worker_rules: {
      presence: 'optional',
      min: 1,
      max: 2,
      posture: 'à genoux au bord de la zone de pose, bras tendus vers les carreaux',
    },

    safety: {
      required: [
        'genouillères visibles si le carreleur est à genoux',
        'gants de travail résistants à la colle',
        'lunettes de protection lors des découpes',
      ],
      forbidden: [
        'casque de chantier',
        'gilet haute visibilité',
        'harnais',
      ],
    },

    states: {
      debut: {
        observable_action:        'carreleur mesure et trace les lignes directrices sur le sol nu',
        required_visual_evidence: [
          'sol entièrement nu avec lignes directrices tracées à la craie ou au laser',
          'carton de carreaux ouvert posé sur le côté',
          'seau de colle ou sac de mortier-colle fermé',
        ],
      },
      en_cours: {
        observable_action:        'carreleur pose des carreaux rangée par rangée avec croisillons',
        required_visual_evidence: [
          'rangées de carreaux posés avec croisillons visibles',
          'zone de colle fraîche sur la partie non encore carrelée',
          'maillet en caoutchouc en main ou posé sur les carreaux fraîchement posés',
        ],
      },
      termine: {
        observable_result:        'sol entièrement carrelé, joints gris encore humides',
        required_visual_evidence: [
          'sol couvert uniformément de carreaux identiques',
          'joints frais et réguliers entre chaque carreau',
          'seau de rinçage et éponge visibles dans un coin',
        ],
      },
    },

    composition_preferences: [
      'medium_intervention',
      'wide_worksite',
    ],

    for_regex: 'carrelage sol|pose carrelage sol',
  },

  pose_carrelage_mural: {
    service_key:   'pose_carrelage_mural',
    service_label: 'Pose carrelage mural',

    visual_goal:
      'Montrer une pose de carreaux sur un mur intérieur vertical, '
      + 'hors contexte salle de bain ou cuisine.',

    observable_action:
      'un carreleur debout ou sur escabeau colle des carreaux sur un mur vertical, '
      + 'travaillant rangée par rangée de bas en haut avec un niveau à bulle ou laser',

    required_visual_evidence: [
      'carreaux collés sur une surface murale verticale',
      'rangées horizontales progressant vers le haut',
      'colle visible sur la zone non encore carrelée du mur',
      'niveau à bulle ou ligne laser visible pour le guidage',
      'zone du mur encore nue au-dessus ou adjacente aux carreaux posés',
    ],

    forbidden_confusions: [
      'carreaux au sol — serait "Pose carrelage sol"',
      'baignoire, receveur ou robinetterie sanitaire visible — serait "Faïence salle de bain"',
      'plan de travail ou évier cuisine — serait "Faïence cuisine"',
      'mur extérieur — hors scope',
    ],

    allowed_tools: [
      'truelle crantée',
      'maillet en caoutchouc',
      'croisillons',
      'niveau à bulle ou laser de ligne',
      'ventouse ou crochet pour grand format',
      'coupe-carreaux',
      'seau de mortier-colle',
    ],

    forbidden_tools: [
      'rouleau de peinture',
      'pistolet à mastiquer',
    ],

    work_surface:   ['mur intérieur vertical — couloir, entrée, local commercial'],
    setting:        ['interior'],
    location_types: ['maison', 'local commercial'],

    worker_rules: {
      presence: 'optional',
      min: 1,
      max: 2,
      posture: 'debout ou sur escabeau, face au mur, bras levés à hauteur de travail',
    },

    safety: {
      required: [
        'gants de travail résistants à la colle',
        'lunettes de protection lors des découpes',
        'escabeau stable si travail en hauteur',
      ],
      forbidden: [
        'casque de chantier',
        'gilet haute visibilité',
        'harnais',
        'genouillères (travail vertical)',
      ],
    },

    states: {
      debut: {
        observable_action:        'carreleur applique gabarit et trace la première rangée sur le mur',
        required_visual_evidence: [
          'mur préparé — enduit ou primaire visible',
          'première rangée de guidage ou gabarit posé',
          'seau de colle ouvert au pied du mur',
        ],
      },
      en_cours: {
        observable_action:        'carreleur colle des carreaux rangées horizontales sur le mur',
        required_visual_evidence: [
          'deux ou trois rangées de carreaux posées sur le mur',
          'croisillons entre les rangées',
          'zone nue du mur au-dessus des carreaux posés',
        ],
      },
      termine: {
        observable_result:        'mur entièrement carrelé, joints frais, surface nettoyée',
        required_visual_evidence: [
          'mur recouvert uniformément de carreaux du sol au plafond',
          'joints réguliers et frais',
          'éponge de nettoyage visible dans un coin',
        ],
      },
    },

    composition_preferences: [
      'medium_intervention',
    ],

    for_regex: 'carrelage mural|pose carrelage mural',
  },

  faience_salle_de_bain: {
    service_key:   'faience_salle_de_bain',
    service_label: 'Faïence salle de bain',

    visual_goal:
      'Montrer une pose de faïence dans une salle de bain : '
      + 'équipements sanitaires visibles, faïence murale en pose active.',

    observable_action:
      "un carreleur pose de la faïence murale autour des équipements sanitaires "
      + "(baignoire, receveur de douche) avec découpes précises autour des arrivées d'eau",

    required_visual_evidence: [
      'baignoire, receveur de douche, vasque ou robinetterie murale visible dans le cadre',
      'faïence murale en cours de pose autour de ces équipements',
      "découpes ajustées autour des raccords de plomberie ou des accessoires muraux",
      'petits formats typiques salle de bain (carreaux 10×10 à 30×30 cm)',
    ],

    forbidden_confusions: [
      'plan de travail ou évier de cuisine — serait "Faïence cuisine"',
      'mur générique sans équipement sanitaire — serait "Pose carrelage mural"',
      'espace extérieur',
    ],

    allowed_tools: [
      'truelle crantée fine',
      'maillet en caoutchouc',
      'croisillons petits formats',
      'coupe-carreaux de précision',
      'perce-carrelage (mèche diamant)',
      'taloche à joints',
      'tube de silicone salle de bain',
    ],

    forbidden_tools: [
      'rouleau de peinture',
      'marteau-piqueur',
    ],

    work_surface:   ['murs et sol de salle de bain'],
    setting:        ['interior'],
    location_types: ['maison', 'appartement'],

    worker_rules: {
      presence: 'optional',
      min: 1,
      max: 1,
      posture: "debout ou accroupi face à la zone de pose, espace contraint de salle de bain",
    },

    safety: {
      required: [
        'gants résistants aux colles et aux produits de jointoiement',
        'lunettes lors des découpes ou perçages',
      ],
      forbidden: [
        'casque de chantier',
        'gilet haute visibilité',
        'harnais',
      ],
    },

    states: {
      debut: {
        observable_action:        'salle de bain vidée et mur préparé, équipements en attente',
        required_visual_evidence: [
          'receveur de douche ou baignoire visible sans faïence autour',
          'mur enduit ou brut, prêt à recevoir la faïence',
          'matériaux posés dans la pièce',
        ],
      },
      en_cours: {
        observable_action:        'carreleur pose la faïence autour du receveur ou de la baignoire',
        required_visual_evidence: [
          'faïence à mi-hauteur sur au moins un mur',
          'équipement sanitaire visible dans le cadre',
          'joints de silicone partiellement posés ou en cours',
        ],
      },
      termine: {
        observable_result:        'salle de bain entièrement carrelée, joints silicone frais',
        required_visual_evidence: [
          "faïence couvrant l'ensemble des murs au-dessus des équipements",
          "joints de silicone frais autour de la baignoire ou du receveur",
          'salle de bain reconnaissable avec équipements en place',
        ],
      },
    },

    composition_preferences: [
      'medium_intervention',
      'close_detail',
    ],

    for_regex: 'faience.*salle|faience.*bain|salle.*bain.*carre',
  },

  faience_cuisine: {
    service_key:   'faience_cuisine',
    service_label: 'Faïence cuisine',

    visual_goal:
      'Montrer une pose de faïence dans une cuisine — crédence derrière plan de travail ou évier.',

    observable_action:
      "un carreleur pose des carreaux de faïence en crédence derrière le plan de travail "
      + "avec des découpes autour des prises électriques encastrées",

    required_visual_evidence: [
      'plan de travail ou évier de cuisine visible dans le cadre',
      'crédence en cours de pose sur le mur derrière la zone cuisson ou évier',
      'découpes autour de prises encastrées ou de tuyauteries',
    ],

    forbidden_confusions: [
      'baignoire, receveur ou équipement sanitaire — serait "Faïence salle de bain"',
      'mur sans plan de travail ni évier — serait "Pose carrelage mural"',
      'sol de cuisine — serait "Pose carrelage sol"',
    ],

    allowed_tools: [
      'truelle crantée fine',
      'maillet en caoutchouc',
      'croisillons',
      'coupe-carreaux de précision',
      'perce-carrelage',
      'taloche à joints',
    ],

    forbidden_tools: [
      'rouleau de peinture',
      'marteau-piqueur',
    ],

    work_surface:   ['crédence et murs de cuisine au-dessus du plan de travail'],
    setting:        ['interior'],
    location_types: ['maison', 'appartement'],

    worker_rules: {
      presence: 'optional',
      min: 1,
      max: 1,
      posture: 'debout face au mur de cuisine, espace contraint entre plan de travail et mur',
    },

    safety: {
      required: [
        'gants résistants à la colle',
        'lunettes lors des perçages',
      ],
      forbidden: [
        'casque de chantier',
        'gilet haute visibilité',
        'harnais',
      ],
    },

    states: {
      debut: {
        observable_action:        'carreleur trace les lignes directrices sur le mur de cuisine',
        required_visual_evidence: [
          'plan de travail visible en bas de cadre',
          'mur nu au-dessus du plan de travail',
          'traces de craie ou niveau laser visible',
        ],
      },
      en_cours: {
        observable_action:        'carreleur pose la crédence rangée par rangée',
        required_visual_evidence: [
          'crédence à moitié posée sur le mur derrière le plan de travail',
          'découpes visibles autour des prises ou interrupteurs',
          'évier ou plaque de cuisson visible dans le cadre',
        ],
      },
      termine: {
        observable_result:        'crédence entièrement posée, joints frais, cuisine opérationnelle',
        required_visual_evidence: [
          'crédence uniforme couvrant le mur derrière le plan de travail',
          'joints frais et réguliers',
          'plan de travail visible en bas, cuisine reconnaissable',
        ],
      },
    },

    composition_preferences: [
      'medium_intervention',
      'close_detail',
    ],

    for_regex: 'faience.*cuisine|cuisine.*faience|credence',
  },

  carrelage_terrasse_exterieure: {
    service_key:   'carrelage_terrasse_exterieure',
    service_label: 'Carrelage terrasse extérieure',

    visual_goal:
      'Montrer une pose de carreaux sur une terrasse ou espace de vie extérieur : '
      + 'contexte outdoor clairement identifiable, grand format.',

    observable_action:
      'un carreleur pose des carreaux grand format sur une terrasse extérieure '
      + "avec lumière naturelle directe et façade ou baie vitrée visible",

    required_visual_evidence: [
      'contexte extérieur clairement identifiable : lumière naturelle directe, ciel ou végétation visible',
      'carreaux grand format (40×40 cm ou plus) posés à plat',
      'transition entre zone posée et zone en cours de pose',
      'liant ou colle pour extérieur visible (teinte grise ou blanche)',
    ],

    forbidden_confusions: [
      'espace intérieur — serait "Pose carrelage sol"',
      'allée, cour ou voie fonctionnelle sans espace de vie — serait "Dallage extérieur"',
      'galets, gravillons ou autre revêtement non carrelé',
    ],

    allowed_tools: [
      'truelle crantée grand format',
      'maillet en caoutchouc lourd',
      'croisillons larges (3–5 mm joint extérieur)',
      'seau de mortier-colle pour extérieur',
      'règle de planéité',
      'niveau à bulle',
    ],

    forbidden_tools: [
      'rouleau de peinture',
    ],

    work_surface:   ['terrasse, balcon extérieur, espace de vie à ciel ouvert'],
    setting:        ['exterior'],
    location_types: ['maison', 'appartement (grand balcon)', 'local commercial'],

    worker_rules: {
      presence: 'optional',
      min: 1,
      max: 2,
      posture: "accroupi ou debout, travail en extérieur avec espace dégagé",
    },

    safety: {
      required: [
        'gants de travail',
        "chaussures de sécurité adaptées à l'extérieur",
      ],
      forbidden: [
        'casque de chantier',
        'gilet haute visibilité',
        'harnais (sauf terrasse en hauteur sans garde-corps)',
      ],
    },

    states: {
      debut: {
        observable_action:        'carreleur prépare la surface et dispose les premiers carreaux à sec',
        required_visual_evidence: [
          'terrasse débarrassée et nettoyée',
          'carreaux posés à sec pour le calepinage',
          'ciel ou végétation visible en arrière-plan',
        ],
      },
      en_cours: {
        observable_action:        'carreleur colle et pose des carreaux grand format en extérieur',
        required_visual_evidence: [
          'rangées posées avec joints larges visibles',
          'zone encore nue de la terrasse visible',
          'environnement extérieur (façade, baie vitrée, végétation) en arrière-plan',
        ],
      },
      termine: {
        observable_result:        'terrasse entièrement carrelée, joints extérieurs gris frais',
        required_visual_evidence: [
          'surface de terrasse entièrement carrelée',
          'joints gris extérieurs uniformes',
          'contexte extérieur visible, espace de vie reconnaissable',
        ],
      },
    },

    composition_preferences: [
      'wide_worksite',
      'contextual_overview',
    ],

    for_regex: 'terrasse exterieure|carrelage terrasse',
  },

  dallage_exterieur: {
    service_key:   'dallage_exterieur',
    service_label: 'Dallage extérieur',

    visual_goal:
      'Montrer une pose de dalles épaisses (béton, pierre reconstituée) '
      + 'dans une allée, cour ou voie fonctionnelle.',

    observable_action:
      "un poseur place des dalles épaisses sur un lit de sable ou béton maigre "
      + "dans une allée ou cour, en les nivelant avec un maillet lourd et une règle",

    required_visual_evidence: [
      'contexte extérieur fonctionnel visible : allée, entrée de propriété ou cour',
      'dalles épaisses (5 cm ou plus) posées sur lit de sable ou béton de fondation',
      'joints larges (10 mm ou plus) typiques des dallages extérieurs',
      'outillage de maçonnerie extérieure : règle de planéité, maillet',
    ],

    forbidden_confusions: [
      'terrasse avec mobilier de jardin ou espace de vie — serait "Carrelage terrasse extérieure"',
      'carreaux fins en céramique intérieure',
      "nettoyage d'un dallage existant — autre métier",
    ],

    allowed_tools: [
      'maillet lourd ou masse en caoutchouc',
      'règle de planéité ou niveau à long rayon',
      "arrosoir ou pulvérisateur d'eau pour sable",
      'truelle',
      "pied-de-biche pour l'ajustement des dalles",
      'brosses pour le jointement sablé',
    ],

    forbidden_tools: [
      'rouleau de peinture',
      'truelle crantée fine (carrelage intérieur)',
      'croisillons petits formats',
    ],

    work_surface:   ["allée, cour, entrée de propriété, trottoir privé"],
    setting:        ['exterior'],
    location_types: ['maison individuelle', 'local commercial', 'copropriété'],

    worker_rules: {
      presence: 'optional',
      min: 1,
      max: 2,
      posture: "debout ou accroupi, manutention de dalles lourdes en extérieur",
    },

    safety: {
      required: [
        'gants de manutention résistants (dalles lourdes)',
        'chaussures de sécurité',
      ],
      forbidden: [
        'casque de chantier',
        'gilet haute visibilité',
        'harnais',
      ],
    },

    states: {
      debut: {
        observable_action:        'poseur prépare le lit de pose — décaissement ou sable nivelé',
        required_visual_evidence: [
          'sol décaissé ou lit de sable visible sur au moins 50 % de la surface',
          'dalles en stock sur le côté de la zone de travail',
          'allée ou accès clairement identifiable',
        ],
      },
      en_cours: {
        observable_action:        'poseur place et nivelle des dalles sur le lit de pose',
        required_visual_evidence: [
          'dalles posées sur 30 à 60 % de la surface',
          'règle de planéité ou niveau visible',
          'lit de sable ou de béton visible sur la zone non encore couverte',
        ],
      },
      termine: {
        observable_result:        'allée ou cour entièrement dallée, joints sablés',
        required_visual_evidence: [
          'surface entièrement dallée avec joints uniformes',
          'brosses ou balai de jointement visible dans un coin',
          "contexte fonctionnel (portail, clôture, accès) en arrière-plan",
        ],
      },
    },

    composition_preferences: [
      'wide_worksite',
      'medium_intervention',
    ],

    for_regex: 'dallage exterieur|dallage ext|pose.*dallage',
  },

  pose_pierre_naturelle: {
    service_key:   'pose_pierre_naturelle',
    service_label: 'Pose pierre naturelle',

    visual_goal:
      'Montrer une pose de dalles en matière naturelle : '
      + 'texture non-industrielle et veinures dominantes dans le cadre.',

    observable_action:
      'un carreleur spécialisé pose des dalles en pierre naturelle (travertin, marbre, ardoise) '
      + 'en appliquant un mortier-colle blanc spécial pierre',

    required_visual_evidence: [
      'texture de pierre naturelle clairement visible : veinures, porosité, irrégularités de surface',
      'dalles grand format ou irrégulières typiques de la pose pierre',
      'mortier-colle blanc ou gris clair visible sur les bords ou la zone non encore posée',
      "transition entre dalle posée et sol nu révélant l'épaisseur de la pierre (> 1 cm)",
    ],

    forbidden_confusions: [
      "carrelage en grès cérame imitant la pierre — la texture doit être authentiquement naturelle",
      'carreaux fins standard en céramique (< 8 mm)',
      "pose sur terrasse sans distinction de matière — contexte seul ne suffit pas",
    ],

    allowed_tools: [
      'truelle crantée grand format',
      'maillet en caoutchouc',
      'mortier-colle blanc spécial pierre naturelle',
      'espaceurs larges (> 3 mm)',
      "meuleuse d'angle avec disque diamant",
      'ponceuse orbitale pour finition',
    ],

    forbidden_tools: [
      'rouleau de peinture',
      'mortier gris standard (risque de tâches sur pierre poreuse)',
    ],

    work_surface:   ['sol ou mur, intérieur ou extérieur selon contexte'],
    setting:        ['interior', 'exterior'],
    location_types: ['maison', 'appartement haut de gamme', 'local commercial'],

    worker_rules: {
      presence: 'optional',
      min: 1,
      max: 2,
      posture: 'à genoux ou debout selon surface, manutention de dalles lourdes',
    },

    safety: {
      required: [
        'gants de manutention (dalles lourdes et coupantes)',
        "lunettes lors des découpes à la meuleuse",
        'masque anti-poussière lors des découpes',
      ],
      forbidden: [
        'casque de chantier',
        'gilet haute visibilité',
        'harnais',
      ],
    },

    states: {
      debut: {
        observable_action:        'carreleur dispose les dalles de pierre à sec pour le calepinage',
        required_visual_evidence: [
          'dalles de pierre naturelle en stock ou disposées à sec',
          'texture et veinures de la pierre clairement visible',
          'sol préparé ou joints de dilatation tracés',
        ],
      },
      en_cours: {
        observable_action:        'carreleur colle des dalles de pierre, texture naturelle en avant-plan',
        required_visual_evidence: [
          'dalles posées révélant leur texture naturelle (veinures, pores)',
          'mortier-colle blanc visible sur la zone non encore posée',
          "transition entre dalle posée et sol nu révélant l'épaisseur",
        ],
      },
      termine: {
        observable_result:        'surface en pierre naturelle posée, joints fins, aspect premium',
        required_visual_evidence: [
          'surface couverte de dalles de pierre avec joints fins',
          'texture naturelle dominante dans le cadre',
          'finition visible : polissage ou huilage selon la matière',
        ],
      },
    },

    composition_preferences: [
      'close_detail',
      'medium_intervention',
    ],

    for_regex: 'pierre naturelle|pose.*pierre|pierre.*pose',
  },

  refection_joint: {
    service_key:   'refection_joint',
    service_label: 'Réfection joint',

    visual_goal:
      'Montrer un travail de rejointoiement sur carrelage existant : '
      + 'anciens joints retirés, nouveau mortier appliqué, carreaux conservés.',

    observable_action:
      'un carreleur retire les anciens joints détériorés avec un disque rainureur '
      + 'puis applique un nouveau mortier de jointoiement à la taloche',

    required_visual_evidence: [
      'carrelage existant (posé depuis plusieurs années) constituant le fond de la scène',
      'anciens joints noirs, fissurés ou manquants dans une zone clairement visible',
      'outil de réfection joint visible : disque rainureur, taloche, raclette',
      'joint frais gris ou coloré dans une zone contrastant avec les joints anciens',
    ],

    forbidden_confusions: [
      'pose de carreaux neufs — les carreaux DOIVENT être anciens et en place',
      'dépose complète du carrelage — aucun carreau arraché, aucun sol nu',
      'nettoyage de joints seul sans remplacement',
    ],

    allowed_tools: [
      'disque à rainurer ou fraise à joints',
      'taloche à joints (grout float)',
      'raclette en caoutchouc',
      "seau d'eau et éponge de rinçage",
      'mortier de jointoiement (seau ou sachet)',
      'aspirateur à poussière après rainurage',
    ],

    forbidden_tools: [
      'truelle crantée',
      'maillet en caoutchouc',
      'marteau-piqueur',
      'rouleau de peinture',
    ],

    work_surface:   ['carrelage existant — sol ou mur intérieur'],
    setting:        ['interior'],
    location_types: ['maison', 'appartement', 'local commercial'],

    worker_rules: {
      presence: 'optional',
      min: 1,
      max: 1,
      posture: 'à genoux ou accroupi sur un sol carrelé existant, ou debout face à un mur',
    },

    safety: {
      required: [
        'gants résistants aux produits chimiques de jointoiement',
        'masque anti-poussière lors du rainurage',
        'lunettes lors du rainurage (projections)',
      ],
      forbidden: [
        'casque de chantier',
        'gilet haute visibilité',
        'harnais',
      ],
    },

    states: {
      debut: {
        observable_action:        'carreleur gratte et retire les anciens joints sur une zone',
        required_visual_evidence: [
          'carrelage existant avec joints anciens (noircis ou fissurés) visible',
          'rainures vides entre carreaux dans une zone déjà traitée',
          'disque rainureur ou fraise posée sur le carrelage',
        ],
      },
      en_cours: {
        observable_action:        'carreleur applique le nouveau mortier de jointoiement à la taloche',
        required_visual_evidence: [
          'contraste visible : zone avec nouveau joint gris frais vs zone avec vieux joint',
          'taloche en caoutchouc ou raclette en main',
          'seau de mortier de jointoiement ouvert à côté',
        ],
      },
      termine: {
        observable_result:        'joints uniformément refaits, surface nettoyée, aspect restauré',
        required_visual_evidence: [
          'carrelage avec joints uniformément refaits sur toute la surface',
          'éponge de nettoyage et seau visible dans un coin',
          'aucun joint manquant ou fissuré visible',
        ],
      },
    },

    composition_preferences: [
      'close_detail',
      'medium_intervention',
    ],

    for_regex: 'refection joint|refection.*joint|joint.*refection',
  },

  refection_carrelage: {
    service_key:   'refection_carrelage',
    service_label: 'Réfection carrelage',

    visual_goal:
      "Montrer une rénovation complète : dépose de l'ancien carrelage et pose du nouveau, "
      + 'les deux états co-existant dans le même cadre.',

    observable_action:
      "un carreleur dépose l'ancien carrelage avec burin et maillet, "
      + "révélant le support nu, avant de poser un nouveau revêtement dans la même pièce",

    required_visual_evidence: [
      "zone où l'ancien carrelage a été arraché : béton ou chape nue visible",
      'débris et carreaux cassés regroupés en tas dans un coin du cadre',
      'zone adjacente où le nouveau carrelage est en cours de pose ou déjà posé',
      'transition lisible entre les deux états dans le même plan ou cadre',
    ],

    forbidden_confusions: [
      "pose de carrelage neuf seul — aucun signe de dépose d'ancien carrelage",
      'réfection de joints — aucun carreau arraché',
      "chantier de construction neuve — doit s'agir de rénovation avec traces de l'existant",
    ],

    allowed_tools: [
      'burin plat et marteau (dépose soignée)',
      'marteau-piqueur électrique (grandes surfaces)',
      'truelle crantée (pour la repose)',
      'maillet en caoutchouc (pour la repose)',
      'benne ou sac à gravats pour les débris',
      'balai et aspirateur après dépose',
    ],

    forbidden_tools: [
      'rouleau de peinture',
    ],

    work_surface:   ['sol ou mur intérieur — contexte rénovation'],
    setting:        ['interior'],
    location_types: ['maison', 'appartement', 'local commercial à rénover'],

    worker_rules: {
      presence: 'optional',
      min: 1,
      max: 2,
      posture: 'à genoux pour la dépose ou la repose, manutention de gravats',
    },

    safety: {
      required: [
        'gants de manutention résistants (carreaux cassés)',
        'lunettes de protection (éclats lors de la dépose)',
        'masque anti-poussière',
      ],
      forbidden: [
        'casque de chantier',
        'gilet haute visibilité',
        'harnais',
      ],
    },

    states: {
      debut: {
        observable_action:        "carreleur dépose l'ancien carrelage avec burin ou marteau-piqueur",
        required_visual_evidence: [
          'sol entièrement ou partiellement arraché, béton brut ou chape visible',
          'carreaux cassés et débris en tas dans un coin',
          'burin et marteau ou marteau-piqueur au sol',
        ],
      },
      en_cours: {
        observable_action:        "moitié du sol arraché, moitié avec nouveau carrelage en cours",
        required_visual_evidence: [
          'ligne de rupture nette entre zone arrachée (béton nu) et zone de nouvelle pose',
          'nouveau carrelage en cours de pose visible sur un côté',
          'carreaux cassés encore présents dans un coin',
        ],
      },
      termine: {
        observable_result:        'nouveau carrelage posé, quelques débris résiduels dans un coin',
        required_visual_evidence: [
          "nouveau carrelage couvrant l'ensemble de la surface",
          'joints frais du nouveau revêtement',
          'quelques débris ou emballages encore visibles (contexte de rénovation)',
        ],
      },
    },

    composition_preferences: [
      'wide_worksite',
      'medium_intervention',
    ],

    for_regex: 'refection carrelage|renovation carrelage|remplacement carrelage',
  },

};

export const CARRELAGE_FOR_PATTERNS = Object.fromEntries(
  Object.entries(CARRELAGE_VISUAL_CONTRACTS).map(([k, c]) => [k, c.for_regex])
);

export const CARRELAGE_META = {
  metier_key:     'carrelage',
  expected_count: 9,
  version:        '1.0.0',
  status:         'pending_validation',
  risk_pairs: [
    ['pose_carrelage_sol',           'faience_cuisine'],
    ['faience_salle_de_bain',        'faience_cuisine'],
    ['carrelage_terrasse_exterieure','dallage_exterieur'],
    ['refection_joint',              'refection_carrelage'],
  ],
};
