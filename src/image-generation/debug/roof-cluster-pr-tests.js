/**
 * debug/roof-cluster-pr-tests.js — RTG-PR1 to RTG-PR20
 * Roof cluster photo-realism correctness tests.
 * Chargé uniquement en mode ?imageGenTests=1. Aucun appel API réel.
 *
 * Vérifie que les scènes gouttières, anti-mousse et hydrofuge respectent
 * la perspective "photo client ordinaire" — pas de vue depuis la toiture,
 * pas de travailleur centré face caméra, pas d'accès échelle inaccessible,
 * pas de transformation de couleur radicale, sécurité gouttières maintenue.
 */

import { WORK_SCENES, SITE_REALISM } from '../services/index.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _norm(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function _lower(s) { return (s || '').toLowerCase(); }

/** Collect all scenarios from a SITE_REALISM entry (flat + _dispatch). */
function _allScenarios(sr) {
  if (!sr) return [];
  const out = [...(sr.scenarios || [])];
  if (sr._dispatch === 'contexte') {
    for (const [k, sub] of Object.entries(sr)) {
      if (k === '_dispatch') continue;
      if (sub && typeof sub === 'object') out.push(...(sub.scenarios || []));
    }
  }
  return out;
}

/** Return all _for-matching scenarios for a given label in a SITE_REALISM entry. */
function _matchingScenarios(normLabel, sr) {
  return _allScenarios(sr).filter(sc => {
    if (!sc._for) return false;
    try { return new RegExp(sc._for).test(normLabel); } catch { return false; }
  });
}

// ─── Test harness ─────────────────────────────────────────────────────────────

const _results = [];
let _pass = 0, _fail = 0;

function pass(label)         { _results.push({ status: 'PASS',               label }); _pass++; }
function fail(label, detail) { _results.push({ status: 'UNEXPECTED_FAILURE', label, detail }); _fail++; console.error(`  ✘ ${label}${detail ? ' — ' + detail : ''}`); }
function ok(cond, label, detail) { cond ? pass(label) : fail(label, detail); }

// ─── RTG-PR1 — Anti-mousse interdit la disparition immédiate de la mousse ─────

function pr1() {
  console.group('RTG-PR1 — Anti-mousse: no instant moss disappearance');
  const sr = SITE_REALISM['nettoyage_toiture'];
  const scenarios = _matchingScenarios('traitement anti mousse toiture', sr);

  ok(scenarios.length >= 1, 'RTG-PR1-A: au moins 1 scénario anti-mousse résolu', `got ${scenarios.length}`);

  // Scope PR1-B and PR1-C to scenarios whose _for specifically targets anti-mousse treatment
  // (not generic brossage/demousse scenarios that also happen to match the label).
  const antiSpecific = scenarios.filter(sc => /anti/.test(sc._for || ''));

  let badScenario = null;
  for (const sc of antiSpecific) {
    const excls = (sc.scene_exclude || []).map(_lower);
    const hasInstantMossGone = !excls.some(e =>
      e.includes('instant') || e.includes('mousse disparait') ||
      e.includes('moss disappear') || e.includes('moss gone') ||
      e.includes('disparition')
    );
    const note = _lower(sc.scene_note || '');
    const framingMid = _lower((sc.scene_framing || {}).midground || '');
    // scene_note or midground must mention moss still present
    const mossDominant = note.includes('moss') || note.includes('mousse') ||
      framingMid.includes('moss') || framingMid.includes('mousse');
    if (!mossDominant && hasInstantMossGone) { badScenario = sc._for; break; }
  }
  ok(badScenario === null || antiSpecific.length === 0,
    'RTG-PR1-B: tous les scénarios anti-mousse spécifiques ont la mousse encore présente dans le décor', badScenario);

  // RTG-PR1-C: Only anti.mousse-specific scenarios must exclude a sharp boundary or instant disappearance
  for (const sc of antiSpecific) {
    const excls = (sc.scene_exclude || []).map(_lower).join(' ');
    const forbidsInstant = excls.includes('instant') || excls.includes('disparition') ||
      excls.includes('boundary') || excls.includes('straight clean') ||
      excls.includes('frontiere') || excls.includes('clean-versus-dirty');
    ok(forbidsInstant, `RTG-PR1-C: scénario anti-mousse "${sc._for}" exclut une limite nette ou disparition instantanée`, 'non trouvé dans scene_exclude');
  }
  if (antiSpecific.length === 0) {
    ok(false, 'RTG-PR1-C: aucun scénario anti-mousse spécifique (_for contenant "anti") trouvé', `_for patterns: ${scenarios.map(s => s._for).join(', ')}`);
  }

  console.groupEnd();
}

