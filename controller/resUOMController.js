const UOM = require('../model/resUOMmodel'); // Schema with { label, unit }

// Create a new UOM
const createUOM = async (req, res) => {
  try {
    const { label, unit } = req.body;

    if (!label || !unit) {
      return res.status(400).json({ message: 'Label and Unit are required' });
    }

    const uom = new UOM({ label, unit });
    const savedUOM = await uom.save();

    res.status(201).json({
      message: 'UOM created successfully',
      data: savedUOM
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Label or Unit already exists' });
    }
    res.status(500).json({ message: 'Error creating UOM', error: error.message });
  }
};

// Get all UOMs
const getAllUOMs = async (req, res) => {
  try {
    const uoms = await UOM.find();
    res.status(200).json({
      message: 'UOMs retrieved successfully',
      data: uoms
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving UOMs', error: error.message });
  }
};

// Get a single UOM by ID
const getUOMById = async (req, res) => {
  try {
    const uom = await UOM.findById(req.params.id);
    if (!uom) {
      return res.status(404).json({ message: 'UOM not found' });
    }
    res.status(200).json({
      message: 'UOM retrieved successfully',
      data: uom
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving UOM', error: error.message });
  }
};

// Update a UOM
const updateUOM = async (req, res) => {
  try {
    const { label, unit } = req.body;

    const uom = await UOM.findByIdAndUpdate(
      req.params.id,
      { label, unit },
      { new: true, runValidators: true }
    );

    if (!uom) {
      return res.status(404).json({ message: 'UOM not found' });
    }

    res.status(200).json({
      message: 'UOM updated successfully',
      data: uom
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Label or Unit already exists' });
    }
    res.status(500).json({ message: 'Error updating UOM', error: error.message });
  }
};

// Delete a UOM
const deleteUOM = async (req, res) => {
  try {
    const uom = await UOM.findByIdAndDelete(req.params.id);
    if (!uom) {
      return res.status(404).json({ message: 'UOM not found' });
    }
    res.status(200).json({ message: 'UOM deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting UOM', error: error.message });
  }
};

module.exports = {
  createUOM,
  getAllUOMs,
  getUOMById,
  updateUOM,
  deleteUOM
};
