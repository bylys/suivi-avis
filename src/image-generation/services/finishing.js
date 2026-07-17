/**
 * finishing.js — Phase 2 shadow copy (source active : app.js)
 * Copie stricte de WORK_SCENES {vitrier, débarras}
 * et SITE_REALISM {vitrier, 'débarras'}.
 * La clé 'carrelage' a été déplacée dans services/carrelage.js.
 * Ne pas modifier avant le cutover validé.
 */

export const WORK_SCENES_FINISHING = {
  vitrier: {
    category:         'vitrier',
    priority:         3,
    service_keywords: [
      { phrase: 'remplacement vitre', score: 13 },
      { phrase: 'vitre cassee',       score: 13 },
      { phrase: 'double vitrage',     score: 12 },
      { phrase: 'miroiterie',         score: 11 },
      { phrase: 'vitrerie',           score: 10 },
      { phrase: 'vitrier',            score: 10 },
      { phrase: 'vitrine',            score: 9  },
      { phrase: 'vitr',               score: 5  },
    ],
    exclude_if: [],
    intro:      'window glass replacement at a residential property',
    setting:    'exterior',
    secteur:    'glazier',
    hasWorkers: false,
    camera:     'standing 2–3 m from the window, straight-on view, eye level',
    materials:  ['glass pane against wall', 'glazing putty', 'window spacers', 'protective corner pieces'],
    photo_defects: [
      'glass reflection causing an overexposed bright patch in the frame centre',
      'chromatic aberration on the sharp window frame edge',
    ],
    exclusions: ['suction cups in use', 'workers', 'people', 'broken glass shards'],
    states: {
      debut: {
        framing: {
          work_pct:   40,
          foreground: 'old window frame with glass partially removed — bare frame sections exposed, putty being chipped away',
          midground:  'window opening in the facade, old glass still in place on the upper section',
          background: 'house facade, brick or rendered wall',
        },
        debris:      'old putty flakes and small glass chips at the window base — minimal and tidy',
        description: 'Work just started. Frame being prepared. Old glass or putty being removed.',
      },
      encours: {
        framing: {
          work_pct:   55,
          foreground: 'new glass pane positioned in frame, spacers visible at edges, putty being applied',
          midground:  'window partially assembled — new glass in position, sealant bead at frame junction',
          background: 'house facade',
        },
        debris:      'putty scraps and spacer packaging near the window base',
        description: 'Glass replacement underway. New pane being positioned and sealed into the frame.',
      },
      semifinal: {
        framing: {
          work_pct:   60,
          foreground: 'glass fully in place, sealant bead being smoothed around the frame perimeter',
          midground:  'complete glass panel in frame, sealant line visible but not yet dry',
          background: 'house facade',
        },
        debris:      'sealant packaging and a small putty knife near the window',
        description: 'New glass in. Sealant being applied and smoothed around the edges. Nearly finished.',
      },
      final: {
        framing: {
          work_pct:   65,
          foreground: 'clean new window — clear glass, neat sealant bead, clean painted frame',
          midground:  'full window view — glass reflecting surroundings cleanly, frame in good condition',
          background: 'house facade, garden or pavement, sky visible in glass reflection',
        },
        debris:      'none — window clean, installation finished',
        description: 'Window replacement complete. Clear glass, clean frame, neat sealant. Professional result.',
      },
    },
  },

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
  vitrier: {
    tools: [
      'suction cup lifting handle resting on the windowsill',
      'glass cutter resting beside the scored glass piece on the floor',
      'putty knife resting on the ledge beside the window frame',
      'caulk gun on the floor near the frame base',
      'plastic glazing bead strip on the floor beside the opening',
    ],
    protections: [
      'protective rubber mat on the windowsill to prevent glass scratching',
      'cardboard sheet on the floor directly below the window opening',
    ],
    chantier_details: [
      'glass offcut resting against the wall at the base near the window',
      'strip of old putty or sealant on the floor from the removed pane',
      'caulk bead residue visible on the frame edge',
      'small plastic shim wedge near the base of the installed glass',
      'empty silicone tube beside the caulk gun on the floor',
    ],
  },

  'débarras': {
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
