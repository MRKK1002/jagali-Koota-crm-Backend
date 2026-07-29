const express = require('express');
const router = express.Router();
const distributionController = require('../RestaurantController/InventoryDistributionController');

// Create new distribution
router.post('/', distributionController.createDistribution);

// Get all distributions
router.get('/', distributionController.getAllDistributions);

// Get distributions by product
router.get('/product/:productName', distributionController.getDistributionsByProduct);

// Delete distribution
router.delete('/:id', distributionController.deleteDistribution);

module.exports = router;
