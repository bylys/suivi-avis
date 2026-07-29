/**
 * debug/etancheite-gate-tests.js — ETCH-GATE1 to ETCH-GATE31
 * Service visual gate tests for the étanchéité cluster.
 * Verifies reject_conditions logic, alias routing, and worker count comparisons.
 * No real API calls — all tests are static/structural.
 * Loaded only when ?imageGenTests=1 is in the URL.
 */

import { SERVICE_VISUAL_GATE_RULES, _SERVICE_GATE_ALIASES } from '../safety/safety-rules.js';

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
  runTest('ETCH-GATE11', 'Acrotère: accepted — flat roof + parapet + upstand', () => {
    const r = evalGate('Étanchéité acrotère', {
      flat_roof_visible:             true,
      parapet_visible:               true,
      horizontal_membrane_visible:   true,
      vertical_upstand_visible:      true,
      upstand_treatment_visible:     true,
      worker_on_parapet_coping:      false,
      pitched_roof_visible:          false,
      service_visual_match:          true,
      worker_count_matches_plan:     true,
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
      worker_directly_below_drop_zone:        false,
      loose_materials_on_slope:               false,
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
      worker_directly_below_drop_zone:        false,
      loose_materials_on_slope:               false,
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
      safe_access_visible:                    true,
      access_type:                            'HOOKED_ROOF_LADDER',
      ridge_hooks_visible:                    true,
      worker_fall_protection_adequate:        true,
      worker_freely_standing_on_pitched_roof: false,
      worker_directly_below_drop_zone:        true,
      loose_materials_on_slope:               false,
      service_specific_action_visible:        true,
      second_worker_visible:                  true,
      worker_count_matches_plan:              true,
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
      worker_directly_below_drop_zone:        false,
      loose_materials_on_slope:               false,
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
      worker_directly_below_drop_zone:        false,
      loose_materials_on_slope:               false,
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
      worker_directly_below_drop_zone:        false,
      loose_materials_on_slope:               false,
      service_specific_action_visible:        true,
      second_worker_visible:                  true,
      worker_count_matches_plan:              true,   // var_workers=2, visible=2 → match
    };

    const r = evalGate(gateKey, visionResult);
    assert(!r.rejected,
      `End-to-end pipeline path must accept valid scene, got reject: ${r.reason}`);
  });

  // ─── Summary ─────────────────────────────────────────────────────────────────
  console.groupEnd();
  console.log(`ETCH-GATE: ${_pass} passed, ${_fail} failed out of ${_results.length} tests`);
  if (_fail > 0) console.error('Failing tests:', _results.filter(r => r.status === 'FAIL'));
  return { pass: _pass, fail: _fail, results: _results };
}
