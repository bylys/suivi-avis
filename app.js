// ── DECODO PROXY ──
const DECODO_PASS_RESIDENTIAL = 'ip+w63wR0kk5uBtAfS';  // mot de passe résidentiel (VAteamR)
const DECODO_PASS_MOBILE      = '5mF_i90ueyEEo0rJsd';  // mot de passe mobile (VATeam)

// ── THÈME SOMBRE / CLAIR (MODE NUIT / MODE JOUR) ──
function initTheme() {
  const savedTheme = localStorage.getItem('gmb_theme_preference');
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
  } else {
    document.body.classList.remove('light-theme');
  }
}

function toggleTheme() {
  const isLight = document.body.classList.toggle('light-theme');
  localStorage.setItem('gmb_theme_preference', isLight ? 'light' : 'dark');
  if (typeof updateStats === 'function') updateStats();
}

document.addEventListener('DOMContentLoaded', initTheme);
initTheme();

// ── SUPABASE REST API (sans CDN) ──
const SUPABASE_URL = 'https://rrbvghxmnimusfyqixau.supabase.co';
const SUPABASE_KEY = 'sb_publishable_k0nVhKHWUT5kBW9xBNpLkA_AKam7uBa';
const SB_HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': 'Bearer ' + SUPABASE_KEY,
  'Content-Type': 'application/json'
};

async function sbGet(table, params) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params || 'select=*'}`;
  const res = await fetch(url, { headers: SB_HEADERS });
  return res.ok ? await res.json() : [];
}

async function sbInsert(table, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...SB_HEADERS, 'Prefer': 'return=minimal' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('Supabase error:', err);
    alert('Erreur Supabase : ' + err);
  }
  return res.ok;
}

async function sbUpdate(table, id, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...SB_HEADERS, 'Prefer': 'return=minimal' },
    body: JSON.stringify(data)
  });
  return res.ok;
}

async function sbDelete(table, id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'DELETE',
    headers: SB_HEADERS
  });
  return res.ok;
}

// ── MOT DE PASSE ──
const PASSWORD = 'teamreview2026';

function checkPassword() {
  const val = (document.getElementById('pwd-input')?.value || '').trim();
  if (val === PASSWORD) {
    sessionStorage.setItem('gmb_auth', '1');
    const loginScreen = document.getElementById('login-screen');
    const appScreen = document.getElementById('app');
    if (loginScreen) loginScreen.classList.add('hidden');
    if (appScreen) appScreen.classList.remove('hidden');
    init().catch(err => console.error("Erreur d'initialisation:", err));
  } else {
    const pwdErr = document.getElementById('pwd-error');
    if (pwdErr) pwdErr.classList.remove('hidden');
  }
}

function logout() {
  sessionStorage.removeItem('gmb_auth');
  location.reload();
}

document.getElementById('pwd-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') checkPassword();
});

function togglePwd() {
  const input = document.getElementById('pwd-input');
  const btn   = document.getElementById('eye-btn');
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁';
  }
}

// ── DONNÉES ──
let _avisCache = null;
let _avisFetching = null;

async function getAvis() {
  if (_avisCache) return _avisCache;
  if (_avisFetching) return _avisFetching;
  _avisFetching = (async () => {
    const PAGE = 1000;
    let all = [], offset = 0;
    while (true) {
      const page = await sbGet('avis', `select=*&order=date.desc&limit=${PAGE}&offset=${offset}`);
      if (!page.length) break;
      all = all.concat(page);
      if (page.length < PAGE) break;
      offset += PAGE;
    }
    _avisCache = all;
    _avisFetching = null;
    return all;
  })();
  return _avisFetching;
}

function invalidateAvisCache() {
  _avisCache = null;
  _avisFetching = null;
}

let _statsArchiveCache = null;
async function getStatsArchive() {
  if (_statsArchiveCache) return _statsArchiveCache;
  _statsArchiveCache = await sbGet('stats_mensuelles', 'select=*&order=mois.desc');
  return _statsArchiveCache;
}

async function getAvisArchives(mois) {
  return await sbGet('avis_archives', `select=*&date=gte.${mois}-01&date=lt.${mois}-32&order=date.desc`);
}

let _fichesCache = null;
async function getFiches() {
  if (_fichesCache) return _fichesCache;
  _fichesCache = await sbGet('fiches', 'select=*&order=nom.asc');
  return _fichesCache;
}
function invalidateFichesCache() { _fichesCache = null; }

// ── INIT ──
async function init() {
  if (!sessionStorage.getItem('gmb_auth')) return;
  await populateFicheSelects();
  renderFiches();
  renderDashboard();
  renderListe();
  checkNotifications();

  const today = new Date().toISOString().split('T')[0];
  document.getElementById('form-date').value = today;

  const savedOperateur = localStorage.getItem('gmb_operateur');
  if (savedOperateur) document.getElementById('form-operateur').value = savedOperateur;

  // Restaurer clés API depuis localStorage
  const savedKey = localStorage.getItem('sheets_api_key');
  const savedId  = localStorage.getItem('sheets_id');
  if (savedKey) { const el = document.getElementById('sheets-api-key'); if (el) el.value = savedKey; }
  if (savedId)  { const el = document.getElementById('sheets-id');      if (el) el.value = savedId; }
  // Note : La clé API OpenAI directe est désormais remplacée par l'Agent IA DALL-E (Playwright & ChatGPT)

  // Restaurer config DonutBrowser
  const donutToken = localStorage.getItem('donut_token');
  const donutPort  = localStorage.getItem('donut_port');
  if (donutToken) { const el = document.getElementById('donut-token-input'); if (el) el.value = donutToken; }
  if (donutPort)  { const el = document.getElementById('donut-port-input');  if (el) el.value = donutPort; }
  const decodoType = localStorage.getItem('decodo_type');
  if (decodoType) { const el = document.getElementById('decodo-type-input'); if (el) el.value = decodoType; }
  const savedCount = parseInt(localStorage.getItem('gmb_img_count') || '0', 10);
  if (savedCount > 0) {
    const el = document.getElementById('img-gen-counter');
    if (el) el.textContent = `${savedCount} image${savedCount > 1 ? 's' : ''} générée${savedCount > 1 ? 's' : ''} au total`;
  }
  if (_imgRows.length === 0) addImgRow(); // Ligne vide par défaut dans le planning

  const yearSel = document.getElementById('dash-year');
  const currentYear = new Date().getFullYear();
  for (let y = currentYear; y >= currentYear - 4; y--) {
    const o = document.createElement('option');
    o.value = y; o.textContent = y;
    yearSel.appendChild(o);
  }
  yearSel.addEventListener('change', renderDashboard);
  document.getElementById('dash-month').addEventListener('change', renderDashboard);

  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
  document.getElementById('dash-month').value = currentMonth;
}

// ── TABS ──
function showTab(name) {
  document.querySelectorAll('.tab-content').forEach(s => s.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + name).classList.remove('hidden');
  event.target.classList.add('active');
  if (name === 'dashboard') renderDashboard();
  if (name === 'liste') renderListe();
  if (name === 'fiches') renderFiches();
  if (name === 'generateur') populateGenFiche();
  if (name === 'gmails') renderGmails();
  if (name === 'planning') renderPlanning();
}

// ── FICHES ──
async function populateFicheSelects() {
  const fiches = await getFiches();
  const options = fiches.map(f => `<option value="${f.nom.replace(/"/g,'&quot;')}">`).join('');
  ['datalist-form-fiche', 'datalist-dash-fiche', 'datalist-list-fiche'].forEach(id => {
    const dl = document.getElementById(id);
    if (dl) dl.innerHTML = options;
  });
}

// ── SYNC GOOGLE SHEET ──
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1AFawMjlZBCMj6Rq9q6cm9dqmzqNIz5vwtL181Cw3xpg/pub?output=csv&gid=0';

function parseCSV(text) {
  return text.split('\n').map(line => {
    const cols = [];
    let inQuote = false, cur = '';
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === ',' && !inQuote) {
        cols.push(cur.trim()); cur = '';
      } else {
        cur += ch;
      }
    }
    cols.push(cur.trim());
    return cols;
  });
}

async function syncFromSheet() {
  const btn = document.getElementById('btn-sync-sheet');
  const status = document.getElementById('sync-status');
  btn.disabled = true;
  btn.textContent = '⏳ Synchronisation...';
  status.textContent = '';

  try {
    const resp = await fetch(SHEET_CSV_URL);
    if (!resp.ok) throw new Error('Impossible de lire le sheet (vérifier la publication)');
    const text = await resp.text();
    const rows = parseCSV(text).slice(1); // skip header

    const fiches = await getFiches();
    const ficheMap = {};
    fiches.forEach(f => ficheMap[f.nom.toLowerCase()] = f);

    let added = 0, updated = 0, skipped = 0;

    for (const row of rows) {
      const nom  = (row[9]  || '').trim(); // Colonne J
      const lien = (row[10] || '').trim(); // Colonne K

      // Ignorer si pas de nom ou pas d'URL valide
      if (!nom || !lien.startsWith('http')) { skipped++; continue; }

      const existing = ficheMap[nom.toLowerCase()];
      if (existing) {
        // Mettre à jour le lien si différent
        if (existing.lien !== lien) {
          await sbUpdate('fiches', existing.id, { lien });
          updated++;
        } else {
          skipped++;
        }
      } else {
        await sbInsert('fiches', { nom, lien });
        ficheMap[nom.toLowerCase()] = { nom, lien };
        added++;
      }
    }

    btn.textContent = '🔄 Synchroniser depuis le Sheet';
    btn.disabled = false;
    status.textContent = `✅ ${added} ajoutée(s), ${updated} mise(s) à jour, ${skipped} ignorée(s)`;
    status.style.color = '#34d399';
    await populateFicheSelects();
    renderFiches();
  } catch (e) {
    btn.textContent = '🔄 Synchroniser depuis le Sheet';
    btn.disabled = false;
    status.textContent = '❌ ' + e.message;
    status.style.color = '#f87171';
  }
}

// ── SYNC GOOGLE SHEETS ──
const SHEETS_SHEET_NAME = 'Sheet1';

// Base du Worker proxy (même Worker que pour OpenAI). Vide = appels directs.
// Quand défini, les clés Gemini/Sheets vivent côté serveur : le site n'en envoie plus.
function _apiProxyBase() {
  return String(window.OPENAI_PROXY_URL || '').replace(/\/+$/, '');
}

function getSheetsApiKey() {
  const el = document.getElementById('sheets-api-key');
  return el?.value.trim() || localStorage.getItem('sheets_api_key') || '';
}
function getSheetsId() {
  const el = document.getElementById('sheets-id');
  return el?.value.trim() || localStorage.getItem('sheets_id') || '';
}

// Statuts Etat GMB qui déclenchent l'import
function etatEligible(etat) {
  if (!etat) return false;
  const e = etat.trim().toLowerCase();
  return e === 'ouvert' || e.includes('cours') || e.includes('validation');
}

