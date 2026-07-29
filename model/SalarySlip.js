const mongoose = require("mongoose");

const salarySlipSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmployeeRegistration",
      required: true,
    },
    employeeId: {
      type: String,
      required: true,
    },
    employeeName: {
      type: String,
      required: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
    },

    // Salary Components
    basicSalary: {
      type: Number,
      required: true,
      default: 0,
    },
    salaryType: {
      type: String,
      enum: ["fixed", "daily", "hourly"],
      default: "fixed",
    },

    // Allowances
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
    overtimeAmount: {
      type: Number,
      default: 0,
    },

    // Deductions
    pf: {
      type: Number,
      default: 0,
    },
    professionalTax: {
      type: Number,
      default: 0,
    },
    tds: {
      type: Number,
      default: 0,
    },
    otherDeductions: {
      type: Number,
      default: 0,
    },

    // Calculated Fields
    grossSalary: {
      type: Number,
      required: true,
    },
    totalDeductions: {
      type: Number,
      required: true,
    },
    netSalary: {
      type: Number,
      required: true,
    },

    // Attendance Data
    workingDays: {
      type: Number,
      default: 26,
    },
    daysWorked: {
      type: Number,
      default: 0,
    },
    daysAbsent: {
      type: Number,
      default: 0,
    },
    hoursWorked: {
      type: Number,
      default: 0,
    },
    overtimeHours: {
      type: Number,
      default: 0,
    },
    
    // Leave Information
    sickLeaveDays: {
      type: Number,
      default: 0,
    },
    casualLeaveDays: {
      type: Number,
      default: 0,
    },
    otherLeaveDays: {
      type: Number,
      default: 0,
    },
    totalLeaveDays: {
      type: Number,
      default: 0,
    },
    salaryDeductions: {
      type: Number,
      default: 0,
    },

    // Status
    status: {
      type: String,
      enum: ["generated", "paid", "pending"],
      default: "generated",
    },

    // Bank Details (copied from employee at time of generation)
    bankName: String,
    accountNumber: String,
    ifscCode: String,
    branch: String,

    // Generation Info
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },

    // Payment Info
    paidAt: Date,
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    paymentMethod: String,
    paymentReference: String,

    // PDF Info
    pdfPath: String,
    pdfGenerated: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to calculate totals
salarySlipSchema.pre("save", function (next) {
  // Calculate gross salary
  this.grossSalary =
    this.basicSalary +
    this.hra +
    this.conveyance +
    this.medicalAllowance +
    this.specialAllowance +
    this.overtimeAmount;

  // Calculate total deductions
  this.totalDeductions =
    this.pf + this.professionalTax + this.tds + this.otherDeductions;

  // Calculate net salary
  this.netSalary = Math.max(0, this.grossSalary - this.totalDeductions);

  next();
});

// Compound index to ensure one salary slip per employee per month/year
salarySlipSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });
salarySlipSchema.index({ employeeId: 1, month: 1, year: 1 });
salarySlipSchema.index({ month: 1, year: 1 });
salarySlipSchema.index({ status: 1 });

module.exports = mongoose.models.SalarySlip || mongoose.model("SalarySlip", salarySlipSchema);
