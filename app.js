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

// ── STOCKAGE ──
function getAvis()   { return JSON.parse(localStorage.getItem('gmb_avis')   || '[]'); }
function getFiches() { return JSON.parse(localStorage.getItem('gmb_fiches') || '[]'); }
function saveAvis(d)   { localStorage.setItem('gmb_avis',   JSON.stringify(d)); }
function saveFiches(d) { localStorage.setItem('gmb_fiches', JSON.stringify(d)); }

// ── INIT ──
function init() {
  if (!sessionStorage.getItem('gmb_auth')) return;
  populateFicheSelects();
  renderFiches();
  renderDashboard();
  renderListe();
  checkNotifications();

  // date par défaut = aujourd'hui
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('form-date').value = today;

  // année dashboard
  const yearSel = document.getElementById('dash-year');
  const currentYear = new Date().getFullYear();
  for (let y = currentYear; y >= currentYear - 4; y--) {
    const o = document.createElement('option');
    o.value = y; o.textContent = y;
    yearSel.appendChild(o);
  }
  yearSel.addEventListener('change', renderDashboard);
  document.getElementById('dash-fiche').addEventListener('change', renderDashboard);
  document.getElementById('dash-month').addEventListener('change', renderDashboard);

  // Pré-sélectionner le mois en cours
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
  if (name === 'liste')   { renderListe(); renderRappelsBanner(getRappelsDus()); }
  if (name === 'fiches')    renderFiches();
}

// ── FICHES ──
function populateFicheSelects() {
  const fiches = getFiches();
  ['form-fiche', 'dash-fiche', 'list-fiche'].forEach(id => {
    const sel = document.getElementById(id);
    const keep = id === 'dash-fiche' || id === 'list-fiche' ? sel.options[0] : null;
    sel.innerHTML = '';
    if (keep) sel.appendChild(keep);
    else {
      const def = document.createElement('option');
      def.value = ''; def.textContent = '-- Choisir une fiche --';
      sel.appendChild(def);
    }
    fiches.forEach(f => {
      const o = document.createElement('option');
      o.value = f.nom; o.textContent = f.nom;
      sel.appendChild(o);
    });
  });
}

function addFiche(e) {
  e.preventDefault();
  const nom  = document.getElementById('fiche-nom').value.trim();
  const lien = document.getElementById('fiche-lien').value.trim();
  if (!nom) return;
  const fiches = getFiches();
  if (fiches.find(f => f.nom === nom)) return alert('Cette fiche existe déjà.');
  fiches.push({ nom, lien });
  saveFiches(fiches);
  document.getElementById('fiche-nom').value = '';
  document.getElementById('fiche-lien').value = '';
  populateFicheSelects();
  renderFiches();
}

function deleteFiche(nom) {
  if (!confirm(`Supprimer la fiche "${nom}" ? Les avis associés seront conservés.`)) return;
  saveFiches(getFiches().filter(f => f.nom !== nom));
  populateFicheSelects();
  renderFiches();
}

