const ApprovalWorkflow = require("../model/ApprovalWorkflow");
const ApprovalRequest = require("../model/ApprovalRequest");
const approvalService = require("../services/approvalService");

// ==================== WORKFLOW MANAGEMENT ====================

// Create approval workflow
exports.createWorkflow = async (req, res) => {
  try {
    const workflow = new ApprovalWorkflow({
      ...req.body,
      createdBy: req.user?._id,
    });
    await workflow.save();

    res.status(201).json({
      success: true,
      message: "Approval workflow created successfully",
      data: workflow,
    });
  } catch (error) {
    console.error("Error creating workflow:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error creating workflow",
    });
  }
};

// Get all workflows
exports.getAllWorkflows = async (req, res) => {
  try {
    const { businessType, workflowType, category, isActive } = req.query;

    const query = {};
    if (businessType && businessType !== "both") {
      query.$or = [{ businessType }, { businessType: "both" }];
    }
    if (workflowType) query.workflowType = workflowType;
    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive === "true";

    const workflows = await ApprovalWorkflow.find(query)
      .sort({ priority: -1, name: 1 })
      .populate("createdBy", "name email")
      .populate("levels.approvers.user", "name email");

    res.status(200).json({
      success: true,
      count: workflows.length,
      data: workflows,
    });
  } catch (error) {
    console.error("Error fetching workflows:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching workflows",
    });
  }
};

// Get workflow by ID
exports.getWorkflowById = async (req, res) => {
  try {
    const workflow = await ApprovalWorkflow.findById(req.params.id)
      .populate("createdBy", "name email")
      .populate("levels.approvers.user", "name email");

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: "Workflow not found",
      });
    }

    res.status(200).json({
      success: true,
      data: workflow,
    });
  } catch (error) {
    console.error("Error fetching workflow:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching workflow",
    });
  }
};

// Update workflow
exports.updateWorkflow = async (req, res) => {
  try {
    const workflow = await ApprovalWorkflow.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user?._id },
      { new: true, runValidators: true }
    );

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: "Workflow not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Workflow updated successfully",
      data: workflow,
    });
  } catch (error) {
    console.error("Error updating workflow:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error updating workflow",
    });
  }
};

// Delete workflow
exports.deleteWorkflow = async (req, res) => {
  try {
    const workflow = await ApprovalWorkflow.findByIdAndDelete(req.params.id);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: "Workflow not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Workflow deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting workflow:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting workflow",
    });
  }
};

// ==================== APPROVAL REQUEST MANAGEMENT ====================

// Create approval request
exports.createApprovalRequest = async (req, res) => {
  try {
    const request = await approvalService.createApprovalRequest({
      ...req.body,
      requestedBy: req.user?._id || req.body.requestedBy,
    });

    res.status(201).json({
      success: true,
      message: "Approval request created successfully",
      data: request,
    });
  } catch (error) {
    console.error("Error creating approval request:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error creating approval request",
    });
  }
};

// Get all approval requests
exports.getAllApprovalRequests = async (req, res) => {
  try {
    const {
      businessType,
      workflowType,
      status,
      priority,
      requestedBy,
      startDate,
      endDate,
      limit = 50,
      skip = 0,
    } = req.query;

    const query = {};
    if (businessType) query.businessType = businessType;
    if (workflowType) query.workflowType = workflowType;
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (requestedBy) query.requestedBy = requestedBy;
    if (startDate || endDate) {
      query.submittedDate = {};
      if (startDate) query.submittedDate.$gte = new Date(startDate);
      if (endDate) query.submittedDate.$lte = new Date(endDate);
    }

    const requests = await ApprovalRequest.find(query)
      .sort({ submittedDate: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate("workflow", "name code")
      .populate("requestedBy", "name email")
      .populate("approvalChain.approvers.user", "name email");

    const total = await ApprovalRequest.countDocuments(query);

    res.status(200).json({
      success: true,
      count: requests.length,
      total,
      data: requests,
    });
  } catch (error) {
    console.error("Error fetching approval requests:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching approval requests",
    });
  }
};

// Get approval request by ID
exports.getApprovalRequestById = async (req, res) => {
  try {
    const request = await approvalService.getApprovalRequest(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Approval request not found",
      });
    }

    res.status(200).json({
      success: true,
      data: request,
    });
  } catch (error) {
    console.error("Error fetching approval request:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching approval request",
    });
  }
};

// Get pending approvals for user
exports.getPendingApprovalsForUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { businessType } = req.query;

    const requests = await approvalService.getPendingApprovalsForUser(
      userId,
      businessType
    );

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    console.error("Error fetching pending approvals:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching pending approvals",
    });
  }
};

