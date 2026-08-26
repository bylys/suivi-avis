/**
 * content.js — Détecte les clics sur 'Nouvelle discussion', les ouvertures de conversations ChatGPT et déclenche la synchro automatique
 */
function notifySync() {
  try {
    chrome.runtime.sendMessage({ action: 'FORCE_SYNC', source: 'CHATGPT_CLICK' });
  } catch (e) {}
}

// 1. Écouter les clics sur la page (bouton Nouvelle discussion, liens de conversations, envoi de prompt)
document.addEventListener('click', (e) => {
  const target = e.target.closest('a, button, [role="button"], [data-testid]');
  if (target) {
    const text = (target.textContent || '').toLowerCase();
    const testId = target.getAttribute('data-testid') || '';
    const href = target.getAttribute('href') || '';

    if (
      text.includes('nouvelle discussion') ||
      text.includes('new chat') ||
      testId.includes('new-chat') ||
      href.includes('/c/') ||
      testId.includes('send-button')
    ) {
      setTimeout(notifySync, 1000);
    }
  }
}, true);

// 2. Déclencher la synchro dès que la page ChatGPT est chargée
notifySync();
