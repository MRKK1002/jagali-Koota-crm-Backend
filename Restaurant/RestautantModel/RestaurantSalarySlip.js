const mongoose = require("mongoose");

const salarySlipSchema = new mongoose.Schema(
  {
    // Reference
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RestaurantEmployee",
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
    department: { type: String },
    designation: { type: String },
    
    // Period
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
    periodStart: { type: Date }, // First working day in period
    periodEnd: { type: Date }, // Last day of period
    
    // Salary Type
    salaryType: {
      type: String,
      enum: ["fixed", "daily", "hourly"],
      required: true,
    },
    baseSalary: { type: Number, default: 0 }, // Original basic salary from employee record
    
    // Attendance Metrics
    workingDays: { type: Number, default: 0 }, // Total working days in month
    daysWorked: { type: Number, default: 0 }, // Present + Late
    daysAbsent: { type: Number, default: 0 }, // Absent without approved leave
    totalLeaveDays: { type: Number, default: 0 }, // All approved leaves
    sickLeaveDays: { type: Number, default: 0 },
    casualLeaveDays: { type: Number, default: 0 },
    annualLeaveDays: { type: Number, default: 0 },
    emergencyLeaveDays: { type: Number, default: 0 },
    lateCount: { type: Number, default: 0 },
    otherLeaveDays: { type: Number, default: 0 }, // For compatibility
    
    // For Hourly Workers
    hoursWorked: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    hourlyRate: { type: Number, default: 0 },
    
    // Earnings
    basicSalary: { type: Number, default: 0 }, // Calculated based on type & attendance
    hra: { type: Number, default: 0 },
    conveyance: { type: Number, default: 0 },
    medicalAllowance: { type: Number, default: 0 },
    specialAllowance: { type: Number, default: 0 },
    overtimeAmount: { type: Number, default: 0 },
    bonusAmount: { type: Number, default: 0 }, // Manual addition
    grossSalary: { type: Number, default: 0 },
    
    // Deductions
    pf: { type: Number, default: 0 },
    professionalTax: { type: Number, default: 0 },
    tds: { type: Number, default: 0 },
    absenceDeduction: { type: Number, default: 0 }, // Deduction for unapproved absences
    lateDeduction: { type: Number, default: 0 }, // Optional late penalties
    otherDeductions: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    salaryDeductions: { type: Number, default: 0 }, // Legacy field for compatibility
    
    // Net Salary
    netSalary: { type: Number, default: 0 },
    
    // Manual Adjustments
    manualAdjustments: [{
      type: {
        type: String,
        enum: ["addition", "deduction"],
      },
      amount: { type: Number },
      reason: { type: String },
      addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      addedDate: { type: Date, default: Date.now },
    }],
    
    // Calculation Details (for transparency)
    calculationBreakdown: {
      dailyRate: { type: Number },
      hourlyRate: { type: Number },
      daysCalculated: { type: Number },
      hoursCalculated: { type: Number },
      deductionDetails: { type: String },
      formula: { type: String },
    },
    
    // Status
    status: {
      type: String,
      enum: ["draft", "generated", "approved", "paid"],
      default: "generated",
    },
    isEdited: { type: Boolean, default: false },
    editHistory: [{
      editedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      editedDate: { type: Date },
      field: { type: String },
      oldValue: { type: mongoose.Schema.Types.Mixed },
      newValue: { type: mongoose.Schema.Types.Mixed },
      reason: { type: String },
    }],
    
    // PDF
    pdfPath: { type: String },
    pdfGenerated: { type: Boolean, default: false },
    
    // Bank Details (snapshot at generation time)
    bankName: { type: String },
    accountNumber: { type: String },
    ifscCode: { type: String },
    branch: { type: String },
    
    // Important Dates
    generatedDate: { type: Date },
    approvedDate: { type: Date },
    paidDate: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one salary slip per employee per month
salarySlipSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });
salarySlipSchema.index({ status: 1 });
salarySlipSchema.index({ employeeId: 1 });
salarySlipSchema.index({ month: 1, year: 1 });

// Calculate totals before saving
salarySlipSchema.pre("save", function (next) {
  // Calculate gross salary
  this.grossSalary = 
    this.basicSalary +
    this.hra +
    this.conveyance +
    this.medicalAllowance +
    this.specialAllowance +
    this.overtimeAmount +
    this.bonusAmount;
  
  // Calculate total deductions
  this.totalDeductions = 
    this.pf +
    this.professionalTax +
    this.tds +
    this.absenceDeduction +
    this.lateDeduction +
    this.otherDeductions;
  
  // Apply manual adjustments
  if (this.manualAdjustments && this.manualAdjustments.length > 0) {
    this.manualAdjustments.forEach(adj => {
      if (adj.type === "addition") {
        this.grossSalary += adj.amount;
      } else if (adj.type === "deduction") {
        this.totalDeductions += adj.amount;
      }
    });
  }
  
  // Calculate net salary
  this.netSalary = Math.max(0, this.grossSalary - this.totalDeductions);
  
  // Sync salaryDeductions with totalDeductions for compatibility
  this.salaryDeductions = this.totalDeductions;
  
  next();
});

// Instance method to add manual adjustment
salarySlipSchema.methods.addManualAdjustment = function(type, amount, reason, userId) {
  this.manualAdjustments.push({
    type,
    amount,
    reason,
    addedBy: userId,
    addedDate: new Date(),
  });
  this.isEdited = true;
  return this.save();
};

// Instance method to track field edit
salarySlipSchema.methods.trackEdit = function(field, oldValue, newValue, reason, userId) {
  this.editHistory.push({
    editedBy: userId,
    editedDate: new Date(),
    field,
    oldValue,
    newValue,
    reason,
  });
  this.isEdited = true;
};

// Static method to get salary slips by status
salarySlipSchema.statics.findByStatus = function(status) {
  return this.find({ status }).populate('employee', 'name empId designation department');
};

// Static method to get monthly salary summary
salarySlipSchema.statics.getMonthlySummary = async function(month, year) {
  const slips = await this.find({ month, year });
  
  const summary = {
    totalEmployees: slips.length,
    totalGrossSalary: 0,
    totalDeductions: 0,
    totalNetSalary: 0,
    byStatus: {
      draft: 0,
      generated: 0,
      approved: 0,
      paid: 0,
    },
  };
  
  slips.forEach(slip => {
    summary.totalGrossSalary += slip.grossSalary;
    summary.totalDeductions += slip.totalDeductions;
    summary.totalNetSalary += slip.netSalary;
    summary.byStatus[slip.status]++;
  });
  
  return summary;
};

module.exports = mongoose.models.RestaurantSalarySlip || mongoose.model("RestaurantSalarySlip", salarySlipSchema, "restaurantsalaryslips");

