import { renderSidebar } from '../components/sidebar.js';
import { api } from '../api.js';
import { showToast } from '../main.js';

export function forestsPage(container) {
  const layout = document.createElement('div');
  layout.className = 'app-layout';
  renderSidebar(layout);

  const main = document.createElement('main');
  main.className = 'main-content';
  main.innerHTML = `
    <header class="page-header">
      <h1>🌲 Gestion des Forêts</h1>
      <div class="header-actions">
        <!-- Optional top level badge or page controls -->
      </div>
    </header>
    <div class="page-body">
      <!-- Top Filter Bar -->
      <div class="table-toolbar" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 16px 24px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; gap: 16px;">
        <div style="display: flex; gap: 16px; flex: 1; align-items: center; flex-wrap: wrap;">
          <input type="text" id="forest-search" placeholder="🔍 Rechercher une forêt..." class="search-input" style="max-width: 280px; margin: 0;" />
          
          <select id="filter-daira" class="search-input" style="max-width: 200px; margin: 0; background: var(--bg-input);">
            <option value="">Toutes les Daïras</option>
          </select>

          <select id="filter-commune" class="search-input" style="max-width: 200px; margin: 0; background: var(--bg-input);" disabled>
            <option value="">Toutes les Communes</option>
          </select>
        </div>
        
        <button id="btn-add-forest" class="btn-primary" style="margin: 0; width: auto; padding: 10px 20px; display: flex; align-items: center; gap: 8px; font-weight: 600;">
          <span>➕</span> Ajouter une Forêt
        </button>
      </div>

      <!-- Forests Table List -->
      <div class="data-table-wrap">
        <div style="overflow-x: auto;">
          <table class="data-table" id="forests-table">
            <thead>
              <tr>
                <th>Nom de la forêt</th>
                <th>Daïra</th>
                <th>Commune</th>
                <th>Coordonnées</th>
                <th>Nombre d'incendies</th>
                <th style="text-align: right; padding-right: 24px;">Actions</th>
              </tr>
            </thead>
            <tbody id="forests-list-body">
              <tr><td colspan="6"><div class="spinner"></div></td></tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination Bar -->
        <div class="pagination-bar" style="display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; border-top: 1px solid var(--border-color); background: rgba(0,0,0,0.15); flex-wrap: wrap; gap: 12px;">
          <div style="font-size: 13px; color: var(--text-secondary);" id="pagination-info">
            Affichage de 0 - 0 sur 0 forêts
          </div>
          <div style="display: flex; gap: 8px; align-items: center;" id="pagination-buttons">
            <button id="btn-prev-page" class="btn-secondary" style="padding: 6px 14px; font-size: 13px; margin: 0;" disabled>Précédent</button>
            <span id="page-indicator" style="font-size: 13px; color: var(--text-primary); font-weight: 600; padding: 0 8px;">Page 1</span>
            <button id="btn-next-page" class="btn-secondary" style="padding: 6px 14px; font-size: 13px; margin: 0;" disabled>Suivant</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add / Edit Forest Modal Dialog -->
    <div id="forest-modal" class="modal-backdrop" style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 2000; opacity: 0; pointer-events: none; transition: opacity 0.25s ease;">
      <div class="modal-card" style="width: 550px; max-width: 90vw; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 32px; box-shadow: var(--shadow-lg); transform: translateY(-20px); transition: transform 0.25s ease; position: relative;">
        <!-- Close Button -->
        <button id="modal-close" style="position: absolute; top: 20px; right: 20px; background: transparent; font-size: 20px; color: var(--text-secondary); transition: var(--transition);">✕</button>
        
        <h3 id="modal-title" style="font-size: 20px; font-weight: 700; margin-bottom: 24px; color: var(--text-primary);">🌲 Ajouter une Forêt</h3>
        
        <form id="forest-form">
          <input type="hidden" id="forest-id" />
          
          <div class="form-group">
            <label>Nom de la forêt *</label>
            <input type="text" id="forest-name" placeholder="Ex: MAHOUNA" required style="text-transform: uppercase;" />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label>Daïra *</label>
              <select id="forest-daira" required>
                <option value="">Sélectionner</option>
              </select>
            </div>
            <div class="form-group">
              <label>Commune *</label>
              <select id="forest-commune" required disabled>
                <option value="">Sélectionner</option>
              </select>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div class="form-group">
              <label>Latitude</label>
              <input type="number" step="any" id="forest-lat" placeholder="36.45" />
            </div>
            <div class="form-group">
              <label>Longitude</label>
              <input type="number" step="any" id="forest-lon" placeholder="7.43" />
            </div>
          </div>

          <!-- Embedded Selection Map inside Dialog -->
          <div class="form-group" style="margin-top: 8px;">
            <div id="modal-map-container" style="height: 180px; border-radius: var(--radius-sm); overflow: hidden; border: 1px solid var(--border-color); margin-bottom: 8px; position: relative;">
              <div id="modal-map" style="height: 100%; width: 100%;"></div>
            </div>
            <p style="font-size: 11px; color: var(--text-muted); text-align: center; margin: 0;">Cliquez sur la carte pour capturer les coordonnées WGS84</p>
          </div>

          <div style="display: flex; gap: 12px; margin-top: 24px; justify-content: flex-end;">
            <button type="button" id="modal-cancel" class="btn-secondary" style="width: auto; padding: 10px 24px;">Annuler</button>
            <button type="submit" class="btn-primary" style="width: auto; padding: 10px 28px; margin: 0;">Enregistrer</button>
          </div>
        </form>
      </div>
    </div>
  `;

  layout.appendChild(main);
  container.appendChild(layout);

  // Page States
  let forests = [];
  let dairas = [];
  let communes = [];
  let map = null;
  let marker = null;
  let isEditing = false;

  // Pagination states
  let currentPage = 1;
  const perPage = 10;
  let totalForests = 0;

  // DOM Elements
  const searchInput = document.getElementById('forest-search');
  const filterDaira = document.getElementById('filter-daira');
  const filterCommune = document.getElementById('filter-commune');
  const btnAddForest = document.getElementById('btn-add-forest');
  const listBody = document.getElementById('forests-list-body');

  // Pagination elements
  const paginationInfo = document.getElementById('pagination-info');
  const btnPrevPage = document.getElementById('btn-prev-page');
  const btnNextPage = document.getElementById('btn-next-page');
  const pageIndicator = document.getElementById('page-indicator');

  // Modal elements
  const modal = document.getElementById('forest-modal');
  const modalContent = modal.querySelector('.modal-card');
  const modalClose = document.getElementById('modal-close');
  const modalCancel = document.getElementById('modal-cancel');
  const modalTitle = document.getElementById('modal-title');
  const form = document.getElementById('forest-form');
  const idInput = document.getElementById('forest-id');
  const nameInput = document.getElementById('forest-name');
  const dairaSelect = document.getElementById('forest-daira');
  const communeSelect = document.getElementById('forest-commune');
  const latInput = document.getElementById('forest-lat');
  const lonInput = document.getElementById('forest-lon');

  // Initialize
  initPage();

  async function initPage() {
    try {
      const [dairasRes, communesRes] = await Promise.all([
        api.get('/dairas'),
        api.get('/communes')
      ]);

      dairas = dairasRes || [];
      communes = communesRes || [];

      // 1. Populate top filter Daira dropdown
      filterDaira.innerHTML = '<option value="">Toutes les Daïras</option>' +
        dairas.map(d => `<option value="${d._id}">${d.name}</option>`).join('');

      // 2. Populate form Daira dropdown
      dairaSelect.innerHTML = '<option value="">Sélectionner</option>' +
        dairas.map(d => `<option value="${d._id}">${d.name}</option>`).join('');

      // 3. Load forests and setup map
      await loadForests();
      initLeafletMap();
      setupEventListeners();
    } catch (err) {
      showToast(err.message || 'Erreur lors du chargement des données', 'error');
    }
  }

  function setupEventListeners() {
    // Top filters changes (debounced search would be nice, but simple input works)
    let searchTimeout;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentPage = 1;
        loadForests();
      }, 300);
    });

    filterDaira.addEventListener('change', () => {
      const dairaId = filterDaira.value;
      if (dairaId) {
        filterCommune.disabled = false;
        const filteredCommunes = communes.filter(c => c.daira && (c.daira._id === dairaId || c.daira === dairaId));
        filterCommune.innerHTML = '<option value="">Toutes les Communes</option>' +
          filteredCommunes.map(c => `<option value="${c._id}">${c.name}</option>`).join('');
      } else {
        filterCommune.disabled = true;
        filterCommune.innerHTML = '<option value="">Toutes les Communes</option>';
      }
      currentPage = 1;
      loadForests();
    });

    filterCommune.addEventListener('change', () => {
      currentPage = 1;
      loadForests();
    });

    // Pagination buttons events
    btnPrevPage.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        loadForests();
      }
    });

    btnNextPage.addEventListener('click', () => {
      const maxPage = Math.ceil(totalForests / perPage);
      if (currentPage < maxPage) {
        currentPage++;
        loadForests();
      }
    });

    // Form interactive dropdowns
    dairaSelect.addEventListener('change', () => {
      const dairaId = dairaSelect.value;
      populateCommunesDropdown(dairaId);
    });

    // Modal control events
    btnAddForest.addEventListener('click', () => openModal(false));
    modalClose.addEventListener('click', closeModal);
    modalCancel.addEventListener('click', closeModal);
    form.addEventListener('submit', handleFormSubmit);

    // Click outside modal card to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  function populateCommunesDropdown(dairaId, selectedCommuneId = '') {
    if (dairaId) {
      communeSelect.disabled = false;
      const filtered = communes.filter(c => c.daira && (c.daira._id === dairaId || c.daira === dairaId));
      communeSelect.innerHTML = '<option value="">Sélectionner</option>' +
        filtered.map(c => `<option value="${c._id}" ${c._id === selectedCommuneId ? 'selected' : ''}>${c.name}</option>`).join('');
    } else {
      communeSelect.disabled = true;
      communeSelect.innerHTML = '<option value="">Sélectionner</option>';
    }
  }

  async function loadForests() {
    listBody.innerHTML = `<tr><td colspan="6"><div class="spinner"></div></td></tr>`;
    
    const q = searchInput.value.trim();
    const dairaId = filterDaira.value;
    const communeId = filterCommune.value;

    let url = `/forests?page=${currentPage}&per_page=${perPage}`;
    if (q) url += `&search=${encodeURIComponent(q)}`;
    if (dairaId) url += `&daira=${dairaId}`;
    if (communeId) url += `&commune=${communeId}`;

    try {
      const res = await api.get(url);
      forests = res.forests || [];
      totalForests = res.total || 0;

      renderForestsList();
      renderPagination();
    } catch (err) {
      showToast(err.message || 'Erreur lors du chargement des forêts', 'error');
    }
  }

  function renderForestsList() {
    if (forests.length === 0) {
      listBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-secondary); padding:32px;">Aucune forêt ne correspond aux critères</td></tr>`;
      return;
    }

    listBody.innerHTML = forests.map(f => {
      const dName = f.daira && f.daira.name ? f.daira.name : 'N/A';
      const cName = f.commune && f.commune.name ? f.commune.name : 'N/A';
      const coords = f.latitude && f.longitude ? `${f.latitude.toFixed(5)}, ${f.longitude.toFixed(5)}` : 'N/A';
      const count = f.fire_count !== undefined ? f.fire_count : 0;

      return `
        <tr>
          <td><strong style="color:var(--text-primary); font-size: 15px;">${f.name}</strong></td>
          <td><span class="badge" style="background: rgba(255,255,255,0.05); color: var(--text-secondary); font-size: 11px;">${dName}</span></td>
          <td><span class="badge" style="background: rgba(255,255,255,0.05); color: var(--text-secondary); font-size: 11px;">${cName}</span></td>
          <td style="font-family: monospace; font-size: 13px; color: var(--text-muted);">${coords}</td>
          <td>
            <span class="badge ${count > 5 ? 'badge-critical' : count > 2 ? 'badge-high' : count > 0 ? 'badge-medium' : 'badge-low'}">
              ${count} ${count > 1 ? 'incendies' : 'incendie'}
            </span>
          </td>
          <td style="text-align: right; padding-right: 24px;">
            <div style="display: flex; gap: 8px; justify-content: flex-end; align-items: center;">
              <button class="btn-edit-forest btn-secondary" style="padding: 6px 12px; font-size: 13px; margin: 0;" data-id="${f.id || f._id}">✏️ Modifier</button>
              <button class="btn-delete-forest btn-primary" style="padding: 6px 12px; font-size: 13px; background: var(--fire-red); margin: 0;" data-id="${f.id || f._id}">🗑️ Supprimer</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Attach row action listeners
    listBody.querySelectorAll('.btn-edit-forest').forEach(btn => {
      btn.addEventListener('click', () => editForest(btn.dataset.id));
    });

    listBody.querySelectorAll('.btn-delete-forest').forEach(btn => {
      btn.addEventListener('click', () => deleteForest(btn.dataset.id));
    });
  }

  function renderPagination() {
    const totalPages = Math.ceil(totalForests / perPage) || 1;
    
    // Update button states
    btnPrevPage.disabled = currentPage <= 1;
    btnNextPage.disabled = currentPage >= totalPages;

    // Update text indicators
    pageIndicator.textContent = `Page ${currentPage} sur ${totalPages}`;
    
    const startIdx = totalForests === 0 ? 0 : (currentPage - 1) * perPage + 1;
    const endIdx = Math.min(currentPage * perPage, totalForests);
    paginationInfo.textContent = `Affichage de ${startIdx} - ${endIdx} sur ${totalForests} forêts`;
  }

  function initLeafletMap() {
    if (!window.L) return;

    // Centered at Guelma, Algeria
    map = L.map('modal-map').setView([36.46, 7.43], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      latInput.value = lat.toFixed(6);
      lonInput.value = lng.toFixed(6);
      updateMarker(lat, lng);
    });

    // Inputs update map marker
    const updateMarkerFromInputs = () => {
      const lat = parseFloat(latInput.value);
      const lon = parseFloat(lonInput.value);
      if (!isNaN(lat) && !isNaN(lon)) {
        updateMarker(lat, lon);
        map.setView([lat, lon], 12);
      }
    };

    latInput.addEventListener('input', updateMarkerFromInputs);
    lonInput.addEventListener('input', updateMarkerFromInputs);
  }

  function updateMarker(lat, lng) {
    if (!map) return;
    if (marker) {
      marker.setLatLng([lat, lng]);
    } else {
      marker = L.marker([lat, lng]).addTo(map);
    }
  }

  function openModal(editMode = false) {
    isEditing = editMode;
    modalTitle.innerHTML = isEditing ? '✏️ Modifier la Forêt' : '🌲 Ajouter une Forêt';
    
    modal.style.opacity = '1';
    modal.style.pointerEvents = 'auto';
    modalContent.style.transform = 'translateY(0)';

    // Invalidate Leaflet map size
    setTimeout(() => {
      if (map) {
        map.invalidateSize();
        if (latInput.value && lonInput.value) {
          const lat = parseFloat(latInput.value);
          const lon = parseFloat(lonInput.value);
          updateMarker(lat, lon);
          map.setView([lat, lon], 12);
        } else {
          if (marker) {
            map.removeLayer(marker);
            marker = null;
          }
          map.setView([36.46, 7.43], 10);
        }
      }
    }, 200);
  }

  function closeModal() {
    modal.style.opacity = '0';
    modal.style.pointerEvents = 'none';
    modalContent.style.transform = 'translateY(-20px)';
    
    // Reset state & form
    form.reset();
    idInput.value = '';
    communeSelect.innerHTML = '<option value="">Sélectionner</option>';
    communeSelect.disabled = true;
    
    if (marker && map) {
      map.removeLayer(marker);
      marker = null;
    }
  }

  function editForest(id) {
    const forest = forests.find(f => (f.id || f._id) === id);
    if (!forest) return;

    idInput.value = id;
    nameInput.value = forest.name;

    const dairaId = forest.daira && forest.daira._id ? forest.daira._id : forest.daira || '';
    dairaSelect.value = dairaId;

    const communeId = forest.commune && forest.commune._id ? forest.commune._id : forest.commune || '';
    populateCommunesDropdown(dairaId, communeId);

    latInput.value = forest.latitude || '';
    lonInput.value = forest.longitude || '';

    openModal(true);
  }

  async function deleteForest(id) {
    const forest = forests.find(f => (f.id || f._id) === id);
    if (!forest) return;

    if (!confirm(`Voulez-vous vraiment supprimer la forêt "${forest.name}" ?`)) {
      return;
    }

    try {
      await api.del(`/forests/${id}`);
      showToast('Forêt supprimée avec succès !', 'success');

      // Refresh current page
      await loadForests();
    } catch (err) {
      showToast(err.message || 'Erreur lors de la suppression', 'error');
    }
  }

  async function handleFormSubmit(e) {
    e.preventDefault();

    const id = idInput.value;
    const body = {
      name: nameInput.value.toUpperCase().trim(),
      daira_id: dairaSelect.value,
      commune_id: communeSelect.value,
      latitude: parseFloat(latInput.value) || null,
      longitude: parseFloat(lonInput.value) || null
    };

    try {
      if (isEditing) {
        await api.put(`/forests/${id}`, body);
        showToast('Forêt modifiée avec succès !', 'success');
      } else {
        await api.post('/forests', body);
        showToast('Forêt ajoutée avec succès !', 'success');
        currentPage = 1; // Go back to page 1 on new add
      }

      await loadForests();
      closeModal();
    } catch (err) {
      showToast(err.message || "Erreur lors de l'enregistrement", 'error');
    }
  }
}
