/**
 * depannage-auto.js — Phase 2 shadow copy (source active : app.js)
 * Copie stricte de WORK_SCENES {depannage_auto} et SITE_REALISM {depannage_auto}.
 * Ne pas modifier avant le cutover validé.
 */

export const WORK_SCENES_DEPANNAGE_AUTO = {
  depannage_auto: {
    category:         'dépannage auto',
    priority:         4,
    service_keywords: [
      { phrase: 'depannage auto',        score: 14 },
      { phrase: 'depannage automobile',  score: 14 },
      { phrase: 'depannage voiture',     score: 14 },
      { phrase: 'panne voiture',         score: 13 },
      { phrase: 'voiture en panne',      score: 13 },
      { phrase: 'vehicule en panne',     score: 13 },
      { phrase: 'assistance routiere',   score: 13 },
      { phrase: 'remorquage',            score: 12 },
      { phrase: 'transport garage',      score: 12 },
      { phrase: 'batterie a plat',       score: 12 },
      { phrase: 'changement de roue',    score: 12 },
      { phrase: 'ouverture voiture',     score: 12 },
      { phrase: 'ouverture vehicule',    score: 12 },
      { phrase: 'enlevement vehicule',   score: 12 },
      { phrase: 'demarrage batterie',    score: 12 },
      { phrase: 'crevaison',             score: 11 },
      { phrase: 'batterie voiture',      score: 11 },
      { phrase: 'remorque',              score: 9  },
      { phrase: 'batterie',              score: 9  },
      { phrase: 'depannag',              score: 8  },
      { phrase: 'panne',                 score: 8  },
      { phrase: 'assistance',            score: 8  },
    ],
    exclude_if: [],
    intro:      'roadside vehicle breakdown assistance and recovery',
    setting:    'exterior',
    secteur:           'breakdown technician',
    variation_setting: 'roadside',
    hasWorkers:        true,
    camera:            'standing 3–5 m from the car, eye level, showing vehicle and roadside context — client smartphone shot from roadside, pavement, or adjacent parked vehicle; camera must remain outside the path of the winch cable and outside the vehicle movement corridor; never from under the car or from the tow truck deck',
    materials:  ['warning triangle on pavement', 'jump cables on seat', 'tow straps visible in van'],
    photo_defects: [
      'overexposure from bright sky against dark car bodywork',
      'slight motion blur from passing traffic in background',
    ],
    exclusions: ['readable licence plates', 'brand logos'],
    states: {
      debut: {
        framing: {
          work_pct:   40,
          foreground: 'car parked on roadside — warning triangle placed on pavement nearby, hazard lights implied',
          midground:  'car bonnet still closed, technician van parked directly behind',
          background: 'road, hedgerow or pavement edge, distant traffic',
        },
        debris:      'warning triangle on pavement, small oil drip under car as authentic detail',
        description: 'Breakdown just attended. Technician van parked behind. Car on the side of the road, bonnet still closed.',
      },
      encours: {
        framing: {
          work_pct:   55,
          foreground: 'car bonnet open, engine bay visible, jump cables or diagnostic equipment nearby',
          midground:  'van open with equipment visible, technician at the front of the car',
          background: 'road, fence or hedge, distant vehicles',
        },
        debris:      'jump cable on the road near the battery, warning vest placed on car roof',
        description: 'Diagnosis underway. Bonnet open. Jump cables or tools connecting the vehicles.',
      },
      semifinal: {
        framing: {
          work_pct:   55,
          foreground: 'car bonnet being lowered after repair, cables being coiled near van',
          midground:  'van doors being closed, equipment packed away',
          background: 'road, pavement, distant hedges',
        },
        debris:      'cables coiled on the ground near the van, warning triangle about to be picked up',
        description: 'Repair complete, equipment being packed. Car is roadworthy again.',
      },
      final: {
        framing: {
          work_pct:   50,
          foreground: 'car fully closed and ready — clean side view on the roadside',
          midground:  'technician van parked behind, both vehicles ready',
          background: 'road, pavement, sky',
        },
        debris:      'none — roadside clear, job done cleanly',
        description: 'Breakdown resolved. Car ready to drive. Roadside is clear and tidy.',
      },
    },
  },

};

