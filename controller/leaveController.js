const Leave = require("../model/Leave");
const Attendance = require("../model/Attendance");

// Get all leaves
exports.getAllLeaves = async (req, res) => {
  try {
    const { employeeId } = req.query;
    
    // Build query filter
    const filter = {};
    if (employeeId) {
      const mongoose = require('mongoose');
      filter.employeeId = new mongoose.Types.ObjectId(employeeId);
    }
    
    console.log('Fetching leaves with filter:', filter);
    
    const leaves = await Leave.find(filter)
      .sort({ createdAt: -1 })
      .populate("employeeId", "name employeeId email department designation")
      .lean();
    
    console.log('Found leaves:', leaves.length);
    
    // Transform the response to include employee name at root level
    const transformedLeaves = leaves.map(leave => ({
      ...leave,
      employeeName: leave.employeeId?.name || 'Unknown',
      employeeCode: leave.employeeId?.employeeId || 'N/A',
    }));
    
    res.status(200).json({
      success: true,
      data: transformedLeaves,
    });
  } catch (error) {
    console.error("Error fetching leaves:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching leaves",
      error: error.message,
    });
  }
};

// Get leave by ID
exports.getLeaveById = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id).populate("employeeId", "name employeeId");
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave not found",
      });
    }
    res.status(200).json({
      success: true,
      data: leave,
    });
  } catch (error) {
    console.error("Error fetching leave:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching leave",
      error: error.message,
    });
  }
};

// Create new leave request
exports.createLeave = async (req, res) => {
  try {
    const { employeeId, startDate, endDate, leaveType, reason } = req.body;

    console.log('Creating leave for employeeId:', employeeId);

    // Convert employeeId string to ObjectId
    const mongoose = require('mongoose');
    const employeeObjectId = new mongoose.Types.ObjectId(employeeId);
    
    // Verify employee exists
    const Employee = require('../model/Employee');
    const employee = await Employee.findById(employeeObjectId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found. Please logout and login again.',
      });
    }
    
    console.log('Found employee:', employee.name, employee.employeeId);

    // Convert dates to start of day for accurate comparison
    const newStartDate = new Date(startDate);
    newStartDate.setHours(0, 0, 0, 0);
    
    const newEndDate = new Date(endDate);
    newEndDate.setHours(23, 59, 59, 999);

    // Check if employee has already marked attendance for any date in the leave range
    const attendanceExists = await Attendance.findOne({
      employeeId: employeeObjectId,
      date: {
        $gte: newStartDate,
        $lte: newEndDate
      },
      status: { $in: ["Present", "Late"] } // Only check if employee was present or late
    });

    if (attendanceExists) {
      const attendanceDate = new Date(attendanceExists.date).toLocaleDateString();
      return res.status(400).json({
        success: false,
        message: `Cannot apply for leave. Attendance already marked for ${attendanceDate}. You cannot apply for leave on days you have already marked attendance.`,
      });
    }

    // Check for overlapping leaves for the same employee
    // Two date ranges overlap if: start1 <= end2 AND end1 >= start2
    const existingLeave = await Leave.findOne({
      employeeId: employeeObjectId,
      status: { $in: ["pending", "approved"] }, // Only check pending and approved leaves
      $and: [
        { startDate: { $lte: newEndDate } },
        { endDate: { $gte: newStartDate } }
      ]
    });

    if (existingLeave) {
      return res.status(400).json({
        success: false,
        message: `Leave already exists for this date range. Existing leave: ${new Date(existingLeave.startDate).toLocaleDateString()} to ${new Date(existingLeave.endDate).toLocaleDateString()} (${existingLeave.status})`,
        existingLeave: {
          startDate: existingLeave.startDate,
          endDate: existingLeave.endDate,
          leaveType: existingLeave.leaveType,
          status: existingLeave.status,
          reason: existingLeave.reason
        }
      });
    }

    const leave = new Leave({
      employeeId: employeeObjectId,
      leaveType,
      startDate: newStartDate,
      endDate: newEndDate,
      reason,
      status: 'pending'
    });
    
    await leave.save();
    res.status(201).json({
      success: true,
      message: "Leave request created successfully",
      data: leave,
    });
  } catch (error) {
    console.error("Error creating leave:", error);
    res.status(500).json({
      success: false,
      message: "Error creating leave",
      error: error.message,
    });
  }
};

// Update leave status
exports.updateLeave = async (req, res) => {
  try {
    const leave = await Leave.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Leave updated successfully",
      data: leave,
    });
  } catch (error) {
    console.error("Error updating leave:", error);
    res.status(500).json({
      success: false,
      message: "Error updating leave",
      error: error.message,
    });
  }
};

// Delete leave
exports.deleteLeave = async (req, res) => {
  try {
    const leave = await Leave.findByIdAndDelete(req.params.id);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Leave deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting leave:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting leave",
      error: error.message,
    });
  }
};
