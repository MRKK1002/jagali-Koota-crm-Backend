const mongoose = require('mongoose');

const taxSlabSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  // GST Structure
  gstRate: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  cgstRate: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  sgstRate: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  igstRate: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  // Legacy support - keep for backward compatibility
  taxRate: [{
    type: Number,
    min: 0,
    max: 100,
  }],
  serviceRate: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  effectiveFrom: {
    type: Date,
    default: Date.now,
  },
  effectiveTo: {
    type: Date,
  },
  applicableFor: {
    type: String,
    enum: ["Dine-in", "Takeaway", "Delivery", "All"],
    default: "All",
  },
  priority: {
    type: Number,
    default: 0,
    min: 0,
  },
}, {
  timestamps: true
});

module.exports = mongoose.model('TaxSlab', taxSlabSchema);