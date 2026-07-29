
const express = require("express");
const router = express.Router();
const AttendanceRecord = require("../model/AttendanceRecord");
const Employee = require("../model/Employee");
const AttendanceMaster = require("../model/AttendanceMaster");

// Debug middleware
router.use((req, res, next) => {
  console.log(`[ATTENDANCE-RECORD] ${req.method} ${req.path}`);
  next();
});

// Get all employees for dropdown with pagination
router.get("/employees", async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', department = '' } = req.query;
    
    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { empId: { $regex: search, $options: "i" } }
      ];
    }
    if (department) {
      filter.department = { $regex: department, $options: "i" };
    }

    const total = await Employee.countDocuments(filter);
    const employees = await Employee.find(filter)
      .select("_id name empId designation department")
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      employees,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error("Get employees error:", error);
    res.status(500).json({ 
      message: "Error fetching employees", 
      error: error.message 
    });
  }
});

// Check-in employee
router.post("/checkin", async (req, res) => {
  console.log("=== CHECKIN ROUTE HIT ===");
  console.log("Request body:", req.body);
  
  try {
    const { employeeId, notes } = req.body;
    
    if (!employeeId) {
      return res.status(400).json({ 
        message: "Employee ID is required" 
      });
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already checked in today
    const existingAttendance = await AttendanceRecord.findOne({
      employeeId,
      date: today,
    });

    if (existingAttendance && existingAttendance.checkIn) {
      return res.status(400).json({ 
        message: "Already checked in today", 
        attendance: existingAttendance 
      });
    }

    // Get or create attendance master
    let master = await AttendanceMaster.findOne({ 
      employeeId, 
      isActive: true 
    }).populate('employeeId', 'name empId designation department');

    if (!master) {
      console.log("No attendance master found, creating default one...");
      
      // Get employee details
      const employee = await Employee.findById(employeeId);
      if (!employee) {
        return res.status(404).json({ 
          message: "Employee not found" 
        });
      }
      
      // Create default attendance master
      const newMaster = new AttendanceMaster({
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
        paidLeaveUsed: 0,
        isActive: true
      });
      
      master = await newMaster.save();
      await master.populate('employeeId', 'name empId designation department');
      
      console.log("Created new attendance master:", master._id);
    }

    // Parse shift start time
    const [startHour, startMinute] = master.shift.startTime.split(':').map(Number);
    const checkInTime = new Date();
    const standardStartTime = new Date(checkInTime);
    standardStartTime.setHours(startHour, startMinute, 0, 0);

    let lateMinutes = 0;
    if (checkInTime > standardStartTime) {
      lateMinutes = Math.round((checkInTime - standardStartTime) / (1000 * 60));
    }

    // Create or update attendance record
    const attendance = await AttendanceRecord.findOneAndUpdate(
      { employeeId, date: today },
      {
        checkIn: checkInTime,
        status: "present",
        lateMinutes,
        notes: notes || "",
        approved: true
      },
      { upsert: true, new: true, runValidators: true }
    ).populate("employeeId", "name empId designation department");

    console.log("=== CHECKIN SUCCESSFUL ===");
    res.status(200).json({
      message: "Checked in successfully",
      attendance
    });
  } catch (error) {
    console.error("Check-in error:", error);
    res.status(500).json({ 
      message: "Error checking in", 
      error: error.message 
    });
  }
});

// Check-out employee
router.post("/checkout", async (req, res) => {
  console.log("=== CHECKOUT ROUTE HIT ===");
  
  try {
    const { employeeId, notes } = req.body;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find today's attendance record
    const attendance = await AttendanceRecord.findOne({
      employeeId,
      date: today,
    }).populate("employeeId", "name empId designation department");

    if (!attendance) {
      return res.status(404).json({ 
        message: "No check-in record found for today" 
      });
    }

    if (attendance.checkOut) {
      return res.status(400).json({ 
        message: "Already checked out today", 
        attendance 
      });
    }

    // Get attendance master for shift timing
    const master = await AttendanceMaster.findOne({ 
      employeeId, 
      isActive: true 
    });

    const checkOutTime = new Date();
    let overtimeMinutes = 0;

    if (master) {
      // Parse shift end time
      const [endHour, endMinute] = master.shift.endTime.split(':').map(Number);
      const standardEndTime = new Date(checkOutTime);
      standardEndTime.setHours(endHour, endMinute, 0, 0);

      if (checkOutTime > standardEndTime) {
        overtimeMinutes = Math.round((checkOutTime - standardEndTime) / (1000 * 60));
      }
    }

    // Update attendance record
    attendance.checkOut = checkOutTime;
    attendance.overtimeMinutes = overtimeMinutes;
    if (notes) attendance.notes = notes;
    attendance.approved = true;

    await attendance.save();

    res.status(200).json({
      message: "Checked out successfully",
      attendance,
    });
  } catch (error) {
    console.error("Check-out error:", error);
    res.status(500).json({ 
      message: "Error checking out", 
      error: error.message 
    });
  }
});

// Get today's attendance for an employee
router.get("/today/:employeeId", async (req, res) => {
  try {
    const { employeeId } = req.params;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await AttendanceRecord.findOne({
      employeeId,
      date: today,
    }).populate("employeeId", "name empId designation department");

    res.status(200).json({ attendance });
  } catch (error) {
    console.error("Get today attendance error:", error);
    res.status(500).json({ 
      message: "Error fetching attendance", 
      error: error.message 
    });
  }
});

// Get employee attendance summary for week
router.get("/employee/:employeeId/weekly-summary", async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Start date and end date are required"
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const summary = await AttendanceRecord.getWeeklySummary(employeeId, start, end);

    res.status(200).json({
      success: true,
      summary
    });
  } catch (error) {
    console.error("Get weekly summary error:", error);
    res.status(500).json({ 
      success: false,
      message: "Error fetching weekly summary", 
      error: error.message 
    });
  }
});

