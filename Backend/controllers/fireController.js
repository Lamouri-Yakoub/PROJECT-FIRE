const axios = require('axios');
const Fire = require('../models/Fire');
const Forest = require('../models/Forest');
const Daira = require('../models/Daira');
const Commune = require('../models/Commune');

// GET /api/fires
exports.getFires = async (req, res) => {
  try {
    const { search, date_from, date_to } = req.query || {};
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.per_page) || 50;

    const filter = {};

    if (search) {
      const match = { $regex: search, $options: 'i' };
      // Find matching dairas and communes by name
      const matchedDairas = await Daira.find({ name: match });
      const matchedCommunes = await Commune.find({ name: match });
      const matchedDairaIds = matchedDairas.map(d => d._id);
      const matchedCommuneIds = matchedCommunes.map(c => c._id);
      // Find forests matching name, or linked daira/commune
      const matchedForests = await Forest.find({
        $or: [
          { name: match },
          { daira: { $in: matchedDairaIds } },
          { commune: { $in: matchedCommuneIds } }
        ]
      });
      const matchedForestIds = matchedForests.map(f => f._id);
      filter.forest = { $in: matchedForestIds };
    }

    if (date_from || date_to) {
      filter.fire_date = {};
      if (date_from) filter.fire_date.$gte = date_from;
      if (date_to) filter.fire_date.$lte = date_to;
    }

    const total = await Fire.countDocuments(filter);
    const fires = await Fire.find(filter)
      .populate({ path: 'forest', populate: [{ path: 'daira' }, { path: 'commune' }] })
      .sort({ fire_date: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage);

    const formattedFires = fires.map(f => ({
      id: f._id,
      forest_name: f.forest ? f.forest.name : 'Unknown',
      daira: f.forest && f.forest.daira ? f.forest.daira.name : '',
      commune: f.forest && f.forest.commune ? f.forest.commune.name : '',
      latitude: f.forest ? f.forest.latitude : null,
      longitude: f.forest ? f.forest.longitude : null,
      fire_date: f.fire_date,
      surface_burned: f.surface_burned,
      cause: f.cause,
      severity: f.severity,
      notes: f.notes,
      created_by: f.created_by,
      created_at: f.created_at ? f.created_at.toISOString() : new Date().toISOString()
    }));

    return res.json({
      fires: formattedFires,
      total,
      page,
      per_page: perPage
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/fires
exports.createFire = async (req, res) => {
  try {
    const {
      forest_name,
      daira,
      commune,
      latitude,
      longitude,
      fire_date,
      surface_burned,
      cause,
      severity,
      notes
    } = req.body || {};

    if (!forest_name || !fire_date) {
      return res.status(400).json({ error: 'forest_name and fire_date are required' });
    }

    const upperForestName = forest_name.toUpperCase().trim();

    // Find or create Forest matching the forest_name
    let forestDoc = await Forest.findOne({ name: upperForestName });
    if (!forestDoc) {
      // Resolve daira and commune ObjectIds
      let dairaId = null;
      let communeId = null;
      if (daira) {
        const upperDaira = daira.toUpperCase().trim();
        let dairaDoc = await Daira.findOne({ name: upperDaira });
        if (!dairaDoc) {
          dairaDoc = new Daira({ name: upperDaira });
          await dairaDoc.save();
        }
        dairaId = dairaDoc._id;

        if (commune) {
          const upperCommune = commune.toUpperCase().trim();
          let communeDoc = await Commune.findOne({ name: upperCommune });
          if (!communeDoc) {
            communeDoc = new Commune({ name: upperCommune, daira: dairaId });
            await communeDoc.save();
          }
          communeId = communeDoc._id;
        }
      }

      forestDoc = new Forest({
        name: upperForestName,
        daira: dairaId,
        commune: communeId,
        latitude: latitude !== undefined ? latitude : null,
        longitude: longitude !== undefined ? longitude : null
      });
      await forestDoc.save();
    }

        // 1) Save to MongoDB
    const newFire = new Fire({
      forest: forestDoc._id,
      fire_date,
      surface_burned: surface_burned !== undefined ? parseFloat(surface_burned) : 0,
      cause: cause || 'Unknown',
      severity: severity || 'medium',
      notes: notes || '',
      created_by: req.user.sub
    });

    await newFire.save();

    // 2) Send API request to Python to update model stats
    try {
      const pythonPayload = {
        fire: {
          FORET: forest_name,
          DAIRA: daira || '',
          COMMUNE: commune || '',
          TOT_FORET: 0,
          TOT_MAQUIS: 0,
          TOT_BROUSSAILLES: 0,
          SURF_TOTAL: surface_burned !== undefined ? surface_burned : 0
        }
      };
      await axios.post('http://localhost:5001/add_fire', pythonPayload);
    } catch (err) {
      console.warn('[WARN] Failed to sync new fire with Python stats endpoint:', err.message);
    }

    return res.status(201).json({
      id: newFire._id,
      message: 'Fire added successfully'
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/fires/stats
exports.getStats = async (req, res) => {
  try {
    const total = await Fire.countDocuments({});

    // this_month count
    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const this_month = await Fire.countDocuments({
      fire_date: { $regex: `^${currentMonthPrefix}` }
    });

    // top_zone (daira with highest count)
    const topZoneGroup = await Fire.aggregate([
      {
        $lookup: {
          from: 'forests',
          localField: 'forest',
          foreignField: '_id',
          as: 'forest_info'
        }
      },
      { $unwind: '$forest_info' },
      { $match: { 'forest_info.daira': { $ne: null } } },
      {
        $lookup: {
          from: 'dairas',
          localField: 'forest_info.daira',
          foreignField: '_id',
          as: 'daira_info'
        }
      },
      { $unwind: '$daira_info' },
      { $group: { _id: '$daira_info.name', cnt: { $sum: 1 } } },
      { $sort: { cnt: -1 } },
      { $limit: 1 }
    ]);
    const top_zone = topZoneGroup.length > 0 ? topZoneGroup[0]._id : 'N/A';

    // by_severity counts
    const severityGroup = await Fire.aggregate([
      { $group: { _id: '$severity', cnt: { $sum: 1 } } }
    ]);
    const by_severity = { low: 0, medium: 0, high: 0, critical: 0 };
    severityGroup.forEach(g => {
      if (g._id in by_severity) {
        by_severity[g._id] = g.cnt;
      }
    });

    // heatmap coordinates
    const heatmapFires = await Fire.find({}).populate('forest');
    const heatmap = heatmapFires
      .filter(f => f.forest && f.forest.latitude !== null && f.forest.longitude !== null)
      .map(f => ({
        lat: f.forest.latitude,
        lng: f.forest.longitude,
        intensity: f.surface_burned || 1
      }));

    return res.json({
      total,
      this_month,
      top_zone,
      by_severity,
      heatmap
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
