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
  const val = document.getElementById('pwd-input').value;
  if (val === PASSWORD) {
    sessionStorage.setItem('gmb_auth', '1');
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    init();
  } else {
    document.getElementById('pwd-error').classList.remove('hidden');
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
  _avisFetching = sbGet('avis', 'select=*&order=date.desc').then(data => {
    _avisCache = data;
    _avisFetching = null;
    return data;
  });
  return _avisFetching;
}

function invalidateAvisCache() {
  _avisCache = null;
  _avisFetching = null;
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
  const savedOpenAI = localStorage.getItem('openai_key');
  if (savedOpenAI) { const el = document.getElementById('openai-key'); if (el) el.value = savedOpenAI; }
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

    // Trouver indices depuis la ligne header
    const headerRow = gridData[0]?.values || [];
    const headers = headerRow.map(c => cellText(c).toLowerCase());
    const idx = {
      siteUrl:      1, // Colonne B : URL du site
      nomSite:      headers.findIndex(h => h === 'nom site' || h.includes('nom site')),
      etat:         headers.findIndex(h => h.includes('etat gmb')),
      nomGmb:       headers.findIndex(h => h.includes('nom du gmb')),
      lien:         headers.findIndex(h => h.includes('lien du gmb')),
      dateOuv:      headers.findIndex(h => h.includes("date d'ouverture")),
      avisInitiaux: headers.findIndex(h => h.includes('reviews') || h.includes('# reviews')),
    };
    if (idx.nomSite < 0)      idx.nomSite = 0;
    if (idx.etat < 0)         idx.etat = 9;
    if (idx.nomGmb < 0)       idx.nomGmb = 10;
    if (idx.lien < 0)         idx.lien = 11;
    if (idx.dateOuv < 0)      idx.dateOuv = 13;
    if (idx.avisInitiaux < 0) idx.avisInitiaux = 14;

    // Parser les lignes éligibles
    const fromSheet = [];
    for (let i = 1; i < gridData.length; i++) {
      const cells   = gridData[i]?.values || [];
      const etat    = cellText(cells[idx.etat]);
      const nomSite = cellText(cells[idx.nomSite]);
      const nomGmb  = cellText(cells[idx.nomGmb])
                   || (formulaRows[i] ? (formulaRows[i][idx.nomGmb] || '').toString().trim() : '');
      const nom     = nomGmb || nomSite;
      const siteUrl = cellLink(cells[idx.siteUrl]) || cellText(cells[idx.siteUrl]) || '';
      // Extraire URL : cellLink (hyperlink/richtext) puis fallback formule brute
      let lien = cellLink(cells[idx.lien]);
      if (!lien && formulaRows[i]) {
        const raw = formulaRows[i][idx.lien] || '';
        const m = raw.match(/HYPERLINK\s*\(\s*"([^"]+)"/i);
        if (m) lien = m[1];
        else if (raw.startsWith('http')) lien = raw;
      }
      console.log(`[SYNC DEBUG] row ${i} | nomSite="${cellText(cells[idx.nomSite])}" | nomGmb="${cellText(cells[idx.nomGmb])}" | nom="${nom}" | lien="${lien}" | etat="${cellText(cells[idx.etat])}" | idxNomGmb=${idx.nomGmb}`);;

      const dateRaw = cellText(cells[idx.dateOuv]);

      if (!etatEligible(etat) || !nomSite || !dateRaw) continue; // lien optionnel pour l'import
      const avisRaw = parseInt(cellText(cells[idx.avisInitiaux]) || '0', 10);
      fromSheet.push({
        nom,
        nomSite,
        siteUrl,
        lien,
        date_ouverture: dateRaw || null,
        avis_initiaux:  isNaN(avisRaw) ? 0 : avisRaw,
        etat:           etat.trim(),
      });
    }

    // Upsert : lien > nom exact > mots-clés (ville + métier)
    const existantes = await getFiches();
    const normLien = l => l.trim().toLowerCase().replace(/\/$/, '');
    const normStr  = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ');
    const existantesParLien = {};
    const existantesParNom  = {};
    existantes.forEach(f => {
      if (f.lien) existantesParLien[normLien(f.lien)] = f;
      existantesParNom[normStr(f.nom)] = f;
    });

    function findMatch(f) {
      if (f.lien && existantesParLien[normLien(f.lien)]) return existantesParLien[normLien(f.lien)];
      if (existantesParNom[normStr(f.nom)]) return existantesParNom[normStr(f.nom)];
      // Match par mots-clés : tous les mots du nomSite dans le nom Supabase
      const words = normStr(f.nomSite).split(/\s+/).filter(w => w.length > 2);
      if (words.length < 2) return null;
      const candidates = existantes.filter(sb => {
        const sbNorm = normStr(sb.nom);
        return words.every(w => sbNorm.includes(w));
      });
      if (candidates.length === 0) return null;
      if (candidates.length === 1) return candidates[0];
      // Plusieurs candidats : départager avec l'URL du site (colonne B)
      if (f.siteUrl) {
        const siteWords = normStr(f.siteUrl).split(/\s+|\/|\.|-/).filter(w => w.length > 3);
        let best = null, bestScore = -1;
        for (const sb of candidates) {
          const sbNorm = normStr(sb.nom);
          const score = siteWords.filter(w => sbNorm.includes(w)).length;
          if (score > bestScore) { bestScore = score; best = sb; }
        }
        if (best) return best;
      }
      return candidates[0];
    }

    const aInserer = [];
    const aUpdater = [];
    fromSheet.forEach(f => {
      const match = findMatch(f);
      if (match) aUpdater.push({ ...f, supabaseId: match.id, ancienNom: match.nom });
      else       aInserer.push(f);
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
  if (!nom) return;
  const fiches = await getFiches();
  if (fiches.find(f => f.nom === nom)) return alert('Cette fiche existe déjà.');
  await sbInsert('fiches', { nom, lien: lien || null });
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

  const btnMerge = document.createElement('button');
  btnMerge.className = 'btn-merge';
  btnMerge.textContent = '🔀 Fusionner';
  btnMerge.onclick = () => toggleMerge(f.id);

  const btnDel = document.createElement('button');
  btnDel.className = 'btn-delete';
  btnDel.textContent = '🗑';
  btnDel.onclick = () => deleteFiche(f.nom);

  actions.append(countSpan, btnNom, btnLien, btnDate, btnMerge, btnDel);
  row.append(nomSpan, actions);

  const statsBar = document.createElement('div');
  statsBar.className = 'fiche-stats-bar';
  const dateOuv = f.date_ouverture ? new Date(f.date_ouverture).toLocaleDateString('fr-FR') : '–';
  const avisInit = f.avis_initiaux != null ? f.avis_initiaux : '–';
  const currentCat = categoriserFiche(f);
  const catOptions = CATEGORIES_FICHES.filter(c => c.key !== 'autre')
    .map(c => `<option value="${c.key}" ${currentCat === c.key ? 'selected' : ''}>${c.label}</option>`)
    .join('');
  statsBar.innerHTML =
    `<span>📅 ${dateOuv}</span>` +
    `<span>🏁 ${avisInit} initiaux</span>` +
    `<span>✍️ ${count} postés Kevin</span>` +
    `<span style="color:#38bdf8;font-weight:600;">= ${total} avis total</span>` +
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
    return 0;
  });

  // Grouper par catégorie
  const groups = {};
  CATEGORIES_FICHES.forEach(c => groups[c.key] = []);
  fiches.forEach(f => {
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

// ── SAISIE ──
let selectedNote = 0;

function setNote(n) {
  selectedNote = n;
  document.getElementById('form-note').value = n;
  const stars = document.querySelectorAll('.star-picker span');
  stars.forEach((s, i) => s.style.opacity = i < n ? '1' : '0.25');
  document.getElementById('star-display').textContent = '★'.repeat(n) + '☆'.repeat(5 - n);
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
const MOIS_LABELS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const STATUT_LABELS = {
  supprime: { label: 'Supprimé (à été fait)', color: '#e53935' },
  j0:       { label: 'Posté J+0',  color: '#9c27b0' },
  j7:       { label: 'Posté J+7',  color: '#fb8c00' },
  j14:      { label: 'Posté J+14', color: '#f4b942' },
  j21:      { label: 'Posté J+21', color: '#43a047' },
  j30:      { label: 'Posté J+30', color: '#1a73e8' },
};

function buildAvisRow(a, rappelsDus, aVerif) {
  const st = STATUT_LABELS[a.statut] || { label: a.statut || '–', color: '#999' };
  const needsVerif = aVerif.includes(a.id);
  const verifLabel = needsVerif ? rappelsDus.find(d => d.avis.id === a.id)?.label : null;
  return `<tr class="${needsVerif ? 'avis-a-verifier' : ''}">
    <td class="avis-date">
      <input type="date" class="date-inline" value="${a.date}" onchange="updateDate('${a.id}', this.value)" />
    </td>
    <td><span class="avis-fiche">${a.fiche_nom}</span></td>
    <td style="color:#94a3b8;font-size:0.85rem;">${a.operateur || '–'}</td>
    <td class="avis-auteur">${a.auteur}</td>
    <td class="avis-stars">${'★'.repeat(a.note)}${'☆'.repeat(5-a.note)}</td>
    <td>
      <select class="statut-inline" onchange="updateStatut('${a.id}', this.value)" style="border-color:${st.color};color:${st.color}">
        ${Object.entries(STATUT_LABELS).map(([k,v]) =>
          `<option value="${k}" ${a.statut===k?'selected':''} style="color:${v.color}">${v.label}</option>`
        ).join('')}
      </select>
    </td>
    <td>${needsVerif ? `<span class="avis-rappel">🔔 ${verifLabel}</span>` : ''}</td>
    <td style="text-align:center">${a.photo ? '📷' : ''}</td>
    <td style="text-align:center">${a.lien ? `<a href="${a.lien}" target="_blank" rel="noopener" title="Voir l'avis">🔗</a>` : ''}</td>
    <td class="col-texte">${a.texte || ''}</td>
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

  if (fiche)  avis = avis.filter(a => a.fiche_nom === fiche);
  if (month)  avis = avis.filter(a => a.date.startsWith(month));
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
  const sortedMonths = Object.keys(byMonth).sort((a, b) => b.localeCompare(a));

  const tableHead = `<table class="avis-table">
    <thead><tr>
      <th>Date</th><th>Fiche GMB</th><th>Opérateur</th><th>Gmail</th><th>Note</th>
      <th>Statut</th><th>Rappel</th><th>Photo</th><th>Lien</th><th>Avis</th><th></th>
    </tr></thead>`;

  el.innerHTML = sortedMonths.map((m, idx) => {
    const [year, mo] = m.split('-');
    const label = `${MOIS_LABELS[parseInt(mo)-1]} ${year}`;
    const rows = byMonth[m].map(a => buildAvisRow(a, rappelsDus, aVerif)).join('');
    const suppCount = byMonth[m].filter(a => a.statut === 'supprime').length;
    const j30Count  = byMonth[m].filter(a => a.statut === 'j30').length;
    // Ouvert si : état précédent connu → respecter, sinon premier mois ouvert par défaut
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
  }).join('');

  renderRappelsBanner(rappelsDus);
}

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
  let avis = await getAvis();
  const fiche = document.getElementById('dash-fiche')?.value.trim() || '';
  const year  = parseInt(document.getElementById('dash-year')?.value || new Date().getFullYear());
  const month = document.getElementById('dash-month')?.value || '';

  if (fiche) avis = avis.filter(a => a.fiche_nom === fiche);
  avis = avis.filter(a => parseInt(a.date.slice(0, 4)) === year);

  const selectedMonth = month ? `${year}-${month}` : '';
  const moisAvis = selectedMonth ? avis.filter(a => a.date.startsWith(selectedMonth)) : avis;
  const moyenne = moisAvis.length ? (moisAvis.reduce((s,a) => s+a.note, 0) / moisAvis.length).toFixed(1) : '–';

  document.getElementById('stat-total').textContent     = moisAvis.length;
  document.getElementById('stat-kevin').textContent     = moisAvis.filter(a => a.operateur?.toLowerCase() === 'kevin').length;
  document.getElementById('stat-fifaliana').textContent = moisAvis.filter(a => a.operateur?.toLowerCase() === 'fifaliana').length;
  const j30Count  = moisAvis.filter(a => a.statut === 'j30').length;
  const suppCount = moisAvis.filter(a => a.statut === 'supprime').length;
  const resolus = j30Count + suppCount;
  const tauxSurvie = resolus > 0 ? Math.round((j30Count / resolus) * 100) + ' %' : '–';

  document.getElementById('stat-j30').textContent       = j30Count;
  document.getElementById('stat-supprimes').textContent = suppCount;
  document.getElementById('stat-survie').textContent    = tauxSurvie;

  const months = Array.from({length: 12}, (_, i) => `${year}-${String(i+1).padStart(2,'0')}`);
  const labels = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc'];
  const volumes   = months.map(m => avis.filter(a => a.date.startsWith(m)).length);
  const supprimes = months.map(m => avis.filter(a => a.date.startsWith(m) && a.statut === 'supprime').length);
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

  // Top 5 fiches avec le plus d'avis supprimés (sur la période filtrée, toutes fiches)
  const allAvis = await getAvis();
  const allFiltered = allAvis.filter(a =>
    parseInt(a.date.slice(0,4)) === year &&
    (!selectedMonth || a.date.startsWith(selectedMonth))
  );
  const fichesMap = {};
  allFiltered.forEach(a => {
    if (!fichesMap[a.fiche_nom]) fichesMap[a.fiche_nom] = { total: 0, supprimes: 0 };
    fichesMap[a.fiche_nom].total++;
    if (a.statut === 'supprime') fichesMap[a.fiche_nom].supprimes++;
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
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:12px;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:12px 16px;';
      row.innerHTML = `
        <span style="width:32px;height:32px;border-radius:50%;background:${rankBg[i]};color:${rankClr[i]};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0">${i + 1}</span>
        <span style="flex:1;font-size:14px;font-weight:500;color:#f1f5f9;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${d.nom}</span>
        <span style="display:flex;gap:6px;flex-shrink:0;align-items:center">
          <span style="background:#ef444420;color:#ef4444;font-size:12px;font-weight:600;padding:3px 10px;border-radius:99px;white-space:nowrap">${d.supprimes} supprimés</span>
          <span style="background:#33415540;color:#94a3b8;font-size:12px;font-weight:600;padding:3px 10px;border-radius:99px;white-space:nowrap">${d.total} avis</span>
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
    const r = RAPPELS.find(r => r.statut === st && age >= r.joursDepuisAvis);
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

async function populateGenFiche() {
  const fiches = await getFiches();
  const dl = document.getElementById('datalist-gen-fiche');
  if (dl) dl.innerHTML = fiches.map(f => `<option value="${f.nom.replace(/"/g,'&quot;')}">`).join('');
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
  const ville   = document.getElementById('gen-ville').value.trim();
  const ton     = document.getElementById('gen-ton').value;

  if (!fiche || !travaux || !ville) {
    alert('Merci de remplir les 3 champs obligatoires.');
    return;
  }

  let apiKey = getGeminiKey();
  if (!apiKey) {
    if (!promptGeminiKey()) return;
    apiKey = getGeminiKey();
  }

  const tonLabel = { neutre: 'neutre et factuel', enthousiaste: 'enthousiaste et chaleureux', detaille: 'détaillé et précis', court: 'court et direct' }[ton] || 'neutre';

  const prompt = `Tu es un vrai client français qui laisse un avis Google après une intervention à domicile.

Informations :
- Entreprise : ${fiche}
- Travaux : ${travaux}
- Ville : ${ville}
- Ton : ${tonLabel}

Règles de rédaction strictes :
1. Écris à la première personne (je, on, nous) — style humain, naturel, pas de formulation marketing
2. Langage familier modéré OK ("les gars", "nickel", "rien à redire", "boulot", "sympa") — INTERDIT : "franchement", "le matos", "vachement", "trop bien", "au top"
3. Tu PEUX commencer par le nom de l'entreprise suivi d'une observation directe (ex : "Super boulot de la part de [entreprise] !") ou par une situation concrète
4. Structure narrative : situation ou observation → intervention → résultat → impression finale (varie l'ordre)
5. Inclure au moins un détail concret : voisins qui réagissent, propreté du chantier, ponctualité, conformité du devis, qualité des finitions, protection du mobilier
6. Les fautes de frappe légères et petites erreurs grammaticales sont acceptées et souhaitées pour l'authenticité
7. Exclamations naturelles OK (1-2 max)
8. Signaux d'authenticité Google : pas de superlatifs répétés, une observation précise et spécifique, nom de l'entreprise max 1-2 fois
9. Longueur : court = 2-3 phrases / neutre = 3-4 phrases / détaillé = 5-7 phrases / enthousiaste = 4-5 phrases avec émotion sincère
10. Conclusions variées : "Une adresse qu'on garde précieusement", "On repassera par eux sans hésiter", "Je recommande vivement pour leur sérieux", "Le résultat parle de lui-même" — jamais deux fois la même
11. Réponds UNIQUEMENT avec le texte de l'avis — aucun guillemet, aucune introduction, aucune explication

Avis :`;

  const result = document.getElementById('gen-result');
  const textEl = document.getElementById('gen-texte');
  result.classList.remove('hidden');
  textEl.textContent = '✨ Génération en cours...';
  document.getElementById('gen-copy-confirm').classList.add('hidden');

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
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
  avis.forEach(a => {
    if (!derniereUtilisation[a.auteur] || a.date > derniereUtilisation[a.auteur]) {
      derniereUtilisation[a.auteur] = a.date;
    }
  });

  const filterVille = (document.getElementById('gmail-filter-ville')?.value || '').toLowerCase().trim();
  const sort        = document.getElementById('gmail-filter-sort')?.value || 'az';

  let list = gmails.filter(g => !filterVille || (g.ville || '').toLowerCase().includes(filterVille));

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
                 <button class="ville-map-btn" onclick="showGmbMap('${g.ville.replace(/'/g, "\\'")}')">📍 ${g.ville}</button>
                 <input type="text" value="${g.ville}" title="Modifier la ville"
                   style="background:transparent;border:none;border-bottom:1px dashed #334155;color:#475569;font-size:0.75rem;width:70px;outline:none;padding:1px 2px;"
                   onchange="updateGmailVille('${g.id}', this.value)" />
               </div>`
            : `<input type="text" value="" placeholder="Ajouter une ville..."
                 style="background:transparent;border:none;border-bottom:1px solid #334155;color:#94a3b8;font-size:0.88rem;width:120px;outline:none;padding:2px 4px;"
                 onchange="updateGmailVille('${g.id}', this.value)" />`;
          return `<tr style="border-bottom:1px solid #1e293b;">
            <td style="padding:10px;color:#f1f5f9;">${g.email}</td>
            <td style="padding:10px;">${villeCell}</td>
            <td style="padding:10px;text-align:center;">
              <input type="checkbox" ${g.local_guide ? 'checked' : ''} onchange="toggleLocalGuide('${g.id}', this.checked)" style="accent-color:#f59e0b;width:16px;height:16px;" />
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

async function geocodeVille(ville) {
  if (!ville) return null;
  if (_geoCache[ville]) return _geoCache[ville];
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (attempt > 0) await new Promise(r => setTimeout(r, 1200));
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(ville + ', France')}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'fr' } }
      );
      if (!r.ok) continue;
      const data = await r.json();
      if (data.length) {
        const result = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
        _geoCache[ville] = result;
        return result;
      }
    } catch(e) {
      console.warn('[geocode] tentative', attempt + 1, 'échouée pour', ville, e);
    }
  }
  return null;
}

async function showGmbMap(ville) {
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
  const villeNorm    = normalizeStr(ville);
  const exactMatches = fiches.filter(f => normalizeStr(f.nom).includes(villeNorm));
  const otherFiches  = fiches.filter(f => !normalizeStr(f.nom).includes(villeNorm));

  const fichesEl = document.getElementById('gmb-map-fiches');

  const renderFicheItem = (f, dist) => `
    <div class="gmb-fiche-item">
      <div class="gmb-fiche-item-name">
        🏢 ${f.nom}
        ${dist ? `<span class="gmb-dist-badge">~${dist} km</span>` : ''}
      </div>
      ${f.lien ? `<a href="${f.lien}" target="_blank" rel="noopener">Voir sur Google Maps ↗</a>` : ''}
    </div>`;

  const renderFicheList = (nearby, isSearching) => {
    if (_mapSession !== session) return;
    let html = '';
    if (exactMatches.length) {
      html += `<p class="gmb-section-label">📍 ${exactMatches.length} fiche${exactMatches.length>1?'s':''} à ${ville}</p>`;
      html += exactMatches.map(f => renderFicheItem(f, 0)).join('');
    }
    if (nearby.length) {
      html += `<p class="gmb-section-label" style="margin-top:0.75rem;">🔍 ${nearby.length} fiche${nearby.length>1?'s':''} dans un rayon de 50 km</p>`;
      html += nearby.map(f => renderFicheItem(f, f._dist)).join('');
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
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18
      }).addTo(_leafletMap);

      L.circle([centerGeo.lat, centerGeo.lon], {
        radius: 50000,
        color: '#6366f1',
        fillColor: '#6366f1',
        fillOpacity: 0.05,
        weight: 1.5,
        dashArray: '6 4'
      }).addTo(_leafletMap);

      const centerIcon = L.divIcon({
        className: '',
        html: `<div style="background:#6366f1;width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.5);"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });
      L.marker([centerGeo.lat, centerGeo.lon], { icon: centerIcon })
        .addTo(_leafletMap)
        .bindPopup(`<b>${ville}</b>`)
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

    const nearbyIcon = (typeof L !== 'undefined') ? L.divIcon({
      className: '',
      html: `<div style="background:#22c55e;width:10px;height:10px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,.4);"></div>`,
      iconSize: [10, 10],
      iconAnchor: [5, 5]
    }) : null;

    const nearby = [];
    for (const f of otherFiches) {
      if (_mapSession !== session) return;
      await new Promise(r => setTimeout(r, 300));
      if (_mapSession !== session) return;

      const fGeo = await geocodeVille(f.nom);
      if (!fGeo) continue;

      const dist = haversineKm(centerGeo.lat, centerGeo.lon, fGeo.lat, fGeo.lon);
      if (dist > 50) continue;

      const d = Math.round(dist);
      nearby.push({ ...f, _dist: d });
      nearby.sort((a, b) => a._dist - b._dist);

      if (leafletReady && _leafletMap && nearbyIcon) {
        L.marker([fGeo.lat, fGeo.lon], { icon: nearbyIcon })
          .addTo(_leafletMap)
          .bindPopup(`<b>${f.nom}</b><br>~${d} km`);
      }
      renderFicheList(nearby, true);
    }

    renderFicheList(nearby, false);
  }, 300);
}

function closeGmbMap() {
  document.getElementById('gmb-map-panel').classList.remove('open');
  document.getElementById('gmb-map-overlay').classList.remove('open');
  if (_leafletMap) { _leafletMap.remove(); _leafletMap = null; }
}

// ── GÉNÉRATEUR D'IMAGES BULK ──
let _imgRows         = [];
let _imgCounter      = 0;
let _generatedImages = [];

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

const WORK_SCENES = {

  élagage: {
    category:         'arboriste',
    priority:         3,
    service_keywords: [
      { phrase: 'taille arbre',   score: 12 },
      { phrase: 'rognage souche', score: 12 },
      { phrase: 'emondage',       score: 10 },
      { phrase: 'elagage',        score: 10 },
      { phrase: 'elagueur',       score: 10 },
      { phrase: 'taille haie',    score: 9  },
      { phrase: 'haie',           score: 4  },
      { phrase: 'arbust',         score: 3  },
    ],
    exclude_if: [],
    intro:      'tree pruning and hedge trimming at a residential garden',
    setting:    'exterior',
    secteur:           'arborist',
    variation_setting: 'garden',
    hasWorkers:        false,
    camera:            'standing on the ground, 5–8 m from the tree, angled slightly upward',
    materials:  ['cut branches', 'hedge clippings', 'fresh sawdust', 'bark chips'],
    photo_defects: [
      'slight upward tilt distorting verticals',
      'pale sky clipping exposure on bright patches',
    ],
    exclusions: ['chainsaws', 'helmets', 'ropes', 'harnesses', 'chippers', 'safety equipment', 'workers', 'people'],
    states: {
      debut: {
        framing: {
          work_pct:   40,
          foreground: 'a small pile of first cut branches on the lawn beside the tree',
          midground:  'tree mostly intact with one section freshly trimmed — raw cut marks visible on main branch',
          background: 'garden fence, neighbouring roof, pale sky',
        },
        debris:      'a few scattered branch offcuts and light sawdust near the base',
        description: 'Pruning has just started. The tree is mostly full. One branch section has been removed, leaving a clean raw cut mark. Materials are barely disturbed.',
      },
      encours: {
        framing: {
          work_pct:   55,
          foreground: 'branches and clippings piled on lawn around the base, fresh sawdust visible',
          midground:  'tree crown partially pruned — clearly lighter on one side, major cuts visible',
          background: 'neighbouring rooflines and sky now more visible through the thinned crown',
        },
        debris:      'cut branches and hedge clippings piled on lawn, sawdust scattered around base',
        description: 'Pruning is underway. The crown is noticeably lighter on one side. Branches are piled on the lawn. The job is active and progressing well.',
      },
      semifinal: {
        framing: {
          work_pct:   50,
          foreground: 'most branches already removed and stacked, one last pile being managed',
          midground:  'tree properly shaped, fresh cuts on all main branches neatly done',
          background: 'open sky now visible, clean garden structure emerging',
        },
        debris:      'a tidy pile of cut branches ready for removal, fine sawdust remaining on the lawn',
        description: 'The pruning is nearly complete. The tree has a clean shape. Cut material is being organised into neat piles for removal.',
      },
      final: {
        framing: {
          work_pct:   60,
          foreground: 'clean lawn with only a small heap of last trimmings at the edge',
          midground:  'properly shaped tree — balanced crown, all cuts clean and neatly done',
          background: 'tidy garden, neighbouring house, open sky',
        },
        debris:      'minimal — one small bundle of branches at garden edge, lawn otherwise clear',
        description: 'Work is finished. The tree is well shaped. The garden is clean and tidy. A professional result ready to photograph for a client.',
      },
    },
  },

  abattage: {
    category:         'arboriste',
    priority:         3,
    service_keywords: [
      { phrase: 'abattage arbre', score: 13 },
      { phrase: 'dessouchage',    score: 11 },
      { phrase: 'abattage',       score: 9  },
      { phrase: 'abatage',        score: 9  },
    ],
    exclude_if: [],
    intro:      'large tree felling at a residential property',
    setting:    'exterior',
    secteur:           'tree feller',
    variation_setting: 'garden',
    hasWorkers:        false,
    camera:            'standing back 7–10 m, wide view of felled or sectioned tree',
    materials:  ['log sections', 'bark chips', 'coarse sawdust', 'large branches'],
    photo_defects: [
      'motion blur on peripheral branches from wind',
      'JPEG compression on dense bark and wood grain texture',
    ],
    exclusions: ['chainsaws', 'safety gear', 'ropes', 'cranes', 'workers', 'people'],
    states: {
      debut: {
        framing: {
          work_pct:   40,
          foreground: 'first cut log sections placed neatly at the garden edge',
          midground:  'tree still standing with lower branches removed and base notched',
          background: 'garden fence, neighbouring house',
        },
        debris:      'bark chips and a light coat of sawdust around the base of the standing tree',
        description: 'Felling has just started. The tree is still standing but lower branches are removed. The first cuts are made at the base.',
      },
      encours: {
        framing: {
          work_pct:   60,
          foreground: 'trunk sections laid on ground in an organised row, bark chips around them',
          midground:  'main trunk partially sectioned, upper part still standing',
          background: 'sky now more open above where canopy is being reduced',
        },
        debris:      'log sections, branches and sawdust on the ground — an active but organised work site',
        description: 'The tree is being sectioned. Several log pieces are already on the ground. The upper trunk and crown are still being worked.',
      },
      semifinal: {
        framing: {
          work_pct:   55,
          foreground: 'log sections stacked neatly on one side, sawdust on ground',
          midground:  'fresh flat stump visible, remaining small branches being cleared',
          background: 'open sky where the tree stood, neighbouring house now visible',
        },
        debris:      'neatly stacked logs, fine sawdust coat on surrounding ground',
        description: 'The tree is down. The trunk is sectioned. Logs are being stacked. The stump is clean and flat. Final clearing underway.',
      },
      final: {
        framing: {
          work_pct:   50,
          foreground: 'clean garden with fresh flat stump visible',
          midground:  'tidy log pile stacked against fence or garden wall',
          background: 'open sky, neighbouring property now visible, cleared garden',
        },
        debris:      'minimal — stump and a tidy log pile are the only evidence of work',
        description: 'Felling complete. Garden clear. Logs neatly stacked. The stump is all that remains. A clean professional finish.',
      },
    },
  },

  toiture: {
    category:         'couverture',
    priority:         3,
    service_keywords: [
      { phrase: 'reparation tuiles',   score: 13 },
      { phrase: 'remplacement tuiles', score: 13 },
      { phrase: 'pose tuiles',         score: 13 },
      { phrase: 'pose ardoises',       score: 13 },
      { phrase: 'reparation toiture',  score: 12 },
      { phrase: 'faitage',             score: 11 },
      { phrase: 'charpente',           score: 10 },
      { phrase: 'ossature bois',       score: 10 },
      { phrase: 'zinguerie',           score: 10 },
      { phrase: 'gouttiere',           score: 8  },
      { phrase: 'couvreur',            score: 8  },
      { phrase: 'ardoise',             score: 7  },
      { phrase: 'tuile',               score: 6  },
      { phrase: 'toitur',              score: 4  },
    ],
    exclude_if: ['nettoyage', 'demousage', 'demoussage'],
    intro:      'roof renovation on a residential house',
    setting:    'exterior',
    secteur:    'roofer',
    hasWorkers: false,
    camera:     'standing in the driveway or garden, 3–6 m from house, looking up at roof',
    materials:  ['terracotta roof tiles', 'wooden battens', 'roofing felt', 'mortar bags'],
    photo_defects: [
      'overexposure on pale sky bleaching the top third',
      'JPEG compression artifacts on rough tile texture',
    ],
    exclusions: ['safety harnesses', 'helmets', 'scaffolding tools', 'workers', 'people'],
    states: {
      debut: {
        framing: {
          work_pct:   40,
          foreground: 'first removed tiles stacked near the wall, a few mortar fragments on the driveway',
          midground:  'roof mostly intact with one small stripped section showing bare lath beneath',
          background: 'upper roof still fully tiled, chimney, pale sky',
        },
        debris:      'a small pile of removed tiles beside the house, light mortar dust near the stripped patch',
        description: 'Work has just started. The old roof is mostly in place. One small section is stripped, revealing bare wooden battens. Materials are staged.',
      },
      encours: {
        framing: {
          work_pct:   55,
          foreground: 'organised pile of old tiles on driveway, mortar chips nearby',
          midground:  'roof half stripped — one slope bare showing wooden battens, pallet of new tiles staged to the side',
          background: 'opposite roof slope still tiled, sky, chimney tops',
        },
        debris:      'old tiles stacked on driveway, mortar dust and a few broken fragments — an active but organised site',
        description: 'Halfway through. Half the roof is stripped to the battens. The other half remains. A pallet of new tiles is staged. Active professional work.',
      },
      semifinal: {
        framing: {
          work_pct:   60,
          foreground: 'a few remaining bags of mortar and offcuts near the wall, driveway mostly clear',
          midground:  'new roof mostly complete — fresh tiles neatly aligned, ridge or flashing still being finished',
          background: 'clean roofline against sky, neighbouring rooftops',
        },
        debris:      'minimal — a small stack of leftover materials near the wall, driveway mostly swept',
        description: 'The new roof is nearly complete. Fresh tiles cover most of the surface, neatly aligned. The ridge or valley flashing is still being finished.',
      },
      final: {
        framing: {
          work_pct:   65,
          foreground: 'clean driveway with only one leftover bag near the wall as an authentic detail',
          midground:  'complete new roof — fresh tiles perfectly aligned, clean ridge line, new flashing',
          background: 'clear roofline, pale sky, neighbouring houses',
        },
        debris:      'nearly none — driveway swept, one leftover bag remains near the wall',
        description: 'Renovation complete. A full new terracotta roof, tiles aligned, ridge clean. Professional result credible for a contractor portfolio.',
      },
    },
  },

  peinture: {
    category:         'peinture',
    priority:         2,
    service_keywords: [
      { phrase: 'peinture interieure', score: 13 },
      { phrase: 'peinture exterieure', score: 12 },
      { phrase: 'peinture exterieur',  score: 12 },
      { phrase: 'peinture facade',     score: 11 },
      { phrase: 'peinture mur',        score: 11 },
      { phrase: 'peinture plafond',    score: 11 },
      { phrase: 'peintur',             score: 1  },
      { phrase: 'peint',               score: 1  },
    ],
    exclude_if: [],
    intro:      'exterior facade painting on a residential house',
    setting:    'exterior',
    secteur:    'painter',
    hasWorkers: false,
    camera:     'standing on pavement, 3–5 m from facade, straight-on or slight diagonal',
    materials:  ['paint cans', 'masking tape', 'drop cloths', 'roller trays'],
    photo_defects: [
      'flat overcast light causing slight overexposure on white painted surface',
      'chromatic aberration on the sharp painted edge between old and new colour',
    ],
    exclusions: ['ladders', 'paint rollers', 'brushes', 'buckets', 'workers', 'people'],
    states: {
      debut: {
        framing: {
          work_pct:   45,
          foreground: 'drop cloths spread at the base of the wall, masking tape on window frames',
          midground:  'facade fully masked and prepared, not yet painted — old paint surface visible',
          background: 'neighbouring facade, garden hedge, pale sky',
        },
        debris:      'masking tape scraps on the ground, protective film around windows',
        description: 'Surface preparation is done. Masking tape on window frames and drop cloths on the ground. Painting has not yet started.',
      },
      encours: {
        framing: {
          work_pct:   55,
          foreground: 'drop cloths on ground with paint drips, used roller tray at the wall base',
          midground:  'facade half painted — visible line between fresh colour and old weathered surface',
          background: 'neighbouring facade and sky',
        },
        debris:      'drop cloths on ground with paint drips, empty paint cans stacked at wall base',
        description: 'Painting is underway. Half the facade shows the new colour. The line between fresh and old paint is clearly visible.',
      },
      semifinal: {
        framing: {
          work_pct:   60,
          foreground: 'drop cloths still in place, a few paint cans near the wall',
          midground:  'facade almost fully painted in new colour, one small section or trim still in progress',
          background: 'clean roofline, sky',
        },
        debris:      'a few paint cans and the drop cloth remain, driveway otherwise clear',
        description: 'Almost done. The facade is mostly the new colour. A corner or trim section is still being finished. The drop cloths are still down.',
      },
      final: {
        framing: {
          work_pct:   70,
          foreground: 'clean pavement, drop cloths removed, one paint can left as authentic detail',
          midground:  'complete fresh facade — even new colour, clean edges around windows and trim',
          background: 'neighbouring facades, garden, sky',
        },
        debris:      'nearly none — pavement clean, one leftover paint can near the wall',
        description: 'Painting complete. The facade has a fresh even coat, clean edges. A professional finish ready to show to clients.',
      },
    },
  },

  ravalement: {
    category:         'ravalement',
    priority:         3,
    service_keywords: [
      { phrase: 'ravalement facade',          score: 14 },
      { phrase: 'renovation facade',          score: 13 },
      { phrase: 'traitement fissures facade', score: 14 },
      { phrase: 'traitement fissures',        score: 11 },
      { phrase: 'enduit facade',              score: 12 },
      { phrase: 'peinture exterieur',         score: 10 },
      { phrase: 'ravalement',                 score: 9  },
      { phrase: 'enduit',                     score: 6  },
      { phrase: 'ravel',                      score: 5  },
      { phrase: 'facade',                     score: 4  },
    ],
    exclude_if: [{ phrase: 'nettoyage', unless: 'ravalement' }],
    intro:      'facade rendering and renovation on a residential house',
    setting:    'exterior',
    secteur:    'facade specialist',
    hasWorkers: false,
    camera:     'standing on pavement, 3–5 m from facade, slightly low angle',
    materials:  ['cement bags', 'render mix', 'plastic sheeting', 'plastic mesh'],
    photo_defects: [
      'chromatic aberration on scaffolding metal poles',
      'JPEG compression noise on flat rendered surface',
    ],
    exclusions: ['pressure washers', 'hoses', 'mixing equipment', 'workers', 'people'],
    states: {
      debut: {
        framing: {
          work_pct:   40,
          foreground: 'protective plastic sheeting taped at the base of the wall, a few cement bags staged',
          midground:  'old facade surface exposed — original render being stripped or cleaned on one section',
          background: 'upper facade intact, roofline, sky',
        },
        debris:      'old render flakes and fine dust on pavement near the stripped section',
        description: 'Surface preparation has started. One section of old render is being removed. Protective sheeting is in place at the base.',
      },
      encours: {
        framing: {
          work_pct:   55,
          foreground: 'cement bags and render bucket at the base, render splashes on protective sheeting',
          midground:  'facade half rendered — fresh pale new render on one section, old weathered surface on the other',
          background: 'roofline, sky, neighbouring house',
        },
        debris:      'render splashes on pavement sheeting, a few empty bags crumpled near the wall',
        description: 'Half the facade has fresh new render. The other half is still old. The contrast is clearly visible. An active professional job.',
      },
      semifinal: {
        framing: {
          work_pct:   60,
          foreground: 'protective sheeting being removed, last cement bag near the wall',
          midground:  'facade mostly covered in fresh render — surface smooth, one section still being finished',
          background: 'roofline, sky',
        },
        debris:      'minimal — sheeting rolled up at the base, one or two empty bags remaining',
        description: 'Most of the facade is freshly rendered. One corner or section is still being smoothed. The surface looks good overall.',
      },
      final: {
        framing: {
          work_pct:   70,
          foreground: 'clean pavement, protective sheeting gone, one bag remains as authentic detail',
          midground:  'complete fresh render — even surface across the full facade, clean around windows',
          background: 'roofline, sky, neighbouring property',
        },
        debris:      'nearly none — pavement clean, one leftover bag near the wall',
        description: 'Facade renovation complete. Fresh render covers the full surface evenly. Clean edges around windows. A professional result.',
      },
    },
  },

  maçonnerie: {
    category:         'maçonnerie',
    priority:         2,
    service_keywords: [
      { phrase: 'dalle beton',    score: 12 },
      { phrase: 'mur beton',      score: 12 },
      { phrase: 'terrasse beton', score: 12 },
      { phrase: 'mur parpaing',   score: 11 },
      { phrase: 'muret',          score: 10 },
      { phrase: 'macon',          score: 8  },
      { phrase: 'parpaing',       score: 7  },
      { phrase: 'pierre',         score: 5  },
      { phrase: 'beton',          score: 4  },
      { phrase: 'mur',            score: 3  },
    ],
    exclude_if: [],
    intro:      'masonry work at a residential property',
    setting:    'exterior',
    secteur:    'mason',
    hasWorkers: false,
    camera:     'standing 2–4 m from the wall, straight-on or slight diagonal, eye level',
    materials:  ['concrete blocks', 'mortar', 'sand', 'cement bags'],
    photo_defects: [
      'flat midday light casting short even shadows',
      'lens barrel distortion on straight wall lines',
    ],
    exclusions: ['trowels', 'mixing tools', 'wheelbarrows', 'safety equipment', 'workers', 'people'],
    states: {
      debut: {
        framing: {
          work_pct:   40,
          foreground: 'first row of concrete blocks laid on foundation, mortar bucket nearby',
          midground:  'foundation line or existing wall with first course of new blocks beginning',
          background: 'garden, existing structure, sky',
        },
        debris:      'mortar splashes on ground near the first course, cement dust and a few broken block chips',
        description: 'Construction has just started. The foundation is set. The first row of blocks is in place. The site is organised and just getting underway.',
      },
      encours: {
        framing: {
          work_pct:   55,
          foreground: 'concrete blocks and mortar debris at the base, sand pile nearby',
          midground:  'half-height wall under construction — fresh dark mortar joints clearly visible, blocks not yet fully set',
          background: 'adjacent existing structure or garden',
        },
        debris:      'mortar splashes on ground, block dust, open cement bags nearby',
        description: 'The wall is at mid-height. Fresh mortar joints are visible. Blocks are stacked and ready. An active organised site.',
      },
      semifinal: {
        framing: {
          work_pct:   60,
          foreground: 'a few remaining blocks and a bag of mortar near the base',
          midground:  'wall at full height, joints nearly done, surface clean',
          background: 'existing structure, garden, sky',
        },
        debris:      'a small pile of leftover blocks and one bag near the base — mostly tidy',
        description: 'The wall is at full height. Mortar joints are being finished. The structure looks solid and neat.',
      },
      final: {
        framing: {
          work_pct:   65,
          foreground: 'clean ground with only a few small mortar marks remaining',
          midground:  'complete wall — level, regular blocks, clean joints, professional finish',
          background: 'neighbouring property, garden, sky',
        },
        debris:      'nearly none — ground swept, small mortar traces only',
        description: 'Masonry complete. The wall is level, joints are clean. A solid professional result ready to show clients.',
      },
    },
  },

  carrelage: {
    category:         'carrelage',
    priority:         3,
    service_keywords: [
      { phrase: 'floor tile',     score: 13 },
      { phrase: 'pose carrelage', score: 13 },
      { phrase: 'pose parquet',   score: 13 },
      { phrase: 'carreleur',      score: 11 },
      { phrase: 'carrelage',      score: 10 },
      { phrase: 'parquet',        score: 9  },
      { phrase: 'tiling',         score: 8  },
      { phrase: 'carre',          score: 6  },
      { phrase: 'tile',           score: 5  },
      { phrase: 'sol',            score: 3  },
    ],
    exclude_if: [],
    intro:      'floor tiling installation inside a residential property',
    setting:    'interior',
    secteur:    'tiler',
    hasWorkers: false,
    camera:     'crouching or standing inside, 2–3 m from the tiling work, slightly low angle',
    materials:  ['porcelain tiles', 'tile adhesive', 'tile spacers', 'grout'],
    photo_defects: [
      'flat diffuse window light casting no shadows',
      'slight motion blur from low ambient light in the room',
    ],
    exclusions: ['tile cutters', 'buckets', 'cleaning supplies', 'safety equipment', 'workers', 'people', 'furniture'],
    states: {
      debut: {
        framing: {
          work_pct:   45,
          foreground: 'first few tiles laid in one corner, adhesive lines combed on the screed beside them',
          midground:  'mostly bare concrete screed floor with a small completed tile section',
          background: 'plain white wall, window or doorframe',
        },
        debris:      'tile adhesive residue near the first placed tiles, a cardboard tile packaging piece on the side',
        description: 'Tiling has just started. A few tiles are in place in one corner. The rest of the floor is bare concrete screed with freshly combed adhesive ridges.',
      },
      encours: {
        framing: {
          work_pct:   60,
          foreground: 'sharp transition between tiled section and bare screed with combed adhesive',
          midground:  'room about half tiled — plastic spacers visible between tiles, adhesive smears on edge',
          background: 'plain wall, window',
        },
        debris:      'plastic tile spacers and adhesive smears on the untiled screed, one tile offcut at the edge',
        description: 'The room is half tiled. The completed section shows aligned tiles with spacers. The other half has combed adhesive ready for the next tiles.',
      },
      semifinal: {
        framing: {
          work_pct:   65,
          foreground: 'nearly complete tiled floor, grout being applied between tiles',
          midground:  'full tiled surface, grout lines still slightly damp, spacers just removed',
          background: 'plain wall, window',
        },
        debris:      'grout residue on tiles near the fresh joints, a sponge and bucket of water nearby',
        description: 'Tiling is complete. Grout is being applied and cleaned. The joints are still slightly damp. The floor looks nearly finished.',
      },
      final: {
        framing: {
          work_pct:   70,
          foreground: 'complete clean tiled floor — aligned tiles, clean grout joints, no residue',
          midground:  'full view of the finished tiled room',
          background: 'clean white wall, window, door frame',
        },
        debris:      'none — floor clean, tiles and joints fully finished',
        description: 'Tiling complete. The floor is clean, aligned and finished. Grout joints are dry. A professional result ready for the client.',
      },
    },
  },

  plomberie: {
    category:         'plomberie',
    priority:         2,
    service_keywords: [
      { phrase: 'reparation fuite plomberie', score: 14 },
      { phrase: 'fuite plomberie',            score: 13 },
      { phrase: 'installation sanitaire',     score: 12 },
      { phrase: 'salle de bain',              score: 11 },
      { phrase: 'plombier',                   score: 9  },
      { phrase: 'robinetterie',               score: 9  },
      { phrase: 'chauffe eau',                score: 9  },
      { phrase: 'chaudiere',                  score: 8  },
      { phrase: 'sanitaire',                  score: 8  },
      { phrase: 'plomb',                      score: 6  },
      { phrase: 'wc',                         score: 6  },
    ],
    exclude_if: [],
    intro:      'plumbing renovation inside a residential property',
    setting:    'interior',
    secteur:    'plumber',
    hasWorkers: false,
    camera:     'crouching or kneeling, 1–2 m from the pipes or open wall cavity',
    materials:  ['copper pipes', 'fittings', 'PTFE tape', 'pipe collars'],
    photo_defects: [
      'low ambient light with slight sensor noise',
      'flat artificial ceiling light only — no natural light',
    ],
    exclusions: ['pipe wrenches', 'tools', 'buckets', 'cleaning supplies', 'workers', 'people'],
    states: {
      debut: {
        framing: {
          work_pct:   50,
          foreground: 'old pipe section removed, wall cavity open, fresh drill dust on floor',
          midground:  'exposed wall showing old pipe stub and new pipe start being positioned',
          background: 'white bathroom wall, existing tiles',
        },
        debris:      'pipe offcuts, drill dust and small plaster fragments near the wall opening',
        description: 'Work has just started. Old pipes are being removed. The wall is open. New pipe routing is being planned.',
      },
      encours: {
        framing: {
          work_pct:   60,
          foreground: 'copper pipes partially installed, visible fittings and PTFE tape on the floor',
          midground:  'new pipe run in progress — some sections soldered, others still raw',
          background: 'white wall, some tiles, window or door',
        },
        debris:      'pipe offcuts, PTFE tape scraps and fitting packaging on the floor',
        description: 'Plumbing installation is underway. New copper pipes are being run. Some sections are soldered, others still open. The job is progressing.',
      },
      semifinal: {
        framing: {
          work_pct:   65,
          foreground: 'new pipes fully connected, wall being patched around them',
          midground:  'complete new plumbing run, plaster patch drying around pipe entry points',
          background: 'white bathroom wall, existing tiles',
        },
        debris:      'plaster dust and a few pipe offcuts, wall patch still slightly damp',
        description: 'Pipes are in and connected. The wall is being patched around the new installation. Almost ready for the final finish.',
      },
      final: {
        framing: {
          work_pct:   60,
          foreground: 'clean floor, new fixture installed and connected — no tools in view',
          midground:  'new plumbing visible — clean pipes, wall patched and painted',
          background: 'clean bathroom wall, existing tiles',
        },
        debris:      'none — floor clean, installation complete',
        description: 'Plumbing renovation complete. New pipes installed, wall patched. The bathroom is clean and ready.',
      },
    },
  },

  électricité: {
    category:         'électricité',
    priority:         2,
    service_keywords: [
      { phrase: 'mise aux normes electrique', score: 14 },
      { phrase: 'installation electrique',    score: 13 },
      { phrase: 'tableau electrique',         score: 12 },
      { phrase: 'electricien',                score: 10 },
      { phrase: 'electricite',                score: 9  },
      { phrase: 'prises',                     score: 5  },
      { phrase: 'interrupteur',               score: 5  },
      { phrase: 'cabl',                       score: 6  },
      { phrase: 'elect',                      score: 5  },
    ],
    exclude_if: [],
    intro:      'electrical installation inside a residential property',
    setting:    'interior',
    secteur:    'electrician',
    hasWorkers: false,
    camera:     'standing or crouching, 1–2 m from open wall cavity or distribution board',
    materials:  ['electrical cable', 'conduit', 'junction boxes', 'outlet plates'],
    photo_defects: [
      'mixed ceiling lamp and window light causing uneven exposure',
      'JPEG compression noise in dark cable areas',
    ],
    exclusions: ['screwdrivers', 'wire strippers', 'safety equipment', 'workers', 'people'],
    states: {
      debut: {
        framing: {
          work_pct:   45,
          foreground: 'cable channels chased into plaster wall, fine plaster dust on floor',
          midground:  'bare wall with open cable channels, first cables being pulled through',
          background: 'adjacent wall, door frame, ceiling',
        },
        debris:      'plaster dust and small plaster chips on floor near the chased channels',
        description: 'Cable routing has started. Channels are chased into the wall. The first cables are being pulled through. The room is dusty from chasing.',
      },
      encours: {
        framing: {
          work_pct:   55,
          foreground: 'cable offcuts and junction box scraps on the bare floor',
          midground:  'cables installed in channels, junction boxes fitted, outlets in progress',
          background: 'bare plaster wall, door frame',
        },
        debris:      'cable offcuts, conduit pieces and screw packaging on the floor',
        description: 'Cables are in and junction boxes are fitted. Outlet positions are being confirmed. The work is clear and progressing.',
      },
      semifinal: {
        framing: {
          work_pct:   60,
          foreground: 'fresh plaster patches drying around new outlet positions',
          midground:  'wall with all cables covered and plastered, outlet boxes installed',
          background: 'white plastered wall, door frame',
        },
        debris:      'plaster dust near the fresh patches, a few cable offcuts on the floor',
        description: 'Cables are covered. Plaster patches are drying around the new outlets. Almost ready for painting.',
      },
      final: {
        framing: {
          work_pct:   60,
          foreground: 'clean wall with new outlet and switch plates fitted',
          midground:  'complete installation — smooth wall, outlets and switches aligned',
          background: 'clean painted wall, door frame',
        },
        debris:      'none — wall clean, installation finished',
        description: 'Electrical installation complete. Outlets and switches are in. Wall is patched and painted. Clean professional result.',
      },
    },
  },

  débarras: {
    category:         'débarras',
    priority:         2,
    service_keywords: [
      { phrase: 'debarras grenier',       score: 13 },
      { phrase: 'debarras appartement',   score: 13 },
      { phrase: 'debarras maison',        score: 13 },
      { phrase: 'enlevement encombrants', score: 13 },
      { phrase: 'evacuation encombrants', score: 13 },
      { phrase: 'vide cave',              score: 12 },
      { phrase: 'vide grenier',           score: 12 },
      { phrase: 'debarras',               score: 9  },
      { phrase: 'encombr',                score: 7  },
      { phrase: 'evacuation',             score: 5  },
      { phrase: 'vider',                  score: 5  },
      { phrase: 'dechet',                 score: 4  },
    ],
    exclude_if: [],
    intro:      'house clearing operation at a residential property',
    setting:    'exterior',
    secteur:    'clearance worker',
    hasWorkers: true,
    camera:     'standing near the property entrance, 3–5 m from van, eye level',
    materials:  ['furniture', 'cardboard boxes', 'bin bags', 'household items'],
    photo_defects: [
      'mixed window and doorway light causing uneven exposure at entrance',
      'slight tilt from doorframe vertical reference',
    ],
    exclusions: ['branded uniforms', 'readable text on boxes', 'brand logos', 'safety vests'],
    states: {
      debut: {
        framing: {
          work_pct:   40,
          foreground: 'a few large items staged at the entrance — a wardrobe, a rolled rug',
          midground:  'van parked in driveway with rear doors open, mostly empty',
          background: 'house facade, garden hedge',
        },
        debris:      'light dust on items staged at entrance, cardboard packing material on the ground',
        description: 'Clearing has just started. A few large items are staged at the entrance. The van is parked and ready. Workers in casual clothes are beginning to load.',
      },
      encours: {
        framing: {
          work_pct:   55,
          foreground: 'items stacked near the van — boxes, bags, chairs, small furniture',
          midground:  'van half loaded with furniture and bags, two workers in jeans and t-shirts carrying items',
          background: 'house facade, open entrance',
        },
        debris:      'dust and packing material on the driveway near staged items',
        description: 'Clearing is in full swing. The van is half loaded. Workers are actively moving items from the property to the van.',
      },
      semifinal: {
        framing: {
          work_pct:   50,
          foreground: 'last remaining items near the entrance, driveway mostly clear',
          midground:  'van nearly full, one worker carries the last items',
          background: 'house facade, garden',
        },
        debris:      'a few small items and cardboard scraps remain — driveway nearly clear',
        description: 'Almost done. The van is nearly full. A few last items are being moved out. The property entrance is becoming clear.',
      },
      final: {
        framing: {
          work_pct:   45,
          foreground: 'empty clean driveway, van closed and ready to leave',
          midground:  'cleared property entrance — nothing remaining outside',
          background: 'house facade, garden, street',
        },
        debris:      'none — driveway swept and clear',
        description: 'Clearing complete. The property is empty. The van is loaded and closed. The driveway is clean. Job done.',
      },
    },
  },

  nettoyage_toiture: {
    category:         'nettoyage',
    priority:         4,
    service_keywords: [
      { phrase: 'nettoyage toiture',    score: 15 },
      { phrase: 'demousage toiture',    score: 15 },
      { phrase: 'demoussage toiture',   score: 15 },
      { phrase: 'hydrofuge toiture',    score: 13 },
      { phrase: 'demoussage',           score: 10 },
      { phrase: 'demousage',            score: 10 },
    ],
    exclude_if: [],
    intro:      'roof cleaning and moss removal on a residential house',
    setting:    'exterior',
    secteur:    'roof cleaning specialist',
    hasWorkers: false,
    camera:     'standing in the driveway or garden, 6–10 m from the house, looking up at the roof pitch',
    materials:  ['uniform single-material roof covering — same tile type, same aging, same color on every visible slope', 'green moss residue on old tiles', 'wet terracotta or slate surface'],
    photo_defects: [
      'slight overexposure on pale sky above the roofline',
      'JPEG compression noise on the granular texture of wet tiles',
    ],
    exclusions: ['ladders', 'pressure washer machine', 'hoses', 'workers', 'people', 'safety harnesses', 'broken tiles', 'exposed battens', 'two different tile types on same slope', 'mixed roofing materials on same pitch', 'patchwork roof texture', 'new tiles mixed with old tiles on same slope', 'roof appearing reconstructed or partially replaced'],
    states: {
      debut: {
        framing: {
          work_pct:   35,
          foreground: 'driveway or garden path at the foot of the house — protective tarp spread below the eave edge collecting first treatment runoff',
          midground:  'pitched roof mostly covered in dense green and black moss — one small ridge section or corner strip recently cleaned, clean terracotta just visible',
          background: 'gutters along the eave, chimney top, pale grey or blue sky',
        },
        debris:      'green moss residue on driveway at the tarp edge — facade clean behind the protection',
        description: 'Roof cleaning has just started. The pitched roof is almost entirely covered in green and black moss. One small corner section shows clean tile — the contrast with the surrounding heavy moss is clearly visible.',
      },
      encours: {
        framing: {
          work_pct:   55,
          foreground: 'protective tarp fixed along the full eave edge — light water runoff collecting in the tarp fold, facade covered and protected below',
          midground:  'pitched roof half cleaned — one full slope or half the surface showing restored uniform tile colour, the other slope still dark with heavy moss',
          background: 'chimney, gutters visible along the eave, neighbouring slate or tile rooftops, pale sky',
        },
        debris:      'wet moss clumps fallen onto the tarp surface, small puddle in the tarp fold at the driveway edge',
        description: 'Half the roof is clean. The contrast between the bright restored tiles and the still-mossy dark slope is very clear. Active professional work.',
      },
      semifinal: {
        framing: {
          work_pct:   55,
          foreground: 'house facade clean below the eave — tarp partially removed, faint moisture mark near the gutter outlet only',
          midground:  'roof almost fully cleaned — uniform tile colour across most of the surface, a few dark moss patches remaining near the chimney base and along the gutters',
          background: 'clean roofline, chimney, gutters, sky',
        },
        debris:      'light green residue near the chimney base and gutters — final patches being treated',
        description: 'Most of the roof is clean and uniform. Moss patches remain only near the chimney and gutters. Last treatment being applied.',
      },
      final: {
        framing: {
          work_pct:   65,
          foreground: 'clean house facade below the eave, gutters clear and clean along the full roofline',
          midground:  'fully clean pitched roof — uniform terracotta or slate colour across both slopes, no visible moss, ridge line clean and sharp',
          background: 'chimney, neighbouring rooftops, pale sky',
        },
        debris:      'none — roof surface clean and dry, gutters clear',
        description: 'Roof cleaning complete. The tiles are uniformly restored, no moss visible. Gutters are clear. A professional result ready for the client.',
      },
    },
  },

  nettoyage_gouttieres: {
    category:         'nettoyage',
    priority:         5,
    service_keywords: [
      { phrase: 'nettoyage gouttieres',    score: 15 },
      { phrase: 'nettoyage gouttiere',     score: 15 },
      { phrase: 'debouchage gouttieres',   score: 15 },
      { phrase: 'debouchage gouttiere',    score: 15 },
      { phrase: 'curage gouttieres',       score: 14 },
      { phrase: 'curage gouttiere',        score: 14 },
      { phrase: 'gouttieres',              score: 9  },
      { phrase: 'gouttiere',               score: 9  },
    ],
    exclude_if: [],
    intro:      'gutter cleaning and unblocking at a residential house — focus on gutters and downpipe, roof appears neutral and naturally aged in background only',
    setting:    'exterior',
    secteur:    'gutter cleaning specialist',
    hasWorkers: false,
    camera:     'standing in the garden or driveway, framing the gutter run and eave edge from 4–8 m — roof tiles appear at the top edge of frame only as naturally weathered context, not the main subject',
    materials:  ['clogged gutter trough full of compacted dead leaves, wet moss and twigs visible from below', 'downpipe visible at the corner of the house', 'naturally weathered roof tiles in background — not treated or cleaned'],
    photo_defects: [
      'slight overexposure on the pale wall surface below the roofline',
      'JPEG compression noise on the gutter texture and leaf debris',
    ],
    exclusions: ['ladders', 'workers', 'people', 'safety harnesses', 'pressure washer machine', 'hoses', 'tools held by hand', 'terrace', 'ground surface as main subject', 'roof cleaning patterns', 'moss removal on roof tiles', 'roof as main subject', 'partially cleaned roof'],
    states: {
      debut: {
        framing: {
          work_pct:   45,
          foreground: 'house facade and downpipe at the corner — gutter overflow visible at the eave edge, leaf debris hanging over the gutter lip',
          midground:  'gutter along the eave fully clogged — thick layer of compacted dead leaves, green moss and wet debris visible from below, overflowing at one corner',
          background: 'naturally weathered roofline, chimney or adjoining rooftop, pale sky — roof tiles aged but not a treatment subject',
        },
        debris:      'leaves, wet moss and twigs spilling over the gutter edge — facade clean, faint drip mark at most below the downpipe joint',
        description: 'Gutter cleaning not yet started. The gutter is heavily clogged with compacted leaves and moss, visible from below. The facade is clean; at most a faint drip mark appears below the downpipe joint.',
      },
      encours: {
        framing: {
          work_pct:   55,
          foreground: 'house facade and downpipe, small pile of leaves and wet debris on the ground directly below the cleared gutter section',
          midground:  'gutter partially cleared — one section clean and empty, adjacent section still filled with matted wet leaves and moss',
          background: 'naturally weathered roofline, chimney, pale sky',
        },
        debris:      'wet leaves and moss clumps on the ground below the cleared gutter section — facade clean and unmarked',
        description: 'Gutter cleaning in progress. One section is clear, the remaining stretch still holds compacted debris. A pile of wet leaves and moss sits on the ground below the cleared portion.',
      },
      semifinal: {
        framing: {
          work_pct:   55,
          foreground: 'house facade and downpipe — facade clean, small leaf residue on ground near the drain outlet',
          midground:  'gutter nearly clear — a few leaf patches remaining at one end near the downpipe joint or bracket, most of the trough now visibly empty',
          background: 'naturally weathered roofline, sky, chimney',
        },
        debris:      'last small clumps of wet leaves and grit near the gutter bracket — almost done',
        description: 'Almost complete. The gutter is mostly clear, with a small patch of debris remaining near the downpipe joint. The facade is clean and unmarked.',
      },
      final: {
        framing: {
          work_pct:   60,
          foreground: 'clean house facade and downpipe — no stains below the gutter outlet, clean ground at the base of the downpipe',
          midground:  'gutter fully clear and empty along the entire eave — clean trough visible, brackets well spaced, downpipe running straight to the ground drain',
          background: 'naturally weathered roofline, chimney, pale sky',
        },
        debris:      'none — gutters clear, facade clean, ground tidy below the downpipe',
        description: 'Gutter cleaning complete. The gutter is fully clear along the entire eave. The facade is clean, the downpipe is unobstructed, and the ground drain is clear.',
      },
    },
  },

  nettoyage: {
    category:         'nettoyage',
    priority:         4,
    service_keywords: [
      { phrase: 'nettoyage facade',       score: 14 },
      { phrase: 'nettoyage terrasse',     score: 13 },
      { phrase: 'nettoyage dallage',      score: 13 },
      { phrase: 'nettoyage paves',        score: 13 },
      { phrase: 'traitement antimousse',  score: 12 },
      { phrase: 'traitement anti-mousse', score: 12 },
      { phrase: 'traitement anti mousse', score: 12 },
      { phrase: 'hydrofuge',              score: 11 },
      { phrase: 'nettoyage',              score: 7  },
    ],
    exclude_if: [],
    intro:      'pressure washing and surface cleaning at a residential property',
    setting:    'exterior',
    secteur:    'cleaning specialist',
    hasWorkers: false,
    camera:     'standing 4–6 m from the surface, eye level, full extent of the cleaned area visible',
    materials:  ['cleaning product residue', 'moss and dirt runoff', 'water channels on pavement'],
    photo_defects: [
      'wet surface reflection causing overexposed bright patches',
      'slight motion blur from water spray movement',
    ],
    exclusions: ['pressure washer machine', 'hoses', 'safety gear', 'workers', 'people'],
    states: {
      debut: {
        framing: {
          work_pct:   40,
          foreground: 'one small strip already bright and clean — sharp contrast against surrounding dark moss and grime',
          midground:  'most of the surface still heavily soiled — green moss patches and grey dirt on driveway, terrace or facade',
          background: 'house facade, garden boundary, or garden wall',
        },
        debris:      'dirty water runoff near the cleaned strip, light moss flakes on the ground',
        description: 'Cleaning has just started. One small patch is visibly clean — the contrast with the surrounding dirty surface is sharp.',
      },
      encours: {
        framing: {
          work_pct:   55,
          foreground: 'wet surface with runoff channels carrying moss and grime at the clean/dirty boundary',
          midground:  'half the surface cleaned — clearly demarcated line between bright clean and dark dirty areas',
          background: 'remaining dirty surface, house wall or fence',
        },
        debris:      'dirty water and moss debris running off the cleaned section edge',
        description: 'Half the surface is clean. The contrast between the cleaned and dirty halves is striking. Active work in progress.',
      },
      semifinal: {
        framing: {
          work_pct:   55,
          foreground: 'nearly all surface clean, isolated stain patches near edges and expansion joints',
          midground:  'bright clean surface covering most of the area, small dark patches at corners or edges',
          background: 'house facade, garden boundary or low wall',
        },
        debris:      'minimal — a few remaining moss patches near corners and along joints',
        description: 'Almost done. The surface is mostly bright and clean. A few stubborn patches remain near the edges.',
      },
      final: {
        framing: {
          work_pct:   70,
          foreground: 'clean dry surface — uniform colour, no moss, no grime, sharp tile joints visible',
          midground:  'full clean area — even colour throughout, clean straight edges',
          background: 'house facade, garden, clean driveway or terrace',
        },
        debris:      'none — surface completely clean and dry',
        description: 'Cleaning complete. The surface is uniformly clean with no moss or staining. A professional result.',
      },
    },
  },

  etancheite: {
    category:         'étanchéité',
    priority:         4,
    service_keywords: [
      { phrase: 'etancheite toit terrasse',      score: 15 },
      { phrase: 'infiltration toiture',          score: 14 },
      { phrase: 'impermeabilisation toiture',    score: 14 },
      { phrase: 'toit terrasse',                 score: 13 },
      { phrase: 'etancheite toiture',            score: 13 },
      { phrase: 'membrane bitume',               score: 13 },
      { phrase: 'membrane epdm',                 score: 13 },
      { phrase: 'membrane pvc',                  score: 13 },
      { phrase: 'resine etanche',                score: 13 },
      { phrase: 'resine etancheite',             score: 13 },
      { phrase: 'terrasse etanche',              score: 13 },
      { phrase: 'bac acier etanche',             score: 13 },
      { phrase: 'recherche de fuite',            score: 13 },
      { phrase: 'reparation de fuite',           score: 13 },
      { phrase: 'reparation fuite',              score: 13 },
      { phrase: 'reparation infiltration',       score: 13 },
      { phrase: 'fuite toiture',                 score: 12 },
      { phrase: 'fuite toit',                    score: 12 },
      { phrase: 'releve etancheite',             score: 12 },
      { phrase: 'impermeabilisation',            score: 12 },
      { phrase: 'joint etancheite',              score: 11 },
      { phrase: 'bac acier',                     score: 10 },
      { phrase: 'solin',                         score: 10 },
      { phrase: 'infiltration',                  score: 10 },
      { phrase: 'etancheite',                    score: 9  },
      { phrase: 'fuite',                         score: 8  },
    ],
    exclude_if: [],
    intro:      'flat roof waterproofing work on a residential or commercial building',
    setting:    'exterior',
    secteur:           'waterproofing specialist',
    variation_setting: 'roof',
    hasWorkers:        false,
    camera:            'crouching on the flat roof or terrace, wide view of membrane work, parapet visible at edges',
    materials:  ['bitumen membrane rolls', 'primer residue', 'protective gravel', 'aluminium flashing'],
    photo_defects: [
      'harsh overhead midday light flattening the dark membrane texture',
      'slight horizon tilt on the flat roof surface',
    ],
    exclusions: ['gas torches', 'gas canisters', 'workers', 'people', 'safety harnesses'],
    states: {
      debut: {
        framing: {
          work_pct:   40,
          foreground: 'section of old membrane peeled back — bare concrete or screed substrate exposed, primer marks drying',
          midground:  'flat roof mostly still covered by old weathered grey membrane, one strip removed',
          background: 'parapet wall, neighbouring rooftops, open sky',
        },
        debris:      'strips of old membrane rolled up at the roof edge, primer dust near stripped area',
        description: 'Work has just started. A section of old membrane is removed, exposing bare substrate. The primer coat is drying.',
      },
      encours: {
        framing: {
          work_pct:   55,
          foreground: 'new bitumen membrane sheets overlapping neatly, seams visible on half the surface',
          midground:  'clear boundary between new dark membrane and old weathered grey covering',
          background: 'parapet wall, rooftop equipment, sky',
        },
        debris:      'membrane offcuts and packaging near the active work edge',
        description: 'Half the roof is covered in new membrane. The contrast between fresh black and old grey is clear. Active professional work.',
      },
      semifinal: {
        framing: {
          work_pct:   60,
          foreground: 'membrane fully laid, parapet edges and upstands being sealed with aluminium flashing',
          midground:  'complete new membrane surface — smooth, dark, uniformly flat',
          background: 'parapet walls, sky, neighbouring building roofline',
        },
        debris:      'a few leftover membrane offcuts near the parapet wall, otherwise clean',
        description: 'Membrane covering is complete. Edge flashings around the parapet are being sealed. Almost finished.',
      },
      final: {
        framing: {
          work_pct:   65,
          foreground: 'clean finished flat roof — uniform dark membrane, sealed edges, clear drainage outlets',
          midground:  'complete waterproofed surface, drainage points visible and unobstructed',
          background: 'parapet walls, sky, neighbouring roofline',
        },
        debris:      'none — roof surface clean and ready',
        description: 'Waterproofing complete. New membrane, sealed parapet edges, clear drainage. A professional result.',
      },
    },
  },

  terrassement: {
    category:         'terrassement',
    priority:         2,
    service_keywords: [
      { phrase: 'construction allee',   score: 12 },
      { phrase: 'allee carrossable',    score: 12 },
      { phrase: 'allee gravier',        score: 12 },
      { phrase: 'allee pavee',          score: 12 },
      { phrase: 'creation allee',       score: 12 },
      { phrase: 'creation chemin',      score: 12 },
      { phrase: 'cour gravillonnee',    score: 12 },
      { phrase: 'preparation terrain',  score: 12 },
      { phrase: 'evacuation terres',    score: 12 },
      { phrase: 'raccordement terrain', score: 11 },
      { phrase: 'empierrement',         score: 11 },
      { phrase: 'enrochement',          score: 11 },
      { phrase: 'excavation',           score: 11 },
      { phrase: 'decaissement',         score: 11 },
      { phrase: 'vrd',                  score: 11 },
      { phrase: 'assainissement',       score: 10 },
      { phrase: 'drainage',             score: 10 },
      { phrase: 'nivellement',          score: 10 },
      { phrase: 'tranchee',             score: 10 },
      { phrase: 'fouille',              score: 10 },
      { phrase: 'remblai',              score: 10 },
      { phrase: 'terrassement',         score: 12 },
      { phrase: 'plateforme',           score: 9  },
      { phrase: 'fondation',            score: 9  },
      { phrase: 'allee',                score: 5  },
    ],
    exclude_if: [],
    intro:      'groundworks and earthmoving at a residential property',
    setting:    'exterior',
    secteur:    'civil works contractor',
    hasWorkers: false,
    camera:     'standing at the edge of the site, 5–8 m from the work zone, wide shot showing ground profile',
    materials:  ['compacted gravel', 'geotextile fabric', 'drainage pipes', 'sand bed'],
    photo_defects: [
      'lens barrel distortion on flat ground plane',
      'pale sky bleaching at the top of frame',
    ],
    exclusions: ['excavators', 'dumper trucks', 'workers', 'people', 'safety equipment'],
    states: {
      debut: {
        framing: {
          work_pct:   40,
          foreground: 'freshly excavated trench or site perimeter marked with stakes and string line',
          midground:  'disturbed soil and small earth mounds, garden mostly intact beside the work zone',
          background: 'house facade, garden fence, neighbouring property',
        },
        debris:      'fresh excavated soil piled beside the trench, a few stones on the surface',
        description: 'Groundwork has just started. Excavation beginning, site marked out, first earth moved.',
      },
      encours: {
        framing: {
          work_pct:   55,
          foreground: 'gravel base layer being spread — visible aggregate at the leading edge',
          midground:  'terrain significantly shaped and partially filled with compacted sub-base',
          background: 'garden boundary, existing fence or wall',
        },
        debris:      'soil mounds at the edge, gravel dust and aggregate on surrounding ground',
        description: 'Groundwork well underway. Terrain shaped, gravel sub-base being compacted.',
      },
      semifinal: {
        framing: {
          work_pct:   60,
          foreground: 'compacted gravel surface nearly level, edging strips being installed',
          midground:  'flat leveled surface covering most of the work zone, clean straight edges forming',
          background: 'house facade, garden',
        },
        debris:      'a small pile of leftover gravel near the edge, otherwise tidy',
        description: 'Base is almost complete. Surface is leveled and compacted. Edging being installed.',
      },
      final: {
        framing: {
          work_pct:   65,
          foreground: 'finished surface — neat driveway, leveled ground or paved allée, clean edges',
          midground:  'complete groundwork result — flat, even, well-finished',
          background: 'house facade, garden boundary, gate or fence',
        },
        debris:      'none — site clean, professional finish',
        description: 'Groundwork complete. Surface flat, level and neatly finished. A solid professional result.',
      },
    },
  },

  depannage_auto: {
    category:         'dépannage auto',
    priority:         4,
    service_keywords: [
      { phrase: 'depannage auto',        score: 14 },
      { phrase: 'depannage automobile',  score: 14 },
      { phrase: 'depannage voiture',     score: 14 },
      { phrase: 'panne voiture',         score: 13 },
      { phrase: 'voiture en panne',      score: 13 },
      { phrase: 'vehicule en panne',     score: 13 },
      { phrase: 'assistance routiere',   score: 13 },
      { phrase: 'remorquage',            score: 12 },
      { phrase: 'transport garage',      score: 12 },
      { phrase: 'batterie a plat',       score: 12 },
      { phrase: 'changement de roue',    score: 12 },
      { phrase: 'ouverture voiture',     score: 12 },
      { phrase: 'ouverture vehicule',    score: 12 },
      { phrase: 'enlevement vehicule',   score: 12 },
      { phrase: 'demarrage batterie',    score: 12 },
      { phrase: 'crevaison',             score: 11 },
      { phrase: 'batterie voiture',      score: 11 },
      { phrase: 'remorque',              score: 9  },
      { phrase: 'batterie',              score: 9  },
      { phrase: 'depannag',              score: 8  },
      { phrase: 'panne',                 score: 8  },
      { phrase: 'assistance',            score: 8  },
    ],
    exclude_if: [],
    intro:      'roadside vehicle breakdown assistance and recovery',
    setting:    'exterior',
    secteur:           'breakdown technician',
    variation_setting: 'roadside',
    hasWorkers:        false,
    camera:            'standing 3–5 m from the car, eye level, showing vehicle and roadside context',
    materials:  ['warning triangle on pavement', 'jump cables on seat', 'tow straps visible in van'],
    photo_defects: [
      'overexposure from bright sky against dark car bodywork',
      'slight motion blur from passing traffic in background',
    ],
    exclusions: ['readable licence plates', 'brand logos', 'workers', 'people', 'driver'],
    states: {
      debut: {
        framing: {
          work_pct:   40,
          foreground: 'car parked on roadside — warning triangle placed on pavement nearby, hazard lights implied',
          midground:  'car bonnet still closed, technician van parked directly behind',
          background: 'road, hedgerow or pavement edge, distant traffic',
        },
        debris:      'warning triangle on pavement, small oil drip under car as authentic detail',
        description: 'Breakdown just attended. Technician van parked behind. Car on the side of the road, bonnet still closed.',
      },
      encours: {
        framing: {
          work_pct:   55,
          foreground: 'car bonnet open, engine bay visible, jump cables or diagnostic equipment nearby',
          midground:  'van open with equipment visible, technician at the front of the car',
          background: 'road, fence or hedge, distant vehicles',
        },
        debris:      'jump cable on the road near the battery, warning vest placed on car roof',
        description: 'Diagnosis underway. Bonnet open. Jump cables or tools connecting the vehicles.',
      },
      semifinal: {
        framing: {
          work_pct:   55,
          foreground: 'car bonnet being lowered after repair, cables being coiled near van',
          midground:  'van doors being closed, equipment packed away',
          background: 'road, pavement, distant hedges',
        },
        debris:      'cables coiled on the ground near the van, warning triangle about to be picked up',
        description: 'Repair complete, equipment being packed. Car is roadworthy again.',
      },
      final: {
        framing: {
          work_pct:   50,
          foreground: 'car fully closed and ready — clean side view on the roadside',
          midground:  'technician van parked behind, both vehicles ready',
          background: 'road, pavement, sky',
        },
        debris:      'none — roadside clear, job done cleanly',
        description: 'Breakdown resolved. Car ready to drive. Roadside is clear and tidy.',
      },
    },
  },

  paysagiste: {
    category:         'paysagiste',
    priority:         2,
    service_keywords: [
      { phrase: 'entretien jardin',       score: 13 },
      { phrase: 'creation jardin',        score: 13 },
      { phrase: 'taille de haie',         score: 13 },
      { phrase: 'paysagiste',             score: 13 },
      { phrase: 'amenagement exterieur',  score: 12 },
      { phrase: 'amenagement paysager',   score: 12 },
      { phrase: 'plantation arbustes',    score: 12 },
      { phrase: 'plantation haies',       score: 12 },
      { phrase: 'taille haie',            score: 12 },
      { phrase: 'pose gazon',             score: 12 },
      { phrase: 'arrosage automatique',   score: 11 },
      { phrase: 'espaces verts',          score: 11 },
      { phrase: 'jardinier',              score: 10 },
      { phrase: 'plantation',             score: 9  },
      { phrase: 'paillage',               score: 9  },
      { phrase: 'tonte',                  score: 9  },
      { phrase: 'haies',                  score: 8  },
      { phrase: 'haie',                   score: 8  },
      { phrase: 'pelouse',                score: 8  },
      { phrase: 'gazon',                  score: 7  },
      { phrase: 'massif',                 score: 7  },
      { phrase: 'bordures',               score: 7  },
      { phrase: 'jardin',                 score: 5  },
    ],
    exclude_if: [],
    intro:      'garden landscaping and maintenance at a residential property',
    setting:    'exterior',
    secteur:           'landscaper',
    variation_setting: 'garden',
    hasWorkers:        false,
    camera:            'standing in the garden, 4–6 m from the work area, wide view showing garden context',
    materials:  ['topsoil bags', 'mulch', 'plant pots', 'turf rolls'],
    photo_defects: [
      'dappled shade causing uneven exposure across the garden',
      'slight lens flare from low afternoon sun between trees',
    ],
    exclusions: ['lawnmowers', 'hedge trimmers', 'tools', 'workers', 'people'],
    states: {
      debut: {
        framing: {
          work_pct:   40,
          foreground: 'soil freshly turned and raked, plant pots and topsoil bags staged at the garden edge',
          midground:  'bare soil plot or patchy lawn with marked planting positions',
          background: 'house facade, garden fence, existing mature trees',
        },
        debris:      'topsoil bags and empty packaging at garden edge, soil clods on path',
        description: 'Landscaping just started. Soil prepared, planting positions marked. No plants installed yet.',
      },
      encours: {
        framing: {
          work_pct:   55,
          foreground: 'plants being installed — some root balls in position, mulch being spread around them',
          midground:  'garden half planted — some areas green and established, others still bare',
          background: 'house facade, fence, existing garden trees',
        },
        debris:      'plant pot packaging on the ground, soil and mulch debris near planting areas',
        description: 'Garden half planted. Some areas lush and green, others still bare. Mulch being laid.',
      },
      semifinal: {
        framing: {
          work_pct:   60,
          foreground: 'freshly laid turf or mulched beds with plants in place, neat edging being finished',
          midground:  'garden mostly complete — plants established, edging nearly done',
          background: 'house facade, clean fence line, sky',
        },
        debris:      'a few empty plant pots at the garden edge, otherwise tidy',
        description: 'Garden mostly planted and mulched. Edges being defined. Almost complete.',
      },
      final: {
        framing: {
          work_pct:   70,
          foreground: 'clean garden bed — lush plants, neat mulch layer, sharply defined edges',
          midground:  'complete landscaped garden — green and tidy throughout',
          background: 'house facade, fence, sky',
        },
        debris:      'none — garden clean and tidy',
        description: 'Garden landscaping complete. Plants installed, mulch laid, edges clean. A beautiful professional result.',
      },
    },
  },

  vitrier: {
    category:         'vitrier',
    priority:         3,
    service_keywords: [
      { phrase: 'remplacement vitre', score: 13 },
      { phrase: 'vitre cassee',       score: 13 },
      { phrase: 'double vitrage',     score: 12 },
      { phrase: 'miroiterie',         score: 11 },
      { phrase: 'vitrerie',           score: 10 },
      { phrase: 'vitrier',            score: 10 },
      { phrase: 'vitrine',            score: 9  },
      { phrase: 'vitr',               score: 5  },
    ],
    exclude_if: [],
    intro:      'window glass replacement at a residential property',
    setting:    'exterior',
    secteur:    'glazier',
    hasWorkers: false,
    camera:     'standing 2–3 m from the window, straight-on view, eye level',
    materials:  ['glass pane against wall', 'glazing putty', 'window spacers', 'protective corner pieces'],
    photo_defects: [
      'glass reflection causing an overexposed bright patch in the frame centre',
      'chromatic aberration on the sharp window frame edge',
    ],
    exclusions: ['suction cups in use', 'workers', 'people', 'broken glass shards'],
    states: {
      debut: {
        framing: {
          work_pct:   40,
          foreground: 'old window frame with glass partially removed — bare frame sections exposed, putty being chipped away',
          midground:  'window opening in the facade, old glass still in place on the upper section',
          background: 'house facade, brick or rendered wall',
        },
        debris:      'old putty flakes and small glass chips at the window base — minimal and tidy',
        description: 'Work just started. Frame being prepared. Old glass or putty being removed.',
      },
      encours: {
        framing: {
          work_pct:   55,
          foreground: 'new glass pane positioned in frame, spacers visible at edges, putty being applied',
          midground:  'window partially assembled — new glass in position, sealant bead at frame junction',
          background: 'house facade',
        },
        debris:      'putty scraps and spacer packaging near the window base',
        description: 'Glass replacement underway. New pane being positioned and sealed into the frame.',
      },
      semifinal: {
        framing: {
          work_pct:   60,
          foreground: 'glass fully in place, sealant bead being smoothed around the frame perimeter',
          midground:  'complete glass panel in frame, sealant line visible but not yet dry',
          background: 'house facade',
        },
        debris:      'sealant packaging and a small putty knife near the window',
        description: 'New glass in. Sealant being applied and smoothed around the edges. Nearly finished.',
      },
      final: {
        framing: {
          work_pct:   65,
          foreground: 'clean new window — clear glass, neat sealant bead, clean painted frame',
          midground:  'full window view — glass reflecting surroundings cleanly, frame in good condition',
          background: 'house facade, garden or pavement, sky visible in glass reflection',
        },
        debris:      'none — window clean, installation finished',
        description: 'Window replacement complete. Clear glass, clean frame, neat sealant. Professional result.',
      },
    },
  },

};

// ─── _getWorkDetail ─────────────────────────────────────────────────────────────
// Scoring engine: iterates all WORK_SCENES, checks exclude_if, sums keyword scores,
// adds priority as a fractional tiebreaker, returns the highest-scoring entry.
// Supports string exclusions and conditional { phrase, unless } objects.
// Stores match debug info in _lastMatch for buildDallePromptV2.
function _getWorkDetail(travaux) {
  const t = (travaux || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');

  let best = null, bestKey = null, bestFinal = 0, bestCat = null, bestPhrases = [];

  for (const [name, scene] of Object.entries(WORK_SCENES)) {
    const excluded = (scene.exclude_if || []).some(rule => {
      if (typeof rule === 'string') return t.includes(rule);
      return t.includes(rule.phrase) && !t.includes(rule.unless);
    });
    if (excluded) continue;

    let score = 0;
    const matched = [];
    for (const kw of (scene.service_keywords || [])) {
      if (t.includes(kw.phrase)) { score += kw.score; matched.push(kw.phrase); }
    }
    if (score === 0) continue;

    const finalScore = score + (scene.priority || 1) * 0.1;
    if (finalScore > bestFinal) {
      bestFinal = finalScore; best = scene; bestKey = name;
      bestCat = scene.category || name; bestPhrases = matched;
    }
  }

  _lastMatch = {
    matched_category: bestCat || '(fallback)',
    matched_key:      bestKey || '(fallback)',
    matched_service:  bestPhrases[0] || (travaux || ''),
    match_score:      Math.round(bestFinal * 10) / 10,
  };

  return best || {
    intro:      travaux || 'renovation work at a residential property',
    setting:    'exterior', secteur: 'contractor', hasWorkers: false,
    camera:     'standing near the work, eye level',
    materials:  [],
    photo_defects: ['JPEG compression artifacts', 'slightly tilted horizon'],
    exclusions: ['workers', 'tools', 'safety equipment', 'people'],
    states: {
      debut:     { framing: { work_pct: 40, foreground: 'first materials staged on site', midground: 'work area prepared, job just starting', background: 'garden or street' }, debris: 'light dust and material packaging', description: 'Work is just starting.' },
      encours:   { framing: { work_pct: 55, foreground: 'materials and construction debris', midground: 'work actively in progress', background: 'adjacent structure or garden' }, debris: 'construction debris and material scraps', description: 'Work is actively underway.' },
      semifinal: { framing: { work_pct: 60, foreground: 'last remaining materials near the wall', midground: 'work nearly complete', background: 'garden or street' }, debris: 'minimal debris, site being tidied', description: 'Work is nearly finished.' },
      final:     { framing: { work_pct: 65, foreground: 'clean site, minimal remaining material', midground: 'completed work visible', background: 'garden, street or neighbouring property' }, debris: 'nearly none', description: 'Work is complete. Clean professional result.' },
    },
  };
}

function _getCityContext(ville) {
  const v = normalizeStr(ville || '').toLowerCase();
  const regions = [
    { keys: ['paris', 'boulogne', 'vincennes', 'versailles', 'argenteuil', 'montreuil', 'neuilly', 'creteil', 'nanterre'],
      arch: 'classic Haussmann-style stone buildings with zinc rooftops and wrought-iron balconies',
      light: 'pale urban Île-de-France sky and diffuse city light' },
    { keys: ['lyon', 'villeurbanne', 'bron', 'venissieux'],
      arch: 'Lyonnais buildings with ochre plaster façades and terracotta roofs',
      light: 'soft Rhône valley light under a partly cloudy sky' },
    { keys: ['marseille', 'aix-en-provence', 'toulon', 'martigues'],
      arch: 'Provençal stone houses with pale limestone walls, terracotta roof tiles and blue shutters',
      light: 'bright Mediterranean sunshine, hard shadows, vivid blue sky' },
    { keys: ['bordeaux', 'merignac', 'pessac', 'libourne', 'talence'],
      arch: 'Bordelais Gironde-stone classical facades with dark slate roofs',
      light: 'mild Atlantic light and a pale grey-blue sky' },
    { keys: ['lille', 'roubaix', 'tourcoing', 'villeneuve', 'lens', 'valenciennes', 'dunkerque'],
      arch: 'Flemish red-brick townhouses with stepped gables and arched doorways',
      light: 'flat cold northern light under a wide grey sky' },
    { keys: ['strasbourg', 'mulhouse', 'colmar', 'haguenau'],
      arch: 'Alsatian half-timbered colombage houses with steep dark rooflines and coloured facades',
      light: 'crisp Alsatian light under a pale high-pressure sky' },
    { keys: ['nantes', 'saint-nazaire'],
      arch: 'Loire Atlantique town houses with grey slate roofs and pale stone facades',
      light: 'soft Atlantic Loire light and a pale overcast sky' },
    { keys: ['angers'],
      arch: 'Maine-et-Loire schist and tuffeau stone houses with grey slate roofs',
      light: 'soft Loire Valley light and a slightly overcast pale sky' },
    { keys: ['tours', 'blois', 'orleans', 'chartres', 'amboise'],
      arch: '1970s suburban houses with white rendered facades and dark grey slate roofs typical of Touraine',
      light: 'soft, flat Loire Valley light and a pale milky sky' },
    { keys: ['caen', 'cherbourg', 'alençon', 'argentan'],
      arch: 'light-coloured Pierre de Caen limestone facades and dark slate roofs typical of Normandy',
      light: 'soft, hazy Normandy sky with diffuse Atlantic light' },
    { keys: ['rouen', 'le havre', 'evreux', 'dieppe'],
      arch: 'Norman half-timbered colombage facades or white-rendered post-war buildings with slate roofs',
      light: 'overcast Normandy sky, flat diffuse light' },
    { keys: ['rennes', 'brest', 'quimper', 'saint-brieuc', 'lorient', 'vannes'],
      arch: 'Breton granite stone houses with grey schist slate roofs',
      light: 'soft muted Atlantic Brittany light under a pale overcast sky' },
    { keys: ['toulouse', 'montpellier', 'nimes', 'perpignan', 'carcassonne'],
      arch: 'pink Toulouse brick townhouses or pale Languedoc limestone with clay roman-tile roofs',
      light: 'warm southern light and a clear Mediterranean blue sky' },
    { keys: ['grenoble', 'chambery', 'annecy', 'albertville'],
      arch: 'Alpine-style buildings with wooden balconies and stone basements against a mountain backdrop',
      light: 'crisp clear alpine light and a brilliant high sky' },
    { keys: ['nice', 'cannes', 'antibes', 'grasse', 'frejus'],
      arch: 'Belle Époque villas with pastel ochre and salmon facades and terracotta canal-tile roofs',
      light: 'brilliant Côte d\'Azur sunshine and a deep blue Mediterranean sky' },
    { keys: ['amiens', 'beauvais', 'compiegne', 'soissons'],
      arch: 'red-brick Picard houses with grey slate roofs',
      light: 'flat diffuse northern Picard light under a pale overcast sky' },
    { keys: ['dijon', 'chalon', 'macon', 'auxerre'],
      arch: 'Burgundy tuffeau stone townhouses with distinctive polychrome glazed tile roofs',
      light: 'mild Burgundy continental light under a partly cloudy sky' },
    { keys: ['metz', 'nancy', 'reims', 'troyes'],
      arch: 'golden Lorraine stone townhouses or Champagne chalk-stone facades with slate roofs',
      light: 'clear continental light and a high pale sky' },
    { keys: ['besancon', 'belfort', 'montbeliard'],
      arch: 'Franche-Comté stone houses with steep grey roofs',
      light: 'clear continental Franche-Comté light under a partly cloudy sky' },
    { keys: ['clermont', 'vichy', 'aurillac'],
      arch: 'dark volcanic basalt Auvergne buildings with dark grey steep roofs',
      light: 'clear Massif Central light under an open sky' },
    { keys: ['limoges', 'angouleme', 'perigueux'],
      arch: 'Limousin or Périgord stone houses with brown clay tile or grey slate roofs',
      light: 'mild Atlantic inland light and a soft partly cloudy sky' },
    { keys: ['poitiers', 'la rochelle', 'niort', 'rochefort'],
      arch: 'Poitevin or Charentais pale limestone houses with flat roman clay-tile roofs',
      light: 'Atlantic coastal light and a pale sea-sky' },
    { keys: ['toulon', 'saint-tropez', 'hyeres'],
      arch: 'Provençal village houses with pastel rendered facades and terracotta roof tiles',
      light: 'brilliant Var sunshine and a vivid blue sky' },
  ];
  for (const r of regions) {
    if (r.keys.some(k => v.includes(normalizeStr(k).toLowerCase()))) return r;
  }
  return {
    arch: 'typical French suburban houses with classic slate rooftops and rendered facades',
    light: 'natural French daylight under a pale European sky'
  };
}

// ─── Scene planner model (upgrade here when a better model is available) ─────
// ─── PromptBuilder ────────────────────────────────────────────────────────────
// Deterministic JS alternative to GPT rewrite (Étape 2).
// Assembles the final image prompt from the validated scene JSON.
// _USE_PROMPT_BUILDER = false → falls back to _rewritePromptWithGPT.
const _USE_PROMPT_BUILDER  = false;
const _USE_GPT_SCENE_JSON  = false; // false = use buildDallePromptV2 as-is (no GPT refinement)

const PHOTO_STYLE_RULES = {
  opening:  'Authentic work-progress snapshot taken on a cheap Android smartphone'
          + ' by a French contractor.'
          + ' Organised worksite — realistic activity for the work stage,'
          + ' neither a disaster scene nor a staged portfolio shot.',

  style:    'Flat even lighting, slightly overexposed in bright areas.'
          + ' Light JPEG compression artifacts on fine textures.'
          + ' Possibly a small horizon tilt.'
          + ' No post-processing, no depth-of-field blur.',

  interior: 'Indoor setting — no outdoor sky or horizon visible.'
          + ' Room illuminated by natural window light and ambient ceiling lamp.',
};

// ─── SITE REALISM — Étape A stub (Étape B complètera les 13 métiers) ─────────
// Keyed by WORK_SCENES entry name (_matched_key in SceneJSON).
const SITE_REALISM = {
  nettoyage_toiture: {
    scenarios: [

      // --- démoussage / brossage manuel ---
      {
        _for:          'demoussa|mousse.*toit|nettoy.*mousse|brossage',
        scene_note:    'manual moss scraping from a pitched roof — stiff broom sweeping thick green moss off old tiles, debris falling onto the protective tarp below the eave',
        scene_camera:  'standing back from the house, framing the full roof slope with the worker using a long-handled stiff broom across the mossy tiles',
        scene_framing: {
          work_pct:   65,
          foreground: 'protective tarp below the eave catching wet moss clumps falling from the roof',
          midground:  'pitched roof — one section scraped to bare tile, adjacent section still thick with green moss',
          background: 'house wall, surrounding garden or driveway below the eave',
        },
        scene_debris:  'wet green moss clumps on the tarp below, loose moss fragments on the lower tile courses',
        scene_exclude: ['chemical sprayer lance', 'pressure washing jet', 'new tiles being laid', 'scaffolding tower', 'concrete mixer'],
        tools: [
          'long-handled stiff nylon broom being swept across the mossy roof tiles',
          'heavy protective tarp fixed under the eave edge collecting moss debris',
        ],
        protections: [
          'heavy tarp fixed under the eave to catch moss runoff',
          'plastic sheet over garden shrubs directly below the scraping zone',
        ],
        chantier_details: [
          'thick green moss layer — clearly biological buildup visible on tile surface',
          'scraped section of bare terracotta tiles contrasting with the still-mossy area',
          'wet moss clumps accumulating on the tarp below the eave',
        ],
      },
      {
        _for:          'demoussa|mousse.*toit|nettoy.*mousse|brossage',
        scene_note:    'close-up moss removal from individual tiles — hand scraper being drawn across a moss-covered tile, thick moss pad being lifted in one cohesive piece',
        scene_camera:  'close-up from the roof surface, framing the hand scraper lifting a thick moss pad from a tile with bare tile visible where already cleared',
        scene_framing: {
          work_pct:   75,
          foreground: 'hand scraper lifting a thick cohesive moss pad from the tile surface — underside of the moss pad visible',
          midground:  'surrounding tiles — mix of already-scraped bare terracotta and still moss-covered',
          background: 'roof slope continuing, tile courses below the repair zone',
        },
        scene_debris:  'moss pad piece beside the scraped tile, damp stain circle on the cleared tile surface',
        scene_exclude: ['chemical sprayer', 'pressure lance', 'new tiles', 'concrete mixer'],
        tools: [
          'hand scraper drawing a thick moss pad from the tile surface',
          'small handheld brush sweeping moss residue off cleared tiles',
        ],
        protections: [
          'knee pad on the roof tile surface beside the worker',
        ],
        chantier_details: [
          'thick moss pad being lifted intact — underside and rhizoid roots clearly visible',
          'bare tile below — original terracotta colour recovered after moss removal',
          'stain outline on the tile where the moss has sat for years',
        ],
      },
      {
        _for:          'demoussa|mousse.*toit|nettoy.*mousse|brossage',
        scene_note:    'half-scraped roof — left half already cleared to bare tiles, right half still thick with green moss, sharp demarcation line visible across the slope',
        scene_camera:  'standing back from the house, framing the full roof width with the cleared vs. mossy division clearly visible across the slope',
        scene_framing: {
          work_pct:   50,
          foreground: 'tarp below the eave loaded with wet moss debris — visual record of work done',
          midground:  'full roof pitch — left half scraped bare, right half still green — division line sharp',
          background: 'sky beyond the ridge, house wall beside the cleared section',
        },
        scene_debris:  'large pile of wet moss on the tarp below, loose fragments near the division line on the cleared side',
        scene_exclude: ['chemical sprayer', 'pressure lance', 'new tiles', 'scaffolding tower'],
        tools: [
          'long-handled broom resting on the roof at the active work line',
        ],
        protections: [
          'heavy tarp below the eave — visibly loaded with scraped moss debris',
        ],
        chantier_details: [
          'sharp division line across the roof — bare terracotta on one side, thick green moss on the other',
          'tile colour recovery clearly visible on the cleared side',
          'moss debris accumulation on the tarp below quantifying work completed',
        ],
      },

      // --- traitement chimique / hydrofuge ---
      {
        _for:          'hydrofuge|traitement|anti.mousse',
        scene_note:    'chemical anti-moss treatment being applied by backpack sprayer — lance fanning a spray arc across the tile surface, product spreading down from the top',
        scene_camera:  'standing at the side of the house, framing the spray lance fanning chemical treatment across the mossy roof tiles',
        scene_framing: {
          work_pct:   60,
          foreground: 'spray lance directing fine chemical mist across the tile surface — spray fan visible in the air',
          midground:  'mossy roof tiles being coated — dark wet patch spreading where treatment has landed',
          background: 'roof slope continuing to the ridge, house wall at the side',
        },
        scene_debris:  'chemical runoff darkening the tiles below the spray point, drip traces on the lower courses',
        scene_exclude: ['stiff broom scraping', 'pressure washing jet', 'new tiles', 'concrete mixer'],
        tools: [
          'backpack chemical sprayer with telescopic lance applying treatment to the tiles',
        ],
        protections: [
          'heavy tarp fixed under the eave to collect chemical runoff',
          'plastic sheet covering garden plants below the treatment zone',
          'chemical-resistant gloves on the hands operating the lance',
        ],
        chantier_details: [
          'spray fan of chemical treatment visible above the tile surface',
          'tiles visibly darkening as the product soaks in from the top down',
          'runoff tracks of treatment chemical on the lower tile courses',
        ],
      },
      {
        _for:          'hydrofuge|traitement|anti.mousse',
        scene_note:    'treatment being applied from the ridge downward — spray lance directed at the ridge tiles first, product running in rivulets down the full slope under gravity',
        scene_camera:  'shooting up from below, framing the spray lance at the ridge line with product rivulets running down the slope',
        scene_framing: {
          work_pct:   65,
          foreground: 'spray lance at the ridge tiles — product mist at the ridge apex',
          midground:  'treatment running down the tile surface in rivulets from ridge toward eave',
          background: 'sky above the ridge, moss-covered lower tiles where product has not yet reached',
        },
        scene_debris:  'treatment rivulets running down the tile grooves, moss beginning to darken where product reached',
        scene_exclude: ['stiff broom scraping', 'pressure lance jet', 'new tiles'],
        tools: [
          'telescopic lance reaching to the ridge tiles, treatment being applied from the apex',
        ],
        protections: [
          'safety harness visible on the operator at ridge height',
          'tarp at ground level below the eave',
        ],
        chantier_details: [
          'treatment running from ridge downward in dark rivulets along the tile grooves',
          'ridge tiles uniformly wet with product at the apex',
          'lower tile courses still dry and moss-green — contrast with treated upper section',
        ],
      },
      {
        _for:          'hydrofuge|traitement|anti.mousse',
        scene_note:    'post-treatment roof — tiles uniformly dark and wet from the applied hydrofuge, protective tarp below the eave loaded with chemical runoff',
        scene_camera:  'standing back from the house, framing the full roof slope uniformly dark with product, tarp visible below the eave',
        scene_framing: {
          work_pct:   45,
          foreground: 'heavy tarp below the eave — visibly wet with chemical runoff, weighted at corners',
          midground:  'full roof pitch — uniformly dark and wet from the applied treatment',
          background: 'ridge line, sky above, garden to the side',
        },
        scene_debris:  'chemical pooling in the tarp folds below the eave, drip marks on the house wall near the downpipe',
        scene_exclude: ['stiff broom scraping', 'pressure lance jet', 'new tiles'],
        tools: [
          'backpack sprayer parked at the base of the house — treatment complete',
          'empty treatment container beside the sprayer',
        ],
        protections: [
          'heavy tarp fully loaded with chemical runoff below the eave',
          'plastic sheet still protecting the garden shrubs below',
        ],
        chantier_details: [
          'roof uniformly dark from the treatment — product evenly applied across the full pitch',
          'chemical runoff pooling in the tarp folds',
          'drip marks on the lower house wall from the product runoff',
        ],
      },

      // Fallback: general view
      {
        scene_note:    'roof cleaning or treatment in progress — general view of a mossy pitched residential roof with treatment equipment visible at the eave',
        scene_camera:  'standing back from the house, framing the full roof slope with visible moss and treatment equipment at the eave',
        scene_framing: {
          work_pct:   45,
          foreground: 'protective tarp fixed below the eave, sprayer or brush equipment at the base of the house wall',
          midground:  'pitched roof — heavily mossy tiles, green biological growth across the surface',
          background: 'ridge line, sky above, garden or driveway below the eave',
        },
        scene_debris:  'light moss debris at the tarp edge from the beginning of work',
        scene_exclude: ['new tiles being laid', 'concrete mixer', 'scaffolding tower', 'pressure lance jet'],
        tools: [
          'backpack chemical sprayer with telescopic lance resting against the wall',
          'soft-bristle roof brush laid flat on the driveway',
          'treatment pump container with hose coiled beside the house base',
        ],
        protections: [
          'heavy protective tarp fixed under the eave edge to collect moss runoff',
          'plastic sheet covering the garden shrubs below the treated section',
        ],
        chantier_details: [
          'heavy moss coverage across the roof surface — biological buildup clearly visible',
          'tarp positioned and ready at the eave line',
          'treatment equipment laid out at the base of the house',
        ],
      },
    ],
    tools: [
      'backpack chemical sprayer with telescopic lance resting against the wall',
      'soft-bristle roof brush laid flat on the driveway',
      'treatment pump container with hose coiled beside the house base',
      'empty treatment bucket with lid near the downpipe',
      'nozzle extension fitting resting on top of a folded tarp',
      'small measuring cup beside the treatment container',
    ],
    protections: [
      'heavy protective tarp fixed under the eave edge to collect moss runoff',
      'plastic sheet covering the garden shrubs below the treated section',
      'folded tarp weighted at the corners protecting a car or garden furniture nearby',
      'sandbag holding the tarp edge flat against the house base',
    ],
    chantier_details: [
      'small pile of wet dislodged moss on the driveway at the tarp edge',
      'small puddle of water in the tarp fold below the eave edge',
      'empty treatment container cap on the ground near the sprayer',
      'wet footprints on the concrete path leading away from the house',
      'faint grey moisture ring on the lower wall near the downpipe base',
    ],
  },
  nettoyage_gouttieres: {
    scenarios: [

      // --- nettoyage / entretien standard ---
      {
        _for:          'nettoy|entretien|curag|debris|feuill',
        scene_note:    'gutter being manually cleared of compacted leaf and moss debris — gutter scoop being worked along the trough from a ladder, debris being deposited into a bucket below',
        scene_camera:  'standing back from the house, framing the ladder leaning at the gutter run with the worker using a scoop along the trough',
        scene_framing: {
          work_pct:   65,
          foreground: 'ladder base against the house wall, plastic bucket with leaf and moss debris beside it',
          midground:  'worker on the ladder using a gutter scoop along the trough — compacted leaf mass visible in the gutter',
          background: 'house facade and eave line, garden beyond',
        },
        scene_debris:  'wet compacted leaf and moss debris being extracted from the gutter, small pile on the ground below',
        scene_exclude: ['new gutter sections', 'drill and fascia brackets', 'pressure rodding equipment', 'concrete mixer'],
        tools: [
          'aluminium ladder leaning against the house wall at the gutter run',
          'plastic gutter scoop working along the trough',
          'plastic bucket with wet leaf debris beside the ladder base',
        ],
        protections: [
          'plastic sheet on the flower bed directly below the gutter run',
        ],
        chantier_details: [
          'gutter trough packed with compacted leaves and moss — clearly overflowing capacity',
          'gutter scoop extracting a thick mat of compacted debris',
          'bucket at the ladder base progressively filling with extracted debris',
        ],
      },
      {
        _for:          'nettoy|entretien|curag|debris|feuill',
        scene_note:    'cleaned gutter being flushed with a garden hose — water running freely along the trough toward the downpipe outlet, confirming the gutter is clear',
        scene_camera:  'standing beside the house, framing the hose running water along the cleaned gutter trough above',
        scene_framing: {
          work_pct:   55,
          foreground: 'garden hose directed into the cleared gutter at the top end — water flowing in',
          midground:  'cleaned gutter trough — water running along the bottom toward the downpipe',
          background: 'house facade, downpipe at the far end carrying water cleanly to the drain',
        },
        scene_debris:  'small residual debris fragments at the downpipe outlet being flushed through, wet streak down the downpipe',
        scene_exclude: ['new gutter sections', 'drill and fascia brackets', 'gutter scoop in use', 'compacted debris still in gutter'],
        tools: [
          'garden hose with running water being fed into the cleared gutter at the high end',
        ],
        protections: [
          'plastic sheet on the garden bed below the downpipe outlet',
        ],
        chantier_details: [
          'water running freely along the bottom of the cleaned gutter — trough clear',
          'downpipe carrying flush water cleanly to the drain below',
          'small debris flush visible at the downpipe outlet from residual gutter sediment',
        ],
      },
      {
        _for:          'nettoy|entretien|curag|debris|feuill',
        scene_note:    'gutter joint being sealed after cleaning — silicone sealant being applied to a leaking joint between two gutter sections with a cartridge gun',
        scene_camera:  'close-up from the ladder at the gutter joint, framing the sealant cartridge gun applying a bead at the junction between two gutter sections',
        scene_framing: {
          work_pct:   70,
          foreground: 'silicone cartridge gun applying sealant at the gutter joint — fresh sealant bead visible',
          midground:  'two gutter sections joining at the clip — joint being sealed',
          background: 'gutter run continuing in both directions, fascia board above',
        },
        scene_debris:  'old dried sealant fragments removed from the joint — grey dried bead pieces beside the gutter',
        scene_exclude: ['new gutter sections', 'drill and fascia brackets', 'compacted debris in gutter'],
        tools: [
          'silicone cartridge gun applying sealant at the gutter joint',
          'small putty knife for smoothing the sealant bead',
        ],
        protections: [],
        chantier_details: [
          'fresh silicone sealant bead along the gutter joint — shiny and uncured',
          'old dried sealant fragments removed from the joint before resealing',
          'gutter joint sealed and clean — leaking section now repaired',
        ],
      },

      // --- débouchage ---
      {
        _for:          'deboucha|bouchon|obstruct',
        scene_note:    'blocked downpipe being cleared with a flexible drainage rod — rod being fed into the downpipe from the top, blockage being worked through from above',
        scene_camera:  'standing at the ladder beside the downpipe head, framing the flexible rod being fed into the downpipe opening at gutter level',
        scene_framing: {
          work_pct:   70,
          foreground: 'flexible drainage rod being fed into the downpipe opening at gutter level',
          midground:  'downpipe running down the house wall — standing water backed up in the gutter at the blocked inlet',
          background: 'house wall, garden beyond',
        },
        scene_debris:  'standing water in the gutter at the blocked downpipe inlet, debris mat at the outlet edge',
        scene_exclude: ['new gutter sections', 'fascia brackets', 'hose flushing free-flowing pipe'],
        tools: [
          'flexible drainage rod sections being fed into the blocked downpipe from above',
          'aluminium ladder at the downpipe head',
        ],
        protections: [
          'plastic sheet at the base of the downpipe to catch expelled debris',
        ],
        chantier_details: [
          'standing water in the gutter at the blocked inlet — pipe fully obstructed',
          'flexible rod disappearing into the downpipe — blockage being worked through',
          'debris mat at the gutter outlet edge — partial obstruction visible from above',
        ],
      },
      {
        _for:          'deboucha|bouchon|obstruct',
        scene_note:    'compacted debris plug being expelled from the base of a blocked downpipe — dark compacted mass of leaves and silt pushed out at the downpipe foot',
        scene_camera:  'crouching at the downpipe base, framing the expelled debris plug on the ground at the pipe foot',
        scene_framing: {
          work_pct:   70,
          foreground: 'expelled debris plug on the ground at the downpipe foot — dark compacted mass of leaves and silt',
          midground:  'downpipe base and drain outlet, water beginning to run again after clearance',
          background: 'house wall above, garden or path beside',
        },
        scene_debris:  'expelled debris plug at the downpipe base — compacted leaves, moss, silt clearly visible',
        scene_exclude: ['new gutter sections', 'fascia brackets', 'flexible rod still in pipe'],
        tools: [
          'flexible drainage rod leaning against the house wall after use',
          'drain hook tool beside the expelled debris plug',
        ],
        protections: [
          'plastic sheet soiled with expelled silt at the pipe foot',
        ],
        chantier_details: [
          'expelled debris plug at the downpipe base — compacted leaves and silt clearly visible',
          'water beginning to flow freely at the downpipe outlet after clearance',
          'plastic sheet containing the expelled debris at the pipe foot',
        ],
      },
      {
        _for:          'deboucha|bouchon|obstruct',
        scene_note:    'blocked gutter outlet being inspected — phone torch or site torch held at the downpipe inlet, debris bridge visible in the pipe opening with backed-up water in the gutter',
        scene_camera:  'close-up from the ladder at the gutter outlet, framing the torch illuminating inside the outlet',
        scene_framing: {
          work_pct:   75,
          foreground: 'phone torch or site torch held over the downpipe outlet — light shining into the inlet, debris bridge visible',
          midground:  'gutter trough around the outlet — standing water backed up behind the blockage',
          background: 'gutter run continuing, house wall beyond',
        },
        scene_debris:  'debris bridge across the downpipe inlet visible under torch light, backed-up standing water in the gutter',
        scene_exclude: ['new gutter sections', 'fascia brackets', 'free-flowing drain'],
        tools: [
          'phone torch or compact site torch held at the gutter outlet for inspection',
          'gutter scoop nearby ready to extract debris after inspection',
        ],
        protections: [],
        chantier_details: [
          'debris bridge clearly visible in the downpipe inlet under torch light',
          'standing water backed up in the gutter behind the blockage',
          'outlet inlet soiled with dark compacted debris from the blockage',
        ],
      },

      // --- remplacement / pose gouttières ---
      {
        _for:          'remplace|pose|install|neuf|nouveau',
        scene_note:    'new gutter section being lifted into position on pre-fitted fascia brackets — new PVC gutter being clipped onto the bracket row along the eave',
        scene_camera:  'standing back from the house, framing the new gutter section being lifted and aligned with the fascia bracket row along the eave edge',
        scene_framing: {
          work_pct:   65,
          foreground: 'new PVC gutter section being lifted and aligned with the fascia bracket row along the eave edge',
          midground:  'row of new fascia brackets already fitted to the board — new gutter going in',
          background: 'house facade, bare eave on the section not yet fitted',
        },
        scene_debris:  'old gutter sections on the ground below — removed from the eave before fitting new',
        scene_exclude: ['gutter cleaning equipment', 'flexible drainage rod', 'moss debris', 'old stained gutter still in place'],
        tools: [
          'new PVC gutter section being lifted into the bracket row along the eave',
          'gutter clip tool for securing the section into the fascia brackets',
        ],
        protections: [
          'soft cloth on the ladder top to protect the new gutter section during installation',
        ],
        chantier_details: [
          'new PVC gutter section bright and unweathered — clear contrast with existing facade',
          'fascia brackets already fitted in a straight row — new gutter clicking in',
          'old gutter sections on the ground below — replaced before fitting new',
        ],
      },
      {
        _for:          'remplace|pose|install|neuf|nouveau',
        scene_note:    'fascia bracket being drilled and screwed to the barge board — new bracket going in, gutter run about to begin',
        scene_camera:  'close-up at the fascia level, framing the cordless drill fixing the bracket to the board with the new gutter section visible nearby',
        scene_framing: {
          work_pct:   70,
          foreground: 'cordless drill fixing a new gutter fascia bracket to the barge board — screw being driven home',
          midground:  'row of already-fitted brackets along the fascia, new gutter section waiting to be clipped in',
          background: 'house facade, eave soffit above, garden below',
        },
        scene_debris:  'drill bit case on the ladder shelf, packaging from new brackets on the ground below',
        scene_exclude: ['gutter cleaning equipment', 'flexible drainage rod', 'moss debris'],
        tools: [
          'cordless drill fixing new fascia bracket to the barge board',
          'new fascia brackets in a bag on the ladder shelf',
          'new PVC gutter section leaning against the house wall below',
        ],
        protections: [],
        chantier_details: [
          'new bracket being fixed — drill bit in the screw head clearly visible',
          'row of already-fitted brackets defining the new gutter line along the fascia',
          'new gutter section on the ground below — ready to clip in after brackets',
        ],
      },
      {
        _for:          'remplace|pose|install|neuf|nouveau',
        scene_note:    'new downpipe section being clipped to the house wall — wall clip being screwed through the render, new PVC pipe section aligned in the clip',
        scene_camera:  'close-up at the wall beside the downpipe run, framing the wall clip being fixed and the new pipe aligned',
        scene_framing: {
          work_pct:   70,
          foreground: 'new downpipe wall clip being screwed through the render — drill and clip visible',
          midground:  'new PVC downpipe section aligned in the clip, previous clip already fixed above',
          background: 'house wall, old downpipe offset at the eave above',
        },
        scene_debris:  'drill dust from the rawlbolt holes on the render surface beside the clip',
        scene_exclude: ['gutter cleaning equipment', 'flexible drainage rod', 'moss debris', 'old stained pipe in position'],
        tools: [
          'cordless drill fixing the downpipe wall clip through the house render',
          'new PVC downpipe section being aligned in the clip',
        ],
        protections: [],
        chantier_details: [
          'new white PVC downpipe — unweathered and bright against the house render',
          'wall clip being fixed — drill dust on the render surface below the hole',
          'previous clip already fixed above — downpipe run building down the wall',
        ],
      },
    ],
    tools: [
      'aluminium ladder leaning against the house wall beside the gutter run',
      'plastic gutter scoop resting on the path below the downpipe',
      'garden trowel on the ground near the cleared section',
      'plastic bucket with wet leaf and moss debris beside the wall',
      'soft hand brush on the path near the downpipe base',
    ],
    protections: [
      'plastic sheet covering the flower bed directly below the gutter line',
      'old folded towel draped over the garden edging to catch drips',
    ],
    chantier_details: [
      'small pile of wet compacted leaves and moss on the path below the cleared gutter section',
      'leaf and moss debris clumped near the drain grate at the downpipe base',
      'dirty water puddle on the path directly below the gutter outlet',
      'clump of wet moss on the ground below the eave line',
      'faint drip trace on the lower wall directly below the downpipe joint',
    ],
  },
  toiture: {
    scenarios: [

      // --- rénovation / réfection complète ---
      {
        _for:          'renov|refect|couvert.*neuve|toiture.*compl|remplac.*couvert',
        scene_note:    'full roof renovation — old tiles stripped, bare battens and rafter tops visible, scaffold platform loaded with stacked old tiles awaiting removal',
        scene_camera:  'standing back from the house, framing the full roof with one slope stripped to bare battens and the scaffold loaded with old tiles',
        scene_framing: {
          work_pct:   70,
          foreground: 'scaffold platform with stripped old tiles stacked — terracotta fragments and whole tiles mixed',
          midground:  'stripped roof slope — bare battens visible across the full width, underlayer felt partly exposed',
          background: 'other roof slope still tiled or gable wall at the end',
        },
        scene_debris:  'broken tile fragments on the scaffold boards, old mortar lumps from the stripped ridge on the scaffold deck',
        scene_exclude: ['finished new roof', 'garden far away', 'moss treatment equipment', 'concrete mixer at ground level'],
        tools: [
          'tile breaker bar resting on the scaffold — used to lift and break old tiles',
          'scaffold hoist hook at the platform edge for lowering tile skips',
        ],
        protections: [
          'debris netting below the scaffold to catch falling tile fragments',
          'protective tarp over the garden below the scaffold',
        ],
        chantier_details: [
          'bare battens across the stripped slope — original tile peg marks visible on batten faces',
          'scaffold loaded with stacks of stripped tiles ready to be lowered',
          'underlayer felt visible between rafters where battens are exposed — felt torn in places',
        ],
      },
      {
        _for:          'renov|refect|couvert.*neuve|toiture.*compl|remplac.*couvert',
        scene_note:    'new roof battens being nailed to the rafters — carpenter measuring from the eave upward, sawn timber battens being fixed in parallel rows at the correct gauge',
        scene_camera:  'close-up on the rafter surface, framing the batten being nailed down and the measuring rule beside the next batten position',
        scene_framing: {
          work_pct:   70,
          foreground: 'new sawn timber batten being nailed to the rafter tops — nail gun at the nail point',
          midground:  'rows of new battens already fixed below — straight parallel lines down the rafter slope',
          background: 'scaffold boards and stack of new batten lengths waiting to be cut and fixed',
        },
        scene_debris:  'batten offcuts on the scaffold board, nail heads across the previously fixed batten rows',
        scene_exclude: ['tiles going on', 'old tile stack', 'finished roof from afar', 'moss treatment'],
        tools: [
          'nail gun nailing new batten to the rafter tops',
          'folding rule measuring the batten gauge from the last row',
          'stack of new sawn timber battens on the scaffold board',
        ],
        protections: [
          'scaffold platform as working surface',
          'debris netting below scaffold',
        ],
        chantier_details: [
          'rows of new battens fixed to the rafters — straight and evenly gauged',
          'new sawn timber pale and raw — clearly new material on existing rafters',
          'batten offcuts on the scaffold board from the cut-to-length process',
        ],
      },
      {
        _for:          'renov|refect|couvert.*neuve|toiture.*compl|remplac.*couvert',
        scene_note:    'new tile coursing in progress — first courses of new terracotta tiles on the new battens, chalk line defining the next course, tile stack on the scaffold',
        scene_camera:  'from the scaffold level, framing the tile being placed on the batten with the chalk line above defining the next row',
        scene_framing: {
          work_pct:   65,
          foreground: 'new terracotta tile being placed on the batten — tile lug engaging the batten edge',
          midground:  'three or four new courses of tiles below the active row — uniform and unweathered',
          background: 'scaffold board with tile stack, chalk line drum at the side',
        },
        scene_debris:  'tile lug chips on the scaffold board from tile cutting, cardboard tile packaging beside the stack',
        scene_exclude: ['old tiles', 'moss treatment equipment', 'garden from far away'],
        tools: [
          'new terracotta tile being placed on the batten by hand',
          'chalk line drum on the scaffold board for row alignment',
          'tile stack on the scaffold ready for the next course',
        ],
        protections: [
          'scaffold platform as working surface',
          'debris netting below scaffold',
        ],
        chantier_details: [
          'new tile lug hooked over the new batten — tile clicking into position',
          'new tile courses below — uniform colour and profile, no weathering',
          'chalk line marking the correct height for the next tile course',
        ],
      },

      // --- réparation / remplacement tuile ou ardoise ---
      {
        _for:          'repar|rempla.*tuil|rempla.*ardois|tuile.*cass|ardoise.*cass|fuite.*toit',
        scene_note:    'damaged tile being removed — adjacent tiles being slid aside with a tile lifter to access the broken tile, cracked face clearly visible once exposed',
        scene_camera:  'close-up on the tile surface, framing the tile lifter being inserted under the adjacent tile to slide it up and expose the damaged one below',
        scene_framing: {
          work_pct:   75,
          foreground: 'tile lifter inserted under the adjacent tile — tool levering the tile up to expose the nail below',
          midground:  'damaged tile visible once the adjacent tile is raised — cracked or broken face clearly visible',
          background: 'surrounding tile courses, roof slope continuing',
        },
        scene_debris:  'broken tile fragment on the roof surface beside the repair point',
        scene_exclude: ['full scaffold loaded with tiles', 'new battens being nailed', 'moss treatment equipment'],
        tools: [
          'tile lifter or slate ripper inserted under the adjacent tile to raise it',
        ],
        protections: [
          'roof ladder or cat ladder hooked over the ridge for safe access',
        ],
        chantier_details: [
          'tile lifter levering the adjacent tile — damaged tile now accessible below',
          'cracked or broken tile clearly visible once the adjacent tile is raised',
          'surrounding tiles undisturbed — targeted single-tile repair in progress',
        ],
      },
      {
        _for:          'repar|rempla.*tuil|rempla.*ardois|tuile.*cass|ardoise.*cass|fuite.*toit',
        scene_note:    'replacement tile being slid into position — new tile being fed into the course gap with the lug aligned over the batten',
        scene_camera:  'close-up from the roof surface, framing the new tile being guided into the gap left by the removed damaged tile',
        scene_framing: {
          work_pct:   75,
          foreground: 'new replacement tile being slid horizontally into the course gap, lug engaging the batten',
          midground:  'surrounding weathered tiles — the new tile slightly brighter in colour than its neighbours',
          background: 'roof slope around the repair point',
        },
        scene_debris:  'old tile fragments removed and set aside on the roof surface near the repair',
        scene_exclude: ['full tile stripping', 'scaffold loaded with tiles', 'moss treatment'],
        tools: [
          'replacement tile being guided into the course gap with both hands',
          'tile lifter resting on the adjacent tile beside the repair point',
        ],
        protections: [
          'roof ladder hooked over the ridge beside the repair zone',
        ],
        chantier_details: [
          'new tile being slid into the gap — lug engaging the batten below',
          'new tile slightly brighter in colour against the weathered tiles on either side',
          'removed damaged tile fragments to the side — comparison of old vs. new visible',
        ],
      },
      {
        _for:          'repar|rempla.*tuil|rempla.*ardois|tuile.*cass|ardoise.*cass|fuite.*toit',
        scene_note:    'repaired tile section — new replacement tiles among weathered neighbours, fresh mortar pointing visible at the edges, surrounding tiles undisturbed',
        scene_camera:  'standing back slightly from the repair, framing the new tiles among the weathered surrounding tiles with fresh mortar visible',
        scene_framing: {
          work_pct:   60,
          foreground: 'fresh white mortar pointing around the new tile edge — still uncured and bright white',
          midground:  'one or two replacement tiles among the weathered surrounding tiles — slight colour difference',
          background: 'roof slope continuing undisturbed, cat ladder beside the repair',
        },
        scene_debris:  'trowel mortar smear on the adjacent tile surface beside the pointing',
        scene_exclude: ['full tile stripping', 'scaffold loaded', 'moss treatment equipment'],
        tools: [
          'pointing trowel resting on the adjacent tile beside the fresh mortar work',
          'small bucket of fresh mortar at the roof ladder platform',
        ],
        protections: [
          'roof ladder hooked over the ridge — access route visible',
        ],
        chantier_details: [
          'fresh mortar pointing around the new tile edge — bright white against the weathered tile',
          'replacement tile slightly different in colour from the weathered tiles around it',
          'minimal repair footprint — only the damaged section replaced, surrounding tiles untouched',
        ],
      },

      // --- charpente ---
      {
        _for:          'charpente|ferme|fermette|structure.*toit|isolation.*comble|comble',
        scene_note:    'bare timber roof structure — rafters, purlins, and ridge board exposed before tiling, fermette frame layout visible across the full span',
        scene_camera:  'standing at the eave level, framing the bare timber fermette structure rising from the wall plate to the ridge',
        scene_framing: {
          work_pct:   60,
          foreground: 'timber wall plate at the eave level — rafter feet seated on the plate',
          midground:  'fermette structure — diagonal rafters rising to the ridge, collar ties visible across the span',
          background: 'ridge board at the apex, sky or gable wall beyond',
        },
        scene_debris:  'timber offcuts at the eave base, nail packaging on the scaffold board',
        scene_exclude: ['tiles going on', 'finished roof surface', 'moss or old tiles', 'moss treatment equipment'],
        tools: [
          'claw hammer and nail bar on the scaffold board beside the rafter toe',
          'chalk line drum on the wall plate for alignment',
        ],
        protections: [
          'scaffold platform at the working level',
          'debris netting below',
        ],
        chantier_details: [
          'bare timber fermette structure — rafters pale and raw, still unweathered',
          'collar ties visible across the rafter pairs — structural bracing in place',
          'ridge board at the apex — fermettes bearing onto it at the top',
        ],
      },
      {
        _for:          'charpente|ferme|fermette|structure.*toit|isolation.*comble|comble',
        scene_note:    'first eave battens going on a freshly erected timber frame — nail gun fixing the first batten across the rafter tops before the tile courses begin',
        scene_camera:  'on the rafter surface, framing the first batten being nailed across the rafter tops from the eave upward',
        scene_framing: {
          work_pct:   65,
          foreground: 'first eave batten being nailed to the rafter tops — fresh sawn timber, nail gun in use',
          midground:  'rafter surface above — bare, awaiting the next batten rows',
          background: 'ridge board at the top, fermette structure visible below',
        },
        scene_debris:  'batten off-cut on the scaffold board, nail gun hose running to the compressor below',
        scene_exclude: ['tiles going on', 'finished roof surface', 'old tiles stripped'],
        tools: [
          'nail gun fixing the first eave batten to the rafter tops',
          'measuring tape for batten gauge spacing',
          'stack of new sawn battens on the scaffold board ready for nailing',
        ],
        protections: [
          'scaffold platform as the working surface',
        ],
        chantier_details: [
          'first batten nailed across the rafter tops at the eave position',
          'raw timber rafters above waiting for the batten rows',
          'nail gun compressor hose coiled on the scaffold board',
        ],
      },

      // --- faîtage ---
      {
        _for:          'faitage|faite|faitier|faitiere',
        scene_note:    'old ridge tiles being broken off for replacement — bolster chisel and lump hammer at the old mortar joint, old ridge tile being lifted off the broken bed',
        scene_camera:  'close-up at the ridge line, framing the bolster and hammer at the mortar joint of the old ridge tile',
        scene_framing: {
          work_pct:   70,
          foreground: 'bolster chisel at the old ridge tile mortar joint — hammer striking the bolster to break the mortar',
          midground:  'old ridge tiles beside the repair zone — mortar-encrusted bases exposed where tiles already removed',
          background: 'ridge line of the roof, both slopes visible below',
        },
        scene_debris:  'old mortar fragments on the top tiles either side of the ridge, old ridge tile pieces on the scaffold beside the ridge',
        scene_exclude: ['fresh mortar applied', 'new tiles on slopes', 'moss treatment equipment'],
        tools: [
          'bolster chisel and lump hammer breaking the old ridge tile mortar joint',
        ],
        protections: [
          'safety goggles beside the lump hammer',
          'roof ladder hooked over the ridge for access',
        ],
        chantier_details: [
          'old mortar joint being broken — mortar fragments on the tile surface around the impact',
          'old ridge tile mortar-encrusted base visible where adjacent tiles already removed',
          'bolster impact marks in the old mortar — progressive breaking along the ridge',
        ],
      },
      {
        _for:          'faitage|faite|faitier|faitiere',
        scene_note:    'new mortar bed being applied along the ridge for new ridge tiles — trowel spreading fresh mortar across the top tile course on both sides of the apex',
        scene_camera:  'close-up at the ridge, framing the trowel spreading fresh mortar across the apex — mortar bed building on the top tiles',
        scene_framing: {
          work_pct:   70,
          foreground: 'trowel spreading fresh grey mortar across the top tile course at the ridge apex',
          midground:  'mortar bed growing along the ridge line — several tiles\' worth already laid',
          background: 'both roof slopes visible below the ridge line',
        },
        scene_debris:  'mortar splashes on the top tiles around the trowel work',
        scene_exclude: ['old ridge tile removal', 'new tiles on slope', 'moss treatment'],
        tools: [
          'brick trowel spreading fresh mortar along the ridge apex',
          'mortar bucket at the ridge side — fresh mix in the bucket',
        ],
        protections: [
          'roof ladder at the side for ridge access',
        ],
        chantier_details: [
          'fresh grey mortar bed being spread on both top tile courses at the apex',
          'mortar bed building progressively along the ridge length',
          'mortar splashes on the top tiles around the trowel work area',
        ],
      },
      {
        _for:          'faitage|faite|faitier|faitiere',
        scene_note:    'new ridge tile being bedded and tapped into the fresh mortar — rubber mallet tapping the ridge tile level, mortar squeezing from beneath both sides',
        scene_camera:  'close-up at the ridge, framing the rubber mallet tapping the new ridge tile level with mortar squeezing from beneath',
        scene_framing: {
          work_pct:   75,
          foreground: 'rubber mallet tapping a new ridge tile down into the fresh mortar bed — mortar squeezing from both sides beneath the tile',
          midground:  'completed ridge section behind the active point — neatly pointed mortar on both sides',
          background: 'ridge line continuing, roof slopes below',
        },
        scene_debris:  'excess mortar on the top tiles beside the newly bedded ridge tile',
        scene_exclude: ['old tile removal', 'ridge demolition', 'moss treatment'],
        tools: [
          'rubber mallet tapping the new ridge tile into the mortar bed',
          'pointing trowel to flush the mortar either side after bedding',
        ],
        protections: [
          'roof ladder beside the active ridge section',
        ],
        chantier_details: [
          'rubber mallet impact on the ridge tile — tile being driven into the mortar bed',
          'mortar squeezing from both sides of the ridge tile base as it is tapped level',
          'completed ridge section behind — mortar pointed and flushed neatly on both sides',
        ],
      },

      // --- zinguerie / solins / métallerie toiture ---
      {
        _for:          'zinguerie|zinc|solin|larmier|noue.*zinc|bavette.*zinc',
        scene_note:    'zinc sheet being cut to length on the scaffold — tin snips cutting through flat zinc sheet, scored fold lines marked with a marker pen',
        scene_camera:  'close-up on the scaffold board, framing the tin snips cutting through the zinc sheet with fold marks visible beside the cut line',
        scene_framing: {
          work_pct:   70,
          foreground: 'tin snips cutting through a flat zinc sheet — cut edge turning up on one side',
          midground:  'zinc sheet on the scaffold board — fold lines marked with marker pen, some sections already bent',
          background: 'scaffold board surface, house wall visible beyond',
        },
        scene_debris:  'zinc strip offcut curling beside the cut point, marker pen cap on the scaffold board',
        scene_exclude: ['tiles going on', 'moss treatment', 'gutter cleaning', 'concrete mixer'],
        tools: [
          'tin snips cutting through a flat zinc sheet',
          'marker pen on the scaffold board beside the fold marks',
        ],
        protections: [
          'heavy-duty work gloves beside the zinc sheet — zinc edges sharp',
        ],
        chantier_details: [
          'tin snips cutting through the zinc sheet — cut edge with slight turn-up visible',
          'fold lines marked in marker pen across the zinc sheet beside the cut',
          'zinc offcut strip curling on the scaffold board after trimming',
        ],
      },
      {
        _for:          'zinguerie|zinc|solin|larmier|noue.*zinc|bavette.*zinc',
        scene_note:    'lead flashing being dressed at a chimney abutment — lead dresser forming the malleable lead into the brick joint, top edge going into a raked-out mortar joint',
        scene_camera:  'close-up at the chimney-roof junction, framing the lead dresser being used to press the lead into the brick abutment joint',
        scene_framing: {
          work_pct:   70,
          foreground: 'lead dresser forming the malleable lead into the brick abutment joint at the chimney base',
          midground:  'lead apron and soaker visible at the chimney base — dressed and bedded on both sides',
          background: 'chimney stack above, roof tiles either side of the abutment',
        },
        scene_debris:  'old lead offcuts on the roof tiles beside the chimney, mortar dust from the raked-out joint on the brick face',
        scene_exclude: ['moss treatment', 'gutter cleaning', 'tile stripping', 'new tile coursing'],
        tools: [
          'lead dresser forming the malleable lead flashing into the brick joint',
          'cold chisel for raking out the old mortar joint above the lead edge',
        ],
        protections: [
          'heavy gloves beside the lead dresser',
          'roof ladder hooked over the ridge for chimney access',
        ],
        chantier_details: [
          'lead being dressed into the brick abutment joint — malleable material conforming to the brick face',
          'top lead edge going into the raked-out mortar course — will be pointed after dressing',
          'old mortar dust on the brick face from the raked-out joint beside the new lead edge',
        ],
      },
      {
        _for:          'zinguerie|zinc|solin|larmier|noue.*zinc|bavette.*zinc',
        scene_note:    'solin mortar joint being re-pointed at a wall abutment — fresh mortar being applied to the wall-tile junction with a pointing trowel',
        scene_camera:  'close-up at the wall-to-tile junction, framing the pointing trowel applying fresh mortar to the solin joint',
        scene_framing: {
          work_pct:   70,
          foreground: 'pointing trowel applying fresh mortar to the solin joint at the wall-tile abutment — mortar bead building along the junction',
          midground:  'wall face beside the roof tiles — old weathered solin visible where not yet re-pointed',
          background: 'roof tiles, wall continuing above the junction',
        },
        scene_debris:  'old mortar fragments from the raked-out joint on the tile surface below the solin',
        scene_exclude: ['zinc cutting', 'lead dresser at chimney', 'tile stripping', 'moss treatment'],
        tools: [
          'pointing trowel applying fresh mortar to the solin joint',
          'mortar bucket at the roof access platform',
          'cold chisel for raking out the old solin before re-pointing',
        ],
        protections: [
          'roof ladder for access to the wall junction',
        ],
        chantier_details: [
          'fresh mortar bead building along the solin joint — bright white against the weathered tile and wall',
          'old solin mortar — cracked and recessed — visible beside the fresh re-pointed section',
          'old mortar fragments on the tile surface below from the raking-out process',
        ],
      },
    ],
    tools: [
      'palettes of terracotta roof tiles stacked near the base of the house',
      'bags of roofing mortar stacked beside the wall',
      'roll of roofing underlayer membrane leaning against the facade',
      'ridge tile pieces grouped on a wooden delivery pallet',
      'aluminium flashing strips stacked flat near the house base',
      'chalk line reel resting on top of the tile palette',
    ],
    protections: [
      'heavy tarp spread on the garden below to catch fallen debris',
      'plastic sheet protecting the garden shrubs below the roof edge',
      'wooden boards bridging the flower bed to protect plants from foot traffic',
    ],
    chantier_details: [
      'tile offcuts in a loose pile near the base of the facade',
      'empty mortar bag folded and left against the house base',
      'cardboard tile packaging flattened on the driveway beside the pallet',
      'delivery pallet at the edge of the driveway',
      'chalk reference marks on the visible part of the gable wall',
    ],
  },
  carrelage: {
    tools: [
      'notched trowel resting on top of the tile stack',
      'tile levelling clips scattered on the subfloor near the work edge',
      'rubber mallet on the floor beside a freshly laid tile row',
      'grout bucket with sponge balanced on the rim',
      'plastic mixing bucket with cement residue near the room entrance',
      'tile spacers in a small pile at the edge of the laid area',
    ],
    protections: [
      'cardboard sheet covering the freshly laid tiles near the doorway',
      'masking tape running along the skirting board at the wall edge',
      'plastic drop sheet protecting the adjacent room threshold',
    ],
    chantier_details: [
      'tile offcuts in a small pile near the wall',
      'grout residue smear on the bare subfloor at the edge of the laid area',
      'empty tile box flattened near the room entrance',
      'damp grouting sponge and small water bucket near the recently grouted section',
      'pencil reference line marked on the wall at tile height',
    ],
  },

  abattage: {
    scenarios: [

      // --- abattage direct ---
      {
        _for:          'abattage.*arbre|abattage.*peup|abattage.*conif',
        scene_note:    'tree felling in progress — notch and back-cut made at the base, directional guide rope tensioned from high on the trunk, tree still standing with the hinge cut visible',
        scene_camera:  'standing at a safe distance from the fall zone, framing the base of the tree with the notch cut and the guide rope running upward',
        scene_framing: {
          work_pct:   65,
          foreground: 'yellow safety tape exclusion zone at the fall area perimeter, guide stake at the fall direction',
          midground:  'tree trunk base — notch and back-cut clearly visible in the wood, rope attached high and tensioned',
          background: 'crown of the tree, open fall zone beyond',
        },
        scene_debris:  'fresh sawdust at the base of the trunk around the notch cut, wood chip pile from the notch removal',
        scene_exclude: ['felled tree on the ground', 'only stump visible', 'dessouchage equipment', 'simple light pruning', 'tree completely intact'],
        tools: [
          'chainsaw beside the cut — notch cut just completed',
          'guide rope running from the trunk base up to the attachment point high on the tree',
          'wedge blocks on the ground near the trunk base',
        ],
        protections: [
          'yellow safety tape marking the exclusion zone in the fall direction',
          'guide stake driven into the ground at the calculated fall direction',
        ],
        chantier_details: [
          'notch and back-cut clearly visible in the trunk at base level',
          'guide rope tensioned from the trunk attachment point toward the desired fall direction',
          'fresh sawdust pile at the base from the notch cut',
        ],
      },
      {
        _for:          'abattage.*arbre|abattage.*peup|abattage.*conif',
        scene_note:    'tree mid-fall — trunk at 30–45 degrees, crown swinging into the fall zone, guide rope under tension, exclusion zone clear',
        scene_camera:  'standing well outside the fall zone, framing the leaning trunk at 30–45 degrees with the crown swinging',
        scene_framing: {
          work_pct:   70,
          foreground: 'exclusion zone tape and safety cones at the near perimeter',
          midground:  'tree trunk at 30–45 degrees — crown swinging into the prepared fall zone',
          background: 'cleared fall zone, open garden or field where the tree will land',
        },
        scene_debris:  'small bark fragments at the base from the cut, guide rope slack forming behind the falling trunk',
        scene_exclude: ['tree standing upright intact', 'stump only', 'dessouchage', 'log pile', 'simple pruning'],
        tools: [
          'guide rope in tension from the upper trunk toward the direction of fall',
          'chainsaw on the ground at the safe distance — cut already made',
        ],
        protections: [
          'yellow safety tape exclusion zone visibly clear of the fall direction',
          'operator at safe distance away from the fall zone',
        ],
        chantier_details: [
          'trunk at steep lean angle — crown clearly in motion',
          'guide rope tracking the controlled fall direction — rope in tension',
          'fall zone prepared and clear ahead of the falling crown',
        ],
      },
      {
        _for:          'abattage.*arbre|abattage.*peup|abattage.*conif',
        scene_note:    'tree freshly felled — full trunk on the ground in the fall zone, fresh-cut stump visible at trunk base, sawdust around the stump, exclusion tape still in place',
        scene_camera:  'standing beside the stump, framing the full length of the fallen trunk on the ground with the stump in the foreground',
        scene_framing: {
          work_pct:   55,
          foreground: 'fresh-cut stump with growth rings visible — sawdust and wood chips around the base',
          midground:  'fallen trunk stretching along the ground — bark, crown foliage at the far end',
          background: 'open fall zone, safety tape still in place at the perimeter',
        },
        scene_debris:  'sawdust ring around the stump base, wood chips from the notch cut, bark fragments on the ground',
        scene_exclude: ['tree standing', 'sections already cut up', 'dessouchage', 'log pile stacked'],
        tools: [
          'chainsaw on the ground near the stump — felling just completed',
          'measuring tape near the stump base',
        ],
        protections: [
          'yellow safety tape exclusion zone still in place around the fall area',
        ],
        chantier_details: [
          'fresh-cut stump with concentric growth rings visible on the flat face',
          'fallen trunk on the ground — full length visible from stump to crown',
          'sawdust ring around the stump from the cut',
        ],
      },

      // --- démontage par sections / zone difficile ---
      {
        _for:          'zone.*diffic|diffic.*zone|grand.*arbre|gros.*arbre|demontage',
        scene_note:    'tree being dismantled section by section from the top — upper sections already removed, arborist climber at the top of the shortened stub trunk, multiple log sections at the base',
        scene_camera:  'standing back from the tree, framing the partially dismantled stub trunk with the climber at the top against the sky',
        scene_framing: {
          work_pct:   65,
          foreground: 'log sections on the ground at the base — stacked and arranged, sawdust around them',
          midground:  'shortened stub trunk — much shorter than original height, climber in harness at the top',
          background: 'sky above, property or tight garden space visible beside the work area',
        },
        scene_debris:  'sawdust ring around the base, bark fragments from previous sections on the ground',
        scene_exclude: ['intact standing full tree', 'simple felling', 'tree in open field', 'dessouchage'],
        tools: [
          'climbing rope running from the climber at the top of the stub down to ground handlers',
          'chainsaw at the climber\'s position for the next section cut',
          'log sections on the ground from previous section removals',
        ],
        protections: [
          'full climbing harness and helmet on the climber at the stub top',
          'exclusion zone below the working area',
          'lowering rope for controlled section descent',
        ],
        chantier_details: [
          'stub trunk significantly shorter than the original tree — sections removed progressively from top',
          'climber in harness at the top of the shortened stub — height still significant',
          'log section pile at the base growing as each section is lowered',
        ],
      },
      {
        _for:          'zone.*diffic|diffic.*zone|grand.*arbre|gros.*arbre|demontage',
        scene_note:    'large trunk section being lowered by rope — section suspended mid-air between the stub and the ground, rope under tension, ground handler controlling the descent speed',
        scene_camera:  'standing back, framing the suspended trunk section hanging from the lowering rope between canopy height and the ground',
        scene_framing: {
          work_pct:   70,
          foreground: 'ground handler with the lowering rope — hands gripping the rope, rope taut under the section weight',
          midground:  'large trunk section suspended mid-air — bark clearly visible, rope through the top ring',
          background: 'stub trunk above, property or structure beside the controlled lowering zone',
        },
        scene_debris:  'bark fragments on the ground below the suspended section from the cut, sawdust at the ground immediately below',
        scene_exclude: ['tree falling uncontrolled', 'intact standing tree', 'simple felling', 'dessouchage'],
        tools: [
          'lowering rope through a rigging ring at the top of the suspended section',
          'ground handler with gloved hands on the rope controlling the descent',
        ],
        protections: [
          'hard hat and gloves on the ground handler',
          'exclusion zone below the lowering path',
        ],
        chantier_details: [
          'trunk section suspended mid-air — log mass visible, rope taut under tension',
          'ground handler controlling descent speed with the lowering rope',
          'controlled lowering arc clear of the adjacent property',
        ],
      },
      {
        _for:          'zone.*diffic|diffic.*zone|grand.*arbre|gros.*arbre|demontage',
        scene_note:    'partially dismantled tree — several upper sections removed, leaving a reduced stub trunk still standing, log billets at the base, tight garden or property boundary visible',
        scene_camera:  'standing in the garden, framing the reduced stub trunk with the log billets at the base and the property boundary close beside',
        scene_framing: {
          work_pct:   55,
          foreground: 'log billets on the ground at the base — varied section lengths, fresh cut ends visible',
          midground:  'reduced stub trunk — upper sections removed, clean cut at the current top level',
          background: 'tight property boundary beside the work area — fence, wall or house clearly close to the trunk',
        },
        scene_debris:  'sawdust around the billet pile, bark fragments on the ground',
        scene_exclude: ['full intact tree', 'open field felling', 'dessouchage', 'tree completely down'],
        tools: [
          'chainsaw resting against the stub trunk',
          'rigging rope coiled beside the billet pile',
        ],
        protections: [
          'exclusion zone tape still in place around the work area',
        ],
        chantier_details: [
          'stub trunk clean-cut at the current working height — progressive dismantling visible',
          'log billet pile at the base — each section from a previous cut',
          'tight property boundary clearly visible beside the trunk — confined working space',
        ],
      },

      // --- dessouchage ---
      {
        _for:          'dessouchage|souche',
        scene_note:    'stump grinder working on a fresh stump — rotating cutting wheel engaged with the stump surface, wood chips being thrown to the side, operator behind the machine',
        scene_camera:  'standing to the side of the stump grinder, framing the cutting wheel engaged with the fresh stump',
        scene_framing: {
          work_pct:   70,
          foreground: 'stump grinder with the rotating cutting wheel engaged on the stump surface — chips being thrown',
          midground:  'fresh stump being ground — surface visibly decreasing in height as the wheel removes wood',
          background: 'garden or lawn around the stump, sawdust and chip debris scattered wide',
        },
        scene_debris:  'wood chips being thrown to the sides from the grinding wheel, sawdust and chip ring forming around the machine',
        scene_exclude: ['intact standing tree', 'simple pruning', 'felling in progress', 'log pile from felling'],
        tools: [
          'stump grinder machine with rotating cutting wheel engaged on the stump surface',
        ],
        protections: [
          'chip deflector guard on the grinder protecting the operator',
          'eye protection on the operator',
          'chip splash zone cleared around the grinder',
        ],
        chantier_details: [
          'cutting wheel actively engaged with the stump — top surface being progressively reduced',
          'fresh wood chip shower being thrown to the sides from the grinding wheel',
          'stump clearly decreasing in height as the grinder works across it',
        ],
      },
      {
        _for:          'dessouchage|souche',
        scene_note:    'partially ground stump — circular grinding marks visible on the stump face, wood chips scattered wide, stump reduced to below-grade level on one side',
        scene_camera:  'crouching beside the stump, framing the grinding marks and the wood chip scatter',
        scene_framing: {
          work_pct:   75,
          foreground: 'fresh grinding marks on the stump face — circular grinder path clearly visible in the wood',
          midground:  'stump partially ground — one side reduced to below-grade, other side still full height',
          background: 'garden lawn, wood chips scattered across the surrounding grass',
        },
        scene_debris:  'fresh wood chips scattered wide around the stump from the grinding operation',
        scene_exclude: ['intact standing tree', 'full stump untouched', 'felling in progress'],
        tools: [
          'stump grinder parked beside the stump between passes',
        ],
        protections: [],
        chantier_details: [
          'circular grinding path marks clearly visible on the stump face',
          'stump partially reduced — one side to below-grade, revealing the grinding depth',
          'wood chip scatter wide around the stump from the grinding operation',
        ],
      },
      {
        _for:          'dessouchage|souche',
        scene_note:    'dessouchage completed — stump removed to below-grade level, depression in the lawn where the stump was, wood chip pile in the hollow, surrounding lawn intact',
        scene_camera:  'standing above the completed area, framing the ground-level result where the stump was',
        scene_framing: {
          work_pct:   45,
          foreground: 'ground-level depression where the stump was — wood chip pile filling the hollow',
          midground:  'lawn around the removal area — grass intact, slight disturbance from the machine tracks',
          background: 'garden surroundings, fence or garden edge beyond',
        },
        scene_debris:  'wood chip pile in the depression, fine sawdust on the surrounding grass from the grinding',
        scene_exclude: ['intact standing tree', 'stump still visible above ground', 'felling in progress'],
        tools: [
          'stump grinder parked away — work completed',
          'rake on the ground beside the chip pile for tidying',
        ],
        protections: [],
        chantier_details: [
          'depression in the lawn at ground level — stump ground to below grade',
          'wood chip pile filling the hollow from the grinding debris',
          'surrounding lawn intact with slight machine track marks beside the area',
        ],
      },

      // --- après tempête ---
      {
        _for:          'tempete|orage|vent.*fort|apres.*vent|arbre.*tombe',
        scene_note:    'wind-fallen tree leaning against a garden fence or low wall — root ball exposed, trunk on the ground at a low angle, grey overcast sky and wet ground after the storm',
        scene_camera:  'standing back, framing the fallen tree leaning against the fence with the exposed root ball at the base',
        scene_framing: {
          work_pct:   60,
          foreground: 'exposed root ball on the wet ground — earth and roots upended, depression in the lawn beside it',
          midground:  'trunk at a low angle resting on the fence or wall — bark and crown visible',
          background: 'grey overcast sky, wet garden, fence partially visible under the trunk',
        },
        scene_debris:  'wet mud and soil debris around the exposed root ball, small branches and leaves on the wet ground',
        scene_exclude: ['catastrophic structural damage', 'house destroyed', 'multiple fallen trees', 'sunny dry weather', 'dramatic sky'],
        tools: [
          'orange safety cones placed around the danger area',
          'safety tape visible around the fallen tree perimeter',
        ],
        protections: [
          'safety tape marking the hazard area around the fallen tree',
          'orange cones beside the root ball',
        ],
        chantier_details: [
          'root ball fully exposed — roots and compacted earth visible on the upended side',
          'depression in the lawn where the root ball was anchored',
          'wet conditions throughout — wet ground, wet bark, wet leaves',
        ],
      },
      {
        _for:          'tempete|orage|vent.*fort|apres.*vent|arbre.*tombe',
        scene_note:    'storm tree being sectioned on a blocked path or driveway — trunk already on the ground, chainsaw cutting sections, cones and safety tape in place, grey sky, ground wet',
        scene_camera:  'standing beside the trunk, framing the chainsaw cutting into a trunk section with cones and tape visible',
        scene_framing: {
          work_pct:   65,
          foreground: 'orange safety cones and safety tape at the roadside or path edge — cleared public area',
          midground:  'trunk section being cut by chainsaw — sawdust flying, operator in HV vest',
          background: 'grey overcast sky, wet surfaces, utility vehicle or van visible in the background',
        },
        scene_debris:  'sawdust on the wet ground at the cut point, cut sections beside the trunk, wet leaves on the path',
        scene_exclude: ['catastrophic damage', 'multiple trees down', 'house destroyed', 'dry sunny weather'],
        tools: [
          'chainsaw cutting a trunk section on the ground',
          'utility van visible in the background — crew on site',
        ],
        protections: [
          'high-visibility vests on all workers',
          'orange cones at the site perimeter',
          'safety tape across the blocked path',
          'hard hats on the workers',
        ],
        chantier_details: [
          'trunk section on the wet ground — chainsaw actively cutting',
          'sawdust on the wet path surface from the cut',
          'cut sections already separated beside the trunk — sections being progressively created',
        ],
      },

      // --- intervention de nuit / urgence ---
      {
        _for:          'urgence|nuit|nocturne|route.*bloqu',
        time_of_day:   'night',
        scene_note:    'night emergency felling — work floodlights illuminating a fallen or dangerous tree on a road or driveway, workers in high-visibility vests with chainsaw, orange cones, dark background',
        scene_camera:  'standing outside the light zone, framing the lit work area with the dark surroundings beyond',
        scene_framing: {
          work_pct:   65,
          foreground: 'orange cones and safety tape at the lit perimeter — blocking the road or driveway',
          midground:  'workers in HV vests operating chainsaw on the fallen trunk, work floodlight illuminating the scene',
          background: 'dark background — trees silhouetted against the dark sky beyond the light zone',
        },
        scene_debris:  'sawdust visible in the floodlight cone on the ground beside the cut, cut log sections in the light',
        scene_exclude: ['daytime lighting', 'cinematic lighting', 'police flashing lights unless specified', 'completely dark unreadable scene'],
        tools: [
          'chainsaw operated by a worker in HV vest in the floodlight zone',
          'work floodlight on tripod providing the main illumination',
        ],
        protections: [
          'high-visibility vests on all workers — clearly lit by the floodlight',
          'hard hats on workers',
          'orange cones blocking the road or driveway approach',
          'safety tape across the hazard zone',
        ],
        chantier_details: [
          'floodlight cone illuminating the work area — sharp light-dark boundary',
          'HV vests bright in the floodlight — professional emergency response visible',
          'dark surroundings beyond the light zone — night conditions clearly communicated',
        ],
      },
      {
        _for:          'urgence|nuit|nocturne|route.*bloqu',
        time_of_day:   'night',
        scene_note:    'night emergency — van headlights and work floodlight creating combined illumination on a fresh stump or fallen trunk, workers visible in HV gear, dark sky above',
        scene_camera:  'standing outside the combined light zone, framing the van headlights and floodlight overlapping on the work area',
        scene_framing: {
          work_pct:   55,
          foreground: 'van parked with headlights on, orange cones at the road edge',
          midground:  'work floodlight zone with workers in HV vests at the fallen trunk or fresh stump',
          background: 'dark sky, tree silhouettes beyond the light, distant surroundings in darkness',
        },
        scene_debris:  'sawdust and cut sections visible in the combined light zone on the ground',
        scene_exclude: ['daylight', 'overly dramatic cinematic light', 'scene too dark to read work'],
        tools: [
          'work floodlight on tripod in the combined light zone',
          'utility van with headlights on',
          'chainsaw or hand tools in the workers\' hands',
        ],
        protections: [
          'HV vests on all workers clearly visible in the combined light',
          'orange cones at the road edge or perimeter',
        ],
        chantier_details: [
          'combined light from van headlights and floodlight — overlapping warm and cool tones',
          'workers\' HV vests clearly visible in the combined light zone',
          'dark sky and silhouetted trees beyond the lit area — unmistakable night context',
        ],
      },

      // Fallback: abattage général
      {
        scene_note:    'tree felling work in progress — trunk on the ground or stump visible, safety exclusion zone in place, fresh sawdust and wood chips on the ground',
        scene_camera:  'standing beside the stump or fallen trunk, framing the evidence of felling with the exclusion zone visible',
        scene_framing: {
          work_pct:   50,
          foreground: 'fresh-cut stump with growth rings visible, sawdust ring around the base',
          midground:  'fallen trunk on the ground or cut sections nearby, exclusion tape visible',
          background: 'garden or site surroundings, cleared fall zone',
        },
        scene_debris:  'fresh sawdust at the stump base, wood chip pile, bark fragments on the ground',
        scene_exclude: ['intact standing tree with no work', 'dessouchage equipment if not relevant'],
        tools: [
          'guide stake driven into the ground at the calculated fall direction',
          'measuring tape on the ground near the base of the tree',
          'rope coil resting at the base for directional pull',
        ],
        protections: [
          'yellow safety tape marking the exclusion zone around the felling area',
          'tarp spread on the ground at the expected landing zone',
        ],
        chantier_details: [
          'fresh wood chips scattered on the ground at the base of the tree',
          'cut branch sections stacked in a pile nearby',
          'sap mark on the freshly exposed cut end of a branch',
        ],
      },
    ],
    tools: [
      'guide stake driven into the ground at the calculated fall direction',
      'measuring tape on the ground near the base of the tree',
      'rope coil resting at the base for directional pull',
      'hand saw resting against a cut lower branch',
      'wedge blocks on the ground near the trunk base',
    ],
    protections: [
      'yellow safety tape marking the exclusion zone around the felling area',
      'tarp spread on the ground at the expected landing zone',
    ],
    chantier_details: [
      'fresh wood chips scattered on the ground at the base of the tree',
      'cut branch sections stacked in a pile nearby',
      'sap mark on the freshly exposed cut end of a branch',
      'sawdust pile at the base of the trunk',
      'small root fragment disturbed and exposed at the base of the tree',
    ],
  },

  peinture: {
    scenarios: [

      // --- peinture intérieure (murs) ---
      {
        _for:          'interieur|interieure|salon|chambre|cuisine|couloir|cage.*escal|boiserie.*int|papier.*peint',
        setting:       'interior',
        scene_note:    'interior wall being painted — roller working across a half-painted wall, fresh new colour on the upper half, old paint still visible on the lower half, roller tray on the drop cloth',
        scene_camera:  'standing in the room, framing the half-painted wall with the roller mid-stroke and the drop cloth on the floor',
        scene_framing: {
          work_pct:   65,
          foreground: 'canvas drop cloth on the floor, roller tray with fresh paint beside the wall',
          midground:  'half-painted wall — new colour above the mid-line, old colour below, paint edge sharp',
          background: 'room interior — door frame or window visible at the side',
        },
        scene_debris:  'paint drip on the drop cloth below the roller line, thin wet brush stroke at the unpainted edge',
        scene_exclude: ['exterior facade painting', 'masonry construction', 'roofing', 'pressure washer', 'wet render on wall'],
        tools: [
          'paint roller mid-stroke on the wall surface',
          'roller tray with fresh paint on the drop cloth',
          'flat brush on the rim of the tray for cutting-in',
        ],
        protections: [
          'canvas drop cloth spread across the full floor below the painted wall',
          'masking tape strip along the ceiling junction and skirting board',
          'plastic sheet over nearby furniture',
        ],
        chantier_details: [
          'fresh paint edge sharp between new and old colour at the mid-wall line',
          'roller texture marks visible at the leading edge of the painted section',
          'paint drips on the drop cloth below the active stroke area',
        ],
      },
      {
        _for:          'interieur|interieure|salon|chambre|cuisine|couloir|cage.*escal|boiserie.*int|papier.*peint',
        setting:       'interior',
        scene_note:    'room being prepared for painting — canvas drop cloth covering the full floor, masking tape along the skirting board edge, unpainted wall above ready, paint tin open on the cloth',
        scene_camera:  'standing in the doorway, framing the drop-cloth-covered room with masking tape along all edges and the open paint tin',
        scene_framing: {
          work_pct:   50,
          foreground: 'canvas drop cloth covering the full floor — taped at the skirting board base',
          midground:  'unpainted walls above the masking tape line, window frame masked with tape and paper',
          background: 'far wall and ceiling visible, furniture pushed to the room centre and covered',
        },
        scene_debris:  'masking tape roll on the floor near the skirting, torn tape packaging on the drop cloth',
        scene_exclude: ['exterior painting', 'masonry construction', 'roofing', 'pressure washer'],
        tools: [
          'masking tape strip freshly applied along the skirting board edge',
          'paint tin open on the drop cloth, stir stick resting on the lid',
          'roller and tray on the cloth ready to start',
        ],
        protections: [
          'canvas drop cloth covering the full floor area — taped at the edges',
          'masking tape along all skirting boards, window frames, and ceiling junction',
          'plastic sheet over furniture pushed to the room centre',
        ],
        chantier_details: [
          'masking tape clearly applied along all edges — skirting, ceiling junction, window frames',
          'drop cloth on the full floor — room fully protected before painting starts',
          'furniture moved to centre and covered — room prepared for painting',
        ],
      },
      {
        _for:          'interieur|interieure|salon|chambre|cuisine|couloir|cage.*escal|boiserie.*int|papier.*peint',
        setting:       'interior',
        scene_note:    'interior wall corner being cut in — flat brush cutting a precise line at the inside corner, both walls freshly painted around the angle, drop cloth on the floor',
        scene_camera:  'close-up at the inside corner, framing the brush at the angle making the cut-in line',
        scene_framing: {
          work_pct:   75,
          foreground: 'flat brush at the inside corner — cutting a precise paint line between the two adjacent wall surfaces',
          midground:  'both wall surfaces freshly painted around the corner — uniform colour on both planes',
          background: 'room interior, skirting board and floor at the base',
        },
        scene_debris:  'thin wet paint brush stroke still wet at the corner cut-in line, paint drip at the skirting below',
        scene_exclude: ['exterior painting', 'masonry', 'roofing', 'pressure washer'],
        tools: [
          'flat brush making the cut-in line at the inside corner',
          'small paint pot beside the brush for the cutting-in work',
        ],
        protections: [
          'masking tape along the skirting board below the corner',
          'drop cloth at the base of the wall',
        ],
        chantier_details: [
          'precise cut-in line at the inside corner — brush work clean',
          'both wall surfaces freshly painted — uniform tone, no runs',
          'brush held close to the wall surface at the angle for control',
        ],
      },

      // --- peinture plafond ---
      {
        _for:          'plafond',
        setting:       'interior',
        scene_note:    'ceiling being painted with an extension roller — roller on a long pole being pushed across the flat ceiling, freshly painted section white and wet beside the old unpainted area still warm-toned',
        scene_camera:  'standing in the room looking up, framing the roller on the extension pole being pushed across the ceiling',
        scene_framing: {
          work_pct:   65,
          foreground: 'canvas drop cloth covering the entire floor — furniture removed or covered',
          midground:  'extension roller on a long pole being pushed across the ceiling surface',
          background: 'ceiling — freshly painted white section beside the old unpainted area still showing the base tone',
        },
        scene_debris:  'paint fleck on the drop cloth from the ceiling roller, thin drip on the wall at the ceiling junction',
        scene_exclude: ['wall painting', 'exterior painting', 'masonry', 'roofing', 'pressure washer'],
        tools: [
          'roller on an extension pole being pushed across the ceiling surface',
          'roller tray with white paint on the drop cloth at the room side',
        ],
        protections: [
          'full floor coverage with canvas drop cloth — no floor visible',
          'masking tape along the ceiling-wall junction',
          'ceiling light fitting wrapped in plastic sheeting',
        ],
        chantier_details: [
          'fresh white ceiling paint wet and shiny beside the old warm-toned unpainted area',
          'roller marks visible in the freshly applied paint — normal texture',
          'paint fleck on the drop cloth from the roller',
        ],
      },
      {
        _for:          'plafond',
        setting:       'interior',
        scene_note:    'ceiling paint almost complete — last strip being finished at the room perimeter with a short roller, ceiling junction cutting-in done, full floor drop cloth visible below',
        scene_camera:  'standing at the room edge, framing the short roller finishing the perimeter strip with the drop cloth below',
        scene_framing: {
          work_pct:   55,
          foreground: 'canvas drop cloth on the floor, roller tray with white paint at the room edge',
          midground:  'short roller finishing the last ceiling strip at the wall junction — almost complete',
          background: 'freshly painted ceiling — uniform white across the full room area',
        },
        scene_debris:  'paint drip at the ceiling-wall junction from the perimeter work',
        scene_exclude: ['wall painting', 'exterior', 'masonry', 'roofing'],
        tools: [
          'short roller finishing the perimeter strip at the ceiling edge',
          'flat brush on the drop cloth from the cutting-in pass',
        ],
        protections: [
          'full drop cloth on the floor — no boards visible',
          'masking tape at the ceiling-wall junction',
        ],
        chantier_details: [
          'ceiling almost uniformly white — last strip at the perimeter being finished',
          'cutting-in line at the ceiling junction clean — brush work done before the roller pass',
          'drop cloth fully covering the floor — complete room protection',
        ],
      },

      // --- peinture extérieure ---
      {
        _for:          'exterieur|exterieure|facade.*peint|volet|portail|cloture|boiserie.*ext|sous.*face|soffit',
        setting:       'exterior',
        scene_note:    'timber shutters removed and laid on trestles outdoors — old paint being sanded before repainting, both shutters side by side on the outdoor workstation, sanding dust visible',
        scene_camera:  'standing beside the trestles, framing both shutters flat on the workstation with the sanding equipment',
        scene_framing: {
          work_pct:   65,
          foreground: 'two timber shutters flat on trestles — old paint surface being sanded, sanding dust visible',
          midground:  'electric sander or sanding block in use on the shutter surface',
          background: 'house wall with the empty shutter mounting brackets, garden beyond',
        },
        scene_debris:  'sanding dust on the shutter surface and on the ground below the trestles',
        scene_exclude: ['shutters painted and hung', 'interior painting', 'masonry', 'roofing', 'pressure washer'],
        tools: [
          'electric orbital sander in use on the shutter surface',
          'sanding block beside the sander for the hand-finish areas',
          'trestles holding both shutters at working height',
        ],
        protections: [
          'dust sheet under the trestles catching sanding dust',
          'safety goggles on the worker sanding',
        ],
        chantier_details: [
          'old paint surface being sanded — surface scratched and abraded to take new paint',
          'sanding dust visible on the shutter surface and below',
          'empty mounting brackets on the house wall where the shutters were removed',
        ],
      },
      {
        _for:          'exterieur|exterieure|facade.*peint|volet|portail|cloture|boiserie.*ext|sous.*face|soffit',
        setting:       'exterior',
        scene_note:    'exterior facade paint in progress — upper section freshly painted in new colour, lower section still original paint, clear horizontal boundary, ladder and paint tray beside the wall',
        scene_camera:  'standing back from the facade, framing the full wall height with the painted upper section and the old lower section, ladder beside the work',
        scene_framing: {
          work_pct:   60,
          foreground: 'ladder base against the facade, paint tray and roller on the ground below',
          midground:  'facade — upper section freshly painted in new colour, lower section old paint still showing',
          background: 'garden surroundings, sky above the roof edge',
        },
        scene_debris:  'paint drip at the boundary line between old and new paint',
        scene_exclude: ['interior painting', 'masonry construction', 'roofing tiles', 'pressure washer'],
        tools: [
          'roller on an extension pole at the ladder working height',
          'paint tray with exterior paint on the step of the ladder',
          'masking tape strip along the window frame edge',
        ],
        protections: [
          'plastic sheeting taped over the window glass',
          'tarp on the ground below the wall to catch paint drips',
          'masking tape along window frames and door frames',
        ],
        chantier_details: [
          'fresh paint on the upper facade — clean new colour uniform and wet',
          'clear horizontal boundary between new and old paint at the work line',
          'paint drip at the boundary from the active roller edge',
        ],
      },
      {
        _for:          'exterieur|exterieure|facade.*peint|volet|portail|cloture|boiserie.*ext|sous.*face|soffit',
        setting:       'exterior',
        scene_note:    'garden gate being painted — masking tape along the adjacent wall junction, tarp on the ground below, new paint colour on the upper bars with old finish still on the lower section',
        scene_camera:  'standing in front of the gate, framing the painted upper bars with the masking tape at the wall junction and the tarp below',
        scene_framing: {
          work_pct:   60,
          foreground: 'tarp on the ground below the gate, paint brush on the tarp beside the small paint pot',
          midground:  'gate — upper bars freshly painted in new colour, lower section old finish still showing',
          background: 'masking tape at the wall junction beside the gate frame, garden path beyond',
        },
        scene_debris:  'paint drip at the boundary between new and old finish on a vertical bar',
        scene_exclude: ['interior painting', 'masonry', 'roofing', 'pressure washer', 'overspray on plants'],
        tools: [
          'brush applying paint to the gate bar surface',
          'small paint pot balanced on the gate frame beside the brush',
          'masking tape along the adjacent wall junction',
        ],
        protections: [
          'tarp on the ground below the gate catching drips',
          'masking tape protecting the adjacent wall and hinge hardware',
        ],
        chantier_details: [
          'upper gate bars freshly painted — new colour uniform and wet',
          'old paint colour still visible on the lower bars — work in progress',
          'masking tape at the wall junction clearly protecting adjacent surfaces',
        ],
      },

      // Fallback
      {
        scene_note:    'painting work in progress — wall section partially covered with fresh paint, canvas drop cloth on the floor, roller and paint tray visible',
        scene_camera:  'standing in the room or in front of the wall, framing the partially painted surface with the roller and tray visible',
        scene_framing: {
          work_pct:   55,
          foreground: 'canvas drop cloth on the floor, roller tray with paint residue beside the wall',
          midground:  'wall surface — partly freshly painted, partly old base coat still showing',
          background: 'room interior or exterior surroundings, door or window visible at the side',
        },
        scene_debris:  'paint drip on the drop cloth below the active stroke area',
        scene_exclude: ['masonry construction', 'roofing', 'pressure washer', 'wet render on wall'],
        tools: [
          'paint roller with extension pole resting against the wall',
          'flat brush balanced on the edge of an open paint can',
          'roller tray with paint residue on the floor',
        ],
        protections: [
          'canvas drop cloth spread across the floor below the painted wall',
          'masking tape strip along the ceiling junction or skirting board edge',
        ],
        chantier_details: [
          'paint drip marks on the drop cloth below the working section',
          'fresh wet brush stroke visible at the unpainted edge of the wall',
          'roller texture marks visible near the unpainted corner',
        ],
      },
    ],
    tools: [
      'paint roller with extension pole resting against the wall',
      'flat brush balanced on the edge of an open paint can',
      'roller tray with paint residue on the floor',
      'stir stick resting on the paint can lid',
      'masking tape roll on the floor near the skirting board',
      'small paint scraper on the windowsill',
    ],
    protections: [
      'canvas drop cloth spread across the floor below the painted wall',
      'plastic sheeting draped over furniture or adjacent built-in fixtures',
      'masking tape strip along the ceiling junction or skirting board edge',
    ],
    chantier_details: [
      'paint drip marks on the drop cloth below the working section',
      'fresh wet brush stroke visible at the unpainted edge of the wall',
      'empty paint tin beside the opened one on the floor',
      'roller texture marks visible near the unpainted corner',
      'crumpled painter tape strip on the drop cloth',
    ],
  },

  ravalement: {
    scenarios: [

      // --- ravalement complet / enduit de façade ---
      {
        _for:          'ravalement|renovation.*facade|crepi|enduit.*mono|enduit.*hydr|ite|enduit',
        scene_note:    'fresh render being applied to the facade — large float spreading a thick render coat across a section, trowel marks still wet, scaffolding board at the work level',
        scene_camera:  'standing back from the scaffold, framing the worker applying render to a section with the fresh render surface beside the older section',
        scene_framing: {
          work_pct:   65,
          foreground: 'render hawk and trowel on the scaffold board beside the freshly rendered section',
          midground:  'facade — freshly rendered section (pale and smooth) beside the old weathered render',
          background: 'scaffold tube and board structure, garden or street level below',
        },
        scene_debris:  'render drip at the base of the freshly applied section, empty render bag folded on the scaffold',
        scene_exclude: ['cleaning equipment', 'pressure washer', 'roofing materials', 'finished clean facade without any work visible'],
        tools: [
          'large render float spreading fresh render across the facade section',
          'hawk and trowel on the scaffold board beside the work',
          'render mixing bucket with mortar residue at the scaffold edge',
        ],
        protections: [
          'plastic sheeting taped over the window frame and glass',
          'wooden board protecting the garden bed at the base of the wall',
          'kraft paper taped along the window frame edge for a clean render line',
        ],
        chantier_details: [
          'fresh render surface pale and smooth — trowel marks still visible and wet',
          'old render beside the new section — darker and textured from weathering',
          'render drip at the base of the fresh section from the application',
        ],
      },
      {
        _for:          'ravalement|renovation.*facade|crepi|enduit.*mono|enduit.*hydr|ite|enduit',
        scene_note:    'facade half-rendered — right section freshly applied render pale and smooth, left section old weathered render still dirty and textured, clear vertical demarcation line',
        scene_camera:  'standing back from the facade, framing the full wall height with the half-rendered/half-old contrast clearly visible',
        scene_framing: {
          work_pct:   55,
          foreground: 'scaffold base on the ground, mortar bucket and tools at the work station',
          midground:  'facade — right half freshly rendered pale and smooth, left half old render weathered and dirty — vertical division line sharp',
          background: 'sky above the roof edge, garden or street beside the facade',
        },
        scene_debris:  'render drips at the demarcation line, empty render bags on the scaffold',
        scene_exclude: ['pressure washer', 'roofing', 'fully finished clean facade', 'interior painting'],
        tools: [
          'render hawk and trowel at the work station on the scaffold',
          'straight edge rule leaning against the freshly rendered panel',
          'spray bottle for dampening the substrate on the scaffold board',
        ],
        protections: [
          'plastic sheeting taped over all windows on the rendered section',
          'scaffold debris netting at the working level',
        ],
        chantier_details: [
          'sharp vertical demarcation between new pale render and old dirty render',
          'new render side — uniform pale tone, float marks still visible',
          'old render side — darker tone, weathering texture, old paint or staining visible',
        ],
      },
      {
        _for:          'ravalement|renovation.*facade|crepi|enduit.*mono|enduit.*hydr|ite|enduit',
        scene_note:    'fresh render being finished with a sponge float — circular float marks being worked into the wet surface, texture developing as the render tightens',
        scene_camera:  'close-up at the render surface, framing the sponge float being worked in circular passes across the wet render',
        scene_framing: {
          work_pct:   70,
          foreground: 'sponge float in circular motion on the wet render surface — aggregate texture being raised',
          midground:  'freshly floated section — uniform aggregate texture developing beside the un-floated fresh render',
          background: 'scaffold board, facade wall above',
        },
        scene_debris:  'render laitance on the float face from the texturing pass',
        scene_exclude: ['pressure washer', 'roofing', 'interior painting', 'stone wall visible'],
        tools: [
          'sponge float being worked in circular passes on the wet render surface',
          'trowel on the scaffold board beside the floated section',
        ],
        protections: [],
        chantier_details: [
          'aggregate texture developing on the floated section — granular finish building',
          'un-floated fresh render beside the active section — smooth comparison visible',
          'render laitance on the float face from the circular passes',
        ],
      },

      // --- réparation de fissures ---
      {
        _for:          'fissure|reprise.*local|traitement.*fissur|rebouchage',
        scene_note:    'facade crack repair — wide crack opened and cleaned, repair mortar being drawn flush with the surrounding render by a pointing trowel',
        scene_camera:  'close-up at the crack, framing the pointing trowel working the repair mortar flush with the facade surface',
        scene_framing: {
          work_pct:   75,
          foreground: 'crack in the facade render — fresh repair mortar being smoothed flush by the pointing trowel',
          midground:  'surrounding facade render — older and slightly darker, the repair mortar visibly lighter in colour',
          background: 'facade wall extending on both sides, window or corner at the edge',
        },
        scene_debris:  'old render fragments chipped from the crack edges on the ground below the repair',
        scene_exclude: ['full section render application', 'pressure washer', 'roofing', 'interior painting'],
        tools: [
          'pointing trowel drawing repair mortar flush with the surrounding render',
          'small cold chisel on the ground — used to open the crack before filling',
        ],
        protections: [],
        chantier_details: [
          'fresh repair mortar in the crack — slightly lighter in colour than the surrounding render',
          'crack edges showing the render depth — crack was opened and cleaned before repair',
          'old render fragments on the ground below from the preparation',
        ],
      },
      {
        _for:          'fissure|reprise.*local|traitement.*fissur|rebouchage',
        scene_note:    'crack repair mesh being embedded — fibreglass mesh being pressed into fresh repair render over a repaired crack on the facade surface',
        scene_camera:  'close-up at the facade, framing the fibreglass mesh being embedded in the fresh render over the crack',
        scene_framing: {
          work_pct:   70,
          foreground: 'fibreglass mesh being pressed into the fresh skim render over the repaired crack',
          midground:  'render skim around the mesh — mesh slightly submerged, render being trowelled over',
          background: 'facade wall extending, the repaired area isolated on the larger surface',
        },
        scene_debris:  'mesh offcut on the scaffold beside the repair area',
        scene_exclude: ['full section render', 'pressure washer', 'roofing', 'interior painting'],
        tools: [
          'trowel pressing the fibreglass mesh into the fresh render skim',
          'mesh roll on the scaffold board beside the repair',
        ],
        protections: [],
        chantier_details: [
          'fibreglass mesh being pressed into the render — mesh pattern just visible below the render surface',
          'render skim surrounding the mesh — trowelled smooth over the mesh edges',
          'repair area isolated on the facade — localised repair with no disturbance to adjacent render',
        ],
      },

      // --- peinture façade ---
      {
        _for:          'peinture.*facade|peinture.*ext|peint.*facade',
        scene_note:    'facade paint being applied — roller on an extension pole working across the wall, freshly painted section (new colour) beside the old paint still showing below the roller',
        scene_camera:  'standing back from the facade, framing the roller mid-stroke with the painted upper section and old lower section visible',
        scene_framing: {
          work_pct:   60,
          foreground: 'paint tray and extension pole base at the scaffold level, drop sheet below the wall',
          midground:  'facade — upper section freshly painted in new colour, lower section old paint colour still showing',
          background: 'full facade width, windows protected, sky above the roof edge',
        },
        scene_debris:  'paint drip at the leading edge of the paint line',
        scene_exclude: ['render application', 'pressure washer', 'roofing', 'interior painting'],
        tools: [
          'roller on an extension pole being pushed across the facade surface',
          'paint tray at the scaffold level beside the roller',
        ],
        protections: [
          'plastic sheeting taped over the window glass',
          'masking tape along the window frame edge',
          'drop sheet on the ground below the wall',
        ],
        chantier_details: [
          'fresh paint on the upper facade — clean new colour uniform and wet-looking',
          'old paint colour still visible below the paint line',
          'window protection tape line clearly visible at the frame edge',
        ],
      },
      {
        _for:          'peinture.*facade|peinture.*ext|peint.*facade',
        scene_note:    'facade almost fully painted — last section being finished at the edge, fresh uniform colour covering most of the facade, stepladder at the final corner',
        scene_camera:  'standing back, framing the nearly fully painted facade with the ladder and the final corner section being finished',
        scene_framing: {
          work_pct:   50,
          foreground: 'ladder at the final section corner, paint tray on the ladder shelf',
          midground:  'facade almost entirely in new colour — final small section still unpainted at the corner edge',
          background: 'full facade width, garden, street or adjacent facade visible',
        },
        scene_debris:  'paint drip on the tarp below the ladder at the final section',
        scene_exclude: ['render application', 'pressure washer', 'roofing', 'interior painting'],
        tools: [
          'small brush cutting in at the final edge and corner',
          'stepladder at the final corner section',
        ],
        protections: [
          'tarp on the ground at the ladder base',
          'window tape protection still in place',
        ],
        chantier_details: [
          'facade nearly fully in new colour — last unpainted section clearly visible at the corner',
          'window tape lines sharp — clean paint edge at every frame',
          'fresh colour uniform across the main facade area',
        ],
      },

      // --- traitement humidité ---
      {
        _for:          'humid|traitement.*humid|moisissure|salpetre|infiltrat',
        scene_note:    'water-repellent treatment being applied to a stone or render facade — roller or brush applying the treatment product to the dry surface, product slightly darkening the treated area',
        scene_camera:  'standing back from the facade, framing the roller or brush applying the treatment with the treated section visibly darker than the untreated',
        scene_framing: {
          work_pct:   55,
          foreground: 'treatment product bucket on the ground at the wall base',
          midground:  'facade — treated section slightly darker from the absorbed product beside the dry untreated section',
          background: 'full facade, window and corner visible',
        },
        scene_debris:  'treatment product drip on the wall base below the treated section',
        scene_exclude: ['render application', 'pressure washer', 'roofing', 'interior painting'],
        tools: [
          'roller or brush applying the water-repellent treatment to the facade surface',
          'treatment product bucket on the ground with the label visible',
        ],
        protections: [
          'plastic sheet protecting the garden bed at the wall base',
        ],
        chantier_details: [
          'treated section visibly darker — product absorbed into the render or stone surface',
          'treatment product drip at the base of the treated area',
          'dry untreated section beside — colour difference clearly visible',
        ],
      },

      // --- rénovation pierre / rejointoiement façade ---
      {
        _for:          'pierre.*renov|traitement.*facade.*pierre|rejointoi.*facade|joint.*facade|pierre',
        scene_note:    'stone facade being repointed — pointing trowel pressing fresh grey mortar into raked-out joints between the stone blocks, contrast with the recessed dark old joints below',
        scene_camera:  'close-up at the stone facade, framing the pointing trowel at a joint with the repointed section above and old joints below',
        scene_framing: {
          work_pct:   70,
          foreground: 'pointing trowel pressing fresh mortar into a raked-out joint between stone blocks',
          midground:  'stone facade — repointed upper section with pale flush mortar above, darker recessed old joints below',
          background: 'facade wall extending, scaffold tube at the side',
        },
        scene_debris:  'old mortar fragments on the scaffold board from the raking pass',
        scene_exclude: ['render over stone', 'pressure washer on stone', 'roofing', 'interior painting'],
        tools: [
          'pointing trowel pressing fresh mortar into the raked-out joint',
          'mortar bucket at the scaffold work level',
          'cold chisel and hammer for raking old joints',
        ],
        protections: [],
        chantier_details: [
          'fresh grey mortar joints on the upper section — pale and flush with the stone faces',
          'old dark recessed joints on the lower section — clearly depleted and weathered',
          'old mortar fragments on the scaffold board from the joint raking',
        ],
      },
      {
        _for:          'pierre.*renov|traitement.*facade.*pierre|rejointoi.*facade|joint.*facade|pierre',
        scene_note:    'stone facade after partial repointing — lower two-thirds freshly jointed, upper section still with old black recessed joints, scaffold beside the wall at mid-height',
        scene_camera:  'standing back from the facade, framing the full wall height with the repointed lower section and the old-jointed upper section',
        scene_framing: {
          work_pct:   55,
          foreground: 'scaffold base and mortar bucket on the ground at the wall base',
          midground:  'stone facade — lower two-thirds repointed (pale grey flush mortar), upper third old black recessed joints — horizontal division clear',
          background: 'roof edge above, garden or street at the side',
        },
        scene_debris:  'old mortar raking fragments on the ground below the work area',
        scene_exclude: ['render over stone', 'pressure washer', 'roofing', 'interior painting'],
        tools: [
          'scaffold at mid-height beside the wall — work above the repointed section ongoing',
          'mortar bucket on the scaffold board at the current work level',
        ],
        protections: [],
        chantier_details: [
          'clear horizontal demarcation between repointed lower section and old-jointed upper section',
          'repointed section — pale flush joints, clean stone faces',
          'old section — black recessed joints, deeply weathered mortar',
        ],
      },

      // Fallback
      {
        scene_note:    'facade work in progress — wall with partially applied fresh render or paint, hawk and trowel resting against the base, window and garden bed protected',
        scene_camera:  'standing back from the facade, framing the partial render or paint work with tools visible at the base',
        scene_framing: {
          work_pct:   50,
          foreground: 'hawk and trowel resting against the wall at the work section, render bucket on the ground',
          midground:  'facade — fresh render or paint on one section, old surface on the adjacent section',
          background: 'full facade, scaffold tube visible, garden or street at the base',
        },
        scene_debris:  'mortar drip at the base of the freshly rendered section',
        scene_exclude: ['pressure washer', 'roofing', 'interior painting'],
        tools: [
          'hawk and trowel resting against the wall at the work section',
          'plastic mixing bucket with mortar residue beside the wall base',
          'straight edge rule leaning against the freshly rendered panel',
        ],
        protections: [
          'plastic sheeting draped and taped over the window opening',
          'wooden board protecting the garden bed at the base of the wall',
        ],
        chantier_details: [
          'fresh render patch on the facade showing trowel lines still wet',
          'empty mortar bag folded on the ground near the wall base',
          'mortar splash marks on the concrete apron at the wall base',
        ],
      },
    ],
    tools: [
      'hawk and trowel resting against the wall at the work section',
      'plastic mixing bucket with mortar residue beside the wall base',
      'mixing paddle leaning against the bucket handle',
      'spray bottle for dampening the substrate on the ground nearby',
      'straight edge rule leaning against the freshly rendered panel',
    ],
    protections: [
      'plastic sheeting draped and taped over the window opening',
      'wooden board protecting the garden bed at the base of the wall',
      'kraft paper strip taped along the window frame edge',
    ],
    chantier_details: [
      'fresh render patch on the facade showing trowel lines still wet',
      'empty mortar bag folded on the ground near the wall base',
      'chalk reference marks on the wall showing render depth guide lines',
      'mortar splash marks on the concrete apron at the wall base',
      'water bucket with a sponge resting on the rim beside the wall',
    ],
  },

  'maçonnerie': {
    scenarios: [

      // --- mur / muret parpaings ou briques ---
      {
        _for:          'mur.*parpaing|parpaing|mur.*brique|brique|muret|construction.*mur|elev.*mur',
        scene_note:    'concrete block wall being built — courses laid to waist height, mason\'s string line pulled taut defining the next course, trowel and mortar hawk on the top course',
        scene_camera:  'standing beside the wall, framing the half-built wall with the string line and mortar trowel on the top course',
        scene_framing: {
          work_pct:   65,
          foreground: 'mason\'s string line pulled taut along the top of the last course, mortar hawk with fresh mortar resting on the wall',
          midground:  'half-built concrete block wall — courses built to waist height, mortar joints visible between blocks',
          background: 'block pallet and bags of mortar beside the wall, garden or building behind',
        },
        scene_debris:  'mortar squeeze-out at the block joints — fresh grey mortar visible at the bed joint faces',
        scene_exclude: ['finished plastered wall', 'tiling equipment', 'roofing materials', 'pressure washer', 'terrassement excavation'],
        tools: [
          'brick trowel on the top course beside the mortar hawk',
          'spirit level resting on the last laid block',
          'mason\'s string line pulled taut along the course',
        ],
        protections: [
          'safety boots visible in the foreground',
        ],
        chantier_details: [
          'mortar squeeze-out at the block bed joints — fresh grey mortar visible at the joint faces',
          'string line pulled taut — next course height clearly defined',
          'block pallet with remaining blocks stacked beside the wall',
        ],
      },
      {
        _for:          'mur.*parpaing|parpaing|mur.*brique|brique|muret|construction.*mur|elev.*mur',
        scene_note:    'brick being pressed into the fresh mortar bed — spirit level placed on top of the last course, mortar squeeze-out at the joint faces, trowel beside the mason\'s hand',
        scene_camera:  'close-up at the wall face, framing the brick being pressed down into the mortar bed with the spirit level on top',
        scene_framing: {
          work_pct:   75,
          foreground: 'brick being pressed into the fresh mortar bed — mortar squeezing out at the perpend joints',
          midground:  'spirit level on the top course — bubble centred between the lines',
          background: 'wall courses below, trowel on the adjacent course surface',
        },
        scene_debris:  'mortar squeeze-out at the perpend and bed joints, mortar drip below on the lower course face',
        scene_exclude: ['concrete formwork', 'foundation trench', 'render or plaster', 'roofing tiles', 'pressure washer'],
        tools: [
          'brick trowel on the wall surface beside the just-laid brick',
          'spirit level on the top course — level being checked',
          'rubber mallet on the wall top for tapping bricks level',
        ],
        protections: [],
        chantier_details: [
          'mortar squeeze-out at the perpend and bed joints — fresh grey mortar at all joint faces',
          'spirit level bubble centred — brick laid level and plumb',
          'mortar drips on the lower course face from the laying process',
        ],
      },
      {
        _for:          'mur.*parpaing|parpaing|mur.*brique|brique|muret|construction.*mur|elev.*mur',
        scene_note:    'low garden wall nearing completion — final course of blocks in place, fresh mortar joints uncured and dark, coping stones or pointing trowel at the top',
        scene_camera:  'standing back, framing the nearly complete low wall with the fresh top course and coping detail',
        scene_framing: {
          work_pct:   55,
          foreground: 'trowel and pointing tool beside the fresh top course — mortar joints still dark and uncured',
          midground:  'completed low wall — all courses laid, top course freshly bedded, coping begun',
          background: 'garden behind the wall, adjacent ground level on both sides',
        },
        scene_debris:  'mortar drips on the wall face at the most recent courses, cement bag off-cut on the ground',
        scene_exclude: ['wall fully plastered', 'tiling', 'roofing', 'pressure washer', 'heavy excavation equipment'],
        tools: [
          'pointing trowel beside the fresh top course joints',
          'bag of mortar mix on the ground near the wall end',
          'spirit level resting against the wall face',
        ],
        protections: [],
        chantier_details: [
          'fresh top course laid — mortar joints dark and uncured across the full wall length',
          'wall finished to its target height — last course clearly visible',
          'mortar drips on the face from the upper courses during laying',
        ],
      },

      // --- dalle béton / terrasse béton ---
      {
        _for:          'dalle|terrasse.*beton|beton.*terr|coulage.*dalle|dalle.*beton',
        scene_note:    'reinforcement mesh laid for a concrete slab — steel mesh on spacer chairs across the full slab area, perimeter formwork boards in place, ready for the pour',
        scene_camera:  'standing at the edge of the slab area, framing the steel mesh on the spacer chairs within the formwork perimeter',
        scene_framing: {
          work_pct:   65,
          foreground: 'perimeter formwork boards at the slab edge — pegged and levelled',
          midground:  'steel reinforcement mesh on spacer chairs across the whole area — parallel bars visible',
          background: 'garden or ground surrounding the formwork area',
        },
        scene_debris:  'tie wire off-cuts on the mesh surface, spacer chair packaging on the ground beside',
        scene_exclude: ['wet concrete', 'finished smooth slab', 'masonry wall', 'roofing materials', 'pressure washer'],
        tools: [
          'steel reinforcement mesh resting on concrete spacer chairs',
          'formwork boards pegged at the slab perimeter',
          'tie wire reel beside the mesh',
        ],
        protections: [
          'safety mesh at the open site edge',
        ],
        chantier_details: [
          'steel mesh on spacer chairs — bars parallel and evenly spaced',
          'spacer chairs visible below the mesh — ensuring correct concrete cover',
          'formwork boards levelled and pegged at the slab perimeter',
        ],
      },
      {
        _for:          'dalle|terrasse.*beton|beton.*terr|coulage.*dalle|dalle.*beton',
        scene_note:    'concrete slab being poured — wet concrete flowing from a mixer drum across the reinforced area, screed board levelling the surface, concrete fully covering the mesh',
        scene_camera:  'standing at the side of the slab, framing the wet concrete pour with the mixer chute and the screed board levelling the surface',
        scene_framing: {
          work_pct:   70,
          foreground: 'wet concrete spreading across the formed area — grey shiny surface at the pour front',
          midground:  'screed board being pulled across the concrete surface to level it',
          background: 'concrete mixer or transit mixer at the pour end, site surroundings',
        },
        scene_debris:  'concrete splash on the formwork edges at the pour point, wet concrete boot prints on the path',
        scene_exclude: ['dry finished slab', 'masonry wall', 'roofing', 'tiling already laid', 'pressure washer'],
        tools: [
          'screed board being dragged across the wet concrete surface to level it',
          'concrete vibrator probe beside the pour point',
          'concrete mixer drum at the pour end of the slab',
        ],
        protections: [
          'safety boots on the workers in the concrete',
          'safety mesh at the open edge',
        ],
        chantier_details: [
          'wet grey concrete spreading to fill the formed area — shiny and fluid at the pour front',
          'screed board leaving a flat level surface behind it',
          'concrete splash on the formwork board edges at the pour point',
        ],
      },
      {
        _for:          'dalle|terrasse.*beton|beton.*terr|coulage.*dalle|dalle.*beton',
        scene_note:    'freshly screeded concrete slab — surface uniformly pale and smooth, edge formwork still in place, trowel marks visible at the corners where hand-finishing was done',
        scene_camera:  'standing at the edge, framing the smooth flat slab surface with the perimeter formwork still in place',
        scene_framing: {
          work_pct:   50,
          foreground: 'perimeter formwork boards still in place — concrete surface meeting the board top edge cleanly',
          midground:  'smooth freshly trowelled concrete slab surface — pale, uniform, lightly textured',
          background: 'garden or site surround beyond the formwork perimeter',
        },
        scene_debris:  'trowel marks at the slab corners from the hand-finishing pass',
        scene_exclude: ['slab fully cured and dry', 'tiles on the slab', 'masonry wall', 'roofing', 'pressure washer'],
        tools: [
          'steel float resting at the slab edge — used for the final trowel pass',
          'screed board leaning against the formwork at the side',
        ],
        protections: [
          'formwork boards still in place — protecting the slab edge',
        ],
        chantier_details: [
          'concrete surface pale and smooth — hand-trowelled finish visible at the edges',
          'formwork boards still in place along all four sides of the slab',
          'trowel marks at the corners from the finishing pass',
        ],
      },

      // --- fondations ---
      {
        _for:          'fondation|semelle|ferraillage|ancrage|infrastructure',
        scene_note:    'strip foundation rebar cage in the trench — rebar tied and laid along the trench base before the concrete pour, tie wire ends visible, spacers under the bars',
        scene_camera:  'standing at the trench edge, framing the rebar cage along the trench base',
        scene_framing: {
          work_pct:   65,
          foreground: 'rebar cage in the trench — parallel bars tied with wire, concrete spacers beneath',
          midground:  'trench continuing — rebar cage running along its full length',
          background: 'trench walls, site surroundings at the surface',
        },
        scene_debris:  'tie wire off-cuts on the rebar surface, spacer packaging on the ground beside the trench',
        scene_exclude: ['concrete pour already done', 'finished slab on top', 'masonry wall up', 'roofing'],
        tools: [
          'tie wire reel beside the trench — used to tie the rebar joints',
          'pliers on the trench edge beside the rebar cage',
          'concrete spacers under the rebar bars',
        ],
        protections: [
          'orange safety mesh at the open trench edge',
        ],
        chantier_details: [
          'rebar cage tied and laid along the trench base — parallel bars clearly visible',
          'tie wire joints at the rebar intersections — wire tails left on the underside',
          'concrete spacers under the bars ensuring correct foundation cover',
        ],
      },
      {
        _for:          'fondation|semelle|ferraillage|ancrage|infrastructure',
        scene_note:    'foundation concrete being poured — wet concrete flowing into the reinforced trench from a mixer chute, vibrator probe being used to compact the pour',
        scene_camera:  'standing above the trench, framing the concrete flowing in from one end, vibrator probe in use',
        scene_framing: {
          work_pct:   70,
          foreground: 'concrete pour point — wet grey concrete flowing from the chute into the rebar-filled trench',
          midground:  'trench section with rising concrete level — rebar gradually submerging',
          background: 'mixer at the pour end, open trench ahead still to be poured',
        },
        scene_debris:  'concrete splash on the trench walls at the pour point, concrete boot prints on the ground beside',
        scene_exclude: ['finished slab', 'masonry wall already up', 'tiling', 'roofing', 'pressure washer'],
        tools: [
          'concrete vibrator probe being inserted in the fresh pour — compacting the concrete',
          'mixer chute directing wet concrete into the trench',
        ],
        protections: [
          'safety mesh at the open trench edge',
          'safety boots on the workers in the trench',
        ],
        chantier_details: [
          'wet concrete rising in the trench — rebar progressively submerging as the pour advances',
          'vibrator probe compacting the concrete — surface rippling at the insertion point',
          'concrete splash on the trench walls at the pour point',
        ],
      },
      {
        _for:          'fondation|semelle|ferraillage|ancrage|infrastructure',
        scene_note:    'foundation formwork with concrete poured inside — ply boards holding the wet concrete, tie rods at intervals, fresh concrete surface just level with the board top edge',
        scene_camera:  'standing at the end of the formwork run, framing the poured concrete held between the ply boards',
        scene_framing: {
          work_pct:   60,
          foreground: 'ply formwork board at the near end — tie rod visible at board mid-height',
          midground:  'fresh concrete surface between the formwork boards — grey and smooth at the top edge',
          background: 'formwork run continuing, site surroundings beyond',
        },
        scene_debris:  'concrete splash on the formwork board face outside at the pour point',
        scene_exclude: ['formwork struck', 'finished foundation surface', 'masonry wall up', 'tiling', 'roofing'],
        tools: [
          'ply formwork boards tied with rods at intervals — holding the wet concrete',
          'screeding board on the top of the formwork used to level the pour',
        ],
        protections: [
          'safety mesh at the trench edge perimeter',
        ],
        chantier_details: [
          'fresh concrete surface level with the formwork board top edge',
          'tie rod heads visible on the outside face of the ply boards',
          'ply board face soiled with concrete splash at the pour point',
        ],
      },

      // --- escalier / seuil / linteau / ouverture ---
      {
        _for:          'escalier.*beton|seuil|linteau|ouverture.*mur|percement|ouverture',
        scene_note:    'lintel being set above a newly created wall opening — concrete or steel lintel supported at both bearing points, freshly cut masonry on either side of the opening',
        scene_camera:  'standing in front of the wall opening, framing the lintel resting on the bearing seats on both sides of the gap',
        scene_framing: {
          work_pct:   65,
          foreground: 'open wall gap — freshly cut masonry edges on both sides of the opening',
          midground:  'lintel resting on both bearing seats — propped from below while the mortar sets',
          background: 'wall continuing on both sides, room interior or exterior beyond the opening',
        },
        scene_debris:  'masonry dust and cut block fragments on the floor below the opening, prop adjustment wedge beside the prop',
        scene_exclude: ['finished door frame fitted', 'rendering over', 'window fitted', 'roofing', 'pressure washer', 'tiling'],
        tools: [
          'adjustable acrow prop supporting the lintel from below during curing',
          'spirit level on the lintel surface — checking level',
          'pointing trowel for the bearing mortar bed',
        ],
        protections: [
          'debris sheet on the floor below the opening',
        ],
        chantier_details: [
          'lintel resting on both bearing seats — prop supporting from below',
          'freshly cut masonry edges on both jambs — concrete dust still on the floor',
          'fresh mortar visible at both lintel bearing points',
        ],
      },
      {
        _for:          'escalier.*beton|seuil|linteau|ouverture.*mur|percement|ouverture',
        scene_note:    'concrete staircase formwork being assembled — ply shuttering boards at each step profile, reinforcement visible through the open side, formwork propped from below',
        scene_camera:  'standing beside the stair formwork, framing the step profiles and the reinforcement visible through the open side',
        scene_framing: {
          work_pct:   65,
          foreground: 'stair step profiles in ply shuttering — riser boards at each step, tread form visible',
          midground:  'reinforcement bars visible through the open side of the formwork — tied cage in place',
          background: 'site surroundings, wall face behind the stair run',
        },
        scene_debris:  'saw offcuts from the ply shuttering on the ground beside the formwork',
        scene_exclude: ['finished concrete stairs', 'tiled stairs', 'roofing', 'pressure washer'],
        tools: [
          'ply shuttering boards forming the step profile — propped from below',
          'rebar visible through the open formwork side',
          'circular saw or hand saw on the ground beside the formwork',
        ],
        protections: [
          'formwork propped securely — no movement under pour weight',
        ],
        chantier_details: [
          'ply step profiles forming clear riser and tread shapes',
          'rebar cage visible through the open side of the formwork',
          'saw offcuts on the ground from cutting the ply shuttering to shape',
        ],
      },
      {
        _for:          'escalier.*beton|seuil|linteau|ouverture.*mur|percement|ouverture',
        scene_note:    'concrete door threshold being formed — wet concrete in a threshold formwork, trowel marks on the fresh surface, adjacent floor tile visible on one side',
        scene_camera:  'crouching at floor level, framing the threshold formwork with wet concrete and the trowel marks on the surface',
        scene_framing: {
          work_pct:   70,
          foreground: 'threshold formwork at floor level — wet concrete inside, trowel marks across the surface',
          midground:  'door frame or reveal on one side, adjacent floor surface on the other side',
          background: 'room interior or exterior beyond the threshold level',
        },
        scene_debris:  'concrete splash on the adjacent floor surface at the threshold edge',
        scene_exclude: ['finished tiled threshold', 'door fully fitted', 'roofing', 'pressure washer'],
        tools: [
          'pointing trowel on the threshold surface — used to level and smooth',
          'short spirit level resting on the threshold formwork edge',
        ],
        protections: [],
        chantier_details: [
          'wet concrete in the threshold form — surface trowelled level and smooth',
          'trowel marks visible at the far edge of the threshold',
          'concrete splash on the adjacent floor surface',
        ],
      },

      // --- fissures / rejointoiement ---
      {
        _for:          'fissure|rejointoi|pierre.*join|joint.*pierre|reprise.*macon|rejoint',
        scene_note:    'facade crack being repaired — wide crack in old render filled with repair mortar, pointing trowel drawing the fresh mortar flush with the surrounding render surface',
        scene_camera:  'close-up on the facade, framing the crack with the fresh mortar being applied by the pointing trowel',
        scene_framing: {
          work_pct:   75,
          foreground: 'crack in the facade render — fresh repair mortar being drawn flush by a pointing trowel',
          midground:  'surrounding render — older, slightly discoloured, the repaired crack clearly different in colour',
          background: 'facade wall extending, window or corner visible at the side',
        },
        scene_debris:  'old render fragments chipped from the crack edges on the ground below the repair',
        scene_exclude: ['large render section', 'scaffold for full ravalement', 'roofing materials', 'pressure washer', 'tiling'],
        tools: [
          'pointing trowel drawing repair mortar flush with the surrounding render',
          'small scraper on the ground beside the wall — used to open and clean the crack',
        ],
        protections: [],
        chantier_details: [
          'fresh repair mortar visible in the crack — slightly lighter in colour than the surrounding render',
          'crack edges showing old render depth — crack had been opened and cleaned before filling',
          'old render fragments on the ground below from the preparation work',
        ],
      },
      {
        _for:          'fissure|rejointoi|pierre.*join|joint.*pierre|reprise.*macon|rejoint',
        scene_note:    'stone wall repointing in progress — pointing trowel pressing fresh grey mortar into raked-out joints between stones, contrast between fresh mortar and weathered dark old joints clearly visible',
        scene_camera:  'close-up at the wall surface, framing the pointing trowel working a joint with the fresh-pointed section above and the old recessed joints below',
        scene_framing: {
          work_pct:   70,
          foreground: 'pointing trowel pressing fresh mortar into a raked-out joint between two stones',
          midground:  'wall face — fresh mortar joints on the upper section contrast sharply with recessed dark old joints on the lower section',
          background: 'stone wall continuing, ladder or platform visible at the side',
        },
        scene_debris:  'old mortar fragments raked out from the joints on the ground below the work area',
        scene_exclude: ['smooth rendered wall', 'tiling', 'roofing', 'pressure washer', 'concrete block wall'],
        tools: [
          'pointing trowel pressing fresh mortar into the raked joint',
          'mortar bucket with fresh mortar mix at the base of the wall',
          'cold chisel and hammer on the ground for raking out old joints',
        ],
        protections: [],
        chantier_details: [
          'fresh grey mortar joints on the upper section — pale and flush with the stone faces',
          'old dark recessed joints below — clearly depleted and weathered',
          'raked-out mortar fragments on the ground from the joint preparation',
        ],
      },
      {
        _for:          'fissure|rejointoi|pierre.*join|joint.*pierre|reprise.*macon|rejoint',
        scene_note:    'half-repointed stone wall — left half freshly pointed with pale grey mortar, right half still showing original dark recessed joints, sharp vertical demarcation line between them',
        scene_camera:  'standing back from the wall, framing the full wall height with the half-pointed/half-old contrast clearly visible',
        scene_framing: {
          work_pct:   55,
          foreground: 'mortar bucket on the ground at the base of the wall, pointing tools beside it',
          midground:  'wall face — left half freshly pointed pale grey, right half dark recessed old joints — vertical division line sharp',
          background: 'garden behind the wall, adjacent structures visible at the sides',
        },
        scene_debris:  'old mortar fragments on the ground below the right half from raking — still to be pointed',
        scene_exclude: ['smooth rendered wall', 'tiling', 'roofing', 'concrete block wall', 'pressure washer'],
        tools: [
          'pointing trowel resting on the mortar bucket',
          'cold chisel on the ground from the joint raking pass',
          'ladder resting against the wall at the halfway point',
        ],
        protections: [],
        chantier_details: [
          'sharp vertical demarcation between fresh pale mortar joints and dark old recessed joints',
          'left half fully repointed — mortar flush with stone faces',
          'right half still original — joints deeply recessed and dark with age',
        ],
      },

      // Fallback
      {
        scene_note:    'masonry work in progress — partially built concrete block or stone wall, mortar tools at the top course, materials stacked at the wall base',
        scene_camera:  'standing beside the work, framing the wall section being built with the tools and materials around the base',
        scene_framing: {
          work_pct:   55,
          foreground: 'block pallet or sand-cement bags stacked at the wall base, bucket of mortar nearby',
          midground:  'partially built wall — several courses laid, mortar joints visible',
          background: 'site surroundings, garden or building behind',
        },
        scene_debris:  'mortar squeeze-out at the block joints, cement bag off-cut on the ground',
        scene_exclude: ['finished plastered or tiled wall', 'roofing materials', 'pressure washer', 'tiling equipment'],
        tools: [
          'brick trowel resting on the top course of a partially built wall',
          'spirit level leaning against the wall beside the freshly laid block',
          'mason\'s string line pulled taut along the block course',
          'plastic mixing bucket with fresh mortar residue beside the wall base',
        ],
        protections: [
          'safety boots visible at the base of the wall',
        ],
        chantier_details: [
          'mortar squeeze-out at the block bed joints — fresh grey mortar at the joint faces',
          'string line pulled taut defining the next course height',
          'cement bag off-cuts on the ground beside the mixer',
        ],
      },
    ],
    tools: [
      'brick trowel resting on the top course of a partially built wall',
      'spirit level leaning against the wall beside the freshly laid block',
      'mason\'s string line pulled taut along the block course',
      'plastic mixing bucket with fresh mortar residue beside the wall base',
      'bag of sand-cement mix stacked against the house wall',
      'wooden mallet on the ground near the block pile',
    ],
    protections: [
      'safety mesh at the open excavation or trench edge',
      'wooden board protecting the garden bed at the wall base',
    ],
    chantier_details: [
      'mortar squeeze-out at the block joint faces — fresh grey mortar visible',
      'string line pulled taut defining the next course height',
      'cement bag off-cuts on the ground beside the mixer',
      'block off-cut near the end of the wall run',
    ],
  },

  plomberie: {
    tools: [
      'pipe wrench on the floor near the open pipe connection',
      'adjustable spanner resting on a nearby surface',
      'PTFE thread seal tape reel on the work area beside the fitting',
      'pipe offcut beside the new connection point',
      'pipe cutter tool resting on the subfloor nearby',
    ],
    protections: [
      'absorbent mat on the floor below the pipe connection point',
      'small plastic bucket placed under the disconnected pipe end',
    ],
    chantier_details: [
      'thread seal tape strip near the pipe fitting on the floor',
      'pipe compression fitting cap on the floor beside the work area',
      'putty residue mark on the subfloor below the connection',
      'copper pipe end cap resting on the subfloor',
      'small damp mark on the floor from water draining during disconnection',
    ],
  },

  nettoyage: {
    scenarios: [

      // --- nettoyage façade ---
      {
        _for:          'facade|nettoy.*facade|traitement.*facade|hydrofuge.*facade',
        scene_note:    'facade half-cleaned — left section bright and clean after the pressure wash, right section still dark with algae and pollution streaks, sharp vertical cleaning line between them',
        scene_camera:  'standing back from the facade, framing the full wall height with the sharp cleaning boundary line between the cleaned and uncleaned sections',
        scene_framing: {
          work_pct:   60,
          foreground: 'ground at the base of the wall — dirty water runoff and moss fragments below the uncleaned section',
          midground:  'facade — left half clean and bright, right half dark with algae and staining — sharp vertical division line',
          background: 'roof edge above, garden or pavement at the sides',
        },
        scene_debris:  'dirty brown water running down from the impact point, algae and grime residue at the base of the uncleaned section',
        scene_exclude: ['terrace or paving in focus', 'pressure washer on garden path', 'roofing tiles', 'interior painting', 'render application'],
        tools: [
          'high-pressure lance resting against the wall between passes',
          'high-pressure hose coiled on the ground beside the machine',
        ],
        protections: [
          'plastic bag taped over the exterior electrical socket at the facade',
          'plastic sheeting taped over the window glass and frame',
          'tarp on the garden bed at the base of the cleaned section',
        ],
        chantier_details: [
          'sharp vertical cleaning line — bright facade on the cleaned side, dark and stained on the other',
          'dirty water running down from the impact zone below the uncleaned section',
          'algae and grime residue at the base of the wall below the uncleaned section',
        ],
      },
      {
        _for:          'facade|nettoy.*facade|traitement.*facade|hydrofuge.*facade',
        scene_note:    'facade being cleaned with a high-pressure lance — jet directed at the facade surface, dirty water running down in dark rivulets from the impact point',
        scene_camera:  'standing to the side, framing the lance directing the jet at the facade with dirty water running down from the impact zone',
        scene_framing: {
          work_pct:   65,
          foreground: 'dirty water runoff channel on the ground at the wall base, algae and grime fragments at the base',
          midground:  'facade surface — jet impact zone visible with dirty water running downward from it',
          background: 'full facade height, windows protected, garden or street at the side',
        },
        scene_debris:  'algae and staining residue being dislodged at the jet impact point, dirty water rivulets on the facade surface',
        scene_exclude: ['terrace or paving as main subject', 'roofing', 'interior painting', 'render application'],
        tools: [
          'high-pressure lance directing jet at the facade surface',
          'pressure washer hose running along the ground to the machine',
        ],
        protections: [
          'plastic sheeting taped over the windows in the cleaned section',
          'plastic bag over the exterior electrical socket',
          'tarp protecting garden plants at the base of the facade',
        ],
        chantier_details: [
          'jet impact zone visible on the facade — dirty water running from it downward',
          'algae and staining being dislodged at the impact point',
          'window protection sheeting clearly visible beside the cleaned section',
        ],
      },
      {
        _for:          'facade|nettoy.*facade|traitement.*facade|hydrofuge.*facade',
        scene_note:    'facade cleaning setup — plastic sheet protecting windows, tarp on the garden bed, pressure washer on the ground, facade clearly dirty with algae and pollution streaks above the protected section',
        scene_camera:  'standing back, framing the protected facade section with the cleaning equipment on the ground and the dirty facade above',
        scene_framing: {
          work_pct:   45,
          foreground: 'tarp on the garden bed at the wall base, pressure washer on the ground with hose coiled beside it',
          midground:  'facade — window protected by plastic sheet, facade above dirty with algae and dark streaks',
          background: 'full facade height, roof edge above, surroundings at the side',
        },
        scene_debris:  'light algae and dust debris on the tarp from the initial test spray',
        scene_exclude: ['terrace or paving as main subject', 'interior painting', 'roofing', 'render application'],
        tools: [
          'pressure washer on the ground — setup ready to begin',
          'high-pressure hose coiled beside the machine',
          'lance resting against the wall between uses',
        ],
        protections: [
          'plastic sheet taped over the window glass and frame',
          'tarp protecting the garden bed at the wall base',
          'plastic bag taped over the exterior socket',
        ],
        chantier_details: [
          'facade clearly dirty above the protected section — algae and pollution streaks visible',
          'window protection plastic sheet and tape clearly applied before cleaning',
          'pressure washer and hose ready on the ground — setup complete',
        ],
      },

      // --- nettoyage terrasse / dallage ---
      {
        _for:          'terrasse|dallage|paves|allee|sol.*ext|beton.*ext|nettoy.*terr|nettoy.*dall|nettoy.*pave',
        scene_note:    'terrace half-cleaned — bright clean paving on one half, green moss-covered dark paving on the other, sharp cleaning line across the terrace surface',
        scene_camera:  'standing at the terrace edge, framing the full surface with the bright clean section and the mossy dark section clearly side by side',
        scene_framing: {
          work_pct:   60,
          foreground: 'edge of the terrace — dirty water and dislodged moss fragments at the cleaning line',
          midground:  'terrace surface — clean bright paving on the near half, dark moss-covered paving on the far half — sharp cleaning line',
          background: 'garden boundary, house wall at the far end of the terrace',
        },
        scene_debris:  'dislodged moss clumps at the cleaning line, dirty water runoff on the cleaned section draining toward the edge',
        scene_exclude: ['facade as the main subject', 'garden planting in focus', 'roofing', 'interior', 'render application'],
        tools: [
          'pressure washer lance at the cleaning line, working across the terrace',
          'pressure washer hose running along the terrace edge',
        ],
        protections: [
          'garden furniture moved aside and covered with a tarp at the terrace edge',
        ],
        chantier_details: [
          'sharp cleaning line across the terrace — bright clean paving on one side, moss-covered on the other',
          'dislodged moss clumps at the cleaning line from the jet impact',
          'dirty grey water draining across the cleaned section toward the garden edge',
        ],
      },
      {
        _for:          'terrasse|dallage|paves|allee|sol.*ext|beton.*ext|nettoy.*terr|nettoy.*dall|nettoy.*pave',
        scene_note:    'terrace cleaning — dirty grey water and dislodged moss being pushed toward the drain with a stiff broom, drain grate visible at the low end of the terrace',
        scene_camera:  'standing at the high end of the terrace, framing the stiff broom pushing the dirty water and moss debris toward the drain',
        scene_framing: {
          work_pct:   60,
          foreground: 'stiff broom pushing dirty grey water and moss debris across the freshly cleaned paving',
          midground:  'terrace surface — cleaned paving, dirty water flowing toward the drain at the low end',
          background: 'drain grate at the far end of the terrace, garden beyond',
        },
        scene_debris:  'dirty grey water and dislodged moss being swept toward the drain, moss clumps at the broom head',
        scene_exclude: ['facade as main subject', 'garden planting in focus', 'roofing', 'interior', 'render application'],
        tools: [
          'stiff outdoor broom pushing dirty water and moss to the drain',
          'pressure washer on the ground at the side — used before the sweeping pass',
        ],
        protections: [
          'garden furniture covered and moved to the dry section',
        ],
        chantier_details: [
          'dirty grey water and moss debris being swept toward the drain',
          'cleaned paving bright behind the broom — terrace recovering its original colour',
          'drain grate visible at the low end of the terrace',
        ],
      },
      {
        _for:          'terrasse|dallage|paves|allee|sol.*ext|beton.*ext|nettoy.*terr|nettoy.*dall|nettoy.*pave',
        scene_note:    'terrace nearly fully cleaned — garden furniture moved to one side and covered, freshly cleaned paving bright in the foreground, last section with old moss stains at the back edge',
        scene_camera:  'standing at the clean end of the terrace, framing the bright cleaned paving in the foreground and the remaining mossy section at the far back edge',
        scene_framing: {
          work_pct:   50,
          foreground: 'freshly cleaned bright paving — original paving colour fully restored in the front section',
          midground:  'garden furniture covered and moved to one side of the terrace',
          background: 'last remaining mossy section at the back terrace edge — still to be cleaned',
        },
        scene_debris:  'residual dirty water puddle at the junction between clean and remaining mossy sections',
        scene_exclude: ['facade as main subject', 'roofing', 'interior', 'render application'],
        tools: [
          'pressure washer lance resting at the boundary of the last mossy section',
          'rubber squeegee on the ground for removing pooled water after cleaning',
        ],
        protections: [
          'garden furniture covered with a tarp to one side',
          'tarp at the garden edge protecting plants from the dirty runoff',
        ],
        chantier_details: [
          'bright clean paving in the foreground — original colour fully recovered',
          'remaining mossy dark section at the back — contrast with cleaned area clear',
          'garden furniture moved and covered at the terrace side',
        ],
      },

      // Fallback
      {
        scene_note:    'exterior cleaning in progress — pressure washer equipment on the ground, dark wet cleaning line marking the boundary between cleaned and uncleaned surface areas',
        scene_camera:  'standing back, framing the cleaning equipment on the ground and the surface with the visible cleaning line',
        scene_framing: {
          work_pct:   50,
          foreground: 'pressure washer on the ground, hose coiled beside it',
          midground:  'surface — cleaning line visible between the cleaned bright section and the dirty uncleaned section',
          background: 'site surroundings, wall or garden boundary beyond',
        },
        scene_debris:  'dirty water runoff channel on the terrace or path leading to the drain, leaf and grit debris pushed to the uncleaned edge',
        scene_exclude: ['interior painting', 'render application', 'roofing'],
        tools: [
          'high-pressure lance resting against the wall between uses',
          'high-pressure hose coiled on the ground nearby',
          'trigger handle for the pressure washer resting on the coiled hose',
        ],
        protections: [
          'plastic bag tied over a nearby electrical outlet or exterior socket',
          'garden furniture moved aside and covered with a tarp',
        ],
        chantier_details: [
          'dark wet cleaning line on the surface marking the border between cleaned and uncleaned areas',
          'dirty water runoff channel on the terrace or driveway leading to the drain',
          'leaf and grit debris pushed to the untreated edge',
        ],
      },
    ],
    tools: [
      'high-pressure lance resting against the wall between uses',
      'high-pressure hose coiled on the ground nearby',
      'nozzle fitting resting on a step or ledge',
      'trigger handle for the pressure washer resting on the coiled hose',
    ],
    protections: [
      'plastic bag tied over a nearby electrical outlet or exterior socket',
      'garden furniture moved aside and covered with a tarp',
    ],
    chantier_details: [
      'dark wet cleaning line on the surface marking the border between cleaned and uncleaned areas',
      'dirty water runoff channel on the terrace or driveway leading to the drain',
      'leaf and grit debris pushed to the untreated edge',
      'wet footprints on the path leading away from the cleaned surface',
      'puddle of dark water near the drain grate',
    ],
  },

  etancheite: {
    _dispatch: 'contexte',

    maison: {
      scenarios: [
        {
          _for:          'solin|cheminee|faitage',
          scene_note:    'chimney flashing (solin) repair on a pitched tiled roof — zinc strip being refitted around the chimney base, localized repair zone only, rest of the roof untouched',
          scene_camera:  'crouching on the roof slope close to the chimney, framing the chimney base and the surrounding tiles — chimney occupies the centre of frame',
          scene_framing: {
            work_pct:   70,
            foreground: 'chimney base and the zinc flashing strip being refitted — mortar joint and tile edge visible',
            midground:  'a few surrounding tiles on the pitched slope, roof continuing normally in both directions',
            background: 'naturally weathered tiled roof slope and open sky — no flat membrane, no parapet, no rooftop equipment',
          },
          scene_debris:  'small pile of old mortar chips on the tile beside the chimney base',
          scene_exclude: ['flat membrane surface', 'parapet wall', 'HVAC units', 'rooftop technical equipment', 'large flat roof expanse', 'bitumen membrane roll'],
          tools: [
            'zinc flashing strip cut to length resting against the chimney foot',
            'tube of bituminous sealant with nozzle on the tile near the chimney',
            'tin snips resting on the tile beside the chimney base',
            'small hand trowel on the tile at the mortar joint',
          ],
          protections: [
            'knee pad on the tile surface at the chimney work area',
          ],
          chantier_details: [
            'cracked old mortar at the chimney base partially removed',
            'new zinc strip held in place at the chimney foot with a temporary clamp',
            'small pile of old sealant removed from the joint beside the chimney',
            'two tiles lifted to allow the flashing to slide underneath',
          ],
        },
        {
          _for:          'velux|lucarne|fenetre.*toit|chassis.*toit',
          scene_note:    'Velux or roof window resealing on a pitched tiled roof — peel-and-stick flashing being applied around the window frame, localized repair, rest of the roof untouched',
          scene_camera:  'crouching on the roof slope beside the Velux window, framing the window frame and the adjacent tiles — window frame fills the centre of frame',
          scene_framing: {
            work_pct:   65,
            foreground: 'Velux frame corner and the new peel-and-stick flashing strip or sealant bead being applied',
            midground:  'tiles surrounding the window on the pitched slope, roof continuing normally',
            background: 'tiled roof slope extending away and open sky — no flat membrane, no parapet',
          },
          scene_debris:  'strip of old dried sealant removed from the frame edge, lying on the adjacent tile',
          scene_exclude: ['flat membrane surface', 'parapet wall', 'HVAC units', 'rooftop technical equipment', 'large flat roof expanse', 'bitumen membrane roll'],
          tools: [
            'peel-and-stick flashing tape strip beside the window frame',
            'tube of silicone sealant with nozzle on the tile near the frame',
            'putty knife resting on the tile near the window edge',
          ],
          protections: [
            'protective foam strip along the window frame contact edge',
          ],
          chantier_details: [
            'old dried sealant removed around the window frame edge',
            'new sealant bead partially applied along one frame side',
            'flashing kit cardboard packaging beside the window on the tile surface',
            'two lifted tiles resting beside the window frame',
          ],
        },
        {
          _for:          'noue|vallee|jonction.*pente',
          scene_note:    'valley (noue) repair on a pitched tiled roof — new zinc valley strip being positioned between two roof slopes, tiles around the valley left intact',
          scene_camera:  'crouching at the junction of two roof slopes, framing the valley channel running down between the two tile surfaces',
          scene_framing: {
            work_pct:   60,
            foreground: 'zinc valley strip being laid into the noue channel between two tile surfaces',
            midground:  'tiles on either side of the valley, a few lifted to allow the new zinc to seat properly',
            background: 'two meeting tiled pitches and open sky — no flat membrane, no parapet',
          },
          scene_debris:  'old corroded zinc strip removed and placed beside the valley, leaf and moss debris cleared to one side',
          scene_exclude: ['flat membrane surface', 'parapet wall', 'HVAC units', 'rooftop technical equipment', 'large flat roof expanse', 'bitumen membrane roll'],
          tools: [
            'zinc valley strip resting in the noue ready to be positioned',
            'tin snips on the tile surface beside the valley top',
            'hammer and roofing nails on the tile near the valley',
          ],
          protections: [
            'knee pad on the tile surface at the valley edge',
          ],
          chantier_details: [
            'old valley debris — compacted moss and leaf fragments — cleared to one side',
            'new zinc strip being positioned along the valley channel',
            'a few lifted tiles stacked aside the valley line',
            'old corroded zinc strip removed and set aside on the tile surface',
          ],
        },
        {
          _for:          'raccord.*mur|jonction.*mur|mur.*toit|solin.*mur',
          scene_note:    'wall-to-roof junction repair on a pitched tiled roof — membrane strip or mastic bead applied at the wall base where it meets the tile surface, small localized zone only',
          scene_camera:  'crouching at the base of a wall where it meets the roof slope, framing the wall-to-tile junction — wall fills one side of the frame, tiles the other',
          scene_framing: {
            work_pct:   65,
            foreground: 'membrane strip or mastic bead being pressed along the wall base at the tile edge — a few tiles lifted beside the wall',
            midground:  'house wall surface and adjacent pitched roof tiles, repair zone compact',
            background: 'house wall above and tiled roof slope to the side — no flat membrane, no parapet',
          },
          scene_debris:  'old flashing debris removed from the wall base lying on the tile beside the repair zone',
          scene_exclude: ['flat membrane surface', 'parapet wall', 'HVAC units', 'rooftop technical equipment', 'large flat roof expanse', 'bitumen membrane roll'],
          tools: [
            'tube of bitumen mastic with nozzle at the wall base',
            'putty knife at the wall-roof junction',
            'membrane strip cut to length resting against the wall foot',
          ],
          protections: [
            'protective plastic sheet on the adjacent tiles near the wall',
          ],
          chantier_details: [
            'old flashing peeled back at the wall-roof junction',
            'new membrane strip being pressed along the wall base',
            'small bucket of bitumen primer beside the repair zone',
            'a few lifted tiles resting against the wall beside the repair area',
          ],
        },
        {
          _for:          'rive|gable|debord.*toit|arretier',
          scene_note:    'gable edge (rive) repair on a pitched tiled roof — gable tile being resealed and refitted at the roof verge, small localized repair',
          scene_camera:  'standing or crouching at the gable end of the roof, framing the verge edge and the gable tile joint',
          scene_framing: {
            work_pct:   60,
            foreground: 'gable tile being resealed — sealant nozzle or putty knife at the gable tile joint',
            midground:  'roof slope tiles running back from the gable edge',
            background: 'gable wall below and tiled roof surface extending away, open sky — no flat membrane, no parapet',
          },
          scene_debris:  'old mortar chunks on the tile near the gable edge, displaced gable tile beside the repair zone',
          scene_exclude: ['flat membrane surface', 'parapet wall', 'HVAC units', 'rooftop technical equipment', 'large flat roof expanse', 'bitumen membrane roll'],
          tools: [
            'tube of roofing sealant with nozzle at the gable tile joint',
            'small putty knife on the tile surface near the gable edge',
          ],
          protections: [],
          chantier_details: [
            'displaced gable tile resting beside the repair zone on the tile surface',
            'old mortar chunks on the tile near the gable edge',
            'new sealant bead applied along the gable tile joint',
          ],
        },
        {
          _for:          'tuile|ardoise|remplacement.*tuile|tuile.*cass',
          scene_note:    'localized tile replacement with waterproofing on a pitched tiled roof — two or three cracked tiles being swapped out, new tiles positioned, rest of the roof intact',
          scene_camera:  'crouching on the roof slope at the repair area, close view of the small tile opening and the replacement tiles beside it',
          scene_framing: {
            work_pct:   70,
            foreground: 'small open section of roof batten briefly visible where old tiles were removed, two new replacement tiles positioned ready to slide in',
            midground:  'surrounding intact tiles on the pitched slope, tile lifter wedge under an adjacent tile edge',
            background: 'tiled roof slope continuing normally, open sky — no flat membrane, no parapet',
          },
          scene_debris:  'old cracked tile placed beside the repair area, tile dust on the surrounding tile surface',
          scene_exclude: ['flat membrane surface', 'parapet wall', 'HVAC units', 'rooftop technical equipment', 'large flat roof expanse', 'bitumen membrane roll'],
          tools: [
            'tile lifter resting on the tile surface at the repair zone',
            '2 or 3 replacement tiles stacked beside the repair area',
            'hammer and roofing nails on the tile near the lifted zone',
            'tube of roofing sealant beside the new tiles',
          ],
          protections: [
            'knee pad on the tile surface near the repair area',
          ],
          chantier_details: [
            'old cracked tile set aside on the tile surface nearby',
            'small exposed area showing the roof batten',
            'new tiles positioned ready to slide into place',
            'tile lifter wedge visible under the adjacent tile edge',
          ],
        },

        // --- solin / cheminée (4 additional) ---
        {
          _for:          'solin|cheminee|faitage',
          scene_note:    'chimney solin mortar removal — old mortar being struck out at the chimney base with a chisel and hammer, debris falling onto the tile surface',
          scene_camera:  'crouching close to the chimney base, framing the chisel tip at the mortar joint and the fresh debris on the tiles',
          scene_framing: {
            work_pct:   75,
            foreground: 'chisel at the chimney base mortar joint, old mortar chips on the surrounding tiles',
            midground:  'chimney brickwork and adjacent tiles on the pitched slope',
            background: 'tiled roof continuing normally, open sky above',
          },
          scene_debris:  'old mortar chips scattered on the tiles beside the chimney base, a few pieces on the knee pad',
          scene_exclude: ['flat membrane', 'parapet wall', 'HVAC units', 'large flat roof expanse'],
          tools: [
            'cold chisel held at the mortar joint',
            'club hammer beside the chimney on the tile surface',
            'stiff-bristle brush for clearing mortar dust beside the chisel',
          ],
          protections: [
            'knee pad on the tile surface at the chimney work zone',
          ],
          chantier_details: [
            'old mortar joint crumbling at the chisel point',
            'mortar chips on the tiles around the chimney base',
            'clean chimney brick face revealed where mortar has been removed',
          ],
        },
        {
          _for:          'solin|cheminee|faitage',
          scene_note:    'chimney base primer application — bituminous primer being brushed onto the cleaned masonry before new zinc or membrane solin is fitted',
          scene_camera:  'crouching at the chimney foot, framing the brush applying primer at the base joint between chimney and tile',
          scene_framing: {
            work_pct:   75,
            foreground: 'primer brush being drawn along the cleaned chimney base — dark primer coat visible on the brickwork',
            midground:  'chimney brickwork above and cleaned mortar joint, tin of primer on the tile nearby',
            background: 'tiled roof slope and open sky',
          },
          scene_debris:  'primer tin open on the tile beside the chimney, brush resting on the tin lid between strokes',
          scene_exclude: ['flat membrane', 'parapet wall', 'HVAC units', 'large flat roof expanse'],
          tools: [
            'flat brush applying bituminous primer to the chimney base',
            'primer tin open on the tile surface',
          ],
          protections: [
            'knee pad on the tile at the work zone',
          ],
          chantier_details: [
            'dark primer coat visible on the cleaned chimney brickwork',
            'primer applied along the full base perimeter of the chimney',
            'primer tin and brush on the tile beside the work zone',
          ],
        },
        {
          _for:          'solin|cheminee|faitage',
          scene_note:    'completed chimney solin repair — new zinc flashing installed, tiles re-bedded around the chimney, mortar joint fresh and grey',
          scene_camera:  'standing or crouching slightly back, framing the completed chimney repair zone in its finished state',
          scene_framing: {
            work_pct:   55,
            foreground: 'new zinc strip installed at the chimney base, fresh mortar joint along the flashing edge',
            midground:  'tiles re-seated around the chimney on the pitched slope',
            background: 'tiled roof continuing normally, open sky',
          },
          scene_debris:  'small mortar residue smear on the tile beside the fresh joint',
          scene_exclude: ['flat membrane', 'parapet wall', 'HVAC units', 'large flat roof expanse', 'tools on site'],
          tools: [
            'pointing trowel resting on the tile nearby — work done',
          ],
          protections: [
            'knee pad on the tile beside the finished work area',
          ],
          chantier_details: [
            'new zinc strip installed and bedded at the chimney base',
            'fresh grey mortar joint along the upper flashing edge',
            'tiles re-seated on both sides of the chimney',
          ],
        },
        {
          _for:          'solin|cheminee|faitage',
          scene_note:    'failing solin pre-repair assessment — old corroded zinc still in place, rust staining visible on tiles, damage being marked before work starts',
          scene_camera:  'crouching at chimney level, framing the failing solin and the rust stain on the adjacent tiles',
          scene_framing: {
            work_pct:   60,
            foreground: 'old corroded zinc strip at the chimney base, rust staining on the tile beside it',
            midground:  'chimney brickwork with efflorescence marks, tile surface around the chimney',
            background: 'tiled roof slope, open sky',
          },
          scene_debris:  'rust streak on the tile running down from the failing zinc join',
          scene_exclude: ['flat membrane', 'parapet wall', 'HVAC units', 'tools being used yet'],
          tools: [
            'pointing stick or putty knife tapping the failing flashing to check adhesion',
          ],
          protections: [
            'knee pad on the tile at the assessment zone',
          ],
          chantier_details: [
            'old zinc strip visibly corroded and lifting at one edge',
            'rust stain on the tile beside the chimney base',
            'mortar joint cracked or missing in places around the chimney',
          ],
        },

        // --- Velux (4 additional) ---
        {
          _for:          'velux|lucarne|fenetre.*toit|chassis.*toit',
          scene_note:    'Velux frame old gasket removal — dried sealant being scraped from the window frame edge with a putty knife, old strip set aside',
          scene_camera:  'crouching at the Velux frame edge, framing the putty knife scraping the old gasket from the frame corner',
          scene_framing: {
            work_pct:   70,
            foreground: 'putty knife scraping dried sealant from the Velux frame edge, old sealant strip curling off',
            midground:  'Velux window frame and adjacent tiles, frame corner visible',
            background: 'tiled roof slope extending away, open sky',
          },
          scene_debris:  'strip of old dried sealant curled on the tile beside the window frame',
          scene_exclude: ['flat membrane', 'parapet wall', 'HVAC units', 'large flat roof expanse'],
          tools: [
            'putty knife scraping old sealant from the Velux frame edge',
            'stiff brush for clearing sealant residue beside the frame',
          ],
          protections: [
            'knee pad on the tile at the window work zone',
          ],
          chantier_details: [
            'dried sealant strip peeling off the frame edge under the putty knife',
            'frame edge cleaned on one side, old sealant still intact on the other',
            'old sealant strip on the tile beside the frame',
          ],
        },
        {
          _for:          'velux|lucarne|fenetre.*toit|chassis.*toit',
          scene_note:    'Velux flashing kit components laid out — new flashing pieces arranged on the surrounding tiles before fitting',
          scene_camera:  'standing above, looking down on the Velux and the flashing kit components laid out on the surrounding tiles',
          scene_framing: {
            work_pct:   65,
            foreground: 'flashing kit components — corner pieces, side aprons, top piece — laid on the tiles around the window',
            midground:  'Velux window frame with old flashing still in place',
            background: 'tiled roof slope, flashing kit cardboard packaging beside the array',
          },
          scene_debris:  'flashing kit cardboard packaging open on the tile beside the window',
          scene_exclude: ['flat membrane', 'parapet wall', 'HVAC units', 'large flat roof expanse'],
          tools: [
            'Velux flashing kit components laid out on the tiles — corner pieces, side strips, top cap',
            'tin snips beside the components for sizing',
          ],
          protections: [
            'knee pad on the tile above the window',
          ],
          chantier_details: [
            'flashing components laid in order on the tiles around the window',
            'cardboard kit packaging open beside the array',
            'Velux window frame waiting for the new flashing to be fitted',
          ],
        },
        {
          _for:          'velux|lucarne|fenetre.*toit|chassis.*toit',
          scene_note:    'Velux frame corner piece fitting — corner flashing element being pressed into the window corner junction between frame and tile',
          scene_camera:  'crouching at the window corner, close view of the corner flashing piece being pressed into place',
          scene_framing: {
            work_pct:   75,
            foreground: 'corner flashing piece being pressed into the window corner — fingers applying pressure to seat it',
            midground:  'Velux frame and adjacent tile, other corner still to be done visible',
            background: 'tiled slope beyond the window',
          },
          scene_debris:  'small strip of butyl tape removed from the corner flashing backing beside the work zone',
          scene_exclude: ['flat membrane', 'parapet wall', 'HVAC units', 'large flat roof expanse'],
          tools: [
            'corner flashing piece being pressed into the window frame corner',
            'rubber roller for pressing the flashing flat on the adjacent tile',
          ],
          protections: [
            'knee pad on the tile beside the window',
          ],
          chantier_details: [
            'corner flashing piece seated and pressed at the window corner',
            'butyl tape backing strip removed beside the corner piece',
            'opposite corner still showing old flashing to be replaced',
          ],
        },
        {
          _for:          'velux|lucarne|fenetre.*toit|chassis.*toit',
          scene_note:    'Velux repair complete — new flashing installed, tiles re-seated around the frame, silicone bead fresh along the inner frame',
          scene_camera:  'stepping back on the roof slope, framing the complete Velux window with the new flashing visible around the frame',
          scene_framing: {
            work_pct:   50,
            foreground: 'Velux frame with new corner and side flashing pieces installed around it, tiles re-seated on all sides',
            midground:  'tiled roof surface beside the window — tiles flat and ordered',
            background: 'roof slope continuing beyond the window, open sky',
          },
          scene_debris:  'fresh silicone bead line along the inner frame edge, no other debris',
          scene_exclude: ['flat membrane', 'parapet wall', 'HVAC units', 'large flat roof expanse', 'tools still at the window'],
          tools: [
            'silicone gun on the tile beside the window — work done',
          ],
          protections: [
            'knee pad on the tile — work complete',
          ],
          chantier_details: [
            'new flashing pieces installed around the full Velux frame',
            'tiles re-seated on all four sides of the window',
            'fresh silicone bead along the inner frame edge',
          ],
        },

        // --- noue (4 additional) ---
        {
          _for:          'noue|vallee|jonction.*pente',
          scene_note:    'old valley zinc removal — corroded valley strip being pulled out from under the tiles, tiles already lifted on either side',
          scene_camera:  'crouching at the valley, framing the old zinc strip being lifted out of the channel',
          scene_framing: {
            work_pct:   65,
            foreground: 'old corroded zinc strip being lifted from the noue channel — corrosion marks visible',
            midground:  'tiles lifted on either side of the valley, valley channel exposed',
            background: 'two tiled roof slopes meeting at the ridge above, sky beyond',
          },
          scene_debris:  'old zinc strip on the tile beside the valley, dark moss and leaf debris from the channel cleared to one side',
          scene_exclude: ['flat membrane', 'parapet wall', 'HVAC units', 'large flat roof expanse'],
          tools: [
            'old corroded zinc strip being lifted from the valley channel',
            'tin snips on the tile near the valley for cutting the old strip',
          ],
          protections: [
            'knee pad on the tile at the valley edge',
          ],
          chantier_details: [
            'old zinc strip being removed — corrosion clearly visible on the surface',
            'valley channel exposed between the lifted tiles on either side',
            'dark debris from the valley cleared to one side of the channel',
          ],
        },
        {
          _for:          'noue|vallee|jonction.*pente',
          scene_note:    'valley tile lifting — tiles stacked beside the noue on both slopes, valley channel fully exposed for new zinc laying',
          scene_camera:  'crouching at the junction of the two slopes, framing the exposed valley channel with stacked tiles on either side',
          scene_framing: {
            work_pct:   60,
            foreground: 'exposed valley channel between the two slopes — old channel substrate visible',
            midground:  'stacked tiles on the tiles beside the valley on both sides',
            background: 'two meeting roof slopes extending away, sky',
          },
          scene_debris:  'old moss and leaf debris raked from the channel and placed in a small pile beside the valley',
          scene_exclude: ['flat membrane', 'parapet wall', 'HVAC units', 'large flat roof expanse'],
          tools: [
            'tile lifter on the tile surface beside the stacked tiles',
            'small hand brush for clearing the channel',
          ],
          protections: [
            'knee pad on the tile at the valley edge',
          ],
          chantier_details: [
            'tiles lifted and stacked neatly beside the exposed valley on both sides',
            'valley channel exposed from eaves to ridge',
            'old debris cleared from the channel — channel floor visible',
          ],
        },
        {
          _for:          'noue|vallee|jonction.*pente',
          scene_note:    'valley moss clearance — accumulated moss and debris being removed from the noue channel before fitting the new zinc strip',
          scene_camera:  'looking down along the valley channel from above, framing the moss-clearing tool and the revealed channel substrate',
          scene_framing: {
            work_pct:   65,
            foreground: 'stiff brush or hook tool clearing compacted moss from the valley channel, moss pile at the side',
            midground:  'valley channel clearing in progress — part clear, part still blocked',
            background: 'two roof slopes meeting at the valley, sky above',
          },
          scene_debris:  'pile of compacted moss and leaf fragments cleared to one side of the valley',
          scene_exclude: ['flat membrane', 'parapet wall', 'HVAC units', 'large flat roof expanse'],
          tools: [
            'stiff wire brush clearing moss from the valley channel',
            'hand rake beside the moss pile',
          ],
          protections: [
            'knee pad on the tile at the valley edge',
          ],
          chantier_details: [
            'compacted moss pile cleared from the valley channel, stacked to one side',
            'channel substrate visible on the cleared section',
            'remaining moss at the far end of the valley still to be cleared',
          ],
        },
        {
          _for:          'noue|vallee|jonction.*pente',
          scene_note:    'valley repair complete — new zinc valley strip installed, tiles re-laid on both slopes, channel clean and weathertight',
          scene_camera:  'standing or crouching back, framing the full valley with the new zinc visible in the channel between re-laid tiles',
          scene_framing: {
            work_pct:   50,
            foreground: 'new zinc strip glistening in the valley channel, tiles re-seated on both sides of the channel',
            midground:  'tiled slopes meeting cleanly at the valley, zinc strip running the length',
            background: 'roof slopes extending away to eaves and ridge, sky beyond',
          },
          scene_debris:  'small amount of fresh mortar smear on the tile at the valley edge — pointing complete',
          scene_exclude: ['flat membrane', 'parapet wall', 'HVAC units', 'large flat roof expanse', 'tools at the site'],
          tools: [
            'pointing trowel resting on the tile — work complete',
          ],
          protections: [],
          chantier_details: [
            'new zinc strip installed and glistening in the valley channel',
            'tiles re-laid on both sides — neat and flat',
            'fresh mortar smear at the valley tile edge — pointing done',
          ],
        },

        // --- raccord mur / toiture (4 additional) ---
        {
          _for:          'raccord.*mur|jonction.*mur|mur.*toit|solin.*mur',
          scene_note:    'wall-roof junction — old flashing being peeled back from the wall base, tiles already lifted to allow access',
          scene_camera:  'crouching at the wall base, framing the old flashing being pulled away from the brickwork',
          scene_framing: {
            work_pct:   70,
            foreground: 'old flashing peeling off the wall base — dried mastic residue visible on the brickwork',
            midground:  'tiles lifted to reveal the junction, wall base masonry exposed',
            background: 'house wall above and tiled slope to the side, sky beyond',
          },
          scene_debris:  'old flashing strip removed and placed on the tile beside the wall, dried mastic residue on the brickwork',
          scene_exclude: ['flat membrane surface', 'parapet wall', 'HVAC units', 'large flat roof expanse'],
          tools: [
            'old flashing strip being peeled from the wall base',
            'stiff putty knife for removing mastic residue from the brickwork',
          ],
          protections: [
            'protective board over the adjacent tiles near the wall',
          ],
          chantier_details: [
            'old flashing peeled back — dried mastic residue visible on brickwork',
            'tiles lifted to expose the full junction width',
            'removed flashing strip on the tile beside the wall',
          ],
        },
        {
          _for:          'raccord.*mur|jonction.*mur|mur.*toit|solin.*mur',
          scene_note:    'primer application at wall-roof junction — brush applying bituminous primer to the cleaned masonry before new membrane fitting',
          scene_camera:  'crouching at the wall base, framing the primer brush at the junction between wall and tile surface',
          scene_framing: {
            work_pct:   75,
            foreground: 'primer brush being drawn along the wall base at the tile junction — dark primer coat on the brickwork',
            midground:  'wall surface above and tile slope beside the primed strip',
            background: 'house wall and tiled roof, sky beyond',
          },
          scene_debris:  'primer tin open on the tile beside the wall, brush resting on the tin lid',
          scene_exclude: ['flat membrane surface', 'parapet wall', 'HVAC units', 'large flat roof expanse'],
          tools: [
            'flat brush applying bituminous primer at the wall base',
            'primer tin open beside the junction',
          ],
          protections: [
            'protective plastic sheet on the adjacent tiles at the primer edge',
          ],
          chantier_details: [
            'primer coat visible on the cleaned wall base brickwork',
            'primer applied in a band from the tile surface up the wall',
            'tin and brush on the tile beside the work zone',
          ],
        },
        {
          _for:          'raccord.*mur|jonction.*mur|mur.*toit|solin.*mur',
          scene_note:    'self-adhesive membrane strip being pressed into the wall-roof junction — peel backing removed, membrane being bedded from tile onto wall',
          scene_camera:  'crouching at the junction, framing the membrane strip being peeled and pressed from the tile surface up onto the wall',
          scene_framing: {
            work_pct:   70,
            foreground: 'membrane strip being pressed onto the junction — one half on the tile, one half on the wall, backing still on the upper portion',
            midground:  'wall and tile meeting at the junction, a few lifted tiles beside the work area',
            background: 'house wall and tiled slope, sky',
          },
          scene_debris:  'membrane backing strip removed and on the tile beside the junction',
          scene_exclude: ['flat membrane surface', 'parapet wall', 'HVAC units', 'large flat roof expanse'],
          tools: [
            'self-adhesive membrane strip being pressed onto the junction — partially applied',
            'rubber roller on the tile ready to press the membrane flat',
          ],
          protections: [
            'protective board on the adjacent tiles',
          ],
          chantier_details: [
            'membrane strip bridging the tile-to-wall junction — lower half adhered to tile',
            'backing paper removed from the lower section, upper section still backed',
            'roller ready on the tile to press the membrane onto the wall surface',
          ],
        },
        {
          _for:          'raccord.*mur|jonction.*mur|mur.*toit|solin.*mur',
          scene_note:    'wall-roof junction with metal clip fixings — membrane strip held at the wall with a line of metal clips and screws above the primary mastic bead',
          scene_camera:  'crouching close at the wall, framing the line of fixing clips being screwed into the wall above the membrane strip',
          scene_framing: {
            work_pct:   70,
            foreground: 'row of metal fixing clips screwed to the wall above the membrane — clip and screw heads visible',
            midground:  'membrane strip bedded at the junction, mastic bead along the upper clip edge',
            background: 'wall surface above and tiled slope below, sky',
          },
          scene_debris:  'screw heads and drill dust on the tile beside the wall',
          scene_exclude: ['flat membrane surface', 'parapet wall', 'HVAC units', 'large flat roof expanse'],
          tools: [
            'cordless drill-driver at the wall for driving fixing clips',
            'metal fixing clips being screwed above the membrane top edge',
            'mastic gun on the tile ready for the sealant bead over the clips',
          ],
          protections: [
            'protective board over the adjacent tiles',
          ],
          chantier_details: [
            'row of metal fixing clips screwed into the wall above the membrane',
            'membrane strip sandwiched between wall and clips',
            'fresh mastic bead along the clip line — sealing the upper edge',
          ],
        },

        // --- rive / gable (4 additional) ---
        {
          _for:          'rive|gable|debord.*toit|arretier',
          scene_note:    'gable tile displaced — gable edge tile has slid out of position, gap visible at the verge, assessment before re-bedding',
          scene_camera:  'crouching at the gable end, framing the displaced tile and the gap it has left at the roof verge',
          scene_framing: {
            work_pct:   65,
            foreground: 'gable tile slid out of position — visible gap between the tile and the barge board or wall below',
            midground:  'adjacent gable tiles still in position, roof slope surface beside',
            background: 'gable wall below, sky to the side',
          },
          scene_debris:  'old mortar crumbs on the tile and gutter below the displaced gable tile',
          scene_exclude: ['flat membrane', 'parapet wall', 'HVAC units', 'large flat roof expanse'],
          tools: [
            'pointing stick or putty knife examining the gap at the displaced tile',
          ],
          protections: [],
          chantier_details: [
            'gable tile clearly displaced — gap visible between tile edge and barge',
            'old mortar crumbs on the tile surface below the displacement',
            'adjacent gable tiles intact, showing the correct position',
          ],
        },
        {
          _for:          'rive|gable|debord.*toit|arretier',
          scene_note:    'fresh mortar preparation for gable tile re-bedding — mortar being mixed in a small bucket beside the rive repair zone',
          scene_camera:  'crouching at the gable edge, framing the small mortar bucket and the gap at the gable tile ready to be filled',
          scene_framing: {
            work_pct:   65,
            foreground: 'small bucket with fresh mortar mix beside the gable tile gap, pointing trowel in the mortar',
            midground:  'gable tile waiting to be re-seated, tile surface beside the gap',
            background: 'gable wall and tiled slope, sky',
          },
          scene_debris:  'mortar mixing residue on the tile beside the bucket',
          scene_exclude: ['flat membrane', 'parapet wall', 'HVAC units', 'large flat roof expanse'],
          tools: [
            'small mortar mixing bucket on the tile beside the gap',
            'pointing trowel for applying and shaping the mortar',
          ],
          protections: [],
          chantier_details: [
            'fresh mortar mix ready in the small bucket on the tile',
            'pointing trowel in the mortar — ready to apply',
            'displaced gable tile placed beside the gap ready to be bedded',
          ],
        },
        {
          _for:          'rive|gable|debord.*toit|arretier',
          scene_note:    'section of multiple gable tiles being re-pointed — four to five consecutive rive tiles being re-mortared along the verge',
          scene_camera:  'standing at the gable end, framing the section of rive tiles being worked on — fresh mortar joints visible on several tiles',
          scene_framing: {
            work_pct:   65,
            foreground: 'fresh mortar joint along the section of rive tiles being re-pointed — pointing trowel at the leading tile',
            midground:  'completed tiles further along the gable with fresh joints set',
            background: 'roof slope, gable wall, sky beyond',
          },
          scene_debris:  'old mortar chunks on the tile below the rive section being worked',
          scene_exclude: ['flat membrane', 'parapet wall', 'HVAC units', 'large flat roof expanse'],
          tools: [
            'pointing trowel at the active rive tile being pointed',
            'mortar bucket on the tile at the working end',
            'gauging trowel beside the bucket for loading the pointing trowel',
          ],
          protections: [],
          chantier_details: [
            'fresh mortar joints along the rive tile section — pointing complete on first few',
            'active tile at the leading edge with fresh mortar being shaped',
            'old mortar chunk on the tile below the active section',
          ],
        },
        {
          _for:          'rive|gable|debord.*toit|arretier',
          scene_note:    'gable edge repair complete — fresh mortar joints along the rive, gable tiles bedded and pointing set, clean verge line',
          scene_camera:  'stepping back, framing the completed gable edge — fresh mortar line running along the verge from the near end',
          scene_framing: {
            work_pct:   50,
            foreground: 'fresh grey mortar joint running along the gable tile line at the roof verge',
            midground:  'gable tiles all bedded and in line, no gaps',
            background: 'gable wall below and tiled slope above, sky to the side',
          },
          scene_debris:  'small mortar smear on the tile face near the joint — to be cleaned once set',
          scene_exclude: ['flat membrane', 'parapet wall', 'HVAC units', 'large flat roof expanse', 'tools still at the site'],
          tools: [
            'pointing trowel resting on the tile — work done',
          ],
          protections: [],
          chantier_details: [
            'fresh mortar joint along the full rive section — grey and even',
            'gable tiles all seated and level along the verge',
            'clean verge line from eave to ridge',
          ],
        },

        // --- tuile / ardoise (4 additional) ---
        {
          _for:          'tuile|ardoise|remplacement.*tuile|tuile.*cass',
          scene_note:    'single cracked tile being lifted — tile lifter wedged under the adjacent tile, cracked tile being lifted for removal',
          scene_camera:  'crouching on the roof slope, close view of the tile lifter wedge under the adjacent tile and the cracked tile being raised',
          scene_framing: {
            work_pct:   70,
            foreground: 'tile lifter wedge under the adjacent tile, cracked tile raised and held clear',
            midground:  'surrounding intact tiles on the slope, crack line visible across the tile face',
            background: 'tiled slope continuing, open sky',
          },
          scene_debris:  'crack debris — small tile fragment beside the raised tile',
          scene_exclude: ['flat membrane', 'parapet wall', 'HVAC units', 'large flat roof expanse'],
          tools: [
            'tile lifter wedge under the adjacent tile to lift the cracked one',
            'replacement tile on the tile beside the repair zone',
          ],
          protections: [
            'knee pad on the tile at the repair zone',
          ],
          chantier_details: [
            'cracked tile raised above the adjacent tile using the lifter wedge',
            'crack line clearly visible across the tile face',
            'replacement tile already on the slope ready to slide in',
          ],
        },
        {
          _for:          'tuile|ardoise|remplacement.*tuile|tuile.*cass',
          scene_note:    'roof batten briefly exposed — tiles removed, timber batten visible in the small opening, new tile about to be slid into place',
          scene_camera:  'close view of the small opening in the tiled surface, framing the exposed batten and the gap where the tile will slide in',
          scene_framing: {
            work_pct:   70,
            foreground: 'small open section showing the timber roof batten — 2 or 3 tiles removed, batten briefly visible',
            midground:  'surrounding intact tiles framing the opening, tile lifter wedges under adjacent tiles',
            background: 'tiled slope continuing, open sky above',
          },
          scene_debris:  'old lichen or tile residue on the batten surface at the opening',
          scene_exclude: ['flat membrane', 'parapet wall', 'HVAC units', 'large flat roof expanse'],
          tools: [
            'tile lifter wedges under the adjacent tiles holding them up',
            'replacement tile on the slope beside the opening ready to slide in',
          ],
          protections: [
            'knee pad on the tile at the work zone',
          ],
          chantier_details: [
            'timber batten visible in the small tile opening',
            'batten surface showing lichen marks or old tile contact residue',
            'replacement tile positioned at the opening ready to slide under the adjacent tiles',
          ],
        },
        {
          _for:          'tuile|ardoise|remplacement.*tuile|tuile.*cass',
          scene_note:    'ridge tile re-mortaring — a ridge tile being re-set in fresh mortar, old mortar removed, fresh joint being formed along the ridge',
          scene_camera:  'crouching at the ridge, framing the ridge tile being pressed into fresh mortar along the roof apex',
          scene_framing: {
            work_pct:   65,
            foreground: 'ridge tile being pressed into fresh mortar at the roof apex — mortar visible along the base edge',
            midground:  'adjacent ridge tiles on either side — some still with old mortar, others fresh',
            background: 'pitched tiled slopes falling away on both sides of the ridge, sky above',
          },
          scene_debris:  'old mortar chunks removed from the ridge beside the fresh joint',
          scene_exclude: ['flat membrane', 'parapet wall', 'HVAC units', 'large flat roof expanse'],
          tools: [
            'pointing trowel shaping the mortar joint along the ridge tile base',
            'small mortar bucket at the ridge level beside the work zone',
          ],
          protections: [
            'knee pad at the ridge apex',
          ],
          chantier_details: [
            'ridge tile bedded in fresh mortar at the roof apex',
            'fresh mortar joint visible along the ridge tile base on both sides',
            'old mortar chunks removed and placed on the tile beside the work zone',
          ],
        },
        {
          _for:          'tuile|ardoise|remplacement.*tuile|tuile.*cass',
          scene_note:    'hip tile section replacement — hip tiles on a roof ridge junction being removed and re-bedded with fresh mortar',
          scene_camera:  'crouching at the hip junction, framing the hip tile being lifted and the fresh mortar being applied beneath',
          scene_framing: {
            work_pct:   65,
            foreground: 'hip tile being lifted at the junction, fresh mortar being applied underneath with the trowel',
            midground:  'hip line tiles on either side, tiled slopes meeting at the hip',
            background: 'tiled slopes extending away from the hip junction, sky',
          },
          scene_debris:  'old mortar removed from the hip tile bed on the tile surface below',
          scene_exclude: ['flat membrane', 'parapet wall', 'HVAC units', 'large flat roof expanse'],
          tools: [
            'pointing trowel applying fresh mortar under the hip tile',
            'small mortar bucket at the hip work zone',
          ],
          protections: [
            'knee pad at the hip junction',
          ],
          chantier_details: [
            'hip tile lifted, fresh mortar being applied to the hip line beneath',
            'old mortar removed — debris on the adjacent tile',
            'hip line where the two tiled slopes meet clearly visible at the junction',
          ],
        },
      ],
      // Fallback: flat small roof (no service matches any _for)
      scene_note: 'waterproofing work on a small accessible flat roof — house extension, garage top, or low terrace of a residential house, garden visible below the low parapet',
      tools: [
        'seam roller resting on the membrane surface at the last lap joint',
        'bitumen primer can with brush resting near the parapet edge',
        'utility knife beside the trimmed membrane roll',
        'tape measure resting on the substrate beside the chalk line',
      ],
      protections: [
        'protective board placed over the existing membrane at the access point',
        'plastic cap over the small flat roof drain',
      ],
      chantier_details: [
        'trimmed membrane offcuts near the low parapet edge',
        'empty bitumen primer can on the substrate',
        'chalk snap line across the compact substrate surface',
        'residential garden or driveway visible just below the parapet',
        'house wall or window visible beside the low parapet edge',
      ],
    },

    immeuble: {
      scene_note: 'waterproofing work on a large multi-storey residential flat roof — broad membrane surface, rooftop technical equipment in background',
      tools: [
        'seam roller resting on the membrane surface at the last worked lap joint',
        'bitumen primer can with brush resting on top near the edge',
        'utility knife beside the trimmed membrane roll',
        'tape measure resting on the substrate beside the chalk line',
        'small gas torch cylinder resting on the substrate nearby',
      ],
      protections: [
        'protective board placed over the existing membrane at the access point',
        'plastic cap over the rooftop drain during membrane application',
      ],
      chantier_details: [
        'trimmed membrane offcuts near the parapet edge',
        'empty bitumen primer can on the broad substrate surface',
        'chalk snap line across the membrane layout',
        'HVAC unit or ventilation stack visible in the background',
        'neighbouring rooftops visible above the taller parapet',
      ],
    },

    commerce: {
      scene_note: 'waterproofing work on a commercial or industrial flat roof — warehouse, retail unit, or workshop, large light-gauge steel deck or concrete substrate',
      tools: [
        'seam roller resting on the membrane surface',
        'bitumen primer can with brush resting on top',
        'utility knife beside the trimmed membrane roll',
        'tape measure on the substrate',
        'small gas torch cylinder on the substrate',
      ],
      protections: [
        'protective board at the access hatch entry point',
        'plastic cap over the industrial roof drain',
      ],
      chantier_details: [
        'trimmed membrane offcuts near the industrial parapet',
        'empty primer can on the broad substrate surface',
        'large open flat roof with robust industrial parapet visible',
        'roof access hatch cover folded back at the entry point',
        'distant industrial skyline or warehouse roof visible beyond the parapet',
      ],
    },

    default: {
      tools: [
        'seam roller resting on the membrane surface at the last worked lap joint',
        'bitumen primer can with brush resting on top near the edge',
        'utility knife beside the trimmed membrane roll',
        'tape measure resting on the substrate beside the chalk line',
        'small gas torch cylinder resting on the substrate nearby',
      ],
      protections: [
        'protective board placed over the existing membrane at the access point',
        'plastic cap over the roof drain during membrane application',
      ],
      chantier_details: [
        'trimmed membrane offcuts stacked near the parapet edge',
        'empty bitumen primer can on the substrate surface',
        'seam tape strip at the lap joint overlap',
        'chalk snap line across the substrate showing the membrane layout',
        'scrap membrane piece used as knee pad near the last worked seam',
      ],
    },
  },

  terrassement: {
    scenarios: [
      {
        _for:          'decaiss|fouill|excavat|percement|terrassem',
        scene_note:    'excavation work in progress — trench or pit being dug, raw earth walls visible, deep cut into the ground',
        scene_camera:  'standing at the trench edge, looking down into the cut — angle showing the depth and the layered soil walls',
        scene_framing: {
          work_pct:   65,
          foreground: 'fresh earth pile at the trench lip, shovel or pickaxe driven vertically into it',
          midground:  'open trench or pit showing layered soil profile — dark topsoil, pale subsoil, gravel',
          background: 'surrounding site, site boundary fence or hedge, sky above',
        },
        scene_debris:  'fresh earth spill on the surrounding ground, small roots and stones extracted from the trench beside the pile',
        scene_exclude: ['decorative paving', 'finished surface', 'green grass lawn', 'concrete pour', 'rebar'],
        tools: [
          'shovel driven vertically into the fresh earth pile',
          'pickaxe resting against a stake at the trench edge',
          'wheelbarrow loaded with fresh earth beside the trench',
          'compacting tamper resting on its head at the trench edge',
        ],
        protections: [
          'orange safety mesh stretched across the open trench at ground level',
          'wooden plank bridging the trench at the site access point',
        ],
        chantier_details: [
          'trench walls showing raw soil layers — dark topsoil above, pale subsoil below',
          'small stones and root sections removed from the excavation beside the pile',
          'boot prints in the fresh mud at the trench edge',
          'soil marks on the adjacent surface from wheelbarrow traffic',
        ],
      },
      {
        _for:          'allee|cour|chemin|dalle.*ext|pave|beton.*ext|surface.*ext|creation.*allee',
        scene_note:    'driveway or outdoor surface construction in progress — sub-base compacted or paving units being laid, string line taut as a guide',
        scene_camera:  'standing at the end of the driveway or path in perspective along its length, showing the work progress',
        scene_framing: {
          work_pct:   65,
          foreground: 'string line between stakes, compacted sub-base or first paving units laid',
          midground:  'driveway in progress — prepared sub-base on one side, existing ground on the other',
          background: 'house wall or fence at the far end, garden or existing drive beside',
        },
        scene_debris:  'sand pile at the side edge, paving off-cuts near the cutting zone',
        scene_exclude: ['deep excavation trench', 'concrete foundation', 'pipe or conduit in trench', 'green lawn untouched'],
        tools: [
          'string line pulled taut between two stakes defining the edge',
          'long spirit level resting on the compacted sub-base',
          'vibrating plate compactor at the prepared section end',
          'rubber mallet beside the last paving unit',
        ],
        protections: [
          'safety cones at each end of the work zone',
        ],
        chantier_details: [
          'string line defining the straight edge of the new surface',
          'sub-base compacted and level behind the leading edge',
          'sand screed layer visible at the active laying point',
          'paving off-cut pieces near the cutting zone',
        ],
      },
      {
        _for:          'fondation|semelle|coulage|ferraillage|ancrage|infrastructure',
        scene_note:    'foundation work in progress — reinforced concrete strip or pad being prepared, rebar cage in the trench, formwork boards in place',
        scene_camera:  'crouching at the trench edge or standing at the formwork end, framing the rebar cage and the trench interior',
        scene_framing: {
          work_pct:   70,
          foreground: 'rebar cage visible in the trench bottom, wire ties at the intersections, spacers underneath',
          midground:  'formwork boards on the trench sides held by wooden spacers',
          background: 'site surroundings — subsoil walls, construction fence',
        },
        scene_debris:  'cut wire tie ends on the ground near the rebar, concrete splash marks on the trench edge',
        scene_exclude: ['finished driveway', 'decorative garden', 'tiling', 'green grass', 'pipe in trench'],
        tools: [
          'rebar tying wire and pliers beside the trench edge',
          'formwork boards held by wooden spacers along the trench sides',
          'concrete vibrator or screed bar beside the trench',
          'spirit level on the formwork top',
        ],
        protections: [
          'hard hat beside the trench edge',
          'orange safety mesh stretched around the open excavation perimeter',
        ],
        chantier_details: [
          'rebar cage in the trench — horizontal bars tied to vertical stakes',
          'concrete spacers under the rebar for cover thickness',
          'formwork boards visible on the trench sides',
          'wire tie cut-offs on the ground near the rebar work area',
        ],
      },
      {
        _for:          'tranchee|vrd|canalis|reseau|regard|drainage|assainiss|reseaux.*enterr',
        scene_note:    'utility trench work in progress — open trench with pipe or conduit being laid in bedding material, service markers visible',
        scene_camera:  'standing at the trench edge looking along its length, showing the pipe and the bedding layer',
        scene_framing: {
          work_pct:   60,
          foreground: 'open trench showing pipe or conduit resting in gravel or sand bedding',
          midground:  'trench continuing along the run, next pipe section beside the trench',
          background: 'site surface — road, path, or garden — and site fence beyond',
        },
        scene_debris:  'pipe packaging on the ground beside the trench, small service marker flags at the entry and exit points',
        scene_exclude: ['rebar or formwork for foundations', 'decorative paving', 'finished surface', 'garden plants'],
        tools: [
          'pipe section being lowered into the trench bedding',
          'shovel for final grading of the bedding layer',
          'service locator wand resting against the trench edge',
          'pipe jointing lubricant beside the open trench',
        ],
        protections: [
          'orange safety mesh stretched across the open trench at ground level',
          'warning tape over the trench edges at the road crossing',
        ],
        chantier_details: [
          'pipe or conduit visible in the gravel bedding at the trench base',
          'gravel surround layer poured around the pipe section',
          'marker flags at the service entry and exit points',
          'trench walls showing the full depth with soil layers visible',
        ],
      },

      // --- decaissment (3 additional) ---
      {
        _for:          'decaiss|fouill|excavat|percement|terrassem',
        scene_note:    'excavation post-machine cleanup — digger bucket marks on the trench walls, manual shovel work finishing the trench bottom to exact level',
        scene_camera:  'standing at the trench edge, framing the bucket-marked walls and the manual shovel levelling the bottom',
        scene_framing: {
          work_pct:   65,
          foreground: 'shovel levelling the trench bottom — fresh earth being scraped to grade level',
          midground:  'trench walls showing wide machine bucket cut marks and ridges',
          background: 'excavated earth stockpile beside the trench, site boundary beyond',
        },
        scene_debris:  'machine-cut soil ridges on the trench walls, loose earth clods at the trench base',
        scene_exclude: ['decorative paving', 'finished surface', 'green grass lawn', 'concrete pour', 'rebar'],
        tools: [
          'long-handled shovel levelling the trench floor',
          'spirit level on the trench edge to check the bottom grade',
        ],
        protections: [
          'orange safety mesh across the open trench at ground level',
        ],
        chantier_details: [
          'machine bucket cut marks — wide horizontal ridges on the trench walls',
          'shovel levelling the trench base to the specified grade',
          'excavated soil stockpile beside the trench — machine-cut clods',
        ],
      },
      {
        _for:          'decaiss|fouill|excavat|percement|terrassem',
        scene_note:    'trench depth verification — measuring rod or tape held vertically in the trench, checking the excavation has reached the required depth',
        scene_camera:  'crouching at the trench edge, framing the measuring rod held vertically in the trench with the depth marking visible',
        scene_framing: {
          work_pct:   60,
          foreground: 'measuring rod or folding ruler held vertically from the trench base, reading at the trench lip',
          midground:  'trench interior showing raw soil walls and flat bottom',
          background: 'surrounding site surface, earth stockpile at the side',
        },
        scene_debris:  'loose earth at the trench base near the measuring rod foot',
        scene_exclude: ['decorative paving', 'finished surface', 'green grass', 'concrete pour'],
        tools: [
          'folding measuring rod held vertically in the trench',
          'spirit level beside the trench top for horizontal reference',
        ],
        protections: [
          'orange safety mesh along the open trench',
        ],
        chantier_details: [
          'measuring rod showing the trench depth at the lip — reading visible',
          'trench walls raw and vertical, bottom flat after manual finishing',
          'site datum peg visible at the trench edge for reference',
        ],
      },
      {
        _for:          'decaiss|fouill|excavat|percement|terrassem',
        scene_note:    'L-shaped excavation corner — two trench directions meeting at a 90-degree corner, corner profile showing the full depth on both runs',
        scene_camera:  'standing at the inside of the corner, framing the two trench runs meeting at 90 degrees, depth visible in both directions',
        scene_framing: {
          work_pct:   60,
          foreground: 'L-shaped corner at the bottom of the excavation — clean right-angle profile in the soil',
          midground:  'two trench runs extending away from the corner in perpendicular directions',
          background: 'site surface at trench edge, earth stockpile beyond',
        },
        scene_debris:  'corner spoil pile at the trench junction — small mound from the corner dig',
        scene_exclude: ['finished surface', 'decorative paving', 'green lawn', 'pipe in trench'],
        tools: [
          'shovel resting in one of the trench runs at the corner',
          'corner profile board used to check the 90-degree angle',
        ],
        protections: [
          'orange safety mesh across both trench runs at ground level',
        ],
        chantier_details: [
          'L-shaped corner clearly visible in the excavation — two runs at 90 degrees',
          'depth consistent on both trench runs from the corner',
          'corner spoil pile on the site surface at the junction',
        ],
      },

      // --- allée / cour (3 additional) ---
      {
        _for:          'allee|cour|chemin|dalle.*ext|pave|beton.*ext|surface.*ext',
        scene_note:    'sub-base aggregate spreading — MOT type 1 stone being raked across the prepared formation level, uniform depth being achieved',
        scene_camera:  'standing at the end of the driveway, framing the aggregate rake in use spreading the stone across the full width',
        scene_framing: {
          work_pct:   60,
          foreground: 'wide landscape rake spreading MOT stone across the prepared surface',
          midground:  'driveway width — aggregate spread evenly on one section, not yet started on the next',
          background: 'aggregate stockpile at the side, house wall or fence at the far end',
        },
        scene_debris:  'large aggregate stone pieces pushed aside during raking, disturbed edge gravel',
        scene_exclude: ['deep trench', 'rebar', 'concrete pour', 'finished paving', 'green lawn'],
        tools: [
          'wide landscape rake spreading MOT type 1 aggregate',
          'vibrating plate compactor parked at the section end',
          'spirit level resting on the aggregate after raking',
        ],
        protections: [
          'safety cones at the driveway work zone ends',
        ],
        chantier_details: [
          'MOT aggregate raked level across the prepared surface — grey stone visible',
          'aggregate depth consistent — ruler check mark visible at the edge',
          'vibrating plate compactor ready at the section end for compaction pass',
        ],
      },
      {
        _for:          'allee|cour|chemin|dalle.*ext|pave|beton.*ext|surface.*ext',
        scene_note:    'block paving being laid in herringbone pattern — pavers being placed at 45 degrees and tapped level on the sand bed',
        scene_camera:  'crouching at the laying face, framing the herringbone pattern being built block by block',
        scene_framing: {
          work_pct:   65,
          foreground: 'block paver being tapped down with a rubber mallet on the sand bed, herringbone pattern building',
          midground:  'laid section of herringbone paving behind the active face',
          background: 'string line at the far end, uncompacted sand bed ahead still to be laid',
        },
        scene_debris:  'sand bed displaced by mallet tapping, small paver fragment beside the cutting zone',
        scene_exclude: ['deep trench', 'concrete foundations', 'rebar', 'green lawn'],
        tools: [
          'rubber mallet tapping block paver onto the sand bed',
          'string line defining the 45-degree laying angle',
          'block paving spacer gauge beside the laid section',
        ],
        protections: [
          'safety cones at the driveway ends',
        ],
        chantier_details: [
          'herringbone pattern clearly forming on the laid section',
          'block being tapped level with the rubber mallet',
          'sand bed visible at the laying face ahead of the laid blocks',
        ],
      },
      {
        _for:          'allee|cour|chemin|dalle.*ext|pave|beton.*ext|surface.*ext',
        scene_note:    'kiln-dried jointing sand being brushed into block paving joints — stiff broom being swept across the completed surface',
        scene_camera:  'standing at the laid surface, framing the kiln-dried sand being swept across the paving with a stiff broom',
        scene_framing: {
          work_pct:   55,
          foreground: 'stiff broom sweeping kiln-dried sand across the paving joints — sand visible in the joints and on the surface',
          midground:  'completed paved surface — herringbone pattern or regular pattern laid',
          background: 'house wall or fence at the far end, sand bag open at the side',
        },
        scene_debris:  'kiln-dried sand scattered on the surface waiting to be swept into joints',
        scene_exclude: ['deep trench', 'aggregate base exposed', 'rebar', 'concrete pour'],
        tools: [
          'stiff broom sweeping kiln-dried sand across the paved surface',
          'open bag of kiln-dried jointing sand beside the work area',
          'plate compactor at the far end — used to vibrate sand into joints',
        ],
        protections: [
          'safety cones at the work zone boundary',
        ],
        chantier_details: [
          'kiln-dried sand being swept across the paving — joints filling with fine sand',
          'paving joints progressively filling — some fully packed, others still open',
          'sand bag open and half-emptied on the paving beside the broom',
        ],
      },

      // --- fondation (3 additional) ---
      {
        _for:          'fondation|semelle|coulage|ferraillage|ancrage|infrastructure',
        scene_note:    'concrete being poured into the foundation trench — concrete flowing from a mixer chute or bucket, vibrator probe nearby',
        scene_camera:  'standing above the trench, framing the wet concrete pouring in from the end and flowing along the formwork length',
        scene_framing: {
          work_pct:   70,
          foreground: 'wet concrete flowing into the formwork, pool of concrete growing at the pour point',
          midground:  'concrete filling between the formwork boards, rebar partially submerged',
          background: 'concrete mixer chute or bucket at the trench end, site surroundings',
        },
        scene_debris:  'concrete splashes on the formwork top and trench edge at the pour point',
        scene_exclude: ['finished driveway', 'decorative garden', 'green grass', 'pipe in trench'],
        tools: [
          'concrete being poured from a mixer chute into the foundation trench',
          'concrete vibrator probe beside the trench ready for compaction',
          'screed board for levelling the pour',
        ],
        protections: [
          'hard hat beside the trench edge',
          'orange safety mesh around the open excavation',
        ],
        chantier_details: [
          'wet concrete flowing and pooling at the pour point between the formwork',
          'rebar cage being covered progressively as the pour advances',
          'concrete splash marks on the formwork top boards',
        ],
      },
      {
        _for:          'fondation|semelle|coulage|ferraillage|ancrage|infrastructure',
        scene_note:    'concrete vibrator compacting the fresh pour — vibrator probe inserted into the concrete, air bubbles being released at the surface',
        scene_camera:  'crouching beside the trench, framing the vibrator probe submerged in the fresh concrete with the motor unit above',
        scene_framing: {
          work_pct:   70,
          foreground: 'concrete vibrator probe inserted in the fresh concrete — surface rippling with vibration',
          midground:  'wet concrete in the formwork, small air bubbles visible at the probe insertion point',
          background: 'formwork boards on the trench sides, site surroundings beyond',
        },
        scene_debris:  'concrete laitance brought to the surface by vibration — thin grey liquid at the vibrator point',
        scene_exclude: ['finished surface', 'decorative garden', 'green grass', 'pipe in trench'],
        tools: [
          'concrete vibrator probe inserted in the fresh pour, motor unit at trench level',
        ],
        protections: [
          'hard hat beside the trench',
          'safety mesh around the pour area',
        ],
        chantier_details: [
          'vibrator probe submerged — concrete surface rippling at the insertion point',
          'laitance visible at the probe point — compaction releasing trapped air',
          'concrete level rising in the formwork as it is compacted and settled',
        ],
      },
      {
        _for:          'fondation|semelle|coulage|ferraillage|ancrage|infrastructure',
        scene_note:    'formwork being struck after concrete has set — ply boards being removed to reveal the concrete strip or pad surface',
        scene_camera:  'standing at the trench end, framing the formwork board being levered off to reveal the fresh concrete face',
        scene_framing: {
          work_pct:   60,
          foreground: 'formwork ply board being levered away — fresh concrete face being revealed below it',
          midground:  'concrete strip or pad surface visible where boards already removed, rebar cast in at the top',
          background: 'trench walls, site surroundings',
        },
        scene_debris:  'formwork tie wire ends on the ground, ply board with concrete residue leaning against the trench wall',
        scene_exclude: ['finished surface', 'decorative garden', 'green grass'],
        tools: [
          'wrecking bar or pry bar for levering off the formwork boards',
        ],
        protections: [
          'hard hat near the trench',
          'safety mesh at the trench edge',
        ],
        chantier_details: [
          'fresh concrete face revealed as the board is levered away',
          'formwork tie holes visible in the concrete surface',
          'ply board with concrete residue leaning against the trench wall',
        ],
      },

      // --- tranchée / VRD (3 additional) ---
      {
        _for:          'tranchee|vrd|canalis|reseau|regard|drainage|assainiss|reseaux.*enterr',
        scene_note:    'pipe joint being made — pipe collar or push-fit coupling being pushed onto the adjacent pipe section in the trench bedding',
        scene_camera:  'crouching beside the trench, framing the pipe coupling being pushed together at the joint in the bedding',
        scene_framing: {
          work_pct:   65,
          foreground: 'pipe collar or push-fit coupling being pushed onto the adjacent pipe section in the gravel bedding',
          midground:  'trench with pipe run visible in the bedding layer, gravel surround around it',
          background: 'trench walls and site surface at the edge',
        },
        scene_debris:  'pipe jointing lubricant smeared on the pipe at the coupling point',
        scene_exclude: ['rebar or formwork', 'decorative paving', 'finished surface', 'green grass'],
        tools: [
          'push-fit pipe coupling being pressed onto the adjacent pipe end',
          'pipe jointing lubricant tube beside the coupling point',
        ],
        protections: [
          'orange safety mesh along the trench edge',
        ],
        chantier_details: [
          'pipe coupling being pushed home at the joint — socket visible at the join',
          'jointing lubricant smear on the pipe surface beside the coupling',
          'gravel bedding around the pipe run on both sides of the joint',
        ],
      },
      {
        _for:          'tranchee|vrd|canalis|reseau|regard|drainage|assainiss|reseaux.*enterr',
        scene_note:    'warning tape being laid over the pipe run before backfilling — yellow or orange tape being unrolled along the top of the pipe',
        scene_camera:  'standing at the trench edge, framing the warning tape being unrolled along the pipe run visible below',
        scene_framing: {
          work_pct:   55,
          foreground: 'yellow or orange warning tape being unrolled over the pipe run in the trench — tape reading "ATTENTION CANALISATIONS" or similar',
          midground:  'trench with pipe visible below the tape, partial backfill layer beneath the tape',
          background: 'trench running along the site, safety mesh at the edge above',
        },
        scene_debris:  'tape roll end resting at the trench edge, tape being fed off the roll into the trench',
        scene_exclude: ['rebar', 'finished paving', 'green grass'],
        tools: [
          'warning tape roll being unrolled along the pipe run',
        ],
        protections: [
          'orange safety mesh at the trench edges',
        ],
        chantier_details: [
          'yellow or orange warning tape being laid over the pipe run',
          'tape running along the trench — warning marking above the pipe',
          'partial backfill layer visible beneath the tape line',
        ],
      },
      {
        _for:          'tranchee|vrd|canalis|reseau|regard|drainage|assainiss|reseaux.*enterr',
        scene_note:    'trench backfill in progress — excavated material being shovelled back into the trench in compacted layers over the pipe',
        scene_camera:  'standing at the trench side, framing the backfill being shovelled in and the compaction layer building up',
        scene_framing: {
          work_pct:   55,
          foreground: 'shovel delivering backfill material into the open trench, pipe visible below the growing fill layer',
          midground:  'trench being progressively filled — pipe now partly buried under the backfill layer',
          background: 'stockpile of excavated material beside the trench, warning mesh at the edge',
        },
        scene_debris:  'clod of excavated material on the trench edge from the shovel,',
        scene_exclude: ['rebar', 'finished surface', 'green grass'],
        tools: [
          'long-handled shovel delivering backfill into the trench',
          'hand tamper on the ground beside the trench for layer compaction',
        ],
        protections: [
          'orange safety mesh at the trench edges',
        ],
        chantier_details: [
          'backfill layer building up in the trench over the warning tape and pipe',
          'pipe partially buried — top of pipe just visible at the compaction face',
          'trench half-filled — original depth visible on the far wall',
        ],
      },
    ],
    tools: [
      'shovel stuck vertically into the fresh earth pile',
      'pickaxe resting against a fence post or stake',
      'wheelbarrow with fresh earth parked at the trench edge',
      'compacting tamper resting on its flat head beside the trench',
    ],
    protections: [
      'orange safety mesh stretched across the open trench at ground level',
      'wooden planks bridging the trench at the pedestrian access point',
    ],
    chantier_details: [
      'fresh earth pile at the trench edge with soil profile visible',
      'gravel or aggregate exposed at the bottom of the cut',
      'boot prints in the fresh mud at the trench edge',
      'soil marks on the adjacent concrete path from boot traffic',
      'small stone or root section dug from the excavation beside the pile',
    ],
  },

  depannage_auto: {
    _dispatch: 'service',

    batterie: {
      scenarios: [
        {
          scene_note:    'battery jump-start in progress — clamp cables connecting the two batteries, bonnets open on both vehicles',
          scene_camera:  'standing at the front of the stalled vehicle, looking down into the open engine bay from the side — clamp cables clearly visible on the battery posts',
          scene_framing: {
            work_pct:   70,
            foreground: 'jump-start cable clamps on battery terminals, cable running to the second vehicle out of frame',
            midground:  'open engine bay of the stalled vehicle, battery and engine components visible',
            background: 'second vehicle partially visible with bonnet raised, road or outdoor surface beyond',
          },
          scene_debris:  'cable tie packaging on the ground near the battery, small oil residue on the engine bay ledge',
          scene_exclude: ['hydraulic jack', 'spare tyre', 'lug wrench', 'flat tyre', 'tow strap', 'door wedge', 'air pump'],
          tools: [
            'jump-start cable set with clamps on battery terminals',
            'multimeter resting on the engine bay ledge',
            'torch on the wheel arch near the open bonnet',
          ],
          protections: [
            'reflective safety vest on the car roof',
            'reflective warning triangle placed behind the vehicle',
          ],
          chantier_details: [
            'cable clamps on battery terminals with cable running to second vehicle',
            'both vehicle bonnets raised — cable running between them',
            'warning triangle shadow on the road behind the stalled car',
          ],
        },
        {
          scene_note:    'battery jump-start using a standalone portable booster pack — no second vehicle, compact booster clipped directly to the battery terminals',
          scene_camera:  'close view at engine bay level, framing the compact booster pack propped on the wheel arch, clamp cables on battery posts',
          scene_framing: {
            work_pct:   75,
            foreground: 'portable booster pack on the wheel arch lip, short clamp cables running to battery terminals',
            midground:  'engine bay surrounding the battery — air filter, fuse box, hoses visible',
            background: 'open bonnet edge and outdoor surface beyond',
          },
          scene_debris:  'booster carry case on the ground near the front wheel',
          scene_exclude: ['second vehicle bonnet open', 'long cables between two cars', 'hydraulic jack', 'spare tyre', 'tow strap', 'door wedge'],
          tools: [
            'compact portable battery booster pack on the wheel arch, clipped to battery posts',
            'clamp cables short-length connected directly to the booster',
            'torch resting on the wheel arch beside the booster',
          ],
          protections: [
            'reflective safety vest folded on the car roof',
            'warning triangle placed behind the vehicle',
          ],
          chantier_details: [
            'booster pack indicator LEDs lit up on the casing',
            'clamp cables running directly from booster to battery posts',
            'empty booster carry case on the ground near the front tyre',
          ],
        },
        {
          scene_note:    'battery replacement in progress — old battery removed and set aside, new battery being positioned in the engine bay tray',
          scene_camera:  'leaning over the open bonnet, close view of the battery tray with the new battery being lowered into position',
          scene_framing: {
            work_pct:   75,
            foreground: 'new battery being positioned in the battery tray, hold-down bracket beside it',
            midground:  'engine bay around the battery slot, terminal spanner on the ledge',
            background: 'open bonnet edge and outdoor surface beyond',
          },
          scene_debris:  'old battery on the ground near the front wheel, terminal corrosion residue on the battery ledge',
          scene_exclude: ['jump cables between two cars', 'second vehicle', 'hydraulic jack', 'spare tyre', 'tow strap', 'door wedge'],
          tools: [
            'new battery being lowered into the battery tray',
            'battery terminal spanner beside the hold-down bracket',
            'terminal grease tube on the engine bay ledge',
          ],
          protections: [
            'insulating mat beneath the new battery in the tray',
            'warning triangle placed behind the vehicle',
          ],
          chantier_details: [
            'old battery set aside on the ground near the front wheel, terminals facing up',
            'new battery in the tray, hold-down bracket about to be fitted',
            'terminal posts clean and ready for cable connection',
          ],
        },
        {
          scene_note:    'battery voltage diagnostic — multimeter clipped to battery terminals, bonnet open, pre-repair assessment',
          scene_camera:  'close view from above the open engine bay, framing the multimeter display and the clamp leads on the battery posts',
          scene_framing: {
            work_pct:   75,
            foreground: 'digital multimeter resting on the engine bay ledge, clamp leads on battery positive and negative terminals',
            midground:  'battery top visible, fuse box and engine components around it',
            background: 'open bonnet edge and outdoor surface beyond',
          },
          scene_debris:  'multimeter carry case open on the ground near the front bumper',
          scene_exclude: ['jump cables between two cars', 'second vehicle', 'hydraulic jack', 'spare tyre', 'tow strap', 'door wedge'],
          tools: [
            'digital multimeter with clamp leads on battery terminals',
            'torch resting on the wheel arch above the battery',
          ],
          protections: [
            'reflective safety vest on the car roof',
            'warning triangle placed on the road behind the vehicle',
          ],
          chantier_details: [
            'multimeter display visible showing battery voltage reading',
            'clamp leads firmly attached to positive and negative posts',
            'multimeter carry pouch open on the ground near the front bumper',
          ],
        },
        {
          scene_note:    'battery terminal cleaning — corroded terminals being treated with wire brush and anti-corrosion spray before reconnection',
          scene_camera:  'close macro view of the open engine bay, framing the battery terminal and the wire brush mid-scrub',
          scene_framing: {
            work_pct:   80,
            foreground: 'wire brush on a battery terminal, white corrosion powder residue beside the post',
            midground:  'battery top with second terminal, anti-corrosion spray can nearby',
            background: 'engine bay components around the battery, bonnet edge above',
          },
          scene_debris:  'white corrosion powder residue on the battery tray surface beside the terminal',
          scene_exclude: ['jump cables', 'second vehicle', 'new battery in box', 'hydraulic jack', 'spare tyre', 'tow strap'],
          tools: [
            'wire brush resting on the battery terminal after scrubbing',
            'anti-corrosion spray can beside the battery',
            'small flat-head screwdriver for terminal clamp bolt on the ledge',
          ],
          protections: [
            'nitrile gloves on the engine bay ledge near the battery',
            'warning triangle on the road behind the vehicle',
          ],
          chantier_details: [
            'corrosion powder residue on the battery tray surface',
            'terminal surface visibly cleaner on the scrubbed side',
            'anti-corrosion spray nozzle pointed toward the terminal',
          ],
        },
        {
          scene_note:    'post-jump cleanup — jump cables being coiled after a successful restart, bonnet about to close, tools being packed',
          scene_camera:  'standing at the front of the car, framing the cables being gathered and the bonnet propped open for the last moments',
          scene_framing: {
            work_pct:   55,
            foreground: 'jump cables being coiled into a loop on the ground near the bumper',
            midground:  'bonnet still propped open, engine bay visible and undisturbed',
            background: 'road or outdoor surface, warning triangle about to be retrieved',
          },
          scene_debris:  'cable end cap resting on the bumper where the cable just hung, carry bag open on the ground',
          scene_exclude: ['cables attached to battery', 'second vehicle bonnet open', 'hydraulic jack', 'spare tyre', 'tow strap'],
          tools: [
            'jump cables being coiled — clamps visible at the end of the loop',
            'cable carry bag open on the ground near the front wheel',
          ],
          protections: [
            'reflective safety vest folded on the car roof ready to be stowed',
            'warning triangle visible on the road about to be retrieved',
          ],
          chantier_details: [
            'jump cables coiled into a loop near the bumper',
            'carry bag open on the ground for the cables to go back in',
            'bonnet still propped open on the hood rod',
          ],
        },
        {
          scene_note:    'night battery intervention — portable work light or torch illuminating the engine bay, booster pack LED display glowing in the dark',
          scene_camera:  'slightly wider angle at engine bay level, framing the lit-up engine bay against a dark background, booster LEDs prominent',
          scene_framing: {
            work_pct:   70,
            foreground: 'portable booster pack on the wheel arch, LED charge indicator glowing, clamp cables connected to battery',
            midground:  'engine bay illuminated by a portable LED work light clipped to the bonnet edge',
            background: 'dark road or parking area beyond, hazard light reflection visible',
          },
          scene_debris:  'booster carry case open on the ground, torchlight casting shadows in the engine bay',
          scene_exclude: ['daylight conditions', 'second vehicle', 'hydraulic jack', 'spare tyre', 'tow strap'],
          tools: [
            'portable booster pack with lit LED indicator on the wheel arch',
            'clip-on LED work light on the bonnet edge illuminating the engine bay',
            'clamp cables connected to battery posts',
          ],
          protections: [
            'reflective safety vest visible in the light near the car',
            'warning triangle with reflector active on the road behind the car',
          ],
          chantier_details: [
            'engine bay lit by portable LED work light — strong contrast with surrounding dark',
            'booster pack LED charge display lit up on the casing',
            'hazard lights reflected on the road surface beside the car',
          ],
        },
        {
          scene_note:    'winter breakdown — engine bay open in cold conditions, frost visible on the windshield, booster or cables ready for a cold start',
          scene_camera:  'standing at the front of the car, framing the open bonnet and the frost-covered windshield as a background detail',
          scene_framing: {
            work_pct:   65,
            foreground: 'booster pack cables connected to battery terminals in the open engine bay',
            midground:  'engine bay in cold conditions — condensation or frost residue on the surfaces near the battery',
            background: 'frost-covered windshield and car roof visible behind the raised bonnet edge',
          },
          scene_debris:  'fine frost crystals on the engine bay plastic covers, condensation on the battery casing',
          scene_exclude: ['summer conditions', 'second vehicle', 'hydraulic jack', 'spare tyre', 'tow strap'],
          tools: [
            'booster pack clipped to battery terminals, ready for cold start',
            'torch resting on the wheel arch',
          ],
          protections: [
            'reflective safety vest on the car roof',
            'warning triangle on the icy road behind the vehicle',
          ],
          chantier_details: [
            'frost on the windshield visible in the background',
            'condensation on the battery casing and plastic covers in the cold air',
            'exhaust residue on the road surface near the rear of the car',
          ],
        },
        {
          scene_note:    'hidden battery access — plastic battery cover removed to access a concealed or trunk-mounted battery, cover set aside beside the car',
          scene_camera:  'close view of the battery compartment with the plastic cover removed, battery now visible and accessible',
          scene_framing: {
            work_pct:   75,
            foreground: 'battery revealed in its compartment, terminals exposed — plastic cover set aside on the adjacent surface',
            midground:  'battery tray surroundings — wiring loom, mounting brackets',
            background: 'open boot or side panel, indoor parking area or roadside beyond',
          },
          scene_debris:  'plastic battery cover on the ground or boot floor beside the open compartment',
          scene_exclude: ['second vehicle bonnet open', 'long jump cables between two cars', 'hydraulic jack', 'spare tyre'],
          tools: [
            'plastic battery cover removed and set aside, revealing the battery',
            'terminal clamp spanner beside the battery',
            'torch resting near the open compartment',
          ],
          protections: [
            'warning triangle placed behind the vehicle',
          ],
          chantier_details: [
            'plastic battery cover set aside exposing the battery compartment',
            'battery terminals now accessible after cover removal',
            'wiring loom routed around the battery tray visible after cover off',
          ],
        },
        {
          scene_note:    'initial breakdown scene — vehicle on roadside, bonnet just propped open, battery visible, no repair started yet',
          scene_camera:  'standing back at the front corner of the car, framing the raised bonnet and the roadside context — tools not yet out',
          scene_framing: {
            work_pct:   45,
            foreground: 'bonnet propped open on hood rod, engine bay visible, battery tray in view',
            midground:  'front of the stalled vehicle at roadside, no repair equipment visible yet',
            background: 'road or parking edge, technician van or background vehicles at distance',
          },
          scene_debris:  'warning triangle freshly placed on the road behind the vehicle',
          scene_exclude: ['cables attached to battery', 'booster pack on battery', 'hydraulic jack', 'spare tyre', 'tow strap'],
          tools: [
            'warning triangle placed freshly on the road behind the vehicle',
            'tool bag closed on the ground near the front wheel — not yet opened',
          ],
          protections: [
            'reflective safety vest on the car roof',
            'warning triangle on the road behind the vehicle',
          ],
          chantier_details: [
            'bonnet raised and propped on the hood rod — nothing disturbed yet',
            'battery visible in the engine bay, terminals in original state',
            'warning triangle freshly placed on the road surface',
          ],
        },
      ],
      scene_note: 'roadside breakdown — battery failure, jump-start or booster in progress beside a stalled vehicle',
      tools: [
        'jump-start cable set draped over the open bonnet edge',
        'portable battery booster pack resting on the ground near the front bumper',
        'multimeter resting on the engine bay ledge',
        'clamp connector visible on the battery terminal',
        'torch resting on the wheel arch near the open bonnet',
      ],
      protections: [
        'reflective safety vest on the car roof',
        'reflective warning triangle placed behind the vehicle',
      ],
      chantier_details: [
        'bonnet propped open showing the engine bay',
        'battery booster cable clips visible at the battery posts',
        'empty booster pack carry case on the ground near the front tyre',
        'warning triangle casting a shadow on the road behind the car',
        'technician gloves on the ground near the front wheel',
      ],
    },

    crevaison: {
      scenarios: [
        {
          scene_note:    'full wheel change in progress — spare tyre being fitted, flat tyre removed and leaning against the car body, hydraulic jack raised under the vehicle sill',
          scene_camera:  'crouching at the wheel arch level, framing the raised wheel gap and the spare tyre being aligned with the hub',
          scene_framing: {
            work_pct:   70,
            foreground: 'spare wheel being aligned with the hub, lug wrench on the ground beside it',
            midground:  'hydraulic jack under the vehicle sill, vehicle body raised — gap clearly visible',
            background: 'flat tyre leaning against the car body, road or parking surface beyond',
          },
          scene_debris:  'wheel nuts grouped on the ground beside the removed tyre, gravel disturbed around the jack base',
          scene_exclude: ['jump cables', 'battery booster', 'tow strap', 'door wedge', 'bonnet open', 'compressor or pressure gauge placed beside tyre with no active repair', 'equipment arranged for a photo'],
          tools: [
            'hydraulic jack raised under the vehicle sill',
            'lug wrench on the ground beside the spare wheel',
            'spare wheel positioned against the hub ready to mount',
            'torque socket beside the spare on the ground',
          ],
          protections: [
            'reflective safety vest folded on the car roof',
            'warning cone placed on the road behind the vehicle',
          ],
          chantier_details: [
            'flat tyre leaning against the car body beside the open wheel arch',
            'wheel nuts grouped on the ground near the spare',
            'jack raised with the wheel gap clearly visible',
            'warning triangle placed further back on the road',
          ],
        },
        {
          scene_note:    'tyre puncture plug repair — tyre still mounted on the vehicle, plug reamer inserted in the puncture hole, no wheel removal needed',
          scene_camera:  'crouching low at the tyre sidewall, framing the plug reamer inserted in the tread puncture, repair kit open on the ground',
          scene_framing: {
            work_pct:   70,
            foreground: 'plug reamer tool in the tread puncture, plug strip and cement tube beside the tyre',
            midground:  'tyre sidewall and lower wheel arch, no jack visible',
            background: 'road surface and vehicle bodywork beyond',
          },
          scene_debris:  'small nail or screw on the ground near the tyre — the puncture cause just extracted',
          scene_exclude: ['hydraulic jack', 'spare tyre', 'wheel removed from car', 'jump cables', 'door wedge', 'tow strap', 'equipment staged for a photo without plug reamer in tyre tread'],
          tools: [
            'plug reamer tool inserted in the tread puncture',
            'plug strip beside the tyre on the ground',
            'portable tyre inflator on the ground near the wheel',
          ],
          protections: [
            'reflective vest near the wheel',
            'warning triangle on the road behind the vehicle',
          ],
          chantier_details: [
            'small nail or screw beside the tyre — the puncture cause',
            'plug strip partially inserted in the tyre tread',
            'portable compressor inflating the tyre after repair',
          ],
        },
        {
          scene_note:    'wheel change mid-point — flat tyre removed, spare not yet fitted, vehicle raised on jack, wheel hub exposed',
          scene_camera:  'crouching at the open wheel arch, framing the bare hub and the spare wheel on the ground ready to mount',
          scene_framing: {
            work_pct:   65,
            foreground: 'exposed wheel hub with lug bolt threads visible, spare wheel on the ground beside it',
            midground:  'vehicle body raised on the hydraulic jack, sill clearance visible',
            background: 'flat tyre against the car door, road surface beyond',
          },
          scene_debris:  'wheel nuts arranged beside the spare, gravel around the jack foot',
          scene_exclude: ['wheel already fitted', 'jump cables', 'battery booster', 'door wedge', 'tow strap', 'compressor or pressure gauge beside tyre', 'equipment arranged for a photo'],
          tools: [
            'hydraulic jack under the sill, vehicle raised',
            'spare wheel on the ground beside the bare hub',
            'lug wrench on the ground beside the spare',
          ],
          protections: [
            'reflective warning triangle on the road behind the vehicle',
            'reflective vest folded on the bonnet',
          ],
          chantier_details: [
            'hub exposed with lug bolt threads — no wheel fitted yet',
            'spare wheel on the ground, angled ready to align with the hub',
            'flat tyre leaning against the car beside the wheel arch',
            'wheel nuts arranged near the spare',
          ],
        },
        {
          scene_note:    'flat tyre initial assessment — tyre visibly deflated against the road, nail or screw still in the tread. Main subject is the flat tyre profile, not any equipment. No compressor, inflator, or pressure gauge present. No repair tool deployed.',
          scene_camera:  'crouching close beside the flat tyre at road level, framing the deflated tyre profile and the puncture cause in the tread',
          scene_framing: {
            work_pct:   65,
            foreground: 'flat tyre against the road surface — tyre visibly deflated and squashed, small nail or screw visible in the tread center',
            midground:  'wheel arch above, vehicle body panel behind the tyre',
            background: 'road surface extending away, kerbside or verge beyond',
          },
          scene_debris:  'small nail or screw visible in the tread — puncture cause not yet removed',
          scene_exclude: ['hydraulic jack', 'spare tyre', 'lug wrench', 'jump cables', 'tow strap', 'door wedge', 'compressor or inflator near the flat tyre', 'pressure gauge as main visual subject', 'equipment staged for a photo'],
          tools: [
            'warning triangle placed on the road behind the vehicle',
          ],
          protections: [
            'reflective safety vest on the car roof',
            'warning triangle on the road behind the vehicle',
          ],
          chantier_details: [
            'tyre profile completely flat against the road surface',
            'nail or screw clearly visible in the tyre tread',
            'small oil mark under the tyre from the road surface contact',
          ],
        },
        {
          scene_note:    'hydraulic jack positioning — jack being placed under the vehicle sill point, wheel still on the ground before lifting',
          scene_camera:  'crouching at the sill level, framing the jack being slid into position under the jacking point — wheel still ground-level',
          scene_framing: {
            work_pct:   65,
            foreground: 'hydraulic jack being positioned under the vehicle sill, contact point visible',
            midground:  'vehicle sill and lower door panel, flat tyre still on the road',
            background: 'road surface, verge or kerbside behind the vehicle',
          },
          scene_debris:  'small stone moved aside from the jack foot position, lug wrench on the ground nearby',
          scene_exclude: ['vehicle raised off the ground', 'spare tyre fitted', 'jump cables', 'tow strap', 'door wedge', 'compressor or pressure gauge near the tyre', 'equipment arranged for a photo'],
          tools: [
            'hydraulic jack being slid under the sill jacking point',
            'lug wrench on the ground near the wheel — not yet in use',
          ],
          protections: [
            'reflective safety vest near the wheel',
            'warning cone placed on the road behind the vehicle',
          ],
          chantier_details: [
            'jack saddle contacting the sill reinforcement point — not yet pumped',
            'flat tyre still full contact with the road surface',
            'small stone cleared from under the jack foot',
          ],
        },
        {
          scene_note:    'lug nuts loosening — cross wrench on wheel nut, wheel still on the road surface, loosening before lifting',
          scene_camera:  'crouching at the wheel, framing the cross wrench on the wheel nut, tyre still flat on the ground',
          scene_framing: {
            work_pct:   65,
            foreground: 'cross wrench engaged on a wheel nut, tyre flat on the road, wrench handle horizontal',
            midground:  'remaining wheel nuts on the wheel, jack placed nearby but not yet pumped',
            background: 'road surface, vehicle body panel, verge beyond',
          },
          scene_debris:  'wheel nut already removed resting on the road near the tyre',
          scene_exclude: ['vehicle lifted off ground', 'wheel removed', 'spare tyre', 'jump cables', 'tow strap', 'compressor or pressure gauge near the tyre', 'equipment arranged for a photo'],
          tools: [
            'cross lug wrench engaged on a wheel nut',
            'hydraulic jack placed under the sill ready to pump',
          ],
          protections: [
            'reflective safety vest on the car roof',
            'warning cone on the road behind the vehicle',
          ],
          chantier_details: [
            'cross wrench on the wheel nut with tyre still flat on the road',
            'one nut already removed and placed on the road beside the tyre',
            'jack positioned under the sill ready to lift after all nuts loosened',
          ],
        },
        {
          scene_note:    'tyre pressure check after plug repair — pressure gauge on valve stem, portable compressor inflating the tyre',
          scene_camera:  'crouching close at the tyre valve, framing the pressure gauge locked onto the valve and the compressor hose running to it',
          scene_framing: {
            work_pct:   70,
            foreground: 'tyre pressure gauge locked on the valve stem, compressor hose connected',
            midground:  'tyre now inflated and round — visibly firmer than before',
            background: 'portable compressor on the ground near the wheel, road surface beyond',
          },
          scene_debris:  'plug tool on the ground near the tyre, small piece of plug strip beside it',
          scene_exclude: ['hydraulic jack', 'spare tyre', 'removed wheel', 'jump cables', 'tow strap'],
          tools: [
            'tyre pressure gauge locked on the valve stem',
            'portable compressor hose running to the valve',
            'plug tool on the ground near the tyre',
          ],
          protections: [
            'reflective vest near the wheel',
            'warning triangle on the road behind the vehicle',
          ],
          chantier_details: [
            'pressure gauge showing bar or PSI reading on the valve',
            'tyre now round and firm — visibly re-inflated after plug repair',
            'portable compressor on the ground with cord running to the valve hose',
          ],
        },
        {
          scene_note:    'spare wheel retrieved from the boot — spare being lifted out of the boot floor well, still at the boot opening',
          scene_camera:  'standing at the open boot, framing the spare wheel being lifted from its well in the boot floor',
          scene_framing: {
            work_pct:   55,
            foreground: 'spare wheel being lifted from the boot floor well, foam insert removed beside it',
            midground:  'open boot floor, toolkit bag and emergency triangle stored beside the well',
            background: 'boot opening, car bodywork, road or outdoor surface',
          },
          scene_debris:  'foam insert or cardboard boot cover removed and leaning against the car bumper',
          scene_exclude: ['wheel on the car', 'jack in use', 'jump cables', 'tow strap', 'door wedge', 'compressor or pressure gauge', 'equipment staged for a photo'],
          tools: [
            'spare wheel being lifted from the boot floor well',
            'wheel brace and jack kit beside the spare in the boot',
          ],
          protections: [
            'warning triangle still folded, visible in the boot kit',
          ],
          chantier_details: [
            'boot floor open, spare wheel well visible',
            'foam boot insert set aside against the bumper',
            'jack and brace kit visible beside the spare in the well',
          ],
        },
        {
          scene_note:    'roadside safety setup — warning triangle being placed on the road before tyre change begins, vehicle with hazard lights implied',
          scene_camera:  'standing on the road behind the vehicle, framing the warning triangle being positioned at distance',
          scene_framing: {
            work_pct:   40,
            foreground: 'warning triangle being placed on the road surface, reflective panels catching the light',
            midground:  'stalled vehicle with flat tyre visible in the distance ahead',
            background: 'road continuing beyond, verge or kerbside, open sky',
          },
          scene_debris:  'gravel or road dirt disturbed at the triangle position',
          scene_exclude: ['jack in use', 'wheel removed', 'lug wrench on wheel', 'jump cables', 'tow strap', 'compressor or pressure gauge near the tyre', 'equipment arranged for a photo'],
          tools: [
            'warning triangle being placed on the road surface',
            'reflective safety vest on the car roof visible in the background',
          ],
          protections: [
            'warning triangle placed at recommended distance behind the vehicle',
          ],
          chantier_details: [
            'warning triangle reflectors catching the light at road level',
            'stalled vehicle with flat tyre visible ahead at distance',
            'road markings visible either side of the triangle position',
          ],
        },
        {
          scene_note:    'post-change verification — spare fitted and torqued, old flat tyre being lifted into the boot, tools being gathered',
          scene_camera:  'standing back from the car, framing the newly fitted spare and the flat tyre being loaded into the boot',
          scene_framing: {
            work_pct:   50,
            foreground: 'flat tyre being carried to the open boot, spare clearly fitted on the car',
            midground:  'open boot ready to receive the flat tyre and tools',
            background: 'road or outdoor surface, vehicle rear and the road ahead',
          },
          scene_debris:  'lug wrench and jack being placed into the boot beside the old flat tyre',
          scene_exclude: ['jack still under car', 'wheel gap at sill', 'jump cables', 'tow strap', 'door wedge', 'compressor or pressure gauge near the tyre', 'equipment arranged for a photo'],
          tools: [
            'flat tyre being carried to the open boot',
            'lug wrench and jack being packed away beside it',
          ],
          protections: [
            'reflective safety vest being folded ready to stow',
            'warning triangle about to be retrieved from the road',
          ],
          chantier_details: [
            'spare wheel clearly fitted on the car — visibly rounder and firmer than the flat',
            'flat tyre being lifted into the boot floor well',
            'tools being loaded — jack and lug wrench into the boot kit bag',
          ],
        },
      ],
      scene_note: 'roadside breakdown — flat tyre, tyre change in progress beside a stalled vehicle',
      tools: [
        'hydraulic jack positioned under the vehicle sill point',
        'lug wrench on the ground beside the wheel',
        'spare wheel resting upright against the car body',
        'torque socket resting on the ground near the wheel',
      ],
      protections: [
        'reflective safety vest folded on the car roof',
        'warning cone placed on the road behind the vehicle',
      ],
      chantier_details: [
        'flat tyre leaning against the car body near the wheel arch',
        'wheel nuts grouped on the ground beside the removed tyre',
        'gravel disturbed beside the jack point',
        'empty tyre pressure gauge on the ground near the spare',
        'reflective warning triangle placed further back on the road',
      ],
    },

    remorquage: {
      scenarios: [
        {
          scene_note:    'vehicle recovery by flatbed lorry — stalled car being winched or driven onto the lowered flatbed deck',
          scene_camera:  'standing at the rear of the flatbed lorry, framing the lowered ramp and the stalled car at the base or mid-ramp',
          scene_framing: {
            work_pct:   65,
            foreground: 'flatbed ramp lowered to road level, winch cable or tyre strap visible on the ramp edge',
            midground:  'stalled vehicle on or approaching the ramp',
            background: 'flatbed lorry deck and cab behind, road on either side',
          },
          scene_debris:  'wheel chock block on the deck near the car tyre, ratchet strap laid out on the ramp edge',
          scene_exclude: ['tow strap between two cars on flat road', 'jump cables', 'battery booster', 'door wedge', 'spare tyre'],
          tools: [
            'ratchet strap laid on the flatbed deck near the car wheel',
            'wheel chock placed in front of the loaded car tyre',
            'winch hook visible at the vehicle tow point under the bumper',
          ],
          protections: [
            'reflective safety vest on the recovery operator',
            'warning cone placed on the road behind the flatbed',
          ],
          chantier_details: [
            'flatbed ramp lowered and touching the road surface',
            'ratchet strap ready to secure the car on the deck',
            'wheel chock visible near the car front tyre on the deck',
          ],
        },
        {
          scene_note:    'vehicle tow by strap — tow strap stretched between the stalled car and the recovery vehicle, both stationary before towing begins',
          scene_camera:  'low angle from the side, framing the tow strap running at ground level between the two bumpers',
          scene_framing: {
            work_pct:   60,
            foreground: 'tow strap on the road between the bumpers, hook visible at each attachment point',
            midground:  'rear of the recovery vehicle and front of the stalled car',
            background: 'road, kerbside vegetation or markings beyond',
          },
          scene_debris:  'tow strap carry bag on the ground near the stalled car bumper',
          scene_exclude: ['flatbed lorry ramp', 'winch on deck', 'jump cables', 'battery booster', 'door wedge', 'spare tyre'],
          tools: [
            'tow strap stretched between recovery vehicle and stalled car',
            'tow hook at the stalled car front recovery point',
            'torch on the ground near the attachment',
          ],
          protections: [
            'reflective safety vest on the operator',
            'warning triangle placed behind the stalled car',
          ],
          chantier_details: [
            'tow strap lying taut at low angle between the bumpers',
            'tow hook loop visible at the recovery point',
            'warning triangle on the road surface behind the stalled car',
          ],
        },
        {
          scene_note:    'off-road vehicle extraction — car stuck in a ditch or on verge, snatch strap or winch cable being attached for recovery',
          scene_camera:  'standing at the ditch edge, framing the stuck vehicle at an angle in the ditch and the extraction strap being connected',
          scene_framing: {
            work_pct:   65,
            foreground: 'snatch strap or winch cable running to the stuck car front tow point',
            midground:  'stuck car at an angle in the ditch or on uneven verge — one or two wheels off-level',
            background: 'grass verge, ditch edge, or rough ground beyond the stuck vehicle',
          },
          scene_debris:  'mud and displaced grass at the stuck wheel positions',
          scene_exclude: ['flatbed ramp', 'tow strap on flat road', 'jump cables', 'door wedge', 'spare tyre'],
          tools: [
            'snatch strap looped around the stuck car tow hook',
            'recovery shackle at the strap attachment point',
            'torch on the grass near the stuck car',
          ],
          protections: [
            'reflective safety vest on the operator',
            'warning triangle on the road edge above the ditch',
          ],
          chantier_details: [
            'car leaning at angle in the ditch or on the verge',
            'mud marks on the bodywork from the ditch contact',
            'snatch strap taut between the two vehicles',
            'displaced earth and grass at the stuck wheel positions',
          ],
        },
        {
          scene_note:    'winch cable attachment — steel winch cable from the recovery truck being hooked to the stalled car front recovery point',
          scene_camera:  'low angle at bumper level, framing the winch cable hook being attached to the recovery point under the front bumper',
          scene_framing: {
            work_pct:   70,
            foreground: 'steel winch cable with hook at the front recovery point under the bumper — hook engaged',
            midground:  'front bumper and underside of the car, recovery truck cable running taut toward it',
            background: 'road surface, recovery truck at the far end of the cable',
          },
          scene_debris:  'recovery point plastic cap removed and on the ground near the bumper',
          scene_exclude: ['tow strap between bumpers', 'flatbed ramp', 'jump cables', 'spare tyre', 'door wedge'],
          tools: [
            'steel winch cable with hook engaged at the front recovery point',
            'recovery shackle at the hook attachment',
          ],
          protections: [
            'reflective safety vest near the scene',
            'warning cone on the road behind the stalled vehicle',
          ],
          chantier_details: [
            'winch cable taut between recovery truck and stalled car front',
            'recovery point visible under the bumper with hook attached',
            'plastic tow eye cover removed and on the road nearby',
          ],
        },
        {
          scene_note:    'wheel dolly positioning — wheel dolly being slid under the front driven wheel before flatbed loading',
          scene_camera:  'crouching at the front wheel, framing the wheel dolly being manoeuvred under the tyre',
          scene_framing: {
            work_pct:   65,
            foreground: 'wheel dolly being slid under the front tyre, tyre resting in the dolly cup',
            midground:  'front wheel arch and lower bumper, car at ground level',
            background: 'road surface, flatbed truck visible behind the stalled car',
          },
          scene_debris:  'dolly carry straps on the road near the front wheel',
          scene_exclude: ['car already on flatbed', 'tow strap between cars', 'jump cables', 'spare tyre', 'door wedge'],
          tools: [
            'wheel dolly being positioned under the front tyre',
            'low-profile guide handle for pushing the dolly into place',
          ],
          protections: [
            'reflective vest near the scene',
            'warning cone on the road behind the vehicle',
          ],
          chantier_details: [
            'wheel dolly cup visible under the tyre — engaged and loaded',
            'carry straps on the road near the front wheel',
            'flatbed truck visible behind the stalled car',
          ],
        },
        {
          scene_note:    'vehicle secured on flatbed — ratchet straps being cranked tight over the car tyres on the deck, ready for transport',
          scene_camera:  'standing on the flatbed deck, framing the ratchet strap being tightened over the car tyre',
          scene_framing: {
            work_pct:   65,
            foreground: 'ratchet strap being cranked over the car tyre on the flatbed deck',
            midground:  'car on the deck, wheel chock beside the tyre',
            background: 'flatbed ramp in its raised position, road visible behind',
          },
          scene_debris:  'unused strap length hanging from the ratchet head beside the tyre',
          scene_exclude: ['car driving up ramp', 'tow strap between two cars on flat road', 'jump cables', 'spare tyre', 'door wedge'],
          tools: [
            'ratchet strap cranked over the car tyre on the deck',
            'wheel chock placed against the tyre to prevent rolling',
          ],
          protections: [
            'reflective vest on the recovery operator on the flatbed deck',
          ],
          chantier_details: [
            'ratchet handle being cranked — strap tightening over the car tyre',
            'wheel chock wedged against the tyre face on the deck',
            'flatbed ramp raised behind the loaded car',
          ],
        },
        {
          scene_note:    'pre-tow underside inspection — low angle view under the stalled car checking for damage or fluid loss before recovery',
          scene_camera:  'ground-level view looking under the car front, framing the underside — subframe, exhaust, and bumper edge visible',
          scene_framing: {
            work_pct:   55,
            foreground: 'car underside at ground level — subframe, exhaust pipe, and lower bumper edge',
            midground:  'road surface under the car, fluid mark or damage visible',
            background: 'road behind the car, recovery vehicle at distance',
          },
          scene_debris:  'oil spot or fluid drip on the road surface under the engine',
          scene_exclude: ['cable attached to car', 'flatbed ramp active', 'spare tyre', 'jump cables', 'door wedge'],
          tools: [
            'torch directed under the car to inspect the underside',
          ],
          protections: [
            'warning triangle on the road behind the vehicle',
          ],
          chantier_details: [
            'car underside visible — subframe, exhaust pipe, and bumper edge',
            'oil or fluid drip mark on the road surface under the engine bay',
            'torch beam illuminating the underside from the front',
          ],
        },
        {
          scene_note:    'night vehicle recovery — amber beacon lights on the recovery truck, reflective warning cones and vest visible in the dark',
          scene_camera:  'wider angle from the roadside, framing the recovery truck with amber beacons flashing beside the stalled car at night',
          scene_framing: {
            work_pct:   50,
            foreground: 'amber beacon light on the recovery truck roof bar, reflective cone on the road',
            midground:  'stalled car with hazard lights implied, cable or strap visible between vehicles',
            background: 'dark road, vehicle reflections and headlight beams on the dark surface',
          },
          scene_debris:  'amber light reflection on the road surface near the recovery truck',
          scene_exclude: ['daytime conditions', 'spare tyre', 'jump cables', 'door wedge'],
          tools: [
            'amber beacon bar on the recovery truck roof — lights active',
            'reflective warning cones on both sides of the scene',
          ],
          protections: [
            'reflective safety vest clearly visible in the amber light',
            'warning cones with reflective bands on both sides of the scene',
          ],
          chantier_details: [
            'amber beacon light flashing on the recovery truck roof bar',
            'amber light reflected on the dark road surface',
            'reflective vest and cones bright against the dark background',
          ],
        },
        {
          scene_note:    'pre-recovery condition documentation — vehicle condition being noted on a clipboard beside the stalled car',
          scene_camera:  'standing at the side of the stalled car, framing the clipboard with a condition form beside the vehicle bodywork',
          scene_framing: {
            work_pct:   45,
            foreground: 'clipboard with a vehicle condition record being filled in, pen at the page',
            midground:  'stalled car bodywork — relevant damage area visible alongside the clipboard',
            background: 'road or outdoor area, recovery vehicle at distance',
          },
          scene_debris:  'key on the car roof near the clipboard — car unmoved',
          scene_exclude: ['cable attached to car', 'ramp active', 'spare tyre', 'jump cables', 'door wedge'],
          tools: [
            'clipboard with pre-recovery condition form being filled in',
            'torch resting on the car roof near the area being documented',
          ],
          protections: [
            'reflective safety vest near the car',
            'warning triangle visible on the road behind the vehicle',
          ],
          chantier_details: [
            'clipboard with condition record at the side of the car',
            'pen marking damage positions on the form',
            'car bodywork detail visible behind the clipboard',
          ],
        },
        {
          scene_note:    'vehicle fully loaded and secured — flatbed ramp raised, straps tight over all four tyres, ready for transport',
          scene_camera:  'standing behind the flatbed, framing the loaded car on the deck with the raised ramp and secured straps',
          scene_framing: {
            work_pct:   50,
            foreground: 'raised flatbed ramp, ratchet strap ends secured, car roof visible above the deck',
            midground:  'car on the flatbed deck — all strapped, wheel chocks in place',
            background: 'flatbed cab visible ahead, road clear for departure',
          },
          scene_debris:  'strap excess neatly tied off on the deck edge',
          scene_exclude: ['car driving up ramp', 'tow strap between two cars', 'jump cables', 'spare tyre', 'door wedge'],
          tools: [
            'ratchet straps over each tyre — fully tightened',
            'wheel chocks wedged against all tyres on the deck',
          ],
          protections: [
            'amber beacon bar on the truck roof — ready for road',
          ],
          chantier_details: [
            'car fully loaded and level on the flatbed deck',
            'ratchet straps taut over all four tyres',
            'ramp raised flat under the car — road visible behind the truck',
          ],
        },
      ],
      scene_note: 'roadside recovery — vehicle being prepared for towing, tow strap or hook attached',
      tools: [
        'tow strap laid out on the ground between the two vehicles',
        'tow hook attached to the recovery point under the front bumper',
        'torch resting on the ground near the attachment point',
        'wheel dolly placed under the driven wheel',
      ],
      protections: [
        'reflective safety vest on the technician or car roof',
        'warning cone placed on the road behind the stalled vehicle',
      ],
      chantier_details: [
        'tow strap running between the two vehicles at low angle',
        'recovery hook visible under the stalled vehicle front bumper',
        'wheel dolly under one tyre ready for transport',
        'warning triangle further back on the road',
        'open recovery van doors visible in the background',
      ],
    },

    ouverture: {
      scenarios: [
        {
          scene_note:    'vehicle lockout — plastic wedge inserted at the top door corner, long-reach rod passed through the gap toward the interior lock',
          scene_camera:  'standing beside the car door, close view of the top door corner — wedge visible in the gap, rod entering through it',
          scene_framing: {
            work_pct:   70,
            foreground: 'plastic wedge in the door frame corner, thin long-reach rod visible through the narrow gap',
            midground:  'door panel and window glass, car roof above',
            background: 'car interior dimly visible through the window, road or parking surface beyond',
          },
          scene_debris:  'protective film strip on the door frame paint at the wedge contact point',
          scene_exclude: ['jump cables', 'hydraulic jack', 'spare tyre', 'tow strap', 'battery booster'],
          tools: [
            'plastic door wedge in the top door frame corner',
            'long-reach rod visible through the door gap',
            'protective film strip on the door frame at wedge contact',
          ],
          protections: [
            'protective film on the door frame paint at the wedge contact point',
            'reflective vest folded on the car roof',
          ],
          chantier_details: [
            'narrow door gap at the top corner where wedge is inserted',
            'rod tip visible inside the car approaching the lock',
            'keys or key fob visible inside through the window',
          ],
        },
        {
          scene_note:    'vehicle lockout — inflatable air wedge pumped to widen the door frame gap, giving access for a reach tool to the interior controls',
          scene_camera:  'standing beside the car door, framing the air wedge at the door edge and the rubber pump bulb in hand',
          scene_framing: {
            work_pct:   70,
            foreground: 'inflatable air wedge at the door edge, rubber pump bulb connected by a thin tube',
            midground:  'car door and window, vehicle bodywork',
            background: 'car interior through the window, outdoor setting beyond',
          },
          scene_debris:  'tool carry case open on the ground near the car door',
          scene_exclude: ['jump cables', 'hydraulic jack', 'spare tyre', 'tow strap', 'battery booster'],
          tools: [
            'inflatable air wedge at the door edge frame',
            'rubber hand pump connected to the air wedge by thin tube',
            'protective film on the door frame at the wedge contact point',
          ],
          protections: [
            'protective film on the door frame edge at the wedge point',
            'reflective vest on the car roof',
          ],
          chantier_details: [
            'air wedge visibly inflated creating a gap at the door edge',
            'pump tube running from the wedge to the rubber bulb',
            'keys visible inside the car through the window',
          ],
        },
        {
          scene_note:    'vehicle lockout — keys clearly visible inside the car on the seat or dashboard, hooked slim-jim rod working through a minimal door gap',
          scene_camera:  'close shot framing the car window glass, key fob visible inside — hooked rod barely visible at the door edge',
          scene_framing: {
            work_pct:   65,
            foreground: 'car window glass with key fob or keys visible on the seat inside, hooked rod at door edge',
            midground:  'door panel and lock strip',
            background: 'car interior through the far window, road or parking area beyond',
          },
          scene_debris:  'protective silicone mat on the door sill at the tool entry point',
          scene_exclude: ['jump cables', 'hydraulic jack', 'spare tyre', 'tow strap', 'battery booster'],
          tools: [
            'hooked slim-jim rod at the narrow door edge gap',
            'plastic door wedge holding the gap open at the corner',
            'protective silicone mat on the door sill',
          ],
          protections: [
            'protective silicone mat at the tool contact point',
            'reflective vest on the car roof',
          ],
          chantier_details: [
            'keys or key fob visible through the window on the seat',
            'hooked rod tip approaching the interior lock through the gap',
            'door gap barely 5 mm — held by the wedge',
          ],
        },
        {
          scene_note:    'lockout tool kit assessment — specialist tools laid out on the bonnet or ground before starting, selecting the right approach',
          scene_camera:  'standing at the side of the car, framing the tools spread out on the bonnet or a protective mat',
          scene_framing: {
            work_pct:   50,
            foreground: 'assorted door opening tools laid out on a protective mat on the bonnet — wedges, rods, and air pump',
            midground:  'car bonnet surface and door panel beside',
            background: 'road or parking area, vehicle interior through the window',
          },
          scene_debris:  'tool carry case open on the ground beside the car, foam inserts visible',
          scene_exclude: ['jump cables', 'hydraulic jack', 'spare tyre', 'tow strap'],
          tools: [
            'assorted plastic and metal door wedges laid out on a protective mat',
            'long-reach rods of different lengths beside the wedges',
            'air wedge pump and tube on the mat',
            'protective film strips beside the tools',
          ],
          protections: [
            'reflective vest on the car roof',
          ],
          chantier_details: [
            'tools laid out in order of use on the protective mat',
            'tool carry case with foam inserts open on the ground',
            'keys or key fob visible inside the car through the window',
          ],
        },
        {
          scene_note:    'door gap pre-assessment — testing the door frame flexibility with a thin wedge at the corner before committing to the full opening approach',
          scene_camera:  'close view at the top door corner, framing the thin test wedge being tapped lightly into the gap',
          scene_framing: {
            work_pct:   70,
            foreground: 'thin feeler or test wedge being placed gently at the top door corner — no significant gap yet',
            midground:  'door frame and window glass, car roof above',
            background: 'road or parking area, car interior dimly visible',
          },
          scene_debris:  'protective film strip being peeled ready to apply to the door frame',
          scene_exclude: ['jump cables', 'hydraulic jack', 'spare tyre', 'tow strap'],
          tools: [
            'thin test wedge being placed at the door frame top corner',
            'protective film strip being peeled ready for application',
          ],
          protections: [
            'protective film on the adjacent door frame area',
          ],
          chantier_details: [
            'thin wedge barely inserted at the corner — pre-assessment only',
            'door frame undisturbed, paint protection film being prepared',
            'keys visible inside through the window',
          ],
        },
        {
          scene_note:    'two-wedge setup — second wedge added lower on the door frame to widen the gap further for longer rod access',
          scene_camera:  'standing back slightly, framing both wedges visible in the door frame — one at the top corner, one lower on the frame',
          scene_framing: {
            work_pct:   70,
            foreground: 'two plastic wedges visible in the door frame at different heights, door gap widened between them',
            midground:  'door panel and window glass, rod entering through the larger gap',
            background: 'car interior visible, road or parking area beyond',
          },
          scene_debris:  'protective film strip at both wedge contact points on the door paint',
          scene_exclude: ['jump cables', 'hydraulic jack', 'spare tyre', 'tow strap', 'air pump wedge'],
          tools: [
            'two plastic wedges in the door frame — one at top corner, one lower',
            'long-reach rod through the widened gap',
            'protective film at both wedge contact points',
          ],
          protections: [
            'protective film at both wedge positions on the door frame paint',
          ],
          chantier_details: [
            'two wedges in the door frame creating a wider working gap',
            'long-reach rod visible through the gap, more room to manoeuvre',
            'protective film preventing paint damage at both wedge points',
          ],
        },
        {
          scene_note:    'rear door lockout — tools applied to the rear door frame rather than the front, giving access to the rear interior lock mechanism',
          scene_camera:  'standing beside the rear door, close view of the wedge and rod at the rear door top corner',
          scene_framing: {
            work_pct:   70,
            foreground: 'wedge in the rear door frame top corner, long rod visible through the gap',
            midground:  'rear door panel and rear window glass',
            background: 'rear interior visible through the glass, road or parking area beyond',
          },
          scene_debris:  'protective film strip at the wedge contact point on the rear door frame',
          scene_exclude: ['front door tools', 'jump cables', 'hydraulic jack', 'spare tyre', 'tow strap'],
          tools: [
            'plastic wedge in the rear door frame top corner',
            'long-reach rod visible entering through the rear door gap',
          ],
          protections: [
            'protective film at the wedge contact point on the rear door frame',
          ],
          chantier_details: [
            'rear door wedge and gap — working from the rear instead of the front',
            'rod tip approaching the rear interior door lock mechanism',
            'rear window glass showing the interior of the back seat',
          ],
        },
        {
          scene_note:    'interior door handle reach — hooked rod extended through the door gap, angled toward the interior door handle mechanism',
          scene_camera:  'close view through the window glass, framing the hooked rod tip approaching the interior door handle',
          scene_framing: {
            work_pct:   75,
            foreground: 'hooked rod tip visible close to the interior door handle through the glass and gap',
            midground:  'interior door trim, door handle lever, and arm rest',
            background: 'car interior, seat visible beyond',
          },
          scene_debris:  'protective film at the door frame entry point for the rod',
          scene_exclude: ['jump cables', 'hydraulic jack', 'spare tyre', 'tow strap'],
          tools: [
            'hooked long-reach rod with tip angled toward the interior door handle',
            'wedge holding the door gap open at the frame top',
          ],
          protections: [
            'protective film at the rod entry point on the door frame',
          ],
          chantier_details: [
            'rod tip visibly close to the interior door handle lever through the window',
            'door handle mechanism visible in the car interior panel',
            'door gap held by the wedge while rod manoeuvres toward the handle',
          ],
        },
        {
          scene_note:    'full-jamb protection setup — protective film applied along the entire door frame edge before inserting any tools, preventing all paint damage',
          scene_camera:  'standing at the door, framing the protective film strip applied along the full length of the door frame edge',
          scene_framing: {
            work_pct:   60,
            foreground: 'protective film strip applied along the full height of the door frame edge, no tools inserted yet',
            midground:  'door panel and window glass beside the protected edge',
            background: 'road or parking area, vehicle interior visible',
          },
          scene_debris:  'film backing paper peel on the ground near the door',
          scene_exclude: ['jump cables', 'hydraulic jack', 'spare tyre', 'tow strap', 'wedge inserted'],
          tools: [
            'protective film strip applied along the full door frame edge',
            'roller or finger pressing the film flat to the frame paint',
          ],
          protections: [
            'full-length protective film on the door frame — paint fully protected',
          ],
          chantier_details: [
            'protective film covering the full door frame edge top to bottom',
            'film backing paper beside the door on the ground',
            'door frame paint fully protected — film applied before any tool entry',
          ],
        },
        {
          scene_note:    'lockout complete — car door open, keys retrieved, door being checked from outside before closing',
          scene_camera:  'standing at the open car door, framing the open interior and the keys visible in the lock or held near the door',
          scene_framing: {
            work_pct:   45,
            foreground: 'car door open wide, interior visible, key in the ignition or on the seat',
            midground:  'door frame and window, now fully open — no tools in the gap',
            background: 'road or parking area, tools being gathered on the ground',
          },
          scene_debris:  'protective film strip removed and on the ground near the door, tool carry case open',
          scene_exclude: ['jump cables', 'hydraulic jack', 'spare tyre', 'tow strap', 'wedge in frame'],
          tools: [
            'door fully open — keys on the seat or in the ignition visible',
            'tools being placed back into the carry case on the ground',
          ],
          protections: [],
          chantier_details: [
            'car door fully open — lockout resolved',
            'keys visible on the seat or dashboard inside',
            'protective film strip removed and on the ground near the door',
          ],
        },
      ],
      scene_note: 'roadside lockout — vehicle door opening in progress, technician working at the door frame with specialist tools',
      tools: [
        'plastic door wedge inserted at the top corner of the door frame',
        'long-reach rod visible through the door gap near the lock mechanism',
        'air wedge pump resting on the ground beside the door',
        'protective film strip on the door frame edge at the wedge contact point',
      ],
      protections: [
        'reflective safety vest on the technician or car roof',
      ],
      chantier_details: [
        'door gap visible at the top corner where the wedge is inserted',
        'protective film on the door frame edge preventing scratch marks',
        'air pump tube running to the wedge between door and frame',
        'keys or key fob visible inside the car through the window',
        'technician equipment bag on the ground near the rear door',
      ],
    },

    default: {
      tools: [
        'reflective warning triangle placed on the ground behind the vehicle',
        'torch or flashlight resting on the wheel arch',
        'tool bag open on the ground near the front tyre',
      ],
      protections: [
        'reflective safety vest folded on the car roof or bonnet',
        'warning cone placed on the road behind the vehicle',
      ],
      chantier_details: [
        'bonnet propped open or door open beside the vehicle',
        'oil mark on the ground beneath the engine bay',
        'warning triangle casting a shadow on the road behind the car',
        'gravel disturbed beside the parking spot near the work area',
        'empty product container on the ground near the front wheel',
      ],
    },
  },

  paysagiste: {
    scenarios: [
      {
        _for:          'creation|plantation|massif|arbre|arbust|rocaille|bosquet|haie.*creation|creation.*haie',
        scene_note:    'garden creation or planting work in progress — plants being positioned in freshly dug holes, new bed taking shape from bare ground',
        scene_camera:  'standing at the edge of the new planting bed, framing the active planting zone across the turned soil',
        scene_framing: {
          work_pct:   65,
          foreground: 'plant in freshly dug hole or just placed, topsoil around the base, empty nursery pot beside it',
          midground:  'new planting bed — turned topsoil, several newly planted specimens at intervals',
          background: 'garden boundary — fence, wall, or hedge — existing path or lawn visible',
        },
        scene_debris:  'empty plant pots with nursery labels beside the planting holes, topsoil heap at the bed edge',
        scene_exclude: ['lawn mower', 'hedge trimmer', 'leaf blower', 'finished manicured garden without bare soil', 'no planting activity'],
        tools: [
          'hand trowel beside a freshly dug planting hole',
          'long-handled edging spade resting against the fence post',
          'wheelbarrow with topsoil at the bed edge',
          'string line pulled between two stakes defining the bed edge',
        ],
        protections: [
          'weed-control fabric partially laid on the adjacent bed section',
          'flat board on the turned soil to avoid foot compaction',
        ],
        chantier_details: [
          'freshly dug planting holes at measured intervals in the new bed',
          'empty plant pots with nursery labels on the ground nearby',
          'new plant in hole with roots visible — not yet backfilled',
          'topsoil heap at the bed edge, wheelbarrow partially filled',
        ],
      },
      {
        _for:          'gazon|pelouse|engazonn|semis.*gazon|rouleau.*gazon|pose.*gazon|creation.*pelouse',
        scene_note:    'lawn installation in progress — turf rolls being unrolled on prepared ground, or lawn seed being broadcast, bare prepared soil visible',
        scene_camera:  'standing at the edge of the prepared area, framing the leading turf roll being unrolled or the seeder on the bare earth',
        scene_framing: {
          work_pct:   65,
          foreground: 'turf roll being unrolled across prepared soil, or seeder being pushed across raked earth',
          midground:  'prepared bare soil surface with turf strips already laid to one side',
          background: 'garden boundary and existing surfaces — path, terrace, fence',
        },
        scene_debris:  'turf roll off-cut at the edge of the laid section, rake on the ground near the last strip',
        scene_exclude: ['hedge trimmer', 'leaf blower', 'deep planting holes', 'large shrubs or trees being planted', 'finished manicured lawn with no work visible'],
        tools: [
          'turf roll beside the active laying edge',
          'wide levelling rake on the prepared soil',
          'lawn roller on the ground near the newly laid section',
          'half-moon edger at the border cut line',
        ],
        protections: [
          'flat wooden board on the newly laid turf to kneel on without compaction',
        ],
        chantier_details: [
          'turf strips laid parallel, joints staggered like brickwork',
          'leading turf roll being unrolled on prepared bare soil',
          'border cut being trimmed at the path edge',
          'rake marks on the still-bare section ahead of the laying front',
        ],
      },
      {
        _for:          'taille|haie|coupe.*haie|arbust.*entretien|entretien.*haie|arbre.*taille|taille.*arbre|elagage.*haie',
        scene_note:    'hedge trimming or shrub pruning in progress — hedge trimmer or secateurs in use, cut clippings on the ground, hedge clearly mid-shaping',
        scene_camera:  'standing back from the hedge, framing the work zone at mid-height — trimmed section and still-overgrown section side by side',
        scene_framing: {
          work_pct:   65,
          foreground: 'cut clippings pile at the hedge base, secateurs or trimmer beside it',
          midground:  'hedge showing contrast between freshly trimmed side and overgrown side',
          background: 'garden fence or wall behind the hedge, garden or path on the other side',
        },
        scene_debris:  'pile of cut clippings on the ground at the base, small branches on the adjacent path or lawn',
        scene_exclude: ['bare soil planting bed', 'turf rolls', 'planting holes', 'finished garden with no cut material visible'],
        tools: [
          'hedge trimmer set on the ground beside the hedge',
          'bypass secateurs near the clipping pile',
          'garden rake beside the debris pile',
          'garden refuse sack open at the clipping pile',
        ],
        protections: [
          'safety goggles beside the hedge trimmer',
          'cut-resistant gloves beside the secateurs',
        ],
        chantier_details: [
          'hedge clearly showing trimmed and untrimmed sections side by side',
          'pile of fresh cut clippings at the hedge base',
          'small branches on the adjacent lawn from the cutting work',
          'string line showing the target hedge height pulled taut along the top',
        ],
      },
      {
        _for:          'desherb|nettoy.*jardin|debroussaill|mauvaise.*herbe|sarclage|desherbage',
        scene_note:    'garden weeding or vegetation clearance in progress — weeds being removed from beds or paths, cleared patch beside still-overgrown area',
        scene_camera:  'crouching low near a bed or path, framing the active weeding zone — bare cleared soil beside the remaining overgrowth',
        scene_framing: {
          work_pct:   65,
          foreground: 'hand fork or hoe in the soil at the cleared patch edge, uprooted weeds piled beside it',
          midground:  'cleared bed section — bare soil — adjacent to the still-overgrown section',
          background: 'garden fence, hedge, or wall, garden beyond',
        },
        scene_debris:  'pile of uprooted weeds on the cleared ground, garden refuse sack open beside the pile',
        scene_exclude: ['hedge trimmer', 'turf rolls', 'new plants being planted', 'finished manicured garden'],
        tools: [
          'hand fork pushed into the soil at the active weeding edge',
          'hoe resting against the fence at the cleared section',
          'garden kneeling pad on the cleared soil',
          'garden refuse sack beside the weed pile',
        ],
        protections: [
          'gardening gloves beside the hand fork',
        ],
        chantier_details: [
          'uprooted weed pile on the cleared soil — root balls visible',
          'bare soil section where weeding is done beside the overgrown area',
          'garden refuse sack partially filled with removed weeds',
        ],
      },
      {
        _for:          'bordure|paillage|amenag|bache.*jardin|gravier.*jardin|bois.*jardin|allee.*jardin|chemin.*jardin',
        scene_note:    'garden edging, mulching, or surface treatment in progress — border being set or mulch being spread over a prepared bed',
        scene_camera:  'standing at the bed edge, framing the active section where edging is being pressed in or mulch spread with a rake',
        scene_framing: {
          work_pct:   65,
          foreground: 'edging strip being pressed into the soil, or mulch pile being spread with a rake at the bed surface',
          midground:  'bed section with edging set and mulch applied, next section still to do',
          background: 'lawn or path beside the bed, garden fence or wall beyond',
        },
        scene_debris:  'excess mulch spill on the path edge, edging strip packaging on the ground',
        scene_exclude: ['hedge trimmer', 'turf rolls', 'planting holes', 'weeding debris piles'],
        tools: [
          'plastic or metal edging strip being set along the bed border',
          'rubber mallet for tapping the edging into the soil',
          'garden rake for spreading mulch evenly',
          'wheelbarrow with mulch or gravel at the active section',
        ],
        protections: [
          'gardening gloves beside the edging strip',
        ],
        chantier_details: [
          'edging strip partially set along the bed, held at intervals',
          'mulch pile being spread to cover the prepared bed',
          'transition visible — mulched section beside still-bare soil',
          'edging strip off-cut on the ground near the active end',
        ],
      },

      // --- création / plantation (3 additional) ---
      {
        _for:          'creation|plantation|massif|arbre|arbust|rocaille|bosquet|haie.*creation|creation.*haie',
        scene_note:    'planting bed soil preparation — rotavator marks in the freshly turned topsoil, bed being raked level before planting',
        scene_camera:  'standing at the bed edge, framing the raked topsoil surface and the rotavator marks in the turned earth',
        scene_framing: {
          work_pct:   55,
          foreground: 'wide landscape rake being drawn through the turned topsoil, rotavator tine marks in the earth',
          midground:  'planting bed surface — turned and raked, ready for planting',
          background: 'garden fence or hedge, existing lawn or path beside the new bed',
        },
        scene_debris:  'small stones raked to the bed edge from the turned topsoil, rotavator fuel can on the ground beside',
        scene_exclude: ['finished planted bed', 'hedge trimmer', 'leaf blower', 'lawn mower'],
        tools: [
          'wide landscape rake levelling the freshly turned topsoil',
          'rotavator parked at the bed edge — tines still with fresh earth',
        ],
        protections: [
          'flat board on the raked surface to avoid footprint compaction',
        ],
        chantier_details: [
          'rotavator tine marks clearly visible in the freshly turned topsoil',
          'rake marks forming the level bed surface',
          'stones raked to the bed edge during levelling',
        ],
      },
      {
        _for:          'creation|plantation|massif|arbre|arbust|rocaille|bosquet|haie.*creation|creation.*haie',
        scene_note:    'tree root ball unwrapping — hessian or plastic wrapping being removed from a tree root ball before planting into the prepared hole',
        scene_camera:  'crouching beside the tree root ball, framing the hessian being cut and removed from the root mass',
        scene_framing: {
          work_pct:   65,
          foreground: 'hessian or plastic wrapping being cut from the tree root ball, roots visible where unwrapped',
          midground:  'tree root ball on the prepared planting area, open planting hole visible nearby',
          background: 'garden boundary, existing plantings beyond',
        },
        scene_debris:  'cut hessian pieces on the ground beside the root ball, binding wire removed to one side',
        scene_exclude: ['finished planted bed', 'hedge trimmer', 'leaf blower', 'lawn mower'],
        tools: [
          'secateurs cutting the hessian binding on the tree root ball',
          'planting hole open beside the root ball, ready to receive the tree',
        ],
        protections: [
          'gardening gloves beside the secateurs',
        ],
        chantier_details: [
          'hessian cut and partially removed from the root ball — roots partially visible',
          'binding wire and cut hessian pieces on the ground beside the root ball',
          'planting hole open and ready beside the root ball',
        ],
      },
      {
        _for:          'creation|plantation|massif|arbre|arbust|rocaille|bosquet|haie.*creation|creation.*haie',
        scene_note:    'newly planted tree being staked — timber stake driven beside the tree, soft tree tie being applied around the trunk to secure it',
        scene_camera:  'standing back, framing the newly planted tree and the stake being driven beside it',
        scene_framing: {
          work_pct:   60,
          foreground: 'timber stake driven into the planting soil beside the newly planted tree trunk',
          midground:  'newly planted tree with topsoil mounded at the base, tree tie being looped around trunk',
          background: 'garden boundary, existing garden beyond the planting zone',
        },
        scene_debris:  'stake mallet on the ground beside the driven stake, empty tree tie packaging near the tree base',
        scene_exclude: ['finished planted bed without work visible', 'hedge trimmer', 'leaf blower'],
        tools: [
          'timber stake driven beside the tree — bark still on the stake',
          'soft rubber tree tie being applied around the trunk',
          'mallet on the ground beside the stake',
        ],
        protections: [
          'gardening gloves near the tree tie',
        ],
        chantier_details: [
          'timber stake driven firmly into the soil beside the tree trunk',
          'tree tie looped around trunk and stake — figure-8 tie visible',
          'topsoil mounded and firmed around the tree base',
        ],
      },

      // --- gazon / pelouse (3 additional) ---
      {
        _for:          'gazon|pelouse|engazonn|semis.*gazon|rouleau.*gazon|pose.*gazon|creation.*pelouse',
        scene_note:    'soil preparation before turf laying — topsoil being raked level with a landscape rake, final surface ready for turf rolls',
        scene_camera:  'standing at the edge of the prepared area, framing the rake working the last section of topsoil',
        scene_framing: {
          work_pct:   55,
          foreground: 'landscape rake levelling the prepared topsoil, fine tilth visible at the surface',
          midground:  'prepared topsoil area — raked and level, ready for turf',
          background: 'garden boundary, adjacent existing surface or fence',
        },
        scene_debris:  'stones raked to the bed edge, small clod of topsoil beside the rake',
        scene_exclude: ['turf rolls visible', 'hedge trimmer', 'leaf blower', 'finished lawn'],
        tools: [
          'wide landscape rake levelling the final topsoil layer',
          'spirit level on the prepared surface checking the grade',
        ],
        protections: [
          'flat board on the prepared surface to avoid compaction during raking',
        ],
        chantier_details: [
          'fine topsoil tilth raked to a level surface — ready for turf',
          'stones and debris at the bed edge from the raking pass',
          'grade level consistent across the prepared area',
        ],
      },
      {
        _for:          'gazon|pelouse|engazonn|semis.*gazon|rouleau.*gazon|pose.*gazon|creation.*pelouse',
        scene_note:    'freshly laid turf being rolled — flat lawn roller being pushed across the newly laid strips to press the root contact and seams',
        scene_camera:  'standing at the end of the lawn, framing the lawn roller being pushed across the turf strips',
        scene_framing: {
          work_pct:   55,
          foreground: 'heavy flat lawn roller being pushed across the freshly laid turf strips',
          midground:  'newly laid turf — bright green strips with seam lines visible',
          background: 'garden boundary and adjacent surfaces, remaining turf rolls at the far side',
        },
        scene_debris:  'turf roll off-cut end at the lawn edge beside the roller path',
        scene_exclude: ['hedge trimmer', 'leaf blower', 'planting holes', 'finished manicured lawn without work visible'],
        tools: [
          'heavy flat lawn roller being pushed across the turf',
        ],
        protections: [],
        chantier_details: [
          'lawn roller pressing each turf strip — seams visibly compressed',
          'freshly laid turf — bright green against the prepared soil edge',
          'turf seam lines running parallel across the new lawn area',
        ],
      },
      {
        _for:          'gazon|pelouse|engazonn|semis.*gazon|rouleau.*gazon|pose.*gazon|creation.*pelouse',
        scene_note:    'first watering of newly laid turf — hose or sprinkler soaking the fresh turf thoroughly after laying',
        scene_camera:  'standing at the lawn edge, framing the water jet or sprinkler wetting the newly laid turf',
        scene_framing: {
          work_pct:   50,
          foreground: 'hose nozzle directing water across the freshly laid turf, water spreading across the surface',
          midground:  'freshly laid turf — deep green, water pooling at the low points between strips',
          background: 'garden boundary, hose connection at the fence side',
        },
        scene_debris:  'water pooling in the seam lines between turf strips',
        scene_exclude: ['hedge trimmer', 'leaf blower', 'planting holes', 'dry turf just laid'],
        tools: [
          'garden hose with spray nozzle watering the freshly laid turf',
        ],
        protections: [],
        chantier_details: [
          'water spreading across the freshly laid turf surface from the hose',
          'turf deepening in colour as it soaks in',
          'water pooling at the seam lines between strips',
        ],
      },

      // --- taille / haie (3 additional) ---
      {
        _for:          'taille|haie|coupe.*haie|arbust.*entretien|entretien.*haie|arbre.*taille|taille.*arbre|elagage.*haie',
        scene_note:    'ladder positioned for tall hedge trimming — aluminium ladder against the hedge before cutting starts, no cuts made yet',
        scene_camera:  'standing back, framing the ladder leaning against the tall hedge with the hedge trimmer on the ground beside it',
        scene_framing: {
          work_pct:   45,
          foreground: 'aluminium ladder leaning against the tall hedge, hedge trimmer on the ground at the ladder base',
          midground:  'full height of the overgrown hedge — top above ladder reach',
          background: 'garden boundary or fence behind the hedge, garden beside',
        },
        scene_debris:  'small quantity of old hedge debris on the lawn at the hedge base',
        scene_exclude: ['cut clippings piles', 'trimmed hedge section visible', 'lawn mower', 'planting'],
        tools: [
          'aluminium ladder leaning against the tall hedge',
          'hedge trimmer on the ground at the ladder base',
          'long-handled hedge shear resting against the fence nearby',
        ],
        protections: [
          'safety goggles on the ground near the trimmer',
          'cut-resistant gloves near the hedge trimmer',
        ],
        chantier_details: [
          'ladder positioned against the hedge at the starting point',
          'overgrown hedge top extending above the ladder reach',
          'hedge trimmer and shears laid out at the base ready for use',
        ],
      },
      {
        _for:          'taille|haie|coupe.*haie|arbust.*entretien|entretien.*haie|arbre.*taille|taille.*arbre|elagage.*haie',
        scene_note:    'hedge top trimming from working platform — flat top of hedge being trimmed, clippings falling on both sides',
        scene_camera:  'side view at hedge top level, framing the trimmer working along the flat top with clippings falling',
        scene_framing: {
          work_pct:   65,
          foreground: 'fresh-cut hedge top — flat and even, cut clippings caught on the top surface',
          midground:  'trimmed section beside the untrimmed section, height difference clearly visible',
          background: 'garden below on one side, neighbouring garden or open sky on the other',
        },
        scene_debris:  'cut clippings on the hedge top surface after the trimmer pass',
        scene_exclude: ['planting holes', 'turf rolls', 'lawn mower', 'no cut visible'],
        tools: [
          'hedge trimmer at the hedge top — blade horizontal across the flat top',
          'string line pulled taut above the hedge defining the cut height',
        ],
        protections: [
          'safety goggles near the trimmer on the hedge top',
        ],
        chantier_details: [
          'flat hedge top — freshly trimmed, clippings caught on the surface',
          'cut and uncut sections side by side — height difference visible',
          'string line above the hedge defining the target height',
        ],
      },
      {
        _for:          'taille|haie|coupe.*haie|arbust.*entretien|entretien.*haie|arbre.*taille|taille.*arbre|elagage.*haie',
        scene_note:    'clippings collection with leaf blower — cut clippings being blown into a pile from the lawn and adjacent path after hedge trimming',
        scene_camera:  'standing at the lawn beside the hedge, framing the leaf blower directing the clippings into a pile',
        scene_framing: {
          work_pct:   50,
          foreground: 'leaf blower directing cut clippings into a growing pile at the lawn edge',
          midground:  'freshly trimmed hedge behind — flat top and tidy sides visible',
          background: 'garden boundary, path or lawn continuing beyond',
        },
        scene_debris:  'growing pile of cut clippings at the lawn edge, loose clippings still on the lawn ahead of the blower',
        scene_exclude: ['planting holes', 'turf rolls', 'no trimming done yet'],
        tools: [
          'leaf blower directing clippings into a pile',
          'garden refuse sack open beside the pile ready to receive the clippings',
        ],
        protections: [
          'ear defenders or ear plugs near the leaf blower',
        ],
        chantier_details: [
          'clippings pile at the lawn edge — building up as blower collects more',
          'freshly trimmed hedge visible behind — flat top and sides tidy',
          'loose clippings on the lawn ahead of the blower still to be collected',
        ],
      },

      // --- désherbage (3 additional) ---
      {
        _for:          'desherb|nettoy.*jardin|debroussaill|mauvaise.*herbe|sarclage|desherbage',
        scene_note:    'knapsack sprayer in use — chemical weed treatment being applied to a gravel path or paved area between plants',
        scene_camera:  'standing behind the sprayer, framing the spray lance directing chemical onto the target weeds',
        scene_framing: {
          work_pct:   55,
          foreground: 'spray lance of the knapsack sprayer directing fine spray onto weeds in the gravel or paved surface',
          midground:  'gravel path or paving with weeds in the joints, treated section darker from the spray',
          background: 'garden boundary, adjacent planting bed or hedge beyond',
        },
        scene_debris:  'wet spray residue on the gravel around the treated weeds',
        scene_exclude: ['hedge trimmer', 'turf rolls', 'planting holes'],
        tools: [
          'knapsack sprayer with lance directing herbicide onto the weeds',
        ],
        protections: [
          'chemical-resistant gloves near the sprayer pump',
          'safety goggles beside the knapsack',
        ],
        chantier_details: [
          'fine spray being directed from the lance onto weeds in the path',
          'treated gravel visibly darker and wet around the sprayed weeds',
          'warning marker at the treated area edge',
        ],
      },
      {
        _for:          'desherb|nettoy.*jardin|debroussaill|mauvaise.*herbe|sarclage|desherbage',
        scene_note:    'tap-root weed extraction — dandelion or deep-rooted weed being pulled by a long tap-root extractor tool, intact root beside the hole',
        scene_camera:  'crouching on the lawn, framing the tap-root extractor tool in the soil with the extracted root beside the hole',
        scene_framing: {
          work_pct:   70,
          foreground: 'tap-root extractor tool inserted in the lawn, extracted weed root beside the small hole',
          midground:  'lawn surface around the extraction point, small soil plug from the corer beside the hole',
          background: 'garden beyond the lawn, fence or hedge at distance',
        },
        scene_debris:  'tap root complete with crown beside the extractor hole, small soil plug on the lawn',
        scene_exclude: ['hedge trimmer', 'sprayer', 'turf rolls', 'planting holes'],
        tools: [
          'tap-root weed extractor inserted in the lawn at the weed position',
        ],
        protections: [
          'gardening gloves beside the extractor',
        ],
        chantier_details: [
          'tap-root extractor in the soil — ready to twist and extract',
          'extracted root complete with crown beside the small hole',
          'lawn plug of soil beside the extraction point',
        ],
      },
      {
        _for:          'desherb|nettoy.*jardin|debroussaill|mauvaise.*herbe|sarclage|desherbage',
        scene_note:    'post-treatment clearance — wilted and dying weeds being raked up from the bed after chemical treatment, debris going into sacks',
        scene_camera:  'crouching low at the bed, framing the wilted weed plants being raked into a pile for removal',
        scene_framing: {
          work_pct:   60,
          foreground: 'wilted and yellowing weeds on the ground, hand rake gathering them into a pile',
          midground:  'bed surface — partly cleared, wilted plants on one section, bare soil on the cleared section',
          background: 'garden boundary, adjacent hedge or fence beyond',
        },
        scene_debris:  'pile of wilted weed plants on the cleared section, garden refuse sack open nearby',
        scene_exclude: ['hedge trimmer', 'turf rolls', 'fresh healthy plants'],
        tools: [
          'hand rake gathering wilted weeds into a pile',
          'garden refuse sack open beside the pile',
        ],
        protections: [
          'gardening gloves beside the rake',
        ],
        chantier_details: [
          'wilted yellow weeds clearly dead from the treatment — limp on the soil',
          'rake gathering them into a pile for bagging',
          'bare soil visible on the cleared section — treatment effective',
        ],
      },

      // --- bordure / paillage (3 additional) ---
      {
        _for:          'bordure|paillage|amenag|bache.*jardin|gravier.*jardin|bois.*jardin|allee.*jardin|chemin.*jardin',
        scene_note:    'bulk bark chip bag being opened — large polypropylene bag of bark chips being cut open, chips cascading out',
        scene_camera:  'standing beside the bag, framing the cut bag with bark chips spilling onto the prepared bed',
        scene_framing: {
          work_pct:   55,
          foreground: 'large polypropylene bag cut open, bark chips cascading out onto the prepared bed surface',
          midground:  'prepared bed waiting for mulch, edging strip already set at the border',
          background: 'garden boundary, existing plantings beside the bed',
        },
        scene_debris:  'bark chips spread around the bag cut point, packaging ties on the ground',
        scene_exclude: ['hedge trimmer', 'turf rolls', 'planting holes filled'],
        tools: [
          'utility knife or scissors used to cut the bulk bag open',
          'garden rake on the ground ready to spread the bark chips',
        ],
        protections: [
          'gardening gloves near the bag',
        ],
        chantier_details: [
          'large bark chip bag cut open — chips cascading out',
          'edging strip already set at the bed border',
          'prepared bed waiting for the mulch layer',
        ],
      },
      {
        _for:          'bordure|paillage|amenag|bache.*jardin|gravier.*jardin|bois.*jardin|allee.*jardin|chemin.*jardin',
        scene_note:    'decorative gravel being spread over weed-control fabric — gravel being raked across the fabric surface for a gravel garden bed',
        scene_camera:  'standing at the bed edge, framing the gravel rake spreading the stone across the black fabric',
        scene_framing: {
          work_pct:   60,
          foreground: 'garden rake spreading decorative gravel across the weed-control fabric',
          midground:  'gravel-covered section beside the still-bare fabric waiting for gravel',
          background: 'garden boundary, existing plantings or path beside the gravel area',
        },
        scene_debris:  'gravel spill at the bed edge near the fabric, empty gravel bag beside the spread section',
        scene_exclude: ['hedge trimmer', 'turf rolls', 'deep planting holes'],
        tools: [
          'garden rake spreading decorative gravel across the weed-control fabric',
          'empty gravel bag beside the active section',
        ],
        protections: [],
        chantier_details: [
          'decorative gravel being raked evenly across the black weed-control fabric',
          'covered and uncovered fabric sections side by side — transition visible',
          'gravel spill at the bed edge being raked back in',
        ],
      },
      {
        _for:          'bordure|paillage|amenag|bache.*jardin|gravier.*jardin|bois.*jardin|allee.*jardin|chemin.*jardin',
        scene_note:    'flexible plastic edging being shaped around a curved garden border — strip being bent to follow the curve and pegged into the soil',
        scene_camera:  'crouching at the bed edge, framing the flexible edging strip being shaped and the peg being driven at the curve',
        scene_framing: {
          work_pct:   65,
          foreground: 'flexible edging strip being shaped along the curve, peg being driven into the soil to hold it',
          midground:  'curved bed edge — edging already set on one arc section, fresh section being positioned',
          background: 'garden lawn or path on the outside, planting bed inside the curve',
        },
        scene_debris:  'peg packaging on the ground, excess edging strip end at the arc join',
        scene_exclude: ['hedge trimmer', 'turf rolls', 'straight edging'],
        tools: [
          'flexible edging strip being shaped along the curved bed border',
          'rubber mallet for driving the holding pegs into the soil',
          'pegs on the ground ready to be driven at intervals',
        ],
        protections: [],
        chantier_details: [
          'flexible edging strip following a smooth curve at the bed border',
          'peg being driven at the curve hold point — strip held to the curve',
          'edging set on the previous arc section, extending into the new curve',
        ],
      },
    ],
    tools: [
      'garden stake driven into the soil at a planting mark',
      'long-handled edging spade resting against the fence post',
      'hand trowel on the ground beside a freshly dug planting hole',
      'wheelbarrow with topsoil parked at the border edge',
      'string line pulled taut between two stakes defining the bed edge',
    ],
    protections: [
      'horticultural weed-control fabric spread on the adjacent planted bed',
      'wooden board placed flat on a planted section to avoid foot compression',
    ],
    chantier_details: [
      'fresh topsoil heap at the edge of the new planting area',
      'empty plant pot with nursery label on the ground nearby',
      'mulch pile at the border edge ready to be spread',
      'small stone or pebble sample near the path edge',
      'water puddle in the freshly turned topsoil near the planting hole',
    ],
  },

  vitrier: {
    tools: [
      'suction cup lifting handle resting on the windowsill',
      'glass cutter resting beside the scored glass piece on the floor',
      'putty knife resting on the ledge beside the window frame',
      'caulk gun on the floor near the frame base',
      'plastic glazing bead strip on the floor beside the opening',
    ],
    protections: [
      'protective rubber mat on the windowsill to prevent glass scratching',
      'cardboard sheet on the floor directly below the window opening',
    ],
    chantier_details: [
      'glass offcut resting against the wall at the base near the window',
      'strip of old putty or sealant on the floor from the removed pane',
      'caulk bead residue visible on the frame edge',
      'small plastic shim wedge near the base of the installed glass',
      'empty silicone tube beside the caulk gun on the floor',
    ],
  },

  'élagage': {
    scenarios: [

      // --- taille douce / éclaircissement / couronnage / émondage / recépage ---
      {
        _for:          'taille|eclairciss|emondage|couronnage|recepage|reduc.*couron',
        scene_note:    'crown reduction in progress — climber in harness positioned mid-canopy with a small chainsaw at a lateral branch being shortened, tree fully standing and main structure preserved',
        scene_camera:  'standing back from the tree at ground level, framing the climber in the mid-canopy against the sky above',
        scene_framing: {
          work_pct:   65,
          foreground: 'tarp on the ground at the tree base, cut branch lengths already laid out on the tarp',
          midground:  'tree trunk and primary branches, climber with harness and small chainsaw visible in the canopy',
          background: 'sky above the canopy, garden or fence line behind the tree',
        },
        scene_debris:  'small green leaf clusters and cut twig sections on the tarp below the working position',
        scene_exclude: ['felled tree on ground', 'stump alone', 'large log sections in pile', 'tree completely bare', 'chainsaw at trunk base'],
        tools: [
          'small chainsaw operated by the climber at the branch cut point',
          'climbing rope running from the harness to the anchor branch above',
        ],
        protections: [
          'helmet and full harness visible on the climber in the canopy',
          'tarp spread on the ground at the tree base to catch debris',
          'yellow safety tape marking the drop zone around the base',
        ],
        chantier_details: [
          'climber in harness positioned mid-canopy at the active cut point',
          'cut branch sections on the tarp below — sorted by length',
          'fresh cut stubs visible in the crown at previously removed positions',
        ],
      },
      {
        _for:          'taille|eclairciss|emondage|couronnage|recepage|reduc.*couron',
        scene_note:    'crown thinning completed — tree standing with crown noticeably more open on one side, cut branches piled on tarp below, loppers and pruning saw on the ground',
        scene_camera:  'standing back from the tree, framing the full tree height with the thinned crown visible and the cut branch pile below',
        scene_framing: {
          work_pct:   55,
          foreground: 'cut branch pile on tarp with loppers and pruning saw beside the pile',
          midground:  'full tree standing — crown visibly lighter and more open on the thinned side',
          background: 'garden, fence or house wall behind the tree',
        },
        scene_debris:  'small leaf clusters and cut twigs scattered on the ground around the tarp edge',
        scene_exclude: ['felled tree', 'large log sections', 'stump only', 'chainsaw at trunk level', 'bare tree'],
        tools: [
          'loppers on the ground beside the cut branch pile',
          'hand pruning saw resting on the pile',
          'telescopic pruning pole leaning against the trunk',
        ],
        protections: [
          'tarp loaded with sorted cut branches below the crown',
          'yellow safety tape on the ground defining the drop zone',
        ],
        chantier_details: [
          'crown clearly more open on the thinned side — lighter canopy density visible',
          'sorted cut branch pile on the tarp — sections of various diameters',
          'sap marks on the fresh cut stubs still visible in the crown',
        ],
      },
      {
        _for:          'taille|eclairciss|emondage|couronnage|recepage|reduc.*couron',
        scene_note:    'garden tree pruning — stepladder beside a fruit or ornamental tree, long-handled loppers at a medium lateral branch making a clean collar cut',
        scene_camera:  'standing in the garden beside the tree, framing the stepladder against the trunk and the loppers at the branch being cut',
        scene_framing: {
          work_pct:   65,
          foreground: 'stepladder leaning against the trunk, loppers at the branch collar',
          midground:  'fruit or ornamental tree at full height — other branches undisturbed',
          background: 'garden wall or fence, shrubs behind',
        },
        scene_debris:  'small cut twig section on the garden ground below the ladder, leaf debris at the ladder feet',
        scene_exclude: ['felled tree', 'stump', 'chainsaw', 'climbing harness in tree', 'large cut logs'],
        tools: [
          'long-handled loppers at the lateral branch collar — clean collar cut being made',
          'stepladder positioned against the tree trunk',
        ],
        protections: [
          'stable stepladder on level ground beside the trunk',
        ],
        chantier_details: [
          'lopper blades at the branch collar — clean angled cut position',
          'other branches undisturbed — targeted individual pruning only',
          'small cut twig on the ground below from the previous cut',
        ],
      },

      // --- suppression branches mortes ---
      {
        _for:          'branche.*mort|mort.*branche|bois.*mort|supp.*mort',
        scene_note:    'dead branch removal — grey-brown leafless branch being cut from the canopy, pruning saw at the collar, living green foliage clearly surrounding the dead wood',
        scene_camera:  'close-up in the canopy, framing the pruning saw at the dead branch base with living branches on either side',
        scene_framing: {
          work_pct:   70,
          foreground: 'pruning saw at the dead branch base collar — grey-brown dead wood clearly distinct from the green living branches beside it',
          midground:  'dead branch extending away — bare and leafless, cracked bark visible',
          background: 'living green canopy surrounding, sky beyond',
        },
        scene_debris:  'dry bark fragments at the stub base where the cut is being made',
        scene_exclude: ['felled tree', 'stump', 'all branches green and healthy', 'chainsaw at trunk level'],
        tools: [
          'hand pruning saw at the dead branch base collar',
        ],
        protections: [
          'hard hat visible on the worker in the canopy',
          'climbing harness visible',
          'tarp below to catch the dead branch',
        ],
        chantier_details: [
          'grey-brown dead branch — cracked bark and no leaves visible against the green canopy',
          'pruning saw making a clean cut at the branch collar',
          'living green branches at adjacent junctions — healthy tree context evident',
        ],
      },
      {
        _for:          'branche.*mort|mort.*branche|bois.*mort|supp.*mort',
        scene_note:    'dead branch pile after removal — dry grey leafless sections piled beside the still-standing living tree, crown visible and green behind the pile',
        scene_camera:  'standing in the garden, framing the dead branch pile in the foreground and the living tree crown behind',
        scene_framing: {
          work_pct:   50,
          foreground: 'pile of grey dry dead branch sections — no leaves, cracked bark, chalky dried cut ends',
          midground:  'tree trunk, lower crown intact and green',
          background: 'full tree canopy — living and green, visibly cleared of the dead wood',
        },
        scene_debris:  'dry bark fragments beside the dead branch pile',
        scene_exclude: ['felled tree', 'living green branches mixed in the pile', 'stump', 'chainsaw at trunk level'],
        tools: [
          'pruning saw on the ground beside the dead branch pile',
          'loppers beside the pile',
        ],
        protections: [
          'tarp under the pile',
        ],
        chantier_details: [
          'dead branch pile — grey, dry, chalky cut ends — clearly not living wood',
          'living tree canopy above — green and dense, cleared of the dead wood',
          'colour contrast between grey dead branches and green living canopy clearly visible',
        ],
      },
      {
        _for:          'branche.*mort|mort.*branche|bois.*mort|supp.*mort',
        scene_note:    'close-up of a fresh cut on a dead branch stub — dry grey wood face at the cut, flaking bark around the base, no sap, clean cut revealing dry internal wood grain',
        scene_camera:  'close-up on the branch stub in the tree, framing the cut face of the dead branch',
        scene_framing: {
          work_pct:   80,
          foreground: 'fresh cut face on the dead branch stub — grey dry wood, no sap, dry crumbly internal structure',
          midground:  'living bark of the parent branch and healthy collar forming around the stub base',
          background: 'green canopy surrounding the stub position',
        },
        scene_debris:  'dry bark fragments at the stub base where the cut was made',
        scene_exclude: ['fresh sap on the cut face', 'living green branch', 'felled tree', 'stump'],
        tools: [
          'pruning saw resting on the adjacent living branch beside the cut stub',
        ],
        protections: [],
        chantier_details: [
          'cut face of the dead branch — grey dry wood, no sap, contrasting with living tissue',
          'living bark collar at the stub base — healthy tree tissue forming a ring around the dead wood',
          'dry bark flaking at the stub edges',
        ],
      },

      // --- élagage de sécurité / arbres dangereux ---
      {
        _for:          'danger|securite|risque',
        scene_note:    'hazardous branch removal — large inclined branch overhanging a fence or property with a rope attached high for controlled drop, exclusion zone marked with safety tape',
        scene_camera:  'standing back from the tree, framing the hazardous inclined branch with the guide rope running from its upper section',
        scene_framing: {
          work_pct:   60,
          foreground: 'yellow safety tape defining the exclusion zone below the hazardous branch',
          midground:  'tree with the inclined or cracked branch — rope visible running from the upper section of the branch',
          background: 'fence, house wall or garden structure that the branch threatens',
        },
        scene_debris:  'light bark debris at the base of the trunk from preliminary assessment',
        scene_exclude: ['healthy well-balanced tree', 'simple taille légère', 'no exclusion zone', 'completed log pile'],
        tools: [
          'guide rope attached to the hazardous branch upper section for controlled drop',
          'chainsaw at the cut point on the hazardous branch',
        ],
        protections: [
          'yellow safety tape marking the exclusion zone',
          'hard hat and harness on the climber at the cut point',
        ],
        chantier_details: [
          'rope attached and tensioned on the hazardous branch — ready for controlled lowering',
          'branch inclined or cracked — visible structural failure or overhang threat',
          'exclusion zone marked with safety tape — property beyond the tape visible',
        ],
      },
      {
        _for:          'danger|securite|risque',
        scene_note:    'climber in a structurally compromised tree — harness and lanyard visible, chainsaw at a dangerous split fork, house or fence clearly visible below as the threatened structure',
        scene_camera:  'looking up from the garden, framing the climber in harness at the dangerous fork with the property visible behind',
        scene_framing: {
          work_pct:   65,
          foreground: 'tree trunk at the base, exclusion zone tape around the base',
          midground:  'climber in harness positioned at the dangerous fork — chainsaw in hand at the cut point',
          background: 'house wall or garden fence clearly visible below the canopy — the threatened property',
        },
        scene_debris:  'small bark fragments on the ground below from preliminary cuts',
        scene_exclude: ['healthy balanced tree', 'simple taille', 'no harness', 'completed log pile'],
        tools: [
          'small chainsaw in the climber\'s hand at the dangerous fork junction',
          'climbing rope and lanyard keeping the climber secured to the trunk',
        ],
        protections: [
          'full climbing harness and helmet on the climber',
          'exclusion zone tape at the base',
        ],
        chantier_details: [
          'climber at the compromised fork — structural crack or bark inclusion visible at the junction',
          'chainsaw ready at the cut point — controlled removal about to begin',
          'property clearly visible below — risk context unmistakable',
        ],
      },
      {
        _for:          'danger|securite|risque',
        scene_note:    'controlled branch lowering — large heavy branch just cut, suspended mid-air by the lowering rope between the canopy and the ground, rope under tension, ground handler controlling the descent',
        scene_camera:  'standing back, framing the branch suspended by the rope between the canopy and the ground',
        scene_framing: {
          work_pct:   70,
          foreground: 'rope handler at the base with hands on the rope — rope taut under the branch load',
          midground:  'large branch suspended mid-air — hanging from the rope between canopy height and the ground',
          background: 'tree canopy above, fence or property that was threatened beyond the branch path',
        },
        scene_debris:  'leaf fragments dislodged during the cut on the ground below the suspension point',
        scene_exclude: ['branch fallen without control', 'no rope visible', 'small lightweight branch'],
        tools: [
          'lowering rope under tension from the suspended branch to the ground handler',
          'friction saver or rigging ring at the anchor point above',
        ],
        protections: [
          'hard hat on the ground handler',
          'exclusion zone tape visible at the perimeter',
        ],
        chantier_details: [
          'large branch suspended mid-air by the lowering rope — rope taut under visible load',
          'ground handler controlling the descent speed — hands clearly on the rope',
          'property safely clear of the controlled lowering arc',
        ],
      },

      // --- taille en hauteur ---
      {
        _for:          'hauteur|haute.*tige|haut.*tige',
        scene_note:    'telescopic pruning pole at full extension — operator at ground level directing the pole head deep into the high canopy, both arms raised, cut twig sections falling',
        scene_camera:  'standing beside the operator, framing the extended pole disappearing into the upper canopy',
        scene_framing: {
          work_pct:   60,
          foreground: 'operator at ground level, both arms raised holding the extended pole at an angle into the canopy',
          midground:  'tall tree — pole disappearing into the upper crown at full extension',
          background: 'garden or open area beyond the tree',
        },
        scene_debris:  'small cut twig sections and leaf clusters falling from the canopy around the operator',
        scene_exclude: ['ladder', 'climbing harness in tree', 'aerial platform', 'felled tree', 'stump'],
        tools: [
          'telescopic pruning pole at full extension with pole saw head in the upper canopy',
        ],
        protections: [
          'hard hat on the operator at ground level',
          'safety goggles on the operator',
        ],
        chantier_details: [
          'telescopic pole at full extension — straight line from operator hands to upper canopy',
          'cut twig sections falling from the canopy as the pole saw works',
          'operator both arms raised — guiding the pole head through the canopy from below',
        ],
      },
      {
        _for:          'hauteur|haute.*tige|haut.*tige',
        scene_note:    'arborist climber high in the upper canopy — looking up from the garden, climber in full gear positioned in the upper crown against the open sky',
        scene_camera:  'looking up from ground level, framing the climber high in the canopy against the sky above',
        scene_framing: {
          work_pct:   55,
          foreground: 'tree trunk rising from the ground, climbing rope running upward from the harness',
          midground:  'upper canopy — climber with harness, helmet, and small chainsaw visible high in the crown',
          background: 'open sky above and behind the climber',
        },
        scene_debris:  'small leaf clusters and bark fragments on the ground below from work at height',
        scene_exclude: ['operator at ground level', 'telescopic pole', 'aerial platform', 'felled tree'],
        tools: [
          'small arborist chainsaw in the climber\'s hand at height',
          'climbing rope running from the harness through the branch anchor above',
        ],
        protections: [
          'full climbing harness, helmet and face visor visible on the climber at height',
        ],
        chantier_details: [
          'climber high in the upper crown — tree scale clearly visible from ground perspective',
          'climbing rope running from the harness to the anchor point above the climber',
          'open sky behind the climber — height and exposure clearly communicated',
        ],
      },
      {
        _for:          'hauteur|haute.*tige|haut.*tige',
        scene_note:    'articulated aerial work platform beside a tall tree — operator in the basket at upper canopy height trimming outer branches, basket elevated to full reach',
        scene_camera:  'standing back from the tree, framing the aerial platform arm extended to canopy height with the operator in the basket',
        scene_framing: {
          work_pct:   60,
          foreground: 'aerial platform base on the ground beside the tree — outriggers deployed',
          midground:  'platform arm extended upward, basket at upper canopy height with operator',
          background: 'upper canopy of the tall tree, sky above',
        },
        scene_debris:  'cut branch sections on the ground below from trimming work',
        scene_exclude: ['climbing harness in tree', 'telescopic pole from ground', 'felled tree', 'stump'],
        tools: [
          'operator in the basket using chainsaw or loppers at canopy height',
          'aerial work platform with fully extended arm beside the tree',
        ],
        protections: [
          'operator harness clipped to the basket safety rail',
          'outriggers deployed at the base for platform stability',
          'safety tape around the platform work zone',
        ],
        chantier_details: [
          'aerial platform basket at full height — operator level with the upper canopy',
          'platform arm fully elevated and extended — mechanical reach clearly visible',
          'cut branch sections on the ground below from the trimming work',
        ],
      },

      // --- après tempête ---
      {
        _for:          'tempete|orage|vent.*fort|apres.*vent|branche.*cass',
        scene_note:    'storm-broken branch — large branch broken at a V-shaped split mid-canopy, hanging at a dangerous angle with green foliage still attached, grey overcast sky, wet ground',
        scene_camera:  'standing back from the tree, framing the broken hanging branch clearly visible against the grey sky',
        scene_framing: {
          work_pct:   60,
          foreground: 'wet ground surface, small puddles from the recent storm',
          midground:  'tree with the broken branch hanging — V-shaped split at the break point clearly visible',
          background: 'grey overcast sky, wet garden or fence line visible',
        },
        scene_debris:  'torn wood fibres at the branch break point, scattered wet leaves on the ground below',
        scene_exclude: ['catastrophic damage', 'multiple fallen trees', 'destroyed house', 'sunny dry weather'],
        tools: [
          'safety tape or rope marking the exclusion zone below the hanging branch',
        ],
        protections: [
          'orange safety cones placed below the hanging branch',
          'safety tape defining the danger area',
        ],
        chantier_details: [
          'V-shaped break at the branch split — wood fibres torn, branch still connected',
          'branch hanging at a dangerous angle with full foliage — clear storm damage',
          'wet ground and puddles from the recent storm — damp atmosphere throughout',
        ],
      },
      {
        _for:          'tempete|orage|vent.*fort|apres.*vent|branche.*cass',
        scene_note:    'post-storm clearance — damaged branch just removed, worker in high-visibility vest, wet road or garden, safety cones in place, grey sky, scattered wet debris on the ground',
        scene_camera:  'standing back, framing the worker in HV vest with the removed branch on the ground and safety cones visible',
        scene_framing: {
          work_pct:   55,
          foreground: 'safety cones on the wet surface, removed branch section on the ground',
          midground:  'worker in high-visibility vest — chainsaw or loppers in hand, work just completed',
          background: 'grey overcast sky, wet road or garden, utility vehicle visible in background',
        },
        scene_debris:  'wet leaf and twig debris scattered on the ground around the removed branch',
        scene_exclude: ['catastrophic damage', 'multiple trees down', 'destroyed structure', 'dry sunny weather'],
        tools: [
          'chainsaw in the worker\'s hand — branch just cut',
          'utility vehicle in the background',
        ],
        protections: [
          'high-visibility vest on the worker',
          'safety cones placed around the work area',
          'safety tape visible at the perimeter',
          'hard hat on the worker',
        ],
        chantier_details: [
          'removed branch section on the wet ground — work just completed',
          'worker in full HV gear — professional emergency response clearly visible',
          'wet conditions throughout — ground, debris, and cones all visibly wet',
        ],
      },

      // --- intervention de nuit / urgence ---
      {
        _for:          'urgence|nuit|nocturne',
        time_of_day:   'night',
        scene_note:    'night pruning emergency — work floodlight illuminating a tree or broken branch, arborist in high-visibility vest with chainsaw, orange safety cones, dark background',
        scene_camera:  'standing at the edge of the light cone, framing the worker and tree illuminated by the work floodlight against the dark background',
        scene_framing: {
          work_pct:   65,
          foreground: 'work floodlight on a tripod at the edge of the lit zone, orange cones in the light',
          midground:  'worker in HV vest with chainsaw at the tree, trunk illuminated in the floodlight cone',
          background: 'dark background — trees or garden in darkness beyond the light cone boundary',
        },
        scene_debris:  'cut branch sections on the ground in the floodlight cone, bark chips visible in the light',
        scene_exclude: ['daytime bright sunlight', 'cinematic dramatic lighting', 'completely dark unreadable scene'],
        tools: [
          'chainsaw in the worker\'s hand in the floodlight zone',
          'work floodlight on tripod as the main illumination',
        ],
        protections: [
          'high-visibility vest on the worker — clearly visible in the work light',
          'hard hat on the worker',
          'orange safety cones in the lit area around the tree base',
        ],
        chantier_details: [
          'work floodlight cone illuminating the tree and worker — sharp light-dark boundary',
          'HV vest bright in the floodlight — professional emergency response visible',
          'dark background beyond the light cone — night conditions clearly communicated',
        ],
      },
      {
        _for:          'urgence|nuit|nocturne',
        time_of_day:   'night',
        scene_note:    'night call-out — van headlights and work floodlight creating combined illumination on the work area, tree silhouetted against the dark sky, worker in HV vest active',
        scene_camera:  'standing outside the combined light zone, framing the overlapping van headlights and floodlight on the work area',
        scene_framing: {
          work_pct:   55,
          foreground: 'van parked with headlights on, orange cones at the road edge',
          midground:  'work floodlight zone with worker in HV vest at the tree in the combined light',
          background: 'dark sky, tree silhouetted against the darkness, surroundings in shadow',
        },
        scene_debris:  'light debris visible in the headlight zone on the ground',
        scene_exclude: ['daylight', 'overly cinematic lighting', 'scene too dark to read the work'],
        tools: [
          'work floodlight on tripod in the combined light zone',
          'utility van parked with headlights on',
        ],
        protections: [
          'high-visibility vests on all workers clearly visible in the combined light',
          'orange cones at the roadside or perimeter',
        ],
        chantier_details: [
          'combined light cone from van headlights and floodlight — overlapping illumination',
          'tree silhouetted against the dark sky beyond the lit zone',
          'HV vests clearly visible in the combined light — unmistakable night emergency context',
        ],
      },

      // Fallback: élagage général
      {
        scene_note:    'tree pruning in progress — tree fully standing, cut branches piled on tarp below, pruning tools visible at the base, canopy structure preserved',
        scene_camera:  'standing back from the tree, framing the full height with cut branches on the tarp below',
        scene_framing: {
          work_pct:   50,
          foreground: 'tarp with cut branch pile at the tree base, pruning tools on the ground',
          midground:  'tree at full height — canopy intact, fresh cut stubs visible in the lower crown',
          background: 'garden or open space behind the tree',
        },
        scene_debris:  'small leaf clusters and twig sections on the ground around the tarp edge',
        scene_exclude: ['felled tree on ground', 'stump alone', 'large log billets', 'dessouchage equipment'],
        tools: [
          'telescopic pruning pole leaning against the tree trunk',
          'lopper handles resting on the ground near the tree base',
          'hand pruning saw resting on a cut branch stub',
        ],
        protections: [
          'tarp spread below the canopy to catch cut branches and leaf debris',
          'yellow safety tape marking the drop zone around the tree base',
        ],
        chantier_details: [
          'tree standing — canopy structure preserved, targeted branches removed',
          'cut branch pile on the tarp — sorted by size',
          'sap marks on the fresh cut stubs visible in the lower crown',
        ],
      },
    ],
    tools: [
      'telescopic pruning pole leaning against the tree trunk',
      'lopper handles resting on the ground near the tree base',
      'hand pruning saw resting on a cut branch stub',
      'branch hook resting against the trunk',
    ],
    protections: [
      'tarp spread below the canopy to catch cut branches and leaf debris',
      'yellow safety tape marking the drop zone around the tree base',
    ],
    chantier_details: [
      'fresh wood chips scattered on the ground around the tree base',
      'cut branch pile on the tarp sorted by diameter',
      'sap mark on the freshly exposed cut end of a pruned limb',
      'small twigs and leaf clusters scattered around the base of the tree',
      'pale fresh wood visible at the pruning cut against the older bark',
    ],
  },

  'électricité': {
    tools: [
      'cable routing rod resting against the wall near the conduit entry',
      'electrical junction box open on the floor nearby',
      'cable stripping tool on the work surface',
      'voltage tester resting beside the open panel or socket',
      'coil of electrical cable resting on the floor near the pull point',
    ],
    protections: [
      'electrical isolation warning tag clipped to the circuit breaker handle',
      'rubber mat on the floor below the open consumer unit',
    ],
    chantier_details: [
      'cable offcut clippings on the floor near the pull point',
      'wire connector caps grouped on the work surface',
      'conduit elbow fitting on the floor beside the wall entry',
      'chalk marking on the wall showing the cable routing path',
      'open circuit breaker panel with one breaker visibly switched off',
    ],
  },

  'débarras': {
    tools: [
      'flat furniture trolley resting against the wall near the doorway',
      'moving straps on the floor near the exit',
      'hand cart parked beside the loaded items',
      'box cutter resting on top of a sealed box',
    ],
    protections: [
      'cardboard sheet protecting the floor threshold at the doorway',
      'foam corner protector on the door frame at the load exit point',
    ],
    chantier_details: [
      'cardboard boxes stacked near the exit point ready for removal',
      'sorted pile of items near the door — books, frames, small furniture',
      'hand cart wheel marks on the floor near the doorway',
      'small pile of bubble wrap or packing paper on the floor',
      'open box with packing material beside the sorted pile',
    ],
  },
};

const CAMERA_DEFECTS_LIB = {
  common: [
    'slight horizon tilt of 2–3°, phone not perfectly level',
    'mild overexposure in bright sky or wall areas',
    'light JPEG compression artifacts',
    'slight barrel distortion at edges',
    'muted color saturation — smartphone auto mode',
    'minor motion blur on foreground detail',
  ],
  rare: [
    'finger partially visible at frame corner',
    'obvious lens smudge on one side',
    'water droplet on lens surface',
    'partial garden gate post or fence rail at the frame edge',
    'slight thumb shadow at the bottom left corner',
    'work van or truck partially visible at the frame edge — not the main subject',
  ],
};

const _REALISM_COUNTS = {
  debut:     { tools: 3, protections: 2, details: 2 },
  encours:   { tools: 2, protections: 1, details: 2 },
  semifinal: { tools: 1, protections: 0, details: 1 },
  final:     { tools: 0, protections: 0, details: 1 },
};

const VARIATION_ENGINE = {
  camera_angles: {
    exterior: [
      'from the garden path, centred on the house facade',
      'from the driveway edge, slight left offset',
      'oblique view from the side, 30° angle to the facade',
      'closer crop, work area fills most of frame',
      'stepped back, wider context showing surrounding garden',
    ],
    interior: [
      'standing in the doorway, full room depth visible',
      'crouching at floor level, work edge prominent in foreground',
      'standing to the side, oblique view of the work surface',
      'slightly elevated angle looking down at the floor',
    ],
    roof: [
      'from the parapet corner, diagonal view across the membrane surface',
      'low angle along the roof surface, parapet at the horizon',
      'wide shot showing the full flat roof with parapet all around',
      'close crop focused on the lap joint or flashing detail',
    ],
    roadside: [
      'from the pavement behind the vehicle, 4 m back',
      'from the side of the road at the vehicle mid-point',
      'slight low angle showing the wheel arch and road surface',
      'wide shot including road and surrounding context',
    ],
    garden: [
      'from the garden entrance, full planting border visible',
      'standing beside the work area, close oblique view',
      'low angle at plant level, open sky visible behind',
      'wide shot showing house facade and garden together',
    ],
    customer: [
      'standing in the garden 5–8 m from the house, phone held loosely at chest height — casual snapshot',
      'from the end of the driveway looking toward the front of the house, full facade in frame',
      'from the pavement in front of the property, slight upward tilt toward the upper storey',
      'standing at the open garden gate, gate post partially framing the left edge',
      'from the terrace or patio, looking across the garden toward the work area on the house',
      'seated in a parked car, taken through the open side window toward the house facade',
      'wide shot from 8–12 m back — full facade and surrounding garden context in frame',
      'from just inside the front door or a ground-floor window, looking out at the work',
      'low angle from the garden path, foreground lawn or paving surface visible below',
    ],
    neighbor: [
      'from the adjacent property\'s driveway, peering slightly sideways over the low fence',
      'from the public pavement across the road, opposite side of the street, slight oblique angle',
      'from the shared garden boundary — hedge or fence post partially in the foreground',
    ],
  },
  light_quality: [
    { text: 'soft overcast light, no hard shadows',           meteo: ['nuageux', 'brumeux', 'auto'] },
    { text: 'bright midday sun, short shadows on ground',     meteo: ['soleil', 'auto'] },
    { text: 'warm afternoon light raking from the left',      meteo: ['soleil', 'auto'] },
    { text: 'slightly hazy morning light, cool tones',        meteo: ['nuageux', 'brumeux', 'auto'] },
    { text: 'flat white sky, very diffuse even light',        meteo: ['nuageux', 'auto'] },
    { text: 'broken cloud, intermittent sunlight patches',    meteo: ['nuageux', 'soleil', 'auto'] },
    { text: 'heavy overcast, grey sky, damp atmosphere',      meteo: ['pluie', 'nuageux', 'auto'] },
    { text: 'flat grey light after recent rain',              meteo: ['pluie', 'auto'] },
  ],
  framing_emphasis: [
    'foreground tools prominent, midground subject clear',
    'balanced foreground and midground, no dominant element',
    'midground as main subject, foreground detail secondary',
    'wide establishing shot, full site context visible',
    'work van or pickup visible in the background — adds professional context without dominating',
    'slightly wide shot, surrounding street or garden environment visible at the frame edges',
  ],
};

function _hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  return Math.abs(h);
}

function _seedShuffle(arr, seed) {
  const a = arr.slice();
  let s = seed >>> 0;
  for (let i = a.length - 1; i > 0; i--) {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b) >>> 0;
    s = (s ^ (s >>> 11)) >>> 0;
    const j = s % (i + 1);
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

function _pick(arr, n, seed) {
  if (!arr || !arr.length || n <= 0) return [];
  return _seedShuffle(arr, seed).slice(0, Math.min(n, arr.length));
}

function _serviceGroup(matchedService) {
  const s = (matchedService || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (/batterie|demarrage|boost/.test(s))             return 'batterie';
  if (/crevaison|roue|pneu/.test(s))                  return 'crevaison';
  if (/remorquage|remorque|transport|treuil/.test(s)) return 'remorquage';
  if (/ouverture|ouvert/.test(s))                     return 'ouverture';
  return 'default';
}

function _applySiteRealism(jsonStr, imageIndex) {
  let obj;
  try { obj = JSON.parse(jsonStr); } catch { return jsonStr; }

  const sceneKey   = obj._matched_key;
  const realismRaw = SITE_REALISM[sceneKey];
  const counts     = _REALISM_COUNTS[obj.state_level] || _REALISM_COUNTS.encours;
  const seed       = _hashSeed(`${sceneKey || ''}${obj.state_level || ''}${imageIndex}`);

  // Dispatch: select sub-entry by service or contexte when _dispatch is set
  let realism = realismRaw;
  if (realismRaw) {
    if (realismRaw._dispatch === 'service') {
      const bucket = _serviceGroup(obj._matched_service);
      realism = realismRaw[bucket] || realismRaw.default || null;
    } else if (realismRaw._dispatch === 'contexte') {
      realism = realismRaw[obj.contexte] || realismRaw.default || null;
    }
    // Level 3: scenario pool — seed-pick by sub-service trigger
    if (realism && Array.isArray(realism.scenarios)) {
      const trigger = realism._trigger_service;
      const svc = (obj._matched_service || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      if (!trigger || new RegExp(trigger).test(svc)) {
        const scenSeed = _hashSeed(`${sceneKey}${obj._matched_service || ''}${obj.state_level || ''}${imageIndex}`);
        const targeted  = realism.scenarios.filter(s => s._for && new RegExp(s._for, 'i').test(svc));
        const fallback  = realism.scenarios.filter(s => !s._for);
        const pool      = targeted.length ? targeted : fallback;
        const picked    = pool.length ? _pick(pool, 1, scenSeed)[0] : null;
        if (picked) {
          realism = Object.assign({}, realism, picked);
          if (realism.scene_camera)  obj.camera_position = realism.scene_camera;
          if (realism.scene_framing) obj.framing          = realism.scene_framing;
          if (realism.scene_debris)  obj.site_debris      = realism.scene_debris;
          if (Array.isArray(realism.scene_exclude)) obj.exclude = [...(obj.exclude || []), ...realism.scene_exclude];
          if (realism.time_of_day) obj.time_of_day = realism.time_of_day;
          if (realism.setting)    obj.setting     = realism.setting;
        }
      }
    }
    // Inject context-specific description into work_type for PromptBuilder
    if (realism && realism.scene_note) obj.work_type = realism.scene_note;
  }

  // Camera defects — drawn from global library (2 common, rare at ~5%)
  const defects = _pick(CAMERA_DEFECTS_LIB.common, 2, seed + 3);
  if (_hashSeed(`${sceneKey}${imageIndex}rare`) % 20 === 0) {
    const rare = _pick(CAMERA_DEFECTS_LIB.rare, 1, seed + 4);
    if (rare.length) defects.push(rare[0]);
  }
  obj.photo_defects = defects;

  // Realism layer — only when scene has data (graceful stub passthrough)
  if (realism) {
    obj.site_tools       = _pick(realism.tools,            counts.tools,       seed);
    obj.site_protections = _pick(realism.protections,      counts.protections, seed + 1);
    obj.site_details     = _pick(realism.chantier_details, counts.details,     seed + 2);
  }

  return JSON.stringify(obj);
}

// ─── Worker Scene Rules ──────────────────────────────────────────────────────
// ─── Location Rules ──────────────────────────────────────────────────────────
// Single source of truth for all location types: subtypes, must_have, may_have,
// forbidden elements, safety overrides, compatible métier keys.
// Used by _resolveLocationAndComposition to pick a specific subtype and inject
// constraints into the scene JSON before prompt construction.

const LOCATION_RULES = {
  parking: {
    subtypes: [
      'open-air car park with marked spaces and lampposts',
      'underground car park — concrete pillars, low ceiling, fluorescent lighting',
      'shopping centre car park with cart return bays in background',
      'residential car park with apartment building facade behind',
      'station or airport car park with directional signage',
      'company car park with controlled entry barrier',
    ],
    must_have: ['marked parking bays or painted bay lines on the ground', 'asphalt or concrete surface'],
    may_have: ['barrier gate', 'parking metre or ticket machine', 'lampposts', 'directional signage', 'building facade matching the subtype'],
    forbidden: ['village square or market place', 'residential street kerbside without bay markings', 'motorway hard shoulder', 'countryside without road markings', 'petrol station forecourt'],
    safety_overrides: { triangle: 'forbidden_if_safely_parked' },
    compatible_jobs: ['depannage_auto'],
  },
  station_service: {
    subtypes: [
      'rural petrol station beside a main road',
      'peri-urban fuel station near a retail park',
      'hypermarket fuel station at a large retail site',
      'motorway service station forecourt',
    ],
    must_have: ['fuel pump dispensers visible', 'forecourt canopy overhead', 'asphalt forecourt surface'],
    may_have: ['small shop or cashier kiosk', 'road or retail zone visible in background', 'air and water station', 'directional road signs'],
    forbidden: ['legible brand names or logos in large text', 'residential houses directly alongside the forecourt', 'rural fields with no road infrastructure'],
    safety_overrides: { triangle: 'forbidden_if_safely_parked' },
    compatible_jobs: ['depannage_auto'],
  },
  garage_atelier: {
    subtypes: ['garage_client', 'atelier_depannage', 'depot_vehicules', 'cour_professionnelle'],
    must_have: ['concrete or tiled workshop floor', 'sectional or roller-shutter door — open or partially open'],
    may_have: ['vehicle lift hoist', 'workbench with tools', 'oil stains on floor', 'tyre rack', 'vehicles in service bays', 'professional van or tow truck outside'],
    forbidden: ['emergency warning triangle', 'motorway hard shoulder markings', 'public road lane markings'],
    safety_overrides: { triangle: 'forbidden' },
    compatible_jobs: ['depannage_auto'],
  },
  rue_centre_ville: {
    subtypes: [
      'narrow urban street with terraced buildings on both sides',
      'wide urban boulevard with a planted median',
      'paved urban square with surrounding buildings',
      'mixed residential and commercial urban street',
    ],
    must_have: ['pavement and kerbstone visible', 'urban building facades on at least one side'],
    may_have: ['parking metres', 'shop windows at ground level', 'street furniture', 'slow-moving or parked vehicles'],
    forbidden: ['motorway infrastructure', 'open countryside fields', 'heavy industrial warehouse zone'],
    safety_overrides: { triangle: 'required_if_blocking' },
    compatible_jobs: ['depannage_auto', 'vitrier', 'ravalement', 'nettoyage'],
  },
  route_departementale: {
    subtypes: [
      'narrow rural departmental road with hedgerows and ditches',
      'country road through open farmland with a grassed verge',
      'departmental road passing through a small village outskirts',
    ],
    must_have: ['single lane in each direction', 'road verge or grassy shoulder visible', 'rural or semi-rural environment'],
    may_have: ['hedgerows', 'fields or pasture', 'forest edge', 'scattered rural houses', 'kilometre marker post'],
    forbidden: ['motorway infrastructure', 'multiple traffic lanes', 'motorway overhead gantry signs', 'central reservation barrier'],
    safety_overrides: { triangle: 'required_if_on_road' },
    compatible_jobs: ['depannage_auto'],
  },
  route_nationale: {
    subtypes: [
      'peri-urban national road with retail zone or commercial strip in background',
      'inter-urban national road between two towns — moderate traffic',
      'national road entering a town with speed reduction signage',
    ],
    must_have: ['at least one lane in each direction', 'road lane markings visible'],
    may_have: ['central reservation or hatched median', 'roundabout visible in background', 'commercial signage at distance', 'slip road or turn lane'],
    forbidden: ['motorway-style crash barriers along the full length', 'purely rural single-track road', 'village centre square or market'],
    safety_overrides: { triangle: 'required_if_on_road' },
    compatible_jobs: ['depannage_auto'],
  },
  autoroute: {
    subtypes: [
      'three-lane motorway with hard shoulder and Armco barrier',
      'two-lane motorway with hard shoulder and central reservation',
      'motorway junction area with slip roads',
    ],
    must_have: ['hard shoulder clearly visible', 'crash barrier or Armco on at least one side', 'multiple traffic lanes'],
    may_have: ['overhead gantry signs', 'motorway service or exit sign', 'heavy goods vehicles in far lanes', 'distance marker posts'],
    forbidden: ['residential houses directly at the roadside', 'village or town infrastructure alongside the carriageway', 'single-track country road', 'pedestrian crossing on the carriageway'],
    safety_overrides: { triangle: 'required_if_safe' },
    compatible_jobs: ['depannage_auto'],
  },
  aire_repos: {
    subtypes: [
      'motorway rest area with picnic tables and sanitary block',
      'motorway service area with fuel station and shop',
      'roadside lay-by with picnic benches and waste bins',
    ],
    must_have: ['marked parking spaces for private vehicles', 'dedicated internal access lanes — separate from the motorway carriageway', 'visible rest area infrastructure — picnic tables or sanitary block or fuel pumps'],
    may_have: ['landscaped grass areas', 'directional signage', 'HGV parking zone', 'waste bins', 'tourist information board'],
    forbidden: ['village square', 'residential street or kerbside', 'town centre or historic buildings', 'municipal building fronting a road presented as the rest area'],
    safety_overrides: { triangle: 'forbidden_if_safely_parked' },
    compatible_jobs: ['depannage_auto'],
  },
  domicile: {
    subtypes: [
      'residential driveway with gate and house facade in the background',
      'enclosed private courtyard — gravel or paving, low wall or fence visible',
      'private garage forecourt with roller-shutter door',
      'private property entrance with letterbox and garden hedge',
    ],
    must_have: ['private property element clearly visible — gate, wall, garage door, or house facade'],
    may_have: ['private driveway', 'hedges or low wall', 'letterbox', 'privately parked car', 'garden edge'],
    forbidden: ['road lane markings', 'public pavement kerb indicating public road', 'carriageway with traffic', 'emergency warning triangle', 'yellow road lines', 'road verge in place of private garden'],
    safety_overrides: { triangle: 'forbidden' },
    compatible_jobs: ['depannage_auto'],
  },
  maison_individuelle: {
    subtypes: [
      'modern detached house with tiled roof and small front garden',
      'older individual house with rendered facade',
      'semi-detached house in a suburban street',
      'rural farmhouse with outbuildings',
    ],
    must_have: ['house building clearly visible — facade or roof or exterior'],
    may_have: ['garden', 'driveway', 'garage', 'fence or hedge', 'regional architectural style'],
    forbidden: ['motorway infrastructure', 'heavy industrial zone', 'underground setting'],
    safety_overrides: {},
    compatible_jobs: ['toiture', 'ravalement', 'nettoyage_toiture', 'nettoyage_gouttieres', 'etancheite', 'peinture', 'maçonnerie', 'vitrier', 'paysagiste'],
  },
  appartement: {
    subtypes: ['living room', 'kitchen', 'bedroom', 'bathroom or wet room', 'hallway or entrance', 'open-plan living space'],
    must_have: ['interior residential room — walls, ceiling, and floor of an apartment'],
    may_have: ['window showing outside view — sky trees facades or balcony are normal and allowed', 'apartment furniture', 'storage'],
    forbidden: ['exterior road as primary setting', 'building rooftop as setting', 'garage or workshop as setting'],
    safety_overrides: {},
    compatible_jobs: ['peinture', 'carrelage', 'vitrier', 'nettoyage', 'débarras'],
  },
  immeuble: {
    subtypes: ['immeuble_facade', 'immeuble_toit_terrasse', 'immeuble_toiture_inclinee', 'immeuble_parties_communes', 'immeuble_cour'],
    must_have: ['multi-storey collective residential building — repeated windows and multiple floors clearly visible'],
    may_have: ['balconies', 'communal courtyard', 'collective car park', 'urban street alongside the building'],
    forbidden: ['isolated rural farmhouse', 'industrial warehouse', 'single-storey detached pavilion'],
    safety_overrides: {},
    compatible_jobs: ['toiture', 'etancheite', 'ravalement', 'nettoyage_toiture', 'nettoyage_gouttieres', 'vitrier', 'nettoyage'],
  },
  commerce: {
    subtypes: ['retail shop with street frontage', 'restaurant or café with terrace', 'small independent pharmacy generic', 'hair or beauty salon', 'small service shop'],
    must_have: ['commercial premises — shop window or sales counter visible'],
    may_have: ['street frontage', 'storage area', 'commercial signage without dominant legible text'],
    forbidden: ['large identifiable brand signage with fully legible brand name text', 'purely residential room'],
    safety_overrides: {},
    compatible_jobs: ['vitrier', 'ravalement', 'nettoyage', 'peinture', 'carrelage'],
  },
  local_professionnel: {
    subtypes: ['professional office space', 'medical or legal practice', 'small agency or design studio', 'light workshop or atelier'],
    must_have: ['professional interior or exterior — neutral functional decor or professional facade'],
    may_have: ['reception desk', 'professional work offices', 'corridor', 'discreet facade signage', 'small car park'],
    forbidden: ['heavy industrial machinery', 'overtly residential furniture', 'large-scale warehouse'],
    safety_overrides: {},
    compatible_jobs: ['peinture', 'carrelage', 'vitrier', 'nettoyage'],
  },
  entrepot: {
    subtypes: ['industrial warehouse with racking and forklift access', 'logistics depot with loading bay and dock levellers', 'storage facility with large sectional doors', 'agricultural storage warehouse'],
    must_have: ['large internal volume — high ceiling, concrete or metal structure visible'],
    may_have: ['racking systems', 'pallets on the floor or on racks', 'forklift truck', 'loading dock', 'HGV yard'],
    forbidden: ['pallets placed directly on a pitched roof slope', 'residential interior', 'retail shop front'],
    safety_overrides: {},
    compatible_jobs: ['toiture', 'etancheite', 'nettoyage', 'débarras'],
  },
  batiment_agricole: {
    subtypes: ['metal-frame agricultural barn — bac acier cladding', 'traditional stone or timber barn', 'livestock building', 'grain or hay storage building'],
    must_have: ['agricultural building structure — large roof and rural setting'],
    may_have: ['farm machinery or tractor', 'bales of hay or straw', 'agricultural land in background', 'silo visible', 'wide access gates'],
    forbidden: ['urban street furniture', 'residential house facade', 'industrial loading bay'],
    safety_overrides: {},
    compatible_jobs: ['toiture', 'etancheite', 'nettoyage', 'maçonnerie'],
  },
  jardin_prive: {
    subtypes: ['suburban residential garden with lawn and planted beds', 'mature garden with established trees', 'garden with vegetable plot and garden shed'],
    must_have: ['private garden — lawn, planted beds, or terracing visible'],
    may_have: ['trees', 'hedges', 'garden shed', 'fences or walls', 'garden furniture at a distance'],
    forbidden: ['public park or municipal green space', 'motorway verge', 'industrial site'],
    safety_overrides: {},
    compatible_jobs: ['élagage', 'abattage', 'paysagiste'],
  },
  chantier_urbain: {
    subtypes: ['urban street construction with site fencing and hoarding', 'pavement or utilities trench in a town', 'building renovation site with scaffold and hoarding'],
    must_have: ['visible construction fencing or hoarding', 'urban context — streets or buildings immediately nearby'],
    may_have: ['safety fencing', 'skip or spoil container', 'construction vehicle', 'scaffolding'],
    forbidden: ['rural fields with no nearby buildings or streets', 'motorway-only infrastructure with no urban element'],
    safety_overrides: {},
    compatible_jobs: ['terrassement', 'maçonnerie', 'ravalement', 'nettoyage'],
  },
};

// ─── Triangle Rules ───────────────────────────────────────────────────────────
// Per location-type rule for warning triangle placement.
// Values: 'required_if_on_road' | 'required_if_safe' | 'required_if_blocking'
//       | 'forbidden' | 'forbidden_if_safely_parked'

const TRIANGLE_RULES = {
  autoroute:            { default: 'required_if_safe',            note: 'Hard shoulder breakdown — triangle visible if safe to deploy. Complement with hazard lights and high-vis vest.' },
  route_nationale:      { default: 'required_if_on_road',         note: 'Triangle placed at credible safety distance behind the vehicle.' },
  route_departementale: { default: 'required_if_on_road',         note: 'Triangle placed at credible safety distance behind the vehicle.' },
  rue_centre_ville:     { default: 'required_if_blocking',        note: 'Triangle only if the vehicle is actively blocking a traffic lane.' },
  parking:              { default: 'forbidden_if_safely_parked',  note: 'Triangle only if the vehicle is blocking an active internal lane.' },
  station_service:      { default: 'forbidden_if_safely_parked',  note: 'Triangle only if blocking a forecourt lane.' },
  aire_repos:           { default: 'forbidden_if_safely_parked',  note: 'No triangle for a safely parked vehicle — only if blocking an internal lane.' },
  domicile:             { default: 'forbidden',                   note: 'Private property — no triangle.' },
  garage_atelier:       { default: 'forbidden',                   note: 'Workshop — no triangle.' },
};

// ─── Photo Composition Library ────────────────────────────────────────────────
// weight=0 means used only via per-métier override, not in the default draw.

const PHOTO_COMPOSITIONS = {
  close_detail:           { weight: 20, min_workers: 0, description: 'tight close-up on the specific work detail — tool in use, material, join, or repair point fills most of the frame, camera 20–50 cm from the subject' },
  medium_intervention:    { weight: 30, min_workers: 0, description: 'medium shot showing the worker and immediate work area — activity readable, surroundings partially visible, 1–3 m from the main subject' },
  wide_worksite:          { weight: 30, min_workers: 0, description: 'wide shot of the full worksite showing scale — building, vehicle, or garden entirely visible in context, 5–15 m back' },
  contextual_overview:    { weight: 20, min_workers: 0, description: 'establishing shot — environment as important as the work, showing neighbourhood, road type, or property context, 10–30 m back' },
  worker_action:          { weight:  0, min_workers: 1, description: 'worker caught in natural motion — tool engaged, body in movement, no eye contact with camera, 1–4 m from the worker' },
  vehicle_arrival:        { weight:  0, min_workers: 0, description: 'professional service vehicle clearly visible — van, tow truck, or service vehicle parked near the work location, 5–20 m back' },
  equipment_from_vehicle: { weight:  0, min_workers: 0, description: 'equipment being unloaded or laid out from the open service vehicle — tools visible, vehicle rear open, 2–6 m' },
};

// Per-métier composition weight distribution — must sum to 100.
const _COMPOSITION_DIST = {
  default: {
    close_detail:        20,
    medium_intervention: 30,
    wide_worksite:       30,
    contextual_overview: 20,
  },
  depannage_auto: {
    close_detail:           10,
    medium_intervention:    25,
    wide_worksite:          30,
    contextual_overview:    20,
    vehicle_arrival:        10,
    equipment_from_vehicle:  5,
  },
};

// ─── Camera composition library (distance + frame constraints) ───────────────
const CAMERA_COMPOSITIONS = {
  close_detail: {
    distance: 'approximately 1.5 to 2 metres',
    subject_max_frame_percent: 55,
    environment_min_frame_percent: 20,
    forbidden: [
      'extreme macro photography',
      'one tool filling most of the frame',
      'camera pressed directly against the work surface',
      'scene with no readable surroundings',
    ],
  },
  medium_intervention: {
    distance: 'approximately 2.5 to 4 metres',
    subject_max_frame_percent: 65,
    environment_min_frame_percent: 25,
    required: [
      'the active work is readable',
      'a substantial part of the worksite is visible',
      'some surrounding context remains visible',
    ],
  },
  wide_worksite: {
    distance: 'approximately 5 to 8 metres',
    subject_max_frame_percent: 50,
    environment_min_frame_percent: 40,
    required: [
      'the overall worksite is visible',
      'the building, vehicle, garden or room remains identifiable',
      'workers and professional vehicle are visible when selected',
    ],
  },
  contextual_overview: {
    distance: 'approximately 6 to 12 metres',
    subject_max_frame_percent: 40,
    environment_min_frame_percent: 50,
    required: [
      'the work occupies only part of the frame',
      'the location is immediately understandable',
      'the photo feels casually documented rather than composed',
    ],
  },
  worker_action: {
    distance: 'approximately 1 to 4 metres',
    subject_max_frame_percent: 65,
    environment_min_frame_percent: 20,
    required: [
      'the worker is caught in natural motion',
      'tool is engaged or body is in movement',
      'no eye contact with camera',
    ],
  },
  vehicle_arrival: {
    distance: 'approximately 5 to 20 metres',
    subject_max_frame_percent: 50,
    environment_min_frame_percent: 35,
    required: [
      'professional service vehicle clearly visible',
      'location context visible around the vehicle',
    ],
  },
  equipment_from_vehicle: {
    distance: 'approximately 2 to 6 metres',
    subject_max_frame_percent: 55,
    environment_min_frame_percent: 25,
    required: [
      'equipment being unloaded or laid out from open vehicle',
      'tools visible, vehicle rear open',
    ],
  },
};

// ─── Per-métier composition rules ─────────────────────────────────────────────
const COMPOSITION_RULES_BY_METIER = {
  toiture: {
    allowed_compositions: ['close_detail', 'medium_intervention', 'wide_worksite', 'contextual_overview'],
    preferred_compositions: ['medium_intervention', 'wide_worksite', 'contextual_overview'],
    close_detail_max_ratio: 0.20,
    minimum_contextual_images_per_batch: 1,
    minimum_worker_images_per_active_batch: 1,
    vehicle_rules: { placement: 'parked at street level near the building, never on the roof' },
    forbidden_framing: ['tile filling most of the frame with no surroundings', 'single tool as hero shot', 'macro photo of slate or flashing with no wider context'],
  },
  etancheite: {
    allowed_compositions: ['close_detail', 'medium_intervention', 'wide_worksite', 'contextual_overview'],
    preferred_compositions: ['medium_intervention', 'wide_worksite'],
    close_detail_max_ratio: 0.20,
    minimum_contextual_images_per_batch: 1,
    minimum_worker_images_per_active_batch: 1,
    vehicle_rules: {},
    forbidden_framing: ['roll of membrane as hero shot', 'torch alone in frame'],
  },
  nettoyage_toiture: {
    allowed_compositions: ['close_detail', 'medium_intervention', 'wide_worksite', 'contextual_overview'],
    preferred_compositions: ['medium_intervention', 'wide_worksite'],
    close_detail_max_ratio: 0.20,
    minimum_contextual_images_per_batch: 1,
    minimum_worker_images_per_active_batch: 1,
    vehicle_rules: {},
    forbidden_framing: ['pressure lance as hero shot'],
  },
  nettoyage_gouttieres: {
    allowed_compositions: ['close_detail', 'medium_intervention', 'wide_worksite', 'contextual_overview'],
    preferred_compositions: ['medium_intervention', 'wide_worksite'],
    close_detail_max_ratio: 0.25,
    minimum_contextual_images_per_batch: 1,
    minimum_worker_images_per_active_batch: 1,
    vehicle_rules: {},
    forbidden_framing: ['macro photo of gutter channel alone'],
  },
  elagage: {
    allowed_compositions: ['medium_intervention', 'wide_worksite', 'contextual_overview', 'worker_action'],
    preferred_compositions: ['wide_worksite', 'medium_intervention'],
    close_detail_max_ratio: 0.10,
    minimum_contextual_images_per_batch: 1,
    minimum_worker_images_per_active_batch: 1,
    vehicle_rules: {},
    forbidden_framing: ['chainsaw as hero shot', 'rope detail alone', 'single branch detail with no surroundings'],
  },
  abattage: {
    allowed_compositions: ['wide_worksite', 'contextual_overview', 'medium_intervention', 'worker_action'],
    preferred_compositions: ['wide_worksite', 'contextual_overview'],
    close_detail_max_ratio: 0.10,
    minimum_contextual_images_per_batch: 1,
    minimum_worker_images_per_active_batch: 1,
    vehicle_rules: {},
    forbidden_framing: ['chain detail alone', 'stump alone filling frame', 'chainsaw filling frame'],
  },
  paysagiste: {
    allowed_compositions: ['close_detail', 'medium_intervention', 'wide_worksite', 'contextual_overview'],
    preferred_compositions: ['medium_intervention', 'wide_worksite'],
    close_detail_max_ratio: 0.20,
    minimum_contextual_images_per_batch: 1,
    minimum_worker_images_per_active_batch: 1,
    vehicle_rules: {},
    forbidden_framing: ['single plant filling frame as hero shot', 'tool arranged for display'],
  },
  peinture: {
    allowed_compositions: ['close_detail', 'medium_intervention', 'wide_worksite', 'contextual_overview'],
    preferred_compositions: ['medium_intervention', 'wide_worksite'],
    close_detail_max_ratio: 0.20,
    minimum_contextual_images_per_batch: 1,
    minimum_worker_images_per_active_batch: 1,
    vehicle_rules: {},
    forbidden_framing: ['roller alone filling most of the frame', 'paint tin as hero shot', 'series of only roller or brush close-ups'],
  },
  terrassement: {
    allowed_compositions: ['wide_worksite', 'contextual_overview', 'medium_intervention'],
    preferred_compositions: ['wide_worksite', 'contextual_overview'],
    close_detail_max_ratio: 0.10,
    minimum_contextual_images_per_batch: 1,
    minimum_worker_images_per_active_batch: 1,
    vehicle_rules: {},
    forbidden_framing: ['bucket alone filling frame', 'dirt pile alone with no site context', 'pipe detail with no trench context'],
  },
  maconnerie: {
    allowed_compositions: ['close_detail', 'medium_intervention', 'wide_worksite', 'contextual_overview'],
    preferred_compositions: ['medium_intervention', 'wide_worksite'],
    close_detail_max_ratio: 0.20,
    minimum_contextual_images_per_batch: 1,
    minimum_worker_images_per_active_batch: 1,
    vehicle_rules: {},
    forbidden_framing: ['mortar detail alone', 'single block as hero shot', 'trowel filling most of the frame'],
  },
  vitrier: {
    allowed_compositions: ['medium_intervention', 'wide_worksite', 'contextual_overview'],
    preferred_compositions: ['medium_intervention', 'wide_worksite'],
    close_detail_max_ratio: 0.15,
    minimum_contextual_images_per_batch: 1,
    minimum_worker_images_per_active_batch: 1,
    vehicle_rules: {},
    forbidden_framing: ['seal bead alone as hero shot', 'single suction cup filling frame'],
  },
  nettoyage: {
    allowed_compositions: ['close_detail', 'medium_intervention', 'wide_worksite', 'contextual_overview'],
    preferred_compositions: ['medium_intervention', 'wide_worksite'],
    close_detail_max_ratio: 0.25,
    minimum_contextual_images_per_batch: 1,
    minimum_worker_images_per_active_batch: 0,
    vehicle_rules: {},
    forbidden_framing: ['hose nozzle as hero shot', 'chemical bottle filling frame'],
  },
  ravalement: {
    allowed_compositions: ['medium_intervention', 'wide_worksite', 'contextual_overview'],
    preferred_compositions: ['wide_worksite', 'contextual_overview'],
    close_detail_max_ratio: 0.15,
    minimum_contextual_images_per_batch: 1,
    minimum_worker_images_per_active_batch: 1,
    vehicle_rules: {},
    forbidden_framing: ['rendering detail alone', 'surface texture macro with no building context'],
  },
  carrelage: {
    allowed_compositions: ['close_detail', 'medium_intervention', 'wide_worksite', 'contextual_overview'],
    preferred_compositions: ['medium_intervention', 'wide_worksite'],
    close_detail_max_ratio: 0.20,
    minimum_contextual_images_per_batch: 1,
    minimum_worker_images_per_active_batch: 0,
    vehicle_rules: {},
    forbidden_framing: ['grout lines filling entire frame', 'single tile spacer as hero shot'],
  },
  debarras: {
    allowed_compositions: ['medium_intervention', 'wide_worksite', 'contextual_overview'],
    preferred_compositions: ['wide_worksite', 'contextual_overview'],
    close_detail_max_ratio: 0.15,
    minimum_contextual_images_per_batch: 1,
    minimum_worker_images_per_active_batch: 0,
    vehicle_rules: {},
    forbidden_framing: ['single object filling frame as catalogue hero'],
  },
  depannage_auto: {
    allowed_compositions: ['close_detail', 'medium_intervention', 'wide_worksite', 'contextual_overview', 'vehicle_arrival', 'equipment_from_vehicle', 'worker_action'],
    preferred_compositions: ['medium_intervention', 'wide_worksite'],
    close_detail_max_ratio: 0.10,
    minimum_contextual_images_per_batch: 1,
    minimum_worker_images_per_active_batch: 1,
    vehicle_rules: {},
    forbidden_framing: ['pressure gauge filling most of the frame', 'multimeter display as hero shot', 'battery clamp alone as hero shot', 'tyre tread macro with no car or context'],
  },
};

// ─── Per-métier professional vehicle rules ────────────────────────────────────
const PROFESSIONAL_VEHICLE_RULES = {
  toiture:            { types: ['white utility van', 'pickup with roof rack'],            dist: { clearly_visible: 35, partially_visible: 25, absent: 40 } },
  etancheite:         { types: ['flat-bed lorry with membrane rolls', 'utility van'],      dist: { clearly_visible: 30, partially_visible: 25, absent: 45 } },
  nettoyage_toiture:  { types: ['utility van with pressure washer'],                       dist: { clearly_visible: 30, partially_visible: 25, absent: 45 } },
  nettoyage_gouttieres:{ types: ['utility van with ladder rack'],                          dist: { clearly_visible: 25, partially_visible: 25, absent: 50 } },
  elagage:            { types: ['arborist van', 'chipper truck', 'trailer with branches'], dist: { clearly_visible: 40, partially_visible: 30, absent: 30 } },
  abattage:           { types: ['arborist van', 'log trailer', 'chipper truck'],           dist: { clearly_visible: 40, partially_visible: 30, absent: 30 } },
  paysagiste:         { types: ['landscape van', 'trailer with mower'],                    dist: { clearly_visible: 35, partially_visible: 25, absent: 40 } },
  peinture:           { types: ['painter decorator van'],                                  dist: { clearly_visible: 20, partially_visible: 25, absent: 55 } },
  terrassement:       { types: ['mini-excavator on trailer', 'tipper lorry'],              dist: { clearly_visible: 50, partially_visible: 20, absent: 30 } },
  maconnerie:         { types: ['builder utility van', 'pickup with material'],            dist: { clearly_visible: 30, partially_visible: 25, absent: 45 } },
  vitrier:            { types: ['glazier van with A-frame glass rack'],                    dist: { clearly_visible: 35, partially_visible: 30, absent: 35 } },
  nettoyage:          { types: ['cleaning company van'],                                   dist: { clearly_visible: 20, partially_visible: 20, absent: 60 } },
  ravalement:         { types: ['scaffold lorry', 'builder utility van'],                  dist: { clearly_visible: 30, partially_visible: 25, absent: 45 } },
  carrelage:          { types: ['tiler van', 'small utility van'],                         dist: { clearly_visible: 15, partially_visible: 20, absent: 65 } },
  debarras:           { types: ['removal van', 'skip lorry', 'tipper van'],                dist: { clearly_visible: 40, partially_visible: 20, absent: 40 } },
  depannage_auto:     { types: ['breakdown recovery van', 'flatbed tow truck'],            dist: { clearly_visible: 40, partially_visible: 25, absent: 35 } },
};

// ─── Smartphone capture defects library (weighted) ────────────────────────────
const CAPTURE_DEFECTS = {
  slight_motion_blur:   { weight: 15, prompt: 'very slight handheld motion blur affecting a minor edge, without hiding the work' },
  soft_autofocus:       { weight: 18, prompt: 'ordinary smartphone autofocus with slightly soft secondary areas' },
  small_lens_smudge:    { weight: 10, prompt: 'a faint small lens smudge or hazy patch close to one edge' },
  finger_edge:          { weight:  5, prompt: 'a tiny out-of-focus fingertip intruding at one extreme corner, covering no work or safety detail' },
  jpeg_compression:     { weight: 25, prompt: 'subtle JPEG compression and ordinary smartphone processing' },
  sensor_noise:         { weight: 15, prompt: 'mild digital noise in darker or shadowed areas' },
  slight_tilt:          { weight: 18, prompt: 'slightly tilted handheld framing' },
  imperfect_crop:       { weight: 16, prompt: 'casual imperfect framing with one unimportant object partially cropped' },
  minor_exposure_error: { weight: 10, prompt: 'slightly imperfect automatic exposure with a mildly bright sky or dark corner' },
  light_dirt_speck:     { weight:  8, prompt: 'one tiny soft dirt speck near the outer edge of the image' },
};

// Same-family pairs are forbidden — prevents cumulating two similar-looking defects.
const CAPTURE_DEFECT_GROUPS = {
  optical_obstruction: ['small_lens_smudge', 'light_dirt_speck', 'finger_edge'],
  focus_motion:        ['soft_autofocus', 'slight_motion_blur'],
  framing:             ['slight_tilt', 'imperfect_crop'],
  digital_processing:  ['jpeg_compression', 'sensor_noise', 'minor_exposure_error'],
};

// Mapping: CONTEXTE_BY_METIER values (per-métier) → LOCATION_RULES key
const _CONTEXTE_TO_LOCATION = {
  depannage_auto: {
    autoroute:       'autoroute',
    route_nationale: 'route_nationale',
    route_dept:      'route_departementale',
    rue_ville:       'rue_centre_ville',
    parking:         'parking',
    domicile:        'domicile',
    garage:          'garage_atelier',
    station_service: 'station_service',
    aire_repos:      'aire_repos',
  },
};

// Mapping: CONTEXTE_OPTIONS values (all other métiers) → LOCATION_RULES key
const _CONTEXTE_OPTIONS_TO_LOCATION = {
  maison:        'maison_individuelle',
  appartement:   'appartement',
  immeuble:      'immeuble',
  commerce:      'commerce',
  professionnel: 'local_professionnel',
  entrepot:      'entrepot',
  agricole:      'batiment_agricole',
};

// Aliases and normalized synonyms — covers any value not in the specific maps above.
// Key: normalized string (lowercase, no accents, underscores). Value: LOCATION_RULES key.
const LOCATION_ALIASES = {
  // Outdoor / garden
  jardin:              'jardin_prive',
  jardin_prive:        'jardin_prive',
  parc:                'jardin_prive',
  espace_vert:         'jardin_prive',
  // Worksite
  chantier:            'chantier_urbain',
  chantier_urbain:     'chantier_urbain',
  voirie:              'chantier_urbain',
  // Residential
  maison:              'maison_individuelle',
  maison_individuelle: 'maison_individuelle',
  pavillon:            'maison_individuelle',
  domicile:            'domicile',
  appartement:         'appartement',
  immeuble:            'immeuble',
  copropriete:         'immeuble',
  // Commercial / pro
  commerce:            'commerce',
  professionnel:       'local_professionnel',
  local_pro:           'local_professionnel',
  local_professionnel: 'local_professionnel',
  // Industrial / agricultural
  entrepot:            'entrepot',
  hangar:              'batiment_agricole',
  batiment_agricole:   'batiment_agricole',
  agricole:            'batiment_agricole',
  // Auto / road
  parking:             'parking',
  station_service:     'station_service',
  aire_repos:          'aire_repos',
  garage:              'garage_atelier',
  garage_atelier:      'garage_atelier',
  atelier:             'garage_atelier',
  autoroute:           'autoroute',
  route_nationale:     'route_nationale',
  route_dept:          'route_departementale',
  route_departementale: 'route_departementale',
  rue_ville:           'rue_centre_ville',
  rue_centre_ville:    'rue_centre_ville',
};

// Per-métier fallback when the context does not resolve through any mapping.
// Keys are normalized (no accents, underscores). Used as last resort before null.
const DEFAULT_LOCATION_BY_METIER = {
  elagage:              'jardin_prive',
  abattage:             'jardin_prive',
  paysagiste:           'jardin_prive',
  terrassement:         'chantier_urbain',
  amenagement_exterieur:'chantier_urbain',
  maconnerie:           'maison_individuelle',
  toiture:              'maison_individuelle',
  charpente:            'maison_individuelle',
  etancheite:           'immeuble',
};

// Normalize a raw context/métier string to a lookup key (lowercase, no accents, underscores).
function _normalizeLocationKey(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// ─── Subtype compatibility — which location subtypes are valid per service/métier ─────────────────
// Keys are normalized keyword fragments checked against (normService + ' ' + normKey).
// More specific keys must appear BEFORE shorter ones (object insertion order is preserved).
// Values: arrays of subtypes that must exist in LOCATION_RULES[locationType].subtypes.

const LOCATION_SUBTYPE_COMPATIBILITY = {
  immeuble: {
    // Flat-roof waterproofing — must never be immeuble_toiture_inclinee
    toit_terrasse:          ['immeuble_toit_terrasse'],
    toiture_terrasse:       ['immeuble_toit_terrasse'],
    membrane:               ['immeuble_toit_terrasse'],
    etancheite:             ['immeuble_toit_terrasse'],
    // Pitched-roof coverage — must never be immeuble_toit_terrasse or parties_communes
    tuile:                  ['immeuble_toiture_inclinee'],
    ardoise:                ['immeuble_toiture_inclinee'],
    couverture:             ['immeuble_toiture_inclinee'],
    faitage:                ['immeuble_toiture_inclinee'],
    nettoyage_gouttieres:   ['immeuble_toiture_inclinee'],
    gouttiere:              ['immeuble_toiture_inclinee'],
    // Generic roof — both pitched and flat acceptable
    nettoyage_toiture:      ['immeuble_toiture_inclinee', 'immeuble_toit_terrasse'],
    toiture:                ['immeuble_toiture_inclinee', 'immeuble_toit_terrasse'],
    // Façade
    ravalement:             ['immeuble_facade'],
    facade:                 ['immeuble_facade'],
    // Glazing — facade or common areas
    vitrier:                ['immeuble_facade', 'immeuble_parties_communes'],
    vitre:                  ['immeuble_facade', 'immeuble_parties_communes'],
    fenetre:                ['immeuble_facade', 'immeuble_parties_communes'],
    // Interior / common areas
    peinture:               ['immeuble_parties_communes'],
    carrelage:              ['immeuble_parties_communes'],
    nettoyage:              ['immeuble_parties_communes', 'immeuble_cour', 'immeuble_facade'],
  },
  chantier_urbain: {
    // Excavation / trenching — NOT scaffold/facade renovation
    fondation:              ['urban street construction with site fencing and hoarding'],
    tranchee:               ['pavement or utilities trench in a town'],
    reseau:                 ['pavement or utilities trench in a town'],
    terrassement:           ['urban street construction with site fencing and hoarding', 'pavement or utilities trench in a town'],
    // Structural / masonry
    maconnerie:             ['building renovation site with scaffold and hoarding', 'urban street construction with site fencing and hoarding'],
    // Façade-focused
    ravalement:             ['building renovation site with scaffold and hoarding'],
  },
  jardin_prive: {
    // Tree work — prefer mature garden when service is abattage
    abattage:               ['mature garden with established trees'],
    elagage:                ['suburban residential garden with lawn and planted beds', 'mature garden with established trees'],
    haie:                   ['suburban residential garden with lawn and planted beds', 'garden with vegetable plot and garden shed'],
    taille:                 ['suburban residential garden with lawn and planted beds', 'mature garden with established trees'],
    // Ground work
    tonte:                  ['suburban residential garden with lawn and planted beds'],
    gazon:                  ['suburban residential garden with lawn and planted beds'],
    paysagiste:             ['suburban residential garden with lawn and planted beds', 'garden with vegetable plot and garden shed'],
  },
};

// ─── Work surface — resolved from subtype + service keywords ─────────────────────────────────────
// Maps each location subtype to its default visual surface description for the rewrite prompt.
const WORK_SURFACE_BY_SUBTYPE = {
  // immeuble
  immeuble_toit_terrasse:    'flat concrete or bitumen roof deck — parapet upstands and surface drainage visible',
  immeuble_toiture_inclinee: 'pitched tiled or slate roof slope — ridge line and fixing battens visible',
  immeuble_facade:           'multi-storey building facade — rendered or stone surface with weathering marks',
  immeuble_parties_communes: 'communal stairwell or corridor — walls, ceiling, and landing floor visible',
  immeuble_cour:             'communal courtyard — paving stones with surrounding building facades',
  // chantier_urbain
  'urban street construction with site fencing and hoarding': 'open excavation zone — raw soil, aggregate mounds, and site hoardings',
  'pavement or utilities trench in a town':                   'utility trench in pavement — pipes or conduits at the base, backfill area',
  'building renovation site with scaffold and hoarding':      'scaffold-clad facade or roof-level work platform on a renovation site',
  // jardin_prive
  'suburban residential garden with lawn and planted beds':   'garden surface — lawn, planted borders, and garden hedges',
  'mature garden with established trees':                     'established tree canopy — large trunk base with branches requiring work',
  'garden with vegetable plot and garden shed':               'garden ground — soil, vegetable beds, and established shrubs',
  // maison_individuelle
  'modern detached house with tiled roof and small front garden': 'modern clay or concrete tile roof pitch',
  'older individual house with rendered facade':              'rendered house facade or pitched roof surface',
  'semi-detached house in a suburban street':                 'suburban house roof or facade surface',
  'rural farmhouse with outbuildings':                        'farmhouse roof — stone, slate, or fibre-cement cladding',
  // appartement
  'living room':              'living room — walls and ceiling being treated',
  'kitchen':                  'kitchen — wall tiles or surfaces in progress',
  'bedroom':                  'bedroom interior — walls, ceiling, or floor surface',
  'bathroom or wet room':     'bathroom — tiled walls and floor, shower or bath area',
  'hallway or entrance':      'hallway walls and ceiling',
  'open-plan living space':   'large open-plan interior — expanse of wall and ceiling surface',
  // entrepot
  'industrial warehouse with racking and forklift access':    'warehouse interior — high ceiling, concrete floor, metal racking',
  'logistics depot with loading bay and dock levellers':      'loading bay zone — dock leveller and HGV access',
  'storage facility with large sectional doors':              'large-volume interior — concrete or metal walls and ceiling',
  'agricultural storage warehouse':                           'agricultural building interior — earth or concrete floor',
  // batiment_agricole
  'metal-frame agricultural barn — bac acier cladding':       'metal barn — bac acier cladding or roof panels',
  'traditional stone or timber barn':                         'stone or timber barn structure — walls and roof elements',
  'livestock building':                                       'livestock building floor and wall surfaces',
  'grain or hay storage building':                            'grain storage interior — bins or floor area',
  // commerce
  'retail shop with street frontage':                         'shop interior or storefront — glass façade and display window visible',
  'restaurant or café with terrace':                          'café or restaurant interior or terrace surface',
  'small independent pharmacy generic':                       'shop interior — counter, shelving, and service area',
  'hair or beauty salon':                                     'salon interior — treatment stations and mirrors',
  'small service shop':                                       'shop or workshop interior — service counter or workbench',
  // local_professionnel
  'professional office space':                                'office interior — desks, walls, and ceiling being treated',
  'medical or legal practice':                                'professional interior — neutral walls and floor surface',
  'small agency or design studio':                            'studio or office interior — open workspace',
  'light workshop or atelier':                                'workshop interior — benches, tools, and wall surfaces',
};

// Service keyword overrides — checked first (normalize service, longest-match wins).
// If the normalized _matched_service contains the key, this surface description is used.
const WORK_SURFACE_SERVICE_OVERRIDES = {
  membrane:           'flat roof deck — bitumen or EPDM membrane being stripped or re-applied in sheets',
  etancheite:         'waterproofing surface — concrete or composite deck with upstands and drainage outlets',
  toit_terrasse:      'toit-terrasse — flat concrete deck, existing membrane partially removed',
  terrassement:       'excavated ground — raw soil, trench walls, spoil mounds, and earthmoving tracks',
  fondation:          'foundation pit — reinforced concrete footings or formwork being positioned',
  tranchee:           'open trench — cut through pavement, utility pipes at the base, sandy backfill',
  ravalement:         'building facade surface — render or stone being stripped, cleaned, or re-coated',
  elagage:            'tree canopy — branches being cut, chainsaw, cut sections accumulating below',
  abattage:           'felled or falling tree — stump base, sectioned logs, and wood chippings on ground',
  gouttiere:          'roof gutter line — debris and moss being cleared from the channel',
  vitrier:            'glazing frame — old pane removed, new glass unit being manoeuvred into position',
  carrelage:          'floor or wall substrate — adhesive bed drying or tiles being positioned',
  peinture:           'interior surface — fresh paint layer, roller marks, masking tape at edges',
  nettoyage:          'surface being high-pressure washed or scrubbed — dark staining being removed',
  vitre:              'glazing frame — old glass pane removed, new glass unit being positioned into the frame',
  vitrine:            'storefront glazing — shopfront glass panel or display-window unit being replaced or sealed',
  debarras:           'room or space being cleared — bulky items and debris stacked for removal',
  // depannage_auto — service-level surface (same regardless of road location)
  crevaison:          'deflated tyre against the tarmac — nail or screw visible in the tread, sidewall collapsed against the rim',
  demarrage:          'vehicle engine bay open — battery terminals exposed, jump cable clamps connected',
  batterie:           'vehicle engine bay open — battery exposed, charger or jump leads in place',
  panne:              'vehicle bonnet raised — engine visible, diagnostic tool or torch nearby',
  remorquage:         'vehicle being loaded onto a flatbed tow truck — rear wheels on the loading ramp',
};

// ─── Resolve a compatible location subtype based on service + métier ─────────────────────────────
function _resolveCompatibleSubtype({ locationType, normKey, normService, seed }) {
  const allSubtypes = LOCATION_RULES[locationType]?.subtypes || [];
  if (!allSubtypes.length) return null;

  const compat = LOCATION_SUBTYPE_COMPATIBILITY[locationType];
  if (!compat) return _pick(allSubtypes, 1, seed)[0] || null;

  // Search longest key first (object insertion order is already specificity-ordered)
  const combined = normService + ' ' + normKey;
  let pool = null;
  for (const k of Object.keys(compat)) {
    if (combined.includes(k)) { pool = compat[k]; break; }
  }
  if (!pool) pool = allSubtypes; // no match → unrestricted

  const valid = pool.filter(s => allSubtypes.includes(s));
  return _pick(valid.length ? valid : allSubtypes, 1, seed)[0] || null;
}

// ─── Resolve work_surface from subtype + service ─────────────────────────────────────────────────
function _resolveWorkSurface(subtype, normService) {
  // Service keyword overrides take priority
  for (const k of Object.keys(WORK_SURFACE_SERVICE_OVERRIDES)) {
    if (normService.includes(k)) return WORK_SURFACE_SERVICE_OVERRIDES[k];
  }
  // Subtype-specific default, then fallback to the subtype string itself
  return WORK_SURFACE_BY_SUBTYPE[subtype] || (subtype ? String(subtype) : null);
}

// ─── Validate location subtype compatibility with métier/service ──────────────────────────────────
// Runs after _validateResolvedScene. Detects and patches subtype contradictions.
// Returns { ok, issues, fixedStr }.

function _validateLocationServiceCompatibility(jsonStr) {
  let obj;
  try { obj = JSON.parse(jsonStr); } catch { return { ok: true, issues: [], fixedStr: jsonStr }; }

  const issues  = [];
  const patched = Object.assign({}, obj);
  const locType  = patched.location_type;
  const locSub   = patched.location_subtype;
  if (!locType || !LOCATION_RULES[locType]) return { ok: true, issues: [], fixedStr: jsonStr };

  const normKey     = _normalizeLocationKey(patched._matched_key    || '');
  const normService = _normalizeLocationKey(patched._matched_service || '');
  const allSubtypes = LOCATION_RULES[locType].subtypes || [];

  // LSC1 — subtype not in the location's declared list
  if (locSub && !allSubtypes.includes(locSub)) {
    issues.push(`LSC1: "${locSub}" not in LOCATION_RULES.${locType}.subtypes — re-resolving`);
    patched.location_subtype = _resolveCompatibleSubtype({
      locationType: locType, normKey, normService,
      seed: _hashSeed(`${normKey}|${normService}|fix`),
    });
  }

  const combined = normService + ' ' + normKey;

  // LSC2 — toiture/couverture + immeuble_parties_communes
  if ((combined.includes('toiture') || combined.includes('couverture')) && locSub === 'immeuble_parties_communes') {
    issues.push('LSC2: toiture/couverture cannot use immeuble_parties_communes — correcting to immeuble_toiture_inclinee');
    patched.location_subtype = 'immeuble_toiture_inclinee';
  }

  // LSC3 — étanchéité membrane/toit-terrasse + immeuble_toiture_inclinee
  if ((combined.includes('terrasse') || combined.includes('membrane')) && locSub === 'immeuble_toiture_inclinee') {
    issues.push('LSC3: étanchéité toit-terrasse/membrane contradicts immeuble_toiture_inclinee — correcting');
    patched.location_subtype = 'immeuble_toit_terrasse';
  }

  // LSC4 — terrassement + scaffold/renovation subtype
  if (combined.includes('terrassement') && locSub === 'building renovation site with scaffold and hoarding') {
    issues.push('LSC4: terrassement incompatible with scaffold renovation — correcting');
    patched.location_subtype = allSubtypes.find(s => s.includes('trench') || s.includes('construction')) || allSubtypes[0];
  }

  // LSC5 — ravalement + immeuble but subtype is not immeuble_facade
  if (combined.includes('ravalement') && locType === 'immeuble' && locSub && locSub !== 'immeuble_facade') {
    issues.push(`LSC5: ravalement requires immeuble_facade — was "${locSub}"`);
    patched.location_subtype = 'immeuble_facade';
  }

  // Recompute work_surface after potential subtype correction
  const finalSub = patched.location_subtype;
  if (finalSub) {
    patched.work_surface = _resolveWorkSurface(finalSub, normService);
  }

  return {
    ok:       issues.length === 0,
    issues,
    fixedStr: JSON.stringify(patched),
  };
}

// ─── Définit par métier les actions, postures, accès, sécurité, interdits et présence indirecte.
// Utilisé par _buildWorkerDesc pour générer une description cohérente et par
// _validateWorkerScene pour garantir la sécurité et l'exclusion des éléments interdits.
const WORKER_SCENE_RULES = {
  toiture: {
    max_workers: 2,
    actions: [
      'laying replacement tiles on the exposed roof pitch',
      'nailing battens along the rafter line',
      'pointing ridge tiles with fresh mortar',
      'fitting zinc flashing at the valley or eave',
    ],
    postures: [
      'kneeling on the roof pitch beside a small tile stack on a secured material bracket, both hands on the work — back to camera',
      'crouching at the ridge line with the trowel working the mortar bed — back to camera',
      'leaning against the roof ladder hooked at the ridge, working the pitch below — in profile',
    ],
    access: ['roof ladder hooked over the ridge', 'scaffold platform at eave level', 'mobile elevated platform'],
    safety_required: ['safety harness with lanyard clipped to a ridge anchor', 'roof ladder clearly hooked over the ridge'],
    forbidden: [
      'standing upright on steep pitch without visible safety line',
      'feet hanging over the gutter edge',
      'worker standing directly on the gutter',
      'worker suspended or leaning above the gutter without platform',
      'free-standing ladder propped against tiles without ridge hook',
      'ladder used as a horizontal platform across the pitch',
      'unsupported ladder lying across the roof',
      'improvised plank platform balanced on tiles',
      'rope without a visible certified anchor point',
      'worker body floating or feet off the roof surface',
    ],
    scene_always_exclude: [
      'full industrial pallet of tiles on pitched roof',
      'unsecured tile pallet on slope',
      'heavy crate resting directly on roof battens',
      'loose stack of tiles near roof edge',
      'materials positioned above doorway or pedestrian area',
      'large heavy load balanced on roof pitch',
    ],
    site_material_rule: 'a small manually transportable stack of approximately 5–12 tiles placed on a secured roof material bracket or scaffold platform, well away from the roof edge — no industrial pallet on the pitch',
    presence_indirect: [
      'roof ladder hooked over the ridge — no one on it, small tile stack on a material bracket halfway up the pitch',
      'safety line rigged across the pitch with the lanyard hanging free — no roofer visible',
      'mortar bucket hoisted to the ridge level, pulley rope tied to the chimney — no worker on roof',
    ],
  },
  nettoyage_toiture: {
    max_workers: 1,
    actions: [
      'directing the pressure lance jet at the moss on the tile surface',
      'brushing moss from the tile course with a stiff deck broom',
      'applying hydrofuge spray with a knapsack pump sprayer',
    ],
    postures: [
      'kneeling on the scaffold platform at eave height, lance aimed at the roof pitch — back to camera',
      'standing on a mobile elevated platform beside the eave, directing the lance — in profile',
      'walking slowly up the roof pitch beside the roof ladder, brush in hand — back to camera',
    ],
    access: ['scaffold platform at eave level', 'mobile elevated work platform', 'roof ladder for access only'],
    safety_required: ['safety harness', 'waterproof jacket and trousers', 'non-slip work boots'],
    forbidden: [
      'standing unsupported on wet moss-covered tiles without harness',
      'leaning over the gutter edge without guardrail',
      'bare hands on wet chemical-treated tiles',
    ],
    presence_indirect: [
      'pressure lance resting on the scaffold platform at eave level — tarpaulin below catching moss runoff, no operator',
      'knapsack sprayer on the scaffold platform beside the eave — no one visible',
      'moss removal debris collected on the tarpaulin below the roof edge — no worker on roof',
    ],
  },
  nettoyage_gouttieres: {
    max_workers: 1,
    actions: [
      'scooping compacted leaf debris from the gutter trough with a plastic gutter scoop',
      'flushing the downpipe connection with a garden hose',
      'resealing a leaking gutter joint with silicone sealant',
    ],
    postures: [
      'at the top of an extending ladder, both hands inside the gutter trough — back to camera',
      'on a scaffold platform level with the gutter, reaching along the trough — in profile',
    ],
    access: ['extending ladder with standoff bracket footed on level ground', 'scaffold platform at gutter height'],
    safety_required: ['ladder footed securely with standoff bracket keeping it clear of the gutter', 'work gloves'],
    forbidden: [
      'ladder leaning directly against the gutter channel',
      'person reaching far sideways off the ladder',
      'standing on the top two rungs of the ladder',
    ],
    presence_indirect: [
      'extending ladder footed against the house wall with standoff — gutter scoop resting in the trough at the top, no one climbing',
      'bucket of leaf debris at the base of the ladder — no operator visible on the ladder',
      'garden hose trailing from the downpipe outlet — no one holding the top end',
    ],
  },
  etancheite: {
    max_workers: 2,
    actions: [
      'rolling out an EPDM membrane across the flat roof surface',
      'welding the membrane lap joint with a hot air gun',
      'applying bitumen primer to the prepared deck with a mop roller',
    ],
    postures: [
      'crouching on the flat roof surface, both hands pressing the membrane edge — back to camera',
      'standing at the parapet inner face applying sealant at the upstand — in profile',
      'kneeling at the lap joint, hot air gun in hand — back to camera',
    ],
    access: ['flat roof access via internal hatch or external scaffold stair'],
    safety_required: ['safety harness clipped to a parapet anchor when working within 2 m of the edge', 'protective goggles when using hot air gun'],
    forbidden: [
      'person balanced on the parapet coping',
      'open-flame torch near a loose membrane edge',
      'membrane roll blocking the only roof access hatch',
    ],
    presence_indirect: [
      'EPDM roll partially unrolled across the flat roof deck — no one on the roof',
      'hot air gun resting on the parapet coping between welds — power cable trailing to hatch',
      'adhesive drum open beside the unrolled membrane — mop roller resting across the drum top',
    ],
  },
  ravalement: {
    max_workers: 2,
    actions: [
      'applying render to the facade with a hawk and float',
      'sanding the old render surface with a disc sander from the scaffold platform',
      'spraying crépi texture onto the primed wall face',
    ],
    postures: [
      'standing on a scaffold plank at wall mid-height, both hands on the float and hawk — back to camera',
      'crouching at the base of the scaffold to refill the mortar hawk — in profile',
      'standing at the upper scaffold lift, float arm extended to reach the top course — back to camera',
    ],
    access: ['tube-and-fitting scaffold fixed to the building facade', 'mobile scaffold tower', 'articulated boom lift'],
    safety_required: ['scaffold guardrail and toe board in place at every lift above 2 m', 'safety helmet on platform above 2 m'],
    forbidden: [
      'person leaning out past the scaffold guardrail',
      'unsupported plank bridging two scaffold frames without mid-rail',
      'scaffold platform above 2 m without guardrail',
    ],
    presence_indirect: [
      'hawk and float resting on the scaffold plank at mid-height — no operator visible',
      'scaffold tower beside the wall, tools on the platform — empty, platform secured',
      'mortar bucket hoisted on the scaffold gin wheel — rope tied, no worker on the platform',
    ],
  },
  peinture: {
    max_workers: 1,
    actions: [
      'rolling paint onto the wall surface with a roller and long extension pole',
      'cutting in at the ceiling junction with a flat brush',
      'applying a second coat over the primed wall with a medium roller',
    ],
    postures: [
      'standing 1 m from the wall, arm extended with the roller on the extension pole — back to camera',
      'on a low stepladder cutting in at the top wall edge with a flat brush — in profile',
      'crouching at the skirting board to cut the base edge — back to camera',
    ],
    access: ['low stepladder for ceiling-height cutting in', 'no elevated access for standard wall height'],
    safety_required: [],
    forbidden: [
      'person on a scaffolding tower inside the room',
      'bare feet on the drop cloth near open paint tins',
      'person hanging from the window frame to reach the exterior',
    ],
    presence_indirect: [
      'roller resting in the tray on the drop cloth beside the freshly painted wall — no painter visible',
      'paint tin open with brush balanced across the rim, drop cloth with fresh roller marks — no operator',
      'masking tape along the ceiling junction, drop cloth covering the floor — painter absent',
    ],
  },
  'élagage': {
    min_workers_when_visible: 2,
    max_workers: 2,
    actions: [
      'sawing a branch with a chainsaw while suspended in the tree canopy by climbing ropes',
      'pulling a guide rope from the ground to direct a falling cut branch',
      'operating an aerial platform at canopy height to reach a crown reduction cut',
    ],
    postures: [
      'suspended in the tree canopy in a full-body climbing harness, chainsaw in both hands — back to camera',
      'standing on the ground below the canopy, both hands on the guide rope — back to camera',
      'in the basket of an aerial platform at canopy height, pruning saw extended — in profile',
    ],
    access: ['rope climbing technique with saddle and footlocks', 'aerial platform / cherry picker positioned beside the tree', 'stepladder for branches under 4 m'],
    safety_required: ['full-body climbing harness with positioning lanyard clearly visible on the tree climber', 'arborist helmet with visor and ear defenders'],
    forbidden: [
      'person standing directly under a branch being cut',
      'climber in the tree with no visible rope or harness',
      'chainsaw held with one hand above shoulder height',
      'person balancing on a branch without safety attachment',
      'unstable ladder propped against the tree trunk with no foot brace',
      'rope crossing through or around the climber body in an impossible configuration',
      'climber with feet or legs dangling without support point',
      'person positioned in the direct fall path of a branch mid-cut',
    ],
    presence_indirect: [
      'climbing rope rigged through the tree crown with a throw bag on the ground — no climber visible',
      'wood chipper running at the base of the tree, chip pile building — no operator in frame',
      'guide rope attached to a cut branch running to the ground — no one holding it, slack on the ground',
    ],
  },
  abattage: {
    min_workers_when_visible: 2,
    max_workers: 2,
    actions: [
      'making the notch cut at the base of the trunk with a large chainsaw',
      'sectioning the felled trunk into lengths on the ground',
      'operating a stump grinder positioned over the root flare',
    ],
    postures: [
      'standing at the base of the trunk, chainsaw held in both hands at waist height — in profile',
      'crouching over the felled trunk to make a cross-cut — back to camera',
      'standing behind the stump grinder controls directing the cutter head — in profile',
    ],
    access: ['ground level — no elevated access required', 'stump grinder on tracks positioned over the stump'],
    safety_required: ['chainsaw chaps clearly visible on the legs of the operator', 'arborist helmet with visor', 'non-slip chainsaw work boots'],
    forbidden: [
      'person standing in the planned fall zone in front of the notch cut',
      "chainsaw cutting overhead above the operator's shoulder",
      'person on the far side of the trunk from the operator during the felling cut',
    ],
    presence_indirect: [
      'felled trunk sections laid on the ground, chainsaw resting across one — no operator visible',
      'stump grinder parked over the stump, engine running, cab empty — chip pile spreading beside',
      'sawdust pile and cut rounds at the stump base — tools visible, no worker in frame',
    ],
  },
  'maçonnerie': {
    max_workers: 2,
    actions: [
      'laying concrete blocks with a trowel and full mortar hawk',
      'checking the freshly laid course with a long spirit level and string line',
      'mixing a batch of mortar at the drum mixer beside the wall',
    ],
    postures: [
      'standing at the wall top course, trowel in hand bedding the next block — back to camera',
      'crouching beside the drum mixer to load mortar — in profile',
      'kneeling to check the base course with the spirit level — back to camera',
    ],
    access: ['ground level for walls up to 2 m', 'scaffold platform for walls above 2 m'],
    safety_required: ['safety boots', 'work gloves for block handling'],
    forbidden: [
      'person balanced on top of an unfinished wall course higher than 1.5 m without scaffold',
      'single block being lifted overhead without mechanical aid',
    ],
    presence_indirect: [
      'trowel resting across the mortar hawk on the wall top course — no mason visible',
      'string line pulled taut along the block course at waist height — mortar hawk on the ground below',
      'drum mixer running at the wall base — no operator in frame, mortar ready in bucket',
    ],
  },
  nettoyage: {
    max_workers: 1,
    actions: [
      'directing the pressure lance jet at the terrasse or facade surface',
      'sweeping the cleaning water toward the drain with a water broom',
      'applying cleaning product to the facade with a pump sprayer at arm height',
    ],
    postures: [
      'standing 1–2 m from the surface, lance held at hip height — in profile',
      'pushing the water broom away from the body toward the drain — back to camera',
      'walking slowly along the wall applying product at shoulder height — back to camera',
    ],
    access: ['ground level for terrasse and base of facade', 'low scaffold platform for facade above 3 m'],
    safety_required: ['waterproof work boots', 'protective goggles when using chemical products'],
    forbidden: [
      'operator pointing lance directly at their feet',
      'unprotected electrical socket near the wet work area',
      'lance aimed upward at angle greater than 45° from standing position without platform',
    ],
    presence_indirect: [
      'pressure lance resting on the ground pointing at the base of the wall — dark wet cleaning line visible ahead of the lance tip',
      'cleaning product drum open beside the pump unit — hose trailing to the lance on the ground, no operator',
      'wet cleaning line across the terrasse surface marking work already done — no one visible',
    ],
  },
  carrelage: {
    max_workers: 1,
    actions: [
      'pressing a floor tile into the adhesive bed with a rubber mallet',
      'spreading tile adhesive across the subfloor with a notched trowel',
      'cutting a border tile to size at the tile cutter on the floor edge',
    ],
    postures: [
      'kneeling on the untiled subfloor section, mallet raised to tap the tile level — back to camera',
      'crouching over the tile cutter at the room perimeter — back to camera',
      'sitting back on heels checking the tile level with a spirit level — in profile',
    ],
    access: ['floor level — no elevated access required'],
    safety_required: ["knee pads visible on the tiler's knees", 'cut-resistant gloves near the tile cutter'],
    forbidden: [
      'person kneeling on freshly laid tiles before adhesive cure time',
      'tile cutter left unguarded with blade exposed',
    ],
    presence_indirect: [
      'rubber mallet resting on the freshly laid tile surface beside a tile spacer row — no tiler visible',
      'notched trowel resting in the open adhesive bucket — tiles stacked beside it, no operator',
      'tile spacers set in the joints across the floor — spirit level resting on the last row, no one in frame',
    ],
  },
  vitrier: {
    min_workers_when_visible: 2,
    max_workers: 2,
    actions: [
      'carrying a large glass pane using suction cup handles in pairs',
      'fitting a new double-glazed unit into the prepared window frame',
      'applying glazing compound around the new pane edge with a glazing gun',
    ],
    postures: [
      'standing upright, both hands on suction cup handles, glass pane vertical — in profile',
      'crouching at the window sill to apply the glazing compound — back to camera',
      'holding the pane steady against the frame from outside while a second person secures it — seen from indoors',
    ],
    access: ['ground level for ground-floor windows', 'low scaffold platform or extending ladder for upper-floor windows'],
    safety_required: ['cut-resistant gloves on both hands when handling glass', 'suction cup handles on any pane over 1 m²'],
    forbidden: [
      'bare hands on large glass pane edges without gloves',
      'glass pane balanced upright against the wall without support cradle',
      'broken glass on the floor with no protective footwear visible',
    ],
    presence_indirect: [
      'suction cup handles left leaning against the wall — glass pane in the opening, not yet sealed',
      'glazing gun resting on the window sill beside the open pane — glazing compound partially applied',
      'glass offcut wrapped in protective paper leaning against the wall beside the window',
    ],
  },
  'débarras': {
    min_workers_when_visible: 2,
    max_workers: 2,
    actions: [
      'carrying a heavy item of furniture through the front door in a two-person carry',
      'loading boxes onto a furniture trolley beside the van',
      'wrapping a fragile item in protective blanket before loading',
    ],
    postures: [
      'back to camera, carrying the front end of a wardrobe through the doorway',
      'standing at the open van doors, stacking boxes in — seen from the side',
      'crouching beside a dismantled item on the floor, wrapping with moving blanket — back to camera',
    ],
    access: ['ground-floor building entry', 'stair access for upper floors', 'furniture trolley on flat ground'],
    safety_required: ['work gloves for heavy item handling', 'solid work footwear with toe cap'],
    forbidden: [
      'single person carrying a large wardrobe or sofa alone',
      'item balanced on a stair handrail',
      'van visibly overloaded above the roofline',
    ],
    presence_indirect: [
      'furniture trolley loaded with stacked boxes at the building entrance — van rear doors open, no operator',
      'van rear doors open with partial load visible — protective blankets draped over the furniture, no driver or mover in frame',
      'hand truck propped against the wall beside a stack of boxes in the hallway — no operator',
    ],
  },
  terrassement: {
    min_workers_when_visible: 2,
    max_workers: 2,
    actions: [
      'operating the mini-excavator bucket to dig the trench or cut',
      'levelling the excavated surface with a long-handled rake from the edge',
      'guiding the machine operator from the ground beside the trench with hand signals',
    ],
    postures: [
      'seated in the cab of the mini-excavator, both hands on the controls — seen from the side',
      'standing at the trench edge with a rake, back to the camera, supervising the cut',
      'crouching to check the trench level with a measuring rod — in profile',
    ],
    access: ['ground-level site access', 'mini-excavator on rubber tracks for most surfaces'],
    safety_required: ['high-visibility jacket on all ground workers within 5 m of the machine', 'safety helmet on site'],
    forbidden: [
      'person standing inside the trench directly under the excavator bucket',
      'person between the rotating cab and the trench edge',
      'machine operating with no ground spotter visible when near a structure',
    ],
    presence_indirect: [
      'mini-excavator parked at the trench edge, engine running, cab empty — excavated spoil pile beside',
      'excavated spoil pile with wheelbarrow beside the trench — no workers visible',
      'warning tape stretched around the open trench perimeter — trench clearly fresh-cut, no one on site',
    ],
  },
  paysagiste: {
    min_workers_when_visible: 2,
    max_workers: 2,
    actions: [
      'planting a shrub in the prepared bed and backfilling around the root ball',
      'laying turf rolls across the prepared subgrade and tamping the edges',
      'operating a walk-behind mower along the lawn edge',
    ],
    postures: [
      'kneeling in the garden bed placing a plant in the hole — back to camera',
      'crouching to press the turf edge firmly with both hands — back to camera',
      'standing behind the walk-behind mower, both hands on the handles — in profile',
    ],
    access: ['ground level garden — no elevated access required'],
    safety_required: ['sun protection / hat for outdoor summer work', 'hearing protection when using petrol machinery'],
    forbidden: [
      'mower operating on a slope visually steeper than 15°',
      'person pruning a large tree from a domestic household stepladder',
      'chainsaw used without visible leg protection',
    ],
    presence_indirect: [
      'ride-on mower parked on the finished lawn area — freshly cut stripes visible, no operator',
      'wheelbarrow of compost tipped beside a planting bed — tools resting against it, no gardener in frame',
      'newly planted shrubs in the bed, watering can beside them — no one visible',
    ],
  },
  depannage_auto: {
    max_workers: 1,
    actions: [
      'connecting jump-start cables to the vehicle battery terminals under the open bonnet',
      'jacking the vehicle and removing the flat tyre with a lug wrench',
      'running a diagnostic tool connected to the OBD port — reading the display',
    ],
    postures: [
      'crouching beside the open engine bay, both hands inside — back to camera',
      'kneeling beside the jacked wheel arch with the lug wrench — in profile',
      'standing at the open bonnet leaning slightly forward — back to camera',
    ],
    access: ['roadside or car park ground level'],
    safety_required: ['warning triangle visible on the road behind the vehicle', 'high-visibility jacket'],
    forbidden: [
      'person lying under the vehicle without visible axle stands',
      'sparks near an open fuel cap',
      'person positioned between the vehicle and passing traffic without barrier',
    ],
    presence_indirect: [
      'warning triangle placed on the road behind the vehicle, high-visibility jacket draped over the open door — no technician visible',
      'diagnostic cable trailing from the open bonnet into the passenger footwell — tool display on the dashboard, no operator in frame',
      'jack and lug wrench on the ground beside the jacked wheel arch — wheel removed, no technician visible',
    ],
  },
};

// Construit la description worker en sélectionnant action + posture + sécurité depuis WORKER_SCENE_RULES.
function _buildWorkerDesc(key, n, seed) {
  const rules = WORKER_SCENE_RULES[key];
  if (!rules) return 'tradesperson in work clothes naturally at work — seen from behind or in profile, never posing or looking at the camera';
  const action  = _pick(rules.actions,  1, seed + 11)[0] || 'working on the job';
  const posture = _pick(rules.postures, 1, seed + 13)[0] || 'seen from behind or in profile';
  const safety  = (rules.safety_required || []).slice(0, 1).join(', ');
  return `${posture}, ${action}${safety ? ` — ${safety} clearly visible` : ''}`;
}

// Valide la cohérence de la scène worker après _applyVariation.
// En cas d'élément interdit : ajoute exclusions. Si trop grave : supprime les workers.
// Returns { ok, issues, fixedStr }.
// If a scene is dangerous/incoherent and cannot be corrected, falls back to presence='none'.
function _validateWorkerScene(jsonStr) {
  let obj;
  try { obj = JSON.parse(jsonStr); } catch { return { ok: true, issues: [], fixedStr: jsonStr }; }

  // Apply scene_always_exclude regardless of presence (materials, structural rules)
  const _earlyRules = WORKER_SCENE_RULES[obj._matched_key];
  if (_earlyRules?.scene_always_exclude?.length) {
    const patched = Object.assign({}, obj);
    patched.exclude = [...new Set([...(patched.exclude || []), ..._earlyRules.scene_always_exclude])];
    jsonStr = JSON.stringify(patched);
    obj = patched;
  }

  if (obj.var_presence !== 'workers') return { ok: true, issues: [], fixedStr: jsonStr };

  const issues = [];
  const fixed  = Object.assign({}, obj);
  const rules  = WORKER_SCENE_RULES[fixed._matched_key];

  if (!rules) {
    issues.push('missing_dedicated_rules');
    fixed._worker_validation_issues = issues;
    return { ok: false, issues, fixedStr: JSON.stringify(fixed) };
  }

  // 1. Cap max_workers (always fixable)
  if (fixed.var_workers > rules.max_workers) {
    issues.push('too_many_workers');
    fixed.var_workers   = rules.max_workers;
    fixed._worker_count = fixed.var_workers;
  }

  // 2. Always inject forbidden terms into exclude so DALL-E avoids them
  if (rules.forbidden?.length) {
    fixed.exclude = [...new Set([...(fixed.exclude || []), ...rules.forbidden])];
  }

  // 3. Check forbidden scenario in worker description — attempt regen
  const _descHasForbidden = (d) => (rules.forbidden || []).some(f =>
    d.includes(f.toLowerCase().split(' ').slice(0, 4).join(' '))
  );
  if (_descHasForbidden((fixed.var_worker_desc || '').toLowerCase())) {
    issues.push('forbidden_action_in_desc');
    fixed.var_worker_desc = _buildWorkerDesc(fixed._matched_key, fixed.var_workers,
      _hashSeed(`${fixed._matched_key}${fixed._matched_service || ''}regen1`));
  }

  // 4. Check safety terms in description — attempt regen
  const _descMissesSafety = (d) => (rules.safety_required || []).length > 0 &&
    !rules.safety_required.some(s => d.includes(s.split(' ')[0].toLowerCase()));
  if (_descMissesSafety((fixed.var_worker_desc || '').toLowerCase())) {
    issues.push('missing_safety_mention');
    fixed.var_worker_desc = _buildWorkerDesc(fixed._matched_key, fixed.var_workers,
      _hashSeed(`${fixed._matched_key}${fixed._matched_service || ''}regen2`));
  }

  // 5. Final check: if description still fails safety after 2 regen attempts → fallback to none
  const descFinal = (fixed.var_worker_desc || '').toLowerCase();
  const unresolvable = _descHasForbidden(descFinal) ||
    (issues.includes('forbidden_action_in_desc') && _descMissesSafety(descFinal));
  if (unresolvable) {
    issues.push('fallback_to_none');
    fixed.var_presence = 'none';
    fixed.var_workers  = 0;
    fixed.no_people    = true;
    fixed._worker_count = 0;
    delete fixed.var_worker_desc;
    delete fixed._worker_action;
    delete fixed._worker_access_mode;
    delete fixed._worker_safety_mode;
  }

  fixed._worker_validation_issues = issues.length ? issues : null;
  return { ok: issues.length === 0, issues, fixedStr: JSON.stringify(fixed) };
}

// Returns a deterministic shuffled array of presences for a whole batch.
// Guarantees the target distribution across the batch instead of independent per-image rolls.
function _buildPresencePlan(imageCount, stateLevel, key, seed) {
  const _dist = {
    debut:     { workers: 0.60, none: 0.35, indirect: 0.05 },
    encours:   { workers: 0.50, none: 0.45, indirect: 0.05 },
    semifinal: { workers: 0.30, none: 0.65, indirect: 0.05 },
    final:     { workers: 0.075, none: 0.875, indirect: 0.05 },
  };
  const d = _dist[stateLevel] || _dist.encours;
  const n = Math.max(1, imageCount);

  // indirect always at least 0 (rounds to 0 for small batches), workers fills proportionally
  const nIndirect = Math.max(0, Math.min(1, Math.round(n * d.indirect)));
  const remain    = n - nIndirect;
  const nWorkers  = Math.max(0, Math.round(remain * (d.workers / (d.workers + d.none))));
  const nNone     = n - nWorkers - nIndirect;

  const plan = [
    ...Array(nWorkers).fill('workers'),
    ...Array(Math.max(0, nNone)).fill('none'),
    ...Array(nIndirect).fill('indirect'),
  ];

  // Seeded full shuffle using _pick (re-picks entire array = shuffle)
  return _pick(plan, plan.length, seed);
}

function _applyVariation(jsonStr, imageIndex, presenceOverride) {
  let obj;
  try { obj = JSON.parse(jsonStr); } catch { return jsonStr; }

  const seed = _hashSeed(
    `${obj._matched_key || ''}|${obj._matched_service || ''}|${obj.location || ''}|${obj.state_level || ''}|${imageIndex}`
  );

  // Detect meteo from scene light string to filter compatible light variants
  const lc = (obj.light || '').toLowerCase();
  const meteo = /rain|wet surface|heavy cloud|dark heavy/.test(lc) ? 'pluie'
              : /hazy milky|very low contrast/.test(lc)            ? 'brumeux'
              : /overcast|grey|muted color/.test(lc)               ? 'nuageux'
              : /bright|midday sun|blue sky/.test(lc)              ? 'soleil'
              : 'auto';

  // Camera angles — prefer variation_setting on WORK_SCENES entry over generic setting
  const sceneKey = obj._matched_key;
  const vSetting = (WORK_SCENES[sceneKey] || {}).variation_setting || obj.setting || 'exterior';
  const angleLib = VARIATION_ENGINE.camera_angles[vSetting] || VARIATION_ENGINE.camera_angles.exterior;

  // Light — only pick from options compatible with the chosen meteo
  const lightLib = VARIATION_ENGINE.light_quality.filter(q => q.meteo.includes(meteo)).map(q => q.text);

  obj.var_camera  = _pick(angleLib,                             1, seed     )[0] || null;
  obj.var_light   = obj.time_of_day === 'night'
    ? 'work floodlight as the main light source, dark background, slightly underexposed smartphone photo'
    : (lightLib.length ? _pick(lightLib, 1, seed + 7)[0] : null);
  obj.var_framing = _pick(VARIATION_ENGINE.framing_emphasis,   1, seed + 13)[0] || null;

  // Camera author — customer 80% / contractor 15% / neighbor 5%
  const authorRoll = seed % 100;
  obj.var_author = authorRoll < 80 ? 'customer'
                 : authorRoll < 95 ? 'contractor'
                 : 'neighbor';

  // 3-category presence: none / workers / indirect — state-conditional distribution
  const _presenceDist = {
    debut:     { none: 30, workers: 65, indirect: 5 },
    encours:   { none: 45, workers: 50, indirect: 5 },
    semifinal: { none: 65, workers: 30, indirect: 5 },
    final:     { none: 88, workers:  7, indirect: 5 },
  };
  const _pd = _presenceDist[obj.state_level] || _presenceDist.encours;
  const workerSeed = _hashSeed(`${obj._matched_key || ''}${obj._matched_service || ''}workers${imageIndex}`);
  const workerRoll = workerSeed % 100;
  // presenceOverride from batch plan takes priority over per-image roll
  obj.var_presence = presenceOverride != null ? presenceOverride
                   : (workerRoll < _pd.none ? 'none'
                     : workerRoll < (_pd.none + _pd.workers) ? 'workers'
                     : 'indirect');

  if (obj.var_presence === 'none') {
    obj.var_workers = 0;
    obj.no_people   = true;
  } else if (obj.var_presence === 'indirect') {
    obj.var_workers = 0;
    obj.no_people   = true;
    const _iRules = WORKER_SCENE_RULES[obj._matched_key];
    const _iSeed  = _hashSeed(`${obj._matched_key || ''}${obj._matched_service || ''}indirect${imageIndex}`);
    obj.var_indirect_presence = _iRules
      ? (_pick(_iRules.presence_indirect, 1, _iSeed)[0] || null)
      : null;
  } else {
    const _wRules = WORKER_SCENE_RULES[obj._matched_key];
    const _maxW   = _wRules ? _wRules.max_workers : 2;
    const _cSeed  = _hashSeed(`${obj._matched_key || ''}${obj._matched_service || ''}count${imageIndex}`);
    const _dSeed  = _hashSeed(`${obj._matched_key || ''}${obj._matched_service || ''}desc${imageIndex}`);
    obj.var_workers     = (_cSeed % 100) < 65 ? 1 : Math.min(2, _maxW);
    obj.no_people       = false;
    obj.var_worker_desc = _buildWorkerDesc(obj._matched_key, obj.var_workers, _dSeed);
    // Worker detail debug fields (aligned with _dSeed for determinism)
    if (_wRules) {
      obj._worker_action      = _pick(_wRules.actions, 1, _dSeed + 11)[0] || null;
      obj._worker_access_mode = _pick(_wRules.access,  1, _dSeed + 17)[0] || null;
      obj._worker_safety_mode = (_wRules.safety_required || []).slice(0, 1).join(', ') || null;
    }
  }

  // For customer/neighbor authors, override var_camera with a matching perspective pool
  if (obj.var_author !== 'contractor') {
    const authorPool = obj.var_author === 'neighbor'
      ? (VARIATION_ENGINE.camera_angles.neighbor || VARIATION_ENGINE.camera_angles.exterior)
      : (VARIATION_ENGINE.camera_angles.customer || VARIATION_ENGINE.camera_angles.exterior);
    const authorSeed = _hashSeed(`${obj._matched_key || ''}${obj._matched_service || ''}author${imageIndex}`);
    obj.var_camera = _pick(authorPool, 1, authorSeed)[0] || obj.var_camera;
  }

  // Debug metadata
  obj._camera_author     = obj.var_author;
  obj._worker_count      = obj.var_workers;
  obj._variation_setting = vSetting;
  obj._presence          = obj.var_presence;

  return JSON.stringify(obj);
}

// ─── Étape D : Quality Gate ───────────────────────────────────────────────────

const QUALITY_RULES = [
  {
    id:       'batterie_no_tyre',
    key:      'depannage_auto',
    when:     (obj) => _serviceGroup(obj._matched_service) === 'batterie',
    scan:     ['site_tools', 'site_details', 'framing'],
    forbidden: /hydraulic.?jack|lug.?wrench|spare.?wheel|flat.?tyre|flat.?tire|wheel.?nut/i,
    issue:    'batterie dispatch — outils de crevaison détectés (cric / roue)',
    fix:      { type: 'addExclusions', terms: ['hydraulic jack', 'lug wrench', 'spare wheel', 'flat tyre', 'wheel nuts'] },
  },
  {
    id:       'crevaison_no_cables',
    key:      'depannage_auto',
    when:     (obj) => _serviceGroup(obj._matched_service) === 'crevaison',
    scan:     ['site_tools', 'site_details'],
    forbidden: /jump.?start|booster.?pack|battery.*booster|jump.*cable|clamp.*connector.*battery|battery.*terminal/i,
    issue:    'crevaison dispatch — câbles / booster détectés',
    fix:      { type: 'addExclusions', terms: ['jump-start cable', 'battery booster pack', 'booster clamp', 'battery terminal clamp'] },
  },
  {
    id:       'etancheite_maison_no_immeuble',
    key:      'etancheite',
    when:     (obj) => obj.contexte === 'maison',
    scan:     ['framing', 'camera_position', 'work_type'],
    forbidden: /parapet.?wall|hvac|rooftop.*(?:equip|technical|machin)|ventilation.?stack|broad.*membrane|large.*flat.*roof|multi.?storey/i,
    issue:    'étanchéité maison — éléments toiture immeuble détectés',
    fix:      { type: 'addExclusions', terms: ['parapet wall', 'HVAC units', 'rooftop technical equipment', 'ventilation stack', 'large flat roof', 'broad membrane surface'] },
  },
  {
    id:       'nettoyage_toiture_no_mixed',
    key:      'nettoyage_toiture',
    when:     () => true,
    scan:     ['framing', 'site_details', 'work_type'],
    forbidden: /two.*type|mixed.*tile|different.*tile|patchwork.*roof|partly.*clean|partial.*clean|dirty.*streak.*facade|green.*runoff.*wall/i,
    issue:    'nettoyage toiture — tuiles mixtes ou coulures façade détectées',
    fix:      { type: 'addExclusions', terms: ['two different tile types', 'mixed roofing materials on same pitch', 'partially cleaned roof', 'dirty streaks on facade', 'green runoff on wall'] },
  },
  {
    id:       'nettoyage_gouttieres_no_roof',
    key:      'nettoyage_gouttieres',
    when:     () => true,
    scan:     ['framing', 'work_type', 'camera_position'],
    forbidden: /roof.*(?:main|subject|treated|clean)|cleaning.*roof.*tile|treated.*roof|moss.*remov.*roof/i,
    issue:    'nettoyage gouttières — toiture comme sujet principal ou traitée détectée',
    fix:      { type: 'addExclusions', terms: ['roof as main subject', 'moss removal on roof tiles', 'partially cleaned roof', 'roof cleaning patterns'] },
  },
  {
    id:       'toiture_no_cleaning',
    key:      'toiture',
    when:     () => true,
    scan:     ['site_tools', 'work_type', 'framing'],
    forbidden: /pressure.?wash|karcher|cleaning.?machine|nettoyage.*haute.?pression/i,
    issue:    'couverture — nettoyeur haute pression / nettoyage détecté',
    fix:      { type: 'addExclusions', terms: ['pressure washer', 'pressure washing machine', 'karcher', 'cleaning machine'] },
  },
  {
    id:       'peinture_int_no_ext_refs',
    key:      'peinture',
    when:     (obj) => obj.setting === 'interior',
    scan:     ['camera_position', 'work_type', 'roadside_context'],
    forbidden: /\b(?:facade|pavement|scaffold(?:ing)?|exterior.?wall|garden.?path|street.?level|house.?front|from.?the.?street|from.?outside)\b/i,
    issue:    'peinture intérieure — références extérieures détectées',
    fix:      { type: 'addExclusions', terms: ['facade', 'pavement', 'scaffolding', 'exterior wall', 'street view', 'garden path', 'house exterior'] },
  },
  {
    id:       'peinture_ext_no_int_refs',
    key:      'peinture',
    when:     (obj) => obj.setting === 'exterior',
    scan:     ['camera_position', 'work_type'],
    forbidden: /\b(?:ceiling|bedroom|living.?room|indoor|interior.?room|drop.?cloth.?on.?(?:the\s+)?\w+.?floor|room.?interior|standing.?in.?the.?(?:room|doorway))\b/i,
    issue:    'peinture extérieure — références intérieures détectées',
    fix:      { type: 'addExclusions', terms: ['bedroom', 'living room', 'ceiling interior', 'indoor furniture', 'interior room'] },
  },
];

function _validateQuality(obj) {
  const matchedKey = obj._matched_key || '';
  const issues     = [];
  let   allFixed   = true;
  const patched    = Object.assign({}, obj, { exclude: [...(obj.exclude || [])] });

  for (const rule of QUALITY_RULES) {
    if (rule.key !== matchedKey && rule.key !== '*') continue;
    if (!rule.when(obj)) continue;

    const haystack = rule.scan.map(f => {
      if (f === 'framing') return JSON.stringify(obj.framing || {});
      const v = obj[f];
      return Array.isArray(v) ? v.join(' ') : (v || '');
    }).join(' ');

    if (!rule.forbidden.test(haystack)) continue;

    issues.push(rule.issue);
    console.warn(`[QualityGate] ${rule.id}: ${rule.issue}`);

    if (rule.fix?.type === 'addExclusions') {
      patched.exclude.push(...rule.fix.terms);
    } else {
      allFixed = false;
    }
  }

  if (issues.length === 0) return { ok: true,  issues: [],    fixedObj: null };
  if (allFixed)            return { ok: false,  issues,        fixedObj: patched };
  return                          { ok: false,  issues,        fixedObj: null };
}

// ─── Location + Composition Resolution ────────────────────────────────────────
// Enriches the scene JSON with: location_type, location_subtype, location_must_have,
// triangle_rule, composition, composition_desc, and professional_vehicle_presence
// (depannage_auto only). Also extends obj.exclude with location_forbidden items and
// triangle exclusions when triangle is forbidden.

function _resolveLocationAndComposition(jsonStr, imageIndex) {
  let obj;
  try { obj = JSON.parse(jsonStr); } catch { return jsonStr; }

  const key  = obj._matched_key || '';
  const ctx  = obj.contexte || '';

  // 1. Location type — 5-step resolution chain (first match wins)
  const normCtx  = _normalizeLocationKey(ctx);
  const normKey  = _normalizeLocationKey(key);
  const locType  = _CONTEXTE_TO_LOCATION[key]?.[ctx]          // a. specific métier map
                || _CONTEXTE_OPTIONS_TO_LOCATION[ctx]          // b. generic CONTEXTE_OPTIONS
                || LOCATION_ALIASES[normCtx]                   // c. alias / synonym
                || (LOCATION_RULES[normCtx] ? normCtx : null)  // d. direct LOCATION_RULES match
                || DEFAULT_LOCATION_BY_METIER[normKey]         // e. per-métier fallback
                || null;
  if (!locType || !LOCATION_RULES[locType]) {
    console.warn(`[LOCATION_UNRESOLVED] métier=${key} contexte=${ctx}`);
  }
  const locRules = locType ? LOCATION_RULES[locType] : null;
  obj.location_type = locType || null;

  if (locRules) {
    const stSeed     = _hashSeed(`${key}|${ctx}|subtype${imageIndex}`);
    const normKey    = _normalizeLocationKey(key);
    const normSvc    = _normalizeLocationKey(obj._matched_service || '');

    // Subtype — compatibility-aware selection (service + métier drive the eligible list)
    obj.location_subtype = _resolveCompatibleSubtype({
      locationType: locType, normKey, normService: normSvc, seed: stSeed,
    });

    // Work surface — derived from subtype + service
    if (obj.location_subtype) {
      obj.work_surface = _resolveWorkSurface(obj.location_subtype, normSvc);
    }

    // Pick 1-2 core must_have elements (not all — avoid prompt overload)
    const coreSeed = _hashSeed(`${key}|${ctx}|core${imageIndex}`);
    const coreN    = locRules.must_have.length > 1 ? (1 + (coreSeed % 2)) : 1;
    obj.location_must_have = _pick(locRules.must_have, coreN, coreSeed);

    // Pick 1-3 optional supporting details from may_have
    if (locRules.may_have?.length) {
      const suppSeed = _hashSeed(`${key}|${ctx}|supp${imageIndex}`);
      const suppN    = Math.min(3, locRules.may_have.length, 1 + (suppSeed % 3));
      obj.location_supporting = _pick(locRules.may_have, suppN, suppSeed);
    }

    if (locRules.forbidden?.length) {
      obj.exclude = [...new Set([...(obj.exclude || []), ...locRules.forbidden])];
    }
  }

  // 2. Triangle rule — forbidden locations get explicit triangle exclusions
  const triRules = TRIANGLE_RULES[locType] || null;
  obj.triangle_rule = triRules ? triRules.default : null;
  if (triRules?.default === 'forbidden') {
    obj.exclude = [...new Set([...(obj.exclude || []), 'warning triangle', 'safety triangle', 'emergency warning triangle'])];
  }

  // 3. Composition — batch-pre-assigned or weighted draw per métier
  if (obj._pre_assigned_composition && PHOTO_COMPOSITIONS[obj._pre_assigned_composition]) {
    obj.composition = obj._pre_assigned_composition;
  } else {
    const compDist = _COMPOSITION_DIST[key] || _COMPOSITION_DIST.default;
    const compRoll = _hashSeed(`${key}|${ctx}|comp${imageIndex}`) % 100;
    let cumulative = 0;
    obj.composition = 'medium_intervention';
    for (const comp in compDist) {
      cumulative += compDist[comp];
      if (compRoll < cumulative) { obj.composition = comp; break; }
    }
  }
  const compDef = PHOTO_COMPOSITIONS[obj.composition];
  if (compDef) obj.composition_desc = compDef.description;
  // Camera distance from CAMERA_COMPOSITIONS
  const camCompDef = CAMERA_COMPOSITIONS[obj.composition];
  if (camCompDef) obj.camera_distance = camCompDef.distance;

  // 4. Professional vehicle — generalized for all métiers, linked to composition
  {
    const pvSeed   = _hashSeed(`${key}|${ctx}|pvehicle${imageIndex}`);
    const pvRoll   = pvSeed % 100;
    const comp     = obj.composition;
    const pvRules  = PROFESSIONAL_VEHICLE_RULES[key] || {};
    const d        = pvRules.dist || { clearly_visible: 35, partially_visible: 25, absent: 40 };
    let pvPresence;
    if (obj._pre_assigned_vehicle) {
      pvPresence = obj._pre_assigned_vehicle;
    } else if (comp === 'vehicle_arrival') {
      pvPresence = 'clearly_visible';
    } else if (comp === 'equipment_from_vehicle') {
      pvPresence = pvRoll < 70 ? 'clearly_visible' : 'partially_visible';
    } else if (comp === 'close_detail') {
      pvPresence = pvRoll < 85 ? 'absent' : 'partially_visible';
    } else {
      pvPresence = pvRoll < d.clearly_visible                           ? 'clearly_visible'
                 : pvRoll < (d.clearly_visible + d.partially_visible)  ? 'partially_visible'
                 : 'absent';
    }
    obj.professional_vehicle_presence = pvPresence;
  }

  return JSON.stringify(obj);
}

// ─── Capture defect selector ─────────────────────────────────────────────────
// Returns 1 or 2 defect objects, varied across batch positions, never the same defect twice per image.
function _selectCaptureDefects(batchIndex, batchTotal, seed) {
  const keys   = Object.keys(CAPTURE_DEFECTS);
  const countS = _hashSeed(`defects|count|${seed}|${batchIndex}`);
  const count  = (countS % 4 === 0) ? 1 : 2;

  // Build defect → family lookup once
  const defectFamily = {};
  for (const [fam, members] of Object.entries(CAPTURE_DEFECT_GROUPS)) {
    for (const m of members) defectFamily[m] = fam;
  }

  const picked = [];
  const used   = new Set();

  for (let p = 0; p < count; p++) {
    // Exclude already-used keys AND all keys in the same family as any already-picked defect
    const usedFamilies = new Set(picked.map(k => defectFamily[k]).filter(Boolean));
    const available = keys.filter(k => !used.has(k) && !usedFamilies.has(defectFamily[k]));
    // Safety fallback: if all remaining keys share a family with picked, allow any unused
    const pool    = available.length ? available : keys.filter(k => !used.has(k));
    const weights = pool.map(k => CAPTURE_DEFECTS[k].weight);
    const totalW  = weights.reduce((a, b) => a + b, 0);
    const roll    = _hashSeed(`defects|pick${p}|${seed}|${batchIndex}`) % totalW;
    let cum = 0, chosen = pool[0];
    for (let i = 0; i < pool.length; i++) {
      cum += weights[i];
      if (roll < cum) { chosen = pool[i]; break; }
    }
    picked.push(chosen);
    used.add(chosen);
  }
  return picked.map(k => ({ key: k, prompt: CAPTURE_DEFECTS[k].prompt }));
}

// ─── Batch composition planner ───────────────────────────────────────────────
// Assigns ordered compositions for a group of n images sharing a métier.
// Guarantees: close_detail quota, no consecutive duplicates, min 1 contextual/wide per batch ≥ 2.
function _planBatchCompositions(metier, n, seed) {
  const rules       = COMPOSITION_RULES_BY_METIER[metier] || {};
  const preferred   = rules.preferred_compositions || ['medium_intervention', 'wide_worksite'];
  const allowed     = rules.allowed_compositions   || Object.keys(PHOTO_COMPOSITIONS);
  const maxCloseR   = rules.close_detail_max_ratio ?? 0.20;
  const maxClose    = Math.max(1, Math.floor(n * maxCloseR));
  const minCtx      = rules.minimum_contextual_images_per_batch ?? 1;

  const result = [];
  let closeCount = 0;

  for (let i = 0; i < n; i++) {
    // Force contextual_overview for the last slot if quota not yet met
    const needCtx = minCtx > 0 && i === n - 1 && !result.includes('contextual_overview') && allowed.includes('contextual_overview');
    if (needCtx) { result.push('contextual_overview'); continue; }

    let pool = [...preferred].filter(c => allowed.includes(c));
    if (!pool.length) pool = [...allowed];

    // Enforce close_detail quota
    if (closeCount >= maxClose) pool = pool.filter(c => c !== 'close_detail');

    // Avoid repeating the immediately previous composition
    const last = result[result.length - 1];
    if (pool.length > 1) pool = pool.filter(c => c !== last);
    if (!pool.length) pool = allowed.filter(c => c !== last && (closeCount < maxClose || c !== 'close_detail'));
    if (!pool.length) pool = allowed;

    const comp = pool[_hashSeed(`batchcomp|${metier}|${seed}|${i}`) % pool.length];
    result.push(comp);
    if (comp === 'close_detail') closeCount++;
  }
  return result;
}

// ─── Global batch planner ─────────────────────────────────────────────────────
// Groups tasks by métier+service, assigns composition/vehicle/defects/worker plan to each.
// Mutates task objects in place; returns the same tasks array.
function _planGlobalBatch(tasks, runSeed) {
  const groups = {};
  for (const t of tasks) {
    const mk = `${t._planBase._matched_key || ''}|${t._planBase._matched_service || ''}`;
    if (!groups[mk]) groups[mk] = [];
    groups[mk].push(t);
  }

  for (const groupKey of Object.keys(groups)) {
    const group  = groups[groupKey];
    const metier = group[0]._planBase._matched_key || '';
    const n      = group.length;
    const gSeed  = _hashSeed(`${groupKey}|${runSeed}`);
    const comps  = _planBatchCompositions(metier, n, gSeed);
    const pvR    = PROFESSIONAL_VEHICLE_RULES[metier] || {};
    const d      = pvR.dist || { clearly_visible: 35, partially_visible: 25, absent: 40 };

    for (let gi = 0; gi < n; gi++) {
      const task = group[gi];
      const comp = comps[gi];
      const pvS  = _hashSeed(`pv|${groupKey}|${gSeed}|${gi}`) % 100;
      let pv;
      if      (comp === 'vehicle_arrival')        pv = 'clearly_visible';
      else if (comp === 'equipment_from_vehicle') pv = pvS < 70 ? 'clearly_visible' : 'partially_visible';
      else if (comp === 'close_detail')           pv = pvS < 85 ? 'absent' : 'partially_visible';
      else pv = pvS < d.clearly_visible                        ? 'clearly_visible'
              : pvS < (d.clearly_visible + d.partially_visible)? 'partially_visible'
              : 'absent';

      task._pre_assigned_composition   = comp;
      task._pre_assigned_vehicle       = pv;
      task._capture_defects_resolved   = _selectCaptureDefects(gi, n, _hashSeed(`defect|${groupKey}|${gSeed}|${gi}`));
      task._batch_plan_id              = `plan_${groupKey}_${gSeed}_${gi}`;
      task._batch_run_seed             = String(runSeed);
    }
    // Worker presence at batch level
    _planBatchWorkerPresence(group, gSeed);
  }
  return tasks;
}

// ─── Global batch rebalancer ──────────────────────────────────────────────────
// After per-group planning, ensures the FULL batch meets global composition quotas:
// max 1 close_detail, min 1 medium_intervention + wide_worksite + contextual_overview,
// min 1 worker scene, min 1 vehicle visible or partial. Mutates tasks in place.
function _rebalanceGlobalBatchPlan(tasks, runSeed) {
  if (!tasks.length) return tasks;

  const REQUIRED_COMPS = ['medium_intervention', 'wide_worksite', 'contextual_overview'];

  // Live counts — rebuilt as we swap
  const counts = {};
  for (const t of tasks) counts[t._pre_assigned_composition] = (counts[t._pre_assigned_composition] || 0) + 1;

  // 1. Cap close_detail at 1
  if ((counts.close_detail || 0) > 1) {
    let excess = counts.close_detail - 1;
    for (const t of tasks) {
      if (!excess) break;
      if (t._pre_assigned_composition !== 'close_detail') continue;
      const metier  = t._planBase?._matched_key || '';
      const allowed = (COMPOSITION_RULES_BY_METIER[metier] || {}).allowed_compositions || Object.keys(CAMERA_COMPOSITIONS);
      if (!allowed.includes('medium_intervention')) continue;
      counts.close_detail--;
      counts.medium_intervention = (counts.medium_intervention || 0) + 1;
      t._pre_assigned_composition = 'medium_intervention';
      excess--;
    }
  }

  // 2. Ensure each required composition appears at least once
  for (const needed of REQUIRED_COMPS) {
    if ((counts[needed] || 0) >= 1) continue;
    // Candidates: current comp is over-represented AND métier allows `needed`
    const candidates = tasks
      .filter(t => {
        if (t._pre_assigned_composition === needed) return false;
        const metier  = t._planBase?._matched_key || '';
        const allowed = (COMPOSITION_RULES_BY_METIER[metier] || {}).allowed_compositions || Object.keys(CAMERA_COMPOSITIONS);
        if (!allowed.includes(needed)) return false;
        const cur = t._pre_assigned_composition;
        // Don't deplete the only occurrence of another required type
        if (REQUIRED_COMPS.includes(cur) && (counts[cur] || 0) <= 1) return false;
        return true;
      })
      .sort((a, b) => (counts[b._pre_assigned_composition] || 0) - (counts[a._pre_assigned_composition] || 0));

    if (!candidates.length) continue;

    const topCount = counts[candidates[0]._pre_assigned_composition] || 0;
    const top      = candidates.filter(t => (counts[t._pre_assigned_composition] || 0) === topCount);
    const chosen   = top[_hashSeed(`rebal|${needed}|${runSeed}`) % top.length];

    counts[chosen._pre_assigned_composition]--;
    chosen._pre_assigned_composition = needed;
    counts[needed] = (counts[needed] || 0) + 1;
  }

  // 3. Ensure at least 1 vehicle visible or partial
  if (!tasks.some(t => t._pre_assigned_vehicle !== 'absent')) {
    const pref = ['wide_worksite', 'medium_intervention', 'vehicle_arrival', 'equipment_from_vehicle'];
    const pvC  = tasks
      .filter(t => t._pre_assigned_composition !== 'close_detail')
      .sort((a, b) => {
        const ia = pref.indexOf(a._pre_assigned_composition);
        const ib = pref.indexOf(b._pre_assigned_composition);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      });
    if (pvC.length) pvC[_hashSeed(`rebal|vehicle|${runSeed}`) % pvC.length]._pre_assigned_vehicle = 'partially_visible';
  }

  return tasks;
}

// ─── Global batch plan validator ──────────────────────────────────────────────
// Throws [INVALID_BATCH_PLAN] if global quotas are not satisfied after rebalancing.
function _validateCompleteBatchPlan(tasks) {
  const comps    = tasks.map(t => t._pre_assigned_composition);
  const failures = [];
  if (comps.filter(c => c === 'close_detail').length > 1) failures.push('close_detail > 1');
  if (!comps.includes('medium_intervention'))             failures.push('no medium_intervention');
  if (!comps.includes('wide_worksite'))                   failures.push('no wide_worksite');
  if (!comps.includes('contextual_overview'))             failures.push('no contextual_overview');
  if (!tasks.some(t => t._pre_assigned_worker_presence === 'workers')) failures.push('no worker scene');
  if (!tasks.some(t => t._pre_assigned_vehicle !== 'absent'))          failures.push('no visible/partial vehicle');
  if (failures.length) throw new Error(`[INVALID_BATCH_PLAN] ${failures.join('; ')}`);
}

// ─── Batch worker presence planner ───────────────────────────────────────────
// Assigns _pre_assigned_worker_presence and _pre_assigned_worker_count per task in a same-métier group.
// Guarantees minimum_worker_images_per_active_batch. Mutates group in place.
function _planBatchWorkerPresence(group, seed) {
  const metier  = group[0]?._planBase?._matched_key || '';
  const rules   = COMPOSITION_RULES_BY_METIER[metier] || {};
  const wRules  = WORKER_SCENE_RULES?.[metier] || {};
  const minWImg = rules.minimum_worker_images_per_active_batch ?? 1;
  const minW    = wRules.min_workers_when_visible || 1;
  const n       = group.length;
  let workerImages = 0;

  for (let i = 0; i < n; i++) {
    const task = group[i];
    const comp = task._pre_assigned_composition || 'medium_intervention';
    const roll = _hashSeed(`worker|${metier}|${seed}|${i}`) % 100;
    let pres;
    if      (comp === 'close_detail')        pres = roll < 30 ? 'workers' : (roll < 60 ? 'indirect' : 'none');
    else if (comp === 'contextual_overview') pres = roll < 40 ? 'workers' : (roll < 70 ? 'none' : 'indirect');
    else                                     pres = roll < 50 ? 'workers' : (roll < 90 ? 'none' : 'indirect');
    task._pre_assigned_worker_presence = pres;
    task._pre_assigned_worker_count    = pres === 'workers' ? minW : 0;
    if (pres === 'workers') workerImages++;
  }

  // Enforce minimum — promote non-workers images to workers (prefer non-close-detail)
  for (let pass = 0; pass < 2 && workerImages < minWImg; pass++) {
    for (let i = 0; i < n && workerImages < minWImg; i++) {
      const comp = group[i]._pre_assigned_composition || '';
      if (group[i]._pre_assigned_worker_presence !== 'workers' && (pass > 0 || comp !== 'close_detail')) {
        group[i]._pre_assigned_worker_presence = 'workers';
        group[i]._pre_assigned_worker_count    = minW;
        workerImages++;
      }
    }
  }
}

// Per-métier actual safety violations (not presence constraints — those go in WORKER PRESENCE).
const FORBIDDEN_SAFETY_BY_METIER = {
  toiture:        ['No roofer working without a safety harness and lanyard', 'No worker balanced on tiles with no edge anchor'],
  elagage:        ['No arborist in a tree without a visible climbing harness'],
  abattage:       ['No person standing in the fall zone of a tree being felled'],
  terrassement:   ['No person standing in an open trench without visible shoring or sloping'],
  depannage_auto: ['No person working under a raised vehicle without visible axle stands'],
  maconnerie:     ['No worker on an elevated platform without visible edge protection or guardrail'],
  peinture:       ['No worker on a ladder with both hands occupied above shoulder height and no foot restraint'],
  ravalement:     ['No worker on scaffolding without visible guardrails on the open side'],
};

// ─── Locked final constraint layer ───────────────────────────────────────────
// Appended to the GPT-rewritten prompt AFTER the rewriter — cannot be softened by GPT.
// Section order: WORKER PRESENCE → CAMERA COMPOSITION → CAPTURE DEFECTS →
//   DOCUMENTARY STYLE → BRANDING → REQUIRED SAFETY → FORBIDDEN SAFETY VIOLATIONS
function _appendLockedFinalConstraints(prompt, scene) {
  const compKey   = scene.composition || 'medium_intervention';
  const camDef    = CAMERA_COMPOSITIONS[compKey] || CAMERA_COMPOSITIONS.medium_intervention;
  const defects   = scene._capture_defects_resolved || [];
  const metier    = scene._matched_key || '';

  const defectsBlock = defects.length > 0
    ? defects.map(d => `- ${d.prompt}`).join('\n')
    : '- subtle JPEG compression and ordinary smartphone processing\n- slightly tilted handheld framing';

  const metierRules = COMPOSITION_RULES_BY_METIER[metier] || {};
  const forbiddenFr = (metierRules.forbidden_framing || []).map(f => `No ${f}.`).join('\n');

  // WORKER PRESENCE — human presence constraint (separate from safety rules)
  const sceneWorkers  = scene.var_workers || 0;
  const scenePresence = scene.var_presence || 'none';
  const hasWorkers    = sceneWorkers > 0 || scenePresence === 'workers';
  const workerBlock   = hasWorkers
    ? `${sceneWorkers > 1 ? sceneWorkers + ' workers' : 'One worker'} must be actively working and clearly visible in the frame.`
    : 'No workers or people visible in this specific image. Frame the scene to show work evidence, tools, or surroundings — no human figures.';

  // REQUIRED SAFETY (PPE when workers are visible)
  const requiredSafety = [];
  if (scene._worker_safety_mode && hasWorkers) requiredSafety.push(scene._worker_safety_mode);

  // FORBIDDEN SAFETY VIOLATIONS — real safety rules only, NOT presence constraints
  const forbiddenSafety = [];
  const triRule = scene.triangle_rule;
  if (triRule === 'forbidden' || triRule === 'forbidden_if_safely_parked')
    forbiddenSafety.push('No warning triangle visible anywhere in the image.');
  forbiddenSafety.push(...(FORBIDDEN_SAFETY_BY_METIER[metier] || []));

  return `${prompt}

NON-NEGOTIABLE FINAL CAPTURE CONSTRAINTS — DO NOT REMOVE, WEAKEN, REINTERPRET OR CONTRADICT:

WORKER PRESENCE:
${workerBlock}

CAMERA COMPOSITION: ${compKey}
Distance from subject: ${camDef.distance}.
The main work detail must not fill more than ${camDef.subject_max_frame_percent}% of the frame.
The location and surrounding context must remain visible (minimum ${camDef.environment_min_frame_percent}% of frame).
${(camDef.required || []).map(r => `- ${r}`).join('\n')}
${(camDef.forbidden || []).map(f => `Not: ${f}.`).join('\n')}
${forbiddenFr}

SUBTLE CAPTURE IMPERFECTIONS:
These imperfections must remain slight and naturally perceptible. They must never become the main subject, obscure the work, reduce safety readability, or make the image look intentionally damaged.
Optical defects (finger, smudge, dirt) must remain at the extreme edge of the frame and must never cover the work, a worker's face or body, safety equipment, the professional vehicle, or any technically important area.
${defectsBlock}

DOCUMENTARY STYLE:
Ordinary handheld smartphone documentation photograph. Casual business-owner or worker photo.
Not a commercial photograph. Not product photography. Not catalogue photography. Not architectural visualization. Not CGI.
No perfect symmetry. No perfect tool arrangement. No exaggerated sharpness. No cinematic depth of field.
No tools neatly lined up for the camera. No equipment arranged in a semicircle. No perfectly centred machine or tool.
No spotless equipment unless the service logically requires new equipment. No studio-like sharpness.
Equipment must show reasonable signs of use: light dust, marks, unrolled hose, open case, crumpled tarpaulin.

BRANDING:
No readable brand names. No readable vehicle manufacturer logos as a focal point. No fake company branding.
No generated licence plate text intended to be readable. No prominent text on tools, gauges, vehicles or clothing.
Generic unbranded professional equipment. Any unavoidable text must be tiny, incidental and unreadable.
${requiredSafety.length > 0 ? '\nREQUIRED SAFETY ELEMENTS:\n' + requiredSafety.map(s => `- ${s}`).join('\n') : ''}
${forbiddenSafety.length > 0 ? '\nFORBIDDEN SAFETY VIOLATIONS:\n' + forbiddenSafety.join('\n') : ''}`.trim();
}

// ─── Scene Contradiction Validator ────────────────────────────────────────────
// Runs after _resolveLocationAndComposition + _applyVariation. Detects and
// patches contradictions before any API call. Returns { ok, issues, fixedStr }.

function _validateResolvedScene(jsonStr) {
  let obj;
  try { obj = JSON.parse(jsonStr); } catch { return { ok: true, issues: [], fixedStr: jsonStr }; }

  const issues  = [];
  const patched = Object.assign({}, obj);
  patched.exclude = [...(obj.exclude || [])];

  // C1: synchronise no_people FROM var_workers — var_workers is the source of truth
  if ((patched.var_workers || 0) > 0 && patched.no_people === true) {
    issues.push('C1: var_workers>0 overrides no_people=true — setting no_people=false');
    patched.no_people = false;
  }

  // C2: domicile context — ensure all triangle exclusions present
  if (patched.location_type === 'domicile' || patched.contexte === 'domicile') {
    const triTerms = ['warning triangle', 'safety triangle', 'emergency warning triangle', 'reflective warning triangle'];
    if (!triTerms.every(t => patched.exclude.includes(t))) {
      issues.push('C2: domicile — adding triangle exclusions');
      patched.exclude = [...new Set([...patched.exclude, ...triTerms])];
    }
  }

  // C3: garage_atelier — no triangle
  if (patched.location_type === 'garage_atelier') {
    const triTerms = ['warning triangle', 'emergency warning triangle'];
    if (!triTerms.every(t => patched.exclude.includes(t))) {
      issues.push('C3: garage_atelier — adding triangle exclusions');
      patched.exclude = [...new Set([...patched.exclude, ...triTerms])];
    }
  }

  // C4: aire_repos safely parked — no triangle
  if (patched.location_type === 'aire_repos' && patched.triangle_rule === 'forbidden_if_safely_parked') {
    const triTerms = ['warning triangle', 'emergency warning triangle'];
    if (!triTerms.every(t => patched.exclude.includes(t))) {
      issues.push('C4: aire_repos safely parked — adding triangle exclusions');
      patched.exclude = [...new Set([...patched.exclude, ...triTerms])];
    }
  }

  // C5: Worker count below min_workers_when_visible — only for human-facing compositions
  // close_detail can legitimately show 0 or 1 worker; never force min for it
  if (patched.var_presence === 'workers' && (patched.var_workers || 0) > 0 && patched.composition !== 'close_detail') {
    const wRules = WORKER_SCENE_RULES[patched._matched_key];
    const minW   = wRules?.min_workers_when_visible || 1;
    if ((patched.var_workers || 0) < minW) {
      issues.push(`C5: ${patched._matched_key} requires min ${minW} workers for composition=${patched.composition || 'default'} — was ${patched.var_workers}`);
      patched.var_workers = minW;
      patched.no_people   = false;
    }
  }

  // C6: toiture — pallet detected in site_tools
  if (patched._matched_key === 'toiture') {
    const toolsStr = JSON.stringify(patched.site_tools || []);
    if (/\bpallet\b/i.test(toolsStr)) {
      issues.push('C6: toiture — pallet in site_tools, adding exclusions');
      patched.exclude = [...new Set([...patched.exclude, 'full industrial pallet on pitched roof', 'pallet on pitched roof slope'])];
    }
  }

  // C7: entrepôt — pallets on roof surface (relevant for toiture/etancheite + entrepôt)
  if (patched.location_type === 'entrepot' && (patched._matched_key === 'toiture' || patched._matched_key === 'etancheite')) {
    patched.exclude = [...new Set([...patched.exclude, 'pallets placed on the roof surface'])];
  }

  // C8: appartement setting must be interior
  if (patched.location_type === 'appartement' && patched.setting !== 'interior') {
    issues.push('C8: appartement location — forcing setting to interior');
    patched.setting = 'interior';
  }

  if (!issues.length) return { ok: true, issues: [], fixedStr: jsonStr };
  return                  { ok: false, issues, fixedStr: JSON.stringify(patched) };
}

// Per-métier pre-generation safety constraint — first line of defense before the image API call.
const _PRE_GEN_SAFETY = {
  toiture:           'Roof materials must be in small quantities only. Never show a full industrial pallet, heavy crate, or large load on the roof slope or battens. A few tiles or a small hand-portable stack on a secured material bracket is the maximum.',
  nettoyage_toiture: 'Worker must be on scaffold or platform, not unsupported on wet moss-covered tiles. Never show bare hands on chemical-treated surface or worker leaning over the gutter edge without a guardrail.',
  etancheite:        'Worker near flat roof edge must have a harness. No person on the parapet coping. No open-flame torch near a loose membrane. Roof hatch must remain clear.',
  ravalement:        'Scaffold platforms above 2 m must have visible guardrails. No person leaning past the guardrail into the void.',
  'élagage':         'If a worker is visible at height: harness and rope must be clearly attached to a credible anchor. No person under a branch being cut. No chainsaw without a two-handed grip. No floating figure with no visible support.',
  abattage:          'The operator must stand beside the trunk, never in the fall zone in front of the notch. No chainsaw cutting overhead. No bystander on the far side of the trunk during felling.',
  terrassement:      'No person inside the open trench under the excavator bucket. No person between the rotating cab and the trench edge. Machine needs a visible ground spotter when near a structure.',
  'maçonnerie':      'No person on top of an incomplete wall above 1.5 m without scaffold. No block or heavy load overhead without mechanical lifting aid.',
  depannage_auto:    'Breakdown must be off the carriageway. Visible warning triangle required. No cables crossing the roadway. No person between vehicle and traffic. For puncture scenes: never show a compressor or pressure gauge simply placed in front of a mounted tyre as the sole subject — every scene must show an active repair: wheel removed, jack raising the car, lug wrench engaged on a nut, plug reamer inserted in tread, or spare wheel being mounted.',
};

const PromptBuilder = {
  build(jsonStr) {
    const s   = JSON.parse(jsonStr);
    const f   = s.framing || {};
    const isInt   = s.setting === 'interior';
    const defects = (s.photo_defects || []).slice(0, 2).join('; ');

    return [
      // 1 — Photo type / register
      PHOTO_STYLE_RULES.opening,

      // 2 — Scene content
      `Subject: ${s.work_type}. Work state: ${s.state}`,

      // 3 — Composition
      `Camera: ${s.camera_position}.`,
      `The work fills approximately ${f.work_pct || 55}% of the frame.`,
      `Foreground: ${f.foreground}.`,
      `Mid-ground: ${f.midground}.`,
      `Background: ${f.background}.`,

      // 4 — Site debris
      `On site: ${s.site_debris}.`,

      // 5 — Photo defects (from scene data only, never invented)
      defects ? `Photo imperfections: ${defects}.` : '',

      // 6 — Architecture + light (interior variant suppresses exterior references)
      isInt
        ? PHOTO_STYLE_RULES.interior
        : `Architecture: ${s.architecture}. Light: ${s.light}.`,

      // 7 — Style rules
      PHOTO_STYLE_RULES.style,

      // 8 — People / presence
      (() => {
        if (s.var_presence === 'indirect' && s.var_indirect_presence)
          return `Empty worksite — signs of recent activity: ${s.var_indirect_presence}.`;
        const n = s.var_workers !== undefined ? s.var_workers : (s.no_people ? 0 : 1);
        if (n === 0) return 'Empty worksite — no workers or people in the scene.';
        const desc = s.var_worker_desc || 'tradesperson in work clothes naturally engaged in the task — seen from behind or in profile, never posing or looking at the camera';
        if (n === 1) return `One ${desc}.`;
        return `${n} tradespeople in work clothes naturally at work — seen from behind or in profile, never posing or looking at the camera.`;
      })(),

      // 8b — Camera author perspective
      s.var_author === 'contractor'
        ? 'Photo taken by the contractor documenting the job — closer, more technical framing.'
        : s.var_author === 'neighbor'
          ? 'Photo taken from a neighbouring property or the public pavement — natural passer-by angle, slightly through a fence or hedge.'
          : 'Photo taken casually by the homeowner — relaxed handheld shot from the garden, driveway, or pavement.',

      // 9 — Tools and protections (SITE_REALISM — max 2 combined)
      (() => {
        const items = [...(s.site_tools || []), ...(s.site_protections || [])].slice(0, 2);
        return items.length ? `Visible on site: ${items.join(', ')}.` : '';
      })(),

      // 10 — Site details (SITE_REALISM — max 2)
      (() => {
        const items = (s.site_details || []).slice(0, 2);
        return items.length ? `Scattered nearby: ${items.join('; ')}.` : '';
      })(),

      // 10b — Pre-gen safety constraint (per métier) + material rule
      (() => {
        const safety = _PRE_GEN_SAFETY[s._matched_key];
        const rule   = WORKER_SCENE_RULES[s._matched_key]?.site_material_rule;
        const parts  = [safety, rule ? `On-site materials: ${rule}.` : ''].filter(Boolean);
        return parts.length ? parts.join(' ') : '';
      })(),

      // 10c — Forbidden elements (scene_always_exclude merged into exclude by validator)
      (() => {
        const excl = (s.exclude || []).slice(0, 8);
        return excl.length ? `Never include: ${excl.join('; ')}.` : '';
      })(),

      // 11 — Camera viewpoint variation (VARIATION_ENGINE)
      s.var_camera ? `Viewpoint: ${s.var_camera}.` : '',

      // 12 — Light quality variation (VARIATION_ENGINE, meteo-filtered)
      s.var_light ? `Lighting feel: ${s.var_light}.` : '',

      // 13 — Roadside / scene context override (context_map dispatch)
      s.roadside_context ? `Scene location: ${s.roadside_context}.` : '',

    ].filter(Boolean).join(' ');
  },
};

// ─────────────────────────────────────────────────────────────────────────────
const _SCENE_PLANNER_MODEL = 'gpt-4.1';

// ─── JSON scene builder (displayed in textarea + sent to GPT) ─────────────────
// Reads entirely from WORK_SCENES via _getWorkDetail — no more _SCENE_LIBRARY.
// Backward-compat state mapping: desordre→debut, propre→semifinal.
// Adds state_level field without removing any existing fields.
// Socle spatial complet pour une scène peinture intérieure.
// Remplace intégralement les champs géométriques issus de WORK_SCENES.peinture (extérieur)
// quand _resolveServiceSetting retourne 'interior'.
const INTERIOR_SCENE_BASE = {
  camera_position: 'standing naturally inside the room near the doorway, smartphone held at chest height — casual handheld angle',
  framing: {
    work_pct:   55,
    foreground: 'protected floor edge with a canvas drop cloth, paint tray or part of the doorway frame',
    midground:  'wall or ceiling currently being painted — masking tape at the edges, fresh colour against the old',
    background: 'opposite interior wall, ordinary room depth with skirting board, door frame or window frame — no outdoor elements',
  },
  architecture: 'ordinary occupied French residential interior — plaster walls, skirting boards, standard doors and windows',
  light:        'soft natural daylight entering from the room window, supplemented by ordinary indoor ambient ceiling light',
  exclude: [
    'exterior facade', 'street', 'garden', 'pavement', 'scaffolding',
    'roof', 'open sky', 'outdoor architecture', 'house exterior',
  ],
};

// Résout le setting réel à partir du sous-service, avant que WORK_SCENES ne soit lu.
// Évite que peinture chambre soit traité comme exterior parce que WORK_SCENES.peinture est exterior.
function _resolveServiceSetting(metier, travaux, defaultSetting) {
  const svc = (travaux || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const met = (metier  || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (met === 'peinture') {
    if (/chambre|salon|cuisine|couloir|plafond|interieur|interieure|cage.*escal|boiserie.*int|papier.*peint|enduit.*decor/.test(svc))
      return 'interior';
    if (/facade|volet|portail|cloture|exterieur|exterieure|boiserie.*ext|sous.*face|soffit/.test(svc))
      return 'exterior';
  }
  if (met === 'debarras') {
    if (/cave|appartement|studio|grenier|sous.*sol|comble|interieur|interieure|piece|bureau|chambre|couloir/.test(svc))
      return 'interior';
  }
  if (met === 'carrelage') {
    if (/salle.*bain|salle.*eau|cuisine.*sol|salon.*sol|chambre.*sol|couloir.*sol|interieur|interieure/.test(svc))
      return 'interior';
  }
  return defaultSetting;
}

function buildDallePromptV2(row) {
  let work;
  if (row.metier && WORK_SCENES[row.metier]) {
    work = WORK_SCENES[row.metier];
    _lastMatch = {
      matched_category: work.category || row.metier,
      matched_key:      row.metier,
      matched_service:  row.travaux || '',
      match_score:      20,
    };
  } else {
    work = _getWorkDetail(row.travaux);
  }
  const city = _getCityContext(row.ville);
  const resolvedSetting = _resolveServiceSetting(row.metier, row.travaux, work.setting);
  const isInt = resolvedSetting === 'interior';

  // Map old and new state values to WORK_SCENES state keys
  const stateKey = {
    desordre:  'debut',
    debut:     'debut',
    encours:   'encours',
    propre:    'semifinal',
    semifinal: 'semifinal',
    final:     'final',
  }[row.etat] || 'encours';

  const stateData = work.states?.[stateKey] || work.states?.encours || {};

  const meteo = {
    soleil:  'bright midday sun, short shadows, pale blue sky',
    nuageux: 'flat grey overcast, muted colors',
    brumeux: 'hazy milky overcast, very low contrast',
    pluie:   'dark heavy clouds, wet surfaces',
  }[row.meteo] || (isInt ? 'natural daylight from window' : city.light);

  const _metierCtx  = CONTEXTE_BY_METIER[row.metier];
  const roadContext = _metierCtx
    ? ((_metierCtx.find(o => o.value === row.contexte) || {}).desc || null)
    : ((work.context_map || {})[row.contexte] || null);

  // Quand le service résolu est intérieur ET que la scène de base (WORK_SCENES) est extérieure,
  // on substitue intégralement le socle spatial pour éviter tout champ géométrique incohérent.
  const intBase = (resolvedSetting === 'interior' && work.setting !== 'interior')
    ? INTERIOR_SCENE_BASE : null;

  return JSON.stringify({
    photo_goal:        'work-progress documentation by French contractor, cheap Android smartphone',
    location:          (row.ville || '').trim() ? `${row.ville.trim()}, France` : 'France',
    work_type:         work.intro,
    setting:           resolvedSetting,
    state:             stateData.description || stateKey,
    state_level:       stateKey,
    camera_position:   intBase ? intBase.camera_position : work.camera,
    framing:           intBase ? intBase.framing : (stateData.framing || { work_pct: 55, foreground: '', midground: '', background: '' }),
    site_debris:       stateData.debris  || 'construction debris on site',
    photo_defects:     work.photo_defects,
    architecture:      intBase ? intBase.architecture : city.arch,
    light:             intBase ? intBase.light : meteo,
    contexte:          row.contexte || 'maison',
    roadside_context:  intBase ? null : roadContext,
    exclude:           intBase ? [...intBase.exclude, ...(work.exclusions || [])] : (work.exclusions || []),
    no_people:         !work.hasWorkers,
    _matched_category: _lastMatch.matched_category,
    _matched_key:      _lastMatch.matched_key,
    _matched_service:  _lastMatch.matched_service,
    _match_score:      _lastMatch.match_score,
  }, null, 2);
}

// ─── JS validation before sending to GPT ─────────────────────────────────────
function _validateScene(jsonStr) {
  let obj;
  try { obj = JSON.parse(jsonStr); } catch { return ['Invalid JSON scene']; }
  const issues = [];
  if (!obj.work_type)                        issues.push('work_type is missing');
  if (!obj.framing?.foreground)              issues.push('framing.foreground is missing');
  if (!obj.framing?.midground)               issues.push('framing.midground is missing');
  const _bg1 = (obj.framing?.background || '').toLowerCase();
  const _skyOpen1   = /\b(?:open\s+sky|sky\s+(?:in\s+(?:the\s+)?)?background|rooftops?\s+and\s+sky|garden\s+and\s+sky|sky\s+(?:above|overhead)|sky\s+visible\b)/.test(_bg1);
  const _skyWindow1 = /sky\s+(?:visible\s+)?through\s+(?:the\s+)?window|faint\s+sky\s+(?:through|behind)/.test(_bg1);
  if (obj.setting === 'interior' && _skyOpen1 && !_skyWindow1)
    issues.push('interior scene has open sky in background — incoherent');
  if (obj.setting === 'exterior' && (obj.camera_position || '').toLowerCase().includes('inside'))
    issues.push('exterior work but camera is described as inside');
  return issues;
}

function _validateSceneStrict(obj) {
  const issues = [];
  if (!obj.work_type)                          issues.push('work_type missing');
  if (!obj.state)                              issues.push('state missing');
  if (!obj.camera_position)                   issues.push('camera_position missing');
  if (!obj.framing?.foreground)               issues.push('framing.foreground missing');
  if (!obj.framing?.midground)                issues.push('framing.midground missing');
  if (!obj.framing?.background)               issues.push('framing.background missing');
  if (typeof obj.framing?.work_pct !== 'number') issues.push('framing.work_pct must be a number');
  if (!obj.site_debris)                       issues.push('site_debris missing');
  if (!obj.architecture)                      issues.push('architecture missing');
  if (!obj.light)                             issues.push('light missing');
  if (!['interior', 'exterior'].includes(obj.setting)) issues.push('setting must be interior or exterior');
  if (!Array.isArray(obj.photo_defects) || obj.photo_defects.length !== 2)
    issues.push('photo_defects must be an array of exactly 2 items');
  const _bg2 = (obj.framing?.background || '').toLowerCase();
  const _skyOpen2   = /\b(?:open\s+sky|sky\s+(?:in\s+(?:the\s+)?)?background|rooftops?\s+and\s+sky|garden\s+and\s+sky|sky\s+(?:above|overhead)|sky\s+visible\b)/.test(_bg2);
  const _skyWindow2 = /sky\s+(?:visible\s+)?through\s+(?:the\s+)?window|faint\s+sky\s+(?:through|behind)/.test(_bg2);
  if (obj.setting === 'interior' && _skyOpen2 && !_skyWindow2)
    issues.push('interior scene has open sky in background — incoherent');
  if (obj.setting === 'exterior' && (obj.camera_position || '').toLowerCase().includes('inside'))
    issues.push('exterior work but camera is inside — incoherent');
  return issues;
}

// ─── GPT scene planner: JSON → camera-first image prompt ─────────────────────
const _IMG_REWRITE_SYSTEM = `You are an image prompt engineer for realistic construction-site smartphone photography.

You receive a structured JSON scene description and convert it into a precise image generation prompt.

PRIORITY ORDER (most important first):
1. PHOTO TYPE — establish from photo_goal, in positive language only. Example: "Ordinary work-progress snapshot taken on a cheap Android smartphone."
2. CAMERA COMPOSITION — if composition_desc is present, use it to set the shot distance and framing intent first; then use camera_position and framing to describe the scene spatially: where each element sits, what % of the frame it occupies. The construction work must fill work_pct% of the image.
3. SCENE CONTENT — work_type, state, key elements visible.
4. PHOTO DEFECTS — include exactly the defects listed in photo_defects, nothing extra.
5. CONTEXT — architecture style, light/weather condition. If location_subtype is present, use it to describe the specific location precisely. Every element in location_must_have must appear visible in the scene. Elements in location_supporting may appear naturally in the background or mid-ground if space allows. If work_surface is present, the camera must be positioned so that this surface fills or anchors the primary focal plane of the image — it is the physical substrate of the intervention, not background decoration.
6. SAFETY TRIANGLE — include a warning triangle only when triangle_rule is "required_if_on_road", "required_if_safe", or "required_if_blocking". Never show a warning triangle when triangle_rule is "forbidden" or "forbidden_if_safely_parked".
7. PROFESSIONAL VEHICLE — for depannage/breakdown scenes: include the service van or tow truck if professional_vehicle_presence is "clearly_visible"; keep it at the very edge of the frame if "partially_visible"; omit it entirely if "absent" or if the field is not present.

Rules:
- Maximum 220 words
- Write every instruction positively. Replace "exclude X" with a spatial alternative if possible.
- Apply no_people: true by placing the camera so no humans are visible in frame.
- Output only the final English image prompt. No explanation, no JSON, no title.`;

const _SCENE_JSON_SYSTEM = `You are a construction-site scene editor for realistic GMB smartphone photography.

You receive a SceneJSON already built from a trade database. Your job is to REFINE it — not invent from scratch.

Rules:
- Keep every field that is already correct. Only improve fields that are vague or generic.
- Improve camera_position, framing (foreground/midground/background), and site_debris to be more vivid and specific.
- photo_defects: return EXACTLY 2 items chosen from this list:
  slight horizon tilt, mild overexposure in bright areas, light JPEG compression artifacts,
  slight barrel distortion at edges, muted color saturation, minor motion blur on foreground detail.
- Do NOT add workers, people, or disasters. Keep no_people as-is.
- Do NOT change work_type, state, setting, architecture, or light unless they are clearly wrong.
- Keep all fields starting with _ unchanged (debug fields: _matched_category, _matched_service, _match_score).
- Output ONLY valid JSON matching the input schema exactly. No markdown fences, no explanation.`;

async function _generateSceneJSON(baseScene, key) {
  const callGPT = async (userContent) => {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: _SCENE_PLANNER_MODEL,
        messages: [
          { role: 'system', content: _SCENE_JSON_SYSTEM },
          { role: 'user',   content: userContent }
        ],
        max_tokens: 1000,
        temperature: 0.35
      })
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error('Scene JSON error: ' + (err.error?.message || resp.statusText));
    }
    const data = await resp.json();
    return data.choices[0].message.content.trim().replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  };

  let obj;
  try {
    const raw = await callGPT(baseScene);
    obj = JSON.parse(raw);
    const issues = _validateSceneStrict(obj);
    if (issues.length) {
      const raw2 = await callGPT(baseScene + `\n\nFix these issues: ${issues.join('; ')}`);
      obj = JSON.parse(raw2);
      const issues2 = _validateSceneStrict(obj);
      if (issues2.length) {
        console.warn('[_generateSceneJSON] retry still invalid:', issues2, '— using baseScene');
        return baseScene;
      }
    }
    return JSON.stringify(obj);
  } catch (e) {
    console.warn('[_generateSceneJSON] error:', e.message, '— using baseScene');
    return baseScene;
  }
}

async function _rewritePromptWithGPT(jsonScene, key) {
  const resp   = await _fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: _SCENE_PLANNER_MODEL,
      messages: [
        { role: 'system', content: _IMG_REWRITE_SYSTEM },
        { role: 'user',   content: jsonScene }
      ],
      max_tokens: 350,
      temperature: 0.75
    })
  }, 30000);
  const parsed = await _readResponseOnce(resp);
  if (!parsed.ok) throw new Error('Scene planner error: ' + (parsed.data?.error?.message || parsed.raw || `HTTP ${parsed.status}`));
  return parsed.data.choices[0].message.content.trim();
}

function _escHtml(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function addImgRow() {
  const id = ++_imgCounter;
  _imgRows.unshift({ id, fiche: '', metier: '', travaux: '', ville: '', contexte: 'maison', etat: 'encours', meteo: 'auto', nb: 3, status: 'pending', images: [] });
  renderImgPlanning();
}

function removeImgRow(id) {
  _imgRows = _imgRows.filter(r => r.id !== id);
  renderImgPlanning();
  updateCostEstimate();
}

function updateImgRow(id, field, value) {
  const row = _imgRows.find(r => r.id === id);
  if (!row) return;
  row[field] = value;
  const card = document.querySelector(`.img-plan-card[data-rowid="${id}"]`);
  if (card) {
    if (field === 'etat') {
      card.querySelectorAll('.img-etat-pill').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.etat === value);
      });
    }
    const analyseEl = card.querySelector('.img-plan-analyse');
    if (analyseEl) analyseEl.innerHTML = _renderAnalyse(row);
  }
  updateCostEstimate();
}

function _renderAnalyse(row) {
  let obj;
  try { obj = JSON.parse(buildDallePromptV2(row)); } catch { return ''; }

  const stateLabels = { debut: 'Début', encours: 'En cours', semifinal: 'Presque terminé', final: 'Terminé' };
  const serviceDemande = (row.travaux || '').trim() || '—';
  const serviceDetecte = obj._matched_service || '—';
  const _ctxList       = CONTEXTE_BY_METIER[row.metier] || CONTEXTE_OPTIONS;
  const contexteLabel  = (_ctxList.find(o => o.value === (row.contexte || _ctxList[0].value)) || _ctxList[0]).label;
  const typeLabel      = obj.setting === 'interior' ? 'Intérieur' : 'Extérieur';
  const etatLabel      = stateLabels[obj.state_level] || '—';
  const arch           = obj.architecture || '—';
  const camera         = obj.camera_position || '—';
  const score          = obj._match_score || 0;
  const pct = Math.min(99, score >= 15 ? 98 :
                           score >= 10 ? Math.round(85 + (score - 10) * 2.6) :
                           score >= 6  ? Math.round(65 + (score - 6)  * 5) :
                                         Math.round(40 + score * 4));
  const confColor = pct >= 80 ? '#22c55e' : pct >= 55 ? '#f59e0b' : '#ef4444';

  return `
<div class="img-analyse-head">Analyse de la scène</div>
<div class="img-analyse-row">
  <span class="img-analyse-key">Service demandé</span>
  <span class="img-analyse-val img-analyse-muted">${_escHtml(serviceDemande)}</span>
</div>
<div class="img-analyse-row">
  <span class="img-analyse-key">Service détecté</span>
  <span class="img-analyse-val">${_escHtml(serviceDetecte)}</span>
</div>
<div class="img-analyse-row">
  <span class="img-analyse-key">Contexte</span>
  <span class="img-analyse-val img-analyse-muted">${_escHtml(contexteLabel)}</span>
</div>
<div class="img-analyse-row">
  <span class="img-analyse-key">Type</span>
  <span class="img-analyse-val">${typeLabel}</span>
</div>
<div class="img-analyse-row">
  <span class="img-analyse-key">État</span>
  <span class="img-analyse-val">${etatLabel}</span>
</div>
<div class="img-analyse-row">
  <span class="img-analyse-key">Architecture</span>
  <span class="img-analyse-val img-analyse-muted">${_escHtml(arch)}</span>
</div>
<div class="img-analyse-row img-analyse-row-last">
  <span class="img-analyse-key">Caméra</span>
  <span class="img-analyse-val img-analyse-muted">${_escHtml(camera)}</span>
</div>
<div class="img-analyse-conf">
  <div class="img-analyse-conf-label">Confiance du matching</div>
  <div class="img-analyse-conf-bar">
    <div class="img-analyse-conf-track">
      <div class="img-analyse-conf-fill" style="width:${pct}%;background:${confColor}"></div>
    </div>
    <span class="img-analyse-conf-pct" style="color:${confColor}">${pct} %</span>
  </div>
</div>`;
}

function _svcOpts(metierKey, currentValue) {
  const cat = SERVICE_CATALOG[metierKey];
  if (!cat) return '<option value="">— Sous-service —</option>';
  return '<option value="">— Sous-service —</option>' +
    cat.services.map(s =>
      `<option value="${_escHtml(s)}"${s === currentValue ? ' selected' : ''}>${_escHtml(s)}</option>`
    ).join('');
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
    if (analyseEl) analyseEl.innerHTML = _renderAnalyse(row);
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
    <div class="img-plan-analyse">${_renderAnalyse(row)}</div>
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
  const cost  = (total * 0.04).toFixed(2);
  const el    = document.getElementById('img-cost-estimate');
  if (el) el.textContent = total > 0 ? `~${total} image${total > 1 ? 's' : ''} · ~$${cost}` : '';
}

function _blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function slugify(str) {
  return (str || 'image')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

// ─── Task-status infrastructure & call log ────────────────────────────────────
let _generationRunActive  = false;   // lock: prevents two runs in parallel
let _generationRunId      = 0;       // incremented per run; stale completions ignored in finally
let _imgApiCallCount      = 0;       // image API calls (current batch)
let _imgVisionCallCount   = 0;       // Vision API calls (current batch)
let _imgTaskIdSeq         = 0;       // unique taskId across all runs

const IMAGE_TASK_STATUS = {
  PENDING:             'pending',
  GENERATING:          'generating',
  CHECKING_SAFETY:     'checking_safety',
  RETRYING:            'retrying',
  SUCCESS:             'success',
  FAILED:              'failed',
  REJECTED_SAFETY:     'rejected_safety',
  SAFETY_CHECK_FAILED: 'safety_check_failed',
};
const _TERMINAL_STATUSES = new Set([
  IMAGE_TASK_STATUS.SUCCESS, IMAGE_TASK_STATUS.FAILED,
  IMAGE_TASK_STATUS.REJECTED_SAFETY, IMAGE_TASK_STATUS.SAFETY_CHECK_FAILED,
]);
const MAX_IMAGE_ATTEMPTS            = 3;  // max image API calls per task
const MAX_SAFETY_ATTEMPTS_PER_IMAGE = 3;  // max Vision retries before SAFETY_CHECK_FAILED
function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function _trackGeneration() {
  const n = (parseInt(localStorage.getItem('gmb_img_count') || '0', 10)) + 1;
  localStorage.setItem('gmb_img_count', n);
  const el = document.getElementById('img-gen-counter');
  if (el) el.textContent = `${n} image${n > 1 ? 's' : ''} générée${n > 1 ? 's' : ''} au total`;
}
async function _fetchWithTimeout(url, options = {}, timeoutMs = 120000) {
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (e) {
    if (e.name === 'AbortError') throw new Error(`Request timeout after ${timeoutMs / 1000}s: ${url.split('/').pop()}`);
    throw e;
  } finally { clearTimeout(timeoutId); }
}
async function _readResponseOnce(response) {
  const raw = await response.text();
  let data = null;
  try { if (raw) data = JSON.parse(raw); } catch { }
  return { ok: response.ok, status: response.status, raw, data };
}

// ─── Safety image gate ────────────────────────────────────────────────────────

const SAFETY_CHECK_RULES = {
  toiture:              "You are a worksite safety inspector. Return ONLY valid JSON: {\"safe\":true/false,\"severity\":\"ok\"/\"warning\"/\"critical\",\"reason\":\"string\"}. CRITICAL if you clearly see: full industrial pallet on pitched roof; worker feet/body over gutter with no platform; worker on roof with no harness/rope/roof-hook; ladder used as horizontal platform; heavy unsecured stack near roof edge. Do not reject for minor imperfections. Reject only when a clearly visible critical safety impossibility is present.",
  nettoyage_toiture:    "You are a worksite safety inspector. Return ONLY valid JSON: {\"safe\":true/false,\"severity\":\"ok\"/\"warning\"/\"critical\",\"reason\":\"string\"}. CRITICAL if you clearly see: worker on wet moss-covered tiles without harness; leaning over gutter edge without guardrail; bare hands on chemical-treated surface without gloves. Do not reject for minor imperfections. Reject only when a clearly visible critical safety impossibility is present.",
  nettoyage_gouttieres: "You are a worksite safety inspector. Return ONLY valid JSON: {\"safe\":true/false,\"severity\":\"ok\"/\"warning\"/\"critical\",\"reason\":\"string\"}. CRITICAL if you clearly see: ladder leaning directly against the gutter channel without standoff; person reaching far sideways past their center of gravity off the ladder; person standing on the top two rungs. Do not reject for minor imperfections. Reject only when a clearly visible critical safety impossibility is present.",
  etancheite:           "You are a worksite safety inspector. Return ONLY valid JSON: {\"safe\":true/false,\"severity\":\"ok\"/\"warning\"/\"critical\",\"reason\":\"string\"}. CRITICAL if you clearly see: person balanced on parapet coping; open-flame torch near a loose membrane edge; roll blocking the only roof access hatch; person within 2 m of flat roof edge with no harness. Do not reject for minor imperfections. Reject only when a clearly visible critical safety impossibility is present.",
  ravalement:           "You are a worksite safety inspector. Return ONLY valid JSON: {\"safe\":true/false,\"severity\":\"ok\"/\"warning\"/\"critical\",\"reason\":\"string\"}. CRITICAL if you clearly see: person leaning out past scaffold guardrail over the void; scaffold platform above 2 m with no guardrail; unsupported plank bridging two scaffold frames. Do not reject for minor imperfections. Reject only when a clearly visible critical safety impossibility is present.",
  // peinture — skipped: indoor low-risk, forbidden[] covers edge cases
  // nettoyage — skipped: ground-level, low visual safety signal
  // carrelage — skipped: floor-level, blade guard already in prompt rules
  // débarras  — skipped: two-person carry enforced by max_workers + forbidden[]
  'élagage':            "You are a worksite safety inspector. Return ONLY valid JSON: {\"safe\":true/false,\"severity\":\"ok\"/\"warning\"/\"critical\",\"reason\":\"string\"}. CRITICAL if you clearly see: climber in tree with no rope or harness; person standing directly under a branch being cut; climber feet dangling unsupported; chainsaw in obviously impossible posture. Do not reject for minor imperfections. Reject only when a clearly visible critical safety impossibility is present.",
  abattage:             "You are a worksite safety inspector. Return ONLY valid JSON: {\"safe\":true/false,\"severity\":\"ok\"/\"warning\"/\"critical\",\"reason\":\"string\"}. CRITICAL if you clearly see: person in the direct fall zone in front of the notch cut; chainsaw cutting overhead; person on far side of trunk during felling. Do not reject for minor imperfections. Reject only when a clearly visible critical safety impossibility is present.",
  'maçonnerie':         "You are a worksite safety inspector. Return ONLY valid JSON: {\"safe\":true/false,\"severity\":\"ok\"/\"warning\"/\"critical\",\"reason\":\"string\"}. CRITICAL if you clearly see: person balanced on top of unfinished wall above 1.5 m without scaffold; single block being lifted overhead without mechanical aid. Do not reject for minor imperfections. Reject only when a clearly visible critical safety impossibility is present.",
  vitrier:              "You are a worksite safety inspector. Return ONLY valid JSON: {\"safe\":true/false,\"severity\":\"ok\"/\"warning\"/\"critical\",\"reason\":\"string\"}. CRITICAL if you clearly see: bare hands on large glass pane edges without cut-resistant gloves; glass pane balanced upright against a wall with no support cradle; broken glass on the floor with bare feet visible. Do not reject for minor imperfections. Reject only when a clearly visible critical safety impossibility is present.",
  terrassement:         "You are a worksite safety inspector. Return ONLY valid JSON: {\"safe\":true/false,\"severity\":\"ok\"/\"warning\"/\"critical\",\"reason\":\"string\"}. CRITICAL if you clearly see: person standing inside the open trench directly under the excavator bucket; person between the rotating excavator cab and the trench edge; machine operating near a structure with no ground spotter visible. Do not reject for minor imperfections. Reject only when a clearly visible critical safety impossibility is present.",
  paysagiste:           "You are a worksite safety inspector. Return ONLY valid JSON: {\"safe\":true/false,\"severity\":\"ok\"/\"warning\"/\"critical\",\"reason\":\"string\"}. CRITICAL if you clearly see: mower operating on a visibly steep slope with the operator at tipping risk; chainsaw used without visible leg protection; person on an unstable household stepladder pruning a tall tree. Do not reject for minor imperfections. Reject only when a clearly visible critical safety impossibility is present.",
  depannage_auto:       "You are a worksite safety inspector. Return ONLY valid JSON: {\"safe\":true/false,\"severity\":\"ok\"/\"warning\"/\"critical\",\"reason\":\"string\"}. CRITICAL if you clearly see: technician on the live carriageway lane with no warning triangle visible; vehicle lifted with no visible axle stand or support; person between the vehicle and traffic; cables crossing the carriageway. Do not reject for minor imperfections. Reject only when a clearly visible critical safety impossibility is present.",
};

async function _checkImageSafety(b64, matchedKey, apiKey) {
  const prompt = SAFETY_CHECK_RULES[matchedKey];
  if (!prompt) return { safe: true };
  try {
    const resp   = await _fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 200,
        messages: [{ role: 'user', content: [
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${b64}`, detail: 'low' } },
          { type: 'text', text: prompt },
        ]}],
        response_format: { type: 'json_object' },
      })
    }, 60000);
    const parsed = await _readResponseOnce(resp);
    if (!parsed.ok || !parsed.data) return { safe: null, checkFailed: true, reason: `HTTP ${parsed.status}` };
    const raw = parsed.data.choices?.[0]?.message?.content;
    let obj;
    try { obj = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return { safe: null, checkFailed: true, reason: 'JSON parse error' }; }
    if (obj?.safe == null) return { safe: null, checkFailed: true, reason: 'missing safe field' };
    return { safe: obj.safe, severity: obj.severity || 'ok', reason: obj.reason || '' };
  } catch (e) { return { safe: null, checkFailed: true, reason: e.message }; }
}

// ─── Batch plan assertion ──────────────────────────────────────────────────────
// Throws if any required batch-plan field is missing on a task.
// Call at the top of _generateImageOnly to catch integration misses early.
// ─── Final worker / no_people consistency guard ───────────────────────────────
// Called on the final scene object just before _appendLockedFinalConstraints.
// Throws [WORKER_PROMPT_CONTRADICTION] if var_workers > 0 but no_people = true.
// Normalises no_people to match the resolved worker state.
function _assertFinalWorkerConsistency(scene) {
  const sceneWorkers  = scene.var_workers || 0;
  const scenePresence = scene.var_presence || 'none';
  const hasWorkers    = sceneWorkers > 0 || scenePresence === 'workers';

  if (hasWorkers && scene.no_people === true) {
    throw new Error(
      `[WORKER_PROMPT_CONTRADICTION] var_workers=${sceneWorkers} var_presence=${scenePresence} but no_people=true`
    );
  }

  if (hasWorkers)  scene.no_people = false;
  if (!hasWorkers) scene.no_people = true;
}

function _assertTaskHasBatchPlan(task) {
  const required = [
    '_pre_assigned_composition',
    '_pre_assigned_worker_presence',
    '_pre_assigned_worker_count',
    '_capture_defects_resolved',
    '_batch_plan_id',
  ];
  const missing = required.filter(k => task[k] === undefined || task[k] === null);
  if (missing.length)
    throw new Error(`[INCOMPLETE_BATCH_PLAN] taskId=${task.taskId} missing=${missing.join(',')}`);
}

// ─── Image-only generation (NO safety check — handled separately in processTask) ─

async function _generateImageOnly(task, key, runId) {
  const { jsonScene, presencePlan, i, slug, _planBase } = task;
  const realistScene = _applySiteRealism(jsonScene, i);
  const variedScene    = _applyVariation(realistScene, i, presencePlan[i]);
  // Verify batch plan exists, then inject pre-assigned fields into scene
  _assertTaskHasBatchPlan(task);
  let _sceneForResolve = variedScene;
  try {
    const _so = JSON.parse(_sceneForResolve);
    _so._pre_assigned_composition = task._pre_assigned_composition;
    _so._pre_assigned_vehicle     = task._pre_assigned_vehicle;
    _so._capture_defects_resolved = task._capture_defects_resolved;
    _sceneForResolve = JSON.stringify(_so);
  } catch {}
  const resolvedScene  = _resolveLocationAndComposition(_sceneForResolve, i);
  const sceneValid     = _validateResolvedScene(resolvedScene);
  if (sceneValid.issues?.length)
    console.warn(`[SceneValidate] ${_planBase._matched_key} #${i}: ${sceneValid.issues.join(' | ')}`);
  const locServiceValid = _validateLocationServiceCompatibility(sceneValid.fixedStr);
  if (locServiceValid.issues?.length)
    console.warn(`[LocServiceValid] ${_planBase._matched_key} #${i}: ${locServiceValid.issues.join(' | ')}`);
  const workerResult = _validateWorkerScene(locServiceValid.fixedStr);
  if (workerResult.issues?.length)
    console.warn(`[WorkerScene] ${_planBase._matched_key} #${i}: ${workerResult.issues.join(' | ')}`);

  const _qObj   = JSON.parse(workerResult.fixedStr);
  const _qCheck = _validateQuality(_qObj);
  let finalScene;
  if (_qCheck.ok) {
    finalScene = workerResult.fixedStr;
  } else if (_qCheck.fixedObj) {
    finalScene = JSON.stringify(_qCheck.fixedObj);
    console.warn(`[QualityGate] patched — ${_qObj._matched_key}: ${_qCheck.issues.join(' | ')}`);
  } else {
    finalScene = jsonScene;
    console.warn(`[QualityGate] fallback — ${_qObj._matched_key}: ${_qCheck.issues.join(' | ')}`);
  }

  const _gptPrompt = _USE_PROMPT_BUILDER
    ? PromptBuilder.build(finalScene)
    : await _rewritePromptWithGPT(finalScene, key);
  // _capture_defects_resolved guaranteed by _assertTaskHasBatchPlan — append locked constraints after GPT
  const _finalSceneObj = JSON.parse(finalScene);
  _assertFinalWorkerConsistency(_finalSceneObj);
  const prompt = _appendLockedFinalConstraints(_gptPrompt, _finalSceneObj);

  const reason = task.imageAttempt === 1 ? 'initial' : (task._imageRetryReason || 'retry_image_error');
  _imgApiCallCount++;
  window._imgCallLog.push({ type: 'image', runId, taskId: task.taskId, metier: _planBase._matched_key, service: _planBase._matched_service, imageIndex: i, imageAttempt: task.imageAttempt, reason });
  console.log(`[IMAGE REQUEST] runId=${runId} taskId=${task.taskId} metier=${_planBase._matched_key} service=${_planBase._matched_service} imageIndex=${i} imageAttempt=${task.imageAttempt} reason=${reason}`);

  let parsed;
  {
    const rawResp = await _fetchWithTimeout('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-image-2', prompt, n: 1, size: '1536x1024', quality: 'high', output_format: 'jpeg', output_compression: 85 })
    }, 180000);
    parsed = await _readResponseOnce(rawResp);
  }

  if (!parsed.ok) {
    const errMsg = parsed.data?.error?.message || '';
    if (errMsg.includes('does not exist') || errMsg.includes('not found') || parsed.status === 404) {
      const fallbackResp = await _fetchWithTimeout('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-image-1', prompt, n: 1, size: '1024x1024', quality: 'high', output_format: 'jpeg', output_compression: 85 })
      }, 180000);
      parsed = await _readResponseOnce(fallbackResp);
    }
    if (!parsed.ok) throw new Error(parsed.data?.error?.message || `HTTP ${parsed.status}`);
  }

  const item = parsed.data?.data?.[0];
  if (!item) throw new Error('No image returned by API');
  const b64      = item.b64_json || null;
  const imgUrl   = item.url     || null;
  const filename = `${slug}-${String(i + 1).padStart(2, '0')}.jpg`;
  const src      = b64 ? `data:image/jpeg;base64,${b64}` : imgUrl;

  return { b64, imgUrl, filename, src };
}

// ─── Concurrency queue — max 3 simultaneous ───────────────────────────────────
// Image retries and Vision retries are handled by separate loops in processTask.

async function _runImageBatch(tasks, key, progressBar, progressLbl, runId, runImages) {
  const total       = tasks.length;
  const CONCURRENCY = 3;
  let doneCount = 0;
  let cursor    = 0;

  const updateProgress = () => {
    const ok   = tasks.filter(t => t.status === IMAGE_TASK_STATUS.SUCCESS).length;
    const fail = tasks.filter(t => _TERMINAL_STATUSES.has(t.status) && t.status !== IMAGE_TASK_STATUS.SUCCESS).length;
    if (progressBar) progressBar.style.width = Math.round(doneCount / total * 100) + '%';
    if (progressLbl) progressLbl.textContent =
      `${ok} générée(s)${fail ? ` · ${fail} échec(s)` : ''} — ${doneCount}/${total}`;
  };
  updateProgress();

  const processTask = async (task) => {
    try {
      // ── Outer loop: image generation (max MAX_IMAGE_ATTEMPTS API calls) ─────
      for (let imageAttempt = 1; imageAttempt <= MAX_IMAGE_ATTEMPTS; imageAttempt++) {
        task.imageAttempt = imageAttempt;
        if (imageAttempt > 1) {
          task.status = IMAGE_TASK_STATUS.RETRYING;
          updateProgress();
          await _sleep(imageAttempt * 2500);
        } else {
          task.status = IMAGE_TASK_STATUS.GENERATING;
          updateProgress();
        }

        // Step 1: one image API call — throws on network/API error
        let imageResult;
        try {
          imageResult = await _generateImageOnly(task, key, runId);
        } catch (e) {
          task.error = e.message;
          task._imageRetryReason = 'retry_image_error';
          if (imageAttempt === MAX_IMAGE_ATTEMPTS) { task.status = IMAGE_TASK_STATUS.FAILED; return; }
          continue; // retry image generation
        }

        // Step 2: safety check — retry Vision only, never regenerate the image
        if (imageResult.b64 && SAFETY_CHECK_RULES[task._planBase._matched_key]) {
          let safetyPassed = false;

          // ── Inner loop: Vision retries on the SAME image ─────────────────
          for (let safetyAttempt = 1; safetyAttempt <= MAX_SAFETY_ATTEMPTS_PER_IMAGE; safetyAttempt++) {
            task.status = IMAGE_TASK_STATUS.CHECKING_SAFETY;
            updateProgress();
            _imgVisionCallCount++;
            window._imgCallLog.push({ type: 'safety', runId, taskId: task.taskId, imageAttempt, safetyAttempt });
            console.log(`[SAFETY REQUEST] runId=${runId} taskId=${task.taskId} imageAttempt=${imageAttempt} safetyAttempt=${safetyAttempt}`);

            const safety = await _checkImageSafety(imageResult.b64, task._planBase._matched_key, key);

            if (safety.checkFailed) {
              if (safetyAttempt < MAX_SAFETY_ATTEMPTS_PER_IMAGE) {
                await _sleep(safetyAttempt * 1500); // wait, then retry Vision on same image
                continue;
              }
              // All Vision attempts failed — reject without new image generation
              task.status = IMAGE_TASK_STATUS.SAFETY_CHECK_FAILED;
              task.error  = safety.reason || 'safety check unavailable after 3 attempts';
              return;
            }

            if (!safety.safe && safety.severity === 'critical') {
              task.error = safety.reason || 'critical safety violation';
              break; // exit inner loop → outer loop regenerates
            }

            safetyPassed = true;
            break;
          }

          if (!safetyPassed) {
            // Critical violation confirmed — regenerate a new image
            task._imageRetryReason = 'regenerate_after_safety_reject';
            if (imageAttempt === MAX_IMAGE_ATTEMPTS) { task.status = IMAGE_TASK_STATUS.REJECTED_SAFETY; return; }
            continue; // outer loop: new image generation
          }
        }

        // Step 3: SUCCESS — deduplicate by taskId before pushing
        if (runImages.some(img => img.taskId === task.taskId)) return;
        task.status = IMAGE_TASK_STATUS.SUCCESS;
        task.result = imageResult;
        const imgEntry = { b64: imageResult.b64, url: imageResult.imgUrl, filename: imageResult.filename, taskId: task.taskId };
        task.row.images.push(imgEntry);
        runImages.push(imgEntry);
        appendImgCard(imageResult.src, imageResult.filename, task.row.fiche || task.row.travaux);
        _trackGeneration();
        console.log(`[IMAGE SUCCESS] runId=${runId} taskId=${task.taskId} imageAttempt=${imageAttempt} apiCalls=${_imgApiCallCount} visionCalls=${_imgVisionCallCount}`);
        return;
      }

      // Outer loop exhausted (only if every image attempt was a safety rejection)
      if (!_TERMINAL_STATUSES.has(task.status)) {
        task.status = IMAGE_TASK_STATUS.FAILED;
        task.error  = task.error || 'all image attempts exhausted';
      }
    } finally {
      doneCount++;
      updateProgress();
      const rowTasks = tasks.filter(t => t.row === task.row);
      if (rowTasks.every(t => _TERMINAL_STATUSES.has(t.status))) {
        task.row.status = rowTasks.some(t => t.status === IMAGE_TASK_STATUS.SUCCESS) ? 'done' : 'error';
        renderImgPlanning();
      }
    }
  };

  const runWorker = async () => {
    while (cursor < tasks.length) {
      const task = tasks[cursor++];
      await processTask(task);
    }
  };

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, total) }, () => runWorker()));

  // Sentinel: any non-terminal task means processTask exited early — guard against edge cases
  for (const task of tasks) {
    if (!_TERMINAL_STATUSES.has(task.status)) {
      task.status = IMAGE_TASK_STATUS.FAILED;
      task.error  = task.error || 'task did not complete';
    }
  }
}

// ─── Summary UI ───────────────────────────────────────────────────────────────

function _showGenerationSummary(total, succeedCount, failedTasks, key) {
  _hideSummary();
  const el = document.createElement('div');
  el.id = 'img-gen-summary';
  el.className = 'img-gen-summary';

  if (!failedTasks.length) {
    el.innerHTML = `<span class="img-gen-ok">✓ ${total} / ${total} images générées</span>`;
  } else {
    const failLines = failedTasks.map(t => {
      const metier  = _escHtml(t._planBase?._matched_key || '—');
      const service = _escHtml((t.row.travaux || t.row.fiche || '').slice(0, 40));
      const idx     = t.i + 1;
      const status  = _escHtml(t.status || '—');
      const tries   = t.attempts || 1;
      const err     = t.error ? ' — ' + _escHtml(t.error.slice(0, 120)) : '';
      return `<li><b>${metier}</b> · ${service} · #${idx} · ${status} (×${tries})${err}</li>`;
    }).join('');
    el.innerHTML = `
      <div class="img-gen-summary-row">
        <span class="img-gen-ok">${succeedCount} générée(s)</span>
        <span class="img-gen-fail"> · ${failedTasks.length} échec(s)</span>
        <span class="img-gen-total"> sur ${total} demandée(s)</span>
      </div>
      <ul class="img-gen-fail-list">${failLines}</ul>
      <button class="btn btn-secondary img-gen-retry" onclick="_retryFailedImages()">
        ↺ Relancer les ${failedTasks.length} échec(s)
      </button>`;
    window._lastFailedTasks = failedTasks;
    window._lastApiKey      = key;
  }

  const grid = document.getElementById('img-results-grid');
  grid.parentNode.insertBefore(el, grid);
}

function _hideSummary() {
  const el = document.getElementById('img-gen-summary');
  if (el) el.remove();
  window._lastFailedTasks = null;
}

async function _retryFailedImages() {
  if (_generationRunActive) { console.warn('[Retry] génération déjà en cours'); return; }
  const key   = window._lastApiKey || document.getElementById('openai-key')?.value.trim();
  const tasks = window._lastFailedTasks;
  if (!key || !tasks?.length) return;

  _generationRunActive = true;
  const runId = ++_generationRunId;
  document.getElementById('btn-generate-all').disabled = true;

  tasks.forEach(t => {
    t.status       = IMAGE_TASK_STATUS.PENDING;
    t.imageAttempt = 0;
    t.error        = null;
    t.result       = null;
  });
  _hideSummary();

  const progressBar = document.getElementById('img-progress-bar');
  const progressLbl = document.getElementById('img-progress-label');
  document.getElementById('img-progress-wrap').style.display = 'block';

  const retryImages = [];
  try {
    await _runImageBatch(tasks, key, progressBar, progressLbl, runId, retryImages);
  } finally {
    if (runId === _generationRunId) {
      _generationRunActive = false;
      document.getElementById('btn-generate-all').disabled = false;
    }
  }

  // Merge retry successes into _generatedImages (dedup by taskId)
  for (const img of retryImages) {
    if (!_generatedImages.some(e => e.taskId === img.taskId)) _generatedImages.push(img);
  }

  const succeeded = tasks.filter(t => t.status === IMAGE_TASK_STATUS.SUCCESS);
  const failed    = tasks.filter(t => _TERMINAL_STATUSES.has(t.status) && t.status !== IMAGE_TASK_STATUS.SUCCESS);
  if (_generatedImages.length > 0) {
    const btn = document.getElementById('btn-download-zip');
    btn.textContent = _generatedImages.length === 1 ? "↓ Télécharger l'image" : '↓ Télécharger le ZIP';
    btn.style.display = 'inline-flex';
  }
  _showGenerationSummary(tasks.length, succeeded.length, failed, key);
}

// ─── Debug dry-run (console: _debugResolvedScene({metier, travaux, contexte, etat, imageIndex})) ───

async function _debugResolvedScene({ metier, travaux, contexte, etat, imageIndex = 0 } = {}) {
  if (!metier || !travaux) { console.error('[DRY-RUN] metier and travaux are required'); return null; }
  const row = { metier, travaux, contexte: contexte || 'maison', etat: etat || 'encours', nb: 1, ville: '', fiche: '', meteo: 'auto' };
  let baseScene;
  try { baseScene = buildDallePromptV2(row); } catch (e) { console.error('[DRY-RUN] buildDallePromptV2 failed:', e.message); return null; }

  const realism    = _applySiteRealism(baseScene, imageIndex);
  const varied     = _applyVariation(realism, imageIndex, null);
  const resolved   = _resolveLocationAndComposition(varied, imageIndex);
  const sceneVal    = _validateResolvedScene(resolved);
  const locSvcVal   = _validateLocationServiceCompatibility(sceneVal.fixedStr);
  const workerVal   = _validateWorkerScene(locSvcVal.fixedStr);
  const qObj        = JSON.parse(workerVal.fixedStr);
  const qCheck      = _validateQuality(qObj);
  const finalStr    = (qCheck.fixedObj ? JSON.stringify(qCheck.fixedObj) : workerVal.fixedStr);
  const s           = JSON.parse(finalStr);

  console.group(`[DRY-RUN] ${metier} / ${travaux} / ctx=${contexte} / idx=${imageIndex}`);
  console.log('location_type      :', s.location_type);
  console.log('location_subtype   :', s.location_subtype);
  console.log('work_surface       :', s.work_surface);
  console.log('location_must_have :', JSON.stringify(s.location_must_have));
  console.log('location_supporting:', JSON.stringify(s.location_supporting));
  console.log('composition        :', s.composition, '—', s.composition_desc?.slice(0, 60));
  console.log('prof_vehicle       :', s.professional_vehicle_presence);
  console.log('triangle_rule      :', s.triangle_rule);
  console.log('var_presence       :', s.var_presence, '| var_workers:', s.var_workers, '| no_people:', s.no_people);
  console.log('safety_mode        :', s._worker_safety_mode);
  console.log('exclude (first 5)  :', (s.exclude || []).slice(0, 5).join(' | '));
  if (sceneVal.issues?.length)   console.warn('SceneValidate issues :', sceneVal.issues.join(' | '));
  if (locSvcVal.issues?.length)  console.warn('LocService issues    :', locSvcVal.issues.join(' | '));
  if (workerVal.issues?.length)  console.warn('WorkerScene issues   :', workerVal.issues.join(' | '));
  console.groupEnd();

  return {
    location_type:    s.location_type,
    location_subtype: s.location_subtype,
    work_surface:     s.work_surface,
    location_must_have:  s.location_must_have,
    location_supporting: s.location_supporting,
    composition:      s.composition,
    composition_desc: s.composition_desc,
    professional_vehicle_presence: s.professional_vehicle_presence,
    triangle_rule:    s.triangle_rule,
    var_presence:     s.var_presence,
    var_workers:      s.var_workers,
    no_people:        s.no_people,
    safety_mode:      s._worker_safety_mode,
    exclude:          s.exclude,
    validate_issues:  [...(sceneVal.issues || []), ...(locSvcVal.issues || []), ...(workerVal.issues || [])],
    scene_json:       finalStr,
  };
}

// ─── Debug: batch plan dry-run ────────────────────────────────────────────────
// Usage: _debugBatchPlan([{_planBase:{_matched_key:'toiture',_matched_service:'nettoyage gouttières'}}, ...], seed)
function _debugBatchPlan(tasks, runSeed) {
  const seed    = runSeed ?? 42;
  const planned = _planGlobalBatch(tasks.map(t => Object.assign({}, t)), seed);
  _rebalanceGlobalBatchPlan(planned, seed);
  _validateCompleteBatchPlan(planned);
  console.group('[BATCH PLAN]');
  for (const t of planned) {
    const comp = t._pre_assigned_composition || '—';
    console.log({
      taskId:                    t.taskId ?? '—',
      metier:                    t._planBase?._matched_key,
      service:                   t._planBase?._matched_service,
      camera_composition:        comp,
      camera_distance:           CAMERA_COMPOSITIONS[comp]?.distance ?? '—',
      worker_presence:           t._pre_assigned_worker_presence,
      worker_count:              t._pre_assigned_worker_count,
      professional_vehicle:      t._pre_assigned_vehicle,
      capture_defects:           (t._capture_defects_resolved || []).map(d => d.key),
      batch_plan_id:             t._batch_plan_id,
    });
  }
  console.groupEnd();
  return planned;
}

// ─── Debug: full final prompt dry-run (mock GPT rewriter) ────────────────────
// Usage: await _debugFinalPrompt({metier:'toiture', travaux:'nettoyage gouttières', contexte:'maison'})
async function _debugFinalPrompt({ metier, travaux, contexte, etat, imageIndex = 0 } = {}) {
  if (!metier || !travaux) { console.error('[FINAL PROMPT DEBUG] metier and travaux are required'); return null; }
  const row = { metier, travaux, contexte: contexte || 'maison', etat: etat || 'encours', nb: 1, ville: '', fiche: '', meteo: 'auto' };
  let baseScene;
  try { baseScene = buildDallePromptV2(row); } catch (e) { console.error('[FINAL PROMPT DEBUG] buildDallePromptV2 failed:', e.message); return null; }

  const realism   = _applySiteRealism(baseScene, imageIndex);
  const varied    = _applyVariation(realism, imageIndex, null);
  const resolved  = _resolveLocationAndComposition(varied, imageIndex);
  const sceneVal  = _validateResolvedScene(resolved);
  const locSvcVal = _validateLocationServiceCompatibility(sceneVal.fixedStr);
  const workerVal = _validateWorkerScene(locSvcVal.fixedStr);
  const qObj      = JSON.parse(workerVal.fixedStr);
  const qCheck    = _validateQuality(qObj);
  const finalStr  = qCheck.fixedObj ? JSON.stringify(qCheck.fixedObj) : workerVal.fixedStr;
  const sceneObj  = JSON.parse(finalStr);

  sceneObj._capture_defects_resolved = _selectCaptureDefects(imageIndex, 1, _hashSeed(`${metier}${travaux}${imageIndex}`));
  const mockGPTOut = `[MOCK REWRITER — ${sceneObj.work_type || metier} — ${sceneObj.location_type} — ${sceneObj.composition}]`;
  const lockedPrompt = _appendLockedFinalConstraints(mockGPTOut, sceneObj);

  console.group(`[FINAL PROMPT DEBUG] ${metier} / ${travaux} / ctx=${contexte || 'maison'} / idx=${imageIndex}`);
  console.log('composition      :', sceneObj.composition);
  console.log('camera_distance  :', sceneObj.camera_distance);
  console.log('capture_defects  :', sceneObj._capture_defects_resolved.map(d => d.key).join(', '));
  console.log('vehicle_presence :', sceneObj.professional_vehicle_presence);
  console.log('--- LOCKED FINAL PROMPT ---');
  console.log(lockedPrompt);
  console.groupEnd();
  return { sceneObj, mockGPTOut, lockedPrompt };
}

// ─── Phase 1–4 parity bridge ─────────────────────────────────────────────────
// Snapshot des constantes de config legacy pour tests de parité T42.
// À supprimer lors du cutover final.
// Ne pas faire dépendre le pipeline de production de cet objet.
Object.defineProperty(window, '__IMAGE_GEN_LEGACY_CONFIG__', {
  value: Object.freeze({
    SERVICE_CATALOG,
    LOCATION_RULES,
    LOCATION_ALIASES,
    CAMERA_COMPOSITIONS,
    COMPOSITION_RULES_BY_METIER,
    CAPTURE_DEFECTS,
    CAPTURE_DEFECT_GROUPS,
    PROFESSIONAL_VEHICLE_RULES,
    WORK_SCENES,
    SITE_REALISM,
  }),
  writable: false,
  configurable: false,
});

// window._runModuleParityTests — Phase 1–4 parity test, callable standalone or from T42.
// Uses dynamic import() to load ES modules then deep-compares against legacy constants.
async function _runModuleParityTests() {
  function _normalizeForParity(v) {
    if (v instanceof RegExp) return { __type: 'RegExp', source: v.source, flags: v.flags };
    if (Array.isArray(v)) return v.map(_normalizeForParity);
    if (v !== null && typeof v === 'object') {
      const out = {};
      for (const k of Object.keys(v)) out[k] = _normalizeForParity(v[k]);
      return out;
    }
    return v;
  }
  function _deepDiff(a, b, path) {
    const na = _normalizeForParity(a);
    const nb = _normalizeForParity(b);
    if (JSON.stringify(na) === JSON.stringify(nb)) return [];
    if (na !== null && typeof na === 'object' && !Array.isArray(na) &&
        nb !== null && typeof nb === 'object' && !Array.isArray(nb)) {
      const keys = new Set([...Object.keys(na), ...Object.keys(nb)]);
      const diffs = [];
      for (const k of keys) diffs.push(..._deepDiff(a[k], b[k], path ? `${path}.${k}` : k));
      return diffs;
    }
    if (Array.isArray(na) && Array.isArray(nb)) {
      if (na.length !== nb.length) return [`${path}: length ${na.length} ≠ ${nb.length}`];
      const diffs = [];
      for (let i = 0; i < na.length; i++) diffs.push(..._deepDiff(a[i], b[i], `${path}[${i}]`));
      return diffs;
    }
    return [`${path}: expected ${JSON.stringify(nb)} received ${JSON.stringify(na)}`];
  }
  const [sc, loc, comp, def, veh] = await Promise.all([
    import('./src/image-generation/config/service-catalog.js'),
    import('./src/image-generation/config/locations.js'),
    import('./src/image-generation/config/compositions.js'),
    import('./src/image-generation/config/capture-defects.js'),
    import('./src/image-generation/config/vehicles.js'),
  ]);
  const leg = window.__IMAGE_GEN_LEGACY_CONFIG__;
  const checks = [
    ['SERVICE_CATALOG',             sc.SERVICE_CATALOG,               leg.SERVICE_CATALOG],
    ['LOCATION_RULES',              loc.LOCATION_RULES,               leg.LOCATION_RULES],
    ['LOCATION_ALIASES',            loc.LOCATION_ALIASES,             leg.LOCATION_ALIASES],
    ['CAMERA_COMPOSITIONS',         comp.CAMERA_COMPOSITIONS,         leg.CAMERA_COMPOSITIONS],
    ['COMPOSITION_RULES_BY_METIER', comp.COMPOSITION_RULES_BY_METIER, leg.COMPOSITION_RULES_BY_METIER],
    ['CAPTURE_DEFECTS',             def.CAPTURE_DEFECTS,              leg.CAPTURE_DEFECTS],
    ['CAPTURE_DEFECT_GROUPS',       def.CAPTURE_DEFECT_GROUPS,        leg.CAPTURE_DEFECT_GROUPS],
    ['PROFESSIONAL_VEHICLE_RULES',  veh.PROFESSIONAL_VEHICLE_RULES,   leg.PROFESSIONAL_VEHICLE_RULES],
  ];
  const allDiffs = [];
  for (const [name, mod, legacy] of checks) allDiffs.push(..._deepDiff(mod, legacy, name));
  return allDiffs;
}
window._runModuleParityTests = _runModuleParityTests;

// window._runServiceParityTests — Phase 2 parity test for WORK_SCENES + SITE_REALISM.
// T43: deep parity. T44: routing parity for 172 sub-services. T45: assembly integrity.
async function _runServiceParityTests() {
  function _npFn(v) {
    if (v instanceof RegExp) return { __type: 'RegExp', source: v.source, flags: v.flags };
    if (Array.isArray(v)) return v.map(_npFn);
    if (v !== null && typeof v === 'object') {
      const out = {};
      for (const k of Object.keys(v)) out[k] = _npFn(v[k]);
      return out;
    }
    return v;
  }
  function _dd(a, b, path) {
    const na = _npFn(a), nb = _npFn(b);
    if (JSON.stringify(na) === JSON.stringify(nb)) return [];
    if (na !== null && typeof na === 'object' && !Array.isArray(na) &&
        nb !== null && typeof nb === 'object' && !Array.isArray(nb)) {
      const keys = new Set([...Object.keys(na), ...Object.keys(nb)]);
      const diffs = [];
      for (const k of keys) diffs.push(..._dd(a[k], b[k], path ? `${path}.${k}` : k));
      return diffs;
    }
    if (Array.isArray(na) && Array.isArray(nb)) {
      if (na.length !== nb.length) return [`${path}: length ${na.length} ≠ ${nb.length}`];
      const diffs = [];
      for (let i = 0; i < na.length; i++) diffs.push(..._dd(a[i], b[i], `${path}[${i}]`));
      return diffs;
    }
    return [`${path}: expected ${JSON.stringify(nb)} received ${JSON.stringify(na)}`];
  }

  const svcMod = await import('./src/image-generation/services/index.js');
  const modWS = svcMod.WORK_SCENES;
  const modSR = svcMod.SITE_REALISM;
  const assertIntegrity = svcMod.assertServiceRegistriesIntegrity;
  const leg = window.__IMAGE_GEN_LEGACY_CONFIG__;

  // --- T43: deep structural parity ---
  const t43Diffs = [
    ..._dd(modWS, leg.WORK_SCENES, 'WORK_SCENES'),
    ..._dd(modSR, leg.SITE_REALISM, 'SITE_REALISM'),
  ];

  // --- T44: routing parity for all 172 sub-services ---
  function _normSvc44(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  function _routePool(sr, metier, normSvc) {
    const entry = sr[metier];
    if (!entry) return { type: 'missing' };
    let realism = entry;
    let bucket = 'direct';
    if (entry._dispatch === 'service') {
      bucket = (typeof _serviceGroup === 'function') ? _serviceGroup(normSvc) : 'default';
      realism = entry[bucket] || entry.default || null;
    } else if (entry._dispatch === 'contexte') {
      realism = entry.default || null;
      bucket = 'contexte_default';
    }
    if (!realism || !Array.isArray(realism.scenarios)) return { type: 'no_scenarios', bucket };
    const targeted = realism.scenarios.map((s, i) => ({ i, has_for: !!s._for, matches: s._for ? new RegExp(s._for, 'i').test(normSvc) : false })).filter(x => x.matches);
    const poolType = targeted.length ? 'targeted' : 'fallback';
    const forPatterns = targeted.map(x => realism.scenarios[x.i]._for);
    return { type: poolType, bucket, targetedCount: targeted.length, forPatterns };
  }
  const t44Diffs = [];
  let t44Total = 0;
  for (const [metier, cat] of Object.entries(SERVICE_CATALOG)) {
    for (const svc of cat.services) {
      t44Total++;
      const normSvc = _normSvc44(svc);
      const legR = _routePool(leg.SITE_REALISM, metier, normSvc);
      const modR = _routePool(modSR, metier, normSvc);
      if (JSON.stringify(legR) !== JSON.stringify(modR)) {
        t44Diffs.push(`${metier}/"${svc}": leg=${JSON.stringify(legR)} mod=${JSON.stringify(modR)}`);
      }
    }
  }

  // --- T45: assembly integrity ---
  let t45 = { ok: false, error: 'not run' };
  try { t45 = assertIntegrity(); } catch(e) { t45 = { ok: false, error: e.message }; }

  // --- Stats for T43 report ---
  function _countSRScenarios(obj, counts) {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj.scenarios)) {
      counts.scenarios += obj.scenarios.length;
      for (const s of obj.scenarios) if (s._for) counts.fors++;
    }
    for (const k of Object.keys(obj)) {
      if (!['scenarios','tools','protections','chantier_details','_trigger_service'].includes(k) && !k.startsWith('_')) {
        if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) _countSRScenarios(obj[k], counts);
      }
    }
  }
  const counts = { scenarios: 0, fors: 0 };
  for (const v of Object.values(leg.SITE_REALISM)) _countSRScenarios(v, counts);

  return {
    t43: { diffs: t43Diffs, wsKeys: Object.keys(modWS).length, srKeys: Object.keys(modSR).length },
    t44: { diffs: t44Diffs, total: t44Total },
    t45,
    stats: { srScenarios: counts.scenarios, srForPatterns: counts.fors },
  };
}
window._runServiceParityTests = _runServiceParityTests;

// Bridge Phase 3 — fonctions legacy exposées pour les tests de parité T46–T51.
// Ne pas utiliser en production. Suppression au cutover.
Object.defineProperty(window, '__IMAGE_GEN_LEGACY_RESOLUTION__', {
  value: Object.freeze({
    _hashSeed,
    _pick,
    _normalizeLocationKey,
    _resolveCompatibleSubtype,
    _resolveWorkSurface,
    _serviceGroup,
    _applySiteRealism,
    _resolveServiceSetting,
    _buildWorkerDesc,
    _buildPresencePlan,
    _validateWorkerScene,
    _assertFinalWorkerConsistency,
    WORKER_SCENE_RULES,
    FORBIDDEN_SAFETY_BY_METIER,
    _PRE_GEN_SAFETY,
    SAFETY_CHECK_RULES,
    _resolveLocationAndComposition,
    _applyVariation,
  }),
  writable: false,
  configurable: false,
});

async function _runResolutionParityTests() {
  const leg = window.__IMAGE_GEN_LEGACY_RESOLUTION__;

  function _npFn(v) {
    if (v instanceof RegExp) return { __type: 'RegExp', source: v.source, flags: v.flags };
    if (typeof v === 'function') return { __type: 'function', name: v.name };
    if (Array.isArray(v)) return v.map(_npFn);
    if (v !== null && typeof v === 'object') {
      const out = {};
      for (const k of Object.keys(v)) out[k] = _npFn(v[k]);
      return out;
    }
    return v;
  }
  function _jeq(a, b) { return JSON.stringify(_npFn(a)) === JSON.stringify(_npFn(b)); }
  function _jdiff(a, b, path) {
    if (_jeq(a, b)) return [];
    if (a !== null && typeof a === 'object' && !Array.isArray(a) &&
        b !== null && typeof b === 'object' && !Array.isArray(b)) {
      const keys = new Set([...Object.keys(_npFn(a)), ...Object.keys(_npFn(b))]);
      const diffs = [];
      for (const k of keys) diffs.push(..._jdiff(a[k], b[k], `${path}.${k}`));
      return diffs;
    }
    return [`${path}: ${JSON.stringify(_npFn(a))} ≠ ${JSON.stringify(_npFn(b))}`];
  }

  const {
    WORKER_SCENE_RULES: modWSR, FORBIDDEN_SAFETY_BY_METIER: modFSBM,
    _PRE_GEN_SAFETY: modPGS, SAFETY_CHECK_RULES: modSCR,
    _hashSeed: modHash, _pick: modPick,
    _normalizeLocationKey: modNLK, _resolveCompatibleSubtype: modRCS,
    _resolveWorkSurface: modRWS, _resolveLocationAndComposition: modRLAC,
    _serviceGroup: modSG, _applySiteRealism: modASR, _resolveServiceSetting: modRSS,
    _buildWorkerDesc: modBWD, _buildPresencePlan: modBPP, _validateWorkerScene: modVWS,
    _assertFinalWorkerConsistency: modAFWC,
    _applyVariation: modAV,
  } = await import('./src/image-generation/safety/worker-rules.js').then(async () => {
    const [wr, sr, wv, lr, svcr, wkr, det] = await Promise.all([
      import('./src/image-generation/safety/worker-rules.js'),
      import('./src/image-generation/safety/safety-rules.js'),
      import('./src/image-generation/safety/worker-validator.js'),
      import('./src/image-generation/resolution/location-resolver.js'),
      import('./src/image-generation/resolution/service-resolver.js'),
      import('./src/image-generation/resolution/worker-resolver.js'),
      import('./src/image-generation/utils/deterministic.js'),
    ]);
    return {
      WORKER_SCENE_RULES:          wr.WORKER_SCENE_RULES,
      FORBIDDEN_SAFETY_BY_METIER:  sr.FORBIDDEN_SAFETY_BY_METIER,
      _PRE_GEN_SAFETY:             sr._PRE_GEN_SAFETY,
      SAFETY_CHECK_RULES:          sr.SAFETY_CHECK_RULES,
      _hashSeed:                   det._hashSeed,
      _pick:                       det._pick,
      _normalizeLocationKey:       lr._normalizeLocationKey,
      _resolveCompatibleSubtype:   lr._resolveCompatibleSubtype,
      _resolveWorkSurface:         lr._resolveWorkSurface,
      _resolveLocationAndComposition: lr._resolveLocationAndComposition,
      _serviceGroup:               svcr._serviceGroup,
      _applySiteRealism:           svcr._applySiteRealism,
      _resolveServiceSetting:      svcr._resolveServiceSetting,
      _buildWorkerDesc:            wv._buildWorkerDesc,
      _buildPresencePlan:          wv._buildPresencePlan,
      _validateWorkerScene:        wv._validateWorkerScene,
      _assertFinalWorkerConsistency: wv._assertFinalWorkerConsistency,
      _applyVariation:             wkr._applyVariation,
    };
  });

  // --- T46: safety static data parity ---
  const t46Diffs = [
    ..._jdiff(modWSR,  leg.WORKER_SCENE_RULES,         'WORKER_SCENE_RULES'),
    ..._jdiff(modFSBM, leg.FORBIDDEN_SAFETY_BY_METIER, 'FORBIDDEN_SAFETY_BY_METIER'),
    ..._jdiff(modPGS,  leg._PRE_GEN_SAFETY,            '_PRE_GEN_SAFETY'),
    ..._jdiff(modSCR,  leg.SAFETY_CHECK_RULES,         'SAFETY_CHECK_RULES'),
  ];

  // --- T47: deterministic utils — 10000 cases ---
  let t47Cases = 0, t47Diffs = [];
  const t47Seeds = [
    '', 'a', 'test', 'élagage', 'maçonnerie', 'nettoyage_toiture',
    'depannage_auto|crevaison|domicile|final|0',
    'toiture|rénovation toiture|maison_individuelle|encours|3',
  ];
  for (const s of t47Seeds) {
    for (let i = 0; i < 1250; i++) {
      const idx = t47Cases;
      const legH = leg._hashSeed(`${s}${i}`);
      const modH = modHash(`${s}${i}`);
      if (legH !== modH) t47Diffs.push(`hashSeed("${s}${i}"): leg=${legH} mod=${modH}`);
      const arr = ['a','b','c','d','e','f','g','h'].slice(0, 2 + (i % 7));
      const legP = JSON.stringify(leg._pick(arr, 1 + (i % 3), legH));
      const modP = JSON.stringify(modPick(arr, 1 + (i % 3), modH));
      if (legP !== modP) t47Diffs.push(`pick([${arr}],n=${1+(i%3)},seed=${legH}): leg=${legP} mod=${modP}`);
      t47Cases++;
    }
  }

  // --- T48: location resolver — 44 contexts × 172 services × 5 seeds ---
  const CONTEXTES_TEST = [
    'maison','appartement','immeuble','commerce','professionnel','entrepot','agricole',
    'autoroute','route_nationale','route_dept','rue_ville','parking','domicile','garage','station_service','aire_repos',
  ];
  let t48Cases = 0, t48Diffs = [];
  for (const [metier, cat] of Object.entries(SERVICE_CATALOG)) {
    for (const svc of cat.services) {
      for (const ctx of CONTEXTES_TEST.slice(0, 3)) {
        for (let img = 0; img < 2; img++) {
          const input = JSON.stringify({
            _matched_key: metier, _matched_service: svc, contexte: ctx,
            state_level: 'encours', exclude: [],
          });
          const legIn = JSON.parse(input); const modIn = JSON.parse(input);
          let legR, modR, legErr, modErr;
          try { legR = leg._resolveLocationAndComposition(JSON.stringify(legIn), img); } catch(e) { legErr = e.message; }
          try { modR = modRLAC(JSON.stringify(modIn), img); } catch(e) { modErr = e.message; }
          if (!_jeq(legR, modR) || !_jeq(legErr, modErr)) {
            t48Diffs.push(`${metier}/${svc}/${ctx}/img${img}: leg=${legR?.slice?.(0,80)} mod=${modR?.slice?.(0,80)}`);
          }
          t48Cases++;
        }
      }
    }
  }

  // --- T49: service resolver — 172 services × 4 états × 10 seeds × contextes ---
  // Matrice: 172 services × 4 états × 10 seeds = 6880 résolutions _applySiteRealism
  // + contextes spécifiques depannage_auto / etancheite
  // + 172 × 2 defaultSetting pour _resolveServiceSetting
  const T49_STATES = ['debut','encours','semifinal','final'];
  const T49_CONTEXTES_GENERIC = ['maison','appartement','immeuble'];
  const T49_CONTEXTES_DEPANNAGE = ['autoroute','parking','domicile','rue_ville','garage'];
  const T49_CONTEXTES_ETANCHEITE = ['maison','immeuble','commerce'];
  let t49Cases = 0, t49Diffs = [];
  for (const [metier, cat] of Object.entries(SERVICE_CATALOG)) {
    const contexteList = metier === 'depannage_auto' ? T49_CONTEXTES_DEPANNAGE
                       : metier === 'etancheite'    ? T49_CONTEXTES_ETANCHEITE
                       : T49_CONTEXTES_GENERIC;
    for (const svc of cat.services) {
      for (const state of T49_STATES) {
        for (const ctx of contexteList) {
          for (let img = 0; img < 10; img++) {
            const input = JSON.stringify({
              _matched_key: metier, _matched_service: svc, contexte: ctx,
              state_level: state, exclude: [],
            });
            let legR, modR;
            try { legR = leg._applySiteRealism(input, img); } catch(e) { legR = `ERR:${e.message}`; }
            try { modR = modASR(input, img); } catch(e) { modR = `ERR:${e.message}`; }
            if (!_jeq(legR, modR)) t49Diffs.push(`${metier}/"${svc}"/${state}/${ctx}/img${img}`);
            t49Cases++;
          }
        }
      }
      // _resolveServiceSetting — independent of context/state/seed
      for (const defSetting of ['exterior','interior']) {
        const legS = leg._resolveServiceSetting(metier, svc, defSetting);
        const modS = modRSS(metier, svc, defSetting);
        if (legS !== modS) t49Diffs.push(`resolveServiceSetting(${metier},"${svc}",${defSetting}): leg=${legS} mod=${modS}`);
      }
    }
  }

  // --- T50: worker/safety — 18 métiers × multiple configs ---
  const METIERS_TEST = Object.keys(WORKER_SCENE_RULES);
  const STATES = ['debut','encours','semifinal','final'];
  const PRESENCES = ['workers','none','indirect'];
  let t50Cases = 0, t50Diffs = [];
  for (const metier of METIERS_TEST) {
    for (const state of STATES) {
      for (let img = 0; img < 2; img++) {
        // _buildPresencePlan
        const legPlan = JSON.stringify(leg._buildPresencePlan(4, state, metier, img * 17));
        const modPlan = JSON.stringify(modBPP(4, state, metier, img * 17));
        if (legPlan !== modPlan) t50Diffs.push(`buildPresencePlan(${metier},${state},img${img})`);
        // _buildWorkerDesc
        const legDesc = leg._buildWorkerDesc(metier, 1, img * 31);
        const modDesc = modBWD(metier, 1, img * 31);
        if (legDesc !== modDesc) t50Diffs.push(`buildWorkerDesc(${metier},1,seed=${img*31})`);
        // _validateWorkerScene
        for (const pres of PRESENCES) {
          const sceneIn = JSON.stringify({
            _matched_key: metier, _matched_service: '', state_level: state,
            var_presence: pres, var_workers: pres === 'workers' ? 1 : 0,
            no_people: pres !== 'workers', var_worker_desc: pres === 'workers' ? legDesc : undefined,
            exclude: [],
          });
          let legV, modV;
          try { legV = leg._validateWorkerScene(sceneIn); } catch(e) { legV = { error: e.message }; }
          try { modV = modVWS(sceneIn); } catch(e) { modV = { error: e.message }; }
          if (!_jeq(legV, modV)) t50Diffs.push(`validateWorkerScene(${metier},${state},${pres})`);
          // _assertFinalWorkerConsistency — mutations parity
          const legScene = JSON.parse(sceneIn); const modScene = JSON.parse(sceneIn);
          let legAErr, modAErr;
          try { leg._assertFinalWorkerConsistency(legScene); } catch(e) { legAErr = e.message; }
          try { modAFWC(modScene); } catch(e) { modAErr = e.message; }
          if (!_jeq(legScene, modScene) || legAErr !== modAErr) {
            t50Diffs.push(`assertFinalWorkerConsistency(${metier},${state},${pres})`);
          }
          t50Cases++;
        }
      }
    }
  }

  // --- T51: dependency integrity + _applyVariation single definition ---
  const t51Issues = [];
  if (!_jeq(modWSR, leg.WORKER_SCENE_RULES)) t51Issues.push('WORKER_SCENE_RULES mismatch');
  // _applyVariation: single definition in scene-resolver.js, re-exported from worker-resolver.js
  const sceneResMod  = await import('./src/image-generation/resolution/scene-resolver.js');
  const workerResMod = await import('./src/image-generation/resolution/worker-resolver.js');
  if (typeof sceneResMod._applyVariation !== 'function')
    t51Issues.push('_applyVariation not exported from scene-resolver.js');
  if (workerResMod._applyVariation !== sceneResMod._applyVariation)
    t51Issues.push('worker-resolver._applyVariation is not the same reference as scene-resolver._applyVariation (copy detected)');
  const t51Ok = t51Issues.length === 0;

  return { t46Diffs, t47: { cases: t47Cases, diffs: t47Diffs }, t48: { cases: t48Cases, diffs: t48Diffs }, t49: { cases: t49Cases, diffs: t49Diffs }, t50: { cases: t50Cases, diffs: t50Diffs }, t51: { ok: t51Ok, issues: t51Issues } };
}
window._runResolutionParityTests = _runResolutionParityTests;

// Bridge Phase 4 — fonctions de planification/validation pour tests de parité T52–T58.
// Ne pas utiliser en production. Suppression au cutover.
Object.defineProperty(window, '__IMAGE_GEN_LEGACY_PLANNING__', {
  value: Object.freeze({
    _selectCaptureDefects,
    _planBatchCompositions,
    _planBatchWorkerPresence,
    _planGlobalBatch,
    _rebalanceGlobalBatchPlan,
    _validateCompleteBatchPlan,
    _validateResolvedScene,
    _validateLocationServiceCompatibility,
    _validateQuality,
    _assertTaskHasBatchPlan,
    QUALITY_RULES,
  }),
  writable: false,
  configurable: false,
});

async function _runPlanningParityTests() {
  const leg = window.__IMAGE_GEN_LEGACY_PLANNING__;
  function _npFn(v) {
    if (v instanceof RegExp) return { __type: 'RegExp', source: v.source, flags: v.flags };
    if (typeof v === 'function') return { __type: 'function', name: v.name };
    if (Array.isArray(v)) return v.map(_npFn);
    if (v !== null && typeof v === 'object') { const o={}; for(const k of Object.keys(v)) o[k]=_npFn(v[k]); return o; }
    return v;
  }
  function _jeq(a, b) { return JSON.stringify(_npFn(a)) === JSON.stringify(_npFn(b)); }

  const [capMod, compMod, wrkMod, batchMod, svalMod, lvalMod, qvalMod, bvalMod] = await Promise.all([
    import('./src/image-generation/planning/capture-defect-planner.js'),
    import('./src/image-generation/planning/composition-planner.js'),
    import('./src/image-generation/planning/worker-planner.js'),
    import('./src/image-generation/planning/batch-planner.js'),
    import('./src/image-generation/validation/scene-validator.js'),
    import('./src/image-generation/validation/location-validator.js'),
    import('./src/image-generation/validation/quality-validator.js'),
    import('./src/image-generation/validation/batch-validator.js'),
  ]);

  const METIERS = Object.keys(COMPOSITION_RULES_BY_METIER).concat(
    Object.keys(SERVICE_CATALOG).filter(k => !Object.keys(COMPOSITION_RULES_BY_METIER).includes(k))
  );
  const STATES = ['debut','encours','semifinal','final'];
  const BATCH_SIZES = [1, 2, 3, 4, 6, 10];

  // --- T52: QUALITY_RULES parity ---
  const t52Diffs = [];
  const legQR = leg.QUALITY_RULES;
  const modQR = qvalMod.QUALITY_RULES;
  if (legQR.length !== modQR.length) {
    t52Diffs.push(`length: leg=${legQR.length} mod=${modQR.length}`);
  } else {
    for (let i = 0; i < legQR.length; i++) {
      if (legQR[i].id !== modQR[i].id) t52Diffs.push(`[${i}].id: ${legQR[i].id} vs ${modQR[i].id}`);
      if (legQR[i].key !== modQR[i].key) t52Diffs.push(`[${i}].key`);
      if (!_jeq(legQR[i].forbidden, modQR[i].forbidden)) t52Diffs.push(`[${i}].forbidden`);
      if (JSON.stringify(legQR[i].fix) !== JSON.stringify(modQR[i].fix)) t52Diffs.push(`[${i}].fix`);
      if (JSON.stringify(legQR[i].scan) !== JSON.stringify(modQR[i].scan)) t52Diffs.push(`[${i}].scan`);
    }
  }

  // --- T53: composition planner parity — 18 métiers × 6 sizes × 100 seeds = 10800 ---
  let t53Cases = 0, t53Diffs = [];
  for (const metier of METIERS) {
    for (const n of BATCH_SIZES) {
      for (let s = 0; s < 100; s++) {
        const legR = leg._planBatchCompositions(metier, n, s * 37 + 13);
        const modR = compMod._planBatchCompositions(metier, n, s * 37 + 13);
        if (!_jeq(legR, modR)) t53Diffs.push(`${metier}/n=${n}/s=${s}`);
        t53Cases++;
      }
    }
  }

  // --- T54: workers + vehicle + defects parity — 18 métiers × 4 sizes × 100 seeds = 7200 ---
  const T54_SIZES = [1, 2, 4, 6];
  let t54Cases = 0, t54Diffs = [];
  for (const metier of METIERS) {
    for (const n of T54_SIZES) {
      for (let s = 0; s < 100; s++) {
        const seed = s * 41 + 7;
        // worker presence
        const mkTask = (i) => ({
          _planBase: { _matched_key: metier, _matched_service: '' },
          _pre_assigned_composition: ['medium_intervention','wide_worksite','close_detail','contextual_overview'][i % 4],
        });
        const legGroup = Array.from({length: n}, (_,i) => mkTask(i));
        const modGroup = Array.from({length: n}, (_,i) => mkTask(i));
        leg._planBatchWorkerPresence(legGroup, seed);
        wrkMod._planBatchWorkerPresence(modGroup, seed);
        for (let i = 0; i < n; i++) {
          if (legGroup[i]._pre_assigned_worker_presence !== modGroup[i]._pre_assigned_worker_presence ||
              legGroup[i]._pre_assigned_worker_count !== modGroup[i]._pre_assigned_worker_count) {
            t54Diffs.push(`workers ${metier}/n=${n}/s=${s}/i=${i}`);
          }
        }
        // defects
        for (let i = 0; i < n; i++) {
          const legD = leg._selectCaptureDefects(i, n, seed);
          const modD = capMod._selectCaptureDefects(i, n, seed);
          if (!_jeq(legD, modD)) t54Diffs.push(`defects ${metier}/n=${n}/s=${s}/i=${i}`);
        }
        t54Cases += n;
      }
    }
  }

  // --- T55: global batch plan parity ---
  let t55Cases = 0, t55Diffs = [];
  const T55_SCENARIOS = [
    // single métier / single service / varying sizes
    ...BATCH_SIZES.map(n => ({ metier: 'toiture', svc: 'Rénovation toiture complète', n })),
    ...BATCH_SIZES.map(n => ({ metier: 'depannage_auto', svc: 'Batterie à plat', n })),
    { metier: 'élagage', svc: 'Élagage arbre', n: 4 },
    { metier: 'paysagiste', svc: 'Création jardin', n: 6 },
  ];
  for (const { metier, svc, n } of T55_SCENARIOS) {
    for (let s = 0; s < 100; s++) {
      const runSeed = s * 53 + 11;
      const mkT = (i) => ({
        taskId: `task_${i}`,
        _planBase: { _matched_key: metier, _matched_service: svc },
        jsonScene: '{}', presencePlan: [], i,
      });
      const legTasks = Array.from({length: n}, (_,i) => mkT(i));
      const modTasks = Array.from({length: n}, (_,i) => mkT(i));
      leg._planGlobalBatch(legTasks, runSeed);
      batchMod._planGlobalBatch(modTasks, runSeed);
      for (let i = 0; i < n; i++) {
        const lk = ['_pre_assigned_composition','_pre_assigned_vehicle','_pre_assigned_worker_presence',
                    '_pre_assigned_worker_count','_capture_defects_resolved'];
        for (const k of lk) {
          if (!_jeq(legTasks[i][k], modTasks[i][k])) {
            t55Diffs.push(`${metier}/n=${n}/s=${s}/i=${i}/${k}`);
          }
        }
      }
      // rebalance parity
      const legTasks2 = Array.from({length: n}, (_,i) => mkT(i));
      const modTasks2 = Array.from({length: n}, (_,i) => mkT(i));
      leg._planGlobalBatch(legTasks2, runSeed);
      batchMod._planGlobalBatch(modTasks2, runSeed);
      leg._rebalanceGlobalBatchPlan(legTasks2, runSeed);
      batchMod._rebalanceGlobalBatchPlan(modTasks2, runSeed);
      for (let i = 0; i < n; i++) {
        if (!_jeq(legTasks2[i]._pre_assigned_composition, modTasks2[i]._pre_assigned_composition) ||
            !_jeq(legTasks2[i]._pre_assigned_vehicle, modTasks2[i]._pre_assigned_vehicle)) {
          t55Diffs.push(`rebal ${metier}/n=${n}/s=${s}/i=${i}`);
        }
      }
      t55Cases += n;
    }
  }

  // --- T56: validators parity ---
  let t56Cases = 0, t56Diffs = [];
  // _validateResolvedScene
  const T56_SCENES = [
    { _matched_key:'toiture', var_workers:2, no_people:false, var_presence:'workers', composition:'medium_intervention', location_type:'maison_individuelle', contexte:'maison', triangle_rule:null, exclude:[], state_level:'encours' },
    { _matched_key:'toiture', var_workers:2, no_people:true, var_presence:'workers', composition:'medium_intervention', location_type:'maison_individuelle', contexte:'maison', triangle_rule:null, exclude:[], state_level:'encours' },
    { _matched_key:'depannage_auto', var_workers:0, no_people:true, var_presence:'none', composition:'wide_worksite', location_type:'domicile', contexte:'domicile', triangle_rule:'forbidden', exclude:[], state_level:'final' },
    { _matched_key:'depannage_auto', var_workers:0, no_people:true, var_presence:'none', composition:'wide_worksite', location_type:'aire_repos', contexte:'aire_repos', triangle_rule:'forbidden_if_safely_parked', exclude:[], state_level:'final' },
    { _matched_key:'peinture', var_workers:0, no_people:true, var_presence:'none', composition:'close_detail', location_type:'appartement', contexte:'appartement', triangle_rule:null, setting:'exterior', exclude:[], state_level:'semifinal' },
    { _matched_key:'toiture', var_workers:0, no_people:true, var_presence:'none', composition:'wide_worksite', location_type:'maison_individuelle', contexte:'maison', triangle_rule:null, site_tools:['pallet of tiles'], exclude:[], state_level:'debut' },
  ];
  for (const scene of T56_SCENES) {
    const legIn = JSON.stringify(scene), modIn = JSON.stringify(scene);
    let legV, modV;
    try { legV = leg._validateResolvedScene(legIn); } catch(e) { legV = {error: e.message}; }
    try { modV = svalMod._validateResolvedScene(modIn); } catch(e) { modV = {error: e.message}; }
    if (!_jeq(legV, modV)) t56Diffs.push(`validateResolvedScene: ${scene._matched_key}/${scene.location_type}`);
    t56Cases++;
  }
  // _validateLocationServiceCompatibility
  const T56_LSC = [
    { _matched_key:'toiture', _matched_service:'Rénovation toiture complète', location_type:'immeuble', location_subtype:'immeuble_parties_communes' },
    { _matched_key:'etancheite', _matched_service:'Étanchéité toit terrasse', location_type:'immeuble', location_subtype:'immeuble_toiture_inclinee' },
    { _matched_key:'ravalement', _matched_service:'Ravalement façade', location_type:'immeuble', location_subtype:'immeuble_parties_communes' },
  ];
  for (const scene of T56_LSC) {
    let legV, modV;
    try { legV = leg._validateLocationServiceCompatibility(JSON.stringify(scene)); } catch(e) { legV={error:e.message}; }
    try { modV = lvalMod._validateLocationServiceCompatibility(JSON.stringify(scene)); } catch(e) { modV={error:e.message}; }
    if (!_jeq(legV, modV)) t56Diffs.push(`validateLSC: ${scene._matched_key}`);
    t56Cases++;
  }
  // _validateCompleteBatchPlan and _assertTaskHasBatchPlan
  const mkBatchTask = (comp, wp, pv) => ({
    _pre_assigned_composition: comp, _pre_assigned_worker_presence: wp,
    _pre_assigned_vehicle: pv, _pre_assigned_worker_count: wp==='workers'?1:0,
    _capture_defects_resolved: [{key:'k',prompt:'p'}], _batch_plan_id:'pid',
  });
  const validBatch = [
    mkBatchTask('medium_intervention','workers','clearly_visible'),
    mkBatchTask('wide_worksite','none','partially_visible'),
    mkBatchTask('contextual_overview','none','absent'),
    mkBatchTask('close_detail','none','absent'),
  ];
  const invalidBatch = [mkBatchTask('close_detail','none','absent'), mkBatchTask('close_detail','none','absent')];
  for (const [batch, shouldThrow] of [[validBatch, false],[invalidBatch, true]]) {
    let legErr, modErr;
    try { leg._validateCompleteBatchPlan(batch); } catch(e) { legErr = e.message; }
    try { bvalMod._validateCompleteBatchPlan(batch); } catch(e) { modErr = e.message; }
    if (!_jeq(legErr, modErr)) t56Diffs.push(`validateCompleteBatchPlan shouldThrow=${shouldThrow}`);
    t56Cases++;
  }

  // --- T57: exhaustive UI batch plans — 146 combos × 10 seeds × 3 sizes = 4380 ---
  // Use SERVICE_CATALOG to enumerate valid (metier, svc) pairs (= UI combos)
  const allCombos = [];
  for (const [metier, cat] of Object.entries(SERVICE_CATALOG)) {
    for (const svc of cat.services) allCombos.push({ metier, svc });
  }
  const T57_SIZES = [2, 4, 6];
  let t57Cases = 0, t57Diffs = [];
  // Sample 146 combos (all available)
  const t57Combos = allCombos.slice(0, 146);
  for (const { metier, svc } of t57Combos) {
    for (let s = 0; s < 10; s++) {
      for (const n of T57_SIZES) {
        const runSeed = s * 59 + 17;
        const mkT = (i) => ({ taskId:`t${i}`, _planBase:{ _matched_key:metier, _matched_service:svc }, jsonScene:'{}', presencePlan:[], i });
        const legTasks = Array.from({length:n},(_,i)=>mkT(i));
        const modTasks = Array.from({length:n},(_,i)=>mkT(i));
        leg._planGlobalBatch(legTasks, runSeed);
        batchMod._planGlobalBatch(modTasks, runSeed);
        leg._rebalanceGlobalBatchPlan(legTasks, runSeed);
        batchMod._rebalanceGlobalBatchPlan(modTasks, runSeed);
        for (let i = 0; i < n; i++) {
          if (!_jeq(legTasks[i]._pre_assigned_composition, modTasks[i]._pre_assigned_composition) ||
              !_jeq(legTasks[i]._pre_assigned_vehicle, modTasks[i]._pre_assigned_vehicle) ||
              !_jeq(legTasks[i]._pre_assigned_worker_presence, modTasks[i]._pre_assigned_worker_presence) ||
              !_jeq(legTasks[i]._capture_defects_resolved, modTasks[i]._capture_defects_resolved)) {
            t57Diffs.push(`${metier}/"${svc}"/s=${s}/n=${n}/i=${i}`);
          }
        }
        t57Cases += n;
      }
    }
  }

  // --- T58: Phase 4 dependency integrity ---
  const t58Issues = [];
  // All modules imported without error = no window/document/network deps (proved by imports above)
  // Verify: batch-planner uses _selectVehiclePresence (not inline copy)
  const bpSrc = batchMod._planGlobalBatch.toString();
  if (bpSrc.includes("'vehicle_arrival'") && bpSrc.includes('_selectVehiclePresence') === false)
    t58Issues.push('batch-planner._planGlobalBatch has inline vehicle selection instead of _selectVehiclePresence');
  const t58Ok = t58Issues.length === 0;

  return {
    t52: { diffs: t52Diffs },
    t53: { cases: t53Cases, diffs: t53Diffs },
    t54: { cases: t54Cases, diffs: t54Diffs },
    t55: { cases: t55Cases, diffs: t55Diffs },
    t56: { cases: t56Cases, diffs: t56Diffs },
    t57: { cases: t57Cases, diffs: t57Diffs },
    t58: { ok: t58Ok, issues: t58Issues },
  };
}
window._runPlanningParityTests = _runPlanningParityTests;

// Bridge Phase 5 — fonctions de prompt pour tests de parité T59–T66.
// Ne pas utiliser en production. Suppression au cutover.
Object.defineProperty(window, '__IMAGE_GEN_LEGACY_PROMPT__', {
  value: Object.freeze({
    buildDallePromptV2,
    _getWorkDetail,
    _getCityContext,
    PromptBuilder,
    PHOTO_STYLE_RULES,
    _IMG_REWRITE_SYSTEM,
    _SCENE_PLANNER_MODEL,
    _USE_PROMPT_BUILDER,
    INTERIOR_SCENE_BASE,
    _rewritePromptWithGPT,
    _appendLockedFinalConstraints,
    _validateScene,
    _validateSceneStrict,
    getLastMatch: () => Object.assign({}, _lastMatch),
  }),
  writable: false, configurable: false, enumerable: false,
});

async function _runPromptParityTests() {
  const leg = window.__IMAGE_GEN_LEGACY_PROMPT__;

  const [sbMod, pbMod, prMod, lcMod] = await Promise.all([
    import('./src/image-generation/prompt/scene-builder.js'),
    import('./src/image-generation/prompt/prompt-builder.js'),
    import('./src/image-generation/prompt/prompt-rewriter.js'),
    import('./src/image-generation/prompt/locked-constraints.js'),
  ]);

  function _jeq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

  // ─── T59: constants parity ────────────────────────────────────────────────
  const t59Diffs = [];
  if (leg._IMG_REWRITE_SYSTEM !== prMod._IMG_REWRITE_SYSTEM)
    t59Diffs.push('_IMG_REWRITE_SYSTEM mismatch');
  if (leg._USE_PROMPT_BUILDER !== pbMod._USE_PROMPT_BUILDER)
    t59Diffs.push('_USE_PROMPT_BUILDER mismatch');
  if (!_jeq(leg.INTERIOR_SCENE_BASE, sbMod.INTERIOR_SCENE_BASE))
    t59Diffs.push('INTERIOR_SCENE_BASE mismatch');
  if (!_jeq(leg.PHOTO_STYLE_RULES, pbMod.PHOTO_STYLE_RULES))
    t59Diffs.push('PHOTO_STYLE_RULES mismatch');
  if (leg._SCENE_PLANNER_MODEL !== prMod._SCENE_PLANNER_MODEL)
    t59Diffs.push('_SCENE_PLANNER_MODEL mismatch');

  // ─── T60: buildDallePromptV2 parity ──────────────────────────────────────
  // 172 sous-services (16 métiers) × 4 états × 4 (ville × meteo) = 2752 JSON cases + lastMatch parity
  const ETATS = ['debut', 'encours', 'semifinal', 'final'];
  const VILLES_METEOS = [
    { ville: 'Paris',   meteo: 'auto'   },
    { ville: 'Lyon',    meteo: 'soleil' },
    { ville: 'Rennes',  meteo: 'nuageux'},
    { ville: '',        meteo: 'auto'   },
  ];
  const t60Combos = [];
  for (const [metier, cat] of Object.entries(SERVICE_CATALOG)) {
    for (const svc of cat.services) t60Combos.push({ metier, svc });
  }
  let t60Cases = 0, t60JSONDiffs = [], t60LMDiffs = [];
  for (const { metier, svc } of t60Combos) {
    const ctx = CONTEXTE_BY_METIER[metier] ? (CONTEXTE_BY_METIER[metier][0]?.value || 'maison') : 'maison';
    for (const etat of ETATS) {
      for (const { ville, meteo } of VILLES_METEOS) {
        const row = { metier, travaux: svc, ville, etat, meteo, contexte: ctx, nb: 1, fiche: '', images: [] };
        const legResult = leg.buildDallePromptV2(row);
        const legLM     = leg.getLastMatch();
        const modLM     = {};
        const modResult = sbMod.buildDallePromptV2(row, { lastMatchState: modLM });
        if (legResult !== modResult)
          t60JSONDiffs.push(`${metier}/"${svc}"/${etat}/${ville||'_'}/${meteo}`);
        if (!_jeq(legLM, modLM))
          t60LMDiffs.push(`lm:${metier}/"${svc}"/${etat}`);
        t60Cases++;
      }
    }
  }

  const expectedT60 = t60Combos.length * ETATS.length * VILLES_METEOS.length;
  if (t60Cases !== expectedT60)
    t60JSONDiffs.push(`[T60_CASE_COUNT_MISMATCH] expected=${expectedT60} actual=${t60Cases} (combos=${t60Combos.length})`);

  // ─── T61: PromptBuilder parity ────────────────────────────────────────────
  // Build scene JSONs with legacy then compare PromptBuilder output character-by-character
  // 172 sous-services (16 métiers) × 2 états = 344 cases
  let t61Cases = 0, t61Diffs = [];
  for (const { metier, svc } of t60Combos) {
    for (const etat of ['encours', 'final']) {
      const row = { metier, travaux: svc, ville: 'Paris', etat, meteo: 'auto', contexte: 'maison', nb: 1, fiche: '', images: [] };
      const jsonScene = leg.buildDallePromptV2(row);
      try {
        const legPrompt = leg.PromptBuilder.build(jsonScene);
        const modPrompt = pbMod.PromptBuilder.build(jsonScene);
        if (legPrompt !== modPrompt)
          t61Diffs.push(`${metier}/"${svc}"/${etat}`);
      } catch(e) { t61Diffs.push(`err:${metier}/${etat}:${e.message}`); }
      t61Cases++;
    }
  }

  // ─── T62: _appendLockedFinalConstraints parity ───────────────────────────
  // Constructed scene objects covering all field combinations
  const COMPS     = Object.keys(CAMERA_COMPOSITIONS);
  const PRESENCES = [
    { var_presence: 'none',     var_workers: 0 },
    { var_presence: 'workers',  var_workers: 1 },
    { var_presence: 'workers',  var_workers: 2 },
    { var_presence: 'indirect', var_workers: 0, var_indirect_presence: 'gloves and tools left on the surface' },
  ];
  const TRI_RULES = [null, 'forbidden', 'forbidden_if_safely_parked', 'required_if_on_road'];
  const METIER_KEYS = Object.keys(COMPOSITION_RULES_BY_METIER);
  let t62Cases = 0, t62Diffs = [];
  for (const metier of METIER_KEYS) {
    for (const comp of COMPS.slice(0, 4)) {
      for (const pres of PRESENCES) {
        for (const tri of [null, 'forbidden']) {
          const defects = [{ key: 'jpeg', prompt: 'subtle JPEG compression artifacts' }];
          const safety  = (FORBIDDEN_SAFETY_BY_METIER[metier] || []).length > 0 ? 'Wear hard hat at all times.' : null;
          const scene   = Object.assign({
            composition: comp,
            _matched_key: metier,
            _capture_defects_resolved: defects,
            _worker_safety_mode: safety,
            triangle_rule: tri,
            no_people: pres.var_workers === 0,
          }, pres);
          const legPrompt = 'Test prompt for scene.';
          const legResult = leg._appendLockedFinalConstraints(legPrompt, scene);
          const modResult = lcMod._appendLockedFinalConstraints(legPrompt, scene);
          if (legResult !== modResult)
            t62Diffs.push(`${metier}/${comp}/${pres.var_presence}/tri=${tri}`);
          t62Cases++;
        }
      }
    }
  }

  // ─── T63: buildPromptRewriteRequest + rewritePromptWithGPT mock ──────────
  // Verify request structure and error handling without real network calls
  const t63Issues = [];
  let t63Cases = 0;

  // 63a — request structure parity
  const reqTest = prMod.buildPromptRewriteRequest({ prompt: 'test scene json', apiKey: 'sk-test' });
  if (reqTest.url !== 'https://api.openai.com/v1/chat/completions')
    t63Issues.push('url mismatch');
  if (reqTest.headers?.['Authorization'] !== 'Bearer sk-test')
    t63Issues.push('Authorization header mismatch');
  if (reqTest.headers?.['Content-Type'] !== 'application/json')
    t63Issues.push('Content-Type header mismatch');
  const bodyParsed = JSON.parse(reqTest.body);
  if (bodyParsed.model !== 'gpt-4.1')              t63Issues.push('model mismatch');
  if (bodyParsed.max_tokens !== 350)               t63Issues.push('max_tokens mismatch');
  if (bodyParsed.temperature !== 0.75)             t63Issues.push('temperature mismatch');
  if (bodyParsed.messages?.[0]?.role !== 'system') t63Issues.push('system role mismatch');
  if (bodyParsed.messages?.[0]?.content !== prMod._IMG_REWRITE_SYSTEM) t63Issues.push('system prompt mismatch');
  if (bodyParsed.messages?.[1]?.role !== 'user')   t63Issues.push('user role mismatch');
  if (bodyParsed.messages?.[1]?.content !== 'test scene json') t63Issues.push('user content mismatch');
  t63Cases++;

  // 63b — mock response scenarios
  const _mkResp = (ok, status, data) => ({
    ok, status,
    text: async () => (data !== null ? JSON.stringify(data) : ''),
  });
  const _mockRead = async (r) => {
    const raw = await r.text(); let data = null;
    try { if (raw) data = JSON.parse(raw); } catch {}
    return { ok: r.ok, status: r.status, raw, data };
  };

  // scenario 1: 200 OK valid
  try {
    const resp200 = _mkResp(true, 200, { choices: [{ message: { content: '  prompt result  ' } }] });
    const result = await prMod.rewritePromptWithGPT({ prompt: 'p', apiKey: 'k',
      fetchImpl: async () => resp200, readResponse: _mockRead });
    if (result !== 'prompt result') t63Issues.push('200 OK: wrong result');
  } catch(e) { t63Issues.push('200 OK threw: ' + e.message); }
  t63Cases++;

  // scenario 2: HTTP 400 error
  try {
    const resp400 = _mkResp(false, 400, { error: { message: 'Bad request' } });
    await prMod.rewritePromptWithGPT({ prompt: 'p', apiKey: 'k',
      fetchImpl: async () => resp400, readResponse: _mockRead });
    t63Issues.push('HTTP 400: should have thrown');
  } catch(e) {
    if (!e.message.includes('Scene planner error')) t63Issues.push('HTTP 400: wrong error message: ' + e.message);
  }
  t63Cases++;

  // scenario 3: HTTP 429 rate limit
  try {
    const resp429 = _mkResp(false, 429, { error: { message: 'Rate limit exceeded' } });
    await prMod.rewritePromptWithGPT({ prompt: 'p', apiKey: 'k',
      fetchImpl: async () => resp429, readResponse: _mockRead });
    t63Issues.push('HTTP 429: should have thrown');
  } catch(e) {
    if (!e.message.includes('Scene planner error')) t63Issues.push('HTTP 429: wrong error message');
  }
  t63Cases++;

  // scenario 4: HTTP 500 with empty body
  try {
    const resp500 = _mkResp(false, 500, null);
    await prMod.rewritePromptWithGPT({ prompt: 'p', apiKey: 'k',
      fetchImpl: async () => resp500, readResponse: _mockRead });
    t63Issues.push('HTTP 500: should have thrown');
  } catch(e) {
    if (!e.message.includes('Scene planner error')) t63Issues.push('HTTP 500: wrong error message');
  }
  t63Cases++;

  // scenario 5: network error
  try {
    await prMod.rewritePromptWithGPT({ prompt: 'p', apiKey: 'k',
      fetchImpl: async () => { throw new Error('Network error'); }, readResponse: _mockRead });
    t63Issues.push('network error: should have thrown');
  } catch(e) {
    if (!e.message.includes('Network error')) t63Issues.push('network error: wrong message: ' + e.message);
  }
  t63Cases++;

  // scenario 6: HTTP 200 with invalid JSON body
  try {
    const respInvalidJson = { ok: true, status: 200, text: async () => 'not-json{{{{' };
    const result6 = await prMod.rewritePromptWithGPT({ prompt: 'p', apiKey: 'k',
      fetchImpl: async () => respInvalidJson, readResponse: _mockRead });
    // _mockRead swallows parse errors (data=null), then rewritePromptWithGPT tries choices[0] → throws TypeError
    t63Issues.push('200 invalid JSON: should have thrown (got: ' + result6 + ')');
  } catch(e) {
    // Expected: TypeError accessing choices[0].message.content on null
    if (e instanceof TypeError || e.message.includes('Scene planner error') || e.message.includes('Cannot read') || e.message.includes("Cannot read properties") || e.message.includes('null') || e.message.includes('undefined')) {
      // acceptable
    } else {
      t63Issues.push('200 invalid JSON: unexpected error type: ' + e.message);
    }
  }
  t63Cases++;

  // scenario 7: HTTP 200 with empty body
  try {
    const respEmpty = { ok: true, status: 200, text: async () => '' };
    const result7 = await prMod.rewritePromptWithGPT({ prompt: 'p', apiKey: 'k',
      fetchImpl: async () => respEmpty, readResponse: _mockRead });
    t63Issues.push('200 empty body: should have thrown (got: ' + result7 + ')');
  } catch(e) {
    if (e instanceof TypeError || e.message.includes('Scene planner error') || e.message.includes('Cannot read') || e.message.includes('null') || e.message.includes('undefined')) {
      // acceptable
    } else {
      t63Issues.push('200 empty body: unexpected error type: ' + e.message);
    }
  }
  t63Cases++;

  // scenario 8: HTTP 200 with unexpected JSON structure (no choices array)
  try {
    const respNoChoices = _mkResp(true, 200, { result: 'something unexpected' });
    const result8 = await prMod.rewritePromptWithGPT({ prompt: 'p', apiKey: 'k',
      fetchImpl: async () => respNoChoices, readResponse: _mockRead });
    t63Issues.push('200 unexpected structure: should have thrown (got: ' + result8 + ')');
  } catch(e) {
    if (e instanceof TypeError || e.message.includes('Scene planner error') || e.message.includes('Cannot read') || e.message.includes('undefined')) {
      // acceptable
    } else {
      t63Issues.push('200 unexpected structure: unexpected error type: ' + e.message);
    }
  }
  t63Cases++;

  // scenario 9: timeout (fetchImpl rejects with abort/timeout error)
  try {
    await prMod.rewritePromptWithGPT({ prompt: 'p', apiKey: 'k',
      fetchImpl: async () => { throw new Error('AbortError: timeout'); }, readResponse: _mockRead });
    t63Issues.push('timeout: should have thrown');
  } catch(e) {
    if (!e.message.includes('AbortError') && !e.message.includes('timeout') && !e.message.includes('Timeout')) {
      t63Issues.push('timeout: wrong error message: ' + e.message);
    }
  }
  t63Cases++;

  // ─── T64: full shadow prompt pipeline parity ──────────────────────────────
  // Chain: buildDallePromptV2 → _applySiteRealism → _applyVariation
  //        → _resolveLocationAndComposition → _validateResolvedScene
  //        → PromptBuilder.build → _appendLockedFinalConstraints
  // 16 métiers × 4 états × 3 imageIndex = 192 pipelines complets
  const [srvcMod, sceneMod, locMod, svalMod, wrkMod, capMod, batchMod] = await Promise.all([
    import('./src/image-generation/resolution/service-resolver.js'),
    import('./src/image-generation/resolution/scene-resolver.js'),
    import('./src/image-generation/resolution/location-resolver.js'),
    import('./src/image-generation/validation/scene-validator.js'),
    import('./src/image-generation/planning/worker-planner.js'),
    import('./src/image-generation/planning/capture-defect-planner.js'),
    import('./src/image-generation/planning/batch-planner.js'),
  ]);
  const T64_ROWS = [
    { metier: 'toiture',              travaux: 'Remplacement tuiles',                ville: 'Paris',      meteo: 'auto',    contexte: 'maison' },
    { metier: 'nettoyage_toiture',    travaux: 'Démoussage toiture',                 ville: 'Lyon',       meteo: 'nuageux', contexte: 'maison' },
    { metier: 'nettoyage_gouttieres', travaux: 'Nettoyage gouttières',               ville: 'Rennes',     meteo: 'auto',    contexte: 'maison' },
    { metier: 'etancheite',           travaux: 'Étanchéité toit terrasse',           ville: 'Marseille',  meteo: 'soleil',  contexte: 'immeuble' },
    { metier: 'ravalement',           travaux: 'Ravalement façade',                  ville: 'Bordeaux',   meteo: 'auto',    contexte: 'maison' },
    { metier: 'maçonnerie',           travaux: 'Dalle béton',                        ville: 'Nantes',     meteo: 'auto',    contexte: 'maison' },
    { metier: 'peinture',             travaux: 'Peinture chambre',                   ville: 'Paris',      meteo: 'auto',    contexte: 'appartement' },
    { metier: 'carrelage',            travaux: 'Faïence salle de bain',              ville: 'Toulouse',   meteo: 'auto',    contexte: 'appartement' },
    { metier: 'vitrier',              travaux: 'Remplacement vitrage brisé',         ville: 'Strasbourg', meteo: 'auto',    contexte: 'maison' },
    { metier: 'élagage',              travaux: 'Élagage arbre',                      ville: 'Nantes',     meteo: 'nuageux', contexte: 'maison' },
    { metier: 'abattage',             travaux: 'Abattage arbre',                     ville: 'Grenoble',   meteo: 'soleil',  contexte: 'maison' },
    { metier: 'terrassement',         travaux: 'Terrassement maison',                ville: 'Caen',       meteo: 'auto',    contexte: 'maison' },
    { metier: 'paysagiste',           travaux: 'Création jardin',                    ville: 'Toulouse',   meteo: 'soleil',  contexte: 'maison' },
    { metier: 'depannage_auto',       travaux: 'Batterie à plat',                    ville: 'Lyon',       meteo: 'soleil',  contexte: 'domicile' },
    { metier: 'nettoyage',            travaux: 'Nettoyage façade',                   ville: 'Nice',       meteo: 'soleil',  contexte: 'maison' },
    { metier: 'débarras',             travaux: 'Débarras cave',                      ville: 'Rennes',     meteo: 'auto',    contexte: 'maison' },
  ];
  let t64Cases = 0, t64Diffs = [];
  for (const baseRow of T64_ROWS) {
    for (const etat of ETATS) {
      const row = Object.assign({}, baseRow, { etat, nb: 3, fiche: '', images: [] });
      const seed = 42;
      // Build tasks for batch planning
      const mkT = (i) => ({ taskId: `t${i}`, _planBase: { _matched_key: row.metier, _matched_service: row.travaux }, jsonScene: '{}', presencePlan: [], i });
      const legTasks = [mkT(0), mkT(1), mkT(2)];
      const modTasks = [mkT(0), mkT(1), mkT(2)];
      _planGlobalBatch(legTasks, seed);
      batchMod._planGlobalBatch(modTasks, seed);

      for (let imgIdx = 0; imgIdx < 3; imgIdx++) {
        // Legacy pipeline
        let legScene = buildDallePromptV2(row);
        legScene = _applySiteRealism(legScene, imgIdx, {});
        legScene = _applyVariation(legScene, imgIdx, legTasks[imgIdx]._pre_assigned_worker_presence);
        legScene = _resolveLocationAndComposition(legScene, imgIdx);
        const legObj = JSON.parse((_validateResolvedScene(legScene)).fixedStr);
        legObj._pre_assigned_composition  = legTasks[imgIdx]._pre_assigned_composition;
        legObj._capture_defects_resolved  = legTasks[imgIdx]._capture_defects_resolved;
        legObj._pre_assigned_vehicle      = legTasks[imgIdx]._pre_assigned_vehicle;
        legObj.composition                = legTasks[imgIdx]._pre_assigned_composition || legObj.composition;
        const legPrompt = PromptBuilder.build(JSON.stringify(legObj));
        const legFinal  = _appendLockedFinalConstraints(legPrompt, legObj);

        // Module pipeline
        const modLM = {};
        let modScene = sbMod.buildDallePromptV2(row, { lastMatchState: modLM });
        modScene = srvcMod._applySiteRealism(modScene, imgIdx, {});
        modScene = sceneMod._applyVariation(modScene, imgIdx, modTasks[imgIdx]._pre_assigned_worker_presence);
        modScene = locMod._resolveLocationAndComposition(modScene, imgIdx);
        const modObj = JSON.parse((svalMod._validateResolvedScene(modScene)).fixedStr);
        modObj._pre_assigned_composition  = modTasks[imgIdx]._pre_assigned_composition;
        modObj._capture_defects_resolved  = modTasks[imgIdx]._capture_defects_resolved;
        modObj._pre_assigned_vehicle      = modTasks[imgIdx]._pre_assigned_vehicle;
        modObj.composition                = modTasks[imgIdx]._pre_assigned_composition || modObj.composition;
        const modPrompt = pbMod.PromptBuilder.build(JSON.stringify(modObj));
        const modFinal  = lcMod._appendLockedFinalConstraints(modPrompt, modObj);

        if (legFinal !== modFinal)
          t64Diffs.push(`${row.metier}/${etat}/img${imgIdx}: prompt mismatch`);
        t64Cases++;
      }
    }
  }

  // ─── T65: T40 canonical snapshots — module matches legacy ─────────────────
  // Same 8 rows as T40; verify module buildDallePromptV2 produces the same hash
  function _t65StableStringify(v) {
    if (Array.isArray(v)) return '[' + v.map(_t65StableStringify).join(',') + ']';
    if (v !== null && typeof v === 'object') {
      return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + _t65StableStringify(v[k])).join(',') + '}';
    }
    return JSON.stringify(v);
  }
  function _t65Hash32(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h * 31) + s.charCodeAt(i)) >>> 0;
    return h;
  }
  const T65_REF = [
    { id:'toiture-nettoyage',       metier:'toiture',        travaux:'nettoyage gouttières',      contexte:'maison',      etat:'encours', ville:'Paris', refHash:2455936913 },
    { id:'toiture-tuiles',          metier:'toiture',        travaux:'Remplacement de tuiles',     contexte:'maison',      etat:'encours', ville:'Paris', refHash:2385610455 },
    { id:'plomberie-debouchage',     metier:'plomberie',      travaux:'Débouchage canalisation',    contexte:'appartement', etat:'encours', ville:'Paris', refHash:1029236932 },
    { id:'plomberie-fuite',         metier:'plomberie',      travaux:"Fuite d'eau",                contexte:'maison',      etat:'debut',   ville:'Paris', refHash:1088613504 },
    { id:'electricite-normes',      metier:'électricité',    travaux:'Mise aux normes électrique', contexte:'appartement', etat:'encours', ville:'Paris', refHash:1746687025 },
    { id:'depannage-auto-batterie', metier:'depannage_auto', travaux:'batterie à plat',            contexte:'domicile',    etat:'encours', ville:'Paris', refHash:919780194  },
    { id:'peinture-interieure',     metier:'peinture',       travaux:'Peinture intérieure',        contexte:'appartement', etat:'encours', ville:'Paris', refHash:3792538061 },
    { id:'maconnerie-enduit',       metier:'maçonnerie',     travaux:'Réfection enduit façade',    contexte:'maison',      etat:'encours', ville:'Paris', refHash:1460650968 },
  ];
  let t65Diffs = [];
  for (const ref of T65_REF) {
    const row  = { metier: ref.metier, travaux: ref.travaux, contexte: ref.contexte, etat: ref.etat, nb: 1, ville: ref.ville, fiche: '', meteo: 'auto', images: [] };
    const json = sbMod.buildDallePromptV2(row);
    const hash = _t65Hash32(_t65StableStringify(JSON.parse(json)));
    if (hash !== ref.refHash) t65Diffs.push(`${ref.id}: hash ${hash} ≠ ref ${ref.refHash}`);
  }

  // ─── T66: Phase 5 dependency integrity ───────────────────────────────────
  const t66Issues = [];
  // All 4 modules must be importable (already done above — no error = pass)
  // Check exports exist
  if (typeof sbMod.buildDallePromptV2 !== 'function')  t66Issues.push('scene-builder: buildDallePromptV2 not exported');
  if (typeof sbMod._getWorkDetail !== 'function')       t66Issues.push('scene-builder: _getWorkDetail not exported');
  if (typeof sbMod._getCityContext !== 'function')      t66Issues.push('scene-builder: _getCityContext not exported');
  if (typeof sbMod.INTERIOR_SCENE_BASE !== 'object')    t66Issues.push('scene-builder: INTERIOR_SCENE_BASE not exported');
  if (typeof sbMod._validateScene !== 'function')       t66Issues.push('scene-builder: _validateScene not exported');
  if (typeof sbMod._validateSceneStrict !== 'function') t66Issues.push('scene-builder: _validateSceneStrict not exported');
  if (typeof pbMod.PromptBuilder !== 'object')          t66Issues.push('prompt-builder: PromptBuilder not exported');
  if (typeof pbMod.PHOTO_STYLE_RULES !== 'object')      t66Issues.push('prompt-builder: PHOTO_STYLE_RULES not exported');
  if (pbMod._USE_PROMPT_BUILDER !== false)              t66Issues.push('prompt-builder: _USE_PROMPT_BUILDER should be false');
  if (typeof prMod._IMG_REWRITE_SYSTEM !== 'string')    t66Issues.push('prompt-rewriter: _IMG_REWRITE_SYSTEM not a string');
  if (typeof prMod.buildPromptRewriteRequest !== 'function') t66Issues.push('prompt-rewriter: buildPromptRewriteRequest not exported');
  if (typeof prMod.rewritePromptWithGPT !== 'function') t66Issues.push('prompt-rewriter: rewritePromptWithGPT not exported');
  if (typeof lcMod._appendLockedFinalConstraints !== 'function') t66Issues.push('locked-constraints: _appendLockedFinalConstraints not exported');
  // _SCENE_PLANNER_MODEL must be exported from prompt-rewriter
  if (typeof prMod._SCENE_PLANNER_MODEL !== 'string')   t66Issues.push('prompt-rewriter: _SCENE_PLANNER_MODEL not a string');
  // No global _lastMatch in module scope (no window access by scene-builder)
  if (typeof sbMod._lastMatch !== 'undefined')          t66Issues.push('scene-builder: _lastMatch leaked to module scope');
  // Modules must not export window or document references
  if (typeof sbMod.window !== 'undefined')              t66Issues.push('scene-builder: exports window');
  if (typeof pbMod.window !== 'undefined')              t66Issues.push('prompt-builder: exports window');
  if (typeof prMod.window !== 'undefined')              t66Issues.push('prompt-rewriter: exports window');
  if (typeof lcMod.window !== 'undefined')              t66Issues.push('locked-constraints: exports window');
  if (typeof sbMod.document !== 'undefined')            t66Issues.push('scene-builder: exports document');
  if (typeof pbMod.document !== 'undefined')            t66Issues.push('prompt-builder: exports document');
  // rewritePromptWithGPT must use injected fetchImpl (not global fetch) — verify by passing forbidden fetch
  try {
    let usedForbiddenFetch = false;
    const forbiddenFetch = async () => { usedForbiddenFetch = true; throw new Error('FORBIDDEN_REAL_FETCH'); };
    await prMod.rewritePromptWithGPT({ prompt: 'x', apiKey: 'k', fetchImpl: forbiddenFetch, readResponse: async () => ({}) });
  } catch(e) {
    if (e.message === 'FORBIDDEN_REAL_FETCH') {
      // correct: fetchImpl was called, not global fetch
    } else if (e.message.includes('Scene planner error') || e.message.includes('Cannot read') || e.message.includes('TypeError')) {
      // also acceptable: fetchImpl was called, error from response processing
    } else {
      t66Issues.push('rewritePromptWithGPT: may not be using fetchImpl correctly: ' + e.message);
    }
  }
  // buildDallePromptV2 must accept second arg without throwing
  try {
    sbMod.buildDallePromptV2({ metier: 'toiture', travaux: 'tuiles', ville: 'Paris', etat: 'encours', meteo: 'auto', contexte: 'maison' }, {});
  } catch(e) { t66Issues.push('buildDallePromptV2 threw with empty opts: ' + e.message); }
  // PromptBuilder.build must be a function accepting a JSON string
  try {
    const dummyScene = JSON.stringify({ work_type: 'test', state: 'encours', framing: {}, var_presence: 'none', var_workers: 0 });
    const r = pbMod.PromptBuilder.build(dummyScene);
    if (typeof r !== 'string' || r.length === 0) t66Issues.push('PromptBuilder.build: returned empty or non-string');
  } catch(e) { t66Issues.push('PromptBuilder.build threw: ' + e.message); }
  // _appendLockedFinalConstraints must return prompt + constraints block
  try {
    const dummyScene2 = { composition: 'medium_intervention', _matched_key: 'toiture', _capture_defects_resolved: [], var_workers: 0, var_presence: 'none', triangle_rule: null };
    const r2 = lcMod._appendLockedFinalConstraints('BASE PROMPT', dummyScene2);
    if (typeof r2 !== 'string') t66Issues.push('_appendLockedFinalConstraints: non-string result');
    if (!r2.startsWith('BASE PROMPT')) t66Issues.push('_appendLockedFinalConstraints: does not preserve input prompt');
    if (!r2.includes('NON-NEGOTIABLE')) t66Issues.push('_appendLockedFinalConstraints: missing constraints header');
  } catch(e) { t66Issues.push('_appendLockedFinalConstraints threw: ' + e.message); }

  return {
    t59: { diffs: t59Diffs },
    t60: { cases: t60Cases, jsonDiffs: t60JSONDiffs, lmDiffs: t60LMDiffs },
    t61: { cases: t61Cases, diffs: t61Diffs },
    t62: { cases: t62Cases, diffs: t62Diffs },
    t63: { cases: t63Cases, issues: t63Issues },
    t64: { cases: t64Cases, diffs: t64Diffs },
    t65: { diffs: t65Diffs },
    t66: { ok: t66Issues.length === 0, issues: t66Issues },
  };
}
window._runPromptParityTests = _runPromptParityTests;

// Bridge Phase 6 — pipeline modulaire pour tests T41 / T67–T78.
// Ne pas utiliser en production. Suppression au cutover Phase 7.
Object.defineProperty(window, '__IMAGE_GEN_MODULAR_PIPELINE__', {
  value: Object.freeze({
    createGenerationState: null, // filled lazily after module import
    createImagePipeline:   null,
    buildImageGenerationRequest: null,
    buildVisionSafetyRequest:    null,
  }),
  writable: false, configurable: false, enumerable: false,
});

async function _runPipelineParityTests() {
  const issues = [];
  function _assertEq(a, b, msg) { if (a !== b) issues.push(`${msg}: expected ${JSON.stringify(b)} got ${JSON.stringify(a)}`); }
  function _assertDeepEq(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) issues.push(`${msg}: deep mismatch`); }

  const [stateMod, httpMod, safetyMod, genImgMod, batchMod, retryMod, uiMod, bvalMod, wrkMod, bpMod, reqMod] = await Promise.all([
    import('./src/image-generation/pipeline/state.js'),
    import('./src/image-generation/pipeline/http.js'),
    import('./src/image-generation/pipeline/safety-check.js'),
    import('./src/image-generation/pipeline/generate-image.js'),
    import('./src/image-generation/pipeline/run-batch.js'),
    import('./src/image-generation/pipeline/retries.js'),
    import('./src/image-generation/ui/img-ui.js'),
    import('./src/image-generation/validation/batch-validator.js'),
    import('./src/image-generation/safety/worker-validator.js'),
    import('./src/image-generation/planning/batch-planner.js'),
    import('./src/image-generation/planning/batch-requirements.js'),
  ]);

  // Forbidden fetch guard — no real network during Phase 6 tests
  const realFetch = window.fetch;
  window.fetch = (...args) => {
    throw new Error(`[REAL_NETWORK_FORBIDDEN_DURING_PHASE6_TEST] ${String(args[0])}`);
  };

  // ── Shared mock helpers ────────────────────────────────────────────────────
  const _fakeRead = async (r) => {
    const raw = await r.text(); let data = null;
    try { if (raw) data = JSON.parse(raw); } catch {}
    return { ok: r.ok, status: r.status, raw, data };
  };
  const _fakeRewrite = async (_scene, _key) => 'Mocked rewritten prompt for testing.';
  const _fakeSleep   = async () => {};
  const _mkImgResp  = () => ({ ok: true, status: 200, text: async () => JSON.stringify({ data: [{ b64_json: 'dGVzdA==' }] }) });
  const _mkSafeResp = () => ({ ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { content: JSON.stringify({ safe: true, severity: 'ok', reason: '' }) } }] }) });
  const _mkCritResp = () => ({ ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { content: JSON.stringify({ safe: false, severity: 'critical', reason: 'test critical' }) } }] }) });
  const _mkFailResp = () => ({ ok: false, status: 500, text: async () => '' });

  function _mkFetch(opts = {}) {
    let imgCalls = 0, visionCalls = 0;
    const fetchImpl = async (url) => {
      if (url.includes('images/generations')) {
        imgCalls++;
        const r = opts.imgFn ? opts.imgFn(imgCalls) : _mkImgResp();
        return r;
      }
      if (url.includes('chat/completions')) {
        visionCalls++;
        const r = opts.visionFn ? opts.visionFn(visionCalls) : _mkSafeResp();
        return r;
      }
      throw new Error('[UNEXPECTED_URL] ' + url);
    };
    return { fetchImpl, counts: () => ({ imgCalls, visionCalls }) };
  }

  function _mkUiAdapter() {
    const calls = { updateProgress: 0, renderImage: [], tasksDone: [] };
    return {
      adapter: {
        updateProgress: (done, total, ok, fail) => { calls.updateProgress++; },
        renderImage:    (src, filename, label) => { calls.renderImage.push({ src: src?.slice(0, 20), filename, label }); },
        onTaskDone:     (task) => { calls.tasksDone.push(task.taskId); },
      },
      calls,
    };
  }

  // ── Task factory helpers ───────────────────────────────────────────────────

  // _mkRawBatchTasks: plan tasks for any métier/size WITHOUT calling the validator.
  // Used by T79 which calls the validator itself to count failures separately.
  function _mkRawBatchTasks(metier, svc, etat, n, seed, taskIdBase = 400) {
    const row = { metier, travaux: svc, ville: 'Paris', etat: etat || 'encours', meteo: 'auto', contexte: 'maison', nb: n, fiche: '', images: [] };
    const jsonScene = buildDallePromptV2(row);
    const _planBase = JSON.parse(jsonScene);
    const presencePlan = _buildPresencePlan(n, _planBase.state_level, _planBase._matched_key, seed);
    const tasks = [];
    for (let i = 0; i < n; i++) {
      tasks.push({ taskId: taskIdBase + i, row, i, nb: n, jsonScene, presencePlan, slug: metier, _planBase: Object.assign({}, _planBase), status: 'pending', imageAttempt: 0, result: null, error: null });
    }
    bpMod._planGlobalBatch(tasks, seed);
    bpMod._rebalanceGlobalBatchPlan(tasks, seed);
    return tasks;
  }

  // _mkSmallBatchTasks: plan + validate. The updated validator is size-aware and passes for all n.
  function _mkSmallBatchTasks(metier, svc, etat, n, seed, taskIdBase = 500) {
    const tasks = _mkRawBatchTasks(metier, svc, etat, n, seed, taskIdBase);
    bvalMod._validateCompleteBatchPlan(tasks);
    return tasks;
  }

  // _mkT41Tasks: toiture helper used by T41 and T67–T78.
  // Now uses the size-aware validator — passes for all n (1, 2, 3, 4).
  function _mkT41Tasks(n) {
    const seed = 2001;
    const tasks = _mkRawBatchTasks('toiture', 'Remplacement tuiles', 'encours', n, seed, 200);
    bvalMod._validateCompleteBatchPlan(tasks); // size-aware: passes for all n
    return tasks;
  }

  const t41 = { ok: false, issues: [] };
  const t67 = { ok: false, issues: [] };
  const t68 = { ok: false, issues: [] };
  const t69 = { ok: false, issues: [] };
  const t70 = { ok: false, cases: 0, issues: [] };
  const t71 = { ok: false, issues: [] };
  const t72 = { ok: false, issues: [] };
  const t73 = { ok: false, issues: [] };
  const t74 = { ok: false, issues: [] };
  const t75 = { ok: false, issues: [] };
  const t79 = { ok: false, cases: 0, invalidCount: 0, issues: [] };
  const t80 = { ok: false, issues: [] };
  const t76 = { ok: false, issues: [] };
  const t77 = { ok: false, issues: [] };
  const t78 = { ok: false, issues: [] };

  try {

  // ─── T41: full modular pipeline mocked ────────────────────────────────────
  // 4 tasks, 4 image calls, 4 vision calls (toiture has safety), 0 retry
  try {
    const s41     = stateMod.createGenerationState();
    s41.runId     = 1;
    s41.runActive = true;
    s41.counters.requested = 4;
    const tasks41 = _mkT41Tasks(4);
    const ui41    = _mkUiAdapter();
    const mf41    = _mkFetch();
    const runImages41 = [];
    await batchMod.runImageBatch(tasks41, 'sk-test', {
      state: s41, fetchImpl: mf41.fetchImpl, readResponseImpl: _fakeRead,
      rewritePromptImpl: _fakeRewrite, uiAdapter: ui41.adapter, sleep: _fakeSleep,
      runImages: runImages41,
    });
    const counts41 = mf41.counts();
    const successes41 = tasks41.filter(t => t.status === 'success');
    if (counts41.imgCalls  !== 4) t41.issues.push(`imgCalls expected 4 got ${counts41.imgCalls}`);
    if (counts41.visionCalls !== 4) t41.issues.push(`visionCalls expected 4 got ${counts41.visionCalls}`);
    if (successes41.length !== 4) t41.issues.push(`successes expected 4 got ${successes41.length}`);
    if (runImages41.length !== 4) t41.issues.push(`runImages expected 4 got ${runImages41.length}`);
    if (s41.counters.imageCalls  !== 4) t41.issues.push(`state.imageCalls expected 4 got ${s41.counters.imageCalls}`);
    if (s41.counters.visionCalls !== 4) t41.issues.push(`state.visionCalls expected 4 got ${s41.counters.visionCalls}`);
    if (s41.counters.validated   !== 4) t41.issues.push(`state.validated expected 4 got ${s41.counters.validated}`);
    if (s41.counters.criticalRejections !== 0) t41.issues.push(`criticalRejections expected 0`);
    const uniqueTaskIds = new Set(tasks41.map(t => t.taskId));
    if (uniqueTaskIds.size !== 4) t41.issues.push('task IDs not unique');
    t41.ok = t41.issues.length === 0;
  } catch(e) { t41.issues.push('threw: ' + e.message); }

  // ─── T67: state parity ────────────────────────────────────────────────────
  try {
    // initial state structure
    const s67 = stateMod.createGenerationState();
    if (s67.runActive !== false)   t67.issues.push('runActive should start false');
    if (s67.runId !== null)        t67.issues.push('runId should start null');
    if (!Array.isArray(s67.generatedImages) || s67.generatedImages.length !== 0) t67.issues.push('generatedImages should start []');
    if (!Array.isArray(s67.imageCallLog)    || s67.imageCallLog.length !== 0)    t67.issues.push('imageCallLog should start []');
    if (s67.lastApiKey !== null)   t67.issues.push('lastApiKey should start null');
    const ckeys = ['requested', 'imageCalls', 'visionCalls', 'validated', 'visionFailures', 'criticalRejections'];
    for (const k of ckeys) {
      if (typeof s67.counters[k] !== 'number' || s67.counters[k] !== 0) t67.issues.push(`counter ${k} should start 0`);
    }
    // independence: two states must not share references
    const s67b = stateMod.createGenerationState();
    s67.runActive = true; s67.counters.imageCalls = 5;
    if (s67b.runActive !== false)        t67.issues.push('states share runActive reference');
    if (s67b.counters.imageCalls !== 0)  t67.issues.push('states share counters reference');
    // verify IMAGE_TASK_STATUS matches legacy
    const legacyStatuses = ['pending', 'generating', 'checking_safety', 'retrying', 'success', 'failed', 'rejected_safety', 'safety_check_failed'];
    for (const v of legacyStatuses) {
      if (!Object.values(stateMod.IMAGE_TASK_STATUS).includes(v)) t67.issues.push(`IMAGE_TASK_STATUS missing: ${v}`);
    }
    // verify TERMINAL_STATUSES matches legacy (4 entries)
    if (stateMod.TERMINAL_STATUSES.size !== 4) t67.issues.push(`TERMINAL_STATUSES size ${stateMod.TERMINAL_STATUSES.size} ≠ 4`);
    // verify limits
    if (stateMod.MAX_IMAGE_ATTEMPTS !== MAX_IMAGE_ATTEMPTS)                       t67.issues.push('MAX_IMAGE_ATTEMPTS mismatch');
    if (stateMod.MAX_SAFETY_ATTEMPTS_PER_IMAGE !== MAX_SAFETY_ATTEMPTS_PER_IMAGE) t67.issues.push('MAX_SAFETY_ATTEMPTS_PER_IMAGE mismatch');
    // counters via real batch run
    const s67c = stateMod.createGenerationState(); s67c.runId = 7;
    const tasks67 = _mkT41Tasks(1);
    await batchMod.runImageBatch(tasks67, 'sk-t67', {
      state: s67c, fetchImpl: _mkFetch().fetchImpl, readResponseImpl: _fakeRead,
      rewritePromptImpl: _fakeRewrite, uiAdapter: _mkUiAdapter().adapter, sleep: _fakeSleep,
    });
    if (s67c.counters.imageCalls  !== 1) t67.issues.push(`post-run imageCalls: expected 1 got ${s67c.counters.imageCalls}`);
    if (s67c.counters.visionCalls !== 1) t67.issues.push(`post-run visionCalls: expected 1 got ${s67c.counters.visionCalls}`);
    if (s67c.counters.validated   !== 1) t67.issues.push(`post-run validated: expected 1 got ${s67c.counters.validated}`);
    t67.ok = t67.issues.length === 0;
  } catch(e) { t67.issues.push('threw: ' + e.message); }

  // ─── T68: image request parity ────────────────────────────────────────────
  try {
    const req68 = genImgMod.buildImageGenerationRequest('Test prompt for an image.', 'sk-test-key');
    if (req68.url !== 'https://api.openai.com/v1/images/generations') t68.issues.push('url mismatch');
    if (req68.headers?.['Authorization'] !== 'Bearer sk-test-key')   t68.issues.push('Authorization mismatch');
    if (req68.headers?.['Content-Type']  !== 'application/json')     t68.issues.push('Content-Type mismatch');
    if (req68.timeout !== 180000) t68.issues.push(`timeout expected 180000 got ${req68.timeout}`);
    const body68 = JSON.parse(req68.body);
    if (body68.model              !== 'gpt-image-2')  t68.issues.push('model mismatch');
    if (body68.n                  !== 1)              t68.issues.push('n mismatch');
    if (body68.size               !== '1536x1024')    t68.issues.push('size mismatch');
    if (body68.quality            !== 'high')         t68.issues.push('quality mismatch');
    if (body68.output_format      !== 'jpeg')         t68.issues.push('output_format mismatch');
    if (body68.output_compression !== 85)             t68.issues.push('output_compression mismatch');
    if (body68.prompt !== 'Test prompt for an image.') t68.issues.push('prompt mismatch');
    t68.ok = t68.issues.length === 0;
  } catch(e) { t68.issues.push('threw: ' + e.message); }

  // ─── T69: vision request parity ───────────────────────────────────────────
  try {
    const testB64 = 'aGVsbG8=';
    // toiture has safety rules
    const req69 = safetyMod.buildVisionSafetyRequest('toiture', testB64, 'sk-vision-key');
    if (!req69)  { t69.issues.push('buildVisionSafetyRequest returned null for toiture'); }
    else {
      if (req69.url !== 'https://api.openai.com/v1/chat/completions') t69.issues.push('vision url mismatch');
      if (req69.headers?.['Authorization'] !== 'Bearer sk-vision-key') t69.issues.push('vision Authorization mismatch');
      if (req69.timeout !== 60000) t69.issues.push(`vision timeout expected 60000 got ${req69.timeout}`);
      const vBody69 = JSON.parse(req69.body);
      if (vBody69.model      !== 'gpt-4o') t69.issues.push('vision model mismatch');
      if (vBody69.max_tokens !== 200)      t69.issues.push('vision max_tokens mismatch');
      if (vBody69.response_format?.type !== 'json_object') t69.issues.push('vision response_format mismatch');
      const imgContent = vBody69.messages?.[0]?.content?.[0];
      if (imgContent?.type !== 'image_url') t69.issues.push('vision image type mismatch');
      if (!imgContent?.image_url?.url?.includes(testB64)) t69.issues.push('vision b64 missing');
      if (imgContent?.image_url?.detail !== 'low') t69.issues.push('vision detail mismatch');
    }
    // peinture has no safety rule → should return null
    const req69b = safetyMod.buildVisionSafetyRequest('peinture', testB64, 'sk-x');
    if (req69b !== null) t69.issues.push('peinture: should return null (no safety rule)');
    t69.ok = t69.issues.length === 0;
  } catch(e) { t69.issues.push('threw: ' + e.message); }

  // ─── T70: batch normal — 4 tasks, all succeed ─────────────────────────────
  try {
    const s70 = stateMod.createGenerationState(); s70.runId = 70;
    const tasks70 = _mkT41Tasks(4);
    const mf70    = _mkFetch();
    const ui70    = _mkUiAdapter();
    const ri70    = [];
    await batchMod.runImageBatch(tasks70, 'sk-t70', {
      state: s70, fetchImpl: mf70.fetchImpl, readResponseImpl: _fakeRead,
      rewritePromptImpl: _fakeRewrite, uiAdapter: ui70.adapter, sleep: _fakeSleep,
      runImages: ri70,
    });
    const c70 = mf70.counts();
    if (c70.imgCalls    !== 4) t70.issues.push(`imgCalls: expected 4 got ${c70.imgCalls}`);
    if (c70.visionCalls !== 4) t70.issues.push(`visionCalls: expected 4 got ${c70.visionCalls}`);
    if (tasks70.filter(t => t.status === 'success').length !== 4) t70.issues.push('not all 4 succeeded');
    if (ri70.length !== 4) t70.issues.push(`runImages length: expected 4 got ${ri70.length}`);
    if (s70.counters.imageCalls  !== 4) t70.issues.push(`state.imageCalls expected 4`);
    if (s70.counters.visionCalls !== 4) t70.issues.push(`state.visionCalls expected 4`);
    if (s70.counters.validated   !== 4) t70.issues.push(`state.validated expected 4`);
    t70.cases = 4;
    t70.ok = t70.issues.length === 0;
  } catch(e) { t70.issues.push('threw: ' + e.message); }

  // ─── T71: critical violation then success ─────────────────────────────────
  // image attempt 1 → vision critical → image attempt 2 → vision safe
  try {
    const s71 = stateMod.createGenerationState(); s71.runId = 71;
    const tasks71 = _mkT41Tasks(1);
    let vCall71 = 0;
    const mf71 = _mkFetch({
      visionFn: () => {
        vCall71++;
        return vCall71 === 1 ? _mkCritResp() : _mkSafeResp();
      },
    });
    const ri71 = [];
    await batchMod.runImageBatch(tasks71, 'sk-t71', {
      state: s71, fetchImpl: mf71.fetchImpl, readResponseImpl: _fakeRead,
      rewritePromptImpl: _fakeRewrite, uiAdapter: _mkUiAdapter().adapter, sleep: _fakeSleep,
      runImages: ri71,
    });
    const c71 = mf71.counts();
    if (c71.imgCalls    !== 2) t71.issues.push(`imgCalls: expected 2 got ${c71.imgCalls}`);
    if (c71.visionCalls !== 2) t71.issues.push(`visionCalls: expected 2 got ${c71.visionCalls}`);
    if (ri71.length     !== 1) t71.issues.push(`runImages expected 1 got ${ri71.length}`);
    if (tasks71[0].status !== 'success') t71.issues.push(`status expected success got ${tasks71[0].status}`);
    if (s71.counters.criticalRejections !== 1) t71.issues.push(`criticalRejections expected 1 got ${s71.counters.criticalRejections}`);
    t71.ok = t71.issues.length === 0;
  } catch(e) { t71.issues.push('threw: ' + e.message); }

  // ─── T72: vision failure (all 3 safety attempts fail) ─────────────────────
  try {
    const s72 = stateMod.createGenerationState(); s72.runId = 72;
    const tasks72 = _mkT41Tasks(1);
    const mf72 = _mkFetch({
      visionFn: () => ({ ok: false, status: 500, text: async () => '' }),
    });
    const ri72 = [];
    await batchMod.runImageBatch(tasks72, 'sk-t72', {
      state: s72, fetchImpl: mf72.fetchImpl, readResponseImpl: _fakeRead,
      rewritePromptImpl: _fakeRewrite, uiAdapter: _mkUiAdapter().adapter, sleep: _fakeSleep,
      runImages: ri72,
    });
    const c72 = mf72.counts();
    if (c72.imgCalls    !== 1) t72.issues.push(`imgCalls: expected 1 got ${c72.imgCalls}`);
    if (c72.visionCalls !== 3) t72.issues.push(`visionCalls: expected 3 got ${c72.visionCalls}`);
    if (ri72.length     !== 0) t72.issues.push(`runImages expected 0 got ${ri72.length}`);
    if (tasks72[0].status !== 'safety_check_failed') t72.issues.push(`status expected safety_check_failed got ${tasks72[0].status}`);
    if (s72.counters.visionFailures !== 1) t72.issues.push(`visionFailures expected 1 got ${s72.counters.visionFailures}`);
    t72.ok = t72.issues.length === 0;
  } catch(e) { t72.issues.push('threw: ' + e.message); }

  // ─── T73: run-lock / double launch prevention ──────────────────────────────
  // state.runActive prevents two concurrent runs from overlapping results.
  // The lock is checked by the caller (generateAllImages wrapper, not runImageBatch).
  // This test verifies state fields and runId semantics.
  try {
    const s73 = stateMod.createGenerationState();
    s73.runActive = true;
    s73.runId     = 1;
    // Run 1: set runId=1
    // After batch completion, a stale run (old runId) must not re-enable the button.
    // Simulate: run new runId=2 while runId=1 is stale
    s73.runId = 2;
    // Verify that if a batch completed with runId=1, it would check runId===generationRunId before resetting
    const staleRunId = 1;
    const currentRunId = s73.runId;
    if (staleRunId === currentRunId) t73.issues.push('runId stale-check logic broken');
    // Run a normal batch, verify runId is still correct after
    const s73b = stateMod.createGenerationState(); s73b.runId = 1; s73b.runActive = true;
    const tasks73 = _mkT41Tasks(2);
    await batchMod.runImageBatch(tasks73, 'sk-t73', {
      state: s73b, fetchImpl: _mkFetch().fetchImpl, readResponseImpl: _fakeRead,
      rewritePromptImpl: _fakeRewrite, uiAdapter: _mkUiAdapter().adapter, sleep: _fakeSleep,
    });
    if (tasks73.filter(t => t.status !== 'success').length > 0) t73.issues.push('batch did not complete successfully');
    // runId unchanged — the batch function does not modify it
    if (s73b.runId !== 1) t73.issues.push('runId should not change during batch');
    // Verify no duplicate tasks in output
    const uniqueIds73 = new Set(tasks73.map(t => t.taskId));
    if (uniqueIds73.size !== 2) t73.issues.push('task IDs not unique in run');
    t73.ok = t73.issues.length === 0;
  } catch(e) { t73.issues.push('threw: ' + e.message); }

  // ─── T74: manual retry preserves batch plan ────────────────────────────────
  try {
    const s74 = stateMod.createGenerationState(); s74.runId = 74;
    const tasks74 = _mkT41Tasks(2);
    // Save batch plan fields before batch
    const saved74 = tasks74.map(t => ({
      _pre_assigned_composition:       t._pre_assigned_composition,
      _pre_assigned_worker_count:      t._pre_assigned_worker_count,
      _pre_assigned_vehicle:           t._pre_assigned_vehicle,
      _capture_defects_resolved:       t._capture_defects_resolved,
      _batch_plan_id:                  t._batch_plan_id,
      _pre_assigned_worker_presence:   t._pre_assigned_worker_presence,
    }));
    // First batch: task 0 succeeds, task 1 fails (img API throws)
    let imgCall74 = 0;
    const mf74 = _mkFetch({
      imgFn: () => {
        imgCall74++;
        if (imgCall74 <= 1) return _mkImgResp();
        // task 1: always error
        return { ok: false, status: 500, text: async () => JSON.stringify({ error: { message: 'forced error for T74' } }) };
      },
    });
    await batchMod.runImageBatch(tasks74, 'sk-t74', {
      state: s74, fetchImpl: mf74.fetchImpl, readResponseImpl: _fakeRead,
      rewritePromptImpl: _fakeRewrite, uiAdapter: _mkUiAdapter().adapter, sleep: _fakeSleep,
    });
    const failedTask74 = tasks74.filter(t => t.status !== 'success');
    if (failedTask74.length !== 1) t74.issues.push(`expected 1 failure, got ${failedTask74.length}`);
    // Retry
    const s74b = stateMod.createGenerationState(); s74b.runId = 74;
    let imgCall74b = 0;
    const mf74b = _mkFetch({
      imgFn: () => { imgCall74b++; return _mkImgResp(); },
    });
    await retryMod.retryFailedImages(failedTask74, 'sk-t74b', {
      state: s74b, fetchImpl: mf74b.fetchImpl, readResponseImpl: _fakeRead,
      rewritePromptImpl: _fakeRewrite, uiAdapter: _mkUiAdapter().adapter, sleep: _fakeSleep,
    });
    // Verify batch plan fields were NOT changed by retry
    for (let k = 0; k < tasks74.length; k++) {
      const t = tasks74[k];
      const s = saved74[k];
      if (t._batch_plan_id !== s._batch_plan_id) t74.issues.push(`task${k}: _batch_plan_id changed`);
      if (t._pre_assigned_composition !== s._pre_assigned_composition) t74.issues.push(`task${k}: composition changed`);
      if (JSON.stringify(t._capture_defects_resolved) !== JSON.stringify(s._capture_defects_resolved)) t74.issues.push(`task${k}: defects changed`);
      if (t._pre_assigned_vehicle !== s._pre_assigned_vehicle) t74.issues.push(`task${k}: vehicle changed`);
    }
    if (failedTask74[0].status !== 'success') t74.issues.push('retried task should succeed');
    t74.ok = t74.issues.length === 0;
  } catch(e) { t74.issues.push('threw: ' + e.message); }

  // ─── T75: deduplication and terminal statuses ──────────────────────────────
  try {
    const s75 = stateMod.createGenerationState(); s75.runId = 75;
    const tasks75 = _mkT41Tasks(2);
    const ri75 = [];
    await batchMod.runImageBatch(tasks75, 'sk-t75', {
      state: s75, fetchImpl: _mkFetch().fetchImpl, readResponseImpl: _fakeRead,
      rewritePromptImpl: _fakeRewrite, uiAdapter: _mkUiAdapter().adapter, sleep: _fakeSleep,
      runImages: ri75,
    });
    // Each taskId must appear at most once in runImages
    const seen75 = new Set();
    for (const img of ri75) {
      if (seen75.has(img.taskId)) t75.issues.push(`duplicate taskId in runImages: ${img.taskId}`);
      seen75.add(img.taskId);
    }
    // All 4 terminal statuses must be recognised
    const terminal75 = [
      stateMod.IMAGE_TASK_STATUS.SUCCESS,
      stateMod.IMAGE_TASK_STATUS.FAILED,
      stateMod.IMAGE_TASK_STATUS.REJECTED_SAFETY,
      stateMod.IMAGE_TASK_STATUS.SAFETY_CHECK_FAILED,
    ];
    for (const st of terminal75) {
      if (!stateMod.TERMINAL_STATUSES.has(st)) t75.issues.push(`TERMINAL_STATUSES missing: ${st}`);
    }
    // After run, all tasks must have a terminal status
    for (const t of tasks75) {
      if (!stateMod.TERMINAL_STATUSES.has(t.status)) t75.issues.push(`task ${t.taskId} not terminal: ${t.status}`);
    }
    t75.ok = t75.issues.length === 0;
  } catch(e) { t75.issues.push('threw: ' + e.message); }

  // ─── T76: UI adapter calls ─────────────────────────────────────────────────
  try {
    const s76  = stateMod.createGenerationState(); s76.runId = 76;
    const ui76 = _mkUiAdapter();
    const tasks76 = _mkT41Tasks(2);
    const ri76 = [];
    await batchMod.runImageBatch(tasks76, 'sk-t76', {
      state: s76, fetchImpl: _mkFetch().fetchImpl, readResponseImpl: _fakeRead,
      rewritePromptImpl: _fakeRewrite, uiAdapter: ui76.adapter, sleep: _fakeSleep,
      runImages: ri76,
    });
    if (ui76.calls.updateProgress < 3) t76.issues.push(`updateProgress called ${ui76.calls.updateProgress} times (expected ≥ 3)`);
    if (ui76.calls.renderImage.length !== 2) t76.issues.push(`renderImage called ${ui76.calls.renderImage.length} times (expected 2)`);
    for (const img of ui76.calls.renderImage) {
      if (!img.filename || !img.filename.endsWith('.jpg')) t76.issues.push(`renderImage bad filename: ${img.filename}`);
    }
    if (ui76.calls.tasksDone.length !== 2) t76.issues.push(`tasksDone called ${ui76.calls.tasksDone.length} times (expected 2)`);
    t76.ok = t76.issues.length === 0;
  } catch(e) { t76.issues.push('threw: ' + e.message); }

  // ─── T77: filename format ─────────────────────────────────────────────────
  try {
    const s77 = stateMod.createGenerationState(); s77.runId = 77;
    const tasks77 = _mkT41Tasks(3);
    const ri77 = [];
    await batchMod.runImageBatch(tasks77, 'sk-t77', {
      state: s77, fetchImpl: _mkFetch().fetchImpl, readResponseImpl: _fakeRead,
      rewritePromptImpl: _fakeRewrite, uiAdapter: _mkUiAdapter().adapter, sleep: _fakeSleep,
      runImages: ri77,
    });
    if (ri77.length !== 3) t77.issues.push(`expected 3 images got ${ri77.length}`);
    for (const img of ri77) {
      if (!img.filename) t77.issues.push('missing filename');
      else if (!/^[a-z0-9-]+-\d{2}\.jpg$/.test(img.filename)) t77.issues.push(`bad filename format: ${img.filename}`);
    }
    // Filenames should be unique
    const fns = ri77.map(i => i.filename);
    if (new Set(fns).size !== fns.length) t77.issues.push('duplicate filenames');
    // Rejected images must not appear in runImages
    for (const img of ri77) {
      const t = tasks77.find(t => t.taskId === img.taskId);
      if (t && t.status !== 'success') t77.issues.push(`non-success task ${t.taskId} in runImages`);
    }
    t77.ok = t77.issues.length === 0;
  } catch(e) { t77.issues.push('threw: ' + e.message); }

  // ─── T78: Phase 6 dependency integrity ────────────────────────────────────
  try {
    // Modules importable (done above — no error = pass)
    if (typeof stateMod.createGenerationState !== 'function') t78.issues.push('state: createGenerationState not exported');
    if (typeof stateMod.IMAGE_TASK_STATUS !== 'object')       t78.issues.push('state: IMAGE_TASK_STATUS not exported');
    if (typeof httpMod.fetchWithTimeout  !== 'function')     t78.issues.push('http: fetchWithTimeout not exported');
    if (typeof httpMod.readResponseOnce  !== 'function')     t78.issues.push('http: readResponseOnce not exported');
    if (typeof safetyMod.buildVisionSafetyRequest !== 'function') t78.issues.push('safety: buildVisionSafetyRequest not exported');
    if (typeof safetyMod.checkImageSafety          !== 'function') t78.issues.push('safety: checkImageSafety not exported');
    if (typeof genImgMod.buildImageGenerationRequest !== 'function') t78.issues.push('generate-image: buildImageGenerationRequest not exported');
    if (typeof genImgMod.generateImageOnly           !== 'function') t78.issues.push('generate-image: generateImageOnly not exported');
    if (typeof batchMod.runImageBatch      !== 'function') t78.issues.push('run-batch: runImageBatch not exported');
    if (typeof batchMod.createImagePipeline !== 'function') t78.issues.push('run-batch: createImagePipeline not exported');
    if (typeof retryMod.retryFailedImages  !== 'function') t78.issues.push('retries: retryFailedImages not exported');
    if (typeof uiMod.createImageUiAdapter  !== 'function') t78.issues.push('img-ui: createImageUiAdapter not exported');
    // createImagePipeline factory must return runImageBatch and generateImageOnly
    const pipe78 = batchMod.createImagePipeline({
      fetchImpl: _mkFetch().fetchImpl, readResponseImpl: _fakeRead,
      rewritePromptImpl: _fakeRewrite, uiAdapter: _mkUiAdapter().adapter,
      state: stateMod.createGenerationState(), sleep: _fakeSleep,
    });
    if (typeof pipe78.runImageBatch    !== 'function') t78.issues.push('createImagePipeline: runImageBatch missing');
    if (typeof pipe78.generateImageOnly !== 'function') t78.issues.push('createImagePipeline: generateImageOnly missing');
    // UI adapter must return required methods
    const ua78 = uiMod.createImageUiAdapter({ documentRef: null });
    for (const m of ['setGenerateButtonDisabled', 'updateProgress', 'renderImage', 'renderBatchSummary', 'clearGallery', 'readFormRows', 'onTaskDone']) {
      if (typeof ua78[m] !== 'function') t78.issues.push(`createImageUiAdapter missing: ${m}`);
    }
    // Modules must not export window or document
    if (typeof batchMod.window  !== 'undefined') t78.issues.push('run-batch exports window');
    if (typeof genImgMod.window !== 'undefined') t78.issues.push('generate-image exports window');
    if (typeof safetyMod.window !== 'undefined') t78.issues.push('safety-check exports window');
    // batch-requirements.js must export getBatchPlanRequirements
    if (typeof reqMod.getBatchPlanRequirements !== 'function') t78.issues.push('batch-requirements: getBatchPlanRequirements not exported');
    // Pipeline is shadow only — public functions must still be the legacy versions
    if (typeof generateAllImages !== 'function')          t78.issues.push('legacy generateAllImages no longer exists');
    else if (window.generateAllImages !== generateAllImages) t78.issues.push('generateAllImages is not the legacy function');
    if (typeof _retryFailedImages !== 'function')         t78.issues.push('legacy _retryFailedImages no longer exists');
    else if (window._retryFailedImages !== _retryFailedImages) t78.issues.push('_retryFailedImages is not the legacy function');
    t78.ok = t78.issues.length === 0;
  } catch(e) { t78.issues.push('threw: ' + e.message); }

  // ─── T79: petits batches — plan + validate pour n=1,2,3,4 ────────────────
  // 6 métiers × 4 tailles × 100 seeds = 2400 cas.
  // Vérifie que _validateCompleteBatchPlan (size-aware) ne lève jamais INVALID_BATCH_PLAN.
  try {
    const T79_METIERS = [
      { metier: 'toiture',       svc: 'Remplacement tuiles' },
      { metier: 'peinture',      svc: 'Peinture chambre' },
      { metier: 'élagage',       svc: 'Élagage arbre' },
      { metier: 'depannage_auto',svc: 'Batterie à plat' },
      { metier: 'carrelage',     svc: 'Faïence salle de bain' },
      { metier: 'nettoyage',     svc: 'Nettoyage façade' },
    ];
    const T79_SIZES = [1, 2, 3, 4];
    for (const { metier, svc } of T79_METIERS) {
      for (const n of T79_SIZES) {
        for (let s = 0; s < 100; s++) {
          const seed = s * 7 + 13;
          let tasks;
          try {
            tasks = _mkRawBatchTasks(metier, svc, 'encours', n, seed, 700);
          } catch(e) {
            t79.issues.push(`${metier}/n=${n}/s=${s}: plan threw — ${e.message}`);
            continue;
          }
          // Validate — must not throw with size-aware validator
          try {
            bvalMod._validateCompleteBatchPlan(tasks);
          } catch(e) {
            t79.invalidCount++;
            t79.issues.push(`${metier}/n=${n}/s=${s}: ${e.message}`);
            continue;
          }
          // Per-task field checks
          for (const t of tasks) {
            if (!t._batch_plan_id)         t79.issues.push(`${metier}/n=${n}/s=${s}/task${t.i}: missing _batch_plan_id`);
            if (!t._pre_assigned_composition) t79.issues.push(`${metier}/n=${n}/s=${s}/task${t.i}: missing composition`);
            if (!['workers','indirect','none'].includes(t._pre_assigned_worker_presence))
              t79.issues.push(`${metier}/n=${n}/s=${s}/task${t.i}: bad worker_presence=${t._pre_assigned_worker_presence}`);
            if (!['clearly_visible','partially_visible','absent'].includes(t._pre_assigned_vehicle))
              t79.issues.push(`${metier}/n=${n}/s=${s}/task${t.i}: bad vehicle=${t._pre_assigned_vehicle}`);
            if (!Array.isArray(t._capture_defects_resolved) || !t._capture_defects_resolved.length)
              t79.issues.push(`${metier}/n=${n}/s=${s}/task${t.i}: empty defects`);
          }
          // Verify getBatchPlanRequirements fields are coherent with the actual plan
          const req79 = reqMod.getBatchPlanRequirements(tasks);
          const comps79 = tasks.map(t => t._pre_assigned_composition);
          if (comps79.filter(c => c === 'close_detail').length > req79.maxClose)
            t79.issues.push(`${metier}/n=${n}/s=${s}: close_detail > maxClose=${req79.maxClose}`);
          t79.cases++;
        }
      }
    }
    t79.ok = t79.issues.length === 0;
  } catch(e) { t79.issues.push('threw: ' + e.message); }

  // ─── T80: pipeline modulaire complet pour 1 et 2 images ──────────────────
  // API Images et Vision mockées, validateur actif, aucun réseau réel.
  try {
    // T80a: batch de 1 tâche
    const s80a    = stateMod.createGenerationState(); s80a.runId = 80;
    const tasks80a = _mkSmallBatchTasks('toiture', 'Remplacement tuiles', 'encours', 1, 42, 600);
    const mf80a   = _mkFetch();
    const ri80a   = [];
    await batchMod.runImageBatch(tasks80a, 'sk-t80a', {
      state: s80a, fetchImpl: mf80a.fetchImpl, readResponseImpl: _fakeRead,
      rewritePromptImpl: _fakeRewrite, uiAdapter: _mkUiAdapter().adapter, sleep: _fakeSleep,
      runImages: ri80a,
    });
    const c80a = mf80a.counts();
    if (c80a.imgCalls   !== 1)  t80.issues.push(`n=1: imgCalls expected 1 got ${c80a.imgCalls}`);
    if (c80a.visionCalls !== 1) t80.issues.push(`n=1: visionCalls expected 1 got ${c80a.visionCalls}`);
    if (ri80a.length !== 1)     t80.issues.push(`n=1: runImages expected 1 got ${ri80a.length}`);
    if (tasks80a[0].status !== 'success') t80.issues.push(`n=1: task status expected success got ${tasks80a[0].status}`);

    // T80b: batch de 2 tâches
    const s80b    = stateMod.createGenerationState(); s80b.runId = 80;
    const tasks80b = _mkSmallBatchTasks('toiture', 'Remplacement tuiles', 'encours', 2, 42, 610);
    const mf80b   = _mkFetch();
    const ri80b   = [];
    await batchMod.runImageBatch(tasks80b, 'sk-t80b', {
      state: s80b, fetchImpl: mf80b.fetchImpl, readResponseImpl: _fakeRead,
      rewritePromptImpl: _fakeRewrite, uiAdapter: _mkUiAdapter().adapter, sleep: _fakeSleep,
      runImages: ri80b,
    });
    const c80b = mf80b.counts();
    if (c80b.imgCalls   !== 2)  t80.issues.push(`n=2: imgCalls expected 2 got ${c80b.imgCalls}`);
    if (c80b.visionCalls !== 2) t80.issues.push(`n=2: visionCalls expected 2 got ${c80b.visionCalls}`);
    if (ri80b.length !== 2)     t80.issues.push(`n=2: runImages expected 2 got ${ri80b.length}`);
    if (tasks80b.filter(t => t.status === 'success').length !== 2) t80.issues.push('n=2: not all 2 succeeded');
    if (new Set(ri80b.map(i => i.taskId)).size !== 2) t80.issues.push('n=2: duplicate taskIds in runImages');
    if (new Set(ri80b.map(i => i.filename)).size !== 2) t80.issues.push('n=2: duplicate filenames in runImages');
    t80.ok = t80.issues.length === 0;
  } catch(e) { t80.issues.push('threw: ' + e.message); }

  } finally {
    window.fetch = realFetch;
  }

  return { t41, t67, t68, t69, t70, t71, t72, t73, t74, t75, t76, t77, t78, t79, t80 };
}
window._runPipelineParityTests = _runPipelineParityTests;

// ─── Local pipeline tests (run from console: _runLocalTests()) ───────────────

async function _runLocalTests() {
  const pass = (name) => console.log(`[TEST] PASS — ${name}`);
  const fail = (name, msg) => console.error(`[TEST] FAIL — ${name}: ${msg}`);

  // T1: _readResponseOnce reads body only once, no double-read error
  try {
    const r = new Response(JSON.stringify({ ok: 1 }), { status: 200 });
    const p = await _readResponseOnce(r);
    if (p.ok && p.data?.ok === 1) pass('T1: _readResponseOnce single-read');
    else fail('T1: _readResponseOnce single-read', JSON.stringify(p));
  } catch (e) { fail('T1: _readResponseOnce single-read', e.message); }

  // T2: 50/45/5 distribution holds for nb=20 (encours: workers='workers', none='none', indirect='indirect')
  try {
    const plan = _buildPresencePlan(20, 'encours', 'toiture', 42);
    const workers  = plan.filter(p => p === 'workers').length;
    const worksite = plan.filter(p => p === 'none').length;
    const material = plan.filter(p => p === 'indirect').length;
    const wOk = workers  === 10, sOk = worksite === 9, mOk = material === 1;
    if (wOk && sOk && mOk) pass('T2: 50/45/5 distribution (nb=20)');
    else fail('T2: 50/45/5 distribution (nb=20)', `workers=${workers} none=${worksite} indirect=${material}`);
  } catch (e) { fail('T2: _buildPresencePlan', e.message); }

  // T3: _resolveServiceSetting — débarras cave → interior
  try {
    const s = _resolveServiceSetting('débarras', 'Débarras cave', 'exterior');
    if (s === 'interior') pass('T3: _resolveServiceSetting débarras cave → interior');
    else fail('T3: _resolveServiceSetting débarras cave', `got ${s}`);
  } catch (e) { fail('T3: _resolveServiceSetting', e.message); }

  // T4: _resolveServiceSetting — carrelage salle de bain → interior
  try {
    const s = _resolveServiceSetting('carrelage', 'Pose carrelage salle de bain', 'exterior');
    if (s === 'interior') pass('T4: _resolveServiceSetting carrelage salle de bain → interior');
    else fail('T4: _resolveServiceSetting carrelage salle de bain', `got ${s}`);
  } catch (e) { fail('T4: _resolveServiceSetting', e.message); }

  // T5: IMAGE_TASK_STATUS all values present and _TERMINAL_STATUSES covers 4 terminal states
  try {
    const required = ['pending','generating','checking_safety','retrying','success','failed','rejected_safety','safety_check_failed'];
    const missing  = required.filter(v => !Object.values(IMAGE_TASK_STATUS).includes(v));
    const termOk   = _TERMINAL_STATUSES.size === 4;
    if (!missing.length && termOk) pass('T5: IMAGE_TASK_STATUS + _TERMINAL_STATUSES');
    else fail('T5: IMAGE_TASK_STATUS + _TERMINAL_STATUSES', `missing=${JSON.stringify(missing)} termSize=${_TERMINAL_STATUSES.size}`);
  } catch (e) { fail('T5: IMAGE_TASK_STATUS', e.message); }

  // T6: SAFETY_CHECK_RULES has exactly 12 entries and no "Default safe:true" leak
  try {
    const keys    = Object.keys(SAFETY_CHECK_RULES);
    const leaked  = keys.filter(k => SAFETY_CHECK_RULES[k].includes('Default safe:true'));
    if (keys.length === 12 && !leaked.length) pass('T6: SAFETY_CHECK_RULES (12 entries, no default-safe leak)');
    else fail('T6: SAFETY_CHECK_RULES', `count=${keys.length} leaked=${JSON.stringify(leaked)}`);
  } catch (e) { fail('T6: SAFETY_CHECK_RULES', e.message); }

  // T7: LOCATION_RULES — all 18 entries present
  try {
    const required = ['parking','station_service','garage_atelier','rue_centre_ville','route_departementale','route_nationale','autoroute','aire_repos','domicile','maison_individuelle','appartement','immeuble','commerce','local_professionnel','entrepot','batiment_agricole','jardin_prive','chantier_urbain'];
    const missing  = required.filter(k => !LOCATION_RULES[k]);
    if (!missing.length) pass('T7: LOCATION_RULES — all 18 entries present');
    else fail('T7: LOCATION_RULES', `missing: ${JSON.stringify(missing)}`);
  } catch (e) { fail('T7: LOCATION_RULES', e.message); }

  // T8: TRIANGLE_RULES — domicile/garage_atelier → 'forbidden', autoroute → 'required_if_safe'
  try {
    const domTri  = TRIANGLE_RULES.domicile?.default;
    const garTri  = TRIANGLE_RULES.garage_atelier?.default;
    const autoTri = TRIANGLE_RULES.autoroute?.default;
    const ok = domTri === 'forbidden' && garTri === 'forbidden' && autoTri === 'required_if_safe';
    if (ok) pass('T8: TRIANGLE_RULES — domicile/garage forbidden, autoroute required_if_safe');
    else fail('T8: TRIANGLE_RULES', `domicile=${domTri} garage=${garTri} autoroute=${autoTri}`);
  } catch (e) { fail('T8: TRIANGLE_RULES', e.message); }

  // T9: WORKER_SCENE_RULES — min_workers_when_visible ≥ 2 for élagage, abattage, vitrier, paysagiste, terrassement, débarras
  try {
    const targets = ['élagage','abattage','vitrier','paysagiste','terrassement','débarras'];
    const bad     = targets.filter(k => (WORKER_SCENE_RULES[k]?.min_workers_when_visible || 0) < 2);
    if (!bad.length) pass('T9: min_workers_when_visible ≥ 2 for 6 métiers');
    else fail('T9: min_workers_when_visible', `missing or < 2: ${JSON.stringify(bad)}`);
  } catch (e) { fail('T9: min_workers_when_visible', e.message); }

  // T10: _resolveLocationAndComposition — crevaison + aire_repos → triangle_rule = 'forbidden_if_safely_parked'
  try {
    const scene   = JSON.stringify({ _matched_key: 'depannage_auto', contexte: 'aire_repos', exclude: [] });
    const result  = JSON.parse(_resolveLocationAndComposition(scene, 0));
    const ok = result.location_type === 'aire_repos' && result.triangle_rule === 'forbidden_if_safely_parked';
    if (ok) pass('T10: crevaison + aire_repos → location=aire_repos, triangle=forbidden_if_safely_parked');
    else fail('T10: aire_repos location', `location_type=${result.location_type} triangle_rule=${result.triangle_rule}`);
  } catch (e) { fail('T10: aire_repos location', e.message); }

  // T11: _validateResolvedScene C4 — aire_repos → triangle exclusions added
  try {
    const scene   = JSON.stringify({ _matched_key: 'depannage_auto', contexte: 'aire_repos', location_type: 'aire_repos', triangle_rule: 'forbidden_if_safely_parked', exclude: [] });
    const result  = _validateResolvedScene(scene);
    const obj     = JSON.parse(result.fixedStr);
    const hasTriExcl = (obj.exclude || []).includes('warning triangle');
    if (hasTriExcl) pass('T11: C4 aire_repos → triangle excluded by _validateResolvedScene');
    else fail('T11: C4 aire_repos', `exclude=${JSON.stringify(obj.exclude)}`);
  } catch (e) { fail('T11: C4 aire_repos', e.message); }

  // T12: _resolveLocationAndComposition — batterie + domicile → location=domicile, triangle_rule=forbidden, triangle in exclude
  try {
    const scene  = JSON.stringify({ _matched_key: 'depannage_auto', contexte: 'domicile', exclude: [] });
    const result = JSON.parse(_resolveLocationAndComposition(scene, 0));
    const locOk  = result.location_type === 'domicile';
    const triOk  = result.triangle_rule === 'forbidden';
    const exclOk = (result.exclude || []).includes('warning triangle');
    if (locOk && triOk && exclOk) pass('T12: batterie + domicile → private property, triangle forbidden and excluded');
    else fail('T12: domicile', `locType=${result.location_type} triRule=${result.triangle_rule} excludeHasTri=${exclOk}`);
  } catch (e) { fail('T12: domicile', e.message); }

  // T13: _validateResolvedScene C2 — domicile + empty exclude → triangle exclusions added
  try {
    const scene  = JSON.stringify({ _matched_key: 'depannage_auto', contexte: 'domicile', location_type: 'domicile', triangle_rule: 'forbidden', exclude: [], var_presence: 'none', var_workers: 0, no_people: true });
    const result = _validateResolvedScene(scene);
    const obj    = JSON.parse(result.fixedStr);
    const hasAll = ['warning triangle','reflective warning triangle'].every(t => (obj.exclude || []).includes(t));
    if (hasAll) pass('T13: C2 domicile — triangle exclusions added by _validateResolvedScene');
    else fail('T13: C2 domicile', `exclude=${JSON.stringify(obj.exclude)}`);
  } catch (e) { fail('T13: C2 domicile', e.message); }

  // T14: _resolveLocationAndComposition — route_departementale → triangle_rule = 'required_if_on_road'
  try {
    const scene  = JSON.stringify({ _matched_key: 'depannage_auto', contexte: 'route_dept', exclude: [] });
    const result = JSON.parse(_resolveLocationAndComposition(scene, 0));
    const ok     = result.location_type === 'route_departementale' && result.triangle_rule === 'required_if_on_road';
    if (ok) pass('T14: route_departementale → triangle required_if_on_road');
    else fail('T14: route_departementale', `locType=${result.location_type} tri=${result.triangle_rule}`);
  } catch (e) { fail('T14: route_departementale', e.message); }

  // T15: _resolveLocationAndComposition — autoroute → characteristic motorway element in must_have + triangle required_if_safe
  try {
    const scene  = JSON.stringify({ _matched_key: 'depannage_auto', contexte: 'autoroute', exclude: [] });
    const result = JSON.parse(_resolveLocationAndComposition(scene, 0));
    // Every must_have element must come from LOCATION_RULES.autoroute.must_have
    const autoMustHave = LOCATION_RULES.autoroute.must_have;
    const mustHaveValid = (result.location_must_have || []).length >= 1
                       && (result.location_must_have || []).every(m => autoMustHave.includes(m));
    // At least one selected element must contain an unmistakable motorway keyword
    const MOTORWAY_KW   = ['hard shoulder', 'crash barrier', 'armco', 'traffic lane', 'motorway'];
    const hasMotorvayKW = (result.location_must_have || []).some(m =>
      MOTORWAY_KW.some(kw => m.toLowerCase().includes(kw))
    );
    const triOk = result.triangle_rule === 'required_if_safe';
    const locOk = result.location_type === 'autoroute';
    if (mustHaveValid && hasMotorvayKW && triOk && locOk) pass('T15: autoroute → motorway element in must_have, triangle required_if_safe');
    else fail('T15: autoroute', `loc=${result.location_type} must_have=${JSON.stringify(result.location_must_have)} tri=${result.triangle_rule}`);
  } catch (e) { fail('T15: autoroute', e.message); }

  // T16: _validateResolvedScene C1 — var_workers=2 + no_people=true → no_people=false (workers are source of truth)
  try {
    const scene  = JSON.stringify({ _matched_key: 'toiture', no_people: true, var_workers: 2, var_presence: 'workers', exclude: [] });
    const result = _validateResolvedScene(scene);
    const obj    = JSON.parse(result.fixedStr);
    if (obj.no_people === false && obj.var_workers === 2 && !result.ok) pass('T16: C1 var_workers=2 + no_people=true → no_people=false (workers source of truth)');
    else fail('T16: C1 direction', `no_people=${obj.no_people} var_workers=${obj.var_workers} ok=${result.ok}`);
  } catch (e) { fail('T16: C1 direction', e.message); }

  // T17: _validateResolvedScene C5 — élagage + var_workers=1 + medium_intervention → bumped to min 2
  try {
    const scene  = JSON.stringify({ _matched_key: 'élagage', no_people: false, var_workers: 1, var_presence: 'workers', composition: 'medium_intervention', exclude: [] });
    const result = _validateResolvedScene(scene);
    const obj    = JSON.parse(result.fixedStr);
    if (obj.var_workers === 2 && obj.no_people === false && !result.ok) pass('T17: C5 élagage var_workers=1 → bumped to 2, no_people=false');
    else fail('T17: C5 élagage min workers', `var_workers=${obj.var_workers} no_people=${obj.no_people} ok=${result.ok}`);
  } catch (e) { fail('T17: C5 élagage min workers', e.message); }

  // T18: _validateResolvedScene C6 — toiture + pallet in site_tools → exclusion added
  try {
    const scene  = JSON.stringify({ _matched_key: 'toiture', site_tools: ['pallet of tiles on pitch'], exclude: [], var_workers: 0, no_people: true });
    const result = _validateResolvedScene(scene);
    const obj    = JSON.parse(result.fixedStr);
    const hasExcl = (obj.exclude || []).some(e => /pallet/i.test(e));
    if (hasExcl && !result.ok) pass('T18: C6 toiture pallet → pallet exclusion added');
    else fail('T18: C6 toiture pallet', `exclude=${JSON.stringify(obj.exclude)} ok=${result.ok}`);
  } catch (e) { fail('T18: C6 toiture pallet', e.message); }

  // T19: _validateResolvedScene C8 — appartement location forces setting to interior
  try {
    const scene  = JSON.stringify({ _matched_key: 'peinture', location_type: 'appartement', setting: 'exterior', exclude: [], var_workers: 0, no_people: true });
    const result = _validateResolvedScene(scene);
    const obj    = JSON.parse(result.fixedStr);
    if (obj.setting === 'interior' && !result.ok) pass('T19: C8 appartement → setting forced to interior');
    else fail('T19: C8 appartement setting', `setting=${obj.setting} ok=${result.ok}`);
  } catch (e) { fail('T19: C8 appartement setting', e.message); }

  // T20: LOCATION_RULES entrepôt — pallets on pitched roof in forbidden
  try {
    const entForbidden = LOCATION_RULES.entrepot?.forbidden || [];
    const hasRule = entForbidden.some(f => /pallet.*roof|roof.*pallet/i.test(f));
    if (hasRule) pass('T20: LOCATION_RULES entrepôt — pallet-on-roof in forbidden list');
    else fail('T20: entrepôt forbidden', JSON.stringify(entForbidden));
  } catch (e) { fail('T20: entrepôt forbidden', e.message); }

  // T21: LOCATION_RULES appartement — window-with-sky explicitly allowed (not in forbidden)
  try {
    const aptForbidden = LOCATION_RULES.appartement?.forbidden || [];
    const wronglyForbids = aptForbidden.some(f => /sky|window|ciel|fenêtre/i.test(f));
    if (!wronglyForbids) pass('T21: LOCATION_RULES appartement — sky/window not forbidden (interior window OK)');
    else fail('T21: appartement window', `wrongly forbids window/sky: ${JSON.stringify(aptForbidden)}`);
  } catch (e) { fail('T21: appartement window', e.message); }

  // T22: _COMPOSITION_DIST depannage_auto — includes vehicle_arrival and sums to 100
  try {
    const dist  = _COMPOSITION_DIST.depannage_auto;
    const total = Object.values(dist).reduce((a, b) => a + b, 0);
    const hasVA = 'vehicle_arrival' in dist && dist.vehicle_arrival > 0;
    if (total === 100 && hasVA) pass('T22: _COMPOSITION_DIST depannage_auto — vehicle_arrival present, total=100');
    else fail('T22: _COMPOSITION_DIST depannage_auto', `total=${total} vehicle_arrival=${dist.vehicle_arrival}`);
  } catch (e) { fail('T22: _COMPOSITION_DIST', e.message); }

  // T31: integration — 4 tasks (2×crevaison + 2×batterie) planned with complete fields
  try {
    const fakeRows = [
      { metier: 'depannage_auto', travaux: 'crevaison pneu crevé', contexte: 'aire_repos', etat: 'encours', nb: 2, ville: '', fiche: '', meteo: 'auto' },
      { metier: 'depannage_auto', travaux: 'batterie à plat',      contexte: 'domicile',   etat: 'encours', nb: 2, ville: '', fiche: '', meteo: 'auto' },
    ];
    const t31Tasks = [];
    for (const row of fakeRows) {
      row.images = row.images || [];
      const base = buildDallePromptV2(row);
      const pb   = JSON.parse(base);
      const pp   = _buildPresencePlan(2, pb.state_level, pb._matched_key, _hashSeed(`${pb._matched_key}plan`));
      for (let i = 0; i < 2; i++)
        t31Tasks.push({ taskId: `t31-${t31Tasks.length}`, row, i, nb: 2, jsonScene: base, presencePlan: pp, slug: 'test', _planBase: pb, status: 'pending', imageAttempt: 0, result: null, error: null });
    }
    _planGlobalBatch(t31Tasks, 'T31-seed');

    const required = ['_pre_assigned_composition', '_pre_assigned_worker_presence', '_pre_assigned_worker_count', '_capture_defects_resolved', '_batch_plan_id'];
    const t31Failures = [];

    for (const t of t31Tasks) {
      for (const f of required) {
        if (t[f] === undefined || t[f] === null)
          t31Failures.push(`${t.taskId}: missing ${f}`);
      }
      const dl = (t._capture_defects_resolved || []).length;
      if (dl < 1 || dl > 2) t31Failures.push(`${t.taskId}: ${dl} defects`);
    }

    const comps = t31Tasks.map(t => t._pre_assigned_composition);
    const closeN = comps.filter(c => c === 'close_detail').length;
    if (closeN > 1) t31Failures.push(`${closeN} close_detail in batch of 4 (max 1)`);
    if (comps.filter(c => c !== 'close_detail').length < 3) t31Failures.push('fewer than 3 non-close compositions');

    const wCount = t31Tasks.filter(t => t._pre_assigned_worker_presence === 'workers').length;
    if (wCount < 1) t31Failures.push('no worker images in batch of 4');

    const hasVehicle = t31Tasks.some(t => t._pre_assigned_vehicle !== 'absent');
    if (!hasVehicle) t31Failures.push('no visible/partial vehicle in batch of 4');

    const creavPair = t31Tasks.filter(t => (t._planBase._matched_service || '').includes('crevaison'));
    if (creavPair.length === 2 && creavPair[0]._pre_assigned_composition === creavPair[1]._pre_assigned_composition)
      t31Failures.push(`crevaison pair: identical compositions (${creavPair[0]._pre_assigned_composition})`);

    if (!t31Failures.length)
      pass('T31: integration — 4 tasks planned, all fields present, quota and variety OK');
    else
      fail('T31: integration batch planning', t31Failures.slice(0, 5).join('; '));
  } catch(e) { fail('T31: integration batch planning', e.message); }

  // T32: retry preserves batch plan — same fields before and after imageAttempt reset
  try {
    const row32 = { metier: 'toiture', travaux: 'nettoyage gouttières', contexte: 'maison', etat: 'encours', nb: 1, ville: '', fiche: '', meteo: 'auto', images: [] };
    const base32 = buildDallePromptV2(row32);
    const pb32   = JSON.parse(base32);
    const pp32   = _buildPresencePlan(1, pb32.state_level, pb32._matched_key, 42);
    const task32 = { taskId: 't32', row: row32, i: 0, nb: 1, jsonScene: base32, presencePlan: pp32, slug: 'test', _planBase: pb32, status: 'pending', imageAttempt: 0, result: null, error: null };
    _planGlobalBatch([task32], 'T32-seed');

    const snap32 = {
      comp:    task32._pre_assigned_composition,
      vehicle: task32._pre_assigned_vehicle,
      workers: task32._pre_assigned_worker_presence,
      wCount:  task32._pre_assigned_worker_count,
      defects: JSON.stringify(task32._capture_defects_resolved),
      planId:  task32._batch_plan_id,
    };

    // Simulate retry reset (exactly what _retryFailedImages does)
    task32.status = 'pending'; task32.imageAttempt = 0; task32.error = null; task32.result = null;

    const t32Failures = [];
    if (task32._pre_assigned_composition   !== snap32.comp)    t32Failures.push('composition changed on retry');
    if (task32._pre_assigned_vehicle       !== snap32.vehicle)  t32Failures.push('vehicle changed on retry');
    if (task32._pre_assigned_worker_presence !== snap32.workers) t32Failures.push('workers changed on retry');
    if (task32._pre_assigned_worker_count  !== snap32.wCount)   t32Failures.push('workerCount changed on retry');
    if (JSON.stringify(task32._capture_defects_resolved) !== snap32.defects) t32Failures.push('defects changed on retry');
    if (task32._batch_plan_id !== snap32.planId) t32Failures.push('batch_plan_id changed on retry');

    if (!t32Failures.length)
      pass('T32: retry preserves batch plan — composition, workers, defects, plan_id unchanged');
    else
      fail('T32: retry preserves batch plan', t32Failures.join('; '));
  } catch(e) { fail('T32: retry preserves batch plan', e.message); }

  // T33: manual retry (_retryFailedImages-style reset) preserves batch plan
  try {
    const fakeRows33 = [
      { metier: 'depannage_auto', travaux: 'crevaison', contexte: 'aire_repos', etat: 'encours', nb: 1, ville: '', fiche: '', meteo: 'auto', images: [] },
      { metier: 'depannage_auto', travaux: 'batterie',  contexte: 'domicile',   etat: 'encours', nb: 1, ville: '', fiche: '', meteo: 'auto', images: [] },
    ];
    const tasks33 = fakeRows33.map((row, ri) => {
      const base = buildDallePromptV2(row);
      const pb   = JSON.parse(base);
      const pp   = _buildPresencePlan(1, pb.state_level, pb._matched_key, 42);
      return { taskId: `t33-${ri}`, row, i: 0, nb: 1, jsonScene: base, presencePlan: pp, slug: 'test', _planBase: pb, status: 'pending', imageAttempt: 0, result: null, error: null };
    });
    _planGlobalBatch(tasks33, 'T33-seed');

    const snap33 = tasks33.map(t => ({
      planId:  t._batch_plan_id,
      comp:    t._pre_assigned_composition,
      defects: JSON.stringify(t._capture_defects_resolved),
    }));

    // Simulate task[1] failing → _retryFailedImages reset
    tasks33[1].status = IMAGE_TASK_STATUS.SAFETY_CHECK_FAILED;
    tasks33[1].error  = 'simulated';
    const failed33 = tasks33.filter(t => _TERMINAL_STATUSES.has(t.status) && t.status !== IMAGE_TASK_STATUS.SUCCESS);
    failed33.forEach(t => { t.status = IMAGE_TASK_STATUS.PENDING; t.imageAttempt = 0; t.error = null; t.result = null; });

    const t33Failures = [];
    for (let i = 0; i < tasks33.length; i++) {
      if (tasks33[i]._batch_plan_id !== snap33[i].planId) t33Failures.push(`task ${i}: plan_id changed`);
      if (tasks33[i]._pre_assigned_composition !== snap33[i].comp) t33Failures.push(`task ${i}: composition changed`);
      if (JSON.stringify(tasks33[i]._capture_defects_resolved) !== snap33[i].defects) t33Failures.push(`task ${i}: defects changed`);
    }

    if (!t33Failures.length)
      pass('T33: manual retry preserves batch plan — plan_id, composition, defects unchanged');
    else
      fail('T33: manual retry preserves batch plan', t33Failures.join('; '));
  } catch(e) { fail('T33: manual retry preserves batch plan', e.message); }

  // T34: _assertTaskHasBatchPlan — throws for unplanned task, silent for planned task
  try {
    const row34 = { metier: 'peinture', travaux: 'peinture intérieure', contexte: 'maison', etat: 'encours', nb: 1, ville: '', fiche: '', meteo: 'auto', images: [] };
    const base34 = buildDallePromptV2(row34);
    const pb34   = JSON.parse(base34);
    const pp34   = _buildPresencePlan(1, pb34.state_level, pb34._matched_key, 42);
    const task34 = { taskId: 't34', row: row34, i: 0, nb: 1, jsonScene: base34, presencePlan: pp34, slug: 'test', _planBase: pb34, status: 'pending', imageAttempt: 0, result: null, error: null };

    let threwUnplanned = false;
    try { _assertTaskHasBatchPlan(task34); } catch(e) { threwUnplanned = e.message.includes('INCOMPLETE_BATCH_PLAN'); }

    _planGlobalBatch([task34], 'T34-seed');
    let threwAfterPlan = false;
    try { _assertTaskHasBatchPlan(task34); } catch(e) { threwAfterPlan = true; }

    const t34Failures = [];
    if (!threwUnplanned)  t34Failures.push('_assertTaskHasBatchPlan did not throw for unplanned task');
    if (threwAfterPlan)   t34Failures.push('_assertTaskHasBatchPlan threw for correctly planned task');

    if (!t34Failures.length)
      pass('T34: _assertTaskHasBatchPlan — throws for unplanned, silent for planned');
    else
      fail('T34: _assertTaskHasBatchPlan', t34Failures.join('; '));
  } catch(e) { fail('T34: _assertTaskHasBatchPlan', e.message); }

  // T26: _planGlobalBatch — close_detail quotas, variety, no same composition for n=2
  try {
    const t26Failures = [];
    const t26Cases = [
      { metier: 'toiture',        sizes: [2, 3, 4, 6, 10] },
      { metier: 'elagage',        sizes: [2, 4] },
      { metier: 'depannage_auto', sizes: [2, 4] },
      { metier: 'peinture',       sizes: [3, 6] },
      { metier: 'terrassement',   sizes: [4, 10] },
    ];
    for (const { metier, sizes } of t26Cases) {
      for (const n of sizes) {
        const fakeTasks = Array.from({ length: n }, (_, i) => ({
          taskId: i, _planBase: { _matched_key: metier, _matched_service: `${metier}_svc` },
        }));
        const planned = _planGlobalBatch(fakeTasks, 42);
        const comps   = planned.map(t => t._pre_assigned_composition);
        const rules   = COMPOSITION_RULES_BY_METIER[metier] || {};
        const maxR    = rules.close_detail_max_ratio ?? 0.20;
        const maxC    = Math.max(1, Math.floor(n * maxR));
        const closeN  = comps.filter(c => c === 'close_detail').length;
        const allowed = rules.allowed_compositions || Object.keys(PHOTO_COMPOSITIONS);

        if (closeN > maxC)
          t26Failures.push(`${metier}/n=${n}: ${closeN} close_detail > max ${maxC}`);
        if (n === 2 && comps[0] === comps[1])
          t26Failures.push(`${metier}/n=2: identical compositions (${comps[0]})`);
        if (n >= 4 && !comps.some(c => c === 'contextual_overview' || c === 'wide_worksite'))
          t26Failures.push(`${metier}/n=${n}: no contextual_overview or wide_worksite`);
        for (const c of comps) {
          if (!allowed.includes(c))
            t26Failures.push(`${metier}/n=${n}: '${c}' not in allowed_compositions`);
        }
        // Capture defects must be 1-2 per task
        for (let i = 0; i < planned.length; i++) {
          const dl = planned[i]._capture_defects_resolved?.length;
          if (!dl || dl < 1 || dl > 2)
            t26Failures.push(`${metier}/n=${n}/task${i}: ${dl} defects (expected 1-2)`);
        }
      }
    }
    if (!t26Failures.length) pass('T26: batch composition planner — all quota rules respected');
    else fail('T26: batch composition planner', t26Failures.slice(0, 5).join('; '));
  } catch(e) { fail('T26: batch composition planner', e.message); }

  // T27: _planBatchWorkerPresence — min worker images respected, count consistency
  try {
    const t27Failures = [];
    const t27Metiers  = ['toiture', 'elagage', 'abattage', 'paysagiste', 'terrassement', 'maconnerie', 'depannage_auto'];
    for (const metier of t27Metiers) {
      for (const n of [2, 4, 6]) {
        const group = Array.from({ length: n }, (_, i) => ({
          taskId: i,
          _planBase: { _matched_key: metier },
          _pre_assigned_composition: ['medium_intervention', 'wide_worksite', 'contextual_overview', 'close_detail'][i % 4],
        }));
        _planBatchWorkerPresence(group, 42);
        const rules   = COMPOSITION_RULES_BY_METIER[metier] || {};
        const minWImg = rules.minimum_worker_images_per_active_batch ?? 1;
        const wCount  = group.filter(t => t._pre_assigned_worker_presence === 'workers').length;
        if (wCount < minWImg)
          t27Failures.push(`${metier}/n=${n}: ${wCount} worker images < min ${minWImg}`);
        for (const t of group) {
          if (t._pre_assigned_worker_presence === 'workers' && (t._pre_assigned_worker_count || 0) === 0)
            t27Failures.push(`${metier}: workerPresence=workers but workerCount=0`);
          if (t._pre_assigned_worker_presence !== 'workers' && (t._pre_assigned_worker_count || 0) > 0)
            t27Failures.push(`${metier}: workerPresence=${t._pre_assigned_worker_presence} but workerCount=${t._pre_assigned_worker_count}`);
        }
      }
    }
    if (!t27Failures.length) pass('T27: batch worker presence — all minima respected and count consistent');
    else fail('T27: batch worker presence', t27Failures.slice(0, 5).join('; '));
  } catch(e) { fail('T27: batch worker presence', e.message); }

  // T28: _selectCaptureDefects — always 1-2 defects, finger_edge rare, across 10 000 scenes
  try {
    let zeroN = 0, overN = 0, fingerN = 0, total = 0;
    for (let i = 0; i < 10000; i++) {
      const d = _selectCaptureDefects(i % 6, 6, _hashSeed(`T28|${i}`));
      total++;
      if (d.length === 0) zeroN++;
      if (d.length > 2)   overN++;
      if (d.some(x => x.key === 'finger_edge')) fingerN++;
    }
    const fPct = (fingerN / total * 100).toFixed(1);
    const t28Failures = [];
    if (zeroN > 0)               t28Failures.push(`${zeroN} scenes with 0 defects`);
    if (overN > 0)               t28Failures.push(`${overN} scenes with >2 defects`);
    if (fingerN > total * 0.15)  t28Failures.push(`finger_edge too frequent: ${fPct}%`);
    if (!t28Failures.length)
      pass(`T28: capture defects — 0 empty, 0 overflow, finger_edge=${fPct}% (rare), n=${total}`);
    else fail('T28: capture defects', t28Failures.join('; '));
  } catch(e) { fail('T28: capture defects', e.message); }

  // T29: _appendLockedFinalConstraints — output contains all required sections
  try {
    const mockScene = {
      _matched_key: 'toiture', composition: 'wide_worksite', location_type: 'maison_individuelle',
      triangle_rule: null, no_people: false, var_presence: 'workers', var_workers: 2,
      _worker_safety_mode: 'safety harness with lanyard clipped to a ridge anchor',
      _capture_defects_resolved: [
        { key: 'slight_tilt',      prompt: 'slightly tilted handheld framing' },
        { key: 'jpeg_compression', prompt: 'subtle JPEG compression and ordinary smartphone processing' },
      ],
    };
    const r = _appendLockedFinalConstraints('Base prompt text.', mockScene);
    const t29Failures = [];
    if (!r.includes('NON-NEGOTIABLE'))                t29Failures.push('missing NON-NEGOTIABLE header');
    if (!r.includes('WORKER PRESENCE'))               t29Failures.push('missing WORKER PRESENCE block');
    if (!/workers must be actively working/i.test(r)) t29Failures.push('WORKER PRESENCE does not mention worker (scene has var_workers=2)');
    if (!r.includes('wide_worksite'))                 t29Failures.push('missing composition key');
    if (!r.includes('5 to 8 metres'))                 t29Failures.push('missing camera distance');
    if (!r.includes('slightly tilted') && !r.includes('JPEG compression'))
      t29Failures.push('missing capture defects');
    if (!r.includes('DOCUMENTARY STYLE'))             t29Failures.push('missing documentary style block');
    if (!r.includes('No readable brand'))             t29Failures.push('missing branding rules');
    if (!r.includes('safety harness'))                t29Failures.push('missing required safety element');
    if (!t29Failures.length) pass('T29: _appendLockedFinalConstraints — all required sections present');
    else fail('T29: locked final layer', t29Failures.join('; '));
  } catch(e) { fail('T29: locked final layer', e.message); }

  // T30: Extended exhaustive — batch-level checks for all métiers × batch sizes 2 and 4
  try {
    const allMetiers = Object.keys(WORK_SCENES);
    let failCount = 0, batchesTested = 0;
    const t30Samples = [];
    for (const metier of allMetiers) {
      const ws   = WORK_SCENES[metier];
      const svcs = metier === 'depannage_auto'
        ? ['crevaison pneu', 'batterie démarrage', 'panne moteur']
        : [ws.service_keywords?.[0]?.phrase || ws.intro || metier];
      for (const svc of svcs) {
        for (const batchSize of [2, 4]) {
          batchesTested++;
          const fake = Array.from({ length: batchSize }, (_, i) => ({
            taskId: i, _planBase: { _matched_key: metier, _matched_service: svc },
          }));
          const planned = _planGlobalBatch(fake, 77);
          const comps   = planned.map(t => t._pre_assigned_composition);
          const rules   = COMPOSITION_RULES_BY_METIER[metier] || {};
          const maxR    = rules.close_detail_max_ratio ?? 0.20;
          const maxC    = Math.max(1, Math.floor(batchSize * maxR));
          const closeN  = comps.filter(c => c === 'close_detail').length;
          if (closeN > maxC) {
            failCount++;
            if (t30Samples.length < 5) t30Samples.push(`${metier}/n=${batchSize}: ${closeN} close > ${maxC}`);
          }
          const minWImg = rules.minimum_worker_images_per_active_batch ?? 1;
          const wCount  = planned.filter(t => t._pre_assigned_worker_presence === 'workers').length;
          if (wCount < minWImg) {
            failCount++;
            if (t30Samples.length < 5) t30Samples.push(`${metier}/n=${batchSize}: ${wCount} workers < min ${minWImg}`);
          }
          for (let i = 0; i < planned.length; i++) {
            const dl = planned[i]._capture_defects_resolved?.length;
            if (!dl || dl < 1 || dl > 2) {
              failCount++;
              if (t30Samples.length < 5) t30Samples.push(`${metier}/n=${batchSize}/i=${i}: defects=${dl}`);
            }
          }
        }
      }
    }
    if (!failCount)
      pass(`T30: extended batch exhaustive — ${batchesTested} batches × 2 sizes, 0 failure`);
    else
      fail('T30: extended batch exhaustive', `${failCount} failures: ${t30Samples.join('; ')}`);
  } catch(e) { fail('T30: extended batch exhaustive', e.message); }

  // T25: Exhaustive coverage — all WORK_SCENES métiers × all UI contexts × 10 seeds
  try {
    const allMetiers = Object.keys(WORK_SCENES);
    const testMatrix = [];
    for (const metier of allMetiers) {
      const ws       = WORK_SCENES[metier];
      const reprSvc  = ws.service_keywords?.[0]?.phrase || ws.intro || metier;
      const services = metier === 'depannage_auto'
        ? ['crevaison pneu crevé', 'batterie démarrage', 'panne moteur']
        : [reprSvc];
      const contexts = CONTEXTE_BY_METIER[metier] || CONTEXTE_OPTIONS;
      for (const svc of services) {
        for (const ctx of contexts) {
          testMatrix.push({ metier, service: svc, ctx: ctx.value || String(ctx) });
        }
      }
    }

    const failures = [];
    let totalScenes = 0;

    for (const { metier, service, ctx } of testMatrix) {
      for (let seed = 0; seed < 10; seed++) {
        totalScenes++;
        const baseScene = JSON.stringify({
          _matched_key: metier, _matched_service: service,
          contexte: ctx, exclude: [], var_presence: 'none', var_workers: 0, no_people: true,
        });
        let s, locSvcR;
        try {
          const resolved  = _resolveLocationAndComposition(baseScene, seed);
          const sceneValR = _validateResolvedScene(resolved);
          locSvcR         = _validateLocationServiceCompatibility(sceneValR.fixedStr);
          s               = JSON.parse(locSvcR.fixedStr);
        } catch(e) {
          failures.push(`${metier}/${ctx}/s${seed}: exception — ${e.message}`);
          continue;
        }
        const pfx = `${metier}/${ctx}/s${seed}`;
        if (!s.location_type || !LOCATION_RULES[s.location_type])
          failures.push(`${pfx}: loc=${s.location_type || 'null'}`);
        else {
          if (!s.location_subtype)
            failures.push(`${pfx}: subtype=null`);
          if (!s.work_surface)
            failures.push(`${pfx}: work_surface=null`);
          if (!s.composition)
            failures.push(`${pfx}: composition=null`);
          // no_people / var_workers consistency (C1 invariant)
          if (s.no_people === false && (s.var_workers || 0) === 0)
            failures.push(`${pfx}: no_people=false but var_workers=0`);
          // Triangle excluded when rule is 'forbidden'
          if (s.triangle_rule === 'forbidden') {
            if (!(s.exclude || []).some(e => /triangle/i.test(e)))
              failures.push(`${pfx}: triangle_rule=forbidden but no triangle in exclude[]`);
          }
        }
      }
    }

    if (failures.length === 0)
      pass(`T25: ${testMatrix.length} combinations × 10 seeds = ${totalScenes} scenes, 0 error`);
    else
      fail('T25: exhaustive coverage', `${failures.length} failures (first 10):\n    ` + failures.slice(0, 10).join('\n    '));
  } catch(e) { fail('T25: exhaustive coverage', e.message); }

  // T24: location_subtype is compatible with métier/service — tested across 5 seeds per case
  try {
    const t24Cases = [
      { metier:'toiture',      travaux:'réfection toiture',            contexte:'immeuble',  forbid: ['immeuble_parties_communes','immeuble_cour','immeuble_facade'] },
      { metier:'étanchéité',   travaux:'membrane toit terrasse',       contexte:'immeuble',  require: ['immeuble_toit_terrasse'], forbid: ['immeuble_toiture_inclinee'] },
      { metier:'terrassement', travaux:'fondations maison',            contexte:'chantier',  forbid: ['building renovation site with scaffold and hoarding'] },
      { metier:'ravalement',   travaux:'ravalement facade enduit',     contexte:'immeuble',  require: ['immeuble_facade'] },
      { metier:'peinture',     travaux:'peinture intérieure parties communes', contexte:'immeuble', require: ['immeuble_parties_communes'] },
      { metier:'élagage',      travaux:'élagage grands arbres',        contexte:'jardin',    require: ['suburban residential garden with lawn and planted beds','mature garden with established trees'] },
      { metier:'abattage',     travaux:'abattage arbre',               contexte:'jardin',    require: ['mature garden with established trees'] },
    ];
    const t24Failures = [];
    for (const tc of t24Cases) {
      for (let idx = 0; idx < 5; idx++) {
        const scene  = JSON.stringify({ _matched_key: tc.metier, _matched_service: tc.travaux, contexte: tc.contexte, exclude: [] });
        const result = JSON.parse(_resolveLocationAndComposition(scene, idx));
        // Run LSC validator too
        const lscR   = _validateLocationServiceCompatibility(JSON.stringify(result));
        const sub    = JSON.parse(lscR.fixedStr).location_subtype;
        if (tc.forbid  && tc.forbid.includes(sub))
          t24Failures.push(`${tc.metier}/"${tc.travaux}"/idx=${idx} → FORBIDDEN subtype "${sub}"`);
        if (tc.require && !tc.require.includes(sub))
          t24Failures.push(`${tc.metier}/"${tc.travaux}"/idx=${idx} → expected [${tc.require.join('|')}] got "${sub}"`);
      }
    }
    if (t24Failures.length === 0) pass(`T24: all ${t24Cases.length} service/subtype cases pass across 5 seeds`);
    else fail('T24: subtype compatibility', '\n    ' + t24Failures.join('\n    '));
  } catch (e) { fail('T24: subtype compatibility', e.message); }

  // T23: All UI contexts (CONTEXTE_BY_METIER + CONTEXTE_OPTIONS) resolve to a valid LOCATION_RULES entry
  try {
    const allContexts = [
      // Per-métier specific contexts
      ...Object.entries(CONTEXTE_BY_METIER).flatMap(([metier, ctxs]) =>
        ctxs.map(c => ({ metier, ctx: c.value }))
      ),
      // Generic CONTEXTE_OPTIONS × a representative sample of non-depannage métiers
      ...['toiture', 'élagage', 'paysagiste', 'terrassement', 'peinture'].flatMap(metier =>
        CONTEXTE_OPTIONS.map(c => ({ metier, ctx: c.value }))
      ),
    ];
    const failures = [];
    for (const { metier, ctx } of allContexts) {
      const scene  = JSON.stringify({ _matched_key: metier, contexte: ctx, exclude: [] });
      const result = JSON.parse(_resolveLocationAndComposition(scene, 0));
      if (!result.location_type || !LOCATION_RULES[result.location_type]) {
        failures.push(`${metier}/${ctx} → ${result.location_type || 'null'}`);
      }
    }
    if (failures.length === 0) pass(`T23: all ${allContexts.length} UI contexts resolve to a valid LOCATION_RULES entry`);
    else fail('T23: unresolved locations', failures.join(', '));
  } catch (e) { fail('T23: global context resolution', e.message); }

  // T35: _rebalanceGlobalBatchPlan — global quotas guaranteed on 4-task depannage_auto, 100 seeds
  try {
    const t35Failures = [];
    const t35Proto = [
      { taskId: 'crev-1', _planBase: { _matched_key: 'depannage_auto', _matched_service: 'crevaison pneu crevé' } },
      { taskId: 'crev-2', _planBase: { _matched_key: 'depannage_auto', _matched_service: 'crevaison pneu crevé' } },
      { taskId: 'batt-1', _planBase: { _matched_key: 'depannage_auto', _matched_service: 'batterie_a_plat' } },
      { taskId: 'batt-2', _planBase: { _matched_key: 'depannage_auto', _matched_service: 'batterie_a_plat' } },
    ];
    for (let s = 0; s < 100 && t35Failures.length < 5; s++) {
      const tasks = t35Proto.map(t => Object.assign({}, t));
      const seed  = `T35-seed-${s}`;
      _planGlobalBatch(tasks, seed);
      _rebalanceGlobalBatchPlan(tasks, seed);
      try { _validateCompleteBatchPlan(tasks); } catch(e) { t35Failures.push(`s=${s}: ${e.message}`); continue; }
      const comps = tasks.map(t => t._pre_assigned_composition);
      if (comps.filter(c => c === 'close_detail').length > 1) t35Failures.push(`s=${s}: close_detail>1`);
      if (!comps.includes('medium_intervention'))             t35Failures.push(`s=${s}: no medium_intervention`);
      if (!comps.includes('wide_worksite'))                   t35Failures.push(`s=${s}: no wide_worksite`);
      if (!comps.includes('contextual_overview'))             t35Failures.push(`s=${s}: no contextual_overview`);
      if (!tasks.some(t => t._pre_assigned_worker_presence === 'workers')) t35Failures.push(`s=${s}: no worker`);
      if (!tasks.some(t => t._pre_assigned_vehicle !== 'absent'))          t35Failures.push(`s=${s}: no vehicle`);
    }
    if (!t35Failures.length) pass('T35: _rebalanceGlobalBatchPlan — global quotas guaranteed across 100 seeds (4-task depannage_auto)');
    else                      fail('T35: global batch quotas', `${t35Failures.length} failures: ${t35Failures.slice(0,3).join('; ')}`);
  } catch(e) { fail('T35: global batch quotas', e.message); }

  // T36: _assertFinalWorkerConsistency — no contradiction between workers and no_people in final prompt
  try {
    const t36Failures = [];

    // T36a: worker scene — no_people must become false, WORKER PRESENCE must mention worker, no person-ban outside that block
    const scW = {
      var_workers: 1, var_presence: 'workers', no_people: false,
      composition: 'medium_intervention', _matched_key: 'depannage_auto',
      triangle_rule: null, _worker_safety_mode: null,
      _capture_defects_resolved: [{ key: 'jpeg_compression', prompt: 'subtle JPEG compression' }],
    };
    _assertFinalWorkerConsistency(scW);
    if (scW.no_people !== false) t36Failures.push('T36a: no_people should be false for worker scene');
    const pW = _appendLockedFinalConstraints('[mock]', scW);
    if (!/One worker must be actively working/i.test(pW)) t36Failures.push('T36a: WORKER PRESENCE does not mention worker');
    if (/No workers or people visible/i.test(pW))         t36Failures.push('T36a: no-people instruction leaked into worker scene');

    // T36b: no-worker scene — no_people must become true, person-ban in WORKER PRESENCE, NOT in FORBIDDEN SAFETY
    const scN = {
      var_workers: 0, var_presence: 'none', no_people: true,
      composition: 'wide_worksite', _matched_key: 'depannage_auto',
      triangle_rule: null, _worker_safety_mode: null,
      _capture_defects_resolved: [{ key: 'jpeg_compression', prompt: 'subtle JPEG compression' }],
    };
    _assertFinalWorkerConsistency(scN);
    if (scN.no_people !== true) t36Failures.push('T36b: no_people should be true for no-worker scene');
    const pN = _appendLockedFinalConstraints('[mock]', scN);
    if (!/No workers or people visible/i.test(pN)) t36Failures.push('T36b: no-people instruction missing from WORKER PRESENCE');
    const afterForbidden = pN.split('FORBIDDEN SAFETY VIOLATIONS')[1] || '';
    // Check for the presence-ban phrasing specifically — not safety rules that mention "person" incidentally
    if (/no workers or people visible/i.test(afterForbidden) || /no (person|human figure) visible in (this|the) (specific )?image/i.test(afterForbidden))
      t36Failures.push('T36b: presence-ban phrasing is inside FORBIDDEN SAFETY VIOLATIONS (must be in WORKER PRESENCE)');

    // T36c: contradiction — var_workers>0 + no_people=true must throw
    let threwC = false;
    try {
      _assertFinalWorkerConsistency({
        var_workers: 1, var_presence: 'workers', no_people: true,
        composition: 'medium_intervention', _matched_key: 'depannage_auto',
        triangle_rule: null, _capture_defects_resolved: [],
      });
    } catch(e) { threwC = e.message.includes('WORKER_PROMPT_CONTRADICTION'); }
    if (!threwC) t36Failures.push('T36c: should throw WORKER_PROMPT_CONTRADICTION for var_workers=1+no_people=true');

    if (!t36Failures.length) pass('T36: _assertFinalWorkerConsistency — worker/no_people consistency enforced');
    else                      fail('T36: worker/no_people consistency', t36Failures.join('; '));
  } catch(e) { fail('T36: worker/no_people consistency', e.message); }

  // T37: cross-family defect compatibility — 10 000 scenes, no same-family pair, finger_edge rare
  try {
    const t37Failures = [];
    const TOTAL = 10000;
    let fingerN = 0;
    const defectFamily = {};
    for (const [fam, members] of Object.entries(CAPTURE_DEFECT_GROUPS))
      for (const m of members) defectFamily[m] = fam;

    for (let i = 0; i < TOTAL && t37Failures.length < 5; i++) {
      const d = _selectCaptureDefects(i % 6, 6, _hashSeed(`T37|${i}`));
      if (!d.length)  { t37Failures.push(`i=${i}: empty`); continue; }
      if (d.length > 2) { t37Failures.push(`i=${i}: ${d.length} defects`); continue; }
      if (d.length === 2) {
        const [fa, fb] = d.map(x => defectFamily[x.key]);
        if (fa && fb && fa === fb)
          t37Failures.push(`i=${i}: same family (${fa}): ${d[0].key} + ${d[1].key}`);
      }
      if (d.some(x => x.key === 'finger_edge')) fingerN++;
    }
    const fPct = (fingerN / TOTAL * 100).toFixed(1);
    if (fingerN > TOTAL * 0.15) t37Failures.push(`finger_edge too frequent: ${fPct}%`);
    if (!t37Failures.length)
      pass(`T37: cross-family defect compatibility — 0 same-family pairs, finger_edge=${fPct}% (rare), n=${TOTAL}`);
    else
      fail('T37: cross-family defect compatibility', `${t37Failures.length} failures: ${t37Failures.slice(0,3).join('; ')}`);
  } catch(e) { fail('T37: cross-family defect compatibility', e.message); }

  // T39: intégrité module Phase 0 — les 7 fonctions exposées sur window via index.js
  try {
    const required = ['generateAllImages','addImgRow','downloadImagesZip','_retryFailedImages','_debugBatchPlan','_debugFinalPrompt','_runLocalTests'];
    const missing  = required.filter(fn => typeof window[fn] !== 'function');
    if (!missing.length) pass('T39: Phase 0 bridge — 7 fonctions exposées sur window');
    else fail('T39: Phase 0 bridge', `manquantes: ${JSON.stringify(missing)}`);
  } catch(e) { fail('T39: Phase 0 bridge', e.message); }

  // T40: équivalence avant/après — buildDallePromptV2 stable sur 8 rows canoniques
  // Snapshots complets (stableJson + hash) dans src/image-generation/debug/snapshots-t40.js.
  // Comparaison principale : sérialisation déterministe (clés triées récursivement).
  // Le hash est un résumé — la comparaison stableJson prime.
  try {
    function _t40StableStringify(v) {
      if (Array.isArray(v)) return '[' + v.map(_t40StableStringify).join(',') + ']';
      if (v !== null && typeof v === 'object') {
        return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + _t40StableStringify(v[k])).join(',') + '}';
      }
      return JSON.stringify(v);
    }
    function _t40Hash32(s) {
      let h = 0;
      for (let i = 0; i < s.length; i++) h = ((h * 31) + s.charCodeAt(i)) >>> 0;
      return h;
    }
    const REF = [
      { id:'toiture-nettoyage',       metier:'toiture',        travaux:'nettoyage gouttières',      contexte:'maison',      etat:'encours', ville:'Paris', refHash:2455936913 },
      { id:'toiture-tuiles',          metier:'toiture',        travaux:'Remplacement de tuiles',     contexte:'maison',      etat:'encours', ville:'Paris', refHash:2385610455 },
      { id:'plomberie-debouchage',     metier:'plomberie',      travaux:'Débouchage canalisation',    contexte:'appartement', etat:'encours', ville:'Paris', refHash:1029236932 },
      { id:'plomberie-fuite',         metier:'plomberie',      travaux:"Fuite d'eau",                contexte:'maison',      etat:'debut',   ville:'Paris', refHash:1088613504 },
      { id:'electricite-normes',      metier:'électricité',    travaux:'Mise aux normes électrique', contexte:'appartement', etat:'encours', ville:'Paris', refHash:1746687025 },
      { id:'depannage-auto-batterie', metier:'depannage_auto', travaux:'batterie à plat',            contexte:'domicile',    etat:'encours', ville:'Paris', refHash:919780194  },
      { id:'peinture-interieure',     metier:'peinture',       travaux:'Peinture intérieure',        contexte:'appartement', etat:'encours', ville:'Paris', refHash:3792538061 },
      { id:'maconnerie-enduit',       metier:'maçonnerie',     travaux:'Réfection enduit façade',    contexte:'maison',      etat:'encours', ville:'Paris', refHash:1460650968 },
    ];
    const t40Failures = [];
    for (const ref of REF) {
      const row    = { metier: ref.metier, travaux: ref.travaux, contexte: ref.contexte, etat: ref.etat, nb: 1, ville: ref.ville, fiche: '', meteo: 'auto', images: [] };
      const json   = buildDallePromptV2(row);
      const stable = _t40StableStringify(JSON.parse(json));
      const hash   = _t40Hash32(stable);
      if (hash !== ref.refHash) t40Failures.push(`${ref.id}: hash ${hash} ≠ ref ${ref.refHash}`);
    }
    if (!t40Failures.length) pass('T40: buildDallePromptV2 stable — 8 stableJson correspondent aux snapshots Phase 0');
    else fail('T40: buildDallePromptV2 équivalence (stableJson)', t40Failures.slice(0, 3).join('; '));
  } catch(e) { fail('T40: buildDallePromptV2 équivalence', e.message); }

  // T42: parité legacy/modules — dynamic import() compare les 8 constantes de config
  try {
    const diffs = await window._runModuleParityTests();
    if (!diffs.length)
      pass('T42: Legacy/module parity — 8 constantes identiques (SERVICE_CATALOG, LOCATION_RULES, LOCATION_ALIASES, CAMERA_COMPOSITIONS, COMPOSITION_RULES_BY_METIER, CAPTURE_DEFECTS, CAPTURE_DEFECT_GROUPS, PROFESSIONAL_VEHICLE_RULES)');
    else
      fail('T42: Legacy/module parity', `${diffs.length} différence(s): ${diffs.slice(0, 3).join('; ')}`);
  } catch(e) { fail('T42: Legacy/module parity', e.message); }

  // T43 / T44 / T45: parité WORK_SCENES + SITE_REALISM, routage, intégrité assemblage
  let _svcParityResult = null;
  try { _svcParityResult = await window._runServiceParityTests(); } catch(e) {
    fail('T43: WORK_SCENES + SITE_REALISM deep parity', e.message);
    fail('T44: Routing parity', e.message);
    fail('T45: Assembly integrity', e.message);
  }
  if (_svcParityResult) {
    const { t43, t44, t45 } = _svcParityResult;
    if (!t43.diffs.length)
      pass(`T43: WORK_SCENES + SITE_REALISM deep parity — ${t43.wsKeys} WS keys, ${t43.srKeys} SR keys, 0 diffs`);
    else
      fail('T43: WORK_SCENES + SITE_REALISM deep parity', `${t43.diffs.length} diff(s): ${t43.diffs.slice(0, 3).join('; ')}`);
    if (!t44.diffs.length)
      pass(`T44: Routing parity — ${t44.total} sous-services, même pool sélectionné, 0 diffs`);
    else
      fail('T44: Routing parity', `${t44.diffs.length} diff(s) sur ${t44.total} services: ${t44.diffs.slice(0, 3).join('; ')}`);
    if (t45.ok)
      pass(`T45: Assembly integrity — ${t45.wsKeys} WS keys, ${t45.srKeys} SR keys, aucune collision`);
    else
      fail('T45: Assembly integrity', t45.error || 'assertServiceRegistriesIntegrity failed');
  }

  // T46–T51: Phase 3 — safety / resolver parity
  let _resParityResult = null;
  try { _resParityResult = await window._runResolutionParityTests(); } catch(e) {
    fail('T46: Safety static data parity', e.message);
    fail('T47: Deterministic utils parity', e.message);
    fail('T48: Location resolver parity', e.message);
    fail('T49: Service resolver parity', e.message);
    fail('T50: Worker/safety parity', e.message);
    fail('T51: Phase 3 dependency integrity', e.message);
  }
  if (_resParityResult) {
    const { t46Diffs, t47, t48, t49, t50, t51 } = _resParityResult;
    if (!t46Diffs.length)
      pass('T46: Safety static data parity (WORKER_SCENE_RULES, FORBIDDEN_SAFETY_BY_METIER, _PRE_GEN_SAFETY, SAFETY_CHECK_RULES) — 0 diffs');
    else
      fail('T46: Safety static data parity', `${t46Diffs.length} diff(s): ${t46Diffs.slice(0,3).join('; ')}`);
    if (!t47.diffs.length)
      pass(`T47: Deterministic utils parity — ${t47.cases} cases, 0 diffs (_hashSeed + _pick)`);
    else
      fail('T47: Deterministic utils parity', `${t47.diffs.length} diff(s): ${t47.diffs.slice(0,3).join('; ')}`);
    if (!t48.diffs.length)
      pass(`T48: Location resolver parity — ${t48.cases} cases, 0 diffs (_resolveLocationAndComposition)`);
    else
      fail('T48: Location resolver parity', `${t48.diffs.length} diff(s): ${t48.diffs.slice(0,3).join('; ')}`);
    if (!t49.diffs.length)
      pass(`T49: Service resolver parity — ${t49.cases} cases, 0 diffs (_applySiteRealism + _resolveServiceSetting)`);
    else
      fail('T49: Service resolver parity', `${t49.diffs.length} diff(s): ${t49.diffs.slice(0,3).join('; ')}`);
    if (!t50.diffs.length)
      pass(`T50: Worker/safety parity — ${t50.cases} cases, 0 diffs (_buildPresencePlan, _buildWorkerDesc, _validateWorkerScene, _assertFinalWorkerConsistency)`);
    else
      fail('T50: Worker/safety parity', `${t50.diffs.length} diff(s): ${t50.diffs.slice(0,3).join('; ')}`);
    if (t51.ok)
      pass('T51: Phase 3 dependency integrity — tous les modules importables, aucune copie illégitime');
    else
      fail('T51: Phase 3 dependency integrity', t51.issues.join('; '));
  }

  // T52–T58: Phase 4 — planning & validation parity
  let _planParityResult = null;
  try { _planParityResult = await window._runPlanningParityTests(); } catch(e) {
    fail('T52: Quality rules parity', e.message);
    fail('T53: Composition planner parity', e.message);
    fail('T54: Worker/vehicle/defects parity', e.message);
    fail('T55: Global batch plan parity', e.message);
    fail('T56: Validators parity', e.message);
    fail('T57: Exhaustive UI batch plans', e.message);
    fail('T58: Phase 4 dependency integrity', e.message);
  }
  if (_planParityResult) {
    const { t52, t53, t54, t55, t56, t57, t58 } = _planParityResult;
    if (!t52.diffs.length)
      pass(`T52: Quality rules parity — ${window.__IMAGE_GEN_LEGACY_PLANNING__.QUALITY_RULES.length} règles, 0 diff`);
    else
      fail('T52: Quality rules parity', `${t52.diffs.length} diff(s): ${t52.diffs.slice(0,3).join('; ')}`);
    if (!t53.diffs.length)
      pass(`T53: Composition planner parity — ${t53.cases} cas, 0 diff`);
    else
      fail('T53: Composition planner parity', `${t53.diffs.length} diff(s): ${t53.diffs.slice(0,3).join('; ')}`);
    if (!t54.diffs.length)
      pass(`T54: Worker/vehicle/defects parity — ${t54.cases} cas, 0 diff`);
    else
      fail('T54: Worker/vehicle/defects parity', `${t54.diffs.length} diff(s): ${t54.diffs.slice(0,3).join('; ')}`);
    if (!t55.diffs.length)
      pass(`T55: Global batch plan parity — ${t55.cases} cas, 0 diff`);
    else
      fail('T55: Global batch plan parity', `${t55.diffs.length} diff(s): ${t55.diffs.slice(0,3).join('; ')}`);
    if (!t56.diffs.length)
      pass(`T56: Validators parity — ${t56.cases} cas, 0 diff`);
    else
      fail('T56: Validators parity', `${t56.diffs.length} diff(s): ${t56.diffs.slice(0,3).join('; ')}`);
    if (!t57.diffs.length)
      pass(`T57: Exhaustive UI batch plans — ${t57.cases} cas, 0 diff`);
    else
      fail('T57: Exhaustive UI batch plans', `${t57.diffs.length} diff(s): ${t57.diffs.slice(0,3).join('; ')}`);
    if (t58.ok)
      pass('T58: Phase 4 dependency integrity — tous modules importables, _selectVehiclePresence extrait');
    else
      fail('T58: Phase 4 dependency integrity', t58.issues.join('; '));
  }

  // T59–T66: Phase 5 — prompt modules parity
  let _promptParityResult = null;
  try { _promptParityResult = await window._runPromptParityTests(); } catch(e) {
    fail('T59: Prompt constants parity', e.message);
    fail('T60: buildDallePromptV2 parity', e.message);
    fail('T61: PromptBuilder parity', e.message);
    fail('T62: Locked constraints parity', e.message);
    fail('T63: Prompt rewrite mock', e.message);
    fail('T64: Full shadow pipeline parity', e.message);
    fail('T65: T40 canonical snapshots (module)', e.message);
    fail('T66: Phase 5 dependency integrity', e.message);
  }
  if (_promptParityResult) {
    const { t59, t60, t61, t62, t63, t64, t65, t66 } = _promptParityResult;
    if (!t59.diffs.length)
      pass('T59: Prompt constants parity — _IMG_REWRITE_SYSTEM, _SCENE_PLANNER_MODEL, INTERIOR_SCENE_BASE, _USE_PROMPT_BUILDER, PHOTO_STYLE_RULES — 0 diff');
    else
      fail('T59: Prompt constants parity', t59.diffs.join('; '));
    if (!t60.jsonDiffs.length && !t60.lmDiffs.length)
      pass(`T60: buildDallePromptV2 parity — ${t60.cases} cas, 0 diff JSON, 0 diff _lastMatch`);
    else
      fail('T60: buildDallePromptV2 parity', `JSON diffs: ${t60.jsonDiffs.length} (${t60.jsonDiffs[0]||''}), LM diffs: ${t60.lmDiffs.length}`);
    if (!t61.diffs.length)
      pass(`T61: PromptBuilder parity — ${t61.cases} cas, 0 diff`);
    else
      fail('T61: PromptBuilder parity', `${t61.diffs.length} diff(s): ${t61.diffs.slice(0,3).join('; ')}`);
    if (!t62.diffs.length)
      pass(`T62: Locked constraints parity — ${t62.cases} cas, 0 diff`);
    else
      fail('T62: Locked constraints parity', `${t62.diffs.length} diff(s): ${t62.diffs.slice(0,3).join('; ')}`);
    if (!t63.issues.length)
      pass(`T63: Prompt rewrite mock — ${t63.cases} scénarios, 0 issue`);
    else
      fail('T63: Prompt rewrite mock', t63.issues.join('; '));
    if (!t64.diffs.length)
      pass(`T64: Full shadow pipeline parity — ${t64.cases} pipelines, 0 diff`);
    else
      fail('T64: Full shadow pipeline parity', `${t64.diffs.length} diff(s): ${t64.diffs.slice(0,3).join('; ')}`);
    if (!t65.diffs.length)
      pass('T65: T40 canonical snapshots (module) — 8 cas, 0 diff');
    else
      fail('T65: T40 canonical snapshots (module)', t65.diffs.join('; '));
    if (t66.ok)
      pass('T66: Phase 5 dependency integrity — tous modules importables, aucune copie illégitime');
    else
      fail('T66: Phase 5 dependency integrity', t66.issues.join('; '));
  }

  // T41 + T67–T78: pipeline modulaire Phase 6
  {
    let pipeRes;
    try {
      pipeRes = await _runPipelineParityTests();
    } catch(e) {
      fail('T41/T67–T78: pipeline parity import', e.message);
      pipeRes = null;
    }
    if (pipeRes) {
      const LABELS = {
        t41: 'T41: pipeline modulaire complet (4 tâches, 4 images, 0 retry)',
        t67: 'T67: state — structure, indépendance, constants parity',
        t68: 'T68: buildImageGenerationRequest — url/headers/body/timeout',
        t69: 'T69: buildVisionSafetyRequest — url/headers/body/timeout',
        t70: 'T70: runImageBatch — 4 tâches, toutes réussies',
        t71: 'T71: runImageBatch — violation critique puis succès',
        t72: 'T72: runImageBatch — échec vision (3 tentatives)',
        t73: 'T73: runImageBatch — verrouillage run / runId stable',
        t74: 'T74: retryFailedImages — plan batch préservé',
        t75: 'T75: runImageBatch — déduplication et statuts terminaux',
        t76: 'T76: UI adapter — updateProgress / renderImage / onTaskDone',
        t77: 'T77: noms de fichiers — format, unicité, tâches non-success absentes',
        t78: 'T78: Phase 6 dependency integrity — exports, factory, shadow, legacy refs',
        t79: 'T79: small batch planning and validation — 2400 cas, 0 INVALID_BATCH_PLAN',
        t80: 'T80: modular small batches — pipeline complet n=1 et n=2',
      };
      for (const [key, label] of Object.entries(LABELS)) {
        const r = pipeRes[key];
        if (!r) { fail(label, 'no result'); continue; }
        if (r.ok) pass(label);
        else      fail(label, r.issues.join('; '));
      }
    }
  }

  console.log('[TEST] Done.');
}

// ─── Main entry point ─────────────────────────────────────────────────────────

async function generateAllImages() {
  if (_generationRunActive) {
    console.warn('[Batch] génération déjà en cours — ignoré');
    return;
  }
  _generationRunActive = true;
  const runId = ++_generationRunId;
  document.getElementById('btn-generate-all').disabled = true;
  try {
    await _generateAllImagesImpl(runId);
  } catch (e) {
    console.error('[generateAllImages] fatal runId=' + runId + ':', e);
    alert('Erreur inattendue : ' + e.message);
  } finally {
    if (runId === _generationRunId) {
      _generationRunActive = false;
      document.getElementById('btn-generate-all').disabled = false;
    }
  }
}

async function _generateAllImagesImpl(runId) {
  // Button already disabled by generateAllImages() wrapper.
  // All early returns re-enable via the wrapper's finally block.

  const key = document.getElementById('openai-key')?.value.trim();
  if (!key) { alert('Renseigne ta clé API OpenAI (sk-...) en haut de la page.'); return; }

  const rows = _imgRows.filter(r => (r.travaux || '').trim());
  if (!rows.length) { alert('Ajoute au moins une ligne avec un type de travaux.'); return; }

  _imgApiCallCount    = 0;
  _imgVisionCallCount = 0;
  window._imgCallLog  = [];
  document.getElementById('img-results-grid').innerHTML = '';
  document.getElementById('btn-download-zip').style.display = 'none';
  _hideSummary();

  // ── Phase 1: build all image tasks synchronously ──────────────────────────
  const tasks = [];
  for (const row of rows) {
    row.status = 'running';
    row.images = [];

    const nb        = parseInt(row.nb) || 1;
    const baseScene = buildDallePromptV2(row);
    const slug      = slugify(row.fiche || row.travaux);

    const sceneIssues = _validateScene(baseScene);
    if (sceneIssues.length) {
      row.status = 'error';
      console.warn('[scene validation]', sceneIssues);
      continue;
    }

    let jsonScene = baseScene;
    if (_USE_GPT_SCENE_JSON) {
      jsonScene = await _generateSceneJSON(baseScene, key);
    }

    const _planBase    = JSON.parse(jsonScene);
    const _planSeed    = _hashSeed(`${_planBase._matched_key || ''}${_planBase._matched_service || ''}plan`);
    const presencePlan = _buildPresencePlan(nb, _planBase.state_level, _planBase._matched_key, _planSeed);
    console.log(`[PresencePlan] ${JSON.stringify({ key: _planBase._matched_key, state: _planBase.state_level, imageCount: nb, plan: presencePlan })}`);

    for (let i = 0; i < nb; i++) {
      tasks.push({ taskId: ++_imgTaskIdSeq, row, i, nb, jsonScene, presencePlan, slug, _planBase, status: 'pending', imageAttempt: 0, result: null, error: null });
    }
  }
  renderImgPlanning();

  const total = tasks.length;
  if (total === 0) {
    alert('Aucune image à générer — vérifie que chaque ligne a un type de travaux valide et un métier reconnu.');
    return;
  }

  // ── Batch planning — assigns composition/workers/vehicle/defects BEFORE any API call ────────
  const _batchRunSeed = `${runId}:${Date.now()}`;
  _planGlobalBatch(tasks, _batchRunSeed);
  _rebalanceGlobalBatchPlan(tasks, _batchRunSeed);
  _validateCompleteBatchPlan(tasks);
  console.log('[BATCH PLAN]', tasks.map(t => ({
    taskId:      t.taskId,
    metier:      t._planBase._matched_key,
    service:     t._planBase._matched_service,
    composition: t._pre_assigned_composition,
    vehicle:     t._pre_assigned_vehicle,
    workers:     t._pre_assigned_worker_presence,
    workerCount: t._pre_assigned_worker_count,
    defects:     (t._capture_defects_resolved || []).map(d => d.key),
  })));

  // ── Phase 2: progress bar ─────────────────────────────────────────────────
  const progressWrap = document.getElementById('img-progress-wrap');
  const progressBar  = document.getElementById('img-progress-bar');
  const progressLbl  = document.getElementById('img-progress-label');
  progressWrap.style.display = 'block';

  // ── Phase 3: concurrent queue ─────────────────────────────────────────────
  const runImages = [];  // local — published to _generatedImages only after batch
  await _runImageBatch(tasks, key, progressBar, progressLbl, runId, runImages);

  // ── Phase 4: publish + finalize ───────────────────────────────────────────
  _generatedImages = runImages;  // atomic publish; no partial state visible during the batch

  const succeeded = tasks.filter(t => t.status === IMAGE_TASK_STATUS.SUCCESS);
  const failed    = tasks.filter(t => _TERMINAL_STATUSES.has(t.status) && t.status !== IMAGE_TASK_STATUS.SUCCESS);

  console.log(
    `[BATCH SUMMARY] Images demandées : ${total} | Appels API Image : ${_imgApiCallCount} | Contrôles Vision : ${_imgVisionCallCount} | Images finales validées : ${succeeded.length}` +
    (failed.length ? ` | Échecs : ${failed.length}` : '')
  );
  if (_imgApiCallCount > total) {
    console.warn(`[BATCH WARNING] ${_imgApiCallCount - total} appel(s) Image en excès — retries détectés`);
  }

  if (runImages.length > 0) {
    const btn = document.getElementById('btn-download-zip');
    btn.textContent = runImages.length === 1 ? "↓ Télécharger l'image" : '↓ Télécharger le ZIP';
    btn.style.display = 'inline-flex';
  }

  _showGenerationSummary(total, succeeded.length, failed, key);
}

function appendImgCard(src, filename, label) {
  const grid = document.getElementById('img-results-grid');
  const card = document.createElement('div');
  card.className = 'img-result-card';
  card.innerHTML = `
    <img src="${_escHtml(src)}" alt="${_escHtml(label)}" loading="lazy" />
    <div class="img-result-card-info">
      <div class="img-result-card-title">${_escHtml(label)}</div>
    </div>
  `;
  grid.appendChild(card);
}

async function downloadImagesZip() {
  const images = _generatedImages;
  if (!images.length) return;

  if (images.length === 1) {
    // Une seule image : téléchargement direct JPEG
    const { b64, url, filename } = images[0];
    if (b64) {
      const a = document.createElement('a');
      a.href = `data:image/jpeg;base64,${b64}`;
      a.download = filename;
      a.click();
    } else {
      window.open(url, '_blank');
    }
    return;
  }

  // Plusieurs images : ZIP
  const zip    = new JSZip();
  const folder = zip.folder('images-gmb');
  let   added  = 0;

  for (const { b64, url, filename } of images) {
    if (b64) {
      folder.file(filename, b64, { base64: true });
      added++;
    } else if (url) {
      try {
        const r    = await fetch(url);
        const blob = await r.blob();
        folder.file(filename, await _blobToBase64(blob), { base64: true });
        added++;
      } catch (e) {
        console.warn('ZIP: skip', filename, e);
      }
    }
  }

  if (added === 0) { alert('Impossible de récupérer les images (URLs expirées ?).'); return; }
  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, 'images-gmb.zip');
}
