const express = require('express');
const router = express.Router();
const {
  getAllExpenses,
  createExpense,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getReport,
  getDashboardStats
} = require('../controller/accountantExpenseController');

// GET all major expenses
router.get('/expenses', getAllExpenses);

// GET dashboard stats
router.get('/dashboard', getDashboardStats);

// GET expense by ID
router.get('/expenses/:id', getExpenseById);

// POST create new expense
router.post('/expenses', createExpense);

// PUT update expense
router.put('/expenses/:id', updateExpense);

// DELETE expense
router.delete('/expenses/:id', deleteExpense);

// GET report
router.get('/report', getReport);

module.exports = router;