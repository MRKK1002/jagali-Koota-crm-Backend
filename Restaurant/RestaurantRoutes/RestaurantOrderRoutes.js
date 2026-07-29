const express = require("express")
const router = express.Router()
const orderController = require("../controller/orderController")

// Order routes
router.post("/", orderController.createOrder)
router.get("/user/:userId", orderController.getUserOrders)
router.get("/branch/:branchId", orderController.getBranchOrders)
router.get("/stats", orderController.getOrderStats)
router.get("/number/:orderNumber", orderController.getOrderByNumber)
router.get("/:id", orderController.getOrderById)
router.put("/:id/status", orderController.updateOrderStatus)
router.put("/:id/payment-status", orderController.updatePaymentStatus) // New route for payment status
router.get("/", orderController.getAllOrders)
module.exports = router
