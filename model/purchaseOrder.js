const mongoose = require("mongoose");

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: {
      type: String,
      unique: true,
      required: true,
    },
    purchaseRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseRequest",
      required: true,
    },
    quotationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quotation",
      required: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
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
    ratePerUnit: {
      type: Number,
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    gstPercentage: {
      type: Number,
      default: 18,
    },
    gstAmount: {
      type: Number,
    },
    grandTotal: {
      type: Number,
      required: true,
    },
    deliveryDate: {
      type: Date,
      required: true,
    },
    deliveryAddress: {
      type: String,
      required: true,
    },
    paymentTerms: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "Draft",
        "Pending Approval",
        "Approved",
        "Rejected",
        "Sent to Vendor",
        "Acknowledged",
        "In Transit",
        "Partially Received",
        "Completed",
        "Cancelled",
      ],
      default: "Draft",
    },
    requiresApproval: {
      type: Boolean,
      default: false,
    },
    approvalThreshold: {
      type: Number,
      default: 100000, // Default threshold: ₹1,00,000
    },
    poDate: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: false, // Made optional
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    approvalDate: {
      type: Date,
    },
    approvedAt: {
      type: Date,
    },
    approvalRemarks: {
      type: String,
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    rejectedAt: {
      type: Date,
    },
    rejectionRemarks: {
      type: String,
    },
    completedAt: {
      type: Date,
    },
    closureRemarks: {
      type: String,
    },
    sentToVendorDate: {
      type: Date,
    },
    acknowledgedDate: {
      type: Date,
    },
    termsAndConditions: {
      type: String,
    },
    remarks: {
      type: String,
    },
    attachments: [
      {
        fileName: String,
        fileUrl: String,
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

module.exports = mongoose.models.PurchaseOrder || mongoose.model("PurchaseOrder", purchaseOrderSchema);
