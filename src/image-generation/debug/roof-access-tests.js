/**
 * debug/roof-access-tests.js
 * No-cost structural validation — roof access doctrine.
 * ROOF-ACCESS1–14  : hooked roof ladder / charpente / safety gate structure
 * ANTIMOSS-V5–7   : anti-mousse roof-ladder doctrine (complement to ANTIMOSS-V1–4)
 * 0 appel Images · 0 appel Vision · 0 appel rewriter · 0 retry
 */

const { WORKER_SCENE_RULES }             = await import('../safety/worker-rules.js?bust=ra1');
const { FORBIDDEN_SAFETY_BY_METIER, SAFETY_CHECK_RULES, SERVICE_VISUAL_GATE_RULES, _SERVICE_GATE_ALIASES } = await import('../safety/safety-rules.js?bust=ra1');

// ─── helpers ──────────────────────────────────────────────────────────────────
const results = [];
function pass(id, msg)  { results.push({ id, ok: true,  msg }); }
function fail(id, msg)  { results.push({ id, ok: false, msg }); }

function check(id, condition, passMsg, failMsg) {
  condition ? pass(id, passMsg) : fail(id, failMsg);
}

// ─── ROOF-ACCESS1 : nettoyage_toiture accepte hooked roof ladder ──────────────
{
  const access = WORKER_SCENE_RULES.nettoyage_toiture?.access || [];
  const hasHRL = access.some(a => /hooked.*roof.*ladder/i.test(a));
  check('ROOF-ACCESS1', hasHRL,
    'nettoyage_toiture.access includes hooked roof ladder',
    `nettoyage_toiture.access missing hooked roof ladder — found: ${JSON.stringify(access)}`);
}

// ─── ROOF-ACCESS2 : démoussage accepte hooked roof ladder (same bucket) ───────
{
  // Démoussage routes to nettoyage_toiture — validate that same access list covers it.
  const access = WORKER_SCENE_RULES.nettoyage_toiture?.access || [];
  const hasHRL = access.some(a => /hooked.*roof.*ladder/i.test(a));
  check('ROOF-ACCESS2', hasHRL,
    'nettoyage_toiture (démoussage) includes hooked roof ladder in access',
    'nettoyage_toiture.access does not cover démoussage via hooked roof ladder');
}

// ─── ROOF-ACCESS3 : anti-mousse accepte hooked roof ladder (same bucket) ──────
{
  const access = WORKER_SCENE_RULES.nettoyage_toiture?.access || [];
  const hasHRL = access.some(a => /hooked.*roof.*ladder/i.test(a));
  check('ROOF-ACCESS3', hasHRL,
    'nettoyage_toiture (anti-mousse) includes hooked roof ladder in access',
    'nettoyage_toiture.access does not cover anti-mousse via hooked roof ladder');
}

// ─── ROOF-ACCESS4 : réparation toiture accepte hooked roof ladder ─────────────
{
  const access = WORKER_SCENE_RULES.toiture?.access || [];
  const hasHRL = access.some(a => /roof.*ladder|hooked.*ladder/i.test(a));
  check('ROOF-ACCESS4', hasHRL,
    'toiture (réparation toiture) includes roof ladder in access',
    `toiture.access missing roof ladder — found: ${JSON.stringify(access)}`);
}

// ─── ROOF-ACCESS5 : remplacement tuiles et ardoises accepte hooked roof ladder ─
{
  const access = WORKER_SCENE_RULES.toiture?.access || [];
  const hasHRL = access.some(a => /roof.*ladder|hooked.*ladder/i.test(a));
  check('ROOF-ACCESS5', hasHRL,
    'toiture (remplacement tuiles/ardoises) includes roof ladder in access',
    'toiture.access does not cover remplacement tuiles/ardoises via roof ladder');
}

