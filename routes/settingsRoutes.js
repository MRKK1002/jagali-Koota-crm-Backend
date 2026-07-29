// routes/settingsRoutes.js
const express = require("express");
const router = express.Router();
const {
  getSettings,
  addExpenseType,
  removeExpenseType,
  addClaimType,
  removeClaimType,
} = require("../controller/settingsController");

router.get("/", getSettings);
router.post("/expense-types", addExpenseType);
router.delete("/expense-types/:type", removeExpenseType);
router.post("/claim-types", addClaimType);
router.delete("/claim-types/:type", removeClaimType);

module.exports = router;
