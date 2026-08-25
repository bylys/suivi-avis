/**
 * background.js — Synchronisation automatique et privée des cookies ChatGPT par opérateur vers Supabase
 */

const SUPABASE_URL = 'https://rrbvghxmnimusfyqixau.supabase.co';
const SUPABASE_KEY = 'sb_publishable_k0nVhKHWUT5kBW9xBNpLkA_AKam7uBa';

async function syncCookiesToSupabase() {
  try {
    const { operatorName } = await chrome.storage.local.get(['operatorName']);
    const targetOp = (operatorName || 'KEVIN').toUpperCase();

    const cookies = await chrome.cookies.getAll({ domain: 'chatgpt.com' });
    if (!cookies || cookies.length === 0) return;

    // Nettoyage et formatage propre du tableau JSON
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

    // Enregistrer sous les 3 clés pour garantir 100% de compatibilité :
    // 1. CHATGPT_WORK_COOKIES_[OP]
    // 2. CHATGPT_COOKIES_[OP]
    // 3. CHATGPT_COOKIES (fallback global)
    const keysToUpdate = [
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

    const msg = `✅ Synchro réussie pour ${targetOp}`;
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
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'FORCE_SYNC') {
    syncCookiesToSupabase();
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
