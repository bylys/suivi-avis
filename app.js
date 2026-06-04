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

  const ok = await sbInsert('avis', {
    fiche_nom, auteur, note, date, statut, photo,
    texte: texte || null,
    lien: lien || null,
    reponse: reponse || null
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
    <td class="avis-date">${formatDate(a.date)}</td>
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

async function updateStatut(id, newStatut) {
  await sbUpdate('avis', id, { statut: newStatut });
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
  { jours: 7,  depuis: ['j0'],                 label: 'J+7'  },
  { jours: 14, depuis: ['j0','j7'],             label: 'J+14' },
  { jours: 21, depuis: ['j0','j7','j14'],       label: 'J+21' },
  { jours: 30, depuis: ['j0','j7','j14','j21'], label: 'J+30' },
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
    const age = daysDiff(a.date);
    // On cherche le palier le plus élevé atteint (pas le premier)
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

const GEN = {
  decouvertes: [
    "J'ai fait appel à {fiche} pour {travaux} à {ville}",
    "Suite à un besoin de {travaux} sur {ville}, j'ai contacté {fiche}",
    "Après avoir cherché un professionnel pour {travaux} à {ville}, j'ai choisi {fiche}",
    "Notre maison à {ville} nécessitait des {travaux}. Nous avons sollicité {fiche}",
    "Pour des travaux de {travaux} dans ma propriété à {ville}, j'ai fait confiance à {fiche}",
    "J'avais besoin d'un spécialiste pour {travaux} à {ville} et j'ai trouvé {fiche}",
    "Propriétaire à {ville}, j'ai eu recours à {fiche} pour {travaux}",
    "C'est en cherchant une entreprise sérieuse pour {travaux} sur {ville} que j'ai découvert {fiche}",
  ],
  contacts: [
    "Le premier contact a été rapide et professionnel.",
    "Dès le premier appel, j'ai été bien renseigné.",
    "La prise en charge a été immédiate.",
    "Le devis est arrivé rapidement, clair et sans surprise.",
    "Devis reçu dans la journée, très détaillé.",
    "On m'a rappelé dans les deux heures, c'est appréciable.",
    "",
    "",
  ],
  interventions: [
    "L'équipe est intervenue dans les délais convenus.",
    "Les techniciens sont arrivés à l'heure prévue.",
    "L'intervention a été réalisée proprement et dans les temps.",
    "Le chantier a été mené de bout en bout avec sérieux.",
    "Les ouvriers ont travaillé efficacement, sans laisser de désordre.",
    "Le travail a été fait dans les délais annoncés, sans mauvaise surprise.",
    "L'équipe était bien équipée et savait exactement ce qu'elle faisait.",
    "Intervention rapide et bien organisée.",
  ],
  qualites: [
    "Travail soigné et de qualité.",
    "Prestation très propre, je suis satisfait du résultat.",
    "La qualité du travail correspond exactement à ce qui avait été annoncé.",
    "Résultat impeccable, conforme à mes attentes.",
    "Excellent niveau de finition.",
    "On voit que ce sont des gens du métier, le travail est bien fait.",
    "Très bon rapport qualité-prix.",
    "Le résultat est là et c'est ce qui compte.",
  ],
  details: [
    "Ils ont pris le temps d'expliquer chaque étape.",
    "Le chef de chantier était disponible pour répondre à mes questions.",
    "L'équipe a fait preuve d'un vrai sens du détail.",
    "Ils ont respecté mes contraintes et ma propriété.",
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
    "Une adresse à retenir pour {travaux} dans la région de {ville}.",
    "Très satisfait, je passerai par eux pour mes prochains travaux.",
    "Bonne expérience globale, je recommande.",
  ],

  // Variantes courtes
  courts: [
    "Très bonne prestation de {fiche} pour {travaux} à {ville}. Travail sérieux, délais respectés. Je recommande.",
    "{fiche} est intervenu pour {travaux} chez moi à {ville}. Efficace et propre. Satisfait.",
    "Bon professionnel pour {travaux} à {ville}. Devis honnête, travail de qualité. À recommander.",
    "Fait appel à {fiche} pour {travaux} à {ville}. RAS, tout s'est bien passé. Je recommande.",
    "Prestation {travaux} à {ville} par {fiche}. Sérieux et efficace. Bonne expérience.",
  ],

  // Variantes détaillées
  intro_details: [
    "Je tenais à laisser un avis sur {fiche} après {travaux} réalisés à {ville}.",
    "Voici mon retour d'expérience après avoir fait appel à {fiche} pour {travaux} à {ville}.",
    "J'utilise rarement les avis en ligne mais l'intervention de {fiche} pour {travaux} à {ville} mérite d'être signalée.",
  ],
  contextes: [
    "Nous avions un projet un peu complexe qui demandait de l'expertise.",
    "Le chantier n'était pas simple, mais tout a été géré avec professionnalisme.",
    "Les contraintes d'accès étaient importantes, mais l'équipe s'est adaptée.",
    "C'était une intervention urgente et ils ont su réagir rapidement.",
    "Le projet prenait un certain volume mais tout a été organisé efficacement.",
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

  let texte = '';

  if (ton === 'court') {
    texte = fill(rnd(GEN.courts));

  } else if (ton === 'detaille') {
    const intro   = fill(rnd(GEN.intro_details));
    const contexte = rnd(GEN.contextes);
    const interv  = rnd(GEN.interventions);
    const qualite = rnd(GEN.qualites);
    const detail  = rnd(GEN.details.filter(d => d));
    const reco    = fill(rnd(GEN.recommandations));
    texte = [intro, contexte, interv, qualite, detail, reco].filter(Boolean).join(' ');

  } else if (ton === 'enthousiaste') {
    const decouverte = fill(rnd(GEN.decouvertes));
    const contact    = rnd(GEN.contacts.filter(c => c));
    const interv     = rnd(GEN.interventions);
    const qualite    = rnd(GEN.qualites);
    const reco       = fill(rnd(GEN.recommandations));
    const enthousiasteSuffix = rnd([
      ' Une vraie bonne surprise !',
      ' Exactement ce dont j\'avais besoin.',
      ' Je suis vraiment content du résultat.',
      ' Ça change des mauvaises expériences qu\'on peut avoir.',
      '',
    ]);
    texte = [decouverte + '.', contact, interv, qualite, reco + enthousiasteSuffix].filter(Boolean).join(' ');

  } else { // neutre
    const decouverte = fill(rnd(GEN.decouvertes));
    const contact    = rnd(GEN.contacts);
    const interv     = rnd(GEN.interventions);
    const qualite    = rnd(GEN.qualites);
    const detail     = Math.random() > 0.4 ? rnd(GEN.details) : '';
    const reco       = fill(rnd(GEN.recommandations));
    texte = [decouverte + '.', contact, interv, qualite, detail, reco].filter(Boolean).join(' ');
  }

  // Nettoyer les doubles espaces
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
