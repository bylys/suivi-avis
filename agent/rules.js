/**
 * rules.js — Règles visuelles et de sécurité par métier
 */

const SAFETY_RULES = {
  toiture: `SAFETY RULES — Roofing: Minimum 2 workers visible. WORKER LOCATION: Workers MUST be either (A) on a low mobile scaffolding / scaffold tower, OR (B) working on a roof ladder laid flat along the roof slope, OR (C) working on eaves/gutter level from a standard ladder resting against the gutter edge. ABSOLUTE PROHIBITION: NO giant tall extension ladder leaning against the middle of the house reaching up to the roof slope! NO worker climbing a single giant ladder placed against the house front. Ground extension ladder MUST NOT extend onto or rest on top of fragile roof tiles. Connected safety harness is MANDATORY on roof slope. Worker 2: at ground level or holding ladder base.`,
  nettoyage_toiture: `SAFETY RULES — Roof cleaning & Moss removal: Minimum 2 workers visible. Worker 1 on roof ladder hooked over top ridge with connected safety harness. Worker 2 at ground level. Hard hat MANDATORY. NO giant tall extension ladder leaning against the middle of the house reaching up to the roof slope! NEVER: worker standing freely on tiles without harness, single worker on roof.`,
  nettoyage_terrasse: `SAFETY RULES — Terrace / Deck cleaning: Ground level work on outdoor patio/deck/driveway. NO HARD HAT / NO HELMET on head (bare head or casual cap). High-pressure washer or patio cleaner attachment in use. Waterproof boots, work trousers. NEVER: bare feet, jet aimed at people.`,
  nettoyage_facade: `SAFETY RULES — Facade cleaning: High-pressure washer or softwash lance aimed at exterior wall. Scaffold or ground level. Hard hat MANDATORY if under scaffold. Safety goggles/visor + work boots.`,
  nettoyage_gouttieres: `SAFETY RULES — Gutter cleaning: NEVER: worker standing on gutter channel, on top ladder rung, dangerously leaning sideways, improvised access (chair, crate). ALLOWED: simple ladder, 1 worker.`,
  etancheite: `SAFETY RULES — Waterproofing & Roof Sealing: Single-family house terrace/balcony: 1 worker, NO HARD HAT / NO HELMET on head (bare head or cap). Warehouse / Building flat roof: minimum 2 workers, hard hats + high-vis vests + safety boots. EPDM membrane, PVC or bitumen rolls being torched/welded or applied with roller. NEVER: worker standing on parapet edge, blowtorch aimed toward another worker, access hatch blocked by rolls.`,
  ravalement: `SAFETY RULES — Facade rendering: Scaffold above 2m: mandatory guardrail on void side. NEVER: worker leaning beyond guardrail.`,
  maconnerie: `SAFETY RULES — Masonry: NEVER: worker above unfinished wall at more than 1.5m without scaffold. All workers ground level beside wall (max 1.0-1.2m during block construction).`,
  elagage: `SAFETY RULES — Tree pruning: Minimum 2 workers (1 climber in tree, 1 ground assistant). Climber: arborist helmet with chinstrap + climbing harness + ropes visible and anchored to main tree fork. Ground assistant: helmet + high-vis vest, standing outside fall zone. NEVER: person in fall zone of branch being cut, ladder floating mid-air without branch support.`,
  abattage: `SAFETY RULES — Tree felling: Chainsaw operator beside trunk wearing logger helmet with visor + chainsaw protection trousers + boots. Assistant at safe distance. NEVER: chainsaw held above shoulder level, person in frontal fall direction of tree.`,
  terrassement: `SAFETY RULES — Earthworks: NEVER: person in open trench under bucket, person between rotating cab and trench edge. Ground signaller required near structures.`,
  paysagiste: `SAFETY RULES — Landscaping & Hedge Trimming: NO HARD HAT / NO HELMET on head for ground hedge trimming (bare head or casual cap/ear defenders). Hedge trimmer or lawnmower in use. Work trousers and gloves. NEVER: lawnmower on steep unstable slope, chainsaw operated without leg protection.`,
  nettoyage: `SAFETY RULES — Exterior cleaning: Ground level work. NO HARD HAT on head. NEVER: high-pressure jet aimed at person, bare feet during cleaning.`,
  vitrier: `SAFETY RULES — Glazier: Cut-resistant safety gloves and protective safety glasses/goggles MANDATORY when handling glass panes. Glass suction cup lifters MUST be firmly attached to the flat central surface of the glass pane (held by glazier hands), NEVER floating mid-air or overlapping window frames. NO HARD HAT / NO HELMET on head (bare head or casual cap). Outdoor height intervention (scaffolding/basket): hard hat mandatory. NEVER: bare hands touching glass edge, glass pane resting unsupported on wall.`,
  depannage_auto: `SAFETY RULES — Auto breakdown: Off-road mandatory, warning triangle visible. NEVER: person between vehicle and traffic, cables crossing road, vehicle raised without axle stands.`,
  charpente: `SAFETY RULES — Carpentry: NEVER: roof ladder as structural platform, worker balancing on rafters without platform, lone worker carrying heavy piece.`,
  debarras: `SAFETY RULES — House & Junk Clearance: Utility van or skip container parked outside property. Minimum 1 or 2 movers carrying furniture or boxes in work gloves and sturdy boots. NO HARD HAT / NO HELMET on head (bare head or casual cap). NEVER: lone worker carrying oversized furniture dangerously on stairs, blocked exit path, sharp glass carried without gloves.`,
};

