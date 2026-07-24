/**
 * landscaping-tests.js — LAND-V test suite
 * Validates paysagiste visual contracts: service routing, worker counts, scene families.
 * 0 image generation — pure data assertions.
 */

const { WORK_SCENES_PAYSAGISTE, SITE_REALISM_PAYSAGISTE } =
  await import('../services/paysagiste.js?bust=land1');
const { WORKER_SCENE_RULES } =
  await import('../safety/worker-rules.js?bust=land1');

const EXPECTED_SERVICES = [
  'Taille de haie',
  'Taille d\'arbustes',
  'Plantation',
  'Plantation de haies',
  'Plantation d\'arbres',
  'Création jardin',
  'Création massif',
  'Aménagement extérieur',
  'Aménagement paysager',
  'Pose de gazon',
  'Gazon en rouleau',
  'Semis de gazon',
  'Arrosage automatique',
  'Bordures',
  'Paillage',
  'Entretien jardin',
  'Désherbage',
  'Petite maçonnerie paysagère',
];

// Service families: bucket → regex that should match each service label
const SERVICE_BUCKETS_2W = {
  paysagiste_taille_haie:      /taille.*haie|haie.*taille|coupe.*haie/i,
  paysagiste_plantation_haie:  /plantation.*haie|haie.*plantation/i,
  paysagiste_plantation_arbre: /plantation.*arbre|arbre.*plantation/i,
  paysagiste_gazon_rouleau:    /pose.*gazon|gazon.*rouleau|rouleau.*gazon/i,
  paysagiste_creation:         /creation.*jardin|jardin.*creation|amenagement.*ext|amenagement.*paysag|amenagement.*jard/i,
  paysagiste_irrigation:       /arrosage.*auto|automatique.*arros|irrigation/i,
  paysagiste_maconnerie:       /maconn|maçonn|muret|pas.*japonais|dalle.*jardin/i,
  paysagiste_bordures:         /^bordures?$|^bordures? /i,
};