async function syncFromSheets() {
  const apiKey = getSheetsApiKey();
  const sheetId = getSheetsId();
  const preview = document.getElementById('sync-preview');

  if (!apiKey) {
    preview.innerHTML = '<p style="color:#f87171;font-size:13px;">⚠️ Clé API Google Sheets manquante.</p>';
    return;
  }

  preview.innerHTML = '<p style="color:#64748b;font-size:13px;">⏳ Chargement du sheet…</p>';

  try {
    // Double fetch : includeGridData pour hyperlinks + FORMULA pour =HYPERLINK()
    const [resGrid, resFormula] = await Promise.all([
      fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?includeGridData=true&key=${apiKey}`),
      fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A:AJ?valueRenderOption=FORMULA&key=${apiKey}`)
    ]);
    if (!resGrid.ok) {
      const err = await resGrid.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${resGrid.status}`);
    }
    const data = await resGrid.json();
    const sheet = data.sheets?.[0];
    if (!sheet) throw new Error('Sheet vide ou inaccessible.');
    const gridData = sheet.data?.[0]?.rowData || [];
    if (gridData.length < 2) throw new Error('Sheet vide.');

    // Formules brutes pour extraire les HYPERLINK()
    const formulaRows = resFormula.ok ? (await resFormula.json()).values || [] : [];

    // Helper : valeur texte d'une cellule
    const cellText = cell => cell?.formattedValue?.trim() || '';
    // Helper : URL réelle d'une cellule (smartchip ou hyperlien)
    const cellLink = cell => {
      if (!cell) return '';
      // 1. Hyperlien direct
      if (cell.hyperlink) return cell.hyperlink;
      // 2. Formule =HYPERLINK("url","texte")
      const formula = cell.userEnteredValue?.formulaValue || '';
      if (formula.toUpperCase().includes('HYPERLINK')) {
        const m = formula.match(/HYPERLINK\s*\(\s*"([^"]+)"/i);
        if (m) return m[1];
      }
      // 3. Richtext runs (smartchips)
      for (const run of (cell.richTextValue?.runs || [])) {
        const uri = run.textFormat?.link?.uri;
        if (uri) return uri;
      }
      // 4. Valeur texte si c'est une URL
      const fv = cell.formattedValue?.trim() || '';
      if (fv.startsWith('http')) return fv;
      return '';
    };

function extractGoogleSignature(url) {
  if (!url) return null;
  try {
    const decoded = decodeURIComponent(url);
    const m1 = decoded.match(/(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)/);
    if (m1) return m1[1].toLowerCase();
    const m2 = decoded.match(/(ChIJ[a-zA-Z0-9_-]+)/);
    if (m2) return m2[1];
    const m3 = decoded.match(/[?&]cid=(\d+)/);
    if (m3) return 'cid_' + m3[1];
    const clean = decoded.split('?')[0].split('#')[0].replace(/\/$/, '').toLowerCase();
    return clean.length > 20 ? clean : null;
  } catch (e) {
    return url.split('?')[0].toLowerCase();
  }
}

    // Trouver indices depuis la ligne header (avec support multilignes)
    const headerRow = gridData[0]?.values || [];
    const headers = headerRow.map(c => cellText(c).toLowerCase().replace(/[\r\n]+/g, ' '));
    const idx = {
      siteUrl:      headers.findIndex(h => h.includes('url') && !h.includes('gmb')),
      nomSite:      headers.findIndex(h => h.includes('nom site')),
      etat:         headers.findIndex(h => h.includes('provider') || h.includes('etat') || h.includes('état') || h.includes('statut')),
      nomGmb:       headers.findIndex(h => h.includes('nom du gmb') || h.includes('nom gmb')),
      lien:         headers.findIndex(h => h.includes('lien du gmb') || h.includes('lien gmb') || h.includes('lien')),
      dateOuv:      headers.findIndex(h => h.includes("date d'ouverture") || h.includes("date ouverture")),
      avisInitiaux: headers.findIndex(h => h.includes('reviews') || h.includes('avis')),
      pays:         headers.findIndex(h => h === 'pays' || h.includes('pays'))
    };
    if (idx.siteUrl < 0)      idx.siteUrl = 1;
    if (idx.nomSite < 0)      idx.nomSite = 0;
    if (idx.etat < 0)         idx.etat = 9;  // Col J (Provider)
    if (idx.nomGmb < 0)       idx.nomGmb = 10; // Col K
    if (idx.lien < 0)         idx.lien = 11; // Col L
    if (idx.dateOuv < 0)      idx.dateOuv = 13; // Col N
    if (idx.avisInitiaux < 0) idx.avisInitiaux = 14; // Col O
    if (idx.pays < 0)         idx.pays = 4; // Col E

    // Parser les lignes éligibles
    const fromSheet = [];
    for (let i = 1; i < gridData.length; i++) {
      const cells   = gridData[i]?.values || [];
      const etat    = cellText(cells[idx.etat]);
      const nomSite = cellText(cells[idx.nomSite]);
      const nomGmb  = cellText(cells[idx.nomGmb])
                   || (formulaRows[i] ? (formulaRows[i][idx.nomGmb] || '').toString().trim() : '');
      const nom     = nomGmb || nomSite;
      const pays    = (cellText(cells[idx.pays]) || 'FR').toUpperCase();
      const siteUrl = cellLink(cells[idx.siteUrl]) || cellText(cells[idx.siteUrl]) || '';
      // Extraire URL : cellLink (hyperlink/richtext) puis fallback formule brute
      let lien = cellLink(cells[idx.lien]);
      if (!lien && formulaRows[i]) {
        const raw = formulaRows[i][idx.lien] || '';
        const m = raw.match(/HYPERLINK\s*\(\s*"([^"]+)"/i);
        if (m) lien = m[1];
        else if (raw.startsWith('http')) lien = raw;
      }

      const dateRaw = cellText(cells[idx.dateOuv]);

      if (!etatEligible(etat) || !nomSite || !dateRaw) continue; // lien optionnel pour l'import
      const avisRaw = parseInt(cellText(cells[idx.avisInitiaux]) || '0', 10);
      fromSheet.push({
        nom,
        nomGmb,
        nomSite,
        siteUrl,
        lien,
        pays,
        date_ouverture: dateRaw || null,
        avis_initiaux:  isNaN(avisRaw) ? 0 : avisRaw,
        etat:           etat.trim(),
      });
    }

    // Upsert : signature Google Maps > nom exact > nomSite > mots-clés
    const existantes = await getFiches();
    const normStr  = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').trim();
    const existantesParSig = {};
    const existantesParNom = {};
    existantes.forEach(f => {
      if (f.lien) {
        const sig = extractGoogleSignature(f.lien);
        if (sig) existantesParSig[sig] = f;
      }
      if (f.nom) {
        existantesParNom[normStr(f.nom)] = f;
      }
    });

    function findMatch(f) {
      if (f.lien) {
        const sig = extractGoogleSignature(f.lien);
        if (sig && existantesParSig[sig]) return existantesParSig[sig];
      }
      if (f.nom && existantesParNom[normStr(f.nom)]) return existantesParNom[normStr(f.nom)];
      if (f.nomSite && existantesParNom[normStr(f.nomSite)]) return existantesParNom[normStr(f.nomSite)];

      const searchTarget = f.nomGmb || f.nomSite;
      const words = normStr(searchTarget).split(/\s+/).filter(w => w.length > 2);
      if (words.length >= 2) {
        const candidates = existantes.filter(sb => {
          const sbNorm = normStr(sb.nom);
          return words.every(w => sbNorm.includes(w));
        });
        if (candidates.length === 1) return candidates[0];
        if (candidates.length > 1 && f.siteUrl) {
          const siteWords = normStr(f.siteUrl).split(/\s+|\/|\.|-/).filter(w => w.length > 3);
          let best = candidates[0], bestScore = -1;
          for (const sb of candidates) {
            const sbNorm = normStr(sb.nom);
            const score = siteWords.filter(w => sbNorm.includes(w)).length;
            if (score > bestScore) { bestScore = score; best = sb; }
          }
          return best;
        }
      }
      return null;
    }


    const aInserer = [];
    const aUpdater = [];
    fromSheet.forEach(f => {
      const match = findMatch(f);
      if (match) {
        // Si la fiche a déjà un lien ET une date → rien à mettre à jour
        if (match.lien && match.date_ouverture) return;
        aUpdater.push({ ...f, supabaseId: match.id, ancienNom: match.nom });
      } else {
        aInserer.push(f);
      }
    });

    // Badge
    const badge = document.getElementById('sync-badge');
    const total = aInserer.length + aUpdater.length;
    if (badge && total > 0) { badge.style.display = 'inline-block'; badge.textContent = `${total} fiches`; }
    else if (badge) badge.style.display = 'none';

    if (total === 0) {
      preview.innerHTML = `<p style="color:#22c55e;font-size:13px;">✅ Tout est déjà à jour (${existantes.length} fiches en base).</p>`;
      return;
    }

    const rowsInsert = aInserer.map((f, i) => `
      <tr style="border-bottom:1px solid #1e293b;">
        <td style="padding:8px 10px;">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
            <input type="checkbox" checked data-type="insert" data-idx="${i}" style="accent-color:#22c55e;width:14px;height:14px;" />
            <span style="color:#4ade80;font-size:10px;font-weight:600;background:#14532d;border-radius:4px;padding:1px 5px;">NOUVEAU</span>
            <span style="font-weight:500;color:#f1f5f9;">${f.nom}</span>
          </label>
        </td>
        <td style="padding:8px 10px;font-size:11px;padding:2px 8px;"><span style="border-radius:99px;background:${f.etat.toLowerCase()==='ouvert'?'#14532d':'#78350f'};color:${f.etat.toLowerCase()==='ouvert'?'#4ade80':'#fbbf24'};padding:2px 8px;">${f.etat}</span></td>
        <td style="padding:8px 10px;font-size:12px;color:#64748b;">${f.date_ouverture || '–'}</td>
        <td style="padding:8px 10px;"><a href="${f.lien}" target="_blank" style="color:#3b82f6;font-size:12px;">🔗</a></td>
      </tr>`).join('');

    const rowsUpdate = aUpdater.map((f, i) => `
      <tr style="border-bottom:1px solid #1e293b;">
        <td style="padding:8px 10px;">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
            <input type="checkbox" checked data-type="update" data-idx="${i}" style="accent-color:#f59e0b;width:14px;height:14px;" />
            <span style="color:#fbbf24;font-size:10px;font-weight:600;background:#78350f;border-radius:4px;padding:1px 5px;">MAJ</span>
            <span style="font-weight:500;color:#f1f5f9;">${f.nom}</span>
            ${f.ancienNom !== f.nom ? `<span style="font-size:11px;color:#475569;">← ${f.ancienNom}</span>` : ''}
          </label>
        </td>
        <td style="padding:8px 10px;font-size:11px;"><span style="border-radius:99px;background:${f.etat.toLowerCase()==='ouvert'?'#14532d':'#78350f'};color:${f.etat.toLowerCase()==='ouvert'?'#4ade80':'#fbbf24'};padding:2px 8px;">${f.etat}</span></td>
        <td style="padding:8px 10px;font-size:12px;color:#64748b;">${f.date_ouverture || '–'}</td>
        <td style="padding:8px 10px;"><a href="${f.lien}" target="_blank" style="color:#3b82f6;font-size:12px;">🔗</a></td>
      </tr>`).join('');

    preview.innerHTML = `
      <div style="margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
        <span style="font-size:13px;color:#94a3b8;">
          <span style="color:#4ade80;font-weight:600;">${aInserer.length} nouvelles</span>
          · <span style="color:#fbbf24;font-weight:600;">${aUpdater.length} à mettre à jour</span>
        </span>
        <div style="display:flex;gap:8px;">
          <button onclick="selectAllSync(true)"  style="background:none;border:1px solid #334155;color:#94a3b8;border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;">Tout cocher</button>
          <button onclick="selectAllSync(false)" style="background:none;border:1px solid #334155;color:#94a3b8;border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;">Tout décocher</button>
        </div>
      </div>
      <div style="background:#0a0f1a;border:1px solid #1e293b;border-radius:8px;overflow:hidden;margin-bottom:12px;max-height:380px;overflow-y:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead><tr style="background:#1e293b;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:.04em;">
            <th style="padding:8px 10px;text-align:left;">Nom du GMB</th>
            <th style="padding:8px 10px;text-align:left;">Statut</th>
            <th style="padding:8px 10px;text-align:left;">Date ouverture</th>
            <th style="padding:8px 10px;text-align:left;">Lien</th>
          </tr></thead>
          <tbody id="sync-rows">${rowsInsert}${rowsUpdate}</tbody>
        </table>
      </div>
      <button onclick="confirmSyncUpsert()" class="btn-primary">✅ Synchroniser</button>
      <span id="sync-status" style="margin-left:12px;font-size:13px;"></span>`;

    window._syncInsert = aInserer;
    window._syncUpdate = aUpdater;

  } catch(e) {
    preview.innerHTML = `<p style="color:#f87171;font-size:13px;">❌ Erreur : ${e.message}</p>`;
  }
}

function selectAllSync(val) {
  document.querySelectorAll('#sync-rows input[type=checkbox]').forEach(cb => cb.checked = val);
}

async function confirmSyncUpsert() {
  const status = document.getElementById('sync-status');
  const checkboxes = document.querySelectorAll('#sync-rows input[type=checkbox]');

  const toInsert = [];
  const toUpdate = [];
  checkboxes.forEach(cb => {
    if (!cb.checked) return;
    const type = cb.dataset.type;
    const i    = parseInt(cb.dataset.idx);
    if (type === 'insert' && window._syncInsert?.[i]) toInsert.push(window._syncInsert[i]);
    if (type === 'update' && window._syncUpdate?.[i]) toUpdate.push(window._syncUpdate[i]);
  });

  const total = toInsert.length + toUpdate.length;
  if (!total) { status.textContent = 'Aucune fiche sélectionnée.'; return; }
  status.textContent = `⏳ Synchronisation de ${total} fiches…`;

  let inserted = 0, updated = 0, err = 0;

  for (const f of toInsert) {
    const ok = await sbInsert('fiches', {
      nom: f.nom, lien: f.lien || null,
      date_ouverture: f.date_ouverture || null,
      avis_initiaux:  f.avis_initiaux  || 0,
    });
    if (ok) inserted++; else err++;
  }

  for (const f of toUpdate) {
    const ok = await sbUpdate('fiches', f.supabaseId, {
      nom: f.ancienNom,
      date_ouverture: f.date_ouverture || null,
    });
    if (ok) updated++; else err++;
  }

  status.innerHTML = [
    inserted ? `<span style="color:#22c55e;">✅ ${inserted} insérées</span>` : '',
    updated  ? `<span style="color:#fbbf24;">🔄 ${updated} mises à jour</span>` : '',
    err      ? `<span style="color:#f87171;">❌ ${err} erreurs</span>` : '',
  ].filter(Boolean).join(' · ');

  await populateFicheSelects();
  renderFiches();
}

async function addFiche(e) {
  e.preventDefault();
  const nom  = document.getElementById('fiche-nom').value.trim();
  const lien = document.getElementById('fiche-lien').value.trim();
  const pays = document.getElementById('fiche-pays').value || 'FR';
  if (!nom) return;
  const fiches = await getFiches();
  if (fiches.find(f => f.nom === nom)) return alert('Cette fiche existe déjà.');
  await sbInsert('fiches', { nom, lien: lien || null, pays });
  invalidateFichesCache();
  document.getElementById('fiche-nom').value = '';
  document.getElementById('fiche-lien').value = '';
  await populateFicheSelects();
  renderFiches();
}

async function deleteFiche(nom) {
  if (!confirm(`Supprimer la fiche "${nom}" ?`)) return;
  const fiches = await getFiches();
  const fiche = fiches.find(f => f.nom === nom);
  if (!fiche) return;
  await sbDelete('fiches', fiche.id);
  invalidateFichesCache();
  await populateFicheSelects();
  renderFiches();
}

// Map globale id → fiche pour éviter les problèmes d'échappement dans les onclick
const _ficheData = {};

const CATEGORIES_FICHES = [
  { key: 'elagage',      label: '🌿 Élagage / Abattage / Émondage', regex: /élag|elag|abatt|arborist|émondeur|emondeur|taille.*haie|dessouchage/i },
  { key: 'paysagiste',   label: '🌳 Paysagiste / Jardinage',         regex: /paysag|jardinage/i },
  { key: 'nettoyage',    label: '🧹 Nettoyage / Démoussage',         regex: /nettoy|démous|demouth|mousse/i },
  { key: 'ravalement',   label: '🏠 Ravalement / Façade',            regex: /ravel|façade|facade|enduit|crépi|isolation.*façade/i },
  { key: 'peintre',      label: '🎨 Peintre / Peinture',             regex: /peintr/i },
  { key: 'toiture',      label: '🔨 Couvreur / Toiture / Rénovation', regex: /couvreur|toiture|toit|zingu|ardoise|tuile|charpente|rénovation.*toit|renovation.*toit|reparation.*toit|réparation.*toit|étanchéité|etancheite|infiltration/i },
  { key: 'terrassement', label: '🏗️ Terrassement / VRD',            regex: /terrassement|terras|excavat|nivelle|vrd|assainissement/i },
  { key: 'carreleur',    label: '🪟 Carreleur',                       regex: /carrel/i },
  { key: 'vitrier',      label: '🪟 Vitrier / Miroiterie',            regex: /vitrier|vitri|miroiter|miroiterie|vitre/i },
  { key: 'depannage',    label: '🚗 Dépannage / Remorquage',          regex: /dépann|depann|remorquage/i },
  { key: 'debarras',     label: '📦 Débarras / Vide maison',          regex: /débarras|debarras|vide.*maison|vide.*appart|vide.*cave/i },
  { key: 'maconnerie',   label: '🪨 Maçonnerie',                      regex: /maçon|macon|béton|beton|dalle|parpaing/i },
  { key: 'autre',        label: '🔧 Autres',                          regex: /./ },
];

function getCatOverrides() {
  return JSON.parse(localStorage.getItem('cat_overrides') || '{}');
}

function setCatOverride(ficheId, catKey) {
  const ov = getCatOverrides();
  if (catKey === '') delete ov[ficheId];
  else ov[ficheId] = catKey;
  localStorage.setItem('cat_overrides', JSON.stringify(ov));
}

function categoriserFiche(f) {
  const nom = typeof f === 'string' ? f : f.nom;
  const id  = typeof f === 'string' ? null : f.id;
  if (id) {
    const ov = getCatOverrides();
    if (ov[id]) return ov[id];
  }
  for (const cat of CATEGORIES_FICHES) {
    if (cat.regex.test(nom)) return cat.key;
  }
  return 'autre';
}

function buildFicheLi(f, fiches, avis) {
  _ficheData[f.id] = f;
  const ficheAvis = avis.filter(a => a.fiche_nom === f.nom);
  const count = ficheAvis.length;
  const supprimes = ficheAvis.filter(a => a.statut === 'supprime').length;
  const total = (f.avis_initiaux || 0) + count - supprimes;
  const li = document.createElement('li');
  li.dataset.nom = f.nom;

  const row = document.createElement('div');
  row.className = 'fiche-row';

  const nomSpan = document.createElement('span');
  nomSpan.className = 'fiche-nom';
  if (f.lien) {
    const a = document.createElement('a');
    a.href = f.lien; a.target = '_blank'; a.rel = 'noopener';
    a.textContent = f.nom + ' 🔗';
    nomSpan.appendChild(a);
  } else {
    nomSpan.textContent = f.nom;
  }

  const actions = document.createElement('span');
  actions.className = 'fiche-actions';

  const countSpan = document.createElement('span');
  countSpan.className = 'count';
  countSpan.textContent = count + ' avis';

  const btnNom = document.createElement('button');
  btnNom.className = 'btn-edit-lien';
  btnNom.textContent = '✏️ Nom';
  btnNom.onclick = () => toggleNomEdit(f.id);

  const btnLien = document.createElement('button');
  btnLien.className = 'btn-edit-lien';
  btnLien.textContent = '🔗 Lien';
  btnLien.onclick = () => toggleLienEdit(f.id);

  const btnDate = document.createElement('button');
  btnDate.className = 'btn-edit-lien';
  btnDate.textContent = '📅 Date';
  btnDate.onclick = () => toggleDateEdit(f.id);

  const btnDataSEO = document.createElement('button');
  btnDataSEO.className = 'btn-dataforseo';
  btnDataSEO.textContent = '🔍 DataForSEO';
  btnDataSEO.title = 'Mettre à jour cette fiche via DataForSEO';
  btnDataSEO.onclick = () => syncSingleFicheDataForSEO(f.id, f.nom, f.pays);


  const btnMerge = document.createElement('button');
  btnMerge.className = 'btn-merge';
  btnMerge.textContent = '🔀 Fusionner';
  btnMerge.onclick = () => toggleMerge(f.id);

  const btnDel = document.createElement('button');
  btnDel.className = 'btn-delete';
  btnDel.textContent = '🗑';
  btnDel.onclick = () => deleteFiche(f.nom);

  actions.append(countSpan, btnNom, btnLien, btnDate, btnDataSEO, btnMerge, btnDel);

  row.append(nomSpan, actions);

  const statsBar = document.createElement('div');
  statsBar.className = 'fiche-stats-bar';
  const dateOuv = f.date_ouverture ? new Date(f.date_ouverture).toLocaleDateString('fr-FR') : '–';
  const avisInit = f.avis_initiaux != null ? f.avis_initiaux : '–';
  const currentCat = categoriserFiche(f);
  const catOptions = CATEGORIES_FICHES.filter(c => c.key !== 'autre')
    .map(c => `<option value="${c.key}" ${currentCat === c.key ? 'selected' : ''}>${c.label}</option>`)
    .join('');
  const PAYS_FLAGS = { FR: '🇫🇷', BE: '🇧🇪', LU: '🇱🇺', CA: '🇨🇦', US: '🇺🇸' };
  const paysFlag = PAYS_FLAGS[f.pays] || '🌍';
  statsBar.innerHTML =
    `<span>📅 ${dateOuv}</span>` +
    `<span>✍️ ${count} postés</span>` +
    (f.nb_avis_google != null ? `<span title="Mis à jour le ${f.nb_avis_updated_at || '?'}" style="color:#a78bfa;font-weight:600;">🌐 ${f.nb_avis_google} sur Google</span>` : '') +
    `<select onchange="savePays('${f.id}', this.value)" style="font-size:0.75rem;background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:4px;padding:2px 4px;">
      <option value="FR" ${(f.pays||'FR')==='FR'?'selected':''}>🇫🇷 FR</option>
      <option value="BE" ${f.pays==='BE'?'selected':''}>🇧🇪 BE</option>
      <option value="LU" ${f.pays==='LU'?'selected':''}>🇱🇺 LU</option>
      <option value="CA" ${f.pays==='CA'?'selected':''}>🇨🇦 CA</option>
      <option value="US" ${f.pays==='US'?'selected':''}>🇺🇸 US</option>
    </select>` +
    `<select class="cat-override-select" data-id="${f.id}" onchange="setCatOverride(this.dataset.id, this.value); renderFiches();" style="margin-left:auto;font-size:0.75rem;background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:4px;padding:2px 4px;">${catOptions}</select>`;

  const nomEdit = document.createElement('div');
  nomEdit.className = 'fiche-lien-edit hidden';
  nomEdit.id = 'nom-edit-' + f.id;

  const nomInput = document.createElement('input');
  nomInput.type = 'text';
  nomInput.className = 'lien-input';
  nomInput.id = 'nom-val-' + f.id;
  nomInput.value = f.nom;
  nomInput.placeholder = 'Nouveau nom de la fiche';

  const btnSaveNom = document.createElement('button');
  btnSaveNom.className = 'btn-save-lien';
  btnSaveNom.textContent = '✅ Renommer';
  btnSaveNom.onclick = () => saveNom(f.id);
  nomEdit.append(nomInput, btnSaveNom);

  const dateEdit = document.createElement('div');
  dateEdit.className = 'fiche-lien-edit hidden';
  dateEdit.id = 'date-edit-' + f.id;

  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.className = 'lien-input';
  dateInput.id = 'date-val-' + f.id;
  dateInput.value = f.date_ouverture || '';

  const btnSaveDate = document.createElement('button');
  btnSaveDate.className = 'btn-save-lien';
  btnSaveDate.textContent = '✅ Sauvegarder';
  btnSaveDate.onclick = () => saveDateOuverture(f.id);
  dateEdit.append(dateInput, btnSaveDate);

  const lienEdit = document.createElement('div');
  lienEdit.className = 'fiche-lien-edit hidden';
  lienEdit.id = 'lien-edit-' + f.id;

  const lienInput = document.createElement('input');
  lienInput.type = 'url';
  lienInput.className = 'lien-input';
  lienInput.id = 'lien-val-' + f.id;
  lienInput.value = f.lien || '';
  lienInput.placeholder = 'https://maps.google.com/...';

  const btnSaveLien = document.createElement('button');
  btnSaveLien.className = 'btn-save-lien';
  btnSaveLien.textContent = '✅ Sauvegarder';
  btnSaveLien.onclick = () => saveLien(f.id);
  lienEdit.append(lienInput, btnSaveLien);

  const mergeEdit = document.createElement('div');
  mergeEdit.className = 'fiche-merge-edit hidden';
  mergeEdit.id = 'merge-edit-' + f.id;

  const mergeLabel = document.createElement('span');
  mergeLabel.className = 'merge-label';
  mergeLabel.innerHTML = 'Fusionner vers :';

  const mergeWrap = document.createElement('div');
  mergeWrap.className = 'merge-autocomplete-wrap';

  const mergeInput = document.createElement('input');
  mergeInput.type = 'text';
  mergeInput.className = 'lien-input merge-search';
  mergeInput.id = 'merge-val-' + f.id;
  mergeInput.placeholder = 'Rechercher n\'importe où dans le nom...';
  mergeInput.autocomplete = 'off';

  const mergeDropdown = document.createElement('div');
  mergeDropdown.className = 'merge-dropdown hidden';
  const otherFiches = fiches.filter(x => x.id !== f.id);

  mergeInput.addEventListener('input', () => {
    const q = mergeInput.value.trim().toLowerCase();
    mergeDropdown.innerHTML = '';
    if (!q) { mergeDropdown.classList.add('hidden'); return; }
    const matches = otherFiches.filter(x => x.nom.toLowerCase().includes(q)).slice(0, 20);
    if (!matches.length) { mergeDropdown.classList.add('hidden'); return; }
    matches.forEach(x => {
      const item = document.createElement('div');
      item.className = 'merge-dropdown-item';
      item.textContent = x.nom;
      item.onmousedown = (e) => { e.preventDefault(); mergeInput.value = x.nom; mergeDropdown.classList.add('hidden'); };
      mergeDropdown.appendChild(item);
    });
    mergeDropdown.classList.remove('hidden');
  });
  mergeInput.addEventListener('blur', () => setTimeout(() => mergeDropdown.classList.add('hidden'), 150));

  mergeWrap.append(mergeInput, mergeDropdown);

  const btnMergeConfirm = document.createElement('button');
  btnMergeConfirm.className = 'btn-save-lien btn-merge-confirm';
  btnMergeConfirm.textContent = '✅ Fusionner & supprimer';
  btnMergeConfirm.onclick = () => mergeFiche(f.id);
  mergeEdit.append(mergeLabel, mergeWrap, btnMergeConfirm);

  li.append(row, statsBar, nomEdit, lienEdit, dateEdit, mergeEdit);
  return li;
}

async function renderFiches() {
  const [fiches, avis] = await Promise.all([getFiches(), getAvis()]);
  const container = document.getElementById('liste-fiches');
  // Mémoriser les catégories ouvertes avant de re-rendre
  const openCats = new Set();
  container.querySelectorAll('details[data-cat]').forEach(d => {
    if (d.open) openCats.add(d.dataset.cat);
  });
  container.innerHTML = '';
  if (!fiches.length) {
    container.innerHTML = '<p class="empty-state">Aucune fiche ajoutée.</p>';
    return;
  }

  // Tri
  const sortVal = (document.getElementById('fiches-sort') || {}).value || 'nom-asc';
  const avisCount = {};
  const avisPostes = {};
  avis.forEach(a => { avisCount[a.fiche_nom] = (avisCount[a.fiche_nom] || 0) + (a.statut !== 'supprime' ? 1 : 0); avisPostes[a.fiche_nom] = (avisPostes[a.fiche_nom] || 0) + 1; });
  fiches.sort((a, b) => {
    const totalA = (a.avis_initiaux || 0) + (avisPostes[a.nom] || 0) - ((avisPostes[a.nom] || 0) - (avisCount[a.nom] || 0));
    const totalB = (b.avis_initiaux || 0) + (avisPostes[b.nom] || 0) - ((avisPostes[b.nom] || 0) - (avisCount[b.nom] || 0));
    if (sortVal === 'nom-asc')     return a.nom.localeCompare(b.nom, 'fr');
    if (sortVal === 'nom-desc')    return b.nom.localeCompare(a.nom, 'fr');
    if (sortVal === 'total-desc')  return totalB - totalA;
    if (sortVal === 'total-asc')   return totalA - totalB;
    if (sortVal === 'posted-desc') return (avisPostes[b.nom] || 0) - (avisPostes[a.nom] || 0);
    if (sortVal === 'posted-asc')  return (avisPostes[a.nom] || 0) - (avisPostes[b.nom] || 0);
    if (sortVal === 'init-desc')   return (b.avis_initiaux || 0) - (a.avis_initiaux || 0);
    if (sortVal === 'init-asc')    return (a.avis_initiaux || 0) - (b.avis_initiaux || 0);
    if (sortVal === 'google-desc') return (b.nb_avis_google ?? -1) - (a.nb_avis_google ?? -1);
    if (sortVal === 'google-asc')  return (a.nb_avis_google ?? Infinity) - (b.nb_avis_google ?? Infinity);
    return 0;
  });

  // Filtre
  const filterVal = (document.getElementById('fiches-filter') || {}).value || 'all';
  let fichesFiltrees = fiches;
  if (filterVal === 'no-lien')        fichesFiltrees = fiches.filter(f => !f.lien);
  if (filterVal === 'no-avis-google') fichesFiltrees = fiches.filter(f => f.nb_avis_google == null);

  // Grouper par catégorie
  const groups = {};
  CATEGORIES_FICHES.forEach(c => groups[c.key] = []);
  fichesFiltrees.forEach(f => {
    const cat = categoriserFiche(f);
    groups[cat].push(f);
  });

  CATEGORIES_FICHES.forEach(cat => {
    const items = groups[cat.key];
    if (!items.length) return;

    const details = document.createElement('details');
    details.className = 'fiche-category';
    details.dataset.cat = cat.key;
    details.open = openCats.has(cat.key);

    const summary = document.createElement('summary');
    summary.className = 'fiche-category-header';
    summary.innerHTML = cat.label + ' <span class="cat-count">' + items.length + '</span>';
    details.appendChild(summary);

    const ul = document.createElement('ul');
    ul.className = 'fiche-category-list';
    items.forEach(f => ul.appendChild(buildFicheLi(f, fiches, avis)));
    details.appendChild(ul);
    container.appendChild(details);
  });

}

function filterFiches(q) {
  const query = q.trim().toLowerCase();
  document.querySelectorAll('#liste-fiches details[data-cat]').forEach(details => {
    let anyVisible = false;
    details.querySelectorAll('li[data-nom]').forEach(li => {
      const match = !query || li.dataset.nom.toLowerCase().includes(query);
      li.style.display = match ? '' : 'none';
      if (match) anyVisible = true;
    });
    details.style.display = anyVisible ? '' : 'none';
    if (query && anyVisible) details.open = true;
  });
}

// ── DATAFORSEO API INTEGRATION (PRECISION CIBLÉE) ──

async function resolveShortUrl(lien) {
  if (!lien) return '';
  if (!lien.includes('goo.gl')) return lien;
  try {
    const res = await fetch(lien, { method: 'HEAD', redirect: 'follow' });
    return res.url || lien;
  } catch (e) {
    return lien;
  }
}

async function callDataForSEOMapsLive(fiche, countryCode = 'FR') {
  const auth = (window._APP_CONFIG && window._APP_CONFIG.dataforseo_auth)
    || 'bWFydmluQGFsbG8tY2hhbnRpZXJzLmZyOjg4MDdmYjNlYzg4MzUxZTU=';
  const locationCodes = { FR: 2250, BE: 2056, LU: 2442, CA: 2124, US: 2840 };
  const locCode = locationCodes[countryCode] || 2250;

  const nom = typeof fiche === 'string' ? fiche : (fiche?.nom || '');
  const lien = typeof fiche === 'object' ? fiche?.lien : null;

  // Si URL Google Maps présente, la résoudre et l'utiliser en cible exacte
  let searchTarget = nom;
  if (lien && (lien.includes('google.com/maps') || lien.includes('goo.gl'))) {
    searchTarget = await resolveShortUrl(lien);
  }

  const response = await fetch('https://api.dataforseo.com/v3/serp/google/maps/live/advanced', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([{
      keyword: searchTarget,
      location_code: locCode,
      language_code: 'fr'
    }])
  });

  if (!response.ok) {
    throw new Error(`DataForSEO HTTP ${response.status}`);
  }

  const data = await response.json();
  const tasks = data.tasks || [];
  if (!tasks.length || !tasks[0].result || !tasks[0].result.length) {
    return null;
  }

  const items = tasks[0].result[0].items || [];
  if (!items.length) return null;

  const mapsItems = items.filter(i => i.type === 'maps_search');
  if (!mapsItems.length) return null;

  // Si recherche par URL exacte -> le 1er résultat est la fiche cible 100% exacte
  if (searchTarget.includes('google.com/maps')) {
    return mapsItems[0];
  }

  // Recherche par nom générique : vérification stricte des jetons pour éviter les faux positifs
  const normStr = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').trim();
  const targetTokens = normStr(nom).split(/\s+/).filter(w => w.length > 2);

  let bestMatch = null;
  let bestScore = -1;

  mapsItems.forEach(item => {
    const titleTokens = normStr(item.title).split(/\s+/).filter(w => w.length > 2);
    let overlap = 0;
    targetTokens.forEach(t => { if (titleTokens.includes(t)) overlap++; });
    if (overlap > bestScore) {
      bestScore = overlap;
      bestMatch = item;
    }
  });

  if (targetTokens.length > 0 && bestScore < 1) {
    return null; // Évite de prendre une entreprise concurrente au hasard
  }

  return bestMatch;
}

async function syncSingleFicheDataForSEO(ficheId, ficheNom, pays = 'FR') {
  showToast(`🔍 Recherche DataForSEO pour "${ficheNom}"...`, 'info');
  try {
    const fiches = await sbGet('fiches', `id=eq.${ficheId}`);
    const targetFiche = (fiches && fiches.length) ? fiches[0] : { id: ficheId, nom: ficheNom, pays: pays };

    const match = await callDataForSEOMapsLive(targetFiche, targetFiche.pays || pays);
    if (!match) {
      showToast(`⚠️ Aucune fiche DataForSEO correspondante trouvée pour "${ficheNom}"`, 'warn');
      return;
    }

    const ratingInfo = match.rating || {};
    const nbAvis = ratingInfo.votes_count != null ? ratingInfo.votes_count : 0;
    const ratingVal = ratingInfo.value || 0;
    const today = new Date().toISOString().split('T')[0];

    const ok = await sbUpdate('fiches', ficheId, {
      nb_avis_google: nbAvis,
      nb_avis_updated_at: today
    });

    if (ok) {
      showToast(`✅ ${match.title || ficheNom} : ${nbAvis} avis Google (${ratingVal}⭐) mis à jour !`, 'success');
      renderFiches();
    } else {
      showToast(`❌ Échec de la mise à jour Supabase pour "${ficheNom}"`, 'error');
    }
  } catch (err) {
    console.error('Erreur DataForSEO:', err);
    showToast(`❌ Erreur DataForSEO: ${err.message}`, 'error');
  }
}

async function syncAllFichesDataForSEO() {
  const btn1 = document.getElementById('btn-sync-dataforseo');
  const btn2 = document.getElementById('btn-sync-dataforseo-top');
  if (btn1) { btn1.disabled = true; btn1.textContent = '⌛ Sync en cours...'; }
  if (btn2) { btn2.disabled = true; btn2.textContent = '⌛ Sync en cours...'; }

  try {
    const fiches = await sbGet('fiches');
    if (!fiches || !fiches.length) {
      showToast('Aucune fiche à synchroniser.', 'warn');
      return;
    }

    showToast(`🚀 Lancement de la sync DataForSEO pour ${fiches.length} fiches...`, 'info');

    let updated = 0;
    let failed = 0;
    const today = new Date().toISOString().split('T')[0];

    for (let i = 0; i < fiches.length; i++) {
      const f = fiches[i];
      try {
        const match = await callDataForSEOMapsLive(f, f.pays || 'FR');
        if (match) {
          const ratingInfo = match.rating || {};
          const nbAvis = ratingInfo.votes_count != null ? ratingInfo.votes_count : 0;
          await sbUpdate('fiches', f.id, {
            nb_avis_google: nbAvis,
            nb_avis_updated_at: today
          });
          updated++;
        } else {
          failed++;
        }
      } catch (e) {
        console.warn(`DataForSEO error on ${f.nom}:`, e);
        failed++;
      }
      await new Promise(r => setTimeout(r, 200));
    }

    showToast(`✅ Sync DataForSEO terminée ! ${updated} fiches mises à jour (${failed} non trouvées/ignorées).`, 'success');
    renderFiches();
  } catch (err) {
    console.error('Erreur sync DataForSEO:', err);
    showToast(`❌ Erreur lors de la sync DataForSEO: ${err.message}`, 'error');
  } finally {
    if (btn1) { btn1.disabled = false; btn1.textContent = '🔄 Sync Avis GMB'; }
    if (btn2) { btn2.disabled = false; btn2.textContent = '🔄 Sync Avis GMB'; }
  }
}




function toggleMerge(id) {
  const div = document.getElementById(`merge-edit-${id}`);
  div.classList.toggle('hidden');
  if (!div.classList.contains('hidden')) {
    const input = div.querySelector('.merge-search');
    if (input) input.focus();
  }
}

async function mergeFiche(id) {
  const fiche = _ficheData[id];
  if (!fiche) return;
  const nomSource = fiche.nom;
  const nomCible = document.getElementById('merge-val-' + id).value;
  if (!nomCible) return;
  if (!confirm('Réassigner tous les avis de "' + nomSource + '" vers "' + nomCible + '" et supprimer "' + nomSource + '" ?')) return;

  // Récupérer tous les avis de la fiche source
  const avisSource = await sbGet('avis', 'select=id&fiche_nom=eq.' + encodeURIComponent(nomSource));

  // Réassigner chaque avis vers la fiche cible
  for (const a of avisSource) {
    await sbUpdate('avis', a.id, { fiche_nom: nomCible });
  }

  // Supprimer la fiche source
  const res = await fetch(SUPABASE_URL + '/rest/v1/fiches?id=eq.' + id, {
    method: 'DELETE', headers: SB_HEADERS
  });

  if (res.ok) {
    await populateFicheSelects();
    renderFiches();
  } else {
    alert('Erreur lors de la fusion.');
  }
}

function toggleNomEdit(id) {
  const div = document.getElementById(`nom-edit-${id}`);
  div.classList.toggle('hidden');
  if (!div.classList.contains('hidden')) {
    document.getElementById(`nom-val-${id}`).focus();
  }
}

async function saveNom(id) {
  const oldNom = _ficheData[id].nom;
  const newNom = document.getElementById('nom-val-' + id).value.trim();
  if (!newNom || newNom === oldNom) { toggleNomEdit(id); return; }
  if (!confirm(`Renommer "${oldNom}" en "${newNom}" ?\n\nTous les avis associés seront mis à jour.`)) return;

  // Mettre à jour le nom de la fiche
  const ok = await sbUpdate('fiches', id, { nom: newNom });
  if (!ok) { alert('Erreur lors du renommage.'); return; }

  // Mettre à jour en masse tous les avis liés à l'ancien nom
  await fetch(`${SUPABASE_URL}/rest/v1/avis?fiche_nom=eq.${encodeURIComponent(oldNom)}`, {
    method: 'PATCH',
    headers: { ...SB_HEADERS, 'Prefer': 'return=minimal' },
    body: JSON.stringify({ fiche_nom: newNom })
  });

  await populateFicheSelects();
  renderFiches();
}

function toggleLienEdit(id) {
  const div = document.getElementById(`lien-edit-${id}`);
  div.classList.toggle('hidden');
  if (!div.classList.contains('hidden')) {
    document.getElementById(`lien-val-${id}`).focus();
  }
}

function toggleDateEdit(id) {
  const div = document.getElementById(`date-edit-${id}`);
  div.classList.toggle('hidden');
  if (!div.classList.contains('hidden')) {
    document.getElementById(`date-val-${id}`).focus();
  }
}

async function saveDateOuverture(id) {
  const val = document.getElementById('date-val-' + id).value;
  const ok = await sbUpdate('fiches', id, { date_ouverture: val || null });
  if (ok) {
    renderFiches();
  } else {
    alert('Erreur lors de la sauvegarde de la date.');
  }
}

async function saveLien(id) {
  const lien = document.getElementById('lien-val-' + id).value.trim();
  const ok = await sbUpdate('fiches', id, { lien: lien || null });
  if (ok) {
    await populateFicheSelects();
    renderFiches();
  } else {
    alert('Erreur lors de la sauvegarde du lien.');
  }
}

async function savePays(id, pays) {
  await sbUpdate('fiches', id, { pays });
  invalidateFichesCache();
  renderFiches();
}

// ── SAISIE ──
let selectedNote = 5;

function setNote(n) {
  selectedNote = n;
  const formNote = document.getElementById('form-note');
  if (formNote) formNote.value = n;
  updateStarPickerDisplay(n);
}

function updateStarPickerDisplay(n) {
  const stars = document.querySelectorAll('.star-picker span');
  stars.forEach((s, i) => {
    if (i < n) {
      s.style.color = '#f59e0b';
      s.style.opacity = '1';
    } else {
      s.style.color = '#cbd5e1';
      s.style.opacity = '0.3';
    }
  });
  const textBadge = document.getElementById('star-text-badge');
  if (textBadge) {
    textBadge.textContent = n > 0 ? `(${n}/5 ⭐)` : '(Choisir une note)';
  }
}

async function submitAvis(e) {
  e.preventDefault();
  const fiche_nom   = document.getElementById('form-fiche').value.trim();
  const opEl        = document.getElementById('form-operateur');
  const operateur   = opEl ? opEl.value.trim() : '';
  const auteur      = document.getElementById('form-auteur').value.trim();
  const note        = parseInt(document.getElementById('form-note').value);
  const date        = document.getElementById('form-date').value;
  const statut      = document.getElementById('form-statut').value;
  const texte       = document.getElementById('form-texte').value.trim();
  const lien        = document.getElementById('form-lien').value.trim();
  const reponse     = document.getElementById('form-reponse').value.trim();
  const photo       = document.getElementById('form-photo').checked;

  if (!fiche_nom || !auteur || !note || !date || !statut) return;

  if (operateur) localStorage.setItem('gmb_operateur', operateur);

  const today = new Date().toISOString().split('T')[0];
  const ok = await sbInsert('avis', {
    fiche_nom, operateur, auteur, note, date, statut, photo,
    texte: texte || null,
    lien: lien || null,
    reponse: reponse || null,
    statut_date: date
  });
  if (!ok) { alert('Erreur lors de l\'enregistrement.'); return; }
  invalidateAvisCache();

  document.getElementById('form-avis').reset();
  if (opEl) opEl.value = operateur;
  document.getElementById('form-photo').checked = false;
  selectedNote = 0;
  document.getElementById('star-display').textContent = '☆☆☆☆☆';
  document.querySelectorAll('.star-picker span').forEach(s => s.style.opacity = '1');
  document.getElementById('form-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('form-note').value = '';

  const msg = document.getElementById('form-success');
  msg.classList.remove('hidden');
  setTimeout(() => msg.classList.add('hidden'), 3000);
  renderFiches();
}

// ── LISTE ──
const MOIS_LABELS = ['Janvier','FÃ©vrier','Mars','Avril','Mai','Juin','Juillet','AoÃ» t','Septembre','Octobre','Novembre','DÃ©cembre'];

const STATUT_LABELS = {
  j0:       { label: 'Posté J+0',              color: '#38bdf8' },
  j7:       { label: 'Posté J+7',              color: '#fbbf24' },
  j14:      { label: 'Posté J+14',             color: '#f59e0b' },
  j21:      { label: 'Posté J+21',             color: '#f97316' },
  j30:      { label: 'Posté J+30',             color: '#22c55e' },
  supprime: { label: 'Supprimé (à été fait)',  color: '#ef4444' }
};

function updateSelectStatusClass(selectEl) {
  if (!selectEl) return;
  selectEl.className = selectEl.className.replace(/\bstatus-\S+/g, '').trim();
  selectEl.classList.add(`status-${selectEl.value}`);
}

function buildAvisRow(a, rappelsDus, aVerif) {
  const st = STATUT_LABELS[a.statut] || { label: a.statut || '–', color: '#999' };
  const needsVerif = aVerif.includes(a.id);
  const verifLabel = needsVerif ? rappelsDus.find(d => d.avis.id === a.id)?.label : null;
  const todayStr = new Date().toISOString().slice(0, 10);
  const isAutoUpdatedToday = a.statut_date === todayStr && !needsVerif && a.statut !== 'j0';
  const statusClass = `status-${a.statut || 'pending'}`;
  
  return `<tr class="${needsVerif ? 'avis-a-verifier avis-orange' : isAutoUpdatedToday ? 'avis-auto-updated' : ''}">
    <td data-label="Date" class="avis-date">
      <input type="date" class="date-inline" value="${a.date}" onchange="updateDate('${a.id}', this.value)" />
    </td>
    <td data-label="Fiche"><span class="avis-fiche">${a.fiche_nom}</span></td>
    <td data-label="Opér." style="font-size:0.85rem;" class="avis-op-cell">${a.operateur || '–'}</td>
    <td data-label="Gmail" class="avis-auteur">${a.auteur}</td>
    <td data-label="Note" class="avis-stars">${'★'.repeat(a.note)}${'☆'.repeat(5-a.note)}</td>
    <td data-label="Statut">
      <select class="statut-inline ${statusClass}" onchange="updateStatut('${a.id}', this.value); updateSelectStatusClass(this);">
        ${Object.entries(STATUT_LABELS).map(([k,v]) =>
          `<option value="${k}" ${a.statut===k?'selected':''}>${v.label}</option>`
        ).join('')}
      </select>
    </td>
    <td data-label="Rappel">${needsVerif ? `<span class="avis-rappel">🔔 ${verifLabel}</span>` : isAutoUpdatedToday ? `<span class="avis-auto-badge">🤖 Auto ${st.label}</span>` : ''}</td>
    <td data-label="Photo/Lien" class="td-photo-lien">${a.photo ? '📷' : ''}${a.lien ? `&nbsp;<a href="${a.lien}" target="_blank" rel="noopener" title="Voir l'avis">🔗</a>` : ''}</td>
    <td data-label="Avis" class="col-texte">${a.texte || ''}</td>
    <td><button class="btn-delete" onclick="deleteAvis('${a.id}')">🗑</button></td>
  </tr>`;
}

async function renderListe(openMonths = null) {
  const allAvisForRappels = await getAvis(); // tous les avis pour les rappels (pas filtrés)
  let avis = [...allAvisForRappels];
  const fiche  = document.getElementById('list-fiche').value.trim();
  const month  = document.getElementById('list-month').value;
  const note   = document.getElementById('list-note').value;
  const statut = document.getElementById('list-statut').value;

  const rappelsDusIds = new Set(getRappelsDus(allAvisForRappels).map(d => d.avis.id));

  if (fiche)  avis = avis.filter(a => a.fiche_nom === fiche);
  // Filtre mois : garder aussi les avis oranges des autres mois
  if (month)  avis = avis.filter(a => a.date.startsWith(month) || rappelsDusIds.has(a.id));
  if (note)   avis = avis.filter(a => a.note === parseInt(note));
  if (statut) avis = avis.filter(a => a.statut === statut);

  avis.sort((a, b) => b.date.localeCompare(a.date));

  const el = document.getElementById('liste-avis');
  if (!avis.length) {
    el.innerHTML = '<p class="empty-state">Aucun avis pour ces filtres.</p>';
    renderRappelsBanner(getRappelsDus(allAvisForRappels));
    return;
  }

  const rappelsDus = getRappelsDus(allAvisForRappels);
  const aVerif = rappelsDus.map(d => d.avis.id);

  // Grouper par mois
  const byMonth = {};
  avis.forEach(a => {
    const m = a.date.slice(0, 7);
    if (!byMonth[m]) byMonth[m] = [];
    byMonth[m].push(a);
  });
  // Inclure les mois archivés (stats_mensuelles) qui ne sont pas déjà dans les avis récents
  const statsArchive = await getStatsArchive();
  const archByMonth = {};
  statsArchive.forEach(s => {
    if (!archByMonth[s.mois]) archByMonth[s.mois] = { nb_avis: 0, nb_j30: 0, nb_supprimes: 0 };
    archByMonth[s.mois].nb_avis += s.nb_avis;
    archByMonth[s.mois].nb_j30 += s.nb_j30;
    archByMonth[s.mois].nb_supprimes += s.nb_supprimes;
  });
  // Fusionner : mois récents + mois archives-only
  const allMonths = new Set([...Object.keys(byMonth), ...Object.keys(archByMonth)]);
  const sortedMonths = [...allMonths].sort((a, b) => b.localeCompare(a));

  const tableHead = `<table class="avis-table">
    <thead><tr>
      <th>Date</th><th>Fiche GMB</th><th>Opérateur</th><th>Gmail</th><th>Note</th>
      <th>Statut</th><th>Rappel</th><th>Photo</th><th>Lien</th><th>Avis</th><th></th>
    </tr></thead>`;

  el.innerHTML = sortedMonths.map((m, idx) => {
    const [year, mo] = m.split('-');
    const label = `${MOIS_LABELS[parseInt(mo)-1]} ${year}`;
    const hasRecent  = byMonth[m] && byMonth[m].length > 0;
    const hasArchive = archByMonth[m] && archByMonth[m].nb_avis > 0;

    if (hasRecent) {
      const rows = byMonth[m].map(a => buildAvisRow(a, rappelsDus, aVerif)).join('');
      const suppCount = byMonth[m].filter(a => a.statut === 'supprime').length;
      const j30Count  = byMonth[m].filter(a => a.statut === 'j30').length;
      const isOpen = openMonths ? openMonths.has(m) : idx === 0;
      return `<details class="month-group" data-month="${m}" ${isOpen ? 'open' : ''}>
        <summary class="month-summary">
          <span class="month-label">📅 ${label}</span>
          <span class="month-badges">
            <span class="badge-total">${byMonth[m].length} avis</span>
            <span class="badge-supprime">${suppCount} supprimés</span>
            <span class="badge-j30">${j30Count} J+30</span>
          </span>
        </summary>
        ${tableHead}<tbody>${rows}</tbody></table>
      </details>`;
    }

    // Mois archivé uniquement
    const a = archByMonth[m];
    const isOpen = openMonths ? openMonths.has(m) : false;
    return `<details class="month-group" data-month="${m}" ${isOpen ? 'open' : ''}>
      <summary class="month-summary">
        <span class="month-label">📅 ${label} <span style="color:#94a3b8;font-size:12px;margin-left:6px">📦 archivé</span></span>
        <span class="month-badges">
          <span class="badge-total">${a.nb_avis} avis</span>
          <span class="badge-supprime">${a.nb_supprimes} supprimés</span>
          <span class="badge-j30">${a.nb_j30} J+30</span>
        </span>
      </summary>
      <div id="archive-${m}" style="padding:16px;text-align:center;">
        <p style="color:#94a3b8;margin-bottom:12px;">📦 ${a.nb_avis} avis archivés</p>
        <button onclick="loadArchivedMonth('${m}')" style="background:#6366f1;color:white;border:none;padding:8px 20px;border-radius:8px;cursor:pointer;font-size:14px;">Voir les détails</button>
      </div>
    </details>`;
  }).join('');

  renderRappelsBanner(rappelsDus);
}

async function loadArchivedMonth(mois) {
  const container = document.getElementById('archive-' + mois);
  if (!container) return;
  container.innerHTML = '<p style="color:#94a3b8;">Chargement...</p>';
  const archived = await getAvisArchives(mois);
  if (!archived.length) {
    container.innerHTML = '<p style="color:#94a3b8;">Aucun avis archivé pour ce mois.</p>';
    return;
  }
  const tableHead = `<table class="avis-table">
    <thead><tr>
      <th>Date</th><th>Fiche GMB</th><th>Opérateur</th><th>Gmail</th><th>Note</th>
      <th>Statut</th><th>Rappel</th><th>Photo</th><th>Lien</th><th>Avis</th><th></th>
    </tr></thead>`;
  const rows = archived.map(a => buildAvisRow(a, [], [])).join('');
  container.innerHTML = tableHead + '<tbody>' + rows + '</tbody></table>';
}
window.loadArchivedMonth = loadArchivedMonth;

async function updateDate(id, newDate) {
  await sbUpdate('avis', id, { date: newDate });
  invalidateAvisCache();
  const openMonths = new Set();
  document.querySelectorAll('.month-group[open]').forEach(el => {
    openMonths.add(el.dataset.month);
  });
  await renderListe(openMonths);
}

async function updateStatut(id, newStatut) {
  const today = new Date().toISOString().split('T')[0];
  await sbUpdate('avis', id, { statut: newStatut, statut_date: today });
  invalidateAvisCache();
  // Sauvegarder quels mois sont ouverts avant de re-rendre
  const openMonths = new Set();
  document.querySelectorAll('.month-group[open]').forEach(el => {
    openMonths.add(el.dataset.month);
  });
  await renderListe(openMonths);
}

async function deleteAvis(id) {
  if (!confirm('Supprimer cet avis ?')) return;
  await sbDelete('avis', id);
  invalidateAvisCache();
  renderListe();
  renderFiches();
}

// ── DASHBOARD ──
let chartVolume, chartNote;

async function renderDashboard() {
  const [avisRecents, statsArchive] = await Promise.all([getAvis(), getStatsArchive()]);
  const fiche = document.getElementById('dash-fiche')?.value.trim() || '';
  const year  = parseInt(document.getElementById('dash-year')?.value || new Date().getFullYear());
  const month = document.getElementById('dash-month')?.value || '';
  const selectedMonth = month ? `${year}-${month}` : '';

  // Avis récents filtrés
  let avis = avisRecents;
  if (fiche) avis = avis.filter(a => a.fiche_nom === fiche);
  avis = avis.filter(a => parseInt(a.date.slice(0, 4)) === year);
  const moisAvis = selectedMonth ? avis.filter(a => a.date.startsWith(selectedMonth)) : avis;

  // Stats archivées filtrées sur l'année (et mois/fiche si sélectionnés)
  let archFiltered = statsArchive.filter(s => s.mois.startsWith(String(year)));
  if (fiche) archFiltered = archFiltered.filter(s => s.fiche_nom === fiche);
  if (selectedMonth) archFiltered = archFiltered.filter(s => s.mois === selectedMonth);

  // Totaux combinés (récents + archives)
  const totalAvis = moisAvis.length + archFiltered.reduce((s, r) => s + r.nb_avis, 0);
  const totalJ30  = moisAvis.filter(a => a.statut === 'j30').length + archFiltered.reduce((s, r) => s + r.nb_j30, 0);
  const totalSupp = moisAvis.filter(a => a.statut === 'supprime').length + archFiltered.reduce((s, r) => s + r.nb_supprimes, 0);
  const resolus = totalJ30 + totalSupp;
  const tauxSurvie = resolus > 0 ? Math.round((totalJ30 / resolus) * 100) + ' %' : '–';

  // Compteurs & Leaderboard par opérateur (récents + archives)
  const VAS = ['kevin','fifaliana','kintana','anjara','aina','korail'];
  const teamStats = [];

  VAS.forEach(va => {
    const fromRecent  = moisAvis.filter(a => (a.operateur || '').toLowerCase().includes(va)).length;
    const fromArchive = archFiltered.filter(s => (s.operateur || '').toLowerCase().includes(va)).reduce((s, r) => s + r.nb_avis, 0);
    const count = fromRecent + fromArchive;
    const el = document.getElementById('stat-' + va);
    if (el) el.textContent = count;
    
    const displayName = va === 'fifaliana' ? 'Fif' : va.charAt(0).toUpperCase() + va.slice(1);
    teamStats.push({ name: displayName, count, key: va });
  });

  teamStats.sort((a, b) => b.count - a.count);
  const maxCount = Math.max(...teamStats.map(t => t.count), 1);

  const leaderboardEl = document.getElementById('team-leaderboard-list');
  if (leaderboardEl) {
    leaderboardEl.innerHTML = teamStats.map((t, i) => {
      const pct = Math.round((t.count / maxCount) * 100);
      const medal = i === 0 ? '🥇' : (i === 1 ? '🥈' : (i === 2 ? '🥉' : `#${i+1}`));
      return `
        <div style="margin-bottom:0.75rem;">
          <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:4px;">
            <span><strong style="color:#f1f5f9;margin-right:6px;">${medal}</strong> ${t.name}</span>
            <span style="font-weight:700;color:#60a5fa;">${t.count} avis</span>
          </div>
          <div style="width:100%;height:8px;background:#1e293b;border-radius:4px;overflow:hidden;">
            <div style="width:${pct}%;height:100%;background:${i === 0 ? '#f59e0b' : (i === 1 ? '#94a3b8' : (i === 2 ? '#b45309' : '#3b82f6'))};border-radius:4px;transition:width 0.5s ease;"></div>
          </div>
        </div>`;
    }).join('');
  }

  // Widget Taux de Survie J+30
  const pctSurvieVal = resolus > 0 ? Math.round((totalJ30 / resolus) * 100) : null;
  const healthEl = document.getElementById('health-percentage');
  const healthBadge = document.getElementById('health-retention-badge');
  if (healthEl) {
    healthEl.textContent = pctSurvieVal !== null ? `${pctSurvieVal}%` : '–';
    if (pctSurvieVal !== null) {
      const color = pctSurvieVal >= 70 ? '#22c55e' : (pctSurvieVal >= 40 ? '#f59e0b' : '#ef4444');
      healthEl.style.color = color;
      if (healthBadge) {
        healthBadge.style.borderColor = color;
        healthBadge.style.boxShadow = `0 0 20px ${color}33`;
        healthBadge.style.background = `${color}14`;
      }
    }
  }

  document.getElementById('stat-total').textContent     = totalAvis;
  document.getElementById('stat-j30').textContent       = totalJ30;
  document.getElementById('stat-supprimes').textContent = totalSupp;
  document.getElementById('stat-survie').textContent    = tauxSurvie;

  // Graphiques : combiner récents + archives par mois
  const months = Array.from({length: 12}, (_, i) => `${year}-${String(i+1).padStart(2,'0')}`);
  const labels = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc'];
  const volumes = months.map(m => {
    const fromRecent  = avis.filter(a => a.date.startsWith(m)).length;
    const fromArchive = archFiltered.filter(s => s.mois === m).reduce((s, r) => s + r.nb_avis, 0);
    return fromRecent + fromArchive;
  });
  const supprimes = months.map(m => {
    const fromRecent  = avis.filter(a => a.date.startsWith(m) && a.statut === 'supprime').length;
    const fromArchive = archFiltered.filter(s => s.mois === m).reduce((s, r) => s + r.nb_supprimes, 0);
    return fromRecent + fromArchive;
  });
  if (chartVolume) chartVolume.destroy();
  chartVolume = new Chart(document.getElementById('chart-volume'), {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Avis', data: volumes, backgroundColor: '#1a73e8aa', borderRadius: 6 }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
  });

  if (chartNote) chartNote.destroy();
  chartNote = new Chart(document.getElementById('chart-note'), {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Supprimés', data: supprimes, backgroundColor: '#e5393588', borderRadius: 6 }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
  });

  // Top 5 fiches avec le plus d'avis supprimés (récents + archives)
  const fichesMap = {};
  // Depuis les avis récents
  const allFiltered = avisRecents.filter(a =>
    parseInt(a.date.slice(0,4)) === year &&
    (!selectedMonth || a.date.startsWith(selectedMonth))
  );
  allFiltered.forEach(a => {
    if (!fichesMap[a.fiche_nom]) fichesMap[a.fiche_nom] = { total: 0, supprimes: 0 };
    fichesMap[a.fiche_nom].total++;
    if (a.statut === 'supprime') fichesMap[a.fiche_nom].supprimes++;
  });
  // Depuis les archives
  archFiltered.forEach(s => {
    if (!fichesMap[s.fiche_nom]) fichesMap[s.fiche_nom] = { total: 0, supprimes: 0 };
    fichesMap[s.fiche_nom].total += s.nb_avis;
    fichesMap[s.fiche_nom].supprimes += s.nb_supprimes;
  });
  const top5 = Object.entries(fichesMap)
    .map(([nom, d]) => ({ nom, ...d }))
    .filter(d => d.supprimes > 0)
    .sort((a, b) => b.supprimes - a.supprimes)
    .slice(0, 5);

  const container = document.getElementById('top-supprimes');
  container.innerHTML = '';
  container.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin-top:12px';
  if (!top5.length) {
    container.innerHTML = '<p style="text-align:center;color:#64748b;padding:2rem">Aucun avis supprimé sur cette période</p>';
  } else {
    const rankBg   = ['#fbbf2425','#94a3b825','#92400e25','#47556925','#47556925'];
    const rankClr  = ['#d97706',  '#94a3b8',  '#b45309',  '#64748b',  '#64748b'];
    top5.forEach((d, i) => {
      const taux = d.total > 0 ? Math.round((d.supprimes / d.total) * 100) : 0;
      const tauxBg  = taux === 100 ? '#ef444420' : taux >= 50 ? '#f9731620' : '#eab30820';
      const tauxClr = taux === 100 ? '#ef4444'   : taux >= 50 ? '#f97316'   : '#eab308';
      const isLight = document.body.classList.contains('light-theme');
      
      const rowBg = isLight ? '#f8fafc' : '#1e293b';
      const rowBorder = isLight ? '#cbd5e1' : '#334155';
      const textClr = isLight ? '#0f172a' : '#f1f5f9';
      const totalBg = isLight ? '#e2e8f0' : '#33415540';
      const totalClr = isLight ? '#334155' : '#94a3b8';

      const row = document.createElement('div');
      row.className = 'top-supprime-row';
      row.style.cssText = `display:flex;align-items:center;gap:12px;background:${rowBg};border:1px solid ${rowBorder};border-radius:12px;padding:12px 16px;`;
      row.innerHTML = `
        <span style="width:32px;height:32px;border-radius:50%;background:${rankBg[i]};color:${rankClr[i]};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0">${i + 1}</span>
        <span style="flex:1;font-size:14px;font-weight:600;color:${textClr};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${d.nom}</span>
        <span style="display:flex;gap:6px;flex-shrink:0;align-items:center">
          <span style="background:#ef444420;color:#ef4444;font-size:12px;font-weight:600;padding:3px 10px;border-radius:99px;white-space:nowrap">${d.supprimes} supprimés</span>
          <span style="background:${totalBg};color:${totalClr};font-size:12px;font-weight:600;padding:3px 10px;border-radius:99px;white-space:nowrap">${d.total} avis</span>
          <span style="background:${tauxBg};color:${tauxClr};font-size:12px;font-weight:700;padding:3px 10px;border-radius:99px;white-space:nowrap;min-width:52px;text-align:center">${taux} %</span>
        </span>`;
      container.appendChild(row);
    });
  }
}

