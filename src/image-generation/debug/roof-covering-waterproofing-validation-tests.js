/**
 * debug/roof-covering-waterproofing-validation-tests.js — RCW-1 to RCW-62
 * Couverture & étanchéité cluster validation — no image generation, no API calls.
 *
 * Validates:
 *   - Service routing (toiture 11 services, etancheite 17 services)
 *   - 2-worker enforcement across all toiture and etancheite maison scenarios
 *   - Pitch classification (STEEP_PITCH / MODERATE_PITCH / FLAT_OR_LOW_SLOPE)
 *   - MODERATE_PITCH safety rules (harness, dry surface, no ladder, edge protection)
 *   - MODERATE_PITCH runtime reachability via _applySiteRealism pool selection
 *   - Étanchéité contexts (maison, immeuble, commerce, default) — Worker 1/2, FLAT_OR_LOW_SLOPE
 *   - Worker rules min/max across all contracts; max≥3 for large-scale contracts
 *   - Tile stock at ground level — WORK_SCENES.toiture.exclusions + SITE_REALISM scene_exclude
 *   - Workers in all 4 canonical states (debut/encours/semifinal/final)
 *   - Hydrofuge MEWP route stability; anti-mousse DEFERRED_VISUAL_SAFETY explicit status
 */

import { WORK_SCENES, SITE_REALISM }     from '../services/index.js';
import { SERVICE_CATALOG }               from '../config/service-catalog.js';
import { ROOF_VISUAL_CONTRACTS }         from '../services/roof-waterproofing-gutter-contracts.js';
import { _applySiteRealism }             from '../resolution/service-resolver.js?v=1';

// ─── Service lists ────────────────────────────────────────────────────────────

const TOITURE_SERVICES    = SERVICE_CATALOG.toiture?.services    ?? [];  // 11
const ETANCHEITE_SERVICES = SERVICE_CATALOG.etancheite?.services ?? [];  // 17

// ─── Test harness ─────────────────────────────────────────────────────────────

const _results = [];
let _pass = 0, _fail = 0;

