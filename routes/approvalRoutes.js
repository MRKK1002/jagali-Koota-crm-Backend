const express = require("express");
const router = express.Router();
const approvalController = require("../controller/approvalController");

// ==================== WORKFLOW ROUTES ====================
router.post("/workflows", approvalController.createWorkflow);
router.get("/workflows", approvalController.getAllWorkflows);
router.get("/workflows/:id", approvalController.getWorkflowById);
router.put("/workflows/:id", approvalController.updateWorkflow);
router.delete("/workflows/:id", approvalController.deleteWorkflow);

// ==================== APPROVAL REQUEST ROUTES ====================
router.post("/requests", approvalController.createApprovalRequest);
router.get("/requests", approvalController.getAllApprovalRequests);
router.get("/requests/:id", approvalController.getApprovalRequestById);

// User-specific routes
router.get("/requests/user/:userId/pending", approvalController.getPendingApprovalsForUser);
router.get("/requests/user/:userId/my-requests", approvalController.getMyApprovalRequests);

// Actions
router.post("/requests/:id/approve", approvalController.approveRequest);
router.post("/requests/:id/reject", approvalController.rejectRequest);
router.post("/requests/:id/cancel", approvalController.cancelRequest);
router.post("/requests/:id/resubmit", approvalController.resubmitRequest);

// Statistics
router.get("/stats/overview", approvalController.getApprovalStatistics);

module.exports = router;


