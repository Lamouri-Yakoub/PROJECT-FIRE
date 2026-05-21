const Forest = require('../models/Forest');
const Fire = require('../models/Fire');

// Helper to escape regex special characters
function escapeRegExp(string) {
  return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

// GET /api/forests
exports.getForests = async (req, res) => {
  try {
    const { search, daira, commune, page: reqPage, per_page: reqPerPage } = req.query || {};

    const filter = {};
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }
    if (daira) {
      filter.daira = daira;
    }
    if (commune) {
      filter.commune = commune;
    }

    let forestsQuery = Forest.find(filter).populate('daira').populate('commune').sort({ name: 1 });

    const total = await Forest.countDocuments(filter);

    if (reqPage) {
      const page = parseInt(reqPage) || 1;
      const perPage = parseInt(reqPerPage) || 10;
      forestsQuery = forestsQuery.skip((page - 1) * perPage).limit(perPage);
    }

    const forests = await forestsQuery;

    const forestsWithFireCount = await Promise.all(
      forests.map(async (f) => {
        const fireCount = await Fire.countDocuments({ forest: f._id });
        return {
          id: f._id,
          name: f.name,
          daira: f.daira,
          commune: f.commune,
          latitude: f.latitude,
          longitude: f.longitude,
          fire_count: fireCount
        };
      })
    );

    const response = { forests: forestsWithFireCount };
    if (reqPage) {
      response.total = total;
      response.page = parseInt(reqPage) || 1;
      response.per_page = parseInt(reqPerPage) || 10;
    }

    return res.json(response);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/forests/:id
exports.getForestById = async (req, res) => {
  try {
    const forest = await Forest.findById(req.params.id).populate('daira').populate('commune');
    if (!forest) {
      return res.status(404).json({ error: 'Forest not found' });
    }
    const fireCount = await Fire.countDocuments({ forest: forest._id });
    return res.json({
      id: forest._id,
      name: forest.name,
      daira: forest.daira,
      commune: forest.commune,
      latitude: forest.latitude,
      longitude: forest.longitude,
      fire_count: fireCount,
      created_at: forest.created_at
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/forests
exports.createForest = async (req, res) => {
  try {
    const { name, daira_id, commune_id, latitude, longitude } = req.body || {};
    if (!name) {
      return res.status(400).json({ error: 'Forest name is required' });
    }

    const newForest = new Forest({
      name: name.toUpperCase().trim(),
      daira: daira_id || null,
      commune: commune_id || null,
      latitude: latitude !== undefined ? latitude : null,
      longitude: longitude !== undefined ? longitude : null,
    });

    await newForest.save();
    const populated = await Forest.findById(newForest._id).populate('daira').populate('commune');
    return res.status(201).json(populated);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Forest name already exists' });
    }
    return res.status(500).json({ error: err.message });
  }
};

// PUT /api/forests/:id
exports.updateForest = async (req, res) => {
  try {
    const { name, daira_id, commune_id, latitude, longitude } = req.body || {};
    const updateFields = {};
    if (name !== undefined) updateFields.name = name.toUpperCase().trim();
    if (daira_id !== undefined) updateFields.daira = daira_id || null;
    if (commune_id !== undefined) updateFields.commune = commune_id || null;
    if (latitude !== undefined) updateFields.latitude = latitude;
    if (longitude !== undefined) updateFields.longitude = longitude;

    const forest = await Forest.findByIdAndUpdate(req.params.id, updateFields, { new: true })
      .populate('daira').populate('commune');
    if (!forest) {
      return res.status(404).json({ error: 'Forest not found' });
    }
    return res.json(forest);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Forest name already exists' });
    }
    return res.status(500).json({ error: err.message });
  }
};

// DELETE /api/forests/:id
exports.deleteForest = async (req, res) => {
  try {
    const forest = await Forest.findByIdAndDelete(req.params.id);
    if (!forest) {
      return res.status(404).json({ error: 'Forest not found' });
    }
    return res.json({ message: 'Forest deleted successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
