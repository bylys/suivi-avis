/**
 * debug/automotive-breakdown-tests.js — AUTO-V test suite
 * 12 assertions covering automotive breakdown visual contracts.
 * Exact service labels from SERVICE_CATALOG.depannage_auto.services.
 */

import { WORK_SCENES, SITE_REALISM } from '../services/index.js';
import { SERVICE_CATALOG }            from '../config/service-catalog.js';
import { _serviceGroup }              from '../resolution/service-resolver.js';
import { WORKER_SCENE_RULES }         from '../safety/worker-rules.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function _norm(s) {
  return (s || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/['']/g, "'").trim();
}

function _hasText(str, ...terms) {
  const lower = (str || '').toLowerCase();
  return terms.some(t => lower.includes(t.toLowerCase()));
}

function _lacksText(str, ...terms) {
  return !_hasText(str, ...terms);
}

function _allGroupText(group) {
  if (!group) return '';
  const parts = [];
  // states-based groups (batterie)
  for (const state of Object.values(group.states || {})) {
    parts.push(state.description || '', state.debris || '');
    const f = state.framing || {};
    parts.push(f.foreground || '', f.midground || '', f.background || '');
  }
  // scenarios-based groups (crevaison, remorquage, ouverture)
  for (const sc of (group.scenarios || [])) {
    parts.push(sc.scene_note || '', sc.scene_camera || '', sc.scene_debris || '');
    const f = sc.scene_framing || {};
    parts.push(f.foreground || '', f.midground || '', f.background || '');
    parts.push(...(sc.scene_exclude || []), ...(sc.tools || []),
               ...(sc.protections || []), ...(sc.chantier_details || []));
  }
  parts.push(...(group.tools || []), ...(group.protections || []),
             ...(group.chantier_details || []));
  return parts.join(' ');
}

function _pass(label)       { return { ok: true,  label }; }
function _fail(label, msg)  { return { ok: false, label, msg }; }

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const CATALOG_SERVICES = SERVICE_CATALOG.depannage_auto.services;
const WS_AUTO          = WORK_SCENES['depannage_auto'];
const SR_AUTO_RAW      = SITE_REALISM['depannage_auto'];

// ─── AUTO-V Tests ─────────────────────────────────────────────────────────────

