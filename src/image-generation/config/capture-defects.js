/**
 * config/capture-defects.js — Phase 1 shadow copy (source active : app.js)
 * Copie stricte de CAPTURE_DEFECTS + CAPTURE_DEFECT_GROUPS (app.js lignes 11390–11409).
 * Ne pas modifier avant le cutover validé.
 */

const CAPTURE_DEFECTS = {
  slight_motion_blur:   { weight: 15, prompt: 'very slight handheld motion blur affecting a minor edge, without hiding the work' },
  soft_autofocus:       { weight: 18, prompt: 'ordinary smartphone autofocus with slightly soft secondary areas' },
  small_lens_smudge:    { weight: 10, prompt: 'a faint small lens smudge or hazy patch close to one edge' },
  finger_edge:          { weight:  5, prompt: 'a tiny out-of-focus fingertip intruding at one extreme corner, covering no work or safety detail' },
  jpeg_compression:     { weight: 25, prompt: 'subtle JPEG compression and ordinary smartphone processing' },
  sensor_noise:         { weight: 15, prompt: 'mild digital noise in darker or shadowed areas' },
  slight_tilt:          { weight: 18, prompt: 'slightly tilted handheld framing' },
  imperfect_crop:       { weight: 16, prompt: 'casual imperfect framing with one unimportant object partially cropped' },
  minor_exposure_error: { weight: 10, prompt: 'slightly imperfect automatic exposure with a mildly bright sky or dark corner' },
  light_dirt_speck:     { weight:  8, prompt: 'one tiny soft dirt speck near the outer edge of the image' },
};

// Same-family pairs are forbidden — prevents cumulating two similar-looking defects.
const CAPTURE_DEFECT_GROUPS = {
  optical_obstruction: ['small_lens_smudge', 'light_dirt_speck', 'finger_edge'],
  focus_motion:        ['soft_autofocus', 'slight_motion_blur'],
  framing:             ['slight_tilt', 'imperfect_crop'],
  digital_processing:  ['jpeg_compression', 'sensor_noise', 'minor_exposure_error'],
};

export { CAPTURE_DEFECTS, CAPTURE_DEFECT_GROUPS };
