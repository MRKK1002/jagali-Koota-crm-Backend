const express = require("express");
const router = express.Router();
const ledgerController = require("../controller/ledgerController");

// Ledger routes
router.get("/ledger/account/:accountId", ledgerController.getAccountLedger);
router.get("/ledger/account/:accountId/balance", ledgerController.getAccountBalance);
router.get("/ledger/trial-balance/:businessType", ledgerController.getTrialBalance);
router.get("/ledger/general-ledger/:businessType", ledgerController.getGeneralLedger);

module.exports = router;


