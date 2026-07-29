// const Expense = require('../model/supervisorExpense');

// const getExpenses = async (req, res) => {
//     try {
//         console.log('GET /construction/supervisorexpense/getall called');

//         const expenses = await Expense.find({})
//             .sort({ createdAt: -1 });

//         console.log(`Found ${expenses.length} expenses`);

//         res.status(200).json({
//             success: true,
//             count: expenses.length,
//             expenses
//         });
//     } catch (error) {
//         console.error('Error in getExpenses:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Server Error: ' + error.message
//         });
//     }
// };

// const createExpense = async (req, res) => {
//     try {
//         console.log('POST /construction/supervisorexpense/getall called', req.body);

//         const { amount, description, category, date, vendor, receipt } = req.body;

//         // Default values for required fields
//         const expenseData = {
//             amount,
//             description,
//             category,
//             date: date || Date.now(),
//             vendor: vendor || "Unknown Vendor",
//             receipt: receipt || "No receipt",
//             submittedBy: "65d1a9e8f7d8a8c1f4a8b9c9", // Default user ID
//             project: "65d1a9e8f7d8a8c1f4a8b9ca" // Default project ID
//         };

//         const expense = await Expense.create(expenseData);

//         console.log('Expense created successfully:', expense._id);

//         res.status(201).json({
//             success: true,
//             expense
//         });
//     } catch (error) {
//         console.error('Error in createExpense:', error);
//         if (error.name === 'ValidationError') {
//             const messages = Object.values(error.errors).map(val => val.message);
//             return res.status(400).json({
//                 success: false,
//                 error: messages
//             });
//         } else {
//             return res.status(500).json({
//                 success: false,
//                 error: 'Server Error: ' + error.message
//             });
//         }
//     }
// };

// const updateExpenseStatus = async (req, res) => {
//     try {
//         console.log('PUT /construction/supervisorexpense/:id/status called', req.params.id, req.body);

//         const expense = await Expense.findById(req.params.id);

//         if (!expense) {
//             return res.status(404).json({
//                 success: false,
//                 error: 'No expense found'
//             });
//         }

//         expense.status = req.body.status;
//         await expense.save();

//         res.status(200).json({
//             success: true,
//             expense
//         });
//     } catch (error) {
//         console.error('Error in updateExpenseStatus:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Server Error: ' + error.message
//         });
//     }
// };

// const getExpenseStats = async (req, res) => {
//     try {
//         console.log('GET /construction/supervisorexpense/stats called');

//         const stats = await Expense.aggregate([
//             {
//                 $group: {
//                     _id: '$status',
//                     count: { $sum: 1 },
//                     totalAmount: { $sum: '$amount' }
//                 }
//             },
//             {
//                 $group: {
//                     _id: null,
//                     totalExpenses: { $sum: '$count' },
//                     totalAmount: { $sum: '$totalAmount' },
//                     statuses: {
//                         $push: {
//                             status: '$_id',
//                             count: '$count',
//                             amount: '$totalAmount'
//                         }
//                     }
//                 }
//             }
//         ]);

//         const result = stats[0] || {
//             totalExpenses: 0,
//             totalAmount: 0,
//             statuses: []
//         };

//         console.log('Stats result:', result);

//         res.status(200).json({
//             success: true,
//             stats: result
//         });
//     } catch (error) {
//         console.error('Error in getExpenseStats:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Server Error: ' + error.message
//         });
//     }
// };

// module.exports = {
//     getExpenses,
//     createExpense,
//     updateExpenseStatus,
//     getExpenseStats
// };
const Expense = require("../model/supervisorExpense");

// -----------------------------
// GET /construction/supervisorexpense/getall
// -----------------------------
const getExpenses = async (req, res) => {
  try {
    console.log("GET /construction/supervisorexpense/getall called");

    const expenses = await Expense.find({})
      .sort({ createdAt: -1 })
      .populate("submittedBy", "name email")
      .populate("project", "name");

    console.log(`Found ${expenses.length} expenses`);

    // Return raw array only
    res.status(200).json(expenses);
  } catch (error) {
    console.error("Error in getExpenses:", error);
    res.status(500).json({ message: "Server Error: " + error.message });
  }
};

// -----------------------------
// POST /construction/supervisorexpense/create
// -----------------------------
const createExpense = async (req, res) => {
  try {
    console.log("POST /construction/supervisorexpense/create called", req.body);

    const { amount, description, category, date, receipt } = req.body;

    if (!amount || !description || !category) {
      return res
        .status(400)
        .json({ message: "Amount, description, and category are required" });
    }

    const expenseData = {
      amount,
      description,
      category,
      date: date || Date.now(),
      receipt: receipt || "No receipt",
      submittedBy: "65d1a9e8f7d8a8c1f4a8b9c9", // Default user
      project: "65d1a9e8f7d8a8c1f4a8b9ca", // Default project
    };

    const expense = await Expense.create(expenseData);

    res.status(201).json(expense); // Return the new expense only
  } catch (error) {
    console.error("Error in createExpense:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ message: messages });
    }
    res.status(500).json({ message: "Server Error: " + error.message });
  }
};

// -----------------------------
// PUT /construction/supervisorexpense/:id/status
// -----------------------------
const updateExpenseStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !["pending", "approved", "rejected"].includes(status)) {
      return res
        .status(400)
        .json({
          message: "Valid status (pending, approved, rejected) is required",
        });
    }

    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: "Expense not found" });

    expense.status = status;
    await expense.save();

    res.status(200).json(expense); // Return updated expense only
  } catch (error) {
    console.error("Error in updateExpenseStatus:", error);
    res.status(500).json({ message: "Server Error: " + error.message });
  }
};

// -----------------------------
// GET /construction/supervisorexpense/stats
// -----------------------------
const getExpenseStats = async (req, res) => {
  try {
    const stats = await Expense.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
        },
      },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: "$count" },
          totalAmount: { $sum: "$totalAmount" },
          statuses: {
            $push: { status: "$_id", count: "$count", amount: "$totalAmount" },
          },
        },
      },
    ]);

    const result = stats[0] || {
      totalExpenses: 0,
      totalAmount: 0,
      statuses: [],
    };
    res.status(200).json(result); // Return stats object only
  } catch (error) {
    console.error("Error in getExpenseStats:", error);
    res.status(500).json({ message: "Server Error: " + error.message });
  }
};

// -----------------------------
// DELETE /construction/supervisorexpense/:id
// -----------------------------
const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) return res.status(404).json({ message: "Expense not found" });

    res.status(200).json({
      id: expense._id,
      description: expense.description,
      amount: expense.amount,
    }); // Return minimal deleted info only
  } catch (error) {
    console.error("Error deleting expense:", error);
    res.status(500).json({ message: "Server Error: " + error.message });
  }
};

// -----------------------------
// GET /construction/supervisorexpense/:id
// -----------------------------
const getExpenseById = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate("submittedBy", "name email")
      .populate("project", "name");

    if (!expense) return res.status(404).json({ message: "Expense not found" });

    res.status(200).json(expense); // Return the single expense only
  } catch (error) {
    console.error("Error in getExpenseById:", error);
    res.status(500).json({ message: "Server Error: " + error.message });
  }
};

module.exports = {
  getExpenses,
  createExpense,
  updateExpenseStatus,
  getExpenseStats,
  deleteExpense,
  getExpenseById,
};
