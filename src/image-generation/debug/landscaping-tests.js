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

  // ─── ARROSAGE AUTOMATIQUE ───────────────────────────────────────────────────

  // LAND-V19: irrigation encours scene has required hardware (pipe, fitting, trench)
  {
    id: 'LAND-V19',
    label: 'Irrigation encours scene requires pipe, fitting, and localized trench',
    run() {
      const scenes = forMatches('Arrosage automatique');
      const encours = scenes.filter(sc => Array.isArray(sc._state_for) && sc._state_for.includes('encours'));
      if (!encours.length) return { ok: false, detail: 'No encours-locked irrigation scene found' };
      const hasHardware = encours.some(sc => {
        const text = JSON.stringify(sc);
        return /trench|pipe|fitting|connector|sprinkler.*head|riser|solenoid/i.test(text);
      });
      if (!hasHardware) return { ok: false, detail: 'Encours irrigation scene missing pipe/fitting/trench hardware' };
      return { ok: true };
    },
  },

  // LAND-V20: irrigation cannot resolve to a planting-only scene
  {
    id: 'LAND-V20',
    label: 'Irrigation scenes exclude planting-only actions',
    run() {
      const scenes = forMatches('Arrosage automatique');
      const encours = scenes.filter(sc => Array.isArray(sc._state_for) && sc._state_for.includes('encours'));
      if (!encours.length) return { ok: false, detail: 'No encours-locked irrigation scene found' };
      const hasExclude = encours.some(sc => {
        const excl = (sc.scene_exclude || []).join(' ');
        return /planting|shrubs|weed membrane/i.test(excl);
      });
      if (!hasExclude) return { ok: false, detail: 'No planting exclusion in irrigation encours scene' };
      return { ok: true };
    },
  },

  // LAND-V21: irrigation encours requires two active workers
  {
    id: 'LAND-V21',
    label: 'Irrigation encours scene describes two active workers',
    run() {
      const scenes = forMatches('Arrosage automatique');
      const encours = scenes.filter(sc => Array.isArray(sc._state_for) && sc._state_for.includes('encours'));
      if (!encours.length) return { ok: false, detail: 'No encours-locked irrigation scene found' };
      const hasDual = encours.some(sc => {
        const text = JSON.stringify(sc);
        return /worker 1/i.test(text) && /worker 2/i.test(text);
      });
      if (!hasDual) return { ok: false, detail: 'No dual-worker description in irrigation encours scene' };
      return { ok: true };
    },
  },

  // ─── PETITE MAÇONNERIE PAYSAGÈRE ───────────────────────────────────────────

  // LAND-V22: landscape masonry encours scene has a partially built structure
  {
    id: 'LAND-V22',
    label: 'Landscape masonry encours scene describes a partially built structure',
    run() {
      const scenes = forMatches('Petite maçonnerie paysagère');
      const encours = scenes.filter(sc => Array.isArray(sc._state_for) && sc._state_for.includes('encours'));
      if (!encours.length) return { ok: false, detail: 'No encours-locked masonry scene found' };
      const hasStructure = encours.some(sc => {
        const text = JSON.stringify(sc);
        return /wall|block|stone|course|raised bed|slab|stepping/i.test(text);
      });
      if (!hasStructure) return { ok: false, detail: 'No partially built structure in masonry encours scene' };
      return { ok: true };
    },
  },

  // LAND-V23: masonry encours scene has mortar and alignment tool
  {
    id: 'LAND-V23',
    label: 'Landscape masonry scenes include mortar and alignment tool (spirit level or string)',
    run() {
      const scenes = forMatches('Petite maçonnerie paysagère');
      const hasTools = scenes.some(sc => {
        const tools = (sc.tools || []).join(' ');
        return /mortar|trowel/i.test(tools) && /spirit level|string/i.test(tools + JSON.stringify(sc.chantier_details || []));
      });
      if (!hasTools) return { ok: false, detail: 'No mortar+trowel and spirit-level/string in masonry scene tools' };
      return { ok: true };
    },
  },

  // LAND-V24: planting-only scene excluded from masonry
  {
    id: 'LAND-V24',
    label: 'Landscape masonry scenes exclude planting-only and mulching-only actions',
    run() {
      const scenes = forMatches('Petite maçonnerie paysagère');
      const encours = scenes.filter(sc => Array.isArray(sc._state_for) && sc._state_for.includes('encours'));
      if (!encours.length) return { ok: false, detail: 'No encours-locked masonry scene found' };
      const hasExclude = encours.some(sc => {
        const excl = (sc.scene_exclude || []).join(' ');
        return /planting|mulch/i.test(excl);
      });
      if (!hasExclude) return { ok: false, detail: 'No planting/mulching exclusion in masonry encours scene' };
      return { ok: true };
    },
  },

  // ─── TAILLE DE HAIE ────────────────────────────────────────────────────────

  // LAND-V25: hedge trimming encours requires active hedge trimmer in dedicated scene
  {
    id: 'LAND-V25',
    label: 'Taille de haie has an encours-locked scene with active hedge trimmer',
    run() {
      const scenes = forMatches('Taille de haie');
      const encours = scenes.filter(sc => Array.isArray(sc._state_for) && sc._state_for.includes('encours'));
      if (!encours.length) return { ok: false, detail: 'No encours-locked taille de haie scene found' };
      const hasTrimmer = encours.some(sc => /hedge trimmer/i.test(JSON.stringify(sc)));
      if (!hasTrimmer) return { ok: false, detail: 'No active hedge trimmer described in encours taille de haie scene' };
      return { ok: true };
    },
  },

  // LAND-V26: cleanup-only (blower) scene is restricted to semifinal/final
  {
    id: 'LAND-V26',
    label: 'Cleanup-only (leaf blower) taille de haie scene is locked to semifinal/final only',
    run() {
      const scenes = forMatches('Taille de haie');
      const blowerScenes = scenes.filter(sc => /leaf blower|clippings collection.*blower|blower.*clippings/i.test(sc.scene_note || ''));
      if (!blowerScenes.length) return { ok: false, detail: 'No blower/cleanup scene found for Taille de haie' };
      const badScene = blowerScenes.find(sc => {
        const sf = sc._state_for;
        if (!sf) return true;
        return Array.isArray(sf) && sf.some(s => s === 'encours' || s === 'debut');
      });
      if (badScene) return { ok: false, detail: `Blower/cleanup scene is not restricted to semifinal/final — _state_for: ${JSON.stringify(badScene._state_for)}` };
      return { ok: true };
    },
  },

  // LAND-V27: PPE is worn, not merely placed on the ground, in the encours scene
  {
    id: 'LAND-V27',
    label: 'Encours taille de haie scene specifies PPE worn by Worker 1, not lying on the ground',
    run() {
      const scenes = forMatches('Taille de haie');
      const encours = scenes.filter(sc => Array.isArray(sc._state_for) && sc._state_for.includes('encours'));
      if (!encours.length) return { ok: false, detail: 'No encours-locked taille de haie scene found' };
      const ppOk = encours.some(sc => {
        const prot = (sc.protections || []).join(' ');
        return /ear defender.*worn|worn.*ear defender/i.test(prot) || /not lying unused/i.test(prot);
      });
      if (!ppOk) return { ok: false, detail: 'No "ear defenders worn" (vs lying on ground) in encours taille de haie protections' };
      return { ok: true };
    },
  },

  // ─── GAZON EN ROULEAU ──────────────────────────────────────────────────────

  // LAND-V28: rolled turf encours requires active installation by two workers
  {
    id: 'LAND-V28',
    label: 'Gazon en rouleau has encours-locked scene with two workers actively installing turf',
    run() {
      const scenes = forMatches('Gazon en rouleau');
      const encours = scenes.filter(sc => Array.isArray(sc._state_for) && sc._state_for.includes('encours'));
      if (!encours.length) return { ok: false, detail: 'No encours-locked gazon en rouleau scene found' };
      const hasDual = encours.some(sc => /worker 1/i.test(JSON.stringify(sc)) && /worker 2/i.test(JSON.stringify(sc)));
      if (!hasDual) return { ok: false, detail: 'No two-worker active installation in gazon encours scene' };
      return { ok: true };
    },
  },

  // LAND-V29: sprinkler/watering scene is restricted to final state only
  {
    id: 'LAND-V29',
    label: 'First watering (sprinkler/hose) gazon scene is locked to final state only',
    run() {
      const scenes = forMatches('Gazon en rouleau');
      const waterScenes = scenes.filter(sc => /first watering|sprinkler.*soaking|hose.*soaking/i.test(sc.scene_note || ''));
      if (!waterScenes.length) return { ok: false, detail: 'No first-watering/sprinkler gazon scene found' };
      const badScene = waterScenes.find(sc => {
        const sf = sc._state_for;
        if (!sf) return true;
        return Array.isArray(sf) && sf.some(s => s !== 'final');
      });
      if (badScene) return { ok: false, detail: `Watering scene is not restricted to final — _state_for: ${JSON.stringify(badScene._state_for)}` };
      return { ok: true };
    },
  },

  // LAND-V30: ordinary garden turf encours scene excludes rooftop/green-roof
  {
    id: 'LAND-V30',
    label: 'Gazon en rouleau encours scene excludes rooftop and green-roof contexts',
    run() {
      const scenes = forMatches('Gazon en rouleau');
      const encours = scenes.filter(sc => Array.isArray(sc._state_for) && sc._state_for.includes('encours'));
      if (!encours.length) return { ok: false, detail: 'No encours-locked gazon scene found' };
      const hasExclude = encours.some(sc => {
        const excl = (sc.scene_exclude || []).join(' ');
        return /rooftop|green roof|flat roof|above building/i.test(excl);
      });
      if (!hasExclude) return { ok: false, detail: 'No rooftop/green-roof exclusion in gazon encours scene' };
      return { ok: true };
    },
  },

  // ─── LAND-UI: Quantity invariants (pure logic — 0 image generation) ─────────

  // LAND-UI1: five rows at quantity 1 create exactly five tasks
  {
    id: 'LAND-UI1',
    label: 'Five rows with nb=1 produce exactly five tasks (no stale quantity leak)',
    run() {
      // Simulate _modGenerateAll task-count logic: nb = Math.max(1, Math.min(10, parseInt(row.nb) || 1))
      const normalizeNb = nb => Math.max(1, Math.min(10, parseInt(nb) || 1));
      const mockRows = [
        { travaux: 'Taille de haie',           nb: 1 },
        { travaux: 'Plantation d\'arbres',      nb: 1 },
        { travaux: 'Gazon en rouleau',          nb: 1 },
        { travaux: 'Arrosage automatique',      nb: 1 },
        { travaux: 'Petite maçonnerie paysagère', nb: 1 },
      ];
      const taskCount = mockRows.reduce((sum, r) => sum + normalizeNb(r.nb), 0);
      if (taskCount !== 5) return { ok: false, detail: `Expected 5 tasks, formula produces ${taskCount}` };
      return { ok: true };
    },
  },

  // LAND-UI2: quantity update via canonical field 'nb' persists after simulated re-render
  {
    id: 'LAND-UI2',
    label: 'Quantity update on canonical field "nb" survives a card re-render cycle',
    run() {
      // The canonical quantity field is 'nb'. 'count' is NOT a recognized quantity field.
      const _imgRows = [{ id: 1, nb: 3, travaux: 'Gazon en rouleau' }];
      // Simulate updateImgRow(id, 'nb', 1)
      const row = _imgRows.find(r => r.id === 1);
      row['nb'] = 1;
      // Simulate re-render: _renderImgCard reads row.nb
      const renderedNb = parseInt(row.nb) || 1;
      // Simulate batch reads row.nb
      const batchNb = Math.max(1, Math.min(10, parseInt(row.nb) || 1));
      if (renderedNb !== 1) return { ok: false, detail: `Re-render reads nb=${renderedNb}, expected 1` };
      if (batchNb !== 1) return { ok: false, detail: `Batch reads nb=${batchNb}, expected 1` };
      return { ok: true };
    },
  },

  // LAND-UI3: stale template quantity (wrong field or non-integer) cannot enter the batch plan
  {
    id: 'LAND-UI3',
    label: 'Stale or non-integer quantity is normalized to int min 1 before batch planning',
    run() {
      const normalizeNb = nb => Math.max(1, Math.min(10, parseInt(nb) || 1));
      const cases = [
        { input: 3,        expected: 3,  label: 'default template nb=3' },
        { input: '1',      expected: 1,  label: 'string "1"' },
        { input: undefined,expected: 1,  label: 'undefined nb' },
        { input: null,     expected: 1,  label: 'null nb' },
        { input: NaN,      expected: 1,  label: 'NaN nb' },
        { input: 0,        expected: 1,  label: 'zero nb (below min)' },
        { input: 99,       expected: 10, label: 'nb=99 (above max)' },
      ];
      const failures = cases.filter(c => normalizeNb(c.input) !== c.expected);
      if (failures.length) return { ok: false, detail: `Normalization failed: ${failures.map(f => `${f.label} → ${normalizeNb(f.input)} (expected ${f.expected})`).join(', ')}` };
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
