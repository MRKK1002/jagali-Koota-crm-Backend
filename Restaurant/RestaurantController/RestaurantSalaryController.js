const SalarySlip = require("../RestautantModel/RestaurantSalarySlip");
const Employee = require("../RestautantModel/RestaurantEmployeeSchema");
const AttendanceRecord = require("../RestautantModel/RestaurantAttendanceRecord");
const LeaveApplication = require("../RestautantModel/RestaurantLeaveApplication");
const path = require("path");
const fs = require("fs");
const puppeteer = require("puppeteer");

// No Redis/BullMQ queue - using direct generation

// Generate salary slip for single employee
const generateSalarySlip = async (req, res) => {
  try {
    const { employeeId, month, year } = req.body;

    if (!employeeId || !month || !year) {
      return res.status(400).json({
        success: false,
        message: "Employee ID, month, and year are required",
      });
    }

    console.log("Generating salary slip directly");
    const result = await generateSalarySlipForEmployee(
      employeeId,
      parseInt(month),
      parseInt(year)
    );

    res.json({
      success: true,
      message: "Salary slip generated successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error generating salary slip:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate salary slip",
      error: error.message,
    });
  }
};

// Generate salary slips for all employees
const generateAllSalarySlips = async (req, res) => {
  try {
    const { month, year } = req.body;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "Month and year are required",
      });
    }

    const employees = await Employee.find({ status: "Active" });
    console.log(`Generating salary slips for ${employees.length} employees`);
    
    const results = [];
    for (const employee of employees) {
      try {
        const result = await generateSalarySlipForEmployee(
          employee._id.toString(),
          parseInt(month),
          parseInt(year)
        );
        results.push(result);
      } catch (err) {
        console.error(`Error generating slip for ${employee.name}:`, err);
      }
    }

    res.json({
      success: true,
      message: `${results.length} salary slips generated successfully`,
      jobsCount: results.length,
    });
  } catch (error) {
    console.error("Error generating salary slips:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate salary slips",
      error: error.message,
    });
  }
};

// Generate monthly salary slips
const generateMonthlySalarySlips = async (req, res) => {
  try {
    const { month, year } = req.body;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "Month and year are required",
      });
    }

    const employees = await Employee.find({ status: "Active" });
    console.log(`Generating monthly salary slips for ${employees.length} employees`);
    
    const results = [];
    for (const employee of employees) {
      try {
        // Check if salary slip already exists
        const existingSlip = await SalarySlip.findOne({
          employee: employee._id,
          month: parseInt(month),
          year: parseInt(year),
        });

        if (!existingSlip) {
          const result = await generateSalarySlipForEmployee(
            employee._id.toString(),
            parseInt(month),
            parseInt(year)
          );
          results.push(result);
        }
      } catch (err) {
        console.error(`Error generating slip for ${employee.name}:`, err);
      }
    }

    res.json({
      success: true,
      message: `${results.length} new salary slips generated successfully`,
      jobsCount: results.length,
    });
  } catch (error) {
    console.error("Error generating monthly salary slips:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate monthly salary slips",
      error: error.message,
    });
  }
};

