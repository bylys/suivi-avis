/**
 * debug/hedge-tests.js — HEDGE-PROD test suite
 * Validates that Taille de haie scenes are free of toiture contamination,
 * carry correct locked constraints, and pass/fail the service visual gate.
 * 0 real Images / Vision / rewriter calls — all mocked.
 */

const { buildDallePromptV2 }            = await import('../prompt/scene-builder.js?bust=hp1');
const { _buildPresencePlan }            = await import('../safety/worker-validator.js?bust=hp1');
const { _applySiteRealism }             = await import('../resolution/service-resolver.js?bust=hp1');
const { _applyVariation }               = await import('../resolution/scene-resolver.js?bust=hp1');
const { _appendLockedFinalConstraints } = await import('../prompt/locked-constraints.js?bust=hp1');
const { checkImageSafety }              = await import('../pipeline/safety-check.js?bust=hp1');
const { _hashSeed }                     = await import('../utils/deterministic.js?bust=hp1');

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeRow(travaux, etat = 'encours', metier = 'paysagiste', nb = 1) {
  return { metier, travaux, etat, nb, ville: 'Lyon', meteo: 'auto', contexte: 'maison' };
}

function buildTask(travaux, etat = 'encours', metier = 'paysagiste') {
  const row       = makeRow(travaux, etat, metier);
  const jsonScene = buildDallePromptV2(row);
  const base      = JSON.parse(jsonScene);
  const planSeed  = _hashSeed(`${base._matched_key || ''}${base._matched_service || ''}plan`);
  const presencePlan = _buildPresencePlan(1, base.state_level, base._matched_key, planSeed);
  return {
    taskId: 1, row, i: 0, nb: 1, jsonScene, presencePlan, slug: travaux,
    _planBase: Object.assign({}, base),
    status: 'pending', imageAttempt: 1,
    _pre_assigned_worker_presence: 'workers',
    _pre_assigned_worker_count:    2,
    _pre_assigned_composition:     'medium_intervention',
    _pre_assigned_vehicle:         'absent',
    _capture_defects_resolved:     [],
  };
}

function buildHedgeTask(etat = 'encours') {
  return buildTask('Taille de haie', etat, 'paysagiste');
}

function getVariedScene(task) {
  let sceneStr = task.jsonScene;
  const _rs = JSON.parse(sceneStr);
  _rs._pre_assigned_worker_count = task._pre_assigned_worker_count;
  sceneStr = JSON.stringify(_rs);
  const realistScene = _applySiteRealism(sceneStr, 0);
  const _rs2 = JSON.parse(realistScene);
  _rs2._pre_assigned_worker_count = task._pre_assigned_worker_count;
  const realistWithPlan = JSON.stringify(_rs2);
  const variedScene = _applyVariation(realistWithPlan, 0, task._pre_assigned_worker_presence);
  return { variedObj: JSON.parse(variedScene) };
}

function makeMockVisionFetch(visionResponse) {
  return async (_url, _opts) => ({
    ok: true, status: 200,
    json: async () => ({ choices: [{ message: { content: JSON.stringify(visionResponse) } }] }),
  });
}

async function readMockImpl(resp) {
  return { ok: resp.ok, status: resp.status, data: await resp.json() };
}

// ─── tests ───────────────────────────────────────────────────────────────────

