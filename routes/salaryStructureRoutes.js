const express = require("express");
const router = express.Router();
const salaryController = require("../controller/salaryStructureController");

// POST /salary-structures
router.post("/", salaryController.createSalaryStructure);

// GET /salary-structures
router.get("/", salaryController.getAllSalaryStructures);

// GET /salary-structures/:id
router.get("/:id", salaryController.getSalaryStructureById);

// DELETE /salary-structures/:id
router.delete("/:id", salaryController.deleteSalaryStructure);

module.exports = router;
