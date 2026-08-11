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

    const GoodsReceiptNote = require("../Restaurant/RestautantModel/RestaurantGoodReceiptNotesmodel")

    // Find ALL GRNs containing items for this product
    const grns = await GoodsReceiptNote.find({
      "items.product": productName,
    }).sort({ createdAt: -1 })

    if (!grns || grns.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No GRN found with product "${productName}"`,
      })
    }

    // Collect all matching items across all GRNs and calculate total available
    const matchingItems = []
    for (const grn of grns) {
      grn.items.forEach((item, idx) => {
        if (item.product === productName && (item.storeType === fromStore || (!item.storeType && fromStore === "Main Store"))) {
          const available = Number(item.receivedQty || item.quantity || 0) - Number(item.consumedQuantity || 0)
          if (available > 0) {
            matchingItems.push({ grn, idx, available })
          }
        }
      })
    }

    const totalAvailable = matchingItems.reduce((sum, m) => sum + m.available, 0)

    if (totalAvailable <= 0) {
      return res.status(404).json({
        success: false,
        message: `No available stock for "${productName}" in "${fromStore}"`,
      })
    }

    if (Number(quantity) > totalAvailable) {
      return res.status(400).json({
        success: false,
        message: `Cannot transfer ${quantity}. Only ${totalAvailable} available in "${fromStore}"`,
      })
    }

    // Distribute the transfer across matching items (FIFO — oldest first)
    let remaining = Number(quantity)
    const grnsToSave = new Set()

    for (const match of matchingItems.reverse()) { // reverse to process oldest first
      if (remaining <= 0) break

      const item = match.grn.items[match.idx]
      const transferFromThis = Math.min(remaining, match.available)

      if (transferFromThis === match.available) {
        // Move entire item to new store
        match.grn.items[match.idx].storeType = toStore
      } else {
        // Partial: reduce source, add new entry for destination
        const originalReceivedQty = Number(item.receivedQty || item.quantity || 0)
        match.grn.items[match.idx].receivedQty = originalReceivedQty - transferFromThis
        match.grn.items[match.idx].quantity = originalReceivedQty - transferFromThis
        if (item.acceptedQty) {
          match.grn.items[match.idx].acceptedQty = Math.max(0, Number(item.acceptedQty) - transferFromThis)
        }

        const newItem = {
          ...(item.toObject ? item.toObject() : { ...item }),
          storeType: toStore,
          receivedQty: transferFromThis,
          quantity: transferFromThis,
          acceptedQty: transferFromThis,
          consumedQuantity: 0,
        }
        delete newItem._id
        match.grn.items.push(newItem)
      }

      remaining -= transferFromThis
      grnsToSave.add(match.grn)
    }

    // Save all modified GRNs
    for (const grn of grnsToSave) {
      await grn.save()
    }

    // Sync LocationInventory: deduct from source, add to destination
    try {
      const RawMaterial = require("../Restaurant/RestautantModel/RestaurantRawMaterialModel")
      const StoreLocationModel = require("../model/storeLocationModel")
      const rawMaterial = await RawMaterial.findOne({ name: productName })
      const fromStoreDoc = await StoreLocationModel.findOne({ name: fromStore })
      const toStoreDoc = await StoreLocationModel.findOne({ name: toStore })

      if (rawMaterial && fromStoreDoc) {
        const fromLocInv = await LocationInventory.findOne({
          locationId: fromStoreDoc._id,
          rawMaterialId: rawMaterial._id,
        })
        if (fromLocInv) {
          fromLocInv.quantity = Math.max(0, fromLocInv.quantity - Number(quantity))
          fromLocInv.lastUpdated = new Date()
          await fromLocInv.save()
        }
      }

      if (rawMaterial && toStoreDoc) {
        let toLocInv = await LocationInventory.findOne({
          locationId: toStoreDoc._id,
          rawMaterialId: rawMaterial._id,
        })
        if (toLocInv) {
          toLocInv.quantity += Number(quantity)
          toLocInv.lastUpdated = new Date()
          await toLocInv.save()
        } else {
          toLocInv = new LocationInventory({
            locationId: toStoreDoc._id,
            rawMaterialId: rawMaterial._id,
            quantity: Number(quantity),
            costPrice: matchingItems[0]?.grn?.items?.[matchingItems[0]?.idx]?.rate || 0,
            lastUpdated: new Date(),
          })
          await toLocInv.save()
        }
      }
      console.log(`📦 LocationInventory synced for transfer: ${productName} -${quantity} from ${fromStore}, +${quantity} to ${toStore}`)
    } catch (syncErr) {
      console.warn("⚠️ LocationInventory sync in transfer:", syncErr.message)
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
