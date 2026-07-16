/**
 * technical-trades.js — Phase 2 shadow copy (source active : app.js)
 * Copie stricte de WORK_SCENES {plomberie, électricité}
 * et SITE_REALISM {plomberie, 'électricité'}.
 * Ne pas modifier avant le cutover validé.
 */

export const WORK_SCENES_TECHNICAL_TRADES = {
  plomberie: {
    category:         'plomberie',
    priority:         2,
    service_keywords: [
      { phrase: 'reparation fuite plomberie', score: 14 },
      { phrase: 'fuite plomberie',            score: 13 },
      { phrase: 'installation sanitaire',     score: 12 },
      { phrase: 'salle de bain',              score: 11 },
      { phrase: 'plombier',                   score: 9  },
      { phrase: 'robinetterie',               score: 9  },
      { phrase: 'chauffe eau',                score: 9  },
      { phrase: 'chaudiere',                  score: 8  },
      { phrase: 'sanitaire',                  score: 8  },
      { phrase: 'plomb',                      score: 6  },
      { phrase: 'wc',                         score: 6  },
    ],
    exclude_if: [],
    intro:      'plumbing renovation inside a residential property',
    setting:    'interior',
    secteur:    'plumber',
    hasWorkers: false,
    camera:     'crouching or kneeling, 1–2 m from the pipes or open wall cavity',
    materials:  ['copper pipes', 'fittings', 'PTFE tape', 'pipe collars'],
    photo_defects: [
      'low ambient light with slight sensor noise',
      'flat artificial ceiling light only — no natural light',
    ],
    exclusions: ['pipe wrenches', 'tools', 'buckets', 'cleaning supplies', 'workers', 'people'],
    states: {
      debut: {
        framing: {
          work_pct:   50,
          foreground: 'old pipe section removed, wall cavity open, fresh drill dust on floor',
          midground:  'exposed wall showing old pipe stub and new pipe start being positioned',
          background: 'white bathroom wall, existing tiles',
        },
        debris:      'pipe offcuts, drill dust and small plaster fragments near the wall opening',
        description: 'Work has just started. Old pipes are being removed. The wall is open. New pipe routing is being planned.',
      },
      encours: {
        framing: {
          work_pct:   60,
          foreground: 'copper pipes partially installed, visible fittings and PTFE tape on the floor',
          midground:  'new pipe run in progress — some sections soldered, others still raw',
          background: 'white wall, some tiles, window or door',
        },
        debris:      'pipe offcuts, PTFE tape scraps and fitting packaging on the floor',
        description: 'Plumbing installation is underway. New copper pipes are being run. Some sections are soldered, others still open. The job is progressing.',
      },
      semifinal: {
        framing: {
          work_pct:   65,
          foreground: 'new pipes fully connected, wall being patched around them',
          midground:  'complete new plumbing run, plaster patch drying around pipe entry points',
          background: 'white bathroom wall, existing tiles',
        },
        debris:      'plaster dust and a few pipe offcuts, wall patch still slightly damp',
        description: 'Pipes are in and connected. The wall is being patched around the new installation. Almost ready for the final finish.',
      },
      final: {
        framing: {
          work_pct:   60,
          foreground: 'clean floor, new fixture installed and connected — no tools in view',
          midground:  'new plumbing visible — clean pipes, wall patched and painted',
          background: 'clean bathroom wall, existing tiles',
        },
        debris:      'none — floor clean, installation complete',
        description: 'Plumbing renovation complete. New pipes installed, wall patched. The bathroom is clean and ready.',
      },
    },
  },

  électricité: {
    category:         'électricité',
    priority:         2,
    service_keywords: [
      { phrase: 'mise aux normes electrique', score: 14 },
      { phrase: 'installation electrique',    score: 13 },
      { phrase: 'tableau electrique',         score: 12 },
      { phrase: 'electricien',                score: 10 },
      { phrase: 'electricite',                score: 9  },
      { phrase: 'prises',                     score: 5  },
      { phrase: 'interrupteur',               score: 5  },
      { phrase: 'cabl',                       score: 6  },
      { phrase: 'elect',                      score: 5  },
    ],
    exclude_if: [],
    intro:      'electrical installation inside a residential property',
    setting:    'interior',
    secteur:    'electrician',
    hasWorkers: false,
    camera:     'standing or crouching, 1–2 m from open wall cavity or distribution board',
    materials:  ['electrical cable', 'conduit', 'junction boxes', 'outlet plates'],
    photo_defects: [
      'mixed ceiling lamp and window light causing uneven exposure',
      'JPEG compression noise in dark cable areas',
    ],
    exclusions: ['screwdrivers', 'wire strippers', 'safety equipment', 'workers', 'people'],
    states: {
      debut: {
        framing: {
          work_pct:   45,
          foreground: 'cable channels chased into plaster wall, fine plaster dust on floor',
          midground:  'bare wall with open cable channels, first cables being pulled through',
          background: 'adjacent wall, door frame, ceiling',
        },
        debris:      'plaster dust and small plaster chips on floor near the chased channels',
        description: 'Cable routing has started. Channels are chased into the wall. The first cables are being pulled through. The room is dusty from chasing.',
      },
      encours: {
        framing: {
          work_pct:   55,
          foreground: 'cable offcuts and junction box scraps on the bare floor',
          midground:  'cables installed in channels, junction boxes fitted, outlets in progress',
          background: 'bare plaster wall, door frame',
        },
        debris:      'cable offcuts, conduit pieces and screw packaging on the floor',
        description: 'Cables are in and junction boxes are fitted. Outlet positions are being confirmed. The work is clear and progressing.',
      },
      semifinal: {
        framing: {
          work_pct:   60,
          foreground: 'fresh plaster patches drying around new outlet positions',
          midground:  'wall with all cables covered and plastered, outlet boxes installed',
          background: 'white plastered wall, door frame',
        },
        debris:      'plaster dust near the fresh patches, a few cable offcuts on the floor',
        description: 'Cables are covered. Plaster patches are drying around the new outlets. Almost ready for painting.',
      },
      final: {
        framing: {
          work_pct:   60,
          foreground: 'clean wall with new outlet and switch plates fitted',
          midground:  'complete installation — smooth wall, outlets and switches aligned',
          background: 'clean painted wall, door frame',
        },
        debris:      'none — wall clean, installation finished',
        description: 'Electrical installation complete. Outlets and switches are in. Wall is patched and painted. Clean professional result.',
      },
    },
  },

};

