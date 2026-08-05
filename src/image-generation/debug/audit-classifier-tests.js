/**
 * Audit classifier — no-cost test suite
 * Tests:
 *   AUD-CLASS1 : STATE_LOCKED  — service with _state_for scenario
 *   AUD-CLASS2 : ROUTED_TO_SPECIFIC_SCENE — specific _for, no _state_for, not deferred
 *   AUD-CLASS3 : DEFERRED      — explicit deferral wins over regex match
 *   AUD-CLASS4 : FALLBACK_ONLY — no _for match, fallback scenario applies
 *   AUD-CLASS5 : UNROUTED      — no _for match, no fallback scenario
 *   AUD-SUM1   : summary totals match service count
 */

const { classifyService, generateServiceCoverageAudit } =
  await import('../debug/service-coverage-audit.js?bust=aud-class1');

export async function runAuditClassifierTests() {
  console.group('AUD tests — coverage audit classifier');

  const _results = [];
  let _pass = 0;
  let _fail = 0;

  function test(id, desc, fn) {
    try {
      fn();
      _results.push({ id, desc, status: 'PASS' });
      _pass++;
      console.log(`%c✓ ${id}: ${desc}`, 'color: green');
    } catch (e) {
      _results.push({ id, desc, status: 'FAIL', reason: e.message });
      _fail++;
      console.error(`✘ ${id}: ${desc}\n  ${e.message}`);
    }
  }

  function assert(cond, msg) { if (!cond) throw new Error(`FAIL: ${msg}`); }

  // ─── AUD-CLASS1: STATE_LOCKED ─────────────────────────────────────────────
  // maçonnerie / Mur brique has a scenario with _state_for → STATE_LOCKED

  test('AUD-CLASS1', 'Mur brique (has _state_for) → routing_coverage=STATE_LOCKED', () => {
    const r = classifyService('maçonnerie', 'Mur brique');
    assert(r.routing_coverage === 'STATE_LOCKED',
      `Expected STATE_LOCKED, got ${r.routing_coverage}`);
    assert(r.fallback_used === false,
      `Expected fallback_used=false, got ${r.fallback_used}`);
    assert(r.matched_regex === '^mur brique$',
      `Expected matched_regex=^mur brique$, got ${r.matched_regex}`);
  });

  // ─── AUD-CLASS2: ROUTED_TO_SPECIFIC_SCENE ────────────────────────────────
  // maçonnerie / Construction mur matches a _for scenario but has no _state_for

  test('AUD-CLASS2', 'Réparation fissure (specific _for, no _state_for, not deferred) → ROUTED_TO_SPECIFIC_SCENE', () => {
    const r = classifyService('maçonnerie', 'Réparation fissure');
    assert(r.routing_coverage === 'ROUTED_TO_SPECIFIC_SCENE',
      `Expected ROUTED_TO_SPECIFIC_SCENE, got ${r.routing_coverage}`);
    assert(r.fallback_used === false,
      `Expected fallback_used=false, got ${r.fallback_used}`);
    assert(r.matched_regex !== null,
      'matched_regex must not be null for a routed service');
  });

  // ─── AUD-CLASS3: DEFERRED ─────────────────────────────────────────────────
  // maçonnerie / Terrasse béton is in DEFERRED_SERVICES and also matches a
  // non-state-lock _for regex — DEFERRED must win over ROUTED_TO_SPECIFIC_SCENE

  test('AUD-CLASS3', 'Terrasse béton (DEFERRED_SERVICES + regex match) → DEFERRED wins', () => {
    const r = classifyService('maçonnerie', 'Terrasse béton');
    assert(r.routing_coverage === 'DEFERRED',
      `Expected DEFERRED, got ${r.routing_coverage}`);
    assert(r.fallback_used === false,
      `Expected fallback_used=false, got ${r.fallback_used}`);
    // regex is still recorded for traceability
    assert(r.matched_regex !== null,
      'matched_regex must be recorded even for deferred services');
  });

  test('AUD-CLASS3b', 'Ouverture dans mur → DEFERRED', () => {
    const r = classifyService('maçonnerie', 'Ouverture dans mur');
    assert(r.routing_coverage === 'DEFERRED',
      `Expected DEFERRED, got ${r.routing_coverage}`);
  });

  test('AUD-CLASS3c', 'Percement mur → DEFERRED', () => {
    const r = classifyService('maçonnerie', 'Percement mur');
    assert(r.routing_coverage === 'DEFERRED',
      `Expected DEFERRED, got ${r.routing_coverage}`);
  });

  test('AUD-CLASS3d', 'Construction mur → DEFERRED (priorité sur regex partagé, ne retourne pas ROUTED_TO_SPECIFIC_SCENE)', () => {
    const r = classifyService('maçonnerie', 'Construction mur');
    assert(r.routing_coverage === 'DEFERRED',
      `Expected DEFERRED, got ${r.routing_coverage}`);
    assert(r.fallback_used === false,
      `Expected fallback_used=false, got ${r.fallback_used}`);
    assert(r.matched_regex !== null,
      'matched_regex must still be recorded for traceability');
  });

  test('AUD-CLASS3e', 'Rejointoiement → DEFERRED (pool contaminé, gate absente)', () => {
    const r = classifyService('maçonnerie', 'Rejointoiement');
    assert(r.routing_coverage === 'DEFERRED',
      `Expected DEFERRED, got ${r.routing_coverage}`);
    assert(r.fallback_used === false,
      `Expected fallback_used=false, got ${r.fallback_used}`);
    assert(r.matched_regex !== null,
      'matched_regex must still be recorded for traceability');
  });

  test('AUD-CLASS3f', 'Décaissement → DEFERRED (pool tranchée/fouille incorrect, aucune gate, aucun scénario raclage horizontal)', () => {
    const r = classifyService('terrassement', 'Décaissement');
    assert(r.routing_coverage === 'DEFERRED',
      `Expected DEFERRED, got ${r.routing_coverage} — Décaissement must not reach the shared decaiss|fouill regex pool`);
    assert(r.fallback_used === false,
      `Expected fallback_used=false, got ${r.fallback_used}`);
    assert(r.matched_regex !== null,
      'matched_regex must still be recorded for traceability');
  });

  // ─── AUD-CLASS4: DEFERRED (no _for match, fallback suppressed) ──────────
  // peinture / Enduit décoratif is in DEFERRED_SERVICES — fallback must NOT win

  test('AUD-CLASS4', 'Enduit décoratif (DEFERRED_SERVICES, no _for match) → DEFERRED wins over fallback', () => {
    const r = classifyService('peinture', 'Enduit décoratif');
    assert(r.routing_coverage === 'DEFERRED',
      `Expected DEFERRED, got ${r.routing_coverage}`);
    assert(r.fallback_used === false,
      `Expected fallback_used=false (fallback suppressed by DEFERRED), got ${r.fallback_used}`);
    assert(r.matched_regex === null,
      `Expected matched_regex=null, got ${r.matched_regex}`);
  });

  // ─── AUD-CLASS5: UNROUTED ─────────────────────────────────────────────────
  // terrassement / Remblai has no _for match and no fallback scenario
  // → PARTIAL_CONTEXTE + fallback_used=false

  test('AUD-CLASS5', 'Remblai (no _for match, no fallback) → PARTIAL_CONTEXTE + fallback_used=false', () => {
    const r = classifyService('terrassement', 'Remblai');
    assert(r.routing_coverage === 'PARTIAL_CONTEXTE',
      `Expected PARTIAL_CONTEXTE, got ${r.routing_coverage}`);
    assert(r.fallback_used === false,
      `Expected fallback_used=false (no fallback scenario), got ${r.fallback_used}`);
    assert(r.matched_regex === null,
      `Expected matched_regex=null, got ${r.matched_regex}`);
  });

  // ─── AUD-SUM1: Summary integrity ──────────────────────────────────────────
  // sum of all routing_coverage counts in summary must equal summary.TOTAL

  test('AUD-SUM1', 'summary: sum of all categories === TOTAL', () => {
    const { summary } = generateServiceCoverageAudit();
    const { TOTAL, ...categories } = summary;
    const computed = Object.values(categories).reduce((acc, n) => acc + n, 0);
    assert(computed === TOTAL,
      `Sum of categories (${computed}) ≠ TOTAL (${TOTAL})`);
  });

  test('AUD-SUM2', 'summary: STATE_LOCKED=43, DEFERRED=8, ROUTED_TO_SPECIFIC_SCENE=114', () => {
    const { summary } = generateServiceCoverageAudit();
    assert(summary.STATE_LOCKED === 43,
      `Expected STATE_LOCKED=43, got ${summary.STATE_LOCKED}`);
    assert(summary.DEFERRED === 8,
      `Expected DEFERRED=8, got ${summary.DEFERRED}`);
    assert(summary.ROUTED_TO_SPECIFIC_SCENE === 114,
      `Expected ROUTED_TO_SPECIFIC_SCENE=114, got ${summary.ROUTED_TO_SPECIFIC_SCENE}`);
    assert(summary.TOTAL === 172,
      `Expected TOTAL=172, got ${summary.TOTAL}`);
  });

  // ─── Summary ───────────────────────────────────────────────────────────────

  console.log(`\n--- AUD: ${_pass}/${_pass + _fail} ---\n`);
  console.groupEnd();
  return { pass: _pass, fail: _fail, results: _results };
}
