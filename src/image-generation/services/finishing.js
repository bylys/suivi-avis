/**
 * finishing.js — Phase 2 shadow copy (source active : app.js)
 * WORK_SCENES {débarras} et SITE_REALISM {'débarras'}.
 * La clé 'carrelage' a été déplacée dans services/carrelage.js.
 * La clé 'vitrier' a été déplacée dans services/vitrier.js.
 * Ne pas modifier avant le cutover validé.
 */

export const WORK_SCENES_FINISHING = {

  débarras: {
    category:         'débarras',
    priority:         2,
    service_keywords: [
      { phrase: 'debarras grenier',       score: 13 },
      { phrase: 'debarras appartement',   score: 13 },
      { phrase: 'debarras maison',        score: 13 },
      { phrase: 'enlevement encombrants', score: 13 },
      { phrase: 'evacuation encombrants', score: 13 },
      { phrase: 'vide cave',              score: 12 },
      { phrase: 'vide grenier',           score: 12 },
      { phrase: 'debarras',               score: 9  },
      { phrase: 'encombr',                score: 7  },
      { phrase: 'evacuation',             score: 5  },
      { phrase: 'vider',                  score: 5  },
      { phrase: 'dechet',                 score: 4  },
    ],
    exclude_if: [],
    intro:      'house clearing operation at a residential property',
    setting:    'exterior',
    secteur:    'clearance worker',
    hasWorkers: true,
    camera:     'standing near the property entrance, 3–5 m from van, eye level',
    materials:  ['furniture', 'cardboard boxes', 'bin bags', 'household items'],
    photo_defects: [
      'mixed window and doorway light causing uneven exposure at entrance',
      'slight tilt from doorframe vertical reference',
    ],
    exclusions: ['branded uniforms', 'readable text on boxes', 'brand logos', 'safety vests'],
    states: {
      debut: {
        framing: {
          work_pct:   40,
          foreground: 'a few large items staged at the entrance — a wardrobe, a rolled rug',
          midground:  'van parked in driveway with rear doors open, mostly empty',
          background: 'house facade, garden hedge',
        },
        debris:      'light dust on items staged at entrance, cardboard packing material on the ground',
        description: 'Clearing has just started. A few large items are staged at the entrance. The van is parked and ready. Workers in casual clothes are beginning to load.',
      },
      encours: {
        framing: {
          work_pct:   55,
          foreground: 'items stacked near the van — boxes, bags, chairs, small furniture',
          midground:  'van half loaded with furniture and bags, two workers in jeans and t-shirts carrying items',
          background: 'house facade, open entrance',
        },
        debris:      'dust and packing material on the driveway near staged items',
        description: 'Clearing is in full swing. The van is half loaded. Workers are actively moving items from the property to the van.',
      },
      semifinal: {
        framing: {
          work_pct:   50,
          foreground: 'last remaining items near the entrance, driveway mostly clear',
          midground:  'van nearly full, one worker carries the last items',
          background: 'house facade, garden',
        },
        debris:      'a few small items and cardboard scraps remain — driveway nearly clear',
        description: 'Almost done. The van is nearly full. A few last items are being moved out. The property entrance is becoming clear.',
      },
      final: {
        framing: {
          work_pct:   45,
          foreground: 'empty clean driveway, van closed and ready to leave',
          midground:  'cleared property entrance — nothing remaining outside',
          background: 'house facade, garden, street',
        },
        debris:      'none — driveway swept and clear',
        description: 'Clearing complete. The property is empty. The van is loaded and closed. The driveway is clean. Job done.',
      },
    },
  },

};

export const SITE_REALISM_FINISHING = {

  'débarras': {

    // ─── DEBARRAS-CAVE-INTERIOR — ENCOURS — CELLAR_INTERIOR_CLEAROUT (state_lock, pool_size=1) ──
    // Single scenario: authentic cellar interior, 2 workers, no vehicle visible.
    scenarios: [
      {
        _for:                             'cave|sous.?sol',
        _state_for:                       'encours',
        _access_configuration:            'CELLAR_INTERIOR_CLEAROUT',
        _access_configuration_source:     'state_lock',
        _access_configuration_randomized: false,
        _visual_family:                   'DEBARRAS-CAVE-INTERIOR',
        setting:                          'interior',
        scene_camera:                     'standing at the bottom of the cellar stairs or near the entrance, smartphone held at chest height, wide angle capturing the full cellar depth — low ceiling overhead',
        scene_framing:                    'cellar interior mid-clearout: left third still cluttered with old shelving and stacked items, right two-thirds partially cleared with stacked sealed boxes and an open floor path leading to the exit staircase — ceiling joists or concrete slab low overhead',
        scene_debris:                     'dust on the concrete floor around cleared area, cardboard scraps near stacked boxes, light debris near the exit path',
        location_must_have: [
          'stone, concrete, or breeze-block cellar walls — rough unfinished surface',
          'low ceiling — exposed joists, concrete slab, or bare beams',
          'cellar floor — raw concrete, packed earth, or unpolished stone',
          'staircase or access opening visible toward the exit',
          'part of the space still cluttered, part already cleared',
        ],
        location_forbidden: [
          'modern painted plasterboard walls suggesting a renovated room',
          'bright sunlit space suggesting above-ground rooms or large windows',
          'kitchen, bathroom, living room, or hallway interior',
          'outdoor driveway or garden setting',
          'removal van visible inside the scene',
        ],
        scene_exclude: [
          'removal van as subject',
          'outdoor driveway or exterior scene',
          'modern renovated room with smooth plasterboard walls',
          'single worker carrying large armoire or sofa alone',
          'worker carrying bulky item on stairs',
          'bright sunny outdoor lighting through large windows',
          'clearly empty finished cellar with nothing left to remove',
        ],
        chantier_details: [
          'flattened cardboard boxes stacked against the cellar wall near the exit path',
          'two or three sealed boxes stacked near the staircase foot ready for removal',
          'dusty concrete floor with visible cleared path to the staircase',
          'old wooden shelving unit on the left — some shelves still holding items, some emptied',
          'small pile of miscellaneous items sorted near the wall — books, a lamp, an old box',
        ],
        tools: [
          'sack truck or hand cart standing upright beside a stack of boxes near the exit',
          'portable LED work light on the floor or hung from a beam illuminating the work area',
          'work gloves placed on top of a sealed box near the staircase',
        ],
        protections: [
          'dust mask or respirator hanging from a nail near the entrance',
          'knee pad resting beside a low shelf being emptied',
        ],
      },
    ],

    // ─── Flat fallback tools/details — used for all other débarras services (no scenario match) ──
    tools: [
      'flat furniture trolley resting against the wall near the doorway',
      'moving straps on the floor near the exit',
      'hand cart parked beside the loaded items',
      'box cutter resting on top of a sealed box',
    ],
    protections: [
      'cardboard sheet protecting the floor threshold at the doorway',
      'foam corner protector on the door frame at the load exit point',
    ],
    chantier_details: [
      'cardboard boxes stacked near the exit point ready for removal',
      'sorted pile of items near the door — books, frames, small furniture',
      'hand cart wheel marks on the floor near the doorway',
      'small pile of bubble wrap or packing paper on the floor',
      'open box with packing material beside the sorted pile',
    ],
  },

};
