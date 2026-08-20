/**
 * rules.js — Règles visuelles et de sécurité par métier
 */

const SAFETY_RULES = {
  toiture: `SAFETY RULES — Roofing: Minimum 2 workers visible. Worker 1 must be on a roof ladder LAID FLAT along the sloping tiles (hooked over the top ridge), OR inside a secure scaffolding basket/nacelle. Connected safety harness is MANDATORY. Worker 2: at ground level, standing away from the fall zone. ABSOLUTE FORBIDDEN: An aluminum extensión ladder placed against the house MUST NEVER extend onto or rest on top of fragile roof tiles; it must ONLY rest against the gutter/eaves. NO worker standing freely on tiles, NO floating ladders leaning mid-roof on tiles without ridge hooks.`,
  nettoyage_toiture: `SAFETY RULES — Roof cleaning & Moss removal: Minimum 2 workers visible. Worker 1 on roof ladder hooked over top ridge with connected safety harness. Worker 2 at ground level. Hard hat MANDATORY. NEVER: worker standing freely on tiles without harness, single worker on roof.`,
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
  vitrier: `SAFETY RULES — Glazier: Cut-resistant safety gloves and suction cup lifters MANDATORY when handling glass panes. Indoor window/mirror replacement: NO HARD HAT / NO HELMET on head (bare head or cap). Outdoor height intervention (scaffolding/basket): hard hat mandatory. NEVER: bare hands touching glass edge, glass pane resting unsupported on wall.`,
  depannage_auto: `SAFETY RULES — Auto breakdown: Off-road mandatory, warning triangle visible. NEVER: person between vehicle and traffic, cables crossing road, vehicle raised without axle stands.`,
  charpente: `SAFETY RULES — Carpentry: NEVER: roof ladder as structural platform, worker balancing on rafters without platform, lone worker carrying heavy piece.`,
  debarras: `SAFETY RULES — House & Junk Clearance: Utility van or skip container parked outside property. Minimum 1 or 2 movers carrying furniture or boxes in work gloves and sturdy boots. NO HARD HAT / NO HELMET on head (bare head or casual cap). NEVER: lone worker carrying oversized furniture dangerously on stairs, blocked exit path, sharp glass carried without gloves.`,
};

const VISUAL_RULES_BY_SERVICE = {
  'Taille de haie': `VISUAL: Hedge trimmer visible and active, hedge in frame, worker cutting.`,
  'Taille arbre haute tige': `VISUAL: Climbing harness + ropes anchored to main crotch. If a ladder is present, it must reach a solid main fork or be omitted. Realistic human-to-tree scale mandatory.`,
  'Elagage arbre': `VISUAL: Climbing harness + ropes visible and anchored to main crotch. If an aluminum ladder is shown, it must rest securely against a main branch fork, NEVER stopping awkwardly mid-trunk far below the worker.`,
  'Elalgage en hauteur': `VISUAL: Climbing harness + ropes visible and anchored to main crotch. If an aluminum ladder is shown, it must rest securely against a main branch fork, NEVER stopping awkwardly mid-trunk far below the worker.`,
  'Reparation toiture': `VISUAL: Worker on a flat roof-ladder (lying flat along roof tiles hooked at top ridge). Ground ladder only reaches gutter line. Minimum 2 workers visible (1 roof, 1 ground).`,
  'Renovation tuiles toiture': `VISUAL: Worker on a flat roof-ladder hooked at top ridge. Ground extension ladder stops strictly at the gutter edge and NEVER climbs onto the sloping roof surface.`,
  'Changement tuiles': `VISUAL: Worker on flat roof-ladder (hooked on top ridge) replacing broken tiles, stack of new terracotta tiles nearby. Minimum 2 workers (1 roof, 1 ground).`,
  'Reparation tuiles': `VISUAL: Worker on flat roof-ladder (hooked on top ridge) replacing broken tiles, stack of new terracotta tiles nearby. Minimum 2 workers (1 roof, 1 ground).`,
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
  'Etancheite maison': `VISUAL: Single-family home terrace or flat extension, 1 worker applying waterproofing membrane or liquid resin with roller, bare-headed or in cap.`,
  'Etancheite entrepot': `VISUAL: Large commercial warehouse flat roof, minimum 2 workers in hard hats and high-vis vests unrolling bitumen membranes and using propane blowtorch on large flat surface.`,
  'Dessouchage': `VISUAL: Stump and roots visible, stump grinder or digging equipment, wood chips around.`,
  'Abattage arbre': `VISUAL: Operator beside trunk, chainsaw visible, protective clothing, felled sections on ground.`,
  'Depannage auto': `VISUAL: Flatbed tow truck or recovery vehicle with orange flashing beacons, breakdown car safely positioned on roadside or flatbed ramp, operator in high-vis vest.`,
  'Remorquage': `VISUAL: Car being secured onto flatbed tow truck with winch or wheel straps, operator in high-vis vest operating control panel.`,
  'Changement batterie': `VISUAL: Open car bonnet/hood, portable booster pack or jumper cables, technician in workwear.`,
  'Changement roue': `VISUAL: Car safely parked on roadside, trolley jack under sills, wheel brace or impact wrench in use.`,
  'Debarras maison': `VISUAL: Utility van with open rear doors or skip container, neat stacks of cardboard boxes and old furniture being loaded by mover in work gloves.`,
  'Enlevement encombrants': `VISUAL: Utility truck or van, movers in workwear loading bulky items or boxes from driveway or garage.`,
  'Debarras cave': `VISUAL: Basement or garage clearance in progress, boxes, shelving or old items stacked neatly for loading.`,
  'Remplacement vitrage': `VISUAL: Glazier wearing cut-resistant gloves using suction cup handles to position double glazing window frame indoors.`,
  'Reparation vitre': `VISUAL: Glazier applying silicone sealant or fitting glass pane into window frame with suction lifter.`,
  'Pose miroir': `VISUAL: Large mirror being mounted on wall using suction cups, glazier in professional workwear with gloves.`,
  'Nettoyage terrasse': `VISUAL: Ground level patio/deck cleaning, pressure washer lance or patio cleaner attachment in use, clean wet tiles contrast with uncleaned area. Operator bare-headed or in cap, work boots.`,
  'Nettoyage facade': `VISUAL: Exterior house wall being washed with pressure lance, visible contrast between clean rendered wall and unwashed section. Operator in work boots.`,
};

