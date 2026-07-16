/**
 * paysagiste.js — Phase 2 shadow copy (source active : app.js)
 * Copie stricte de WORK_SCENES {paysagiste} et SITE_REALISM {paysagiste}.
 * Ne pas modifier avant le cutover validé.
 */

export const WORK_SCENES_PAYSAGISTE = {
  paysagiste: {
    category:         'paysagiste',
    priority:         2,
    service_keywords: [
      { phrase: 'entretien jardin',       score: 13 },
      { phrase: 'creation jardin',        score: 13 },
      { phrase: 'taille de haie',         score: 13 },
      { phrase: 'paysagiste',             score: 13 },
      { phrase: 'amenagement exterieur',  score: 12 },
      { phrase: 'amenagement paysager',   score: 12 },
      { phrase: 'plantation arbustes',    score: 12 },
      { phrase: 'plantation haies',       score: 12 },
      { phrase: 'taille haie',            score: 12 },
      { phrase: 'pose gazon',             score: 12 },
      { phrase: 'arrosage automatique',   score: 11 },
      { phrase: 'espaces verts',          score: 11 },
      { phrase: 'jardinier',              score: 10 },
      { phrase: 'plantation',             score: 9  },
      { phrase: 'paillage',               score: 9  },
      { phrase: 'tonte',                  score: 9  },
      { phrase: 'haies',                  score: 8  },
      { phrase: 'haie',                   score: 8  },
      { phrase: 'pelouse',                score: 8  },
      { phrase: 'gazon',                  score: 7  },
      { phrase: 'massif',                 score: 7  },
      { phrase: 'bordures',               score: 7  },
      { phrase: 'jardin',                 score: 5  },
    ],
    exclude_if: [],
    intro:      'garden landscaping and maintenance at a residential property',
    setting:    'exterior',
    secteur:           'landscaper',
    variation_setting: 'garden',
    hasWorkers:        false,
    camera:            'standing in the garden, 4–6 m from the work area, wide view showing garden context',
    materials:  ['topsoil bags', 'mulch', 'plant pots', 'turf rolls'],
    photo_defects: [
      'dappled shade causing uneven exposure across the garden',
      'slight lens flare from low afternoon sun between trees',
    ],
    exclusions: ['lawnmowers', 'hedge trimmers', 'tools', 'workers', 'people'],
    states: {
      debut: {
        framing: {
          work_pct:   40,
          foreground: 'soil freshly turned and raked, plant pots and topsoil bags staged at the garden edge',
          midground:  'bare soil plot or patchy lawn with marked planting positions',
          background: 'house facade, garden fence, existing mature trees',
        },
        debris:      'topsoil bags and empty packaging at garden edge, soil clods on path',
        description: 'Landscaping just started. Soil prepared, planting positions marked. No plants installed yet.',
      },
      encours: {
        framing: {
          work_pct:   55,
          foreground: 'plants being installed — some root balls in position, mulch being spread around them',
          midground:  'garden half planted — some areas green and established, others still bare',
          background: 'house facade, fence, existing garden trees',
        },
        debris:      'plant pot packaging on the ground, soil and mulch debris near planting areas',
        description: 'Garden half planted. Some areas lush and green, others still bare. Mulch being laid.',
      },
      semifinal: {
        framing: {
          work_pct:   60,
          foreground: 'freshly laid turf or mulched beds with plants in place, neat edging being finished',
          midground:  'garden mostly complete — plants established, edging nearly done',
          background: 'house facade, clean fence line, sky',
        },
        debris:      'a few empty plant pots at the garden edge, otherwise tidy',
        description: 'Garden mostly planted and mulched. Edges being defined. Almost complete.',
      },
      final: {
        framing: {
          work_pct:   70,
          foreground: 'clean garden bed — lush plants, neat mulch layer, sharply defined edges',
          midground:  'complete landscaped garden — green and tidy throughout',
          background: 'house facade, fence, sky',
        },
        debris:      'none — garden clean and tidy',
        description: 'Garden landscaping complete. Plants installed, mulch laid, edges clean. A beautiful professional result.',
      },
    },
  },

};

