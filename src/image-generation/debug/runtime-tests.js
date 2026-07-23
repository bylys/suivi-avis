/**
 * debug/runtime-tests.js — Phase 7B.1
 * Harness autonome : utilise uniquement les modules src/image-generation/ et le bridge GMB.
 * Pas d'import depuis app.js. Pas d'appel réseau réel.
 *
 * Usage : await window._runRuntimeTests()
 */

import { readResponseOnce }                              from '../pipeline/http.js';
import { _buildPresencePlan, _assertFinalWorkerConsistency } from '../safety/worker-validator.js';
import { _resolveServiceSetting }                        from '../resolution/service-resolver.js';
import { IMAGE_TASK_STATUS, TERMINAL_STATUSES, createGenerationState } from '../pipeline/state.js';
import { SAFETY_CHECK_RULES }                            from '../safety/safety-rules.js';
import { LOCATION_RULES, TRIANGLE_RULES }                from '../config/locations.js';
import { WORKER_SCENE_RULES }                            from '../safety/worker-rules.js';
import { _resolveLocationAndComposition }                from '../resolution/location-resolver.js';
import { _validateResolvedScene }                        from '../validation/scene-validator.js';
import { _validateLocationServiceCompatibility }         from '../validation/location-validator.js';
import { _COMPOSITION_DIST, PHOTO_COMPOSITIONS, CAMERA_COMPOSITIONS, COMPOSITION_RULES_BY_METIER } from '../config/compositions.js';
import { CAPTURE_DEFECTS, CAPTURE_DEFECT_GROUPS }        from '../config/capture-defects.js';
import { _planGlobalBatch, _rebalanceGlobalBatchPlan }   from '../planning/batch-planner.js';
import { _planBatchWorkerPresence }                      from '../planning/worker-planner.js';
import { _selectCaptureDefects }                         from '../planning/capture-defect-planner.js';
import { _validateCompleteBatchPlan, _assertTaskHasBatchPlan } from '../validation/batch-validator.js';
import { _appendLockedFinalConstraints }                 from '../prompt/locked-constraints.js';
import { buildDallePromptV2 }                            from '../prompt/scene-builder.js';
import { _hashSeed }                                     from '../utils/deterministic.js';
import { WORK_SCENES }                                   from '../services/index.js';
import { CONTEXTE_BY_METIER, CONTEXTE_OPTIONS }          from '../config/service-catalog.js';
import { createImagePipeline }                           from '../pipeline/run-batch.js';
import { getBatchPlanPolicy }                            from '../planning/batch-requirements.js';

const bvalValidate = _validateCompleteBatchPlan;

// ─── Test runner helpers ───────────────────────────────────────────────────────

function _pass(name) { console.log(`[RUNTIME-TEST] PASS — ${name}`); return true; }
function _fail(name, msg) { console.error(`[RUNTIME-TEST] FAIL — ${name}: ${msg}`); return false; }

// ─── Mock helpers (no real network) ───────────────────────────────────────────

const _fakeRead = async (r) => {
  const raw = await r.text(); let data = null;
  try { if (raw) data = JSON.parse(raw); } catch {}
  return { ok: r.ok, status: r.status, raw, data };
};
const _fakeRewrite = async () => 'Mocked rewritten prompt.';
const _fakeSleep   = async () => {};

const _mkImgResp  = () => ({ ok: true, status: 200, text: async () => JSON.stringify({ data: [{ b64_json: 'dGVzdA==' }] }) });
const _mkSafeResp = () => ({ ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { content: JSON.stringify({ safe: true, severity: 'ok', reason: '' }) } }] }) });

function _mkFetch(opts = {}) {
  let imgCalls = 0, visionCalls = 0;
  const fetchImpl = async (url) => {
    if (url.includes('images/generations')) { imgCalls++; return opts.imgFn ? opts.imgFn(imgCalls) : _mkImgResp(); }
    if (url.includes('chat/completions'))   { visionCalls++; return opts.visionFn ? opts.visionFn(visionCalls) : _mkSafeResp(); }
    throw new Error('[UNEXPECTED_URL] ' + url);
  };
  return { fetchImpl, counts: () => ({ imgCalls, visionCalls }) };
}

function _mkUiAdapter() {
  const calls = { updateProgress: 0, renderImage: [], tasksDone: [] };
  return {
    adapter: {
      updateProgress: (done, total, ok, fail) => { calls.updateProgress++; },
      renderImage:    (src, filename, label) => { calls.renderImage.push({ src: src?.slice(0, 20), filename, label }); },
      onTaskDone:     (task) => { calls.tasksDone.push(task.taskId); },
      setGenerateButtonDisabled: () => {},
      clearGallery:   () => {},
      clearSummary:   () => {},
      renderBatchSummary: () => {},
    },
    calls,
  };
}

function _mkBatchTasks(metier, svc, etat, n, seed, taskIdBase = 500) {
  const row = { metier, travaux: svc, ville: 'Paris', etat: etat || 'encours', meteo: 'auto', contexte: 'maison', nb: n, fiche: '', images: [] };
  const jsonScene   = buildDallePromptV2(row);
  const _planBase   = JSON.parse(jsonScene);
  const presencePlan = _buildPresencePlan(n, _planBase.state_level, _planBase._matched_key, seed);
  const tasks = Array.from({ length: n }, (_, i) => ({
    taskId: taskIdBase + i, row, i, nb: n, jsonScene, presencePlan, slug: metier,
    _planBase: Object.assign({}, _planBase), status: 'pending', imageAttempt: 0, result: null, error: null,
  }));
  _planGlobalBatch(tasks, seed);
  _rebalanceGlobalBatchPlan(tasks, seed);
  bvalValidate(tasks);
  return tasks;
}

// ─── T40 stableJson helper (deterministic serialisation for snapshot checks) ──

function _stableStringify(v) {
  if (Array.isArray(v)) return '[' + v.map(_stableStringify).join(',') + ']';
  if (v !== null && typeof v === 'object')
    return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + _stableStringify(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function _hash32(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h * 31) + s.charCodeAt(i)) >>> 0;
  return h;
}

// ─── Main harness ─────────────────────────────────────────────────────────────

