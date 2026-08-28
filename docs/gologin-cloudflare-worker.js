/**
 * Code COMPLET du Cloudflare Worker (sans OpenAI, avec Gemini, Sheets et GoLogin)
 * À remplacer dans votre Cloudflare Worker Dashboard : gmb-openai-proxy.m-payot76.workers.dev
 */

const ALLOWED_ORIGINS = [
  'https://bylys.github.io',
  'http://localhost:3333',
  'http://127.0.0.1:3333',
];

function isOriginAllowed(origin) {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.github\.io$/.test(origin)) return true;
  return false;
}

function matchRoute(pathname) {
  if (pathname.startsWith('/gemini/')) {
    return { host: 'https://generativelanguage.googleapis.com', upstreamPath: pathname.slice('/gemini'.length), auth: 'query', secret: 'GEMINI_API_KEY' };
  }
  if (pathname.startsWith('/sheets/')) {
    return { host: 'https://sheets.googleapis.com', upstreamPath: pathname.slice('/sheets'.length), auth: 'query', secret: 'SHEETS_API_KEY' };
  }
  if (pathname.startsWith('/gologin')) {
    const sub = pathname.slice('/gologin'.length);
    return { host: 'https://api.gologin.com', upstreamPath: sub || '/browser', auth: 'bearer', secret: 'GOLOGIN_API_KEY' };
  }
  return null;
}

function corsHeaders(origin) {
  const allow = isOriginAllowed(origin) ? (origin || '*') : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
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

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (!isOriginAllowed(origin)) {
      return json(403, { error: 'origin_not_allowed' }, origin);
    }
    if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      return json(405, { error: 'method_not_allowed' }, origin);
    }

    const url = new URL(request.url);
    const route = matchRoute(url.pathname);
    if (!route) {
      return json(404, { error: 'path_not_allowed', path: url.pathname }, origin);
    }

    const secret = env[route.secret] || (route.secret === 'GOLOGIN_API_KEY' ? env['GOLOGIN_API_TOKEN'] : null);
    if (!secret) {
      return json(500, { error: 'missing_server_key', which: route.secret }, origin);
    }

    const target = new URL(route.host + route.upstreamPath + url.search);
    const headers = { 'Content-Type': request.headers.get('Content-Type') || 'application/json' };
    if (route.auth === 'bearer') {
      headers['Authorization'] = `Bearer ${secret}`;
    } else {
      target.searchParams.set('key', secret);
    }

    const init = { method: request.method, headers };
    if (request.method !== 'GET' && request.method !== 'HEAD') init.body = request.body;

    let upstreamResp;
    try {
      upstreamResp = await fetch(target, init);
    } catch (e) {
      return json(502, { error: 'upstream_fetch_failed', detail: String(e) }, origin);
    }

    const respHeaders = new Headers(corsHeaders(origin));
    respHeaders.set('Content-Type', upstreamResp.headers.get('Content-Type') || 'application/json');
    return new Response(upstreamResp.body, { status: upstreamResp.status, headers: respHeaders });
  },
};
