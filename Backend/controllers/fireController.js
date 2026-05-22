const axios = require('axios');
const Fire    = require('../models/Fire');
const Forest  = require('../models/Forest');
const Daira   = require('../models/Daira');
const Commune = require('../models/Commune');

// ── Shared populate config ─────────────────────────────────────────────────────
const FIRE_POPULATE = [
  { path: 'forest',  populate: [{ path: 'daira' }, { path: 'commune' }] },
  { path: 'commune' },
  { path: 'daira'   }
];

// ── Fire lifecycle statuses ────────────────────────────────────────────────────
const VALID_STATUSES = ['declared', 'investigating', 'controlled', 'extinguished'];

// ── Format a Fire document for API responses ───────────────────────────────────
function formatFire(f) {
  return {
    id: f._id,

    // Status
    status: f.status || 'declared',

    // Location
    forest_name: f.forest  ? f.forest.name  : 'Unknown',
    daira:       f.daira   ? f.daira.name   : (f.forest?.daira?.name   || ''),
    commune:     f.commune ? f.commune.name : (f.forest?.commune?.name || ''),
    latitude:    f.forest  ? f.forest.latitude  : null,
    longitude:   f.forest  ? f.forest.longitude : null,

    // Dates & hours
    declaration_date:  f.declaration_date  ? f.declaration_date.toISOString().slice(0, 10)  : null,
    declaration_hour:  f.declaration_hour  ?? null,
    intervention_date: f.intervention_date ? f.intervention_date.toISOString().slice(0, 10) : null,
    intervention_hour: f.intervention_hour ?? null,
    extinction_date:   f.extinction_date   ? f.extinction_date.toISOString().slice(0, 10)   : null,
    extinction_hour:   f.extinction_hour   ?? null,

    // Vegetation & surfaces (ha)
    essence:          f.essence          || null,
    tot_foret:        f.tot_foret        ?? 0,
    tot_maquis:       f.tot_maquis       ?? 0,
    tot_broussailles: f.tot_broussailles ?? 0,
    surf_total:       f.surf_total       ?? 0,

    // Metadata
    cause:      f.cause      || 'Unknown',
    signale:    f.signale    || null,
    organismes: f.organismes || null,
    degats:     f.degats     ?? 0,

    // Weather
    meteo_temp:           f.meteo_temp           ?? null,
    meteo_wind_speed:     f.meteo_wind_speed     ?? null,
    meteo_wind_direction: f.meteo_wind_direction || null,

    // Audit
    created_by: f.created_by || null,
    created_at: f.created_at ? f.created_at.toISOString() : null
  };
}

