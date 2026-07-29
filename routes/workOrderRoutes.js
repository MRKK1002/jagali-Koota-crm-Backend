const express = require('express');
const router = express.Router();
const workOrderController = require('../controller/workOrderController');

router.get('/', workOrderController.getAllWorkOrders);
router.get('/stats', workOrderController.getWorkOrderStats);
router.get('/:id', workOrderController.getWorkOrderById);
router.post('/', workOrderController.createWorkOrder);
router.patch('/:id/status', workOrderController.updateWorkOrderStatus);
router.patch('/:id/bill', workOrderController.updateWorkOrderBilling);

module.exports = router;