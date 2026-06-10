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

async function renderFiches() {
  const [fiches, avis] = await Promise.all([getFiches(), getAvis()]);
  const ul = document.getElementById('liste-fiches');
  ul.innerHTML = '';
  if (!fiches.length) {
    ul.innerHTML = '<p class="empty-state">Aucune fiche ajoutée.</p>';
    return;
  }
  fiches.forEach(f => {
    // Stocker les données dans la map globale (pas d'échappement nécessaire)
    _ficheData[f.id] = f;

    const count = avis.filter(a => a.fiche_nom === f.nom).length;
    const li = document.createElement('li');

    // Ligne principale
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

    const btnLien = document.createElement('button');
    btnLien.className = 'btn-edit-lien';
    btnLien.textContent = '✏️ Lien';
    btnLien.onclick = () => toggleLienEdit(f.id);

    const btnMerge = document.createElement('button');
    btnMerge.className = 'btn-merge';
    btnMerge.textContent = '🔀 Fusionner';
    btnMerge.onclick = () => toggleMerge(f.id);

    const btnDel = document.createElement('button');
    btnDel.className = 'btn-delete';
    btnDel.textContent = '🗑';
    btnDel.onclick = () => deleteFiche(f.nom);

    actions.append(countSpan, btnLien, btnMerge, btnDel);
    row.append(nomSpan, actions);

    // Zone édition lien
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

    // Zone fusion
    const mergeEdit = document.createElement('div');
    mergeEdit.className = 'fiche-merge-edit hidden';
    mergeEdit.id = 'merge-edit-' + f.id;

    const mergeLabel = document.createElement('span');
    mergeLabel.className = 'merge-label';
    mergeLabel.innerHTML = 'Fusionner les avis de <b>' + f.nom + '</b> vers :';

    const mergeSelect = document.createElement('select');
    mergeSelect.className = 'merge-select';
    mergeSelect.id = 'merge-val-' + f.id;
    fiches.filter(x => x.id !== f.id).forEach(x => {
      const opt = document.createElement('option');
      opt.value = x.nom;
      opt.textContent = x.nom;
      mergeSelect.appendChild(opt);
    });

    const btnMergeConfirm = document.createElement('button');
    btnMergeConfirm.className = 'btn-save-lien btn-merge-confirm';
    btnMergeConfirm.textContent = '✅ Fusionner & supprimer';
    btnMergeConfirm.onclick = () => mergeFiche(f.id);

    mergeEdit.append(mergeLabel, mergeSelect, btnMergeConfirm);

    li.append(row, lienEdit, mergeEdit);
    ul.appendChild(li);
  });
}

