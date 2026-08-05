/**
 * config/openai-endpoint.js — résolution de l'endpoint OpenAI.
 *
 * Par défaut : appels directs vers https://api.openai.com (dev local avec clé collée).
 * Si un proxy est configuré (Cloudflare Worker), toutes les requêtes OpenAI y transitent
 * et la clé n'a plus besoin d'exister côté navigateur.
 *
 * Source de vérité de l'URL du proxy (dans l'ordre de priorité) :
 *   1. window._APP_CONFIG.openai_proxy   — override local via config.local.js (optionnel)
 *   2. window.OPENAI_PROXY_URL           — constante publique posée dans index.html (prod)
 *
 * L'URL du proxy n'est PAS un secret : la clé OpenAI vit à l'intérieur du Worker.
 */

const OPENAI_BASE = 'https://api.openai.com';

// Lit la base du proxy (chaîne vide = proxy désactivé → appels directs).
function proxyBase() {
  if (typeof window === 'undefined') return '';
  const fromConfig = window._APP_CONFIG && window._APP_CONFIG.openai_proxy;
  const fromGlobal = window.OPENAI_PROXY_URL;
  return String(fromConfig || fromGlobal || '').replace(/\/+$/, '');
}

// true si un proxy est actif (⇒ pas besoin de clé côté navigateur).
function isProxyEnabled() {
  return !!proxyBase();
}

// Réécrit une URL api.openai.com vers le proxy quand il est actif.
// Toute autre URL (ou proxy inactif) est renvoyée telle quelle.
function resolveOpenAIUrl(url) {
  const base = proxyBase();
  if (base && typeof url === 'string' && url.startsWith(OPENAI_BASE)) {
    return base + url.slice(OPENAI_BASE.length);
  }
  return url;
}

export { proxyBase, isProxyEnabled, resolveOpenAIUrl, OPENAI_BASE };
