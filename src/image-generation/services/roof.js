/**
 * roof.js — Phase 2 shadow copy (source active : app.js)
 * Copie stricte de WORK_SCENES {toiture, nettoyage_toiture, nettoyage_gouttieres}
 * et SITE_REALISM {toiture, nettoyage_toiture, nettoyage_gouttieres}.
 * Ne pas modifier avant le cutover validé.
 */

export const WORK_SCENES_ROOF = {
  toiture: {
    category:         'couverture',
    priority:         3,
    service_keywords: [
      { phrase: 'reparation tuiles',   score: 13 },
      { phrase: 'remplacement tuiles', score: 13 },
      { phrase: 'pose tuiles',         score: 13 },
      { phrase: 'pose ardoises',       score: 13 },
      { phrase: 'reparation toiture',  score: 12 },
      { phrase: 'faitage',             score: 11 },
      { phrase: 'charpente',           score: 10 },
      { phrase: 'ossature bois',       score: 10 },
      { phrase: 'zinguerie',           score: 10 },
      { phrase: 'gouttiere',           score: 8  },
      { phrase: 'couvreur',            score: 8  },
      { phrase: 'ardoise',             score: 7  },
      { phrase: 'couverture',          score: 11 },
      { phrase: 'comble',              score: 10 },
      { phrase: 'tuile',               score: 6  },
      { phrase: 'toitur',              score: 4  },
    ],
    exclude_if: ['nettoyage', 'demousage', 'demoussage'],
    intro:      'roof renovation on a residential house',
    setting:    'exterior',
    secteur:    'roofer',
    hasWorkers: false,
    camera:     'standing in the driveway or garden, 3–6 m from house, looking up at roof',
    materials:  ['terracotta roof tiles', 'wooden battens', 'roofing felt', 'mortar bags'],
    photo_defects: [
      'overexposure on pale sky bleaching the top third',
      'JPEG compression artifacts on rough tile texture',
    ],
    exclusions: ['single worker performing active roof work alone', 'worker freely standing on pitched tiles without visible fall protection', 'worker on pitched roof without visible secured access equipment'],
    states: {
      debut: {
        framing: {
          work_pct:   40,
          foreground: 'first removed tiles stacked near the wall, a few mortar fragments on the driveway — Worker 2 at the scaffold base or on a lower platform, managing tile transport',
          midground:  'roof mostly intact with one small stripped section showing bare lath beneath — Worker 1 on scaffold platform or hooked roof ladder at the stripped section, safety harness visible',
          background: 'upper roof still fully tiled, chimney, pale sky',
        },
        debris:      'a small pile of removed tiles beside the house, light mortar dust near the stripped patch',
        description: 'Work has just started. Worker 1 on secured elevated access at the stripped section. Worker 2 manages tile transport at the scaffold base. Two professionals, distinct roles.',
      },
      encours: {
        framing: {
          work_pct:   55,
          foreground: 'organised pile of old tiles on driveway beside Worker 2, mortar chips nearby — Worker 2 organising materials on the scaffold lower level or at the pallet',
          midground:  'roof half stripped — Worker 1 on scaffold platform at the active strip line, safety harness visible — one slope bare showing wooden battens, pallet of new tiles staged to the side',
          background: 'opposite roof slope still tiled, sky, chimney tops',
        },
        debris:      'old tiles stacked on driveway, mortar dust and a few broken fragments — an active but organised site',
        description: 'Halfway through. Worker 1 on scaffold continues stripping. Worker 2 manages tile transport and staging at the scaffold base. Two professionals, active work.',
      },
      semifinal: {
        framing: {
          work_pct:   60,
          foreground: 'a few remaining bags of mortar and offcuts near the wall — Worker 2 finishing tidy-up at the scaffold base',
          midground:  'new roof mostly complete — Worker 1 on scaffold finishing the ridge or flashing — fresh tiles neatly aligned, last section being completed',
          background: 'clean roofline against sky, neighbouring rooftops',
        },
        debris:      'minimal — a small stack of leftover materials near the wall, driveway mostly swept',
        description: 'Nearly complete. Worker 1 finishes the ridge or flashing from scaffold. Worker 2 tidies up at the scaffold base. Two professionals completing the job.',
      },
      final: {
        framing: {
          work_pct:   65,
          foreground: 'clean driveway with only one leftover bag near the wall as an authentic detail',
          midground:  'complete new roof — fresh tiles perfectly aligned, clean ridge line, new flashing',
          background: 'clear roofline, pale sky, neighbouring houses',
        },
        debris:      'nearly none — driveway swept, one leftover bag remains near the wall',
        description: 'Renovation complete. A full new terracotta roof, tiles aligned, ridge clean. Professional result credible for a contractor portfolio.',
      },
    },
  },

  nettoyage_toiture: {
    category:         'nettoyage',
    priority:         4,
    service_keywords: [
      { phrase: 'nettoyage toiture',    score: 15 },
      { phrase: 'demousage toiture',    score: 15 },
      { phrase: 'demoussage toiture',   score: 15 },
      { phrase: 'hydrofuge toiture',    score: 13 },
      { phrase: 'anti-mousse',          score: 13 },
      { phrase: 'mousse',               score: 11 },
      { phrase: 'demoussage',           score: 10 },
      { phrase: 'demousage',            score: 10 },
    ],
    exclude_if: [],
    intro:      'roof cleaning and moss removal on a residential house — ordinary customer smartphone photo taken from the garden or driveway while contractors are working',
    setting:    'exterior',
    secteur:    'roof cleaning specialist',
    hasWorkers: false,
    camera:     'ordinary homeowner smartphone photo taken from the garden, driveway or an upstairs window — 6–15 m from the house, mild digital zoom, slightly imperfect framing and slightly tilted horizon — roof slope fills most of the frame, contractor naturally off-centre and not looking at the camera',
    materials:  ['uniform single-material roof covering — same tile type, same aging, same color on every visible slope', 'green moss residue on old tiles', 'wet or slightly damp terracotta or slate surface'],
    photo_defects: [
      'slight overexposure on pale sky above the roofline',
      'JPEG compression noise on the granular texture of wet tiles',
      'mild digital zoom softness on distant roof surface',
      'slightly clipped sky highlights above the roofline',
      'minor perspective distortion from low shooting angle',
    ],
    exclusions: [
      'pressure washer machine',
      'broken tiles', 'exposed battens',
      'two different tile types on same slope', 'mixed roofing materials on same pitch',
      'patchwork roof texture', 'new tiles mixed with old tiles on same slope',
      'roof appearing reconstructed or partially replaced',
      'single worker performing active roof work alone',
      'worker freely standing on pitched roof tiles without visible fall protection',
      'worker on pitched roof without visible secured access equipment',
      'backpack sprayer or shoulder straps interpreted as fall protection',
      'ground-level roof spraying with telescopic lance from the garden',
      'harness without visible connection to a credible anchor',
      'rope attached to gutter, chimney cap, antenna, skylight or unsecured element',
      'no contractor promotional photograph', 'no stock-photo composition',
      'no centered worker demonstration', 'no worker facing the camera',
      'no worker posing for the customer', 'no showroom-clean worksite',
      'no educational before-and-after split', 'no perfect clean-versus-dirty boundary',
      'no straight wet-versus-dry boundary', 'no dramatic tile recoloring',
      'no instant disappearance of moss', 'no oversized protective tarps dominating the image',
      'no impossibly long telescopic pole reaching the ridge from ground level',
      'no roof-level camera without a customer-accessible viewpoint',
      'no professional depth of field', 'no studio lighting',
      'no logo', 'no watermark', 'no readable company branding',
    ],
    states: {
      debut: {
        framing: {
          work_pct:   35,
          foreground: 'driveway or garden path at the foot of the house — protective tarp spread below the eave edge collecting first treatment runoff — Worker 2 near the ladder foot managing the hose or tarp, not under the work zone',
          midground:  'pitched roof mostly covered in dense green and black moss — Worker 1 on secured hooked roof ladder following the slope, connected harness and lanyard leading toward the ridge — small treated strip visible near the active zone',
          background: 'gutters along the eave, chimney top, pale grey or blue sky',
        },
        debris:      'green moss residue on driveway at the tarp edge — facade clean behind the protection',
        description: 'Roof cleaning has just started. Worker 1 on secured elevated access applies treatment to the first small section. Worker 2 manages hose or tarp at the ladder foot. Two professionals with distinct roles.',
      },
      encours: {
        framing: {
          work_pct:   55,
          foreground: 'protective tarp fixed along the full eave edge — Worker 2 near the base of the access ladder managing the product hose or supervising, outside the falling-debris zone',
          midground:  'pitched roof half cleaned — Worker 1 on secured hooked roof ladder or scaffold at the active treatment zone, harness lanyard visible leading to ridge anchor — one slope restored, other still mossy',
          background: 'chimney, gutters visible along the eave, neighbouring rooftops, pale sky',
        },
        debris:      'wet moss clumps fallen onto the tarp surface, small puddle in the tarp fold at the driveway edge',
        description: 'Half the roof is clean. Worker 1 continues from secured elevated access; Worker 2 manages logistics at the access foot. Two professionals, distinct roles, active professional work.',
      },
      semifinal: {
        framing: {
          work_pct:   55,
          foreground: 'house facade clean below the eave — tarp partially removed, Worker 2 near the ladder foot gathering equipment',
          midground:  'roof almost fully cleaned — Worker 1 on secured roof ladder or scaffold treating the last moss patches near the chimney or gutters, harness lanyard visible — uniform tile colour across most of the surface',
          background: 'clean roofline, chimney, gutters, sky',
        },
        debris:      'light green residue near the chimney base and gutters — final patches being treated',
        description: 'Most of the roof is clean. Worker 1 finishes the final patches from secured elevated access. Worker 2 prepares for pack-down at the access foot.',
      },
      final: {
        framing: {
          work_pct:   65,
          foreground: 'clean house facade below the eave, gutters clear and clean along the full roofline',
          midground:  'fully clean pitched roof — uniform terracotta or slate colour across both slopes, no visible moss, ridge line clean and sharp',
          background: 'chimney, neighbouring rooftops, pale sky',
        },
        debris:      'none — roof surface clean and dry, gutters clear',
        description: 'Roof cleaning complete. The tiles are uniformly restored, no moss visible. Gutters are clear. A professional result ready for the client.',
      },
    },
  },

  nettoyage_gouttieres: {
    category:         'nettoyage',
    priority:         5,
    service_keywords: [
      { phrase: 'nettoyage gouttieres',    score: 15 },
      { phrase: 'nettoyage gouttiere',     score: 15 },
      { phrase: 'debouchage gouttieres',   score: 15 },
      { phrase: 'debouchage gouttiere',    score: 15 },
      { phrase: 'curage gouttieres',       score: 14 },
      { phrase: 'curage gouttiere',        score: 14 },
      { phrase: 'gouttieres',              score: 9  },
      { phrase: 'gouttiere',               score: 9  },
    ],
    exclude_if: [],
    intro:      'gutter cleaning and unblocking at a residential house — ordinary customer smartphone photo from the garden, driveway or an upstairs window — focus on gutters and downpipe, roof appears neutral and naturally aged in background only',
    setting:    'exterior',
    secteur:    'gutter cleaning specialist',
    hasWorkers: false,
    camera:     'ordinary homeowner smartphone photo from the garden, driveway or an upstairs window looking down at the eave — 4–10 m away, slightly upward or eye-level angle to the gutter run, mild digital zoom — roof tiles as natural context at the top edge of frame only, contractor visible but not posed or centred',
    materials:  ['clogged gutter trough full of compacted dead leaves, wet moss and twigs visible from below', 'downpipe visible at the corner of the house', 'naturally weathered roof tiles in background — not treated or cleaned'],
    photo_defects: [
      'slight overexposure on the pale wall surface below the roofline',
      'JPEG compression noise on the gutter texture and leaf debris',
      'mild digital zoom softness on gutter detail at eave level',
    ],
    exclusions: [
      'workers', 'people', 'safety harnesses',
      'pressure washer machine', 'hoses', 'tools held by hand',
      'terrace', 'ground surface as main subject',
      'roof cleaning patterns', 'moss removal on roof tiles',
      'roof as main subject', 'partially cleaned roof',
      'ladder rails pressing directly against or inside the gutter channel',
      'ladder resting on the gutter without visible standoff stabiliser',
      'worker standing on the gutter trough',
      'floating ladder without visible contact point on the wall',
      'camera floating beside the gutter at roof level with no accessible viewpoint',
      'impossible close-up of gutter interior from ground level without a plausible position',
      'no contractor promotional photograph', 'no stock-photo composition',
      'no centered worker demonstration', 'no worker facing the camera',
      'no worker posing for the customer', 'no logo', 'no watermark', 'no readable company branding',
    ],
    states: {
      debut: {
        framing: {
          work_pct:   45,
          foreground: 'house facade and downpipe at the corner — gutter overflow visible at the eave edge, leaf debris hanging over the gutter lip — Worker 2 near ladder base, debris bucket beside them, outside the falling-leaves zone',
          midground:  'gutter along the eave fully clogged — Worker 1 at the top of extension ladder with clearly visible standoff stabiliser (arms on wall below eave, NOT on gutter), scoop in hand beginning to extract compacted debris',
          background: 'naturally weathered roofline, chimney or adjoining rooftop, pale sky — roof tiles aged but not a treatment subject',
        },
        debris:      'leaves, wet moss and twigs spilling over the gutter edge — facade clean, faint drip mark at most below the downpipe joint',
        description: 'Gutter cleaning just started. Worker 1 on ladder with standoff begins clearing the clogged trough. Worker 2 manages debris collection at the ladder foot. Two professionals, distinct roles.',
      },
      encours: {
        framing: {
          work_pct:   55,
          foreground: 'house facade and downpipe, small pile of leaves and wet debris on the ground beside Worker 2 at the ladder base — Worker 2 not directly under falling debris',
          midground:  'Worker 1 on ladder with standoff working along the partially cleared gutter — one section clean, adjacent section still filled with matted debris',
          background: 'naturally weathered roofline, chimney, pale sky',
        },
        debris:      'wet leaves and moss clumps on the ground below the cleared gutter section — facade clean and unmarked',
        description: 'Gutter cleaning in progress. Worker 1 clears the trough from ladder with standoff. Worker 2 manages the debris bucket and assists at the access foot.',
      },
      semifinal: {
        framing: {
          work_pct:   55,
          foreground: 'house facade and downpipe — Worker 2 near the ladder foot with nearly-full debris bucket, clearing last material from the ground',
          midground:  'Worker 1 on ladder with standoff working near the downpipe joint — gutter nearly clear, last small debris patch visible at the bracket',
          background: 'naturally weathered roofline, sky, chimney',
        },
        debris:      'last small clumps of wet leaves and grit near the gutter bracket — almost done',
        description: 'Almost complete. Worker 1 finishes the last debris section from ladder with standoff. Worker 2 packs up the debris bucket at the access foot.',
      },
      final: {
        framing: {
          work_pct:   60,
          foreground: 'clean house facade and downpipe — no stains below the gutter outlet, clean ground at the base of the downpipe',
          midground:  'gutter fully clear and empty along the entire eave — clean trough visible, brackets well spaced, downpipe running straight to the ground drain',
          background: 'naturally weathered roofline, chimney, pale sky',
        },
        debris:      'none — gutters clear, facade clean, ground tidy below the downpipe',
        description: 'Gutter cleaning complete. The gutter is fully clear along the entire eave. The facade is clean, the downpipe is unobstructed, and the ground drain is clear.',
      },
    },
  },

};

