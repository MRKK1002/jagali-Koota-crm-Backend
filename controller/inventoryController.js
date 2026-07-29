const Inventory = require("../construction/models/Inventory");
const StockTransaction = require("../model/StockTransaction");

// Generate material code
const generateMaterialCode = async (category) => {
  const prefix = category.substring(0, 3).toUpperCase();
  const count = await Inventory.countDocuments({ category });
  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
};

// Add new material to inventory
exports.addMaterial = async (req, res) => {
  try {
    const {
      materialName,
      category,
      unit,
      reorderLevel,
      warehouse,
      initialStock,
      averageRate,
    } = req.body;

    // Validation
    if (!materialName || !category || !unit) {
      return res.status(400).json({
        success: false,
        message: "Please provide materialName, category, and unit",
      });
    }

    // Check if material already exists
    const existingMaterial = await Inventory.findOne({
      materialName: { $regex: new RegExp(`^${materialName}$`, "i") },
    });

    if (existingMaterial) {
      return res.status(400).json({
        success: false,
        message: "Material already exists in inventory",
      });
    }

    // Generate material code
    const materialCode = await generateMaterialCode(category);

    // Create inventory item
    const material = new Inventory({
      materialName,
      materialCode,
      category,
      unit,
      currentStock: initialStock || 0,
      reorderLevel: reorderLevel || 10,
      warehouse: warehouse || "Central Warehouse",
      averageRate: averageRate || 0,
      totalValue: (initialStock || 0) * (averageRate || 0),
    });

    await material.save();

    res.status(201).json({
      success: true,
      message: "Material added to inventory successfully",
      data: material,
    });
  } catch (error) {
    console.error("Error adding material:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add material",
      error: error.message,
    });
  }
};

// Get all materials
exports.getAllMaterials = async (req, res) => {
  try {
    const { category, lowStock, search } = req.query;

    let query = {};

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { materialName: { $regex: search, $options: "i" } },
        { materialCode: { $regex: search, $options: "i" } },
      ];
    }

    const materials = await Inventory.find(query).sort({ materialName: 1 });

    // Filter low stock if requested
    let filteredMaterials = materials;
    if (lowStock === "true") {
      filteredMaterials = materials.filter((m) => m.isLowStock());
    }

    res.status(200).json({
      success: true,
      count: filteredMaterials.length,
      data: filteredMaterials,
    });
  } catch (error) {
    console.error("Error fetching materials:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch materials",
      error: error.message,
    });
  }
};

// Get material by ID
exports.getMaterialById = async (req, res) => {
  try {
    const material = await Inventory.findById(req.params.id);

    if (!material) {
      return res.status(404).json({
        success: false,
        message: "Material not found",
      });
    }

    // Get recent transactions
    const transactions = await StockTransaction.find({
      materialId: material._id,
    })
      .populate("performedBy", "name employeeId")
      .populate("siteId", "siteName siteCode")
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        material,
        recentTransactions: transactions,
        isLowStock: material.isLowStock(),
      },
    });
  } catch (error) {
    console.error("Error fetching material:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch material",
      error: error.message,
    });
  }
};

// Update material
exports.updateMaterial = async (req, res) => {
  try {
    const material = await Inventory.findByIdAndUpdate(
      req.params.id,
      { ...req.body, lastUpdated: new Date() },
      { new: true, runValidators: true }
    );

    if (!material) {
      return res.status(404).json({
        success: false,
        message: "Material not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Material updated successfully",
      data: material,
    });
  } catch (error) {
    console.error("Error updating material:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update material",
      error: error.message,
    });
  }
};

// Delete material
exports.deleteMaterial = async (req, res) => {
  try {
    const material = await Inventory.findByIdAndDelete(req.params.id);

    if (!material) {
      return res.status(404).json({
        success: false,
        message: "Material not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Material deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting material:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete material",
      error: error.message,
    });
  }
};

// Get low stock alerts
exports.getLowStockAlerts = async (req, res) => {
  try {
    const materials = await Inventory.find();
    
    const lowStockMaterials = materials.filter((m) => m.isLowStock());

    res.status(200).json({
      success: true,
      count: lowStockMaterials.length,
      data: lowStockMaterials,
    });
  } catch (error) {
    console.error("Error fetching low stock alerts:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch low stock alerts",
      error: error.message,
    });
  }
};

