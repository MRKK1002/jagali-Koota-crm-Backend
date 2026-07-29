const RecipeMaster = require("../RestautantModel/RestaurantRecipeMasterModel");
const mongoose = require("mongoose");

// Create a new recipe
exports.createRecipe = async (req, res) => {
  try {
    console.log("Creating recipe master:", req.body);
    const { menuItemId, menuItemName, category, branch, ingredients, servingSize, notes } = req.body;

    if (!menuItemId || !menuItemName) {
      return res.status(400).json({ success: false, error: "menuItemId and menuItemName are required" });
    }

    if (!ingredients || ingredients.length === 0) {
      return res.status(400).json({ success: false, error: "At least one ingredient is required" });
    }

    // Check if recipe already exists for this menu item
    const existingRecipe = await RecipeMaster.findOne({ menuItemId });
    if (existingRecipe) {
      return res.status(400).json({ success: false, error: "A recipe already exists for this menu item" });
    }

    const recipe = new RecipeMaster({
      menuItemId,
      menuItemName,
      category: category || "",
      branch: branch || "",
      ingredients,
      servingSize: servingSize || 1,
      notes: notes || "",
    });

    await recipe.save();
    console.log("Recipe master created successfully:", recipe._id);

    res.status(201).json({
      success: true,
      data: recipe,
      message: "Recipe created successfully",
    });
  } catch (err) {
    console.error("Error creating recipe master:", err);
    if (err.code === 11000) {
      return res.status(400).json({ success: false, error: "A recipe already exists for this menu item" });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get all recipes
exports.getAllRecipes = async (req, res) => {
  try {
    console.log("Fetching all recipe masters");
    const recipes = await RecipeMaster.find()
      .populate("ingredients.rawMaterial", "name unit price distributionUnit")
      .sort({ createdAt: -1 });

    console.log("Found", recipes.length, "recipe masters");
    res.json({ success: true, data: recipes });
  } catch (err) {
    console.error("Error getting recipe masters:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get single recipe by ID
exports.getRecipeById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("Fetching recipe master by ID:", id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "Invalid recipe ID" });
    }

    const recipe = await RecipeMaster.findById(id)
      .populate("ingredients.rawMaterial", "name unit price distributionUnit");

    if (!recipe) {
      return res.status(404).json({ success: false, error: "Recipe not found" });
    }

    console.log("Found recipe master:", recipe.menuItemName);
    res.json({ success: true, data: recipe });
  } catch (err) {
    console.error("Error getting recipe master by ID:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get recipe by menu item ID
exports.getRecipeByMenuItemId = async (req, res) => {
  try {
    const { menuItemId } = req.params;
    console.log("Fetching recipe master by menuItemId:", menuItemId);

    const recipe = await RecipeMaster.findOne({ menuItemId })
      .populate("ingredients.rawMaterial", "name unit price distributionUnit");

    if (!recipe) {
      return res.status(404).json({ success: false, error: "Recipe not found for this menu item" });
    }

    console.log("Found recipe master for menu item:", recipe.menuItemName);
    res.json({ success: true, data: recipe });
  } catch (err) {
    console.error("Error getting recipe master by menuItemId:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update a recipe
exports.updateRecipe = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("Updating recipe master:", id, req.body);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "Invalid recipe ID" });
    }

    const recipe = await RecipeMaster.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    }).populate("ingredients.rawMaterial", "name unit price distributionUnit");

    if (!recipe) {
      return res.status(404).json({ success: false, error: "Recipe not found" });
    }

    console.log("Recipe master updated successfully:", recipe._id);
    res.json({
      success: true,
      data: recipe,
      message: "Recipe updated successfully",
    });
  } catch (err) {
    console.error("Error updating recipe master:", err);
    if (err.code === 11000) {
      return res.status(400).json({ success: false, error: "A recipe already exists for this menu item" });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};

// Delete a recipe
exports.deleteRecipe = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("Deleting recipe master:", id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "Invalid recipe ID" });
    }

    const recipe = await RecipeMaster.findByIdAndDelete(id);
    if (!recipe) {
      return res.status(404).json({ success: false, error: "Recipe not found" });
    }

    console.log("Recipe master deleted successfully:", id);
    res.json({ success: true, message: "Recipe deleted successfully" });
  } catch (err) {
    console.error("Error deleting recipe master:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};
