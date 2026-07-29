const express = require("express");
const router = express.Router();
const materialTypeController = require("../controller/materialTypeController");

// Material Type CRUD operations
router.post("/", materialTypeController.createMaterialType);
router.get("/", materialTypeController.getAllMaterialTypes);
router.get("/by-category", materialTypeController.getMaterialTypesByCategory);
router.get("/:id", materialTypeController.getMaterialTypeById);
router.put("/:id", materialTypeController.updateMaterialType);
router.delete("/:id", materialTypeController.deleteMaterialType);

module.exports = router;
