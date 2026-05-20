import { renderSidebar } from '../components/sidebar.js';
import { api } from '../api.js';
import { showToast } from '../main.js';

export function addfirePage(container) {
  const layout = document.createElement('div');
  layout.className = 'app-layout';
  renderSidebar(layout);

  const main = document.createElement('main');
  main.className = 'main-content';
  main.innerHTML = `
    <header class="page-header"><h1>➕ Ajouter un incendie</h1></header>
    <div class="page-body">
      <div class="addfire-layout">
        <div class="addfire-form">
          <h3 style="font-size:18px;font-weight:700;margin-bottom:20px;">📝 Informations de l'incendie</h3>
          <form id="addfire-form">
            <div class="form-group">
              <label>Nom de la forêt *</label>
              <input type="text" id="af-forest" placeholder="Ex: MAHOUNA" required />
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div class="form-group">
                <label>Daïra</label>
                <input type="text" id="af-daira" placeholder="Ex: GUELMA" />
              </div>
              <div class="form-group">
                <label>Commune</label>
                <input type="text" id="af-commune" placeholder="Ex: GUELMA" />
              </div>
            </div>
            <div class="form-group">
              <label>Date de l'incendie *</label>
              <input type="date" id="af-date" required />
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div class="form-group">
                <label>Latitude</label>
                <input type="number" step="any" id="af-lat" placeholder="36.46" />
              </div>
              <div class="form-group">
                <label>Longitude</label>
                <input type="number" step="any" id="af-lon" placeholder="7.43" />
              </div>
            </div>
            <div class="form-group">
              <label>Surface brûlée (ha)</label>
              <input type="number" step="0.1" id="af-surface" placeholder="0" />
            </div>
            <div class="form-group">
              <label>Cause</label>
              <select id="af-cause">
                <option value="Unknown">Inconnue</option>
                <option value="Natural">Naturelle</option>
                <option value="Human">Humaine</option>
                <option value="Agricultural">Agricole</option>
              </select>
            </div>
            <div class="form-group">
              <label>Gravité: <span id="sev-label">Moyen</span></label>
              <input type="range" min="1" max="4" value="2" class="severity-slider" id="af-severity" />
            </div>
            <div class="form-group">
              <label>Remarques</label>
              <textarea id="af-notes" rows="3" placeholder="Notes additionnelles..." style="resize:vertical;"></textarea>
            </div>
            <button type="submit" class="btn-primary">💾 Enregistrer l'incendie</button>
          </form>
        </div>
        <div class="addfire-map">
          <div id="addfire-map"></div>
          <p style="padding:12px;font-size:12px;color:var(--text-muted);text-align:center;">Cliquez sur la carte pour sélectionner l'emplacement</p>
        </div>
      </div>
    </div>
  `;
  layout.appendChild(main);
  container.appendChild(layout);

  // Severity slider label
  const slider = document.getElementById('af-severity');
  const sevLabel = document.getElementById('sev-label');
  const levels = { 1: 'Faible', 2: 'Moyen', 3: 'Élevé', 4: 'Critique' };
  const sevMap = { 1: 'low', 2: 'medium', 3: 'high', 4: 'critical' };
  slider.addEventListener('input', () => { sevLabel.textContent = levels[slider.value]; });

  // Init map
  setTimeout(() => {
    const mapEl = document.getElementById('addfire-map');
    if (mapEl && window.L) {
      const map = L.map('addfire-map').setView([36.46, 7.43], 10);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap', maxZoom: 18,
      }).addTo(map);

      let marker = null;
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        document.getElementById('af-lat').value = lat.toFixed(5);
        document.getElementById('af-lon').value = lng.toFixed(5);
        if (marker) marker.setLatLng(e.latlng);
        else marker = L.marker(e.latlng).addTo(map);
      });

      setTimeout(() => map.invalidateSize(), 300);
    }
  }, 200);

  // Form submit
  document.getElementById('addfire-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      forest_name: document.getElementById('af-forest').value.trim(),
      daira: document.getElementById('af-daira').value.trim(),
      commune: document.getElementById('af-commune').value.trim(),
      fire_date: document.getElementById('af-date').value,
      latitude: parseFloat(document.getElementById('af-lat').value) || null,
      longitude: parseFloat(document.getElementById('af-lon').value) || null,
      surface_burned: parseFloat(document.getElementById('af-surface').value) || 0,
      cause: document.getElementById('af-cause').value,
      severity: sevMap[slider.value],
      notes: document.getElementById('af-notes').value.trim(),
    };

    try {
      await api.post('/fires', body);
      showToast('Incendie ajouté avec succès !', 'success');
      document.getElementById('addfire-form').reset();
      sevLabel.textContent = 'Moyen';
    } catch (err) {
      showToast(err.message || 'Erreur lors de l\'ajout', 'error');
    }
  });
}
