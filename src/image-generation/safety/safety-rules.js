/**
 * safety/safety-rules.js — Phase 3 shadow copy (source active : app.js)
 * Tables statiques de sécurité : FORBIDDEN_SAFETY_BY_METIER, _PRE_GEN_SAFETY, SAFETY_CHECK_RULES.
 * TRIANGLE_RULES n'est PAS dupliqué ici — il reste dans config/locations.js.
 * Ne pas modifier avant le cutover validé.
 */

const FORBIDDEN_SAFETY_BY_METIER = {
  toiture:              [
    'No roofer working without a safety harness and lanyard',
    'No worker balanced on tiles with no edge anchor',
    'No single worker performing active roof work alone — minimum two workers required',
    'No worker freely standing on pitched roof tiles without visible fall protection',
    'No ground-level roof application using a telescopic lance from the garden',
  ],
  nettoyage_toiture:    [
    'No worker freely standing on pitched roof tiles without visible fall protection and secured access equipment',
    'No worker on pitched roof without visible secured access equipment (roof ladder, scaffold or MEWP)',
    'No worker on pitched roof without visible fall protection (connected harness and credible anchor)',
    'No worker on wet or moss-covered tiles without connected fall arrest',
    'No backpack sprayer or shoulder straps interpreted as fall protection',
    'No single worker performing active roof treatment alone — minimum two workers required',
    'No harness without visible connection to a plausible anchor',
    'No rope or lifeline attached to gutter, chimney cap, antenna, skylight or unsecured element',
    'No ground-level roof spraying with telescopic lance from the garden',
  ],
  nettoyage_gouttieres: [
    'No worker standing on or walking along the gutter trough',
    'No worker standing on the highest rung of the ladder',
    'No extreme sideways reaching past the worker\'s centre of gravity off the ladder',
    'No unstable improvised access — no household chair, no milk crate, no stacked objects used as a step',
    'No ground-level gutter vacuum or telescopic pole as the only access method for active gutter cleaning',
    'No worker crouching at the downpipe base as the primary access method for active downpipe clearance',
    'No ladder foot resting inside the gutter trough or on the gutter channel edge as a support point',
    'No hooked roof ladder, ridge hook, or rope or lifeline crossing the roof tiles',
    'No part of the access ladder extending up the roof slope toward the ridge',
  ],
  etancheite:     [
    'No worker balanced on parapet coping or sitting on top of the parapet wall',
    'No open-flame torch directed toward a worker or near a loose membrane edge or seam',
    'No membrane roll or material blocking the only flat roof access hatch',
    'No worker within 2 m of an open unprotected flat roof edge without harness and parapet protection',
    'No worker standing freely on steep pitched tiles without visible fall protection',
    'No Worker 2 standing directly below the active pitched repair drop zone',
    'No single worker performing any etancheite task alone — minimum two workers required',
    'No hooked roof ladder used as flat roof access — internal hatch or external stair required',
  ],
  charpente:      [
    'No hooked roof ladder used as the primary working platform for structural carpentry',
    'No worker balancing on exposed rafters, battens or purlins without a stable scaffold platform',
    'No single worker carrying or positioning heavy structural timber alone',
    'No unsupported structural timber element suspended above a worker',
  ],
  elagage:        ['No arborist in a tree without a visible climbing harness'],
  abattage:       ['No person standing in the fall zone of a tree being felled'],
  terrassement:   ['No person standing in an open trench without visible shoring or sloping'],
  depannage_auto: ['No person working under a raised vehicle without visible axle stands'],
  maconnerie:     ['No worker on an elevated platform without visible edge protection or guardrail'],
  peinture:       ['No worker on a ladder with both hands occupied above shoulder height and no foot restraint'],
  ravalement:     ['No worker on scaffolding without visible guardrails on the open side'],
};

const _PRE_GEN_SAFETY = {
  toiture:           'Roof materials must be in small quantities only. Never show a full industrial pallet, heavy crate, or large load on the roof slope or battens. A few tiles or a small hand-portable stack on a secured material bracket is the maximum. If workers are visible: minimum two workers with distinct roles; Worker 1 on secured access (roof ladder, scaffold or MEWP) with connected fall-arrest harness; Worker 2 at safe support position.',
  nettoyage_toiture: 'Minimum two visible professional workers with distinct roles. Worker 1 must work from a secured hooked roof ladder (hooks over the ridge, NOT resting against the gutter), scaffold platform, or MEWP basket — with a fall-arrest harness visibly connected to a credible ridge or roof anchor. A backpack sprayer, shoulder straps, or ordinary jacket must NEVER be read as fall protection. Worker 2 manages the hose, holds the safety line, or supervises access from a safe position at or near the access foot — NOT directly below the falling-object zone. No worker may stand or walk freely on pitched roof tiles, wet tiles, or moss-covered tiles without this complete and coherent protection system.',
  etancheite:        'Worker near flat roof edge must have a harness or be protected by a continuous parapet. No person on the parapet coping. No open-flame torch near a loose membrane. Roof hatch must remain clear. For pitched-roof waterproofing (solin, velux, fuite, noue, rive, cheminée): Worker 1 must work from a secured hooked roof ladder, MEWP basket, or scaffold platform with fall-arrest harness; Worker 2 laterally offset outside the drop zone. For ground-level terrasse or balcon: no harness required.',
  ravalement:        'Scaffold platforms above 2 m must have visible guardrails. No person leaning past the guardrail into the void.',
  'élagage':         'If a worker is visible at height: harness and rope must be clearly attached to a credible anchor. No person under a branch being cut. No chainsaw without a two-handed grip. No floating figure with no visible support.',
  abattage:          'The operator must stand beside the trunk, never in the fall zone in front of the notch. No chainsaw cutting overhead. No bystander on the far side of the trunk during felling.',
  terrassement:      'No person inside the open trench under the excavator bucket. No person between the rotating cab and the trench edge. Machine needs a visible ground spotter when near a structure.',
  'maçonnerie':      'No person on top of an incomplete wall above 1.5 m without scaffold. No block or heavy load overhead without mechanical lifting aid.',
  depannage_auto:    'Breakdown must be off the carriageway. Visible warning triangle required. No cables crossing the roadway. No person between vehicle and traffic. For puncture scenes: never show a compressor or pressure gauge simply placed in front of a mounted tyre as the sole subject — every scene must show an active repair: wheel removed, jack raising the car, lug wrench engaged on a nut, plug reamer inserted in tread, or spare wheel being mounted.',
};

