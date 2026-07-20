# Service Coverage Audit

_Generated: 2026-07-20 — Commit: `34d218425238`_


## Méthodologie

Analyse statique Python des fichiers `service-catalog.js` et `services/*.js`.
Pour chaque sous-service du catalogue, le script :
1. Vérifie que la clé métier existe dans `WORK_SCENES` (routage de scène).
2. Cherche dans `SITE_REALISM` si un pattern `_for` correspond au nom normalisé du service.
3. Classe le service dans l'une des 5 catégories.

## Limites de l'audit

- Le routage `_dispatch:service` (dépannage auto) est marqué ROUTED_TO_SPECIFIC_SCENE
  car un bucket est toujours trouvé — mais le bucket ERRONé avant correction n'est pas détecté.
- `_dispatch:contexte` (étanchéité) est approximé via les patterns `_for` directs.
- L'audit ne valide pas la qualité visuelle des scènes, seulement le routage.

> **ROUTED_TO_SPECIFIC_SCENE** ne signifie pas encore qualité visuelle complète ou validée.

## Définitions des catégories

- **ROUTED_TO_SPECIFIC_SCENE**: Sub-service matches a targeted SITE_REALISM scenario via a _for regex pattern. Does NOT guarantee visual quality or completeness.
- **PARTIAL_CONTEXTE**: WORK_SCENE found, but no _for pattern in SITE_REALISM matches this sub-service. Only the generic fallback scenario (if any) is applied.
- **TOOLS_ONLY**: WORK_SCENE found, but SITE_REALISM entry is flat (tools/protections/details only, no scenario-level differentiation).
- **GENERIC_FALLBACK**: No WORK_SCENE entry found for this catalog metier key.
- **UNMATCHED**: Service could not be classified.

## Résumé global

| Catégorie | Nombre |
|-----------|--------|
| ROUTED_TO_SPECIFIC_SCENE | 139 |
| PARTIAL_CONTEXTE | 25 |
| TOOLS_ONLY | 8 |
| GENERIC_FALLBACK | 0 |
| UNMATCHED | 0 |
| **TOTAL** | **172** |

## Résumé par métier

### toiture (11/11 ROUTED)
ROUTED_TO_SPECIFIC_SCENE: 11

### nettoyage_toiture (5/6 ROUTED)
ROUTED_TO_SPECIFIC_SCENE: 5, PARTIAL_CONTEXTE: 1

### nettoyage_gouttieres (5/5 ROUTED)
ROUTED_TO_SPECIFIC_SCENE: 5

### etancheite (5/17 ROUTED)
ROUTED_TO_SPECIFIC_SCENE: 5, PARTIAL_CONTEXTE: 12

### ravalement (8/9 ROUTED)
ROUTED_TO_SPECIFIC_SCENE: 8, PARTIAL_CONTEXTE: 1

### maçonnerie (18/18 ROUTED)
ROUTED_TO_SPECIFIC_SCENE: 18

### peinture (9/10 ROUTED)
ROUTED_TO_SPECIFIC_SCENE: 9, PARTIAL_CONTEXTE: 1

### carrelage (9/9 ROUTED)
ROUTED_TO_SPECIFIC_SCENE: 9

### vitrier (8/8 ROUTED)
ROUTED_TO_SPECIFIC_SCENE: 8

### élagage (7/7 ROUTED)
ROUTED_TO_SPECIFIC_SCENE: 7

### abattage (6/6 ROUTED)
ROUTED_TO_SPECIFIC_SCENE: 6

### terrassement (10/16 ROUTED)
ROUTED_TO_SPECIFIC_SCENE: 10, PARTIAL_CONTEXTE: 6

### paysagiste (15/18 ROUTED)
ROUTED_TO_SPECIFIC_SCENE: 15, PARTIAL_CONTEXTE: 3

### depannage_auto (17/17 ROUTED)
ROUTED_TO_SPECIFIC_SCENE: 17

### nettoyage (6/7 ROUTED)
ROUTED_TO_SPECIFIC_SCENE: 6, PARTIAL_CONTEXTE: 1

### débarras (0/8 ROUTED)
TOOLS_ONLY: 8

## Comportements corrigés (6 services)

> Ces six services avaient un comportement de routage incorrect. Trois changeaient de groupe sans changer de catégorie de couverture ; trois changeaient à la fois de groupe et de catégorie.

| Métier | Sous-service | Avant | Après |
|--------|--------------|-------|-------|
| peinture | Peinture façade | PARTIAL_CONTEXTE | ROUTED_TO_SPECIFIC_SCENE |
| élagage | Élagage arbre | PARTIAL_CONTEXTE | ROUTED_TO_SPECIFIC_SCENE |
| élagage | Élagage peuplier | PARTIAL_CONTEXTE | ROUTED_TO_SPECIFIC_SCENE |
| depannage_auto | Clés enfermées | default_group | ouverture_group |
| depannage_auto | Déverrouillage voiture | default_group | ouverture_group |
| depannage_auto | Enlèvement véhicule | default_group | remorquage_group |

