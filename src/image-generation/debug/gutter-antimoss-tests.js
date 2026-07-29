/**
 * debug/gutter-antimoss-tests.js — ONE-WORKER, GUTTER-V, ANTIMOSS-V, GUTTER-POLISH test suites
 * Validates: 1-worker _expectedWC propagation, gutter Vision gate pass/fail conditions,
 * anti-mousse two-worker MEWP gate pass/fail conditions, gutter visual polish constraints.
 * 0 real Images / Vision / rewriter calls — all mocked.
 */

const { buildVisionSafetyRequest, checkImageSafety } = await import('../pipeline/safety-check.js?bust=ga2');
const { SERVICE_VISUAL_GATE_RULES, _SERVICE_GATE_ALIASES, FORBIDDEN_SAFETY_BY_METIER } = await import('../safety/safety-rules.js?bust=ga2');
const { WORKER_SCENE_RULES } = await import('../safety/worker-rules.js?bust=ga2');
const { _appendLockedFinalConstraints } = await import('../prompt/locked-constraints.js?bust=ga2');
const { _selectCaptureDefects } = await import('../planning/capture-defect-planner.js?bust=ga2');

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeMockVisionFetch(visionResponse) {
  return async (_url, _opts) => ({
    ok: true, status: 200,
    json: async () => ({ choices: [{ message: { content: JSON.stringify(visionResponse) } }] }),
  });
}

async function readMockImpl(resp) {
  return { ok: resp.ok, status: resp.status, data: await resp.json() };
}

function gutterPass() {
  return {
    safe: true, severity: 'ok',
    worker_on_roof: false, worker_on_highest_rung: false, extreme_side_lean: false,
    gutter_visible: true, cleaning_action_visible: true,
    professional_ladder_visible: true, ladder_stable: true,
    service_visual_match: true,
  };
}

// ─── tests ───────────────────────────────────────────────────────────────────

