/**
 * rules.js — Règles visuelles et de sécurité par métier
 */

const SAFETY_RULES = {
  toiture: `SAFETY RULES — Roofing: Minimum 2 workers visible. MANDATORY ROOF LADDER RULE: If a roofer is working on the roof slope, the roof ladder MUST reach all the way up and have its top ridge hooks (crochets de faîtage) SECURELY HOOKED OVER THE TOP RIDGE OF THE ROOF (faîtage). NEVER allow a roof ladder that stops floating mid-slope without being hooked over the ridge! IF THE LADDER IS NOT HOOKED OVER THE TOP RIDGE, THEN BOTH WORKERS MUST STAND AT GROUND LEVEL (in the yard/driveway), looking up at the roof structure, carrying replacement terracotta tiles, or preparing tools at ground level. ABSOLUTE PROHIBITION: NO unhooked mid-slope ladders, NO loose stacks of tiles floating on open laths. Connected safety harness is MANDATORY for any worker on roof slope.`,
  nettoyage_toiture: `SAFETY RULES — Roof cleaning & Moss removal: Minimum 2 workers visible. Worker on roof ladder MUST have the ladder top ridge hooks SECURELY HOOKED OVER THE TOP RIDGE (faîtage), with connected safety harness. IF NOT HOOKED AT THE TOP RIDGE, BOTH WORKERS MUST STAY AT GROUND LEVEL operating the pressure washer or inspecting the roof from below. Hard hat MANDATORY. NEVER: unhooked ladder floating mid-roof, worker standing freely on tiles without harness.`,
  nettoyage_terrasse: `SAFETY RULES — Terrace / Deck cleaning: Ground level work on outdoor patio/deck/driveway. NO HARD HAT / NO HELMET on head (bare head or casual cap). High-pressure washer or patio cleaner attachment in use. Waterproof boots, work trousers. NEVER: bare feet, jet aimed at people.`,
  nettoyage_facade: `SAFETY RULES — Facade cleaning: High-pressure washer or softwash lance aimed at exterior wall. Scaffold or ground level. Hard hat MANDATORY if under scaffold. Safety goggles/visor + work boots.`,
  nettoyage_gouttieres: `SAFETY RULES — Gutter cleaning: NEVER: worker standing on gutter channel, on top ladder rung, dangerously leaning sideways, improvised access (chair, crate). ALLOWED: simple ladder, 1 worker.`,
  etancheite: `SAFETY RULES — Waterproofing & Roof Sealing: Single-family house terrace/balcony: 1 worker, NO HARD HAT / NO HELMET on head (bare head or cap). Warehouse / Building flat roof: minimum 2 workers, hard hats + high-vis vests + safety boots. EPDM membrane, PVC or bitumen rolls being torched/welded or applied with roller. NEVER: worker standing on parapet edge, blowtorch aimed toward another worker, access hatch blocked by rolls.`,
  ravalement: `SAFETY RULES — Facade rendering: Scaffold above 2m: mandatory guardrail on void side. NEVER: worker leaning beyond guardrail.`,
  maconnerie: `SAFETY RULES — Masonry: NEVER: worker above unfinished wall at more than 1.5m without scaffold. All workers ground level beside wall (max 1.0-1.2m during block construction).`,
  elagage: `SAFETY RULES — Tree Pruning & Trimming: MANDATORY PROPORTION & EQUIPMENT LOGIC BASED ON TREE HEIGHT:
(A) FOR TALL HIGH-CANOPY TREES (Arbre haute tige / Grand arbre > 6-8m): Minimum 2 workers (1 climber high in upper crotch, 1 ground assistant holding rope). Climber: arborist helmet + climbing harness + ropes anchored high in main tree fork.
(B) FOR SMALL/MEDIUM GARDEN TREES & FRUIT TREES (Petit/moyen arbre de jardin < 5m): NO HEAVY CLIMBING HARNESS! NO ROPES IN TREE! The gardener/pruner MUST use a double A-frame garden step-ladder (escabeau double de jardin) or stand at ground level using a pole pruner or hand saw/secateurs. MANDATORY SAFETY GLASSES / PROTECTIVE GOGGLES on all workers' faces.
NEVER: Put heavy climbing harnesses, ropes or climbing spurs on a small garden tree reachable with a stepladder! NEVER: person in fall zone of branch being cut.`,
  abattage: `SAFETY RULES — Tree felling & Chainsaw work: MANDATORY SAFETY GLASSES / PROTECTIVE VISOR on operator's face (eye protection against flying sawdust). Chainsaw operator beside trunk wearing logger helmet with visor/glasses + chainsaw protection trousers + boots. Assistant at safe distance. NEVER: chainsaw held above shoulder level, person in frontal fall direction of tree.`,
  terrassement: `SAFETY RULES — Earthworks & Excavation: MANDATORY SAFETY GLASSES / PROTECTIVE GOGGLES on all workers' faces. MANDATORY NOISE-CANCELING EAR PROTECTION / EARMUFFS on workers operating noisy machinery (mini-excavator, hydraulic breaker, trencher, compactor). Minimum 2 workers. NEVER: person in open trench under bucket, person between rotating cab and trench edge.`,
  dessouchage: `SAFETY RULES — Tree Stump Removal & Root Grinding: MANDATORY SAFETY GLASSES / PROTECTIVE GOGGLES on all workers' faces (eye protection mandatory against flying wood chips and root debris). MANDATORY NOISE-CANCELING EAR PROTECTION / EARMUFFS on operator when operating stump grinder or heavy digging equipment. Minimum 2 workers (1 operator, 1 ground assistant). NEVER: worker standing in direct path of flying wood chips.`,
  paysagiste: `SAFETY RULES — Landscaping, Woodwork & Hedge Trimming: MANDATORY SAFETY GLASSES / PROTECTIVE GOGGLES on all workers' faces (eye protection mandatory for cutting hedges and wood). NO HARD HAT / NO HELMET on head for ground hedge trimming (bare head or casual cap/ear defenders). Hedge trimmer or lawnmower in use. Work trousers and gloves. NEVER: lawnmower on steep unstable slope, chainsaw operated without leg protection.`,
  nettoyage: `SAFETY RULES — Exterior cleaning: Ground level work. NO HARD HAT on head. NEVER: high-pressure jet aimed at person, bare feet during cleaning.`,
  vitrier: `SAFETY RULES — Glazier: Cut-resistant safety gloves and protective safety glasses/goggles MANDATORY when handling glass panes. Glass suction cup lifters MUST be firmly attached to the flat central surface of the glass pane (held by glazier hands), NEVER floating mid-air or overlapping window frames. NO HARD HAT / NO HELMET on head (bare head or casual cap). Outdoor height intervention (scaffolding/basket): hard hat mandatory. NEVER: bare hands touching glass edge, glass pane resting unsupported on wall.`,
  depannage_auto: `SAFETY RULES — Auto breakdown: Off-road mandatory, warning triangle visible. NEVER: person between vehicle and traffic, cables crossing road, vehicle raised without axle stands.`,
  charpente: `SAFETY RULES — Carpentry & Woodwork: MANDATORY SAFETY GLASSES / PROTECTIVE GOGGLES on all workers' faces (eye protection against wood dust). Wooden roof trusses or rafters visible, minimum 2 carpenters working with circular saw or nail gun, safety harness connected, hard hats mandatory. NEVER: roof ladder as structural platform, worker balancing on rafters without platform, lone worker carrying heavy piece.`,
  debarras: `SAFETY RULES — House & Junk Clearance: Utility van or skip container parked outside property. Minimum 1 or 2 movers carrying furniture or boxes in work gloves and sturdy boots. NO HARD HAT / NO HELMET on head (bare head or casual cap). NEVER: lone worker carrying oversized furniture dangerously on stairs, blocked exit path, sharp glass carried without gloves.`,
};

