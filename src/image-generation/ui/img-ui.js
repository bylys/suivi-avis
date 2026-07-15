/**
 * ui/img-ui.js — Phase 6 shadow copy (source active : app.js)
 * Adaptateur UI pour le pipeline image modulaire.
 * Seul module autorisé à accéder à document/DOM.
 * Verbatim — app.js lignes 13382–13615 + 16437–16448.
 * Le pipeline réseau/planning/prompt ne doit jamais importer ce module.
 * Ne pas modifier avant le cutover validé.
 */

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

export { createImageUiAdapter };
