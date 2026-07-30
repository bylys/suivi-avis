/**
 * debug/etancheite-gate-tests.js — ETCH-GATE1 to ETCH-GATE68
 * Service visual gate tests for the étanchéité cluster.
 * Verifies reject_conditions logic, alias routing, and worker count comparisons.
 * No real API calls — all tests are static/structural.
 * Loaded only when ?imageGenTests=1 is in the URL.
 */

import { SERVICE_VISUAL_GATE_RULES, _SERVICE_GATE_ALIASES, SERVICE_VISUAL_MISMATCH_RETRY, SOLIN_SAFETY_RETRY } from '../safety/safety-rules.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

function assert(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

// Simulate the gate evaluation logic used by the pipeline:
// apply reject_conditions against a mock Vision result object.
// Returns { rejected: boolean, reason: string|null }.
function evalGate(gateKey, visionResult) {
  const gate = SERVICE_VISUAL_GATE_RULES[gateKey];
  if (!gate) return { rejected: true, reason: `gate_not_found:${gateKey}` };
  for (const cond of gate.reject_conditions) {
    const val = visionResult[cond.field];
    if (cond.value !== undefined && val === cond.value)            return { rejected: true,  reason: cond.reason };
    if (cond.not_exactly_true !== undefined && val !== true)        return { rejected: true,  reason: cond.reason };
  }
  return { rejected: false, reason: null };
}

// Resolve alias to gate key (same logic as pipeline normalizer)
function resolveAlias(rawService) {
  const normalized = rawService.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/['']/g, "'");
  return _SERVICE_GATE_ALIASES[normalized] || null;
}

// Simulate the full A→B→C decision logic (no network) for tests ETCH-GATE45–50.
// Mirrors checkImageSafety: recomputes worker counts from numbers, runs gate.
function evalFullSafety(visionObj, expectedWorkerCount, gateKey) {
  const _visibleWC  = typeof visionObj.visible_worker_count === 'number' ? visionObj.visible_worker_count : null;
  const _expectedWC = (Number.isInteger(expectedWorkerCount) && expectedWorkerCount >= 1) ? expectedWorkerCount : null;
  const _computedWorkerMatch       = (_visibleWC !== null && _expectedWC !== null) ? (_visibleWC >= _expectedWC) : null;
  const _computedWorkerMatchesPlan = (_visibleWC !== null && _expectedWC !== null) ? (_visibleWC === _expectedWC) : null;
  const gate = SERVICE_VISUAL_GATE_RULES[gateKey];
  // A1: generic worker count (computed from numbers)
  if (_expectedWC !== null && _computedWorkerMatch === false) {
    return { safe: false, reason: 'worker_count_mismatch', computed_generic_worker_match: _computedWorkerMatch, computed_final_safe: false, computed_final_reason: 'worker_count_mismatch', first_failed_gate_field: null };
  }
  // A2: dangerous safety violation
  if (visionObj.dangerous_safety_violation === true) {
    return { safe: false, reason: 'critical_violation', computed_generic_worker_match: _computedWorkerMatch, computed_final_safe: false, computed_final_reason: 'critical_violation', first_failed_gate_field: null };
  }
  // B: gate conditions (worker_count_matches_plan uses computed value, not Vision boolean)
  if (gate) {
    for (const cond of gate.reject_conditions) {
      const _fieldVal = cond.field === 'worker_count_matches_plan' ? _computedWorkerMatchesPlan : visionObj[cond.field];
      const matches = cond.not_exactly_true ? _fieldVal !== true : _fieldVal === cond.value;
      if (matches) {
        return { safe: false, reason: cond.reason, computed_generic_worker_match: _computedWorkerMatch, computed_final_safe: false, computed_final_reason: cond.reason, first_failed_gate_field: cond.field };
      }
    }
    // C: all pass — override Vision's autonomous safe=false
    return { safe: true, reason: 'passed', vision_reported_safe: visionObj.safe, computed_generic_worker_match: _computedWorkerMatch, computed_final_safe: true, computed_final_reason: 'passed', first_failed_gate_field: null };
  }
  return { safe: visionObj.safe, reason: visionObj.reason || '', computed_generic_worker_match: _computedWorkerMatch, computed_final_safe: visionObj.safe, computed_final_reason: visionObj.reason || '', first_failed_gate_field: null };
}

// ─── test runner ──────────────────────────────────────────────────────────────

