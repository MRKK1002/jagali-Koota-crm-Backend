const Recipe = require('../models/Recipe');
const RawMaterial = require('../models/RawMaterial');
const Product = require('../models/Product');
const Branch = require('../models/Branch');

// Get recipe for a specific product and branch
exports.getRecipeByProduct = async (req, res) => {
  try {
    const { productId, branchId } = req.params;
    
    // Validate product and branch existence
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    const branch = await Branch.findById(branchId);
    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    const recipe = await Recipe.findOne({ productId, branchId });
    
    if (!recipe) {
      return res.status(200).json([]); // Return empty array if no recipe exists
    }

    // Format response to match frontend expectations
    const formattedIngredients = recipe.ingredients.map(ing => ({
      rawId: ing.rawId,
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit
    }));

    res.status(200).json(formattedIngredients);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching recipe', error: error.message });
  }
};

// Create or update recipe for a product and branch
exports.updateRecipe = async (req, res) => {
  try {
    const { productId, branchId } = req.params;
    const { ingredients } = req.body; // Array of { rawId, name, quantity, unit }

    // Validate product and branch
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    const branch = await Branch.findById(branchId);
    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    // Validate ingredients
    for (const ing of ingredients) {
      if (!ing.rawId || !ing.name || !ing.quantity || !ing.unit) {
        return res.status(400).json({ message: 'Invalid ingredient data' });
      }
      const rawMaterial = await RawMaterial.findById(ing.rawId);
      if (!rawMaterial) {
        return res.status(404).json({ message: `Raw material ${ing.rawId} not found` });
      }
      if (ing.name !== rawMaterial.name) {
        return res.status(400).json({ message: `Ingredient name ${ing.name} does not match raw material name ${rawMaterial.name}` });
      }
      if (ing.quantity <= 0) {
        return res.status(400).json({ message: 'Ingredient quantity must be greater than 0' });
      }
      if (!['KG', 'Lt', 'pieces'].includes(ing.unit)) {
        return res.status(400).json({ message: `Invalid unit ${ing.unit}` });
      }
    }

    // Find or create recipe
    let recipe = await Recipe.findOne({ productId, branchId });
    if (recipe) {
      recipe.ingredients = ingredients;
    } else {
      recipe = new Recipe({ productId, branchId, ingredients });
    }

    await recipe.save();

    // Format response
    const formatted = recipe.ingredients.map(ing => ({
      rawId: ing.rawId,
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit
    }));

    res.status(200).json(formatted);
  } catch (error) {
    res.status(500).json({ message: 'Error updating recipe', error: error.message });
  }
};

// Delete a specific ingredient from a recipe
exports.removeIngredient = async (req, res) => {
  try {
    const { productId, branchId, ingredientIndex } = req.params;

    const recipe = await Recipe.findOne({ productId, branchId });
    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    if (ingredientIndex < 0 || ingredientIndex >= recipe.ingredients.length) {
      return res.status(400).json({ message: 'Invalid ingredient index' });
    }

    recipe.ingredients.splice(ingredientIndex, 1);
    await recipe.save();

    const formatted = recipe.ingredients.map(ing => ({
      rawId: ing.rawId,
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit
    }));

    res.status(200).json(formatted);
  } catch (error) {
    res.status(500).json({ message: 'Error removing ingredient', error: error.message });
  }
};