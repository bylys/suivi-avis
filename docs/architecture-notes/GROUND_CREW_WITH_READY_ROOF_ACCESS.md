# GROUND_CREW_WITH_READY_ROOF_ACCESS — Piste future (toiture/étanchéité)

Suggérée après la validation visuelle Crépi façade `051aeb9` — un échafaudage latéral
non utilisé comme poste de travail était visible sans déclencher de rejet.

## Principe

Scène de chantier toiture inclinée "en cours" où **exactement 2 workers restent au sol**
pendant une phase de préparation, logistique ou pause technique. L'accès au toit est
équipé et prêt, mais aucun worker n'est actuellement en hauteur.

Phases réelles représentées : préparation, montée du matériel, pause technique,
organisation de l'intervention.

## Conditions de PASS

| Champ Vision | Attendu |
|---|---|
| `all_workers_stable_on_ground` | `true` |
| `facade_access_ladder_visible` | `true` |
| `facade_ladder_stable` | `true` |
| `facade_ladder_reaches_eaves` | `true` |
| `roof_ladder_hooked_at_ridge` | `true` — OU `scaffold_complete_and_stable=true` |
| `service_specific_materials_visible` | `true` |
| `roof_work_progress_visible` | `true` |
| `access_equipment_physically_coherent` | `true` |

Lorsque `visible_worker_count_on_roof = 0` et `all_workers_stable_on_ground = true` :
**ne pas exiger** `worker_on_roof_ladder_rungs`, harnais visible, câble anti-chute.

## Conditions de REJECT

- Échelle flottante ou mal appuyée contre la façade
- Échelle ne rejoignant pas le débord de toit
- Roof ladder non crochetée au faîtage
- Échafaudage incomplet ou instable
- Worker partiellement sur le toit sans protection visible
- Aucune preuve de travail toiture (simple livraison générique)
- Matériel sans rapport avec le service demandé

## Contrainte critique

Ne doit **jamais** servir de faux PASS si aucune preuve visuelle du service toiture
n'est visible. `roof_work_progress_visible=true` est obligatoire.

## Services candidats

Toiture inclinée (tuiles, ardoises, zinc), Étanchéité inclinée — uniquement pour
`state_level=encours`. Non applicable à `debut` ou `final`.

## Statut

Piste documentée — **pas encore implémentée**. À traiter dans une passe dédiée
services toiture/étanchéité inclinée.
