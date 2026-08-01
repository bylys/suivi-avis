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
  const total       = tasks.length;
  const CONCURRENCY = 3;
  let doneCount = 0;
  let cursor    = 0;

  const updateProgress = () => {
    const ok   = tasks.filter(t => t.status === IMAGE_TASK_STATUS.SUCCESS).length;
    const fail = tasks.filter(t => TERMINAL_STATUSES.has(t.status) && t.status !== IMAGE_TASK_STATUS.SUCCESS).length;
    uiAdapter.updateProgress(doneCount, total, ok, fail);
  };
  updateProgress();

  const processTask = async (task) => {
    try {
      // ── Outer loop: image generation (max MAX_IMAGE_ATTEMPTS API calls) ─────
      for (let imageAttempt = 1; imageAttempt <= MAX_IMAGE_ATTEMPTS; imageAttempt++) {
        task.imageAttempt = imageAttempt;
        if (imageAttempt > 1) {
          task.status = IMAGE_TASK_STATUS.RETRYING;
          updateProgress();
          await sleep(imageAttempt * 2500);
        } else {
          task.status = IMAGE_TASK_STATUS.GENERATING;
          updateProgress();
        }

        // Step 1: one image API call — throws on network/API error
        let imageResult;
        try {
          imageResult = await generateImageOnly(task, apiKey, state.runId, { state, fetchImpl, readResponseImpl, rewritePromptImpl });
        } catch(e) {
          if (e._isPreflight) {
            // Preflight divergence: no Images call was made, no retry is useful.
            task.status = IMAGE_TASK_STATUS.FAILED;
            task.error  = `preflight_worker_count_mismatch (planned=${e._plannedWC} prompt=${e._promptWC})`;
            console.warn(`[PREFLIGHT BLOCK] taskId=${task.taskId} service=${task._planBase?._matched_service} planned=${e._plannedWC} prompt=${e._promptWC} — 0 Images calls, 0 retries`);
            return;
          }
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
          if (imageAttempt === MAX_IMAGE_ATTEMPTS) { task.status = IMAGE_TASK_STATUS.FAILED; return; }
          continue; // retry image generation
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
            const safety = await checkImageSafety(imageResult.b64, task._planBase._matched_key, apiKey, { fetchImpl, readResponseImpl, expectedWorkerCount: _expectedWC, matchedService: task._planBase._matched_service, accessConfiguration: task._resolved_access_configuration || null });
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
            console.log('[SAFETY TELEMETRY]', JSON.stringify({
              taskId:               task.taskId,
              service:              task._planBase._matched_service,
              imageAttempt,
              safetyAttempt,
              safety_rule_id:       task._planBase._matched_key,
              safety_reason_code:   _safetyReasonCode,
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
              active_pressure_washing_visible: safety.active_pressure_washing_visible ?? null,
              pressure_washer_visible:        safety.pressure_washer_visible       ?? null,
              lance_and_hose_coherent:        safety.lance_and_hose_coherent       ?? null,
              dirty_and_clean_zones_visible:  safety.dirty_and_clean_zones_visible ?? null,
              partial_work_state_visible:     safety.partial_work_state_visible    ?? null,
              jet_directed_safely:            safety.jet_directed_safely           ?? null,
            }));

            if (safety.checkFailed) {
              if (safetyAttempt < MAX_SAFETY_ATTEMPTS_PER_IMAGE) {
                await sleep(safetyAttempt * 1500); // wait, then retry Vision on same image
                continue;
              }
              // All Vision attempts failed — reject without new image generation
              state.counters.visionFailures++;
              task.status = IMAGE_TASK_STATUS.SAFETY_CHECK_FAILED;
              task.error  = safety.reason || 'safety check unavailable after 3 attempts';
              return;
            }

            if (!safety.safe && safety.severity === 'critical') {
              state.counters.criticalRejections++;
              task.error = safety.reason || 'critical safety violation';
              break; // exit inner loop → outer loop regenerates
            }

            safetyPassed = true;
            break;
          }

          if (!safetyPassed) {
            // Critical violation confirmed — regenerate a new image
            task._imageRetryReason = 'regenerate_after_safety_reject';
            if (imageAttempt === MAX_IMAGE_ATTEMPTS) { task.status = IMAGE_TASK_STATUS.REJECTED_SAFETY; return; }
            continue; // outer loop: new image generation
          }
        }

        // Step 3: SUCCESS — deduplicate by taskId before pushing
        if (runImages.some(img => img.taskId === task.taskId)) return;
        task.status = IMAGE_TASK_STATUS.SUCCESS;
        task.result = imageResult;
        state.counters.validated++;
        const imgEntry = { b64: imageResult.b64, url: imageResult.imgUrl, filename: imageResult.filename, taskId: task.taskId };
        runImages.push(imgEntry);
        uiAdapter.renderImage(imageResult.src, imageResult.filename, task.row?.fiche || task.row?.travaux || '');
        console.log(`[IMAGE SUCCESS] runId=${state.runId} taskId=${task.taskId} imageAttempt=${imageAttempt} imageCalls=${state.counters.imageCalls} visionCalls=${state.counters.visionCalls}`);
        return;
      }

      // Outer loop exhausted (only if every image attempt was a safety rejection)
      if (!TERMINAL_STATUSES.has(task.status)) {
        task.status = IMAGE_TASK_STATUS.FAILED;
        task.error  = task.error || 'all image attempts exhausted';
      }
    } finally {
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
