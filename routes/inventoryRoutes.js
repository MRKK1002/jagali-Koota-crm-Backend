const express = require("express");
const router = express.Router();
const inventoryController = require("../controller/inventoryController");

// Material CRUD operations
router.post("/materials", inventoryController.addMaterial);
router.get("/materials", inventoryController.getAllMaterials);
router.get("/materials/:id", inventoryController.getMaterialById);
router.put("/materials/:id", inventoryController.updateMaterial);
router.delete("/materials/:id", inventoryController.deleteMaterial);

// Inventory operations
router.get("/low-stock-alerts", inventoryController.getLowStockAlerts);
router.get("/transactions", inventoryController.getStockTransactions);
router.get("/summary", inventoryController.getInventorySummary);
router.get("/site-wise-usage", inventoryController.getSiteWiseUsage);

// Stock Out operation
router.post("/stock-out", inventoryController.stockOut);

module.exports = router;
