const mongoose = require("mongoose");

const vendorPaymentSchema = new mongoose.Schema(
  {
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VendorInvoice",
      required: [true, "Invoice reference is required"],
    },
    amount: {
      type: Number,
      required: [true, "Payment amount is required"],
      min: [0.01, "Amount must be greater than 0"],
    },
    paymentDate: {
      type: Date,
      required: [true, "Payment date is required"],
    },
    paymentMethod: {
      type: String,
      required: [true, "Payment method is required"],
      enum: ["bank_transfer", "cheque", "cash", "online"],
      default: "bank_transfer",
    },
    referenceNumber: {
      type: String,
      trim: true,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "scheduled", "completed", "failed", "cancelled"],
      default: "scheduled",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
vendorPaymentSchema.index({ invoiceId: 1 });
vendorPaymentSchema.index({ paymentDate: 1 });
vendorPaymentSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("VendorPayment", vendorPaymentSchema);





