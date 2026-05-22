import { renderSidebar } from '../components/sidebar.js';
import { api } from '../api.js';
import { showToast } from '../main.js';
import { setupTagInput } from './addfire.js';

let loadedFiresList = [];

export function historyPage(container) {
  const layout = document.createElement('div');
  layout.className = 'app-layout';
  renderSidebar(layout);

  const main = document.createElement('main');
  main.className = 'main-content';
  main.innerHTML = `
    <header class="page-header"><h1><i class="fa-solid fa-clock-rotate-left" style="color: var(--fire-orange); margin-right: 8px;"></i> Historique des incendies</h1></header>
    <div class="page-body">
      <div class="stats-grid" id="history-stats"></div>
      <div class="data-table-wrap">
        <div class="table-toolbar">
          <input class="search-input" id="search-fires" placeholder="Rechercher par forêt, daïra, commune…" />
          <select id="filter-status" class="search-input" style="flex:0; width:160px; cursor:pointer; background: var(--bg-input);">
            <option value="">Tous les statuts</option>
            <option value="declared">🔴 Déclaré</option>
            <option value="investigating">🟠 En cours</option>
            <option value="controlled">🟡 Maîtrisé</option>
            <option value="extinguished">🟢 Éteint</option>
          </select>
          <select id="filter-cause" class="search-input" style="flex:0; width:160px; cursor:pointer; background: var(--bg-input);">
            <option value="">Toutes les causes</option>
            <option value="INC">Incendie (INC)</option>
            <option value="CON">Contrôlé (CON)</option>
            <option value="Unknown">Inconnue</option>
          </select>
          <input type="date" id="filter-from" class="search-input" style="flex:0;width:150px;" />
          <input type="date" id="filter-to"   class="search-input" style="flex:0;width:150px;" />
          <button class="btn-secondary" id="filter-btn">Filtrer</button>
        </div>
        <div id="table-body">
          <div class="page-loading"><div class="spinner"></div></div>
        </div>
        <div id="pagination" class="pagination"></div>
      </div>
    </div>
  `;
  layout.appendChild(main);
  container.appendChild(layout);

  // State
  let currentPage = 1;

  loadHistory(currentPage);

  document.getElementById('filter-btn').addEventListener('click', () => {
    currentPage = 1;
    loadHistory(currentPage);
  });
  document.getElementById('filter-status').addEventListener('change', () => {
    currentPage = 1;
    loadHistory(currentPage);
  });
  document.getElementById('filter-cause').addEventListener('change', () => {
    currentPage = 1;
    loadHistory(currentPage);
  });
  document.getElementById('search-fires').addEventListener('input', debounce(() => {
    currentPage = 1;
    loadHistory(currentPage);
  }, 400));
}

