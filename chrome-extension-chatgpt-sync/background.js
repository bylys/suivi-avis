/**
 * background.js — Synchronisation automatique et privée des cookies ChatGPT par opérateur et type de compte (PRO vs PERSO) vers Supabase
 */

const SUPABASE_URL = 'https://rrbvghxmnimusfyqixau.supabase.co';
const SUPABASE_KEY = 'sb_publishable_k0nVhKHWUT5kBW9xBNpLkA_AKam7uBa';

async function syncCookiesToSupabase() {
  try {
    const { operatorName, accountType } = await chrome.storage.local.get(['operatorName', 'accountType']);
    const targetOp = (operatorName || 'KEVIN').toUpperCase();
    const isPerso = accountType === 'PERSO';

    const cookies = await chrome.cookies.getAll({ domain: 'chatgpt.com' });
    if (!cookies || cookies.length === 0) {
      await chrome.storage.local.set({
        lastSyncStatus: `⚠️ Aucun cookie ChatGPT trouvé (ouvre chatgpt.com)`,
        lastSyncTime: Date.now()
      });
      return;
    }

    const cleanCookies = cookies.map(c => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path || '/',
      secure: Boolean(c.secure),
      httpOnly: Boolean(c.httpOnly),
      expires: c.expirationDate
    }));

    const jsonStr = JSON.stringify(cleanCookies);
    const nowIso = new Date().toISOString();

    const keysToUpdate = isPerso
      ? [
          `CHATGPT_PERSO_COOKIES_${targetOp}`,
          `CHATGPT_PERSO_COOKIES`
        ]
      : [
          `CHATGPT_WORK_COOKIES_${targetOp}`,
          `CHATGPT_COOKIES_${targetOp}`,
          `CHATGPT_COOKIES`
        ];

    for (const keyName of keysToUpdate) {
      await fetch(`${SUPABASE_URL}/rest/v1/app_settings`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          key: keyName,
          value: jsonStr,
          updated_at: nowIso
        })
      });
    }

    const typeLabel = isPerso ? 'PERSO (Secours)' : 'PRO (Principal)';
    const msg = `✅ Synchro réussie pour ${targetOp} [${typeLabel}]`;
    console.log(`[GMB Sync] ${msg}`);
    await chrome.storage.local.set({
      lastSyncStatus: msg,
      lastSyncTime: Date.now()
    });

  } catch (err) {
    console.log('[GMB Sync Note]', err.message);
    await chrome.storage.local.set({
      lastSyncStatus: `⚠️ Erreur : ${err.message}`,
      lastSyncTime: Date.now()
    });
  }
}

// Écouteur de messages depuis le popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'FORCE_SYNC') {
    syncCookiesToSupabase().then(() => sendResponse({ status: 'DONE' }));
    return true;
  }
});

// Déclencheur : chaque fois qu'un cookie change sur chatgpt.com
chrome.cookies.onChanged.addListener((changeInfo) => {
  if (changeInfo.cookie.domain.includes('chatgpt.com')) {
    syncCookiesToSupabase();
  }
});

// Synchronisation initiale au démarrage
syncCookiesToSupabase();
