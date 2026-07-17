/**
 * pipeline/prompt-scene-sanitizer.js
 * Strips internal planner/telemetry fields before the scene JSON is sent to
 * the rewriter or prompt builder.
 *
 * Fields removed:
 *   _pre_assigned_vehicle     — consumed by location-resolver; value like 'clearly_visible'
 *                               must not appear in the GPT payload alongside the resolved absent.
 *   _pre_assigned_composition — consumed by location-resolver; planner metadata.
 *   _capture_defects_resolved — used by _appendLockedFinalConstraints on _finalSceneObj
 *                               (the un-sanitized scene), never by the rewriter.
 *   _planned_vehicle_presence — RC-3 telemetry (original batch-planner value before suppression).
 *   _vehicle_suppression_reason — RC-3 telemetry.
 *
 * Fields deliberately kept:
 *   _matched_key, _matched_service — needed by rewriter/prompt-builder for métier context.
 *   photo_defects                  — public camera-defect list (set by _applySiteRealism).
 *   All resolved public fields     — composition, composition_desc, camera_distance,
 *                                    professional_vehicle_presence, location_type, etc.
 *
 * Single implementation shared between generate-image.js (production) and
 * carrelage-scenes-tests.js (tests).
 */

// Positive exterior vocabulary in assertion fields (not instructions)
const _EXT_POS_ASSERT_RE = /\b(?:facade|street|garden|outdoor|outside|open\s+sky|pavement|kerb|balcony|driveway)\b/i;

// Assertion fields that describe what IS in the scene (not what is forbidden)
const _ASSERTION_FIELDS = ['architecture', 'environment', 'composition_desc', 'camera_position', 'work_type'];

// Returns array of issue strings. Empty = clean. Does NOT scan location_forbidden
// (negative instructions are expected to contain exterior vocabulary).
function _validateInteriorPayload(jsonStr) {
  const issues = [];
  let s;
  try { s = JSON.parse(jsonStr); } catch { return issues; }
  if (s.setting !== 'interior') return issues;

  for (const f of _ASSERTION_FIELDS) {
    const val = s[f];
    if (typeof val === 'string' && _EXT_POS_ASSERT_RE.test(val)) {
      issues.push(`"${f}" contains positive exterior signal: "${val.slice(0, 80)}"`);
    }
  }
  if (Array.isArray(s.location_must_have)) {
    for (const el of s.location_must_have) {
      if (typeof el === 'string' && _EXT_POS_ASSERT_RE.test(el)) {
        issues.push(`location_must_have item contains positive exterior signal: "${el.slice(0, 80)}"`);
      }
    }
  }
  return issues;
}

function _sanitizeSceneForPrompt(jsonStr) {
  try {
    const s = JSON.parse(jsonStr);
    delete s._pre_assigned_vehicle;
    delete s._pre_assigned_composition;
    delete s._capture_defects_resolved;
    delete s._planned_vehicle_presence;
    delete s._vehicle_suppression_reason;
    return JSON.stringify(s);
  } catch { return jsonStr; }
}

export { _sanitizeSceneForPrompt, _validateInteriorPayload };
