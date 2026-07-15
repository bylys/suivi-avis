/**
 * config/compositions.js — Phase 1 shadow copy (source active : app.js)
 * Copie stricte de PHOTO_COMPOSITIONS, _COMPOSITION_DIST, CAMERA_COMPOSITIONS,
 * COMPOSITION_RULES_BY_METIER (app.js lignes 11120–11367).
 * Ne pas modifier avant le cutover validé.
 */

// weight=0 means used only via per-métier override, not in the default draw.
const PHOTO_COMPOSITIONS = {
  close_detail:           { weight: 20, min_workers: 0, description: 'tight close-up on the specific work detail — tool in use, material, join, or repair point fills most of the frame, camera 20–50 cm from the subject' },
  medium_intervention:    { weight: 30, min_workers: 0, description: 'medium shot showing the worker and immediate work area — activity readable, surroundings partially visible, 1–3 m from the main subject' },
  wide_worksite:          { weight: 30, min_workers: 0, description: 'wide shot of the full worksite showing scale — building, vehicle, or garden entirely visible in context, 5–15 m back' },
  contextual_overview:    { weight: 20, min_workers: 0, description: 'establishing shot — environment as important as the work, showing neighbourhood, road type, or property context, 10–30 m back' },
  worker_action:          { weight:  0, min_workers: 1, description: 'worker caught in natural motion — tool engaged, body in movement, no eye contact with camera, 1–4 m from the worker' },
  vehicle_arrival:        { weight:  0, min_workers: 0, description: 'professional service vehicle clearly visible — van, tow truck, or service vehicle parked near the work location, 5–20 m back' },
  equipment_from_vehicle: { weight:  0, min_workers: 0, description: 'equipment being unloaded or laid out from the open service vehicle — tools visible, vehicle rear open, 2–6 m' },
};

// Per-métier composition weight distribution — must sum to 100.
const _COMPOSITION_DIST = {
  default: {
    close_detail:        20,
    medium_intervention: 30,
    wide_worksite:       30,
    contextual_overview: 20,
  },
  depannage_auto: {
    close_detail:           10,
    medium_intervention:    25,
    wide_worksite:          30,
    contextual_overview:    20,
    vehicle_arrival:        10,
    equipment_from_vehicle:  5,
  },
};

// ─── Camera composition library (distance + frame constraints) ───────────────
const CAMERA_COMPOSITIONS = {
  close_detail: {
    distance: 'approximately 1.5 to 2 metres',
    subject_max_frame_percent: 55,
    environment_min_frame_percent: 20,
    forbidden: [
      'extreme macro photography',
      'one tool filling most of the frame',
      'camera pressed directly against the work surface',
      'scene with no readable surroundings',
    ],
  },
  medium_intervention: {
    distance: 'approximately 2.5 to 4 metres',
    subject_max_frame_percent: 65,
    environment_min_frame_percent: 25,
    required: [
      'the active work is readable',
      'a substantial part of the worksite is visible',
      'some surrounding context remains visible',
    ],
  },
  wide_worksite: {
    distance: 'approximately 5 to 8 metres',
    subject_max_frame_percent: 50,
    environment_min_frame_percent: 40,
    required: [
      'the overall worksite is visible',
      'the building, vehicle, garden or room remains identifiable',
      'workers and professional vehicle are visible when selected',
    ],
  },
  contextual_overview: {
    distance: 'approximately 6 to 12 metres',
    subject_max_frame_percent: 40,
    environment_min_frame_percent: 50,
    required: [
      'the work occupies only part of the frame',
      'the location is immediately understandable',
      'the photo feels casually documented rather than composed',
    ],
  },
  worker_action: {
    distance: 'approximately 1 to 4 metres',
    subject_max_frame_percent: 65,
    environment_min_frame_percent: 20,
    required: [
      'the worker is caught in natural motion',
      'tool is engaged or body is in movement',
      'no eye contact with camera',
    ],
  },
  vehicle_arrival: {
    distance: 'approximately 5 to 20 metres',
    subject_max_frame_percent: 50,
    environment_min_frame_percent: 35,
    required: [
      'professional service vehicle clearly visible',
      'location context visible around the vehicle',
    ],
  },
  equipment_from_vehicle: {
    distance: 'approximately 2 to 6 metres',
    subject_max_frame_percent: 55,
    environment_min_frame_percent: 25,
    required: [
      'equipment being unloaded or laid out from open vehicle',
      'tools visible, vehicle rear open',
    ],
  },
};

