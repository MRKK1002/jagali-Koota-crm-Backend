const Payroll = require('../model/Payrollconstruction');
const Employee = require('../model/Employee');
const Attendance = require('../model/Attendance');

// Helper function to calculate working days in a month (excluding Sundays)
const calculateWorkingDays = (year, month) => {
    const daysInMonth = new Date(year, month, 0).getDate();
    let workingDays = 0;
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        
        if (dayOfWeek !== 0) { // Exclude Sundays
            workingDays++;
        }
    }
    
    return workingDays;
};

// Helper function to get attendance data for an employee in a specific month
const getEmployeeAttendance = async (employeeId, year, month) => {
    const startDate = new Date(year, month - 1, 1); // First day of month
    const endDate = new Date(year, month, 0); // Last day of month
    
    const attendance = await Attendance.find({
        employeeId: employeeId,
        date: {
            $gte: startDate,
            $lte: endDate
        }
    }).sort({ date: 1 });
    
    return attendance;
};

// Helper function to analyze attendance and calculate payable days
const analyzeAttendance = (attendanceRecords, year, month) => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const workingDays = calculateWorkingDays(year, month);
    
    let presentDays = 0;
    let sundayWorkDays = 0;
    let weekdayAbsentDays = 0;
    
    // Create a map of all days in the month
    const dayMap = {};
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        const dateStr = date.toISOString().split('T')[0];
        
        dayMap[dateStr] = {
            date: date,
            isSunday: dayOfWeek === 0,
            isWeekday: dayOfWeek !== 0,
            hasAttendance: false,
            status: null
        };
    }
    
    // Mark attendance records
    attendanceRecords.forEach(record => {
        const dateStr = record.date.toISOString().split('T')[0];
        if (dayMap[dateStr]) {
            dayMap[dateStr].hasAttendance = true;
            dayMap[dateStr].status = record.status;
        }
    });
    
    // Analyze each day
    Object.values(dayMap).forEach(day => {
        if (day.isSunday) {
            // Sunday work - only count if employee was present
            if (day.hasAttendance && day.status === 'Present') {
                sundayWorkDays++;
            }
        } else {
            // Weekday
            if (day.hasAttendance && day.status === 'Present') {
                presentDays++;
            } else if (!day.hasAttendance || day.status === 'Absent') {
                weekdayAbsentDays++;
            }
        }
    });
    
    // Calculate payable days
    // Base: present weekdays + Sunday work (if it compensates for weekday absence)
    const compensatedSundayDays = Math.min(sundayWorkDays, weekdayAbsentDays);
    const payableDays = presentDays + compensatedSundayDays;
    
    return {
        workingDays,
        presentDays,
        sundayWorkDays,
        weekdayAbsentDays,
        compensatedSundayDays,
        payableDays,
        attendancePercentage: (payableDays / workingDays) * 100
    };
};

