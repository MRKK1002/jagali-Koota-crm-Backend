const SalarySlip = require('../model/SalarySlip');
const Employee = require('../model/EmployeeRegistration'); // Adjust path as needed

// Create a new salary slip
const createSalarySlip = async (req, res) => {
  try {
    const {
      employeeId,
      empId,
      month,
      basicSalary,
      hra,
      conveyance,
      medicalAllowance,
      specialAllowance,
      grossSalary,
      pf,
      professionalTax,
      tds,
      otherDeductions,
      totalDeductions,
      netSalary,
      remarks
    } = req.body;

    // Check if salary slip already exists for this employee and month
    const existingSalarySlip = await SalarySlip.findOne({ employeeId, month });
    if (existingSalarySlip) {
      return res.status(400).json({
        success: false,
        message: 'Salary slip already exists for this employee and month'
      });
    }

    // Verify employee exists
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const salarySlip = new SalarySlip({
      employeeId,
      empId,
      month,
      basicSalary,
      hra: hra || 0,
      conveyance: conveyance || 0,
      medicalAllowance: medicalAllowance || 0,
      specialAllowance: specialAllowance || 0,
      grossSalary,
      pf: pf || 0,
      professionalTax: professionalTax || 0,
      tds: tds || 0,
      otherDeductions: otherDeductions || 0,
      totalDeductions,
      netSalary,
      remarks
    });

    await salarySlip.save();

    // Populate employee details for response
    await salarySlip.populate('employeeId', 'name empId designation department');

    res.status(201).json({
      success: true,
      message: 'Salary slip created successfully',
      salarySlip
    });

  } catch (error) {
    console.error('Error creating salary slip:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get salary slips with optional filters
const getSalarySlips = async (req, res) => {
  try {
    const { month, year, employeeId, empId, status, page = 1, limit = 50 } = req.query;
    
    // Build query
    const query = {};
    
    // Handle month/year filtering - model uses separate numeric fields
    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);
    
    if (employeeId) query.employee = employeeId;
    if (empId) query.employeeId = empId;
    if (status) query.status = status;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const salarySlips = await SalarySlip.find(query)
      .populate('employee', 'name empId designation department bankName accountNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Transform response to match frontend expectations
    const transformedSlips = salarySlips.map(slip => ({
      ...slip.toObject(),
      employee: slip.employee ? {
        name: slip.employee.name || slip.employeeName,
        empId: slip.employee.empId || slip.employeeId,
        designation: slip.employee.designation,
        department: slip.employee.department
      } : {
        name: slip.employeeName,
        empId: slip.employeeId
      }
    }));

    const totalCount = await SalarySlip.countDocuments(query);

    res.json({
      success: true,
      data: transformedSlips, // Frontend expects 'data' not 'salarySlips'
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalCount,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching salary slips:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get single salary slip by ID
const getSalarySlipById = async (req, res) => {
  try {
    const { id } = req.params;

    const salarySlip = await SalarySlip.findById(id)
      .populate('employee', 'name empId designation department bankName accountNumber ifscCode branch dateOfJoining');

    if (!salarySlip) {
      return res.status(404).json({
        success: false,
        message: 'Salary slip not found'
      });
    }

    res.json({
      success: true,
      data: salarySlip // Frontend expects 'data'
    });

  } catch (error) {
    console.error('Error fetching salary slip:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update salary slip status (e.g., mark as paid)
const updateSalarySlipStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    const updateData = { status };
    if (remarks) updateData.remarks = remarks;
    if (status === 'Paid') updateData.paidDate = new Date();

    const salarySlip = await SalarySlip.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('employeeId', 'name empId designation department');

    if (!salarySlip) {
      return res.status(404).json({
        success: false,
        message: 'Salary slip not found'
      });
    }

    res.json({
      success: true,
      message: 'Salary slip updated successfully',
      salarySlip
    });

  } catch (error) {
    console.error('Error updating salary slip:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Generate salary slips for all employees for a given month
const generateMonthlySalarySlips = async (req, res) => {
  try {
    const { month } = req.body; // Format: "2025-09"
    
    if (!month) {
      return res.status(400).json({
        success: false,
        message: 'Month is required'
      });
    }

    // Get all active employees
    const employees = await Employee.find({ isActive: true });
    
    const results = {
      success: [],
      failed: [],
      existing: []
    };

    for (const employee of employees) {
      try {
        // Check if salary slip already exists
        const existing = await SalarySlip.findOne({
          employeeId: employee._id,
          month
        });

        if (existing) {
          results.existing.push({
            empId: employee.empId,
            name: employee.name,
            reason: 'Already exists'
          });
          continue;
        }

        // Calculate total deductions
        const totalDeductions = (employee.pf || 0) + 
                               (employee.professionalTax || 0) + 
                               (employee.tds || 0) + 
                               (employee.otherDeductions || 0);

        // Create salary slip
        const salarySlip = new SalarySlip({
          employeeId: employee._id,
          empId: employee.empId,
          month,
          basicSalary: employee.basicSalary,
          hra: employee.hra || 0,
          conveyance: employee.conveyance || 0,
          medicalAllowance: employee.medicalAllowance || 0,
          specialAllowance: employee.specialAllowance || 0,
          grossSalary: employee.grossSalary,
          pf: employee.pf || 0,
          professionalTax: employee.professionalTax || 0,
          tds: employee.tds || 0,
          otherDeductions: employee.otherDeductions || 0,
          totalDeductions,
          netSalary: employee.grossSalary - totalDeductions,
          generatedBy: 'System'
        });

        await salarySlip.save();
        
        results.success.push({
          empId: employee.empId,
          name: employee.name
        });

      } catch (error) {
        results.failed.push({
          empId: employee.empId,
          name: employee.name,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Salary slip generation completed for ${month}`,
      results: {
        totalEmployees: employees.length,
        successCount: results.success.length,
        failedCount: results.failed.length,
        existingCount: results.existing.length,
        details: results
      }
    });

  } catch (error) {
    console.error('Error generating monthly salary slips:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Edit salary slip
const editSalarySlip = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Find the salary slip
    const salarySlip = await SalarySlip.findById(id);
    if (!salarySlip) {
      return res.status(404).json({
        success: false,
        message: 'Salary slip not found'
      });
    }

    // Update allowed fields
    const allowedFields = [
      'basicSalary', 'hra', 'conveyance', 'medicalAllowance', 'specialAllowance',
      'pf', 'professionalTax', 'tds', 'otherDeductions',
      'daysWorked', 'daysAbsent'
    ];

    allowedFields.forEach(field => {
      if (updates[field] !== undefined && updates[field] !== null && updates[field] !== '') {
        salarySlip[field] = parseFloat(updates[field]) || 0;
      }
    });

    // The pre-save hook will automatically recalculate grossSalary, totalDeductions, and netSalary
    await salarySlip.save();

    // Populate employee details
    await salarySlip.populate('employee', 'name empId designation department');

    res.json({
      success: true,
      message: 'Salary slip updated successfully',
      data: salarySlip
    });

  } catch (error) {
    console.error('Error editing salary slip:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get salary slip statistics
const getSalarySlipStats = async (req, res) => {
  try {
    const { month, year } = req.query;
    
    let query = {};
    
    // Handle month/year filtering - model uses separate numeric fields
    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);
    
    const stats = await SalarySlip.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalNetSalary: { $sum: '$netSalary' }
        }
      }
    ]);

    const totalEmployees = await Employee.countDocuments({ isActive: true });
    const totalSlips = await SalarySlip.countDocuments(query);
    
    // Get current month stats
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    const currentMonthCount = await SalarySlip.countDocuments({ 
      month: currentMonth, 
      year: currentYear 
    });
    
    // Transform stats to match frontend expectations
    const byStatus = {};
    let totalAmount = 0;
    stats.forEach(stat => {
      byStatus[stat._id] = stat.count;
      totalAmount += stat.totalNetSalary || 0;
    });

    res.json({
      success: true,
      data: {
        currentMonth: currentMonthCount,
        totalGenerated: totalSlips,
        byStatus,
        totalAmount,
        totalEmployees
      }
    });

  } catch (error) {
    console.error('Error fetching salary slip stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  createSalarySlip,
  getSalarySlips,
  getSalarySlipById,
  updateSalarySlipStatus,
  editSalarySlip,
  generateMonthlySalarySlips,
  getSalarySlipStats
};