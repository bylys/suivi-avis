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
      { phrase: 'facade peinture',     score: 11 },
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

      // ─── ENDUIT MONOCOUCHE / HYDRAULIQUE — ENCOURS — GROUND_LEVEL (state_lock, pool_size=4) ────
      // 3 × NO_SCAFFOLD + 1 × READY_SCAFFOLD_BACKGROUND → 75 % / 25 % distribution via seed-pick.
      // Scaffold is NEVER required for these services — only appears in the READY_SCAFFOLD variant.
      {
        _for:                             'enduit.*mono|enduit.*hydr',
        _state_for:                       'encours',
        _scaffold_variant:                'no_scaffold',
        _access_configuration:            'GROUND_LEVEL_FACADE_WORK',
        _access_configuration_source:     'state_lock',
        _access_configuration_randomized: false,
        _visual_family:                   'FACADE-ENDUIT-GROUND',
        scene_note: 'ground-level render application on the lower section of a residential facade — exactly two professional workers standing stably on firm flat ground — Worker 1 presses fresh render onto the lower facade wall with a large metal float (taloche), spreading in steady upward strokes — Worker 2 stands beside Worker 1 and actively assists: refilling the hawk, scooping fresh render from the bucket, retouching the transition edge, or smoothing the applied surface — work zone covers from the base of the wall up to shoulder height — fresh pale render visible on the treated section, old weathered render above and beside it — irregular active transition line clearly visible — no scaffold present',
        scene_camera: 'homeowner smartphone photograph — camera 2–4 m from the wall, eye level, slight diagonal — work zone fills 60–70 % of the frame — both workers\' feet, float in hand, fresh render on wall, and ground-level tools all simultaneously visible — no scaffold in the frame',
        scene_framing: {
          work_pct:   65,
          foreground: 'premixed render bucket and hawk resting on a protective dust sheet at the base of the wall — dried render splashes on the sheet',
          midground:  'Worker 1 standing on firm ground, float pressed against the lower facade, spreading fresh pale render in upward strokes — Worker 2 standing beside Worker 1, holding the loaded hawk or scooping fresh render from the bucket, actively helping — fresh render on the left portion of the zone, old weathered surface still visible on the right — irregular active transition edge clearly visible',
          background: 'upper facade above shoulder height — old weathered render with texture and staining, no fresh render above the work zone — no scaffold in the background',
        },
        scene_debris:  'small render drips at the base of the fresh section, open render bag folded at the bucket foot, kraft paper tape ends hanging from the window frame edge',
        scene_exclude: [
          'scaffold of any kind — no scaffold poles, boards, or towers — work is entirely at ground level without scaffold',
          'ladder used as a workstation — both workers stand on the ground, not on any ladder rungs',
          'work zone above shoulder height — the fresh render must stop below the top of the workers\' natural reach',
          'complete full-facade fresh render covering the entire wall — the old render surface must remain clearly visible above the work zone',
          'narrow linear crack repair — the fresh render must cover a surface area, not a single thin crack line',
          'fully finished clean facade with no active work in progress',
          'interior plastering scene — exterior facade only',
          'pressure washer or cleaning equipment',
          'roofing or roof work visible',
          'only one worker visible — exactly two workers must be present and both actively involved',
        ],
        tools: [
          'large metal float (taloche) held flat against the facade surface by Worker 1 — spreading fresh render in upward strokes',
          'hawk loaded with fresh render in Worker 2\'s hands — ready to pass to Worker 1',
          'premixed render bucket on the dust sheet at their feet',
        ],
        protections: [
          'protective dust sheet laid on the ground at the base of the wall — catches render drips',
          'kraft paper tape along the window or door frame edge closest to the work zone',
        ],
        chantier_details: [
          'fresh pale render surface visible on the treated zone — slightly shiny and wet, float marks still visible',
          'old weathered render above and beside the fresh zone — darker tone, texture from weathering',
          'irregular active transition edge between fresh and old render — natural uneven boundary',
          'exactly two professional workers at ground level — Worker 1 floats render, Worker 2 loads the hawk or retouches the edge',
        ],
      },
      // NO_SCAFFOLD variant B — same doctrine, slight framing variation (counts as 2nd of 3 no-scaffold slots)
      {
        _for:                             'enduit.*mono|enduit.*hydr',
        _state_for:                       'encours',
        _scaffold_variant:                'no_scaffold',
        _access_configuration:            'GROUND_LEVEL_FACADE_WORK',
        _access_configuration_source:     'state_lock',
        _access_configuration_randomized: false,
        _visual_family:                   'FACADE-ENDUIT-GROUND',
        scene_note: 'ground-level enduit or crépi application — two workers at the base of a residential facade, no scaffold — Worker 1 applies fresh render with a float directly on the lower wall section — Worker 2 actively assists from the side: loading the hawk, scooping from the bucket, smoothing the edge — fresh render clearly visible on the treated lower section, old render still covering the upper part — active transition line between old and fresh surface — no elevated access equipment present',
        scene_camera: 'wide smartphone shot from 3–5 m, slight upward angle — both workers and the full work zone visible — no scaffold poles in frame',
        scene_framing: {
          work_pct:   60,
          foreground: 'render bucket, protective sheet, and trowel on the ground between the workers and camera',
          midground:  'Worker 1 pressing float against fresh render on the lower facade — Worker 2 behind or beside Worker 1 with hawk — fresh pale render on lower section, old surface above',
          background: 'upper facade above the work zone — old weathered surface, roofline — no scaffold structure',
        },
        scene_debris:  'render drips on the protective sheet, empty bag rolled at the bucket foot',
        scene_exclude: [
          'any scaffold structure — this scene has no scaffold at all',
          'ladder used as a workstation',
          'work above shoulder height',
          'fully finished facade',
          'only one worker',
        ],
        tools: [
          'large metal float in Worker 1\'s hands — pressed flat against the facade',
          'hawk loaded with fresh render held by Worker 2',
          'render bucket on protective sheet at their feet',
        ],
        protections: [
          'protective dust sheet on the ground at the base of the wall',
        ],
        chantier_details: [
          'fresh render on lower facade section — wet, with float marks',
          'old weathered render above and beside the fresh zone',
          'two workers at ground level, no elevated equipment',
        ],
      },
      // NO_SCAFFOLD variant C — third no-scaffold slot for 75 % weight
      {
        _for:                             'enduit.*mono|enduit.*hydr',
        _state_for:                       'encours',
        _scaffold_variant:                'no_scaffold',
        _access_configuration:            'GROUND_LEVEL_FACADE_WORK',
        _access_configuration_source:     'state_lock',
        _access_configuration_randomized: false,
        _visual_family:                   'FACADE-ENDUIT-GROUND',
        scene_note: 'two professional workers applying render directly on the lower section of a residential house exterior, both standing on firm flat ground — no scaffold, no ladder — Worker 1 uses a long-handled float to spread fresh monocouche or hydraulic render across the lower half of the facade — Worker 2 stands beside holding a loaded hawk and assists with material transfer or edge retouching — natural arm-reach work zone, fresh render coat clearly visible, old facade above the work line',
        scene_camera: 'homeowner photo — straight-on or slight diagonal — 2–3 m from workers — both workers visible from feet to shoulder, fresh render on wall clearly visible — no scaffold visible anywhere in frame',
        scene_framing: {
          work_pct:   70,
          foreground: 'render bucket and hawk on protective sheeting close to the wall base',
          midground:  'Worker 1 actively floating render on the lower facade — Worker 2 beside with hawk — fresh pale render surface, old render above',
          background: 'upper facade, no scaffold',
        },
        scene_debris:  'small render drips at the fresh render line, render residue on the protective sheet',
        scene_exclude: [
          'any scaffold or elevated access structure',
          'ladder used as workstation',
          'work zone above natural reach',
          'finished or uniformly clean facade',
          'single worker',
        ],
        tools: [
          'metal float against facade surface',
          'hawk with fresh render in Worker 2\'s hands',
          'render bucket at base of wall',
        ],
        protections: [
          'protective sheet on the ground at the wall base',
        ],
        chantier_details: [
          'fresh render on lower facade — wet, float-marked',
          'old render above the active zone',
          'two workers at ground level only',
        ],
      },
      // READY_SCAFFOLD_BACKGROUND variant — 1 of 4 slots = 25 % weight
      {
        _for:                             'enduit.*mono|enduit.*hydr',
        _state_for:                       'encours',
        _scaffold_variant:                'ready_scaffold_background',
        _access_configuration:            'GROUND_LEVEL_FACADE_WORK',
        _access_configuration_source:     'state_lock',
        _access_configuration_randomized: false,
        _visual_family:                   'FACADE-ENDUIT-GROUND',
        scene_note: 'ground-level render application on the lower section of a residential facade — two workers at the wall base, a tube-and-fitting scaffold erected against the facade is visible in the background — the scaffold is empty and not used as a workstation in this scene — Worker 1 applies fresh render to the lower wall with a float — Worker 2 assists actively from the ground: loading the hawk, transferring material, retouching — current work is entirely at ground level, scaffold is present as chantier context ready for the upper sections',
        scene_camera: 'homeowner smartphone photograph — camera 3–5 m from the facade — both workers at ground level visible — scaffold structure in background against the facade, platform boards present and empty — fresh render on lower facade section clearly visible',
        scene_framing: {
          work_pct:   65,
          foreground: 'render bucket and hawk on protective sheet at the wall base',
          midground:  'Worker 1 floating fresh render on the lower facade — Worker 2 beside with hawk or trowel — fresh pale render on lower section, old render above — scaffold uprights visible on the side of or against the facade in the background',
          background: 'upper facade above the work zone — old render — scaffold uprights and ledgers clearly visible, platform boards empty — no worker on the scaffold',
        },
        scene_debris:  'render drips at the fresh section base, render bag at the scaffold foot on the ground',
        scene_exclude: [
          'any worker on the scaffold platform or rungs — scaffold is present but EMPTY',
          'ladder used as a workstation',
          'work zone above shoulder height — workers are at ground level only',
          'fully finished facade',
          'only one worker visible — exactly two workers must be present',
          'scaffold absent — a scaffold structure must be visible in this variant',
        ],
        tools: [
          'metal float in Worker 1\'s hands against the lower facade',
          'hawk with fresh render in Worker 2\'s hands',
          'render bucket on protective sheet at the wall base',
        ],
        protections: [
          'protective sheet on the ground at the wall base',
          'kraft paper tape on window frame edge near the work zone',
        ],
        chantier_details: [
          'fresh render on lower facade — wet, float-marked',
          'old weathered render above the active zone',
          'scaffold visible in background: uprights, ledgers, empty platform boards',
          'two workers at ground level — neither on the scaffold',
        ],
      },

      // ─── CRÉPI FAÇADE — ENCOURS — GROUND_LEVEL_CREPI_WORK (state_lock, pool_size=4) ────
      // 3 × NO_SCAFFOLD + 1 × READY_SCAFFOLD_BACKGROUND → 75 % / 25 % distribution via seed-pick.
      // Crépi-specific texture reinforcement: granular aggregate finish must be clearly visible.
      // GROUND_LEVEL_CREPI_WORK gate adds textured_crepi_finish_visible + smooth_render_only fields.
      {
        _for:                             'crepi',
        _state_for:                       'encours',
        _scaffold_variant:                'no_scaffold',
        _access_configuration:            'GROUND_LEVEL_CREPI_WORK',
        _access_configuration_source:     'state_lock',
        _access_configuration_randomized: false,
        _visual_family:                   'FACADE-ENDUIT-GROUND',
        scene_note: 'crépi façade application — two professional workers applying granular textured crépi mineral render directly to the lower section of a residential house exterior, both standing stably at ground level without scaffold — Worker 1 presses the crépi mix onto the facade using a sponge float or plastic finishing float and draws it in circular or scraping passes, raising the characteristic rough granular aggregate texture — the freshly coated section shows an unmistakably rough stippled mineral surface: individual aggregate grains visible, irregular texture, matte finish catching light differently from the flat old wall beside it — Worker 2 stands actively beside Worker 1: loading the hawk with fresh crépi granular mix, scooping from the bucket, retouching the aggregate texture at the boundary — no scaffold present',
        scene_camera: 'homeowner smartphone — 2–4 m from the wall, eye level, slight diagonal — both workers, float action, freshly textured crépi surface, and ground tools all simultaneously visible — no scaffold in frame',
        scene_framing: {
          work_pct:   65,
          foreground: 'crépi bucket and hawk on protective dust sheet at the base of the wall — granular crépi mix residue clearly visible on the sheet and hawk face',
          midground:  'Worker 1 pressing float against the facade in circular or scraping passes — freshly textured crépi surface on the treated zone: rough, granular, matte, aggregate grains visible catching the light at an angle — old flat untextured wall surface beside and above the work zone — irregular active texture boundary — Worker 2 beside Worker 1 with loaded hawk showing granular mix',
          background: 'upper facade above the work zone — old plain flat render or masonry, no crépi texture above the work line — no scaffold',
        },
        scene_debris:  'crépi granule drips at the base of the fresh section, open bag of mineral crépi aggregate mix at the bucket foot, granule traces on the dust sheet',
        scene_exclude: [
          'scaffold of any kind — no scaffold poles, boards, or towers — work is entirely at ground level without scaffold',
          'ladder used as a workstation',
          'work zone above shoulder height',
          'perfectly smooth polished plaster surface — crépi is never smooth, the texture must be granular and irregular',
          'flat uniform paint-like finish — the surface must show visible aggregate grains and roughness',
          'finish visually identical to enduit monocouche — no smooth trowelled surface',
          'fully finished clean uniform facade with no active crépi work in progress',
          'only one worker visible — exactly two workers must be present',
        ],
        tools: [
          'sponge float or plastic finishing float in Worker 1\'s hands — pressed in circular or linear scraping passes against the facade surface, raising granular aggregate texture',
          'hawk loaded with fresh granular crépi mix in Worker 2\'s hands — aggregate grains visible on the hawk face',
          'crépi bucket on the dust sheet at their feet — granular mineral mix',
        ],
        protections: [
          'protective dust sheet on the ground at the wall base',
          'kraft paper tape on window frame edge near the work zone',
        ],
        chantier_details: [
          'fresh crépi surface on the treated zone — granular matte texture clearly visible, aggregate grains catching light at an angle, rough and irregular — unmistakably different from smooth enduit',
          'old flat untextured wall surface above and beside the crépi zone — texture contrast sharp and immediately visible',
          'irregular active texture boundary between fresh crépi and old wall',
          'two workers at ground level — Worker 1 texturing, Worker 2 loading hawk with granular mix',
        ],
      },
      // CRÉPI NO_SCAFFOLD variant B
      {
        _for:                             'crepi',
        _state_for:                       'encours',
        _scaffold_variant:                'no_scaffold',
        _access_configuration:            'GROUND_LEVEL_CREPI_WORK',
        _access_configuration_source:     'state_lock',
        _access_configuration_randomized: false,
        _visual_family:                   'FACADE-ENDUIT-GROUND',
        scene_note: 'two workers applying crépi façade directly at ground level — Worker 1 uses a scraping float (taloche grattée) or sponge float to work the fresh crépi mix in consistent circular or linear strokes, producing a clearly rough granular textured surface — the crepi zone shows visible aggregate grains, irregular matte stippling, and an uneven surface catching light differently from the smooth old wall — Worker 2 actively assists from the side: loading the hawk, scooping crépi mix from the bucket — no scaffold, no elevated access — both workers firmly on flat ground',
        scene_camera: 'wide smartphone shot from 3–5 m, slight upward angle — both workers and the full crépi work zone visible — no scaffold poles in frame',
        scene_framing: {
          work_pct:   60,
          foreground: 'crépi bucket, protective sheet, and trowel on the ground between the workers and camera — granular crépi residue on sheet',
          midground:  'Worker 1 pressing float against fresh granular crépi on the lower facade in circular passes — rough textured surface clearly visible, aggregate grains and stippling — old smooth wall above — Worker 2 beside with hawk loaded with crépi mix',
          background: 'upper facade above the work zone — old flat surface, no crépi texture — no scaffold structure',
        },
        scene_debris:  'crépi granule drips on the protective sheet, empty crépi bag rolled at the bucket foot',
        scene_exclude: [
          'any scaffold structure — no scaffold at all in this scene',
          'ladder used as a workstation',
          'work above shoulder height',
          'smooth polished enduit surface — crépi must show granular rough texture',
          'flat paint-like uniform finish with no texture',
          'fully finished facade',
          'only one worker',
        ],
        tools: [
          'scraping float or sponge float in Worker 1\'s hands — circular passes producing granular crépi texture',
          'hawk with fresh granular crépi mix in Worker 2\'s hands',
          'crépi bucket on protective sheet at feet',
        ],
        protections: [
          'protective dust sheet on the ground at the wall base',
        ],
        chantier_details: [
          'fresh crépi surface — rough granular aggregate texture, matte, irregular stippling visible',
          'old flat wall surface above and beside the crépi zone — contrast immediate',
          'two workers at ground level, no elevated equipment',
        ],
      },
      // CRÉPI NO_SCAFFOLD variant C
      {
        _for:                             'crepi',
        _state_for:                       'encours',
        _scaffold_variant:                'no_scaffold',
        _access_configuration:            'GROUND_LEVEL_CREPI_WORK',
        _access_configuration_source:     'state_lock',
        _access_configuration_randomized: false,
        _visual_family:                   'FACADE-ENDUIT-GROUND',
        scene_note: 'close-range view of crépi façade texturing in progress — Worker 1 works fresh crépi mix with a plastic finishing float against the lower facade, the freshly textured zone shows clearly visible granular mineral aggregate surface: rough, stippled, irregular — catching light at an angle compared to the old smooth wall beside it — Worker 2 stands close behind with hawk loaded with crépi mix, actively assisting — both at ground level, arm-reach work zone, no scaffold',
        scene_camera: 'homeowner photo — straight-on — 2–3 m from workers — both workers visible from feet to shoulder, fresh granular crépi texture on treated wall clearly visible — no scaffold visible anywhere in frame',
        scene_framing: {
          work_pct:   70,
          foreground: 'crépi bucket and hawk on protective sheeting close to the wall base — granular mix visible in bucket',
          midground:  'Worker 1 actively working float on the lower facade in circular or linear passes — fresh granular crépi surface: rough, matte, aggregate grains catching light — old flat wall above and beside — Worker 2 beside with hawk',
          background: 'upper facade, old flat surface, no scaffold',
        },
        scene_debris:  'small crépi aggregate drips at the fresh texture line, granule residue on the protective sheet',
        scene_exclude: [
          'any scaffold or elevated access structure',
          'ladder used as workstation',
          'work zone above natural reach',
          'smooth polished render surface visually identical to enduit monocouche',
          'flat uniform finish with no aggregate texture',
          'finished or clean facade with no crépi work visible',
          'single worker',
        ],
        tools: [
          'plastic finishing float or sponge float against facade in circular passes',
          'hawk with granular crépi mix in Worker 2\'s hands',
          'crépi bucket at base of wall',
        ],
        protections: [
          'protective sheet on the ground at the wall base',
        ],
        chantier_details: [
          'fresh crépi on lower facade — rough granular aggregate texture, matte stippling, catching light at an angle',
          'old flat wall above the active zone — texture contrast sharp',
          'two workers at ground level only',
        ],
      },
      // CRÉPI READY_SCAFFOLD_BACKGROUND — 1 of 4 slots = 25 % weight
      {
        _for:                             'crepi',
        _state_for:                       'encours',
        _scaffold_variant:                'ready_scaffold_background',
        _access_configuration:            'GROUND_LEVEL_CREPI_WORK',
        _access_configuration_source:     'state_lock',
        _access_configuration_randomized: false,
        _visual_family:                   'FACADE-ENDUIT-GROUND',
        scene_note: 'crépi façade application at ground level — two workers applying granular textured crépi to the lower facade wall, a tube-and-fitting scaffold erected against the facade visible in the background but empty and unused as a workstation — Worker 1 presses the crépi mix onto the facade with a sponge float or plastic finishing float in circular passes, producing a clearly rough granular aggregate texture: stippled, matte, irregular, catching light differently from the smooth old wall — Worker 2 actively assists from the ground: loading the hawk with fresh crépi mix, scooping from the bucket — work is entirely at ground level, scaffold is chantier context ready for upper sections later',
        scene_camera: 'homeowner smartphone — 3–5 m from facade — both workers at ground level and the scaffold structure against or beside the facade visible simultaneously — fresh granular crépi texture on lower facade clearly visible',
        scene_framing: {
          work_pct:   65,
          foreground: 'crépi bucket and hawk on protective sheet at the wall base — granular crépi mix residue on sheet',
          midground:  'Worker 1 pressing float against fresh granular crépi on the lower facade — rough textured surface: aggregate grains visible, matte stippling, irregular — old flat wall above and beside — scaffold uprights visible on the side or against the facade in the background — Worker 2 beside with hawk loaded with granular mix',
          background: 'upper facade above the work zone — old flat surface — scaffold uprights, ledgers, and empty platform boards clearly visible — no worker on the scaffold',
        },
        scene_debris:  'crépi granule drips at the fresh section base, crépi bag at the scaffold foot on the ground',
        scene_exclude: [
          'any worker on the scaffold platform or rungs — scaffold is EMPTY',
          'ladder used as a workstation',
          'work zone above shoulder height',
          'smooth polished enduit surface — crépi must show granular rough texture',
          'flat paint-like uniform finish with no visible aggregate',
          'fully finished facade',
          'only one worker — exactly two workers must be present',
          'scaffold absent — a scaffold structure must be visible in this variant',
        ],
        tools: [
          'sponge float or plastic finishing float in Worker 1\'s hands — circular passes raising granular crépi texture',
          'hawk with fresh granular crépi mix in Worker 2\'s hands',
          'crépi bucket on protective sheet at the wall base',
        ],
        protections: [
          'protective sheet on the ground at the wall base',
          'kraft paper tape on window frame edge near the work zone',
        ],
        chantier_details: [
          'fresh crépi surface on lower facade — rough granular aggregate texture, matte stippling, catching light at an angle — unmistakably different from smooth enduit',
          'old flat wall surface above and beside the crépi zone',
          'scaffold visible in background: uprights, ledgers, empty platform boards',
          'two workers at ground level — neither on the scaffold',
        ],
      },

      // ─── RAVALEMENT ENCOURS — SCAFFOLD_READY_GROUND_CREW (state_lock, workers au sol + scaffold prêt visible) ────
      {
        _for:                             'ravalement|renovation.*facade|ite',
        _state_for:                       'encours',
        _access_configuration:            'SCAFFOLD_READY_GROUND_CREW',
        _access_configuration_source:     'state_lock',
        _access_configuration_randomized: false,
        scene_note: 'two professional workers at ground level performing ravalement on a residential house facade — a tube-and-fitting scaffold is erected against the facade wall: visible on the side of or directly against the facade, fully mounted, uprights and ledgers in place, platform boards set, physically coherent and ready to use — but NEITHER worker is on the scaffold in this scene — Worker 1 stands firmly on the ground at the facade wall, hawk in one hand and float in the other, actively spreading fresh render on the lower facade section at natural arm reach — Worker 2 stands on the ground beside Worker 1, actively helping: mixing mortar at the bucket on the ground, loading the hawk with fresh material, retouching the transition edge, or holding a trowel — work in progress: fresh pale render clearly visible on the treated zone, old weathered render above and beside it, active transition line visible',
        scene_camera: 'medium-wide homeowner smartphone photograph — camera 3–5 m from the facade — both workers at ground level and the scaffold structure erected against or beside the facade are simultaneously visible in the same frame — fresh render on the lower facade clearly visible',
        scene_framing: {
          work_pct:   65,
          foreground: 'mortar bucket and spare render tools on the ground at the base of the wall — dried render splashes on the protective sheeting at the wall base',
          midground:  'Worker 1 standing on the ground at the facade, float pressed against the lower facade surface spreading fresh pale render — Worker 2 standing on the ground beside Worker 1, loading the hawk or retouching — scaffold structure erected against or to the side of the facade: uprights, ledgers, and platform boards clearly visible but empty — fresh render on one section of the facade, old weathered render above and beside the work zone, active transition edge visible',
          background: 'upper facade above the work zone — old render with weathering texture, scaffold uprights continuing above the work level, roofline and sky',
        },
        scene_debris:  'render drips at the base of the fresh section, empty render bags folded at the scaffold foot on the ground, protective sheeting at the wall base',
        scene_exclude: [
          'any worker on the scaffold platform — the scaffold is present but neither worker uses it as a workstation in this scene',
          'worker on the roof surface',
          'interior painting scene',
          'fully completed clean facade with no active work visible',
          'scaffold absent — the scaffold must be visible as chantier context even if unused in this scene',
          'scaffold clearly unstable, leaning, or missing uprights — it must be physically coherent',
          'only one worker visible — exactly two workers must be present and both actively involved at ground level',
          'workers idle or watching — both workers must be actively engaged in the render work',
        ],
        tools: [
          'hawk and float in Worker 1\'s hands — spreading fresh render on the lower facade surface',
          'mortar bucket on the ground beside Worker 2 — trowel or paddle in use',
        ],
        protections: [
          'protective sheeting laid on the ground at the base of the facade wall — catches render drips',
          'scaffold erected against the facade as a coherent chantier structure: uprights, ledgers, platform boards visible — stable on the ground',
        ],
        chantier_details: [
          'fresh pale smooth render on the lower facade section — trowel marks still wet and slightly shiny',
          'old weathered darker render above and beside the fresh section — irregular active transition line clearly visible',
          'exactly two professionals on the ground: Worker 1 applying render, Worker 2 loading hawk or assisting',
          'scaffold structure visible beside or against the facade — empty platform, no worker on it',
        ],
      },

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

      // --- peinture intérieure murs state-lock (encours) ---
      // Covers: Peinture intérieure, Peinture salon, Peinture chambre, Peinture cuisine, Peinture couloir.
      // Regex is exact so it cannot collide with plafond, papier peint, or exterior services.
      {
        _for:                             '^(peinture interieure|peinture salon|peinture chambre|peinture cuisine|peinture couloir)$',
        _state_for:                       'encours',
        _visual_family:                   'PEINTURE-INTERIOR-WALL-ROLLER',
        _access_configuration:            'GROUND_LEVEL_INTERIOR_WALL_ROLLER',
        _access_configuration_source:     'state_lock',
        _access_configuration_randomized: false,
        planned_worker_count:             1,
        setting:                          'interior',
        scene_reset_exclude:              true,
        scene_note:    'residential interior wall being painted with a roller — one tradesperson standing stably on the floor, roller in contact with the vertical wall surface mid-stroke — fresh new colour on the upper section, old paint still clearly visible on the lower section — irregular but credible active paint boundary — roller tray with fresh paint on the drop cloth, masking tape or cut-in brush at the wall-ceiling junction',
        scene_camera:  'standing in the room at a slight diagonal, framing the active roller mid-stroke on the wall — painter\'s feet and the drop cloth visible at the base — ceiling-wall junction and the paint boundary both in frame',
        scene_framing: {
          work_pct:   65,
          foreground: 'canvas drop cloth covering the full floor below the painted wall — roller tray with fresh paint at the wall base on the cloth',
          midground:  'one tradesperson standing steadily on the floor, roller pressed against the vertical wall surface, pushing upward in a steady stroke — fresh new colour on the upper painted section, old paint on the lower unpainted section — active paint boundary irregular and clearly visible',
          background: 'room interior — door frame or window edge at the side, ceiling-wall junction with masking tape, no exterior context visible',
        },
        scene_debris:  'paint drip on the drop cloth below the roller line, thin wet brush stroke at the unpainted edge near the masking tape',
        scene_exclude: [
          'ceiling painting dominant — the primary surface being painted must be a vertical wall, not the ceiling',
          'ladder used as a workstation — painter stands on the floor only, not on any ladder',
          'step ladder used as a workstation — no folding or step ladder',
          'scaffold — no scaffold structure in the room',
          'worker standing on furniture — painter stands on the floor only',
          'exterior facade painting — no outdoor context, no facade, no exterior window view',
          'wallpaper installation or removal — no paste table, wallpaper rolls, or strips being applied',
          'spray painting dominant — no paint spray gun as primary tool',
          'completed wall with no active painting in progress',
          'decorative plaster application — no enduit décoratif spread with a trowel',
        ],
        tools: [
          'paint roller in contact with the vertical wall surface mid-stroke',
          'roller tray with fresh paint on the drop cloth at the wall base',
          'flat cut-in brush on the tray rim or at the wall-ceiling junction',
        ],
        protections: [
          'canvas drop cloth spread across the full floor below the painted wall',
          'masking tape along the ceiling-wall junction and skirting board',
        ],
        chantier_details: [
          'fresh paint on the upper section of the wall — colour vivid and wet, roller texture marks visible at the active boundary',
          'old paint clearly visible on the lower unpainted section — contrasting tone, no new colour',
          'irregular but credible active paint boundary between the fresh and old sections',
          'one tradesperson at floor level — roller raised, arm extended, pushing the stroke across the wall surface',
        ],
      },

      // --- peinture intérieure (murs) générique (autres états et services non matchés) ---
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
        _for:          'exterieur|exterieure|facade.*peint|peinture.*facade|volet|portail|cloture|boiserie.*ext|sous.*face|soffit',
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
        _for:          'exterieur|exterieure|facade.*peint|peinture.*facade|volet|portail|cloture|boiserie.*ext|sous.*face|soffit',
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
        _for:          'exterieur|exterieure|facade.*peint|peinture.*facade|volet|portail|cloture|boiserie.*ext|sous.*face|soffit',
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

      // --- nettoyage haute pression (surface sol, deterministe) ---
      {
        _for:                             '^nettoyage haute pression$',
        _state_for:                       'encours',
        _visual_family:                   'NETTOYAGE-HIGH-PRESSURE-GROUND',
        _access_configuration:            'GROUND_LEVEL_PRESSURE_WASHING',
        _access_configuration_source:     'state_lock',
        _access_configuration_randomized: false,
        setting:                          'exterior',
        scene_camera:                     'standing in the private driveway, courtyard, or garden of a detached or semi-detached house, 3–5 m back from the worker, eye level — wide framing showing the full hard-surface area being cleaned and the pressure washer sitting on a dry stable patch — house facade or garden boundary visible in background confirming residential context',
        scene_framing:                    'pressure washing in progress on a hard ground surface — large clean zone on the left or near side: surface brighter and visibly wetter, original paving colour beginning to show — large dirty zone still remaining on the right or far side: dark green algae, grey grime, or encrusted dirt clearly visible — irregular natural boundary between clean and dirty, not a perfect straight line — worker standing at the cleaning boundary, lance held two-handed, jet directed downward at the surface at a safe angle — pressure washer unit sitting on a dry patch 1–2 m behind the worker — hose connecting machine to lance lying flat on the already-cleaned surface without looping around the worker\'s feet — dirty water running toward a drain grate, garden border, or draining edge of the surface',
        location_must_have: [
          'private residential property — driveway, paved courtyard, or garden terrace',
          'hard ground surface: concrete, mineral paving, stone flags, or compacted gravel',
          'house facade, boundary wall, garage door, or garden hedge visible in background confirming residential context',
        ],
        location_forbidden: [
          'public pavement or road as the only ground surface',
          'facade or exterior wall as the main work surface — ground only',
          'indoor setting or interior room',
          'commercial or industrial premises',
          'car or vehicle as the cleaning target',
        ],
        scene_exclude: [
          'worker directing jet toward another person',
          'jet directed toward open electrical socket or junction box at close range',
          'worker barefoot or wearing sandals',
          'worker standing in deep pooled water above ankle height',
          'hose looping around or crossing the worker\'s feet creating a trip hazard',
          'ladder or scaffold in use — ground-level work only',
          'car or vehicle as the main cleaning target',
          'roof or exterior wall as the main work surface',
          'interior room or indoor setting',
          'entire surface already perfectly clean — no dirty zone visible',
          'simple sweeping with no pressure washer present',
          'two workers — single worker only',
          'perfect straight-line split between clean and dirty — must be irregular',
        ],
        chantier_details: [
          'irregular natural boundary between clean bright paving and dark dirty zone — not a straight line',
          'pressure washer hose running flat across already-cleaned surface back to the machine',
          'dirty water running along surface toward nearest drain grate or garden edge',
          'surface partially cleaned revealing original paving colour against remaining dark dirty area',
        ],
        tools: [
          'electric or petrol pressure washer unit on the ground, 1–2 m behind the worker',
          'high-pressure hose running from the machine to the worker\'s lance — lying flat, no loops underfoot',
          'lance held two-handed, jet directed downward at the surface cleaning boundary',
        ],
        protections: [
          'waterproof work boots clearly visible — closed toe and ankle protection',
          'protective goggles or safety glasses if chemical product in use',
          'plastic bag tied over any nearby outdoor electrical socket',
        ],
      },

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

      // --- nettoyage façade sol (zone basse, déterministe) ---
      {
        _for:                             '^nettoyage facade$',
        _state_for:                       'encours',
        _visual_family:                   'NETTOYAGE-FACADE-GROUND',
        _access_configuration:            'GROUND_LEVEL_FACADE_CLEANING',
        _access_configuration_source:     'state_lock',
        _access_configuration_randomized: false,
        setting:                          'exterior',
        scene_camera:                     'standing 3–5 m back from the facade of a residential house (pavillon individuel), eye level — wide framing showing the full visible facade section being cleaned — worker stable on the ground directly in front of the wall, lance or brush in hand — cleaning machine on the ground 1–2 m to the side or behind the worker — hose running flat on the ground — dirty runoff water visible at the base of the wall — NO ladder, NO scaffold, NO elevated platform in frame',
        scene_framing:                    'ground-level facade cleaning in progress — the work zone is the lower section of the exterior wall: soubassement, rez-de-chaussée wall, or facade area directly surrounding a door or low window — dirty zone still remaining on the upper part or right side: dark green algae streaks, grey grime, air-pollution blackening, or lichen clearly visible — cleaned zone below or to the left: lighter surface, original render or stone colour beginning to show, still wet — irregular natural boundary between clean and dirty, not a straight line — worker stands flat on the ground, no ladder or scaffold — cleaning machine (electric or petrol pressure washer OR professional sprayer with lance) sits on the ground within 2 m of the worker — hose connecting machine to lance runs flat on the ground — dirty brown or green water runs down the facade and collects at the wall base — protections visible: plastic bag taped over outdoor socket, plastic sheeting over window glass, tarp on garden bed at wall base — the facade surface is rendered render, bare stone, or bare brick (NOT wood panels, not glass, not a modern composite cladding) — salissures, algae streaks, or dark pollution visible on the uncleaned zone — cleaned zone clearly lighter and wetter',
        location_must_have: [
          'exterior facade wall of a residential house as the main work surface — render, stone, or brick — clearly vertical',
          'work zone at LOW HEIGHT: soubassement, ground-floor wall level, or facade area around a door or low window — reachable without any ladder or scaffold',
          'worker standing stably on flat ground directly in front of the facade — both feet on the ground',
          'dirty zone AND cleaned zone simultaneously visible on the same facade surface — algae or grime on the dirty side, lighter wet surface on the cleaned side',
        ],
        location_forbidden: [
          'worker on a ladder or scaffold of any kind — strictly ground-level only',
          'work zone above the worker\'s natural arm reach — upper-floor facade or high gable out of reach from the ground',
          'terrace floor or paving as the main work surface — the main subject must be the vertical facade wall',
          'roofing, tiles, or gutters as the main subject',
          'interior room or indoor setting',
          'entire facade already clean — a dirty zone must remain',
          'fresh paint or render application — no enduit, no peinture',
          'jet directed toward a bare electrical socket, luminaire, or junction box at close range',
        ],
        scene_exclude: [
          'ladder or scaffold in frame — ground-level only',
          'worker at height — both feet must be on the ground',
          'terrace surface or paving as the main cleaning subject',
          'roofing or gutters',
          'fresh render or paint application',
          'entire facade uniformly clean with no dirty zone',
          'jet directed toward another person',
          'jet directed straight at an unprotected electrical socket or luminaire',
          'worker barefoot or in sandals',
          'two workers — single worker only',
          'perfect straight-line boundary between clean and dirty — must be irregular',
        ],
        chantier_details: [
          'irregular diagonal or organic boundary between the cleaned and dirty facade zone — not a straight line',
          'dirty brown or green water running down the facade and pooling at the base of the wall',
          'plastic protection on the window glass and socket — clearly applied before cleaning started',
          'cleaning machine hose running flat on the ground — no loops around the worker\'s feet',
        ],
        tools: [
          'electric or petrol pressure washer on the ground, 1–2 m to the side of the worker',
          'high-pressure lance held two-handed directing jet at the lower facade zone',
          'OR professional backpack or wheeled sprayer with lance for chemical cleaning treatment',
          'high-pressure hose running flat on the ground from machine to lance — no dangerous loops',
        ],
        protections: [
          'plastic bag taped over the exterior electrical socket at the facade',
          'plastic sheeting taped over the window glass and frame in the work zone',
          'tarp or plastic sheet on the garden bed or ground at the base of the wall',
          'waterproof work boots — closed toe',
        ],
      },

      // --- traitement hydrofuge façade sol (zone basse, déterministe) ---
      {
        _for:                             '^traitement hydrofuge facade$',
        _state_for:                       'encours',
        _visual_family:                   'HYDROFUGE-FACADE-GROUND',
        _access_configuration:            'GROUND_LEVEL_FACADE_HYDROFUGE',
        _access_configuration_source:     'state_lock',
        _access_configuration_randomized: false,
        setting:                          'exterior',
        scene_note:                       'applying transparent waterproofing sealer by foam roller to the SOUBASSEMENT — the lower ground-floor section of a house facade wall, between ground level and chest height — worker stands flat on the ground throughout — NO ladder, NO scaffold, NO elevated access needed',
        scene_camera:                     'camera at chest height, 3–4 m back from the LOWER SECTION of a house facade — the work zone is the SOUBASSEMENT: wall between ground level and waist/chest height of the standing worker — worker both feet flat on the ground, bending slightly forward, rolling a waterproofing product with a WIDE ROLLER (mohair or foam roller on a short handle) — NO ladder anywhere — the wall section being treated is at arm height or lower, NOT above the worker\'s head — bucket or small container of transparent waterproofing product on the ground beside the worker — NO high-pressure equipment, NO hose with strong jet, NO scaffold in frame',
        scene_framing:                    'worker applying a transparent waterproofing sealer to the LOWER SECTION of a house exterior wall using a wide paint roller — the work zone is the soubassement (base of the wall): the area between ground level and chest height — this looks like painting a wall with a roller, except the product is transparent — worker stands flat on the ground, bends slightly to reach lower sections — untreated zone visible on one side (dry matte render or stone), freshly treated zone on the other side (surface slightly darker with a subtle wet sheen) — original facade texture clearly visible through the transparent product — small product bucket on the ground next to the worker — NO water jet, NO hose, NO pump machine, NO spray gun connected to a motor — product is being rolled on, not sprayed under pressure',
        location_must_have: [
          'exterior facade wall of a residential house as the main work surface — render, stone, or brick — clearly vertical',
          'work zone at LOW HEIGHT: soubassement, ground-floor wall level, or facade area around a door or low window — reachable without any ladder or scaffold',
          'worker standing stably on flat ground directly in front of the facade — both feet on the ground',
          'treated zone AND untreated zone simultaneously visible on the same facade surface — treated side slightly darker or with a subtle wet sheen, untreated side dry and matte',
          'water-repellent product being applied — not washed off, not painted on with opaque colour',
        ],
        location_forbidden: [
          'worker on a ladder or scaffold of any kind — strictly ground-level only',
          'work zone above the worker\'s natural arm reach — upper-floor facade or high gable out of reach from the ground',
          'high-pressure water jet directed at the facade',
          'dirty runoff water or rinsed algae at the base of the wall',
          'opaque paint or render being applied — product must be transparent or semi-transparent',
          'terrace floor or paving as the main work surface — the main subject must be the vertical facade wall',
          'roofing, tiles, or gutters as the main subject',
          'interior room or indoor setting',
          'entire facade already treated — an untreated matte zone must remain',
          'fresh render or enduit application',
          'scrubbing or abrasive cleaning action',
        ],
        scene_exclude: [
          'ladder or scaffold in frame — ground-level only',
          'worker at height — both feet must be on the ground',
          'high-pressure water jet or pressure washer in use',
          'dirty brown or green water running down the facade',
          'moss or algae being dislodged by a jet',
          'paint roller applying opaque coloured paint',
          'fresh render being trowelled onto the wall',
          'entire facade uniformly treated with no untreated zone',
          'terrace surface or paving as the main cleaning subject',
          'roofing or gutters',
          'entirely matte facade with zero sign of treatment — the treated zone must show subtle sheen',
        ],
        chantier_details: [
          'irregular natural application boundary between treated zone (slightly darker, subtle wet sheen) and untreated zone (dry, matte) — not a straight line',
          'original facade surface texture (render grain, stone mortar joints, brick face) clearly visible through the transparent water-repellent product on the treated side',
          'small open bucket of transparent waterproofing product on the ground next to the worker — NO hose, NO connected pump, NO sprayer equipment',
          'light tarp or absorbent sheet at the base of the wall to catch drips',
        ],
        tools: [
          'wide foam or mohair roller on a short handle (30–40 cm roller) — applying a clear transparent waterproofing sealer to the lower facade',
          'OR wide soft-bristle brush for working the product into stone or brick texture at low height',
          'small bucket or open container of transparent waterproofing product on the ground next to the worker — NO hose, NO pump connected to the wall',
          'optionally a small paint tray on the ground for loading the roller',
        ],
        protections: [
          'lightweight tarp, cardboard sheet, or plastic sheeting at the wall base to catch drips',
          'nitrile or chemical-resistant gloves clearly worn',
          'work clothes appropriate for outdoor chemical treatment — no bare arms',
          'plastic bag or tape over the exterior electrical socket if in the work zone',
        ],
      },

      // --- nettoyage terrasse (surface sol, déterministe) ---
      {
        _for:                             '^nettoyage terrasse$',
        _state_for:                       'encours',
        _visual_family:                   'NETTOYAGE-SURFACE-GROUND',
        _access_configuration:            'GROUND_SURFACE_CLEANING',
        _access_configuration_source:     'state_lock',
        _access_configuration_randomized: false,
        setting:                          'exterior',
        scene_camera:                     'standing at the edge of a residential outdoor terrace directly adjoining the rear or side of the house, 3–5 m back from the worker, eye level — wide framing showing the full terrace tiled or stone-slab surface with the pressure-washed clean zone and the remaining dirty moss-covered zone — in the background: house facade with a bay window, French door, or sliding patio door clearly visible — garden table and chairs or planters visibly displaced to one dry corner — NO garage door, carport, or vehicle access point in frame',
        scene_framing:                    'terrace surface cleaning in progress — the surface is ceramic tiles, natural stone slabs, or concrete flags typical of a residential outdoor living terrace (NOT tarmac, asphalt, or loose gravel typical of a driveway) — clean zone on the near or left half: tiles/slabs brighter and visibly wet, original surface colour beginning to show — dirty zone still remaining on the far or right half: dark green algae, grey grime, or moss encrusted clearly visible — irregular natural boundary between clean and dirty, not a straight line — worker standing at the cleaning boundary, lance held two-handed, jet directed downward at the surface — cleaning machine sitting on the clean zone 1–2 m behind the worker — hose connecting machine to lance running flat on the already-cleaned surface — dirty water running toward a drain grate, garden edge, or terrace border — garden furniture (table, chairs) or potted plants moved and stacked to one dry corner of the terrace, confirming this is a living/dining terrace not a circulation path',
        location_must_have: [
          'residential terrace DIRECTLY ADJACENT to the habitable interior of the house — outdoor living or dining area, NOT a driveway, path, or vehicle access lane',
          'mineral surface: ceramic tiles, natural stone slabs, concrete flags, or quarry tiles — surface must be clearly non-carrossable (no tarmac, asphalt, or poured concrete driveway finish)',
          'house facade visible in background with a bay window, French door, or large sliding patio door CLEARLY VISIBLE — this is mandatory to confirm outdoor living terrace context',
          'garden furniture (table, chairs) OR potted plants OR decorative planters visibly moved to one dry corner — mandatory living-area indicator',
        ],
        location_forbidden: [
          'garage door or carport structure visible and dominating the composition',
          'driveway, vehicle access lane, or tarmac/asphalt surface as the primary surface',
          'public pavement or road',
          'indoor setting or interior room',
          'facade or exterior wall as the main work surface',
          'car or vehicle as the cleaning target',
          'no bay window or French door visible in background — must see at least one residential glazed opening',
          'scene indistinguishable from a driveway or alley — must show living terrace context',
        ],
        scene_exclude: [
          'worker directing jet toward another person',
          'jet directed toward open electrical socket or glazing at close range',
          'worker barefoot or wearing sandals',
          'worker standing in deep pooled water above ankle height',
          'hose looping around or crossing the worker\'s feet creating a trip hazard',
          'ladder or scaffold in use — ground-level work only',
          'car or vehicle as the main cleaning target',
          'roof or exterior wall as the main work surface',
          'entire surface already perfectly clean — no dirty zone visible',
          'two workers — single worker only',
          'perfect straight-line split between clean and dirty — must be irregular',
          'furniture still in place and being soaked by the jet',
          'electrical extension lead or power strip lying in the water',
          'garage door visible or any vehicle access point in frame',
        ],
        chantier_details: [
          'irregular natural boundary between clean bright surface and dark dirty zone — not a straight line',
          'cleaning machine hose running flat across already-cleaned surface back to the worker\'s lance',
          'dirty water running along the terrace toward nearest drain or garden edge',
          'garden furniture stacked to one dry corner — terrace cleared for work',
        ],
        tools: [
          'electric or petrol pressure washer or surface cleaner on the ground, 1–2 m behind the worker',
          'high-pressure hose or surface cleaner head connected to the machine — lying flat, no loops underfoot',
          'lance held two-handed or surface cleaner head pushed across the cleaning boundary',
        ],
        protections: [
          'waterproof work boots clearly visible — closed toe and ankle protection',
          'protective goggles if chemical product in use',
          'plastic cover or tarp over any nearby outdoor socket or electrical fitting',
        ],
      },

      // --- nettoyage terrasse / dallage / pavés / allée (famille commune) ---
      {
        _for:                   'terrasse|dallage|paves|allee|sol.*ext|beton.*ext|nettoy.*terr|nettoy.*dall|nettoy.*pave',
        _visual_family:         'NETTOYAGE-SURFACE-GROUND',
        _access_configuration:  'GROUND_SURFACE_CLEANING',
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
        _for:                   'terrasse|dallage|paves|allee|sol.*ext|beton.*ext|nettoy.*terr|nettoy.*dall|nettoy.*pave',
        _visual_family:         'NETTOYAGE-SURFACE-GROUND',
        _access_configuration:  'GROUND_SURFACE_CLEANING',
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
        _for:                   'terrasse|dallage|paves|allee|sol.*ext|beton.*ext|nettoy.*terr|nettoy.*dall|nettoy.*pave',
        _visual_family:         'NETTOYAGE-SURFACE-GROUND',
        _access_configuration:  'GROUND_SURFACE_CLEANING',
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
