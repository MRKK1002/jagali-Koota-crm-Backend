const { LocationInventory, StockTransaction } = require("../model/inventoryModel")
const RawMaterial = require("../model/rawMaterialModel")
const StoreLocation = require("../model/storeLocationModel")

// Get stock by store location
exports.getStockByStore = async (req, res) => {
  try {
    const { storeId } = req.params
    const { rawMaterialId, lowStock } = req.query

    const filter = { locationId: storeId }
    if (rawMaterialId) filter.rawMaterialId = rawMaterialId

    let inventory = await LocationInventory.find(filter)
      .populate("rawMaterialId", "name category unit minLevel")
      .populate("locationId", "name address")
      .sort({ "rawMaterialId.name": 1 })

    // Filter low stock if requested
    if (lowStock === "true") {
      inventory = inventory.filter((item) => {
        const material = item.rawMaterialId
        return material && item.quantity <= material.minLevel
      })
    }

    res.json({
      success: true,
      data: inventory,
    })
  } catch (error) {
    console.error("Error fetching store stock:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch store stock",
      error: error.message,
    })
  }
}

// Get stock for all stores (summary view)
exports.getAllStoresStock = async (req, res) => {
  try {
    const { rawMaterialId } = req.query

    const filter = {}
    if (rawMaterialId) filter.rawMaterialId = rawMaterialId

    const inventory = await LocationInventory.find(filter)
      .populate("rawMaterialId", "name category unit minLevel")
      .populate("locationId", "name address")
      .sort({ "locationId.name": 1, "rawMaterialId.name": 1 })

    // Group by store
    const storeWiseStock = {}
    inventory.forEach((item) => {
      const storeId = item.locationId._id.toString()
      if (!storeWiseStock[storeId]) {
        storeWiseStock[storeId] = {
          store: item.locationId,
          materials: [],
        }
      }
      storeWiseStock[storeId].materials.push(item)
    })

    res.json({
      success: true,
      data: Object.values(storeWiseStock),
    })
  } catch (error) {
    console.error("Error fetching all stores stock:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch stores stock",
      error: error.message,
    })
  }
}

// Get stock for a specific material across all stores
exports.getMaterialStockAcrossStores = async (req, res) => {
  try {
    const { materialId } = req.params

    const inventory = await LocationInventory.find({ rawMaterialId: materialId })
      .populate("locationId", "name address")
      .populate("rawMaterialId", "name category unit minLevel")
      .sort({ "locationId.name": 1 })

    res.json({
      success: true,
      data: inventory,
    })
  } catch (error) {
    console.error("Error fetching material stock:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch material stock",
      error: error.message,
    })
  }
}

// Add stock inward (from purchase/GRN)
exports.addStockInward = async (req, res) => {
  const session = await require("mongoose").startSession()
  session.startTransaction()

  try {
    const { storeId, rawMaterialId, quantity, costPrice, expiryDate, batchNumber, reference, notes } = req.body

    // Validation
    if (!storeId || !rawMaterialId || !quantity || !costPrice) {
      return res.status(400).json({
        success: false,
        message: "Please provide storeId, rawMaterialId, quantity, and costPrice",
      })
    }

    // Verify store and material exist
    const store = await StoreLocation.findById(storeId).session(session)
    const material = await RawMaterial.findById(rawMaterialId).session(session)

    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
      })
    }

    if (!material) {
      return res.status(404).json({
        success: false,
        message: "Raw material not found",
      })
    }

    // Find or create inventory record
    let inventory = await LocationInventory.findOne({
      locationId: storeId,
      rawMaterialId: rawMaterialId,
    }).session(session)

    if (inventory) {
      // Update existing inventory
      inventory.quantity += quantity
      inventory.costPrice = costPrice // Update cost price
      inventory.lastUpdated = new Date()
      if (expiryDate) inventory.expiryDate = new Date(expiryDate)
      if (batchNumber) inventory.batchNumber = batchNumber
      await inventory.save({ session })
    } else {
      // Create new inventory record
      inventory = new LocationInventory({
        locationId: storeId,
        rawMaterialId: rawMaterialId,
        quantity: quantity,
        costPrice: costPrice,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        batchNumber: batchNumber || null,
        lastUpdated: new Date(),
      })
      await inventory.save({ session })
    }

    // Create stock transaction
    const transaction = new StockTransaction({
      type: "inward",
      locationId: storeId,
      rawMaterialId: rawMaterialId,
      quantity: quantity,
      costPrice: costPrice,
      reference: reference || "Manual Inward",
      source: "Purchase/GRN",
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      batchNumber: batchNumber || null,
      notes: notes || "",
    })
    await transaction.save({ session })

    await session.commitTransaction()

    await inventory.populate([
      { path: "locationId", select: "name address" },
      { path: "rawMaterialId", select: "name category unit" },
    ])

    res.status(201).json({
      success: true,
      message: "Stock added successfully",
      data: inventory,
    })
  } catch (error) {
    await session.abortTransaction()
    console.error("Error adding stock inward:", error)
    res.status(500).json({
      success: false,
      message: "Failed to add stock",
      error: error.message,
    })
  } finally {
    session.endSession()
  }
}

