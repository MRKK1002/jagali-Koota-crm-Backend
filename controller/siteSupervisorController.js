const SiteAttendance = require("../model/SiteAttendance");
const SiteLog = require("../model/SiteLog");
const ResourceRequest = require("../model/ResourceRequest");
const SiteIssue = require("../model/SiteIssue");

// ============ ATTENDANCE MANAGEMENT ============

// Mark attendance
exports.markAttendance = async (req, res) => {
  try {
    console.log("=== MARK ATTENDANCE REQUEST ===");
    console.log("Request body:", req.body);
    
    const {
      siteId,
      workerId,
      date,
      status,
      checkInTime,
      checkOutTime,
      hoursWorked,
      markedBy,
      notes,
    } = req.body;

    if (!siteId || !workerId || !date || !status) {
      console.log("Validation failed - missing required fields");
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields (siteId, workerId, date, status)",
      });
    }

    console.log("Checking for existing attendance...");


    // Check if attendance already exists
    const existingAttendance = await SiteAttendance.findOne({
      siteId,
      workerId,
      date: new Date(date),
    });

    if (existingAttendance) {
      console.log("Existing attendance found, updating...");
      // Update existing
      existingAttendance.status = status;
      existingAttendance.checkInTime = checkInTime;
      existingAttendance.checkOutTime = checkOutTime;
      existingAttendance.hoursWorked = hoursWorked;
      existingAttendance.notes = notes;
      await existingAttendance.save();

      console.log("Attendance updated successfully");
      return res.status(200).json({
        success: true,
        message: "Attendance updated successfully",
        data: existingAttendance,
      });
    }

    console.log("Creating new attendance record...");
    // Create new attendance
    const attendance = new SiteAttendance({
      siteId,
      workerId,
      date,
      status,
      checkInTime,
      checkOutTime,
      hoursWorked,
      markedBy,
      notes,
    });

    console.log("Saving attendance...");
    await attendance.save();
    console.log("Attendance saved successfully:", attendance._id);

    res.status(201).json({
      success: true,
      message: "Attendance marked successfully",
      data: attendance,
    });
  } catch (error) {
    console.error("=== ERROR MARKING ATTENDANCE ===");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Full error:", error);
    
    res.status(500).json({
      success: false,
      message: "Failed to mark attendance",
      error: error.message,
    });
  }
};

// Get attendance for a site
exports.getAttendanceBySite = async (req, res) => {
  try {
    const { siteId } = req.params;
    const { date, startDate, endDate } = req.query;

    let query = { siteId };

    if (date) {
      query.date = new Date(date);
    } else if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const attendance = await SiteAttendance.find(query)
      .populate("workerId", "name workerCode workerType")
      .populate("markedBy", "name employeeId")
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: attendance.length,
      data: attendance,
    });
  } catch (error) {
    console.error("Error fetching attendance:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch attendance",
      error: error.message,
    });
  }
};

// Update attendance (for check-out)
exports.updateAttendance = async (req, res) => {
  try {
    console.log("=== UPDATE ATTENDANCE REQUEST ===");
    console.log("Attendance ID:", req.params.id);
    console.log("Update data:", req.body);

    const attendance = await SiteAttendance.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found",
      });
    }

    console.log("Attendance updated successfully");
    res.status(200).json({
      success: true,
      message: "Attendance updated successfully",
      data: attendance,
    });
  } catch (error) {
    console.error("=== ERROR UPDATING ATTENDANCE ===");
    console.error("Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update attendance",
      error: error.message,
    });
  }
};

// ============ SITE LOGS ============

// Create site log
exports.createSiteLog = async (req, res) => {
  try {
    const {
      siteId,
      logDate,
      loggedBy,
      logType,
      title,
      description,
      workersInvolved,
      weatherCondition,
      temperature,
    } = req.body;

    if (!siteId || !logDate || !logType || !title || !description) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields (siteId, logDate, logType, title, description)",
      });
    }

    const log = new SiteLog({
      siteId,
      logDate,
      loggedBy,
      logType,
      title,
      description,
      workersInvolved,
      weatherCondition,
      temperature,
    });

    await log.save();

    res.status(201).json({
      success: true,
      message: "Site log created successfully",
      data: log,
    });
  } catch (error) {
    console.error("Error creating site log:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create site log",
      error: error.message,
    });
  }
};

