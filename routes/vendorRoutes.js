const express = require('express');
const router = express.Router();
const vendorController = require('../controller/vendorController');

// Create vendor
router.post('/', vendorController.createVendor);

// Get all vendors
router.get('/', vendorController.getAllVendors);

// Get a single vendor
router.get('/:id', vendorController.getVendorById);

// Update vendor
router.put('/:id', vendorController.updateVendor);

// Delete vendor
router.delete('/:id', vendorController.deleteVendor);

module.exports = router;
