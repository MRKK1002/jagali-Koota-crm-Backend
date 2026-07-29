const Menu = require('../model/menuModel');
const Branch = require('../model/Branch');
const RestaurantProfile = require('../Restaurant/RestautantModel/RestaurantProfileModel');
const fs = require('fs');
const path = require('path');

// Create a new menu item
// In menuController.js - Update the createMenuItem function
exports.createMenuItem = async (req, res) => {
  try {
    const { itemName, description, categoryId, branchId, subcategoryId, menuTypes, quantities, prices } = req.body;
    const image = req.file ? `uploads/menu/${req.file.filename}` : null;

    // Parse arrays and objects if sent as strings (from FormData)
    const parsedMenuTypes = Array.isArray(menuTypes) ? menuTypes : JSON.parse(menuTypes || '[]');
    const parsedQuantities = Array.isArray(quantities) ? quantities : JSON.parse(quantities || '[]');
    const parsedPrices = typeof prices === 'string' ? JSON.parse(prices) : prices || {};

    // Validation
    if (!itemName) {
      return res.status(400).json({ message: 'Menu item name is required' });
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

    // Map Restaurant Profile ID to Branch ID
    // Check if branchId is a Restaurant Profile ID, and find/create corresponding Branch
    let actualBranchId = branchId;
    
    try {
      // First check if it's already a valid Branch ID
      const existingBranch = await Branch.findById(branchId);
      
      if (!existingBranch) {
        // If not found in Branch collection, it might be a Restaurant Profile ID
        const restaurantProfile = await RestaurantProfile.findById(branchId);
        
        if (restaurantProfile) {
          // Find or create a Branch that matches this Restaurant Profile
          const branchName = restaurantProfile.branchName || restaurantProfile.restaurantName;
          const branchAddress = restaurantProfile.address 
            ? `${restaurantProfile.address.street || ''}, ${restaurantProfile.address.city || ''}, ${restaurantProfile.address.state || ''}`.trim()
            : '';
          
          // Try to find existing Branch by name and address
          let branch = await Branch.findOne({ 
            name: branchName,
            address: branchAddress 
          });
          
          // If not found, create a new Branch entry
          if (!branch) {
            branch = new Branch({
              name: branchName,
              address: branchAddress,
              image: restaurantProfile.image || null
            });
            await branch.save();
            console.log('MenuManagements Backend: Created new Branch from Restaurant Profile:', {
              restaurantProfileId: branchId,
              branchId: branch._id,
              branchName: branch.name
            });
          }
          
          actualBranchId = branch._id;
          console.log('MenuManagements Backend: Mapped Restaurant Profile to Branch:', {
            restaurantProfileId: branchId,
            branchId: actualBranchId,
            branchName: branch.name
          });
        }
      } else {
        console.log('MenuManagements Backend: Using existing Branch ID:', branchId);
      }
    } catch (error) {
      console.error('MenuManagements Backend: Error mapping branch ID:', error);
      // Continue with original branchId if mapping fails
    }

    const menuItem = new Menu({
      itemName, // This matches your schema
      description,
      prices: parsedPrices, // This matches your schema (Map)
      categoryId,
      subcategoryId: subcategoryId || null,
      branchId: actualBranchId, // Use mapped Branch ID
      image,
      menuTypes: parsedMenuTypes,
      quantities: parsedQuantities,
    });

    await menuItem.save();
    
    // Log the saved menu item for debugging
    console.log('MenuManagements Backend: Created menu item:', {
      _id: menuItem._id,
      itemName: menuItem.itemName,
      branchId: menuItem.branchId,
      categoryId: menuItem.categoryId
    });
    
    const populatedItem = await Menu.findById(menuItem._id)
      .populate('categoryId', 'name')
      .populate('subcategoryId', 'name')
      .populate({
        path: 'branchId',
        select: 'name address',
        model: 'Branch'
      });
    
    console.log('MenuManagements Backend: Populated menu item:', {
      _id: populatedItem._id,
      itemName: populatedItem.itemName,
      branchId: populatedItem.branchId,
      branchId_id: populatedItem.branchId?._id,
      branchIdName: populatedItem.branchId?.name
    });
    
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
      .populate('subcategoryId', 'name')
      .populate({
        path: 'branchId',
        select: 'name address',
        model: 'Branch'
      })
      .sort({ itemName: 1 });

    // Log for debugging
    console.log('MenuManagements Backend: Fetched menu items:', menuItems.length);
    if (menuItems.length > 0) {
      console.log('MenuManagements Backend: Sample menu item:', {
        itemName: menuItems[0].itemName,
        branchId: menuItems[0].branchId,
        branchIdType: typeof menuItems[0].branchId,
        branchId_id: menuItems[0].branchId?._id,
        branchIdName: menuItems[0].branchId?.name
      });
    }

    res.status(200).json(menuItems);
  } catch (error) {
    console.error('MenuManagements Backend: Error fetching menu items:', error);
    res.status(500).json({ message: 'Error fetching menu items', error: error.message });
  }
};

// Get a single menu item by ID
exports.getMenuItemById = async (req, res) => {
  try {
    const menuItem = await Menu.findById(req.params.id)
      .populate('categoryId', 'name')
      .populate('subcategoryId', 'name')
      .populate('branchId', 'name');

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
    const { itemName, description, categoryId, branchId, subcategoryId, menuTypes, quantities, prices } = req.body;

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
      subcategoryId: subcategoryId || null,
      branchId,
      menuTypes: parsedMenuTypes,
      quantities: parsedQuantities,
    
    };

    // If a new image is uploaded, update the image path and delete the old image
    if (req.file) {
      updateData.image = `uploads/menu/${req.file.filename}`;
      const menuItem = await Menu.findById(req.params.id);
      if (menuItem && menuItem.image) {
        fs.unlink(path.join(__dirname, '..', menuItem.image), (err) => {
          if (err) console.error('Error deleting old image:', err);
        });
      }
    }

    // Remove undefined fields
    Object.keys(updateData).forEach((key) => updateData[key] === undefined && delete updateData[key]);

    const menuItem = await Menu.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('categoryId', 'name')
      .populate('subcategoryId', 'name')
      .populate('branchId', 'name');

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

    // Delete the associated image file
    if (menuItem.image) {
      fs.unlink(path.join(__dirname, '..', menuItem.image), (err) => {
        if (err) console.error('Error deleting image:', err);
      });
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
      .populate('subcategoryId', 'name')
      .populate('branchId', 'name')
      .sort({ itemName: 1 });

    res.status(200).json(menuItems);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching menu items', error: error.message });
  }
};
