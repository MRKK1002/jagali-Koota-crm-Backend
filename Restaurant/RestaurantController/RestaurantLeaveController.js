const LeaveApplication = require("../RestautantModel/RestaurantLeaveApplication");
const Employee = require("../RestautantModel/RestaurantEmployeeSchema");
const AttendanceRecord = require("../RestautantModel/RestaurantAttendanceRecord");

// Apply for leave
const applyLeave = async (req, res) => {
  try {
    const { employeeId, leaveType, startDate, endDate, reason, employeeNotes, attachments } = req.body;

    if (!employeeId || !leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({
        success: false,
        message: "All fields are required: employeeId, leaveType, startDate, endDate, reason",
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
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Check for overlapping leave applications
    const overlapping = await LeaveApplication.checkOverlap(employeeId, start, end);
    if (overlapping) {
      return res.status(400).json({
        success: false,
        message: "Leave dates overlap with existing leave application",
        overlapping: overlapping,
      });
    }

    // Calculate total days
    const diffTime = Math.abs(end - start);
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const leaveApplication = new LeaveApplication({
      employee: employeeId,
      empId: employee.empId || employee.employeeId,
      employeeName: employee.name,
      leaveType,
      startDate: start,
      endDate: end,
      totalDays,
      reason,
      employeeNotes: employeeNotes || "",
      attachments: attachments || [],
      status: "Pending",
    });

    await leaveApplication.save();

    res.status(201).json({
      success: true,
      message: `Leave application submitted successfully for ${totalDays} day(s)`,
      data: leaveApplication,
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

// Get leave applications with filtering
const getLeaveApplications = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      employeeId,
      status,
      leaveType,
      search,
      startDate,
      endDate,
    } = req.query;

    const query = {};

    // Employee filter
    if (employeeId && employeeId !== "All") {
      query.employee = employeeId;
    }

    // Status filter
    if (status && status !== "All") {
      query.status = status;
    }

    // Leave type filter
    if (leaveType && leaveType !== "All") {
      query.leaveType = leaveType;
    }

    // Date range filter
    if (startDate || endDate) {
      query.$or = [];
      const dateQuery = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        dateQuery.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateQuery.$lte = end;
      }
      query.$or.push({ startDate: dateQuery });
      query.$or.push({ endDate: dateQuery });
    }

    // Search filter
    if (search) {
      query.$or = [
        { employeeName: { $regex: search, $options: "i" } },
        { empId: { $regex: search, $options: "i" } },
        { reason: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const leaveApplications = await LeaveApplication.find(query)
      .populate("employee", "name empId designation department")
      .populate("approvedBy", "name email")
      .sort({ appliedDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await LeaveApplication.countDocuments(query);

    res.json({
      success: true,
      data: leaveApplications,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error("Error fetching leave applications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch leave applications",
      error: error.message,
    });
  }
};

// Get single leave application
const getLeaveApplicationById = async (req, res) => {
  try {
    const leaveApplication = await LeaveApplication.findById(req.params.id)
      .populate("employee", "name empId designation department email phone")
      .populate("approvedBy", "name email");

    if (!leaveApplication) {
      return res.status(404).json({
        success: false,
        message: "Leave application not found",
      });
    }

    res.json({
      success: true,
      data: leaveApplication,
    });
  } catch (error) {
    console.error("Error fetching leave application:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch leave application",
      error: error.message,
    });
  }
};

// Approve leave
const approveLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;
    const userId = req.user?._id || req.body.userId; // Get from auth middleware

    const leaveApplication = await LeaveApplication.findById(id);

    if (!leaveApplication) {
      return res.status(404).json({
        success: false,
        message: "Leave application not found",
      });
    }

    if (leaveApplication.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: `Leave is already ${leaveApplication.status}`,
      });
    }

    // Approve the leave (this also creates attendance records)
    const result = await leaveApplication.approve(userId, adminNotes);

    res.json({
      success: true,
      message: `Leave approved successfully. ${result.attendanceRecords.length} attendance record(s) created.`,
      data: result.leave,
      attendanceRecords: result.attendanceRecords.length,
    });
  } catch (error) {
    console.error("Error approving leave:", error);
    res.status(500).json({
      success: false,
      message: "Failed to approve leave",
      error: error.message,
    });
  }
};

// Reject leave
const rejectLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const userId = req.user?._id || req.body.userId;

    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    const leaveApplication = await LeaveApplication.findById(id);

    if (!leaveApplication) {
      return res.status(404).json({
        success: false,
        message: "Leave application not found",
      });
    }

    if (leaveApplication.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: `Leave is already ${leaveApplication.status}`,
      });
    }

    await leaveApplication.reject(userId, rejectionReason);

    res.json({
      success: true,
      message: "Leave rejected successfully",
      data: leaveApplication,
    });
  } catch (error) {
    console.error("Error rejecting leave:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reject leave",
      error: error.message,
    });
  }
};

