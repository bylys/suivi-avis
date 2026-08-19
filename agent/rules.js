/**
 * rules.js — Règles visuelles et de sécurité par métier
 */

const SAFETY_RULES = {
  toiture: `SAFETY RULES — Roofing: Minimum 2 workers visible. Worker 1: on a hooked roof ladder (hooks on the ridge), scaffold or MEWP, connected harness visible. Worker 2: at the base, NOT under the fall zone. NEVER: worker standing freely on tiles, harness without anchor, lone worker on active roof, industrial pallet on slope.`,
  nettoyage_toiture: `SAFETY RULES — Roof cleaning: 2 workers + connected harness required. NEVER: backpack confused with harness, lone worker, telescopic lance from garden without height access.`,
  nettoyage_gouttieres: `SAFETY RULES — Gutter cleaning: NEVER: worker standing on gutter channel, on top ladder rung, dangerously leaning sideways, improvised access (chair, crate). ALLOWED: simple ladder, 1 worker.`,
  etancheite: `SAFETY RULES — Waterproofing: NEVER: worker on parapet wall, blowtorch toward another worker, roller blocking access hatch, worker less than 2m from edge without harness. Floor/terrace/balcony: no harness required.`,
  ravalement: `SAFETY RULES — Facade rendering: Scaffold above 2m: mandatory guardrail on void side. NEVER: worker leaning beyond guardrail.`,
  maconnerie: `SAFETY RULES — Masonry: NEVER: worker above unfinished wall at more than 1.5m without scaffold. All workers ground level beside wall (max 1.0-1.2m during block construction).`,
  elagage: `SAFETY RULES — Tree pruning: Climber: harness + climbing ropes visible, anchored to crotch. NEVER: person in fall zone of branch being cut. Realistic human-to-tree scale mandatory.`,
  abattage: `SAFETY RULES — Tree felling: Operator beside trunk, never in frontal fall zone. NEVER: chainsaw above head height, bystander on other side of trunk.`,
  terrassement: `SAFETY RULES — Earthworks: NEVER: person in open trench under bucket, person between rotating cab and trench edge. Ground signaller required near structures.`,
  paysagiste: `SAFETY RULES — Landscaping: NEVER: lawnmower on steep slope, chainsaw without visible leg protection.`,
  nettoyage: `SAFETY RULES — Exterior cleaning: NEVER: high-pressure jet aimed at person, bare feet during cleaning.`,
  vitrier: `SAFETY RULES — Glazier: NEVER: bare hands on edge of large pane, pane against wall without cradle, broken glass with bare feet nearby.`,
  depannage_auto: `SAFETY RULES — Auto breakdown: Off-road mandatory, warning triangle visible. NEVER: person between vehicle and traffic, cables crossing road, vehicle raised without axle stands.`,
  charpente: `SAFETY RULES — Carpentry: NEVER: roof ladder as structural platform, worker balancing on rafters without platform, lone worker carrying heavy piece.`,
};

const VISUAL_RULES_BY_SERVICE = {
  'Taille de haie': `VISUAL: Hedge trimmer visible and active, hedge in frame, worker cutting.`,
  'Taille arbre haute tige': `VISUAL: Climbing harness + ropes anchored to main crotch. If a ladder is present, it must reach a solid main fork or be omitted. Realistic human-to-tree scale mandatory.`,
  'Elagage arbre': `VISUAL: Climbing harness + ropes visible and anchored to main crotch. If an aluminum ladder is shown, it must rest securely against a main branch fork, NEVER stopping awkwardly mid-trunk far below the worker.`,
  'Elalgage en hauteur': `VISUAL: Climbing harness + ropes visible and anchored to main crotch. If an aluminum ladder is shown, it must rest securely against a main branch fork, NEVER stopping awkwardly mid-trunk far below the worker.`,
  'Reparation toiture': `VISUAL: Hooked roof ladder on ridge (NOT against gutter). Damaged tiles visible.`,
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
  'Etancheite toit terrasse': `VISUAL: Flat rooftop, waterproofing membrane visible (EPDM, PVC or bitumen).`,
  'Dessouchage': `VISUAL: Stump and roots visible, stump grinder or digging equipment, wood chips around.`,
  'Abattage arbre': `VISUAL: Operator beside trunk, chainsaw visible, protective clothing, felled sections on ground.`,
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

  // Métiers extérieurs/dangereux exigeant toujours la présence de 2 ouvriers
  const DANGEROUS_TRADES = ['toiture', 'nettoyage_toiture', 'elagage', 'abattage', 'ravalement', 'maconnerie', 'terrassement', 'vitrier', 'charpente'];
  const isDangerous = DANGEROUS_TRADES.some(t => metierNorm.includes(t) || travauxNorm.includes(t));

  const showWorker = isDangerous ? true : initialShowWorker;

  if (showWorker) {
    lines.push(`WORKER MANDATE: Minimum 2 active workers visible in high-visibility workwear (yellow/orange safety vests, hard hats, work trousers). One worker actively operating the main tool/equipment, the second worker assisting or securing. Both workers rendered in realistic working postures.`);
  } else {
    lines.push(`WORKER PRESENCE: No workers visible in this shot. Show only the worksite, materials and equipment.`);
  }

  return lines.length > 0 ? `\n\n---\n${lines.join('\n')}` : '';
}

module.exports = { buildRulesBlock };
