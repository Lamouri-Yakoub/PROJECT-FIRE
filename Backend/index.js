require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const db = require('./config/db'); // Initializes MongoDB connection
const { requireAuth } = require('./middleware/auth');
const Forest = require('./models/Forest');

const app = express();
const PORT = process.env.PORT || 5000;
const PYTHON_SERVER_URL = process.env.PYTHON_SERVER_URL || 'http://localhost:5001';

app.use(cors());
app.use(express.json());

// --- Register Routes ---
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const firesRouter = require('./routes/fires');
const weatherRouter = require('./routes/weather');
const forestsRouter = require('./routes/forests');
const dairasRouter = require('./routes/dairas');
const communesRouter = require('./routes/communes');

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/fires', firesRouter);
app.use('/api/weather', weatherRouter);
app.use('/api/forests', forestsRouter);
app.use('/api/dairas', dairasRouter);
app.use('/api/communes', communesRouter);

// Helper to get weather data for any date (past or future) to bypass python server limitations
async function getWeatherDataForDate(dateStr) {
  const LAT = 36.4621;
  const LON = 7.4261;
  try {
    if (!dateStr) {
      dateStr = new Date().toISOString().split('T')[0];
    }

    const targetDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    const compareDate = new Date(targetDate);
    compareDate.setHours(0,0,0,0);

    const isFuture = compareDate > today;
    const degToCompass = (deg) => {
      if (deg == null) return 'N';
      const dirs = ['N','NE','E','SE','S','SO','O','NO'];
      return dirs[Math.round(deg / 45) % 8];
    };

    if (isFuture) {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&hourly=temperature_2m,wind_speed_10m,wind_direction_10m&timezone=Africa%2FAlgiers`;
      const { data } = await axios.get(url, { timeout: 4000 });
      const hourly = data.hourly || {};
      const times = hourly.time || [];
      
      let idx = times.findIndex(t => t.startsWith(`${dateStr}T12:00`) || t.startsWith(dateStr));
      if (idx === -1) idx = 0;

      return {
        temperature: hourly.temperature_2m?.[idx] ?? 25,
        wind_speed: hourly.wind_speed_10m?.[idx] ?? 12,
        wind_direction: degToCompass(hourly.wind_direction_10m?.[idx])
      };
    } else {
      const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${LAT}&longitude=${LON}&start_date=${dateStr}&end_date=${dateStr}&hourly=temperature_2m,wind_speed_10m,wind_direction_10m&timezone=Europe%2FLondon`;
      const { data } = await axios.get(url, { timeout: 4000 });
      const hourly = data.hourly || {};
      const times = hourly.time || [];
      
      let idx = times.findIndex(t => t.endsWith('T12:00'));
      if (idx === -1) idx = 0;

      return {
        temperature: hourly.temperature_2m?.[idx] ?? 25,
        wind_speed: hourly.wind_speed_10m?.[idx] ?? 12,
        wind_direction: degToCompass(hourly.wind_direction_10m?.[idx])
      };
    }
  } catch (err) {
    console.warn('[WARN] Failed to fetch proxy weather for prediction, using safe defaults:', err.message);
    return {
      temperature: 28,
      wind_speed: 12,
      wind_direction: 'S'
    };
  }
}

// --- AI / Prediction forwarding to Python Server ---

// POST /predict_top -> Python
app.post('/predict_top', async (req, res) => {
  try {
    if (!req.body.weather) {
      req.body.weather = await getWeatherDataForDate(req.body.date);
    }
    const response = await axios.post(`${PYTHON_SERVER_URL}/predict_top`, req.body);
    const results = response.data;

    if (Array.isArray(results)) {
      const dbForests = await Forest.find({});
      const forestMap = new Map();
      dbForests.forEach(f => {
        if (f.name) {
          forestMap.set(f.name.toLowerCase().trim(), f);
        }
      });

      for (const item of results) {
        if (item.forest) {
          const key = item.forest.toLowerCase().trim();
          const dbForest = forestMap.get(key);
          if (dbForest) {
            if (dbForest.latitude != null) {
              item.latitude = dbForest.latitude;
            }
            if (dbForest.longitude != null) {
              item.longitude = dbForest.longitude;
            }
          }
        }
      }
    }

    return res.json(results);
  } catch (err) {
    console.error('[ERROR] /predict_top proxy failed:', err.message);
    const status = err.response?.status || 500;
    const errorData = err.response?.data || { error: 'Prediction server is currently unavailable' };
    return res.status(status).json(errorData);
  }
});

// POST /predict_forest -> Python
app.post('/predict_forest', async (req, res) => {
  try {
    if (!req.body.weather) {
      req.body.weather = await getWeatherDataForDate(req.body.date);
    }
    const response = await axios.post(`${PYTHON_SERVER_URL}/predict_forest`, req.body);
    return res.json(response.data);
  } catch (err) {
    console.error('[ERROR] /predict_forest proxy failed:', err.message);
    const status = err.response?.status || 500;
    const errorData = err.response?.data || { error: 'Prediction server is currently unavailable' };
    return res.status(status).json(errorData);
  }
});

// POST /add_fire -> Python
app.post('/add_fire', async (req, res) => {
  try {
    const response = await axios.post(`${PYTHON_SERVER_URL}/add_fire`, req.body);
    return res.json(response.data);
  } catch (err) {
    console.error('[ERROR] /add_fire proxy failed:', err.message);
    const status = err.response?.status || 500;
    const errorData = err.response?.data || { error: 'Prediction server failed to record add_fire statistics' };
    return res.status(status).json(errorData);
  }
});



// --- Server Startup ---
app.listen(PORT, () => {
  console.log(`=== FireGuard Express Backend ===`);
  console.log(`  PORT: http://localhost:${PORT}`);
  console.log(`  Proxying AI to: ${PYTHON_SERVER_URL}`);
  console.log(`=================================`);
});