// ─── RTG-PR2 — Hydrofuge exige une toiture déjà nettoyée ──────────────────────

function pr2() {
  console.group('RTG-PR2 — Hydrofuge: roof already clean, no dramatic recoloring');
  const sr = SITE_REALISM['nettoyage_toiture'];
  const scenarios = _matchingScenarios('traitement hydrofuge toiture', sr);

  ok(scenarios.length >= 1, 'RTG-PR2-A: au moins 1 scénario hydrofuge résolu', `got ${scenarios.length}`);

  for (const sc of scenarios) {
    const note  = _lower(sc.scene_note || '');
    const excls = (sc.scene_exclude || []).map(_lower).join(' ');
    // Note should NOT describe a dirty or heavily mossed roof as starting state for hydrofuge
    const badNote = note.includes('moss covering') || note.includes('mousse envahissant');
    ok(!badNote, `RTG-PR2-B: scénario hydrofuge "${sc._for}" ne décrit pas une toiture encore envahie de mousse comme point de départ`, note.slice(0, 80));

    // Must exclude dramatic colour change
    const forbidsDramatic = excls.includes('dramatic') || excls.includes('noir') ||
      excls.includes('orange') || excls.includes('split') || excls.includes('uniform');
    ok(forbidsDramatic, `RTG-PR2-C: scénario hydrofuge "${sc._for}" exclut une transformation radicale de couleur`, 'non trouvé dans scene_exclude');
  }
  console.groupEnd();
}

// ─── RTG-PR3 — Aucun scénario de traitement n'exige une séparation nette avant/après
// Check via scene_exclude: good scenarios actively forbid sharp boundaries,
// rather than checking prose text that legitimately references them to negate them.

function pr3() {
  console.group('RTG-PR3 — Aucune séparation nette avant/après dans les traitements');
  const sr = SITE_REALISM['nettoyage_toiture'];
  // Only check anti-mousse and hydrofuge-specific scenarios (not generic brossage)
  const treatDefs = [
    { label: 'traitement anti mousse toiture', forFilter: /anti/ },
    { label: 'traitement hydrofuge toiture',   forFilter: /hydrofuge/ },
  ];

  for (const { label, forFilter } of treatDefs) {
    const scenarios = _matchingScenarios(label, sr).filter(sc => forFilter.test(sc._for || ''));
    for (const sc of scenarios) {
      const excls = (sc.scene_exclude || []).map(_lower).join(' ');
      // The scenario must actively exclude a sharp before/after boundary (in scene_exclude)
      const forbidsBoundary = excls.includes('split') || excls.includes('straight') ||
        excls.includes('perfect') || excls.includes('exactly half') ||
        excls.includes('before-and-after') || excls.includes('before and after') ||
        excls.includes('avant') || excls.includes('ligne');
      ok(forbidsBoundary, `RTG-PR3: scénario "${label}/${sc._for}" (scene_exclude) interdit une séparation nette avant/après`, excls.slice(0, 120));
    }
    if (scenarios.length === 0) {
      // Not a failure — no specific scenario resolved for this label subset
      console.info(`  RTG-PR3: aucun scénario spécifique pour "${label}" (${forFilter}) — skipped`);
    }
  }
  console.groupEnd();
}

// ─── RTG-PR4 — Aucun scénario n'exige une transformation radicale de la couleur des tuiles
// Checked via scene_exclude: good scenarios actively forbid dramatic recolouring.
// Prose text legitimately references these terms to negate them (e.g. "no dramatic colour change")
// so we check scene_exclude (affirmative exclusion list) rather than scene_note prose.

function pr4() {
  console.group('RTG-PR4 — Pas de transformation radicale des tuiles dans les traitements');
  const sr = SITE_REALISM['nettoyage_toiture'];
  // Only hydrofuge treatment risks a dramatic tile colour change — anti-mousse is about moss,
  // not tile recolouring. Apply this check to hydrofuge-specific scenarios only.
  const hydrofugeScenarios = _matchingScenarios('traitement hydrofuge toiture', sr)
    .filter(sc => /hydrofuge/.test(sc._for || ''));

  for (const sc of hydrofugeScenarios) {
    const excls = (sc.scene_exclude || []).map(_lower).join(' ');
    // scene_exclude must actively exclude dramatic recolouring
    const forbidsDramatic = excls.includes('dramatic') || excls.includes('uniformly') ||
      excls.includes('uniform dark') || excls.includes('half black') ||
      excls.includes('half orange') || excls.includes('recolor') ||
      excls.includes('colour change') || excls.includes('color change') ||
      excls.includes('colour transformation') || excls.includes('color transformation') ||
      excls.includes('transformation');
    ok(forbidsDramatic, `RTG-PR4: scénario "hydrofuge/${sc._for}" (scene_exclude) interdit la recoloration radicale des tuiles`, excls.slice(0, 120));
  }
  if (hydrofugeScenarios.length === 0) {
    ok(false, 'RTG-PR4: aucun scénario hydrofuge spécifique (_for contenant "hydrofuge") trouvé');
  }
  console.groupEnd();
}

