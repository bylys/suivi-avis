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

async function renderFiches() {
  const [fiches, avis] = await Promise.all([getFiches(), getAvis()]);
  const ul = document.getElementById('liste-fiches');
  ul.innerHTML = '';
  if (!fiches.length) {
    ul.innerHTML = '<p class="empty-state">Aucune fiche ajoutée.</p>';
    return;
  }
  fiches.forEach(f => {
    const count = avis.filter(a => a.fiche_nom === f.nom).length;
    const li = document.createElement('li');
    const nomLink = f.lien
      ? `<a href="${f.lien}" target="_blank" rel="noopener">${f.nom} 🔗</a>`
      : f.nom;
    li.innerHTML = `<span>${nomLink}</span>
      <span><span class="count">${count} avis</span>
      <button class="btn-delete" onclick="deleteFiche('${f.nom.replace(/'/g,"\\'")}')">🗑</button></span>`;
    ul.appendChild(li);
  });
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
// Basé sur US20170221111A1 (anti-détection : variété texte, longueur, ton)
// + mots-clés travaux/ville pour boost ranking local (US8046371B2)

function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function populateGenFiche() {
  const fiches = await getFiches();
  const dl = document.getElementById('datalist-gen-fiche');
  if (dl) dl.innerHTML = fiches.map(f => `<option value="${f.nom.replace(/"/g,'&quot;')}">`).join('');
}

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

const METIERS = {
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

const GEN_COMMUN = {
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

function genererAvis() {
  const fiche   = document.getElementById('gen-fiche').value.trim();
  const travaux = document.getElementById('gen-travaux').value.trim();
  const ville   = document.getElementById('gen-ville').value.trim();
  const ton     = document.getElementById('gen-ton').value;

  if (!fiche || !travaux || !ville) {
    alert('Merci de remplir les 3 champs obligatoires.');
    return;
  }

  const fill = s => s.replace(/{fiche}/g, fiche).replace(/{travaux}/g, travaux).replace(/{ville}/g, ville);

  // Détecter le métier et charger les phrases adaptées
  const metier = detecterMetier(fiche);
  const M = METIERS[metier] || METIERS.generic;
  const contexteMetier = fill(rnd(M.contextes));
  const specifiqueMetier = rnd(M.specifiques);

  let texte = '';

  if (ton === 'court') {
    texte = fill(rnd(GEN_COMMUN.courts));

  } else if (ton === 'detaille') {
    const intro      = fill(rnd(GEN_COMMUN.intro_details));
    const interv     = rnd(GEN_COMMUN.interventions);
    const qualite    = rnd(GEN_COMMUN.qualites);
    const detail     = rnd(GEN_COMMUN.details.filter(d => d));
    const reco       = fill(rnd(GEN_COMMUN.recommandations));
    texte = [intro, contexteMetier, interv, specifiqueMetier, qualite, detail, reco].filter(Boolean).join(' ');

  } else if (ton === 'enthousiaste') {
    const decouverte = fill(rnd(GEN_COMMUN.decouvertes));
    const contact    = rnd(GEN_COMMUN.contacts.filter(c => c));
    const qualite    = rnd(GEN_COMMUN.qualites);
    const reco       = fill(rnd(GEN_COMMUN.recommandations));
    const suffix = rnd([
      ' Une vraie bonne surprise !',
      ' Exactement ce dont j\'avais besoin.',
      ' Je suis vraiment content du résultat.',
      ' Ça change des mauvaises expériences qu\'on peut avoir !',
      '',
    ]);
    texte = [decouverte + '.', contexteMetier, contact, specifiqueMetier, qualite, reco + suffix].filter(Boolean).join(' ');

  } else { // neutre
    const decouverte = fill(rnd(GEN_COMMUN.decouvertes));
    const contact    = rnd(GEN_COMMUN.contacts);
    const qualite    = rnd(GEN_COMMUN.qualites);
    const detail     = Math.random() > 0.4 ? rnd(GEN_COMMUN.details) : '';
    const reco       = fill(rnd(GEN_COMMUN.recommandations));
    texte = [decouverte + '.', contact, specifiqueMetier, qualite, detail, reco].filter(Boolean).join(' ');
  }

  texte = texte.replace(/\s+/g, ' ').trim();

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
