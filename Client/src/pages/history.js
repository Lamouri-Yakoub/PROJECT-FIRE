import { renderSidebar } from '../components/sidebar.js';
import { api } from '../api.js';
import { showToast } from '../main.js';

let loadedFiresList = [];

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
          <input class="search-input" id="search-fires" placeholder="🔍 Rechercher par forêt, daïra, commune…" />
          <input type="date" id="filter-from" class="search-input" style="flex:0;width:160px;" />
          <input type="date" id="filter-to"   class="search-input" style="flex:0;width:160px;" />
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
  document.getElementById('search-fires').addEventListener('input', debounce(() => {
    currentPage = 1;
    loadHistory(currentPage);
  }, 400));
}

// ── Data loader ────────────────────────────────────────────────────────────────
async function loadHistory(page = 1) {
  const search  = document.getElementById('search-fires')?.value || '';
  const from    = document.getElementById('filter-from')?.value  || '';
  const to      = document.getElementById('filter-to')?.value    || '';
  const tableBody = document.getElementById('table-body');
  if (!tableBody) return;

  tableBody.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';

  try {
    let url = `/fires?page=${page}&per_page=10&search=${encodeURIComponent(search)}`;
    if (from) url += `&date_from=${from}`;
    if (to)   url += `&date_to=${to}`;

    const data = await api.get(url);
    const fires = data.fires || [];
    loadedFiresList = fires;

    // ── Stats bar ──────────────────────────────────────────────────────────
    const statsEl = document.getElementById('history-stats');
    if (statsEl) {
      const totalSurface = fires.reduce((s, f) => s + (f.surf_total || 0), 0);
      const incCount     = fires.filter(f => f.cause === 'INC').length;
      const conCount     = fires.filter(f => f.cause === 'CON').length;

      statsEl.innerHTML = `
        <div class="stat-card">
          <div class="stat-icon">📊</div>
          <div class="stat-value">${data.total ?? fires.length}</div>
          <div class="stat-label">Total incendies</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🌿</div>
          <div class="stat-value">${totalSurface.toFixed(1)} ha</div>
          <div class="stat-label">Surface brûlée (page)</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🔥</div>
          <div class="stat-value">${incCount}</div>
          <div class="stat-label">Incendies (INC)</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🪵</div>
          <div class="stat-value">${conCount}</div>
          <div class="stat-label">Brûlages contrôlés (CON)</div>
        </div>
      `;
    }

    // ── Empty state ────────────────────────────────────────────────────────
    if (fires.length === 0) {
      tableBody.innerHTML = '<div class="empty-state"><div class="icon">📭</div><p>Aucun incendie trouvé</p></div>';
      renderPagination(data.total || 0, page, 50);
      return;
    }

    // ── Table ──────────────────────────────────────────────────────────────
    tableBody.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Déclaration</th>
            <th>Statut</th>
            <th>Forêt</th>
            <th>Daïra / Commune</th>
            <th>Essence</th>
            <th>Forêt (ha)</th>
            <th>Maquis (ha)</th>
            <th>Broussailles (ha)</th>
            <th>Total (ha)</th>
            <th>Cause</th>
            <th>Signalé par</th>
            <th>Organismes</th>
            <th>Dégâts (DZD)</th>
            <th>Météo</th>
            <th>Extinction</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${fires.map(f => `
            <tr>
              <td>${formatDateHour(f.declaration_date, f.declaration_hour)}</td>
              <td>
                ${f.status === 'extinguished' ? `
                  <span class="badge badge-success" style="background: rgba(6, 214, 160, 0.12); color: #6ee7b7; border: 1px solid rgba(6, 214, 160, 0.2); padding: 4px 8px; border-radius: 4px; font-weight: 600; font-size: 12px; display: inline-block;">🟢 Éteint</span>
                ` : `
                  <select class="status-select" data-id="${f.id}" data-prev="${f.status || 'declared'}" style="padding: 4px 8px; border-radius: 4px; background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border-color); font-size: 12px; cursor: pointer; font-weight: 500; outline: none;">
                    <option value="declared" ${f.status === 'declared' || !f.status ? 'selected' : ''}>🔴 Déclaré</option>
                    <option value="investigating" ${f.status === 'investigating' ? 'selected' : ''}>🟠 En cours</option>
                    <option value="controlled" ${f.status === 'controlled' ? 'selected' : ''}>🟡 Maîtrisé</option>
                    <option value="extinguished" ${f.status === 'extinguished' ? 'selected' : ''}>🟢 Éteint (Bilan requis)</option>
                  </select>
                `}
              </td>
              <td><strong>${f.forest_name}</strong></td>
              <td>${[f.daira, f.commune].filter(Boolean).join(' / ') || '—'}</td>
              <td>${f.essence || '—'}</td>
              <td class="num">${f.tot_foret ?? 0}</td>
              <td class="num">${f.tot_maquis ?? 0}</td>
              <td class="num">${f.tot_broussailles ?? 0}</td>
              <td class="num"><strong>${f.surf_total ?? 0}</strong></td>
              <td>${causeBadge(f.cause)}</td>
              <td>${f.signale || '—'}</td>
              <td>${f.organismes || '—'}</td>
              <td class="num">${f.degats ? f.degats.toLocaleString('fr-DZ') : '—'}</td>
              <td>${formatMeteo(f)}</td>
              <td>${formatDateHour(f.extinction_date, f.extinction_hour)}</td>
              <td>
                <div style="display: flex; gap: 6px;">
                  <button class="btn-action-edit" data-id="${f.id}" style="background: rgba(59, 91, 219, 0.12); border: 1px solid rgba(59, 91, 219, 0.2); color: #7b9cf5; padding: 4px 8px; border-radius: 4px; font-size: 12px; cursor: pointer; transition: var(--transition);" title="Modifier">✏️</button>
                  <button class="btn-action-delete" data-id="${f.id}" style="background: rgba(230, 57, 70, 0.12); border: 1px solid rgba(230, 57, 70, 0.2); color: #fca5a5; padding: 4px 8px; border-radius: 4px; font-size: 12px; cursor: pointer; transition: var(--transition);" title="Supprimer">🗑️</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    // Bind status change event listeners
    document.querySelectorAll('.status-select').forEach(select => {
      select.addEventListener('change', async () => {
        const fireId = select.dataset.id;
        const prevStatus = select.dataset.prev;
        const newStatus = select.value;

        if (newStatus === 'extinguished') {
          showToast("Pour éteindre un incendie et enregistrer son bilan, veuillez utiliser l'onglet 'Bilan après extinction' de la page 'Ajouter un incendie'.", 'warning');
          select.value = prevStatus;
          return;
        }

        try {
          await api.patch(`/fires/${fireId}/status`, { status: newStatus });
          select.dataset.prev = newStatus;
          showToast('Statut de l\'incendie mis à jour avec succès !', 'success');
        } catch (err) {
          showToast(err.message || 'Erreur lors de la mise à jour du statut', 'error');
          select.value = prevStatus;
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
                <h3 style="margin:0; font-size:18px; font-weight:700;">✏️ Modifier l'incendie</h3>
                <button type="button" id="close-edit-modal" style="background:transparent; border:none; color:var(--text-secondary); font-size:20px; cursor:pointer;">&times;</button>
              </div>
              <div class="modal-body" style="padding: 20px; display: flex; flex-direction: column; gap: 16px;">
                
                <h4 style="margin: 0; border-bottom: 1px dashed var(--border-color); padding-bottom: 6px; color: var(--fire-orange);">🔍 Découverte</h4>
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

                <h4 style="margin: 8px 0 0 0; border-bottom: 1px dashed var(--border-color); padding-bottom: 6px; color: var(--fire-orange);">📊 Bilan & Extinction</h4>
                
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
                  <input type="text" id="edit-essence" placeholder="Ex: CL+MAQ+BRS" style="padding: 8px; border-radius: 4px; background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-primary);" />
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
                    <input type="text" id="edit-organismes" style="padding: 8px; border-radius: 4px; background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-primary);" />
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
        document.getElementById('edit-essence').value = fire.essence || '';
        document.getElementById('edit-tot-foret').value = fire.tot_foret ?? '';
        document.getElementById('edit-tot-maquis').value = fire.tot_maquis ?? '';
        document.getElementById('edit-tot-broussailles').value = fire.tot_broussailles ?? '';
        document.getElementById('edit-organismes').value = fire.organismes || '';
        document.getElementById('edit-degats').value = fire.degats ?? '';

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

          const body = {
            status:            statusVal,
            declaration_date:  declDate,
            declaration_hour:  parseInt(document.getElementById('edit-decl-hour').value) ?? null,
            intervention_date: document.getElementById('edit-int-date').value || null,
            intervention_hour: parseInt(document.getElementById('edit-int-hour').value) ?? null,
            cause:             document.getElementById('edit-cause').value,
            signale:           document.getElementById('edit-signale').value || null,
            extinction_date:   extDate || null,
            extinction_hour:   isNaN(extHour) ? null : extHour,
            essence:           document.getElementById('edit-essence').value || null,
            tot_foret:         totForet,
            tot_maquis:        totMaquis,
            tot_broussailles:  totBrousse,
            surf_total:        surfTotal,
            organismes:        document.getElementById('edit-organismes').value || null,
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

function debounce(fn, ms) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}