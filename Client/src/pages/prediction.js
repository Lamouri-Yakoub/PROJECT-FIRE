import { renderSidebar } from '../components/sidebar.js';
import { api } from '../api.js';

export function predictionPage(container) {
  const layout = document.createElement('div');
  layout.className = 'app-layout';
  renderSidebar(layout);

  const main = document.createElement('main');
  main.className = 'main-content';
  main.innerHTML = `
    <header class="page-header"><h1>🔮 Prédiction des incendies</h1></header>
    <div class="page-body">
      <div class="prediction-layout">
        <div class="prediction-form">
          <h3>📋 Données de prédiction</h3>
          <form id="predict-form">
            <div class="form-group">
              <label for="forest-select">Nom de la forêt *</label>
              <select id="forest-select" required><option value="">Chargement...</option></select>
            </div>
            <div class="form-group">
              <label for="pred-date">Date (optionnel)</label>
              <input type="date" id="pred-date" />
            </div>
            <hr style="border-color:var(--border-color);margin:20px 0;" />
            <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;">Les données météo sont récupérées automatiquement via l'API.</p>
            <div id="weather-preview" style="display:none;background:var(--bg-input);padding:14px;border-radius:var(--radius-sm);margin-bottom:16px;">
              <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">DONNÉES MÉTÉO ACTUELLES</div>
              <div id="wp-data"></div>
            </div>
            <button type="submit" class="btn-primary">🔍 Lancer la prédiction</button>
          </form>
        </div>
        <div class="prediction-result" id="pred-result">
          <div class="empty-state">
            <div class="icon">🔮</div>
            <p>Sélectionnez une forêt et lancez la prédiction pour voir les résultats</p>
          </div>
        </div>
      </div>
    </div>
  `;
  layout.appendChild(main);
  container.appendChild(layout);

  loadForests();
  loadWeatherPreview();

  document.getElementById('predict-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const forest = document.getElementById('forest-select').value;
    const date = document.getElementById('pred-date').value || null;
    if (!forest) return;

    const result = document.getElementById('pred-result');
    result.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';

    try {
      const res = await api.predictForest(forest, date);
      renderResult(result, res);
    } catch (err) {
      result.innerHTML = `<div class="empty-state"><div class="icon">❌</div><p>${err.message || 'Erreur de prédiction'}</p></div>`;
    }
  });
}

async function loadForests() {
  const select = document.getElementById('forest-select');
  if (!select) return;
  try {
    const data = await api.get('/forests');
    select.innerHTML = '<option value="">-- Sélectionner une forêt --</option>';
    data.forests.forEach(f => {
      select.innerHTML += `<option value="${f.name}">${f.name} (${f.commune})</option>`;
    });
  } catch (e) {
    select.innerHTML = '<option value="">Erreur de chargement</option>';
  }
}

async function loadWeatherPreview() {
  try {
    const w = await api.getWeather();
    const el = document.getElementById('weather-preview');
    const data = document.getElementById('wp-data');
    if (el && data) {
      data.innerHTML = `🌡️ ${w.temperature}°C &nbsp; 💧 ${w.humidity}% &nbsp; 💨 ${w.wind_speed} km/h`;
      el.style.display = 'block';
    }
  } catch(e) {}
}

function renderResult(container, res) {
  const risk = res.risk || 0;
  const pct = (risk * 100).toFixed(1);
  const color = risk >= 0.8 ? '#e63946' : risk >= 0.6 ? '#ff6b35' : risk >= 0.4 ? '#ffd166' : '#06d6a0';
  const level = risk >= 0.8 ? 'Critique' : risk >= 0.6 ? 'Élevé' : risk >= 0.4 ? 'Moyen' : 'Faible';
  const circ = 2 * Math.PI * 80;
  const offset = circ - (risk * circ);

  container.innerHTML = `
    <h3 style="margin-bottom:8px;">${res.forest}</h3>
    <p style="color:var(--text-secondary);font-size:13px;margin-bottom:16px;">${res.daira || ''} — ${res.commune || ''}</p>
    <div class="risk-gauge">
      <svg width="200" height="200" viewBox="0 0 200 200">
        <circle class="gauge-bg" cx="100" cy="100" r="80" />
        <circle class="gauge-fill" cx="100" cy="100" r="80"
          stroke="${color}" stroke-dasharray="${circ}" stroke-dashoffset="${offset}" />
      </svg>
      <div class="risk-value">
        <span class="pct" style="color:${color}">${pct}%</span>
        <span class="lbl">Risque ${level}</span>
      </div>
    </div>
    <div style="margin-top:16px;">
      <span class="badge badge-${level.toLowerCase() === 'élevé' ? 'high' : level.toLowerCase() === 'critique' ? 'critical' : level.toLowerCase() === 'moyen' ? 'medium' : 'low'}">${level}</span>
    </div>
    <div class="risk-factors">
      <h4>Informations</h4>
      <div class="factor-item"><span>Forêt</span><span>${res.forest}</span></div>
      <div class="factor-item"><span>Daïra</span><span>${res.daira || 'N/A'}</span></div>
      <div class="factor-item"><span>Commune</span><span>${res.commune || 'N/A'}</span></div>
      <div class="factor-item"><span>Probabilité</span><span style="color:${color};font-weight:700;">${pct}%</span></div>
    </div>
    <p style="margin-top:20px;font-size:13px;color:var(--text-secondary);">
      ${risk >= 0.7 ? '⚠️ Risque élevé détecté. Mesures préventives recommandées.' : risk >= 0.4 ? '🟡 Vigilance recommandée. Surveiller les conditions météo.' : '✅ Conditions favorables. Risque faible actuellement.'}
    </p>
  `;
}
