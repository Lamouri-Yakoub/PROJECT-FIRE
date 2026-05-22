const mongoose = require('mongoose');

const fireSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['declared', 'investigating', 'controlled', 'extinguished'],
    default: 'declared'
  },
  // ── Relations ───────────────────────────────────────────────────────────────
  forest:   { type: mongoose.Schema.Types.ObjectId, ref: 'Forest',  required: true },
  commune:  { type: mongoose.Schema.Types.ObjectId, ref: 'Commune', default: null },
  daira:    { type: mongoose.Schema.Types.ObjectId, ref: 'Daira',   default: null },

  // ── Declaration (DECL) ──────────────────────────────────────────────────────
  declaration_date: { type: Date,   default: null },  // DATE_DECL
  declaration_hour: { type: Number, default: null },  // DECL_HOUR  (0–23)

  // ── Intervention (INT) ──────────────────────────────────────────────────────
  intervention_date: { type: Date,   default: null }, // DATE_INT
  intervention_hour: { type: Number, default: null }, // INT_HOUR   (0–23)

  // ── Extinction (EXT) ────────────────────────────────────────────────────────
  extinction_date: { type: Date,   default: null },   // DATE_EXT
  extinction_hour: { type: Number, default: null },   // EXT_HOUR   (0–23)

  // ── Vegetation / surface areas (hectares) ───────────────────────────────────
  // ESSENCE: vegetation type codes, e.g. ["CL", "MAQ", "BRS"]
  essence:           { type: [String], default: [] },

  // Surface areas burned (ha)
  tot_foret:         { type: Number, default: 0 },    // TOT_FORET        – forest
  tot_maquis:        { type: Number, default: 0 },    // TOT_MAQUIS       – scrubland
  tot_broussailles:  { type: Number, default: 0 },    // TOT_BROUSSAILLES – bush/undergrowth
  surf_total:        { type: Number, default: 0 },    // SURF_TOTAL       – total surface

  // ── Fire metadata ───────────────────────────────────────────────────────────
  // CAUSE: 'INC' (incendie / arson/accidental) | 'CON' (controlled burn)
  cause: {
    type: String,
    enum: ['INC', 'CON', 'Unknown'],
    default: 'Unknown'
  },

  // SIGNALE: who reported the fire
  // e.g. 'PV', 'BM', 'PC', 'CT', 'DW', 'EMPS', 'GARDIEN', 'OCCAS', 'PAPC', 'COMMUNE'
  signale: { type: String, default: null },

  // ORGANISMES: response organisations involved (comma/plus separated codes)
  // e.g. ["SF", "PC", "DW", "EAPC", "EMPS"]
  organismes: { type: [String], default: [] },

  // DEGATS: estimated financial damage (DZD)
  degats: { type: Number, default: 0 },

  // ── Weather at time of fire ─────────────────────────────────────────────────
  meteo_temp:             { type: Number, default: null }, // METEO_TEMP           – °C
  meteo_wind_speed:       { type: Number, default: null }, // METEO_VENTE_VITESSE  – km/h
  meteo_wind_direction:   { type: String, default: null }, // METEO_VENTE_DIRECTION – e.g. "S+NE"

  // ── Audit ───────────────────────────────────────────────────────────────────
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  created_at: { type: Date, default: Date.now }

});

module.exports = mongoose.model('Fire', fireSchema);