const SAFETY_CHECK_RULES = {
  toiture:              "You are a worksite safety inspector. Return ONLY valid JSON: {\"safe\":true/false,\"severity\":\"ok\"/\"warning\"/\"critical\",\"reason\":\"string\"}. CRITICAL if you clearly see: full industrial pallet on pitched roof; worker feet/body over gutter with no platform; worker on roof with no harness/rope/roof-hook; ladder used as horizontal platform; heavy unsecured stack near roof edge; single worker performing active roof work with no second worker visible; worker freely standing on pitched tiles with no visible safety line or secured access. Do not reject for minor imperfections. Reject only when a clearly visible critical safety impossibility is present.",
  nettoyage_toiture:    "You are a worksite safety inspector. Return ONLY valid JSON: {\"safe\":true/false,\"severity\":\"ok\"/\"warning\"/\"critical\",\"reason\":\"string\"}. CRITICAL if you clearly see ANY of: (1) worker on pitched roof with no visible secured access equipment — no roof ladder hooks, no scaffold, no MEWP basket visible; (2) worker on pitched roof with no visible fall protection — no connected harness, no visible lifeline, no credible anchor; (3) worker freely standing or walking on pitched roof tiles with no protection system; (4) worker on wet or moss-covered tiles without connected fall arrest; (5) backpack sprayer or shoulder straps as the only apparent safety equipment with no harness or anchor visible; (6) single worker performing active roof work with no second worker visible; (7) ground-level roof application using a telescopic lance from the garden with no elevated access. CRITICAL REGRESSION CASE: one worker standing on a large pitched roof slope, backpack sprayer visible on back, no second worker, no roof ladder hooks, no scaffold, no MEWP, no guardrail, no visible harness connection, no visible anchor — this is always critical_violation. Do not reject for minor imperfections. Reject only when a clearly visible critical safety impossibility is present.",
  nettoyage_gouttieres: "You are a worksite safety inspector. Return ONLY valid JSON: {\"safe\":true/false,\"severity\":\"ok\"/\"warning\"/\"critical\",\"reason\":\"string\"}. CRITICAL if you clearly see: worker standing on or walking along the gutter trough; worker standing on the highest rung of the ladder; worker reaching far sideways past their centre of gravity with no stable contact point; ladder placed on visibly sloped, soft or irregular ground with feet clearly sliding; ladder clearly too short to reach the gutter; improvised access using household furniture. Do not reject for: ladder leaning against a wall or facade without a standoff stabiliser; absence of standoff arms, tie straps or wall anchors; one worker only; ladder visually close to the gutter but not resting inside the trough; professional A-frame ladder in stable freestanding position. Do not reject for minor imperfections. Reject only when a clearly visible critical safety impossibility is present.",
  etancheite:           "You are a worksite safety inspector. Return ONLY valid JSON: {\"safe\":true/false,\"severity\":\"ok\"/\"warning\"/\"critical\",\"reason\":\"string\"}. CRITICAL if you clearly see: person balanced on parapet coping or balcony railing; open-flame torch directed toward a worker or near a loose membrane edge; roll blocking the only roof access hatch; person within 2 m of flat roof unprotected edge with no harness and no parapet; worker standing freely on steep pitched tiles without any visible fall protection; Worker 2 standing directly below the active pitched repair drop zone. Do not reject for minor imperfections, absence of harness on ground-level terrasse or balcon work, or absence of roof ladder when a MEWP or scaffold is present. Reject only when a clearly visible critical safety impossibility is present.",
  ravalement:           "You are a worksite safety inspector. Return ONLY valid JSON: {\"safe\":true/false,\"severity\":\"ok\"/\"warning\"/\"critical\",\"reason\":\"string\"}. CRITICAL if you clearly see: person leaning out past scaffold guardrail over the void; scaffold platform above 2 m with no guardrail; unsupported plank bridging two scaffold frames. Do not reject for minor imperfections. Reject only when a clearly visible critical safety impossibility is present.",
  charpente:            "You are a worksite safety inspector. Return ONLY valid JSON: {\"safe\":true/false,\"severity\":\"ok\"/\"warning\"/\"critical\",\"reason\":\"string\"}. CRITICAL if you clearly see: hooked roof ladder used as the primary working platform for structural carpentry work instead of scaffold or MEWP; worker standing or balancing on exposed rafters, battens or purlins without a stable scaffold platform; single worker carrying or positioning heavy structural timber alone; worker positioned directly below a suspended or unsupported structural element. Do not reject for scaffold platform or MEWP basket access. Do not reject for two workers handling a structural element together. Do not reject for minor imperfections. Reject only when a clearly visible critical safety impossibility is present.",
  // peinture — skipped: indoor low-risk, forbidden[] covers edge cases
  // nettoyage — skipped: ground-level, low visual safety signal
  // carrelage — skipped: floor-level, blade guard already in prompt rules
  // débarras  — skipped: two-person carry enforced by max_workers + forbidden[]
  'élagage':            "You are a worksite safety inspector. Return ONLY valid JSON: {\"safe\":true/false,\"severity\":\"ok\"/\"warning\"/\"critical\",\"reason\":\"string\"}. CRITICAL if you clearly see: climber in tree with no rope or harness; person standing directly under a branch being cut; climber feet dangling unsupported; chainsaw in obviously impossible posture. Do not reject for minor imperfections. Reject only when a clearly visible critical safety impossibility is present.",
  abattage:             "You are a worksite safety inspector. Return ONLY valid JSON: {\"safe\":true/false,\"severity\":\"ok\"/\"warning\"/\"critical\",\"reason\":\"string\"}. CRITICAL if you clearly see: person in the direct fall zone in front of the notch cut; chainsaw cutting overhead; person on far side of trunk during felling. Do not reject for minor imperfections. Reject only when a clearly visible critical safety impossibility is present.",
  'maçonnerie':         "You are a worksite safety inspector. Return ONLY valid JSON: {\"safe\":true/false,\"severity\":\"ok\"/\"warning\"/\"critical\",\"reason\":\"string\"}. CRITICAL if you clearly see: person balanced on top of unfinished wall above 1.5 m without scaffold; single block being lifted overhead without mechanical aid. Do not reject for minor imperfections. Reject only when a clearly visible critical safety impossibility is present.",
  vitrier:              "You are a worksite safety inspector. Return ONLY valid JSON: {\"safe\":true/false,\"severity\":\"ok\"/\"warning\"/\"critical\",\"reason\":\"string\"}. CRITICAL if you clearly see: bare hands on large glass pane edges without cut-resistant gloves; glass pane balanced upright against a wall with no support cradle; broken glass on the floor with bare feet visible. Do not reject for minor imperfections. Reject only when a clearly visible critical safety impossibility is present.",
  terrassement:         "You are a worksite safety inspector. Return ONLY valid JSON: {\"safe\":true/false,\"severity\":\"ok\"/\"warning\"/\"critical\",\"reason\":\"string\"}. CRITICAL if you clearly see: person standing inside the open trench directly under the excavator bucket; person between the rotating excavator cab and the trench edge; machine operating near a structure with no ground spotter visible. Do not reject for minor imperfections. Reject only when a clearly visible critical safety impossibility is present.",
  paysagiste:           "You are a worksite safety inspector. Return ONLY valid JSON: {\"safe\":true/false,\"severity\":\"ok\"/\"warning\"/\"critical\",\"reason\":\"string\"}. CRITICAL if you clearly see: mower operating on a visibly steep slope with the operator at tipping risk; chainsaw used without visible leg protection; person on an unstable household stepladder pruning a tall tree. Do not reject for minor imperfections. Reject only when a clearly visible critical safety impossibility is present.",
  depannage_auto:       "You are a worksite safety inspector. Return ONLY valid JSON: {\"safe\":true/false,\"severity\":\"ok\"/\"warning\"/\"critical\",\"reason\":\"string\"}. CRITICAL if you clearly see: technician on the live carriageway lane with no warning triangle visible; vehicle lifted with no visible axle stand or support; person between the vehicle and traffic; cables crossing the carriageway. Do not reject for minor imperfections. Reject only when a clearly visible critical safety impossibility is present.",
};

// ─── SERVICE_VISUAL_GATE_RULES ────────────────────────────────────────────────
// Service-specific visual correctness gates applied AFTER the standard safety
// check. Each entry adds a Vision instruction and a list of reject_conditions.
// reject_conditions are evaluated in order; first match terminates with that reason.
// _SERVICE_GATE_ALIASES: normalized user-input variants → canonical gate key.
// The scene builder sets _matched_service to the raw travaux string, so variants
// like "taille haie" or "taille-de-haie" would otherwise miss the gate.
const _SERVICE_GATE_ALIASES = {
  // Hedge trimming
  'taille haie':    'Taille de haie',
  'taille-de-haie': 'Taille de haie',
  // Roof repair / localized work — hooked roof ladder gate (non-waterproofing)
  'reparation toiture':      'Réparation toiture',
  'reparation tuile':        'Réparation toiture',
  'reparation tuiles':       'Réparation toiture',
  'remplacement tuiles':     'Réparation toiture',
  'remplacement tuile':      'Réparation toiture',
  'reparation ardoise':      'Réparation toiture',
  'reparation ardoises':     'Réparation toiture',
  'remplacement ardoises':   'Réparation toiture',
  'faitage':                 'Réparation toiture',
  'faitier':                 'Réparation toiture',
  'faitiere':                'Réparation toiture',
  'zinguerie':               'Réparation toiture',
  // Gutter cleaning (nettoyage / entretien / curage)
  'nettoyage gouttieres':  'Nettoyage gouttières',
  'nettoyage gouttiere':   'Nettoyage gouttières',
  'curage gouttieres':     'Nettoyage gouttières',
  'curage gouttiere':      'Nettoyage gouttières',
  'entretien gouttieres':  'Nettoyage gouttières',
  'entretien gouttiere':   'Nettoyage gouttières',
  // Gutter unblocking
  'debouchage gouttieres': 'Débouchage gouttières',
  'debouchage gouttiere':  'Débouchage gouttières',
  // ── Ravalement / façade ───────────────────────────────────────────────────
  'ravalement de facade':              'Ravalement de façade',
  'ravalement facade':                 'Ravalement de façade',
  'ravalement':                        'Ravalement de façade',
  'renovation facade':                 'Ravalement de façade',
  'enduit facade':                     'Ravalement de façade',
  'enduit de facade':                  'Ravalement de façade',
  'crepi':                             'Ravalement de façade',
  'application enduit':                'Ravalement de façade',
  // Anti-moss treatment
  'anti-mousse':                       'Traitement anti-mousse toiture',
  'traitement anti-mousse toiture':    'Traitement anti-mousse toiture',
  // ── Étanchéité — flat contexts ────────────────────────────────────────────
  'etancheite toit terrasse':  'Étanchéité toit-terrasse',
  'etancheite toiture plate':  'Étanchéité toit-terrasse',
  'refection d etancheite':    'Étanchéité toit-terrasse',
  "refection d'etancheite":    'Étanchéité toit-terrasse',
  'etancheite epdm':           'Étanchéité EPDM',
  'etancheite pvc':            'Étanchéité PVC',
  'etancheite bitume':         'Étanchéité bitume',
  'etancheite acrotere':       'Étanchéité acrotère',
  'etancheite balcon':         'Étanchéité balcon',
  'etancheite terrasse':       'Étanchéité terrasse',
  // ── Étanchéité — pitched contexts ────────────────────────────────────────
  'reparation fuite toiture':  'Étanchéité inclinée',
  'reparation fuite':          'Étanchéité inclinée',
  'recherche de fuite':        'Étanchéité inclinée',
  'infiltration toiture':      'Étanchéité inclinée',
  'reparation solin':          'Étanchéité inclinée',
  'solin':                     'Étanchéité inclinée',
  'reparation velux':          'Étanchéité inclinée',
  'velux etancheite':          'Étanchéité inclinée',
  'noue':                      'Étanchéité inclinée',
  'reparation noue':           'Étanchéité inclinée',
  'rive':                      'Étanchéité inclinée',
  'reparation rive':           'Étanchéité inclinée',
  'etancheite cheminee':       'Étanchéité inclinée',
  'raccord mur toiture':       'Étanchéité inclinée',
};

