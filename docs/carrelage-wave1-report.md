# Rapport Vague 1 — Carrelage (6 services, état=encours, nb=1)

**Date** : 2026-07-17  
**Branch** : feat/carrelage-service-scenes  
**Run** : 6 tâches, 0 retry, 0 visionCall, 6 appels API réels

---

## Résultats par service

| # | Service | Critère d'évaluation | Résultat |
|---|---------|----------------------|----------|
| 1 | Pose carrelage mural | Mur intérieur visible, action en cours | **PARTIAL** |
| 2 | Faïence salle de bain | Faïence salle de bain avec équipement sanitaire | **FAIL** |
| 3 | Faïence cuisine | Crédence cuisine visible, action en cours | **PARTIAL** |
| 4 | Carrelage terrasse ext. | Terrasse extérieure, carrelage en pose | **PASS** |
| 5 | Dallage extérieur | Dallage posé en extérieur | **PASS** |
| 6 | Pose carrelage sol | Sol en cours de carrelage, intérieur | **PASS** |

**Bilan** : PASS=3 · PARTIAL=2 · FAIL=1

---

## Règle d'arrêt — déclenchée

La paire terrasse/dallage (tâches 4 et 5) est **non différenciée visuellement** : les deux images montrent une surface carrelée extérieure avec les mêmes cadrages et matériaux, sans trait distinctif entre une terrasse et un dallage. Le résultat individuel PASS de chacune reflète uniquement le fait que le contexte extérieur et l'action sont corrects — pas que les deux images soient distinctes entre elles.

→ Règle : "1 paire entière non différenciée → arrêt." Vague 2 non lancée.

---

## Problème principal : contrainte `interior` perdue pour 3 services

Les services mural (PARTIAL), salle de bain (FAIL) et cuisine (PARTIAL) ont tous `setting: 'interior'` correctement défini dans le SceneJSON final. Cependant, l'image générée montre un extérieur ou la mauvaise surface.

### Ce qui fonctionne
- `_applySiteRealism` : sélectionne le bon scénario (mural, salle de bain, cuisine), réaffirme `setting: 'interior'`, injecte le bon `work_type` (crédence, faïence autour de baignoire…).
- `_resolveLocationAndComposition` : ne touche pas le champ `setting`.
- Le champ `setting: 'interior'` est présent et correct dans le SceneJSON final transmis au rewriter.

### Ce qui échoue
Le rewriter GPT-4.1 (`_IMG_REWRITE_SYSTEM`) ne mentionne pas le champ `setting`. Sa priorité 2 ("CAMERA COMPOSITION") et priorité 5 ("CONTEXT — architecture style") dominent. Les signaux contradictoires dans le JSON l'emportent sur `setting: 'interior'` :

| Tâche | Signal contradictoire | Effet observé |
|-------|----------------------|---------------|
| Mural (1) | `composition='contextual_overview'` (10-30 m) + `vehicle='clearly_visible'` | Vue extérieure pour accommoder un véhicule |
| Salle de bain (2) | `composition='wide_worksite'` (5-15 m — "building, vehicle, or garden") | Vue extérieure : impossible de reculer 5-15 m dans une salle de bain |
| Cuisine (3) | `composition='contextual_overview'` (10-30 m) + `vehicle='clearly_visible'` | Vue sol extérieur au lieu de crédence murale |

### Signal supplémentaire : `architecture` extérieure dans le SceneJSON

Le champ `architecture` du SceneJSON initial est alimenté par `_getCityContext()` (description architecturale de la ville, ex. : "classic Haussmann-style stone buildings with zinc rooftops"). Ce champ n'est pas effacé par `_applySiteRealism`. Le rewriter lit `architecture` avec priorité 5, recevant une description extérieure alors que `setting: 'interior'`.

---

## Télémétrie corrigée

### Preuve que les "29 appels" annoncés sont une erreur

Un rapport antérieur listait par tâche les valeurs `5, 3, 3, 6, 6, 6` et en faisait la somme (29) pour obtenir le "nombre d'appels API".

**Les nombres `5, 3, 3, 6, 6, 6` représentaient : la valeur du compteur global cumulatif `state.counters.imageCalls` au moment précis où chaque tâche a loggué son `[IMAGE SUCCESS]`.**

Ce compteur est incrémenté une fois par appel à `generateImageOnly()` (`generate-image.js:98`) — c'est le total cumulé de tous les appels de tout le run depuis le début, pas le compte de la tâche individuelle. La somme de ces instantanés (`5+3+3+6+6+6 = 29`) n'a aucune signification.

**Preuves par le code :**

