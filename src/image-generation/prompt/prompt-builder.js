/**
 * prompt/prompt-builder.js — Phase 5 shadow copy (source active : app.js)
 * Assemblage déterministe du prompt image à partir du SceneJSON validé.
 * Aucun appel réseau, aucun accès DOM, aucun état global.
 * Ne pas modifier avant le cutover validé.
 */

import { _PRE_GEN_SAFETY } from '../safety/safety-rules.js';
import { WORKER_SCENE_RULES } from '../safety/worker-rules.js';

// ─── _USE_PROMPT_BUILDER ──────────────────────────────────────────────────────
// Verbatim — app.js line 4655
const _USE_PROMPT_BUILDER = false;

// ─── PHOTO_STYLE_RULES ────────────────────────────────────────────────────────
// Verbatim copy — app.js lines 4658–4671
const PHOTO_STYLE_RULES = {
  opening:  'Authentic work-progress snapshot taken on a cheap Android smartphone'
          + ' by a French contractor.'
          + ' Organised worksite — realistic activity for the work stage,'
          + ' neither a disaster scene nor a staged portfolio shot.',

  style:    'Flat even lighting, slightly overexposed in bright areas.'
          + ' Light JPEG compression artifacts on fine textures.'
          + ' Possibly a small horizon tilt.'
          + ' No post-processing, no depth-of-field blur.',

  interior: 'Indoor setting — no outdoor sky or horizon visible.'
          + ' Room illuminated by natural window light and ambient ceiling lamp.',
};

// ─── PromptBuilder ────────────────────────────────────────────────────────────
// Verbatim copy — app.js lines 13031–13121
const PromptBuilder = {
  build(jsonStr) {
    const s   = JSON.parse(jsonStr);
    const f   = s.framing || {};
    const isInt   = s.setting === 'interior';
    const defects = (s.photo_defects || []).slice(0, 2).join('; ');

    return [
      // 1 — Photo type / register
      PHOTO_STYLE_RULES.opening,

      // 2 — Scene content
      `Subject: ${s.work_type}. Work state: ${s.state}`,

      // 3 — Composition
      `Camera: ${s.camera_position}.`,
      `The work fills approximately ${f.work_pct || 55}% of the frame.`,
      `Foreground: ${f.foreground}.`,
      `Mid-ground: ${f.midground}.`,
      `Background: ${f.background}.`,

      // 4 — Site debris
      `On site: ${s.site_debris}.`,

      // 5 — Photo defects (from scene data only, never invented)
      defects ? `Photo imperfections: ${defects}.` : '',

      // 6 — Architecture + light (interior variant suppresses exterior references)
      isInt
        ? PHOTO_STYLE_RULES.interior
        : `Architecture: ${s.architecture}. Light: ${s.light}.`,

      // 7 — Style rules
      PHOTO_STYLE_RULES.style,

      // 8 — People / presence
      (() => {
        if (s.var_presence === 'indirect' && s.var_indirect_presence)
          return `Empty worksite — signs of recent activity: ${s.var_indirect_presence}.`;
        const n = s.var_workers !== undefined ? s.var_workers : (s.no_people ? 0 : 1);
        if (n === 0) return 'Empty worksite — no workers or people in the scene.';
        const desc = s.var_worker_desc || 'tradesperson in work clothes naturally engaged in the task — seen from behind or in profile, never posing or looking at the camera';
        if (n === 1) return `One ${desc}.`;
        return `${n} tradespeople in work clothes naturally at work — seen from behind or in profile, never posing or looking at the camera.`;
      })(),

      // 8b — Camera author perspective
      s.var_author === 'contractor'
        ? 'Photo taken by the contractor documenting the job — closer, more technical framing.'
        : s.var_author === 'neighbor'
          ? 'Photo taken from a neighbouring property or the public pavement — natural passer-by angle, slightly through a fence or hedge.'
          : 'Photo taken casually by the homeowner — relaxed handheld shot from the garden, driveway, or pavement.',

      // 9 — Tools and protections (SITE_REALISM — max 2 combined)
      (() => {
        const items = [...(s.site_tools || []), ...(s.site_protections || [])].slice(0, 2);
        return items.length ? `Visible on site: ${items.join(', ')}.` : '';
      })(),

      // 10 — Site details (SITE_REALISM — max 2)
      (() => {
        const items = (s.site_details || []).slice(0, 2);
        return items.length ? `Scattered nearby: ${items.join('; ')}.` : '';
      })(),

      // 10b — Pre-gen safety constraint (per métier) + material rule
      (() => {
        const safety = _PRE_GEN_SAFETY[s._matched_key];
        const rule   = WORKER_SCENE_RULES[s._matched_key]?.site_material_rule;
        const parts  = [safety, rule ? `On-site materials: ${rule}.` : ''].filter(Boolean);
        return parts.length ? parts.join(' ') : '';
      })(),

      // 10c — Forbidden elements (scene_always_exclude merged into exclude by validator)
      (() => {
        const excl = (s.exclude || []).slice(0, 8);
        return excl.length ? `Never include: ${excl.join('; ')}.` : '';
      })(),

      // 11 — Camera viewpoint variation (VARIATION_ENGINE)
      s.var_camera ? `Viewpoint: ${s.var_camera}.` : '',

      // 12 — Light quality variation (VARIATION_ENGINE, meteo-filtered)
      s.var_light ? `Lighting feel: ${s.var_light}.` : '',

      // 13 — Roadside / scene context override (context_map dispatch)
      s.roadside_context ? `Scene location: ${s.roadside_context}.` : '',

    ].filter(Boolean).join(' ');
  },
};

export { _USE_PROMPT_BUILDER, PHOTO_STYLE_RULES, PromptBuilder };
