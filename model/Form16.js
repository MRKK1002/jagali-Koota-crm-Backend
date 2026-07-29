const mongoose = require("mongoose");

const form16Schema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    employeeDetails: {
      name: { type: String, required: true },
      code: String,
      pan: { type: String, required: true },
      designation: String,
      department: String,
      dateOfJoining: Date,
    },
    businessType: {
      type: String,
      required: true,
      enum: ["restaurant", "construction"],
    },
    financialYear: {
      type: String,
      required: true, // e.g., "2024-25"
    },
    assessmentYear: {
      type: String,
      required: true, // e.g., "2025-26"
    },
    // Employer Details
    employer: {
      name: { type: String, required: true },
      tan: { type: String, required: true },
      pan: String,
      address: String,
    },
    // Period of Employment
    periodOfEmployment: {
      from: { type: Date, required: true },
      to: { type: Date, required: true },
    },
    // Salary Details (Month-wise)
    salaryDetails: [
      {
        month: { type: Number, required: true },
        year: { type: Number, required: true },
        basic: Number,
        hra: Number,
        da: Number,
        otherAllowances: Number,
        gross: Number,
        pfEmployee: Number,
        esi: Number,
        professionalTax: Number,
        tds: Number,
        netSalary: Number,
      },
    ],
    // Part A: Details of Salary Paid
    partA: {
      gross: { type: Number, default: 0 },
      lessAllowances: { type: Number, default: 0 },
      balanceSalary: { type: Number, default: 0 },
      deductions: {
        entertainment: { type: Number, default: 0 },
        tax: { type: Number, default: 0 },
      },
      income: { type: Number, default: 0 },
    },
    // Part B: Details of Tax Deducted
    partB: {
      taxDeducted: [
        {
          quarter: String,
          receiptNumber: String,
          tdsAmount: Number,
          depositDate: Date,
        },
      ],
      totalTDS: { type: Number, default: 0 },
    },
    // Part C: Details of Income and Tax
    partC: {
      // Income Details
      salaryIncome: { type: Number, default: 0 },
      valueOfPerquisites: { type: Number, default: 0 },
      profitsInLieu: { type: Number, default: 0 },
      totalIncome: { type: Number, default: 0 },
      // Deductions under Chapter VI-A
      deductions: {
        section80C: { type: Number, default: 0 },
        section80CCC: { type: Number, default: 0 },
        section80CCD: { type: Number, default: 0 },
        section80D: { type: Number, default: 0 },
        section80DD: { type: Number, default: 0 },
        section80E: { type: Number, default: 0 },
        section80G: { type: Number, default: 0 },
        section80TTA: { type: Number, default: 0 },
        section80U: { type: Number, default: 0 },
        otherSections: { type: Number, default: 0 },
        totalDeductions: { type: Number, default: 0 },
      },
      // Standard Deduction
      standardDeduction: { type: Number, default: 50000 },
      // Taxable Income
      taxableIncome: { type: Number, default: 0 },
      // Tax Calculation
      taxOnIncome: { type: Number, default: 0 },
      surcharge: { type: Number, default: 0 },
      healthEducationCess: { type: Number, default: 0 },
      totalTax: { type: Number, default: 0 },
      // Relief
      reliefUnderSection89: { type: Number, default: 0 },
      // Net Tax Payable
      netTaxPayable: { type: Number, default: 0 },
    },
    // Tax Regime
    taxRegime: {
      type: String,
      enum: ["Old", "New"],
      default: "New",
    },
    // Form Status
    status: {
      type: String,
      enum: ["Draft", "Generated", "Sent", "Downloaded"],
      default: "Draft",
    },
    generatedDate: Date,
    sentDate: Date,
    sentTo: String,
    pdfPath: String,
    // Verification
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubAdmin",
    },
    verifiedDate: Date,
    // Digital Signature
    digitallySignedBy: String,
    signatureDate: Date,
    notes: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubAdmin",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
form16Schema.index({ employee: 1, financialYear: 1 }, { unique: true });
form16Schema.index({ businessType: 1, financialYear: 1 });
form16Schema.index({ status: 1 });