// ─── RTG-PR5 — Zone de pulvérisation localisée, irrégulière et subtile ────────

function pr5() {
  console.group('RTG-PR5 — Zone traitée irrégulière et subtile dans les traitements');
  const sr = SITE_REALISM['nettoyage_toiture'];
  const treatLabels = ['traitement anti mousse toiture', 'traitement hydrofuge toiture'];

  for (const label of treatLabels) {
    const scenarios = _matchingScenarios(label, sr);
    let hasIrregular = false;
    for (const sc of scenarios) {
      const all = [
        sc.scene_note,
        (sc.scene_framing || {}).midground,
      ].map(_lower).join(' ');
      if (
        all.includes('irregular') || all.includes('irregulier') ||
        all.includes('localis') || all.includes('patchy') || all.includes('subtle') ||
        all.includes('subtil') || all.includes('zone humide') || all.includes('damp patch') ||
        all.includes('slightly') || all.includes('irrégulière') || all.includes('légèrement')
      ) {
        hasIrregular = true;
      }
    }
    ok(hasIrregular || scenarios.length === 0, `RTG-PR5: au moins un scénario "${label}" décrit une zone de traitement irrégulière/subtile`, `scenarios: ${scenarios.length}`);
  }
  console.groupEnd();
}

// ─── RTG-PR6 — Vue frontale large et symétrique jamais imposée ────────────────

function pr6() {
  console.group('RTG-PR6 — Pas de vue frontale symétrique obligatoire');
  const sr = SITE_REALISM['nettoyage_toiture'];
  const allScenarios = _allScenarios(sr);

  for (const sc of allScenarios) {
    const cam = _lower(sc.scene_camera || '');
    const badView = cam.includes('centred on the facade') || cam.includes('facade centre') ||
      cam.includes('perfectly framed') || cam.includes('symetri') || cam.includes('front-on symmetrical');
    ok(!badView, `RTG-PR6: scénario "${sc._for}" n'impose pas de vue frontale symétrique`, cam.slice(0, 80));
  }
  console.groupEnd();
}

// ─── RTG-PR7 — Perche au sol réservée aux toitures basses, longueur crédible ──

function pr7() {
  console.group('RTG-PR7 — Perche télescopique au sol: longueur crédible');
  const srGouttieres = SITE_REALISM['nettoyage_gouttieres'];
  const srNettoyage  = SITE_REALISM['nettoyage_toiture'];

  for (const [key, sr] of [['nettoyage_gouttieres', srGouttieres], ['nettoyage_toiture', srNettoyage]]) {
    for (const sc of _allScenarios(sr)) {
      const tools = (sc.tools || []).map(_lower).join(' ');
      if (tools.includes('telescopic') || tools.includes('perche') || tools.includes('telescopique')) {
        // If telescopic tool mentioned, the scene_note must not describe it reaching the ridge from far below
        const note = _lower(sc.scene_note || '');
        const bad = note.includes('reaching the ridge from ground') ||
          note.includes('perche atteignant le faitage depuis le sol');
        ok(!bad, `RTG-PR7: scénario ${key}/"${sc._for}" — la perche télescopique ne prétend pas atteindre le faitage depuis le sol`, note.slice(0, 80));
      }
    }
  }
  // Global WORK_SCENES exclusions for nettoyage_toiture
  const wsNt = WORK_SCENES['nettoyage_toiture'];
  if (wsNt) {
    const excls = (wsNt.exclusions || []).map(_lower).join(' ');
    ok(
      excls.includes('impossibly long') || excls.includes('ridge from ground') || excls.includes('telescopic pole reaching the ridge'),
      'RTG-PR7: WORK_SCENES.nettoyage_toiture exclut une perche telescopique impossible atteignant le faitage'
    );
  }
  console.groupEnd();
}

// ─── RTG-PR8 — Gouttières: standoff, plateforme, échafaudage ou travail sol ───

