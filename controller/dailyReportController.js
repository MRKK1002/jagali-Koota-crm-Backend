const DailyReport = require("../model/DailyReport")
const multer = require("multer")
const path = require("path")

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/reports/")
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname))
  },
})

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|pdf|doc|docx/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)

    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error("Invalid file type"))
    }
  },
})

// Get all daily reports
const getAllReports = async (req, res) => {
  try {
    const { date, submittedBy, projectId, siteId, status, page = 1, limit = 20, startDate, endDate } = req.query

    const filter = {}

    if (date) filter.date = new Date(date)
    if (submittedBy) filter.submittedBy = new RegExp(submittedBy, "i")
    if (projectId) filter.projectId = projectId
    if (siteId) filter.siteId = siteId
    if (status) filter.status = status

    // Date range filter
    if (startDate || endDate) {
      filter.date = {}
      if (startDate) filter.date.$gte = new Date(startDate)
      if (endDate) filter.date.$lte = new Date(endDate)
    }

    const reports = await DailyReport.find(filter)
      .populate("projectId", "projectName")
      .populate("siteId", "siteName location")
      .populate("submittedById", "name email")
      .sort({ date: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await DailyReport.countDocuments(filter)

    res.status(200).json({
      success: true,
      data: reports,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
      },
    })
  } catch (error) {
    console.error("Error fetching reports:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching reports",
      error: error.message,
    })
  }
}

// Get single report
const getReportById = async (req, res) => {
  try {
    const report = await DailyReport.findById(req.params.id)
      .populate("projectId", "projectName description")
      .populate("siteId", "siteName location")
      .populate("submittedById", "name email phone")
      .populate("approvedById", "name email")

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      })
    }

    res.status(200).json({
      success: true,
      data: report,
    })
  } catch (error) {
    console.error("Error fetching report:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching report",
      error: error.message,
    })
  }
}

// Create new report

const createReport = async (req, res) => {
  try {
    const { 
      date, 
      description, 
      submittedBy,
      weatherConditions,
      temperature,
      materialsReceived,
      visitors,
      nextDayPlan,
      projectId,
      siteId,
      manpowerPresent,
      manpowerAbsent,
      equipmentUsed,
      safetyIncidents,
      issues,
      workProgress
    } = req.body
    
    const files = req.files || []

    const media = files.map((file) => ({
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      type: file.mimetype.startsWith("image/")
        ? "image"
        : file.mimetype.startsWith("video/")
        ? "video"
        : "document",
    }))

    // Parse JSON strings if they exist
    let parsedMaterials = materialsReceived
    if (typeof materialsReceived === 'string') {
      try {
        parsedMaterials = JSON.parse(materialsReceived)
      } catch (e) {
        parsedMaterials = []
      }
    }

    let parsedEquipment = equipmentUsed
    if (typeof equipmentUsed === 'string') {
      try {
        parsedEquipment = JSON.parse(equipmentUsed)
      } catch (e) {
        parsedEquipment = []
      }
    }

    let parsedIncidents = safetyIncidents
    if (typeof safetyIncidents === 'string') {
      try {
        parsedIncidents = JSON.parse(safetyIncidents)
      } catch (e) {
        parsedIncidents = []
      }
    }

    let parsedIssues = issues
    if (typeof issues === 'string') {
      try {
        parsedIssues = JSON.parse(issues)
      } catch (e) {
        parsedIssues = []
      }
    }

    let parsedWorkProgress = workProgress
    if (typeof workProgress === 'string') {
      try {
        parsedWorkProgress = JSON.parse(workProgress)
      } catch (e) {
        parsedWorkProgress = []
      }
    }

    const newReport = new DailyReport({
      date,
      description,
      submittedBy,
      media,
      weatherConditions: weatherConditions || "Clear",
      temperature: temperature || "",
      materialsReceived: parsedMaterials || [],
      visitors: visitors || "",
      nextDayPlan: nextDayPlan || "",
      projectId,
      siteId,
      manpowerPresent: manpowerPresent ? parseInt(manpowerPresent) : 0,
      manpowerAbsent: manpowerAbsent ? parseInt(manpowerAbsent) : 0,
      equipmentUsed: parsedEquipment || [],
      safetyIncidents: parsedIncidents || [],
      issues: parsedIssues || [],
      workProgress: parsedWorkProgress || []
    })

    const savedReport = await newReport.save()

    res.status(201).json({
      success: true,
      message: "Report submitted successfully",
      data: savedReport,
    })
  } catch (error) {
    console.error("❌ Error in createReport:", error)
    console.error("Error details:", error.message)
    console.error("Stack:", error.stack)
    res.status(500).json({
      success: false,
      message: "Failed to submit report",
      error: error.message,
    })
  }
}

// Update report
const updateReport = async (req, res) => {
  try {
    const { id } = req.params
    const updateData = { ...req.body }

    // Handle file uploads if any
    if (req.files && req.files.length > 0) {
      const newMedia = req.files.map((file) => ({
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        type: file.mimetype.startsWith("image/") ? "image" : file.mimetype.startsWith("video/") ? "video" : "document",
      }))

      // Get existing report to merge media
      const existingReport = await DailyReport.findById(id)
      if (existingReport) {
        updateData.media = [...(existingReport.media || []), ...newMedia]
      } else {
        updateData.media = newMedia
      }
    }

    const report = await DailyReport.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      .populate("projectId", "projectName")
      .populate("siteId", "siteName location")
      .populate("submittedById", "name email")

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      })
    }

    res.status(200).json({
      success: true,
      message: "Report updated successfully",
      data: report,
    })
  } catch (error) {
    console.error("Error updating report:", error)
    res.status(500).json({
      success: false,
      message: "Error updating report",
      error: error.message,
    })
  }
}

// Delete report
const deleteReport = async (req, res) => {
  try {
    const report = await DailyReport.findByIdAndDelete(req.params.id)

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      })
    }

    res.status(200).json({
      success: true,
      message: "Report deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting report:", error)
    res.status(500).json({
      success: false,
      message: "Error deleting report",
      error: error.message,
    })
  }
}

// Approve report
const approveReport = async (req, res) => {
  try {
    const { id } = req.params
    const { status, notes } = req.body

    const report = await DailyReport.findByIdAndUpdate(
      id,
      {
        status: status || "Approved",
        approvedBy: req.user?.name || "Project Manager",
        approvedById: req.user?.id,
        approvedAt: new Date(),
        resolutionNotes: notes,
      },
      { new: true },
    )
      .populate("projectId", "projectName")
      .populate("siteId", "siteName location")
      .populate("submittedById", "name email")
      .populate("approvedById", "name email")

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      })
    }

    res.status(200).json({
      success: true,
      message: "Report approved successfully",
      data: report,
    })
  } catch (error) {
    console.error("Error approving report:", error)
    res.status(500).json({
      success: false,
      message: "Error approving report",
      error: error.message,
    })
  }
}

module.exports = {
  getAllReports,
  getReportById,
  createReport,
  updateReport,
  deleteReport,
  approveReport,
  upload,
}