// Imperfections physiques d'appareil photo smartphone (doigt, verre gras, poussière...)
const CAMERA_IMPERFECTIONS = [
  'slight blur on extreme corner as if a fingertip is partially blocking the lens edge',
  'slightly smudged or greasy lens causing soft light bloom around highlights',
  'subtle dust speck or water droplet mark on the camera lens',
  'minor lens flare and slight overexposure from natural sunlight',
  'slightly crooked horizon and candid hand-held tilt',
];

function getCompositionRules(etatChantier) {
  const workerPresenceMap = {
    'debut de chantier': 0.65,
    'travaux en cours': 0.90,
    'travaux quasi-termines': 0.07,
  };
  const etatKey = (etatChantier || '').toLowerCase()
    .replace(/[éè]/g, 'e').replace(/[àâ]/g, 'a').replace(/[î]/g, 'i');
  const showWorker = Math.random() < (workerPresenceMap[etatKey] ?? 0.80);

  const rand = Math.random();
  let pointDeVueRule;
  if (rand < 0.80) {
    pointDeVueRule = '"client" viewpoint: taken from garden path, driveway or sidewalk, smartphone at chest height, candid framing.';
  } else if (rand < 0.95) {
    pointDeVueRule = '"tradesman" viewpoint: normal worksite photo taken by worker or colleague.';
  } else {
    pointDeVueRule = `"neighbour" viewpoint: slightly from the side, as if taken discreetly from behind a fence.`;
  }

  // 1 chance sur 3 (33%) d'ajouter une imperfection physique marquée
  const hasDefect = Math.random() < 0.33;
  const cameraDefect = hasDefect
    ? CAMERA_IMPERFECTIONS[Math.floor(Math.random() * CAMERA_IMPERFECTIONS.length)]
    : 'standard realistic smartphone camera quality with natural lighting';

  return {
    showWorker,
    compositionRule: `COMPOSITION & REALISM: ${pointDeVueRule} Camera detail: ${cameraDefect}, motion blur on active hands, subtle digital noise in shadows. NEVER too clean, HDR, sharp or perfectly framed.`,
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

  const { showWorker: initialShowWorker, compositionRule } = getCompositionRules(etatChantier);
  lines.push(compositionRule);

  // Distinguer métiers extérieurs dangereux (2+ ouvriers) vs travaux intérieurs (1 ouvrier solo)
  const DANGEROUS_OUTDOOR_TRADES = ['toiture', 'nettoyage_toiture', 'elagage', 'abattage', 'ravalement', 'maconnerie', 'terrassement', 'vitrier', 'charpente'];
  const isOutdoorDangerous = DANGEROUS_OUTDOOR_TRADES.some(t => metierNorm.includes(t) || travauxNorm.includes(t));

  const INDOOR_TRADES = ['plomberie', 'electricite', 'peinture', 'carrelage', 'placo', 'parquet', 'serrurerie', 'menuiserie', 'salle de bain', 'cuisine', 'debarras', 'encombrants', 'demenagement'];
  const isIndoor = INDOOR_TRADES.some(t => metierNorm.includes(t) || travauxNorm.includes(t));

  if (isOutdoorDangerous) {
    lines.push(`WORKER MANDATE (Outdoor/High Risk): Minimum 2 active workers visible in professional high-visibility workwear (yellow/orange safety vests, hard hats, work trousers). One operating main tools, second assisting or securing. Both rendered in realistic working postures.`);
  } else if (isIndoor) {
    const isMasonry = metierNorm.includes('maconnerie') || travauxNorm.includes('maconnerie');
    const helmetRule = isMasonry 
      ? 'Hard hat / safety helmet MANDATORY for masonry.' 
      : 'NO HARD HAT / NO SAFETY HELMET on head! The indoor artisan MUST have a bare head (or casual work cap), wearing neat normal professional workwear (t-shirt/polo/trousers). NEVER put a hard hat on an indoor plumber, painter, tiler, electrician or carpenter.';
    
    if (initialShowWorker) {
      lines.push(`WORKER MANDATE (Indoor Renovation): Exactly 1 professional artisan/tradesman visible inside the room, actively working on the task (e.g. painting wall, tiling, electrical outlet, plumbing under sink). ${helmetRule}`);
    } else {
      lines.push(`WORKER PRESENCE (Indoor): Show clean indoor room or active work zone with tools and materials neatly set up. No workers visible in frame.`);
    }
  } else {
    if (initialShowWorker) {
      lines.push(`WORKER MANDATE: 1 or 2 active workers visible in realistic workwear, operating equipment naturally.`);
    } else {
      lines.push(`WORKER PRESENCE: Show only the worksite, materials and equipment. No workers visible in frame.`);
    }
  }

  return lines.length > 0 ? `\n\n---\n${lines.join('\n')}` : '';
}

module.exports = { buildRulesBlock };
