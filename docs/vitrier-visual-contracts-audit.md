# Audit contrats visuels — Vitrier

**Date** : 2026-07-18  
**Branch** : feat/vitrier-visual-contracts  
**Phase** : 1 — contrats visuels uniquement (aucune scène de production créée)  
**Source canonique** : `src/image-generation/services/vitrier-contracts.js`

---

## Services vitrier — catalogue et couverture actuelle

| # | service_key | service_label | Couverture avant | Couverture après |
|---|-------------|---------------|-----------------|-----------------|
| 1 | remplacement_vitrage_brise | Remplacement vitrage brisé | TOOLS_ONLY | READY_FOR_IMPLEMENTATION |
| 2 | remplacement_double_vitrage | Remplacement double vitrage | TOOLS_ONLY | READY_FOR_IMPLEMENTATION |
| 3 | remplacement_fenetre_pvc | Remplacement fenêtre PVC | TOOLS_ONLY | READY_FOR_IMPLEMENTATION |
| 4 | remplacement_fenetre_aluminium | Remplacement fenêtre aluminium | TOOLS_ONLY | READY_FOR_IMPLEMENTATION |
| 5 | reparation_fenetre | Réparation fenêtre | TOOLS_ONLY | READY_FOR_IMPLEMENTATION |
| 6 | remplacement_porte_vitree | Remplacement porte vitrée | TOOLS_ONLY | READY_FOR_IMPLEMENTATION |
| 7 | vitrage_securite_feuillette | Vitrage sécurité feuilleté | TOOLS_ONLY | READY_FOR_IMPLEMENTATION |
| 8 | bris_de_glace_urgence | Bris de glace urgence | TOOLS_ONLY | READY_FOR_IMPLEMENTATION |

**8/8 contrats READY_FOR_IMPLEMENTATION**

---

## Matrice d'évaluation par service

| Service | Action distincte | Type de vitrage | Contexte | États distincts | Regex unique | Sécurité | Statut |
|---------|-----------------|-----------------|----------|-----------------|--------------|----------|--------|
| Remplacement vitrage brisé | ✓ pose vitre unique dans cadre existant | ✓ single pane, bris visible | ✓ résidentiel, façade | ✓ 4 états | ✓ `vitrage.*bris` | ✓ gants requis | **READY** |
| Remplacement double vitrage | ✓ extraction/pose IGU avec barre d'espacement | ✓ IGU épais, spacer bar visible | ✓ résidentiel, remplacement planifié | ✓ 4 états | ✓ `double.vitrage` | ✓ gants, 2 workers si large | **READY** |
| Remplacement fenêtre PVC | ✓ pose cadre PVC blanc complet dans baie | ✓ vitrage IGU intégré en usine | ✓ baie maçonnée exposée, cadre blanc | ✓ 4 états | ✓ `fenetre.*pvc` | ✓ gants bords | **READY** |
| Remplacement fenêtre aluminium | ✓ pose cadre alu gris/anthracite complet | ✓ vitrage IGU intégré en usine | ✓ baie maçonnée exposée, métal | ✓ 4 états | ✓ `alumin` | ✓ gants bords tranchants | **READY** |
| Réparation fenêtre | ✓ intervention locale sur cadre existant intact | ✓ vitre intacte — pas de manipulation verre | ✓ fenêtre maintenue en place, pas de baie exposée | ✓ 4 états | ✓ `reparation.*fenetre` | ✓ gants si bords | **READY** |
| Remplacement porte vitrée | ✓ pose porte hauteur 200 cm+ avec quincaillerie | ✓ verre sécurité trempé/feuilleté en porte | ✓ baie de porte, seuil, gonds, serrure visibles | ✓ 4 états | ✓ `porte.vitr` | ✓ 2 workers, gants | **READY** |
| Vitrage sécurité feuilleté | ✓ pose verre feuilleté avec tranche interlayer | ✓ feuilleté — 2 couches + film PVB visible en tranche | ✓ silicone structurel, profilé alu lourd | ✓ 4 états | ✓ `feuillette` | ✓ ventouses obligatoires | **READY** |
| Bris de glace urgence | ✓ sécurisation provisoire, NE PAS poser de vitre propre | ✓ fragments présents, protection provisoire opaque | ✓ urgence, vitesse, pas de résultat vitré final | ✓ 4 états | ✓ `bris.de.glace` | ✓ gants + lunettes obligatoires | **READY** |

