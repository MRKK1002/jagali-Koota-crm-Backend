const express = require('express');
const router = express.Router();

const {
  createPayment,
  getPayments,
  getPaymentById,
  getPaymentsByInvoice,
  getPaymentsByPO,
  updatePayment,
  deletePayment,
  getPaymentStats
} = require('../RestaurantController/RestaurantPaymentController');

// Payment routes
router.post('/create', createPayment);
router.get('/', getPayments);
router.get('/stats', getPaymentStats);
router.get('/:id', getPaymentById);
router.get('/invoice/:invoiceId', getPaymentsByInvoice);
router.get('/po/:poId', getPaymentsByPO);
router.put('/:id', updatePayment);
router.delete('/:id', deletePayment);

module.exports = router;
