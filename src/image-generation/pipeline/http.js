/**
 * pipeline/http.js — Phase 6 shadow copy (source active : app.js)
 * Helpers réseau partagés : fetchWithTimeout, readResponseOnce.
 * Verbatim — app.js lignes 13647–13662.
 * Ne pas modifier avant le cutover validé.
 *
 * Seul ajout post-cutover : resolveOpenAIUrl() redirige api.openai.com vers le
 * Worker Cloudflare quand un proxy est configuré. Corps de requête et logique
 * de génération inchangés ; proxy inactif ⇒ comportement strictement identique.
 */
import { resolveOpenAIUrl } from '../config/openai-endpoint.js';

// ─── fetchWithTimeout ─────────────────────────────────────────────────────────
// Verbatim — app.js lines 13647–13656 (seule la cible de fetch passe par resolveOpenAIUrl)
async function fetchWithTimeout(url, options = {}, timeoutMs = 120000) {
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(resolveOpenAIUrl(url), { ...options, signal: controller.signal });
  } catch(e) {
    if (e.name === 'AbortError') throw new Error(`Request timeout after ${timeoutMs / 1000}s: ${url.split('/').pop()}`);
    throw e;
  } finally { clearTimeout(timeoutId); }
}

// ─── readResponseOnce ─────────────────────────────────────────────────────────
// Verbatim — app.js lines 13657–13662
async function readResponseOnce(response) {
  const raw = await response.text();
  let data = null;
  try { if (raw) data = JSON.parse(raw); } catch {}
  return { ok: response.ok, status: response.status, raw, data };
}

export { fetchWithTimeout, readResponseOnce };
