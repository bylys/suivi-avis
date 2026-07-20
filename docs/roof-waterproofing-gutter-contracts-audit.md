# Audit — Contrats visuels toiture / étanchéité / gouttières

**Date :** 2026-07-20  
**Branche :** feat/roof-waterproofing-gutter-contracts  
**Source canonique :** `src/image-generation/services/roof-waterproofing-gutter-contracts.js`  
**Script automatisé :** `scripts/audit_roof_waterproofing_gutter_contracts.py` (RTG-C1 à RTG-C12, RTG-AM1 à RTG-AM7, RTG-C13)

---

## Périmètre

| Métier catalogue | Services | Contrats couverts |
|---|---|---|
| `toiture` — Couverture / Toiture | 11 | R01–R07 |
| `nettoyage_toiture` — Nettoyage / Démoussage toiture | 6 | R08–R09, R20 |
| `nettoyage_gouttieres` — Nettoyage gouttières | 5 | R10–R12 |
| `etancheite` — Étanchéité | 17 | R13–R19 |
| **Total** | **39** | **20** |

---

## Inventaire complet des 39 services

### Métier : toiture (11 services)

| # | Service | routing_coverage |
|---|---|---|
| 1 | Rénovation toiture complète | ROUTED_TO_SPECIFIC_SCENE |
| 2 | Réparation toiture | ROUTED_TO_SPECIFIC_SCENE |
| 3 | Remplacement tuiles | ROUTED_TO_SPECIFIC_SCENE |
| 4 | Remplacement ardoises | ROUTED_TO_SPECIFIC_SCENE |
| 5 | Couverture neuve | ROUTED_TO_SPECIFIC_SCENE |
| 6 | Réfection toiture | ROUTED_TO_SPECIFIC_SCENE |
| 7 | Charpente | ROUTED_TO_SPECIFIC_SCENE |
| 8 | Isolation combles | ROUTED_TO_SPECIFIC_SCENE |
| 9 | Faîtage | ROUTED_TO_SPECIFIC_SCENE |
| 10 | Zinguerie | ROUTED_TO_SPECIFIC_SCENE |
| 11 | Solins | ROUTED_TO_SPECIFIC_SCENE |

### Métier : nettoyage_toiture (6 services)

| # | Service | routing_coverage |
|---|---|---|
| 12 | Démoussage toiture | ROUTED_TO_SPECIFIC_SCENE |
| 13 | Nettoyage toiture | PARTIAL_CONTEXTE |
| 14 | Traitement hydrofuge toiture | ROUTED_TO_SPECIFIC_SCENE |
| 15 | Nettoyage mousse toiture | ROUTED_TO_SPECIFIC_SCENE |
| 16 | Hydrofuge toiture | ROUTED_TO_SPECIFIC_SCENE |
| 17 | Traitement anti-mousse toiture | ROUTED_TO_SPECIFIC_SCENE |

### Métier : nettoyage_gouttieres (5 services)

| # | Service | routing_coverage |
|---|---|---|
| 18 | Nettoyage gouttières | ROUTED_TO_SPECIFIC_SCENE |
| 19 | Débouchage gouttières | ROUTED_TO_SPECIFIC_SCENE |
| 20 | Remplacement gouttières | ROUTED_TO_SPECIFIC_SCENE |
| 21 | Entretien gouttières | ROUTED_TO_SPECIFIC_SCENE |
| 22 | Pose gouttières | ROUTED_TO_SPECIFIC_SCENE |

### Métier : etancheite (17 services)

