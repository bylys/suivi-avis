/**
 * config/service-catalog.js — Phase 1 shadow copy (source active : app.js)
 * Copie stricte de SERVICE_PRESETS, SERVICE_CATALOG, CONTEXTE_OPTIONS,
 * CONTEXTE_BY_METIER (app.js lignes 2980–3158).
 * Ne pas modifier avant le cutover validé.
 */

const SERVICE_PRESETS = [
  'Rénovation toiture', 'Réparation toiture', 'Remplacement tuiles', 'Remplacement ardoises',
  'Charpente', 'Faîtage', 'Zinguerie',
  'Nettoyage toiture', 'Démoussage toiture', 'Hydrofuge toiture',
  'Nettoyage façade', 'Nettoyage terrasse', 'Nettoyage gouttières',
  'Étanchéité toit terrasse', 'Réparation fuite', 'Imperméabilisation',
  'Carrelage intérieur', 'Faïence', 'Peinture intérieure', 'Peinture extérieure',
  'Ravalement façade', 'Débarras appartement', 'Débarras maison',
  'Élagage', 'Abattage', 'Émondage', 'Taille de haie',
  'Terrassement', 'Maçonnerie', 'Plomberie', 'Électricité',
];

const SERVICE_CATALOG = {
  toiture: {
    label: 'Couverture / Toiture',
    services: [
      'Rénovation toiture complète', 'Réparation toiture', 'Remplacement tuiles',
      'Remplacement ardoises', 'Couverture neuve', 'Réfection toiture',
      'Charpente', 'Isolation combles', 'Faîtage', 'Zinguerie', 'Solins',
    ],
  },
  nettoyage_toiture: {
    label: 'Nettoyage / Démoussage toiture',
    services: [
      'Démoussage toiture', 'Nettoyage toiture', 'Traitement hydrofuge toiture',
      'Nettoyage mousse toiture', 'Hydrofuge toiture', 'Traitement anti-mousse toiture',
    ],
  },
  nettoyage_gouttieres: {
    label: 'Nettoyage gouttières',
    services: [
      'Nettoyage gouttières', 'Débouchage gouttières', 'Remplacement gouttières',
      'Entretien gouttières', 'Pose gouttières',
    ],
  },
  etancheite: {
    label: 'Étanchéité',
    services: [
      'Réparation fuite toiture', 'Recherche de fuite', 'Infiltration toiture',
      'Étanchéité toit terrasse', 'Étanchéité toiture plate',
      'Étanchéité balcon', 'Étanchéité terrasse',
      'Étanchéité EPDM', 'Étanchéité PVC', 'Étanchéité bitume',
      "Réfection d'étanchéité",
      'Réparation solin', 'Réparation Velux', 'Réparation noue',
      'Réparation rive', 'Étanchéité cheminée', 'Étanchéité acrotère',
    ],
  },
  ravalement: {
    label: 'Ravalement / Façade',
    services: [
      'Ravalement façade', 'Rénovation façade', 'Crépi façade',
      "ITE (isolation par l'extérieur)", 'Enduit monocouche',
      'Enduit hydraulique', 'Nettoyage façade', 'Peinture façade',
      'Traitement façade pierre',
    ],
  },
  'maçonnerie': {
    label: 'Maçonnerie',
    services: [
      'Mur parpaing', 'Mur brique', 'Construction mur', 'Muret',
      'Dalle béton', 'Terrasse béton', 'Coulage dalle',
      'Fondation', 'Semelle béton', 'Ferraillage',
      'Escalier béton', 'Seuil', 'Linteau', 'Ouverture dans mur', 'Percement mur',
      'Réparation fissure', 'Rejointoiement', 'Rejointoiement pierre',
    ],
  },
  peinture: {
    label: 'Peinture',
    services: [
      'Peinture intérieure', 'Peinture salon', 'Peinture chambre',
      'Peinture cuisine', 'Peinture couloir', 'Peinture plafond',
      'Papier peint', 'Peinture extérieure', 'Peinture façade', 'Enduit décoratif',
    ],
  },
  carrelage: {
    label: 'Carrelage',
    services: [
      'Pose carrelage sol', 'Pose carrelage mural', 'Faïence salle de bain',
      'Faïence cuisine', 'Carrelage terrasse extérieure', 'Dallage extérieur',
      'Pose pierre naturelle', 'Réfection joint', 'Réfection carrelage',
    ],
  },
  vitrier: {
    label: 'Vitrier',
    services: [
      'Remplacement vitrage brisé', 'Remplacement double vitrage',
      'Remplacement fenêtre PVC', 'Remplacement fenêtre aluminium',
      'Réparation fenêtre', 'Remplacement porte vitrée',
      'Vitrage sécurité feuilleté', 'Bris de glace urgence',
    ],
  },
  'élagage': {
    label: 'Élagage',
    services: [
      'Élagage arbre', 'Taille arbre haute tige', 'Élagage peuplier',
      'Élagage en hauteur', 'Recépage arbre', 'Couronnage arbre',
      'Élagage arbres dangereux',
    ],
  },
  abattage: {
    label: 'Abattage',
    services: [
      'Abattage arbre', 'Abattage peuplier', 'Abattage grand arbre',
      'Abattage en zone difficile', 'Dessouchage', 'Abattage conifère',
    ],
  },
  terrassement: {
    label: 'Terrassement',
    services: [
      'Terrassement maison', 'Terrassement piscine', 'Terrassement terrain',
      'Décaissement', 'Excavation', 'Fouilles', 'Tranchées',
      'Remblai', 'Empierrement', 'Nivellement', 'Préparation terrain',
      'Création allée', 'Création chemin', 'Plateforme', 'VRD',
      'Évacuation des terres',
    ],
  },
  paysagiste: {
    label: 'Paysagiste',
    services: [
      'Création jardin', 'Aménagement extérieur', 'Aménagement paysager',
      'Plantation', 'Plantation de haies', "Plantation d'arbres",
      'Taille de haie', "Taille d'arbustes", 'Création massif',
      'Pose de gazon', 'Gazon en rouleau', 'Semis de gazon',
      'Arrosage automatique', 'Bordures', 'Paillage',
      'Entretien jardin', 'Désherbage', 'Petite maçonnerie paysagère',
    ],
  },
  depannage_auto: {
    label: 'Dépannage Auto',
    services: [
      'Batterie à plat', 'Démarrage batterie', 'Boost batterie', 'Remplacement batterie',
      'Crevaison', 'Changement de roue', 'Réparation pneu',
      'Remorquage', 'Assistance routière', 'Véhicule en panne',
      'Ouverture de véhicule', 'Clés enfermées', 'Déverrouillage voiture',
      'Erreur de carburant', 'Panne moteur', 'Panne électrique', 'Enlèvement véhicule',
    ],
  },
  nettoyage: {
    label: 'Nettoyage extérieur',
    services: [
      'Nettoyage façade', 'Nettoyage terrasse', 'Nettoyage dallage',
      'Nettoyage pavés', 'Nettoyage allée', 'Traitement hydrofuge façade',
      'Nettoyage haute pression',
    ],
  },
  'débarras': {
    label: 'Débarras',
    services: [
      'Débarras appartement', 'Débarras maison', 'Débarras cave',
      'Débarras grenier', 'Vider maison succession', 'Débarras après décès',
      'Enlèvement encombrants', 'Nettoyage encombrants',
    ],
  },
};

