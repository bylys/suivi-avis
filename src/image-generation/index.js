/**
 * image-generation/index.js
 * Point d'entrée du système de génération d'images.
 *
 * Phase 0 — bridge : toute la logique réside encore dans app.js.
 * Ce fichier expose sur window les fonctions publiques nécessaires aux
 * attributs onclick/onchange du HTML. Il sera enrichi phase par phase
 * à mesure que les modules migrent hors de app.js.
 *
 * Ordre d'exécution garanti :
 *   app.js s'exécute en script classique (fin de <body>) avant ce module
 *   (type="module" est toujours différé après le parse complet du document).
 *   Les fonctions ci-dessous existent donc déjà dans le scope global
 *   quand ce fichier s'exécute.
 */

// ── Vérification des fonctions legacy avant exposition ───────────────────────
// app.js s'exécute en script classique avant ce module (type="module" est
// toujours différé). Si une fonction manque, le bridge lève une erreur visible
// plutôt que d'exposer silencieusement `undefined` sur window.

const _REQUIRED_LEGACY = [
  'generateAllImages',
  'addImgRow',
  'downloadImagesZip',
  '_retryFailedImages',
  '_debugBatchPlan',
  '_debugFinalPrompt',
  '_runLocalTests',
];

for (const name of _REQUIRED_LEGACY) {
  if (typeof window[name] !== 'function') {
    throw new Error(`[IMAGE_MODULE_BRIDGE_MISSING] ${name}`);
  }
}

// ── Fonctions publiques exposées sur window ──────────────────────────────────
// Ces assignations sont redondantes en Phase 0 (les fonctions sont déjà
// globales depuis app.js) mais constituent la surface d'API stable sur
// laquelle le HTML s'appuiera une fois le code migré dans les modules.

window.generateAllImages  = generateAllImages;
window.addImgRow          = addImgRow;
window.downloadImagesZip  = downloadImagesZip;
window._retryFailedImages = _retryFailedImages;
window._debugBatchPlan    = _debugBatchPlan;
window._debugFinalPrompt  = _debugFinalPrompt;
window._runLocalTests     = _runLocalTests;

// ── Marqueur de chargement ───────────────────────────────────────────────────
console.info('[IMAGE MODULE BRIDGE] Ready — 7 legacy functions verified');
