const express = require('express');
const router = express.Router();
const invoiceController = require('../controller/invoiceController');

// CRUD routes
router.post('/', invoiceController.createInvoice); // CREATE
router.get('/', invoiceController.getAllInvoices); // READ all
router.get('/:id', invoiceController.getInvoiceById); // READ by ID
router.put('/:id', invoiceController.updateInvoice); // UPDATE
router.delete('/:id', invoiceController.deleteInvoice); // DELETE

module.exports = router;
