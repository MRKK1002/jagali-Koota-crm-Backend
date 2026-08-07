
// const RawMaterial = require("../RestautantModel/RestaurantRawMaterialModel")

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












// Import Restaurant Raw Material Model
const RawMaterial = require("../RestautantModel/RestaurantRawMaterialModel")
const XLSX = require('xlsx')
const multer = require('multer')
const path = require('path')
const ResSupplier = require("../../model/resSupplierModel")

// Configure multer for Excel file uploads
const storage = multer.memoryStorage()
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.xlsx', '.xls']
    const fileExtension = path.extname(file.originalname).toLowerCase()
    if (allowedTypes.includes(fileExtension)) {
      cb(null, true)
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'), false)
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
})

// ---------------- Get all raw materials ----------------
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

    // PERF: by default this endpoint populates full supplier documents into
    // every material's `suppliers` array, which makes the 181-material response
    // ~217 KB / ~3.4 s. Screens that only need to *pick* a material (purchase
    // orders, GRN) don't need supplier details — just the supplier ids to
    // filter by. `?minimal=true` skips the populate and trims fields, cutting
    // the payload by roughly 85%.
    // Omitting the param preserves the original response exactly.
    const minimal = req.query.minimal === "true" || req.query.minimal === "1"

    let q = RawMaterial.find(filter)
    if (minimal) {
      q = q.select("name code unit category status suppliers.supplier suppliers.quantity")
    } else {
      q = q.populate(
        "suppliers.supplier",
        "name supplierID contact companyName email gst"
      )
    }

    const materials = await q.sort(sort).skip(skip).limit(Number(limit)).lean()

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
    const { name, code, category, unit, suppliers = [], minLevel, description } = req.body

    // Validate required fields
    if (!name || !unit) {
      return res.status(400).json({ 
        success: false, 
        error: "Name and unit are required fields" 
      })
    }

    const existingMaterial = await RawMaterial.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } })
    if (existingMaterial) {
      return res.status(400).json({ success: false, error: "Material with this name already exists" })
    }

    const categoryValue = (category && category.trim()) ? category.trim() : "General";
    
    const material = new RawMaterial({
      name: name.trim(),
      code: code || "",
      category: categoryValue,
      unit: unit.trim(),
      suppliers: Array.isArray(suppliers) ? suppliers : [],
      minLevel: Number(minLevel) || 5,
      description: description || "",
      distributionUnit: req.body.distributionUnit || null,
      conversionFactor: req.body.conversionFactor ? Number(req.body.conversionFactor) : null,
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
    const { name, code, category, unit, suppliers, minLevel, description } = req.body
    
    // Get existing material to preserve fields if not provided
    const existingMaterial = await RawMaterial.findById(req.params.id)
    if (!existingMaterial) {
      return res.status(404).json({ success: false, error: "Raw material not found" })
    }

    // Check for duplicate name if name is being updated
    if (name) {
      const duplicateMaterial = await RawMaterial.findOne({
        name: { $regex: new RegExp(`^${name}$`, "i") },
        _id: { $ne: req.params.id },
      })
      if (duplicateMaterial) {
        return res.status(400).json({ success: false, error: "Material with this name already exists" })
      }
    }

    // Build update data, preserving existing values if not provided
    const updateData = {}
    if (name !== undefined) updateData.name = name.trim()
    if (code !== undefined) updateData.code = code
    if (category !== undefined) updateData.category = category
    else updateData.category = existingMaterial.category || "General" // Preserve or default
    if (unit !== undefined) updateData.unit = unit.trim()
    if (suppliers !== undefined) updateData.suppliers = Array.isArray(suppliers) ? suppliers : existingMaterial.suppliers
    if (minLevel !== undefined) updateData.minLevel = Number(minLevel)
    else updateData.minLevel = existingMaterial.minLevel || 5
    if (description !== undefined) updateData.description = description
    else updateData.description = existingMaterial.description || ""

    // Handle distribution unit fields
    if (req.body.distributionUnit !== undefined) {
      updateData.distributionUnit = req.body.distributionUnit || null
    }
    if (req.body.conversionFactor !== undefined) {
      updateData.conversionFactor = req.body.conversionFactor ? Number(req.body.conversionFactor) : null
    }

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

// ---------------- Export raw materials to Excel ----------------
exports.exportRawMaterialsToExcel = async (req, res) => {
  try {
    const materials = await RawMaterial.find()
      .populate("suppliers.supplier", "name supplierID contact companyName email gst")
      .sort({ createdAt: -1 })

    // Prepare data for Excel export
    const excelData = materials.map((material, index) => {
      // Get primary supplier (first one) for display
      const primarySupplier = material.suppliers && material.suppliers.length > 0 ? material.suppliers[0] : null
      const supplierName = primarySupplier?.supplier?.name || ''
      const supplierCompany = primarySupplier?.supplier?.companyName || ''
      
      // Combine supplier name and company name like "girish - annapoorneshwari"
      let supplierInfo = 'N/A'
      if (supplierName && supplierCompany) {
        supplierInfo = `${supplierName} - ${supplierCompany}`
      } else if (supplierName) {
        supplierInfo = supplierName
      } else if (supplierCompany) {
        supplierInfo = supplierCompany
      }
      
      return {
        'S.No': index + 1,
        'Material Name': material.name || '',
        'Unit of Measurement': material.unit || '',
        'Supplier': supplierInfo,
      }
    })

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(excelData)

    // Set column widths
    const columnWidths = [
      { wch: 8 },   // S.No
      { wch: 25 },  // Material Name
      { wch: 15 },  // Unit of Measurement
      { wch: 30 },  // Supplier
    ]
    worksheet['!cols'] = columnWidths

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Raw Materials')

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // Set response headers
    const fileName = `raw_materials_export_${new Date().toISOString().split('T')[0]}.xlsx`
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
    res.setHeader('Content-Length', excelBuffer.length)

    // Send the Excel file
    res.send(excelBuffer)

  } catch (error) {
    console.error("Error exporting raw materials to Excel:", error)
    res.status(500).json({
      message: "Error exporting raw materials to Excel",
      error: error.message,
    })
  }
}

// ---------------- Import raw materials from Excel ----------------
exports.importRawMaterialsFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No Excel file uploaded" })
    }

    // Read the Excel file from buffer
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    // Convert worksheet to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet)

    if (jsonData.length === 0) {
      return res.status(400).json({ message: "Excel file is empty or has no valid data" })
    }

    const results = {
      total: jsonData.length,
      successful: 0,
      failed: 0,
      errors: []
    }

    // Get all suppliers for mapping
    const suppliers = await ResSupplier.find({}, 'name companyName _id')
    const supplierMap = new Map()
    suppliers.forEach(supplier => {
      supplierMap.set(supplier.name.toLowerCase(), supplier._id)
      supplierMap.set(supplier.companyName.toLowerCase(), supplier._id)
    })

    // Process each row
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i]
      const rowNumber = i + 2 // Excel row number (accounting for header)

      try {
        // Map Excel columns to database fields (flexible column names)
        const materialData = {
          name: row['Material Name'] || row['name'] || row['Name'] || '',
          unit: row['Unit of Measurement'] || row['unit'] || row['Unit'] || row['UOM'] || '',
          supplier: row['Supplier'] || row['supplier'] || row['Supplier Name'] || row['supplierName'] || '',
        }

        // Validate required fields
        const requiredFields = ['name', 'unit']
        const missingFields = requiredFields.filter(field => !materialData[field]?.toString().trim())

        if (missingFields.length > 0) {
          results.failed++
          results.errors.push({
            row: rowNumber,
            error: `Missing required fields: ${missingFields.join(', ')}`,
            data: materialData
          })
          continue
        }

        // Clean and validate data
        materialData.name = materialData.name.toString().trim()
        materialData.unit = materialData.unit.toString().trim()
        materialData.supplier = materialData.supplier?.toString().trim() || ''

        // Check for duplicates in database
        const existingMaterial = await RawMaterial.findOne({
          name: { $regex: new RegExp(`^${materialData.name}$`, 'i') }
        })

        if (existingMaterial) {
          results.failed++
          results.errors.push({
            row: rowNumber,
            error: "Material with same name already exists",
            data: materialData
          })
          continue
        }

        // Find supplier if provided
        let supplierId = null
        if (materialData.supplier) {
          const searchName = materialData.supplier.toLowerCase()
          
          // Try to find supplier by name or company name
          supplierId = supplierMap.get(searchName)
          
          if (!supplierId) {
            // Try partial matching
            for (const [key, value] of supplierMap.entries()) {
              if (key.includes(searchName) || searchName.includes(key)) {
                supplierId = value
                break
              }
            }
          }
          
          // If still not found, try to match combined format "name - company"
          if (!supplierId && materialData.supplier.includes(' - ')) {
            const parts = materialData.supplier.split(' - ')
            const supplierName = parts[0].trim().toLowerCase()
            const supplierCompany = parts[1].trim().toLowerCase()
            
            supplierId = supplierMap.get(supplierName) || supplierMap.get(supplierCompany)
          }
        }

        // Prepare suppliers array
        const suppliersArray = supplierId ? [{
          supplier: supplierId,
          quantity: 0,
          price: 0
        }] : []

        // Create new raw material
        const material = new RawMaterial({
          name: materialData.name,
          category: "General", // Default category
          unit: materialData.unit,
          suppliers: suppliersArray,
          minLevel: 5, // Default minimum level
          description: "", // Default description
        })

        await material.save()
        results.successful++

      } catch (error) {
        results.failed++
        results.errors.push({
          row: rowNumber,
          error: error.message,
          data: row
        })
      }
    }

    res.status(200).json({
      message: "Excel import completed",
      results: results
    })

  } catch (error) {
    console.error("Error importing raw materials from Excel:", error)
    res.status(500).json({
      message: "Error importing raw materials from Excel",
      error: error.message,
    })
  }
}

