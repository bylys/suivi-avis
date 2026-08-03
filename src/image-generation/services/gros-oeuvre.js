/**
 * gros-oeuvre.js — Phase 2 shadow copy (source active : app.js)
 * Copie stricte de WORK_SCENES {terrassement, maçonnerie}
 * et SITE_REALISM {terrassement, 'maçonnerie'}.
 * Ne pas modifier avant le cutover validé.
 */

export const WORK_SCENES_GROS_OEUVRE = {
  terrassement: {
    category:         'terrassement',
    priority:         2,
    service_keywords: [
      { phrase: 'construction allee',   score: 12 },
      { phrase: 'allee carrossable',    score: 12 },
      { phrase: 'allee gravier',        score: 12 },
      { phrase: 'allee pavee',          score: 12 },
      { phrase: 'creation allee',       score: 12 },
      { phrase: 'creation chemin',      score: 12 },
      { phrase: 'cour gravillonnee',    score: 12 },
      { phrase: 'preparation terrain',  score: 12 },
      { phrase: 'evacuation terres',    score: 12 },
      { phrase: 'raccordement terrain', score: 11 },
      { phrase: 'empierrement',         score: 11 },
      { phrase: 'enrochement',          score: 11 },
      { phrase: 'excavation',           score: 11 },
      { phrase: 'decaissement',         score: 11 },
      { phrase: 'vrd',                  score: 11 },
      { phrase: 'assainissement',       score: 10 },
      { phrase: 'drainage',             score: 10 },
      { phrase: 'nivellement',          score: 10 },
      { phrase: 'tranchee',             score: 10 },
      { phrase: 'fouille',              score: 10 },
      { phrase: 'remblai',              score: 10 },
      { phrase: 'terrassement',         score: 12 },
      { phrase: 'plateforme',           score: 9  },
      { phrase: 'fondation',            score: 9  },
      { phrase: 'allee',                score: 5  },
    ],
    exclude_if: [],
    intro:      'groundworks and earthmoving at a residential property',
    setting:    'exterior',
    secteur:    'civil works contractor',
    hasWorkers: false,
    camera:     'standing at the edge of the site, 5–8 m from the work zone, wide shot showing ground profile',
    materials:  ['compacted gravel', 'geotextile fabric', 'drainage pipes', 'sand bed'],
    photo_defects: [
      'lens barrel distortion on flat ground plane',
      'pale sky bleaching at the top of frame',
    ],
    exclusions: ['excavators', 'dumper trucks', 'workers', 'people', 'safety equipment'],
    states: {
      debut: {
        framing: {
          work_pct:   40,
          foreground: 'freshly excavated trench or site perimeter marked with stakes and string line',
          midground:  'disturbed soil and small earth mounds, garden mostly intact beside the work zone',
          background: 'house facade, garden fence, neighbouring property',
        },
        debris:      'fresh excavated soil piled beside the trench, a few stones on the surface',
        description: 'Groundwork has just started. Excavation beginning, site marked out, first earth moved.',
      },
      encours: {
        framing: {
          work_pct:   55,
          foreground: 'gravel base layer being spread — visible aggregate at the leading edge',
          midground:  'terrain significantly shaped and partially filled with compacted sub-base',
          background: 'garden boundary, existing fence or wall',
        },
        debris:      'soil mounds at the edge, gravel dust and aggregate on surrounding ground',
        description: 'Groundwork well underway. Terrain shaped, gravel sub-base being compacted.',
      },
      semifinal: {
        framing: {
          work_pct:   60,
          foreground: 'compacted gravel surface nearly level, edging strips being installed',
          midground:  'flat leveled surface covering most of the work zone, clean straight edges forming',
          background: 'house facade, garden',
        },
        debris:      'a small pile of leftover gravel near the edge, otherwise tidy',
        description: 'Base is almost complete. Surface is leveled and compacted. Edging being installed.',
      },
      final: {
        framing: {
          work_pct:   65,
          foreground: 'finished surface — neat driveway, leveled ground or paved allée, clean edges',
          midground:  'complete groundwork result — flat, even, well-finished',
          background: 'house facade, garden boundary, gate or fence',
        },
        debris:      'none — site clean, professional finish',
        description: 'Groundwork complete. Surface flat, level and neatly finished. A solid professional result.',
      },
    },
  },

  maçonnerie: {
    category:         'maçonnerie',
    priority:         2,
    service_keywords: [
      { phrase: 'dalle beton',    score: 12 },
      { phrase: 'mur beton',      score: 12 },
      { phrase: 'terrasse beton', score: 12 },
      { phrase: 'mur parpaing',   score: 11 },
      { phrase: 'muret',          score: 10 },
      { phrase: 'macon',          score: 8  },
      { phrase: 'parpaing',       score: 7  },
      { phrase: 'pierre',         score: 5  },
      { phrase: 'beton',          score: 4  },
      { phrase: 'mur',            score: 3  },
    ],
    exclude_if: [],
    intro:      'masonry work at a residential property',
    setting:    'exterior',
    secteur:    'mason',
    hasWorkers: false,
    camera:     'standing 2–4 m from the wall, straight-on or slight diagonal, eye level',
    materials:  ['concrete blocks', 'mortar', 'sand', 'cement bags'],
    photo_defects: [
      'flat midday light casting short even shadows',
      'lens barrel distortion on straight wall lines',
    ],
    exclusions: ['trowels', 'mixing tools', 'wheelbarrows', 'safety equipment', 'workers', 'people'],
    states: {
      debut: {
        framing: {
          work_pct:   40,
          foreground: 'first row of concrete blocks laid on foundation, mortar bucket nearby',
          midground:  'foundation line or existing wall with first course of new blocks beginning',
          background: 'garden, existing structure, sky',
        },
        debris:      'mortar splashes on ground near the first course, cement dust and a few broken block chips',
        description: 'Construction has just started. The foundation is set. The first row of blocks is in place. The site is organised and just getting underway.',
      },
      encours: {
        framing: {
          work_pct:   55,
          foreground: 'concrete blocks and mortar debris at the base, sand pile nearby',
          midground:  'half-height wall under construction — fresh dark mortar joints clearly visible, blocks not yet fully set',
          background: 'adjacent existing structure or garden',
        },
        debris:      'mortar splashes on ground, block dust, open cement bags nearby',
        description: 'The wall is at mid-height. Fresh mortar joints are visible. Blocks are stacked and ready. An active organised site.',
      },
      semifinal: {
        framing: {
          work_pct:   60,
          foreground: 'a few remaining blocks and a bag of mortar near the base',
          midground:  'wall at full height, joints nearly done, surface clean',
          background: 'existing structure, garden, sky',
        },
        debris:      'a small pile of leftover blocks and one bag near the base — mostly tidy',
        description: 'The wall is at full height. Mortar joints are being finished. The structure looks solid and neat.',
      },
      final: {
        framing: {
          work_pct:   65,
          foreground: 'clean ground with only a few small mortar marks remaining',
          midground:  'complete wall — level, regular blocks, clean joints, professional finish',
          background: 'neighbouring property, garden, sky',
        },
        debris:      'nearly none — ground swept, small mortar traces only',
        description: 'Masonry complete. The wall is level, joints are clean. A solid professional result ready to show clients.',
      },
    },
  },

};

