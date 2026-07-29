/**
 * vitrier-contracts.js — Phase vitrier, visual contracts
 * Source canonique unique. Ne pas dupliquer ailleurs.
 * Utilisé par les tests no-cost (vitrier-contracts-tests.js).
 * Aucun impact pipeline de production — pas importé dans services/index.js ni SITE_REALISM.
 */

// ─── Familles visuelles ───────────────────────────────────────────────────────
// F1 Vitrage brisé ponctuel   — Remplacement vitrage brisé
// F2 Double vitrage           — Remplacement double vitrage
// F3 Fenêtre PVC complète     — Remplacement fenêtre PVC
// F4 Fenêtre aluminium        — Remplacement fenêtre aluminium
// F5 Réparation partielle     — Réparation fenêtre
// F6 Porte vitrée             — Remplacement porte vitrée
// F7 Vitrage sécurité         — Vitrage sécurité feuilleté
// F8 Urgence bris de glace    — Bris de glace urgence

export const VITRIER_VISUAL_CONTRACTS = {

  remplacement_vitrage_brise: {
    service_key:   'remplacement_vitrage_brise',
    service_label: 'Remplacement vitrage brisé',
    visual_goal:   'Show the permanent replacement of a broken or cracked single glass pane in a residential window frame. The broken pane must be identifiable — visible cracks, missing section, or fragments — and the replacement work in progress.',
    observable_action: 'Worker removing broken pane fragments or inserting new glass pane into existing window frame using suction cups and glazing tools.',
    required_visual_evidence: [
      'broken or cracked glass pane (cracks, missing section, or fragments) visible in or near the frame',
      'glazier tools present: suction cup handle, putty knife, or caulk gun',
      'existing window frame intact (only the glass is being replaced)',
      'new glass pane visible nearby or being inserted',
      'cut-resistant gloves on worker hands',
    ],
    forbidden_confusions: [
      'full window frame replacement (frame must stay — only the glass changes)',
      'emergency boarding-up or provisional film (this is permanent replacement)',
      'double vitrage IGU unit (thick sandwich panel with spacer bar)',
      'commercial vitrine or storefront context',
      'clean intact window with no trace of breakage',
    ],
    allowed_tools: [
      'suction cup lifting handle',
      'putty knife or scraper',
      'caulk gun or silicone gun',
      'glazing spacers (plastic shims)',
      'glass cutter',
      'rubber mallet',
      'tape measure',
    ],
    forbidden_tools: [
      'power drill or screwdriver on the frame (frame is not being replaced)',
      'angle grinder',
      'hammer drill',
      'roofing tools',
      'roller brush or paint tray',
    ],
    glass_type:   ['single pane — standard float glass or tempered'],
    frame_type:   ['existing frame retained — PVC, wood, or aluminium — not replaced'],
    work_surface: ['window opening in facade wall — frame perimeter and glass rebate'],
    setting:      ['exterior'],
    location_types: ['maison_individuelle', 'appartement', 'immeuble'],
    damage_or_installation_state: ['broken or cracked pane — visible cracks or missing glass section'],
    worker_rules: {
      presence: 'required',
      min: 1,
      max: 1,
      posture: 'standing or slightly leaning — facing the window frame, arms raised to handle glass at frame height; suction cup gripped in both hands',
    },
    safety: {
      required: [
        'cut-resistant gloves (leather or anti-cut textile) on both hands',
        'safety glasses or goggles during glass removal',
        'cardboard or rubber mat on sill below the frame',
      ],
      conditional: [
        'knee pads if working on a low ground-floor window',
      ],
      forbidden: [
        'bare hands on glass edges',
        'broken glass left unsecured on the ground without containment',
        'worker leaning bare forearms on broken frame',
      ],
    },
    states: {
      debut: {
        observable_action: 'Assessing and securing the broken pane. Removing loose fragments. Protecting the work zone.',
        required_visual_evidence: [
          'broken pane or significant cracks clearly visible in the frame',
          'cardboard or rubber mat on windowsill or ground below',
          'glazier wearing cut-resistant gloves',
          'new glass pane leaning against wall nearby — still in packaging or unprotected',
        ],
      },
      encours: {
        observable_action: 'Removing remaining fragments and inserting new glass pane. Applying glazing spacers.',
        required_visual_evidence: [
          'suction cup handle gripped by worker on new pane',
          'frame rebate partially cleared of old putty or sealant',
          'new glass pane partially inserted into frame rebate',
          'glazing spacers (plastic shims) visible at glass edges',
        ],
      },
      semifinal: {
        observable_action: 'New pane fully seated in frame. Applying sealant bead around the perimeter.',
        required_visual_evidence: [
          'new glass fully in frame, no broken glass remaining',
          'wet sealant or putty bead visible around the glass perimeter',
          'caulk gun or putty knife held by worker',
        ],
      },
      final: {
        observable_result: 'Replaced glass pane — clear and intact in the existing frame. Neat sealant bead. Residual cracks on nearby wall or debris removed.',
        required_visual_evidence: [
          'clear intact glass in the existing window frame',
          'neat sealant bead visible at frame-glass junction',
          'no broken glass remaining on windowsill or ground',
          'original frame clearly still in place (not a new full window)',
        ],
      },
    },
    composition_preferences: ['close_detail', 'medium_intervention'],
    for_regex: 'vitrage.*bris|bris.*vitrage',
  },

  remplacement_double_vitrage: {
    service_key:   'remplacement_double_vitrage',
    service_label: 'Remplacement double vitrage',
    visual_goal:   'Show the removal of a failed or old insulating glass unit (IGU) and installation of a new double-pane unit in an existing window frame. The thick double-pane sandwich must be identifiable — visible spacer bar edge, IGU thickness — distinguishing it from a simple single-pane replacement.',
    observable_action: 'Worker extracting old IGU from existing frame using suction cups, or inserting new double-pane unit into the frame rebate. Glazing spacers being positioned.',
    required_visual_evidence: [
      'double-pane IGU unit visible — identifiable by thickness (typically 24–28 mm) or visible spacer bar at the edge',
      'existing window frame retained (only the glass unit is replaced)',
      'suction cup handle on the IGU face',
      'glazing bead or parclose strip nearby or being remounted',
      'cut-resistant gloves on worker',
    ],
    forbidden_confusions: [
      'single pane replacement (no spacer bar, thin glass)',
      'two independent single panes placed side by side',
      'full window frame replacement (frame stays)',
      'broken glass context (this is a planned replacement, not emergency)',
      'triple glazing (three visible panes)',
    ],
    allowed_tools: [
      'suction cup handle (large format for IGU)',
      'glazing bead removal tool or flat pry bar',
      'rubber mallet',
      'glazing spacers',
      'silicone gun',
      'tape measure',
    ],
    forbidden_tools: [
      'glass cutter (IGU is pre-cut to size)',
      'angle grinder',
      'hammer drill',
      'roofing tools',
    ],
    glass_type:   ['double-pane insulating glass unit (IGU) — two glass panes with spacer bar and sealed air or gas gap'],
    frame_type:   ['existing window frame retained — PVC, wood, or aluminium'],
    work_surface: ['window frame rebate — inner channel accepting the IGU unit'],
    setting:      ['exterior'],
    location_types: ['maison_individuelle', 'appartement', 'immeuble'],
    damage_or_installation_state: ['old or failed IGU being removed — may show condensation between panes or intact but worn unit'],
    worker_rules: {
      presence: 'required',
      min: 1,
      max: 2,
      posture: 'standing facing the window frame, both hands on suction cup handle; second worker steadies the unit from below for larger formats',
    },
    safety: {
      required: [
        'cut-resistant gloves on both hands',
        'safety glasses during depose',
        'rubber mat or cardboard on sill below frame',
      ],
      conditional: [
        'two workers required if IGU width exceeds 80 cm',
        'suction cup lifting handle mandatory for large IGU',
      ],
      forbidden: [
        'bare hands on glass edges',
        'single worker handling IGU wider than 100 cm unaided',
      ],
    },
    states: {
      debut: {
        observable_action: 'Removing glazing beads (parcloses) to access the old IGU. Measuring frame rebate.',
        required_visual_evidence: [
          'glazing bead strips partially removed or stacked against the wall',
          'tape measure or level near the frame',
          'old IGU still in frame — may show visible fogging or condensation between panes',
          'worker wearing gloves',
        ],
      },
      encours: {
        observable_action: 'Extracting old IGU from frame using suction cups. New unit positioned nearby ready for insertion.',
        required_visual_evidence: [
          'suction cup handle attached to IGU face',
          'new double-pane unit leaning against the wall nearby — spacer bar visible on edge',
          'glazing bead strips removed and set aside',
          'frame rebate exposed and partially cleaned',
        ],
      },
      semifinal: {
        observable_action: 'New IGU fully seated in frame rebate. Refitting glazing beads. Applying perimeter sealant.',
        required_visual_evidence: [
          'new IGU in frame — spacer bar edge visible at bottom or side',
          'glazing bead being tapped back into position',
          'silicone gun held by worker for perimeter bead',
        ],
      },
      final: {
        observable_result: 'New double-pane unit installed in existing frame. Clear glass, neat glazing beads fully refitted. No condensation.',
        required_visual_evidence: [
          'new clear IGU in frame — no condensation, no spacer bar misalignment',
          'glazing beads fully refitted around perimeter',
          'clean frame, no sealant residue on glass face',
          'existing frame clearly still in place (not a new full window)',
        ],
      },
    },
    composition_preferences: ['medium_intervention', 'close_detail'],
    for_regex: 'double.vitrage',
  },

  remplacement_fenetre_pvc: {
    service_key:   'remplacement_fenetre_pvc',
    service_label: 'Remplacement fenêtre PVC',
    visual_goal:   'Show the removal of an old window and installation of a new full PVC window unit (frame + glass). The white plastic frame must be clearly identifiable. This is a complete window replacement — dormant and ouvrant — not just a glass change.',
    observable_action: 'Worker installing new white PVC window frame in the rough opening, levelling and shimming the dormant, or fitting the ouvrant.',
    required_visual_evidence: [
      'white PVC window frame being installed — plastic texture clearly visible',
      'new window unit either in the rough opening or leaning nearby',
      'old window frame removed or in process of being removed — exposed masonry or brickwork visible at opening edges',
      'levelling shims and/or expanding foam at frame perimeter',
    ],
    forbidden_confusions: [
      'aluminium window frame (grey/dark metal — see Remplacement fenêtre aluminium)',
      'wooden window frame',
      'glass-only replacement (the full frame is being replaced here)',
      'door replacement (window format: width < height, standard residential proportion)',
      'glazed door — full door height',
    ],
    allowed_tools: [
      'cordless drill/screwdriver for fixing screws into masonry',
      'expanding foam gun (PU foam)',
      'level and tape measure',
      'rubber mallet for shimming',
      'silicone gun for perimeter seal',
      'flat pry bar for removing old frame',
    ],
    forbidden_tools: [
      'glass cutter (glass is pre-fitted in the PVC unit)',
      'suction cup handle as primary tool (not for full frame installation)',
      'roofing tools',
    ],
    glass_type:   ['double-pane IGU factory-fitted in PVC frame — not individually handled on site'],
    frame_type:   ['PVC (polyvinyl chloride) — white, multi-chamber profile'],
    work_surface: ['window rough opening in masonry or rendered wall — exposed brickwork or concrete lintel visible'],
    setting:      ['exterior'],
    location_types: ['maison_individuelle', 'appartement', 'immeuble'],
    damage_or_installation_state: ['old frame removed or in removal — rough opening exposed'],
    worker_rules: {
      presence: 'required',
      min: 1,
      max: 2,
      posture: 'standing at window opening, holding or guiding new frame into rough opening; second worker steadies from outside for large windows',
    },
    safety: {
      required: [
        'work gloves for handling frame edges',
        'safety glasses if using expanding foam',
      ],
      conditional: [
        'two workers for window width above 120 cm',
        'scaffolding or ladder if above ground floor',
      ],
      forbidden: [
        'bare hands on sharp masonry edges of rough opening',
        'single worker handling a full PVC frame wider than 150 cm unaided',
      ],
    },
    states: {
      debut: {
        observable_action: 'Removing old window frame. Preparing rough opening.',
        required_visual_evidence: [
          'old window frame fully or partially removed — rough opening visible with exposed masonry edges',
          'old frame debris or old frame leaning against the wall',
          'new white PVC frame unit visible nearby — still sealed or partially unwrapped',
        ],
      },
      encours: {
        observable_action: 'Fitting new PVC frame into rough opening. Levelling and shimming.',
        required_visual_evidence: [
          'new white PVC frame partially or fully inserted in rough opening',
          'level tool resting on the frame top or worker holding it',
          'shim wedges visible at frame base or sides',
          'expanding foam partially applied at frame perimeter',
        ],
      },
      semifinal: {
        observable_action: 'Frame secured and shimmed. Hanging ouvrant (opening sash). Fitting glazing beads or hardware.',
        required_visual_evidence: [
          'white PVC frame fully in opening, shimmed and plumb',
          'ouvrant being fitted or adjusted on hinges',
          'perimeter gap partially sealed with foam or sealant',
        ],
      },
      final: {
        observable_result: 'New PVC window fully installed. White frame flush in wall opening. Clean perimeter sealant. Ouvrant functional.',
        required_visual_evidence: [
          'white PVC frame fully seated and sealed in wall opening',
          'clear glass in the new frame',
          'neat perimeter sealant at frame-wall junction',
          'no rough opening exposed — frame covers the opening perimeter',
        ],
      },
    },
    composition_preferences: ['medium_intervention', 'close_detail'],
    for_regex: 'fenetre.*pvc|pvc.*fenetre',
  },

  remplacement_fenetre_aluminium: {
    service_key:   'remplacement_fenetre_aluminium',
    service_label: 'Remplacement fenêtre aluminium',
    visual_goal:   'Show the removal of an old window and installation of a new full aluminium window unit. The grey or anthracite metal frame must be clearly identifiable — not white PVC. This is a complete window replacement.',
    observable_action: 'Worker installing new aluminium window frame (grey or dark metal finish) in the rough opening. Drilling, levelling, or sealing the frame.',
    required_visual_evidence: [
      'aluminium window frame — grey, silver, or anthracite metal finish, clearly metallic texture',
      'new aluminium frame in the rough opening or leaning nearby',
      'rough opening with exposed masonry or existing frame partially removed',
      'screws, anchoring hardware, or sealant at frame perimeter',
    ],
    forbidden_confusions: [
      'white PVC frame (see Remplacement fenêtre PVC)',
      'wooden frame',
      'glass-only replacement (full frame is replaced here)',
      'glazed door — full door height format',
    ],
    allowed_tools: [
      'cordless drill/screwdriver',
      'expanding foam gun',
      'level and tape measure',
      'silicone gun',
      'flat pry bar',
      'angle brackets or frame fixings',
    ],
    forbidden_tools: [
      'glass cutter',
      'roofing tools',
    ],
    glass_type:   ['double-pane IGU factory-fitted in aluminium frame'],
    frame_type:   ['aluminium — grey, silver, or RAL-coated (typically anthracite or dark grey) metal profile'],
    work_surface: ['window rough opening in masonry or rendered wall'],
    setting:      ['exterior'],
    location_types: ['maison_individuelle', 'appartement', 'immeuble'],
    damage_or_installation_state: ['old frame removed or in removal — rough opening partially exposed'],
    worker_rules: {
      presence: 'required',
      min: 1,
      max: 2,
      posture: 'standing at window opening, guiding aluminium frame into rough opening; second worker assists for large frames',
    },
    safety: {
      required: [
        'work gloves (aluminium frame edges are sharp)',
        'safety glasses during drilling into masonry',
      ],
      conditional: [
        'two workers for frame width above 120 cm',
        'scaffolding or ladder if above ground floor',
      ],
      forbidden: [
        'bare hands on sharp aluminium frame edge',
      ],
    },
    states: {
      debut: {
        observable_action: 'Removing old window. Preparing rough opening.',
        required_visual_evidence: [
          'rough opening exposed — old frame removed or being removed',
          'new aluminium frame visible nearby with metallic grey/dark finish',
          'masonry anchors or angle brackets staged for installation',
        ],
      },
      encours: {
        observable_action: 'Inserting aluminium frame into rough opening. Drilling and anchoring.',
        required_visual_evidence: [
          'grey or dark aluminium frame partially inserted in rough opening',
          'cordless drill in use for frame fixings',
          'level tool visible for alignment check',
        ],
      },
      semifinal: {
        observable_action: 'Frame anchored and plumb. Perimeter gap being sealed.',
        required_visual_evidence: [
          'aluminium frame fully in opening, drilling complete',
          'expanding foam or sealant being applied at perimeter',
          'ouvrant being adjusted or hardware being fitted',
        ],
      },
      final: {
        observable_result: 'New aluminium window installed. Grey or anthracite metal frame flush in wall opening. Clean perimeter seal.',
        required_visual_evidence: [
          'grey or anthracite aluminium frame fully installed and sealed in wall opening',
          'clear glass pane transparent in the new frame — no distortion, no cracks',
          'neat sealant bead at frame-wall junction',
          'no exposed rough opening',
        ],
      },
    },
    composition_preferences: ['medium_intervention', 'close_detail'],
    for_regex: 'fenetre.*alumin|alumin',
  },

  reparation_fenetre: {
    service_key:   'reparation_fenetre',
    service_label: 'Réparation fenêtre',
    visual_goal:   'Show a targeted repair on an existing window that remains mostly intact — not a full replacement. The original frame stays in place. Repair may involve: replacing a worn seal, repairing a handle or locking mechanism, adjusting hinges, or patching a localised damage.',
    observable_action: 'Worker performing a localised repair on an existing window — applying new seal strip, adjusting hardware, or filling localised frame damage — with the window remaining in place.',
    required_visual_evidence: [
      'existing window frame clearly in place and mostly intact',
      'localised repair work visible: seal strip being applied, hardware being adjusted, or small damaged area being addressed',
      'the glass pane is intact — no broken glass context',
      'targeted tools for the specific repair (screwdriver for hardware, sealant gun for seals)',
    ],
    forbidden_confusions: [
      'full window replacement (the frame must stay — no rough opening exposed)',
      'glass replacement (pane is intact in this service)',
      'new window unit nearby or being installed',
      'rough opening with exposed masonry',
    ],
    allowed_tools: [
      'screwdriver or cordless drill for hardware adjustment',
      'silicone gun for seal replacement',
      'seal strip or brush seal',
      'putty knife for localised frame repair',
      'tape measure',
      'oil can or lubricant for hinges',
    ],
    forbidden_tools: [
      'suction cup handle (glass is intact)',
      'expanding foam gun (no new frame being fitted)',
      'flat pry bar for frame removal',
    ],
    glass_type:   ['existing intact pane — single or double — no glass handling'],
    frame_type:   ['existing frame — PVC, aluminium, or wood — retained and repaired in place'],
    work_surface: ['existing window — seal channel, hinge plates, handle mechanism, or small localised frame section'],
    setting:      ['exterior', 'interior'],
    location_types: ['maison_individuelle', 'appartement'],
    damage_or_installation_state: ['existing window with localised wear or damage — seal worn, handle broken, hinge misaligned, or small frame crack'],
    worker_rules: {
      presence: 'required',
      min: 1,
      max: 1,
      posture: 'standing or slightly crouched at the window, applying repair tools to the specific damaged area; window frame visible and intact around the worker',
    },
    safety: {
      required: [
        'work gloves if handling sharp seal strips or frame edges',
      ],
      conditional: [
        'safety glasses if using chemical sealant or foam',
        'ladder if window above ground floor',
      ],
      forbidden: [
        'scaffold for what is a minor repair (disproportionate)',
        'broken glass present (this is a repair, not an emergency intervention)',
      ],
    },
    states: {
      debut: {
        observable_action: 'Inspecting and assessing the window damage. Preparing repair materials.',
        required_visual_evidence: [
          'existing intact window frame clearly visible',
          'worker examining the window closely — pointing at or touching the damaged area',
          'repair materials unpacked nearby (seal strip, sealant tube, hardware part)',
        ],
      },
      encours: {
        observable_action: 'Active repair underway on the localised damage.',
        required_visual_evidence: [
          'worker actively using repair tool on the specific damaged area',
          'window frame clearly remains in place',
          'intact glass visible in frame',
        ],
      },
      semifinal: {
        observable_action: 'Repair nearly complete — sealant drying or hardware re-tested.',
        required_visual_evidence: [
          'repaired area showing fresh sealant bead or new hardware in place',
          'worker checking the repair quality (operating the handle, pressing the seal)',
          'window overall intact and in place',
        ],
      },
      final: {
        observable_result: 'Window fully repaired in place. Seal neat, hardware functional, frame intact.',
        required_visual_evidence: [
          'existing window in place — clearly the same frame, repaired',
          'neat repair visible (clean sealant bead, new handle, refitted seal strip)',
          'no rough opening, no new window unit',
          'intact glass in the existing frame',
        ],
      },
    },
    composition_preferences: ['close_detail', 'medium_intervention'],
    for_regex: 'reparation.*fenetre|fenetre.*repar',
  },

  remplacement_porte_vitree: {
    service_key:   'remplacement_porte_vitree',
    service_label: 'Remplacement porte vitrée',
    visual_goal:   'Show the replacement of a glazed door — full door height (typically 200–220 cm), with door-specific hardware (handle, lock, threshold, hinges). Must be clearly a door, not a window. The glazed panel occupies most of the door surface.',
    observable_action: 'Worker fitting a new glazed door unit into the door frame, aligning hinges, shimming the threshold, or adjusting door hardware.',
    required_visual_evidence: [
      'full-height glazed panel — door proportions (height ≥ 200 cm, taller than wide)',
      'door frame visible with hinge positions, lock strike plate, or threshold',
      'door hardware visible: handle, lock, hinges',
      'new door unit in the rough opening or being lifted into position',
    ],
    forbidden_confusions: [
      'standard residential window (horizontal proportions, no door handle/lock)',
      'full glass curtain wall or commercial storefront',
      'baie vitrée without door hardware (static glazed panel only)',
      'glass-only replacement within an existing door frame',
    ],
    allowed_tools: [
      'cordless drill for hinge and lock fitting',
      'level and tape measure',
      'rubber mallet for shimming',
      'expanding foam for frame perimeter',
      'silicone gun',
      'door shim wedges',
    ],
    forbidden_tools: [
      'glass cutter (glass is factory-fitted in the door unit)',
      'suction cup handle as primary tool',
      'roofing tools',
    ],
    glass_type:   ['glazed panel factory-fitted in door frame — tempered or laminated safety glass'],
    frame_type:   ['door frame — PVC, aluminium, or wood — with full door geometry: dormant, ouvrant, threshold'],
    work_surface: ['door rough opening — floor threshold, side jambs, and lintel'],
    setting:      ['exterior', 'interior'],
    location_types: ['maison_individuelle', 'appartement'],
    damage_or_installation_state: ['old door removed or in process — rough opening visible or door being lifted in'],
    worker_rules: {
      presence: 'required',
      min: 1,
      max: 2,
      posture: 'standing, guiding full-height door into rough opening — second worker often needed to hold the door panel upright during fitting',
    },
    safety: {
      required: [
        'work gloves for handling door frame edges',
        'foot protection near the door threshold (heavy door unit)',
      ],
      conditional: [
        'two workers required for door panels wider than 90 cm or heavier than 40 kg',
        'door prop or wedge to prevent door swinging during fitting',
      ],
      forbidden: [
        'single worker unsupported for a full-height glazed door panel (risk of fall)',
        'bare hands on sharp door frame edges',
      ],
    },
    states: {
      debut: {
        observable_action: 'Removing old door. Checking rough opening dimensions.',
        required_visual_evidence: [
          'door rough opening visible — old door removed, frame or opening exposed',
          'new glazed door unit leaning against the wall nearby — door proportions clearly visible',
          'tape measure or level at the opening',
        ],
      },
      encours: {
        observable_action: 'Lifting new glazed door unit into rough opening. Aligning hinges and shimming threshold.',
        required_visual_evidence: [
          'full-height glazed door panel being inserted or held in rough opening',
          'worker at hinge side aligning the door frame',
          'shim wedges at threshold or side',
        ],
      },
      semifinal: {
        observable_action: 'Door frame fixed. Fitting door hardware — handle, lock, threshold seal.',
        required_visual_evidence: [
          'glazed door in opening, drilling/screwing hardware in place',
          'perimeter gap being sealed with foam or sealant',
          'door handle or lock being fitted',
        ],
      },
      final: {
        observable_result: 'New glazed door fully installed. Operates smoothly. Clean frame and perimeter seal.',
        required_visual_evidence: [
          'full-height glazed door installed in opening — door hardware visible',
          'clean perimeter sealant at frame-wall junction',
          'door threshold neat — no rough opening exposed',
          'clear glass panel in the door',
        ],
      },
    },
    composition_preferences: ['medium_intervention', 'wide_worksite'],
    for_regex: 'porte.vitr',
  },

  vitrage_securite_feuillette: {
    service_key:   'vitrage_securite_feuillette',
    service_label: 'Vitrage sécurité feuilleté',
    visual_goal:   'Show the installation of laminated safety glass — a specialist glass type with visible interlayer (PVB film between two glass layers). Context may be residential or commercial. The safety glass is thicker than standard and may be identified by its slightly greenish edge tint or visible film interlayer on the edge.',
    observable_action: 'Worker fitting a laminated safety glass panel into a frame, handling the glass with specialist equipment, or applying edge trims and sealant around the laminated unit.',
    required_visual_evidence: [
      'glass panel being handled with suction cups — size and weight suggest specialist glass',
      'visible glass edge (cross-section) showing the laminated structure — two glass layers with interlayer — OR specialist thickness identifiable',
      'frame being prepared for specialist glass (structural silicone, aluminium edging, or heavy-duty glazing channel)',
      'no broken glass context — this is a planned installation, not emergency',
    ],
    forbidden_confusions: [
      'standard single-pane replacement (no interlayer visible, ordinary frame rebate)',
      'double vitrage IGU (spacer bar profile — see Remplacement double vitrage)',
      'emergency broken glass repair (this is a planned specialist installation)',
      'full window frame replacement (may or may not be combined — but the glass type is the key differentiator)',
    ],
    allowed_tools: [
      'large-format suction cup lifting handle',
      'structural silicone gun',
      'aluminium edge trim or glazing channel',
      'rubber setting blocks',
      'tape measure and marking pen',
    ],
    forbidden_tools: [
      'glass cutter on the installation site (laminated glass is factory-cut)',
      'standard household putty knife',
      'roofing tools',
    ],
    glass_type:   ['laminated safety glass — two glass layers bonded with PVB or resin interlayer — typically 6.4 mm or thicker'],
    frame_type:   ['specialist frame: structural silicone glazing, aluminium heavy-duty glazing channel, or rebated timber — appropriate for laminated weight'],
    work_surface: ['frame opening sized for laminated glass — may be in facade, interior partition, or commercial frontage'],
    setting:      ['exterior', 'interior'],
    location_types: ['maison_individuelle', 'immeuble', 'local_commercial'],
    damage_or_installation_state: ['planned installation — no pre-existing breakage in the frame; specialist glass being introduced'],
    worker_rules: {
      presence: 'required',
      min: 1,
      max: 2,
      posture: 'standing, handling large glass panel with suction cups; second worker guides the panel edge into the frame rebate',
    },
    safety: {
      required: [
        'cut-resistant gloves on both workers',
        'large suction cup handle — laminated glass is heavy',
        'safety glasses during installation',
        'rubber setting blocks to prevent glass edge contact with frame bottom',
      ],
      conditional: [
        'two workers mandatory for panels wider than 80 cm',
        'scaffolding for installations above ground level',
      ],
      forbidden: [
        'bare hands on glass edges',
        'single worker handling large laminated panel unaided',
        'glass resting directly on frame base without setting blocks',
      ],
    },
    states: {
      debut: {
        observable_action: 'Measuring opening. Preparing frame channel. Positioning setting blocks.',
        required_visual_evidence: [
          'tape measure or template held against the frame opening',
          'new laminated glass panel wrapped or partially unwrapped nearby',
          'rubber setting blocks placed at the frame base',
          'specialist glazing channel or structural silicone staged nearby',
        ],
      },
      encours: {
        observable_action: 'Lifting and inserting laminated glass panel into frame using suction cups.',
        required_visual_evidence: [
          'large suction cup handle attached to glass face',
          'panel being guided into frame opening — edge of laminated glass partially visible showing thickness',
          'worker in correct handling posture — both hands on suction cup, panel upright',
        ],
      },
      semifinal: {
        observable_action: 'Panel seated in frame. Applying structural silicone or fitting aluminium edge trims.',
        required_visual_evidence: [
          'glass panel fully in frame opening',
          'structural silicone gun or aluminium edge trim being applied',
          'setting blocks visible at glass base',
        ],
      },
      final: {
        observable_result: 'Laminated safety glass installed. Clean structural silicone bead or aluminium trim. Specialist appearance.',
        required_visual_evidence: [
          'glass panel installed in frame — specialist thickness or edge trim identifiable',
          'neat structural silicone bead or aluminium edge trim at glass perimeter',
          'no rough edges, no broken glass',
        ],
      },
    },
    composition_preferences: ['medium_intervention', 'close_detail'],
    for_regex: 'feuillette|vitrage.*securite|securite.*vitrage',
  },

  bris_de_glace_urgence: {
    service_key:   'bris_de_glace_urgence',
    service_label: 'Bris de glace urgence',
    visual_goal:   'Show an emergency glass break intervention — broken glass hazard is present and the immediate priority is securing the opening with provisional protection (boarding, film, or temporary pane). This is NOT the permanent replacement — the goal is making the site safe rapidly.',
    observable_action: 'Worker securing a broken window or glass opening with provisional protection — fitting a plywood board, polycarbonate sheet, or protective film over the broken opening, and sweeping or containing glass fragments.',
    required_visual_evidence: [
      'broken glass opening clearly visible — cracked or completely broken pane, fragments on the floor or windowsill',
      'provisional protection material present: plywood board, polycarbonate sheet, or emergency film',
      'worker actively securing the opening or containing the glass hazard',
      'urgency indicators: work being done at speed, limited staged materials, tools for quick fix rather than permanent install',
    ],
    forbidden_confusions: [
      'permanent glass replacement with new clear pane (this is provisional — the opening is boarded or filmed, not glazed)',
      'clean window with no trace of breakage',
      'standard glass replacement with full tools and staged materials (this is emergency-speed)',
      'finished professional result with neat sealant (provisional protection is the output)',
    ],
    allowed_tools: [
      'broom or dustpan for glass fragment containment',
      'cordless drill for boarding fixings',
      'tape measure',
      'utility knife for cutting protective film',
      'staple gun for film attachment',
      'protective sheeting (polycarbonate or plywood)',
    ],
    forbidden_tools: [
      'suction cup handle (no new permanent glass being fitted)',
      'silicone gun for permanent sealing (provisional fix only)',
      'expanding foam gun',
    ],
    glass_type:   ['broken glass — fragments present; provisional protection material (polycarbonate, plywood, or security film)'],
    frame_type:   ['existing frame — damaged or intact — receiving provisional protection'],
    work_surface: ['broken window opening — glass fragments on sill and floor, opening to be boarded or filmed'],
    setting:      ['exterior', 'interior'],
    location_types: ['maison_individuelle', 'appartement', 'immeuble', 'local_commercial'],
    damage_or_installation_state: ['emergency — active glass breakage present; provisional protection being applied; permanent repair not yet performed'],
    worker_rules: {
      presence: 'required',
      min: 1,
      max: 1,
      posture: 'worker at the broken opening — sweeping fragments, fitting boarding or film; rapid working posture indicating urgency',
    },
    safety: {
      required: [
        'cut-resistant gloves — mandatory for broken glass handling',
        'safety glasses — glass fragment risk',
        'closed-toe shoes with sole protection',
        'containment mat or cardboard under the broken opening before any handling',
      ],
      conditional: [
        'second worker if opening is large and needs boarding held in place during fixing',
        'hi-vis vest if emergency call at night or road-facing property',
      ],
      forbidden: [
        'bare hands on broken glass — critical safety violation',
        'bare feet near glass fragments',
        'leaving glass fragments on the public footpath uncontained',
      ],
    },
    states: {
      debut: {
        observable_action: 'Arriving at emergency. Assessing breakage. Preparing containment.',
        required_visual_evidence: [
          'broken or missing pane clearly visible — fragments on sill or floor',
          'containment mat or cardboard being placed below the opening',
          'worker wearing full PPE — gloves and glasses — before touching anything',
          'emergency toolbag or vehicle partially visible at edge of frame',
        ],
      },
      encours: {
        observable_action: 'Removing remaining fragments. Fitting provisional protection board or film.',
        required_visual_evidence: [
          'worker actively removing large glass fragments with gloved hands or broom',
          'provisional material (plywood or polycarbonate sheet) held against the opening or being cut to size',
          'glass fragments swept into a pile or bag',
        ],
      },
      semifinal: {
        observable_action: 'Provisional board or film being fixed in place.',
        required_visual_evidence: [
          'board or film being drilled or stapled to the frame',
          'opening partially covered — some boarding in place',
          'worker finishing the fixing — cordless drill or staple gun visible',
        ],
      },
      final: {
        observable_result: 'Opening secured with provisional protection — boarded or filmed. No glass fragments exposed. Safe for occupants.',
        required_visual_evidence: [
          'opening fully covered by provisional board, polycarbonate, or film',
          'no glass fragments visible on floor or sill',
          'provisional protection clearly NOT the same as a new clear glass pane',
          'clean site — glass swept away',
        ],
      },
    },
    composition_preferences: ['close_detail', 'medium_intervention'],
    for_regex: 'bris.de.glace|glace.*urgence|urgence.*bris',
  },

};