| Point de vérification | Localisation | Sémantique |
|-----------------------|-------------|------------|
| `state.counters.imageCalls++` | `generate-image.js:98` | Incrémenté 1 fois par appel `generateImageOnly()` — compteur global cumulatif |
| `state.imageCallLog.push({ type:'image', ...})` | `generate-image.js:99` | 1 entrée par appel réseau image réel — seule source fiable du décompte |
| `console.log('[IMAGE SUCCESS] imageCalls=N')` | `run-batch.js:114` | N = valeur courante du compteur global au moment du log, pas le compte de la tâche |
| `state.counters.visionCalls++` | `run-batch.js:70` | Jamais incrémenté pour carrelage (absent de SAFETY_CHECK_RULES) |

**Reconstruction du timing avec CONCURRENCY=3 (preuve par analyse de code) :**

| Moment | Événement | Valeur `imageCalls` |
|--------|-----------|---------------------|
| t=0 | Tasks 1+2+3 démarrent simultanément, chacune appelle l'API | 3 |
| t=T₂ | Task 2 log SUCCESS (parmi les plus rapides) | 3 → task 4 démarre → **4** |
| t=T₃ | Task 3 log SUCCESS | 4 → task 5 démarre → **5** |
| t=T₁ | Task 1 log SUCCESS (la plus lente du lot 1) | **5** |
| t=T₁+ | Task 6 démarre | **6** |
| t=T₄₋₆ | Tasks 4, 5, 6 log SUCCESS | **6, 6, 6** |

Valeurs loguées par taskId : `1→5, 2→3, 3→3, 4→6, 5→6, 6→6`. Somme = 29 (sans signification). Appels réels = **6**.

**Note** : Cette reconstruction est basée sur l'analyse du code et du modèle de concurrence. Les timestamps de fetch réseau de la Vague 1 ne sont pas disponibles (run antérieur à cette analyse forensique). La conclusion de 6 appels réels est soutenue par `imageCallLog.filter(e => e.type === 'image').length` — source unique d'autorité pour le décompte réseau.

### Télémétrie par tâche

| taskId | Service | Valeur `imageCalls` loguée | Appels réseau réels | Vision | Retry | Status |
|--------|---------|---------------------------|---------------------|--------|-------|--------|
| 1 | Pose carrelage mural | 5 (cumulatif) | 1 | 0 | 0 | SUCCESS |
| 2 | Faïence salle de bain | 3 (cumulatif) | 1 | 0 | 0 | SUCCESS |
| 3 | Faïence cuisine | 3 (cumulatif) | 1 | 0 | 0 | SUCCESS |
| 4 | Carrelage terrasse ext. | 6 (cumulatif) | 1 | 0 | 0 | SUCCESS |
| 5 | Dallage extérieur | 6 (cumulatif) | 1 | 0 | 0 | SUCCESS |
| 6 | Pose carrelage sol | 6 (cumulatif) | 1 | 0 | 0 | SUCCESS |

### Pourquoi `visionCalls=0` — intentionnel et documenté

`SAFETY_CHECK_RULES` dans `safety/safety-rules.js` ligne 39 :

```js
// carrelage — skipped: floor-level, blade guard already in prompt rules
```

La clé `'carrelage'` est absente de `SAFETY_CHECK_RULES`. La condition de déclenchement dans `run-batch.js:63` est :

```js
if (imageResult.b64 && SAFETY_CHECK_RULES[task._planBase._matched_key])
```

Pour carrelage, `SAFETY_CHECK_RULES['carrelage']` = `undefined` (falsy) → le safety check Vision n'est **jamais déclenché**. Ce n'est pas un oubli : le commentaire l'explicite. `visionCalls=0` est le comportement attendu.

---

## Plan de correction assigné (batch planner)

| taskId | Service | composition | vehicle | workers |
|--------|---------|-------------|---------|---------|
| 1 | Pose carrelage mural | contextual_overview | clearly_visible | workers |
| 2 | Faïence salle de bain | **wide_worksite** | absent | **none** |
| 3 | Faïence cuisine | contextual_overview | clearly_visible | workers |
| 4 | Carrelage terrasse ext. | contextual_overview | absent | workers |
| 5 | Dallage extérieur | contextual_overview | partially_visible | workers |
| 6 | Pose carrelage sol | medium_intervention | absent | indirect |

---

## 6 causes racines — diagnostic complet (RC-0 à RC-5)

### RC-0 — Type de lieu incorrect : `maison_individuelle` impose une façade extérieure (cause dominante)

`_CONTEXTE_OPTIONS_TO_LOCATION['maison'] = 'maison_individuelle'` (locations.js:234).

Tous les services carrelage avec `contexte='maison'` (défaut) reçoivent `location_type='maison_individuelle'`. Ce type de location a :

