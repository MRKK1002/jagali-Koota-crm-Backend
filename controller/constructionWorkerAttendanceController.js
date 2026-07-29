const ConstructionWorkerAttendance = require("../model/ConstructionWorkerAttendance");
const ConstructionWorker = require("../model/ConstructionWorker");
const mongoose = require("mongoose");

// Mark attendance
const markAttendance = async (req, res) => {
  try {
    const {
      workerId,
      siteId,
      date,
      status,
      checkInTime,
      checkOutTime,
      markedBy,
      notes,
      location,
    } = req.body;

    // Validate required fields
    if (!workerId || !siteId || !date || !status || !markedBy) {
      return res.status(400).json({
        success: false,
        message: "Worker ID, site ID, date, status, and marked by are required",
      });
    }

    // Get worker details for daily wage
    const worker = await ConstructionWorker.findById(workerId);
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker not found",
      });
    }

    // Parse date to ensure it's at start of day
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    // Check if attendance already exists for this worker on this date
    const existingAttendance = await ConstructionWorkerAttendance.findOne({
      workerId,
      date: attendanceDate,
    });

    let attendance;

    if (existingAttendance) {
      // Update existing attendance
      existingAttendance.status = status;
      existingAttendance.checkInTime =
        checkInTime || existingAttendance.checkInTime;
      existingAttendance.checkOutTime =
        checkOutTime || existingAttendance.checkOutTime;
      existingAttendance.markedBy = markedBy;
      existingAttendance.notes = notes || existingAttendance.notes;
      existingAttendance.location = location || existingAttendance.location;
      existingAttendance.dailyWage = worker.dailyWage;

      // Calculate working hours if both check-in and check-out times are provided
      if (existingAttendance.checkInTime && existingAttendance.checkOutTime) {
        const workingHours =
          (new Date(existingAttendance.checkOutTime) -
            new Date(existingAttendance.checkInTime)) /
          (1000 * 60 * 60);
        existingAttendance.workingHours = Math.max(0, workingHours);

        // Calculate overtime (assuming 8 hours is standard)
        existingAttendance.overtimeHours = Math.max(0, workingHours - 8);
      }

      attendance = await existingAttendance.save();
    } else {
      // Create new attendance record
      const attendanceData = {
        workerId,
        siteId,
        date: attendanceDate,
        status,
        checkInTime,
        checkOutTime,
        markedBy,
        notes,
        location,
        dailyWage: worker.dailyWage,
      };

      // Calculate working hours if both times are provided
      if (checkInTime && checkOutTime) {
        const workingHours =
          (new Date(checkOutTime) - new Date(checkInTime)) / (1000 * 60 * 60);
        attendanceData.workingHours = Math.max(0, workingHours);
        attendanceData.overtimeHours = Math.max(0, workingHours - 8);
      }

      attendance = new ConstructionWorkerAttendance(attendanceData);
      attendance = await attendance.save();
    }

    // Populate worker and site details
    await attendance.populate([
      { path: "workerId", select: "name phone trade" },
      { path: "siteId", select: "name location" },
    ]);

    res.status(200).json({
      success: true,
      message: `Attendance marked as ${status}`,
      data: attendance,
    });
  } catch (error) {
    console.error("Error marking attendance:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark attendance",
      error: error.message,
    });
  }
};

// Get attendance records
const getAttendance = async (req, res) => {
  try {
    const {
      date,
      siteId,
      workerId,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = req.query;

    let filter = {};

    // Date filtering
    if (date) {
      const queryDate = new Date(date);
      queryDate.setHours(0, 0, 0, 0);
      filter.date = queryDate;
    } else if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (siteId) filter.siteId = siteId;
    if (workerId) filter.workerId = workerId;
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const attendance = await ConstructionWorkerAttendance.find(filter)
      .populate("workerId", "name phone trade")
      .populate("siteId", "name location")
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ConstructionWorkerAttendance.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: attendance,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit),
      },
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

// Get attendance summary
const getAttendanceSummary = async (req, res) => {
  try {
    const { siteId, startDate, endDate, workerId } = req.query;

    let matchFilter = {};
    if (siteId) matchFilter.siteId = new mongoose.Types.ObjectId(siteId);
    if (workerId) matchFilter.workerId = new mongoose.Types.ObjectId(workerId);

    if (startDate && endDate) {
      matchFilter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    } else {
      // Default to current month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      matchFilter.date = { $gte: startOfMonth, $lte: endOfMonth };
    }

    const summary = await ConstructionWorkerAttendance.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          presentDays: {
            $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] },
          },
          absentDays: {
            $sum: { $cond: [{ $eq: ["$status", "Absent"] }, 1, 0] },
          },
          lateDays: {
            $sum: { $cond: [{ $eq: ["$status", "Late"] }, 1, 0] },
          },
          halfDays: {
            $sum: { $cond: [{ $eq: ["$status", "Half Day"] }, 1, 0] },
          },
          totalWorkingHours: { $sum: "$workingHours" },
          totalOvertimeHours: { $sum: "$overtimeHours" },
          totalEarnings: { $sum: "$totalEarnings" },
        },
      },
    ]);

    // Get daily breakdown
    const dailyBreakdown = await ConstructionWorkerAttendance.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            status: "$status",
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.date",
          statusBreakdown: {
            $push: {
              status: "$_id.status",
              count: "$count",
            },
          },
          totalWorkers: { $sum: "$count" },
        },
      },
      { $sort: { _id: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: summary[0] || {
          totalRecords: 0,
          presentDays: 0,
          absentDays: 0,
          lateDays: 0,
          halfDays: 0,
          totalWorkingHours: 0,
          totalOvertimeHours: 0,
          totalEarnings: 0,
        },
        dailyBreakdown,
      },
    });
  } catch (error) {
    console.error("Error fetching attendance summary:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch attendance summary",
      error: error.message,
    });
  }
};

// Bulk mark attendance
const bulkMarkAttendance = async (req, res) => {
  try {
    const { siteId, date, status, markedBy, workerIds } = req.body;

    if (
      !siteId ||
      !date ||
      !status ||
      !markedBy ||
      !workerIds ||
      !Array.isArray(workerIds)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Site ID, date, status, marked by, and worker IDs array are required",
      });
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const results = [];
    const errors = [];

    for (const workerId of workerIds) {
      try {
        // Get worker details
        const worker = await ConstructionWorker.findById(workerId);
        if (!worker) {
          errors.push({ workerId, error: "Worker not found" });
          continue;
        }

        // Check if attendance already exists
        let attendance = await ConstructionWorkerAttendance.findOne({
          workerId,
          date: attendanceDate,
        });

        if (attendance) {
          // Update existing
          attendance.status = status;
          attendance.markedBy = markedBy;
          attendance.dailyWage = worker.dailyWage;
          attendance = await attendance.save();
        } else {
          // Create new
          attendance = new ConstructionWorkerAttendance({
            workerId,
            siteId,
            date: attendanceDate,
            status,
            markedBy,
            dailyWage: worker.dailyWage,
          });
          attendance = await attendance.save();
        }

        results.push(attendance);
      } catch (error) {
        errors.push({ workerId, error: error.message });
      }
    }

    res.status(200).json({
      success: true,
      message: `Bulk attendance marked for ${results.length} workers`,
      data: {
        successful: results.length,
        failed: errors.length,
        results,
        errors,
      },
    });
  } catch (error) {
    console.error("Error in bulk mark attendance:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark bulk attendance",
      error: error.message,
    });
  }
};

module.exports = {
  markAttendance,
  getAttendance,
  getAttendanceSummary,
  bulkMarkAttendance,
};
