// models/KitchenOrder.js
const mongoose = require('mongoose');

const kitchenItemSchema = new mongoose.Schema({
  menuItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Menu',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Ready'],
    default: 'Pending'
  },
  category: {
    type: String,
    required: true
  },
  notes: {
    type: String,
    default: ''
  },
  startedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  }
});

const kitchenOrderSchema = new mongoose.Schema({
  originalOrderId: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    refPath: 'orderType'
  },
  orderType: {
    type: String,
    enum: ['Online Order', 'Restaurant Order', 'Darshini Order'],
    required: true
  },
  orderNumber: {
    type: String,
    required: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  tableNumber: {
    type: String,
    default: ''
  },
  waiterName: {
    type: String,
    default: ''
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded', 'paid at counter'],
    default: 'pending'
  },
  deliveryAddress: {
    type: String,
    default: ''
  },
  customerName: {
    type: String,
    required: true
  },
  customerPhone: {
    type: String,
    default: ''
  },
  deliveryAddress: {
    type: String,
    default: ''
  },
  waiterName: {
    type: String,
    default: ''
  },
  items: [kitchenItemSchema],
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Ready', 'Completed'],
    default: 'Pending'
  },
  orderTime: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  },
  kitchenNotes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Indexes for better query performance
kitchenOrderSchema.index({ branchId: 1, status: 1 });
kitchenOrderSchema.index({ orderType: 1, originalOrderId: 1 });
kitchenOrderSchema.index({ orderNumber: 1 });
kitchenOrderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('KitchenOrder', kitchenOrderSchema);