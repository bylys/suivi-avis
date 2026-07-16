/**
 * facade.js — Phase 2 shadow copy (source active : app.js)
 * Copie stricte de WORK_SCENES {ravalement, peinture, nettoyage}
 * et SITE_REALISM {ravalement, peinture, nettoyage}.
 * Ne pas modifier avant le cutover validé.
 */

export const WORK_SCENES_FACADE = {
  ravalement: {
    category:         'ravalement',
    priority:         3,
    service_keywords: [
      { phrase: 'ravalement facade',          score: 14 },
      { phrase: 'renovation facade',          score: 13 },
      { phrase: 'traitement fissures facade', score: 14 },
      { phrase: 'traitement fissures',        score: 11 },
      { phrase: 'enduit facade',              score: 12 },
      { phrase: 'peinture exterieur',         score: 10 },
      { phrase: 'ravalement',                 score: 9  },
      { phrase: 'enduit',                     score: 6  },
      { phrase: 'ravel',                      score: 5  },
      { phrase: 'facade',                     score: 4  },
    ],
    exclude_if: [{ phrase: 'nettoyage', unless: 'ravalement' }],
    intro:      'facade rendering and renovation on a residential house',
    setting:    'exterior',
    secteur:    'facade specialist',
    hasWorkers: false,
    camera:     'standing on pavement, 3–5 m from facade, slightly low angle',
    materials:  ['cement bags', 'render mix', 'plastic sheeting', 'plastic mesh'],
    photo_defects: [
      'chromatic aberration on scaffolding metal poles',
      'JPEG compression noise on flat rendered surface',
    ],
    exclusions: ['pressure washers', 'hoses', 'mixing equipment', 'workers', 'people'],
    states: {
      debut: {
        framing: {
          work_pct:   40,
          foreground: 'protective plastic sheeting taped at the base of the wall, a few cement bags staged',
          midground:  'old facade surface exposed — original render being stripped or cleaned on one section',
          background: 'upper facade intact, roofline, sky',
        },
        debris:      'old render flakes and fine dust on pavement near the stripped section',
        description: 'Surface preparation has started. One section of old render is being removed. Protective sheeting is in place at the base.',
      },
      encours: {
        framing: {
          work_pct:   55,
          foreground: 'cement bags and render bucket at the base, render splashes on protective sheeting',
          midground:  'facade half rendered — fresh pale new render on one section, old weathered surface on the other',
          background: 'roofline, sky, neighbouring house',
        },
        debris:      'render splashes on pavement sheeting, a few empty bags crumpled near the wall',
        description: 'Half the facade has fresh new render. The other half is still old. The contrast is clearly visible. An active professional job.',
      },
      semifinal: {
        framing: {
          work_pct:   60,
          foreground: 'protective sheeting being removed, last cement bag near the wall',
          midground:  'facade mostly covered in fresh render — surface smooth, one section still being finished',
          background: 'roofline, sky',
        },
        debris:      'minimal — sheeting rolled up at the base, one or two empty bags remaining',
        description: 'Most of the facade is freshly rendered. One corner or section is still being smoothed. The surface looks good overall.',
      },
      final: {
        framing: {
          work_pct:   70,
          foreground: 'clean pavement, protective sheeting gone, one bag remains as authentic detail',
          midground:  'complete fresh render — even surface across the full facade, clean around windows',
          background: 'roofline, sky, neighbouring property',
        },
        debris:      'nearly none — pavement clean, one leftover bag near the wall',
        description: 'Facade renovation complete. Fresh render covers the full surface evenly. Clean edges around windows. A professional result.',
      },
    },
  },

  peinture: {
    category:         'peinture',
    priority:         2,
    service_keywords: [
      { phrase: 'peinture interieure', score: 13 },
      { phrase: 'peinture exterieure', score: 12 },
      { phrase: 'peinture exterieur',  score: 12 },
      { phrase: 'peinture facade',     score: 11 },
      { phrase: 'peinture mur',        score: 11 },
      { phrase: 'peinture plafond',    score: 11 },
      { phrase: 'peintur',             score: 1  },
      { phrase: 'peint',               score: 1  },
    ],
    exclude_if: [],
    intro:      'exterior facade painting on a residential house',
    setting:    'exterior',
    secteur:    'painter',
    hasWorkers: false,
    camera:     'standing on pavement, 3–5 m from facade, straight-on or slight diagonal',
    materials:  ['paint cans', 'masking tape', 'drop cloths', 'roller trays'],
    photo_defects: [
      'flat overcast light causing slight overexposure on white painted surface',
      'chromatic aberration on the sharp painted edge between old and new colour',
    ],
    exclusions: ['ladders', 'paint rollers', 'brushes', 'buckets', 'workers', 'people'],
    states: {
      debut: {
        framing: {
          work_pct:   45,
          foreground: 'drop cloths spread at the base of the wall, masking tape on window frames',
          midground:  'facade fully masked and prepared, not yet painted — old paint surface visible',
          background: 'neighbouring facade, garden hedge, pale sky',
        },
        debris:      'masking tape scraps on the ground, protective film around windows',
        description: 'Surface preparation is done. Masking tape on window frames and drop cloths on the ground. Painting has not yet started.',
      },
      encours: {
        framing: {
          work_pct:   55,
          foreground: 'drop cloths on ground with paint drips, used roller tray at the wall base',
          midground:  'facade half painted — visible line between fresh colour and old weathered surface',
          background: 'neighbouring facade and sky',
        },
        debris:      'drop cloths on ground with paint drips, empty paint cans stacked at wall base',
        description: 'Painting is underway. Half the facade shows the new colour. The line between fresh and old paint is clearly visible.',
      },
      semifinal: {
        framing: {
          work_pct:   60,
          foreground: 'drop cloths still in place, a few paint cans near the wall',
          midground:  'facade almost fully painted in new colour, one small section or trim still in progress',
          background: 'clean roofline, sky',
        },
        debris:      'a few paint cans and the drop cloth remain, driveway otherwise clear',
        description: 'Almost done. The facade is mostly the new colour. A corner or trim section is still being finished. The drop cloths are still down.',
      },
      final: {
        framing: {
          work_pct:   70,
          foreground: 'clean pavement, drop cloths removed, one paint can left as authentic detail',
          midground:  'complete fresh facade — even new colour, clean edges around windows and trim',
          background: 'neighbouring facades, garden, sky',
        },
        debris:      'nearly none — pavement clean, one leftover paint can near the wall',
        description: 'Painting complete. The facade has a fresh even coat, clean edges. A professional finish ready to show to clients.',
      },
    },
  },

  nettoyage: {
    category:         'nettoyage',
    priority:         4,
    service_keywords: [
      { phrase: 'nettoyage facade',       score: 14 },
      { phrase: 'nettoyage terrasse',     score: 13 },
      { phrase: 'nettoyage dallage',      score: 13 },
      { phrase: 'nettoyage paves',        score: 13 },
      { phrase: 'traitement antimousse',  score: 12 },
      { phrase: 'traitement anti-mousse', score: 12 },
      { phrase: 'traitement anti mousse', score: 12 },
      { phrase: 'hydrofuge',              score: 11 },
      { phrase: 'nettoyage',              score: 7  },
    ],
    exclude_if: [],
    intro:      'pressure washing and surface cleaning at a residential property',
    setting:    'exterior',
    secteur:    'cleaning specialist',
    hasWorkers: false,
    camera:     'standing 4–6 m from the surface, eye level, full extent of the cleaned area visible',
    materials:  ['cleaning product residue', 'moss and dirt runoff', 'water channels on pavement'],
    photo_defects: [
      'wet surface reflection causing overexposed bright patches',
      'slight motion blur from water spray movement',
    ],
    exclusions: ['pressure washer machine', 'hoses', 'safety gear', 'workers', 'people'],
    states: {
      debut: {
        framing: {
          work_pct:   40,
          foreground: 'one small strip already bright and clean — sharp contrast against surrounding dark moss and grime',
          midground:  'most of the surface still heavily soiled — green moss patches and grey dirt on driveway, terrace or facade',
          background: 'house facade, garden boundary, or garden wall',
        },
        debris:      'dirty water runoff near the cleaned strip, light moss flakes on the ground',
        description: 'Cleaning has just started. One small patch is visibly clean — the contrast with the surrounding dirty surface is sharp.',
      },
      encours: {
        framing: {
          work_pct:   55,
          foreground: 'wet surface with runoff channels carrying moss and grime at the clean/dirty boundary',
          midground:  'half the surface cleaned — clearly demarcated line between bright clean and dark dirty areas',
          background: 'remaining dirty surface, house wall or fence',
        },
        debris:      'dirty water and moss debris running off the cleaned section edge',
        description: 'Half the surface is clean. The contrast between the cleaned and dirty halves is striking. Active work in progress.',
      },
      semifinal: {
        framing: {
          work_pct:   55,
          foreground: 'nearly all surface clean, isolated stain patches near edges and expansion joints',
          midground:  'bright clean surface covering most of the area, small dark patches at corners or edges',
          background: 'house facade, garden boundary or low wall',
        },
        debris:      'minimal — a few remaining moss patches near corners and along joints',
        description: 'Almost done. The surface is mostly bright and clean. A few stubborn patches remain near the edges.',
      },
      final: {
        framing: {
          work_pct:   70,
          foreground: 'clean dry surface — uniform colour, no moss, no grime, sharp tile joints visible',
          midground:  'full clean area — even colour throughout, clean straight edges',
          background: 'house facade, garden, clean driveway or terrace',
        },
        debris:      'none — surface completely clean and dry',
        description: 'Cleaning complete. The surface is uniformly clean with no moss or staining. A professional result.',
      },
    },
  },

};

