const express = require("express")
const router = express.Router()
const { LocationInventory, StockTransaction } = require("../Restaurant/RestautantModel/RestaurantLocationInventoryModel")
const RawMaterial = require("../Restaurant/RestautantModel/RestaurantRawMaterialModel")
const StoreLocation = require("../Restaurant/RestautantModel/RestaurantStoreLocationModel")

// GET /location-inventory - Get inventory for a specific location
router.get("/", async (req, res) => {
  try {
    const { locationId, search, category, status } = req.query

    if (!locationId) {
      return res.status(400).json({
        success: false,
        message: "Location ID is required",
      })
    }

    const query = { locationId, quantity: { $gt: 0 } }

    // Add search and filter logic
    if (search) {
      const rawMaterials = await RawMaterial.find({ name: { $regex: search, $options: "i" } }).select("_id")
      query.rawMaterialId = { $in: rawMaterials.map((rm) => rm._id) }
    }
    if (category && category !== "all") {
      const rawMaterials = await RawMaterial.find({ category: category }).select("_id")
      query.rawMaterialId = { ...query.rawMaterialId, $in: rawMaterials.map((rm) => rm._id) }
    }

    const inventory = await LocationInventory.find(query)
      .populate("rawMaterialId", "name category unit price description minLevel")
      .populate("locationId", "name")
      .sort({ createdAt: -1 })

    // Transform data to match frontend expectations
    const transformedInventory = inventory.map((item) => ({
      _id: item._id,
      name: item.rawMaterialId?.name || "Unknown Item",
      category: item.rawMaterialId?.category || "N/A",
      unit: item.rawMaterialId?.unit || "units",
      quantity: item.quantity,
      costPrice: item.costPrice,
      price: item.costPrice, // Assuming costPrice is the relevant price for inventory
      expiryDate: item.expiryDate,
      batchNumber: item.batchNumber,
      // Status calculation should ideally be done on frontend based on minLevel
      // For now, a basic check:
      status: item.quantity > 0 ? "In Stock" : "Out of Stock",
      rawMaterialId: {
        // Ensure this structure matches what frontend expects for populated data
        _id: item.rawMaterialId?._id,
        name: item.rawMaterialId?.name,
        category: item.rawMaterialId?.category,
        unit: item.rawMaterialId?.unit,
        description: item.rawMaterialId?.description,
        minLevel: item.rawMaterialId?.minLevel || 0,
        price: item.rawMaterialId?.price || 0,
      },
      locationId: item.locationId?._id,
      locationName: item.locationId?.name,
    }))

    res.json({
      success: true,
      data: transformedInventory,
    })
  } catch (error) {
    console.error("Error fetching location inventory:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch inventory",
      error: error.message,
    })
  }
})

// POST /location-inventory - Add raw material to location
router.post("/", async (req, res) => {
  try {
    const { locationId, rawMaterialId, quantity, costPrice, expiryDate, batchNumber } = req.body

    if (!locationId || !rawMaterialId || !quantity || !costPrice) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: locationId, rawMaterialId, quantity, costPrice",
      })
    }

    // Check if item already exists in this location
    let existingInventory = await LocationInventory.findOne({
      locationId,
      rawMaterialId,
    })

    if (existingInventory) {
      // Update existing inventory
      existingInventory.quantity += Number.parseFloat(quantity)
      existingInventory.costPrice = Number.parseFloat(costPrice) // Update cost price to latest
      if (expiryDate) existingInventory.expiryDate = expiryDate
      if (batchNumber) existingInventory.batchNumber = batchNumber
      existingInventory.lastUpdated = new Date()

      await existingInventory.save()
    } else {
      // Create new inventory record
      existingInventory = new LocationInventory({
        locationId,
        rawMaterialId,
        quantity: Number.parseFloat(quantity),
        costPrice: Number.parseFloat(costPrice),
        expiryDate,
        batchNumber,
      })

      await existingInventory.save()
    }

    // Create stock transaction record for inward movement
    const transaction = new StockTransaction({
      type: "inward",
      locationId,
      rawMaterialId,
      quantity: Number.parseFloat(quantity),
      costPrice: Number.parseFloat(costPrice),
      reference: `MANUAL-INWARD-${Date.now()}`, // More specific reference
      source: "Manual Entry (Store Location)",
      expiryDate,
      batchNumber,
      notes: "Manual inventory addition via Store Location UI",
    })

    await transaction.save()

    // Populate the response
    await existingInventory.populate("rawMaterialId", "name category unit price description minLevel")
    await existingInventory.populate("locationId", "name")

    res.status(201).json({
      success: true,
      message: "Raw material added to inventory successfully",
      data: existingInventory,
    })
  } catch (error) {
    console.error("Error adding to inventory:", error)
    res.status(500).json({
      success: false,
      message: "Failed to add raw material to inventory",
      error: error.message,
    })
  }
})

