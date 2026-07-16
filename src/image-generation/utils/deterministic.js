/**
 * utils/deterministic.js — Phase 3 shadow copy (source active : app.js)
 * Utilitaires déterministes partagés : hashSeed, seedShuffle, pick.
 * Ne pas modifier avant le cutover validé.
 */

function _hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  return Math.abs(h);
}

function _seedShuffle(arr, seed) {
  const a = arr.slice();
  let s = seed >>> 0;
  for (let i = a.length - 1; i > 0; i--) {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b) >>> 0;
    s = (s ^ (s >>> 11)) >>> 0;
    const j = s % (i + 1);
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

function _pick(arr, n, seed) {
  if (!arr || !arr.length || n <= 0) return [];
  return _seedShuffle(arr, seed).slice(0, Math.min(n, arr.length));
}

export { _hashSeed, _seedShuffle, _pick };
export { _hashSeed as hashSeed, _seedShuffle as seedShuffle, _pick as pick };
