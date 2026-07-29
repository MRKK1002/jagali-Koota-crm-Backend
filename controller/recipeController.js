

const Recipe = require("../model/recipe")
const RawMaterial = require("../model/rawMaterialModel")
const { LocationInventory } = require("../model/inventoryModel.js")
const { default: mongoose } = require("mongoose")

// Helper to validate rawMaterialIds
const validateRawMaterials = async (ingredients) => {
  for (const ingredient of ingredients) {
    const exists = await RawMaterial.exists({ _id: ingredient.rawMaterialId })
    if (!exists) {
      throw new Error(`Invalid rawMaterialId: ${ingredient.rawMaterialId}`)
    }
  }
}

// Get all recipes with optional search/category filters
exports.getAllRecipes = async (req, res) => {
  try {
    const { search, category } = req.query
    const filter = {}

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ]
    }

    if (category && category !== "all") {
      filter.category = category
    }

    const recipes = await Recipe.find(filter).sort({ name: 1 })
    res.json({ success: true, data: recipes })
  } catch (err) {
    console.error("Error getting recipes:", err)
    res.status(500).json({ success: false, error: err.message })
  }
}

// Get single recipe by ID
exports.getRecipeById = async (req, res) => {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "Invalid recipe ID" })
    }

    const recipe = await Recipe.findById(id).populate(
      "ingredients.rawMaterialId",
      "name unit price minLevel"
    )

    if (!recipe) {
      return res.status(404).json({ success: false, error: "Recipe not found" })
    }

    res.json({ success: true, data: recipe })
  } catch (err) {
    console.error("Error getting recipe:", err)
    res.status(500).json({ success: false, error: err.message })
  }
}

// Create a recipe with raw material validation
exports.createRecipe = async (req, res) => {
  try {
    const { ingredients } = req.body
    await validateRawMaterials(ingredients)

    const recipe = new Recipe(req.body)
    await recipe.save()

    res.status(201).json({
      success: true,
      data: recipe,
      message: "Recipe created successfully",
    })
  } catch (err) {
    console.error("Error creating recipe:", err)
    res.status(400).json({ success: false, error: err.message })
  }
}

// Update a recipe with raw material validation
exports.updateRecipe = async (req, res) => {
  try {
    const { id } = req.params
    const { ingredients } = req.body

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "Invalid recipe ID" })
    }

    if (ingredients) {
      await validateRawMaterials(ingredients)
    }

    const recipe = await Recipe.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    })

    if (!recipe) {
      return res.status(404).json({ success: false, error: "Recipe not found" })
    }

    res.json({
      success: true,
      data: recipe,
      message: "Recipe updated successfully",
    })
  } catch (err) {
    console.error("Error updating recipe:", err)
    res.status(400).json({ success: false, error: err.message })
  }
}

// Delete a recipe
exports.deleteRecipe = async (req, res) => {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "Invalid recipe ID" })
    }

    const recipe = await Recipe.findByIdAndDelete(id)
    if (!recipe) {
      return res.status(404).json({ success: false, error: "Recipe not found" })
    }

    res.json({ success: true, message: "Recipe deleted successfully" })
  } catch (err) {
    console.error("Error deleting recipe:", err)
    res.status(500).json({ success: false, error: err.message })
  }
}

// Get inventory status for a recipe at a location
exports.getRecipeWithInventoryStatus = async (req, res) => {
  try {
    const { recipeId, locationId } = req.params

    if (!mongoose.Types.ObjectId.isValid(recipeId) || !mongoose.Types.ObjectId.isValid(locationId)) {
      return res.status(400).json({ success: false, error: "Invalid recipeId or locationId" })
    }

    const recipe = await Recipe.findById(recipeId).populate(
      "ingredients.rawMaterialId",
      "name unit price minLevel"
    )

    if (!recipe) {
      return res.status(404).json({ success: false, error: "Recipe not found" })
    }

    const inventoryStatus = await Promise.all(
      recipe.ingredients.map(async (ingredient) => {
        const rawMaterial = ingredient.rawMaterialId
        const rawMaterialId =
          typeof rawMaterial === "object" ? rawMaterial._id : rawMaterial

        const inventory = await LocationInventory.findOne({
          locationId,
          rawMaterialId,
        })

        return {
          rawMaterialId,
          name: rawMaterial.name,
          requiredQuantity: ingredient.quantity,
          unit: ingredient.unit || rawMaterial.unit,
          inStock: inventory ? inventory.quantity : 0,
          minLevel: rawMaterial.minLevel || 0,
        }
      })
    )

    res.json({
      success: true,
      data: {
        recipe,
        inventoryStatus,
      },
    })
  } catch (err) {
    console.error("Error getting recipe inventory status:", err)
    res.status(500).json({ success: false, error: err.message })
  }
}

// Get unique recipe categories
exports.getRecipeCategories = async (req, res) => {
  try {
    const categories = await Recipe.distinct("category")
    res.json({ success: true, data: categories })
  } catch (err) {
    console.error("Error getting recipe categories:", err)
    res.status(500).json({ success: false, error: err.message })
  }
}
