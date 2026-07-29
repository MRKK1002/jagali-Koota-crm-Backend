const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    businessType: {
      type: String,
      enum: ["restaurant", "construction", "common"],
      required: true,
    },
    paymentNumber: {
      type: String,
      required: true,
      unique: true,
    },
    paymentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      required: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
    },
    customer: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ["Cash", "Credit Card", "Debit Card", "Bank Transfer", "Cheque", "UPI", "Net Banking", "Other"],
    },
    paymentType: {
      type: String,
      enum: ["Full", "Partial", "Advance"],
      default: "Full",
    },
    transactionId: {
      type: String,
      trim: true,
    },
    referenceNumber: {
      type: String,
      trim: true,
    },
    bankName: {
      type: String,
      trim: true,
    },
    chequeNumber: {
      type: String,
      trim: true,
    },
    chequeDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["Pending", "Completed", "Failed", "Refunded", "Cancelled"],
      default: "Completed",
    },
    notes: {
      type: String,
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubAdmin",
    },
    receiptIssued: {
      type: Boolean,
      default: false,
    },
    receiptNumber: {
      type: String,
    },
    accountPosted: {
      type: Boolean,
      default: false,
    },
    ledgerEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ledger",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
paymentSchema.index({ businessType: 1, status: 1 });
// paymentNumber index is automatically created by unique: true constraint
paymentSchema.index({ invoiceNumber: 1 });
paymentSchema.index({ customer: 1 });
paymentSchema.index({ paymentDate: -1 });

module.exports = mongoose.models.Payment || mongoose.model("Payment", paymentSchema);
