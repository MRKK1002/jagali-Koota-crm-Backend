const express = require("express");
const router = express.Router();
const {
  addExpense,
  getExpenses,
  downloadExpenseDocument,
  updateExpense,
  deleteExpense,
} = require("../controller/expenseManagementController");
const upload = require("multer")({ dest: "uploads/" }); // Use the multer instance from app.js, but for illustration

router.post("/", upload.single("document"), addExpense);
router.get("/", getExpenses);
router.get("/:id/download", downloadExpenseDocument);
router.put("/:id", upload.single("document"), updateExpense);
router.delete("/:id", deleteExpense);

module.exports = router;
