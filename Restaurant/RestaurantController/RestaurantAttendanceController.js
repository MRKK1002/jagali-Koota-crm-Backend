const AttendanceRecord = require("../RestautantModel/RestaurantAttendanceRecord");
const Employee = require("../RestautantModel/RestaurantEmployeeSchema");

// Get attendance records with advanced filtering
const getAttendance = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      employeeId,
      status,
      search,
      startDate,
      endDate,
      includeAbsent = "false",
      branch, // NEW: Branch filter
    } = req.query;

    // Build query
    const query = {};

    // Date range filter
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query.date.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    // Filter by businessType (default to restaurant for HRMS) - get restaurant employee IDs first
    const businessTypeFilter = req.query.businessType || "restaurant";
    const employeeQuery = { 
      status: "Active",
      businessType: businessTypeFilter 
    };
    
    // Add branch filter if provided
    if (branch) {
      employeeQuery.branch = branch;
    }
    
    const restaurantEmployees = await Employee.find(employeeQuery).select("_id").lean();
    const restaurantEmployeeIds = restaurantEmployees.map(emp => emp._id.toString());

    // Employee filter - if specific employeeId provided, ensure it's a restaurant employee
    if (employeeId && employeeId !== "All") {
      if (restaurantEmployeeIds.includes(employeeId.toString())) {
        query.employee = employeeId;
      } else {
        // Employee not found in restaurant employees, return empty
        query.employee = { $in: [] };
      }
    } else {
      // No specific employee filter - filter by all restaurant employees
      if (restaurantEmployeeIds.length > 0) {
        query.employee = { $in: restaurantEmployeeIds };
      } else {
        // If no restaurant employees, return empty result
        query.employee = { $in: [] };
      }
    }

    // Status filter
    if (status && status !== "All") {
      query.status = status;
    }

    // Search filter
    if (search) {
      query.$or = [
        { employeeName: { $regex: search, $options: "i" } },
        { empId: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let attendanceRecords = await AttendanceRecord.find(query)
      .populate("employee", "name empId employeeId designation department")
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await AttendanceRecord.countDocuments(query);

    // If includeAbsent is true and we're looking at today's data, add absent employees
    if (
      includeAbsent === "true" &&
      startDate &&
      endDate &&
      startDate === endDate
    ) {
      const targetDate = new Date(startDate);
      targetDate.setHours(0, 0, 0, 0);
      
      // Build employee filter for query
      let employeeFilter = {};
      if (employeeId && employeeId !== "All") {
        employeeFilter._id = employeeId;
      }
      
      // Build search filter
      let searchFilter = {};
      if (search) {
        searchFilter.$or = [
          { name: { $regex: search, $options: "i" } },
          { empId: { $regex: search, $options: "i" } },
        ];
      }
      
      // Combine filters - add businessType filter for HRMS (default to restaurant)
      const businessTypeFilter = req.query.businessType || "restaurant"; // HRMS routes default to restaurant
      const finalEmployeeFilter = {
        status: "Active",
        businessType: businessTypeFilter,
        ...employeeFilter,
        ...searchFilter,
      };
      
      const allEmployees = await Employee.find(finalEmployeeFilter).lean();

      // Get IDs of employees who have attendance (Present, Late, or Leave - not Absent)
      const presentEmployeeIds = attendanceRecords
        .filter((record) => 
          record.status === "Present" || 
          record.status === "Late" || 
          record.status === "Leave"
        )
        .map((record) => record.employee?._id?.toString())
        .filter((id) => id);

      // Find absent employees (no attendance record or have Absent status)
      const absentEmployees = allEmployees.filter(
        (emp) => !presentEmployeeIds.includes(emp._id.toString())
      );

      // Add absent records
      const absentRecords = absentEmployees.map((emp) => ({
        _id: `absent-${emp._id}-${targetDate.getTime()}`,
        employee: {
          _id: emp._id,
          name: emp.name,
          empId: emp.empId || emp.employeeId,
          employeeId: emp.employeeId || emp.empId,
          designation: emp.designation,
          department: emp.department,
        },
        empId: emp.empId || emp.employeeId,
        employeeName: emp.name,
        date: targetDate,
        status: "Absent",
        isAbsent: true,
        punchIn: null,
        punchOut: null,
        workingHours: 0,
        createdAt: new Date(),
      }));

      attendanceRecords = [...attendanceRecords, ...absentRecords];
    }

    // Calculate stats - use same businessType filter
    const stats = await calculateAttendanceStats(businessTypeFilter);

    res.json({
      success: true,
      attendance: attendanceRecords,
      total: attendanceRecords.length,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      ...stats,
    });
  } catch (error) {
    console.error("Error fetching attendance:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch attendance records",
      error: error.message,
    });
  }
};

