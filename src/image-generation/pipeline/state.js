/**
 * pipeline/state.js
 * Phase 6+ : source unique de vérité pour l'état mutable de génération.
 *
 * Contiendra :
 *   export const generationState = {
 *     runActive: false,
 *     runId: null,
 *     generatedImages: [],
 *     imageCallLog: [],
 *     lastFailedTasks: null,
 *     lastApiKey: null,
 *     counters: {
 *       imageCalls: 0,
 *       visionCalls: 0,
 *     },
 *   };
 *
 * Variables actuellement dispersées dans app.js :
 *   _imgRows, _imgCounter, _generatedImages (l.2976–2978)
 *   _generationRunActive (l.13618)
 *   _imgApiCallCount, _imgVisionCallCount (l.13620–13621)
 *   window._imgCallLog, window._lastFailedTasks, window._lastApiKey
 *   _lastMatch (l.3181) — pont GMB ↔ image-gen
 *
 * Règle : aucun module métier ne modifie directement cet état.
 *   Seul pipeline/ écrit dans generationState.
 */
// Stub Phase 0 — rien à exporter ici pour l'instant.