## Changements de catégorie (3 services)

> Seuls ces trois services font évoluer les totaux statistiques.

| Métier | Sous-service | Ancienne catégorie | Nouvelle catégorie |
|--------|--------------|--------------------|--------------------|
| peinture | Peinture façade | PARTIAL_CONTEXTE | ROUTED_TO_SPECIFIC_SCENE |
| élagage | Élagage arbre | PARTIAL_CONTEXTE | ROUTED_TO_SPECIFIC_SCENE |
| élagage | Élagage peuplier | PARTIAL_CONTEXTE | ROUTED_TO_SPECIFIC_SCENE |

> Les trois corrections de dépannage auto (Clés enfermées, Déverrouillage voiture, Enlèvement véhicule) étaient déjà ROUTED_TO_SPECIFIC_SCENE — elles corrigent le bucket sélectionné, pas la catégorie.

## ROUTED_TO_SPECIFIC_SCENE (139 services)

- **toiture** / Rénovation toiture complète
- **toiture** / Réparation toiture
- **toiture** / Remplacement tuiles
- **toiture** / Remplacement ardoises
- **toiture** / Couverture neuve
- **toiture** / Réfection toiture
- **toiture** / Charpente
- **toiture** / Isolation combles
- **toiture** / Faîtage
- **toiture** / Zinguerie
- **toiture** / Solins
- **nettoyage_toiture** / Démoussage toiture
- **nettoyage_toiture** / Traitement hydrofuge toiture
- **nettoyage_toiture** / Nettoyage mousse toiture
- **nettoyage_toiture** / Hydrofuge toiture
- **nettoyage_toiture** / Traitement anti-mousse toiture
- **nettoyage_gouttieres** / Nettoyage gouttières
- **nettoyage_gouttieres** / Débouchage gouttières
- **nettoyage_gouttieres** / Remplacement gouttières
- **nettoyage_gouttieres** / Entretien gouttières
- **nettoyage_gouttieres** / Pose gouttières
- **etancheite** / Réparation solin
- **etancheite** / Réparation Velux
- **etancheite** / Réparation noue
- **etancheite** / Réparation rive
- **etancheite** / Étanchéité cheminée
- **ravalement** / Ravalement façade
- **ravalement** / Rénovation façade
- **ravalement** / Crépi façade
- **ravalement** / ITE (isolation par l'extérieur)
- **ravalement** / Enduit monocouche
- **ravalement** / Enduit hydraulique
- **ravalement** / Peinture façade
- **ravalement** / Traitement façade pierre
- **maçonnerie** / Mur parpaing
- **maçonnerie** / Mur brique
- **maçonnerie** / Construction mur
- **maçonnerie** / Muret
- **maçonnerie** / Dalle béton
- **maçonnerie** / Terrasse béton
- **maçonnerie** / Coulage dalle
- **maçonnerie** / Fondation
- **maçonnerie** / Semelle béton
- **maçonnerie** / Ferraillage
- **maçonnerie** / Escalier béton
- **maçonnerie** / Seuil
- **maçonnerie** / Linteau
- **maçonnerie** / Ouverture dans mur
- **maçonnerie** / Percement mur
- **maçonnerie** / Réparation fissure
- **maçonnerie** / Rejointoiement
- **maçonnerie** / Rejointoiement pierre
- **peinture** / Peinture intérieure
- **peinture** / Peinture salon
- **peinture** / Peinture chambre
- **peinture** / Peinture cuisine
- **peinture** / Peinture couloir
- **peinture** / Peinture plafond
- **peinture** / Papier peint
- **peinture** / Peinture extérieure
- **peinture** / Peinture façade
- **carrelage** / Pose carrelage sol
- **carrelage** / Pose carrelage mural
- **carrelage** / Faïence salle de bain
- **carrelage** / Faïence cuisine
- **carrelage** / Carrelage terrasse extérieure
- **carrelage** / Dallage extérieur
- **carrelage** / Pose pierre naturelle
- **carrelage** / Réfection joint
- **carrelage** / Réfection carrelage
- **vitrier** / Remplacement vitrage brisé
- **vitrier** / Remplacement double vitrage
- **vitrier** / Remplacement fenêtre PVC
- **vitrier** / Remplacement fenêtre aluminium
- **vitrier** / Réparation fenêtre
- **vitrier** / Remplacement porte vitrée
- **vitrier** / Vitrage sécurité feuilleté
- **vitrier** / Bris de glace urgence
- **élagage** / Élagage arbre
- **élagage** / Taille arbre haute tige
- **élagage** / Élagage peuplier
- **élagage** / Élagage en hauteur
- **élagage** / Recépage arbre
- **élagage** / Couronnage arbre
- **élagage** / Élagage arbres dangereux
- **abattage** / Abattage arbre
- **abattage** / Abattage peuplier
- **abattage** / Abattage grand arbre
- **abattage** / Abattage en zone difficile
- **abattage** / Dessouchage
- **abattage** / Abattage conifère
- **terrassement** / Terrassement maison
- **terrassement** / Terrassement piscine
- **terrassement** / Terrassement terrain
- **terrassement** / Décaissement
- **terrassement** / Excavation
- **terrassement** / Fouilles
- **terrassement** / Tranchées
- **terrassement** / Création allée
- **terrassement** / Création chemin
- **terrassement** / VRD
- **paysagiste** / Création jardin
- **paysagiste** / Aménagement extérieur
- **paysagiste** / Aménagement paysager
- **paysagiste** / Plantation
- **paysagiste** / Plantation de haies
- **paysagiste** / Plantation d'arbres
- **paysagiste** / Taille de haie
- **paysagiste** / Taille d'arbustes
- **paysagiste** / Création massif
- **paysagiste** / Pose de gazon
- **paysagiste** / Gazon en rouleau
- **paysagiste** / Semis de gazon
- **paysagiste** / Bordures
- **paysagiste** / Paillage
- **paysagiste** / Désherbage
- **depannage_auto** / Batterie à plat
- **depannage_auto** / Démarrage batterie
- **depannage_auto** / Boost batterie
- **depannage_auto** / Remplacement batterie
- **depannage_auto** / Crevaison
- **depannage_auto** / Changement de roue
- **depannage_auto** / Réparation pneu
- **depannage_auto** / Remorquage
- **depannage_auto** / Assistance routière
- **depannage_auto** / Véhicule en panne
- **depannage_auto** / Ouverture de véhicule
- **depannage_auto** / Clés enfermées
- **depannage_auto** / Déverrouillage voiture
- **depannage_auto** / Erreur de carburant
- **depannage_auto** / Panne moteur
- **depannage_auto** / Panne électrique
- **depannage_auto** / Enlèvement véhicule
- **nettoyage** / Nettoyage façade
- **nettoyage** / Nettoyage terrasse
- **nettoyage** / Nettoyage dallage
- **nettoyage** / Nettoyage pavés
- **nettoyage** / Nettoyage allée
- **nettoyage** / Traitement hydrofuge façade

## PARTIAL_CONTEXTE (25 services)

- **nettoyage_toiture** / Nettoyage toiture
- **etancheite** / Réparation fuite toiture
- **etancheite** / Recherche de fuite
- **etancheite** / Infiltration toiture
- **etancheite** / Étanchéité toit terrasse
- **etancheite** / Étanchéité toiture plate
- **etancheite** / Étanchéité balcon
- **etancheite** / Étanchéité terrasse
- **etancheite** / Étanchéité EPDM
- **etancheite** / Étanchéité PVC
- **etancheite** / Étanchéité bitume
- **etancheite** / Réfection d'étanchéité
- **etancheite** / Étanchéité acrotère
- **ravalement** / Nettoyage façade
- **peinture** / Enduit décoratif
- **terrassement** / Remblai
- **terrassement** / Empierrement
- **terrassement** / Nivellement
- **terrassement** / Préparation terrain
- **terrassement** / Plateforme
- **terrassement** / Évacuation des terres
- **paysagiste** / Arrosage automatique
- **paysagiste** / Entretien jardin
- **paysagiste** / Petite maçonnerie paysagère
- **nettoyage** / Nettoyage haute pression

## TOOLS_ONLY (8 services)

- **débarras** / Débarras appartement
- **débarras** / Débarras maison
- **débarras** / Débarras cave
- **débarras** / Débarras grenier
- **débarras** / Vider maison succession
- **débarras** / Débarras après décès
- **débarras** / Enlèvement encombrants
- **débarras** / Nettoyage encombrants

## Prochaines priorités

Les métiers sans scénarios ciblés (TOOLS_ONLY et PARTIAL_CONTEXTE) sont à traiter en priorité :

- **nettoyage_toiture** (PARTIAL_CONTEXTE): Nettoyage toiture
- **etancheite** (PARTIAL_CONTEXTE): Réparation fuite toiture, Recherche de fuite, Infiltration toiture, Étanchéité toit terrasse, Étanchéité toiture plate, Étanchéité balcon, Étanchéité terrasse, Étanchéité EPDM, Étanchéité PVC, Étanchéité bitume, Réfection d'étanchéité, Étanchéité acrotère
- **ravalement** (PARTIAL_CONTEXTE): Nettoyage façade
- **peinture** (PARTIAL_CONTEXTE): Enduit décoratif
- **terrassement** (PARTIAL_CONTEXTE): Remblai, Empierrement, Nivellement, Préparation terrain, Plateforme, Évacuation des terres
- **paysagiste** (PARTIAL_CONTEXTE): Arrosage automatique, Entretien jardin, Petite maçonnerie paysagère
- **nettoyage** (PARTIAL_CONTEXTE): Nettoyage haute pression
- **débarras** (TOOLS_ONLY): Débarras appartement, Débarras maison, Débarras cave, Débarras grenier, Vider maison succession, Débarras après décès, Enlèvement encombrants, Nettoyage encombrants
