const mongoose = require("mongoose");

const purchaseRequestSchema = new mongoose.Schema(
  {
    prNumber: {
      type: String,
      unique: true,
      required: true,
    },
    indentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Indent",
      required: true,
    },
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: true,
    },
    materialName: {
      type: String,
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
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
    },
    requiredBy: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "Pending Quotation",
        "Quotation Sent",
        "Quotation Received",
        "Quotation Approved",
        "PO Created",
        "Completed",
        "Cancelled",
      ],
      default: "Pending Quotation",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: false, // Made optional for now
    },
    remarks: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.PurchaseRequest || mongoose.model("PurchaseRequest", purchaseRequestSchema);
