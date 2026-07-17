# Rapport Vague 2 — Carrelage (5 services, état=encours, nb=1)

**Date** : 2026-07-17  
**Branch** : feat/carrelage-service-scenes  
**Commit pipeline** : eca6f5e (tag : `carrelage-prompts-validated-eca6f5e`)  
**Run** : 5 tâches — 5/5 SUCCESS  
**Télémétrie détaillée** : incomplète (voir section dédiée)

---

## Résultats par service

| # | Service | Résultat Vague 1 | Défaut historique réel | Résultat Vague 2 | Corrigé |
|---|---------|-----------------|------------------------|-----------------|---------|
| 1 | Pose carrelage mural | PARTIAL | Pose verticale correcte mais sur un mur **extérieur** avec véhicule visible — RC-0 (`maison_individuelle` must_have=façade) + RC-3 (vehicle=clearly_visible) | Mur intérieur vertical, croisillons noirs, ventouse + seau de mortier | **Oui** |
| 2 | Faïence salle de bain | FAIL | Image totalement hors sujet : **extérieur de maison**, aucun carrelage visible — RC-2 (wide_worksite 5-15 m impossible en intérieur, sans travailleur ni ancre indoor) | Salle de bain intérieure, WC + baignoire visibles, pose murale active | **Oui** |
| 3 | Faïence cuisine | PARTIAL | Pose de carrelage **au sol** dans une cuisine au lieu de la crédence murale — RC-3 (vehicle=clearly_visible force un extérieur) + composition 10-30 m cache la crédence | Crédence verticale visible, meubles bas de cuisine + plan de travail, niveau à bulle | **Oui** |
| 4 | Carrelage terrasse ext. | PASS (non différencié) | Image individuellement plausible mais **indistinguable du dallage** : même cadrage, mêmes matériaux, aucun trait distinctif terrasse vs voie d'accès | Terrasse couverte + pergola à toit vitré, maison pavillonnaire immédiatement visible en fond | **Oui** |
| 5 | Dallage extérieur | PASS (non différencié) | Image individuellement plausible mais **indistinguable de la terrasse** — règle d'arrêt déclenchée | Allée fonctionnelle longue, plantes en bordures des deux côtés, brouette de transport visible | **Oui** |

---

## Évaluation visuelle — Rubric 7 critères

| Critère | Action | Surface | Contexte | Preuves | Outils | Workers | Confusion |
|---|---|---|---|---|---|---|---|
| **Pose carrelage mural** | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **Faïence cuisine** | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **Faïence salle de bain** | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **Carrelage terrasse ext.** | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **Dallage extérieur** | PASS | PASS | PASS | PASS | PASS | PASS | PASS |

**Score : 5/5 images à 7/7 PASS** (minimum requis : 4/5 avec 6/7 PASS, Action+Surface+Contexte+Confusion obligatoires)

---

## Distinctions pairwise

| Paire | Signal visuel distinctif | Verdict |
|-------|--------------------------|---------|
| Mural ≠ sol/façade | Surface verticale, croisillons, ventouse — vs. surface horizontale | **PASS** |
| Salle de bain ≠ cuisine/extérieur | Sanitaires (WC + baignoire) — vs. meubles de cuisine / nature | **PASS** |
| Terrasse ≠ dallage | Pergola vitrée + espace de vie/façade — vs. allée longue + plantes + brouette | **PASS** |

---

## Corrections pipeline appliquées (eca6f5e)

| RC | Défaut | Correction |
|----|--------|------------|
| RC-0 | `maison_individuelle` imposait `must_have=['house building clearly visible']` à tous les services | `_resolveLocationAndComposition` : quand `setting=interior` + `locType=maison_individuelle` → override `appartement` |
| RC-1 | Champ `architecture` portait une description extérieure de ville dans les scènes intérieures | `scene-builder.js` : guard sur `resolvedSetting=interior` pour utiliser `INTERIOR_SCENE_BASE.architecture` |
| RC-2 | Batch planner attribuait `contextual_overview`/`wide_worksite` (compositions extérieures) aux services intérieurs | `location-resolver.js` : descriptions de composition remappées pour les scènes intérieures |
| RC-3 | `vehicle=clearly_visible` assigné en intérieur → rewriter génère un extérieur pour l'accommoder | `location-resolver.js` : forcer `vehicle=absent` quand `setting=interior` |
| RC-4 | `_IMG_REWRITE_SYSTEM` n'avait aucune priorité sur le champ `setting` | `prompt-rewriter.js` : priorité 0 ajoutée — SETTING indoor/outdoor enforcement |
| RC-5 | `_appendLockedFinalConstraints` sans bloc intérieur | `locked-constraints.js` : bloc INTERIOR SETTING AND LOCATION ajouté avec contraintes sanitaires SdB et crédence verticale cuisine |
| Étape 8 | Terrasse et dallage : même `location_type`, images indistinguables | `locations.js` + `carrelage.js` + `service-resolver.js` : `terrasse_attenante` et `voie_acces_prive` avec `must_have`/`forbidden`/`work_surface` distincts |

---

## Télémétrie — limitation

`_modLastTasks` (état privé du module `index.js`) a été réinitialisé lors du rechargement de page survenu entre la fin du batch et la session de capture. Les données suivantes sont **confirmées** :

- Tâches planifiées : **5**
- Tâches avec status SUCCESS : **5** (affiché "5 / 5 images générées" en galerie)
- Tâches échouées : **0** (`lastFailed: 0` capturé en console avant rechargement)
- Vision calls : **0** — intentionnel ; `carrelage` est absent de `SAFETY_CHECK_RULES` (safety-rules.js commentaire : "skipped: floor-level, blade guard already in prompt rules")
- Appels réseau observés via intercepteur : **6** (capturés partiellement avant le rechargement — 3× `chat/completions` + 3× `images/generations` ; l'intercepteur a été installé après le démarrage du batch, le nombre total réel n'est pas démontrable)

**Ne pas affirmer** : "5 appels Images exactement" ni "0 retry" — ces deux informations ne sont plus démontrables.

---

## Évaluation humaine — Vision volontairement désactivée

Les cinq images ont été évaluées par un humain via capture d'écran directe de la galerie du générateur. Aucun appel à l'API Vision n'a été effectué pendant la génération (comportement attendu — voir ci-dessus). L'évaluation humaine constitue la seule source d'autorité sur le contenu visuel pour cette vague.

---

## Statut final

```
Validation visuelle              : PASS
Validation des distinctions      : PASS
Validation pipeline              : 5/5 SUCCESS
Validation télémétrique détaillée: INCOMPLETE
Nouvelle génération nécessaire   : NON
Correctif de production          : NON
```
