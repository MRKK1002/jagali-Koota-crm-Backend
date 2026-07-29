const ApprovalWorkflow = require("../model/ApprovalWorkflow");
const ApprovalRequest = require("../model/ApprovalRequest");
const notificationService = require("./notificationService");

class ApprovalService {
  /**
   * Create an approval request
   */
  async createApprovalRequest({
    businessType,
    workflowType,
    title,
    description,
    requestedBy,
    department,
    priority,
    amount,
    relatedTo,
    justification,
    attachments,
    metadata,
  }) {
    try {
      // Find applicable workflow
      const workflow = await ApprovalWorkflow.findApplicableWorkflow(
        businessType,
        workflowType,
        amount,
        department,
        priority
      );

      if (!workflow) {
        throw new Error(
          `No active approval workflow found for ${workflowType} in ${businessType}`
        );
      }

      // Generate request number
      const requestNumber = await ApprovalRequest.generateRequestNumber(
        businessType,
        workflowType
      );

      // Build approval chain
      const approvalChain = workflow.levels
        .sort((a, b) => a.level - b.level)
        .map((level) => ({
          level: level.level,
          levelName: level.name,
          status: level.level === 1 ? "In Progress" : "Pending",
          approvers: level.approvers.map((approver) => ({
            user: approver.user,
            status: "Pending",
          })),
          startDate: level.level === 1 ? new Date() : null,
          requiredApprovals: level.minimumApprovers || 1,
          receivedApprovals: 0,
        }));

      // Create approval request
      const approvalRequest = new ApprovalRequest({
        requestNumber,
        workflow: workflow._id,
        workflowType,
        businessType,
        title,
        description,
        requestedBy,
        department,
        priority: priority || "Normal",
        amount: amount || 0,
        relatedTo,
        currentLevel: 1,
        totalLevels: workflow.levels.length,
        status: "In Progress",
        approvalChain,
        attachments,
        justification,
        metadata,
      });

      await approvalRequest.save();

      // Send notifications to first level approvers
      if (workflow.rules.notifyOnSubmit) {
        await this.notifyApprovers(approvalRequest, 1);
      }

      return approvalRequest;
    } catch (error) {
      console.error("Error creating approval request:", error);
      throw error;
    }
  }

  /**
   * Approve a request
   */
  async approveRequest({
    requestId,
    approverId,
    comments,
    attachments,
  }) {
    try {
      const request = await ApprovalRequest.findById(requestId).populate(
        "workflow"
      );

      if (!request) {
        throw new Error("Approval request not found");
      }

      if (request.status !== "In Progress") {
        throw new Error(
          `Cannot approve request with status: ${request.status}`
        );
      }

      if (!request.canUserApprove(approverId)) {
        throw new Error("User is not authorized to approve at this level");
      }

      // Approve the request
      await request.approveLevel(approverId, comments, attachments);

      // Send notifications
      if (request.workflow.rules.notifyOnApproval) {
        // Notify requester
        await this.notifyRequester(request, "approved");

        // If approved completely
        if (request.status === "Approved") {
          await this.notifyFinalApproval(request);
        } else {
          // Notify next level approvers
          await this.notifyApprovers(request, request.currentLevel);
        }
      }

      return request;
    } catch (error) {
      console.error("Error approving request:", error);
      throw error;
    }
  }

  /**
   * Reject a request
   */
  async rejectRequest({
    requestId,
    approverId,
    reason,
    comments,
    attachments,
  }) {
    try {
      const request = await ApprovalRequest.findById(requestId).populate(
        "workflow"
      );

      if (!request) {
        throw new Error("Approval request not found");
      }

      if (request.status !== "In Progress") {
        throw new Error(
          `Cannot reject request with status: ${request.status}`
        );
      }

      if (!request.canUserApprove(approverId)) {
        throw new Error("User is not authorized to reject at this level");
      }

      // Reject the request
      await request.rejectLevel(approverId, reason, comments, attachments);

      // Send notification to requester
      if (request.workflow.rules.notifyOnRejection) {
        await this.notifyRequester(request, "rejected", reason);
      }

      return request;
    } catch (error) {
      console.error("Error rejecting request:", error);
      throw error;
    }
  }

