const mongoose = require("mongoose");

const approvalLevelSchema = new mongoose.Schema({
  level: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  approvers: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SubAdmin",
      },
      role: String,
      department: String,
    },
  ],
  approvalType: {
    type: String,
    enum: ["Any", "All", "Majority"],
    default: "Any",
  },
  minimumApprovers: {
    type: Number,
    default: 1,
  },
  autoApprove: {
    type: Boolean,
    default: false,
  },
  autoApproveConditions: {
    amountLessThan: Number,
    priorityLevel: String,
  },
  escalationTime: {
    type: Number, // hours
    default: 24,
  },
  escalateTo: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubAdmin",
    },
  ],
  canDelegate: {
    type: Boolean,
    default: true,
  },
  canSkip: {
    type: Boolean,
    default: false,
  },
  isOptional: {
    type: Boolean,
    default: false,
  },
});

const approvalWorkflowSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      trim: true,
    },
    businessType: {
      type: String,
      required: true,
      enum: ["restaurant", "construction", "both"],
    },
    workflowType: {
      type: String,
      required: true,
      enum: [
        "Purchase Request",
        "Purchase Order",
        "Leave Request",
        "Expense Claim",
        "Invoice Approval",
        "Payment Approval",
        "Vendor Registration",
        "Customer Registration",
        "Budget Approval",
        "Project Approval",
        "Material Request",
        "Other",
      ],
    },
    category: {
      type: String,
      enum: ["Procurement", "HR", "Finance", "Operations", "Projects", "Other"],
      required: true,
    },
    levels: [approvalLevelSchema],
    conditions: {
      amountRange: {
        min: { type: Number, default: 0 },
        max: { type: Number },
      },
      departments: [String],
      locations: [String],
      priority: {
        type: String,
        enum: ["Low", "Normal", "High", "Urgent"],
      },
    },
    rules: {
      requiresJustification: {
        type: Boolean,
        default: false,
      },
      requiresAttachment: {
        type: Boolean,
        default: false,
      },
      allowParallelApproval: {
        type: Boolean,
        default: false,
      },
      allowResubmission: {
        type: Boolean,
        default: true,
      },
      maxResubmissions: {
        type: Number,
        default: 3,
      },
      notifyOnSubmit: {
        type: Boolean,
        default: true,
      },
      notifyOnApproval: {
        type: Boolean,
        default: true,
      },
      notifyOnRejection: {
        type: Boolean,
        default: true,
      },
      autoArchiveAfterDays: {
        type: Number,
        default: 90,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    priority: {
      type: Number,
      default: 0, // Higher number = higher priority
    },
    effectiveFrom: {
      type: Date,
      default: Date.now,
    },
    effectiveTo: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubAdmin",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubAdmin",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
// code index is automatically created by unique: true constraint
approvalWorkflowSchema.index({ businessType: 1, workflowType: 1 });
approvalWorkflowSchema.index({ isActive: 1, priority: -1 });

// Static method to find applicable workflow
approvalWorkflowSchema.statics.findApplicableWorkflow = async function (
  businessType,
  workflowType,
  amount,
  department,
  priority
) {
  const query = {
    businessType: { $in: [businessType, "both"] },
    workflowType,
    isActive: true,
    effectiveFrom: { $lte: new Date() },
    $or: [{ effectiveTo: null }, { effectiveTo: { $gte: new Date() } }],
  };

  // Add amount condition
  if (amount) {
    query.$or = [
      { "conditions.amountRange.min": { $lte: amount }, "conditions.amountRange.max": { $gte: amount } },
      { "conditions.amountRange.max": null },
    ];
  }

  // Add department condition
  if (department) {
    query.$or = [
      { "conditions.departments": department },
      { "conditions.departments": { $size: 0 } },
    ];
  }

  // Add priority condition
  if (priority) {
    query.$or = [
      { "conditions.priority": priority },
      { "conditions.priority": null },
    ];
  }

  const workflows = await this.find(query).sort({ priority: -1 });

  return workflows.length > 0 ? workflows[0] : null;
};

// Method to get approval chain
approvalWorkflowSchema.methods.getApprovalChain = function () {
  return this.levels.sort((a, b) => a.level - b.level);
};

// Method to check if auto-approval applies
approvalWorkflowSchema.methods.checkAutoApproval = function (level, data) {
  const approvalLevel = this.levels.find((l) => l.level === level);

  if (!approvalLevel || !approvalLevel.autoApprove) {
    return false;
  }

  const conditions = approvalLevel.autoApproveConditions;

  if (conditions.amountLessThan && data.amount >= conditions.amountLessThan) {
    return false;
  }

  if (conditions.priorityLevel && data.priority !== conditions.priorityLevel) {
    return false;
  }

  return true;
};

module.exports = mongoose.model("ApprovalWorkflow", approvalWorkflowSchema);


