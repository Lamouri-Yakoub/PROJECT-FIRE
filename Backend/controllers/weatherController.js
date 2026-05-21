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