| # | Service | routing_coverage |
|---|---|---|
| 23 | Réparation fuite toiture | PARTIAL_CONTEXTE |
| 24 | Recherche de fuite | PARTIAL_CONTEXTE |
| 25 | Infiltration toiture | PARTIAL_CONTEXTE |
| 26 | Étanchéité toit terrasse | PARTIAL_CONTEXTE |
| 27 | Étanchéité toiture plate | PARTIAL_CONTEXTE |
| 28 | Étanchéité balcon | PARTIAL_CONTEXTE |
| 29 | Étanchéité terrasse | PARTIAL_CONTEXTE |
| 30 | Étanchéité EPDM | PARTIAL_CONTEXTE |
| 31 | Étanchéité PVC | PARTIAL_CONTEXTE |
| 32 | Étanchéité bitume | PARTIAL_CONTEXTE |
| 33 | Réfection d'étanchéité | PARTIAL_CONTEXTE |
| 34 | Réparation solin | ROUTED_TO_SPECIFIC_SCENE |
| 35 | Réparation Velux | ROUTED_TO_SPECIFIC_SCENE |
| 36 | Réparation noue | ROUTED_TO_SPECIFIC_SCENE |
| 37 | Réparation rive | ROUTED_TO_SPECIFIC_SCENE |
| 38 | Étanchéité cheminée | ROUTED_TO_SPECIFIC_SCENE |
| 39 | Étanchéité acrotère | PARTIAL_CONTEXTE |

### Résumé par catégorie (pipeline runtime, source : service-coverage-audit.json)

| Catégorie | Nombre |
|---|---|
| ROUTED_TO_SPECIFIC_SCENE | 28 |
| PARTIAL_CONTEXTE | 11 |
| TOOLS_ONLY | 0 |
| GENERIC_FALLBACK | 0 |
| **TOTAL** | **39** |

---

## Matrice 39 services → 20 contrats

| # | Métier | Service | contract_key | for_regex correspondante | match |
|---|---|---|---|---|---|
| 1 | toiture | Rénovation toiture complète | `renovation_toiture` | `renovation.*toiture` | ✓ |
| 2 | toiture | Couverture neuve | `renovation_toiture` | `couverture.*neuve` | ✓ |
| 3 | toiture | Réfection toiture | `renovation_toiture` | `refection.*toiture` | ✓ |
| 4 | toiture | Réparation toiture | `reparation_toiture` | `reparation toiture` | ✓ |
| 5 | toiture | Remplacement tuiles | `remplacement_tuiles` | `remplacement (tuiles\|ardoises)` | ✓ |
| 6 | toiture | Remplacement ardoises | `remplacement_tuiles` | `remplacement (tuiles\|ardoises)` | ✓ |
| 7 | toiture | Charpente | `charpente_combles` | `charpente` | ✓ |
| 8 | toiture | Isolation combles | `charpente_combles` | `isolation.*comble` | ✓ |
| 9 | toiture | Faîtage | `faitage` | `faitage` | ✓ |
| 10 | toiture | Zinguerie | `zinguerie` | `zinguerie` | ✓ |
| 11 | toiture | Solins | `solins` | `^solins$` | ✓ |
| 12 | nettoyage_toiture | Démoussage toiture | `demossage_toiture` | `demoussage` | ✓ |
| 13 | nettoyage_toiture | Nettoyage toiture | `demossage_toiture` | `nettoyage.*toiture` | ✓ |
| 14 | nettoyage_toiture | Nettoyage mousse toiture | `demossage_toiture` | `nettoyage.*toiture` | ✓ |
| 15 | nettoyage_toiture | Traitement hydrofuge toiture | `hydrofuge_toiture` | `hydrofuge.*toiture` | ✓ |
| 16 | nettoyage_toiture | Hydrofuge toiture | `hydrofuge_toiture` | `hydrofuge.*toiture` | ✓ |
| 17 | nettoyage_toiture | Traitement anti-mousse toiture | `antimousse_toiture` | `anti.mousse` | ✓ |
| 18 | nettoyage_gouttieres | Nettoyage gouttières | `nettoyage_gouttieres` | `nettoyage.*gouttieres` | ✓ |
| 19 | nettoyage_gouttieres | Entretien gouttières | `nettoyage_gouttieres` | `entretien.*gouttieres` | ✓ |
| 20 | nettoyage_gouttieres | Débouchage gouttières | `debouchage_gouttieres` | `debouchage.*gouttieres` | ✓ |
| 21 | nettoyage_gouttieres | Remplacement gouttières | `remplacement_gouttieres` | `remplacement.*gouttieres` | ✓ |
| 22 | nettoyage_gouttieres | Pose gouttières | `remplacement_gouttieres` | `pose.*gouttieres` | ✓ |
| 23 | etancheite | Réparation fuite toiture | `reparation_fuite_toiture` | `reparation fuite` | ✓ |
| 24 | etancheite | Recherche de fuite | `reparation_fuite_toiture` | `recherche.*fuite` | ✓ |
| 25 | etancheite | Infiltration toiture | `reparation_fuite_toiture` | `infiltration.*toiture` | ✓ |
| 26 | etancheite | Étanchéité toit terrasse | `etancheite_toit_terrasse` | `etancheite toit` | ✓ |
| 27 | etancheite | Étanchéité toiture plate | `etancheite_toit_terrasse` | `etancheite.*plate` | ✓ |
| 28 | etancheite | Étanchéité EPDM | `etancheite_toit_terrasse` | `etancheite.*(epdm)` | ✓ |
| 29 | etancheite | Étanchéité PVC | `etancheite_toit_terrasse` | `etancheite.*(pvc)` | ✓ |
| 30 | etancheite | Étanchéité bitume | `etancheite_toit_terrasse` | `etancheite.*(bitume)` | ✓ |
| 31 | etancheite | Réfection d'étanchéité | `etancheite_toit_terrasse` | `refection.*etancheite` | ✓ |
| 32 | etancheite | Étanchéité balcon | `etancheite_balcon` | `etancheite balcon` | ✓ |
| 33 | etancheite | Étanchéité terrasse | `etancheite_balcon` | `etancheite terrasse` | ✓ |
| 34 | etancheite | Réparation solin | `reparation_solin_cheminee` | `reparation solin` | ✓ |
| 35 | etancheite | Étanchéité cheminée | `reparation_solin_cheminee` | `etancheite cheminee` | ✓ |
| 36 | etancheite | Réparation Velux | `reparation_velux` | `velux` | ✓ |
| 37 | etancheite | Réparation noue | `reparation_noue` | `reparation noue` | ✓ |
| 38 | etancheite | Réparation rive | `reparation_rive_acrotere` | `reparation rive` | ✓ |
| 39 | etancheite | Étanchéité acrotère | `reparation_rive_acrotere` | `acrotere` | ✓ |

