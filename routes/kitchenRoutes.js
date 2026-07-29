// routes/kitchenRoutes.js
const express = require('express');
const router = express.Router();
const kitchenOrderController = require('../controller/KitchenOrderController');
const kitchenNotificationController = require('../controller/KitchenNotificationController');

// Kitchen order routes
router.post('/orders', kitchenOrderController.createKitchenOrder);
router.get('/orders', kitchenOrderController.getKitchenOrders);
router.patch('/orders/items', kitchenOrderController.updateItemStatus);
router.patch('/orders/:orderId/complete', kitchenOrderController.completeOrder);
router.get('/stats', kitchenOrderController.getKitchenStats);

// Notification routes (kitchen-specific)
router.post('/notifications', kitchenNotificationController.createNotification);
router.get('/notifications', kitchenNotificationController.getNotifications);
router.patch('/notifications/:id/read', kitchenNotificationController.markAsRead);
router.patch('/notifications/read-all', kitchenNotificationController.markAllAsRead);
router.delete('/notifications/:id', kitchenNotificationController.deleteNotification);

module.exports = router;