function renderFiches() {
  const fiches = getFiches();
  const avis   = getAvis();
  const ul = document.getElementById('liste-fiches');
  ul.innerHTML = '';
  if (!fiches.length) {
    ul.innerHTML = '<p class="empty-state">Aucune fiche ajoutée.</p>';
    return;
  }
  fiches.forEach(f => {
    const count = avis.filter(a => a.fiche === f.nom).length;
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

function submitAvis(e) {
  e.preventDefault();
  const fiche    = document.getElementById('form-fiche').value;
  const auteur   = document.getElementById('form-auteur').value.trim();
  const note     = parseInt(document.getElementById('form-note').value);
  const date     = document.getElementById('form-date').value;
  const statut   = document.getElementById('form-statut').value;
  const texte    = document.getElementById('form-texte').value.trim();
  const reponse  = document.getElementById('form-reponse').value.trim();

  if (!fiche || !auteur || !note || !date || !statut) return;

  const avis = getAvis();
  avis.push({ id: Date.now(), fiche, auteur, note, date, statut, texte, reponse });
  saveAvis(avis);

  document.getElementById('form-avis').reset();
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
const STATUT_LABELS = {
  supprime: { label: 'Supprimé (à été fait)', color: '#e53935' },
  j0:       { label: 'Posté J+0',  color: '#9c27b0' },
  j7:       { label: 'Posté J+7',  color: '#fb8c00' },
  j14:      { label: 'Posté J+14', color: '#f4b942' },
  j21:      { label: 'Posté J+21', color: '#43a047' },
  j30:      { label: 'Posté J+30', color: '#1a73e8' },
};

function renderListe() {
  let avis = getAvis();
  const fiche  = document.getElementById('list-fiche').value;
  const month  = document.getElementById('list-month').value;
  const note   = document.getElementById('list-note').value;
  const statut = document.getElementById('list-statut').value;

  if (fiche)  avis = avis.filter(a => a.fiche === fiche);
  if (month)  avis = avis.filter(a => a.date.startsWith(month));
  if (note)   avis = avis.filter(a => a.note === parseInt(note));
  if (statut) avis = avis.filter(a => a.statut === statut);

  avis.sort((a, b) => b.date.localeCompare(a.date));

  const el = document.getElementById('liste-avis');
  if (!avis.length) {
    el.innerHTML = '<p class="empty-state">Aucun avis pour ces filtres.</p>';
    return;
  }
  const rappelsDus = getRappelsDus();
  const aVerif = rappelsDus.map(d => d.avis.id);

  el.innerHTML = `
  <table class="avis-table">
    <thead>
      <tr>
        <th>Date</th>
        <th>Fiche GMB</th>
        <th>Gmail</th>
        <th>Note</th>
        <th>Statut</th>
        <th>Rappel</th>
        <th>Avis</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      ${avis.map(a => {
        const st = STATUT_LABELS[a.statut] || { label: a.statut || '–', color: '#999' };
        const needsVerif = aVerif.includes(a.id);
        const verifLabel = needsVerif ? rappelsDus.find(d => d.avis.id === a.id)?.label : null;
        return `<tr class="${needsVerif ? 'avis-a-verifier' : ''}">
          <td class="avis-date">${formatDate(a.date)}</td>
          <td><span class="avis-fiche">${a.fiche}</span></td>
          <td class="avis-auteur">${a.auteur}</td>
          <td class="avis-stars">${'★'.repeat(a.note)}${'☆'.repeat(5-a.note)}</td>
          <td>
            <select class="statut-inline" data-id="${a.id}" onchange="updateStatut(${a.id}, this.value)" style="border-color:${st.color};color:${st.color}">
              ${Object.entries(STATUT_LABELS).map(([k,v]) =>
                `<option value="${k}" ${a.statut===k?'selected':''} style="color:${v.color}">${v.label}</option>`
              ).join('')}
            </select>
          </td>
          <td>${needsVerif ? `<span class="avis-rappel">🔔 ${verifLabel}</span>` : ''}</td>
          <td class="col-texte">${a.texte || ''}</td>
          <td><button class="btn-delete" onclick="deleteAvis(${a.id})">🗑</button></td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>`;
}

function updateStatut(id, newStatut) {
  const avis = getAvis();
  const a = avis.find(a => a.id === id);
  if (!a) return;
  a.statut = newStatut;
  saveAvis(avis);
  renderListe();
  renderRappelsBanner(getRappelsDus());
}

function deleteAvis(id) {
  if (!confirm('Supprimer cet avis ?')) return;
  saveAvis(getAvis().filter(a => a.id !== id));
  renderListe();
  renderFiches();
}

// ── DASHBOARD ──
let chartVolume, chartNote, chartRep;

function renderDashboard() {
  let avis = getAvis();
  const fiche = document.getElementById('dash-fiche')?.value || '';
  const year  = parseInt(document.getElementById('dash-year')?.value || new Date().getFullYear());
  const month = document.getElementById('dash-month')?.value || '';

  if (fiche) avis = avis.filter(a => a.fiche === fiche);
  avis = avis.filter(a => parseInt(a.date.slice(0, 4)) === year);

  // Stats selon filtre mois ou mois en cours
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const selectedMonth = month ? `${year}-${month}` : currentMonth;
  const moisAvis = avis.filter(a => a.date.startsWith(selectedMonth));
  const moyenne = moisAvis.length ? (moisAvis.reduce((s,a) => s+a.note, 0) / moisAvis.length).toFixed(1) : '–';

  document.getElementById('stat-total').textContent     = moisAvis.length;
  document.getElementById('stat-moyenne').textContent   = moyenne !== '–' ? moyenne + ' ★' : '–';
  document.getElementById('stat-positifs').textContent  = moisAvis.filter(a => a.note >= 4).length;
  document.getElementById('stat-negatifs').textContent  = moisAvis.filter(a => a.note <= 2).length;
  const j30Count  = moisAvis.filter(a => a.statut === 'j30').length;
  const suppCount = moisAvis.filter(a => a.statut === 'supprime').length;
  // Taux de survie = avis J+30 / (avis J+30 + supprimés) — uniquement sur les avis "résolus"
  const resolus = j30Count + suppCount;
  const tauxSurvie = resolus > 0 ? Math.round((j30Count / resolus) * 100) + ' %' : '–';

  document.getElementById('stat-j30').textContent       = j30Count;
  document.getElementById('stat-supprimes').textContent = suppCount;
  document.getElementById('stat-survie').textContent    = tauxSurvie;

  // Données par mois
  const months = Array.from({length: 12}, (_, i) => {
    const m = String(i+1).padStart(2,'0');
    return `${year}-${m}`;
  });
  const labels = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc'];

  const volumes = months.map(m => avis.filter(a => a.date.startsWith(m)).length);
  const moyennes = months.map(m => {
    const ma = avis.filter(a => a.date.startsWith(m));
    return ma.length ? +(ma.reduce((s,a) => s+a.note, 0) / ma.length).toFixed(2) : null;
  });

  // Répartition des notes
  const repartition = [1,2,3,4,5].map(n => avis.filter(a => a.note === n).length);

  // Chart volume
  if (chartVolume) chartVolume.destroy();
  chartVolume = new Chart(document.getElementById('chart-volume'), {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Avis', data: volumes, backgroundColor: '#1a73e8aa', borderRadius: 6 }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
  });

  // Chart note moyenne
  if (chartNote) chartNote.destroy();
  chartNote = new Chart(document.getElementById('chart-note'), {
    type: 'line',
    data: { labels, datasets: [{ label: 'Note moy.', data: moyennes, borderColor: '#f4b942', backgroundColor: '#f4b94222', tension: 0.3, fill: true, pointBackgroundColor: '#f4b942' }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 5 } } }
  });

  // Chart répartition
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
function exportExcel() {
  let avis = getAvis();
  const fiche = document.getElementById('dash-fiche').value;
  if (fiche) avis = avis.filter(a => a.fiche === fiche);

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const moisAvis = avis.filter(a => a.date.startsWith(thisMonth));

  const rows = moisAvis.map(a => ({
    'Fiche GMB': a.fiche,
    'Auteur': a.auteur,
    'Note': a.note,
    'Date': a.date,
    'Avis': a.texte,
    'Réponse': a.reponse
  }));

  if (!rows.length) { alert('Aucun avis ce mois-ci.'); return; }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 8 }, { wch: 12 }, { wch: 50 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Avis ' + thisMonth);
  XLSX.writeFile(wb, `avis-gmb-${thisMonth}.xlsx`);
}

// ── UTILS ──
function formatDate(d) {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

// ── NOTIFICATIONS & RAPPELS ──

// Seuils de vérification : J+7, J+14, J+21, J+30
const RAPPELS = [
  { jours: 7,  statut_attendu: 'j7',  depuis: ['j0'],       label: 'J+7'  },
  { jours: 14, statut_attendu: 'j14', depuis: ['j0','j7'],   label: 'J+14' },
  { jours: 21, statut_attendu: 'j21', depuis: ['j0','j7','j14'], label: 'J+21' },
  { jours: 30, statut_attendu: 'j30', depuis: ['j0','j7','j14','j21'], label: 'J+30' },
];

function daysDiff(dateStr) {
  const now = new Date(); now.setHours(0,0,0,0);
  const d   = new Date(dateStr); d.setHours(0,0,0,0);
  return Math.floor((now - d) / 86400000);
}

function getRappelsDus() {
  const avis = getAvis();
  const dus = [];
  for (const a of avis) {
    if (a.statut === 'supprime' || a.statut === 'j30') continue;
    const age = daysDiff(a.date);
    for (const r of RAPPELS) {
      if (age >= r.jours && r.depuis.includes(a.statut)) {
        dus.push({ avis: a, label: r.label });
      }
    }
  }
  return dus;
}

function checkNotifications() {
  const dus = getRappelsDus();
  if (!dus.length) return;

  // Bannière dans l'onglet Liste
  renderRappelsBanner(dus);

  // Notification navigateur
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    sendNotifications(dus);
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(p => {
      if (p === 'granted') sendNotifications(dus);
    });
  }
}

function sendNotifications(dus) {
  // Grouper par palier pour éviter le spam
  const paliers = [...new Set(dus.map(d => d.label))];
  paliers.forEach(label => {
    const nb = dus.filter(d => d.label === label).length;
    new Notification(`📍 Suivi GMB — Vérification ${label}`, {
      body: `${nb} avis ${nb > 1 ? 'atteignent' : 'atteint'} le palier ${label}. Pensez à mettre à jour le statut !`,
      icon: 'https://www.google.com/favicon.ico'
    });
  });
}

function renderRappelsBanner(dus) {
  // On vide la bannière (plus utilisée pour le détail)
  const banner = document.getElementById('rappels-banner');
  if (banner) banner.innerHTML = '';

  // Compteur résumé
  const count = document.getElementById('rappels-count');
  if (!count) return;
  if (!dus.length) { count.innerHTML = ''; return; }
  const nb = dus.length;
  count.innerHTML = `<div class="rappels-summary">🔔 <strong>${nb} avis</strong> ${nb > 1 ? 'nécessitent' : 'nécessite'} une vérification de statut — surlignés en orange ci-dessous.</div>`;
}

// ── AUTO-LOGIN si session active ──
if (sessionStorage.getItem('gmb_auth')) {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  init();
}
