/**
 * safety/worker-rules.js — Phase 3 shadow copy (source active : app.js)
 * Règles statiques de présence et de sécurité des workers par métier.
 * Ne pas modifier avant le cutover validé.
 */

const WORKER_SCENE_RULES = {
  toiture: {
    min_workers_when_visible: 2,
    max_workers: 2,
    actions: [
      'laying replacement tiles on the exposed roof pitch',
      'nailing battens along the rafter line',
      'pointing ridge tiles with fresh mortar',
      'fitting zinc flashing at the valley or eave',
    ],
    postures: [
      'kneeling on the roof pitch beside a small tile stack on a secured material bracket, both hands on the work — back to camera',
      'crouching at the ridge line with the trowel working the mortar bed — back to camera',
      'leaning against the roof ladder hooked at the ridge, working the pitch below — in profile',
    ],
    access: ['roof ladder hooked over the ridge', 'scaffold platform at eave level', 'mobile elevated platform'],
    safety_required: ['safety harness with lanyard clipped to a ridge anchor', 'roof ladder clearly hooked over the ridge'],
    forbidden: [
      'standing upright on steep pitch without visible safety line',
      'feet hanging over the gutter edge',
      'worker standing directly on the gutter',
      'worker suspended or leaning above the gutter without platform',
      'free-standing ladder propped against tiles without ridge hook',
      'ladder used as a horizontal platform across the pitch',
      'unsupported ladder lying across the roof',
      'improvised plank platform balanced on tiles',
      'rope without a visible certified anchor point',
      'worker body floating or feet off the roof surface',
    ],
    scene_always_exclude: [
      'full industrial pallet of tiles on pitched roof',
      'unsecured tile pallet on slope',
      'heavy crate resting directly on roof battens',
      'loose stack of tiles near roof edge',
      'materials positioned above doorway or pedestrian area',
      'large heavy load balanced on roof pitch',
    ],
    site_material_rule: 'a small manually transportable stack of approximately 5–12 tiles placed on a secured roof material bracket or scaffold platform, well away from the roof edge — no industrial pallet on the pitch',
    presence_indirect: [
      'roof ladder hooked over the ridge — no one on it, small tile stack on a material bracket halfway up the pitch',
      'safety line rigged across the pitch with the lanyard hanging free — no roofer visible',
      'mortar bucket hoisted to the ridge level, pulley rope tied to the chimney — no worker on roof',
    ],
  },
  nettoyage_toiture: {
    min_workers_when_visible: 2,
    max_workers: 2,
    actions: [
      'Worker 1 applying treatment product from a secured hooked roof ladder following the slope, connected harness visible',
      'Worker 1 brushing moss from tile courses with a stiff broom while secured to the roof ladder',
      'Worker 2 managing the hose or product supply from a safe position at the foot of the access ladder',
      'Worker 2 supervising the access zone and holding the safety line from ground level',
    ],
    postures: [
      'Worker 1 kneeling on the secured roof ladder, applying product to the tile surface — back to camera, harness lanyard leading to ridge anchor',
      'Worker 1 standing on a scaffold platform at eave level, directing the lance — in profile',
      'Worker 2 standing on the ground near the ladder foot, managing the hose — back to camera, outside the falling-debris zone',
    ],
    access: ['secured hooked roof ladder following the slope with hooks over the ridge', 'scaffold platform at eave level', 'mobile elevated work platform (MEWP)'],
    safety_required: [
      'Worker 1: fall-arrest harness with lanyard visibly connected to a credible ridge anchor or certified roof anchor',
      'Worker 1: secured hooked roof ladder or scaffold — visible in frame',
      'Worker 2: positioned at or near access foot, outside the falling-debris zone',
      'waterproof jacket, non-slip work boots, chemical-resistant gloves',
    ],
    forbidden: [
      'single worker performing active roof work alone',
      'worker freely standing on pitched roof tiles without visible fall protection',
      'worker on pitched roof without visible secured access equipment',
      'worker on wet or moss-covered roof without connected fall arrest',
      'harness without visible connection to a credible anchor',
      'lifeline attached to gutter, chimney cap, antenna, skylight or unsecured ladder',
      'backpack sprayer or shoulder straps interpreted as fall protection',
      'ground-level roof application using a telescopic lance from the garden',
      'leaning over the gutter edge without guardrail',
      'bare hands on wet chemical-treated tiles',
    ],
    presence_indirect: [
      'secured hooked roof ladder on the slope with harness lanyard attached to ridge anchor — no operator, lance resting on the ladder',
      'scaffold platform at eave level — tarpaulin below catching moss runoff, knapsack sprayer on platform, no operator',
      'protective tarp at the eave with moss runoff, ladder and standoff visible beside the wall — no workers on roof',
    ],
  },
  charpente: {
    min_workers_when_visible: 2,
    max_workers: 2,
    actions: [
      'positioning and securing a fermette onto the wall plates at ridge height from a scaffold platform',
      'nailing battens from a scaffold platform using a nail gun',
      'steadying a structural timber element while a second worker bolts or nails it',
      'operating a MEWP basket at ridge level for a localised external structural repair',
    ],
    postures: [
      'standing on a scaffold platform at the working height with both hands on the timber — back to camera',
      'kneeling on the scaffold board to check the alignment of the ridge board — in profile',
      'standing in a MEWP basket at canopy or ridge level, both hands on the structural element — in profile',
      'crouching on the scaffold to measure the rafter spacing with a tape measure — back to camera',
    ],
    access: [
      'scaffold platform at the working level — primary access for all structural carpentry work',
      'mobile elevated work platform (MEWP) for localised inspection or small external fix only',
    ],
    safety_required: [
      'stable scaffold platform with guardrails and toe boards when working above 2 m',
      'safety helmet on all workers at height',
      'heavy structural elements handled by two workers simultaneously',
    ],
    forbidden: [
      'hooked roof ladder used as the primary working platform for structural carpentry',
      'worker balancing on exposed rafters, battens or purlins without a stable scaffold platform',
      'single worker carrying or positioning heavy structural timber alone',
      'unsupported structural timber element suspended above a worker',
      'worker positioned directly below a suspended or freshly cut structural element',
    ],
    presence_indirect: [
      'scaffold platform at mid-span with fresh timber battens on the planks — no worker visible',
      'MEWP parked beside the gable wall, basket retracted — no operator in cab',
      'ridge board secured at the apex with temporary nail — scaffold boards below, no carpenter visible',
    ],
  },

  nettoyage_gouttieres: {
    min_workers_when_visible: 1,
    max_workers: 2,
    service_worker_minimums: {
      remplacement_gouttieres: 2,
      pose_gouttieres: 2,
    },
    actions: [
      'worker scooping compacted leaf and moss debris from the gutter trough from the top of an extending ladder leaning against the facade — well below the highest safe rungs',
      'worker cleaning the gutter trough from a professional A-frame ladder, using a small gutter scoop into a bucket hanging from the rung',
      'worker inserting a compact flexible rod into the blocked gutter-to-downpipe junction from an extending ladder leaning securely against the wall',
      'two workers: Worker 1 on ladder scooping debris at gutter height, Worker 2 on the ground holding the debris bag and steadying the ladder base',
    ],
    postures: [
      'worker near the top of an extending ladder leaning against the facade, both forearms at gutter-trough level, using gutter scoop — back to camera',
      'worker on ladder below the highest safe rungs, one hand on the rung for stability, other hand working the scoop — in profile',
      'worker on a professional A-frame ladder, slightly below gutter height, leaning forward to reach the trough — in three-quarter view',
    ],
    access: [
      'professional extension ladder leaning securely against the masonry wall or rendered facade below the eave — feet on firm flat ground',
      'professional self-supporting A-frame ladder with both side sections on firm flat ground — sufficiently tall to reach gutter height',
      'MEWP basket positioned beside the gutter (remplacement/pose only)',
    ],
    safety_required: [
      'ladder feet placed on firm, reasonably level ground — worker not leaning beyond their centre of gravity',
      'worker positioned well below the highest rung — not standing on the very top rung',
      'no person standing directly below the active falling-debris zone',
      'work gloves',
    ],
    forbidden: [
      'worker standing on or walking along the gutter trough',
      'worker standing on the absolute highest rung of the ladder',
      'extreme sideways reach — both arms extended horizontally past the ladder stiles with no stable grip',
      'ladder placed on visibly sloped, soft or irregular ground with feet clearly sliding',
      'ladder clearly too short to comfortably reach the gutter',
      'improvised access — household chair, milk crate, stacked buckets or domestic stepladder used as a step',
      'ground-level gutter vacuum or telescopic pole as the only access method for active gutter cleaning',
      'worker crouching at the downpipe base as the primary access method for active downpipe clearance',
      'ladder foot resting inside or directly against the gutter channel as a support point',
      'worker or second worker standing directly below the falling-debris zone while debris is being extracted overhead',
      'ground-level downpipe unblocking with no ladder — worker crouching at the downpipe base as the primary access method',
    ],
    presence_indirect: [
      'extending ladder leaning against the house wall — gutter scoop resting in the trough at the top, no one climbing',
      'bucket of leaf and moss debris at the base of the ladder — no operator on the ladder',
      'A-frame ladder open and stable beside the house, debris bag hanging from a rung — no worker visible',
    ],
  },
  etancheite: {
    min_workers_when_visible: 1,
    max_workers: 2,
    state_worker_minimums: { encours: 2, semifinal: 2 },
    actions: [
      // flat roof contexts
      'rolling out the waterproofing membrane across the flat roof surface and pressing the lap seam with a seam roller',
      'pressing the relevé upstand strip onto the parapet or acrotère face with a rubber roller',
      'inspecting the completed membrane seam and drain outlet collar at the parapet edge',
      // pitched roof contexts
      'Worker 1 on the rungs of a hooked roof ladder at the localized repair zone applying patch material — Worker 2 laterally offset at ground level outside the drop zone',
      'Worker 1 pressing the flashing strip at the chimney base from a hooked roof ladder — Worker 2 at ladder base steadying and supplying materials',
      // balcon context
      'pressing the waterproofing membrane strip at the porte-fenêtre sill junction on the compact elevated balcony floor',
      // terrasse de plain-pied context
      'applying waterproofing membrane across the ground-level concrete slab near the facade wall and door threshold',
    ],
    postures: [
      // flat roof contexts
      'crouching on the flat roof surface, both hands pressing the membrane edge — back to camera, parapet wall visible on all sides',
      'standing at the parapet inner face applying sealant at the upstand — in profile, no open unprotected edge visible',
      'kneeling at the membrane lap joint with a seam roller — back to camera, parapet on all sides',
      // pitched roof contexts
      'Worker 1 on the rungs of a secured hooked roof ladder at the repair zone, both hands on the work — in profile, fall-arrest harness lanyard leading to ridge anchor above',
      'Worker 2 standing laterally offset at ground level outside the falling-object zone, managing lifeline — back to camera',
      // balcon context
      'crouching on the compact elevated balcony floor pressing membrane at the sill junction — back to camera, continuous railing visible on all open sides',
      'Worker 2 positioned inside the porte-fenêtre opening steadying membrane roll — back to camera, protected by the doorframe',
      // terrasse de plain-pied context
      'crouching at garden level on the concrete slab applying membrane strip at the facade threshold — back to camera, no elevated position',
    ],
    access: [
      'flat roof access via internal hatch or secure external stair — not via hooked roof ladder',
      'hooked roof ladder over the ridge for pitched roof repair access — Worker 1 on the rungs, not standing freely on tiles',
      'mobile elevated work platform (MEWP) for flat or pitched roof staging when terrain permits',
      'scaffold platform at eave level for pitched roof perimeter or chimney work',
      'ground-level access for terrasse de plain-pied — no elevated access, no harness required',
      'porte-fenêtre opening for compact balcony access — Worker 2 inside the doorway or protected threshold zone',
    ],
    safety_required: [
      'fall-arrest harness with lanyard visibly connected to a certified ridge anchor — Worker 1 on pitched roof only',
      'continuous parapet wall or guardrail providing edge protection — flat roof and balcon contexts',
      'hooked roof ladder clearly hooked over the ridge for pitched access — Worker 1 on the rungs, not standing freely on tiles',
      'Worker 2 laterally offset outside the falling-object zone for pitched repair — never directly below the active repair zone',
    ],
    forbidden: [
      'single worker performing work alone on any etancheite task',
      'worker standing freely on steep pitched tiles without visible fall protection or secured access equipment',
      'worker standing on top of or leaning over the parapet coping or balcony railing',
      'worker suspended outside the building without certified access equipment',
      'Worker 2 standing directly below the active pitched roof repair zone — lateral offset position required',
      'membrane roll placed across the only flat roof access hatch opening',
      'hooked roof ladder propped against the facade as flat roof access — use internal hatch or external stair',
    ],
    presence_indirect: [
      'membrane roll partially unrolled across the flat roof deck — seam roller resting at the active lap, no operator on the roof',
      'hot air gun resting on the parapet inner face between welds — power cable trailing to hatch — no operator',
      'adhesive drum open beside the unrolled membrane on the flat roof — mop roller resting across the drum top',
      'hooked roof ladder over the ridge with fall-arrest harness lanyard attached to ridge anchor — no operator, repair tools in a clipped bucket on the ladder rungs',
      'tile lifter wedge under a displaced tile at the compact pitched repair zone — safety bag and membrane offcuts at ground level at the wall base, outside the fall zone',
      'membrane roll and primer tin on the compact balcony floor beside the drain outlet — no operator',
      'primer brush and membrane strip beside the door threshold on the ground-level terrasse slab — no operator',
    ],
  },
  ravalement: {
    max_workers: 2,
    state_worker_minimums: { encours: 2, semifinal: 2 },
    actions: [
      'applying render to the facade with a hawk and float',
      'sanding the old render surface with a disc sander from the scaffold platform',
      'spraying crépi texture onto the primed wall face',
    ],
    postures: [
      'standing on a scaffold plank at wall mid-height, both hands on the float and hawk — back to camera',
      'crouching at the base of the scaffold to refill the mortar hawk — in profile',
      'standing at the upper scaffold lift, float arm extended to reach the top course — back to camera',
    ],
    access: ['tube-and-fitting scaffold fixed to the building facade', 'mobile scaffold tower', 'articulated boom lift'],
    safety_required: ['scaffold guardrail and toe board in place at every lift above 2 m', 'safety helmet on platform above 2 m'],
    forbidden: [
      'person leaning out past the scaffold guardrail',
      'unsupported plank bridging two scaffold frames without mid-rail',
      'scaffold platform above 2 m without guardrail',
    ],
    presence_indirect: [
      'hawk and float resting on the scaffold plank at mid-height — no operator visible',
      'scaffold tower beside the wall, tools on the platform — empty, platform secured',
      'mortar bucket hoisted on the scaffold gin wheel — rope tied, no worker on the platform',
    ],
  },
  peinture: {
    max_workers: 1,
    actions: [
      'rolling paint onto the wall surface with a roller and long extension pole',
      'cutting in at the ceiling junction with a flat brush',
      'applying a second coat over the primed wall with a medium roller',
    ],
    postures: [
      'standing 1 m from the wall, arm extended with the roller on the extension pole — back to camera',
      'on a low stepladder cutting in at the top wall edge with a flat brush — in profile',
      'crouching at the skirting board to cut the base edge — back to camera',
    ],
    access: ['low stepladder for ceiling-height cutting in', 'no elevated access for standard wall height'],
    safety_required: [],
    forbidden: [
      'person on a scaffolding tower inside the room',
      'bare feet on the drop cloth near open paint tins',
      'person hanging from the window frame to reach the exterior',
    ],
    presence_indirect: [
      'roller resting in the tray on the drop cloth beside the freshly painted wall — no painter visible',
      'paint tin open with brush balanced across the rim, drop cloth with fresh roller marks — no operator',
      'masking tape along the ceiling junction, drop cloth covering the floor — painter absent',
    ],
  },
  'élagage': {
    min_workers_when_visible: 2,
    max_workers: 2,
    actions: [
      'sawing a branch with a chainsaw while suspended in the tree canopy by climbing ropes',
      'pulling a guide rope from the ground to direct a falling cut branch',
      'operating an aerial platform at canopy height to reach a crown reduction cut',
    ],
    postures: [
      'suspended in the tree canopy in a full-body climbing harness, chainsaw in both hands — back to camera',
      'standing on the ground below the canopy, both hands on the guide rope — back to camera',
      'in the basket of an aerial platform at canopy height, pruning saw extended — in profile',
    ],
    access: ['rope climbing technique with saddle and footlocks', 'aerial platform / cherry picker positioned beside the tree', 'stepladder for branches under 4 m'],
    safety_required: ['full-body climbing harness with positioning lanyard clearly visible on the tree climber', 'arborist helmet with visor and ear defenders'],
    forbidden: [
      'person standing directly under a branch being cut',
      'climber in the tree with no visible rope or harness',
      'chainsaw held with one hand above shoulder height',
      'person balancing on a branch without safety attachment',
      'unstable ladder propped against the tree trunk with no foot brace',
      'rope crossing through or around the climber body in an impossible configuration',
      'climber with feet or legs dangling without support point',
      'person positioned in the direct fall path of a branch mid-cut',
    ],
    presence_indirect: [
      'climbing rope rigged through the tree crown with a throw bag on the ground — no climber visible',
      'wood chipper running at the base of the tree, chip pile building — no operator in frame',
      'guide rope attached to a cut branch running to the ground — no one holding it, slack on the ground',
    ],
  },
  abattage: {
    min_workers_when_visible: 2,
    max_workers: 2,
    actions: [
      'making the notch cut at the base of the trunk with a large chainsaw',
      'sectioning the felled trunk into lengths on the ground',
      'operating a stump grinder positioned over the root flare',
    ],
    postures: [
      'standing at the base of the trunk, chainsaw held in both hands at waist height — in profile',
      'crouching over the felled trunk to make a cross-cut — back to camera',
      'standing behind the stump grinder controls directing the cutter head — in profile',
    ],
    access: ['ground level — no elevated access required', 'stump grinder on tracks positioned over the stump'],
    safety_required: ['chainsaw chaps clearly visible on the legs of the operator', 'arborist helmet with visor', 'non-slip chainsaw work boots'],
    forbidden: [
      'person standing in the planned fall zone in front of the notch cut',
      "chainsaw cutting overhead above the operator's shoulder",
      'person on the far side of the trunk from the operator during the felling cut',
    ],
    presence_indirect: [
      'felled trunk sections laid on the ground, chainsaw resting across one — no operator visible',
      'stump grinder parked over the stump, engine running, cab empty — chip pile spreading beside',
      'sawdust pile and cut rounds at the stump base — tools visible, no worker in frame',
    ],
  },
  'maçonnerie': {
    max_workers: 2,
    service_worker_minimums: {
      linteau:      2,
      coulage_dalle: 2,
    },
    actions: [
      'laying concrete blocks with a trowel and full mortar hawk',
      'checking the freshly laid course with a long spirit level and string line',
      'mixing a batch of mortar at the drum mixer beside the wall',
    ],
    postures: [
      'standing at the wall top course, trowel in hand bedding the next block — back to camera',
      'crouching beside the drum mixer to load mortar — in profile',
      'kneeling to check the base course with the spirit level — back to camera',
    ],
    access: ['ground level for walls up to 2 m', 'scaffold platform for walls above 2 m'],
    safety_required: ['safety boots', 'work gloves for block handling'],
    forbidden: [
      'person balanced on top of an unfinished wall course higher than 1.5 m without scaffold',
      'single block being lifted overhead without mechanical aid',
    ],
    presence_indirect: [
      'trowel resting across the mortar hawk on the wall top course — no mason visible',
      'string line pulled taut along the block course at waist height — mortar hawk on the ground below',
      'drum mixer running at the wall base — no operator in frame, mortar ready in bucket',
    ],
  },
  nettoyage: {
    max_workers: 1,
    actions: [
      'directing the pressure lance jet at the terrasse or facade surface',
      'sweeping the cleaning water toward the drain with a water broom',
      'applying cleaning product to the facade with a pump sprayer at arm height',
    ],
    postures: [
      'standing 1–2 m from the surface, lance held at hip height — in profile',
      'pushing the water broom away from the body toward the drain — back to camera',
      'walking slowly along the wall applying product at shoulder height — back to camera',
    ],
    access: ['ground level for terrasse and base of facade', 'low scaffold platform for facade above 3 m'],
    safety_required: ['waterproof work boots', 'protective goggles when using chemical products'],
    forbidden: [
      'operator pointing lance directly at their feet',
      'unprotected electrical socket near the wet work area',
      'lance aimed upward at angle greater than 45° from standing position without platform',
    ],
    presence_indirect: [
      'pressure lance resting on the ground pointing at the base of the wall — dark wet cleaning line visible ahead of the lance tip',
      'cleaning product drum open beside the pump unit — hose trailing to the lance on the ground, no operator',
      'wet cleaning line across the terrasse surface marking work already done — no one visible',
    ],
  },
  carrelage: {
    max_workers: 1,
    actions: [
      'pressing a floor tile into the adhesive bed with a rubber mallet',
      'spreading tile adhesive across the subfloor with a notched trowel',
      'cutting a border tile to size at the tile cutter on the floor edge',
    ],
    postures: [
      'kneeling on the untiled subfloor section, mallet raised to tap the tile level — back to camera',
      'crouching over the tile cutter at the room perimeter — back to camera',
      'sitting back on heels checking the tile level with a spirit level — in profile',
    ],
    access: ['floor level — no elevated access required'],
    safety_required: ["knee pads visible on the tiler's knees", 'cut-resistant gloves near the tile cutter'],
    forbidden: [
      'person kneeling on freshly laid tiles before adhesive cure time',
      'tile cutter left unguarded with blade exposed',
    ],
    presence_indirect: [
      'rubber mallet resting on the freshly laid tile surface beside a tile spacer row — no tiler visible',
      'notched trowel resting in the open adhesive bucket — tiles stacked beside it, no operator',
      'tile spacers set in the joints across the floor — spirit level resting on the last row, no one in frame',
    ],
  },
  vitrier: {
    min_workers_when_visible: 2,
    max_workers: 2,
    actions: [
      'carrying a large glass pane using suction cup handles in pairs',
      'fitting a new double-glazed unit into the prepared window frame',
      'applying glazing compound around the new pane edge with a glazing gun',
    ],
    postures: [
      'standing upright, both hands on suction cup handles, glass pane vertical — in profile',
      'crouching at the window sill to apply the glazing compound — back to camera',
      'holding the pane steady against the frame from outside while a second person secures it — seen from indoors',
    ],
    access: ['ground level for ground-floor windows', 'low scaffold platform or extending ladder for upper-floor windows'],
    safety_required: ['cut-resistant gloves on both hands when handling glass', 'suction cup handles on any pane over 1 m²'],
    forbidden: [
      'bare hands on large glass pane edges without gloves',
      'glass pane balanced upright against the wall without support cradle',
      'broken glass on the floor with no protective footwear visible',
    ],
    presence_indirect: [
      'suction cup handles left leaning against the wall — glass pane in the opening, not yet sealed',
      'glazing gun resting on the window sill beside the open pane — glazing compound partially applied',
      'glass offcut wrapped in protective paper leaning against the wall beside the window',
    ],
  },
  'débarras': {
    min_workers_when_visible: 2,
    max_workers: 2,
    state_worker_minimums: {
      encours:   2,
      semifinal: 2,
    },
    actions: [
      'sorting items into boxes and stacking sealed boxes near the exit path — back to camera, crouching',
      'carrying a box toward the staircase with both hands — seen from the side',
      'guiding a sack truck loaded with boxes across the cellar floor toward the exit',
      'loading boxes onto a furniture trolley beside the van',
      'wrapping a fragile item in protective blanket before loading',
    ],
    postures: [
      'crouching beside a low shelf, emptying contents into an open box — back to camera',
      'standing upright pushing a sack truck loaded with boxes toward the staircase — seen from the side',
      'kneeling to seal a box with tape on the cleared floor — front quarter view',
      'standing at the open van doors, stacking boxes in — seen from the side',
      'back to camera, carrying the front end of a wardrobe through the doorway with a second worker',
    ],
    access: ['cellar or basement interior', 'ground-floor building entry', 'stair access for upper floors', 'furniture trolley on flat ground'],
    safety_required: ['work gloves for heavy item handling', 'solid work footwear with toe cap'],
    forbidden: [
      'single person carrying a large wardrobe or sofa alone',
      'item balanced on a stair handrail',
      'van visibly overloaded above the roofline',
      'worker carrying bulky item while on staircase',
    ],
    presence_indirect: [
      'sack truck loaded with sealed boxes at the foot of the cellar stairs — no operator',
      'furniture trolley loaded with stacked boxes at the building entrance — van rear doors open, no operator',
      'hand truck propped against the cellar wall beside a stack of boxes — no operator',
    ],
  },
  terrassement: {
    min_workers_when_visible: 2,
    max_workers: 2,
    actions: [
      'operating the mini-excavator bucket to dig the trench or cut',
      'levelling the excavated surface with a long-handled rake from the edge',
      'guiding the machine operator from the ground beside the trench with hand signals',
    ],
    postures: [
      'seated in the cab of the mini-excavator, both hands on the controls — seen from the side',
      'standing at the trench edge with a rake, back to the camera, supervising the cut',
      'crouching to check the trench level with a measuring rod — in profile',
    ],
    access: ['ground-level site access', 'mini-excavator on rubber tracks for most surfaces'],
    safety_required: ['high-visibility jacket on all ground workers within 5 m of the machine', 'safety helmet on site'],
    forbidden: [
      'person standing inside the trench directly under the excavator bucket',
      'person between the rotating cab and the trench edge',
      'machine operating with no ground spotter visible when near a structure',
    ],
    presence_indirect: [
      'mini-excavator parked at the trench edge, engine running, cab empty — excavated spoil pile beside',
      'excavated spoil pile with wheelbarrow beside the trench — no workers visible',
      'warning tape stretched around the open trench perimeter — trench clearly fresh-cut, no one on site',
    ],
  },
  paysagiste: {
    min_workers_when_visible: 1,
    max_workers: 2,
    service_worker_minimums: {
      paysagiste_taille_haie:      2,
      paysagiste_plantation_haie:  2,
      paysagiste_plantation_arbre: 2,
      paysagiste_gazon_rouleau:    2,
      paysagiste_creation:         2,
      paysagiste_irrigation:       2,
      paysagiste_maconnerie:       2,
      paysagiste_bordures:         2,
    },
    actions: [
      'planting a shrub in the prepared bed and backfilling around the root ball',
      'laying turf rolls across the prepared subgrade and tamping the edges',
      'operating a walk-behind mower along the lawn edge',
    ],
    postures: [
      'kneeling in the garden bed placing a plant in the hole — back to camera',
      'crouching to press the turf edge firmly with both hands — back to camera',
      'standing behind the walk-behind mower, both hands on the handles — in profile',
    ],
    access: ['ground level garden — no elevated access required'],
    safety_required: ['sun protection / hat for outdoor summer work', 'hearing protection when using petrol machinery'],
    forbidden: [
      'mower operating on a slope visually steeper than 15°',
      'person pruning a large tree from a domestic household stepladder',
      'chainsaw used without visible leg protection',
    ],
    presence_indirect: [
      'ride-on mower parked on the finished lawn area — freshly cut stripes visible, no operator',
      'wheelbarrow of compost tipped beside a planting bed — tools resting against it, no gardener in frame',
      'newly planted shrubs in the bed, watering can beside them — no one visible',
    ],
  },
  depannage_auto: {
    min_workers_when_visible: 1,
    max_workers: 2,
    service_worker_minimums: {
      crevaison: 2,
      remorquage: 2,
    },
    actions: [
      'connecting jump-start cables to the vehicle battery terminals under the open bonnet',
      'jacking the vehicle and removing the flat tyre with a lug wrench',
      'running a diagnostic tool connected to the OBD port — reading the display',
      'operating the vehicle door lock opening tool at the door frame, protective film applied',
      'Worker 2: placing warning cones at safe distance behind the vehicle before the wheel change begins',
      'Worker 1 (operator): operating the winch control panel at the rear of the flatbed truck during vehicle loading',
      'Worker 2 (guide): guiding the stalled car approach to the flatbed from a lateral safe position using hand signals',
    ],
    postures: [
      'crouching beside the open engine bay, both hands inside — back to camera',
      'kneeling beside the jacked wheel arch with the lug wrench — in profile',
      'standing at the open bonnet leaning slightly forward — back to camera',
      'standing at the car door frame, specialist tool in both hands at door gap level — back to camera',
      'Worker 2: standing on the pavement or verge in high-visibility vest, lateral to the vehicle, monitoring traffic — back to camera',
      'Worker 2: standing at a safe lateral position beside the flatbed ramp, hand raised for guidance signal — in profile, outside winch cable line',
    ],
    access: ['roadside or car park ground level'],
    safety_required: [
      'warning triangle visible on the road behind the vehicle',
      'high-visibility jacket on all technicians at roadside',
      'Worker 2 outside the falling or rolling path of any lifted or towed vehicle',
    ],
    forbidden: [
      'person lying under the vehicle without visible axle stands',
      'sparks near an open fuel cap',
      'person positioned between the vehicle and passing traffic without barrier',
      'Worker 2 standing in front of the vehicle during winch cable tensioning',
      'Worker 2 in the winch line trajectory or between towing vehicles',
      'Worker 2 in the traffic lane during roadside operations',
    ],
    presence_indirect: [
      'warning triangle placed on the road behind the vehicle, high-visibility jacket draped over the open door — no technician visible',
      'diagnostic cable trailing from the open bonnet into the passenger footwell — tool display on the dashboard, no operator in frame',
      'jack and lug wrench on the ground beside the jacked wheel arch — wheel removed, no technician visible',
    ],
  },
};

