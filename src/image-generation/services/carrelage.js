/**
 * services/carrelage.js — scènes carrelage (9 sous-services, 3 états chacun).
 * WORK_SCENES clé unique 'carrelage' ; SITE_REALISM clé unique 'carrelage'
 * avec 9 scenarios _for (un par sous-service).
 * Remplace la clé carrelage de finishing.js.
 * Aucune modification des autres métiers.
 */

export const WORK_SCENES_CARRELAGE = {

  carrelage: {
    category:         'carrelage',
    priority:         3,
    service_keywords: [
      { phrase: 'pose carrelage sol',       score: 15 },
      { phrase: 'pose carrelage mural',     score: 15 },
      { phrase: 'faience salle de bain',    score: 15 },
      { phrase: 'faience cuisine',          score: 15 },
      { phrase: 'carrelage terrasse',       score: 15 },
      { phrase: 'dallage exterieur',        score: 15 },
      { phrase: 'pose pierre naturelle',    score: 15 },
      { phrase: 'refection joint',          score: 15 },
      { phrase: 'refection carrelage',      score: 15 },
      { phrase: 'renovation carrelage',     score: 14 },
      { phrase: 'remplacement carrelage',   score: 14 },
      { phrase: 'pierre naturelle',         score: 13 },
      { phrase: 'dallage',                  score: 13 },
      { phrase: 'carrelage sol',            score: 13 },
      { phrase: 'pose carrelage',           score: 12 },
      { phrase: 'carrelage mural',          score: 12 },
      { phrase: 'faience',                  score: 12 },
      { phrase: 'carreleur',               score: 11 },
      { phrase: 'floor tile',              score: 11 },
      { phrase: 'carrelage',              score: 10 },
      { phrase: 'tile',                   score:  5 },
    ],
    exclude_if: [],
    intro:      'tile installation or renovation work at a residential or commercial property',
    setting:    'interior',
    secteur:    'tiler',
    hasWorkers: false,
    camera:     'crouching at floor level or standing at the room entrance, 2–3 m from the tiled area',
    materials:  ['porcelain tiles', 'tile adhesive', 'tile spacers', 'grout'],
    photo_defects: [
      'flat diffuse window light casting no shadows on the tile surface',
      'slight motion blur from low ambient light in an indoor room',
    ],
    exclusions: ['tile cutters in use', 'safety helmets', 'high-vis vests', 'harnesses'],

    states: {
      debut: {
        framing: {
          work_pct:   25,
          foreground: 'bare substrate with chalk layout lines visible — first tiles positioned at the reference point, adhesive tools staged but not yet spread',
          midground:  'most of the surface still bare and unworked, unopened tile boxes stacked to one side',
          background: 'room walls or exterior context, natural light from a window or opening',
        },
        debris:      'chalk dust on the substrate, unopened packaging beside the tile stack, adhesive bucket sealed',
        description: 'Work just starting. Surface prepared, layout lines marked, first tiles being positioned at the reference point.',
      },
      encours: {
        framing: {
          work_pct:   50,
          foreground: 'sharp boundary between completed tiled section and bare substrate — spacers visible between placed tiles, fresh adhesive ridges on the unfinished zone',
          midground:  'roughly half the surface covered with tiles, two clearly distinct zones',
          background: 'walls, window, or outdoor environment',
        },
        debris:      'plastic tile spacers scattered at the work front, adhesive smears on the untiled area, tile offcuts near the wall',
        description: 'Active installation. Approximately half the surface is tiled. The transition between the completed zone and the work front is clearly visible.',
      },
      semifinal: {
        framing: {
          work_pct:   65,
          foreground: 'all tiles laid — grout mortar being applied and spread between tiles with a float or squeegee',
          midground:  'fully tiled surface with damp grout in the joints, slight grout haze on tile faces',
          background: 'room walls, skirting boards, door frames',
        },
        debris:      'grout residue on tile faces near fresh joints, cleaning sponge and rinse bucket near the grouting zone',
        description: 'Tiling complete. Joints being grouted and the surface cleaned of grout haze.',
      },
      final: {
        framing: {
          work_pct:   70,
          foreground: 'clean finished tiled surface — uniform tiles, dry grout lines, no adhesive or grout residue',
          midground:  'full tiled area visible, skirting or edge trims neatly fitted',
          background: 'clean room or outdoor context, no construction material in sight',
        },
        debris:      'none — surface clean and installation complete',
        description: 'Tile installation complete. Grout dry, surface clean and ready. Professional result.',
      },
    },
  },

};

