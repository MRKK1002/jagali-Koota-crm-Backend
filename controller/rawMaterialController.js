// const RawMaterial = require("../model/rawMaterialModel")

// // Get all raw materials with optional filtering and search
// exports.getAllRawMaterials = async (req, res) => {
//   try {
//     const { search, category, status, sortBy = "name", sortOrder = "asc", page = 1, limit = 50 } = req.query

//     // Build filter object
//     const filter = {}
//     if (search) {
//       filter.$or = [{ name: { $regex: search, $options: "i" } }, { description: { $regex: search, $options: "i" } }]
//     }

//     if (category && category !== "all") {
//       filter.category = category
//     }

//     if (status && status !== "all") {
//       filter.status = status
//     }

//     // Build sort object
//     const sort = {}
//     sort[sortBy] = sortOrder === "desc" ? -1 : 1

//     // Calculate pagination
//     const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

//     // Execute query
//     const materials = await RawMaterial.find(filter).sort(sort).skip(skip).limit(Number.parseInt(limit))

//     // Get total count for pagination
//     const total = await RawMaterial.countDocuments(filter)

//     res.json({
//       success: true,
//       data: materials,
//       pagination: {
//         current: Number.parseInt(page),
//         pages: Math.ceil(total / Number.parseInt(limit)),
//         total,
//         limit: Number.parseInt(limit),
//       },
//     })
//   } catch (err) {
//     console.error("Error fetching raw materials:", err)
//     res.status(500).json({
//       success: false,
//       error: err.message,
//     })
//   }
// }

// // Get a single raw material by ID
// exports.getRawMaterialById = async (req, res) => {
//   try {
//     const material = await RawMaterial.findById(req.params.id)
//     if (!material) {
//       return res.status(404).json({
//         success: false,
//         error: "Raw material not found",
//       })
//     }

//     res.json({
//       success: true,
//       data: material,
//     })
//   } catch (err) {
//     console.error("Error fetching raw material:", err)
//     res.status(500).json({
//       success: false,
//       error: err.message,
//     })
//   }
// }

// // Create a new raw material
// exports.createRawMaterial = async (req, res) => {
//   try {
//     const { name, category, unit, price, quantity, minLevel, supplier, description } = req.body

//     // Check if material with same name already exists
//     const existingMaterial = await RawMaterial.findOne({
//       name: { $regex: new RegExp(`^${name}$`, "i") },
//     })

//     if (existingMaterial) {
//       return res.status(400).json({
//         success: false,
//         error: "Material with this name already exists",
//       })
//     }

//     const material = new RawMaterial({
//       name,
//       category,
//       unit,
//       price: Number.parseFloat(price),
//       quantity: Number.parseFloat(quantity) || 0,
//       minLevel: Number.parseFloat(minLevel) || 5,
//       supplier,
//       description,
//     })

//     await material.save()

//     res.status(201).json({
//       success: true,
//       message: "Raw material created successfully",
//       data: material,
//     })
//   } catch (err) {
//     console.error("Error creating raw material:", err)
//     if (err.name === "ValidationError") {
//       const errors = Object.values(err.errors).map((e) => e.message)
//       return res.status(400).json({
//         success: false,
//         error: errors.join(", "),
//       })
//     }
//     res.status(400).json({
//       success: false,
//       error: err.message,
//     })
//   }
// }

// // Update a raw material
// exports.updateRawMaterial = async (req, res) => {
//   try {
//     const { name, category, unit, price, quantity, minLevel, supplier, description } = req.body

//     // Check if another material with same name exists (excluding current one)
//     if (name) {
//       const existingMaterial = await RawMaterial.findOne({
//         name: { $regex: new RegExp(`^${name}$`, "i") },
//         _id: { $ne: req.params.id },
//       })

//       if (existingMaterial) {
//         return res.status(400).json({
//           success: false,
//           error: "Material with this name already exists",
//         })
//       }
//     }

//     const updateData = {}
//     if (name !== undefined) updateData.name = name
//     if (category !== undefined) updateData.category = category
//     if (unit !== undefined) updateData.unit = unit
//     if (price !== undefined) updateData.price = Number.parseFloat(price)
//     if (quantity !== undefined) updateData.quantity = Number.parseFloat(quantity)
//     if (minLevel !== undefined) updateData.minLevel = Number.parseFloat(minLevel)
//     if (supplier !== undefined) updateData.supplier = supplier
//     if (description !== undefined) updateData.description = description

//     const material = await RawMaterial.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true })

//     if (!material) {
//       return res.status(404).json({
//         success: false,
//         error: "Raw material not found",
//       })
//     }

