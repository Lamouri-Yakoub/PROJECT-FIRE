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
      <h1><i class="fa-solid fa-chart-line" style="color: var(--fire-orange); margin-right: 8px;"></i> Tableau de bord</h1>
    </header>
    <div class="page-body">
      <!-- 4 Card KPI Grid -->
      <div class="stats-grid" id="stats-grid">
        <div class="stat-card glass-card glow-red"><div class="spinner"></div></div>
      </div>
      
      <!-- Split Two-Column Layout -->
      <div class="dashboard-two-col">
        <!-- Left: Interactive Map -->
        <div class="map-container" style="position:relative;">
          <div id="map"></div>
          <div class="map-legend">
            <h4>Niveau de risque prédictif</h4>
            <div class="legend-item"><span class="legend-dot" style="background:var(--risk-medium)"></span> Moyen</div>
            <div class="legend-item"><span class="legend-dot" style="background:var(--risk-high)"></span> Élevé</div>
            <div class="legend-item"><span class="legend-dot" style="background:var(--risk-critical)"></span> Critique</div>
          </div>
        </div>
        
        <!-- Right Panel: KPIs & Charts -->
        <div class="dashboard-sidebar-panel" id="dashboard-sidebar-panel">
          <div class="stat-card glass-card"><div class="spinner"></div></div>
        </div>
      </div>

      <!-- Predictions Table & Diagram (Full Width) -->
      <div class="glass-card" style="padding: 24px; border-radius: 8px; margin-top: 24px;">
        <h3 style="font-size:13px; color:var(--text-secondary); text-transform:uppercase; letter-spacing:1px; margin-bottom:16px; display:flex; align-items:center; gap:8px;">
          <i class="fa-solid fa-square-poll-vertical" style="color:var(--fire-orange);"></i>
          Analyse du Risque de Feu par Forêt (Menaces Significatives)
        </h3>
        <div class="predictions-subgrid" style="display: grid; grid-template-columns: 1.3fr 0.7fr; gap: 24px;">
          <!-- Table Wrapper -->
          <div style="overflow-x: auto;">
            <div style="max-height: 250px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 6px; background: rgba(0,0,0,0.15);">
              <table class="prediction-table" style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                <thead>
                  <tr style="border-bottom: 1px solid var(--border-color); background: rgba(0,0,0,0.3); color: var(--text-secondary); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">
                    <th style="padding: 10px 12px; position: sticky; top: 0; background: #1a2332; z-index: 1;">Forêt</th>
                    <th style="padding: 10px 12px; position: sticky; top: 0; background: #1a2332; z-index: 1;">Commune</th>
                    <th style="padding: 10px 12px; position: sticky; top: 0; background: #1a2332; z-index: 1;">Daïra</th>
                    <th style="padding: 10px 12px; position: sticky; top: 0; background: #1a2332; z-index: 1; text-align: right;">Risque</th>
                  </tr>
                </thead>
                <tbody id="prediction-table-body">
                  <tr>
                    <td colspan="4" style="text-align: center; color: var(--text-secondary); padding: 20px;">
                      Chargement des prévisions...
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Diagram/Chart Wrapper -->
          <div id="prediction-chart-container" style="display: flex; flex-direction: column; justify-content: center; align-items: center; border-left: 1px solid var(--border-color); padding-left: 20px;">
            <!-- SVG diagram will be rendered here -->
          </div>
        </div>
      </div>
    </div>
  `;
  layout.appendChild(main);
  container.appendChild(layout);

  // Load dashboard data
  loadDashboard();
}

async function loadDashboard() {
  // 1. Fetch Real-time Weather
  let weather = { temperature: '--', humidity: '--', wind_speed: '--' };
  try { 
    weather = await api.getWeather(); 
  } catch(e) { 
    console.warn('Weather fetch failed', e); 
  }

  // 2. Fetch Extended Stats
  let stats = {
    total: 0,
    this_month: 0,
    active_incidents: 0,
    top_zone: 'N/A',
    total_surface: 0,
    total_damage: 0,
    by_cause: { INC: 0, CON: 0, Unknown: 0 },
    by_status: { declared: 0, investigating: 0, controlled: 0, extinguished: 0 },
    vegetation_breakdown: { foret: 0, maquis: 0, broussailles: 0 },
    avg_response_time: 0,
    top_channels: [],
    heatmap: []
  };

  try { 
    stats = await api.get('/fires/stats'); 
  } catch(e) { 
    console.warn('Stats fetch failed', e); 
  }

  // 3. Render 4 top KPI Cards
  const grid = document.getElementById('stats-grid');
  if (grid) {
    // Format financial damages nicely
    const formatDZD = new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD', maximumFractionDigits: 0 }).format(stats.total_damage || 0);

    grid.innerHTML = `
      <div class="stat-card glass-card glow-red">
        <div class="stat-card-header">
          <div class="stat-icon" style="color: var(--fire-red);"><i class="fa-solid fa-fire-flame-simple"></i></div>
          <span class="MoM-badge negative">Actifs</span>
        </div>
        <div class="stat-value">${stats.active_incidents}</div>
        <div class="stat-label">Incendies en cours</div>
      </div>
      
      <div class="stat-card glass-card">
        <div class="stat-card-header">
          <div class="stat-icon" style="color: var(--fire-orange);"><i class="fa-solid fa-calendar-check"></i></div>
        </div>
        <div class="stat-value">${stats.total}</div>
        <div class="stat-label">Incendies cette année</div>
      </div>
      
      <div class="stat-card glass-card">
        <div class="stat-card-header">
          <div class="stat-icon" style="color: var(--risk-low);"><i class="fa-solid fa-tree"></i></div>
        </div>
        <div class="stat-value">${stats.total_surface.toLocaleString()} <span style="font-size:14px;font-weight:500;">ha</span></div>
        <div class="stat-label" style="margin-bottom: 8px;">Surface brûlée cette année</div>
        <div style="display: flex; justify-content: space-between; font-size: 11px; border-top: 1px solid var(--border-color); padding-top: 8px; margin-top: 4px;">
          <div style="text-align: left;">
            <span style="color: var(--risk-low); font-weight: 700;">Forêt</span><br/>
            <span style="color: var(--text-primary); font-weight: 600;">${(stats.vegetation_breakdown.foret || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ha</span>
          </div>
          <div style="text-align: center;">
            <span style="color: var(--risk-high); font-weight: 700;">Maquis</span><br/>
            <span style="color: var(--text-primary); font-weight: 600;">${(stats.vegetation_breakdown.maquis || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ha</span>
          </div>
          <div style="text-align: right;">
            <span style="color: var(--risk-medium); font-weight: 700;">Brouss.</span><br/>
            <span style="color: var(--text-primary); font-weight: 600;">${(stats.vegetation_breakdown.broussailles || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ha</span>
          </div>
        </div>
      </div>
      
      <div class="stat-card glass-card">
        <div class="stat-card-header">
          <div class="stat-icon" style="color: var(--fire-yellow);"><i class="fa-solid fa-hand-holding-dollar"></i></div>
        </div>
        <div class="stat-value" style="font-size:22px;line-height:36px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${formatDZD}">${formatDZD}</div>
        <div class="stat-label">Coût financier cette année</div>
      </div>
    `;
  }

  // 4. Render Right-side Stats Panel (Weather + Donut Chart + Response Gauge + Reporting Channels)
  const sidebarPanel = document.getElementById('dashboard-sidebar-panel');
  if (sidebarPanel) {
    // Calculate total causes for Arson/Accidental Donut Chart
    const totalCauses = (stats.by_cause.INC || 0) + (stats.by_cause.CON || 0) + (stats.by_cause.Unknown || 0);
    
    let incLen = 0, conLen = 0, unkLen = 0;
    let incPct = 0, conPct = 0, unkPct = 0;

    if (totalCauses > 0) {
      incPct = (stats.by_cause.INC / totalCauses);
      conPct = (stats.by_cause.CON / totalCauses);
      unkPct = (stats.by_cause.Unknown / totalCauses);
      
      incLen = incPct * 220;
      conLen = conPct * 220;
      unkLen = unkPct * 220;
    }

    sidebarPanel.innerHTML = `
      <!-- Weather Panel -->
      <div class="stat-card glass-card" style="padding: 16px 20px;">
        <h4 style="font-size:12px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;"><i class="fa-solid fa-cloud-sun" style="color: var(--fire-orange); margin-right: 6px;"></i> Conditions Météo</h4>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="text-align:center;">
            <div style="font-size:24px;font-weight:800;color:var(--text-primary);">${weather.temperature}°C</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Température</div>
          </div>
          <div style="width:1px;height:30px;background:var(--border-color);"></div>
          <div style="text-align:center;">
            <div style="font-size:24px;font-weight:800;color:var(--text-primary);">${weather.humidity}%</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Humidité</div>
          </div>
          <div style="width:1px;height:30px;background:var(--border-color);"></div>
          <div style="text-align:center;">
            <div style="font-size:24px;font-weight:800;color:var(--text-primary);">${weather.wind_speed} <span style="font-size:11px;font-weight:500;">km/h</span></div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Vitesse Vent</div>
          </div>
        </div>
      </div>

      <!-- Fire Cause Breakdown Donut Chart -->
      <div class="stat-card glass-card" style="padding: 20px;">
        <h4 style="font-size:12px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;"><i class="fa-solid fa-triangle-exclamation" style="color: var(--fire-orange); margin-right: 6px;"></i> Répartition par Origine / Cause</h4>
        <div class="svg-chart-container">
          <svg class="svg-donut" width="150" height="150" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="35" fill="none" stroke="var(--bg-input)" stroke-width="12"></circle>
            
            <!-- Inconnue Segment (Grey/Muted white) -->
            <circle class="donut-segment" cx="50" cy="50" r="35" 
                    stroke="rgba(255, 255, 255, 0.25)" 
                    stroke-dasharray="${unkLen} 220" 
                    stroke-dashoffset="${-(conLen + incLen)}"></circle>

            <!-- Accidental Segment (Orange) -->
            <circle class="donut-segment" cx="50" cy="50" r="35" 
                    stroke="var(--risk-high)" 
                    stroke-dasharray="${incLen} 220" 
                    stroke-dashoffset="${-conLen}"></circle>

            <!-- Criminelle Segment (Red) -->
            <circle class="donut-segment" cx="50" cy="50" r="35" 
                    stroke="var(--risk-critical)" 
                    stroke-dasharray="${conLen} 220" 
                    stroke-dashoffset="0"></circle>
          </svg>
          <div class="donut-center">
            <div class="total-val">${totalCauses}</div>
            <div class="total-lbl">incendies</div>
          </div>
        </div>
        
        <!-- Legend breakdown -->
        <div class="donut-legend">
          <div class="legend-col">
            <span class="legend-col-dot" style="background:var(--risk-critical)"></span>
            <span class="legend-col-label">Volontaire</span>
            <span class="legend-col-value">${stats.by_cause.CON || 0} (${Math.round(conPct * 100)}%)</span>
          </div>
          <div class="legend-col">
            <span class="legend-col-dot" style="background:var(--risk-high)"></span>
            <span class="legend-col-label">Accidentel</span>
            <span class="legend-col-value">${stats.by_cause.INC || 0} (${Math.round(incPct * 100)}%)</span>
          </div>
          <div class="legend-col">
            <span class="legend-col-dot" style="background:rgba(255,255,255,0.4)"></span>
            <span class="legend-col-label">Inconnue</span>
            <span class="legend-col-value">${stats.by_cause.Unknown || 0} (${Math.round(unkPct * 100)}%)</span>
          </div>
        </div>
      </div>
    `;
  }

  // 5. Initialize Leaflet Map
  initMap(stats.heatmap);
}

async function initMap(heatmapData) {
  const mapEl = document.getElementById('map');
  if (!mapEl || !window.L) return;

  // Cleanly tear down any pre-existing Leaflet map instance in SPA to prevent container conflicts
  if (window.leafletMap) {
    try {
      window.leafletMap.remove();
    } catch(e) {
      console.warn('Failed to remove pre-existing map instance:', e);
    }
  }

  // Bounding box for Wilaya of Guelma, Algeria
  const guelmaBounds = L.latLngBounds(
    [36.05, 6.95], // Southwest
    [36.90, 7.90]  // Northeast
  );

  const map = L.map('map', {
    maxBounds: guelmaBounds,
    maxBoundsViscosity: 1.0,
    minZoom: 9,
    maxZoom: 18
  }).setView([36.46, 7.43], 10);
  window.leafletMap = map;

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18,
  }).addTo(map);



  // Load predictions for all forest markers
  try {
    const results = await api.predictTop();
    if (Array.isArray(results)) {
      // Sort ascending to render lower risks first so critical threat markers (red/orange) layer on top
      const mapResults = [...results].filter(r => r.risk >= 0.4).sort((a, b) => a.risk - b.risk);
      
      mapResults.forEach(r => {
        if (!r.latitude || !r.longitude) return; // safety check
        const coords = [r.latitude, r.longitude];
        const risk = r.risk;

        let color = '#ffd166';
        let level = 'Moyen';
        let title = '⚡ RISQUE MOYEN';
        let radiusMeters = 1500; // 1.5 km geographic radius
        let fillOpacity = 0.5;

        if (risk >= 0.8) {
          color = '#e63946';
          level = 'Critique';
          title = '⚠️ DANGER CRITIQUE';
          radiusMeters = 4000; // 4.0 km geographic radius
          fillOpacity = 0.75;
        } else if (risk >= 0.6) {
          color = '#ff6b35';
          level = 'Élevé';
          title = '🔥 RISQUE ÉLEVÉ';
          radiusMeters = 2500; // 2.5 km geographic radius
          fillOpacity = 0.65;
        }

        const marker = L.circle(coords, {
          radius: radiusMeters, 
          fillColor: color, 
          color: color,
          fillOpacity: fillOpacity, 
          weight: 1.5, 
          opacity: 0.9,
        }).addTo(map).bindPopup(`
          <div style="font-family:Inter,sans-serif;min-width:180px;">
            <strong style="font-size:11px;color:${color};text-transform:uppercase;letter-spacing:0.5px;">${title}</strong><br/>
            <span style="font-size:14px;font-weight:700;color:var(--text-primary);display:inline-block;margin-top:4px;">${r.forest}</span><br/>
            <span style="color:var(--text-secondary);font-size:11px;">Daïra: ${r.daira || 'N/A'}</span><br/>
            <span style="color:var(--text-secondary);font-size:11px;">Commune: ${r.commune || 'N/A'}</span><br/>
            <hr style="margin:6px 0;border-color:var(--border-color);"/>
            <span style="color:${color};font-weight:800;font-size:16px;">${(risk * 100).toFixed(1)}%</span>
            <span style="font-size:12px;color:var(--text-primary);font-weight:600;"> — Risque ${level}</span>
          </div>
        `, {
          closeButton: false,
          offset: L.point(0, -5)
        });

        // Display info instantly on hover
        marker.on('mouseover', function () {
          this.openPopup();
        });
        marker.on('mouseout', function () {
          this.closePopup();
        });
      });

      // 2. Populate Predictions Table (same forests, sorted descending by risk)
      const tableResults = [...results].filter(r => r.risk >= 0.4).sort((a, b) => b.risk - a.risk);
      const tableBody = document.getElementById('prediction-table-body');
      if (tableBody) {
        if (tableResults.length === 0) {
          tableBody.innerHTML = `
            <tr>
              <td colspan="4" style="text-align: center; color: var(--text-secondary); padding: 20px;">
                Aucun risque significatif détecté (tous inférieurs à 40%)
              </td>
            </tr>
          `;
        } else {
          tableBody.innerHTML = tableResults.map(r => {
            let badgeBg = 'rgba(255, 209, 102, 0.12)';
            let badgeColor = 'var(--risk-medium)';
            let level = 'Moyen';
            
            if (r.risk >= 0.8) {
              badgeBg = 'rgba(230, 57, 70, 0.12)';
              badgeColor = 'var(--risk-critical)';
              level = 'Critique';
            } else if (r.risk >= 0.6) {
              badgeBg = 'rgba(255, 107, 53, 0.12)';
              badgeColor = 'var(--risk-high)';
              level = 'Élevé';
            }

            return `
              <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 10px 12px; font-weight: 700; color: var(--text-primary);">${r.forest}</td>
                <td style="padding: 10px 12px; color: var(--text-secondary);">${r.commune || 'N/A'}</td>
                <td style="padding: 10px 12px; color: var(--text-secondary);">${r.daira || 'N/A'}</td>
                <td style="padding: 10px 12px; text-align: right;">
                  <span style="display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; background: ${badgeBg}; color: ${badgeColor};">
                    ${(r.risk * 100).toFixed(1)}% (${level})
                  </span>
                </td>
              </tr>
            `;
          }).join('');
        }
      }

      // 3. Render Predictions SVG Bar Chart
      drawPredictionChart(tableResults);
    }
  } catch(e) {
    console.warn('Prediction fetch failed', e);
  }

  setTimeout(() => map.invalidateSize(), 300);
}

function drawPredictionChart(topForests) {
  const container = document.getElementById('prediction-chart-container');
  if (!container) return;

  if (topForests.length === 0) {
    container.innerHTML = `<span style="color:var(--text-secondary); font-size:12px;">Aucun risque significatif détecté</span>`;
    return;
  }

  // Take top 5 for the chart
  const chartData = topForests.slice(0, 5);

  const width = 320;
  const height = 180;
  const paddingLeft = 110;
  const paddingRight = 45;
  const paddingTop = 10;
  const paddingBottom = 10;
  
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const rowHeight = chartHeight / chartData.length;

  let barsHTML = '';
  chartData.forEach((item, index) => {
    const riskPercent = item.risk * 100;
    const barWidth = (item.risk * chartWidth);
    const y = paddingTop + index * rowHeight + (rowHeight - 10) / 2;
    
    // Choose color based on risk level
    let color = 'var(--risk-medium)';
    if (item.risk >= 0.8) color = 'var(--risk-critical)';
    else if (item.risk >= 0.6) color = 'var(--risk-high)';

    // Forest name abbreviated if too long
    let shortName = item.forest;
    if (shortName.length > 12) shortName = shortName.slice(0, 11) + '..';

    barsHTML += `
      <!-- Text label (forest name) -->
      <text x="${paddingLeft - 8}" y="${y + 9}" fill="var(--text-secondary)" font-size="11" font-weight="600" text-anchor="end" font-family="Inter,sans-serif">${shortName}</text>
      
      <!-- Track background -->
      <rect x="${paddingLeft}" y="${y}" width="${chartWidth}" height="10" rx="3" fill="var(--bg-input)" />
      
      <!-- Active bar with grow animation -->
      <rect class="chart-bar-grow" x="${paddingLeft}" y="${y}" width="${barWidth}" height="10" rx="3" fill="${color}" style="transform-origin: ${paddingLeft}px ${y}px; animation: barGrow 1.2s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;" />
      
      <!-- Value label -->
      <text x="${paddingLeft + barWidth + 6}" y="${y + 9}" fill="var(--text-primary)" font-size="11" font-weight="700" font-family="Inter,sans-serif">${riskPercent.toFixed(1)}%</text>
    `;
  });

  container.innerHTML = `
    <h4 style="font-size:11px; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:12px; width:100%; text-align:center; font-weight: 700;">Top 5 Risques Majeurs</h4>
    <svg width="${width}" height="${height}" style="overflow:visible;">
      <style>
        @keyframes barGrow {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
      </style>
      ${barsHTML}
    </svg>
  `;
}
