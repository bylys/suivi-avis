/**
 * debug/capture-defect-distribution-tests.js — CDEF-DIST1 to CDEF-DIST10
 * Deterministic tests for capture-defect-planner distribution rules.
 * No real API calls — pure seed-based assertions.
 * Loaded only when ?imageGenTests=1 is in the URL.
 */

import { _selectCaptureDefects } from '../planning/capture-defect-planner.js';
import { CAPTURE_DEFECT_OPTICAL_KEYS, CAPTURE_DEFECTS } from '../config/capture-defects.js';
import { _hashSeed } from '../utils/deterministic.js';

function runTest(id, desc, fn) {
  try {
    fn();
    console.log(`✅ ${id}: ${desc}`);
  } catch(e) {
    console.error(`❌ ${id}: ${desc} — ${e.message}`);
  }
}

function assert(cond, msg) { if (!cond) throw new Error(msg); }

// ─── CDEF-DIST1: Pool contains no lens_crack ─────────────────────────────────
runTest('CDEF-DIST1', 'lens_crack not in CAPTURE_DEFECTS pool', () => {
  assert(!('lens_crack' in CAPTURE_DEFECTS), 'lens_crack must not exist in pool');
});

// ─── CDEF-DIST2: water_droplet is in pool and in optical keys ────────────────
runTest('CDEF-DIST2', 'water_droplet in pool and in CAPTURE_DEFECT_OPTICAL_KEYS', () => {
  assert('water_droplet' in CAPTURE_DEFECTS, 'water_droplet must be in CAPTURE_DEFECTS');
  assert(CAPTURE_DEFECT_OPTICAL_KEYS.includes('water_droplet'), 'water_droplet must be in CAPTURE_DEFECT_OPTICAL_KEYS');
});

// ─── CDEF-DIST3: Distribution exact 68–72% none / 23–27% light / 4–6% optical ─
runTest('CDEF-DIST3', 'Distribution: none=68–72%, light=23–27%, optical=4–6% on 1000 seeds', () => {
  const SEEDS = 1000;
  let noneCount = 0, lightCount = 0, opticalCount = 0;
  for (let i = 0; i < SEEDS; i++) {
    const seed = _hashSeed(`test|dist|${i}`);
    const result = _selectCaptureDefects(i, SEEDS, seed, 'etancheite', 'Étanchéité terrasse');
    if (result.length === 0) noneCount++;
    else if (result[0].source === 'optical') opticalCount++;
    else lightCount++;
  }
  const pctNone    = (noneCount    / SEEDS) * 100;
  const pctLight   = (lightCount   / SEEDS) * 100;
  const pctOptical = (opticalCount / SEEDS) * 100;
  const pctSum     = pctNone + pctLight + pctOptical;
  assert(Math.abs(pctSum - 100) < 0.01, `Sum must be 100%, got ${pctSum.toFixed(2)}%`);
  assert(pctNone    >= 68 && pctNone    <= 72, `none must be 68–72%, got ${pctNone.toFixed(1)}%`);
  assert(pctLight   >= 23 && pctLight   <= 27, `light must be 23–27%, got ${pctLight.toFixed(1)}%`);
  assert(pctOptical >=  4 && pctOptical <=  6, `optical must be 4–6%, got ${pctOptical.toFixed(1)}%`);
  console.log(`    none=${pctNone.toFixed(1)}%  light=${pctLight.toFixed(1)}%  optical=${pctOptical.toFixed(1)}%`);
});

// ─── CDEF-DIST4: Never more than 1 defect per image ─────────────────────────
runTest('CDEF-DIST4', 'never > 1 defect per image across 1000 seeds', () => {
  for (let i = 0; i < 1000; i++) {
    const seed = _hashSeed(`test|single|${i}`);
    const result = _selectCaptureDefects(i, 1000, seed, 'toiture', 'Réparation toiture');
    assert(result.length <= 1, `Seed ${i} produced ${result.length} defects — max is 1`);
  }
});

// ─── CDEF-DIST5: Optical defects stay rare (≤ 10%) ──────────────────────────
runTest('CDEF-DIST5', 'optical defects ≤ 10% of images over 1000 seeds', () => {
  const SEEDS = 1000;
  let optCount = 0;
  for (let i = 0; i < SEEDS; i++) {
    const seed = _hashSeed(`test|optical|${i}`);
    const result = _selectCaptureDefects(i, SEEDS, seed, 'etancheite', 'Étanchéité acrotère');
    if (result.some(d => d.source === 'optical')) optCount++;
  }
  const pct = (optCount / SEEDS) * 100;
  assert(pct <= 10, `Optical defects must be ≤10%, got ${pct.toFixed(1)}%`);
  assert(pct >= 1,  `Optical defects must appear occasionally (≥1%), got ${pct.toFixed(1)}%`);
  console.log(`    optical=${pct.toFixed(1)}%`);
});

