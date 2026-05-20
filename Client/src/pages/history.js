import { renderSidebar } from '../components/sidebar.js';
import { api } from '../api.js';

export function historyPage(container) {
  const layout = document.createElement('div');
  layout.className = 'app-layout';
  renderSidebar(layout);

  const main = document.createElement('main');
  main.className = 'main-content';
  main.innerHTML = `
    <header class="page-header"><h1>📜 Historique des incendies</h1></header>
    <div class="page-body">
      <div class="stats-grid" id="history-stats"></div>
      <div class="data-table-wrap">
        <div class="table-toolbar">
          <input class="search-input" id="search-fires" placeholder="🔍 Rechercher par forêt, daïra..." />
          <input type="date" id="filter-from" class="search-input" style="flex:0;width:160px;" />
          <input type="date" id="filter-to" class="search-input" style="flex:0;width:160px;" />
          <button class="btn-secondary" id="filter-btn">Filtrer</button>
        </div>
        <div id="table-body">
          <div class="page-loading"><div class="spinner"></div></div>
        </div>
      </div>
    </div>
  `;
  layout.appendChild(main);
  container.appendChild(layout);

  loadHistory();

  document.getElementById('filter-btn').addEventListener('click', loadHistory);
  document.getElementById('search-fires').addEventListener('input', debounce(loadHistory, 400));
}

async function loadHistory() {
  const search = document.getElementById('search-fires')?.value || '';
  const from = document.getElementById('filter-from')?.value || '';
  const to = document.getElementById('filter-to')?.value || '';

  const tableBody = document.getElementById('table-body');
  if (!tableBody) return;
  tableBody.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';

  try {
    let url = `/fires?search=${encodeURIComponent(search)}`;
    if (from) url += `&date_from=${from}`;
    if (to) url += `&date_to=${to}`;
    const data = await api.get(url);

    // Render stats
    const statsEl = document.getElementById('history-stats');
    if (statsEl) {
      const total = data.total || 0;
      const severityCounts = {};
      data.fires.forEach(f => { severityCounts[f.severity] = (severityCounts[f.severity] || 0) + 1; });
      statsEl.innerHTML = `
        <div class="stat-card"><div class="stat-icon">📊</div><div class="stat-value">${total}</div><div class="stat-label">Total incendies</div></div>
        <div class="stat-card"><div class="stat-icon">🔴</div><div class="stat-value">${severityCounts.critical || 0}</div><div class="stat-label">Critiques</div></div>
        <div class="stat-card"><div class="stat-icon">🟠</div><div class="stat-value">${severityCounts.high || 0}</div><div class="stat-label">Élevés</div></div>
        <div class="stat-card"><div class="stat-icon">🟡</div><div class="stat-value">${severityCounts.medium || 0}</div><div class="stat-label">Moyens</div></div>
      `;
    }

    if (!data.fires || data.fires.length === 0) {
      tableBody.innerHTML = '<div class="empty-state"><div class="icon">📭</div><p>Aucun incendie trouvé</p></div>';
      return;
    }

    tableBody.innerHTML = `
      <table class="data-table">
        <thead>
          <tr><th>Date</th><th>Forêt</th><th>Localisation</th><th>Surface (ha)</th><th>Cause</th><th>Gravité</th></tr>
        </thead>
        <tbody>
          ${data.fires.map(f => `
            <tr>
              <td>${f.fire_date || 'N/A'}</td>
              <td><strong>${f.forest_name}</strong></td>
              <td>${f.daira || ''} / ${f.commune || ''}</td>
              <td>${f.surface_burned || 0}</td>
              <td>${f.cause || 'Inconnue'}</td>
              <td><span class="badge badge-${f.severity || 'medium'}">${f.severity || 'medium'}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (err) {
    tableBody.innerHTML = `<div class="empty-state"><div class="icon">❌</div><p>Erreur: ${err.message}</p></div>`;
  }
}

function debounce(fn, ms) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}
