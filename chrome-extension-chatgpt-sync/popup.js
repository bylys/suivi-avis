document.addEventListener('DOMContentLoaded', async () => {
  const selectOp = document.getElementById('op-select');
  const selectAcc = document.getElementById('account-select');
  const statusText = document.getElementById('status-text');
  const btnForce = document.getElementById('btn-force');

  function updateStatusDisplay(data) {
    if (data.lastSyncStatus) {
      const timeStr = data.lastSyncTime ? new Date(data.lastSyncTime).toLocaleTimeString('fr-FR') : '';
      statusText.textContent = `${data.lastSyncStatus} (${timeStr})`;
    } else {
      statusText.textContent = 'Dernière synchro : En attente...';
    }
  }

  // Restaurer l'opérateur et le type de compte sélectionnés
  const initialData = await chrome.storage.local.get(['operatorName', 'accountType', 'lastSyncStatus', 'lastSyncTime']);
  if (initialData.operatorName) {
    selectOp.value = initialData.operatorName;
  }
  if (initialData.accountType) {
    selectAcc.value = initialData.accountType;
  }
  updateStatusDisplay(initialData);

  // Écouter en temps réel la fin de synchro de background.js
  chrome.storage.onChanged.addListener((changes) => {
    chrome.storage.local.get(['lastSyncStatus', 'lastSyncTime'], (d) => {
      updateStatusDisplay(d);
    });
  });

  selectOp.addEventListener('change', async () => {
    const op = selectOp.value;
    await chrome.storage.local.set({ operatorName: op });
    statusText.textContent = `Opérateur réglé sur ${op}. Synchro en cours...`;
    chrome.runtime.sendMessage({ action: 'FORCE_SYNC' });
  });

  selectAcc.addEventListener('change', async () => {
    const type = selectAcc.value;
    await chrome.storage.local.set({ accountType: type });
    statusText.textContent = `Compte réglé sur ${type === 'PERSO' ? 'PERSO (Secours)' : 'PRO (Principal)'}. Synchro...`;
    chrome.runtime.sendMessage({ action: 'FORCE_SYNC' });
  });

  btnForce.addEventListener('click', () => {
    statusText.textContent = 'Synchro manuelle en cours...';
    chrome.runtime.sendMessage({ action: 'FORCE_SYNC' }, async () => {
      const latest = await chrome.storage.local.get(['lastSyncStatus', 'lastSyncTime']);
      updateStatusDisplay(latest);
    });
  });
});
