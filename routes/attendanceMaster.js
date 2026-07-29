
const express = require("express");
const router = express.Router();
const AttendanceMaster = require("../model/AttendanceMaster");
const Employee = require("../model/Employee");
const AttendanceRecord = require("../model/AttendanceRecord");

// Debug middleware
router.use((req, res, next) => {
  console.log(`[ATTENDANCE-MASTER] ${req.method} ${req.path}`);
  next();
});

// Get all attendance masters with pagination
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      department = "",
      sortBy = "employeeName",
      sortOrder = "ascending"
    } = req.query;

    // Build filter
    const filter = { isActive: true };
    if (department) {
      filter.department = { $regex: department, $options: "i" };
    }
    if (search) {
      filter.$or = [
        { employeeName: { $regex: search, $options: "i" } },
        { empId: { $regex: search, $options: "i" } }
      ];
    }

    // Set up sorting
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "descending" ? -1 : 1;

    const total = await AttendanceMaster.countDocuments(filter);
    const masters = await AttendanceMaster.find(filter)
      .populate('employeeId', 'name empId designation department')
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    res.status(200).json({
      success: true,
      data: masters,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error("Get attendance masters error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching attendance masters",
      error: error.message
    });
  }
});

// Get attendance master by ID with detailed attendance
router.get("/:id", async (req, res) => {
  try {
    const master = await AttendanceMaster.findById(req.params.id)
      .populate('employeeId', 'name empId designation department')
      .lean();

    if (!master) {
      return res.status(404).json({
        success: false,
        message: "Attendance master not found"
      });
    }

    // Get recent attendance records
    const recentAttendance = await AttendanceRecord.find({
      employeeId: master.employeeId._id,
      date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    })
    .populate('employeeId', 'name empId')
    .sort({ date: -1 })
    .limit(10);

    res.status(200).json({
      success: true,
      data: {
        ...master,
        recentAttendance
      }
    });
  } catch (error) {
    console.error("Get attendance master error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching attendance master",
      error: error.message
    });
  }
});

// Create attendance master
router.post("/", async (req, res) => {
  try {
    const { 
      empId, 
      employeeName, 
      department, 
      shift, 
      workingDaysPerMonth, 
      weeklyOffDays, 
      gracePeriod, 
      overtimeRate,
      employeeId
    } = req.body;

    // Validate employee exists
    const employee = await Employee.findById(employeeId || (await Employee.findOne({ empId })?._id));
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Check if already exists
    const existing = await AttendanceMaster.findOne({ 
      employeeId: employee._id, 
      isActive: true 
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Attendance master already exists for this employee'
      });
    }

    const attendanceMasterData = {
      empId: employee.empId,
      employeeId: employee._id,
      employeeName: employeeName || employee.name.trim(),
      department: department || employee.department,
      shift: shift || {
        type: 'Morning',
        startTime: '10:00',
        endTime: '18:00',
        breakDuration: 60
      },
      workingDaysPerMonth: workingDaysPerMonth || 26,
      weeklyOffDays: weeklyOffDays || ['Saturday', 'Sunday'],
      gracePeriod: gracePeriod || 15,
      overtimeRate: overtimeRate || 1.5,
      paidLeaveAllowance: 2,
      isActive: true
    };

    let attendanceMaster;

    // If updating existing (deactivated), update it
    const inactiveMaster = await AttendanceMaster.findOne({ 
      employeeId: employee._id, 
      isActive: false 
    });
    if (inactiveMaster) {
      Object.assign(inactiveMaster, attendanceMasterData);
      inactiveMaster.isActive = true;
      attendanceMaster = await inactiveMaster.save();
    } else {
      // Create new
      attendanceMaster = new AttendanceMaster(attendanceMasterData);
      await attendanceMaster.save();
    }

    res.status(201).json({
      success: true,
      data: attendanceMaster
    });
  } catch (error) {
    console.error('Create master error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating attendance master',
      error: error.message
    });
  }
});

