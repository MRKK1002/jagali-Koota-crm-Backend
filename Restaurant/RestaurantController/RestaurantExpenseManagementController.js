const ExpenseManagement = require("../model/ExpenseManagement");
const Settings = require("../model/Settings");
const Branch = require("../model/Branch");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

// Add new expense (with file upload)
const addExpense = async (req, res) => {
  try {
    const { date, type, amount, person, branchId, branchName, branchAddress } = req.body;

    if (!date || !type || !amount || !person || !branchId) {
      return res.status(400).json({
        message: "All fields are required: date, type, amount, person, branchId",
      });
    }

    const documentName = req.file.originalname;
    const filePath = `/uploads/${req.file.filename}`;

    // Validate type exists in settings
    const settings = await Settings.findOne();
    if (!settings.expenseTypes.includes(type)) {
      return res.status(400).json({ message: "Invalid expense type" });
    }

    const newExpense = new ExpenseManagement({
      date,
      type,
      amount: parseFloat(amount),
      person,
      documentName,
      filePath,
      branch: {
        id: branchId,
        name: branchName,
        address: branchAddress
      }
    });
    
    await newExpense.save();
    res.status(201).json(newExpense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all expenses
const getExpenses = async (req, res) => {
  try {
    const expenses = await ExpenseManagement.find().sort({ date: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Download expense document
const downloadExpenseDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await ExpenseManagement.findById(id);
    
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    const filePath = path.join(__dirname, "..", expense.filePath);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" });
    }

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(expense.documentName)}"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update expense
const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, type, amount, person, branchId, branchName, branchAddress } = req.body;

    const expense = await ExpenseManagement.findById(id);
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    // Validate type exists in settings
    if (type) {
      const settings = await Settings.findOne();
      if (!settings.expenseTypes.includes(type)) {
        return res.status(400).json({ message: "Invalid expense type" });
      }
    }

    // Update fields
    if (date) expense.date = date;
    if (type) expense.type = type;
    if (amount !== undefined) expense.amount = parseFloat(amount);
    if (person) expense.person = person;
    if (branchId) {
      expense.branch = {
        id: branchId,
        name: branchName || expense.branch.name,
        address: branchAddress || expense.branch.address
      };
    }

    // Handle file upload if provided
    if (req.file) {
      // Delete old file if exists
      if (expense.filePath) {
        const oldFilePath = path.join(__dirname, "..", expense.filePath);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      expense.documentName = req.file.originalname;
      expense.filePath = `/uploads/${req.file.filename}`;
    }

    await expense.save();
    res.json(expense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete expense
const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await ExpenseManagement.findById(id);
    
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    // Delete associated file if exists
    if (expense.filePath) {
      const filePath = path.join(__dirname, "..", expense.filePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await ExpenseManagement.findByIdAndDelete(id);
    res.json({ message: "Expense deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { addExpense, getExpenses, downloadExpenseDocument, updateExpense, deleteExpense };