exports.processPayroll = async (req, res) => {
    try {
        const { month } = req.body; // Format: "2025-12"
        
        if (!month) {
            return res.status(400).json({ 
                success: false, 
                message: "Month is required (format: YYYY-MM)" 
            });
        }

        const [year, monthNum] = month.split('-');
        const yearInt = parseInt(year);
        const monthInt = parseInt(monthNum);

        console.log(`🔄 Processing payroll for ${month} (${yearInt}-${monthInt})`);

        // Get all construction employees
        const employees = await Employee.find({ businessType: 'construction', status: 'Active' });
        
        if (employees.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "No active construction employees found" 
            });
        }

        console.log(`👥 Found ${employees.length} active construction employees`);

        const payrollRecords = [];
        const workingDays = calculateWorkingDays(yearInt, monthInt);
        
        console.log(`📅 Working days in ${month}: ${workingDays} (excluding Sundays)`);
        
        for (const employee of employees) {
            try {
                // Check if payroll already exists for this employee and month
                const existing = await Payroll.findOne({ 
                    employeeId: employee._id, 
                    month: month 
                });
                
                if (existing) {
                    console.log(`⏭️ Skipping ${employee.name} - payroll already exists`);
                    continue;
                }

                // Get attendance data for this employee
                const attendanceRecords = await getEmployeeAttendance(employee._id, yearInt, monthInt);
                
                // Analyze attendance
                const attendanceAnalysis = analyzeAttendance(attendanceRecords, yearInt, monthInt);
                
                console.log(`📊 ${employee.name} (${employee.employeeId}) attendance:`, {
                    workingDays: attendanceAnalysis.workingDays,
                    presentDays: attendanceAnalysis.presentDays,
                    sundayWork: attendanceAnalysis.sundayWorkDays,
                    payableDays: attendanceAnalysis.payableDays,
                    percentage: attendanceAnalysis.attendancePercentage.toFixed(1) + '%'
                });

                // Calculate pro-rata salary based on attendance
                const attendanceRatio = attendanceAnalysis.payableDays / attendanceAnalysis.workingDays;
                
                // Calculate earnings (pro-rated)
                const basicSalary = (employee.basicSalary || 0) * attendanceRatio;
                const hra = (employee.hra || 0) * attendanceRatio;
                const conveyance = (employee.conveyance || 0) * attendanceRatio;
                const medicalAllowance = (employee.medicalAllowance || 0) * attendanceRatio;
                const specialAllowance = (employee.specialAllowance || 0) * attendanceRatio;
                const grossSalary = basicSalary + hra + conveyance + medicalAllowance + specialAllowance;

                // Calculate deductions (pro-rated)
                const pfDeduction = (employee.pfDeduction || 0) * attendanceRatio;
                const professionalTax = (employee.professionalTax || 0) * attendanceRatio;
                
                // TDS and other deductions as percentage of gross salary
                const tdsPercent = parseFloat(employee.taxDeduction || 0);
                const otherPercent = parseFloat(employee.otherDeductions || 0);
                const taxDeduction = (tdsPercent * grossSalary) / 100;
                const otherDeductions = (otherPercent * grossSalary) / 100;
                
                const totalDeductions = pfDeduction + professionalTax + taxDeduction + otherDeductions;
                const netSalary = grossSalary - totalDeductions;

                // Create payroll record
                const payrollData = {
                    employeeId: employee._id,
                    month: month,
                    // Attendance details
                    workingDays: attendanceAnalysis.workingDays,
                    daysPresent: attendanceAnalysis.presentDays,
                    sundayWorkDays: attendanceAnalysis.sundayWorkDays,
                    payableDays: attendanceAnalysis.payableDays,
                    attendancePercentage: attendanceAnalysis.attendancePercentage,
                    // Salary components (pro-rated)
                    basicSalary: Math.round(basicSalary),
                    hra: Math.round(hra),
                    conveyance: Math.round(conveyance),
                    medicalAllowance: Math.round(medicalAllowance),
                    specialAllowance: Math.round(specialAllowance),
                    grossSalary: Math.round(grossSalary),
                    // Deductions (pro-rated)
                    pfDeduction: Math.round(pfDeduction),
                    professionalTax: Math.round(professionalTax),
                    taxDeduction: Math.round(taxDeduction),
                    otherDeductions: Math.round(otherDeductions),
                    totalDeductions: Math.round(totalDeductions),
                    netSalary: Math.round(netSalary),
                    // Additional info
                    fullMonthSalary: employee.netSalary || 0,
                    salaryRatio: attendanceRatio
                };

                const payroll = new Payroll(payrollData);
                await payroll.save();
                payrollRecords.push(payroll);

                console.log(`✅ ${employee.name}: ₹${Math.round(netSalary)} (${attendanceAnalysis.payableDays}/${attendanceAnalysis.workingDays} days)`);

            } catch (empError) {
                console.error(`❌ Error processing ${employee.name}:`, empError);
                // Continue with other employees
            }
        }

        console.log(`🎉 Payroll processing completed: ${payrollRecords.length} employees processed`);

        res.status(201).json({ 
            success: true, 
            message: `Payroll processed for ${payrollRecords.length} employees`,
            data: payrollRecords,
            summary: {
                month: month,
                workingDays: workingDays,
                employeesProcessed: payrollRecords.length,
                totalPayroll: payrollRecords.reduce((sum, p) => sum + p.netSalary, 0)
            }
        });
    } catch (err) {
        console.error("Payroll processing error:", err);
        res.status(500).json({ 
            success: false, 
            message: "Failed to process payroll", 
            error: err.message 
        });
    }
};