// POST /location-inventory - Add raw material to location
// router.post("/", async (req, res) => {
//   try {
//     const { locationId, rawMaterialId, quantity, costPrice, expiryDate, batchNumber } = req.body

//     if (!locationId || !rawMaterialId || !quantity || !costPrice) {
//       return res.status(400).json({
//         success: false,
//         message: "Missing required fields: locationId, rawMaterialId, quantity, costPrice",
//       })
//     }

//     // 🔹 1. Find raw material (central warehouse)
//     const rawMaterial = await RawMaterial.findById(rawMaterialId)
//     if (!rawMaterial) {
//       return res.status(404).json({ success: false, message: "Raw material not found" })
//     }

//     // 🔹 2. Ensure enough stock exists
//     if (rawMaterial.totalQuantity < quantity) {
//       return res.status(400).json({ success: false, message: "Not enough stock in warehouse" })
//     }

//     // 🔹 3. Deduct from central stock & update transferred count
//     rawMaterial.totalQuantity -= Number(quantity)
//     rawMaterial.transfered += Number(quantity)
//     await rawMaterial.save()

//     // 🔹 4. Update or create inventory at location
//     let existingInventory = await LocationInventory.findOne({ locationId, rawMaterialId })

//     if (existingInventory) {
//       existingInventory.quantity += Number(quantity)
//       existingInventory.costPrice = Number(costPrice) // update cost price to latest
//       if (expiryDate) existingInventory.expiryDate = expiryDate
//       if (batchNumber) existingInventory.batchNumber = batchNumber
//       existingInventory.lastUpdated = new Date()
//       await existingInventory.save()
//     } else {
//       existingInventory = new LocationInventory({
//         locationId,
//         rawMaterialId,
//         quantity: Number(quantity),
//         costPrice: Number(costPrice),
//         expiryDate,
//         batchNumber,
//       })
//       await existingInventory.save()
//     }

//     // 🔹 5. Log transaction
//     const transaction = new StockTransaction({
//       type: "transfer", // ✅ Use transfer instead of inward
//       locationId,
//       rawMaterialId,
//       quantity: Number(quantity),
//       costPrice: Number(costPrice),
//       reference: `TRANSFER-${Date.now()}`,
//       source: "Central Warehouse",
//       expiryDate,
//       batchNumber,
//       notes: "Stock transferred from central warehouse to store location",
//     })
//     await transaction.save()

//     // 🔹 6. Populate response
//     await existingInventory.populate("rawMaterialId", "name category unit description minLevel")
//     await existingInventory.populate("locationId", "name")

//     res.status(201).json({
//       success: true,
//       message: "Raw material transferred to location successfully",
//       data: {
//         rawMaterial,
//         locationInventory: existingInventory,
//       },
//     })
//   } catch (error) {
//     console.error("Error transferring inventory:", error)
//     res.status(500).json({
//       success: false,
//       message: "Failed to transfer raw material",
//       error: error.message,
//     })
//   }
// })


module.exports = router
