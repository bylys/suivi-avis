/**
 * Extraits à ajouter dans votre Cloudflare Worker (ex: gmb-openai-proxy.m-payot76.workers.dev)
 * 
 * 1. Ajouter le Secret dans Cloudflare Worker Dashboard -> Settings -> Variables -> Environment Variables :
 *    Secret Name : GOLOGIN_API_TOKEN
 *    Secret Value : <votre_token_api_gologin>
 * 
 * 2. Code du routeur Cloudflare Worker :
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // En-têtes CORS
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // --- ROUTE GOLOGIN ---
    if (url.pathname.startsWith('/gologin')) {
      const gologinPath = url.pathname.replace(/^\/gologin/, '') || '/browser';
      const targetUrl = `https://api.gologin.com${gologinPath}`;

      const headers = new Headers(request.headers);
      headers.set('Content-Type', 'application/json');
      if (env.GOLOGIN_API_TOKEN) {
        headers.set('Authorization', `Bearer ${env.GOLOGIN_API_TOKEN}`);
      }

      try {
        const response = await fetch(targetUrl, {
          method: request.method,
          headers: headers,
          body: request.method !== 'GET' ? await request.text() : undefined,
        });

        const resHeaders = new Headers(response.headers);
        Object.keys(corsHeaders).forEach(k => resHeaders.set(k, corsHeaders[k]));

        return new Response(await response.text(), {
          status: response.status,
          headers: resHeaders,
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response('Not Found', { status: 404 });
  }
};