export const SITE_REALISM_TECHNICAL_TRADES = {
  plomberie: {
    tools: [
      'pipe wrench on the floor near the open pipe connection',
      'adjustable spanner resting on a nearby surface',
      'PTFE thread seal tape reel on the work area beside the fitting',
      'pipe offcut beside the new connection point',
      'pipe cutter tool resting on the subfloor nearby',
    ],
    protections: [
      'absorbent mat on the floor below the pipe connection point',
      'small plastic bucket placed under the disconnected pipe end',
    ],
    chantier_details: [
      'thread seal tape strip near the pipe fitting on the floor',
      'pipe compression fitting cap on the floor beside the work area',
      'putty residue mark on the subfloor below the connection',
      'copper pipe end cap resting on the subfloor',
      'small damp mark on the floor from water draining during disconnection',
    ],
  },

  'électricité': {
    tools: [
      'cable routing rod resting against the wall near the conduit entry',
      'electrical junction box open on the floor nearby',
      'cable stripping tool on the work surface',
      'voltage tester resting beside the open panel or socket',
      'coil of electrical cable resting on the floor near the pull point',
    ],
    protections: [
      'electrical isolation warning tag clipped to the circuit breaker handle',
      'rubber mat on the floor below the open consumer unit',
    ],
    chantier_details: [
      'cable offcut clippings on the floor near the pull point',
      'wire connector caps grouped on the work surface',
      'conduit elbow fitting on the floor beside the wall entry',
      'chalk marking on the wall showing the cable routing path',
      'open circuit breaker panel with one breaker visibly switched off',
    ],
  },

};