// ─── ROOF-ACCESS6 : réparation fuite accepte hooked roof ladder ───────────────
{
  const access = WORKER_SCENE_RULES.toiture?.access || [];
  const hasHRL = access.some(a => /roof.*ladder|hooked.*ladder/i.test(a));
  check('ROOF-ACCESS6', hasHRL,
    'toiture (réparation fuite) includes roof ladder in access',
    'toiture.access does not cover réparation fuite via roof ladder');
}

// ─── ROOF-ACCESS7 : faîtage, solin, Velux, noue, rive acceptent hooked roof ladder
{
  const access = WORKER_SCENE_RULES.toiture?.access || [];
  const hasHRL = access.some(a => /roof.*ladder|hooked.*ladder/i.test(a));
  check('ROOF-ACCESS7', hasHRL,
    'toiture (faîtage/solin/Velux/noue/rive) includes roof ladder in access',
    'toiture.access does not cover faîtage/solin/Velux/noue/rive via roof ladder');
}

// ─── ROOF-ACCESS8 : ridge hooks obligatoires ─────────────────────────────────
{
  // Check WORKER_SCENE_RULES.toiture.safety_required mentions ridge hooks
  const safetyRequired = WORKER_SCENE_RULES.toiture?.safety_required || [];
  const hasRidgeHooks  = safetyRequired.some(s => /ridge|hooks/i.test(s));
  // Also verify the gate reject_conditions include ridge_hooks_visible
  const gate = SERVICE_VISUAL_GATE_RULES['Réparation toiture'];
  const gateHasRidge = gate?.reject_conditions?.some(c => c.field === 'ridge_hooks_visible');
  check('ROOF-ACCESS8', hasRidgeHooks && gateHasRidge,
    'ridge hooks mandatory — in toiture.safety_required AND in Réparation toiture gate reject_conditions',
    `ridge hooks not enforced: safety_required=${hasRidgeHooks}, gate=${gateHasRidge}`);
}

// ─── ROOF-ACCESS9 : worker librement sur toiture rejeté ──────────────────────
{
  const gate = SERVICE_VISUAL_GATE_RULES['Réparation toiture'];
  const cond = gate?.reject_conditions?.find(c => c.field === 'worker_standing_freely_on_roof' && c.value === true);
  check('ROOF-ACCESS9', !!cond,
    'Réparation toiture gate rejects worker_standing_freely_on_roof=true → forbidden_roof_scene',
    'Réparation toiture gate missing worker_standing_freely_on_roof rejection');
}

// ─── ROOF-ACCESS10 : harnais connecté obligatoire ────────────────────────────
{
  const gate = SERVICE_VISUAL_GATE_RULES['Réparation toiture'];
  const cond = gate?.reject_conditions?.find(c => c.field === 'connected_harness_visible' && c.not_exactly_true === true);
  check('ROOF-ACCESS10', !!cond,
    'Réparation toiture gate rejects connected_harness_visible≠true → critical_violation',
    'Réparation toiture gate missing connected_harness_visible rejection');
}

// ─── ROOF-ACCESS11 : second worker visible et hors zone de chute ─────────────
{
  const gate       = SERVICE_VISUAL_GATE_RULES['Réparation toiture'];
  const condCount  = gate?.reject_conditions?.find(c => c.field === 'second_worker_visible' && c.not_exactly_true === true);
  const condDrop   = gate?.reject_conditions?.find(c => c.field === 'second_worker_outside_drop_zone' && c.not_exactly_true === true);
  check('ROOF-ACCESS11', !!(condCount && condDrop),
    'Réparation toiture gate rejects second_worker_visible≠true AND second_worker_outside_drop_zone≠true',
    `gate missing: second_worker_visible=${!!condCount}, second_worker_outside_drop_zone=${!!condDrop}`);
}

