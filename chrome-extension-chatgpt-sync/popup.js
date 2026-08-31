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

  // ─── Mise à jour UI ────────────────────────────────────────────────────────
  function refreshUI(data) {
    if (!data) return;
    const { lastSyncStatus, lastSyncTime, cookieCount: count, sessionOk, lastType } = data;

    // Badge session
    if (sessionOk === true) {
      sessionBadge.className = 'session-badge ok';
      sessionIcon.textContent = '✅';
      const label = lastType === 'PERSO' ? 'Compte PERSO actif & synchronisé' : 'Compte PRO actif & synchronisé';
      sessionLabel.textContent = lastSyncStatus ? lastSyncStatus.replace(/^[✅⚠️❌]\s*/, '') : label;
    } else if (sessionOk === false) {
      sessionBadge.className = 'session-badge error';
      sessionIcon.textContent = '❌';
      sessionLabel.textContent = 'Session expirée — Reconnectez-vous sur ChatGPT';
    } else {
      sessionBadge.className = 'session-badge warn';
      sessionIcon.textContent = '⏳';
      sessionLabel.textContent = 'En attente de vérification...';
    }

    // Compteur cookies
    cookieCount.textContent = (count != null && count > 0) ? `${count} cookies` : '—';

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
  const initialData = await chrome.storage.local.get(['operatorName', 'lastSyncStatus', 'lastSyncTime', 'cookieCount', 'sessionOk', 'lastType']);
  if (initialData.operatorName) selectOp.value = initialData.operatorName;
  refreshUI(initialData);
  await detectActiveTabUrl();

  // Interroger immédiatement l'état live des cookies
  chrome.runtime.sendMessage({ action: 'GET_STATUS' }, (res) => {
    if (res) refreshUI(res);
  });

  // ─── Écoute changements storage ────────────────────────────────────────────
  chrome.storage.onChanged.addListener(() => {
    chrome.storage.local.get(['lastSyncStatus', 'lastSyncTime', 'cookieCount', 'sessionOk', 'lastType'], refreshUI);
  });

  // ─── Changement opérateur ──────────────────────────────────────────────────
  selectOp.addEventListener('change', async () => {
    await chrome.storage.local.set({ operatorName: selectOp.value });
  });

  // ─── Handler Sync ──────────────────────────────────────────────────────────
  async function handleSync(targetType) {
    const op = selectOp.value;
    const activeUrl = await detectActiveTabUrl();
    const isPerso = targetType === 'PERSO';

    sessionBadge.className = 'session-badge warn';
    sessionIcon.textContent = '⏳';
    sessionLabel.textContent = `Enregistrement ${isPerso ? 'PERSO' : 'PRO'} (${op})...`;
    btnPro.disabled = true;
    btnPerso.disabled = true;

    chrome.runtime.sendMessage({
      action: 'SYNC_NOW',
      targetType,
      operator: op,
      conversationUrl: activeUrl
    }, (res) => {
      btnPro.disabled = false;
      btnPerso.disabled = false;
      if (res && res.status === 'DONE') {
        sessionBadge.className = 'session-badge ok';
        sessionIcon.textContent = '✅';
        sessionLabel.textContent = res.msg ? res.msg.replace(/^[✅⚠️❌]\s*/, '') : `Compte ${isPerso ? 'PERSO' : 'PRO'} synchronisé avec succès !`;
        cookieCount.textContent = `${res.count} cookies`;
        syncTimeEl.textContent = new Date().toLocaleTimeString('fr-FR');
      } else if (res && res.status === 'ERROR') {
        sessionBadge.className = 'session-badge error';
        sessionIcon.textContent = '❌';
        sessionLabel.textContent = `Erreur : ${res.message || 'Échec de synchronisation'}`;
      }
    });
  }

  btnPro.addEventListener('click', () => handleSync('WORK'));
  btnPerso.addEventListener('click', () => handleSync('PERSO'));
});