// Get today's attendance
const getTodayAttendance = async (req, res) => {
  try {
    const { branch } = req.query; // NEW: Branch filter
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all active employees - filter by businessType (for HRMS, default to restaurant)
    const businessTypeFilter = req.query.businessType || "restaurant"; // HRMS routes default to restaurant
    const employeeQuery = { 
      status: "Active",
      businessType: businessTypeFilter 
    };
    
    // Add branch filter if provided
    if (branch) {
      employeeQuery.branch = branch;
    }
    
    const allEmployees = await Employee.find(employeeQuery).lean();

    // Get restaurant employee IDs
    const restaurantEmployeeIds = allEmployees.map(emp => emp._id);
    
    // Get attendance records for today - only for restaurant employees
    const attendanceRecords = await AttendanceRecord.find({
      date: {
        $gte: today,
        $lt: tomorrow,
      },
      employee: { $in: restaurantEmployeeIds }, // Only restaurant employees
    })
      .populate("employee", "name empId employeeId designation department")
      .sort({ createdAt: -1 })
      .lean();
    
    console.log("📊 Attendance records fetched:", attendanceRecords.map(r => ({
      id: r._id,
      employeeId: r.employee?._id,
      employeeName: r.employee?.name || r.employeeName,
      storedName: r.employeeName,
      populated: !!r.employee,
      punchIn: r.punchIn?.time,
      punchOut: r.punchOut?.time,
      status: r.status
    })));
    
    // Fix records where populate failed - use stored employeeName
    attendanceRecords.forEach(record => {
      if (!record.employee && record.employeeName) {
        record.employee = {
          name: record.employeeName,
          empId: record.empId,
          designation: "N/A",
          department: "N/A"
        };
      }
    });

    // Get employee IDs who have attendance records (Present, Late, or Leave)
    const presentEmployeeIds = attendanceRecords
      .filter((record) => 
        record.status === "Present" || 
        record.status === "Late" || 
        record.status === "Leave"
      )
      .map((record) => record.employee?._id?.toString())
      .filter((id) => id);

    // Find absent employees (no attendance record for today, excluding Leave)
    const absentEmployees = allEmployees.filter(
      (emp) => !presentEmployeeIds.includes(emp._id.toString())
    );

    // Create absent records for employees without attendance
    const absentRecords = absentEmployees.map((emp) => ({
      _id: `absent-${emp._id}-${today.getTime()}`,
      employee: {
        _id: emp._id,
        name: emp.name,
        empId: emp.empId || emp.employeeId,
        employeeId: emp.employeeId || emp.empId,
        designation: emp.designation,
        department: emp.department,
      },
      empId: emp.empId || emp.employeeId,
      employeeName: emp.name,
      date: today,
      status: "Absent",
      isAbsent: true,
      punchIn: null,
      punchOut: null,
      workingHours: 0,
      createdAt: new Date(),
    }));

    // Combine present and absent records
    const allAttendance = [...attendanceRecords, ...absentRecords];

    // Calculate stats correctly
    const presentToday = attendanceRecords.filter(
      (r) => r.status === "Present" || r.status === "Late"
    ).length;
    const lateToday = attendanceRecords.filter((r) => r.status === "Late").length;
    // Absent count should only include employees without any attendance (not Present, Late, or Leave)
    const absentToday = absentRecords.length;

    console.log("📤 Sending response with", allAttendance.length, "records");
    console.log("Sample record with punch out:", allAttendance.find(r => r.punchOut?.time));

    res.json({
      success: true,
      attendance: allAttendance,
      totalEmployees: allEmployees.length,
      presentToday,
      absentToday,
      lateToday,
    });
  } catch (error) {
    console.error("Error fetching today's attendance:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch today's attendance",
      error: error.message,
    });
  }
};

