const express = require("express");
const router = express.Router();
const accountsController = require("../controller/accountsController");

// Chart of Accounts routes
router.post("/chart-of-accounts", accountsController.createAccount);
router.get("/chart-of-accounts", accountsController.getAllAccounts);
router.get("/chart-of-accounts/hierarchy", accountsController.getAccountHierarchy);
router.get("/chart-of-accounts/:id", accountsController.getAccountById);
router.put("/chart-of-accounts/:id", accountsController.updateAccount);
router.delete("/chart-of-accounts/:id", accountsController.deleteAccount);
router.get("/chart-of-accounts/:id/balance", accountsController.getAccountBalance);

// Initialize default chart of accounts
router.post("/chart-of-accounts/initialize", accountsController.initializeChartOfAccounts);

module.exports = router;


