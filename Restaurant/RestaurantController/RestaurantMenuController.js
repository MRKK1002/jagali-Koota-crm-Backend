const Menu = require('../model/menuModel');
const Recipe = require('../RestautantModel/RestaurantRecipeModel');

// Create a new menu item
exports.createMenuItem = async (req, res) => {
  try {
    const { itemName, categoryId, branchId, quantities, prices, recipeId } = req.body;

    // Parse arrays and objects if sent as strings (from FormData)
    const parsedQuantities = Array.isArray(quantities) ? quantities : JSON.parse(quantities || '[]');
    const parsedPrices = typeof prices === 'string' ? JSON.parse(prices) : prices || {};

    // Validation
    if (!itemName) {
      return res.status(400).json({ message: 'Menu item name is required' });
    }
    if (!parsedQuantities || parsedQuantities.length === 0) {
      return res.status(400).json({ message: 'At least one quantity variant is required' });
    }
    for (const qty of parsedQuantities) {
      if (!parsedPrices[qty] || parsedPrices[qty] <= 0) {
        return res.status(400).json({ message: `Valid price required for ${qty}` });
      }
    }

    // Validate recipe if provided
    if (recipeId) {
      const recipe = await Recipe.findById(recipeId);
      if (!recipe) {
        return res.status(400).json({ message: 'Recipe not found' });
      }
    }

    const menuItem = new Menu({
      itemName,
      prices: parsedPrices,
      categoryId,
      branchId,
      quantities: parsedQuantities,
      recipeId: recipeId || null,
    });

    await menuItem.save();
    const populatedItem = await Menu.findById(menuItem._id)
      .populate('categoryId', 'name')
      .populate('branchId', 'name')
      .populate('recipeId', 'name');
    res.status(201).json({ message: 'Menu item created successfully', menuItem: populatedItem });
  } catch (error) {
    res.status(400).json({ message: 'Error creating menu item', error: error.message });
  }
};

// Get all menu items
exports.getAllMenuItems = async (req, res) => {
  try {
    const { categoryId, branchId } = req.query;

    // Build filter based on query parameters
    const filter = {};
    if (categoryId) filter.categoryId = categoryId;
    if (branchId) filter.branchId = branchId;

    const menuItems = await Menu.find(filter)
      .populate('categoryId', 'name')
      .populate('branchId', 'name')
      .populate('recipeId', 'name')
      .sort({ itemName: 1 });

    res.status(200).json(menuItems);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching menu items', error: error.message });
  }
};

// Get a single menu item by ID
exports.getMenuItemById = async (req, res) => {
  try {
    const menuItem = await Menu.findById(req.params.id)
      .populate('categoryId', 'name')
      .populate('branchId', 'name')
      .populate('recipeId', 'name');

    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }
    res.status(200).json(menuItem);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching menu item', error: error.message });
  }
};

// Update a menu item
exports.updateMenuItem = async (req, res) => {
  try {
    const { itemName, categoryId, branchId, quantities, prices, recipeId } = req.body;

    // Parse arrays and objects if sent as strings (from FormData)
    const parsedQuantities = Array.isArray(quantities) ? quantities : JSON.parse(quantities || '[]');
    const parsedPrices = typeof prices === 'string' ? JSON.parse(prices) : prices || {};

    // Validation
    if (!parsedQuantities || parsedQuantities.length === 0) {
      return res.status(400).json({ message: 'At least one quantity variant is required' });
    }
    for (const qty of parsedQuantities) {
      if (!parsedPrices[qty] || parsedPrices[qty] <= 0) {
        return res.status(400).json({ message: `Valid price required for ${qty}` });
      }
    }

    // Validate recipe if provided
    if (recipeId) {
      const recipe = await Recipe.findById(recipeId);
      if (!recipe) {
        return res.status(400).json({ message: 'Recipe not found' });
      }
    }

    const updateData = {
      itemName,
      prices: parsedPrices,
      categoryId,
      branchId,
      quantities: parsedQuantities,
      recipeId: recipeId || null,
    };

    // Remove undefined fields
    Object.keys(updateData).forEach((key) => updateData[key] === undefined && delete updateData[key]);

    const menuItem = await Menu.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('categoryId', 'name')
      .populate('branchId', 'name')
      .populate('recipeId', 'name');

    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    res.status(200).json({ message: 'Menu item updated successfully', menuItem });
  } catch (error) {
    res.status(400).json({ message: 'Error updating menu item', error: error.message });
  }
};

// Delete a menu item
exports.deleteMenuItem = async (req, res) => {
  try {
    const menuItem = await Menu.findById(req.params.id);
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    await Menu.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting menu item', error: error.message });
  }
};

// Get menu items by category
exports.getMenuItemsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const menuItems = await Menu.find({ categoryId })
      .populate('categoryId', 'name')
      .populate('branchId', 'name')
      .populate('recipeId', 'name')
      .sort({ itemName: 1 });

    res.status(200).json(menuItems);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching menu items', error: error.message });
  }
};
