document.addEventListener('DOMContentLoaded', async () => {
  const selectOp = document.getElementById('op-select');
  const statusText = document.getElementById('status-text');
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

  // Restaurer l'opérateur sélectionné
  const initialData = await chrome.storage.local.get(['operatorName', 'lastSyncStatus', 'lastSyncTime']);
  if (initialData.operatorName) {
    selectOp.value = initialData.operatorName;
  }
  updateStatusDisplay(initialData);

  // Écouter en temps réel la fin de synchro de background.js
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

  btnPro.addEventListener('click', () => {
    const op = selectOp.value;
    statusText.textContent = `Enregistrement du Compte PRO (${op})...`;
    chrome.runtime.sendMessage({ action: 'SYNC_NOW', targetType: 'WORK', operator: op });
  });

  btnPerso.addEventListener('click', () => {
    const op = selectOp.value;
    statusText.textContent = `Enregistrement du Compte PERSO (${op})...`;
    chrome.runtime.sendMessage({ action: 'SYNC_NOW', targetType: 'PERSO', operator: op });
  });
});
