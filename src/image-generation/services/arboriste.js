/**
 * arboriste.js — Phase 2 shadow copy (source active : app.js)
 * Copie stricte de WORK_SCENES {élagage, abattage} et SITE_REALISM {abattage, 'élagage'}.
 * Ne pas modifier avant le cutover validé.
 */

export const WORK_SCENES_ARBORISTE = {
  élagage: {
    category:         'arboriste',
    priority:         3,
    service_keywords: [
      { phrase: 'taille arbre',   score: 12 },
      { phrase: 'rognage souche', score: 12 },
      { phrase: 'emondage',       score: 10 },
      { phrase: 'elagage',        score: 10 },
      { phrase: 'elagueur',       score: 10 },
      { phrase: 'taille haie',    score: 9  },
      { phrase: 'haie',           score: 4  },
      { phrase: 'arbust',         score: 3  },
    ],
    exclude_if: [],
    intro:      'tree pruning and hedge trimming at a residential garden',
    setting:    'exterior',
    secteur:           'arborist',
    variation_setting: 'garden',
    hasWorkers:        false,
    camera:            'standing on the ground, 5–8 m from the tree, angled slightly upward',
    materials:  ['cut branches', 'hedge clippings', 'fresh sawdust', 'bark chips'],
    photo_defects: [
      'slight upward tilt distorting verticals',
      'pale sky clipping exposure on bright patches',
    ],
    exclusions: ['chainsaws', 'helmets', 'ropes', 'harnesses', 'chippers', 'safety equipment', 'workers', 'people'],
    states: {
      debut: {
        framing: {
          work_pct:   40,
          foreground: 'a small pile of first cut branches on the lawn beside the tree',
          midground:  'tree mostly intact with one section freshly trimmed — raw cut marks visible on main branch',
          background: 'garden fence, neighbouring roof, pale sky',
        },
        debris:      'a few scattered branch offcuts and light sawdust near the base',
        description: 'Pruning has just started. The tree is mostly full. One branch section has been removed, leaving a clean raw cut mark. Materials are barely disturbed.',
      },
      encours: {
        framing: {
          work_pct:   55,
          foreground: 'branches and clippings piled on lawn around the base, fresh sawdust visible',
          midground:  'tree crown partially pruned — clearly lighter on one side, major cuts visible',
          background: 'neighbouring rooflines and sky now more visible through the thinned crown',
        },
        debris:      'cut branches and hedge clippings piled on lawn, sawdust scattered around base',
        description: 'Pruning is underway. The crown is noticeably lighter on one side. Branches are piled on the lawn. The job is active and progressing well.',
      },
      semifinal: {
        framing: {
          work_pct:   50,
          foreground: 'most branches already removed and stacked, one last pile being managed',
          midground:  'tree properly shaped, fresh cuts on all main branches neatly done',
          background: 'open sky now visible, clean garden structure emerging',
        },
        debris:      'a tidy pile of cut branches ready for removal, fine sawdust remaining on the lawn',
        description: 'The pruning is nearly complete. The tree has a clean shape. Cut material is being organised into neat piles for removal.',
      },
      final: {
        framing: {
          work_pct:   60,
          foreground: 'clean lawn with only a small heap of last trimmings at the edge',
          midground:  'properly shaped tree — balanced crown, all cuts clean and neatly done',
          background: 'tidy garden, neighbouring house, open sky',
        },
        debris:      'minimal — one small bundle of branches at garden edge, lawn otherwise clear',
        description: 'Work is finished. The tree is well shaped. The garden is clean and tidy. A professional result ready to photograph for a client.',
      },
    },
  },

  abattage: {
    category:         'arboriste',
    priority:         3,
    service_keywords: [
      { phrase: 'abattage arbre', score: 13 },
      { phrase: 'dessouchage',    score: 11 },
      { phrase: 'abattage',       score: 9  },
      { phrase: 'abatage',        score: 9  },
    ],
    exclude_if: [],
    intro:      'large tree felling at a residential property',
    setting:    'exterior',
    secteur:           'tree feller',
    variation_setting: 'garden',
    hasWorkers:        false,
    camera:            'standing back 7–10 m, wide view of felled or sectioned tree',
    materials:  ['log sections', 'bark chips', 'coarse sawdust', 'large branches'],
    photo_defects: [
      'motion blur on peripheral branches from wind',
      'JPEG compression on dense bark and wood grain texture',
    ],
    exclusions: ['chainsaws', 'safety gear', 'ropes', 'cranes', 'workers', 'people'],
    states: {
      debut: {
        framing: {
          work_pct:   40,
          foreground: 'first cut log sections placed neatly at the garden edge',
          midground:  'tree still standing with lower branches removed and base notched',
          background: 'garden fence, neighbouring house',
        },
        debris:      'bark chips and a light coat of sawdust around the base of the standing tree',
        description: 'Felling has just started. The tree is still standing but lower branches are removed. The first cuts are made at the base.',
      },
      encours: {
        framing: {
          work_pct:   60,
          foreground: 'trunk sections laid on ground in an organised row, bark chips around them',
          midground:  'main trunk partially sectioned, upper part still standing',
          background: 'sky now more open above where canopy is being reduced',
        },
        debris:      'log sections, branches and sawdust on the ground — an active but organised work site',
        description: 'The tree is being sectioned. Several log pieces are already on the ground. The upper trunk and crown are still being worked.',
      },
      semifinal: {
        framing: {
          work_pct:   55,
          foreground: 'log sections stacked neatly on one side, sawdust on ground',
          midground:  'fresh flat stump visible, remaining small branches being cleared',
          background: 'open sky where the tree stood, neighbouring house now visible',
        },
        debris:      'neatly stacked logs, fine sawdust coat on surrounding ground',
        description: 'The tree is down. The trunk is sectioned. Logs are being stacked. The stump is clean and flat. Final clearing underway.',
      },
      final: {
        framing: {
          work_pct:   50,
          foreground: 'clean garden with fresh flat stump visible',
          midground:  'tidy log pile stacked against fence or garden wall',
          background: 'open sky, neighbouring property now visible, cleared garden',
        },
        debris:      'minimal — stump and a tidy log pile are the only evidence of work',
        description: 'Felling complete. Garden clear. Logs neatly stacked. The stump is all that remains. A clean professional finish.',
      },
    },
  },

};

