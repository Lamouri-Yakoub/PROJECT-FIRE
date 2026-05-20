import { renderSidebar } from '../components/sidebar.js';
import { api } from '../api.js';

export function dashboardPage(container) {
  const layout = document.createElement('div');
  layout.className = 'app-layout';

  renderSidebar(layout);

  const main = document.createElement('main');
  main.className = 'main-content';
  main.innerHTML = `
    <header class="page-header">
      <h1>🗺️ Tableau de bord</h1>
    </header>
    <div class="page-body">
      <div class="stats-grid" id="stats-grid">
        <div class="stat-card"><div class="spinner"></div></div>
      </div>
      <div class="map-container" style="position:relative;">
        <div id="map"></div>
        <div class="map-legend">
          <h4>Niveau de risque</h4>
          <div class="legend-item"><span class="legend-dot" style="background:var(--risk-low)"></span> Faible</div>
          <div class="legend-item"><span class="legend-dot" style="background:var(--risk-medium)"></span> Moyen</div>
          <div class="legend-item"><span class="legend-dot" style="background:var(--risk-high)"></span> Élevé</div>
          <div class="legend-item"><span class="legend-dot" style="background:var(--risk-critical)"></span> Critique</div>
        </div>
      </div>
    </div>
  `;
  layout.appendChild(main);
  container.appendChild(layout);

  // Load data
  loadDashboard();
}

async function loadDashboard() {
  // Load weather
  let weather = { temperature: '--', humidity: '--', wind_speed: '--' };
  try { weather = await api.getWeather(); } catch(e) { console.warn('Weather fetch failed', e); }

  // Load stats
  let stats = { total: 0, this_month: 0, top_zone: 'N/A', heatmap: [] };
  try { stats = await api.get('/fires/stats'); } catch(e) { console.warn('Stats fetch failed', e); }

  // Render stats cards
  const grid = document.getElementById('stats-grid');
  if (grid) {
    grid.innerHTML = `
      <div class="stat-card">
        <div class="stat-icon">🔥</div>
        <div class="stat-value">${stats.this_month}</div>
        <div class="stat-label">Incendies ce mois</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">⚠️</div>
        <div class="stat-value" style="font-size:18px;">${stats.top_zone}</div>
        <div class="stat-label">Zone la plus dangereuse</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🌡️</div>
        <div class="stat-value">${weather.temperature}°C</div>
        <div class="stat-label">Température</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">💧</div>
        <div class="stat-value">${weather.humidity}%</div>
        <div class="stat-label">Humidité</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">💨</div>
        <div class="stat-value">${weather.wind_speed} km/h</div>
        <div class="stat-label">Vitesse du vent</div>
      </div>
    `;
  }

  // Initialize map
  initMap(stats.heatmap);
}

async function initMap(heatmapData) {
  const mapEl = document.getElementById('map');
  if (!mapEl || !window.L) return;

  const map = L.map('map').setView([36.46, 7.43], 10);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18,
  }).addTo(map);

  // Load predictions for forest markers
  try {
    const results = await api.predictTop();
    if (Array.isArray(results)) {
      results.forEach(r => {
        const coords = [r.latitude, r.longitude];
        const risk = r.risk;
        const color = risk >= 0.8 ? '#e63946' : risk >= 0.6 ? '#ff6b35' : risk >= 0.4 ? '#ffd166' : '#06d6a0';
        const level = risk >= 0.8 ? 'Critique' : risk >= 0.6 ? 'Élevé' : risk >= 0.4 ? 'Moyen' : 'Faible';

        L.circleMarker(coords, {
          radius: 8 + risk * 8, fillColor: color, color: color,
          fillOpacity: 0.7, weight: 2, opacity: 0.9,
        }).addTo(map).bindPopup(`
          <div style="font-family:Inter,sans-serif;min-width:180px;">
            <strong style="font-size:14px;">${r.forest}</strong><br/>
            <span style="color:#666;">Daïra: ${r.daira || 'N/A'}</span><br/>
            <span style="color:#666;">Commune: ${r.commune || 'N/A'}</span><br/>
            <hr style="margin:6px 0;border-color:#eee;"/>
            <span style="color:${color};font-weight:700;font-size:16px;">${(risk * 100).toFixed(1)}%</span>
            <span style="font-size:12px;"> — Risque ${level}</span>
          </div>
        `);
      });
    }
  } catch(e) { console.warn('Prediction fetch failed', e); }

  // Load all forests (non-risky ones)
  try {
    const data = await api.get('/forests');
    if (data.forests) {
      data.forests.forEach(f => {
        L.circleMarker([f.latitude, f.longitude], {
          radius: 4, fillColor: '#06d6a0', color: '#06d6a0',
          fillOpacity: 0.3, weight: 1, opacity: 0.5,
        }).addTo(map).bindPopup(`<strong>${f.name}</strong><br/>Incendies: ${f.fire_count}`);
      });
    }
  } catch(e) {}

  // Heatmap layer for historical fires
  if (heatmapData && heatmapData.length > 0 && L.heatLayer) {
    const heat = heatmapData.map(h => [h.lat, h.lng, h.intensity / 50]);
    L.heatLayer(heat, { radius: 30, blur: 20, maxZoom: 13, gradient: { 0.2: '#ffd166', 0.5: '#ff6b35', 1: '#e63946' } }).addTo(map);
  }

  setTimeout(() => map.invalidateSize(), 300);
}


