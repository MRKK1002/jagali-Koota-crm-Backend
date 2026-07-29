const express = require('express');
const router = express.Router();
const recipeController = require('../controllers/recipeController');

// Get recipe for a product and branch
router.get('/:productId/:branchId', recipeController.getRecipeByProduct);

// Create or update recipe
router.put('/:productId/:branchId', recipeController.updateRecipe);

// Remove specific ingredient from recipe
router.delete('/:productId/:branchId/ingredient/:ingredientIndex', recipeController.removeIngredient);

module.exports = router;