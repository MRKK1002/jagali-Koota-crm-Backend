// controllers/settingsController.js
const Settings = require("../model/Settings");

// Get settings (types)
const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
      await settings.save();
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add expense type
const addExpenseType = async (req, res) => {
  try {
    const { type } = req.body;

    // Find existing settings or create a new one if it doesn't exist
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings({
        expenseTypes: [],
        claimTypes: [],
      });
    }

    if (!settings.expenseTypes.includes(type)) {
      settings.expenseTypes.push(type);
      await settings.save();
    }

    res.json({ expenseTypes: settings.expenseTypes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Remove expense type
const removeExpenseType = async (req, res) => {
  try {
    const { type } = req.params;
    const settings = await Settings.findOne();
    settings.expenseTypes = settings.expenseTypes.filter((t) => t !== type);
    await settings.save();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add claim type
const addClaimType = async (req, res) => {
  try {
    const { type } = req.body;
    const settings = await Settings.findOne();
    if (!settings.claimTypes.includes(type)) {
      settings.claimTypes.push(type);
      await settings.save();
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Remove claim type
const removeClaimType = async (req, res) => {
  try {
    const { type } = req.params;
    const settings = await Settings.findOne();
    settings.claimTypes = settings.claimTypes.filter((t) => t !== type);
    await settings.save();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getSettings,
  addExpenseType,
  removeExpenseType,
  addClaimType,
  removeClaimType,
};