// Get salary slips with filtering
const getSalarySlips = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      month,
      year,
      employeeId,
      status,
      search,
    } = req.query;

    const query = {};

    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);
    if (employeeId) query.employee = employeeId;
    if (status) query.status = status;

    if (search) {
      query.$or = [
        { employeeName: { $regex: search, $options: "i" } },
        { employeeId: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const salarySlips = await SalarySlip.find(query)
      .populate("employee", "name empId designation department")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SalarySlip.countDocuments(query);

    res.json({
      success: true,
      data: salarySlips,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error("Error fetching salary slips:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch salary slips",
      error: error.message,
    });
  }
};

// Get salary slip by ID
const getSalarySlipById = async (req, res) => {
  try {
    const salarySlip = await SalarySlip.findById(req.params.id).populate(
      "employee",
      "name empId designation department"
    );

    if (!salarySlip) {
      return res.status(404).json({
        success: false,
        message: "Salary slip not found",
      });
    }

    res.json({
      success: true,
      data: salarySlip,
    });
  } catch (error) {
    console.error("Error fetching salary slip:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch salary slip",
      error: error.message,
    });
  }
};

// Download salary slip as PDF
const downloadSalarySlip = async (req, res) => {
  try {
    const salarySlip = await SalarySlip.findById(req.params.id).populate(
      "employee",
      "name empId designation department"
    );

    if (!salarySlip) {
      return res.status(404).json({
        success: false,
        message: "Salary slip not found",
      });
    }

    // Generate PDF if not exists
    if (!salarySlip.pdfPath || !fs.existsSync(salarySlip.pdfPath)) {
      const pdfPath = await generateSalarySlipPDF(salarySlip);
      salarySlip.pdfPath = pdfPath;
      salarySlip.pdfGenerated = true;
      await salarySlip.save();
    }

    // Send PDF file
    res.download(
      salarySlip.pdfPath,
      `salary-slip-${salarySlip.employeeName}-${salarySlip.month}-${salarySlip.year}.pdf`
    );
  } catch (error) {
    console.error("Error downloading salary slip:", error);
    res.status(500).json({
      success: false,
      message: "Failed to download salary slip",
      error: error.message,
    });
  }
};

// View salary slip as PDF
const viewSalarySlip = async (req, res) => {
  try {
    const salarySlip = await SalarySlip.findById(req.params.id).populate(
      "employee",
      "name empId designation department"
    );

    if (!salarySlip) {
      return res.status(404).json({
        success: false,
        message: "Salary slip not found",
      });
    }

    // Generate PDF
    const html = generateSalarySlipHTML(salarySlip);
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });
    
    await browser.close();

    // Set headers for PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="salary-slip-${salarySlip.employeeName}-${salarySlip.month}-${salarySlip.year}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error viewing salary slip:", error);
    res.status(500).json({
      success: false,
      message: "Failed to view salary slip",
      error: error.message,
    });
  }
};

// Get salary statistics
const getSalaryStats = async (req, res) => {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const currentMonthSlips = await SalarySlip.countDocuments({
      month: currentMonth,
      year: currentYear,
    });

    const totalGenerated = await SalarySlip.countDocuments();

    const statusCounts = await SalarySlip.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const byStatus = {};
    statusCounts.forEach((item) => {
      byStatus[item._id] = item.count;
    });

    const totalAmountResult = await SalarySlip.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$netSalary" },
        },
      },
    ]);

    const totalAmount =
      totalAmountResult.length > 0 ? totalAmountResult[0].totalAmount : 0;

    res.json({
      success: true,
      data: {
        currentMonth: currentMonthSlips,
        totalGenerated,
        byStatus,
        totalAmount,
      },
    });
  } catch (error) {
    console.error("Error fetching salary stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch salary stats",
      error: error.message,
    });
  }
};

// Get queue status - No queue, return empty
const getQueueStatus = async (req, res) => {
  try {
    // No queue system in use, return empty status
    res.json({
      success: true,
      data: {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
      },
    });
  } catch (error) {
    console.error("Error fetching queue status:", error);
    res.json({
      success: true,
      data: {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
      },
    });
  }
};

// Clear all salary slips
const clearAllSalarySlips = async (req, res) => {
  try {
    const result = await SalarySlip.deleteMany({});

    // Clean up PDF files
    const uploadsDir = path.join(__dirname, "../uploads/salary-slips");
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      files.forEach((file) => {
        fs.unlinkSync(path.join(uploadsDir, file));
      });
    }

    res.json({
      success: true,
      message: "All salary slips cleared successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error clearing salary slips:", error);
    res.status(500).json({
      success: false,
      message: "Failed to clear salary slips",
      error: error.message,
    });
  }
};