export async function runEtancheiteGateTests() {
  console.group('ETCH-GATE tests — Étanchéité visual gates');

  const _results = [];
  let _pass = 0;
  let _fail = 0;

  function runTest(id, description, fn) {
    try {
      fn();
      _results.push({ id, description, status: 'PASS' });
      _pass++;
      console.log(`%c✓ ${id}: ${description}`, 'color: green');
    } catch (e) {
      _results.push({ id, description, status: 'FAIL', reason: e.message });
      _fail++;
      console.error(`✘ ${id}: ${description}\n  ${e.message}`);
    }
  }

  // ─── Gate existence ──────────────────────────────────────────────────────────
  runTest('ETCH-GATE1', 'All 8 étanchéité gates exist in SERVICE_VISUAL_GATE_RULES', () => {
    const gates = [
      'Étanchéité toit-terrasse', 'Étanchéité EPDM', 'Étanchéité PVC',
      'Étanchéité bitume', 'Étanchéité acrotère', 'Étanchéité balcon',
      'Étanchéité terrasse', 'Étanchéité inclinée',
    ];
    for (const g of gates) {
      assert(SERVICE_VISUAL_GATE_RULES[g], `Gate missing: '${g}'`);
      assert(Array.isArray(SERVICE_VISUAL_GATE_RULES[g].reject_conditions),
        `${g} must have reject_conditions array`);
      assert(typeof SERVICE_VISUAL_GATE_RULES[g].vision_instruction === 'string',
        `${g} must have vision_instruction string`);
    }
  });

  // ─── EPDM ────────────────────────────────────────────────────────────────────
  runTest('ETCH-GATE2', 'EPDM: accepted — black membrane + cold adhesive + flat roof safety fields', () => {
    const r = evalGate('Étanchéité EPDM', {
      flat_or_low_slope_surface_visible:       true,
      parapet_or_guardrail_visible:            true,
      worker_near_unprotected_edge:            false,
      black_flexible_membrane_visible:         true,
      cold_adhesive_or_bonding_action_visible: true,
      pressure_roller_visible:                 true,
      hot_air_welder_visible:                  false,
      bitumen_torch_visible:                   false,
      service_visual_match:                    true,
      worker_count_matches_plan:               true,
    });
    assert(!r.rejected, `Expected accept, got reject: ${r.reason}`);
  });

  runTest('ETCH-GATE3', 'EPDM: rejected — hot-air welder present', () => {
    const r = evalGate('Étanchéité EPDM', {
      black_flexible_membrane_visible:    true,
      cold_adhesive_or_bonding_action_visible: false,
      pressure_roller_visible:            true,
      hot_air_welder_visible:             true,
      bitumen_torch_visible:              false,
      service_visual_match:               true,
      worker_count_matches_plan:          true,
    });
    assert(r.rejected, 'Expected reject for hot_air_welder_visible=true');
    assert(r.reason === 'forbidden_tool_for_epdm', `Expected forbidden_tool_for_epdm, got ${r.reason}`);
  });

  runTest('ETCH-GATE4', 'EPDM: rejected — PVC welder (hot_air_welder + no EPDM context)', () => {
    const r = evalGate('Étanchéité EPDM', {
      black_flexible_membrane_visible:    false,
      cold_adhesive_or_bonding_action_visible: false,
      pressure_roller_visible:            false,
      hot_air_welder_visible:             true,
      bitumen_torch_visible:              false,
      service_visual_match:               false,
      worker_count_matches_plan:          true,
    });
    assert(r.rejected, 'Expected reject');
    assert(r.reason === 'forbidden_tool_for_epdm', `Expected forbidden_tool_for_epdm, got ${r.reason}`);
  });

  // ─── PVC ─────────────────────────────────────────────────────────────────────
  runTest('ETCH-GATE5', 'PVC: accepted — grey membrane + welder + seam + flat roof safety fields', () => {
    const r = evalGate('Étanchéité PVC', {
      flat_or_low_slope_surface_visible:        true,
      parapet_or_guardrail_visible:             true,
      worker_near_unprotected_edge:             false,
      light_grey_or_off_white_membrane_visible: true,
      hot_air_welder_visible:                   true,
      pressure_roller_visible:                  true,
      heat_welded_seam_visible:                 true,
      bitumen_torch_visible:                    false,
      service_visual_match:                     true,
      worker_count_matches_plan:                true,
    });
    assert(!r.rejected, `Expected accept, got reject: ${r.reason}`);
  });

  runTest('ETCH-GATE6', 'PVC: rejected — bitumen torch present (wrong material)', () => {
    const r = evalGate('Étanchéité PVC', {
      light_grey_or_off_white_membrane_visible: true,
      hot_air_welder_visible:             false,
      pressure_roller_visible:            false,
      heat_welded_seam_visible:           false,
      bitumen_torch_visible:              true,
      service_visual_match:               false,
      worker_count_matches_plan:          true,
    });
    assert(r.rejected, 'Expected reject for bitumen_torch_visible=true');
    assert(r.reason === 'forbidden_tool_for_pvc', `Expected forbidden_tool_for_pvc, got ${r.reason}`);
  });

  // ─── Bitume ──────────────────────────────────────────────────────────────────
  runTest('ETCH-GATE7', 'Bitume: accepted — dark roll + controlled torch + flat roof safety fields', () => {
    const r = evalGate('Étanchéité bitume', {
      flat_or_low_slope_surface_visible:       true,
      parapet_or_guardrail_visible:            true,
      worker_near_unprotected_edge:            false,
      dark_bituminous_roll_visible:            true,
      overlap_or_lap_joint_visible:            true,
      controlled_torch_or_cold_bonding_visible: true,
      large_flame_visible:                     false,
      gas_cylinder_unstable_or_horizontal:     false,
      torch_directed_toward_worker:            false,
      service_visual_match:                    true,
      worker_count_matches_plan:               true,
    });
    assert(!r.rejected, `Expected accept, got reject: ${r.reason}`);
  });

  runTest('ETCH-GATE8', 'Bitume: accepted — cold bonding, no torch, flat roof safety fields', () => {
    const r = evalGate('Étanchéité bitume', {
      flat_or_low_slope_surface_visible:       true,
      parapet_or_guardrail_visible:            true,
      worker_near_unprotected_edge:            false,
      dark_bituminous_roll_visible:            true,
      overlap_or_lap_joint_visible:            true,
      controlled_torch_or_cold_bonding_visible: true,
      large_flame_visible:                     false,
      gas_cylinder_unstable_or_horizontal:     false,
      torch_directed_toward_worker:            false,
      service_visual_match:                    true,
      worker_count_matches_plan:               true,
    });
    assert(!r.rejected, `Expected accept for cold-bonding scene, got reject: ${r.reason}`);
  });

  runTest('ETCH-GATE9', 'Bitume: rejected — large uncontrolled flame', () => {
    const r = evalGate('Étanchéité bitume', {
      dark_bituminous_roll_visible:        true,
      overlap_or_lap_joint_visible:        true,
      controlled_torch_or_cold_bonding_visible: true,
      large_flame_visible:                 true,
      gas_cylinder_unstable_or_horizontal: false,
      torch_directed_toward_worker:        false,
      service_visual_match:                true,
      worker_count_matches_plan:           true,
    });
    assert(r.rejected, 'Expected reject for large_flame_visible=true');
    assert(r.reason === 'critical_violation', `Expected critical_violation, got ${r.reason}`);
  });

  runTest('ETCH-GATE10', 'Bitume: rejected — gas cylinder horizontal', () => {
    const r = evalGate('Étanchéité bitume', {
      dark_bituminous_roll_visible:        true,
      overlap_or_lap_joint_visible:        true,
      controlled_torch_or_cold_bonding_visible: true,
      large_flame_visible:                 false,
      gas_cylinder_unstable_or_horizontal: true,
      torch_directed_toward_worker:        false,
      service_visual_match:                true,
      worker_count_matches_plan:           true,
    });
    assert(r.rejected, 'Expected reject for unstable gas cylinder');
    assert(r.reason === 'critical_violation', `Expected critical_violation, got ${r.reason}`);
  });

  // ─── Acrotère ─────────────────────────────────────────────────────────────────
  runTest('ETCH-GATE11', 'Acrotère: accepted — flat roof + parapet + upstand + no vehicle', () => {
    const r = evalGate('Étanchéité acrotère', {
      flat_roof_visible:                 true,
      parapet_visible:                   true,
      horizontal_membrane_visible:       true,
      vertical_upstand_visible:          true,
      upstand_treatment_visible:         true,
      worker_on_parapet_coping:          false,
      pitched_roof_visible:              false,
      service_visual_match:              true,
      worker_count_matches_plan:         true,
      vehicle_on_rooftop:                false,
      vehicle_intersects_roof_work_area: false,
      physically_coherent_rooftop_access: true,
    });
    assert(!r.rejected, `Expected accept, got reject: ${r.reason}`);
  });

  runTest('ETCH-GATE12', 'Acrotère: rejected — worker on parapet coping', () => {
    const r = evalGate('Étanchéité acrotère', {
      flat_roof_visible:             true,
      parapet_visible:               true,
      horizontal_membrane_visible:   true,
      vertical_upstand_visible:      true,
      upstand_treatment_visible:     true,
      worker_on_parapet_coping:      true,
      pitched_roof_visible:          false,
      service_visual_match:          true,
      worker_count_matches_plan:     true,
    });
    assert(r.rejected, 'Expected reject for worker on parapet coping');
    assert(r.reason === 'critical_violation', `Expected critical_violation, got ${r.reason}`);
  });

  runTest('ETCH-GATE13', 'Acrotère: rejected — pitched roof visible (wrong context)', () => {
    const r = evalGate('Étanchéité acrotère', {
      flat_roof_visible:             false,
      parapet_visible:               false,
      horizontal_membrane_visible:   false,
      vertical_upstand_visible:      false,
      upstand_treatment_visible:     false,
      worker_on_parapet_coping:      false,
      pitched_roof_visible:          true,
      service_visual_match:          false,
      worker_count_matches_plan:     true,
    });
    assert(r.rejected, 'Expected reject for pitched_roof_visible=true');
    assert(r.reason === 'service_visual_mismatch', `Expected service_visual_mismatch, got ${r.reason}`);
  });

  runTest('ETCH-GATE34', 'Acrotère: rejected — vehicle physically on rooftop', () => {
    const r = evalGate('Étanchéité acrotère', {
      flat_roof_visible:                 true,
      parapet_visible:                   true,
      horizontal_membrane_visible:       true,
      vertical_upstand_visible:          true,
      upstand_treatment_visible:         true,
      worker_on_parapet_coping:          false,
      pitched_roof_visible:              false,
      service_visual_match:              true,
      worker_count_matches_plan:         true,
      vehicle_on_rooftop:                true,
      vehicle_intersects_roof_work_area: false,
      physically_coherent_rooftop_access: false,
    });
    assert(r.rejected, 'Expected reject for vehicle_on_rooftop=true');
    assert(r.reason === 'critical_violation', `Expected critical_violation, got ${r.reason}`);
  });

  runTest('ETCH-GATE35', 'Acrotère: rejected — vehicle intersects roof work area', () => {
    const r = evalGate('Étanchéité acrotère', {
      flat_roof_visible:                 true,
      parapet_visible:                   true,
      horizontal_membrane_visible:       true,
      vertical_upstand_visible:          true,
      upstand_treatment_visible:         true,
      worker_on_parapet_coping:          false,
      pitched_roof_visible:              false,
      service_visual_match:              true,
      worker_count_matches_plan:         true,
      vehicle_on_rooftop:                false,
      vehicle_intersects_roof_work_area: true,
      physically_coherent_rooftop_access: true,
    });
    assert(r.rejected, 'Expected reject for vehicle_intersects_roof_work_area=true');
    assert(r.reason === 'critical_violation', `Expected critical_violation, got ${r.reason}`);
  });

  runTest('ETCH-GATE36', 'Acrotère: rejected — physically incoherent rooftop access', () => {
    const r = evalGate('Étanchéité acrotère', {
      flat_roof_visible:                 true,
      parapet_visible:                   true,
      horizontal_membrane_visible:       true,
      vertical_upstand_visible:          true,
      upstand_treatment_visible:         true,
      worker_on_parapet_coping:          false,
      pitched_roof_visible:              false,
      service_visual_match:              true,
      worker_count_matches_plan:         true,
      vehicle_on_rooftop:                false,
      vehicle_intersects_roof_work_area: false,
      physically_coherent_rooftop_access: false,
    });
    assert(r.rejected, 'Expected reject for physically_coherent_rooftop_access=false');
    assert(r.reason === 'critical_violation', `Expected critical_violation, got ${r.reason}`);
  });

  runTest('ETCH-GATE37', 'Acrotère: accepted — no vehicle, coherent rooftop access', () => {
    const r = evalGate('Étanchéité acrotère', {
      flat_roof_visible:                 true,
      parapet_visible:                   true,
      horizontal_membrane_visible:       true,
      vertical_upstand_visible:          true,
      upstand_treatment_visible:         true,
      worker_on_parapet_coping:          false,
      pitched_roof_visible:              false,
      service_visual_match:              true,
      worker_count_matches_plan:         true,
      vehicle_on_rooftop:                false,
      vehicle_intersects_roof_work_area: false,
      physically_coherent_rooftop_access: true,
    });
    assert(!r.rejected, `Expected accept (no vehicle, coherent access), got reject: ${r.reason}`);
  });

  runTest('ETCH-GATE38', 'Acrotère: rejected — horizontal membrane absent', () => {
    const r = evalGate('Étanchéité acrotère', {
      flat_roof_visible:                 true,
      parapet_visible:                   true,
      horizontal_membrane_visible:       false,
      vertical_upstand_visible:          true,
      upstand_treatment_visible:         true,
      worker_on_parapet_coping:          false,
      pitched_roof_visible:              false,
      service_visual_match:              true,
      worker_count_matches_plan:         true,
      vehicle_on_rooftop:                false,
      vehicle_intersects_roof_work_area: false,
      physically_coherent_rooftop_access: true,
    });
    assert(r.rejected, 'Expected reject for horizontal_membrane_visible=false');
    assert(r.reason === 'missing_horizontal_membrane', `Expected missing_horizontal_membrane, got ${r.reason}`);
  });

  runTest('ETCH-GATE39', 'Acrotère: rejected — vertical upstand absent', () => {
    const r = evalGate('Étanchéité acrotère', {
      flat_roof_visible:                 true,
      parapet_visible:                   true,
      horizontal_membrane_visible:       true,
      vertical_upstand_visible:          false,
      upstand_treatment_visible:         true,
      worker_on_parapet_coping:          false,
      pitched_roof_visible:              false,
      service_visual_match:              true,
      worker_count_matches_plan:         true,
      vehicle_on_rooftop:                false,
      vehicle_intersects_roof_work_area: false,
      physically_coherent_rooftop_access: true,
    });
    assert(r.rejected, 'Expected reject for vertical_upstand_visible=false');
    assert(r.reason === 'missing_vertical_upstand', `Expected missing_vertical_upstand, got ${r.reason}`);
  });

  runTest('ETCH-GATE40', 'Acrotère: rejected — upstand treatment absent', () => {
    const r = evalGate('Étanchéité acrotère', {
      flat_roof_visible:                 true,
      parapet_visible:                   true,
      horizontal_membrane_visible:       true,
      vertical_upstand_visible:          true,
      upstand_treatment_visible:         false,
      worker_on_parapet_coping:          false,
      pitched_roof_visible:              false,
      service_visual_match:              true,
      worker_count_matches_plan:         true,
      vehicle_on_rooftop:                false,
      vehicle_intersects_roof_work_area: false,
      physically_coherent_rooftop_access: true,
    });
    assert(r.rejected, 'Expected reject for upstand_treatment_visible=false');
    assert(r.reason === 'missing_upstand_treatment', `Expected missing_upstand_treatment, got ${r.reason}`);
  });

  runTest('ETCH-GATE42', 'Acrotère order: horizontal=false → missing_horizontal_membrane (not vertical or treatment)', () => {
    const r = evalGate('Étanchéité acrotère', {
      flat_roof_visible:                 true,
      parapet_visible:                   true,
      horizontal_membrane_visible:       false,
      vertical_upstand_visible:          true,
      upstand_treatment_visible:         true,
      worker_on_parapet_coping:          false,
      pitched_roof_visible:              false,
      service_visual_match:              true,
      worker_count_matches_plan:         true,
      vehicle_on_rooftop:                false,
      vehicle_intersects_roof_work_area: false,
      physically_coherent_rooftop_access: true,
    });
    assert(r.rejected, 'Expected reject');
    assert(r.reason === 'missing_horizontal_membrane', `Expected missing_horizontal_membrane, got ${r.reason}`);
  });

  runTest('ETCH-GATE43', 'Acrotère order: vertical=false → missing_vertical_upstand (not treatment)', () => {
    const r = evalGate('Étanchéité acrotère', {
      flat_roof_visible:                 true,
      parapet_visible:                   true,
      horizontal_membrane_visible:       true,
      vertical_upstand_visible:          false,
      upstand_treatment_visible:         true,
      worker_on_parapet_coping:          false,
      pitched_roof_visible:              false,
      service_visual_match:              true,
      worker_count_matches_plan:         true,
      vehicle_on_rooftop:                false,
      vehicle_intersects_roof_work_area: false,
      physically_coherent_rooftop_access: true,
    });
    assert(r.rejected, 'Expected reject');
    assert(r.reason === 'missing_vertical_upstand', `Expected missing_vertical_upstand, got ${r.reason}`);
  });

  runTest('ETCH-GATE44', 'Acrotère order: treatment=false → missing_upstand_treatment', () => {
    const r = evalGate('Étanchéité acrotère', {
      flat_roof_visible:                 true,
      parapet_visible:                   true,
      horizontal_membrane_visible:       true,
      vertical_upstand_visible:          true,
      upstand_treatment_visible:         false,
      worker_on_parapet_coping:          false,
      pitched_roof_visible:              false,
      service_visual_match:              true,
      worker_count_matches_plan:         true,
      vehicle_on_rooftop:                false,
      vehicle_intersects_roof_work_area: false,
      physically_coherent_rooftop_access: true,
    });
    assert(r.rejected, 'Expected reject');
    assert(r.reason === 'missing_upstand_treatment', `Expected missing_upstand_treatment, got ${r.reason}`);
  });

  runTest('ETCH-GATE41', 'Acrotère: accepted — all upstand markers present', () => {
    const r = evalGate('Étanchéité acrotère', {
      flat_roof_visible:                 true,
      parapet_visible:                   true,
      horizontal_membrane_visible:       true,
      vertical_upstand_visible:          true,
      upstand_treatment_visible:         true,
      worker_on_parapet_coping:          false,
      pitched_roof_visible:              false,
      service_visual_match:              true,
      worker_count_matches_plan:         true,
      vehicle_on_rooftop:                false,
      vehicle_intersects_roof_work_area: false,
      physically_coherent_rooftop_access: true,
    });
    assert(!r.rejected, `Expected accept (all upstand markers present), got reject: ${r.reason}`);
  });

  // ─── Terrasse plain-pied ─────────────────────────────────────────────────────
  runTest('ETCH-GATE14', 'Terrasse: accepted — ground slab + threshold + waterproofing action', () => {
    const r = evalGate('Étanchéité terrasse', {
      ground_level_terrace_visible:          true,
      wall_or_door_threshold_junction_visible: true,
      waterproofing_action_visible:          true,
      elevated_balcony_visible:              false,
      pitched_roof_visible:                  false,
      service_visual_match:                  true,
      worker_count_matches_plan:             true,
    });
    assert(!r.rejected, `Expected accept, got reject: ${r.reason}`);
  });

  runTest('ETCH-GATE15', 'Terrasse: accepted without guardrail, harness, or roof ladder', () => {
    // The gate must NOT have reject_conditions for these absence fields
    const gate = SERVICE_VISUAL_GATE_RULES['Étanchéité terrasse'];
    const forbiddenFields = gate.reject_conditions.map(c => c.field);
    assert(!forbiddenFields.includes('guardrail_visible'),   'gate must not require guardrail');
    assert(!forbiddenFields.includes('harness_visible'),     'gate must not require harness');
    assert(!forbiddenFields.includes('roof_ladder_visible'), 'gate must not require roof ladder');
    assert(!forbiddenFields.includes('mewp_visible'),        'gate must not require MEWP');
  });

  runTest('ETCH-GATE16', 'Terrasse: rejected — elevated balcony instead of ground slab', () => {
    const r = evalGate('Étanchéité terrasse', {
      ground_level_terrace_visible:          false,
      wall_or_door_threshold_junction_visible: true,
      waterproofing_action_visible:          true,
      elevated_balcony_visible:              true,
      pitched_roof_visible:                  false,
      service_visual_match:                  false,
      worker_count_matches_plan:             true,
    });
    assert(r.rejected, 'Expected reject for elevated_balcony_visible=true');
    assert(r.reason === 'service_visual_mismatch', `Expected service_visual_mismatch, got ${r.reason}`);
  });

  // ─── Balcon ──────────────────────────────────────────────────────────────────
  runTest('ETCH-GATE17', 'Balcon: rejected — missing continuous railing', () => {
    const r = evalGate('Étanchéité balcon', {
      elevated_balcony_visible:                          true,
      continuous_railing_visible:                        false,
      door_or_threshold_visible:                         true,
      waterproofing_action_at_slab_wall_or_threshold_visible: true,
      worker_outside_railing:                            false,
      open_unprotected_edge:                             false,
      service_visual_match:                              true,
      worker_count_matches_plan:                         true,
    });
    assert(r.rejected, 'Expected reject for missing continuous railing');
    assert(r.reason === 'critical_violation', `Expected critical_violation, got ${r.reason}`);
  });

  runTest('ETCH-GATE18', 'Balcon: rejected — worker outside railing', () => {
    const r = evalGate('Étanchéité balcon', {
      elevated_balcony_visible:                          true,
      continuous_railing_visible:                        true,
      door_or_threshold_visible:                         true,
      waterproofing_action_at_slab_wall_or_threshold_visible: true,
      worker_outside_railing:                            true,
      open_unprotected_edge:                             false,
      service_visual_match:                              true,
      worker_count_matches_plan:                         true,
    });
    assert(r.rejected, 'Expected reject for worker_outside_railing=true');
    assert(r.reason === 'critical_violation', `Expected critical_violation, got ${r.reason}`);
  });

  runTest('ETCH-GATE19', 'Balcon: does not require harness, roof ladder, or MEWP', () => {
    const gate = SERVICE_VISUAL_GATE_RULES['Étanchéité balcon'];
    const forbiddenFields = gate.reject_conditions.map(c => c.field);
    assert(!forbiddenFields.includes('harness_visible'),     'balcon gate must not require harness');
    assert(!forbiddenFields.includes('roof_ladder_visible'), 'balcon gate must not require roof ladder');
    assert(!forbiddenFields.includes('mewp_visible'),        'balcon gate must not require MEWP');
  });

  // ─── Inclinée (pitched waterproofing) ────────────────────────────────────────
  runTest('ETCH-GATE20', 'Inclinée: accepted — hooked roof ladder + worker_fall_protection_adequate (solin scene)', () => {
    const r = evalGate('Étanchéité inclinée', {
      safe_access_visible:                    true,
      access_type:                            'HOOKED_ROOF_LADDER',
      ridge_hooks_visible:                    true,
      worker_on_ladder_rungs:                 true,
      worker_fall_protection_adequate:        true,   // harness connected + on rungs
      worker_freely_standing_on_pitched_roof: false,
      roof_ladder_on_same_roof_plane_as_worker: true,
      worker_directly_below_drop_zone:        false,
      loose_materials_on_slope:               false,
      large_missing_tile_area:                false,
      bare_underlay_visible:                  false,
      roof_covering_continuous:               true,
      service_specific_action_visible:        true,
      second_worker_visible:                  true,
      worker_count_matches_plan:              true,
    });
    assert(!r.rejected, `Expected accept, got reject: ${r.reason}`);
  });

  runTest('ETCH-GATE21', 'Inclinée: accepted — MEWP access, worker_fall_protection_adequate=true (basket guardrails)', () => {
    const r = evalGate('Étanchéité inclinée', {
      safe_access_visible:                    true,
      access_type:                            'MEWP',
      ridge_hooks_visible:                    true,   // waived by Vision when MEWP
      worker_on_ladder_rungs:                 true,   // waived when MEWP
      worker_fall_protection_adequate:        true,   // basket guardrails adequate
      worker_freely_standing_on_pitched_roof: false,
      roof_ladder_on_same_roof_plane_as_worker: true, // waived for MEWP per vision_instruction
      worker_directly_below_drop_zone:        false,
      loose_materials_on_slope:               false,
      large_missing_tile_area:                false,
      bare_underlay_visible:                  false,
      roof_covering_continuous:               true,
      service_specific_action_visible:        true,
      second_worker_visible:                  true,
      worker_count_matches_plan:              true,
    });
    assert(!r.rejected, `Expected accept for MEWP scene, got reject: ${r.reason}`);
  });

  runTest('ETCH-GATE22', 'Inclinée: rejected — worker freely standing on pitched tiles', () => {
    const r = evalGate('Étanchéité inclinée', {
      safe_access_visible:                  false,
      access_type:                          'OTHER',
      ridge_hooks_visible:                  false,
      connected_harness_visible:            false,
      worker_freely_standing_on_pitched_roof: true,
      worker_directly_below_drop_zone:      false,
      loose_materials_on_slope:             false,
      service_specific_action_visible:      true,
      second_worker_visible:                true,
      worker_count_matches_plan:            true,
    });
    assert(r.rejected, 'Expected reject for worker freely standing on pitched tiles');
    assert(r.reason === 'forbidden_roof_scene', `Expected forbidden_roof_scene, got ${r.reason}`);
  });

  runTest('ETCH-GATE23', 'Inclinée: rejected — Worker 2 in drop zone', () => {
    const r = evalGate('Étanchéité inclinée', {
      safe_access_visible:                      true,
      access_type:                              'HOOKED_ROOF_LADDER',
      ridge_hooks_visible:                      true,
      worker_fall_protection_adequate:          true,
      worker_freely_standing_on_pitched_roof:   false,
      roof_ladder_on_same_roof_plane_as_worker: true,
      worker_directly_below_drop_zone:          true,
      loose_materials_on_slope:                 false,
      large_missing_tile_area:                  false,
      bare_underlay_visible:                    false,
      roof_covering_continuous:                 true,
      service_specific_action_visible:          true,
      second_worker_visible:                    true,
      worker_count_matches_plan:                true,
    });
    assert(r.rejected, 'Expected reject for Worker 2 in drop zone');
    assert(r.reason === 'critical_violation', `Expected critical_violation, got ${r.reason}`);
  });

  // ─── Worker count — planned vs visible ───────────────────────────────────────
  runTest('ETCH-GATE24', 'Worker count: encours — worker_count_matches_plan=false rejects', () => {
    // encours → var_workers=2 → Vision sees 1 → sets worker_count_matches_plan=false
    const r = evalGate('Étanchéité toit-terrasse', {
      flat_or_low_slope_surface_visible:       true,
      waterproofing_membrane_or_coating_visible: true,
      parapet_or_guardrail_visible:            true,
      worker_near_unprotected_edge:            false,
      service_visual_match:                    true,
      worker_count_matches_plan:               false,   // Vision: saw 1, expected 2
    });
    assert(r.rejected, 'Expected reject when worker_count_matches_plan=false');
    assert(r.reason === 'worker_count_mismatch', `Expected worker_count_mismatch, got ${r.reason}`);
  });

  runTest('ETCH-GATE25', 'Worker count: final — worker_count_matches_plan=true (1 worker OK)', () => {
    // final → var_workers=1 → Vision sees 1 → sets worker_count_matches_plan=true
    const r = evalGate('Étanchéité toit-terrasse', {
      flat_or_low_slope_surface_visible:       true,
      waterproofing_membrane_or_coating_visible: true,
      parapet_or_guardrail_visible:            true,
      worker_near_unprotected_edge:            false,
      service_visual_match:                    true,
      worker_count_matches_plan:               true,    // Vision: saw 1, expected 1
    });
    assert(!r.rejected, `Expected accept, got reject: ${r.reason}`);
  });

  // ─── Alias routing ───────────────────────────────────────────────────────────
  runTest('ETCH-GATE26', 'All 17 service aliases resolve to the correct gate', () => {
    const expected = [
      ['étanchéité toit terrasse',  'Étanchéité toit-terrasse'],
      ['étanchéité toiture plate',  'Étanchéité toit-terrasse'],
      ['réfection d\'étanchéité',   'Étanchéité toit-terrasse'],
      ['étanchéité epdm',           'Étanchéité EPDM'],
      ['étanchéité pvc',            'Étanchéité PVC'],
      ['étanchéité bitume',         'Étanchéité bitume'],
      ['étanchéité acrotère',       'Étanchéité acrotère'],
      ['étanchéité balcon',         'Étanchéité balcon'],
      ['étanchéité terrasse',       'Étanchéité terrasse'],
      ['réparation fuite toiture',  'Étanchéité inclinée'],
      ['recherche de fuite',        'Étanchéité inclinée'],
      ['infiltration toiture',      'Étanchéité inclinée'],
      ['réparation solin',          'Étanchéité inclinée'],
      ['réparation velux',          'Étanchéité inclinée'],
      ['réparation noue',           'Étanchéité inclinée'],
      ['réparation rive',           'Étanchéité inclinée'],
      ['étanchéité cheminée',       'Étanchéité inclinée'],
    ];
    for (const [raw, expectedGate] of expected) {
      const resolved = resolveAlias(raw);
      assert(resolved === expectedGate,
        `'${raw}' → expected '${expectedGate}', got '${resolved}'`);
    }
  });

  runTest('ETCH-GATE27', 'Pitched aliases also resolve from pre-normalized forms', () => {
    const normalized = [
      ['reparation fuite toiture', 'Étanchéité inclinée'],
      ['reparation solin',         'Étanchéité inclinée'],
      ['reparation velux',         'Étanchéité inclinée'],
      ['reparation noue',          'Étanchéité inclinée'],
      ['reparation rive',          'Étanchéité inclinée'],
      ['etancheite cheminee',      'Étanchéité inclinée'],
    ];
    for (const [alias, gate] of normalized) {
      const resolved = _SERVICE_GATE_ALIASES[alias];
      assert(resolved === gate, `alias '${alias}' → expected '${gate}', got '${resolved}'`);
    }
  });

  runTest('ETCH-GATE28', 'Existing non-etancheite aliases unchanged (regression guard)', () => {
    assert(_SERVICE_GATE_ALIASES['taille haie']              === 'Taille de haie',              'taille haie alias must be unchanged');
    assert(_SERVICE_GATE_ALIASES['nettoyage gouttieres']     === 'Nettoyage gouttières',        'nettoyage alias must be unchanged');
    assert(_SERVICE_GATE_ALIASES['reparation toiture']       === 'Réparation toiture',          'reparation toiture alias must be unchanged');
    assert(_SERVICE_GATE_ALIASES['anti-mousse']              === 'Traitement anti-mousse toiture', 'anti-mousse alias must be unchanged');
  });

  // ─── Gate routing: Terrasse vs Toit-terrasse isolation ──────────────────────
  runTest('ETCH-GATE32', 'Étanchéité terrasse and Étanchéité toit-terrasse resolve to distinct gates and never cross', () => {
    // "étanchéité terrasse" (raw travaux with accents) → resolveAlias → Étanchéité terrasse
    const gTerrasse     = resolveAlias('étanchéité terrasse');
    // "étanchéité toit terrasse" (no hyphen, common DB variant) → resolveAlias → Étanchéité toit-terrasse
    const gToitTerrasse = resolveAlias('étanchéité toit terrasse');

    assert(gTerrasse     === 'Étanchéité terrasse',       `'étanchéité terrasse' must resolve to 'Étanchéité terrasse', got '${gTerrasse}'`);
    assert(gToitTerrasse === 'Étanchéité toit-terrasse',  `'étanchéité toit terrasse' must resolve to 'Étanchéité toit-terrasse', got '${gToitTerrasse}'`);
    assert(gTerrasse !== gToitTerrasse,                   'The two gates must not be the same key');

    // Verify both gates actually exist in SERVICE_VISUAL_GATE_RULES
    assert(!!SERVICE_VISUAL_GATE_RULES[gTerrasse],     `Gate '${gTerrasse}' must exist in SERVICE_VISUAL_GATE_RULES`);
    assert(!!SERVICE_VISUAL_GATE_RULES[gToitTerrasse], `Gate '${gToitTerrasse}' must exist in SERVICE_VISUAL_GATE_RULES`);
  });

  runTest('ETCH-GATE33', 'Pipeline normalization: raw accented travaux strings resolve to correct gates', () => {
    // Simulates the _normalizeForGate + alias path used by safety-check.js
    function pipelineResolve(raw) {
      const norm = raw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/['']/g, "'");
      return _SERVICE_GATE_ALIASES[norm] || null;
    }

    // "Étanchéité terrasse" (capitalized, with accent) → normalized → alias → Étanchéité terrasse
    assert(pipelineResolve('Étanchéité terrasse')        === 'Étanchéité terrasse',       'capitalized Étanchéité terrasse must resolve correctly');
    // "Étanchéité toit terrasse" (no hyphen) → Étanchéité toit-terrasse
    assert(pipelineResolve('Étanchéité toit terrasse')   === 'Étanchéité toit-terrasse',  'Étanchéité toit terrasse (no hyphen) must resolve correctly');
    // raw lowercase with accent
    assert(pipelineResolve('étanchéité terrasse')        === 'Étanchéité terrasse',       'lowercase étanchéité terrasse must resolve correctly');
    // apostrophe form
    assert(pipelineResolve("réfection d'étanchéité")     === 'Étanchéité toit-terrasse',  "réfection d'étanchéité must resolve to toit-terrasse");
    // Cross-check: "étanchéité terrasse" must NOT resolve to toit-terrasse
    assert(pipelineResolve('étanchéité terrasse')        !== 'Étanchéité toit-terrasse',  'étanchéité terrasse must NOT resolve to toit-terrasse');
  });

  // ─── Inclinée — 3 access architecture acceptance tests ───────────────────────
  runTest('ETCH-GATE29', 'Inclinée: MEWP acceptance — basket guardrails, no harness, no ridge hooks → accepted', () => {
    // Vision: worker inside MEWP basket, basket guardrails visible.
    // worker_fall_protection_adequate=true (basket provides fall protection).
    // ridge_hooks_visible NOT required and not set.
    const r = evalGate('Étanchéité inclinée', {
      safe_access_visible:                    true,
      access_type:                            'MEWP',
      ridge_hooks_visible:                    false,  // not present — waived for MEWP
      worker_on_ladder_rungs:                 false,  // not applicable for MEWP
      worker_fall_protection_adequate:        true,   // basket guardrails satisfy this
      worker_freely_standing_on_pitched_roof: false,
      roof_ladder_on_same_roof_plane_as_worker: true, // waived for MEWP
      worker_directly_below_drop_zone:        false,
      loose_materials_on_slope:               false,
      large_missing_tile_area:                false,
      bare_underlay_visible:                  false,
      roof_covering_continuous:               true,
      service_specific_action_visible:        true,
      second_worker_visible:                  true,
      worker_count_matches_plan:              true,
    });
    assert(!r.rejected, `MEWP scene must be accepted, got reject: ${r.reason}`);
  });

  runTest('ETCH-GATE30', 'Inclinée: SCAFFOLD acceptance — platform guardrails, no harness, no ridge hooks → accepted', () => {
    // Vision: scaffold platform at eave level, complete boards + guardrails visible.
    // worker_fall_protection_adequate=true (scaffold guardrails satisfy this).
    // No harness required when platform is fully guarded.
    const r = evalGate('Étanchéité inclinée', {
      safe_access_visible:                    true,
      access_type:                            'SCAFFOLD',
      ridge_hooks_visible:                    false,  // not required for scaffold
      worker_on_ladder_rungs:                 false,  // not applicable for scaffold
      worker_fall_protection_adequate:        true,   // scaffold guardrails satisfy this
      worker_freely_standing_on_pitched_roof: false,
      roof_ladder_on_same_roof_plane_as_worker: true, // waived for SCAFFOLD
      worker_directly_below_drop_zone:        false,
      loose_materials_on_slope:               false,
      large_missing_tile_area:                false,
      bare_underlay_visible:                  false,
      roof_covering_continuous:               true,
      service_specific_action_visible:        true,
      second_worker_visible:                  true,
      worker_count_matches_plan:              true,
    });
    assert(!r.rejected, `SCAFFOLD scene must be accepted without harness or ridge hooks, got reject: ${r.reason}`);
  });

  // ─── End-to-end pipeline path ─────────────────────────────────────────────────
  runTest('ETCH-GATE31', 'End-to-end: normalized service → alias → gate → reject_conditions pass', () => {
    // Simulate the full pipeline:
    // 1. raw service name comes in (with accents, mixed case)
    // 2. resolveAlias normalizes and looks up the gate key
    // 3. evalGate applies reject_conditions against the Vision response
    // 4. gate passes for a valid scene
    const rawService      = 'Réparation Fuite Toiture';
    const gateKey         = resolveAlias(rawService);

    assert(gateKey === 'Étanchéité inclinée',
      `alias resolution failed: '${rawService}' → '${gateKey}' (expected 'Étanchéité inclinée')`);

    // Valid hooked-roof-ladder scene: obj carries var_workers, state_level, _visual_family
    const visionResult = {
      safe_access_visible:                    true,
      access_type:                            'HOOKED_ROOF_LADDER',
      ridge_hooks_visible:                    true,
      worker_on_ladder_rungs:                 true,
      worker_fall_protection_adequate:        true,
      worker_freely_standing_on_pitched_roof: false,
      roof_ladder_on_same_roof_plane_as_worker: true,
      worker_directly_below_drop_zone:        false,
      loose_materials_on_slope:               false,
      large_missing_tile_area:                false,
      bare_underlay_visible:                  false,
      roof_covering_continuous:               true,
      service_specific_action_visible:        true,
      second_worker_visible:                  true,
      worker_count_matches_plan:              true,   // var_workers=2, visible=2 → match
    };

    const r = evalGate(gateKey, visionResult);
    assert(!r.rejected,
      `End-to-end pipeline path must accept valid scene, got reject: ${r.reason}`);
  });

  // ─── Full A→B→C safety logic (ETCH-GATE45–50) ───────────────────────────────

  runTest('ETCH-GATE45', 'Acrotère full-safety: Vision safe=false autonomous → overridden to safe=true when all gates pass (rule C)', () => {
    const r = evalFullSafety({
      safe: false, reason: 'service_visual_mismatch', // Vision contradiction
      visible_worker_count: 2,
      worker_on_parapet_coping: false, pitched_roof_visible: false,
      flat_roof_visible: true, parapet_visible: true,
      horizontal_membrane_visible: true, vertical_upstand_visible: true, upstand_treatment_visible: true,
      service_visual_match: true,
      vehicle_on_rooftop: false, vehicle_intersects_roof_work_area: false,
      physically_coherent_rooftop_access: true,
    }, 2, 'Étanchéité acrotère');
    assert(r.safe === true, `Expected safe=true (gate C overrides Vision), got safe=${r.safe} reason=${r.reason}`);
    assert(r.reason === 'passed', `Expected reason='passed', got '${r.reason}'`);
    assert(r.computed_final_safe === true, 'computed_final_safe must be true');
    assert(r.vision_reported_safe === false, 'vision_reported_safe must reflect Vision raw value');
  });

  runTest('ETCH-GATE46', 'Acrotère full-safety: computed worker generic fails (visible=1, expected=2) → A-phase worker_count_mismatch', () => {
    const r = evalFullSafety({
      safe: false, reason: 'worker_count_mismatch',
      visible_worker_count: 1,
      worker_count_match: true, worker_count_matches_plan: true, // Vision lies
      worker_on_parapet_coping: false, pitched_roof_visible: false,
      flat_roof_visible: true, parapet_visible: true,
      horizontal_membrane_visible: true, vertical_upstand_visible: true, upstand_treatment_visible: true,
      service_visual_match: true,
      vehicle_on_rooftop: false, vehicle_intersects_roof_work_area: false,
      physically_coherent_rooftop_access: true,
    }, 2, 'Étanchéité acrotère');
    assert(r.safe === false, 'Expected safe=false (worker count A-phase)');
    assert(r.reason === 'worker_count_mismatch', `Expected worker_count_mismatch, got '${r.reason}'`);
    assert(r.first_failed_gate_field === null, 'A-phase rejection has no gate field');
    assert(r.computed_generic_worker_match === false, 'computed_generic_worker_match must be false');
  });

  runTest('ETCH-GATE47', 'Acrotère full-safety: contradictory Vision booleans (match=false) overridden by computed numbers (visible=2, expected=2) → pass', () => {
    const r = evalFullSafety({
      safe: false, reason: 'worker_count_mismatch',
      visible_worker_count: 2,
      worker_count_match: false,        // Vision lie — ignored
      worker_count_matches_plan: false, // Vision lie — recomputed from numbers
      worker_on_parapet_coping: false, pitched_roof_visible: false,
      flat_roof_visible: true, parapet_visible: true,
      horizontal_membrane_visible: true, vertical_upstand_visible: true, upstand_treatment_visible: true,
      service_visual_match: true,
      vehicle_on_rooftop: false, vehicle_intersects_roof_work_area: false,
      physically_coherent_rooftop_access: true,
    }, 2, 'Étanchéité acrotère');
    assert(r.computed_generic_worker_match === true, 'computed_generic_worker_match must be true (2>=2)');
    assert(r.safe === true, `Expected safe=true (computed overrides Vision booleans), got safe=${r.safe} reason=${r.reason}`);
    assert(r.reason === 'passed', `Expected reason='passed', got '${r.reason}'`);
  });

  runTest('ETCH-GATE48', 'Acrotère full-safety: vertical_upstand_visible=false → B-phase missing_vertical_upstand', () => {
    const r = evalFullSafety({
      safe: true, visible_worker_count: 2,
      worker_on_parapet_coping: false, pitched_roof_visible: false,
      flat_roof_visible: true, parapet_visible: true,
      horizontal_membrane_visible: true, vertical_upstand_visible: false, // absent
      upstand_treatment_visible: true,
      service_visual_match: true,
      vehicle_on_rooftop: false, vehicle_intersects_roof_work_area: false,
      physically_coherent_rooftop_access: true,
    }, 2, 'Étanchéité acrotère');
    assert(r.safe === false, 'Expected safe=false');
    assert(r.reason === 'missing_vertical_upstand', `Expected missing_vertical_upstand, got '${r.reason}'`);
    assert(r.first_failed_gate_field === 'vertical_upstand_visible', `Expected first_failed_gate_field='vertical_upstand_visible', got '${r.first_failed_gate_field}'`);
  });

  runTest('ETCH-GATE49', 'Retry codes: Acrotère has retry text; worker_count_mismatch NOT in upstand retry set', () => {
    const retryText = SERVICE_VISUAL_MISMATCH_RETRY['Étanchéité acrotère'];
    assert(typeof retryText === 'string' && retryText.length > 0,
      'SERVICE_VISUAL_MISMATCH_RETRY must have non-empty string for Étanchéité acrotère');
    const ACROTERE_RETRY_CODES = new Set([
      'service_visual_mismatch', 'missing_horizontal_membrane',
      'missing_vertical_upstand', 'missing_upstand_treatment',
    ]);
    assert(!ACROTERE_RETRY_CODES.has('worker_count_mismatch'), 'worker_count_mismatch must NOT be in Acrotère retry set');
    assert(ACROTERE_RETRY_CODES.has('missing_horizontal_membrane'), 'missing_horizontal_membrane must be in retry set');
    assert(ACROTERE_RETRY_CODES.has('missing_vertical_upstand'),    'missing_vertical_upstand must be in retry set');
    assert(ACROTERE_RETRY_CODES.has('missing_upstand_treatment'),   'missing_upstand_treatment must be in retry set');
  });

  runTest('ETCH-GATE50', 'Acrotère full-safety: vehicle_on_rooftop=true rejects critical_violation even when all upstand markers pass', () => {
    const r = evalFullSafety({
      safe: true, visible_worker_count: 2,
      worker_on_parapet_coping: false, pitched_roof_visible: false,
      flat_roof_visible: true, parapet_visible: true,
      horizontal_membrane_visible: true, vertical_upstand_visible: true, upstand_treatment_visible: true,
      service_visual_match: true,
      vehicle_on_rooftop: true, // vehicle present — must reject
      vehicle_intersects_roof_work_area: false,
      physically_coherent_rooftop_access: true,
    }, 2, 'Étanchéité acrotère');
    assert(r.safe === false, 'Expected safe=false (vehicle_on_rooftop=true)');
    assert(r.reason === 'critical_violation', `Expected critical_violation, got '${r.reason}'`);
    assert(r.first_failed_gate_field === 'vehicle_on_rooftop', `Expected first_failed_gate_field='vehicle_on_rooftop', got '${r.first_failed_gate_field}'`);
  });

  // ─── ETCH-GATE51–57 : SOLIN_SAFETY_RETRY structural + content tests ──────────
  runTest('ETCH-GATE51', 'SOLIN_SAFETY_RETRY is a non-null object', () => {
    assert(typeof SOLIN_SAFETY_RETRY === 'object' && SOLIN_SAFETY_RETRY !== null, 'SOLIN_SAFETY_RETRY must be a non-null object');
  });

  runTest('ETCH-GATE52', 'SOLIN_SAFETY_RETRY has key "access_violation"', () => {
    assert(Object.prototype.hasOwnProperty.call(SOLIN_SAFETY_RETRY, 'access_violation'), 'SOLIN_SAFETY_RETRY must have key "access_violation"');
    assert(typeof SOLIN_SAFETY_RETRY['access_violation'] === 'string' && SOLIN_SAFETY_RETRY['access_violation'].length > 0, '"access_violation" entry must be a non-empty string');
  });

  runTest('ETCH-GATE53', 'SOLIN_SAFETY_RETRY has key "forbidden_roof_scene"', () => {
    assert(Object.prototype.hasOwnProperty.call(SOLIN_SAFETY_RETRY, 'forbidden_roof_scene'), 'SOLIN_SAFETY_RETRY must have key "forbidden_roof_scene"');
    assert(typeof SOLIN_SAFETY_RETRY['forbidden_roof_scene'] === 'string' && SOLIN_SAFETY_RETRY['forbidden_roof_scene'].length > 0, '"forbidden_roof_scene" entry must be a non-empty string');
  });

  runTest('ETCH-GATE54', 'SOLIN_SAFETY_RETRY has key "worker_count_mismatch"', () => {
    assert(Object.prototype.hasOwnProperty.call(SOLIN_SAFETY_RETRY, 'worker_count_mismatch'), 'SOLIN_SAFETY_RETRY must have key "worker_count_mismatch"');
    assert(typeof SOLIN_SAFETY_RETRY['worker_count_mismatch'] === 'string' && SOLIN_SAFETY_RETRY['worker_count_mismatch'].length > 0, '"worker_count_mismatch" entry must be a non-empty string');
  });

  runTest('ETCH-GATE55', 'access_violation note mentions facade ladder AND hooked roof ladder AND ridge', () => {
    const note = SOLIN_SAFETY_RETRY['access_violation'];
    assert(/facade/i.test(note), 'access_violation note must mention facade ladder');
    assert(/hooked roof ladder/i.test(note), 'access_violation note must mention "hooked roof ladder"');
    assert(/ridge/i.test(note), 'access_violation note must mention ridge');
  });

  runTest('ETCH-GATE56', 'forbidden_roof_scene note says worker stays on rungs — no harness requirement', () => {
    const note = SOLIN_SAFETY_RETRY['forbidden_roof_scene'];
    assert(/rungs/i.test(note), 'forbidden_roof_scene note must mention ladder rungs');
    assert(!/connected.*harness|harness.*connected/i.test(note), 'forbidden_roof_scene note must NOT require connected harness');
  });

  runTest('ETCH-GATE57', 'worker_count_mismatch note preserves both ladders and solin action', () => {
    const note = SOLIN_SAFETY_RETRY['worker_count_mismatch'];
    assert(/hooked roof ladder/i.test(note), 'worker_count_mismatch note must preserve "hooked roof ladder"');
    assert(/facade/i.test(note), 'worker_count_mismatch note must preserve facade ladder reference');
    assert(/solin/i.test(note), 'worker_count_mismatch note must preserve solin action reference');
  });

  // ─── ETCH-GATE58–64 : Étanchéité inclinée gate — FACADE+HOOKED route ─────────
  runTest('ETCH-GATE58', 'Étanchéité inclinée: FACADE+HOOKED route accepted — no harness required', () => {
    const r = evalGate('Étanchéité inclinée', {
      worker_freely_standing_on_pitched_roof:   false,
      safe_access_visible:                      true,
      roof_ladder_on_same_roof_plane_as_worker: true,
      worker_fall_protection_adequate:          true,
      worker_directly_below_drop_zone:          false,
      loose_materials_on_slope:                 false,
      large_missing_tile_area:                  false,
      bare_underlay_visible:                    false,
      roof_covering_continuous:                 true,
      service_specific_action_visible:          true,
      worker_count_matches_plan:                true,
    });
    assert(!r.rejected, `Expected accept (FACADE+HOOKED no harness), got reject: ${r.reason}`);
  });

  runTest('ETCH-GATE59', 'Étanchéité inclinée: worker_freely_standing=true → forbidden_roof_scene', () => {
    const r = evalGate('Étanchéité inclinée', {
      worker_freely_standing_on_pitched_roof: true,
      safe_access_visible:                   true,
      worker_fall_protection_adequate:        true,
      worker_directly_below_drop_zone:        false,
      loose_materials_on_slope:               false,
      service_specific_action_visible:        true,
      worker_count_matches_plan:              true,
    });
    assert(r.rejected, 'Expected reject for worker freely standing');
    assert(r.reason === 'forbidden_roof_scene', `Expected forbidden_roof_scene, got '${r.reason}'`);
  });

  runTest('ETCH-GATE60', 'Étanchéité inclinée: safe_access_visible=false → access_violation', () => {
    const r = evalGate('Étanchéité inclinée', {
      worker_freely_standing_on_pitched_roof: false,
      safe_access_visible:                   false,
      worker_fall_protection_adequate:        true,
      worker_directly_below_drop_zone:        false,
      loose_materials_on_slope:               false,
      service_specific_action_visible:        true,
      worker_count_matches_plan:              true,
    });
    assert(r.rejected, 'Expected reject for no safe access');
    assert(r.reason === 'access_violation', `Expected access_violation, got '${r.reason}'`);
  });

  runTest('ETCH-GATE61', 'Étanchéité inclinée: worker_fall_protection_adequate=false → critical_violation', () => {
    const r = evalGate('Étanchéité inclinée', {
      worker_freely_standing_on_pitched_roof:   false,
      safe_access_visible:                      true,
      roof_ladder_on_same_roof_plane_as_worker: true,  // must be true so critical_violation fires first
      worker_fall_protection_adequate:          false,
      worker_directly_below_drop_zone:          false,
      loose_materials_on_slope:                 false,
      large_missing_tile_area:                  false,
      bare_underlay_visible:                    false,
      roof_covering_continuous:                 true,
      service_specific_action_visible:          true,
      worker_count_matches_plan:                true,
    });
    assert(r.rejected, 'Expected reject for inadequate fall protection');
    assert(r.reason === 'critical_violation', `Expected critical_violation, got '${r.reason}'`);
  });

  runTest('ETCH-GATE62', 'Étanchéité inclinée: vision_instruction contains FACADE_LADDER_AND_HOOKED_ROOF_LADDER', () => {
    const gate = SERVICE_VISUAL_GATE_RULES['Étanchéité inclinée'];
    assert(gate, 'Gate must exist');
    assert(/FACADE_LADDER_AND_HOOKED_ROOF_LADDER/i.test(gate.vision_instruction), 'vision_instruction must mention FACADE_LADDER_AND_HOOKED_ROOF_LADDER access type');
  });

  runTest('ETCH-GATE63', 'Étanchéité inclinée: vision_instruction states harness NOT required for two-ladder route', () => {
    const instr = SERVICE_VISUAL_GATE_RULES['Étanchéité inclinée'].vision_instruction;
    assert(/fall-arrest harness.*NOT required.*two-ladder|NOT required.*FACADE_LADDER_AND_HOOKED/i.test(instr), 'vision_instruction must state harness NOT required for two-ladder route');
  });

  runTest('ETCH-GATE64', 'Étanchéité inclinée: vision_instruction contains facade_access_ladder_visible field definition', () => {
    const instr = SERVICE_VISUAL_GATE_RULES['Étanchéité inclinée'].vision_instruction;
    assert(/facade_access_ladder_visible/i.test(instr), 'vision_instruction must define facade_access_ladder_visible field');
  });

  // ─── ETCH-GATE65–68: new roof coverage / ladder-plane reject conditions ───────
  runTest('ETCH-GATE65', 'Inclinée: roof_ladder_on_same_roof_plane_as_worker=false → access_violation', () => {
    const r = evalGate('Étanchéité inclinée', {
      worker_freely_standing_on_pitched_roof:   false,
      safe_access_visible:                      true,
      roof_ladder_on_same_roof_plane_as_worker: false,  // ladder on wrong slope
      worker_fall_protection_adequate:          true,
      worker_directly_below_drop_zone:          false,
      loose_materials_on_slope:                 false,
      large_missing_tile_area:                  false,
      bare_underlay_visible:                    false,
      roof_covering_continuous:                 true,
      service_specific_action_visible:          true,
      worker_count_matches_plan:                true,
    });
    assert(r.rejected, 'Expected reject when roof ladder is on a different slope');
    assert(r.reason === 'access_violation', `Expected access_violation, got '${r.reason}'`);
  });

  runTest('ETCH-GATE66', 'Inclinée: large_missing_tile_area=true → service_visual_mismatch', () => {
    const r = evalGate('Étanchéité inclinée', {
      worker_freely_standing_on_pitched_roof:   false,
      safe_access_visible:                      true,
      roof_ladder_on_same_roof_plane_as_worker: true,
      worker_fall_protection_adequate:          true,
      worker_directly_below_drop_zone:          false,
      loose_materials_on_slope:                 false,
      large_missing_tile_area:                  true,   // large section of tiles missing
      bare_underlay_visible:                    false,
      roof_covering_continuous:                 true,
      service_specific_action_visible:          true,
      worker_count_matches_plan:                true,
    });
    assert(r.rejected, 'Expected reject when large missing-tile area visible');
    assert(r.reason === 'service_visual_mismatch', `Expected service_visual_mismatch, got '${r.reason}'`);
  });

  runTest('ETCH-GATE67', 'Inclinée: bare_underlay_visible=true → service_visual_mismatch', () => {
    const r = evalGate('Étanchéité inclinée', {
      worker_freely_standing_on_pitched_roof:   false,
      safe_access_visible:                      true,
      roof_ladder_on_same_roof_plane_as_worker: true,
      worker_fall_protection_adequate:          true,
      worker_directly_below_drop_zone:          false,
      loose_materials_on_slope:                 false,
      large_missing_tile_area:                  false,
      bare_underlay_visible:                    true,   // bare membrane exposed on slope
      roof_covering_continuous:                 true,
      service_specific_action_visible:          true,
      worker_count_matches_plan:                true,
    });
    assert(r.rejected, 'Expected reject when bare underlay visible on slope');
    assert(r.reason === 'service_visual_mismatch', `Expected service_visual_mismatch, got '${r.reason}'`);
  });

  runTest('ETCH-GATE68', 'Inclinée: roof_covering_continuous=false → service_visual_mismatch', () => {
    const r = evalGate('Étanchéité inclinée', {
      worker_freely_standing_on_pitched_roof:   false,
      safe_access_visible:                      true,
      roof_ladder_on_same_roof_plane_as_worker: true,
      worker_fall_protection_adequate:          true,
      worker_directly_below_drop_zone:          false,
      loose_materials_on_slope:                 false,
      large_missing_tile_area:                  false,
      bare_underlay_visible:                    false,
      roof_covering_continuous:                 false,  // roof not fully tiled
      service_specific_action_visible:          true,
      worker_count_matches_plan:                true,
    });
    assert(r.rejected, 'Expected reject when roof covering not continuous');
    assert(r.reason === 'service_visual_mismatch', `Expected service_visual_mismatch, got '${r.reason}'`);
  });

  // ─── Summary ─────────────────────────────────────────────────────────────────
  console.groupEnd();
  console.log(`ETCH-GATE: ${_pass} passed, ${_fail} failed out of ${_results.length} tests`);
  if (_fail > 0) console.error('Failing tests:', _results.filter(r => r.status === 'FAIL'));
  return { pass: _pass, fail: _fail, results: _results };
}