**Assertions vérifiées :** 39/39 services couverts — 0 service sans contrat — 0 collision — 0 contrat orphelin

### Justification des mutualisations

| Contrat | Services mutualisés | Justification |
|---|---|---|
| `renovation_toiture` | Rénovation toiture complète + Couverture neuve + Réfection toiture | Même action visuelle : remplacement à grande échelle de la couverture ; seul le vocabulaire client diffère |
| `remplacement_tuiles` | Remplacement tuiles + Remplacement ardoises | Même geste (lève-tuile ou ardoisier) ; seul le matériau diffère ; visuellement identiques à l'exception de la couleur |
| `charpente_combles` | Charpente + Isolation combles | Tous deux montrent la structure intérieure bois ; états `debut`/`encours` suffisamment différents pour guider la composition |
| `demossage_toiture` | Démoussage toiture + Nettoyage toiture + Nettoyage mousse toiture | Même surface (tuiles avec mousse), même outil (brosse/racloir), même résultat (mousse physiquement retirée) |
| `hydrofuge_toiture` | Traitement hydrofuge toiture + Hydrofuge toiture | Même produit (imprégnation hydrofuge), même applicateur (pulvérisateur à dos), tuile propre comme contexte |
| `antimousse_toiture` | Traitement anti-mousse toiture | Contrat dédié, scindé de l'ancien R09 : tuile encore marquée par mousse/lichen, traitement ciblé biocide ; signature visuelle incompatible avec hydrofuge |
| `nettoyage_gouttieres` | Nettoyage gouttières + Entretien gouttières | Même action (curage de la cunette ouverte), même outil (racloir à gouttière) |
| `remplacement_gouttieres` | Remplacement gouttières + Pose gouttières | Même chantier : sections PVC neuves, fixations, profil vierge ; "pose" initiale = même visuel que remplacement |
| `reparation_fuite_toiture` | Réparation fuite + Recherche de fuite + Infiltration toiture | Toutes trois : zone compacte de toiture, cause d'infiltration identifiée et réparée (patch < 6 tuiles) |
| `etancheite_toit_terrasse` | Étanchéité toit terrasse + Étanchéité toiture plate + EPDM + PVC + bitume + Réfection d'étanchéité | Même surface (toiture-terrasse grande échelle), même geste (pose membrane), seul le matériau ou label diffère |
| `etancheite_balcon` | Étanchéité balcon + Étanchéité terrasse | Même surface compacte, même produit, même contexte (garde-corps + façade visible) |
| `reparation_solin_cheminee` | Réparation solin + Étanchéité cheminée | Même zone (pourtour de cheminée), mêmes matériaux (zinc + mortier) |
| `reparation_rive_acrotere` | Réparation rive + Étanchéité acrotère | Même action de joint de périphérie ; `visual_goal` documente les deux cas distincts |

