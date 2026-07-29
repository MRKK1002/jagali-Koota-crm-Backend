const AccountantExpense = require("../model/accountantExpense");

// @desc    Get all major expenses
// @route   GET /api/accountant/expenses
// @access  Private
exports.getAllExpenses = async (req, res) => {
  try {
    const { page = 1, limit = 10, sort = "-date" } = req.query;

    const expenses = await AccountantExpense.find()
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await AccountantExpense.countDocuments();

    res.status(200).json({
      success: true,
      expenses,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalExpenses: total,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// @desc    Create new major expense
// @route   POST /api/accountant/expenses
// @access  Private
exports.createExpense = async (req, res) => {
  const { type, amount, description, paymentMethod, vendor, reference } =
    req.body;

  if (!type || !amount || !description) {
    return res.status(400).json({
      success: false,
      message: "Please fill all required fields",
    });
  }

  try {
    const expense = new AccountantExpense({
      type,
      amount,
      description,
      paymentMethod: paymentMethod || "bank",
      vendor,
      reference,
      date: req.body.date || new Date(),
    });

    await expense.save();

    res.status(201).json({
      success: true,
      message: "Expense recorded successfully!",
      expense,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// @desc    Get expense by ID
// @route   GET /api/accountant/expenses/:id
// @access  Private
exports.getExpenseById = async (req, res) => {
  try {
    const expense = await AccountantExpense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    res.status(200).json({
      success: true,
      expense,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// @desc    Update expense
// @route   PUT /api/accountant/expenses/:id
// @access  Private
exports.updateExpense = async (req, res) => {
  try {
    const expense = await AccountantExpense.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Expense updated successfully!",
      expense,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// @desc    Delete expense
// @route   DELETE /api/accountant/expenses/:id
// @access  Private
exports.deleteExpense = async (req, res) => {
  try {
    const expense = await AccountantExpense.findByIdAndDelete(req.params.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Expense deleted successfully!",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// @desc    Get report summary
// @route   GET /api/accountant/report
// @access  Private
exports.getReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let filter = {};
    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const expenses = await AccountantExpense.find(filter);

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const cashExpenses = expenses
      .filter((e) => e.paymentMethod === "cash" || e.paymentMethod === "Cash")
      .reduce((sum, e) => sum + e.amount, 0);

    const bankExpenses = expenses
      .filter(
        (e) => e.paymentMethod === "bank" || e.paymentMethod === "Bank Transfer"
      )
      .reduce((sum, e) => sum + e.amount, 0);

    const expenseTypes = [
      "Fuel",
      "Vehicle Maintenance",
      "Rent",
      "Utilities",
      "Equipment",
      "Insurance",
      "Office Supplies",
      "Vehicle",
    ];
    const expensesByType = expenseTypes
      .map((type) => ({
        type,
        amount: expenses
          .filter((e) => e.type === type)
          .reduce((sum, e) => sum + e.amount, 0),
        count: expenses.filter((e) => e.type === type).length,
      }))
      .filter((item) => item.amount > 0);

    res.status(200).json({
      success: true,
      period:
        startDate && endDate
          ? `${new Date(startDate).toLocaleDateString()} - ${new Date(
              endDate
            ).toLocaleDateString()}`
          : new Date().toLocaleString("default", {
              month: "long",
              year: "numeric",
            }),
      totalExpenses,
      cashExpenses,
      bankExpenses,
      expenseCount: expenses.length,
      expensesByType,
      summary: {
        averageExpense:
          expenses.length > 0 ? totalExpenses / expenses.length : 0,
        highestExpense:
          expenses.length > 0 ? Math.max(...expenses.map((e) => e.amount)) : 0,
        lowestExpense:
          expenses.length > 0 ? Math.min(...expenses.map((e) => e.amount)) : 0,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// @desc    Get dashboard stats
// @route   GET /api/accountant/dashboard
// @access  Private
exports.getDashboardStats = async (req, res) => {
  try {
    const totalExpenses = await AccountantExpense.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const paymentMethodStats = await AccountantExpense.aggregate([
      {
        $group: {
          _id: "$paymentMethod",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const monthlyExpenses = await AccountantExpense.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
          },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: 6 },
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalExpenses: totalExpenses[0]?.total || 0,
        totalTransactions: await AccountantExpense.countDocuments(),
        paymentMethodStats,
        monthlyExpenses,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