// Adjust stock (manual adjustment)
exports.adjustStock = async (req, res) => {
  const session = await require("mongoose").startSession()
  session.startTransaction()

  try {
    const { storeId, rawMaterialId, quantity, adjustmentType, notes } = req.body

    // Validation
    if (!storeId || !rawMaterialId || quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: "Please provide storeId, rawMaterialId, and quantity",
      })
    }

    if (!["increase", "decrease", "set"].includes(adjustmentType)) {
      return res.status(400).json({
        success: false,
        message: "adjustmentType must be 'increase', 'decrease', or 'set'",
      })
    }

    // Find inventory record
    let inventory = await LocationInventory.findOne({
      locationId: storeId,
      rawMaterialId: rawMaterialId,
    }).session(session)

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: "Inventory record not found for this store and material",
      })
    }

    const oldQuantity = inventory.quantity
    let newQuantity

    switch (adjustmentType) {
      case "increase":
        newQuantity = oldQuantity + quantity
        break
      case "decrease":
        newQuantity = Math.max(0, oldQuantity - quantity)
        break
      case "set":
        newQuantity = quantity
        break
    }

    inventory.quantity = newQuantity
    inventory.lastUpdated = new Date()
    await inventory.save({ session })

    // Create adjustment transaction
    const transaction = new StockTransaction({
      type: "adjustment",
      locationId: storeId,
      rawMaterialId: rawMaterialId,
      quantity: Math.abs(newQuantity - oldQuantity),
      costPrice: inventory.costPrice,
      reference: `ADJUST-${Date.now()}`,
      source: "Manual Adjustment",
      notes: notes || `Stock adjusted: ${adjustmentType} by ${quantity}`,
    })
    await transaction.save({ session })

    await session.commitTransaction()

    await inventory.populate([
      { path: "locationId", select: "name address" },
      { path: "rawMaterialId", select: "name category unit" },
    ])

    res.json({
      success: true,
      message: "Stock adjusted successfully",
      data: inventory,
    })
  } catch (error) {
    await session.abortTransaction()
    console.error("Error adjusting stock:", error)
    res.status(500).json({
      success: false,
      message: "Failed to adjust stock",
      error: error.message,
    })
  } finally {
    session.endSession()
  }
}

// Get low stock alerts across all stores
exports.getLowStockAlerts = async (req, res) => {
  try {
    const inventory = await LocationInventory.find()
      .populate("rawMaterialId", "name category unit minLevel")
      .populate("locationId", "name address")

    const lowStockItems = inventory.filter((item) => {
      const material = item.rawMaterialId
      return material && item.quantity <= material.minLevel
    })

    res.json({
      success: true,
      data: lowStockItems,
      count: lowStockItems.length,
    })
  } catch (error) {
    console.error("Error fetching low stock alerts:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch low stock alerts",
      error: error.message,
    })
  }
}

