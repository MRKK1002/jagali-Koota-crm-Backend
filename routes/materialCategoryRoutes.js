const express = require('express');
const router = express.Router();
const {
  createMaterialCategory,
  getAllMaterialCategories,
  getMaterialCategoryById,
  updateMaterialCategory,
  deleteMaterialCategory
} = require('../controller/ResMaterialCategoryController');

// Routes
router.post('/', createMaterialCategory);          // Create
router.get('/', getAllMaterialCategories);        // Get all
router.get('/:id', getMaterialCategoryById);      // Get one
router.put('/:id', updateMaterialCategory);       // Update
router.delete('/:id', deleteMaterialCategory);    // Delete

module.exports = router;
