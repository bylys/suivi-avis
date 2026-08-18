# CLAUDE.md — Suivi Avis GMB / Générateur d'images Allo Chantiers

## Présentation du projet

Application web **statique, côté client** (HTML/CSS/JS vanilla, ES modules, pas de framework, pas de bundler).
Deux usages principaux :
1. **Suivi d'avis Google (GMB)** — tableau de bord des fiches Google My Business, données dans Supabase.
2. **Générateur d'images de chantier** — photos réalistes de chantiers BTP via gpt-image-2 (OpenAI).

Repo GitHub : `https://github.com/bylys/suivi-avis.git` — branche `main`.
Serveur local : `python3 -m http.server 3333` (ou `python serve.py`).

---

## Pile technique

- **Front** : HTML/CSS/JS vanilla, ES modules (`import`/`export`), pas de bundler
- **Données** : Supabase (REST API directe, pas de SDK)
- **Génération d'images** : `gpt-image-2` + réécriture prompt `gpt-4.1` + contrôle Vision `gpt-4o`
- **Clés OpenAI** : jamais dans le client — elles vivent dans un **Cloudflare Worker** proxy (`window.OPENAI_PROXY_URL`)
- **Automatisations** : GitHub Actions (cron) pour check statuts, planning, archivage, Slack
- **Données Google** : SerpAPI (pas de scraping)

---

## Structure clé

```
index.html          — point d'entrée (écran mot de passe + app)
app.js              — gros fichier applicatif (~190 Ko)
style.css
src/image-generation/
  pipeline/         — run-batch.js, generate-image.js, state.js
  prompt/           — scene-builder.js (buildDallePromptV2)
  planning/         — batch-planner.js
  resolution/       — scene-resolver.js
  validation/       — scene-validator.js, batch-validator.js
  safety/           — safety-rules.js, worker-rules.js, worker-validator.js  ← GATES DE SÉCURITÉ
  services/         — scènes par métier (index.js + fichiers par métier)
  config/           — image-mode.js (production/validation)
  debug/            — suites de tests no-cost
docs/
  service-coverage-audit.json   — audit de couverture des services
scripts/
  archive_avis.py   — archivage automatique avis > 3 mois
.github/workflows/  — cron automations (check_statuts, generate_planning, archive_avis, slack…)
cloudflare-worker/  — proxy OpenAI (déployé séparément sur Cloudflare)
```

---

## Fichiers à NE JAMAIS committer / déployer

- `config.local.js` — clés API (déjà dans `.gitignore`)
- `*.csv` — données clients réelles (déjà dans `.gitignore`)

---

## Supabase — tables principales

| Table | Contenu |
|---|---|
| `avis` | Avis récents (< 3 mois) |
| `avis_archives` | Avis archivés (> 3 mois), même structure |
| `stats_mensuelles` | Chiffres agrégés par mois/opérateur/fiche (pour le dashboard) |
| `fiches` | Fiches Google My Business |
| `planning` | Planning de génération par VA |
| `gmails` | Pool de comptes Gmail des VA |

---

## Pipeline image — fonctionnement

```
buildDallePromptV2 (scene-builder)
  → _planGlobalBatch / _rebalanceGlobalBatchPlan (batch-planner)
  → generateImageOnly (rewriter gpt-4.1 + gpt-image-2)
  → checkImageSafety (gpt-4o Vision)
  → gates reject_conditions
```

**Payload gpt-image-2 :** `model: gpt-image-2, n: 1, size: 1536x1024, quality: high, output_format: jpeg, output_compression: 85`

**Deux modes :**
- `production` : `maxImageAttempts=3`, timeout 300s
- `validation` : `maxImageAttempts=1` (fast-fail), timeout 300s

`window._setImageGenerationMode('validation')` pour les tests.

**CONCURRENCY=3** — calibré volontairement (gpt-image-2 ~125s/image, bottleneck côté OpenAI provider).

---

## Contraintes ABSOLUES — ne jamais enfreindre

- **Ne jamais assouplir ou désactiver une gate de sécurité** pour faire passer une image
- **Ne jamais modifier** : EPDM, PVC ou Bitume gates ; le système global de défauts caméra ; la gate `Étanchéité inclinée`
- **La simple présence d'une échelle de toit ne suffit jamais à considérer l'accès comme sécurisé**
- **Services DEFERRED** : Terrasse béton, Ouverture dans mur, Percement mur, Muret, Construction mur, Décaissement — intentionnellement non générés (gpt-image-2 échoue à la génération, pas un bug de code)
- **0 appel API réel** sans lancement explicite de micro-test
- **Pas de commit** sans validation humaine visuelle

---

## Règles de sécurité par métier

### FORBIDDEN_SAFETY_BY_METIER (pré-génération, dans le prompt)

**Toiture**
- Minimum 2 ouvriers obligatoires
- Ouvrier 1 : échelle de toit crochetée sur le faîtage / scaffold / MEWP + harnais connecté
- Ouvrier 2 : pied d'accès ou position de sécurité, PAS sous la zone de chute
- Jamais : ouvrier debout librement sur tuiles, harnais sans ancrage, seul actif, palette industrielle sur pente