// ── Data loader ────────────────────────────────────────────────────────────────
async function loadHistory(page = 1) {
  const search  = document.getElementById('search-fires')?.value || '';
  const status  = document.getElementById('filter-status')?.value || '';
  const cause   = document.getElementById('filter-cause')?.value  || '';
  const from    = document.getElementById('filter-from')?.value  || '';
  const to      = document.getElementById('filter-to')?.value    || '';
  const tableBody = document.getElementById('table-body');
  if (!tableBody) return;

  tableBody.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';

  try {
    let url = `/fires?page=${page}&per_page=10&search=${encodeURIComponent(search)}`;
    if (status) url += `&status=${status}`;
    if (cause)  url += `&cause=${cause}`;
    if (from)   url += `&date_from=${from}`;
    if (to)     url += `&date_to=${to}`;

    const data = await api.get(url);
    const fires = data.fires || [];
    loadedFiresList = fires;

    // ── Stats bar ──────────────────────────────────────────────────────────
    const statsEl = document.getElementById('history-stats');
    if (statsEl) {
      const stats = data.stats || {};
      const totalSurface = stats.total_surface ?? 0;
      const incCount     = stats.inc_count ?? 0;
      const conCount     = stats.con_count ?? 0;
      const unkCount     = stats.unk_count ?? 0;

      let durationText = "Min: — | Max: — | Moy: —";
      if (stats.duration && stats.duration.has_durations) {
        const minDur = stats.duration.min;
        const maxDur = stats.duration.max;
        const avgDur = stats.duration.avg;
        durationText = `Min: ${minDur.toFixed(1)}h | Max: ${maxDur.toFixed(1)}h | Moy: ${avgDur.toFixed(1)}h`;
      }

      statsEl.innerHTML = `
        <div class="stat-card">
          <div class="stat-icon" style="color: var(--fire-orange);"><i class="fa-solid fa-chart-simple"></i></div>
          <div class="stat-value">${data.total ?? fires.length}</div>
          <div class="stat-label">Total incendies</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="color: var(--risk-low);"><i class="fa-solid fa-leaf"></i></div>
          <div class="stat-value">${totalSurface.toFixed(1)} ha</div>
          <div class="stat-label">Surface brûlée (total)</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="color: var(--fire-red);"><i class="fa-solid fa-chart-pie"></i></div>
          <div class="stat-value" style="font-size: 15px; font-weight: 700; white-space: nowrap; height: 38px; display: flex; align-items: center;">
            INC: ${incCount} | CON: ${conCount} | Inconnu: ${unkCount}
          </div>
          <div class="stat-label">Distribution des causes (total)</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="color: #6ee7b7;"><i class="fa-solid fa-hourglass-half"></i></div>
          <div class="stat-value" style="font-size: 14px; font-weight: 700; white-space: nowrap; height: 38px; display: flex; align-items: center;">
            ${durationText}
          </div>
          <div class="stat-label">Durée [Décl. ➔ Ext.] (total min | max | moy)</div>
        </div>
      `;
    }

    // ── Empty state ────────────────────────────────────────────────────────
    if (fires.length === 0) {
      tableBody.innerHTML = '<div class="empty-state"><div class="icon" style="color: var(--text-muted);"><i class="fa-solid fa-box-open"></i></div><p>Aucun incendie trouvé</p></div>';
      renderPagination(data.total || 0, page, 50);
      return;
    }

    // ── Table ──────────────────────────────────────────────────────────────
    tableBody.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Forêt</th>
            <th>Daïra / Commune</th>
            <th>Total (ha)</th>
            <th>Cause</th>
            <th>Déclaration</th>
            <th>Extinction</th>
            <th style="text-align: right; padding-right: 16px;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${fires.map(f => {
            const statusColors = {
              declared: '#e63946',
              investigating: '#ff6b35',
              controlled: '#ffd166',
              extinguished: '#6ee7b7'
            };
            const statusLabels = {
              declared: 'Déclaré',
              investigating: 'En cours',
              controlled: 'Maîtrisé',
              extinguished: 'Éteint'
            };
            const dotColor = statusColors[f.status] || '#e63946';
            const dotLabel = statusLabels[f.status] || 'Déclaré';
            const dotHTML = f.status === 'extinguished' ? '' : `<span style="position: absolute; top: 4px; left: 4px; width: 6px; height: 6px; border-radius: 50%; background-color: ${dotColor}; box-shadow: 0 0 6px ${dotColor};" title="${dotLabel}"></span>`;
            
            const nextStatusMap = {
              declared: { next: 'investigating', label: 'Passer En cours', color: '#ff6b35', bg: 'rgba(255, 107, 53, 0.12)', border: 'rgba(255, 107, 53, 0.2)', icon: 'fa-fire-burner' },
              investigating: { next: 'controlled', label: 'Passer Maîtrisé', color: '#ffd166', bg: 'rgba(255, 209, 102, 0.12)', border: 'rgba(255, 209, 102, 0.2)', icon: 'fa-hands-holding-circle' },
              controlled: { next: 'extinguished', label: 'Passer Éteint', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.2)', icon: 'fa-circle-check' }
            };
            const nextInfo = nextStatusMap[f.status];
            const quickStatusButton = nextInfo ? `
              <button class="btn-action-status" data-id="${f.id}" data-next="${nextInfo.next}" style="background: ${nextInfo.bg}; border: 1px solid ${nextInfo.border}; color: ${nextInfo.color}; padding: 4px 8px; border-radius: 4px; font-size: 12px; cursor: pointer; transition: var(--transition); display: flex; align-items: center; justify-content: center;" title="${nextInfo.label}">
                <i class="fa-solid ${nextInfo.icon}"></i>
              </button>
            ` : '';

            return `
              <tr>
                <td style="position: relative;">
                  ${dotHTML}
                  <strong>${f.forest_name}</strong>
                </td>
                <td>${[f.daira, f.commune].filter(Boolean).join(' / ') || '—'}</td>
                <td class="num"><strong>${f.surf_total ?? 0}</strong></td>
                <td>${causeBadge(f.cause)}</td>
                <td>${formatDateHour(f.declaration_date, f.declaration_hour)}</td>
                <td>${formatDateHour(f.extinction_date, f.extinction_hour)}</td>
                <td style="text-align: right; padding-right: 16px;">
                  <div style="display: flex; gap: 6px; justify-content: flex-end;">
                    ${quickStatusButton}
                    <button class="btn-action-view" data-id="${f.id}" style="background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.2); color: #34d399; padding: 4px 8px; border-radius: 4px; font-size: 12px; cursor: pointer; transition: var(--transition); display: flex; align-items: center; justify-content: center;" title="Détails"><i class="fa-solid fa-eye"></i></button>
                    <button class="btn-action-edit" data-id="${f.id}" style="background: rgba(59, 91, 219, 0.12); border: 1px solid rgba(59, 91, 219, 0.2); color: #7b9cf5; padding: 4px 8px; border-radius: 4px; font-size: 12px; cursor: pointer; transition: var(--transition); display: flex; align-items: center; justify-content: center;" title="Modifier"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="btn-action-delete" data-id="${f.id}" style="background: rgba(230, 57, 70, 0.12); border: 1px solid rgba(230, 57, 70, 0.2); color: #fca5a5; padding: 4px 8px; border-radius: 4px; font-size: 12px; cursor: pointer; transition: var(--transition); display: flex; align-items: center; justify-content: center;" title="Supprimer"><i class="fa-solid fa-trash-can"></i></button>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;

    // Bind View Details Click Handlers
    document.querySelectorAll('.btn-action-view').forEach(btn => {
      btn.addEventListener('click', () => {
        const fireId = btn.dataset.id;
        const fire = loadedFiresList.find(f => f.id === fireId);
        if (!fire) return;

        const modal = document.createElement('div');
        modal.id = 'view-fire-modal-container';
        modal.innerHTML = `
          <div class="modal-overlay" id="view-fire-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px);">
            <div class="modal-card" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); width: 90%; max-width: 650px; max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 30px rgba(0,0,0,0.5); display: flex; flex-direction: column;">
              <div class="modal-header" style="padding: 20px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                <div style="display:flex; align-items:center; gap:10px;">
                  <h3 style="margin:0; font-size:18px; font-weight:700; color:var(--text-primary);"><i class="fa-solid fa-fire" style="color:var(--fire-red); margin-right: 6px;"></i> Détails de l'incendie</h3>
                  ${statusBadgeHTML(fire.status)}
                </div>
                <button type="button" id="close-view-modal" style="background:transparent; border:none; color:var(--text-secondary); font-size:20px; cursor:pointer;">&times;</button>
              </div>
              <div class="modal-body" style="padding: 20px; display: flex; flex-direction: column; gap: 20px; color: var(--text-primary);">
                
                <!-- Section 1: Localisation -->
                <div>
                  <h4 style="margin: 0 0 10px 0; color: var(--fire-orange); font-size: 14px; font-weight: 600; border-bottom: 1px solid var(--border-color); padding-bottom: 6px; display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-location-dot" style="color:var(--fire-orange); margin-right: 6px;"></i> Localisation</h4>
                  <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; font-size: 13px;">
                    <div><span style="color: var(--text-secondary);">Forêt :</span> <strong>${fire.forest_name || '—'}</strong></div>
                    <div><span style="color: var(--text-secondary);">Commune :</span> <strong>${fire.commune || '—'}</strong></div>
                    <div><span style="color: var(--text-secondary);">Daïra :</span> <strong>${fire.daira || '—'}</strong></div>
                    <div><span style="color: var(--text-secondary);">Coordonnées :</span> <strong>${fire.latitude ? `${fire.latitude.toFixed(5)}, ${fire.longitude.toFixed(5)}` : '—'}</strong></div>
                  </div>
                </div>

                <!-- Section 2: Chronologie -->
                <div>
                  <h4 style="margin: 0 0 10px 0; color: var(--fire-orange); font-size: 14px; font-weight: 600; border-bottom: 1px solid var(--border-color); padding-bottom: 6px;"><i class="fa-solid fa-timeline" style="color:var(--fire-orange); margin-right: 6px;"></i> Chronologie</h4>
                  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; font-size: 13px;">
                    <div>
                      <div style="color: var(--text-secondary); font-size:11px;">DÉCLARATION</div>
                      <strong>${formatDateHour(fire.declaration_date, fire.declaration_hour)}</strong>
                    </div>
                    <div>
                      <div style="color: var(--text-secondary); font-size:11px;">INTERVENTION</div>
                      <strong>${formatDateHour(fire.intervention_date, fire.intervention_hour)}</strong>
                    </div>
                    <div>
                      <div style="color: var(--text-secondary); font-size:11px;">EXTINCTION</div>
                      <strong>${formatDateHour(fire.extinction_date, fire.extinction_hour)}</strong>
                    </div>
                  </div>
                </div>

                <!-- Section 3: Bilan de Végétation -->
                <div>
                  <h4 style="margin: 0 0 10px 0; color: var(--fire-orange); font-size: 14px; font-weight: 600; border-bottom: 1px solid var(--border-color); padding-bottom: 6px;"><i class="fa-solid fa-leaf" style="color:var(--risk-low); margin-right: 6px;"></i> Dégâts sur la Végétation</h4>
                  <div style="display: flex; flex-direction:column; gap:8px; font-size: 13px; margin-bottom: 10px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <span>Type de végétation (Essence) :</span>
                      <strong>${(Array.isArray(fire.essence) ? fire.essence.join('+') : fire.essence) || '—'}</strong>
                    </div>
                    <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 12px; text-align:center; padding: 10px; background: rgba(255,255,255,0.02); border-radius:4px; border: 1px solid var(--border-color);">
                      <div>
                        <div style="font-size:11px; color:var(--text-secondary);">Forêt</div>
                        <div style="font-size:16px; font-weight:700; color:#3b5bdb;">${fire.tot_foret ?? 0} ha</div>
                      </div>
                      <div>
                        <div style="font-size:11px; color:var(--text-secondary);">Maquis</div>
                        <div style="font-size:16px; font-weight:700; color:#ff6b35;">${fire.tot_maquis ?? 0} ha</div>
                      </div>
                      <div>
                        <div style="font-size:11px; color:var(--text-secondary);">Broussailles</div>
                        <div style="font-size:16px; font-weight:700; color:#ffd166;">${fire.tot_broussailles ?? 0} ha</div>
                      </div>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; padding: 6px 10px; background: var(--fire-gradient); border-radius: 4px; color:white; font-weight:700;">
                      <span>SURFACE BRÛLÉE TOTALE :</span>
                      <span>${fire.surf_total ?? 0} ha</span>
                    </div>
                  </div>
                </div>

                <!-- Section 4: Météo & Opérations -->
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                  <div>
                    <h4 style="margin: 0 0 10px 0; color: var(--fire-orange); font-size: 14px; font-weight: 600; border-bottom: 1px solid var(--border-color); padding-bottom: 6px;"><i class="fa-solid fa-wind" style="color:var(--fire-orange); margin-right: 6px;"></i> Conditions Météo</h4>
                    <div style="display:flex; flex-direction:column; gap:6px; font-size: 13px;">
                      <div><span style="color: var(--text-secondary);">Température :</span> <strong>${fire.meteo_temp != null ? `${fire.meteo_temp} °C` : '—'}</strong></div>
                      <div><span style="color: var(--text-secondary);">Vitesse du Vent :</span> <strong>${fire.meteo_wind_speed != null ? `${fire.meteo_wind_speed} km/h` : '—'}</strong></div>
                      <div><span style="color: var(--text-secondary);">Direction du Vent :</span> <strong>${fire.meteo_wind_direction || '—'}</strong></div>
                    </div>
                  </div>
                  <div>
                    <h4 style="margin: 0 0 10px 0; color: var(--fire-orange); font-size: 14px; font-weight: 600; border-bottom: 1px solid var(--border-color); padding-bottom: 6px;"><i class="fa-solid fa-truck-fire" style="color:var(--fire-orange); margin-right: 6px;"></i> Enquête & Opérations</h4>
                    <div style="display:flex; flex-direction:column; gap:6px; font-size: 13px;">
                      <div><span style="color: var(--text-secondary);">Cause présumée :</span> ${causeBadge(fire.cause)}</div>
                      <div><span style="color: var(--text-secondary);">Signalé par :</span> <strong>${fire.signale || '—'}</strong></div>
                      <div><span style="color: var(--text-secondary);">Organismes :</span> <strong>${(Array.isArray(fire.organismes) ? fire.organismes.join('+') : fire.organismes) || '—'}</strong></div>
                      <div><span style="color: var(--text-secondary);">Dégâts Estimés :</span> <strong style="color: #e63946;">${fire.degats ? `${fire.degats.toLocaleString('fr-DZ')} DZD` : '0 DZD'}</strong></div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        `;
        document.body.appendChild(modal);

        const closeModal = () => modal.remove();
        document.getElementById('close-view-modal').addEventListener('click', closeModal);
        document.getElementById('btn-close-view').addEventListener('click', closeModal);
      });
    });

    // Bind Quick Status Progress Handlers
    document.querySelectorAll('.btn-action-status').forEach(btn => {
      btn.addEventListener('click', async () => {
        const fireId = btn.dataset.id;
        const nextStatus = btn.dataset.next;
        try {
          await api.put(`/fires/${fireId}`, { status: nextStatus });
          showToast('Statut de l\'incendie mis à jour avec succès !', 'success');
          loadHistory(page);
        } catch (err) {
          showToast(err.message || 'Erreur lors du changement de statut', 'error');
        }
      });
    });

    // Bind Delete Click Handlers
    document.querySelectorAll('.btn-action-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        const fireId = btn.dataset.id;
        if (!confirm("Êtes-vous sûr de vouloir supprimer cet incendie ? Cette action est irréversible.")) {
          return;
        }
        try {
          await api.delete(`/fires/${fireId}`);
          showToast('Incendie supprimé avec succès !', 'success');
          loadHistory(page);
        } catch (err) {
          showToast(err.message || 'Erreur lors de la suppression', 'error');
        }
      });
    });

    // Bind Edit Click Handlers
    document.querySelectorAll('.btn-action-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const fireId = btn.dataset.id;
        const fire = loadedFiresList.find(f => f.id === fireId);
        if (!fire) return;

        // Render gorgeous modal dynamic overlay
        const modal = document.createElement('div');
        modal.id = 'edit-fire-modal-container';
        modal.innerHTML = `
          <div class="modal-overlay" id="edit-fire-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px);">
            <div class="modal-card" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); width: 90%; max-width: 700px; max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 30px rgba(0,0,0,0.5); display: flex; flex-direction: column;">
              <div class="modal-header" style="padding: 20px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin:0; font-size:18px; font-weight:700;"><i class="fa-solid fa-pen-to-square" style="color:var(--fire-orange); margin-right: 6px;"></i> Modifier l'incendie</h3>
                <button type="button" id="close-edit-modal" style="background:transparent; border:none; color:var(--text-secondary); font-size:20px; cursor:pointer;">&times;</button>
              </div>
              <div class="modal-body" style="padding: 20px; display: flex; flex-direction: column; gap: 16px;">
                
                <h4 style="margin: 0; border-bottom: 1px dashed var(--border-color); padding-bottom: 6px; color: var(--fire-orange);"><i class="fa-solid fa-magnifying-glass" style="color:var(--fire-orange); margin-right: 6px;"></i> Découverte</h4>
                <div class="grid-2col">
                  <div class="form-group" style="display:flex; flex-direction:column; gap:4px;">
                    <label style="font-size:12px; color:var(--text-secondary);">Forêt</label>
                    <input type="text" id="edit-forest-name" style="padding: 8px; border-radius: 4px; background: rgba(255,255,255,0.03); border: 1px dashed var(--border-color); color: var(--text-muted);" readonly />
                  </div>
                  <div class="form-group" style="display:flex; flex-direction:column; gap:4px;">
                    <label style="font-size:12px; color:var(--text-secondary);">Statut</label>
                    <select id="edit-status" style="padding: 8px; border-radius: 4px; background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-primary); outline: none;">
                      <option value="declared">🔴 Déclaré</option>
                      <option value="investigating">🟠 En cours</option>
                      <option value="controlled">🟡 Maîtrisé</option>
                      <option value="extinguished">🟢 Éteint</option>
                    </select>
                  </div>
                </div>

                <div class="grid-2col">
                  <div class="form-group" style="display:flex; flex-direction:column; gap:4px;">
                    <label style="font-size:12px; color:var(--text-secondary);">Date de déclaration *</label>
                    <input type="date" id="edit-decl-date" style="padding: 8px; border-radius: 4px; background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-primary);" required />
                  </div>
                  <div class="form-group" style="display:flex; flex-direction:column; gap:4px;">
                    <label style="font-size:12px; color:var(--text-secondary);">Heure de déclaration</label>
                    <input type="number" id="edit-decl-hour" min="0" max="23" style="padding: 8px; border-radius: 4px; background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-primary);" />
                  </div>
                </div>

                <div class="grid-2col">
                  <div class="form-group" style="display:flex; flex-direction:column; gap:4px;">
                    <label style="font-size:12px; color:var(--text-secondary);">Date d'intervention</label>
                    <input type="date" id="edit-int-date" style="padding: 8px; border-radius: 4px; background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-primary);" />
                  </div>
                  <div class="form-group" style="display:flex; flex-direction:column; gap:4px;">
                    <label style="font-size:12px; color:var(--text-secondary);">Heure d'intervention</label>
                    <input type="number" id="edit-int-hour" min="0" max="23" style="padding: 8px; border-radius: 4px; background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-primary);" />
                  </div>
                </div>

                <div class="grid-2col">
                  <div class="form-group" style="display:flex; flex-direction:column; gap:4px;">
                    <label style="font-size:12px; color:var(--text-secondary);">Cause</label>
                    <select id="edit-cause" style="padding: 8px; border-radius: 4px; background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-primary); outline: none;">
                      <option value="Unknown">Inconnue</option>
                      <option value="INC">INC – Incendie</option>
                      <option value="CON">CON – Brûlage contrôlé</option>
                    </select>
                  </div>
                  <div class="form-group" style="display:flex; flex-direction:column; gap:4px;">
                    <label style="font-size:12px; color:var(--text-secondary);">Signalé par</label>
                    <input type="text" id="edit-signale" style="padding: 8px; border-radius: 4px; background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-primary);" />
                  </div>
                </div>

                <h4 style="margin: 8px 0 0 0; border-bottom: 1px dashed var(--border-color); padding-bottom: 6px; color: var(--fire-orange);"><i class="fa-solid fa-chart-line" style="color:var(--fire-orange); margin-right: 6px;"></i> Bilan & Extinction</h4>
                
                <div class="grid-2col">
                  <div class="form-group" style="display:flex; flex-direction:column; gap:4px;">
                    <label style="font-size:12px; color:var(--text-secondary);">Date d'extinction</label>
                    <input type="date" id="edit-ext-date" style="padding: 8px; border-radius: 4px; background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-primary);" />
                  </div>
                  <div class="form-group" style="display:flex; flex-direction:column; gap:4px;">
                    <label style="font-size:12px; color:var(--text-secondary);">Heure d'extinction</label>
                    <input type="number" id="edit-ext-hour" min="0" max="23" style="padding: 8px; border-radius: 4px; background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-primary);" />
                  </div>
                </div>

                <div class="form-group" style="display:flex; flex-direction:column; gap:4px;">
                  <label style="font-size:12px; color:var(--text-secondary);">Type de végétation (Essence)</label>
                  <div id="edit-essence-container"></div>
                </div>

                <div class="grid-3col">
                  <div class="form-group" style="display:flex; flex-direction:column; gap:4px;">
                    <label style="font-size:12px; color:var(--text-secondary);">Forêt (ha)</label>
                    <input type="number" step="0.1" id="edit-tot-foret" style="padding: 8px; border-radius: 4px; background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-primary);" />
                  </div>
                  <div class="form-group" style="display:flex; flex-direction:column; gap:4px;">
                    <label style="font-size:12px; color:var(--text-secondary);">Maquis (ha)</label>
                    <input type="number" step="0.1" id="edit-tot-maquis" style="padding: 8px; border-radius: 4px; background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-primary);" />
                  </div>
                  <div class="form-group" style="display:flex; flex-direction:column; gap:4px;">
                    <label style="font-size:12px; color:var(--text-secondary);">Broussailles (ha)</label>
                    <input type="number" step="0.1" id="edit-tot-broussailles" style="padding: 8px; border-radius: 4px; background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-primary);" />
                  </div>
                </div>

                <div class="grid-2col">
                  <div class="form-group" style="display:flex; flex-direction:column; gap:4px;">
                    <label style="font-size:12px; color:var(--text-secondary);">Organismes intervenus</label>
                    <div id="edit-organismes-container"></div>
                  </div>
                  <div class="form-group" style="display:flex; flex-direction:column; gap:4px;">
                    <label style="font-size:12px; color:var(--text-secondary);">Dégâts estimés (DZD)</label>
                    <input type="number" id="edit-degats" style="padding: 8px; border-radius: 4px; background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-primary);" />
                  </div>
                </div>

              </div>
              <div class="modal-footer" style="padding: 20px; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 12px;">
                <button type="button" class="btn-secondary" id="btn-cancel-edit" style="padding: 8px 16px; cursor:pointer;">Annuler</button>
                <button type="button" class="btn-primary" id="btn-submit-edit" style="padding: 8px 24px; cursor:pointer; background:var(--fire-gradient); color:white; border:none; border-radius:4px; font-weight:600;">Enregistrer</button>
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(modal);

        // Initialize tag inputs
        const essenceTagInput = setupTagInput('edit-essence-container', 'Ex: CL, MAQ, BRS');
        const organismesTagInput = setupTagInput('edit-organismes-container', 'Ex: SF, PC, DW');

        // Populate fields
        document.getElementById('edit-forest-name').value = fire.forest_name || '';
        document.getElementById('edit-status').value = fire.status || 'declared';
        document.getElementById('edit-decl-date').value = fire.declaration_date || '';
        document.getElementById('edit-decl-hour').value = fire.declaration_hour ?? '';
        document.getElementById('edit-int-date').value = fire.intervention_date || '';
        document.getElementById('edit-int-hour').value = fire.intervention_hour ?? '';
        document.getElementById('edit-cause').value = fire.cause || 'Unknown';
        document.getElementById('edit-signale').value = fire.signale || '';
        document.getElementById('edit-ext-date').value = fire.extinction_date || '';
        document.getElementById('edit-ext-hour').value = fire.extinction_hour ?? '';
        document.getElementById('edit-tot-foret').value = fire.tot_foret ?? '';
        document.getElementById('edit-tot-maquis').value = fire.tot_maquis ?? '';
        document.getElementById('edit-tot-broussailles').value = fire.tot_broussailles ?? '';
        document.getElementById('edit-degats').value = fire.degats ?? '';

        // Populate tag inputs
        const essenceVal = fire.essence;
        essenceTagInput.setTags(Array.isArray(essenceVal) ? essenceVal : (essenceVal ? essenceVal.split('+').map(s => s.trim()).filter(Boolean) : []));

        const organismesVal = fire.organismes;
        organismesTagInput.setTags(Array.isArray(organismesVal) ? organismesVal : (organismesVal ? organismesVal.split('+').map(s => s.trim()).filter(Boolean) : []));

        // Close handlers
        const closeModal = () => modal.remove();
        document.getElementById('close-edit-modal').addEventListener('click', closeModal);
        document.getElementById('btn-cancel-edit').addEventListener('click', closeModal);

        // Submit handler
        document.getElementById('btn-submit-edit').addEventListener('click', async () => {
          const declDate = document.getElementById('edit-decl-date').value;
          if (!declDate) {
            showToast('La date de déclaration est requise', 'error');
            return;
          }

          const statusVal = document.getElementById('edit-status').value;
          const extDate = document.getElementById('edit-ext-date').value;
          const extHour = parseInt(document.getElementById('edit-ext-hour').value);

          if (statusVal === 'extinguished' && !extDate) {
            showToast("La date d'extinction est requise pour passer au statut éteint", 'error');
            return;
          }

          if (extDate) {
            if (extDate < declDate) {
              showToast("La date d'extinction ne peut pas être antérieure à la date de déclaration", 'error');
              return;
            }
            if (extDate === declDate && !isNaN(extHour)) {
              const declHour = parseInt(document.getElementById('edit-decl-hour').value);
              if (!isNaN(declHour) && extHour < declHour) {
                showToast("L'heure d'extinction ne peut pas être antérieure à l'heure de déclaration", 'error');
                return;
              }
            }
          }

          // Calculate total surface
          const totForet = parseFloat(document.getElementById('edit-tot-foret').value) || 0;
          const totMaquis = parseFloat(document.getElementById('edit-tot-maquis').value) || 0;
          const totBrousse = parseFloat(document.getElementById('edit-tot-broussailles').value) || 0;
          const surfTotal = totForet + totMaquis + totBrousse;

          const declHour = parseInt(document.getElementById('edit-decl-hour').value);
          const intHour = parseInt(document.getElementById('edit-int-hour').value);

          const body = {
            status:            statusVal,
            declaration_date:  declDate,
            declaration_hour:  isNaN(declHour) ? null : declHour,
            intervention_date: document.getElementById('edit-int-date').value || null,
            intervention_hour: isNaN(intHour) ? null : intHour,
            cause:             document.getElementById('edit-cause').value,
            signale:           document.getElementById('edit-signale').value || null,
            extinction_date:   extDate || null,
            extinction_hour:   isNaN(extHour) ? null : extHour,
            essence:           essenceTagInput.getTags(),
            tot_foret:         totForet,
            tot_maquis:        totMaquis,
            tot_broussailles:  totBrousse,
            surf_total:        surfTotal,
            organismes:        organismesTagInput.getTags(),
            degats:            parseFloat(document.getElementById('edit-degats').value) || 0
          };

          try {
            await api.put(`/fires/${fireId}`, body);
            showToast('Incendie mis à jour avec succès !', 'success');
            closeModal();
            loadHistory(page);
          } catch (err) {
            showToast(err.message || 'Erreur lors de la mise à jour', 'error');
          }
        });
      });
    });

    renderPagination(data.total || 0, page, 50);

  } catch (err) {
    tableBody.innerHTML = `<div class="empty-state"><div class="icon">❌</div><p>Erreur : ${err.message}</p></div>`;
  }
}

