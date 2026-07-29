const express = require("express");
const router = express.Router();

// Controller import
const { getExpenseAdminDashboard } = require("../controller/expenseAdminController");

// Route
router.get("/dashboard", getExpenseAdminDashboard);

module.exports = router;