// Cancel leave application (by employee)
const cancelLeave = async (req, res) => {
  try {
    const { id } = req.params;

    const leaveApplication = await LeaveApplication.findById(id);

    if (!leaveApplication) {
      return res.status(404).json({
        success: false,
        message: "Leave application not found",
      });
    }

    if (leaveApplication.status === "Approved") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel approved leave. Please contact admin.",
      });
    }

    await LeaveApplication.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Leave application cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling leave:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel leave",
      error: error.message,
    });
  }
};

// Get pending leave applications
const getPendingLeaves = async (req, res) => {
  try {
    const pendingLeaves = await LeaveApplication.getPending();

    res.json({
      success: true,
      data: pendingLeaves,
      count: pendingLeaves.length,
    });
  } catch (error) {
    console.error("Error fetching pending leaves:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending leaves",
      error: error.message,
    });
  }
};

// Get employee leave history
const getEmployeeLeaveHistory = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { year } = req.query;

    const currentYear = year ? parseInt(year) : new Date().getFullYear();

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // Get all leave applications for the employee
    const leaveApplications = await LeaveApplication.find({
      employee: employeeId,
    })
      .sort({ appliedDate: -1 })
      .lean();

    // Get leave balance for current year
    const leaveBalance = await LeaveApplication.getLeaveBalance(employeeId, currentYear);

    // Calculate leave statistics
    const stats = {
      totalApplications: leaveApplications.length,
      pending: leaveApplications.filter((l) => l.status === "Pending").length,
      approved: leaveApplications.filter((l) => l.status === "Approved").length,
      rejected: leaveApplications.filter((l) => l.status === "Rejected").length,
      currentYearBalance: leaveBalance,
    };

    res.json({
      success: true,
      employee: {
        _id: employee._id,
        name: employee.name,
        empId: employee.empId || employee.employeeId,
        designation: employee.designation,
        department: employee.department,
      },
      leaveApplications,
      stats,
    });
  } catch (error) {
    console.error("Error fetching employee leave history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch employee leave history",
      error: error.message,
    });
  }
};

// Get leave balance for employee
const getLeaveBalance = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { year } = req.query;

    const currentYear = year ? parseInt(year) : new Date().getFullYear();

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const leaveBalance = await LeaveApplication.getLeaveBalance(employeeId, currentYear);

    // Define leave allowances (can be made configurable)
    const allowances = {
      sickLeave: 12,
      casualLeave: 12,
      annualLeave: 15,
      emergencyLeave: 5,
    };

    const balanceWithRemaining = {
      sickLeave: {
        used: leaveBalance.sickLeave,
        allowed: allowances.sickLeave,
        remaining: allowances.sickLeave - leaveBalance.sickLeave,
      },
      casualLeave: {
        used: leaveBalance.casualLeave,
        allowed: allowances.casualLeave,
        remaining: allowances.casualLeave - leaveBalance.casualLeave,
      },
      annualLeave: {
        used: leaveBalance.annualLeave,
        allowed: allowances.annualLeave,
        remaining: allowances.annualLeave - leaveBalance.annualLeave,
      },
      emergencyLeave: {
        used: leaveBalance.emergencyLeave,
        allowed: allowances.emergencyLeave,
        remaining: allowances.emergencyLeave - leaveBalance.emergencyLeave,
      },
      total: {
        used: leaveBalance.total,
        allowed: Object.values(allowances).reduce((a, b) => a + b, 0),
        remaining:
          Object.values(allowances).reduce((a, b) => a + b, 0) - leaveBalance.total,
      },
    };

    res.json({
      success: true,
      employeeId,
      year: currentYear,
      balance: balanceWithRemaining,
    });
  } catch (error) {
    console.error("Error fetching leave balance:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch leave balance",
      error: error.message,
    });
  }
};

// Get leave statistics
const getLeaveStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const query = {};
    if (startDate || endDate) {
      query.appliedDate = {};
      if (startDate) {
        query.appliedDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.appliedDate.$lte = new Date(endDate);
      }
    }

    const totalApplications = await LeaveApplication.countDocuments(query);
    const pending = await LeaveApplication.countDocuments({ ...query, status: "Pending" });
    const approved = await LeaveApplication.countDocuments({ ...query, status: "Approved" });
    const rejected = await LeaveApplication.countDocuments({ ...query, status: "Rejected" });

    // Leave type breakdown
    const typeBreakdown = await LeaveApplication.aggregate([
      { $match: query },
      { $group: { _id: "$leaveType", count: { $sum: 1 }, totalDays: { $sum: "$totalDays" } } },
    ]);

    res.json({
      success: true,
      stats: {
        totalApplications,
        byStatus: {
          pending,
          approved,
          rejected,
        },
        byType: typeBreakdown,
      },
    });
  } catch (error) {
    console.error("Error fetching leave stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch leave statistics",
      error: error.message,
    });
  }
};

