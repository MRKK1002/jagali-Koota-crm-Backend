const express = require("express");
const router = express.Router();
const resStockController = require("../controller/ResStockController");

// CRUD routes
router.post("/", resStockController.createStock);        // Create stock
router.get("/", resStockController.getAllStocks);        // Get all stocks
router.get("/:id", resStockController.getStockById);     // Get stock by ID
router.put("/:id", resStockController.updateStock);      // Update stock
router.delete("/:id", resStockController.deleteStock);   // Delete stock

module.exports = router;
