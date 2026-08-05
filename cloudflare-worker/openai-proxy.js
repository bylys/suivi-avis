/**
 * openai-proxy.js — Cloudflare Worker relayant les appels OpenAI du Suivi Avis GMB.
 *
 * Rôle : détenir la clé OpenAI côté serveur (variable secrète OPENAI_API_KEY) et
 * la fournir aux appels du site, pour qu'aucune clé ne soit jamais exposée dans
 * le code public GitHub Pages.
 *
 * Le navigateur envoie ses requêtes SANS clé réelle ; ce Worker injecte
 * `Authorization: Bearer <OPENAI_API_KEY>` et relaie vers api.openai.com.
 *
 * Protections anti-abus (le Worker est une URL publique) :
 *   1. Allowlist d'ORIGINE  — seuls le site et le dev local sont acceptés.
 *   2. Allowlist de CHEMINS — seuls les 2 endpoints réellement utilisés.
 *   (+ rate limiting Cloudflare et plafond de dépense OpenAI, voir README.)
 *
 * Déploiement : copier ce fichier dans l'éditeur du dashboard Cloudflare Workers.
 * Aucune dépendance, aucun build.
 */

const ALLOWED_ORIGINS = [
  'https://bylys.github.io',   // site GitHub Pages
  'http://localhost:3333',     // dev local (serve.py)
  'http://127.0.0.1:3333',
];

const ALLOWED_PATHS = [
  '/v1/images/generations',    // génération d'images (gpt-image-2 / gpt-image-1)
  '/v1/chat/completions',      // vision (safety-check) + réécriture de prompt
];

const UPSTREAM = 'https://api.openai.com';

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin':  allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    if (request.method !== 'POST') {
      return json(405, { error: 'method_not_allowed' }, origin);
    }

    // 2. Allowlist de chemins
    const url = new URL(request.url);
    if (!ALLOWED_PATHS.includes(url.pathname)) {
      return json(404, { error: 'path_not_allowed', path: url.pathname }, origin);
    }

    if (!env.OPENAI_API_KEY) {
      return json(500, { error: 'missing_server_key' }, origin);
    }

    // Relai vers OpenAI avec injection de la clé secrète.
    // Le corps est transmis tel quel — aucune transformation.
    let upstreamResp;
    try {
      upstreamResp = await fetch(UPSTREAM + url.pathname, {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
          'Content-Type':  'application/json',
        },
        body: request.body,
      });
    } catch (e) {
      return json(502, { error: 'upstream_fetch_failed', detail: String(e) }, origin);
    }

    // Réponse relayée en streaming (évite de bufferiser les images) + en-têtes CORS.
    const headers = new Headers(corsHeaders(origin));
    headers.set('Content-Type', upstreamResp.headers.get('Content-Type') || 'application/json');
    return new Response(upstreamResp.body, { status: upstreamResp.status, headers });
  },
};