  /**
   * Cancel a request
   */
  async cancelRequest({ requestId, userId, reason }) {
    try {
      const request = await ApprovalRequest.findById(requestId);

      if (!request) {
        throw new Error("Approval request not found");
      }

      // Check if user is the requester
      if (request.requestedBy.toString() !== userId.toString()) {
        throw new Error("Only the requester can cancel the request");
      }

      if (["Approved", "Rejected", "Cancelled"].includes(request.status)) {
        throw new Error(`Cannot cancel request with status: ${request.status}`);
      }

      await request.cancel(userId, reason);

      return request;
    } catch (error) {
      console.error("Error cancelling request:", error);
      throw error;
    }
  }

  /**
   * Resubmit a rejected request
   */
  async resubmitRequest({
    requestId,
    updatedData,
    justification,
  }) {
    try {
      const request = await ApprovalRequest.findById(requestId).populate(
        "workflow"
      );

      if (!request) {
        throw new Error("Approval request not found");
      }

      if (request.status !== "Rejected") {
        throw new Error("Only rejected requests can be resubmitted");
      }

      if (!request.workflow.rules.allowResubmission) {
        throw new Error("Resubmission is not allowed for this workflow");
      }

      if (
        request.resubmissionCount >= request.workflow.rules.maxResubmissions
      ) {
        throw new Error("Maximum resubmissions exceeded");
      }

      // Save previous version
      request.previousVersions.push({
        version: request.resubmissionCount + 1,
        data: {
          title: request.title,
          description: request.description,
          amount: request.amount,
          justification: request.justification,
        },
        submittedDate: request.submittedDate,
        rejectionReason: request.rejectionReason,
      });

      // Update request data
      Object.assign(request, updatedData);
      request.justification = justification;
      request.status = "In Progress";
      request.currentLevel = 1;
      request.submittedDate = new Date();
      request.completedDate = null;
      request.rejectionReason = null;
      request.resubmissionCount += 1;

      // Reset approval chain
      request.approvalChain.forEach((level, index) => {
        level.status = index === 0 ? "In Progress" : "Pending";
        level.startDate = index === 0 ? new Date() : null;
        level.endDate = null;
        level.receivedApprovals = 0;
        level.approvers.forEach((approver) => {
          approver.status = "Pending";
          approver.actionDate = null;
        });
      });

      await request.save();

      // Notify first level approvers
      await this.notifyApprovers(request, 1);

      return request;
    } catch (error) {
      console.error("Error resubmitting request:", error);
      throw error;
    }
  }

  /**
   * Get pending approvals for user
   */
  async getPendingApprovalsForUser(userId, businessType) {
    try {
      return await ApprovalRequest.getPendingApprovalsForUser(
        userId,
        businessType
      );
    } catch (error) {
      console.error("Error getting pending approvals:", error);
      throw error;
    }
  }

  /**
   * Get approval request details
   */
  async getApprovalRequest(requestId) {
    try {
      return await ApprovalRequest.findById(requestId)
        .populate("workflow")
        .populate("requestedBy", "name email")
        .populate("approvalChain.approvers.user", "name email")
        .populate("actions.approver", "name email");
    } catch (error) {
      console.error("Error getting approval request:", error);
      throw error;
    }
  }