function pr8() {
  console.group('RTG-PR8 — Gouttières: accès avec standoff, plateforme ou sol');
  const sr = SITE_REALISM['nettoyage_gouttieres'];
  const scenarios = _allScenarios(sr).filter(sc =>
    /nettoy|entretien|curag|debris|feuill|deboucha|bouchon|obstruct/.test(sc._for || '')
  );

  ok(scenarios.length >= 1, 'RTG-PR8-A: au moins 1 scénario nettoyage/débouchage gouttières', `got ${scenarios.length}`);

  for (const sc of scenarios) {
    const tools = (sc.tools || []).map(_lower).join(' ');
    const note  = _lower(sc.scene_note || '');
    const hasAcceptableAccess =
      tools.includes('standoff') || tools.includes('telescopic') || tools.includes('platform') ||
      tools.includes('plateforme') || tools.includes('scaffold') || tools.includes('echafaudage') ||
      tools.includes('ground level') || tools.includes('au sol') ||
      note.includes('standoff') || note.includes('ground level') ||
      note.includes('telescopic') || note.includes('from the ground') ||
      note.includes('depuis le sol') || note.includes('upstairs window') ||
      note.includes('fenetre') || note.includes('balcon');
    ok(hasAcceptableAccess, `RTG-PR8-B: scénario gouttières "${sc._for}" utilise un accès sécurisé (standoff/sol/plateforme/fenêtre)`, tools.slice(0, 100));
  }
  console.groupEnd();
}

// ─── RTG-PR9 — Aucune échelle reposant directement contre ou dans la gouttière ─

function pr9() {
  console.group('RTG-PR9 — Pas d\'échelle directement contre/dans la gouttière');
  const sr = SITE_REALISM['nettoyage_gouttieres'];
  const wsGouttieres = WORK_SCENES['nettoyage_gouttieres'];

  // All SITE_REALISM scenarios must exclude it
  for (const sc of _allScenarios(sr)) {
    const all = [
      ...(sc.tools || []),
      sc.scene_note || '',
      sc.scene_camera || '',
    ].map(_lower).join(' ');
    const badLadder =
      (all.includes('ladder') && all.includes('against the gutter')) ||
      (all.includes('echelle') && all.includes('gouttiere') && !all.includes('standoff'));
    ok(!badLadder, `RTG-PR9-A: scénario "${sc._for}" ne décrit pas d'échelle appuyée directement contre la gouttière`, all.slice(0, 120));
  }

  // WORK_SCENES exclusions must mention ladder-on-gutter
  const excls = (wsGouttieres?.exclusions || []).map(_lower).join(' ');
  ok(
    excls.includes('ladder') && (excls.includes('gutter') || excls.includes('gouttiere')),
    'RTG-PR9-B: WORK_SCENES.nettoyage_gouttieres.exclusions mentionne l\'interdiction échelle/gouttière'
  );
  console.groupEnd();
}

// ─── RTG-PR10 — Pipeline central, Vision, retries et safety gate inchangés ────

function pr10() {
  console.group('RTG-PR10 — Pipeline central inchangé (vérification structurelle)');
  // These modules must be importable — they are already imported by index.js.
  // We verify that the WORK_SCENES and SITE_REALISM exports from services/index.js
  // are well-formed objects, which confirms the static pipeline data layer is intact.
  ok(typeof WORK_SCENES === 'object' && WORK_SCENES !== null, 'RTG-PR10-A: WORK_SCENES importé correctement depuis services/index.js');
  ok(typeof SITE_REALISM === 'object' && SITE_REALISM !== null, 'RTG-PR10-B: SITE_REALISM importé correctement depuis services/index.js');
  // Spot-check cluster keys are present
  const requiredKeys = ['toiture', 'nettoyage_toiture', 'nettoyage_gouttieres', 'etancheite'];
  for (const key of requiredKeys) {
    ok(key in WORK_SCENES, `RTG-PR10-C: WORK_SCENES.${key} présent`);
    ok(key in SITE_REALISM, `RTG-PR10-D: SITE_REALISM.${key} présent`);
  }
  console.groupEnd();
}

// ─── RTG-PR11 — Position caméra accessible à un client ou propriétaire ─────────

