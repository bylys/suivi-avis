# Proxy OpenAI — Cloudflare Worker

Ce Worker détient la clé OpenAI **côté serveur** pour qu'elle ne soit jamais exposée
dans le code public du site (GitHub Pages). Le site l'appelle à la place d'`api.openai.com`.

Aucun outil à installer : tout se fait dans le **dashboard web** Cloudflare.

## Déploiement (≈ 10 min)

### 1. Créer le Worker
1. Va sur https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Create Worker**.
2. Donne-lui un nom, ex. `gmb-openai-proxy`. Clique **Deploy** (code par défaut, on le remplace juste après).
3. Clique **Edit code** → **efface tout** → **colle** le contenu de [`openai-proxy.js`](./openai-proxy.js) → **Deploy**.
4. Note l'URL affichée, du type : `https://gmb-openai-proxy.<ton-sous-domaine>.workers.dev`.

### 2. Ajouter la clé OpenAI en secret
1. Dans le Worker → **Settings** → **Variables and Secrets**.
2. **Add** → type **Secret** → nom exact : `OPENAI_API_KEY` → valeur : ta clé `sk-...` → **Save**.

> La clé est stockée chiffrée côté Cloudflare. Elle n'apparaît jamais dans le code ni côté navigateur.

### 3. Plafond de dépense OpenAI (protection décisive)
1. https://platform.openai.com/settings/organization/limits
2. Fixe une **limite mensuelle** (« Budget » / « Hard limit ») cohérente avec ton usage.
   → Même en cas d'abus, la casse est bornée à ce montant.

### 4. (Recommandé) Rate limiting Cloudflare
Dashboard → ton domaine/Worker → **Security** → **Rate limiting rules** → limite p.ex.
60 requêtes / minute / IP sur la route du Worker.

## Vérifier que le Worker répond

Depuis un terminal (remplace l'URL) — un `Origin` non autorisé DOIT être refusé :

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  -H "Origin: https://exemple-interdit.com" \
  https://gmb-openai-proxy.<ton-sous-domaine>.workers.dev/v1/chat/completions
# attendu : 403
```

## Brancher le site

Une fois l'URL en main, on la pose dans `index.html` :

```html
<script>window.OPENAI_PROXY_URL='https://gmb-openai-proxy.<ton-sous-domaine>.workers.dev';</script>
```

Effet : le site route tous les appels OpenAI par le Worker, la barre de clé se masque
automatiquement, et les VAs n'ont **plus rien à saisir**.

## Sécurité — ce que le Worker garantit / ne garantit pas

| Protection | Effet |
|---|---|
| Clé en secret Cloudflare | La clé n'est jamais dans le code public ni le navigateur ✅ |
| Allowlist d'origine | Bloque l'usage depuis un autre site (navigateur) ✅ |
| Allowlist de chemins | Seuls `/v1/images/generations` et `/v1/chat/completions` passent ✅ |
| Rate limiting + plafond OpenAI | Bornent l'abus résiduel (clients non-navigateur qui falsifient l'`Origin`) ✅ |

En cas de souci : change le secret `OPENAI_API_KEY` (rotation) ou supprime le Worker — coupure immédiate.
