const RawMaterial = require("../model/rawMaterialModel")
exports.getAllRawMaterials = async (req, res) => {
  try {
    const { search, category, status, unit, sortBy = "name", sortOrder = "asc", page = 1, limit = 50 } = req.query

    const filter = {}
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
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
exports.createRawMaterial = async (req, res) => {
  try {
    const { name, code, category, unit, suppliers = [], minLevel, description } = req.body

    const existingMaterial = await RawMaterial.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } })
    if (existingMaterial) {
      return res.status(400).json({ success: false, error: "Material with this name already exists" })
    }

    const material = new RawMaterial({
      name,
      code: code || "",
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
exports.updateRawMaterial = async (req, res) => {
  try {
    const { name, code, category, unit, suppliers, minLevel, description } = req.body

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
    if (code !== undefined) updateData.code = code
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