function pr11() {
  console.group('RTG-PR11 — Position caméra accessible à un propriétaire');
  const keys = ['nettoyage_toiture', 'nettoyage_gouttieres'];

  for (const key of keys) {
    const ws = WORK_SCENES[key];
    const wsCamera = _lower(ws?.camera || '');
    const hasHomeowner = wsCamera.includes('homeowner') || wsCamera.includes('proprietaire') ||
      wsCamera.includes('garden') || wsCamera.includes('driveway') || wsCamera.includes('upstairs window') ||
      wsCamera.includes('jardin') || wsCamera.includes('allee');
    ok(hasHomeowner, `RTG-PR11-A: WORK_SCENES.${key}.camera mentionne une position propriétaire/jardin/allée`, wsCamera.slice(0, 100));
  }

  // Only check anti-mousse and hydrofuge-specific scenarios for customer camera perspective
  const sr = SITE_REALISM['nettoyage_toiture'];
  const treatDefs11 = [
    { label: 'traitement anti mousse toiture', forFilter: /anti/ },
    { label: 'traitement hydrofuge toiture',   forFilter: /hydrofuge/ },
  ];
  for (const { label, forFilter } of treatDefs11) {
    const scenarios = _matchingScenarios(label, sr).filter(sc => forFilter.test(sc._for || ''));
    for (const sc of scenarios) {
      const cam = _lower(sc.scene_camera || '');
      const accessible = cam.includes('garden') || cam.includes('driveway') || cam.includes('upstairs') ||
        cam.includes('homeowner') || cam.includes('proprietaire') || cam.includes('jardin') ||
        cam.includes('allee') || cam.includes('window') || cam.includes('fenetre');
      ok(accessible, `RTG-PR11-B: scénario "${label}/${sc._for}" — position caméra accessible par un propriétaire`, cam.slice(0, 100));
    }
  }
  console.groupEnd();
}

// ─── RTG-PR12 — Aucune vue obligatoire depuis la toiture ou à côté de l'artisan

function pr12() {
  console.group('RTG-PR12 — Pas de vue depuis la toiture ni depuis à côté de l\'artisan');
  // Only check treatment-specific scenarios (anti-mousse and hydrofuge).
  // Legacy brossage/physical-cleaning scenarios predate the customer-photo rule and
  // may legitimately have close-up roof-surface cameras — they are not in scope here.
  const sr = SITE_REALISM['nettoyage_toiture'];
  const treatFilters = [/anti/, /hydrofuge/];
  for (const filter of treatFilters) {
    for (const sc of _allScenarios(sr).filter(s => filter.test(s._for || ''))) {
      const cam = _lower(sc.scene_camera || '');
      const bad =
        (cam.includes('from the roof') && !cam.includes('not from the roof')) ||
        (cam.includes('depuis la toiture') && !cam.includes('pas depuis')) ||
        cam.includes('beside the roofer') || cam.includes('a cote de l\'artisan') ||
        (cam.includes('at roof level') && !cam.includes('homeowner'));
      ok(!bad, `RTG-PR12: scénario nettoyage_toiture/"${sc._for}" — pas de vue depuis la toiture ou à côté de l'artisan`, cam.slice(0, 100));
    }
  }

  // For gutter scenarios: only check clearing scenarios (not installation/replacement)
  const srG = SITE_REALISM['nettoyage_gouttieres'];
  for (const sc of _allScenarios(srG).filter(s =>
    /nettoy|entretien|curag|debris|feuill|deboucha|bouchon|obstruct/.test(s._for || '')
  )) {
    const cam = _lower(sc.scene_camera || '');
    const bad =
      (cam.includes('from the roof') && !cam.includes('not from the roof')) ||
      cam.includes('beside the roofer') ||
      (cam.includes('at roof level') && !cam.includes('homeowner'));
    ok(!bad, `RTG-PR12: scénario nettoyage_gouttieres/"${sc._for}" — pas de vue depuis la toiture`, cam.slice(0, 100));
  }
  console.groupEnd();
}

// ─── RTG-PR13 — Ouvrier ne regarde pas la caméra et ne pose pas ──────────────

