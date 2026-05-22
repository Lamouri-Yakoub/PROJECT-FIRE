import { renderSidebar } from '../components/sidebar.js';
import { api } from '../api.js';

export function predictionPage(container) {
  let allDairas = [];
  let allCommunes = [];
  let allForests = [];
  let autoFilling = false;

  const layout = document.createElement('div');
  layout.className = 'app-layout';
  renderSidebar(layout);

  const main = document.createElement('main');
  main.className = 'main-content';
  main.innerHTML = `
    <header class="page-header">
      <h1>🔮 Prédiction des incendies</h1>
    </header>
    <div class="page-body">
      <div class="prediction-layout">
        <div class="prediction-form" style="display:flex; flex-direction:column; gap:20px;">
          <div>
            <h3 style="margin-top:0;">📋 Données de prédiction</h3>
            <p style="font-size:13px; color:var(--text-secondary); margin-bottom:16px;">
              Sélectionnez un massif forestier, une daïra, une commune ou une date pour lancer l'analyse prédictive d'incendie par l'Intelligence Artificielle.
            </p>
          </div>
          
          <form id="predict-form">
            <div class="form-group" style="display:flex; flex-direction:column; gap:6px;">
              <label for="forest-select" style="font-size:12px; font-weight:600; color:var(--text-secondary);">Forêt Cible *</label>
              <select id="forest-select" required style="padding: 10px 12px; border-radius: var(--radius-sm); background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); outline: none;">
                <option value="">Chargement des forêts...</option>
              </select>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px;">
              <div class="form-group" style="display:flex; flex-direction:column; gap:6px;">
                <label for="daira-select" style="font-size:12px; font-weight:600; color:var(--text-secondary);">Daïra</label>
                <select id="daira-select" style="padding: 10px 12px; border-radius: var(--radius-sm); background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); outline: none; width: 100%;">
                  <option value="">— Daïra —</option>
                </select>
              </div>

              <div class="form-group" style="display:flex; flex-direction:column; gap:6px;">
                <label for="commune-select" style="font-size:12px; font-weight:600; color:var(--text-secondary);">Commune</label>
                <select id="commune-select" style="padding: 10px 12px; border-radius: var(--radius-sm); background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); outline: none; width: 100%;">
                  <option value="">— Commune —</option>
                </select>
              </div>
            </div>
            
            <div class="form-group" style="display:flex; flex-direction:column; gap:6px; margin-top:16px;">
              <label for="pred-date" style="font-size:12px; font-weight:600; color:var(--text-secondary);">Date d'Évaluation</label>
              <input type="date" id="pred-date" style="padding: 10px 12px; border-radius: var(--radius-sm); background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); outline: none;" />
            </div>
            
            <hr style="border-color:var(--border-color); margin:24px 0;" />
            
            <div id="weather-preview" style="display:none; background:rgba(255,255,255,0.02); border: 1px solid var(--border-color); padding:16px; border-radius:var(--radius-sm); margin-bottom:20px;">
              <div id="weather-preview-title" style="font-size:11px; font-weight:700; color:var(--fire-orange); letter-spacing:1px; text-transform:uppercase; margin-bottom:10px;">☀️ Météo de la Province</div>
              <div id="wp-data" style="display:flex; gap:16px; font-size:13px; color:var(--text-primary); flex-wrap:wrap;"></div>
            </div>
            
            <button type="submit" class="btn-primary" style="width:100%; padding:12px; font-weight:600; cursor:pointer; background:var(--fire-gradient); border:none; border-radius:var(--radius-sm); color:white; display:flex; justify-content:center; align-items:center; gap:8px;">
              <span>🔍 Lancer la Prédiction IA</span>
            </button>
          </form>
        </div>
        
        <div class="prediction-result" id="pred-result" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 28px; display: flex; flex-direction: column; min-height: 400px; justify-content: center; align-items: center; text-align: center;">
          <div class="empty-state">
            <div class="icon" style="font-size: 48px; margin-bottom: 16px;">🔮</div>
            <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">Prêt pour l'Analyse</h4>
            <p style="font-size: 13px; color: var(--text-secondary); max-width: 280px; margin: 0 auto; line-height: 1.5;">
              Sélectionnez une forêt à gauche et lancez la prédiction pour visualiser le score de risque en temps réel.
            </p>
          </div>
        </div>
      </div>
    </div>
  `;
  layout.appendChild(main);
  container.appendChild(layout);

  const forestSelect = document.getElementById('forest-select');
  const dairaSelect = document.getElementById('daira-select');
  const communeSelect = document.getElementById('commune-select');
  const dateInput = document.getElementById('pred-date');

  // Set default date to today
  const today = new Date().toISOString().split('T')[0];
  dateInput.value = today;

  initData();
  loadWeatherPreview(today);

  // Auto-reload weather when changing date
  dateInput.addEventListener('change', (e) => {
    const selectedDate = e.target.value;
    loadWeatherPreview(selectedDate);
  });

  // Rebuild forest options
  function updateForestOptions(dairaId, communeId, selectedForestName) {
    forestSelect.innerHTML = '<option value="">— Sélectionnez une forêt —</option>';
    let filtered = allForests;
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
      const selected = f.name === selectedForestName ? ' selected' : '';
      const communeName = f.commune && typeof f.commune === 'object' ? f.commune.name : f.commune || 'N/A';
      forestSelect.innerHTML += `<option value="${f.name}"${selected}>${f.name} (${communeName})</option>`;
    });
  }

  // Rebuild commune options
  function updateCommuneOptions(dairaId, selectedCommuneId) {
    communeSelect.innerHTML = '<option value="">— Commune —</option>';
    const filtered = dairaId
      ? allCommunes.filter(c => {
          const cDairaId = c.daira?._id || c.daira?.id || c.daira;
          return cDairaId === dairaId;
        })
      : allCommunes;
    filtered.forEach(c => {
      const cId = c._id || c.id;
      const selected = cId === selectedCommuneId ? ' selected' : '';
      communeSelect.innerHTML += `<option value="${cId}"${selected}>${c.name}</option>`;
    });
  }

  // Forest change -> auto fill daira and commune
  forestSelect.addEventListener('change', () => {
    const selectedName = forestSelect.value;
    if (!selectedName) return;

    const forest = allForests.find(f => f.name === selectedName);
    if (!forest) return;

    autoFilling = true;

    if (forest.daira) {
      const dairaId = forest.daira._id || forest.daira.id || forest.daira;
      dairaSelect.value = dairaId;
      const communeId = forest.commune
        ? (forest.commune._id || forest.commune.id || forest.commune)
        : null;
      updateCommuneOptions(dairaId, communeId);
    }

    autoFilling = false;
  });

  // Daira change -> filter communes and forests
  dairaSelect.addEventListener('change', () => {
    const dairaId = dairaSelect.value;
    updateCommuneOptions(dairaId, null);
    if (!autoFilling) {
      updateForestOptions(dairaId, null, null);
    }
  });

  // Commune change -> filter forests
  communeSelect.addEventListener('change', () => {
    const dairaId = dairaSelect.value;
    const communeId = communeSelect.value;
    if (!autoFilling) {
      updateForestOptions(dairaId, communeId, null);
    }
  });

  document.getElementById('predict-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const forest = forestSelect.value;
    const date = dateInput.value || null;
    if (!forest) return;

    const resultEl = document.getElementById('pred-result');
    resultEl.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:200px;">
        <div class="spinner"></div>
        <p style="text-align:center; color:var(--text-secondary); font-size:14px; margin-top:16px;">Calcul de l'indice par l'intelligence artificielle...</p>
      </div>
    `;

    try {
      const res = await api.predictForest(forest, date);
      renderResult(resultEl, res);
    } catch (err) {
      resultEl.innerHTML = `
        <div class="empty-state">
          <div class="icon" style="font-size:40px; margin-bottom:12px;">❌</div>
          <h3 style="color:var(--text-primary); margin-bottom:8px;">Échec de la Prédiction</h3>
          <p style="color:var(--text-secondary); font-size:13px;">${err.message || 'Le serveur de prédiction est indisponible.'}</p>
        </div>
      `;
    }
  });

  async function initData() {
    try {
      const [dairasRes, communesRes, forestsRes] = await Promise.all([
        api.get('/dairas'),
        api.get('/communes'),
        api.get('/forests')
      ]);

      allDairas = dairasRes || [];
      allCommunes = communesRes || [];
      allForests = forestsRes.forests || [];

      // Populate Dairas dropdown
      dairaSelect.innerHTML = '<option value="">— Daïra —</option>';
      allDairas.forEach(d => {
        dairaSelect.innerHTML += `<option value="${d._id || d.id}">${d.name}</option>`;
      });

      // Populate Communes dropdown
      updateCommuneOptions(null, null);

      // Populate Forests dropdown
      updateForestOptions(null, null, null);
    } catch (e) {
      forestSelect.innerHTML = '<option value="">Erreur de chargement</option>';
    }
  }
}

async function loadWeatherPreview(date) {
  const el = document.getElementById('weather-preview');
  const data = document.getElementById('wp-data');
  const title = document.getElementById('weather-preview-title');
  if (!el || !data) return;

  try {
    let w;
    if (date) {
      const todayStr = new Date().toISOString().split('T')[0];
      if (date === todayStr) {
        w = await api.getWeather();
        if (title) title.innerText = "☀️ Météo Actuelle de la Province";
      } else {
        w = await api.get(`/weather?lat=36.4621&lon=7.4261&date=${date}`);
        if (title) {
          const dateFormatted = new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
          title.innerText = `📅 Météo Archivée (${dateFormatted})`;
        }
      }
    } else {
      w = await api.getWeather();
      if (title) title.innerText = "☀️ Météo Actuelle de la Province";
    }
    
    if (w && w.temperature !== null && w.temperature !== undefined) {
      const windDir = w.wind_direction ? ` &nbsp; 🧭 Vent: ${w.wind_direction}` : '';
      const humidityStr = w.humidity !== undefined ? ` &nbsp; 💧 Humidité: ${w.humidity}%` : '';
      data.innerHTML = `<span>🌡️ Temp: <strong>${w.temperature}°C</strong></span>${humidityStr} <span>💨 Vent: <strong>${w.wind_speed} km/h</strong></span>${windDir}`;
      el.style.display = 'block';
    }
  } catch(e) {
    // Fallback to current weather if historical archive fails
    try {
      const w = await api.getWeather();
      data.innerHTML = `🌡️ ${w.temperature}°C &nbsp; 💧 ${w.humidity}% &nbsp; 💨 ${w.wind_speed} km/h (Actuel)`;
      if (title) title.innerText = "☀️ Météo (Données Actuelles de Fallback)";
      el.style.display = 'block';
    } catch(err) {}
  }
}

function renderResult(container, res) {
  const risk = res.risk || 0;
  const pct = (risk * 100).toFixed(1);
  const color = risk >= 0.8 ? '#e63946' : risk >= 0.6 ? '#ff6b35' : risk >= 0.4 ? '#ffd166' : '#06d6a0';
  const level = risk >= 0.8 ? 'Critique' : risk >= 0.6 ? 'Élevé' : risk >= 0.4 ? 'Moyen' : 'Faible';
  const circ = 2 * Math.PI * 80;
  const offset = circ - (risk * circ);

  container.innerHTML = `
    <div style="width:100%; text-align:center;">
      <h3 style="margin:0 0 4px 0;">${res.forest}</h3>
      <p style="color:var(--text-secondary); font-size:12px; margin:0 0 16px 0;">${res.daira || ''} — ${res.commune || ''}</p>
      
      <div class="risk-gauge" style="margin: 20px auto;">
        <svg width="180" height="180" viewBox="0 0 200 200">
          <circle class="gauge-bg" cx="100" cy="100" r="80" />
          <circle class="gauge-fill" cx="100" cy="100" r="80"
            stroke="${color}" stroke-dasharray="${circ}" stroke-dashoffset="${offset}" />
        </svg>
        <div class="risk-value">
          <span class="pct" style="color:${color}; font-size:38px;">${pct}%</span>
          <span class="lbl" style="font-size:12px;">Risque ${level}</span>
        </div>
      </div>
      
      <div style="display:flex; justify-content:center; margin-top:8px; margin-bottom:20px;">
        <span class="badge badge-${level.toLowerCase() === 'élevé' ? 'high' : level.toLowerCase() === 'critique' ? 'critical' : level.toLowerCase() === 'moyen' ? 'medium' : 'low'}">${level}</span>
      </div>
      
      <div class="risk-factors" style="margin-top: 16px;">
        <h4 style="font-size:13px; color:var(--text-secondary); margin-bottom:10px; text-align:left;">Détails de l'analyse</h4>
        <div class="factor-item"><span>Massif forestier</span><span style="font-weight:600; color:var(--text-primary);">${res.forest}</span></div>
        <div class="factor-item"><span>Daïra administrative</span><span>${res.daira || 'N/A'}</span></div>
        <div class="factor-item"><span>Commune territoriale</span><span>${res.commune || 'N/A'}</span></div>
        <div class="factor-item"><span>Probabilité estimée</span><span style="color:${color}; font-weight:700;">${pct}%</span></div>
      </div>
      
      <p style="margin-top:20px; font-size:12.5px; color:var(--text-secondary); text-align:center; padding: 12px; background: rgba(255,255,255,0.02); border-radius: var(--radius-sm); border: 1px solid var(--border-color); line-height:1.5;">
        ${risk >= 0.7 ? '⚠️ <strong>Alerte Critique :</strong> Risque extrême d\'embrasement détecté. Déploiement préventif des équipes recommandé.' : risk >= 0.4 ? '🟡 <strong>Vigilance requise :</strong> Indice moyen. Surveiller activement les conditions de sécheresse et de vent.' : '✅ <strong>Conditions normales :</strong> Indice faible. Le massif forestier ne présente pas de danger imminent actuellement.'}
      </p>
    </div>
  `;
}