---

## Résultats RTG-C1 à RTG-C12 + RTG-AM1 à RTG-AM7 + RTG-C13 (automatisés)

Sortie complète du script `scripts/audit_roof_waterproofing_gutter_contracts.py` :

```
======================================================================
Audit RTG — Contrats visuels toiture/étanchéité/gouttières
======================================================================

Contrats chargés : 20
Services cluster : 39 (attendu 39)
Services hors-cluster : 133
Clés runtime compositions : 7 (['close_detail', 'contextual_overview',
  'equipment_from_vehicle', 'medium_intervention', 'vehicle_arrival',
  'wide_worksite', 'worker_action'])

[RTG-C1] PASS — 39/39 services dans les 4 métiers cluster
[RTG-C2] PASS — 20/20 contrats schéma complet
[RTG-C3] PASS — 20 clés contract_key uniques
[RTG-C4] PASS — 39/39 services couverts exactement par 1 contrat
[RTG-C5] PASS — 0 collision hors-cluster sur 133 services
[RTG-C6] PASS — 20/20 contrats — 4 états visuels distincts et non vides (285 assertions)
[RTG-C7] PASS — Tous les contrats READY_FOR_IMPLEMENTATION ont allowed_tools non vide
[RTG-C8] PASS — Tous les contrats READY_FOR_IMPLEMENTATION ont worker_rules + safety.required
[RTG-C9] PASS — 9 paires à risque différenciées
[RTG-C10] PASS — 40 composition_preferences validées via ROOF_CONTRACT_COMPOSITION_MAP
           → PHOTO_COMPOSITIONS (7 clés runtime)
[RTG-C11] PASS — roof-waterproofing-gutter-contracts.js non importé dans les fichiers runtime
[RTG-C12] PASS — Source canonique unique: roof-waterproofing-gutter-contracts.js

─── RTG-AM (anti-mousse) ───────────────────────────────────────────

[RTG-AM1] PASS — "Traitement anti-mousse toiture" → exactement 1 correspondance: antimousse_toiture
[RTG-AM2] PASS — Regex /anti.mousse/ ne capture aucun des 2 labels hydrofuge
[RTG-AM3] PASS — Regex /anti.mousse/ ne capture aucun des 3 labels nettoyage/démoussage
[RTG-AM4] PASS — R20 required_visual_evidence distinct de R09 hydrofuge et R08 démoussage
           (5 preuves, 6 hydrofuge, 4 démoussage)
[RTG-AM5] PASS — R20 antimousse_toiture: 4/4 états visuels présents et distincts
[RTG-AM6] PASS — R20 allowed_tools non vide: 4 outil(s)
[RTG-AM7] PASS — R20 safety.required non vide: 2 équipement(s)

─── Statut de déploiement ──────────────────────────────────────────

[RTG-C13] PASS — 20/20 contrats READY_FOR_IMPLEMENTATION

======================================================================
[RESULT] PASS — 20/20 (370 assertions)
======================================================================
```

### Description des checks mis à jour

