const express = require("express");
const router = express.Router();
const attendanceController = require("../controller/simpleAttendanceController");

// Attendance routes
router.get("/", attendanceController.getAttendance);
router.post("/", attendanceController.createAttendance);
router.put("/:id", attendanceController.updateAttendance);
router.delete("/:id", attendanceController.deleteAttendance);

module.exports = router;
