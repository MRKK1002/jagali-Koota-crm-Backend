const SiteTask = require("../model/SiteTask");
const DailyReport = require("../model/DailyReport");
const SiteAlert = require("../model/SiteAlert");
const Site = require("../model/Site");
const Employee = require("../model/Employee");

// ============ TASK MANAGEMENT ============

// Create task
exports.createTask = async (req, res) => {
  try {
    console.log("=== CREATE TASK REQUEST ===");
    console.log("Request body:", req.body);
    
    const {
      siteId,
      taskTitle,
      taskDescription,
      assignedTo,
      assignedToModel,
      assignedBy,
      priority,
      startDate,
      dueDate,
      estimatedHours,
    } = req.body;

    console.log("Extracted fields:", {
      siteId,
      taskTitle,
      assignedTo,
      assignedToModel,
      assignedBy,
      startDate,
      dueDate,
    });

    if (!siteId || !taskTitle || !assignedTo || !startDate || !dueDate) {
      console.log("Validation failed - missing required fields");
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields (siteId, taskTitle, assignedTo, startDate, dueDate)",
      });
    }

    const taskData = {
      siteId,
      taskTitle,
      taskDescription,
      assignedTo,
      assignedToModel: assignedToModel || "Worker", // Default to Worker
      assignedBy,
      priority,
      startDate,
      dueDate,
      estimatedHours,
    };

    console.log("Creating task with data:", taskData);
    const task = new SiteTask(taskData);

    console.log("Saving task...");
    await task.save();
    console.log("Task saved successfully:", task._id);

    res.status(201).json({
      success: true,
      message: "Task created successfully",
      data: task,
    });
  } catch (error) {
    console.error("=== ERROR CREATING TASK ===");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Error details:", error);
    
    res.status(500).json({
      success: false,
      message: "Failed to create task",
      error: error.message,
    });
  }
};

// Get all tasks for a site
exports.getTasksBySite = async (req, res) => {
  try {
    const { siteId } = req.params;
    const { status } = req.query;

    let query = { siteId };
    if (status) {
      query.status = status;
    }

    const tasks = await SiteTask.find(query)
      .populate("assignedTo", "name employeeId email")
      .populate("assignedBy", "name employeeId")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tasks",
      error: error.message,
    });
  }
};

// Update task
exports.updateTask = async (req, res) => {
  try {
    const task = await SiteTask.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Task updated successfully",
      data: task,
    });
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update task",
      error: error.message,
    });
  }
};

// Delete task
exports.deleteTask = async (req, res) => {
  try {
    const task = await SiteTask.findByIdAndDelete(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete task",
      error: error.message,
    });
  }
};

// ============ DAILY REPORTS ============

// Create daily report
exports.createDailyReport = async (req, res) => {
  try {
    console.log("=== CREATE DAILY REPORT REQUEST ===");
    console.log("Request body:", req.body);
    
    const {
      siteId,
      reportDate,
      reportedBy,
      workCompleted,
      workersPresent,
      workersAbsent,
      materialsUsed,
      equipmentUsed,
      issues,
      weatherConditions,
      safetyIncidents,
      remarks,
    } = req.body;

    if (!siteId || !reportDate || !workCompleted) {
      console.log("Validation failed - missing required fields");
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields (siteId, reportDate, workCompleted)",
      });
    }

    const report = new DailyReport({
      siteId,
      reportDate,
      reportedBy,
      workCompleted,
      workersPresent,
      workersAbsent,
      materialsUsed,
      equipmentUsed,
      issues,
      weatherConditions,
      safetyIncidents,
      remarks,
    });

    await report.save();

    res.status(201).json({
      success: true,
      message: "Daily report created successfully",
      data: report,
    });
  } catch (error) {
    console.error("Error creating daily report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create daily report",
      error: error.message,
    });
  }
};

// Get daily reports for a site
exports.getDailyReportsBySite = async (req, res) => {
  try {
    const { siteId } = req.params;
    const { startDate, endDate } = req.query;

    let query = { siteId };

    if (startDate && endDate) {
      query.reportDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const reports = await DailyReport.find(query)
      .populate("reportedBy", "name employeeId")
      .sort({ reportDate: -1 });

    res.status(200).json({
      success: true,
      count: reports.length,
      data: reports,
    });
  } catch (error) {
    console.error("Error fetching daily reports:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch daily reports",
      error: error.message,
    });
  }
};

// Update daily report
exports.updateDailyReport = async (req, res) => {
  try {
    const report = await DailyReport.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Daily report not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Daily report updated successfully",
      data: report,
    });
  } catch (error) {
    console.error("Error updating daily report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update daily report",
      error: error.message,
    });
  }
};

// Delete daily report
exports.deleteDailyReport = async (req, res) => {
  try {
    const report = await DailyReport.findByIdAndDelete(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Daily report not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Daily report deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting daily report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete daily report",
      error: error.message,
    });
  }
};

// ============ ALERTS ============

// Create alert
exports.createAlert = async (req, res) => {
  try {
    console.log("=== CREATE ALERT REQUEST ===");
    console.log("Request body:", req.body);
    
    const {
      siteId,
      alertType,
      severity,
      title,
      description,
      raisedBy,
      assignedTo,
      priority,
      dueDate,
    } = req.body;

    if (!siteId || !alertType || !title || !description) {
      console.log("Validation failed - missing required fields");
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields (siteId, alertType, title, description)",
      });
    }

    const alert = new SiteAlert({
      siteId,
      alertType,
      severity,
      title,
      description,
      raisedBy,
      assignedTo,
      priority,
      dueDate,
    });

    await alert.save();

    res.status(201).json({
      success: true,
      message: "Alert created successfully",
      data: alert,
    });
  } catch (error) {
    console.error("Error creating alert:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create alert",
      error: error.message,
    });
  }
};

// Get alerts for a site
exports.getAlertsBySite = async (req, res) => {
  try {
    const { siteId } = req.params;
    const { status, severity } = req.query;

    let query = { siteId };

    if (status) {
      query.status = status;
    }

    if (severity) {
      query.severity = severity;
    }

    const alerts = await SiteAlert.find(query)
      .populate("raisedBy", "name employeeId")
      .populate("assignedTo", "name employeeId")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: alerts.length,
      data: alerts,
    });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch alerts",
      error: error.message,
    });
  }
};

// Update alert
exports.updateAlert = async (req, res) => {
  try {
    const alert = await SiteAlert.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Alert updated successfully",
      data: alert,
    });
  } catch (error) {
    console.error("Error updating alert:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update alert",
      error: error.message,
    });
  }
};

// Delete alert
exports.deleteAlert = async (req, res) => {
  try {
    const alert = await SiteAlert.findByIdAndDelete(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Alert deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting alert:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete alert",
      error: error.message,
    });
  }
};