// Punch In
const punchIn = async (req, res) => {
  try {
    const { employeeId, location, faceVerified, coordinates } = req.body;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: "Employee ID is required",
      });
    }

    const employee = await Employee.findById(employeeId);
    console.log("🔍 Employee found:", employee ? {
      id: employee._id,
      name: employee.name,
      empId: employee.empId,
      employeeId: employee.employeeId
    } : "NOT FOUND");
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // Validate and ensure required employee fields exist
    if (!employee.name) {
      console.log("❌ Employee name is missing!");
      return res.status(400).json({
        success: false,
        message: "Employee name is missing in employee record. Please update the employee profile.",
      });
    }

    // Ensure empId and employeeId are set (required for attendance records)
    if (!employee.empId && !employee.employeeId) {
      try {
        // Generate based on businessType
        const count = await Employee.countDocuments();
        const generatedId = `${employee.businessType?.substring(0, 3).toUpperCase() || "EMP"}-${(count + 1).toString().padStart(4, "0")}`;
        employee.employeeId = generatedId;
        employee.empId = generatedId;
        await employee.save();
      } catch (saveError) {
        console.error("Error saving employee with auto-generated empId:", saveError);
        // Use fallback - will be set below
      }
    }
    // Ensure both fields are set (empId should match employeeId)
    if (!employee.empId) {
      employee.empId = employee.employeeId || `EMP-${employee._id.toString().substring(0, 8)}`;
    }
    if (!employee.employeeId) {
      employee.employeeId = employee.empId;
    }

    // Set today to start of day (midnight) UTC
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    console.log("Today date (UTC):", today.toISOString());
    console.log("Tomorrow date (UTC):", tomorrow.toISOString());

    // Check if already punched in today using a more precise query
    // Try multiple query strategies to find existing record
    let existingRecord = await AttendanceRecord.findOne({
      employee: employeeId,
      date: {
        $gte: today,
        $lt: tomorrow,
      },
    });

    // If not found with date range, try date component matching (UTC)
    if (!existingRecord) {
      const year = today.getUTCFullYear();
      const month = today.getUTCMonth() + 1; // MongoDB months are 1-12, JS months are 0-11
      const day = today.getUTCDate();
      
      existingRecord = await AttendanceRecord.findOne({
        employee: employeeId,
        $expr: {
          $and: [
            { $eq: [{ $year: "$date" }, year] },
            { $eq: [{ $month: "$date" }, month] },
            { $eq: [{ $dayOfMonth: "$date" }, day] },
          ],
        },
      });
    }

    // If record exists and already has punch-in, return error
    if (existingRecord && existingRecord.punchIn?.time) {
      console.log("❌ Already punched in:", {
        recordId: existingRecord._id,
        employeeName: existingRecord.employeeName,
        punchInTime: existingRecord.punchIn.time
      });
      return res.status(400).json({
        success: false,
        message: "Already punched in today",
      });
    }

    // If record exists and is on leave, return error
    if (existingRecord && existingRecord.status === "Leave") {
      return res.status(400).json({
        success: false,
        message: "Cannot punch in during leave period",
      });
    }
    
    // Determine if employee is late (default expected time: 9:00 AM, grace period: 15 minutes)
    // Use the 'now' variable already declared above
    const expectedStartTime = new Date(today);
    expectedStartTime.setHours(9, 0, 0, 0); // 9:00 AM
    const gracePeriodEnd = new Date(expectedStartTime);
    gracePeriodEnd.setMinutes(gracePeriodEnd.getMinutes() + 15); // 15 minutes grace period
    
    // Determine status based on punch-in time
    let status = "Present";
    if (now > gracePeriodEnd) {
      status = "Late";
    }
    
    const punchInData = {
      time: now,
      location: location || "Office",
      faceVerified: faceVerified || false,
      ipAddress: req.ip,
      device: req.get("User-Agent"),
    };

    if (coordinates) {
      punchInData.coordinates = coordinates;
    }

    // Ensure empId is set (use employeeId if empId doesn't exist)
    const empIdToUse = employee.empId || employee.employeeId || `EMP-TEMP-${employee._id.toString().substring(0, 8)}`;

    // Handle attendance record creation/update
    let attendanceRecord = existingRecord;

    if (attendanceRecord) {
      // Update existing record directly
      attendanceRecord.punchIn = punchInData;
      attendanceRecord.status = status;
      attendanceRecord.empId = empIdToUse;
      attendanceRecord.employeeName = employee.name;
      await attendanceRecord.save();
    } else {
      // Create new record
      try {
        console.log("📝 Creating attendance record:", {
          employeeId: employeeId,
          empId: empIdToUse,
          employeeName: employee.name
        });
        attendanceRecord = new AttendanceRecord({
          employee: employeeId,
          empId: empIdToUse,
          employeeName: employee.name,
          date: today,
          punchIn: punchInData,
          status: status,
        });
        await attendanceRecord.save();
        console.log("✅ Attendance record created:", attendanceRecord._id);
      } catch (createError) {
        // Handle duplicate key error - record was created between checks
        if (createError.code === 11000 || createError.name === "MongoServerError" || createError.message?.includes("duplicate")) {
          console.log("Duplicate key error, fetching existing record...");
          console.log("Searching for employee:", employeeId, "Date:", today.toISOString());
          
          // Strategy 1: Date range query
          attendanceRecord = await AttendanceRecord.findOne({
            employee: employeeId,
            date: {
              $gte: today,
              $lt: tomorrow,
            },
          });

          // Strategy 2: If not found, try date component matching (UTC)
          if (!attendanceRecord) {
            console.log("Date range query failed, trying date component match...");
            const year = today.getUTCFullYear();
            const month = today.getUTCMonth() + 1; // MongoDB months are 1-12, JS months are 0-11
            const day = today.getUTCDate();
            
            attendanceRecord = await AttendanceRecord.findOne({
              employee: employeeId,
              $expr: {
                $and: [
                  { $eq: [{ $year: "$date" }, year] },
                  { $eq: [{ $month: "$date" }, month] },
                  { $eq: [{ $dayOfMonth: "$date" }, day] },
                ],
              },
            });
          }

          // Strategy 3: Try without time constraints - find any record for this employee today
          if (!attendanceRecord) {
            console.log("Date component match failed, finding most recent record...");
            const allToday = await AttendanceRecord.find({
              employee: employeeId,
            })
              .sort({ date: -1 })
              .limit(5);
            
            console.log("Found", allToday.length, "records for employee");
            
            for (const record of allToday) {
              const recordDate = new Date(record.date);
              // Compare dates at UTC level (ignore time component)
              const recordDay = new Date(Date.UTC(
                recordDate.getUTCFullYear(),
                recordDate.getUTCMonth(),
                recordDate.getUTCDate()
              ));
              const todayDay = new Date(Date.UTC(
                today.getUTCFullYear(),
                today.getUTCMonth(),
                today.getUTCDate()
              ));
              
              if (recordDay.getTime() === todayDay.getTime()) {
                console.log("Found matching record:", record._id, "Date:", record.date);
                attendanceRecord = record;
                break;
              }
            }
          }

          if (!attendanceRecord) {
            const errorMsg = `Duplicate key error but could not find existing record. Employee: ${employeeId}, Date: ${today.toISOString()}. Please check database manually.`;
            console.error(errorMsg);
            console.error("Full error:", createError);
            // Instead of throwing, try to create again after a small delay (race condition)
            throw new Error("A record was created simultaneously. Please try again.");
          }

          // Check if already punched in
          if (attendanceRecord.punchIn?.time) {
            return res.status(400).json({
              success: false,
              message: "Already punched in today",
            });
          }

          // Check if on leave
          if (attendanceRecord.status === "Leave") {
            return res.status(400).json({
              success: false,
              message: "Cannot punch in during leave period",
            });
          }

          // Update the existing record
          attendanceRecord.punchIn = punchInData;
          attendanceRecord.status = status;
          attendanceRecord.empId = empIdToUse;
          attendanceRecord.employeeName = employee.name;
          await attendanceRecord.save();
        } else {
          // Re-throw other errors (validation, etc.)
          throw createError;
        }
      }
    }

    await attendanceRecord.populate(
      "employee",
      "name empId designation department"
    );

    res.json({
      success: true,
      message: "Punch in successful",
      attendance: attendanceRecord,
    });
  } catch (error) {
    const errorEmployeeId = req.body?.employeeId || "unknown";
    console.error("Error punching in:", error);
    console.error("Error stack:", error.stack);
    console.error("Error details:", {
      name: error.name,
      code: error.code,
      message: error.message,
      employeeId: errorEmployeeId,
    });
    
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      // Duplicate key error (unique constraint violation)
      return res.status(400).json({
        success: false,
        message: "Attendance record already exists for this employee today",
        error: error.message,
      });
    }
    
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(e => e.message).join(", ");
      console.error("Validation errors:", validationErrors);
      return res.status(400).json({
        success: false,
        message: "Validation error: " + validationErrors,
        error: error.message,
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Failed to punch in",
      error: error.message,
      errorName: error.name,
      errorCode: error.code,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

// Punch Out
const punchOut = async (req, res) => {
  try {
    const { employeeId, location, faceVerified, coordinates } = req.body;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: "Employee ID is required",
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log("🔍 Looking for attendance record to punch out:", {
      employeeId,
      dateRange: { from: today, to: tomorrow }
    });

    const attendanceRecord = await AttendanceRecord.findOne({
      employee: employeeId,
      date: {
        $gte: today,
        $lt: tomorrow,
      },
    });

    console.log("📋 Found attendance record:", attendanceRecord ? {
      id: attendanceRecord._id,
      employeeName: attendanceRecord.employeeName,
      punchIn: attendanceRecord.punchIn?.time,
      punchOut: attendanceRecord.punchOut?.time,
      status: attendanceRecord.status
    } : "NOT FOUND");

    if (!attendanceRecord) {
      return res.status(400).json({
        success: false,
        message: "No punch in record found for today",
      });
    }

    if (!attendanceRecord.punchIn?.time) {
      return res.status(400).json({
        success: false,
        message: "Must punch in before punching out",
      });
    }

    if (attendanceRecord.punchOut?.time) {
      console.log("❌ Already punched out at:", attendanceRecord.punchOut.time);
      return res.status(400).json({
        success: false,
        message: "Already punched out today",
      });
    }

    const now = new Date();
    const punchOutData = {
      time: now,
      location: location || "Office",
      faceVerified: faceVerified || false,
      ipAddress: req.ip,
      device: req.get("User-Agent"),
    };

    if (coordinates) {
      punchOutData.coordinates = coordinates;
    }

    console.log("💾 Saving punch out data:", {
      time: punchOutData.time,
      location: punchOutData.location,
      faceVerified: punchOutData.faceVerified
    });

    attendanceRecord.punchOut = punchOutData;
    await attendanceRecord.save();

    console.log("✅ Punch out saved successfully:", {
      id: attendanceRecord._id,
      punchIn: attendanceRecord.punchIn?.time,
      punchOut: attendanceRecord.punchOut?.time,
      workingHours: attendanceRecord.workingHours
    });

    await attendanceRecord.populate(
      "employee",
      "name empId designation department"
    );

    res.json({
      success: true,
      message: "Punch out successful",
      attendance: attendanceRecord,
    });
  } catch (error) {
    console.error("❌ Error punching out:", error);
    res.status(500).json({
      success: false,
      message: "Failed to punch out",
      error: error.message,
    });
  }
};

// Get attendance statistics
const getAttendanceStats = async (req, res) => {
  try {
    // Filter by businessType (default to restaurant for HRMS)
    const businessTypeFilter = req.query.businessType || "restaurant";
    const stats = await calculateAttendanceStats(businessTypeFilter);
    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error fetching attendance stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch attendance stats",
      error: error.message,
    });
  }
};

