// models/KitchenNotification.js (renamed to avoid conflict with main Notification model)
const mongoose = require('mongoose');

const kitchenNotificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['item_ready', 'order_ready', 'order_completed', 'new_order', 'urgent'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'KitchenOrder'
  },
  orderNumber: {
    type: String
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
kitchenNotificationSchema.index({ branchId: 1, read: 1 });
kitchenNotificationSchema.index({ createdAt: -1 });

module.exports = mongoose.models.KitchenNotification || mongoose.model('KitchenNotification', kitchenNotificationSchema);