/**
 * roof-waterproofing-gutter-contracts.js
 * Source canonique unique pour le cluster toiture / étanchéité / gouttières.
 *
 * Couverture : 4 métiers catalogue, 39 services, 19 contrats visuels.
 * Tests no-cost : src/image-generation/debug/roof-waterproofing-gutter-contracts-tests.js
 * Réexport documentaire : docs/roof-waterproofing-gutter-contracts.js
 * Aucun impact pipeline de production — pas importé dans services/index.js ni SITE_REALISM.
 *
 * ─── Groupes visuels ──────────────────────────────────────────────────────────
 * R01 renovation_toiture        — Rénovation toiture complète, Couverture neuve, Réfection toiture
 * R02 reparation_toiture        — Réparation toiture
 * R03 remplacement_tuiles       — Remplacement tuiles, Remplacement ardoises
 * R04 charpente_combles         — Charpente, Isolation combles
 * R05 faitage                   — Faîtage
 * R06 zinguerie                 — Zinguerie
 * R07 solins                    — Solins
 * R08 demossage_toiture         — Démoussage toiture, Nettoyage toiture, Nettoyage mousse toiture
 * R09 hydrofuge_toiture         — Traitement hydrofuge toiture, Hydrofuge toiture, Traitement anti-mousse toiture
 * R10 nettoyage_gouttieres      — Nettoyage gouttières, Entretien gouttières
 * R11 debouchage_gouttieres     — Débouchage gouttières
 * R12 remplacement_gouttieres   — Remplacement gouttières, Pose gouttières
 * R13 reparation_fuite_toiture  — Réparation fuite toiture, Recherche de fuite, Infiltration toiture
 * R14 etancheite_toit_terrasse  — Étanchéité toit terrasse, Étanchéité toiture plate, EPDM, PVC, bitume, Réfection étanchéité
 * R15 etancheite_balcon         — Étanchéité balcon, Étanchéité terrasse
 * R16 reparation_solin_cheminee — Réparation solin, Étanchéité cheminée
 * R17 reparation_velux          — Réparation Velux
 * R18 reparation_noue           — Réparation noue
 * R19 reparation_rive_acrotere  — Réparation rive, Étanchéité acrotère
 */

