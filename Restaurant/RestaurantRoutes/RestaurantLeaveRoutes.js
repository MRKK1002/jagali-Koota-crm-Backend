const express = require("express");
const router = express.Router();
const leaveController = require("../RestaurantController/RestaurantLeaveController");

// Apply for leave
router.post("/apply", leaveController.applyLeave);

// Get leave applications (with filters)
router.get("/", leaveController.getLeaveApplications);

// Get pending leave applications
router.get("/pending", leaveController.getPendingLeaves);

// Get leave statistics
router.get("/stats", leaveController.getLeaveStats);

// Get single leave application
router.get("/:id", leaveController.getLeaveApplicationById);

// Approve leave
router.put("/:id/approve", leaveController.approveLeave);

// Reject leave
router.put("/:id/reject", leaveController.rejectLeave);

// Cancel leave (delete)
router.delete("/:id", leaveController.cancelLeave);

// Get employee leave history
router.get("/employee/:employeeId/history", leaveController.getEmployeeLeaveHistory);

// Get employee leave balance
router.get("/employee/:employeeId/balance", leaveController.getLeaveBalance);

module.exports = router;