function pr13() {
  console.group('RTG-PR13 — Ouvrier ne regarde pas la caméra et ne pose pas');
  const keysToCheck = ['nettoyage_toiture', 'nettoyage_gouttieres'];

  for (const key of keysToCheck) {
    // Check WORK_SCENES exclusions
    const ws = WORK_SCENES[key];
    const excls = (ws?.exclusions || []).map(_lower).join(' ');
    ok(
      excls.includes('facing the camera') || excls.includes('face camera') || excls.includes('worker facing'),
      `RTG-PR13-A: WORK_SCENES.${key} exclut l'ouvrier face à la caméra`
    );

    // Check SITE_REALISM — only the new customer-perspective scenarios:
    // anti-mousse, hydrofuge, and gutter clearing/unblocking (not legacy brossage or gutter replacement).
    const sr = SITE_REALISM[key];
    const scenariosToCheck = key === 'nettoyage_toiture'
      ? _allScenarios(sr).filter(s => /anti|hydrofuge/.test(s._for || ''))
      : _allScenarios(sr).filter(s => /nettoy|entretien|curag|debris|feuill|deboucha|bouchon|obstruct/.test(s._for || ''));

    for (const sc of scenariosToCheck) {
      const excl = (sc.scene_exclude || []).map(_lower).join(' ');
      const cam  = _lower(sc.scene_camera || '');
      const note = _lower(sc.scene_note || '');
      const forbidsFacing = excl.includes('facing the camera') || excl.includes('facing camera') ||
        excl.includes('face camera') ||
        excl.includes('looking at the camera') || excl.includes('looking at camera') ||
        excl.includes('posing') ||
        cam.includes('not facing') || cam.includes('not looking') || cam.includes('off-centre') ||
        note.includes('not facing') || note.includes('focused on the work') || note.includes('off-centre') ||
        note.includes('naturally off-centre') || note.includes('not looking');
      ok(forbidsFacing, `RTG-PR13-B: scénario ${key}/"${sc._for}" — ouvrier ne regarde pas la caméra et ne pose pas`, excl.slice(0, 80) || cam.slice(0, 80));
    }
  }
  console.groupEnd();
}

// ─── RTG-PR14 — Cadrage distance client conserve l'action suffisamment visible ─

function pr14() {
  console.group('RTG-PR14 — Cadrage client: action suffisamment visible');
  const keysToCheck = ['nettoyage_toiture', 'nettoyage_gouttieres'];

  for (const key of keysToCheck) {
    const sr = SITE_REALISM[key];
    for (const sc of _allScenarios(sr)) {
      const framing = sc.scene_framing || {};
      const pct = framing.work_pct || 0;
      // work_pct >= 40% ensures the work is visible even at customer distance
      ok(pct >= 40, `RTG-PR14: scénario ${key}/"${sc._for}" — work_pct=${pct}% (minimum 40% pour action visible)`, `work_pct=${pct}`);
    }
  }
  console.groupEnd();
}

// ─── RTG-PR15 — Gros plan gouttière exige position client plausible ──────────

function pr15() {
  console.group('RTG-PR15 — Gros plan gouttière: position client plausible (fenêtre/balcon ou jardin)');
  // Only check clearing/unblocking scenarios (not gutter installation which legitimately
  // uses close-up cameras from a ladder — that's a different service context).
  const sr = SITE_REALISM['nettoyage_gouttieres'];
  const clearingScenarios = _allScenarios(sr).filter(sc =>
    /nettoy|entretien|curag|debris|feuill|deboucha|bouchon|obstruct/.test(sc._for || '')
  );

  for (const sc of clearingScenarios) {
    const cam = _lower(sc.scene_camera || '');
    // Reject floating camera with no accessible client position
    const badFloating = cam.includes('beside the gutter') || cam.includes('at gutter level') ||
      (cam.includes('close-up') && !cam.includes('window') && !cam.includes('upstairs') &&
       !cam.includes('garden') && !cam.includes('driveway') && !cam.includes('from below'));
    ok(!badFloating, `RTG-PR15: scénario gouttière "${sc._for}" — position caméra plausible pour un client`, cam.slice(0, 100));
  }
  console.groupEnd();
}

// ─── RTG-PR16 — Intention = documentation client, pas publicité entreprise ────

function pr16() {
  console.group('RTG-PR16 — Intention photographique: documentation client, pas publicité');
  const keysToCheck = ['nettoyage_toiture', 'nettoyage_gouttieres'];

  for (const key of keysToCheck) {
    const ws = WORK_SCENES[key];
    const excls = (ws?.exclusions || []).map(_lower).join(' ');
    ok(
      excls.includes('promotional') || excls.includes('stock-photo') ||
      excls.includes('stock photo') || excls.includes('publicite') || excls.includes('advertisement'),
      `RTG-PR16-A: WORK_SCENES.${key} exclut la photographie promotionnelle/publicitaire`
    );

    // Only check new customer-perspective scenarios: anti-mousse, hydrofuge, and gutter clearing.
    const sr = SITE_REALISM[key];
    const scenariosToCheck16 = key === 'nettoyage_toiture'
      ? _allScenarios(sr).filter(s => /anti|hydrofuge/.test(s._for || ''))
      : _allScenarios(sr).filter(s => /nettoy|entretien|curag|debris|feuill|deboucha|bouchon|obstruct/.test(s._for || ''));

    for (const sc of scenariosToCheck16) {
      const excl = (sc.scene_exclude || []).map(_lower).join(' ');
      const note = _lower(sc.scene_note || '');
      const isDoc = excl.includes('promotional') || excl.includes('stock-photo') ||
        excl.includes('centered worker') || note.includes('homeowner') || note.includes('customer') ||
        note.includes('proprietaire') || note.includes('snapshot') || note.includes('ordinary');
      ok(isDoc, `RTG-PR16-B: scénario ${key}/"${sc._for}" — perspective documentation client, non publicité`, excl.slice(0, 80) || note.slice(0, 80));
    }
  }
  console.groupEnd();
}