// Get employee attendance details
const getEmployeeAttendanceDetails = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { period = "month" } = req.query;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // Calculate date range based on period
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    let startDate;

    switch (period) {
      case "week":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "year":
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      default: // month
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
    }

    // Get attendance records
    const attendanceRecords = await AttendanceRecord.find({
      employee: employeeId,
      date: { $gte: startDate, $lte: now },
    }).sort({ date: -1 });

    // Calculate total working days in period (excluding weekends)
    const totalWorkingDays = calculateWorkingDays(startDate, now);

    // Calculate statistics
    const statistics = {
      presentDays: attendanceRecords.filter(
        (r) => r.status === "Present" || r.status === "Late"
      ).length,
      absentDays: attendanceRecords.filter((r) => r.status === "Absent").length,
      lateDays: attendanceRecords.filter((r) => r.status === "Late").length,
      leaveDays: attendanceRecords.filter((r) => r.status === "Leave").length,
      totalDays: attendanceRecords.length,
      totalWorkingDays: totalWorkingDays,
    };

    // Calculate leave breakdown by type
    const leaveBreakdown = {
      sickLeave: attendanceRecords.filter(
        (r) => r.status === "Leave" && r.leaveType === "Sick Leave"
      ).length,
      casualLeave: attendanceRecords.filter(
        (r) => r.status === "Leave" && r.leaveType === "Casual Leave"
      ).length,
      annualLeave: attendanceRecords.filter(
        (r) => r.status === "Leave" && r.leaveType === "Annual Leave"
      ).length,
      emergencyLeave: attendanceRecords.filter(
        (r) => r.status === "Leave" && r.leaveType === "Emergency Leave"
      ).length,
    };

    // Calculate attendance percentage (Present days / Total working days)
    statistics.attendancePercentage =
      statistics.totalWorkingDays > 0
        ? Math.round(
            (statistics.presentDays / statistics.totalWorkingDays) * 100
          )
        : 0;

    statistics.leaveBreakdown = leaveBreakdown;

    // Get leave records from attendance records
    const leaveRecords = attendanceRecords
      .filter((r) => r.status === "Leave")
      .map((r) => ({
        startDate: r.date,
        endDate: r.date,
        leaveType: r.leaveType,
        reason: r.leaveReason,
        status: r.approved ? "Approved" : "Pending",
        approved: r.approved,
      }));

    res.json({
      success: true,
      employee,
      period,
      statistics,
      attendanceRecords,
      leaveRecords,
    });
  } catch (error) {
    console.error("Error fetching employee attendance details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch employee attendance details",
      error: error.message,
    });
  }
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

