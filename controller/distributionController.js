const Distribution = require("../model/distributionModel")
const { LocationInventory, StockTransaction } = require("../model/inventoryModel")
const RawMaterial = require("../model/rawMaterialModel")
const StoreLocation = require("../model/storeLocationModel")

// Generate distribution number
const generateDistributionNumber = async () => {
  const count = await Distribution.countDocuments()
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `DIST-${year}${month}${day}-${String(count + 1).padStart(4, "0")}`
}

// Create a new distribution
exports.createDistribution = async (req, res) => {
  const session = await require("mongoose").startSession()
  session.startTransaction()

  try {
    const { fromStoreId, toStoreId, rawMaterialId, quantity, distributionDate, notes } = req.body

    // Validation
    if (!fromStoreId || !toStoreId || !rawMaterialId || !quantity) {
      return res.status(400).json({
        success: false,
        message: "Please provide fromStoreId, toStoreId, rawMaterialId, and quantity",
      })
    }

    if (fromStoreId === toStoreId) {
      return res.status(400).json({
        success: false,
        message: "Source and destination stores cannot be the same",
      })
    }

    if (quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be greater than 0",
      })
    }

    // Verify stores exist
    const fromStore = await StoreLocation.findById(fromStoreId).session(session)
    const toStore = await StoreLocation.findById(toStoreId).session(session)

    if (!fromStore) {
      return res.status(404).json({
        success: false,
        message: "Source store not found",
      })
    }

    if (!toStore) {
      return res.status(404).json({
        success: false,
        message: "Destination store not found",
      })
    }

    // Verify raw material exists
    const rawMaterial = await RawMaterial.findById(rawMaterialId).session(session)
    if (!rawMaterial) {
      return res.status(404).json({
        success: false,
        message: "Raw material not found",
      })
    }

    // Get current stock in source store
    let sourceInventory = await LocationInventory.findOne({
      locationId: fromStoreId,
      rawMaterialId: rawMaterialId,
    }).session(session)

    const fromStoreStockBefore = sourceInventory ? sourceInventory.quantity : 0

    // Step 1: Validate stock
    if (fromStoreStockBefore < quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Available: ${fromStoreStockBefore} ${rawMaterial.unit}`,
        availableStock: fromStoreStockBefore,
      })
    }

    // Get current stock in destination store
    let destinationInventory = await LocationInventory.findOne({
      locationId: toStoreId,
      rawMaterialId: rawMaterialId,
    }).session(session)

    const toStoreStockBefore = destinationInventory ? destinationInventory.quantity : 0

    // Calculate new stock levels
    const fromStoreStockAfter = fromStoreStockBefore - quantity
    const toStoreStockAfter = toStoreStockBefore + quantity

    // Get cost price from source inventory
    const costPrice = sourceInventory ? sourceInventory.costPrice : 0

    // Generate distribution number
    const distributionNumber = await generateDistributionNumber()

    // Step 2: Reduce stock in Main Store (Source)
    if (sourceInventory) {
      sourceInventory.quantity = fromStoreStockAfter
      sourceInventory.lastUpdated = new Date()
      await sourceInventory.save({ session })
    } else {
      // This shouldn't happen if validation passed, but handle it
      return res.status(400).json({
        success: false,
        message: "Source inventory record not found",
      })
    }

    // Step 3: Add stock in Kitchen Store (Destination)
    if (destinationInventory) {
      destinationInventory.quantity = toStoreStockAfter
      destinationInventory.lastUpdated = new Date()
      await destinationInventory.save({ session })
    } else {
      // Create new inventory record for destination
      destinationInventory = new LocationInventory({
        locationId: toStoreId,
        rawMaterialId: rawMaterialId,
        quantity: toStoreStockAfter,
        costPrice: costPrice, // Use same cost price as source
        lastUpdated: new Date(),
      })
      await destinationInventory.save({ session })
    }

    // Step 4: Create distribution record
    const distribution = new Distribution({
      distributionNumber,
      fromStoreId,
      toStoreId,
      rawMaterialId,
      quantity,
      unit: rawMaterial.unit,
      costPrice,
      distributionDate: distributionDate ? new Date(distributionDate) : new Date(),
      notes: notes || "",
      status: "Completed",
      fromStoreStockBefore,
      fromStoreStockAfter,
      toStoreStockBefore,
      toStoreStockAfter,
      createdBy: req.user?._id || req.user?.id || null,
    })

    await distribution.save({ session })

    // Step 5: Create stock transaction records
    // Outward transaction from source
    const outwardTransaction = new StockTransaction({
      type: "outward",
      locationId: fromStoreId,
      rawMaterialId: rawMaterialId,
      quantity: quantity,
      costPrice: costPrice,
      reference: distributionNumber,
      source: `Distribution to ${toStore.name}`,
      notes: notes || `Distributed to ${toStore.name}`,
      toLocationId: toStoreId,
    })
    await outwardTransaction.save({ session })

    // Inward transaction to destination
    const inwardTransaction = new StockTransaction({
      type: "inward",
      locationId: toStoreId,
      rawMaterialId: rawMaterialId,
      quantity: quantity,
      costPrice: costPrice,
      reference: distributionNumber,
      source: `Distribution from ${fromStore.name}`,
      notes: notes || `Received from ${fromStore.name}`,
    })
    await inwardTransaction.save({ session })

    // Commit transaction
    await session.commitTransaction()

    // Populate distribution details
    await distribution.populate([
      { path: "fromStoreId", select: "name address" },
      { path: "toStoreId", select: "name address" },
      { path: "rawMaterialId", select: "name category unit" },
    ])

    res.status(201).json({
      success: true,
      message: "Distribution completed successfully",
      data: distribution,
    })
  } catch (error) {
    await session.abortTransaction()
    console.error("Error creating distribution:", error)
    res.status(500).json({
      success: false,
      message: "Failed to create distribution",
      error: error.message,
    })
  } finally {
    session.endSession()
  }
}

// Get all distributions
exports.getAllDistributions = async (req, res) => {
  try {
    const { fromStoreId, toStoreId, rawMaterialId, startDate, endDate, status, page = 1, limit = 50 } = req.query

    const filter = {}

    if (fromStoreId) filter.fromStoreId = fromStoreId
    if (toStoreId) filter.toStoreId = toStoreId
    if (rawMaterialId) filter.rawMaterialId = rawMaterialId
    if (status) filter.status = status

    if (startDate || endDate) {
      filter.distributionDate = {}
      if (startDate) filter.distributionDate.$gte = new Date(startDate)
      if (endDate) filter.distributionDate.$lte = new Date(endDate)
    }

    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

    const distributions = await Distribution.find(filter)
      .populate("fromStoreId", "name address")
      .populate("toStoreId", "name address")
      .populate("rawMaterialId", "name category unit")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number.parseInt(limit))

    const total = await Distribution.countDocuments(filter)

    res.json({
      success: true,
      data: distributions,
      pagination: {
        current: Number.parseInt(page),
        pages: Math.ceil(total / Number.parseInt(limit)),
        total,
        limit: Number.parseInt(limit),
      },
    })
  } catch (error) {
    console.error("Error fetching distributions:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch distributions",
      error: error.message,
    })
  }
}

// Get distribution by ID
exports.getDistributionById = async (req, res) => {
  try {
    const distribution = await Distribution.findById(req.params.id)
      .populate("fromStoreId", "name address manager contact")
      .populate("toStoreId", "name address manager contact")
      .populate("rawMaterialId", "name category unit description")
      .populate("createdBy", "name email")

    if (!distribution) {
      return res.status(404).json({
        success: false,
        message: "Distribution not found",
      })
    }

    res.json({
      success: true,
      data: distribution,
    })
  } catch (error) {
    console.error("Error fetching distribution:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch distribution",
      error: error.message,
    })
  }
}

// Cancel a distribution (reverse the transaction)
exports.cancelDistribution = async (req, res) => {
  const session = await require("mongoose").startSession()
  session.startTransaction()

  try {
    const distribution = await Distribution.findById(req.params.id).session(session)

    if (!distribution) {
      return res.status(404).json({
        success: false,
        message: "Distribution not found",
      })
    }

    if (distribution.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Distribution is already cancelled",
      })
    }

    // Reverse the stock movements
    // Add back to source store
    let sourceInventory = await LocationInventory.findOne({
      locationId: distribution.fromStoreId,
      rawMaterialId: distribution.rawMaterialId,
    }).session(session)

    if (sourceInventory) {
      sourceInventory.quantity += distribution.quantity
      sourceInventory.lastUpdated = new Date()
      await sourceInventory.save({ session })
    } else {
      // Create if doesn't exist
      sourceInventory = new LocationInventory({
        locationId: distribution.fromStoreId,
        rawMaterialId: distribution.rawMaterialId,
        quantity: distribution.quantity,
        costPrice: distribution.costPrice,
        lastUpdated: new Date(),
      })
      await sourceInventory.save({ session })
    }

    // Remove from destination store
    let destinationInventory = await LocationInventory.findOne({
      locationId: distribution.toStoreId,
      rawMaterialId: distribution.rawMaterialId,
    }).session(session)

    if (destinationInventory) {
      const newQuantity = destinationInventory.quantity - distribution.quantity
      if (newQuantity < 0) {
        return res.status(400).json({
          success: false,
          message: "Cannot cancel: Destination store has insufficient stock",
        })
      }
      destinationInventory.quantity = newQuantity
      destinationInventory.lastUpdated = new Date()
      await destinationInventory.save({ session })
    }

    // Update distribution status
    distribution.status = "Cancelled"
    await distribution.save({ session })

    // Create reversal transactions
    const reversalOutward = new StockTransaction({
      type: "outward",
      locationId: distribution.toStoreId,
      rawMaterialId: distribution.rawMaterialId,
      quantity: distribution.quantity,
      costPrice: distribution.costPrice,
      reference: `CANCEL-${distribution.distributionNumber}`,
      source: `Cancellation of ${distribution.distributionNumber}`,
      notes: `Reversal: Returned to ${distribution.fromStoreId}`,
      toLocationId: distribution.fromStoreId,
    })
    await reversalOutward.save({ session })

    const reversalInward = new StockTransaction({
      type: "inward",
      locationId: distribution.fromStoreId,
      rawMaterialId: distribution.rawMaterialId,
      quantity: distribution.quantity,
      costPrice: distribution.costPrice,
      reference: `CANCEL-${distribution.distributionNumber}`,
      source: `Cancellation of ${distribution.distributionNumber}`,
      notes: `Reversal: Returned from ${distribution.toStoreId}`,
    })
    await reversalInward.save({ session })

    await session.commitTransaction()

    res.json({
      success: true,
      message: "Distribution cancelled successfully",
      data: distribution,
    })
  } catch (error) {
    await session.abortTransaction()
    console.error("Error cancelling distribution:", error)
    res.status(500).json({
      success: false,
      message: "Failed to cancel distribution",
      error: error.message,
    })
  } finally {
    session.endSession()
  }
}

// Get distribution summary/statistics
exports.getDistributionSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query

    const filter = { status: "Completed" }
    if (startDate || endDate) {
      filter.distributionDate = {}
      if (startDate) filter.distributionDate.$gte = new Date(startDate)
      if (endDate) filter.distributionDate.$lte = new Date(endDate)
    }

    const totalDistributions = await Distribution.countDocuments(filter)

    const totalQuantityDistributed = await Distribution.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: "$quantity" },
          totalValue: { $sum: { $multiply: ["$quantity", "$costPrice"] } },
        },
      },
    ])

    const storeWiseDistribution = await Distribution.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            fromStore: "$fromStoreId",
            toStore: "$toStoreId",
          },
          totalQuantity: { $sum: "$quantity" },
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "storelocations",
          localField: "_id.fromStore",
          foreignField: "_id",
          as: "fromStore",
        },
      },
      {
        $lookup: {
          from: "storelocations",
          localField: "_id.toStore",
          foreignField: "_id",
          as: "toStore",
        },
      },
    ])

    const materialWiseDistribution = await Distribution.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$rawMaterialId",
          totalQuantity: { $sum: "$quantity" },
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "rawmaterials",
          localField: "_id",
          foreignField: "_id",
          as: "material",
        },
      },
    ])

    res.json({
      success: true,
      data: {
        totalDistributions,
        totalQuantityDistributed: totalQuantityDistributed[0]?.totalQuantity || 0,
        totalValueDistributed: totalQuantityDistributed[0]?.totalValue || 0,
        storeWiseDistribution,
        materialWiseDistribution,
      },
    })
  } catch (error) {
    console.error("Error fetching distribution summary:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch distribution summary",
      error: error.message,
    })
  }
}

