document.addEventListener('DOMContentLoaded', async () => {
  const selectOp = document.getElementById('op-select');
  const selectAcc = document.getElementById('account-select');
  const statusText = document.getElementById('status-text');
  const btnForce = document.getElementById('btn-force');

  // Restaurer l'opérateur et le type de compte sélectionnés
  const data = await chrome.storage.local.get(['operatorName', 'accountType', 'lastSyncStatus', 'lastSyncTime']);
  if (data.operatorName) {
    selectOp.value = data.operatorName;
  }
  if (data.accountType) {
    selectAcc.value = data.accountType;
  }

  if (data.lastSyncStatus) {
    const timeStr = data.lastSyncTime ? new Date(data.lastSyncTime).toLocaleTimeString('fr-FR') : '';
    statusText.textContent = `${data.lastSyncStatus} (${timeStr})`;
  } else {
    statusText.textContent = 'Dernière synchro : En attente...';
  }

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
    statusText.textContent = 'Synchro manuelle lancée...';
    chrome.runtime.sendMessage({ action: 'FORCE_SYNC' });
  });
});
