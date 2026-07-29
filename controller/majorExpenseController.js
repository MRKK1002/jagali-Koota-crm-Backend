// const MajorExpense = require('../model/MajorExpense');

// // GET all expenses
// exports.getAllExpenses = async (req, res) => {
//   try {
//     const { page = 1, limit = 10, type, status, paymentMethod, startDate, endDate } = req.query;
//     const filter = {};

//     if (type) filter.type = type;
//     if (status) filter.status = status;
//     if (paymentMethod) filter.paymentMethod = paymentMethod;
//     if (startDate || endDate) {
//       filter.date = {};
//       if (startDate) filter.date.$gte = new Date(startDate);
//       if (endDate) filter.date.$lte = new Date(endDate);
//     }

//     const expenses = await MajorExpense.find(filter)
//       .populate('createdBy', 'name email')
//       .populate('approvedBy', 'name email')
//       .populate('projectId', 'name')
//       .populate('siteId', 'name')
//       .sort({ date: -1 })
//       .limit(Number(limit))
//       .skip((Number(page) - 1) * Number(limit));

//     const total = await MajorExpense.countDocuments(filter);

//     res.status(200).json({
//       success: true,
//       expenses,
//       totalPages: Math.ceil(total / limit),
//       currentPage: Number(page),
//       total
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: 'Error fetching expenses', error: error.message });
//   }
// };

// // GET single expense by ID
// exports.getExpenseById = async (req, res) => {
//   try {
//     const expense = await MajorExpense.findById(req.params.id)
//       .populate('createdBy', 'name email')
//       .populate('approvedBy', 'name email')
//       .populate('projectId', 'name')
//       .populate('siteId', 'name');

//     if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });

//     res.status(200).json({ success: true, expense });
//   } catch (error) {
//     res.status(500).json({ success: false, message: 'Error fetching expense', error: error.message });
//   }
// };

// // CREATE new expense
// exports.createExpense = async (req, res) => {
//   try {
//     const expenseData = {
//       ...req.body,
//       createdBy: req.body.createdBy || '60d0fe4f5311236168a109ca' // fallback ID
//     };

//     const expense = new MajorExpense(expenseData);
//     await expense.save();

//     await expense.populate('createdBy', 'name email')
//                  .populate('projectId', 'name')
//                  .populate('siteId', 'name');

//     res.status(201).json({ success: true, message: 'Expense created', expense });
//   } catch (error) {
//     res.status(400).json({ success: false, message: 'Error creating expense', error: error.message });
//   }
// };

// // UPDATE expense
// exports.updateExpense = async (req, res) => {
//   try {
//     const expense = await MajorExpense.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
//       .populate('createdBy', 'name email')
//       .populate('approvedBy', 'name email')
//       .populate('projectId', 'name')
//       .populate('siteId', 'name');

//     if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });

//     res.status(200).json({ success: true, message: 'Expense updated', expense });
//   } catch (error) {
//     res.status(400).json({ success: false, message: 'Error updating expense', error: error.message });
//   }
// };

// // DELETE expense
// exports.deleteExpense = async (req, res) => {
//   try {
//     const expense = await MajorExpense.findByIdAndDelete(req.params.id);
//     if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });

//     res.status(200).json({ success: true, message: 'Expense deleted' });
//   } catch (error) {
//     res.status(500).json({ success: false, message: 'Error deleting expense', error: error.message });
//   }
// };

// // REPORT
// exports.generateReport = async (req, res) => {
//   try {
//     const { startDate, endDate } = req.query;
//     const filter = {};
//     if (startDate || endDate) {
//       filter.date = {};
//       if (startDate) filter.date.$gte = new Date(startDate);
//       if (endDate) filter.date.$lte = new Date(endDate);
//     }

//     const expenses = await MajorExpense.find(filter)
//       .populate('projectId', 'name')
//       .populate('siteId', 'name');

//     const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
//     const typeBreakdown = expenses.reduce((acc, e) => {
//       acc[e.type] = (acc[e.type] || 0) + e.amount;
//       return acc;
//     }, {});

//     res.status(200).json({
//       success: true,
//       report: { totalExpenses, typeBreakdown, count: expenses.length, expenses }
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: 'Error generating report', error: error.message });
//   }
// };

// // DASHBOARD STATS
// exports.getDashboardStats = async (req, res) => {
//   try {
//     const currentMonth = new Date();
//     const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
//     const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

