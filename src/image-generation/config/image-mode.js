/**
 * config/image-mode.js — explicit image-generation mode (Opus 4.8 speed pass)
 *
 * Two explicit modes, NEVER a hidden heuristic:
 *   - production  (default): full resilience — up to 3 image attempts.
 *   - validation           : FAST-FAIL micro-tests — exactly 1 image attempt.
 *
 * IMPORTANT: both modes produce the SAME image (identical model / quality:high /
 * size 1536x1024 / ratio / format / compression / prompt / routing / worker planning /
 * gate / Vision). The real benchmark showed quality:medium gave NO speed gain, so the
 * mode difference is now the TEST WORKFLOW only: validation stops after a single
 * generation so a structural FAIL surfaces immediately instead of paying 2 extra
 * ~125 s generations hoping model variance yields a PASS.
 *
 * A normal application run stays in 'production'. 'validation' is opt-in only
 * (debug control window._setImageGenerationMode / test harness).
 */

// model / n / quality / size / output_format / output_compression are IDENTICAL across
// modes. Only maxImageAttempts differs (fast-fail vs resilience). Timeout is 300 s in
// both (a high-quality generation ~125 s must never be aborted+retried at 180 s).
const IMAGE_MODE_CONFIG = {
  production: { quality: 'high', size: '1536x1024', timeout: 300000, maxImageAttempts: 3 },
  validation: { quality: 'high', size: '1536x1024', timeout: 300000, maxImageAttempts: 1 },
};

let _mode = 'production';

function getImageMode() {
  return _mode;
}

// Explicit setter — only accepts the two known modes; anything else is ignored and
// leaves the current mode unchanged (defensive: never silently drop to validation).
function setImageMode(mode) {
  if (mode === 'production' || mode === 'validation') _mode = mode;
  return _mode;
}

// Resolve the config for an explicit mode, or the current global mode when omitted.
// Unknown values fall back to production (never accidentally medium).
function imageModeConfig(mode) {
  return IMAGE_MODE_CONFIG[mode] || IMAGE_MODE_CONFIG[_mode] || IMAGE_MODE_CONFIG.production;
}

export { IMAGE_MODE_CONFIG, getImageMode, setImageMode, imageModeConfig };
