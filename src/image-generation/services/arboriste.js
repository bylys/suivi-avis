/**
 * arboriste.js — Phase 7D (arborist cluster)
 * WORK_SCENES + SITE_REALISM for élagage and abattage services.
 *
 * Safety doctrine (ALL scenarios):
 *  - Minimum 2 workers, distinct roles — both visible in every state
 *  - Homeowner camera: ordinary smartphone from garden / driveway / sidewalk / residential window
 *    — workers actively working, camera clearly separated from professional zone
 *    — NEVER from basket / beside climber / worker POV / drone / commercial / posed
 *  - Drop zone: Worker 2 always laterally offset, outside the direct branch drop zone,
 *    away from suspended branches and the felling direction
 *  - Public / clients / vehicles / animals outside the exclusion zone in all scenarios
 *
 * 10 visual contracts:
 *  ARB-CLIMBING-PRUNING   — grimpeur in crown, professional tree-climbing harness + positioning rope + credible anchor on strong trunk or major branch union + secondary attachment while cutting + chainsaw on tool lanyard
 *  ARB-MEWP-PRUNING       — nacelle, basket + guardrails + outriggers + ground controls
 *  ARB-GROUND-PRUNING     — pole saw / hand tools from ground, no aerial access
 *  ARB-SECTIONAL-DISMANTLING — dismantling with rigging rope + lowering device
 *  ARB-GROUND-FELLING     — clear felling direction, exclusion zone, controlled cut
 *  ARB-DANGEROUS-TREE     — high-risk work, full PPE + rigging + multiple controls
 *  ARB-HEDGE-TRIMMING     — hedge trimmer from ground or professional platform (→ paysagiste.js)
 *  ARB-STUMP-GRINDING     — stump grinder, guards, exclusion zone
 *  ARB-BRANCH-CHIPPING    — chipper + trailer, controlled feeding
 *  ARB-GREEN-WASTE-REMOVAL — loading, cleanup, trailer management
 */

