const express = require("express")
const router = express.Router()
const { StockTransaction, LocationInventory } = require("../RestautantModel/RestaurantLocationInventoryModel")

// Get stock transactions
router.get("/", async (req, res) => {
  try {
    const { locationId, rawMaterialId, type } = req.query

    const query = {}
    if (locationId) query.locationId = locationId
    if (rawMaterialId) query.rawMaterialId = rawMaterialId
    if (type) query.type = type

    const transactions = await StockTransaction.find(query)
      .populate("rawMaterialId", "name category unit price")
      .populate("locationId", "name")
      .sort({ createdAt: -1 })
      .limit(100)

    res.json({
      success: true,
      data: transactions,
    })
  } catch (error) {
    console.error("Error fetching stock transactions:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch stock transactions",
      error: error.message,
    })
  }
})

// Create stock transaction (inward/outward)
router.post("/", async (req, res) => {
  try {
    const {
      type,
      locationId,
      rawMaterialId,
      quantity,
      costPrice,
      reference,
      source,
      destination,
      expiryDate,
      batchNumber,
      notes,
    } = req.body

    if (!type || !locationId || !rawMaterialId || !quantity ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      })
    }

    // Create stock transaction
    const transaction = new StockTransaction({
      type,
      locationId,
      rawMaterialId,
      quantity: Number.parseFloat(quantity),
      costPrice: Number.parseFloat(costPrice),
      reference: reference || `${type.toUpperCase()}-${Date.now()}`,
      source,
      destination,
      expiryDate,
      batchNumber,
      notes,
    })

    await transaction.save()

    // Update location inventory based on transaction type
    if (type === "inward") {
      let inventory = await LocationInventory.findOne({
        locationId,
        rawMaterialId,
      })

      if (inventory) {
        inventory.quantity += Number.parseFloat(quantity)
        inventory.costPrice = Number.parseFloat(costPrice) // Update cost price to latest
        if (expiryDate) inventory.expiryDate = expiryDate
        if (batchNumber) inventory.batchNumber = batchNumber
        inventory.lastUpdated = new Date()
        await inventory.save()
      } else {
        inventory = new LocationInventory({
          locationId,
          rawMaterialId,
          quantity: Number.parseFloat(quantity),
          costPrice: Number.parseFloat(costPrice),
          expiryDate,
          batchNumber,
        })
        await inventory.save()
      }
    } else if (type === "outward") {
      const inventory = await LocationInventory.findOne({
        locationId,
        rawMaterialId,
      })

      if (inventory) {
        inventory.quantity = Math.max(0, inventory.quantity - Number.parseFloat(quantity))
        inventory.lastUpdated = new Date()
        await inventory.save()
      } else {
        // If no inventory record exists for an outward transaction, it's an error or a new record with negative stock
        // Depending on business logic, you might want to prevent this or create a record with negative stock.
        console.warn(
          `Attempted outward transaction for non-existent inventory: locationId=${locationId}, rawMaterialId=${rawMaterialId}`,
        )
      }
    }

    // Populate response
    await transaction.populate("rawMaterialId", "name category unit price")
    await transaction.populate("locationId", "name")

    res.status(201).json({
      success: true,
      message: `Stock ${type} recorded successfully`,
      data: transaction,
    })
  } catch (error) {
    console.error("Error creating stock transaction:", error)
    res.status(500).json({
      success: false,
      message: "Failed to create stock transaction",
      error: error.message,
    })
  }
})

module.exports = router
