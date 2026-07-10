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

const CONTEXTE_OPTIONS = [
  { value: 'maison',        label: 'Maison individuelle' },
  { value: 'appartement',   label: 'Appartement' },
  { value: 'immeuble',      label: 'Immeuble' },
  { value: 'commerce',      label: 'Commerce' },
  { value: 'professionnel', label: 'Local professionnel' },
  { value: 'entrepot',      label: 'Entrepôt' },
  { value: 'agricole',      label: 'Bâtiment agricole' },
];

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
    // TODO: UI — propose dedicated auto contexts instead of building types:
    // Autoroute, Route nationale, Route départementale, Rue en ville,
    // Parking, Domicile, Garage / atelier, Station-service, Aire de repos
    context_map: {
      maison:        'parked on a residential street or in a driveway outside a house',
      appartement:   'parked on an urban street near an apartment building',
      immeuble:      'parked on a busy urban road, low-rise buildings in background',
      commerce:      'parked in a commercial car park or retail area',
      professionnel: 'parked in a business estate or light-industrial area',
      entrepot:      'parked in an industrial estate access road',
      agricole:      'stopped on a rural road or departmental route, fields in background',
    },
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
const _USE_PROMPT_BUILDER  = true;
const _USE_GPT_SCENE_JSON  = true; // false = use buildDallePromptV2 as-is (no GPT refinement)

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
      _trigger_service: 'fuit|reparation|infiltrat',
      scenarios: [
        {
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
      ],
      // Fallback: flat small roof (no fuite/réparation trigger match)
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
    'slight horizon tilt',
    'mild overexposure in bright areas',
    'light JPEG compression artifacts',
    'slight barrel distortion at edges',
    'muted color saturation',
    'minor motion blur on foreground detail',
  ],
  rare: [
    'finger partially visible at frame corner',
    'obvious lens smudge on one side',
    'water droplet on lens surface',
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
        const picked = _pick(realism.scenarios, 1, scenSeed)[0];
        if (picked) {
          realism = Object.assign({}, realism, picked);
          if (realism.scene_camera)  obj.camera_position = realism.scene_camera;
          if (realism.scene_framing) obj.framing          = realism.scene_framing;
          if (realism.scene_debris)  obj.site_debris      = realism.scene_debris;
          if (Array.isArray(realism.scene_exclude)) obj.exclude = [...(obj.exclude || []), ...realism.scene_exclude];
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

function _applyVariation(jsonStr, imageIndex) {
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
  obj.var_light   = lightLib.length ? _pick(lightLib,          1, seed + 7 )[0] : null;
  obj.var_framing = _pick(VARIATION_ENGINE.framing_emphasis,   1, seed + 13)[0] || null;

  return JSON.stringify(obj);
}

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

      // 8 — People (positive framing only, no negative lists)
      s.no_people
        ? 'Empty worksite — no workers or people in the scene.'
        : 'Workers in casual work clothes visible on site.',

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
function buildDallePromptV2(row) {
  const work = _getWorkDetail(row.travaux);
  const city = _getCityContext(row.ville);
  const isInt = work.setting === 'interior';

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

  const roadContext = (work.context_map || {})[row.contexte] || null;

  return JSON.stringify({
    photo_goal:        'work-progress documentation by French contractor, cheap Android smartphone',
    location:          (row.ville || '').trim() ? `${row.ville.trim()}, France` : 'France',
    work_type:         work.intro,
    setting:           isInt ? 'interior' : 'exterior',
    state:             stateData.description || stateKey,
    state_level:       stateKey,
    camera_position:   work.camera,
    framing:           stateData.framing || { work_pct: 55, foreground: '', midground: '', background: '' },
    site_debris:       stateData.debris  || 'construction debris on site',
    photo_defects:     work.photo_defects,
    architecture:      city.arch,
    light:             meteo,
    contexte:          row.contexte || 'maison',
    roadside_context:  roadContext,
    exclude:           work.exclusions || [],
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
  if (obj.setting === 'interior' && (obj.framing?.background || '').toLowerCase().includes('sky'))
    issues.push('interior scene has sky in background — incoherent');
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
  if (obj.setting === 'interior' && (obj.framing?.background || '').toLowerCase().includes('sky'))
    issues.push('interior scene has sky in background — incoherent');
  if (obj.setting === 'exterior' && (obj.camera_position || '').toLowerCase().includes('inside'))
    issues.push('exterior work but camera is inside — incoherent');
  return issues;
}

// ─── GPT scene planner: JSON → camera-first image prompt ─────────────────────
const _IMG_REWRITE_SYSTEM = `You are an image prompt engineer for realistic construction-site smartphone photography.

You receive a structured JSON scene description and convert it into a precise image generation prompt.

PRIORITY ORDER (most important first):
1. PHOTO TYPE — establish from photo_goal, in positive language only. Example: "Ordinary work-progress snapshot taken on a cheap Android smartphone."
2. CAMERA COMPOSITION — use camera_position and framing to describe the scene spatially: where each element sits, what % of the frame it occupies. The construction work must fill work_pct% of the image.
3. SCENE CONTENT — work_type, state, key elements visible.
4. PHOTO DEFECTS — include exactly the defects listed in photo_defects, nothing extra.
5. CONTEXT — architecture style, light/weather condition.

Rules:
- Maximum 200 words
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
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
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
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error('Scene planner error: ' + (err.error?.message || resp.statusText));
  }
  const data = await resp.json();
  return data.choices[0].message.content.trim();
}

function _escHtml(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function addImgRow() {
  const id = ++_imgCounter;
  _imgRows.push({ id, fiche: '', travaux: '', ville: '', contexte: 'maison', etat: 'encours', meteo: 'auto', nb: 3, status: 'pending', images: [] });
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
  const contexteLabel  = (CONTEXTE_OPTIONS.find(o => o.value === (row.contexte || 'maison')) || CONTEXTE_OPTIONS[0]).label;
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

function _renderImgCard(row, idx) {
  const num    = String(idx + 1).padStart(2, '0');
  const stTxt  = row.status === 'running' ? '⏳' :
                 row.status === 'done'    ? `✅ ${row.images.length}` :
                 row.status === 'error'   ? '❌' : '–';

  const serviceDatalist = SERVICE_PRESETS.map(s => `<option value="${_escHtml(s)}">`).join('');
  const contexteOpts    = CONTEXTE_OPTIONS.map(o =>
    `<option value="${o.value}"${(row.contexte || 'maison') === o.value ? ' selected' : ''}>${o.label}</option>`).join('');
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
        <label>Service</label>
        <input type="text" value="${_escHtml(row.travaux)}"
          placeholder="Démoussage toiture, élagage, carrelage..."
          list="img-service-list-${row.id}"
          oninput="updateImgRow(${row.id},'travaux',this.value)" />
        <datalist id="img-service-list-${row.id}">${serviceDatalist}</datalist>
      </div>
      <div class="img-plan-row2">
        <div class="img-plan-field">
          <label>Ville</label>
          <input type="text" value="${_escHtml(row.ville||'')}" placeholder="Lyon, Bordeaux..."
            oninput="updateImgRow(${row.id},'ville',this.value)" />
        </div>
        <div class="img-plan-field">
          <label>Contexte</label>
          <select onchange="updateImgRow(${row.id},'contexte',this.value)">${contexteOpts}</select>
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

async function generateAllImages() {
  const key = document.getElementById('openai-key')?.value.trim();
  if (!key) { alert('Renseigne ta clé API OpenAI (sk-...) en haut de la page.'); return; }

  const rows = _imgRows.filter(r => (r.travaux || '').trim());
  if (!rows.length) { alert('Ajoute au moins une ligne avec un type de travaux.'); return; }

  _generatedImages = [];
  document.getElementById('img-results-grid').innerHTML = '';
  document.getElementById('btn-download-zip').style.display = 'none';

  const total = rows.reduce((s, r) => s + (parseInt(r.nb) || 1), 0);
  let done = 0;

  const progressWrap = document.getElementById('img-progress-wrap');
  const progressBar  = document.getElementById('img-progress-bar');
  const progressLbl  = document.getElementById('img-progress-label');
  progressWrap.style.display = 'block';

  const updateProgress = () => {
    const pct = total > 0 ? Math.round(done / total * 100) : 0;
    progressBar.style.width = pct + '%';
    progressLbl.textContent = `${done} / ${total} images générées`;
  };
  updateProgress();

  document.getElementById('btn-generate-all').disabled = true;

  for (const row of rows) {
    row.status = 'running';
    row.images = [];
    renderImgPlanning();

    const nb         = parseInt(row.nb) || 1;
    const baseScene  = buildDallePromptV2(row);
    const slug       = slugify(row.fiche || row.travaux);

    // Validate scene before sending to GPT
    const sceneIssues = _validateScene(baseScene);
    if (sceneIssues.length) {
      row.status = 'error';
      renderImgPlanning();
      console.warn('[scene validation]', sceneIssues);
      done += nb;
      updateProgress();
      continue;
    }

    // GPT refinement (once per row, outside image loop)
    let jsonScene = baseScene;
    if (_USE_GPT_SCENE_JSON) {
      progressLbl.textContent = `Optimisation scène ${done + 1}/${total}…`;
      jsonScene = await _generateSceneJSON(baseScene, key);
    }

    let rowOk = true;
    for (let i = 0; i < nb; i++) {
      try {
        // Step 1: apply SITE_REALISM (varies photo_defects + tools per image)
        const realistScene = _applySiteRealism(jsonScene, i);

        // Step 1b: apply VARIATION_ENGINE (varies viewpoint + light per image)
        const variedScene  = _applyVariation(realistScene, i);

        // Step 2: build image prompt — PromptBuilder (deterministic) or GPT rewrite (fallback)
        let prompt;
        if (_USE_PROMPT_BUILDER) {
          prompt = PromptBuilder.build(variedScene);
        } else {
          progressLbl.textContent = `Planification scène ${done + 1}/${total}…`;
          prompt = await _rewritePromptWithGPT(variedScene, key);
        }

        // Step 2: generate image
        progressLbl.textContent = `Génération image ${done + 1}/${total}…`;
        let resp = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gpt-image-2',
            prompt,
            n: 1,
            size: '1536x1024',
            quality: 'high',
            output_format: 'jpeg',
            output_compression: 85
          })
        });
        if (!resp.ok) {
          const errBody = await resp.json();
          const errMsg  = errBody.error?.message || '';
          if (errMsg.includes('does not exist') || errMsg.includes('not found') || resp.status === 404) {
            // Fallback gpt-image-1 si gpt-image-2 indisponible
            resp = await fetch('https://api.openai.com/v1/images/generations', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ model: 'gpt-image-1', prompt, n: 1, size: '1024x1024', quality: 'high', output_format: 'jpeg', output_compression: 85 })
            });
          }
          if (!resp.ok) {
            const err2 = await resp.json();
            throw new Error(err2.error?.message || resp.statusText);
          }
        }

        const data     = await resp.json();
        const item     = data.data[0];
        const b64      = item.b64_json || null;
        const imgUrl   = item.url  || null;
        const filename = `${slug}-${String(i + 1).padStart(2, '0')}.jpg`;
        const src      = b64 ? `data:image/jpeg;base64,${b64}` : imgUrl;

        row.images.push({ b64, url: imgUrl, filename });
        _generatedImages.push({ b64, url: imgUrl, filename });
        appendImgCard(src, filename, row.fiche || row.travaux);

        done++;
        updateProgress();
      } catch (e) {
        rowOk = false;
        console.error('DALL-E error:', e);
        done++;
        updateProgress();
      }

      if (i < nb - 1) await new Promise(r => setTimeout(r, 1200));
    }

    row.status = rowOk ? 'done' : 'error';
    renderImgPlanning();
  }

  document.getElementById('btn-generate-all').disabled = false;
  if (_generatedImages.length > 0) {
    const btn = document.getElementById('btn-download-zip');
    btn.textContent = _generatedImages.length === 1 ? '↓ Télécharger l\'image' : '↓ Télécharger le ZIP';
    btn.style.display = 'inline-flex';
  }
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
