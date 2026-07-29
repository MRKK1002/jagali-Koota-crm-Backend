const express = require('express');
const router = express.Router();
const {
  submitFeedback,
  getMyFeedback,
  getAllFeedback,
  getFeedbackById,
  updateFeedbackStatus,
  deleteFeedback,
  getFeedbackStats
} = require('../controller/feedbackController');

// Import middleware
const authMiddleware = require('../middleware/authMiddleware');
const { protect: adminProtect } = require('../middleware/employeeAuthMiddleware');

// Member routes - using the default authMiddleware
router.post('/', authMiddleware, submitFeedback);
router.get('/my-feedback', authMiddleware, getMyFeedback);

// Admin routes
router.get('/all', adminProtect, getAllFeedback);
router.get('/stats/overview', adminProtect, getFeedbackStats);
router.get('/:id', adminProtect, getFeedbackById);
router.put('/:id', adminProtect, updateFeedbackStatus);
router.delete('/:id', adminProtect, deleteFeedback);

module.exports = router;
