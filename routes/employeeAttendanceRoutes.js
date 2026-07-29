const express = require('express');
const router = express.Router();
const {
  checkIn,
  checkOut,
  getTodayStatus,
  getHistory,
  getAllAttendanceForAdmin
} = require('../controller/employeeAttendanceController');
const { protect } = require('../middleware/employeeAuthMiddleware');

// Employee routes require authentication
router.post('/check-in', protect, checkIn);
router.put('/check-out', protect, checkOut);
router.get('/today', protect, getTodayStatus);
router.get('/history', protect, getHistory);

// Admin routes (no authentication required)
router.get('/admin/all', getAllAttendanceForAdmin);

module.exports = router;
