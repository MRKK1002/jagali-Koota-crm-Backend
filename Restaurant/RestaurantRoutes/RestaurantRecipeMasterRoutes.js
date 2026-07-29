const express = require("express");
const router = express.Router();
const recipeMasterController = require("../RestaurantController/RestaurantRecipeMasterController");

router.post("/", recipeMasterController.createRecipe);
router.get("/", recipeMasterController.getAllRecipes);
router.get("/menu/:menuItemId", recipeMasterController.getRecipeByMenuItemId);
router.get("/:id", recipeMasterController.getRecipeById);
router.put("/:id", recipeMasterController.updateRecipe);
router.delete("/:id", recipeMasterController.deleteRecipe);

module.exports = router;