| Check | Description | Méthode de validation |
|---|---|---|
| RTG-C6 | 4 états visuels (debut/encours/semifinal/final) par contrat — présents, non vides, distincts | Parse `states` block ; accepte `observable_result` pour l'état `final` |
| RTG-C10 | Aliases documentaires résolus via `ROOF_CONTRACT_COMPOSITION_MAP` → clés runtime de `PHOTO_COMPOSITIONS` | Lit `compositions.js` en direct |
| RTG-C13 | 20/20 contrats `READY_FOR_IMPLEMENTATION` — échoue avec `[CONTRACT_NOT_READY_FOR_IMPLEMENTATION]` | Vérification exhaustive du champ `status` |

---

## Paires à risque corrigées

| Paire | Signal discriminant renforcé | Correction apportée |
|---|---|---|
| `demossage_toiture` ↔ `hydrofuge_toiture` | Brosse/racloir + mousse épaisse tombant sur bâche vs pulvérisateur à dos + tuile PROPRE + rivulets uniformes | Confirmé ; visual_goal R09 clarifié |
| `hydrofuge_toiture` ↔ `antimousse_toiture` (NOUVEAU) | Tuile PROPRE + imprégnation uniforme vs tuile ENCORE MARQUÉE + application ciblée biocide | Scission de l'ancien R09 ; contrat R20 `antimousse_toiture` créé |
| `etancheite_toit_terrasse` ↔ `etancheite_balcon` | R14 : acrotère béton + relevés périphériques + naissance/regard + grande surface ; R15 : porte-fenêtre ouvrant sur la plateforme + garde-corps + façade verticale + petite surface | Champs `location_must_have` et `location_forbidden` ajoutés dans les deux contrats |
| `nettoyage_gouttieres` ↔ `debouchage_gouttieres` | R10 : dépôts répartis sur la longueur, curage progressif à la spatule, gouttière conservée ; R11 : obstruction localisée à la naissance, tige introduite dans la naissance, écoulement rétabli | `required_visual_evidence` enrichi dans les deux contrats |
| `reparation_fuite_toiture` ↔ `etancheite_toit_terrasse` | Patch compact < 6 tuiles vs surface grande échelle avec acrotère | Renforcé par `location_must_have` R14 |
| `nettoyage_gouttieres` ↔ `remplacement_gouttieres` | Cunette ancienne + racloir + débris vs PVC neuf + perceuse + anciennes sections au sol | Confirmé |
| `faitage` ↔ `remplacement_tuiles` | Sommet de toiture + mortier + maillet vs tuile isolée + lève-tuile sur pente | Confirmé |
| `solins` ↔ `reparation_solin_cheminee` | Cordon étroit le long d'un mur droit vs pourtour compact de cheminée (4 faces) | Confirmé |
| `reparation_noue` ↔ `faitage` | Noue diagonale entre deux pentes vs ligne de faîtage horizontale au sommet | Confirmé |

---

## Matrice des 20 contrats

| # | Service(s) couverts | contract_key | Composition | Statut |
|---|---|---|---|---|
| R01 | Rénovation toiture complète, Couverture neuve, Réfection toiture | `renovation_toiture` | wide_establishing, medium_intervention | READY |
| R02 | Réparation toiture | `reparation_toiture` | medium_intervention, close_work_detail | READY |
| R03 | Remplacement tuiles, Remplacement ardoises | `remplacement_tuiles` | close_work_detail, medium_intervention | READY |
| R04 | Charpente, Isolation combles | `charpente_combles` | medium_intervention, wide_establishing | READY |
| R05 | Faîtage | `faitage` | close_work_detail, medium_intervention | READY |
| R06 | Zinguerie | `zinguerie` | close_work_detail, medium_intervention | READY |
| R07 | Solins | `solins` | close_work_detail, medium_intervention | READY |
| R08 | Démoussage toiture, Nettoyage toiture, Nettoyage mousse toiture | `demossage_toiture` | wide_establishing × 2 | READY |
| R09 | Traitement hydrofuge toiture, Hydrofuge toiture | `hydrofuge_toiture` | wide_establishing × 2 | READY |
| R10 | Nettoyage gouttières, Entretien gouttières | `nettoyage_gouttieres` | medium_intervention, close_work_detail | READY |
| R11 | Débouchage gouttières | `debouchage_gouttieres` | close_work_detail, medium_intervention | READY |
| R12 | Remplacement gouttières, Pose gouttières | `remplacement_gouttieres` | medium_intervention, wide_establishing | READY |
| R13 | Réparation fuite toiture, Recherche de fuite, Infiltration toiture | `reparation_fuite_toiture` | close_work_detail, medium_intervention | READY |
| R14 | Étanchéité toit terrasse, Étanchéité toiture plate, EPDM, PVC, bitume, Réfection d'étanchéité | `etancheite_toit_terrasse` | wide_establishing, medium_intervention | READY |
| R15 | Étanchéité balcon, Étanchéité terrasse | `etancheite_balcon` | medium_intervention, close_work_detail | READY |
| R16 | Réparation solin, Étanchéité cheminée | `reparation_solin_cheminee` | close_work_detail, medium_intervention | READY |
| R17 | Réparation Velux | `reparation_velux` | close_work_detail, medium_intervention | READY |
| R18 | Réparation noue | `reparation_noue` | close_work_detail, medium_intervention | READY |
| R19 | Réparation rive, Étanchéité acrotère | `reparation_rive_acrotere` | close_work_detail, medium_intervention | READY |
| R20 | Traitement anti-mousse toiture | `antimousse_toiture` | wide_establishing × 2 | READY |

