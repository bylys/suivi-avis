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
      max_tokens: 400,
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
    visible_worker_count:            visibleWC ?? obj.visible_worker_count ?? null,
    worker_count_match:              computedWorkerMatch,
    hedge_visible:                   obj.hedge_visible                   ?? null,
    worker_on_roof:                  obj.worker_on_roof                  ?? null,
    service_visual_match:            obj.service_visual_match            ?? null,
    horizontal_membrane_visible:     obj.horizontal_membrane_visible     ?? null,
    vertical_upstand_visible:        obj.vertical_upstand_visible        ?? null,
    upstand_treatment_visible:       obj.upstand_treatment_visible       ?? null,
    gutter_visible:                  obj.gutter_visible                  ?? null,
    cleaning_action_visible:         obj.cleaning_action_visible         ?? null,
    professional_ladder_visible:     obj.professional_ladder_visible     ?? null,
    ladder_stable:                   obj.ladder_stable                   ?? null,
    worker_in_mewp_basket_visible:   obj.worker_in_mewp_basket_visible   ?? null,
    ground_worker_visible:           obj.ground_worker_visible           ?? null,
    workers_spatially_separated:     obj.workers_spatially_separated     ?? null,
    treatment_application_visible:   obj.treatment_application_visible   ?? null,
    // Terrace surface cleaning gate fields
    terrace_surface_visible:         obj.terrace_surface_visible         ?? null,
    active_surface_cleaning_visible: obj.active_surface_cleaning_visible ?? null,
    cleaning_machine_visible:        obj.cleaning_machine_visible        ?? null,
    terrace_context_visible:         obj.terrace_context_visible         ?? null,
    // Pressure washing gate fields
    ground_hard_surface_visible:     obj.ground_hard_surface_visible     ?? null,
    active_pressure_washing_visible: obj.active_pressure_washing_visible ?? null,
    pressure_washer_visible:         obj.pressure_washer_visible         ?? null,
    lance_and_hose_coherent:         obj.lance_and_hose_coherent         ?? null,
    dirty_and_clean_zones_visible:   obj.dirty_and_clean_zones_visible   ?? null,
    partial_work_state_visible:      obj.partial_work_state_visible      ?? null,
    worker_stable_on_ground:         obj.worker_stable_on_ground         ?? null,
    jet_directed_safely:             obj.jet_directed_safely             ?? null,
    electrical_hazard_visible:       obj.electrical_hazard_visible       ?? null,
    dangerous_hose_trip_hazard:      obj.dangerous_hose_trip_hazard      ?? null,
    // Facade cleaning gate fields
    facade_surface_visible:               obj.facade_surface_visible               ?? null,
    active_facade_cleaning_visible:       obj.active_facade_cleaning_visible       ?? null,
    dirty_and_clean_facade_zones_visible: obj.dirty_and_clean_facade_zones_visible ?? null,
    work_area_reachable_from_ground:      obj.work_area_reachable_from_ground      ?? null,
    cleaning_equipment_visible:           obj.cleaning_equipment_visible           ?? null,
    hose_or_sprayer_coherent:             obj.hose_or_sprayer_coherent             ?? null,
    jet_or_product_directed_safely:       obj.jet_or_product_directed_safely       ?? null,
    worker_on_ladder_or_scaffold:         obj.worker_on_ladder_or_scaffold         ?? null,
    // Hydrofuge facade gate fields
    active_hydrofuge_application_visible:         obj.active_hydrofuge_application_visible         ?? null,
    hydrofuge_application_tool_visible:           obj.hydrofuge_application_tool_visible           ?? null,
    treated_and_untreated_facade_zones_visible:   obj.treated_and_untreated_facade_zones_visible   ?? null,
    transparent_or_subtle_product_effect_visible: obj.transparent_or_subtle_product_effect_visible ?? null,
    original_facade_texture_remains_visible:      obj.original_facade_texture_remains_visible      ?? null,
    pressure_washing_visible:                     obj.pressure_washing_visible                     ?? null,
    dirty_water_runoff_visible:                   obj.dirty_water_runoff_visible                   ?? null,
    opaque_paint_application_visible:             obj.opaque_paint_application_visible             ?? null,
    fresh_render_application_visible:             obj.fresh_render_application_visible             ?? null,
    // Linteau gate fields
    wall_opening_visible:                        obj.wall_opening_visible                        ?? null,
    lintel_visible:                              obj.lintel_visible                              ?? null,
    lintel_seated_on_both_bearings:              obj.lintel_seated_on_both_bearings              ?? null,
    sufficient_lateral_bearing_visible:          obj.sufficient_lateral_bearing_visible          ?? null,
    temporary_supports_visible:                  obj.temporary_supports_visible                  ?? null,
    masonry_above_supported:                     obj.masonry_above_supported                     ?? null,
    active_lintel_adjustment_visible:            obj.active_lintel_adjustment_visible            ?? null,
    bearing_bed_or_adjustment_evidence_visible:  obj.bearing_bed_or_adjustment_evidence_visible  ?? null,
    workers_stable_on_ground:                    obj.workers_stable_on_ground                    ?? null,
    worker_beneath_unsupported_masonry:          obj.worker_beneath_unsupported_masonry          ?? null,
    lintel_held_overhead_manually:               obj.lintel_held_overhead_manually               ?? null,
    ladder_used_as_workstation:                  obj.ladder_used_as_workstation                  ?? null,
    falling_debris_hazard_visible:               obj.falling_debris_hazard_visible               ?? null,
    // Linteau optional telemetry (not in gate)
    fresh_mortar_at_bearings_visible:            obj.fresh_mortar_at_bearings_visible            ?? null,
    // Escalier béton gate fields (19 base + 4 variant discriminators)
    residential_building_entrance_visible:          obj.residential_building_entrance_visible          ?? null,
    small_exterior_concrete_stair_context_visible:  obj.small_exterior_concrete_stair_context_visible  ?? null,
    stepped_stair_formwork_visible:                 obj.stepped_stair_formwork_visible                 ?? null,
    distinct_riser_boards_visible:                  obj.distinct_riser_boards_visible                  ?? null,
    side_formwork_panels_visible:                   obj.side_formwork_panels_visible                   ?? null,
    three_or_four_step_profile_visible:             obj.three_or_four_step_profile_visible             ?? null,
    ground_supported_compacted_base_visible:        obj.ground_supported_compacted_base_visible        ?? null,
    formwork_bracing_or_stakes_visible:             obj.formwork_bracing_or_stakes_visible             ?? null,
    active_stair_formwork_adjustment_visible:       obj.active_stair_formwork_adjustment_visible       ?? null,
    worker_standing_on_formwork:                    obj.worker_standing_on_formwork                    ?? null,
    suspended_stair_formwork_visible:               obj.suspended_stair_formwork_visible               ?? null,
    fresh_concrete_filling_all_steps_visible:       obj.fresh_concrete_filling_all_steps_visible       ?? null,
    threshold_only_work_visible:                    obj.threshold_only_work_visible                    ?? null,
    stair_reinforcement_visible:                    obj.stair_reinforcement_visible                    ?? null,
    large_slab_area_dominant:                       obj.large_slab_area_dominant                       ?? null,
    lintel_work_visible:                            obj.lintel_work_visible                            ?? null,
    // Ferraillage gate fields
    reinforcement_cage_visible:       obj.reinforcement_cage_visible       ?? null,
    longitudinal_rebar_visible:       obj.longitudinal_rebar_visible       ?? null,
    regular_stirrups_visible:         obj.regular_stirrups_visible         ?? null,
    tying_tool_in_contact_with_rebar: obj.tying_tool_in_contact_with_rebar ?? null,
    partial_rebar_assembly_visible:   obj.partial_rebar_assembly_visible   ?? null,
    rebar_supported_on_low_stands:    obj.rebar_supported_on_low_stands    ?? null,
    worker_standing_on_rebar:         obj.worker_standing_on_rebar         ?? null,
    foundation_trench_dominant:       obj.foundation_trench_dominant       ?? null,
    fresh_concrete_visible:           obj.fresh_concrete_visible           ?? null,
    concrete_pouring_visible:         obj.concrete_pouring_visible         ?? null,
    formwork_removal_visible:         obj.formwork_removal_visible         ?? null,
    // Fondation gate fields
    shallow_foundation_trench_visible:                    obj.shallow_foundation_trench_visible                    ?? null,
    strip_footing_rebar_cage_visible:                     obj.strip_footing_rebar_cage_visible                     ?? null,
    rebar_stirrups_visible:                               obj.rebar_stirrups_visible                               ?? null,
    rebar_supported_off_soil_with_visible_cover_supports: obj.rebar_supported_off_soil_with_visible_cover_supports ?? null,
    active_rebar_tying_visible:                           obj.active_rebar_tying_visible                           ?? null,
    partial_foundation_progress_visible:                  obj.partial_foundation_progress_visible                  ?? null,
    worker_stable_at_ground_level:                        obj.worker_stable_at_ground_level                        ?? null,
    worker_inside_trench:                                 obj.worker_inside_trench                                 ?? null,
    deep_unprotected_trench_visible:                      obj.deep_unprotected_trench_visible                      ?? null,
    slab_formwork_visible:                                obj.slab_formwork_visible                                ?? null,
    horizontal_slab_mesh_dominant:                        obj.horizontal_slab_mesh_dominant                        ?? null,
    fresh_concrete_poured_visible:                        obj.fresh_concrete_poured_visible                        ?? null,
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
  // ── Resolve gate BEFORE Vision call — needed for pre-call logging and safe-field bypass ──
  const _normSvcPre    = _normalizeForGate(matchedService);
  const _gateServicePre = _SERVICE_GATE_ALIASES[_normSvcPre] || matchedService;
  const _gateObjPre    = SERVICE_VISUAL_GATE_RULES[_gateServicePre];
  const _activeCondsPre = (accessConfiguration && _gateObjPre?.reject_conditions_by_access?.[accessConfiguration])
    ? _gateObjPre.reject_conditions_by_access[accessConfiguration]
    : _gateObjPre?.reject_conditions;
  const _gatePre = _gateObjPre ? { ..._gateObjPre, reject_conditions: _activeCondsPre } : null;
  const _debug = typeof window !== 'undefined' && window._safetyDebug === true;
  if (_debug) {
    const _req0 = buildVisionSafetyRequest(matchedKey, '', apiKey, expectedWorkerCount, matchedService, accessConfiguration);
    const _body0 = _req0 ? JSON.parse(_req0.body) : null;
    console.log('[SAFETY DEBUG PRE]', JSON.stringify({
      resolved_service_before_vision:      matchedService,
      resolved_service_gate_before_vision: _gateServicePre,
      gate_found:                          !!_gateObjPre,
      mandatory_fields_count:              _gateObjPre?.mandatory_fields?.length ?? 0,
      configured_max_tokens:               _body0?.max_tokens ?? null,
    }));
  }
  try {
    const req    = buildVisionSafetyRequest(matchedKey, b64, apiKey, expectedWorkerCount, matchedService, accessConfiguration);
    const resp   = await fetchImpl(req.url, { method: 'POST', headers: req.headers, body: req.body }, req.timeout);
    const parsed = await readResponseImpl(resp);
    if (!parsed.ok || !parsed.data) {
      if (_debug) console.log('[SAFETY DEBUG CHECK_FAILED]', JSON.stringify({ type: 'vision_http_error', http_status: parsed.status, service: matchedService, gate: _gateServicePre }));
      return { safe: null, checkFailed: true, reason: `HTTP ${parsed.status}`, check_failed_type: 'vision_http_error' };
    }
    const raw = parsed.data.choices?.[0]?.message?.content;
    const _finishReason = parsed.data.choices?.[0]?.finish_reason ?? null;
    const _rawLen = typeof raw === 'string' ? raw.length : null;
    let obj;
    try { obj = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch(parseErr) {
      if (_debug) console.log('[SAFETY DEBUG CHECK_FAILED]', JSON.stringify({ type: 'invalid_json', finish_reason: _finishReason, raw_length: _rawLen, raw_prefix: typeof raw === 'string' ? raw.slice(0, 120) : null, raw_suffix: typeof raw === 'string' ? raw.slice(-60) : null, service: matchedService, gate: _gateServicePre }));
      return { safe: null, checkFailed: true, reason: 'JSON parse error', check_failed_type: 'invalid_json' };
    }
    if (_debug && _finishReason === 'length') console.log('[SAFETY DEBUG CHECK_FAILED]', JSON.stringify({ type: 'truncated_vision_response', finish_reason: 'length', raw_length: _rawLen, service: matchedService, gate: _gateServicePre }));

    // ── Recompute worker count from numbers — never trust Vision booleans ──────
    const _visibleWC  = typeof obj.visible_worker_count === 'number' ? obj.visible_worker_count : null;
    const _expectedWC = (Number.isInteger(expectedWorkerCount) && expectedWorkerCount >= 1) ? expectedWorkerCount : null;
    const _computedWorkerMatch       = (_visibleWC !== null && _expectedWC !== null) ? (_visibleWC >= _expectedWC) : null;
    const _computedWorkerMatchesPlan = (_visibleWC !== null && _expectedWC !== null) ? (_visibleWC === _expectedWC) : null;

    // ── Resolve gate (reuse pre-resolved values) ───────────────────────────────
    const _normSvc    = _normSvcPre;
    const _gateService = _gateServicePre;
    const _gateObj    = _gateObjPre;
    const _activeConditions = _activeCondsPre;
    const gate = _gatePre;

    // ── safe field required only when no gate (gate instructions intentionally omit safe) ──
    if (obj?.safe == null && !gate) {
      if (_debug) console.log('[SAFETY DEBUG CHECK_FAILED]', JSON.stringify({ type: 'missing_json_object', field: 'safe', finish_reason: _finishReason, raw_length: _rawLen, raw_prefix: typeof raw === 'string' ? raw.slice(0, 120) : null, service: matchedService, gate: _gateServicePre }));
      return { safe: null, checkFailed: true, reason: 'missing safe field', check_failed_type: 'missing_json_object' };
    }

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
      // ── B0. Mandatory fields — any absent/non-boolean → structured_evidence_incomplete ──
      if (gate.mandatory_fields) {
        for (const mf of gate.mandatory_fields) {
          if (typeof obj[mf] !== 'boolean') {
            return {
              safe: false, severity: 'critical', reason: 'structured_evidence_incomplete',
              vision_reported_safe: obj.safe, vision_reported_reason: obj.reason ?? null,
              computed_generic_worker_match: _computedWorkerMatch,
              computed_final_safe: false, computed_final_reason: 'structured_evidence_incomplete',
              first_failed_gate_field: mf,
              service_gate: _gateService,
              decision_source: 'structured_service_gate',
              ..._commonGateFields(obj, _computedWorkerMatch, _visibleWC),
            };
          }
        }
      }

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
        // worker_count_matches_plan is only applicable when a planned count exists (_expectedWC !== null).
        // When null (no fiche → no planned count), skip — A1 already handles the fiche-backed count check.
        if (cond.field === 'worker_count_matches_plan' && _fieldVal === null) continue;
        const matches = cond.not_exactly_true ? _fieldVal !== true : _fieldVal === cond.value;
        if (matches) {
          return {
            safe: false, severity: 'critical', reason: cond.reason,
            vision_reported_safe: obj.safe, vision_reported_reason: obj.reason ?? null,
            computed_generic_worker_match: _computedWorkerMatch,
            computed_final_safe: false, computed_final_reason: cond.reason,
            first_failed_gate_field: cond.field,
            service_gate: _gateService,
            decision_source: 'structured_service_gate',
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
        service_gate: _gateService,
        decision_source: 'structured_service_gate',
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
      service_gate:                  null,
      decision_source:               'vision_autonomous',
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
  } catch(e) {
    if (_debug) console.log('[SAFETY DEBUG CHECK_FAILED]', JSON.stringify({ type: 'unknown_check_failure', error_name: e?.name ?? null, error_message: e?.message ?? null, service: matchedService, gate: _gateServicePre }));
    return { safe: null, checkFailed: true, reason: e.message, check_failed_type: 'unknown_check_failure' };
  }
}

export { buildVisionSafetyRequest, checkImageSafety };