const SERVICE_VISUAL_GATE_RULES = {
  // reject_conditions fields:
  //   value         : reject if obj[field] === value  (for forbidden true-values)
  //   not_exactly_true: reject if obj[field] !== true  (fail-closed: absent or false both reject)
  'Réparation toiture': {
    vision_instruction: `\n\nSERVICE VISUAL GATE — ROOF REPAIR (HOOKED ROOF LADDER): This image must show a localized pitched-roof repair performed from a secured hooked roof ladder. You MUST add these fields to your JSON: "hooked_roof_ladder_visible": <true/false — a professional hooked roof ladder is visible lying flat on the roof slope>, "ridge_hooks_visible": <true/false — the ridge hooks are visibly secured over the ridge>, "roof_ladder_stable": <true/false — the ladder lies flat and stable on the roof slope>, "worker_remains_on_ladder": <true/false — Worker 1 remains on the ladder rungs and does not stand freely on the tiles>, "worker_standing_freely_on_roof": <true/false — any worker stands freely on the pitched tile surface without ladder or platform support>, "connected_harness_visible": <true/false — a fall-arrest harness visibly connected to a credible anchor is visible on Worker 1>, "second_worker_visible": <true/false — a second professional worker is clearly visible in the frame>, "second_worker_outside_drop_zone": <true/false — the second worker is laterally offset from the repair zone and not directly below the falling-debris path>, "service_visual_match": <true if a localized roof repair action is clearly the primary activity, else false>. If worker_standing_freely_on_roof is true: set safe=false, severity="critical", reason="forbidden_roof_scene". If hooked_roof_ladder_visible is not true: set safe=false, severity="critical", reason="access_violation". If ridge_hooks_visible is not true: set safe=false, severity="critical", reason="access_violation". If connected_harness_visible is not true: set safe=false, severity="critical", reason="critical_violation". If second_worker_visible is not true: set safe=false, severity="critical", reason="worker_count_mismatch". If second_worker_outside_drop_zone is not true: set safe=false, severity="critical", reason="critical_violation".`,
    reject_conditions: [
      { field: 'worker_standing_freely_on_roof',  value: true,            reason: 'forbidden_roof_scene'  },
      { field: 'hooked_roof_ladder_visible',       not_exactly_true: true, reason: 'access_violation'      },
      { field: 'ridge_hooks_visible',              not_exactly_true: true, reason: 'access_violation'      },
      { field: 'connected_harness_visible',        not_exactly_true: true, reason: 'critical_violation'    },
      { field: 'second_worker_visible',            not_exactly_true: true, reason: 'worker_count_mismatch' },
      { field: 'second_worker_outside_drop_zone',  not_exactly_true: true, reason: 'critical_violation'    },
    ],
  },

  'Taille de haie': {
    vision_instruction: `\n\nSERVICE VISUAL GATE — HEDGE TRIMMING: This image must show active hedge trimming as the primary action. You MUST add these fields to your JSON: "hedge_visible": <true/false>, "hedge_trimmer_visible": <true/false>, "active_trimming_visible": <true/false>, "worker_on_roof": <true/false>, "roof_work_visible": <true/false>, "service_visual_match": <true if hedge trimming is clearly the primary action, else false>. If worker_on_roof is true, set safe=false, severity="critical", reason="forbidden_roof_scene". If roof_work_visible is true, set safe=false, severity="critical", reason="forbidden_roof_scene". If hedge_visible is not true, set safe=false, severity="critical", reason="service_visual_mismatch". If hedge_trimmer_visible is not true, set safe=false, severity="critical", reason="service_visual_mismatch". If service_visual_match is not true, set safe=false, severity="critical", reason="service_visual_mismatch".`,
    reject_conditions: [
      { field: 'worker_on_roof',        value: true,            reason: 'forbidden_roof_scene'    },
      { field: 'roof_work_visible',     value: true,            reason: 'forbidden_roof_scene'    },
      { field: 'hedge_visible',         not_exactly_true: true, reason: 'service_visual_mismatch' },
      { field: 'hedge_trimmer_visible', not_exactly_true: true, reason: 'service_visual_mismatch' },
      { field: 'service_visual_match',  not_exactly_true: true, reason: 'service_visual_mismatch' },
    ],
  },

  'Nettoyage gouttières': {
    vision_instruction: `\n\nSERVICE VISUAL GATE — GUTTER CLEANING: This image must show active gutter cleaning at a residential house. You MUST add these fields to your JSON: "gutter_visible": <true/false — gutter trough clearly visible>, "cleaning_action_visible": <true/false — worker actively removing leaves/moss/debris from gutter using scoop, brush or gloved hand>, "professional_ladder_visible": <true/false — professional extension ladder or professional A-frame ladder visible>, "ladder_stable": <true/false — ladder appears stable on reasonably level ground, feet not visibly slipping>, "worker_on_roof": <true/false>, "worker_on_highest_rung": <true/false — worker standing on the very top rung>, "extreme_side_lean": <true/false — worker leaning far sideways past centre of gravity>, "service_visual_match": <true if gutter cleaning is clearly the primary action, else false>. Do NOT set worker_on_highest_rung=true merely because the worker is near the top of the ladder — only if standing on the absolute highest rung. Do NOT reject for absence of standoff, absence of tie straps, or ladder leaning against a wall without standoff arms. If worker_on_roof is true: set safe=false, severity="critical", reason="forbidden_roof_scene". If worker_on_highest_rung is true: set safe=false, severity="critical", reason="critical_violation". If extreme_side_lean is true: set safe=false, severity="critical", reason="critical_violation". If service_visual_match is not true: set safe=false, severity="critical", reason="service_visual_mismatch".`,
    reject_conditions: [
      { field: 'worker_on_roof',            value: true,            reason: 'forbidden_roof_scene'    },
      { field: 'worker_on_highest_rung',    value: true,            reason: 'critical_violation'      },
      { field: 'extreme_side_lean',         value: true,            reason: 'critical_violation'      },
      { field: 'gutter_visible',            not_exactly_true: true, reason: 'service_visual_mismatch' },
      { field: 'cleaning_action_visible',   not_exactly_true: true, reason: 'service_visual_mismatch' },
      { field: 'professional_ladder_visible', not_exactly_true: true, reason: 'service_visual_mismatch' },
      { field: 'ladder_stable',             not_exactly_true: true, reason: 'service_visual_mismatch' },
      { field: 'service_visual_match',      not_exactly_true: true, reason: 'service_visual_mismatch' },
    ],
  },

  'Débouchage gouttières': {
    vision_instruction: `\n\nSERVICE VISUAL GATE — GUTTER UNBLOCKING: This image must show active gutter or downpipe unblocking at a residential house. You MUST add these fields to your JSON: "gutter_visible": <true/false>, "cleaning_action_visible": <true/false — worker using a flexible rod, compact clearing tool or hand tool at the gutter/downpipe junction to remove a blockage>, "professional_ladder_visible": <true/false>, "ladder_stable": <true/false>, "worker_on_roof": <true/false>, "worker_on_highest_rung": <true/false>, "extreme_side_lean": <true/false>, "service_visual_match": <true if gutter or downpipe unblocking is clearly the primary action — NOT simple leaf removal — else false>. Do NOT reject for absence of standoff or ladder leaning against wall. If worker_on_roof is true: set safe=false, severity="critical", reason="forbidden_roof_scene". If worker_on_highest_rung is true: set safe=false, severity="critical", reason="critical_violation". If extreme_side_lean is true: set safe=false, severity="critical", reason="critical_violation". If service_visual_match is not true: set safe=false, severity="critical", reason="service_visual_mismatch".`,
    reject_conditions: [
      { field: 'worker_on_roof',            value: true,            reason: 'forbidden_roof_scene'    },
      { field: 'worker_on_highest_rung',    value: true,            reason: 'critical_violation'      },
      { field: 'extreme_side_lean',         value: true,            reason: 'critical_violation'      },
      { field: 'gutter_visible',            not_exactly_true: true, reason: 'service_visual_mismatch' },
      { field: 'cleaning_action_visible',   not_exactly_true: true, reason: 'service_visual_mismatch' },
      { field: 'professional_ladder_visible', not_exactly_true: true, reason: 'service_visual_mismatch' },
      { field: 'ladder_stable',             not_exactly_true: true, reason: 'service_visual_mismatch' },
      { field: 'service_visual_match',      not_exactly_true: true, reason: 'service_visual_mismatch' },
    ],
  },

  // ── Étanchéité gates ──────────────────────────────────────────────────────

  'Étanchéité toit-terrasse': {
    vision_instruction: `\n\nSERVICE VISUAL GATE — WATERPROOFING FLAT ROOF (TOIT-TERRASSE): This image must show waterproofing work on a flat or low-slope roof. You MUST add these fields to your JSON: "flat_or_low_slope_surface_visible": <true/false — a clearly flat or very low-slope roof surface is visible>, "waterproofing_membrane_or_coating_visible": <true/false — a waterproofing membrane, coating, or treatment is clearly visible as the main surface material or work object>, "parapet_or_guardrail_visible": <true/false — a parapet wall or continuous edge guardrail is visible providing edge protection>, "worker_near_unprotected_edge": <true/false — any worker is positioned within 2 m of a roof edge with no parapet or guardrail>, "service_visual_match": <true if flat-roof waterproofing is clearly the primary activity, else false>, "worker_count_matches_plan": <if var_presence in this JSON is 'workers': true if the number of clearly visible professional workers equals var_workers, else false; if var_presence is not 'workers' set true>. If worker_near_unprotected_edge is true: set safe=false, severity="critical", reason="critical_violation". If flat_or_low_slope_surface_visible is not true: set safe=false, severity="critical", reason="service_visual_mismatch". If waterproofing_membrane_or_coating_visible is not true: set safe=false, severity="critical", reason="service_visual_mismatch". If service_visual_match is not true: set safe=false, severity="critical", reason="service_visual_mismatch". If worker_count_matches_plan is not true: set safe=false, severity="critical", reason="worker_count_mismatch".`,
    reject_conditions: [
      { field: 'worker_near_unprotected_edge',           value: true,            reason: 'critical_violation'      },
      { field: 'flat_or_low_slope_surface_visible',      not_exactly_true: true, reason: 'service_visual_mismatch' },
      { field: 'waterproofing_membrane_or_coating_visible', not_exactly_true: true, reason: 'service_visual_mismatch' },
      { field: 'service_visual_match',                   not_exactly_true: true, reason: 'service_visual_mismatch' },
      { field: 'worker_count_matches_plan',              not_exactly_true: true, reason: 'worker_count_mismatch'   },
    ],
  },

  'Étanchéité EPDM': {
    vision_instruction: `\n\nSERVICE VISUAL GATE — EPDM WATERPROOFING (FLAT ROOF): This image must show EPDM rubber membrane waterproofing on a flat roof. EPDM membrane is black, flexible, and laid cold using adhesive — NOT heat-welded. You MUST add these fields to your JSON: "flat_or_low_slope_surface_visible": <true/false — a clearly flat or very low-slope roof surface is the working context>, "parapet_or_guardrail_visible": <true/false — a parapet wall or continuous guardrail provides edge protection on all visible roof edges>, "worker_near_unprotected_edge": <true/false — any worker is within 2 m of a roof edge with no parapet or guardrail>, "black_flexible_membrane_visible": <true/false — a black flexible rubber membrane (EPDM) is clearly the main surface material>, "cold_adhesive_or_bonding_action_visible": <true/false — cold adhesive application, primer, or cold-bonding action is visible — OR membrane is already fully bonded and no heat equipment is present>, "pressure_roller_visible": <true/false — a seam roller or hand roller is visible — OR membrane seam is complete>, "hot_air_welder_visible": <true/false — a hot-air welding gun or heat seaming device is visible>, "bitumen_torch_visible": <true/false — a flame torch or gas torch is visible>, "service_visual_match": <true if EPDM flat-roof waterproofing is clearly the primary activity, else false>, "worker_count_matches_plan": <if var_presence is 'workers': true if visible worker count equals var_workers, else false; otherwise true>. If worker_near_unprotected_edge is true: set safe=false, severity="critical", reason="critical_violation". If hot_air_welder_visible is true: set safe=false, severity="critical", reason="forbidden_tool_for_epdm". If bitumen_torch_visible is true: set safe=false, severity="critical", reason="forbidden_tool_for_epdm". If flat_or_low_slope_surface_visible is not true: set safe=false, severity="critical", reason="service_visual_mismatch". If black_flexible_membrane_visible is not true: set safe=false, severity="critical", reason="service_visual_mismatch". If service_visual_match is not true: set safe=false, severity="critical", reason="service_visual_mismatch". If worker_count_matches_plan is not true: set safe=false, severity="critical", reason="worker_count_mismatch".`,
    reject_conditions: [
      { field: 'worker_near_unprotected_edge',       value: true,            reason: 'critical_violation'      },
      { field: 'hot_air_welder_visible',             value: true,            reason: 'forbidden_tool_for_epdm' },
      { field: 'bitumen_torch_visible',              value: true,            reason: 'forbidden_tool_for_epdm' },
      { field: 'flat_or_low_slope_surface_visible',  not_exactly_true: true, reason: 'service_visual_mismatch' },
      { field: 'parapet_or_guardrail_visible',       not_exactly_true: true, reason: 'critical_violation'      },
      { field: 'black_flexible_membrane_visible',    not_exactly_true: true, reason: 'service_visual_mismatch' },
      { field: 'service_visual_match',               not_exactly_true: true, reason: 'service_visual_mismatch' },
      { field: 'worker_count_matches_plan',          not_exactly_true: true, reason: 'worker_count_mismatch'   },
    ],
  },

  'Étanchéité PVC': {
    vision_instruction: `\n\nSERVICE VISUAL GATE — PVC WATERPROOFING (FLAT ROOF): This image must show PVC membrane waterproofing on a flat roof. PVC membrane is light grey or off-white, heat-welded at seams using a hot-air welding gun. You MUST add these fields to your JSON: "flat_or_low_slope_surface_visible": <true/false — a clearly flat or very low-slope roof surface is the working context>, "parapet_or_guardrail_visible": <true/false — a parapet wall or continuous guardrail provides edge protection on all visible roof edges>, "worker_near_unprotected_edge": <true/false — any worker is within 2 m of a roof edge with no parapet or guardrail>, "light_grey_or_off_white_membrane_visible": <true/false — a light grey, off-white, or beige synthetic membrane is clearly the main surface material>, "hot_air_welder_visible": <true/false — an electric hot-air welding gun (compact industrial tool with a power cable, NO gas cylinder, NO open flame) is clearly visible in a worker's hand or was clearly used — set false if only a generic heat gun, paint sprayer, torch, or unused tool lying on the ground is seen>, "pressure_roller_visible": <true/false — a seam roller or pressure tool is visible>, "heat_welded_seam_visible": <true/false — a visible heat-welded or fused seam line between membrane strips is present>, "bitumen_torch_visible": <true/false — an open-flame torch or gas torch is visible>, "service_visual_match": <true if PVC flat-roof waterproofing is clearly the primary activity, else false>, "worker_count_matches_plan": <if var_presence is 'workers': true if visible worker count equals var_workers, else false; otherwise true>. If worker_near_unprotected_edge is true: set safe=false, severity="critical", reason="critical_violation". If bitumen_torch_visible is true: set safe=false, severity="critical", reason="forbidden_tool_for_pvc". If flat_or_low_slope_surface_visible is not true: set safe=false, severity="critical", reason="service_visual_mismatch". If light_grey_or_off_white_membrane_visible is not true: set safe=false, severity="critical", reason="service_visual_mismatch". If hot_air_welder_visible is not true: set safe=false, severity="critical", reason="service_visual_mismatch". If service_visual_match is not true: set safe=false, severity="critical", reason="service_visual_mismatch". If worker_count_matches_plan is not true: set safe=false, severity="critical", reason="worker_count_mismatch".`,
    reject_conditions: [
      { field: 'worker_near_unprotected_edge',              value: true,            reason: 'critical_violation'      },
      { field: 'bitumen_torch_visible',                     value: true,            reason: 'forbidden_tool_for_pvc'  },
      { field: 'flat_or_low_slope_surface_visible',         not_exactly_true: true, reason: 'service_visual_mismatch' },
      { field: 'parapet_or_guardrail_visible',              not_exactly_true: true, reason: 'critical_violation'      },
      { field: 'light_grey_or_off_white_membrane_visible',  not_exactly_true: true, reason: 'service_visual_mismatch' },
      { field: 'hot_air_welder_visible',                    not_exactly_true: true, reason: 'service_visual_mismatch' },
      { field: 'service_visual_match',                      not_exactly_true: true, reason: 'service_visual_mismatch' },
      { field: 'worker_count_matches_plan',                 not_exactly_true: true, reason: 'worker_count_mismatch'   },
    ],
  },

  'Étanchéité bitume': {
    vision_instruction: `\n\nSERVICE VISUAL GATE — BITUMINOUS WATERPROOFING (FLAT ROOF): This image must show bituminous membrane waterproofing on a flat roof. Bituminous membrane (SBS/APP) is dark brown or black, applied either with a controlled torch flame or cold-bonded. You MUST add these fields to your JSON: "flat_or_low_slope_surface_visible": <true/false — a clearly flat or very low-slope roof surface is the working context>, "parapet_or_guardrail_visible": <true/false — a parapet wall or continuous guardrail provides edge protection on all visible roof edges>, "worker_near_unprotected_edge": <true/false — any worker is within 2 m of a roof edge with no parapet or guardrail>, "dark_bituminous_roll_visible": <true/false — a dark bituminous membrane roll or sheet is clearly visible>, "overlap_or_lap_joint_visible": <true/false — a membrane lap joint, overlap seam, or strip bond is visible>, "controlled_torch_or_cold_bonding_visible": <true/false — a controlled torch flame heating the membrane underside OR cold-adhesive bonding is visible; set true if bonding is already complete and scene is semifinal or final>, "large_flame_visible": <true/false — an uncontrolled large flame spreading beyond the membrane underside>, "gas_cylinder_unstable_or_horizontal": <true/false — a gas cylinder is horizontal, unsecured, or in an unstable position>, "torch_directed_toward_worker": <true/false — a torch flame is directed toward any part of a worker's body>, "service_visual_match": <true if bituminous flat-roof waterproofing is clearly the primary activity, else false>, "worker_count_matches_plan": <if var_presence is 'workers': true if visible worker count equals var_workers, else false; otherwise true>. If worker_near_unprotected_edge is true: set safe=false, severity="critical", reason="critical_violation". If large_flame_visible is true: set safe=false, severity="critical", reason="critical_violation". If gas_cylinder_unstable_or_horizontal is true: set safe=false, severity="critical", reason="critical_violation". If torch_directed_toward_worker is true: set safe=false, severity="critical", reason="critical_violation". If flat_or_low_slope_surface_visible is not true: set safe=false, severity="critical", reason="service_visual_mismatch". If dark_bituminous_roll_visible is not true: set safe=false, severity="critical", reason="service_visual_mismatch". If service_visual_match is not true: set safe=false, severity="critical", reason="service_visual_mismatch". If worker_count_matches_plan is not true: set safe=false, severity="critical", reason="worker_count_mismatch". Do NOT reject for absence of torch when cold-bonding is used.`,
    reject_conditions: [
      { field: 'worker_near_unprotected_edge',        value: true,            reason: 'critical_violation'      },
      { field: 'large_flame_visible',                 value: true,            reason: 'critical_violation'      },
      { field: 'gas_cylinder_unstable_or_horizontal', value: true,            reason: 'critical_violation'      },
      { field: 'torch_directed_toward_worker',        value: true,            reason: 'critical_violation'      },
      { field: 'flat_or_low_slope_surface_visible',   not_exactly_true: true, reason: 'service_visual_mismatch' },
      { field: 'parapet_or_guardrail_visible',        not_exactly_true: true, reason: 'critical_violation'      },
      { field: 'dark_bituminous_roll_visible',        not_exactly_true: true, reason: 'service_visual_mismatch' },
      { field: 'service_visual_match',                not_exactly_true: true, reason: 'service_visual_mismatch' },
      { field: 'worker_count_matches_plan',           not_exactly_true: true, reason: 'worker_count_mismatch'   },
    ],
  },

  'Étanchéité acrotère': {
    vision_instruction: `\n\nSERVICE VISUAL GATE — ACROTÈRE WATERPROOFING: This image must show waterproofing of the acrotère (parapet wall top/face) on a flat roof — relevé upstand treatment at the parapet base or acrotère cap. You MUST add these fields to your JSON: "flat_roof_visible": <true/false — a flat or low-slope roof deck is clearly visible>, "parapet_visible": <true/false — a parapet wall or acrotère wall is clearly visible>, "horizontal_membrane_visible": <true/false — a waterproofing membrane or coating is visible on the flat roof deck surface>, "vertical_upstand_visible": <true/false — a vertical or angled upstand, relevé strip, or membrane continuation up the parapet face is visible>, "upstand_treatment_visible": <true/false — active application or installed waterproofing at the wall-to-roof junction is clearly visible>, "worker_on_parapet_coping": <true/false — any worker is standing on or sitting astride the parapet top coping>, "pitched_roof_visible": <true/false — a pitched tiled or slated roof slope is visible as the primary context>, "service_visual_match": <true if acrotère or parapet waterproofing on a flat roof is clearly the primary activity, else false>, "worker_count_matches_plan": <if var_presence is 'workers': true if visible worker count equals var_workers, else false; otherwise true>, "vehicle_on_rooftop": <true/false — any motor vehicle (van, truck or car) appears physically parked or standing on the flat rooftop or at the same elevation as the flat roof work area>, "vehicle_intersects_roof_work_area": <true/false — any vehicle body overlaps or shares the same visual plane as the flat roof slab where workers are operating>, "physically_coherent_rooftop_access": <true/false — the scene is architecturally plausible for a residential flat roof — no vehicle present at roof level, no structural impossibility>. If worker_on_parapet_coping is true: set safe=false, severity="critical", reason="critical_violation". If pitched_roof_visible is true: set safe=false, severity="critical", reason="service_visual_mismatch". If flat_roof_visible is not true: set safe=false, severity="critical", reason="service_visual_mismatch". If parapet_visible is not true: set safe=false, severity="critical", reason="service_visual_mismatch". If horizontal_membrane_visible is not true: set safe=false, severity="critical", reason="service_visual_mismatch". If vertical_upstand_visible is not true: set safe=false, severity="critical", reason="service_visual_mismatch". If upstand_treatment_visible is not true: set safe=false, severity="critical", reason="service_visual_mismatch". If service_visual_match is not true: set safe=false, severity="critical", reason="service_visual_mismatch". If worker_count_matches_plan is not true: set safe=false, severity="critical", reason="worker_count_mismatch". If vehicle_on_rooftop is true: set safe=false, severity="critical", reason="critical_violation". If vehicle_intersects_roof_work_area is true: set safe=false, severity="critical", reason="critical_violation". If physically_coherent_rooftop_access is not true: set safe=false, severity="critical", reason="critical_violation".`,
    reject_conditions: [
      { field: 'worker_on_parapet_coping',              value: true,            reason: 'critical_violation'      },
      { field: 'pitched_roof_visible',                  value: true,            reason: 'service_visual_mismatch' },
      { field: 'flat_roof_visible',                     not_exactly_true: true, reason: 'service_visual_mismatch' },
      { field: 'parapet_visible',                       not_exactly_true: true, reason: 'service_visual_mismatch' },
      { field: 'horizontal_membrane_visible',           not_exactly_true: true, reason: 'missing_horizontal_membrane' },
      { field: 'vertical_upstand_visible',              not_exactly_true: true, reason: 'missing_vertical_upstand'    },
      { field: 'upstand_treatment_visible',             not_exactly_true: true, reason: 'missing_upstand_treatment'   },
      { field: 'service_visual_match',                  not_exactly_true: true, reason: 'service_visual_mismatch' },
      { field: 'worker_count_matches_plan',             not_exactly_true: true, reason: 'worker_count_mismatch'   },
      { field: 'vehicle_on_rooftop',                    value: true,            reason: 'critical_violation'      },
      { field: 'vehicle_intersects_roof_work_area',     value: true,            reason: 'critical_violation'      },
      { field: 'physically_coherent_rooftop_access',    not_exactly_true: true, reason: 'critical_violation'      },
    ],
  },

  'Étanchéité balcon': {
    vision_instruction: `\n\nSERVICE VISUAL GATE — BALCONY WATERPROOFING: This image must show waterproofing work on an elevated balcony slab — membrane application at the slab surface, drain collar, or door threshold junction. You MUST add these fields to your JSON: "elevated_balcony_visible": <true/false — a raised balcony floor above ground level is clearly visible>, "continuous_railing_visible": <true/false — a continuous railing or balustrade is visible on all open edges of the balcony>, "door_or_threshold_visible": <true/false — a door opening, porte-fenêtre, or threshold is visible at the balcony edge>, "waterproofing_action_at_slab_wall_or_threshold_visible": <true/false — waterproofing membrane, sealant, or coating application at the balcony slab, wall junction, drain collar, or door threshold is clearly the primary action>, "worker_outside_railing": <true/false — any worker is outside the continuous railing, on the exterior face, or suspended above the balcony edge>, "open_unprotected_edge": <true/false — a balcony edge with no railing or continuous guard is clearly visible and a worker is near it>, "service_visual_match": <true if balcony waterproofing is clearly the primary activity, else false>, "worker_count_matches_plan": <if var_presence is 'workers': true if visible worker count equals var_workers, else false; otherwise true>. If worker_outside_railing is true: set safe=false, severity="critical", reason="critical_violation". If open_unprotected_edge is true: set safe=false, severity="critical", reason="critical_violation". If elevated_balcony_visible is not true: set safe=false, severity="critical", reason="service_visual_mismatch". If continuous_railing_visible is not true: set safe=false, severity="critical", reason="critical_violation". If service_visual_match is not true: set safe=false, severity="critical", reason="service_visual_mismatch". If worker_count_matches_plan is not true: set safe=false, severity="critical", reason="worker_count_mismatch". Do NOT require a harness, parapet, guardrail, or roof ladder — balcony floor work is ground-equivalent.`,
    reject_conditions: [
      { field: 'worker_outside_railing',              value: true,            reason: 'critical_violation'      },
      { field: 'open_unprotected_edge',               value: true,            reason: 'critical_violation'      },
      { field: 'elevated_balcony_visible',            not_exactly_true: true, reason: 'service_visual_mismatch' },
      { field: 'continuous_railing_visible',          not_exactly_true: true, reason: 'critical_violation'      },
      { field: 'service_visual_match',                not_exactly_true: true, reason: 'service_visual_mismatch' },
      { field: 'worker_count_matches_plan',           not_exactly_true: true, reason: 'worker_count_mismatch'   },
    ],
  },

  'Étanchéité terrasse': {
    vision_instruction: `\n\nSERVICE VISUAL GATE — GROUND-LEVEL TERRACE WATERPROOFING: This image must show waterproofing work on a ground-level concrete terrace slab — membrane application at the slab surface, wall junction, or door threshold. You MUST add these fields to your JSON: "ground_level_terrace_visible": <true/false — a ground-level or near-ground-level concrete terrace slab is clearly visible as the work surface>, "wall_or_door_threshold_junction_visible": <true/false — a wall base, facade, or door threshold at the terrace edge is visible>, "waterproofing_action_visible": <true/false — a waterproofing membrane, sealant, primer, or coating application is clearly the primary action>, "elevated_balcony_visible": <true/false — a raised balcony above ground level is the primary surface>, "pitched_roof_visible": <true/false — a pitched tiled or slated roof is the primary context>, "service_visual_match": <true if ground-level terrace waterproofing is clearly the primary activity, else false>, "worker_count_matches_plan": <if var_presence is 'workers': true if visible worker count equals var_workers, else false; otherwise true>. If elevated_balcony_visible is true: set safe=false, severity="critical", reason="service_visual_mismatch". If pitched_roof_visible is true: set safe=false, severity="critical", reason="service_visual_mismatch". If ground_level_terrace_visible is not true: set safe=false, severity="critical", reason="service_visual_mismatch". If waterproofing_action_visible is not true: set safe=false, severity="critical", reason="service_visual_mismatch". If service_visual_match is not true: set safe=false, severity="critical", reason="service_visual_mismatch". If worker_count_matches_plan is not true: set safe=false, severity="critical", reason="worker_count_mismatch". Do NOT require harness, parapet, guardrail, roof ladder, or MEWP — ground-level work has no elevated access requirement.`,
    reject_conditions: [
      { field: 'elevated_balcony_visible',       value: true,            reason: 'service_visual_mismatch' },
      { field: 'pitched_roof_visible',           value: true,            reason: 'service_visual_mismatch' },
      { field: 'ground_level_terrace_visible',   not_exactly_true: true, reason: 'service_visual_mismatch' },
      { field: 'waterproofing_action_visible',   not_exactly_true: true, reason: 'service_visual_mismatch' },
      { field: 'service_visual_match',           not_exactly_true: true, reason: 'service_visual_mismatch' },
      { field: 'worker_count_matches_plan',      not_exactly_true: true, reason: 'worker_count_mismatch'   },
    ],
  },

  'Étanchéité inclinée': {
    vision_instruction: `\n\nSERVICE VISUAL GATE — PITCHED-ROOF WATERPROOFING (fuite, solin, velux, noue, rive, cheminée, raccord, tuile): This image shows a localized waterproofing repair on a pitched tiled or slated roof, performed from one of three secured access configurations — evaluate each separately:\n- FACADE_ACCESS_LADDER + HOOKED_ROOF_LADDER (two-ladder configuration, preferred for solin/chimney repairs): a professional extension ladder leaning against the facade wall with its base on stable flat ground — used only to reach the eave, not to work on the slope — PLUS a separate hooked roof ladder lying flat on the pitched roof slope, with its ridge hooks clearly gripping over the ridge coping, and Worker 1 positioned on the hooked roof ladder rungs at the repair zone. Fall-arrest harness and safety cable are NOT required for this configuration when both ladders are present and the worker is on the rungs.\n- MEWP: mobile elevated work platform basket positioned at the repair zone, worker clearly inside the basket, basket guardrails visible — fall-arrest harness optional if basket guardrails are present.\n- SCAFFOLD_PLATFORM: scaffold platform at eave, chimney, or gutter level with complete platform boards and visible guardrails — fall-arrest harness NOT required if platform is fully guarded and worker is on the platform.\n\nYou MUST add these fields to your JSON: "safe_access_visible": <true/false — one of the three access configurations above is clearly visible>, "access_type": <"FACADE_LADDER_AND_HOOKED_ROOF_LADDER" | "HOOKED_ROOF_LADDER" | "MEWP" | "SCAFFOLD" | "OTHER">, "facade_access_ladder_visible": <true/false — a professional extension ladder leaning against the facade wall with base on stable ground is clearly visible; set false if only a roof ladder is present>, "facade_ladder_base_stable": <true/false — the base of the facade access ladder rests on flat stable ground; set true if access_type is MEWP or SCAFFOLD or if no facade ladder is present>, "hooked_roof_ladder_visible": <true/false — a ladder lying flat on the pitched roof slope is clearly visible>, "ridge_hooks_visible": <true/false — ridge hooks secured over the ridge coping are clearly visible; set true if access_type is MEWP or SCAFFOLD — requirement waived>, "worker_on_ladder_rungs": <true/false — Worker 1 is on the hooked roof ladder rungs and not standing freely on tiles; set true if access_type is MEWP or SCAFFOLD — requirement waived>, "worker_fall_protection_adequate": <true/false — composite adequacy evaluated by access_type: for FACADE_LADDER_AND_HOOKED_ROOF_LADDER: true if facade_access_ladder_visible=true AND facade_ladder_base_stable=true AND hooked_roof_ladder_visible=true AND ridge_hooks_visible=true AND worker_on_ladder_rungs=true AND worker_freely_standing_on_pitched_roof=false AND roof_ladder_on_same_roof_plane_as_worker=true — fall-arrest harness and cable NOT required for this route; for HOOKED_ROOF_LADDER (single ladder): true if connected fall-arrest harness is visible on Worker 1 AND Worker 1 is on the rungs; for MEWP: true if worker is inside the basket AND basket guardrails are visible; for SCAFFOLD: true if scaffold platform is complete AND guardrails are clearly visible — harness NOT required for scaffold; for OTHER or no visible protection: false>, "worker_freely_standing_on_pitched_roof": <true/false — set true if any worker is standing, sitting, or kneeling on the pitched tile surface without the hooked roof ladder directly beneath or alongside them as their physical support; set false ONLY when the hooked roof ladder lies on the slope directly beneath or alongside Worker 1 AND the worker is visibly kneeling on the rungs, straddling the rungs (à califourchon), or crouching on them — the ladder must be their visible physical support under their body, not merely present elsewhere in the frame or on a different slope>, "roof_ladder_on_same_roof_plane_as_worker": <true/false — the hooked roof ladder is lying on the SAME roof slope as where Worker 1 is working, aligned toward the repair zone and positioned beneath or alongside them; set false if the hooked roof ladder appears on a different slope, a different face of the roof, or is clearly not positioned beneath or alongside Worker 1; set true if access_type is MEWP or SCAFFOLD — requirement waived>, "worker_directly_below_drop_zone": <true/false — Worker 2 is standing directly below the repair zone in the falling-object path, not laterally offset>, "loose_materials_on_slope": <true/false — a full pallet, heavy crate, or large loose material stack is resting on the pitched slope>, "service_specific_action_visible": <true/false — a localized repair action at the specific element is clearly the primary activity>, "roof_covering_continuous": <true/false — the pitched roof slope around the repair zone is continuously covered with tiles or slates in regular rows with no large bare sections; set true if the roof is fully tiled/slated except for at most 1–2 tiles displaced immediately adjacent to the repair zone; set false if a significant area (more than a few tiles wide) of bare underlay, membrane, or decking is visible on the slope>, "large_missing_tile_area": <true/false — a large section of the roof slope (more than 2–3 tiles) is missing tiles, revealing bare underlay or decking; set false if the roof is fully covered except for at most 1–2 tiles immediately near the repair zone>, "bare_underlay_visible": <true/false — bare roof underlay, waterproofing membrane, or wood decking is visible over a significant portion of the pitched slope (wider than 2–3 tiles)>, "second_worker_visible": <true/false — a second professional worker is clearly visible>, "worker_count_matches_plan": <if var_presence is 'workers': true if visible worker count equals var_workers, else false; otherwise true>. If worker_freely_standing_on_pitched_roof is true: set safe=false, reason="forbidden_roof_scene". If safe_access_visible is not true: set safe=false, reason="access_violation". If roof_ladder_on_same_roof_plane_as_worker is not true: set safe=false, reason="access_violation". If worker_fall_protection_adequate is not true: set safe=false, reason="critical_violation". If worker_directly_below_drop_zone is true: set safe=false, reason="critical_violation". If loose_materials_on_slope is true: set safe=false, reason="critical_violation". If large_missing_tile_area is true: set safe=false, reason="service_visual_mismatch". If bare_underlay_visible is true: set safe=false, reason="service_visual_mismatch". If roof_covering_continuous is not true: set safe=false, reason="service_visual_mismatch". If service_specific_action_visible is not true: set safe=false, reason="service_visual_mismatch". If worker_count_matches_plan is not true: set safe=false, reason="worker_count_mismatch". Do NOT reject a FACADE_LADDER_AND_HOOKED_ROOF_LADDER scene because no harness or cable is visible — the two-ladder configuration with ridge hooks is adequate protection. Do NOT reject a scaffold scene because no harness or ridge hooks are visible — scaffold guardrails are adequate protection.`,
    reject_conditions: [
      { field: 'worker_freely_standing_on_pitched_roof',       value: true,            reason: 'forbidden_roof_scene'    },
      { field: 'safe_access_visible',                          not_exactly_true: true, reason: 'access_violation'         },
      { field: 'roof_ladder_on_same_roof_plane_as_worker',     not_exactly_true: true, reason: 'access_violation'         },
      { field: 'worker_fall_protection_adequate',              not_exactly_true: true, reason: 'critical_violation'       },
      { field: 'worker_directly_below_drop_zone',              value: true,            reason: 'critical_violation'       },
      { field: 'loose_materials_on_slope',                     value: true,            reason: 'critical_violation'       },
      { field: 'large_missing_tile_area',                      value: true,            reason: 'service_visual_mismatch'  },
      { field: 'bare_underlay_visible',                        value: true,            reason: 'service_visual_mismatch'  },
      { field: 'roof_covering_continuous',                     not_exactly_true: true, reason: 'service_visual_mismatch'  },
      { field: 'service_specific_action_visible',              not_exactly_true: true, reason: 'service_visual_mismatch'  },
      { field: 'worker_count_matches_plan',                    not_exactly_true: true, reason: 'worker_count_mismatch'    },
    ],
  },

  'Ravalement de façade': {
    vision_instruction: `\n\nSERVICE VISUAL GATE — FACADE RENDER / ENDUIT APPLICATION (SCAFFOLD PLATFORM): This image must show active facade render or coating work performed from a complete tube-and-fitting scaffold platform on a residential house. Workers apply render with hawk and float, or apply paint or coating to the facade surface — scaffold platform is the only permitted workstation. You MUST add these fields to your JSON:\n"scaffold_visible": <true/false — a scaffold structure (tube-and-fitting, modular, or mobile tower) is clearly visible against the facade>,\n"scaffold_platform_complete": <true/false — the scaffold working platform is fully boarded with no visible gaps, missing boards, or single-plank bridging — a complete walkable surface at the working level>,\n"scaffold_guardrails_visible": <true/false — guardrails are clearly visible on the open outer edge of the working lift — at least one top rail and ideally a mid-rail; set false if the platform edge is open with no guardrail>,\n"scaffold_stable_and_supported": <true/false — the scaffold appears structurally stable: adjustable base plates or ground sills visible, scaffold braced or tied to the facade wall, no obvious lean or instability>,\n"workers_supported_by_platform": <true/false — all visible workers stand or work on the scaffold platform boards — not on a ladder rung used as a workstation, not on the guardrail, not suspended outside the scaffold>,\n"worker_standing_on_guardrail": <true/false — any worker is standing on top of or straddling the scaffold guardrail to gain extra height — set false if workers are on the platform boards>,\n"worker_on_ladder_as_workstation": <true/false — any worker uses a ladder as their primary elevated workstation on the facade instead of the scaffold platform — a short step-ladder on the platform to reach a high spot is acceptable and does NOT trigger this; only set true when no scaffold platform is present and a ladder is the sole elevated access>,\n"worker_on_roof_surface": <true/false — any worker is on the pitched or flat roof surface performing work, rather than on the scaffold>,\n"interior_painting_visible": <true/false — the scene clearly shows indoor walls, interior rooms, or ceiling painting rather than exterior facade work>,\n"facade_work_in_progress": <true/false — fresh render being applied, fresh paint being rolled, or active surface treatment on the facade exterior is clearly the primary activity; set false if the facade is fully finished with no active work visible, or if only cleaning is in progress>,\n"facade_fully_completed": <true/false — the facade is uniformly clean, painted, or rendered with no active work, no wet surfaces, no tools in use, and no workers actively applying anything; set false if active application is in progress>,\n"service_visual_match": <true if exterior facade render, coating, or paint application on a residential house is clearly the primary activity — active work must be visible; set false if only scaffold is visible without work, if work is interior, or if the scene is a roof job>,\n"worker_count_matches_plan": <if var_presence in this JSON is 'workers': true if the number of clearly visible professional workers equals var_workers, else false; if var_presence is not 'workers': true>.\nIf worker_on_roof_surface is true: set safe=false, severity="critical", reason="forbidden_roof_scene".\nIf worker_standing_on_guardrail is true: set safe=false, severity="critical", reason="critical_violation".\nIf worker_on_ladder_as_workstation is true: set safe=false, severity="critical", reason="access_violation".\nIf scaffold_visible is not true: set safe=false, severity="critical", reason="access_violation".\nIf scaffold_platform_complete is not true: set safe=false, severity="critical", reason="access_violation".\nIf scaffold_guardrails_visible is not true: set safe=false, severity="critical", reason="critical_violation".\nIf workers_supported_by_platform is not true: set safe=false, severity="critical", reason="access_violation".\nIf interior_painting_visible is true: set safe=false, severity="critical", reason="service_visual_mismatch".\nIf facade_fully_completed is true: set safe=false, severity="critical", reason="service_visual_mismatch".\nIf facade_work_in_progress is not true: set safe=false, severity="critical", reason="service_visual_mismatch".\nIf service_visual_match is not true: set safe=false, severity="critical", reason="service_visual_mismatch".\nIf worker_count_matches_plan is not true: set safe=false, severity="critical", reason="worker_count_mismatch".\nDo NOT reject because no fall-arrest harness is visible — scaffold guardrails are sufficient protection for facade work. Do NOT reject because a small step-ladder is present on the platform to help reach a high spot — this is normal and acceptable.`,
    reject_conditions: [
      { field: 'worker_on_roof_surface',          value: true,            reason: 'forbidden_roof_scene'    },
      { field: 'worker_standing_on_guardrail',    value: true,            reason: 'critical_violation'      },
      { field: 'worker_on_ladder_as_workstation', value: true,            reason: 'access_violation'        },
      { field: 'scaffold_visible',                not_exactly_true: true, reason: 'access_violation'        },
      { field: 'scaffold_platform_complete',      not_exactly_true: true, reason: 'access_violation'        },
      { field: 'scaffold_guardrails_visible',     not_exactly_true: true, reason: 'critical_violation'      },
      { field: 'workers_supported_by_platform',   not_exactly_true: true, reason: 'access_violation'        },
      { field: 'interior_painting_visible',       value: true,            reason: 'service_visual_mismatch' },
      { field: 'facade_fully_completed',          value: true,            reason: 'service_visual_mismatch' },
      { field: 'facade_work_in_progress',         not_exactly_true: true, reason: 'service_visual_mismatch' },
      { field: 'service_visual_match',            not_exactly_true: true, reason: 'service_visual_mismatch' },
      { field: 'worker_count_matches_plan',       not_exactly_true: true, reason: 'worker_count_mismatch'   },
    ],
  },

  'Traitement anti-mousse toiture': {
    vision_instruction: `\n\nSERVICE VISUAL GATE — ANTI-MOSS TREATMENT (MEWP): This image must show two visible professional workers — one inside the MEWP basket, one at ground level beside the machine. You MUST add these fields to your JSON: "worker_in_mewp_basket_visible": <true/false — a worker is clearly visible inside the MEWP basket with guardrails>, "ground_worker_visible": <true/false — a second worker is clearly visible at ground level beside the MEWP base, NOT hidden behind the chassis, boom or any obstacle>, "workers_spatially_separated": <true/false — the basket worker and the ground worker are visibly in two different spatial positions>, "treatment_application_visible": <true/false — biocidal product is being applied to mossy roof tiles>, "worker_on_roof": <true/false — any worker is on the roof tiles rather than inside the basket>. If worker_on_roof is true: set safe=false, severity="critical", reason="forbidden_roof_scene". If worker_in_mewp_basket_visible is not true: set safe=false, severity="critical", reason="worker_count_mismatch". If ground_worker_visible is not true: set safe=false, severity="critical", reason="worker_count_mismatch". If workers_spatially_separated is not true: set safe=false, severity="critical", reason="worker_count_mismatch".`,
    reject_conditions: [
      { field: 'worker_on_roof',                value: true,            reason: 'forbidden_roof_scene'  },
      { field: 'worker_in_mewp_basket_visible', not_exactly_true: true, reason: 'worker_count_mismatch' },
      { field: 'ground_worker_visible',         not_exactly_true: true, reason: 'worker_count_mismatch' },
      { field: 'workers_spatially_separated',   not_exactly_true: true, reason: 'worker_count_mismatch' },
    ],
  },
};

