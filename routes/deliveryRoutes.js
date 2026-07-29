const express = require("express")
const router = express.Router()
const deliveriesController = require("../controller/deliverycontroller")

// Create a new delivery
router.post("/", deliveriesController.createDelivery)

// Get all deliveries
router.get("/", deliveriesController.getDeliveries)

// Get a delivery by ID
router.get("/:id", deliveriesController.getDeliveryById)

// Update a delivery by ID
router.put("/:id", deliveriesController.updateDelivery)

// Delete a delivery by ID
router.delete("/:id", deliveriesController.deleteDelivery)

module.exports = router
