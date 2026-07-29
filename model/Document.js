const mongoose = require("mongoose");

const documentVersionSchema = new mongoose.Schema({
  versionNumber: {
    type: Number,
    required: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  filePath: {
    type: String,
    required: true,
  },
  fileSize: {
    type: Number,
    required: true,
  },
  mimeType: {
    type: String,
    required: true,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SubAdmin",
    required: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
  changes: {
    type: String,
  },
  checksum: {
    type: String,
  },
});

const documentAccessLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SubAdmin",
    required: true,
  },
  action: {
    type: String,
    enum: ["View", "Download", "Edit", "Delete", "Share"],
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  ipAddress: String,
  deviceInfo: String,
});

const documentSchema = new mongoose.Schema(
  {
    documentNumber: {
      type: String,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    businessType: {
      type: String,
      required: true,
      enum: ["restaurant", "construction", "common"],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DocumentCategory",
      required: true,
    },
    categoryName: String,
    tags: [String],
    // Current Version
    currentVersion: {
      type: Number,
      default: 1,
    },
    fileName: {
      type: String,
      required: true,
    },
    originalFileName: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    fileExtension: {
      type: String,
      required: true,
    },
    // Version History
    versions: [documentVersionSchema],
    versioningEnabled: {
      type: Boolean,
      default: true,
    },
    // Document Status
    status: {
      type: String,
      enum: ["Draft", "Active", "Archived", "Expired", "Deleted"],
      default: "Active",
    },
    // Access Control
    visibility: {
      type: String,
      enum: ["Public", "Private", "Restricted"],
      default: "Private",
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubAdmin",
      required: true,
    },
    sharedWith: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "SubAdmin",
        },
        role: String,
        department: String,
        permissions: {
          canView: { type: Boolean, default: true },
          canDownload: { type: Boolean, default: true },
          canEdit: { type: Boolean, default: false },
          canDelete: { type: Boolean, default: false },
          canShare: { type: Boolean, default: false },
        },
        sharedAt: { type: Date, default: Date.now },
        sharedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "SubAdmin",
        },
      },
    ],
    // Related Entities
    relatedTo: {
      model: {
        type: String,
        enum: [
          "Employee",
          "Invoice",
          "PurchaseOrder",
          "Vendor",
          "Customer",
          "Project",
          "Leave",
          "Attendance",
          "Payroll",
          "Compliance",
          "Other",
        ],
      },
      id: mongoose.Schema.Types.ObjectId,
      reference: String,
    },
    // Expiry Management
    expiryDate: {
      type: Date,
    },
    isExpired: {
      type: Boolean,
      default: false,
    },
    expiryReminderSent: {
      type: Boolean,
      default: false,
    },
    reminderDaysBefore: {
      type: Number,
      default: 30,
    },
    // Compliance & Legal
    isConfidential: {
      type: Boolean,
      default: false,
    },
    complianceType: {
      type: String,
      enum: [
        "Tax Document",
        "Legal Document",
        "HR Document",
        "Financial Document",
        "Contract",
        "License",
        "Certificate",
        "Other",
      ],
    },
    retentionPeriod: {
      type: Number, // in months
    },
    // Access Logs
    accessLogs: [documentAccessLogSchema],
    downloadCount: {
      type: Number,
      default: 0,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    lastAccessedAt: Date,
    lastAccessedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubAdmin",
    },
    // Approval
    requiresApproval: {
      type: Boolean,
      default: false,
    },
    approvalStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubAdmin",
    },
    approvedAt: Date,
    // Metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
    notes: String,
    // Checksums for integrity
    checksum: String,
    isEncrypted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
documentSchema.index({ documentNumber: 1 });
documentSchema.index({ businessType: 1, category: 1 });
documentSchema.index({ owner: 1, status: 1 });
documentSchema.index({ "sharedWith.user": 1 });
documentSchema.index({ expiryDate: 1, isExpired: 1 });
documentSchema.index({ tags: 1 });
documentSchema.index({ createdAt: -1 });