export const WORK_SCENES_ARBORISTE = {

  élagage: {
    category:         'arboriste',
    priority:         3,
    service_keywords: [
      { phrase: 'taille arbre',       score: 12 },
      { phrase: 'elagage arbre',      score: 12 },
      { phrase: 'elagage peuplier',   score: 12 },
      { phrase: 'elagage en hauteur', score: 12 },
      { phrase: 'recepage arbre',     score: 12 },
      { phrase: 'couronnage arbre',   score: 12 },
      { phrase: 'elagage arbres dangereux', score: 12 },
      { phrase: 'emondage',           score: 10 },
      { phrase: 'elagage',            score: 10 },
      { phrase: 'elagueur',           score: 10 },
      { phrase: 'rognage souche',     score: 9  },
    ],
    exclude_if: [],
    intro:      'tree pruning at a residential property — ordinary customer smartphone photo taken from the garden or driveway while arborists are actively working',
    setting:    'exterior',
    secteur:           'arborist',
    variation_setting: 'garden',
    hasWorkers:        true,
    camera:     'ordinary homeowner smartphone photo taken from the garden, driveway or a residential window — 6–15 m from the tree, looking up at the crown or across at the work zone — slightly imperfect framing and slightly tilted horizon — arborists actively at work, not posed or looking at the camera',
    materials:  ['cut branches', 'fresh sawdust', 'bark chips', 'rigging rope', 'chipper trailer nearby'],
    photo_defects: [
      'slight upward tilt from shooting at aerial workers',
      'pale sky clipping exposure on bright patches behind the crown',
    ],
    exclusions: [
      'camera in the tree canopy beside the climber',
      'drone aerial view',
      'worker POV or GoPro angle',
      'commercial studio shot',
      'workers posed looking at camera',
      'solo worker with no colleague visible',
    ],
    states: {
      debut: {
        framing: {
          work_pct:   40,
          foreground: 'Worker 2 on the ground managing ropes or setting up the exclusion zone — cones or tape at the perimeter — first cut branches falling or already on the ground',
          midground:  'tree mostly intact — Worker 1 ascending or positioned at the first work zone, first branch section removed, raw cut mark visible',
          background: 'garden fence, neighbouring roof, pale sky — access vehicle or chipper at the driveway edge',
        },
        debris:      'a few scattered branch offcuts and sawdust near the base — site still being set up',
        description: 'Pruning has just started. Worker 1 is ascending or at the first work zone. Worker 2 manages ropes and the exclusion zone on the ground. The tree is mostly full.',
      },
      encours: {
        framing: {
          work_pct:   60,
          foreground: 'Worker 2 on the ground outside the drop zone — managing the lowering rope or guiding falling branches away from the exclusion zone — branches and clippings piling up nearby',
          midground:  'Worker 1 actively cutting in the crown — tree crown noticeably lighter on one side, several major cut points visible, fresh sawdust falling',
          background: 'neighbouring rooflines and sky now more visible through the thinned crown — chipper or trailer parked at the garden edge',
        },
        debris:      'cut branches and clippings piled outside the drop zone, sawdust scattered around base',
        description: 'Pruning is underway. Worker 1 is cutting in the crown. Worker 2 manages ropes and guides falling branches from a safe lateral position outside the drop zone.',
      },
      semifinal: {
        framing: {
          work_pct:   50,
          foreground: 'Worker 2 stacking or feeding cut branches into the chipper — most major branches already removed and managed',
          midground:  'tree properly shaped — Worker 1 descending or doing final cuts at the upper crown, fresh clean cut marks on all main branches',
          background: 'open sky now visible, clean garden structure emerging — chipper or trailer alongside',
        },
        debris:      'tidy pile of cut branches being processed — chipper running or branches stacked for removal',
        description: 'The pruning is nearly complete. Worker 1 finishes the upper crown or descends. Worker 2 is processing cut material or stacking branches at the ground.',
      },
      final: {
        framing: {
          work_pct:   55,
          foreground: 'Worker 2 clearing last branch debris from the lawn — bags or trailer being loaded — lawn being raked clean',
          midground:  'Worker 1 on the ground doing a final inspection of the shaped crown — properly balanced tree, all cuts clean and neatly done',
          background: 'tidy garden, neighbouring house, open sky — chipper or trailer at the driveway exit',
        },
        debris:      'minimal — one small bundle of branches at garden edge, lawn otherwise clear, trailer loaded',
        description: 'Work is finished. Worker 1 inspects the shaped crown at ground level. Worker 2 clears debris and loads the trailer. A professional result.',
      },
    },
  },

  abattage: {
    category:         'arboriste',
    priority:         3,
    service_keywords: [
      { phrase: 'abattage arbre',          score: 13 },
      { phrase: 'abattage peuplier',       score: 13 },
      { phrase: 'abattage grand arbre',    score: 13 },
      { phrase: 'abattage en zone difficile', score: 13 },
      { phrase: 'abattage conifere',       score: 12 },
      { phrase: 'dessouchage',             score: 12 },
      { phrase: 'abattage',                score: 9  },
      { phrase: 'abatage',                 score: 9  },
    ],
    exclude_if: [],
    intro:      'tree felling or stump grinding at a residential property — ordinary customer smartphone photo taken from a safe position outside the exclusion zone while arborists are actively working',
    setting:    'exterior',
    secteur:           'arborist',
    variation_setting: 'garden',
    hasWorkers:        true,
    camera:     'ordinary homeowner smartphone photo from the garden, driveway or residential window — 8–15 m from the work zone, outside the exclusion zone, slightly imperfect framing — arborists actively working, exclusion zone clearly visible in the scene',
    materials:  ['log sections', 'bark chips', 'coarse sawdust', 'large branches', 'rigging rope', 'exclusion zone tape'],
    photo_defects: [
      'motion blur on peripheral branches from wind',
      'JPEG compression on dense bark and wood grain texture',
    ],
    exclusions: [
      'camera inside the exclusion zone',
      'bystanders in the fall direction',
      'drone aerial view',
      'solo worker with no colleague visible',
      'second worker in the felling direction during active felling',
    ],
    states: {
      debut: {
        framing: {
          work_pct:   40,
          foreground: 'Worker 2 setting up the exclusion zone — cones or tape at the perimeter, keeping the area clear — first preparatory cuts or rigging rope being set up high on the trunk',
          midground:  'tree still standing — Worker 1 at the base making the notch cut or ascending for rigging — base notch and rope attachment point visible',
          background: 'garden fence, neighbouring house — access vehicle at the driveway edge',
        },
        debris:      'bark chips and sawdust around the base — first wood chips from the notch cut',
        description: 'Felling or dismantling has just started. Worker 1 is cutting or rigging. Worker 2 sets up the exclusion zone and keeps bystanders clear.',
      },
      encours: {
        framing: {
          work_pct:   65,
          foreground: 'Worker 2 outside the fall zone managing the guide rope or monitoring the exclusion zone — trunk sections or branches being lowered or fallen',
          midground:  'active cutting in progress — notch and back-cut or rigging saw running — trunk or branch sections on the ground, upper part still being worked',
          background: 'sky now more open above where canopy is being reduced — chipper or trailer nearby',
        },
        debris:      'log sections, branches and sawdust on the ground — an active but controlled work site',
        description: 'Active felling or sectional dismantling underway. Worker 1 makes the controlled cuts. Worker 2 manages the guide rope and exclusion zone from a safe lateral position.',
      },
      semifinal: {
        framing: {
          work_pct:   55,
          foreground: 'Worker 2 stacking log sections or feeding branches into the chipper at the garden edge — organised material management',
          midground:  'Worker 1 at ground level sectioning or processing the felled trunk — fresh flat stump visible, remaining branches being cleared',
          background: 'open sky where the tree stood, neighbouring house now visible — cleaner garden emerging',
        },
        debris:      'neatly stacked logs, fine sawdust coat on surrounding ground — chipper running nearby',
        description: 'The tree is down or the main sections have fallen. Worker 1 sections the trunk. Worker 2 manages the log pile and feeds the chipper.',
      },
      final: {
        framing: {
          work_pct:   50,
          foreground: 'Worker 2 loading last branches into the trailer or raking sawdust from the lawn — garden almost clear',
          midground:  'Worker 1 inspecting the stump or doing final ground clearing — clean flat stump visible, minimal debris remaining',
          background: 'open sky, neighbouring property now visible, cleared garden — trailer at the driveway exit',
        },
        debris:      'minimal — stump or fresh-ground stump area and a tidy log pile are the only evidence of work',
        description: 'Felling complete. Worker 1 inspects the stump. Worker 2 loads the trailer. Garden is clear and clean.',
      },
    },
  },

};