// ── EXPORT EXCEL ──
async function exportExcel() {
  let avis = await getAvis();
  const fiche = document.getElementById('dash-fiche').value.trim();
  if (fiche) avis = avis.filter(a => a.fiche_nom === fiche);
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const moisAvis = avis.filter(a => a.date.startsWith(thisMonth));
  const rows = moisAvis.map(a => ({
    'Fiche GMB': a.fiche_nom, 'Auteur': a.auteur, 'Note': a.note,
    'Date': a.date, 'Statut': STATUT_LABELS[a.statut]?.label || a.statut,
    'Avis': a.texte, 'Réponse': a.reponse
  }));
  if (!rows.length) { alert('Aucun avis ce mois-ci.'); return; }
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 8 }, { wch: 12 }, { wch: 20 }, { wch: 50 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Avis ' + thisMonth);
  XLSX.writeFile(wb, `avis-gmb-${thisMonth}.xlsx`);
}

// ── UTILS ──
function formatDate(d) {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

// ── RAPPELS ──
// Timer depuis statut_date (ou a.date pour j0). Labels corrélés à la timeline Google.
// Timers depuis a.date (date de l'avis). Seuils : J+8, J+15, J+22, J+31.
// Labels : J+7, J+14, J+21, J+30 (corrélation timeline Google).
const RAPPELS = [
  { joursDepuisAvis: 8,  statut: 'j0',  label: 'J+7'  },
  { joursDepuisAvis: 15, statut: 'j7',  label: 'J+14' },
  { joursDepuisAvis: 22, statut: 'j14', label: 'J+21' },
  { joursDepuisAvis: 31, statut: 'j21', label: 'J+30' },
];

function daysDiff(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const posted = new Date(y, m - 1, d); // heure locale, évite le décalage UTC
  const now = new Date(); now.setHours(0,0,0,0);
  posted.setHours(0,0,0,0);
  return Math.floor((now - posted) / 86400000);
}

function getRappelsDus(avis) {
  const dus = [];
  for (const a of avis) {
    if (a.statut === 'supprime' || a.statut === 'j30') continue;
    const st = a.statut || 'j0';
    const age = daysDiff(a.date); // toujours depuis la date de l'avis
    const r = RAPPELS.find(r => r.statut === st && age > r.joursDepuisAvis);
    if (r) dus.push({ avis: a, label: r.label });
  }
  return dus;
}

async function checkNotifications() {
  const avis = await getAvis();
  const dus = getRappelsDus(avis);
  if (!dus.length) return;
  renderRappelsBanner(dus);
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') sendNotifications(dus);
  else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(p => { if (p === 'granted') sendNotifications(dus); });
  }
}

function sendNotifications(dus) {
  const paliers = [...new Set(dus.map(d => d.label))];
  paliers.forEach(label => {
    const nb = dus.filter(d => d.label === label).length;
    new Notification(`📍 Suivi GMB — Vérification ${label}`, {
      body: `${nb} avis ${nb > 1 ? 'atteignent' : 'atteint'} le palier ${label}.`
    });
  });
}

function renderRappelsBanner(dus) {
  const banner = document.getElementById('rappels-banner');
  if (banner) banner.innerHTML = '';
  const count = document.getElementById('rappels-count');
  if (!count) return;
  if (!dus.length) { count.innerHTML = ''; return; }
  const nb = dus.length;
  count.innerHTML = `<div class="rappels-summary">🔔 <strong>${nb} avis</strong> ${nb > 1 ? 'nécessitent' : 'nécessite'} une vérification de statut — surlignés en orange ci-dessous.</div>`;
}

