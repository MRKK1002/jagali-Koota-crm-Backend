const express = require("express");
const router = express.Router();
const controller = require("../RestaurantController/RestaurantStockInwardController");

router.post("/", controller.createStockInwardRequest);
router.get("/", controller.getAllStockInwardRequests);
router.get("/:id", controller.getStockInwardRequestById);
router.patch("/:id/status", controller.updateStockInwardStatus);

module.exports = router;