const VISUAL_RULES_BY_SERVICE = {
  'Taille de haie': `VISUAL: MANDATORY SAFETY GLASSES / PROTECTIVE GOGGLES on all workers' eyes. Exactly 2 workers in duo working together on hedge trimming (never 1 solo, never 3+). WORKER POSITION: Both workers MUST stand at ground level OR on a low A-frame garden step-ladder (escabeau de jardin en A). ABSOLUTE PROHIBITION: NO tall straight extension ladders leaning against hedges or walls! NO worker standing dangerously on top rung of a tall ladder leaning against bushes. Hedge trimmer visible, hedge in frame.`,
  'Taille arbre haute tige': `VISUAL: TALL TREE (Arbre haute tige > 8m): MANDATORY SAFETY GLASSES on climber and assistant. Arborist climbing harness + ropes anchored high in main crotch. Realistic human-to-tree scale mandatory.`,
  'Elagage arbre': `VISUAL: SMALL/MEDIUM GARDEN TREE (< 5m): Gardener standing on a double A-frame garden step-ladder (escabeau double de jardin) or at ground level trimming branches with hand saw or secateurs. NO CLIMBING HARNESS! NO ROPES ON TRUNK! MANDATORY SAFETY GLASSES on eyes.`,
  'Elalgage en hauteur': `VISUAL: TALL TREE (High-canopy > 8m): Climbing harness + ropes anchored high in main crotch. Minimum 2 workers.`,
  'Reparation toiture': `VISUAL: Targeted roof tile repair. Roofer on roof-ladder (SECURELY HOOKED AT TOP RIDGE WITH RIDGE HOOKS) replacing 1 or 2 damaged tiles, or both roofers standing at ground level inspecting roof. Spare terracotta tiles sitting nearby. ABSOLUTE PROHIBITION: NO unhooked ladder floating mid-slope!`,
  'Renovation tuiles toiture': `VISUAL: Mostly finished tiled roof with roofer on roof ladder HOOKED OVER TOP RIDGE (faîtage) performing tile maintenance, or both workers at ground level handling tiles.`,
  'Changement tuiles': `VISUAL: Targeted tile replacement. Roofer on roof ladder HOOKED OVER TOP RIDGE replacing 1 or 2 broken tiles, or 2 roofers at ground level preparing new terracotta tiles. ABSOLUTE PROHIBITION: NO unhooked ladder floating mid-roof!`,
  'Reparation tuiles': `VISUAL: Targeted tile repair. Roofer on roof ladder HOOKED OVER TOP RIDGE replacing 1 or 2 damaged tiles on a fully tiled roof, or 2 roofers at ground level observing roof. ABSOLUTE PROHIBITION: NO unhooked ladder floating mid-roof!`,
  'Remplacement tuiles': `VISUAL: Targeted tile replacement. Roofer on roof ladder HOOKED OVER TOP RIDGE replacing 1 or 2 broken terracotta tiles on slope, or 2 roofers at ground level handling tiles. ABSOLUTE PROHIBITION: NO unhooked ladder floating mid-roof!`,
  'Faitage et Rive': `VISUAL: Roofers working specifically on top ridge capping tiles (faîtage) or verge/bargeboard tile edging (rive) with mortar or zinc flashing, minimum 2 workers with connected harnesses.`,
  'Charpente': `VISUAL: Wooden roof trusses or rafters visible, minimum 2 carpenters working with circular saw or nail gun, safety harness connected, hard hats mandatory.`,
  'Nettoyage gouttieres': `VISUAL: Gutter visible and accessible, active intervention at gutter or downpipe level.`,
  'Debouchage gouttieres': `VISUAL: Gutter and downpipe visible, active intervention at downpipe level.`,
  'Ravalement facade': `VISUAL: Scaffold visible, worker applying render with float, freshly applied coat on part of facade.`,
  'Demossage toiture': `VISUAL: Moss or lichen visible on tiles, worker NOT standing freely on slope.`,
  'Mur parpaing': `VISUAL: Grey concrete blocks, worker at ground level, trowel and mortar visible.`,
  'Mur brique': `VISUAL: Red or orange bricks, mortar between joints, worker laying bricks at ground level.`,
  'Rejointoiement': `VISUAL: Joints between elements visible, grouting gun or trowel in use, no paint on facade.`,
  'Rejointoiement pierre': `VISUAL: Natural stone wall, targeted joints, mortar tool visible.`,
  'Coulage dalle': `VISUAL: Liquid concrete being poured, wooden formwork, rebar mesh visible, minimum 2 workers, worker NEVER in fresh concrete. If a pump hose or chute is shown, it must be realistically connected to a visible concrete truck or mixer chute, NEVER floating in mid-air from nowhere.`,
  'Dalle beton': `VISUAL: Concrete slab, formwork, rebar or mesh preparation, worker at ground level.`,
  'Fondation': `VISUAL: Excavation visible, reinforcement or poured concrete in foundation.`,
  'Semelle beton': `VISUAL: Footing trench visible, reinforcement or poured concrete.`,
  'Ferraillage': `VISUAL: Metal rebar, tie wire, worker assembling bars.`,
  'Escalier beton': `VISUAL: Stair formwork visible, steps being formed.`,
  'Reparation fissure': `VISUAL: Crack visible on facade or wall, worker with patching material.`,
  'Linteau': `VISUAL: Opening in wall, lintel on 2 supports, temporary shoring visible.`,
  'Etancheite toit terrasse': `VISUAL: Flat rooftop, waterproofing membrane visible (EPDM, PVC or bitumen), propane blowtorch or resin roller in use, rolls of membrane stacked neatly.`,
  'Etancheite PVC': `VISUAL: Flat roof or terrace, workers unrolling and welding grey PVC synthetic waterproofing membrane, hot air welding gun, minimum 2 workers.`,
  'Inondation': `VISUAL: Water extraction / flood recovery, wet floor, industrial water pump or vacuum, workers in rubber boots drying/repairing wall or floor.`,
  'Infiltration': `VISUAL: Water leak / infiltration repair, targeted sealant or waterproofing membrane application on wall or ceiling.`,
  'Etancheite maison': `VISUAL: Single-family home terrace or flat extension, 1 worker applying waterproofing membrane or liquid resin with roller, bare-headed or in cap.`,
  'Etancheite entrepot': `VISUAL: Large commercial warehouse flat roof, minimum 2 workers in hard hats and high-vis vests unrolling bitumen membranes and using propane blowtorch on large flat surface.`,
  'Peinture salle de bain': `VISUAL: Painter painting bathroom wall or ceiling, moisture-resistant paint, roller, stepladder, drop cloth protecting bathroom tiles and sink.`,
  'Peinture cuisine': `VISUAL: Painter painting kitchen wall, paint roller, masking tape around splashback, drop cloths protecting countertops.`,
  'Peinture chambre': `VISUAL: Painter painting bedroom or living room wall, paint roller, stepladder, paint tray, drop cloth protecting floor.`,
  'Faience': `VISUAL: Wall tiling / ceramic faience splashback being installed in kitchen or bathroom, tile spacers, adhesive trowel, tiler applying wall tile.`,
  'Carrelage sol': `VISUAL: Floor tiling installation, tile spacers, spirit level, adhesive mortar, tiler laying floor tile on ground.`,
  'Carrelage salle de bain': `VISUAL: Tiler installing floor or wall ceramic tiles in bathroom, tile spacers, trowel.`,
  'Carrelage cuisine': `VISUAL: Tiler installing kitchen floor tiles or wall splashback, tile spacers, trowel.`,
  'Dessouchage': `VISUAL: MANDATORY SAFETY GLASSES / PROTECTIVE GOGGLES on all workers' eyes against flying wood debris. MANDATORY NOISE-CANCELING EAR PROTECTION / EARMUFFS on operator. Stump and roots visible, stump grinder or digging equipment, wood chips around.`,
  'Abattage arbre': `VISUAL: Operator beside trunk, chainsaw visible, protective clothing, felled sections on ground.`,
  'Depannage auto': `VISUAL: Flatbed tow truck or recovery vehicle with orange flashing beacons, breakdown car safely positioned on roadside or flatbed ramp, operator in high-vis vest.`,
  'Remorquage': `VISUAL: Car being secured onto flatbed tow truck with winch or wheel straps, operator in high-vis vest operating control panel.`,
  'Changement batterie': `VISUAL: Open car bonnet/hood, portable booster pack or jumper cables, technician in workwear.`,
  'Changement roue': `VISUAL: Car safely parked on roadside, trolley jack under sills, wheel brace or impact wrench in use.`,
  'Debarras maison': `VISUAL: Utility van with open rear doors or skip container, neat stacks of cardboard boxes and old furniture being loaded by mover in work gloves.`,
  'Enlevement encombrants': `VISUAL: Utility truck or van, movers in workwear loading bulky items or boxes from driveway or garage.`,
  'Debarras cave': `VISUAL: Basement or garage clearance in progress, boxes, shelving or old items stacked neatly for loading.`,
  'Remplacement vitrage': `VISUAL: Glazier wearing cut-resistant gloves and safety glasses holding 2 heavy-duty suction cup lifter handles firmly attached to the flat central glass pane surface to position double glazing into frame.`,
  'Reparation vitre': `VISUAL: Glazier wearing protective glasses and cut-resistant gloves holding suction lifter handle attached on central glass surface, applying silicone sealant to frame.`,
  'Pose miroir': `VISUAL: Large mirror being mounted on wall, glazier holding dual suction cup lifters attached flat on mirror surface, wearing safety glasses and gloves.`,
  'Nettoyage terrasse': `VISUAL: Ground level patio/deck cleaning, pressure washer lance or patio cleaner attachment in use, clean wet tiles contrast with uncleaned area. Operator bare-headed or in cap, work boots. ABSOLUTE FORBIDDEN: NO jackhammers, NO concrete demolition tools.`,
  'Nettoyage facade': `VISUAL: Exterior house wall being washed with pressure lance, visible contrast between clean rendered wall and unwashed section. Operator in work boots. ABSOLUTE FORBIDDEN: NO jackhammers, NO concrete demolition tools.`,
  'Nettoyage': `VISUAL: High-pressure washer spray lance in use cleaning exterior ground surface or wall, water spray visible. ABSOLUTE FORBIDDEN: NO jackhammers, NO concrete demolition tools, NO jackhammering.`,
  'Nettoyage haute pression': `VISUAL: High-pressure washer spray lance in use cleaning exterior ground surface or wall, water spray visible. ABSOLUTE FORBIDDEN: NO jackhammers, NO concrete demolition tools, NO jackhammering.`,
};