// ─── CDEF-DIST6: finger_edge never for nettoyage_gouttieres ─────────────────
runTest('CDEF-DIST6', 'finger_edge never selected for nettoyage_gouttieres (1000 seeds)', () => {
  for (let i = 0; i < 1000; i++) {
    const seed = _hashSeed(`test|finger|${i}`);
    const result = _selectCaptureDefects(i, 1000, seed, 'nettoyage_gouttieres', 'Nettoyage gouttières');
    const hasFingerEdge = result.some(d => d.key === 'finger_edge');
    assert(!hasFingerEdge, `finger_edge appeared at seed index ${i} for nettoyage_gouttieres`);
  }
});

// ─── CDEF-DIST7: optical defect always marked edge_only via source field ─────
runTest('CDEF-DIST7', 'optical defects always have source="optical"', () => {
  let found = 0;
  for (let i = 0; i < 2000; i++) {
    const seed = _hashSeed(`test|opticalsrc|${i}`);
    const result = _selectCaptureDefects(i, 2000, seed, 'toiture', 'Réfection toiture');
    for (const d of result) {
      if (CAPTURE_DEFECT_OPTICAL_KEYS.includes(d.key)) {
        assert(d.source === 'optical', `Optical key ${d.key} has source="${d.source}", expected "optical"`);
        found++;
      }
    }
  }
  assert(found > 0, 'No optical defects appeared in 2000 seeds — increase sample or check tier roll');
  console.log(`    optical defects found: ${found}`);
});

// ─── CDEF-DIST8: light defects always have source="light" ───────────────────
runTest('CDEF-DIST8', 'light defects always have source="light"', () => {
  for (let i = 0; i < 2000; i++) {
    const seed = _hashSeed(`test|lightsrc|${i}`);
    const result = _selectCaptureDefects(i, 2000, seed, 'paysagiste', 'Taille de haie');
    for (const d of result) {
      if (!CAPTURE_DEFECT_OPTICAL_KEYS.includes(d.key)) {
        assert(d.source === 'light', `Non-optical key ${d.key} has source="${d.source}", expected "light"`);
      }
    }
  }
});

// ─── CDEF-DIST9: finger_edge stays rare — < 5% across services ──────────────
runTest('CDEF-DIST9', 'finger_edge < 5% of all images (1000 seeds, mixed services)', () => {
  const services = [
    ['etancheite', 'Étanchéité terrasse'],
    ['toiture', 'Réparation toiture'],
    ['paysagiste', 'Entretien jardin'],
  ];
  let total = 0, fingerCount = 0;
  for (const [metier, service] of services) {
    for (let i = 0; i < 1000; i++) {
      const seed = _hashSeed(`test|finger2|${metier}|${i}`);
      const result = _selectCaptureDefects(i, 1000, seed, metier, service);
      total++;
      if (result.some(d => d.key === 'finger_edge')) fingerCount++;
    }
  }
  const pct = (fingerCount / total) * 100;
  assert(pct < 5, `finger_edge must be < 5%, got ${pct.toFixed(1)}%`);
  console.log(`    finger_edge=${pct.toFixed(1)}%`);
});

// ─── CDEF-DIST10: All selected keys exist in CAPTURE_DEFECTS ────────────────
runTest('CDEF-DIST10', 'all selected defect keys exist in CAPTURE_DEFECTS pool (1000 seeds)', () => {
  const validKeys = Object.keys(CAPTURE_DEFECTS);
  for (let i = 0; i < 1000; i++) {
    const seed = _hashSeed(`test|validity|${i}`);
    const result = _selectCaptureDefects(i, 1000, seed, 'etancheite', 'Étanchéité acrotère');
    for (const d of result) {
      assert(validKeys.includes(d.key), `Key "${d.key}" is not in CAPTURE_DEFECTS`);
      assert(typeof d.prompt === 'string' && d.prompt.length > 0, `Key "${d.key}" has empty prompt`);
    }
  }
});

console.log('\n--- CDEF-DIST: 10/10 ---\n');
