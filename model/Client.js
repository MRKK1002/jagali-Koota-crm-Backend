const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  clientName: {
    type: String,
    required: true,
    trim: true
  },
  gstin: {
    type: String,
    trim: true
  },
  billingAddress: {
    type: String,
    required: true
  },
  contactPerson: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  state: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    default: 'Active',
    enum: ['Active', 'Inactive']
  },
  companyType: {
    type: String,
    enum: ['Individual', 'Partnership', 'Private Limited', 'Public Limited', 'LLP'],
    default: 'Private Limited'
  },
  panNumber: {
    type: String,
    trim: true
  },
  businessType: {
    type: String,
    enum: ['construction', 'restaurant'],
    default: 'construction'
  }
}, {
  timestamps: true
});

// Index for better query performance
clientSchema.index({ clientName: 1 });
clientSchema.index({ status: 1 });

module.exports = mongoose.models.Client || mongoose.model('Client', clientSchema);