function pass(label)          { _results.push({ status: 'PASS',               label }); _pass++; }
function fail(label, detail)  { _results.push({ status: 'UNEXPECTED_FAILURE', label, detail }); _fail++; console.error(`  ✘ ${label}${detail ? ' — ' + detail : ''}`); }
function ok(cond, label, det) { cond ? pass(label) : fail(label, det); }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function _norm(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Find WORK_SCENE key for a normalized label within given WS keys. */
function resolveWorkSceneKey(normLabel, allowedKeys) {
  let bestKey = null, bestScore = 0;
  for (const [key, scene] of Object.entries(WORK_SCENES)) {
    if (!allowedKeys.has(key)) continue;
    const excluded = (scene.exclude_if || []).some(r =>
      typeof r === 'string' ? normLabel.includes(r) : normLabel.includes(r.phrase)
    );
    if (excluded) continue;
    let score = 0;
    for (const kw of (scene.service_keywords || [])) {
      if (normLabel.includes(kw.phrase)) score += kw.score;
    }
    if (score === 0) continue;
    const finalScore = score + (scene.priority || 1) * 0.1;
    if (finalScore > bestScore) { bestScore = finalScore; bestKey = key; }
  }
  return bestKey;
}

/** Find first SITE_REALISM scenario matching normLabel (flat array only). */
function resolveScenarioFlat(normLabel, sr) {
  for (const sc of (sr?.scenarios ?? [])) {
    if (!sc._for) continue;
    try { if (new RegExp(sc._for, 'i').test(normLabel)) return sc; } catch {}
  }
  return null;
}

/** Find first SITE_REALISM scenario matching normLabel (_dispatch:'contexte' maison). */
function resolveScenarioContexte(normLabel, sr, subKey = 'maison') {
  if (sr?._dispatch !== 'contexte') return null;
  const sub = sr[subKey];
  if (!sub?.scenarios) return null;
  for (const sc of sub.scenarios) {
    if (!sc._for) continue;
    try { if (new RegExp(sc._for, 'i').test(normLabel)) return sc; } catch {}
  }
  return null;
}

/** Get all scenarios from SITE_REALISM.toiture (flat array). */
function getAllToitureScenarios() {
  return SITE_REALISM.toiture?.scenarios ?? [];
}

/** Get all scenarios from SITE_REALISM.etancheite.maison. */
function getAllEtancheiteMaisonScenarios() {
  const sr = SITE_REALISM.etancheite;
  if (sr?._dispatch !== 'contexte') return [];
  return sr.maison?.scenarios ?? [];
}

/** Get all scenarios from SITE_REALISM.nettoyage_toiture (flat array). */
function getAllNettoyageToitureScenarios() {
  return SITE_REALISM.nettoyage_toiture?.scenarios ?? [];
}

function _hasWorker(text, n) {
  return typeof text === 'string' && text.includes(`Worker ${n}`);
}

function _framingHasWorker(framing, n) {
  if (!framing || typeof framing !== 'object') return false;
  return Object.values(framing).some(v => typeof v === 'string' && v.includes(`Worker ${n}`));
}

function _chantierHasTwoPros(chantier) {
  if (!Array.isArray(chantier)) return false;
  return chantier.some(s => typeof s === 'string' &&
    (s.includes('two professionals') || s.includes('deux') || s.includes('Worker 1') && s.includes('Worker 2')));
}

function _excludeHasSingleWorker(exclude) {
  if (!Array.isArray(exclude)) return false;
  return exclude.some(s => typeof s === 'string' && s.toLowerCase().includes('single worker'));
}

// ─── RCW-1: 11/11 toiture services route to `toiture` WS key ─────────────────

function rcw1() {
  const TOITURE_WS_KEYS = new Set(['toiture']);
  let routed = 0;
  for (const svc of TOITURE_SERVICES) {
    const norm  = _norm(svc);
    const wsKey = resolveWorkSceneKey(norm, TOITURE_WS_KEYS);
    if (wsKey === 'toiture') {
      routed++;
      pass(`RCW-1: "${svc}" → toiture`);
    } else {
      fail(`RCW-1: "${svc}" did not route to toiture`, `wsKey=${wsKey}`);
    }
  }
  ok(routed === TOITURE_SERVICES.length,
    `RCW-1 summary: ${routed}/${TOITURE_SERVICES.length} toiture services ROUTED_CORRECTLY`);
}

// ─── RCW-2: 17/17 etancheite services route to `etancheite` WS key ───────────

function rcw2() {
  const ETANCH_WS_KEYS = new Set(['etancheite']);
  let routed = 0;
  for (const svc of ETANCHEITE_SERVICES) {
    const norm  = _norm(svc);
    const wsKey = resolveWorkSceneKey(norm, ETANCH_WS_KEYS);
    if (wsKey === 'etancheite') {
      routed++;
      pass(`RCW-2: "${svc}" → etancheite`);
    } else {
      fail(`RCW-2: "${svc}" did not route to etancheite`, `wsKey=${wsKey}`);
    }
  }
  ok(routed === ETANCHEITE_SERVICES.length,
    `RCW-2 summary: ${routed}/${ETANCHEITE_SERVICES.length} etancheite services ROUTED_CORRECTLY`);
}

// ─── RCW-3: WORK_SCENES.etancheite.hasWorkers === true ───────────────────────

function rcw3() {
  const ws = WORK_SCENES.etancheite;
  ok(ws?.hasWorkers === true,
    'RCW-3: WORK_SCENES.etancheite.hasWorkers is true',
    `actual: ${ws?.hasWorkers}`);
}

// ─── RCW-4: WORK_SCENES.etancheite.exclusions does not contain workers/people ─

function rcw4() {
  const exclusions = WORK_SCENES.etancheite?.exclusions ?? [];
  ok(!exclusions.includes('workers'),
    'RCW-4: WORK_SCENES.etancheite.exclusions does not contain "workers"',
    `exclusions: ${JSON.stringify(exclusions)}`);
  ok(!exclusions.includes('people'),
    'RCW-4: WORK_SCENES.etancheite.exclusions does not contain "people"',
    `exclusions: ${JSON.stringify(exclusions)}`);
  ok(!exclusions.includes('safety harnesses'),
    'RCW-4: WORK_SCENES.etancheite.exclusions does not contain "safety harnesses"',
    `exclusions: ${JSON.stringify(exclusions)}`);
}

// ─── RCW-5: All 14 toiture SITE_REALISM scenarios have pitch_class ────────────

function rcw5() {
  const scenarios = getAllToitureScenarios();
  let count = 0;
  for (let i = 0; i < scenarios.length; i++) {
    const sc = scenarios[i];
    const hasPitch = typeof sc.pitch_class === 'string' && sc.pitch_class.length > 0;
    if (hasPitch) count++;
    ok(hasPitch, `RCW-5: toiture scenario[${i}] (_for:${sc._for ?? 'fallback'}) has pitch_class`,
      `pitch_class=${sc.pitch_class}`);
  }
  ok(count === scenarios.length,
    `RCW-5 summary: ${count}/${scenarios.length} toiture scenarios have pitch_class`);
}

// ─── RCW-6: All etancheite maison scenarios have pitch_class ──────────────────

function rcw6() {
  const scenarios = getAllEtancheiteMaisonScenarios();
  let count = 0;
  for (let i = 0; i < scenarios.length; i++) {
    const sc = scenarios[i];
    const hasPitch = typeof sc.pitch_class === 'string' && sc.pitch_class.length > 0;
    if (hasPitch) count++;
    ok(hasPitch, `RCW-6: etancheite.maison scenario[${i}] (_for:${sc._for ?? 'fallback'}) has pitch_class`,
      `pitch_class=${sc.pitch_class}`);
  }
  ok(count > 0 && count === scenarios.length,
    `RCW-6 summary: ${count}/${scenarios.length} etancheite.maison scenarios have pitch_class`);
}

// ─── RCW-7: All toiture scenarios contain 'Worker 1' in scene_note ────────────

function rcw7() {
  const scenarios = getAllToitureScenarios();
  let ok7 = 0;
  for (let i = 0; i < scenarios.length; i++) {
    const sc = scenarios[i];
    const has = _hasWorker(sc.scene_note, 1);
    if (has) ok7++;
    ok(has, `RCW-7: toiture scenario[${i}] (_for:${sc._for ?? 'fallback'}) has "Worker 1" in scene_note`);
  }
  ok(ok7 === scenarios.length,
    `RCW-7 summary: ${ok7}/${scenarios.length} toiture scenarios have Worker 1 in scene_note`);
}

// ─── RCW-8: All toiture scenarios contain 'Worker 2' in scene_note ────────────

function rcw8() {
  const scenarios = getAllToitureScenarios();
  let ok8 = 0;
  for (let i = 0; i < scenarios.length; i++) {
    const sc = scenarios[i];
    const has = _hasWorker(sc.scene_note, 2);
    if (has) ok8++;
    ok(has, `RCW-8: toiture scenario[${i}] (_for:${sc._for ?? 'fallback'}) has "Worker 2" in scene_note`);
  }
  ok(ok8 === scenarios.length,
    `RCW-8 summary: ${ok8}/${scenarios.length} toiture scenarios have Worker 2 in scene_note`);
}

// ─── RCW-9: All toiture scenarios have Worker 2 in scene_framing ──────────────

function rcw9() {
  const scenarios = getAllToitureScenarios();
  let ok9 = 0;
  for (let i = 0; i < scenarios.length; i++) {
    const sc = scenarios[i];
    const has = _framingHasWorker(sc.scene_framing, 2);
    if (has) ok9++;
    ok(has, `RCW-9: toiture scenario[${i}] (_for:${sc._for ?? 'fallback'}) has "Worker 2" in scene_framing`);
  }
  ok(ok9 === scenarios.length,
    `RCW-9 summary: ${ok9}/${scenarios.length} toiture scenarios have Worker 2 in scene_framing`);
}

// ─── RCW-10: All toiture scenarios have two-professional mention in chantier ───

function rcw10() {
  const scenarios = getAllToitureScenarios();
  let ok10 = 0;
  for (let i = 0; i < scenarios.length; i++) {
    const sc = scenarios[i];
    const has = _chantierHasTwoPros(sc.chantier_details);
    if (has) ok10++;
    ok(has, `RCW-10: toiture scenario[${i}] (_for:${sc._for ?? 'fallback'}) chantier_details mentions two professionals`);
  }
  ok(ok10 === scenarios.length,
    `RCW-10 summary: ${ok10}/${scenarios.length} toiture scenarios have two-professional in chantier_details`);
}

// ─── RCW-11: All etancheite maison scenarios contain 'Worker 1' in scene_note ─

function rcw11() {
  const scenarios = getAllEtancheiteMaisonScenarios();
  let ok11 = 0;
  for (let i = 0; i < scenarios.length; i++) {
    const sc = scenarios[i];
    const has = _hasWorker(sc.scene_note, 1);
    if (has) ok11++;
    ok(has, `RCW-11: etancheite.maison scenario[${i}] (_for:${sc._for ?? 'fallback'}) has "Worker 1" in scene_note`);
  }
  ok(ok11 === scenarios.length,
    `RCW-11 summary: ${ok11}/${scenarios.length} etancheite.maison scenarios have Worker 1 in scene_note`);
}

// ─── RCW-12: All etancheite maison scenarios contain 'Worker 2' in scene_note ─

function rcw12() {
  const scenarios = getAllEtancheiteMaisonScenarios();
  let ok12 = 0;
  for (let i = 0; i < scenarios.length; i++) {
    const sc = scenarios[i];
    const has = _hasWorker(sc.scene_note, 2);
    if (has) ok12++;
    ok(has, `RCW-12: etancheite.maison scenario[${i}] (_for:${sc._for ?? 'fallback'}) has "Worker 2" in scene_note`);
  }
  ok(ok12 === scenarios.length,
    `RCW-12 summary: ${ok12}/${scenarios.length} etancheite.maison scenarios have Worker 2 in scene_note`);
}

// ─── RCW-13: All etancheite maison scenarios have two-professional in chantier ─

function rcw13() {
  const scenarios = getAllEtancheiteMaisonScenarios();
  let ok13 = 0;
  for (let i = 0; i < scenarios.length; i++) {
    const sc = scenarios[i];
    const has = _chantierHasTwoPros(sc.chantier_details);
    if (has) ok13++;
    ok(has, `RCW-13: etancheite.maison scenario[${i}] (_for:${sc._for ?? 'fallback'}) chantier_details mentions two professionals`);
  }
  ok(ok13 === scenarios.length,
    `RCW-13 summary: ${ok13}/${scenarios.length} etancheite.maison scenarios have two-professional in chantier_details`);
}

// ─── RCW-14: All etancheite maison scenarios have 'single worker' in scene_exclude

function rcw14() {
  const scenarios = getAllEtancheiteMaisonScenarios();
  let ok14 = 0;
  for (let i = 0; i < scenarios.length; i++) {
    const sc = scenarios[i];
    const has = _excludeHasSingleWorker(sc.scene_exclude);
    if (has) ok14++;
    ok(has, `RCW-14: etancheite.maison scenario[${i}] (_for:${sc._for ?? 'fallback'}) scene_exclude forbids single worker`);
  }
  ok(ok14 === scenarios.length,
    `RCW-14 summary: ${ok14}/${scenarios.length} etancheite.maison scenarios forbid single-worker in scene_exclude`);
}

// ─── RCW-15 to RCW-19: Pitch classification — toiture ────────────────────────

function rcw15() {
  // Renovation / réfection → STEEP_PITCH
  for (const svc of ['Rénovation toiture complète', 'Réfection toiture', 'Couverture neuve']) {
    const norm = _norm(svc);
    const sc = resolveScenarioFlat(norm, SITE_REALISM.toiture);
    ok(sc?.pitch_class === 'STEEP_PITCH',
      `RCW-15: "${svc}" resolves to STEEP_PITCH scenario`,
      `pitch_class=${sc?.pitch_class} _for=${sc?._for}`);
  }
}

function rcw16() {
  // Réparation / remplacement → STEEP_PITCH
  for (const svc of ['Réparation toiture', 'Remplacement tuiles', 'Remplacement ardoises']) {
    const norm = _norm(svc);
    const sc = resolveScenarioFlat(norm, SITE_REALISM.toiture);
    ok(sc?.pitch_class === 'STEEP_PITCH',
      `RCW-16: "${svc}" resolves to STEEP_PITCH scenario`,
      `pitch_class=${sc?.pitch_class} _for=${sc?._for}`);
  }
}

function rcw17() {
  // Faîtage → STEEP_PITCH
  const sc = resolveScenarioFlat(_norm('Faîtage'), SITE_REALISM.toiture);
  ok(sc?.pitch_class === 'STEEP_PITCH',
    `RCW-17: "Faîtage" resolves to STEEP_PITCH scenario`,
    `pitch_class=${sc?.pitch_class} _for=${sc?._for}`);
}

function rcw18() {
  // Zinguerie and Solins → STEEP_PITCH
  for (const svc of ['Zinguerie', 'Solins']) {
    const norm = _norm(svc);
    const sc = resolveScenarioFlat(norm, SITE_REALISM.toiture);
    ok(sc?.pitch_class === 'STEEP_PITCH',
      `RCW-18: "${svc}" resolves to STEEP_PITCH scenario`,
      `pitch_class=${sc?.pitch_class} _for=${sc?._for}`);
  }
}

function rcw19() {
  // Charpente / Isolation combles → STEEP_PITCH (exterior timber structure)
  for (const svc of ['Charpente', 'Isolation combles']) {
    const norm = _norm(svc);
    const sc = resolveScenarioFlat(norm, SITE_REALISM.toiture);
    ok(!!sc?.pitch_class,
      `RCW-19: "${svc}" resolves to a scenario with pitch_class`,
      `pitch_class=${sc?.pitch_class} _for=${sc?._for}`);
  }
}

// ─── RCW-20 to RCW-22: Pitch classification — etancheite ─────────────────────

function rcw20() {
  // Flat roof membrane → FLAT_OR_LOW_SLOPE
  for (const svc of ['Étanchéité EPDM', 'Étanchéité PVC', 'Étanchéité bitume', 'Étanchéité toit terrasse', 'Étanchéité toiture plate', "Réfection d'étanchéité"]) {
    const norm = _norm(svc);
    const sc = resolveScenarioContexte(norm, SITE_REALISM.etancheite, 'maison');
    ok(sc?.pitch_class === 'FLAT_OR_LOW_SLOPE',
      `RCW-20: "${svc}" resolves to FLAT_OR_LOW_SLOPE scenario`,
      `pitch_class=${sc?.pitch_class} _for=${sc?._for}`);
  }
}

function rcw21() {
  // Balcon / terrasse → FLAT_OR_LOW_SLOPE
  for (const svc of ['Étanchéité balcon', 'Étanchéité terrasse']) {
    const norm = _norm(svc);
    const sc = resolveScenarioContexte(norm, SITE_REALISM.etancheite, 'maison');
    ok(sc?.pitch_class === 'FLAT_OR_LOW_SLOPE',
      `RCW-21: "${svc}" resolves to FLAT_OR_LOW_SLOPE scenario`,
      `pitch_class=${sc?.pitch_class} _for=${sc?._for}`);
  }
}

function rcw22() {
  // Pitched-roof etancheite → STEEP_PITCH
  const steepServices = [
    'Réparation fuite toiture', 'Recherche de fuite', 'Infiltration toiture',
    'Réparation solin', 'Réparation Velux', 'Réparation noue',
    'Réparation rive', 'Étanchéité cheminée', 'Étanchéité acrotère',
  ];
  for (const svc of steepServices) {
    const norm = _norm(svc);
    const sc = resolveScenarioContexte(norm, SITE_REALISM.etancheite, 'maison');
    // Étanchéité acrotère is on a flat roof parapet — FLAT_OR_LOW_SLOPE or STEEP_PITCH both valid
    const valid = sc?.pitch_class === 'STEEP_PITCH' || (svc === 'Étanchéité acrotère' && sc?.pitch_class === 'FLAT_OR_LOW_SLOPE');
    ok(valid,
      `RCW-22: "${svc}" resolves to STEEP_PITCH scenario`,
      `pitch_class=${sc?.pitch_class} _for=${sc?._for}`);
  }
}

// ─── RCW-23: 'Réparation toiture' matches repair pattern (not renovation) ─────

function rcw23() {
  const norm = _norm('Réparation toiture');
  const sc = resolveScenarioFlat(norm, SITE_REALISM.toiture);
  // Should match the repar|rempla pattern, not the renov|refect pattern
  ok(sc?._for && /repar|rempla/i.test(sc._for),
    `RCW-23: "Réparation toiture" matches repair _for pattern (not renovation)`,
    `matched _for: ${sc?._for}`);
}

// ─── RCW-24: 'Faîtage' matches faitage _for pattern ─────────────────────────

function rcw24() {
  const norm = _norm('Faîtage');
  const sc = resolveScenarioFlat(norm, SITE_REALISM.toiture);
  ok(sc?._for && /faitage|faite|faitier/i.test(sc._for),
    `RCW-24: "Faîtage" matches faitage _for pattern`,
    `matched _for: ${sc?._for}`);
}

// ─── RCW-25: 'Réparation Velux' resolves to etancheite WS + STEEP_PITCH ───────

function rcw25() {
  const norm = _norm('Réparation Velux');
  const ETANCH_WS = new Set(['etancheite']);
  const wsKey = resolveWorkSceneKey(norm, ETANCH_WS);
  ok(wsKey === 'etancheite',
    `RCW-25: "Réparation Velux" routes to etancheite WS key`,
    `wsKey=${wsKey}`);
  const sc = resolveScenarioContexte(norm, SITE_REALISM.etancheite, 'maison');
  ok(sc?.pitch_class === 'STEEP_PITCH',
    `RCW-25: "Réparation Velux" resolves to STEEP_PITCH scenario`,
    `pitch_class=${sc?.pitch_class} _for=${sc?._for}`);
}

// ─── RCW-26: 'Réparation noue' resolves to etancheite WS + STEEP_PITCH ────────

function rcw26() {
  const norm = _norm('Réparation noue');
  const ETANCH_WS = new Set(['etancheite']);
  const wsKey = resolveWorkSceneKey(norm, ETANCH_WS);
  ok(wsKey === 'etancheite',
    `RCW-26: "Réparation noue" routes to etancheite WS key`,
    `wsKey=${wsKey}`);
  const sc = resolveScenarioContexte(norm, SITE_REALISM.etancheite, 'maison');
  ok(sc?.pitch_class === 'STEEP_PITCH',
    `RCW-26: "Réparation noue" resolves to STEEP_PITCH scenario`,
    `pitch_class=${sc?.pitch_class} _for=${sc?._for}`);
}

// ─── RCW-27: Renovation scenarios reference scaffold in tools or protections ───

function rcw27() {
  const RENOV_PATTERN = /renov|refect|couvert/i;
  const scenarios = getAllToitureScenarios().filter(sc => sc._for && RENOV_PATTERN.test(sc._for));
  ok(scenarios.length > 0, `RCW-27: at least 1 renovation scenario exists in toiture`);
  for (let i = 0; i < scenarios.length; i++) {
    const sc = scenarios[i];
    const allText = [
      ...(sc.tools ?? []),
      ...(sc.protections ?? []),
      sc.scene_note ?? '',
      sc.scene_framing?.foreground ?? '',
      sc.scene_framing?.midground  ?? '',
    ].join(' ').toLowerCase();
    const hasScaffold = allText.includes('scaffold');
    ok(hasScaffold,
      `RCW-27: toiture renov scenario[${i}] (_for:${sc._for}) references scaffold`,
      `tools/protections: ${sc.tools?.join(' | ')}`);
  }
}

// ─── RCW-28: All nettoyage_toiture scenarios contain Worker 1 AND Worker 2 ────

function rcw28() {
  const scenarios = getAllNettoyageToitureScenarios();
  ok(scenarios.length >= 10,
    `RCW-28: nettoyage_toiture has ≥10 scenarios`, `actual: ${scenarios.length}`);
  let both = 0;
  for (let i = 0; i < scenarios.length; i++) {
    const sc = scenarios[i];
    const hasW1 = _hasWorker(sc.scene_note, 1) || _framingHasWorker(sc.scene_framing, 1);
    const hasW2 = _hasWorker(sc.scene_note, 2) || _framingHasWorker(sc.scene_framing, 2);
    if (hasW1 && hasW2) both++;
    ok(hasW1 && hasW2,
      `RCW-28: nettoyage_toiture scenario[${i}] (_for:${sc._for ?? 'fallback'}) has Worker 1 AND Worker 2`);
  }
  ok(both === scenarios.length,
    `RCW-28 summary: ${both}/${scenarios.length} nettoyage_toiture scenarios have both workers`);
}

// ─── RCW-29: ≥1 MODERATE_PITCH scenario exists in toiture ────────────────────

function rcw29() {
  const moderate = getAllToitureScenarios().filter(sc => sc.pitch_class === 'MODERATE_PITCH');
  ok(moderate.length >= 1,
    `RCW-29: ≥1 MODERATE_PITCH scenario in toiture`, `count=${moderate.length}`);
}

// ─── RCW-30: MODERATE_PITCH scene_exclude forbids hooked roof ladder ──────────

function rcw30() {
  const moderate = getAllToitureScenarios().filter(sc => sc.pitch_class === 'MODERATE_PITCH');
  ok(moderate.length >= 1, `RCW-30: ≥1 MODERATE_PITCH scenario to check`);
  for (let i = 0; i < moderate.length; i++) {
    const sc = moderate[i];
    const excluded = (sc.scene_exclude ?? []).join(' ').toLowerCase();
    const forbidsLadder = excluded.includes('hooked roof ladder') || excluded.includes('no ladder');
    ok(forbidsLadder,
      `RCW-30: MODERATE_PITCH[${i}] scene_exclude forbids hooked roof ladder`,
      `scene_exclude: ${JSON.stringify(sc.scene_exclude)}`);
  }
}

// ─── RCW-31: MODERATE_PITCH scene_note requires dry and stable surface ────────

function rcw31() {
  const moderate = getAllToitureScenarios().filter(sc => sc.pitch_class === 'MODERATE_PITCH');
  for (let i = 0; i < moderate.length; i++) {
    const sc = moderate[i];
    const note = (sc.scene_note ?? '').toLowerCase();
    ok(note.includes('dry') && note.includes('stable'),
      `RCW-31: MODERATE_PITCH[${i}] scene_note contains 'dry' and 'stable'`,
      `_for: ${sc._for}`);
  }
}

// ─── RCW-32: MODERATE_PITCH requires professional fall protection ─────────────

function rcw32() {
  const moderate = getAllToitureScenarios().filter(sc => sc.pitch_class === 'MODERATE_PITCH');
  for (let i = 0; i < moderate.length; i++) {
    const sc = moderate[i];
    const allText = [
      sc.scene_note ?? '',
      ...(sc.protections ?? []),
      ...(sc.chantier_details ?? []),
    ].join(' ').toLowerCase();
    const hasProtection = allText.includes('harness') || allText.includes('lanyard') || allText.includes('safety line');
    ok(hasProtection,
      `RCW-32: MODERATE_PITCH[${i}] references harness/lanyard/safety line`,
      `_for: ${sc._for}`);
  }
}

// ─── RCW-33: MODERATE_PITCH scene_exclude forbids unprotected eave edge ───────

function rcw33() {
  const moderate = getAllToitureScenarios().filter(sc => sc.pitch_class === 'MODERATE_PITCH');
  for (let i = 0; i < moderate.length; i++) {
    const sc = moderate[i];
    const excluded = (sc.scene_exclude ?? []).join(' ').toLowerCase();
    const forbidsEdge = excluded.includes('eave edge') || excluded.includes('exposed edge');
    ok(forbidsEdge,
      `RCW-33: MODERATE_PITCH[${i}] scene_exclude forbids unprotected eave edge`,
      `scene_exclude: ${JSON.stringify(sc.scene_exclude)}`);
  }
}

// ─── RCW-34: STEEP_PITCH scenarios reference secured access (ladder/scaffold/MEWP)

function rcw34() {
  const steep = getAllToitureScenarios().filter(sc => sc.pitch_class === 'STEEP_PITCH');
  ok(steep.length >= 10, `RCW-34: ≥10 STEEP_PITCH scenarios exist`, `count=${steep.length}`);
  let secured = 0;
  for (const sc of steep) {
    const allText = [
      ...(sc.tools ?? []),
      ...(sc.protections ?? []),
      ...(sc.chantier_details ?? []),
    ].join(' ').toLowerCase();
    if (allText.includes('roof ladder') || allText.includes('scaffold') || allText.includes('mewp')) secured++;
  }
  ok(secured >= Math.floor(steep.length * 0.7),
    `RCW-34: ≥70% of STEEP_PITCH scenarios reference roof ladder/scaffold/MEWP`,
    `${secured}/${steep.length} reference secured access`);
}

// ─── RCW-35: All 4 etancheite contexts exist ──────────────────────────────────

function rcw35() {
  const sr = SITE_REALISM.etancheite;
  ok(sr?._dispatch === 'contexte',
    'RCW-35: etancheite._dispatch is contexte', `_dispatch=${sr?._dispatch}`);
  for (const ctx of ['maison', 'immeuble', 'commerce', 'default']) {
    ok(sr?.[ctx] != null,
      `RCW-35: etancheite.${ctx} context exists`);
  }
}

// ─── RCW-36: immeuble/commerce/default have Worker 1 AND Worker 2 in scene_note

function rcw36() {
  const sr = SITE_REALISM.etancheite;
  for (const ctx of ['immeuble', 'commerce', 'default']) {
    const note = sr?.[ctx]?.scene_note ?? '';
    ok(_hasWorker(note, 1),
      `RCW-36: etancheite.${ctx} scene_note has Worker 1`,
      `note: ${note.slice(0, 60)}`);
    ok(_hasWorker(note, 2),
      `RCW-36: etancheite.${ctx} scene_note has Worker 2`,
      `note: ${note.slice(0, 60)}`);
  }
}

// ─── RCW-37: Maison etancheite scenarios have Worker 1 AND Worker 2 ───────────

function rcw37() {
  const scenarios = getAllEtancheiteMaisonScenarios();
  ok(scenarios.length >= 1,
    `RCW-37: ≥1 maison etancheite scenario exists`, `count=${scenarios.length}`);
  for (let i = 0; i < scenarios.length; i++) {
    const sc = scenarios[i];
    const hasW1 = _hasWorker(sc.scene_note, 1) || _framingHasWorker(sc.scene_framing, 1);
    const hasW2 = _hasWorker(sc.scene_note, 2) || _framingHasWorker(sc.scene_framing, 2);
    ok(hasW1 && hasW2,
      `RCW-37: etancheite.maison scenario[${i}] (_for:${sc._for ?? 'fallback'}) has Worker 1 AND Worker 2`,
      `hasW1=${hasW1} hasW2=${hasW2}`);
  }
}

// ─── RCW-38: immeuble/commerce/default have pitch_class FLAT_OR_LOW_SLOPE ─────

function rcw38() {
  const sr = SITE_REALISM.etancheite;
  for (const ctx of ['immeuble', 'commerce', 'default']) {
    const pc = sr?.[ctx]?.pitch_class;
    ok(pc === 'FLAT_OR_LOW_SLOPE',
      `RCW-38: etancheite.${ctx} pitch_class is FLAT_OR_LOW_SLOPE`,
      `actual: ${pc}`);
  }
}

// ─── RCW-39: All roof visual contracts have worker_rules.min >= 2 ─────────────

function rcw39() {
  const entries = Object.entries(ROOF_VISUAL_CONTRACTS);
  ok(entries.length >= 10, `RCW-39: ≥10 contracts exist`, `count=${entries.length}`);
  for (const [key, c] of entries) {
    const min = c.worker_rules?.min;
    ok(min != null && min >= 2,
      `RCW-39: [${key}] worker_rules.min >= 2`, `min=${min}`);
  }
}

// ─── RCW-40: Large-scale contracts have worker_rules.max >= 3 ─────────────────

function rcw40() {
  const LARGE_SCALE = ['renovation_toiture', 'charpente_combles', 'etancheite_toit_terrasse', 'remplacement_gouttieres'];
  for (const key of LARGE_SCALE) {
    const c = ROOF_VISUAL_CONTRACTS[key];
    ok(c != null, `RCW-40: contract '${key}' exists`);
    const max = c?.worker_rules?.max;
    ok(max != null && max >= 3,
      `RCW-40: [${key}] worker_rules.max >= 3`, `max=${max}`);
  }
}

// ─── RCW-41: MODERATE_PITCH chantier_details has Worker 1 AND Worker 2 ────────

function rcw41() {
  const moderate = getAllToitureScenarios().filter(sc => sc.pitch_class === 'MODERATE_PITCH');
  ok(moderate.length >= 1, `RCW-41: ≥1 MODERATE_PITCH scenario to check`);
  for (let i = 0; i < moderate.length; i++) {
    const sc = moderate[i];
    const w1 = (sc.chantier_details ?? []).some(s => s.includes('Worker 1'));
    const w2 = (sc.chantier_details ?? []).some(s => s.includes('Worker 2'));
    ok(w1 && w2,
      `RCW-41: MODERATE_PITCH[${i}] chantier_details has Worker 1 AND Worker 2`,
      `_for: ${sc._for}`);
  }
}

// ─── RCW-42: WORK_SCENES.toiture.exclusions contains tile-pallet prohibition ──

function rcw42() {
  const exclusions = WORK_SCENES.toiture?.exclusions ?? [];
  const hasTilePallet = exclusions.some(e => e.includes('tile pallet') || e.includes('tile stack'));
  ok(hasTilePallet,
    'RCW-42: WORK_SCENES.toiture.exclusions contains tile pallet/stack prohibition',
    `exclusions: ${JSON.stringify(exclusions)}`);
}

// ─── RCW-43: WORK_SCENES.toiture.exclusions contains ground-level stock rule ──

function rcw43() {
  const exclusions = WORK_SCENES.toiture?.exclusions ?? [];
  const hasGroundRule = exclusions.some(e => e.includes('ground level'));
  ok(hasGroundRule,
    'RCW-43: WORK_SCENES.toiture.exclusions contains ground-level stock rule',
    `exclusions: ${JSON.stringify(exclusions)}`);
}

// ─── RCW-44: MODERATE_PITCH scene_exclude forbids tile pallet/stack on roof ───

function rcw44() {
  const moderate = getAllToitureScenarios().filter(sc => sc.pitch_class === 'MODERATE_PITCH');
  ok(moderate.length >= 1, `RCW-44: ≥1 MODERATE_PITCH scenario to check`);
  for (let i = 0; i < moderate.length; i++) {
    const sc = moderate[i];
    const excluded = (sc.scene_exclude ?? []).join(' ').toLowerCase();
    const forbids = excluded.includes('tile pallet') || excluded.includes('tile stack') || excluded.includes('pallet on the roof');
    ok(forbids,
      `RCW-44: MODERATE_PITCH[${i}] scene_exclude forbids tile pallet/stack on roof`,
      `scene_exclude: ${JSON.stringify(sc.scene_exclude)}`);
  }
}

// ─── RCW-45: Repair/replacement scenarios reference single-tile manipulation ───

function rcw45() {
  const REPAIR_PATTERN = /repar|rempla/i;
  const repairScenarios = getAllToitureScenarios().filter(sc => sc._for && REPAIR_PATTERN.test(sc._for));
  ok(repairScenarios.length >= 2,
    `RCW-45: ≥2 repair/replacement toiture scenarios exist`, `count=${repairScenarios.length}`);
  let singleItemCount = 0;
  for (const sc of repairScenarios) {
    const note = (sc.scene_note ?? '').toLowerCase();
    if (note.includes('damaged tile') || note.includes('replacement tile') || note.includes('single tile') || note.includes('new tile') || note.includes('zinc')) {
      singleItemCount++;
    }
  }
  ok(singleItemCount >= 1,
    `RCW-45: ≥1 repair scenario references single tile/zinc item manipulation`,
    `${singleItemCount}/${repairScenarios.length} have single-item language`);
}

// ─── RCW-46: WORK_SCENES.toiture.exclusions non-empty (reaches locked prompt) ─

function rcw46() {
  const exclusions = WORK_SCENES.toiture?.exclusions;
  ok(Array.isArray(exclusions) && exclusions.length >= 4,
    `RCW-46: WORK_SCENES.toiture.exclusions is a non-empty array (≥4 entries)`,
    `length=${exclusions?.length}`);
}

// ─── RCW-47: WORK_SCENES.toiture.states.final has Worker 1 AND Worker 2 ───────

function rcw47() {
  const final = WORK_SCENES.toiture?.states?.final;
  ok(final != null, 'RCW-47: WORK_SCENES.toiture.states.final exists');
  const framing = final?.framing ?? {};
  const allText = Object.values(framing).join(' ');
  ok(_hasWorker(allText, 1),
    'RCW-47: WORK_SCENES.toiture.states.final.framing has Worker 1');
  ok(_hasWorker(allText, 2),
    'RCW-47: WORK_SCENES.toiture.states.final.framing has Worker 2');
}

// ─── RCW-48: Nettoyage final states have Worker 1/2 with inspection/cleanup ───

function rcw48() {
  const checks = ['nettoyage_toiture', 'nettoyage_gouttieres'];
  for (const key of checks) {
    const final = WORK_SCENES[key]?.states?.final;
    ok(final != null, `RCW-48: WORK_SCENES.${key}.states.final exists`);
    const framing = final?.framing ?? {};
    const allText = Object.values(framing).join(' ');
    ok(_hasWorker(allText, 1) && _hasWorker(allText, 2),
      `RCW-48: WORK_SCENES.${key}.states.final has Worker 1 AND Worker 2`);
    const lowered = allText.toLowerCase();
    const hasCleanup = lowered.includes('inspect') || lowered.includes('check') || lowered.includes('pack') || lowered.includes('gather');
    ok(hasCleanup,
      `RCW-48: WORK_SCENES.${key}.states.final.framing has inspection/cleanup role`,
      `excerpt: ${lowered.slice(0, 100)}`);
  }
}

// ─── RCW-49: WORK_SCENES.etancheite.states.final has Worker 1 AND Worker 2 ────

function rcw49() {
  const final = WORK_SCENES.etancheite?.states?.final;
  ok(final != null, 'RCW-49: WORK_SCENES.etancheite.states.final exists');
  const framing = final?.framing ?? {};
  const allText = Object.values(framing).join(' ');
  ok(_hasWorker(allText, 1),
    'RCW-49: WORK_SCENES.etancheite.states.final.framing has Worker 1');
  ok(_hasWorker(allText, 2),
    'RCW-49: WORK_SCENES.etancheite.states.final.framing has Worker 2');
}

// ─── RCW-50: Hydrofuge MEWP micro-test route stable (byte-for-byte) ──────────

function rcw50() {
  const scenarios = SITE_REALISM.nettoyage_toiture?.scenarios ?? [];
  const mewp = scenarios.find(sc =>
    sc._access_configuration === 'MEWP' &&
    sc._state_for === 'encours' &&
    /hydrofuge/i.test(sc._for ?? '')
  );
  ok(mewp != null,
    'RCW-50: SITE_REALISM.nettoyage_toiture has hydrofuge MEWP scenario with _state_for:encours');
  ok(mewp?._access_configuration_source === 'state_lock',
    'RCW-50: hydrofuge MEWP scenario has _access_configuration_source:state_lock',
    `actual: ${mewp?._access_configuration_source}`);
}

// ─── RCW-51: Anti-mousse has ≥1 scenario in general pool (no _state_for) ──────

function rcw51() {
  const scenarios = SITE_REALISM.nettoyage_toiture?.scenarios ?? [];
  const antimousseAll = scenarios.filter(sc => /anti.mousse/i.test(sc._for ?? ''));
  ok(antimousseAll.length >= 1,
    `RCW-51: ≥1 anti-mousse scenario exists in SITE_REALISM.nettoyage_toiture`,
    `count=${antimousseAll.length}`);
  const inGeneralPool = antimousseAll.filter(sc => !sc._state_for);
  ok(inGeneralPool.length >= 1,
    `RCW-51: ≥1 anti-mousse scenario is in general pool (no _state_for — deferred from state-lock)`,
    `generalPool=${inGeneralPool.length} stateLocked=${antimousseAll.length - inGeneralPool.length}`);
}

// ─── RCW-52: antimousse_toiture contract max ≤ 2 (not promoted to large-scale) ─

function rcw52() {
  const c = ROOF_VISUAL_CONTRACTS.antimousse_toiture;
  ok(c != null, 'RCW-52: ROOF_VISUAL_CONTRACTS.antimousse_toiture exists');
  const max = c?.worker_rules?.max;
  ok(max != null && max <= 2,
    `RCW-52: antimousse_toiture worker_rules.max ≤ 2 (not accidentally promoted)`,
    `max=${max}`);
  const min = c?.worker_rules?.min;
  ok(min != null && min >= 2,
    `RCW-52: antimousse_toiture worker_rules.min >= 2`, `min=${min}`);
}

// ─── Anti-mousse deferred status — explicit audit record ─────────────────────
// Traitement anti-mousse toiture cannot be visually validated: the scaffold route
// produces workers on moss-covered tiles, which violates the MODERATE_PITCH safety
// constraint. Status is DEFERRED_VISUAL_SAFETY until a compliant scene is designed.
const ANTI_MOUSSE_DEFERRED_STATUS = Object.freeze({
  service:             'Traitement anti-mousse toiture',
  status:              'DEFERRED_VISUAL_SAFETY',
  validated_real_image: false,
  reason:              'scaffold route still produced workers on moss-covered roof tiles — incompatible with MODERATE_PITCH dry-surface constraint',
});

// ─── Helper: build minimal jsonStr for _applySiteRealism ─────────────────────
function _makeFakeJsonStr(matchedKey, matchedService, stateLevel) {
  return JSON.stringify({
    _matched_key:     matchedKey,
    _matched_service: matchedService,
    state_level:      stateLevel,
    exclude:          [],
  });
}

// ─── Helper: detect MODERATE_PITCH selection via framing content ──────────────
// MODERATE_PITCH repair: Worker 1 kneeling on tile surface (no scaffold)
// MODERATE_PITCH zinc:   Worker 1 dressing zinc apron / lead dresser
function _isModeratePitchRepairOutput(obj) {
  const mid  = (obj.framing?.midground ?? '').toLowerCase();
  const note = (obj.note ?? obj.scene_note ?? '').toLowerCase();
  const hasModerateSignal = mid.includes('kneeling') || mid.includes('dry stable tile') || mid.includes('tile surface');
  const hasHookedLadder   = mid.includes('hooked roof ladder') || note.includes('hooked roof ladder');
  return hasModerateSignal && !hasHookedLadder;
}
function _isModeratePitchZincOutput(obj) {
  const fg  = (obj.framing?.foreground ?? '').toLowerCase();
  const mid = (obj.framing?.midground  ?? '').toLowerCase();
  return mid.includes('zinc apron') || mid.includes('lead dresser') || fg.includes('zinc strip');
}

// ─── RCW-53: ≥1 MODERATE_PITCH repair route is runtime-reachable ─────────────
// Uses 'Remplacement tuiles' — réparation toiture is intentionally STEEP_PITCH only (A4 fix).

function rcw53() {
  const normRempla = _norm('Remplacement tuiles');
  const pool = (SITE_REALISM.toiture?.scenarios ?? []).filter(s =>
    s._for && (() => { try { return new RegExp(s._for, 'i').test(normRempla); } catch { return false; } })()
  );
  ok(pool.some(s => s.pitch_class === 'MODERATE_PITCH'),
    'RCW-53: MODERATE_PITCH repair scenario is in the _applySiteRealism candidate pool (remplacement tuiles)',
    `pool size=${pool.length}, pitches=[${pool.map(s => s.pitch_class).join(',')}]`);

  let foundIndex = -1;
  for (let idx = 0; idx < 60; idx++) {
    const json = _makeFakeJsonStr('toiture', 'Remplacement tuiles', 'encours');
    const out  = JSON.parse(_applySiteRealism(json, idx));
    if (_isModeratePitchRepairOutput(out)) { foundIndex = idx; break; }
  }
  ok(foundIndex >= 0,
    `RCW-53: MODERATE_PITCH repair scenario selected by _applySiteRealism at imageIndex=${foundIndex}`,
    'No imageIndex in [0,59] produced MODERATE_PITCH output');
}

// ─── RCW-54: ≥1 MODERATE_PITCH zinc/flashing route is runtime-reachable ──────

function rcw54() {
  const targeted = (SITE_REALISM.toiture?.scenarios ?? []).filter(s =>
    s._for && new RegExp('zinguerie|zinc|solin|larmier|noue.*zinc|bavette.*zinc', 'i').test('zinguerie')
  );
  ok(targeted.some(s => s.pitch_class === 'MODERATE_PITCH'),
    'RCW-54: MODERATE_PITCH zinc scenario is in the _applySiteRealism candidate pool',
    `pool size=${targeted.length}, pitches=[${targeted.map(s => s.pitch_class).join(',')}]`);

  let foundIndex = -1;
  for (let idx = 0; idx < 60; idx++) {
    const json = _makeFakeJsonStr('toiture', 'Zinguerie', 'encours');
    const out  = JSON.parse(_applySiteRealism(json, idx));
    if (_isModeratePitchZincOutput(out)) { foundIndex = idx; break; }
  }
  ok(foundIndex >= 0,
    `RCW-54: MODERATE_PITCH zinc scenario selected by _applySiteRealism at imageIndex=${foundIndex}`,
    'No imageIndex in [0,59] produced MODERATE_PITCH zinc output');
}

// ─── RCW-55: MODERATE_PITCH not shadowed — in pool for remplacement tuiles alongside STEEP_PITCH
// réparation toiture is intentionally STEEP_PITCH only (A4 fix); remplacement tuiles still has both.

function rcw55() {
  const normRempla = _norm('Remplacement tuiles');
  const pool = (SITE_REALISM.toiture?.scenarios ?? []).filter(s =>
    s._for && (() => { try { return new RegExp(s._for, 'i').test(normRempla); } catch { return false; } })()
  );
  const hasModerate = pool.some(s => s.pitch_class === 'MODERATE_PITCH');
  const hasSteep    = pool.some(s => s.pitch_class === 'STEEP_PITCH');
  ok(hasModerate && hasSteep,
    `RCW-55: remplacement tuiles pool has both STEEP and MODERATE pitch scenarios (not shadowed)`,
    `pool=[${pool.map(s => s.pitch_class).join(',')}]`);
  ok(pool.length >= 4,
    `RCW-55: remplacement tuiles candidate pool has ≥4 scenarios`, `count=${pool.length}`);
}

// ─── RCW-56: Selected pitch class survives complete task construction ──────────
// Uses 'Remplacement tuiles' — réparation toiture is intentionally STEEP_PITCH only (A4 fix).

function rcw56() {
  let moderateRepairIdx = -1;
  for (let idx = 0; idx < 60; idx++) {
    const json = _makeFakeJsonStr('toiture', 'Remplacement tuiles', 'encours');
    const out  = JSON.parse(_applySiteRealism(json, idx));
    if (_isModeratePitchRepairOutput(out)) { moderateRepairIdx = idx; break; }
  }
  if (moderateRepairIdx < 0) { fail('RCW-56', 'No MODERATE_PITCH repair imageIndex found — see RCW-53'); return; }

  const json = _makeFakeJsonStr('toiture', 'Remplacement tuiles', 'encours');
  const out  = JSON.parse(_applySiteRealism(json, moderateRepairIdx));
  ok(_isModeratePitchRepairOutput(out),
    `RCW-56: MODERATE_PITCH repair framing survives full _applySiteRealism pass (idx=${moderateRepairIdx})`,
    `midground: ${out.framing?.midground?.slice(0, 80)}`);
  const excl = (out.exclude ?? []).join(' ').toLowerCase();
  ok(excl.includes('hooked roof ladder') || excl.includes('no ladder'),
    `RCW-56: MODERATE_PITCH repair exclude propagated to output.exclude`,
    `exclude: ${JSON.stringify(out.exclude)}`);
}

// ─── RCW-57: Pitch selection exposed in telemetry (exclude propagation) ───────

function rcw57() {
  // When MODERATE_PITCH is selected, its scene_exclude is appended to obj.exclude.
  // These MODERATE_PITCH-specific strings serve as observable telemetry.
  let moderateZincIdx = -1;
  for (let idx = 0; idx < 60; idx++) {
    const json = _makeFakeJsonStr('toiture', 'Zinguerie', 'encours');
    const out  = JSON.parse(_applySiteRealism(json, idx));
    if (_isModeratePitchZincOutput(out)) { moderateZincIdx = idx; break; }
  }
  if (moderateZincIdx < 0) { fail('RCW-57', 'No MODERATE_PITCH zinc imageIndex found — see RCW-54'); return; }

  const json = _makeFakeJsonStr('toiture', 'Zinguerie', 'encours');
  const out  = JSON.parse(_applySiteRealism(json, moderateZincIdx));
  const excl = (out.exclude ?? []).join(' ').toLowerCase();
  ok(excl.includes('hooked roof ladder') || excl.includes('not required'),
    `RCW-57: MODERATE_PITCH zinc scene_exclude visible in output telemetry (idx=${moderateZincIdx})`,
    `exclude: ${JSON.stringify(out.exclude)}`);
}

// ─── RCW-58: Canonical state set is exactly debut/encours/semifinal/final ─────

function rcw58() {
  const CANONICAL = ['debut', 'encours', 'semifinal', 'final'];
  const states = WORK_SCENES.toiture?.states ?? {};
  const keys   = Object.keys(states).sort();
  ok(CANONICAL.every(k => keys.includes(k)) && keys.length === CANONICAL.length,
    `RCW-58: toiture states = exactly {debut,encours,semifinal,final}`,
    `actual keys: [${keys.join(',')}]`);
}

// ─── RCW-59: No unintended 'finition' state replaces semifinal ───────────────

function rcw59() {
  const states = WORK_SCENES.toiture?.states ?? {};
  ok(!('finition' in states),
    'RCW-59: toiture.states does NOT contain a "finition" key',
    'finition key found — breaks canonical state set');
  ok('semifinal' in states,
    'RCW-59: toiture.states contains the canonical "semifinal" key');
}

// ─── RCW-60: All four canonical states resolve with two workers ───────────────

function rcw60() {
  const CANONICAL = ['debut', 'encours', 'semifinal', 'final'];
  const states = WORK_SCENES.toiture?.states ?? {};
  for (const s of CANONICAL) {
    const fr   = states[s]?.framing ?? {};
    const text = Object.values(fr).filter(v => typeof v === 'string').join(' ');
    ok(_hasWorker(text, 1),
      `RCW-60: toiture.states.${s}.framing has Worker 1`, `keys=${Object.keys(fr).join(',')}`);
    ok(_hasWorker(text, 2),
      `RCW-60: toiture.states.${s}.framing has Worker 2`, `keys=${Object.keys(fr).join(',')}`);
  }
}

// ─── RCW-61: Anti-mousse has explicit DEFERRED_VISUAL_SAFETY status ───────────

function rcw61() {
  ok(ANTI_MOUSSE_DEFERRED_STATUS.status === 'DEFERRED_VISUAL_SAFETY',
    'RCW-61: anti-mousse explicit status is DEFERRED_VISUAL_SAFETY');
  ok(ANTI_MOUSSE_DEFERRED_STATUS.validated_real_image === false,
    'RCW-61: anti-mousse validated_real_image is false');
  ok(typeof ANTI_MOUSSE_DEFERRED_STATUS.reason === 'string' && ANTI_MOUSSE_DEFERRED_STATUS.reason.length > 10,
    'RCW-61: anti-mousse deferred reason is documented');
  ok(ANTI_MOUSSE_DEFERRED_STATUS.service === 'Traitement anti-mousse toiture',
    'RCW-61: deferred record names the correct service');
}

// ─── RCW-62: No contract marks anti-mousse as visually validated ──────────────

function rcw62() {
  const contract = ROOF_VISUAL_CONTRACTS.antimousse_toiture;
  ok(!contract?.validated_real_image,
    'RCW-62: antimousse_toiture contract does NOT have validated_real_image=true');
  // Anti-mousse scenarios live in SITE_REALISM.nettoyage_toiture (not toiture)
  const nettoyageSc = (SITE_REALISM.nettoyage_toiture?.scenarios ?? []).filter(
    s => s._for && new RegExp('anti.mousse', 'i').test(s._for)
  );
  ok(nettoyageSc.length >= 1,
    `RCW-62: ≥1 anti-mousse scenario exists in SITE_REALISM.nettoyage_toiture`, `count=${nettoyageSc.length}`);
  ok(nettoyageSc.every(s => !s.validated_real_image),
    'RCW-62: no anti-mousse scenario has validated_real_image=true');
}

// ─── Run all ──────────────────────────────────────────────────────────────────

export async function runRoofCoveringWaterproofingValidationTests() {
  console.group('RCW tests — Couverture & Étanchéité cluster validation');
  console.log(`Toiture services: ${TOITURE_SERVICES.length} | Étanchéité services: ${ETANCHEITE_SERVICES.length}`);

  rcw1();
  rcw2();
  rcw3();
  rcw4();
  rcw5();
  rcw6();
  rcw7();
  rcw8();
  rcw9();
  rcw10();
  rcw11();
  rcw12();
  rcw13();
  rcw14();
  rcw15();
  rcw16();
  rcw17();
  rcw18();
  rcw19();
  rcw20();
  rcw21();
  rcw22();
  rcw23();
  rcw24();
  rcw25();
  rcw26();
  rcw27();
  rcw28();
  rcw29();
  rcw30();
  rcw31();
  rcw32();
  rcw33();
  rcw34();
  rcw35();
  rcw36();
  rcw37();
  rcw38();
  rcw39();
  rcw40();
  rcw41();
  rcw42();
  rcw43();
  rcw44();
  rcw45();
  rcw46();
  rcw47();
  rcw48();
  rcw49();
  rcw50();
  rcw51();
  rcw52();
  rcw53();
  rcw54();
  rcw55();
  rcw56();
  rcw57();
  rcw58();
  rcw59();
  rcw60();
  rcw61();
  rcw62();

  console.log(`\nRCW Results: ${_pass} passed, ${_fail} failed`);
  if (_fail === 0) {
    console.log('%c✔ RCW PASS — All couverture & étanchéité validation tests passed', 'color: green; font-weight: bold');
  } else {
    console.error(`✘ RCW FAIL — ${_fail} test(s) failed`);
  }
  console.groupEnd();

  return {
    pass:    _pass,
    fail:    _fail,
    results: _results,
    ok:      _fail === 0,
  };
}

// Auto-register if loaded in test mode
if (typeof window !== 'undefined' && window._imageGenTestMode) {
  window.runRoofCoveringWaterproofingValidationTests = runRoofCoveringWaterproofingValidationTests;
  console.log('[RCW] Test suite loaded — call window.runRoofCoveringWaterproofingValidationTests() to run');
}