const VISUAL_RULES_BY_SERVICE = {
  'Taille de haie': `VISUAL: Exactly 2 workers in duo working together on hedge trimming (never 1 solo, never 3+). WORKER POSITION: Both workers MUST stand at ground level OR on a low A-frame garden step-ladder (escabeau de jardin en A). ABSOLUTE PROHIBITION: NO tall straight extension ladders leaning against hedges or walls! NO worker standing dangerously on top rung of a tall ladder leaning against bushes. Hedge trimmer visible, hedge in frame.`,
  'Taille arbre haute tige': `VISUAL: Climbing harness + ropes anchored to main crotch. If a ladder is present, it must reach a solid main fork or be omitted. Realistic human-to-tree scale mandatory.`,
  'Elagage arbre': `VISUAL: Climbing harness + ropes visible and anchored to main crotch. If an aluminum ladder is shown, it must rest securely against a main branch fork, NEVER stopping awkwardly mid-trunk far below the worker.`,
  'Elalgage en hauteur': `VISUAL: Climbing harness + ropes visible and anchored to main crotch. If an aluminum ladder is shown, it must rest securely against a main branch fork, NEVER stopping awkwardly mid-trunk far below the worker.`,
  'Reparation toiture': `VISUAL: Roofers replacing damaged terracotta roof tiles, flat roof-ladder hooked on ridge, minimum 2 workers (1 on roof with harness, 1 at ground).`,
  'Renovation tuiles toiture': `VISUAL: Worker on a flat roof-ladder hooked at top ridge. Ground extension ladder stops strictly at the gutter edge and NEVER climbs onto the sloping roof surface.`,
  'Changement tuiles': `VISUAL: Roofers on flat roof-ladder (hooked on top ridge) replacing broken tiles, stack of new terracotta tiles nearby. Minimum 2 workers (1 roof, 1 ground).`,
  'Reparation tuiles': `VISUAL: Roofers on flat roof-ladder (hooked on top ridge) replacing broken tiles, stack of new terracotta tiles nearby. Minimum 2 workers (1 roof, 1 ground).`,
  'Remplacement tuiles': `VISUAL: Roofers replacing broken terracotta roof tiles on slope, stack of replacement tiles nearby, minimum 2 workers with harnesses.`,
  'Faitage et Rive': `VISUAL: Roofers working on ridge capping (faîtage) or verge/bargeboard tile edging (rive), mortar or zinc flashing, minimum 2 workers with harnesses.`,
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
  'Dessouchage': `VISUAL: Stump and roots visible, stump grinder or digging equipment, wood chips around.`,
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
    framingRule = 'CLEARANCE FRAMING (Débarras): Photo can be shot EITHER inside the room/basement/garage being cleared OR outside in front of the property/driveway with boxes and furniture being loaded into a utility van.';
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
