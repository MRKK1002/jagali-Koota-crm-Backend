const express = require("express");
const router = express.Router();
const grnController = require("../controller/grnController");

// GET all GRNs
router.get("/", grnController.getAllGRNs);

// POST create GRN
router.post("/", grnController.createGRN);

// GET single GRN by _id
router.get("/:id", grnController.getGRNById);

// PUT update GRN
router.put("/:id", grnController.updateGRN);

// PUT update stock from GRN
router.put("/:id/update-stock", grnController.updateStockFromGRN);

// DELETE GRN by _id
router.delete("/:id", grnController.deleteGRN);

module.exports = router;
