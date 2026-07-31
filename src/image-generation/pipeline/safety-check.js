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
function buildVisionSafetyRequest(matchedKey, b64, apiKey, expectedWorkerCount = 0, matchedService = '', accessConfiguration = null) {
  const basePrompt = SAFETY_CHECK_RULES[matchedKey];
  if (!basePrompt) return null;
  const workerInstruction = (Number.isInteger(expectedWorkerCount) && expectedWorkerCount >= 1)
    ? `\n\nADDITIONAL MANDATORY CHECK — WORKER COUNT: Count the number of clearly visible professional workers in the image (${expectedWorkerCount} expected). You MUST add these fields to your JSON: "expected_worker_count": ${expectedWorkerCount}, "visible_worker_count": <integer you counted>, "worker_count_match": <true if visible_worker_count >= ${expectedWorkerCount}, else false>. If worker_count_match is false, set safe=false, severity="critical", reason="worker_count_mismatch".`
    : '';
  const _normSvc = _normalizeForGate(matchedService);
  const _effectiveService = _SERVICE_GATE_ALIASES[_normSvc] || matchedService;
  const _gateObj = SERVICE_VISUAL_GATE_RULES[_effectiveService];
  const serviceGateInstruction = (accessConfiguration && _gateObj?.vision_instruction_by_access?.[accessConfiguration])
    ? _gateObj.vision_instruction_by_access[accessConfiguration]
    : (_gateObj?.vision_instruction ?? '');
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

// ─── _commonGateFields ────────────────────────────────────────────────────────
// Fields included in every gate-aware return (reject and pass paths).
function _commonGateFields(obj, computedWorkerMatch, visibleWC) {
  return {
    visible_worker_count:          visibleWC ?? obj.visible_worker_count ?? null,
    worker_count_match:            computedWorkerMatch,
    hedge_visible:                 obj.hedge_visible                 ?? null,
    worker_on_roof:                obj.worker_on_roof                ?? null,
    service_visual_match:          obj.service_visual_match          ?? null,
    horizontal_membrane_visible:   obj.horizontal_membrane_visible   ?? null,
    vertical_upstand_visible:      obj.vertical_upstand_visible      ?? null,
    upstand_treatment_visible:     obj.upstand_treatment_visible     ?? null,
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

// ─── checkImageSafety ─────────────────────────────────────────────────────────
// Decision order:
//   A. Generic blocking controls (computed worker count, dangerous_safety_violation)
//   B. Service visual gate (reject_conditions — first matching condition wins)
//   C. All structured checks passed → force safe:true (overrides Vision's autonomous safe=false)
//   Fallback: no gate → trust obj.safe
async function checkImageSafety(b64, matchedKey, apiKey, { fetchImpl, readResponseImpl, expectedWorkerCount = 0, matchedService = '', accessConfiguration = null }) {
  const basePrompt = SAFETY_CHECK_RULES[matchedKey];
  if (!basePrompt) return { safe: true };
  try {
    const req    = buildVisionSafetyRequest(matchedKey, b64, apiKey, expectedWorkerCount, matchedService, accessConfiguration);
    const resp   = await fetchImpl(req.url, { method: 'POST', headers: req.headers, body: req.body }, req.timeout);
    const parsed = await readResponseImpl(resp);
    if (!parsed.ok || !parsed.data) return { safe: null, checkFailed: true, reason: `HTTP ${parsed.status}` };
    const raw = parsed.data.choices?.[0]?.message?.content;
    let obj;
    try { obj = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return { safe: null, checkFailed: true, reason: 'JSON parse error' }; }
    if (obj?.safe == null) return { safe: null, checkFailed: true, reason: 'missing safe field' };

    // ── Recompute worker count from numbers — never trust Vision booleans ──────
    // Generic (>= minimum): mirrors the workerInstruction semantics sent to Vision.
    // Plan (=== exact):     used for the gate condition worker_count_matches_plan.
    const _visibleWC  = typeof obj.visible_worker_count === 'number' ? obj.visible_worker_count : null;
    const _expectedWC = (Number.isInteger(expectedWorkerCount) && expectedWorkerCount >= 1) ? expectedWorkerCount : null;
    const _computedWorkerMatch       = (_visibleWC !== null && _expectedWC !== null) ? (_visibleWC >= _expectedWC) : null;
    const _computedWorkerMatchesPlan = (_visibleWC !== null && _expectedWC !== null) ? (_visibleWC === _expectedWC) : null;

    // ── Resolve gate ───────────────────────────────────────────────────────────
    const _normSvc    = _normalizeForGate(matchedService);
    const _gateService = _SERVICE_GATE_ALIASES[_normSvc] || matchedService;
    const _gateObj    = SERVICE_VISUAL_GATE_RULES[_gateService];
    // Route to access-specific reject_conditions when available
    const _activeConditions = (accessConfiguration && _gateObj?.reject_conditions_by_access?.[accessConfiguration])
      ? _gateObj.reject_conditions_by_access[accessConfiguration]
      : _gateObj?.reject_conditions;
    const gate = _gateObj ? { ..._gateObj, reject_conditions: _activeConditions } : null;

    // ── Log generic Vision fields ──────────────────────────────────────────────
    console.log('[VISION GENERIC]', JSON.stringify({
      vision_reported_safe:             obj.safe,
      vision_reported_reason:           obj.reason           ?? null,
      visible_worker_count:             _visibleWC,
      expected_worker_count:            _expectedWC,
      vision_worker_count_match:        obj.worker_count_match        ?? null,
      vision_worker_count_matches_plan: obj.worker_count_matches_plan ?? null,
      computed_generic_worker_match:    _computedWorkerMatch,
      computed_plan_worker_match:       _computedWorkerMatchesPlan,
      dangerous_safety_violation:       obj.dangerous_safety_violation ?? null,
    }));

    // ── A. Generic blocking controls ───────────────────────────────────────────

    // A1. Worker count — computed from numbers (>= minimum)
    if (_expectedWC !== null && _computedWorkerMatch === false) {
      return {
        safe: false, severity: 'critical', reason: 'worker_count_mismatch',
        vision_reported_safe: obj.safe, vision_reported_reason: obj.reason ?? null,
        computed_generic_worker_match: _computedWorkerMatch,
        computed_final_safe: false, computed_final_reason: 'worker_count_mismatch',
        first_failed_gate_field: null,
        ..._commonGateFields(obj, _computedWorkerMatch, _visibleWC),
      };
    }

    // A2. Dangerous safety violation (explicit field from Vision)
    if (obj.dangerous_safety_violation === true) {
      return {
        safe: false, severity: 'critical', reason: 'critical_violation',
        vision_reported_safe: obj.safe, vision_reported_reason: obj.reason ?? null,
        computed_generic_worker_match: _computedWorkerMatch,
        computed_final_safe: false, computed_final_reason: 'critical_violation',
        first_failed_gate_field: null,
        ..._commonGateFields(obj, _computedWorkerMatch, _visibleWC),
      };
    }

    // ── B. Service visual gate ─────────────────────────────────────────────────
    if (gate) {
      // Debug log for acrotère (temporary instrumentation)
      if (_gateService === 'Étanchéité acrotère') {
        console.log('[VISION GATE RAW]', JSON.stringify({
          flat_roof_visible:                  obj.flat_roof_visible                 ?? null,
          parapet_visible:                    obj.parapet_visible                   ?? null,
          horizontal_membrane_visible:        obj.horizontal_membrane_visible       ?? null,
          vertical_upstand_visible:           obj.vertical_upstand_visible          ?? null,
          upstand_treatment_visible:          obj.upstand_treatment_visible         ?? null,
          service_visual_match:               obj.service_visual_match              ?? null,
          worker_on_parapet_coping:           obj.worker_on_parapet_coping          ?? null,
          pitched_roof_visible:               obj.pitched_roof_visible              ?? null,
          worker_count_matches_plan_computed: _computedWorkerMatchesPlan,
          vehicle_on_rooftop:                 obj.vehicle_on_rooftop                ?? null,
          vehicle_intersects_roof_work_area:  obj.vehicle_intersects_roof_work_area ?? null,
          physically_coherent_rooftop_access: obj.physically_coherent_rooftop_access ?? null,
        }));
      }

      for (const cond of gate.reject_conditions) {
        // For worker_count_matches_plan: use computed value (numbers), not Vision boolean
        const _fieldVal = cond.field === 'worker_count_matches_plan'
          ? _computedWorkerMatchesPlan
          : obj[cond.field];
        const matches = cond.not_exactly_true ? _fieldVal !== true : _fieldVal === cond.value;
        if (matches) {
          return {
            safe: false, severity: 'critical', reason: cond.reason,
            vision_reported_safe: obj.safe, vision_reported_reason: obj.reason ?? null,
            computed_generic_worker_match: _computedWorkerMatch,
            computed_final_safe: false, computed_final_reason: cond.reason,
            first_failed_gate_field: cond.field,
            ..._commonGateFields(obj, _computedWorkerMatch, _visibleWC),
          };
        }
      }

      // ── C. All structured checks passed → force safe:true ─────────────────
      // Vision's autonomous safe=false is overridden when all gate conditions pass
      // and no generic blocking control fired. The structured gate is authoritative.
      return {
        safe: true, severity: 'ok', reason: 'passed',
        vision_reported_safe: obj.safe, vision_reported_reason: obj.reason ?? null,
        computed_generic_worker_match: _computedWorkerMatch,
        computed_final_safe: true, computed_final_reason: 'passed',
        first_failed_gate_field: null,
        ..._commonGateFields(obj, _computedWorkerMatch, _visibleWC),
      };
    }

    // ── Fallback: no gate — trust Vision's own safe field ─────────────────────
    return {
      safe:                          obj.safe,
      severity:                      obj.severity || 'ok',
      reason:                        obj.reason   || '',
      vision_reported_safe:          obj.safe,
      vision_reported_reason:        obj.reason           ?? null,
      computed_generic_worker_match: _computedWorkerMatch,
      computed_final_safe:           obj.safe,
      computed_final_reason:         obj.reason           || '',
      first_failed_gate_field:       null,
      visible_worker_count:          _visibleWC ?? obj.visible_worker_count ?? null,
      worker_count_match:            _computedWorkerMatch ?? obj.worker_count_match ?? null,
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
