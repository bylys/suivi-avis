/**
 * etancheite.js — Phase 2 shadow copy (source active : app.js)
 * Copie stricte de WORK_SCENES {etancheite} et SITE_REALISM {etancheite}.
 * Ne pas modifier avant le cutover validé.
 */

export const WORK_SCENES_ETANCHEITE = {
  etancheite: {
    category:         'étanchéité',
    priority:         4,
    service_keywords: [
      { phrase: 'etancheite toit terrasse',      score: 15 },
      { phrase: 'infiltration toiture',          score: 14 },
      { phrase: 'impermeabilisation toiture',    score: 14 },
      { phrase: 'toit terrasse',                 score: 13 },
      { phrase: 'etancheite toiture',            score: 13 },
      { phrase: 'membrane bitume',               score: 13 },
      { phrase: 'membrane epdm',                 score: 13 },
      { phrase: 'membrane pvc',                  score: 13 },
      { phrase: 'resine etanche',                score: 13 },
      { phrase: 'resine etancheite',             score: 13 },
      { phrase: 'terrasse etanche',              score: 13 },
      { phrase: 'bac acier etanche',             score: 13 },
      { phrase: 'recherche de fuite',            score: 13 },
      { phrase: 'reparation de fuite',           score: 13 },
      { phrase: 'reparation fuite',              score: 13 },
      { phrase: 'reparation infiltration',       score: 13 },
      { phrase: 'fuite toiture',                 score: 12 },
      { phrase: 'fuite toit',                    score: 12 },
      { phrase: 'releve etancheite',             score: 12 },
      { phrase: 'impermeabilisation',            score: 12 },
      { phrase: 'joint etancheite',              score: 11 },
      { phrase: 'bac acier',                     score: 10 },
      { phrase: 'solin',                         score: 10 },
      { phrase: 'infiltration',                  score: 10 },
      { phrase: 'etancheite',                    score: 9  },
      { phrase: 'fuite',                         score: 8  },
    ],
    exclude_if: [],
    intro:      'flat roof waterproofing work on a residential or commercial building',
    setting:    'exterior',
    secteur:           'waterproofing specialist',
    variation_setting: 'roof',
    hasWorkers:        false,
    camera:            'crouching on the flat roof or terrace, wide view of membrane work, parapet visible at edges',
    materials:  ['bitumen membrane rolls', 'primer residue', 'protective gravel', 'aluminium flashing'],
    photo_defects: [
      'harsh overhead midday light flattening the dark membrane texture',
      'slight horizon tilt on the flat roof surface',
    ],
    exclusions: ['gas torches', 'gas canisters', 'workers', 'people', 'safety harnesses'],
    states: {
      debut: {
        framing: {
          work_pct:   40,
          foreground: 'section of old membrane peeled back — bare concrete or screed substrate exposed, primer marks drying',
          midground:  'flat roof mostly still covered by old weathered grey membrane, one strip removed',
          background: 'parapet wall, neighbouring rooftops, open sky',
        },
        debris:      'strips of old membrane rolled up at the roof edge, primer dust near stripped area',
        description: 'Work has just started. A section of old membrane is removed, exposing bare substrate. The primer coat is drying.',
      },
      encours: {
        framing: {
          work_pct:   55,
          foreground: 'new bitumen membrane sheets overlapping neatly, seams visible on half the surface',
          midground:  'clear boundary between new dark membrane and old weathered grey covering',
          background: 'parapet wall, rooftop equipment, sky',
        },
        debris:      'membrane offcuts and packaging near the active work edge',
        description: 'Half the roof is covered in new membrane. The contrast between fresh black and old grey is clear. Active professional work.',
      },
      semifinal: {
        framing: {
          work_pct:   60,
          foreground: 'membrane fully laid, parapet edges and upstands being sealed with aluminium flashing',
          midground:  'complete new membrane surface — smooth, dark, uniformly flat',
          background: 'parapet walls, sky, neighbouring building roofline',
        },
        debris:      'a few leftover membrane offcuts near the parapet wall, otherwise clean',
        description: 'Membrane covering is complete. Edge flashings around the parapet are being sealed. Almost finished.',
      },
      final: {
        framing: {
          work_pct:   65,
          foreground: 'clean finished flat roof — uniform dark membrane, sealed edges, clear drainage outlets',
          midground:  'complete waterproofed surface, drainage points visible and unobstructed',
          background: 'parapet walls, sky, neighbouring roofline',
        },
        debris:      'none — roof surface clean and ready',
        description: 'Waterproofing complete. New membrane, sealed parapet edges, clear drainage. A professional result.',
      },
    },
  },

};

