const mongoose = require("mongoose");

const deliverySchema = new mongoose.Schema(
  {
    businessType: {
      type: String,
      enum: ["restaurant", "construction", "common"],
      required: true,
    },
    deliveryNumber: {
      type: String,
      required: true,
      unique: true,
    },
    salesOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalesOrder",
      required: true,
    },
    orderNumber: {
      type: String,
      required: true,
    },
    customer: {
      type: String,
      required: true,
      trim: true,
    },
    deliveryAddress: {
      type: String,
      required: true,
    },
    deliveryDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expectedDeliveryTime: {
      type: String,
    },
    items: [
      {
        productName: {
          type: String,
          required: true,
        },
        orderedQuantity: {
          type: Number,
          required: true,
        },
        deliveredQuantity: {
          type: Number,
          required: true,
        },
        unit: {
          type: String,
          default: "pcs",
        },
        batchNumber: String,
        serialNumbers: [String],
      },
    ],
    status: {
      type: String,
      enum: ["Scheduled", "In Transit", "Delivered", "Failed", "Returned", "Cancelled"],
      default: "Scheduled",
    },
    vehicleNumber: {
      type: String,
      trim: true,
    },
    driverName: {
      type: String,
      trim: true,
    },
    driverPhone: {
      type: String,
      trim: true,
    },
    trackingNumber: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
    },
    deliveredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubAdmin",
    },
    deliveredAt: {
      type: Date,
    },
    receivedBy: {
      type: String,
      trim: true,
    },
    receivedSignature: {
      type: String, // URL or base64 string
    },
    proofOfDelivery: {
      type: String, // URL to document
    },
    convertedToInvoice: {
      type: Boolean,
      default: false,
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
deliverySchema.index({ businessType: 1, status: 1 });
// deliveryNumber index is automatically created by unique: true constraint
deliverySchema.index({ orderNumber: 1 });
deliverySchema.index({ deliveryDate: -1 });

module.exports = mongoose.models.Delivery || mongoose.model("Delivery", deliverySchema);
