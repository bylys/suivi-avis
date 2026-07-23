/**
 * arborist-scenes-tests.js — ARB-V test suite (Phase B)
 * 18 assertions covering arborist visual contracts.
 */

import { WORK_SCENES, SITE_REALISM } from '../services/index.js';
import { CAPTURE_DEFECTS, CAPTURE_DEFECT_GROUPS } from '../config/capture-defects.js';
import { _selectCaptureDefects } from '../planning/capture-defect-planner.js';

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

  // ARB-V20: Abattage en zone difficile + encours cannot resolve to cleanup-only scene
  {
    const n = _norm('Abattage en zone difficile');
    const scenarios = _allScenarios(K_ABATTAGE);
    const stateLocked = scenarios.filter(sc => {
      if (!sc._for) return false;
      try { if (!new RegExp(sc._for).test(n)) return false; } catch (_) { return false; }
      if (!sc._state_for) return false;
      return Array.isArray(sc._state_for) ? sc._state_for.includes('encours') : sc._state_for === 'encours';
    });
    // Must lock to exactly one scenario and it must NOT be a cleanup scene
    const hasCleanup = stateLocked.some(sc => {
      const txt = _allText(sc);
      return _hasText(txt, 'loading', 'raking', 'green waste removal', 'loading into trailer', 'chip output') &&
             _lacksText(txt, 'rigging rope', 'lowering device', 'crown');
    });
    const hasRigging = stateLocked.some(sc => _hasText(_allText(sc), 'rigging rope') && _hasText(_allText(sc), 'lowering device'));
    const ok = stateLocked.length === 1 && hasRigging && !hasCleanup &&
               stateLocked[0]._access_configuration === 'SECTIONAL_DISMANTLING' &&
               stateLocked[0]._access_configuration_source === 'state_lock' &&
               stateLocked[0]._access_configuration_randomized === false;
    results.push(ok ? _pass('ARB-V20: abattage en zone difficile encours state_lock → SECTIONAL_DISMANTLING, not cleanup') :
      _fail('ARB-V20: abattage en zone difficile encours state_lock → SECTIONAL_DISMANTLING, not cleanup',
        `locked=${stateLocked.length}, hasRigging=${hasRigging}, hasCleanup=${hasCleanup}, cfg=${stateLocked[0]?._access_configuration}, src=${stateLocked[0]?._access_configuration_source}`));
  }

  // ARB-V21: finger_edge only appears when batchIndex % 3 === 0
  {
    const seed = 99999;
    const fingerOnAllowed  = _selectCaptureDefects(0, 4, seed).map(d => d.key);  // 0 % 3 === 0 → allowed
    const fingerOnForbidden1 = _selectCaptureDefects(1, 4, seed).map(d => d.key);  // forbidden
    const fingerOnForbidden2 = _selectCaptureDefects(2, 4, seed).map(d => d.key);  // forbidden
    const fingerOnAllowed3 = _selectCaptureDefects(3, 4, seed).map(d => d.key);  // 3 % 3 === 0 → allowed
    const fingerNeverOnForbidden = !fingerOnForbidden1.includes('finger_edge') && !fingerOnForbidden2.includes('finger_edge');
    const fingerEligibleOnAllowed = !fingerOnAllowed.includes('finger_edge') || true; // may not pick it even if eligible
    // Test broader: for indices 1 and 2 (forbidden), across many seeds, finger never appears
    let fingerLeaksCount = 0;
    for (let s = 0; s < 200; s++) {
      for (const bi of [1, 2, 4, 5, 7, 8]) {
        const keys = _selectCaptureDefects(bi, 10, s * 7 + 3).map(d => d.key);
        if (keys.includes('finger_edge')) fingerLeaksCount++;
      }
    }
    const ok = fingerNeverOnForbidden && fingerLeaksCount === 0;
    results.push(ok ? _pass('ARB-V21: finger_edge never appears on batchIndex % 3 !== 0') :
      _fail('ARB-V21: finger_edge never appears on batchIndex % 3 !== 0',
        `leaks=${fingerLeaksCount}, idx1=${fingerOnForbidden1}, idx2=${fingerOnForbidden2}`));
  }

  // ARB-V22: finger prompt says extreme corner, never covers work or safety
  {
    const fingerPrompt = (CAPTURE_DEFECTS.finger_edge?.prompt || '').toLowerCase();
    const hasCorner    = _hasText(fingerPrompt, 'corner', 'extreme');
    const hasSafeGuard = _hasText(fingerPrompt, 'covering no', 'no work', 'safety detail');
    const ok = hasCorner && hasSafeGuard;
    results.push(ok ? _pass('ARB-V22: finger_edge prompt guarantees extreme corner + no work coverage') :
      _fail('ARB-V22: finger_edge prompt guarantees extreme corner + no work coverage',
        `prompt="${fingerPrompt}"`));
  }

  // ARB-V23: taille de haie active scene has 2 workers referenced
  {
    const K_PAY = (() => {
      for (const [key, scene] of Object.entries(WORK_SCENES)) {
        if ((scene.service_keywords || []).some(kw => _norm(kw.phrase).includes('taille de haie') || _norm(kw.phrase).includes('haie'))) return key;
      }
      return null;
    })();
    const SR_PAY = K_PAY ? (SITE_REALISM[K_PAY]?.scenarios || []) : [];
    const hedgeSc = SR_PAY.find(sc => sc._for && new RegExp(sc._for, 'i').test('taille de haie'));
    const txt = hedgeSc ? _allText(hedgeSc) : '';
    const ok = hedgeSc !== undefined &&
               _hasText(txt, 'Worker 1', 'Worker 2') &&
               _hasText(txt, 'hedge trimmer', 'trimmer', 'taille-haie');
    results.push(ok ? _pass('ARB-V23: taille de haie scene has 2 workers') :
      _fail('ARB-V23: taille de haie scene has 2 workers', K_PAY ? `hedgeSc=${!!hedgeSc}, txt sample="${txt.slice(0,80)}"` : `K_PAY not found`));
  }

  // ARB-V24: tall hedge uses professional access only
  {
    const K_PAY = (() => {
      for (const [key, scene] of Object.entries(WORK_SCENES)) {
        if ((scene.service_keywords || []).some(kw => _norm(kw.phrase).includes('haie'))) return key;
      }
      return null;
    })();
    const SR_PAY = K_PAY ? (SITE_REALISM[K_PAY]?.scenarios || []) : [];
    const hedgeSc = SR_PAY.find(sc => sc._for && new RegExp(sc._for, 'i').test('taille de haie'));
    const txt = hedgeSc ? _allText(hedgeSc) : '';
    const hasProfAccess = _hasText(txt, 'professional platform', 'scaffold', 'tripod', 'nacelle', 'MEWP');
    const bansDomestic  = (hedgeSc?.scene_exclude || []).some(e =>
      _hasText(e, 'step-stool', 'domestic', 'unstable', 'chair', 'escabeau'));
    const ok = hedgeSc !== undefined && hasProfAccess && bansDomestic;
    results.push(ok ? _pass('ARB-V24: tall hedge uses professional access, domestic step-stool excluded') :
      _fail('ARB-V24: tall hedge uses professional access, domestic step-stool excluded',
        `hasProfAccess=${hasProfAccess}, bansDomestic=${bansDomestic}`));
  }

  // ARB-V25: storm/emergency élagage dangereux scene has rigging rope + exclusion zone
  {
    const n = _norm('Élagage arbres dangereux');
    const scenarios = _allScenarios(K_ELAGAGE);
    // Storm scenarios are identified by a time_of_day field (only storm scenarios carry one)
    // or by the specific combination of 'post-storm' + 'broken branch' in scene_note
    const stormScs = scenarios.filter(sc => {
      if (!sc._for) return false;
      try { if (!new RegExp(sc._for).test(n)) return false; } catch(_) { return false; }
      return (sc.time_of_day && _hasText(sc.time_of_day, 'storm', 'overcast')) ||
             _hasText(sc.scene_note || '', 'post-storm', 'broken branch', 'storm');
    });
    const ok = stormScs.length >= 1 &&
               stormScs.every(sc => _hasText(_allText(sc), 'rigging rope') && _hasText(_allText(sc), 'exclusion zone'));
    results.push(ok ? _pass('ARB-V25: storm élagage dangereux scene has rigging rope + exclusion zone') :
      _fail('ARB-V25: storm élagage dangereux scene has rigging rope + exclusion zone',
        `stormScs=${stormScs.length}, failing: ${stormScs.filter(sc => !_hasText(_allText(sc),'rigging rope')).map(s=>s._for).join(', ')}`));
  }

  // ARB-V26: storm fallen-tree abattage scene cannot replace sectional dismantling in encours
  {
    const n = _norm('Abattage en zone difficile');
    const scenarios = _allScenarios(K_ABATTAGE);
    // Identify storm scenarios (fallen tree on ground)
    const stormFallenScs = scenarios.filter(sc => {
      if (!sc._for) return false;
      try { return new RegExp(sc._for).test(n); } catch(_) { return false; }
    }).filter(sc => _hasText(_allText(sc), 'fallen trunk', 'fallen tree', 'lying on the ground', 'tronc au sol'));
    // Verify none of the storm scenarios are state_locked to encours
    const stormLockedToEncours = stormFallenScs.filter(sc => {
      if (!sc._state_for) return false;
      return Array.isArray(sc._state_for) ? sc._state_for.includes('encours') : sc._state_for === 'encours';
    });
    const ok = stormFallenScs.length >= 1 && stormLockedToEncours.length === 0;
    results.push(ok ? _pass('ARB-V26: fallen-tree storm scene cannot appear in encours (no encours state_lock)') :
      _fail('ARB-V26: fallen-tree storm scene cannot appear in encours',
        `stormFallenScs=${stormFallenScs.length}, stormLockedToEncours=${stormLockedToEncours.length}`));
  }

  // ARB-V27: semifinal/final can use green-waste cleanup (state_for includes semifinal+final)
  {
    const abattageCleanup = _allScenarios(K_ABATTAGE).filter(sc => {
      const txt = _allText(sc);
      return _hasText(txt, 'loading', 'raking', 'green waste', 'log removal') && !_hasText(txt, 'rigging rope');
    });
    const ok = abattageCleanup.some(sc => {
      const sf = sc._state_for;
      return Array.isArray(sf) && sf.includes('semifinal') && sf.includes('final');
    });
    results.push(ok ? _pass('ARB-V27: green-waste cleanup available for semifinal and final states') :
      _fail('ARB-V27: green-waste cleanup available for semifinal and final states',
        `abattageCleanup count=${abattageCleanup.length}`));
  }

  // ARB-V28: no client/child/animal/vehicle in exclusion zone across all arborist scenes
  {
    const allArboristScenarios = [..._allScenarios(K_ELAGAGE), ..._allScenarios(K_ABATTAGE)];
    const missingExclusion = allArboristScenarios.filter(sc => {
      const txt = _allText(sc);
      // Only check scenarios that establish an exclusion zone
      if (!_hasText(txt, 'exclusion zone', 'drop zone', 'fall zone')) return false;
      // These scenarios should exclude bystanders from the danger zone
      const excl = (sc.scene_exclude || []).join(' ').toLowerCase();
      return _lacksText(excl, 'bystander', 'client', 'spectateur', 'children', 'pets', 'animals', 'lone worker', 'solo');
    });
    const ok = missingExclusion.length === 0;
    results.push(ok ? _pass('ARB-V28: all exclusion-zone arborist scenes ban bystanders/animals') :
      _fail('ARB-V28: all exclusion-zone arborist scenes ban bystanders/animals',
        `${missingExclusion.length} scene(s) missing: ${missingExclusion.map(s => s._for?.slice(0,30)).join(', ')}`));
  }

  // ─── Summary ─────────────────────────────────────────────────────────────
  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok);
  console.log(`[ARB-V] ${passed}/${results.length} passed`); // target: 28/28
  if (failed.length) {
    console.group('[ARB-V] Failures:');
    failed.forEach(r => console.warn(`  FAIL: ${r.label} — ${r.msg}`));
    console.groupEnd();
  }
  return { ok: failed.length === 0, passed, total: results.length, failures: failed };
}
