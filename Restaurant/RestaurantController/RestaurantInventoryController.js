const Inventory = require("../../construction/models/Inventory");

const createInventory = async (req, res) => {
  try {
    const inventoryData = req.body;
    console.log('🔄 Creating manual inventory item:', inventoryData);

    if (!inventoryData.grnNumber || !inventoryData.grnId || !inventoryData.productName || 
        !inventoryData.supplier || !inventoryData.branch || !inventoryData.category || 
        inventoryData.quantity === undefined || inventoryData.basePrice === undefined || 
        inventoryData.totalValue === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields'
      });
    }

    const inventory = new Inventory(inventoryData);
    await inventory.save();
    console.log(`✅ Inventory saved successfully: ${inventory.inventoryId}`);

    res.status(201).json({
      status: 'success',
      message: 'Inventory item created successfully',
      data: inventory
    });
  } catch (error) {
    console.error('❌ Error creating inventory:', error);
    res.status(400).json({
      status: 'error',
      message: error.message,
      details: error.name === 'ValidationError' ? error.errors : undefined
    });
  }
};

const getAllInventory = async (req, res) => {
  try {
    const inventory = await Inventory.find().sort({ createdAt: -1 });
    res.status(200).json({
      status: 'success',
      count: inventory.length,
      data: inventory
    });
  } catch (error) {
    console.error('❌ Error fetching inventory:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

const getInventoryById = async (req, res) => {
  try {
    const inventory = await Inventory.findById(req.params.id);
    if (!inventory) {
      return res.status(404).json({
        status: 'error',
        message: 'Inventory item not found'
      });
    }
    res.status(200).json({
      status: 'success',
      data: inventory
    });
  } catch (error) {
    console.error('❌ Error fetching inventory:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

const updateInventory = async (req, res) => {
  try {
    const { quantity, availableQuantity, consumedQuantity, basePrice, totalValue, status } = req.body;
    const inventory = await Inventory.findByIdAndUpdate(
      req.params.id,
      { quantity, availableQuantity, consumedQuantity, basePrice, totalValue, status },
      { new: true, runValidators: true }
    );
    if (!inventory) {
      return res.status(404).json({
        status: 'error',
        message: 'Inventory item not found'
      });
    }
    console.log(`✏️ Inventory updated: ${inventory.inventoryId}`);
    res.status(200).json({
      status: 'success',
      message: 'Inventory updated successfully',
      data: inventory
    });
  } catch (error) {
    console.error('❌ Error updating inventory:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

const deleteInventory = async (req, res) => {
  try {
    const inventory = await Inventory.findById(req.params.id);
    if (!inventory) {
      return res.status(404).json({
        status: 'error',
        message: 'Inventory item not found'
      });
    }
    await Inventory.findByIdAndDelete(req.params.id);
    console.log(`🗑️ Successfully deleted inventory: ${inventory.inventoryId}`);
    res.status(200).json({
      status: 'success',
      message: 'Inventory item deleted successfully',
      deleted: inventory.inventoryId
    });
  } catch (error) {
    console.error('❌ Error deleting inventory:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

const getInventoryStats = async (req, res) => {
  try {
    const totalItems = await Inventory.countDocuments();
    const stats = await Inventory.aggregate([
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: '$quantity' },
          availableQuantity: { $sum: '$availableQuantity' },
          consumedQuantity: { $sum: '$consumedQuantity' },
          totalValue: { $sum: '$totalValue' }
        }
      }
    ]);
    res.status(200).json({
      status: 'success',
      data: {
        totalItems,
        totalQuantity: stats[0]?.totalQuantity || 0,
        availableQuantity: stats[0]?.availableQuantity || 0,
        consumedQuantity: stats[0]?.consumedQuantity || 0,
        totalValue: stats[0]?.totalValue || 0
      }
    });
  } catch (error) {
    console.error('❌ Error fetching inventory stats:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

module.exports = {
  createInventory,
  getAllInventory,
  getInventoryById,
  updateInventory,
  deleteInventory,
  getInventoryStats
};