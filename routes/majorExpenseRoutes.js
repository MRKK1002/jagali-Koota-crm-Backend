// const express = require('express');
// const router = express.Router();
// const controller = require('../controller/majorExpenseController');

// // Base path: /construction/major
// router.get('/', controller.getAllExpenses);
// router.get('/:id', controller.getExpenseById);
// router.post('/', controller.createExpense);
// router.put('/:id', controller.updateExpense);
// router.delete('/:id', controller.deleteExpense);
// router.get('/report', controller.generateReport);
// router.get('/dashboard-stats', controller.getDashboardStats);

// module.exports = router;

const express = require("express");
const router = express.Router();
const controller = require("../controller/majorExpenseController");

// Base path: /construction/major

// ✅ Static and special routes first
router.get("/report", controller.generateReport);
router.get("/dashboard-stats", controller.getDashboardStats);

// ✅ Budget routes
router.post("/set-budget", controller.setSiteBudget);
router.get("/budgets", controller.getSiteBudgets);

// ✅ Main expense routes
router.get("/", controller.getAllExpenses);
router.post("/", controller.createExpense);

// ✅ Dynamic ID routes SHOULD ALWAYS be in the end
router.get("/:id", controller.getExpenseById);
router.put("/:id", controller.updateExpense);
router.delete("/:id", controller.deleteExpense);

module.exports = router;
