const express = require("express")
const router = express.Router()
const storeInventoryController = require("../controller/storeInventoryController")

// Get stock by store location
router.get("/store/:storeId", storeInventoryController.getStockByStore)

// Get stock for all stores
router.get("/stores/all", storeInventoryController.getAllStoresStock)

// Get stock for a specific material across all stores
router.get("/material/:materialId", storeInventoryController.getMaterialStockAcrossStores)

// Add stock inward (from purchase/GRN)
router.post("/inward", storeInventoryController.addStockInward)

// Adjust stock (manual adjustment)
router.post("/adjust", storeInventoryController.adjustStock)

// Get low stock alerts
router.get("/alerts/low-stock", storeInventoryController.getLowStockAlerts)

// Get stock transactions for a store
router.get("/store/:storeId/transactions", storeInventoryController.getStoreTransactions)

module.exports = router