// Approve request
exports.approveRequest = async (req, res) => {
  try {
    const { comments, attachments } = req.body;

    const request = await approvalService.approveRequest({
      requestId: req.params.id,
      approverId: req.user?._id || req.body.approverId,
      comments,
      attachments,
    });

    res.status(200).json({
      success: true,
      message: "Request approved successfully",
      data: request,
    });
  } catch (error) {
    console.error("Error approving request:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error approving request",
    });
  }
};

// Reject request
exports.rejectRequest = async (req, res) => {
  try {
    const { reason, comments, attachments } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    const request = await approvalService.rejectRequest({
      requestId: req.params.id,
      approverId: req.user?._id || req.body.approverId,
      reason,
      comments,
      attachments,
    });

    res.status(200).json({
      success: true,
      message: "Request rejected successfully",
      data: request,
    });
  } catch (error) {
    console.error("Error rejecting request:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error rejecting request",
    });
  }
};

// Cancel request
exports.cancelRequest = async (req, res) => {
  try {
    const { reason } = req.body;

    const request = await approvalService.cancelRequest({
      requestId: req.params.id,
      userId: req.user?._id || req.body.userId,
      reason,
    });

    res.status(200).json({
      success: true,
      message: "Request cancelled successfully",
      data: request,
    });
  } catch (error) {
    console.error("Error cancelling request:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error cancelling request",
    });
  }
};

// Resubmit rejected request
exports.resubmitRequest = async (req, res) => {
  try {
    const { updatedData, justification } = req.body;

    const request = await approvalService.resubmitRequest({
      requestId: req.params.id,
      updatedData,
      justification,
    });

    res.status(200).json({
      success: true,
      message: "Request resubmitted successfully",
      data: request,
    });
  } catch (error) {
    console.error("Error resubmitting request:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error resubmitting request",
    });
  }
};

// Get approval statistics
exports.getApprovalStatistics = async (req, res) => {
  try {
    const { businessType, startDate, endDate } = req.query;

    const query = {};
    if (businessType) query.businessType = businessType;
    if (startDate || endDate) {
      query.submittedDate = {};
      if (startDate) query.submittedDate.$gte = new Date(startDate);
      if (endDate) query.submittedDate.$lte = new Date(endDate);
    }

    const total = await ApprovalRequest.countDocuments(query);
    const pending = await ApprovalRequest.countDocuments({
      ...query,
      status: { $in: ["Pending", "In Progress"] },
    });
    const approved = await ApprovalRequest.countDocuments({
      ...query,
      status: "Approved",
    });
    const rejected = await ApprovalRequest.countDocuments({
      ...query,
      status: "Rejected",
    });
    const cancelled = await ApprovalRequest.countDocuments({
      ...query,
      status: "Cancelled",
    });

    const byType = await ApprovalRequest.aggregate([
      { $match: query },
      { $group: { _id: "$workflowType", count: { $sum: 1 } } },
    ]);

    const byPriority = await ApprovalRequest.aggregate([
      { $match: query },
      { $group: { _id: "$priority", count: { $sum: 1 } } },
    ]);

    // Average approval time
    const completedRequests = await ApprovalRequest.find({
      ...query,
      status: { $in: ["Approved", "Rejected"] },
      completedDate: { $exists: true },
    });

    const avgApprovalTime =
      completedRequests.length > 0
        ? completedRequests.reduce((sum, req) => {
            const time = req.completedDate - req.submittedDate;
            return sum + time;
          }, 0) / completedRequests.length
        : 0;

    const avgHours = avgApprovalTime / (1000 * 60 * 60);

    res.status(200).json({
      success: true,
      data: {
        total,
        pending,
        approved,
        rejected,
        cancelled,
        approvalRate: total > 0 ? (approved / total) * 100 : 0,
        rejectionRate: total > 0 ? (rejected / total) * 100 : 0,
        averageApprovalTimeHours: avgHours.toFixed(2),
        byType,
        byPriority,
      },
    });
  } catch (error) {
    console.error("Error fetching statistics:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching statistics",
    });
  }
};

// Get my approval requests (as requester)
exports.getMyApprovalRequests = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, businessType, limit = 50, skip = 0 } = req.query;

    const query = { requestedBy: userId };
    if (status) query.status = status;
    if (businessType) query.businessType = businessType;

    const requests = await ApprovalRequest.find(query)
      .sort({ submittedDate: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate("workflow", "name code")
      .populate("approvalChain.approvers.user", "name email");

    const total = await ApprovalRequest.countDocuments(query);

    res.status(200).json({
      success: true,
      count: requests.length,
      total,
      data: requests,
    });
  } catch (error) {
    console.error("Error fetching my requests:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching my requests",
    });
  }
};


