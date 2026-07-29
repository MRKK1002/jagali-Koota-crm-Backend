const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  reportType: {
    type: String,
    required: true,
    enum: [
      'gst',
      'project-progress', 
      'financial',
      'attendance',
      'material',
      'safety',
      'client',
      'payment',
      'outstanding',
      'monthly'
    ]
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['Complete', 'Pending', 'Failed'],
    default: 'Complete'
  },
  parameters: {
    fromDate: String,
    toDate: String,
    gstPeriod: String,
    clientId: String,
    projectId: String
  },
  data: {
    type: mongoose.Schema.Types.Mixed // Store the actual report data
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for better query performance
reportSchema.index({ reportType: 1, createdAt: -1 });
reportSchema.index({ status: 1 });

module.exports = mongoose.model('Report', reportSchema);