const Payroll = require("../model/Payroll");
const Employee = require("../model/Employee");
const Attendance = require("../model/Attendance"); // This is AttendanceConstruction model

// Get all payrolls
exports.getAllPayrolls = async (req, res) => {
  try {
    const { month } = req.query;
    const query = month ? { month } : {};
    
    const payrolls = await Payroll.find(query)
      .sort({ createdAt: -1 })
      .populate("employeeId", "name employeeId email");
      
    res.status(200).json({
      success: true,
      data: payrolls,
    });
  } catch (error) {
    console.error("Error fetching payrolls:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching payrolls",
      error: error.message,
    });
  }
};

// Process payroll for all employees
exports.processPayroll = async (req, res) => {
  try {
    const { month } = req.body; // Format: YYYY-MM
    
    if (!month) {
      return res.status(400).json({
        success: false,
        message: "Month is required",
      });
    }

    // Get all active employees
    const employees = await Employee.find({ status: "Active" });
    
    const payrollResults = [];
    
    for (const employee of employees) {
      // Check if payroll already exists for this month
      const existingPayroll = await Payroll.findOne({
        employeeId: employee._id,
        month,
      });
      
      if (existingPayroll) {
        payrollResults.push({
          employeeId: employee._id,
          status: "already_processed",
        });
        continue;
      }
      
      // Get attendance data for the month
      const [year, monthNum] = month.split('-');
      const startDate = new Date(year, parseInt(monthNum) - 1, 1);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(year, parseInt(monthNum), 0);
      endDate.setHours(23, 59, 59, 999);
      
      console.log(`Querying attendance from ${startDate.toISOString()} to ${endDate.toISOString()}`);
      
      const attendanceRecords = await Attendance.find({
        employeeId: employee._id,
        date: { $gte: startDate, $lte: endDate },
      });
      
      console.log(`\n=== Processing payroll for ${employee.name} (${employee.employeeId}) ===`);
      console.log(`Month: ${month}`);
      console.log(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
      console.log(`Found ${attendanceRecords.length} attendance records`);
      
      if (attendanceRecords.length > 0) {
        console.log("Attendance records:", attendanceRecords.map(a => ({
          date: a.date,
          status: a.status,
          checkIn: a.checkIn,
          checkOut: a.checkOut
        })));
      }
      
      const daysPresent = attendanceRecords.filter(a => 
        a.status === "Present" || a.status === "present" || a.status === "Late"
      ).length;
      const daysAbsent = attendanceRecords.filter(a => 
        a.status === "Absent" || a.status === "absent"
      ).length;
      const halfDays = attendanceRecords.filter(a => 
        a.status === "half-day" || a.status === "Half Day"
      ).length;
      
      console.log(`Days: Present=${daysPresent}, Absent=${daysAbsent}, HalfDays=${halfDays}`);
      
      // Calculate salary
      const totalWorkingDays = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
      const effectiveDays = daysPresent + (halfDays * 0.5);
      
      // If no attendance records found, assume full month present (default behavior)
      const salaryMultiplier = attendanceRecords.length === 0 ? 1 : (effectiveDays / totalWorkingDays);
      
      console.log(`Total working days: ${totalWorkingDays}, Effective days: ${effectiveDays}, Multiplier: ${salaryMultiplier}`);
      console.log(`Employee gross salary: ${employee.grossSalary}`);
      
      // Calculate gross salary from individual components
      const basicSalary = (employee.basicSalary || 0) * salaryMultiplier;
      const hra = (employee.hra || 0) * salaryMultiplier;
      const conveyance = (employee.conveyance || 0) * salaryMultiplier;
      const medicalAllowance = (employee.medicalAllowance || 0) * salaryMultiplier;
      const specialAllowance = (employee.specialAllowance || 0) * salaryMultiplier;
      
      const grossSalary = basicSalary + hra + conveyance + medicalAllowance + specialAllowance;
      
      console.log(`Base gross salary: ${baseGrossSalary}, Calculated gross salary: ${grossSalary}`);
      
      // Calculate deductions - check if they are percentages or fixed amounts
      // If value is less than 100, treat as percentage, otherwise as fixed amount
      const pfDeduction = employee.pfDeduction || 0;
      const pfAmount = pfDeduction < 100 ? (pfDeduction * grossSalary / 100) : pfDeduction;
      
      const profTax = employee.professionalTax || 0;
      const profTaxAmount = profTax < 100 ? (profTax * grossSalary / 100) : profTax;
      
      const tds = employee.taxDeduction || 0;
      const tdsAmount = tds < 100 ? (tds * grossSalary / 100) : tds;
      
      const otherDed = employee.otherDeductions || 0;
      const otherAmount = otherDed < 100 ? (otherDed * grossSalary / 100) : otherDed;
      
      const totalDeductions = pfAmount + profTaxAmount + tdsAmount + otherAmount;
      const netSalary = grossSalary - totalDeductions;
      
      console.log(`Total deductions: ${totalDeductions}, Net salary: ${netSalary}`);
      
      // Create payroll record
      const payroll = new Payroll({
        employeeId: employee._id,
        month,
        daysPresent,
        daysAbsent,
        halfDays,
        basicSalary,
        hra,
        conveyance,
        medicalAllowance,
        specialAllowance,
        grossSalary,
        pfDeduction: pfAmount,
        professionalTax: profTaxAmount,
        taxDeduction: tdsAmount,
        otherDeductions: otherAmount,
        totalDeductions,
        netSalary,
        status: "processed",
      });
      
      await payroll.save();
      payrollResults.push({
        employeeId: employee._id,
        status: "processed",
      });
    }
    
    res.status(200).json({
      success: true,
      message: "Payroll processed successfully",
      data: payrollResults,
    });
  } catch (error) {
    console.error("Error processing payroll:", error);
    res.status(500).json({
      success: false,
      message: "Error processing payroll",
      error: error.message,
    });
  }
};

// Get payroll by ID
exports.getPayrollById = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id)
      .populate("employeeId", "name employeeId email");
      
    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: "Payroll not found",
      });
    }
    
    res.status(200).json({
      success: true,
      data: payroll,
    });
  } catch (error) {
    console.error("Error fetching payroll:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching payroll",
      error: error.message,
    });
  }
};

// Update payroll
exports.updatePayroll = async (req, res) => {
  try {
    const payroll = await Payroll.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: "Payroll not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Payroll updated successfully",
      data: payroll,
    });
  } catch (error) {
    console.error("Error updating payroll:", error);
    res.status(500).json({
      success: false,
      message: "Error updating payroll",
      error: error.message,
    });
  }
};

// Delete payroll
exports.deletePayroll = async (req, res) => {
  try {
    const payroll = await Payroll.findByIdAndDelete(req.params.id);

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: "Payroll not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Payroll deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting payroll:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting payroll",
      error: error.message,
    });
  }
};
