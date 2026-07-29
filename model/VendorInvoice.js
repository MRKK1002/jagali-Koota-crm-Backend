const mongoose = require("mongoose");

const vendorInvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      unique: true,
      required: true,
    },
    vendorInvoiceNumber: {
      type: String,
      required: true,
    },
    poId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      required: true,
    },
    grnId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GRN",
      required: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    invoiceDate: {
      type: Date,
      required: true,
    },
    dueDate: {
      type: Date,
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
    tdsPercentage: {
      type: Number,
      default: 2,
    },
    tdsAmount: {
      type: Number,
    },
    otherCharges: {
      type: Number,
      default: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
    },
    netPayable: {
      type: Number,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Partial", "Paid", "Overdue"],
      default: "Pending",
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    balanceAmount: {
      type: Number,
    },
    paymentHistory: [
      {
        paymentDate: Date,
        amount: Number,
        paymentMode: {
          type: String,
          enum: ["Cash", "Cheque", "NEFT", "RTGS", "UPI", "Other"],
        },
        transactionReference: String,
        paidBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Employee",
        },
        remarks: String,
      },
    ],
    enteredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: false, // Made optional
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    verificationDate: {
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
  },
  {
    timestamps: true,
  }
);

// Calculate balance before saving
vendorInvoiceSchema.pre("save", function (next) {
  this.balanceAmount = this.netPayable - this.paidAmount;
  
  // Update payment status based on balance
  if (this.paidAmount === 0) {
    this.paymentStatus = "Pending";
  } else if (this.paidAmount >= this.netPayable) {
    this.paymentStatus = "Paid";
  } else {
    this.paymentStatus = "Partial";
  }
  
  // Check if overdue
  if (this.balanceAmount > 0 && new Date() > this.dueDate) {
    this.paymentStatus = "Overdue";
  }
  
  next();
});

module.exports = mongoose.models.VendorInvoice || mongoose.model("VendorInvoice", vendorInvoiceSchema);
