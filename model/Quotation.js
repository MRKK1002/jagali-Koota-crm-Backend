const mongoose = require("mongoose");

const quotationSchema = new mongoose.Schema(
  {
    quotationNumber: {
      type: String,
      unique: true,
      required: true,
    },
    purchaseRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseRequest",
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
    deliveryTime: {
      type: String,
      required: true, // e.g., "7 days", "2 weeks"
    },
    paymentTerms: {
      type: String,
      required: true,
    },
    validityDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Submitted", "Under Review", "Selected", "Rejected"],
      default: "Pending",
    },
    submittedDate: {
      type: Date,
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
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: false, // Made optional
    },
  },
  {
    timestamps: true,
  }
);

// Calculate totals before saving
quotationSchema.pre("save", function (next) {
  this.totalAmount = this.quantity * this.ratePerUnit;
  this.gstAmount = (this.totalAmount * this.gstPercentage) / 100;
  this.grandTotal = this.totalAmount + this.gstAmount;
  next();
});

module.exports = mongoose.models.Quotation || mongoose.model("Quotation", quotationSchema);
