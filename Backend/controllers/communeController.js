const Commune = require('../models/Commune');
const Daira = require('../models/Daira');

// GET /api/communes
exports.getCommunes = async (req, res) => {
  try {
    const communes = await Commune.find().populate('daira').sort({ name: 1 });
    return res.json(communes);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/communes
exports.createCommune = async (req, res) => {
  try {
    const { name, daira_id } = req.body || {};
    if (!name || !daira_id) {
      return res.status(400).json({ error: 'Commune name and daira_id are required' });
    }

    // Verify Daira exists
    const dairaExists = await Daira.findById(daira_id);
    if (!dairaExists) {
      return res.status(404).json({ error: 'Daira not found' });
    }

    const upperName = name.toUpperCase().trim();
    const existing = await Commune.findOne({ name: upperName });
    if (existing) {
      return res.status(400).json({ error: 'Commune already exists' });
    }

    const newCommune = new Commune({
      name: upperName,
      daira: daira_id
    });
    await newCommune.save();

    const populatedCommune = await Commune.findById(newCommune._id).populate('daira');
    return res.status(201).json(populatedCommune);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// PUT /api/communes/:id
exports.updateCommune = async (req, res) => {
  try {
    const { name, daira_id } = req.body || {};
    const updateFields = {};

    if (name !== undefined) {
      const upperName = name.toUpperCase().trim();
      const existing = await Commune.findOne({ name: upperName, _id: { $ne: req.params.id } });
      if (existing) {
        return res.status(400).json({ error: 'Another Commune with this name already exists' });
      }
      updateFields.name = upperName;
    }

    if (daira_id !== undefined) {
      const dairaExists = await Daira.findById(daira_id);
      if (!dairaExists) {
        return res.status(404).json({ error: 'Daira not found' });
      }
      updateFields.daira = daira_id;
    }

    const commune = await Commune.findByIdAndUpdate(req.params.id, updateFields, { new: true }).populate('daira');
    if (!commune) {
      return res.status(404).json({ error: 'Commune not found' });
    }

    return res.json(commune);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// DELETE /api/communes/:id
exports.deleteCommune = async (req, res) => {
  try {
    const commune = await Commune.findByIdAndDelete(req.params.id);
    if (!commune) {
      return res.status(404).json({ error: 'Commune not found' });
    }
    return res.json({ message: 'Commune deleted successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
