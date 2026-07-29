const express = require('express');
const router = express.Router();

try {
  const supplierController = require('../RestaurantController/RestaurantResSupplierController');
  
  console.log('Supplier Controller loaded:', {
    createSupplier: typeof supplierController.createSupplier,
    getAllSuppliers: typeof supplierController.getAllSuppliers,
  });

  // Test route to verify router is working
  router.get('/test', (req, res) => {
    res.json({ message: 'Supplier route is working!', timestamp: new Date() });
  });

  // Create a new supplier
  router.post('/add', supplierController.createSupplier);

  // Get all suppliers
  router.get('/', supplierController.getAllSuppliers);

  // Get a single supplier by ID
  router.get('/:id', supplierController.getSupplierById);

  // Update a supplier
  router.put('/:id', supplierController.updateSupplier);

  // Delete a supplier
  router.delete('/:id', supplierController.deleteSupplier);

  console.log('✓ Supplier routes registered successfully');
} catch (error) {
  console.error('❌ Error loading supplier controller:', error);
  // Add a catch-all route to help debug
  router.post('/add', (req, res) => {
    console.error('Supplier controller not loaded properly');
    res.status(500).json({ 
      error: 'Supplier controller not loaded',
      message: error.message 
    });
  });
}

module.exports = router;