export const SITE_REALISM_GROS_OEUVRE = {
  terrassement: {
    scenarios: [
      {
        _for:          'decaiss|fouill|excavat|percement|terrassem',
        scene_note:    'excavation work in progress — trench or pit being dug, raw earth walls visible, deep cut into the ground',
        scene_camera:  'standing at the trench edge, looking down into the cut — angle showing the depth and the layered soil walls',
        scene_framing: {
          work_pct:   65,
          foreground: 'fresh earth pile at the trench lip, shovel or pickaxe driven vertically into it',
          midground:  'open trench or pit showing layered soil profile — dark topsoil, pale subsoil, gravel',
          background: 'surrounding site, site boundary fence or hedge, sky above',
        },
        scene_debris:  'fresh earth spill on the surrounding ground, small roots and stones extracted from the trench beside the pile',
        scene_exclude: ['decorative paving', 'finished surface', 'green grass lawn', 'concrete pour', 'rebar'],
        tools: [
          'shovel driven vertically into the fresh earth pile',
          'pickaxe resting against a stake at the trench edge',
          'wheelbarrow loaded with fresh earth beside the trench',
          'compacting tamper resting on its head at the trench edge',
        ],
        protections: [
          'orange safety mesh stretched across the open trench at ground level',
          'wooden plank bridging the trench at the site access point',
        ],
        chantier_details: [
          'trench walls showing raw soil layers — dark topsoil above, pale subsoil below',
          'small stones and root sections removed from the excavation beside the pile',
          'boot prints in the fresh mud at the trench edge',
          'soil marks on the adjacent surface from wheelbarrow traffic',
        ],
      },
      {
        _for:          'allee|cour|chemin|dalle.*ext|pave|beton.*ext|surface.*ext|creation.*allee',
        scene_note:    'driveway or outdoor surface construction in progress — sub-base compacted or paving units being laid, string line taut as a guide',
        scene_camera:  'standing at the end of the driveway or path in perspective along its length, showing the work progress',
        scene_framing: {
          work_pct:   65,
          foreground: 'string line between stakes, compacted sub-base or first paving units laid',
          midground:  'driveway in progress — prepared sub-base on one side, existing ground on the other',
          background: 'house wall or fence at the far end, garden or existing drive beside',
        },
        scene_debris:  'sand pile at the side edge, paving off-cuts near the cutting zone',
        scene_exclude: ['deep excavation trench', 'concrete foundation', 'pipe or conduit in trench', 'green lawn untouched'],
        tools: [
          'string line pulled taut between two stakes defining the edge',
          'long spirit level resting on the compacted sub-base',
          'vibrating plate compactor at the prepared section end',
          'rubber mallet beside the last paving unit',
        ],
        protections: [
          'safety cones at each end of the work zone',
        ],
        chantier_details: [
          'string line defining the straight edge of the new surface',
          'sub-base compacted and level behind the leading edge',
          'sand screed layer visible at the active laying point',
          'paving off-cut pieces near the cutting zone',
        ],
      },
      {
        _for:          'fondation|semelle|coulage|ferraillage|ancrage|infrastructure',
        scene_note:    'foundation work in progress — reinforced concrete strip or pad being prepared, rebar cage in the trench, formwork boards in place',
        scene_camera:  'crouching at the trench edge or standing at the formwork end, framing the rebar cage and the trench interior',
        scene_framing: {
          work_pct:   70,
          foreground: 'rebar cage visible in the trench bottom, wire ties at the intersections, spacers underneath',
          midground:  'formwork boards on the trench sides held by wooden spacers',
          background: 'site surroundings — subsoil walls, construction fence',
        },
        scene_debris:  'cut wire tie ends on the ground near the rebar, concrete splash marks on the trench edge',
        scene_exclude: ['finished driveway', 'decorative garden', 'tiling', 'green grass', 'pipe in trench'],
        tools: [
          'rebar tying wire and pliers beside the trench edge',
          'formwork boards held by wooden spacers along the trench sides',
          'concrete vibrator or screed bar beside the trench',
          'spirit level on the formwork top',
        ],
        protections: [
          'hard hat beside the trench edge',
          'orange safety mesh stretched around the open excavation perimeter',
        ],
        chantier_details: [
          'rebar cage in the trench — horizontal bars tied to vertical stakes',
          'concrete spacers under the rebar for cover thickness',
          'formwork boards visible on the trench sides',
          'wire tie cut-offs on the ground near the rebar work area',
        ],
      },
      {
        _for:          'tranchee|vrd|canalis|reseau|regard|drainage|assainiss|reseaux.*enterr',
        scene_note:    'utility trench work in progress — open trench with pipe or conduit being laid in bedding material, service markers visible',
        scene_camera:  'standing at the trench edge looking along its length, showing the pipe and the bedding layer',
        scene_framing: {
          work_pct:   60,
          foreground: 'open trench showing pipe or conduit resting in gravel or sand bedding',
          midground:  'trench continuing along the run, next pipe section beside the trench',
          background: 'site surface — road, path, or garden — and site fence beyond',
        },
        scene_debris:  'pipe packaging on the ground beside the trench, small service marker flags at the entry and exit points',
        scene_exclude: ['rebar or formwork for foundations', 'decorative paving', 'finished surface', 'garden plants'],
        tools: [
          'pipe section being lowered into the trench bedding',
          'shovel for final grading of the bedding layer',
          'service locator wand resting against the trench edge',
          'pipe jointing lubricant beside the open trench',
        ],
        protections: [
          'orange safety mesh stretched across the open trench at ground level',
          'warning tape over the trench edges at the road crossing',
        ],
        chantier_details: [
          'pipe or conduit visible in the gravel bedding at the trench base',
          'gravel surround layer poured around the pipe section',
          'marker flags at the service entry and exit points',
          'trench walls showing the full depth with soil layers visible',
        ],
      },

      // --- decaissment (3 additional) ---
      {
        _for:          'decaiss|fouill|excavat|percement|terrassem',
        scene_note:    'excavation post-machine cleanup — digger bucket marks on the trench walls, manual shovel work finishing the trench bottom to exact level',
        scene_camera:  'standing at the trench edge, framing the bucket-marked walls and the manual shovel levelling the bottom',
        scene_framing: {
          work_pct:   65,
          foreground: 'shovel levelling the trench bottom — fresh earth being scraped to grade level',
          midground:  'trench walls showing wide machine bucket cut marks and ridges',
          background: 'excavated earth stockpile beside the trench, site boundary beyond',
        },
        scene_debris:  'machine-cut soil ridges on the trench walls, loose earth clods at the trench base',
        scene_exclude: ['decorative paving', 'finished surface', 'green grass lawn', 'concrete pour', 'rebar'],
        tools: [
          'long-handled shovel levelling the trench floor',
          'spirit level on the trench edge to check the bottom grade',
        ],
        protections: [
          'orange safety mesh across the open trench at ground level',
        ],
        chantier_details: [
          'machine bucket cut marks — wide horizontal ridges on the trench walls',
          'shovel levelling the trench base to the specified grade',
          'excavated soil stockpile beside the trench — machine-cut clods',
        ],
      },
      {
        _for:          'decaiss|fouill|excavat|percement|terrassem',
        scene_note:    'trench depth verification — measuring rod or tape held vertically in the trench, checking the excavation has reached the required depth',
        scene_camera:  'crouching at the trench edge, framing the measuring rod held vertically in the trench with the depth marking visible',
        scene_framing: {
          work_pct:   60,
          foreground: 'measuring rod or folding ruler held vertically from the trench base, reading at the trench lip',
          midground:  'trench interior showing raw soil walls and flat bottom',
          background: 'surrounding site surface, earth stockpile at the side',
        },
        scene_debris:  'loose earth at the trench base near the measuring rod foot',
        scene_exclude: ['decorative paving', 'finished surface', 'green grass', 'concrete pour'],
        tools: [
          'folding measuring rod held vertically in the trench',
          'spirit level beside the trench top for horizontal reference',
        ],
        protections: [
          'orange safety mesh along the open trench',
        ],
        chantier_details: [
          'measuring rod showing the trench depth at the lip — reading visible',
          'trench walls raw and vertical, bottom flat after manual finishing',
          'site datum peg visible at the trench edge for reference',
        ],
      },
      {
        _for:          'decaiss|fouill|excavat|percement|terrassem',
        scene_note:    'L-shaped excavation corner — two trench directions meeting at a 90-degree corner, corner profile showing the full depth on both runs',
        scene_camera:  'standing at the inside of the corner, framing the two trench runs meeting at 90 degrees, depth visible in both directions',
        scene_framing: {
          work_pct:   60,
          foreground: 'L-shaped corner at the bottom of the excavation — clean right-angle profile in the soil',
          midground:  'two trench runs extending away from the corner in perpendicular directions',
          background: 'site surface at trench edge, earth stockpile beyond',
        },
        scene_debris:  'corner spoil pile at the trench junction — small mound from the corner dig',
        scene_exclude: ['finished surface', 'decorative paving', 'green lawn', 'pipe in trench'],
        tools: [
          'shovel resting in one of the trench runs at the corner',
          'corner profile board used to check the 90-degree angle',
        ],
        protections: [
          'orange safety mesh across both trench runs at ground level',
        ],
        chantier_details: [
          'L-shaped corner clearly visible in the excavation — two runs at 90 degrees',
          'depth consistent on both trench runs from the corner',
          'corner spoil pile on the site surface at the junction',
        ],
      },

      // --- allée / cour (3 additional) ---
      {
        _for:          'allee|cour|chemin|dalle.*ext|pave|beton.*ext|surface.*ext',
        scene_note:    'sub-base aggregate spreading — MOT type 1 stone being raked across the prepared formation level, uniform depth being achieved',
        scene_camera:  'standing at the end of the driveway, framing the aggregate rake in use spreading the stone across the full width',
        scene_framing: {
          work_pct:   60,
          foreground: 'wide landscape rake spreading MOT stone across the prepared surface',
          midground:  'driveway width — aggregate spread evenly on one section, not yet started on the next',
          background: 'aggregate stockpile at the side, house wall or fence at the far end',
        },
        scene_debris:  'large aggregate stone pieces pushed aside during raking, disturbed edge gravel',
        scene_exclude: ['deep trench', 'rebar', 'concrete pour', 'finished paving', 'green lawn'],
        tools: [
          'wide landscape rake spreading MOT type 1 aggregate',
          'vibrating plate compactor parked at the section end',
          'spirit level resting on the aggregate after raking',
        ],
        protections: [
          'safety cones at the driveway work zone ends',
        ],
        chantier_details: [
          'MOT aggregate raked level across the prepared surface — grey stone visible',
          'aggregate depth consistent — ruler check mark visible at the edge',
          'vibrating plate compactor ready at the section end for compaction pass',
        ],
      },
      {
        _for:          'allee|cour|chemin|dalle.*ext|pave|beton.*ext|surface.*ext',
        scene_note:    'block paving being laid in herringbone pattern — pavers being placed at 45 degrees and tapped level on the sand bed',
        scene_camera:  'crouching at the laying face, framing the herringbone pattern being built block by block',
        scene_framing: {
          work_pct:   65,
          foreground: 'block paver being tapped down with a rubber mallet on the sand bed, herringbone pattern building',
          midground:  'laid section of herringbone paving behind the active face',
          background: 'string line at the far end, uncompacted sand bed ahead still to be laid',
        },
        scene_debris:  'sand bed displaced by mallet tapping, small paver fragment beside the cutting zone',
        scene_exclude: ['deep trench', 'concrete foundations', 'rebar', 'green lawn'],
        tools: [
          'rubber mallet tapping block paver onto the sand bed',
          'string line defining the 45-degree laying angle',
          'block paving spacer gauge beside the laid section',
        ],
        protections: [
          'safety cones at the driveway ends',
        ],
        chantier_details: [
          'herringbone pattern clearly forming on the laid section',
          'block being tapped level with the rubber mallet',
          'sand bed visible at the laying face ahead of the laid blocks',
        ],
      },
      {
        _for:          'allee|cour|chemin|dalle.*ext|pave|beton.*ext|surface.*ext',
        scene_note:    'kiln-dried jointing sand being brushed into block paving joints — stiff broom being swept across the completed surface',
        scene_camera:  'standing at the laid surface, framing the kiln-dried sand being swept across the paving with a stiff broom',
        scene_framing: {
          work_pct:   55,
          foreground: 'stiff broom sweeping kiln-dried sand across the paving joints — sand visible in the joints and on the surface',
          midground:  'completed paved surface — herringbone pattern or regular pattern laid',
          background: 'house wall or fence at the far end, sand bag open at the side',
        },
        scene_debris:  'kiln-dried sand scattered on the surface waiting to be swept into joints',
        scene_exclude: ['deep trench', 'aggregate base exposed', 'rebar', 'concrete pour'],
        tools: [
          'stiff broom sweeping kiln-dried sand across the paved surface',
          'open bag of kiln-dried jointing sand beside the work area',
          'plate compactor at the far end — used to vibrate sand into joints',
        ],
        protections: [
          'safety cones at the work zone boundary',
        ],
        chantier_details: [
          'kiln-dried sand being swept across the paving — joints filling with fine sand',
          'paving joints progressively filling — some fully packed, others still open',
          'sand bag open and half-emptied on the paving beside the broom',
        ],
      },

      // --- fondation (3 additional) ---
      {
        _for:          'fondation|semelle|coulage|ferraillage|ancrage|infrastructure',
        scene_note:    'concrete being poured into the foundation trench — concrete flowing from a mixer chute or bucket, vibrator probe nearby',
        scene_camera:  'standing above the trench, framing the wet concrete pouring in from the end and flowing along the formwork length',
        scene_framing: {
          work_pct:   70,
          foreground: 'wet concrete flowing into the formwork, pool of concrete growing at the pour point',
          midground:  'concrete filling between the formwork boards, rebar partially submerged',
          background: 'concrete mixer chute or bucket at the trench end, site surroundings',
        },
        scene_debris:  'concrete splashes on the formwork top and trench edge at the pour point',
        scene_exclude: ['finished driveway', 'decorative garden', 'green grass', 'pipe in trench'],
        tools: [
          'concrete being poured from a mixer chute into the foundation trench',
          'concrete vibrator probe beside the trench ready for compaction',
          'screed board for levelling the pour',
        ],
        protections: [
          'hard hat beside the trench edge',
          'orange safety mesh around the open excavation',
        ],
        chantier_details: [
          'wet concrete flowing and pooling at the pour point between the formwork',
          'rebar cage being covered progressively as the pour advances',
          'concrete splash marks on the formwork top boards',
        ],
      },
      {
        _for:          'fondation|semelle|coulage|ferraillage|ancrage|infrastructure',
        scene_note:    'concrete vibrator compacting the fresh pour — vibrator probe inserted into the concrete, air bubbles being released at the surface',
        scene_camera:  'crouching beside the trench, framing the vibrator probe submerged in the fresh concrete with the motor unit above',
        scene_framing: {
          work_pct:   70,
          foreground: 'concrete vibrator probe inserted in the fresh concrete — surface rippling with vibration',
          midground:  'wet concrete in the formwork, small air bubbles visible at the probe insertion point',
          background: 'formwork boards on the trench sides, site surroundings beyond',
        },
        scene_debris:  'concrete laitance brought to the surface by vibration — thin grey liquid at the vibrator point',
        scene_exclude: ['finished surface', 'decorative garden', 'green grass', 'pipe in trench'],
        tools: [
          'concrete vibrator probe inserted in the fresh pour, motor unit at trench level',
        ],
        protections: [
          'hard hat beside the trench',
          'safety mesh around the pour area',
        ],
        chantier_details: [
          'vibrator probe submerged — concrete surface rippling at the insertion point',
          'laitance visible at the probe point — compaction releasing trapped air',
          'concrete level rising in the formwork as it is compacted and settled',
        ],
      },
      {
        _for:          'fondation|semelle|coulage|ferraillage|ancrage|infrastructure',
        scene_note:    'formwork being struck after concrete has set — ply boards being removed to reveal the concrete strip or pad surface',
        scene_camera:  'standing at the trench end, framing the formwork board being levered off to reveal the fresh concrete face',
        scene_framing: {
          work_pct:   60,
          foreground: 'formwork ply board being levered away — fresh concrete face being revealed below it',
          midground:  'concrete strip or pad surface visible where boards already removed, rebar cast in at the top',
          background: 'trench walls, site surroundings',
        },
        scene_debris:  'formwork tie wire ends on the ground, ply board with concrete residue leaning against the trench wall',
        scene_exclude: ['finished surface', 'decorative garden', 'green grass'],
        tools: [
          'wrecking bar or pry bar for levering off the formwork boards',
        ],
        protections: [
          'hard hat near the trench',
          'safety mesh at the trench edge',
        ],
        chantier_details: [
          'fresh concrete face revealed as the board is levered away',
          'formwork tie holes visible in the concrete surface',
          'ply board with concrete residue leaning against the trench wall',
        ],
      },

      // --- tranchée / VRD (3 additional) ---
      {
        _for:          'tranchee|vrd|canalis|reseau|regard|drainage|assainiss|reseaux.*enterr',
        scene_note:    'pipe joint being made — pipe collar or push-fit coupling being pushed onto the adjacent pipe section in the trench bedding',
        scene_camera:  'crouching beside the trench, framing the pipe coupling being pushed together at the joint in the bedding',
        scene_framing: {
          work_pct:   65,
          foreground: 'pipe collar or push-fit coupling being pushed onto the adjacent pipe section in the gravel bedding',
          midground:  'trench with pipe run visible in the bedding layer, gravel surround around it',
          background: 'trench walls and site surface at the edge',
        },
        scene_debris:  'pipe jointing lubricant smeared on the pipe at the coupling point',
        scene_exclude: ['rebar or formwork', 'decorative paving', 'finished surface', 'green grass'],
        tools: [
          'push-fit pipe coupling being pressed onto the adjacent pipe end',
          'pipe jointing lubricant tube beside the coupling point',
        ],
        protections: [
          'orange safety mesh along the trench edge',
        ],
        chantier_details: [
          'pipe coupling being pushed home at the joint — socket visible at the join',
          'jointing lubricant smear on the pipe surface beside the coupling',
          'gravel bedding around the pipe run on both sides of the joint',
        ],
      },
      {
        _for:          'tranchee|vrd|canalis|reseau|regard|drainage|assainiss|reseaux.*enterr',
        scene_note:    'warning tape being laid over the pipe run before backfilling — yellow or orange tape being unrolled along the top of the pipe',
        scene_camera:  'standing at the trench edge, framing the warning tape being unrolled along the pipe run visible below',
        scene_framing: {
          work_pct:   55,
          foreground: 'yellow or orange warning tape being unrolled over the pipe run in the trench — tape reading "ATTENTION CANALISATIONS" or similar',
          midground:  'trench with pipe visible below the tape, partial backfill layer beneath the tape',
          background: 'trench running along the site, safety mesh at the edge above',
        },
        scene_debris:  'tape roll end resting at the trench edge, tape being fed off the roll into the trench',
        scene_exclude: ['rebar', 'finished paving', 'green grass'],
        tools: [
          'warning tape roll being unrolled along the pipe run',
        ],
        protections: [
          'orange safety mesh at the trench edges',
        ],
        chantier_details: [
          'yellow or orange warning tape being laid over the pipe run',
          'tape running along the trench — warning marking above the pipe',
          'partial backfill layer visible beneath the tape line',
        ],
      },
      {
        _for:          'tranchee|vrd|canalis|reseau|regard|drainage|assainiss|reseaux.*enterr',
        scene_note:    'trench backfill in progress — excavated material being shovelled back into the trench in compacted layers over the pipe',
        scene_camera:  'standing at the trench side, framing the backfill being shovelled in and the compaction layer building up',
        scene_framing: {
          work_pct:   55,
          foreground: 'shovel delivering backfill material into the open trench, pipe visible below the growing fill layer',
          midground:  'trench being progressively filled — pipe now partly buried under the backfill layer',
          background: 'stockpile of excavated material beside the trench, warning mesh at the edge',
        },
        scene_debris:  'clod of excavated material on the trench edge from the shovel,',
        scene_exclude: ['rebar', 'finished surface', 'green grass'],
        tools: [
          'long-handled shovel delivering backfill into the trench',
          'hand tamper on the ground beside the trench for layer compaction',
        ],
        protections: [
          'orange safety mesh at the trench edges',
        ],
        chantier_details: [
          'backfill layer building up in the trench over the warning tape and pipe',
          'pipe partially buried — top of pipe just visible at the compaction face',
          'trench half-filled — original depth visible on the far wall',
        ],
      },
    ],
    tools: [
      'shovel stuck vertically into the fresh earth pile',
      'pickaxe resting against a fence post or stake',
      'wheelbarrow with fresh earth parked at the trench edge',
      'compacting tamper resting on its flat head beside the trench',
    ],
    protections: [
      'orange safety mesh stretched across the open trench at ground level',
      'wooden planks bridging the trench at the pedestrian access point',
    ],
    chantier_details: [
      'fresh earth pile at the trench edge with soil profile visible',
      'gravel or aggregate exposed at the bottom of the cut',
      'boot prints in the fresh mud at the trench edge',
      'soil marks on the adjacent concrete path from boot traffic',
      'small stone or root section dug from the excavation beside the pile',
    ],
  },

  'maçonnerie': {
    scenarios: [

      // --- mur parpaing encours state-lock ---
      {
        _for:                             '^mur.*parpaing|^parpaing\\b',
        _state_for:                       'encours',
        _visual_family:                   'MACONNERIE-WALL-BLOCK-GROUND',
        _access_configuration:            'GROUND_LEVEL_BLOCK_WALL',
        _access_configuration_source:     'state_lock',
        _access_configuration_randomized: false,
        scene_note:    'concrete block wall under construction — wall is only 1.0–1.2 m tall (5–7 courses), well within standing reach from the ground — Worker 1 stands on the ground beside the wall, leaning forward with both feet flat on the earth to place a grey hollow concrete block onto the mortar bed at the top of the wall — worker is NEVER climbing onto, sitting on, or straddling the wall — Worker 2 stands on the ground at the drum mixer nearby — both workers have both feet firmly on the ground at all times and are shorter than the wall is in any way — fresh grey mortar squeeze-out visible at the block joints — mason\'s string line pulled taut along the top course — block pallet beside the wall at ground level',
        scene_camera:  'standing 2–3 m from the wall face, slight diagonal angle, camera at ground level (hip height) — wall top edge visible against the sky — both workers visible standing on the ground beside the wall, not above it',
        scene_framing: {
          work_pct:   70,
          foreground: 'drum mixer at the wall base beside a stack of grey concrete blocks on a pallet, mortar residue on the ground',
          midground:  'half-height concrete block wall — 5–7 courses, mortar joints clearly visible — Worker 1 standing on the ground next to the wall, arm reaching forward to press a block onto the mortar bed at the top — Worker 2 on the ground at the mixer — both workers clearly at ground level, wall top visible above their working hands',
          background: 'house facade or garden fence, open sky above',
        },
        scene_debris:  'mortar squeeze-out at the block joints — fresh grey mortar at all bed joint faces, cement dust on the ground near the pallet',
        scene_exclude: ['worker on top of wall', 'worker standing on wall', 'worker sitting on wall', 'ladder', 'scaffold', 'red clay bricks', 'stone wall', 'timber framing'],
        _background_variant_pool: [
          {
            _weight: 1,
            _residential_background_variant: 'NO_HOUSE_VISIBLE',
            background_override: 'garden boundary, driveway or plot limit — hedges, fencing or vegetation establish the residential context — no house facade visible in the frame',
            background_note: 'The block wall is being built along a residential garden boundary or driveway. No house facade is visible in the frame. Hedges, fencing, vegetation or neighboring garden elements establish the residential context.',
            scene_exclude_extra: ['large house facade directly behind the wall', 'windows and doors immediately blocked by the new wall', 'house dominating the composition', 'wall visually attached to the house facade'],
          },
          {
            _weight: 2,
            _residential_background_variant: 'PARTIAL_OR_DISTANT_HOUSE',
            background_override: 'small portion of a house visible at one edge of the frame or farther in the background — the house remains secondary and must not sit directly behind or visually merge with the block wall',
            background_note: 'Only a small portion of a house is visible at one edge of the frame or farther in the background. The house must remain secondary and must not sit directly behind or visually merge with the block wall.',
            scene_exclude_extra: ['large house facade directly behind the wall', 'windows and doors immediately blocked by the new wall', 'house dominating the composition', 'wall visually attached to the house facade'],
          },
        ],
        tools: [
          'brick trowel in Worker 1\'s hand pressing a block onto the mortar bed',
          'mason\'s string line pulled taut along the top course',
          'spirit level resting on the last laid course',
          'mortar hawk loaded with fresh grey mortar on the top course',
          'drum mixer running at the wall base — fresh mortar ready in bucket',
          'rubber mallet on the wall top for tapping blocks level',
        ],
        protections: [
          'safety work gloves on both workers',
          'safety boots visible at the wall base',
        ],
        chantier_details: [
          'fresh grey mortar squeeze-out at all block bed joint faces — mortar not yet cured',
          'string line defining the exact height of the next course',
          'grey hollow concrete blocks clearly identifiable — regular rectangular courses',
          'block pallet with remaining parpaings stacked beside the wall base',
          'cement bag off-cuts on the ground near the drum mixer',
        ],
      },

      // --- mur / muret parpaings ou briques ---
      {
        _for:          'mur.*parpaing|parpaing|mur.*brique|brique|muret|construction.*mur|elev.*mur',
        scene_note:    'concrete block wall being built — courses laid to waist height, mason\'s string line pulled taut defining the next course, trowel and mortar hawk on the top course',
        scene_camera:  'standing beside the wall, framing the half-built wall with the string line and mortar trowel on the top course',
        scene_framing: {
          work_pct:   65,
          foreground: 'mason\'s string line pulled taut along the top of the last course, mortar hawk with fresh mortar resting on the wall',
          midground:  'half-built concrete block wall — courses built to waist height, mortar joints visible between blocks',
          background: 'block pallet and bags of mortar beside the wall, garden or building behind',
        },
        scene_debris:  'mortar squeeze-out at the block joints — fresh grey mortar visible at the bed joint faces',
        scene_exclude: ['finished plastered wall', 'tiling equipment', 'roofing materials', 'pressure washer', 'terrassement excavation'],
        tools: [
          'brick trowel on the top course beside the mortar hawk',
          'spirit level resting on the last laid block',
          'mason\'s string line pulled taut along the course',
        ],
        protections: [
          'safety boots visible in the foreground',
        ],
        chantier_details: [
          'mortar squeeze-out at the block bed joints — fresh grey mortar visible at the joint faces',
          'string line pulled taut — next course height clearly defined',
          'block pallet with remaining blocks stacked beside the wall',
        ],
      },

      // --- fondation / semelle béton encours state-lock ---
      {
        _for:                             '^(fondation|semelle beton)$',
        _state_for:                       'encours',
        _visual_family:                   'MACONNERIE-STRIP-FOUNDATION-REBAR',
        _access_configuration:            'GROUND_LEVEL_SHALLOW_FOUNDATION',
        _access_configuration_source:     'state_lock',
        _access_configuration_randomized: false,
        setting:                          'exterior',
        scene_note:    'A shallow narrow open earth trench approximately 40–70 cm deep cut into natural soil. A three-dimensional reinforcement cage with longitudinal steel bars and regular rectangular stirrups runs inside the trench. The cage is visibly raised several centimetres above the soil on multiple small concrete cover blocks placed underneath the lower bars — at least three concrete cover blocks are clearly visible beneath the cage. The reinforcement must not touch the soil. One worker remains kneeling on the natural ground beside the trench and actively ties two crossing steel bars with tying wire and pliers. The worker is not inside the trench. Layout strings may be visible at the trench edge. Part of the cage already tied, one section still in progress. No slab enclosure boards, no broad horizontal reinforcement mesh, and no freshly poured concrete.',
        scene_camera:  'customer smartphone angle at standing height, 1.5–2.5 m from the trench edge, slight diagonal — trench visible in full width, rebar cage visible inside — worker crouched at the edge with pliers in contact with the rebar',
        scene_framing: {
          work_pct:   70,
          foreground: 'edge of the trench — excavated soil mound and a rebar tie wire reel on the ground beside the worker',
          midground:  'Worker 1 crouched at the trench lip, pliers pressed onto a stirrup-to-bar joint — rebar cage running along the trench base on white plastic spacers — completed tying visible at the left section, untied section at right',
          background: 'residential plot — hedgerow, garden fence, or neighbouring roof visible discreetly — no large house facade dominating the frame',
        },
        scene_debris:  'cut tie wire tails on the ground beside the trench, loose soil clods from excavation',
        scene_exclude: [
          'worker inside trench', 'worker at the bottom of trench', 'worker under a soil wall',
          'worker standing on rebar cage', 'worker straddling the trench',
          'deep trench requiring shoring', 'vertical unprotected soil walls above 1 m',
          'wet concrete in trench', 'fresh concrete poured over rebar',
          'horizontal slab mesh', 'large flat slab formwork', 'surface formwork boards',
          'concrete slab preparation', 'finished concrete surface',
          'red brick wall', 'block wall under construction', 'masonry wall',
          'industrial site', 'public road', 'factory',
        ],
        tools: [
          'rebar tying pliers in Worker 1\'s hand pressing a tie wire loop onto a stirrup-to-bar joint',
          'tie wire reel beside the trench on the excavated soil — wire end running to the active joint',
          'concrete spacers (plastic chairs) under the longitudinal bars — three or four clearly visible',
          'timber profile boards with string line defining the foundation axis',
        ],
        protections: [
          'safety boots on the worker',
          'orange safety mesh or wooden boards loosely marking the open trench perimeter',
        ],
        chantier_details: [
          'rebar cage: three or four longitudinal bars tied to U-stirrups at regular spacing — all joints wire-tied',
          'partly finished section left of worker — partly unfinished section right — progressive tying visible',
          'plastic spacer chairs under the bars ensuring correct concrete cover',
          'tie wire tails cut and bent on the finished joints — fresh tails still straight on recent ones',
          'excavated soil mound beside the trench — subsoil colour distinct from topsoil',
        ],
      },
      {
        _for:          'mur.*parpaing|parpaing|mur.*brique|brique|muret|construction.*mur|elev.*mur',
        scene_note:    'brick being pressed into the fresh mortar bed — spirit level placed on top of the last course, mortar squeeze-out at the joint faces, trowel beside the mason\'s hand',
        scene_camera:  'close-up at the wall face, framing the brick being pressed down into the mortar bed with the spirit level on top',
        scene_framing: {
          work_pct:   75,
          foreground: 'brick being pressed into the fresh mortar bed — mortar squeezing out at the perpend joints',
          midground:  'spirit level on the top course — bubble centred between the lines',
          background: 'wall courses below, trowel on the adjacent course surface',
        },
        scene_debris:  'mortar squeeze-out at the perpend and bed joints, mortar drip below on the lower course face',
        scene_exclude: ['concrete formwork', 'foundation trench', 'render or plaster', 'roofing tiles', 'pressure washer'],
        tools: [
          'brick trowel on the wall surface beside the just-laid brick',
          'spirit level on the top course — level being checked',
          'rubber mallet on the wall top for tapping bricks level',
        ],
        protections: [],
        chantier_details: [
          'mortar squeeze-out at the perpend and bed joints — fresh grey mortar at all joint faces',
          'spirit level bubble centred — brick laid level and plumb',
          'mortar drips on the lower course face from the laying process',
        ],
      },
      {
        _for:          'mur.*parpaing|parpaing|mur.*brique|brique|muret|construction.*mur|elev.*mur',
        scene_note:    'low garden wall nearing completion — final course of blocks in place, fresh mortar joints uncured and dark, coping stones or pointing trowel at the top',
        scene_camera:  'standing back, framing the nearly complete low wall with the fresh top course and coping detail',
        scene_framing: {
          work_pct:   55,
          foreground: 'trowel and pointing tool beside the fresh top course — mortar joints still dark and uncured',
          midground:  'completed low wall — all courses laid, top course freshly bedded, coping begun',
          background: 'garden behind the wall, adjacent ground level on both sides',
        },
        scene_debris:  'mortar drips on the wall face at the most recent courses, cement bag off-cut on the ground',
        scene_exclude: ['wall fully plastered', 'tiling', 'roofing', 'pressure washer', 'heavy excavation equipment'],
        tools: [
          'pointing trowel beside the fresh top course joints',
          'bag of mortar mix on the ground near the wall end',
          'spirit level resting against the wall face',
        ],
        protections: [],
        chantier_details: [
          'fresh top course laid — mortar joints dark and uncured across the full wall length',
          'wall finished to its target height — last course clearly visible',
          'mortar drips on the face from the upper courses during laying',
        ],
      },

      // --- dalle béton encours state-lock ---
      {
        _for:                             '^dalle.*beton|^beton.*dalle',
        _state_for:                       'encours',
        _visual_family:                   'MACONNERIE-CONCRETE-SLAB-REBAR',
        _access_configuration:            'GROUND_LEVEL_SLAB_PREPARATION',
        _access_configuration_source:     'state_lock',
        _access_configuration_randomized: false,
        scene_note:    'reinforced concrete slab in preparation — steel reinforcement mesh laid flat across the full slab area on concrete spacer chairs, wooden perimeter formwork boards pegged level on a compacted gravel subbase — Worker 1 is crouched on the mesh actively tying or adjusting a rebar joint with tie wire — worker is NEVER in a dangerous position, both feet resting on the mesh surface at ground level — worker is clearly shorter than the formwork height — no wet concrete present — the slab is entirely in the rebar and formwork stage, ready for the pour',
        scene_camera:  'standing at the corner of the slab, slight diagonal angle, camera at standing eye level — full mesh surface visible from near corner to far corner — worker visible crouched in the midground on the mesh — formwork boards visible on at least two sides — house facade visible in background',
        scene_framing: {
          work_pct:   65,
          foreground: 'wooden perimeter formwork board at the near edge of the slab — pegged level into the compacted gravel subbase',
          midground:  'steel reinforcement mesh covering the full slab area on concrete spacer chairs — Worker 1 crouched on the mesh at ground level, adjusting or tying rebar with tie wire — mesh bars parallel and evenly spaced — spacer chairs visible beneath the mesh',
          background: 'house facade and garden, open sky above',
        },
        scene_debris:  'tie wire off-cuts on the mesh surface, spacer chair packaging and rebar tie wire reel on the ground beside the formwork',
        scene_exclude: ['wet concrete', 'freshly poured concrete', 'finished smooth slab', 'masonry wall', 'roofing materials', 'pressure washer', 'trench', 'foundation trench', 'ladder'],
        tools: [
          'tie wire reel beside the mesh — wire used to fix rebar intersections',
          'formwork boards pegged level at the slab perimeter',
          'concrete spacer chairs visible below the mesh bars',
        ],
        protections: [
          'safety boots on the worker',
          'work gloves on the worker adjusting the rebar',
        ],
        chantier_details: [
          'steel mesh on spacer chairs — bars parallel and evenly spaced across the full slab area',
          'spacer chairs clearly visible below the mesh — ensuring correct concrete cover',
          'formwork boards levelled and pegged at the slab perimeter on compacted gravel',
          'no concrete yet — slab entirely in rebar and formwork preparation stage',
          'compacted gravel subbase visible beyond the formwork edges',
        ],
      },

      // --- dalle béton / terrasse béton ---
      {
        _for:          'dalle|terrasse.*beton|beton.*terr|coulage.*dalle|dalle.*beton',
        scene_note:    'reinforcement mesh laid for a concrete slab — steel mesh on spacer chairs across the full slab area, perimeter formwork boards in place, ready for the pour',
        scene_camera:  'standing at the edge of the slab area, framing the steel mesh on the spacer chairs within the formwork perimeter',
        scene_framing: {
          work_pct:   65,
          foreground: 'perimeter formwork boards at the slab edge — pegged and levelled',
          midground:  'steel reinforcement mesh on spacer chairs across the whole area — parallel bars visible',
          background: 'garden or ground surrounding the formwork area',
        },
        scene_debris:  'tie wire off-cuts on the mesh surface, spacer chair packaging on the ground beside',
        scene_exclude: ['wet concrete', 'finished smooth slab', 'masonry wall', 'roofing materials', 'pressure washer'],
        tools: [
          'steel reinforcement mesh resting on concrete spacer chairs',
          'formwork boards pegged at the slab perimeter',
          'tie wire reel beside the mesh',
        ],
        protections: [
          'safety mesh at the open site edge',
        ],
        chantier_details: [
          'steel mesh on spacer chairs — bars parallel and evenly spaced',
          'spacer chairs visible below the mesh — ensuring correct concrete cover',
          'formwork boards levelled and pegged at the slab perimeter',
        ],
      },
      {
        _for:          'dalle|terrasse.*beton|beton.*terr|coulage.*dalle|dalle.*beton',
        scene_note:    'concrete slab being poured — wet concrete flowing from a mixer drum across the reinforced area, screed board levelling the surface, concrete fully covering the mesh',
        scene_camera:  'standing at the side of the slab, framing the wet concrete pour with the mixer chute and the screed board levelling the surface',
        scene_framing: {
          work_pct:   70,
          foreground: 'wet concrete spreading across the formed area — grey shiny surface at the pour front',
          midground:  'screed board being pulled across the concrete surface to level it',
          background: 'concrete mixer or transit mixer at the pour end, site surroundings',
        },
        scene_debris:  'concrete splash on the formwork edges at the pour point, wet concrete boot prints on the path',
        scene_exclude: ['dry finished slab', 'masonry wall', 'roofing', 'tiling already laid', 'pressure washer'],
        tools: [
          'screed board being dragged across the wet concrete surface to level it',
          'concrete vibrator probe beside the pour point',
          'concrete mixer drum at the pour end of the slab',
        ],
        protections: [
          'safety boots on the workers in the concrete',
          'safety mesh at the open edge',
        ],
        chantier_details: [
          'wet grey concrete spreading to fill the formed area — shiny and fluid at the pour front',
          'screed board leaving a flat level surface behind it',
          'concrete splash on the formwork board edges at the pour point',
        ],
      },
      {
        _for:          'dalle|terrasse.*beton|beton.*terr|coulage.*dalle|dalle.*beton',
        scene_note:    'freshly screeded concrete slab — surface uniformly pale and smooth, edge formwork still in place, trowel marks visible at the corners where hand-finishing was done',
        scene_camera:  'standing at the edge, framing the smooth flat slab surface with the perimeter formwork still in place',
        scene_framing: {
          work_pct:   50,
          foreground: 'perimeter formwork boards still in place — concrete surface meeting the board top edge cleanly',
          midground:  'smooth freshly trowelled concrete slab surface — pale, uniform, lightly textured',
          background: 'garden or site surround beyond the formwork perimeter',
        },
        scene_debris:  'trowel marks at the slab corners from the hand-finishing pass',
        scene_exclude: ['slab fully cured and dry', 'tiles on the slab', 'masonry wall', 'roofing', 'pressure washer'],
        tools: [
          'steel float resting at the slab edge — used for the final trowel pass',
          'screed board leaning against the formwork at the side',
        ],
        protections: [
          'formwork boards still in place — protecting the slab edge',
        ],
        chantier_details: [
          'concrete surface pale and smooth — hand-trowelled finish visible at the edges',
          'formwork boards still in place along all four sides of the slab',
          'trowel marks at the corners from the finishing pass',
        ],
      },

      // --- fondations ---
      {
        _for:          'fondation|semelle|ferraillage|ancrage|infrastructure',
        scene_note:    'strip foundation rebar cage in the trench — rebar tied and laid along the trench base before the concrete pour, tie wire ends visible, spacers under the bars',
        scene_camera:  'standing at the trench edge, framing the rebar cage along the trench base',
        scene_framing: {
          work_pct:   65,
          foreground: 'rebar cage in the trench — parallel bars tied with wire, concrete spacers beneath',
          midground:  'trench continuing — rebar cage running along its full length',
          background: 'trench walls, site surroundings at the surface',
        },
        scene_debris:  'tie wire off-cuts on the rebar surface, spacer packaging on the ground beside the trench',
        scene_exclude: ['concrete pour already done', 'finished slab on top', 'masonry wall up', 'roofing'],
        tools: [
          'tie wire reel beside the trench — used to tie the rebar joints',
          'pliers on the trench edge beside the rebar cage',
          'concrete spacers under the rebar bars',
        ],
        protections: [
          'orange safety mesh at the open trench edge',
        ],
        chantier_details: [
          'rebar cage tied and laid along the trench base — parallel bars clearly visible',
          'tie wire joints at the rebar intersections — wire tails left on the underside',
          'concrete spacers under the bars ensuring correct foundation cover',
        ],
      },
      {
        _for:          'fondation|semelle|ferraillage|ancrage|infrastructure',
        scene_note:    'foundation concrete being poured — wet concrete flowing into the reinforced trench from a mixer chute, vibrator probe being used to compact the pour',
        scene_camera:  'standing above the trench, framing the concrete flowing in from one end, vibrator probe in use',
        scene_framing: {
          work_pct:   70,
          foreground: 'concrete pour point — wet grey concrete flowing from the chute into the rebar-filled trench',
          midground:  'trench section with rising concrete level — rebar gradually submerging',
          background: 'mixer at the pour end, open trench ahead still to be poured',
        },
        scene_debris:  'concrete splash on the trench walls at the pour point, concrete boot prints on the ground beside',
        scene_exclude: ['finished slab', 'masonry wall already up', 'tiling', 'roofing', 'pressure washer'],
        tools: [
          'concrete vibrator probe being inserted in the fresh pour — compacting the concrete',
          'mixer chute directing wet concrete into the trench',
        ],
        protections: [
          'safety mesh at the open trench edge',
          'safety boots on the workers in the trench',
        ],
        chantier_details: [
          'wet concrete rising in the trench — rebar progressively submerging as the pour advances',
          'vibrator probe compacting the concrete — surface rippling at the insertion point',
          'concrete splash on the trench walls at the pour point',
        ],
      },
      {
        _for:          'fondation|semelle|ferraillage|ancrage|infrastructure',
        scene_note:    'foundation formwork with concrete poured inside — ply boards holding the wet concrete, tie rods at intervals, fresh concrete surface just level with the board top edge',
        scene_camera:  'standing at the end of the formwork run, framing the poured concrete held between the ply boards',
        scene_framing: {
          work_pct:   60,
          foreground: 'ply formwork board at the near end — tie rod visible at board mid-height',
          midground:  'fresh concrete surface between the formwork boards — grey and smooth at the top edge',
          background: 'formwork run continuing, site surroundings beyond',
        },
        scene_debris:  'concrete splash on the formwork board face outside at the pour point',
        scene_exclude: ['formwork struck', 'finished foundation surface', 'masonry wall up', 'tiling', 'roofing'],
        tools: [
          'ply formwork boards tied with rods at intervals — holding the wet concrete',
          'screeding board on the top of the formwork used to level the pour',
        ],
        protections: [
          'safety mesh at the trench edge perimeter',
        ],
        chantier_details: [
          'fresh concrete surface level with the formwork board top edge',
          'tie rod heads visible on the outside face of the ply boards',
          'ply board face soiled with concrete splash at the pour point',
        ],
      },

      // --- escalier / seuil / linteau / ouverture ---
      {
        _for:          'escalier.*beton|seuil|linteau|ouverture.*mur|percement|ouverture',
        scene_note:    'lintel being set above a newly created wall opening — concrete or steel lintel supported at both bearing points, freshly cut masonry on either side of the opening',
        scene_camera:  'standing in front of the wall opening, framing the lintel resting on the bearing seats on both sides of the gap',
        scene_framing: {
          work_pct:   65,
          foreground: 'open wall gap — freshly cut masonry edges on both sides of the opening',
          midground:  'lintel resting on both bearing seats — propped from below while the mortar sets',
          background: 'wall continuing on both sides, room interior or exterior beyond the opening',
        },
        scene_debris:  'masonry dust and cut block fragments on the floor below the opening, prop adjustment wedge beside the prop',
        scene_exclude: ['finished door frame fitted', 'rendering over', 'window fitted', 'roofing', 'pressure washer', 'tiling'],
        tools: [
          'adjustable acrow prop supporting the lintel from below during curing',
          'spirit level on the lintel surface — checking level',
          'pointing trowel for the bearing mortar bed',
        ],
        protections: [
          'debris sheet on the floor below the opening',
        ],
        chantier_details: [
          'lintel resting on both bearing seats — prop supporting from below',
          'freshly cut masonry edges on both jambs — concrete dust still on the floor',
          'fresh mortar visible at both lintel bearing points',
        ],
      },
      {
        _for:          'escalier.*beton|seuil|linteau|ouverture.*mur|percement|ouverture',
        scene_note:    'concrete staircase formwork being assembled — ply shuttering boards at each step profile, reinforcement visible through the open side, formwork propped from below',
        scene_camera:  'standing beside the stair formwork, framing the step profiles and the reinforcement visible through the open side',
        scene_framing: {
          work_pct:   65,
          foreground: 'stair step profiles in ply shuttering — riser boards at each step, tread form visible',
          midground:  'reinforcement bars visible through the open side of the formwork — tied cage in place',
          background: 'site surroundings, wall face behind the stair run',
        },
        scene_debris:  'saw offcuts from the ply shuttering on the ground beside the formwork',
        scene_exclude: ['finished concrete stairs', 'tiled stairs', 'roofing', 'pressure washer'],
        tools: [
          'ply shuttering boards forming the step profile — propped from below',
          'rebar visible through the open formwork side',
          'circular saw or hand saw on the ground beside the formwork',
        ],
        protections: [
          'formwork propped securely — no movement under pour weight',
        ],
        chantier_details: [
          'ply step profiles forming clear riser and tread shapes',
          'rebar cage visible through the open side of the formwork',
          'saw offcuts on the ground from cutting the ply shuttering to shape',
        ],
      },
      {
        _for:          'escalier.*beton|seuil|linteau|ouverture.*mur|percement|ouverture',
        scene_note:    'concrete door threshold being formed — wet concrete in a threshold formwork, trowel marks on the fresh surface, adjacent floor tile visible on one side',
        scene_camera:  'crouching at floor level, framing the threshold formwork with wet concrete and the trowel marks on the surface',
        scene_framing: {
          work_pct:   70,
          foreground: 'threshold formwork at floor level — wet concrete inside, trowel marks across the surface',
          midground:  'door frame or reveal on one side, adjacent floor surface on the other side',
          background: 'room interior or exterior beyond the threshold level',
        },
        scene_debris:  'concrete splash on the adjacent floor surface at the threshold edge',
        scene_exclude: ['finished tiled threshold', 'door fully fitted', 'roofing', 'pressure washer'],
        tools: [
          'pointing trowel on the threshold surface — used to level and smooth',
          'short spirit level resting on the threshold formwork edge',
        ],
        protections: [],
        chantier_details: [
          'wet concrete in the threshold form — surface trowelled level and smooth',
          'trowel marks visible at the far edge of the threshold',
          'concrete splash on the adjacent floor surface',
        ],
      },

      // --- rejointoiement pierre encours state-lock ---
      {
        _for:                             '^rejointoiement pierre$',
        _state_for:                       'encours',
        _visual_family:                   'MACONNERIE-STONE-REPOINTING-GROUND',
        _access_configuration:            'GROUND_LEVEL_STONE_REPOINTING',
        _access_configuration_source:     'state_lock',
        _access_configuration_randomized: false,
        scene_note:    'stone wall repointing in progress at ground level — wall of irregular natural stones (limestone, granite, or sandstone), old joints visibly recessed and dark where already raked out — Worker 1 crouched or kneeling directly in front of the wall at the low section, pointing trowel physically pressed into an open joint between two stones, fresh grey mortar visible immediately behind the trowel tip — several adjacent joints already filled with fresh pale mortar, nearby joints still recessed and unfinished — the stones themselves remain clearly visible and uncovered, mortar applied only inside the joints — wall zone worked extends from the soubassement up to approximately 1.2 m — NO ladder, NO scaffold — worker has both feet firmly on the ground',
        scene_camera:  'customer smartphone angle, standing 1.5–2 m from the wall at standing eye level, slight diagonal — full work section visible from soubassement to 1.2 m — worker visible crouched at the wall with trowel in contact with a joint — fresh and open joints both visible',
        scene_framing: {
          work_pct:   70,
          foreground: 'mortar trough (auge) or small bucket with fresh grey mortar mix at the wall base beside the worker',
          midground:  'Worker 1 crouched at the wall face, pointing trowel pressed into an open joint — fresh pale mortar visible in the filled joints above — recessed dark old joints still open below — stones clearly identifiable as natural irregular shapes',
          background: 'garden or courtyard extending behind the worker — house wall continuing to left and right',
        },
        scene_debris:  'old mortar fragments on the ground at the wall base from the joint raking — small pile of rubble beside the mortar trough',
        scene_exclude: ['smooth rendered wall', 'crack in plaster or render', 'new stone wall construction', 'scaffold', 'ladder', 'pressure washer', 'concrete block wall', 'plaster or render applied over stones', 'paint on wall'],
        tools: [
          'pointing trowel pressed into an open joint — fresh mortar visible immediately behind the tip',
          'small mortar trough (auge) or bucket with fresh grey mortar at the worker\'s side',
          'cold chisel on the ground — used for raking out old mortar',
          'small finishing brush leaning against the mortar trough — secondary tool',
        ],
        protections: [
          'work gloves on the worker',
          'safety glasses resting on the mortar trough',
        ],
        chantier_details: [
          'natural irregular stones clearly visible — limestone, granite, or sandstone surface texture identifiable',
          'fresh pale grey mortar in the filled joints — flush or slightly recessed, not covering the stone faces',
          'old dark recessed joints in the remaining open section — clearly depleted',
          'sharp demarcation between freshly pointed section and unfinished section',
          'old mortar fragments on the ground from the raking preparation',
        ],
      },

      // --- fissures / rejointoiement ---
      {
        _for:          'fissure|rejointoi|pierre.*join|joint.*pierre|reprise.*macon|rejoint',
        scene_note:    'facade crack being repaired — wide crack in old render filled with repair mortar, pointing trowel drawing the fresh mortar flush with the surrounding render surface',
        scene_camera:  'close-up on the facade, framing the crack with the fresh mortar being applied by the pointing trowel',
        scene_framing: {
          work_pct:   75,
          foreground: 'crack in the facade render — fresh repair mortar being drawn flush by a pointing trowel',
          midground:  'surrounding render — older, slightly discoloured, the repaired crack clearly different in colour',
          background: 'facade wall extending, window or corner visible at the side',
        },
        scene_debris:  'old render fragments chipped from the crack edges on the ground below the repair',
        scene_exclude: ['large render section', 'scaffold for full ravalement', 'roofing materials', 'pressure washer', 'tiling'],
        tools: [
          'pointing trowel drawing repair mortar flush with the surrounding render',
          'small scraper on the ground beside the wall — used to open and clean the crack',
        ],
        protections: [],
        chantier_details: [
          'fresh repair mortar visible in the crack — slightly lighter in colour than the surrounding render',
          'crack edges showing old render depth — crack had been opened and cleaned before filling',
          'old render fragments on the ground below from the preparation work',
        ],
      },
      {
        _for:          'fissure|rejointoi|pierre.*join|joint.*pierre|reprise.*macon|rejoint',
        scene_note:    'stone wall repointing in progress — pointing trowel pressing fresh grey mortar into raked-out joints between stones, contrast between fresh mortar and weathered dark old joints clearly visible',
        scene_camera:  'close-up at the wall surface, framing the pointing trowel working a joint with the fresh-pointed section above and the old recessed joints below',
        scene_framing: {
          work_pct:   70,
          foreground: 'pointing trowel pressing fresh mortar into a raked-out joint between two stones',
          midground:  'wall face — fresh mortar joints on the upper section contrast sharply with recessed dark old joints on the lower section',
          background: 'stone wall continuing, ladder or platform visible at the side',
        },
        scene_debris:  'old mortar fragments raked out from the joints on the ground below the work area',
        scene_exclude: ['smooth rendered wall', 'tiling', 'roofing', 'pressure washer', 'concrete block wall'],
        tools: [
          'pointing trowel pressing fresh mortar into the raked joint',
          'mortar bucket with fresh mortar mix at the base of the wall',
          'cold chisel and hammer on the ground for raking out old joints',
        ],
        protections: [],
        chantier_details: [
          'fresh grey mortar joints on the upper section — pale and flush with the stone faces',
          'old dark recessed joints below — clearly depleted and weathered',
          'raked-out mortar fragments on the ground from the joint preparation',
        ],
      },
      {
        _for:          'fissure|rejointoi|pierre.*join|joint.*pierre|reprise.*macon|rejoint',
        scene_note:    'half-repointed stone wall — left half freshly pointed with pale grey mortar, right half still showing original dark recessed joints, sharp vertical demarcation line between them',
        scene_camera:  'standing back from the wall, framing the full wall height with the half-pointed/half-old contrast clearly visible',
        scene_framing: {
          work_pct:   55,
          foreground: 'mortar bucket on the ground at the base of the wall, pointing tools beside it',
          midground:  'wall face — left half freshly pointed pale grey, right half dark recessed old joints — vertical division line sharp',
          background: 'garden behind the wall, adjacent structures visible at the sides',
        },
        scene_debris:  'old mortar fragments on the ground below the right half from raking — still to be pointed',
        scene_exclude: ['smooth rendered wall', 'tiling', 'roofing', 'concrete block wall', 'pressure washer'],
        tools: [
          'pointing trowel resting on the mortar bucket',
          'cold chisel on the ground from the joint raking pass',
          'ladder resting against the wall at the halfway point',
        ],
        protections: [],
        chantier_details: [
          'sharp vertical demarcation between fresh pale mortar joints and dark old recessed joints',
          'left half fully repointed — mortar flush with stone faces',
          'right half still original — joints deeply recessed and dark with age',
        ],
      },

      // Fallback
      {
        scene_note:    'masonry work in progress — partially built concrete block or stone wall, mortar tools at the top course, materials stacked at the wall base',
        scene_camera:  'standing beside the work, framing the wall section being built with the tools and materials around the base',
        scene_framing: {
          work_pct:   55,
          foreground: 'block pallet or sand-cement bags stacked at the wall base, bucket of mortar nearby',
          midground:  'partially built wall — several courses laid, mortar joints visible',
          background: 'site surroundings, garden or building behind',
        },
        scene_debris:  'mortar squeeze-out at the block joints, cement bag off-cut on the ground',
        scene_exclude: ['finished plastered or tiled wall', 'roofing materials', 'pressure washer', 'tiling equipment'],
        tools: [
          'brick trowel resting on the top course of a partially built wall',
          'spirit level leaning against the wall beside the freshly laid block',
          'mason\'s string line pulled taut along the block course',
          'plastic mixing bucket with fresh mortar residue beside the wall base',
        ],
        protections: [
          'safety boots visible at the base of the wall',
        ],
        chantier_details: [
          'mortar squeeze-out at the block bed joints — fresh grey mortar at the joint faces',
          'string line pulled taut defining the next course height',
          'cement bag off-cuts on the ground beside the mixer',
        ],
      },
    ],
    tools: [
      'brick trowel resting on the top course of a partially built wall',
      'spirit level leaning against the wall beside the freshly laid block',
      'mason\'s string line pulled taut along the block course',
      'plastic mixing bucket with fresh mortar residue beside the wall base',
      'bag of sand-cement mix stacked against the house wall',
      'wooden mallet on the ground near the block pile',
    ],
    protections: [
      'safety mesh at the open excavation or trench edge',
      'wooden board protecting the garden bed at the wall base',
    ],
    chantier_details: [
      'mortar squeeze-out at the block joint faces — fresh grey mortar visible',
      'string line pulled taut defining the next course height',
      'cement bag off-cuts on the ground beside the mixer',
      'block off-cut near the end of the wall run',
    ],
  },

};
