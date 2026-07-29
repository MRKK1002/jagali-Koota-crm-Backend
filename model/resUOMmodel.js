const mongoose = require('mongoose');

const uomSchema = new mongoose.Schema({
  label: {
    type: String,
    required: true,
    unique: true,   // "Kilogram"
    trim: true
  },
  unit: {
    type: String,
    required: true,
    unique: true,   // "kg"
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Uom', uomSchema);
