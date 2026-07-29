const express = require('express');
const router = express.Router();
const {
    processPayroll,
    generatePayroll,
    getAllPayrolls,
    deletePayroll,
    getEmployeePayslips
} = require('../controller/payrollControllerConstruction');

// Process payroll for all employees for a given month
router.post('/process', processPayroll);

// Get employee payslips (for mobile app)
router.get('/employee', getEmployeePayslips);

// Legacy routes
router.post('/', generatePayroll);
router.get('/', getAllPayrolls);
router.delete('/:id', deletePayroll);

module.exports = router;