// ── GÉNÉRATEUR D'AVIS ──
function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function extraireVilleFiche(nomFiche) {
  if (!nomFiche) return '';
  let str = nomFiche.trim();
  if (str.toLowerCase().includes('domiciliation')) return 'Saint-Herblain';

  if (typeof _fichesCache !== 'undefined' && Array.isArray(_fichesCache)) {
    const found = _fichesCache.find(f => f.nom && f.nom.toLowerCase() === str.toLowerCase());
    if (found && found.ville) return found.ville.trim();
  }

  let main = str.split(/\s+[-–—]\s+/)[0] || str;
  main = main.replace(/\b(France|[0-9]{2,5}|[A-Z][a-z]+ [0-9]{2})\b/gi, '').trim();

  const motsMetiers = [
    'Élagage', 'Elagage', 'Abattage', 'Taille de Haie', 'Taille de haie', 'Taille', 'Haie', 'Arboriste', 'Grimpeur', 'Paysagiste',
    'Ravalement de Façade', 'Ravalement de façade', 'Ravalement', 'Ravelement', 'Nettoyage', 'Démoussage', 'Demoussage',
    'Peintre en Bâtiment', 'Peintre', 'Peinture', 'Couvreur', 'Toiture', 'Toit', 'Zinguerie', 'Zingu', 'Charpente',
    'Carreleur', 'Carrelage', 'Maçonnerie', 'Maconnerie', 'Maçon', 'Macon', 'Béton', 'Beton', 'Dalle',
    'Terrassement', 'Terrasse', 'Façade', 'Facade', 'Enduit', 'Façadier', 'Facadier', 'Isolation',
    'Débarras', 'Debarras', 'Étanchéité', 'Etancheite', 'Plomberie', 'Plombier', 'Électricité', 'Electricite',
    'Réparation', 'Reparation', 'Rénovation', 'Renovation', 'Dépannage', 'Depannage', 'Remorquage', 'Auto', 'Voiture',
    'Garage', 'Jardinage', 'Jardin', 'Bâtiment', 'Batiment'
  ];

  let candidate = main;
  for (const word of motsMetiers) {
    const reg = new RegExp('\\b' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
    candidate = candidate.replace(reg, '');
  }

  candidate = candidate.replace(/^[\s,;&|/-]+|[\s,;&|/-]+$/g, '').trim();

  if (candidate && candidate.length >= 2) {
    return candidate;
  }

  return str;
}

function obtenirContexteMeteoSaisonnier(meteoSelectVal) {
  if (meteoSelectVal && meteoSelectVal !== 'auto') {
    if (meteoSelectVal === 'soleil') return 'Période estivale ensoleillée, forte chaleur ou entretien d\'été';
    if (meteoSelectVal === 'pluie') return 'Fortes pluies récentes, infiltrations ou évacuation d\'eau d\'urgence';
    if (meteoSelectVal === 'vent') return 'Coup de vent / tempête récente ayant provoqué des dégâts ou inquiétudes';
    if (meteoSelectVal === 'froid') return 'Période de gel / grand froid nécessitant une réfection d\'étanchéité ou isolation';
  }

  const now = new Date();
  const month = now.getMonth();
  const moisNoms = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const moisActuel = moisNoms[month];

  if (month >= 5 && month <= 8) {
    return `Saison estivale (${moisActuel}) — profiter du jardin/extérieur, besoin de lumière ou protection solaire`;
  } else if (month >= 9 && month <= 10) {
    return `Automne (${moisActuel}) — pluies fréquentes, ramassage des feuilles et préparation de la maison pour l'hiver`;
  } else if (month === 11 || month <= 1) {
    return `Période hivernale (${moisActuel}) — temps froid, gelées ou pluies battantes`;
  } else {
    return `Printemps (${moisActuel}) — retour des beaux jours, entretien d'espaces et nettoyage de printemps`;
  }
}

function genererPersonaAuteur() {
  const personas = [
    "Propriétaire prévoyant qui a pris le temps de comparer les devis avant d'engager les travaux.",
    "Client dans l'urgence suite à un imprévu récent (besoin d'une équipe réactive qui intervienne vite).",
    "Propriétaire exigeant sur les finitions, la propreté du chantier et la tenue des engagements.",
    "Client venu sur recommandation d'un voisin ou d'un proche du quartier.",
    "Client fidèle qui faisait appel à eux pour la seconde fois.",
    "Bailleur/propriétaire d'un bien locatif qui a fait réaliser les travaux à distance avec confiance.",
    "Voisin d'un précédent chantier qui a remarqué leur professionnalisme et a décidé de les contacter."
  ];
  return personas[Math.floor(Math.random() * personas.length)];
}

function genererStructureNarrative() {
  const structures = [
    "Commence par l'impression générale ou la recommandation, puis détaille l'intervention et le résultat.",
    "Commence par la raison initiale ou l'élément déclencheur (besoin/problème), puis décris l'arrivée de l'équipe et le travail fini.",
    "Commence par une remarque sur la réactivité/devis, puis explique comment s'est déroulé le chantier.",
    "Raconte simplement l'histoire depuis le premier contact jusqu'au départ de l'équipe."
  ];
  return structures[Math.floor(Math.random() * structures.length)];
}

async function populateGenFiche() {
  const fiches = await getFiches();
  const dl = document.getElementById('datalist-gen-fiche');
  if (dl) dl.innerHTML = fiches.map(f => `<option value="${f.nom.replace(/"/g,'&quot;')}">`).join('');

  const ficheInput = document.getElementById('gen-fiche');
  if (ficheInput && !ficheInput._hasAutoVilleListener) {
    ficheInput._hasAutoVilleListener = true;
    const autoUpdateVille = () => {
      const val = ficheInput.value.trim();
      if (!val) return;
      const extracted = extraireVilleFiche(val);
      const villeInput = document.getElementById('gen-ville');
      if (villeInput && extracted) {
        villeInput.value = extracted;
      }
    };
    ficheInput.addEventListener('input', autoUpdateVille);
    ficheInput.addEventListener('change', autoUpdateVille);
  }
}

// ── TEMPLATES D'AVIS COMPLETS PAR TON ──
// {f}=fiche, {t}=travaux, {v}=ville
// Chaque avis est écrit d'un bloc, cohérent et grammaticalement correct.

const TEMPLATES = {
  elagage: {
    neutre: [
      "Pas évident de trouver une entreprise sérieuse sur {v} pour des {t}, mais {f} a fait un bon boulot. Devis honnête et délais tenus. Ils bossent proprement et l'équipe est plutôt sympa. Le rendu final est conforme à ce qu'on voulait.",
      "On a beaucoup apprécié le diagnostic fait avant l'intervention. L'élagueur a expliqué comment alléger la cime pour limiter la prise au vent sans massacrer les arbres. Chantier laissé propre, tout évacué avec leur broyeur. C'est du sérieux.",
      "Besoin d'un coup de propre dans le jardin à {v}, on voyait plus trop le soleil à cause des branches. {f} a bien géré {t}, les arbres sont restés jolis et pas tout nus comme on voit parfois. Gars sympas et bosseurs.",
      "C'est pas toujours facile de trouver quelqu'un de sérieux pour des {t} mais là rien à redire. Les gars sont arrivés avec tout le matos, ont attaqué direct et laissé le terrain nickel en repartant. Prix conforme au devis.",
    ],
    enthousiaste: [
      "Franchement ça change tout. On s'en rendait pas compte mais les arbres prenaient toute la lumière... Le jardin est devenu bien plus agréable d'un coup et les arbres ont gardé une forme naturelle. Y avait pas mal de branches mortes aussi, ils ont tout dégagé proprement. Bon contact avec les gars, ils connaissent leur métier.",
      "Les gars sont intervenus super vite pour faire les {t} et sécuriser le coin de la terrasse à {v}. Boulot sérieux, ils ont pas traîné et surtout ils ont laissé le terrain nickel en partant. Communication facile avec le responsable, c'est une bonne adresse.",
      "On cherchait une entreprise sérieuse pour {t} et on est très contents du résultat. L'équipe a été de bon conseil dès leur arrivée. Le travail de taille est soigné et ils ont pris le temps de tout nettoyer avant de partir, le jardin est resté impeccable.",
    ],
    detaille: [
      "Suite aux dernières tempêtes, j'avais besoin de faire des {t} sur des arbres qui commençaient à inquiéter les voisins. {f} est intervenu sur {v}, l'équipe a sécurisé chaque branche avec des sangles avant de couper. L'accès était vraiment difficile mais ça n'a pas posé de problème, tout a été évacué proprement. Devis bien respecté et équipe polie du début à la fin.",
      "On avait un chêne qui prenait de la place et menaçait la clôture côté voisin à {v}. L'élagueur est venu évaluer la situation avant de proposer une solution adaptée. Le jour J, ils ont sécurisé la zone, tout coupé proprement et broyé les branches sur place. Le jardin était aussi propre qu'avant leur arrivée. Prix conforme à ce qui avait été annoncé.",
      "Ce qui m'inquiétait le plus c'était le bazar après la coupe, mais j'ai été rassuré. L'équipe a pris le temps de tout ramasser, les grosses branches comme les petits débris. Ils ont même passé un coup de souffleur sur la terrasse avant de charger le camion. Le jardin est resté propre, on n'aurait même pas dit qu'il y avait eu un gros chantier d'élagage le matin même.",
    ],
    court: [
      "Travail soigné pour {t} à {v}. Toute la coupe évacuée directement. Terrain laissé propre, rien à redire.",
      "Équipe sérieuse et ponctuelle pour les {t} de ce matin à {v}. Ils sont arrivés avec tout le matos et on attaqué direct. Je recommande.",
      "{t} à {v} par {f}. Sérieux, efficace, bon boulot.",
    ],
  },

  ravalement: {
    neutre: [
      "Ravalement fini cette semaine sur {v}, équipe ponctuelle et devis bien respecté du début à la fin. Les gars ont bossé dur pour finir dans les délais et le résultat est très correct, on repassera par eux sans hésiter.",
      "Prestation de qualité pour notre {t} dans le {v}. La façade était très attaquée par l'humidité, mais le traitement et la peinture ont bien rattrapé le coup. C'est beaucoup plus lumineux maintenant, on ne voit plus aucune démarcation.",
      "{f} pour notre {t} à {v}. L'équipe a bien préparé les surfaces avant d'appliquer l'enduit, les protections des fenêtres et des sols étaient soignées. Résultat propre et bien uniforme sur toute la maison.",
    ],
    enthousiaste: [
      "Le changement est vraiment flagrant. On voulait que la maison présente bien à {v} et l'équipe a fait un boulot soigné sur le crépi et les dessous de toit. Ils ont bien pris le temps de protéger les menuiseries et les arbustes avant de commencer. C'est du travail de pro, on est vraiment contents.",
      "Bluffant le résultat pour notre {t} à {v}. La maison semble neuve, les voisins nous ont félicités ! On sent que c'est des pros qui connaissent leur affaire. Aucune mauvaise surprise du début à la fin.",
    ],
    detaille: [
      "On avait des problèmes d'humidité dus à une façade dégradée à {v}. {f} est intervenu pour le {t} : ils ont commencé par identifier les fissures, traité les zones sensibles, puis appliqué un enduit hydrofuge adapté. Les teintes ont été choisies avec nous. Le résultat est excellent et le problème d'humidité réglé. Délais tenus, prix conforme.",
      "Rénovation façade à {v} terminée cette semaine. L'équipe est passée dès 8h le matin pour bien avancer sur le nettoyage haute pression. Les protections étaient bien posées sur les fenêtres et les sols. On sent l'expérience dès le premier rdv, pas de mauvaises surprises, les conseils sont pertinents et le travail est soigné dans les moindres détails.",
    ],
    court: [
      "{t} à {v}, équipe sérieuse et résultat soigné. Pratique car ils se déplacent pour les rdv techniques. Devis respecté à la lettre.",
      "{f} pour {t} à {v}. Travail propre, délais tenus. Rien à redire.",
      "Très satisfait du {t} à {v}. Bon rapport qualité-prix, on recommande.",
    ],
  },

  couvreur: {
    neutre: [
      "On avait une infiltration depuis un moment à {v} et on n'arrivait pas à trouver d'où ça venait. {f} est passé rapidement, a identifié le problème et l'a réparé proprement. Plus aucune infiltration depuis. Réactifs et sérieux.",
      "Notre toiture avait besoin d'une réfection à {v}. {f} est intervenu pour les {t} dans les délais convenus et pour le prix du devis. La charpente a été vérifiée, les tuiles posées avec soin. Travail solide, on est satisfaits.",
      "Bonne prestation malgré la météo pas idéale sur {v}. L'équipe a laissé le terrain très propre après avoir tout évacué. Travail efficace et personnel plutôt sympa.",
    ],
    enthousiaste: [
      "{f} est intervenu pour des {t} à {v} en urgence après les dernières pluies et l'équipe a été au rendez-vous. Réactifs, compétents, et le travail est nickel. La toiture est comme neuve. Vraiment contents.",
      "Intervention prévue pour le créneau de 9h, l'équipe est arrivée avec le sourire. Ce qui change c'est qu'ils prennent le temps de discuter du projet avec vous et d'expliquer ce qu'ils vont faire. Résultat parfait, plus aucun souci d'étanchéité.",
    ],
    detaille: [
      "Après plusieurs hivers difficiles, notre toiture à {v} nécessitait une réfection sérieuse. {f} est passé évaluer l'état de la charpente et des tuiles avant de proposer un devis détaillé. L'intervention a duré deux jours : vérification de la charpente, remplacement des tuiles abîmées, réfection de la zinguerie. Ponctualité exemplaire, l'équipe est arrivée pile pour le créneau de 8h avec tout le matériel. Facture conforme au devis.",
      "On craignait pour notre toiture à {v} après les dernières tempêtes. {f} est venu rapidement faire un diagnostic sérieux. Ils ont bien balisé la zone de travail avant de monter, on sent l'habitude de bosser ensemble. Le point qui m'a vraiment rassuré c'est le respect des consignes de sécurité du début à la fin. Boulot efficace et rendu propre.",
    ],
    court: [
      "{f} pour {t} à {v}. Réactif, sérieux, bon travail. Rien à redire.",
      "Très bonne intervention pour {t} à {v}. Efficace et propre.",
      "{t} à {v} par {f}. Résultat impeccable, prix honnête.",
    ],
  },

  nettoyage_toiture: {
    neutre: [
      "La toiture de notre maison à {v} était couverte de mousse depuis un moment. {f} est intervenu pour le {t} et le résultat est vraiment visible. Les tuiles ont retrouvé leur couleur et un traitement préventif a été appliqué. Prix honnête, bon travail.",
      "Prestation sérieuse pour le {t} à {v}. L'évacuation des déchets verts a été faite au fur et à mesure, donc pas de gros tas qui traînaient. On a retrouvé la toiture tout à fait nette après leur départ. Très satisfaits du service.",
      "Suite aux recommandations d'un voisin, on a contacté {f} pour le {t} de notre maison à {v}. Travail propre, équipe sérieuse et tarif raisonnable. Les gouttières ont été nettoyées en même temps. Rien à redire.",
    ],
    enthousiaste: [
      "Impressionnant le résultat ! {f} a fait le {t} de notre maison à {v} et la toiture est comme neuve. On ne s'attendait pas à une telle différence. On voit qu'ils ont l'habitude et le matériel pour faire ça sans abîmer les tuiles.",
      "Besoin d'un coup de propre sur la toiture à {v}. Rien à dire sur l'intervention : les délais ont été respectés à la lettre et le boulot est très propre. Ce que j'ai apprécié c'est que le prix annoncé sur le devis n'a pas bougé d'un centime. Une bonne adresse pour ceux qui cherchent un rapport qualité/prix correct dans le coin.",
    ],
    detaille: [
      "Notre toiture à {v} n'avait pas été entretenue depuis des années, la mousse commençait à soulever les tuiles. {f} est intervenu pour le {t} : nettoyage haute pression avec réglage adapté pour ne pas endommager les tuiles, puis application d'un traitement hydrofuge longue durée. Les gouttières ont également été nettoyées. Résultat visible de loin, la toiture est propre et protégée.",
    ],
    court: [
      "{f} pour {t} à {v}. Résultat nickel, bon rapport qualité-prix.",
      "Très bon {t} réalisé à {v}. Propre et efficace, terrain laissé impeccable.",
      "{t} à {v}. Équipe sérieuse, rien à redire sur la prestation.",
    ],
  },

  terrassement: {
    neutre: [
      "On avait un terrain assez difficile à travailler car le sol était très meuble par endroits à {v}. {f} a pris le temps de bien décaisser et de compacter pour que tout soit homogène et stable. Le résultat final est impeccable, on a une surface bien plane. On voit qu'ils n'ont pas fait ça à la va-vite.",
      "J'ai contacté {f} pour des {t} à {v} dans le cadre d'une création de terrasse. Devis rapide, travail soigné, délais respectés. L'équipe a bien géré les contraintes du terrain. Résultat conforme à mes attentes.",
    ],
    enthousiaste: [
      "Super travail de {f} pour nos {t} à {v} ! L'équipe est arrivée avec le bon matériel et a tout réalisé en une journée. Le terrain est parfaitement nivelé. On est ravis du résultat.",
      "L'équipe est passée pour le créneau de 8h pour niveler le terrain à {v}. Le résultat est très satisfaisant, le sol est stable et bien homogène. Ils ont pris le temps de tout nettoyer et d'évacuer les déchets en partant. On peut enchaîner sur les prochaines étapes du chantier sans soucis.",
    ],
    detaille: [
      "Pour la création d'une terrasse à {v}, on avait besoin de {t} conséquents. {f} est passé évaluer le terrain, a proposé un planning et un devis détaillé. L'intervention s'est déroulée sur deux jours : terrassement, évacuation des terres, compactage. Le résultat est précis, conforme aux plans. Tarif compétitif et équipe sérieuse.",
    ],
    court: [
      "{f} pour {t} à {v}. Travail propre, terrain laissé nickel. Rien à redire.",
      "Très satisfait des {t} réalisés à {v}. Sérieux et efficace.",
    ],
  },

  maconnerie: {
    neutre: [
      "On avait une fissure sur un mur porteur à {v} qui nous inquiétait. {f} est intervenu avec sérieux. Diagnostic précis, travail solide, explications claires. La réparation est bien faite, aucune mauvaise surprise.",
      "J'ai sollicité {f} pour des {t} à {v}. L'équipe était compétente et le travail bien organisé. Ils ont respecté le créneau de 8h tous les matins, ce qui est appréciable. On est vraiment contents du résultat.",
    ],
    enthousiaste: [
      "On appréhendait un peu ce type de travaux mais l'équipe de {f} a tout géré avec professionnalisme à {v}. Résultat solide et bien fini. On sent l'expérience dès le premier rdv, pas de mauvaises surprises.",
    ],
    detaille: [
      "Une reprise en sous-œuvre était nécessaire pour notre maison à {v} suite à un tassement. {f} a d'abord réalisé un diagnostic complet avant de proposer une solution adaptée. Les {t} ont été réalisés méthodiquement : étaiement, terrassement localisé, coulage du béton. Travail sérieux, sans précipitation. La structure est maintenant stabilisée.",
    ],
    court: [
      "{f} pour {t} à {v}. Travail solide et bien fait.",
      "Très bon travail de {f} pour {t} à {v}. Sérieux et professionnel.",
    ],
  },

  carreleur: {
    neutre: [
      "On a fait poser le carrelage de notre cuisine à {v}. Les joints sont réguliers, les découpes précises même dans les angles. L'artisan a bien préparé le support avant la pose et le chantier a été laissé propre. Travail soigné.",
      "Pour les {t} dans ma salle de bain à {v}, j'ai choisi {f}. Bon travail : carrelage bien posé, joints propres, aucune tuile qui sonne creux. Artisan ponctuel, rien à redire.",
    ],
    enthousiaste: [
      "Superbe travail pour les {t} à {v} ! Le résultat est vraiment beau, on est bluffés par la précision des découpes et la régularité des joints. L'artisan était de bon conseil sur le choix des matériaux. On recommande.",
    ],
    detaille: [
      "Rénovation complète de notre salle de bain à {v} avec {f}. L'artisan a commencé par un ragréage soigneux du sol avant la pose, ce qui est indispensable pour un bon résultat. Les carreaux grand format ont été posés avec soin, les joints sont impeccables et homogènes. Les découpes autour des tuyaux et dans les angles sont précises. Aucune tuile ne sonne creux.",
    ],
    court: [
      "{f} pour {t} à {v}. Pose soignée, joints parfaits.",
      "Très satisfait des {t} à {v}. Propre et précis.",
    ],
  },

  peintre: {
    neutre: [
      "Boulot très sérieux pour la peinture à {v}. Ils ont bien gratté les fissures et tout nettoyé avant de peindre, au moins on est sûr que ça va pas bouger. Les fenêtres étaient bien protégées donc pas de coulures partout, le résultat est nickel et bien lisse.",
      "Pour les {t} de notre maison à {v}, on a choisi {f}. L'artisan a bien préparé les surfaces avant de peindre. Deux couches appliquées comme convenu, rendu impeccable. Prix honnête.",
    ],
    enthousiaste: [
      "Super résultat avec {f} pour les {t} à {v} ! L'appartement est transformé, les couleurs rendent parfaitement et les finitions sont vraiment soignées. L'artisan était ponctuel et avait bien protégé tout le mobilier. On est ravis.",
    ],
    detaille: [
      "On a confié les {t} de notre maison à {v} à {f} après rénovation. L'artisan a d'abord rebouché les trous et poncé les surfaces avant toute mise en peinture, ce qui se voit sur le résultat final. Les bords et les angles ont été masqués avec soin. Deux couches appliquées sur l'ensemble. Chantier propre, délais respectés.",
    ],
    court: [
      "{f} pour {t} à {v}. Propre, soigné, résultat nickel.",
      "Très satisfait des {t} à {v}. Finitions impeccables.",
    ],
  },

  debarras: {
    neutre: [
      "J'avais besoin de vider rapidement un appartement à {v}. {f} est intervenu dans les deux jours pour le {t}. Tout a été trié et évacué proprement, le logement était vide et nettoyé à la fin.",
      "Pour le {t} de la maison de famille à {v}, on a fait appel à {f}. Équipe respectueuse et efficace. Tout a été évacué dans la journée, prix transparent. Bonne expérience.",
    ],
    enthousiaste: [
      "L'équipe est venue rapidement, a travaillé vite et bien, et a laissé les lieux propres à {v}. On avait des années d'affaires accumulées et tout a été géré en une journée. On recommande vraiment.",
    ],
    detaille: [
      "Suite à un déménagement, je devais faire le {t} d'un grand appartement à {v}. {f} est passé estimer le volume, puis est intervenu avec une équipe de trois personnes. Tout a été trié méthodiquement : les objets récupérables mis de côté, les encombrants chargés dans le camion. L'appartement a été balayé avant leur départ. Tarif conforme à l'estimation.",
    ],
    court: [
      "{f} pour {t} à {v}. Rapide, efficace, résultat propre.",
      "Très satisfait du {t} à {v}. Sérieux et ponctuel.",
    ],
  },

  plomberie: {
    neutre: [
      "On avait une fuite chez nous à {v} qu'on cherchait depuis un moment. {f} est intervenu rapidement, a trouvé la cause et réparé proprement. Plus de problème depuis. Prix raisonnable.",
      "Notre chauffe-eau était en fin de vie à {v}. {f} a géré les {t} du début à la fin : dépose, installation, vérification des raccords. Travail soigné, intervention rapide.",
    ],
    enthousiaste: [
      "Super réactivité pour les {t} à {v} ! En urgence, le plombier est arrivé rapidement, a trouvé le problème et l'a réglé proprement. On était stressés mais tout s'est très bien passé.",
    ],
    detaille: [
      "Dégât des eaux chez nous à {v}, on a appelé {f} en urgence. Le plombier est arrivé dans l'heure, a localisé la fuite avec précision, découpé le minimum nécessaire pour accéder à la canalisation et réparé proprement. Il a vérifié l'étanchéité avant de repartir et a expliqué comment éviter ce type de problème. Facture conforme à ce qui avait été annoncé.",
    ],
    court: [
      "{f} pour {t} à {v}. Réactif, efficace, rien à redire.",
      "Très bon plombier pour {t} à {v}. Sérieux et propre.",
    ],
  },

  electricite: {
    neutre: [
      "Notre installation électrique à {v} n'était plus aux normes. {f} a réalisé les {t} sérieusement : tableau refait, gaines bien posées, tout étiqueté. Certificat de conformité remis. Rien à redire.",
      "Pour la mise aux normes électriques à {v}, on a choisi {f}. Très bon travail : diagnostic complet, devis détaillé, intervention propre. L'électricien a été transparent tout au long du chantier.",
    ],
    enthousiaste: [
      "L'électricien de {f} connaissait parfaitement son métier à {v}, a tout bien expliqué et le résultat est impeccable. Le tableau est refait proprement et tout est aux normes. On recommande.",
    ],
    detaille: [
      "Notre maison à {v} avait un tableau électrique vétuste et une installation non conforme. {f} a commencé par un diagnostic complet de l'installation existante avant de proposer un devis détaillé. L'intervention a duré deux jours : remplacement du tableau, mise en conformité des circuits, pose de nouvelles prises. Tout est étiqueté. Certificat de conformité remis.",
    ],
    court: [
      "{f} pour {t} à {v}. Travail soigné et conforme.",
      "Très satisfait des {t} à {v}. Professionnel et sérieux.",
    ],
  },

  auto: {
    neutre: [
      "En panne à {v}, j'ai appelé {f}. Le dépanneur est arrivé rapidement, a examiné le moteur pour comprendre la panne avant de remorquer. Très pro dans sa manière de faire et ses explications étaient simples à comprendre. Un service vraiment sérieux.",
      "Suite à une panne à {v}, j'ai contacté {f}. Prise en charge rapide, le technicien a bien expliqué le problème. Intervention soignée et tarif conforme à ce qui avait été annoncé. Bonne expérience.",
    ],
    enthousiaste: [
      "Je pensais attendre des heures vu l'heure de pointe à {v}, mais {f} a été hyper réactif. Arrivée rapide, diagnostic sérieux et dépannage efficace. On se sent en de bonnes mains. Un service vraiment sérieux.",
    ],
    detaille: [
      "Ma voiture est tombée en panne sur la route à {v}. J'ai appelé {f}. Le dépanneur est arrivé en 25 minutes, a d'abord fait un diagnostic complet du véhicule, puis m'a expliqué clairement d'où venait le problème. La réparation a pu être faite sur place, ce qui m'a évité un remorquage. Prix annoncé avant intervention, facture conforme.",
    ],
    court: [
      "{f} pour {t} à {v}. Réactif et efficace. Je recommande.",
      "Très bon dépannage par {f} à {v}. Rapide et professionnel.",
    ],
  },

  nettoyage: {
    neutre: [
      "On a fait appel à {f} pour le {t} à {v}. L'équipe est venue avec le matériel adapté et le résultat est vraiment propre. Intervention dans les délais, prix honnête.",
      "Pour le {t} de notre terrasse à {v}. Nettoyage bien réalisé sans abîmer le revêtement. Résultat impeccable. Équipe sérieuse.",
    ],
    enthousiaste: [
      "On ne s'attendait pas à un tel résultat pour le {t} à {v}. Tout est comme neuf. L'équipe était efficace et a tout nettoyé derrière elle. On recommande.",
    ],
    detaille: [
      "On avait besoin d'un {t} en profondeur à {v} avant une remise en location. {f} est venu évaluer le travail, puis est intervenu avec une équipe équipée de matériel professionnel. Chaque surface a été traitée méthodiquement. Résultat impeccable, les locaux étaient prêts pour l'état des lieux. Tarif conforme au devis.",
    ],
    court: [
      "{f} pour {t} à {v}. Résultat propre, équipe sérieuse.",
      "Très satisfait du {t} à {v}. Efficace et soigné.",
    ],
  },

  generic: {
    neutre: [
      "Bonne expérience avec {f} pour des {t} à {v}. Les délais annoncés au devis ont été respectés à la lettre, ce qui devient rare aujourd'hui. On sent qu'ils connaissent leur métier, les explications sont claires. Je recommande pour leur professionnalisme.",
      "Pour des {t} à {v}, on a choisi {f}. Équipe compétente, intervention bien organisée et résultat à la hauteur. Prix honnête, aucune mauvaise surprise.",
      "On sent l'expérience dès le premier rdv. Pas de mauvaises surprises, les conseils sont pertinents et le travail est soigné dans les moindres détails. On est vraiment contents du résultat.",
    ],
    enthousiaste: [
      "{f} à {v} pour des {t}. Équipe sérieuse et bosseuse, ils expliquent bien ce qu'ils font. On voit que c'est des pros, rien à redire sur la prestation.",
      "Vraiment satisfait de {f} pour les {t} à {v}. Réactifs, efficaces et vraiment soigneux avec la propriété. Une bonne adresse dans le secteur.",
    ],
    detaille: [
      "Besoin de faire des {t} à {v} et pas évident de trouver quelqu'un de sérieux. {f} a répondu rapidement, le devis était clair et l'intervention s'est déroulée comme prévu. Le chantier a été suivi de près, communication facile avec le responsable. Résultat conforme à nos attentes, prix conforme au devis.",
    ],
    court: [
      "{f} pour {t} à {v}. Sérieux, efficace, rien à redire.",
      "Très bonne prestation pour {t} à {v}. Travail propre.",
      "{t} à {v} par {f}. Délais respectés, résultat nickel.",
    ],
  },
};

// Détection du métier à partir du nom de fiche
function detecterMetier(fiche) {
  const f = fiche.toLowerCase();
  if (/élag|elag|abatt|paysag|arborist|haie|taille.*arbre/.test(f)) return 'elagage';
  if (/ravel|façade|facade|enduit|crépi|isolation.*façade/.test(f)) return 'ravalement';
  if (/couvreur|toiture|toit|zingu|ardoise|tuile|charpente/.test(f)) return 'couvreur';
  if (/nettoy.*toit|démous|demouth|mousse/.test(f)) return 'nettoyage_toiture';
  if (/terrassement|terras|excavat|nivelle|vrd/.test(f)) return 'terrassement';
  if (/maçon|macon|béton|beton|dalle|parpaing/.test(f)) return 'maconnerie';
  if (/carrel/.test(f)) return 'carreleur';
  if (/peintr|peinture/.test(f)) return 'peintre';
  if (/débarras|debarras|vide.*maison|enlève/.test(f)) return 'debarras';
  if (/plomb|fuite|sanitaire|chauffe/.test(f)) return 'plomberie';
  if (/électr|electr|tableau|câblag/.test(f)) return 'electricite';
  if (/dépann|depann|auto|voiture|mécanic|mecanic|garage/.test(f)) return 'auto';
  if (/nettoy/.test(f)) return 'nettoyage';
  return 'generic';
}

const _UNUSED = {
  elagage: {
    contextes: [
      "Un grand arbre dans notre jardin menaçait la toiture et les lignes électriques.",
      "Plusieurs arbres de notre propriété nécessitaient une taille sérieuse.",
      "Un chêne imposant devait être abattu en toute sécurité.",
      "Nos arbres n'avaient pas été entretenus depuis plusieurs années.",
      "Une branche maîtresse menaçait de tomber sur la clôture du voisin.",
    ],
    specifiques: [
      "L'élagueur a travaillé en hauteur avec une précision impressionnante.",
      "Le bois a été débité et les branchages évacués sans laisser de trace.",
      "La taille a été réalisée dans les règles de l'art, en respectant la croissance naturelle de l'arbre.",
      "L'abattage s'est fait en toute sécurité malgré l'accès difficile.",
      "Les grumes ont été soigneusement évacuées, le jardin était impeccable en fin de chantier.",
    ],
  },
  ravalement: {
    contextes: [
      "Notre façade était très dégradée après plusieurs hivers difficiles.",
      "Des fissures apparaissaient sur l'enduit extérieur depuis quelque temps.",
      "La peinture de façade s'écaillait et le crépi était à refaire.",
      "Notre maison à {ville} avait besoin d'un ravalement complet.",
      "L'humidité s'infiltrait à travers la façade, il fallait agir.",
    ],
    specifiques: [
      "La préparation du support a été faite sérieusement avant l'application de l'enduit.",
      "Le résultat est bluffant, la maison semble neuve.",
      "Les finitions sont soignées, même dans les recoins difficiles d'accès.",
      "L'isolation thermique par l'extérieur a également été bien gérée.",
      "Le choix des teintes et des matériaux a été fait avec nous, c'est appréciable.",
    ],
  },
  couvreur: {
    contextes: [
      "Après une tempête, plusieurs tuiles étaient cassées et la toiture fuyait.",
      "Notre toiture avait plus de 30 ans et nécessitait une réfection complète.",
      "Une infiltration d'eau au niveau de la charpente nous a alertés.",
      "La zinguerie était oxydée et des gouttières à remplacer.",
      "Un devis pour réfection partielle de toiture suite à des dégâts.",
    ],
    specifiques: [
      "La charpente a été vérifiée en profondeur avant la pose des tuiles.",
      "Les solins et la zinguerie ont été refaits proprement.",
      "Les tuiles ont été sélectionnées avec soin pour correspondre à l'existant.",
      "La toiture est maintenant parfaitement étanche, les tests l'ont confirmé.",
      "Le nettoyage du chantier a été soigné, pas une tuile cassée au sol.",
    ],
  },
  nettoyage_toiture: {
    contextes: [
      "La toiture était couverte de mousse et de lichen depuis plusieurs années.",
      "Les tuiles avaient noirci avec le temps et la mousse commençait à les soulever.",
      "Avant la vente de la maison, nous voulions un nettoyage complet de la toiture.",
      "Le démoussage était urgent pour éviter des dégâts plus importants.",
    ],
    specifiques: [
      "Le nettoyage haute pression a été réalisé avec soin pour ne pas endommager les tuiles.",
      "Un traitement hydrofuge a été appliqué après le démoussage.",
      "La toiture est méconnaissable, les tuiles ont retrouvé leur couleur d'origine.",
      "Les gouttières ont été nettoyées en même temps, c'était inclus dans le devis.",
      "Résultat visible de loin, la toiture est vraiment propre.",
    ],
  },
  terrassement: {
    contextes: [
      "Nous avions besoin d'un terrassement pour la création d'une terrasse.",
      "Un affaissement de terrain nécessitait une intervention rapide.",
      "La création d'un accès au garage demandait un terrassement conséquent.",
      "Nivellement de terrain pour la pose d'une dalle béton.",
    ],
    specifiques: [
      "Les engins étaient adaptés au terrain et à l'accès restreint.",
      "Le nivellement a été précis, exactement selon les plans.",
      "Les terres excédentaires ont été évacuées sans laisser de désordre.",
      "Le compactage a été bien réalisé, la dalle ne bougera pas.",
      "L'accès difficile n'a pas posé de problème à l'équipe.",
    ],
  },
  maconnerie: {
    contextes: [
      "Une fissure inquiétante était apparue dans un mur porteur.",
      "Nous faisions construire une extension nécessitant des travaux de maçonnerie.",
      "Une reprise en sous-œuvre était nécessaire suite à un tassement.",
      "La création d'une ouverture dans un mur porteur demandait un vrai professionnel.",
    ],
    specifiques: [
      "Le travail de maçonnerie est solide et bien fini.",
      "Les joints ont été soignés, le résultat est propre.",
      "Le ferraillage et le coulage du béton ont été réalisés dans les règles.",
      "La pose du linteau a été faite correctement, aucun doute sur la solidité.",
    ],
  },
  carreleur: {
    contextes: [
      "Notre carrelage de salle de bain était fissuré et décollé par endroits.",
      "Rénovation complète de la cuisine avec pose d'un nouveau carrelage.",
      "La terrasse extérieure nécessitait un nouveau revêtement antidérapant.",
      "Pose de carrelage grand format dans le salon.",
    ],
    specifiques: [
      "La pose est impeccable, les joints sont parfaitement réguliers.",
      "Les découpes ont été faites avec précision, même dans les coins difficiles.",
      "Le ragréage du sol a été réalisé avant la pose, c'est du travail bien fait.",
      "Le choix du carrelage et les conseils prodigués ont été très utiles.",
      "Aucune tuile ne sonne creux, la pose est solide.",
    ],
  },
  peintre: {
    contextes: [
      "Notre intérieur n'avait pas été repeint depuis plus de dix ans.",
      "Suite à des travaux, toutes les pièces étaient à repeindre.",
      "Une rénovation complète de la façade avec une peinture de qualité.",
      "Les murs avaient des taches et des marques difficiles à effacer.",
    ],
    specifiques: [
      "La préparation des surfaces a été faite sérieusement avant la peinture.",
      "Les finitions aux angles et autour des fenêtres sont précises.",
      "Deux couches ont été appliquées comme convenu, le résultat est uniforme.",
      "Le mobilier a été soigneusement protégé pendant les travaux.",
      "Les couleurs choisies rendent parfaitement, l'ambiance est transformée.",
    ],
  },
  debarras: {
    contextes: [
      "Suite à un décès, nous devions vider entièrement la maison.",
      "Un déménagement urgent nécessitait un débarras rapide.",
      "La cave et le grenier étaient pleins d'affaires accumulées sur des années.",
      "Débarras complet avant mise en vente du bien.",
    ],
    specifiques: [
      "L'équipe a travaillé vite et avec respect, c'est important dans ces moments-là.",
      "Tout a été trié, le recyclable séparé des encombrants.",
      "La maison a été laissée propre après le débarras.",
      "Le tarif était transparent, pas de mauvaise surprise.",
    ],
  },
  plomberie: {
    contextes: [
      "Une fuite importante sous l'évier nécessitait une intervention rapide.",
      "Notre chauffe-eau tombait en panne régulièrement, il fallait le changer.",
      "Une rupture de canalisation avait causé des dégâts des eaux.",
      "Rénovation complète de la salle de bain avec nouveau système de plomberie.",
    ],
    specifiques: [
      "Le diagnostic a été rapide et précis, la cause trouvée immédiatement.",
      "Les pièces nécessaires étaient dans le camion, pas besoin de repasser.",
      "La réparation a été solide, aucune fuite depuis.",
      "L'intervention a été nette, les joints et raccords bien posés.",
    ],
  },
  electricite: {
    contextes: [
      "Notre tableau électrique était vétuste et non conforme aux normes.",
      "Mise aux normes de l'installation électrique avant vente.",
      "Installation de prises et d'éclairage dans une pièce rénovée.",
      "Un court-circuit répété nous a poussés à faire vérifier l'installation.",
    ],
    specifiques: [
      "Le diagnostic de l'installation a été complet et documenté.",
      "Le tableau a été refait proprement, tout est étiqueté.",
      "Les gaines ont été posées soigneusement, le travail est invisible.",
      "Un certificat de conformité nous a été remis à la fin des travaux.",
    ],
  },
  auto: {
    contextes: [
      "En panne sur le bord de la route, j'ai appelé {fiche} en urgence.",
      "Mon véhicule ne démarrait plus, une intervention rapide était nécessaire.",
      "Suite à un accident, mon véhicule devait être remorqué.",
      "Une panne moteur imprévue sur la route à {ville}.",
    ],
    specifiques: [
      "Le dépanneur est arrivé en moins de 30 minutes, très réactif.",
      "Le diagnostic a été fait sur place, clairement expliqué.",
      "Le véhicule a été pris en charge avec soin.",
      "Le prix annoncé au téléphone correspondait à la facture finale.",
    ],
  },
  nettoyage: {
    contextes: [
      "Notre local professionnel nécessitait un nettoyage en profondeur.",
      "Fin de chantier, un nettoyage complet était nécessaire avant livraison.",
      "Notre terrasse et nos allées étaient à nettoyer après l'hiver.",
    ],
    specifiques: [
      "Le matériel utilisé était professionnel et adapté.",
      "Chaque recoin a été traité, le résultat est vraiment propre.",
      "Le produit utilisé n'a pas abîmé les surfaces.",
    ],
  },
  generic: {
    contextes: [
      "Nous avions un besoin urgent d'un professionnel sérieux.",
      "Après plusieurs devis, nous avons choisi {fiche} pour sa réactivité.",
      "Notre projet demandait une vraie expertise.",
    ],
    specifiques: [
      "L'équipe s'est montrée compétente et sérieuse tout au long du chantier.",
      "Le travail réalisé était conforme au devis et aux attentes.",
      "La prestation était de qualité, sans mauvaise surprise.",
    ],
  },
};

const _GEN_COMMUN_UNUSED = {
  contacts: [
    "Le premier contact a été rapide et professionnel.",
    "Dès le premier appel, j'ai été bien orienté.",
    "La prise en charge a été immédiate.",
    "Devis reçu dans la journée, clair et sans surprise.",
    "On m'a rappelé rapidement, c'est appréciable.",
    "Réactivité au rendez-vous dès le départ.",
    "",
    "",
  ],
  interventions: [
    "L'équipe est intervenue dans les délais convenus.",
    "Les professionnels sont arrivés à l'heure prévue.",
    "L'intervention a été réalisée proprement et dans les temps.",
    "Le chantier a été mené de bout en bout avec sérieux.",
    "Travail réalisé efficacement, sans laisser de désordre.",
    "Le travail a été fait dans les délais annoncés.",
    "L'équipe était bien équipée et savait exactement ce qu'elle faisait.",
    "Intervention rapide et bien organisée.",
  ],
  qualites: [
    "Travail soigné et de qualité.",
    "Prestation très propre, je suis satisfait du résultat.",
    "La qualité correspond exactement à ce qui avait été annoncé.",
    "Résultat impeccable, conforme à mes attentes.",
    "Excellent niveau de finition.",
    "On voit que ce sont des gens du métier.",
    "Très bon rapport qualité-prix.",
    "Le résultat parle de lui-même.",
  ],
  details: [
    "Ils ont pris le temps d'expliquer chaque étape.",
    "Le responsable était disponible pour répondre à mes questions.",
    "L'équipe a fait preuve d'un vrai sens du détail.",
    "Ils ont respecté ma propriété.",
    "Tout a été nettoyé avant de partir.",
    "On sentait une vraie expérience dans ce domaine.",
    "La communication tout au long du projet était bonne.",
    "",
    "",
  ],
  recommandations: [
    "Je recommande sans hésitation.",
    "Je n'hésiterai pas à les recontacter.",
    "Je recommande vivement {fiche} pour ce type de prestation.",
    "Je ferai à nouveau appel à eux.",
    "À recommander à tous ceux qui cherchent un professionnel sérieux à {ville}.",
    "Une bonne adresse à retenir sur {ville}.",
    "Très satisfait, je passerai par eux pour mes prochains travaux.",
    "Bonne expérience globale, je recommande.",
  ],
  decouvertes: [
    "J'ai fait appel à {fiche} pour {travaux} à {ville}",
    "Suite à un besoin de {travaux} à {ville}, j'ai contacté {fiche}",
    "Après recherche d'un professionnel pour {travaux} à {ville}, j'ai choisi {fiche}",
    "Pour {travaux} dans ma propriété à {ville}, j'ai fait confiance à {fiche}",
    "J'avais besoin d'un spécialiste pour {travaux} à {ville} et j'ai trouvé {fiche}",
    "C'est en cherchant un artisan sérieux à {ville} que j'ai découvert {fiche}",
  ],
  courts: [
    "Très bonne prestation de {fiche} pour {travaux} à {ville}. Travail sérieux, délais respectés. Je recommande.",
    "{fiche} est intervenu pour {travaux} à {ville}. Efficace et propre. Satisfait.",
    "Bon professionnel pour {travaux} à {ville}. Devis honnête, travail de qualité. À recommander.",
    "Fait appel à {fiche} pour {travaux} à {ville}. Tout s'est très bien passé. Je recommande.",
    "Prestation sérieuse de {fiche} pour {travaux} à {ville}. Bonne expérience.",
  ],
  intro_details: [
    "Je tenais à laisser un avis sur {fiche} suite à {travaux} réalisés à {ville}.",
    "Voici mon retour après avoir fait appel à {fiche} pour {travaux} à {ville}.",
    "J'utilise rarement les avis en ligne mais l'intervention de {fiche} pour {travaux} à {ville} mérite d'être saluée.",
  ],
};

// Introduit des imperfections humaines naturelles (accents manquants, pluriel oublié)
function humaniser(texte) {
  // ~40% de chance d'appliquer des imperfections
  if (Math.random() > 0.6) return texte;

  let t = texte;

  // Supprimer aléatoirement des accents (1 ou 2 par avis max)
  const accents = [
    [/é/g, 'e'], [/è/g, 'e'], [/ê/g, 'e'], [/ë/g, 'e'],
    [/à/g, 'a'], [/â/g, 'a'],
    [/ô/g, 'o'], [/û/g, 'u'], [/î/g, 'i'], [/ù/g, 'u'],
  ];
  // On choisit 1 ou 2 types d'accents à supprimer
  const nb = rnd([1, 1, 1, 2]);
  for (let i = 0; i < nb; i++) {
    const [regex, replace] = rnd(accents);
    // On ne supprime pas TOUS les accents de ce type, seulement certains
    t = t.replace(regex, (match) => Math.random() < 0.45 ? replace : match);
  }

  // Oublier le 's' du pluriel sur certains mots (~20% de chance)
  if (Math.random() < 0.2) {
    const motsPluriels = [
      'délais', 'résultats', 'finitions', 'travaux', 'ouvriers',
      'joints', 'tuiles', 'matériaux', 'raccords', 'surfaces',
      'gaines', 'murs', 'angles', 'arbres', 'branches',
    ];
    const mot = rnd(motsPluriels);
    // Remplace seulement la première occurrence
    t = t.replace(mot, mot.slice(0, -1));
  }

  return t;
}

// Historique des derniers avis générés pour éviter les doublons
let _genHistory = [];

function getGeminiKey() {
  return localStorage.getItem('gemini_api_key') || '';
}

function promptGeminiKey() {
  const existing = getGeminiKey();
  const key = prompt(existing ? 'Clé API Gemini (laisser vide pour annuler) :' : '🔑 Entre ta clé API Google AI Studio pour activer le générateur :', existing || '');
  if (key === null) return false;
  const k = key.trim();
  if (k) { localStorage.setItem('gemini_api_key', k); return true; }
  return !!existing;
}

async function genererAvis() {
  const fiche   = document.getElementById('gen-fiche').value.trim();
  const travaux = document.getElementById('gen-travaux').value.trim();
  let   ville   = document.getElementById('gen-ville').value.trim();
  const ton     = document.getElementById('gen-ton').value;

  const meteoSelect = document.getElementById('gen-meteo');
  const meteoVal    = meteoSelect ? meteoSelect.value : 'auto';

  const villeFiche = extraireVilleFiche(fiche) || ville;
  if (!ville && villeFiche) {
    ville = villeFiche;
    const elV = document.getElementById('gen-ville');
    if (elV) elV.value = ville;
  }

  if (!fiche || !travaux || !ville) {
    alert('Merci de remplir les 3 champs obligatoires.');
    return;
  }

  let apiKey = getGeminiKey();
  if (!apiKey && _apiProxyBase()) apiKey = 'via-proxy';
  if (!apiKey) {
    if (!promptGeminiKey()) return;
    apiKey = getGeminiKey();
  }

  const tonLabel = { neutre: 'neutre et factuel', enthousiaste: 'enthousiaste et chaleureux', detaille: 'détaillé et précis', court: 'court et direct' }[ton] || 'neutre';

  // Détermination dynamique des variables anti-filtrage Google
  const isAuto = detecterMetier(fiche) === 'auto';

  const introRole = isAuto
    ? 'Tu es un vrai client français qui laisse un avis Google après un dépannage automobile (panne, remorquage, intervention au bord de la route ou sur place).'
    : 'Tu es un vrai client français qui laisse un avis Google après une intervention à domicile.';

  const detailConcret = isAuto
    ? 'Inclure au moins un détail concret propre au dépannage auto : délai d\'arrivée du dépanneur, réactivité (nuit, week-end, heure de pointe), diagnostic de la panne, dépannage sur place ou remorquage, tarif annoncé avant intervention, prise en charge rassurante. INTERDIT : voisins, mobilier, chantier, propreté du chantier, finitions, devis de travaux.'
    : 'Inclure au moins un détail concret : voisins qui réagissent, propreté du chantier, ponctualité, conformité du devis, qualité des finitions, protection du mobilier';

  const contexteMeteoSaison = obtenirContexteMeteoSaisonnier(meteoVal);
  const personaAuteur       = genererPersonaAuteur();
  const structureNarrative  = genererStructureNarrative();

  // 60% du temps : ne pas mentionner le nom exact de l'entreprise (termes neutres comme L'équipe / L'artisan / Ils)
  // 40% du temps : mentionner le nom de l'entreprise 1 fois max
  const mentionnerNomEntreprise = Math.random() < 0.4;
  const regleNomCommercial = mentionnerNomEntreprise
    ? `MENTION DU NOM COMMERCIAL : Tu peux mentionner le nom de l'entreprise ("${fiche}") 1 seule fois maximum dans l'avis.`
    : `MENTION DU NOM COMMERCIAL : NE MENTIONNE PAS le nom complet de l'entreprise ("${fiche}"). Utilise des termes neutres ("L'équipe", "L'artisan", "Les intervenants", "Ils") comme le font la majorité des vrais clients sur Google.`;

  // Alternance 50/50 : 50% ville exacte du GMB, 50% ville voisine secteur (< 35 km)
  const useExactCity = Math.random() < 0.5;

  const regleVilleGeo = useExactCity
    ? `6. RÈGLE STRICTE DE GÉOLOCALISATION / VILLE (VILLE EXACTE GMB) :
   - Tu DOIS OBLIGATOIREMENT mentionner la ville exacte de la fiche GMB ("${villeFiche}") dans le texte de l'avis (ex: "sur ${villeFiche}", "à ${villeFiche}...").
   - Ne mentionne aucune autre ville que "${villeFiche}".`
    : `6. RÈGLE STRICTE DE GÉOLOCALISATION / VILLE (COMMUNE VOISINE < 35 KM) :
   - Tu DOIS OBLIGATOIREMENT mentionner une commune voisine ou petite ville du secteur située à MAXIMUM 35 km autour de "${villeFiche}" (ex: commune limitrophe ou voisine du secteur).
   - Ne cite PAS la ville "${villeFiche}" elle-même mais une commune proche de son secteur (< 35 km). INTERDICTION ABSOLUE de citer une ville éloignée hors de ce rayon.`;

  const prompt = `${introRole}

Informations :
- Entreprise : ${fiche}
- ${isAuto ? 'Intervention' : 'Travaux'} : ${travaux}
- Ville principale de la fiche GMB : ${villeFiche}
- Ville / Commune d'intervention : ${ville}
- Ton : ${tonLabel}
- Profil / Persona de l'auteur : ${personaAuteur}
- Contexte Météo / Saison : ${contexteMeteoSaison}

Règles de rédaction strictes :
1. Écris à la première personne (je, on, nous) — style humain, spontané, pas de formulation commerciale
2. Angle / Structure narrative suggérée : ${structureNarrative}
3. ${detailConcret}
4. Contexte temporel & météo : Intègre si approprié un léger détail temporel ou météo lié au contexte ("${contexteMeteoSaison}") ou à l'organisation ("intervention semaine dernière", "appels suite aux intempéries", "rendez-vous fixé vite", etc.)
5. ${regleNomCommercial}
${regleVilleGeo}
7. Vocabulaire & Authenticité : langage familier modéré OK ("les gars", "nickel", "boulot", "super sympa", "rien à redire"). INTERDIT : "franchement", "le matos", "vachement", "trop bien", "au top", "je recommande à 100%".
8. Les fautes de frappe légères et petites imprécisions de ponctuation sont acceptées et souhaitées pour l'authenticité
9. Longueur : court (2-3 phrases) / neutre (3-4 phrases) / détaillé (5-7 phrases) / enthousiaste (4-5 phrases)
10. Conclusions variées et naturelles — évite absolument les formules répétitives
11. Réponds UNIQUEMENT avec le texte de l'avis — aucun guillemet, aucune introduction, aucune explication

Avis :`;

  const result = document.getElementById('gen-result');
  const textEl = document.getElementById('gen-texte');
  result.classList.remove('hidden');
  textEl.textContent = '✨ Génération en cours...';
  document.getElementById('gen-copy-confirm').classList.add('hidden');

  try {
    const _proxy = _apiProxyBase();
    const _geminiUrl = _proxy
      ? `${_proxy}/gemini/v1beta/models/gemini-2.5-flash:generateContent`
      : `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(_geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.85 + Math.random() * 0.25,
          topP: 0.95
        }
      })
    });

    const data = await res.json();

    if (!res.ok) {
      const msg = data?.error?.message || `Erreur ${res.status}`;
      if (res.status === 400 || res.status === 403) localStorage.removeItem('gemini_api_key');
      textEl.textContent = `❌ ${msg}`;
      return;
    }

    const texte = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!texte) {
      const reason = data?.candidates?.[0]?.finishReason || JSON.stringify(data).slice(0, 100);
      textEl.textContent = `❌ Réponse vide (${reason}). Réessaie.`;
      return;
    }
    textEl.textContent = texte;
  } catch(e) {
    textEl.textContent = '❌ Erreur réseau, vérifie ta connexion.';
  }
}

function copierAvis() {
  const texte = document.getElementById('gen-texte').textContent;
  navigator.clipboard.writeText(texte).then(() => {
    const confirm = document.getElementById('gen-copy-confirm');
    confirm.classList.remove('hidden');
    setTimeout(() => confirm.classList.add('hidden'), 2500);
  });
}

function changerCleGemini() {
  localStorage.removeItem('gemini_api_key');
  if (promptGeminiKey()) {
    alert('✅ Clé API mise à jour.');
  }
}

// ── RECOMMANDATIONS ──
const ASSETS_URL        = 'https://docs.google.com/spreadsheets/d/18I09oFGfd8-WUXfDS0XVzIDTUL6TZ0HOc6nXIU1U3UI/export?format=csv&gid=0';
const ASSETS_DATES_URL  = 'https://docs.google.com/spreadsheets/d/18I09oFGfd8-WUXfDS0XVzIDTUL6TZ0HOc6nXIU1U3UI/export?format=csv&gid=583203849';
const ASSETS_CITIES_URL = 'https://docs.google.com/spreadsheets/d/18I09oFGfd8-WUXfDS0XVzIDTUL6TZ0HOc6nXIU1U3UI/export?format=csv&gid=987118741';
let _assetsCache = null;
let _datesCache  = null;
let _citiesCache = null;
let _recoOffset  = 0;

function parseCSVLine(line) {
  const cols = []; let cur = ''; let inQ = false;
  for (const c of line) {
    if (c === '"') inQ = !inQ;
    else if (c === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
    else cur += c;
  }
  cols.push(cur.trim());
  return cols;
}

async function getAssets() {
  if (_assetsCache) return _assetsCache;
  try {
    // Tab 1 : comptes avec domaine (ville extraite du domaine)
    const res = await fetch(ASSETS_URL);
    const text = await res.text();
    const rows = text.split('\n').filter(l => l.trim()).map(l => {
      const c = parseCSVLine(l);
      const rawGmail = (c[2] || '').split(/[\s\/,\n]/)[0].trim();
      const gmail = rawGmail.includes('@') ? rawGmail : '';
      return { domain: (c[0] || '').trim(), gmail, statut: (c[3] || '').trim(), city: null };
    }).filter(r => r.statut === 'Enable' && r.gmail);

    // Tab 3 : comptes avec ville explicite (col A = gmail, col B = ville)
    let extra = [];
    try {
      const res2 = await fetch(ASSETS_CITIES_URL);
      const text2 = await res2.text();
      extra = text2.split('\n').filter(l => l.trim()).map(l => {
        const c = parseCSVLine(l);
        const gmail = (c[0] || '').trim().toLowerCase();
        const city  = normalizeReco((c[1] || '').replace(/_/g, ' '));
        return gmail.includes('@gmail.com') ? { domain: '', gmail, statut: 'Enable', city } : null;
      }).filter(Boolean);
    } catch(e) {}

    // Fusion — les gmails du tab 3 déjà présents dans tab 1 ne sont pas doublonnés
    const existingGmails = new Set(rows.map(r => r.gmail.toLowerCase()));
    const merged = [...rows, ...extra.filter(r => !existingGmails.has(r.gmail.toLowerCase()))];
    _assetsCache = merged;
    return merged;
  } catch(e) { return []; }
}

async function getOpeningDates() {
  if (_datesCache) return _datesCache;
  try {
    const res = await fetch(ASSETS_DATES_URL);
    const text = await res.text();
    const map = {};
    text.split('\n').slice(1).filter(l => l.trim()).forEach(l => {
      const c = parseCSVLine(l);
      if (c[0] && c[1]) map[c[0].trim()] = c[1].trim();
    });
    _datesCache = map;
    return map;
  } catch(e) { return {}; }
}

// ── Cooldown J+8 (localStorage) ──
function getRecoHistory() {
  try { return JSON.parse(localStorage.getItem('reco_history') || '{}'); } catch { return {}; }
}
function markGmailUsed(gmail) {
  const h = getRecoHistory();
  h[gmail] = Math.floor(Date.now() / 86400000);
  localStorage.setItem('reco_history', JSON.stringify(h));
}
function isGmailAvailable(gmail, dayNum) {
  const h = getRecoHistory();
  return !h[gmail] || (dayNum - h[gmail]) >= 8;
}
function daysUntilAvailable(gmail, dayNum) {
  const h = getRecoHistory();
  if (!h[gmail]) return 0;
  return Math.max(0, 8 - (dayNum - h[gmail]));
}

// ── Géographie ──
function normalizeReco(s) {
  return (s || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/['''\-]/g, ' ').replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

const SVC_WORDS = ['elagage','abattage','nettoyage','couvreur','couverture','renovation','toiture','facade','ravalement','paysagiste','etancheite','terrassement','vitrier','demoussage','reparation','entretien','artisan','paysage','emondage','debarras','depannage','remorquage','service','services','express','infiltration','fuite','ets','grimpeur','arboriste'];

function extractCity(str) {
  let s = normalizeReco(str).replace(/\.(fr|be|lu|ch|ca|com|org|net)$/, '');
  SVC_WORDS.forEach(w => { s = s.replace(new RegExp('\\b' + w + '\\b', 'g'), ' '); });
  return s.replace(/\b\d{2,3}\b/g, ' ').replace(/\s+/g, ' ').trim();
}

// Villes principales → villes voisines à ~50-100km
const CITY_NEIGHBORS = {
  'bordeaux':     ['merignac','pessac','libourne','bergerac','perigueux','agen','saintes','angouleme','bayonne','arcachon','langon','blaye'],
  'bayonne':      ['biarritz','anglet','pau','dax','bordeaux','mont de marsan'],
  'pau':          ['bayonne','tarbes','oloron','lourdes','dax'],
  'toulouse':     ['montauban','carcassonne','foix','pamiers','auch','albi','castres','muret','saint gaudens'],
  'montpellier':  ['nimes','beziers','lunel','sete','ales','arles'],
  'nimes':        ['montpellier','ales','avignon','arles','uzas','bagnols sur ceze'],
  'marseille':    ['aix en provence','toulon','aubagne','salon de provence','martigues','arles','istres'],
  'toulon':       ['marseille','hyeres','brignoles','draguignan','la seyne'],
  'nice':         ['cannes','antibes','menton','monaco','grasse','vence'],
  'lyon':         ['villeurbanne','vienne','bourgoin jallieu','saint etienne','amberlieu','bourg en bresse','macon','tarare'],
  'saint etienne':['lyon','roanne','le puy','firminy','rive de gier'],
  'grenoble':     ['voiron','chambery','gap','valence','vienne','pontcharra'],
  'annecy':       ['chambery','albertville','thonon','cluses','grenoble'],
  'chambery':     ['annecy','grenoble','albertville','aix les bains'],
  'paris':        ['versailles','boulogne billancourt','saint denis','montreuil','nanterre','creteil','vincennes','argenteuil','vitry','ivry','colombes','levallois','neuilly','melun','evry','cergy','meaux'],
  'versailles':   ['paris','mantes la jolie','rambouillet','poissy','saint germain en laye'],
  'lille':        ['tourcoing','roubaix','villeneuve dascq','bethune','lens','douai','arras','valencienness'],
  'arras':        ['lille','lens','saint quentin','cambrai','amiens'],
  'amiens':       ['arras','beauvais','abbeville','saint quentin','compiegne'],
  'rouen':        ['le havre','caen','evreux','dieppe','elbeuf','louviers'],
  'le havre':     ['rouen','caen','fecamp','yvetot'],
  'caen':         ['rouen','cherbourg','saint lo','lisieux','bayeux','falaise'],
  'rennes':       ['saint malo','fougeres','vitres','redon','vannes','laval'],
  'nantes':       ['saint nazaire','angers','laval','rennes','cholet','la roche sur yon'],
  'angers':       ['nantes','saumur','laval','le mans','cholet'],
  'brest':        ['quimper','saint brieuc','morlaix','landerneau'],
  'quimper':      ['brest','lorient','douarnenez','concarneau'],
  'lorient':      ['quimper','vannes','pontivy'],
  'vannes':       ['lorient','rennes','nantes','ploermel'],
  'strasbourg':   ['colmar','mulhouse','haguenau','saverne','selestat'],
  'mulhouse':     ['strasbourg','colmar','belfort','altkirch'],
  'metz':         ['nancy','thionville','sarreguemines','verdun'],
  'nancy':        ['metz','epinal','toul','bar le duc'],
  'dijon':        ['chalon sur saone','macon','auxerre','beaune','dole'],
  'besancon':     ['dole','pontarlier','lons le saunier','belfort','montbeliard'],
  'clermont ferrand':['riom','vichy','thiers','issoire','moulins'],
  'limoges':      ['brive','gueret','perigueux','angouleme','tulle'],
  'tours':        ['blois','amboise','chinon','loches','vendome'],
  'orleans':      ['blois','chartres','montargis','chateauroux','gien'],
  'reims':        ['chalons en champagne','epernay','laon','soissons','troyes'],
  'troyes':       ['reims','chaumont','sens','auxerre'],
  'le mans':      ['tours','laval','alencon','angers','chartres'],
  'chartres':     ['orleans','le mans','evreux','dreux','versailles'],
};

// Départements → villes principales (pour Local Guide étendu)
const DEPT_CITIES = {
  33:['bordeaux','merignac','pessac','libourne','arcachon','langon','blaye'],
  31:['toulouse','muret','saint gaudens','colomiers','blagnac'],
  69:['lyon','villeurbanne','bron','venissieux','givors','caluire'],
  13:['marseille','aix en provence','arles','martigues','salon de provence','aubagne','istres'],
  59:['lille','tourcoing','roubaix','dunkerque','valenciennes','douai','lens'],
  75:['paris'],76:['rouen','le havre','dieppe','fecamp'],
  44:['nantes','saint nazaire','cholet','ancenis'],
  67:['strasbourg','haguenau','saverne'],
  35:['rennes','saint malo','fougeres'],
  29:['brest','quimper','morlaix','lorient'],
  34:['montpellier','beziers','sete','lunel'],
  06:['nice','cannes','antibes','grasse'],
  83:['toulon','draguignan','hyeres','frejus'],
  38:['grenoble','vienne','voiron','bourgoin jallieu'],
  21:['dijon','beaune','chenove'],
  63:['clermont ferrand','riom','issoire','thiers'],
  87:['limoges','saint junien'],
  37:['tours','amboise','chinon'],
  45:['orleans','montargis','gien'],
};

function getLocalGuides() {
  try { return JSON.parse(localStorage.getItem('local_guides') || '[]'); } catch { return []; }
}
function toggleLocalGuide(gmail) {
  const lgs = getLocalGuides();
  const idx = lgs.indexOf(gmail);
  if (idx >= 0) lgs.splice(idx, 1); else lgs.push(gmail);
  localStorage.setItem('local_guides', JSON.stringify(lgs));
}
function isLocalGuide(gmail) {
  return getLocalGuides().includes(gmail);
}
function refreshLGPanel() {
  const countEl = document.getElementById('lg-panel-count');
  const bodyEl  = document.getElementById('lg-panel-body');
  if (!countEl || !bodyEl) return;
  const allLGs = getLocalGuides();
  countEl.style.color = allLGs.length ? '#fbbf24' : '#475569';
  countEl.textContent = allLGs.length;
  const note = bodyEl.querySelector('p');
  bodyEl.innerHTML = '';
  if (note) bodyEl.appendChild(note);
  if (allLGs.length === 0) {
    const empty = document.createElement('p');
    empty.style.cssText = 'font-size:12px;color:#334155;font-style:italic;';
    empty.textContent = 'Aucun compte Local Guide pour l\'instant.';
    bodyEl.appendChild(empty);
  } else {
    const chips = document.createElement('div');
    chips.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;';
    allLGs.forEach(gmail => {
      const chip = document.createElement('div');
      chip.style.cssText = 'background:#422006;color:#fcd34d;border:1px solid #92400e;border-radius:99px;padding:3px 10px;font-size:11px;display:flex;align-items:center;gap:6px;';
      chip.innerHTML = `<span>⭐ ${gmail}</span><button title="Retirer" onclick="toggleLocalGuide('${gmail}');_assetsCache=null;refreshLGPanel();document.querySelectorAll('[data-lg-gmail]').forEach(b=>{if(b.dataset.lgGmail==='${gmail}'){b.dataset.lgActive='false';b.__applyLG&&b.__applyLG(false);}});" style="background:none;border:none;color:#b45309;cursor:pointer;font-size:13px;padding:0;line-height:1;">✕</button>`;
      chips.appendChild(chip);
    });
    bodyEl.appendChild(chips);
  }
}

function cityMatchScore(city1, city2) {
  // 1 si même mot significatif en commun
  const w1 = city1.split(' ').filter(w => w.length > 3);
  const w2 = city2.split(' ').filter(w => w.length > 3);
  if (!w1.length || !w2.length) return 0;
  const common = w1.filter(w => w2.includes(w));
  return common.length / Math.max(w1.length, w2.length);
}

function getGeoScore(gmailCity, ficheName, localGuide) {
  const ficheCity = extractCity(ficheName);

  // Niveau 1 : même ville (+800)
  if (cityMatchScore(gmailCity, ficheCity) >= 0.5) return 800;

  // Niveau 2 : ville voisine à ~50-100km (+400)
  const neighbors = CITY_NEIGHBORS[gmailCity] || [];
  if (neighbors.some(n => ficheCity.includes(n) || n.split(' ').every(w => ficheCity.includes(w)))) return 400;
  // Symétrique : fiche est la ville principale, gmail est dans ses voisins
  for (const [mainCity, nbs] of Object.entries(CITY_NEIGHBORS)) {
    if ((ficheCity.includes(mainCity) || mainCity.split(' ').every(w => ficheCity.includes(w))) &&
        nbs.some(n => gmailCity.includes(n) || n.split(' ').every(w => gmailCity.includes(w)))) return 400;
  }

  // Niveau 3 : même département (seulement Local Guide) (+200)
  if (localGuide) {
    for (const [dept, cities] of Object.entries(DEPT_CITIES)) {
      const gmailInDept = cities.some(c => gmailCity.includes(c) || c.split(' ').every(w => gmailCity.includes(w)));
      const ficheInDept = cities.some(c => ficheCity.includes(c) || c.split(' ').every(w => ficheCity.includes(w)));
      if (gmailInDept && ficheInDept) return 200;
    }
  }

  return 0;
}

function ficheMatchScore(ficheName, domainCity) {
  const fn = normalizeReco(ficheName);
  const words = domainCity.split(' ').filter(w => w.length > 3);
  if (!words.length) return 0;
  return words.filter(w => fn.includes(w)).length / words.length;
}

async function computeRecos(offset) {
  const [assets, fiches, avis, openDates] = await Promise.all([
    getAssets(), getFiches(), getAvis(), getOpeningDates()
  ]);
  if (!assets.length || !fiches.length) return null;

  const now = Date.now();
  const dayNum = Math.floor(now / 86400000) + offset;

  const avisCount = {};
  avis.forEach(a => { avisCount[a.fiche_nom] = (avisCount[a.fiche_nom] || 0) + 1; });

  const ficheData = fiches.map(f => {
    const ref = (f.date_ouverture || openDates[f.nom])
      ? new Date(f.date_ouverture || openDates[f.nom]).getTime()
      : new Date(f.created_at).getTime();
    const ageDays = Math.round((now - ref) / 86400000);
    return { ...f, ageDays, count: avisCount[f.nom] || 0, maxPerDay: ageDays > 42 ? 2 : 1 };
  });

  const available = assets.filter(a => isGmailAvailable(a.gmail, dayNum));
  if (!available.length) return [];

  const start = ((dayNum % available.length) + available.length) % available.length;

  const ficheSlots = {};
  const recos = [];
  let totalAvis = 0;

  // 1 gmail → 1 fiche, mais compte pour 1 ou 2 avis selon l'âge de la fiche
  for (let i = 0; totalAvis < 20 && i < available.length; i++) {
    const acct = available[(start + i) % available.length];
    const city = acct.city || extractCity(acct.domain);
    const lg = isLocalGuide(acct.gmail);

    const ownFiche = ficheData
      .map(f => ({ f, s: ficheMatchScore(f.nom, city) }))
      .filter(x => x.s >= 0.5)
      .sort((a, b) => b.s - a.s)[0]?.f;

    const candidates = ficheData
      .filter(f =>
        f.nom !== ownFiche?.nom &&
        (ficheSlots[f.nom] || 0) < f.maxPerDay
      )
      .map(f => {
        const geoBonus = getGeoScore(city, f.nom, lg);
        const score = (500 - f.count * 10) + (f.ageDays * 2) + geoBonus;
        return { ...f, score, geoBonus };
      })
      .sort((a, b) => b.score - a.score);

    if (candidates[0]) {
      ficheSlots[candidates[0].nom] = (ficheSlots[candidates[0].nom] || 0) + 1;
      totalAvis += candidates[0].maxPerDay;
      recos.push({ acct, target: candidates[0], ownFiche, dayNum, lg });
    }
  }
  return recos;
}

function changeRecoDay(delta) {
  if (delta === 0) _recoOffset = 0;
  else _recoOffset += delta;
  renderRecommandations();
}

// ── RECOS MANUELLES URGENTES ──
function getRecosManuelles() {
  try { return JSON.parse(localStorage.getItem('recos_manuelles') || '[]'); } catch { return []; }
}
function saveRecosManuelles(list) {
  localStorage.setItem('recos_manuelles', JSON.stringify(list));
}
function supprimerRecoManuelle(idx) {
  const list = getRecosManuelles();
  list.splice(idx, 1);
  saveRecosManuelles(list);
  renderRecommandations();
}

async function afficherFormulaireRecoManuelle() {
  const fiches = await getFiches();
  const assets = await getAssets();

  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:#0008;z-index:1000;display:flex;align-items:center;justify-content:center;';

  const box = document.createElement('div');
  box.style.cssText = 'background:#1e293b;border:1px solid #334155;border-radius:14px;padding:24px;width:90%;max-width:480px;display:flex;flex-direction:column;gap:14px;';

  box.innerHTML = `
    <div style="font-size:15px;font-weight:700;color:#f1f5f9;">🔴 Ajouter une reco urgente</div>
    <div>
      <div style="font-size:11px;color:#475569;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Gmail *</div>
      <input id="modal-gmail" list="modal-gmail-list" placeholder="compte@gmail.com" autocomplete="off"
        style="width:100%;background:#0f172a;border:1px solid #334155;border-radius:8px;padding:8px 10px;color:#f1f5f9;font-size:13px;box-sizing:border-box;">
      <datalist id="modal-gmail-list">${assets.map(a=>`<option value="${a.gmail}">`).join('')}</datalist>
    </div>
    <div>
      <div style="font-size:11px;color:#475569;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Fiche cible *</div>
      <input id="modal-fiche" list="modal-fiche-list" placeholder="Nom de la fiche..." autocomplete="off"
        style="width:100%;background:#0f172a;border:1px solid #334155;border-radius:8px;padding:8px 10px;color:#f1f5f9;font-size:13px;box-sizing:border-box;">
      <datalist id="modal-fiche-list">${fiches.map(f=>`<option value="${f.nom.replace(/"/g,'&quot;')}">`).join('')}</datalist>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px;">
      <button id="modal-cancel" style="background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:8px;padding:8px 16px;font-size:13px;cursor:pointer;">Annuler</button>
      <button id="modal-save" style="background:#7f1d1d;color:#fca5a5;border:1px solid #991b1b;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;">🔴 Ajouter urgent</button>
    </div>`;

  modal.appendChild(box);
  document.body.appendChild(modal);

  document.getElementById('modal-cancel').onclick = () => modal.remove();
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  document.getElementById('modal-save').onclick = () => {
    const gmail = document.getElementById('modal-gmail').value.trim();
    const fiche = document.getElementById('modal-fiche').value.trim();
    if (!gmail || !fiche) { alert('Gmail et fiche requis.'); return; }
    const list = getRecosManuelles();
    list.push({ gmail, fiche, urgent: true });
    saveRecosManuelles(list);
    modal.remove();
    renderRecommandations();
  };
}

async function renderRecommandations() {
  const container = document.getElementById('reco-list');
  const dateEl    = document.getElementById('reco-date');
  container.innerHTML = '<p style="color:#64748b;padding:1rem 0">Chargement...</p>';

  const today = new Date(Date.now() + _recoOffset * 86400000);
  const jours = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const mois  = ['jan','fév','mar','avr','mai','juin','juil','août','sep','oct','nov','déc'];
  dateEl.textContent = `${jours[today.getDay()]} ${today.getDate()} ${mois[today.getMonth()]} ${today.getFullYear()}`;

  const day = today.getDay();
  if (day === 0 || day === 6) {
    container.innerHTML = '<div style="text-align:center;color:#64748b;padding:3rem;font-size:1rem">📅 Pas de recommandations le weekend</div>';
    return;
  }

  try {
    const recos = await computeRecos(_recoOffset);
    if (!recos) {
      container.innerHTML = '<p style="color:#ef4444;padding:1rem 0">Impossible de charger le Sheet. Vérifiez qu\'il est partagé en lecture publique.</p>';
      return;
    }
    if (!recos.length) {
      container.innerHTML = '<p style="color:#f97316;padding:1rem 0">Tous les comptes sont en cooldown. Revenez demain ou consultez un jour différent.</p>';
      return;
    }

    container.innerHTML = '';
    container.style.cssText = 'display:flex;flex-direction:column;gap:8px;';

    // Recos manuelles urgentes
    const manuelles = getRecosManuelles();
    manuelles.forEach((m, idx) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:12px;background:#450a0a;border:2px solid #991b1b;border-radius:10px;padding:12px 16px;flex-wrap:wrap;';

      const badge = document.createElement('span');
      badge.style.cssText = 'background:#7f1d1d;color:#fca5a5;font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;flex-shrink:0;';
      badge.textContent = '🔴 URGENT';

      const gmailWrap = document.createElement('div');
      gmailWrap.style.cssText = 'flex:1;min-width:180px;';
      gmailWrap.innerHTML = `<div style="font-size:11px;color:#f87171;margin-bottom:2px;text-transform:uppercase;letter-spacing:.05em">Gmail</div><div style="font-size:13px;color:#fca5a5;font-weight:500;word-break:break-all">${m.gmail}</div>`;

      const arrow = document.createElement('span');
      arrow.style.cssText = 'color:#991b1b;font-size:20px;flex-shrink:0;';
      arrow.textContent = '→';

      const ficheWrap = document.createElement('div');
      ficheWrap.style.cssText = 'flex:2;min-width:200px;';
      ficheWrap.innerHTML = `<div style="font-size:11px;color:#f87171;margin-bottom:2px;text-transform:uppercase;letter-spacing:.05em">Fiche cible</div><span style="font-size:13px;font-weight:600;color:#fef2f2;">${m.fiche}</span>`;

      const btns = document.createElement('div');
      btns.style.cssText = 'display:flex;gap:6px;flex-shrink:0;';

      const copyBtn = document.createElement('button');
      copyBtn.style.cssText = 'background:#172554;color:#93c5fd;border:1px solid #1e40af;border-radius:8px;padding:5px 10px;font-size:12px;cursor:pointer;white-space:nowrap;';
      copyBtn.textContent = '📋 Gmail';
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(m.gmail);
        copyBtn.textContent = '✅';
        setTimeout(() => { copyBtn.textContent = '📋 Gmail'; }, 1500);
      };

      const delBtn = document.createElement('button');
      delBtn.style.cssText = 'background:#1c1917;color:#a8a29e;border:1px solid #44403c;border-radius:8px;padding:5px 10px;font-size:12px;cursor:pointer;white-space:nowrap;';
      delBtn.textContent = '🗑 Supprimer';
      delBtn.onclick = () => { supprimerRecoManuelle(idx); renderRecommandations(); };

      btns.append(copyBtn, delBtn);
      row.append(badge, gmailWrap, arrow, ficheWrap, btns);
      container.appendChild(row);
    });



    recos.forEach((r, i) => {
      const row = document.createElement('div');
      row.id = 'reco-row-' + i;
      row.style.cssText = 'display:flex;align-items:center;gap:12px;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:12px 16px;flex-wrap:wrap;transition:opacity .3s;';

      const num = document.createElement('span');
      num.style.cssText = 'width:22px;flex-shrink:0;font-weight:700;color:#475569;font-size:13px;text-align:right;';
      num.textContent = i + 1;

      const gmailWrap = document.createElement('div');
      gmailWrap.style.cssText = 'flex:1;min-width:180px;display:flex;align-items:center;gap:8px;';
      const lgInner = document.createElement('div');
      lgInner.style.cssText = 'flex:1;min-width:0;';
      lgInner.innerHTML = `<div style="font-size:11px;color:#475569;margin-bottom:2px;text-transform:uppercase;letter-spacing:.05em">Gmail</div><div style="font-size:13px;color:#93c5fd;font-weight:500;word-break:break-all">${r.acct.gmail}</div>`;

      const lgToggle = document.createElement('button');
      let lgActive = r.lg;
      const starSVG = (filled) => `<svg width="11" height="11" viewBox="0 0 24 24" fill="${filled ? '#fbbf24' : 'none'}" stroke="${filled ? '#fbbf24' : '#64748b'}" stroke-width="2" style="flex-shrink:0"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
      const applyLGStyle = (active) => {
        lgToggle.style.cssText = `flex-shrink:0;display:flex;align-items:center;justify-content:center;width:26px;height:26px;background:${active ? '#422006' : 'transparent'};border:1px solid ${active ? '#92400e' : '#334155'};border-radius:8px;cursor:pointer;transition:all .15s;`;
        lgToggle.innerHTML = starSVG(active);
        lgToggle.title = active ? 'Retirer Local Guide' : 'Marquer comme Local Guide';
      };
      applyLGStyle(lgActive);
      lgToggle.dataset.lgGmail = r.acct.gmail;
      lgToggle.__applyLG = (val) => { lgActive = val; applyLGStyle(val); };
      lgToggle.onclick = () => {
        lgActive = !lgActive;
        toggleLocalGuide(r.acct.gmail);
        applyLGStyle(lgActive);
        _assetsCache = null;
        refreshLGPanel();
      };
      gmailWrap.append(lgInner, lgToggle);

      const arrow = document.createElement('span');
      arrow.style.cssText = 'color:#334155;font-size:20px;flex-shrink:0;';
      arrow.textContent = '→';

      const ficheWrap = document.createElement('div');
      ficheWrap.style.cssText = 'flex:2;min-width:200px;';
      const lienHTML = r.target.lien
        ? `<a href="${r.target.lien}" target="_blank" rel="noopener" style="color:#4ade80;font-size:13px;font-weight:600;text-decoration:none;">${r.target.nom} 🔗</a>`
        : `<span style="font-size:13px;font-weight:600;color:#f1f5f9;">${r.target.nom}</span>`;
      const ageBadge = r.target.ageDays > 42
        ? `<span style="background:#14532d30;color:#4ade80;font-size:10px;padding:1px 6px;border-radius:99px;margin-left:6px;">×2/j</span>`
        : `<span style="background:#1e3a8a30;color:#93c5fd;font-size:10px;padding:1px 6px;border-radius:99px;margin-left:6px;">×1/j</span>`;
      const geoLabel = r.target.geoBonus >= 800 ? '📍 Même ville'
        : r.target.geoBonus >= 400 ? '📍 Ville proche'
        : r.target.geoBonus >= 200 ? '🗺 Même dép.' : '';
      const geoBadge = geoLabel ? `<span style="font-size:10px;color:#f59e0b;margin-left:6px;">${geoLabel}</span>` : '';
      ficheWrap.innerHTML = `<div style="font-size:11px;color:#475569;margin-bottom:2px;text-transform:uppercase;letter-spacing:.05em">Fiche cible</div>${lienHTML}${ageBadge}${geoBadge}<div style="font-size:11px;color:#475569;margin-top:3px;">${r.target.count} avis · ${r.target.ageDays} j</div>`;

      const btns = document.createElement('div');
      btns.style.cssText = 'display:flex;gap:6px;flex-shrink:0;';

      const copyBtn = document.createElement('button');
      copyBtn.style.cssText = 'background:#172554;color:#93c5fd;border:1px solid #1e40af;border-radius:8px;padding:5px 10px;font-size:12px;cursor:pointer;white-space:nowrap;';
      copyBtn.textContent = '📋 Gmail';
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(r.acct.gmail);
        copyBtn.textContent = '✅';
        setTimeout(() => { copyBtn.textContent = '📋 Gmail'; }, 1500);
      };

      const doneBtn = document.createElement('button');
      doneBtn.style.cssText = 'background:#14532d;color:#4ade80;border:1px solid #166534;border-radius:8px;padding:5px 10px;font-size:12px;cursor:pointer;white-space:nowrap;';
      doneBtn.textContent = '✅ Fait';
      doneBtn.onclick = () => {
        markGmailUsed(r.acct.gmail);
        row.style.opacity = '0.35';
        doneBtn.textContent = `⏳ J+${daysUntilAvailable(r.acct.gmail, r.dayNum + 1)}`;
        doneBtn.disabled = true;
      };

      btns.append(copyBtn, doneBtn);
      row.append(num, gmailWrap, arrow, ficheWrap, btns);
      container.appendChild(row);
    });

    // Section Local Guide collapsible en bas
    const allLGs = getLocalGuides();
    const lgDetails = document.createElement('details');
    lgDetails.style.cssText = 'margin-top:20px;background:#0f172a;border:1px solid #334155;border-radius:10px;overflow:hidden;';
    const lgSummary = document.createElement('summary');
    lgSummary.style.cssText = 'cursor:pointer;padding:10px 14px;font-size:12px;font-weight:600;color:#64748b;letter-spacing:.04em;text-transform:uppercase;list-style:none;display:flex;align-items:center;gap:8px;user-select:none;';
    lgSummary.id = 'lg-panel-summary';
    lgSummary.innerHTML = `⭐ Comptes Local Guide <span id="lg-panel-count" style="background:#1e293b;color:${allLGs.length ? '#fbbf24' : '#475569'};border-radius:99px;padding:1px 8px;font-size:11px;">${allLGs.length}</span>`;
    lgDetails.appendChild(lgSummary);

    const lgBody = document.createElement('div');
    lgBody.id = 'lg-panel-body';
    lgBody.style.cssText = 'padding:10px 14px 14px;border-top:1px solid #1e293b;';
    const lgNote = document.createElement('p');
    lgNote.style.cssText = 'font-size:11px;color:#334155;margin-bottom:10px;';
    lgNote.textContent = 'Les comptes Local Guide ont accès à un rayon étendu (département entier). Marque ⭐ directement sur une ligne pour ajouter un compte.';
    lgBody.appendChild(lgNote);

    if (allLGs.length === 0) {
      const empty = document.createElement('p');
      empty.style.cssText = 'font-size:12px;color:#334155;font-style:italic;';
      empty.textContent = 'Aucun compte Local Guide pour l\'instant.';
      lgBody.appendChild(empty);
    } else {
      const chips = document.createElement('div');
      chips.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;';
      allLGs.forEach(gmail => {
        const chip = document.createElement('div');
        chip.style.cssText = 'background:#422006;color:#fcd34d;border:1px solid #92400e;border-radius:99px;padding:3px 10px;font-size:11px;display:flex;align-items:center;gap:6px;';
        chip.innerHTML = `<span>⭐ ${gmail}</span><button title="Retirer" onclick="toggleLocalGuide('${gmail}');_assetsCache=null;refreshLGPanel();" style="background:none;border:none;color:#b45309;cursor:pointer;font-size:13px;padding:0;line-height:1;">✕</button>`;
        chips.appendChild(chip);
      });
      lgBody.appendChild(chips);
    }

    lgDetails.appendChild(lgBody);
    container.appendChild(lgDetails);

  } catch(e) {
    container.innerHTML = `<p style="color:#ef4444;padding:1rem 0">Erreur : ${e.message}</p>`;
  }
}