// Imperfections physiques d'appareil photo smartphone (doigt, verre gras, poussière...)
const CAMERA_IMPERFECTIONS = [
  'slight blur on extreme corner as if a fingertip is partially blocking the lens edge',
  'slightly smudged or greasy lens causing soft light bloom around highlights',
  'subtle dust speck or water droplet mark on the camera lens',
  'minor lens flare and slight overexposure from natural sunlight',
  'slightly crooked horizon and candid hand-held tilt',
];

function getCompositionRules(metier, travaux, etatChantier) {
  const normalize = (s) => (s || '').toLowerCase()
    .replace(/[éèê]/g, 'e').replace(/[àâ]/g, 'a')
    .replace(/[îï]/g, 'i').replace(/[ôö]/g, 'o');
  
  const combined = normalize(metier) + ' ' + normalize(travaux);
  const isDebarras = combined.includes('debarras') || combined.includes('encombrant');
  const isIndoor = ['plomberie', 'electricite', 'peinture', 'carrelage', 'placo', 'parquet', 'serrurerie', 'menuiserie', 'salle de bain', 'cuisine', 'escalier', 'vitrier'].some(t => combined.includes(t));

  let framingRule;
  if (isDebarras) {
    framingRule = 'CLEARANCE FRAMING (Débarras & Encombrants): Photo can be shot EITHER (A) inside an indoor room, apartment or attic/grenier showing cardboard boxes and movers clearing the space (NO truck visible in indoor shot), OR (B) outdoors in front of the property showing a white utility van with OPEN REAR DOORS being loaded with boxes and furniture.';
  } else if (isIndoor) {
    framingRule = 'INDOOR FRAMING: Photo MUST be shot from inside the room itself OR from an adjoining doorway/hallway looking directly into the active work space.';
  } else {
    const rand = Math.random();
    if (rand < 0.80) {
      framingRule = '"client" viewpoint: taken from garden path, driveway or sidewalk, smartphone at chest height, candid framing.';
    } else if (rand < 0.95) {
      framingRule = '"tradesman" viewpoint: normal worksite photo taken by worker or colleague.';
    } else {
      framingRule = `"neighbour" viewpoint: slightly from the side, as if taken discreetly from behind a fence.`;
    }
  }

  // 1 chance sur 3 (33%) d'ajouter une imperfection physique marquée
  const hasDefect = Math.random() < 0.33;
  const cameraDefect = hasDefect
    ? CAMERA_IMPERFECTIONS[Math.floor(Math.random() * CAMERA_IMPERFECTIONS.length)]
    : 'standard realistic smartphone camera quality with natural lighting';

  return {
    showWorker: true, // 100% OBLIGATOIRE : toujours des ouvriers visibles !
    compositionRule: `COMPOSITION & REALISM: ${framingRule} Camera detail: ${cameraDefect}, motion blur on active hands, subtle digital noise in shadows. NEVER too clean, HDR, sharp or perfectly framed.`,
  };
}

