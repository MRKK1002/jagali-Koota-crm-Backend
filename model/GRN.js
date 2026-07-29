const mongoose = require("mongoose");

const grnSchema = new mongoose.Schema(
  {
    grnNumber: {
      type: String,
      unique: true,
      required: true,
    },
    poId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      required: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    materialName: {
      type: String,
      required: true,
    },
    orderedQuantity: {
      type: Number,
      required: true,
    },
    receivedQuantity: {
      type: Number,
      required: true,
    },
    acceptedQuantity: {
      type: Number,
      required: true,
    },
    rejectedQuantity: {
      type: Number,
      default: 0,
    },
    unit: {
      type: String,
      required: true,
    },
    receivedDate: {
      type: Date,
      default: Date.now,
    },
    qualityCheck: {
      status: {
        type: String,
        enum: ["Passed", "Failed", "Partial"],
        required: true,
      },
      checkedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        required: false, // Made optional
      },
      checkDate: {
        type: Date,
        default: Date.now,
      },
      remarks: String,
    },
    rejectionReason: {
      type: String,
    },
    vehicleNumber: {
      type: String,
    },
    driverName: {
      type: String,
    },
    driverContact: {
      type: String,
    },
    challanNumber: {
      type: String,
    },
    challanDate: {
      type: Date,
    },
    invoiceNumber: {
      type: String,
    },
    status: {
      type: String,
      enum: ["Pending", "Accepted", "Partially Accepted", "Rejected"],
      default: "Pending",
    },
    warehouse: {
      type: String,
      default: "Central Warehouse",
    },
    stockUpdated: {
      type: Boolean,
      default: false,
    },
    stockTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ConstructionStockTransaction",
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: false, // Made optional
    },
    remarks: {
      type: String,
    },
    photos: [
      {
        url: String,
        caption: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    isDirectPurchase: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.GRN || mongoose.model("GRN", grnSchema);
