const mongoose = require("mongoose");

const approvalActionSchema = new mongoose.Schema({
  level: {
    type: Number,
    required: true,
  },
  levelName: String,
  approver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SubAdmin",
    required: true,
  },
  action: {
    type: String,
    enum: ["Approved", "Rejected", "Delegated", "On Hold", "Returned"],
    required: true,
  },
  comments: String,
  attachments: [
    {
      filename: String,
      url: String,
      uploadDate: Date,
    },
  ],
  actionDate: {
    type: Date,
    default: Date.now,
  },
  delegatedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SubAdmin",
  },
  ipAddress: String,
  deviceInfo: String,
});

const approvalRequestSchema = new mongoose.Schema(
  {
    requestNumber: {
      type: String,
      required: true,
      unique: true,
    },
    workflow: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ApprovalWorkflow",
      required: true,
    },
    workflowType: {
      type: String,
      required: true,
    },
    businessType: {
      type: String,
      required: true,
      enum: ["restaurant", "construction"],
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubAdmin",
      required: true,
    },
    department: String,
    priority: {
      type: String,
      enum: ["Low", "Normal", "High", "Urgent"],
      default: "Normal",
    },
    amount: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },
    relatedTo: {
      model: {
        type: String,
        enum: [
          "PurchaseRequest",
          "PurchaseOrder",
          "Leave",
          "Expense",
          "Invoice",
          "Payment",
          "Vendor",
          "Customer",
          "Project",
          "Other",
        ],
      },
      id: mongoose.Schema.Types.ObjectId,
      reference: String,
    },
    currentLevel: {
      type: Number,
      default: 1,
    },
    totalLevels: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "Pending",
        "In Progress",
        "Approved",
        "Rejected",
        "Cancelled",
        "On Hold",
        "Returned",
      ],
      default: "Pending",
    },
    approvalChain: [
      {
        level: Number,
        levelName: String,
        status: {
          type: String,
          enum: [
            "Pending",
            "In Progress",
            "Approved",
            "Rejected",
            "Skipped",
            "Auto-Approved",
          ],
          default: "Pending",
        },
        approvers: [
          {
            user: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "SubAdmin",
            },
            status: {
              type: String,
              enum: ["Pending", "Approved", "Rejected"],
              default: "Pending",
            },
            actionDate: Date,
          },
        ],
        startDate: Date,
        endDate: Date,
        requiredApprovals: Number,
        receivedApprovals: {
          type: Number,
          default: 0,
        },
      },
    ],
    actions: [approvalActionSchema],
    attachments: [
      {
        filename: String,
        url: String,
        uploadDate: Date,
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "SubAdmin",
        },
      },
    ],
    justification: String,
    rejectionReason: String,
    cancellationReason: String,
    submittedDate: {
      type: Date,
      default: Date.now,
    },
    completedDate: Date,
    dueDate: Date,
    isEscalated: {
      type: Boolean,
      default: false,
    },
    escalationDate: Date,
    escalatedTo: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SubAdmin",
      },
    ],
    resubmissionCount: {
      type: Number,
      default: 0,
    },
    previousVersions: [
      {
        version: Number,
        data: mongoose.Schema.Types.Mixed,
        submittedDate: Date,
        rejectionReason: String,
      },
    ],
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
    notificationsSent: [
      {
        type: {
          type: String,
        },
        recipient: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "SubAdmin",
        },
        sentDate: Date,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes
// requestNumber index is automatically created by unique: true constraint
approvalRequestSchema.index({ businessType: 1, status: 1 });
approvalRequestSchema.index({ workflowType: 1, status: 1 });
approvalRequestSchema.index({ requestedBy: 1 });
approvalRequestSchema.index({ currentLevel: 1, status: 1 });
approvalRequestSchema.index({ submittedDate: -1 });

// Static method to generate request number
approvalRequestSchema.statics.generateRequestNumber = async function (
  businessType,
  workflowType
) {
  const prefix = businessType === "restaurant" ? "AR" : "AC";
  const typeCode = workflowType.substring(0, 2).toUpperCase();
  const year = new Date().getFullYear();

  const count = await this.countDocuments({
    businessType,
    workflowType,
    createdAt: {
      $gte: new Date(year, 0, 1),
      $lt: new Date(year + 1, 0, 1),
    },
  });

  return `${prefix}-${typeCode}-${year}-${String(count + 1).padStart(5, "0")}`;
};

// Method to approve at current level
approvalRequestSchema.methods.approveLevel = async function (
  approverId,
  comments,
  attachments
) {
  const currentLevelData = this.approvalChain.find(
    (level) => level.level === this.currentLevel
  );

  if (!currentLevelData) {
    throw new Error("Current approval level not found");
  }

  // Update approver status
  const approver = currentLevelData.approvers.find(
    (a) => a.user.toString() === approverId.toString()
  );

  if (!approver) {
    throw new Error("Approver not found in current level");
  }

  approver.status = "Approved";
  approver.actionDate = new Date();
  currentLevelData.receivedApprovals += 1;

  // Add action record
  this.actions.push({
    level: this.currentLevel,
    levelName: currentLevelData.levelName,
    approver: approverId,
    action: "Approved",
    comments,
    attachments,
  });

  // Check if level is complete
  if (currentLevelData.receivedApprovals >= currentLevelData.requiredApprovals) {
    currentLevelData.status = "Approved";
    currentLevelData.endDate = new Date();

    // Move to next level or complete
    if (this.currentLevel < this.totalLevels) {
      this.currentLevel += 1;
      this.status = "In Progress";

      // Start next level
      const nextLevel = this.approvalChain.find(
        (level) => level.level === this.currentLevel
      );
      if (nextLevel) {
        nextLevel.status = "In Progress";
        nextLevel.startDate = new Date();
      }
    } else {
      this.status = "Approved";
      this.completedDate = new Date();
    }
  }

  await this.save();
  return this;
};

// Method to reject at current level
approvalRequestSchema.methods.rejectLevel = async function (
  approverId,
  reason,
  comments,
  attachments
) {
  const currentLevelData = this.approvalChain.find(
    (level) => level.level === this.currentLevel
  );

  if (!currentLevelData) {
    throw new Error("Current approval level not found");
  }

  // Update approver status
  const approver = currentLevelData.approvers.find(
    (a) => a.user.toString() === approverId.toString()
  );

  if (approver) {
    approver.status = "Rejected";
    approver.actionDate = new Date();
  }

  currentLevelData.status = "Rejected";
  currentLevelData.endDate = new Date();

  // Add action record
  this.actions.push({
    level: this.currentLevel,
    levelName: currentLevelData.levelName,
    approver: approverId,
    action: "Rejected",
    comments: reason || comments,
    attachments,
  });

  this.status = "Rejected";
  this.rejectionReason = reason;
  this.completedDate = new Date();

  await this.save();
  return this;
};

// Method to cancel request
approvalRequestSchema.methods.cancel = async function (userId, reason) {
  this.status = "Cancelled";
  this.cancellationReason = reason;
  this.completedDate = new Date();

  this.actions.push({
    level: this.currentLevel,
    approver: userId,
    action: "Cancelled",
    comments: reason,
  });

  await this.save();
  return this;
};

// Method to check if user can approve
approvalRequestSchema.methods.canUserApprove = function (userId) {
  const currentLevelData = this.approvalChain.find(
    (level) => level.level === this.currentLevel
  );

  if (!currentLevelData || currentLevelData.status !== "In Progress") {
    return false;
  }

  const approver = currentLevelData.approvers.find(
    (a) => a.user.toString() === userId.toString() && a.status === "Pending"
  );

  return !!approver;
};

// Static method to get pending approvals for user
approvalRequestSchema.statics.getPendingApprovalsForUser = async function (
  userId,
  businessType
) {
  const query = {
    status: { $in: ["Pending", "In Progress"] },
    "approvalChain.approvers": {
      $elemMatch: {
        user: userId,
        status: "Pending",
      },
    },
  };

  if (businessType) {
    query.businessType = businessType;
  }

  return await this.find(query)
    .populate("workflow", "name code")
    .populate("requestedBy", "name email")
    .sort({ priority: -1, submittedDate: 1 });
};

module.exports = mongoose.model("ApprovalRequest", approvalRequestSchema);


