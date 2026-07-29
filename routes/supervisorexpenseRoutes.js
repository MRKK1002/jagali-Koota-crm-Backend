// const express = require("express");
// const router = express.Router();

// const {
//   getExpenses,
//   createExpense,
//   updateExpenseStatus,
//   getExpenseStats,
// } = require("../controller/supervisorexpenseController");

// // ✅ GET all + POST(Add)
// router.route("/getall")
//   .get(getExpenses)
//   .post(createExpense);

// // ✅ Stats Route
// router.get("/stats", getExpenseStats);

// // ✅ Update status by ID
// router.put("/:id/status", updateExpenseStatus);

// module.exports = router;

const express = require("express");
const router = express.Router();
const {
  getExpenses,
  createExpense,
  updateExpenseStatus,
  getExpenseStats,
  deleteExpense,
  getExpenseById,
} = require("../controller/supervisorexpenseController");

// @route   GET/POST /construction/supervisorexpense/getall
// @desc    Get all expenses or create new expense
router.route("/getall")
  .get(getExpenses)
  .post(createExpense);

// @route   GET /construction/supervisorexpense/stats
// @desc    Get expense statistics
router.route("/stats")
  .get(getExpenseStats);

// @route   PUT /construction/supervisorexpense/:id/status
// @desc    Update expense status
router.route("/:id/status")
  .put(updateExpenseStatus);

// @route   GET/DELETE /construction/supervisorexpense/:id
// @desc    Get single expense or delete expense
router.route("/:id")
  .get(getExpenseById)
  .delete(deleteExpense);

module.exports = router;
