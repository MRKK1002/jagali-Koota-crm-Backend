const mongoose = require("mongoose");

// Location Inventory Schema - tracks stock per location per raw material
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
      default: null,
    },
    batchNumber: {
      type: String,
      default: null,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Stock Transaction Schema - tracks all stock movements
const stockTransactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["inward", "outward", "transfer", "adjustment", "consumed"],
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
      type: String,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    batchNumber: {
      type: String,
      default: null,
    },
    notes: {
      type: String,
      default: null,
    },
    // For transfers
    toLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StoreLocation",
      default: null,
    },
    // For consumption (linked to orders/recipes)
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    recipeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Recipe",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
locationInventorySchema.index({ locationId: 1, rawMaterialId: 1 });
stockTransactionSchema.index({ locationId: 1, createdAt: -1 });
stockTransactionSchema.index({ rawMaterialId: 1, createdAt: -1 });

// Prevent model overwrite errors
const LocationInventory = mongoose.models.LocationInventory || mongoose.model("LocationInventory", locationInventorySchema);
const StockTransaction = mongoose.models.StockTransaction || mongoose.model("StockTransaction", stockTransactionSchema);

module.exports = {
  LocationInventory,
  StockTransaction,
};

