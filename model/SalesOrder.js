const mongoose = require("mongoose");

const salesOrderSchema = new mongoose.Schema(
  {
    businessType: {
      type: String,
      enum: ["restaurant", "construction", "common"],
      required: true,
    },
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    quotationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quotation",
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
      required: true,
    },
    orderDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expectedDeliveryDate: {
      type: Date,
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
        tax: {
          type: Number,
          default: 0,
          min: 0,
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
    totalAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["Draft", "Confirmed", "Processing", "Ready for Delivery", "Completed", "Cancelled"],
      default: "Draft",
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Partial", "Paid", "Overdue"],
      default: "Pending",
    },
    paymentTerms: {
      type: String,
    },
    notes: {
      type: String,
    },
    termsAndConditions: {
      type: String,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubAdmin",
    },
    approvedDate: {
      type: Date,
    },
    stockReserved: {
      type: Boolean,
      default: false,
    },
    convertedToDelivery: {
      type: Boolean,
      default: false,
    },
    deliveryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Delivery",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
salesOrderSchema.index({ businessType: 1, status: 1 });
// orderNumber index is automatically created by unique: true constraint
salesOrderSchema.index({ customer: 1 });
salesOrderSchema.index({ orderDate: -1 });

module.exports = mongoose.models.SalesOrder || mongoose.model("SalesOrder", salesOrderSchema);
