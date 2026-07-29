const express = require('express');
const router = express.Router();
const {
  createMaterial,
  getAllMaterials,
  getMaterialById,
  updateMaterial,
  deleteMaterial
} = require('../controller/ResRasMaterialController');

// Routes
router.post('/', createMaterial);          // Create
router.get('/', getAllMaterials);         // Get all
router.get('/:id', getMaterialById);      // Get one
router.put('/:id', updateMaterial);       // Update
router.delete('/:id', deleteMaterial);    // Delete

module.exports = router;
