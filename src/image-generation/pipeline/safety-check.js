/**
 * pipeline/safety-check.js — Phase 6 shadow copy (source active : app.js)
 * Contrôle Vision post-génération.
 * Deux responsabilités séparées :
 *   - buildVisionSafetyRequest : pure, prépare url/headers/body sans réseau
 *   - checkImageSafety          : injectable fetchImpl/readResponseImpl pour tests
 * Le pipeline actif continue d'utiliser _checkImageSafety legacy dans app.js.
 * Ne pas modifier avant le cutover validé.
 */

import { SAFETY_CHECK_RULES, SERVICE_VISUAL_GATE_RULES, _SERVICE_GATE_ALIASES } from '../safety/safety-rules.js';

// Normalize travaux string before alias lookup — same logic as resolveAlias in gate tests.
// Alias keys are lowercase + NFD-stripped + smart-quote→ASCII. Raw travaux can arrive with
// accents and mixed case (e.g. "Étanchéité terrasse"), which would otherwise miss the alias.
function _normalizeForGate(svc) {
  return svc.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/['']/g, "'");
}

// ─── buildVisionSafetyRequest ─────────────────────────────────────────────────
// Pure — verbatim params from _checkImageSafety (app.js lines 13689–13701).
// Returns null if the métier has no safety rule (caller must guard).
// expectedWorkerCount: when >= 2, augments the prompt to verify worker count.
function buildVisionSafetyRequest(matchedKey, b64, apiKey, expectedWorkerCount = 0, matchedService = '') {
  const basePrompt = SAFETY_CHECK_RULES[matchedKey];
  if (!basePrompt) return null;
  const workerInstruction = (Number.isInteger(expectedWorkerCount) && expectedWorkerCount >= 1)
    ? `\n\nADDITIONAL MANDATORY CHECK — WORKER COUNT: Count the number of clearly visible professional workers in the image (${expectedWorkerCount} expected). You MUST add these fields to your JSON: "expected_worker_count": ${expectedWorkerCount}, "visible_worker_count": <integer you counted>, "worker_count_match": <true if visible_worker_count >= ${expectedWorkerCount}, else false>. If worker_count_match is false, set safe=false, severity="critical", reason="worker_count_mismatch".`
    : '';
  const _normSvc = _normalizeForGate(matchedService);
  const _effectiveService = _SERVICE_GATE_ALIASES[_normSvc] || matchedService;
  const serviceGateInstruction = SERVICE_VISUAL_GATE_RULES[_effectiveService]?.vision_instruction ?? '';
  const prompt = basePrompt + workerInstruction + serviceGateInstruction;
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
// fetchImpl          : replaces _fetchWithTimeout
// readResponseImpl   : replaces _readResponseOnce
// expectedWorkerCount: when >= 2, Vision also verifies worker count
async function checkImageSafety(b64, matchedKey, apiKey, { fetchImpl, readResponseImpl, expectedWorkerCount = 0, matchedService = '' }) {
  const basePrompt = SAFETY_CHECK_RULES[matchedKey];
  if (!basePrompt) return { safe: true };
  try {
    const req    = buildVisionSafetyRequest(matchedKey, b64, apiKey, expectedWorkerCount, matchedService);
    const resp   = await fetchImpl(req.url, { method: 'POST', headers: req.headers, body: req.body }, req.timeout);
    const parsed = await readResponseImpl(resp);
    if (!parsed.ok || !parsed.data) return { safe: null, checkFailed: true, reason: `HTTP ${parsed.status}` };
    const raw = parsed.data.choices?.[0]?.message?.content;
    let obj;
    try { obj = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return { safe: null, checkFailed: true, reason: 'JSON parse error' }; }
    if (obj?.safe == null) return { safe: null, checkFailed: true, reason: 'missing safe field' };
    const workerCountMismatch = (Number.isInteger(expectedWorkerCount) && expectedWorkerCount >= 1) && obj.worker_count_match === false;
    if (workerCountMismatch) {
      return {
        safe: false, severity: 'critical', reason: 'worker_count_mismatch',
        visible_worker_count: obj.visible_worker_count ?? null,
        worker_count_match:   false,
      };
    }
    // Service visual gate — evaluated after worker count (worker count takes priority)
    const _normSvc2 = _normalizeForGate(matchedService);
    const _gateService = _SERVICE_GATE_ALIASES[_normSvc2] || matchedService;
    const gate = SERVICE_VISUAL_GATE_RULES[_gateService];
    if (gate) {
      for (const cond of gate.reject_conditions) {
        // not_exactly_true: fail-closed — absent or false both trigger rejection
        const matches = cond.not_exactly_true ? obj[cond.field] !== true : obj[cond.field] === cond.value;
        if (matches) {
          return {
            safe: false, severity: 'critical', reason: cond.reason,
            visible_worker_count:          obj.visible_worker_count          ?? null,
            hedge_visible:                 obj.hedge_visible                 ?? null,
            worker_on_roof:                obj.worker_on_roof                ?? null,
            service_visual_match:          obj.service_visual_match          ?? null,
            gutter_visible:                obj.gutter_visible                ?? null,
            cleaning_action_visible:       obj.cleaning_action_visible       ?? null,
            professional_ladder_visible:   obj.professional_ladder_visible   ?? null,
            ladder_stable:                 obj.ladder_stable                 ?? null,
            worker_in_mewp_basket_visible: obj.worker_in_mewp_basket_visible ?? null,
            ground_worker_visible:         obj.ground_worker_visible         ?? null,
            workers_spatially_separated:   obj.workers_spatially_separated   ?? null,
            treatment_application_visible: obj.treatment_application_visible ?? null,
          };
        }
      }
    }
    return {
      safe:                          obj.safe,
      severity:                      obj.severity || 'ok',
      reason:                        obj.reason   || '',
      visible_worker_count:          obj.visible_worker_count          ?? null,
      worker_count_match:            obj.worker_count_match            ?? null,
      hedge_visible:                 obj.hedge_visible                 ?? null,
      worker_on_roof:                obj.worker_on_roof                ?? null,
      service_visual_match:          obj.service_visual_match          ?? null,
      gutter_visible:                obj.gutter_visible                ?? null,
      cleaning_action_visible:       obj.cleaning_action_visible       ?? null,
      professional_ladder_visible:   obj.professional_ladder_visible   ?? null,
      ladder_stable:                 obj.ladder_stable                 ?? null,
      worker_in_mewp_basket_visible: obj.worker_in_mewp_basket_visible ?? null,
      ground_worker_visible:         obj.ground_worker_visible         ?? null,
      workers_spatially_separated:   obj.workers_spatially_separated   ?? null,
      treatment_application_visible: obj.treatment_application_visible ?? null,
    };
  } catch(e) { return { safe: null, checkFailed: true, reason: e.message }; }
}

export { buildVisionSafetyRequest, checkImageSafety };