// Apply for leave
const applyLeave = async (req, res) => {
  try {
    const { employeeId, startDate, endDate, leaveType, reason } = req.body;

    if (!employeeId || !startDate || !leaveType || !reason) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate || startDate);
    end.setHours(23, 59, 59, 999);

    // Create attendance records for each day of leave
    const attendanceRecords = [];
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const dateForRecord = new Date(currentDate);
      dateForRecord.setHours(0, 0, 0, 0);

      // Check if record already exists
      const existingRecord = await AttendanceRecord.findOne({
        employee: employeeId,
        date: {
          $gte: dateForRecord,
          $lt: new Date(dateForRecord.getTime() + 24 * 60 * 60 * 1000),
        },
      });

      if (existingRecord) {
        // Update existing record to Leave status
        existingRecord.status = "Leave";
        existingRecord.leaveType = leaveType;
        existingRecord.leaveReason = reason;
        existingRecord.approved = false; // Requires approval
        if (existingRecord.punchIn) {
          existingRecord.punchIn = null;
        }
        if (existingRecord.punchOut) {
          existingRecord.punchOut = null;
        }
        await existingRecord.save();
        attendanceRecords.push(existingRecord);
      } else {
        // Create new leave record
        const attendanceRecord = new AttendanceRecord({
          employee: employeeId,
          empId: employee.empId,
          employeeName: employee.name,
          date: dateForRecord,
          status: "Leave",
          leaveType,
          leaveReason: reason,
          approved: false, // Requires approval
        });
        await attendanceRecord.save();
        attendanceRecords.push(attendanceRecord);
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.json({
      success: true,
      message: `Leave application submitted successfully for ${attendanceRecords.length} day(s)`,
      attendance: attendanceRecords,
      count: attendanceRecords.length,
    });
  } catch (error) {
    console.error("Error applying for leave:", error);
    res.status(500).json({
      success: false,
      message: "Failed to apply for leave",
      error: error.message,
    });
  }
};