function buildRulesBlock(metier, travaux, etatChantier) {
  const lines = [];

  const normalize = (s) => (s || '').toLowerCase()
    .replace(/[éèê]/g, 'e').replace(/[àâ]/g, 'a')
    .replace(/[îï]/g, 'i').replace(/[ôö]/g, 'o')
    .replace(/[ùûü]/g, 'u').replace(/[ç]/g, 'c');

  const metierNorm = normalize(metier);
  const safetyKey = Object.keys(SAFETY_RULES).find(k => metierNorm.includes(normalize(k)));
  if (safetyKey) lines.push(SAFETY_RULES[safetyKey]);

  const travauxNorm = normalize(travaux);
  const visualKey = Object.keys(VISUAL_RULES_BY_SERVICE).find(k =>
    travauxNorm.includes(normalize(k))
  );
  if (visualKey) lines.push(VISUAL_RULES_BY_SERVICE[visualKey]);

  const { compositionRule } = getCompositionRules(metier, travaux, etatChantier);
  lines.push(compositionRule);

  // Distinguer métiers extérieurs dangereux (2+ ouvriers) vs travaux intérieurs (1 ouvrier solo)
  const DANGEROUS_OUTDOOR_TRADES = ['toiture', 'nettoyage_toiture', 'elagage', 'abattage', 'ravalement', 'maconnerie', 'terrassement', 'charpente'];
  const isOutdoorDangerous = DANGEROUS_OUTDOOR_TRADES.some(t => metierNorm.includes(t) || travauxNorm.includes(t));

  const INDOOR_TRADES = ['plomberie', 'electricite', 'peinture', 'carrelage', 'placo', 'parquet', 'serrurerie', 'menuiserie', 'salle de bain', 'cuisine', 'debarras', 'encombrants', 'demenagement', 'vitrier'];
  const isIndoor = INDOOR_TRADES.some(t => metierNorm.includes(t) || travauxNorm.includes(t));

  // Alternance aléatoire du couvre-chef quand le casque n'est pas obligatoire (tête nue / casquette / bonnet / chapeau)
  const headwearOptions = ['bare head (no hat)', 'casual work cap / baseball cap', 'work beanie', 'casual sun hat'];
  const randomHeadwear = headwearOptions[Math.floor(Math.random() * headwearOptions.length)];

  if (isOutdoorDangerous) {
    const isPublicRoad = metierNorm.includes('depannage') || metierNorm.includes('remorquage') || travauxNorm.includes('depannage') || travauxNorm.includes('remorquage') || travauxNorm.includes('voie publique') || travauxNorm.includes('trottoir');
    const vestRule = isPublicRoad 
      ? 'High-visibility safety vests (yellow/orange) MANDATORY for road breakdown / public highway work.' 
      : 'NO HIGH-VIS SAFETY VESTS! Workers wear normal professional workwear (polo, t-shirt, work jacket, work trousers). Do NOT put yellow/orange safety vests on private property workers.';
    lines.push(`WORKER MANDATE (Outdoor/High Risk): Minimum 2 active workers visible in realistic professional workwear. ${vestRule} One operating main tools, second assisting or securing. Both rendered in realistic working postures.`);
  } else if (isIndoor) {
    const isMasonry = metierNorm.includes('maconnerie') || travauxNorm.includes('maconnerie');
    const isGlazier = metierNorm.includes('vitrier') || travauxNorm.includes('vitrier');
    
    let helmetRule;
    if (isMasonry) {
      helmetRule = 'Hard hat / safety helmet MANDATORY for masonry.';
    } else if (isGlazier) {
      helmetRule = `NO HARD HAT on head! Headwear: ${randomHeadwear}. BUT safety glasses/goggles and cut-resistant gloves are MANDATORY for glazier.`;
    } else {
      helmetRule = `NO HARD HAT / NO SAFETY HELMET on head! Headwear: ${randomHeadwear}. Wearing neat normal professional workwear (t-shirt/polo/trousers). NEVER put a hard hat on an indoor plumber, painter, tiler, electrician, carpenter or mover.`;
    }
    
    lines.push(`WORKER MANDATE (Indoor Renovation & Clearance): 1 or 2 active professional artisans/movers visible inside the room, adjoining doorway, or near the van/truck outside. ${helmetRule} NO safety vests.`);
  } else {
    lines.push(`WORKER MANDATE: 1 or 2 active workers visible in realistic workwear. Headwear: ${randomHeadwear}. (NO safety vests unless on public road), operating equipment naturally.`);
  }

  return lines.length > 0 ? `\n\n---\n${lines.join('\n')}` : '';
}

module.exports = { buildRulesBlock };