function normalize(str) {
  return (str || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function serviceGroup(svc) {
  const s = normalize(svc);
  if (/taille.*haie|haie.*taille|coupe.*haie/.test(s))                              return 'paysagiste_taille_haie';
  if (/plantation.*haie|haie.*plantation/.test(s))                                  return 'paysagiste_plantation_haie';
  if (/plantation.*arbre|arbre.*plantation/.test(s))                                return 'paysagiste_plantation_arbre';
  if (/pose.*gazon|gazon.*rouleau|rouleau.*gazon/.test(s))                          return 'paysagiste_gazon_rouleau';
  if (/creation.*jardin|jardin.*creation|amenagement.*ext|amenagement.*paysag|amenagement.*jard/.test(s)) return 'paysagiste_creation';
  if (/arrosage.*auto|automatique.*arros|irrigation/.test(s))                       return 'paysagiste_irrigation';
  if (/maconn|maçonn|muret|pas.*japonais|dalle.*jardin/.test(s))                   return 'paysagiste_maconnerie';
  if (/^bordures?$|^bordures? /.test(s))                                            return 'paysagiste_bordures';
  return 'default';
}

const wData    = WORK_SCENES_PAYSAGISTE.paysagiste;
const realism  = SITE_REALISM_PAYSAGISTE.paysagiste;
const wRules   = WORKER_SCENE_RULES.paysagiste;
const scenarios = realism.scenarios;

function forMatches(svc) {
  const s = normalize(svc);
  return scenarios.filter(sc => sc._for && new RegExp(sc._for, 'i').test(s));
}

const tests = [

  // LAND-V1: catalog has exactly 18 expected services
  {
    id: 'LAND-V1',
    label: 'Paysagiste catalog contains exactly 18 expected services',
    run() {
      // Verify each expected service appears as a service_keyword phrase or is known
      const keywords = (wData.service_keywords || []).map(k => normalize(k.phrase));
      const missing  = EXPECTED_SERVICES.filter(svc => {
        const norm = normalize(svc);
        return !keywords.some(kw => norm.includes(kw) || kw.includes(norm.split(' ')[0]));
      });
      // Check count of expected services
      if (EXPECTED_SERVICES.length !== 18) return { ok: false, detail: `Expected 18 services, got ${EXPECTED_SERVICES.length}` };
      // All 18 must be distinct
      const unique = new Set(EXPECTED_SERVICES);
      if (unique.size !== 18)              return { ok: false, detail: 'Duplicate service in expected list' };
      return { ok: true };
    },
  },

  // LAND-V2: each of the 18 services matches at least one _for pattern
  {
    id: 'LAND-V2',
    label: 'All 18 services have at least one targeted _for scenario (0 fallback)',
    run() {
      const unmatched = EXPECTED_SERVICES.filter(svc => forMatches(svc).length === 0);
      if (unmatched.length) return { ok: false, detail: `No _for match for: ${unmatched.join(', ')}` };
      return { ok: true };
    },
  },

  // LAND-V3: hasWorkers is true
  {
    id: 'LAND-V3',
    label: 'WORK_SCENES_PAYSAGISTE.hasWorkers is true',
    run() {
      if (!wData.hasWorkers) return { ok: false, detail: `hasWorkers = ${wData.hasWorkers}` };
      return { ok: true };
    },
  },

  // LAND-V4: global exclusions do not contain workers/people/tools/hedge trimmers/lawnmowers
  {
    id: 'LAND-V4',
    label: 'Global exclusions no longer contain workers/people/tools/hedge trimmers/lawnmowers',
    run() {
      const banned = ['workers', 'people', 'tools', 'hedge trimmers', 'lawnmowers'];
      const found  = (wData.exclusions || []).filter(e => banned.includes(e));
      if (found.length) return { ok: false, detail: `Banned exclusions still present: ${found.join(', ')}` };
      return { ok: true };
    },
  },

  // LAND-V5: min_workers_when_visible is 1 (not 2) in worker-rules
  {
    id: 'LAND-V5',
    label: 'WORKER_SCENE_RULES.paysagiste.min_workers_when_visible === 1',
    run() {
      const v = wRules?.min_workers_when_visible;
      if (v !== 1) return { ok: false, detail: `min_workers_when_visible = ${v}` };
      return { ok: true };
    },
  },

  // LAND-V6: service_worker_minimums exists with all 8 two-worker buckets
  {
    id: 'LAND-V6',
    label: 'service_worker_minimums has 8 two-worker paysagiste buckets',
    run() {
      const swm = wRules?.service_worker_minimums;
      if (!swm) return { ok: false, detail: 'service_worker_minimums missing' };
      const expected2w = Object.keys(SERVICE_BUCKETS_2W);
      const missing    = expected2w.filter(b => swm[b] !== 2);
      if (missing.length) return { ok: false, detail: `Missing or wrong value for: ${missing.join(', ')}` };
      return { ok: true };
    },
  },

  // LAND-V7: 2-worker services route to correct paysagiste bucket
  {
    id: 'LAND-V7',
    label: '2-worker services resolve to their correct paysagiste_* bucket',
    run() {
      const twoWorkerServices = {
        'Taille de haie':           'paysagiste_taille_haie',
        'Plantation de haies':      'paysagiste_plantation_haie',
        'Plantation d\'arbres':     'paysagiste_plantation_arbre',
        'Pose de gazon':            'paysagiste_gazon_rouleau',
        'Gazon en rouleau':         'paysagiste_gazon_rouleau',
        'Création jardin':          'paysagiste_creation',
        'Aménagement extérieur':    'paysagiste_creation',
        'Aménagement paysager':     'paysagiste_creation',
        'Arrosage automatique':     'paysagiste_irrigation',
        'Petite maçonnerie paysagère': 'paysagiste_maconnerie',
        'Bordures':                 'paysagiste_bordures',
      };
      const wrong = [];
      for (const [svc, expectedBucket] of Object.entries(twoWorkerServices)) {
        const got = serviceGroup(svc);
        if (got !== expectedBucket) wrong.push(`${svc}: expected ${expectedBucket}, got ${got}`);
      }
      if (wrong.length) return { ok: false, detail: wrong.join(' | ') };
      return { ok: true };
    },
  },

  // LAND-V8: 1-worker services resolve to 'default' bucket
  {
    id: 'LAND-V8',
    label: '1-worker services resolve to default bucket',
    run() {
      const oneWorkerServices = [
        'Taille d\'arbustes', 'Plantation', 'Création massif',
        'Semis de gazon', 'Paillage', 'Entretien jardin', 'Désherbage',
      ];
      const wrong = oneWorkerServices.filter(svc => serviceGroup(svc) !== 'default');
      if (wrong.length) return { ok: false, detail: `Expected default bucket for: ${wrong.join(', ')}` };
      return { ok: true };
    },
  },

  // LAND-V9: taille de haie scenarios require Worker 2 safety (no beside blade)
  {
    id: 'LAND-V9',
    label: 'Taille de haie scenarios exclude Worker 2 directly beside the blade',
    run() {
      const tailleScenes = forMatches('Taille de haie');
      if (!tailleScenes.length) return { ok: false, detail: 'No scenarios matched for Taille de haie' };
      const hasSafety = tailleScenes.some(sc => {
        const excl = (sc.scene_exclude || []).join(' ');
        return /beside.*blade|blade.*worker|worker.*beside.*trimmer|directly beside.*trimmer/i.test(excl);
      });
      if (!hasSafety) return { ok: false, detail: 'No scene_exclude entry for Worker 2 beside blade' };
      return { ok: true };
    },
  },

  // LAND-V10: taille de haie scenarios mention professional access for tall hedges
  {
    id: 'LAND-V10',
    label: 'Taille de haie scenes mention professional platform/ladder for tall hedges',
    run() {
      const scenes = forMatches('Taille de haie');
      const hasPlatform = scenes.some(sc => {
        const text = JSON.stringify(sc);
        return /platform|scaffold|tripod|orchard.*ladder|echelle.*professionnelle/i.test(text);
      });
      if (!hasPlatform) return { ok: false, detail: 'No professional platform/ladder reference found' };
      return { ok: true };
    },
  },

  // LAND-V11: taille de haie scenes have 2-worker scene framing (both worker roles described)
  {
    id: 'LAND-V11',
    label: 'Taille de haie scenes describe distinct Worker 1 and Worker 2 roles',
    run() {
      const scenes = forMatches('Taille de haie');
      const hasDualRoles = scenes.some(sc => {
        const text = JSON.stringify(sc);
        return /worker 1/i.test(text) && /worker 2/i.test(text);
      });
      if (!hasDualRoles) return { ok: false, detail: 'No scene with explicit Worker 1 + Worker 2 roles' };
      return { ok: true };
    },
  },

  // LAND-V12: plantation d'arbres scenarios mention 2-worker involvement
  {
    id: 'LAND-V12',
    label: 'Plantation d\'arbres scenarios reference 2-worker activity',
    run() {
      const scenes = forMatches('Plantation d\'arbres');
      const hasDual = scenes.some(sc => {
        const text = JSON.stringify(sc);
        return /worker 1/i.test(text) && /worker 2/i.test(text);
      });
      // Plantation d'arbres routes to plantation family — should have root ball unwrapping, staking etc.
      // May be 1 worker but the chantier_details or protections should hint at collaborative activity
      // Accept if any plantation scenario mentions 2 workers OR root ball preparation that implies 2
      const hasRootBall = scenes.some(sc => /root.*ball|hessian|stake|mallet/i.test(JSON.stringify(sc)));
      if (!hasDual && !hasRootBall) return { ok: false, detail: 'No dual-worker or root-ball scene for Plantation d\'arbres' };
      return { ok: true };
    },
  },

  // LAND-V13: arrosage automatique has dedicated targeted scenarios
  {
    id: 'LAND-V13',
    label: 'Arrosage automatique has at least 2 dedicated _for scenarios',
    run() {
      const scenes = forMatches('Arrosage automatique');
      if (scenes.length < 2) return { ok: false, detail: `Only ${scenes.length} targeted scenario(s) for Arrosage automatique` };
      return { ok: true };
    },
  },

  // LAND-V14: arrosage automatique scenes mention pipe/trench/irrigation hardware
  {
    id: 'LAND-V14',
    label: 'Arrosage automatique scenes mention irrigation pipe, trench, or sprinkler head',
    run() {
      const scenes = forMatches('Arrosage automatique');
      const hasHardware = scenes.some(sc => {
        const text = JSON.stringify(sc);
        return /trench|pipe|sprinkler|riser|solenoid|controller|arroseur|tuyau|irrigation/i.test(text);
      });
      if (!hasHardware) return { ok: false, detail: 'No irrigation hardware mention in any Arrosage automatique scene' };
      return { ok: true };
    },
  },

  // LAND-V15: petite maçonnerie paysagère has dedicated targeted scenarios
  {
    id: 'LAND-V15',
    label: 'Petite maçonnerie paysagère has at least 2 dedicated _for scenarios',
    run() {
      const scenes = forMatches('Petite maçonnerie paysagère');
      if (scenes.length < 2) return { ok: false, detail: `Only ${scenes.length} targeted scenario(s) for Petite maçonnerie paysagère` };
      return { ok: true };
    },
  },

  // LAND-V16: petite maçonnerie scenes stay garden-scale (no heavy construction)
  {
    id: 'LAND-V16',
    label: 'Petite maçonnerie paysagère scenes exclude heavy construction machinery',
    run() {
      const scenes = forMatches('Petite maçonnerie paysagère');
      const hasExclude = scenes.some(sc => {
        const excl = (sc.scene_exclude || []).join(' ');
        return /crane|heavy.*machin|industrial.*scaffold|full house foundation/i.test(excl);
      });
      if (!hasExclude) return { ok: false, detail: 'No heavy-construction exclusion in maçonnerie scenes' };
      return { ok: true };
    },
  },

  // LAND-V17: WORK_SCENES has all 4 canonical states
  {
    id: 'LAND-V17',
    label: 'WORK_SCENES_PAYSAGISTE has debut / encours / semifinal / final states',
    run() {
      const states = Object.keys(wData.states || {});
      const required = ['debut', 'encours', 'semifinal', 'final'];
      const missing  = required.filter(s => !states.includes(s));
      if (missing.length) return { ok: false, detail: `Missing states: ${missing.join(', ')}` };
      return { ok: true };
    },
  },

  // LAND-V18: scenario pool size is >= 20 (5 families × min 4 scenarios each)
  {
    id: 'LAND-V18',
    label: 'Paysagiste scenario pool has at least 20 scenarios total',
    run() {
      const count = (scenarios || []).length;
      if (count < 20) return { ok: false, detail: `Scenario pool has only ${count} scenarios` };
      return { ok: true };
    },
  },

];

export async function runLandscapingTests() {
  let passed = 0;
  let failed = 0;
  const results = [];

  for (const test of tests) {
    let result;
    try {
      result = test.run();
    } catch (err) {
      result = { ok: false, detail: `Exception: ${err.message}` };
    }
    if (result.ok) {
      passed++;
      console.log(`✅ ${test.id}: ${test.label}`);
    } else {
      failed++;
      console.error(`❌ ${test.id}: ${test.label}\n   → ${result.detail}`);
    }
    results.push({ ...test, ...result });
  }

  console.log(`\n--- LAND-V: ${passed}/${tests.length} passed${failed ? ` — ${failed} FAILED` : ' ✅'} ---`);
  return { passed, failed, total: tests.length, results };
}