// ── AUTO-LOGIN ──
if (sessionStorage.getItem('gmb_auth')) {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  init();
}

// ── NOTES FLOTTANTES ──
function toggleNotes() {
  const panel = document.getElementById('notes-panel');
  panel.classList.toggle('open');
  if (panel.classList.contains('open')) {
    const ta = document.getElementById('notes-textarea');
    ta.value = localStorage.getItem('gmb_notes') || '';
    updateNotesLines();
    ta.focus();
  }
}

function saveNotes() {
  localStorage.setItem('gmb_notes', document.getElementById('notes-textarea').value);
}

function updateNotesLines() {
  const val = document.getElementById('notes-textarea').value;
  const n = val.trim() === '' ? 0 : val.split('\n').filter(l => l.trim() !== '').length;
  const el = document.getElementById('notes-lines');
  if (el) el.textContent = n + (n <= 1 ? ' ligne' : ' lignes');
}

function clearNotes() {
  if (!confirm('Effacer toutes les notes ?')) return;
  document.getElementById('notes-textarea').value = '';
  localStorage.removeItem('gmb_notes');
  updateNotesLines();
}

// ── PLANNING ──

async function renderPlanning() {
  const dateEl = document.getElementById('planning-date');
  const opEl   = document.getElementById('planning-operateur');
  const stEl   = document.getElementById('planning-statut-filter');
  const list   = document.getElementById('planning-list');
  const stats  = document.getElementById('planning-stats');

  if (!dateEl.value) {
    const today = new Date();
    dateEl.value = today.toISOString().slice(0, 10);
  }

  const dateVal = dateEl.value;
  const opVal   = opEl.value;
  const stVal   = stEl.value;

  list.innerHTML = '<p style="color:#94a3b8">Chargement...</p>';

  let query = `select=*&date=eq.${dateVal}&order=operateur.asc,ville.asc`;
  if (opVal) query += `&operateur=eq.${encodeURIComponent(opVal)}`;
  if (stVal) query += `&statut=eq.${stVal}`;

  const rows = await sbGet('planning', query);

  // Stats
  const total   = rows.length;
  const pending = rows.filter(r => r.statut === 'pending').length;
  const done    = rows.filter(r => r.statut === 'done').length;
  const generated = rows.filter(r => r.statut === 'generated').length;

  stats.innerHTML = [
    ['Total', total, '#3b82f6'],
    ['En attente', pending, '#f59e0b'],
    ['Généré', generated, '#8b5cf6'],
    ['Terminé', done, '#22c55e'],
  ].map(([label, val, color]) => `
    <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:10px 18px;text-align:center">
      <div style="font-size:22px;font-weight:700;color:${color}">${val}</div>
      <div style="font-size:11px;color:#94a3b8;margin-top:2px">${label}</div>
    </div>`).join('');

  if (!rows.length) {
    list.innerHTML = '<p style="color:#94a3b8;padding:20px">Aucune assignation pour cette date. Le planning est généré automatiquement chaque matin à 6h.</p>';
    return;
  }

  // Grouper par opérateur
  const byOp = {};
  for (const r of rows) {
    const op = r.operateur || '—';
    if (!byOp[op]) byOp[op] = [];
    byOp[op].push(r);
  }

  const STATUT_COLORS = {
    pending: '#f59e0b', generated: '#8b5cf6', done: '#22c55e', skip: '#64748b'
  };
  const STATUT_LABELS = {
    pending: 'En attente', generated: 'Généré', done: 'Terminé', skip: 'Ignoré'
  };

  list.innerHTML = Object.entries(byOp).map(([op, taches]) => `
    <div style="margin-bottom:24px">
      <h3 style="color:#f1f5f9;margin-bottom:10px;font-size:15px">
        👤 ${op} <span style="color:#64748b;font-weight:400;font-size:13px">(${taches.length} tâches)</span>
      </h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="color:#64748b;text-align:left">
            <th style="padding:6px 10px;border-bottom:1px solid #334155">Ville</th>
            <th style="padding:6px 10px;border-bottom:1px solid #334155">Gmail</th>
            <th style="padding:6px 10px;border-bottom:1px solid #334155">Fiche</th>
            <th style="padding:6px 10px;border-bottom:1px solid #334155">Statut</th>
            <th style="padding:6px 10px;border-bottom:1px solid #334155">Action</th>
          </tr>
        </thead>
        <tbody>
          ${taches.map(r => `
            <tr style="border-bottom:1px solid #1e293b" id="planning-row-${r.id}">
              <td style="padding:7px 10px;color:#94a3b8">${r.ville || '—'}</td>
              <td style="padding:7px 10px;font-family:monospace;font-size:12px;color:#a5b4fc">${r.gmail}</td>
              <td style="padding:7px 10px;color:#e2e8f0;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${r.fiche_nom}">${r.fiche_nom}</td>
              <td style="padding:7px 10px">
                <span style="background:${(STATUT_COLORS[r.statut]||'#64748b')}22;color:${STATUT_COLORS[r.statut]||'#64748b'};padding:2px 8px;border-radius:99px;font-size:11px">
                  ${STATUT_LABELS[r.statut] || r.statut}
                </span>
              </td>
              <td style="padding:7px 10px;white-space:nowrap">
                ${r.statut === 'pending' || r.statut === 'generated' ? `
                  <button onclick="planningGenerer('${r.id}','${r.fiche_nom.replace(/'/g,"\\'")}','${r.gmail}')"
                    style="padding:3px 10px;border-radius:5px;background:#6366f1;color:#fff;border:none;cursor:pointer;font-size:12px;margin-right:4px">
                    ✍️ Générer
                  </button>
                  <button onclick="planningSkip('${r.id}')"
                    style="padding:3px 10px;border-radius:5px;background:#334155;color:#94a3b8;border:none;cursor:pointer;font-size:12px">
                    Ignorer
                  </button>
                ` : r.statut === 'done' ? `<span style="color:#22c55e;font-size:12px">✅ Fait</span>` : ''}
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`).join('');
}

// ── Toast éphémère ────────────────────────────────────────────────────────────

function showToast(message, type = 'success', ms = 4000) {
  let wrap = document.getElementById('toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'toast-wrap';
    wrap.style.cssText = 'position:fixed;top:16px;right:16px;z-index:99999;display:flex;flex-direction:column;gap:8px;';
    document.body.appendChild(wrap);
  }
  const bg = type === 'error' ? '#ef4444' : type === 'warn' ? '#f59e0b' : '#22c55e';
  const t = document.createElement('div');
  t.style.cssText = `background:${bg};color:#fff;padding:12px 16px;border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,.25);font-size:14px;max-width:340px;white-space:pre-line;opacity:0;transform:translateX(20px);transition:opacity .25s,transform .25s;`;
  t.textContent = message;
  wrap.appendChild(t);
  requestAnimationFrame(() => { t.style.opacity = '1'; t.style.transform = 'translateX(0)'; });
  setTimeout(() => {
    t.style.opacity = '0'; t.style.transform = 'translateX(20px)';
    setTimeout(() => t.remove(), 300);
  }, ms);
}

// ── DonutBrowser local API ────────────────────────────────────────────────────

function getDonutBase() {
  const port = localStorage.getItem('donut_port') || '10108';
  return `http://127.0.0.1:${port}`;
}

function getDonutToken() {
  return localStorage.getItem('donut_token') || '';
}

function normalizeCityForProxy(ville) {
  return ville.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim()
    .replace(/[\s']+/g, '_')
    .replace(/-+/g, '_')
    .replace(/_+/g, '_');
}

async function donutCreerProfil(ville, gmail, ficheNom, pays = 'FR') {
  const token = getDonutToken();
  if (!token) {
    alert('Configure ton token DonutBrowser dans ⚙️ Config DonutBrowser (section Planning).');
    return null;
  }
  const base = getDonutBase();
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  // 1. Créer le proxy Decodo pour cette ville
  const citySlug = normalizeCityForProxy(ville);
  const isMobile = (localStorage.getItem('decodo_type') || 'residential') === 'mobile';
  // Gateway unique pour TOUS les pays — le pays est ciblé via country-XX dans le username
  // (confirmé au curl : gate.decodo.com:10001 + country-fr/be/... fonctionne).
  const cfg = { host: 'gate.decodo.com', port: 10001 };
  const decodoPass = isMobile ? DECODO_PASS_MOBILE : DECODO_PASS_RESIDENTIAL;
  const baseUser   = isMobile ? 'user-VATeam' : 'user-VAteamR';

  // sessionduration-1440 EXIGE un id de session avant lui, sinon "no suitable exit node".
  // Session stable par ville (sticky IP 24h) + suffixe aléatoire pour l'unicité.
  const sessionId = ('s' + citySlug.replace(/[^a-z0-9]/g, '') + Math.random().toString(36).slice(2, 8)).slice(0, 24);
  const sessionSuffix = `-session-${sessionId}-sessionduration-1440`;

  // Ordre de tentative : ville → pays → base (correspond aux curl qui fonctionnent)
  const usernameAvecVille = `${baseUser}-country-${pays.toLowerCase()}-city-${citySlug}${sessionSuffix}`;
  const usernameAvecPays  = `${baseUser}-country-${pays.toLowerCase()}${sessionSuffix}`;
  const usernameBase      = `${baseUser}${sessionSuffix}`;

  const metier = ficheNom.toLowerCase().includes('couvreur') ? 'couvreur'
    : ficheNom.toLowerCase().includes('paysagiste') ? 'paysagiste'
    : ficheNom.toLowerCase().includes('peintre') ? 'peintre'
    : ficheNom.toLowerCase().includes('plombier') ? 'plombier'
    : ficheNom.toLowerCase().includes('electricien') ? 'electricien'
    : ficheNom.toLowerCase().includes('elagage') ? 'elagage'
    : 'gmb';
  const profileName = `GMB_${metier}_${citySlug}`;

  const _fetchTimeout = (url, opts, ms = 8000) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(t));
  };

  // gate.decodo.com:10001 est un endpoint HTTP (curl -x = proxy HTTP). https/socks5 échouent.
  const proxyProtocol = 'http';

  const _creerProfil = async (extraBody = {}) => {
    // Champs documentés uniquement (name, browser, proxy_id, tags).
    // On crée SANS proxy pour éviter le hang de validation de connectivité (proxy attaché en PUT après).
    const body = { name: profileName, browser: 'wayfern', ...extraBody };
    try {
      const res = await _fetchTimeout(`${base}/v1/profiles`, { method: 'POST', headers, body: JSON.stringify(body) }, 12000);
      if (!res.ok) {
        const txt = await res.text();
        console.warn('DonutBrowser profil erreur:', res.status, txt);
        // Erreur environnement Windows : DonutBrowser ne peut pas lancer son moteur Wayfern
        if (/os error 14001|Visual C\+\+|côte-à-côte|spawn headless Wayfern|side-by-side/i.test(txt)) {
          showToast(
            '❌ DonutBrowser ne peut pas démarrer sur ce PC.\n' +
            'Installe le Visual C++ Redistributable (x64) puis REDÉMARRE le PC :\n' +
            'aka.ms/vs/17/release/vc_redist.x64.exe\n' +
            'Si ça persiste : réinstalle DonutBrowser.',
            'error', 12000
          );
        }
        return null;
      }
      const d = await res.json();
      console.log('DonutBrowser profil créé raw:', JSON.stringify(d));
      return d.profile?.id || d.id || d.data?.id || null;
    } catch (e) {
      console.warn('DonutBrowser profil timeout/abort:', e.message || e);
      return null;
    }
  };

  try {
    // Étape 1 : récupérer ou créer un proxy_id valide dans DonutBrowser
    let proxyId = null;

    // Réutiliser UNIQUEMENT un proxy Decodo au bon format (username avec -session-).
    // Les vieux proxies sans -session- sont cassés (no suitable exit node) → on les ignore.
    try {
      const pxRes = await _fetchTimeout(`${base}/v1/proxies`, { method: 'GET', headers }, 5000);
      if (pxRes.ok) {
        const pxData = await pxRes.json();
        const list = pxData.proxies || pxData.data || (Array.isArray(pxData) ? pxData : []);
        console.log('DonutBrowser proxies existants:', list.length, list.map(p => p.name).join(', '));
        const found = list.find(p =>
          p.proxy_settings?.host?.includes('decodo.com') &&
          p.proxy_settings?.username?.includes('-session-') &&
          p.proxy_settings?.username?.includes(`city-${citySlug}-`)
        );
        if (found) { proxyId = found.id; console.log('DonutBrowser: réutilise proxy valide:', proxyId, found.name); }
      }
    } catch (e) { console.warn('DonutBrowser GET proxies échoué:', e); }

    // Si aucun proxy existant, essayer de créer avec les 3 niveaux de ciblage
    // (ville → pays → base) pour trouver lequel DonutBrowser accepte sans PROXY_NOT_WORKING
    if (!proxyId && decodoPass) {
      const ts = Math.floor(Date.now() / 1000);
      for (const [suffix, username] of [
        [`${citySlug}_${ts}`, usernameAvecVille],
        [`${pays.toLowerCase()}_${ts}`, usernameAvecPays],
        [`base_${ts}`, usernameBase],
      ]) {
        try {
          const pxRes = await _fetchTimeout(`${base}/v1/proxies`, {
            method: 'POST', headers,
            body: JSON.stringify({ name: `Decodo_${isMobile ? 'mob' : 'res'}_${suffix}`, proxy_settings: { proxy_type: proxyProtocol, host: cfg.host, port: cfg.port, username, password: decodoPass } })
          }, 12000);
          const pxBody = await pxRes.text();
          console.log(`DonutBrowser POST proxy (${username}) → ${pxRes.status}:`, pxBody);
          if (pxRes.ok) { const pd = JSON.parse(pxBody); proxyId = pd.id || pd.proxy?.id || null; break; }
        } catch (e) { console.warn('DonutBrowser proxy création timeout:', e); }
      }
    }

    // Étape 2 : créer le profil SANS proxy (évite le hang de validation de connectivité)
    const profileId = await _creerProfil({});
    if (!profileId) { console.error('DonutBrowser: impossible de créer le profil'); return null; }

    // Étape 3 : attacher le proxy au profil en PUT (proxy_id, méthode documentée)
    if (proxyId) {
      for (const method of ['PUT', 'POST']) {
        try {
          const upRes = await _fetchTimeout(`${base}/v1/profiles/${profileId}`, {
            method, headers, body: JSON.stringify({ proxy_id: proxyId })
          }, 8000);
          const upBody = await upRes.text();
          console.log(`DonutBrowser ${method} proxy_id → ${upRes.status}:`, upBody);
          if (upRes.ok) break;
        } catch (e) { console.warn(`DonutBrowser ${method} proxy attach timeout:`, e.message || e); }
      }
    }

    // Étape 4 : lancer le profil via /run (seul endpoint de launch — Pro DonutBrowser requis)
    try {
      const lr = await _fetchTimeout(`${base}/v1/profiles/${profileId}/run`, { method: 'POST', headers, body: JSON.stringify({}) }, 8000);
      const respBody = await lr.text();
      console.log(`DonutBrowser /run → ${lr.status}:`, respBody);
      if (lr.ok) {
        console.log('DonutBrowser profil lancé:', profileId, profileName);
        showToast(`✅ Profil "${profileName}" lancé`, 'success');
      } else if (lr.status === 402) {
        // Le lancement par API nécessite DonutBrowser Pro. Le profil + proxy sont prêts.
        showToast(`✅ Profil "${profileName}" prêt avec proxy.\n▶️ Lance-le dans DonutBrowser.`, 'success', 6000);
      } else {
        console.error('DonutBrowser /run échec:', lr.status, respBody);
        showToast(`✅ Profil "${profileName}" prêt.\n▶️ Lance-le dans DonutBrowser.`, 'success', 6000);
      }
    } catch (e) {
      console.warn('DonutBrowser /run timeout:', e);
      showToast(`✅ Profil "${profileName}" prêt.\n▶️ Lance-le dans DonutBrowser.`, 'success', 6000);
    }
    return profileId;
  } catch (e) {
    console.warn('DonutBrowser non disponible (normal si pas ouvert):', e);
    return null;
  }
}

// Rafraîchit le proxy d'un profil existant : crée une IP fraîche (même pays/ville)
// et l'attache au profil. Utile quand la session Decodo tombe (exit node déconnecté).
async function donutRafraichirProxy() {
  const token = getDonutToken();
  if (!token) { showToast('Configure ton token DonutBrowser dans ⚙️ Config.', 'warn'); return; }
  const base = getDonutBase();
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  // 1. Récupérer profils + proxies
  let profiles = [], proxies = [];
  try {
    const [pr, px] = await Promise.all([
      fetch(`${base}/v1/profiles`, { headers }),
      fetch(`${base}/v1/proxies`, { headers }),
    ]);
    const pd = await pr.json(); profiles = pd.profiles || pd.data || (Array.isArray(pd) ? pd : []);
    const xd = await px.json(); proxies  = xd.proxies  || xd.data || (Array.isArray(xd) ? xd : []);
  } catch (e) { showToast('DonutBrowser injoignable — ouvre l\'app.', 'error'); return; }

  const gmb = profiles.filter(p => (p.name || '').startsWith('GMB_'));
  if (!gmb.length) { showToast('Aucun profil GMB dans DonutBrowser.', 'warn'); return; }

  // 2. Choix du profil (affiche le type de proxy actuel : mobile / résidentiel / aucun)
  const typeOf = (p) => {
    const px = proxies.find(x => x.id === p.proxy_id);
    if (!px) return 'AUCUN proxy';
    return (px.name || '').includes('_mob') ? 'MOBILE' : 'résidentiel';
  };
  const choix = prompt(
    'Rafraîchir le proxy (nouvelle IP) de quel profil ?\n\n' +
    gmb.map((p, i) => `${i + 1}. ${p.name}  [${typeOf(p)}]`).join('\n') +
    '\n\nTape le numéro et OK :'
  );
  if (choix === null) return;
  const prof = gmb[parseInt(choix, 10) - 1];
  if (!prof) { showToast('Numéro invalide.', 'warn'); return; }

  // 3. Nouveau proxy : repart de l'ancien (préserve pays/ville/type), sinon fallback FR + ville du nom
  const sess = ('s' + Math.random().toString(36).slice(2, 10)).slice(0, 20);
  const old = proxies.find(x => x.id === prof.proxy_id);
  let settings;
  if (old?.proxy_settings?.username) {
    const s = old.proxy_settings;
    const newUser = s.username.includes('-session-')
      ? s.username.replace(/-session-[^-]+-/, `-session-${sess}-`)
      : s.username.replace(/-sessionduration-/, `-session-${sess}-sessionduration-`);
    settings = { proxy_type: s.proxy_type || 'http', host: s.host, port: s.port, username: newUser, password: s.password };
  } else {
    const isMobile = (localStorage.getItem('decodo_type') || 'residential') === 'mobile';
    const citySlug = prof.name.split('_').slice(2).join('_') || 'paris';
    const baseUser = isMobile ? 'user-VATeam' : 'user-VAteamR';
    settings = {
      proxy_type: 'http', host: 'gate.decodo.com', port: 10001,
      username: `${baseUser}-country-fr-city-${citySlug}-session-${sess}-sessionduration-1440`,
      password: isMobile ? DECODO_PASS_MOBILE : DECODO_PASS_RESIDENTIAL,
    };
  }

  // 4. Créer le proxy frais + l'attacher au profil
  let proxyId = null;
  try {
    const r = await fetch(`${base}/v1/proxies`, {
      method: 'POST', headers,
      body: JSON.stringify({ name: `Decodo_refresh_${Math.floor(Date.now() / 1000)}`, proxy_settings: settings }),
    });
    const d = await r.json(); proxyId = d.id || d.proxy?.id || null;
  } catch (e) { /* ignore */ }
  if (!proxyId) { showToast('Échec création du proxy frais.', 'error'); return; }

  let ok = false;
  for (const m of ['PUT', 'POST']) {
    try {
      const u = await fetch(`${base}/v1/profiles/${prof.id}`, { method: m, headers, body: JSON.stringify({ proxy_id: proxyId }) });
      if (u.ok) { ok = true; break; }
    } catch (e) { /* ignore */ }
  }
  showToast(
    ok ? `✅ IP fraîche attachée à ${prof.name}.\n▶️ Relance le profil dans DonutBrowser.`
       : `⚠️ Proxy créé mais attache échouée — sélectionne-le à la main dans DonutBrowser.`,
    ok ? 'success' : 'warn', 8000
  );
}

async function planningGenerer(id, ficheNom, gmail) {
  await sbUpdate('planning', id, { statut: 'generated' });

  // Récupérer la ville depuis la ligne du planning
  const row = document.getElementById(`planning-row-${id}`);
  const ville = row ? row.querySelector('td')?.textContent?.trim() : '';

  // Dériver les travaux depuis le nom de la fiche (utilisé pour avis et images)
  const _TRAVAUX_MAP = {
    couvreur: 'réfection de toiture', toiture: 'réfection de toiture', couverture: 'travaux de couverture',
    demoussage: 'démoussage toiture', hydrofuge: 'traitement hydrofuge toiture',
    gouttieres: 'nettoyage gouttières',
    etancheite: 'travaux d\'étanchéité',
    paysagiste: 'aménagement paysager', jardinage: 'entretien jardin',
    elagage: 'élagage et abattage d\'arbres',
    ravalement: 'ravalement de façade', facade: 'ravalement de façade',
    nettoyage: 'nettoyage haute pression',
    peintre: 'travaux de peinture', peinture: 'travaux de peinture',
    plombier: 'travaux de plomberie',
    electricien: 'travaux d\'électricité',
    macon: 'travaux de maçonnerie', carrelage: 'pose de carrelage',
  };
  const _travaux = Object.entries(_TRAVAUX_MAP).find(([k]) => ficheNom.toLowerCase().includes(k))?.[1] || 'travaux à domicile';

  // Créer et lancer le profil DonutBrowser si token configuré.
  // Isolé : une erreur/lenteur DonutBrowser ne doit JAMAIS bloquer la génération d'avis.
  if (getDonutToken() && ville && ville !== '—') {
    try { await donutCreerProfil(ville, gmail, ficheNom); }
    catch (e) { console.warn('DonutBrowser ignoré (erreur, avis continue):', e?.message || e); }
  }

  // Pré-remplir une ligne dans le générateur d'images
  const _metierMap = {
    toiture: 'toiture', couvreur: 'toiture', charpente: 'toiture',
    demoussage: 'nettoyage_toiture', demoussage: 'nettoyage_toiture', hydrofuge: 'nettoyage_toiture',
    gouttieres: 'nettoyage_gouttieres', gouttiere: 'nettoyage_gouttieres',
    etancheite: 'etancheite', etanch: 'etancheite', fuite: 'etancheite',
    ravalement: 'ravalement', facade: 'ravalement',
    peintre: 'peinture', peinture: 'peinture',
    plombier: 'plomberie', plomberie: 'plomberie',
    electricien: 'electricite',
    paysagiste: 'paysagiste', jardinage: 'paysagiste', elagage: 'paysagiste',
    nettoyage: 'nettoyage',
  };
  const _imgCtx = window.__GMB_IMAGE_CONTEXT__;
  if (_imgCtx) {
    _imgCtx.addRow();
    const _newRow = _imgCtx.getRows()[0];
    if (_newRow) {
      const _nomL = ficheNom.toLowerCase();
      const _metier = Object.entries(_metierMap).find(([k]) => _nomL.includes(k))?.[1] || '';
      if (_metier) {
        updateImgRow(_newRow.id, 'metier', _metier);
        updateImgRow(_newRow.id, 'travaux', _travaux);
      }
      if (ville && ville !== '—') updateImgRow(_newRow.id, 'ville', ville);
      updateImgRow(_newRow.id, 'fiche', ficheNom);
    }
  }

  // Basculer vers le générateur d'avis
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(s => s.classList.add('hidden'));
  document.getElementById('tab-generateur').classList.remove('hidden');
  document.querySelector('.tab-btn[onclick*="generateur"]').classList.add('active');

  await populateGenFiche();

  const ficheInput = document.getElementById('gen-fiche');
  if (ficheInput) { ficheInput.value = ficheNom; ficheInput.dispatchEvent(new Event('input')); }

  const auteurInput = document.getElementById('gen-auteur');
  if (auteurInput) auteurInput.value = gmail;

  // Pré-remplir ville et travaux dans le générateur d'avis
  const villeInput = document.getElementById('gen-ville');
  if (villeInput && ville) villeInput.value = ville;
  const travauxInput = document.getElementById('gen-travaux');
  if (travauxInput) travauxInput.value = _travaux;

  if (row) {
    const badge = row.querySelector('span[style*="border-radius:99px"]');
    if (badge) { badge.style.color = '#8b5cf6'; badge.style.background = '#8b5cf622'; badge.textContent = 'Généré'; }
  }

  // Lancer la génération automatiquement si clé Gemini configurée
  if (getGeminiKey()) await genererAvis();
}

async function planningSkip(id) {
  await sbUpdate('planning', id, { statut: 'skip' });
  renderPlanning();
}

// ── GMAILS ──

async function getGmails() {
  return await sbGet('gmails', 'select=*&order=ville.asc,email.asc');
}

async function renderGmails() {
  const container = document.getElementById('gmails-list');
  if (!container) return;
  container.innerHTML = '<p style="color:#64748b;">Chargement...</p>';

  const [gmails, avis] = await Promise.all([
    getGmails(),
    sbGet('avis', 'select=auteur,date&order=date.desc')
  ]);

  if (!gmails.length) {
    container.innerHTML = '<p style="color:#64748b;">Aucun Gmail enregistré.</p>';
    return;
  }

  const derniereUtilisation = {};
  const pointsEstimesMap   = {};
  const photoCountMap      = {};
  const avisCountMap       = {};

  avis.forEach(a => {
    const aut = (a.auteur || a.email || a.gmail || '').toLowerCase().trim();
    if (!aut) return;
    if (!derniereUtilisation[aut] || a.date > derniereUtilisation[aut]) {
      derniereUtilisation[aut] = a.date;
    }
    avisCountMap[aut] = (avisCountMap[aut] || 0) + 1;
    if (a.photo) photoCountMap[aut] = (photoCountMap[aut] || 0) + 1;

    let pts = 10; // 10 pts de base par avis
    if ((a.texte || '').length > 150) pts += 10; // +10 pts bonus texte long (>150 car)
    if (a.photo) pts += 5; // +5 pts bonus photo Google Maps
    pointsEstimesMap[aut] = (pointsEstimesMap[aut] || 0) + pts;
  });

  const filterQuery    = (document.getElementById('gmail-filter-ville')?.value || '').toLowerCase().trim();
  const filterOp       = document.getElementById('gmail-filter-operateur')?.value || '';
  const sort           = document.getElementById('gmail-filter-sort')?.value || 'az';

  let list = gmails.filter(g => {
    if (filterQuery && !((g.ville || '').toLowerCase().includes(filterQuery) || (g.email || '').toLowerCase().includes(filterQuery))) return false;
    if (filterOp === '__none__' && g.operateur) return false;
    if (filterOp && filterOp !== '__none__' && g.operateur !== filterOp) return false;
    return true;
  });

  if (sort === 'az')      list.sort((a, b) => a.email.localeCompare(b.email));
  if (sort === 'ville')   list.sort((a, b) => (a.ville || '').localeCompare(b.ville || ''));
  if (sort === 'recent')  list.sort((a, b) => (derniereUtilisation[b.email] || '') > (derniereUtilisation[a.email] || '') ? 1 : -1);
  if (sort === 'ancien')  list.sort((a, b) => (derniereUtilisation[a.email] || '9999') > (derniereUtilisation[b.email] || '9999') ? 1 : -1);

  container.innerHTML = `
    <p style="color:#64748b;font-size:0.82rem;margin-bottom:0.5rem;">${list.length} Gmail${list.length > 1 ? 's' : ''}</p>
    <table style="width:100%;border-collapse:collapse;font-size:0.88rem;">
      <thead><tr style="background:#1e293b;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:.04em;">
        <th style="padding:10px;text-align:left;">Email</th>
        <th style="padding:10px;text-align:left;">Ville</th>
        <th style="padding:10px;text-align:center;">Local Guide</th>
        <th style="padding:10px;text-align:left;">Dernière utilisation</th>
        <th style="padding:10px;"></th>
      </tr></thead>
      <tbody>
        ${list.map(g => {
          const lastUse = derniereUtilisation[g.email];
          const lastLabel = lastUse ? lastUse.split('-').reverse().join('/') : '–';
          const villeCell = g.ville
            ? `<div style="display:flex;align-items:center;gap:6px;">
                 <button class="ville-map-btn" onclick="showGmbMap('${g.ville.replace(/'/g, "\\'")}', '${(g.email || '').replace(/'/g, "\\'")}')">📍 ${g.ville}</button>
                 <input type="text" value="${g.ville}" title="Modifier la ville"
                   style="background:transparent;border:none;border-bottom:1px dashed #334155;color:#475569;font-size:0.75rem;width:70px;outline:none;padding:1px 2px;"
                   onchange="updateGmailVille('${g.id}', this.value)" />
               </div>`
            : `<input type="text" value="" placeholder="Ajouter une ville..."
                 style="background:transparent;border:none;border-bottom:1px solid #334155;color:#94a3b8;font-size:0.88rem;width:120px;outline:none;padding:2px 4px;"
                 onchange="updateGmailVille('${g.id}', this.value)" />`;
          const autKey = (g.email || '').toLowerCase().trim();
          const pts = pointsEstimesMap[autKey] || 0;
          const photosCount = photoCountMap[autKey] || 0;
          const avisCount = avisCountMap[autKey] || 0;
          const ptsTooltip = pts > 0 ? `${pts} points est. (${avisCount} avis · ${photosCount} photo${photosCount > 1 ? 's' : ''} +5pts)` : 'Compte vierge';

          return `<tr style="border-bottom:1px solid #1e293b;">
            <td style="padding:10px;color:#f1f5f9;">
              <div style="font-weight:500;">${g.email}</div>
              ${pts > 0 ? `<div style="font-size:11px;color:#f59e0b;margin-top:2px;" title="${_escHtml(ptsTooltip)}">⚡ ~${pts} pts est. (${photosCount} 📷)</div>` : ''}
            </td>
            <td style="padding:10px;">${villeCell}</td>
            <td style="padding:10px;text-align:center;">
              ${(() => {
                const lvl = g.local_guide_level || (g.local_guide ? 5 : 0);
                if (g.status === 'suspended' || lvl === -1) {
                  return `<span class="lg-badge lg-banned" onclick="cycleLocalGuideLevel('${g.id}', ${lvl})" title="Cliquer pour changer le statut">🔴 Suspendu</span>`;
                } else if (lvl >= 5) {
                  return `<span class="lg-badge lg-lvl5" onclick="cycleLocalGuideLevel('${g.id}', ${lvl})" title="Cliquer pour changer le niveau">🌟 Local Guide Niv. ${lvl}</span>`;
                } else if (lvl > 0 || g.local_guide) {
                  return `<span class="lg-badge lg-std" onclick="cycleLocalGuideLevel('${g.id}', ${lvl})" title="Cliquer pour changer le niveau">⭐ Local Guide</span>`;
                } else {
                  return `<span class="lg-badge lg-off" onclick="cycleLocalGuideLevel('${g.id}', ${lvl})" title="Cliquer pour activer Local Guide">⚪ Standard</span>`;
                }
              })()}
            </td>
            <td style="padding:10px;color:${lastUse ? '#22c55e' : '#475569'};">${lastLabel}</td>
            <td style="padding:10px;text-align:center;">
              <button class="btn-delete" onclick="deleteGmail('${g.id}')">🗑</button>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

