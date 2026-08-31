/**
 * background.js v2.0 — Sync complet cookies (chatgpt.com + openai.com) + URL fixe par opérateur
 */

const SUPABASE_URL = 'https://rrbvghxmnimusfyqixau.supabase.co';
const SUPABASE_KEY = 'sb_publishable_k0nVhKHWUT5kBW9xBNpLkA_AKam7uBa';

// ─── Sauvegarde Supabase ───────────────────────────────────────────────────────
async function saveKeyToSupabase(keyName, valueStr) {
  if (!keyName || !valueStr) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/fiches?nom=eq.${encodeURIComponent(keyName)}`, {
      method: 'DELETE',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    await fetch(`${SUPABASE_URL}/rest/v1/fiches`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ nom: keyName, lien: valueStr })
    });
  } catch (err) {}
}

// ─── Lecture Supabase ──────────────────────────────────────────────────────────
async function getKeyFromSupabase(keyName) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/fiches?nom=eq.${encodeURIComponent(keyName)}&select=lien`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const data = await res.json();
    return (data && data[0]) ? data[0].lien : null;
  } catch (e) { return null; }
}

// ─── Récupération de tous les cookies (chatgpt.com + openai.com) ───────────────
async function getAllChatGPTCookies() {
  const domains = ['chatgpt.com', 'openai.com'];
  const allCookies = [];
  const seen = new Set();

  for (const domain of domains) {
    try {
      const cookies = await chrome.cookies.getAll({ domain });
      for (const c of (cookies || [])) {
        const key = `${c.name}::${c.domain}::${c.path}`;
        if (!seen.has(key)) {
          seen.add(key);
          allCookies.push({
            name: c.name,
            value: c.value,
            domain: c.domain,
            path: c.path || '/',
            secure: Boolean(c.secure),
            httpOnly: Boolean(c.httpOnly),
            expires: c.expirationDate || undefined
          });
        }
      }
    } catch (e) {}
  }
  return allCookies;
}

// ─── Détection de l'onglet ChatGPT actif ──────────────────────────────────────
async function getActiveChatGPTUrl() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tab && tab.url && tab.url.includes('chatgpt.com/c/')) return tab.url;
    if (tab && tab.url && tab.url.includes('chatgpt.com/g/')) return tab.url;

    const allGptTabs = await chrome.tabs.query({ url: '*://*.chatgpt.com/*' });
    for (const t of (allGptTabs || [])) {
      if (t.url && (t.url.includes('/c/') || t.url.includes('/g/'))) return t.url;
    }
  } catch (e) {}
  return null;
}

