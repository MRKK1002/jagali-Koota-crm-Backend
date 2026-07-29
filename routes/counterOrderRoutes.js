const express = require("express")
const router = express.Router()
const counterOrderController = require("../controller/counterOrderController")

// List all orders - this should come BEFORE the /:id route
router.get("/orders", counterOrderController.getAllCounterOrders)

// Get orders by user ID
router.get("/orders/user/:userId", counterOrderController.getCounterOrdersByUserId)

// Create a new orderwha
router.post("/orders", counterOrderController.createCounterOrder)

// Get order by ID
router.get("/orders/:id", counterOrderController.getCounterOrderById)

// Update entire order
router.put("/orders/:id", counterOrderController.updateCounterOrder)
    
// Update order status only
router.put("/orders/:id/order-status", counterOrderController.updateCounterOrderStatus)

// Update payment status only
router.put("/orders/:id/payment-status", counterOrderController.updateCounterPaymentStatus)

// Cancel order with reason
router.put("/orders/:id/cancel", counterOrderController.cancelCounterOrder)

module.exports = router
