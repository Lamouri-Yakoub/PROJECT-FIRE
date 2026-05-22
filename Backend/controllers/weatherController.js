const axios = require('axios');

const LAT = 36.4621;
const LON = 7.4261;

// GET /api/weather/current
exports.getCurrentWeather = async (req, res) => {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation&timezone=Africa%2FAlgiers`;
    const response = await axios.get(url, { timeout: 10000 });
    const current = response.data.current || {};

    return res.json({
      temperature: current.temperature_2m !== undefined ? current.temperature_2m : 0,
      humidity: current.relative_humidity_2m !== undefined ? current.relative_humidity_2m : 0,
      wind_speed: current.wind_speed_10m !== undefined ? current.wind_speed_10m : 0,
      wind_direction: current.wind_direction_10m !== undefined ? current.wind_direction_10m : 0,
      precipitation: current.precipitation !== undefined ? current.precipitation : 0,
      latitude: LAT,
      longitude: LON
    });
  } catch (err) {
    console.warn('[WARN] Weather fetch failed, serving fallback:', err.message);
    return res.json({
      temperature: 28,
      humidity: 45,
      wind_speed: 12,
      wind_direction: 180,
      precipitation: 0,
      latitude: LAT,
      longitude: LON,
      fallback: true
    });
  }
};

// ── GET /api/weather — proxy open-meteo archive API ───────────────────────────
exports.getWeather = async (req, res) => {
  try {
    const { lat, lon, date } = req.query;
    if (!lat || !lon || !date) {
      return res.status(400).json({ error: 'lat, lon and date are required' });
    }

    const url = (
      'https://archive-api.open-meteo.com/v1/archive' +
      `?latitude=${lat}` +
      `&longitude=${lon}` +
      `&start_date=${date}` +
      `&end_date=${date}` +
      '&hourly=temperature_2m,wind_speed_10m,wind_direction_10m' +
      '&timezone=Europe%2FLondon'
    );

    const { data } = await axios.get(url, { timeout: 10000 });

    // Pick the midday value (hour 12) or first available
    const hourly = data.hourly || {};
    const times  = hourly.time || [];
    let idx = times.findIndex(t => t.endsWith('T12:00'));
    if (idx === -1) idx = 0;

    const temperature    = hourly.temperature_2m?.[idx]        ?? null;
    const windSpeedRaw   = hourly.wind_speed_10m?.[idx]        ?? null;
    const windDegrees    = hourly.wind_direction_10m?.[idx]    ?? null;

    // Convert wind degrees to compass direction
    const degToCompass = (deg) => {
      if (deg == null) return null;
      const dirs = ['N','NE','E','SE','S','SO','O','NO'];
      return dirs[Math.round(deg / 45) % 8];
    };

    return res.json({
      temperature,
      wind_speed:     windSpeedRaw !== null ? Math.round(windSpeedRaw * 10) / 10 : null,
      wind_direction: degToCompass(windDegrees),
      wind_degrees:   windDegrees,
      recorded_at:    times[idx] || null
    });
  } catch (err) {
    console.error('[weather] Error fetching open-meteo:', err.message);
    return res.status(502).json({ error: 'Failed to fetch weather data: ' + err.message });
  }
};