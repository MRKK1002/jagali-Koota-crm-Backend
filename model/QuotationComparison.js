const mongoose = require("mongoose");

const quotationComparisonSchema = new mongoose.Schema(
  {
    comparisonNumber: {
      type: String,
      unique: true,
      required: true,
    },
    purchaseRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseRequest",
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
    quotations: [
      {
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
        ratePerUnit: Number,
        totalAmount: Number,
        grandTotal: Number,
        deliveryTime: String,
        paymentTerms: String,
        isSelected: {
          type: Boolean,
          default: false,
        },
      },
    ],
    selectedQuotationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quotation",
    },
    selectedVendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
    },
    selectionReason: {
      type: String,
    },
    status: {
      type: String,
      enum: ["Draft", "Under Review", "Approved", "Rejected"],
      default: "Draft",
    },
    comparedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    approvalDate: {
      type: Date,
    },
    approvalRemarks: {
      type: String,
    },
    requiresAdminApproval: {
      type: Boolean,
      default: false,
    },
    valueThreshold: {
      type: Number,
      default: 100000, // If total > 1 lakh, needs admin approval
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.QuotationComparison || mongoose.model("QuotationComparison", quotationComparisonSchema);