export const SITE_REALISM_ARBORISTE = {
  abattage: {
    scenarios: [

      // --- abattage direct ---
      {
        _for:          'abattage.*arbre|abattage.*peup|abattage.*conif',
        scene_note:    'tree felling in progress — notch and back-cut made at the base, directional guide rope tensioned from high on the trunk, tree still standing with the hinge cut visible',
        scene_camera:  'standing at a safe distance from the fall zone, framing the base of the tree with the notch cut and the guide rope running upward',
        scene_framing: {
          work_pct:   65,
          foreground: 'yellow safety tape exclusion zone at the fall area perimeter, guide stake at the fall direction',
          midground:  'tree trunk base — notch and back-cut clearly visible in the wood, rope attached high and tensioned',
          background: 'crown of the tree, open fall zone beyond',
        },
        scene_debris:  'fresh sawdust at the base of the trunk around the notch cut, wood chip pile from the notch removal',
        scene_exclude: ['felled tree on the ground', 'only stump visible', 'dessouchage equipment', 'simple light pruning', 'tree completely intact'],
        tools: [
          'chainsaw beside the cut — notch cut just completed',
          'guide rope running from the trunk base up to the attachment point high on the tree',
          'wedge blocks on the ground near the trunk base',
        ],
        protections: [
          'yellow safety tape marking the exclusion zone in the fall direction',
          'guide stake driven into the ground at the calculated fall direction',
        ],
        chantier_details: [
          'notch and back-cut clearly visible in the trunk at base level',
          'guide rope tensioned from the trunk attachment point toward the desired fall direction',
          'fresh sawdust pile at the base from the notch cut',
        ],
      },
      {
        _for:          'abattage.*arbre|abattage.*peup|abattage.*conif',
        scene_note:    'tree mid-fall — trunk at 30–45 degrees, crown swinging into the fall zone, guide rope under tension, exclusion zone clear',
        scene_camera:  'standing well outside the fall zone, framing the leaning trunk at 30–45 degrees with the crown swinging',
        scene_framing: {
          work_pct:   70,
          foreground: 'exclusion zone tape and safety cones at the near perimeter',
          midground:  'tree trunk at 30–45 degrees — crown swinging into the prepared fall zone',
          background: 'cleared fall zone, open garden or field where the tree will land',
        },
        scene_debris:  'small bark fragments at the base from the cut, guide rope slack forming behind the falling trunk',
        scene_exclude: ['tree standing upright intact', 'stump only', 'dessouchage', 'log pile', 'simple pruning'],
        tools: [
          'guide rope in tension from the upper trunk toward the direction of fall',
          'chainsaw on the ground at the safe distance — cut already made',
        ],
        protections: [
          'yellow safety tape exclusion zone visibly clear of the fall direction',
          'operator at safe distance away from the fall zone',
        ],
        chantier_details: [
          'trunk at steep lean angle — crown clearly in motion',
          'guide rope tracking the controlled fall direction — rope in tension',
          'fall zone prepared and clear ahead of the falling crown',
        ],
      },
      {
        _for:          'abattage.*arbre|abattage.*peup|abattage.*conif',
        scene_note:    'tree freshly felled — full trunk on the ground in the fall zone, fresh-cut stump visible at trunk base, sawdust around the stump, exclusion tape still in place',
        scene_camera:  'standing beside the stump, framing the full length of the fallen trunk on the ground with the stump in the foreground',
        scene_framing: {
          work_pct:   55,
          foreground: 'fresh-cut stump with growth rings visible — sawdust and wood chips around the base',
          midground:  'fallen trunk stretching along the ground — bark, crown foliage at the far end',
          background: 'open fall zone, safety tape still in place at the perimeter',
        },
        scene_debris:  'sawdust ring around the stump base, wood chips from the notch cut, bark fragments on the ground',
        scene_exclude: ['tree standing', 'sections already cut up', 'dessouchage', 'log pile stacked'],
        tools: [
          'chainsaw on the ground near the stump — felling just completed',
          'measuring tape near the stump base',
        ],
        protections: [
          'yellow safety tape exclusion zone still in place around the fall area',
        ],
        chantier_details: [
          'fresh-cut stump with concentric growth rings visible on the flat face',
          'fallen trunk on the ground — full length visible from stump to crown',
          'sawdust ring around the stump from the cut',
        ],
      },

      // --- démontage par sections / zone difficile ---
      {
        _for:          'zone.*diffic|diffic.*zone|grand.*arbre|gros.*arbre|demontage',
        scene_note:    'tree being dismantled section by section from the top — upper sections already removed, arborist climber at the top of the shortened stub trunk, multiple log sections at the base',
        scene_camera:  'standing back from the tree, framing the partially dismantled stub trunk with the climber at the top against the sky',
        scene_framing: {
          work_pct:   65,
          foreground: 'log sections on the ground at the base — stacked and arranged, sawdust around them',
          midground:  'shortened stub trunk — much shorter than original height, climber in harness at the top',
          background: 'sky above, property or tight garden space visible beside the work area',
        },
        scene_debris:  'sawdust ring around the base, bark fragments from previous sections on the ground',
        scene_exclude: ['intact standing full tree', 'simple felling', 'tree in open field', 'dessouchage'],
        tools: [
          'climbing rope running from the climber at the top of the stub down to ground handlers',
          'chainsaw at the climber\'s position for the next section cut',
          'log sections on the ground from previous section removals',
        ],
        protections: [
          'full climbing harness and helmet on the climber at the stub top',
          'exclusion zone below the working area',
          'lowering rope for controlled section descent',
        ],
        chantier_details: [
          'stub trunk significantly shorter than the original tree — sections removed progressively from top',
          'climber in harness at the top of the shortened stub — height still significant',
          'log section pile at the base growing as each section is lowered',
        ],
      },
      {
        _for:          'zone.*diffic|diffic.*zone|grand.*arbre|gros.*arbre|demontage',
        scene_note:    'large trunk section being lowered by rope — section suspended mid-air between the stub and the ground, rope under tension, ground handler controlling the descent speed',
        scene_camera:  'standing back, framing the suspended trunk section hanging from the lowering rope between canopy height and the ground',
        scene_framing: {
          work_pct:   70,
          foreground: 'ground handler with the lowering rope — hands gripping the rope, rope taut under the section weight',
          midground:  'large trunk section suspended mid-air — bark clearly visible, rope through the top ring',
          background: 'stub trunk above, property or structure beside the controlled lowering zone',
        },
        scene_debris:  'bark fragments on the ground below the suspended section from the cut, sawdust at the ground immediately below',
        scene_exclude: ['tree falling uncontrolled', 'intact standing tree', 'simple felling', 'dessouchage'],
        tools: [
          'lowering rope through a rigging ring at the top of the suspended section',
          'ground handler with gloved hands on the rope controlling the descent',
        ],
        protections: [
          'hard hat and gloves on the ground handler',
          'exclusion zone below the lowering path',
        ],
        chantier_details: [
          'trunk section suspended mid-air — log mass visible, rope taut under tension',
          'ground handler controlling descent speed with the lowering rope',
          'controlled lowering arc clear of the adjacent property',
        ],
      },
      {
        _for:          'zone.*diffic|diffic.*zone|grand.*arbre|gros.*arbre|demontage',
        scene_note:    'partially dismantled tree — several upper sections removed, leaving a reduced stub trunk still standing, log billets at the base, tight garden or property boundary visible',
        scene_camera:  'standing in the garden, framing the reduced stub trunk with the log billets at the base and the property boundary close beside',
        scene_framing: {
          work_pct:   55,
          foreground: 'log billets on the ground at the base — varied section lengths, fresh cut ends visible',
          midground:  'reduced stub trunk — upper sections removed, clean cut at the current top level',
          background: 'tight property boundary beside the work area — fence, wall or house clearly close to the trunk',
        },
        scene_debris:  'sawdust around the billet pile, bark fragments on the ground',
        scene_exclude: ['full intact tree', 'open field felling', 'dessouchage', 'tree completely down'],
        tools: [
          'chainsaw resting against the stub trunk',
          'rigging rope coiled beside the billet pile',
        ],
        protections: [
          'exclusion zone tape still in place around the work area',
        ],
        chantier_details: [
          'stub trunk clean-cut at the current working height — progressive dismantling visible',
          'log billet pile at the base — each section from a previous cut',
          'tight property boundary clearly visible beside the trunk — confined working space',
        ],
      },

      // --- dessouchage ---
      {
        _for:          'dessouchage|souche',
        scene_note:    'stump grinder working on a fresh stump — rotating cutting wheel engaged with the stump surface, wood chips being thrown to the side, operator behind the machine',
        scene_camera:  'standing to the side of the stump grinder, framing the cutting wheel engaged with the fresh stump',
        scene_framing: {
          work_pct:   70,
          foreground: 'stump grinder with the rotating cutting wheel engaged on the stump surface — chips being thrown',
          midground:  'fresh stump being ground — surface visibly decreasing in height as the wheel removes wood',
          background: 'garden or lawn around the stump, sawdust and chip debris scattered wide',
        },
        scene_debris:  'wood chips being thrown to the sides from the grinding wheel, sawdust and chip ring forming around the machine',
        scene_exclude: ['intact standing tree', 'simple pruning', 'felling in progress', 'log pile from felling'],
        tools: [
          'stump grinder machine with rotating cutting wheel engaged on the stump surface',
        ],
        protections: [
          'chip deflector guard on the grinder protecting the operator',
          'eye protection on the operator',
          'chip splash zone cleared around the grinder',
        ],
        chantier_details: [
          'cutting wheel actively engaged with the stump — top surface being progressively reduced',
          'fresh wood chip shower being thrown to the sides from the grinding wheel',
          'stump clearly decreasing in height as the grinder works across it',
        ],
      },
      {
        _for:          'dessouchage|souche',
        scene_note:    'partially ground stump — circular grinding marks visible on the stump face, wood chips scattered wide, stump reduced to below-grade level on one side',
        scene_camera:  'crouching beside the stump, framing the grinding marks and the wood chip scatter',
        scene_framing: {
          work_pct:   75,
          foreground: 'fresh grinding marks on the stump face — circular grinder path clearly visible in the wood',
          midground:  'stump partially ground — one side reduced to below-grade, other side still full height',
          background: 'garden lawn, wood chips scattered across the surrounding grass',
        },
        scene_debris:  'fresh wood chips scattered wide around the stump from the grinding operation',
        scene_exclude: ['intact standing tree', 'full stump untouched', 'felling in progress'],
        tools: [
          'stump grinder parked beside the stump between passes',
        ],
        protections: [],
        chantier_details: [
          'circular grinding path marks clearly visible on the stump face',
          'stump partially reduced — one side to below-grade, revealing the grinding depth',
          'wood chip scatter wide around the stump from the grinding operation',
        ],
      },
      {
        _for:          'dessouchage|souche',
        scene_note:    'dessouchage completed — stump removed to below-grade level, depression in the lawn where the stump was, wood chip pile in the hollow, surrounding lawn intact',
        scene_camera:  'standing above the completed area, framing the ground-level result where the stump was',
        scene_framing: {
          work_pct:   45,
          foreground: 'ground-level depression where the stump was — wood chip pile filling the hollow',
          midground:  'lawn around the removal area — grass intact, slight disturbance from the machine tracks',
          background: 'garden surroundings, fence or garden edge beyond',
        },
        scene_debris:  'wood chip pile in the depression, fine sawdust on the surrounding grass from the grinding',
        scene_exclude: ['intact standing tree', 'stump still visible above ground', 'felling in progress'],
        tools: [
          'stump grinder parked away — work completed',
          'rake on the ground beside the chip pile for tidying',
        ],
        protections: [],
        chantier_details: [
          'depression in the lawn at ground level — stump ground to below grade',
          'wood chip pile filling the hollow from the grinding debris',
          'surrounding lawn intact with slight machine track marks beside the area',
        ],
      },

      // --- après tempête ---
      {
        _for:          'tempete|orage|vent.*fort|apres.*vent|arbre.*tombe',
        scene_note:    'wind-fallen tree leaning against a garden fence or low wall — root ball exposed, trunk on the ground at a low angle, grey overcast sky and wet ground after the storm',
        scene_camera:  'standing back, framing the fallen tree leaning against the fence with the exposed root ball at the base',
        scene_framing: {
          work_pct:   60,
          foreground: 'exposed root ball on the wet ground — earth and roots upended, depression in the lawn beside it',
          midground:  'trunk at a low angle resting on the fence or wall — bark and crown visible',
          background: 'grey overcast sky, wet garden, fence partially visible under the trunk',
        },
        scene_debris:  'wet mud and soil debris around the exposed root ball, small branches and leaves on the wet ground',
        scene_exclude: ['catastrophic structural damage', 'house destroyed', 'multiple fallen trees', 'sunny dry weather', 'dramatic sky'],
        tools: [
          'orange safety cones placed around the danger area',
          'safety tape visible around the fallen tree perimeter',
        ],
        protections: [
          'safety tape marking the hazard area around the fallen tree',
          'orange cones beside the root ball',
        ],
        chantier_details: [
          'root ball fully exposed — roots and compacted earth visible on the upended side',
          'depression in the lawn where the root ball was anchored',
          'wet conditions throughout — wet ground, wet bark, wet leaves',
        ],
      },
      {
        _for:          'tempete|orage|vent.*fort|apres.*vent|arbre.*tombe',
        scene_note:    'storm tree being sectioned on a blocked path or driveway — trunk already on the ground, chainsaw cutting sections, cones and safety tape in place, grey sky, ground wet',
        scene_camera:  'standing beside the trunk, framing the chainsaw cutting into a trunk section with cones and tape visible',
        scene_framing: {
          work_pct:   65,
          foreground: 'orange safety cones and safety tape at the roadside or path edge — cleared public area',
          midground:  'trunk section being cut by chainsaw — sawdust flying, operator in HV vest',
          background: 'grey overcast sky, wet surfaces, utility vehicle or van visible in the background',
        },
        scene_debris:  'sawdust on the wet ground at the cut point, cut sections beside the trunk, wet leaves on the path',
        scene_exclude: ['catastrophic damage', 'multiple trees down', 'house destroyed', 'dry sunny weather'],
        tools: [
          'chainsaw cutting a trunk section on the ground',
          'utility van visible in the background — crew on site',
        ],
        protections: [
          'high-visibility vests on all workers',
          'orange cones at the site perimeter',
          'safety tape across the blocked path',
          'hard hats on the workers',
        ],
        chantier_details: [
          'trunk section on the wet ground — chainsaw actively cutting',
          'sawdust on the wet path surface from the cut',
          'cut sections already separated beside the trunk — sections being progressively created',
        ],
      },

      // --- intervention de nuit / urgence ---
      {
        _for:          'urgence|nuit|nocturne|route.*bloqu',
        time_of_day:   'night',
        scene_note:    'night emergency felling — work floodlights illuminating a fallen or dangerous tree on a road or driveway, workers in high-visibility vests with chainsaw, orange cones, dark background',
        scene_camera:  'standing outside the light zone, framing the lit work area with the dark surroundings beyond',
        scene_framing: {
          work_pct:   65,
          foreground: 'orange cones and safety tape at the lit perimeter — blocking the road or driveway',
          midground:  'workers in HV vests operating chainsaw on the fallen trunk, work floodlight illuminating the scene',
          background: 'dark background — trees silhouetted against the dark sky beyond the light zone',
        },
        scene_debris:  'sawdust visible in the floodlight cone on the ground beside the cut, cut log sections in the light',
        scene_exclude: ['daytime lighting', 'cinematic lighting', 'police flashing lights unless specified', 'completely dark unreadable scene'],
        tools: [
          'chainsaw operated by a worker in HV vest in the floodlight zone',
          'work floodlight on tripod providing the main illumination',
        ],
        protections: [
          'high-visibility vests on all workers — clearly lit by the floodlight',
          'hard hats on workers',
          'orange cones blocking the road or driveway approach',
          'safety tape across the hazard zone',
        ],
        chantier_details: [
          'floodlight cone illuminating the work area — sharp light-dark boundary',
          'HV vests bright in the floodlight — professional emergency response visible',
          'dark surroundings beyond the light zone — night conditions clearly communicated',
        ],
      },
      {
        _for:          'urgence|nuit|nocturne|route.*bloqu',
        time_of_day:   'night',
        scene_note:    'night emergency — van headlights and work floodlight creating combined illumination on a fresh stump or fallen trunk, workers visible in HV gear, dark sky above',
        scene_camera:  'standing outside the combined light zone, framing the van headlights and floodlight overlapping on the work area',
        scene_framing: {
          work_pct:   55,
          foreground: 'van parked with headlights on, orange cones at the road edge',
          midground:  'work floodlight zone with workers in HV vests at the fallen trunk or fresh stump',
          background: 'dark sky, tree silhouettes beyond the light, distant surroundings in darkness',
        },
        scene_debris:  'sawdust and cut sections visible in the combined light zone on the ground',
        scene_exclude: ['daylight', 'overly dramatic cinematic light', 'scene too dark to read work'],
        tools: [
          'work floodlight on tripod in the combined light zone',
          'utility van with headlights on',
          'chainsaw or hand tools in the workers\' hands',
        ],
        protections: [
          'HV vests on all workers clearly visible in the combined light',
          'orange cones at the road edge or perimeter',
        ],
        chantier_details: [
          'combined light from van headlights and floodlight — overlapping warm and cool tones',
          'workers\' HV vests clearly visible in the combined light zone',
          'dark sky and silhouetted trees beyond the lit area — unmistakable night context',
        ],
      },

      // Fallback: abattage général
      {
        scene_note:    'tree felling work in progress — trunk on the ground or stump visible, safety exclusion zone in place, fresh sawdust and wood chips on the ground',
        scene_camera:  'standing beside the stump or fallen trunk, framing the evidence of felling with the exclusion zone visible',
        scene_framing: {
          work_pct:   50,
          foreground: 'fresh-cut stump with growth rings visible, sawdust ring around the base',
          midground:  'fallen trunk on the ground or cut sections nearby, exclusion tape visible',
          background: 'garden or site surroundings, cleared fall zone',
        },
        scene_debris:  'fresh sawdust at the stump base, wood chip pile, bark fragments on the ground',
        scene_exclude: ['intact standing tree with no work', 'dessouchage equipment if not relevant'],
        tools: [
          'guide stake driven into the ground at the calculated fall direction',
          'measuring tape on the ground near the base of the tree',
          'rope coil resting at the base for directional pull',
        ],
        protections: [
          'yellow safety tape marking the exclusion zone around the felling area',
          'tarp spread on the ground at the expected landing zone',
        ],
        chantier_details: [
          'fresh wood chips scattered on the ground at the base of the tree',
          'cut branch sections stacked in a pile nearby',
          'sap mark on the freshly exposed cut end of a branch',
        ],
      },
    ],
    tools: [
      'guide stake driven into the ground at the calculated fall direction',
      'measuring tape on the ground near the base of the tree',
      'rope coil resting at the base for directional pull',
      'hand saw resting against a cut lower branch',
      'wedge blocks on the ground near the trunk base',
    ],
    protections: [
      'yellow safety tape marking the exclusion zone around the felling area',
      'tarp spread on the ground at the expected landing zone',
    ],
    chantier_details: [
      'fresh wood chips scattered on the ground at the base of the tree',
      'cut branch sections stacked in a pile nearby',
      'sap mark on the freshly exposed cut end of a branch',
      'sawdust pile at the base of the trunk',
      'small root fragment disturbed and exposed at the base of the tree',
    ],
  },

  'élagage': {
    scenarios: [

      // --- taille douce / éclaircissement / couronnage / émondage / recépage ---
      {
        _for:          'taille|eclairciss|emondage|couronnage|recepage|reduc.*couron',
        scene_note:    'crown reduction in progress — climber in harness positioned mid-canopy with a small chainsaw at a lateral branch being shortened, tree fully standing and main structure preserved',
        scene_camera:  'standing back from the tree at ground level, framing the climber in the mid-canopy against the sky above',
        scene_framing: {
          work_pct:   65,
          foreground: 'tarp on the ground at the tree base, cut branch lengths already laid out on the tarp',
          midground:  'tree trunk and primary branches, climber with harness and small chainsaw visible in the canopy',
          background: 'sky above the canopy, garden or fence line behind the tree',
        },
        scene_debris:  'small green leaf clusters and cut twig sections on the tarp below the working position',
        scene_exclude: ['felled tree on ground', 'stump alone', 'large log sections in pile', 'tree completely bare', 'chainsaw at trunk base'],
        tools: [
          'small chainsaw operated by the climber at the branch cut point',
          'climbing rope running from the harness to the anchor branch above',
        ],
        protections: [
          'helmet and full harness visible on the climber in the canopy',
          'tarp spread on the ground at the tree base to catch debris',
          'yellow safety tape marking the drop zone around the base',
        ],
        chantier_details: [
          'climber in harness positioned mid-canopy at the active cut point',
          'cut branch sections on the tarp below — sorted by length',
          'fresh cut stubs visible in the crown at previously removed positions',
        ],
      },
      {
        _for:          'taille|eclairciss|emondage|couronnage|recepage|reduc.*couron',
        scene_note:    'crown thinning completed — tree standing with crown noticeably more open on one side, cut branches piled on tarp below, loppers and pruning saw on the ground',
        scene_camera:  'standing back from the tree, framing the full tree height with the thinned crown visible and the cut branch pile below',
        scene_framing: {
          work_pct:   55,
          foreground: 'cut branch pile on tarp with loppers and pruning saw beside the pile',
          midground:  'full tree standing — crown visibly lighter and more open on the thinned side',
          background: 'garden, fence or house wall behind the tree',
        },
        scene_debris:  'small leaf clusters and cut twigs scattered on the ground around the tarp edge',
        scene_exclude: ['felled tree', 'large log sections', 'stump only', 'chainsaw at trunk level', 'bare tree'],
        tools: [
          'loppers on the ground beside the cut branch pile',
          'hand pruning saw resting on the pile',
          'telescopic pruning pole leaning against the trunk',
        ],
        protections: [
          'tarp loaded with sorted cut branches below the crown',
          'yellow safety tape on the ground defining the drop zone',
        ],
        chantier_details: [
          'crown clearly more open on the thinned side — lighter canopy density visible',
          'sorted cut branch pile on the tarp — sections of various diameters',
          'sap marks on the fresh cut stubs still visible in the crown',
        ],
      },
      {
        _for:          'taille|eclairciss|emondage|couronnage|recepage|reduc.*couron',
        scene_note:    'garden tree pruning — stepladder beside a fruit or ornamental tree, long-handled loppers at a medium lateral branch making a clean collar cut',
        scene_camera:  'standing in the garden beside the tree, framing the stepladder against the trunk and the loppers at the branch being cut',
        scene_framing: {
          work_pct:   65,
          foreground: 'stepladder leaning against the trunk, loppers at the branch collar',
          midground:  'fruit or ornamental tree at full height — other branches undisturbed',
          background: 'garden wall or fence, shrubs behind',
        },
        scene_debris:  'small cut twig section on the garden ground below the ladder, leaf debris at the ladder feet',
        scene_exclude: ['felled tree', 'stump', 'chainsaw', 'climbing harness in tree', 'large cut logs'],
        tools: [
          'long-handled loppers at the lateral branch collar — clean collar cut being made',
          'stepladder positioned against the tree trunk',
        ],
        protections: [
          'stable stepladder on level ground beside the trunk',
        ],
        chantier_details: [
          'lopper blades at the branch collar — clean angled cut position',
          'other branches undisturbed — targeted individual pruning only',
          'small cut twig on the ground below from the previous cut',
        ],
      },

      // --- suppression branches mortes ---
      {
        _for:          'branche.*mort|mort.*branche|bois.*mort|supp.*mort',
        scene_note:    'dead branch removal — grey-brown leafless branch being cut from the canopy, pruning saw at the collar, living green foliage clearly surrounding the dead wood',
        scene_camera:  'close-up in the canopy, framing the pruning saw at the dead branch base with living branches on either side',
        scene_framing: {
          work_pct:   70,
          foreground: 'pruning saw at the dead branch base collar — grey-brown dead wood clearly distinct from the green living branches beside it',
          midground:  'dead branch extending away — bare and leafless, cracked bark visible',
          background: 'living green canopy surrounding, sky beyond',
        },
        scene_debris:  'dry bark fragments at the stub base where the cut is being made',
        scene_exclude: ['felled tree', 'stump', 'all branches green and healthy', 'chainsaw at trunk level'],
        tools: [
          'hand pruning saw at the dead branch base collar',
        ],
        protections: [
          'hard hat visible on the worker in the canopy',
          'climbing harness visible',
          'tarp below to catch the dead branch',
        ],
        chantier_details: [
          'grey-brown dead branch — cracked bark and no leaves visible against the green canopy',
          'pruning saw making a clean cut at the branch collar',
          'living green branches at adjacent junctions — healthy tree context evident',
        ],
      },
      {
        _for:          'branche.*mort|mort.*branche|bois.*mort|supp.*mort',
        scene_note:    'dead branch pile after removal — dry grey leafless sections piled beside the still-standing living tree, crown visible and green behind the pile',
        scene_camera:  'standing in the garden, framing the dead branch pile in the foreground and the living tree crown behind',
        scene_framing: {
          work_pct:   50,
          foreground: 'pile of grey dry dead branch sections — no leaves, cracked bark, chalky dried cut ends',
          midground:  'tree trunk, lower crown intact and green',
          background: 'full tree canopy — living and green, visibly cleared of the dead wood',
        },
        scene_debris:  'dry bark fragments beside the dead branch pile',
        scene_exclude: ['felled tree', 'living green branches mixed in the pile', 'stump', 'chainsaw at trunk level'],
        tools: [
          'pruning saw on the ground beside the dead branch pile',
          'loppers beside the pile',
        ],
        protections: [
          'tarp under the pile',
        ],
        chantier_details: [
          'dead branch pile — grey, dry, chalky cut ends — clearly not living wood',
          'living tree canopy above — green and dense, cleared of the dead wood',
          'colour contrast between grey dead branches and green living canopy clearly visible',
        ],
      },
      {
        _for:          'branche.*mort|mort.*branche|bois.*mort|supp.*mort',
        scene_note:    'close-up of a fresh cut on a dead branch stub — dry grey wood face at the cut, flaking bark around the base, no sap, clean cut revealing dry internal wood grain',
        scene_camera:  'close-up on the branch stub in the tree, framing the cut face of the dead branch',
        scene_framing: {
          work_pct:   80,
          foreground: 'fresh cut face on the dead branch stub — grey dry wood, no sap, dry crumbly internal structure',
          midground:  'living bark of the parent branch and healthy collar forming around the stub base',
          background: 'green canopy surrounding the stub position',
        },
        scene_debris:  'dry bark fragments at the stub base where the cut was made',
        scene_exclude: ['fresh sap on the cut face', 'living green branch', 'felled tree', 'stump'],
        tools: [
          'pruning saw resting on the adjacent living branch beside the cut stub',
        ],
        protections: [],
        chantier_details: [
          'cut face of the dead branch — grey dry wood, no sap, contrasting with living tissue',
          'living bark collar at the stub base — healthy tree tissue forming a ring around the dead wood',
          'dry bark flaking at the stub edges',
        ],
      },

      // --- élagage de sécurité / arbres dangereux ---
      {
        _for:          'danger|securite|risque',
        scene_note:    'hazardous branch removal — large inclined branch overhanging a fence or property with a rope attached high for controlled drop, exclusion zone marked with safety tape',
        scene_camera:  'standing back from the tree, framing the hazardous inclined branch with the guide rope running from its upper section',
        scene_framing: {
          work_pct:   60,
          foreground: 'yellow safety tape defining the exclusion zone below the hazardous branch',
          midground:  'tree with the inclined or cracked branch — rope visible running from the upper section of the branch',
          background: 'fence, house wall or garden structure that the branch threatens',
        },
        scene_debris:  'light bark debris at the base of the trunk from preliminary assessment',
        scene_exclude: ['healthy well-balanced tree', 'simple taille légère', 'no exclusion zone', 'completed log pile'],
        tools: [
          'guide rope attached to the hazardous branch upper section for controlled drop',
          'chainsaw at the cut point on the hazardous branch',
        ],
        protections: [
          'yellow safety tape marking the exclusion zone',
          'hard hat and harness on the climber at the cut point',
        ],
        chantier_details: [
          'rope attached and tensioned on the hazardous branch — ready for controlled lowering',
          'branch inclined or cracked — visible structural failure or overhang threat',
          'exclusion zone marked with safety tape — property beyond the tape visible',
        ],
      },
      {
        _for:          'danger|securite|risque',
        scene_note:    'climber in a structurally compromised tree — harness and lanyard visible, chainsaw at a dangerous split fork, house or fence clearly visible below as the threatened structure',
        scene_camera:  'looking up from the garden, framing the climber in harness at the dangerous fork with the property visible behind',
        scene_framing: {
          work_pct:   65,
          foreground: 'tree trunk at the base, exclusion zone tape around the base',
          midground:  'climber in harness positioned at the dangerous fork — chainsaw in hand at the cut point',
          background: 'house wall or garden fence clearly visible below the canopy — the threatened property',
        },
        scene_debris:  'small bark fragments on the ground below from preliminary cuts',
        scene_exclude: ['healthy balanced tree', 'simple taille', 'no harness', 'completed log pile'],
        tools: [
          'small chainsaw in the climber\'s hand at the dangerous fork junction',
          'climbing rope and lanyard keeping the climber secured to the trunk',
        ],
        protections: [
          'full climbing harness and helmet on the climber',
          'exclusion zone tape at the base',
        ],
        chantier_details: [
          'climber at the compromised fork — structural crack or bark inclusion visible at the junction',
          'chainsaw ready at the cut point — controlled removal about to begin',
          'property clearly visible below — risk context unmistakable',
        ],
      },
      {
        _for:          'danger|securite|risque',
        scene_note:    'controlled branch lowering — large heavy branch just cut, suspended mid-air by the lowering rope between the canopy and the ground, rope under tension, ground handler controlling the descent',
        scene_camera:  'standing back, framing the branch suspended by the rope between the canopy and the ground',
        scene_framing: {
          work_pct:   70,
          foreground: 'rope handler at the base with hands on the rope — rope taut under the branch load',
          midground:  'large branch suspended mid-air — hanging from the rope between canopy height and the ground',
          background: 'tree canopy above, fence or property that was threatened beyond the branch path',
        },
        scene_debris:  'leaf fragments dislodged during the cut on the ground below the suspension point',
        scene_exclude: ['branch fallen without control', 'no rope visible', 'small lightweight branch'],
        tools: [
          'lowering rope under tension from the suspended branch to the ground handler',
          'friction saver or rigging ring at the anchor point above',
        ],
        protections: [
          'hard hat on the ground handler',
          'exclusion zone tape visible at the perimeter',
        ],
        chantier_details: [
          'large branch suspended mid-air by the lowering rope — rope taut under visible load',
          'ground handler controlling the descent speed — hands clearly on the rope',
          'property safely clear of the controlled lowering arc',
        ],
      },

      // --- taille en hauteur ---
      {
        _for:          'hauteur|haute.*tige|haut.*tige',
        scene_note:    'telescopic pruning pole at full extension — operator at ground level directing the pole head deep into the high canopy, both arms raised, cut twig sections falling',
        scene_camera:  'standing beside the operator, framing the extended pole disappearing into the upper canopy',
        scene_framing: {
          work_pct:   60,
          foreground: 'operator at ground level, both arms raised holding the extended pole at an angle into the canopy',
          midground:  'tall tree — pole disappearing into the upper crown at full extension',
          background: 'garden or open area beyond the tree',
        },
        scene_debris:  'small cut twig sections and leaf clusters falling from the canopy around the operator',
        scene_exclude: ['ladder', 'climbing harness in tree', 'aerial platform', 'felled tree', 'stump'],
        tools: [
          'telescopic pruning pole at full extension with pole saw head in the upper canopy',
        ],
        protections: [
          'hard hat on the operator at ground level',
          'safety goggles on the operator',
        ],
        chantier_details: [
          'telescopic pole at full extension — straight line from operator hands to upper canopy',
          'cut twig sections falling from the canopy as the pole saw works',
          'operator both arms raised — guiding the pole head through the canopy from below',
        ],
      },
      {
        _for:          'hauteur|haute.*tige|haut.*tige',
        scene_note:    'arborist climber high in the upper canopy — looking up from the garden, climber in full gear positioned in the upper crown against the open sky',
        scene_camera:  'looking up from ground level, framing the climber high in the canopy against the sky above',
        scene_framing: {
          work_pct:   55,
          foreground: 'tree trunk rising from the ground, climbing rope running upward from the harness',
          midground:  'upper canopy — climber with harness, helmet, and small chainsaw visible high in the crown',
          background: 'open sky above and behind the climber',
        },
        scene_debris:  'small leaf clusters and bark fragments on the ground below from work at height',
        scene_exclude: ['operator at ground level', 'telescopic pole', 'aerial platform', 'felled tree'],
        tools: [
          'small arborist chainsaw in the climber\'s hand at height',
          'climbing rope running from the harness through the branch anchor above',
        ],
        protections: [
          'full climbing harness, helmet and face visor visible on the climber at height',
        ],
        chantier_details: [
          'climber high in the upper crown — tree scale clearly visible from ground perspective',
          'climbing rope running from the harness to the anchor point above the climber',
          'open sky behind the climber — height and exposure clearly communicated',
        ],
      },
      {
        _for:          'hauteur|haute.*tige|haut.*tige',
        scene_note:    'articulated aerial work platform beside a tall tree — operator in the basket at upper canopy height trimming outer branches, basket elevated to full reach',
        scene_camera:  'standing back from the tree, framing the aerial platform arm extended to canopy height with the operator in the basket',
        scene_framing: {
          work_pct:   60,
          foreground: 'aerial platform base on the ground beside the tree — outriggers deployed',
          midground:  'platform arm extended upward, basket at upper canopy height with operator',
          background: 'upper canopy of the tall tree, sky above',
        },
        scene_debris:  'cut branch sections on the ground below from trimming work',
        scene_exclude: ['climbing harness in tree', 'telescopic pole from ground', 'felled tree', 'stump'],
        tools: [
          'operator in the basket using chainsaw or loppers at canopy height',
          'aerial work platform with fully extended arm beside the tree',
        ],
        protections: [
          'operator harness clipped to the basket safety rail',
          'outriggers deployed at the base for platform stability',
          'safety tape around the platform work zone',
        ],
        chantier_details: [
          'aerial platform basket at full height — operator level with the upper canopy',
          'platform arm fully elevated and extended — mechanical reach clearly visible',
          'cut branch sections on the ground below from the trimming work',
        ],
      },

      // --- après tempête ---
      {
        _for:          'tempete|orage|vent.*fort|apres.*vent|branche.*cass',
        scene_note:    'storm-broken branch — large branch broken at a V-shaped split mid-canopy, hanging at a dangerous angle with green foliage still attached, grey overcast sky, wet ground',
        scene_camera:  'standing back from the tree, framing the broken hanging branch clearly visible against the grey sky',
        scene_framing: {
          work_pct:   60,
          foreground: 'wet ground surface, small puddles from the recent storm',
          midground:  'tree with the broken branch hanging — V-shaped split at the break point clearly visible',
          background: 'grey overcast sky, wet garden or fence line visible',
        },
        scene_debris:  'torn wood fibres at the branch break point, scattered wet leaves on the ground below',
        scene_exclude: ['catastrophic damage', 'multiple fallen trees', 'destroyed house', 'sunny dry weather'],
        tools: [
          'safety tape or rope marking the exclusion zone below the hanging branch',
        ],
        protections: [
          'orange safety cones placed below the hanging branch',
          'safety tape defining the danger area',
        ],
        chantier_details: [
          'V-shaped break at the branch split — wood fibres torn, branch still connected',
          'branch hanging at a dangerous angle with full foliage — clear storm damage',
          'wet ground and puddles from the recent storm — damp atmosphere throughout',
        ],
      },
      {
        _for:          'tempete|orage|vent.*fort|apres.*vent|branche.*cass',
        scene_note:    'post-storm clearance — damaged branch just removed, worker in high-visibility vest, wet road or garden, safety cones in place, grey sky, scattered wet debris on the ground',
        scene_camera:  'standing back, framing the worker in HV vest with the removed branch on the ground and safety cones visible',
        scene_framing: {
          work_pct:   55,
          foreground: 'safety cones on the wet surface, removed branch section on the ground',
          midground:  'worker in high-visibility vest — chainsaw or loppers in hand, work just completed',
          background: 'grey overcast sky, wet road or garden, utility vehicle visible in background',
        },
        scene_debris:  'wet leaf and twig debris scattered on the ground around the removed branch',
        scene_exclude: ['catastrophic damage', 'multiple trees down', 'destroyed structure', 'dry sunny weather'],
        tools: [
          'chainsaw in the worker\'s hand — branch just cut',
          'utility vehicle in the background',
        ],
        protections: [
          'high-visibility vest on the worker',
          'safety cones placed around the work area',
          'safety tape visible at the perimeter',
          'hard hat on the worker',
        ],
        chantier_details: [
          'removed branch section on the wet ground — work just completed',
          'worker in full HV gear — professional emergency response clearly visible',
          'wet conditions throughout — ground, debris, and cones all visibly wet',
        ],
      },

      // --- intervention de nuit / urgence ---
      {
        _for:          'urgence|nuit|nocturne',
        time_of_day:   'night',
        scene_note:    'night pruning emergency — work floodlight illuminating a tree or broken branch, arborist in high-visibility vest with chainsaw, orange safety cones, dark background',
        scene_camera:  'standing at the edge of the light cone, framing the worker and tree illuminated by the work floodlight against the dark background',
        scene_framing: {
          work_pct:   65,
          foreground: 'work floodlight on a tripod at the edge of the lit zone, orange cones in the light',
          midground:  'worker in HV vest with chainsaw at the tree, trunk illuminated in the floodlight cone',
          background: 'dark background — trees or garden in darkness beyond the light cone boundary',
        },
        scene_debris:  'cut branch sections on the ground in the floodlight cone, bark chips visible in the light',
        scene_exclude: ['daytime bright sunlight', 'cinematic dramatic lighting', 'completely dark unreadable scene'],
        tools: [
          'chainsaw in the worker\'s hand in the floodlight zone',
          'work floodlight on tripod as the main illumination',
        ],
        protections: [
          'high-visibility vest on the worker — clearly visible in the work light',
          'hard hat on the worker',
          'orange safety cones in the lit area around the tree base',
        ],
        chantier_details: [
          'work floodlight cone illuminating the tree and worker — sharp light-dark boundary',
          'HV vest bright in the floodlight — professional emergency response visible',
          'dark background beyond the light cone — night conditions clearly communicated',
        ],
      },
      {
        _for:          'urgence|nuit|nocturne',
        time_of_day:   'night',
        scene_note:    'night call-out — van headlights and work floodlight creating combined illumination on the work area, tree silhouetted against the dark sky, worker in HV vest active',
        scene_camera:  'standing outside the combined light zone, framing the overlapping van headlights and floodlight on the work area',
        scene_framing: {
          work_pct:   55,
          foreground: 'van parked with headlights on, orange cones at the road edge',
          midground:  'work floodlight zone with worker in HV vest at the tree in the combined light',
          background: 'dark sky, tree silhouetted against the darkness, surroundings in shadow',
        },
        scene_debris:  'light debris visible in the headlight zone on the ground',
        scene_exclude: ['daylight', 'overly cinematic lighting', 'scene too dark to read the work'],
        tools: [
          'work floodlight on tripod in the combined light zone',
          'utility van parked with headlights on',
        ],
        protections: [
          'high-visibility vests on all workers clearly visible in the combined light',
          'orange cones at the roadside or perimeter',
        ],
        chantier_details: [
          'combined light cone from van headlights and floodlight — overlapping illumination',
          'tree silhouetted against the dark sky beyond the lit zone',
          'HV vests clearly visible in the combined light — unmistakable night emergency context',
        ],
      },

      // --- élagage arbre / peuplier (générique) ---
      {
        _for:          'arbre|peuplier',
        scene_note:    'garden tree being pruned — loppers at a lateral branch collar at mid-height, cut branch sections already on the tarp below, remaining crown intact and balanced above the cuts',
        scene_camera:  'standing back 4–6 m from the tree, framing the loppers at the active cut point with the cut pile on the tarp below',
        scene_framing: {
          work_pct:   60,
          foreground: 'tarp with first cut branches piled at the tree base, lopper handles resting beside the pile',
          midground:  'tree trunk at full height — fresh raw cut stubs visible at two or three lateral branch positions in the lower crown',
          background: 'remaining intact upper crown, garden fence or neighbouring roof, open sky',
        },
        scene_debris:  'small leaf clusters and short twig sections on the tarp and around the base',
        scene_exclude: ['felled tree', 'stump alone', 'large log sections', 'chainsaw at trunk level', 'haie hedging', 'hedge trimmer'],
        tools: [
          'loppers resting on the tarp beside the cut branch pile',
          'pruning saw tucked into the tool bag at the tree base',
          'telescopic pruning pole leaning against the trunk',
        ],
        protections: [
          'tarp spread below the active section to catch cut branches',
          'yellow drop-zone tape around the tree base',
        ],
        chantier_details: [
          'fresh pale saw-cut stubs visible in the lower crown — clean angled cuts at the collar',
          'cut branch pile on the tarp sorted loosely by diameter',
          'small sap bead at the fresh cut face of the largest stub',
        ],
      },
      {
        _for:          'arbre|peuplier',
        scene_note:    'tall deciduous tree or poplar after pruning — crown noticeably reduced and re-balanced, fresh white cut stubs on the main lateral branches, pile of cut sections on the ground at the base',
        scene_camera:  'standing 7–10 m back from the tree, framing the full height with the pruned crown and cut debris below',
        scene_framing: {
          work_pct:   55,
          foreground: 'cut branch pile at the tree base on a tarp, pruning tools beside the pile',
          midground:  'full tree at height — crown clearly lightened and balanced, large fresh white cut stubs visible on the main structure',
          background: 'open sky now more visible through the thinned crown, garden or adjacent rooftop beyond',
        },
        scene_debris:  'cut branch sections and leaf clusters on the tarp, fine sawdust around the base',
        scene_exclude: ['tree fully felled', 'stump and stumping equipment', 'hedge trimmer', 'haie', 'small shrub'],
        tools: [
          'hand pruning saw on the tarp beside the cut pile',
          'loppers handles visible resting on the ground near the base',
        ],
        protections: [
          'tarp fully loaded with sorted cut branches below the pruned crown',
          'safety tape at the base perimeter still in place',
        ],
        chantier_details: [
          'crown clearly lighter and more open — sky now visible through gaps that were closed before',
          'large fresh white cut stubs on the main lateral branches — diameter 4–8 cm',
          'cut branch pile on the tarp — full and sorted, ready for removal',
        ],
      },
      {
        _for:          'arbre|peuplier',
        scene_note:    'close-up of a clean pruning cut on a lateral branch — fresh pale wood face at the cut, smooth collar visible at the branch base, sap bead at the centre of the cut face',
        scene_camera:  'close up at the cut face on the branch stub, framing the pale fresh wood against the surrounding bark',
        scene_framing: {
          work_pct:   75,
          foreground: 'fresh pale wood face at the cut — clean smooth surface, slight off-white colour with central sap bead',
          midground:  'branch stub and surrounding parent branch bark — collar still intact at the base',
          background: 'living tree bark and foliage softly out of focus beyond the cut',
        },
        scene_debris:  'small bark flake at the cut edge from the saw exit',
        scene_exclude: ['chainsaw cut face with rough fibres', 'dead grey wood', 'storm break or tear', 'stump at ground level'],
        tools: [
          'pruning saw resting on the adjacent branch beside the cut stub',
        ],
        protections: [],
        chantier_details: [
          'clean smooth cut face — saw cut made at the branch collar, no stub overhang',
          'sap bead at the centre of the cut face — tree actively sealing the wound',
          'collar bark intact at the base of the stub — correct pruning cut technique visible',
        ],
      },

      // Fallback: élagage général
      {
        scene_note:    'tree pruning in progress — tree fully standing, cut branches piled on tarp below, pruning tools visible at the base, canopy structure preserved',
        scene_camera:  'standing back from the tree, framing the full height with cut branches on the tarp below',
        scene_framing: {
          work_pct:   50,
          foreground: 'tarp with cut branch pile at the tree base, pruning tools on the ground',
          midground:  'tree at full height — canopy intact, fresh cut stubs visible in the lower crown',
          background: 'garden or open space behind the tree',
        },
        scene_debris:  'small leaf clusters and twig sections on the ground around the tarp edge',
        scene_exclude: ['felled tree on ground', 'stump alone', 'large log billets', 'dessouchage equipment'],
        tools: [
          'telescopic pruning pole leaning against the tree trunk',
          'lopper handles resting on the ground near the tree base',
          'hand pruning saw resting on a cut branch stub',
        ],
        protections: [
          'tarp spread below the canopy to catch cut branches and leaf debris',
          'yellow safety tape marking the drop zone around the tree base',
        ],
        chantier_details: [
          'tree standing — canopy structure preserved, targeted branches removed',
          'cut branch pile on the tarp — sorted by size',
          'sap marks on the fresh cut stubs visible in the lower crown',
        ],
      },
    ],
    tools: [
      'telescopic pruning pole leaning against the tree trunk',
      'lopper handles resting on the ground near the tree base',
      'hand pruning saw resting on a cut branch stub',
      'branch hook resting against the trunk',
    ],
    protections: [
      'tarp spread below the canopy to catch cut branches and leaf debris',
      'yellow safety tape marking the drop zone around the tree base',
    ],
    chantier_details: [
      'fresh wood chips scattered on the ground around the tree base',
      'cut branch pile on the tarp sorted by diameter',
      'sap mark on the freshly exposed cut end of a pruned limb',
      'small twigs and leaf clusters scattered around the base of the tree',
      'pale fresh wood visible at the pruning cut against the older bark',
    ],
  },

};
