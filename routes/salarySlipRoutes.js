const express = require('express');
const router = express.Router();
const {
  createSalarySlip,
  getSalarySlips,
  generateMonthlySalarySlips,
  getSalarySlipById,
  updateSalarySlipStatus,
  editSalarySlip,
  getSalarySlipStats
} = require('../controller/salarySlipController');

// Routes
router.post('/', createSalarySlip);
router.get('/', getSalarySlips);
router.get('/stats/summary', getSalarySlipStats); // Must be before /:id to avoid conflict
router.get('/:id', getSalarySlipById);
router.put('/:id/status', updateSalarySlipStatus);
router.put('/:id/edit', editSalarySlip); // Add edit endpoint
router.post('/generate-monthly', generateMonthlySalarySlips);

module.exports = router;