// Edit salary slip (manual adjustments)
const editSalarySlip = async (req, res) => {
  try {
    const { id } = req.params;
    const { field, value, reason, adjustmentType, adjustmentAmount, adjustmentReason, ...bulkUpdates } = req.body;
    
    const salarySlip = await SalarySlip.findById(id);
    
    if (!salarySlip) {
      return res.status(404).json({
        success: false,
        message: "Salary slip not found",
      });
    }
    
    // Check if salary slip can be edited
    if (salarySlip.status === "paid") {
      return res.status(400).json({
        success: false,
        message: "Cannot edit paid salary slips",
      });
    }
    
    // Handle manual adjustments (addition or deduction)
    if (adjustmentType && adjustmentAmount) {
      const userId = req.user?._id || req.body.userId;
      
      await salarySlip.addManualAdjustment(
        adjustmentType,
        parseFloat(adjustmentAmount),
        adjustmentReason || "Manual adjustment",
        userId
      );
      
      return res.json({
        success: true,
        message: "Manual adjustment added successfully",
        data: salarySlip,
      });
    }
    
    // Handle single field edit
    if (field && value !== undefined) {
      const oldValue = salarySlip[field];
      const userId = req.user?._id || req.body.userId;
      
      // Track the edit
      salarySlip.trackEdit(field, oldValue, value, reason || "Manual edit", userId);
      
      // Update the field
      salarySlip[field] = value;
      
      await salarySlip.save();
      
      return res.json({
        success: true,
        message: "Salary slip updated successfully",
        data: salarySlip,
      });
    }
    
    // Handle bulk field updates (from edit modal)
    const allowedFields = [
      'basicSalary', 'hra', 'conveyance', 'medicalAllowance', 'specialAllowance',
      'pf', 'professionalTax', 'tds', 'otherDeductions',
      'daysWorked', 'daysAbsent', 'hoursWorked', 'overtimeHours'
    ];
    
    let updatedCount = 0;
    const userId = req.user?._id || req.body.userId;
    
    allowedFields.forEach(fieldName => {
      if (bulkUpdates[fieldName] !== undefined) {
        const oldValue = salarySlip[fieldName];
        const newValue = parseFloat(bulkUpdates[fieldName]);
        
        if (!isNaN(newValue) && oldValue !== newValue) {
          // Track the edit
          salarySlip.trackEdit(fieldName, oldValue, newValue, "Bulk edit from modal", userId);
          salarySlip[fieldName] = newValue;
          updatedCount++;
        }
      }
    });
    
    // If attendance fields were updated, recalculate basic salary
    if (bulkUpdates.daysWorked !== undefined || bulkUpdates.daysAbsent !== undefined) {
      const employee = await Employee.findById(salarySlip.employee);
      if (employee && employee.salaryType === 'fixed') {
        const monthDays = new Date(salarySlip.year, salarySlip.month, 0).getDate();
        const dailyRate = employee.basicSalary / monthDays;
        const absenceDeduction = salarySlip.daysAbsent * dailyRate;
        const recalculatedBasic = employee.basicSalary - absenceDeduction;
        
        console.log('Recalculating basic salary:', {
          employeeBasicSalary: employee.basicSalary,
          monthDays,
          dailyRate: dailyRate.toFixed(2),
          daysAbsent: salarySlip.daysAbsent,
          absenceDeduction: absenceDeduction.toFixed(2),
          recalculatedBasic: recalculatedBasic.toFixed(2)
        });
        
        if (salarySlip.basicSalary !== recalculatedBasic) {
          salarySlip.trackEdit('basicSalary', salarySlip.basicSalary, recalculatedBasic, 'Recalculated based on attendance', userId);
          salarySlip.basicSalary = recalculatedBasic;
          updatedCount++;
        }
      }
    }
    
    if (updatedCount > 0) {
      salarySlip.isEdited = true;
      
      console.log('Before save:', {
        basicSalary: salarySlip.basicSalary,
        hra: salarySlip.hra,
        grossSalary: salarySlip.grossSalary,
        netSalary: salarySlip.netSalary
      });
      
      await salarySlip.save();
      
      console.log('After save:', {
        basicSalary: salarySlip.basicSalary,
        hra: salarySlip.hra,
        grossSalary: salarySlip.grossSalary,
        netSalary: salarySlip.netSalary
      });
      
      return res.json({
        success: true,
        message: `Salary slip updated successfully (${updatedCount} fields changed)`,
        data: salarySlip,
      });
    }
    
    res.status(400).json({
      success: false,
      message: "No valid edit parameters provided",
    });
  } catch (error) {
    console.error("Error editing salary slip:", error);
    res.status(500).json({
      success: false,
      message: "Failed to edit salary slip",
      error: error.message,
    });
  }
};

