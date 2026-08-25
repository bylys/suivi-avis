document.addEventListener('DOMContentLoaded', async () => {
  const select = document.getElementById('op-select');
  const statusText = document.getElementById('status-text');
  const btnForce = document.getElementById('btn-force');

  // Restaurer l'opérateur sélectionné depuis le stockage local de l'extension
  const data = await chrome.storage.local.get(['operatorName', 'lastSyncStatus', 'lastSyncTime']);
  if (data.operatorName) {
    select.value = data.operatorName;
  }

  if (data.lastSyncStatus) {
    const timeStr = data.lastSyncTime ? new Date(data.lastSyncTime).toLocaleTimeString('fr-FR') : '';
    statusText.textContent = `${data.lastSyncStatus} (${timeStr})`;
  } else {
    statusText.textContent = 'Dernière synchro : En attente...';
  }

  select.addEventListener('change', async () => {
    const op = select.value;
    await chrome.storage.local.set({ operatorName: op });
    statusText.textContent = `Opérateur réglé sur ${op}. Synchro en cours...`;
    chrome.runtime.sendMessage({ action: 'FORCE_SYNC' });
  });

  btnForce.addEventListener('click', () => {
    statusText.textContent = 'Synchro manuelle lancée...';
    chrome.runtime.sendMessage({ action: 'FORCE_SYNC' });
  });
});
