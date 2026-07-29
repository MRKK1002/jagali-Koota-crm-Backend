const mongoose = require("mongoose")

const procurementPaymentSchema = new mongoose.Schema(
  {
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProcurementInvoice",
      required: [true, "Invoice reference is required"],
    },
    invoiceNo: {
      type: String,
      required: [true, "Invoice number is required"],
    },
    vendor: {
      type: String, // Keep as String
      required: [true, "Vendor is required"],
    },
    vendorName: {
      type: String,
      required: [true, "Vendor name is required"],
    },
    amount: {
      type: Number,
      required: [true, "Payment amount is required"],
      min: [0.01, "Amount must be greater than 0"],
    },
    currency: {
      type: String,
      default: "USD",
      enum: ["USD", "EUR", "GBP", "INR"],
    },
    paymentDate: {
      type: Date,
      required: [true, "Payment date is required"],
    },
    paymentMethod: {
      type: String,
      required: [true, "Payment method is required"],
      enum: ["bank_transfer", "check", "credit_card", "cash", "ach", "wire_transfer"],
    },
    referenceNumber: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "cancelled"],
      default: "pending",
    },
    scheduledDate: {
      type: Date,
    },
    notes: {
      type: String,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
    },
    bankDetails: {
      accountNumber: String,
      routingNumber: String,
      bankName: String,
    },
    attachments: [
      {
        filename: String,
        originalName: String,
        path: String,
        size: Number,
        uploadDate: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Made optional
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Made optional
    },
    approvalDate: Date,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Made optional
    },
  },
  {
    timestamps: true,
  },
)

// Indexes for better performance
procurementPaymentSchema.index({ invoice: 1 })
procurementPaymentSchema.index({ vendor: 1, status: 1 })
procurementPaymentSchema.index({ paymentDate: 1 })
procurementPaymentSchema.index({ status: 1, createdAt: -1 })
procurementPaymentSchema.index({ scheduledDate: 1, status: 1 })

module.exports = mongoose.model("ProcurementPayment", procurementPaymentSchema)
