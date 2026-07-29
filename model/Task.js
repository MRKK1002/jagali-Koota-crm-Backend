const mongoose = require("mongoose")

const taskSchema = new mongoose.Schema(
  {
    taskName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    assignedTo: {
      type: String,
      required: true,
    },
    assignedToId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    priority: {
      type: String,
      enum: ["Normal", "High", "Urgent"],
      default: "Normal",
    },
    status: {
      type: String,
      enum: ["Not Started", "In Progress", "Completed", "Delayed"],
      default: "Not Started",
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
    },
    createdBy: {
      type: String,
      default: "Project Manager",
    },
    createdById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    updatedBy: {
      type: String,
    },
    notes: {
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
    estimatedHours: {
      type: Number,
    },
    actualHours: {
      type: Number,
    },
    dependencies: [
      {
        taskId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Task",
        },
        type: {
          type: String,
          enum: ["finish-to-start", "start-to-start", "finish-to-finish", "start-to-finish"],
          default: "finish-to-start",
        },
      },
    ],
  },
  {
    timestamps: true,
  },
)

// Index for better query performance
taskSchema.index({ assignedTo: 1, status: 1 })
taskSchema.index({ startDate: 1, endDate: 1 })
taskSchema.index({ priority: 1, status: 1 })

module.exports = mongoose.model("Task", taskSchema)
