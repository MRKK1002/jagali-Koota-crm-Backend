const mongoose = require('mongoose');

const inventoryDistributionSchema = new mongoose.Schema({
  productName: {
    type: String,
    required: true,
  },
  availableStock: {
    type: Number,
    required: true,
  },
  pricePerUnit: {
    type: Number,
    default: 0,
  },
  taxRate: {
    type: Number,
    default: 0,
  },
  totalValue: {
    type: Number,
    default: 0,
  },
  recipientName: {
    type: String,
    required: true,
  },
  contact: {
    type: String,
  },
  quantityDistributed: {
    type: Number,
    required: true,
  },
  distributionUnit: {
    type: String,
    default: null,
    // The unit in which distribution was made (e.g., "g" when item is stored in "kg")
  },
  baseQuantityDeducted: {
    type: Number,
    default: 0,
    // The actual quantity deducted in the item's base unit (e.g., 0.1 kg when 100g distributed)
  },
  purpose: {
    type: String,
    required: true,
  },
  branch: {
    type: String,
    required: true,
  },
  storeLocation: {
    type: String,
    default: "Main Store",
  },
  distributedBy: {
    type: String,
    required: true,
  },
  distributionDate: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Cancelled'],
    default: 'Completed',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('InventoryDistribution', inventoryDistributionSchema);