// ─── SITE_REALISM_ARBORISTE ───────────────────────────────────────────────────

export const SITE_REALISM_ARBORISTE = {

  élagage: {
    scenarios: [

      // ─── ARB-CLIMBING-PRUNING: grimpeur in crown ──────────────────────────
      {
        _for:          'elagage.*arbre|taille.*arbre.*haute|elagage.*peuplier|elagage.*hauteur|recepage|couronnage|elagage.*dangereux',
        scene_note:    'homeowner photo of aerial tree pruning — Worker 1 (grimpeur) positioned against the main trunk or a strong branch in the crown, double-rope technique: positioning rope + connected fall-arrest harness + secondary attachment + chainsaw on tool lanyard — Worker 2 on the ground outside the direct branch drop zone, managing the lowering rope from a protected lateral position — crown being progressively reduced from the top — photo from garden or driveway',
        scene_camera:  'standing in the garden or driveway, 8–15 m from the tree, looking up at Worker 1 in the crown — homeowner smartphone, slightly imperfect upward framing, Worker 2 visible on the ground in the foreground',
        scene_framing: {
          work_pct:   70,
          foreground: 'Worker 2 on the ground outside the drop zone — managing the lowering rope from a protected lateral position beside the trunk, not underneath the falling branches — cones or tape marking the exclusion zone perimeter',
          midground:  'Worker 1 in the crown against the main trunk or a strong branch — harness and positioning rope clearly visible, chainsaw on a tool lanyard, actively cutting a branch section — crown progressively opened from the top',
          background: 'sky visible through the thinned crown, garden fence or neighbouring roofline below',
        },
        scene_debris:  'cut branch sections on the lawn outside the drop zone, sawdust falling from the active cut above',
        scene_exclude: [
          'Worker 1 hanging from a thin twig or small branch instead of main trunk or strong branch',
          'Worker 1 floating in mid-air with no visible rope or trunk contact',
          'chainsaw without tool lanyard visible',
          'Worker 2 standing directly under the active cut or falling branch zone',
          'single arborist climbing alone with no ground worker',
          'camera from the basket beside the climber',
          'drone or aerial view',
          'bystanders inside the exclusion zone',
        ],
        tools: [
          'positioning rope and carabiner at Worker 1s harness attachment point',
          'chainsaw on a tool lanyard at the cut branch',
          'lowering rope running from the cut branch section down to Worker 2',
          'cones or exclusion tape at the drop zone perimeter',
        ],
        protections: [
          'full climbing harness on Worker 1 — double-rope technique: positioning rope + secondary attachment',
          'helmet with ear and eye protection on Worker 1',
          'tool lanyard on the chainsaw — cannot fall freely',
          'Worker 2 in protected lateral position outside the drop zone managing the lowering rope',
        ],
        chantier_details: [
          'Worker 1 braced against main trunk or strong branch — not floating or hanging from thin wood',
          'positioning rope and secondary attachment both visible — correct double-attachment technique',
          'chainsaw on a tool lanyard — securely attached and not at risk of falling',
          'two professionals with distinct roles: Worker 1 cutting in the crown, Worker 2 managing lowering rope outside drop zone',
        ],
      },

      // ─── ARB-MEWP-PRUNING: nacelle / cherry picker ────────────────────────
      // ENCOURS micro-test route: élagage en hauteur/peuplier + encours → MEWP (state_lock)
      {
        _for:                             'elagage.*peuplier|elagage.*hauteur|couronnage|elagage.*dangereux|elagage.*nacelle',
        _state_for:                       'encours',
        _access_configuration:            'MEWP',
        _access_configuration_source:     'state_lock',
        _access_configuration_randomized: false,
        scene_note:    'homeowner photo of aerial pruning from a MEWP (cherry picker / nacelle) — Worker 1 fully inside the basket with guardrails visible all around, boom fully extended to the crown — outriggers deployed on the ground, MEWP stabilised — Worker 2 beside the ground controls outside the drop zone — photo from garden, driveway or residential window',
        scene_camera:  'standing in the garden or from a residential window, 8–18 m from the tree, framing the extended boom with the basket at the crown — homeowner smartphone, slightly imperfect framing, Worker 2 at ground controls visible',
        scene_framing: {
          work_pct:   65,
          foreground: 'Worker 2 beside the MEWP ground controls outside the drop zone — outriggers clearly visible, deployed and stabilising the machine on the ground',
          midground:  'Worker 1 fully inside the basket at the crown — guardrails visible all around the basket, Worker 1 using chainsaw or loppers to cut a branch, boom at full extension',
          background: 'sky visible through the thinned crown, garden or driveway behind',
        },
        scene_debris:  'cut branch sections on the lawn below the crown, fresh sawdust below the active cut zone',
        scene_exclude: [
          'Worker 1 climbing out of the basket into the tree',
          'Worker 1 sitting on the basket guardrails',
          'Worker 2 standing under actively falling branches or in the drop zone',
          'MEWP without outriggers deployed',
          'MEWP basket floating with no guardrails visible',
          'single worker in the basket with no ground colleague',
          'drone view from above the basket',
          'camera positioned from inside or beside the basket',
          'bystanders inside the exclusion zone',
        ],
        tools: [
          'chainsaw or long-reach loppers at the cut branch inside the basket',
          'ground remote controls beside Worker 2',
        ],
        protections: [
          'full basket with guardrails on all sides — Worker 1 fully inside',
          'outriggers deployed and locked — MEWP stabilised on firm ground',
          'Worker 2 at ground controls outside the drop zone and falling-branch zone',
        ],
        chantier_details: [
          'MEWP outriggers clearly deployed on solid ground — machine stable',
          'Worker 1 fully inside the basket — guardrails visible all around, not climbing out into tree',
          'Worker 2 at ground controls outside the drop zone — not under the basket or falling branches',
          'two professionals with distinct roles: Worker 1 cutting from basket, Worker 2 at ground controls managing machine and exclusion zone',
        ],
      },

      // ─── ARB-GROUND-PRUNING: lower branches from stable ground ─────────────
      {
        _for:          'elagage.*arbre|taille.*arbre|recepage|couronnage',
        scene_note:    'homeowner photo of ground-level tree pruning — Worker 1 using a pole saw or long-handled loppers to cut lower branches from stable ground — Worker 2 collecting and stacking cut branches at a safe lateral distance from the drop zone — photo from garden or driveway',
        scene_camera:  'standing in the garden or driveway, 6–12 m from the tree, looking at Worker 1 using the pole saw — homeowner smartphone, slightly imperfect framing, both workers visible',
        scene_framing: {
          work_pct:   60,
          foreground: 'Worker 2 at a safe lateral distance from Worker 1 — stacking or collecting cut branch sections on the lawn, outside the falling-branch zone',
          midground:  'Worker 1 on stable ground using a telescopic pole saw to cut a lower branch — both feet firmly on the ground, pole saw extended upward at the target branch',
          background: 'tree crown above, garden fence or neighbouring roofline beyond',
        },
        scene_debris:  'cut branch sections and fresh sawdust on the lawn around Worker 2s stacking area',
        scene_exclude: [
          'Worker 1 on an unstable garden ladder or chair',
          'Worker 2 standing beside the active cutting point in the falling-branch zone',
          'solo arborist with no ground colleague',
          'aerial work — no climbing or basket needed at this height',
          'chainsaw without protective chaps or PPE',
        ],
        tools: [
          'telescopic pole saw extended to the target lower branch',
          'long-handled loppers as an alternative tool on the ground beside Worker 1',
        ],
        protections: [
          'helmet and eye protection on Worker 1',
          'both workers on stable ground — no ladder or elevated access',
          'Worker 2 at safe lateral distance outside the falling-branch zone',
        ],
        chantier_details: [
          'Worker 1 standing on stable flat ground, pole saw fully extended to the cut branch',
          'no ladder — branch height accessible from ground with pole tool',
          'Worker 2 laterally offset from the cut zone, collecting and stacking branches safely',
          'two professionals with distinct roles: Worker 1 cutting with pole saw, Worker 2 managing cut material from a safe lateral position',
        ],
      },

      // ─── ARB-DANGEROUS-TREE: high-risk aerial work, full rigging ───────────
      {
        _for:          'elagage.*dangereux|arbre.*dangereux|elagage.*difficile|abattage.*difficile',
        scene_note:    'homeowner photo of high-risk tree work — dangerous or structurally compromised tree being dismantled section by section with full rigging — Worker 1 (grimpeur) in the crown with complete harness + positioning rope + secondary attachment + helmet — rigging rope running from the cut section through a redirect at the trunk down to Worker 2 with a lowering device — controlled section lowering, exclusion zone clearly established — photo from garden or driveway',
        scene_camera:  'standing in the garden or driveway well outside the exclusion zone, 10–20 m from the tree, framing Worker 1 in the crown and Worker 2 at the lowering device on the ground — homeowner smartphone, slightly imperfect framing',
        scene_framing: {
          work_pct:   75,
          foreground: 'Worker 2 at the lowering device (friction hitch or descender) on the ground — laterally offset from the direct drop zone, managing the rope as a section is being lowered — exclusion zone tape or cones at the perimeter',
          midground:  'Worker 1 in the crown rigged against the main trunk — positioning rope and secondary attachment both visible — rigging rope running from the attached section through the redirect to the ground — section ready to be cut and lowered',
          background: 'sky, neighbouring property — clear exclusion zone beyond the controlled lowering area',
        },
        scene_debris:  'previously lowered sections already on the ground outside the drop zone, controlled pile — no freely fallen debris',
        scene_exclude: [
          'sections falling freely without rigging rope control',
          'swinging branch or section moving toward house or fence',
          'Worker 2 standing below the suspended section or directly in the drop zone',
          'rigging rope routed through tree anatomy instead of a dedicated redirect',
          'single arborist without ground support',
          'chainsaw without tool lanyard',
          'bystanders inside the exclusion zone',
          'camera inside the exclusion zone',
        ],
        tools: [
          'rigging rope attached to the cut section — running through a redirect block on the trunk to Worker 2',
          'lowering device (friction hitch or mechanical descender) at Worker 2s ground position',
          'chainsaw on tool lanyard at Worker 1s position in the crown',
        ],
        protections: [
          'full climbing harness + positioning rope + secondary attachment on Worker 1 — double-rope technique',
          'helmet with ear and eye protection on Worker 1',
          'rigging rope controlling every section from attachment to ground — no free falls',
          'Worker 2 laterally offset with lowering device outside the direct drop zone',
          'exclusion zone tape or cones clearly marking the danger area perimeter',
        ],
        chantier_details: [
          'rigging rope attached above the cut point — section controlled from attachment to landing',
          'Worker 1 braced against main trunk or strong branch — double-attachment visible',
          'Worker 2 at lowering device in a protected lateral position — managing controlled descent of each section',
          'two professionals with distinct roles: Worker 1 cutting and rigging sections in the crown, Worker 2 managing lowering device and exclusion zone at ground level',
        ],
      },

      // ─── ARB-BRANCH-CHIPPING: chipper + trailer, controlled feeding ─────────
      {
        _for:          'elagage|taille.*arbre|recepage|couronnage',
        scene_note:    'homeowner photo of branch chipping at the end of pruning — Worker 1 feeding manageable branch sections one at a time into the wood chipper inlet — Worker 2 managing the chip flow or handling branch debris at a safe distance from the chipper hopper — chipper and trailer at the garden edge or driveway — photo from garden or driveway',
        scene_camera:  'standing in the garden or driveway, 5–10 m from the chipper, framing Worker 1 feeding branches into the chipper and Worker 2 managing debris — homeowner smartphone, slightly imperfect framing',
        scene_framing: {
          work_pct:   60,
          foreground: 'Worker 2 at a safe distance from the chipper hopper — managing the chip output, handling branch debris, or clearing the area — not pushing the same branch as Worker 1',
          midground:  'Worker 1 feeding a manageable branch section into the chipper inlet from the correct side — wood chips flowing into the trailer or chip bag — chipper body and inlet clearly visible',
          background: 'trailer being filled with wood chips, garden or driveway, branches piled beside the chipper',
        },
        scene_debris:  'wood chips piling up in the trailer or chip bag, fresh cut branch sections beside the chipper feed point',
        scene_exclude: [
          'Worker 1 or Worker 2 with hands near the rotating chipper blades or inlet rollers',
          'Worker inside the chipper hopper',
          'two workers pushing the same branch into the chipper at the same time dangerously',
          'branches blocking the road or access route',
          'chipper without visible safety guards on the inlet',
          'solo worker operating chipper with no colleague present',
        ],
        tools: [
          'wood chipper with clearly visible inlet guard and chip outlet chute',
          'manageable branch being fed one at a time into the chipper',
          'trailer or chip bag collecting wood chip output',
        ],
        protections: [
          'Worker 1 feeding from the correct side of the inlet — hands away from the rollers',
          'Worker 2 at safe distance from the chipper body — not beside the inlet during feeding',
          'ear protection visible on both workers — chipper noise level',
        ],
        chantier_details: [
          'Worker 1 feeding one manageable branch at a time — controlled pace, not overloading the chipper',
          'Worker 2 at safe distance from the chipper — managing chip output or branch debris',
          'wood chips accumulating in the trailer — organised site management',
          'two professionals with distinct roles: Worker 1 feeding branches into chipper, Worker 2 managing chip output and branch debris from a safe distance',
        ],
      },

      // ─── ARB-GREEN-WASTE-REMOVAL: loading, cleanup, final state ───────────
      {
        _for:          'elagage|taille.*arbre|recepage|couronnage',
        scene_note:    'homeowner photo of green waste removal at the end of arborist work — cut branches, leaf debris, and wood chips being loaded into a trailer — Worker 1 and Worker 2 both on the ground loading and clearing — fresh cut branches and leaves matching the tree species worked, small log sections, clean sawdust — photo from garden or driveway',
        scene_camera:  'standing in the garden or driveway, 5–10 m from the trailer, framing both workers loading or clearing — homeowner smartphone, slightly imperfect framing',
        scene_framing: {
          work_pct:   55,
          foreground: 'Worker 2 loading cut branches or raking fresh sawdust from the lawn — fresh green leaves and branches clearly matching the worked tree species',
          midground:  'Worker 1 loading larger branch sections into the trailer or stacking them — trailer partially or fully loaded with green waste: fresh branches, leaves, small log pieces, wood chips',
          background: 'shaped or felled tree in background, garden or driveway, trailer at the edge',
        },
        scene_debris:  'fresh cut branches with green leaves, sawdust, wood chips — all matching arborist work (no construction waste or inert debris)',
        scene_exclude: [
          'construction waste or inert debris in the debris pile',
          'branches blocking road or pavement access',
          'solo worker loading alone with no colleague visible',
          'dry dead wood inconsistent with fresh pruning or felling work',
        ],
        tools: [
          'trailer being loaded with fresh green waste',
          'rake or leaf blower for cleaning the lawn area',
          'pitchfork or branch hook for loading larger pieces',
        ],
        protections: [
          'both workers using appropriate work gloves for branch handling',
        ],
        chantier_details: [
          'fresh green branches and leaves clearly matching the tree species that was worked',
          'wood chips and sawdust from the chipper run — consistent with the pruning or felling work',
          'trailer loaded with only arborist green waste — no mixed or inert debris',
          'two professionals with distinct roles: Worker 1 loading larger branch sections, Worker 2 raking and loading finer debris and sawdust',
        ],
      },

    ],
  },

  abattage: {
    scenarios: [

      // ─── ARB-GROUND-FELLING: controlled ground felling ─────────────────────
      {
        _for:          'abattage.*arbre|abattage.*peuplier|abattage.*grand|abattage.*conif',
        scene_note:    'homeowner photo of controlled tree felling — notch and back-cut made at the base, directional guide rope tensioned from high on the trunk, tree still standing with the hinge cut visible — exclusion zone clearly established in the felling direction — Worker 1 at the base making the controlled cut — Worker 2 outside the fall zone managing the guide rope from a safe lateral position — photo from outside the exclusion zone',
        scene_camera:  'standing outside the exclusion zone, 10–20 m from the tree base, framing the trunk base with the notch cut and guide rope running upward — homeowner smartphone, slightly imperfect framing, Worker 2 with guide rope visible',
        scene_framing: {
          work_pct:   70,
          foreground: 'yellow safety tape or cones marking the exclusion zone perimeter in the fall direction — Worker 2 laterally offset outside the fall zone holding the guide rope taut, ready to tension it',
          midground:  'Worker 1 at the trunk base making the controlled back-cut — chainsaw visible at the cut, notch clearly visible in the wood face, guide rope running up to the attachment point high on the trunk',
          background: 'crown of the tree above — clear fall zone beyond the trunk — neighbouring property clearly outside the fall direction',
        },
        scene_debris:  'fresh sawdust at the base of the trunk around the notch cut, wood chip pile from the notch removal',
        scene_exclude: [
          'second worker in the felling direction',
          'house or car directly in the fall direction',
          'bystanders inside the exclusion zone',
          'felled tree already on the ground — this is the pre-felling moment',
          'chainsaw without PPE',
          'solo feller with no guide-rope colleague',
          'camera inside the exclusion zone',
        ],
        tools: [
          'chainsaw at the back-cut position — notch cut already made',
          'guide rope running from the trunk up to the attachment point high on the tree',
          'wedge blocks on the ground near the trunk base',
          'safety tape or cones marking the exclusion zone',
        ],
        protections: [
          'exclusion zone clearly established in the fall direction — tape or cones visible',
          'chainsaw PPE on Worker 1: chaps, helmet, visor, ear protection, gloves',
          'Worker 2 at safe lateral position outside the fall zone, tensioning the guide rope',
          'no workers, public, vehicles, or animals in the fall direction',
        ],
        chantier_details: [
          'notch and back-cut clearly visible in the trunk — hinge cut in progress',
          'guide rope tensioned from attachment point high on trunk toward safe fall direction',
          'exclusion zone clearly established and free of bystanders in the fall direction',
          'two professionals with distinct roles: Worker 1 making the controlled cut at the base, Worker 2 managing guide rope from a safe lateral position outside the fall zone',
        ],
      },

      // ─── ARB-SECTIONAL-DISMANTLING: rigging + lowering in confined space ───
      // ENCOURS state_lock: abattage en zone difficile + encours → SECTIONAL_DISMANTLING (deterministic)
      {
        _for:                             'abattage.*zone.*difficile|abattage.*difficile|demontage|arbre.*dangereux',
        _state_for:                       'encours',
        _access_configuration:            'SECTIONAL_DISMANTLING',
        _access_configuration_source:     'state_lock',
        _access_configuration_randomized: false,
        scene_note:    'homeowner photo of sectional tree dismantling in a confined space — Worker 1 (grimpeur) visible high in the crown or in a MEWP basket with full harness + positioning rope + secondary attachment + helmet — rigging rope from the cut section through a redirect at the trunk down to Worker 2 with a lowering device — section attached to rigging rope and controlled during descent — tree still partially standing — house or fence close to the tree justifying controlled dismantling — exclusion zone established — photo from outside the exclusion zone',
        scene_camera:  'standing in the garden or driveway outside the exclusion zone, 8–18 m from the tree, framing Worker 1 in the crown and Worker 2 at the lowering device — homeowner smartphone, slightly imperfect framing',
        scene_framing: {
          work_pct:   75,
          foreground: 'Worker 2 at the lowering device (descender or friction hitch) on the ground — laterally offset from the direct drop zone — exclusion zone tape at the perimeter, lowered sections piled in the controlled drop area',
          midground:  'Worker 1 in the crown against the main trunk — positioning rope and secondary attachment clearly visible — rigging rope running from an attached section through the redirect block to the ground — active cut in progress',
          background: 'confined space context: house, wall or fence close to the tree — clear exclusion zone — lowered sections accumulating in the drop area',
        },
        scene_debris:  'sections previously lowered in a controlled pile in the designated landing zone — no scattered freely-fallen debris',
        scene_exclude: [
          'sections falling freely with no rigging rope control',
          'swinging section moving toward house wall or fence',
          'Worker 2 standing directly below the suspended section',
          'rope routed through living tree anatomy instead of a dedicated redirect',
          'solo arborist with no ground support',
          'chainsaw without tool lanyard',
          'bystanders inside the exclusion zone',
          'camera inside the exclusion zone or below Worker 1',
        ],
        tools: [
          'rigging rope attached above the cut point — running to redirect block on the trunk then to Worker 2',
          'lowering device at Worker 2s position — mechanical descender or friction hitch',
          'chainsaw on tool lanyard at Worker 1s position in the crown',
        ],
        protections: [
          'full climbing harness + positioning rope + secondary attachment on Worker 1',
          'helmet with ear and eye protection on Worker 1',
          'rigging rope controlling every section — no free falls at any point',
          'Worker 2 laterally offset with lowering device outside the direct drop zone',
          'exclusion zone clearly established around the controlled landing area',
        ],
        chantier_details: [
          'rigging rope controls every section from the cut point to the ground — no free falls',
          'Worker 1 braced against trunk with double-attachment visible in the crown',
          'Worker 2 at lowering device in a protected lateral position — managing controlled descent',
          'two professionals with distinct roles: Worker 1 cutting and rigging in the crown, Worker 2 managing lowering device and controlled landing zone at ground level',
        ],
      },

      // ─── ARB-STUMP-GRINDING: stump grinder + guards ────────────────────────
      {
        _for:          'dessouchage|stump|souche',
        scene_note:    'homeowner photo of stump grinding — visible stump being ground by the stump grinder — machine guard clearly in place — wood chips flying into the guard area — Worker 1 at the grinder controls — Worker 2 keeping the exclusion zone clear or managing wood chip debris from a safe distance — photo from garden or driveway',
        scene_camera:  'standing in the garden or driveway, 5–10 m from the grinder, framing the stump grinder at work and both workers — homeowner smartphone, slightly imperfect framing',
        scene_framing: {
          work_pct:   65,
          foreground: 'Worker 2 at a safe distance from the grinding wheel — managing the wood chip debris area or keeping the exclusion zone clear — not beside the rotating cutting wheel',
          midground:  'Worker 1 at the stump grinder controls — grinding wheel engaged on the visible stump, machine guard clearly in place, wood chips accumulating at the guard perimeter — stump progressively being reduced',
          background: 'garden or driveway behind, remaining tree area or fresh garden space',
        },
        scene_debris:  'wood chips and coarse sawdust piling up at the guard perimeter and beside the grinding area',
        scene_exclude: [
          'Worker 2 standing beside the rotating cutting wheel or below the chip ejection zone',
          'hands or feet near the rotating grinding wheel',
          'stump grinder without visible machine guard in place',
          'solo operator with no ground colleague',
          'bystanders or pets inside the chip ejection zone',
        ],
        tools: [
          'stump grinder with grinding wheel engaged on the stump',
          'machine guard clearly visible around the cutting wheel',
          'rake or shovel beside Worker 2 for wood chip management',
        ],
        protections: [
          'machine guard in place around the cutting wheel — chip ejection contained',
          'Worker 1 at the controls — correct operating position, not beside the wheel',
          'Worker 2 at safe distance outside the chip ejection zone and away from the rotating parts',
          'hearing protection visible on both workers — grinder noise level',
        ],
        chantier_details: [
          'stump clearly visible and being ground — progressive reduction of the stump diameter',
          'machine guard in place — wood chips contained around the guard perimeter',
          'Worker 2 at safe distance — managing chip debris or exclusion zone, not beside the wheel',
          'two professionals with distinct roles: Worker 1 operating the grinder, Worker 2 managing chip debris and exclusion zone from a safe distance',
        ],
      },

      // ─── ARB-BRANCH-CHIPPING: chipper + trailer (abattage cleanup) ─────────
      {
        _for:          'abattage|dessouchage',
        scene_note:    'homeowner photo of branch chipping after felling — cut branches, crown sections and small log pieces being fed into the wood chipper — Worker 1 feeding manageable branch sections one at a time — Worker 2 managing chip output or branch debris from a safe distance — chipper and trailer at the garden edge or driveway — photo from garden or driveway',
        scene_camera:  'standing in the garden or driveway, 5–10 m from the chipper, framing Worker 1 feeding branches and Worker 2 managing debris — homeowner smartphone, slightly imperfect framing',
        scene_framing: {
          work_pct:   60,
          foreground: 'Worker 2 at safe distance from the chipper hopper — managing the chip output into the trailer or clearing branch debris from the garden — not pushing branches into the chipper at the same time as Worker 1',
          midground:  'Worker 1 feeding a manageable branch section into the chipper inlet — wood chips flowing into the trailer — chipper body and inlet guard clearly visible',
          background: 'trailer filling with wood chips, felled log sections in a pile behind, garden or driveway',
        },
        scene_debris:  'fresh cut branches from the felled tree — fresh leaves and wood, coarse sawdust, bark pieces — matching abattage work',
        scene_exclude: [
          'Worker 1 or Worker 2 with hands near the chipper rollers or inlet blades',
          'two workers pushing the same branch into the chipper simultaneously',
          'branches or logs blocking the road or access route',
          'chipper without visible safety guard on the inlet',
          'solo worker operating chipper with no colleague',
        ],
        tools: [
          'wood chipper with clearly visible inlet guard and chip outlet chute',
          'manageable branch sections being fed one at a time',
          'trailer being loaded with wood chip output',
        ],
        protections: [
          'Worker 1 feeding from the correct side of the inlet — hands away from the rollers',
          'Worker 2 at safe distance from the chipper — not beside the inlet during feeding',
          'ear protection visible on both workers',
        ],
        chantier_details: [
          'branch material from felled tree — fresh cuts, green wood, consistent with felling work',
          'Worker 1 feeding one manageable piece at a time — controlled, not overloading',
          'Worker 2 managing chip output or debris from a safe distance — not beside the inlet',
          'two professionals with distinct roles: Worker 1 feeding chipper, Worker 2 managing output and debris from a safe distance',
        ],
      },

      // ─── ARB-GREEN-WASTE-REMOVAL: loading and final cleanup (semifinal/final only) ─
      {
        _for:          'abattage|dessouchage',
        _state_for:    ['semifinal', 'final'],
        scene_note:    'homeowner photo of green waste and log removal after felling — cut logs, branch sections, and wood chips being loaded into trailer — Worker 1 and Worker 2 both on the ground loading and clearing — fresh wood from the felled tree, clearly matching the felling or stump grinding work — photo from garden or driveway',
        scene_camera:  'standing in the garden or driveway, 5–10 m from the trailer, framing both workers loading or clearing — homeowner smartphone, slightly imperfect framing',
        scene_framing: {
          work_pct:   50,
          foreground: 'Worker 2 loading branch sections or raking wood chips from the ground — fresh cut wood and debris clearly matching the felled tree species',
          midground:  'Worker 1 loading larger log sections into the trailer or stacking them — trailer being filled with fresh logs, branch sections, wood chips',
          background: 'fresh stump visible where the tree stood, open garden or cleared driveway, trailer at the edge',
        },
        scene_debris:  'fresh cut log sections, branch pieces, wood chips from the felled tree — all fresh and consistent with abattage or stump grinding (no construction waste)',
        scene_exclude: [
          'construction waste or inert debris mixed with arborist waste',
          'logs or branches blocking road or pavement',
          'solo worker loading alone with no colleague visible',
          'debris inconsistent with felling work: dry dead wood, garden waste, building rubble',
        ],
        tools: [
          'trailer being loaded with fresh logs and green waste',
          'peavey or cant hook for rolling large log sections',
          'rake for clearing wood chips from the ground',
        ],
        protections: [
          'both workers using appropriate work gloves for log and branch handling',
        ],
        chantier_details: [
          'fresh log sections and branch pieces from the felled tree — clearly matching the tree species',
          'wood chips from the chipper run — consistent with the felling and chipping work',
          'trailer loaded with clean arborist waste only — no mixed or inert debris',
          'two professionals with distinct roles: Worker 1 loading large logs, Worker 2 loading smaller pieces and raking debris',
        ],
      },

    ],
  },

};
