const express = require('express');
const router = express.Router();
const purchaseController = require('../controller/poController');

// Vendor Routes
router.get('/vendor', purchaseController.getVendors);
router.post('/vendor', purchaseController.createVendor);
router.put('/vendor/:id', purchaseController.updateVendor);
router.delete('/vendor/:id', purchaseController.deleteVendor);

// Purchase Order Routes
router.get('/purchase-order', purchaseController.getPurchaseOrders);
router.post('/purchase-order', purchaseController.createPurchaseOrder);
router.put('/purchase-order/:id', purchaseController.updatePurchaseOrder);
router.delete('/purchase-order/:id', purchaseController.deletePurchaseOrder);

module.exports = router;