// ── Pagination ─────────────────────────────────────────────────────────────────
function renderPagination(total, currentPage, perPage) {
  const container = document.getElementById('pagination');
  if (!container) return;

  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) { container.innerHTML = ''; return; }

  const prev = currentPage > 1
    ? `<button class="btn-secondary" onclick="changePage(${currentPage - 1})">← Précédent</button>`
    : '';
  const next = currentPage < totalPages
    ? `<button class="btn-secondary" onclick="changePage(${currentPage + 1})">Suivant →</button>`
    : '';

  container.innerHTML = `
    <div class="pagination-controls">
      ${prev}
      <span>Page ${currentPage} / ${totalPages} — ${total} résultats</span>
      ${next}
    </div>
  `;
}

// Expose for inline onclick handlers
window.changePage = (page) => loadHistory(page);

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatDateHour(dateStr, hour) {
  if (!dateStr) return '—';
  const h = hour != null ? ` ${String(hour).padStart(2, '0')}h` : '';
  return dateStr + h;
}

function formatMeteo(f) {
  const parts = [];
  if (f.meteo_temp         != null) parts.push(`${f.meteo_temp}°C`);
  if (f.meteo_wind_speed   != null) parts.push(`${f.meteo_wind_speed} km/h`);
  if (f.meteo_wind_direction)       parts.push(f.meteo_wind_direction);
  return parts.length ? parts.join(' · ') : '—';
}