// ─── Per-métier composition rules ─────────────────────────────────────────────
const COMPOSITION_RULES_BY_METIER = {
  toiture: {
    allowed_compositions: ['close_detail', 'medium_intervention', 'wide_worksite', 'contextual_overview'],
    preferred_compositions: ['medium_intervention', 'wide_worksite', 'contextual_overview'],
    close_detail_max_ratio: 0.20,
    minimum_contextual_images_per_batch: 1,
    minimum_worker_images_per_active_batch: 1,
    vehicle_rules: { placement: 'parked at street level near the building, never on the roof' },
    forbidden_framing: ['tile filling most of the frame with no surroundings', 'single tool as hero shot', 'macro photo of slate or flashing with no wider context'],
  },
  etancheite: {
    allowed_compositions: ['close_detail', 'medium_intervention', 'wide_worksite', 'contextual_overview'],
    preferred_compositions: ['medium_intervention', 'wide_worksite'],
    close_detail_max_ratio: 0.20,
    minimum_contextual_images_per_batch: 1,
    minimum_worker_images_per_active_batch: 1,
    vehicle_rules: {},
    forbidden_framing: ['roll of membrane as hero shot', 'torch alone in frame'],
  },
  nettoyage_toiture: {
    allowed_compositions: ['close_detail', 'medium_intervention', 'wide_worksite', 'contextual_overview'],
    preferred_compositions: ['medium_intervention', 'wide_worksite'],
    close_detail_max_ratio: 0.20,
    minimum_contextual_images_per_batch: 1,
    minimum_worker_images_per_active_batch: 1,
    vehicle_rules: {},
    forbidden_framing: ['pressure lance as hero shot'],
  },
  nettoyage_gouttieres: {
    allowed_compositions: ['close_detail', 'medium_intervention', 'wide_worksite', 'contextual_overview'],
    preferred_compositions: ['medium_intervention', 'wide_worksite'],
    close_detail_max_ratio: 0.25,
    minimum_contextual_images_per_batch: 1,
    minimum_worker_images_per_active_batch: 1,
    vehicle_rules: {},
    forbidden_framing: ['macro photo of gutter channel alone'],
  },
  elagage: {
    allowed_compositions: ['medium_intervention', 'wide_worksite', 'contextual_overview', 'worker_action'],
    preferred_compositions: ['wide_worksite', 'medium_intervention'],
    close_detail_max_ratio: 0.10,
    minimum_contextual_images_per_batch: 1,
    minimum_worker_images_per_active_batch: 1,
    vehicle_rules: {},
    forbidden_framing: ['chainsaw as hero shot', 'rope detail alone', 'single branch detail with no surroundings'],
  },
  abattage: {
    allowed_compositions: ['wide_worksite', 'contextual_overview', 'medium_intervention', 'worker_action'],
    preferred_compositions: ['wide_worksite', 'contextual_overview'],
    close_detail_max_ratio: 0.10,
    minimum_contextual_images_per_batch: 1,
    minimum_worker_images_per_active_batch: 1,
    vehicle_rules: {},
    forbidden_framing: ['chain detail alone', 'stump alone filling frame', 'chainsaw filling frame'],
  },
  paysagiste: {
    allowed_compositions: ['close_detail', 'medium_intervention', 'wide_worksite', 'contextual_overview'],
    preferred_compositions: ['medium_intervention', 'wide_worksite'],
    close_detail_max_ratio: 0.20,
    minimum_contextual_images_per_batch: 1,
    minimum_worker_images_per_active_batch: 1,
    vehicle_rules: {},
    forbidden_framing: ['single plant filling frame as hero shot', 'tool arranged for display'],
  },
  peinture: {
    allowed_compositions: ['close_detail', 'medium_intervention', 'wide_worksite', 'contextual_overview'],
    preferred_compositions: ['medium_intervention', 'wide_worksite'],
    close_detail_max_ratio: 0.20,
    minimum_contextual_images_per_batch: 1,
    minimum_worker_images_per_active_batch: 1,
    vehicle_rules: {},
    forbidden_framing: ['roller alone filling most of the frame', 'paint tin as hero shot', 'series of only roller or brush close-ups'],
  },
  terrassement: {
    allowed_compositions: ['wide_worksite', 'contextual_overview', 'medium_intervention'],
    preferred_compositions: ['wide_worksite', 'contextual_overview'],
    close_detail_max_ratio: 0.10,
    minimum_contextual_images_per_batch: 1,
    minimum_worker_images_per_active_batch: 1,
    vehicle_rules: {},
    forbidden_framing: ['bucket alone filling frame', 'dirt pile alone with no site context', 'pipe detail with no trench context'],
  },
  maconnerie: {
    allowed_compositions: ['close_detail', 'medium_intervention', 'wide_worksite', 'contextual_overview'],
    preferred_compositions: ['medium_intervention', 'wide_worksite'],
    close_detail_max_ratio: 0.20,
    minimum_contextual_images_per_batch: 1,
    minimum_worker_images_per_active_batch: 1,
    vehicle_rules: {},
    forbidden_framing: ['mortar detail alone', 'single block as hero shot', 'trowel filling most of the frame'],
  },
  vitrier: {
    allowed_compositions: ['medium_intervention', 'wide_worksite', 'contextual_overview'],
    preferred_compositions: ['medium_intervention', 'wide_worksite'],
    close_detail_max_ratio: 0.15,
    minimum_contextual_images_per_batch: 1,
    minimum_worker_images_per_active_batch: 1,
    vehicle_rules: {},
    forbidden_framing: ['seal bead alone as hero shot', 'single suction cup filling frame'],
  },
  nettoyage: {
    allowed_compositions: ['close_detail', 'medium_intervention', 'wide_worksite', 'contextual_overview'],
    preferred_compositions: ['medium_intervention', 'wide_worksite'],
    close_detail_max_ratio: 0.25,
    minimum_contextual_images_per_batch: 1,
    minimum_worker_images_per_active_batch: 0,
    vehicle_rules: {},
    forbidden_framing: ['hose nozzle as hero shot', 'chemical bottle filling frame'],
  },
  ravalement: {
    allowed_compositions: ['medium_intervention', 'wide_worksite', 'contextual_overview'],
    preferred_compositions: ['wide_worksite', 'contextual_overview'],
    close_detail_max_ratio: 0.15,
    minimum_contextual_images_per_batch: 1,
    minimum_worker_images_per_active_batch: 1,
    vehicle_rules: {},
    forbidden_framing: ['rendering detail alone', 'surface texture macro with no building context'],
  },
  carrelage: {
    allowed_compositions: ['close_detail', 'medium_intervention', 'wide_worksite', 'contextual_overview'],
    preferred_compositions: ['medium_intervention', 'wide_worksite'],
    close_detail_max_ratio: 0.20,
    minimum_contextual_images_per_batch: 1,
    minimum_worker_images_per_active_batch: 0,
    vehicle_rules: {},
    forbidden_framing: ['grout lines filling entire frame', 'single tile spacer as hero shot'],
  },
  debarras: {
    allowed_compositions: ['medium_intervention', 'wide_worksite', 'contextual_overview'],
    preferred_compositions: ['wide_worksite', 'contextual_overview'],
    close_detail_max_ratio: 0.15,
    minimum_contextual_images_per_batch: 1,
    minimum_worker_images_per_active_batch: 0,
    vehicle_rules: {},
    forbidden_framing: ['single object filling frame as catalogue hero'],
  },
  depannage_auto: {
    allowed_compositions: ['close_detail', 'medium_intervention', 'wide_worksite', 'contextual_overview', 'vehicle_arrival', 'equipment_from_vehicle', 'worker_action'],
    preferred_compositions: ['medium_intervention', 'wide_worksite'],
    close_detail_max_ratio: 0.10,
    minimum_contextual_images_per_batch: 1,
    minimum_worker_images_per_active_batch: 1,
    vehicle_rules: {},
    forbidden_framing: ['pressure gauge filling most of the frame', 'multimeter display as hero shot', 'battery clamp alone as hero shot', 'tyre tread macro with no car or context'],
  },
};

export {
  PHOTO_COMPOSITIONS,
  _COMPOSITION_DIST,
  _COMPOSITION_DIST as COMPOSITION_DIST,
  CAMERA_COMPOSITIONS,
  COMPOSITION_RULES_BY_METIER,
};
