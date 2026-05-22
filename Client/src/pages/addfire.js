import { renderSidebar } from '../components/sidebar.js';
import { api } from '../api.js';
import { showToast } from '../main.js';

const SEVERITY_LEVELS = { 1: 'Faible', 2: 'Moyen', 3: 'Élevé', 4: 'Critique' };

// Fire lifecycle stages
const STAGES = [
  { key: 'declared',     label: '🔴 Déclaré',       desc: 'Incendie détecté et signalé' },
  { key: 'investigating',label: '🟠 En cours',       desc: 'Intervention en cours' },
  { key: 'controlled',   label: '🟡 Maîtrisé',       desc: 'Feu sous contrôle' },
  { key: 'extinguished', label: '🟢 Éteint',         desc: 'Extinction confirmée' },
];

export function addfirePage(container) {
  const layout = document.createElement('div');
  layout.className = 'app-layout';
  renderSidebar(layout);

  const main = document.createElement('main');
  main.className = 'main-content';
  main.innerHTML = `
    <header class="page-header"><h1>➕ Ajouter un incendie</h1></header>
    <div class="page-body">

      <!-- Mode Tabs -->
      <div class="mode-tabs" id="mode-tabs">
        <button type="button" class="tab-btn active" id="tab-add-fire">➕ Déclarer un incendie</button>
        <button type="button" class="tab-btn" id="tab-bilan-fire">📊 Bilan après extinction</button>
      </div>

      <div class="addfire-layout" id="addfire-layout">
        <!-- LEFT: form -->
        <div class="addfire-form">

          <!-- Section Active Fire (Mode B only) -->
          <section class="form-section" id="section-active-fire" style="display:none; border-color: var(--fire-orange);">
            <div class="section-header">
              <span class="section-badge" style="background: var(--fire-gradient);">🔍</span>
              <h3 style="color: var(--fire-orange);">Incendie en cours</h3>
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label style="color:var(--fire-orange);font-weight:700;">Sélectionnez l'incendie *</label>
              <select id="af-active-fire" style="border-color:var(--fire-orange);">
                <option value="">— Sélectionnez un incendie en cours —</option>
              </select>
            </div>
          </section>

          <!-- ════════════════════════════════════
               SECTION 1 — On-discovery inputs
               (always visible)
          ═══════════════════════════════════════ -->
          <section class="form-section" id="section-discovery">
            <div class="section-header">
              <span class="section-badge">1</span>
              <h3>🔍 Découverte de l'incendie</h3>
            </div>
            <div class="form-group">
              <label>Forêt *</label>
              <select id="af-forest" required>
                <option value="">— Sélectionnez une forêt —</option>
              </select>
            </div>
            <div class="grid-2col">
              <div class="form-group">
                <label>Daïra</label>
                <select id="af-daira">
                  <option value="">— Daïra —</option>
                </select>
              </div>
              <div class="form-group">
                <label>Commune</label>
                <select id="af-commune">
                  <option value="">— Commune —</option>
                </select>
              </div>
            </div>

            <!-- Dates -->
            <div class="grid-2col">
              <div class="form-group">
                <label>Date de déclaration *</label>
                <input type="date" id="af-decl-date" required />
              </div>
              <div class="form-group">
                <label>Heure de déclaration</label>
                <input type="number" id="af-decl-hour" min="0" max="23" placeholder="0–23" />
              </div>
            </div>

            <!-- Intervention -->
            <div class="grid-2col">
              <div class="form-group">
                <label>Date d'intervention</label>
                <input type="date" id="af-int-date" />
              </div>
              <div class="form-group">
                <label>Heure d'intervention</label>
                <input type="number" id="af-int-hour" min="0" max="23" placeholder="0–23" />
              </div>
            </div>

            <!-- Coordinates + auto-weather -->
            <div class="grid-2col">
              <div class="form-group">
                <label>Latitude</label>
                <input type="number" step="any" id="af-lat" placeholder="36.46" />
              </div>
              <div class="form-group">
                <label>Longitude</label>
                <input type="number" step="any" id="af-lon" placeholder="7.43" />
              </div>
            </div>

            <!-- Cause & reporter -->
            <div class="grid-2col">
              <div class="form-group">
                <label>Cause</label>
                <select id="af-cause">
                  <option value="Unknown">Inconnue</option>
                  <option value="INC">INC – Incendie</option>
                  <option value="CON">CON – Brûlage contrôlé</option>
                </select>
              </div>
              <div class="form-group">
                <label>Signalé par</label>
                <select id="af-signale">
                  <option value="">—</option>
                  <option value="PV">PV</option>
                  <option value="BM">BM</option>
                  <option value="PC">PC</option>
                  <option value="CT">CT</option>
                  <option value="DW">DW</option>
                  <option value="EMPS">EMPS</option>
                  <option value="GARDIEN">GARDIEN</option>
                  <option value="OCCAS">OCCAS</option>
                  <option value="PAPC">PAPC</option>
                  <option value="COMMUNE">COMMUNE</option>
                </select>
              </div>
            </div>
          </section>

          <!-- ════════════════════════════════════
               SECTION 2 — Post-extinction inputs
               (revealed when status = extinguished)
          ═══════════════════════════════════════ -->
          <section class="form-section" id="section-postfire" style="display:none;">
            <div class="section-header">
              <span class="section-badge">2</span>
              <h3>📊 Bilan après extinction</h3>
            </div>

            <!-- Extinction dates -->
            <div class="grid-2col">
              <div class="form-group">
                <label>Date d'extinction</label>
                <input type="date" id="af-ext-date" />
              </div>
              <div class="form-group">
                <label>Heure d'extinction</label>
                <input type="number" id="af-ext-hour" min="0" max="23" placeholder="0–23" />
              </div>
            </div>

            <!-- Vegetation surfaces -->
            <div class="form-group">
              <label>Type de végétation (Essence)</label>
              <input type="text" id="af-essence" placeholder="Ex: CL+MAQ+BRS" />
            </div>
            <div class="grid-2col">
              <div class="form-group">
                <label>Surface forêt (ha)</label>
                <input type="number" step="0.1" id="af-tot-foret" placeholder="0" />
              </div>
              <div class="form-group">
                <label>Surface maquis (ha)</label>
                <input type="number" step="0.1" id="af-tot-maquis" placeholder="0" />
              </div>
            </div>
            <div class="grid-2col">
              <div class="form-group">
                <label>Surface broussailles (ha)</label>
                <input type="number" step="0.1" id="af-tot-broussailles" placeholder="0" />
              </div>
              <div class="form-group">
                <label>Surface totale (ha)</label>
                <input type="number" step="0.1" id="af-surf-total" placeholder="0" readonly />
              </div>
            </div>

            <!-- Organismes & degats -->
            <div class="form-group">
              <label>Organismes intervenus</label>
              <input type="text" id="af-organismes" placeholder="Ex: SF+PC+DW+EAPC" />
            </div>
            <div class="form-group">
              <label>Dégâts estimés (DZD)</label>
              <input type="number" id="af-degats" placeholder="0" />
            </div>
          </section>

          <button type="button" class="btn-primary" id="btn-save-fire">💾 Enregistrer l'incendie</button>
        </div>

        <!-- RIGHT: map -->
        <div class="addfire-map">
          <div id="addfire-map"></div>
          <p style="padding:12px;font-size:12px;color:var(--text-muted);text-align:center;">
            Cliquez sur la carte pour sélectionner l'emplacement
          </p>
        </div>
      </div>
    </div>
  `;

  layout.appendChild(main);
  container.appendChild(layout);

  // ── Inject styles ────────────────────────────────────────────────────────────
  if (!document.getElementById('addfire-styles')) {
    const style = document.createElement('style');
    style.id = 'addfire-styles';
    style.textContent = `
      .mode-tabs {
        display: flex;
        gap: 16px;
        margin-bottom: 24px;
        border-bottom: 1px solid var(--border-color);
        padding-bottom: 8px;
      }
      .tab-btn {
        background: transparent;
        border: none;
        border-bottom: 3px solid transparent;
        color: var(--text-secondary);
        font-size: 15px;
        font-weight: 600;
        padding: 8px 16px;
        cursor: pointer;
        transition: var(--transition);
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .tab-btn:hover {
        color: var(--text-primary);
      }
      .tab-btn.active {
        color: var(--fire-orange);
        border-bottom-color: var(--fire-orange);
      }

      .addfire-layout.full-width {
        grid-template-columns: 1fr !important;
        max-width: 800px;
        margin: 0 auto;
      }

      .form-section {
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        padding: 24px;
        margin-bottom: 16px;
        transition: var(--transition);
      }
      .form-section:hover {
        border-color: var(--border-active);
      }
      .section-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 20px;
      }
      .section-badge {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: var(--fire-gradient);
        color: #fff;
        font-weight: 700;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        box-shadow: 0 2px 8px rgba(255, 107, 53, 0.3);
      }
      .section-header h3 {
        font-size: 16px;
        font-weight: 700;
        margin: 0;
        color: var(--text-primary);
      }
      .meteo-status {
        padding: 12px 16px;
        border-radius: var(--radius-sm);
        font-size: 13px;
        margin-top: 10px;
        font-weight: 500;
      }
      .meteo-status.loading {
        background: rgba(59, 91, 219, 0.12);
        color: #7b9cf5;
        border: 1px solid rgba(59, 91, 219, 0.2);
      }
      .meteo-status.success {
        background: rgba(6, 214, 160, 0.12);
        color: #6ee7b7;
        border: 1px solid rgba(6, 214, 160, 0.2);
      }
      .meteo-status.error {
        background: rgba(230, 57, 70, 0.12);
        color: #fca5a5;
        border: 1px solid rgba(230, 57, 70, 0.2);
      }
      input[readonly] {
        background: rgba(255, 255, 255, 0.03) !important;
        color: var(--text-muted) !important;
        cursor: default;
        border-style: dashed !important;
      }

      /* Grid utility classes */
      .grid-2col {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .grid-3col {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 12px;
        margin-top: 12px;
      }

      /* Remove double card background on nested form sections */
      .addfire-form {
        background: transparent !important;
        border: none !important;
        padding: 0 !important;
      }

      /* Save button full width with glow */
      .addfire-form .btn-primary {
        margin-top: 8px;
        box-shadow: 0 4px 16px rgba(255, 107, 53, 0.2);
      }
      .addfire-form .btn-primary:hover {
        box-shadow: 0 6px 28px rgba(255, 107, 53, 0.4);
      }

      @media (max-width: 640px) {
        .grid-2col, .grid-3col {
          grid-template-columns: 1fr;
        }
        .stage-selector {
          flex-direction: column;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // ── Load selects from API ────────────────────────────────────────────────────
  let forestsList = [];
  let allCommunes = [];
  let autoFilling = false; // flag to distinguish forest-triggered changes from manual

  async function loadSelects() {
    try {
      const [forestsRes, dairas, communes] = await Promise.all([
        api.get('/forests'),
        api.get('/dairas'),
        api.get('/communes'),
      ]);

      const forestSel  = document.getElementById('af-forest');
      const dairasSel  = document.getElementById('af-daira');
      const communeSel = document.getElementById('af-commune');

      forestsList = forestsRes?.forests || forestsRes || [];
      allCommunes = communes || [];

      // Helper: rebuild forest dropdown filtered by daira/commune
      function updateForestOptions(dairaId, communeId, selectedForestId) {
        forestSel.innerHTML = '<option value="">— Sélectionnez une forêt —</option>';
        let filtered = forestsList;
        if (communeId) {
          filtered = filtered.filter(f => {
            const fCommuneId = f.commune?._id || f.commune?.id || f.commune;
            return fCommuneId === communeId;
          });
        } else if (dairaId) {
          filtered = filtered.filter(f => {
            const fDairaId = f.daira?._id || f.daira?.id || f.daira;
            return fDairaId === dairaId;
          });
        }
        filtered.forEach(f => {
          const fId = f._id || f.id;
          const selected = fId === selectedForestId ? ' selected' : '';
          forestSel.innerHTML += `<option value="${fId}"${selected}>${f.name}</option>`;
        });
      }

      // Show all forests initially
      updateForestOptions(null, null, null);

      (dairas?.dairas || dairas || []).forEach(d => {
        dairasSel.innerHTML += `<option value="${d._id || d.id}">${d.name}</option>`;
      });

      // Helper: rebuild commune dropdown filtered by daira
      function updateCommuneOptions(dairaId, selectedCommuneId) {
        communeSel.innerHTML = '<option value="">— Commune —</option>';
        const filtered = dairaId
          ? allCommunes.filter(c => {
              const cDairaId = c.daira?._id || c.daira?.id || c.daira;
              return cDairaId === dairaId;
            })
          : allCommunes;
        filtered.forEach(c => {
          const cId = c._id || c.id;
          const selected = cId === selectedCommuneId ? ' selected' : '';
          communeSel.innerHTML += `<option value="${cId}"${selected}>${c.name}</option>`;
        });
      }

      // Show all communes initially
      updateCommuneOptions(null, null);

      // ── Forest change → auto-fill daira, commune, coords ──
      forestSel.addEventListener('change', () => {
        const selectedId = forestSel.value;
        if (!selectedId) return;

        const forest = forestsList.find(f => (f._id || f.id) === selectedId);
        if (!forest) return;

        autoFilling = true;

        // Auto-select daira & filter communes
        if (forest.daira) {
          const dairaId = forest.daira._id || forest.daira.id || forest.daira;
          dairasSel.value = dairaId;
          const communeId = forest.commune
            ? (forest.commune._id || forest.commune.id || forest.commune)
            : null;
          updateCommuneOptions(dairaId, communeId);
        }

        // Auto-fill coordinates
        if (forest.latitude != null) {
          document.getElementById('af-lat').value = forest.latitude;
        }
        if (forest.longitude != null) {
          document.getElementById('af-lon').value = forest.longitude;
        }

        autoFilling = false;
      });

      // ── Daira change → filter communes & forests ──
      dairasSel.addEventListener('change', () => {
        const dairaId = dairasSel.value;
        updateCommuneOptions(dairaId, null);
        if (!autoFilling) {
          updateForestOptions(dairaId, null, null);
          document.getElementById('af-lat').value = '';
          document.getElementById('af-lon').value = '';
        }
      });

      // ── Commune change → filter forests ──
      communeSel.addEventListener('change', () => {
        const dairaId = dairasSel.value;
        const communeId = communeSel.value;
        if (!autoFilling) {
          updateForestOptions(dairaId, communeId, null);
          document.getElementById('af-lat').value = '';
          document.getElementById('af-lon').value = '';
        }
      });

    } catch (err) {
      console.warn('[addfire] Could not load selects:', err.message);
    }
  }
  loadSelects();

  // ── Auto-calculate Surface Totale ──────────────────────────────────────────
  const foretInput = document.getElementById('af-tot-foret');
  const maquisInput = document.getElementById('af-tot-maquis');
  const broussaillesInput = document.getElementById('af-tot-broussailles');
  const surfTotalInput = document.getElementById('af-surf-total');

  function calculateTotalSurface() {
    const foret = parseFloat(foretInput.value) || 0;
    const maquis = parseFloat(maquisInput.value) || 0;
    const broussailles = parseFloat(broussaillesInput.value) || 0;
    const sum = foret + maquis + broussailles;
    surfTotalInput.value = sum > 0 ? sum.toFixed(1) : '';
  }

  [foretInput, maquisInput, broussaillesInput].forEach(input => {
    if (input) {
      input.addEventListener('input', calculateTotalSurface);
    }
  });

  // ── Default date = today ─────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('af-decl-date').value = today;

  // ── Mode Tab Selector ────────────────────────────────────────────────────────
  let activeMode = 'declare'; // 'declare' or 'bilan'
  let activeFiresList = [];

  const discoveryFields = [
    'af-forest', 'af-daira', 'af-commune',
    'af-decl-date', 'af-decl-hour',
    'af-int-date', 'af-int-hour',
    'af-lat', 'af-lon', 'af-cause', 'af-signale'
  ];

  function setDiscoveryFieldsReadOnly(isReadOnly) {
    discoveryFields.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        if (el.tagName === 'SELECT') {
          el.disabled = isReadOnly;
        } else {
          el.readOnly = isReadOnly;
        }
      }
    });
  }

  function clearDiscoveryFields() {
    autoFilling = true;
    discoveryFields.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        if (el.tagName === 'SELECT') {
          el.selectedIndex = 0;
          if (id === 'af-daira') {
            el.dispatchEvent(new Event('change'));
          }
        } else {
          el.value = '';
        }
      }
    });
    document.getElementById('af-decl-date').value = today;
    autoFilling = false;
  }

  async function loadActiveFires() {
    try {
      const res = await api.get('/fires?per_page=1000');
      const fires = res.fires || res || [];
      activeFiresList = fires.filter(f => f.status !== 'extinguished');

      const activeFireSel = document.getElementById('af-active-fire');
      activeFireSel.innerHTML = '<option value="">— Sélectionnez un incendie en cours —</option>';
      activeFiresList.forEach(f => {
        const dateStr = f.declaration_date || '';
        const name = `${f.forest_name} (${f.daira} - ${f.commune}) - du ${dateStr}`;
        activeFireSel.innerHTML += `<option value="${f.id}">${name}</option>`;
      });
    } catch (err) {
      console.warn('[addfire] Could not load active fires:', err.message);
    }
  }

  // Bind tab toggles
  const tabAddFire = document.getElementById('tab-add-fire');
  const tabBilanFire = document.getElementById('tab-bilan-fire');
  const sectionActiveFire = document.getElementById('section-active-fire');
  const sectionDiscovery = document.getElementById('section-discovery');
  const postSection = document.getElementById('section-postfire');
  const addFireLayout = document.getElementById('addfire-layout');
  const mapColumn = document.querySelector('.addfire-map');
  const saveBtn = document.getElementById('btn-save-fire');

  let selectedFire = null; // Stores the fire object selected in Mode B

  tabAddFire.addEventListener('click', () => {
    activeMode = 'declare';
    selectedFire = null;
    tabAddFire.classList.add('active');
    tabBilanFire.classList.remove('active');

    // Show discovery + map, hide bilan sections
    sectionActiveFire.style.display = 'none';
    sectionDiscovery.style.display = 'block';
    postSection.style.display = 'none';
    if (mapColumn) mapColumn.style.display = 'block';
    addFireLayout.classList.remove('full-width');

    setDiscoveryFieldsReadOnly(false);
    clearDiscoveryFields();
    saveBtn.innerHTML = '💾 Enregistrer l\'incendie';
  });

  tabBilanFire.addEventListener('click', () => {
    activeMode = 'bilan';
    selectedFire = null;
    tabAddFire.classList.remove('active');
    tabBilanFire.classList.add('active');

    // Hide discovery + map, show bilan sections
    sectionActiveFire.style.display = 'block';
    sectionDiscovery.style.display = 'none';
    postSection.style.display = 'block';
    if (mapColumn) mapColumn.style.display = 'none';
    addFireLayout.classList.add('full-width');

    // Reset active fire selector
    document.getElementById('af-active-fire').value = '';
    loadActiveFires();
    saveBtn.innerHTML = '💾 Enregistrer le bilan';
  });

  // Bind active fire selection — just store the reference
  document.getElementById('af-active-fire').addEventListener('change', () => {
    const selectedId = document.getElementById('af-active-fire').value;
    if (!selectedId) {
      selectedFire = null;
      return;
    }
    selectedFire = activeFiresList.find(f => f.id === selectedId) || null;
  });

  // ── Map init ─────────────────────────────────────────────────────────────────
  setTimeout(() => {
    const mapEl = document.getElementById('addfire-map');
    if (mapEl && window.L) {
      const map = L.map('addfire-map').setView([36.46, 7.43], 8);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap', maxZoom: 18,
      }).addTo(map);

      let marker = null;
      map.on('click', (e) => {
        if (activeMode === 'bilan') return;
        const { lat, lng } = e.latlng;
        document.getElementById('af-lat').value = lat.toFixed(5);
        document.getElementById('af-lon').value = lng.toFixed(5);
        if (marker) marker.setLatLng(e.latlng);
        else marker = L.marker(e.latlng).addTo(map);
      });

      setTimeout(() => map.invalidateSize(), 300);
    }
  }, 200);

  // ── Save ─────────────────────────────────────────────────────────────────────
  saveBtn.addEventListener('click', async () => {
    if (activeMode === 'declare') {
      // ── MODE A: Create declared fire ──
      const forestVal = document.getElementById('af-forest').value;
      const declDate  = document.getElementById('af-decl-date').value;

      if (!forestVal) { showToast('Veuillez sélectionner une forêt', 'error'); return; }
      if (!declDate)  { showToast('La date de déclaration est requise', 'error'); return; }

      const body = {
        forest_id:  forestVal,
        daira_id:   document.getElementById('af-daira').value   || null,
        commune_id: document.getElementById('af-commune').value || null,

        declaration_date:  declDate,
        declaration_hour:  parseInt(document.getElementById('af-decl-hour').value)  || null,
        intervention_date: document.getElementById('af-int-date').value  || null,
        intervention_hour: parseInt(document.getElementById('af-int-hour').value)   || null,

        cause:   document.getElementById('af-cause').value,
        signale: document.getElementById('af-signale').value || null,
        status:  'declared',
      };

      try {
        await api.post('/fires', body);
        showToast('Incendie ajouté avec succès !', 'success');
        clearDiscoveryFields();
      } catch (err) {
        showToast(err.message || 'Erreur lors de l\'ajout', 'error');
      }

    } else {
      // ── MODE B: Save extinction report ──
      if (!selectedFire) {
        showToast('Veuillez sélectionner un incendie en cours', 'error');
        return;
      }

      const extDate = document.getElementById('af-ext-date').value;
      const extHour = parseInt(document.getElementById('af-ext-hour').value);

      if (!extDate) {
        showToast("La date d'extinction est requise", 'error');
        return;
      }

      // Validate against the selected fire's declaration date
      const declDate = selectedFire.declaration_date || '';
      const declHour = selectedFire.declaration_hour;

      if (declDate && extDate < declDate) {
        showToast("La date d'extinction ne peut pas être antérieure à la date de déclaration", 'error');
        return;
      }
      if (declDate && extDate === declDate && !isNaN(extHour) && declHour != null && extHour < declHour) {
        showToast("L'heure d'extinction ne peut pas être antérieure à l'heure de déclaration", 'error');
        return;
      }

      const body = {
        status:                'extinguished',
        extinction_date:       extDate,
        extinction_hour:       isNaN(extHour) ? null : extHour,
        essence:               document.getElementById('af-essence').value       || null,
        tot_foret:             parseFloat(document.getElementById('af-tot-foret').value)        || 0,
        tot_maquis:            parseFloat(document.getElementById('af-tot-maquis').value)       || 0,
        tot_broussailles:      parseFloat(document.getElementById('af-tot-broussailles').value) || 0,
        surf_total:            parseFloat(document.getElementById('af-surf-total').value)       || 0,
        organismes:            document.getElementById('af-organismes').value || null,
        degats:                parseFloat(document.getElementById('af-degats').value) || 0,
      };

      try {
        await api.put(`/fires/${selectedFire.id}`, body);
        showToast('Bilan après extinction enregistré avec succès !', 'success');

        // Reset post-extinction fields
        ['af-ext-date', 'af-ext-hour', 'af-essence', 'af-tot-foret',
         'af-tot-maquis', 'af-tot-broussailles', 'af-surf-total',
         'af-organismes', 'af-degats'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = '';
        });

        // Return to Add Fire Mode A
        tabAddFire.click();
      } catch (err) {
        showToast(err.message || 'Erreur lors de l\'enregistrement', 'error');
      }
    }
  });
}