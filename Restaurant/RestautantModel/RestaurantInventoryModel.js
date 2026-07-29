const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema({
  inventoryId: {
    type: String,
    unique: true,
    trim: true
  },
  grnNumber: {
    type: String,
    required: true,
    trim: true
  },
  grnId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GoodsReceiptNote',
    required: true
  },
  productName: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  supplier: {
    type: String,
    required: true,
    trim: true
  },
  supplierGST: {
    type: String,
    trim: true,
    default: ''
  },
  branch: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  availableQuantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  consumedQuantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  basePrice: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  totalValue: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  gstRate: {
    type: Number,
    default: 18,
    min: 0,
    max: 100
  },
  unitOfMeasurement: {
    type: String,
    default: 'pcs',
    trim: true
  },
  storageLocation: {
    type: String,
    default: 'Main Store',
    trim: true
  },
  minStockLevel: {
    type: Number,
    default: 10,
    min: 0
  },
  maxStockLevel: {
    type: Number,
    default: 100,
    min: 0
  },
  createdBy: {
    type: String,
    default: 'GRN System',
    trim: true
  },
  source: {
    type: String,
    default: 'GRN Import',
    trim: true
  },
  status: {
    type: String,
    enum: ['Active', 'Low Stock', 'Out of Stock'],
    default: 'Active'
  }
}, {
  timestamps: true
});

inventoryItemSchema.pre('save', async function(next) {
  if (this.isNew && !this.inventoryId) {
    this.inventoryId = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  }
  next();
});

module.exports = mongoose.models.Inventory || mongoose.model("Inventory", inventoryItemSchema);