// Get stock transactions for a store
exports.getStoreTransactions = async (req, res) => {
  try {
    const { storeId } = req.params
    const { type, startDate, endDate, page = 1, limit = 50 } = req.query

    const filter = { locationId: storeId }
    if (type) filter.type = type

    if (startDate || endDate) {
      filter.createdAt = {}
      if (startDate) filter.createdAt.$gte = new Date(startDate)
      if (endDate) filter.createdAt.$lte = new Date(endDate)
    }

    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

    const transactions = await StockTransaction.find(filter)
      .populate("rawMaterialId", "name category unit")
      .populate("toLocationId", "name address")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number.parseInt(limit))

    const total = await StockTransaction.countDocuments(filter)

    res.json({
      success: true,
      data: transactions,
      pagination: {
        current: Number.parseInt(page),
        pages: Math.ceil(total / Number.parseInt(limit)),
        total,
        limit: Number.parseInt(limit),
      },
    })
  } catch (error) {
    console.error("Error fetching store transactions:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch transactions",
      error: error.message,
    })
  }
}














// Transfer stock between store locations (updates GRN item storeType)
exports.transferStock = async (req, res) => {
  try {
    const { productName, fromStore, toStore, quantity, notes } = req.body

    if (!productName || !fromStore || !toStore || !quantity) {
      return res.status(400).json({
        success: false,
        message: "Please provide productName, fromStore, toStore, and quantity",
      })
    }

    if (fromStore === toStore) {
      return res.status(400).json({
        success: false,
        message: "Source and destination stores cannot be the same",
      })
    }

    if (Number(quantity) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be greater than 0",
      })
    }

    // Find the GRN that has this product in the source store
    const GoodsReceiptNote = require("../Restaurant/RestautantModel/RestaurantGoodReceiptNotesmodel")

    // Find GRNs containing items for this product
    const grns = await GoodsReceiptNote.find({
      "items.product": productName,
    }).sort({ createdAt: -1 })

    if (!grns || grns.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No GRN found with product "${productName}"`,
      })
    }

    // Find the specific GRN item matching fromStore
    let targetGRN = null
    let targetItemIndex = -1

    for (const grn of grns) {
      const idx = grn.items.findIndex(
        (item) => item.product === productName && (item.storeType === fromStore || (!item.storeType && fromStore === "Main Store"))
      )
      if (idx !== -1) {
        targetGRN = grn
        targetItemIndex = idx
        break
      }
    }

    if (!targetGRN || targetItemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: `Product "${productName}" not found in store "${fromStore}"`,
      })
    }

    const item = targetGRN.items[targetItemIndex]
    const availableQty = Number(item.receivedQty || item.quantity || 0) - Number(item.consumedQuantity || 0)

    if (Number(quantity) > availableQty) {
      return res.status(400).json({
        success: false,
        message: `Cannot transfer ${quantity}. Only ${availableQty} available in "${fromStore}"`,
      })
    }

    // If transferring full quantity, just change the storeType
    if (Number(quantity) === availableQty) {
      targetGRN.items[targetItemIndex].storeType = toStore
      await targetGRN.save()
    } else {
      // Partial transfer: reduce source quantity, create a new item entry for destination
      const transferQty = Number(quantity)
      const originalReceivedQty = Number(item.receivedQty || item.quantity || 0)

      // Reduce the source item's received quantity
      targetGRN.items[targetItemIndex].receivedQty = originalReceivedQty - transferQty
      targetGRN.items[targetItemIndex].quantity = originalReceivedQty - transferQty
      if (item.acceptedQty) {
        targetGRN.items[targetItemIndex].acceptedQty = Math.max(0, Number(item.acceptedQty) - transferQty)
      }

      // Add a new item entry for the destination store
      const newItem = {
        ...item.toObject ? item.toObject() : { ...item },
        storeType: toStore,
        receivedQty: transferQty,
        quantity: transferQty,
        acceptedQty: transferQty,
        consumedQuantity: 0,
      }
      delete newItem._id
      targetGRN.items.push(newItem)

      await targetGRN.save()
    }

    res.status(200).json({
      success: true,
      message: `Transferred ${quantity} of "${productName}" from "${fromStore}" to "${toStore}"`,
      data: {
        productName,
        fromStore,
        toStore,
        quantity: Number(quantity),
        notes: notes || "",
        date: new Date(),
      },
    })
  } catch (error) {
    console.error("Error transferring stock:", error)
    res.status(500).json({
      success: false,
      message: "Failed to transfer stock",
      error: error.message,
    })
  }
}
