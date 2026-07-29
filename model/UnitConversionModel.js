const mongoose = require('mongoose');

// Unit conversion table - defines how units relate to each other
// e.g., 1 kg = 1000 g, 1 l = 1000 ml
const unitConversionSchema = new mongoose.Schema({
  fromUnit: {
    type: String,
    required: true,
    trim: true,
    // e.g., "kg", "l", "doz"
  },
  toUnit: {
    type: String,
    required: true,
    trim: true,
    // e.g., "g", "ml", "pcs"
  },
  factor: {
    type: Number,
    required: true,
    min: 0,
    // e.g., 1000 (1 kg = 1000 g)
  },
  fromLabel: {
    type: String,
    trim: true,
    // e.g., "Kilogram"
  },
  toLabel: {
    type: String,
    trim: true,
    // e.g., "Gram"
  }
}, {
  timestamps: true
});

// Compound unique index - only one conversion per pair
unitConversionSchema.index({ fromUnit: 1, toUnit: 1 }, { unique: true });

module.exports = mongoose.models.UnitConversion || mongoose.model('UnitConversion', unitConversionSchema);
