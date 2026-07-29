const express = require('express');
const router = express.Router();
const {
  syncOrderToKDS,
  getKDSOrders,
  updateItemStatus,
  updateOrderStatus,
  holdOrder,
  cancelOrder,
  getDashboardStats
} = require('../controller/kitchenDisplayController');

// Sync order to KDS
router.post('/sync', syncOrderToKDS);

// Get all KDS orders
router.get('/orders', getKDSOrders);

// Get dashboard stats
router.get('/stats/:branchId', getDashboardStats);

// Update item status
router.put('/item-status', updateItemStatus);

// Update order status
router.put('/order-status', updateOrderStatus);

// Hold order
router.put('/hold', holdOrder);

// Cancel order
router.put('/cancel', cancelOrder);

module.exports = router;


