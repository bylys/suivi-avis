/**
 * prompt/locked-constraints.js — Phase 5 shadow copy (source active : app.js)
 * Ajout des contraintes finales verrouillées au prompt image réécrit.
 * Entrée : prompt réécrit (string) + scène résolue (objet).
 * Sortie : prompt final (string).
 * Aucun réseau, aucun DOM, aucun window.
 * Ne pas modifier avant le cutover validé.
 */

import { CAMERA_COMPOSITIONS, COMPOSITION_RULES_BY_METIER } from '../config/compositions.js';
import { FORBIDDEN_SAFETY_BY_METIER } from '../safety/safety-rules.js';

// ─── _appendLockedFinalConstraints ────────────────────────────────────────────
// Verbatim copy — app.js lines 12869–12935
function _appendLockedFinalConstraints(prompt, scene) {
  const compKey   = scene.composition || 'medium_intervention';
  const camDef    = CAMERA_COMPOSITIONS[compKey] || CAMERA_COMPOSITIONS.medium_intervention;
  const defects   = scene._capture_defects_resolved || [];
  const metier    = scene._matched_key || '';

  const defectsBlock = defects.length > 0
    ? defects.map(d => `- ${d.prompt}`).join('\n')
    : '- subtle JPEG compression and ordinary smartphone processing\n- slightly tilted handheld framing';

  const metierRules = COMPOSITION_RULES_BY_METIER[metier] || {};
  const forbiddenFr = (metierRules.forbidden_framing || []).map(f => `No ${f}.`).join('\n');

  // WORKER PRESENCE — human presence constraint (separate from safety rules)
  const sceneWorkers  = scene.var_workers || 0;
  const scenePresence = scene.var_presence || 'none';
  const hasWorkers    = sceneWorkers > 0 || scenePresence === 'workers';
  const workerBlock   = hasWorkers
    ? sceneWorkers >= 2
      ? `EXACTLY TWO VISIBLE PROFESSIONAL WORKERS.\nBoth Worker 1 and Worker 2 must be clearly visible in the final image.\nThey must perform two distinct, service-relevant roles.\nA one-worker image is invalid.`
      : `EXACTLY ONE VISIBLE PROFESSIONAL WORKER must be actively working and clearly visible in the frame.`
    : 'No workers or people visible in this specific image. Frame the scene to show work evidence, tools, or surroundings — no human figures.';

  // REQUIRED SAFETY (PPE when workers are visible)
  const requiredSafety = [];
  if (scene._worker_safety_mode && hasWorkers) requiredSafety.push(scene._worker_safety_mode);

  // FORBIDDEN SAFETY VIOLATIONS — real safety rules only, NOT presence constraints
  const forbiddenSafety = [];
  const triRule = scene.triangle_rule;
  if (triRule === 'forbidden' || triRule === 'forbidden_if_safely_parked')
    forbiddenSafety.push('No warning triangle visible anywhere in the image.');
  forbiddenSafety.push(...(FORBIDDEN_SAFETY_BY_METIER[metier] || []));

  // ROOF FALL SAFETY — absolute constraint injected for all roof-related métiers
  const _ROOF_METIERS = ['toiture', 'nettoyage_toiture', 'nettoyage_gouttieres', 'etancheite'];
  const isRoofMetier = _ROOF_METIERS.includes(metier);

  // ACTIVE CREW RULE — injected for all active roof and gutter métiers with visible workers
  const _CREW_METIERS = ['toiture', 'nettoyage_toiture', 'nettoyage_gouttieres'];
  const isCrewMetier = _CREW_METIERS.includes(metier);

  // INTERIOR SETTING — service-specific surface locks
  const _SVC_SURFACE_LOCK = {
    'Faïence salle de bain': {
      active_surface: 'vertical wet-area bathroom wall',
      must_have:   'indoor bathroom with shower, bathtub or washbasin visible in frame',
      forbidden:   'house exterior, roof, garden, outdoor ladder, floor tiling as the main action',
    },
    'Faïence cuisine': {
      active_surface: 'vertical kitchen backsplash wall',
      must_have:   'kitchen backsplash wall above the worktop; countertop (worktop) and kitchen cupboards visible in frame',
      forbidden:   'floor tiling as the main action, bathroom context, horizontal floor surface as the main subject',
    },
    'Remplacement double vitrage': {
      active_surface: 'insulating glass unit (IGU) — thick double-pane unit being installed or removed near the window opening; old unit may show fogging or condensation between the panes',
      must_have:   'interior apartment room clearly visible; worker(s) with cut-resistant glazing gloves gripping suction cup handles to manoeuvre the IGU; slightly oblique camera angle — no glass panel standing directly between the camera and the workers; all hands and suction cups on the near side of the glass, never appearing to pass through or merge with the transparent surface',
      forbidden:   'IGU edge filling the extreme foreground as the main subject with hands framing it on both sides; any hand, arm or suction cup appearing to intersect or pass through the glass surface; glass panel as a flat vertical wall between camera and workers with workers visible only through the glass; straight-on point-blank view with glass filling the entire frame; loose broken glass fragments on the floor',
    },
    'Vitrage sécurité feuilleté': {
      active_surface: 'cracked laminated safety glass pane — spider-web fracture pattern across the surface, all glass fragments bonded in one intact piece with no loose shards',
      must_have:   'interior apartment room clearly visible; cracked pane with spider-web fracture pattern visible — all fragments held together, no loose shards on the floor; worker(s) with heavy-duty glazing gloves and suction cups; slightly oblique camera angle — no glass surface standing directly between camera and workers; all hands and suction cups on the near side of the glass, never appearing to pass through or merge with the transparent surface',
      forbidden:   'clean uncracked glass being handled without any fracture pattern — indistinguishable from any other glazing job; loose glass fragments scattered on the floor — laminated glass must stay in one piece; any hand, arm or suction cup appearing to pass through or merge with the glass surface; glass panel as a flat vertical wall between camera and workers; metallic spacer bar at the glass edge; insulating sealed cavity between panes',
    },
  };
  // SERVICE ACTION LOCK — service-specific action mandate + forbidden content
  // Applied for non-interior services where GPT-Image may generate a wrong scene type.
  const _SVC_ACTION_LOCK = {
    'Taille de haie': {
      action:    `ACTIVE HEDGE TRIMMING IN PROGRESS.\nEXACTLY TWO VISIBLE PROFESSIONAL LANDSCAPING WORKERS.\nWorker 1 actively operates a hedge trimmer against the hedge.\nWorker 2 collects fresh cuttings laterally, clearly away from the moving blades.\nA hedge and an active hedge trimmer must both be clearly visible.\nThe primary action must be hedge trimming.`,
      forbidden: `NO ROOF WORK.\nNO WORKER ON A ROOF.\nNO ROOF LADDER.\nNO ROOF TILES.\nNO ROOF REPAIR.\nNO GUTTER WORK.\nNO SCAFFOLDING FOR ROOF ACCESS.\nNO BLOWER-ONLY OR CLEANUP-ONLY SCENE.`,
    },
  };
  const svcActionLock = _SVC_ACTION_LOCK[scene._matched_service || ''] || null;

  const isInterior = (scene.setting === 'interior');
  const svcLock    = _SVC_SURFACE_LOCK[scene._matched_service || ''] || null;
  const _svcLower  = (scene._matched_service || '').toLowerCase();
  const isTreatmentService = /anti.mousse|hydrofuge/.test(_svcLower);

  return `${prompt}

NON-NEGOTIABLE FINAL CAPTURE CONSTRAINTS — DO NOT REMOVE, WEAKEN, REINTERPRET OR CONTRADICT:

WORKER PRESENCE:
${workerBlock}
${svcActionLock ? `
SERVICE ACTION LOCK — ${(scene._matched_service || '').toUpperCase()}:
${svcActionLock.action}

SERVICE FORBIDDEN CONTENT:
${svcActionLock.forbidden}` : ''}
${isInterior ? `
SETTING AND LOCATION — LOCKED
- The entire scene must be entirely indoors. No exterior facade, no garden, no outdoor environment.
- The camera must be physically inside the room. No outside views, no street, no driveway.
- No professional vehicle visible anywhere in the scene.${svcLock ? `
- Active surface: ${svcLock.active_surface}. Required in frame: ${svcLock.must_have}.
- Not allowed: ${svcLock.forbidden}.` : ''}
` : ''}
CAMERA COMPOSITION: ${compKey}
Distance from subject: ${camDef.distance}.
The main work detail must not fill more than ${camDef.subject_max_frame_percent}% of the frame.
The location and surrounding context must remain visible (minimum ${camDef.environment_min_frame_percent}% of frame).
${(camDef.required || []).map(r => `- ${r}`).join('\n')}
${(camDef.forbidden || []).map(f => `Not: ${f}.`).join('\n')}
${forbiddenFr}

SUBTLE CAPTURE IMPERFECTIONS:
These imperfections must remain slight and naturally perceptible. They must never become the main subject, obscure the work, reduce safety readability, or make the image look intentionally damaged.
Optical defects (finger, smudge, dirt) must remain at the extreme edge of the frame and must never cover the work, a worker's face or body, safety equipment, the professional vehicle, or any technically important area.
${defectsBlock}

DOCUMENTARY STYLE:
Ordinary handheld smartphone documentation photograph. Casual business-owner or worker photo.
Not a commercial photograph. Not product photography. Not catalogue photography. Not architectural visualization. Not CGI.
No perfect symmetry. No perfect tool arrangement. No exaggerated sharpness. No cinematic depth of field.
No tools neatly lined up for the camera. No equipment arranged in a semicircle. No perfectly centred machine or tool.
No spotless equipment unless the service logically requires new equipment. No studio-like sharpness.
Equipment must show reasonable signs of use: light dust, marks, unrolled hose, open case, crumpled tarpaulin.

BRANDING:
No readable brand names. No readable vehicle manufacturer logos as a focal point. No fake company branding.
No generated licence plate text intended to be readable. No prominent text on tools, gauges, vehicles or clothing.
Generic unbranded professional equipment. Any unavoidable text must be tiny, incidental and unreadable.
${requiredSafety.length > 0 ? '\nREQUIRED SAFETY ELEMENTS:\n' + requiredSafety.map(s => `- ${s}`).join('\n') : ''}
${forbiddenSafety.length > 0 ? '\nFORBIDDEN SAFETY VIOLATIONS:\n' + forbiddenSafety.join('\n') : ''}
${isRoofMetier && hasWorkers ? `
NON-NEGOTIABLE ROOF FALL SAFETY:
If any worker is physically positioned on a pitched roof, the image must visibly show a complete and physically coherent safe-access and fall-protection configuration.

Accepted configurations:
- Stabilized access ladder with standoff, secured hooked roof ladder following the slope with hooks over the ridge, connected fall-arrest harness with lanyard leading to a visible credible ridge or roof anchor
- Scaffold with stable working platform and guardrails
- MEWP basket with worker remaining inside, basket guardrails visible
- Collective edge protection with secured access path

A worker freely standing on pitched tiles without visible protection is a critical safety violation.
A backpack sprayer, shoulder straps, ordinary jacket, or unconnected harness must NEVER be interpreted as fall protection.
The harness and lifeline must visibly connect to a plausible anchor.
No safety line may be attached to: gutter, chimney cap, antenna, skylight, unsecured ladder, or decorative roof element.` : ''}
${isCrewMetier && sceneWorkers >= 2 ? `
NON-NEGOTIABLE ACTIVE CREW RULE:
For active roof and gutter work (debut, encours, semifinal state), show at least two visible professional workers with distinct and physically credible roles.
Worker 1: performs the roof or gutter intervention from secured elevated access.
Worker 2: manages hose, tools or debris collection, or supervises the access zone from a safe position — must NOT be standing directly below the falling-object zone.
The second worker must not replace required access or fall-protection equipment.
Forbidden: two identical workers performing the same gesture; two workers freely standing on pitched tiles; second worker posing for the camera; second worker standing directly below falling debris.` : ''}
${isTreatmentService && hasWorkers ? `
NON-NEGOTIABLE ELEVATED ACCESS:
The roof treatment must be performed from one complete elevated-access system:
1. MEWP basket with guardrails and visible boom — Worker 1 completely inside the basket, NOT on roof tiles,
2. complete scaffold platform with guardrails on the open side — Worker 1 on the platform, NOT on roof tiles,
3. stabilized access ladder plus secured hooked roof ladder and visibly connected fall-arrest system.
No treatment may be performed from ground level.
No worker may freely stand, walk or kneel on pitched roof tiles.
At least two professional workers must be clearly visible with distinct roles.
A backpack sprayer, shoulder straps, an ordinary ladder or a loose rope must never be interpreted as fall protection.` : ''}`.trim();
}

export { _appendLockedFinalConstraints };
