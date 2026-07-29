const mongoose = require('mongoose');

const salaryStructureSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Employee ID is required'],
    refPath: 'employeeModel', // Dynamically choose model based on businessType
  },
  employeeModel: {
    type: String,
    required: true,
    enum: ['Employee', 'Staff'], // These should match your actual Mongoose model names
  },
  businessType: {
    type: String,
    enum: ['construction', 'restaurant'],
    required: [true, 'Business type is required'],
  },
  basicPay: {
    type: Number,
    required: [true, 'Basic pay is required'],
    min: [0, 'Basic pay cannot be negative'],
  },
  allowances: {
    construction: {
      siteAllowance: { type: Number, default: 0, min: 0 },
      overtimeAllowance: { type: Number, default: 0, min: 0 },
      safetyAllowance: { type: Number, default: 0, min: 0 },
    },
    restaurant: {
      tipsDistribution: { type: Number, default: 0, min: 0 },
      serviceChargeShare: { type: Number, default: 0, min: 0 },
      foodAllowance: { type: Number, default: 0, min: 0 },
    },
  },
  deductions: {
    professionalTax: { type: Number, default: 0, min: 0 },
    incomeTax: { type: Number, default: 0, min: 0 },
    providentFund: { type: Number, default: 0, min: 0 },
    esi: { type: Number, default: 0, min: 0 },
  },
  totalEarnings: {
    type: Number,
    default: 0,
    min: [0, 'Total earnings cannot be negative'],
  },
  totalDeductions: {
    type: Number,
    default: 0,
    min: [0, 'Total deductions cannot be negative'],
  },
  netSalary: {
    type: Number,
    default: 0,
    min: [0, 'Net salary cannot be negative'],
  },
  month: {
    type: String,
    required: [true, 'Month is required'],
    enum: [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ],
  },
  year: {
    type: Number,
    required: [true, 'Year is required'],
    min: [2000, 'Year must be valid'],
    max: [new Date().getFullYear() + 1, 'Year cannot be in the future'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Middleware to calculate totals
salaryStructureSchema.pre('save', function (next) {
  this.updatedAt = Date.now();

  this.allowances = this.allowances || { construction: {}, restaurant: {} };
  this.deductions = this.deductions || {};

  if (this.businessType === 'construction') {
    this.totalEarnings =
      (this.basicPay || 0) +
      (this.allowances.construction.siteAllowance || 0) +
      (this.allowances.construction.overtimeAllowance || 0) +
      (this.allowances.construction.safetyAllowance || 0);
  } else {
    this.totalEarnings =
      (this.basicPay || 0) +
      (this.allowances.restaurant.tipsDistribution || 0) +
      (this.allowances.restaurant.serviceChargeShare || 0) +
      (this.allowances.restaurant.foodAllowance || 0);
  }

  this.totalDeductions =
    (this.deductions.professionalTax || 0) +
    (this.deductions.incomeTax || 0) +
    (this.deductions.providentFund || 0) +
    (this.deductions.esi || 0);

  this.netSalary = this.totalEarnings - this.totalDeductions;

  next();
});

const SalaryStructure = mongoose.model('SalaryStructure', salaryStructureSchema);
module.exports = SalaryStructure;
