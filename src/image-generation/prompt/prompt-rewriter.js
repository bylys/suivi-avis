/**
 * prompt/prompt-rewriter.js — Phase 5 shadow copy (source active : app.js)
 * Préparation de la requête GPT et réécriture du prompt image.
 * Deux responsabilités séparées :
 *   - buildPromptRewriteRequest : pure, prépare url/headers/body sans réseau
 *   - rewritePromptWithGPT : injecte fetchImpl + timeoutFetch + readResponse
 *     pour permettre les tests sans appel réseau réel.
 * Le pipeline actif continue d'utiliser _rewritePromptWithGPT legacy dans app.js.
 * Ne pas modifier avant le cutover validé.
 */

// ─── _SCENE_PLANNER_MODEL ─────────────────────────────────────────────────────
// Verbatim — app.js line 13124
const _SCENE_PLANNER_MODEL = 'gpt-4.1';

// ─── _IMG_REWRITE_SYSTEM ──────────────────────────────────────────────────────
// Verbatim copy — app.js lines 13285–13302
const _IMG_REWRITE_SYSTEM = `You are an image prompt engineer for realistic construction-site smartphone photography.

You receive a structured JSON scene description and convert it into a precise image generation prompt.

PRIORITY ORDER (most important first):
1. PHOTO TYPE — establish from photo_goal, in positive language only. Example: "Ordinary work-progress snapshot taken on a cheap Android smartphone."
2. SETTING, LOCATION AND ACTIVE SURFACE — IMMUTABLE — the resolved setting, location and active work surface are mandatory overriding constraints that take priority over architecture, composition, city context and aesthetic interpretation. When setting is "interior": the entire scene must be indoors; the camera must be physically inside the room; the active work surface is the specified interior surface (work_surface); never replace the scene with a facade, roof, garden, street, driveway, neighbourhood or outdoor worksite; no professional vehicle may appear. Respect location_type, location_subtype, work_surface, location_must_have and location_forbidden. Every element in location_forbidden must never appear in the scene.
3. CAMERA COMPOSITION — if composition_desc is present, use it to set the shot distance and framing intent first; then use camera_position and framing to describe the scene spatially: where each element sits, what % of the frame it occupies. The construction work must fill work_pct% of the image.
4. SCENE CONTENT — work_type, state, key elements visible.
5. PHOTO DEFECTS — include exactly the defects listed in photo_defects, nothing extra.
6. CONTEXT — architecture style, light/weather condition. If location_subtype is present, use it to describe the specific location precisely. Every element in location_must_have must appear visible in the scene. Elements in location_supporting may appear naturally in the background or mid-ground if space allows. If work_surface is present, the camera must be positioned so that this surface fills or anchors the primary focal plane of the image — it is the physical substrate of the intervention, not background decoration.
7. SAFETY TRIANGLE — include a warning triangle only when triangle_rule is "required_if_on_road", "required_if_safe", or "required_if_blocking". Never show a warning triangle when triangle_rule is "forbidden" or "forbidden_if_safely_parked".
8. PROFESSIONAL VEHICLE — for depannage/breakdown scenes: include the service van or tow truck if professional_vehicle_presence is "clearly_visible"; keep it at the very edge of the frame if "partially_visible"; omit it entirely if "absent" or if the field is not present.

Rules:
- Maximum 220 words
- Write every instruction positively. Replace "exclude X" with a spatial alternative if possible.
- Apply no_people: true by placing the camera so no humans are visible in frame.
- Output only the final English image prompt. No explanation, no JSON, no title.`;

// ─── buildPromptRewriteRequest ────────────────────────────────────────────────
// Pure function — prepares url, headers, body for the GPT rewrite call.
// No network access.
function buildPromptRewriteRequest({ prompt, apiKey, model, systemPrompt } = {}) {
  return {
    url:     'https://api.openai.com/v1/chat/completions',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      model:       model || _SCENE_PLANNER_MODEL,
      messages: [
        { role: 'system', content: systemPrompt || _IMG_REWRITE_SYSTEM },
        { role: 'user',   content: prompt },
      ],
      max_tokens:  350,
      temperature: 0.75,
    }),
  };
}

// ─── rewritePromptWithGPT ─────────────────────────────────────────────────────
// Same behaviour as legacy _rewritePromptWithGPT — app.js lines 13363–13380
// but with injected dependencies so no real network call is needed in tests.
//   fetchImpl    — replaces _fetchWithTimeout (receives url, options, timeoutMs)
//   readResponse — replaces _readResponseOnce  (receives Response)
async function rewritePromptWithGPT({ prompt, apiKey, fetchImpl, readResponse }) {
  const req    = buildPromptRewriteRequest({ prompt, apiKey });
  const resp   = await fetchImpl(req.url, { method: 'POST', headers: req.headers, body: req.body }, 30000);
  const parsed = await readResponse(resp);
  if (!parsed.ok) throw new Error('Scene planner error: ' + (parsed.data?.error?.message || parsed.raw || `HTTP ${parsed.status}`));
  return parsed.data.choices[0].message.content.trim();
}

export { _SCENE_PLANNER_MODEL, _IMG_REWRITE_SYSTEM, buildPromptRewriteRequest, rewritePromptWithGPT };
