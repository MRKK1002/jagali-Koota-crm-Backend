// const mongoose = require('mongoose');

// const majorExpenseSchema = new mongoose.Schema({
//   type: {
//     type: String,
//     required: [true, 'Expense type is required'],
//     enum: ['Fuel', 'Vehicle Maintenance', 'Rent', 'Utilities', 'Equipment', 'Insurance'],
//   },
//   amount: {
//     type: Number,
//     required: [true, 'Amount is required'],
//     min: [0, 'Amount cannot be negative'],
//   },
//   description: {
//     type: String,
//     required: [true, 'Description is required'],
//   },
//   paymentMethod: {
//     type: String,
//     required: [true, 'Payment method is required'],
//     enum: ['cash', 'bank'],
//   },
//   date: {
//     type: Date,
//     default: Date.now,
//   },
//   status: {
//     type: String,
//     enum: ['pending', 'approved', 'rejected', 'paid'],
//     default: 'pending',
//   },
//   site: {
//     type: String,
//     required: [true, 'Site is required'],
//   },
//   createdBy: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true,
//   },
//   projectId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Project',
//   },
//   siteId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Site',
//   },
//   approvedBy: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//   },
// }, { timestamps: true });

// // No duplicate index
// // e.g., don't do both `index: true` and schema.index()

// module.exports = mongoose.model('MajorExpense', majorExpenseSchema);

const mongoose = require("mongoose");

const majorExpenseSchema = new mongoose.Schema(
  {
    expenseNumber: {
      type: String,
      unique: true,
      required: true,
    },
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: true,
    },
    type: {
      type: String,
      required: [true, "Expense type is required"],
      enum: [
        "Fuel",
        "Vehicle Maintenance",
        "Rent",
        "Utilities",
        "Equipment",
        "Insurance",
        "Other",
      ],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    vendor: {
      type: String,
      trim: true,
    },
    billNumber: {
      type: String,
      trim: true,
    },
    billDate: {
      type: Date,
    },
    paymentMethod: {
      type: String,
      required: [true, "Payment method is required"],
      enum: ["Cash", "Bank Transfer", "Cheque", "UPI"],
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Partially Paid"],
      default: "Pending",
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentDate: {
      type: Date,
    },
    bankDetails: {
      bankName: String,
      accountNumber: String,
      transactionId: String,
    },
    receiptImages: [
      {
        type: String, // Cloudinary URLs
      },
    ],
    date: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Paid"],
      default: "Pending",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: false, // Made optional for now
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    approvalDate: {
      type: Date,
    },
    rejectionReason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
majorExpenseSchema.index({ siteId: 1, status: 1 });
// expenseNumber index is automatically created by unique: true constraint
majorExpenseSchema.index({ createdAt: -1 });

module.exports = mongoose.models.MajorExpense || mongoose.model("MajorExpense", majorExpenseSchema);
