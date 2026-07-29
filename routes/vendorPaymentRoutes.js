const express = require("express");
const router = express.Router();

// Vendor Payment Controller (we'll create this)
const vendorPaymentController = require("../controller/vendorPaymentController");

// GET all vendor payments
router.get("/", vendorPaymentController.getAllPayments);

// POST create/schedule a new payment
router.post("/", vendorPaymentController.schedulePayment);

// GET a single payment by ID
router.get("/:id", vendorPaymentController.getPaymentById);

// PUT update payment
router.put("/:id", vendorPaymentController.updatePayment);

// PUT mark payment as completed
router.put("/:id/complete", vendorPaymentController.completePayment);

// DELETE a payment
router.delete("/:id", vendorPaymentController.deletePayment);

// GET payments by status
router.get("/status/:status", vendorPaymentController.getPaymentsByStatus);

module.exports = router;