// ---------------- Download Excel template ----------------
exports.downloadExcelTemplate = async (req, res) => {
  try {
    // Fetch suppliers for the template
    const suppliers = await ResSupplier.find({}, 'name companyName').limit(5)

    // Create template data with sample row and instructions
    const templateData = [
      {
        'Material Name': 'Basmati Rice',
        'Unit of Measurement': 'kg',
        'Supplier': suppliers.length > 0 ? `${suppliers[0].name} - ${suppliers[0].companyName}` : 'ABC Suppliers - ABC Suppliers Pvt Ltd',
      }
    ]

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(templateData)

    // Set column widths
    const columnWidths = [
      { wch: 25 },  // Material Name
      { wch: 20 },  // Unit of Measurement
      { wch: 35 },  // Supplier
    ]
    worksheet['!cols'] = columnWidths

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Raw Material Template')

    // Create instructions sheet
    const instructions = [
      { 'Instructions': 'How to use this template:' },
      { 'Instructions': '1. Fill in all required fields for each raw material' },
      { 'Instructions': '2. Material Name: Name of the raw material (REQUIRED)' },
      { 'Instructions': '3. Unit of Measurement: Unit like kg, liter, pieces, etc. (REQUIRED)' },
      { 'Instructions': '4. Supplier: Format as "Name - Company Name" (OPTIONAL)' },
      { 'Instructions': '   Example: "Girish - Annapoorneshwari Foods Pvt Ltd"' },
      { 'Instructions': '5. Delete this sample row before importing' },
      { 'Instructions': '6. Supplier matching is done by name or company name' },
      { 'Instructions': '7. If supplier is not found, material will be created without supplier' },
      { 'Instructions': '' },
      { 'Instructions': 'Available Suppliers (use format: Name - Company):' },
      ...suppliers.map(supplier => ({ 'Instructions': `${supplier.name} - ${supplier.companyName}` }))
    ]

    const instructionsSheet = XLSX.utils.json_to_sheet(instructions)
    instructionsSheet['!cols'] = [{ wch: 60 }]
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions')

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // Set response headers
    const fileName = `raw_material_import_template.xlsx`
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
    res.setHeader('Content-Length', excelBuffer.length)

    // Send the Excel file
    res.send(excelBuffer)

  } catch (error) {
    console.error("Error generating Excel template:", error)
    res.status(500).json({
      message: "Error generating Excel template",
      error: error.message,
    })
  }
}

// Export multer upload middleware
exports.upload = upload