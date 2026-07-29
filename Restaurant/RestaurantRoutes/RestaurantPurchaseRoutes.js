const express = require("express");
const router = express.Router();
const controller = require("../RestaurantController/RestaurantPurchaseController");

router.get("/", controller.getAll);
router.get("/pending", controller.getPendingPOs);
router.get("/stats", controller.getPOStats);
router.get("/:id", controller.getOne);
router.get("/:id/grns", controller.getPOGRNs);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.patch("/:id/status", controller.updateStatus);
router.patch("/:id/payment-status", controller.updatePaymentStatus);
router.delete("/:id", controller.remove);

module.exports = router;