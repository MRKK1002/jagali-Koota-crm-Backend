const express = require("express")
const router = express.Router()
const staffOrderController = require("../controller/staffOrderController")

// Create staff order after payment success (EXISTING)
router.post("/create-after-payment", staffOrderController.createStaffOrderAfterPayment)

// NEW: Create guest order
router.post("/create-guest-order", staffOrderController.createGuestOrder)

// Get orders by userId - EXISTING (must be before /:id route)
router.get("/user/:userId", staffOrderController.getOrdersByUserId)

// Get all orders (both staff and guest) - EXISTING
router.get("/", staffOrderController.getAllStaffOrders)

// Get order statistics - EXISTING
router.get("/statistics", staffOrderController.getOrderStatistics)

// Get orders by payment status - EXISTING
router.get("/payment-status/:paymentStatus", staffOrderController.getOrdersByPaymentStatus)

// Get orders by branch - EXISTING
router.get("/branch/:branchId", staffOrderController.getOrdersByBranch)

// NEW: Get guest orders by mobile number
router.get("/guest/mobile/:mobile", staffOrderController.getGuestOrdersByMobile)

// Get order by orderId - EXISTING (MUST BE BEFORE /:id route)
router.get("/order/:orderId", staffOrderController.getStaffOrderByOrderId)

// Get order by ID - EXISTING
router.get("/:id", staffOrderController.getStaffOrderById)

// Update order status - EXISTING (works for both staff and guest orders)
router.put("/:id/status", staffOrderController.updateStaffOrderStatus)

// Delete order - EXISTING (works for both staff and guest orders)
router.delete("/:id", staffOrderController.deleteStaffOrder)

// Add items to existing order - EXISTING
router.post("/:id/items", staffOrderController.addItemsToStaffOrder)

// Get orders by branch and table - EXISTING
router.get("/branch/:branchId/table/:tableId", staffOrderController.getStaffOrdersByTable)

module.exports = router
