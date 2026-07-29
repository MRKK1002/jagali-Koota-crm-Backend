const mongoose = require("mongoose");

const stockInwardSchema = new mongoose.Schema(
  {
    referenceNumber: {
      type: String,
      required: false,
      unique: true,
    },
    type: {
      type: String,
      default: "inward",
      enum: ["inward"],
    },
    rawMaterialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RawMaterial",
      required: false,
    },
    // materialName: {
    //   type: String,
    //   required: true,
    // },
    unit: {
      type: String,
      required: false,
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StoreLocation",
      required: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ResSupplier",
    },
    // supplier: {
    //   type: String,
    //   default: "Unknown Supplier",
    // },
    quantity: {
      type: Number,
      required: true,
      min: 0.01,
    },
    costPrice: {
      type: Number,
      required: true,
      min: 0.01,
    },
    totalValue: {
      type: Number,
      required: true,
    },
    expiryDate: Date,
    batchNumber: String,
    notes: String,
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    requestedBy: String,
    requestedDate: {
      type: Date,
      default: Date.now,
    },
    approvedBy: String,
    approvedAt: Date,
    approvalNotes: String,
    processed: {
      type: Boolean,
      default: false,
    },
    processedAt: Date,
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StockTransaction",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
stockInwardSchema.index({ status: 1, processed: 1 });
// stockInwardRequestSchema.index({ referenceNumber: 1 });
stockInwardSchema.index({ createdAt: -1 });

// Prevent model overwrite error
module.exports = mongoose.models.StockInward || mongoose.model("StockInward", stockInwardSchema);
