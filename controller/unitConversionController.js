const UnitConversion = require('../model/UnitConversionModel');

// Get all conversions
const getAllConversions = async (req, res) => {
  try {
    const conversions = await UnitConversion.find().sort({ fromUnit: 1 });
    res.status(200).json({
      success: true,
      data: conversions
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching conversions', error: error.message });
  }
};

// Create a new conversion
const createConversion = async (req, res) => {
  try {
    const { fromUnit, toUnit, factor, fromLabel, toLabel } = req.body;

    if (!fromUnit || !toUnit || !factor) {
      return res.status(400).json({ success: false, message: 'fromUnit, toUnit, and factor are required' });
    }

    if (factor <= 0) {
      return res.status(400).json({ success: false, message: 'Factor must be greater than 0' });
    }

    const conversion = new UnitConversion({ fromUnit, toUnit, factor, fromLabel, toLabel });
    const saved = await conversion.save();

    res.status(201).json({
      success: true,
      message: 'Conversion created successfully',
      data: saved
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'This conversion already exists' });
    }
    res.status(500).json({ success: false, message: 'Error creating conversion', error: error.message });
  }
};

// Update a conversion
const updateConversion = async (req, res) => {
  try {
    const { fromUnit, toUnit, factor, fromLabel, toLabel } = req.body;

    const conversion = await UnitConversion.findByIdAndUpdate(
      req.params.id,
      { fromUnit, toUnit, factor, fromLabel, toLabel },
      { new: true, runValidators: true }
    );

    if (!conversion) {
      return res.status(404).json({ success: false, message: 'Conversion not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Conversion updated successfully',
      data: conversion
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'This conversion already exists' });
    }
    res.status(500).json({ success: false, message: 'Error updating conversion', error: error.message });
  }
};

// Delete a conversion
const deleteConversion = async (req, res) => {
  try {
    const conversion = await UnitConversion.findByIdAndDelete(req.params.id);
    if (!conversion) {
      return res.status(404).json({ success: false, message: 'Conversion not found' });
    }
    res.status(200).json({ success: true, message: 'Conversion deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting conversion', error: error.message });
  }
};

// Get conversion factor between two units
const getConversionFactor = async (req, res) => {
  try {
    const { fromUnit, toUnit } = req.query;

    if (!fromUnit || !toUnit) {
      return res.status(400).json({ success: false, message: 'fromUnit and toUnit are required' });
    }

    // If same unit, factor is 1
    if (fromUnit === toUnit) {
      return res.status(200).json({ success: true, data: { factor: 1, fromUnit, toUnit } });
    }

    // Look for direct conversion
    let conversion = await UnitConversion.findOne({ fromUnit, toUnit });
    if (conversion) {
      return res.status(200).json({ success: true, data: { factor: conversion.factor, fromUnit, toUnit } });
    }

    // Look for reverse conversion
    conversion = await UnitConversion.findOne({ fromUnit: toUnit, toUnit: fromUnit });
    if (conversion) {
      return res.status(200).json({ success: true, data: { factor: 1 / conversion.factor, fromUnit, toUnit } });
    }

    return res.status(404).json({ success: false, message: `No conversion found between ${fromUnit} and ${toUnit}` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error getting conversion factor', error: error.message });
  }
};

// Seed default conversions
const seedDefaults = async (req, res) => {
  try {
    const defaults = [
      { fromUnit: 'kg', toUnit: 'g', factor: 1000, fromLabel: 'Kilogram', toLabel: 'Gram' },
      { fromUnit: 'l', toUnit: 'ml', factor: 1000, fromLabel: 'Liter', toLabel: 'Milliliter' },
      { fromUnit: 'doz', toUnit: 'pcs', factor: 12, fromLabel: 'Dozen', toLabel: 'Pieces' },
      { fromUnit: 'kg', toUnit: 'mg', factor: 1000000, fromLabel: 'Kilogram', toLabel: 'Milligram' },
      { fromUnit: 'g', toUnit: 'mg', factor: 1000, fromLabel: 'Gram', toLabel: 'Milligram' },
    ];

    let created = 0;
    let skipped = 0;

    for (const conv of defaults) {
      const exists = await UnitConversion.findOne({ fromUnit: conv.fromUnit, toUnit: conv.toUnit });
      if (!exists) {
        await UnitConversion.create(conv);
        created++;
      } else {
        skipped++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Seeded ${created} conversions, skipped ${skipped} (already exist)`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error seeding defaults', error: error.message });
  }
};

module.exports = {
  getAllConversions,
  createConversion,
  updateConversion,
  deleteConversion,
  getConversionFactor,
  seedDefaults,
};