export const SITE_REALISM_FACADE = {
  ravalement: {
    scenarios: [

      // --- ravalement complet / enduit de façade ---
      {
        _for:          'ravalement|renovation.*facade|crepi|enduit.*mono|enduit.*hydr|ite|enduit',
        scene_note:    'fresh render being applied to the facade — large float spreading a thick render coat across a section, trowel marks still wet, scaffolding board at the work level',
        scene_camera:  'standing back from the scaffold, framing the worker applying render to a section with the fresh render surface beside the older section',
        scene_framing: {
          work_pct:   65,
          foreground: 'render hawk and trowel on the scaffold board beside the freshly rendered section',
          midground:  'facade — freshly rendered section (pale and smooth) beside the old weathered render',
          background: 'scaffold tube and board structure, garden or street level below',
        },
        scene_debris:  'render drip at the base of the freshly applied section, empty render bag folded on the scaffold',
        scene_exclude: ['cleaning equipment', 'pressure washer', 'roofing materials', 'finished clean facade without any work visible'],
        tools: [
          'large render float spreading fresh render across the facade section',
          'hawk and trowel on the scaffold board beside the work',
          'render mixing bucket with mortar residue at the scaffold edge',
        ],
        protections: [
          'plastic sheeting taped over the window frame and glass',
          'wooden board protecting the garden bed at the base of the wall',
          'kraft paper taped along the window frame edge for a clean render line',
        ],
        chantier_details: [
          'fresh render surface pale and smooth — trowel marks still visible and wet',
          'old render beside the new section — darker and textured from weathering',
          'render drip at the base of the fresh section from the application',
        ],
      },
      {
        _for:          'ravalement|renovation.*facade|crepi|enduit.*mono|enduit.*hydr|ite|enduit',
        scene_note:    'facade half-rendered — right section freshly applied render pale and smooth, left section old weathered render still dirty and textured, clear vertical demarcation line',
        scene_camera:  'standing back from the facade, framing the full wall height with the half-rendered/half-old contrast clearly visible',
        scene_framing: {
          work_pct:   55,
          foreground: 'scaffold base on the ground, mortar bucket and tools at the work station',
          midground:  'facade — right half freshly rendered pale and smooth, left half old render weathered and dirty — vertical division line sharp',
          background: 'sky above the roof edge, garden or street beside the facade',
        },
        scene_debris:  'render drips at the demarcation line, empty render bags on the scaffold',
        scene_exclude: ['pressure washer', 'roofing', 'fully finished clean facade', 'interior painting'],
        tools: [
          'render hawk and trowel at the work station on the scaffold',
          'straight edge rule leaning against the freshly rendered panel',
          'spray bottle for dampening the substrate on the scaffold board',
        ],
        protections: [
          'plastic sheeting taped over all windows on the rendered section',
          'scaffold debris netting at the working level',
        ],
        chantier_details: [
          'sharp vertical demarcation between new pale render and old dirty render',
          'new render side — uniform pale tone, float marks still visible',
          'old render side — darker tone, weathering texture, old paint or staining visible',
        ],
      },
      {
        _for:          'ravalement|renovation.*facade|crepi|enduit.*mono|enduit.*hydr|ite|enduit',
        scene_note:    'fresh render being finished with a sponge float — circular float marks being worked into the wet surface, texture developing as the render tightens',
        scene_camera:  'close-up at the render surface, framing the sponge float being worked in circular passes across the wet render',
        scene_framing: {
          work_pct:   70,
          foreground: 'sponge float in circular motion on the wet render surface — aggregate texture being raised',
          midground:  'freshly floated section — uniform aggregate texture developing beside the un-floated fresh render',
          background: 'scaffold board, facade wall above',
        },
        scene_debris:  'render laitance on the float face from the texturing pass',
        scene_exclude: ['pressure washer', 'roofing', 'interior painting', 'stone wall visible'],
        tools: [
          'sponge float being worked in circular passes on the wet render surface',
          'trowel on the scaffold board beside the floated section',
        ],
        protections: [],
        chantier_details: [
          'aggregate texture developing on the floated section — granular finish building',
          'un-floated fresh render beside the active section — smooth comparison visible',
          'render laitance on the float face from the circular passes',
        ],
      },

      // --- réparation de fissures ---
      {
        _for:          'fissure|reprise.*local|traitement.*fissur|rebouchage',
        scene_note:    'facade crack repair — wide crack opened and cleaned, repair mortar being drawn flush with the surrounding render by a pointing trowel',
        scene_camera:  'close-up at the crack, framing the pointing trowel working the repair mortar flush with the facade surface',
        scene_framing: {
          work_pct:   75,
          foreground: 'crack in the facade render — fresh repair mortar being smoothed flush by the pointing trowel',
          midground:  'surrounding facade render — older and slightly darker, the repair mortar visibly lighter in colour',
          background: 'facade wall extending on both sides, window or corner at the edge',
        },
        scene_debris:  'old render fragments chipped from the crack edges on the ground below the repair',
        scene_exclude: ['full section render application', 'pressure washer', 'roofing', 'interior painting'],
        tools: [
          'pointing trowel drawing repair mortar flush with the surrounding render',
          'small cold chisel on the ground — used to open the crack before filling',
        ],
        protections: [],
        chantier_details: [
          'fresh repair mortar in the crack — slightly lighter in colour than the surrounding render',
          'crack edges showing the render depth — crack was opened and cleaned before repair',
          'old render fragments on the ground below from the preparation',
        ],
      },
      {
        _for:          'fissure|reprise.*local|traitement.*fissur|rebouchage',
        scene_note:    'crack repair mesh being embedded — fibreglass mesh being pressed into fresh repair render over a repaired crack on the facade surface',
        scene_camera:  'close-up at the facade, framing the fibreglass mesh being embedded in the fresh render over the crack',
        scene_framing: {
          work_pct:   70,
          foreground: 'fibreglass mesh being pressed into the fresh skim render over the repaired crack',
          midground:  'render skim around the mesh — mesh slightly submerged, render being trowelled over',
          background: 'facade wall extending, the repaired area isolated on the larger surface',
        },
        scene_debris:  'mesh offcut on the scaffold beside the repair area',
        scene_exclude: ['full section render', 'pressure washer', 'roofing', 'interior painting'],
        tools: [
          'trowel pressing the fibreglass mesh into the fresh render skim',
          'mesh roll on the scaffold board beside the repair',
        ],
        protections: [],
        chantier_details: [
          'fibreglass mesh being pressed into the render — mesh pattern just visible below the render surface',
          'render skim surrounding the mesh — trowelled smooth over the mesh edges',
          'repair area isolated on the facade — localised repair with no disturbance to adjacent render',
        ],
      },

      // --- peinture façade ---
      {
        _for:          'peinture.*facade|peinture.*ext|peint.*facade',
        scene_note:    'facade paint being applied — roller on an extension pole working across the wall, freshly painted section (new colour) beside the old paint still showing below the roller',
        scene_camera:  'standing back from the facade, framing the roller mid-stroke with the painted upper section and old lower section visible',
        scene_framing: {
          work_pct:   60,
          foreground: 'paint tray and extension pole base at the scaffold level, drop sheet below the wall',
          midground:  'facade — upper section freshly painted in new colour, lower section old paint colour still showing',
          background: 'full facade width, windows protected, sky above the roof edge',
        },
        scene_debris:  'paint drip at the leading edge of the paint line',
        scene_exclude: ['render application', 'pressure washer', 'roofing', 'interior painting'],
        tools: [
          'roller on an extension pole being pushed across the facade surface',
          'paint tray at the scaffold level beside the roller',
        ],
        protections: [
          'plastic sheeting taped over the window glass',
          'masking tape along the window frame edge',
          'drop sheet on the ground below the wall',
        ],
        chantier_details: [
          'fresh paint on the upper facade — clean new colour uniform and wet-looking',
          'old paint colour still visible below the paint line',
          'window protection tape line clearly visible at the frame edge',
        ],
      },
      {
        _for:          'peinture.*facade|peinture.*ext|peint.*facade',
        scene_note:    'facade almost fully painted — last section being finished at the edge, fresh uniform colour covering most of the facade, stepladder at the final corner',
        scene_camera:  'standing back, framing the nearly fully painted facade with the ladder and the final corner section being finished',
        scene_framing: {
          work_pct:   50,
          foreground: 'ladder at the final section corner, paint tray on the ladder shelf',
          midground:  'facade almost entirely in new colour — final small section still unpainted at the corner edge',
          background: 'full facade width, garden, street or adjacent facade visible',
        },
        scene_debris:  'paint drip on the tarp below the ladder at the final section',
        scene_exclude: ['render application', 'pressure washer', 'roofing', 'interior painting'],
        tools: [
          'small brush cutting in at the final edge and corner',
          'stepladder at the final corner section',
        ],
        protections: [
          'tarp on the ground at the ladder base',
          'window tape protection still in place',
        ],
        chantier_details: [
          'facade nearly fully in new colour — last unpainted section clearly visible at the corner',
          'window tape lines sharp — clean paint edge at every frame',
          'fresh colour uniform across the main facade area',
        ],
      },

      // --- traitement humidité ---
      {
        _for:          'humid|traitement.*humid|moisissure|salpetre|infiltrat',
        scene_note:    'water-repellent treatment being applied to a stone or render facade — roller or brush applying the treatment product to the dry surface, product slightly darkening the treated area',
        scene_camera:  'standing back from the facade, framing the roller or brush applying the treatment with the treated section visibly darker than the untreated',
        scene_framing: {
          work_pct:   55,
          foreground: 'treatment product bucket on the ground at the wall base',
          midground:  'facade — treated section slightly darker from the absorbed product beside the dry untreated section',
          background: 'full facade, window and corner visible',
        },
        scene_debris:  'treatment product drip on the wall base below the treated section',
        scene_exclude: ['render application', 'pressure washer', 'roofing', 'interior painting'],
        tools: [
          'roller or brush applying the water-repellent treatment to the facade surface',
          'treatment product bucket on the ground with the label visible',
        ],
        protections: [
          'plastic sheet protecting the garden bed at the wall base',
        ],
        chantier_details: [
          'treated section visibly darker — product absorbed into the render or stone surface',
          'treatment product drip at the base of the treated area',
          'dry untreated section beside — colour difference clearly visible',
        ],
      },

      // --- rénovation pierre / rejointoiement façade ---
      {
        _for:          'pierre.*renov|traitement.*facade.*pierre|rejointoi.*facade|joint.*facade|pierre',
        scene_note:    'stone facade being repointed — pointing trowel pressing fresh grey mortar into raked-out joints between the stone blocks, contrast with the recessed dark old joints below',
        scene_camera:  'close-up at the stone facade, framing the pointing trowel at a joint with the repointed section above and old joints below',
        scene_framing: {
          work_pct:   70,
          foreground: 'pointing trowel pressing fresh mortar into a raked-out joint between stone blocks',
          midground:  'stone facade — repointed upper section with pale flush mortar above, darker recessed old joints below',
          background: 'facade wall extending, scaffold tube at the side',
        },
        scene_debris:  'old mortar fragments on the scaffold board from the raking pass',
        scene_exclude: ['render over stone', 'pressure washer on stone', 'roofing', 'interior painting'],
        tools: [
          'pointing trowel pressing fresh mortar into the raked-out joint',
          'mortar bucket at the scaffold work level',
          'cold chisel and hammer for raking old joints',
        ],
        protections: [],
        chantier_details: [
          'fresh grey mortar joints on the upper section — pale and flush with the stone faces',
          'old dark recessed joints on the lower section — clearly depleted and weathered',
          'old mortar fragments on the scaffold board from the joint raking',
        ],
      },
      {
        _for:          'pierre.*renov|traitement.*facade.*pierre|rejointoi.*facade|joint.*facade|pierre',
        scene_note:    'stone facade after partial repointing — lower two-thirds freshly jointed, upper section still with old black recessed joints, scaffold beside the wall at mid-height',
        scene_camera:  'standing back from the facade, framing the full wall height with the repointed lower section and the old-jointed upper section',
        scene_framing: {
          work_pct:   55,
          foreground: 'scaffold base and mortar bucket on the ground at the wall base',
          midground:  'stone facade — lower two-thirds repointed (pale grey flush mortar), upper third old black recessed joints — horizontal division clear',
          background: 'roof edge above, garden or street at the side',
        },
        scene_debris:  'old mortar raking fragments on the ground below the work area',
        scene_exclude: ['render over stone', 'pressure washer', 'roofing', 'interior painting'],
        tools: [
          'scaffold at mid-height beside the wall — work above the repointed section ongoing',
          'mortar bucket on the scaffold board at the current work level',
        ],
        protections: [],
        chantier_details: [
          'clear horizontal demarcation between repointed lower section and old-jointed upper section',
          'repointed section — pale flush joints, clean stone faces',
          'old section — black recessed joints, deeply weathered mortar',
        ],
      },

      // Fallback
      {
        scene_note:    'facade work in progress — wall with partially applied fresh render or paint, hawk and trowel resting against the base, window and garden bed protected',
        scene_camera:  'standing back from the facade, framing the partial render or paint work with tools visible at the base',
        scene_framing: {
          work_pct:   50,
          foreground: 'hawk and trowel resting against the wall at the work section, render bucket on the ground',
          midground:  'facade — fresh render or paint on one section, old surface on the adjacent section',
          background: 'full facade, scaffold tube visible, garden or street at the base',
        },
        scene_debris:  'mortar drip at the base of the freshly rendered section',
        scene_exclude: ['pressure washer', 'roofing', 'interior painting'],
        tools: [
          'hawk and trowel resting against the wall at the work section',
          'plastic mixing bucket with mortar residue beside the wall base',
          'straight edge rule leaning against the freshly rendered panel',
        ],
        protections: [
          'plastic sheeting draped and taped over the window opening',
          'wooden board protecting the garden bed at the base of the wall',
        ],
        chantier_details: [
          'fresh render patch on the facade showing trowel lines still wet',
          'empty mortar bag folded on the ground near the wall base',
          'mortar splash marks on the concrete apron at the wall base',
        ],
      },
    ],
    tools: [
      'hawk and trowel resting against the wall at the work section',
      'plastic mixing bucket with mortar residue beside the wall base',
      'mixing paddle leaning against the bucket handle',
      'spray bottle for dampening the substrate on the ground nearby',
      'straight edge rule leaning against the freshly rendered panel',
    ],
    protections: [
      'plastic sheeting draped and taped over the window opening',
      'wooden board protecting the garden bed at the base of the wall',
      'kraft paper strip taped along the window frame edge',
    ],
    chantier_details: [
      'fresh render patch on the facade showing trowel lines still wet',
      'empty mortar bag folded on the ground near the wall base',
      'chalk reference marks on the wall showing render depth guide lines',
      'mortar splash marks on the concrete apron at the wall base',
      'water bucket with a sponge resting on the rim beside the wall',
    ],
  },

  peinture: {
    scenarios: [

      // --- peinture intérieure (murs) ---
      {
        _for:          'interieur|interieure|salon|chambre|cuisine|couloir|cage.*escal|boiserie.*int|papier.*peint',
        setting:       'interior',
        scene_note:    'interior wall being painted — roller working across a half-painted wall, fresh new colour on the upper half, old paint still visible on the lower half, roller tray on the drop cloth',
        scene_camera:  'standing in the room, framing the half-painted wall with the roller mid-stroke and the drop cloth on the floor',
        scene_framing: {
          work_pct:   65,
          foreground: 'canvas drop cloth on the floor, roller tray with fresh paint beside the wall',
          midground:  'half-painted wall — new colour above the mid-line, old colour below, paint edge sharp',
          background: 'room interior — door frame or window visible at the side',
        },
        scene_debris:  'paint drip on the drop cloth below the roller line, thin wet brush stroke at the unpainted edge',
        scene_exclude: ['exterior facade painting', 'masonry construction', 'roofing', 'pressure washer', 'wet render on wall'],
        tools: [
          'paint roller mid-stroke on the wall surface',
          'roller tray with fresh paint on the drop cloth',
          'flat brush on the rim of the tray for cutting-in',
        ],
        protections: [
          'canvas drop cloth spread across the full floor below the painted wall',
          'masking tape strip along the ceiling junction and skirting board',
          'plastic sheet over nearby furniture',
        ],
        chantier_details: [
          'fresh paint edge sharp between new and old colour at the mid-wall line',
          'roller texture marks visible at the leading edge of the painted section',
          'paint drips on the drop cloth below the active stroke area',
        ],
      },
      {
        _for:          'interieur|interieure|salon|chambre|cuisine|couloir|cage.*escal|boiserie.*int|papier.*peint',
        setting:       'interior',
        scene_note:    'room being prepared for painting — canvas drop cloth covering the full floor, masking tape along the skirting board edge, unpainted wall above ready, paint tin open on the cloth',
        scene_camera:  'standing in the doorway, framing the drop-cloth-covered room with masking tape along all edges and the open paint tin',
        scene_framing: {
          work_pct:   50,
          foreground: 'canvas drop cloth covering the full floor — taped at the skirting board base',
          midground:  'unpainted walls above the masking tape line, window frame masked with tape and paper',
          background: 'far wall and ceiling visible, furniture pushed to the room centre and covered',
        },
        scene_debris:  'masking tape roll on the floor near the skirting, torn tape packaging on the drop cloth',
        scene_exclude: ['exterior painting', 'masonry construction', 'roofing', 'pressure washer'],
        tools: [
          'masking tape strip freshly applied along the skirting board edge',
          'paint tin open on the drop cloth, stir stick resting on the lid',
          'roller and tray on the cloth ready to start',
        ],
        protections: [
          'canvas drop cloth covering the full floor area — taped at the edges',
          'masking tape along all skirting boards, window frames, and ceiling junction',
          'plastic sheet over furniture pushed to the room centre',
        ],
        chantier_details: [
          'masking tape clearly applied along all edges — skirting, ceiling junction, window frames',
          'drop cloth on the full floor — room fully protected before painting starts',
          'furniture moved to centre and covered — room prepared for painting',
        ],
      },
      {
        _for:          'interieur|interieure|salon|chambre|cuisine|couloir|cage.*escal|boiserie.*int|papier.*peint',
        setting:       'interior',
        scene_note:    'interior wall corner being cut in — flat brush cutting a precise line at the inside corner, both walls freshly painted around the angle, drop cloth on the floor',
        scene_camera:  'close-up at the inside corner, framing the brush at the angle making the cut-in line',
        scene_framing: {
          work_pct:   75,
          foreground: 'flat brush at the inside corner — cutting a precise paint line between the two adjacent wall surfaces',
          midground:  'both wall surfaces freshly painted around the corner — uniform colour on both planes',
          background: 'room interior, skirting board and floor at the base',
        },
        scene_debris:  'thin wet paint brush stroke still wet at the corner cut-in line, paint drip at the skirting below',
        scene_exclude: ['exterior painting', 'masonry', 'roofing', 'pressure washer'],
        tools: [
          'flat brush making the cut-in line at the inside corner',
          'small paint pot beside the brush for the cutting-in work',
        ],
        protections: [
          'masking tape along the skirting board below the corner',
          'drop cloth at the base of the wall',
        ],
        chantier_details: [
          'precise cut-in line at the inside corner — brush work clean',
          'both wall surfaces freshly painted — uniform tone, no runs',
          'brush held close to the wall surface at the angle for control',
        ],
      },

      // --- peinture plafond ---
      {
        _for:          'plafond',
        setting:       'interior',
        scene_note:    'ceiling being painted with an extension roller — roller on a long pole being pushed across the flat ceiling, freshly painted section white and wet beside the old unpainted area still warm-toned',
        scene_camera:  'standing in the room looking up, framing the roller on the extension pole being pushed across the ceiling',
        scene_framing: {
          work_pct:   65,
          foreground: 'canvas drop cloth covering the entire floor — furniture removed or covered',
          midground:  'extension roller on a long pole being pushed across the ceiling surface',
          background: 'ceiling — freshly painted white section beside the old unpainted area still showing the base tone',
        },
        scene_debris:  'paint fleck on the drop cloth from the ceiling roller, thin drip on the wall at the ceiling junction',
        scene_exclude: ['wall painting', 'exterior painting', 'masonry', 'roofing', 'pressure washer'],
        tools: [
          'roller on an extension pole being pushed across the ceiling surface',
          'roller tray with white paint on the drop cloth at the room side',
        ],
        protections: [
          'full floor coverage with canvas drop cloth — no floor visible',
          'masking tape along the ceiling-wall junction',
          'ceiling light fitting wrapped in plastic sheeting',
        ],
        chantier_details: [
          'fresh white ceiling paint wet and shiny beside the old warm-toned unpainted area',
          'roller marks visible in the freshly applied paint — normal texture',
          'paint fleck on the drop cloth from the roller',
        ],
      },
      {
        _for:          'plafond',
        setting:       'interior',
        scene_note:    'ceiling paint almost complete — last strip being finished at the room perimeter with a short roller, ceiling junction cutting-in done, full floor drop cloth visible below',
        scene_camera:  'standing at the room edge, framing the short roller finishing the perimeter strip with the drop cloth below',
        scene_framing: {
          work_pct:   55,
          foreground: 'canvas drop cloth on the floor, roller tray with white paint at the room edge',
          midground:  'short roller finishing the last ceiling strip at the wall junction — almost complete',
          background: 'freshly painted ceiling — uniform white across the full room area',
        },
        scene_debris:  'paint drip at the ceiling-wall junction from the perimeter work',
        scene_exclude: ['wall painting', 'exterior', 'masonry', 'roofing'],
        tools: [
          'short roller finishing the perimeter strip at the ceiling edge',
          'flat brush on the drop cloth from the cutting-in pass',
        ],
        protections: [
          'full drop cloth on the floor — no boards visible',
          'masking tape at the ceiling-wall junction',
        ],
        chantier_details: [
          'ceiling almost uniformly white — last strip at the perimeter being finished',
          'cutting-in line at the ceiling junction clean — brush work done before the roller pass',
          'drop cloth fully covering the floor — complete room protection',
        ],
      },

      // --- peinture extérieure ---
      {
        _for:          'exterieur|exterieure|facade.*peint|volet|portail|cloture|boiserie.*ext|sous.*face|soffit',
        setting:       'exterior',
        scene_note:    'timber shutters removed and laid on trestles outdoors — old paint being sanded before repainting, both shutters side by side on the outdoor workstation, sanding dust visible',
        scene_camera:  'standing beside the trestles, framing both shutters flat on the workstation with the sanding equipment',
        scene_framing: {
          work_pct:   65,
          foreground: 'two timber shutters flat on trestles — old paint surface being sanded, sanding dust visible',
          midground:  'electric sander or sanding block in use on the shutter surface',
          background: 'house wall with the empty shutter mounting brackets, garden beyond',
        },
        scene_debris:  'sanding dust on the shutter surface and on the ground below the trestles',
        scene_exclude: ['shutters painted and hung', 'interior painting', 'masonry', 'roofing', 'pressure washer'],
        tools: [
          'electric orbital sander in use on the shutter surface',
          'sanding block beside the sander for the hand-finish areas',
          'trestles holding both shutters at working height',
        ],
        protections: [
          'dust sheet under the trestles catching sanding dust',
          'safety goggles on the worker sanding',
        ],
        chantier_details: [
          'old paint surface being sanded — surface scratched and abraded to take new paint',
          'sanding dust visible on the shutter surface and below',
          'empty mounting brackets on the house wall where the shutters were removed',
        ],
      },
      {
        _for:          'exterieur|exterieure|facade.*peint|volet|portail|cloture|boiserie.*ext|sous.*face|soffit',
        setting:       'exterior',
        scene_note:    'exterior facade paint in progress — upper section freshly painted in new colour, lower section still original paint, clear horizontal boundary, ladder and paint tray beside the wall',
        scene_camera:  'standing back from the facade, framing the full wall height with the painted upper section and the old lower section, ladder beside the work',
        scene_framing: {
          work_pct:   60,
          foreground: 'ladder base against the facade, paint tray and roller on the ground below',
          midground:  'facade — upper section freshly painted in new colour, lower section old paint still showing',
          background: 'garden surroundings, sky above the roof edge',
        },
        scene_debris:  'paint drip at the boundary line between old and new paint',
        scene_exclude: ['interior painting', 'masonry construction', 'roofing tiles', 'pressure washer'],
        tools: [
          'roller on an extension pole at the ladder working height',
          'paint tray with exterior paint on the step of the ladder',
          'masking tape strip along the window frame edge',
        ],
        protections: [
          'plastic sheeting taped over the window glass',
          'tarp on the ground below the wall to catch paint drips',
          'masking tape along window frames and door frames',
        ],
        chantier_details: [
          'fresh paint on the upper facade — clean new colour uniform and wet',
          'clear horizontal boundary between new and old paint at the work line',
          'paint drip at the boundary from the active roller edge',
        ],
      },
      {
        _for:          'exterieur|exterieure|facade.*peint|volet|portail|cloture|boiserie.*ext|sous.*face|soffit',
        setting:       'exterior',
        scene_note:    'garden gate being painted — masking tape along the adjacent wall junction, tarp on the ground below, new paint colour on the upper bars with old finish still on the lower section',
        scene_camera:  'standing in front of the gate, framing the painted upper bars with the masking tape at the wall junction and the tarp below',
        scene_framing: {
          work_pct:   60,
          foreground: 'tarp on the ground below the gate, paint brush on the tarp beside the small paint pot',
          midground:  'gate — upper bars freshly painted in new colour, lower section old finish still showing',
          background: 'masking tape at the wall junction beside the gate frame, garden path beyond',
        },
        scene_debris:  'paint drip at the boundary between new and old finish on a vertical bar',
        scene_exclude: ['interior painting', 'masonry', 'roofing', 'pressure washer', 'overspray on plants'],
        tools: [
          'brush applying paint to the gate bar surface',
          'small paint pot balanced on the gate frame beside the brush',
          'masking tape along the adjacent wall junction',
        ],
        protections: [
          'tarp on the ground below the gate catching drips',
          'masking tape protecting the adjacent wall and hinge hardware',
        ],
        chantier_details: [
          'upper gate bars freshly painted — new colour uniform and wet',
          'old paint colour still visible on the lower bars — work in progress',
          'masking tape at the wall junction clearly protecting adjacent surfaces',
        ],
      },

      // Fallback
      {
        scene_note:    'painting work in progress — wall section partially covered with fresh paint, canvas drop cloth on the floor, roller and paint tray visible',
        scene_camera:  'standing in the room or in front of the wall, framing the partially painted surface with the roller and tray visible',
        scene_framing: {
          work_pct:   55,
          foreground: 'canvas drop cloth on the floor, roller tray with paint residue beside the wall',
          midground:  'wall surface — partly freshly painted, partly old base coat still showing',
          background: 'room interior or exterior surroundings, door or window visible at the side',
        },
        scene_debris:  'paint drip on the drop cloth below the active stroke area',
        scene_exclude: ['masonry construction', 'roofing', 'pressure washer', 'wet render on wall'],
        tools: [
          'paint roller with extension pole resting against the wall',
          'flat brush balanced on the edge of an open paint can',
          'roller tray with paint residue on the floor',
        ],
        protections: [
          'canvas drop cloth spread across the floor below the painted wall',
          'masking tape strip along the ceiling junction or skirting board edge',
        ],
        chantier_details: [
          'paint drip marks on the drop cloth below the working section',
          'fresh wet brush stroke visible at the unpainted edge of the wall',
          'roller texture marks visible near the unpainted corner',
        ],
      },
    ],
    tools: [
      'paint roller with extension pole resting against the wall',
      'flat brush balanced on the edge of an open paint can',
      'roller tray with paint residue on the floor',
      'stir stick resting on the paint can lid',
      'masking tape roll on the floor near the skirting board',
      'small paint scraper on the windowsill',
    ],
    protections: [
      'canvas drop cloth spread across the floor below the painted wall',
      'plastic sheeting draped over furniture or adjacent built-in fixtures',
      'masking tape strip along the ceiling junction or skirting board edge',
    ],
    chantier_details: [
      'paint drip marks on the drop cloth below the working section',
      'fresh wet brush stroke visible at the unpainted edge of the wall',
      'empty paint tin beside the opened one on the floor',
      'roller texture marks visible near the unpainted corner',
      'crumpled painter tape strip on the drop cloth',
    ],
  },

  nettoyage: {
    scenarios: [

      // --- nettoyage façade ---
      {
        _for:          'facade|nettoy.*facade|traitement.*facade|hydrofuge.*facade',
        scene_note:    'facade half-cleaned — left section bright and clean after the pressure wash, right section still dark with algae and pollution streaks, sharp vertical cleaning line between them',
        scene_camera:  'standing back from the facade, framing the full wall height with the sharp cleaning boundary line between the cleaned and uncleaned sections',
        scene_framing: {
          work_pct:   60,
          foreground: 'ground at the base of the wall — dirty water runoff and moss fragments below the uncleaned section',
          midground:  'facade — left half clean and bright, right half dark with algae and staining — sharp vertical division line',
          background: 'roof edge above, garden or pavement at the sides',
        },
        scene_debris:  'dirty brown water running down from the impact point, algae and grime residue at the base of the uncleaned section',
        scene_exclude: ['terrace or paving in focus', 'pressure washer on garden path', 'roofing tiles', 'interior painting', 'render application'],
        tools: [
          'high-pressure lance resting against the wall between passes',
          'high-pressure hose coiled on the ground beside the machine',
        ],
        protections: [
          'plastic bag taped over the exterior electrical socket at the facade',
          'plastic sheeting taped over the window glass and frame',
          'tarp on the garden bed at the base of the cleaned section',
        ],
        chantier_details: [
          'sharp vertical cleaning line — bright facade on the cleaned side, dark and stained on the other',
          'dirty water running down from the impact zone below the uncleaned section',
          'algae and grime residue at the base of the wall below the uncleaned section',
        ],
      },
      {
        _for:          'facade|nettoy.*facade|traitement.*facade|hydrofuge.*facade',
        scene_note:    'facade being cleaned with a high-pressure lance — jet directed at the facade surface, dirty water running down in dark rivulets from the impact point',
        scene_camera:  'standing to the side, framing the lance directing the jet at the facade with dirty water running down from the impact zone',
        scene_framing: {
          work_pct:   65,
          foreground: 'dirty water runoff channel on the ground at the wall base, algae and grime fragments at the base',
          midground:  'facade surface — jet impact zone visible with dirty water running downward from it',
          background: 'full facade height, windows protected, garden or street at the side',
        },
        scene_debris:  'algae and staining residue being dislodged at the jet impact point, dirty water rivulets on the facade surface',
        scene_exclude: ['terrace or paving as main subject', 'roofing', 'interior painting', 'render application'],
        tools: [
          'high-pressure lance directing jet at the facade surface',
          'pressure washer hose running along the ground to the machine',
        ],
        protections: [
          'plastic sheeting taped over the windows in the cleaned section',
          'plastic bag over the exterior electrical socket',
          'tarp protecting garden plants at the base of the facade',
        ],
        chantier_details: [
          'jet impact zone visible on the facade — dirty water running from it downward',
          'algae and staining being dislodged at the impact point',
          'window protection sheeting clearly visible beside the cleaned section',
        ],
      },
      {
        _for:          'facade|nettoy.*facade|traitement.*facade|hydrofuge.*facade',
        scene_note:    'facade cleaning setup — plastic sheet protecting windows, tarp on the garden bed, pressure washer on the ground, facade clearly dirty with algae and pollution streaks above the protected section',
        scene_camera:  'standing back, framing the protected facade section with the cleaning equipment on the ground and the dirty facade above',
        scene_framing: {
          work_pct:   45,
          foreground: 'tarp on the garden bed at the wall base, pressure washer on the ground with hose coiled beside it',
          midground:  'facade — window protected by plastic sheet, facade above dirty with algae and dark streaks',
          background: 'full facade height, roof edge above, surroundings at the side',
        },
        scene_debris:  'light algae and dust debris on the tarp from the initial test spray',
        scene_exclude: ['terrace or paving as main subject', 'interior painting', 'roofing', 'render application'],
        tools: [
          'pressure washer on the ground — setup ready to begin',
          'high-pressure hose coiled beside the machine',
          'lance resting against the wall between uses',
        ],
        protections: [
          'plastic sheet taped over the window glass and frame',
          'tarp protecting the garden bed at the wall base',
          'plastic bag taped over the exterior socket',
        ],
        chantier_details: [
          'facade clearly dirty above the protected section — algae and pollution streaks visible',
          'window protection plastic sheet and tape clearly applied before cleaning',
          'pressure washer and hose ready on the ground — setup complete',
        ],
      },

      // --- nettoyage terrasse / dallage ---
      {
        _for:          'terrasse|dallage|paves|allee|sol.*ext|beton.*ext|nettoy.*terr|nettoy.*dall|nettoy.*pave',
        scene_note:    'terrace half-cleaned — bright clean paving on one half, green moss-covered dark paving on the other, sharp cleaning line across the terrace surface',
        scene_camera:  'standing at the terrace edge, framing the full surface with the bright clean section and the mossy dark section clearly side by side',
        scene_framing: {
          work_pct:   60,
          foreground: 'edge of the terrace — dirty water and dislodged moss fragments at the cleaning line',
          midground:  'terrace surface — clean bright paving on the near half, dark moss-covered paving on the far half — sharp cleaning line',
          background: 'garden boundary, house wall at the far end of the terrace',
        },
        scene_debris:  'dislodged moss clumps at the cleaning line, dirty water runoff on the cleaned section draining toward the edge',
        scene_exclude: ['facade as the main subject', 'garden planting in focus', 'roofing', 'interior', 'render application'],
        tools: [
          'pressure washer lance at the cleaning line, working across the terrace',
          'pressure washer hose running along the terrace edge',
        ],
        protections: [
          'garden furniture moved aside and covered with a tarp at the terrace edge',
        ],
        chantier_details: [
          'sharp cleaning line across the terrace — bright clean paving on one side, moss-covered on the other',
          'dislodged moss clumps at the cleaning line from the jet impact',
          'dirty grey water draining across the cleaned section toward the garden edge',
        ],
      },
      {
        _for:          'terrasse|dallage|paves|allee|sol.*ext|beton.*ext|nettoy.*terr|nettoy.*dall|nettoy.*pave',
        scene_note:    'terrace cleaning — dirty grey water and dislodged moss being pushed toward the drain with a stiff broom, drain grate visible at the low end of the terrace',
        scene_camera:  'standing at the high end of the terrace, framing the stiff broom pushing the dirty water and moss debris toward the drain',
        scene_framing: {
          work_pct:   60,
          foreground: 'stiff broom pushing dirty grey water and moss debris across the freshly cleaned paving',
          midground:  'terrace surface — cleaned paving, dirty water flowing toward the drain at the low end',
          background: 'drain grate at the far end of the terrace, garden beyond',
        },
        scene_debris:  'dirty grey water and dislodged moss being swept toward the drain, moss clumps at the broom head',
        scene_exclude: ['facade as main subject', 'garden planting in focus', 'roofing', 'interior', 'render application'],
        tools: [
          'stiff outdoor broom pushing dirty water and moss to the drain',
          'pressure washer on the ground at the side — used before the sweeping pass',
        ],
        protections: [
          'garden furniture covered and moved to the dry section',
        ],
        chantier_details: [
          'dirty grey water and moss debris being swept toward the drain',
          'cleaned paving bright behind the broom — terrace recovering its original colour',
          'drain grate visible at the low end of the terrace',
        ],
      },
      {
        _for:          'terrasse|dallage|paves|allee|sol.*ext|beton.*ext|nettoy.*terr|nettoy.*dall|nettoy.*pave',
        scene_note:    'terrace nearly fully cleaned — garden furniture moved to one side and covered, freshly cleaned paving bright in the foreground, last section with old moss stains at the back edge',
        scene_camera:  'standing at the clean end of the terrace, framing the bright cleaned paving in the foreground and the remaining mossy section at the far back edge',
        scene_framing: {
          work_pct:   50,
          foreground: 'freshly cleaned bright paving — original paving colour fully restored in the front section',
          midground:  'garden furniture covered and moved to one side of the terrace',
          background: 'last remaining mossy section at the back terrace edge — still to be cleaned',
        },
        scene_debris:  'residual dirty water puddle at the junction between clean and remaining mossy sections',
        scene_exclude: ['facade as main subject', 'roofing', 'interior', 'render application'],
        tools: [
          'pressure washer lance resting at the boundary of the last mossy section',
          'rubber squeegee on the ground for removing pooled water after cleaning',
        ],
        protections: [
          'garden furniture covered with a tarp to one side',
          'tarp at the garden edge protecting plants from the dirty runoff',
        ],
        chantier_details: [
          'bright clean paving in the foreground — original colour fully recovered',
          'remaining mossy dark section at the back — contrast with cleaned area clear',
          'garden furniture moved and covered at the terrace side',
        ],
      },

      // Fallback
      {
        scene_note:    'exterior cleaning in progress — pressure washer equipment on the ground, dark wet cleaning line marking the boundary between cleaned and uncleaned surface areas',
        scene_camera:  'standing back, framing the cleaning equipment on the ground and the surface with the visible cleaning line',
        scene_framing: {
          work_pct:   50,
          foreground: 'pressure washer on the ground, hose coiled beside it',
          midground:  'surface — cleaning line visible between the cleaned bright section and the dirty uncleaned section',
          background: 'site surroundings, wall or garden boundary beyond',
        },
        scene_debris:  'dirty water runoff channel on the terrace or path leading to the drain, leaf and grit debris pushed to the uncleaned edge',
        scene_exclude: ['interior painting', 'render application', 'roofing'],
        tools: [
          'high-pressure lance resting against the wall between uses',
          'high-pressure hose coiled on the ground nearby',
          'trigger handle for the pressure washer resting on the coiled hose',
        ],
        protections: [
          'plastic bag tied over a nearby electrical outlet or exterior socket',
          'garden furniture moved aside and covered with a tarp',
        ],
        chantier_details: [
          'dark wet cleaning line on the surface marking the border between cleaned and uncleaned areas',
          'dirty water runoff channel on the terrace or driveway leading to the drain',
          'leaf and grit debris pushed to the untreated edge',
        ],
      },
    ],
    tools: [
      'high-pressure lance resting against the wall between uses',
      'high-pressure hose coiled on the ground nearby',
      'nozzle fitting resting on a step or ledge',
      'trigger handle for the pressure washer resting on the coiled hose',
    ],
    protections: [
      'plastic bag tied over a nearby electrical outlet or exterior socket',
      'garden furniture moved aside and covered with a tarp',
    ],
    chantier_details: [
      'dark wet cleaning line on the surface marking the border between cleaned and uncleaned areas',
      'dirty water runoff channel on the terrace or driveway leading to the drain',
      'leaf and grit debris pushed to the untreated edge',
      'wet footprints on the path leading away from the cleaned surface',
      'puddle of dark water near the drain grate',
    ],
  },

};