// Method to calculate Part A
form16Schema.methods.calculatePartA = function () {
  // Gross salary
  this.partA.gross = this.salaryDetails.reduce(
    (sum, month) => sum + month.gross,
    0
  );

  // Less: Allowances (exempt)
  // For simplicity, assuming HRA exemption
  const totalHRA = this.salaryDetails.reduce((sum, month) => sum + month.hra, 0);
  this.partA.lessAllowances = totalHRA * 0.4; // 40% exemption (simplified)

  // Balance
  this.partA.balanceSalary = this.partA.gross - this.partA.lessAllowances;

  // Deductions
  this.partA.deductions.entertainment = 0; // Usually 0
  this.partA.deductions.tax = 0; // Professional tax

  // Income under head salary
  this.partA.income =
    this.partA.balanceSalary -
    this.partA.deductions.entertainment -
    this.partA.deductions.tax;
};

// Method to calculate Part B
form16Schema.methods.calculatePartB = function () {
  this.partB.totalTDS = this.salaryDetails.reduce(
    (sum, month) => sum + month.tds,
    0
  );
};

// Method to calculate Part C
form16Schema.methods.calculatePartC = function () {
  // Salary income
  this.partC.salaryIncome = this.partA.income;

  // Total income
  this.partC.totalIncome =
    this.partC.salaryIncome +
    this.partC.valueOfPerquisites +
    this.partC.profitsInLieu;

  // Calculate total deductions
  this.partC.deductions.totalDeductions =
    this.partC.deductions.section80C +
    this.partC.deductions.section80CCC +
    this.partC.deductions.section80CCD +
    this.partC.deductions.section80D +
    this.partC.deductions.section80DD +
    this.partC.deductions.section80E +
    this.partC.deductions.section80G +
    this.partC.deductions.section80TTA +
    this.partC.deductions.section80U +
    this.partC.deductions.otherSections;

  // Taxable income
  this.partC.taxableIncome = Math.max(
    0,
    this.partC.totalIncome -
      this.partC.standardDeduction -
      this.partC.deductions.totalDeductions
  );

  // Calculate tax
  this.calculateTax();

  // Net tax payable
  this.partC.netTaxPayable = Math.max(
    0,
    this.partC.totalTax - this.partC.reliefUnderSection89
  );
};

// Method to calculate income tax
form16Schema.methods.calculateTax = function () {
  const taxableIncome = this.partC.taxableIncome;
  let tax = 0;

  if (this.taxRegime === "New") {
    // New Tax Regime (FY 2024-25)
    if (taxableIncome <= 300000) {
      tax = 0;
    } else if (taxableIncome <= 600000) {
      tax = (taxableIncome - 300000) * 0.05;
    } else if (taxableIncome <= 900000) {
      tax = 15000 + (taxableIncome - 600000) * 0.1;
    } else if (taxableIncome <= 1200000) {
      tax = 45000 + (taxableIncome - 900000) * 0.15;
    } else if (taxableIncome <= 1500000) {
      tax = 90000 + (taxableIncome - 1200000) * 0.2;
    } else {
      tax = 150000 + (taxableIncome - 1500000) * 0.3;
    }

    // Standard deduction of ₹25,000 in new regime
    tax = Math.max(0, tax - 25000);
  } else {
    // Old Tax Regime
    if (taxableIncome <= 250000) {
      tax = 0;
    } else if (taxableIncome <= 500000) {
      tax = (taxableIncome - 250000) * 0.05;
    } else if (taxableIncome <= 1000000) {
      tax = 12500 + (taxableIncome - 500000) * 0.2;
    } else {
      tax = 112500 + (taxableIncome - 1000000) * 0.3;
    }
  }

  this.partC.taxOnIncome = Math.round(tax);

  // Surcharge
  if (taxableIncome > 5000000 && taxableIncome <= 10000000) {
    this.partC.surcharge = Math.round(tax * 0.1); // 10%
  } else if (taxableIncome > 10000000) {
    this.partC.surcharge = Math.round(tax * 0.15); // 15%
  }

  // Health & Education Cess: 4%
  this.partC.healthEducationCess = Math.round(
    (this.partC.taxOnIncome + this.partC.surcharge) * 0.04
  );

  // Total tax
  this.partC.totalTax =
    this.partC.taxOnIncome +
    this.partC.surcharge +
    this.partC.healthEducationCess;
};

// Method to generate Form 16
form16Schema.methods.generate = async function () {
  this.calculatePartA();
  this.calculatePartB();
  this.calculatePartC();

  this.status = "Generated";
  this.generatedDate = new Date();

  await this.save();
  return this;
};

// Static method to get all Form 16 for FY
form16Schema.statics.getAllForFinancialYear = async function (
  businessType,
  financialYear
) {
  return await this.find({ businessType, financialYear })
    .populate("employee", "name code pan")
    .sort({ "employeeDetails.name": 1 });
};

module.exports = mongoose.model("Form16", form16Schema);


