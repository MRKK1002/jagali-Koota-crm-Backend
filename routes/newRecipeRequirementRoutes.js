// routes/newRecipeRequirementRoutes.js
const express = require("express");
const router = express.Router();
const {
  createRecipeRequirement,
  getAllRecipeRequirements,
  getRecipeRequirementById,
  updateRecipeRequirement,
  deleteRecipeRequirement,
} = require("../controller/newRecipeRequirementController");

// CRUD routes
router.post("/", createRecipeRequirement);
router.get("/", getAllRecipeRequirements);
router.get("/:id", getRecipeRequirementById);
router.put("/:id", updateRecipeRequirement);
router.delete("/:id", deleteRecipeRequirement);

module.exports = router;
