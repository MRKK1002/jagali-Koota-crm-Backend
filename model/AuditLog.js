const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubAdmin",
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userEmail: String,
    businessType: {
      type: String,
      enum: ["restaurant", "construction", "common"],
    },
    action: {
      type: String,
      required: true,
      enum: [
        "Login",
        "Logout",
        "Create",
        "Read",
        "Update",
        "Delete",
        "Export",
        "Import",
        "Approve",
        "Reject",
        "Share",
        "Download",
        "Upload",
        "Password Change",
        "Settings Change",
        "Permission Change",
        "Failed Login",
        "2FA Enable",
        "2FA Disable",
        "Session Expired",
        "Other",
      ],
    },
    actionDescription: {
      type: String,
      required: true,
    },
    module: {
      type: String,
      required: true,
      enum: [
        "Authentication",
        "Accounts",
        "Inventory",
        "Sales",
        "Purchase",
        "HR",
        "Payroll",
        "Compliance",
        "Documents",
        "Approvals",
        "Notifications",
        "Reports",
        "Settings",
        "Users",
        "Other",
      ],
    },
    resourceType: {
      type: String,
      enum: [
        "User",
        "Invoice",
        "Purchase Order",
        "Employee",
        "Document",
        "Report",
        "Approval",
        "Payment",
        "Batch",
        "Journal Entry",
        "Other",
      ],
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    resourceReference: String,
    // Request Details
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: String,
    deviceInfo: {
      browser: String,
      os: String,
      device: String,
    },
    location: {
      country: String,
      city: String,
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
    },
    // Changes Tracking
    changesBefore: {
      type: mongoose.Schema.Types.Mixed,
    },
    changesAfter: {
      type: mongoose.Schema.Types.Mixed,
    },
    changedFields: [String],
    // Status & Severity
    status: {
      type: String,
      enum: ["Success", "Failed", "Warning"],
      default: "Success",
    },
    severity: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Low",
    },
    errorMessage: String,
    // Security Flags
    isSuspicious: {
      type: Boolean,
      default: false,
    },
    suspiciousReason: String,
    flaggedForReview: {
      type: Boolean,
      default: false,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubAdmin",
    },
    reviewedAt: Date,
    reviewNotes: String,
    // Session Info
    sessionId: String,
    // Metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ businessType: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, module: 1 });
auditLogSchema.index({ ipAddress: 1 });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ isSuspicious: 1, flaggedForReview: 1 });
auditLogSchema.index({ sessionId: 1 });

// TTL index to auto-delete old logs (optional - 1 year retention)
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });

// Static method to log action
auditLogSchema.statics.logAction = async function ({
  userId,
  userName,
  userEmail,
  businessType,
  action,
  actionDescription,
  module,
  resourceType,
  resourceId,
  resourceReference,
  ipAddress,
  userAgent,
  deviceInfo,
  changesBefore,
  changesAfter,
  status,
  severity,
  sessionId,
  metadata,
}) {
  try {
    const log = new this({
      user: userId,
      userName,
      userEmail,
      businessType,
      action,
      actionDescription,
      module,
      resourceType,
      resourceId,
      resourceReference,
      ipAddress,
      userAgent,
      deviceInfo,
      changesBefore,
      changesAfter,
      status: status || "Success",
      severity: severity || "Low",
      sessionId,
      metadata,
    });

    // Calculate changed fields
    if (changesBefore && changesAfter) {
      log.changedFields = Object.keys(changesAfter).filter(
        (key) => JSON.stringify(changesBefore[key]) !== JSON.stringify(changesAfter[key])
      );
    }

    await log.save();
    return log;
  } catch (error) {
    console.error("Error logging audit action:", error);
    // Don't throw - audit logging should not break the main flow
  }
};

// Static method to get user activity
auditLogSchema.statics.getUserActivity = async function (
  userId,
  options = {}
) {
  const { startDate, endDate, action, module, limit = 50, skip = 0 } = options;

  const query = { user: userId };

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  if (action) query.action = action;
  if (module) query.module = module;

  return await this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to get suspicious activities
auditLogSchema.statics.getSuspiciousActivities = async function (
  businessType,
  options = {}
) {
  const { limit = 50, skip = 0 } = options;

  const query = {
    isSuspicious: true,
    flaggedForReview: false,
  };

  if (businessType) query.businessType = businessType;

  return await this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate("user", "name email");
};

// Static method to get failed login attempts
auditLogSchema.statics.getFailedLogins = async function (
  userId,
  timeWindowMinutes = 30
) {
  const since = new Date(Date.now() - timeWindowMinutes * 60 * 1000);

  return await this.countDocuments({
    user: userId,
    action: "Failed Login",
    createdAt: { $gte: since },
  });
};

module.exports = mongoose.model("AuditLog", auditLogSchema);
