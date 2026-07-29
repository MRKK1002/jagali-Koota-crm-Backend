const express = require("express");
const router = express.Router();
const supplierController = require("../controller/supplierController");

// GET /construction/suppliers - Get all suppliers
router.get("/", supplierController.getAllSuppliers);

// POST /construction/suppliers - Create supplier
router.post("/", supplierController.createSupplier);

// PATCH /construction/suppliers/:id - Update supplier
router.patch("/:id", supplierController.updateSupplier);

// DELETE /construction/suppliers/:id - Delete supplier
router.delete("/:id", supplierController.deleteSupplier);

module.exports = router;