// Get site logs
exports.getSiteLogsBySite = async (req, res) => {
  try {
    const { siteId } = req.params;
    const { startDate, endDate, logType } = req.query;

    let query = { siteId };

    if (logType) {
      query.logType = logType;
    }

    if (startDate && endDate) {
      query.logDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const logs = await SiteLog.find(query)
      .populate("loggedBy", "name employeeId")
      .populate("workersInvolved", "name employeeId")
      .sort({ logDate: -1 });

    res.status(200).json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    console.error("Error fetching site logs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch site logs",
      error: error.message,
    });
  }
};

// ============ RESOURCE REQUESTS ============

// Create resource request
exports.createResourceRequest = async (req, res) => {
  try {
    const {
      siteId,
      requestedBy,
      requestType,
      itemName,
      quantity,
      unit,
      urgency,
      requiredBy,
      reason,
    } = req.body;

    if (!siteId || !requestType || !itemName || !quantity || !unit || !requiredBy || !reason) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields (siteId, requestType, itemName, quantity, unit, requiredBy, reason)",
      });
    }

    const request = new ResourceRequest({
      siteId,
      requestedBy,
      requestType,
      itemName,
      quantity,
      unit,
      urgency,
      requiredBy,
      reason,
    });

    await request.save();

    res.status(201).json({
      success: true,
      message: "Resource request created successfully",
      data: request,
    });
  } catch (error) {
    console.error("Error creating resource request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create resource request",
      error: error.message,
    });
  }
};

// Get resource requests
exports.getResourceRequestsBySite = async (req, res) => {
  try {
    const { siteId } = req.params;
    const { status } = req.query;

    let query = { siteId };

    if (status) {
      query.status = status;
    }

    const requests = await ResourceRequest.find(query)
      .populate("requestedBy", "name employeeId")
      .populate("approvedBy", "name employeeId")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    console.error("Error fetching resource requests:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch resource requests",
      error: error.message,
    });
  }
};

// Update resource request
exports.updateResourceRequest = async (req, res) => {
  try {
    const request = await ResourceRequest.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Resource request not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Resource request updated successfully",
      data: request,
    });
  } catch (error) {
    console.error("Error updating resource request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update resource request",
      error: error.message,
    });
  }
};

// ============ ISSUE REPORTING ============

// Report issue
exports.reportIssue = async (req, res) => {
  try {
    const {
      siteId,
      issueType,
      severity,
      title,
      description,
      reportedBy,
      affectedPersons,
      location,
      immediateAction,
    } = req.body;

    if (!siteId || !issueType || !severity || !title || !description) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields (siteId, issueType, severity, title, description)",
      });
    }

    const issue = new SiteIssue({
      siteId,
      issueType,
      severity,
      title,
      description,
      reportedBy,
      affectedPersons,
      location,
      immediateAction,
    });

    await issue.save();

    res.status(201).json({
      success: true,
      message: "Issue reported successfully",
      data: issue,
    });
  } catch (error) {
    console.error("Error reporting issue:", error);
    res.status(500).json({
      success: false,
      message: "Failed to report issue",
      error: error.message,
    });
  }
};

// Get issues
exports.getIssuesBySite = async (req, res) => {
  try {
    const { siteId } = req.params;
    const { status, issueType, severity } = req.query;

    let query = { siteId };

    if (status) {
      query.status = status;
    }

    if (issueType) {
      query.issueType = issueType;
    }

    if (severity) {
      query.severity = severity;
    }

    const issues = await SiteIssue.find(query)
      .populate("reportedBy", "name employeeId")
      .populate("assignedTo", "name employeeId")
      .sort({ reportedDate: -1 });

    res.status(200).json({
      success: true,
      count: issues.length,
      data: issues,
    });
  } catch (error) {
    console.error("Error fetching issues:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch issues",
      error: error.message,
    });
  }
};

// Update issue
exports.updateIssue = async (req, res) => {
  try {
    const issue = await SiteIssue.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: "Issue not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Issue updated successfully",
      data: issue,
    });
  } catch (error) {
    console.error("Error updating issue:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update issue",
      error: error.message,
    });
  }
};
