const express = require("express");
const router = express.Router();
const {
  getConstructionInvoices,
  getConstructionInvoice,
  createConstructionInvoice,
  updateConstructionInvoice,
  deleteConstructionInvoice,
  getConstructionOutstandingBalances,
  getConstructionInvoiceStats,
} = require("../controller/constructionInvoiceController");

router.get("/", getConstructionInvoices);
router.get("/stats", getConstructionInvoiceStats);
router.get("/outstanding", getConstructionOutstandingBalances);
router.get("/:id", getConstructionInvoice);
router.post("/", createConstructionInvoice);
router.put("/:id", updateConstructionInvoice);
router.delete("/:id", deleteConstructionInvoice);

module.exports = router;