async function addGmail(e) {
  e.preventDefault();
  const email       = document.getElementById('gmail-email').value.trim();
  const ville       = document.getElementById('gmail-ville').value.trim();
  const local_guide = document.getElementById('gmail-local-guide').checked;

  const ok = await sbInsert('gmails', { email, ville: ville || null, local_guide });
  if (!ok) return;

  document.getElementById('form-gmail').reset();
  renderGmails();
}

async function toggleLocalGuide(id, value) {
  await sbUpdate('gmails', id, { local_guide: value });
}

async function cycleLocalGuideLevel(id, currentLvl) {
  let nextLvl = 0;
  if (currentLvl === 0) nextLvl = 5;
  else if (currentLvl === 5) nextLvl = 6;
  else if (currentLvl === 6) nextLvl = 7;
  else if (currentLvl === 7) nextLvl = -1;
  else nextLvl = 0;

  const isLg = nextLvl > 0;
  const isSuspended = nextLvl === -1;

  await sbUpdate('gmails', id, {
    local_guide: isLg,
    local_guide_level: nextLvl,
    status: isSuspended ? 'suspended' : 'active'
  });
  renderGmails();
}

async function updateGmailVille(id, ville) {
  await sbUpdate('gmails', id, { ville: ville || null });
}

async function deleteGmail(id) {
  if (!confirm('Supprimer ce Gmail ?')) return;
  await fetch(`${SUPABASE_URL}/rest/v1/gmails?id=eq.${id}`, {
    method: 'DELETE',
    headers: SB_HEADERS
  });
  renderGmails();
}

