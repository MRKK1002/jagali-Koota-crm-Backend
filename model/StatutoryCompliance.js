const mongoose = require("mongoose");

const statutoryComplianceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    employeeName: {
      type: String,
      required: true,
    },
    employeeCode: String,
    businessType: {
      type: String,
      required: true,
      enum: ["restaurant", "construction"],
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
    financialYear: {
      type: String,
      required: true,
    },
    // Salary Components
    salary: {
      basic: {
        type: Number,
        required: true,
        default: 0,
      },
      hra: {
        type: Number,
        default: 0,
      },
      da: {
        type: Number,
        default: 0,
      },
      conveyance: {
        type: Number,
        default: 0,
      },
      specialAllowance: {
        type: Number,
        default: 0,
      },
      otherAllowances: {
        type: Number,
        default: 0,
      },
      gross: {
        type: Number,
        required: true,
      },
    },
    // Provident Fund (PF)
    pf: {
      applicable: {
        type: Boolean,
        default: true,
      },
      pfNumber: String,
      uanNumber: String,
      employeeContribution: {
        type: Number,
        default: 0,
      },
      employerContribution: {
        type: Number,
        default: 0,
      },
      employeeContributionRate: {
        type: Number,
        default: 12, // 12%
      },
      employerContributionRate: {
        type: Number,
        default: 12, // 12% (3.67% to PF + 8.33% to Pension)
      },
      pfContribution: {
        type: Number,
        default: 0, // 3.67% to PF
      },
      pensionContribution: {
        type: Number,
        default: 0, // 8.33% to Pension (max ₹1,250)
      },
      adminCharges: {
        type: Number,
        default: 0, // 0.5% of basic
      },
      edliCharges: {
        type: Number,
        default: 0, // 0.5% of basic
      },
      total: {
        type: Number,
        default: 0,
      },
    },
    // Employee State Insurance (ESI)
    esi: {
      applicable: {
        type: Boolean,
        default: false,
      },
      esiNumber: String,
      employeeContribution: {
        type: Number,
        default: 0,
      },
      employerContribution: {
        type: Number,
        default: 0,
      },
      employeeContributionRate: {
        type: Number,
        default: 0.75, // 0.75%
      },
      employerContributionRate: {
        type: Number,
        default: 3.25, // 3.25%
      },
      total: {
        type: Number,
        default: 0,
      },
    },
    // Professional Tax (PT)
    professionalTax: {
      applicable: {
        type: Boolean,
        default: true,
      },
      amount: {
        type: Number,
        default: 0,
      },
      state: {
        type: String,
        default: "Maharashtra",
      },
    },
    // Tax Deducted at Source (TDS)
    tds: {
      applicable: {
        type: Boolean,
        default: false,
      },
      panNumber: String,
      taxRegime: {
        type: String,
        enum: ["Old", "New"],
        default: "New",
      },
      grossAnnualIncome: {
        type: Number,
        default: 0,
      },
      standardDeduction: {
        type: Number,
        default: 50000,
      },
      section80C: {
        type: Number,
        default: 0,
      },
      section80D: {
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
      taxableIncome: {
        type: Number,
        default: 0,
      },
      incomeTax: {
        type: Number,
        default: 0,
      },
      surcharge: {
        type: Number,
        default: 0,
      },
      cess: {
        type: Number,
        default: 0,
      },
      monthlyTDS: {
        type: Number,
        default: 0,
      },
      yearlyTDS: {
        type: Number,
        default: 0,
      },
    },
    // Labour Welfare Fund (LWF)
    lwf: {
      applicable: {
        type: Boolean,
        default: false,
      },
      employeeContribution: {
        type: Number,
        default: 0,
      },
      employerContribution: {
        type: Number,
        default: 0,
      },
    },
    // Total Deductions
    totalDeductions: {
      type: Number,
      default: 0,
    },
    // Net Salary
    netSalary: {
      type: Number,
      default: 0,
    },
    // Compliance Status
    pfChallanGenerated: {
      type: Boolean,
      default: false,
    },
    pfChallanNumber: String,
    pfPaidDate: Date,
    esiChallanGenerated: {
      type: Boolean,
      default: false,
    },
    esiChallanNumber: String,
    esiPaidDate: Date,
    ptPaidDate: Date,
    tdsPaidDate: Date,
    // Form 16 Generation
    form16Generated: {
      type: Boolean,
      default: false,
    },
    form16GeneratedDate: Date,
    form16Path: String,
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
statutoryComplianceSchema.index({ employee: 1, month: 1, year: 1 });
statutoryComplianceSchema.index({ businessType: 1, financialYear: 1 });
statutoryComplianceSchema.index({ month: 1, year: 1 });

// Method to calculate PF
statutoryComplianceSchema.methods.calculatePF = function () {
  if (!this.pf.applicable) {
    this.pf.employeeContribution = 0;
    this.pf.employerContribution = 0;
    this.pf.total = 0;
    return;
  }

  // PF is calculated on Basic + DA
  const pfWages = this.salary.basic + this.salary.da;

  // Employee contribution: 12% of PF wages (capped at ₹15,000)
  const cappedWages = Math.min(pfWages, 15000);
  this.pf.employeeContribution = Math.round(
    (cappedWages * this.pf.employeeContributionRate) / 100
  );

  // Employer contribution breakdown:
  // 3.67% to EPF (capped)
  this.pf.pfContribution = Math.round((cappedWages * 3.67) / 100);

  // 8.33% to Pension (max ₹1,250)
  this.pf.pensionContribution = Math.min(
    Math.round((cappedWages * 8.33) / 100),
    1250
  );

  // Admin charges: 0.5% of basic
  this.pf.adminCharges = Math.round((this.salary.basic * 0.5) / 100);

  // EDLI charges: 0.5% of basic (max ₹75)
  this.pf.edliCharges = Math.min(
    Math.round((this.salary.basic * 0.5) / 100),
    75
  );

  // Total employer contribution
  this.pf.employerContribution =
    this.pf.pfContribution +
    this.pf.pensionContribution +
    this.pf.adminCharges +
    this.pf.edliCharges;

  this.pf.total = this.pf.employeeContribution + this.pf.employerContribution;
};

// Method to calculate ESI
statutoryComplianceSchema.methods.calculateESI = function () {
  // ESI is applicable if gross salary <= ₹21,000 per month
  if (this.salary.gross > 21000) {
    this.esi.applicable = false;
    this.esi.employeeContribution = 0;
    this.esi.employerContribution = 0;
    this.esi.total = 0;
    return;
  }

  this.esi.applicable = true;

  // Employee contribution: 0.75% of gross
  this.esi.employeeContribution = Math.round(
    (this.salary.gross * this.esi.employeeContributionRate) / 100
  );

  // Employer contribution: 3.25% of gross
  this.esi.employerContribution = Math.round(
    (this.salary.gross * this.esi.employerContributionRate) / 100
  );

  this.esi.total = this.esi.employeeContribution + this.esi.employerContribution;
};

// Method to calculate Professional Tax
statutoryComplianceSchema.methods.calculateProfessionalTax = function () {
  if (!this.professionalTax.applicable) {
    this.professionalTax.amount = 0;
    return;
  }

  // Professional Tax slabs (Maharashtra example)
  const gross = this.salary.gross;

  if (gross <= 5000) {
    this.professionalTax.amount = 0;
  } else if (gross <= 10000) {
    this.professionalTax.amount = 175;
  } else {
    // For Feb/March, PT is ₹300, otherwise ₹200
    if (this.month === 2) {
      this.professionalTax.amount = 300;
    } else {
      this.professionalTax.amount = 200;
    }
  }
};

// Method to calculate TDS (simplified)
statutoryComplianceSchema.methods.calculateTDS = function (annualGross, deductions) {
  if (!this.tds.applicable) {
    this.tds.monthlyTDS = 0;
    this.tds.yearlyTDS = 0;
    return;
  }

  // Annual gross income
  this.tds.grossAnnualIncome = annualGross || this.salary.gross * 12;

  // Total deductions
  this.tds.totalDeductions =
    this.tds.standardDeduction +
    this.tds.section80C +
    this.tds.section80D +
    this.tds.otherDeductions;

  // Taxable income
  this.tds.taxableIncome = Math.max(
    0,
    this.tds.grossAnnualIncome - this.tds.totalDeductions
  );

  // Calculate income tax (New Tax Regime - FY 2024-25)
  let tax = 0;
  const taxableIncome = this.tds.taxableIncome;

  if (taxableIncome <= 300000) {
    tax = 0; // No tax up to ₹3 lakh
  } else if (taxableIncome <= 600000) {
    tax = (taxableIncome - 300000) * 0.05; // 5% on ₹3-6 lakh
  } else if (taxableIncome <= 900000) {
    tax = 15000 + (taxableIncome - 600000) * 0.1; // 10% on ₹6-9 lakh
  } else if (taxableIncome <= 1200000) {
    tax = 45000 + (taxableIncome - 900000) * 0.15; // 15% on ₹9-12 lakh
  } else if (taxableIncome <= 1500000) {
    tax = 90000 + (taxableIncome - 1200000) * 0.2; // 20% on ₹12-15 lakh
  } else {
    tax = 150000 + (taxableIncome - 1500000) * 0.3; // 30% above ₹15 lakh
  }

  // Standard deduction of ₹25,000 under new regime
  if (this.tds.taxRegime === "New") {
    tax = Math.max(0, tax - 25000);
  }

  this.tds.incomeTax = Math.round(tax);

  // Surcharge (if applicable)
  if (taxableIncome > 5000000) {
    this.tds.surcharge = Math.round(tax * 0.1); // 10% surcharge
  }

  // Health & Education Cess: 4%
  this.tds.cess = Math.round((tax + this.tds.surcharge) * 0.04);

  // Total yearly TDS
  this.tds.yearlyTDS = this.tds.incomeTax + this.tds.surcharge + this.tds.cess;

  // Monthly TDS
  this.tds.monthlyTDS = Math.round(this.tds.yearlyTDS / 12);
};

// Method to calculate all statutory deductions
statutoryComplianceSchema.methods.calculateAllDeductions = function () {
  this.calculatePF();
  this.calculateESI();
  this.calculateProfessionalTax();
  this.calculateTDS();

  // Total deductions
  this.totalDeductions =
    this.pf.employeeContribution +
    this.esi.employeeContribution +
    this.professionalTax.amount +
    this.tds.monthlyTDS +
    this.lwf.employeeContribution;

  // Net salary
  this.netSalary = this.salary.gross - this.totalDeductions;
};

// Static method to generate monthly compliance report
statutoryComplianceSchema.statics.getMonthlyComplianceReport = async function (
  businessType,
  month,
  year
) {
  const records = await this.find({ businessType, month, year }).populate(
    "employee",
    "name code"
  );

  let totalPFEmployee = 0;
  let totalPFEmployer = 0;
  let totalESIEmployee = 0;
  let totalESIEmployer = 0;
  let totalPT = 0;
  let totalTDS = 0;
  let totalLWF = 0;

  for (const record of records) {
    totalPFEmployee += record.pf.employeeContribution;
    totalPFEmployer += record.pf.employerContribution;
    totalESIEmployee += record.esi.employeeContribution;
    totalESIEmployer += record.esi.employerContribution;
    totalPT += record.professionalTax.amount;
    totalTDS += record.tds.monthlyTDS;
    totalLWF += record.lwf.employeeContribution + record.lwf.employerContribution;
  }

  return {
    businessType,
    month,
    year,
    employeeCount: records.length,
    pf: {
      employee: totalPFEmployee,
      employer: totalPFEmployer,
      total: totalPFEmployee + totalPFEmployer,
    },
    esi: {
      employee: totalESIEmployee,
      employer: totalESIEmployer,
      total: totalESIEmployee + totalESIEmployer,
    },
    professionalTax: totalPT,
    tds: totalTDS,
    lwf: totalLWF,
    grandTotal:
      totalPFEmployee +
      totalPFEmployer +
      totalESIEmployee +
      totalESIEmployer +
      totalPT +
      totalTDS +
      totalLWF,
  };
};

module.exports = mongoose.model("StatutoryCompliance", statutoryComplianceSchema);