// Approve salary slip
const approveSalarySlip = async (req, res) => {
  try {
    const { id } = req.params;
    
    const salarySlip = await SalarySlip.findById(id);
    
    if (!salarySlip) {
      return res.status(404).json({
        success: false,
        message: "Salary slip not found",
      });
    }
    
    salarySlip.status = "approved";
    salarySlip.approvedDate = new Date();
    await salarySlip.save();
    
    res.json({
      success: true,
      message: "Salary slip approved successfully",
      data: salarySlip,
    });
  } catch (error) {
    console.error("Error approving salary slip:", error);
    res.status(500).json({
      success: false,
      message: "Failed to approve salary slip",
      error: error.message,
    });
  }
};

// Helper function to generate salary slip for an employee
const generateSalarySlipForEmployee = async (employeeId, month, year) => {
  try {
    console.log(`Generating salary slip for employee ${employeeId}, month ${month}, year ${year}`);
    
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      throw new Error("Employee not found");
    }

    // Check if salary slip already exists
    const existingSlip = await SalarySlip.findOne({
      employee: employeeId,
      month,
      year,
    });

    if (existingSlip) {
      console.log("Salary slip already exists for this employee and month");
      return existingSlip;
    }

    console.log("Employee found:", employee.name, "Salary Type:", employee.salaryType, "Basic Salary:", employee.basicSalary);

    // Determine calculation period
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0, 23, 59, 59, 999);
    
    // If employee joined mid-month, adjust start date
    const joiningDate = new Date(employee.dateOfJoining || employee.joiningDate);
    const actualStartDate = joiningDate > periodStart ? joiningDate : periodStart;
    
    console.log(`Calculation period: ${actualStartDate.toISOString()} to ${periodEnd.toISOString()}`);

    // Get attendance records for the period
    const attendanceRecords = await AttendanceRecord.find({
      employee: employeeId,
      date: { $gte: actualStartDate, $lte: periodEnd },
    });
    
    // Get approved leave applications for the period
    const approvedLeaves = await LeaveApplication.find({
      employee: employeeId,
      status: "Approved",
      $or: [
        { startDate: { $gte: actualStartDate, $lte: periodEnd } },
        { endDate: { $gte: actualStartDate, $lte: periodEnd } },
        {
          startDate: { $lt: actualStartDate },
          endDate: { $gt: periodEnd }
        }
      ]
    });

    console.log(`Found ${attendanceRecords.length} attendance records and ${approvedLeaves.length} approved leaves`);

    // Calculate attendance metrics
    const daysWorked = attendanceRecords.filter(
      (r) => r.status === "Present" || r.status === "Late"
    ).length;
    
    const lateCount = attendanceRecords.filter((r) => r.status === "Late").length;
    
    // Count leave days by type (from attendance records)
    let sickLeaveDays = attendanceRecords.filter(
      (r) => r.status === "Leave" && r.leaveType === "Sick Leave" && r.approved
    ).length;
    
    let casualLeaveDays = attendanceRecords.filter(
      (r) => r.status === "Leave" && r.leaveType === "Casual Leave" && r.approved
    ).length;
    
    let annualLeaveDays = attendanceRecords.filter(
      (r) => r.status === "Leave" && r.leaveType === "Annual Leave" && r.approved
    ).length;
    
    let emergencyLeaveDays = attendanceRecords.filter(
      (r) => r.status === "Leave" && r.leaveType === "Emergency Leave" && r.approved
    ).length;
    
    // Also count from LeaveApplication model (in case attendance not yet created)
    approvedLeaves.forEach(leave => {
      const leaveStart = new Date(Math.max(leave.startDate, actualStartDate));
      const leaveEnd = new Date(Math.min(leave.endDate, periodEnd));
      const days = Math.ceil((leaveEnd - leaveStart) / (1000 * 60 * 60 * 24)) + 1;
      
      switch (leave.leaveType) {
        case "Sick Leave": sickLeaveDays += days; break;
        case "Casual Leave": casualLeaveDays += days; break;
        case "Annual Leave": annualLeaveDays += days; break;
        case "Emergency Leave": emergencyLeaveDays += days; break;
      }
    });
    
    const totalLeaveDays = sickLeaveDays + casualLeaveDays + annualLeaveDays + emergencyLeaveDays;
    
    const totalHours = attendanceRecords.reduce(
      (sum, r) => sum + (r.workingHours || 0),
      0
    );
    const overtimeHours = attendanceRecords.reduce(
      (sum, r) => sum + (r.overtimeHours || 0),
      0
    );

    // Calculate working days in the period (excluding weekends)
    const totalWorkingDays = calculateWorkingDays(actualStartDate, periodEnd);
    
    // Calculate absences
    // Method 1: Count explicit "Absent" records
    const explicitAbsent = attendanceRecords.filter((r) => r.status === "Absent").length;
    
    // Method 2: Calculate missing days (working days - days with records)
    const daysWithRecords = daysWorked + explicitAbsent + totalLeaveDays;
    const missingDays = Math.max(0, totalWorkingDays - daysWithRecords);
    
    // Total absent = explicit absent + missing days
    const daysAbsent = explicitAbsent + missingDays;
    
    console.log(`Absence calculation: Explicit=${explicitAbsent}, Missing=${missingDays}, Total Absent=${daysAbsent}`);
    
    console.log(`Attendance Summary: Worked=${daysWorked}, Absent=${daysAbsent}, Leaves=${totalLeaveDays}, Working Days=${totalWorkingDays}`);

    // Calculate salary based on salary type
    let calculatedSalary = 0;
    let overtimeAmount = 0;
    let absenceDeduction = 0;
    let calculationFormula = "";
    let dailyRate = 0;
    let hourlyRate = 0;

    // Get employee's basic salary
    const basicSalaryValue = employee.basicSalary || 0;
    const salaryType = employee.salaryType || "fixed";

    console.log(`Calculating salary for type: ${salaryType}, basic salary: ${basicSalaryValue}`);

    if (salaryType === "fixed") {
      // Fixed Salary Calculation
      const monthDays = new Date(year, month, 0).getDate();
      
      // Start with full basic salary
      calculatedSalary = basicSalaryValue;
      dailyRate = basicSalaryValue / monthDays;
      
      // Deduct only for unapproved absences
      // Sick leave and casual leave are typically paid - NO deduction
      // Annual and Emergency leaves might be unpaid - deduct if not approved
      const paidLeaveDays = sickLeaveDays + casualLeaveDays;
      const unpaidLeaveDays = annualLeaveDays + emergencyLeaveDays;
      
      // Only absences without approved leave cause deduction
      const deductibleDays = daysAbsent;
      absenceDeduction = deductibleDays * dailyRate;
      
      calculatedSalary = calculatedSalary - absenceDeduction;
      
      calculationFormula = `₹${basicSalaryValue} - (₹${dailyRate.toFixed(2)} × ${deductibleDays} absent days)`;
      
      console.log(`Fixed salary: Basic=${basicSalaryValue}, DailyRate=${dailyRate.toFixed(2)}, AbsentDays=${deductibleDays}, Deduction=${absenceDeduction.toFixed(2)}, Final=${calculatedSalary.toFixed(2)}`);
    } else if (salaryType === "daily") {
      // Daily Basis Salary Calculation
      dailyRate = basicSalaryValue;
      
      // Pay for days worked + paid leaves (Sick + Casual)
      const paidLeaveDays = sickLeaveDays + casualLeaveDays;
      const totalPaidDays = daysWorked + paidLeaveDays;
      
      calculatedSalary = dailyRate * totalPaidDays;
      absenceDeduction = 0; // No deduction concept for daily basis
      
      calculationFormula = `₹${dailyRate} × ${totalPaidDays} days (${daysWorked} worked + ${paidLeaveDays} paid leaves)`;
      
      console.log(`Daily salary: Rate=${dailyRate}, Days=${totalPaidDays}, Total=${calculatedSalary.toFixed(2)}`);
    } else if (salaryType === "hourly") {
      // Hourly Basis Salary Calculation
      hourlyRate = basicSalaryValue;
      
      calculatedSalary = hourlyRate * totalHours;
      overtimeAmount = (hourlyRate * 1.5) * overtimeHours; // 1.5x for overtime
      absenceDeduction = 0; // No deduction concept for hourly
      
      calculationFormula = `(₹${hourlyRate} × ${totalHours} hrs) + (₹${(hourlyRate * 1.5).toFixed(2)} × ${overtimeHours} OT hrs)`;
      
      console.log(`Hourly salary: Rate=${hourlyRate}, Hours=${totalHours}, OT=${overtimeHours}, Total=${calculatedSalary.toFixed(2)} + OT=${overtimeAmount.toFixed(2)}`);
    } else {
      // Default: use fixed salary calculation
      calculatedSalary = basicSalaryValue;
      dailyRate = basicSalaryValue / totalWorkingDays;
      calculationFormula = `Default fixed: ₹${basicSalaryValue}`;
      console.log(`Default salary calculation: ${calculatedSalary}`);
    }

    console.log(`Final calculated salary: ${calculatedSalary.toFixed(2)}, Overtime: ${overtimeAmount.toFixed(2)}, Deduction: ${absenceDeduction.toFixed(2)}`);

    // Calculate allowances and deductions
    const hra = employee.hra || 0;
    const conveyance = employee.conveyance || 0;
    const medicalAllowance = employee.medicalAllowance || 0;
    const specialAllowance = employee.specialAllowance || 0;
    const pf = employee.pf || 0;
    const professionalTax = employee.professionalTax || 0;
    const tds = employee.tds || 0;
    const otherDeductions = employee.otherDeductions || 0;

    // Calculate gross salary
    const grossSalary = calculatedSalary + hra + conveyance + medicalAllowance + specialAllowance + overtimeAmount;

    // Calculate total deductions
    const totalDeductionsAmount = pf + professionalTax + tds + otherDeductions;

    // Calculate net salary
    const netSalary = Math.max(0, grossSalary - totalDeductionsAmount);

    console.log(`Calculated: grossSalary=${grossSalary}, totalDeductions=${totalDeductionsAmount}, netSalary=${netSalary}`);

    // Create salary slip with enhanced fields
    const salarySlip = new SalarySlip({
      employee: employeeId,
      employeeId: employee.empId || employee.employeeId,
      employeeName: employee.name,
      department: employee.department,
      designation: employee.designation || employee.position,
      
      month,
      year,
      periodStart: actualStartDate,
      periodEnd: periodEnd,
      
      salaryType: employee.salaryType || "fixed",
      baseSalary: basicSalaryValue,
      
      // Attendance metrics
      workingDays: totalWorkingDays,
      daysWorked,
      daysAbsent,
      lateCount,
      hoursWorked: totalHours,
      overtimeHours,
      
      // Leave breakdown
      sickLeaveDays,
      casualLeaveDays,
      annualLeaveDays,
      emergencyLeaveDays,
      totalLeaveDays,
      
      // Calculated salary
      basicSalary: calculatedSalary,
      hra,
      conveyance,
      medicalAllowance,
      specialAllowance,
      overtimeAmount,
      
      // Deductions
      pf,
      professionalTax,
      tds,
      absenceDeduction,
      otherDeductions,
      
      // Calculation breakdown
      calculationBreakdown: {
        dailyRate: dailyRate,
        hourlyRate: hourlyRate,
        daysCalculated: totalWorkingDays,
        hoursCalculated: totalHours,
        formula: calculationFormula,
        deductionDetails: `${daysAbsent} unapproved absence(s): ₹${absenceDeduction.toFixed(2)}; ${totalLeaveDays} approved leave(s): No deduction`
      },
      
      // Bank details
      bankName: employee.bankName,
      accountNumber: employee.accountNumber,
      ifscCode: employee.ifscCode,
      branch: employee.branch,
      
      status: "generated",
      generatedDate: new Date(),
    });

    console.log("Saving salary slip to database...");
    await salarySlip.save();
    console.log("Salary slip saved successfully");
    return salarySlip;
  } catch (error) {
    console.error("Error in generateSalarySlipForEmployee:", error);
    console.error("Error details:", error.message);
    console.error("Stack trace:", error.stack);
    throw new Error(`Failed to generate salary slip: ${error.message}`);
  }
};

