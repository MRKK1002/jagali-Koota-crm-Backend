const mongoose = require('mongoose');

const kitchenStationSchema = new mongoose.Schema({
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['main-kitchen', 'tandoor', 'chinese', 'bar', 'bakery', 'grill', 'dessert', 'pizza', 'salad-bar'],
    required: true
  },
  description: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  capacity: {
    type: Number, // max concurrent items
    default: 5
  },
  currentLoad: {
    type: Number,
    default: 0
  },
  assignedCooks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  }],
  kdsDeviceId: {
    type: String
  },
  printerIP: {
    type: String
  },
  settings: {
    autoAssign: {
      type: Boolean,
      default: true
    },
    soundEnabled: {
      type: Boolean,
      default: true
    },
    displayDuration: {
      type: Number, // seconds
      default: 30
    }
  },
  performance: {
    averagePrepTime: Number,
    totalOrdersCompleted: {
      type: Number,
      default: 0
    },
    efficiency: {
      type: Number,
      default: 100
    }
  }
}, {
  timestamps: true
});

kitchenStationSchema.index({ branchId: 1, isActive: 1 });

module.exports = mongoose.model('KitchenStation', kitchenStationSchema);