// ─── SERVICE_VISUAL_MISMATCH_RETRY ───────────────────────────────────────────
// Per-service prompt suffix injected when a previous image was rejected with
// service_visual_mismatch. Appended AFTER _appendLockedFinalConstraints.
// Only active on regenerate_after_safety_reject retries. Not a gate change.
const SERVICE_VISUAL_MISMATCH_RETRY = {
  'Étanchéité acrotère': `VISUAL MISMATCH RETRY — MAKE THE WATERPROOFING UPSTAND UNMISTAKABLE:
Make the waterproofing upstand unmistakable.
Clearly show the membrane covering the flat roof and turning vertically up the inner face of the raised parapet.
Both the horizontal membrane and the vertical upstand must be simultaneously visible.
Keep exactly two fully visible workers treating this roof-to-parapet junction.`,
};

// ─── SOLIN_SAFETY_RETRY ──────────────────────────────────────────────────────
// Keyed by safety.reason (task.error on retry). Injected into the prompt when a
// solin/faitage image is rejected for a safety violation. Not a gate change.
const SOLIN_SAFETY_RETRY = {
  access_violation: `SAFETY RETRY — TWO SEPARATE LADDERS MUST BE UNMISTAKABLY VISIBLE:
Show two separate professional ladders simultaneously inside the frame:
1. A professional extension ladder leaning against the facade wall — base on stable flat ground, reaching the eave level — used only to access the roof, NOT to work on the slope.
2. A hooked roof ladder lying flat on the pitched roof slope — starting near the eave and running up to the ridge where the large metal ridge hooks grip clearly over the ridge coping.
Step back to a wide enough framing that both ladders, both workers, and the solin repair zone are simultaneously visible.
Do not crop either ladder. Do not zoom in on the repair detail only.
Worker 1 must be on the hooked roof ladder rungs — not freely standing on the tiles.
Worker 2 must be at ground level near the facade ladder base.`,
  forbidden_roof_scene: `SAFETY RETRY — HOOKED ROOF LADDER MUST BE CLEARLY VISIBLE ON THE SLOPE:
The hooked roof ladder must be clearly visible lying flat on the pitched tile slope from the eave up to the ridge, with its large metal ridge hooks gripping over the ridge coping.
Worker 1 KNEELS ASTRIDE THE RUNGS of the hooked roof ladder at chimney level — both knees on the rungs, body supported by the ladder, NOT standing or kneeling freely on the tiles.
Worker 2 stands 2–3 metres to the side of the facade ladder base in the open driveway, outside the drop zone.
Keep the facade access ladder leaning against the wall fully visible.
Step back enough that both ladders, both workers, and the chimney are all simultaneously visible.`,
  critical_violation: `SAFETY RETRY — WORKER 2 MUST BE CLEARLY OUTSIDE THE DROP ZONE:
Worker 2 must stand 2–3 metres to the SIDE of the facade access ladder base — in the open driveway or garden, completely outside the vertical falling-object path below the chimney.
Worker 2 must NOT be standing under the facade ladder, under the chimney, or anywhere in the vertical column below the repair zone.
Worker 2 holds a pre-cut zinc strip or a tool in the open driveway — clearly separated and not below the work zone.
Keep both ladders fully visible and keep Worker 1 on the hooked roof ladder rungs at the chimney level.`,
  worker_count_mismatch: `SAFETY RETRY — EXACTLY TWO WORKERS MUST BE VISIBLE IN THE FRAME (solin repair):
COMPOSITION: Step far back from the house. Worker 2 must be the LARGEST, CLOSEST figure — standing prominently in the foreground of the driveway, 2–3 metres to the SIDE of the facade ladder, holding a rolled zinc solin strip. Worker 1 is smaller in the background, kneeling astride the hooked roof ladder rungs at chimney level on the fully-tiled pitched roof slope.
Both workers must be simultaneously visible. Do not crop either one out.
Keep both ladders fully visible: the facade access ladder against the wall AND the hooked roof ladder lying flat on the same tiled slope as the chimney with ridge hooks at the ridge.
Do not show only one worker. Do not show three or more workers. Exactly two.`,
};