function toggleMerge(id) {
  const div = document.getElementById(`merge-edit-${id}`);
  div.classList.toggle('hidden');
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

function toggleLienEdit(id) {
  const div = document.getElementById(`lien-edit-${id}`);
  div.classList.toggle('hidden');
  if (!div.classList.contains('hidden')) {
    document.getElementById(`lien-val-${id}`).focus();
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
  let avis = await getAvis();
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
    renderRappelsBanner([]);
    return;
  }

  const rappelsDus = getRappelsDus(avis);
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
let chartVolume, chartNote, chartRep;

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
  const repartition = [1,2,3,4,5].map(n => avis.filter(a => a.note === n).length);

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

  if (chartRep) chartRep.destroy();
  chartRep = new Chart(document.getElementById('chart-repartition'), {
    type: 'bar',
    data: {
      labels: ['1★','2★','3★','4★','5★'],
      datasets: [{ data: repartition, backgroundColor: ['#e53935','#fb8c00','#fdd835','#43a047','#1a73e8'], borderRadius: 6 }]
    },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
  });
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
  { jours: 8,  depuis: ['j0'],                 label: 'J+7'  },
  { jours: 15, depuis: ['j0','j7'],             label: 'J+14' },
  { jours: 22, depuis: ['j0','j7','j14'],       label: 'J+21' },
  { jours: 31, depuis: ['j0','j7','j14','j21'], label: 'J+30' },
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
      "J'avais un arbre dans mon jardin à {v} qui commençait à poser problème. J'ai contacté {f} pour des {t} et le travail a été fait sérieusement. Devis clair, intervention propre, tout le bois évacué en fin de journée. Je recommande.",
      "Plusieurs arbres de ma propriété à {v} avaient besoin d'une taille sérieuse. {f} est intervenu pour les {t} et le résultat est vraiment bien. L'élagueur connaissait son métier et a bien respecté la forme naturelle des arbres. Très satisfait.",
      "Je cherchais quelqu'un de fiable pour des {t} à {v}, on m'a recommandé {f}. Intervention rapide, équipe compétente, prix honnête. Les arbres ont été taillés correctement, tout nettoyé avant de partir. Rien à redire.",
      "Voici mon retour après avoir sollicité {f} pour des {t} à {v}. Contact agréable, devis rapide et conforme à ce qui avait été discuté. Sur le chantier, l'équipe a travaillé efficacement et dans le respect de la propriété. Je recommande.",
    ],
    enthousiaste: [
      "Je suis vraiment content d'avoir fait appel à {f} pour des {t} à {v} ! L'équipe est arrivée à l'heure, bien équipée, et le résultat est bluffant. Le jardin est méconnaissable. Tarif honnête et travail impeccable. Je les recommande les yeux fermés !",
      "Franchement, quelle bonne surprise avec {f} ! J'appréhendais un peu les {t} à {v} mais tout s'est passé parfaitement. L'équipe était sympa, professionnelle, et le bois a été évacué en un rien de temps. Je referai appel à eux sans hésiter.",
      "Top prestation de {f} pour des {t} à {v} ! Réactifs, efficaces, et vraiment soigneux avec la propriété. Le jardin est nickel, on est ravis du résultat. Une adresse à garder précieusement.",
    ],
    detaille: [
      "Suite à une tempête, une grosse branche menaçait de tomber sur ma clôture à {v}. J'ai contacté {f} pour les {t}. Le couvreur est passé évaluer la situation le lendemain, a proposé une solution adaptée et l'intervention a eu lieu dans la semaine. Le travail a été réalisé avec soin, en toute sécurité, et les branchages ont été entièrement évacués. Prix conforme au devis, aucune mauvaise surprise. Je recommande sans hésiter.",
      "Propriétaire à {v}, j'avais plusieurs arbres à traiter en même temps. J'ai demandé des devis à plusieurs entreprises avant de choisir {f} pour les {t}. Le prix était compétitif et le sérieux de l'équipe lors de la visite m'a convaincu. Sur le chantier, ils ont travaillé méthodiquement, en commençant par sécuriser les accès. Résultat impeccable, jardin laissé propre. Je recommande.",
    ],
    court: [
      "{f} pour des {t} à {v}. Sérieux, efficace, prix honnête. Je recommande.",
      "Très bonne prestation de {f} pour {t} à {v}. Travail propre et soigné.",
      "{t} à {v} par {f}. Délais respectés, résultat nickel. À recommander.",
    ],
  },

  ravalement: {
    neutre: [
      "Notre façade à {v} était en mauvais état depuis quelques années. Après plusieurs devis, nous avons choisi {f} pour le {t}. L'équipe a bien préparé le support avant d'appliquer l'enduit, les finitions sont soignées. La maison semble rénovée. Très satisfait.",
      "J'ai fait appel à {f} pour un {t} à {v}. Dès la visite technique, j'ai senti que c'était des professionnels sérieux. Ils ont traité les fissures correctement et appliqué un enduit de qualité. Le rendu final est vraiment beau. Je recommande.",
      "Pour notre {t} à {v}, nous avons choisi {f} après comparaison de plusieurs entreprises. Travail propre, délais respectés, résultat impeccable. Le prix correspondait au devis. À recommander.",
    ],
    enthousiaste: [
      "Wow, quelle transformation ! {f} a réalisé notre {t} à {v} et la façade est méconnaissable. L'équipe était au top, les finitions sont parfaites et le chantier s'est déroulé sans accroc. On est vraiment ravis du résultat !",
      "Vraiment bluffant le travail de {f} pour notre {t} à {v}. La maison semble neuve, les voisins nous ont tous félicités ! Équipe sérieuse, prix honnête, et un résultat qui dépasse nos attentes. Je recommande chaleureusement.",
    ],
    detaille: [
      "Nous avions des problèmes d'humidité dus à une façade dégradée à {v}. {f} est intervenu pour le {t} : ils ont commencé par un diagnostic complet, traité les remontées capillaires, puis appliqué un enduit hydrofuge adapté. Les teintes ont été choisies avec nous. Le résultat est excellent et le problème d'humidité réglé. Je recommande.",
      "Le {t} de notre maison à {v} était un chantier conséquent. {f} nous a accompagnés de A à Z : visite technique, choix des matériaux, planning détaillé. Sur le chantier, l'équipe était organisée et soigneuse. Les finitions aux encadrements et autour des fenêtres sont précises. Délais tenus, prix conforme. Très satisfait.",
    ],
    court: [
      "{f} pour notre {t} à {v}. Travail soigné, bon rapport qualité-prix. Je recommande.",
      "Bon professionnel pour {t} à {v}. Devis honnête, résultat impeccable.",
      "Très satisfait du {t} réalisé par {f} à {v}. Sérieux et efficace.",
    ],
  },

  couvreur: {
    neutre: [
      "J'ai contacté {f} pour des {t} à {v} suite à une infiltration. Le couvreur est venu rapidement, a identifié le problème et l'a réparé proprement. Plus aucune infiltration depuis. Je recommande pour leur réactivité et leur sérieux.",
      "Notre toiture avait besoin d'une réfection. {f} a réalisé les {t} à {v} dans les délais convenus et pour le prix du devis. La charpente a été vérifiée, les tuiles posées avec soin. Travail solide. Très satisfait.",
      "Voici mon retour sur l'intervention de {f} pour des {t} à {v}. Du premier contact à la fin du chantier, tout s'est bien passé. Devis détaillé, intervention soignée, nettoyage avant départ. Je recommande.",
    ],
    enthousiaste: [
      "Vraiment top ! {f} est intervenu pour des {t} à {v} en urgence et l'équipe a été au rendez-vous. Réactifs, compétents, et le travail est nickel. La toiture est comme neuve. Je les recommande sans hésitation à tous les propriétaires de {v} !",
      "Excellente expérience avec {f} pour nos {t} à {v}. Le couvreur a pris le temps d'inspecter toute la surface, nous a bien expliqué ce qu'il allait faire et pourquoi. Résultat parfait, plus aucun souci d'étanchéité. Vraiment content !",
    ],
    detaille: [
      "Après plusieurs hivers difficiles, notre toiture à {v} nécessitait une réfection sérieuse. {f} est passé évaluer l'état de la charpente et des tuiles avant de nous proposer un devis détaillé. L'intervention a duré deux jours : vérification de la charpente, remplacement des tuiles abîmées, réfection de la zinguerie. Tout a été nettoyé avant de partir. Facture conforme au devis. Je recommande.",
    ],
    court: [
      "{f} pour {t} à {v}. Réactif, sérieux, bon travail. Je recommande.",
      "Très bonne intervention de {f} pour {t} à {v}. Efficace et propre.",
      "{t} à {v} par {f}. Résultat impeccable, prix honnête.",
    ],
  },

  nettoyage_toiture: {
    neutre: [
      "La toiture de notre maison à {v} était couverte de mousse. {f} est intervenu pour le {t} et le résultat est vraiment bien. Les tuiles ont retrouvé leur couleur et un traitement préventif a été appliqué. Bon travail, prix honnête.",
      "Nous avons fait appel à {f} pour le {t} à {v}. Le nettoyage haute pression a été bien maîtrisé, les tuiles n'ont pas été abîmées. Un traitement hydrofuge a été appliqué en finition. Résultat propre, on est contents.",
      "Suite aux recommandations d'un voisin, j'ai contacté {f} pour le {t} de notre maison à {v}. Travail propre, équipe sérieuse et tarif raisonnable. Les gouttières ont été nettoyées en même temps. Je recommande.",
    ],
    enthousiaste: [
      "Impressionnant le résultat ! {f} a fait le {t} de notre maison à {v} et la toiture est comme neuve. On ne s'attendait pas à une telle différence. Équipe sérieuse, propre et efficace. On recommande vraiment !",
      "Vraiment content d'avoir fait appel à {f} pour le {t} à {v}. Le résultat est bluffant, les tuiles ont retrouvé leur couleur d'origine. L'équipe était ponctuelle et a tout nettoyé avant de partir. Parfait !",
    ],
    detaille: [
      "Notre toiture à {v} n'avait pas été entretenue depuis des années, la mousse commençait à soulever les tuiles. {f} est intervenu pour le {t} : nettoyage haute pression avec réglage adapté pour ne pas endommager les tuiles, puis application d'un traitement hydrofuge longue durée. Les gouttières ont également été nettoyées. Résultat visible de loin, la toiture est propre et protégée. Je recommande.",
    ],
    court: [
      "{f} pour {t} à {v}. Résultat nickel, bon rapport qualité-prix.",
      "Très bon {t} réalisé par {f} à {v}. Propre et efficace.",
      "{f} à {v}, {t} impeccable. Je recommande.",
    ],
  },

  terrassement: {
    neutre: [
      "Nous avions besoin d'un terrassement pour aménager notre jardin à {v}. {f} a réalisé les {t} avec des engins adaptés. Le nivellement est précis et tout a été laissé propre. Très bonne expérience.",
      "J'ai contacté {f} pour des {t} à {v} dans le cadre d'une création de terrasse. Devis rapide, travail soigné, délais respectés. L'équipe a bien géré les contraintes du terrain. Résultat conforme à mes attentes.",
    ],
    enthousiaste: [
      "Super travail de {f} pour nos {t} à {v} ! L'équipe est arrivée avec le bon matériel et a tout réalisé en une journée. Le terrain est parfaitement nivelé. On est ravis, on recommande !",
    ],
    detaille: [
      "Pour la création d'une terrasse à {v}, nous avions besoin de {t} conséquents. {f} est passé évaluer le terrain, a proposé un planning et un devis détaillé. L'intervention s'est déroulée sur deux jours : terrassement, évacuation des terres, compactage. Le résultat est précis, conforme aux plans. Tarif compétitif et équipe sérieuse. Je recommande.",
    ],
    court: [
      "{f} pour {t} à {v}. Travail propre et soigné. Je recommande.",
      "Très satisfait des {t} réalisés par {f} à {v}. Sérieux et efficace.",
    ],
  },

  maconnerie: {
    neutre: [
      "Nous avions une fissure sur un mur porteur à {v}. {f} est intervenu pour les {t} avec sérieux. Diagnostic précis, travail solide, explications claires. La réparation est bien faite. Je recommande.",
      "J'ai sollicité {f} pour des {t} à {v} dans le cadre d'une extension. L'équipe était compétente et le travail bien organisé. Les murs sont droits, les joints bien faits. Bonne expérience.",
    ],
    enthousiaste: [
      "Vraiment satisfait de l'intervention de {f} pour nos {t} à {v} ! On appréhendait un peu ce type de travaux mais l'équipe a tout géré avec professionnalisme. Résultat solide et bien fini. On recommande sans hésiter !",
    ],
    detaille: [
      "Une reprise en sous-œuvre était nécessaire pour notre maison à {v} suite à un tassement. {f} a d'abord réalisé un diagnostic complet avant de proposer une solution adaptée. Les {t} ont été réalisés méthodiquement : étaiement, terrassement localisé, coulage du béton de fondation. Travail sérieux, sans précipitation. La structure est maintenant stabilisée. Je recommande.",
    ],
    court: [
      "{f} pour {t} à {v}. Travail solide et bien fait. Je recommande.",
      "Très bon travail de {f} pour {t} à {v}. Sérieux et professionnel.",
    ],
  },

  carreleur: {
    neutre: [
      "J'ai fait poser un carrelage dans ma cuisine à {v} par {f}. Les joints sont réguliers, les découpes précises même dans les angles. L'artisan a bien préparé le support avant la pose. Travail soigné, je recommande.",
      "Pour les {t} dans ma salle de bain à {v}, j'ai choisi {f}. Bon travail : carrelage bien posé, joints propres, aucune tuile qui sonne creux. Artisan ponctuel, chantier laissé propre. Satisfait.",
    ],
    enthousiaste: [
      "Superbe travail de {f} pour les {t} à {v} ! Le résultat est vraiment beau, on est bluffés par la précision des découpes et la régularité des joints. L'artisan était de bon conseil sur le choix des matériaux. On recommande chaleureusement !",
    ],
    detaille: [
      "Rénovation complète de notre salle de bain à {v} avec {f} pour les {t}. L'artisan a commencé par un ragréage soigneux du sol avant la pose, ce qui est indispensable pour un bon résultat. Les carreaux grand format ont été posés avec soin, les joints sont impeccables et homogènes. Les découpes autour des tuyaux et dans les angles sont précises. Aucune tuile ne sonne creux. Je recommande ce professionnel.",
    ],
    court: [
      "{f} pour {t} à {v}. Pose soignée, joints parfaits. Je recommande.",
      "Très satisfait des {t} réalisés par {f} à {v}. Propre et précis.",
    ],
  },

  peintre: {
    neutre: [
      "Notre appartement à {v} avait besoin d'un rafraîchissement. {f} a réalisé les {t} proprement. Les finitions aux angles sont nettes, la peinture est uniforme. Le mobilier avait été protégé. Très satisfait.",
      "Pour les {t} de notre maison à {v}, nous avons choisi {f}. L'artisan a bien préparé les surfaces avant de peindre. Deux couches appliquées comme convenu, rendu impeccable. Prix honnête, je recommande.",
    ],
    enthousiaste: [
      "Super résultat avec {f} pour les {t} à {v} ! L'appartement est transformé, les couleurs rendent parfaitement et les finitions sont vraiment soignées. L'artisan était ponctuel et avait bien protégé tout le mobilier. On est ravis, on recommande !",
    ],
    detaille: [
      "Nous avons confié les {t} de notre maison à {v} à {f} après rénovation. L'artisan a d'abord rebouché les trous et ponçé les surfaces avant toute mise en peinture, ce qui se voit sur le résultat final. Les bords et les angles ont été masqués avec soin. Deux couches ont été appliquées sur l'ensemble, les couleurs que nous avions choisies rendent très bien. Chantier propre, délais respectés. Je recommande.",
    ],
    court: [
      "{f} pour {t} à {v}. Propre, soigné, résultat nickel.",
      "Très satisfait des {t} de {f} à {v}. Finitions impeccables.",
    ],
  },

  debarras: {
    neutre: [
      "J'avais besoin de vider rapidement un appartement à {v}. {f} est intervenu dans les deux jours pour le {t}. Tout a été trié et évacué proprement, le logement était vide et nettoyé à la fin. Je recommande.",
      "Pour le {t} de la maison de famille à {v}, nous avons fait appel à {f}. Équipe respectueuse et efficace. Tout a été évacué dans la journée, prix transparent. Bonne expérience.",
    ],
    enthousiaste: [
      "Vraiment top le service de {f} pour le {t} à {v} ! L'équipe est venue rapidement, a travaillé vite et bien, et a laissé les lieux propres. On avait des années d'affaires accumulées et tout a été géré en une journée. On recommande !",
    ],
    detaille: [
      "Suite à un déménagement, je devais faire le {t} d'un grand appartement à {v}. {f} est passé estimer le volume, puis est intervenu avec une équipe de trois personnes. Tout a été trié méthodiquement : les objets récupérables ont été mis de côté, les encombrants chargés dans le camion. L'appartement a été balayé avant leur départ. Tarif conforme à l'estimation, bonne organisation. Je recommande.",
    ],
    court: [
      "{f} pour {t} à {v}. Rapide, efficace, résultat propre.",
      "Très satisfait du {t} par {f} à {v}. Sérieux et ponctuel.",
    ],
  },

  plomberie: {
    neutre: [
      "J'avais une fuite chez moi à {v}. {f} est intervenu rapidement pour les {t}. Le plombier a trouvé la cause rapidement et a réparé proprement. Plus de problème depuis. Prix raisonnable, je recommande.",
      "Notre chauffe-eau était en fin de vie à {v}. {f} a géré les {t} du début à la fin : dépose, installation, vérification des raccords. Travail soigné, intervention rapide. Je recommande.",
    ],
    enthousiaste: [
      "Super réactivité de {f} pour les {t} à {v} ! En urgence, le plombier est arrivé rapidement, a trouvé le problème et l'a réglé proprement. On était stressés mais tout s'est très bien passé. On recommande !",
    ],
    detaille: [
      "Dégât des eaux chez nous à {v}, j'ai appelé {f} en urgence pour les {t}. Le plombier est arrivé dans l'heure, a localisé la fuite avec précision, découpé le minimum nécessaire pour accéder à la canalisation et réparé proprement. Il a vérifié l'étanchéité avant de repartir et m'a expliqué comment éviter ce type de problème. Facture conforme à ce qui avait été annoncé. Je recommande.",
    ],
    court: [
      "{f} pour {t} à {v}. Réactif, efficace. Je recommande.",
      "Très bon plombier pour {t} à {v}. Sérieux et propre.",
    ],
  },

  electricite: {
    neutre: [
      "Notre installation électrique à {v} n'était plus aux normes. {f} a réalisé les {t} sérieusement : tableau refait, gaines bien posées, tout étiqueté. Un certificat de conformité nous a été remis. Je recommande.",
      "Pour la mise aux normes électriques à {v}, nous avons choisi {f}. Très bon travail : diagnostic complet, devis détaillé, intervention propre. L'électricien a été transparent tout au long du chantier. Je recommande.",
    ],
    enthousiaste: [
      "Vraiment satisfait de {f} pour les {t} à {v} ! L'électricien connaissait parfaitement son métier, a tout bien expliqué et le résultat est impeccable. Le tableau est refait proprement et tout est aux normes. On recommande !",
    ],
    detaille: [
      "Notre maison à {v} avait un tableau électrique vétuste et une installation non conforme. {f} a commencé par un diagnostic complet de l'installation existante avant de proposer un devis détaillé pour les {t}. L'intervention a duré deux jours : remplacement du tableau, mise en conformité des circuits, pose de nouvelles prises. Tout est étiqueté, le travail est invisible une fois les goulettes en place. Certificat de conformité remis. Je recommande.",
    ],
    court: [
      "{f} pour {t} à {v}. Travail soigné et conforme. Je recommande.",
      "Très satisfait des {t} de {f} à {v}. Professionnel et sérieux.",
    ],
  },

  auto: {
    neutre: [
      "En panne à {v}, j'ai appelé {f} pour les {t}. Le dépanneur est arrivé en moins de 30 minutes, a diagnostiqué le problème et m'a dépanné sur place. Professionnel et prix correct. Je recommande.",
      "Suite à une panne à {v}, j'ai contacté {f}. Prise en charge rapide, le technicien m'a bien expliqué le problème. Intervention soignée et tarif conforme à ce qui avait été annoncé. Bonne expérience.",
    ],
    enthousiaste: [
      "Super service de {f} pour les {t} à {v} ! Arrivée rapide, diagnostic immédiat et dépannage efficace. Le technicien était sympa et compétent. Je me suis senti en de bonnes mains. Je recommande !",
    ],
    detaille: [
      "Ma voiture est tombée en panne sur la route à {v}. J'ai appelé {f} pour les {t}. Le dépanneur est arrivé en 25 minutes, a d'abord fait un diagnostic complet du véhicule, puis m'a expliqué clairement d'où venait le problème et les options disponibles. La réparation a pu être faite sur place, ce qui m'a évité un remorquage. Prix annoncé avant intervention, facture conforme. Je recommande.",
    ],
    court: [
      "{f} pour {t} à {v}. Réactif et efficace. Je recommande.",
      "Très bon dépannage par {f} à {v}. Rapide et professionnel.",
    ],
  },

  nettoyage: {
    neutre: [
      "Nous avons fait appel à {f} pour le {t} à {v}. L'équipe est venue avec le matériel adapté et le résultat est vraiment propre. Intervention dans les délais, prix honnête. Je recommande.",
      "Pour le {t} de notre terrasse à {v}, j'ai choisi {f}. Nettoyage bien réalisé sans abîmer le revêtement. Résultat impeccable. Équipe sérieuse, je referai appel à eux.",
    ],
    enthousiaste: [
      "Super travail de {f} pour le {t} à {v} ! On ne s'attendait pas à un tel résultat. Tout est comme neuf. L'équipe était efficace et a tout nettoyé derrière elle. On recommande !",
    ],
    detaille: [
      "Nos locaux à {v} avaient besoin d'un {t} en profondeur avant une remise en location. {f} est venu évaluer le travail, puis est intervenu avec une équipe équipée de matériel professionnel. Chaque surface a été traitée méthodiquement. Résultat impeccable, les locaux étaient prêts pour l'état des lieux. Tarif conforme au devis. Je recommande.",
    ],
    court: [
      "{f} pour {t} à {v}. Résultat propre, équipe sérieuse.",
      "Très satisfait du {t} par {f} à {v}. Efficace et soigné.",
    ],
  },

  generic: {
    neutre: [
      "J'ai fait appel à {f} pour des {t} à {v} et j'en suis très satisfait. Devis clair, travail réalisé dans les délais, résultat conforme à ce qui avait été convenu. Je recommande.",
      "Très bonne expérience avec {f} pour des {t} à {v}. Professionnalisme, ponctualité et travail soigné. Le prix correspondait au devis. Je referai appel à eux.",
      "Pour des {t} à {v}, j'ai choisi {f}. Équipe compétente, intervention bien organisée et résultat à la hauteur. Prix honnête, aucune mauvaise surprise. Je recommande.",
    ],
    enthousiaste: [
      "Vraiment satisfait de {f} pour les {t} à {v} ! Équipe réactive, travail soigné et résultat au-delà de mes attentes. Je recommande sans hésitation !",
      "Excellente prestation de {f} pour des {t} à {v}. Du premier contact à la fin du chantier, tout était parfait. Je referai appel à eux les yeux fermés !",
    ],
    detaille: [
      "Voici mon retour après avoir sollicité {f} pour des {t} à {v}. Dès le premier contact, j'ai apprécié le sérieux de l'équipe : devis détaillé, planning respecté, communication claire tout au long du chantier. Le travail a été réalisé proprement et dans les délais prévus. Résultat conforme à nos attentes et prix conforme au devis. Je recommande cette entreprise.",
    ],
    court: [
      "{f} pour {t} à {v}. Sérieux, efficace, je recommande.",
      "Très bonne prestation de {f} pour {t} à {v}. Travail propre.",
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

function genererAvis() {
  const fiche   = document.getElementById('gen-fiche').value.trim();
  const travaux = document.getElementById('gen-travaux').value.trim();
  const ville   = document.getElementById('gen-ville').value.trim();
  const ton     = document.getElementById('gen-ton').value;

  if (!fiche || !travaux || !ville) {
    alert('Merci de remplir les 3 champs obligatoires.');
    return;
  }

  // Supprime les articles définis/indéfinis juste avant {t} pour que
  // l'utilisateur puisse écrire librement sa propre formulation avec article
  // ex: "l'élagage de mon pin", "le nettoyage de ma toiture", "des travaux de couverture"
  const fill = s => s
    .replace(/\b(des|les|le|la|l'|un|une|nos|notre|du)\s+\{t\}/gi, '{t}')
    .replace(/{t}/g, travaux.toLowerCase())
    .replace(/{f}/g, fiche)
    .replace(/{v}/g, ville);

  const metier = detecterMetier(fiche);
  const cat = TEMPLATES[metier] || TEMPLATES.generic;

  // Choisir le pool selon le ton, fallback sur neutre si ton non défini
  const pool = cat[ton] || cat.neutre || cat[Object.keys(cat)[0]];

  // Éviter de retomber sur le même avis
  const disponibles = pool.filter(t => !_genHistory.includes(t));
  const source = disponibles.length > 0 ? disponibles : pool;
  const template = rnd(source);

  _genHistory.push(template);
  if (_genHistory.length > Math.max(1, pool.length - 1)) _genHistory.shift();

  const texte = humaniser(fill(template).replace(/\s+/g, ' ').trim());

  const result = document.getElementById('gen-result');
  const textEl = document.getElementById('gen-texte');
  result.classList.remove('hidden');
  textEl.textContent = texte;
  document.getElementById('gen-copy-confirm').classList.add('hidden');
}

function copierAvis() {
  const texte = document.getElementById('gen-texte').textContent;
  navigator.clipboard.writeText(texte).then(() => {
    const confirm = document.getElementById('gen-copy-confirm');
    confirm.classList.remove('hidden');
    setTimeout(() => confirm.classList.add('hidden'), 2500);
  });
}

// ── AUTO-LOGIN ──
if (sessionStorage.getItem('gmb_auth')) {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  init();
}