export const SITE_REALISM_ETANCHEITE = {
  etancheite: {
    _dispatch: 'contexte',

    maison: {
      scenarios: [

        // ─── Réparation fuite / recherche fuite / infiltration ────────────────
        {
          _for:          'fuite|infiltration|recherche.*fuite',
          scene_note:    'localized roof leak repair — compact zone of 2–6 tiles opened to access the infiltration point, new patch membrane or sealant being applied to the identified source, rest of the roof intact and untouched',
          scene_camera:  'crouching on the roof slope at the repair zone, framing the small open area with the patch material being applied and the surrounding undisturbed tiles',
          scene_framing: {
            work_pct:   70,
            foreground: 'compact open repair zone — 2–4 tiles temporarily lifted or removed, patch material being applied to the substrate below',
            midground:  'surrounding tiles on the pitched slope, completely undisturbed, roof intact beyond the repair perimeter',
            background: 'tiled roof slope continuing, open sky — no flat membrane expanse, no parapet',
          },
          scene_debris:  'old failed sealant or membrane fragment removed from the repair zone, placed beside the open section',
          scene_exclude: ['large flat membrane surface', 'parapet wall', 'HVAC units', 'full roof membrane replacement', 'scaffold platform', 'bitumen torch'],
          tools: [
            'tube of bitumen mastic or sealant with nozzle at the repair zone',
            'patch membrane strip cut to size resting beside the open section',
            'putty knife for spreading sealant at the junction',
            'roof ladder hooked over the ridge for access to the repair zone',
          ],
          protections: [
            'roof ladder providing safe access to the localized repair zone',
            'knee pad on the tile surface at the work area',
          ],
          chantier_details: [
            'compact repair zone — only 2–4 tiles disturbed, clear boundary with intact roof',
            'new patch material being applied — localized intervention, not full-surface work',
            'removed tile stack beside the repair zone — will be replaced after patch cures',
          ],
        },
        {
          _for:          'fuite|infiltration|recherche.*fuite',
          scene_note:    'roof leak diagnosis — torch or inspection probe being used at the suspected infiltration point on a pitched tiled roof, compact zone, rest of the roof intact',
          scene_camera:  'crouching at the suspected leak point on the tile surface, close view of the inspection being done at the junction or tile suspect',
          scene_framing: {
            work_pct:   65,
            foreground: 'compact suspect zone — probe, torch, or moisture meter at the likely infiltration point at a tile joint or flashing junction',
            midground:  'surrounding intact tiles on the pitched slope',
            background: 'tiled roof continuing, open sky — no flat membrane, no parapet',
          },
          scene_debris:  'small area of debris or failed sealant at the suspect point',
          scene_exclude: ['large flat roof', 'parapet', 'membrane roll', 'scaffold', 'HVAC units'],
          tools: [
            'moisture meter or inspection probe at the suspect tile junction',
            'torch for close examination of the potential infiltration point',
          ],
          protections: [
            'roof ladder for safe access',
            'knee pad on the tile surface',
          ],
          chantier_details: [
            'suspect infiltration point clearly identified — compact zone on the pitched slope',
            'failed mortar joint or cracked tile edge at the inspection focus',
            'surrounding tiles undisturbed — targeted investigation approach',
          ],
        },

        // ─── Étanchéité toit-terrasse / toiture plate / EPDM / PVC / bitume / réfection ──
        {
          _for:          'etancheite.*toit|toiture.*plate|epdm|pvc|bitume|refection.*etanch',
          scene_note:    'full flat roof waterproofing on a residential building — large horizontal surface with high parapet wall on all sides, new EPDM or bitumen membrane being laid across the full surface, drainage outlets visible, no ground visible below the parapet',
          scene_camera:  'crouching or standing on the flat roof surface, wide view of the membrane work — parapet walls on all sides framing the scene, no garden or ground visible below',
          scene_framing: {
            work_pct:   65,
            foreground: 'new membrane surface being unrolled or lap-joined — seam roller or squeegee at the active joint line',
            midground:  'large flat roof surface — mix of newly laid membrane and substrate or old membrane still to be covered',
            background: 'parapet wall rising on all sides — no garden visible, neighbouring rooftops at parapet height or above',
          },
          scene_debris:  'membrane offcuts stacked near the parapet, empty primer can on the substrate',
          scene_exclude: ['ground visible below parapet', 'garden', 'railing', 'porte-fenêtre', 'balcony railing', 'compact surface', 'pitched tiled roof'],
          tools: [
            'seam roller pressing the membrane lap joint at the active edge',
            'bitumen primer can with brush near the parapet base',
            'utility knife beside the trimmed membrane roll for cutting to length',
            'tape measure and chalk line for membrane layout alignment',
          ],
          protections: [
            'protective board over the existing surface at the rooftop access point',
            'plastic cap over the flat roof drain inlet during membrane application',
          ],
          chantier_details: [
            'large continuous flat roof surface — membrane layout covering most of the area',
            'parapet wall visible on all sides — high enough to block any ground view',
            'drainage outlet point capped during work — will be cleared after membrane laps are sealed',
            'membrane offcut pile near the parapet — evidence of full-surface work scale',
          ],
        },
        {
          _for:          'etancheite.*toit|toiture.*plate|epdm|pvc|bitume|refection.*etanch',
          scene_note:    'parapet upstand waterproofing on a toit-terrasse — membrane being turned up at the parapet base forming the peripheral relevé, metal counter-flashing strip being pressed at the top of the upstand',
          scene_camera:  'crouching at the parapet base, framing the membrane upstand being formed at the parapet foot — parapet rising above, large flat roof surface visible behind',
          scene_framing: {
            work_pct:   70,
            foreground: 'membrane strip being turned up at the parapet foot — upstand being pressed firmly at the corner',
            midground:  'flat roof surface behind, parapet wall rising beside the work area',
            background: 'neighbouring rooftops or sky above the parapet — no garden or ground visible',
          },
          scene_debris:  'membrane backing strip removed and beside the upstand work zone',
          scene_exclude: ['ground visible', 'garden', 'balcony railing', 'porte-fenêtre', 'compact balcony surface'],
          tools: [
            'rubber roller pressing the membrane upstand onto the parapet face',
            'corner roller for forming the right-angle at the parapet foot',
            'bitumen primer brush at the parapet base',
          ],
          protections: [
            'protective board at the flat roof access hatch entry point',
          ],
          chantier_details: [
            'membrane upstand at the parapet foot — vertical waterproofing height clearly visible',
            'metal counter-flashing strip at the top of the upstand, screwed to the parapet face',
            'large flat roof surface behind — scale of the toit-terrasse evident',
          ],
        },

        // ─── Étanchéité balcon / terrasse (compact, garde-corps, porte-fenêtre) ──
        {
          _for:          'balcon|terrasse',
          scene_note:    'waterproofing a compact residential balcony — small horizontal surface opening directly from a porte-fenêtre, peripheral metal railing visible, membrane being laid on the compact floor area, facade wall and window clearly visible as context',
          scene_camera:  'standing in the open doorway or just outside, framing the compact balcony floor being waterproofed — railing on three sides, porte-fenêtre frame or facade wall clearly visible behind',
          scene_framing: {
            work_pct:   65,
            foreground: 'compact balcony floor surface — new membrane being unrolled or primer being brushed on the small area',
            midground:  'metal railing or balustrade on the balcony perimeter, drain outlet at the low corner',
            background: 'facade wall of the building with the porte-fenêtre frame — NOT a large flat roof parapet',
          },
          scene_debris:  'membrane offcut on the balcony floor beside the work zone, primer can open on the substrate',
          scene_exclude: ['large flat roof expanse', 'high parapet wall blocking all ground view', 'HVAC units', 'no railing visible', 'large horizontal surface'],
          tools: [
            'seam roller pressing membrane lap joint on the compact balcony floor',
            'primer brush applying bitumen primer to the small floor area',
            'utility knife beside the membrane roll for cutting to the balcony dimensions',
          ],
          protections: [
            'protective board at the porte-fenêtre sill to protect the window frame',
          ],
          chantier_details: [
            'compact balcony floor surface — much smaller than a toit-terrasse, metal railing defines the perimeter',
            'porte-fenêtre frame visible as a clear contextual element',
            'drain outlet at the low corner of the balcony — membrane being sealed around it',
          ],
        },
        {
          _for:          'balcon|terrasse',
          scene_note:    'completed balcony waterproofing — new membrane laid across the compact floor, drain outlet clear, railing visible on all open sides, porte-fenêtre and facade wall as clear background context',
          scene_camera:  'stepping back to frame the completed balcony — new floor surface, railing perimeter, porte-fenêtre behind',
          scene_framing: {
            work_pct:   55,
            foreground: 'new membrane surface on the compact balcony floor — sealed at all edges and around the drain outlet',
            midground:  'metal railing on the perimeter, drain outlet clear and unobstructed',
            background: 'building facade with porte-fenêtre — garden or street visible a storey below through the railing',
          },
          scene_debris:  'light primer residue at the drain edge — floor otherwise clean',
          scene_exclude: ['large flat roof expanse', 'high parapet wall', 'HVAC units', 'no railing'],
          tools: [
            'corner roller resting beside the completed membrane edge',
          ],
          protections: [
            'protective foam at the window sill edge',
          ],
          chantier_details: [
            'compact sealed floor — new membrane visible, edges turned up at the wall base',
            'railing perimeter clearly defines the small balcony scale',
            'garden or street visible below through the railing — scale contrast with toit-terrasse evident',
          ],
        },

        // ─── Existing scenarios (pitched roof repairs) ─────────────────────────
        {
          _for:          'solin|cheminee|faitage',
          scene_note:    'chimney flashing (solin) repair on a pitched tiled roof — zinc strip being refitted around the chimney base, localized repair zone only, rest of the roof untouched',
          scene_camera:  'crouching on the roof slope close to the chimney, framing the chimney base and the surrounding tiles — chimney occupies the centre of frame',
          scene_framing: {
            work_pct:   70,
            foreground: 'chimney base and the zinc flashing strip being refitted — mortar joint and tile edge visible',
            midground:  'a few surrounding tiles on the pitched slope, roof continuing normally in both directions',
            background: 'naturally weathered tiled roof slope and open sky — no flat membrane, no parapet, no rooftop equipment',
          },
          scene_debris:  'small pile of old mortar chips on the tile beside the chimney base',
          scene_exclude: ['flat membrane surface', 'parapet wall', 'HVAC units', 'rooftop technical equipment', 'large flat roof expanse', 'bitumen membrane roll'],
          tools: [
            'zinc flashing strip cut to length resting against the chimney foot',
            'tube of bituminous sealant with nozzle on the tile near the chimney',
            'tin snips resting on the tile beside the chimney base',
            'small hand trowel on the tile at the mortar joint',
          ],
          protections: [
            'knee pad on the tile surface at the chimney work area',
          ],
          chantier_details: [
            'cracked old mortar at the chimney base partially removed',
            'new zinc strip held in place at the chimney foot with a temporary clamp',
            'small pile of old sealant removed from the joint beside the chimney',
            'two tiles lifted to allow the flashing to slide underneath',
          ],
        },
        {
          _for:          'velux|lucarne|fenetre.*toit|chassis.*toit',
          scene_note:    'Velux or roof window resealing on a pitched tiled roof — peel-and-stick flashing being applied around the window frame, localized repair, rest of the roof untouched',
          scene_camera:  'crouching on the roof slope beside the Velux window, framing the window frame and the adjacent tiles — window frame fills the centre of frame',
          scene_framing: {
            work_pct:   65,
            foreground: 'Velux frame corner and the new peel-and-stick flashing strip or sealant bead being applied',
            midground:  'tiles surrounding the window on the pitched slope, roof continuing normally',
            background: 'tiled roof slope extending away and open sky — no flat membrane, no parapet',
          },
          scene_debris:  'strip of old dried sealant removed from the frame edge, lying on the adjacent tile',
          scene_exclude: ['flat membrane surface', 'parapet wall', 'HVAC units', 'rooftop technical equipment', 'large flat roof expanse', 'bitumen membrane roll'],
          tools: [
            'peel-and-stick flashing tape strip beside the window frame',
            'tube of silicone sealant with nozzle on the tile near the frame',
            'putty knife resting on the tile near the window edge',
          ],
          protections: [
            'protective foam strip along the window frame contact edge',
          ],
          chantier_details: [
            'old dried sealant removed around the window frame edge',
            'new sealant bead partially applied along one frame side',
            'flashing kit cardboard packaging beside the window on the tile surface',
            'two lifted tiles resting beside the window frame',
          ],
        },
        {
          _for:          'noue|vallee|jonction.*pente',
          scene_note:    'valley (noue) repair on a pitched tiled roof — new zinc valley strip being positioned between two roof slopes, tiles around the valley left intact',
          scene_camera:  'crouching at the junction of two roof slopes, framing the valley channel running down between the two tile surfaces',
          scene_framing: {
            work_pct:   60,
            foreground: 'zinc valley strip being laid into the noue channel between two tile surfaces',
            midground:  'tiles on either side of the valley, a few lifted to allow the new zinc to seat properly',
            background: 'two meeting tiled pitches and open sky — no flat membrane, no parapet',
          },
          scene_debris:  'old corroded zinc strip removed and placed beside the valley, leaf and moss debris cleared to one side',
          scene_exclude: ['flat membrane surface', 'parapet wall', 'HVAC units', 'rooftop technical equipment', 'large flat roof expanse', 'bitumen membrane roll'],
          tools: [
            'zinc valley strip resting in the noue ready to be positioned',
            'tin snips on the tile surface beside the valley top',
            'hammer and roofing nails on the tile near the valley',
          ],
          protections: [
            'knee pad on the tile surface at the valley edge',
          ],
          chantier_details: [
            'old valley debris — compacted moss and leaf fragments — cleared to one side',
            'new zinc strip being positioned along the valley channel',
            'a few lifted tiles stacked aside the valley line',
            'old corroded zinc strip removed and set aside on the tile surface',
          ],
        },
        {
          _for:          'raccord.*mur|jonction.*mur|mur.*toit|solin.*mur',
          scene_note:    'wall-to-roof junction repair on a pitched tiled roof — membrane strip or mastic bead applied at the wall base where it meets the tile surface, small localized zone only',
          scene_camera:  'crouching at the base of a wall where it meets the roof slope, framing the wall-to-tile junction — wall fills one side of the frame, tiles the other',
          scene_framing: {
            work_pct:   65,
            foreground: 'membrane strip or mastic bead being pressed along the wall base at the tile edge — a few tiles lifted beside the wall',
            midground:  'house wall surface and adjacent pitched roof tiles, repair zone compact',
            background: 'house wall above and tiled roof slope to the side — no flat membrane, no parapet',
          },
          scene_debris:  'old flashing debris removed from the wall base lying on the tile beside the repair zone',
          scene_exclude: ['flat membrane surface', 'parapet wall', 'HVAC units', 'rooftop technical equipment', 'large flat roof expanse', 'bitumen membrane roll'],
          tools: [
            'tube of bitumen mastic with nozzle at the wall base',
            'putty knife at the wall-roof junction',
            'membrane strip cut to length resting against the wall foot',
          ],
          protections: [
            'protective plastic sheet on the adjacent tiles near the wall',
          ],
          chantier_details: [
            'old flashing peeled back at the wall-roof junction',
            'new membrane strip being pressed along the wall base',
            'small bucket of bitumen primer beside the repair zone',
            'a few lifted tiles resting against the wall beside the repair area',
          ],
        },
        {
          _for:          'rive|gable|debord.*toit|arretier|acrotere',
          scene_note:    'gable edge (rive) repair on a pitched tiled roof — gable tile being resealed and refitted at the roof verge, small localized repair',
          scene_camera:  'standing or crouching at the gable end of the roof, framing the verge edge and the gable tile joint',
          scene_framing: {
            work_pct:   60,
            foreground: 'gable tile being resealed — sealant nozzle or putty knife at the gable tile joint',
            midground:  'roof slope tiles running back from the gable edge',
            background: 'gable wall below and tiled roof surface extending away, open sky — no flat membrane, no parapet',
          },
          scene_debris:  'old mortar chunks on the tile near the gable edge, displaced gable tile beside the repair zone',
          scene_exclude: ['flat membrane surface', 'parapet wall', 'HVAC units', 'rooftop technical equipment', 'large flat roof expanse', 'bitumen membrane roll'],
          tools: [
            'tube of roofing sealant with nozzle at the gable tile joint',
            'small putty knife on the tile surface near the gable edge',
          ],
          protections: [],
          chantier_details: [
            'displaced gable tile resting beside the repair zone on the tile surface',
            'old mortar chunks on the tile near the gable edge',
            'new sealant bead applied along the gable tile joint',
          ],
        },
        {
          _for:          'tuile|ardoise|remplacement.*tuile|tuile.*cass',
          scene_note:    'localized tile replacement with waterproofing on a pitched tiled roof — two or three cracked tiles being swapped out, new tiles positioned, rest of the roof intact',
          scene_camera:  'crouching on the roof slope at the repair area, close view of the small tile opening and the replacement tiles beside it',
          scene_framing: {
            work_pct:   70,
            foreground: 'small open section of roof batten briefly visible where old tiles were removed, two new replacement tiles positioned ready to slide in',
            midground:  'surrounding intact tiles on the pitched slope, tile lifter wedge under an adjacent tile edge',
            background: 'tiled roof slope continuing normally, open sky — no flat membrane, no parapet',
          },
          scene_debris:  'old cracked tile placed beside the repair area, tile dust on the surrounding tile surface',
          scene_exclude: ['flat membrane surface', 'parapet wall', 'HVAC units', 'rooftop technical equipment', 'large flat roof expanse', 'bitumen membrane roll'],
          tools: [
            'tile lifter resting on the tile surface at the repair zone',
            '2 or 3 replacement tiles stacked beside the repair area',
            'hammer and roofing nails on the tile near the lifted zone',
            'tube of roofing sealant beside the new tiles',
          ],
          protections: [
            'knee pad on the tile surface near the repair area',
          ],
          chantier_details: [
            'old cracked tile set aside on the tile surface nearby',
            'small exposed area showing the roof batten',
            'new tiles positioned ready to slide into place',
            'tile lifter wedge visible under the adjacent tile edge',
          ],
        },

        // --- solin / cheminée (4 additional) ---
        {
          _for:          'solin|cheminee|faitage',
          scene_note:    'chimney solin mortar removal — old mortar being struck out at the chimney base with a chisel and hammer, debris falling onto the tile surface',
          scene_camera:  'crouching close to the chimney base, framing the chisel tip at the mortar joint and the fresh debris on the tiles',
          scene_framing: {
            work_pct:   75,
            foreground: 'chisel at the chimney base mortar joint, old mortar chips on the surrounding tiles',
            midground:  'chimney brickwork and adjacent tiles on the pitched slope',
            background: 'tiled roof continuing normally, open sky above',
          },
          scene_debris:  'old mortar chips scattered on the tiles beside the chimney base, a few pieces on the knee pad',
          scene_exclude: ['flat membrane', 'parapet wall', 'HVAC units', 'large flat roof expanse'],
          tools: [
            'cold chisel held at the mortar joint',
            'club hammer beside the chimney on the tile surface',
            'stiff-bristle brush for clearing mortar dust beside the chisel',
          ],
          protections: [
            'knee pad on the tile surface at the chimney work zone',
          ],
          chantier_details: [
            'old mortar joint crumbling at the chisel point',
            'mortar chips on the tiles around the chimney base',
            'clean chimney brick face revealed where mortar has been removed',
          ],
        },
        {
          _for:          'solin|cheminee|faitage',
          scene_note:    'chimney base primer application — bituminous primer being brushed onto the cleaned masonry before new zinc or membrane solin is fitted',
          scene_camera:  'crouching at the chimney foot, framing the brush applying primer at the base joint between chimney and tile',
          scene_framing: {
            work_pct:   75,
            foreground: 'primer brush being drawn along the cleaned chimney base — dark primer coat visible on the brickwork',
            midground:  'chimney brickwork above and cleaned mortar joint, tin of primer on the tile nearby',
            background: 'tiled roof slope and open sky',
          },
          scene_debris:  'primer tin open on the tile beside the chimney, brush resting on the tin lid between strokes',
          scene_exclude: ['flat membrane', 'parapet wall', 'HVAC units', 'large flat roof expanse'],
          tools: [
            'flat brush applying bituminous primer to the chimney base',
            'primer tin open on the tile surface',
          ],
          protections: [
            'knee pad on the tile at the work zone',
          ],
          chantier_details: [
            'dark primer coat visible on the cleaned chimney brickwork',
            'primer applied along the full base perimeter of the chimney',
            'primer tin and brush on the tile beside the work zone',
          ],
        },
        {
          _for:          'solin|cheminee|faitage',
          scene_note:    'completed chimney solin repair — new zinc flashing installed, tiles re-bedded around the chimney, mortar joint fresh and grey',
          scene_camera:  'standing or crouching slightly back, framing the completed chimney repair zone in its finished state',
          scene_framing: {
            work_pct:   55,
            foreground: 'new zinc strip installed at the chimney base, fresh mortar joint along the flashing edge',
            midground:  'tiles re-seated around the chimney on the pitched slope',
            background: 'tiled roof continuing normally, open sky',
          },
          scene_debris:  'small mortar residue smear on the tile beside the fresh joint',
          scene_exclude: ['flat membrane', 'parapet wall', 'HVAC units', 'large flat roof expanse', 'tools on site'],
          tools: [
            'pointing trowel resting on the tile nearby — work done',
          ],
          protections: [
            'knee pad on the tile beside the finished work area',
          ],
          chantier_details: [
            'new zinc strip installed and bedded at the chimney base',
            'fresh grey mortar joint along the upper flashing edge',
            'tiles re-seated on both sides of the chimney',
          ],
        },
        {
          _for:          'solin|cheminee|faitage',
          scene_note:    'failing solin pre-repair assessment — old corroded zinc still in place, rust staining visible on tiles, damage being marked before work starts',
          scene_camera:  'crouching at chimney level, framing the failing solin and the rust stain on the adjacent tiles',
          scene_framing: {
            work_pct:   60,
            foreground: 'old corroded zinc strip at the chimney base, rust staining on the tile beside it',
            midground:  'chimney brickwork with efflorescence marks, tile surface around the chimney',
            background: 'tiled roof slope, open sky',
          },
          scene_debris:  'rust streak on the tile running down from the failing zinc join',
          scene_exclude: ['flat membrane', 'parapet wall', 'HVAC units', 'tools being used yet'],
          tools: [
            'pointing stick or putty knife tapping the failing flashing to check adhesion',
          ],
          protections: [
            'knee pad on the tile at the assessment zone',
          ],
          chantier_details: [
            'old zinc strip visibly corroded and lifting at one edge',
            'rust stain on the tile beside the chimney base',
            'mortar joint cracked or missing in places around the chimney',
          ],
        },

        // --- Velux (4 additional) ---
        {
          _for:          'velux|lucarne|fenetre.*toit|chassis.*toit',
          scene_note:    'Velux frame old gasket removal — dried sealant being scraped from the window frame edge with a putty knife, old strip set aside',
          scene_camera:  'crouching at the Velux frame edge, framing the putty knife scraping the old gasket from the frame corner',
          scene_framing: {
            work_pct:   70,
            foreground: 'putty knife scraping dried sealant from the Velux frame edge, old sealant strip curling off',
            midground:  'Velux window frame and adjacent tiles, frame corner visible',
            background: 'tiled roof slope extending away, open sky',
          },
          scene_debris:  'strip of old dried sealant curled on the tile beside the window frame',
          scene_exclude: ['flat membrane', 'parapet wall', 'HVAC units', 'large flat roof expanse'],
          tools: [
            'putty knife scraping old sealant from the Velux frame edge',
            'stiff brush for clearing sealant residue beside the frame',
          ],
          protections: [
            'knee pad on the tile at the window work zone',
          ],
          chantier_details: [
            'dried sealant strip peeling off the frame edge under the putty knife',
            'frame edge cleaned on one side, old sealant still intact on the other',
            'old sealant strip on the tile beside the frame',
          ],
        },
        {
          _for:          'velux|lucarne|fenetre.*toit|chassis.*toit',
          scene_note:    'Velux flashing kit components laid out — new flashing pieces arranged on the surrounding tiles before fitting',
          scene_camera:  'standing above, looking down on the Velux and the flashing kit components laid out on the surrounding tiles',
          scene_framing: {
            work_pct:   65,
            foreground: 'flashing kit components — corner pieces, side aprons, top piece — laid on the tiles around the window',
            midground:  'Velux window frame with old flashing still in place',
            background: 'tiled roof slope, flashing kit cardboard packaging beside the array',
          },
          scene_debris:  'flashing kit cardboard packaging open on the tile beside the window',
          scene_exclude: ['flat membrane', 'parapet wall', 'HVAC units', 'large flat roof expanse'],
          tools: [
            'Velux flashing kit components laid out on the tiles — corner pieces, side strips, top cap',
            'tin snips beside the components for sizing',
          ],
          protections: [
            'knee pad on the tile above the window',
          ],
          chantier_details: [
            'flashing components laid in order on the tiles around the window',
            'cardboard kit packaging open beside the array',
            'Velux window frame waiting for the new flashing to be fitted',
          ],
        },
        {
          _for:          'velux|lucarne|fenetre.*toit|chassis.*toit',
          scene_note:    'Velux frame corner piece fitting — corner flashing element being pressed into the window corner junction between frame and tile',
          scene_camera:  'crouching at the window corner, close view of the corner flashing piece being pressed into place',
          scene_framing: {
            work_pct:   75,
            foreground: 'corner flashing piece being pressed into the window corner — fingers applying pressure to seat it',
            midground:  'Velux frame and adjacent tile, other corner still to be done visible',
            background: 'tiled slope beyond the window',
          },
          scene_debris:  'small strip of butyl tape removed from the corner flashing backing beside the work zone',
          scene_exclude: ['flat membrane', 'parapet wall', 'HVAC units', 'large flat roof expanse'],
          tools: [
            'corner flashing piece being pressed into the window frame corner',
            'rubber roller for pressing the flashing flat on the adjacent tile',
          ],
          protections: [
            'knee pad on the tile beside the window',
          ],
          chantier_details: [
            'corner flashing piece seated and pressed at the window corner',
            'butyl tape backing strip removed beside the corner piece',
            'opposite corner still showing old flashing to be replaced',
          ],
        },
        {
          _for:          'velux|lucarne|fenetre.*toit|chassis.*toit',
          scene_note:    'Velux repair complete — new flashing installed, tiles re-seated around the frame, silicone bead fresh along the inner frame',
          scene_camera:  'stepping back on the roof slope, framing the complete Velux window with the new flashing visible around the frame',
          scene_framing: {
            work_pct:   50,
            foreground: 'Velux frame with new corner and side flashing pieces installed around it, tiles re-seated on all sides',
            midground:  'tiled roof surface beside the window — tiles flat and ordered',
            background: 'roof slope continuing beyond the window, open sky',
          },
          scene_debris:  'fresh silicone bead line along the inner frame edge, no other debris',
          scene_exclude: ['flat membrane', 'parapet wall', 'HVAC units', 'large flat roof expanse', 'tools still at the window'],
          tools: [
            'silicone gun on the tile beside the window — work done',
          ],
          protections: [
            'knee pad on the tile — work complete',
          ],
          chantier_details: [
            'new flashing pieces installed around the full Velux frame',
            'tiles re-seated on all four sides of the window',
            'fresh silicone bead along the inner frame edge',
          ],
        },

        // --- noue (4 additional) ---
        {
          _for:          'noue|vallee|jonction.*pente',
          scene_note:    'old valley zinc removal — corroded valley strip being pulled out from under the tiles, tiles already lifted on either side',
          scene_camera:  'crouching at the valley, framing the old zinc strip being lifted out of the channel',
          scene_framing: {
            work_pct:   65,
            foreground: 'old corroded zinc strip being lifted from the noue channel — corrosion marks visible',
            midground:  'tiles lifted on either side of the valley, valley channel exposed',
            background: 'two tiled roof slopes meeting at the ridge above, sky beyond',
          },
          scene_debris:  'old zinc strip on the tile beside the valley, dark moss and leaf debris from the channel cleared to one side',
          scene_exclude: ['flat membrane', 'parapet wall', 'HVAC units', 'large flat roof expanse'],
          tools: [
            'old corroded zinc strip being lifted from the valley channel',
            'tin snips on the tile near the valley for cutting the old strip',
          ],
          protections: [
            'knee pad on the tile at the valley edge',
          ],
          chantier_details: [
            'old zinc strip being removed — corrosion clearly visible on the surface',
            'valley channel exposed between the lifted tiles on either side',
            'dark debris from the valley cleared to one side of the channel',
          ],
        },
        {
          _for:          'noue|vallee|jonction.*pente',
          scene_note:    'valley tile lifting — tiles stacked beside the noue on both slopes, valley channel fully exposed for new zinc laying',
          scene_camera:  'crouching at the junction of the two slopes, framing the exposed valley channel with stacked tiles on either side',
          scene_framing: {
            work_pct:   60,
            foreground: 'exposed valley channel between the two slopes — old channel substrate visible',
            midground:  'stacked tiles on the tiles beside the valley on both sides',
            background: 'two meeting roof slopes extending away, sky',
          },
          scene_debris:  'old moss and leaf debris raked from the channel and placed in a small pile beside the valley',
          scene_exclude: ['flat membrane', 'parapet wall', 'HVAC units', 'large flat roof expanse'],
          tools: [
            'tile lifter on the tile surface beside the stacked tiles',
            'small hand brush for clearing the channel',
          ],
          protections: [
            'knee pad on the tile at the valley edge',
          ],
          chantier_details: [
            'tiles lifted and stacked neatly beside the exposed valley on both sides',
            'valley channel exposed from eaves to ridge',
            'old debris cleared from the channel — channel floor visible',
          ],
        },
        {
          _for:          'noue|vallee|jonction.*pente',
          scene_note:    'valley moss clearance — accumulated moss and debris being removed from the noue channel before fitting the new zinc strip',
          scene_camera:  'looking down along the valley channel from above, framing the moss-clearing tool and the revealed channel substrate',
          scene_framing: {
            work_pct:   65,
            foreground: 'stiff brush or hook tool clearing compacted moss from the valley channel, moss pile at the side',
            midground:  'valley channel clearing in progress — part clear, part still blocked',
            background: 'two roof slopes meeting at the valley, sky above',
          },
          scene_debris:  'pile of compacted moss and leaf fragments cleared to one side of the valley',
          scene_exclude: ['flat membrane', 'parapet wall', 'HVAC units', 'large flat roof expanse'],
          tools: [
            'stiff wire brush clearing moss from the valley channel',
            'hand rake beside the moss pile',
          ],
          protections: [
            'knee pad on the tile at the valley edge',
          ],
          chantier_details: [
            'compacted moss pile cleared from the valley channel, stacked to one side',
            'channel substrate visible on the cleared section',
            'remaining moss at the far end of the valley still to be cleared',
          ],
        },
        {
          _for:          'noue|vallee|jonction.*pente',
          scene_note:    'valley repair complete — new zinc valley strip installed, tiles re-laid on both slopes, channel clean and weathertight',
          scene_camera:  'standing or crouching back, framing the full valley with the new zinc visible in the channel between re-laid tiles',
          scene_framing: {
            work_pct:   50,
            foreground: 'new zinc strip glistening in the valley channel, tiles re-seated on both sides of the channel',
            midground:  'tiled slopes meeting cleanly at the valley, zinc strip running the length',
            background: 'roof slopes extending away to eaves and ridge, sky beyond',
          },
          scene_debris:  'small amount of fresh mortar smear on the tile at the valley edge — pointing complete',
          scene_exclude: ['flat membrane', 'parapet wall', 'HVAC units', 'large flat roof expanse', 'tools at the site'],
          tools: [
            'pointing trowel resting on the tile — work complete',
          ],
          protections: [],
          chantier_details: [
            'new zinc strip installed and glistening in the valley channel',
            'tiles re-laid on both sides — neat and flat',
            'fresh mortar smear at the valley tile edge — pointing done',
          ],
        },

        // --- raccord mur / toiture (4 additional) ---
        {
          _for:          'raccord.*mur|jonction.*mur|mur.*toit|solin.*mur',
          scene_note:    'wall-roof junction — old flashing being peeled back from the wall base, tiles already lifted to allow access',
          scene_camera:  'crouching at the wall base, framing the old flashing being pulled away from the brickwork',
          scene_framing: {
            work_pct:   70,
            foreground: 'old flashing peeling off the wall base — dried mastic residue visible on the brickwork',
            midground:  'tiles lifted to reveal the junction, wall base masonry exposed',
            background: 'house wall above and tiled slope to the side, sky beyond',
          },
          scene_debris:  'old flashing strip removed and placed on the tile beside the wall, dried mastic residue on the brickwork',
          scene_exclude: ['flat membrane surface', 'parapet wall', 'HVAC units', 'large flat roof expanse'],
          tools: [
            'old flashing strip being peeled from the wall base',
            'stiff putty knife for removing mastic residue from the brickwork',
          ],
          protections: [
            'protective board over the adjacent tiles near the wall',
          ],
          chantier_details: [
            'old flashing peeled back — dried mastic residue visible on brickwork',
            'tiles lifted to expose the full junction width',
            'removed flashing strip on the tile beside the wall',
          ],
        },
        {
          _for:          'raccord.*mur|jonction.*mur|mur.*toit|solin.*mur',
          scene_note:    'primer application at wall-roof junction — brush applying bituminous primer to the cleaned masonry before new membrane fitting',
          scene_camera:  'crouching at the wall base, framing the primer brush at the junction between wall and tile surface',
          scene_framing: {
            work_pct:   75,
            foreground: 'primer brush being drawn along the wall base at the tile junction — dark primer coat on the brickwork',
            midground:  'wall surface above and tile slope beside the primed strip',
            background: 'house wall and tiled roof, sky beyond',
          },
          scene_debris:  'primer tin open on the tile beside the wall, brush resting on the tin lid',
          scene_exclude: ['flat membrane surface', 'parapet wall', 'HVAC units', 'large flat roof expanse'],
          tools: [
            'flat brush applying bituminous primer at the wall base',
            'primer tin open beside the junction',
          ],
          protections: [
            'protective plastic sheet on the adjacent tiles at the primer edge',
          ],
          chantier_details: [
            'primer coat visible on the cleaned wall base brickwork',
            'primer applied in a band from the tile surface up the wall',
            'tin and brush on the tile beside the work zone',
          ],
        },
        {
          _for:          'raccord.*mur|jonction.*mur|mur.*toit|solin.*mur',
          scene_note:    'self-adhesive membrane strip being pressed into the wall-roof junction — peel backing removed, membrane being bedded from tile onto wall',
          scene_camera:  'crouching at the junction, framing the membrane strip being peeled and pressed from the tile surface up onto the wall',
          scene_framing: {
            work_pct:   70,
            foreground: 'membrane strip being pressed onto the junction — one half on the tile, one half on the wall, backing still on the upper portion',
            midground:  'wall and tile meeting at the junction, a few lifted tiles beside the work area',
            background: 'house wall and tiled slope, sky',
          },
          scene_debris:  'membrane backing strip removed and on the tile beside the junction',
          scene_exclude: ['flat membrane surface', 'parapet wall', 'HVAC units', 'large flat roof expanse'],
          tools: [
            'self-adhesive membrane strip being pressed onto the junction — partially applied',
            'rubber roller on the tile ready to press the membrane flat',
          ],
          protections: [
            'protective board on the adjacent tiles',
          ],
          chantier_details: [
            'membrane strip bridging the tile-to-wall junction — lower half adhered to tile',
            'backing paper removed from the lower section, upper section still backed',
            'roller ready on the tile to press the membrane onto the wall surface',
          ],
        },
        {
          _for:          'raccord.*mur|jonction.*mur|mur.*toit|solin.*mur',
          scene_note:    'wall-roof junction with metal clip fixings — membrane strip held at the wall with a line of metal clips and screws above the primary mastic bead',
          scene_camera:  'crouching close at the wall, framing the line of fixing clips being screwed into the wall above the membrane strip',
          scene_framing: {
            work_pct:   70,
            foreground: 'row of metal fixing clips screwed to the wall above the membrane — clip and screw heads visible',
            midground:  'membrane strip bedded at the junction, mastic bead along the upper clip edge',
            background: 'wall surface above and tiled slope below, sky',
          },
          scene_debris:  'screw heads and drill dust on the tile beside the wall',
          scene_exclude: ['flat membrane surface', 'parapet wall', 'HVAC units', 'large flat roof expanse'],
          tools: [
            'cordless drill-driver at the wall for driving fixing clips',
            'metal fixing clips being screwed above the membrane top edge',
            'mastic gun on the tile ready for the sealant bead over the clips',
          ],
          protections: [
            'protective board over the adjacent tiles',
          ],
          chantier_details: [
            'row of metal fixing clips screwed into the wall above the membrane',
            'membrane strip sandwiched between wall and clips',
            'fresh mastic bead along the clip line — sealing the upper edge',
          ],
        },

        // --- rive / gable (4 additional) ---
        {
          _for:          'rive|gable|debord.*toit|arretier|acrotere',
          scene_note:    'gable tile displaced — gable edge tile has slid out of position, gap visible at the verge, assessment before re-bedding',
          scene_camera:  'crouching at the gable end, framing the displaced tile and the gap it has left at the roof verge',
          scene_framing: {
            work_pct:   65,
            foreground: 'gable tile slid out of position — visible gap between the tile and the barge board or wall below',
            midground:  'adjacent gable tiles still in position, roof slope surface beside',
            background: 'gable wall below, sky to the side',
          },
          scene_debris:  'old mortar crumbs on the tile and gutter below the displaced gable tile',
          scene_exclude: ['flat membrane', 'parapet wall', 'HVAC units', 'large flat roof expanse'],
          tools: [
            'pointing stick or putty knife examining the gap at the displaced tile',
          ],
          protections: [],
          chantier_details: [
            'gable tile clearly displaced — gap visible between tile edge and barge',
            'old mortar crumbs on the tile surface below the displacement',
            'adjacent gable tiles intact, showing the correct position',
          ],
        },
        {
          _for:          'rive|gable|debord.*toit|arretier|acrotere',
          scene_note:    'fresh mortar preparation for gable tile re-bedding — mortar being mixed in a small bucket beside the rive repair zone',
          scene_camera:  'crouching at the gable edge, framing the small mortar bucket and the gap at the gable tile ready to be filled',
          scene_framing: {
            work_pct:   65,
            foreground: 'small bucket with fresh mortar mix beside the gable tile gap, pointing trowel in the mortar',
            midground:  'gable tile waiting to be re-seated, tile surface beside the gap',
            background: 'gable wall and tiled slope, sky',
          },
          scene_debris:  'mortar mixing residue on the tile beside the bucket',
          scene_exclude: ['flat membrane', 'parapet wall', 'HVAC units', 'large flat roof expanse'],
          tools: [
            'small mortar mixing bucket on the tile beside the gap',
            'pointing trowel for applying and shaping the mortar',
          ],
          protections: [],
          chantier_details: [
            'fresh mortar mix ready in the small bucket on the tile',
            'pointing trowel in the mortar — ready to apply',
            'displaced gable tile placed beside the gap ready to be bedded',
          ],
        },
        {
          _for:          'rive|gable|debord.*toit|arretier|acrotere',
          scene_note:    'section of multiple gable tiles being re-pointed — four to five consecutive rive tiles being re-mortared along the verge',
          scene_camera:  'standing at the gable end, framing the section of rive tiles being worked on — fresh mortar joints visible on several tiles',
          scene_framing: {
            work_pct:   65,
            foreground: 'fresh mortar joint along the section of rive tiles being re-pointed — pointing trowel at the leading tile',
            midground:  'completed tiles further along the gable with fresh joints set',
            background: 'roof slope, gable wall, sky beyond',
          },
          scene_debris:  'old mortar chunks on the tile below the rive section being worked',
          scene_exclude: ['flat membrane', 'parapet wall', 'HVAC units', 'large flat roof expanse'],
          tools: [
            'pointing trowel at the active rive tile being pointed',
            'mortar bucket on the tile at the working end',
            'gauging trowel beside the bucket for loading the pointing trowel',
          ],
          protections: [],
          chantier_details: [
            'fresh mortar joints along the rive tile section — pointing complete on first few',
            'active tile at the leading edge with fresh mortar being shaped',
            'old mortar chunk on the tile below the active section',
          ],
        },
        {
          _for:          'rive|gable|debord.*toit|arretier|acrotere',
          scene_note:    'gable edge repair complete — fresh mortar joints along the rive, gable tiles bedded and pointing set, clean verge line',
          scene_camera:  'stepping back, framing the completed gable edge — fresh mortar line running along the verge from the near end',
          scene_framing: {
            work_pct:   50,
            foreground: 'fresh grey mortar joint running along the gable tile line at the roof verge',
            midground:  'gable tiles all bedded and in line, no gaps',
            background: 'gable wall below and tiled slope above, sky to the side',
          },
          scene_debris:  'small mortar smear on the tile face near the joint — to be cleaned once set',
          scene_exclude: ['flat membrane', 'parapet wall', 'HVAC units', 'large flat roof expanse', 'tools still at the site'],
          tools: [
            'pointing trowel resting on the tile — work done',
          ],
          protections: [],
          chantier_details: [
            'fresh mortar joint along the full rive section — grey and even',
            'gable tiles all seated and level along the verge',
            'clean verge line from eave to ridge',
          ],
        },

        // --- tuile / ardoise (4 additional) ---
        {
          _for:          'tuile|ardoise|remplacement.*tuile|tuile.*cass',
          scene_note:    'single cracked tile being lifted — tile lifter wedged under the adjacent tile, cracked tile being lifted for removal',
          scene_camera:  'crouching on the roof slope, close view of the tile lifter wedge under the adjacent tile and the cracked tile being raised',
          scene_framing: {
            work_pct:   70,
            foreground: 'tile lifter wedge under the adjacent tile, cracked tile raised and held clear',
            midground:  'surrounding intact tiles on the slope, crack line visible across the tile face',
            background: 'tiled slope continuing, open sky',
          },
          scene_debris:  'crack debris — small tile fragment beside the raised tile',
          scene_exclude: ['flat membrane', 'parapet wall', 'HVAC units', 'large flat roof expanse'],
          tools: [
            'tile lifter wedge under the adjacent tile to lift the cracked one',
            'replacement tile on the tile beside the repair zone',
          ],
          protections: [
            'knee pad on the tile at the repair zone',
          ],
          chantier_details: [
            'cracked tile raised above the adjacent tile using the lifter wedge',
            'crack line clearly visible across the tile face',
            'replacement tile already on the slope ready to slide in',
          ],
        },
        {
          _for:          'tuile|ardoise|remplacement.*tuile|tuile.*cass',
          scene_note:    'roof batten briefly exposed — tiles removed, timber batten visible in the small opening, new tile about to be slid into place',
          scene_camera:  'close view of the small opening in the tiled surface, framing the exposed batten and the gap where the tile will slide in',
          scene_framing: {
            work_pct:   70,
            foreground: 'small open section showing the timber roof batten — 2 or 3 tiles removed, batten briefly visible',
            midground:  'surrounding intact tiles framing the opening, tile lifter wedges under adjacent tiles',
            background: 'tiled slope continuing, open sky above',
          },
          scene_debris:  'old lichen or tile residue on the batten surface at the opening',
          scene_exclude: ['flat membrane', 'parapet wall', 'HVAC units', 'large flat roof expanse'],
          tools: [
            'tile lifter wedges under the adjacent tiles holding them up',
            'replacement tile on the slope beside the opening ready to slide in',
          ],
          protections: [
            'knee pad on the tile at the work zone',
          ],
          chantier_details: [
            'timber batten visible in the small tile opening',
            'batten surface showing lichen marks or old tile contact residue',
            'replacement tile positioned at the opening ready to slide under the adjacent tiles',
          ],
        },
        {
          _for:          'tuile|ardoise|remplacement.*tuile|tuile.*cass',
          scene_note:    'ridge tile re-mortaring — a ridge tile being re-set in fresh mortar, old mortar removed, fresh joint being formed along the ridge',
          scene_camera:  'crouching at the ridge, framing the ridge tile being pressed into fresh mortar along the roof apex',
          scene_framing: {
            work_pct:   65,
            foreground: 'ridge tile being pressed into fresh mortar at the roof apex — mortar visible along the base edge',
            midground:  'adjacent ridge tiles on either side — some still with old mortar, others fresh',
            background: 'pitched tiled slopes falling away on both sides of the ridge, sky above',
          },
          scene_debris:  'old mortar chunks removed from the ridge beside the fresh joint',
          scene_exclude: ['flat membrane', 'parapet wall', 'HVAC units', 'large flat roof expanse'],
          tools: [
            'pointing trowel shaping the mortar joint along the ridge tile base',
            'small mortar bucket at the ridge level beside the work zone',
          ],
          protections: [
            'knee pad at the ridge apex',
          ],
          chantier_details: [
            'ridge tile bedded in fresh mortar at the roof apex',
            'fresh mortar joint visible along the ridge tile base on both sides',
            'old mortar chunks removed and placed on the tile beside the work zone',
          ],
        },
        {
          _for:          'tuile|ardoise|remplacement.*tuile|tuile.*cass',
          scene_note:    'hip tile section replacement — hip tiles on a roof ridge junction being removed and re-bedded with fresh mortar',
          scene_camera:  'crouching at the hip junction, framing the hip tile being lifted and the fresh mortar being applied beneath',
          scene_framing: {
            work_pct:   65,
            foreground: 'hip tile being lifted at the junction, fresh mortar being applied underneath with the trowel',
            midground:  'hip line tiles on either side, tiled slopes meeting at the hip',
            background: 'tiled slopes extending away from the hip junction, sky',
          },
          scene_debris:  'old mortar removed from the hip tile bed on the tile surface below',
          scene_exclude: ['flat membrane', 'parapet wall', 'HVAC units', 'large flat roof expanse'],
          tools: [
            'pointing trowel applying fresh mortar under the hip tile',
            'small mortar bucket at the hip work zone',
          ],
          protections: [
            'knee pad at the hip junction',
          ],
          chantier_details: [
            'hip tile lifted, fresh mortar being applied to the hip line beneath',
            'old mortar removed — debris on the adjacent tile',
            'hip line where the two tiled slopes meet clearly visible at the junction',
          ],
        },
      ],
      // Fallback: flat small roof (no service matches any _for)
      scene_note: 'waterproofing work on a small accessible flat roof — house extension, garage top, or low terrace of a residential house, garden visible below the low parapet',
      tools: [
        'seam roller resting on the membrane surface at the last lap joint',
        'bitumen primer can with brush resting near the parapet edge',
        'utility knife beside the trimmed membrane roll',
        'tape measure resting on the substrate beside the chalk line',
      ],
      protections: [
        'protective board placed over the existing membrane at the access point',
        'plastic cap over the small flat roof drain',
      ],
      chantier_details: [
        'trimmed membrane offcuts near the low parapet edge',
        'empty bitumen primer can on the substrate',
        'chalk snap line across the compact substrate surface',
        'residential garden or driveway visible just below the parapet',
        'house wall or window visible beside the low parapet edge',
      ],
    },

    immeuble: {
      scene_note: 'waterproofing work on a large multi-storey residential flat roof — broad membrane surface, rooftop technical equipment in background',
      tools: [
        'seam roller resting on the membrane surface at the last worked lap joint',
        'bitumen primer can with brush resting on top near the edge',
        'utility knife beside the trimmed membrane roll',
        'tape measure resting on the substrate beside the chalk line',
        'small gas torch cylinder resting on the substrate nearby',
      ],
      protections: [
        'protective board placed over the existing membrane at the access point',
        'plastic cap over the rooftop drain during membrane application',
      ],
      chantier_details: [
        'trimmed membrane offcuts near the parapet edge',
        'empty bitumen primer can on the broad substrate surface',
        'chalk snap line across the membrane layout',
        'HVAC unit or ventilation stack visible in the background',
        'neighbouring rooftops visible above the taller parapet',
      ],
    },

    commerce: {
      scene_note: 'waterproofing work on a commercial or industrial flat roof — warehouse, retail unit, or workshop, large light-gauge steel deck or concrete substrate',
      tools: [
        'seam roller resting on the membrane surface',
        'bitumen primer can with brush resting on top',
        'utility knife beside the trimmed membrane roll',
        'tape measure on the substrate',
        'small gas torch cylinder on the substrate',
      ],
      protections: [
        'protective board at the access hatch entry point',
        'plastic cap over the industrial roof drain',
      ],
      chantier_details: [
        'trimmed membrane offcuts near the industrial parapet',
        'empty primer can on the broad substrate surface',
        'large open flat roof with robust industrial parapet visible',
        'roof access hatch cover folded back at the entry point',
        'distant industrial skyline or warehouse roof visible beyond the parapet',
      ],
    },

    default: {
      tools: [
        'seam roller resting on the membrane surface at the last worked lap joint',
        'bitumen primer can with brush resting on top near the edge',
        'utility knife beside the trimmed membrane roll',
        'tape measure resting on the substrate beside the chalk line',
        'small gas torch cylinder resting on the substrate nearby',
      ],
      protections: [
        'protective board placed over the existing membrane at the access point',
        'plastic cap over the roof drain during membrane application',
      ],
      chantier_details: [
        'trimmed membrane offcuts stacked near the parapet edge',
        'empty bitumen primer can on the substrate surface',
        'seam tape strip at the lap joint overlap',
        'chalk snap line across the substrate showing the membrane layout',
        'scrap membrane piece used as knee pad near the last worked seam',
      ],
    },
  },

};
