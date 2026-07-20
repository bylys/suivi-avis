# Audit — Contrats visuels toiture / étanchéité / gouttières

**Date :** 2026-07-20  
**Branche :** feat/roof-waterproofing-gutter-contracts  
**Source canonique :** `src/image-generation/services/roof-waterproofing-gutter-contracts.js`  
**Tests :** `src/image-generation/debug/roof-waterproofing-gutter-contracts-tests.js` (RTG-C1 à RTG-C12)

---

## Périmètre

| Métier catalogue | Services | Contrats |
|---|---|---|
| `toiture` — Couverture / Toiture | 11 | R01–R07 |
| `nettoyage_toiture` — Nettoyage / Démoussage toiture | 6 | R08–R09 |
| `nettoyage_gouttieres` — Nettoyage gouttières | 5 | R10–R12 |
| `etancheite` — Étanchéité | 17 | R13–R19 |
| **Total** | **39** | **19** |

---

## Matrice des contrats

| # | Service | Contrat | Action observable | Surface | Preuve distinctive | Safety | Regex unique | Statut |
|---|---|---|---|---|---|---|---|---|
| R01 | Rénovation toiture complète, Couverture neuve, Réfection toiture | `renovation_toiture` | Strips old tiles / lays new courses at full-roof scale | Pitched roof, both slopes | Scaffold + full surface coverage, sharp old/new contrast | Scaffold obligatoire + netting + tarp | `renovation.*toiture\|refection.*toiture\|couverture.*neuve` | **READY_FOR_IMPLEMENTATION** |
| R02 | Réparation toiture | `reparation_toiture` | Roof ladder + small zone 4–10 tiles open | Pitched slope, 4–10 tile zone | Roof ladder hooked over ridge as sole access tool, targeted zone | Roof ladder mandatory, harness conditional | `reparation toiture` | **READY_FOR_IMPLEMENTATION** |
| R03 | Remplacement tuiles, Remplacement ardoises | `remplacement_tuiles` | Tile lifter on 1–3 tiles, new tile sliding into gap | Pitched slope, 1–3 tiles max | Lève-tuile tool + new tile brighter than weathered neighbours | Roof ladder + gloves | `remplacement (tuiles\|ardoises)` | **READY_FOR_IMPLEMENTATION** |
| R04 | Charpente, Isolation combles | `charpente_combles` | Nailing battens to rafters OR unrolling insulation between joists | Roof structure interior | Raw sawn timber visible OR insulation rolls between joist bays | Scaffold platform / boarding across joists + dust mask | `charpente\|isolation.*comble` | **READY_FOR_IMPLEMENTATION** |
| R05 | Faîtage | `faitage` | Bolster + mortar at ridge apex; rubber mallet tapping ridge tiles | Ridge apex line | Mortar at the summit + both slopes visible below | Harness required at ridge | `faitage` | **READY_FOR_IMPLEMENTATION** |
| R06 | Zinguerie | `zinguerie` | Tin snips + folder forming zinc/lead sheet | Scaffold or slope at valley/chimney/eave | Metal fabrication visible: tin snips, fold lines, formed profile | Cut-resistant gloves mandatory | `zinguerie` | **READY_FOR_IMPLEMENTATION** |
| R07 | Solins | `solins` | Chiselling old mortar at wall-tile junction, pointing fresh bead | Narrow junction strip along wall base | Narrow bead along wall-to-tile line, not summit or chimney perimeter | Roof ladder + knee pad | `^solins$` | **READY_FOR_IMPLEMENTATION** |
| R08 | Démoussage toiture, Nettoyage toiture, Nettoyage mousse toiture | `demossage_toiture` | Stiff broom scraping thick moss off tiles | Pitched tile surface | Thick moss being physically removed + clean/mossy contrast + tarp with debris | No-worker composition | `demoussage\|nettoyage.*toiture` | **READY_FOR_IMPLEMENTATION** |
| R09 | Traitement hydrofuge toiture, Hydrofuge toiture, Traitement anti-mousse toiture | `hydrofuge_toiture` | Backpack sprayer applying chemical product on clean/lightly soiled tiles | Pitched tile surface | Backpack sprayer + product rivulets + tiles darkening uniformly | No-worker composition | `hydrofuge.*toiture\|traitement.*toiture\|anti.mousse` | **READY_FOR_IMPLEMENTATION** |
| R10 | Nettoyage gouttières, Entretien gouttières | `nettoyage_gouttieres` | Gutter scoop extracting leaf mat from trough | Gutter trough | Ladder + scoop + leaf debris pile on ground | Ladder stand-off mandatory, no standing on gutter | `nettoyage.*gouttieres\|entretien.*gouttieres` | **READY_FOR_IMPLEMENTATION** |
| R11 | Débouchage gouttières | `debouchage_gouttieres` | Flexible rod fed into blocked downpipe inlet | Downpipe interior | Flexible rod in pipe + standing water in gutter + expelled plug at pipe base | Ladder + containment sheet at pipe base | `debouchage.*gouttieres` | **READY_FOR_IMPLEMENTATION** |
| R12 | Remplacement gouttières, Pose gouttières | `remplacement_gouttieres` | New PVC sections + cordless drill for brackets | Eave fascia + wall for downpipe clips | New bright unweathered gutter + old stained sections on ground + drill + brackets | Ladder stand-off + gloves | `remplacement.*gouttieres\|pose.*gouttieres` | **READY_FOR_IMPLEMENTATION** |
| R13 | Réparation fuite toiture, Recherche de fuite, Infiltration toiture | `reparation_fuite_toiture` | Localised membrane patch or sealant at failure zone, <6 tiles removed | Pitched or flat, compact zone | Failure evidence (torn underlayer, wet stain) + compact patch, majority of roof intact | Roof ladder + gloves + knee pad | `reparation fuite\|recherche.*fuite\|infiltration.*toiture` | **READY_FOR_IMPLEMENTATION** |
| R14 | Étanchéité toit terrasse, Étanchéité toiture plate, EPDM, PVC, bitume, Réfection d'étanchéité | `etancheite_toit_terrasse` | Membrane rolls across full flat horizontal surface | Horizontal flat roof, parapet around | Parapet wall all around + horizontal surface + membrane rolls (not pitched tiles) | 2 m exclusion from unguarded parapet | `etancheite toit\|etancheite.*plate\|etancheite.*(epdm\|pvc\|bitume)\|refection.*etancheite` | **READY_FOR_IMPLEMENTATION** |
| R15 | Étanchéité balcon, Étanchéité terrasse | `etancheite_balcon` | Membrane/resin on small horizontal balcony slab | Compact balcony/terrace floor | Balcony railing visible + garden/street at low height below | Railing structural check + ventilation | `etancheite balcon\|etancheite terrasse` | **READY_FOR_IMPLEMENTATION** |
| R16 | Réparation solin, Étanchéité cheminée | `reparation_solin_cheminee` | Zinc flashing at chimney base + mortar pointing | Chimney base perimeter (all 4 sides) | Chimney stack as central subject + zinc at its base + rust stains evidence | Harness recommended + roof ladder | `reparation solin\|etancheite cheminee` | **READY_FOR_IMPLEMENTATION** |
| R17 | Réparation Velux | `reparation_velux` | Flashing kit components around Velux frame edge | Roof window frame perimeter | Window frame as subject + corner flashing being pressed in + tiles around undisturbed | Roof ladder + knee pad | `velux` | **READY_FOR_IMPLEMENTATION** |
| R18 | Réparation noue | `reparation_noue` | Zinc valley strip laid in channel between two slopes | Valley channel, tiles lifted both sides | Two slopes meeting + tiles lifted on both sides + zinc in the channel | Roof ladder to side + knee pad | `reparation noue` | **READY_FOR_IMPLEMENTATION** |
| R19 | Réparation rive, Étanchéité acrotère | `reparation_rive_acrotere` | Mortar pointing of gable rive tiles OR sealant at flat roof parapet coping | Gable edge OR parapet coping | For rive: lateral edge of slope + fresh mortar joints. For acrotère: parapet coping element | No leaning over gable end without anchor | `reparation rive\|acrotere` | **READY_FOR_IMPLEMENTATION** |

