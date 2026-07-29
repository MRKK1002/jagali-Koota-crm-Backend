const express = require('express');
const router = express.Router();
const invoiceController = require('../controller/counterInvoiceController');

// POST endpoint to create an invoice
router.post('/invoices', invoiceController.addInvoice);

module.exports = router;