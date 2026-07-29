const RecipeMaster = require("../RestautantModel/RestaurantRecipeMasterModel");
const DepartmentStock = require("../RestautantModel/DepartmentStockModel");
const UnitConversion = require("../../model/UnitConversionModel");

// Get all stock for a specific department
exports.getDepartmentStock = async (req, res) => {
  try {
    const { department, branch } = req.query;
    const filter = {};
    if (department) filter.department = department;
    if (branch) filter.branch = branch;

    const stocks = await DepartmentStock.find(filter).sort({ productName: 1 });
    res.json({ success: true, data: stocks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all department stocks (optionally filter by branch)
exports.getAllDepartmentStock = async (req, res) => {
  try {
    const { branch } = req.query;
    const filter = {};
    if (branch) filter.branch = branch;

    const stocks = await DepartmentStock.find(filter).sort({ department: 1, productName: 1 });
    res.json({ success: true, data: stocks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Deduct stock by recipe - Given order items, look up recipes and deduct from department stock
exports.deductByRecipe = async (req, res) => {
  try {
    const { items, department, branch, orderId, orderNumber } = req.body;
    // items: [{ menuItemId: "xxx", menuItemName: "Biryani", quantity: 2 }]

    if (!items || !department || !branch) {
      return res.status(400).json({ success: false, message: "items, department, and branch are required" });
    }

    const deductions = [];
    const shortages = [];

    for (const orderItem of items) {
      // Find recipe for this menu item
      const recipe = await RecipeMaster.findOne({ menuItemId: orderItem.menuItemId });
      if (!recipe) {
        console.log(`No recipe found for ${orderItem.menuItemName || orderItem.menuItemId}, skipping`);
        continue;
      }

      // For each ingredient in recipe, calculate needed qty
      for (const ingredient of recipe.ingredients) {
        const neededQty = ingredient.quantity * orderItem.quantity;

        // Find department stock entry
        const stock = await DepartmentStock.findOne({
          department,
          branch,
          rawMaterial: ingredient.rawMaterial,
        });

        if (!stock || stock.quantity < neededQty) {
          shortages.push({
            productName: ingredient.productName,
            needed: neededQty,
            available: stock ? stock.quantity : 0,
            unit: ingredient.unit,
            menuItem: orderItem.menuItemName || recipe.menuItemName,
          });
          continue;
        }

        // Deduct
        stock.quantity -= neededQty;
        await stock.save();

        deductions.push({
          productName: ingredient.productName,
          deducted: neededQty,
          remaining: stock.quantity,
          unit: ingredient.unit,
          menuItem: orderItem.menuItemName || recipe.menuItemName,
          orderQuantity: orderItem.quantity,
        });
      }
    }

    // Log the consumption
    const ConsumptionLog = require("../RestautantModel/ConsumptionLogModel");
    if (deductions.length > 0) {
      await ConsumptionLog.create({
        department,
        branch,
        orderId: orderId || null,
        orderNumber: orderNumber || null,
        items: deductions.map(d => ({
          productName: d.productName,
          quantity: d.deducted,
          unit: d.unit,
          menuItem: d.menuItem,
        })),
        deductedAt: new Date(),
      });
    }

    if (shortages.length > 0) {
      return res.status(200).json({
        success: true,
        message: "Partial deduction - some items had insufficient stock",
        data: { deductions, shortages },
      });
    }

    res.status(200).json({
      success: true,
      message: "Stock deducted successfully",
      data: { deductions },
    });
  } catch (err) {
    console.error("Error in deductByRecipe:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Add stock to a department (used internally when indent is issued)
exports.addStock = async (department, branch, rawMaterial, productName, quantity, unit) => {
  const stock = await DepartmentStock.findOneAndUpdate(
    { department, branch, rawMaterial },
    {
      $inc: { quantity: quantity },
      $set: { productName, unit, lastIssuedAt: new Date(), lastIssuedQuantity: quantity }
    },
    { upsert: true, new: true }
  );
  return stock;
};

// Get consumption logs
exports.getConsumptionLogs = async (req, res) => {
  try {
    const { department, branch, startDate, endDate } = req.query;
    const filter = {};
    if (department) filter.department = department;
    if (branch) filter.branch = branch;
    if (startDate || endDate) {
      filter.deductedAt = {};
      if (startDate) filter.deductedAt.$gte = new Date(startDate);
      if (endDate) filter.deductedAt.$lte = new Date(endDate);
    }
    const logs = await require("../RestautantModel/ConsumptionLogModel").find(filter).sort({ deductedAt: -1 });
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
