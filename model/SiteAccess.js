const mongoose = require("mongoose");

const siteAccessSchema = new mongoose.Schema(
  {
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    role: {
      type: String,
      enum: ["Project Manager", "Site Supervisor", "Worker"],
      required: true,
    },
    permissions: {
      canCreateTasks: { type: Boolean, default: false },
      canAssignTasks: { type: Boolean, default: false },
      canUploadReports: { type: Boolean, default: false },
      canMarkAttendance: { type: Boolean, default: false },
      canRequestResources: { type: Boolean, default: false },
      canRaiseAlerts: { type: Boolean, default: false },
      canViewReports: { type: Boolean, default: false },
      canEditSite: { type: Boolean, default: false },
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    assignedDate: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for site and employee
siteAccessSchema.index({ siteId: 1, employeeId: 1 }, { unique: true });

module.exports = mongoose.model("SiteAccess", siteAccessSchema);