export const SITE_REALISM_CARRELAGE = {

  carrelage: {
    scenarios: [

      // ── 1. Pose carrelage sol ────────────────────────────────────────────────
      {
        _for:          'carrelage sol|pose carrelage sol',
        scene_note:    'floor tile installation on a bare concrete screed inside a residential room — tiles laid row by row, adhesive combed, spacers set, rubber mallet used for levelling',
        scene_camera:  'crouching at floor level inside the room, 2–3 m from the tiling front, slightly low angle showing the transition between tiled and untiled zones',
        setting:       'interior',
        tools: [
          'notched trowel resting on the screed near the last placed tile row',
          'rubber mallet on the floor beside a freshly tapped tile',
          'tile spacers in a small pile at the edge of the tiled section',
          'spirit level resting diagonally across two tiles',
          'tile cutter with a scored offcut beside the wall',
          'adhesive mixing bucket with residue near the room entrance',
          'sponge and small water bucket near the recently grouted section',
        ],
        protections: [
          'knee pad on the bare screed beside the active tiling row',
          'cardboard sheet protecting the completed tile section near the doorway',
          'masking tape along the skirting board at the wall edge',
        ],
        chantier_details: [
          'tile offcuts stacked near the wall with cut edges visible',
          'adhesive smear on the bare screed at the edge of the tiled area',
          'chalk layout line on the screed in the untiled zone',
          'empty tile box flattened and set aside near the entrance',
          'plastic spacer bag open beside the tile stack',
        ],
      },

      // ── 2. Pose carrelage mural ──────────────────────────────────────────────
      {
        _for:          'carrelage mural|pose carrelage mural',
        scene_note:    'wall tile installation on a vertical interior surface — neutral wall without kitchen or bathroom fixtures, tiles progressing row by row upward with adhesive and spacers',
        scene_camera:  'standing back 2 m from the wall, straight-on or slightly oblique view, slightly low angle showing the progression of tile rows',
        setting:       'interior',
        tools: [
          'notched trowel on the drop sheet at the base of the wall near the work zone',
          'rubber mallet resting against the tiled section of the wall',
          'tile spacers aligned along the bottom of the placed row',
          'spirit level propped against the tiled area checking horizontal alignment',
          'tile cutter with an offcut near the drop sheet',
          'adhesive bucket open at the foot of the wall',
          'suction cup handle resting on the floor beside a large-format tile',
        ],
        protections: [
          'drop sheet covering the floor directly below the tiled wall section',
          'masking tape along the skirting board at the floor-wall junction',
          'protective cardboard strip along the bottom edge of the work zone',
        ],
        chantier_details: [
          'adhesive smear on the lower part of the wall below the tiled section',
          'tile spacers scattered along the first placed row',
          'tile offcut with visible cut edge near the drop sheet',
          'chalk vertical reference line on the wall beside the tile grid',
        ],
      },

      // ── 3. Faïence salle de bain ─────────────────────────────────────────────
      {
        _for:               'faience.*salle|faience.*bain|salle.*bain.*carre',
        scene_note:         'bathroom tiling — wall faience being laid around shower enclosure or bathtub surround, sanitary fixtures visible in frame, precise cuts around plumbing points',
        scene_camera:       'standing at the bathroom entrance, 1.5–2 m from the tiled wall, slightly off-centre showing both the sanitary fixture and the tile work in the same frame',
        setting:            'interior',
        work_surface:       'vertical wet-area bathroom wall',
        location_must_have: ['shower enclosure or bathtub surround visible', 'at least one sanitary fixture in frame'],
        location_forbidden: ['house exterior', 'floor tiling as the main action'],
        tools: [
          'fine-notched trowel resting on the bath rim near the work zone',
          'rubber mallet on the tiled surface beside freshly placed faience',
          'small tile spacers in a row along the last placed row',
          'tile cutter near the bathtub with a freshly scored tile',
          'grout float resting on a nearby shelf or tray',
          'tube of bathroom silicone sealant near the bath or shower edge',
          'diamond drill bit resting on the bath rim near a drilled tile',
        ],
        protections: [
          'protective film on the bathtub rim to avoid scratching from the trowel',
          'drop cloth on the bathroom floor below the work zone',
          'masking tape along the bath edge where silicone will be applied',
        ],
        chantier_details: [
          'grout residue near the shower tray or bath edge',
          'tile offcuts near the base of the wall beside the sanitary fixture',
          'open adhesive bucket on a nearby shelf or toilet lid',
          'silicone tube cap and cloth near the bath edge',
        ],
      },

      // ── 4. Faïence cuisine ───────────────────────────────────────────────────
      {
        _for:               'faience.*cuisine|cuisine.*faience|credence',
        scene_note:         'kitchen splashback tiling — faience tiles being installed between worktop and wall cupboards, kitchen units clearly visible in frame, cuts around electrical sockets',
        scene_camera:       'standing at the kitchen doorway or 1.5–2 m back, eye-level view of the splashback area with worktop visible at the bottom of frame and cupboards above',
        setting:            'interior',
        work_surface:       'vertical kitchen backsplash wall',
        location_must_have: ['kitchen worktop visible at the bottom of frame', 'kitchen cupboards visible above the backsplash'],
        location_forbidden: ['floor tiling as the main action', 'bathroom context'],
        tools: [
          'fine-notched trowel resting on the worktop beside the active tiling zone',
          'tile spacers along the last laid row of the splashback',
          'spirit level propped against the cupboard next to the work zone',
          'tile cutter on the worktop with a recently cut tile',
          'grout float beside the adhesive bucket near the worktop',
          'pencil marking a cut line on a tile for socket clearance',
        ],
        protections: [
          'protective film covering the worktop directly below the splashback work zone',
          'masking tape along the top of the wall cupboard junction',
          'cardboard strip along the top edge of the worktop to catch adhesive drips',
        ],
        chantier_details: [
          'tile spacers on the worktop near the tiled splashback section',
          'grout residue on the worktop edge below the fresh joints',
          'electrical socket plate removed and set on the worktop beside the tiling zone',
          'tile offcut with cut line visible near the hob or sink area',
          'adhesive bucket open on the kitchen floor near the work zone',
        ],
      },

      // ── 5. Carrelage terrasse extérieure ────────────────────────────────────
      {
        _for:               'terrasse exterieure|carrelage terrasse',
        scene_note:         'outdoor terrace tile installation — large format porcelain stoneware tiles on a terrace abutting the house, building facade or glazed door visible in background, full outdoor natural light',
        scene_camera:       'standing at terrace level, 3–4 m from the house wall, wide view including the building facade or glazed door and both the tiled and untiled sections of the terrace',
        setting:            'exterior',
        scene_contexte:     'terrasse_attenante',
        work_surface:       'large-format outdoor terrace tiles on a screed bed — adhesive ridges and tile spacers visible',
        location_must_have: ['house wall or glazed patio door visible at the back of the terrace', 'clearly defined terrace perimeter — wall, rail, or planter boundary'],
        location_forbidden: ['public road', 'house interior', 'private driveway without any terrace character'],
        tools: [
          'large-format notched trowel resting across a tile stack near the work zone',
          'heavy rubber mallet on the terrace beside the last placed tile row',
          'wide tile spacers (3–5 mm) visible along the last row',
          'long spirit level or straightedge resting on placed tiles',
          'angle grinder with diamond blade beside tile offcuts near the terrace edge',
          'exterior adhesive mixing bucket near the mixing area',
        ],
        protections: [
          'cardboard sheet protecting the recently laid section near the door threshold',
          'masking tape at the wall-terrace junction to keep the perimeter joint clean',
          'plywood strip protecting the glazed door frame from adhesive splash',
        ],
        chantier_details: [
          'tile offcuts near the terrace edge with visible cut marks',
          'adhesive smear on the bare screed adjacent to the last placed tile',
          'exterior adhesive bucket with grey mortar residue near the mixing spot',
          'chalk reference line on the bare screed section',
        ],
      },

      // ── 6. Dallage extérieur ─────────────────────────────────────────────────
      {
        _for:               'dallage exterieur|dallage ext|pose.*dallage',
        scene_note:         'outdoor paving installation — large thick concrete or reconstituted-stone slabs being laid on a sand or lean-concrete bed in a driveway, garden path, or courtyard with no building facade in the immediate foreground',
        scene_camera:       'standing 3–4 m back, wide view of the paving area showing the laid section and the prepared sub-base, boundary wall or landscape in background',
        setting:            'exterior',
        scene_contexte:     'voie_acces_prive',
        work_surface:       'large concrete or reconstituted-stone slabs on a sand or lean-concrete bed — sub-base, joints, and slab edges visible',
        location_must_have: ['functional circulation or access geometry — ground-level paving extending toward a gate, garage, or boundary'],
        location_forbidden: ['living terrace furniture', 'glazed patio door as the central element', 'house interior'],
        tools: [
          'heavy rubber mallet resting on a placed slab near the work front',
          'long straightedge or planimetry rule spanning across the last laid row',
          'sand-spreading shovel resting against the boundary wall',
          'pointing trowel near the joint-filling area',
          'broom for sand-jointing resting at the edge of the laid section',
        ],
        protections: [
          'orange safety cones marking the fresh-paving boundary',
          'knee pads on the prepared sub-base near the work front',
        ],
        chantier_details: [
          'excess sand visible at the edge of the screeded sub-base zone',
          'slab offcuts near the boundary wall with saw marks',
          'joint filler residue on a few finished slabs',
          'string line stretched along the paving boundary for alignment',
          'wheelbarrow with sub-base material at the edge of the site',
        ],
      },

      // ── 7. Pose pierre naturelle ─────────────────────────────────────────────
      {
        _for:          'pierre naturelle|pose.*pierre|pierre.*pose',
        scene_note:    'natural stone tile installation — thick natural stone slabs (travertine, marble, slate or limestone) being laid with white specialist adhesive, stone grain and surface irregularities visually dominant',
        scene_camera:  'crouching at stone level or standing 2 m back, medium view emphasising the stone grain texture and the adhesive work at the transition zone',
        setting:       'interior',
        tools: [
          'large-format notched trowel with white adhesive residue near the placed stones',
          'rubber mallet resting on a placed stone slab',
          'bucket of white natural-stone adhesive with trowel resting across the rim',
          'angle grinder with diamond disc near stone offcuts at the wall',
          'wide spacers between placed stone slabs',
          'polishing pad resting beside a finished stone section',
        ],
        protections: [
          'knee pads on the floor near the stone laying zone',
          'dust sheet covering the adjacent floor section beyond the installation',
          'protective paper over finished stone sections near the entrance',
        ],
        chantier_details: [
          'natural stone offcuts near the wall showing grain and varying thickness',
          'white adhesive residue on the edge of a placed stone slab',
          'stone dust near the cutting area',
          'thickness variation visible at the transition between substrate and placed stone',
        ],
      },

      // ── 8. Réfection joint ───────────────────────────────────────────────────
      {
        _for:          'refection joint|refection.*joint|joint.*refection',
        scene_note:    'tile grout renovation — old darkened or cracked grout being removed and replaced between existing undamaged tiles, grout raking tool or joint disc visible, fresh grey grout contrasting with old stained grout on the same surface',
        scene_camera:  'close crop at floor or wall level, 1–1.5 m from the joint renovation work, showing the contrast between fresh grey grout and old stained joints on the same tile surface',
        setting:       'interior',
        tools: [
          'oscillating grout raker or joint disc resting beside a cleaned joint channel',
          'grout float pressed into a freshly filled joint section',
          'rubber squeegee resting on the tiled surface after spreading',
          'sponge and rinse water bucket beside the freshly grouted area',
          'grout mixing container near the work zone',
          'vacuum nozzle near the cleaned joint channels',
        ],
        protections: [
          'knee pads on the tiled floor beside the joint renovation zone',
          'protective film over a section of nearby tiles to catch grout dust',
        ],
        chantier_details: [
          'old grout dust visible along cleaned joint channels',
          'fresh grey grout damp in a few joints contrasting with old stained joints',
          'cleaning cloth near the recently grouted section',
          'grout haze on tile faces adjacent to the fresh joint work',
          'grout mixing container with fresh residue near the work zone',
        ],
      },

      // ── 9. Réfection carrelage ───────────────────────────────────────────────
      {
        _for:          'refection carrelage|renovation carrelage|remplacement carrelage',
        scene_note:    'tile replacement and renovation — broken or aged tiles being removed with chisel and replaced with new matching tiles; the removal zone (bare substrate) visible alongside the new tile installation in the same frame',
        scene_camera:  'standing or crouching 1.5–2 m from the replacement zone, medium view showing the boundary between the bare substrate, the intact existing tiles, and the new tiles being laid',
        setting:       'interior',
        tools: [
          'cold chisel and hammer near the tile removal zone',
          'notched trowel beside the newly placed replacement tiles',
          'rubber mallet near the fresh tile section',
          'tile cutter with a new tile prepared near the opening',
          'debris bag for tile fragments beside the removal zone',
          'broom resting against the wall near the swept area',
        ],
        protections: [
          'knee pads on the floor near the tile removal zone',
          'safety glasses near the hammer and chisel',
          'protective sheet over adjacent intact tiles to catch debris',
        ],
        chantier_details: [
          'broken tile fragments in a pile near the removal zone',
          'bare substrate (screed or plaster) exposed in the removal area',
          'adhesive residue on the bare substrate showing the old tile outline',
          'new tile offcut near the replacement zone matching the existing tiles',
          'dust on the floor near the chiselling area',
        ],
      },

    ],
  },

};
