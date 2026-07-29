const RestaurantMenu = require('../model/restaurantMenuModel');
const fs = require('fs');
const path = require('path');

// Create a new restaurant/darshani menu item
exports.createRestaurantMenuItem = async (req, res) => {
  try {
    const { itemName, description, categoryId, branchId, categoryName, branchName, menuTypes, quantities, prices, sourceType } = req.body;
    const image = req.file ? `uploads/menu/${req.file.filename}` : null;

    // Parse arrays and objects if sent as strings (from FormData)
    const parsedMenuTypes = Array.isArray(menuTypes) ? menuTypes : JSON.parse(menuTypes || '[]');
    const parsedQuantities = Array.isArray(quantities) ? quantities : JSON.parse(quantities || '[]');
    const parsedPrices = typeof prices === 'string' ? JSON.parse(prices) : prices || {};

    // Validation
    if (!itemName) {
      return res.status(400).json({ message: 'Menu item name is required' });
    }
    if (!sourceType || !['restaurant', 'darshani'].includes(sourceType)) {
      return res.status(400).json({ message: 'Valid source type (restaurant/darshani) is required' });
    }
    if (!parsedMenuTypes || parsedMenuTypes.length === 0) {
      return res.status(400).json({ message: 'At least one menu type is required' });
    }
    if (!parsedQuantities || parsedQuantities.length === 0) {
      return res.status(400).json({ message: 'At least one quantity is required' });
    }
    for (const qty of parsedQuantities) {
      if (!parsedPrices[qty] || parsedPrices[qty] <= 0) {
        return res.status(400).json({ message: `Valid price required for ${qty}` });
      }
    }

    const menuItem = new RestaurantMenu({
      itemName,
      description,
      prices: parsedPrices,
      categoryId,
      branchId,
      categoryName,
      branchName,
      image,
      menuTypes: parsedMenuTypes,
      quantities: parsedQuantities,
      sourceType,
    });

    await menuItem.save();
    res.status(201).json({ 
      message: 'Restaurant/Darshani menu item created successfully', 
      menuItem 
    });
  } catch (error) {
    res.status(400).json({ 
      message: 'Error creating restaurant/darshani menu item', 
      error: error.message 
    });
  }
};

// Get all restaurant/darshani menu items
exports.getAllRestaurantMenuItems = async (req, res) => {
  try {
    const { branchId, categoryId, sourceType } = req.query;

    const filter = {};
    if (branchId) filter.branchId = branchId;
    if (categoryId) filter.categoryId = categoryId;
    if (sourceType) filter.sourceType = sourceType;

    const menuItems = await RestaurantMenu.find(filter).sort({ itemName: 1 });
    res.status(200).json(menuItems);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching restaurant/darshani menu items', 
      error: error.message 
    });
  }
};

// Get restaurant/darshani menu item by ID
exports.getRestaurantMenuItemById = async (req, res) => {
  try {
    const menuItem = await RestaurantMenu.findById(req.params.id);

    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }
    res.status(200).json(menuItem);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching menu item', 
      error: error.message 
    });
  }
};

// Update a restaurant/darshani menu item
exports.updateRestaurantMenuItem = async (req, res) => {
  try {
    const { itemName, description, categoryId, branchId, categoryName, branchName, menuTypes, quantities, prices, sourceType } = req.body;

    // Parse arrays and objects if sent as strings (from FormData)
    const parsedMenuTypes = Array.isArray(menuTypes) ? menuTypes : JSON.parse(menuTypes || '[]');
    const parsedQuantities = Array.isArray(quantities) ? quantities : JSON.parse(quantities || '[]');
    const parsedPrices = typeof prices === 'string' ? JSON.parse(prices) : prices || {};

    // Validation
    if (!parsedMenuTypes || parsedMenuTypes.length === 0) {
      return res.status(400).json({ message: 'At least one menu type is required' });
    }
    if (!parsedQuantities || parsedQuantities.length === 0) {
      return res.status(400).json({ message: 'At least one quantity is required' });
    }
    for (const qty of parsedQuantities) {
      if (!parsedPrices[qty] || parsedPrices[qty] <= 0) {
        return res.status(400).json({ message: `Valid price required for ${qty}` });
      }
    }

    const updateData = {
      itemName,
      description,
      prices: parsedPrices,
      categoryId,
      branchId,
      categoryName,
      branchName,
      menuTypes: parsedMenuTypes,
      quantities: parsedQuantities,
    };

    if (sourceType) {
      updateData.sourceType = sourceType;
    }

    // If a new image is uploaded, update the image path and delete the old image
    if (req.file) {
      updateData.image = `uploads/menu/${req.file.filename}`;
      const menuItem = await RestaurantMenu.findById(req.params.id);
      if (menuItem && menuItem.image) {
        fs.unlink(path.join(__dirname, '..', menuItem.image), (err) => {
          if (err) console.error('Error deleting old image:', err);
        });
      }
    }

    const menuItem = await RestaurantMenu.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true, runValidators: true }
    );

    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    res.status(200).json({ 
      message: 'Menu item updated successfully', 
      menuItem 
    });
  } catch (error) {
    res.status(400).json({ 
      message: 'Error updating menu item', 
      error: error.message 
    });
  }
};

// Delete a restaurant/darshani menu item
exports.deleteRestaurantMenuItem = async (req, res) => {
  try {
    const menuItem = await RestaurantMenu.findById(req.params.id);
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    // Delete the associated image file
    if (menuItem.image) {
      fs.unlink(path.join(__dirname, '..', menuItem.image), (err) => {
        if (err) console.error('Error deleting image:', err);
      });
    }

    await RestaurantMenu.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error deleting menu item', 
      error: error.message 
    });
  }
};