// ─── RAVALEMENT_SCAFFOLD_RETRY ───────────────────────────────────────────────
// Injected on regenerate_after_safety_reject for Ravalement de façade.
// critical_violation = scaffold_guardrails_visible failed → reinforce guardrails.
// access_violation   = scaffold_platform_complete / scaffold_visible failed →
//   reinforce platform AND guardrails (cumulative: both constraints always required).
const RAVALEMENT_SCAFFOLD_RETRY = {
  critical_violation: `SCAFFOLD SAFETY RETRY — GUARDRAILS MUST BE UNMISTAKABLY VISIBLE:
Make the outer TOP GUARDRAIL and MIDRAIL unmistakably visible as two continuous bright galvanized horizontal steel tubes running across the entire outer face of the working platform.
One rail at waist height, one rail below it — both clearly readable as distinct metallic tubes.
Do NOT hide them behind workers, mesh, tarpaulin, material, or perspective foreshortening.
Both workers must remain fully inside the guardrails — feet on the deck, not on the tubes.
Step back enough that the full outer platform edge with both rails is simultaneously visible in the frame.`,
  access_violation: `SCAFFOLD SAFETY RETRY — COMPLETE PLATFORM AND GUARDRAILS MUST BOTH BE UNMISTAKABLY VISIBLE:
PLATFORM: Show one continuous edge-to-edge working deck beneath both workers' feet — no gaps, no missing boards, no improvised planks, no cropped platform sections. The deck must span the full width between the two scaffold uprights.
GUARDRAILS: Make the outer TOP GUARDRAIL and MIDRAIL unmistakably visible as two continuous bright galvanized horizontal steel tubes running across the entire outer face of the working platform — one rail at waist height and one rail below it.
Do NOT hide the rails behind workers, mesh, tarpaulin, or material.
The scaffold base plates must also remain visible at the bottom of the frame.
Step back enough that the base, the complete deck, and both outer guardrail rails are simultaneously visible.`,
};

export { FORBIDDEN_SAFETY_BY_METIER, _PRE_GEN_SAFETY, SAFETY_CHECK_RULES, SERVICE_VISUAL_GATE_RULES, _SERVICE_GATE_ALIASES, SERVICE_VISUAL_MISMATCH_RETRY, SOLIN_SAFETY_RETRY, RAVALEMENT_SCAFFOLD_RETRY };
