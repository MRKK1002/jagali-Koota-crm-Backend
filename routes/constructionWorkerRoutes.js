const express = require("express");
const router = express.Router();
const workerController = require("../controller/constructionWorkerController");
const attendanceController = require("../controller/constructionWorkerAttendanceController");

// Worker Routes
router.get("/workers", workerController.getWorkers);
router.get("/workers/stats", workerController.getWorkerStats);
router.get("/workers/:id", workerController.getWorkerById);
router.post("/workers", workerController.createWorker);
router.put("/workers/:id", workerController.updateWorker);
router.delete("/workers/:id", workerController.deleteWorker);

// Alternative singular routes (for compatibility)
router.get("/worker", workerController.getWorkers);
router.post("/worker", workerController.createWorker);
router.get("/worker/:id", workerController.getWorkerById);
router.put("/worker/:id", workerController.updateWorker);
router.delete("/worker/:id", workerController.deleteWorker);

// Attendance Routes
router.post("/attendance", attendanceController.markAttendance);
router.get("/attendance", attendanceController.getAttendance);
router.get("/attendance/summary", attendanceController.getAttendanceSummary);
router.post("/attendance/bulk", attendanceController.bulkMarkAttendance);

// Alternative attendance routes (for compatibility)
router.post("/workers-attendance", attendanceController.markAttendance);
router.get("/workers-attendance", attendanceController.getAttendance);
router.post("/attendanceCons", attendanceController.markAttendance);
router.get("/attendanceCons", attendanceController.getAttendance);

module.exports = router;
