const mongoose = require('mongoose');

const indentRequestSchema = new mongoose.Schema({
  material: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  unit: {
    type: String, 
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'delivered', 'rejected'],
    default: 'pending'
  },
  urgency: {
    type: String,
    enum: ['normal', 'urgent', 'critical'],
    required: true
  },
  phase: {
    type: String,
    required: true
  },
  notes: {
    type: String,
    default: ''
  },
  requested: {
    type: Date,
    default: Date.now
  },
  requestedBy: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('IndentRequest', indentRequestSchema);const mongoose = require("mongoose")


const inventoryItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Item name is required"],
    trim: true
  },
  category: {
    type: String,
    required: [true, "Category is required"],
    enum: ["Kitchen", "Bar", "Housekeeping", "Maintenance", "Office", "Other"]
  },
  quantity: {
    type: Number,
    required: [true, "Quantity is required"],
    min: 0
  },
  unit: {
    type: String,
    required: [true, "Unit is required"],
    enum: ["pieces", "kg", "liters", "packets", "boxes"]
  },
  minStockLevel: {
    type: Number,
    required: [true, "Minimum stock level is required"],
    min: 0
  },
  price: {
    type: Number,
    required: [true, "Price is required"],
    min: 0
  },
  supplier: {
    type: String,
    required: [true, "Supplier name is required"]
  },
  location: {
    type: String,
    required: [true, "Storage location is required"]
  },
  status: {
    type: String,
    enum: ["In Stock", "Low Stock", "Out of Stock"],
    default: "In Stock"
  }
}, {
  timestamps: true
})

module.exports = mongoose.model("InventoryItem", inventoryItemSchema);
 const mongoose = require("mongoose")

// Location Inventory Schema - tracks raw materials at specific locations
const locationInventorySchema = new mongoose.Schema(
  {
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StoreLocation",
      required: true,
    },
    rawMaterialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RawMaterial",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    costPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    expiryDate: {
      type: Date,
    },
    batchNumber: {
      type: String,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
)

// Stock Transaction Schema - tracks all stock movements
const stockTransactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["inward", "outward", "transfer", "adjustment"],
      required: true,
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StoreLocation",
      required: true,
    },
    rawMaterialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RawMaterial",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    costPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    reference: {
      type: String,
      required: true,
    },
    source: {
      type: String, // Supplier name, recipe name, etc.
    },
    destination: {
      type: String, // For transfers or outward movements
    },
    expiryDate: {
      type: Date,
    },
    batchNumber: {
      type: String,
    },
    notes: {
      type: String,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
)

// Compound indexes for better performance
locationInventorySchema.index({ locationId: 1, rawMaterialId: 1 }, { unique: true })
stockTransactionSchema.index({ locationId: 1, rawMaterialId: 1, createdAt: -1 })

module.exports = {
  LocationInventory: mongoose.model("LocationInventory", locationInventorySchema),
  StockTransaction: mongoose.model("StockTransaction", stockTransactionSchema),
}