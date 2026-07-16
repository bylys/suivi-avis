/**
 * ui/img-ui.js — Phase 7C
 * Adaptateur UI pour le pipeline image modulaire.
 * Seul module autorisé à accéder à document/DOM.
 * Le pipeline réseau/planning/prompt ne doit jamais importer ce module.
 */

import { buildDallePromptV2 } from '../prompt/scene-builder.js';

// ─── createImageUiAdapter ─────────────────────────────────────────────────────
// Factory — returns DOM-bound UI adapter.
// documentRef : defaults to global document; pass a mock for tests.
// interface matches runImageBatch/retryFailedImages expectations.
function createImageUiAdapter({ documentRef = (typeof document !== 'undefined' ? document : null) } = {}) {
  const doc = documentRef;

  function _el(id) { return doc ? doc.getElementById(id) : null; }

  function setGenerateButtonDisabled(disabled) {
    const btn = _el('btn-generate-all');
    if (btn) btn.disabled = disabled;
  }

  function updateProgress(doneCount, total, okCount, failCount) {
    const bar = _el('img-progress-bar');
    const lbl = _el('img-progress-label');
    if (bar) bar.style.width = Math.round(doneCount / total * 100) + '%';
    if (lbl) lbl.textContent =
      `${okCount} générée(s)${failCount ? ` · ${failCount} échec(s)` : ''} — ${doneCount}/${total}`;
  }

  function renderImage(src, filename, label) {
    const grid = _el('img-results-grid');
    if (!grid) return;
    const card = doc.createElement('div');
    card.className = 'img-result-card';
    card.innerHTML = `
      <img src="${_escHtml(src)}" alt="${_escHtml(label)}" loading="lazy" />
      <div class="img-result-card-info">
        <div class="img-result-card-title">${_escHtml(label)}</div>
      </div>
    `;
    grid.appendChild(card);
  }

  function renderBatchSummary(total, succeededCount, failedTasks, apiKey) {
    clearSummary();
    const el = doc ? doc.createElement('div') : null;
    if (!el) return;
    el.id = 'img-gen-summary';
    el.className = 'img-gen-summary';
    if (!failedTasks.length) {
      el.innerHTML = `<span class="img-gen-ok">✓ ${total} / ${total} images générées</span>`;
    } else {
      const failLines = failedTasks.map(t => {
        const metier  = _escHtml(t._planBase?._matched_key || '—');
        const service = _escHtml((t.row?.travaux || t.row?.fiche || '').slice(0, 40));
        const idx     = t.i + 1;
        const status  = _escHtml(t.status || '—');
        const tries   = t.attempts || 1;
        const err     = t.error ? ' — ' + _escHtml(t.error.slice(0, 120)) : '';
        return `<li><b>${metier}</b> · ${service} · #${idx} · ${status} (×${tries})${err}</li>`;
      }).join('');
      el.innerHTML = `
        <div class="img-gen-summary-row">
          <span class="img-gen-ok">${succeededCount} générée(s)</span>
          <span class="img-gen-fail"> · ${failedTasks.length} échec(s)</span>
          <span class="img-gen-total"> sur ${total} demandée(s)</span>
        </div>
        <ul class="img-gen-fail-list">${failLines}</ul>
        <button class="btn btn-secondary img-gen-retry" onclick="_retryFailedImages()">
          ↺ Relancer les ${failedTasks.length} échec(s)
        </button>`;
    }
    const grid = _el('img-results-grid');
    if (grid) grid.parentNode.insertBefore(el, grid);
  }

  function clearSummary() {
    const el = _el('img-gen-summary');
    if (el) el.remove();
  }

  function clearGallery() {
    const grid = _el('img-results-grid');
    if (grid) grid.innerHTML = '';
  }

  function readFormRows(imgRows) {
    return imgRows.filter(r => (r.travaux || '').trim());
  }

  function onTaskDone(task, allTasks) {
    const rowTasks = allTasks.filter(t => t.row === task.row);
    if (rowTasks.every(t => {
      const { IMAGE_TASK_STATUS, TERMINAL_STATUSES } = _terminalStatuses();
      return TERMINAL_STATUSES.has(t.status);
    })) {
      // Row is complete — update row status (DOM update delegated to caller)
    }
  }

  // Internal: lazy-import avoidance for TERMINAL_STATUSES
  function _terminalStatuses() {
    const ITS = {
      SUCCESS: 'success', FAILED: 'failed',
      REJECTED_SAFETY: 'rejected_safety', SAFETY_CHECK_FAILED: 'safety_check_failed',
    };
    return {
      IMAGE_TASK_STATUS: ITS,
      TERMINAL_STATUSES: new Set([ITS.SUCCESS, ITS.FAILED, ITS.REJECTED_SAFETY, ITS.SAFETY_CHECK_FAILED]),
    };
  }

  return {
    setGenerateButtonDisabled,
    updateProgress,
    renderImage,
    renderBatchSummary,
    clearSummary,
    clearGallery,
    readFormRows,
    onTaskDone,
  };
}