export const SITE_REALISM_PAYSAGISTE = {
  paysagiste: {
    scenarios: [
      {
        _for:          'creation|plantation|massif|arbre|arbust|rocaille|bosquet|haie.*creation|creation.*haie',
        scene_note:    'garden creation or planting work in progress — plants being positioned in freshly dug holes, new bed taking shape from bare ground',
        scene_camera:  'standing at the edge of the new planting bed, framing the active planting zone across the turned soil',
        scene_framing: {
          work_pct:   65,
          foreground: 'plant in freshly dug hole or just placed, topsoil around the base, empty nursery pot beside it',
          midground:  'new planting bed — turned topsoil, several newly planted specimens at intervals',
          background: 'garden boundary — fence, wall, or hedge — existing path or lawn visible',
        },
        scene_debris:  'empty plant pots with nursery labels beside the planting holes, topsoil heap at the bed edge',
        scene_exclude: ['lawn mower', 'hedge trimmer', 'leaf blower', 'finished manicured garden without bare soil', 'no planting activity'],
        tools: [
          'hand trowel beside a freshly dug planting hole',
          'long-handled edging spade resting against the fence post',
          'wheelbarrow with topsoil at the bed edge',
          'string line pulled between two stakes defining the bed edge',
        ],
        protections: [
          'weed-control fabric partially laid on the adjacent bed section',
          'flat board on the turned soil to avoid foot compaction',
        ],
        chantier_details: [
          'freshly dug planting holes at measured intervals in the new bed',
          'empty plant pots with nursery labels on the ground nearby',
          'new plant in hole with roots visible — not yet backfilled',
          'topsoil heap at the bed edge, wheelbarrow partially filled',
        ],
      },
      {
        _for:          'gazon|pelouse|engazonn|semis.*gazon|rouleau.*gazon|pose.*gazon|creation.*pelouse',
        scene_note:    'lawn installation in progress — turf rolls being unrolled on prepared ground, or lawn seed being broadcast, bare prepared soil visible',
        scene_camera:  'standing at the edge of the prepared area, framing the leading turf roll being unrolled or the seeder on the bare earth',
        scene_framing: {
          work_pct:   65,
          foreground: 'turf roll being unrolled across prepared soil, or seeder being pushed across raked earth',
          midground:  'prepared bare soil surface with turf strips already laid to one side',
          background: 'garden boundary and existing surfaces — path, terrace, fence',
        },
        scene_debris:  'turf roll off-cut at the edge of the laid section, rake on the ground near the last strip',
        scene_exclude: ['hedge trimmer', 'leaf blower', 'deep planting holes', 'large shrubs or trees being planted', 'finished manicured lawn with no work visible'],
        tools: [
          'turf roll beside the active laying edge',
          'wide levelling rake on the prepared soil',
          'lawn roller on the ground near the newly laid section',
          'half-moon edger at the border cut line',
        ],
        protections: [
          'flat wooden board on the newly laid turf to kneel on without compaction',
        ],
        chantier_details: [
          'turf strips laid parallel, joints staggered like brickwork',
          'leading turf roll being unrolled on prepared bare soil',
          'border cut being trimmed at the path edge',
          'rake marks on the still-bare section ahead of the laying front',
        ],
      },
      {
        _for:          'taille|haie|coupe.*haie|arbust.*entretien|entretien.*haie|arbre.*taille|taille.*arbre|elagage.*haie',
        scene_note:    'hedge trimming or shrub pruning in progress — hedge trimmer or secateurs in use, cut clippings on the ground, hedge clearly mid-shaping',
        scene_camera:  'standing back from the hedge, framing the work zone at mid-height — trimmed section and still-overgrown section side by side',
        scene_framing: {
          work_pct:   65,
          foreground: 'cut clippings pile at the hedge base, secateurs or trimmer beside it',
          midground:  'hedge showing contrast between freshly trimmed side and overgrown side',
          background: 'garden fence or wall behind the hedge, garden or path on the other side',
        },
        scene_debris:  'pile of cut clippings on the ground at the base, small branches on the adjacent path or lawn',
        scene_exclude: ['bare soil planting bed', 'turf rolls', 'planting holes', 'finished garden with no cut material visible'],
        tools: [
          'hedge trimmer set on the ground beside the hedge',
          'bypass secateurs near the clipping pile',
          'garden rake beside the debris pile',
          'garden refuse sack open at the clipping pile',
        ],
        protections: [
          'safety goggles beside the hedge trimmer',
          'cut-resistant gloves beside the secateurs',
        ],
        chantier_details: [
          'hedge clearly showing trimmed and untrimmed sections side by side',
          'pile of fresh cut clippings at the hedge base',
          'small branches on the adjacent lawn from the cutting work',
          'string line showing the target hedge height pulled taut along the top',
        ],
      },
      {
        _for:          'desherb|nettoy.*jardin|debroussaill|mauvaise.*herbe|sarclage|desherbage',
        scene_note:    'garden weeding or vegetation clearance in progress — weeds being removed from beds or paths, cleared patch beside still-overgrown area',
        scene_camera:  'crouching low near a bed or path, framing the active weeding zone — bare cleared soil beside the remaining overgrowth',
        scene_framing: {
          work_pct:   65,
          foreground: 'hand fork or hoe in the soil at the cleared patch edge, uprooted weeds piled beside it',
          midground:  'cleared bed section — bare soil — adjacent to the still-overgrown section',
          background: 'garden fence, hedge, or wall, garden beyond',
        },
        scene_debris:  'pile of uprooted weeds on the cleared ground, garden refuse sack open beside the pile',
        scene_exclude: ['hedge trimmer', 'turf rolls', 'new plants being planted', 'finished manicured garden'],
        tools: [
          'hand fork pushed into the soil at the active weeding edge',
          'hoe resting against the fence at the cleared section',
          'garden kneeling pad on the cleared soil',
          'garden refuse sack beside the weed pile',
        ],
        protections: [
          'gardening gloves beside the hand fork',
        ],
        chantier_details: [
          'uprooted weed pile on the cleared soil — root balls visible',
          'bare soil section where weeding is done beside the overgrown area',
          'garden refuse sack partially filled with removed weeds',
        ],
      },
      {
        _for:          'bordure|paillage|amenag|bache.*jardin|gravier.*jardin|bois.*jardin|allee.*jardin|chemin.*jardin',
        scene_note:    'garden edging, mulching, or surface treatment in progress — border being set or mulch being spread over a prepared bed',
        scene_camera:  'standing at the bed edge, framing the active section where edging is being pressed in or mulch spread with a rake',
        scene_framing: {
          work_pct:   65,
          foreground: 'edging strip being pressed into the soil, or mulch pile being spread with a rake at the bed surface',
          midground:  'bed section with edging set and mulch applied, next section still to do',
          background: 'lawn or path beside the bed, garden fence or wall beyond',
        },
        scene_debris:  'excess mulch spill on the path edge, edging strip packaging on the ground',
        scene_exclude: ['hedge trimmer', 'turf rolls', 'planting holes', 'weeding debris piles'],
        tools: [
          'plastic or metal edging strip being set along the bed border',
          'rubber mallet for tapping the edging into the soil',
          'garden rake for spreading mulch evenly',
          'wheelbarrow with mulch or gravel at the active section',
        ],
        protections: [
          'gardening gloves beside the edging strip',
        ],
        chantier_details: [
          'edging strip partially set along the bed, held at intervals',
          'mulch pile being spread to cover the prepared bed',
          'transition visible — mulched section beside still-bare soil',
          'edging strip off-cut on the ground near the active end',
        ],
      },

      // --- création / plantation (3 additional) ---
      {
        _for:          'creation|plantation|massif|arbre|arbust|rocaille|bosquet|haie.*creation|creation.*haie',
        scene_note:    'planting bed soil preparation — rotavator marks in the freshly turned topsoil, bed being raked level before planting',
        scene_camera:  'standing at the bed edge, framing the raked topsoil surface and the rotavator marks in the turned earth',
        scene_framing: {
          work_pct:   55,
          foreground: 'wide landscape rake being drawn through the turned topsoil, rotavator tine marks in the earth',
          midground:  'planting bed surface — turned and raked, ready for planting',
          background: 'garden fence or hedge, existing lawn or path beside the new bed',
        },
        scene_debris:  'small stones raked to the bed edge from the turned topsoil, rotavator fuel can on the ground beside',
        scene_exclude: ['finished planted bed', 'hedge trimmer', 'leaf blower', 'lawn mower'],
        tools: [
          'wide landscape rake levelling the freshly turned topsoil',
          'rotavator parked at the bed edge — tines still with fresh earth',
        ],
        protections: [
          'flat board on the raked surface to avoid footprint compaction',
        ],
        chantier_details: [
          'rotavator tine marks clearly visible in the freshly turned topsoil',
          'rake marks forming the level bed surface',
          'stones raked to the bed edge during levelling',
        ],
      },
      {
        _for:          'creation|plantation|massif|arbre|arbust|rocaille|bosquet|haie.*creation|creation.*haie',
        scene_note:    'tree root ball unwrapping — hessian or plastic wrapping being removed from a tree root ball before planting into the prepared hole',
        scene_camera:  'crouching beside the tree root ball, framing the hessian being cut and removed from the root mass',
        scene_framing: {
          work_pct:   65,
          foreground: 'hessian or plastic wrapping being cut from the tree root ball, roots visible where unwrapped',
          midground:  'tree root ball on the prepared planting area, open planting hole visible nearby',
          background: 'garden boundary, existing plantings beyond',
        },
        scene_debris:  'cut hessian pieces on the ground beside the root ball, binding wire removed to one side',
        scene_exclude: ['finished planted bed', 'hedge trimmer', 'leaf blower', 'lawn mower'],
        tools: [
          'secateurs cutting the hessian binding on the tree root ball',
          'planting hole open beside the root ball, ready to receive the tree',
        ],
        protections: [
          'gardening gloves beside the secateurs',
        ],
        chantier_details: [
          'hessian cut and partially removed from the root ball — roots partially visible',
          'binding wire and cut hessian pieces on the ground beside the root ball',
          'planting hole open and ready beside the root ball',
        ],
      },
      {
        _for:          'creation|plantation|massif|arbre|arbust|rocaille|bosquet|haie.*creation|creation.*haie',
        scene_note:    'newly planted tree being staked — timber stake driven beside the tree, soft tree tie being applied around the trunk to secure it',
        scene_camera:  'standing back, framing the newly planted tree and the stake being driven beside it',
        scene_framing: {
          work_pct:   60,
          foreground: 'timber stake driven into the planting soil beside the newly planted tree trunk',
          midground:  'newly planted tree with topsoil mounded at the base, tree tie being looped around trunk',
          background: 'garden boundary, existing garden beyond the planting zone',
        },
        scene_debris:  'stake mallet on the ground beside the driven stake, empty tree tie packaging near the tree base',
        scene_exclude: ['finished planted bed without work visible', 'hedge trimmer', 'leaf blower'],
        tools: [
          'timber stake driven beside the tree — bark still on the stake',
          'soft rubber tree tie being applied around the trunk',
          'mallet on the ground beside the stake',
        ],
        protections: [
          'gardening gloves near the tree tie',
        ],
        chantier_details: [
          'timber stake driven firmly into the soil beside the tree trunk',
          'tree tie looped around trunk and stake — figure-8 tie visible',
          'topsoil mounded and firmed around the tree base',
        ],
      },

      // --- gazon / pelouse (3 additional) ---
      {
        _for:          'gazon|pelouse|engazonn|semis.*gazon|rouleau.*gazon|pose.*gazon|creation.*pelouse',
        scene_note:    'soil preparation before turf laying — topsoil being raked level with a landscape rake, final surface ready for turf rolls',
        scene_camera:  'standing at the edge of the prepared area, framing the rake working the last section of topsoil',
        scene_framing: {
          work_pct:   55,
          foreground: 'landscape rake levelling the prepared topsoil, fine tilth visible at the surface',
          midground:  'prepared topsoil area — raked and level, ready for turf',
          background: 'garden boundary, adjacent existing surface or fence',
        },
        scene_debris:  'stones raked to the bed edge, small clod of topsoil beside the rake',
        scene_exclude: ['turf rolls visible', 'hedge trimmer', 'leaf blower', 'finished lawn'],
        tools: [
          'wide landscape rake levelling the final topsoil layer',
          'spirit level on the prepared surface checking the grade',
        ],
        protections: [
          'flat board on the prepared surface to avoid compaction during raking',
        ],
        chantier_details: [
          'fine topsoil tilth raked to a level surface — ready for turf',
          'stones and debris at the bed edge from the raking pass',
          'grade level consistent across the prepared area',
        ],
      },
      {
        _for:          'gazon|pelouse|engazonn|semis.*gazon|rouleau.*gazon|pose.*gazon|creation.*pelouse',
        scene_note:    'freshly laid turf being rolled — flat lawn roller being pushed across the newly laid strips to press the root contact and seams',
        scene_camera:  'standing at the end of the lawn, framing the lawn roller being pushed across the turf strips',
        scene_framing: {
          work_pct:   55,
          foreground: 'heavy flat lawn roller being pushed across the freshly laid turf strips',
          midground:  'newly laid turf — bright green strips with seam lines visible',
          background: 'garden boundary and adjacent surfaces, remaining turf rolls at the far side',
        },
        scene_debris:  'turf roll off-cut end at the lawn edge beside the roller path',
        scene_exclude: ['hedge trimmer', 'leaf blower', 'planting holes', 'finished manicured lawn without work visible'],
        tools: [
          'heavy flat lawn roller being pushed across the turf',
        ],
        protections: [],
        chantier_details: [
          'lawn roller pressing each turf strip — seams visibly compressed',
          'freshly laid turf — bright green against the prepared soil edge',
          'turf seam lines running parallel across the new lawn area',
        ],
      },
      {
        _for:          'gazon|pelouse|engazonn|semis.*gazon|rouleau.*gazon|pose.*gazon|creation.*pelouse',
        scene_note:    'first watering of newly laid turf — hose or sprinkler soaking the fresh turf thoroughly after laying',
        scene_camera:  'standing at the lawn edge, framing the water jet or sprinkler wetting the newly laid turf',
        scene_framing: {
          work_pct:   50,
          foreground: 'hose nozzle directing water across the freshly laid turf, water spreading across the surface',
          midground:  'freshly laid turf — deep green, water pooling at the low points between strips',
          background: 'garden boundary, hose connection at the fence side',
        },
        scene_debris:  'water pooling in the seam lines between turf strips',
        scene_exclude: ['hedge trimmer', 'leaf blower', 'planting holes', 'dry turf just laid'],
        tools: [
          'garden hose with spray nozzle watering the freshly laid turf',
        ],
        protections: [],
        chantier_details: [
          'water spreading across the freshly laid turf surface from the hose',
          'turf deepening in colour as it soaks in',
          'water pooling at the seam lines between strips',
        ],
      },

      // --- taille / haie (3 additional) ---
      {
        _for:          'taille|haie|coupe.*haie|arbust.*entretien|entretien.*haie|arbre.*taille|taille.*arbre|elagage.*haie',
        scene_note:    'ladder positioned for tall hedge trimming — aluminium ladder against the hedge before cutting starts, no cuts made yet',
        scene_camera:  'standing back, framing the ladder leaning against the tall hedge with the hedge trimmer on the ground beside it',
        scene_framing: {
          work_pct:   45,
          foreground: 'aluminium ladder leaning against the tall hedge, hedge trimmer on the ground at the ladder base',
          midground:  'full height of the overgrown hedge — top above ladder reach',
          background: 'garden boundary or fence behind the hedge, garden beside',
        },
        scene_debris:  'small quantity of old hedge debris on the lawn at the hedge base',
        scene_exclude: ['cut clippings piles', 'trimmed hedge section visible', 'lawn mower', 'planting'],
        tools: [
          'aluminium ladder leaning against the tall hedge',
          'hedge trimmer on the ground at the ladder base',
          'long-handled hedge shear resting against the fence nearby',
        ],
        protections: [
          'safety goggles on the ground near the trimmer',
          'cut-resistant gloves near the hedge trimmer',
        ],
        chantier_details: [
          'ladder positioned against the hedge at the starting point',
          'overgrown hedge top extending above the ladder reach',
          'hedge trimmer and shears laid out at the base ready for use',
        ],
      },
      {
        _for:          'taille|haie|coupe.*haie|arbust.*entretien|entretien.*haie|arbre.*taille|taille.*arbre|elagage.*haie',
        scene_note:    'hedge top trimming from working platform — flat top of hedge being trimmed, clippings falling on both sides',
        scene_camera:  'side view at hedge top level, framing the trimmer working along the flat top with clippings falling',
        scene_framing: {
          work_pct:   65,
          foreground: 'fresh-cut hedge top — flat and even, cut clippings caught on the top surface',
          midground:  'trimmed section beside the untrimmed section, height difference clearly visible',
          background: 'garden below on one side, neighbouring garden or open sky on the other',
        },
        scene_debris:  'cut clippings on the hedge top surface after the trimmer pass',
        scene_exclude: ['planting holes', 'turf rolls', 'lawn mower', 'no cut visible'],
        tools: [
          'hedge trimmer at the hedge top — blade horizontal across the flat top',
          'string line pulled taut above the hedge defining the cut height',
        ],
        protections: [
          'safety goggles near the trimmer on the hedge top',
        ],
        chantier_details: [
          'flat hedge top — freshly trimmed, clippings caught on the surface',
          'cut and uncut sections side by side — height difference visible',
          'string line above the hedge defining the target height',
        ],
      },
      {
        _for:          'taille|haie|coupe.*haie|arbust.*entretien|entretien.*haie|arbre.*taille|taille.*arbre|elagage.*haie',
        scene_note:    'clippings collection with leaf blower — cut clippings being blown into a pile from the lawn and adjacent path after hedge trimming',
        scene_camera:  'standing at the lawn beside the hedge, framing the leaf blower directing the clippings into a pile',
        scene_framing: {
          work_pct:   50,
          foreground: 'leaf blower directing cut clippings into a growing pile at the lawn edge',
          midground:  'freshly trimmed hedge behind — flat top and tidy sides visible',
          background: 'garden boundary, path or lawn continuing beyond',
        },
        scene_debris:  'growing pile of cut clippings at the lawn edge, loose clippings still on the lawn ahead of the blower',
        scene_exclude: ['planting holes', 'turf rolls', 'no trimming done yet'],
        tools: [
          'leaf blower directing clippings into a pile',
          'garden refuse sack open beside the pile ready to receive the clippings',
        ],
        protections: [
          'ear defenders or ear plugs near the leaf blower',
        ],
        chantier_details: [
          'clippings pile at the lawn edge — building up as blower collects more',
          'freshly trimmed hedge visible behind — flat top and sides tidy',
          'loose clippings on the lawn ahead of the blower still to be collected',
        ],
      },

      // --- désherbage (3 additional) ---
      {
        _for:          'desherb|nettoy.*jardin|debroussaill|mauvaise.*herbe|sarclage|desherbage',
        scene_note:    'knapsack sprayer in use — chemical weed treatment being applied to a gravel path or paved area between plants',
        scene_camera:  'standing behind the sprayer, framing the spray lance directing chemical onto the target weeds',
        scene_framing: {
          work_pct:   55,
          foreground: 'spray lance of the knapsack sprayer directing fine spray onto weeds in the gravel or paved surface',
          midground:  'gravel path or paving with weeds in the joints, treated section darker from the spray',
          background: 'garden boundary, adjacent planting bed or hedge beyond',
        },
        scene_debris:  'wet spray residue on the gravel around the treated weeds',
        scene_exclude: ['hedge trimmer', 'turf rolls', 'planting holes'],
        tools: [
          'knapsack sprayer with lance directing herbicide onto the weeds',
        ],
        protections: [
          'chemical-resistant gloves near the sprayer pump',
          'safety goggles beside the knapsack',
        ],
        chantier_details: [
          'fine spray being directed from the lance onto weeds in the path',
          'treated gravel visibly darker and wet around the sprayed weeds',
          'warning marker at the treated area edge',
        ],
      },
      {
        _for:          'desherb|nettoy.*jardin|debroussaill|mauvaise.*herbe|sarclage|desherbage',
        scene_note:    'tap-root weed extraction — dandelion or deep-rooted weed being pulled by a long tap-root extractor tool, intact root beside the hole',
        scene_camera:  'crouching on the lawn, framing the tap-root extractor tool in the soil with the extracted root beside the hole',
        scene_framing: {
          work_pct:   70,
          foreground: 'tap-root extractor tool inserted in the lawn, extracted weed root beside the small hole',
          midground:  'lawn surface around the extraction point, small soil plug from the corer beside the hole',
          background: 'garden beyond the lawn, fence or hedge at distance',
        },
        scene_debris:  'tap root complete with crown beside the extractor hole, small soil plug on the lawn',
        scene_exclude: ['hedge trimmer', 'sprayer', 'turf rolls', 'planting holes'],
        tools: [
          'tap-root weed extractor inserted in the lawn at the weed position',
        ],
        protections: [
          'gardening gloves beside the extractor',
        ],
        chantier_details: [
          'tap-root extractor in the soil — ready to twist and extract',
          'extracted root complete with crown beside the small hole',
          'lawn plug of soil beside the extraction point',
        ],
      },
      {
        _for:          'desherb|nettoy.*jardin|debroussaill|mauvaise.*herbe|sarclage|desherbage',
        scene_note:    'post-treatment clearance — wilted and dying weeds being raked up from the bed after chemical treatment, debris going into sacks',
        scene_camera:  'crouching low at the bed, framing the wilted weed plants being raked into a pile for removal',
        scene_framing: {
          work_pct:   60,
          foreground: 'wilted and yellowing weeds on the ground, hand rake gathering them into a pile',
          midground:  'bed surface — partly cleared, wilted plants on one section, bare soil on the cleared section',
          background: 'garden boundary, adjacent hedge or fence beyond',
        },
        scene_debris:  'pile of wilted weed plants on the cleared section, garden refuse sack open nearby',
        scene_exclude: ['hedge trimmer', 'turf rolls', 'fresh healthy plants'],
        tools: [
          'hand rake gathering wilted weeds into a pile',
          'garden refuse sack open beside the pile',
        ],
        protections: [
          'gardening gloves beside the rake',
        ],
        chantier_details: [
          'wilted yellow weeds clearly dead from the treatment — limp on the soil',
          'rake gathering them into a pile for bagging',
          'bare soil visible on the cleared section — treatment effective',
        ],
      },

      // --- bordure / paillage (3 additional) ---
      {
        _for:          'bordure|paillage|amenag|bache.*jardin|gravier.*jardin|bois.*jardin|allee.*jardin|chemin.*jardin',
        scene_note:    'bulk bark chip bag being opened — large polypropylene bag of bark chips being cut open, chips cascading out',
        scene_camera:  'standing beside the bag, framing the cut bag with bark chips spilling onto the prepared bed',
        scene_framing: {
          work_pct:   55,
          foreground: 'large polypropylene bag cut open, bark chips cascading out onto the prepared bed surface',
          midground:  'prepared bed waiting for mulch, edging strip already set at the border',
          background: 'garden boundary, existing plantings beside the bed',
        },
        scene_debris:  'bark chips spread around the bag cut point, packaging ties on the ground',
        scene_exclude: ['hedge trimmer', 'turf rolls', 'planting holes filled'],
        tools: [
          'utility knife or scissors used to cut the bulk bag open',
          'garden rake on the ground ready to spread the bark chips',
        ],
        protections: [
          'gardening gloves near the bag',
        ],
        chantier_details: [
          'large bark chip bag cut open — chips cascading out',
          'edging strip already set at the bed border',
          'prepared bed waiting for the mulch layer',
        ],
      },
      {
        _for:          'bordure|paillage|amenag|bache.*jardin|gravier.*jardin|bois.*jardin|allee.*jardin|chemin.*jardin',
        scene_note:    'decorative gravel being spread over weed-control fabric — gravel being raked across the fabric surface for a gravel garden bed',
        scene_camera:  'standing at the bed edge, framing the gravel rake spreading the stone across the black fabric',
        scene_framing: {
          work_pct:   60,
          foreground: 'garden rake spreading decorative gravel across the weed-control fabric',
          midground:  'gravel-covered section beside the still-bare fabric waiting for gravel',
          background: 'garden boundary, existing plantings or path beside the gravel area',
        },
        scene_debris:  'gravel spill at the bed edge near the fabric, empty gravel bag beside the spread section',
        scene_exclude: ['hedge trimmer', 'turf rolls', 'deep planting holes'],
        tools: [
          'garden rake spreading decorative gravel across the weed-control fabric',
          'empty gravel bag beside the active section',
        ],
        protections: [],
        chantier_details: [
          'decorative gravel being raked evenly across the black weed-control fabric',
          'covered and uncovered fabric sections side by side — transition visible',
          'gravel spill at the bed edge being raked back in',
        ],
      },
      {
        _for:          'bordure|paillage|amenag|bache.*jardin|gravier.*jardin|bois.*jardin|allee.*jardin|chemin.*jardin',
        scene_note:    'flexible plastic edging being shaped around a curved garden border — strip being bent to follow the curve and pegged into the soil',
        scene_camera:  'crouching at the bed edge, framing the flexible edging strip being shaped and the peg being driven at the curve',
        scene_framing: {
          work_pct:   65,
          foreground: 'flexible edging strip being shaped along the curve, peg being driven into the soil to hold it',
          midground:  'curved bed edge — edging already set on one arc section, fresh section being positioned',
          background: 'garden lawn or path on the outside, planting bed inside the curve',
        },
        scene_debris:  'peg packaging on the ground, excess edging strip end at the arc join',
        scene_exclude: ['hedge trimmer', 'turf rolls', 'straight edging'],
        tools: [
          'flexible edging strip being shaped along the curved bed border',
          'rubber mallet for driving the holding pegs into the soil',
          'pegs on the ground ready to be driven at intervals',
        ],
        protections: [],
        chantier_details: [
          'flexible edging strip following a smooth curve at the bed border',
          'peg being driven at the curve hold point — strip held to the curve',
          'edging set on the previous arc section, extending into the new curve',
        ],
      },
    ],
    tools: [
      'garden stake driven into the soil at a planting mark',
      'long-handled edging spade resting against the fence post',
      'hand trowel on the ground beside a freshly dug planting hole',
      'wheelbarrow with topsoil parked at the border edge',
      'string line pulled taut between two stakes defining the bed edge',
    ],
    protections: [
      'horticultural weed-control fabric spread on the adjacent planted bed',
      'wooden board placed flat on a planted section to avoid foot compression',
    ],
    chantier_details: [
      'fresh topsoil heap at the edge of the new planting area',
      'empty plant pot with nursery label on the ground nearby',
      'mulch pile at the border edge ready to be spread',
      'small stone or pebble sample near the path edge',
      'water puddle in the freshly turned topsoil near the planting hole',
    ],
  },

};
