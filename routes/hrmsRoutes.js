const express = require("express");
const router = express.Router();

// Import controllers for all HRMS components
// TEMPORARILY USING OLD CONTROLLERS TO GET WORKING - WILL FIX NEW ONES LATER
const {
  registerEmployeeWithFace,
  getAllEmployees,
  getEmployeeById,
  updateEmployeeWithImage,
  deleteEmployee,
  upload: employeeRegistrationUpload,
} = require("../controller/employeeRegistrationController");

const {
  getAttendance,
  getTodayAttendance,
  punchIn,
  punchOut,
  getAttendanceStats,
  getEmployeeAttendanceDetails,
  applyLeave,
} = require("../controller/attendanceController");

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
} = require("../controller/salaryController");

// TEMPORARY: Using old leave functionality for now
const applyLeaveNew = applyLeave; // Using old leave function temporarily

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

// Leave management
router.post("/attendance/apply-leave", applyLeave);

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

// Salary statistics and queue management
router.get("/salary/stats", getSalaryStats);
router.get("/salary/queue-status", getQueueStatus);
router.delete("/salary/clear-all", clearAllSalarySlips);

module.exports = router;
