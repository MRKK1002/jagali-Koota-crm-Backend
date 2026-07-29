const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  address: {
    type: String,
    required: true,
    trim: true,
  },
  image: {
    type: String,
    required: false,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Check if Branch model already exists to avoid overwrite error
// This allows the model to be used from both old and new locations
module.exports = mongoose.models.Branch || mongoose.model('Branch', branchSchema);