const mongoose = require("mongoose");

const stockSchema = new mongoose.Schema(
  {
    rawMaterial: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Material",
      required: true,
    },
    totalQuantityPurchased: { type: Number, default: 0 },
    remainingStock: { type: Number, default: 0 },
    minLevel: { type: Number, default: 0 },
    status: { type: String, enum: ["OK", "LOW", "OUT"], default: "OK" },
    totalValue: { type: Number, default: 0 },
    avgPrice: { type: Number, default: 0 },

    // Histories
    stockLocationHistory: [
      {
        location: String,
        quantity: Number,
        date: { type: Date, default: Date.now },
      },
    ],
    purchaseHistory: [
      {
        purchaseOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseOrder" },
        supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "ResSupplier" },
        supplierName: { type: String }, // temporary supplier name if not in DB
        quantity: Number,
        rate: Number,
        total: Number,
        date: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("ResStock", stockSchema);