// ─── Sync principal ────────────────────────────────────────────────────────────
async function syncCookiesToSupabase(targetType = 'WORK', forcedOp = null, conversationUrl = null) {
  try {
    const { operatorName } = await chrome.storage.local.get(['operatorName']);
    const targetOp = (forcedOp || operatorName || 'KEVIN').toUpperCase();
    const isPerso = targetType === 'PERSO';

    // 1. Collecte des cookies TOUS domaines confondus
    const allCookies = await getAllChatGPTCookies();

    if (!allCookies || allCookies.length === 0) {
      const msg = `⚠️ Aucun cookie trouvé. Ouvrez chatgpt.com et connectez-vous.`;
      await chrome.storage.local.set({ lastSyncStatus: msg, lastSyncTime: Date.now(), cookieCount: 0, sessionOk: false });
      return;
    }

    // 2. Vérification du jeton de session critique
    const sessionToken = allCookies.find(c =>
      c.name === '__Secure-next-auth.session-token' ||
      c.name === 'oai-sc' ||
      c.name === 'oai-hlib' ||
      c.name === '__cf_bm' ||
      c.name === 'cf_clearance'
    );
    const sessionOk = Boolean(sessionToken);

    // 3. Sauvegarde des cookies
    const jsonStr = JSON.stringify(allCookies);
    const keysToUpdate = isPerso
      ? [`CHATGPT_PERSO_COOKIES_${targetOp}`, `CHATGPT_PERSO_COOKIES`]
      : [`CHATGPT_WORK_COOKIES_${targetOp}`, `CHATGPT_COOKIES_${targetOp}`, `CHATGPT_COOKIES`];

    for (const keyName of keysToUpdate) {
      await saveKeyToSupabase(keyName, jsonStr);
    }

    // 4. Gestion URL de conversation : récupérer l'URL existante ET ne la mettre à jour que si une vraie URL /c/ ou /g/ est détectée
    const existingUrlKey = isPerso
      ? `CHATGPT_PERSO_CONVERSATION_URL_${targetOp}`
      : `CHATGPT_WORK_CONVERSATION_URL_${targetOp}`;

    const existingUrl = await getKeyFromSupabase(existingUrlKey);
    const activeUrl = conversationUrl || (await getActiveChatGPTUrl());

    // On enregistre l'URL seulement si c'est une vraie URL de conversation (pas juste chatgpt.com/)
    const isRealConvUrl = activeUrl && (activeUrl.includes('/c/') || activeUrl.includes('/g/g-'));
    if (isRealConvUrl) {
      await saveKeyToSupabase(existingUrlKey, activeUrl);
      await saveKeyToSupabase(`CHATGPT_CONVERSATION_URL_${targetOp}`, activeUrl);
      console.log(`[GMB Sync] URL de conversation enregistrée pour ${targetOp} : ${activeUrl}`);
    } else if (!existingUrl) {
      // Pas d'URL existante et pas de nouvelle → on laisse vide (l'agent n'ira pas sur une mauvaise URL)
      console.log(`[GMB Sync] Aucune URL de conversation /c/ détectée pour ${targetOp}. L'URL existante est conservée.`);
    }

    const typeLabel = isPerso ? 'Compte PERSO' : 'Compte PRO';
    const urlInfo = isRealConvUrl ? ` | URL ✅` : (existingUrl ? ` | URL conservée ✅` : ` | ⚠️ Pas d'URL`);
    const msg = sessionOk
      ? `✅ ${typeLabel} | ${allCookies.length} cookies | Session active ✅${urlInfo}`
      : `⚠️ ${typeLabel} | ${allCookies.length} cookies | Session ❌ (reconnectez-vous)${urlInfo}`;

    const saveObj = {
      lastSyncStatus: msg,
      lastSyncTime: Date.now(),
      cookieCount: allCookies.length,
      sessionOk,
      lastType: targetType,
      operatorName: targetOp
    };

    await chrome.storage.local.set(saveObj);

    return {
      status: 'DONE',
      count: allCookies.length,
      sessionOk,
      targetType,
      operator: targetOp,
      msg,
      url: isRealConvUrl ? activeUrl : existingUrl
    };

  } catch (err) {
    const errorObj = {
      lastSyncStatus: `❌ Erreur : ${err.message}`,
      lastSyncTime: Date.now(),
      sessionOk: false
    };
    await chrome.storage.local.set(errorObj);
    return { status: 'ERROR', message: err.message };
  }
}

// ─── Écouteur messages popup ───────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'SYNC_NOW') {
    syncCookiesToSupabase(msg.targetType || 'WORK', msg.operator, msg.conversationUrl)
      .then(res => sendResponse(res || { status: 'DONE' }))
      .catch(err => sendResponse({ status: 'ERROR', message: err.message }));
    return true;
  }
  if (msg.action === 'GET_STATUS') {
    getAllChatGPTCookies().then(cookies => {
      const sessionToken = cookies.find(c =>
        c.name === '__Secure-next-auth.session-token' ||
        c.name === 'oai-sc' ||
        c.name === 'oai-hlib' ||
        c.name === '__cf_bm' ||
        c.name === 'cf_clearance' ||
        c.name === '_puid' ||
        c.name === '__Secure-oai-is'
      );
      const sessionOk = Boolean(sessionToken);
      chrome.storage.local.get(['lastSyncStatus', 'lastSyncTime', 'cookieCount', 'operatorName', 'lastType'], (stored) => {
        sendResponse({
          ...stored,
          cookieCount: (cookies && cookies.length > 0) ? cookies.length : (stored.cookieCount || 0),
          sessionOk: sessionOk || stored.sessionOk || false
        });
      });
    }).catch(() => {
      chrome.storage.local.get(['lastSyncStatus', 'lastSyncTime', 'cookieCount', 'operatorName', 'lastType'], sendResponse);
    });
    return true;
  }
});

// ─── Auto-sync à chaque navigation sur une conversation ChatGPT ────────────────
if (chrome.webNavigation) {
  chrome.webNavigation.onCompleted.addListener((details) => {
    // Auto-sync cookies uniquement si c'est une conversation spécifique (pas la page d'accueil)
    if (details.url && (details.url.includes('chatgpt.com/c/') || details.url.includes('chatgpt.com/g/'))) {
      chrome.storage.local.get(['operatorName'], ({ operatorName }) => {
        if (operatorName) {
          syncCookiesToSupabase('WORK', operatorName, details.url);
        }
      });
    }
  }, { url: [{ hostContains: 'chatgpt.com' }] });
}