// ─── _escHtml ────────────────────────────────────────────────────────────────
// Verbatim — app.js line 13382–13385
function _escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── renderAnalyse ───────────────────────────────────────────────────────────
// Renders the scene analysis panel for an image planning row.
// contextData = { CONTEXTE_BY_METIER, CONTEXTE_OPTIONS } from the GMB bridge.
function renderAnalyse(row, { CONTEXTE_BY_METIER, CONTEXTE_OPTIONS } = {}) {
  let obj;
  try {
    obj = JSON.parse(buildDallePromptV2(row));
  } catch { return ''; }

  const stateLabels    = { debut: 'Début', encours: 'En cours', semifinal: 'Presque terminé', final: 'Terminé' };
  const serviceDemande = (row.travaux || '').trim() || '—';
  const serviceDetecte = obj._matched_service || '—';
  const ctxList        = (CONTEXTE_BY_METIER && CONTEXTE_BY_METIER[row.metier]) || CONTEXTE_OPTIONS || [];
  const defVal         = ctxList[0]?.value;
  const contexteLabel  = (ctxList.find(o => o.value === (row.contexte || defVal)) || ctxList[0] || {}).label || '—';
  const typeLabel      = obj.setting === 'interior' ? 'Intérieur' : 'Extérieur';
  const etatLabel      = stateLabels[obj.state_level] || '—';
  const arch           = obj.architecture || '—';
  const camera         = obj.camera_position || '—';
  const score          = obj._match_score || 0;
  const pct = Math.min(99,
    score >= 15 ? 98 :
    score >= 10 ? Math.round(85 + (score - 10) * 2.6) :
    score >= 6  ? Math.round(65 + (score - 6)  * 5) :
                  Math.round(40 + score * 4));
  const confColor = pct >= 80 ? '#22c55e' : pct >= 55 ? '#f59e0b' : '#ef4444';

  return `
<div class="img-analyse-head">Analyse de la scène</div>
<div class="img-analyse-row">
  <span class="img-analyse-key">Service demandé</span>
  <span class="img-analyse-val img-analyse-muted">${_escHtml(serviceDemande)}</span>
</div>
<div class="img-analyse-row">
  <span class="img-analyse-key">Service détecté</span>
  <span class="img-analyse-val">${_escHtml(serviceDetecte)}</span>
</div>
<div class="img-analyse-row">
  <span class="img-analyse-key">Contexte</span>
  <span class="img-analyse-val img-analyse-muted">${_escHtml(contexteLabel)}</span>
</div>
<div class="img-analyse-row">
  <span class="img-analyse-key">Type</span>
  <span class="img-analyse-val">${typeLabel}</span>
</div>
<div class="img-analyse-row">
  <span class="img-analyse-key">État</span>
  <span class="img-analyse-val">${etatLabel}</span>
</div>
<div class="img-analyse-row">
  <span class="img-analyse-key">Architecture</span>
  <span class="img-analyse-val img-analyse-muted">${_escHtml(arch)}</span>
</div>
<div class="img-analyse-row img-analyse-row-last">
  <span class="img-analyse-key">Caméra</span>
  <span class="img-analyse-val img-analyse-muted">${_escHtml(camera)}</span>
</div>
<div class="img-analyse-conf">
  <div class="img-analyse-conf-label">Confiance du matching</div>
  <div class="img-analyse-conf-bar">
    <div class="img-analyse-conf-track">
      <div class="img-analyse-conf-fill" style="width:${pct}%;background:${confColor}"></div>
    </div>
    <span class="img-analyse-conf-pct" style="color:${confColor}">${pct} %</span>
  </div>
</div>`;
}

export { createImageUiAdapter, renderAnalyse };
