const mongoose = require("mongoose");

const stockTransactionSchema = new mongoose.Schema(
  {
    transactionNumber: {
      type: String,
      unique: true,
      required: true,
    },
    transactionType: {
      type: String,
      enum: ["Stock In", "Stock Out"],
      required: true,
    },
    materialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    unit: {
      type: String,
      required: true,
    },
    // For Stock In
    grnId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GRN",
    },
    rate: {
      type: Number,
    },
    // For Stock Out
    indentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Indent",
    },
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
    },
    issuedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    // Common fields
    transactionDate: {
      type: Date,
      default: Date.now,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: false, // Made optional
    },
    remarks: {
      type: String,
    },
    balanceAfterTransaction: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Use a unique model name to avoid conflicts with hotel inventory StockTransaction
module.exports = mongoose.models.ConstructionStockTransaction || mongoose.model("ConstructionStockTransaction", stockTransactionSchema);