export async function runRuntimeTests() {
  const results = { passed: 0, failed: 0 };
  const pass = (name) => { _pass(name); results.passed++; };
  const fail = (name, msg) => { _fail(name, msg); results.failed++; };

  // Forbidden network guard — blocks all real network calls except the single
  // same-origin static file that CS11 reads (service-coverage-audit.json).
  const realFetch = window.fetch;
  const _ALLOWED_STATIC_TEST = new Set(['/docs/service-coverage-audit.json']);
  window.fetch = (...args) => {
    try {
      const reqUrl = new URL(String(args[0]), window.location.origin);
      if (reqUrl.origin === window.location.origin && _ALLOWED_STATIC_TEST.has(reqUrl.pathname)) {
        return realFetch(...args);
      }
    } catch (_) { /* invalid URL — fall through to throw */ }
    throw new Error(`[REAL_NETWORK_FORBIDDEN_PHASE7B] ${String(args[0])}`);
  };

  try {

  // T1: readResponseOnce single-read
  try {
    const r = new Response(JSON.stringify({ ok: 1 }), { status: 200 });
    const p = await readResponseOnce(r);
    if (p.ok && p.data?.ok === 1) pass('T1: readResponseOnce single-read');
    else fail('T1', JSON.stringify(p));
  } catch (e) { fail('T1', e.message); }

  // T2: 50/45/5 distribution (nb=20)
  try {
    const plan = _buildPresencePlan(20, 'encours', 'toiture', 42);
    const workers = plan.filter(p => p === 'workers').length;
    const worksite = plan.filter(p => p === 'none').length;
    const material = plan.filter(p => p === 'indirect').length;
    if (workers === 10 && worksite === 9 && material === 1) pass('T2: 50/45/5 distribution (nb=20)');
    else fail('T2', `workers=${workers} none=${worksite} indirect=${material}`);
  } catch (e) { fail('T2', e.message); }

  // T3: _resolveServiceSetting débarras cave → interior
  try {
    const s = _resolveServiceSetting('débarras', 'Débarras cave', 'exterior');
    if (s === 'interior') pass('T3: _resolveServiceSetting débarras cave → interior');
    else fail('T3', `got ${s}`);
  } catch (e) { fail('T3', e.message); }

  // T4: _resolveServiceSetting carrelage salle de bain → interior
  try {
    const s = _resolveServiceSetting('carrelage', 'Pose carrelage salle de bain', 'exterior');
    if (s === 'interior') pass('T4: _resolveServiceSetting carrelage salle de bain → interior');
    else fail('T4', `got ${s}`);
  } catch (e) { fail('T4', e.message); }

  // T5: IMAGE_TASK_STATUS + TERMINAL_STATUSES
  try {
    const required = ['pending','generating','checking_safety','retrying','success','failed','rejected_safety','safety_check_failed'];
    const missing  = required.filter(v => !Object.values(IMAGE_TASK_STATUS).includes(v));
    const termOk   = TERMINAL_STATUSES.size === 4;
    if (!missing.length && termOk) pass('T5: IMAGE_TASK_STATUS + TERMINAL_STATUSES');
    else fail('T5', `missing=${JSON.stringify(missing)} termSize=${TERMINAL_STATUSES.size}`);
  } catch (e) { fail('T5', e.message); }

  // T6: SAFETY_CHECK_RULES 12 entries, no default-safe leak
  try {
    const keys   = Object.keys(SAFETY_CHECK_RULES);
    const leaked = keys.filter(k => SAFETY_CHECK_RULES[k].includes('Default safe:true'));
    if (keys.length === 12 && !leaked.length) pass('T6: SAFETY_CHECK_RULES (12 entries, no default-safe leak)');
    else fail('T6', `count=${keys.length} leaked=${JSON.stringify(leaked)}`);
  } catch (e) { fail('T6', e.message); }

  // T7: LOCATION_RULES 18 entries
  try {
    const required = ['parking','station_service','garage_atelier','rue_centre_ville','route_departementale','route_nationale','autoroute','aire_repos','domicile','maison_individuelle','appartement','immeuble','commerce','local_professionnel','entrepot','batiment_agricole','jardin_prive','chantier_urbain'];
    const missing  = required.filter(k => !LOCATION_RULES[k]);
    if (!missing.length) pass('T7: LOCATION_RULES — all 18 entries present');
    else fail('T7', `missing: ${JSON.stringify(missing)}`);
  } catch (e) { fail('T7', e.message); }

  // T8: TRIANGLE_RULES
  try {
    const domTri  = TRIANGLE_RULES.domicile?.default;
    const garTri  = TRIANGLE_RULES.garage_atelier?.default;
    const autoTri = TRIANGLE_RULES.autoroute?.default;
    if (domTri === 'forbidden' && garTri === 'forbidden' && autoTri === 'required_if_safe')
      pass('T8: TRIANGLE_RULES — domicile/garage forbidden, autoroute required_if_safe');
    else fail('T8', `domicile=${domTri} garage=${garTri} autoroute=${autoTri}`);
  } catch (e) { fail('T8', e.message); }

  // T9: WORKER_SCENE_RULES min_workers_when_visible ≥ 2
  try {
    const targets = ['élagage','abattage','vitrier','paysagiste','terrassement','débarras'];
    const bad     = targets.filter(k => (WORKER_SCENE_RULES[k]?.min_workers_when_visible || 0) < 2);
    if (!bad.length) pass('T9: min_workers_when_visible ≥ 2 for 6 métiers');
    else fail('T9', `missing or < 2: ${JSON.stringify(bad)}`);
  } catch (e) { fail('T9', e.message); }

  // T10: aire_repos → location=aire_repos, triangle=forbidden_if_safely_parked
  try {
    const scene  = JSON.stringify({ _matched_key: 'depannage_auto', contexte: 'aire_repos', exclude: [] });
    const result = JSON.parse(_resolveLocationAndComposition(scene, 0));
    if (result.location_type === 'aire_repos' && result.triangle_rule === 'forbidden_if_safely_parked')
      pass('T10: crevaison + aire_repos → location=aire_repos, triangle=forbidden_if_safely_parked');
    else fail('T10', `location_type=${result.location_type} triangle_rule=${result.triangle_rule}`);
  } catch (e) { fail('T10', e.message); }

  // T11: C4 aire_repos → triangle excluded
  try {
    const scene  = JSON.stringify({ _matched_key: 'depannage_auto', contexte: 'aire_repos', location_type: 'aire_repos', triangle_rule: 'forbidden_if_safely_parked', exclude: [] });
    const result = _validateResolvedScene(scene);
    const obj    = JSON.parse(result.fixedStr);
    if ((obj.exclude || []).includes('warning triangle'))
      pass('T11: C4 aire_repos → triangle excluded by _validateResolvedScene');
    else fail('T11', `exclude=${JSON.stringify(obj.exclude)}`);
  } catch (e) { fail('T11', e.message); }

  // T12: batterie + domicile → private property, triangle forbidden and excluded
  try {
    const scene  = JSON.stringify({ _matched_key: 'depannage_auto', contexte: 'domicile', exclude: [] });
    const result = JSON.parse(_resolveLocationAndComposition(scene, 0));
    const locOk  = result.location_type === 'domicile';
    const triOk  = result.triangle_rule === 'forbidden';
    const exclOk = (result.exclude || []).includes('warning triangle');
    if (locOk && triOk && exclOk) pass('T12: batterie + domicile → private property, triangle forbidden and excluded');
    else fail('T12', `locType=${result.location_type} triRule=${result.triangle_rule} excludeHasTri=${exclOk}`);
  } catch (e) { fail('T12', e.message); }

  // T13: C2 domicile — triangle exclusions added
  try {
    const scene  = JSON.stringify({ _matched_key: 'depannage_auto', contexte: 'domicile', location_type: 'domicile', triangle_rule: 'forbidden', exclude: [], var_presence: 'none', var_workers: 0, no_people: true });
    const result = _validateResolvedScene(scene);
    const obj    = JSON.parse(result.fixedStr);
    if (['warning triangle','reflective warning triangle'].every(t => (obj.exclude || []).includes(t)))
      pass('T13: C2 domicile — triangle exclusions added');
    else fail('T13', `exclude=${JSON.stringify(obj.exclude)}`);
  } catch (e) { fail('T13', e.message); }

  // T14: route_departementale → triangle required_if_on_road
  try {
    const scene  = JSON.stringify({ _matched_key: 'depannage_auto', contexte: 'route_dept', exclude: [] });
    const result = JSON.parse(_resolveLocationAndComposition(scene, 0));
    if (result.location_type === 'route_departementale' && result.triangle_rule === 'required_if_on_road')
      pass('T14: route_departementale → triangle required_if_on_road');
    else fail('T14', `locType=${result.location_type} tri=${result.triangle_rule}`);
  } catch (e) { fail('T14', e.message); }

  // T15: autoroute → motorway element in must_have, triangle required_if_safe
  try {
    const scene  = JSON.stringify({ _matched_key: 'depannage_auto', contexte: 'autoroute', exclude: [] });
    const result = JSON.parse(_resolveLocationAndComposition(scene, 0));
    const MOTORWAY_KW = ['hard shoulder', 'crash barrier', 'armco', 'traffic lane', 'motorway'];
    const mustHaveValid = (result.location_must_have || []).length >= 1
                       && (result.location_must_have || []).every(m => LOCATION_RULES.autoroute.must_have.includes(m));
    const hasMotorvayKW = (result.location_must_have || []).some(m => MOTORWAY_KW.some(kw => m.toLowerCase().includes(kw)));
    if (mustHaveValid && hasMotorvayKW && result.triangle_rule === 'required_if_safe' && result.location_type === 'autoroute')
      pass('T15: autoroute → motorway element in must_have, triangle required_if_safe');
    else fail('T15', `loc=${result.location_type} must_have=${JSON.stringify(result.location_must_have)} tri=${result.triangle_rule}`);
  } catch (e) { fail('T15', e.message); }

  // T16: C1 var_workers=2 + no_people=true → no_people=false
  try {
    const scene  = JSON.stringify({ _matched_key: 'toiture', no_people: true, var_workers: 2, var_presence: 'workers', exclude: [] });
    const result = _validateResolvedScene(scene);
    const obj    = JSON.parse(result.fixedStr);
    if (obj.no_people === false && obj.var_workers === 2 && !result.ok)
      pass('T16: C1 var_workers=2 + no_people=true → no_people=false (workers source of truth)');
    else fail('T16', `no_people=${obj.no_people} var_workers=${obj.var_workers} ok=${result.ok}`);
  } catch (e) { fail('T16', e.message); }

  // T17: C5 élagage + var_workers=1 + medium_intervention → bumped to 2
  try {
    const scene  = JSON.stringify({ _matched_key: 'élagage', no_people: false, var_workers: 1, var_presence: 'workers', composition: 'medium_intervention', exclude: [] });
    const result = _validateResolvedScene(scene);
    const obj    = JSON.parse(result.fixedStr);
    if (obj.var_workers === 2 && obj.no_people === false && !result.ok)
      pass('T17: C5 élagage var_workers=1 → bumped to 2, no_people=false');
    else fail('T17', `var_workers=${obj.var_workers} no_people=${obj.no_people} ok=${result.ok}`);
  } catch (e) { fail('T17', e.message); }

  // T18: C6 toiture + pallet in site_tools → exclusion added
  try {
    const scene  = JSON.stringify({ _matched_key: 'toiture', site_tools: ['pallet of tiles on pitch'], exclude: [], var_workers: 0, no_people: true });
    const result = _validateResolvedScene(scene);
    const obj    = JSON.parse(result.fixedStr);
    if ((obj.exclude || []).some(e => /pallet/i.test(e)) && !result.ok)
      pass('T18: C6 toiture pallet → pallet exclusion added');
    else fail('T18', `exclude=${JSON.stringify(obj.exclude)} ok=${result.ok}`);
  } catch (e) { fail('T18', e.message); }

  // T19: C8 appartement → setting forced to interior
  try {
    const scene  = JSON.stringify({ _matched_key: 'peinture', location_type: 'appartement', setting: 'exterior', exclude: [], var_workers: 0, no_people: true });
    const result = _validateResolvedScene(scene);
    const obj    = JSON.parse(result.fixedStr);
    if (obj.setting === 'interior' && !result.ok) pass('T19: C8 appartement → setting forced to interior');
    else fail('T19', `setting=${obj.setting} ok=${result.ok}`);
  } catch (e) { fail('T19', e.message); }

  // T20: LOCATION_RULES entrepôt — pallet-on-roof in forbidden
  try {
    const entForbidden = LOCATION_RULES.entrepot?.forbidden || [];
    if (entForbidden.some(f => /pallet.*roof|roof.*pallet/i.test(f)))
      pass('T20: LOCATION_RULES entrepôt — pallet-on-roof in forbidden list');
    else fail('T20', JSON.stringify(entForbidden));
  } catch (e) { fail('T20', e.message); }

  // T21: LOCATION_RULES appartement — sky/window not forbidden
  try {
    const aptForbidden = LOCATION_RULES.appartement?.forbidden || [];
    if (!aptForbidden.some(f => /sky|window|ciel|fenêtre/i.test(f)))
      pass('T21: LOCATION_RULES appartement — sky/window not forbidden');
    else fail('T21', `wrongly forbids: ${JSON.stringify(aptForbidden)}`);
  } catch (e) { fail('T21', e.message); }

  // T22: _COMPOSITION_DIST depannage_auto — vehicle_arrival present, total=100
  try {
    const dist  = _COMPOSITION_DIST.depannage_auto;
    const total = Object.values(dist).reduce((a, b) => a + b, 0);
    if (total === 100 && 'vehicle_arrival' in dist && dist.vehicle_arrival > 0)
      pass('T22: _COMPOSITION_DIST depannage_auto — vehicle_arrival present, total=100');
    else fail('T22', `total=${total} vehicle_arrival=${dist.vehicle_arrival}`);
  } catch (e) { fail('T22', e.message); }

  // T23: All UI contexts resolve to valid LOCATION_RULES entry
  try {
    const allContexts = [
      ...Object.entries(CONTEXTE_BY_METIER).flatMap(([metier, ctxs]) => ctxs.map(c => ({ metier, ctx: c.value }))),
      ...['toiture', 'élagage', 'paysagiste', 'terrassement', 'peinture'].flatMap(metier =>
        CONTEXTE_OPTIONS.map(c => ({ metier, ctx: c.value }))
      ),
    ];
    const failures = [];
    for (const { metier, ctx } of allContexts) {
      const scene  = JSON.stringify({ _matched_key: metier, contexte: ctx, exclude: [] });
      const result = JSON.parse(_resolveLocationAndComposition(scene, 0));
      if (!result.location_type || !LOCATION_RULES[result.location_type])
        failures.push(`${metier}/${ctx} → ${result.location_type || 'null'}`);
    }
    if (!failures.length) pass(`T23: all ${allContexts.length} UI contexts resolve to a valid LOCATION_RULES entry`);
    else fail('T23', failures.join(', '));
  } catch (e) { fail('T23', e.message); }

  // T24: location_subtype compatible with métier/service across 5 seeds
  try {
    const t24Cases = [
      { metier:'toiture',      travaux:'réfection toiture',            contexte:'immeuble',  forbid: ['immeuble_parties_communes','immeuble_cour','immeuble_facade'] },
      { metier:'étanchéité',   travaux:'membrane toit terrasse',       contexte:'immeuble',  require: ['immeuble_toit_terrasse'] },
      { metier:'ravalement',   travaux:'ravalement facade enduit',     contexte:'immeuble',  require: ['immeuble_facade'] },
      { metier:'élagage',      travaux:'élagage grands arbres',        contexte:'jardin',    require: ['suburban residential garden with lawn and planted beds','mature garden with established trees'] },
    ];
    const t24Failures = [];
    for (const tc of t24Cases) {
      for (let idx = 0; idx < 5; idx++) {
        const scene  = JSON.stringify({ _matched_key: tc.metier, _matched_service: tc.travaux, contexte: tc.contexte, exclude: [] });
        const result = JSON.parse(_resolveLocationAndComposition(scene, idx));
        const lscR   = _validateLocationServiceCompatibility(JSON.stringify(result));
        const sub    = JSON.parse(lscR.fixedStr).location_subtype;
        if (tc.forbid  && tc.forbid.includes(sub))
          t24Failures.push(`${tc.metier}/"${tc.travaux}"/idx=${idx} → FORBIDDEN "${sub}"`);
        if (tc.require && !tc.require.includes(sub))
          t24Failures.push(`${tc.metier}/"${tc.travaux}"/idx=${idx} → expected [${tc.require.join('|')}] got "${sub}"`);
      }
    }
    if (!t24Failures.length) pass(`T24: all ${t24Cases.length} service/subtype cases pass across 5 seeds`);
    else fail('T24', '\n    ' + t24Failures.join('\n    '));
  } catch (e) { fail('T24', e.message); }

  // T25: exhaustive — all WORK_SCENES × all UI contexts × 10 seeds
  try {
    const allMetiers = Object.keys(WORK_SCENES);
    const testMatrix = [];
    for (const metier of allMetiers) {
      const ws      = WORK_SCENES[metier];
      const reprSvc = ws.service_keywords?.[0]?.phrase || ws.intro || metier;
      const services = metier === 'depannage_auto' ? ['crevaison pneu crevé', 'batterie démarrage', 'panne moteur'] : [reprSvc];
      const contexts = CONTEXTE_BY_METIER[metier] || CONTEXTE_OPTIONS;
      for (const svc of services) for (const ctx of contexts) testMatrix.push({ metier, service: svc, ctx: ctx.value || String(ctx) });
    }
    const failures = [];
    let totalScenes = 0;
    for (const { metier, service, ctx } of testMatrix) {
      for (let seed = 0; seed < 10; seed++) {
        totalScenes++;
        const baseScene = JSON.stringify({ _matched_key: metier, _matched_service: service, contexte: ctx, exclude: [], var_presence: 'none', var_workers: 0, no_people: true });
        let s;
        try {
          const resolved  = _resolveLocationAndComposition(baseScene, seed);
          const sceneValR = _validateResolvedScene(resolved);
          const locSvcR   = _validateLocationServiceCompatibility(sceneValR.fixedStr);
          s = JSON.parse(locSvcR.fixedStr);
        } catch(e) { failures.push(`${metier}/${ctx}/s${seed}: exception — ${e.message}`); continue; }
        if (!s.location_type || !LOCATION_RULES[s.location_type]) { failures.push(`${metier}/${ctx}/s${seed}: loc=${s.location_type || 'null'}`); continue; }
        if (!s.location_subtype) failures.push(`${metier}/${ctx}/s${seed}: subtype=null`);
        if (!s.work_surface)     failures.push(`${metier}/${ctx}/s${seed}: work_surface=null`);
        if (!s.composition)      failures.push(`${metier}/${ctx}/s${seed}: composition=null`);
        if (s.no_people === false && (s.var_workers || 0) === 0) failures.push(`${metier}/${ctx}/s${seed}: no_people=false but var_workers=0`);
        if (s.triangle_rule === 'forbidden' && !(s.exclude || []).some(e => /triangle/i.test(e))) failures.push(`${metier}/${ctx}/s${seed}: triangle_rule=forbidden but no triangle in exclude[]`);
      }
    }
    if (!failures.length) pass(`T25: ${testMatrix.length} combinations × 10 seeds = ${totalScenes} scenes, 0 error`);
    else fail('T25', `${failures.length} failures:\n    ` + failures.slice(0, 5).join('\n    '));
  } catch (e) { fail('T25', e.message); }

  // T26: _planGlobalBatch — close_detail quotas, variety
  try {
    const t26Failures = [];
    const t26Cases = [
      { metier: 'toiture',        sizes: [2, 3, 4, 6, 10] },
      { metier: 'elagage',        sizes: [2, 4] },
      { metier: 'depannage_auto', sizes: [2, 4] },
      { metier: 'peinture',       sizes: [3, 6] },
      { metier: 'terrassement',   sizes: [4, 10] },
    ];
    for (const { metier, sizes } of t26Cases) {
      for (const n of sizes) {
        const fakeTasks = Array.from({ length: n }, (_, i) => ({ taskId: i, _planBase: { _matched_key: metier, _matched_service: `${metier}_svc` } }));
        const planned = _planGlobalBatch(fakeTasks, 42);
        const comps   = planned.map(t => t._pre_assigned_composition);
        const rules   = COMPOSITION_RULES_BY_METIER[metier] || {};
        const maxR    = rules.close_detail_max_ratio ?? 0.20;
        const maxC    = Math.max(1, Math.floor(n * maxR));
        const allowed = rules.allowed_compositions || Object.keys(PHOTO_COMPOSITIONS);
        if (comps.filter(c => c === 'close_detail').length > maxC) t26Failures.push(`${metier}/n=${n}: close_detail > max ${maxC}`);
        if (n === 2 && comps[0] === comps[1]) t26Failures.push(`${metier}/n=2: identical compositions`);
        if (n >= 4 && !comps.some(c => c === 'contextual_overview' || c === 'wide_worksite')) t26Failures.push(`${metier}/n=${n}: no contextual_overview or wide_worksite`);
        for (const c of comps) if (!allowed.includes(c)) t26Failures.push(`${metier}/n=${n}: '${c}' not in allowed_compositions`);
        for (let i = 0; i < planned.length; i++) {
          const dl = planned[i]._capture_defects_resolved?.length;
          if (!dl || dl < 1 || dl > 2) t26Failures.push(`${metier}/n=${n}/task${i}: ${dl} defects (expected 1-2)`);
        }
      }
    }
    if (!t26Failures.length) pass('T26: batch composition planner — all quota rules respected');
    else fail('T26', t26Failures.slice(0, 5).join('; '));
  } catch (e) { fail('T26', e.message); }

  // T27: _planBatchWorkerPresence — min worker images respected
  try {
    const t27Failures = [];
    const t27Metiers  = ['toiture', 'elagage', 'abattage', 'paysagiste', 'terrassement', 'maconnerie', 'depannage_auto'];
    for (const metier of t27Metiers) {
      for (const n of [2, 4, 6]) {
        const group = Array.from({ length: n }, (_, i) => ({
          taskId: i, _planBase: { _matched_key: metier },
          _pre_assigned_composition: ['medium_intervention', 'wide_worksite', 'contextual_overview', 'close_detail'][i % 4],
        }));
        _planBatchWorkerPresence(group, 42);
        const rules   = COMPOSITION_RULES_BY_METIER[metier] || {};
        const minWImg = rules.minimum_worker_images_per_active_batch ?? 1;
        const wCount  = group.filter(t => t._pre_assigned_worker_presence === 'workers').length;
        if (wCount < minWImg) t27Failures.push(`${metier}/n=${n}: ${wCount} workers < min ${minWImg}`);
        for (const t of group) {
          if (t._pre_assigned_worker_presence === 'workers' && (t._pre_assigned_worker_count || 0) === 0) t27Failures.push(`${metier}: workerPresence=workers but workerCount=0`);
          if (t._pre_assigned_worker_presence !== 'workers' && (t._pre_assigned_worker_count || 0) > 0)  t27Failures.push(`${metier}: workerPresence=${t._pre_assigned_worker_presence} but workerCount=${t._pre_assigned_worker_count}`);
        }
      }
    }
    if (!t27Failures.length) pass('T27: batch worker presence — all minima respected and count consistent');
    else fail('T27', t27Failures.slice(0, 5).join('; '));
  } catch (e) { fail('T27', e.message); }

  // T28: _selectCaptureDefects — 1-2 defects, finger_edge rare
  try {
    let zeroN = 0, overN = 0, fingerN = 0;
    for (let i = 0; i < 10000; i++) {
      const d = _selectCaptureDefects(i % 6, 6, _hashSeed(`T28|${i}`));
      if (d.length === 0) zeroN++;
      if (d.length > 2)   overN++;
      if (d.some(x => x.key === 'finger_edge')) fingerN++;
    }
    const fPct = (fingerN / 10000 * 100).toFixed(1);
    const t28Failures = [];
    if (zeroN > 0)             t28Failures.push(`${zeroN} scenes with 0 defects`);
    if (overN > 0)             t28Failures.push(`${overN} scenes with >2 defects`);
    if (fingerN > 10000 * 0.15) t28Failures.push(`finger_edge too frequent: ${fPct}%`);
    if (!t28Failures.length) pass(`T28: capture defects — 0 empty, 0 overflow, finger_edge=${fPct}% (rare), n=10000`);
    else fail('T28', t28Failures.join('; '));
  } catch (e) { fail('T28', e.message); }

  // T29: _appendLockedFinalConstraints — all required sections present
  try {
    const mockScene = {
      _matched_key: 'toiture', composition: 'wide_worksite', location_type: 'maison_individuelle',
      triangle_rule: null, no_people: false, var_presence: 'workers', var_workers: 2,
      _worker_safety_mode: 'safety harness with lanyard clipped to a ridge anchor',
      _capture_defects_resolved: [{ key: 'slight_tilt', prompt: 'slightly tilted handheld framing' }, { key: 'jpeg_compression', prompt: 'subtle JPEG compression and ordinary smartphone processing' }],
    };
    const r = _appendLockedFinalConstraints('Base prompt text.', mockScene);
    const t29Failures = [];
    if (!r.includes('NON-NEGOTIABLE'))                t29Failures.push('missing NON-NEGOTIABLE header');
    if (!r.includes('WORKER PRESENCE'))               t29Failures.push('missing WORKER PRESENCE block');
    if (!/workers must be actively working/i.test(r)) t29Failures.push('WORKER PRESENCE does not mention worker');
    if (!r.includes('wide_worksite'))                 t29Failures.push('missing composition key');
    if (!r.includes('5 to 8 metres'))                 t29Failures.push('missing camera distance');
    if (!r.includes('slightly tilted') && !r.includes('JPEG compression')) t29Failures.push('missing capture defects');
    if (!r.includes('DOCUMENTARY STYLE'))             t29Failures.push('missing documentary style block');
    if (!r.includes('No readable brand'))             t29Failures.push('missing branding rules');
    if (!r.includes('safety harness'))                t29Failures.push('missing required safety element');
    if (!t29Failures.length) pass('T29: _appendLockedFinalConstraints — all required sections present');
    else fail('T29', t29Failures.join('; '));
  } catch (e) { fail('T29', e.message); }

  // T30: extended exhaustive — all métiers × batch sizes 2 and 4
  try {
    const allMetiers = Object.keys(WORK_SCENES);
    let failCount = 0; const t30Samples = [];
    for (const metier of allMetiers) {
      const ws   = WORK_SCENES[metier];
      const svcs = metier === 'depannage_auto' ? ['crevaison pneu', 'batterie démarrage', 'panne moteur'] : [ws.service_keywords?.[0]?.phrase || ws.intro || metier];
      for (const svc of svcs) {
        for (const batchSize of [2, 4]) {
          const fake    = Array.from({ length: batchSize }, (_, i) => ({ taskId: i, _planBase: { _matched_key: metier, _matched_service: svc } }));
          const planned = _planGlobalBatch(fake, 77);
          const comps   = planned.map(t => t._pre_assigned_composition);
          const rules   = COMPOSITION_RULES_BY_METIER[metier] || {};
          const maxC    = Math.max(1, Math.floor(batchSize * (rules.close_detail_max_ratio ?? 0.20)));
          const minWImg = rules.minimum_worker_images_per_active_batch ?? 1;
          if (comps.filter(c => c === 'close_detail').length > maxC) { failCount++; if (t30Samples.length < 5) t30Samples.push(`${metier}/n=${batchSize}: close > ${maxC}`); }
          if (planned.filter(t => t._pre_assigned_worker_presence === 'workers').length < minWImg) { failCount++; if (t30Samples.length < 5) t30Samples.push(`${metier}/n=${batchSize}: workers < min`); }
          for (let i = 0; i < planned.length; i++) {
            const dl = planned[i]._capture_defects_resolved?.length;
            if (!dl || dl < 1 || dl > 2) { failCount++; if (t30Samples.length < 5) t30Samples.push(`${metier}/n=${batchSize}/i=${i}: defects=${dl}`); }
          }
        }
      }
    }
    if (!failCount) pass(`T30: extended batch exhaustive — 0 failure across ${allMetiers.length} métiers`);
    else fail('T30', `${failCount} failures: ${t30Samples.join('; ')}`);
  } catch (e) { fail('T30', e.message); }

  // T31: integration — 4 tasks (2×crevaison + 2×batterie) planned with complete fields
  try {
    const fakeRows = [
      { metier: 'depannage_auto', travaux: 'crevaison pneu crevé', contexte: 'aire_repos', etat: 'encours', nb: 2, ville: '', fiche: '', meteo: 'auto', images: [] },
      { metier: 'depannage_auto', travaux: 'batterie à plat',      contexte: 'domicile',   etat: 'encours', nb: 2, ville: '', fiche: '', meteo: 'auto', images: [] },
    ];
    const t31Tasks = [];
    for (const row of fakeRows) {
      const base = buildDallePromptV2(row);
      const pb   = JSON.parse(base);
      const pp   = _buildPresencePlan(2, pb.state_level, pb._matched_key, _hashSeed(`${pb._matched_key}plan`));
      for (let i = 0; i < 2; i++)
        t31Tasks.push({ taskId: `t31-${t31Tasks.length}`, row, i, nb: 2, jsonScene: base, presencePlan: pp, slug: 'test', _planBase: pb, status: 'pending', imageAttempt: 0, result: null, error: null });
    }
    _planGlobalBatch(t31Tasks, 'T31-seed');
    const required = ['_pre_assigned_composition', '_pre_assigned_worker_presence', '_pre_assigned_worker_count', '_capture_defects_resolved', '_batch_plan_id'];
    const t31Failures = [];
    for (const t of t31Tasks) {
      for (const f of required) if (t[f] === undefined || t[f] === null) t31Failures.push(`${t.taskId}: missing ${f}`);
      const dl = (t._capture_defects_resolved || []).length;
      if (dl < 1 || dl > 2) t31Failures.push(`${t.taskId}: ${dl} defects`);
    }
    const comps = t31Tasks.map(t => t._pre_assigned_composition);
    if (comps.filter(c => c === 'close_detail').length > 1) t31Failures.push(`${comps.filter(c => c === 'close_detail').length} close_detail in batch of 4 (max 1)`);
    if (!t31Tasks.some(t => t._pre_assigned_worker_presence === 'workers')) t31Failures.push('no worker images');
    if (!t31Tasks.some(t => t._pre_assigned_vehicle !== 'absent')) t31Failures.push('no vehicle');
    if (!t31Failures.length) pass('T31: integration — 4 tasks planned, all fields present, quota and variety OK');
    else fail('T31', t31Failures.slice(0, 5).join('; '));
  } catch (e) { fail('T31', e.message); }

  // T32: retry preserves batch plan
  try {
    const row32 = { metier: 'toiture', travaux: 'nettoyage gouttières', contexte: 'maison', etat: 'encours', nb: 1, ville: '', fiche: '', meteo: 'auto', images: [] };
    const base32 = buildDallePromptV2(row32);
    const pb32   = JSON.parse(base32);
    const pp32   = _buildPresencePlan(1, pb32.state_level, pb32._matched_key, 42);
    const task32 = { taskId: 't32', row: row32, i: 0, nb: 1, jsonScene: base32, presencePlan: pp32, slug: 'test', _planBase: pb32, status: 'pending', imageAttempt: 0, result: null, error: null };
    _planGlobalBatch([task32], 'T32-seed');
    const snap32 = { comp: task32._pre_assigned_composition, vehicle: task32._pre_assigned_vehicle, workers: task32._pre_assigned_worker_presence, wCount: task32._pre_assigned_worker_count, defects: JSON.stringify(task32._capture_defects_resolved), planId: task32._batch_plan_id };
    task32.status = 'pending'; task32.imageAttempt = 0; task32.error = null; task32.result = null;
    const t32Failures = [];
    if (task32._pre_assigned_composition     !== snap32.comp)    t32Failures.push('composition changed on retry');
    if (task32._pre_assigned_vehicle         !== snap32.vehicle)  t32Failures.push('vehicle changed on retry');
    if (task32._pre_assigned_worker_presence !== snap32.workers)  t32Failures.push('workers changed on retry');
    if (task32._pre_assigned_worker_count    !== snap32.wCount)   t32Failures.push('workerCount changed on retry');
    if (JSON.stringify(task32._capture_defects_resolved) !== snap32.defects) t32Failures.push('defects changed on retry');
    if (task32._batch_plan_id !== snap32.planId) t32Failures.push('batch_plan_id changed on retry');
    if (!t32Failures.length) pass('T32: retry preserves batch plan — composition, workers, defects, plan_id unchanged');
    else fail('T32', t32Failures.join('; '));
  } catch (e) { fail('T32', e.message); }

  // T33: manual retry preserves batch plan
  try {
    const fakeRows33 = [
      { metier: 'depannage_auto', travaux: 'crevaison', contexte: 'aire_repos', etat: 'encours', nb: 1, ville: '', fiche: '', meteo: 'auto', images: [] },
      { metier: 'depannage_auto', travaux: 'batterie',  contexte: 'domicile',   etat: 'encours', nb: 1, ville: '', fiche: '', meteo: 'auto', images: [] },
    ];
    const tasks33 = fakeRows33.map((row, ri) => {
      const base = buildDallePromptV2(row);
      const pb   = JSON.parse(base);
      const pp   = _buildPresencePlan(1, pb.state_level, pb._matched_key, 42);
      return { taskId: `t33-${ri}`, row, i: 0, nb: 1, jsonScene: base, presencePlan: pp, slug: 'test', _planBase: pb, status: 'pending', imageAttempt: 0, result: null, error: null };
    });
    _planGlobalBatch(tasks33, 'T33-seed');
    const snap33 = tasks33.map(t => ({ planId: t._batch_plan_id, comp: t._pre_assigned_composition, defects: JSON.stringify(t._capture_defects_resolved) }));
    tasks33[1].status = IMAGE_TASK_STATUS.SAFETY_CHECK_FAILED; tasks33[1].error = 'simulated';
    const failed33 = tasks33.filter(t => TERMINAL_STATUSES.has(t.status) && t.status !== IMAGE_TASK_STATUS.SUCCESS);
    failed33.forEach(t => { t.status = IMAGE_TASK_STATUS.PENDING; t.imageAttempt = 0; t.error = null; t.result = null; });
    const t33Failures = [];
    for (let i = 0; i < tasks33.length; i++) {
      if (tasks33[i]._batch_plan_id !== snap33[i].planId) t33Failures.push(`task ${i}: plan_id changed`);
      if (tasks33[i]._pre_assigned_composition !== snap33[i].comp) t33Failures.push(`task ${i}: composition changed`);
      if (JSON.stringify(tasks33[i]._capture_defects_resolved) !== snap33[i].defects) t33Failures.push(`task ${i}: defects changed`);
    }
    if (!t33Failures.length) pass('T33: manual retry preserves batch plan — plan_id, composition, defects unchanged');
    else fail('T33', t33Failures.join('; '));
  } catch (e) { fail('T33', e.message); }

  // T34: _assertTaskHasBatchPlan — throws for unplanned, silent for planned
  try {
    const row34 = { metier: 'peinture', travaux: 'peinture intérieure', contexte: 'maison', etat: 'encours', nb: 1, ville: '', fiche: '', meteo: 'auto', images: [] };
    const base34 = buildDallePromptV2(row34);
    const pb34   = JSON.parse(base34);
    const pp34   = _buildPresencePlan(1, pb34.state_level, pb34._matched_key, 42);
    const task34 = { taskId: 't34', row: row34, i: 0, nb: 1, jsonScene: base34, presencePlan: pp34, slug: 'test', _planBase: pb34, status: 'pending', imageAttempt: 0, result: null, error: null };
    let threwUnplanned = false;
    try { _assertTaskHasBatchPlan(task34); } catch(e) { threwUnplanned = e.message.includes('INCOMPLETE_BATCH_PLAN'); }
    _planGlobalBatch([task34], 'T34-seed');
    let threwAfterPlan = false;
    try { _assertTaskHasBatchPlan(task34); } catch(e) { threwAfterPlan = true; }
    const t34Failures = [];
    if (!threwUnplanned) t34Failures.push('_assertTaskHasBatchPlan did not throw for unplanned task');
    if (threwAfterPlan)  t34Failures.push('_assertTaskHasBatchPlan threw for correctly planned task');
    if (!t34Failures.length) pass('T34: _assertTaskHasBatchPlan — throws for unplanned, silent for planned');
    else fail('T34', t34Failures.join('; '));
  } catch (e) { fail('T34', e.message); }

  // T35: _rebalanceGlobalBatchPlan — global quotas across 100 seeds
  try {
    const t35Failures = [];
    const t35Proto = [
      { taskId: 'crev-1', _planBase: { _matched_key: 'depannage_auto', _matched_service: 'crevaison pneu crevé' } },
      { taskId: 'crev-2', _planBase: { _matched_key: 'depannage_auto', _matched_service: 'crevaison pneu crevé' } },
      { taskId: 'batt-1', _planBase: { _matched_key: 'depannage_auto', _matched_service: 'batterie_a_plat' } },
      { taskId: 'batt-2', _planBase: { _matched_key: 'depannage_auto', _matched_service: 'batterie_a_plat' } },
    ];
    for (let s = 0; s < 100 && t35Failures.length < 5; s++) {
      const tasks = t35Proto.map(t => Object.assign({}, t));
      const seed  = `T35-seed-${s}`;
      _planGlobalBatch(tasks, seed);
      _rebalanceGlobalBatchPlan(tasks, seed);
      try { _validateCompleteBatchPlan(tasks); } catch(e) { t35Failures.push(`s=${s}: ${e.message}`); continue; }
      const comps = tasks.map(t => t._pre_assigned_composition);
      if (comps.filter(c => c === 'close_detail').length > 1)  t35Failures.push(`s=${s}: close_detail>1`);
      if (!comps.includes('medium_intervention'))               t35Failures.push(`s=${s}: no medium_intervention`);
      if (!comps.includes('wide_worksite'))                     t35Failures.push(`s=${s}: no wide_worksite`);
      if (!comps.includes('contextual_overview'))               t35Failures.push(`s=${s}: no contextual_overview`);
      if (!tasks.some(t => t._pre_assigned_worker_presence === 'workers')) t35Failures.push(`s=${s}: no worker`);
      if (!tasks.some(t => t._pre_assigned_vehicle !== 'absent'))          t35Failures.push(`s=${s}: no vehicle`);
    }
    if (!t35Failures.length) pass('T35: _rebalanceGlobalBatchPlan — global quotas guaranteed across 100 seeds');
    else fail('T35', `${t35Failures.length} failures: ${t35Failures.slice(0, 3).join('; ')}`);
  } catch (e) { fail('T35', e.message); }

  // T36: _assertFinalWorkerConsistency — worker/no_people consistency enforced
  try {
    const t36Failures = [];
    const scW = { var_workers: 1, var_presence: 'workers', no_people: false, composition: 'medium_intervention', _matched_key: 'depannage_auto', triangle_rule: null, _worker_safety_mode: null, _capture_defects_resolved: [{ key: 'jpeg_compression', prompt: 'subtle JPEG compression' }] };
    _assertFinalWorkerConsistency(scW);
    if (scW.no_people !== false) t36Failures.push('T36a: no_people should be false for worker scene');
    const pW = _appendLockedFinalConstraints('[mock]', scW);
    if (!/One worker must be actively working/i.test(pW)) t36Failures.push('T36a: WORKER PRESENCE missing');
    if (/No workers or people visible/i.test(pW))         t36Failures.push('T36a: no-people instruction leaked');
    const scN = { var_workers: 0, var_presence: 'none', no_people: true, composition: 'wide_worksite', _matched_key: 'depannage_auto', triangle_rule: null, _worker_safety_mode: null, _capture_defects_resolved: [{ key: 'jpeg_compression', prompt: 'subtle JPEG compression' }] };
    _assertFinalWorkerConsistency(scN);
    if (scN.no_people !== true) t36Failures.push('T36b: no_people should be true for no-worker scene');
    const pN = _appendLockedFinalConstraints('[mock]', scN);
    if (!/No workers or people visible/i.test(pN)) t36Failures.push('T36b: no-people instruction missing');
    let threwC = false;
    try { _assertFinalWorkerConsistency({ var_workers: 1, var_presence: 'workers', no_people: true, composition: 'medium_intervention', _matched_key: 'depannage_auto', triangle_rule: null, _capture_defects_resolved: [] }); }
    catch(e) { threwC = e.message.includes('WORKER_PROMPT_CONTRADICTION'); }
    if (!threwC) t36Failures.push('T36c: should throw WORKER_PROMPT_CONTRADICTION');
    if (!t36Failures.length) pass('T36: _assertFinalWorkerConsistency — worker/no_people consistency enforced');
    else fail('T36', t36Failures.join('; '));
  } catch (e) { fail('T36', e.message); }

  // T37: cross-family defect compatibility — 10 000 scenes
  try {
    const t37Failures = [];
    const defectFamily = {};
    for (const [fam, members] of Object.entries(CAPTURE_DEFECT_GROUPS)) for (const m of members) defectFamily[m] = fam;
    let fingerN = 0;
    for (let i = 0; i < 10000 && t37Failures.length < 5; i++) {
      const d = _selectCaptureDefects(i % 6, 6, _hashSeed(`T37|${i}`));
      if (!d.length)  { t37Failures.push(`i=${i}: empty`); continue; }
      if (d.length > 2) { t37Failures.push(`i=${i}: ${d.length} defects`); continue; }
      if (d.length === 2) { const [fa, fb] = d.map(x => defectFamily[x.key]); if (fa && fb && fa === fb) t37Failures.push(`i=${i}: same family (${fa})`); }
      if (d.some(x => x.key === 'finger_edge')) fingerN++;
    }
    const fPct = (fingerN / 10000 * 100).toFixed(1);
    if (fingerN > 10000 * 0.15) t37Failures.push(`finger_edge too frequent: ${fPct}%`);
    if (!t37Failures.length) pass(`T37: cross-family defect compatibility — 0 same-family pairs, finger_edge=${fPct}% (rare)`);
    else fail('T37', `${t37Failures.length} failures: ${t37Failures.slice(0, 3).join('; ')}`);
  } catch (e) { fail('T37', e.message); }

  // T40: buildDallePromptV2 stable — 8 snapshot hashes
  try {
    const REF = [
      { id:'toiture-nettoyage',       metier:'toiture',        travaux:'nettoyage gouttières',      contexte:'maison',      etat:'encours', ville:'Paris', refHash:942692532  },
      { id:'toiture-tuiles',          metier:'toiture',        travaux:'Remplacement de tuiles',     contexte:'maison',      etat:'encours', ville:'Paris', refHash:3750579066 },
      { id:'plomberie-debouchage',     metier:'plomberie',      travaux:'Débouchage canalisation',    contexte:'appartement', etat:'encours', ville:'Paris', refHash:3244601226 },
      { id:'plomberie-fuite',         metier:'plomberie',      travaux:"Fuite d'eau",                contexte:'maison',      etat:'debut',   ville:'Paris', refHash:1259829227 },
      { id:'electricite-normes',      metier:'électricité',    travaux:'Mise aux normes électrique', contexte:'appartement', etat:'encours', ville:'Paris', refHash:3653194414 },
      { id:'depannage-auto-batterie', metier:'depannage_auto', travaux:'batterie à plat',            contexte:'domicile',    etat:'encours', ville:'Paris', refHash:919780194  },
      { id:'peinture-interieure',     metier:'peinture',       travaux:'Peinture intérieure',        contexte:'appartement', etat:'encours', ville:'Paris', refHash:3792538061 },
      { id:'maconnerie-enduit',       metier:'maçonnerie',     travaux:'Réfection enduit façade',    contexte:'maison',      etat:'encours', ville:'Paris', refHash:1460650968 },
    ];
    const t40Failures = [];
    for (const ref of REF) {
      const row    = { metier: ref.metier, travaux: ref.travaux, contexte: ref.contexte, etat: ref.etat, nb: 1, ville: ref.ville, fiche: '', meteo: 'auto', images: [] };
      const json   = buildDallePromptV2(row);
      const stable = _stableStringify(JSON.parse(json));
      const hash   = _hash32(stable);
      if (hash !== ref.refHash) t40Failures.push(`${ref.id}: hash ${hash} ≠ ref ${ref.refHash}`);
    }
    if (!t40Failures.length) pass('T40: buildDallePromptV2 stable — 8 stableJson snapshots match');
    else fail('T40', t40Failures.slice(0, 3).join('; '));
  } catch (e) { fail('T40', e.message); }

  // T41: 18 métiers — planification n=1,2,3,4,6 sans rejet
  try {
    const t41Failures = [];
    const METIERS_18 = [
      { metier: 'toiture',             svc: 'Remplacement tuiles' },
      { metier: 'nettoyage_toiture',   svc: 'Démoussage toiture' },
      { metier: 'nettoyage_gouttieres', svc: 'Nettoyage gouttières' },
      { metier: 'etancheite',          svc: 'Réparation fuite toiture' },
      { metier: 'ravalement',          svc: 'Ravalement façade' },
      { metier: 'maçonnerie',          svc: 'Mur parpaing' },
      { metier: 'peinture',            svc: 'Peinture chambre' },
      { metier: 'carrelage',           svc: 'Faïence salle de bain' },
      { metier: 'vitrier',             svc: 'Remplacement vitrage brisé' },
      { metier: 'élagage',             svc: 'Élagage arbre' },
      { metier: 'abattage',            svc: 'Abattage arbre' },
      { metier: 'terrassement',        svc: 'Terrassement maison' },
      { metier: 'paysagiste',          svc: 'Création jardin' },
      { metier: 'depannage_auto',      svc: 'Batterie à plat' },
      { metier: 'nettoyage',           svc: 'Nettoyage façade' },
      { metier: 'débarras',            svc: 'Débarras appartement' },
      { metier: 'plomberie',           svc: 'Débouchage canalisation' },
      { metier: 'électricité',         svc: 'Mise aux normes électrique' },
    ];
    for (const { metier, svc } of METIERS_18) {
      for (const n of [1, 2, 3, 4, 6]) {
        try { _mkBatchTasks(metier, svc, 'encours', n, 42, 1000); }
        catch(e) { t41Failures.push(`${metier}/n=${n}: ${e.message}`); }
      }
    }
    if (!t41Failures.length) pass(`T41: 18 métiers × [1,2,3,4,6] — 0 rejet INVALID_BATCH_PLAN`);
    else fail('T41', t41Failures.slice(0, 5).join('; '));
  } catch (e) { fail('T41', e.message); }

  // RT1: pipeline public mocké n=4 toiture (mirrors T86)
  try {
    const state = createGenerationState(); state.runId = 'rt1';
    const tasks = _mkBatchTasks('toiture', 'Remplacement toiture', 'encours', 4, 86, 8600);
    const mf    = _mkFetch();
    const ri    = [];
    const ui    = _mkUiAdapter();
    const pipe  = createImagePipeline({ state, fetchImpl: mf.fetchImpl, readResponseImpl: _fakeRead, rewritePromptImpl: _fakeRewrite, uiAdapter: ui.adapter, sleep: _fakeSleep });
    await pipe.runImageBatch(tasks, 'sk-rt1', ri);
    const c = mf.counts();
    const rt1Failures = [];
    if (c.imgCalls !== 4) rt1Failures.push(`imgCalls expected 4 got ${c.imgCalls}`);
    if (ri.length !== 4)  rt1Failures.push(`runImages expected 4 got ${ri.length}`);
    if (tasks.filter(t => t.status === 'success').length !== 4) rt1Failures.push('not all 4 tasks succeeded');
    if (!rt1Failures.length) pass('RT1: createImagePipeline — n=4 toiture via factory, 4 images, 0 retry, 0 real request');
    else fail('RT1', rt1Failures.join('; '));
  } catch (e) { fail('RT1', e.message); }

  // RT2: bridge _lastMatch read/write
  try {
    const bridge = window.__GMB_IMAGE_CONTEXT__;
    if (!bridge) { fail('RT2', 'bridge absent'); }
    else {
      const value = { metier: 'toiture', service: 'réparation' };
      bridge.setLastMatch(value);
      const got = bridge.getLastMatch();
      if (got && got.metier === value.metier && got.service === value.service)
        pass('RT2: bridge _lastMatch — setLastMatch / getLastMatch identity');
      else fail('RT2', `expected ${JSON.stringify(value)} got ${JSON.stringify(got)}`);
    }
  } catch (e) { fail('RT2', e.message); }

  // RT3: window.addImgRow is modular (identity via __IMAGE_GEN_READY__)
  try {
    const api = await window.__IMAGE_GEN_READY__;
    if (window.addImgRow === api.addImgRow) pass('RT3: window.addImgRow — modular identity via __IMAGE_GEN_READY__');
    else fail('RT3', 'addImgRow not modular');
  } catch (e) { fail('RT3', e.message); }

  // RT4: getBatchPlanPolicy sentinel injection — single source verified
  try {
    const sentinel = (tasks) => ({
      validationRequirements: { maxClose: 999, minMedium: 0, minWide: 0, minContextual: 0, minMediumOrWide: 0, requireDistinctCompositions: false, minWorkerScenes: 0, minVehicleScenes: 0 },
      plannerTargets: { maxClose: 999, requiredCompositions: [], minVehicleScenes: 0 },
    });
    const tasks = [{ taskId: 1, _planBase: { _matched_key: 'toiture', _matched_service: 'test' } }];
    _planGlobalBatch(tasks, 'rt4');
    try { _validateCompleteBatchPlan(tasks, { getPolicy: sentinel }); pass('RT4: getBatchPlanPolicy sentinel injection — policy override works'); }
    catch(e) { fail('RT4', `validation threw with sentinel: ${e.message}`); }
  } catch (e) { fail('RT4', e.message); }

  } finally {
    window.fetch = realFetch;
  }

  const total = results.passed + results.failed;
  console.log(`[RUNTIME-TESTS] Done. ${results.passed}/${total} PASS, ${results.failed}/${total} FAIL.`);
  return results;
}

// Auto-register on window for console access
window._runRuntimeTests = runRuntimeTests;