// Update attendance master
router.put("/:id", async (req, res) => {
  try {
    const master = await AttendanceMaster.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('employeeId', 'name empId');

    if (!master) {
      return res.status(404).json({
        success: false,
        message: 'Attendance master not found'
      });
    }

    res.status(200).json({
      success: true,
      data: master
    });
  } catch (error) {
    console.error('Update master error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating attendance master',
      error: error.message
    });
  }
});

// Delete attendance master (soft delete)
router.delete("/:id", async (req, res) => {
  try {
    const master = await AttendanceMaster.findById(req.params.id);
    if (!master) {
      return res.status(404).json({
        success: false,
        message: 'Attendance master not found'
      });
    }

    master.isActive = false;
    await master.save();

    res.status(200).json({
      success: true,
      message: 'Attendance master deactivated successfully'
    });
  } catch (error) {
    console.error('Delete master error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deactivating attendance master',
      error: error.message
    });
  }
});

// Bulk create attendance masters
router.post("/bulk", async (req, res) => {
  try {
    const { empIds } = req.body;
    
    if (!empIds || !Array.isArray(empIds) || empIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'empIds array is required and cannot be empty'
      });
    }

    const createdMasters = [];
    const errors = [];
    let successCount = 0;

    for (const empId of empIds) {
      try {
        // Check if already exists and active
        const existingActive = await AttendanceMaster.findOne({ empId, isActive: true });
        if (existingActive) {
          continue;
        }

        // Get employee details
        const employee = await Employee.findOne({ empId }).lean();
        if (!employee) {
          errors.push({ empId, error: 'Employee not found' });
          continue;
        }

        const attendanceMasterData = {
          empId: employee.empId,
          employeeId: employee._id,
          employeeName: employee.name.trim(),
          department: employee.department,
          shift: {
            type: 'Morning',
            startTime: '10:00',
            endTime: '18:00',
            breakDuration: 60
          },
          workingDaysPerMonth: 26,
          weeklyOffDays: ['Saturday', 'Sunday'],
          gracePeriod: 15,
          overtimeRate: 1.5,
          paidLeaveAllowance: 2,
          isActive: true
        };

        // Check for inactive master
        const inactiveMaster = await AttendanceMaster.findOne({ empId, isActive: false });
        if (inactiveMaster) {
          Object.assign(inactiveMaster, attendanceMasterData);
          inactiveMaster.isActive = true;
          await inactiveMaster.save();
          createdMasters.push(inactiveMaster);
        } else {
          const master = new AttendanceMaster(attendanceMasterData);
          await master.save();
          createdMasters.push(master);
        }

        successCount++;
      } catch (error) {
        errors.push({ empId, error: error.message });
      }
    }

    res.status(201).json({
      success: true,
      count: createdMasters.length,
      successful: successCount,
      errors: errors.length,
      data: createdMasters,
      errorDetails: errors
    });
  } catch (error) {
    console.error('Bulk create error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating bulk attendance masters',
      error: error.message
    });
  }
});

// Get available employees count
router.get("/available/count", async (req, res) => {
  try {
    // Get all active masters
    const masters = await AttendanceMaster.find({ isActive: true }).select('empId').lean();
    const masterEmpIds = masters.map(m => m.empId);

    // Get all employees
    const employees = await Employee.find().lean();
    const availableEmployees = employees.filter(emp => !masterEmpIds.includes(emp.empId));

    res.status(200).json({
      success: true,
      count: availableEmployees.length,
      totalEmployees: employees.length,
      mastersCount: masters.length,
      data: availableEmployees.slice(0, 5) // Return first 5 for preview
    });
  } catch (error) {
    console.error('Error in getAvailableEmployeesCount:', error);
    res.status(200).json({
      success: true,
      count: 0,
      totalEmployees: 0,
      mastersCount: 0,
      fallback: true
    });
  }
});