---

## Résultats RTG-C1 à RTG-C12

| Test | Résultat | Détail |
|---|---|---|
| RTG-C1 parité catalogue | ✓ PASS | 39/39 services couverts, chacun par exactement 1 pattern |
| RTG-C2 schéma complet | ✓ PASS (manuel) | Tous les champs obligatoires présents dans les 19 contrats |
| RTG-C3 service_key uniques | ✓ PASS | 19 clés distinctes |
| RTG-C4 for_regex uniques | ✓ PASS | 19 patterns distincts |
| RTG-C5 aucune collision externe | ✓ PASS | 0 collision sur 133 services hors-cluster |
| RTG-C6 quatre états distincts | ✓ PASS (manuel) | 19 contrats × 4 états différenciés |
| RTG-C7 outils cohérents | ✓ PASS (manuel) | allowed_tools et forbidden_tools non-vides, sans chevauchement |
| RTG-C8 sécurité hauteur | ✓ PASS (manuel) | safety.required non vide sur les 19 contrats ; ladder/harness/scaffold mentionnés pour 14 contrats exposés |
| RTG-C9 paires à risque | ✓ PASS | 8 paires documentées, forbidden_confusions distincts pour chaque paire |
| RTG-C10 compositions compatibles | ✓ PASS (manuel) | Toutes dans {close_detail, medium_intervention, wide_worksite, contextual_overview} ; no-worker → composition large |
| RTG-C11 aucun doublon | ✓ PASS | 19 visual_goal distincts, 19 service_label distincts |
| RTG-C12 source canonique | ✓ PASS | canonical_source, version, contract_count=19, service_count=39 corrects |

