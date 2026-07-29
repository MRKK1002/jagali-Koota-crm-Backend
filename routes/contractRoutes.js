const express = require("express");
const router = express.Router();
const controller = require("../controller/contractController");

router.post("/", controller.createContract);         // Create
router.get("/", controller.getContracts);            // Get all
router.get("/:id", controller.getContractById);      // Get one
router.put("/:id", controller.updateContract);       // Update
router.delete("/:id", controller.deleteContract);    // Delete

module.exports = router;
