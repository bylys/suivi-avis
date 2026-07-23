/**
 * arborist-scenes-tests.js — ARB-V test suite (Phase B)
 * 18 assertions covering arborist visual contracts.
 */

import { WORK_SCENES, SITE_REALISM } from '../services/index.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function _norm(s) {
  return (s || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/['']/g, "'").trim();
}

function _resolveKey(normalizedService) {
  for (const [key, scene] of Object.entries(WORK_SCENES)) {
    if (!(scene.service_keywords || []).length) continue;
    for (const kw of scene.service_keywords) {
      if (_norm(kw.phrase) === normalizedService || normalizedService.includes(_norm(kw.phrase))) {
        return key;
      }
    }
  }
  return null;
}

function _allScenarios(key) {
  const sr = SITE_REALISM[key];
  return sr ? (sr.scenarios || []) : [];
}

function _matchScenario(normalizedService, scenarios) {
  for (const sc of scenarios) {
    if (!sc._for) continue;
    try {
      if (new RegExp(sc._for).test(normalizedService)) return sc;
    } catch (_) { /* invalid regex — skip */ }
  }
  return null;
}

function _allMatching(normalizedService, scenarios) {
  return scenarios.filter(sc => {
    if (!sc._for) return false;
    try { return new RegExp(sc._for).test(normalizedService); } catch (_) { return false; }
  });
}

function _hasText(str, ...terms) {
  const lower = (str || '').toLowerCase();
  return terms.some(t => lower.includes(t.toLowerCase()));
}

function _lacksText(str, ...terms) {
  return !_hasText(str, ...terms);
}

function _allText(sc) {
  return [
    sc.scene_note, sc.scene_camera,
    (sc.scene_framing?.foreground || ''), (sc.scene_framing?.midground || ''), (sc.scene_framing?.background || ''),
    sc.scene_debris, ...(sc.protections || []), ...(sc.chantier_details || []),
  ].join(' ');
}

function _pass(label) { return { ok: true, label }; }
function _fail(label, msg) { return { ok: false, label, msg }; }

// ─── Service fixtures ─────────────────────────────────────────────────────────

const N_ELAGAGE_ARBRE        = _norm('Élagage arbre');
const N_ELAGAGE_PEUPLIER     = _norm('Élagage peuplier');
const N_ELAGAGE_HAUTEUR      = _norm('Élagage en hauteur');
const N_ELAGAGE_DANGEREUX    = _norm('Élagage arbres dangereux');
const N_RECEPAGE             = _norm('Récépage arbre');
const N_COURONNAGE           = _norm('Couronnage arbre');
const N_TAILLE_ARBRE         = _norm('Taille arbre');
const N_ABATTAGE_ARBRE       = _norm('Abattage arbre');
const N_ABATTAGE_PEUPLIER    = _norm('Abattage peuplier');
const N_ABATTAGE_GRAND       = _norm('Abattage grand arbre');
const N_ABATTAGE_DIFFICILE   = _norm('Abattage en zone difficile');
const N_ABATTAGE_CONIFERE    = _norm('Abattage conifère');
const N_DESSOUCHAGE          = _norm('Dessouchage');

const K_ELAGAGE   = _resolveKey(N_ELAGAGE_ARBRE);
const K_ABATTAGE  = _resolveKey(N_ABATTAGE_ARBRE);
const SC_ELAGAGE  = _allScenarios(K_ELAGAGE);
const SC_ABATTAGE = _allScenarios(K_ABATTAGE);

// ─── ARB-V Tests ─────────────────────────────────────────────────────────────