const tests = [

  // HEDGE-PROD1: task/result/row mapping preserved
  {
    id: 'HEDGE-PROD1',
    label: 'Taille de haie task maps to correct matched_service and matched_key',
    run() {
      const task = buildHedgeTask();
      if (task._planBase._matched_service !== 'Taille de haie')
        return { ok: false, detail: `matched_service=${task._planBase._matched_service} (expected "Taille de haie")` };
      if (task._planBase._matched_key !== 'paysagiste')
        return { ok: false, detail: `matched_key=${task._planBase._matched_key} (expected "paysagiste")` };
      return { ok: true };
    },
  },

  // HEDGE-PROD2: no toiture contamination in taille de haie base scene
  {
    id: 'HEDGE-PROD2',
    label: 'No toiture contamination in Taille de haie scene JSON',
    run() {
      const task = buildHedgeTask();
      const sceneStr = JSON.stringify(JSON.parse(task.jsonScene)).toLowerCase();
      const roofTerms = ['toiture', 'roof repair', 'gutter', 'nettoyage toiture', 'roof tile', 'echelle toiture'];
      const found = roofTerms.filter(t => sceneStr.includes(t));
      if (found.length) return { ok: false, detail: `Roof terms found in scene JSON: ${found.join(', ')}` };
      return { ok: true };
    },
  },

  // HEDGE-PROD3: no shared mutation between Taille de haie and another paysagiste task
  {
    id: 'HEDGE-PROD3',
    label: 'No shared mutation between Taille de haie and Gazon en rouleau tasks',
    run() {
      const t1 = buildHedgeTask();
      const t2 = buildTask('Gazon en rouleau', 'encours', 'paysagiste');
      const { variedObj: v1 } = getVariedScene(t1);
      const { variedObj: v2 } = getVariedScene(t2);
      if (t1._planBase._matched_service === t2._planBase._matched_service)
        return { ok: false, detail: 'Both tasks share the same matched_service — expected different' };
      v1._test_mutation_marker = 'mutated';
      if (v2._test_mutation_marker === 'mutated')
        return { ok: false, detail: 'Shared object reference detected — mutation from v1 propagated to v2' };
      return { ok: true };
    },
  },

  // HEDGE-PROD4: locked prompt contains hedge + active trimming terms
  {
    id: 'HEDGE-PROD4',
    label: 'Locked prompt contains ACTIVE HEDGE TRIMMING and hedge trimmer terms',
    run() {
      const task = buildHedgeTask();
      const { variedObj } = getVariedScene(task);
      const locked = _appendLockedFinalConstraints('scene description', variedObj);
      const REQUIRED = ['ACTIVE HEDGE TRIMMING', 'hedge trimmer', 'hedge'];
      const missing = REQUIRED.filter(t => !locked.includes(t));
      if (missing.length) return { ok: false, detail: `Missing in locked prompt: ${missing.join(', ')}` };
      return { ok: true };
    },
  },

  // HEDGE-PROD5: locked prompt contains NO ROOF WORK forbidden terms
  {
    id: 'HEDGE-PROD5',
    label: 'Locked prompt contains NO ROOF WORK forbidden terms for Taille de haie',
    run() {
      const task = buildHedgeTask();
      const { variedObj } = getVariedScene(task);
      const locked = _appendLockedFinalConstraints('scene description', variedObj);
      const FORBIDDEN = ['NO ROOF WORK', 'NO WORKER ON A ROOF', 'NO ROOF LADDER'];
      const missing = FORBIDDEN.filter(t => !locked.includes(t));
      if (missing.length) return { ok: false, detail: `Missing forbidden terms: ${missing.join(', ')}` };
      return { ok: true };
    },
  },

  // HEDGE-PROD6: encours keeps 2 workers and both role lines
  {
    id: 'HEDGE-PROD6',
    label: 'Taille de haie encours: var_workers=2 and Worker 1 / Worker 2 roles in locked prompt',
    run() {
      const task = buildHedgeTask('encours');
      const { variedObj } = getVariedScene(task);
      if (variedObj.var_workers !== 2)
        return { ok: false, detail: `var_workers=${variedObj.var_workers} (expected 2)` };
      const locked = _appendLockedFinalConstraints('scene description', variedObj);
      if (!locked.includes('Worker 1') || !locked.includes('Worker 2'))
        return { ok: false, detail: 'Worker 1 / Worker 2 role lines not found in locked prompt' };
      return { ok: true };
    },
  },

  // HEDGE-PROD7: blower-only forbidden in encours
  {
    id: 'HEDGE-PROD7',
    label: 'Taille de haie encours: NO BLOWER-ONLY OR CLEANUP-ONLY SCENE in locked prompt',
    run() {
      const task = buildHedgeTask('encours');
      const { variedObj } = getVariedScene(task);
      const locked = _appendLockedFinalConstraints('scene description', variedObj);
      if (!locked.includes('NO BLOWER-ONLY OR CLEANUP-ONLY SCENE'))
        return { ok: false, detail: 'Blower-only forbidden term not found in locked prompt' };
      return { ok: true };
    },
  },

  // HEDGE-PROD8: mock Vision rejects a roof image (worker_on_roof=true)
  {
    id: 'HEDGE-PROD8',
    label: 'Service visual gate rejects roof image (worker_on_roof=true → forbidden_roof_scene)',
    async run() {
      const safety = await checkImageSafety('MOCK_B64', 'paysagiste', 'mock-key', {
        fetchImpl: makeMockVisionFetch({
          safe: true,
          hedge_visible: false,
          hedge_trimmer_visible: false,
          active_trimming_visible: false,
          worker_on_roof: true,
          roof_work_visible: true,
          service_visual_match: false,
          visible_worker_count: 2,
          worker_count_match: true,
        }),
        readResponseImpl: readMockImpl,
        expectedWorkerCount: 2,
        matchedService: 'Taille de haie',
      });
      if (safety.safe !== false)
        return { ok: false, detail: `Expected safe=false, got safe=${safety.safe}` };
      if (safety.reason !== 'forbidden_roof_scene')
        return { ok: false, detail: `Expected reason=forbidden_roof_scene, got ${safety.reason}` };
      if (safety.severity !== 'critical')
        return { ok: false, detail: `Expected severity=critical, got ${safety.severity}` };
      return { ok: true };
    },
  },

  // HEDGE-PROD9: mock Vision rejects image without hedge
  {
    id: 'HEDGE-PROD9',
    label: 'Service visual gate rejects image without hedge (hedge_visible=false → service_visual_mismatch)',
    async run() {
      const safety = await checkImageSafety('MOCK_B64', 'paysagiste', 'mock-key', {
        fetchImpl: makeMockVisionFetch({
          safe: true,
          hedge_visible: false,
          hedge_trimmer_visible: false,
          active_trimming_visible: false,
          worker_on_roof: false,
          roof_work_visible: false,
          service_visual_match: false,
          visible_worker_count: 2,
          worker_count_match: true,
        }),
        readResponseImpl: readMockImpl,
        expectedWorkerCount: 2,
        matchedService: 'Taille de haie',
      });
      if (safety.safe !== false)
        return { ok: false, detail: `Expected safe=false, got safe=${safety.safe}` };
      if (safety.reason !== 'service_visual_mismatch')
        return { ok: false, detail: `Expected reason=service_visual_mismatch, got ${safety.reason}` };
      return { ok: true };
    },
  },

  // HEDGE-PROD10: mock Vision accepts correct active hedge trimming scene
  {
    id: 'HEDGE-PROD10',
    label: 'Service visual gate accepts correct active hedge trimming scene',
    async run() {
      const safety = await checkImageSafety('MOCK_B64', 'paysagiste', 'mock-key', {
        fetchImpl: makeMockVisionFetch({
          safe: true,
          hedge_visible: true,
          hedge_trimmer_visible: true,
          active_trimming_visible: true,
          worker_on_roof: false,
          roof_work_visible: false,
          service_visual_match: true,
          visible_worker_count: 2,
          worker_count_match: true,
          expected_worker_count: 2,
        }),
        readResponseImpl: readMockImpl,
        expectedWorkerCount: 2,
        matchedService: 'Taille de haie',
      });
      if (safety.safe !== true)
        return { ok: false, detail: `Expected safe=true, got safe=${safety.safe}, reason=${safety.reason}` };
      return { ok: true };
    },
  },


  // ── FAIL-CLOSED tests ────────────────────────────────────────────────────────

  // HEDGE-PROD11: hedge_visible absent → reject (fail-closed)
  {
    id: 'HEDGE-PROD11',
    label: 'Fail-closed: hedge_visible absent → service_visual_mismatch (not safe)',
    async run() {
      const safety = await checkImageSafety('MOCK_B64', 'paysagiste', 'mock-key', {
        fetchImpl: makeMockVisionFetch({
          safe: true,
          // hedge_visible intentionally absent
          hedge_trimmer_visible: true,
          active_trimming_visible: true,
          worker_on_roof: false,
          roof_work_visible: false,
          service_visual_match: true,
          visible_worker_count: 2,
          worker_count_match: true,
        }),
        readResponseImpl: readMockImpl,
        expectedWorkerCount: 2,
        matchedService: 'Taille de haie',
      });
      if (safety.safe !== false)
        return { ok: false, detail: `Expected safe=false when hedge_visible absent, got safe=${safety.safe}` };
      if (safety.reason !== 'service_visual_mismatch')
        return { ok: false, detail: `Expected service_visual_mismatch, got ${safety.reason}` };
      return { ok: true };
    },
  },

  // HEDGE-PROD12: hedge_trimmer_visible absent → reject (fail-closed)
  {
    id: 'HEDGE-PROD12',
    label: 'Fail-closed: hedge_trimmer_visible absent → service_visual_mismatch',
    async run() {
      const safety = await checkImageSafety('MOCK_B64', 'paysagiste', 'mock-key', {
        fetchImpl: makeMockVisionFetch({
          safe: true,
          hedge_visible: true,
          // hedge_trimmer_visible intentionally absent
          active_trimming_visible: true,
          worker_on_roof: false,
          roof_work_visible: false,
          service_visual_match: true,
          visible_worker_count: 2,
          worker_count_match: true,
        }),
        readResponseImpl: readMockImpl,
        expectedWorkerCount: 2,
        matchedService: 'Taille de haie',
      });
      if (safety.safe !== false)
        return { ok: false, detail: `Expected safe=false when hedge_trimmer_visible absent, got safe=${safety.safe}` };
      if (safety.reason !== 'service_visual_mismatch')
        return { ok: false, detail: `Expected service_visual_mismatch, got ${safety.reason}` };
      return { ok: true };
    },
  },

  // HEDGE-PROD13: service_visual_match absent → reject (fail-closed)
  {
    id: 'HEDGE-PROD13',
    label: 'Fail-closed: service_visual_match absent → service_visual_mismatch',
    async run() {
      const safety = await checkImageSafety('MOCK_B64', 'paysagiste', 'mock-key', {
        fetchImpl: makeMockVisionFetch({
          safe: true,
          hedge_visible: true,
          hedge_trimmer_visible: true,
          active_trimming_visible: true,
          worker_on_roof: false,
          roof_work_visible: false,
          // service_visual_match intentionally absent
          visible_worker_count: 2,
          worker_count_match: true,
        }),
        readResponseImpl: readMockImpl,
        expectedWorkerCount: 2,
        matchedService: 'Taille de haie',
      });
      if (safety.safe !== false)
        return { ok: false, detail: `Expected safe=false when service_visual_match absent, got safe=${safety.safe}` };
      if (safety.reason !== 'service_visual_mismatch')
        return { ok: false, detail: `Expected service_visual_mismatch, got ${safety.reason}` };
      return { ok: true };
    },
  },

  // ── SCOPE tests ───────────────────────────────────────────────────────────────

  // HEDGE-PROD14: variant "taille haie" activates the gate
  {
    id: 'HEDGE-PROD14',
    label: 'Scope: variant "taille haie" activates gate (alias → Taille de haie)',
    async run() {
      const safety = await checkImageSafety('MOCK_B64', 'paysagiste', 'mock-key', {
        fetchImpl: makeMockVisionFetch({
          safe: true,
          hedge_visible: false, // will trigger gate rejection
          hedge_trimmer_visible: false,
          worker_on_roof: false,
          service_visual_match: false,
          visible_worker_count: 2,
          worker_count_match: true,
        }),
        readResponseImpl: readMockImpl,
        expectedWorkerCount: 2,
        matchedService: 'taille haie',
      });
      if (safety.safe !== false)
        return { ok: false, detail: `Gate did not activate for "taille haie" variant — safe=${safety.safe}` };
      if (safety.reason !== 'service_visual_mismatch')
        return { ok: false, detail: `Expected service_visual_mismatch, got ${safety.reason}` };
      return { ok: true };
    },
  },

  // HEDGE-PROD15: variant "taille-de-haie" activates the gate
  {
    id: 'HEDGE-PROD15',
    label: 'Scope: variant "taille-de-haie" activates gate (alias → Taille de haie)',
    async run() {
      const safety = await checkImageSafety('MOCK_B64', 'paysagiste', 'mock-key', {
        fetchImpl: makeMockVisionFetch({
          safe: true,
          hedge_visible: false,
          hedge_trimmer_visible: false,
          worker_on_roof: false,
          service_visual_match: false,
          visible_worker_count: 2,
          worker_count_match: true,
        }),
        readResponseImpl: readMockImpl,
        expectedWorkerCount: 2,
        matchedService: 'taille-de-haie',
      });
      if (safety.safe !== false)
        return { ok: false, detail: `Gate did not activate for "taille-de-haie" variant — safe=${safety.safe}` };
      if (safety.reason !== 'service_visual_mismatch')
        return { ok: false, detail: `Expected service_visual_mismatch, got ${safety.reason}` };
      return { ok: true };
    },
  },

  // HEDGE-PROD16: "Entretien jardin" does NOT activate the gate — safe=true passes through
  {
    id: 'HEDGE-PROD16',
    label: 'Scope: "Entretien jardin" does not activate the hedge gate',
    async run() {
      const safety = await checkImageSafety('MOCK_B64', 'paysagiste', 'mock-key', {
        fetchImpl: makeMockVisionFetch({
          safe: true,
          // No hedge fields — gate must not activate
          visible_worker_count: 2,
          worker_count_match: true,
        }),
        readResponseImpl: readMockImpl,
        expectedWorkerCount: 2,
        matchedService: 'Entretien jardin',
      });
      if (safety.safe !== true)
        return { ok: false, detail: `Gate activated for "Entretien jardin" — safe=${safety.safe}, reason=${safety.reason}` };
      return { ok: true };
    },
  },

  // HEDGE-PROD17: "Nettoyage toiture" (different metier) — gate must not activate for paysagiste rule
  {
    id: 'HEDGE-PROD17',
    label: 'Scope: "Nettoyage toiture" (nettoyage_toiture metier) does not activate the hedge gate',
    async run() {
      const safety = await checkImageSafety('MOCK_B64', 'nettoyage_toiture', 'mock-key', {
        fetchImpl: makeMockVisionFetch({
          safe: true,
          visible_worker_count: 2,
          worker_count_match: true,
        }),
        readResponseImpl: readMockImpl,
        expectedWorkerCount: 2,
        matchedService: 'Nettoyage toiture',
      });
      if (safety.safe !== true)
        return { ok: false, detail: `Gate activated for "Nettoyage toiture" — safe=${safety.safe}, reason=${safety.reason}` };
      return { ok: true };
    },
  },

];

// ─── runner ──────────────────────────────────────────────────────────────────

export async function _runHedgeTests() {
  let passed = 0;
  let failed = 0;
  const results = [];

  for (const test of tests) {
    let result;
    try {
      result = await Promise.resolve(test.run());
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
    results.push({ id: test.id, label: test.label, ...result });
  }

  console.log(`\n--- HEDGE-PROD: ${passed}/${tests.length}${failed ? ` — ${failed} FAILED ❌` : ' ✅'} ---`);
  return { passed, failed, total: tests.length, results };
}
