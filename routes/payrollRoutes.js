const express = require("express");
const router = express.Router();
const payrollController = require("../controller/payrollController");

// Payroll routes
router.get("/", payrollController.getAllPayrolls);
router.post("/process", payrollController.processPayroll);
router.get("/:id", payrollController.getPayrollById);
router.put("/:id", payrollController.updatePayroll);
router.delete("/:id", payrollController.deletePayroll);

module.exports = router;
