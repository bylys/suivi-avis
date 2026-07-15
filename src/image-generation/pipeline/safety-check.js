/**
 * pipeline/safety-check.js — Phase 6 shadow copy (source active : app.js)
 * Contrôle Vision post-génération.
 * Deux responsabilités séparées :
 *   - buildVisionSafetyRequest : pure, prépare url/headers/body sans réseau
 *   - checkImageSafety          : injectable fetchImpl/readResponseImpl pour tests
 * Le pipeline actif continue d'utiliser _checkImageSafety legacy dans app.js.
 * Ne pas modifier avant le cutover validé.
 */

import { SAFETY_CHECK_RULES } from '../safety/safety-rules.js';

// ─── buildVisionSafetyRequest ─────────────────────────────────────────────────
// Pure — verbatim params from _checkImageSafety (app.js lines 13689–13701).
// Returns null if the métier has no safety rule (caller must guard).
function buildVisionSafetyRequest(matchedKey, b64, apiKey) {
  const prompt = SAFETY_CHECK_RULES[matchedKey];
  if (!prompt) return null;
  return {
    url:     'https://api.openai.com/v1/chat/completions',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model:      'gpt-4o',
      max_tokens: 200,
      messages:   [{ role: 'user', content: [
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${b64}`, detail: 'low' } },
        { type: 'text', text: prompt },
      ]}],
      response_format: { type: 'json_object' },
    }),
    timeout: 60000,
  };
}

// ─── checkImageSafety ─────────────────────────────────────────────────────────
// Same behaviour as _checkImageSafety — app.js lines 13685–13710
// fetchImpl    : replaces _fetchWithTimeout
// readResponseImpl : replaces _readResponseOnce
async function checkImageSafety(b64, matchedKey, apiKey, { fetchImpl, readResponseImpl }) {
  const prompt = SAFETY_CHECK_RULES[matchedKey];
  if (!prompt) return { safe: true };
  try {
    const req    = buildVisionSafetyRequest(matchedKey, b64, apiKey);
    const resp   = await fetchImpl(req.url, { method: 'POST', headers: req.headers, body: req.body }, req.timeout);
    const parsed = await readResponseImpl(resp);
    if (!parsed.ok || !parsed.data) return { safe: null, checkFailed: true, reason: `HTTP ${parsed.status}` };
    const raw = parsed.data.choices?.[0]?.message?.content;
    let obj;
    try { obj = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return { safe: null, checkFailed: true, reason: 'JSON parse error' }; }
    if (obj?.safe == null) return { safe: null, checkFailed: true, reason: 'missing safe field' };
    return { safe: obj.safe, severity: obj.severity || 'ok', reason: obj.reason || '' };
  } catch(e) { return { safe: null, checkFailed: true, reason: e.message }; }
}

export { buildVisionSafetyRequest, checkImageSafety };
