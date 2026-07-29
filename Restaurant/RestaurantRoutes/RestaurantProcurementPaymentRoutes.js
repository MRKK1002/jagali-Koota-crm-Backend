const express = require('express');
const router = express.Router();
const paymentController = require('../controller/procurementPaymentController');

// Get all payments (with query filters)
router.get('/', paymentController.getAllPayments);

// Get payment statistics
router.get('/stats', paymentController.getPaymentStats);

// Get a single payment by ID
router.get('/:id', paymentController.getPaymentById);

// Create a new payment
router.post('/', paymentController.createPayment);

// Update a payment
router.put('/:id', paymentController.updatePayment);

// Approve a payment
router.patch('/:id/approve', paymentController.approvePayment);

// Schedule a payment
router.patch('/:id/schedule', paymentController.schedulePayment);

// Delete a payment
router.delete('/:id', paymentController.deletePayment);

module.exports = router;
