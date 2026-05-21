const Daira = require('../models/Daira');
const Commune = require('../models/Commune');

// GET /api/dairas
exports.getDairas = async (req, res) => {
  try {
    const dairas = await Daira.find().populate('communes').sort({ name: 1 });
    return res.json(dairas);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/dairas
exports.createDaira = async (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name) {
      return res.status(400).json({ error: 'Daira name is required' });
    }

    const upperName = name.toUpperCase().trim();
    const existing = await Daira.findOne({ name: upperName });
    if (existing) {
      return res.status(400).json({ error: 'Daira already exists' });
    }

    const newDaira = new Daira({ name: upperName });
    await newDaira.save();

    return res.status(201).json(newDaira);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// PUT /api/dairas/:id
exports.updateDaira = async (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name) {
      return res.status(400).json({ error: 'Daira name is required for update' });
    }

    const upperName = name.toUpperCase().trim();
    const existing = await Daira.findOne({ name: upperName, _id: { $ne: req.params.id } });
    if (existing) {
      return res.status(400).json({ error: 'Another Daira with this name already exists' });
    }

    const daira = await Daira.findByIdAndUpdate(
      req.params.id,
      { name: upperName },
      { new: true }
    );

    if (!daira) {
      return res.status(404).json({ error: 'Daira not found' });
    }

    return res.json(daira);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// DELETE /api/dairas/:id
exports.deleteDaira = async (req, res) => {
  try {
    // Check if there are associated communes
    const associatedCommunes = await Commune.countDocuments({ daira: req.params.id });
    if (associatedCommunes > 0) {
      return res.status(400).json({ error: 'Cannot delete Daira with associated communes' });
    }

    const daira = await Daira.findByIdAndDelete(req.params.id);
    if (!daira) {
      return res.status(404).json({ error: 'Daira not found' });
    }

    return res.json({ message: 'Daira deleted successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
