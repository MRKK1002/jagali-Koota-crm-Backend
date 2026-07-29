const express = require('express');
const router = express.Router();
const invoiceController = require('../controller/procurementInvoiceController');

// Get all invoices (with query filters)
router.get('/', invoiceController.getAllInvoices);

// Get invoice statistics
router.get('/stats', invoiceController.getInvoiceStats);

// Get a single invoice by ID
router.get('/:id', invoiceController.getInvoiceById);

// Create a new invoice
router.post('/', invoiceController.createInvoice);

// Update an invoice
router.put('/:id', invoiceController.updateInvoice);

// Mark invoice as paid
router.patch('/:id/paid', invoiceController.markAsPaid);

// Delete an invoice
router.delete('/:id', invoiceController.deleteInvoice);

module.exports = router;
