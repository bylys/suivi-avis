# Vague Vitrier — Rapport d'analyse matériau (DV / feuilleté)

**Date :** 2026-07-20  
**Branche :** `feat/vitrier-visual-contracts`  
**Test :** micro-test 2 images — 1 × Remplacement double vitrage + 1 × Vitrage sécurité feuilleté, contexte appartement

---

## Ce qui a fonctionné

- **Contexte appartement résolu** : les deux images montrent un environnement résidentiel intérieur crédible (chambre, fenêtres, radiateur), pas de façade extérieure.
- **Intervention crédible** : 2 ouvriers, ventouses présentes, tenue de travail cohérente.
- **Sécurité pipeline** :
  - Tentative 1 DV rejetée par la safety gate (mains nues sur le verre, critical_violation).
  - Tentative 2 DV générée et acceptée.
  - 2/2 images finales livrées.
- **Stabilité pipeline** : aucune erreur de parsing, aucun timeout, retry fonctionnel.

## Ce qui bloque : la vague est arrêtée

Les deux images livrent la **même grammaire visuelle** — vue frontale de la fenêtre, ouvriers debout face au vitrage, ventouses sur la vitre.

| Attendu | Obtenu |
|---|---|
| Angle oblique 30–45° | Vue frontale (0°) ou légèrement de côté (~10°) |
| Tranche IGU en avant-plan (DV) | Tranche invisible, pane vue de face |
| Barre d'écarteur métallique visible (DV) | Absent — profil d'épaisseur non lisible |
| Tranche feuilletée + intercalaire PVB visible | Absent — pane vue de face, bord hors cadre |
| Intercalaire PVB comme ligne distincte (feuilleté) | Absent |

Sans ces preuves visuelles, les deux images sont **visuellement interchangeables** : un observateur sans titre ne peut pas distinguer un remplacement IGU d'une pose de feuilleté.

---

## Trace des contraintes perdues

### Double vitrage — appartement

| Étape | Contrainte | État |
|---|---|---|
| Contrat visuel | `scene_camera`: "three-quarter oblique angle — IGU edge facing camera" | Défini ✓ |
| `SITE_REALISM` interior_variant | `location_must_have`: IGU edge + spacer bar visible oblique | Défini ✓ |
| `buildDallePromptV2` | `framing` = `INTERIOR_SCENE_BASE.framing` (foreground = "canvas drop cloth, paint tray") | **Peinture ✗** |
| `_applySiteRealism` | `camera_position` = "three-quarter oblique angle" | Appliqué ✓ |
| `_applySiteRealism` | `scene_framing` non lu dans interior_variant (champ absent du bloc) | **Perdu ✗** |
| `_resolveLocationAndComposition` | `composition_desc` = "medium shot showing worker and immediate work area, 1–3 m" | **Frontal ✗** |
| GPT-4.1 rewrite | Priorité 3 = CAMERA COMPOSITION ; `composition_desc` lu AVANT `camera_position` | **Frontal l'emporte ✗** |
| `_appendLockedFinalConstraints` | Aucun verrou NON-NEGOTIABLE pour "Remplacement double vitrage" | **Absent ✗** |

### Vitrage sécurité feuilleté — appartement

Même chaîne de perte. `scene_framing` interior_variant non propagé, `composition_desc` frontale, aucun verrou NON-NEGOTIABLE.

---

## Cause racine

**Deux causes indépendantes, cumulatives :**

1. **`service-resolver.js`** — le bloc `interior_variant` (lignes 93–104) ne lit pas `scene_framing`, contrairement au bloc scenario (ligne 77 déjà correct). Le framing de peinture `INTERIOR_SCENE_BASE` reste actif.

2. **Priorité GPT-4.1** — `composition_desc` de `medium_intervention` ("medium shot showing worker and immediate work area") est utilisé comme premier critère CAMERA COMPOSITION dans le rewriter. Il ne mentionne pas l'angle oblique. `camera_position` (oblique) est de priorité inférieure et ne résiste pas à la réécriture.

3. **Absence de verrou final** — sans entrée `_SVC_SURFACE_LOCK` pour ces deux sous-services, la section NON-NEGOTIABLE ne force pas l'angle et la preuve matériau après la réécriture GPT-4.1.

---

## Évaluation humaine — images micro-test

| Image | Service | Résultat | Raison |
|---|---|---|---|
| `feuillete.jpg` | Vitrage sécurité feuilleté | **PARTIAL** | Vue frontale, 2 ouvriers, ventouses. Bord feuilleté invisible, pas d'intercalaire PVB identifiable. |
| `double_vitrage.jpg` | Remplacement double vitrage | **PARTIAL** | Vue légèrement latérale, 2 ouvriers, baie vitrée aluminium. Tranche IGU non lisible, spacer bar absent, aucune cavité visible. |

Les deux images sont techniquement valides (appartement, intervention, sécurité) mais **non distinguables** sans leurs titres.

---

## Décision

**Vague arrêtée — correctif ciblé appliqué avant de relancer.**

### Correctifs appliqués (2026-07-20)

1. **`service-resolver.js`** — 1 ligne ajoutée dans le bloc `interior_variant` : `if (_intVariant.scene_framing) obj.framing = _intVariant.scene_framing;`
2. **`vitrier.js`** — `scene_framing` ajouté aux `interior_variant` DV et feuilleté avec foreground centré sur la tranche de verre en avant-plan oblique.
3. **`locked-constraints.js`** — entrées `_SVC_SURFACE_LOCK` ajoutées pour "Remplacement double vitrage" et "Vitrage sécurité feuilleté" : verrous NON-NEGOTIABLE oblique + preuve matériau.
4. **`vitrier-scenes-tests.js`** — tests VM1–VM12 ajoutés.

### Prochain micro-test (après validation)

- 1 × Remplacement double vitrage + appartement
- 1 × Vitrage sécurité feuilleté + appartement
- Critère de succès : les deux images sont identifiables **sans titre** sur la base de la tranche de verre, de l'angle, et des composants visibles.
