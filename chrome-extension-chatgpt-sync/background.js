/**
 * background.js — Synchronisation automatique et explicite des cookies ET des URLs de conversation ChatGPT par opérateur vers Supabase
 */

const SUPABASE_URL = 'https://rrbvghxmnimusfyqixau.supabase.co';
const SUPABASE_KEY = 'sb_publishable_k0nVhKHWUT5kBW9xBNpLkA_AKam7uBa';

async function saveKeyToSupabase(keyName, valueStr) {
  if (!keyName || !valueStr) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/fiches?nom=eq.${encodeURIComponent(keyName)}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    await fetch(`${SUPABASE_URL}/rest/v1/fiches`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nom: keyName,
        lien: valueStr
      })
    });
  } catch (err) {}
}

async function getActiveChatGPTUrl() {
  try {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tabs && tabs[0] && tabs[0].url && tabs[0].url.includes('chatgpt.com')) {
      return tabs[0].url;
    }
    const allGptTabs = await chrome.tabs.query({ url: '*://*.chatgpt.com/*' });
    if (allGptTabs && allGptTabs.length > 0) {
      return allGptTabs[0].url;
    }
  } catch (e) {}
  return null;
}

async function syncCookiesToSupabase(targetType = 'WORK', forcedOp = null, conversationUrl = null) {
  try {
    const { operatorName } = await chrome.storage.local.get(['operatorName']);
    const targetOp = (forcedOp || operatorName || 'KEVIN').toUpperCase();
    const isPerso = targetType === 'PERSO';

    const activeUrl = conversationUrl || (await getActiveChatGPTUrl());

    const cookies = await chrome.cookies.getAll({ domain: 'chatgpt.com' });
    if (!cookies || cookies.length === 0) {
      await chrome.storage.local.set({
        lastSyncStatus: `⚠️ Aucun cookie ChatGPT trouvé dans Chrome (ouvrez chatgpt.com)`,
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
      await saveKeyToSupabase(keyName, jsonStr);
    }

    // Sauvegarde de l'URL de la conversation active si détectée
    if (activeUrl && activeUrl.includes('chatgpt.com')) {
      const urlKey = isPerso ? `CHATGPT_PERSO_CONVERSATION_URL_${targetOp}` : `CHATGPT_WORK_CONVERSATION_URL_${targetOp}`;
      await saveKeyToSupabase(urlKey, activeUrl);
      await saveKeyToSupabase(`CHATGPT_CONVERSATION_URL_${targetOp}`, activeUrl);
    }

    const typeLabel = isPerso ? 'PERSO (Secours)' : 'PRO (Principal)';
    const msg = `✅ Compte ${typeLabel} & URL enregistrés pour ${targetOp}`;
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

// Écouteur de messages depuis le popup et content.js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'SYNC_NOW') {
    syncCookiesToSupabase(msg.targetType || 'WORK', msg.operator, msg.conversationUrl).then(() => sendResponse({ status: 'DONE' }));
    return true;
  } else if (msg.action === 'FORCE_SYNC') {
    syncCookiesToSupabase('WORK', null, msg.conversationUrl).then(() => sendResponse({ status: 'DONE' }));
    return true;
  }
});

// Déclencheur 1 : Navigation sur ChatGPT
if (chrome.webNavigation) {
  chrome.webNavigation.onCompleted.addListener((details) => {
    if (details.url && details.url.includes('chatgpt.com')) {
      syncCookiesToSupabase('WORK', null, details.url);
    }
  }, { url: [{ hostContains: 'chatgpt.com' }] });
}

// Synchronisation initiale au démarrage
syncCookiesToSupabase('WORK');
