const express = require("express");
const router = express.Router();
const vendorInvoiceController = require("../controller/vendorInvoiceController");

// GET all vendor invoices
router.get("/", vendorInvoiceController.getAllInvoices);

// POST create a new vendor invoice
router.post("/", vendorInvoiceController.createVendorInvoice);

// GET a single vendor invoice by ID
router.get("/:id", vendorInvoiceController.getInvoiceById);

// PUT update a vendor invoice
router.put("/:id", vendorInvoiceController.updateInvoice);

// DELETE a vendor invoice (soft delete)
router.delete("/:id", vendorInvoiceController.deleteInvoice);

// PUT restore deleted invoice
router.put("/:id/restore", vendorInvoiceController.restoreInvoice);

// PUT record payment
router.put("/:id/record-payment", vendorInvoiceController.recordPayment);

// PUT verify invoice
router.put("/:id/verify", vendorInvoiceController.verifyInvoice);

// GET pending payments
router.get("/pending/payments", vendorInvoiceController.getPendingPayments);

// GET overdue payments
router.get("/overdue/payments", vendorInvoiceController.getOverduePayments);

module.exports = router;





