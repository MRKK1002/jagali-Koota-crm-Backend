const express = require("express");
const router = express.Router();
const financialStatementController = require("../controller/financialStatementController");

// Financial Statement routes
router.get("/profit-loss/:businessType", financialStatementController.getProfitAndLoss);
router.get("/balance-sheet/:businessType", financialStatementController.getBalanceSheet);
router.get("/cash-flow/:businessType", financialStatementController.getCashFlowStatement);

// Combined financial statements (both business types)
router.get("/profit-loss/combined", financialStatementController.getCombinedProfitAndLoss);
router.get("/balance-sheet/combined", financialStatementController.getCombinedBalanceSheet);

// Save financial statement
router.post("/financial-statements", financialStatementController.saveFinancialStatement);
router.get("/financial-statements", financialStatementController.getAllFinancialStatements);
router.get("/financial-statements/:id", financialStatementController.getFinancialStatementById);

module.exports = router;