**Nettoyage toiture**
- Même règle 2 ouvriers + harnais connecté visible
- Jamais : sac à dos/bretelles confondus avec harnais, ouvrier seul, lance télescopique depuis le jardin

**Nettoyage gouttières**
- Jamais : ouvrier debout sur caniveau gouttière, sur dernier barreau, penché dangereusement, accès improvisé (chaise, caisse)
- Autorisé : échelle simple sans stabilisateur, 1 seul ouvrier

**Étanchéité**
- Jamais : ouvrier sur acrotère, chalumeau vers ouvrier/membrane libre, rouleau bloquant la trappe, ouvrier à < 2m du bord sans harnais
- Sol/terrasse/balcon : pas de harnais requis

**Ravalement**
- Scaffold > 2m : garde-corps obligatoire côté vide
- Jamais : ouvrier penché au-delà du garde-corps dans le vide

**Charpente**
- Jamais : échelle de toit comme plateforme structurelle, ouvrier en équilibre sur chevrons/liteaux, ouvrier seul portant pièce lourde

**Élagage**
- Grimpeur en arbre : harnais + corde visibles et connectés
- Jamais : personne dans la zone de chute d'une branche en cours de coupe

**Abattage**
- Opérateur à côté du tronc, jamais dans la zone de chute frontale
- Jamais : tronçonneuse au-dessus de la tête, spectateur de l'autre côté du tronc

**Terrassement**
- Jamais : personne dans la tranchée sous le godet, entre la cabine rotative et le bord
- Signaleur au sol si engin près d'une structure

**Maçonnerie**
- Jamais : ouvrier sur mur inachevé à > 1,5m sans scaffold
- Tous les ouvriers au sol à côté du mur (max 1,0–1,2m en construction parpaing)

**Vitrier**
- Jamais : mains nues sur tranche grande vitre, vitre en équilibre sans berceau, verre cassé + pieds nus

**Dépannage auto**
- Hors chaussée obligatoire, triangle de signalisation visible
- Jamais : personne entre véhicule et circulation, câbles traversant la chaussée, véhicule levé sans chandelle

**Paysagiste**
- Jamais : tondeuse sur pente raide (risque basculement), tronçonneuse sans protection jambes

**Nettoyage extérieur**
- Jamais : jet haute pression vers une personne, pieds nus pendant nettoyage, dans eau profonde

---

## Gates visuelles par service

| Service | Ce qui est vérifié |
|---|---|
| Taille de haie | Taille-haie visible, haie présente, ouvrier actif |
| Réparation toiture | Échelle de toit crochetée sur le faîtage (non appuyée contre la gouttière) |
| Nettoyage gouttières | Gouttière visible et accessible |
| Ravalement de façade | Scaffold visible, enduit/crépi en cours d'application |
| Mur parpaing | Mur en parpaings béton gris, ouvrier au sol, truelle/mortier visible |
| Mur brique | Briques rouges/orangées visibles, mortier entre les joints |
| Rejointoiement générique | Joints visibles, pistolet à joints ou truelle, pas de peinture sur façade |
| Rejointoiement pierre | Mur en pierres naturelles, joints ciblés |
| Coulage dalle | Béton liquide visible, 2 ouvriers min, jamais ouvrier dans le béton frais |
| Dalle béton | Ferraillage ou préparation de dalle, ouvrier au sol |
| Fondation / Semelle béton | Fouilles visibles, ferraillage ou béton en fondation |
| Ferraillage | Armatures métalliques, fil de ligature, ouvrier assemblant |
| Escalier béton | Coffrage d'escalier visible, marches en cours |
| Réparation fissure | Fissure visible sur façade/mur, matériel de rebouchage |
| Traitement anti-mousse | Mousse/lichen sur tuiles, pas d'ouvrier debout librement sur pente |
| Étanchéité toit-terrasse | Surface plate, membrane visible |
| Linteau | Ouverture dans le mur, linteau sur 2 appuis, étaiement visible |

---

## Règles de composition (toujours actives)

- **80% des photos** : vue "client" (depuis jardin/allée/rue, smartphone à hauteur de poitrine)
- **15%** : vue "artisan" (photo de chantier normale)
- **5%** : vue "voisin" (légèrement de côté, derrière une clôture)
- **Lumière** : filtrée selon météo de la fiche
- **Présence ouvriers selon état** : début=65%, en cours=50%, quasi-fini=30%, final=7%
- **Style photo** : smartphone Android mid-range (Samsung), mode auto, légère surexposition, léger flou de mouvement sur l'ouvrier, bruit numérique dans les ombres, bords légèrement flous, couleurs légèrement délavées — jamais HDR, jamais trop propre

---

## VA (opérateurs)

Kevin, Fifaliana, Aina, Kintana, Korail, Anjara

---

## Archivage automatique

- Cron GitHub Actions chaque **dimanche 3h UTC** (`archive_avis.yml`)
- Avis > 3 mois → déplacés dans `avis_archives`, stats agrégées dans `stats_mensuelles`
- Dashboard combine récents + archives automatiquement
- Bouton "Voir les détails" dans la liste des avis pour accéder aux mois archivés