  /**
   * Notify approvers at a level
   */
  async notifyApprovers(request, level) {
    try {
      const levelData = request.approvalChain.find((l) => l.level === level);

      if (!levelData) return;

      const approverIds = levelData.approvers.map((a) => a.user);

      // Get user details
      const SubAdmin = require("../model/SubAdmin");
      const approvers = await SubAdmin.find({ _id: { $in: approverIds } });

      for (const approver of approvers) {
        await notificationService.sendToUser({
          userId: approver._id,
          title: `Approval Required - ${request.title}`,
          message: `${request.workflowType} #${request.requestNumber} requires your approval`,
          businessType: request.businessType,
          notificationType: "Approval",
          priority: request.priority,
          email: {
            emailTo: [approver.email],
            subject: `Approval Required - ${request.requestNumber}`,
            body: `Hello ${approver.name},\n\n${request.title} requires your approval.\n\nType: ${request.workflowType}\nReference: ${request.requestNumber}\nAmount: ₹${request.amount}\nRequested By: ${request.requestedBy.name}\n\nPlease review and take action.`,
          },
          relatedTo: {
            model: "ApprovalRequest",
            id: request._id,
            reference: request.requestNumber,
          },
          actionUrl: `/approvals/${request._id}`,
        });
      }

      request.notificationsSent.push({
        type: "Approval Required",
        recipient: approverIds,
        sentDate: new Date(),
      });

      await request.save();
    } catch (error) {
      console.error("Error notifying approvers:", error);
    }
  }

  /**
   * Notify requester
   */
  async notifyRequester(request, status, reason) {
    try {
      const title =
        status === "approved"
          ? `Request Approved - ${request.requestNumber}`
          : `Request Rejected - ${request.requestNumber}`;

      const message =
        status === "approved"
          ? `Your ${request.workflowType} has been approved at level ${request.currentLevel - 1}`
          : `Your ${request.workflowType} has been rejected. Reason: ${reason}`;

      await notificationService.sendToUser({
        userId: request.requestedBy,
        title,
        message,
        businessType: request.businessType,
        notificationType: "Approval",
        priority: "Normal",
        email: {
          emailTo: [request.requestedBy.email],
          subject: title,
          body: message,
        },
        relatedTo: {
          model: "ApprovalRequest",
          id: request._id,
          reference: request.requestNumber,
        },
      });
    } catch (error) {
      console.error("Error notifying requester:", error);
    }
  }

  /**
   * Notify final approval
   */
  async notifyFinalApproval(request) {
    try {
      await notificationService.sendToUser({
        userId: request.requestedBy,
        title: `Request Fully Approved - ${request.requestNumber}`,
        message: `Your ${request.workflowType} has been fully approved and is ready for processing`,
        businessType: request.businessType,
        notificationType: "Approval",
        priority: "Normal",
        email: {
          emailTo: [request.requestedBy.email],
          subject: `Fully Approved - ${request.requestNumber}`,
          body: `Congratulations! Your ${request.workflowType} has been fully approved.\n\nReference: ${request.requestNumber}\nAmount: ₹${request.amount}\n\nNext steps will be processed automatically.`,
        },
        relatedTo: {
          model: "ApprovalRequest",
          id: request._id,
          reference: request.requestNumber,
        },
      });
    } catch (error) {
      console.error("Error notifying final approval:", error);
    }
  }

  /**
   * Check and process escalations
   */
  async processEscalations() {
    try {
      const requests = await ApprovalRequest.find({
        status: "In Progress",
        isEscalated: false,
      }).populate("workflow");

      for (const request of requests) {
        const currentLevelData = request.approvalChain.find(
          (l) => l.level === request.currentLevel
        );

        if (!currentLevelData || !currentLevelData.startDate) continue;

        const workflow = request.workflow;
        const level = workflow.levels.find(
          (l) => l.level === request.currentLevel
        );

        if (!level || !level.escalationTime) continue;

        const hoursSinceStart =
          (new Date() - currentLevelData.startDate) / (1000 * 60 * 60);

        if (hoursSinceStart >= level.escalationTime) {
          // Escalate
          request.isEscalated = true;
          request.escalationDate = new Date();
          request.escalatedTo = level.escalateTo;

          await request.save();

          // Notify escalation recipients
          if (level.escalateTo && level.escalateTo.length > 0) {
            for (const userId of level.escalateTo) {
              await notificationService.sendToUser({
                userId,
                title: `Escalation - ${request.requestNumber}`,
                message: `Approval request ${request.requestNumber} has been escalated to you`,
                businessType: request.businessType,
                notificationType: "Alert",
                priority: "High",
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error processing escalations:", error);
    }
  }
}

module.exports = new ApprovalService();