export const SITE_REALISM_DEPANNAGE_AUTO = {
  depannage_auto: {
    _dispatch: 'service',

    batterie: {
      scenarios: [
        {
          scene_note:    'battery jump-start in progress — clamp cables connecting the two batteries, bonnets open on both vehicles',
          scene_camera:  'standing at the front of the stalled vehicle, looking down into the open engine bay from the side — clamp cables clearly visible on the battery posts',
          scene_framing: {
            work_pct:   70,
            foreground: 'jump-start cable clamps on battery terminals, cable running to the second vehicle out of frame',
            midground:  'open engine bay of the stalled vehicle, battery and engine components visible',
            background: 'second vehicle partially visible with bonnet raised, road or outdoor surface beyond',
          },
          scene_debris:  'cable tie packaging on the ground near the battery, small oil residue on the engine bay ledge',
          scene_exclude: ['hydraulic jack', 'spare tyre', 'lug wrench', 'flat tyre', 'tow strap', 'door wedge', 'air pump'],
          tools: [
            'jump-start cable set with clamps on battery terminals',
            'multimeter resting on the engine bay ledge',
            'torch on the wheel arch near the open bonnet',
          ],
          protections: [
            'reflective safety vest on the car roof',
            'reflective warning triangle placed behind the vehicle',
          ],
          chantier_details: [
            'cable clamps on battery terminals with cable running to second vehicle',
            'both vehicle bonnets raised — cable running between them',
            'warning triangle shadow on the road behind the stalled car',
          ],
        },
        {
          scene_note:    'battery jump-start using a standalone portable booster pack — no second vehicle, compact booster clipped directly to the battery terminals',
          scene_camera:  'close view at engine bay level, framing the compact booster pack propped on the wheel arch, clamp cables on battery posts',
          scene_framing: {
            work_pct:   75,
            foreground: 'portable booster pack on the wheel arch lip, short clamp cables running to battery terminals',
            midground:  'engine bay surrounding the battery — air filter, fuse box, hoses visible',
            background: 'open bonnet edge and outdoor surface beyond',
          },
          scene_debris:  'booster carry case on the ground near the front wheel',
          scene_exclude: ['second vehicle bonnet open', 'long cables between two cars', 'hydraulic jack', 'spare tyre', 'tow strap', 'door wedge'],
          tools: [
            'compact portable battery booster pack on the wheel arch, clipped to battery posts',
            'clamp cables short-length connected directly to the booster',
            'torch resting on the wheel arch beside the booster',
          ],
          protections: [
            'reflective safety vest folded on the car roof',
            'warning triangle placed behind the vehicle',
          ],
          chantier_details: [
            'booster pack indicator LEDs lit up on the casing',
            'clamp cables running directly from booster to battery posts',
            'empty booster carry case on the ground near the front tyre',
          ],
        },
        {
          scene_note:    'battery replacement in progress — old battery removed and set aside, new battery being positioned in the engine bay tray',
          scene_camera:  'leaning over the open bonnet, close view of the battery tray with the new battery being lowered into position',
          scene_framing: {
            work_pct:   75,
            foreground: 'new battery being positioned in the battery tray, hold-down bracket beside it',
            midground:  'engine bay around the battery slot, terminal spanner on the ledge',
            background: 'open bonnet edge and outdoor surface beyond',
          },
          scene_debris:  'old battery on the ground near the front wheel, terminal corrosion residue on the battery ledge',
          scene_exclude: ['jump cables between two cars', 'second vehicle', 'hydraulic jack', 'spare tyre', 'tow strap', 'door wedge'],
          tools: [
            'new battery being lowered into the battery tray',
            'battery terminal spanner beside the hold-down bracket',
            'terminal grease tube on the engine bay ledge',
          ],
          protections: [
            'insulating mat beneath the new battery in the tray',
            'warning triangle placed behind the vehicle',
          ],
          chantier_details: [
            'old battery set aside on the ground near the front wheel, terminals facing up',
            'new battery in the tray, hold-down bracket about to be fitted',
            'terminal posts clean and ready for cable connection',
          ],
        },
        {
          scene_note:    'battery voltage diagnostic — multimeter clipped to battery terminals, bonnet open, pre-repair assessment',
          scene_camera:  'close view from above the open engine bay, framing the multimeter display and the clamp leads on the battery posts',
          scene_framing: {
            work_pct:   75,
            foreground: 'digital multimeter resting on the engine bay ledge, clamp leads on battery positive and negative terminals',
            midground:  'battery top visible, fuse box and engine components around it',
            background: 'open bonnet edge and outdoor surface beyond',
          },
          scene_debris:  'multimeter carry case open on the ground near the front bumper',
          scene_exclude: ['jump cables between two cars', 'second vehicle', 'hydraulic jack', 'spare tyre', 'tow strap', 'door wedge'],
          tools: [
            'digital multimeter with clamp leads on battery terminals',
            'torch resting on the wheel arch above the battery',
          ],
          protections: [
            'reflective safety vest on the car roof',
            'warning triangle placed on the road behind the vehicle',
          ],
          chantier_details: [
            'multimeter display visible showing battery voltage reading',
            'clamp leads firmly attached to positive and negative posts',
            'multimeter carry pouch open on the ground near the front bumper',
          ],
        },
        {
          scene_note:    'battery terminal cleaning — corroded terminals being treated with wire brush and anti-corrosion spray before reconnection',
          scene_camera:  'close macro view of the open engine bay, framing the battery terminal and the wire brush mid-scrub',
          scene_framing: {
            work_pct:   80,
            foreground: 'wire brush on a battery terminal, white corrosion powder residue beside the post',
            midground:  'battery top with second terminal, anti-corrosion spray can nearby',
            background: 'engine bay components around the battery, bonnet edge above',
          },
          scene_debris:  'white corrosion powder residue on the battery tray surface beside the terminal',
          scene_exclude: ['jump cables', 'second vehicle', 'new battery in box', 'hydraulic jack', 'spare tyre', 'tow strap'],
          tools: [
            'wire brush resting on the battery terminal after scrubbing',
            'anti-corrosion spray can beside the battery',
            'small flat-head screwdriver for terminal clamp bolt on the ledge',
          ],
          protections: [
            'nitrile gloves on the engine bay ledge near the battery',
            'warning triangle on the road behind the vehicle',
          ],
          chantier_details: [
            'corrosion powder residue on the battery tray surface',
            'terminal surface visibly cleaner on the scrubbed side',
            'anti-corrosion spray nozzle pointed toward the terminal',
          ],
        },
        {
          scene_note:    'post-jump cleanup — jump cables being coiled after a successful restart, bonnet about to close, tools being packed',
          scene_camera:  'standing at the front of the car, framing the cables being gathered and the bonnet propped open for the last moments',
          scene_framing: {
            work_pct:   55,
            foreground: 'jump cables being coiled into a loop on the ground near the bumper',
            midground:  'bonnet still propped open, engine bay visible and undisturbed',
            background: 'road or outdoor surface, warning triangle about to be retrieved',
          },
          scene_debris:  'cable end cap resting on the bumper where the cable just hung, carry bag open on the ground',
          scene_exclude: ['cables attached to battery', 'second vehicle bonnet open', 'hydraulic jack', 'spare tyre', 'tow strap'],
          tools: [
            'jump cables being coiled — clamps visible at the end of the loop',
            'cable carry bag open on the ground near the front wheel',
          ],
          protections: [
            'reflective safety vest folded on the car roof ready to be stowed',
            'warning triangle visible on the road about to be retrieved',
          ],
          chantier_details: [
            'jump cables coiled into a loop near the bumper',
            'carry bag open on the ground for the cables to go back in',
            'bonnet still propped open on the hood rod',
          ],
        },
        {
          scene_note:    'night battery intervention — portable work light or torch illuminating the engine bay, booster pack LED display glowing in the dark',
          scene_camera:  'slightly wider angle at engine bay level, framing the lit-up engine bay against a dark background, booster LEDs prominent',
          scene_framing: {
            work_pct:   70,
            foreground: 'portable booster pack on the wheel arch, LED charge indicator glowing, clamp cables connected to battery',
            midground:  'engine bay illuminated by a portable LED work light clipped to the bonnet edge',
            background: 'dark road or parking area beyond, hazard light reflection visible',
          },
          scene_debris:  'booster carry case open on the ground, torchlight casting shadows in the engine bay',
          scene_exclude: ['daylight conditions', 'second vehicle', 'hydraulic jack', 'spare tyre', 'tow strap'],
          tools: [
            'portable booster pack with lit LED indicator on the wheel arch',
            'clip-on LED work light on the bonnet edge illuminating the engine bay',
            'clamp cables connected to battery posts',
          ],
          protections: [
            'reflective safety vest visible in the light near the car',
            'warning triangle with reflector active on the road behind the car',
          ],
          chantier_details: [
            'engine bay lit by portable LED work light — strong contrast with surrounding dark',
            'booster pack LED charge display lit up on the casing',
            'hazard lights reflected on the road surface beside the car',
          ],
        },
        {
          scene_note:    'winter breakdown — engine bay open in cold conditions, frost visible on the windshield, booster or cables ready for a cold start',
          scene_camera:  'standing at the front of the car, framing the open bonnet and the frost-covered windshield as a background detail',
          scene_framing: {
            work_pct:   65,
            foreground: 'booster pack cables connected to battery terminals in the open engine bay',
            midground:  'engine bay in cold conditions — condensation or frost residue on the surfaces near the battery',
            background: 'frost-covered windshield and car roof visible behind the raised bonnet edge',
          },
          scene_debris:  'fine frost crystals on the engine bay plastic covers, condensation on the battery casing',
          scene_exclude: ['summer conditions', 'second vehicle', 'hydraulic jack', 'spare tyre', 'tow strap'],
          tools: [
            'booster pack clipped to battery terminals, ready for cold start',
            'torch resting on the wheel arch',
          ],
          protections: [
            'reflective safety vest on the car roof',
            'warning triangle on the icy road behind the vehicle',
          ],
          chantier_details: [
            'frost on the windshield visible in the background',
            'condensation on the battery casing and plastic covers in the cold air',
            'exhaust residue on the road surface near the rear of the car',
          ],
        },
        {
          scene_note:    'hidden battery access — plastic battery cover removed to access a concealed or trunk-mounted battery, cover set aside beside the car',
          scene_camera:  'close view of the battery compartment with the plastic cover removed, battery now visible and accessible',
          scene_framing: {
            work_pct:   75,
            foreground: 'battery revealed in its compartment, terminals exposed — plastic cover set aside on the adjacent surface',
            midground:  'battery tray surroundings — wiring loom, mounting brackets',
            background: 'open boot or side panel, indoor parking area or roadside beyond',
          },
          scene_debris:  'plastic battery cover on the ground or boot floor beside the open compartment',
          scene_exclude: ['second vehicle bonnet open', 'long jump cables between two cars', 'hydraulic jack', 'spare tyre'],
          tools: [
            'plastic battery cover removed and set aside, revealing the battery',
            'terminal clamp spanner beside the battery',
            'torch resting near the open compartment',
          ],
          protections: [
            'warning triangle placed behind the vehicle',
          ],
          chantier_details: [
            'plastic battery cover set aside exposing the battery compartment',
            'battery terminals now accessible after cover removal',
            'wiring loom routed around the battery tray visible after cover off',
          ],
        },
        {
          scene_note:    'initial breakdown scene — vehicle on roadside, bonnet just propped open, battery visible, no repair started yet',
          scene_camera:  'standing back at the front corner of the car, framing the raised bonnet and the roadside context — tools not yet out',
          scene_framing: {
            work_pct:   45,
            foreground: 'bonnet propped open on hood rod, engine bay visible, battery tray in view',
            midground:  'front of the stalled vehicle at roadside, no repair equipment visible yet',
            background: 'road or parking edge, technician van or background vehicles at distance',
          },
          scene_debris:  'warning triangle freshly placed on the road behind the vehicle',
          scene_exclude: ['cables attached to battery', 'booster pack on battery', 'hydraulic jack', 'spare tyre', 'tow strap'],
          tools: [
            'warning triangle placed freshly on the road behind the vehicle',
            'tool bag closed on the ground near the front wheel — not yet opened',
          ],
          protections: [
            'reflective safety vest on the car roof',
            'warning triangle on the road behind the vehicle',
          ],
          chantier_details: [
            'bonnet raised and propped on the hood rod — nothing disturbed yet',
            'battery visible in the engine bay, terminals in original state',
            'warning triangle freshly placed on the road surface',
          ],
        },
      ],
      scene_note: 'roadside breakdown — battery failure, jump-start or booster in progress beside a stalled vehicle',
      tools: [
        'jump-start cable set draped over the open bonnet edge',
        'portable battery booster pack resting on the ground near the front bumper',
        'multimeter resting on the engine bay ledge',
        'clamp connector visible on the battery terminal',
        'torch resting on the wheel arch near the open bonnet',
      ],
      protections: [
        'reflective safety vest on the car roof',
        'reflective warning triangle placed behind the vehicle',
      ],
      chantier_details: [
        'bonnet propped open showing the engine bay',
        'battery booster cable clips visible at the battery posts',
        'empty booster pack carry case on the ground near the front tyre',
        'warning triangle casting a shadow on the road behind the car',
        'technician gloves on the ground near the front wheel',
      ],
    },

    crevaison: {
      scenarios: [
        {
          scene_note:    'full wheel change in progress — Worker 1 fitting the spare tyre at the jacked wheel arch; Worker 2 standing at a safe lateral distance behind the vehicle, monitoring traffic and managing the warning cone placement — both in high-visibility vests',
          scene_camera:  'crouching at the wheel arch level, framing the raised wheel gap and the spare tyre being aligned with the hub — Worker 2 visible in the background at roadside, not in the traffic lane',
          scene_framing: {
            work_pct:   70,
            foreground: 'spare wheel being aligned with the hub, lug wrench on the ground beside it',
            midground:  'hydraulic jack under the vehicle sill, vehicle body raised — gap clearly visible',
            background: 'flat tyre leaning against the car body, Worker 2 in high-visibility vest lateral to the vehicle on the pavement side',
          },
          scene_debris:  'wheel nuts grouped on the ground beside the removed tyre, gravel disturbed around the jack base',
          scene_exclude: ['jump cables', 'battery booster', 'tow strap', 'door wedge', 'bonnet open', 'compressor or pressure gauge placed beside tyre with no active repair', 'equipment arranged for a photo', 'worker lying under the vehicle supported only by a small jack', 'person under the vehicle', 'Worker 2 standing in front of the vehicle', 'Worker 2 in the traffic lane', 'Worker 2 beneath the jacked sill or in the wheel gap zone'],
          tools: [
            'hydraulic jack raised under the vehicle sill',
            'lug wrench on the ground beside the spare wheel',
            'spare wheel positioned against the hub ready to mount',
            'torque socket beside the spare on the ground',
          ],
          protections: [
            'reflective safety vest on Worker 1 at the wheel arch',
            'reflective safety vest on Worker 2 at the lateral roadside position',
            'warning cone placed on the road behind the vehicle',
          ],
          chantier_details: [
            'flat tyre leaning against the car body beside the open wheel arch',
            'wheel nuts grouped on the ground near the spare',
            'jack raised with the wheel gap clearly visible',
            'warning triangle placed further back on the road',
            'Worker 2 visible in high-visibility vest at a safe lateral distance, outside the traffic lane',
          ],
        },
        {
          scene_note:    'tyre puncture plug repair — tyre still mounted on the vehicle, plug reamer inserted in the puncture hole, no wheel removal needed',
          scene_camera:  'crouching low at the tyre sidewall, framing the plug reamer inserted in the tread puncture, repair kit open on the ground',
          scene_framing: {
            work_pct:   70,
            foreground: 'plug reamer tool in the tread puncture, plug strip and cement tube beside the tyre',
            midground:  'tyre sidewall and lower wheel arch, no jack visible',
            background: 'road surface and vehicle bodywork beyond',
          },
          scene_debris:  'small nail or screw on the ground near the tyre — the puncture cause just extracted',
          scene_exclude: ['hydraulic jack', 'spare tyre', 'wheel removed from car', 'jump cables', 'door wedge', 'tow strap', 'equipment staged for a photo without plug reamer in tyre tread'],
          tools: [
            'plug reamer tool inserted in the tread puncture',
            'plug strip beside the tyre on the ground',
            'portable tyre inflator on the ground near the wheel',
          ],
          protections: [
            'reflective vest near the wheel',
            'warning triangle on the road behind the vehicle',
          ],
          chantier_details: [
            'small nail or screw beside the tyre — the puncture cause',
            'plug strip partially inserted in the tyre tread',
            'portable compressor inflating the tyre after repair',
          ],
        },
        {
          scene_note:    'wheel change mid-point — flat tyre removed, spare not yet fitted, vehicle raised on jack, wheel hub exposed',
          scene_camera:  'crouching at the open wheel arch, framing the bare hub and the spare wheel on the ground ready to mount',
          scene_framing: {
            work_pct:   65,
            foreground: 'exposed wheel hub with lug bolt threads visible, spare wheel on the ground beside it',
            midground:  'vehicle body raised on the hydraulic jack, sill clearance visible',
            background: 'flat tyre against the car door, road surface beyond',
          },
          scene_debris:  'wheel nuts arranged beside the spare, gravel around the jack foot',
          scene_exclude: ['wheel already fitted', 'jump cables', 'battery booster', 'door wedge', 'tow strap', 'compressor or pressure gauge beside tyre', 'equipment arranged for a photo'],
          tools: [
            'hydraulic jack under the sill, vehicle raised',
            'spare wheel on the ground beside the bare hub',
            'lug wrench on the ground beside the spare',
          ],
          protections: [
            'reflective warning triangle on the road behind the vehicle',
            'reflective vest folded on the bonnet',
          ],
          chantier_details: [
            'hub exposed with lug bolt threads — no wheel fitted yet',
            'spare wheel on the ground, angled ready to align with the hub',
            'flat tyre leaning against the car beside the wheel arch',
            'wheel nuts arranged near the spare',
          ],
        },
        {
          scene_note:    'flat tyre initial assessment — tyre visibly deflated against the road, nail or screw still in the tread. Main subject is the flat tyre profile, not any equipment. No compressor, inflator, or pressure gauge present. No repair tool deployed.',
          scene_camera:  'crouching close beside the flat tyre at road level, framing the deflated tyre profile and the puncture cause in the tread',
          scene_framing: {
            work_pct:   65,
            foreground: 'flat tyre against the road surface — tyre visibly deflated and squashed, small nail or screw visible in the tread center',
            midground:  'wheel arch above, vehicle body panel behind the tyre',
            background: 'road surface extending away, kerbside or verge beyond',
          },
          scene_debris:  'small nail or screw visible in the tread — puncture cause not yet removed',
          scene_exclude: ['hydraulic jack', 'spare tyre', 'lug wrench', 'jump cables', 'tow strap', 'door wedge', 'compressor or inflator near the flat tyre', 'pressure gauge as main visual subject', 'equipment staged for a photo'],
          tools: [
            'warning triangle placed on the road behind the vehicle',
          ],
          protections: [
            'reflective safety vest on the car roof',
            'warning triangle on the road behind the vehicle',
          ],
          chantier_details: [
            'tyre profile completely flat against the road surface',
            'nail or screw clearly visible in the tyre tread',
            'small oil mark under the tyre from the road surface contact',
          ],
        },
        {
          scene_note:    'hydraulic jack positioning — jack being placed under the vehicle sill point, wheel still on the ground before lifting',
          scene_camera:  'crouching at the sill level, framing the jack being slid into position under the jacking point — wheel still ground-level',
          scene_framing: {
            work_pct:   65,
            foreground: 'hydraulic jack being positioned under the vehicle sill, contact point visible',
            midground:  'vehicle sill and lower door panel, flat tyre still on the road',
            background: 'road surface, verge or kerbside behind the vehicle',
          },
          scene_debris:  'small stone moved aside from the jack foot position, lug wrench on the ground nearby',
          scene_exclude: ['vehicle raised off the ground', 'spare tyre fitted', 'jump cables', 'tow strap', 'door wedge', 'compressor or pressure gauge near the tyre', 'equipment arranged for a photo'],
          tools: [
            'hydraulic jack being slid under the sill jacking point',
            'lug wrench on the ground near the wheel — not yet in use',
          ],
          protections: [
            'reflective safety vest near the wheel',
            'warning cone placed on the road behind the vehicle',
          ],
          chantier_details: [
            'jack saddle contacting the sill reinforcement point — not yet pumped',
            'flat tyre still full contact with the road surface',
            'small stone cleared from under the jack foot',
          ],
        },
        {
          scene_note:    'lug nuts loosening — cross wrench on wheel nut, wheel still on the road surface, loosening before lifting',
          scene_camera:  'crouching at the wheel, framing the cross wrench on the wheel nut, tyre still flat on the ground',
          scene_framing: {
            work_pct:   65,
            foreground: 'cross wrench engaged on a wheel nut, tyre flat on the road, wrench handle horizontal',
            midground:  'remaining wheel nuts on the wheel, jack placed nearby but not yet pumped',
            background: 'road surface, vehicle body panel, verge beyond',
          },
          scene_debris:  'wheel nut already removed resting on the road near the tyre',
          scene_exclude: ['vehicle lifted off ground', 'wheel removed', 'spare tyre', 'jump cables', 'tow strap', 'compressor or pressure gauge near the tyre', 'equipment arranged for a photo'],
          tools: [
            'cross lug wrench engaged on a wheel nut',
            'hydraulic jack placed under the sill ready to pump',
          ],
          protections: [
            'reflective safety vest on the car roof',
            'warning cone on the road behind the vehicle',
          ],
          chantier_details: [
            'cross wrench on the wheel nut with tyre still flat on the road',
            'one nut already removed and placed on the road beside the tyre',
            'jack positioned under the sill ready to lift after all nuts loosened',
          ],
        },
        {
          scene_note:    'tyre pressure check after plug repair — pressure gauge on valve stem, portable compressor inflating the tyre',
          scene_camera:  'crouching close at the tyre valve, framing the pressure gauge locked onto the valve and the compressor hose running to it',
          scene_framing: {
            work_pct:   70,
            foreground: 'tyre pressure gauge locked on the valve stem, compressor hose connected',
            midground:  'tyre now inflated and round — visibly firmer than before',
            background: 'portable compressor on the ground near the wheel, road surface beyond',
          },
          scene_debris:  'plug tool on the ground near the tyre, small piece of plug strip beside it',
          scene_exclude: ['hydraulic jack', 'spare tyre', 'removed wheel', 'jump cables', 'tow strap'],
          tools: [
            'tyre pressure gauge locked on the valve stem',
            'portable compressor hose running to the valve',
            'plug tool on the ground near the tyre',
          ],
          protections: [
            'reflective vest near the wheel',
            'warning triangle on the road behind the vehicle',
          ],
          chantier_details: [
            'pressure gauge showing bar or PSI reading on the valve',
            'tyre now round and firm — visibly re-inflated after plug repair',
            'portable compressor on the ground with cord running to the valve hose',
          ],
        },
        {
          scene_note:    'spare wheel retrieved from the boot — spare being lifted out of the boot floor well, still at the boot opening',
          scene_camera:  'standing at the open boot, framing the spare wheel being lifted from its well in the boot floor',
          scene_framing: {
            work_pct:   55,
            foreground: 'spare wheel being lifted from the boot floor well, foam insert removed beside it',
            midground:  'open boot floor, toolkit bag and emergency triangle stored beside the well',
            background: 'boot opening, car bodywork, road or outdoor surface',
          },
          scene_debris:  'foam insert or cardboard boot cover removed and leaning against the car bumper',
          scene_exclude: ['wheel on the car', 'jack in use', 'jump cables', 'tow strap', 'door wedge', 'compressor or pressure gauge', 'equipment staged for a photo'],
          tools: [
            'spare wheel being lifted from the boot floor well',
            'wheel brace and jack kit beside the spare in the boot',
          ],
          protections: [
            'warning triangle still folded, visible in the boot kit',
          ],
          chantier_details: [
            'boot floor open, spare wheel well visible',
            'foam boot insert set aside against the bumper',
            'jack and brace kit visible beside the spare in the well',
          ],
        },
        {
          scene_note:    'roadside safety setup — warning triangle being placed on the road before tyre change begins, vehicle with hazard lights implied',
          scene_camera:  'standing on the road behind the vehicle, framing the warning triangle being positioned at distance',
          scene_framing: {
            work_pct:   40,
            foreground: 'warning triangle being placed on the road surface, reflective panels catching the light',
            midground:  'stalled vehicle with flat tyre visible in the distance ahead',
            background: 'road continuing beyond, verge or kerbside, open sky',
          },
          scene_debris:  'gravel or road dirt disturbed at the triangle position',
          scene_exclude: ['jack in use', 'wheel removed', 'lug wrench on wheel', 'jump cables', 'tow strap', 'compressor or pressure gauge near the tyre', 'equipment arranged for a photo'],
          tools: [
            'warning triangle being placed on the road surface',
            'reflective safety vest on the car roof visible in the background',
          ],
          protections: [
            'warning triangle placed at recommended distance behind the vehicle',
          ],
          chantier_details: [
            'warning triangle reflectors catching the light at road level',
            'stalled vehicle with flat tyre visible ahead at distance',
            'road markings visible either side of the triangle position',
          ],
        },
        {
          scene_note:    'post-change verification — spare fitted and torqued, old flat tyre being lifted into the boot, tools being gathered',
          scene_camera:  'standing back from the car, framing the newly fitted spare and the flat tyre being loaded into the boot',
          scene_framing: {
            work_pct:   50,
            foreground: 'flat tyre being carried to the open boot, spare clearly fitted on the car',
            midground:  'open boot ready to receive the flat tyre and tools',
            background: 'road or outdoor surface, vehicle rear and the road ahead',
          },
          scene_debris:  'lug wrench and jack being placed into the boot beside the old flat tyre',
          scene_exclude: ['jack still under car', 'wheel gap at sill', 'jump cables', 'tow strap', 'door wedge', 'compressor or pressure gauge near the tyre', 'equipment arranged for a photo'],
          tools: [
            'flat tyre being carried to the open boot',
            'lug wrench and jack being packed away beside it',
          ],
          protections: [
            'reflective safety vest being folded ready to stow',
            'warning triangle about to be retrieved from the road',
          ],
          chantier_details: [
            'spare wheel clearly fitted on the car — visibly rounder and firmer than the flat',
            'flat tyre being lifted into the boot floor well',
            'tools being loaded — jack and lug wrench into the boot kit bag',
          ],
        },
      ],
      scene_note: 'roadside breakdown — flat tyre, tyre change in progress beside a stalled vehicle',
      tools: [
        'hydraulic jack positioned under the vehicle sill point',
        'lug wrench on the ground beside the wheel',
        'spare wheel resting upright against the car body',
        'torque socket resting on the ground near the wheel',
      ],
      protections: [
        'reflective safety vest folded on the car roof',
        'warning cone placed on the road behind the vehicle',
      ],
      chantier_details: [
        'flat tyre leaning against the car body near the wheel arch',
        'wheel nuts grouped on the ground beside the removed tyre',
        'gravel disturbed beside the jack point',
        'empty tyre pressure gauge on the ground near the spare',
        'reflective warning triangle placed further back on the road',
      ],
    },

    remorquage: {
      scenarios: [
        {
          scene_note:    'vehicle recovery by flatbed lorry — Worker 1 operating the winch or ramp controls from the rear of the flatbed; Worker 2 guiding the stalled car from a lateral safe position, hand signals visible, standing well clear of the winch cable trajectory and the vehicle path',
          scene_camera:  'standing at the rear of the flatbed lorry, framing the lowered ramp and the stalled car at the base or mid-ramp — Worker 2 visible laterally on the pavement side',
          scene_framing: {
            work_pct:   65,
            foreground: 'flatbed ramp lowered to road level, winch cable or tyre strap visible on the ramp edge',
            midground:  'stalled vehicle on or approaching the ramp, Worker 1 at the winch controls',
            background: 'Worker 2 in high-visibility vest at a lateral safe position outside the winch cable line, road on either side',
          },
          scene_debris:  'wheel chock block on the deck near the car tyre, ratchet strap laid out on the ramp edge',
          scene_exclude: ['tow strap between two cars on flat road', 'jump cables', 'battery booster', 'door wedge', 'spare tyre', 'operator standing in front of the vehicle during winch cable tensioning', 'worker in the winch line trajectory', 'Worker 2 in front of the vehicle during winch cable tensioning', 'Worker 2 in the winch cable trajectory or between vehicles'],
          tools: [
            'ratchet strap laid on the flatbed deck near the car wheel',
            'wheel chock placed in front of the loaded car tyre',
            'winch hook visible at the vehicle tow point under the bumper',
          ],
          protections: [
            'reflective safety vest on Worker 1 at the winch controls',
            'reflective safety vest on Worker 2 at the lateral guide position',
            'warning cone placed on the road behind the flatbed',
          ],
          chantier_details: [
            'flatbed ramp lowered and touching the road surface',
            'ratchet strap ready to secure the car on the deck',
            'wheel chock visible near the car front tyre on the deck',
            'Worker 2 visible in high-visibility vest at a lateral safe position, guiding by hand signal — outside winch cable trajectory',
          ],
        },
        {
          scene_note:    'vehicle tow by strap — tow strap stretched between the stalled car and the recovery vehicle, both stationary before towing begins',
          scene_camera:  'low angle from the side, framing the tow strap running at ground level between the two bumpers',
          scene_framing: {
            work_pct:   60,
            foreground: 'tow strap on the road between the bumpers, hook visible at each attachment point',
            midground:  'rear of the recovery vehicle and front of the stalled car',
            background: 'road, kerbside vegetation or markings beyond',
          },
          scene_debris:  'tow strap carry bag on the ground near the stalled car bumper',
          scene_exclude: ['flatbed lorry ramp', 'winch on deck', 'jump cables', 'battery booster', 'door wedge', 'spare tyre'],
          tools: [
            'tow strap stretched between recovery vehicle and stalled car',
            'tow hook at the stalled car front recovery point',
            'torch on the ground near the attachment',
          ],
          protections: [
            'reflective safety vest on the operator',
            'warning triangle placed behind the stalled car',
          ],
          chantier_details: [
            'tow strap lying taut at low angle between the bumpers',
            'tow hook loop visible at the recovery point',
            'warning triangle on the road surface behind the stalled car',
          ],
        },
        {
          scene_note:    'off-road vehicle extraction — car stuck in a ditch or on verge, snatch strap or winch cable being attached for recovery',
          scene_camera:  'standing at the ditch edge, framing the stuck vehicle at an angle in the ditch and the extraction strap being connected',
          scene_framing: {
            work_pct:   65,
            foreground: 'snatch strap or winch cable running to the stuck car front tow point',
            midground:  'stuck car at an angle in the ditch or on uneven verge — one or two wheels off-level',
            background: 'grass verge, ditch edge, or rough ground beyond the stuck vehicle',
          },
          scene_debris:  'mud and displaced grass at the stuck wheel positions',
          scene_exclude: ['flatbed ramp', 'tow strap on flat road', 'jump cables', 'door wedge', 'spare tyre'],
          tools: [
            'snatch strap looped around the stuck car tow hook',
            'recovery shackle at the strap attachment point',
            'torch on the grass near the stuck car',
          ],
          protections: [
            'reflective safety vest on the operator',
            'warning triangle on the road edge above the ditch',
          ],
          chantier_details: [
            'car leaning at angle in the ditch or on the verge',
            'mud marks on the bodywork from the ditch contact',
            'snatch strap taut between the two vehicles',
            'displaced earth and grass at the stuck wheel positions',
          ],
        },
        {
          scene_note:    'winch cable attachment — steel winch cable from the recovery truck being hooked to the stalled car front recovery point',
          scene_camera:  'low angle at bumper level, framing the winch cable hook being attached to the recovery point under the front bumper',
          scene_framing: {
            work_pct:   70,
            foreground: 'steel winch cable with hook at the front recovery point under the bumper — hook engaged',
            midground:  'front bumper and underside of the car, recovery truck cable running taut toward it',
            background: 'road surface, recovery truck at the far end of the cable',
          },
          scene_debris:  'recovery point plastic cap removed and on the ground near the bumper',
          scene_exclude: ['tow strap between bumpers', 'flatbed ramp', 'jump cables', 'spare tyre', 'door wedge'],
          tools: [
            'steel winch cable with hook engaged at the front recovery point',
            'recovery shackle at the hook attachment',
          ],
          protections: [
            'reflective safety vest near the scene',
            'warning cone on the road behind the stalled vehicle',
          ],
          chantier_details: [
            'winch cable taut between recovery truck and stalled car front',
            'recovery point visible under the bumper with hook attached',
            'plastic tow eye cover removed and on the road nearby',
          ],
        },
        {
          scene_note:    'wheel dolly positioning — wheel dolly being slid under the front driven wheel before flatbed loading',
          scene_camera:  'crouching at the front wheel, framing the wheel dolly being manoeuvred under the tyre',
          scene_framing: {
            work_pct:   65,
            foreground: 'wheel dolly being slid under the front tyre, tyre resting in the dolly cup',
            midground:  'front wheel arch and lower bumper, car at ground level',
            background: 'road surface, flatbed truck visible behind the stalled car',
          },
          scene_debris:  'dolly carry straps on the road near the front wheel',
          scene_exclude: ['car already on flatbed', 'tow strap between cars', 'jump cables', 'spare tyre', 'door wedge'],
          tools: [
            'wheel dolly being positioned under the front tyre',
            'low-profile guide handle for pushing the dolly into place',
          ],
          protections: [
            'reflective vest near the scene',
            'warning cone on the road behind the vehicle',
          ],
          chantier_details: [
            'wheel dolly cup visible under the tyre — engaged and loaded',
            'carry straps on the road near the front wheel',
            'flatbed truck visible behind the stalled car',
          ],
        },
        {
          scene_note:    'vehicle secured on flatbed — ratchet straps being cranked tight over the car tyres on the deck, ready for transport',
          scene_camera:  'standing on the flatbed deck, framing the ratchet strap being tightened over the car tyre',
          scene_framing: {
            work_pct:   65,
            foreground: 'ratchet strap being cranked over the car tyre on the flatbed deck',
            midground:  'car on the deck, wheel chock beside the tyre',
            background: 'flatbed ramp in its raised position, road visible behind',
          },
          scene_debris:  'unused strap length hanging from the ratchet head beside the tyre',
          scene_exclude: ['car driving up ramp', 'tow strap between two cars on flat road', 'jump cables', 'spare tyre', 'door wedge'],
          tools: [
            'ratchet strap cranked over the car tyre on the deck',
            'wheel chock placed against the tyre to prevent rolling',
          ],
          protections: [
            'reflective vest on the recovery operator on the flatbed deck',
          ],
          chantier_details: [
            'ratchet handle being cranked — strap tightening over the car tyre',
            'wheel chock wedged against the tyre face on the deck',
            'flatbed ramp raised behind the loaded car',
          ],
        },
        {
          scene_note:    'pre-tow underside inspection — low angle view under the stalled car checking for damage or fluid loss before recovery',
          scene_camera:  'ground-level view looking under the car front, framing the underside — subframe, exhaust, and bumper edge visible',
          scene_framing: {
            work_pct:   55,
            foreground: 'car underside at ground level — subframe, exhaust pipe, and lower bumper edge',
            midground:  'road surface under the car, fluid mark or damage visible',
            background: 'road behind the car, recovery vehicle at distance',
          },
          scene_debris:  'oil spot or fluid drip on the road surface under the engine',
          scene_exclude: ['cable attached to car', 'flatbed ramp active', 'spare tyre', 'jump cables', 'door wedge'],
          tools: [
            'torch directed under the car to inspect the underside',
          ],
          protections: [
            'warning triangle on the road behind the vehicle',
          ],
          chantier_details: [
            'car underside visible — subframe, exhaust pipe, and bumper edge',
            'oil or fluid drip mark on the road surface under the engine bay',
            'torch beam illuminating the underside from the front',
          ],
        },
        {
          scene_note:    'night vehicle recovery — amber beacon lights on the recovery truck, reflective warning cones and vest visible in the dark',
          scene_camera:  'wider angle from the roadside, framing the recovery truck with amber beacons flashing beside the stalled car at night',
          scene_framing: {
            work_pct:   50,
            foreground: 'amber beacon light on the recovery truck roof bar, reflective cone on the road',
            midground:  'stalled car with hazard lights implied, cable or strap visible between vehicles',
            background: 'dark road, vehicle reflections and headlight beams on the dark surface',
          },
          scene_debris:  'amber light reflection on the road surface near the recovery truck',
          scene_exclude: ['daytime conditions', 'spare tyre', 'jump cables', 'door wedge'],
          tools: [
            'amber beacon bar on the recovery truck roof — lights active',
            'reflective warning cones on both sides of the scene',
          ],
          protections: [
            'reflective safety vest clearly visible in the amber light',
            'warning cones with reflective bands on both sides of the scene',
          ],
          chantier_details: [
            'amber beacon light flashing on the recovery truck roof bar',
            'amber light reflected on the dark road surface',
            'reflective vest and cones bright against the dark background',
          ],
        },
        {
          scene_note:    'pre-recovery condition documentation — vehicle condition being noted on a clipboard beside the stalled car',
          scene_camera:  'standing at the side of the stalled car, framing the clipboard with a condition form beside the vehicle bodywork',
          scene_framing: {
            work_pct:   45,
            foreground: 'clipboard with a vehicle condition record being filled in, pen at the page',
            midground:  'stalled car bodywork — relevant damage area visible alongside the clipboard',
            background: 'road or outdoor area, recovery vehicle at distance',
          },
          scene_debris:  'key on the car roof near the clipboard — car unmoved',
          scene_exclude: ['cable attached to car', 'ramp active', 'spare tyre', 'jump cables', 'door wedge'],
          tools: [
            'clipboard with pre-recovery condition form being filled in',
            'torch resting on the car roof near the area being documented',
          ],
          protections: [
            'reflective safety vest near the car',
            'warning triangle visible on the road behind the vehicle',
          ],
          chantier_details: [
            'clipboard with condition record at the side of the car',
            'pen marking damage positions on the form',
            'car bodywork detail visible behind the clipboard',
          ],
        },
        {
          scene_note:    'vehicle fully loaded and secured — flatbed ramp raised, straps tight over all four tyres, ready for transport',
          scene_camera:  'standing behind the flatbed, framing the loaded car on the deck with the raised ramp and secured straps',
          scene_framing: {
            work_pct:   50,
            foreground: 'raised flatbed ramp, ratchet strap ends secured, car roof visible above the deck',
            midground:  'car on the flatbed deck — all strapped, wheel chocks in place',
            background: 'flatbed cab visible ahead, road clear for departure',
          },
          scene_debris:  'strap excess neatly tied off on the deck edge',
          scene_exclude: ['car driving up ramp', 'tow strap between two cars', 'jump cables', 'spare tyre', 'door wedge'],
          tools: [
            'ratchet straps over each tyre — fully tightened',
            'wheel chocks wedged against all tyres on the deck',
          ],
          protections: [
            'amber beacon bar on the truck roof — ready for road',
          ],
          chantier_details: [
            'car fully loaded and level on the flatbed deck',
            'ratchet straps taut over all four tyres',
            'ramp raised flat under the car — road visible behind the truck',
          ],
        },
      ],
      scene_note: 'roadside recovery — vehicle being prepared for towing, tow strap or hook attached',
      tools: [
        'tow strap laid out on the ground between the two vehicles',
        'tow hook attached to the recovery point under the front bumper',
        'torch resting on the ground near the attachment point',
        'wheel dolly placed under the driven wheel',
      ],
      protections: [
        'reflective safety vest on the technician or car roof',
        'warning cone placed on the road behind the stalled vehicle',
      ],
      chantier_details: [
        'tow strap running between the two vehicles at low angle',
        'recovery hook visible under the stalled vehicle front bumper',
        'wheel dolly under one tyre ready for transport',
        'warning triangle further back on the road',
        'open recovery van doors visible in the background',
      ],
    },

    ouverture: {
      scenarios: [
        {
          scene_note:    'vehicle lockout — plastic wedge inserted at the top door corner, long-reach rod passed through the gap toward the interior lock',
          scene_camera:  'standing beside the car door, close view of the top door corner — wedge visible in the gap, rod entering through it',
          scene_framing: {
            work_pct:   70,
            foreground: 'plastic wedge in the door frame corner, thin long-reach rod visible through the narrow gap',
            midground:  'door panel and window glass, car roof above',
            background: 'car interior dimly visible through the window, road or parking surface beyond',
          },
          scene_debris:  'protective film strip on the door frame paint at the wedge contact point',
          scene_exclude: ['jump cables', 'hydraulic jack', 'spare tyre', 'tow strap', 'battery booster'],
          tools: [
            'plastic door wedge in the top door frame corner',
            'long-reach rod visible through the door gap',
            'protective film strip on the door frame at wedge contact',
          ],
          protections: [
            'protective film on the door frame paint at the wedge contact point',
            'reflective vest folded on the car roof',
          ],
          chantier_details: [
            'narrow door gap at the top corner where wedge is inserted',
            'rod tip visible inside the car approaching the lock',
            'keys or key fob visible inside through the window',
          ],
        },
        {
          scene_note:    'vehicle lockout — inflatable air wedge pumped to widen the door frame gap, giving access for a reach tool to the interior controls',
          scene_camera:  'standing beside the car door, framing the air wedge at the door edge and the rubber pump bulb in hand',
          scene_framing: {
            work_pct:   70,
            foreground: 'inflatable air wedge at the door edge, rubber pump bulb connected by a thin tube',
            midground:  'car door and window, vehicle bodywork',
            background: 'car interior through the window, outdoor setting beyond',
          },
          scene_debris:  'tool carry case open on the ground near the car door',
          scene_exclude: ['jump cables', 'hydraulic jack', 'spare tyre', 'tow strap', 'battery booster'],
          tools: [
            'inflatable air wedge at the door edge frame',
            'rubber hand pump connected to the air wedge by thin tube',
            'protective film on the door frame at the wedge contact point',
          ],
          protections: [
            'protective film on the door frame edge at the wedge point',
            'reflective vest on the car roof',
          ],
          chantier_details: [
            'air wedge visibly inflated creating a gap at the door edge',
            'pump tube running from the wedge to the rubber bulb',
            'keys visible inside the car through the window',
          ],
        },
        {
          scene_note:    'vehicle lockout — keys clearly visible inside the car on the seat or dashboard, hooked slim-jim rod working through a minimal door gap',
          scene_camera:  'close shot framing the car window glass, key fob visible inside — hooked rod barely visible at the door edge',
          scene_framing: {
            work_pct:   65,
            foreground: 'car window glass with key fob or keys visible on the seat inside, hooked rod at door edge',
            midground:  'door panel and lock strip',
            background: 'car interior through the far window, road or parking area beyond',
          },
          scene_debris:  'protective silicone mat on the door sill at the tool entry point',
          scene_exclude: ['jump cables', 'hydraulic jack', 'spare tyre', 'tow strap', 'battery booster'],
          tools: [
            'hooked slim-jim rod at the narrow door edge gap',
            'plastic door wedge holding the gap open at the corner',
            'protective silicone mat on the door sill',
          ],
          protections: [
            'protective silicone mat at the tool contact point',
            'reflective vest on the car roof',
          ],
          chantier_details: [
            'keys or key fob visible through the window on the seat',
            'hooked rod tip approaching the interior lock through the gap',
            'door gap barely 5 mm — held by the wedge',
          ],
        },
        {
          scene_note:    'lockout tool kit assessment — specialist tools laid out on the bonnet or ground before starting, selecting the right approach',
          scene_camera:  'standing at the side of the car, framing the tools spread out on the bonnet or a protective mat',
          scene_framing: {
            work_pct:   50,
            foreground: 'assorted door opening tools laid out on a protective mat on the bonnet — wedges, rods, and air pump',
            midground:  'car bonnet surface and door panel beside',
            background: 'road or parking area, vehicle interior through the window',
          },
          scene_debris:  'tool carry case open on the ground beside the car, foam inserts visible',
          scene_exclude: ['jump cables', 'hydraulic jack', 'spare tyre', 'tow strap'],
          tools: [
            'assorted plastic and metal door wedges laid out on a protective mat',
            'long-reach rods of different lengths beside the wedges',
            'air wedge pump and tube on the mat',
            'protective film strips beside the tools',
          ],
          protections: [
            'reflective vest on the car roof',
          ],
          chantier_details: [
            'tools laid out in order of use on the protective mat',
            'tool carry case with foam inserts open on the ground',
            'keys or key fob visible inside the car through the window',
          ],
        },
        {
          scene_note:    'door gap pre-assessment — testing the door frame flexibility with a thin wedge at the corner before committing to the full opening approach',
          scene_camera:  'close view at the top door corner, framing the thin test wedge being tapped lightly into the gap',
          scene_framing: {
            work_pct:   70,
            foreground: 'thin feeler or test wedge being placed gently at the top door corner — no significant gap yet',
            midground:  'door frame and window glass, car roof above',
            background: 'road or parking area, car interior dimly visible',
          },
          scene_debris:  'protective film strip being peeled ready to apply to the door frame',
          scene_exclude: ['jump cables', 'hydraulic jack', 'spare tyre', 'tow strap'],
          tools: [
            'thin test wedge being placed at the door frame top corner',
            'protective film strip being peeled ready for application',
          ],
          protections: [
            'protective film on the adjacent door frame area',
          ],
          chantier_details: [
            'thin wedge barely inserted at the corner — pre-assessment only',
            'door frame undisturbed, paint protection film being prepared',
            'keys visible inside through the window',
          ],
        },
        {
          scene_note:    'two-wedge setup — second wedge added lower on the door frame to widen the gap further for longer rod access',
          scene_camera:  'standing back slightly, framing both wedges visible in the door frame — one at the top corner, one lower on the frame',
          scene_framing: {
            work_pct:   70,
            foreground: 'two plastic wedges visible in the door frame at different heights, door gap widened between them',
            midground:  'door panel and window glass, rod entering through the larger gap',
            background: 'car interior visible, road or parking area beyond',
          },
          scene_debris:  'protective film strip at both wedge contact points on the door paint',
          scene_exclude: ['jump cables', 'hydraulic jack', 'spare tyre', 'tow strap', 'air pump wedge'],
          tools: [
            'two plastic wedges in the door frame — one at top corner, one lower',
            'long-reach rod through the widened gap',
            'protective film at both wedge contact points',
          ],
          protections: [
            'protective film at both wedge positions on the door frame paint',
          ],
          chantier_details: [
            'two wedges in the door frame creating a wider working gap',
            'long-reach rod visible through the gap, more room to manoeuvre',
            'protective film preventing paint damage at both wedge points',
          ],
        },
        {
          scene_note:    'rear door lockout — tools applied to the rear door frame rather than the front, giving access to the rear interior lock mechanism',
          scene_camera:  'standing beside the rear door, close view of the wedge and rod at the rear door top corner',
          scene_framing: {
            work_pct:   70,
            foreground: 'wedge in the rear door frame top corner, long rod visible through the gap',
            midground:  'rear door panel and rear window glass',
            background: 'rear interior visible through the glass, road or parking area beyond',
          },
          scene_debris:  'protective film strip at the wedge contact point on the rear door frame',
          scene_exclude: ['front door tools', 'jump cables', 'hydraulic jack', 'spare tyre', 'tow strap'],
          tools: [
            'plastic wedge in the rear door frame top corner',
            'long-reach rod visible entering through the rear door gap',
          ],
          protections: [
            'protective film at the wedge contact point on the rear door frame',
          ],
          chantier_details: [
            'rear door wedge and gap — working from the rear instead of the front',
            'rod tip approaching the rear interior door lock mechanism',
            'rear window glass showing the interior of the back seat',
          ],
        },
        {
          scene_note:    'interior door handle reach — hooked rod extended through the door gap, angled toward the interior door handle mechanism',
          scene_camera:  'close view through the window glass, framing the hooked rod tip approaching the interior door handle',
          scene_framing: {
            work_pct:   75,
            foreground: 'hooked rod tip visible close to the interior door handle through the glass and gap',
            midground:  'interior door trim, door handle lever, and arm rest',
            background: 'car interior, seat visible beyond',
          },
          scene_debris:  'protective film at the door frame entry point for the rod',
          scene_exclude: ['jump cables', 'hydraulic jack', 'spare tyre', 'tow strap'],
          tools: [
            'hooked long-reach rod with tip angled toward the interior door handle',
            'wedge holding the door gap open at the frame top',
          ],
          protections: [
            'protective film at the rod entry point on the door frame',
          ],
          chantier_details: [
            'rod tip visibly close to the interior door handle lever through the window',
            'door handle mechanism visible in the car interior panel',
            'door gap held by the wedge while rod manoeuvres toward the handle',
          ],
        },
        {
          scene_note:    'full-jamb protection setup — protective film applied along the entire door frame edge before inserting any tools, preventing all paint damage',
          scene_camera:  'standing at the door, framing the protective film strip applied along the full length of the door frame edge',
          scene_framing: {
            work_pct:   60,
            foreground: 'protective film strip applied along the full height of the door frame edge, no tools inserted yet',
            midground:  'door panel and window glass beside the protected edge',
            background: 'road or parking area, vehicle interior visible',
          },
          scene_debris:  'film backing paper peel on the ground near the door',
          scene_exclude: ['jump cables', 'hydraulic jack', 'spare tyre', 'tow strap', 'wedge inserted'],
          tools: [
            'protective film strip applied along the full door frame edge',
            'roller or finger pressing the film flat to the frame paint',
          ],
          protections: [
            'full-length protective film on the door frame — paint fully protected',
          ],
          chantier_details: [
            'protective film covering the full door frame edge top to bottom',
            'film backing paper beside the door on the ground',
            'door frame paint fully protected — film applied before any tool entry',
          ],
        },
        {
          scene_note:    'lockout complete — car door open, keys retrieved, door being checked from outside before closing',
          scene_camera:  'standing at the open car door, framing the open interior and the keys visible in the lock or held near the door',
          scene_framing: {
            work_pct:   45,
            foreground: 'car door open wide, interior visible, key in the ignition or on the seat',
            midground:  'door frame and window, now fully open — no tools in the gap',
            background: 'road or parking area, tools being gathered on the ground',
          },
          scene_debris:  'protective film strip removed and on the ground near the door, tool carry case open',
          scene_exclude: ['jump cables', 'hydraulic jack', 'spare tyre', 'tow strap', 'wedge in frame'],
          tools: [
            'door fully open — keys on the seat or in the ignition visible',
            'tools being placed back into the carry case on the ground',
          ],
          protections: [],
          chantier_details: [
            'car door fully open — lockout resolved',
            'keys visible on the seat or dashboard inside',
            'protective film strip removed and on the ground near the door',
          ],
        },
      ],
      scene_note: 'roadside lockout — vehicle door opening in progress, technician working at the door frame with specialist tools',
      tools: [
        'plastic door wedge inserted at the top corner of the door frame',
        'long-reach rod visible through the door gap near the lock mechanism',
        'air wedge pump resting on the ground beside the door',
        'protective film strip on the door frame edge at the wedge contact point',
      ],
      protections: [
        'reflective safety vest on the technician or car roof',
      ],
      chantier_details: [
        'door gap visible at the top corner where the wedge is inserted',
        'protective film on the door frame edge preventing scratch marks',
        'air pump tube running to the wedge between door and frame',
        'keys or key fob visible inside the car through the window',
        'technician equipment bag on the ground near the rear door',
      ],
    },

    default: {
      tools: [
        'reflective warning triangle placed on the ground behind the vehicle',
        'torch or flashlight resting on the wheel arch',
        'tool bag open on the ground near the front tyre',
      ],
      protections: [
        'reflective safety vest folded on the car roof or bonnet',
        'warning cone placed on the road behind the vehicle',
      ],
      chantier_details: [
        'bonnet propped open or door open beside the vehicle',
        'oil mark on the ground beneath the engine bay',
        'warning triangle casting a shadow on the road behind the car',
        'gravel disturbed beside the parking spot near the work area',
        'empty product container on the ground near the front wheel',
      ],
    },
  },

};