// Get stock transactions
exports.getStockTransactions = async (req, res) => {
  try {
    const { materialId, transactionType, siteId, startDate, endDate } = req.query;

    let query = {};

    if (materialId) query.materialId = materialId;
    if (transactionType) query.transactionType = transactionType;
    if (siteId) query.siteId = siteId;

    if (startDate && endDate) {
      query.transactionDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const transactions = await StockTransaction.find(query)
      .populate("materialId", "materialName materialCode unit")
      .populate("performedBy", "name employeeId")
      .populate("siteId", "siteName siteCode")
      .populate("indentId", "indentNumber")
      .populate("grnId", "grnNumber")
      .sort({ transactionDate: -1 });

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch transactions",
      error: error.message,
    });
  }
};

// Get inventory summary/dashboard
exports.getInventorySummary = async (req, res) => {
  try {
    const totalMaterials = await Inventory.countDocuments();
    const materials = await Inventory.find();
    
    const lowStockCount = materials.filter((m) => m.isLowStock()).length;
    
    const totalValue = materials.reduce((sum, m) => sum + (m.totalValue || 0), 0);
    
    const categoryWiseStock = await Inventory.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          totalStock: { $sum: "$currentStock" },
          totalValue: { $sum: "$totalValue" },
        },
      },
    ]);

    const recentTransactions = await StockTransaction.find()
      .populate("materialId", "materialName")
      .populate("performedBy", "name")
      .sort({ transactionDate: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        totalMaterials,
        lowStockCount,
        totalValue,
        categoryWiseStock,
        recentTransactions,
      },
    });
  } catch (error) {
    console.error("Error fetching inventory summary:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch inventory summary",
      error: error.message,
    });
  }
};

// Site-wise material usage report
exports.getSiteWiseUsage = async (req, res) => {
  try {
    const { siteId, startDate, endDate } = req.query;

    let query = { transactionType: "Stock Out" };

    if (siteId) query.siteId = siteId;

    if (startDate && endDate) {
      query.transactionDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const usage = await StockTransaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            siteId: "$siteId",
            materialId: "$materialId",
          },
          totalQuantity: { $sum: "$quantity" },
          totalValue: { $sum: { $multiply: ["$quantity", "$rate"] } },
        },
      },
      {
        $lookup: {
          from: "sites",
          localField: "_id.siteId",
          foreignField: "_id",
          as: "site",
        },
      },
      {
        $lookup: {
          from: "inventories",
          localField: "_id.materialId",
          foreignField: "_id",
          as: "material",
        },
      },
    ]);

    res.status(200).json({
      success: true,
      count: usage.length,
      data: usage,
    });
  } catch (error) {
    console.error("Error fetching site-wise usage:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch site-wise usage",
      error: error.message,
    });
  }
};


// Stock Out - Issue materials to site
exports.stockOut = async (req, res) => {
  try {
    const { materialId, quantity, siteId, indentId, remarks } = req.body;

    // Validation
    if (!materialId || !quantity || !siteId) {
      return res.status(400).json({
        success: false,
        message: "Please provide materialId, quantity, and siteId",
      });
    }

    // Find material
    const material = await Inventory.findById(materialId);
    if (!material) {
      return res.status(404).json({
        success: false,
        message: "Material not found",
      });
    }

    // Check if sufficient stock available
    if (material.currentStock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Available: ${material.currentStock} ${material.unit}`,
      });
    }

    // Generate transaction number
    const transactionCount = await StockTransaction.countDocuments();
    const transactionNumber = `TXN-OUT-${String(transactionCount + 1).padStart(6, "0")}`;

    // Calculate balance after transaction
    const balanceAfterTransaction = material.currentStock - quantity;

    // Create stock out transaction
    const transaction = new StockTransaction({
      transactionNumber,
      transactionType: "Stock Out",
      materialId,
      quantity,
      unit: material.unit,
      siteId,
      indentId: indentId || null,
      balanceBeforeTransaction: material.currentStock,
      balanceAfterTransaction,
      remarks,
      transactionDate: new Date(),
    });

    await transaction.save();

    // Update material stock
    material.currentStock = balanceAfterTransaction;
    material.totalValue = material.currentStock * material.averageRate;
    await material.save();

    // Populate transaction details
    await transaction.populate([
      { path: "materialId", select: "materialName materialCode unit" },
      { path: "siteId", select: "siteName location" },
      { path: "indentId", select: "indentNumber" },
    ]);

    res.status(200).json({
      success: true,
      message: "Stock issued successfully",
      data: transaction,
    });
  } catch (error) {
    console.error("Error in stock out:", error);
    res.status(500).json({
      success: false,
      message: "Failed to issue stock",
      error: error.message,
    });
  }
};
