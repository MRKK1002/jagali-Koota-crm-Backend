const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
  {
    businessType: {
      type: String,
      enum: ["restaurant", "construction", "common"],
      required: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },
    invoiceDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    salesOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalesOrder",
    },
    deliveryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Delivery",
    },
    customer: {
      type: String,
      required: true,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    billingAddress: {
      type: String,
      required: true,
    },
    shippingAddress: {
      type: String,
    },
    items: [
      {
        productName: {
          type: String,
          required: true,
        },
        description: String,
        quantity: {
          type: Number,
          required: true,
          min: 0,
        },
        unit: {
          type: String,
          default: "pcs",
        },
        unitPrice: {
          type: Number,
          required: true,
          min: 0,
        },
        discount: {
          type: Number,
          default: 0,
          min: 0,
        },
        taxRate: {
          type: Number,
          default: 0,
          min: 0,
        },
        taxAmount: {
          type: Number,
          default: 0,
        },
        total: {
          type: Number,
          required: true,
        },
      },
    ],
    subtotal: {
      type: Number,
      required: true,
      default: 0,
    },
    totalDiscount: {
      type: Number,
      default: 0,
    },
    totalTax: {
      type: Number,
      default: 0,
    },
    shippingCharges: {
      type: Number,
      default: 0,
    },
    adjustments: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    balanceAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["Draft", "Sent", "Viewed", "Partial", "Paid", "Overdue", "Cancelled", "Refunded"],
      default: "Draft",
    },
    paymentStatus: {
      type: String,
      enum: ["Unpaid", "Partial", "Paid", "Overdue"],
      default: "Unpaid",
    },
    paymentTerms: {
      type: String,
    },
    paymentMethod: {
      type: String,
      enum: ["Cash", "Credit Card", "Debit Card", "Bank Transfer", "Cheque", "UPI", "Other"],
    },
    notes: {
      type: String,
    },
    termsAndConditions: {
      type: String,
    },
    sentDate: {
      type: Date,
    },
    viewedDate: {
      type: Date,
    },
    paidDate: {
      type: Date,
    },
    taxDetails: {
      cgst: { type: Number, default: 0 },
      sgst: { type: Number, default: 0 },
      igst: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
invoiceSchema.index({ businessType: 1, status: 1 });
// invoiceNumber index is automatically created by unique: true constraint
invoiceSchema.index({ customer: 1 });
invoiceSchema.index({ invoiceDate: -1 });
invoiceSchema.index({ dueDate: 1 });

module.exports = mongoose.models.Invoice || mongoose.model("Invoice", invoiceSchema);
