const express = require('express');
const router = express.Router();
const supplierController = require('../controller/resSupplierController');

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

// Excel Export/Import routes
router.get('/excel/export', supplierController.exportSuppliersToExcel);
router.get('/excel/template', supplierController.downloadExcelTemplate);
router.post('/excel/import', supplierController.upload.single('excelFile'), supplierController.importSuppliersFromExcel);

module.exports = router;