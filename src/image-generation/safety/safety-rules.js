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
    'No ladder leaning directly against or inside the gutter channel',
    'No single worker performing active gutter work alone — minimum two workers required',
    'No ground-level gutter vacuum or telescopic ground pole as the only access method',
    'No worker standing on the gutter trough',
    'No ground-level downpipe unblocking — worker must be on a ladder, scaffold or MEWP at the gutter outlet to perform active downpipe clearance',
    'No worker crouching at the downpipe base as the primary access method for active downpipe unblocking',
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
  etancheite:        'Worker near flat roof edge must have a harness. No person on the parapet coping. No open-flame torch near a loose membrane. Roof hatch must remain clear.',
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
  nettoyage_gouttieres: "You are a worksite safety inspector. Return ONLY valid JSON: {\"safe\":true/false,\"severity\":\"ok\"/\"warning\"/\"critical\",\"reason\":\"string\"}. CRITICAL if you clearly see: ladder leaning directly against or inside the gutter channel without standoff; person reaching far sideways past their center of gravity off the ladder; person standing on the top two rungs; single worker performing active gutter work with no second worker visible; ground-level gutter vacuum or telescopic pole as the only access method for active gutter cleaning; worker crouching at the downpipe base feeding rods with no elevated access at the gutter outlet — all active gutter and downpipe work requires a ladder, scaffold or MEWP at eave height. Do not reject for minor imperfections. Reject only when a clearly visible critical safety impossibility is present.",
  etancheite:           "You are a worksite safety inspector. Return ONLY valid JSON: {\"safe\":true/false,\"severity\":\"ok\"/\"warning\"/\"critical\",\"reason\":\"string\"}. CRITICAL if you clearly see: person balanced on parapet coping; open-flame torch near a loose membrane edge; roll blocking the only roof access hatch; person within 2 m of flat roof edge with no harness. Do not reject for minor imperfections. Reject only when a clearly visible critical safety impossibility is present.",
  ravalement:           "You are a worksite safety inspector. Return ONLY valid JSON: {\"safe\":true/false,\"severity\":\"ok\"/\"warning\"/\"critical\",\"reason\":\"string\"}. CRITICAL if you clearly see: person leaning out past scaffold guardrail over the void; scaffold platform above 2 m with no guardrail; unsupported plank bridging two scaffold frames. Do not reject for minor imperfections. Reject only when a clearly visible critical safety impossibility is present.",
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
  'taille haie':    'Taille de haie',
  'taille-de-haie': 'Taille de haie',
};

const SERVICE_VISUAL_GATE_RULES = {
  // reject_conditions fields:
  //   value         : reject if obj[field] === value  (for forbidden true-values)
  //   not_exactly_true: reject if obj[field] !== true  (fail-closed: absent or false both reject)
  'Taille de haie': {
    vision_instruction: `\n\nSERVICE VISUAL GATE — HEDGE TRIMMING: This image must show active hedge trimming as the primary action. You MUST add these fields to your JSON: "hedge_visible": <true/false>, "hedge_trimmer_visible": <true/false>, "active_trimming_visible": <true/false>, "worker_on_roof": <true/false>, "roof_work_visible": <true/false>, "service_visual_match": <true if hedge trimming is clearly the primary action, else false>. If worker_on_roof is true, set safe=false, severity="critical", reason="forbidden_roof_scene". If roof_work_visible is true, set safe=false, severity="critical", reason="forbidden_roof_scene". If hedge_visible is not true, set safe=false, severity="critical", reason="service_visual_mismatch". If hedge_trimmer_visible is not true, set safe=false, severity="critical", reason="service_visual_mismatch". If service_visual_match is not true, set safe=false, severity="critical", reason="service_visual_mismatch".`,
    reject_conditions: [
      { field: 'worker_on_roof',        value: true,          reason: 'forbidden_roof_scene' },
      { field: 'roof_work_visible',     value: true,          reason: 'forbidden_roof_scene' },
      { field: 'hedge_visible',         not_exactly_true: true, reason: 'service_visual_mismatch' },
      { field: 'hedge_trimmer_visible', not_exactly_true: true, reason: 'service_visual_mismatch' },
      { field: 'service_visual_match',  not_exactly_true: true, reason: 'service_visual_mismatch' },
    ],
  },
};

export { FORBIDDEN_SAFETY_BY_METIER, _PRE_GEN_SAFETY, SAFETY_CHECK_RULES, SERVICE_VISUAL_GATE_RULES, _SERVICE_GATE_ALIASES };