// ── GMB MAP PANEL ──
function normalizeStr(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

const _geoCache = {};
let   _leafletMap = null;
let   _mapSession = 0;

function haversineKm(lat1, lon1, lat2, lon2) {
  const R    = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a    = Math.sin(dLat/2)**2 +
               Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
               Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Base de pré-cache des principales villes de France pour résolution instantanée sans réseau (0ms)
const _MAJOR_FRENCH_CITIES = {
  'paris': { lat: 48.8566, lon: 2.3522 },
  'marseille': { lat: 43.2965, lon: 5.3698 },
  'lyon': { lat: 45.7640, lon: 4.8357 },
  'toulouse': { lat: 43.6047, lon: 1.4442 },
  'nice': { lat: 43.7102, lon: 7.2620 },
  'nantes': { lat: 47.2184, lon: -1.5536 },
  'montpellier': { lat: 43.6108, lon: 3.8767 },
  'strasbourg': { lat: 48.5734, lon: 7.7521 },
  'bordeaux': { lat: 44.8378, lon: -0.5792 },
  'lille': { lat: 50.6292, lon: 3.0573 },
  'rennes': { lat: 48.1173, lon: -1.6778 },
  'reims': { lat: 49.2583, lon: 4.0317 },
  'toulon': { lat: 43.1242, lon: 5.9280 },
  'saint-etienne': { lat: 45.4397, lon: 4.3872 },
  'le havre': { lat: 49.4944, lon: 0.1079 },
  'grenoble': { lat: 45.1885, lon: 5.7245 },
  'dijon': { lat: 47.3220, lon: 5.0415 },
  'angers': { lat: 47.4784, lon: -0.5632 },
  'nimes': { lat: 43.8367, lon: 4.3601 },
  'villeurbanne': { lat: 45.7667, lon: 4.8833 },
  'clermont-ferrand': { lat: 45.7772, lon: 3.0870 },
  'le mans': { lat: 48.0061, lon: 0.1996 },
  'aix-en-provence': { lat: 43.5297, lon: 5.4474 },
  'brest': { lat: 48.3904, lon: -4.4861 },
  'tours': { lat: 47.3941, lon: 0.6848 },
  'amiens': { lat: 49.8941, lon: 2.2957 },
  'limoges': { lat: 45.8336, lon: 1.2611 },
  'annecy': { lat: 45.8992, lon: 6.1294 },
  'perpignan': { lat: 42.6986, lon: 2.8956 },
  'boulogne-billancourt': { lat: 48.8397, lon: 2.2399 },
  'metz': { lat: 49.1193, lon: 6.1757 },
  'besancon': { lat: 47.2378, lon: 6.0241 },
  'orleans': { lat: 47.9030, lon: 1.9090 },
  'saint-denis': { lat: 48.9362, lon: 2.3574 },
  'argenteuil': { lat: 48.9479, lon: 2.2467 },
  'rouen': { lat: 49.4431, lon: 1.0993 },
  'mulhouse': { lat: 47.7508, lon: 7.3359 },
  'caen': { lat: 49.1829, lon: -0.3707 },
  'nancy': { lat: 48.6921, lon: 6.1844 },
  'saint-paul': { lat: -21.0096, lon: 55.2707 },
  'montreuil': { lat: 48.8638, lon: 2.4484 },
  'roubaix': { lat: 50.6901, lon: 3.1817 },
  'tourcoing': { lat: 50.7239, lon: 3.1612 },
  'nanterre': { lat: 48.8924, lon: 2.2071 },
  'avignon': { lat: 43.9493, lon: 4.8055 },
  'vitry-sur-seine': { lat: 48.7875, lon: 2.3927 },
  'crteil': { lat: 48.7904, lon: 2.4556 },
  'dunkerque': { lat: 51.0343, lon: 2.3768 },
  'poitiers': { lat: 46.5802, lon: 0.3404 },
  'asnières-sur-seine': { lat: 48.9107, lon: 2.2891 },
  'versailles': { lat: 48.8049, lon: 2.1343 },
  'courbevoie': { lat: 48.8967, lon: 2.2567 },
  'colombes': { lat: 48.9231, lon: 2.2522 },
  'aubervilliers': { lat: 48.9131, lon: 2.3831 },
  'aulnay-sous-bois': { lat: 48.9386, lon: 2.4967 },
  'la rochelle': { lat: 46.1603, lon: -1.1511 },
  'rueil-malmaison': { lat: 48.8778, lon: 2.1802 },
  'champigny-sur-marne': { lat: 48.8167, lon: 2.5167 },
  'pau': { lat: 43.2951, lon: -0.3708 },
  'aubagne': { lat: 43.2925, lon: 5.5708 },
  'merignac': { lat: 44.8386, lon: -0.6436 },
  'pessac': { lat: 44.8067, lon: -0.6311 },
  'talence': { lat: 44.8083, lon: -0.5906 },
};

function cleanCityQuery(raw) {
  if (!raw) return '';
  let s = String(raw).trim();
  // Retirer les préfixes de métiers courants
  s = s.replace(/^(élagage|elagage|abattage|couvreur|toiture|plomberie|maçonnerie|maconnerie|peinture|carrelage|vitrier|débarras|debarras|paysagiste|terrassement|dépannage|depannage)\s*(?:&|-|et)?\s*/i, '');
  // Retirer les numéros de département en fin de chaîne (ex: "Bordeaux 33", "Fontenay 94")
  s = s.replace(/\s+\d{2,5}$/, '');
  // Nettoyer les tirets et espaces superflus
  s = s.replace(/^[-–—\s]+|[-–—\s]+$/g, '').trim();
  return s;
}

async function geocodeVille(villeRaw) {
  const villeClean = cleanCityQuery(villeRaw);
  if (!villeClean) return null;

  const cacheKey = villeClean.toLowerCase();
  if (_geoCache[cacheKey]) return _geoCache[cacheKey];

  // 1. Vérification dans le pré-cache des grandes villes françaises (0ms)
  const normKey = normalizeStr(villeClean);
  if (_MAJOR_FRENCH_CITIES[normKey]) {
    _geoCache[cacheKey] = _MAJOR_FRENCH_CITIES[normKey];
    return _MAJOR_FRENCH_CITIES[normKey];
  }

  // 2. Tentative via l'API officielle française (API Adresse Gouv - Sans Rate Limit, Ultra Rapide)
  try {
    const rGouv = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(villeClean)}&type=municipality&limit=1`);
    if (rGouv.ok) {
      const dGouv = await rGouv.json();
      if (dGouv.features && dGouv.features.length > 0) {
        const coords = dGouv.features[0].geometry.coordinates; // [lon, lat]
        const resGouv = { lat: coords[1], lon: coords[0] };
        _geoCache[cacheKey] = resGouv;
        return resGouv;
      }
    }
  } catch (eGouv) {
    console.warn('[geocode Gouv] échec pour', villeClean, eGouv);
  }

  // 3. Fallback OpenStreetMap Nominatim
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (attempt > 0) await new Promise(r => setTimeout(r, 1000));
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(villeClean + ', France')}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'fr', 'User-Agent': 'GmbTracker/2.0' } }
      );
      if (!r.ok) continue;
      const data = await r.json();
      if (data.length) {
        const result = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
        _geoCache[cacheKey] = result;
        return result;
      }
    } catch(e) {
      console.warn('[geocode OSM] tentative', attempt + 1, 'échouée pour', villeClean, e);
    }
  }
  return null;
}

async function showGmbMap(ville, targetEmail = '') {
  if (!ville) return;

  const session = ++_mapSession;

  const panel   = document.getElementById('gmb-map-panel');
  const overlay = document.getElementById('gmb-map-overlay');

  document.getElementById('gmb-map-city').textContent = ville;
  document.getElementById('gmb-map-fiches').innerHTML =
    '<p style="color:#64748b;font-size:0.85rem;">Chargement…</p>';

  overlay.classList.add('open');
  panel.classList.add('open');

  const fiches       = await getFiches();
  const allAvis      = await getAvis();
  const villeNorm    = normalizeStr(ville);
  const exactMatches = fiches.filter(f => normalizeStr(f.nom).includes(villeNorm));
  const otherFiches  = fiches.filter(f => !normalizeStr(f.nom).includes(villeNorm));

  const targetEmailNorm = (targetEmail || '').toLowerCase().trim();

  const getUsageBadge = (ficheNom) => {
    if (!targetEmailNorm) return '';
    const normFiche = normalizeStr(ficheNom);
    const prevAvis = (allAvis || []).find(a => {
      const em = ((a.auteur || a.email || a.gmail || a.compte_google) || '').toLowerCase().trim();
      const fi = normalizeStr(a.fiche_nom || a.fiche || '');
      return em === targetEmailNorm && fi === normFiche;
    });

    if (prevAvis) {
      const dateStr = prevAvis.date ? prevAvis.date.split('-').reverse().join('/') : '';
      return `<div class="gmb-used-badge danger">⚠️ Gmail DÉJÀ UTILISÉ sur cette fiche ${dateStr ? '(' + dateStr + ')' : ''}</div>`;
    } else {
      return `<div class="gmb-used-badge safe">✅ Gmail jamais utilisé sur cette fiche</div>`;
    }
  };

  const fichesEl = document.getElementById('gmb-map-fiches');

  const renderFicheItem = (f, dist, isBestRec = false) => `
    <div class="gmb-fiche-item ${isBestRec ? 'recommended' : ''}" data-fichename="${_escHtml(f.nom)}">
      ${isBestRec ? `<div class="gmb-rec-badge">⭐ Meilleure Fiche Recommandée</div>` : ''}
      <div class="gmb-fiche-item-name">
        🏢 ${f.nom}
        ${dist ? `<span class="gmb-dist-badge">~${dist} km</span>` : ''}
      </div>
      ${getUsageBadge(f.nom)}
      ${f.lien ? `<div style="margin-top:4px;"><a href="${f.lien}" target="_blank" rel="noopener">Voir sur Google Maps ↗</a></div>` : ''}
    </div>`;

  const renderFicheList = (nearby, isSearching) => {
    if (_mapSession !== session) return;
    let html = '';
    let isTopAssigned = false;

    if (exactMatches.length) {
      html += `<p class="gmb-section-label">📍 ${exactMatches.length} fiche${exactMatches.length>1?'s':''} à ${ville}</p>`;
      html += exactMatches.map((f, i) => {
        const isBest = !isTopAssigned && i === 0;
        if (isBest) isTopAssigned = true;
        return renderFicheItem(f, 0, isBest);
      }).join('');
    }
    if (nearby.length) {
      html += `<p class="gmb-section-label" style="margin-top:0.75rem;">🔍 ${nearby.length} fiche${nearby.length>1?'s':''} dans un rayon de 50 km</p>`;
      html += nearby.map((f, i) => {
        const isBest = !isTopAssigned && i === 0;
        if (isBest) isTopAssigned = true;
        return renderFicheItem(f, f._dist, isBest);
      }).join('');
    }
    if (isSearching) {
      html += `<p class="gmb-searching-label">⏳ Recherche dans un rayon de 50 km…</p>`;
    }
    if (!exactMatches.length && !nearby.length && !isSearching) {
      html = `<p style="font-size:0.85rem;color:#475569;">Aucune fiche trouvée dans un rayon de 50 km.</p>`;
    }
    fichesEl.innerHTML = html;
  };

  renderFicheList([], true);

  setTimeout(async () => {
    if (_mapSession !== session) return;
    if (_leafletMap) { _leafletMap.remove(); _leafletMap = null; }

    const centerGeo = await geocodeVille(ville);
    const mapEl     = document.getElementById('gmb-map-leaflet');

    let leafletReady = false;
    if (centerGeo && typeof L !== 'undefined') {
      _leafletMap = L.map(mapEl, { zoomControl: true }).setView([centerGeo.lat, centerGeo.lon], 10);
      const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

      L.tileLayer(tileUrl, {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        subdomains: 'abc',
        maxZoom: 19
      }).addTo(_leafletMap);

      L.circle([centerGeo.lat, centerGeo.lon], {
        radius: 50000,
        color: '#6366f1',
        fillColor: '#6366f1',
        fillOpacity: 0.08,
        weight: 1.5,
        dashArray: '6 4'
      }).addTo(_leafletMap);

      const centerIcon = L.divIcon({
        className: '',
        html: `<div style="background:#6366f1;width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 12px #6366f1;"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });
      L.marker([centerGeo.lat, centerGeo.lon], { icon: centerIcon })
        .addTo(_leafletMap)
        .bindPopup(`<b>📍 ${ville}</b>`)
        .openPopup();

      setTimeout(() => { if (_leafletMap) _leafletMap.invalidateSize(); }, 150);
      leafletReady = true;
    } else {
      const reason = typeof L === 'undefined'
        ? 'Leaflet non chargé — rechargez la page'
        : `Géocodage impossible pour « ${ville} »`;
      mapEl.innerHTML = `<p style="color:#475569;text-align:center;padding:3rem 1rem;font-size:0.85rem;">${reason}</p>`;
    }

    if (!centerGeo) { renderFicheList([], false); return; }

    // Icones des pins Leaflet
    const exactIcon = (typeof L !== 'undefined') ? L.divIcon({
      className: '',
      html: `<div style="background:#10b981;width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 10px #10b981;"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    }) : null;

    const nearbyIcon = (typeof L !== 'undefined') ? L.divIcon({
      className: '',
      html: `<div style="background:#3b82f6;width:12px;height:12px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 8px #3b82f6;"></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6]
    }) : null;

    // 1. Placer les fiches exactes de la ville sur la carte (Pins Verts 🟢)
    if (leafletReady && _leafletMap && exactIcon) {
      for (const f of exactMatches) {
        L.marker([centerGeo.lat, centerGeo.lon], { icon: exactIcon })
          .addTo(_leafletMap)
          .bindPopup(`<b>🟢 ${f.nom}</b><br>📍 Fiche à ${ville}`);
      }
    }

    // 2. Géocoder et placer les fiches environnantes dans un rayon de 50 km (Pins Bleus 🔵)
    const nearby = [];
    for (const f of otherFiches) {
      if (_mapSession !== session) return;
      
      // Extraction intelligente de la ville dans le nom de la fiche
      const extractedCity = cleanCityQuery(f.nom) || f.nom;
      const fGeo = await geocodeVille(extractedCity);
      if (!fGeo) continue;

      const dist = haversineKm(centerGeo.lat, centerGeo.lon, fGeo.lat, fGeo.lon);
      if (dist > 50) continue;

      const d = Math.round(dist);
      nearby.push({ ...f, _dist: d });
      nearby.sort((a, b) => a._dist - b._dist);

      if (leafletReady && _leafletMap && nearbyIcon) {
        L.marker([fGeo.lat, fGeo.lon], { icon: nearbyIcon })
          .addTo(_leafletMap)
          .bindPopup(`<b>🔵 ${f.nom}</b><br>Distance: ~${d} km`);
      }
      renderFicheList(nearby, true);
    }

    renderFicheList(nearby, false);
  }, 100);
}