// ─── Regex de routage — testées contre tous les 8 services vitrier ────────────
export const VITRIER_FOR_PATTERNS = {
  remplacement_vitrage_brise:    /vitrage.*bris|bris.*vitrage/i,
  remplacement_double_vitrage:   /double.vitrage/i,
  remplacement_fenetre_pvc:      /fenetre.*pvc|pvc.*fenetre/i,
  remplacement_fenetre_aluminium:/fenetre.*alumin|alumin/i,
  reparation_fenetre:            /reparation.*fenetre|fenetre.*repar/i,
  remplacement_porte_vitree:     /porte.vitr/i,
  vitrage_securite_feuillette:   /feuillette|vitrage.*securite|securite.*vitrage/i,
  bris_de_glace_urgence:         /bris.de.glace|glace.*urgence|urgence.*bris/i,
};

// ─── Méta ─────────────────────────────────────────────────────────────────────
export const VITRIER_META = {
  metier:           'vitrier',
  version:          1,
  service_count:    8,
  catalog_source:   'src/image-generation/config/service-catalog.js',
  canonical_source: 'src/image-generation/services/vitrier-contracts.js',
  risk_pairs: [
    {
      pair: ['remplacement_vitrage_brise', 'bris_de_glace_urgence'],
      risk: 'Both involve broken glass — differentiated by: permanent glass replacement vs. provisional boarding/film; staged tools vs. emergency speed; clear new pane result vs. opaque/boarded result.',
    },
    {
      pair: ['remplacement_fenetre_pvc', 'remplacement_fenetre_aluminium'],
      risk: 'Both are full window replacements — differentiated by: white plastic frame vs. grey/dark metal frame; texture and colour are the primary visual signal.',
    },
    {
      pair: ['remplacement_double_vitrage', 'remplacement_vitrage_brise'],
      risk: 'Both replace glass in an existing frame — differentiated by: thick IGU with spacer bar visible vs. single pane; no broken glass in double vitrage; glazing bead removal tool vs. fragment sweep.',
    },
    {
      pair: ['remplacement_porte_vitree', 'remplacement_fenetre_pvc'],
      risk: 'Both replace a full glazed unit — differentiated by: door proportions (height ≥ 200 cm, door hardware) vs. window proportions (horizontal, no door handle).',
    },
    {
      pair: ['reparation_fenetre', 'remplacement_vitrage_brise'],
      risk: 'Both work on an existing frame — differentiated by: glass is intact in repair vs. broken/missing in replacement; no rough opening in repair; targeted localised tools vs. glass handling tools.',
    },
    {
      pair: ['vitrage_securite_feuillette', 'remplacement_double_vitrage'],
      risk: 'Both involve specialist glass in a frame — differentiated by: laminated glass edge profile (two layers + interlayer) vs. IGU spacer bar; structural silicone / aluminium edging vs. glazing bead.',
    },
  ],
};