```js
must_have: ['house building clearly visible — facade or roof or exterior']
```

Le system prompt du rewriter dit : **"Every element in location_must_have must appear visible in the scene."** — GPT-4.1 est donc EXPLICITEMENT ordonné d'afficher la façade ou le toit extérieur de la maison, même pour une salle de bain.

De plus, `maison_individuelle.subtypes` sont tous des descriptions extérieures :
- 'modern detached house with tiled roof and small front garden'
- 'older individual house with rendered facade'
- etc.

La location correcte pour les services intérieurs est `appartement` :
- `must_have: ['interior residential room — walls, ceiling, and floor of an apartment']`
- `compatible_jobs: ['peinture', 'carrelage', ...]`

La correction : dans `_resolveLocationAndComposition`, quand `obj.setting === 'interior'` et `locType === 'maison_individuelle'` → remplacer par `appartement`.

### RC-1 — Champ `architecture` extérieur persiste dans les scènes intérieures

`buildDallePromptV2` injecte `architecture = city.arch` (description Haussmann ou équivalente) même pour les services avec `work.setting === 'interior'` car le guard `intBase` est court-circuité. Le rewriter lit ce champ en priorité 5 et ancre une architecture de ville extérieure.

### RC-2 — Batch planner attribue des compositions extérieures aux services intérieurs

`wide_worksite` (5-15 m — "building, vehicle, or garden") et `contextual_overview` (10-30 m — "neighbourhood, road type, property context") sont des compositions d'extérieur. Elles sont attribuées sans vérifier `setting`. Le planner ne connaît pas la distinction intérieur/extérieur.

### RC-3 — Véhicule autorisé en intérieur

`_selectVehiclePresence` n'a pas de guard sur `setting`. Un véhicule `clearly_visible` dans une cuisine ou devant un mur de carrelage intérieur est physiquement impossible — le rewriter génère une scène extérieure pour l'accommoder.

### RC-4 — `_IMG_REWRITE_SYSTEM` ignore le champ `setting`

Le system prompt du rewriter liste 7 priorités. Aucune ne mentionne `setting`. RC-0 à RC-3 injectent des signaux extérieurs dans le SceneJSON ; RC-4 fait que le rewriter n'a aucune instruction explicite pour les contrecarrer.

### RC-5 — `_appendLockedFinalConstraints` sans bloc intérieur

Aucune contrainte d'intérieur verrouillée en fin de prompt. Le bloc CAMERA_COMPOSITION pour `wide_worksite` écrit "building, vehicle, garden **or room** remains identifiable" — signal mixte qui peut ancrer un extérieur.

---

## Corrections proposées (à implémenter après validation du diagnostic)

Ordre obligatoire : corriger la source de contamination (RC-0) avant de renforcer le rewriter (RC-4) et les contraintes finales (RC-5).

| Étape | Cible RC | Fichier | Correction |
|-------|----------|---------|------------|
| 1 | RC-0 | `resolution/location-resolver.js` | Quand `obj.setting === 'interior'` et `locType === 'maison_individuelle'` → substituer `appartement` (élimine `must_have: ['house building clearly visible']`) |
| 2 | RC-0 | `config/locations.js` | Ajouter `LOCATION_SUBTYPE_COMPATIBILITY.appartement` : salle de bain → 'bathroom or wet room', cuisine → 'kitchen', etc. |
| 3 | RC-1 | `prompt/scene-builder.js` | Utiliser `INTERIOR_SCENE_BASE.architecture` quand `resolvedSetting === 'interior'` (supprimer le guard `work.setting !== 'interior'`) |
| 4 | RC-2 | `resolution/location-resolver.js` | `resolveCompositionDescription({composition, setting})` — descriptions intérieures pour `wide_worksite`/`contextual_overview` quand `setting === 'interior'` |
| 5 | RC-3 | `resolution/location-resolver.js` | Forcer `professional_vehicle_presence = 'absent'` quand `obj.setting === 'interior'` |
| 6 | RC-4 | `prompt/prompt-rewriter.js` | Ajouter priorité 0 : "SETTING — interior scene must stay entirely indoors. Never show exterior facade, street, garden, roof, or outdoor wall." |
| 7 | RC-5 | `prompt/locked-constraints.js` | Ajouter bloc `SETTING — INTERIOR ONLY` + sanitary pour salle de bain + backsplash vertical pour cuisine |
| 8 | terrasse/dallage | `services/carrelage.js` + `resolution/service-resolver.js` | Ajouter `location_subtype`, `location_must_have`, `location_forbidden` distincts aux scénarios terrasse et dallage |

**Aucune modification de production avant validation de ce diagnostic.**
