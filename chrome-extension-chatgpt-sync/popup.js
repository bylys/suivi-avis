document.addEventListener('DOMContentLoaded', async () => {
  const selectOp = document.getElementById('op-select');
  const statusText = document.getElementById('status-text');
  const urlText = document.getElementById('url-text');
  const btnPro = document.getElementById('btn-sync-pro');
  const btnPerso = document.getElementById('btn-sync-perso');

  function updateStatusDisplay(data) {
    if (data.lastSyncStatus) {
      const timeStr = data.lastSyncTime ? new Date(data.lastSyncTime).toLocaleTimeString('fr-FR') : '';
      statusText.textContent = `${data.lastSyncStatus} (${timeStr})`;
    } else {
      statusText.textContent = 'Dernière synchro : En attente...';
    }
  }

  async function detectActiveTabUrl() {
    try {
      // 1. Essayer sur la fenêtre active focalisée
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (tab && tab.url && tab.url.includes('chatgpt.com')) {
        urlText.textContent = `🔗 URL : ${tab.url}`;
        return tab.url;
      }
      // 2. Sinon chercher tout onglet chatgpt ouvert
      const allGptTabs = await chrome.tabs.query({ url: '*://*.chatgpt.com/*' });
      if (allGptTabs && allGptTabs.length > 0) {
        urlText.textContent = `🔗 URL : ${allGptTabs[0].url}`;
        return allGptTabs[0].url;
      }
    } catch (e) {}
    urlText.textContent = '⚠️ Aucun onglet chatgpt.com actif détecté';
    return null;
  }

  const initialData = await chrome.storage.local.get(['operatorName', 'lastSyncStatus', 'lastSyncTime']);
  if (initialData.operatorName) {
    selectOp.value = initialData.operatorName;
  }
  updateStatusDisplay(initialData);
  await detectActiveTabUrl();

  chrome.storage.onChanged.addListener(() => {
    chrome.storage.local.get(['lastSyncStatus', 'lastSyncTime'], (d) => {
      updateStatusDisplay(d);
    });
  });

  selectOp.addEventListener('change', async () => {
    const op = selectOp.value;
    await chrome.storage.local.set({ operatorName: op });
    statusText.textContent = `Opérateur réglé sur ${op}.`;
  });

  btnPro.addEventListener('click', async () => {
    const op = selectOp.value;
    const activeUrl = await detectActiveTabUrl();
    statusText.textContent = `Enregistrement du Compte PRO (${op})...`;
    chrome.runtime.sendMessage({ action: 'SYNC_NOW', targetType: 'WORK', operator: op, conversationUrl: activeUrl });
  });

  btnPerso.addEventListener('click', async () => {
    const op = selectOp.value;
    const activeUrl = await detectActiveTabUrl();
    statusText.textContent = `Enregistrement du Compte PERSO (${op})...`;
    chrome.runtime.sendMessage({ action: 'SYNC_NOW', targetType: 'PERSO', operator: op, conversationUrl: activeUrl });
  });
});
