const express = require("express");
const router = express.Router();
const {
  getAllKitchenPrinters,
  getKitchenPrinterById,
  createKitchenPrinter,
  updateKitchenPrinter,
  deleteKitchenPrinter,
  testPrint,
} = require("../controller/kitchenPrinterController");

// Routes
router.get("/", getAllKitchenPrinters);
router.get("/:id", getKitchenPrinterById);
router.post("/", createKitchenPrinter);
router.put("/:id", updateKitchenPrinter);
router.delete("/:id", deleteKitchenPrinter);
router.post("/:id/test-print", testPrint);

module.exports = router;

