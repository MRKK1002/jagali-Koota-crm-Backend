const Material = require('../model/ResRawMaterial');
const MaterialCategory = require('../model/ResRawCategory');


// Create Material (accepts either category id or categoryName, both optional)
const createMaterial = async (req, res) => {
  try {
    const { name, category, unit, categoryName } = req.body;

    if (!name || !unit) {
      return res.status(400).json({ success: false, message: "name and unit are required" });
    }

    let categoryIdToUse = category;
    if (!categoryIdToUse && categoryName) {
      // Find or create a MaterialCategory by provided name
      let cat = await MaterialCategory.findOne({ category: categoryName.trim() });
      if (!cat) {
        cat = await MaterialCategory.create({ category: categoryName.trim() });
      }
      categoryIdToUse = cat._id;
    }

    const newMaterial = new Material({ 
      name: name.trim(), 
      category: categoryIdToUse || null, 
      unit 
    });
    await newMaterial.save();

    const populatedMaterial = await Material.findById(newMaterial._id).populate("category", "category");

    res.status(201).json({
      success: true,
      message: "Material created successfully",
      data: populatedMaterial,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: "Error creating material", error: error.message });
  }
};


// Get all Materials
const getAllMaterials = async (req, res) => {
  try {
    const materials = await Material.find().populate("category", "category");
    res.status(200).json({
      message: "Materials retrieved successfully",
      data: materials
    });
  } catch (error) {
    res.status(500).json({ message: "Error retrieving materials", error: error.message });
  }
};

// Get Material by ID
const getMaterialById = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id).populate("category", "category");
    if (!material) {
      return res.status(404).json({ message: "Material not found" });
    }
    res.status(200).json({
      message: "Material retrieved successfully",
      data: material
    });
  } catch (error) {
    res.status(500).json({ message: "Error retrieving material", error: error.message });
  }
};


// Update Material (accepts either category id or categoryName, both optional)
const updateMaterial = async (req, res) => {
  try {
    const { name, category, unit, categoryName } = req.body;

    let categoryIdToUse = category;
    if (!categoryIdToUse && categoryName) {
      let cat = await MaterialCategory.findOne({ category: categoryName.trim() });
      if (!cat) {
        cat = await MaterialCategory.create({ category: categoryName.trim() });
      }
      categoryIdToUse = cat._id;
    }

    // Build update object - only include category if provided
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (unit !== undefined) updateData.unit = unit;
    if (category !== undefined || categoryName !== undefined) {
      updateData.category = categoryIdToUse || null;
    }

    const updatedMaterial = await Material.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate("category", "category");

    if (!updatedMaterial) {
      return res.status(404).json({ success: false, message: "Material not found" });
    }

    res.status(200).json({ success: true, message: "Material updated successfully", data: updatedMaterial });
  } catch (error) {
    res.status(400).json({ success: false, message: "Error updating material", error: error.message });
  }
};


// Delete Material
const deleteMaterial = async (req, res) => {
  try {
    const material = await Material.findByIdAndDelete(req.params.id);
    if (!material) {
      return res.status(404).json({ message: "Material not found" });
    }
    res.status(200).json({ message: "Material deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting material", error: error.message });
  }
};

module.exports = {
  createMaterial,
  getAllMaterials,
  getMaterialById,
  updateMaterial,
  deleteMaterial
};
