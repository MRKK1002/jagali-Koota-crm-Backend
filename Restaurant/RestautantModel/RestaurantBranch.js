const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  gstNumber: {
    type: String,
    required: false,
    trim: true,
  },
  address: {
    type: String,
    required: true,
    trim: true,
  },
  contact: {
    phone: {
      type: String,
      required: false,
      trim: true,
    },
    email: {
      type: String,
      required: false,
      trim: true,
    },
  },
  openingHours: {
    mondayToFriday: {
      type: String,
      required: false,
      default: "11:00 AM - 11:00 PM",
    },
    saturday: {
      type: String,
      required: false,
      default: "11:00 AM - 12:00 AM",
    },
    sunday: {
      type: String,
      required: false,
      default: "12:00 PM - 10:00 PM",
    },
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
}, {
  timestamps: true
});

// Check if Branch model already exists to avoid overwrite error
// This allows the model to be used from both old and new locations
module.exports = mongoose.models.Branch || mongoose.model('Branch', branchSchema);