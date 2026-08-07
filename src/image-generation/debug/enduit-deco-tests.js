/**
 * Enduit décoratif (intérieur) — no-cost test suite
 *
 * NOTE: "peinture" is a NON-GATED métier (no SAFETY_CHECK_RULES['peinture']), so the
 * live pipeline never runs a Vision service-gate for this service. This suite therefore
 * validates ONLY the real, wired behaviour: the dedicated interior state-lock, its
 * resolution, and non-collision with neighbouring peinture/ravalement families. There
 * is deliberately NO runtime service-gate for Enduit décoratif to test.
 *
 * Tests:
 *   EDECO-SC1..5 : state-lock resolution for Enduit décoratif + encours
 *   EDECO-REG1..5: non-collision — Enduit monocouche / hydraulique / Crépi (ravalement)
 *                  and Peinture intérieure (peinture) unchanged
 *   EDECO-AUD1   : coverage-audit classification = STATE_LOCKED
 */

const { _applySiteRealism } = await import('../resolution/service-resolver.js?bust=edeco-tests2');
const { classifyService }   = await import('./service-coverage-audit.js?bust=edeco-tests2');

export async function runEnduitDecoTests() {
  console.group('EDECO tests — Enduit décoratif interior state-lock (non-gated métier)');

  const _results = [];
  let _pass = 0, _fail = 0;
  function test(id, desc, fn) {
    try { fn(); _results.push({ id, desc, status: 'PASS' }); _pass++; console.log(`%c✓ ${id}: ${desc}`, 'color: green'); }
    catch (e) { _results.push({ id, desc, status: 'FAIL', reason: e.message }); _fail++; console.error(`✘ ${id}: ${desc}\n  ${e.message}`); }
  }
  function assert(cond, msg) { if (!cond) throw new Error(`FAIL: ${msg}`); }

  function resolveScene(service, state_level, matchedKey = 'peinture') {
    const so = { _matched_key: matchedKey, _matched_service: service, state_level, contexte: 'maison_individuelle' };
    return JSON.parse(_applySiteRealism(JSON.stringify(so), 0));
  }

  // ─── EDECO-SC: State-lock resolution ────────────────────────────────────────

  test('EDECO-SC1', 'Enduit décoratif encours → _state_lock_used=true', () => {
    const r = resolveScene('Enduit décoratif', 'encours');
    assert(r._state_lock_used === true, `expected true, got ${r._state_lock_used}`);
  });
  test('EDECO-SC2', 'Enduit décoratif encours → _state_lock_pool_size=1', () => {
    const r = resolveScene('Enduit décoratif', 'encours');
    assert(r._state_lock_pool_size === 1, `expected 1, got ${r._state_lock_pool_size}`);
  });
  test('EDECO-SC3', 'Enduit décoratif encours → _visual_family=PEINTURE-ENDUIT-DECORATIF-INTERIOR', () => {
    const r = resolveScene('Enduit décoratif', 'encours');
    assert(r._visual_family === 'PEINTURE-ENDUIT-DECORATIF-INTERIOR', `got ${r._visual_family}`);
  });
  test('EDECO-SC4', 'Enduit décoratif encours → _access_configuration=GROUND_LEVEL_DECORATIVE_PLASTER', () => {
    const r = resolveScene('Enduit décoratif', 'encours');
    assert(r._access_configuration === 'GROUND_LEVEL_DECORATIVE_PLASTER', `got ${r._access_configuration}`);
  });
  test('EDECO-SC5', 'Enduit décoratif début → no state-lock (encours-only)', () => {
    const r = resolveScene('Enduit décoratif', 'debut');
    assert(r._state_lock_used === false, `début must not lock, got ${r._state_lock_used}`);
  });

  // ─── EDECO-REG: Non-collision with neighbouring families ────────────────────
  // FACADE-ENDUIT-GROUND (monocouche / hydraulique / crépi) lives under the
  // ravalement métier — must be unchanged by the peinture-side interior state-lock.

  test('EDECO-REG1', 'Enduit monocouche encours → unchanged (ravalement FACADE-ENDUIT-GROUND)', () => {
    const r = resolveScene('Enduit monocouche', 'encours', 'ravalement');
    assert(r._visual_family === 'FACADE-ENDUIT-GROUND', `got ${r._visual_family}`);
  });
  test('EDECO-REG2', 'Enduit hydraulique encours → unchanged (ravalement FACADE-ENDUIT-GROUND)', () => {
    const r = resolveScene('Enduit hydraulique', 'encours', 'ravalement');
    assert(r._visual_family === 'FACADE-ENDUIT-GROUND', `got ${r._visual_family}`);
  });
  test('EDECO-REG3', 'Crépi encours → unchanged (ravalement FACADE-ENDUIT-GROUND)', () => {
    const r = resolveScene('Crépi', 'encours', 'ravalement');
    assert(r._visual_family === 'FACADE-ENDUIT-GROUND', `got ${r._visual_family}`);
  });
  test('EDECO-REG4', 'Enduit décoratif must NOT resolve to the FACADE-ENDUIT-GROUND family', () => {
    const r = resolveScene('Enduit décoratif', 'encours');
    assert(r._visual_family !== 'FACADE-ENDUIT-GROUND', `must be interior, got ${r._visual_family}`);
  });
  test('EDECO-REG5', 'Peinture intérieure (salon) encours → not the decorative-plaster lock', () => {
    const r = resolveScene('Peinture salon', 'encours');
    assert(r._visual_family !== 'PEINTURE-ENDUIT-DECORATIF-INTERIOR',
      `interior painting must not hit the decorative-plaster lock, got ${r._visual_family}`);
  });

  // ─── EDECO-AUD: coverage-audit classification ───────────────────────────────

  test('EDECO-AUD1', 'Enduit décoratif → STATE_LOCKED (dedicated interior state-lock)', () => {
    const r = classifyService('peinture', 'Enduit décoratif');
    assert(r.routing_coverage === 'STATE_LOCKED', `expected STATE_LOCKED, got ${r.routing_coverage}`);
    assert(r.matched_regex === '^enduit decoratif$', `got ${r.matched_regex}`);
  });

  console.log(`\n--- EDECO: ${_pass}/${_pass + _fail} ---\n`);
  console.groupEnd();
  return { pass: _pass, fail: _fail, results: _results };
}