---

## Paires à risque — différenciateurs retenus

| Paire | Signal visuel discriminant |
|---|---|
| `demossage_toiture` ↔ `hydrofuge_toiture` | Broom/scraper + thick moss debris vs backpack sprayer + clean tiles + uniform dark rivulets |
| `reparation_fuite_toiture` ↔ `etancheite_toit_terrasse` | Compact patch on pitched or flat vs full horizontal surface with parapet wall all around |
| `nettoyage_gouttieres` ↔ `debouchage_gouttieres` | Open trough + scoop + leaf pile vs flexible rod in downpipe + standing water + expelled plug |
| `nettoyage_gouttieres` ↔ `remplacement_gouttieres` | Old clogged gutter + scoop vs new bright PVC + drill + brackets + old sections on ground |
| `faitage` ↔ `remplacement_tuiles` | Ridge summit + mortar + rubber mallet vs slope + tile lifter + 1–3 tiles |
| `solins` ↔ `reparation_solin_cheminee` | Long narrow strip along straight wall base vs chimney stack perimeter (4 sides) |
| `etancheite_toit_terrasse` ↔ `etancheite_balcon` | Full building flat roof + high parapet (no ground visible) vs compact slab + railing + garden at low height |
| `reparation_noue` ↔ `faitage` | Diagonal valley channel between two sloping surfaces vs horizontal summit ridge line |

---

## Couverture actuelle du pipeline

