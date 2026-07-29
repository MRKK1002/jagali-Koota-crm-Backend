const express = require('express');
const router = express.Router();
const controller = require('../controller/unitConversionController');

// Get all conversions
router.get('/', controller.getAllConversions);

// Get conversion factor between two units
router.get('/convert', controller.getConversionFactor);

// Seed default conversions
router.post('/seed', controller.seedDefaults);

// Create a new conversion
router.post('/', controller.createConversion);

// Update a conversion
router.put('/:id', controller.updateConversion);

// Delete a conversion
router.delete('/:id', controller.deleteConversion);

module.exports = router;
