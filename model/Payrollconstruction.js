const mongoose = require('mongoose');

const payrollconstructionSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    month: { type: String, required: true }, // Format: "2025-12"
    
    // Attendance Details
    workingDays: { type: Number, required: true }, // Expected working days (excluding Sundays)
    daysPresent: { type: Number, default: 0 }, // Weekdays present
    sundayWorkDays: { type: Number, default: 0 }, // Sundays worked
    payableDays: { type: Number, required: true }, // Actual payable days
    attendancePercentage: { type: Number, default: 0 }, // Attendance percentage
    
    // Earnings (Pro-rated based on attendance)
    basicSalary: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    conveyance: { type: Number, default: 0 },
    medicalAllowance: { type: Number, default: 0 },
    specialAllowance: { type: Number, default: 0 },
    grossSalary: { type: Number, default: 0 },
    
    // Deductions (Pro-rated based on attendance)
    pfDeduction: { type: Number, default: 0 },
    professionalTax: { type: Number, default: 0 },
    taxDeduction: { type: Number, default: 0 },
    otherDeductions: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    
    // Net Salary
    netSalary: { type: Number, default: 0 },
    
    // Additional Info
    fullMonthSalary: { type: Number, default: 0 }, // What they would get for full month
    salaryRatio: { type: Number, default: 1 }, // Attendance ratio used for calculation
    
    // Status
    status: { type: String, enum: ['processed', 'paid', 'pending'], default: 'processed' },
    
    // Legacy fields for backward compatibility
    year: Number,
    absentDays: Number,
    leaveDays: Number,
    bonus: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    calculatedSalary: { type: Number },
    netPay: Number
}, {
    timestamps: true
});

// Index for faster queries
payrollconstructionSchema.index({ employeeId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Payrollconstruction', payrollconstructionSchema);