---

## Familles visuelles et différenciations clés

### F1 — Vitrage brisé ponctuel vs F8 — Urgence bris de glace (paire la plus risquée)

| Dimension | Remplacement vitrage brisé | Bris de glace urgence |
|-----------|---------------------------|----------------------|
| **Action** | Remplacement permanent — nouvelle vitre claire posée | Sécurisation provisoire — planche/film protecteur |
| **Résultat final** | Vitre claire et propre dans le cadre existant | Ouverture obturée (opaque) — PAS de vitre transparente |
| **Outils** | Ventouses, mastic, silicone, espaceurs | Perceuse, agrafeuse, balai, couteau cutter, polycarbonate |
| **Timing** | Intervention planifiée | Urgence : vitesse, outillage limité, PPE immédiat |
| **Débris** | Nettoyés progressivement | Confinement immédiat en priorité |

### F3 — Fenêtre PVC vs F4 — Fenêtre aluminium (paire frame color)

| Dimension | Fenêtre PVC | Fenêtre aluminium |
|-----------|-------------|------------------|
| **Couleur cadre** | Blanc plastique | Gris / anthracite / ton métallique |
| **Texture** | Plastique mat, multi-chambre | Métal lisse, profilé extrudé |
| **Signal visuel principal** | Blanc uniforme | Couleur sombre ou métallique |

### F2 — Double vitrage vs F1 — Remplacement vitrage simple

| Dimension | Double vitrage | Vitrage simple |
|-----------|---------------|----------------|
| **Épaisseur** | 24–28 mm visible en tranche | 4–6 mm |
| **Outil distinctif** | Grande ventouse double-pane, outil parclose | Petite ventouse, couteau à mastic |
| **Brise** | Jamais — remplacement planifié | Peut être cassé en début |
| **Parcloses** | Retirées et remises | Mastic/joint simple |

---

## Résultats VV1–VV14

| Test | Résultat | Assertions |
|------|----------|-----------|
| VV1 — Nombre exact de contrats | ✓ PASS | 8 === 8 |
| VV2 — Parité SERVICE_CATALOG | ✓ PASS | 8/8 labels présents |
| VV3 — Schéma complet | ✓ PASS | 19 champs × 8 services |
| VV4 — service_key uniques + for_regex uniques | ✓ PASS | 8 regex uniques |
| VV5 — Regex couvre tous les services vitrier | ✓ PASS | 8/8 services matchés (1 regex chacun) |
| VV6 — Aucune collision interne | ✓ PASS | 0 collision |
| VV7 — Aucun service externe capturé | ✓ PASS | 0/29 services externes capturés |
| VV8 — Quatre états distincts | ✓ PASS | 4 états par service |
| VV9 — Paires à risque différenciées | ✓ PASS | 6 paires documentées |
| VV10 — Outils cohérents | ✓ PASS | 8 forbidden_tools, 0 outil incohérent |
| VV11 — Workers et sécurité | ✓ PASS | 14 mentions gants/gloves |
| VV12 — Compositions valides | ✓ PASS | 3 compositions valides utilisées |
| VV13 — Règles transparence/reflets | ✓ PASS | 64 références visuelles verre |
| VV14 — Source canonique unique | ✓ PASS | canonical_source + réexport cohérents |

**Total Python : 90/90 — ALL PASS**

---

## Regex de routage — résultat complet

