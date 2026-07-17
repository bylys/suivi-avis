# Audit des contrats visuels carrelage

## Résultats CV1–CV12

- CV1 — 9 contrats : 9/9 ✔
- CV2 — parité SERVICE_CATALOG : ✔
- CV3 — schéma complet : ✔ (0 manquants)
- CV4 — service_key uniques : ✔
- CV5 — regex 9/9 carrelage : ✔
- CV6 — aucune collision intra-carrelage : ✔
- CV7 — aucun service non-carrelage capturé : ✔ (0 collisions)
- CV8 — trois états distincts : ✔
- CV9 — paires à risque différenciées : ✔
- CV10 — outils cohérents : ✔
- CV11 — workers et sécurité cohérents : ✔
- CV12 — compositions cohérentes : ✔

## Matrice des contrats

| Service | Action distincte | Surface | Contexte | États distincts | Regex unique | Statut |
|---------|-----------------|---------|----------|----------------|------------|--------|
| Pose carrelage sol | ✔ | ✔ | ✔ | ✔ | ✔ | READY_FOR_IMPLEMENTATION |
| Pose carrelage mural | ✔ | ✔ | ✔ | ✔ | ✔ | READY_FOR_IMPLEMENTATION |
| Faïence salle de bain | ✔ | ✔ | ✔ | ✔ | ✔ | READY_FOR_IMPLEMENTATION |
| Faïence cuisine | ✔ | ✔ | ✔ | ✔ | ✔ | READY_FOR_IMPLEMENTATION |
| Carrelage terrasse extérieure | ✔ | ✔ | ✔ | ✔ | ✔ | READY_FOR_IMPLEMENTATION |
| Dallage extérieur | ✔ | ✔ | ✔ | ✔ | ✔ | READY_FOR_IMPLEMENTATION |
| Pose pierre naturelle | ✔ | ✔ | ✔ | ✔ | ✔ | READY_FOR_IMPLEMENTATION |
| Réfection joint | ✔ | ✔ | ✔ | ✔ | ✔ | READY_FOR_IMPLEMENTATION |
| Réfection carrelage | ✔ | ✔ | ✔ | ✔ | ✔ | READY_FOR_IMPLEMENTATION |

## Collisions cross-métier identifiées

Aucune collision cross-métier.

## Note de génération

Généré par `scripts/audit_carrelage_visual_contracts.py`.
Aucun WORK_SCENES / SITE_REALISM / prompt modifié.