// Validate leave application (check for attendance conflicts)
const validateLeaveApplication = async (req, res) => {
  try {
    const { employeeId, startDate, endDate } = req.body;

    if (!employeeId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "employeeId, startDate, and endDate are required",
      });
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Check for existing attendance records
    const attendanceRecords = await AttendanceRecord.find({
      employee: employeeId,
      date: { $gte: start, $lte: end },
    }).sort({ date: 1 });

    // Check for overlapping leaves
    const existingLeaves = await LeaveApplication.find({
      employee: employeeId,
      status: { $in: ["Pending", "Approved"] },
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } },
      ],
    });

    const hasAttendance = attendanceRecords.length > 0;
    const hasOverlap = existingLeaves.length > 0;

    res.json({
      success: true,
      hasAttendance,
      attendanceDetails: attendanceRecords.map(record => ({
        date: record.date,
        status: record.status,
        punchInTime: record.punchInTime,
        punchOutTime: record.punchOutTime,
      })),
      hasOverlap,
      overlappingLeaves: existingLeaves.map(leave => ({
        leaveType: leave.leaveType,
        startDate: leave.startDate,
        endDate: leave.endDate,
        status: leave.status,
      })),
    });
  } catch (error) {
    console.error("Error validating leave:", error);
    res.status(500).json({
      success: false,
      message: "Failed to validate leave application",
      error: error.message,
    });
  }
};

// Check leave status for a specific date
const checkLeaveStatus = async (req, res) => {
  try {
    const { employeeId, date } = req.params;

    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    const endOfDay = new Date(checkDate);
    endOfDay.setHours(23, 59, 59, 999);

    const leave = await LeaveApplication.findOne({
      employee: employeeId,
      status: "Approved",
      startDate: { $lte: endOfDay },
      endDate: { $gte: checkDate },
    });

    if (leave) {
      return res.json({
        success: true,
        hasLeave: true,
        leaveType: leave.leaveType,
        leaveDetails: leave,
      });
    }

    res.json({
      success: true,
      hasLeave: false,
    });
  } catch (error) {
    console.error("Error checking leave status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check leave status",
      error: error.message,
    });
  }
};

// Edit leave application (only pending leaves)
const editLeave = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { startDate, endDate, leaveType, reason } = req.body;

    const leave = await LeaveApplication.findById(leaveId);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave application not found",
      });
    }

    // Only allow editing of pending leaves
    if (leave.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: "Can only edit pending leave applications",
      });
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Check for overlapping leaves (excluding current leave)
    const overlapping = await LeaveApplication.findOne({
      _id: { $ne: leaveId },
      employee: leave.employee,
      status: { $in: ["Pending", "Approved"] },
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } },
      ],
    });

    if (overlapping) {
      return res.status(400).json({
        success: false,
        message: "New dates overlap with existing leave application",
      });
    }

    // Track edit history
    if (!leave.editHistory) {
      leave.editHistory = [];
    }

    leave.editHistory.push({
      field: "dates",
      oldValue: { startDate: leave.startDate, endDate: leave.endDate, leaveType: leave.leaveType },
      newValue: { startDate: start, endDate: end, leaveType },
      editedAt: new Date(),
    });

    leave.startDate = start;
    leave.endDate = end;
    leave.leaveType = leaveType;
    leave.reason = reason;
    leave.editedAt = new Date();

    await leave.save();

    res.json({
      success: true,
      message: "Leave updated successfully",
      data: leave,
    });
  } catch (error) {
    console.error("Error editing leave:", error);
    res.status(500).json({
      success: false,
      message: "Failed to edit leave",
      error: error.message,
    });
  }
};

// Get employee's own leaves
const getMyLeaves = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const leaves = await LeaveApplication.find({
      employee: employeeId,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: leaves,
    });
  } catch (error) {
    console.error("Error fetching my leaves:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch leaves",
      error: error.message,
    });
  }
};

module.exports = {
  applyLeave,
  getLeaveApplications,
  getLeaveApplicationById,
  approveLeave,
  rejectLeave,
  cancelLeave,
  getPendingLeaves,
  getEmployeeLeaveHistory,
  getLeaveBalance,
  getLeaveStats,
  validateLeaveApplication,
  checkLeaveStatus,
  editLeave,
  getMyLeaves,
};