//     const current = await MajorExpense.aggregate([
//       { $match: { date: { $gte: firstDay, $lte: lastDay } } },
//       {
//         $group: {
//           _id: null,
//           total: { $sum: '$amount' },
//           cash: { $sum: { $cond: [{ $eq: ['$paymentMethod', 'cash'] }, '$amount', 0] } },
//           bank: { $sum: { $cond: [{ $eq: ['$paymentMethod', 'bank'] }, '$amount', 0] } },
//           count: { $sum: 1 }
//         }
//       }
//     ]);

//     const stats = current[0] || { total: 0, cash: 0, bank: 0, count: 0 };
//     res.status(200).json({ success: true, stats });
//   } catch (error) {
//     res.status(500).json({ success: false, message: 'Error fetching stats', error: error.message });
//   }
// };
const MajorExpense = require("../model/MajorExpense");
const mongoose = require("mongoose");

// GET all expenses + budgets
exports.getAllExpenses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      status,
      paymentMethod,
      startDate,
      endDate,
      site,
    } = req.query;
    const filter = {};

    if (type) filter.type = type;
    if (status) filter.status = status;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (site) filter.site = site;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const expenses = await MajorExpense.find(filter)
      .populate("createdBy", "name email")
      .populate("approvedBy", "name email")
      .populate("projectId", "name")
      .populate("siteId", "name")
      .sort({ date: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await MajorExpense.countDocuments(filter);

    res.status(200).json({
      success: true,
      expenses,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      total,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching expenses",
      error: error.message,
    });
  }
};

// GET expense by id
exports.getExpenseById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const expense = await MajorExpense.findById(id)
      .populate("createdBy", "name email")
      .populate("approvedBy", "name email")
      .populate("projectId", "name")
      .populate("siteId", "name");

    if (!expense) return res.status(404).json({ success: false, message: "Expense not found" });

    res.status(200).json({ success: true, expense });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching expense",
      error: error.message,
    });
  }
};

// CREATE expense (auto-update budget)
exports.createExpense = async (req, res) => {
  try {
    const { amount, siteBudget } = req.body;

    const expenseData = {
      ...req.body,
      createdBy: req.body.createdBy || "60d0fe4f5311236168a109ca",
    };

    const expense = new MajorExpense(expenseData);
    await expense.save();

    // UPDATE BUDGET IF PROVIDED (update the saved document's siteBudget)
    if (siteBudget && siteBudget.siteName) {
      // set those fields and increment spentAmount
      const updateObj = {
        $set: {
          "siteBudget.siteName": siteBudget.siteName,
          "siteBudget.budgetAmount": siteBudget.budgetAmount,
          "siteBudget.isActive": siteBudget.isActive !== undefined ? siteBudget.isActive : true,
        },
        $inc: {
          "siteBudget.spentAmount": Number(amount || 0),
        },
      };

      await MajorExpense.updateOne({ _id: expense._id }, updateObj, { upsert: false });
    }

    await expense
      .populate("createdBy", "name email")
      .populate("projectId", "name")
      .populate("siteId", "name");

    res.status(201).json({ success: true, message: "Expense created", expense });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error creating expense",
      error: error.message,
    });
  }
};

// UPDATE expense by id
exports.updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const updated = await MajorExpense.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("createdBy", "name email")
      .populate("approvedBy", "name email")
      .populate("projectId", "name")
      .populate("siteId", "name");

    if (!updated) return res.status(404).json({ success: false, message: "Expense not found" });

    res.status(200).json({ success: true, message: "Expense updated", expense: updated });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error updating expense",
      error: error.message,
    });
  }
};

// DELETE expense by id
exports.deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const deleted = await MajorExpense.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: "Expense not found" });

    res.status(200).json({ success: true, message: "Expense deleted" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting expense",
      error: error.message,
    });
  }
};

// SET / UPDATE SITE BUDGET
exports.setSiteBudget = async (req, res) => {
  try {
    const { siteName, budgetAmount } = req.body;
    if (!siteName || budgetAmount === undefined) {
      return res.status(400).json({ success: false, message: "siteName and budgetAmount required" });
    }

    // Update all documents that have this site field (use updateMany)
    const result = await MajorExpense.updateMany(
      { site: siteName },
      {
        $set: {
          "siteBudget.siteName": siteName,
          "siteBudget.budgetAmount": budgetAmount,
          "siteBudget.isActive": true,
        },
      }
    );

    if (result.matchedCount === 0 || result.matched === 0) {
      // No documents matched — create a dummy budget entry (so budgets list can show this site)
      const dummy = new MajorExpense({
        site: siteName,
        type: "Budget",
        amount: 0,
        description: `Budget set for ${siteName}`,
        paymentMethod: "bank",
        createdBy: req.body.createdBy || "60d0fe4f5311236168a109ca",
        siteBudget: {
          siteName,
          budgetAmount,
          spentAmount: 0,
          isActive: true,
        },
      });
      await dummy.save();
    }

    res.status(200).json({ success: true, message: "Budget set successfully" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error setting budget",
      error: error.message,
    });
  }
};