export async function runArboristScenesTests() {
  const results = [];

  // ARB-V1: élagage key resolves (not null, not fallback)
  {
    const ok = K_ELAGAGE !== null && K_ELAGAGE !== undefined;
    results.push(ok ? _pass('ARB-V1: élagage key resolves') : _fail('ARB-V1: élagage key resolves', `K_ELAGAGE=${K_ELAGAGE}`));
  }

  // ARB-V2: abattage key resolves (not null, not fallback)
  {
    const ok = K_ABATTAGE !== null && K_ABATTAGE !== undefined;
    results.push(ok ? _pass('ARB-V2: abattage key resolves') : _fail('ARB-V2: abattage key resolves', `K_ABATTAGE=${K_ABATTAGE}`));
  }

  // ARB-V3: élagage has ≥ 5 scenarios
  {
    const ok = SC_ELAGAGE.length >= 5;
    results.push(ok ? _pass('ARB-V3: élagage has ≥5 scenarios') : _fail('ARB-V3: élagage has ≥5 scenarios', `got ${SC_ELAGAGE.length}`));
  }

  // ARB-V4: abattage has ≥ 5 scenarios
  {
    const ok = SC_ABATTAGE.length >= 5;
    results.push(ok ? _pass('ARB-V4: abattage has ≥5 scenarios') : _fail('ARB-V4: abattage has ≥5 scenarios', `got ${SC_ABATTAGE.length}`));
  }

  // ARB-V5: élagage WORK_SCENES hasWorkers === true
  {
    const ws = WORK_SCENES[K_ELAGAGE];
    const ok = ws && ws.hasWorkers === true;
    results.push(ok ? _pass('ARB-V5: élagage hasWorkers=true') : _fail('ARB-V5: élagage hasWorkers=true', `hasWorkers=${ws?.hasWorkers}`));
  }

  // ARB-V6: abattage WORK_SCENES hasWorkers === true
  {
    const ws = WORK_SCENES[K_ABATTAGE];
    const ok = ws && ws.hasWorkers === true;
    results.push(ok ? _pass('ARB-V6: abattage hasWorkers=true') : _fail('ARB-V6: abattage hasWorkers=true', `hasWorkers=${ws?.hasWorkers}`));
  }

  // ARB-V7: homeowner camera doctrine in élagage WORK_SCENES
  {
    const ws = WORK_SCENES[K_ELAGAGE];
    const cam = (ws?.camera || '').toLowerCase();
    const ok = _hasText(cam, 'garden', 'driveway', 'homeowner') && _lacksText(cam, 'drone', 'basket', 'worker pov', 'gopro');
    results.push(ok ? _pass('ARB-V7: élagage homeowner camera doctrine') : _fail('ARB-V7: élagage homeowner camera doctrine', `camera="${ws?.camera?.slice(0,80)}"`));
  }

  // ARB-V8: ARB-CLIMBING-PRUNING matches élagage arbre
  {
    const sc = _matchScenario(N_ELAGAGE_ARBRE, SC_ELAGAGE);
    const ok = sc !== null && _hasText(_allText(sc), 'positioning rope', 'harness', 'lanyard');
    results.push(ok ? _pass('ARB-V8: ARB-CLIMBING-PRUNING matches élagage arbre') : _fail('ARB-V8: ARB-CLIMBING-PRUNING matches élagage arbre', sc ? 'missing rope/harness/lanyard' : 'no match'));
  }

  // ARB-V9: ARB-MEWP-PRUNING matches élagage peuplier
  {
    const all = _allMatching(N_ELAGAGE_PEUPLIER, SC_ELAGAGE);
    const sc = all.find(s => _hasText(_allText(s), 'basket', 'outrigger', 'guardrail'));
    const ok = sc !== undefined;
    results.push(ok ? _pass('ARB-V9: ARB-MEWP-PRUNING matches élagage peuplier') : _fail('ARB-V9: ARB-MEWP-PRUNING matches élagage peuplier', 'no MEWP scenario found'));
  }

  // ARB-V10: Worker 2 safety — all élagage scenarios either mention drop/fall zone safety or are cleanup phases where both workers are on the ground
  {
    const failing = SC_ELAGAGE.filter(sc => {
      const txt = _allText(sc);
      return _lacksText(txt,
        'outside the drop zone', 'outside the direct drop zone', 'outside the fall zone',
        'safe distance', 'safe lateral', 'lateral position', 'exclusion zone',
        'two professionals', 'both on the ground', 'at safe distance', 'at the garden edge',
        'distinct roles', 'managing chip', 'managing debris', 'managing the chip',
      );
    });
    const ok = failing.length === 0;
    results.push(ok ? _pass('ARB-V10: all élagage scenarios mention Worker 2 outside drop/fall zone') : _fail('ARB-V10: all élagage scenarios mention Worker 2 outside drop/fall zone', `${failing.length} scenario(s) missing: ${failing.map(s => s._for).join(', ')}`));
  }

  // ARB-V11: Worker 2 safety — all abattage scenarios either mention drop/fall zone safety or are cleanup phases
  {
    const failing = SC_ABATTAGE.filter(sc => {
      const txt = _allText(sc);
      return _lacksText(txt,
        'outside the drop zone', 'outside the direct drop zone', 'outside the fall zone',
        'safe distance', 'safe lateral', 'lateral position', 'exclusion zone',
        'two professionals', 'both on the ground', 'at safe distance', 'at the garden edge',
        'distinct roles', 'managing chip', 'managing debris', 'managing the chip',
      );
    });
    const ok = failing.length === 0;
    results.push(ok ? _pass('ARB-V11: all abattage scenarios mention Worker 2 outside drop/fall zone') : _fail('ARB-V11: all abattage scenarios mention Worker 2 outside drop/fall zone', `${failing.length} scenario(s) missing`));
  }

  // ARB-V12: ARB-CLIMBING-PRUNING: solo prevention — scene_exclude has 'no ground worker' or 'alone'
  {
    const sc = SC_ELAGAGE.find(s => _hasText(_allText(s), 'positioning rope') && _hasText(_allText(s), 'harness'));
    const ok = sc && (sc.scene_exclude || []).some(e => _hasText(e, 'ground worker', 'alone', 'no colleague', 'single arborist'));
    results.push(ok ? _pass('ARB-V12: ARB-CLIMBING-PRUNING excludes solo climber') : _fail('ARB-V12: ARB-CLIMBING-PRUNING excludes solo climber', 'scene_exclude missing solo-prevention clause'));
  }

  // ARB-V13: ARB-GROUND-FELLING matches abattage arbre, has felling direction + exclusion zone
  {
    const all = _allMatching(N_ABATTAGE_ARBRE, SC_ABATTAGE);
    const sc = all.find(s => _hasText(_allText(s), 'notch', 'back-cut', 'felling direction'));
    const ok = sc !== undefined && _hasText(_allText(sc), 'exclusion zone') && _hasText(_allText(sc), 'guide rope');
    results.push(ok ? _pass('ARB-V13: ARB-GROUND-FELLING matches abattage arbre') : _fail('ARB-V13: ARB-GROUND-FELLING matches abattage arbre', 'no felling scenario with notch/back-cut/exclusion zone'));
  }

  // ARB-V14: ARB-SECTIONAL-DISMANTLING matches abattage en zone difficile, has rigging rope + lowering device
  {
    const sc = _matchScenario(N_ABATTAGE_DIFFICILE, SC_ABATTAGE);
    const ok = sc !== null && _hasText(_allText(sc), 'rigging rope') && _hasText(_allText(sc), 'lowering device');
    results.push(ok ? _pass('ARB-V14: ARB-SECTIONAL-DISMANTLING matches abattage difficile') : _fail('ARB-V14: ARB-SECTIONAL-DISMANTLING matches abattage difficile', sc ? 'missing rigging rope or lowering device' : 'no match'));
  }

  // ARB-V15: ARB-STUMP-GRINDING matches dessouchage, has machine guard + chip ejection zone
  {
    const sc = _matchScenario(N_DESSOUCHAGE, SC_ABATTAGE);
    const ok = sc !== null && _hasText(_allText(sc), 'machine guard') && _hasText(_allText(sc), 'grinding wheel');
    results.push(ok ? _pass('ARB-V15: ARB-STUMP-GRINDING matches dessouchage') : _fail('ARB-V15: ARB-STUMP-GRINDING matches dessouchage', sc ? 'missing machine guard or grinding wheel' : 'no match'));
  }

  // ARB-V16: ARB-BRANCH-CHIPPING: no hands near rollers in any élagage chipper scenario
  {
    const sc = SC_ELAGAGE.find(s => _hasText(_allText(s), 'chipper') && _hasText(_allText(s), 'feeding'));
    const ok = sc && (sc.scene_exclude || []).some(e => _hasText(e, 'hands', 'rollers', 'inlet blades'));
    results.push(ok ? _pass('ARB-V16: ARB-BRANCH-CHIPPING excludes hands near rollers') : _fail('ARB-V16: ARB-BRANCH-CHIPPING excludes hands near rollers', 'scene_exclude missing hands/rollers clause'));
  }

  // ARB-V17: homeowner camera in all élagage scenarios — camera must be from homeowner position, not from basket/drone/worker POV
  {
    const failing = SC_ELAGAGE.filter(sc => {
      const cam = (sc.scene_camera || '').toLowerCase();
      const hasHomeownerPos = _hasText(cam, 'garden', 'driveway', 'homeowner', 'residential window');
      const hasBadCameraPos = _hasText(cam, 'drone', 'from the basket', 'camera in', 'worker pov', 'gopro', 'from inside the basket');
      return !hasHomeownerPos || hasBadCameraPos;
    });
    const ok = failing.length === 0;
    results.push(ok ? _pass('ARB-V17: all élagage scenario cameras are homeowner-doctrine') : _fail('ARB-V17: all élagage scenario cameras are homeowner-doctrine', `${failing.length} violation(s): ${failing.map(s => s._for).join(', ')}`));
  }

  // ARB-V18: homeowner camera in all abattage scenarios — no drone/inside exclusion zone
  {
    const failing = SC_ABATTAGE.filter(sc => {
      const cam = (sc.scene_camera || '').toLowerCase();
      return !_hasText(cam, 'garden', 'driveway', 'homeowner', 'outside the exclusion zone') ||
             _hasText(cam, 'drone', 'inside the exclusion zone');
    });
    const ok = failing.length === 0;
    results.push(ok ? _pass('ARB-V18: all abattage scenario cameras are homeowner-doctrine') : _fail('ARB-V18: all abattage scenario cameras are homeowner-doctrine', `${failing.length} violation(s): ${failing.map(s => s._for).join(', ')}`));
  }

  // ARB-V19: Élagage en hauteur + encours resolves deterministically to MEWP (state_lock)
  {
    const n = _norm('Élagage en hauteur');
    const scenarios = _allScenarios(K_ELAGAGE);
    const stateLocked = scenarios.filter(sc => {
      if (!sc._for) return false;
      try { if (!new RegExp(sc._for).test(n)) return false; } catch(_) { return false; }
      if (!sc._state_for) return false;
      return Array.isArray(sc._state_for) ? sc._state_for.includes('encours') : sc._state_for === 'encours';
    });
    const hasMewp = stateLocked.some(sc => _hasText(_allText(sc), 'basket', 'guardrail', 'outrigger', 'MEWP'));
    const ok = stateLocked.length === 1 && hasMewp &&
               stateLocked[0]._access_configuration === 'MEWP' &&
               stateLocked[0]._access_configuration_source === 'state_lock' &&
               stateLocked[0]._access_configuration_randomized === false;
    results.push(ok ? _pass('ARB-V19: élagage en hauteur encours state_lock → MEWP') :
      _fail('ARB-V19: élagage en hauteur encours state_lock → MEWP',
        `locked=${stateLocked.length}, hasMewp=${hasMewp}, cfg=${stateLocked[0]?._access_configuration}, src=${stateLocked[0]?._access_configuration_source}`));
  }

  // ─── Summary ─────────────────────────────────────────────────────────────
  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok);
  console.log(`[ARB-V] ${passed}/${results.length} passed`);
  if (failed.length) {
    console.group('[ARB-V] Failures:');
    failed.forEach(r => console.warn(`  FAIL: ${r.label} — ${r.msg}`));
    console.groupEnd();
  }
  return { ok: failed.length === 0, passed, total: results.length, failures: failed };
}