exports.generatePayroll = async (req, res) => {
    try {
        const { salary, bonus = 0, deductions = 0, presentDays } = req.body;
        const calculatedSalary = (salary / 30) * presentDays;
        const netPay = calculatedSalary + bonus - deductions;

        const payroll = new Payroll({ ...req.body, calculatedSalary, netPay });
        await payroll.save();
        res.status(201).json(payroll);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.getAllPayrolls = async (req, res) => {
    try {
        const { month } = req.query;
        
        let query = {};
        if (month) {
            query.month = month;
        }
        
        const payrolls = await Payroll.find(query).populate('employeeId');
        res.json({ success: true, data: payrolls });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deletePayroll = async (req, res) => {
    try {
        const { id } = req.params;
        await Payroll.findByIdAndDelete(id);
        res.json({ success: true, message: "Payroll deleted successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get payslips for a specific employee (for mobile app)
exports.getEmployeePayslips = async (req, res) => {
    try {
        const { employeeId } = req.query;
        
        if (!employeeId) {
            return res.status(400).json({
                success: false,
                message: "Employee ID is required"
            });
        }

        console.log('Fetching payslips for employee:', employeeId);

        // Convert string to ObjectId
        const mongoose = require('mongoose');
        const employeeObjectId = new mongoose.Types.ObjectId(employeeId);

        // Verify employee exists
        const employee = await Employee.findById(employeeObjectId);
        if (!employee) {
            return res.status(404).json({
                success: false,
                message: "Employee not found"
            });
        }

        // Get payslips for the employee, sorted by most recent first
        const payslips = await Payroll.find({ employeeId: employeeObjectId })
            .sort({ createdAt: -1 })
            .populate('employeeId', 'name employeeId')
            .lean();

        console.log('Found payslips:', payslips.length);

        // Transform payslips to match mobile app format
        const transformedPayslips = payslips.map(payslip => {
            // Extract month and year from month field (format: "2025-11")
            const [year, monthNum] = payslip.month.split('-');
            const monthNames = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ];
            const monthName = monthNames[parseInt(monthNum) - 1];

            return {
                _id: payslip._id,
                month: monthName,
                year: parseInt(year),
                basicSalary: payslip.basicSalary || 0,
                allowances: (payslip.hra || 0) + (payslip.conveyance || 0) + 
                           (payslip.medicalAllowance || 0) + (payslip.specialAllowance || 0),
                deductions: payslip.totalDeductions || 0,
                netSalary: payslip.netSalary || 0,
                workingDays: payslip.workingDays || 26, // Actual working days (excluding Sundays)
                presentDays: payslip.daysPresent || 0,
                sundayWorkDays: payslip.sundayWorkDays || 0,
                payableDays: payslip.payableDays || payslip.daysPresent || 0,
                attendancePercentage: payslip.attendancePercentage || 0,
                status: payslip.status || 'processed',
                // Detailed breakdown
                earnings: {
                    basicSalary: payslip.basicSalary || 0,
                    hra: payslip.hra || 0,
                    conveyance: payslip.conveyance || 0,
                    medicalAllowance: payslip.medicalAllowance || 0,
                    specialAllowance: payslip.specialAllowance || 0,
                    grossSalary: payslip.grossSalary || 0,
                },
                deductionDetails: {
                    pfDeduction: payslip.pfDeduction || 0,
                    professionalTax: payslip.professionalTax || 0,
                    taxDeduction: payslip.taxDeduction || 0,
                    otherDeductions: payslip.otherDeductions || 0,
                    totalDeductions: payslip.totalDeductions || 0,
                }
            };
        });

        res.status(200).json({
            success: true,
            data: transformedPayslips
        });

    } catch (error) {
        console.error('Error fetching employee payslips:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payslips',
            error: error.message
        });
    }
};
