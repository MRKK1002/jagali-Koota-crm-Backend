const mongoose = require("mongoose")

const alertSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["info", "warning", "error", "success"],
      default: "info",
    },
    priority: {
      type: String,
      enum: ["Normal", "High", "Urgent", "Critical"],
      default: "Normal",
    },
    category: {
      type: String,
      enum: ["Safety", "Quality", "Schedule", "Budget", "Resource", "Weather", "Equipment", "Material", "Other"],
      default: "Other",
    },
    status: {
      type: String,
      enum: ["Active", "Acknowledged", "Resolved", "Dismissed"],
      default: "Active",
    },
    createdBy: {
      type: String,
      required: true,
    },
    createdById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    assignedTo: [
      {
        employeeId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Employee",
        },
        employeeName: String,
        acknowledgedAt: Date,
        resolvedAt: Date,
      },
    ],
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
    },
    description: {
      type: String,
    },
    actionRequired: {
      type: String,
    },
    dueDate: {
      type: Date,
    },
    resolvedBy: {
      type: String,
    },
    resolvedById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    resolvedAt: {
      type: Date,
    },
    resolutionNotes: {
      type: String,
    },
    attachments: [
      {
        filename: String,
        originalName: String,
        path: String,
        uploadDate: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    escalationLevel: {
      type: Number,
      default: 0,
    },
    escalatedAt: {
      type: Date,
    },
    escalatedTo: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
)

// Index for better query performance
alertSchema.index({ type: 1, priority: 1, status: 1 })
alertSchema.index({ createdAt: -1 })
alertSchema.index({ siteId: 1, status: 1 })

module.exports = mongoose.model("Alert", alertSchema)
