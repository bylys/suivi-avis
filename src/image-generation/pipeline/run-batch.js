/**
 * pipeline/run-batch.js — Phase 6 shadow copy (source active : app.js)
 * Orchestration du batch concurrent et factory du pipeline modulaire.
 * Verbatim — app.js lignes 13836–13963 (runImageBatch).
 * Injectable deps pour tests sans DOM ni réseau réel.
 * Ne pas modifier avant le cutover validé.
 */

import { IMAGE_TASK_STATUS, TERMINAL_STATUSES, MAX_IMAGE_ATTEMPTS, MAX_SAFETY_ATTEMPTS_PER_IMAGE } from './state.js';
import { generateImageOnly } from './generate-image.js';
import { checkImageSafety }  from './safety-check.js';
import { SAFETY_CHECK_RULES } from '../safety/safety-rules.js';

// ─── runImageBatch ────────────────────────────────────────────────────────────
// Same behaviour as _runImageBatch — app.js lines 13836–13963
// Injectable deps:
//   state            — mutable generation state (createGenerationState())
//   fetchImpl        — replaces _fetchWithTimeout
//   readResponseImpl — replaces _readResponseOnce
//   rewritePromptImpl— replaces _rewritePromptWithGPT(scene, key)
//   uiAdapter        — replaces direct DOM manipulation
//   sleep            — replaces _sleep(ms)
//   runImages        — array to push successful images into (default: [])
async function runImageBatch(tasks, apiKey, { state, fetchImpl, readResponseImpl, rewritePromptImpl, uiAdapter, sleep, runImages = [] }) {
  const total           = tasks.length;
  const CONCURRENCY     = 3;
  const batchStartedAt  = performance.now();
  let doneCount = 0;
  let cursor    = 0;

  const updateProgress = () => {
    const ok   = tasks.filter(t => t.status === IMAGE_TASK_STATUS.SUCCESS).length;
    const fail = tasks.filter(t => TERMINAL_STATUSES.has(t.status) && t.status !== IMAGE_TASK_STATUS.SUCCESS).length;
    uiAdapter.updateProgress(doneCount, total, ok, fail);
  };
  updateProgress();

  const processTask = async (task) => {
    const _now = () => performance.now();
    const _timing = {
      task_started_at:            _now(),
      queue_wait_ms:              0,
      generation_ms:              0,
      generation_retry_sleep_ms:  0,
      vision_ms:                  0,
      vision_retry_sleep_ms:      0,
      total_ms:                   0,
      generation_attempts:        0,
      vision_attempts:            0,
      safety_rejections:          0,
      technical_failures:         0,
    };
    _timing.queue_wait_ms = _timing.task_started_at - batchStartedAt;
    let _failureType = null;
    try {
      // ── Outer loop: image generation (max MAX_IMAGE_ATTEMPTS API calls) ─────
      for (let imageAttempt = 1; imageAttempt <= MAX_IMAGE_ATTEMPTS; imageAttempt++) {
        task.imageAttempt = imageAttempt;
        if (imageAttempt > 1) {
          task.status = IMAGE_TASK_STATUS.RETRYING;
          updateProgress();
          const _genRetrySleepStart = _now();
          await sleep(imageAttempt * 2500);
          _timing.generation_retry_sleep_ms += _now() - _genRetrySleepStart;
        } else {
          task.status = IMAGE_TASK_STATUS.GENERATING;
          updateProgress();
        }

        // Step 1: one image API call — throws on network/API error
        let imageResult;
        {
          const _genStart = _now();
          try {
            imageResult = await generateImageOnly(task, apiKey, state.runId, { state, fetchImpl, readResponseImpl, rewritePromptImpl });
            _timing.generation_attempts += 1;
            _timing.generation_ms += _now() - _genStart;
          } catch(e) {
            if (e._isPreflight) {
              // Preflight divergence: no Images call was made, no retry is useful.
              _failureType = 'PREFLIGHT_FAILURE';
              task.status = IMAGE_TASK_STATUS.FAILED;
              task.error  = `preflight_worker_count_mismatch (planned=${e._plannedWC} prompt=${e._promptWC})`;
              console.warn(`[PREFLIGHT BLOCK] taskId=${task.taskId} service=${task._planBase?._matched_service} planned=${e._plannedWC} prompt=${e._promptWC} — 0 Images calls, 0 retries`);
              return;
            }
            _timing.generation_attempts += 1;
            _timing.generation_ms += _now() - _genStart;
            _timing.technical_failures += 1;
            console.log('[IMAGE RETRY TELEMETRY]', JSON.stringify({
              taskId: task.taskId,
              image_attempt: imageAttempt,
              original_task_worker_count: task._pre_assigned_worker_count ?? null,
              retry_task_worker_count: task._pre_assigned_worker_count ?? null,
              worker_count_source: 'batch_preassignment',
              error: e.message,
            }));
            task.error = e.message;
            task._imageRetryReason = 'retry_image_error';
            if (imageAttempt === MAX_IMAGE_ATTEMPTS) {
              _failureType = 'IMAGE_API_FAILURE';
              task.status = IMAGE_TASK_STATUS.FAILED;
              return;
            }
            continue; // retry image generation
          }
        }

        // Step 2: safety check — retry Vision only, never regenerate the image
        if (imageResult.b64 && SAFETY_CHECK_RULES[task._planBase._matched_key]) {
          let safetyPassed = false;

          // ── Inner loop: Vision retries on the SAME image ─────────────────
          for (let safetyAttempt = 1; safetyAttempt <= MAX_SAFETY_ATTEMPTS_PER_IMAGE; safetyAttempt++) {
            task.status = IMAGE_TASK_STATUS.CHECKING_SAFETY;
            updateProgress();
            state.counters.visionCalls++;
            state.imageCallLog.push({ type: 'safety', runId: state.runId, taskId: task.taskId, imageAttempt, safetyAttempt });
            console.log(`[SAFETY REQUEST] runId=${state.runId} taskId=${task.taskId} imageAttempt=${imageAttempt} safetyAttempt=${safetyAttempt}`);

            const _assignedWC  = Number(task._pre_assigned_worker_count);
            const _expectedWC  = (task._pre_assigned_worker_presence === 'workers' && Number.isInteger(_assignedWC) && _assignedWC >= 1)
              ? _assignedWC : 0;
            const _visionStart = _now();
            _timing.vision_attempts += 1;
            const safety = await checkImageSafety(imageResult.b64, task._planBase._matched_key, apiKey, { fetchImpl, readResponseImpl, expectedWorkerCount: _expectedWC, matchedService: task._planBase._matched_service, accessConfiguration: task._resolved_access_configuration || null });
            const _visionMsThis = _now() - _visionStart;
            _timing.vision_ms += _visionMsThis;
            const _safetyReasonCode = safety.checkFailed ? 'check_failed'
              : (!safety.safe && safety.reason === 'worker_count_mismatch')         ? 'worker_count_mismatch'
              : (!safety.safe && safety.reason === 'forbidden_roof_scene')          ? 'forbidden_roof_scene'
              : (!safety.safe && safety.reason === 'missing_horizontal_membrane')   ? 'missing_horizontal_membrane'
              : (!safety.safe && safety.reason === 'missing_vertical_upstand')      ? 'missing_vertical_upstand'
              : (!safety.safe && safety.reason === 'missing_upstand_treatment')     ? 'missing_upstand_treatment'
              : (!safety.safe && safety.reason === 'service_visual_mismatch')       ? 'service_visual_mismatch'
              : (!safety.safe && safety.severity === 'critical') ? 'critical_violation'
              : 'passed';
            // Store rejected acrotère images for debug inspection
            const _isAcrotere = task._planBase._matched_service === 'Étanchéité acrotère';
            if (_isAcrotere && imageResult?.b64 && _safetyReasonCode !== 'passed') {
              if (!globalThis._acrotereRejectedImages) globalThis._acrotereRejectedImages = [];
              globalThis._acrotereRejectedImages.push({
                attempt: imageAttempt, safetyAttempt, reason: _safetyReasonCode,
                src: `data:image/jpeg;base64,${imageResult.b64}`,
              });
            }
            // Store ESC check_failed images for post-fix reuse (same pattern as acrotère)
            const _isEscalier = task._planBase._matched_service === 'Escalier béton';
            if (_isEscalier && imageResult?.b64) {
              if (!globalThis._escalierLastImage) globalThis._escalierLastImage = null;
              globalThis._escalierLastImage = { attempt: imageAttempt, safetyAttempt, b64: imageResult.b64, src: `data:image/jpeg;base64,${imageResult.b64}` };
            }
            console.log('[SAFETY TELEMETRY]', JSON.stringify({
              taskId:               task.taskId,
              service:              task._planBase._matched_service,
              imageAttempt,
              safetyAttempt,
              safety_rule_id:       task._planBase._matched_key,
              safety_reason_code:   _safetyReasonCode,
              check_failed_reason:  safety.checkFailed ? (safety.reason ?? null) : null,
              check_failed_type:    safety.checkFailed ? (safety.check_failed_type ?? null) : null,
              safety_result:        safety.checkFailed ? 'check_failed'
                                  : (!safety.safe && safety.severity === 'critical') ? 'reject'
                                  : 'pass',
              vision_reported_safe:           safety.vision_reported_safe          ?? null,
              vision_reported_reason:         safety.vision_reported_reason        ?? null,
              computed_generic_worker_match:  safety.computed_generic_worker_match ?? null,
              computed_final_safe:            safety.computed_final_safe           ?? null,
              computed_final_reason:          safety.computed_final_reason         ?? null,
              expected_worker_count:          _expectedWC,
              resolved_worker_count:          safety.visible_worker_count          ?? null,
              worker_count_source:            'batch_preassignment',
              hedge_visible:                  safety.hedge_visible                 ?? null,
              worker_on_roof:                 safety.worker_on_roof                ?? null,
              service_visual_match:           safety.service_visual_match          ?? null,
              horizontal_membrane_visible:    safety.horizontal_membrane_visible   ?? null,
              vertical_upstand_visible:       safety.vertical_upstand_visible      ?? null,
              upstand_treatment_visible:      safety.upstand_treatment_visible     ?? null,
              first_failed_gate_field:        safety.first_failed_gate_field       ?? null,
              service_gate:                   safety.service_gate                  ?? null,
              decision_source:                safety.decision_source               ?? null,
              terrace_surface_visible:         safety.terrace_surface_visible         ?? null,
              active_surface_cleaning_visible: safety.active_surface_cleaning_visible ?? null,
              cleaning_machine_visible:        safety.cleaning_machine_visible        ?? null,
              terrace_context_visible:         safety.terrace_context_visible         ?? null,
              facade_surface_visible:               safety.facade_surface_visible               ?? null,
              active_facade_cleaning_visible:       safety.active_facade_cleaning_visible       ?? null,
              dirty_and_clean_facade_zones_visible: safety.dirty_and_clean_facade_zones_visible ?? null,
              work_area_reachable_from_ground:      safety.work_area_reachable_from_ground      ?? null,
              cleaning_equipment_visible:           safety.cleaning_equipment_visible           ?? null,
              hose_or_sprayer_coherent:             safety.hose_or_sprayer_coherent             ?? null,
              jet_or_product_directed_safely:       safety.jet_or_product_directed_safely       ?? null,
              worker_on_ladder_or_scaffold:         safety.worker_on_ladder_or_scaffold         ?? null,
              active_hydrofuge_application_visible:         safety.active_hydrofuge_application_visible         ?? null,
              hydrofuge_application_tool_visible:           safety.hydrofuge_application_tool_visible           ?? null,
              treated_and_untreated_facade_zones_visible:   safety.treated_and_untreated_facade_zones_visible   ?? null,
              transparent_or_subtle_product_effect_visible: safety.transparent_or_subtle_product_effect_visible ?? null,
              original_facade_texture_remains_visible:      safety.original_facade_texture_remains_visible      ?? null,
              pressure_washing_visible:                     safety.pressure_washing_visible                     ?? null,
              dirty_water_runoff_visible:                   safety.dirty_water_runoff_visible                   ?? null,
              opaque_paint_application_visible:             safety.opaque_paint_application_visible             ?? null,
              fresh_render_application_visible:             safety.fresh_render_application_visible             ?? null,
              active_pressure_washing_visible: safety.active_pressure_washing_visible ?? null,
              pressure_washer_visible:        safety.pressure_washer_visible       ?? null,
              lance_and_hose_coherent:        safety.lance_and_hose_coherent       ?? null,
              dirty_and_clean_zones_visible:  safety.dirty_and_clean_zones_visible ?? null,
              partial_work_state_visible:     safety.partial_work_state_visible    ?? null,
              jet_directed_safely:            safety.jet_directed_safely           ?? null,
              wall_opening_visible:                        safety.wall_opening_visible                        ?? null,
              lintel_visible:                              safety.lintel_visible                              ?? null,
              lintel_seated_on_both_bearings:              safety.lintel_seated_on_both_bearings              ?? null,
              sufficient_lateral_bearing_visible:          safety.sufficient_lateral_bearing_visible          ?? null,
              temporary_supports_visible:                  safety.temporary_supports_visible                  ?? null,
              masonry_above_supported:                     safety.masonry_above_supported                     ?? null,
              active_lintel_adjustment_visible:            safety.active_lintel_adjustment_visible            ?? null,
              bearing_bed_or_adjustment_evidence_visible:  safety.bearing_bed_or_adjustment_evidence_visible  ?? null,
              workers_stable_on_ground:                    safety.workers_stable_on_ground                    ?? null,
              worker_beneath_unsupported_masonry:          safety.worker_beneath_unsupported_masonry          ?? null,
              lintel_held_overhead_manually:               safety.lintel_held_overhead_manually               ?? null,
              ladder_used_as_workstation:                  safety.ladder_used_as_workstation                  ?? null,
              falling_debris_hazard_visible:               safety.falling_debris_hazard_visible               ?? null,
              fresh_mortar_at_bearings_visible:            safety.fresh_mortar_at_bearings_visible            ?? null,
              residential_building_entrance_visible:          safety.residential_building_entrance_visible          ?? null,
              small_exterior_concrete_stair_context_visible:  safety.small_exterior_concrete_stair_context_visible  ?? null,
              stepped_stair_formwork_visible:                 safety.stepped_stair_formwork_visible                 ?? null,
              distinct_riser_boards_visible:                  safety.distinct_riser_boards_visible                  ?? null,
              side_formwork_panels_visible:                   safety.side_formwork_panels_visible                   ?? null,
              three_or_four_step_profile_visible:             safety.three_or_four_step_profile_visible             ?? null,
              ground_supported_compacted_base_visible:        safety.ground_supported_compacted_base_visible        ?? null,
              formwork_bracing_or_stakes_visible:             safety.formwork_bracing_or_stakes_visible             ?? null,
              active_stair_formwork_adjustment_visible:       safety.active_stair_formwork_adjustment_visible       ?? null,
              worker_standing_on_formwork:                    safety.worker_standing_on_formwork                    ?? null,
              suspended_stair_formwork_visible:               safety.suspended_stair_formwork_visible               ?? null,
              fresh_concrete_filling_all_steps_visible:       safety.fresh_concrete_filling_all_steps_visible       ?? null,
              threshold_only_work_visible:                    safety.threshold_only_work_visible                    ?? null,
              large_slab_area_dominant:                       safety.large_slab_area_dominant                       ?? null,
              lintel_work_visible:                            safety.lintel_work_visible                            ?? null,
              stair_reinforcement_visible:                    safety.stair_reinforcement_visible                    ?? null,
              reinforcement_cage_visible:                safety.reinforcement_cage_visible                ?? null,
              longitudinal_rebar_visible:                safety.longitudinal_rebar_visible                ?? null,
              regular_stirrups_visible:                  safety.regular_stirrups_visible                  ?? null,
              tying_tool_in_contact_with_rebar:          safety.tying_tool_in_contact_with_rebar          ?? null,
              partial_rebar_assembly_visible:            safety.partial_rebar_assembly_visible            ?? null,
              rebar_supported_on_low_stands:             safety.rebar_supported_on_low_stands             ?? null,
              worker_standing_on_rebar:                  safety.worker_standing_on_rebar                  ?? null,
              foundation_trench_dominant:                safety.foundation_trench_dominant                ?? null,
              fresh_concrete_visible:                    safety.fresh_concrete_visible                    ?? null,
              concrete_pouring_visible:                  safety.concrete_pouring_visible                  ?? null,
              formwork_removal_visible:                  safety.formwork_removal_visible                  ?? null,
              worker_stable_at_ground_level:             safety.worker_stable_at_ground_level             ?? null,
              visible_worker_count:                      safety.visible_worker_count                      ?? null,
              shallow_foundation_trench_visible:         safety.shallow_foundation_trench_visible         ?? null,
              strip_footing_rebar_cage_visible:          safety.strip_footing_rebar_cage_visible          ?? null,
              rebar_stirrups_visible:                    safety.rebar_stirrups_visible                    ?? null,
              rebar_supported_off_soil_with_visible_cover_supports: safety.rebar_supported_off_soil_with_visible_cover_supports ?? null,
              active_rebar_tying_visible:                safety.active_rebar_tying_visible                ?? null,
              layout_stakes_or_strings_visible:          safety.layout_stakes_or_strings_visible          ?? null,
              partial_foundation_progress_visible:       safety.partial_foundation_progress_visible       ?? null,
              excavated_soil_visible:                    safety.excavated_soil_visible                    ?? null,
              worker_inside_trench:                      safety.worker_inside_trench                      ?? null,
              deep_unprotected_trench_visible:           safety.deep_unprotected_trench_visible           ?? null,
              slab_formwork_visible:                     safety.slab_formwork_visible                     ?? null,
              horizontal_slab_mesh_dominant:             safety.horizontal_slab_mesh_dominant             ?? null,
              fresh_concrete_poured_visible:                       safety.fresh_concrete_poured_visible                       ?? null,
              // Coulage dalle gate fields
              fresh_concrete_actively_poured_visible:              safety.fresh_concrete_actively_poured_visible              ?? null,
              concrete_delivery_source_visible:                    safety.concrete_delivery_source_visible                    ?? null,
              delivery_source_connected_to_pour:                   safety.delivery_source_connected_to_pour                   ?? null,
              partial_poured_and_unpoured_zones_visible:           safety.partial_poured_and_unpoured_zones_visible           ?? null,
              reinforcement_visible_in_unpoured_zone:              safety.reinforcement_visible_in_unpoured_zone              ?? null,
              active_concrete_screeding_or_spreading_visible:      safety.active_concrete_screeding_or_spreading_visible      ?? null,
              workers_stable_outside_fresh_concrete:               safety.workers_stable_outside_fresh_concrete               ?? null,
              worker_standing_in_fresh_concrete:                        safety.worker_standing_in_fresh_concrete                        ?? null,
              reinforcement_unstable_or_displaced_by_worker:           safety.reinforcement_unstable_or_displaced_by_worker           ?? null,
              reinforcement_insufficiently_supported:                   safety.reinforcement_insufficiently_supported                   ?? null,
              visible_mesh_deformation_under_worker:                    safety.visible_mesh_deformation_under_worker                    ?? null,
              worker_posture_unstable_on_reinforcement:                 safety.worker_posture_unstable_on_reinforcement                 ?? null,
              protruding_rebar_impalement_hazard_visible:               safety.protruding_rebar_impalement_hazard_visible               ?? null,
              prepour_rebar_preparation_only:                           safety.prepour_rebar_preparation_only                           ?? null,
              completed_slab_dominant:                             safety.completed_slab_dominant                             ?? null,
              large_industrial_construction_dominant:              safety.large_industrial_construction_dominant              ?? null,
              // Mur brique gate fields
              clay_brick_wall_visible:                   safety.clay_brick_wall_visible                   ?? null,
              red_or_orange_clay_bricks_visible:         safety.red_or_orange_clay_bricks_visible         ?? null,
              active_brick_laying_visible:               safety.active_brick_laying_visible               ?? null,
              wall_alignment_tools_visible:              safety.wall_alignment_tools_visible              ?? null,
              stone_wall_visible:                        safety.stone_wall_visible                        ?? null,
              natural_stone_wall_visible:                safety.natural_stone_wall_visible                ?? null,
              open_or_degraded_stone_joints_visible:     safety.open_or_degraded_stone_joints_visible     ?? null,
              active_stone_repointing_visible:           safety.active_stone_repointing_visible           ?? null,
              pointing_tool_in_contact_with_joint:       safety.pointing_tool_in_contact_with_joint       ?? null,
              fresh_mortar_inside_joints_visible:        safety.fresh_mortar_inside_joints_visible        ?? null,
              treated_and_untreated_joint_zones_visible: safety.treated_and_untreated_joint_zones_visible ?? null,
              original_stones_remain_uncovered:          safety.original_stones_remain_uncovered          ?? null,
              new_stone_wall_construction_visible:       safety.new_stone_wall_construction_visible       ?? null,
              render_or_plaster_application_visible:     safety.render_or_plaster_application_visible     ?? null,
              single_crack_repair_visible:               safety.single_crack_repair_visible               ?? null,
              // Rejointoiement générique (material-agnostic) gate fields
              masonry_wall_visible:                      safety.masonry_wall_visible                      ?? null,
              old_joints_visible:                        safety.old_joints_visible                        ?? null,
              repointing_action_visible:                 safety.repointing_action_visible                 ?? null,
              fresh_joint_mortar_visible:                safety.fresh_joint_mortar_visible                ?? null,
              masonry_faces_remain_uncovered:            safety.masonry_faces_remain_uncovered            ?? null,
              new_wall_construction_visible:             safety.new_wall_construction_visible             ?? null,
              continuous_coating_or_render_visible:      safety.continuous_coating_or_render_visible      ?? null,
              // Peinture façade gate fields
              exterior_building_facade_visible:                       safety.exterior_building_facade_visible                       ?? null,
              masonry_or_rendered_facade_surface_visible:             safety.masonry_or_rendered_facade_surface_visible             ?? null,
              facade_surface_dominant:                                safety.facade_surface_dominant                                ?? null,
              active_roller_contact_with_facade_visible:              safety.active_roller_contact_with_facade_visible              ?? null,
              extension_pole_visible:                                 safety.extension_pole_visible                                 ?? null,
              partial_painted_and_unpainted_facade_zones_visible:     safety.partial_painted_and_unpainted_facade_zones_visible     ?? null,
              fresh_facade_paint_visible:                             safety.fresh_facade_paint_visible                             ?? null,
              paint_bucket_or_tray_visible:                           safety.paint_bucket_or_tray_visible                           ?? null,
              shutters_or_shutter_panels_dominant:                    safety.shutters_or_shutter_panels_dominant                    ?? null,
              gate_or_fence_dominant:                                 safety.gate_or_fence_dominant                                 ?? null,
              exterior_woodwork_painting_dominant:                    safety.exterior_woodwork_painting_dominant                    ?? null,
              interior_context_visible:                               safety.interior_context_visible                               ?? null,
              completed_facade_dominant:                              safety.completed_facade_dominant                              ?? null,
              decorative_render_application_visible:                  safety.decorative_render_application_visible                  ?? null,
              spray_painting_dominant:                                safety.spray_painting_dominant                                ?? null,
              worker_on_ladder:                                       safety.worker_on_ladder                                       ?? null,
              worker_on_step_ladder:                                  safety.worker_on_step_ladder                                  ?? null,
              worker_on_scaffold:                                     safety.worker_on_scaffold                                     ?? null,
              worker_stable_on_ground:                                safety.worker_stable_on_ground                                ?? null,
              worker_count_match:                                     safety.worker_count_match                                     ?? null,
              vision_ms_this_attempt:                                 Math.round(_visionMsThis),
            }));

            if (safety.checkFailed) {
              if (safetyAttempt < MAX_SAFETY_ATTEMPTS_PER_IMAGE) {
                const _visSleepStart = _now();
                await sleep(safetyAttempt * 1500); // wait, then retry Vision on same image
                _timing.vision_retry_sleep_ms += _now() - _visSleepStart;
                continue;
              }
              // All Vision attempts failed — reject without new image generation
              state.counters.visionFailures++;
              _timing.technical_failures += 1;
              _failureType = safety.check_failed_type === 'structured_evidence_incomplete'
                ? 'STRUCTURED_EVIDENCE_INCOMPLETE'
                : 'VISION_TECHNICAL_FAILURE';
              task.status = IMAGE_TASK_STATUS.SAFETY_CHECK_FAILED;
              task.error  = safety.reason || 'safety check unavailable after 3 attempts';
              return;
            }

            if (!safety.safe && safety.severity === 'critical') {
              state.counters.criticalRejections++;
              _timing.safety_rejections += 1;
              task.error = safety.reason || 'critical safety violation';
              break; // exit inner loop → outer loop regenerates
            }

            safetyPassed = true;
            break;
          }

          if (!safetyPassed) {
            // Critical violation confirmed — regenerate a new image
            task._imageRetryReason = 'regenerate_after_safety_reject';
            if (imageAttempt === MAX_IMAGE_ATTEMPTS) {
              _failureType = 'VISUAL_REJECT';
              task.status = IMAGE_TASK_STATUS.REJECTED_SAFETY;
              return;
            }
            continue; // outer loop: new image generation
          }
        }

        // Step 3: SUCCESS — deduplicate by taskId before pushing
        if (runImages.some(img => img.taskId === task.taskId)) return;
        _failureType = 'SUCCESS';
        task.status = IMAGE_TASK_STATUS.SUCCESS;
        task.result = imageResult;
        state.counters.validated++;
        const imgEntry = { b64: imageResult.b64, url: imageResult.imgUrl, filename: imageResult.filename, taskId: task.taskId };
        runImages.push(imgEntry);
        uiAdapter.renderImage(imageResult.src, imageResult.filename, task.row?.fiche || task.row?.travaux || '');
        console.log('[IMAGE SUCCESS]', JSON.stringify({
          runId:                        state.runId,
          taskId:                       task.taskId,
          service:                      task._planBase?._matched_service,
          imageAttempt,
          imageCalls:                   state.counters.imageCalls,
          visionCalls:                  state.counters.visionCalls,
          failure_type:                 'SUCCESS',
          generation_ms:                Math.round(_timing.generation_ms),
          vision_ms:                    Math.round(_timing.vision_ms),
          vision_retry_sleep_ms:        Math.round(_timing.vision_retry_sleep_ms),
          generation_retry_sleep_ms:    Math.round(_timing.generation_retry_sleep_ms),
          generation_attempts:          _timing.generation_attempts,
          vision_attempts:              _timing.vision_attempts,
          safety_rejections:            _timing.safety_rejections,
        }));
        return;
      }

      // Outer loop exhausted (only if every image attempt was a safety rejection)
      if (!TERMINAL_STATUSES.has(task.status)) {
        task.status = IMAGE_TASK_STATUS.FAILED;
        task.error  = task.error || 'all image attempts exhausted';
      }
    } finally {
      _timing.total_ms  = _now() - _timing.task_started_at;
      task._timing      = _timing;
      task._failureType = _failureType;
      if (_failureType && _failureType !== 'SUCCESS') {
        console.log('[IMAGE FAILURE]', JSON.stringify({
          runId:                        state.runId,
          taskId:                       task.taskId,
          service:                      task._planBase?._matched_service,
          failure_type:                 _failureType,
          total_ms:                     Math.round(_timing.total_ms),
          generation_ms:                Math.round(_timing.generation_ms),
          vision_ms:                    Math.round(_timing.vision_ms),
          vision_retry_sleep_ms:        Math.round(_timing.vision_retry_sleep_ms),
          generation_retry_sleep_ms:    Math.round(_timing.generation_retry_sleep_ms),
          generation_attempts:          _timing.generation_attempts,
          vision_attempts:              _timing.vision_attempts,
          safety_rejections:            _timing.safety_rejections,
          technical_failures:           _timing.technical_failures,
        }));
      }
      doneCount++;
      updateProgress();
      uiAdapter.onTaskDone(task, tasks);
    }
  };

  const runWorker = async () => {
    while (cursor < tasks.length) {
      const task = tasks[cursor++];
      await processTask(task);
    }
  };

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, total) }, () => runWorker()));

  // Sentinel: any non-terminal task means processTask exited early
  for (const task of tasks) {
    if (!TERMINAL_STATUSES.has(task.status)) {
      task.status = IMAGE_TASK_STATUS.FAILED;
      task.error  = task.error || 'task did not complete';
    }
  }

  // Batch timing summary
  const timedTasks = tasks.filter(t => t._timing);
  if (timedTasks.length > 0) {
    const vals = f => timedTasks.map(t => t._timing[f]).sort((a, b) => a - b);
    const avg  = arr => Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);
    const pct  = (arr, p) => arr[Math.floor((p / 100) * (arr.length - 1))];
    const genMs   = vals('generation_ms');
    const visMs   = vals('vision_ms');
    const totMs   = vals('total_ms');
    console.log('[BATCH TIMING SUMMARY]', JSON.stringify({
      runId:               state.runId,
      task_count:          timedTasks.length,
      batch_duration_ms:   Math.round(performance.now() - batchStartedAt),
      generation_ms_avg:   avg(genMs),
      generation_ms_max:   Math.round(genMs[genMs.length - 1]),
      generation_ms_p50:   Math.round(pct(genMs, 50)),
      generation_ms_p95:   Math.round(pct(genMs, 95)),
      vision_ms_avg:       avg(visMs),
      vision_ms_max:       Math.round(visMs[visMs.length - 1]),
      vision_ms_p50:       Math.round(pct(visMs, 50)),
      vision_ms_p95:       Math.round(pct(visMs, 95)),
      total_ms_avg:        avg(totMs),
      total_ms_max:        Math.round(totMs[totMs.length - 1]),
      success_count:       timedTasks.filter(t => t._failureType === 'SUCCESS').length,
      failure_count:       timedTasks.filter(t => t._failureType && t._failureType !== 'SUCCESS').length,
    }));
  }

  return runImages;
}

// ─── createImagePipeline ─────────────────────────────────────────────────────
// Factory exposing a fully injectable pipeline for shadow testing.
// deps:
//   fetchImpl        — network fetch (injectable for tests)
//   readResponseImpl — response reader
//   rewritePromptImpl— prompt rewriter (network, injectable)
//   uiAdapter        — UI side-effects adapter
//   state            — mutable generation state
//   sleep            — delay function (injectable for tests)
function createImagePipeline({ fetchImpl, readResponseImpl, rewritePromptImpl, uiAdapter, state, sleep = (ms) => new Promise(r => setTimeout(r, ms)) }) {
  return {
    generateImageOnly: (task, apiKey, runId) =>
      generateImageOnly(task, apiKey, runId, { state, fetchImpl, readResponseImpl, rewritePromptImpl }),
    runImageBatch: (tasks, apiKey, runImages = []) =>
      runImageBatch(tasks, apiKey, { state, fetchImpl, readResponseImpl, rewritePromptImpl, uiAdapter, sleep, runImages }),
  };
}

export { runImageBatch, createImagePipeline };
