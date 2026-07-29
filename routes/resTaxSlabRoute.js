const express = require('express');
const router = express.Router();
const taxSlabController = require('../controller/resTaxSlabController'); // Assuming the controller file is named taxSlabController.js

// Create a new tax slab
router.post('/', taxSlabController.createTaxSlab);

// Get all tax slabs
router.get('/', taxSlabController.getAllTaxSlabs);

// Get a single tax slab by ID
router.get('/:id', taxSlabController.getTaxSlabById);

// Update a tax slab
router.put('/:id', taxSlabController.updateTaxSlab);

// Delete a tax slab
router.delete('/:id', taxSlabController.deleteTaxSlab);

module.exports = router;