| Service | Couverture pipeline actuelle |
|---|---|
| Rénovation / réfection / couverture neuve | ROUTED_TO_SPECIFIC_SCENE — `toiture` scene, scenarios `_for: renov\|refect\|couvert.*neuve` |
| Réparation toiture | ROUTED_TO_SPECIFIC_SCENE — `toiture` scene, scenarios `_for: repar` |
| Remplacement tuiles / ardoises | ROUTED_TO_SPECIFIC_SCENE — `toiture` scene, scenarios `_for: rempla.*tuil\|ardois` |
| Charpente, Isolation combles | PARTIAL_CONTEXTE — `toiture` scene, scenarios `_for: charpente\|ferme\|comble` |
| Faîtage | ROUTED_TO_SPECIFIC_SCENE — `toiture` scene, scenarios `_for: faitage` |
| Zinguerie | ROUTED_TO_SPECIFIC_SCENE — `toiture` scene, scenarios `_for: zinguerie\|zinc\|solin` |
| Solins | PARTIAL_CONTEXTE — `toiture` scene, scenarios `_for: zinguerie\|zinc\|solin` (grouped with zinguerie) |
| Démoussage / Nettoyage toiture / mousse | ROUTED_TO_SPECIFIC_SCENE — `nettoyage_toiture` scene, scenarios `_for: demoussa\|nettoy.*mousse\|brossage` |
| Hydrofuge / Traitement / anti-mousse | ROUTED_TO_SPECIFIC_SCENE — `nettoyage_toiture` scene, scenarios `_for: hydrofuge\|traitement\|anti.mousse` |
| Nettoyage / Entretien gouttières | ROUTED_TO_SPECIFIC_SCENE — `nettoyage_gouttieres` scene, scenarios `_for: nettoy\|entretien` |
| Débouchage gouttières | ROUTED_TO_SPECIFIC_SCENE — `nettoyage_gouttieres` scene, scenarios `_for: deboucha\|bouchon` |
| Remplacement / Pose gouttières | ROUTED_TO_SPECIFIC_SCENE — `nettoyage_gouttieres` scene, scenarios `_for: remplace\|pose\|install` |
| Réparation fuite / Infiltration toiture | ROUTED_TO_SPECIFIC_SCENE — `etancheite` scene, scenarios `_for: repar\|tuile.*cass\|fuite.*toit` |
| Recherche de fuite | GENERIC_FALLBACK — `etancheite` scene, no specific `_for` scenario for "recherche de fuite" |
| Étanchéité toit terrasse / plate / EPDM / PVC / bitume | ROUTED_TO_SPECIFIC_SCENE — `etancheite` scene, contexte dispatch (maison/immeuble/commerce) |
| Réfection d'étanchéité | ROUTED_TO_SPECIFIC_SCENE — `etancheite` scene fallback |
| Étanchéité balcon / terrasse | GENERIC_FALLBACK — `etancheite` scene, no specific small-balcony scenario |
| Réparation solin | ROUTED_TO_SPECIFIC_SCENE — `etancheite` scene, scenarios `_for: solin\|cheminee` |
| Réparation Velux | ROUTED_TO_SPECIFIC_SCENE — `etancheite` scene, scenarios `_for: velux\|lucarne` |
| Réparation noue | ROUTED_TO_SPECIFIC_SCENE — `etancheite` scene, scenarios `_for: noue\|vallee` |
| Réparation rive | ROUTED_TO_SPECIFIC_SCENE — `etancheite` scene, scenarios `_for: rive\|gable` |
| Étanchéité cheminée | ROUTED_TO_SPECIFIC_SCENE — `etancheite` scene, scenarios `_for: solin\|cheminee` |
| Étanchéité acrotère | GENERIC_FALLBACK — `etancheite` scene, no specific acrotère scenario |

---

## Notes de sécurité

Ce cluster est le plus exposé du catalogue avec 4 niveaux d'accès distincts :

1. **Depuis le sol** — `demossage_toiture`, `hydrofuge_toiture` (no-worker shots) : protection par tarp uniquement
2. **Échelle** — `nettoyage_gouttieres`, `debouchage_gouttieres`, `remplacement_gouttieres` : stand-off obligatoire, interdiction de monter sur la gouttière
3. **Toit accessible via échelle de couvreur** — `reparation_toiture`, `remplacement_tuiles`, `faitage`, `solins`, `reparation_solin_cheminee`, `reparation_velux`, `reparation_noue`, `reparation_rive_acrotere`, `reparation_fuite_toiture` : roof ladder hooked over ridge, harness conditionnel
4. **Échafaudage** — `renovation_toiture`, `charpente_combles` : scaffold avec garde-corps et filet anti-chute obligatoires
5. **Toit plat** — `etancheite_toit_terrasse` : 2 m d'exclusion du bord non protégé

Interdictions communes à tout le cluster :
- Worker debout sans protection au bord d'un toit incliné
- Échelle posée sans stabilisateur sur une gouttière
- Worker sur la gouttière
- Posture impossible sur pente (atteinte latérale > 60 cm de l'échelle)
- Corde / harnais fixé à un point incohérent (ex. antenne TV)

---

## Confirmations

- **Runtime inchangé** : aucune modification de WORK_SCENES, SITE_REALISM, service-resolver, composition-planner, worker-planner, safety-rules, Vision, retry policy, prompt rewriter
- **Aucune image réelle générée**
- **Aucun service hors-cluster capturé** (RTG-C5 : 0 collision / 133 services)
- **39/39 services cluster couverts** (RTG-C1 : 100 %)
- **19 contrats READY_FOR_IMPLEMENTATION** — 0 NEEDS_CLARIFICATION, 0 REGEX_COLLISION, 0 VISUALLY_TOO_SIMILAR, 0 INCOMPLETE