// Pre-save middleware to check expiry
documentSchema.pre("save", function (next) {
  if (this.expiryDate) {
    this.isExpired = new Date() > new Date(this.expiryDate);
  }
  next();
});

// Method to add version
documentSchema.methods.addVersion = async function (
  fileName,
  filePath,
  fileSize,
  mimeType,
  uploadedBy,
  changes
) {
  this.currentVersion += 1;

  const newVersion = {
    versionNumber: this.currentVersion,
    fileName,
    filePath,
    fileSize,
    mimeType,
    uploadedBy,
    uploadedAt: new Date(),
    changes,
  };

  this.versions.push(newVersion);

  // Update current file info
  this.fileName = fileName;
  this.filePath = filePath;
  this.fileSize = fileSize;
  this.mimeType = mimeType;

  await this.save();
  return this;
};

// Method to share document
documentSchema.methods.shareWith = async function (
  userId,
  permissions,
  sharedBy
) {
  const existingShare = this.sharedWith.find(
    (share) => share.user.toString() === userId.toString()
  );

  if (existingShare) {
    // Update permissions
    existingShare.permissions = { ...existingShare.permissions, ...permissions };
  } else {
    // Add new share
    this.sharedWith.push({
      user: userId,
      permissions,
      sharedBy,
      sharedAt: new Date(),
    });
  }

  await this.save();
  return this;
};

// Method to log access
documentSchema.methods.logAccess = async function (
  userId,
  action,
  ipAddress,
  deviceInfo
) {
  this.accessLogs.push({
    user: userId,
    action,
    timestamp: new Date(),
    ipAddress,
    deviceInfo,
  });

  this.lastAccessedAt = new Date();
  this.lastAccessedBy = userId;

  if (action === "View") {
    this.viewCount += 1;
  } else if (action === "Download") {
    this.downloadCount += 1;
  }

  await this.save();
};

// Method to check user permission
documentSchema.methods.hasPermission = function (userId, permissionType) {
  // Owner has all permissions
  if (this.owner.toString() === userId.toString()) {
    return true;
  }

  // Check shared permissions
  const share = this.sharedWith.find(
    (s) => s.user.toString() === userId.toString()
  );

  if (!share) {
    return false;
  }

  switch (permissionType) {
    case "view":
      return share.permissions.canView;
    case "download":
      return share.permissions.canDownload;
    case "edit":
      return share.permissions.canEdit;
    case "delete":
      return share.permissions.canDelete;
    case "share":
      return share.permissions.canShare;
    default:
      return false;
  }
};

// Static method to generate document number
documentSchema.statics.generateDocumentNumber = async function (businessType) {
  const prefix =
    businessType === "restaurant"
      ? "DOC-R"
      : businessType === "construction"
      ? "DOC-C"
      : "DOC-CM";
  const year = new Date().getFullYear();

  const count = await this.countDocuments({
    businessType,
    createdAt: {
      $gte: new Date(year, 0, 1),
      $lt: new Date(year + 1, 0, 1),
    },
  });

  return `${prefix}-${year}-${String(count + 1).padStart(6, "0")}`;
};

// Static method to get expiring documents
documentSchema.statics.getExpiringDocuments = async function (
  businessType,
  daysThreshold = 30
) {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

  return await this.find({
    businessType,
    status: "Active",
    expiryDate: {
      $gte: new Date(),
      $lte: thresholdDate,
    },
    isExpired: false,
  }).populate("owner", "name email");
};

// Static method to get user documents
documentSchema.statics.getUserDocuments = async function (
  userId,
  businessType,
  options = {}
) {
  const { category, status, limit = 50, skip = 0 } = options;

  const query = {
    $or: [{ owner: userId }, { "sharedWith.user": userId }],
    status: status || { $ne: "Deleted" },
  };

  if (businessType && businessType !== "common") {
    query.businessType = businessType;
  }

  if (category) {
    query.category = category;
  }

  return await this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate("owner", "name email")
    .populate("category", "name");
};

module.exports = mongoose.model("Document", documentSchema);