export const SITE_REALISM_ROOF = {
  toiture: {
    scenarios: [

      // --- rénovation / réfection complète ---
      {
        _for:          'renov|refect|couvert.*neuve|toiture.*compl|remplac.*couvert',
        scene_note:    'full roof renovation — old tiles stripped, bare battens and rafter tops visible, scaffold platform loaded with stacked old tiles awaiting removal',
        scene_camera:  'standing back from the house, framing the full roof with one slope stripped to bare battens and the scaffold loaded with old tiles',
        scene_framing: {
          work_pct:   70,
          foreground: 'scaffold platform with stripped old tiles stacked — terracotta fragments and whole tiles mixed',
          midground:  'stripped roof slope — bare battens visible across the full width, underlayer felt partly exposed',
          background: 'other roof slope still tiled or gable wall at the end',
        },
        scene_debris:  'broken tile fragments on the scaffold boards, old mortar lumps from the stripped ridge on the scaffold deck',
        scene_exclude: ['finished new roof', 'garden far away', 'moss treatment equipment', 'concrete mixer at ground level'],
        tools: [
          'tile breaker bar resting on the scaffold — used to lift and break old tiles',
          'scaffold hoist hook at the platform edge for lowering tile skips',
        ],
        protections: [
          'debris netting below the scaffold to catch falling tile fragments',
          'protective tarp over the garden below the scaffold',
        ],
        chantier_details: [
          'bare battens across the stripped slope — original tile peg marks visible on batten faces',
          'scaffold loaded with stacks of stripped tiles ready to be lowered',
          'underlayer felt visible between rafters where battens are exposed — felt torn in places',
        ],
      },
      {
        _for:          'renov|refect|couvert.*neuve|toiture.*compl|remplac.*couvert',
        scene_note:    'new roof battens being nailed to the rafters — carpenter measuring from the eave upward, sawn timber battens being fixed in parallel rows at the correct gauge',
        scene_camera:  'close-up on the rafter surface, framing the batten being nailed down and the measuring rule beside the next batten position',
        scene_framing: {
          work_pct:   70,
          foreground: 'new sawn timber batten being nailed to the rafter tops — nail gun at the nail point',
          midground:  'rows of new battens already fixed below — straight parallel lines down the rafter slope',
          background: 'scaffold boards and stack of new batten lengths waiting to be cut and fixed',
        },
        scene_debris:  'batten offcuts on the scaffold board, nail heads across the previously fixed batten rows',
        scene_exclude: ['tiles going on', 'old tile stack', 'finished roof from afar', 'moss treatment'],
        tools: [
          'nail gun nailing new batten to the rafter tops',
          'folding rule measuring the batten gauge from the last row',
          'stack of new sawn timber battens on the scaffold board',
        ],
        protections: [
          'scaffold platform as working surface',
          'debris netting below scaffold',
        ],
        chantier_details: [
          'rows of new battens fixed to the rafters — straight and evenly gauged',
          'new sawn timber pale and raw — clearly new material on existing rafters',
          'batten offcuts on the scaffold board from the cut-to-length process',
        ],
      },
      {
        _for:          'renov|refect|couvert.*neuve|toiture.*compl|remplac.*couvert',
        scene_note:    'new tile coursing in progress — first courses of new terracotta tiles on the new battens, chalk line defining the next course, tile stack on the scaffold',
        scene_camera:  'from the scaffold level, framing the tile being placed on the batten with the chalk line above defining the next row',
        scene_framing: {
          work_pct:   65,
          foreground: 'new terracotta tile being placed on the batten — tile lug engaging the batten edge',
          midground:  'three or four new courses of tiles below the active row — uniform and unweathered',
          background: 'scaffold board with tile stack, chalk line drum at the side',
        },
        scene_debris:  'tile lug chips on the scaffold board from tile cutting, cardboard tile packaging beside the stack',
        scene_exclude: ['old tiles', 'moss treatment equipment', 'garden from far away'],
        tools: [
          'new terracotta tile being placed on the batten by hand',
          'chalk line drum on the scaffold board for row alignment',
          'tile stack on the scaffold ready for the next course',
        ],
        protections: [
          'scaffold platform as working surface',
          'debris netting below scaffold',
        ],
        chantier_details: [
          'new tile lug hooked over the new batten — tile clicking into position',
          'new tile courses below — uniform colour and profile, no weathering',
          'chalk line marking the correct height for the next tile course',
        ],
      },

      // --- réparation / remplacement tuile ou ardoise ---
      {
        _for:          'repar|rempla.*tuil|rempla.*ardois|tuile.*cass|ardoise.*cass|fuite.*toit',
        scene_note:    'damaged tile being removed — adjacent tiles being slid aside with a tile lifter to access the broken tile, cracked face clearly visible once exposed',
        scene_camera:  'close-up on the tile surface, framing the tile lifter being inserted under the adjacent tile to slide it up and expose the damaged one below',
        scene_framing: {
          work_pct:   75,
          foreground: 'tile lifter inserted under the adjacent tile — tool levering the tile up to expose the nail below',
          midground:  'damaged tile visible once the adjacent tile is raised — cracked or broken face clearly visible',
          background: 'surrounding tile courses, roof slope continuing',
        },
        scene_debris:  'broken tile fragment on the roof surface beside the repair point',
        scene_exclude: ['full scaffold loaded with tiles', 'new battens being nailed', 'moss treatment equipment'],
        tools: [
          'tile lifter or slate ripper inserted under the adjacent tile to raise it',
        ],
        protections: [
          'roof ladder or cat ladder hooked over the ridge for safe access',
        ],
        chantier_details: [
          'tile lifter levering the adjacent tile — damaged tile now accessible below',
          'cracked or broken tile clearly visible once the adjacent tile is raised',
          'surrounding tiles undisturbed — targeted single-tile repair in progress',
        ],
      },
      {
        _for:          'repar|rempla.*tuil|rempla.*ardois|tuile.*cass|ardoise.*cass|fuite.*toit',
        scene_note:    'replacement tile being slid into position — new tile being fed into the course gap with the lug aligned over the batten',
        scene_camera:  'close-up from the roof surface, framing the new tile being guided into the gap left by the removed damaged tile',
        scene_framing: {
          work_pct:   75,
          foreground: 'new replacement tile being slid horizontally into the course gap, lug engaging the batten',
          midground:  'surrounding weathered tiles — the new tile slightly brighter in colour than its neighbours',
          background: 'roof slope around the repair point',
        },
        scene_debris:  'old tile fragments removed and set aside on the roof surface near the repair',
        scene_exclude: ['full tile stripping', 'scaffold loaded with tiles', 'moss treatment'],
        tools: [
          'replacement tile being guided into the course gap with both hands',
          'tile lifter resting on the adjacent tile beside the repair point',
        ],
        protections: [
          'roof ladder hooked over the ridge beside the repair zone',
        ],
        chantier_details: [
          'new tile being slid into the gap — lug engaging the batten below',
          'new tile slightly brighter in colour against the weathered tiles on either side',
          'removed damaged tile fragments to the side — comparison of old vs. new visible',
        ],
      },
      {
        _for:          'repar|rempla.*tuil|rempla.*ardois|tuile.*cass|ardoise.*cass|fuite.*toit',
        scene_note:    'repaired tile section — new replacement tiles among weathered neighbours, fresh mortar pointing visible at the edges, surrounding tiles undisturbed',
        scene_camera:  'standing back slightly from the repair, framing the new tiles among the weathered surrounding tiles with fresh mortar visible',
        scene_framing: {
          work_pct:   60,
          foreground: 'fresh white mortar pointing around the new tile edge — still uncured and bright white',
          midground:  'one or two replacement tiles among the weathered surrounding tiles — slight colour difference',
          background: 'roof slope continuing undisturbed, cat ladder beside the repair',
        },
        scene_debris:  'trowel mortar smear on the adjacent tile surface beside the pointing',
        scene_exclude: ['full tile stripping', 'scaffold loaded', 'moss treatment equipment'],
        tools: [
          'pointing trowel resting on the adjacent tile beside the fresh mortar work',
          'small bucket of fresh mortar at the roof ladder platform',
        ],
        protections: [
          'roof ladder hooked over the ridge — access route visible',
        ],
        chantier_details: [
          'fresh mortar pointing around the new tile edge — bright white against the weathered tile',
          'replacement tile slightly different in colour from the weathered tiles around it',
          'minimal repair footprint — only the damaged section replaced, surrounding tiles untouched',
        ],
      },

      // --- charpente ---
      {
        _for:          'charpente|ferme|fermette|structure.*toit|isolation.*comble|comble',
        scene_note:    'bare timber roof structure — rafters, purlins, and ridge board exposed before tiling, fermette frame layout visible across the full span',
        scene_camera:  'standing at the eave level, framing the bare timber fermette structure rising from the wall plate to the ridge',
        scene_framing: {
          work_pct:   60,
          foreground: 'timber wall plate at the eave level — rafter feet seated on the plate',
          midground:  'fermette structure — diagonal rafters rising to the ridge, collar ties visible across the span',
          background: 'ridge board at the apex, sky or gable wall beyond',
        },
        scene_debris:  'timber offcuts at the eave base, nail packaging on the scaffold board',
        scene_exclude: ['tiles going on', 'finished roof surface', 'moss or old tiles', 'moss treatment equipment'],
        tools: [
          'claw hammer and nail bar on the scaffold board beside the rafter toe',
          'chalk line drum on the wall plate for alignment',
        ],
        protections: [
          'scaffold platform at the working level',
          'debris netting below',
        ],
        chantier_details: [
          'bare timber fermette structure — rafters pale and raw, still unweathered',
          'collar ties visible across the rafter pairs — structural bracing in place',
          'ridge board at the apex — fermettes bearing onto it at the top',
        ],
      },
      {
        _for:          'charpente|ferme|fermette|structure.*toit|isolation.*comble|comble',
        scene_note:    'first eave battens going on a freshly erected timber frame — nail gun fixing the first batten across the rafter tops before the tile courses begin',
        scene_camera:  'on the rafter surface, framing the first batten being nailed across the rafter tops from the eave upward',
        scene_framing: {
          work_pct:   65,
          foreground: 'first eave batten being nailed to the rafter tops — fresh sawn timber, nail gun in use',
          midground:  'rafter surface above — bare, awaiting the next batten rows',
          background: 'ridge board at the top, fermette structure visible below',
        },
        scene_debris:  'batten off-cut on the scaffold board, nail gun hose running to the compressor below',
        scene_exclude: ['tiles going on', 'finished roof surface', 'old tiles stripped'],
        tools: [
          'nail gun fixing the first eave batten to the rafter tops',
          'measuring tape for batten gauge spacing',
          'stack of new sawn battens on the scaffold board ready for nailing',
        ],
        protections: [
          'scaffold platform as the working surface',
        ],
        chantier_details: [
          'first batten nailed across the rafter tops at the eave position',
          'raw timber rafters above waiting for the batten rows',
          'nail gun compressor hose coiled on the scaffold board',
        ],
      },

      // --- faîtage ---
      {
        _for:          'faitage|faite|faitier|faitiere',
        scene_note:    'old ridge tiles being broken off for replacement — bolster chisel and lump hammer at the old mortar joint, old ridge tile being lifted off the broken bed',
        scene_camera:  'close-up at the ridge line, framing the bolster and hammer at the mortar joint of the old ridge tile',
        scene_framing: {
          work_pct:   70,
          foreground: 'bolster chisel at the old ridge tile mortar joint — hammer striking the bolster to break the mortar',
          midground:  'old ridge tiles beside the repair zone — mortar-encrusted bases exposed where tiles already removed',
          background: 'ridge line of the roof, both slopes visible below',
        },
        scene_debris:  'old mortar fragments on the top tiles either side of the ridge, old ridge tile pieces on the scaffold beside the ridge',
        scene_exclude: ['fresh mortar applied', 'new tiles on slopes', 'moss treatment equipment'],
        tools: [
          'bolster chisel and lump hammer breaking the old ridge tile mortar joint',
        ],
        protections: [
          'safety goggles beside the lump hammer',
          'roof ladder hooked over the ridge for access',
        ],
        chantier_details: [
          'old mortar joint being broken — mortar fragments on the tile surface around the impact',
          'old ridge tile mortar-encrusted base visible where adjacent tiles already removed',
          'bolster impact marks in the old mortar — progressive breaking along the ridge',
        ],
      },
      {
        _for:          'faitage|faite|faitier|faitiere',
        scene_note:    'new mortar bed being applied along the ridge for new ridge tiles — trowel spreading fresh mortar across the top tile course on both sides of the apex',
        scene_camera:  'close-up at the ridge, framing the trowel spreading fresh mortar across the apex — mortar bed building on the top tiles',
        scene_framing: {
          work_pct:   70,
          foreground: 'trowel spreading fresh grey mortar across the top tile course at the ridge apex',
          midground:  'mortar bed growing along the ridge line — several tiles\' worth already laid',
          background: 'both roof slopes visible below the ridge line',
        },
        scene_debris:  'mortar splashes on the top tiles around the trowel work',
        scene_exclude: ['old ridge tile removal', 'new tiles on slope', 'moss treatment'],
        tools: [
          'brick trowel spreading fresh mortar along the ridge apex',
          'mortar bucket at the ridge side — fresh mix in the bucket',
        ],
        protections: [
          'roof ladder at the side for ridge access',
        ],
        chantier_details: [
          'fresh grey mortar bed being spread on both top tile courses at the apex',
          'mortar bed building progressively along the ridge length',
          'mortar splashes on the top tiles around the trowel work area',
        ],
      },
      {
        _for:          'faitage|faite|faitier|faitiere',
        scene_note:    'new ridge tile being bedded and tapped into the fresh mortar — rubber mallet tapping the ridge tile level, mortar squeezing from beneath both sides',
        scene_camera:  'close-up at the ridge, framing the rubber mallet tapping the new ridge tile level with mortar squeezing from beneath',
        scene_framing: {
          work_pct:   75,
          foreground: 'rubber mallet tapping a new ridge tile down into the fresh mortar bed — mortar squeezing from both sides beneath the tile',
          midground:  'completed ridge section behind the active point — neatly pointed mortar on both sides',
          background: 'ridge line continuing, roof slopes below',
        },
        scene_debris:  'excess mortar on the top tiles beside the newly bedded ridge tile',
        scene_exclude: ['old tile removal', 'ridge demolition', 'moss treatment'],
        tools: [
          'rubber mallet tapping the new ridge tile into the mortar bed',
          'pointing trowel to flush the mortar either side after bedding',
        ],
        protections: [
          'roof ladder beside the active ridge section',
        ],
        chantier_details: [
          'rubber mallet impact on the ridge tile — tile being driven into the mortar bed',
          'mortar squeezing from both sides of the ridge tile base as it is tapped level',
          'completed ridge section behind — mortar pointed and flushed neatly on both sides',
        ],
      },

      // --- zinguerie / solins / métallerie toiture ---
      {
        _for:          'zinguerie|zinc|solin|larmier|noue.*zinc|bavette.*zinc',
        scene_note:    'zinc sheet being cut to length on the scaffold — tin snips cutting through flat zinc sheet, scored fold lines marked with a marker pen',
        scene_camera:  'close-up on the scaffold board, framing the tin snips cutting through the zinc sheet with fold marks visible beside the cut line',
        scene_framing: {
          work_pct:   70,
          foreground: 'tin snips cutting through a flat zinc sheet — cut edge turning up on one side',
          midground:  'zinc sheet on the scaffold board — fold lines marked with marker pen, some sections already bent',
          background: 'scaffold board surface, house wall visible beyond',
        },
        scene_debris:  'zinc strip offcut curling beside the cut point, marker pen cap on the scaffold board',
        scene_exclude: ['tiles going on', 'moss treatment', 'gutter cleaning', 'concrete mixer'],
        tools: [
          'tin snips cutting through a flat zinc sheet',
          'marker pen on the scaffold board beside the fold marks',
        ],
        protections: [
          'heavy-duty work gloves beside the zinc sheet — zinc edges sharp',
        ],
        chantier_details: [
          'tin snips cutting through the zinc sheet — cut edge with slight turn-up visible',
          'fold lines marked in marker pen across the zinc sheet beside the cut',
          'zinc offcut strip curling on the scaffold board after trimming',
        ],
      },
      {
        _for:          'zinguerie|zinc|solin|larmier|noue.*zinc|bavette.*zinc',
        scene_note:    'lead flashing being dressed at a chimney abutment — lead dresser forming the malleable lead into the brick joint, top edge going into a raked-out mortar joint',
        scene_camera:  'close-up at the chimney-roof junction, framing the lead dresser being used to press the lead into the brick abutment joint',
        scene_framing: {
          work_pct:   70,
          foreground: 'lead dresser forming the malleable lead into the brick abutment joint at the chimney base',
          midground:  'lead apron and soaker visible at the chimney base — dressed and bedded on both sides',
          background: 'chimney stack above, roof tiles either side of the abutment',
        },
        scene_debris:  'old lead offcuts on the roof tiles beside the chimney, mortar dust from the raked-out joint on the brick face',
        scene_exclude: ['moss treatment', 'gutter cleaning', 'tile stripping', 'new tile coursing'],
        tools: [
          'lead dresser forming the malleable lead flashing into the brick joint',
          'cold chisel for raking out the old mortar joint above the lead edge',
        ],
        protections: [
          'heavy gloves beside the lead dresser',
          'roof ladder hooked over the ridge for chimney access',
        ],
        chantier_details: [
          'lead being dressed into the brick abutment joint — malleable material conforming to the brick face',
          'top lead edge going into the raked-out mortar course — will be pointed after dressing',
          'old mortar dust on the brick face from the raked-out joint beside the new lead edge',
        ],
      },
      {
        _for:          'zinguerie|zinc|solin|larmier|noue.*zinc|bavette.*zinc',
        scene_note:    'solin mortar joint being re-pointed at a wall abutment — fresh mortar being applied to the wall-tile junction with a pointing trowel',
        scene_camera:  'close-up at the wall-to-tile junction, framing the pointing trowel applying fresh mortar to the solin joint',
        scene_framing: {
          work_pct:   70,
          foreground: 'pointing trowel applying fresh mortar to the solin joint at the wall-tile abutment — mortar bead building along the junction',
          midground:  'wall face beside the roof tiles — old weathered solin visible where not yet re-pointed',
          background: 'roof tiles, wall continuing above the junction',
        },
        scene_debris:  'old mortar fragments from the raked-out joint on the tile surface below the solin',
        scene_exclude: ['zinc cutting', 'lead dresser at chimney', 'tile stripping', 'moss treatment'],
        tools: [
          'pointing trowel applying fresh mortar to the solin joint',
          'mortar bucket at the roof access platform',
          'cold chisel for raking out the old solin before re-pointing',
        ],
        protections: [
          'roof ladder for access to the wall junction',
        ],
        chantier_details: [
          'fresh mortar bead building along the solin joint — bright white against the weathered tile and wall',
          'old solin mortar — cracked and recessed — visible beside the fresh re-pointed section',
          'old mortar fragments on the tile surface below from the raking-out process',
        ],
      },
    ],
    tools: [
      'palettes of terracotta roof tiles stacked near the base of the house',
      'bags of roofing mortar stacked beside the wall',
      'roll of roofing underlayer membrane leaning against the facade',
      'ridge tile pieces grouped on a wooden delivery pallet',
      'aluminium flashing strips stacked flat near the house base',
      'chalk line reel resting on top of the tile palette',
    ],
    protections: [
      'heavy tarp spread on the garden below to catch fallen debris',
      'plastic sheet protecting the garden shrubs below the roof edge',
      'wooden boards bridging the flower bed to protect plants from foot traffic',
    ],
    chantier_details: [
      'tile offcuts in a loose pile near the base of the facade',
      'empty mortar bag folded and left against the house base',
      'cardboard tile packaging flattened on the driveway beside the pallet',
      'delivery pallet at the edge of the driveway',
      'chalk reference marks on the visible part of the gable wall',
    ],
  },

  nettoyage_toiture: {
    scenarios: [

      // --- démoussage / brossage manuel / nettoyage toiture ---
      // TWO WORKERS required. Worker 1 on secured hooked roof ladder or scaffold. Worker 2 at access foot.
      {
        _for:          'demoussa|mousse.*toit|nettoy.*mousse|brossage|nettoyage.*toit',
        scene_note:    'manual moss scraping from a pitched roof — two professionals: Worker 1 on a secured hooked roof ladder following the slope (hooks over the ridge, connected fall-arrest harness visible) using a long-handled stiff broom to sweep thick green moss off the mossy tiles — Worker 2 at the foot of the access ladder managing the tarp and debris collection from a safe position — debris falling onto the protective tarp below the eave — photo from the garden, slightly imperfect framing',
        scene_camera:  'ordinary homeowner smartphone standing back from the house, 8–15 m away, framing the full roof slope with both workers visible — Worker 1 on the secured roof ladder, Worker 2 near the access foot',
        scene_framing: {
          work_pct:   65,
          foreground: 'protective tarp below the eave catching wet moss clumps — Worker 2 near the tarp and access ladder foot, managing debris, not directly under the falling moss zone',
          midground:  'pitched roof — Worker 1 on secured hooked roof ladder, harness and lanyard visible — one section scraped to bare tile, adjacent section still thick with green moss',
          background: 'house wall, surrounding garden or driveway below the eave',
        },
        scene_debris:  'wet green moss clumps on the tarp below, loose moss fragments on the lower tile courses',
        scene_exclude: [
          'chemical sprayer lance', 'pressure washing jet', 'new tiles being laid', 'concrete mixer',
          'single worker performing active roof scraping alone',
          'worker freely standing on mossy tiles without secured access',
        ],
        tools: [
          'secured hooked roof ladder following the slope — hooks over the ridge, NOT resting on the gutter',
          'fall-arrest harness on Worker 1 — lanyard visibly connected to ridge anchor',
          'long-handled stiff nylon broom in Worker 1\'s hands swept across the mossy tiles',
          'heavy protective tarp fixed under the eave edge collecting moss debris',
        ],
        protections: [
          'secured hooked roof ladder with hooks over ridge — Worker 1\'s safe access',
          'fall-arrest harness and connected lanyard on Worker 1 — visible from customer viewpoint',
          'heavy tarp fixed under the eave to catch moss runoff and debris',
          'plastic sheet over garden shrubs directly below the scraping zone',
          'Worker 2 outside the falling-debris zone',
        ],
        chantier_details: [
          'thick green moss layer — clearly biological buildup visible on tile surface',
          'scraped section of bare terracotta tiles contrasting with the still-mossy area',
          'wet moss clumps accumulating on the tarp below the eave',
          'Worker 1 working from secured roof ladder — NOT standing freely on mossy tiles',
        ],
      },
      {
        _for:          'demoussa|mousse.*toit|nettoy.*mousse|brossage',
        scene_note:    'close-up work on a secured roof ladder — Worker 1 positioned on a hooked roof ladder with connected harness using a hand scraper to lift a thick moss pad from the tile surface — bare tile visible where already cleared — secured position, not standing freely on the roof',
        scene_camera:  'slightly close-up from customer viewpoint showing the worker on the roof ladder and the tile surface — roof ladder hooks at top of frame, harness lanyard visible',
        scene_framing: {
          work_pct:   75,
          foreground: 'roof ladder rungs and bracket at the lower edge — ladder following the tile slope, hooks securing it at the top off-frame',
          midground:  'Worker 1 on the secured roof ladder, hand scraper drawing a thick moss pad from the tile surface — surrounding tiles: mix of already-scraped bare terracotta and still moss-covered',
          background: 'roof slope continuing, tile courses below, garden visible at the base',
        },
        scene_debris:  'moss pad piece beside the scraped tile, damp stain circle on the cleared tile surface',
        scene_exclude: [
          'chemical sprayer', 'pressure lance', 'new tiles', 'concrete mixer',
          'worker standing freely on the mossy roof surface without secured ladder',
          'single worker with no second worker visible',
        ],
        tools: [
          'secured hooked roof ladder following the slope — Worker 1\'s safe platform',
          'fall-arrest harness on Worker 1 — lanyard visible',
          'hand scraper drawing a thick moss pad from the tile surface',
          'small handheld brush sweeping moss residue off cleared tiles',
        ],
        protections: [
          'secured hooked roof ladder with hooks over ridge — Worker 1\'s safe access route',
          'connected harness lanyard on Worker 1',
        ],
        chantier_details: [
          'thick moss pad being lifted intact — underside and rhizoid roots clearly visible',
          'bare tile below — original terracotta colour recovered after moss removal',
          'stain outline on the tile where the moss has sat for years',
          'Worker 1 using the roof ladder as a safe working platform, not standing freely on the slope',
        ],
      },
      {
        _for:          'demoussa|mousse.*toit|nettoy.*mousse|brossage',
        scene_note:    'half-scraped roof — left half already cleared to bare tiles, right half still thick with green moss — two professionals visible: Worker 1 on secured hooked roof ladder at the active work line, Worker 2 near the tarp at the ladder foot managing debris — sharp demarcation line visible across the slope from customer viewpoint in the garden or driveway',
        scene_camera:  'ordinary homeowner smartphone standing back from the house, framing the full roof width with cleared vs. mossy division clearly visible — both workers visible at their respective positions',
        scene_framing: {
          work_pct:   50,
          foreground: 'tarp below the eave loaded with wet moss debris — Worker 2 near the ladder foot managing the tarp, outside the falling-debris zone',
          midground:  'full roof pitch — left half scraped bare, right half still green — Worker 1 on secured roof ladder at the division line, harness visible — division line sharp',
          background: 'sky beyond the ridge, house wall beside the cleared section',
        },
        scene_debris:  'large pile of wet moss on the tarp below, loose fragments near the division line on the cleared side',
        scene_exclude: [
          'chemical sprayer', 'pressure lance', 'new tiles',
          'single worker at the division line alone',
          'worker freely standing on mossy section without secured ladder',
        ],
        tools: [
          'secured hooked roof ladder at the division line — Worker 1\'s position',
          'fall-arrest harness on Worker 1 — lanyard visible',
          'long-handled broom resting on the roof ladder at the active work line',
        ],
        protections: [
          'secured hooked roof ladder following the slope — Worker 1 safe at the work line',
          'connected harness lanyard on Worker 1',
          'heavy tarp below the eave — visibly loaded with scraped moss debris',
          'Worker 2 managing tarp outside the falling-debris zone',
        ],
        chantier_details: [
          'sharp division line across the roof — bare terracotta on one side, thick green moss on the other',
          'tile colour recovery clearly visible on the cleared side',
          'moss debris accumulation on the tarp below quantifying work completed',
          'two professionals with distinct roles: Worker 1 scraping from secured ladder, Worker 2 managing debris at foot',
        ],
      },

      // --- traitement hydrofuge ---
      // VISUALLY DISTINCT from anti-mousse: roof already clean, no moss as subject.
      // Subtle wet/satiny difference between treated and untreated tiles — NOT a dramatic color change.
      // Camera: ordinary homeowner smartphone from garden/driveway (NOT contractor POV, NOT from roof).
      // TWO WORKERS: Worker 1 on secured elevated access applying product; Worker 2 at access foot.
      {
        _for:          'hydrofuge|traitement.*hydrofuge',
        scene_note:    'homeowner smartphone photo of hydrofuge waterproofing treatment being applied to an already-clean pitched roof — two professionals visible: Worker 1 on a secured hooked roof ladder following the slope (hooks over the ridge, connected fall-arrest harness with lanyard leading to a ridge anchor) applying product with a lance, Worker 2 at the foot of the access ladder managing the product hose — small area of tiles slightly darker and more satiny where hydrofuge has been applied — difference is subtle, like slightly damp stone — no moss, no dramatic colour change — photo taken from the garden or driveway while work is in progress',
        scene_camera:  'ordinary homeowner smartphone from the garden or driveway, 8–15 m from the house, looking up at the roof — mild digital zoom, slightly imperfect framing — workers naturally off-centre and not facing the camera — customer-accessible ground-level viewpoint — enough of the safety setup visible to confirm elevated access and protection',
        scene_framing: {
          work_pct:   60,
          foreground: 'garden, driveway or path at the foot of the house — Worker 2 near the ladder base managing the product hose, protective tarp visible at the eave edge — Worker 2 not directly below falling material',
          midground:  'pitched roof slope — Worker 1 on secured hooked roof ladder, harness lanyard visible leading toward the ridge anchor — tiles clean and naturally aged, small area visibly slightly more satiny where hydrofuge has been applied, irregular passage, not a straight line — bottom of access ladder and standoff visible beside the facade',
          background: 'ridge line, pale sky above, chimney or neighbouring rooftops',
        },
        scene_debris:  'hydrofuge runoff in the tarp fold below the eave — no moss, no scraped material',
        scene_exclude: [
          'thick green moss on the tile surface', 'stiff broom scraping',
          'pressure washing jet', 'new tiles', 'concrete mixer',
          'dramatic black-to-orange tile colour change', 'perfect vertical or horizontal split',
          'exactly half treated half untreated', 'strongly contrasting wet versus dry sections',
          'uniform dark saturation across the entire roof',
          'single worker performing active roof work alone',
          'worker freely standing on pitched tiles without visible fall protection',
          'worker on roof with no secured access equipment visible',
          'backpack sprayer as sole apparent safety equipment with no harness or anchor visible',
          'camera beside the contractor on the roof', 'camera from the roof surface',
          'contractor facing the camera', 'centred promotional composition',
          'educational before-and-after split', 'oversized tarp covering the whole house facade',
          'no logo', 'no watermark', 'no readable company branding',
        ],
        tools: [
          'secured hooked roof ladder following the slope — hooks clearly over the ridge, NOT resting on the gutter',
          'fall-arrest harness on Worker 1 — lanyard visibly connected to ridge anchor or certified roof anchor',
          'low-pressure lance in Worker 1\'s hands moving across the clean tile surface',
          'product hose trailing from Worker 1 down to Worker 2 at the ladder base',
        ],
        protections: [
          'secured hooked roof ladder with hooks over the ridge — Worker 1\'s safe access route',
          'fall-arrest harness and connected lanyard clearly visible on Worker 1',
          'protective tarp below the eave collecting hydrofuge runoff',
          'plastic sheet covering garden plants below the treatment zone',
          'Worker 2 positioned at ladder foot, outside the falling-material zone',
        ],
        chantier_details: [
          'tile surface clean and naturally aged before application — no heavy moss or growth',
          'small irregular zone slightly more satiny or barely darker where product has been applied — subtle, not dramatic',
          'treatment following Worker 1\'s movement across the slope — overlapping irregular passes, not a straight dividing line',
          'safety equipment visible from customer viewpoint: roof ladder hooks at ridge, harness lanyard, Worker 2 at foot',
        ],
      },
      {
        _for:          'hydrofuge|traitement.*hydrofuge',
        scene_note:    'homeowner photo from an upstairs window or adjacent terrace looking down at the clean roof during hydrofuge application — two professionals visible from above: Worker 1 on a secured hooked roof ladder applying product, Worker 1\'s harness and lanyard visible leading to ridge anchor — Worker 2 visible near the ladder base managing the hose — small zone of tiles slightly damp or satiny where product has passed — photo slightly cropped, part of window frame or balcony railing at the edge',
        scene_camera:  'homeowner looking down from an upstairs window, balcony or adjacent elevated terrace — slightly downward angle, mild digital zoom, part of window frame or railing may appear at the image border — workers below and off-centre, not facing the camera',
        scene_framing: {
          work_pct:   65,
          foreground: 'slight window sill or balcony railing edge at the image border',
          midground:  'clean roof surface below — Worker 1 on secured roof ladder, harness visible, applying product across the clean naturally aged tiles — Worker 2 visible at the access foot managing the product hose — overlapping irregular damp patches across the treated zone',
          background: 'garden, street or neighbouring rooftops beyond the ridge',
        },
        scene_debris:  'hydrofuge rivulets running down clean tile grooves — no moss, no scraped material',
        scene_exclude: [
          'stiff broom scraping', 'pressure lance jet producing water mist', 'new tiles',
          'moss on tiles', 'green biological growth as main subject',
          'dramatic wet-versus-dry colour division', 'perfect stripe of dark tiles beside pale tiles',
          'uniformly black or uniformly bright-orange roof',
          'single worker with no second worker visible',
          'worker freely standing on pitched tiles without visible protection',
          'camera beside the contractor', 'drone view',
          'contractor centred and facing camera',
        ],
        tools: [
          'secured hooked roof ladder — hooks over the ridge visible from above',
          'fall-arrest harness and lanyard on Worker 1 — visible from the elevated customer viewpoint',
          'short to medium lance in Worker 1\'s hands directing product across the clean tile surface',
          'product hose trailing to Worker 2 at ladder foot',
        ],
        protections: [
          'secured roof ladder hooks over ridge — visible from above',
          'connected harness lanyard on Worker 1 — visible thin line leading to ridge',
          'tarp or garden sheet visible at the eave edge below',
          'Worker 2 at ladder foot, outside falling-material zone',
        ],
        chantier_details: [
          'tile surface uniformly clean — ordinary natural ageing and slight colour variation between tiles',
          'overlapping irregular damp patches from successive spray passes — following Worker 1\'s movement, not a straight line',
          'subtle satiny difference between just-treated tiles and dry tiles nearby — not a recoloring',
          'safety setup visible from above: roof ladder hooks, harness lanyard, two workers with distinct roles',
        ],
      },
      {
        _for:          'hydrofuge|traitement.*hydrofuge',
        scene_note:    'homeowner photo from the garden after hydrofuge application is complete — two professionals packing up: Worker 1 descending the secured roof ladder, Worker 2 gathering the hose at the house base — the clean roof looks essentially the same colour as before, with just a subtle even dampness — no dramatic colour change',
        scene_camera:  'ordinary homeowner smartphone from the garden or driveway, 8–12 m from the house, looking up at the roof — mild digital zoom, slightly imperfect framing, both workers visible at the house',
        scene_framing: {
          work_pct:   45,
          foreground: 'garden or driveway at the foot of the house — Worker 2 packing away the hose and product container at the house base, tarp being gathered',
          midground:  'secured roof ladder still on slope — Worker 1 descending or at the eave level — full pitched roof slope visible with tiles clean and naturally aged, very slight even dampness drying across the surface',
          background: 'ridge line, sky above, chimney or garden trees',
        },
        scene_debris:  'hydrofuge pooling lightly in the tarp folds below the eave — no moss debris, no scraping residue',
        scene_exclude: [
          'stiff broom scraping', 'pressure lance jet', 'new tiles', 'moss on tiles',
          'uniformly dark saturated roof', 'dramatic colour transformation',
          'perfectly bright-orange tiles after treatment', 'black roof turned vivid colour',
          'strong contrast between treated and untreated half',
          'single worker packing up alone',
          'camera from roof level', 'contractor facing camera',
          'educational before-and-after composition', 'contractor promotional photograph',
        ],
        tools: [
          'secured hooked roof ladder still on slope — Workers finishing pack-down',
          'hose and product container being packed away at the house base',
        ],
        protections: [
          'roof ladder still visible on slope — safely rigged until pack-down complete',
          'tarp lightly wet with runoff below the eave — being gathered up',
          'plastic sheet over nearby shrubs still in place',
        ],
        chantier_details: [
          'roof clean and essentially the same colour as a clean dry roof — no dramatic transformation',
          'uniform application visible as a very slight even dampness drying slowly across the surface',
          'two professionals visible in the pack-down phase — professional team completing the job',
        ],
      },

      // --- traitement anti-mousse biocide ---
      // VISUALLY DISTINCT from hydrofuge: roof still visibly covered with moss/lichen,
      // localized irregular damp patch around the nozzle — moss remains the dominant subject.
      // Camera: ordinary homeowner smartphone from garden/driveway (NOT beside the roofer, NOT from roof).
      // TWO WORKERS: Worker 1 on SECURED ELEVATED ACCESS (NOT freely on mossy tiles); Worker 2 at access foot.
      // Worker 1 MUST NOT stand freely on wet moss-covered tiles — this is the safety violation pattern.
      {
        _for:          'anti.mousse',
        scene_note:    'homeowner smartphone photo of anti-moss biocide being applied to a pitched roof still heavily covered in green and black moss — two professionals visible: Worker 1 positioned on a secured hooked roof ladder following the slope (hooks over the ridge, NOT resting on gutter) with fall-arrest harness and connected lanyard, directing a lance at the mossy tiles from the secured ladder — Worker 1 is NOT standing freely on the mossy surface — Worker 2 at the ladder foot managing the product hose — moss clearly still present as the dominant subject, small irregular damp patch visible around the nozzle — photo from the garden or driveway, slightly imperfect framing',
        scene_camera:  'ordinary homeowner smartphone from the garden or driveway, 8–15 m from the house, looking up at the mossy roof — mild digital zoom, slightly imperfect framing — workers naturally off-centre and not facing the camera — enough of the safety setup visible to confirm elevated access and protection',
        scene_framing: {
          work_pct:   55,
          foreground: 'garden, driveway or path at the foot of the house — Worker 2 near the ladder base managing the product hose, protective tarp visible at the eave edge — Worker 2 not directly below falling material',
          midground:  'pitched roof slope still dominated by green and black moss — Worker 1 on secured hooked roof ladder (hooks over ridge visible), harness lanyard visible — lance directing biocide at the mossy tiles, small irregular damp patch around the active nozzle, moss clearly present',
          background: 'ridge line, sky, neighbouring rooftops or trees',
        },
        scene_debris:  'no scraped moss on the tarp — moss still firmly attached to tiles, only slight biocide drips on the lower tarp fold',
        scene_exclude: [
          'worker standing directly on wet moss-covered tiles without secured access',
          'worker walking freely across contaminated mossy tiles',
          'single worker performing active roof work alone',
          'backpack sprayer as sole apparent safety equipment with no harness or anchor visible',
          'worker on mossy roof without connected fall arrest',
          'clean roof tiles', 'instant moss disappearance', 'perfectly clean strip beside dirty strip',
          'straight clean-versus-dirty boundary', 'dramatically bleached section',
          'white chemical coating covering the moss', 'uniform impregnation sweep',
          'tiles cleared of moss before treatment', 'stiff broom scraping',
          'pressure washing', 'new tiles',
          'camera from the roof surface', 'camera beside the roofer',
          'contractor facing the camera', 'contractor centred in the frame',
          'contractor promotional photograph', 'stock-photo composition',
          'educational before-and-after split', 'oversized tarp dominating the whole image',
        ],
        tools: [
          'secured hooked roof ladder following the slope — hooks clearly over the ridge, NOT resting on the gutter',
          'fall-arrest harness on Worker 1 — lanyard visibly connected to ridge anchor or certified roof anchor',
          'lance in Worker 1\'s hands directing biocide at the mossy tile surface from the secured ladder',
          'product hose trailing from Worker 1 down to Worker 2 at the ladder base',
        ],
        protections: [
          'secured hooked roof ladder with hooks over the ridge — Worker 1\'s safe access, NOT standing on mossy tiles',
          'fall-arrest harness and connected lanyard clearly visible on Worker 1',
          'protective tarp visible below the eave edge at the base of the house',
          'Worker 2 at ladder foot outside the falling-material zone',
        ],
        chantier_details: [
          'green and black moss/lichen still covering the full roof surface — dominant visual texture',
          'small irregular damp zone visible around the active nozzle — feathered and uneven, not a clean strip',
          'moss clearly still intact in and around the treated zone — treatment takes days to weeks to act',
          'Worker 1 applying from secured roof ladder — NOT standing freely on the mossy surface',
          'safety equipment visible from customer viewpoint: roof ladder hooks at ridge, harness lanyard, Worker 2 at foot',
        ],
      },
      {
        _for:          'anti.mousse',
        scene_note:    'homeowner photo from an upstairs window or adjacent balcony looking down at the mossy roof while anti-moss treatment is being applied — two professionals visible from above: Worker 1 on a secured hooked roof ladder (hooks over ridge visible from above) applying product with a lance, harness lanyard visible leading to ridge anchor — Worker 1 NOT standing freely on the mossy surface — Worker 2 visible near the ladder base managing the hose — mossy surface clearly dominant, overlapping irregular damp patches',
        scene_camera:  'homeowner looking down from an upstairs window, balcony or adjacent terrace — slightly downward angle, mild digital zoom, part of the window frame or balcony railing may appear at the edge of the frame — workers below and off-centre, not facing the camera',
        scene_framing: {
          work_pct:   65,
          foreground: 'slight window sill, balcony railing edge or part of a doorframe at the image border — customer shooting from an accessible elevated position',
          midground:  'mossy roof surface below — thick green and black biological growth across the tiles — Worker 1 visible on secured roof ladder, harness lanyard leading to ridge anchor, lance directing biocide at mossy tiles — Worker 2 visible at the ladder foot managing the hose — overlapping irregular damp patches where biocide has been applied',
          background: 'garden, driveway or street visible beyond the roofline',
        },
        scene_debris:  'no scraped debris — moss still attached, biocide drips forming soft irregular wet marks on the moss surface',
        scene_exclude: [
          'worker standing directly on wet moss-covered tiles without secured access',
          'single worker performing active roof treatment alone',
          'worker with no visible fall protection on the mossy roof',
          'bare clean tiles under the spray', 'instant moss removal', 'perfectly scraped moss pile',
          'straight clean-versus-dirty boundary', 'pressure washing jet',
          'broom or scraper as main tool', 'moss-free tiles in treated zone',
          'camera positioned from the roof surface', 'drone view',
          'contractor looking at the camera', 'centred promotional composition',
        ],
        tools: [
          'secured hooked roof ladder — hooks over the ridge visible from above',
          'fall-arrest harness and lanyard on Worker 1 — visible from the elevated customer viewpoint',
          'lance in Worker 1\'s hands directing product at the mossy tiles — from the secured ladder',
          'product hose trailing to Worker 2 at ladder foot',
        ],
        protections: [
          'secured roof ladder hooks over ridge — visible from above',
          'connected harness lanyard on Worker 1 — visible thin line leading to ridge',
          'tarp partially visible at the eave edge below the treatment zone',
          'Worker 2 at ladder foot outside the falling-debris zone',
        ],
        chantier_details: [
          'moss pad surface clearly visible from above — thick green/black biological layer on the tile face',
          'overlapping irregular damp patches from successive spray passes — not a straight line',
          'moss still attached on and around each damp patch — no instant clearing effect',
          'safety setup visible from above: roof ladder hooks, harness lanyard, two workers with distinct roles',
        ],
      },
      {
        _for:          'anti.mousse',
        scene_note:    'homeowner photo from the garden or driveway of the roof immediately after anti-moss biocide application — roof still covered with moss and lichen — two professionals beginning pack-down: Worker 1 descending the secured roof ladder, Worker 2 gathering the hose and product container at the house base — roof looks slightly darker and damp in scattered patches — moss remains the dominant texture',
        scene_camera:  'ordinary homeowner smartphone from the garden or driveway, 8–12 m from the house, slightly looking up at the roof — mild digital zoom, slightly imperfect angle — customer-accessible ground-level viewpoint',
        scene_framing: {
          work_pct:   40,
          foreground: 'garden path, driveway or lawn at the foot of the house — Worker 2 gathering hose and product container at the house base — tarp visible at the eave edge',
          midground:  'secured hooked roof ladder still on slope — Worker 1 descending or at the eave level — full pitched roof slope still covered with moss, scattered irregular damp patches from biocide application',
          background: 'ridge line, pale sky, neighbouring trees or fence',
        },
        scene_debris:  'light biocide drips on the tarp fold below the eave — no scraped moss pile, no mechanical debris',
        scene_exclude: [
          'worker freely standing on mossy tiles during pack-down',
          'single worker packing up alone',
          'scraped moss pile on tarp', 'clean restored tile colour', 'dramatic black-to-orange colour shift',
          'uniform hydrofuge sheen without moss', 'perfectly clean half of the roof',
          'straight wet-versus-dry boundary', 'broom or scraper', 'pressure washing',
          'camera from roof level', 'contractor centred and facing camera',
          'contractor promotional photograph', 'educational split composition',
          'oversized protective tarps covering the whole house facade',
        ],
        tools: [
          'secured hooked roof ladder still on slope during pack-down',
          'product hose and container being packed away at the house base',
        ],
        protections: [
          'roof ladder still visible on slope — safely rigged until pack-down complete',
          'tarp visible below the eave edge — lightly wet with runoff, no heavy moss load',
          'plastic sheet protecting nearby garden shrubs or flower beds',
        ],
        chantier_details: [
          'roof still fully mossy — green and black biological growth dominant across the full surface',
          'scattered irregular damp patches across the slope — no clean-versus-dirty boundary',
          'treatment freshly applied — moss still intact, will die gradually over the coming days',
          'two professionals visible in pack-down phase — Worker 1 on ladder, Worker 2 at ground',
        ],
      },

      // Fallback: general view
      {
        scene_note:    'roof cleaning or treatment in progress — general view of a mossy pitched residential roof with treatment equipment visible at the eave',
        scene_camera:  'standing back from the house, framing the full roof slope with visible moss and treatment equipment at the eave',
        scene_framing: {
          work_pct:   45,
          foreground: 'protective tarp fixed below the eave, sprayer or brush equipment at the base of the house wall',
          midground:  'pitched roof — heavily mossy tiles, green biological growth across the surface',
          background: 'ridge line, sky above, garden or driveway below the eave',
        },
        scene_debris:  'light moss debris at the tarp edge from the beginning of work',
        scene_exclude: ['new tiles being laid', 'concrete mixer', 'scaffolding tower', 'pressure lance jet'],
        tools: [
          'backpack chemical sprayer with telescopic lance resting against the wall',
          'soft-bristle roof brush laid flat on the driveway',
          'treatment pump container with hose coiled beside the house base',
        ],
        protections: [
          'heavy protective tarp fixed under the eave edge to collect moss runoff',
          'plastic sheet covering the garden shrubs below the treated section',
        ],
        chantier_details: [
          'heavy moss coverage across the roof surface — biological buildup clearly visible',
          'tarp positioned and ready at the eave line',
          'treatment equipment laid out at the base of the house',
        ],
      },
    ],
    tools: [
      'backpack chemical sprayer with telescopic lance resting against the wall',
      'soft-bristle roof brush laid flat on the driveway',
      'treatment pump container with hose coiled beside the house base',
      'empty treatment bucket with lid near the downpipe',
      'nozzle extension fitting resting on top of a folded tarp',
      'small measuring cup beside the treatment container',
    ],
    protections: [
      'heavy protective tarp fixed under the eave edge to collect moss runoff',
      'plastic sheet covering the garden shrubs below the treated section',
      'folded tarp weighted at the corners protecting a car or garden furniture nearby',
      'sandbag holding the tarp edge flat against the house base',
    ],
    chantier_details: [
      'small pile of wet dislodged moss on the driveway at the tarp edge',
      'small puddle of water in the tarp fold below the eave edge',
      'empty treatment container cap on the ground near the sprayer',
      'wet footprints on the concrete path leading away from the house',
      'faint grey moisture ring on the lower wall near the downpipe base',
    ],
  },

  nettoyage_gouttieres: {
    scenarios: [

      // --- nettoyage / entretien standard ---
      // Camera: ordinary homeowner smartphone from garden, driveway or upstairs window.
      // Access: extension ladder with VISIBLE STANDOFF STABILISER clear of the gutter. NO ground-level-only tool.
      // Ladder must NEVER rest against or inside the gutter channel.
      // TWO WORKERS required for active cleaning states.
      {
        _for:          'nettoy|entretien|curag|debris|feuill',
        scene_note:    'homeowner snapshot of gutter cleaning in progress — two professionals: Worker 1 on an extension ladder with a clearly visible standoff stabiliser (ladder arms resting on the wall below the eave, NOT on the gutter) using a gutter scoop to extract compacted leaf and moss debris — Worker 2 at the ladder base managing the debris bucket and supervising access from a safe position outside the falling-debris zone — photo taken from the garden or driveway, slightly imperfect framing',
        scene_camera:  'ordinary homeowner smartphone from the garden or driveway, 4–8 m from the house, looking up at the eave — mild digital zoom, slightly tilted horizon, workers visible but not centred or posing — customer-accessible ground-level viewpoint',
        scene_framing: {
          work_pct:   65,
          foreground: 'garden or driveway at the foot of the house — ladder base with rubber anti-slip feet, plastic bucket with leaf and moss debris beside Worker 2 — Worker 2 not directly under the trough extraction zone',
          midground:  'extension ladder with clearly visible standoff stabiliser (arms braced on wall just below the eave, gutter trough clear, NOT touching the gutter) — Worker 1 using a gutter scoop along the compacted debris in the trough',
          background: 'house facade and eave line continuing, naturally aged roof tiles at the top of frame, garden beyond',
        },
        scene_debris:  'wet compacted leaf and moss debris being extracted from the gutter, small pile building beside the bucket at the ladder base',
        scene_exclude: [
          'new gutter sections', 'drill and fascia brackets', 'pressure rodding equipment', 'concrete mixer',
          'ladder rails pressing directly against or inside the gutter channel',
          'ladder resting on the gutter without visible standoff stabiliser',
          'worker standing on the gutter trough', 'floating ladder without visible wall contact',
          'camera floating beside the gutter at roof level',
          'single worker performing active gutter work alone',
          'ground-level telescopic pole or gutter vacuum as the only access method',
          'worker facing the camera', 'worker centred in a promotional composition',
        ],
        tools: [
          'extension ladder with standoff stabiliser — arms braced on the wall below the eave, gutter trough clear and unobstructed',
          'plastic gutter scoop in Worker 1\'s hands working along the trough debris',
          'plastic bucket with wet leaf debris beside Worker 2 at the ladder base',
        ],
        protections: [
          'standoff stabiliser clearly showing ladder arms on the wall, NOT on the gutter',
          'ladder feet on firm flat ground — rubber anti-slip pads visible',
          'plastic sheet on the flower bed directly below the gutter run',
          'Worker 2 outside the zone where extracted debris may fall',
        ],
        chantier_details: [
          'gutter trough packed with compacted leaves and moss — clearly overflowing capacity',
          'standoff stabiliser clearly showing the ladder arms on the wall, not on the gutter',
          'Worker 2 managing the debris bucket at the ladder base — distinct role from Worker 1',
          'bucket at the ladder base progressively filling with extracted debris',
        ],
      },
      {
        _for:          'nettoy|entretien|curag|debris|feuill',
        scene_note:    'homeowner photo of gutter flush after cleaning — two professionals: Worker 1 on a ladder with standoff at the high end directing a hose into the cleared trough, Worker 2 at the downpipe base watching the flow and managing the hose on the ground — water running freely along the cleared trough toward the downpipe outlet — photo from the garden or driveway, slightly imperfect framing',
        scene_camera:  'ordinary homeowner smartphone from the garden or driveway, 4–8 m from the house, looking up at the eave and downpipe — slightly imperfect framing, mild digital zoom',
        scene_framing: {
          work_pct:   55,
          foreground: 'garden hose running along the ground to the house wall — Worker 2 at the downpipe base watching the flow, outside the falling-water zone',
          midground:  'extension ladder with standoff at the high end — Worker 1 directing hose water into the cleared gutter trough — water running along the bottom toward the downpipe, trough visibly clear',
          background: 'house facade, downpipe at the far end carrying water cleanly toward the ground drain',
        },
        scene_debris:  'small residual debris fragments being flushed out at the downpipe outlet, wet streak down the downpipe',
        scene_exclude: [
          'new gutter sections', 'drill and fascia brackets', 'gutter scoop still in use', 'compacted debris still in gutter',
          'ladder resting directly on the gutter channel without standoff',
          'single worker performing flush work alone',
          'camera floating at gutter level',
          'contractor facing the camera', 'centred promotional composition',
        ],
        tools: [
          'extension ladder with standoff at the high end — Worker 1\'s position',
          'garden hose with running water directed by Worker 1 into the cleared gutter',
        ],
        protections: [
          'standoff stabiliser on ladder — arms on wall, NOT on gutter',
          'plastic sheet on the garden bed below the downpipe outlet',
          'Worker 2 at the downpipe base, outside the falling-water zone',
        ],
        chantier_details: [
          'water running freely along the bottom of the cleaned gutter — trough clearly open',
          'downpipe carrying flush water cleanly to the drain below',
          'small debris flush visible at the downpipe outlet from residual gutter sediment',
          'two professionals: Worker 1 flushing at height, Worker 2 confirming flow at ground',
        ],
      },
      {
        _for:          'nettoy|entretien|curag|debris|feuill',
        scene_note:    'homeowner photo taken from an upstairs window looking down at the eave while the gutter is being cleaned — two professionals visible from above: Worker 1 on an extension ladder with clearly visible standoff stabiliser (arms on wall below eave, NOT on gutter) working along the trough with a gutter scoop — Worker 2 visible at the ladder base managing the debris bucket from outside the falling-debris zone — compacted debris in the uncleaned section, cleared section visible beside it — slight window frame or curtain at the photo border',
        scene_camera:  'homeowner looking down from an upstairs window — slightly downward angle, mild digital zoom, part of the window frame or sill may appear at the image border — workers below and naturally off-centre',
        scene_framing: {
          work_pct:   70,
          foreground: 'slight window sill or curtain edge at the image border — homeowner shooting from an accessible upstairs room',
          midground:  'gutter trough visible at the eave below — one section of compacted leaves and moss visible, adjacent section already cleared — Worker 1 on ladder with standoff stabiliser visible from above, using a gutter scoop — Worker 2 visible at the ladder base outside the falling-debris zone',
          background: 'garden or driveway below the eave, street or garden beyond the house boundary',
        },
        scene_debris:  'old dried sealant fragments or leaf debris at the cleared section edge — visible from above, small pile beside the bucket at the ladder base',
        scene_exclude: [
          'new gutter sections', 'drill and fascia brackets', 'compacted debris in already-cleared section',
          'ladder rails on or inside the gutter channel',
          'single worker performing gutter work alone',
          'telescopic ground pole or gutter vacuum from ground level as the only access method',
          'drone view', 'contractor facing the camera',
        ],
        tools: [
          'extension ladder with standoff stabiliser — arms on wall visible from above, gutter trough clear',
          'plastic gutter scoop in Worker 1\'s hands at the trough',
          'collection bucket at the ladder base beside Worker 2',
        ],
        protections: [
          'standoff stabiliser visible from above — arms braced on wall, NOT on gutter',
          'ladder feet on firm ground at the base — visible from the upstairs angle',
          'Worker 2 outside the zone where debris is falling from above',
        ],
        chantier_details: [
          'gutter trough visible from above — compacted leaf and moss debris clearly seen in uncleaned section',
          'already-cleared section beside it showing empty clean trough',
          'two professionals with distinct roles: Worker 1 on ladder scooping, Worker 2 at base managing debris',
        ],
      },

      // --- débouchage ---
      // Camera: ordinary homeowner smartphone from garden, driveway or upstairs window.
      // Downpipe clearance: Worker 1 feeds flexible rods from the downpipe BASE at ground level (acceptable —
      // the downpipe base IS at ground level). Worker 2 assists at ground level. NO ladder resting on gutter.
      // TWO WORKERS required.
      {
        _for:          'deboucha|bouchon|obstruct',
        scene_note:    'homeowner snapshot of blocked downpipe being cleared — two professionals at ground level: Worker 1 crouching at the downpipe base feeding flexible drainage rods upward — Worker 2 beside Worker 1 managing the rod sections and the plastic sheet — dark expelled debris and standing water visible at the drain outlet — photo from the garden or driveway, slightly imperfect framing',
        scene_camera:  'ordinary homeowner smartphone from the garden or driveway, 3–8 m from the house wall, framing the downpipe and both workers at ground level — slightly tilted horizon, mild digital zoom, workers not facing the camera',
        scene_framing: {
          work_pct:   70,
          foreground: 'plastic sheet on the ground at the downpipe base — expelled dark debris and silt — Worker 1 crouching at the pipe foot feeding rods upward, Worker 2 beside them managing rod sections',
          midground:  'downpipe running up the house wall — gutter trough visible at the top, standing water in the gutter at the blocked inlet',
          background: 'house facade, garden or path beside the downpipe run',
        },
        scene_debris:  'dark expelled debris plug at the downpipe base — compacted leaves, moss and silt visible on the plastic sheet',
        scene_exclude: [
          'new gutter sections', 'fascia brackets', 'hose flushing free-flowing pipe',
          'ladder resting on the gutter', 'ladder rails pressing into the gutter channel',
          'camera floating beside the gutter at roof level',
          'single worker performing debouchage alone',
          'contractor facing the camera', 'contractor posing',
        ],
        tools: [
          'flexible drainage rod sections being fed upward into the downpipe by Worker 1 from the base at ground level',
          'plastic sheet at the foot of the downpipe to catch expelled debris',
          'spare rod sections laid out on the ground beside Worker 2',
        ],
        protections: [
          'plastic sheet at the base of the downpipe containing expelled silt and debris',
          'both workers in work boots and gloves at ground level',
        ],
        chantier_details: [
          'dark expelled debris plug at the downpipe base — pipe blockage being worked clear from ground level',
          'Worker 1 crouching at the pipe foot feeding rods upward; Worker 2 managing rod sections',
          'gutter visible at the top of the downpipe, standing water in the trough at the blocked inlet',
        ],
      },
      {
        _for:          'deboucha|bouchon|obstruct',
        scene_note:    'homeowner photo of downpipe after clearance — two professionals: Worker 1 standing beside the drain watching the restored water flow, Worker 2 gathering the rod sections and folding the plastic sheet — water running freely from the downpipe outlet at ground level — expelled debris pile visible on the plastic sheet — casual framing from the garden path',
        scene_camera:  'ordinary homeowner smartphone from the garden or path, 2–5 m from the downpipe base, low angle looking along the wall — slightly imperfect framing, mild digital zoom',
        scene_framing: {
          work_pct:   65,
          foreground: 'downpipe base and drain outlet — clear flow of water emerging from the pipe — plastic sheet with expelled debris pile beside the pipe foot — Worker 2 gathering rod sections',
          midground:  'house wall beside the downpipe run — Worker 1 standing beside the drain watching the flow, naturally off-centre',
          background: 'garden or path, eave line visible at the top of the downpipe far above',
        },
        scene_debris:  'expelled debris pile on the plastic sheet at the downpipe base — compacted leaves, moss, silt clearly visible',
        scene_exclude: [
          'new gutter sections', 'fascia brackets', 'flexible rod still being used',
          'ladder resting on the gutter', 'camera at gutter level',
          'single worker at the drain alone',
          'contractor facing the camera', 'promotional framing',
        ],
        tools: [
          'flexible drainage rod sections leaning against the house wall or being packed by Worker 2',
          'drain hook or coiled hose beside the pipe foot',
        ],
        protections: [
          'plastic sheet soiled with expelled silt at the pipe foot',
          'both workers in work boots at ground level',
        ],
        chantier_details: [
          'clear water flow at the downpipe outlet — pipe now unblocked',
          'expelled debris pile on the plastic sheet — blockage cause visible',
          'two professionals: Worker 1 confirming flow, Worker 2 packing up rod sections',
        ],
      },
      {
        _for:          'deboucha|bouchon|obstruct',
        scene_note:    'homeowner photo from an upstairs window looking down at the gutter and downpipe junction — standing water clearly backed up in the gutter at the blocked inlet — two workers at the base of the downpipe below, visible but small in frame — slight window sill edge or curtain at the photo border',
        scene_camera:  'homeowner looking down from an upstairs window or balcony — slightly downward angle, mild digital zoom, part of the window frame or sill visible at the border — both workers at ground level below, naturally off-centre and not facing the camera',
        scene_framing: {
          work_pct:   70,
          foreground: 'slight window sill or curtain edge at the image border — homeowner shooting from an accessible upstairs room',
          midground:  'gutter trough visible below — standing water backed up behind the blocked downpipe inlet — debris accumulation at the outlet junction visible from above',
          background: 'house wall descending to the garden or path below — two workers visible at the downpipe base at ground level',
        },
        scene_debris:  'standing water backed up in the gutter at the blocked inlet — debris visible from above around the outlet junction',
        scene_exclude: [
          'new gutter sections', 'fascia brackets', 'free-flowing drain',
          'ladder rails on the gutter', 'drone view',
          'single worker at the downpipe base alone',
          'contractor facing the camera', 'contractor posing for the photo',
        ],
        tools: [
          'drain jetter nozzle or flexible rod visible at the downpipe base at ground level far below',
          'second worker visible beside the first at the downpipe base',
        ],
        protections: [
          'plastic sheet on the ground at the downpipe base visible from above',
          'both workers safely at ground level — no ladder against the gutter',
        ],
        chantier_details: [
          'standing water clearly backed up in the gutter at the blocked inlet — viewed from above',
          'debris accumulation at the outlet junction visible from the upstairs window angle',
          'two workers safely at ground level — no ladder against the gutter',
        ],
      },

      // --- remplacement / pose gouttières ---
      {
        _for:          'remplace|pose|install|neuf|nouveau',
        scene_note:    'new gutter section being lifted into position on pre-fitted fascia brackets — new PVC gutter being clipped onto the bracket row along the eave',
        scene_camera:  'standing back from the house, framing the new gutter section being lifted and aligned with the fascia bracket row along the eave edge',
        scene_framing: {
          work_pct:   65,
          foreground: 'new PVC gutter section being lifted and aligned with the fascia bracket row along the eave edge',
          midground:  'row of new fascia brackets already fitted to the board — new gutter going in',
          background: 'house facade, bare eave on the section not yet fitted',
        },
        scene_debris:  'old gutter sections on the ground below — removed from the eave before fitting new',
        scene_exclude: ['gutter cleaning equipment', 'flexible drainage rod', 'moss debris', 'old stained gutter still in place'],
        tools: [
          'new PVC gutter section being lifted into the bracket row along the eave',
          'gutter clip tool for securing the section into the fascia brackets',
        ],
        protections: [
          'soft cloth on the ladder top to protect the new gutter section during installation',
        ],
        chantier_details: [
          'new PVC gutter section bright and unweathered — clear contrast with existing facade',
          'fascia brackets already fitted in a straight row — new gutter clicking in',
          'old gutter sections on the ground below — replaced before fitting new',
        ],
      },
      {
        _for:          'remplace|pose|install|neuf|nouveau',
        scene_note:    'fascia bracket being drilled and screwed to the barge board — new bracket going in, gutter run about to begin',
        scene_camera:  'close-up at the fascia level, framing the cordless drill fixing the bracket to the board with the new gutter section visible nearby',
        scene_framing: {
          work_pct:   70,
          foreground: 'cordless drill fixing a new gutter fascia bracket to the barge board — screw being driven home',
          midground:  'row of already-fitted brackets along the fascia, new gutter section waiting to be clipped in',
          background: 'house facade, eave soffit above, garden below',
        },
        scene_debris:  'drill bit case on the ladder shelf, packaging from new brackets on the ground below',
        scene_exclude: ['gutter cleaning equipment', 'flexible drainage rod', 'moss debris'],
        tools: [
          'cordless drill fixing new fascia bracket to the barge board',
          'new fascia brackets in a bag on the ladder shelf',
          'new PVC gutter section leaning against the house wall below',
        ],
        protections: [],
        chantier_details: [
          'new bracket being fixed — drill bit in the screw head clearly visible',
          'row of already-fitted brackets defining the new gutter line along the fascia',
          'new gutter section on the ground below — ready to clip in after brackets',
        ],
      },
      {
        _for:          'remplace|pose|install|neuf|nouveau',
        scene_note:    'new downpipe section being clipped to the house wall — wall clip being screwed through the render, new PVC pipe section aligned in the clip',
        scene_camera:  'close-up at the wall beside the downpipe run, framing the wall clip being fixed and the new pipe aligned',
        scene_framing: {
          work_pct:   70,
          foreground: 'new downpipe wall clip being screwed through the render — drill and clip visible',
          midground:  'new PVC downpipe section aligned in the clip, previous clip already fixed above',
          background: 'house wall, old downpipe offset at the eave above',
        },
        scene_debris:  'drill dust from the rawlbolt holes on the render surface beside the clip',
        scene_exclude: ['gutter cleaning equipment', 'flexible drainage rod', 'moss debris', 'old stained pipe in position'],
        tools: [
          'cordless drill fixing the downpipe wall clip through the house render',
          'new PVC downpipe section being aligned in the clip',
        ],
        protections: [],
        chantier_details: [
          'new white PVC downpipe — unweathered and bright against the house render',
          'wall clip being fixed — drill dust on the render surface below the hole',
          'previous clip already fixed above — downpipe run building down the wall',
        ],
      },
    ],
    tools: [
      'aluminium extension ladder with visible standoff stabiliser — arms braced on wall below eave, gutter trough unobstructed',
      'plastic gutter scoop resting on the path below the downpipe',
      'garden trowel on the ground near the cleared section',
      'plastic bucket with wet leaf and moss debris beside the wall',
      'soft hand brush on the path near the downpipe base',
    ],
    protections: [
      'standoff stabiliser visible on ladder — arms on wall, NOT on gutter channel',
      'plastic sheet covering the flower bed directly below the gutter line',
      'old folded towel draped over the garden edging to catch drips',
    ],
    chantier_details: [
      'small pile of wet compacted leaves and moss on the path below the cleared gutter section',
      'leaf and moss debris clumped near the drain grate at the downpipe base',
      'dirty water puddle on the path directly below the gutter outlet',
      'clump of wet moss on the ground below the eave line',
      'faint drip trace on the lower wall directly below the downpipe joint',
    ],
  },

};
