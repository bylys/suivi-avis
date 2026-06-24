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
async function getAvis() {
  return await sbGet('avis', 'select=*&order=date.desc');
}

async function getFiches() {
  return await sbGet('fiches', 'select=*&order=nom.asc');
}

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
  if (name === 'reco') renderRecommandations();
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

async function addFiche(e) {
  e.preventDefault();
  const nom  = document.getElementById('fiche-nom').value.trim();
  const lien = document.getElementById('fiche-lien').value.trim();
  if (!nom) return;
  const fiches = await getFiches();
  if (fiches.find(f => f.nom === nom)) return alert('Cette fiche existe déjà.');
  await sbInsert('fiches', { nom, lien: lien || null });
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
  const fiche_nom = document.getElementById('form-fiche').value.trim();
  const auteur    = document.getElementById('form-auteur').value.trim();
  const note      = parseInt(document.getElementById('form-note').value);
  const date      = document.getElementById('form-date').value;
  const statut    = document.getElementById('form-statut').value;
  const texte     = document.getElementById('form-texte').value.trim();
  const lien      = document.getElementById('form-lien').value.trim();
  const reponse   = document.getElementById('form-reponse').value.trim();
  const photo     = document.getElementById('form-photo').checked;

  if (!fiche_nom || !auteur || !note || !date || !statut) return;

  const today = new Date().toISOString().split('T')[0];
  const ok = await sbInsert('avis', {
    fiche_nom, auteur, note, date, statut, photo,
    texte: texte || null,
    lien: lien || null,
    reponse: reponse || null,
    statut_date: today
  });
  if (!ok) { alert('Erreur lors de l\'enregistrement.'); return; }

  document.getElementById('form-avis').reset();
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
      <th>Date</th><th>Fiche GMB</th><th>Gmail</th><th>Note</th>
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
  const openMonths = new Set();
  document.querySelectorAll('.month-group[open]').forEach(el => {
    openMonths.add(el.dataset.month);
  });
  await renderListe(openMonths);
}

async function updateStatut(id, newStatut) {
  const today = new Date().toISOString().split('T')[0];
  await sbUpdate('avis', id, { statut: newStatut, statut_date: today });
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
  document.getElementById('stat-moyenne').textContent   = moyenne !== '–' ? moyenne + ' ★' : '–';
  document.getElementById('stat-positifs').textContent  = moisAvis.filter(a => a.note >= 4).length;
  document.getElementById('stat-negatifs').textContent  = moisAvis.filter(a => a.note <= 2).length;
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
const RAPPELS = [
  { jours: 8,  depuis: ['j0'],  label: 'J+7'  },
  { jours: 8,  depuis: ['j7'],  label: 'J+14' },
  { jours: 8,  depuis: ['j14'], label: 'J+21' },
  { jours: 10, depuis: ['j21'], label: 'J+30' },
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
    // Utiliser statut_date si dispo, sinon date de l'avis
    const refDate = a.statut_date || a.date;
    const age = daysDiff(refDate);
    let best = null;
    for (const r of RAPPELS) {
      if (age >= r.jours && r.depuis.includes(a.statut)) {
        best = r;
      }
    }
    if (best) dus.push({ avis: a, label: best.label });
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
