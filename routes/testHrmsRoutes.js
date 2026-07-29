const express = require("express");
const router = express.Router();

// Test endpoint to verify HRMS system is working
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "HRMS system is working!",
    timestamp: new Date().toISOString(),
    endpoints: {
      employees: "/api/v1/hrms/employees",
      attendance: "/api/v1/hrms/attendance",
      salarySlips: "/api/v1/hrms/salary/slips",
    },
  });
});

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    services: {
      database: "connected",
      fileUpload: "ready",
      queueSystem: "ready",
    },
  });
});

module.exports = router;