export const ROOF_VISUAL_CONTRACTS = {

  // ─── R01 ──────────────────────────────────────────────────────────────────────
  renovation_toiture: {
    service_key:   'renovation_toiture',
    service_label: 'Rénovation toiture complète',
    covers_services: [
      'Rénovation toiture complète', 'Couverture neuve', 'Réfection toiture',
    ],
    visual_goal:   'Show full roof renovation on a residential house — old tiles stripped, new tiles being laid, or complete new roof just finished. The scale is the whole roof surface, not a localised repair.',
    observable_action: 'Large-scale stripping of old tiles or laying of new tile courses across the full roof surface. Scaffold platform loaded with materials. New tiles stacked on scaffold.',
    required_visual_evidence: [
      'full roof surface visible — either mostly stripped to bare battens or mostly newly tiled',
      'large-scale work extent — multiple courses of tiles involved, not a one-tile patch',
      'scaffold platform at the eave or wall level with materials stacked',
      'clear contrast between stripped/old and new sections showing work progress',
    ],
    forbidden_confusions: [
      'localised tile repair (only 1–3 tiles replaced — see Remplacement tuiles)',
      'ridge tile work only (see Faîtage)',
      'roof cleaning or moss treatment (no tile removal or laying)',
      'flat roof membrane work (pitched tiled surface only)',
      'charpente/timber structure work without tiles visible',
    ],
    allowed_tools: [
      'tile breaker bar or slate ripper on scaffold for stripping',
      'nail gun or hammer fixing new battens',
      'chalk line drum for tile course alignment',
      'rubber mallet for bedding ridge tiles',
      'trowel and mortar bucket for pointing',
      'scaffold hoist or rope for lowering tile skips',
      'palettes of new terracotta or slate tiles',
    ],
    forbidden_tools: [
      'pressure washer or chemical sprayer (not a cleaning service)',
      'gutter scoop or gutter tools',
      'membrane roller or bitumen primer (flat roof tools)',
      'suction cups (glazier tools)',
    ],
    work_surface: [
      'full pitched roof surface — terracotta tiles or natural slates — one or both slopes',
      'bare timber battens visible during stripping phase',
    ],
    setting: ['exterior'],
    location_types: ['maison_individuelle', 'immeuble'],
    worker_rules: {
      presence: 'optional',
      min: 0,
      max: 2,
      posture: 'on scaffold platform at eave level or on roof slope via scaffold, handling tile stacks or operating nail gun on battens; roof ladder optional on slope',
    },
    safety: {
      required: [
        'scaffold platform with toe boards and side guardrails — mandatory for full renovation',
        'debris netting below scaffold to catch falling tile fragments',
        'protective tarp spread on garden below scaffold to catch debris',
        'heavy-duty work gloves for handling tiles',
      ],
      conditional: [
        'safety harness clipped to scaffold anchor for workers reaching beyond the platform edge',
        'second worker on scaffold for large tile pallet handling',
      ],
      forbidden: [
        'worker standing unguarded at the eave edge on bare battens without scaffold',
        'scaffold platform without toe boards — tile fragments can be kicked off',
        'single worker handling full-pallet tile stacks on slope unaided',
        'mortar bucket left unsecured on scaffold where it can be knocked off',
      ],
    },
    states: {
      debut: {
        observable_action: 'Stripping old tiles. First sections of old tiles removed, bare battens exposed on one section.',
        required_visual_evidence: [
          'first stripped section showing bare timber battens — one corner or small area cleared',
          'old tiles stacked on scaffold or in a skip at the base of the house',
          'rest of the roof still intact with original tiles',
          'scaffold platform loaded with stripped tiles awaiting lowering',
        ],
      },
      encours: {
        observable_action: 'Half the roof stripped and new battens or tiles being laid on the cleared section.',
        required_visual_evidence: [
          'sharp demarcation across the roof — one slope stripped to battens or re-tiled, other slope still original',
          'new tile courses or new batten rows visible on the cleared section',
          'old tile stack on scaffold or ground below',
          'active material handling — new tiles or battens being positioned',
        ],
      },
      semifinal: {
        observable_action: 'New tiles covering most of the surface. Ridge or valley flashing still being completed.',
        required_visual_evidence: [
          'new tile courses covering most of the roof — fresh terracotta or slate colour',
          'ridge or hip still incomplete — new tiles end just below the apex',
          'small stack of remaining new tiles on scaffold',
          'scaffold still in position, tarp or netting below',
        ],
      },
      final: {
        observable_result: 'Complete new tiled roof. Uniform fresh tile colour, clean ridge line, flashing complete.',
        required_visual_evidence: [
          'full new roof surface — uniform fresh tile colour across both slopes',
          'clean ridge line — new ridge tiles neatly pointed',
          'no old tile sections remaining',
          'clean driveway or garden with minimal residual debris — scaffold removed',
        ],
      },
    },
    composition_preferences: ['wide_worksite', 'medium_intervention'],
    for_regex: 'renovation.*toiture|refection.*toiture|couverture.*neuve',
  },

  // ─── R02 ──────────────────────────────────────────────────────────────────────
  reparation_toiture: {
    service_key:   'reparation_toiture',
    service_label: 'Réparation toiture',
    covers_services: ['Réparation toiture'],
    visual_goal:   'Show a targeted repair on a mostly intact tiled roof — limited zone of intervention, roof ladder as access tool, surrounding tiles undisturbed. Not a full renovation and not a single-tile swap.',
    observable_action: 'Roof ladder hooked over ridge. Worker accessing a specific repair zone on a mostly-intact pitched roof. Multiple tiles removed to access underlayer or battens below. Targeted repair visible.',
    required_visual_evidence: [
      'roof ladder (échelle de couvreur) hooked over the ridge — access route clearly visible',
      'small open zone of 4–10 tiles removed showing battens or underlayer below',
      'surrounding tiles intact and undisturbed on both sides of the repair area',
      'repair materials staged nearby on roof — mortar bucket, replacement tiles, membrane strip',
    ],
    forbidden_confusions: [
      'full roof renovation (large-scale stripping — see Rénovation toiture complète)',
      'single broken tile replacement with tile lifter (too small — see Remplacement tuiles)',
      'ridge tile work only (see Faîtage)',
      'cleaning or moss treatment (no tile removal)',
    ],
    allowed_tools: [
      'roof ladder (échelle de couvreur) hooked over ridge',
      'tile lifter or breaker bar for removing damaged tiles',
      'trowel and small mortar bucket',
      'replacement tiles stacked near the repair zone',
      'roofing felt or underlay patch strip',
      'hammer and roofing nails',
    ],
    forbidden_tools: [
      'full scaffold tower (repair scale is too small for full scaffold)',
      'pressure washer or moss treatment equipment',
      'gutter tools or membrane roller',
    ],
    work_surface: [
      'pitched roof slope — section of 4–10 tiles removed, bare battens visible in the repair zone',
      'surrounding tiles intact framing the repair area',
    ],
    setting: ['exterior'],
    location_types: ['maison_individuelle', 'immeuble'],
    worker_rules: {
      presence: 'optional',
      min: 0,
      max: 1,
      posture: 'kneeling or crouching on roof slope via roof ladder, working within arm\'s reach of the repair zone; does not straddle the repair opening',
    },
    safety: {
      required: [
        'roof ladder (échelle de couvreur) hooked firmly over the ridge — mandatory access tool on slope',
        'non-slip footwear on sloped tile surface',
        'work gloves for handling tiles and sharp underlayer edges',
      ],
      conditional: [
        'safety harness clipped to ridge anchor when repair zone is close to the eave edge',
        'debris tarp below the repair zone to catch dislodged tile fragments',
      ],
      forbidden: [
        'worker crouching on slope without roof ladder as a fall-arrest anchor point',
        'unanchored roof ladder resting only on tiles without ridge hook',
        'worker reaching more than 60 cm sideways from the roof ladder rails',
        'worker standing upright on slope without holding the roof ladder',
      ],
    },
    states: {
      debut: {
        observable_action: 'Assessing damage. First tiles being removed to expose the repair zone.',
        required_visual_evidence: [
          'roof ladder in position on slope',
          'first 2–3 tiles removed near the damage site, bare batten visible in small gap',
          'remainder of roof intact around the opening',
          'tile lifter or breaker bar resting on adjacent tile',
        ],
      },
      encours: {
        observable_action: 'Open repair zone active. Underlayer or battens being repaired or replaced.',
        required_visual_evidence: [
          'open zone of 4–10 tiles removed — batten tops or underlayer visible',
          'repair material being applied: felt patch, mortar, or new batten section',
          'removed tiles stacked to one side on the tile surface beside the repair',
          'roof ladder beside the active zone',
        ],
      },
      semifinal: {
        observable_action: 'New tiles being replaced into the repaired zone. Last tiles being slid back into position.',
        required_visual_evidence: [
          'new or reinstated tiles being guided back into the repair zone',
          'most of the repair zone covered — small gap remaining at the active edge',
          'fresh mortar pointing visible at the re-seated tiles',
          'roof ladder still in position',
        ],
      },
      final: {
        observable_result: 'Repair complete. Tiles replaced, no open zone visible. Roof ladder still present as only tool.',
        required_visual_evidence: [
          'repair zone fully closed — tiles back in position, no batten gap',
          'fresh mortar or sealant line where tiles were reseated',
          'surrounding tiles undisturbed — overall roof intact',
          'roof ladder still resting on slope as only visible tool',
        ],
      },
    },
    composition_preferences: ['medium_intervention', 'close_detail'],
    for_regex: 'reparation toiture',
  },

  // ─── R03 ──────────────────────────────────────────────────────────────────────
  remplacement_tuiles: {
    service_key:   'remplacement_tuiles',
    service_label: 'Remplacement tuiles',
    covers_services: ['Remplacement tuiles', 'Remplacement ardoises'],
    visual_goal:   'Show a very localised tile or slate replacement — 1 to 3 damaged tiles being lifted and swapped. Tile lifter tool visible. New tile slightly brighter in colour against its weathered neighbours. No mortar work, no open zone of more than 3 tiles.',
    observable_action: 'Tile lifter inserted under adjacent tile to raise it. Cracked or broken tile being removed. New replacement tile being slid horizontally into the course gap.',
    required_visual_evidence: [
      'tile lifter (lève-tuile) or slate ripper inserted under an adjacent tile',
      'cracked or broken tile clearly visible — crack line or missing corner',
      'new replacement tile being slid into the course gap, lug engaging batten',
      'new tile visibly brighter or slightly different in colour from surrounding weathered tiles',
      'maximum 3 tiles in the repair zone — surrounding courses undisturbed',
    ],
    forbidden_confusions: [
      'open zone of more than 3–4 tiles (that is Réparation toiture, broader)',
      'ridge tile replacement (see Faîtage — ridge line is the subject, not slope tiles)',
      'full roof renovation (large-scale stripping)',
      'solin work (wall junction, not slope tile)',
      'ardoise: same principle but with slate ripper and nail rather than tile lifter and lug',
    ],
    allowed_tools: [
      'tile lifter (lève-tuile) or slate ripper',
      'replacement tile or slate — 1 to 3 pieces',
      'roofing hammer and copper or stainless nails (for slates)',
      'pointing trowel for small mortar finishing touch at ridge tile base if needed',
      'roof ladder hooked over ridge',
    ],
    forbidden_tools: [
      'full scaffold tower or heavy lifting equipment',
      'pressure washer',
      'membrane rolls or bitumen primer',
      'large tile stock — pallet of tiles (scale is wrong)',
    ],
    work_surface: [
      'pitched roof slope — 1 to 3 tiles only removed; surrounding tiles intact',
      'batten briefly visible in the 1–3 tile gap',
    ],
    setting: ['exterior'],
    location_types: ['maison_individuelle', 'immeuble'],
    worker_rules: {
      presence: 'optional',
      min: 0,
      max: 1,
      posture: 'kneeling on slope at the repair tile, one hand on roof ladder rail, other hand operating tile lifter or guiding new tile into gap',
    },
    safety: {
      required: [
        'roof ladder hooked over ridge — mandatory for slope access',
        'work gloves for handling tile edges and slate with sharp corners',
        'non-slip footwear on pitched surface',
      ],
      conditional: [
        'knee pad on tile surface at the repair zone',
        'debris mat below eave if repair near the eave edge',
      ],
      forbidden: [
        'worker reaching sideways off the roof ladder to access the tile gap',
        'loose tile fragment left on the slope beside the repair without being secured',
        'bare hands on slate edges (ardoise cutting edges are sharp)',
        'worker standing on the replacement tile before it is fully seated',
      ],
    },
    states: {
      debut: {
        observable_action: 'Identifying the damaged tile. Tile lifter being positioned under adjacent tile.',
        required_visual_evidence: [
          'cracked or broken tile visible — crack line, missing corner, or displaced tile in its course',
          'tile lifter being inserted under the adjacent tile — tool levering the tile up',
          'surrounding tiles undisturbed',
          'replacement tile resting on the roof surface nearby',
        ],
      },
      encours: {
        observable_action: 'Broken tile removed. New tile being guided into the course gap.',
        required_visual_evidence: [
          'small gap in the tile course where old tile was removed — 1 batten width visible',
          'broken tile fragments set aside on the tile surface beside the gap',
          'new replacement tile being slid horizontally into the gap, lug aligning over batten',
          'tile lifter or slate ripper resting on adjacent tile',
        ],
      },
      semifinal: {
        observable_action: 'New tile fully seated. Adjacent tiles being lowered back into position.',
        required_visual_evidence: [
          'new tile fully in the course gap — lug engaged on batten',
          'adjacent tiles being eased back down over the new tile',
          'slight colour difference between new tile and weathered neighbours',
          'no visible open gap in the tile course',
        ],
      },
      final: {
        observable_result: 'Single tile repair complete. New tile in position among surrounding weathered tiles. No open gap.',
        required_visual_evidence: [
          'new tile fully seated and level in its course',
          'new tile clearly brighter or slightly different colour from immediately adjacent weathered tiles',
          'all surrounding tiles back in position — no gap, no loose tile',
          'no other tools remaining on the slope',
        ],
      },
    },
    composition_preferences: ['close_detail', 'medium_intervention'],
    for_regex: 'remplacement (tuiles|ardoises)',
  },

  // ─── R04 ──────────────────────────────────────────────────────────────────────
  charpente_combles: {
    service_key:   'charpente_combles',
    service_label: 'Charpente',
    covers_services: ['Charpente', 'Isolation combles'],
    visual_goal:   'Show bare timber roof structure (fermette, rafters, ridge board) either under construction or being accessed for insulation laying. For charpente: raw sawn timber, structural layout visible. For isolation: pink or yellow insulation rolls being laid between rafters in the loft space.',
    observable_action: 'For charpente: nailing battens to rafter tops, or erecting fermette structure on wall plate. For isolation: unrolling mineral wool insulation between joist bays in the loft space.',
    required_visual_evidence: [
      'raw sawn timber structural members visible — rafters, purlins, or ridge board',
      'either: bare fermette structure before any tiling (charpente), OR insulation rolls being laid between timber bays (isolation combles)',
      'no tile surface visible as the main subject — structure or loft interior is the focus',
      'timber still unweathered (new) or existing aged structure clearly in an accessible loft',
    ],
    forbidden_confusions: [
      'tiled roof surface as main subject (charpente is the structural layer beneath the tiles)',
      'scaffold carrying tiles for renovation (the structure itself is not being renovated here)',
      'flat roof membrane work (this is a pitched timber structure)',
    ],
    allowed_tools: [
      'nail gun or hammer fixing battens to rafter tops',
      'chalk line drum for alignment',
      'measuring tape and pencil',
      'insulation knife and straight edge for cutting insulation rolls',
      'staple gun for insulation retainer',
      'safety glasses for working below the rafter level',
    ],
    forbidden_tools: [
      'pressure washer or moss treatment equipment',
      'membrane roller or bitumen primer',
      'tile lifter or gutter scoop',
    ],
    work_surface: [
      'roof structure interior — rafter bays, wall plate, ridge board, purlins',
      'loft floor (joist bays) for isolation combles',
    ],
    setting: ['interior', 'exterior'],
    location_types: ['maison_individuelle'],
    worker_rules: {
      presence: 'optional',
      min: 0,
      max: 2,
      posture: 'standing or kneeling on scaffold boards at rafter level for charpente; kneeling between joist bays for isolation combles — no open edge exposure',
    },
    safety: {
      required: [
        'scaffold platform or boarding across joist bays — no walking on bare joists',
        'dust mask for handling mineral wool insulation',
        'safety glasses when cutting insulation or working below the rafter apex',
        'work gloves for mineral wool handling (skin irritant)',
      ],
      conditional: [
        'kneeling board across joist bays to distribute weight and prevent plasterboard cracking below',
        'head torch or portable site light in unlit loft space',
      ],
      forbidden: [
        'worker standing directly on ceiling joists without a board — ceiling collapse risk',
        'unsecured open hatch on the loft floor edge with no guard',
        'mineral wool handled without gloves or dust mask',
      ],
    },
    states: {
      debut: {
        observable_action: 'Erecting bare timber structure, or opening loft access and staging insulation rolls.',
        required_visual_evidence: [
          'bare timber fermette or rafter structure — raw pale sawn wood',
          'wall plate visible at the eave level, rafter feet seated on it',
          'OR: loft hatch open, first insulation roll being carried up, existing bare joist bays visible',
          'no tiles or finishing materials in frame',
        ],
      },
      encours: {
        observable_action: 'Battens being nailed to rafters, or insulation rolls being unrolled between joist bays.',
        required_visual_evidence: [
          'for charpente: rows of new battens being nailed progressively down the rafter — nail gun visible',
          'for isolation: several joist bays already filled with insulation, next bay being unrolled',
          'partial completion visible — some bays done, others not yet started',
          'materials being actively handled',
        ],
      },
      semifinal: {
        observable_action: 'Structure mostly complete or insulation almost fully laid.',
        required_visual_evidence: [
          'for charpente: rafter surface mostly battened — only top few courses near ridge remaining',
          'for isolation: most joist bays filled, last roll being positioned in remaining bays',
          'near-complete coverage, edges and corners being finished',
        ],
      },
      final: {
        observable_result: 'Complete timber structure ready for tiling, or full insulation coverage in loft.',
        required_visual_evidence: [
          'for charpente: full batten rows covering all rafter tops — even, regular gauge',
          'for isolation: all joist bays filled with insulation — no bare bay gaps visible',
          'clean, professional result — materials neat and correctly installed',
          'tools put away or at the edge of the work area',
        ],
      },
    },
    composition_preferences: ['medium_intervention', 'wide_worksite'],
    for_regex: 'charpente|isolation.*comble',
  },

  // ─── R05 ──────────────────────────────────────────────────────────────────────
  faitage: {
    service_key:   'faitage',
    service_label: 'Faîtage',
    covers_services: ['Faîtage'],
    visual_goal:   'Show work specifically at the ridge line of a pitched roof — the topmost linear element. Old mortar-bedded ridge tiles being removed and new ridge tiles being bedded in fresh mortar. The subject is the apex line of the roof, not the slope tiles below it.',
    observable_action: 'Removing old mortar-encrusted ridge tiles using bolster and hammer, or bedding new ridge tiles with a rubber mallet into fresh mortar along the ridge apex.',
    required_visual_evidence: [
      'ridge line (faîtage) as the clear subject — the apex where the two slopes meet',
      'mortar work at the ridge: either old mortar being broken out, or fresh grey mortar bed being formed',
      'ridge tiles being removed or new ones being tapped level with rubber mallet',
      'both roof slopes visible below the ridge line showing the tiles in context',
    ],
    forbidden_confusions: [
      'slope tile replacement (tiles on the slope, not at the ridge — see Remplacement tuiles)',
      'solin repair (wall or chimney junction — not the ridge summit — see Solins)',
      'valley repair (noue — between two slopes, not the summit — see Réparation noue)',
      'gable edge tiles (rive — the vertical side edge, not the horizontal ridge)',
    ],
    allowed_tools: [
      'bolster chisel and lump hammer for breaking old ridge mortar',
      'rubber mallet for tapping new ridge tile into mortar bed',
      'brick trowel for spreading fresh mortar',
      'pointing trowel for finishing mortar joint',
      'mortar bucket with fresh mix',
      'roof ladder alongside the ridge for access',
    ],
    forbidden_tools: [
      'tile lifter (for slope tiles, not ridge)',
      'pressure washer or chemical sprayer',
      'gutter scoop',
      'membrane roller',
    ],
    work_surface: [
      'ridge apex — the summit line of the pitched roof, both top tile courses on either side',
      'ridge tile base and mortar bed at the apex',
    ],
    setting: ['exterior'],
    location_types: ['maison_individuelle', 'immeuble'],
    worker_rules: {
      presence: 'optional',
      min: 0,
      max: 1,
      posture: 'straddling or kneeling at the ridge apex, stabilised by roof ladder hooked over the ridge; arms free to work with trowel or mallet',
    },
    safety: {
      required: [
        'roof ladder (échelle de couvreur) firmly hooked over the ridge beside the work zone',
        'safety harness clipped to a ridge anchor or scaffold anchor when working at the apex — ridge is the highest and most exposed point',
        'safety glasses when striking old mortar with bolster and hammer',
        'work gloves for handling ridge tiles and old mortar',
      ],
      conditional: [
        'scaffolding at eave level if roof pitch exceeds 45° or roof height exceeds 6 m',
        'second worker holding the roof ladder base on the slope for stability',
      ],
      forbidden: [
        'worker straddling the ridge without any harness or anchor point',
        'worker standing upright on the ridge apex without holding the roof ladder',
        'roof ladder leaning loosely against the ridge without the hook engaged',
        'working at the ridge in wet or icy conditions without fall protection',
      ],
    },
    states: {
      debut: {
        observable_action: 'Old ridge tiles being demolished. Bolster and hammer breaking old mortar joints.',
        required_visual_evidence: [
          'bolster chisel at the old ridge tile mortar joint — hammer striking it',
          'old mortar fragments on the top tiles either side of the ridge',
          'old ridge tile being lifted off after the mortar is broken',
          'both slopes still tiled below the ridge work zone',
        ],
      },
      encours: {
        observable_action: 'Fresh mortar bed being laid along the ridge. New ridge tiles being positioned.',
        required_visual_evidence: [
          'trowel spreading fresh grey mortar along the top tile courses at the ridge apex',
          'mortar bed building along the ridge length — several tiles\' worth laid',
          'some new ridge tiles already bedded at one end, active work at the leading edge',
          'old mortar fragments cleared from the completed section',
        ],
      },
      semifinal: {
        observable_action: 'New ridge tiles being tapped level with rubber mallet. Mortar being pointed.',
        required_visual_evidence: [
          'rubber mallet tapping new ridge tile into the fresh mortar bed',
          'mortar squeezing from both sides beneath the ridge tile base',
          'completed section behind showing neat pointed mortar joints',
          'remaining section ahead still showing old tiles or bare mortar bed',
        ],
      },
      final: {
        observable_result: 'New ridge fully tiled. Neat mortar joints. Clean summit line.',
        required_visual_evidence: [
          'full new ridge tile run from one gable to the other — neatly aligned',
          'fresh grey mortar joint running along the ridge on both sides — neat and even',
          'both roof slopes intact below the ridge',
          'no old mortar fragments or debris on the top tile courses',
        ],
      },
    },
    composition_preferences: ['close_detail', 'medium_intervention'],
    for_regex: 'faitage',
  },

  // ─── R06 ──────────────────────────────────────────────────────────────────────
  zinguerie: {
    service_key:   'zinguerie',
    service_label: 'Zinguerie',
    covers_services: ['Zinguerie'],
    visual_goal:   'Show metal sheet roofing or flashing work — cutting, bending, and forming zinc, lead, or aluminium sheet to create valleys, flashings, gutters, or aprons. The metalwork fabrication process (tin snips, folder, dresser) is the key visual distinguisher from tile or mortar work.',
    observable_action: 'Cutting zinc sheet to length with tin snips on scaffold. Folding zinc with a brake or by hand. Dressing malleable lead into a chimney abutment or valley. Fitting a new zinc valley strip or fascia gutter.',
    required_visual_evidence: [
      'metallic sheet material visible — zinc (grey/blue-grey), lead (dull silver-grey), or aluminium',
      'metalwork fabrication or fitting: tin snips cutting sheet, folder bending a profile, or lead dresser forming material into a joint',
      'fold lines, cut edges, or formed profiles visible on the metal sheet',
      'metal being fitted to a roof junction — valley, chimney base, eave edge, or wall abutment',
    ],
    forbidden_confusions: [
      'solin repair with mortar only (no metal sheet cutting or forming — see Solins)',
      'gutter replacement in PVC (plastic profile, cordless drill, brackets — see Remplacement gouttières)',
      'faitage with mortar (no metalwork — see Faîtage)',
      'general tile work (no metal sheet involved)',
    ],
    allowed_tools: [
      'tin snips for cutting zinc or aluminium sheet',
      'sheet metal folder or brake for bending profiles',
      'lead dresser for forming malleable lead at abutments',
      'pop rivet gun for aluminium fascia joints',
      'marker pen for layout lines on sheet',
      'steel rule and scribing pin',
      'heavy-duty work gloves (metal edges are sharp)',
    ],
    forbidden_tools: [
      'rubber mallet for tapping roof tiles (not used for metalwork forming)',
      'pressure washer or moss treatment',
      'cordless drill only (too simple for a zinguerie job — must show metal fabrication)',
    ],
    work_surface: [
      'roof slope or eave junction — valley channel, chimney base, wall abutment, or eave fascia',
      'scaffold board where zinc/lead sheet is being cut and bent before fitting',
    ],
    setting: ['exterior'],
    location_types: ['maison_individuelle', 'immeuble'],
    worker_rules: {
      presence: 'optional',
      min: 0,
      max: 1,
      posture: 'on scaffold board at eave level, cutting and bending sheet; or on roof slope via roof ladder at valley or chimney, dressing lead into joint',
    },
    safety: {
      required: [
        'heavy-duty cut-resistant gloves — zinc and aluminium sheet edges are razor-sharp',
        'safety glasses when cutting or trimming sheet metal',
        'scaffold platform or roof ladder depending on work location',
      ],
      conditional: [
        'safety harness when working at chimney level or ridge height',
        'debris mat below to catch metal off-cut pieces that may slide off slope',
      ],
      forbidden: [
        'bare hands when cutting or handling freshly cut sheet metal — laceration risk',
        'metal off-cuts left loose on slope without containment',
        'worker leaning over scaffold guardrail to reach roof junction without harness',
      ],
    },
    states: {
      debut: {
        observable_action: 'Measuring and cutting zinc sheet on scaffold. Layout and marking before forming.',
        required_visual_evidence: [
          'flat zinc or aluminium sheet on scaffold board — marker pen lines visible',
          'tin snips cutting along the marked line — cut edge curling away',
          'steel rule and marker pen beside the sheet',
          'fold marks or crease lines on the sheet showing the intended profile',
        ],
      },
      encours: {
        observable_action: 'Bending or dressing the metal into the final profile. Fitting into the roof junction.',
        required_visual_evidence: [
          'metal piece being bent to shape — lead dresser at chimney, or folder bending a zinc profile',
          'formed metal piece being offered up to its position — valley, chimney base, or eave',
          'old flashing or old valley zinc being removed and placed aside',
        ],
      },
      semifinal: {
        observable_action: 'Metal flashing in position. Edges being fixed and sealed.',
        required_visual_evidence: [
          'new zinc or lead flashing in its final position — valley, chimney base, or apron',
          'fixing clips or screws being applied, or sealant being run at the top edge',
          'surrounding tiles or wall material intact around the new metalwork',
        ],
      },
      final: {
        observable_result: 'New metalwork installed. Clean metal profile visible against tiles or masonry.',
        required_visual_evidence: [
          'new zinc or lead flashing installed and fixed — clean metal surface without cuts or damage',
          'weathertight junction — no gaps at the edges',
          'surrounding tiles or wall undisturbed — metalwork blends into the roof junction',
          'no off-cut metal debris remaining at the work site',
        ],
      },
    },
    composition_preferences: ['close_detail', 'medium_intervention'],
    for_regex: 'zinguerie',
  },

  // ─── R07 ──────────────────────────────────────────────────────────────────────
  solins: {
    service_key:   'solins',
    service_label: 'Solins',
    covers_services: ['Solins'],
    visual_goal:   'Show the repair or replacement of a solin — the waterproof junction between a vertical masonry surface (wall, chimney, or dormer) and an adjacent sloping tiled roof. The subject is the mortar or membrane bead running along that wall-to-tile junction line.',
    observable_action: 'Raking out old crumbled mortar at the wall-tile junction. Applying fresh mortar or membrane strip along the base of the wall where it meets the tile surface. Localised zone only.',
    required_visual_evidence: [
      'vertical masonry surface (wall, chimney side, or dormer cheek) meeting a tiled roof slope',
      'junction bead — either old crumbled mortar being raked out, or fresh new mortar/membrane being applied along the base of the wall',
      'localised repair zone — not the full roof or ridge line',
      'surrounding tiles intact on the slope away from the wall junction',
    ],
    forbidden_confusions: [
      'faitage (ridge summit — horizontal line at the apex, not a wall junction)',
      'zinguerie full metalwork job (solin can be mortar-only — no cutting or bending of metal sheet required)',
      'réparation cheminée étanchéité — very similar but here the focus is the wall-to-slope junction strip, not the chimney perimeter flashing unit',
      'full tile replacement on slope (no tiles being replaced — just the junction seal)',
    ],
    allowed_tools: [
      'cold chisel and club hammer for raking out old mortar',
      'pointing trowel for applying fresh mortar',
      'mortar bucket with fresh mix',
      'bituminous mastic gun for membrane-type solin',
      'membrane strip cut to length against the wall base',
      'stiff brush for clearing mortar dust',
    ],
    forbidden_tools: [
      'tile lifter (no tiles being replaced)',
      'rubber mallet for ridge tiles',
      'pressure washer',
      'gutter tools',
    ],
    work_surface: [
      'wall-to-tile junction strip — the narrow bead at the base of a vertical wall meeting pitched tiles',
      'localised zone along the wall base; tiles and wall surface above undisturbed',
    ],
    setting: ['exterior'],
    location_types: ['maison_individuelle', 'immeuble'],
    worker_rules: {
      presence: 'optional',
      min: 0,
      max: 1,
      posture: 'kneeling or crouching on roof slope at the wall base, stabilised by roof ladder beside the work zone',
    },
    safety: {
      required: [
        'roof ladder hooked over ridge for slope access',
        'knee pad on tile surface at the work zone',
        'safety glasses when chiselling old mortar',
        'work gloves for handling mortar and membrane strip',
      ],
      conditional: [
        'scaffold platform for solins at high wall junctions (above 4 m from ground)',
        'safety harness at chimney height if pitch is steep and chimney is near the ridge',
      ],
      forbidden: [
        'worker reaching laterally off the roof ladder to access the wall junction without an anchor point',
        'mortar bucket left unsecured on the tile slope',
        'chiselling mortar without safety glasses — fragment projection risk',
      ],
    },
    states: {
      debut: {
        observable_action: 'Old mortar being raked out. Junction gap exposed and cleaned before repointing.',
        required_visual_evidence: [
          'chisel at the old mortar joint along the wall-tile junction',
          'old mortar fragments on the tile surface beside the wall base',
          'junction gap exposed — clean brick or render face visible at the wall base',
          'surrounding tiles intact on the slope',
        ],
      },
      encours: {
        observable_action: 'Fresh mortar or membrane being applied along the junction.',
        required_visual_evidence: [
          'trowel or mastic gun applying fresh material along the wall base junction',
          'new material bead building along part of the junction — rest still raw',
          'mortar bucket or mastic cartridge visible beside the work zone',
        ],
      },
      semifinal: {
        observable_action: 'Junction nearly repointed. Mortar being shaped and smoothed.',
        required_visual_evidence: [
          'fresh mortar bead running most of the junction length — bright grey against old wall',
          'pointing trowel smoothing and profiling the mortar to shed water',
          'small raw section at one end still to be pointed',
        ],
      },
      final: {
        observable_result: 'Solin repair complete. Neat mortar bead along the full wall-tile junction.',
        required_visual_evidence: [
          'continuous mortar or membrane bead along the full wall-tile junction',
          'bead neatly profiled — sloped to shed water onto the tile below',
          'surrounding tiles undisturbed; wall face clean above the new bead',
          'no open gap or crumbled mortar remaining at the junction',
        ],
      },
    },
    composition_preferences: ['close_detail', 'medium_intervention'],
    for_regex: '^solins$',
  },

  // ─── R08 ──────────────────────────────────────────────────────────────────────
  demossage_toiture: {
    service_key:   'demossage_toiture',
    service_label: 'Démoussage toiture',
    covers_services: [
      'Démoussage toiture', 'Nettoyage toiture', 'Nettoyage mousse toiture',
    ],
    visual_goal:   'Show manual or mechanical moss scraping on a pitched tiled roof. Thick green biological moss being physically removed. Key visual evidence: visible contrast between the clean recovered tile colour and the still-mossy dark sections. Debris tarp below the eave edge.',
    observable_action: 'Long-handled stiff broom sweeping thick moss off pitched roof tiles. OR hand scraper lifting cohesive moss pads from tile surface. Wet moss debris falling onto tarp below.',
    required_visual_evidence: [
      'thick green moss coverage on tile surface — dense biological buildup clearly visible',
      'scraping or brushing action: stiff broom sweeping moss off tile, OR hand scraper lifting a cohesive moss pad',
      'contrast between clean recovered tile colour and remaining mossy dark sections',
      'protective tarp fixed below the eave edge — moss debris accumulating on it',
    ],
    forbidden_confusions: [
      'hydrofuge or anti-mousse chemical treatment — no thick moss being scraped, spray being applied to clean or mildly mossy roof (see Hydrofuge toiture)',
      'pressure washing (jet nozzle, high-pressure machine)',
      'roof tile replacement (no tiles being removed)',
      'full roof renovation (tile stripping, battens, scaffold)',
    ],
    allowed_tools: [
      'long-handled stiff nylon or polypropylene broom',
      'hand scraper for close-up moss lifting',
      'soft-bristle finishing brush to sweep residue from cleared tiles',
      'protective tarp fixed along the eave edge',
      'plastic sheet protecting garden shrubs below',
    ],
    forbidden_tools: [
      'gas pressure lance or pressure washer machine',
      'chemical backpack sprayer with telescopic lance (that is hydrofuge treatment)',
      'tile lifter or roofer\'s tools',
      'scaffold tower or ladders visible in frame',
      'workers or people visible (no-worker composition per pipeline)',
    ],
    work_surface: [
      'pitched tiled roof surface — terracotta or slate — one or both slopes',
      'protective tarp at the eave base collecting scraped moss debris',
    ],
    setting: ['exterior'],
    location_types: ['maison_individuelle', 'immeuble'],
    worker_rules: {
      presence: 'none',
      min: 0,
      max: 0,
      posture: 'no workers visible in image — composition shows the roof surface, tarp, and tools from ground level',
    },
    safety: {
      required: [
        'protective tarp fixed along full eave edge before work starts — contains chemical and biological runoff',
        'plastic sheet over garden shrubs below the treated area',
      ],
      conditional: [
        'when worker IS present (not shown in image): non-slip footwear, work gloves, safety glasses, roof ladder on slope',
        'safety harness for slopes above 30° or when near the eave edge',
      ],
      forbidden: [
        'worker standing on gutter or eave overhang during scraping',
        'loose moss debris left on tiles after scraping without containment on tarp below',
        'stiff broom resting unsecured on sloped tiles where it could slide off',
      ],
    },
    states: {
      debut: {
        observable_action: 'Work has just started. Small section scraped at one edge. Tarp in position.',
        required_visual_evidence: [
          'full roof pitch almost entirely covered in dense green-black moss',
          'one small corner or ridge strip recently cleaned — bare tile colour just visible',
          'protective tarp fixed and visible below the eave',
          'first small pile of wet moss on the tarp surface',
        ],
      },
      encours: {
        observable_action: 'Half the roof scraped. Sharp demarcation line visible across the slope.',
        required_visual_evidence: [
          'clear demarcation across the roof — one half clean bare tile, other half still dense green moss',
          'moss debris on the tarp below — quantifying work done',
          'scraped side showing restored uniform tile colour',
          'mossy side still dark green-black',
        ],
      },
      semifinal: {
        observable_action: 'Most of the roof scraped. Moss patches remaining only near chimney or gutters.',
        required_visual_evidence: [
          'most of the roof surface showing restored tile colour',
          'residual moss patches near the chimney base and along the eave gutters',
          'tarp loaded with wet moss debris',
          'faint stain marks on cleared tile where dense moss sat for years',
        ],
      },
      final: {
        observable_result: 'Roof fully scraped. Uniform tile colour. No moss visible. Tarp loaded below.',
        required_visual_evidence: [
          'full roof surface showing uniform restored tile colour — no visible moss',
          'ridge line clean and sharp — no dark biological buildup',
          'tarp below the eave visibly loaded with scraped moss debris',
          'gutters clear along the eave — no moss overhanging',
        ],
      },
    },
    composition_preferences: ['wide_worksite', 'contextual_overview'],
    for_regex: 'demoussage|nettoyage.*toiture',
  },

  // ─── R09 ──────────────────────────────────────────────────────────────────────
  hydrofuge_toiture: {
    service_key:   'hydrofuge_toiture',
    service_label: 'Hydrofuge toiture',
    covers_services: [
      'Traitement hydrofuge toiture', 'Hydrofuge toiture', 'Traitement anti-mousse toiture',
    ],
    visual_goal:   'Show chemical treatment application on a pitched tiled roof. The roof is ALREADY CLEAN or only lightly soiled — no thick moss clumps. A backpack sprayer with telescopic lance is applying a hydrophobic or biocidal product uniformly across the tile surface.',
    observable_action: 'Backpack chemical sprayer with telescopic lance directing a fine spray arc across clean or lightly mossy tile surface. Product running in dark rivulets down the tile grooves from the application point.',
    required_visual_evidence: [
      'backpack chemical sprayer with telescopic lance as the primary tool',
      'tiles visibly WET and darkening uniformly from the applied product — not being scraped',
      'no thick moss pads being dislodged — roof surface mostly clean before treatment',
      'spray fan or rivulets of product running down tile grooves',
      'protective tarp below eave collecting chemical runoff',
    ],
    forbidden_confusions: [
      'démoussage / nettoyage — thick green moss being SCRAPED off with broom or scraper (see Démoussage toiture)',
      'pressure washing (high-pressure lance and machine)',
      'tile replacement or renovation',
      'gutter treatment or cleaning',
    ],
    allowed_tools: [
      'backpack chemical sprayer with telescopic lance',
      'treatment pump container and hose',
      'protective tarp at eave edge',
      'plastic sheet over garden plants',
      'measuring cup and empty treatment container',
    ],
    forbidden_tools: [
      'stiff broom or hand scraper (those are for démoussage)',
      'pressure washer jet nozzle',
      'tile lifter or roofer\'s tools',
      'workers or people visible (no-worker composition)',
    ],
    work_surface: [
      'pitched tiled roof surface — clean or lightly aged tiles being coated with product',
      'no thick moss clumps present on the tile surface',
    ],
    setting: ['exterior'],
    location_types: ['maison_individuelle', 'immeuble'],
    worker_rules: {
      presence: 'none',
      min: 0,
      max: 0,
      posture: 'no workers visible in image — backpack sprayer and tarp are the primary visual elements from ground level',
    },
    safety: {
      required: [
        'protective tarp along full eave edge to collect chemical runoff',
        'plastic sheet over garden shrubs and plants below',
      ],
      conditional: [
        'when worker IS present: chemical-resistant gloves, safety glasses, and dust/vapour mask mandatory',
        'safety harness if telescopic lance requires worker to access slope above eave edge',
        'child and pet exclusion from treatment zone during application and drying',
      ],
      forbidden: [
        'treatment applied on wet or frosty tiles — product will not adhere',
        'product running directly onto soil, waterway, or plant beds without tarp containment',
        'worker operating lance from an unstable ladder leaning against the eave gutter',
      ],
    },
    states: {
      debut: {
        observable_action: 'Application starting at the ridge. Product being sprayed from the top down.',
        required_visual_evidence: [
          'backpack sprayer and lance positioned at the high end or ridge of the roof',
          'first tiles at the ridge visibly wet and darkened from the product',
          'lower tile courses still dry and showing original colour below',
          'protective tarp in position at the eave',
        ],
      },
      encours: {
        observable_action: 'Treatment applied to upper half of roof. Product running in dark rivulets down the slope.',
        required_visual_evidence: [
          'upper section of roof uniformly wet and dark from the applied product',
          'dark rivulets of treatment running down the tile grooves from treated to untreated section',
          'lower section still dry showing original tile colour — clear boundary',
          'tarp below collecting runoff',
        ],
      },
      semifinal: {
        observable_action: 'Almost complete. Last section near eave being treated.',
        required_visual_evidence: [
          'most of the roof dark and wet with product — uniform coverage',
          'last strip near the eave still dry, lance being directed at it',
          'chemical runoff on the tarp below — treatment line visible',
        ],
      },
      final: {
        observable_result: 'Full roof treated. Uniformly dark and wet. Tarp loaded with chemical runoff.',
        required_visual_evidence: [
          'entire roof surface uniformly dark and wet from the applied product',
          'backpack sprayer parked at the base of the house — treatment complete',
          'tarp below the eave visibly wet with chemical runoff',
          'no dry tile sections remaining — uniform coverage confirmed',
        ],
      },
    },
    composition_preferences: ['wide_worksite', 'contextual_overview'],
    for_regex: 'hydrofuge.*toiture|traitement.*toiture|anti.mousse',
  },

  // ─── R10 ──────────────────────────────────────────────────────────────────────
  nettoyage_gouttieres: {
    service_key:   'nettoyage_gouttieres',
    service_label: 'Nettoyage gouttières',
    covers_services: ['Nettoyage gouttières', 'Entretien gouttières'],
    visual_goal:   'Show manual gutter cleaning — extracting compacted leaves and moss debris from the gutter trough. Ladder at the eave. Gutter scoop extracting a thick mat of debris. Pile of wet leaves on ground below. Roof tiles in background as weathered context only, not the subject.',
    observable_action: 'Worker on ladder at the gutter run using a plastic gutter scoop to extract compacted leaf and moss debris from the trough. Debris deposited in a bucket below.',
    required_visual_evidence: [
      'gutter trough packed with compacted leaves and moss debris — clearly overflowing',
      'gutter scoop extracting a thick mat of debris from the trough',
      'ladder at the eave edge as the access tool',
      'bucket or pile of wet extracted debris on the ground directly below',
      'weathered roof tiles as background context only — not a cleaning subject',
    ],
    forbidden_confusions: [
      'débouchage gouttières — flexible rod in downpipe, standing water, blocked inlet (see Débouchage)',
      'remplacement/pose gouttières — new PVC sections, cordless drill, fascia brackets (see Remplacement)',
      'démoussage toiture — roof tiles as the primary subject, no gutter as focus',
    ],
    allowed_tools: [
      'aluminium ladder leaning at the gutter run',
      'plastic gutter scoop working along the trough',
      'plastic bucket at ladder base for debris',
      'garden trowel for compacted debris near downpipe',
      'garden hose for final flush test',
      'soft hand brush for residual grit',
    ],
    forbidden_tools: [
      'flexible drainage rod (that is débouchage)',
      'cordless drill or fascia brackets (that is remplacement)',
      'pressure washer lance',
      'new PVC gutter sections (no replacement here)',
    ],
    work_surface: [
      'gutter trough along the eave edge — debris being extracted from the open trough',
      'downpipe at the corner tested with garden hose at the end',
    ],
    setting: ['exterior'],
    location_types: ['maison_individuelle', 'immeuble'],
    worker_rules: {
      presence: 'required',
      min: 1,
      max: 1,
      posture: 'standing on ladder at the gutter run — upper body above the gutter level, both hands free to use scoop; NOT standing on the gutter itself',
    },
    safety: {
      required: [
        'ladder stabiliser or stand-off bracket keeping the ladder top away from the gutter — prevents gutter damage and ladder slip',
        'ladder footing on firm flat ground — no ladder feet on gravel or mud without stabiliser',
        'work gloves for handling wet decomposed leaf debris',
      ],
      conditional: [
        'second person steadying the ladder base for heights above 4 m',
        'plastic sheet on the garden bed directly below the gutter run to contain debris',
      ],
      forbidden: [
        'worker standing directly on the gutter trough or eave overhang — gutter is not a structural platform',
        'ladder leaning directly against the gutter profile without stand-off — gutter deformation and slip risk',
        'overreaching sideways off the ladder more than one arm\'s length — must move the ladder along',
        'ladder placed on uneven ground without levelling feet',
      ],
    },
    states: {
      debut: {
        observable_action: 'Gutter inspection. Ladder in position. Trough fully clogged.',
        required_visual_evidence: [
          'ladder leaning at the gutter run with stand-off visible',
          'gutter trough fully packed with compacted leaves and moss — overflowing at one point',
          'gutter scoop in hand or on the ladder shelf ready',
          'clean ground below — no debris pile yet',
        ],
      },
      encours: {
        observable_action: 'Gutter scoop extracting debris. Part of trough cleared.',
        required_visual_evidence: [
          'gutter scoop pulling out a thick mat of compacted leaves and moss',
          'one section of trough cleared and visibly empty — contrasting with still-blocked section',
          'pile of wet debris on ground below the cleared section',
          'bucket at the ladder base partially filled',
        ],
      },
      semifinal: {
        observable_action: 'Most of trough cleared. Last section near downpipe being cleaned.',
        required_visual_evidence: [
          'most of the gutter trough now empty and visible as a clean channel',
          'last small clump of debris near the downpipe joint still being extracted',
          'debris pile on ground below — most of the cleaning done',
        ],
      },
      final: {
        observable_result: 'Gutter fully cleared. Downpipe flowing freely. Facade clean.',
        required_visual_evidence: [
          'gutter trough empty and clean along the full eave run',
          'downpipe running freely — water test visible or dry and clean pipe',
          'ground below tidy — debris bag or swept pile at the base',
          'facade clean — no drip stains from overflowing gutter',
        ],
      },
    },
    composition_preferences: ['medium_intervention', 'close_detail'],
    for_regex: 'nettoyage.*gouttieres|entretien.*gouttieres',
  },

  // ─── R11 ──────────────────────────────────────────────────────────────────────
  debouchage_gouttieres: {
    service_key:   'debouchage_gouttieres',
    service_label: 'Débouchage gouttières',
    covers_services: ['Débouchage gouttières'],
    visual_goal:   'Show a blocked downpipe being cleared — flexible drain rod being fed into the downpipe from the top, OR an expelled compacted debris plug at the pipe base. Distinguish from cleaning: the DOWNPIPE is blocked, there is standing water in the gutter at the inlet, and the fix targets the pipe interior not the open trough.',
    observable_action: 'Flexible drainage rod being fed into a blocked downpipe opening from the top. OR expelled compacted debris plug on the ground at the downpipe foot after clearance.',
    required_visual_evidence: [
      'downpipe as the primary subject — the vertical pipe running down the house wall',
      'flexible drainage rod sections disappearing into the downpipe from above, OR expelled debris plug at the pipe base',
      'standing water backed up in the gutter at the blocked downpipe inlet',
      'ladder at the downpipe head as access tool',
    ],
    forbidden_confusions: [
      'nettoyage gouttières — gutter scoop in the open trough, leaf debris being extracted (see Nettoyage)',
      'remplacement gouttières — new PVC sections being fitted, cordless drill, no blockage context',
      'débouchage downpipe vs open trough cleaning: here the issue is inside the vertical pipe, not in the open horizontal gutter channel',
    ],
    allowed_tools: [
      'flexible drainage rod sections being fed into the downpipe',
      'drain hook or needle nose tool at the downpipe inlet',
      'torch or phone light for inspecting inside the downpipe inlet',
      'ladder at the downpipe head',
      'plastic sheet at the downpipe base to contain expelled debris',
    ],
    forbidden_tools: [
      'gutter scoop (for open trough, not blocked pipe)',
      'cordless drill or fascia brackets (remplacement context)',
      'pressure washer (blocked pipe requires rodding, not jet)',
    ],
    work_surface: [
      'downpipe interior — the vertical pipe from gutter outlet to ground drain',
      'gutter outlet at the top of the downpipe showing the blockage',
    ],
    setting: ['exterior'],
    location_types: ['maison_individuelle', 'immeuble'],
    worker_rules: {
      presence: 'required',
      min: 1,
      max: 1,
      posture: 'standing on ladder at the downpipe head, feeding flexible rod into the inlet with both hands; OR crouching at the downpipe base examining the expelled debris',
    },
    safety: {
      required: [
        'ladder stabiliser keeping ladder top away from the gutter',
        'work gloves for handling drainage rod and expelled decomposed debris',
        'plastic sheet at the downpipe base to contain expelled silt and debris',
      ],
      conditional: [
        'safety glasses if rodding force may cause debris to spray back from the inlet',
      ],
      forbidden: [
        'worker standing on the gutter trough to access the downpipe inlet',
        'expelled debris left on pavement without containment sheet',
        'ladder feet on uneven ground without levelling stabiliser',
      ],
    },
    states: {
      debut: {
        observable_action: 'Blockage diagnosed. Standing water in gutter at inlet. Ladder in position.',
        required_visual_evidence: [
          'standing water backed up in the gutter trough at the downpipe inlet — blockage visible',
          'torch or inspection light held at the downpipe inlet — debris bridge visible inside',
          'ladder positioned at the downpipe head',
          'plastic sheet spread at the downpipe base to catch expelled material',
        ],
      },
      encours: {
        observable_action: 'Flexible rod being fed into blocked downpipe. Blockage being worked through.',
        required_visual_evidence: [
          'flexible drain rod disappearing into the downpipe from the gutter outlet',
          'standing water still present in gutter at the inlet — not yet clear',
          'rod sections being added or rotated to push through the blockage',
        ],
      },
      semifinal: {
        observable_action: 'Blockage broken through. Water beginning to run in gutter. Rod being withdrawn.',
        required_visual_evidence: [
          'standing water level in gutter beginning to drop — first water running into the pipe',
          'flexible rod being withdrawn from the downpipe',
          'debris plug beginning to appear at the pipe base or expelled onto the containment sheet',
        ],
      },
      final: {
        observable_result: 'Downpipe clear. Expelled debris plug visible at pipe base. Gutter draining freely.',
        required_visual_evidence: [
          'expelled compacted debris plug on the containment sheet at the downpipe base — clearly the blockage cause',
          'downpipe now flowing freely — water or dry pipe with no standing water in gutter',
          'gutter level returned to normal — no standing water at inlet',
          'flexible rod and equipment at the side — work complete',
        ],
      },
    },
    composition_preferences: ['close_detail', 'medium_intervention'],
    for_regex: 'debouchage.*gouttieres',
  },

  // ─── R12 ──────────────────────────────────────────────────────────────────────
  remplacement_gouttieres: {
    service_key:   'remplacement_gouttieres',
    service_label: 'Remplacement gouttières',
    covers_services: ['Remplacement gouttières', 'Pose gouttières'],
    visual_goal:   'Show new gutter sections being installed. New bright PVC or zinc gutter sections being clipped onto a row of new fascia brackets. Cordless drill fitting brackets. Old stained gutter sections removed and lying on the ground. This is an installation job, not a cleaning or unblocking job.',
    observable_action: 'New PVC gutter section being lifted and aligned with the row of fascia brackets along the eave. Cordless drill fixing new fascia bracket to the barge board. Old gutter sections on the ground below — removed before fitting new.',
    required_visual_evidence: [
      'new gutter section — bright, unweathered PVC or zinc — being lifted into position',
      'row of new fascia brackets already fitted to the board — new gutter clicking onto them',
      'cordless drill in use for fitting brackets or downpipe clips',
      'old removed gutter sections on the ground below — stained and weathered, contrast with new',
    ],
    forbidden_confusions: [
      'nettoyage gouttières — gutter scoop and leaf debris extraction, no new sections',
      'débouchage — flexible rod in pipe, no new sections',
      'réparation locale — silicone sealant at a single joint, the majority of the gutter stays; here a long section or full run is replaced',
    ],
    allowed_tools: [
      'cordless drill/screwdriver for fascia brackets and wall clips',
      'new PVC gutter section being clipped onto brackets',
      'new fascia brackets in packaging at the ladder shelf',
      'gutter clip tool for securing section',
      'level and tape measure for correct fall alignment',
      'hacksaw for cutting gutter section to length',
    ],
    forbidden_tools: [
      'gutter scoop or bucket of leaf debris (not a cleaning job)',
      'flexible drainage rod (not a blockage job)',
      'chemical sprayer',
    ],
    work_surface: [
      'eave fascia board — new brackets being fixed; new gutter section being clipped along the eave',
      'downpipe run on house wall — new pipe sections and wall clips being fitted',
    ],
    setting: ['exterior'],
    location_types: ['maison_individuelle', 'immeuble'],
    worker_rules: {
      presence: 'required',
      min: 1,
      max: 2,
      posture: 'standing on ladder at the fascia level, holding new gutter section with one hand and clipping it into brackets; or using cordless drill to fix bracket to fascia board',
    },
    safety: {
      required: [
        'ladder stabiliser keeping the ladder top clear of the new gutter',
        'work gloves for handling PVC and cut sections',
        'ladder footing on firm flat ground',
      ],
      conditional: [
        'second worker steadying the ladder base for runs above 4 m',
        'soft cloth over the ladder top to protect the new gutter section from ladder contact',
      ],
      forbidden: [
        'worker standing on the old gutter trough to reach the fascia board',
        'overreaching sideways from the ladder to clip a gutter section beyond arm\'s reach',
        'new gutter section balanced unsecured on the ladder top without holding',
      ],
    },
    states: {
      debut: {
        observable_action: 'Old gutter being removed. Fascia board exposed. New brackets being positioned.',
        required_visual_evidence: [
          'old gutter sections removed and lying on the ground below — stained and weathered',
          'bare fascia board exposed along the eave edge',
          'new fascia brackets being drilled and screwed to the board — first bracket in place',
          'new gutter sections and packaging on the ground below, not yet installed',
        ],
      },
      encours: {
        observable_action: 'Brackets fitted along the eave. New gutter sections being clipped onto them.',
        required_visual_evidence: [
          'row of new fascia brackets fitted and aligned along the fascia',
          'new gutter section being lifted and aligned with the bracket row',
          'gutter section clicking into the first bracket — worker aligning it',
          'part of the eave still without gutter — brackets visible but no gutter yet',
        ],
      },
      semifinal: {
        observable_action: 'Most gutter section fitted. Downpipe connection and end caps being completed.',
        required_visual_evidence: [
          'new gutter section fitted along most of the eave run',
          'gutter outlet adapter or downpipe connection being fitted',
          'end cap being clipped to the gutter at the far end',
          'last small section or stop end still to be fitted',
        ],
      },
      final: {
        observable_result: 'New gutter run fully installed. New downpipe running to drain. Bright clean profile along the eave.',
        required_visual_evidence: [
          'new bright gutter run complete along the full eave — clearly unweathered and clean',
          'new downpipe running straight from the gutter outlet to the ground drain',
          'all brackets, joints, and end caps visible and seated',
          'old gutter sections cleared from the ground — site tidy',
        ],
      },
    },
    composition_preferences: ['medium_intervention', 'wide_worksite'],
    for_regex: 'remplacement.*gouttieres|pose.*gouttieres',
  },

  // ─── R13 ──────────────────────────────────────────────────────────────────────
  reparation_fuite_toiture: {
    service_key:   'reparation_fuite_toiture',
    service_label: 'Réparation fuite toiture',
    covers_services: [
      'Réparation fuite toiture', 'Recherche de fuite', 'Infiltration toiture',
    ],
    visual_goal:   'Show a localised leak repair on a pitched or flat roof. A small zone of intervention: a few tiles removed and a membrane patch or sealant applied beneath. OR a damp stain or water trace being traced to its source. This is a targeted fix, not a full waterproofing campaign.',
    observable_action: 'A small cluster of tiles removed to access a failing underlayer or joint below. Membrane patch or bituminous sealant being applied to the localised failure zone. Surrounding tiles mostly intact.',
    required_visual_evidence: [
      'small localised intervention zone — fewer than 6 tiles removed or a compact area of membrane',
      'evidence of the leak cause: torn underlayer, failed membrane joint, cracked solin, or wet stain on substrate',
      'repair material being applied: bituminous patch, membrane strip, or sealant at the specific failure point',
      'surrounding roof intact — the repair is clearly contained',
    ],
    forbidden_confusions: [
      'étanchéité toit terrasse complète — full membrane surface, broad coverage (see Étanchéité toit terrasse)',
      'rénovation toiture — full tile stripping, full scaffold',
      'démoussage / nettoyage (no leak context, no repair material)',
      'solin repair only (wall junction only — here the leak may be anywhere on the pitched surface)',
    ],
    allowed_tools: [
      'bituminous sealant gun or tube for pointing the failure joint',
      'membrane patch strip being pressed onto the substrate',
      'torch or UV light for detecting wet stain extent',
      'putty knife or margin trowel',
      'tile lifter for the few tiles removed',
      'roof ladder for slope access',
    ],
    forbidden_tools: [
      'full membrane roll (too large — this is a patch, not a full refection)',
      'gas torch for torching full membrane runs',
      'full scaffold tower (scale is too large)',
    ],
    work_surface: [
      'pitched roof — small zone of 2–6 tiles removed; substrate or underlayer failure visible below',
      'OR flat roof surface — compact failure zone showing membrane crack or joint failure',
    ],
    setting: ['exterior'],
    location_types: ['maison_individuelle', 'immeuble', 'commerce'],
    worker_rules: {
      presence: 'optional',
      min: 0,
      max: 1,
      posture: 'kneeling or crouching at the localised repair zone, stabilised by roof ladder on pitched surface',
    },
    safety: {
      required: [
        'roof ladder on pitched surface — mandatory for slope access',
        'work gloves for bituminous material and membrane handling',
        'knee pad on tile surface near repair zone',
      ],
      conditional: [
        'safety harness if repair zone is near the eave edge or on a steep pitch',
        'scaffold platform if repair requires accessing a zone beyond roof ladder reach',
      ],
      forbidden: [
        'worker crouching on slope without roof ladder at high or steep pitch',
        'bituminous sealant or primer applied without gloves — skin and chemical risk',
      ],
    },
    states: {
      debut: {
        observable_action: 'Locating the failure. Small zone opened to expose the problem.',
        required_visual_evidence: [
          'small area opened — a few tiles removed or membrane cut back to reveal the failure point',
          'visible evidence of failure: torn underlayer, cracked joint, or rust-stained solin',
          'roof ladder in position for access',
          'repair materials unpacked nearby but not yet applied',
        ],
      },
      encours: {
        observable_action: 'Failure zone cleaned and prepared. Repair material being applied.',
        required_visual_evidence: [
          'failure area cleaned — old sealant or debris removed',
          'repair material being applied: sealant being gunned into the joint, or membrane strip being pressed down',
          'repair zone compact — surrounding area intact',
        ],
      },
      semifinal: {
        observable_action: 'Repair material applied. Tiles being replaced over the patch.',
        required_visual_evidence: [
          'fresh sealant or membrane patch applied and set at the failure zone',
          'replacement tiles being guided back over the repaired area',
          'most of the repair zone now re-covered',
        ],
      },
      final: {
        observable_result: 'Repair complete. Patch covered, tiles replaced. No open zone.',
        required_visual_evidence: [
          'tiles fully replaced over the repair zone — no open gap',
          'localised nature of the repair visible — a few reinstated tiles among unchanged surroundings',
          'roof surface intact above and below the repair',
          'no wet stain visible — repair complete',
        ],
      },
    },
    composition_preferences: ['close_detail', 'medium_intervention'],
    for_regex: 'reparation fuite|recherche.*fuite|infiltration.*toiture',
  },

  // ─── R14 ──────────────────────────────────────────────────────────────────────
  etancheite_toit_terrasse: {
    service_key:   'etancheite_toit_terrasse',
    service_label: 'Étanchéité toit terrasse',
    covers_services: [
      'Étanchéité toit terrasse', 'Étanchéité toiture plate',
      'Étanchéité EPDM', 'Étanchéité PVC', 'Étanchéité bitume',
      "Réfection d'étanchéité",
    ],
    visual_goal:   'Show large-scale flat roof waterproofing on a HORIZONTAL surface. Membrane rolls being laid across the full flat roof substrate. Parapet wall visible around the perimeter. This is broad surface coverage, not a localised patch. The roof plane is horizontal — no slope, no tiles.',
    observable_action: 'Membrane roll being unrolled across the flat roof substrate. Seam roller pressing lap joints. Primer being painted on substrate. Parapet upstand being sealed with flashing at the roof edge.',
    required_visual_evidence: [
      'HORIZONTAL flat roof surface as the primary subject — no tile slope visible',
      'membrane roll (bitumen, EPDM, or PVC) being unrolled or lap-joined across the surface',
      'parapet wall visible at the roof perimeter — defining the flat roof space',
      'broad surface coverage — multiple membrane sheets already laid, work extending across the area',
    ],
    forbidden_confusions: [
      'réparation fuite toiture — localised patch only (here the full surface is being treated)',
      'toiture inclinée tiles — any slope with tiles is NOT a flat roof waterproofing job',
      'étanchéité balcon/terrasse — smaller surface, balcony railing visible instead of parapet wall height',
      'solin or chimney repair — localised junction work, not full membrane surface',
    ],
    allowed_tools: [
      'seam roller for pressing membrane lap joints',
      'bitumen primer can and brush for substrate preparation',
      'utility knife for trimming membrane at the parapet edge',
      'tape measure and chalk snap line for membrane layout',
      'rubber setting blocks or pressure pad at parapet upstand',
    ],
    forbidden_tools: [
      'gas torch visible in image (excluded per safety constraints)',
      'tile lifter or roofer\'s slope tools',
      'gutter scoop',
      'stiff broom for moss (no moss treatment on flat roof)',
    ],
    work_surface: [
      'flat horizontal roof substrate — concrete screed, insulation board, or existing old membrane',
      'parapet perimeter and upstand at roof edges',
    ],
    setting: ['exterior'],
    location_types: ['maison_individuelle', 'immeuble', 'commerce'],
    worker_rules: {
      presence: 'optional',
      min: 0,
      max: 2,
      posture: 'walking and kneeling on the flat roof surface; working near the parapet edge for upstand sealing — no climbing on slope',
    },
    safety: {
      required: [
        'working distance of at least 2 m from any unguarded parapet edge during membrane laying',
        'work gloves for membrane handling and primer application',
        'non-slip footwear on potentially slippery membrane surface',
      ],
      conditional: [
        'temporary guardrail or safety line at parapet edge if parapet height is below 1 m',
        'edge protection when working within 2 m of the parapet for upstand sealing',
        'second worker for large membrane rolls requiring two-person handling',
      ],
      forbidden: [
        'worker running or rushing near the parapet edge on a flat roof',
        'primer or membrane adhesive stored near open flame or heat source',
        'worker standing on the parapet coping to apply upstand flashing without tie-off',
      ],
    },
    states: {
      debut: {
        observable_action: 'Old membrane stripped back. Substrate primed. First membrane roll being positioned.',
        required_visual_evidence: [
          'substrate visible — concrete screed or insulation board exposed after old membrane removed',
          'primer coat drying on part of the substrate — dark bituminous primer applied',
          'first membrane roll being positioned, ready to unroll',
          'parapet wall visible around the flat roof perimeter',
        ],
      },
      encours: {
        observable_action: 'Membrane sheets being unrolled and lap-jointed. Half the surface covered.',
        required_visual_evidence: [
          'half the flat roof covered in new membrane — clear boundary between new dark membrane and old grey substrate',
          'seam roller pressing the lap joint between two membrane sheets',
          'membrane rolls staged at the side for remaining coverage',
          'parapet wall visible in background with upstand sealing still to be done',
        ],
      },
      semifinal: {
        observable_action: 'Membrane fully laid across surface. Parapet upstand and edge flashings being sealed.',
        required_visual_evidence: [
          'full flat roof surface covered in new membrane — smooth, uniform dark surface',
          'parapet upstand being sealed — flashing strip or membrane turn-up being pressed and bonded',
          'drain outlets visible and being cleared of membrane offcuts',
          'membrane offcuts stacked near the parapet edge',
        ],
      },
      final: {
        observable_result: 'Complete flat roof waterproofing. Uniform membrane surface, sealed parapet, clear drains.',
        required_visual_evidence: [
          'complete flat roof surface — uniform dark membrane, no bare substrate patches',
          'parapet edges sealed with flashing or turn-up — neat and continuous',
          'drain outlets clear and unobstructed',
          'no membrane offcuts or debris on the finished surface',
        ],
      },
    },
    composition_preferences: ['wide_worksite', 'medium_intervention'],
    for_regex: 'etancheite toit|etancheite.*plate|etancheite.*(epdm|pvc|bitume)|refection.*etancheite',
  },

  // ─── R15 ──────────────────────────────────────────────────────────────────────
  etancheite_balcon: {
    service_key:   'etancheite_balcon',
    service_label: 'Étanchéité balcon',
    covers_services: ['Étanchéité balcon', 'Étanchéité terrasse'],
    visual_goal:   'Show waterproofing work on a balcony or ground-level terrace — a small HORIZONTAL surface at low height. Balcony railing visible at the perimeter. Garden or street visible just below the edge. Scale is compact (less than 20 m²), clearly domestic, not a full building flat roof.',
    observable_action: 'Membrane strip or liquid resin being applied to a balcony floor surface. Drain outlet being sealed. Edge flashing or upstand being pressed against the balcony parapet or wall base.',
    required_visual_evidence: [
      'compact horizontal surface — balcony floor or terrace slab, not a full flat roof',
      'balcony railing or low garden wall visible at the perimeter — clearly residential scale',
      'garden, driveway, or street visible just below or at the edge — confirms low height',
      'waterproofing material on the surface: membrane strip, resin coat, or liquid membrane brush',
    ],
    forbidden_confusions: [
      'étanchéité toit terrasse — full building flat roof, high parapet all around, no railing, no garden visible below at the same level',
      'carrelage terrasse — tile installation on terrace, not membrane waterproofing',
      'peinture terrasse — paint application, not membrane or resin waterproofing',
    ],
    allowed_tools: [
      'narrow seam roller for membrane strip',
      'brush or roller for liquid membrane or resin',
      'putty knife at drain outlet edge',
      'tape measure for membrane cutting',
      'bucket or tray of liquid waterproofing product',
    ],
    forbidden_tools: [
      'full membrane roll (scale too large for a balcony)',
      'gas torch',
      'tile lifter or grout tools (not tiling)',
    ],
    work_surface: [
      'balcony floor slab or terrace slab — compact horizontal surface',
      'drain outlet at balcony floor level',
      'upstand at wall base and parapet or railing base',
    ],
    setting: ['exterior'],
    location_types: ['maison_individuelle', 'appartement', 'immeuble'],
    worker_rules: {
      presence: 'optional',
      min: 0,
      max: 1,
      posture: 'kneeling or crouching on the balcony surface, working toward the drain or edge; low height, no fall risk from horizontal surface',
    },
    safety: {
      required: [
        'work gloves for membrane and resin handling',
        'kneeling board or foam pad on the slab to protect membrane from knee pressure',
      ],
      conditional: [
        'ensure balcony railing is in good condition before accessing — structural check',
        'respiratory protection if using solvent-based liquid membrane in confined balcony space',
      ],
      forbidden: [
        'worker leaning over the balcony railing to apply upstand on the outside face without fall protection',
        'liquid membrane applied in poor ventilation without vapour mask',
      ],
    },
    states: {
      debut: {
        observable_action: 'Old surface coating or membrane being removed. Substrate cleaned and primed.',
        required_visual_evidence: [
          'compact balcony or terrace slab exposed — old coating scraped back',
          'balcony railing visible at the perimeter',
          'garden or street visible at low height below the balcony edge',
          'primer or cleaning product being applied to the substrate',
        ],
      },
      encours: {
        observable_action: 'Membrane or resin being applied to the slab surface.',
        required_visual_evidence: [
          'brush or roller applying liquid membrane across part of the slab',
          'drain outlet area being carefully sealed',
          'covered area contrasting with still-raw substrate',
          'small bucket of product beside the work zone',
        ],
      },
      semifinal: {
        observable_action: 'Surface almost fully sealed. Upstand at wall base and drain being finished.',
        required_visual_evidence: [
          'most of the slab surface sealed — uniform membrane coat',
          'upstand strip at the wall-floor junction being pressed down',
          'drain outlet sealed with membrane collar',
        ],
      },
      final: {
        observable_result: 'Balcony fully waterproofed. Sealed surface, drain clear, upstand neat.',
        required_visual_evidence: [
          'full balcony or terrace slab sealed — uniform clean membrane surface',
          'drain outlet clear and unobstructed',
          'upstand at wall base neat and continuous',
          'balcony railing visible as confirmation of domestic scale',
        ],
      },
    },
    composition_preferences: ['medium_intervention', 'close_detail'],
    for_regex: 'etancheite balcon|etancheite terrasse',
  },

  // ─── R16 ──────────────────────────────────────────────────────────────────────
  reparation_solin_cheminee: {
    service_key:   'reparation_solin_cheminee',
    service_label: 'Réparation solin',
    covers_services: ['Réparation solin', 'Étanchéité cheminée'],
    visual_goal:   'Show the repair of the waterproof junction around a chimney stack on a pitched tiled roof. New zinc flashing being fitted at the chimney base. Fresh mortar at the flashing edge. Chimney brickwork and surrounding tiles as context. This is the CHIMNEY PERIMETER junction — all four sides of the chimney base.',
    observable_action: 'Old mortar at chimney base being chiselled out. New zinc flashing strip being dressed into the raked brick joint at the chimney foot. Fresh mortar being applied over the flashing edge.',
    required_visual_evidence: [
      'chimney stack visible as the central subject — brickwork rising from the tile surface',
      'chimney base junction — the zone where the chimney meets the surrounding tiles',
      'zinc flashing strip being fitted or fresh mortar/sealant applied at the chimney base perimeter',
      'surrounding pitched tiles intact — intervention localised to the chimney base',
    ],
    forbidden_confusions: [
      'faitage (ridge line — summit of the roof, horizontal, no chimney)',
      'solin contract R07 (wall-to-tile strip along a long wall run — not the compact chimney perimeter)',
      'réparation fuite toiture — here the focus is explicitly the chimney base junction, not a general tile zone',
      'zinguerie full metalwork job (here the metalwork is limited to the chimney base flashing only)',
    ],
    allowed_tools: [
      'cold chisel and club hammer for raking chimney mortar joint',
      'zinc flashing strip cut to length at the chimney base',
      'tin snips for trimming the zinc strip',
      'lead dresser or rubber mallet for pressing zinc into the raked joint',
      'pointing trowel and mortar for topping the flashing edge',
      'bituminous primer can and brush',
      'tube of bitumen mastic for secondary seal',
    ],
    forbidden_tools: [
      'tile lifter (no tiles replaced)',
      'gutter tools',
      'pressure washer',
    ],
    work_surface: [
      'chimney base perimeter — all four sides of the chimney where it meets the pitched tile surface',
      'raked mortar joint in chimney brickwork receiving the new zinc flashing top edge',
    ],
    setting: ['exterior'],
    location_types: ['maison_individuelle', 'immeuble'],
    worker_rules: {
      presence: 'optional',
      min: 0,
      max: 1,
      posture: 'kneeling or crouching on slope at the chimney base, stabilised by roof ladder hooked over the ridge; reaching around the chimney base on each side',
    },
    safety: {
      required: [
        'roof ladder hooked over the ridge for slope access',
        'safety harness recommended at chimney height — chimney base is typically near the mid-slope or upper slope',
        'safety glasses when chiselling mortar joint',
        'heavy-duty work gloves for zinc strip handling',
      ],
      conditional: [
        'scaffold platform if chimney is on a steep pitch or if the pitch is above 40°',
      ],
      forbidden: [
        'worker leaning around chimney without secure footing — reach each side separately with the roof ladder repositioned',
        'worker standing on top of the chimney stack',
        'zinc strip off-cuts left loose on the tile slope',
      ],
    },
    states: {
      debut: {
        observable_action: 'Old solin being removed. Chimney mortar joint being raked out.',
        required_visual_evidence: [
          'chisel at the old mortar joint around the chimney base',
          'old corroded or cracked solin zinc visible — rust staining on tiles',
          'old mortar chips on surrounding tiles around the chimney base',
          'chimney brickwork with efflorescence or water staining — evidence of the leak',
        ],
      },
      encours: {
        observable_action: 'New zinc strip being formed and pressed into the raked brick joint.',
        required_visual_evidence: [
          'zinc flashing strip being dressed into the raked chimney mortar joint',
          'lead dresser or tin snips in use at the chimney base',
          'partial completion — one or two sides of the chimney already re-flashed',
          'roof ladder beside the chimney on the slope',
        ],
      },
      semifinal: {
        observable_action: 'Zinc flashing complete around chimney. Mortar being applied over the top edge.',
        required_visual_evidence: [
          'zinc strip installed on all four sides of the chimney base',
          'trowel applying fresh mortar over the top edge of the zinc in the raked joint',
          'tiles around the chimney re-seated where they were lifted',
        ],
      },
      final: {
        observable_result: 'Chimney solin repair complete. New zinc flashing, fresh mortar pointing.',
        required_visual_evidence: [
          'new zinc flashing visible at the chimney base on all visible sides',
          'fresh grey mortar joint running over the zinc top edge into the brick',
          'surrounding tiles re-seated and flat',
          'no old rust staining or crumbled mortar remaining',
        ],
      },
    },
    composition_preferences: ['close_detail', 'medium_intervention'],
    for_regex: 'reparation solin|etancheite cheminee',
  },

  // ─── R17 ──────────────────────────────────────────────────────────────────────
  reparation_velux: {
    service_key:   'reparation_velux',
    service_label: 'Réparation Velux',
    covers_services: ['Réparation Velux'],
    visual_goal:   'Show the resealing of a Velux or roof window on a pitched tiled roof. The window frame is the primary subject — corner flashing pieces being replaced, dried sealant being scraped from the frame edge, or new peel-and-stick flashing kit components being fitted around the frame. Surrounding tiles intact.',
    observable_action: 'Putty knife scraping dried sealant from Velux frame edge. OR new corner flashing piece being pressed into the window frame-tile junction. OR sealant bead being applied along the frame inner edge.',
    required_visual_evidence: [
      'Velux or roof window frame as the primary subject — rectangular frame in the tile surface',
      'flashing repair at the frame edge: old sealant being removed, new flashing component being fitted, or fresh sealant being applied',
      'surrounding tiles on the pitched slope intact — localised repair around the window frame only',
      'old dried sealant strip or flashing component removed and placed aside on adjacent tile',
    ],
    forbidden_confusions: [
      'solin/chimney repair (wall junction or chimney — see R16; here the subject is a window frame set in the tile slope)',
      'réparation noue (valley between two slopes — see R18)',
      'réparation rive (gable edge — see R19)',
    ],
    allowed_tools: [
      'putty knife or scraper for removing old sealant from frame edge',
      'peel-and-stick flashing tape or kit components',
      'silicone gun for inner frame sealant bead',
      'rubber roller for pressing flashing flat on adjacent tile',
      'tin snips for trimming flashing component',
      'knee pad on tile surface',
    ],
    forbidden_tools: [
      'tile lifter (no tiles replaced)',
      'mortar bucket (no mortar on a Velux flashing repair)',
      'gutter tools',
    ],
    work_surface: [
      'Velux or roof window frame perimeter — frame corners and edge junctions with surrounding tiles',
      'peel-and-stick or formed flashing kit components around the frame',
    ],
    setting: ['exterior'],
    location_types: ['maison_individuelle', 'immeuble'],
    worker_rules: {
      presence: 'optional',
      min: 0,
      max: 1,
      posture: 'kneeling on roof slope beside the Velux frame, stabilised by roof ladder hooked over ridge; working around the frame edges within arm\'s reach',
    },
    safety: {
      required: [
        'roof ladder hooked over the ridge for slope access',
        'knee pad on tile surface at the Velux work zone',
        'work gloves when handling flashing tin components',
      ],
      conditional: [
        'safety harness if Velux is on a steep pitch or near the ridge',
      ],
      forbidden: [
        'worker standing on the Velux frame — structural damage risk',
        'applying sealant to a wet frame in rain — adhesion failure',
        'worker reaching over the full width of the Velux from one side without repositioning roof ladder',
      ],
    },
    states: {
      debut: {
        observable_action: 'Old sealant and flashing being removed from the frame edge.',
        required_visual_evidence: [
          'Velux frame with old dried sealant or old flashing components visible',
          'putty knife or scraper removing the old sealant from the frame corner',
          'old sealant strip curling off onto the adjacent tile',
          'surrounding tiles intact; roof ladder visible beside the window',
        ],
      },
      encours: {
        observable_action: 'New flashing components being fitted around the frame.',
        required_visual_evidence: [
          'flashing kit components laid on tiles around the window — corner pieces, side strips',
          'corner flashing piece being pressed into the frame-tile junction',
          'one or two sides of the window already re-flashed — sealed and neat',
          'kit packaging visible on the tile beside the window',
        ],
      },
      semifinal: {
        observable_action: 'Flashing complete on all sides. Inner frame sealant bead being applied.',
        required_visual_evidence: [
          'all frame corners with new flashing components installed',
          'silicone gun applying fresh sealant bead along the inner frame edge',
          'tiles re-seated on all sides of the Velux frame',
        ],
      },
      final: {
        observable_result: 'Velux repair complete. New flashing around full frame. Clean sealant bead.',
        required_visual_evidence: [
          'Velux frame fully re-flashed on all four sides',
          'fresh sealant bead along the inner frame edge — neat and uncured',
          'tiles flat and ordered on all sides of the window',
          'no old sealant residue remaining on the frame edge',
        ],
      },
    },
    composition_preferences: ['close_detail', 'medium_intervention'],
    for_regex: 'velux',
  },

  // ─── R18 ──────────────────────────────────────────────────────────────────────
  reparation_noue: {
    service_key:   'reparation_noue',
    service_label: 'Réparation noue',
    covers_services: ['Réparation noue'],
    visual_goal:   'Show valley (noue) repair on a pitched tiled roof — the drainage channel running diagonally between two meeting roof slopes. New zinc valley strip being positioned in the channel. Tiles lifted on either side of the valley to allow the new zinc to seat.',
    observable_action: 'Old corroded zinc valley strip being removed from between two tiled slopes. New zinc valley strip being laid into the exposed channel. Tiles lifted on either side being replaced over the new zinc.',
    required_visual_evidence: [
      'valley junction visible — two tiled roof slopes meeting at a diagonal channel between them',
      'tiles lifted on both sides of the valley to expose the channel',
      'zinc valley strip in the channel — old being removed or new being laid',
      'channel substrate visible between the lifted tile piles on either side',
    ],
    forbidden_confusions: [
      'faitage (ridge — horizontal summit line, not a diagonal valley between slopes)',
      'solin (wall-to-tile junction — not a valley between two tile surfaces)',
      'réparation rive (gable vertical edge — not a valley between slopes)',
      'rénovation toiture (scale is wrong — only the valley zone is being worked)',
    ],
    allowed_tools: [
      'zinc valley strip cut to length resting in the channel',
      'tin snips for trimming the valley strip',
      'tile lifter for lifting tiles on either side of the valley',
      'stiff brush for clearing old moss and debris from the valley channel',
      'mortar bucket for re-pointing valley tile edges after relay',
      'knee pad at the valley edge',
    ],
    forbidden_tools: [
      'rubber mallet for ridge tiles (not used at valley)',
      'gutter tools',
      'pressure washer',
    ],
    work_surface: [
      'valley channel between two pitched tile slopes — diagonal drainage line',
      'tiles lifted on both sides of the valley; channel substrate exposed',
    ],
    setting: ['exterior'],
    location_types: ['maison_individuelle', 'immeuble'],
    worker_rules: {
      presence: 'optional',
      min: 0,
      max: 1,
      posture: 'kneeling at the valley junction, one knee on each slope, stabilised by the knee pad and the tile surface; roof ladder positioned to one side of the valley',
    },
    safety: {
      required: [
        'roof ladder hooked over the ridge and positioned to the side of the valley',
        'knee pad on tile surface at the valley edge',
        'heavy-duty gloves for zinc strip handling',
        'safety glasses when chiselling old mortar at valley tile edges',
      ],
      conditional: [
        'safety harness if valley runs from ridge to eave on a steep pitch',
      ],
      forbidden: [
        'worker standing in the valley channel — structural risk to the zinc base',
        'loose tiles stacked unsecured on the steep slope beside the valley',
        'zinc off-cuts left on the slope without containment',
      ],
    },
    states: {
      debut: {
        observable_action: 'Tiles being lifted on both sides of the valley. Old zinc being removed.',
        required_visual_evidence: [
          'tiles lifted and stacked on the tile surface beside the valley on both sides',
          'valley channel exposed between the lifted areas',
          'old corroded zinc strip being pulled from the channel — corrosion visible',
          'old debris and moss cleared from the channel floor',
        ],
      },
      encours: {
        observable_action: 'New zinc valley strip being laid into the exposed channel.',
        required_visual_evidence: [
          'new zinc strip being positioned along the exposed valley channel',
          'tiles on both sides still lifted, channel accessible',
          'zinc strip being adjusted to sit flat in the channel floor',
          'tin snips or mallet beside the work zone',
        ],
      },
      semifinal: {
        observable_action: 'Zinc positioned. Tiles being re-laid on both sides over the new zinc.',
        required_visual_evidence: [
          'new zinc in the valley channel — glistening and unweathered',
          'tiles being re-laid on one side over the new zinc edges',
          'other side tiles still lifted, awaiting relay',
        ],
      },
      final: {
        observable_result: 'Valley repair complete. New zinc in channel, tiles re-laid on both sides.',
        required_visual_evidence: [
          'new zinc valley strip visible in the channel between the re-laid tiles',
          'tiles flat and in position on both sides of the valley',
          'fresh mortar smear at the tile-valley edge from pointing',
          'valley channel clean — no debris or old zinc remaining',
        ],
      },
    },
    composition_preferences: ['close_detail', 'medium_intervention'],
    for_regex: 'reparation noue',
  },

  // ─── R19 ──────────────────────────────────────────────────────────────────────
  reparation_rive_acrotere: {
    service_key:   'reparation_rive_acrotere',
    service_label: 'Réparation rive',
    covers_services: ['Réparation rive', 'Étanchéité acrotère'],
    visual_goal:   'For réparation rive: show gable-edge (rive) tile repointing or resealing — the row of tiles at the vertical side edge of the pitched roof. For étanchéité acrotère: show the parapet cap or acroterion on a flat roof being resealed — the horizontal coping element at the top of the parapet wall.',
    observable_action: 'For rive: pointing trowel applying fresh mortar along the gable tile row at the roof verge edge. For acrotère: sealant gun applying sealant at the acrotère base or coping joint on a flat roof parapet.',
    required_visual_evidence: [
      'for réparation rive: gable edge of pitched roof — the row of rive tiles along the vertical side where the slope meets the gable wall; fresh mortar joints being applied',
      'for étanchéité acrotère: flat roof parapet top coping or upstand cap — horizontal element at the parapet summit being sealed',
      'localised perimeter work — not the full roof surface',
    ],
    forbidden_confusions: [
      'faitage (ridge summit — horizontal apex line, not the vertical gable edge)',
      'solin (wall-to-tile junction along the roof slope — not the gable verge)',
      'noue (valley between two slopes — not the gable edge)',
      'full parapet waterproofing on flat roof (here only the acrotère coping joint is being sealed)',
    ],
    allowed_tools: [
      'pointing trowel and mortar bucket for rive tile repointing',
      'cold chisel for raking old mortar at gable tile edge',
      'sealant gun for acrotère coping joint',
      'putty knife for old sealant removal',
      'roof ladder for slope access (rive) or access ladder for flat roof parapet (acrotère)',
    ],
    forbidden_tools: [
      'tile lifter (no tiles replaced at rive — only pointing)',
      'membrane roll (too large for a coping joint repair)',
      'gutter tools',
    ],
    work_surface: [
      'for rive: gable verge edge — row of rive tiles at the lateral edge of a pitched slope',
      'for acrotère: parapet top coping — the cap element at the summit of a flat roof parapet wall',
    ],
    setting: ['exterior'],
    location_types: ['maison_individuelle', 'immeuble'],
    worker_rules: {
      presence: 'optional',
      min: 0,
      max: 1,
      posture: 'kneeling at the gable edge on slope via roof ladder (rive), or standing at the flat roof parapet accessing the coping from the flat roof side (acrotère)',
    },
    safety: {
      required: [
        'roof ladder hooked over ridge for gable edge access (rive)',
        'work gloves for mortar and sealant handling',
        'safety glasses when chiselling old mortar',
      ],
      conditional: [
        'for acrotère: ensure worker does not lean over the parapet top without a safety line — fall risk to the outside',
        'scaffold platform for rive work at high gable ends (above 6 m)',
      ],
      forbidden: [
        'worker leaning over the gable end of the roof without the roof ladder as anchor',
        'worker sitting on top of the parapet coping for acrotère work — fall risk to both sides',
        'mortar bucket placed on the tile slope without a holder',
      ],
    },
    states: {
      debut: {
        observable_action: 'Old mortar or sealant being raked from rive joint or acrotère coping.',
        required_visual_evidence: [
          'for rive: chisel at the old mortar joint of a gable tile — fragments on tile surface',
          'for acrotère: old sealant at the parapet coping joint being removed — dried bead being cut out',
          'localised zone — surrounding surface undisturbed',
          'roof ladder visible on slope (rive) or flat roof edge context (acrotère)',
        ],
      },
      encours: {
        observable_action: 'Fresh mortar or sealant being applied along the rive or acrotère joint.',
        required_visual_evidence: [
          'trowel or sealant gun applying fresh material to the joint',
          'new bead or mortar joint building along the rive or coping',
          'some joints done, others still raw — progressive work visible',
        ],
      },
      semifinal: {
        observable_action: 'Most joints repointed. Last section being finished.',
        required_visual_evidence: [
          'most of the rive or acrotère joint freshly repointed',
          'last tiles or coping section still to be pointed at one end',
          'fresh mortar or sealant grey and wet — recently applied',
        ],
      },
      final: {
        observable_result: 'Rive or acrotère repair complete. Continuous fresh joint along the perimeter edge.',
        required_visual_evidence: [
          'continuous fresh mortar or sealant joint running the full rive or acrotère length',
          'for rive: gable tiles all bedded and aligned — no displaced or loose tiles',
          'for acrotère: coping joint fully sealed — no open crack',
          'surrounding surface undisturbed',
        ],
      },
    },
    composition_preferences: ['close_detail', 'medium_intervention'],
    for_regex: 'reparation rive|acrotere',
  },

};

