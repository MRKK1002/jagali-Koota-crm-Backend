const SalarySlip = require("../model/SalarySlip");
const Employee = require("../model/EmployeeRegistration");
const AttendanceRecord = require("../model/AttendanceRecord");
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

// View salary slip as HTML
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

    const html = generateSalarySlipHTML(salarySlip);
    res.send(html);
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

    // Get attendance data for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const attendanceRecords = await AttendanceRecord.find({
      employee: employeeId,
      date: { $gte: startDate, $lte: endDate },
    });

    // Calculate attendance metrics
    const daysWorked = attendanceRecords.filter(
      (r) => r.status === "Present" || r.status === "Late"
    ).length;
    
    // Count leave days by type
    const sickLeaveDays = attendanceRecords.filter(
      (r) => r.status === "Leave" && r.leaveType === "Sick Leave"
    ).length;
    
    const casualLeaveDays = attendanceRecords.filter(
      (r) => r.status === "Leave" && r.leaveType === "Casual Leave"
    ).length;
    
    const otherLeaveDays = attendanceRecords.filter(
      (r) => r.status === "Leave" && 
      (r.leaveType === "Annual Leave" || r.leaveType === "Emergency Leave")
    ).length;
    
    const daysAbsent = attendanceRecords.filter(
      (r) => r.status === "Absent"
    ).length;
    
    const totalLeaveDays = sickLeaveDays + casualLeaveDays + otherLeaveDays;
    
    const totalHours = attendanceRecords.reduce(
      (sum, r) => sum + (r.workingHours || 0),
      0
    );
    const overtimeHours = attendanceRecords.reduce(
      (sum, r) => sum + (r.overtimeHours || 0),
      0
    );

    // Calculate salary based on salary type
    let calculatedSalary = 0;
    let overtimeAmount = 0;
    let salaryDeductions = 0;

    // Get employee's basic salary
    const basicSalaryValue = employee.basicSalary || employee.salary || 0;
    const salaryType = employee.salaryType || "fixed"; // Default to fixed if not specified

    console.log(`Calculating salary for type: ${salaryType}, basic salary: ${basicSalaryValue}`);

    if (salaryType === "fixed") {
      calculatedSalary = basicSalaryValue;
      
      // For fixed salary, deduct for unpaid leaves and absences
      // Sick leave and casual leave are typically paid leave, so no deduction
      // Other leaves (Annual, Emergency) are usually unpaid
      const totalPaidLeaveDays = sickLeaveDays + casualLeaveDays;
      const unpaidLeaveDays = otherLeaveDays;
      const totalDeductibleDays = daysAbsent + unpaidLeaveDays;
      
      // Calculate daily rate for deduction
      const daysInMonth = endDate.getDate();
      const dailyRate = calculatedSalary / daysInMonth;
      salaryDeductions = totalDeductibleDays * dailyRate;
      
      calculatedSalary = calculatedSalary - salaryDeductions;
      
      console.log(`Fixed salary calculation: ${calculatedSalary} with deductions: ${salaryDeductions}`);
    } else if (salaryType === "daily") {
      calculatedSalary = basicSalaryValue * daysWorked;
      // Also add paid leave days
      calculatedSalary += basicSalaryValue * (sickLeaveDays + casualLeaveDays);
      
      console.log(`Daily salary calculation: ${calculatedSalary} for ${daysWorked} days worked`);
    } else if (salaryType === "hourly") {
      calculatedSalary = basicSalaryValue * totalHours;
      overtimeAmount = basicSalaryValue * 1.5 * overtimeHours; // 1.5x for overtime
      
      console.log(`Hourly salary calculation: ${calculatedSalary} for ${totalHours} hours`);
    } else {
      // Default: use fixed salary calculation
      calculatedSalary = basicSalaryValue;
      console.log(`Default salary calculation (no type specified): ${calculatedSalary}`);
    }

    console.log(`Final calculated salary: ${calculatedSalary}, Overtime: ${overtimeAmount}`);

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

    // Create salary slip
    const salarySlip = new SalarySlip({
      employee: employeeId,
      employeeId: employee.empId,
      employeeName: employee.name,
      month,
      year,
      basicSalary: calculatedSalary,
      salaryType: employee.salaryType || "fixed",
      hra,
      conveyance,
      medicalAllowance,
      specialAllowance,
      overtimeAmount,
      pf,
      professionalTax,
      tds,
      otherDeductions,
      grossSalary, // Explicitly set this
      totalDeductions: totalDeductionsAmount, // Explicitly set this
      netSalary, // Explicitly set this
      workingDays: endDate.getDate(),
      daysWorked,
      daysAbsent,
      hoursWorked: totalHours,
      overtimeHours,
      bankName: employee.bankName,
      accountNumber: employee.accountNumber,
      ifscCode: employee.ifscCode,
      branch: employee.branch,
      status: "generated",
      // Add leave information
      sickLeaveDays,
      casualLeaveDays,
      otherLeaveDays,
      totalLeaveDays,
      salaryDeductions, // Store deduction amount for transparency
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
};
