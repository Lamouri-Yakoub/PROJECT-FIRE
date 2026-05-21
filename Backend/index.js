require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const db = require('./config/db'); // Initializes MongoDB connection
const { requireAuth } = require('./middleware/auth');

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

// --- AI / Prediction forwarding to Python Server ---

// POST /predict_top -> Python
app.post('/predict_top', async (req, res) => {
  try {
    const response = await axios.post(`${PYTHON_SERVER_URL}/predict_top`, req.body);
    return res.json(response.data);
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