// Get attendance summary for admin dashboard
router.get("/summary", async (req, res) => {
  try {
    const { 
      month, 
      year, 
      department, 
      page = 1, 
      limit = 10 
    } = req.query;

    // Calculate start and end dates for the selected month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    let employeeFilter = {};
    if (department) {
      employeeFilter.department = { $regex: department, $options: "i" };
    }

    // Get total employees count
    const totalEmployees = await Employee.countDocuments(employeeFilter);

    // Get attendance for all employees in the selected month
    const attendance = await AttendanceRecord.find({
      date: { $gte: startDate, $lte: endDate },
    }).populate("employeeId", "name empId designation department");

    // Calculate summary statistics
    let presentCount = 0;
    let absentCount = 0;
    let leaveCount = 0;
    let lateCount = 0;

    attendance.forEach(record => {
      if (record.status === "present") presentCount++;
      if (record.status === "absent") absentCount++;
      if (record.status === "leave") leaveCount++;
      if (record.lateMinutes > 0) lateCount++;
    });

    const averageAttendance = totalEmployees > 0 
      ? (presentCount / (totalEmployees * endDate.getDate())) * 100 
      : 0;

    res.status(200).json({
      summary: {
        totalEmployees,
        presentCount,
        absentCount,
        leaveCount,
        lateCount,
        averageAttendance: averageAttendance.toFixed(2),
      },
      attendance
    });
  } catch (error) {
    console.error("Get attendance summary error:", error);
    res.status(500).json({ 
      message: "Error fetching attendance summary", 
      error: error.message 
    });
  }
});

// Update attendance status
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, approved, leaveType } = req.body;

    const attendance = await AttendanceRecord.findByIdAndUpdate(
      id,
      {
        status,
        notes,
        approved,
        leaveType: status === "leave" ? leaveType : null
      },
      { new: true }
    ).populate("employeeId", "name empId designation department");

    if (!attendance) {
      return res.status(404).json({ 
        message: "Attendance record not found" 
      });
    }

    res.status(200).json({
      message: "Attendance updated successfully",
      attendance,
    });
  } catch (error) {
    console.error("Update attendance error:", error);
    res.status(500).json({ 
      message: "Error updating attendance", 
      error: error.message 
    });
  }
});

// Export attendance data
router.get("/export", async (req, res) => {
  try {
    const { startDate, endDate, format = "csv" } = req.query;

    const query = {};
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const attendance = await AttendanceRecord.find(query)
      .populate("employeeId", "name empId designation department")
      .sort({ date: 1, "employeeId.name": 1 });

    if (format === "csv") {
      const csvData = [];
      csvData.push([
        "Date", "Employee ID", "Name", "Designation", "Department", 
        "Check-In", "Check-Out", "Status", "Leave Type", 
        "Late Minutes", "Overtime Minutes", "Notes"
      ]);

      attendance.forEach(record => {
        csvData.push([
          record.date.toISOString().split('T')[0],
          record.employeeId.empId,
          record.employeeId.name,
          record.employeeId.designation,
          record.employeeId.department,
          record.checkIn ? record.checkIn.toTimeString().split(' ')[0] : "N/A",
          record.checkOut ? record.checkOut.toTimeString().split(' ')[0] : "N/A",
          record.status,
          record.leaveType || "",
          record.lateMinutes,
          record.overtimeMinutes,
          record.notes || ""
        ]);
      });

      const csvContent = csvData.map(row => row.join(",")).join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=attendance-${new Date().toISOString().split('T')[0]}.csv`);
      res.send("\uFEFF" + csvContent);
    } else {
      res.status(200).json({ attendance });
    }
  } catch (error) {
    console.error("Export attendance error:", error);
    res.status(500).json({ 
      message: "Error exporting attendance", 
      error: error.message 
    });
  }
});
// Get attendance records for an employee on a specific date
router.get("/employee/:employeeId/records", async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ 
        message: "Date parameter is required" 
      });
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const attendance = await AttendanceRecord.findOne({
      employeeId,
      date: {
        $gte: targetDate,
        $lte: endOfDay
      }
    }).populate("employeeId", "name empId designation department");

    res.status(200).json({ 
      attendance 
    });
  } catch (error) {
    console.error("Get employee records error:", error);
    res.status(500).json({ 
      message: "Error fetching employee records", 
      error: error.message 
    });
  }
});

// Add this new route for creating attendance records
router.post("/", async (req, res) => {
  try {
    const { employeeId, date, status, notes, approved, leaveType } = req.body;

    // Validate required fields
    if (!employeeId || !date || !status) {
      return res.status(400).json({
        message: "Employee ID, date, and status are required"
      });
    }

    // Check if record already exists for this date
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingRecord = await AttendanceRecord.findOne({
      employeeId,
      date: {
        $gte: targetDate,
        $lte: endOfDay
      }
    });

    if (existingRecord) {
      return res.status(400).json({
        message: "Attendance record already exists for this date"
      });
    }

    // Create new record
    const attendance = new AttendanceRecord({
      employeeId,
      date: targetDate,
      status,
      leaveType: status === "leave" ? leaveType : null,
      notes: notes || "",
      approved: approved !== undefined ? approved : true
    });

    await attendance.save();
    await attendance.populate("employeeId", "name empId designation department");

    res.status(201).json({
      message: "Attendance record created successfully",
      attendance
    });
  } catch (error) {
    console.error("Create attendance error:", error);
    res.status(500).json({
      message: "Error creating attendance record",
      error: error.message
    });
  }
});

module.exports = router;