// ─── Regex de routage — testées contre les 39 services du cluster ─────────────
export const RTG_FOR_PATTERNS = {
  renovation_toiture:          /renovation.*toiture|refection.*toiture|couverture.*neuve/i,
  reparation_toiture:          /reparation toiture/i,
  remplacement_tuiles:         /remplacement (tuiles|ardoises)/i,
  charpente_combles:           /charpente|isolation.*comble/i,
  faitage:                     /faitage/i,
  zinguerie:                   /zinguerie/i,
  solins:                      /^solins$/i,
  demossage_toiture:           /demoussage|nettoyage.*toiture/i,
  hydrofuge_toiture:           /hydrofuge.*toiture|traitement.*toiture|anti.mousse/i,
  nettoyage_gouttieres:        /nettoyage.*gouttieres|entretien.*gouttieres/i,
  debouchage_gouttieres:       /debouchage.*gouttieres/i,
  remplacement_gouttieres:     /remplacement.*gouttieres|pose.*gouttieres/i,
  reparation_fuite_toiture:    /reparation fuite|recherche.*fuite|infiltration.*toiture/i,
  etancheite_toit_terrasse:    /etancheite toit|etancheite.*plate|etancheite.*(epdm|pvc|bitume)|refection.*etancheite/i,
  etancheite_balcon:           /etancheite balcon|etancheite terrasse/i,
  reparation_solin_cheminee:   /reparation solin|etancheite cheminee/i,
  reparation_velux:            /velux/i,
  reparation_noue:             /reparation noue/i,
  reparation_rive_acrotere:    /reparation rive|acrotere/i,
};