// ── GET /api/fires ─────────────────────────────────────────────────────────────
exports.getFires = async (req, res) => {
  try {
    const { search, date_from, date_to, status } = req.query || {};
    const page    = parseInt(req.query.page)     || 1;
    const perPage = parseInt(req.query.per_page) || 50;

    const filter = {};

    // Filter by status
    if (status && VALID_STATUSES.includes(status)) {
      filter.status = status;
    }

    // Search by forest / daira / commune name
    if (search) {
      const match = { $regex: search, $options: 'i' };

      const [matchedDairas, matchedCommunes] = await Promise.all([
        Daira.find({ name: match }),
        Commune.find({ name: match })
      ]);
      const matchedDairaIds   = matchedDairas.map(d => d._id);
      const matchedCommuneIds = matchedCommunes.map(c => c._id);

      const matchedForests = await Forest.find({
        $or: [
          { name: match },
          { daira:   { $in: matchedDairaIds   } },
          { commune: { $in: matchedCommuneIds } }
        ]
      });

      filter.forest = { $in: matchedForests.map(f => f._id) };
    }

    // Date range filter on declaration_date
    if (date_from || date_to) {
      filter.declaration_date = {};
      if (date_from) filter.declaration_date.$gte = new Date(date_from);
      if (date_to)   filter.declaration_date.$lte = new Date(date_to);
    }

    const [total, fires] = await Promise.all([
      Fire.countDocuments(filter),
      Fire.find(filter)
        .populate(FIRE_POPULATE)
        .sort({ declaration_date: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage)
    ]);

    return res.json({
      fires: fires.map(formatFire),
      total,
      page,
      per_page: perPage
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// ── POST /api/fires ────────────────────────────────────────────────────────────
exports.createFire = async (req, res) => {
  try {
    const {
      // New: accept pre-resolved ObjectId refs directly from the select inputs
      forest_id, daira_id, commune_id,

      // Legacy: plain-text names (kept for backward compatibility)
      forest_name, daira, commune, latitude, longitude,

      declaration_date, declaration_hour,
      intervention_date, intervention_hour,
      extinction_date, extinction_hour,

      essence, tot_foret, tot_maquis, tot_broussailles, surf_total,
      cause, signale, organismes, degats,
      meteo_temp, meteo_wind_speed, meteo_wind_direction,

      status
    } = req.body || {};

    // ── Resolve forest / daira / commune ────────────────────────────────────
    let forestDoc = null;
    let resolvedDairaId   = null;
    let resolvedCommuneId = null;

    if (forest_id) {
      // Frontend sent an ObjectId (select input)
      forestDoc = await Forest.findById(forest_id);
      if (!forestDoc) return res.status(404).json({ error: 'Forest not found' });
      resolvedDairaId   = daira_id   || forestDoc.daira   || null;
      resolvedCommuneId = commune_id || forestDoc.commune || null;
    } else if (forest_name) {
      // Legacy plain-text path — find or create
      if (!declaration_date) {
        return res.status(400).json({ error: 'forest_name and declaration_date are required' });
      }
      const upperForestName = forest_name.toUpperCase().trim();
      forestDoc = await Forest.findOne({ name: upperForestName });

      if (!forestDoc) {
        let newDairaId = null, newCommuneId = null;
        if (daira) {
          const upperDaira = daira.toUpperCase().trim();
          let dairaDoc = await Daira.findOne({ name: upperDaira });
          if (!dairaDoc) dairaDoc = await new Daira({ name: upperDaira }).save();
          newDairaId = dairaDoc._id;

          if (commune) {
            const upperCommune = commune.toUpperCase().trim();
            let communeDoc = await Commune.findOne({ name: upperCommune });
            if (!communeDoc) communeDoc = await new Commune({ name: upperCommune, daira: newDairaId }).save();
            newCommuneId = communeDoc._id;
          }
        }
        forestDoc = await new Forest({
          name:      upperForestName,
          daira:     newDairaId,
          commune:   newCommuneId,
          latitude:  latitude  ?? null,
          longitude: longitude ?? null
        }).save();
      }
      resolvedDairaId   = forestDoc.daira   || null;
      resolvedCommuneId = forestDoc.commune || null;
    } else {
      return res.status(400).json({ error: 'Either forest_id or forest_name is required' });
    }

    if (!declaration_date) {
      return res.status(400).json({ error: 'declaration_date is required' });
    }

    // ── Auto-fetch weather if coordinates available and not already provided ──
    let finalTemp      = meteo_temp           ?? null;
    let finalWindSpeed = meteo_wind_speed     ?? null;
    let finalWindDir   = meteo_wind_direction || null;

    const lat = latitude || forestDoc.latitude;
    const lon = longitude || forestDoc.longitude;

    if ((finalTemp == null || finalWindSpeed == null) && lat && lon && declaration_date) {
      try {
        const url = (
          'https://archive-api.open-meteo.com/v1/archive' +
          `?latitude=${lat}` +
          `&longitude=${lon}` +
          `&start_date=${declaration_date}` +
          `&end_date=${declaration_date}` +
          '&hourly=temperature_2m,wind_speed_10m,wind_direction_10m' +
          '&timezone=Europe%2FLondon'
        );
        const { data } = await axios.get(url, { timeout: 8000 });
        const hourly = data.hourly || {};
        const times  = hourly.time || [];
        let idx = times.findIndex(t => t.endsWith('T12:00'));
        if (idx === -1) idx = 0;

        if (finalTemp      == null) finalTemp      = hourly.temperature_2m?.[idx]     ?? null;
        if (finalWindSpeed == null) finalWindSpeed = hourly.wind_speed_10m?.[idx]     ?? null;
        if (!finalWindDir) {
          const deg = hourly.wind_direction_10m?.[idx] ?? null;
          if (deg != null) {
            const dirs = ['N','NE','E','SE','S','SO','O','NO'];
            finalWindDir = dirs[Math.round(deg / 45) % 8];
          }
        }
      } catch (weatherErr) {
        console.warn('[WARN] Auto weather fetch failed:', weatherErr.message);
      }
    }

    // ── Create Fire ──────────────────────────────────────────────────────────
    const newFire = await new Fire({
      forest:  forestDoc._id,
      commune: resolvedCommuneId,
      daira:   resolvedDairaId,

      status: VALID_STATUSES.includes(status) ? status : 'declared',

      declaration_date:  declaration_date  ? new Date(declaration_date)  : null,
      declaration_hour:  declaration_hour  ?? null,
      intervention_date: intervention_date ? new Date(intervention_date) : null,
      intervention_hour: intervention_hour ?? null,
      extinction_date:   extinction_date   ? new Date(extinction_date)   : null,
      extinction_hour:   extinction_hour   ?? null,

      essence:          essence || null,
      tot_foret:        parseFloat(tot_foret)        || 0,
      tot_maquis:       parseFloat(tot_maquis)       || 0,
      tot_broussailles: parseFloat(tot_broussailles) || 0,
      surf_total:       parseFloat(surf_total)       || 0,

      cause:      ['INC', 'CON', 'Unknown'].includes(cause) ? cause : 'Unknown',
      signale:    signale    || null,
      organismes: organismes || null,
      degats:     parseFloat(degats) || 0,

      meteo_temp:           finalTemp,
      meteo_wind_speed:     finalWindSpeed !== null ? Math.round(finalWindSpeed * 10) / 10 : null,
      meteo_wind_direction: finalWindDir,

      created_by: req.user?.sub || null
    }).save();

    // ── Sync with Python stats endpoint (best-effort) ────────────────────────
    try {
      await axios.post('http://localhost:5001/add_fire', {
        fire: {
          FORET:            forestDoc.name,
          DAIRA:            daira   || '',
          COMMUNE:          commune || '',
          TOT_FORET:        tot_foret        || 0,
          TOT_MAQUIS:       tot_maquis       || 0,
          TOT_BROUSSAILLES: tot_broussailles || 0,
          SURF_TOTAL:       surf_total       || 0
        }
      });
    } catch (syncErr) {
      console.warn('[WARN] Failed to sync with Python stats endpoint:', syncErr.message);
    }

    return res.status(201).json({ id: newFire._id, message: 'Fire added successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// ── PATCH /api/fires/:id/status ────────────────────────────────────────────────
exports.updateFireStatus = async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const fire = await Fire.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate(FIRE_POPULATE);

    if (!fire) return res.status(404).json({ error: 'Fire not found' });

    return res.json(formatFire(fire));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// ── PUT /api/fires/:id ──────────────────────────────────────────────────────────
exports.updateFire = async (req, res) => {
  try {
    const updateData = { ...req.body };

    // Parse numeric fields if they are sent
    if (updateData.tot_foret !== undefined) updateData.tot_foret = parseFloat(updateData.tot_foret) || 0;
    if (updateData.tot_maquis !== undefined) updateData.tot_maquis = parseFloat(updateData.tot_maquis) || 0;
    if (updateData.tot_broussailles !== undefined) updateData.tot_broussailles = parseFloat(updateData.tot_broussailles) || 0;
    if (updateData.surf_total !== undefined) updateData.surf_total = parseFloat(updateData.surf_total) || 0;
    if (updateData.degats !== undefined) updateData.degats = parseFloat(updateData.degats) || 0;
    if (updateData.declaration_hour !== undefined) updateData.declaration_hour = parseInt(updateData.declaration_hour) ?? null;
    if (updateData.intervention_hour !== undefined) updateData.intervention_hour = parseInt(updateData.intervention_hour) ?? null;
    if (updateData.extinction_hour !== undefined) updateData.extinction_hour = parseInt(updateData.extinction_hour) ?? null;

    // Convert dates if they are sent
    if (updateData.declaration_date) updateData.declaration_date = new Date(updateData.declaration_date);
    if (updateData.intervention_date) updateData.intervention_date = new Date(updateData.intervention_date);
    if (updateData.extinction_date) updateData.extinction_date = new Date(updateData.extinction_date);

    const fire = await Fire.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate(FIRE_POPULATE);

    if (!fire) return res.status(404).json({ error: 'Fire not found' });

    // Sync with Python stats endpoint (best-effort)
    try {
      await axios.post('http://localhost:5001/add_fire', {
        fire: {
          FORET:            fire.forest?.name || '',
          DAIRA:            fire.daira?.name || '',
          COMMUNE:          fire.commune?.name || '',
          TOT_FORET:        fire.tot_foret        || 0,
          TOT_MAQUIS:       fire.tot_maquis       || 0,
          TOT_BROUSSAILLES: fire.tot_broussailles || 0,
          SURF_TOTAL:       fire.surf_total       || 0
        }
      });
    } catch (syncErr) {
      console.warn('[WARN] Failed to sync with Python stats endpoint:', syncErr.message);
    }

    return res.json(formatFire(fire));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// ── GET /api/fires/stats ───────────────────────────────────────────────────────
exports.getStats = async (req, res) => {
  try {
    const total = await Fire.countDocuments({});

    // Fires declared this calendar month
    const now        = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const this_month = await Fire.countDocuments({
      declaration_date: { $gte: monthStart, $lt: monthEnd }
    });

    // Breakdown by status
    const statusGroup = await Fire.aggregate([
      { $group: { _id: '$status', cnt: { $sum: 1 } } }
    ]);
    const by_status = { declared: 0, investigating: 0, controlled: 0, extinguished: 0 };
    statusGroup.forEach(g => { if (g._id in by_status) by_status[g._id] = g.cnt; });

    // Top daira by fire count
    const topZoneGroup = await Fire.aggregate([
      { $match: { daira: { $ne: null } } },
      { $group: { _id: '$daira', cnt: { $sum: 1 } } },
      { $sort:  { cnt: -1 } },
      { $limit: 1 },
      { $lookup: { from: 'dairas', localField: '_id', foreignField: '_id', as: 'daira_info' } },
      { $unwind: '$daira_info' }
    ]);
    const top_zone = topZoneGroup.length > 0 ? topZoneGroup[0].daira_info.name : 'N/A';

    // Total surface burned
    const surfaceAgg = await Fire.aggregate([
      { $group: { _id: null, total_surface: { $sum: '$surf_total' } } }
    ]);
    const total_surface = surfaceAgg.length > 0 ? Math.round(surfaceAgg[0].total_surface * 10) / 10 : 0;

    // Breakdown by cause
    const causeGroup = await Fire.aggregate([
      { $group: { _id: '$cause', cnt: { $sum: 1 } } }
    ]);
    const by_cause = { INC: 0, CON: 0, Unknown: 0 };
    causeGroup.forEach(g => { if (g._id in by_cause) by_cause[g._id] = g.cnt; });

    // Heatmap points
    const heatmapFires = await Fire.find({}, 'forest surf_total').populate('forest', 'latitude longitude');
    const heatmap = heatmapFires
      .filter(f => f.forest?.latitude != null && f.forest?.longitude != null)
      .map(f => ({
        lat:       f.forest.latitude,
        lng:       f.forest.longitude,
        intensity: f.surf_total || 1
      }));

    return res.json({ total, this_month, top_zone, total_surface, by_cause, by_status, heatmap });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// ── DELETE /api/fires/:id ──────────────────────────────────────────────────────
exports.deleteFire = async (req, res) => {
  try {
    const fire = await Fire.findByIdAndDelete(req.params.id);
    if (!fire) return res.status(404).json({ error: 'Fire not found' });
    return res.json({ message: 'Fire deleted successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};