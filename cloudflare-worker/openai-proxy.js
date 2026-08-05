/**
 * openai-proxy.js — Cloudflare Worker relayant les appels API du Suivi Avis GMB.
 *
 * Rôle : détenir les clés API côté serveur (variables secrètes) et les fournir aux
 * appels du site, pour qu'aucune clé ne soit jamais exposée dans le code public
 * GitHub Pages. Le navigateur envoie ses requêtes SANS clé ; ce Worker l'injecte
 * et relaie vers l'API cible.
 *
 * Destinations gérées (chaque route a son secret) :
 *   /v1/images/generations  → api.openai.com               (secret OPENAI_API_KEY, header Bearer)
 *   /v1/chat/completions     → api.openai.com               (secret OPENAI_API_KEY, header Bearer)
 *   /gemini/*                → generativelanguage.googleapis (secret GEMINI_API_KEY, ?key=)
 *   /sheets/*                → sheets.googleapis.com         (secret SHEETS_API_KEY, ?key=)
 *
 * Protections anti-abus (URL publique) :
 *   1. Allowlist d'ORIGINE — seuls le site et le dev local sont acceptés.
 *   2. Allowlist de ROUTES — seuls les chemins ci-dessus.
 *   (+ rate limiting Cloudflare et plafonds de dépense côté fournisseurs, voir README.)
 *
 * Déploiement : copier ce fichier dans l'éditeur du dashboard Cloudflare Workers.
 */

const ALLOWED_ORIGINS = [
  'https://bylys.github.io',   // site GitHub Pages
  'http://localhost:3333',     // dev local (serve.py)
  'http://127.0.0.1:3333',
];

// Résout la route à partir du chemin. Renvoie null si non autorisé.
// auth: 'bearer' → en-tête Authorization ; 'query' → paramètre ?key= (APIs Google).
function matchRoute(pathname) {
  if (pathname === '/v1/images/generations' || pathname === '/v1/chat/completions') {
    return { host: 'https://api.openai.com', upstreamPath: pathname, auth: 'bearer', secret: 'OPENAI_API_KEY' };
  }
  if (pathname.startsWith('/gemini/')) {
    return { host: 'https://generativelanguage.googleapis.com', upstreamPath: pathname.slice('/gemini'.length), auth: 'query', secret: 'GEMINI_API_KEY' };
  }
  if (pathname.startsWith('/sheets/')) {
    return { host: 'https://sheets.googleapis.com', upstreamPath: pathname.slice('/sheets'.length), auth: 'query', secret: 'SHEETS_API_KEY' };
  }
  return null;
}

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin':  allow,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age':       '86400',
    'Vary':                         'Origin',
  };
}

function json(status, body, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    // Préflight CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // 1. Allowlist d'origine
    if (!ALLOWED_ORIGINS.includes(origin)) {
      return json(403, { error: 'origin_not_allowed' }, origin);
    }

    if (request.method !== 'GET' && request.method !== 'POST') {
      return json(405, { error: 'method_not_allowed' }, origin);
    }

    // 2. Allowlist de routes
    const url = new URL(request.url);
    const route = matchRoute(url.pathname);
    if (!route) {
      return json(404, { error: 'path_not_allowed', path: url.pathname }, origin);
    }

    const secret = env[route.secret];
    if (!secret) {
      return json(500, { error: 'missing_server_key', which: route.secret }, origin);
    }

    // Construction de la requête amont avec injection de la clé.
    // Query string du client préservée ; corps transmis tel quel pour POST.
    const target = new URL(route.host + route.upstreamPath + url.search);
    const headers = { 'Content-Type': request.headers.get('Content-Type') || 'application/json' };
    if (route.auth === 'bearer') {
      headers['Authorization'] = `Bearer ${secret}`;
    } else {
      target.searchParams.set('key', secret);
    }

    const init = { method: request.method, headers };
    if (request.method === 'POST') init.body = request.body;

    let upstreamResp;
    try {
      upstreamResp = await fetch(target, init);
    } catch (e) {
      return json(502, { error: 'upstream_fetch_failed', detail: String(e) }, origin);
    }

    // Réponse relayée en streaming + en-têtes CORS.
    const respHeaders = new Headers(corsHeaders(origin));
    respHeaders.set('Content-Type', upstreamResp.headers.get('Content-Type') || 'application/json');
    return new Response(upstreamResp.body, { status: upstreamResp.status, headers: respHeaders });
  },
};