// Helper function to generate salary slip HTML
const generateSalarySlipHTML = (salarySlip) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Salary Slip - ${salarySlip.employeeName}</title>
        <style>
            body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                margin: 0;
                padding: 20px;
                background: #f5f5f5;
            }
            .container {
                background: white;
                padding: 30px;
                max-width: 800px;
                margin: 0 auto;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                border-radius: 8px;
            }
            .header { 
                text-align: center; 
                margin-bottom: 30px;
                border-bottom: 3px solid #1e40af;
                padding-bottom: 20px;
            }
            .company-name { 
                font-size: 32px; 
                font-weight: bold; 
                color: #1e40af;
                margin-bottom: 8px;
                letter-spacing: 1px;
            }
            .company-address {
                font-size: 12px;
                color: #666;
                margin-top: 5px;
                line-height: 1.6;
            }
            .slip-title { 
                font-size: 18px; 
                margin: 10px 0;
                color: #666;
                font-weight: 500;
            }
            .employee-info { 
                margin: 20px 0;
                background: #f8f9fa;
                padding: 15px;
                border-radius: 5px;
                border-left: 4px solid #1e40af;
            }
            .employee-info p {
                margin: 5px 0;
                color: #333;
            }
            .salary-table { 
                width: 100%; 
                border-collapse: collapse; 
                margin: 20px 0;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .salary-table th { 
                background-color: #1e40af;
                color: white;
                padding: 12px;
                text-align: left;
                font-weight: 600;
            }
            .salary-table td { 
                border: 1px solid #e0e0e0; 
                padding: 10px; 
                text-align: left;
            }
            .salary-table tr:nth-child(even) {
                background-color: #f9fafb;
            }
            .total-row { 
                font-weight: bold; 
                background-color: #eff6ff;
                border-top: 2px solid #1e40af;
            }
            .total-row td {
                padding: 12px;
                font-size: 14px;
            }
            .footer { 
                margin-top: 30px; 
                text-align: center; 
                font-size: 11px; 
                color: #888;
                border-top: 1px solid #e0e0e0;
                padding-top: 15px;
            }
            .net-salary {
                background: #1e40af;
                color: white;
                padding: 15px;
                border-radius: 5px;
                text-align: center;
                font-size: 20px;
                font-weight: bold;
                margin-top: 20px;
            }
        </style>
    </head>
    <body>
        <div class="container">
        <div class="header">
            <div class="company-name">Hotel Virat</div>
            <div class="company-address">
                2275, Rns Shanthi Nivas, Goraguntepalya, Mahalakshmipuram, Yeshwantpur,<br>
                Near Rns Motors, Yeshwanthpur-560022
            </div>
            <div class="slip-title">Salary Slip for ${getMonthName(
              salarySlip.month
            )} ${salarySlip.year}</div>
        </div>
        
        <div class="employee-info">
            <p><strong>Employee Name:</strong> ${salarySlip.employeeName}</p>
            <p><strong>Employee ID:</strong> ${salarySlip.employeeId}</p>
            <p><strong>Department:</strong> ${
              salarySlip.employee?.department || "N/A"
            }</p>
            <p><strong>Designation:</strong> ${
              salarySlip.employee?.designation || "N/A"
            }</p>
        </div>
        
        <table class="salary-table">
            <tr>
                <th>Earnings</th>
                <th>Amount (₹)</th>
                <th>Deductions</th>
                <th>Amount (₹)</th>
            </tr>
            <tr>
                <td>Basic Salary</td>
                <td>${salarySlip.basicSalary.toFixed(2)}</td>
                <td>Provident Fund</td>
                <td>${salarySlip.pf.toFixed(2)}</td>
            </tr>
            <tr>
                <td>HRA</td>
                <td>${salarySlip.hra.toFixed(2)}</td>
                <td>Professional Tax</td>
                <td>${salarySlip.professionalTax.toFixed(2)}</td>
            </tr>
            <tr>
                <td>Conveyance</td>
                <td>${salarySlip.conveyance.toFixed(2)}</td>
                <td>TDS</td>
                <td>${salarySlip.tds.toFixed(2)}</td>
            </tr>
            <tr>
                <td>Medical Allowance</td>
                <td>${salarySlip.medicalAllowance.toFixed(2)}</td>
                <td>Other Deductions</td>
                <td>${salarySlip.otherDeductions.toFixed(2)}</td>
            </tr>
            <tr>
                <td>Special Allowance</td>
                <td>${salarySlip.specialAllowance.toFixed(2)}</td>
                <td></td>
                <td></td>
            </tr>
            <tr>
                <td>Overtime Amount</td>
                <td>${salarySlip.overtimeAmount.toFixed(2)}</td>
                <td></td>
                <td></td>
            </tr>
            <tr class="total-row">
                <td><strong>Gross Salary</strong></td>
                <td><strong>₹${salarySlip.grossSalary.toFixed(2)}</strong></td>
                <td><strong>Total Deductions</strong></td>
                <td><strong>₹${salarySlip.totalDeductions.toFixed(
                  2
                )}</strong></td>
            </tr>
        </table>
        
        <div class="net-salary">
            Net Salary: ₹${salarySlip.netSalary.toFixed(2)}
        </div>
        
        <div class="employee-info">
            <p><strong>Working Days:</strong> ${salarySlip.workingDays}</p>
            <p><strong>Days Worked:</strong> ${salarySlip.daysWorked}</p>
            <p><strong>Days Absent:</strong> ${salarySlip.daysAbsent}</p>
            <p><strong>Hours Worked:</strong> ${salarySlip.hoursWorked.toFixed(
              2
            )}</p>
            <p><strong>Overtime Hours:</strong> ${salarySlip.overtimeHours.toFixed(
              2
            )}</p>
            ${salarySlip.sickLeaveDays ? `<p><strong>Sick Leave Days:</strong> ${salarySlip.sickLeaveDays}</p>` : ''}
            ${salarySlip.casualLeaveDays ? `<p><strong>Casual Leave Days:</strong> ${salarySlip.casualLeaveDays}</p>` : ''}
            ${salarySlip.totalLeaveDays ? `<p><strong>Total Leave Days:</strong> ${salarySlip.totalLeaveDays}</p>` : ''}
        </div>
        
        <div class="footer">
            <p>This is a computer-generated salary slip and does not require a signature.</p>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
            <p>Hotel Virat - All rights reserved</p>
        </div>
        </div>
    </body>
    </html>
  `;
};

// Helper function to generate PDF
const generateSalarySlipPDF = async (salarySlip) => {
  const uploadsDir = path.join(__dirname, "../uploads/salary-slips");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filename = `salary-slip-${salarySlip.employeeId}-${salarySlip.month}-${salarySlip.year}.pdf`;
  const filepath = path.join(uploadsDir, filename);

  const html = generateSalarySlipHTML(salarySlip);

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(html);
  await page.pdf({ path: filepath, format: "A4" });
  await browser.close();

  return filepath;
};

// Helper function to calculate working days (excluding weekends)
const calculateWorkingDays = (startDate, endDate) => {
  let count = 0;
  const current = new Date(startDate);
  const end = new Date(endDate);
  
  while (current <= end) {
    const dayOfWeek = current.getDay();
    // Count only weekdays (Monday to Friday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
};

// Helper function to get month name
const getMonthName = (month) => {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return months[month - 1];
};

module.exports = {
  generateSalarySlip,
  generateAllSalarySlips,
  generateMonthlySalarySlips,
  getSalarySlips,
  getSalarySlipById,
  downloadSalarySlip,
  viewSalarySlip,
  getSalaryStats,
  getQueueStatus,
  clearAllSalarySlips,
  editSalarySlip,
  approveSalarySlip,
};