const CONTEXTE_OPTIONS = [
  { value: 'maison',        label: 'Maison individuelle' },
  { value: 'appartement',   label: 'Appartement' },
  { value: 'immeuble',      label: 'Immeuble' },
  { value: 'commerce',      label: 'Commerce' },
  { value: 'professionnel', label: 'Local professionnel' },
  { value: 'entrepot',      label: 'Entrepôt' },
  { value: 'agricole',      label: 'Bâtiment agricole' },
];

// Contextes spécifiques par métier — remplacent CONTEXTE_OPTIONS quand le métier est sélectionné
const CONTEXTE_BY_METIER = {
  depannage_auto: [
    { value: 'autoroute',       label: 'Autoroute',             desc: 'parked on a motorway hard shoulder' },
    { value: 'route_nationale', label: 'Route nationale',       desc: 'parked on the side of a national road' },
    { value: 'route_dept',      label: 'Route départementale',  desc: 'parked on the side of a rural departmental road, fields in background' },
    { value: 'rue_ville',       label: 'Rue en ville',          desc: 'parked on an urban street in a town or city' },
    { value: 'parking',         label: 'Parking',               desc: 'in a car park or parking area' },
    { value: 'domicile',        label: 'Domicile',              desc: 'parked on private residential property — driveway, garage forecourt, or enclosed courtyard. A gate, wall, or house facade must be visible in the background. No road markings, no public pavement, no carriageway in the scene.' },
    { value: 'garage',          label: 'Garage / Atelier',      desc: 'inside or in front of a garage or vehicle workshop' },
    { value: 'station_service', label: 'Station-service',       desc: 'in a petrol station forecourt' },
    { value: 'aire_repos',      label: 'Aire de repos',         desc: 'in a motorway rest area or lay-by' },
  ],
};

export { SERVICE_PRESETS, SERVICE_CATALOG, CONTEXTE_OPTIONS, CONTEXTE_BY_METIER };
