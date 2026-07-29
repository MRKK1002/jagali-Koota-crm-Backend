const express = require("express");
const router = express.Router();

// Import controllers for all HRMS components
const {
  registerEmployeeWithFace,
  getAllEmployees,
  getEmployeeById,
  updateEmployeeWithImage,
  deleteEmployee,
  upload: employeeRegistrationUpload,
} = require("../RestaurantController/RestaurantEmployeeRegistrationController");

const {
  getAttendance,
  getTodayAttendance,
  punchIn,
  punchOut,
  getAttendanceStats,
  getEmployeeAttendanceDetails,
  applyLeave,
} = require("../RestaurantController/RestaurantAttendanceController");

const {
  generateSalarySlip,
  generateAllSalarySlips,
  generateMonthlySalarySlips,
  getSalarySlips,
  getSalarySlipById,
  downloadSalarySlip,
  viewSalarySlip,
  getSalaryStats,
  getQueueStatus,
  clearAllSalarySlips,
  editSalarySlip,
  approveSalarySlip,
} = require("../RestaurantController/RestaurantSalaryController");

const {
  applyLeave: applyLeaveNew,
  getLeaveApplications,
  getLeaveApplicationById,
  approveLeave,
  rejectLeave,
  cancelLeave,
  getPendingLeaves,
  getEmployeeLeaveHistory,
  getLeaveBalance,
  getLeaveStats,
  validateLeaveApplication,
  checkLeaveStatus,
  editLeave,
  getMyLeaves,
} = require("../RestaurantController/RestaurantLeaveController");

// ===== EMPLOYEE REGISTRATION ROUTES =====
router.post(
  "/register-employee",
  employeeRegistrationUpload.single("faceImage"),
  registerEmployeeWithFace
);
router.get("/employees", getAllEmployees);
router.get("/employee/:id", getEmployeeById);
router.put(
  "/employee/:id",
  employeeRegistrationUpload.single("faceImage"),
  updateEmployeeWithImage
);
router.delete("/employee/:id", deleteEmployee);

// ===== ATTENDANCE MONITORING ROUTES =====
// Get attendance records with filtering
router.get("/attendance", getAttendance);
router.get("/attendance/today", getTodayAttendance);
router.get("/attendance/stats", getAttendanceStats);
router.get("/attendance/employee/:employeeId", getEmployeeAttendanceDetails);

// Punch in/out endpoints
router.post("/attendance/punch-in", punchIn);
router.post("/attendance/punch-out", punchOut);

// Leave management (legacy - keeping for backward compatibility)
router.post("/attendance/apply-leave", applyLeave);

// ===== LEAVE MANAGEMENT ROUTES (NEW) =====
router.post("/leave/apply", applyLeaveNew);
router.post("/leave/validate", validateLeaveApplication); // NEW: Validate before applying
router.get("/leave", getLeaveApplications);
router.get("/leave/pending", getPendingLeaves);
router.get("/leave/stats", getLeaveStats);
router.get("/leave/my-leaves/:employeeId", getMyLeaves); // NEW: Get employee's own leaves
router.get("/leave/check-status/:employeeId/:date", checkLeaveStatus); // NEW: Check leave for specific date
router.get("/leave/:id", getLeaveApplicationById);
router.put("/leave/:id/approve", approveLeave);
router.put("/leave/:id/reject", rejectLeave);
router.put("/leave/:id/edit", editLeave); // NEW: Edit pending leave
router.delete("/leave/:id", cancelLeave);
router.get("/leave/employee/:employeeId/history", getEmployeeLeaveHistory);
router.get("/leave/employee/:employeeId/balance", getLeaveBalance);

// ===== SALARY SLIP GENERATION ROUTES =====
// Generate salary slips
router.post("/salary/generate", generateSalarySlip);
router.post("/salary/generate-all", generateAllSalarySlips);
router.post("/salary/generate-monthly", generateMonthlySalarySlips);

// Get salary slips
router.get("/salary/slips", getSalarySlips);
router.get("/salary/slip/:id", getSalarySlipById);
router.get("/salary/slip/:id/download", downloadSalarySlip);
router.get("/salary/slip/:id/view", viewSalarySlip);

// Edit and approve salary slips (NEW)
router.put("/salary/slip/:id/edit", editSalarySlip);
router.put("/salary/slip/:id/approve", approveSalarySlip);

// Salary statistics and queue management
router.get("/salary/stats", getSalaryStats);
router.get("/salary/queue-status", getQueueStatus);
router.delete("/salary/clear-all", clearAllSalarySlips);

// ===== SHIFT MANAGEMENT ROUTES =====
const shiftRoutes = require("./RestaurantShiftRoutes");
router.use("/shifts", shiftRoutes);

module.exports = router;
