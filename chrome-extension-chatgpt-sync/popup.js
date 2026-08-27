document.addEventListener('DOMContentLoaded', async () => {
  const selectOp     = document.getElementById('op-select');
  const sessionBadge = document.getElementById('session-badge');
  const sessionIcon  = document.getElementById('session-icon');
  const sessionLabel = document.getElementById('session-label');
  const cookieCount  = document.getElementById('cookie-count');
  const syncTimeEl   = document.getElementById('sync-time-inline');
  const urlText      = document.getElementById('url-text');
  const btnPro       = document.getElementById('btn-sync-pro');
  const btnPerso     = document.getElementById('btn-sync-perso');

  // ─── Mise à jour UI depuis storage ─────────────────────────────────────────
  function refreshUI(data) {
    const { lastSyncStatus, lastSyncTime, cookieCount: count, sessionOk } = data;

    // Badge session
    if (sessionOk === true) {
      sessionBadge.className = 'session-badge ok';
      sessionIcon.textContent = '✅';
      sessionLabel.textContent = 'Session active — ChatGPT connecté';
    } else if (sessionOk === false) {
      sessionBadge.className = 'session-badge error';
      sessionIcon.textContent = '❌';
      sessionLabel.textContent = 'Session expirée — Reconnectez-vous !';
    } else {
      sessionBadge.className = 'session-badge warn';
      sessionIcon.textContent = '⏳';
      sessionLabel.textContent = 'En attente de vérification...';
    }

    // Compteur cookies
    cookieCount.textContent = count != null ? `${count} cookies` : '—';

    // Heure de sync
    if (lastSyncTime) {
      syncTimeEl.textContent = new Date(lastSyncTime).toLocaleTimeString('fr-FR');
    }
  }

  // ─── Détection URL ChatGPT actif ───────────────────────────────────────────
  async function detectActiveTabUrl() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (tab && tab.url && (tab.url.includes('/c/') || tab.url.includes('/g/'))) {
        urlText.textContent = tab.url;
        return tab.url;
      }
      const allGptTabs = await chrome.tabs.query({ url: '*://*.chatgpt.com/*' });
      for (const t of (allGptTabs || [])) {
        if (t.url && (t.url.includes('/c/') || t.url.includes('/g/'))) {
          urlText.textContent = t.url;
          return t.url;
        }
      }
    } catch (e) {}
    urlText.textContent = '⚠️ Aucune conversation ChatGPT ouverte';
    return null;
  }

  // ─── Init ───────────────────────────────────────────────────────────────────
  const initialData = await chrome.storage.local.get(['operatorName', 'lastSyncStatus', 'lastSyncTime', 'cookieCount', 'sessionOk']);
  if (initialData.operatorName) selectOp.value = initialData.operatorName;
  refreshUI(initialData);
  await detectActiveTabUrl();

  // ─── Écoute changements storage ────────────────────────────────────────────
  chrome.storage.onChanged.addListener(() => {
    chrome.storage.local.get(['lastSyncStatus', 'lastSyncTime', 'cookieCount', 'sessionOk'], refreshUI);
  });

  // ─── Changement opérateur ──────────────────────────────────────────────────
  selectOp.addEventListener('change', async () => {
    await chrome.storage.local.set({ operatorName: selectOp.value });
  });

  // ─── Bouton PRO ────────────────────────────────────────────────────────────
  btnPro.addEventListener('click', async () => {
    const op = selectOp.value;
    const activeUrl = await detectActiveTabUrl();
    sessionBadge.className = 'session-badge warn';
    sessionIcon.textContent = '⏳';
    sessionLabel.textContent = `Enregistrement PRO (${op})...`;
    chrome.runtime.sendMessage({
      action: 'SYNC_NOW',
      targetType: 'WORK',
      operator: op,
      conversationUrl: activeUrl
    });
  });

  // ─── Bouton PERSO ──────────────────────────────────────────────────────────
  btnPerso.addEventListener('click', async () => {
    const op = selectOp.value;
    const activeUrl = await detectActiveTabUrl();
    sessionBadge.className = 'session-badge warn';
    sessionIcon.textContent = '⏳';
    sessionLabel.textContent = `Enregistrement PERSO (${op})...`;
    chrome.runtime.sendMessage({
      action: 'SYNC_NOW',
      targetType: 'PERSO',
      operator: op,
      conversationUrl: activeUrl
    });
  });
});
