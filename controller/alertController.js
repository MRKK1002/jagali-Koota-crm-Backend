const Alert = require("../model/Alert")

// Get all alerts
const getAllAlerts = async (req, res) => {
  try {
    const { type, priority, status, category, projectId, siteId, createdBy, page = 1, limit = 50, search } = req.query

    const filter = {}

    if (type) filter.type = type
    if (priority) filter.priority = priority
    if (status) filter.status = status
    if (category) filter.category = category
    if (projectId) filter.projectId = projectId
    if (siteId) filter.siteId = siteId
    if (createdBy) filter.createdBy = new RegExp(createdBy, "i")

    // Search functionality
    if (search) {
      filter.$or = [
        { message: new RegExp(search, "i") },
        { description: new RegExp(search, "i") },
        { createdBy: new RegExp(search, "i") },
      ]
    }

    const alerts = await Alert.find(filter)
      .populate("projectId", "projectName")
      .populate("siteId", "siteName location")
      .populate("createdById", "name email")
      .populate("resolvedById", "name email")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Alert.countDocuments(filter)

    res.status(200).json({
      success: true,
      data: alerts,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
      },
    })
  } catch (error) {
    console.error("Error fetching alerts:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching alerts",
      error: error.message,
    })
  }
}

// Get single alert
const getAlertById = async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id)
      .populate("projectId", "projectName description")
      .populate("siteId", "siteName location")
      .populate("createdById", "name email phone")
      .populate("resolvedById", "name email")
      .populate("taskId", "taskName description")

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found",
      })
    }

    res.status(200).json({
      success: true,
      data: alert,
    })
  } catch (error) {
    console.error("Error fetching alert:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching alert",
      error: error.message,
    })
  }
}

// Create new alert
const createAlert = async (req, res) => {
  try {
    const {
      message,
      type,
      priority,
      category,
      description,
      actionRequired,
      dueDate,
      projectId,
      siteId,
      taskId,
      assignedTo,
    } = req.body

    // Validate required fields
    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Alert message is required",
      })
    }

    const alert = new Alert({
      message,
      type: type || "info",
      priority: priority || "Normal",
      category: category || "Other",
      description,
      actionRequired,
      dueDate: dueDate ? new Date(dueDate) : null,
      projectId,
      siteId,
      taskId,
      createdBy: req.user?.name || "Project Manager",
      createdById: req.user?.id,
      assignedTo: assignedTo || [],
    })

    const savedAlert = await alert.save()

    const populatedAlert = await Alert.findById(savedAlert._id)
      .populate("projectId", "projectName")
      .populate("siteId", "siteName location")
      .populate("createdById", "name email")
      .populate("taskId", "taskName")

    res.status(201).json({
      success: true,
      message: "Alert created successfully",
      data: populatedAlert,
    })
  } catch (error) {
    console.error("Error creating alert:", error)
    res.status(500).json({
      success: false,
      message: "Error creating alert",
      error: error.message,
    })
  }
}

// Update alert
const updateAlert = async (req, res) => {
  try {
    const { id } = req.params
    const updateData = { ...req.body }

    const alert = await Alert.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      .populate("projectId", "projectName")
      .populate("siteId", "siteName location")
      .populate("createdById", "name email")
      .populate("resolvedById", "name email")

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found",
      })
    }

    res.status(200).json({
      success: true,
      message: "Alert updated successfully",
      data: alert,
    })
  } catch (error) {
    console.error("Error updating alert:", error)
    res.status(500).json({
      success: false,
      message: "Error updating alert",
      error: error.message,
    })
  }
}

// Resolve alert
const resolveAlert = async (req, res) => {
  try {
    const { id } = req.params
    const { resolutionNotes } = req.body

    const alert = await Alert.findByIdAndUpdate(
      id,
      {
        status: "Resolved",
        resolvedBy: req.user?.name || "Project Manager",
        resolvedById: req.user?.id,
        resolvedAt: new Date(),
        resolutionNotes,
      },
      { new: true },
    )
      .populate("projectId", "projectName")
      .populate("siteId", "siteName location")
      .populate("createdById", "name email")
      .populate("resolvedById", "name email")

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found",
      })
    }

    res.status(200).json({
      success: true,
      message: "Alert resolved successfully",
      data: alert,
    })
  } catch (error) {
    console.error("Error resolving alert:", error)
    res.status(500).json({
      success: false,
      message: "Error resolving alert",
      error: error.message,
    })
  }
}

// Acknowledge alert
const acknowledgeAlert = async (req, res) => {
  try {
    const { id } = req.params

    const alert = await Alert.findByIdAndUpdate(
      id,
      {
        status: "Acknowledged",
        $push: {
          assignedTo: {
            employeeId: req.user?.id,
            employeeName: req.user?.name || "Project Manager",
            acknowledgedAt: new Date(),
          },
        },
      },
      { new: true },
    )
      .populate("projectId", "projectName")
      .populate("siteId", "siteName location")
      .populate("createdById", "name email")

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found",
      })
    }

    res.status(200).json({
      success: true,
      message: "Alert acknowledged successfully",
      data: alert,
    })
  } catch (error) {
    console.error("Error acknowledging alert:", error)
    res.status(500).json({
      success: false,
      message: "Error acknowledging alert",
      error: error.message,
    })
  }
}

// Delete alert
const deleteAlert = async (req, res) => {
  try {
    const alert = await Alert.findByIdAndDelete(req.params.id)

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found",
      })
    }

    res.status(200).json({
      success: true,
      message: "Alert deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting alert:", error)
    res.status(500).json({
      success: false,
      message: "Error deleting alert",
      error: error.message,
    })
  }
}

// Get alert statistics
const getAlertStats = async (req, res) => {
  try {
    const { projectId, siteId } = req.query

    const filter = {}
    if (projectId) filter.projectId = projectId
    if (siteId) filter.siteId = siteId

    const stats = await Alert.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalAlerts: { $sum: 1 },
          activeAlerts: {
            $sum: { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] },
          },
          acknowledgedAlerts: {
            $sum: { $cond: [{ $eq: ["$status", "Acknowledged"] }, 1, 0] },
          },
          resolvedAlerts: {
            $sum: { $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0] },
          },
          criticalAlerts: {
            $sum: { $cond: [{ $eq: ["$priority", "Critical"] }, 1, 0] },
          },
          urgentAlerts: {
            $sum: { $cond: [{ $eq: ["$priority", "Urgent"] }, 1, 0] },
          },
          highAlerts: {
            $sum: { $cond: [{ $eq: ["$priority", "High"] }, 1, 0] },
          },
          safetyAlerts: {
            $sum: { $cond: [{ $eq: ["$category", "Safety"] }, 1, 0] },
          },
        },
      },
    ])

    const result = stats[0] || {
      totalAlerts: 0,
      activeAlerts: 0,
      acknowledgedAlerts: 0,
      resolvedAlerts: 0,
      criticalAlerts: 0,
      urgentAlerts: 0,
      highAlerts: 0,
      safetyAlerts: 0,
    }

    res.status(200).json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error("Error fetching alert stats:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching alert statistics",
      error: error.message,
    })
  }
}

module.exports = {
  getAllAlerts,
  getAlertById,
  createAlert,
  updateAlert,
  resolveAlert,
  acknowledgeAlert,
  deleteAlert,
  getAlertStats,
}
