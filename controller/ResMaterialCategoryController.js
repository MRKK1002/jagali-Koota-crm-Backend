const MaterialCategory = require('../model/ResRawCategory');

// Create a new Material Category
const createMaterialCategory = async (req, res) => {
  try {
    const { category } = req.body;

    if (!category) {
      return res.status(400).json({ message: "Category is required" });
    }

    const newCategory = new MaterialCategory({ category });
    const savedCategory = await newCategory.save();

    res.status(201).json({
      message: "Material Category created successfully",
      data: savedCategory
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Category already exists" });
    }
    res.status(500).json({ message: "Error creating category", error: error.message });
  }
};

// Get all Material Categories
const getAllMaterialCategories = async (req, res) => {
  try {
    const categories = await MaterialCategory.find();
    res.status(200).json({
      message: "Material Categories retrieved successfully",
      data: categories
    });
  } catch (error) {
    res.status(500).json({ message: "Error retrieving categories", error: error.message });
  }
};

// Get a Material Category by ID
const getMaterialCategoryById = async (req, res) => {
  try {
    const category = await MaterialCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    res.status(200).json({
      message: "Category retrieved successfully",
      data: category
    });
  } catch (error) {
    res.status(500).json({ message: "Error retrieving category", error: error.message });
  }
};

// Update a Material Category
const updateMaterialCategory = async (req, res) => {
  try {
    const { category } = req.body;

    const updatedCategory = await MaterialCategory.findByIdAndUpdate(
      req.params.id,
      { category },
      { new: true, runValidators: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json({
      message: "Category updated successfully",
      data: updatedCategory
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Category already exists" });
    }
    res.status(500).json({ message: "Error updating category", error: error.message });
  }
};

// Delete a Material Category
const deleteMaterialCategory = async (req, res) => {
  try {
    const category = await MaterialCategory.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting category", error: error.message });
  }
};

module.exports = {
  createMaterialCategory,
  getAllMaterialCategories,
  getMaterialCategoryById,
  updateMaterialCategory,
  deleteMaterialCategory
};
