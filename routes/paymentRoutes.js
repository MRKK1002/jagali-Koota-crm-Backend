const express = require("express");
const router = express.Router();
const paymentController = require("../controller/paymentController");

// CREATE
router.post("/", paymentController.createPayment);

// READ ALL
router.get("/", paymentController.getAllPayments);

// READ BY ID
router.get("/:id", paymentController.getPaymentById);

// UPDATE
router.put("/:id", paymentController.updatePayment);

// DELETE
router.delete("/:id", paymentController.deletePayment);

module.exports = router;