| Service | Regex | Vitrier matchés | Externes capturés |
|---------|-------|----------------|-------------------|
| `remplacement_vitrage_brise` | `vitrage.*bris\|bris.*vitrage` | Remplacement vitrage brisé ✓ | 0 |
| `remplacement_double_vitrage` | `double.vitrage` | Remplacement double vitrage ✓ | 0 |
| `remplacement_fenetre_pvc` | `fenetre.*pvc\|pvc.*fenetre` | Remplacement fenêtre PVC ✓ | 0 |
| `remplacement_fenetre_aluminium` | `fenetre.*alumin\|alumin` | Remplacement fenêtre aluminium ✓ | 0 |
| `reparation_fenetre` | `reparation.*fenetre\|fenetre.*repar` | Réparation fenêtre ✓ | 0 |
| `remplacement_porte_vitree` | `porte.vitr` | Remplacement porte vitrée ✓ | 0 |
| `vitrage_securite_feuillette` | `feuillette\|vitrage.*securite` | Vitrage sécurité feuilleté ✓ | 0 |
| `bris_de_glace_urgence` | `bris.de.glace\|glace.*urgence` | Bris de glace urgence ✓ | 0 |

**Couverture : 100 % — Collisions internes : 0 — Services externes capturés : 0**

---

## Paires à risque identifiées

| Paire | Signal de différenciation principal |
|-------|-------------------------------------|
| Vitrage brisé ↔ Bris urgence | Permanent (vitre claire) vs provisoire (planche/film opaque) |
| Fenêtre PVC ↔ Fenêtre aluminium | Blanc plastique vs gris/anthracite métal |
| Double vitrage ↔ Vitrage simple | Tranche IGU épaisse + spacer bar vs pane fin |
| Porte vitrée ↔ Fenêtre PVC/alu | Hauteur ≥ 200 cm + quincaillerie de porte vs proportions fenêtre |
| Réparation ↔ Remplacement vitrage | Vitre intacte, cadre en place vs vitre absente/cassée |
| Vitrage feuilleté ↔ Double vitrage | Tranche à 2 couches + film PVB vs IGU spacer bar |

---

## Configuration runtime existante — état au démarrage du chantier

| Composant | État actuel | Action requise en phase 2 |
|-----------|-------------|--------------------------|
| `WORK_SCENES.vitrier` | 1 scène générique (`setting=exterior`, `hasWorkers=false`) | Remplacer par 8 scénarios avec `_for` |
| `SITE_REALISM.vitrier` | Flat — outils/protections/détails uniquement | Ajouter `_dispatch:contexte`, `scenarios` avec `_for` |
| `SAFETY_CHECK_RULES.vitrier` | Présent (contrairement à carrelage) | Conserver — vérifier compatibilité avec nouvelles scènes |
| `batch-planner` | Aucune règle vitrier | Vérifier si guards `setting` s'appliquent |
| `location-resolver` | Aucune règle vitrier | RC-0 override applicable si scènes intérieures |

---

## Correctif CP4 — Faux positif `Étanchéité PVC` (checkpoint pré-Phase 2)

Le checkpoint étendu (164 services vs 29 dans l'audit initial) a révélé que `/pvc/i` capturait `Étanchéité PVC` (étanchéité bitume/EPDM/PVC).

**Correction appliquée** : regex renforcée `fenetre.*pvc|pvc.*fenetre` — exige le contexte "fenetre" pour éviter toute capture des services d'étanchéité PVC.

| | Avant | Après |
|--|-------|-------|
| Regex | `/pvc/i` | `/fenetre.*pvc\|pvc.*fenetre/i` |
| Faux positifs (164 services) | 1 (`Étanchéité PVC`) | 0 |
| Vrais positifs (vitrier) | 1 | 1 (inchangé) |

---

## Statut final

```
Contrats visuels             : 8/8 READY_FOR_IMPLEMENTATION
Checkpoint Python (164/164)  : ALL PASS (après correctif regex PVC)
Tests VV1–V14 originaux      : 90/90 PASS (avec regex corrigée)
Collisions regex             : 0
Paires différenciées         : 6/6
Faux positifs 164 services   : 0
Runtime de production modifié: NON
Images réelles générées      : NON
```
