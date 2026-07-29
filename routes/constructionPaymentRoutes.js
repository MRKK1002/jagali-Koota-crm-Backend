const express = require("express");
const router = express.Router();
const constructionPaymentController = require("../controller/constructionPaymentController");


router.post("/", constructionPaymentController.createPayment);
router.get("/", constructionPaymentController.getPayments);
router.get("/payments/recent", constructionPaymentController.getRecentPayments);
router.get("/:id", constructionPaymentController.getPaymentById);
router.put("/:id", constructionPaymentController.updatePayment);
router.delete("/:id", constructionPaymentController.deletePayment);

module.exports = router;