function closeGmbMap() {
  document.getElementById('gmb-map-panel').classList.remove('open');
  document.getElementById('gmb-map-overlay').classList.remove('open');
  if (_leafletMap) { _leafletMap.remove(); _leafletMap = null; }
}

// ── GÉNÉRATEUR D'IMAGES BULK ──
let _imgRows         = [];
let _imgCounter      = 0;

const SERVICE_PRESETS = [
  'Rénovation toiture', 'Réparation toiture', 'Remplacement tuiles', 'Remplacement ardoises',
  'Charpente', 'Faîtage', 'Zinguerie',
  'Nettoyage toiture', 'Démoussage toiture', 'Hydrofuge toiture',
  'Nettoyage façade', 'Nettoyage terrasse', 'Nettoyage gouttières',
  'Étanchéité toit terrasse', 'Réparation fuite', 'Imperméabilisation',
  'Carrelage intérieur', 'Faïence', 'Peinture intérieure', 'Peinture extérieure',
  'Ravalement façade', 'Débarras appartement', 'Débarras maison',
  'Élagage', 'Abattage', 'Émondage', 'Taille de haie',
  'Terrassement', 'Maçonnerie', 'Plomberie', 'Électricité',
];

const SERVICE_CATALOG = {
  toiture: {
    label: 'Couverture / Toiture',
    services: [
      'Rénovation toiture complète', 'Réparation toiture', 'Remplacement tuiles',
      'Remplacement ardoises', 'Couverture neuve', 'Réfection toiture',
      'Charpente', 'Isolation combles', 'Faîtage', 'Zinguerie', 'Solins',
    ],
  },
  nettoyage_toiture: {
    label: 'Nettoyage / Démoussage toiture',
    services: [
      'Démoussage toiture', 'Nettoyage toiture', 'Traitement hydrofuge toiture',
      'Nettoyage mousse toiture', 'Hydrofuge toiture', 'Traitement anti-mousse toiture',
    ],
  },
  nettoyage_gouttieres: {
    label: 'Nettoyage gouttières',
    services: [
      'Nettoyage gouttières', 'Débouchage gouttières', 'Remplacement gouttières',
      'Entretien gouttières', 'Pose gouttières',
    ],
  },
  etancheite: {
    label: 'Étanchéité',
    services: [
      'Réparation fuite toiture', 'Recherche de fuite', 'Infiltration toiture',
      'Étanchéité toit terrasse', 'Étanchéité toiture plate',
      'Étanchéité balcon', 'Étanchéité terrasse',
      'Étanchéité EPDM', 'Étanchéité PVC', 'Étanchéité bitume',
      "Réfection d'étanchéité",
      'Réparation solin', 'Réparation Velux', 'Réparation noue',
      'Réparation rive', 'Étanchéité cheminée', 'Étanchéité acrotère',
    ],
  },
  ravalement: {
    label: 'Ravalement / Façade',
    services: [
      'Ravalement façade', 'Rénovation façade', 'Crépi façade',
      "ITE (isolation par l'extérieur)", 'Enduit monocouche',
      'Enduit hydraulique', 'Nettoyage façade', 'Peinture façade',
      'Traitement façade pierre',
    ],
  },
  'maçonnerie': {
    label: 'Maçonnerie',
    services: [
      'Mur parpaing', 'Mur brique', 'Construction mur', 'Muret',
      'Dalle béton', 'Terrasse béton', 'Coulage dalle',
      'Fondation', 'Semelle béton', 'Ferraillage',
      'Escalier béton', 'Seuil', 'Linteau', 'Ouverture dans mur', 'Percement mur',
      'Réparation fissure', 'Rejointoiement', 'Rejointoiement pierre',
    ],
  },
  peinture: {
    label: 'Peinture',
    services: [
      'Peinture intérieure', 'Peinture salon', 'Peinture chambre',
      'Peinture cuisine', 'Peinture couloir', 'Peinture plafond',
      'Papier peint', 'Peinture extérieure', 'Peinture façade', 'Enduit décoratif',
    ],
  },
  carrelage: {
    label: 'Carrelage',
    services: [
      'Pose carrelage sol', 'Pose carrelage mural', 'Faïence salle de bain',
      'Faïence cuisine', 'Carrelage terrasse extérieure', 'Dallage extérieur',
      'Pose pierre naturelle', 'Réfection joint', 'Réfection carrelage',
    ],
  },
  vitrier: {
    label: 'Vitrier',
    services: [
      'Remplacement vitrage brisé', 'Remplacement double vitrage',
      'Remplacement fenêtre PVC', 'Remplacement fenêtre aluminium',
      'Réparation fenêtre', 'Remplacement porte vitrée',
      'Vitrage sécurité feuilleté', 'Bris de glace urgence',
    ],
  },
  'élagage': {
    label: 'Élagage',
    services: [
      'Élagage arbre', 'Taille arbre haute tige', 'Élagage peuplier',
      'Élagage en hauteur', 'Recépage arbre', 'Couronnage arbre',
      'Élagage arbres dangereux',
    ],
  },
  abattage: {
    label: 'Abattage',
    services: [
      'Abattage arbre', 'Abattage peuplier', 'Abattage grand arbre',
      'Abattage en zone difficile', 'Dessouchage', 'Abattage conifère',
    ],
  },
  terrassement: {
    label: 'Terrassement',
    services: [
      'Terrassement maison', 'Terrassement piscine', 'Terrassement terrain',
      'Décaissement', 'Excavation', 'Fouilles', 'Tranchées',
      'Remblai', 'Empierrement', 'Nivellement', 'Préparation terrain',
      'Création allée', 'Création chemin', 'Plateforme', 'VRD',
      'Évacuation des terres',
    ],
  },
  paysagiste: {
    label: 'Paysagiste',
    services: [
      'Création jardin', 'Aménagement extérieur', 'Aménagement paysager',
      'Plantation', 'Plantation de haies', "Plantation d'arbres",
      'Taille de haie', "Taille d'arbustes", 'Création massif',
      'Pose de gazon', 'Gazon en rouleau', 'Semis de gazon',
      'Arrosage automatique', 'Bordures', 'Paillage',
      'Entretien jardin', 'Désherbage', 'Petite maçonnerie paysagère',
    ],
  },
  depannage_auto: {
    label: 'Dépannage Auto',
    services: [
      'Batterie à plat', 'Démarrage batterie', 'Boost batterie', 'Remplacement batterie',
      'Crevaison', 'Changement de roue', 'Réparation pneu',
      'Remorquage', 'Assistance routière', 'Véhicule en panne',
      'Ouverture de véhicule', 'Clés enfermées', 'Déverrouillage voiture',
      'Erreur de carburant', 'Panne moteur', 'Panne électrique', 'Enlèvement véhicule',
    ],
  },
  nettoyage: {
    label: 'Nettoyage extérieur',
    services: [
      'Nettoyage façade', 'Nettoyage terrasse', 'Nettoyage dallage',
      'Nettoyage pavés', 'Nettoyage allée', 'Traitement hydrofuge façade',
      'Nettoyage haute pression',
    ],
  },
  'débarras': {
    label: 'Débarras',
    services: [
      'Débarras appartement', 'Débarras maison', 'Débarras cave',
      'Débarras grenier', 'Vider maison succession', 'Débarras après décès',
      'Enlèvement encombrants', 'Nettoyage encombrants',
    ],
  },
};

const CONTEXTE_OPTIONS = [
  { value: 'maison',        label: 'Maison individuelle' },
  { value: 'appartement',   label: 'Appartement' },
  { value: 'immeuble',      label: 'Immeuble' },
  { value: 'commerce',      label: 'Commerce' },
  { value: 'professionnel', label: 'Local professionnel' },
  { value: 'entrepot',      label: 'Entrepôt' },
  { value: 'agricole',      label: 'Bâtiment agricole' },
];

// Contextes spécifiques par métier — remplacent CONTEXTE_OPTIONS quand le métier est sélectionné
const CONTEXTE_BY_METIER = {
  depannage_auto: [
    { value: 'autoroute',       label: 'Autoroute',             desc: 'parked on a motorway hard shoulder' },
    { value: 'route_nationale', label: 'Route nationale',       desc: 'parked on the side of a national road' },
    { value: 'route_dept',      label: 'Route départementale',  desc: 'parked on the side of a rural departmental road, fields in background' },
    { value: 'rue_ville',       label: 'Rue en ville',          desc: 'parked on an urban street in a town or city' },
    { value: 'parking',         label: 'Parking',               desc: 'in a car park or parking area' },
    { value: 'domicile',        label: 'Domicile',              desc: 'parked on private residential property — driveway, garage forecourt, or enclosed courtyard. A gate, wall, or house facade must be visible in the background. No road markings, no public pavement, no carriageway in the scene.' },
    { value: 'garage',          label: 'Garage / Atelier',      desc: 'inside or in front of a garage or vehicle workshop' },
    { value: 'station_service', label: 'Station-service',       desc: 'in a petrol station forecourt' },
    { value: 'aire_repos',      label: 'Aire de repos',         desc: 'in a motorway rest area or lay-by' },
  ],
};

const ETAT_OPTIONS = [
  { value: 'debut',     label: 'Début' },
  { value: 'encours',   label: 'En cours' },
  { value: 'semifinal', label: 'Presque terminé' },
  { value: 'final',     label: 'Terminé' },
];

const METEO_OPTIONS = [
  { value: 'auto',    label: 'Automatique' },
  { value: 'soleil',  label: 'Soleil' },
  { value: 'nuageux', label: 'Nuageux' },
  { value: 'brumeux', label: 'Brouillard' },
  { value: 'pluie',   label: 'Pluie' },
];

// ─── WORK_SCENES ─────────────────────────────────────────────────────────────
// Single source of truth per trade.
// Each entry: category, priority, service_keywords (scored phrases),
// exclude_if (strings or { phrase, unless } for conditional exclusion),
// + scene data (intro, setting, camera, states…).
// _getWorkDetail() scores all entries and returns the highest-scoring match.
let _lastMatch = { matched_category: null, matched_service: null, match_score: 0 };

// ─── GMB Image Context Bridge ─────────────────────────────────────────────────
// Single authorized cross-domain dependency between app.js GMB and src/image-generation/.
// Exposes only what the image module genuinely needs from GMB.
// Permanent interface: stays after legacy image code is removed in Phase 7B.
window.__GMB_IMAGE_CONTEXT__ = Object.freeze({
  getLastMatch()    { return Object.assign({}, _lastMatch); },
  setLastMatch(val) { _lastMatch = val; },

  // Context tables for img-ui.js renderAnalyse — read only
  getContextData()  { return { CONTEXTE_BY_METIER, CONTEXTE_OPTIONS }; },

  // Image planning rows — managed via bridge so the module never owns GMB state
  getRows()   { return _imgRows; },
  addRow() {
    const id = ++_imgCounter;
    _imgRows.unshift({ id, fiche: '', metier: '', travaux: '', ville: '', contexte: 'maison', etat: 'encours', meteo: 'auto', nb: 1, status: 'pending', images: [] });
    renderImgPlanning();
  },
  removeRow(id) {
    _imgRows = _imgRows.filter(r => r.id !== id);
    renderImgPlanning();
    updateCostEstimate();
  },
  // Called by the module after it marks rows as 'running' to refresh status pills
  refreshPlan() { renderImgPlanning(); },
});

function _escHtml(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function removeImgRow(id) {
  _imgRows = _imgRows.filter(r => r.id !== id);
  renderImgPlanning();
  updateCostEstimate();
}

function updateImgRow(id, field, value) {
  const row = _imgRows.find(r => r.id === id);
  if (!row) return;
  // When metier changes, reset dependent fields to coherent defaults
  if (field === 'metier' && row.metier !== value) {
    row.travaux  = '';
    row.contexte = (CONTEXTE_BY_METIER[value] || CONTEXTE_OPTIONS)[0].value;
  }
  row[field] = value;
  const card = document.querySelector(`.img-plan-card[data-rowid="${id}"]`);
  if (card) {
    if (field === 'etat') {
      // Lightweight update: toggle pills and refresh analyse only
      card.querySelectorAll('.img-etat-pill').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.etat === value);
      });
      const analyseEl = card.querySelector('.img-plan-analyse');
      if (analyseEl) analyseEl.innerHTML = window._renderImgAnalyse?.(row) ?? '';
    } else {
      // Full card re-render so visible form fields match _imgRows exactly
      const idx = _imgRows.findIndex(r => r.id === id);
      card.outerHTML = _renderImgCard(row, idx);
    }
  }
  updateCostEstimate();
}

// Display-only labels: value (routing) stays unchanged, only the visible text differs.
const SERVICE_DISPLAY_LABELS = {
  'Étanchéité terrasse': 'Étanchéité terrasse extérieure au sol',
};

function _svcOpts(metierKey, currentValue) {
  const cat = SERVICE_CATALOG[metierKey];
  if (!cat) return '<option value="">— Sous-service —</option>';
  return '<option value="">— Sous-service —</option>' +
    cat.services.map(s => {
      const label = SERVICE_DISPLAY_LABELS[s] || s;
      return `<option value="${_escHtml(s)}"${s === currentValue ? ' selected' : ''}>${_escHtml(label)}</option>`;
    }).join('');
}

function _ctxOpts(metierKey, currentValue) {
  const opts = CONTEXTE_BY_METIER[metierKey] || CONTEXTE_OPTIONS;
  const def  = opts[0].value;
  return opts.map(o =>
    `<option value="${o.value}"${(currentValue || def) === o.value ? ' selected' : ''}>${_escHtml(o.label)}</option>`
  ).join('');
}

function _changeMetier(rowId, metierKey) {
  const row = _imgRows.find(r => r.id === rowId);
  if (!row) return;
  row.metier  = metierKey;
  row.travaux = '';
  // Reset contexte to first option of the new metier's context list
  const newCtxOpts = CONTEXTE_BY_METIER[metierKey] || CONTEXTE_OPTIONS;
  row.contexte = newCtxOpts[0].value;
  const card = document.querySelector(`.img-plan-card[data-rowid="${rowId}"]`);
  if (card) {
    const svcSel = card.querySelector('.img-svc-select');
    if (svcSel) svcSel.innerHTML = _svcOpts(metierKey, '');
    const ctxSel = card.querySelector('.img-ctx-select');
    if (ctxSel) ctxSel.innerHTML = _ctxOpts(metierKey, row.contexte);
    const analyseEl = card.querySelector('.img-plan-analyse');
    if (analyseEl) analyseEl.innerHTML = window._renderImgAnalyse?.(row) ?? '';
  }
  updateCostEstimate();
}

function _renderImgCard(row, idx) {
  const num    = String(idx + 1).padStart(2, '0');
  const stTxt  = row.status === 'running' ? '⏳' :
                 row.status === 'done'    ? `✅ ${row.images.length}` :
                 row.status === 'error'   ? '❌' : '–';

  const metierOpts      = Object.entries(SERVICE_CATALOG).map(([k, v]) =>
    `<option value="${k}"${(row.metier || '') === k ? ' selected' : ''}>${_escHtml(v.label)}</option>`
  ).join('');
  const contexteOpts    = _ctxOpts(row.metier || '', row.contexte || '');
  const etatPills       = ETAT_OPTIONS.map(p =>
    `<button class="img-etat-pill${row.etat === p.value ? ' active' : ''}" data-etat="${p.value}" onclick="updateImgRow(${row.id},'etat','${p.value}')">${p.label}</button>`
  ).join('');
  const meteoOpts       = METEO_OPTIONS.map(o =>
    `<option value="${o.value}"${row.meteo === o.value ? ' selected' : ''}>${o.label}</option>`).join('');

  return `
<div class="img-plan-card" data-rowid="${row.id}">
  <div class="img-plan-card-header">
    <span class="img-plan-card-num">${num}</span>
    <input type="text" class="img-plan-fiche-input" list="datalist-form-fiche"
      value="${_escHtml(row.fiche)}" placeholder="Fiche GMB..."
      oninput="updateImgRow(${row.id},'fiche',this.value)" />
    <div class="img-plan-nbwrap">
      <span style="color:#64748b;">×</span>
      <input type="number" min="1" max="10" value="${row.nb}"
        oninput="updateImgRow(${row.id},'nb',Math.max(1,Math.min(10,parseInt(this.value)||1)))" />
      <span class="img-plan-nblabel">img</span>
    </div>
    <span class="img-row-status ${row.status}">${stTxt}</span>
    <button class="btn-delete" onclick="removeImgRow(${row.id})" title="Supprimer">🗑</button>
  </div>
  <div class="img-plan-card-body">
    <div class="img-plan-fields">
      <div class="img-plan-field img-plan-field-service">
        <label>Métier</label>
        <select onchange="_changeMetier(${row.id},this.value)">
          <option value="">— Métier —</option>
          ${metierOpts}
        </select>
      </div>
      <div class="img-plan-field img-plan-field-service">
        <label>Sous-service</label>
        <select class="img-svc-select" onchange="updateImgRow(${row.id},'travaux',this.value)">
          ${_svcOpts(row.metier || '', row.travaux || '')}
        </select>
      </div>
      <div class="img-plan-row2">
        <div class="img-plan-field">
          <label>Ville</label>
          <input type="text" value="${_escHtml(row.ville||'')}" placeholder="Lyon, Bordeaux..."
            oninput="updateImgRow(${row.id},'ville',this.value)" />
        </div>
        <div class="img-plan-field">
          <label>Contexte</label>
          <select class="img-ctx-select" onchange="updateImgRow(${row.id},'contexte',this.value)">${contexteOpts}</select>
        </div>
      </div>
      <div class="img-plan-field">
        <label>État du chantier</label>
        <div class="img-etat-pills">${etatPills}</div>
      </div>
      <div class="img-plan-field img-plan-field-meteo">
        <label>Météo</label>
        <select onchange="updateImgRow(${row.id},'meteo',this.value)">${meteoOpts}</select>
      </div>
    </div>
    <div class="img-plan-analyse">${window._renderImgAnalyse?.(row) ?? ''}</div>
  </div>
</div>`;
}

function renderImgPlanning() {
  const body = document.getElementById('img-planning-body');
  if (!body) return;
  body.innerHTML = _imgRows.map((row, idx) => _renderImgCard(row, idx)).join('');
  updateCostEstimate();
}

function updateCostEstimate() {
  const total = _imgRows.reduce((s, r) => s + (parseInt(r.nb) || 0), 0);
  const el    = document.getElementById('img-gen-counter');
  if (el) el.textContent = total > 0 ? `~${total} image${total > 1 ? 's' : ''} planifiée${total > 1 ? 's' : ''} (Agent IA)` : '';
}

function openOperatorDriveFolder(operatorName) {
  let op = (operatorName || '').trim();
  if (!op) {
    window.open('https://drive.google.com/drive/my-drive', '_blank');
    return;
  }
  
  const normKey = op.toLowerCase();
  const searchName = (normKey === 'fif' || normKey === 'fifaliana') ? 'Fifaliana' : op;

  // 1. Lien direct personnalise depuis localStorage ou config
  const customUrl = localStorage.getItem(`drive_folder_${normKey}`) ||
                    localStorage.getItem(`drive_folder_${searchName.toLowerCase()}`) ||
                    (window.GMB_CONFIG && window.GMB_CONFIG.DRIVE_FOLDERS && (window.GMB_CONFIG.DRIVE_FOLDERS[op] || window.GMB_CONFIG.DRIVE_FOLDERS[searchName]));

  if (customUrl) {
    window.open(customUrl, '_blank');
    return;
  }

  // 2. Recherche ciblee uniquement sur les DOSSIERS portant le nom du moderateur
  const searchUrl = `https://drive.google.com/drive/search?q=type:folder%20name:%22${encodeURIComponent(searchName)}%22`;
  window.open(searchUrl, '_blank');
}