**READY_FOR_IMPLEMENTATION : 20 / 20**

---

## Confirmations

### Runtime inchangé

Aucune modification de WORK_SCENES, SITE_REALISM, service-resolver, composition-planner, worker-planner, safety-rules, Vision, retry policy, prompt rewriter.

Preuve grep (aucun résultat = aucun fichier runtime n'importe le fichier contrats) :

```bash
$ grep -r 'roof-waterproofing-gutter-contracts' src/ --include='*.js' | grep -v debug | grep import
(aucun résultat)
```

Confirmation automatisée : **RTG-C11 PASS**.

### Aucune image réelle générée

Aucune API externe appelée. Aucune commande de génération d'images exécutée. Le fichier `roof-waterproofing-gutter-contracts.js` est exclusivement un contrat de documentation visuelle, non importé dans le pipeline de production.

### Scope Git autorisé

Seuls trois fichiers modifiés par ce correctif :

```
src/image-generation/services/roof-waterproofing-gutter-contracts.js
docs/roof-waterproofing-gutter-contracts-audit.md
scripts/audit_roof_waterproofing_gutter_contracts.py
```

Ajouts dans `roof-waterproofing-gutter-contracts.js` (hors runtime) :
- Export `ROOF_CONTRACT_COMPOSITION_MAP` : table de conversion alias documentaires → clés runtime
- Contrat R20 `antimousse_toiture` complet (status `READY_FOR_IMPLEMENTATION`)

---

## Notes de sécurité

Ce cluster est le plus exposé du catalogue avec 5 niveaux d'accès distincts :

1. **Depuis le sol** — `demossage_toiture`, `hydrofuge_toiture`, `antimousse_toiture` (compositions no-worker) : protection par bâche uniquement
2. **Échelle simple** — `nettoyage_gouttieres`, `debouchage_gouttieres`, `remplacement_gouttieres` : stand-off obligatoire, interdiction de monter sur la gouttière
3. **Toit via échelle de couvreur** — `reparation_toiture`, `remplacement_tuiles`, `faitage`, `solins`, `reparation_solin_cheminee`, `reparation_velux`, `reparation_noue`, `reparation_rive_acrotere`, `reparation_fuite_toiture` : échelle de couvreur accrochée au faîtage, harnais conditionnel
4. **Échafaudage** — `renovation_toiture`, `charpente_combles` : garde-corps et filet anti-chute obligatoires
5. **Toit plat** — `etancheite_toit_terrasse` : 2 m d'exclusion du bord non protégé

Interdictions communes à tout le cluster :
- Worker debout sans protection au bord d'un toit incliné
- Échelle posée sans stabilisateur contre une gouttière
- Worker monté sur la gouttière
- Atteinte latérale > 60 cm de l'échelle de couvreur
- Harnais fixé à un point incohérent (ex. antenne)