// ─── Etancheite context-specific rule sets ────────────────────────────────────
// Keyed by _visual_family group prefix: FLAT / PITCHED / BALCON / GROUND_TERRACE
const _ETANCH_CONTEXT_RULES = {
  FLAT: {
    min_workers_when_visible: 1,
    max_workers: 2,
    state_worker_minimums: { encours: 2, semifinal: 2 },
    actions: [
      'rolling out the waterproofing membrane across the flat roof surface and pressing the lap seam with a seam roller',
      'pressing the relevé upstand strip onto the parapet or acrotère face with a rubber roller',
      'inspecting the completed membrane seam and drain outlet collar at the parapet edge',
      'applying cold adhesive primer across the flat roof substrate with a roller ahead of membrane lay',
    ],
    postures: [
      'crouching on the flat roof surface, both hands pressing the membrane edge — back to camera, parapet wall visible on all sides',
      'standing at the parapet inner face applying sealant at the upstand — in profile, no open unprotected edge visible',
      'kneeling at the membrane lap joint with a seam roller — back to camera, parapet on all sides',
    ],
    access: [
      'flat roof access via internal hatch or secure external stair — not via hooked roof ladder',
      'mobile elevated work platform (MEWP) for flat roof staging when terrain permits',
    ],
    safety_required: [
      'continuous parapet wall or guardrail providing edge protection — no worker within 2 m of an open unprotected edge',
    ],
    forbidden: [
      'single worker performing work alone on any etancheite task',
      'hooked roof ladder used as flat roof access — use internal hatch or external stair',
      'worker standing on top of the parapet coping',
      'worker suspended outside the building without certified access equipment',
      'membrane roll placed across the only flat roof access hatch opening',
    ],
    presence_indirect: [
      'membrane roll partially unrolled across the flat roof deck — seam roller resting at the active lap, no operator on the roof',
      'hot air gun resting on the parapet inner face between welds — power cable trailing to hatch — no operator',
      'adhesive drum open beside the unrolled membrane on the flat roof — mop roller resting across the drum top',
    ],
  },
  PITCHED: {
    min_workers_when_visible: 1,
    max_workers: 2,
    state_worker_minimums: { encours: 2, semifinal: 2 },
    actions: [
      'Worker 1 on the rungs of a hooked roof ladder at the localized repair zone applying patch material — Worker 2 laterally offset at ground level outside the drop zone',
      'Worker 1 pressing the flashing strip at the chimney base from a hooked roof ladder — Worker 2 at ladder base steadying and supplying materials',
      'Worker 1 positioning the new velux flashing collar from the hooked roof ladder — Worker 2 at ground level managing lifeline',
    ],
    postures: [
      'Worker 1 on the rungs of a secured hooked roof ladder at the repair zone, both hands on the work — in profile, fall-arrest harness lanyard leading to ridge anchor above',
      'Worker 2 standing laterally offset at ground level outside the falling-object zone, managing lifeline — back to camera',
    ],
    access: [
      'hooked roof ladder over the ridge for pitched roof repair — Worker 1 on the rungs, not standing freely on tiles',
      'mobile elevated work platform (MEWP) for pitched roof staging when terrain permits',
      'scaffold platform at eave level for pitched roof perimeter or chimney work',
    ],
    safety_required: [
      'fall-arrest harness with lanyard visibly connected to a certified ridge anchor — Worker 1 on pitched roof only',
      'hooked roof ladder clearly hooked over the ridge — Worker 1 on the rungs, not standing freely on tiles',
      'Worker 2 laterally offset outside the falling-object zone — never directly below the active repair zone',
    ],
    forbidden: [
      'single worker performing work alone on any etancheite task',
      'worker standing freely on steep pitched tiles without visible fall protection or secured access equipment',
      'Worker 2 standing directly below the active pitched roof repair zone — lateral offset position required',
      'flat roof hatch used as pitched roof access',
      'free-standing ladder propped against tiles without ridge hook',
    ],
    presence_indirect: [
      'hooked roof ladder over the ridge with fall-arrest harness lanyard attached to ridge anchor — no operator, repair tools in a clipped bucket on the ladder rungs',
      'tile lifter wedge under a displaced tile at the compact pitched repair zone — safety bag and membrane offcuts at ground level at the wall base, outside the fall zone',
    ],
  },
  BALCON: {
    min_workers_when_visible: 1,
    max_workers: 2,
    state_worker_minimums: { encours: 2, semifinal: 2 },
    actions: [
      'pressing the waterproofing membrane strip at the porte-fenêtre sill junction on the compact elevated balcony floor',
      'sealing the balcony drain outlet collar with membrane relevé strip — Worker 1 crouching at drain, Worker 2 in doorway',
      'rolling out membrane across the compact balcony floor toward the parapet base — Worker 2 managing the roll inside',
    ],
    postures: [
      'crouching on the compact elevated balcony floor pressing membrane at the sill junction — back to camera, continuous railing visible on all open sides',
      'Worker 2 positioned inside the porte-fenêtre opening steadying membrane roll — back to camera, protected by the doorframe',
    ],
    access: [
      'porte-fenêtre opening for compact balcony access — Worker 2 inside the doorway or protected threshold zone',
    ],
    safety_required: [
      'continuous guardrail on all open sides of the balcony',
      'Worker 2 inside the doorway or protected position — never outside the railing',
    ],
    forbidden: [
      'single worker performing work alone on any etancheite task',
      'worker standing on or leaning over the balcony railing',
      'worker suspended outside the balcony',
      'fall-arrest harness (not required for balcony floor work)',
      'hooked roof ladder for balcony access',
    ],
    presence_indirect: [
      'membrane roll and primer tin on the compact balcony floor beside the drain outlet — no operator',
      'seam roller resting at the membrane lap on the balcony deck — no operator visible, continuous railing on all sides',
    ],
  },
  GROUND_TERRACE: {
    min_workers_when_visible: 1,
    max_workers: 2,
    state_worker_minimums: { encours: 2, semifinal: 2 },
    actions: [
      'applying waterproofing membrane across the ground-level concrete slab near the facade wall and door threshold',
      'pressing the membrane relevé strip onto the facade base at the terrace level — Worker 2 managing membrane roll at the slab edge',
      'sealing the perimeter joint at the wall-slab junction with membrane band — crouched at garden level',
    ],
    postures: [
      'crouching at garden level on the concrete slab applying membrane strip at the facade threshold — back to camera, no elevated position',
      'Worker 2 at ground level managing the primer tin and membrane roll beside the facade base — in profile',
    ],
    access: [
      'ground level — no elevated access required for terrasse de plain-pied work',
    ],
    safety_required: [],
    forbidden: [
      'single worker performing work alone on any etancheite task',
      'fall-arrest harness (not required for ground-level terrasse work)',
      'guardrail or parapet wall required',
      'hooked roof ladder',
      'elevated access equipment of any kind',
    ],
    presence_indirect: [
      'primer brush and membrane strip beside the door threshold on the ground-level terrasse slab — no operator',
      'membrane roll at the facade base, seam roller resting at the last bonded joint — no operator',
    ],
  },
};

// Returns the effective rule set for a metier+visualFamily combination.
// Falls back to WORKER_SCENE_RULES[metier] for métiers without context dispatch.
function _resolveWorkerRule(metier, visualFamily) {
  if (metier === 'etancheite' && visualFamily) {
    if      (visualFamily.startsWith('ETANCH-FLAT'))          return _ETANCH_CONTEXT_RULES.FLAT;
    else if (visualFamily.startsWith('ETANCH-PITCHED'))       return _ETANCH_CONTEXT_RULES.PITCHED;
    else if (visualFamily.startsWith('ETANCH-BALCON'))        return _ETANCH_CONTEXT_RULES.BALCON;
    else if (visualFamily.startsWith('ETANCH-GROUND'))        return _ETANCH_CONTEXT_RULES.GROUND_TERRACE;
  }
  return WORKER_SCENE_RULES[metier] || null;
}

export { WORKER_SCENE_RULES, _resolveWorkerRule };