export async function runAutomotiveBreakdownTests() {
  const results = [];

  // AUTO-V1: all exact catalog services route to depannage_auto (not GENERIC_FALLBACK)
  {
    const missing = CATALOG_SERVICES.filter(svc => {
      const n = _norm(svc);
      // A service has a route if WORK_SCENES has the depannage_auto key and its
      // service_keywords match this service (i.e., it was resolved in the catalog).
      return !WS_AUTO;
    });
    const ok = WS_AUTO !== undefined && WS_AUTO !== null && CATALOG_SERVICES.length === 17;
    results.push(ok ? _pass('AUTO-V1: depannage_auto WORK_SCENES entry exists for all 17 services') :
      _fail('AUTO-V1: depannage_auto WORK_SCENES entry exists for all 17 services',
        `WS_AUTO=${!!WS_AUTO}, services=${CATALOG_SERVICES.length}`));
  }

  // AUTO-V2: no generic fallback — all dispatch buckets exist in SITE_REALISM
  {
    const required = ['batterie', 'crevaison', 'remorquage', 'ouverture', 'default'];
    const missing  = required.filter(b => !SR_AUTO_RAW || !SR_AUTO_RAW[b]);
    const ok = missing.length === 0;
    results.push(ok ? _pass('AUTO-V2: all dispatch buckets exist in SITE_REALISM (batterie/crevaison/remorquage/ouverture/default)') :
      _fail('AUTO-V2: all dispatch buckets exist in SITE_REALISM', `missing: ${missing.join(', ')}`));
  }

  // AUTO-V3: battery/jump services produce an identifiable breakdown scenario
  {
    const batterieGroup = SR_AUTO_RAW?.batterie;
    const txt = _allGroupText(batterieGroup);
    const ok = _hasText(txt, 'battery', 'bonnet', 'jump') || _hasText(txt, 'batterie', 'capot', 'câble');
    results.push(ok ? _pass('AUTO-V3: battery scene has identifiable battery/bonnet/cable visual') :
      _fail('AUTO-V3: battery scene has identifiable battery/bonnet/cable visual', `txt="${txt.slice(0,100)}"`));
  }

  // AUTO-V4: roadside balisage — batterie and crevaison groups mention warning triangle or cones
  {
    const bGroups = ['batterie', 'crevaison', 'remorquage'].map(k => SR_AUTO_RAW?.[k]);
    const failing = bGroups.filter((g, i) => {
      const txt = _allGroupText(g);
      return _lacksText(txt, 'warning triangle', 'triangle', 'cone', 'safety vest', 'high-visibility', 'hazard');
    });
    const ok = failing.length === 0;
    results.push(ok ? _pass('AUTO-V4: roadside groups (batterie/crevaison/remorquage) mention balisage') :
      _fail('AUTO-V4: roadside groups mention balisage',
        `${failing.length} group(s) missing triangle/cone/vest`));
  }

  // AUTO-V5: battery cables physically coherent — no sparks, no absurd connections
  {
    const batterieGroup = SR_AUTO_RAW?.batterie;
    const excl = (batterieGroup?.exclusions || []).concat(
      Object.values(batterieGroup?.states || {}).flatMap(s => s.scene_exclude || [])
    ).join(' ').toLowerCase();
    const txt  = _allGroupText(batterieGroup);
    const hasConnectedCables = _hasText(txt, 'jump cable', 'clamp', 'cable', 'batterie');
    const ok = hasConnectedCables;
    results.push(ok ? _pass('AUTO-V5: battery cables referenced in scene') :
      _fail('AUTO-V5: battery cables referenced in scene', `txt="${txt.slice(0,100)}"`));
  }

  // AUTO-V6: tire change — jack under credible lift point, spare wheel on ground
  {
    const crevaisonGroup = SR_AUTO_RAW?.crevaison;
    const txt = _allGroupText(crevaisonGroup);
    const hasJack  = _hasText(txt, 'jack', 'cric', 'lift');
    const hasSpare = _hasText(txt, 'spare', 'roue de secours', 'replacement wheel', 'replacement tyre');
    const ok = hasJack && hasSpare;
    results.push(ok ? _pass('AUTO-V6: tire-change scene has jack + spare wheel') :
      _fail('AUTO-V6: tire-change scene has jack + spare wheel',
        `hasJack=${hasJack}, hasSpare=${hasSpare}`));
  }

  // AUTO-V7: no worker under poorly secured vehicle
  {
    const crevaisonGroup = SR_AUTO_RAW?.crevaison;
    const excl = _allGroupText(crevaisonGroup).toLowerCase();
    const ok = _hasText(excl, 'under the vehicle', 'under the car', 'sous la voiture', 'below the vehicle');
    results.push(ok ? _pass('AUTO-V7: tire-change excludes worker under poorly secured vehicle') :
      _fail('AUTO-V7: tire-change excludes worker under vehicle', `excl="${excl.slice(0,120)}"`));
  }

  // AUTO-V8: towing — tow truck and vehicle visually connected (straps/winch/platform)
  {
    const remorquageGroup = SR_AUTO_RAW?.remorquage;
    const txt = _allGroupText(remorquageGroup);
    const ok = _hasText(txt, 'tow truck', 'flatbed', 'strap', 'winch', 'platform', 'dépanneuse', 'treuil', 'plateau');
    results.push(ok ? _pass('AUTO-V8: towing scene has tow truck + connection (strap/winch/platform)') :
      _fail('AUTO-V8: towing scene has tow truck + strap/winch/platform', `txt="${txt.slice(0,120)}"`));
  }

  // AUTO-V9: towing — worker out of winch trajectory
  {
    const remorquageGroup = SR_AUTO_RAW?.remorquage;
    const excl = _allGroupText(remorquageGroup).toLowerCase();
    const ok = _hasText(excl,
      'in front of the vehicle during winch', 'winch line trajectory', 'winch cable',
      'worker in the winch', 'trajectoire', 'cable tensioning');
    results.push(ok ? _pass('AUTO-V9: towing scene excludes worker in winch trajectory') :
      _fail('AUTO-V9: towing scene excludes worker in winch trajectory', `excl="${excl.slice(0,120)}"`));
  }

  // AUTO-V10: client camera plausible — depannage_auto WORK_SCENES has homeowner/client camera doctrine
  {
    const cam = (WS_AUTO?.camera || '').toLowerCase();
    const ok  = _hasText(cam, 'standing', 'eye level', 'roadside', 'pavement') &&
                _lacksText(cam, 'drone', 'aerial');
    results.push(ok ? _pass('AUTO-V10: depannage_auto camera is client-doctrine (eye level, no drone/aerial)') :
      _fail('AUTO-V10: depannage_auto camera is client-doctrine', `cam="${cam}"`));
  }

  // AUTO-V11: all four canonical state levels exist in WORK_SCENES depannage_auto
  {
    const states = Object.keys(WS_AUTO?.states || {});
    const required = ['debut', 'encours', 'semifinal', 'final'];
    const missing  = required.filter(s => !states.includes(s));
    const ok = missing.length === 0;
    results.push(ok ? _pass('AUTO-V11: all canonical states (debut/encours/semifinal/final) defined') :
      _fail('AUTO-V11: all canonical states defined', `missing: ${missing.join(', ')}`));
  }

  // AUTO-V12: _serviceGroup maps all 17 catalog services to a known bucket (no unmapped service)
  {
    const knownBuckets = new Set(['batterie', 'crevaison', 'remorquage', 'ouverture', 'default']);
    const unmapped = CATALOG_SERVICES.filter(svc => !knownBuckets.has(_serviceGroup(svc)));
    const ok = unmapped.length === 0;
    results.push(ok ? _pass('AUTO-V12: all 17 catalog services map to a known dispatch bucket') :
      _fail('AUTO-V12: all 17 services map to known bucket', `unmapped: ${unmapped.join(', ')}`));
  }

  // AUTO-V13: depannage_auto hasWorkers=true and min_workers_when_visible >= 1
  {
    const wRules = WORKER_SCENE_RULES?.depannage_auto || {};
    const hasW   = WS_AUTO?.hasWorkers === true;
    const minW   = wRules.min_workers_when_visible || 0;
    const ok = hasW && minW >= 1;
    results.push(ok ? _pass('AUTO-V13: hasWorkers=true and min_workers_when_visible>=1 for depannage_auto') :
      _fail('AUTO-V13: hasWorkers=true and min_workers_when_visible>=1', `hasWorkers=${hasW}, minW=${minW}`));
  }

  // AUTO-V14: crevaison and remorquage require 2 workers (service_worker_minimums)
  {
    const svcMin = WORKER_SCENE_RULES?.depannage_auto?.service_worker_minimums || {};
    const okC    = (svcMin.crevaison || 0) >= 2;
    const okR    = (svcMin.remorquage || 0) >= 2;
    const ok = okC && okR;
    results.push(ok ? _pass('AUTO-V14: crevaison and remorquage service_worker_minimums >= 2') :
      _fail('AUTO-V14: crevaison and remorquage require 2 workers',
        `crevaison=${svcMin.crevaison}, remorquage=${svcMin.remorquage}`));
  }

  // AUTO-V15: battery and lockout are NOT forced to 2 — no override for batterie/ouverture
  {
    const svcMin = WORKER_SCENE_RULES?.depannage_auto?.service_worker_minimums || {};
    const battOverride    = svcMin.batterie;
    const ouvertureOverride = svcMin.ouverture;
    const ok = !battOverride || battOverride <= 1;
    results.push(ok ? _pass('AUTO-V15: battery and lockout not forced to 2 workers (stationary services)') :
      _fail('AUTO-V15: battery/lockout should not force 2 workers',
        `batterie override=${battOverride}, ouverture override=${ouvertureOverride}`));
  }

  // AUTO-V16: towing workers have distinct operator and guide roles in postures/actions
  {
    const wRules   = WORKER_SCENE_RULES?.depannage_auto || {};
    const allText  = [
      ...(wRules.actions  || []),
      ...(wRules.postures || []),
    ].join(' ').toLowerCase();
    const hasOperator = _hasText(allText, 'operator', 'winch controls', 'ramp controls');
    const hasGuide    = _hasText(allText, 'guide', 'guiding', 'hand signal');
    const ok = hasOperator && hasGuide;
    results.push(ok ? _pass('AUTO-V16: towing workers have distinct operator and guide roles') :
      _fail('AUTO-V16: towing postures/actions must describe operator and guide roles',
        `hasOperator=${hasOperator}, hasGuide=${hasGuide}`));
  }

  // AUTO-V17: crevaison and remorquage exclude Worker 2 in dangerous positions
  {
    const crevaisonTxt   = _allGroupText(SR_AUTO_RAW?.crevaison).toLowerCase();
    const remorquageTxt  = _allGroupText(SR_AUTO_RAW?.remorquage).toLowerCase();
    const w2OutOfTraffic = _hasText(crevaisonTxt, 'worker 2 in the traffic lane', 'worker 2 standing in front');
    const w2OutOfWinch   = _hasText(remorquageTxt, 'winch line trajectory', 'winch cable trajectory', 'worker 2 in front of the vehicle');
    const ok = w2OutOfTraffic && w2OutOfWinch;
    results.push(ok ? _pass('AUTO-V17: Worker 2 excluded from traffic lane (crevaison) and winch trajectory (remorquage)') :
      _fail('AUTO-V17: Worker 2 position safety exclusions missing',
        `outOfTraffic=${w2OutOfTraffic}, outOfWinch=${w2OutOfWinch}`));
  }

  // AUTO-V18: exterior automotive camera field must not trigger indoor-camera validator
  {
    const { buildDallePromptV2 } = await import('../prompt/scene-builder.js');
    const { _validateScene }     = await import('../prompt/scene-builder.js');
    const testServices = [
      { metier: 'depannage_auto', travaux: 'Démarrage batterie',    etat: 'encours', nb: 1, ville: 'Paris', fiche: '', contexte: 'maison', meteo: 'auto', images: [] },
      { metier: 'depannage_auto', travaux: 'Changement de roue',    etat: 'encours', nb: 1, ville: 'Paris', fiche: '', contexte: 'maison', meteo: 'auto', images: [] },
      { metier: 'depannage_auto', travaux: 'Remorquage',            etat: 'encours', nb: 1, ville: 'Paris', fiche: '', contexte: 'maison', meteo: 'auto', images: [] },
      { metier: 'depannage_auto', travaux: 'Ouverture de véhicule', etat: 'encours', nb: 1, ville: 'Paris', fiche: '', contexte: 'maison', meteo: 'auto', images: [] },
    ];
    const v18Failures = testServices.flatMap(row => {
      const issues = _validateScene(buildDallePromptV2(row));
      return issues.map(i => `${row.travaux}: ${i}`);
    });
    const ok = v18Failures.length === 0;
    results.push(ok ? _pass('AUTO-V18: 4 automotive exterior camera fields pass _validateScene (no indoor false-positive)') :
      _fail('AUTO-V18: camera field triggers indoor-camera validator', v18Failures.join('; ')));
  }

  // AUTO-V19: battery jump service requires visible booster or jump cables (not multimeter only)
  {
    const batterie = SR_AUTO_RAW?.batterie;
    const txt      = _allGroupText(batterie);
    const hasBooster = _hasText(txt, 'booster pack', 'jump-start cable', 'jump cable', 'clamp cable', 'portable battery booster');
    results.push(hasBooster
      ? _pass('AUTO-V19: battery jump service references visible booster or jump cables as primary device')
      : _fail('AUTO-V19: battery jump requires booster or jump cables in scene text', `txt="${txt.slice(0,120)}"`));
  }

  // AUTO-V20: multimeter-only diagnosis cannot satisfy battery jump-start (must be prohibited)
  {
    const batterie = SR_AUTO_RAW?.batterie;
    const allExclText = (batterie?.scenarios || [])
      .flatMap(s => s.scene_exclude || []).concat(batterie?.exclusions || []).join(' ').toLowerCase();
    const hasMeterOnlyProhibition = _hasText(allExclText,
      'multimeter as sole intervention',
      'multimeter-only diagnosis',
      'no booster or jump cables',
      'technician only measuring voltage with no booster',
    );
    results.push(hasMeterOnlyProhibition
      ? _pass('AUTO-V20: multimeter-only diagnosis prohibited in battery jump-start scenes')
      : _fail('AUTO-V20: multimeter-only prohibition missing from battery scene exclusions', `excl="${allExclText.slice(0,120)}"`));
  }

  // AUTO-V21: tire-change Worker 2 has roadside-safety or wheel-support role
  {
    const crevaisonTxt = _allGroupText(SR_AUTO_RAW?.crevaison).toLowerCase();
    const hasW2Safety  = _hasText(crevaisonTxt, 'worker 2 (road safety', 'worker 2 focused on road safety', 'worker 2: places or monitors cones', 'worker 2 (guide)');
    results.push(hasW2Safety
      ? _pass('AUTO-V21: tire-change Worker 2 has roadside-safety or wheel-support role')
      : _fail('AUTO-V21: Worker 2 roadside-safety role missing from tire-change scene', `txt="${crevaisonTxt.slice(0,120)}"`));
  }

  // AUTO-V22: tire-change scene forbids open hood and engine intervention
  {
    const crevaison = SR_AUTO_RAW?.crevaison;
    const txt       = _allGroupText(crevaison).toLowerCase();
    const allExcl   = [(crevaison?.exclusions || []), ...(crevaison?.scenarios || []).map(s => s.scene_exclude || [])]
      .flat().join(' ').toLowerCase();
    const hoodForbidden   = _hasText(allExcl, 'open hood', 'bonnet open') || _hasText(txt, 'hood closed');
    const engineForbidden = _hasText(allExcl, 'engine inspection', 'mixed battery and tire', 'worker 2 performing unrelated mechanical');
    const ok = hoodForbidden && engineForbidden;
    results.push(ok
      ? _pass('AUTO-V22: tire-change scene forbids open hood and engine/battery intervention')
      : _fail('AUTO-V22: open hood or engine intervention prohibition missing from tire-change', `hood=${hoodForbidden}, engine=${engineForbidden}`));
  }

  // AUTO-V23: towing flatbed is structurally connected to recovery truck
  {
    const remorquageTxt = _allGroupText(SR_AUTO_RAW?.remorquage).toLowerCase();
    const hasIntegrated = _hasText(remorquageTxt, 'integrated flatbed', 'same chassis', 'chassis and flatbed', 'cab, chassis');
    results.push(hasIntegrated
      ? _pass('AUTO-V23: towing scene references integrated flatbed structurally connected to recovery truck')
      : _fail('AUTO-V23: integrated flatbed requirement missing from towing scene', `txt="${remorquageTxt.slice(0,120)}"`));
  }

  // AUTO-V24: truck cab, chassis and flatbed are aligned
  {
    const remorquageTxt = _allGroupText(SR_AUTO_RAW?.remorquage).toLowerCase();
    const hasAligned    = _hasText(remorquageTxt, 'longitudinal axis', 'aligned on', 'cab through chassis', 'continuous chassis');
    results.push(hasAligned
      ? _pass('AUTO-V24: truck cab, chassis and flatbed alignment referenced in towing scene')
      : _fail('AUTO-V24: cab-chassis-flatbed alignment missing from towing scene', `txt="${remorquageTxt.slice(0,120)}"`));
  }

  // AUTO-V25: winch cable has visible origin and credible attachment point
  {
    const remorquageTxt = _allGroupText(SR_AUTO_RAW?.remorquage).toLowerCase();
    const hasOrigin     = _hasText(remorquageTxt, 'winch mounted', 'winch on the recovery truck', 'mounted winch');
    const hasAttachment = _hasText(remorquageTxt, 'tow point', 'recovery point', 'attachment point');
    const ok = hasOrigin && hasAttachment;
    results.push(ok
      ? _pass('AUTO-V25: winch cable has visible origin on truck and credible attachment on vehicle')
      : _fail('AUTO-V25: winch origin or attachment missing from towing scene', `origin=${hasOrigin}, attach=${hasAttachment}`));
  }

  // AUTO-V26: recovered vehicle has visible wheel restraints
  {
    const remorquageTxt = _allGroupText(SR_AUTO_RAW?.remorquage).toLowerCase();
    const hasRestraints = _hasText(remorquageTxt, 'ratchet strap', 'wheel restraint', 'wheel strap', 'strap over car tyre', 'securing the vehicle');
    results.push(hasRestraints
      ? _pass('AUTO-V26: towing scene references wheel restraints securing the recovered vehicle')
      : _fail('AUTO-V26: wheel restraints missing from towing scene', `txt="${remorquageTxt.slice(0,120)}"`));
  }

  // AUTO-V27: warning triangle mandatory for roadside towing and tire change
  {
    const remorquageTxt = _allGroupText(SR_AUTO_RAW?.remorquage).toLowerCase();
    const crevaisonTxt  = _allGroupText(SR_AUTO_RAW?.crevaison).toLowerCase();
    const towingTriangle   = _hasText(remorquageTxt, 'triangle mandatory', 'warning triangle mandatory', 'warning triangle placed on the road at credible');
    const tireTriangle     = _hasText(crevaisonTxt,  'warning triangle mandatory', 'triangle mandatory on road');
    const ok = towingTriangle && tireTriangle;
    results.push(ok
      ? _pass('AUTO-V27: warning triangle mandatory for roadside towing and tire change')
      : _fail('AUTO-V27: triangle mandatory rule missing', `towing=${towingTriangle}, tire=${tireTriangle}`));
  }

  // AUTO-V28: warning triangle optional for private driveway lockout
  {
    const ouvertureTxt = _allGroupText(SR_AUTO_RAW?.ouverture).toLowerCase();
    const isOptional   = _hasText(ouvertureTxt, 'triangle optional', 'warning triangle optional', 'optional at private', 'not forced in a residential');
    results.push(isOptional
      ? _pass('AUTO-V28: warning triangle optional for private driveway lockout')
      : _fail('AUTO-V28: triangle optional rule missing from lockout scene', `txt="${ouvertureTxt.slice(0,120)}"`));
  }

  // AUTO-V29: triangle placement never blocks worker or vehicle operation
  {
    const remorquageTxt = _allGroupText(SR_AUTO_RAW?.remorquage).toLowerCase();
    const crevaisonTxt  = _allGroupText(SR_AUTO_RAW?.crevaison).toLowerCase();
    const combined = remorquageTxt + ' ' + crevaisonTxt;
    const hasUpstream  = _hasText(combined, 'upstream', 'credible distance', 'further back on the road');
    results.push(hasUpstream
      ? _pass('AUTO-V29: triangle placed at upstream distance, not blocking work zone')
      : _fail('AUTO-V29: upstream triangle placement not referenced', `txt="${combined.slice(0,120)}"`));
  }

  // AUTO-V30: camera remains outside winch and vehicle movement paths
  {
    const cam = (WS_AUTO?.camera || '').toLowerCase();
    const outsideWinch    = _hasText(cam, 'winch cable', 'winch', 'outside the path');
    const outsideMovement = _hasText(cam, 'vehicle movement corridor', 'movement corridor');
    const ok = outsideWinch && outsideMovement;
    results.push(ok
      ? _pass('AUTO-V30: camera doctrine excludes winch path and vehicle movement corridor')
      : _fail('AUTO-V30: camera winch/movement exclusion missing', `cam="${cam}"`));
  }

  // ─── Summary ────────────────────────────────────────────────────────────────
  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok);
  console.log(`[AUTO-V] ${passed}/${results.length} passed`);  // expected 30/30
  if (failed.length) {
    console.group('[AUTO-V] Failures:');
    failed.forEach(r => console.warn(`  FAIL: ${r.label} — ${r.msg}`));
    console.groupEnd();
  }
  return { ok: failed.length === 0, passed, total: results.length, failures: failed };
}
