const express = require("express");
const router = express.Router();
const attendanceController = require("../RestaurantController/RestaurantAttendanceController");

// Basic attendance routes
router.get("/", attendanceController.getAllAttendance);
router.post("/", attendanceController.createAttendance);

// Punch in/out routes
router.post("/punch-in", attendanceController.punchIn);
router.post("/punch-out", attendanceController.punchOut);

// Test route to create sample attendance data
router.post("/create-sample", async (req, res) => {
  try {
    const { employeeId } = req.body;
    const AttendanceRecord = require("../RestautantModel/RestaurantAttendanceRecord");
    const Employee = require("../RestautantModel/RestaurantEmployeeSchema");
    
    console.log("Creating sample data for employee ID:", employeeId);
    
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    console.log("Found employee:", employee.name);

    // Create sample attendance record for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if record already exists
    const existingRecord = await AttendanceRecord.findOne({
      employee: employeeId,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (existingRecord) {
      return res.json({ success: true, message: "Attendance record already exists for today", data: existingRecord });
    }
    
    const sampleRecord = new AttendanceRecord({
      employee: employeeId,
      empId: employee.employeeId || `EMP${String(employeeId).substring(0, 8)}`,
      employeeName: employee.name,
      date: today,
      punchIn: {
        time: new Date(today.getTime() + 9 * 60 * 60 * 1000), // 9 AM
        location: "Office - Building A, Floor 3"
      },
      punchOut: {
        time: new Date(today.getTime() + 17.5 * 60 * 60 * 1000), // 5:30 PM
        location: "Office - Building A, Floor 3"
      },
      status: "Present",
      workingHours: 8.5
    });

    await sampleRecord.save();
    console.log("Sample record created:", sampleRecord._id);
    res.json({ success: true, message: "Sample attendance created", data: sampleRecord });
  } catch (error) {
    console.error("Error creating sample attendance:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Face recognition routes (disabled)
router.post("/face-punch-in", attendanceController.faceRecognitionPunchIn);
router.post("/face-punch-out", attendanceController.faceRecognitionPunchOut);

module.exports = router;
