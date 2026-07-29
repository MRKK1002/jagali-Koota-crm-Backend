const Task = require("../model/Task")
const Employee = require("../model/Employee")

// Get all tasks
const getAllTasks = async (req, res) => {
  try {
    const {
      status,
      priority,
      assignedTo,
      projectId,
      siteId,
      startDate,
      endDate,
      page = 1,
      limit = 50,
      search,
    } = req.query

    // Build filter object
    const filter = {}

    if (status) filter.status = status
    if (priority) filter.priority = priority
    if (assignedTo) filter.assignedTo = new RegExp(assignedTo, "i")
    if (projectId) filter.projectId = projectId
    if (siteId) filter.siteId = siteId

    if (startDate || endDate) {
      filter.startDate = {}
      if (startDate) filter.startDate.$gte = new Date(startDate)
      if (endDate) filter.startDate.$lte = new Date(endDate)
    }

    // Search functionality
    if (search) {
      filter.$or = [
        { taskName: new RegExp(search, "i") },
        { description: new RegExp(search, "i") },
        { assignedTo: new RegExp(search, "i") },
      ]
    }

    const tasks = await Task.find(filter)
      .populate("assignedToId", "name email")
      .populate("projectId", "projectName")
      .populate("siteId", "siteName location")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Task.countDocuments(filter)

    res.status(200).json({
      success: true,
      data: tasks,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
      },
    })
  } catch (error) {
    console.error("Error fetching tasks:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching tasks",
      error: error.message,
    })
  }
}

// Get single task
const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate("assignedToId", "name email phone")
      .populate("projectId", "projectName description")
      .populate("siteId", "siteName location")

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      })
    }

    res.status(200).json({
      success: true,
      data: task,
    })
  } catch (error) {
    console.error("Error fetching task:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching task",
      error: error.message,
    })
  }
}

// Create new task
const createTask = async (req, res) => {
  try {
    const {
      taskName,
      description,
      assignedTo,
      assignedToId,
      startDate,
      endDate,
      priority,
      projectId,
      siteId,
      estimatedHours,
      notes,
    } = req.body

    // Validate required fields
    if (!taskName || !assignedTo || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: taskName, assignedTo, startDate, endDate",
      })
    }

    // Validate dates
    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: "End date must be after start date",
      })
    }

    const task = new Task({
      taskName,
      description,
      assignedTo,
      assignedToId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      priority: priority || "Normal",
      projectId,
      siteId,
      estimatedHours,
      notes,
      createdBy: req.user?.name || "Project Manager",
      createdById: req.user?.id,
    })

    const savedTask = await task.save()

    // Populate the saved task
    const populatedTask = await Task.findById(savedTask._id)
      .populate("assignedToId", "name email")
      .populate("projectId", "projectName")
      .populate("siteId", "siteName location")

    res.status(201).json({
      success: true,
      message: "Task created successfully",
      data: populatedTask,
    })
  } catch (error) {
    console.error("Error creating task:", error)
    res.status(500).json({
      success: false,
      message: "Error creating task",
      error: error.message,
    })
  }
}

// Update task
const updateTask = async (req, res) => {
  try {
    const { id } = req.params
    const updateData = { ...req.body }

    // Add updatedBy information
    updateData.updatedBy = req.user?.name || "Project Manager"

    // If status is being updated to Completed, set progress to 100
    if (updateData.status === "Completed") {
      updateData.progress = 100
    }

    // If progress is 100, set status to Completed
    if (updateData.progress === 100) {
      updateData.status = "Completed"
    }

    // If progress is between 1-99, set status to In Progress
    if (updateData.progress > 0 && updateData.progress < 100) {
      updateData.status = "In Progress"
    }

    const task = await Task.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      .populate("assignedToId", "name email")
      .populate("projectId", "projectName")
      .populate("siteId", "siteName location")

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      })
    }

    res.status(200).json({
      success: true,
      message: "Task updated successfully",
      data: task,
    })
  } catch (error) {
    console.error("Error updating task:", error)
    res.status(500).json({
      success: false,
      message: "Error updating task",
      error: error.message,
    })
  }
}

// Delete task
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id)

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      })
    }

    res.status(200).json({
      success: true,
      message: "Task deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting task:", error)
    res.status(500).json({
      success: false,
      message: "Error deleting task",
      error: error.message,
    })
  }
}

// Get task statistics
const getTaskStats = async (req, res) => {
  try {
    const { projectId, siteId } = req.query

    const filter = {}
    if (projectId) filter.projectId = projectId
    if (siteId) filter.siteId = siteId

    const stats = await Task.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalTasks: { $sum: 1 },
          notStarted: {
            $sum: { $cond: [{ $eq: ["$status", "Not Started"] }, 1, 0] },
          },
          inProgress: {
            $sum: { $cond: [{ $eq: ["$status", "In Progress"] }, 1, 0] },
          },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] },
          },
          delayed: {
            $sum: { $cond: [{ $eq: ["$status", "Delayed"] }, 1, 0] },
          },
          averageProgress: { $avg: "$progress" },
          urgentTasks: {
            $sum: { $cond: [{ $eq: ["$priority", "Urgent"] }, 1, 0] },
          },
          highPriorityTasks: {
            $sum: { $cond: [{ $eq: ["$priority", "High"] }, 1, 0] },
          },
        },
      },
    ])

    const result = stats[0] || {
      totalTasks: 0,
      notStarted: 0,
      inProgress: 0,
      completed: 0,
      delayed: 0,
      averageProgress: 0,
      urgentTasks: 0,
      highPriorityTasks: 0,
    }

    res.status(200).json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error("Error fetching task stats:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching task statistics",
      error: error.message,
    })
  }
}

module.exports = {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  getTaskStats,
}