// ─── Méta ─────────────────────────────────────────────────────────────────────
export const RTG_META = {
  metier_cluster:   'toiture / étanchéité / gouttières',
  version:          1,
  contract_count:   19,
  service_count:    39,
  catalog_source:   'src/image-generation/config/service-catalog.js',
  canonical_source: 'src/image-generation/services/roof-waterproofing-gutter-contracts.js',
  metiers_covered: ['toiture', 'nettoyage_toiture', 'nettoyage_gouttieres', 'etancheite'],
  risk_pairs: [
    {
      pair: ['demossage_toiture', 'hydrofuge_toiture'],
      risk: 'Both involve pitched roof + tarp. Differentiated by: thick moss being physically scraped (broom/scraper) vs clean/lightly soiled tiles being sprayed with product (backpack sprayer + lance); debris falling onto tarp vs chemical runoff in tarp; dark mossy then bare tile contrast vs uniformly darkening tiles with product rivulets.',
    },
    {
      pair: ['reparation_fuite_toiture', 'etancheite_toit_terrasse'],
      risk: 'Both apply membrane/sealant. Differentiated by: localised zone of 2–6 tiles on pitched or flat roof vs full horizontal flat roof surface with parapet; tile context visible vs no tiles, only horizontal membrane; compact repair vs broad surface coverage.',
    },
    {
      pair: ['nettoyage_gouttieres', 'debouchage_gouttieres'],
      risk: 'Both work at the gutter run with ladder. Differentiated by: open trough with gutter scoop extracting leaf debris vs flexible rod being fed into the downpipe inlet; standing water at the inlet in débouchage; expelled debris plug at the pipe base vs leaf pile on ground.',
    },
    {
      pair: ['nettoyage_gouttieres', 'remplacement_gouttieres'],
      risk: 'Both use a ladder at the eave. Differentiated by: gutter scoop and wet leaf debris vs cordless drill and bright new PVC sections; old stained gutter still in place vs old gutter on the ground replaced; cleaning result vs new profile visible.',
    },
    {
      pair: ['faitage', 'remplacement_tuiles'],
      risk: 'Both involve mortar and tile handling on a pitched roof. Differentiated by: ridge apex as subject with ridge tiles being bedded in mortar vs slope tiles 1–3 pieces with tile lifter; ridge line horizontal vs localised slope zone; mortar work at the summit vs tile lifter tool on the slope.',
    },
    {
      pair: ['solins', 'reparation_solin_cheminee'],
      risk: 'Both seal a wall-to-tile junction. Differentiated by: long wall base strip (straight line along a dormer or abutment wall) vs compact chimney perimeter (all four sides of a chimney stack); solin is a narrow bead along a run; cheminée involves chimney raking, zinc forming around all four corners.',
    },
    {
      pair: ['etancheite_toit_terrasse', 'etancheite_balcon'],
      risk: 'Both waterproof horizontal surfaces with membrane. Differentiated by: full flat roof with high parapet wall all around vs compact balcony/terrace with railing; garden/street visible at low height in balcon vs no ground visible below the parapet in toit terrasse; scale of surface area.',
    },
    {
      pair: ['reparation_noue', 'faitage'],
      risk: 'Both are linear junctions on a pitched roof. Differentiated by: valley is a diagonal channel running between two sloping surfaces with tiles on both sides vs ridge is the horizontal summit with ridge tiles at the apex; noue channels water down; faitage runs across the top.',
    },
  ],
};