function causeBadge(cause) {
  const map = {
    INC:     { label: 'Incendie',  cls: 'badge-danger'  },
    CON:     { label: 'Contrôlé', cls: 'badge-warning' },
    Unknown: { label: 'Inconnue', cls: 'badge-neutral' }
  };
  const { label, cls } = map[cause] || map.Unknown;
  return `<span class="badge ${cls}">${label}</span>`;
}

function statusBadgeHTML(status) {
  const map = {
    declared: { label: '<i class="fa-solid fa-circle-exclamation" style="margin-right: 4px;"></i> Déclaré', color: '#e63946', bg: 'rgba(230,57,70,0.12)' },
    investigating: { label: '<i class="fa-solid fa-fire-burner" style="margin-right: 4px;"></i> En cours', color: '#ff6b35', bg: 'rgba(255,107,53,0.12)' },
    controlled: { label: '<i class="fa-solid fa-hands-holding-circle" style="margin-right: 4px;"></i> Maîtrisé', color: '#ffd166', bg: 'rgba(255,209,102,0.12)' },
    extinguished: { label: '<i class="fa-solid fa-circle-check" style="margin-right: 4px;"></i> Éteint', color: '#6ee7b7', bg: 'rgba(6,214,160,0.12)' }
  };
  const item = map[status] || map.declared;
  return `<span style="background: ${item.bg}; color: ${item.color}; border: 1px solid ${item.color}33; padding: 4px 10px; border-radius: 4px; font-weight: 600; font-size: 12px; display: inline-block;">${item.label}</span>`;
}

function debounce(fn, ms) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}