// ─── ROOF-ACCESS12 : charpente rejette hooked roof ladder ────────────────────
{
  const access    = WORKER_SCENE_RULES.charpente?.access || [];
  const forbidden = WORKER_SCENE_RULES.charpente?.forbidden || [];
  const noHRLInAccess  = !access.some(a => /hooked.*roof.*ladder/i.test(a));
  const hrlInForbidden = forbidden.some(f => /hooked.*roof.*ladder/i.test(f));
  check('ROOF-ACCESS12', noHRLInAccess && hrlInForbidden,
    'charpente: hooked roof ladder absent from access AND present in forbidden',
    `charpente access_no_hrl=${noHRLInAccess}, forbidden_has_hrl=${hrlInForbidden}`);
}

// ─── ROOF-ACCESS13 : charpente accepte scaffold ───────────────────────────────
{
  const access     = WORKER_SCENE_RULES.charpente?.access || [];
  const hasScaffold = access.some(a => /scaffold/i.test(a));
  check('ROOF-ACCESS13', hasScaffold,
    'charpente.access includes scaffold platform',
    `charpente.access missing scaffold — found: ${JSON.stringify(access)}`);
}

// ─── ROOF-ACCESS14 : charpente accepte MEWP ──────────────────────────────────
{
  const access  = WORKER_SCENE_RULES.charpente?.access || [];
  const hasMewp = access.some(a => /MEWP|elevated.*work.*platform|mobile.*elevated/i.test(a));
  check('ROOF-ACCESS14', hasMewp,
    'charpente.access includes MEWP',
    `charpente.access missing MEWP — found: ${JSON.stringify(access)}`);
}

// ─── ANTIMOSS-V5 : nettoyage_toiture.access inclut hooked roof ladder ─────────
{
  const access = WORKER_SCENE_RULES.nettoyage_toiture?.access || [];
  const hasHRL = access.some(a => /hooked.*roof.*ladder/i.test(a));
  check('ANTIMOSS-V5', hasHRL,
    'nettoyage_toiture (anti-mousse roof-ladder path) includes hooked roof ladder in access',
    `nettoyage_toiture.access missing hooked roof ladder — found: ${JSON.stringify(access)}`);
}

// ─── ANTIMOSS-V6 : nettoyage_toiture.safety_required mentionne le harnais + ancrage
{
  const sr         = WORKER_SCENE_RULES.nettoyage_toiture?.safety_required || [];
  const hasHarness = sr.some(s => /harness|lanyard/i.test(s));
  const hasAnchor  = sr.some(s => /anchor|ancrage/i.test(s));
  check('ANTIMOSS-V6', hasHarness && hasAnchor,
    'nettoyage_toiture.safety_required includes harness + anchor (covers roof-ladder path)',
    `nettoyage_toiture safety_required missing: harness=${hasHarness}, anchor=${hasAnchor}`);
}

// ─── ANTIMOSS-V7 : freely standing on tiles rejeté pour nettoyage_toiture ────
{
  const forbidden = FORBIDDEN_SAFETY_BY_METIER.nettoyage_toiture || [];
  const hasFreely = forbidden.some(f => /freely standing|freely stand/i.test(f));
  check('ANTIMOSS-V7', hasFreely,
    'FORBIDDEN_SAFETY_BY_METIER.nettoyage_toiture rejects worker freely standing on pitched tiles',
    `nettoyage_toiture forbidden missing free-standing rejection — found: ${JSON.stringify(forbidden)}`);
}

// ─── runner ───────────────────────────────────────────────────────────────────
function _runRoofAccessTests() {
  const passed  = results.filter(r => r.ok);
  const failed  = results.filter(r => !r.ok);
  const summary = `ROOF-ACCESS + ANTIMOSS-V (HRL) ${passed.length}/${results.length} passed`;
  if (failed.length) {
    console.error(`[ROOF-ACCESS] FAIL — ${summary}`);
    failed.forEach(r => console.error(`  ✗ ${r.id}: ${r.msg}`));
  } else {
    console.log(`[ROOF-ACCESS] OK — ${summary}`);
  }
  passed.forEach(r => console.log(`  ✓ ${r.id}: ${r.msg}`));
  return { passed: passed.length, failed: failed.length, total: results.length, details: results };
}

export { _runRoofAccessTests };
