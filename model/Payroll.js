const mongoose = require("mongoose");

const PayrollSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    month: {
      type: String, // Format: YYYY-MM
      required: true,
    },
    daysPresent: {
      type: Number,
      default: 0,
    },
    daysAbsent: {
      type: Number,
      default: 0,
    },
    halfDays: {
      type: Number,
      default: 0,
    },
    // Earnings
    basicSalary: {
      type: Number,
      default: 0,
    },
    hra: {
      type: Number,
      default: 0,
    },
    conveyance: {
      type: Number,
      default: 0,
    },
    medicalAllowance: {
      type: Number,
      default: 0,
    },
    specialAllowance: {
      type: Number,
      default: 0,
    },
    grossSalary: {
      type: Number,
      default: 0,
    },
    // Deductions
    pfDeduction: {
      type: Number,
      default: 0,
    },
    professionalTax: {
      type: Number,
      default: 0,
    },
    taxDeduction: {
      type: Number,
      default: 0,
    },
    otherDeductions: {
      type: Number,
      default: 0,
    },
    totalDeductions: {
      type: Number,
      default: 0,
    },
    // Net Salary
    netSalary: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["pending", "processed", "paid"],
      default: "pending",
    },
    paymentDate: {
      type: Date,
    },
    paymentMethod: {
      type: String,
      enum: ["bank_transfer", "cash", "cheque"],
    },
  },
  { timestamps: true }
);

// Create compound index for employee and month
PayrollSchema.index({ employeeId: 1, month: 1 }, { unique: true });

module.exports = mongoose.models.Payroll || mongoose.model("Payroll", PayrollSchema);