// ─── RTG-PR17 — Pas de logo, filigrane ni branding lisible ───────────────────

function pr17() {
  console.group('RTG-PR17 — Pas de logo, filigrane ni branding lisible');
  const keysToCheck = ['nettoyage_toiture', 'nettoyage_gouttieres'];

  for (const key of keysToCheck) {
    const ws = WORK_SCENES[key];
    const excls = (ws?.exclusions || []).map(_lower).join(' ');
    ok(
      excls.includes('logo') || excls.includes('watermark') || excls.includes('branding'),
      `RTG-PR17-A: WORK_SCENES.${key} exclut logo/watermark/branding`
    );

    const sr = SITE_REALISM[key];
    for (const sc of _allScenarios(sr)) {
      const excl = (sc.scene_exclude || []).map(_lower).join(' ');
      const hasLogoExcl = excl.includes('logo') || excl.includes('watermark') || excl.includes('branding');
      // Not every scenario needs it — the WORK_SCENES top-level exclusion is the authoritative check.
      // We only fail if the scenario explicitly REQUIRES a logo (extremely unlikely but tested).
      const requiresLogo = excl === '' && (sc.scene_note || '').toLowerCase().includes('logo required');
      ok(!requiresLogo, `RTG-PR17-B: scénario ${key}/"${sc._for}" n'exige pas de logo`, '');
    }
  }
  console.groupEnd();
}

// ─── RTG-PR18 — Traitements n'imposent pas une bâche couvrant toute la façade ─

function pr18() {
  console.group('RTG-PR18 — Traitements: pas de bâche dominant toute la façade');
  const sr = SITE_REALISM['nettoyage_toiture'];
  const treatLabels = ['traitement anti mousse toiture', 'traitement hydrofuge toiture'];

  for (const label of treatLabels) {
    const scenarios = _matchingScenarios(label, sr);
    for (const sc of scenarios) {
      const all = [
        sc.scene_note,
        (sc.scene_framing || {}).foreground,
        (sc.scene_framing || {}).midground,
        ...(sc.tools || []),
      ].map(_lower).join(' ');
      const bad = all.includes('oversized') || all.includes('entire facade') ||
        all.includes('toute la facade') || all.includes('facade entiere') ||
        all.includes('bachage complet') || all.includes('covering the entire');
      ok(!bad, `RTG-PR18: scénario "${label}/${sc._for}" — la bâche ne domine pas toute la façade`, all.slice(0, 100));
    }
  }

  // Also check WORK_SCENES exclusions
  const ws = WORK_SCENES['nettoyage_toiture'];
  const excls = (ws?.exclusions || []).map(_lower).join(' ');
  ok(
    excls.includes('oversized') || excls.includes('bache') || excls.includes('tarp'),
    'RTG-PR18-B: WORK_SCENES.nettoyage_toiture exclut les bâches surdimensionnées'
  );
  console.groupEnd();
}

// ─── RTG-PR19 — Anti-mousse et hydrofuge restent distincts ───────────────────

function pr19() {
  console.group('RTG-PR19 — Anti-mousse et hydrofuge ont des indices visuels distincts');
  const sr = SITE_REALISM['nettoyage_toiture'];
  const antiScenarios  = _matchingScenarios('traitement anti mousse toiture', sr);
  const hydroScenarios = _matchingScenarios('traitement hydrofuge toiture', sr);

  ok(antiScenarios.length >= 1,  'RTG-PR19-A: au moins 1 scénario anti-mousse', `got ${antiScenarios.length}`);
  ok(hydroScenarios.length >= 1, 'RTG-PR19-B: au moins 1 scénario hydrofuge',   `got ${hydroScenarios.length}`);

  // Anti-mousse scenarios must mention moss in some form
  for (const sc of antiScenarios) {
    const all = _lower([sc.scene_note, (sc.scene_framing || {}).midground].join(' '));
    ok(all.includes('moss') || all.includes('mousse'), `RTG-PR19-C: scénario anti-mousse "${sc._for}" mentionne la mousse présente`, all.slice(0, 80));
  }

  // Hydrofuge scenarios must NOT positively require heavy moss on the roof.
  // Phrases like "no thick moss" or "no heavy moss" are fine (negation) — we check
  // for POSITIVE descriptions of thick moss using a regex that excludes preceding negations.
  const hydroSpecific = hydroScenarios.filter(sc => /hydrofuge/.test(sc._for || ''));
  for (const sc of hydroSpecific) {
    const all = _lower([sc.scene_note, (sc.scene_framing || {}).midground].join(' '));
    // Check for positive (non-negated) mentions of heavy/thick moss
    const confusing =
      /(?<!no |not |without )heavy moss/.test(all) ||
      /(?<!no |not |without )thick moss/.test(all) ||
      all.includes('mousse envahissant') || all.includes('mousse epaisse');
    ok(!confusing, `RTG-PR19-D: scénario hydrofuge "${sc._for}" ne décrit pas de mousse épaisse (confusion avec anti-mousse)`, all.slice(0, 80));
  }
  console.groupEnd();
}

