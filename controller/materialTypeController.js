const MaterialType = require("../construction/models/MaterialType");

// Generate unique material code
const generateMaterialCode = async (category) => {
  const prefix = category.substring(0, 3).toUpperCase();
  
  // Find the last material code for this category (including deleted ones)
  const lastMaterial = await MaterialType.findOne({ 
    materialCode: new RegExp(`^${prefix}-`) 
  }).sort({ materialCode: -1 });
  
  let nextNumber = 1;
  if (lastMaterial && lastMaterial.materialCode) {
    const lastNumber = parseInt(lastMaterial.materialCode.split("-")[1]) || 0;
    nextNumber = lastNumber + 1;
  }
  
  return `${prefix}-${String(nextNumber).padStart(4, "0")}`;
};

// Create new material type
exports.createMaterialType = async (req, res) => {
  try {
    const { materialName, category, unit, description, specifications, isActive } = req.body;

    // Validation
    if (!materialName || (typeof materialName === 'string' && !materialName.trim())) {
      return res.status(400).json({
        success: false,
        message: "Material name is required",
      });
    }
    if (!category || (typeof category === 'string' && !category.trim())) {
      return res.status(400).json({
        success: false,
        message: "Category is required",
      });
    }
    if (!unit || (typeof unit === 'string' && !unit.trim())) {
      return res.status(400).json({
        success: false,
        message: "Unit is required",
      });
    }

    // Check if material already exists
    const existingMaterial = await MaterialType.findOne({
      materialName: { $regex: new RegExp(`^${materialName}$`, "i") },
    });

    if (existingMaterial) {
      return res.status(400).json({
        success: false,
        message: "Material type already exists",
      });
    }

    // Generate material code
    const trimmedCategory = String(category).trim();
    const materialCode = await generateMaterialCode(trimmedCategory);

    // Create material type
    const materialType = new MaterialType({
      materialCode,
      materialName: String(materialName).trim(),
      category: trimmedCategory,
      unit: String(unit).trim(),
      description: description ? String(description).trim() : undefined,
      specifications: specifications ? String(specifications).trim() : undefined,
      isActive: isActive !== undefined ? isActive : true,
    });

    await materialType.save();

    res.status(201).json({
      success: true,
      message: "Material type created successfully",
      data: materialType,
    });
  } catch (error) {
    console.error("Error creating material type:", error);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors,
      });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`,
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Failed to create material type",
      error: error.message,
    });
  }
};

// Get all material types
exports.getAllMaterialTypes = async (req, res) => {
  try {
    const { category, isActive, search } = req.query;

    let query = {};

    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive === "true";
    if (search) {
      query.$or = [
        { materialName: { $regex: search, $options: "i" } },
        { materialCode: { $regex: search, $options: "i" } },
      ];
    }

    const materialTypes = await MaterialType.find(query).sort({ materialName: 1 });

    res.status(200).json({
      success: true,
      count: materialTypes.length,
      data: materialTypes,
    });
  } catch (error) {
    console.error("Error fetching material types:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch material types",
      error: error.message,
    });
  }
};

// Get material type by ID
exports.getMaterialTypeById = async (req, res) => {
  try {
    const materialType = await MaterialType.findById(req.params.id);

    if (!materialType) {
      return res.status(404).json({
        success: false,
        message: "Material type not found",
      });
    }

    res.status(200).json({
      success: true,
      data: materialType,
    });
  } catch (error) {
    console.error("Error fetching material type:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch material type",
      error: error.message,
    });
  }
};

// Update material type
exports.updateMaterialType = async (req, res) => {
  try {
    const { materialName, category, unit, description, specifications, isActive } = req.body;

    const materialType = await MaterialType.findById(req.params.id);

    if (!materialType) {
      return res.status(404).json({
        success: false,
        message: "Material type not found",
      });
    }

    // Check if new name already exists (excluding current material)
    if (materialName && materialName !== materialType.materialName) {
      const existingMaterial = await MaterialType.findOne({
        materialName: { $regex: new RegExp(`^${materialName}$`, "i") },
        _id: { $ne: req.params.id },
      });

      if (existingMaterial) {
        return res.status(400).json({
          success: false,
          message: "Material type with this name already exists",
        });
      }
    }

    // Update fields
    if (materialName) materialType.materialName = materialName;
    if (category) materialType.category = category;
    if (unit) materialType.unit = unit;
    if (description !== undefined) materialType.description = description;
    if (specifications !== undefined) materialType.specifications = specifications;
    if (isActive !== undefined) materialType.isActive = isActive;

    await materialType.save();

    res.status(200).json({
      success: true,
      message: "Material type updated successfully",
      data: materialType,
    });
  } catch (error) {
    console.error("Error updating material type:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update material type",
      error: error.message,
    });
  }
};

// Delete material type (soft delete)
exports.deleteMaterialType = async (req, res) => {
  try {
    const materialType = await MaterialType.findById(req.params.id);

    if (!materialType) {
      return res.status(404).json({
        success: false,
        message: "Material type not found",
      });
    }

    // Soft delete - just mark as inactive
    materialType.isActive = false;
    await materialType.save();

    res.status(200).json({
      success: true,
      message: "Material type deactivated successfully",
    });
  } catch (error) {
    console.error("Error deleting material type:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete material type",
      error: error.message,
    });
  }
};

// Permanent delete material type (hard delete)
exports.permanentDeleteMaterialType = async (req, res) => {
  try {
    const materialType = await MaterialType.findById(req.params.id);

    if (!materialType) {
      return res.status(404).json({
        success: false,
        message: "Material type not found",
      });
    }

    // Check if material is used in any indents
    const Indent = require("../construction/models/Indent");
    
    const usedInIndents = await Indent.countDocuments({ 
      materialId: req.params.id 
    });

    if (usedInIndents > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete: Material is used in ${usedInIndents} indent(s). Please deactivate instead.`,
      });
    }

    // Check if material is used in inventory
    const Inventory = require("../construction/models/Inventory");
    const usedInInventory = await Inventory.countDocuments({
      $or: [
        { materialType: materialType.materialName },
        { materialCode: materialType.materialCode }
      ]
    });

    if (usedInInventory > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete: Material is used in ${usedInInventory} inventory record(s). Please deactivate instead.`,
      });
    }

    // Permanently delete
    await materialType.deleteOne();

    res.status(200).json({
      success: true,
      message: "Material type permanently deleted",
    });
  } catch (error) {
    console.error("Error permanently deleting material type:", error);
    res.status(500).json({
      success: false,
      message: "Failed to permanently delete material type",
      error: error.message,
    });
  }
};

// Get material types by category
exports.getMaterialTypesByCategory = async (req, res) => {
  try {
    const categories = await MaterialType.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: "$category",
          materials: {
            $push: {
              _id: "$_id",
              materialCode: "$materialCode",
              materialName: "$materialName",
              unit: "$unit",
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Error fetching materials by category:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch materials by category",
      error: error.message,
    });
  }
};