//     res.json({
//       success: true,
//       message: "Raw material updated successfully",
//       data: material,
//     })
//   } catch (err) {
//     console.error("Error updating raw material:", err)
//     if (err.name === "ValidationError") {
//       const errors = Object.values(err.errors).map((e) => e.message)
//       return res.status(400).json({
//         success: false,
//         error: errors.join(", "),
//       })
//     }
//     res.status(400).json({
//       success: false,
//       error: err.message,
//     })
//   }
// }

// // Delete a raw material
// exports.deleteRawMaterial = async (req, res) => {
//   try {
//     const material = await RawMaterial.findByIdAndDelete(req.params.id)
//     if (!material) {
//       return res.status(404).json({
//         success: false,
//         error: "Raw material not found",
//       })
//     }

//     res.json({
//       success: true,
//       message: "Raw material deleted successfully",
//     })
//   } catch (err) {
//     console.error("Error deleting raw material:", err)
//     res.status(500).json({
//       success: false,
//       error: err.message,
//     })
//   }
// }

// // Get low stock items
// exports.getLowStockItems = async (req, res) => {
//   try {
//     const lowStockMaterials = await RawMaterial.find({
//       $expr: { $lte: ["$quantity", "$minLevel"] },
//     }).sort({ quantity: 1 })

//     res.json({
//       success: true,
//       data: lowStockMaterials,
//     })
//   } catch (err) {
//     console.error("Error fetching low stock items:", err)
//     res.status(500).json({
//       success: false,
//       error: err.message,
//     })
//   }
// }

// // Update stock quantity (for stock adjustments)
// exports.updateStock = async (req, res) => {
//   try {
//     const { quantity, operation = "set" } = req.body

//     if (quantity === undefined || quantity < 0) {
//       return res.status(400).json({
//         success: false,
//         error: "Valid quantity is required",
//       })
//     }

//     const material = await RawMaterial.findById(req.params.id)
//     if (!material) {
//       return res.status(404).json({
//         success: false,
//         error: "Raw material not found",
//       })
//     }

//     let newQuantity
//     switch (operation) {
//       case "add":
//         newQuantity = material.quantity + Number.parseFloat(quantity)
//         break
//       case "subtract":
//         newQuantity = Math.max(0, material.quantity - Number.parseFloat(quantity))
//         break
//       case "set":
//       default:
//         newQuantity = Number.parseFloat(quantity)
//         break
//     }

//     material.quantity = newQuantity
//     await material.save()

//     res.json({
//       success: true,
//       message: "Stock updated successfully",
//       data: material,
//     })
//   } catch (err) {
//     console.error("Error updating stock:", err)
//     res.status(400).json({
//       success: false,
//       error: err.message,
//     })
//   }
// }

// // Get materials by category
// exports.getMaterialsByCategory = async (req, res) => {
//   try {
//     const { category } = req.params
//     const materials = await RawMaterial.find({ category }).sort({ name: 1 })

//     res.json({
//       success: true,
//       data: materials,
//     })
//   } catch (err) {
//     console.error("Error fetching materials by category:", err)
//     res.status(500).json({
//       success: false,
//       error: err.message,
//     })
//   }
// }














const RawMaterial = require("../model/rawMaterialModel")

// ---------------- Get all raw materials ----------------
exports.getAllRawMaterials = async (req, res) => {
  try {
    const { search, category, status, unit, sortBy = "name", sortOrder = "asc", page = 1, limit = 50 } = req.query

    const filter = {}
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ]
    }
    if (category && category !== "all") filter.category = category
    if (status && status !== "all") filter.status = status
    if (unit && unit !== "all") filter.unit = unit

    const sort = {}
    sort[sortBy] = sortOrder === "desc" ? -1 : 1

    const skip = (Number(page) - 1) * Number(limit)

    const materials = await RawMaterial.find(filter)
      .populate("suppliers.supplier", "name supplierID contact companyName email gst") // populate supplier details including companyName
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))

    const total = await RawMaterial.countDocuments(filter)

    res.json({
      success: true,
      data: materials,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / Number(limit)),
        total,
        limit: Number(limit),
      },
    })
  } catch (err) {
    console.error("Error fetching raw materials:", err)
    res.status(500).json({ success: false, error: err.message })
  }
}

// ---------------- Get single raw material ----------------
exports.getRawMaterialById = async (req, res) => {
  try {
    const material = await RawMaterial.findById(req.params.id).populate("suppliers.supplier", "name supplierID contact companyName email gst")
    if (!material) return res.status(404).json({ success: false, error: "Raw material not found" })

    res.json({ success: true, data: material })
  } catch (err) {
    console.error("Error fetching raw material:", err)
    res.status(500).json({ success: false, error: err.message })
  }
}