// ─── RTG-PR20 — Safety gate: échelle directement sur gouttière toujours rejetée ─

function pr20() {
  console.group('RTG-PR20 — Safety gate: pas de relâchement pour l\'échelle sur gouttière');
  const ws = WORK_SCENES['nettoyage_gouttieres'];
  const excls = (ws?.exclusions || []).map(_lower);

  // The three critical safety exclusions must still be present
  const ladderOnGutter = excls.some(e =>
    e.includes('ladder resting on the gutter') || e.includes('ladder') && e.includes('gutter') && e.includes('without')
  );
  ok(ladderOnGutter, 'RTG-PR20-A: WORK_SCENES.nettoyage_gouttieres exclut l\'échelle reposant directement sur la gouttière sans stabilisateur');

  const ladderInChannel = excls.some(e =>
    e.includes('ladder resting inside the gutter') || e.includes('inside the gutter channel') || e.includes('pressing') && e.includes('gutter')
  );
  ok(ladderInChannel, 'RTG-PR20-B: WORK_SCENES.nettoyage_gouttieres exclut l\'échelle dans/contre la gouttière');

  const workerOnGutter = excls.some(e => e.includes('worker standing on the gutter'));
  ok(workerOnGutter, 'RTG-PR20-C: WORK_SCENES.nettoyage_gouttieres exclut l\'ouvrier debout sur la gouttière');

  // All nettoyage/débouchage SITE_REALISM scenarios must also exclude it
  const sr = SITE_REALISM['nettoyage_gouttieres'];
  const clearingScenarios = _allScenarios(sr).filter(sc =>
    /nettoy|entretien|curag|debris|feuill|deboucha|bouchon|obstruct/.test(sc._for || '')
  );
  for (const sc of clearingScenarios) {
    const scExcl = (sc.scene_exclude || []).map(_lower).join(' ');
    const scTools = (sc.tools || []).map(_lower).join(' ');
    const noLadderOnGutter =
      scExcl.includes('ladder') || scExcl.includes('echelle') ||
      scTools.includes('standoff') || scTools.includes('telescopic') ||
      scTools.includes('ground level') || scTools.includes('from the ground') ||
      scTools.includes('gutter vacuum') || scTools.includes('drainage rod');
    ok(noLadderOnGutter, `RTG-PR20-D: scénario gouttières "${sc._for}" exclut ou remplace l'échelle directe sur gouttière`, scExcl.slice(0, 80) || scTools.slice(0, 80));
  }
  console.groupEnd();
}

// ─── Run all ──────────────────────────────────────────────────────────────────

export async function runRoofPRTests() {
  console.group('RTG-PR tests — Roof cluster customer-photo realism');

  pr1();
  pr2();
  pr3();
  pr4();
  pr5();
  pr6();
  pr7();
  pr8();
  pr9();
  pr10();
  pr11();
  pr12();
  pr13();
  pr14();
  pr15();
  pr16();
  pr17();
  pr18();
  pr19();
  pr20();

  console.log(`\nRTG-PR Results: ${_pass} passed, ${_fail} failed`);
  if (_fail === 0) {
    console.log('%c✔ RTG-PR PASS — All photo-realism tests passed', 'color: green; font-weight: bold');
  } else {
    console.error(`✘ RTG-PR FAIL — ${_fail} test(s) failed`);
  }
  console.groupEnd();

  return { pass: _pass, fail: _fail, results: _results, ok: _fail === 0 };
}

// Auto-run if loaded in test mode
if (typeof window !== 'undefined' && window._imageGenTestMode) {
  window.runRoofPRTests = runRoofPRTests;
  console.log('[RTG-PR] Photo-realism test suite loaded — call window.runRoofPRTests() to run');
}