// Helper function to calculate attendance statistics
const calculateAttendanceStats = async (businessType = "restaurant") => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get restaurant employee IDs
    const restaurantEmployees = await Employee.find({ 
      status: "Active",
      businessType: businessType 
    }).select("_id").lean();
    const restaurantEmployeeIds = restaurantEmployees.map(emp => emp._id);

    const totalEmployees = restaurantEmployees.length;

    // Get attendance records only for restaurant employees
    const todayAttendance = await AttendanceRecord.find({
      date: { $gte: today, $lt: tomorrow },
      employee: { $in: restaurantEmployeeIds },
    });

    // Count present (includes Present and Late status)
    const presentToday = todayAttendance.filter(
      (r) => r.status === "Present" || r.status === "Late"
    ).length;
    const lateToday = todayAttendance.filter((r) => r.status === "Late").length;
    
    // Count employees with attendance (Present, Late, or Leave - these are NOT absent)
    const employeesWithAttendance = todayAttendance
      .filter((r) => 
        r.status === "Present" || 
        r.status === "Late" || 
        r.status === "Leave"
      )
      .map((r) => r.employee?.toString())
      .filter((id) => id);
    
    // Absent = Total employees - (Present + Late + Leave)
    const absentToday = Math.max(0, totalEmployees - employeesWithAttendance.length);

    return {
      totalEmployees,
      presentToday,
      lateToday,
      absentToday,
    };
  } catch (error) {
    console.error("Error calculating attendance stats:", error);
    return {
      totalEmployees: 0,
      presentToday: 0,
      lateToday: 0,
      absentToday: 0,
    };
  }
};

module.exports = {
  getAttendance,
  getTodayAttendance,
  punchIn,
  punchOut,
  getAttendanceStats,
  getEmployeeAttendanceDetails,
  applyLeave,

  // Legacy methods for backward compatibility
  getAllAttendance: getAttendance,
  createAttendance: punchIn,
  faceRecognitionPunchIn: punchIn,
  faceRecognitionPunchOut: punchOut,
};