// ---------------- Create raw material ----------------
exports.createRawMaterial = async (req, res) => {
  try {
    const { name, category, unit, suppliers = [], minLevel, description } = req.body

    const existingMaterial = await RawMaterial.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } })
    if (existingMaterial) {
      return res.status(400).json({ success: false, error: "Material with this name already exists" })
    }

    const material = new RawMaterial({
      name,
      category,
      unit,
      suppliers, // array of { supplier:ObjectId, quantity, price }
      minLevel: Number(minLevel) || 5,
      description,
    })

    await material.save()

    res.status(201).json({
      success: true,
      message: "Raw material created successfully",
      data: material,
    })
  } catch (err) {
    console.error("Error creating raw material:", err)
    res.status(400).json({ success: false, error: err.message })
  }
}

// ---------------- Update raw material ----------------
exports.updateRawMaterial = async (req, res) => {
  try {
    const { name, category, unit, suppliers, minLevel, description } = req.body

    if (name) {
      const existingMaterial = await RawMaterial.findOne({
        name: { $regex: new RegExp(`^${name}$`, "i") },
        _id: { $ne: req.params.id },
      })
      if (existingMaterial) {
        return res.status(400).json({ success: false, error: "Material with this name already exists" })
      }
    }

    const updateData = {}
    if (name !== undefined) updateData.name = name
    if (category !== undefined) updateData.category = category
    if (unit !== undefined) updateData.unit = unit
    if (suppliers !== undefined) updateData.suppliers = suppliers // overwrite full array
    if (minLevel !== undefined) updateData.minLevel = Number(minLevel)
    if (description !== undefined) updateData.description = description

    const material = await RawMaterial.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate("suppliers.supplier", "name supplierID contact companyName email gst")

    if (!material) return res.status(404).json({ success: false, error: "Raw material not found" })

    // ensure totals/status updated
    await material.save()

    res.json({
      success: true,
      message: "Raw material updated successfully",
      data: material,
    })
  } catch (err) {
    console.error("Error updating raw material:", err)
    res.status(400).json({ success: false, error: err.message })
  }
}

// ---------------- Delete raw material ----------------
exports.deleteRawMaterial = async (req, res) => {
  try {
    const material = await RawMaterial.findByIdAndDelete(req.params.id)
    if (!material) return res.status(404).json({ success: false, error: "Raw material not found" })

    res.json({ success: true, message: "Raw material deleted successfully" })
  } catch (err) {
    console.error("Error deleting raw material:", err)
    res.status(500).json({ success: false, error: err.message })
  }
}

// ---------------- Low stock items ----------------
exports.getLowStockItems = async (req, res) => {
  try {
    const lowStockMaterials = await RawMaterial.find({
      $expr: { $lte: ["$totalQuantity", "$minLevel"] },
    }).sort({ totalQuantity: 1 })

    res.json({ success: true, data: lowStockMaterials })
  } catch (err) {
    console.error("Error fetching low stock items:", err)
    res.status(500).json({ success: false, error: err.message })
  }
}

// ---------------- Update stock (adjust supplier qty) ----------------
exports.updateStock = async (req, res) => {
  try {
    const { supplierId, quantity, operation = "set" } = req.body

    if (!supplierId || quantity === undefined || quantity < 0) {
      return res.status(400).json({ success: false, error: "Valid supplierId and quantity are required" })
    }

    const material = await RawMaterial.findById(req.params.id)
    if (!material) return res.status(404).json({ success: false, error: "Raw material not found" })

    const supplierEntry = material.suppliers.find(
      (s) => s.supplier.toString() === supplierId.toString()
    )
    if (!supplierEntry) {
      return res.status(404).json({ success: false, error: "Supplier not found for this material" })
    }

    switch (operation) {
      case "add":
        supplierEntry.quantity += Number(quantity)
        break
      case "subtract":
        supplierEntry.quantity = Math.max(0, supplierEntry.quantity - Number(quantity))
        break
      case "set":
      default:
        supplierEntry.quantity = Number(quantity)
        break
    }

    await material.save()

    res.json({
      success: true,
      message: "Stock updated successfully",
      data: material,
    })
  } catch (err) {
    console.error("Error updating stock:", err)
    res.status(400).json({ success: false, error: err.message })
  }
}

// ---------------- Get materials by category ----------------
exports.getMaterialsByCategory = async (req, res) => {
  try {
    const { category } = req.params
    const materials = await RawMaterial.find({ category }).sort({ name: 1 }).populate("suppliers.supplier", "name supplierID contact companyName email gst")

    res.json({ success: true, data: materials })
  } catch (err) {
    console.error("Error fetching materials by category:", err)
    res.status(500).json({ success: false, error: err.message })
  }
}