// Get available employees for bulk creation
router.get("/available/employees", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      sortBy = 'name',
      sortOrder = 'ascending'
    } = req.query;

    // Get all active masters
    const masters = await AttendanceMaster.find({ isActive: true }).select('empId').lean();
    const masterEmpIds = masters.map(m => m.empId);

    // Get all employees
    let employees = await Employee.find().lean();

    // Filter out employees with masters
    let availableEmployees = employees.filter(emp => !masterEmpIds.includes(emp.empId));

    // Apply search
    if (search && search.trim()) {
      const searchTerm = search.trim().toLowerCase();
      availableEmployees = availableEmployees.filter(emp => 
        emp.name.toLowerCase().includes(searchTerm) ||
        emp.empId.toLowerCase().includes(searchTerm) ||
        emp.department.toLowerCase().includes(searchTerm) ||
        emp.designation.toLowerCase().includes(searchTerm)
      );
    }

    // Apply sorting
    availableEmployees.sort((a, b) => {
      let aVal = a[sortBy] || '';
      let bVal = b[sortBy] || '';
      
      if (sortBy === 'dateOfJoining') {
        aVal = new Date(a[sortBy] || 0);
        bVal = new Date(b[sortBy] || 0);
      } else {
        aVal = aVal.toString().toLowerCase();
        bVal = bVal.toString().toLowerCase();
      }
      
      if (sortOrder === 'ascending') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    // Apply pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedEmployees = availableEmployees.slice(startIndex, endIndex);

    res.status(200).json({
      success: true,
      count: paginatedEmployees.length,
      totalCount: availableEmployees.length,
      totalPages: Math.ceil(availableEmployees.length / limitNum),
      currentPage: pageNum,
      data: paginatedEmployees.map(emp => ({
        ...emp,
        // Remove sensitive fields
        bankName: undefined,
        accountNumber: undefined,
        ifscCode: undefined,
        branch: undefined,
        basicSalary: undefined,
        hra: undefined,
        conveyance: undefined,
        medicalAllowance: undefined,
        specialAllowance: undefined,
        pf: undefined,
        professionalTax: undefined,
        tds: undefined,
        otherDeductions: undefined,
        grossSalary: undefined,
        netSalary: undefined
      }))
    });
  } catch (error) {
    console.error('Error in getAvailableEmployeesForMaster:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching available employees',
      error: error.message
    });
  }
});


// Update the route to properly handle the daily processing
router.post("/process-daily", async (req, res) => {
  try {
    // Get the date from request body or use current date
    const date = req.body.date || new Date().toISOString().split('T')[0];
    
    // Process daily attendance
    const result = await AttendanceMaster.processDailyAttendance(date);
    
    res.status(200).json({
      success: true,
      message: `Processed daily attendance for ${date}`,
      recordsCreated: result.recordsCreated
    });
  } catch (error) {
    console.error('Process daily attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing daily attendance',
      error: error.message
    });
  }
});
// Manual trigger for daily attendance processing
router.post("/process-daily", async (req, res) => {
  try {
    const { date } = req.body;
    
    // Get all active masters
    const masters = await AttendanceMaster.find({ isActive: true }).lean();
    const updates = [];
    
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    
    for (const master of masters) {
      // Check if it's a working day
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = dayNames[targetDate.getDay()];
      const isWorkingDay = !master.weeklyOffDays.includes(dayName);
      
      if (!isWorkingDay) continue;
      
      // Check if attendance record already exists
      const startOfDay = new Date(targetDate);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      const existingRecord = await AttendanceRecord.findOne({
        employeeId: master.employeeId,
        date: {
          $gte: startOfDay,
          $lte: endOfDay
        }
      });
      
      if (!existingRecord) {
        // Create absent record
        updates.push({
          employeeId: master.employeeId,
          empId: master.empId,
          employeeName: master.employeeName,
          date: targetDate,
          status: 'absent',
          autoGenerated: true,
          approved: true,
          notes: 'Auto-generated absent record'
        });
      }
    }
    
    // Bulk insert missing attendance records
    let recordsCreated = 0;
    if (updates.length > 0) {
      await AttendanceRecord.insertMany(updates);
      recordsCreated = updates.length;
    }
    
    res.status(200).json({
      success: true,
      message: `Processed daily attendance for ${targetDate.toDateString()}`,
      recordsCreated,
      date: targetDate.toDateString()
    });
  } catch (error) {
    console.error('Process daily attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing daily attendance',
      error: error.message
    });
  }
});


module.exports = router;