const tests = [

  // ONE-WORKER1: planned=1 → buildVisionSafetyRequest includes WORKER COUNT for expected=1
  {
    id: 'ONE-WORKER1',
    label: 'buildVisionSafetyRequest includes WORKER COUNT instruction when expectedWorkerCount=1',
    run() {
      const req = buildVisionSafetyRequest('nettoyage_gouttieres', 'FAKE_B64', 'sk-fake', 1);
      if (!req) return { ok: false, detail: 'buildVisionSafetyRequest returned null for nettoyage_gouttieres' };
      const bodyObj = JSON.parse(req.body);
      const textMsg = bodyObj.messages?.[0]?.content?.find(c => c.type === 'text')?.text || '';
      if (!textMsg.includes('1 expected')) return { ok: false, detail: 'Vision prompt missing "1 expected" in WORKER COUNT instruction' };
      if (!textMsg.includes('visible_worker_count')) return { ok: false, detail: 'Vision prompt missing visible_worker_count field instruction' };
      if (!textMsg.includes('worker_count_mismatch')) return { ok: false, detail: 'Vision prompt missing worker_count_mismatch rejection instruction' };
      return { ok: true };
    },
  },

  // ONE-WORKER2: expected=1 + visible=1 → pass
  {
    id: 'ONE-WORKER2',
    label: 'checkImageSafety: expected=1, visible=1 → safe (worker_count_match=true)',
    async run() {
      const safety = await checkImageSafety('MOCK_B64', 'nettoyage_gouttieres', 'mock-key', {
        fetchImpl: makeMockVisionFetch({
          safe: true, worker_count_match: true, visible_worker_count: 1,
          ...gutterPass(),
        }),
        readResponseImpl: readMockImpl,
        expectedWorkerCount: 1,
        matchedService: 'nettoyage gouttieres',
      });
      if (safety.safe !== true) return { ok: false, detail: `safe=${safety.safe} reason=${safety.reason} (expected safe=true)` };
      return { ok: true };
    },
  },

  // ONE-WORKER3: expected=1 + visible=0 → worker_count_mismatch
  {
    id: 'ONE-WORKER3',
    label: 'checkImageSafety: expected=1, visible=0 → worker_count_mismatch',
    async run() {
      const safety = await checkImageSafety('MOCK_B64', 'nettoyage_gouttieres', 'mock-key', {
        fetchImpl: makeMockVisionFetch({
          safe: false, worker_count_match: false, visible_worker_count: 0,
          ...gutterPass(),
        }),
        readResponseImpl: readMockImpl,
        expectedWorkerCount: 1,
        matchedService: 'nettoyage gouttieres',
      });
      if (safety.safe !== false) return { ok: false, detail: `safe=${safety.safe} (expected false)` };
      if (safety.reason !== 'worker_count_mismatch') return { ok: false, detail: `reason=${safety.reason} (expected worker_count_mismatch)` };
      return { ok: true };
    },
  },

  // GUTTER-V1: professional ladder against facade (no standoff) → accepted
  {
    id: 'GUTTER-V1',
    label: 'Nettoyage gouttières: professional extension ladder against facade → accepted',
    async run() {
      const safety = await checkImageSafety('MOCK_B64', 'nettoyage_gouttieres', 'mock-key', {
        fetchImpl: makeMockVisionFetch(gutterPass()),
        readResponseImpl: readMockImpl,
        expectedWorkerCount: 1,
        matchedService: 'nettoyage gouttieres',
      });
      if (safety.safe !== true) return { ok: false, detail: `safe=${safety.safe} reason=${safety.reason}` };
      return { ok: true };
    },
  },

  // GUTTER-V2: absence of standoff is not a reject_condition (structural)
  {
    id: 'GUTTER-V2',
    label: 'Nettoyage gouttières: gate has no standoff/anchor field in reject_conditions',
    run() {
      const gate = SERVICE_VISUAL_GATE_RULES['Nettoyage gouttières'];
      if (!gate) return { ok: false, detail: 'SERVICE_VISUAL_GATE_RULES["Nettoyage gouttières"] not found' };
      const standoffField = gate.reject_conditions.find(c =>
        c.field.toLowerCase().includes('standoff') ||
        c.field.toLowerCase().includes('anchor') ||
        c.field.toLowerCase().includes('strap')
      );
      if (standoffField) return { ok: false, detail: `Unexpected standoff/anchor field in reject_conditions: ${standoffField.field}` };
      return { ok: true };
    },
  },

  // GUTTER-V3: professional A-frame stable ladder → accepted
  {
    id: 'GUTTER-V3',
    label: 'Nettoyage gouttières: A-frame ladder (ladder_stable=true, professional_ladder_visible=true) → accepted',
    async run() {
      const safety = await checkImageSafety('MOCK_B64', 'nettoyage_gouttieres', 'mock-key', {
        fetchImpl: makeMockVisionFetch({
          safe: true, worker_on_roof: false, worker_on_highest_rung: false, extreme_side_lean: false,
          gutter_visible: true, cleaning_action_visible: true,
          professional_ladder_visible: true, ladder_stable: true,
          service_visual_match: true,
        }),
        readResponseImpl: readMockImpl,
        expectedWorkerCount: 1,
        matchedService: 'nettoyage gouttieres',
      });
      if (safety.safe !== true) return { ok: false, detail: `safe=${safety.safe} reason=${safety.reason}` };
      return { ok: true };
    },
  },

  // GUTTER-V4: 1-worker scene, expected=1, visible=1 → accepted
  {
    id: 'GUTTER-V4',
    label: 'Nettoyage gouttières: 1-worker scene (expected=1, visible=1) → accepted',
    async run() {
      const safety = await checkImageSafety('MOCK_B64', 'nettoyage_gouttieres', 'mock-key', {
        fetchImpl: makeMockVisionFetch({ ...gutterPass(), worker_count_match: true, visible_worker_count: 1 }),
        readResponseImpl: readMockImpl,
        expectedWorkerCount: 1,
        matchedService: 'nettoyage gouttieres',
      });
      if (safety.safe !== true) return { ok: false, detail: `safe=${safety.safe} reason=${safety.reason}` };
      return { ok: true };
    },
  },

  // GUTTER-V5: 2-worker scene, expected=2, visible=2, distinct roles → accepted
  {
    id: 'GUTTER-V5',
    label: 'Nettoyage gouttières: 2-worker scene (expected=2, visible=2) → accepted',
    async run() {
      const safety = await checkImageSafety('MOCK_B64', 'nettoyage_gouttieres', 'mock-key', {
        fetchImpl: makeMockVisionFetch({ ...gutterPass(), worker_count_match: true, visible_worker_count: 2 }),
        readResponseImpl: readMockImpl,
        expectedWorkerCount: 2,
        matchedService: 'nettoyage gouttieres',
      });
      if (safety.safe !== true) return { ok: false, detail: `safe=${safety.safe} reason=${safety.reason}` };
      return { ok: true };
    },
  },

  // GUTTER-V6: worker_on_roof=true → forbidden_roof_scene
  {
    id: 'GUTTER-V6',
    label: 'Nettoyage gouttières: worker_on_roof=true → forbidden_roof_scene',
    async run() {
      const safety = await checkImageSafety('MOCK_B64', 'nettoyage_gouttieres', 'mock-key', {
        fetchImpl: makeMockVisionFetch({ ...gutterPass(), worker_on_roof: true }),
        readResponseImpl: readMockImpl,
        expectedWorkerCount: 1,
        matchedService: 'nettoyage gouttieres',
      });
      if (safety.safe !== false) return { ok: false, detail: `safe=${safety.safe} (expected false)` };
      if (safety.reason !== 'forbidden_roof_scene') return { ok: false, detail: `reason=${safety.reason} (expected forbidden_roof_scene)` };
      return { ok: true };
    },
  },

  // GUTTER-V7: worker_on_highest_rung=true → critical_violation; extreme_side_lean=true → critical_violation
  {
    id: 'GUTTER-V7',
    label: 'Nettoyage gouttières: worker_on_highest_rung or extreme_side_lean → critical_violation',
    async run() {
      const failures = [];

      const s1 = await checkImageSafety('MOCK_B64', 'nettoyage_gouttieres', 'mock-key', {
        fetchImpl: makeMockVisionFetch({ ...gutterPass(), worker_on_highest_rung: true }),
        readResponseImpl: readMockImpl,
        expectedWorkerCount: 1,
        matchedService: 'nettoyage gouttieres',
      });
      if (s1.safe !== false) failures.push(`worker_on_highest_rung: safe=${s1.safe} (expected false)`);
      if (s1.reason !== 'critical_violation') failures.push(`worker_on_highest_rung: reason=${s1.reason} (expected critical_violation)`);

      const s2 = await checkImageSafety('MOCK_B64', 'nettoyage_gouttieres', 'mock-key', {
        fetchImpl: makeMockVisionFetch({ ...gutterPass(), extreme_side_lean: true }),
        readResponseImpl: readMockImpl,
        expectedWorkerCount: 1,
        matchedService: 'nettoyage gouttieres',
      });
      if (s2.safe !== false) failures.push(`extreme_side_lean: safe=${s2.safe} (expected false)`);
      if (s2.reason !== 'critical_violation') failures.push(`extreme_side_lean: reason=${s2.reason} (expected critical_violation)`);

      if (failures.length) return { ok: false, detail: failures.join('; ') };
      return { ok: true };
    },
  },

  // GUTTER-V8: no cleaning action → service_visual_mismatch
  {
    id: 'GUTTER-V8',
    label: 'Nettoyage gouttières: cleaning_action_visible=false → service_visual_mismatch',
    async run() {
      const safety = await checkImageSafety('MOCK_B64', 'nettoyage_gouttieres', 'mock-key', {
        fetchImpl: makeMockVisionFetch({ ...gutterPass(), cleaning_action_visible: false }),
        readResponseImpl: readMockImpl,
        expectedWorkerCount: 1,
        matchedService: 'nettoyage gouttieres',
      });
      if (safety.safe !== false) return { ok: false, detail: `safe=${safety.safe} (expected false)` };
      if (safety.reason !== 'service_visual_mismatch') return { ok: false, detail: `reason=${safety.reason} (expected service_visual_mismatch)` };
      return { ok: true };
    },
  },

  // GUTTER-V9: débouchage gate requires rod/flexible at junction (service_visual_match=false)
  {
    id: 'GUTTER-V9',
    label: 'Débouchage gouttières: service_visual_match=false (no rod at junction) → service_visual_mismatch',
    async run() {
      const safety = await checkImageSafety('MOCK_B64', 'nettoyage_gouttieres', 'mock-key', {
        fetchImpl: makeMockVisionFetch({
          safe: true, worker_on_roof: false, worker_on_highest_rung: false, extreme_side_lean: false,
          gutter_visible: true, cleaning_action_visible: true,
          professional_ladder_visible: true, ladder_stable: true,
          service_visual_match: false,
        }),
        readResponseImpl: readMockImpl,
        expectedWorkerCount: 1,
        matchedService: 'debouchage gouttieres',
      });
      if (safety.safe !== false) return { ok: false, detail: `safe=${safety.safe} (expected false)` };
      if (safety.reason !== 'service_visual_mismatch') return { ok: false, detail: `reason=${safety.reason} (expected service_visual_mismatch)` };
      return { ok: true };
    },
  },

  // GUTTER-V10: remplacement/pose gouttières keep 2-worker minimum (structural)
  {
    id: 'GUTTER-V10',
    label: 'nettoyage_gouttieres service_worker_minimums: remplacement=2, pose=2',
    run() {
      const rules = WORKER_SCENE_RULES.nettoyage_gouttieres;
      if (!rules) return { ok: false, detail: 'WORKER_SCENE_RULES.nettoyage_gouttieres not found' };
      const mins = rules.service_worker_minimums || {};
      const failures = [];
      if (mins.remplacement_gouttieres !== 2) failures.push(`remplacement_gouttieres=${mins.remplacement_gouttieres} (expected 2)`);
      if (mins.pose_gouttieres !== 2) failures.push(`pose_gouttieres=${mins.pose_gouttieres} (expected 2)`);
      if (rules.min_workers_when_visible !== 1) failures.push(`min_workers_when_visible=${rules.min_workers_when_visible} (expected 1 for nettoyage)`);
      if (failures.length) return { ok: false, detail: failures.join('; ') };
      return { ok: true };
    },
  },

  // ANTIMOSS-V1: basket worker + ground worker visible + separated → accepted
  {
    id: 'ANTIMOSS-V1',
    label: 'Anti-mousse encours: basket+ground worker both visible and separated → accepted',
    async run() {
      const safety = await checkImageSafety('MOCK_B64', 'nettoyage_toiture', 'mock-key', {
        fetchImpl: makeMockVisionFetch({
          safe: true,
          worker_on_roof: false,
          worker_in_mewp_basket_visible: true,
          ground_worker_visible: true,
          workers_spatially_separated: true,
          treatment_application_visible: true,
        }),
        readResponseImpl: readMockImpl,
        expectedWorkerCount: 2,
        matchedService: 'anti-mousse',
      });
      if (safety.safe !== true) return { ok: false, detail: `safe=${safety.safe} reason=${safety.reason}` };
      return { ok: true };
    },
  },

  // ANTIMOSS-V2: ground_worker_visible=false → worker_count_mismatch
  {
    id: 'ANTIMOSS-V2',
    label: 'Anti-mousse encours: ground_worker_visible=false → worker_count_mismatch',
    async run() {
      const safety = await checkImageSafety('MOCK_B64', 'nettoyage_toiture', 'mock-key', {
        fetchImpl: makeMockVisionFetch({
          safe: true,
          worker_on_roof: false,
          worker_in_mewp_basket_visible: true,
          ground_worker_visible: false,
          workers_spatially_separated: true,
          treatment_application_visible: true,
        }),
        readResponseImpl: readMockImpl,
        expectedWorkerCount: 2,
        matchedService: 'anti-mousse',
      });
      if (safety.safe !== false) return { ok: false, detail: `safe=${safety.safe} (expected false)` };
      if (safety.reason !== 'worker_count_mismatch') return { ok: false, detail: `reason=${safety.reason} (expected worker_count_mismatch)` };
      return { ok: true };
    },
  },

  // ANTIMOSS-V3: workers_spatially_separated=false → worker_count_mismatch
  {
    id: 'ANTIMOSS-V3',
    label: 'Anti-mousse encours: workers_spatially_separated=false → worker_count_mismatch',
    async run() {
      const safety = await checkImageSafety('MOCK_B64', 'nettoyage_toiture', 'mock-key', {
        fetchImpl: makeMockVisionFetch({
          safe: true,
          worker_on_roof: false,
          worker_in_mewp_basket_visible: true,
          ground_worker_visible: true,
          workers_spatially_separated: false,
          treatment_application_visible: true,
        }),
        readResponseImpl: readMockImpl,
        expectedWorkerCount: 2,
        matchedService: 'anti-mousse',
      });
      if (safety.safe !== false) return { ok: false, detail: `safe=${safety.safe} (expected false)` };
      if (safety.reason !== 'worker_count_mismatch') return { ok: false, detail: `reason=${safety.reason} (expected worker_count_mismatch)` };
      return { ok: true };
    },
  },

  // ANTIMOSS-V4: encours fires ELEVATED ACCESS; debut/final suppress it (complements RTG-RS65/66)
  {
    id: 'ANTIMOSS-V4',
    label: 'Anti-mousse encours fires ELEVATED ACCESS; debut/final suppress it',
    run() {
      const failures = [];
      const base = {
        var_workers: 2, var_presence: 'workers', _matched_key: 'nettoyage_toiture',
        _matched_service: 'Traitement anti-mousse toiture',
        composition: 'medium_intervention', _capture_defects_resolved: [],
      };

      const encours = _appendLockedFinalConstraints('TEST PROMPT', { ...base, state_level: 'encours' });
      if (!encours.includes('NON-NEGOTIABLE ELEVATED ACCESS'))
        failures.push('encours: ELEVATED ACCESS block must be present');

      const debut = _appendLockedFinalConstraints('TEST PROMPT', { ...base, state_level: 'debut' });
      if (debut.includes('NON-NEGOTIABLE ELEVATED ACCESS'))
        failures.push('debut: ELEVATED ACCESS block must NOT be present');

      const final_ = _appendLockedFinalConstraints('TEST PROMPT', { ...base, state_level: 'final' });
      if (final_.includes('NON-NEGOTIABLE ELEVATED ACCESS'))
        failures.push('final: ELEVATED ACCESS block must NOT be present');

      if (failures.length) return { ok: false, detail: failures.join('; ') };
      return { ok: true };
    },
  },

  // ─── GUTTER-POLISH: visual polish constraints ──────────────────────────────

  // shared mock scene for POLISH tests
  // (defined inline per test to avoid shared-state issues)

  // GUTTER-POLISH1: locked prompt contains "just above gutter height"
  {
    id: 'GUTTER-POLISH1',
    label: 'Locked prompt: ladder stops just above gutter height (not up the roof)',
    run() {
      const scene = { var_workers: 1, var_presence: 'workers', _matched_key: 'nettoyage_gouttieres', _matched_service: 'nettoyage gouttieres', state_level: 'encours', composition: 'medium_intervention', _capture_defects_resolved: [] };
      const result = _appendLockedFinalConstraints('TEST PROMPT', scene);
      if (!result.toLowerCase().includes('just above gutter height'))
        return { ok: false, detail: '"just above gutter height" not found in locked prompt' };
      return { ok: true };
    },
  },

  // GUTTER-POLISH2: locked prompt forbids ladder extending up the roof slope
  {
    id: 'GUTTER-POLISH2',
    label: 'Locked prompt: ladder cannot extend up the roof slope',
    run() {
      const scene = { var_workers: 1, var_presence: 'workers', _matched_key: 'nettoyage_gouttieres', _matched_service: 'nettoyage gouttieres', state_level: 'encours', composition: 'medium_intervention', _capture_defects_resolved: [] };
      const result = _appendLockedFinalConstraints('TEST PROMPT', scene);
      const lower = result.toLowerCase();
      if (!lower.includes('roof slope'))
        return { ok: false, detail: '"roof slope" constraint not found in locked prompt' };
      if (!lower.includes('ladder extending') && !lower.includes('extends up the roof'))
        return { ok: false, detail: 'ladder-up-roof-slope prohibition not found in locked prompt' };
      return { ok: true };
    },
  },

  // GUTTER-POLISH3: locked prompt forbids roof ladder and ridge hook
  {
    id: 'GUTTER-POLISH3',
    label: 'Locked prompt: roof ladder and ridge hook are forbidden',
    run() {
      const scene = { var_workers: 1, var_presence: 'workers', _matched_key: 'nettoyage_gouttieres', _matched_service: 'nettoyage gouttieres', state_level: 'encours', composition: 'medium_intervention', _capture_defects_resolved: [] };
      const result = _appendLockedFinalConstraints('TEST PROMPT', scene);
      const lower = result.toLowerCase();
      const failures = [];
      if (!lower.includes('roof ladder')) failures.push('"roof ladder" prohibition missing');
      if (!lower.includes('ridge hook'))  failures.push('"ridge hook" prohibition missing');
      if (failures.length) return { ok: false, detail: failures.join('; ') };
      return { ok: true };
    },
  },

  // GUTTER-POLISH4: locked prompt forbids rope or lifeline crossing roof
  {
    id: 'GUTTER-POLISH4',
    label: 'Locked prompt: rope or lifeline across roof is forbidden',
    run() {
      const scene = { var_workers: 1, var_presence: 'workers', _matched_key: 'nettoyage_gouttieres', _matched_service: 'nettoyage gouttieres', state_level: 'encours', composition: 'medium_intervention', _capture_defects_resolved: [] };
      const result = _appendLockedFinalConstraints('TEST PROMPT', scene);
      const lower = result.toLowerCase();
      const failures = [];
      if (!lower.includes('rope'))     failures.push('"rope" prohibition missing');
      if (!lower.includes('lifeline')) failures.push('"lifeline" prohibition missing');
      if (failures.length) return { ok: false, detail: failures.join('; ') };
      return { ok: true };
    },
  },

  // GUTTER-POLISH5: locked prompt keeps worker at gutter level
  {
    id: 'GUTTER-POLISH5',
    label: 'Locked prompt: worker remains at gutter level and does not access roof',
    run() {
      const scene = { var_workers: 1, var_presence: 'workers', _matched_key: 'nettoyage_gouttieres', _matched_service: 'nettoyage gouttieres', state_level: 'encours', composition: 'medium_intervention', _capture_defects_resolved: [] };
      const result = _appendLockedFinalConstraints('TEST PROMPT', scene);
      const lower = result.toLowerCase();
      if (!lower.includes('gutter level'))
        return { ok: false, detail: '"gutter level" constraint not found in locked prompt' };
      return { ok: true };
    },
  },

  // GUTTER-POLISH6: locked prompt requires ladder base and ground visible
  {
    id: 'GUTTER-POLISH6',
    label: 'Locked prompt: complete ladder base and stable ground must remain visible',
    run() {
      const scene = { var_workers: 1, var_presence: 'workers', _matched_key: 'nettoyage_gouttieres', _matched_service: 'nettoyage gouttieres', state_level: 'encours', composition: 'medium_intervention', _capture_defects_resolved: [] };
      const result = _appendLockedFinalConstraints('TEST PROMPT', scene);
      const lower = result.toLowerCase();
      if (!lower.includes('ladder base'))
        return { ok: false, detail: '"ladder base" constraint not found in locked prompt' };
      return { ok: true };
    },
  },

  // GUTTER-POLISH7: finger defect completely disabled for nettoyage_gouttieres
  {
    id: 'GUTTER-POLISH7',
    label: '_selectCaptureDefects never returns finger_edge for nettoyage_gouttieres',
    run() {
      for (let i = 0; i < 30; i++) {
        const defects = _selectCaptureDefects(i, 30, 42, 'nettoyage_gouttieres', 'nettoyage gouttieres');
        if (defects.some(d => d.key === 'finger_edge'))
          return { ok: false, detail: `finger_edge returned at batchIndex=${i}` };
      }
      return { ok: true };
    },
  },

  // GUTTER-POLISH8: existing valid access variants still accepted (no regression)
  {
    id: 'GUTTER-POLISH8',
    label: 'Extension ladder and A-frame variants still listed in WORKER_SCENE_RULES.access',
    run() {
      const rules = WORKER_SCENE_RULES.nettoyage_gouttieres;
      if (!rules) return { ok: false, detail: 'WORKER_SCENE_RULES.nettoyage_gouttieres not found' };
      const accessStr = (rules.access || []).join(' ').toLowerCase();
      const failures = [];
      if (!accessStr.includes('extension ladder') && !accessStr.includes('extending ladder'))
        failures.push('extension ladder not found in access');
      if (!accessStr.includes('a-frame') && !accessStr.includes('a frame'))
        failures.push('A-frame not found in access');
      // Locked prompt must NOT mandate standoff as required
      const scene = { var_workers: 1, var_presence: 'workers', _matched_key: 'nettoyage_gouttieres', _matched_service: 'nettoyage gouttieres', state_level: 'encours', composition: 'medium_intervention', _capture_defects_resolved: [] };
      const locked = _appendLockedFinalConstraints('TEST PROMPT', scene);
      if (locked.includes('STANDOFF REQUIRED') || locked.includes('standoff mandatory'))
        failures.push('standoff incorrectly mandated in locked prompt');
      if (failures.length) return { ok: false, detail: failures.join('; ') };
      return { ok: true };
    },
  },

];

// ─── runner ──────────────────────────────────────────────────────────────────

export async function _runGutterAntimossTests() {
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

  console.log(`\n--- GUTTER/ANTIMOSS: ${passed}/${tests.length}${failed ? ` — ${failed} FAILED ❌` : ' ✅'} ---`);
  return { passed, failed, total: tests.length, results };
}