// GET ALL SITE BUDGETS
exports.getSiteBudgets = async (req, res) => {
  try {
    const budgets = await MajorExpense.aggregate([
      {
        $match: {
          "siteBudget.siteName": { $exists: true, $ne: null },
          "siteBudget.isActive": true,
        },
      },
      {
        $group: {
          _id: "$siteBudget.siteName",
          siteName: { $first: "$siteBudget.siteName" },
          budgetAmount: { $first: "$siteBudget.budgetAmount" },
          // some documents may carry siteBudget.spentAmount, others carry normal expense amounts
          budgetSpentFromField: { $sum: { $ifNull: ["$siteBudget.spentAmount", 0] } },
          totalExpenses: { $sum: { $ifNull: ["$amount", 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          site: "$siteName",
          budget: "$budgetAmount",
          spent: { $add: ["$budgetSpentFromField", "$totalExpenses"] },
          remaining: { $subtract: ["$budgetAmount", { $add: ["$budgetSpentFromField", "$totalExpenses"] }] },
        },
      },
    ]);

    res.status(200).json({ success: true, budgets });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching budgets",
      error: error.message,
    });
  }
};

// GENERATE REPORT (example: totals grouped by site or type within optional date range)
exports.generateReport = async (req, res) => {
  try {
    const { groupBy = "site", startDate, endDate } = req.query;
    const match = {};

    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = new Date(startDate);
      if (endDate) match.date.$lte = new Date(endDate);
    }

    // Allowed groupBy: site, type, paymentMethod
    let groupField = "$site";
    if (groupBy === "type") groupField = "$type";
    if (groupBy === "paymentMethod") groupField = "$paymentMethod";

    const report = await MajorExpense.aggregate([
      { $match: match },
      {
        $group: {
          _id: groupField,
          totalAmount: { $sum: { $ifNull: ["$amount", 0] } },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          group: "$_id",
          totalAmount: 1,
          count: 1,
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);

    res.status(200).json({ success: true, report });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error generating report",
      error: error.message,
    });
  }
};

// DASHBOARD STATS (basic example)
exports.getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalExpensesAggregation] = await MajorExpense.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: { $ifNull: ["$amount", 0] } },
          totalCount: { $sum: 1 },
        },
      },
    ]);

    const [monthAggregation] = await MajorExpense.aggregate([
      {
        $match: { date: { $gte: startOfMonth } },
      },
      {
        $group: {
          _id: null,
          monthAmount: { $sum: { $ifNull: ["$amount", 0] } },
          monthCount: { $sum: 1 },
        },
      },
    ]);

    // Active budgets summary
    const budgets = await MajorExpense.aggregate([
      {
        $match: {
          "siteBudget.siteName": { $exists: true, $ne: null },
          "siteBudget.isActive": true,
        },
      },
      {
        $group: {
          _id: "$siteBudget.siteName",
          budgetAmount: { $first: "$siteBudget.budgetAmount" },
          spentAmount: { $sum: { $ifNull: ["$siteBudget.spentAmount", 0] } },
          expenseSum: { $sum: { $ifNull: ["$amount", 0] } },
        },
      },
      {
        $project: {
          site: "$_id",
          budget: "$budgetAmount",
          spent: { $add: ["$spentAmount", "$expenseSum"] },
          remaining: { $subtract: ["$budgetAmount", { $add: ["$spentAmount", "$expenseSum"] }] },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalAmount: totalExpensesAggregation ? totalExpensesAggregation.totalAmount : 0,
        totalCount: totalExpensesAggregation ? totalExpensesAggregation.totalCount : 0,
        monthAmount: monthAggregation ? monthAggregation.monthAmount : 0,
        monthCount: monthAggregation ? monthAggregation.monthCount : 0,
        budgets,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard stats",
      error: error.message,
    });
  }
};
