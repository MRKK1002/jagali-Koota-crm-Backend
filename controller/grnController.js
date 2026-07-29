const GRN = require("../construction/models/GRN");
const PurchaseOrder = require("../construction/models/PurchaseOrder");
const Inventory = require("../construction/models/Inventory");
const StockTransaction = require("../construction/models/StockTransaction");

// Generate GRN number
const generateGRNNumber = async () => {
  const prefix = "GRN";
  const year = new Date().getFullYear();
  
  // Find the last GRN for this year
  const lastGRN = await GRN.findOne({ 
    grnNumber: new RegExp(`^${prefix}-${year}-`) 
  }).sort({ createdAt: -1 });
  
  let nextNumber = 1;
  if (lastGRN && lastGRN.grnNumber) {
    const lastNumber = parseInt(lastGRN.grnNumber.split("-")[2]) || 0;
    nextNumber = lastNumber + 1;
  }
  
  return `${prefix}-${year}-${String(nextNumber).padStart(4, "0")}`;
};

// Generate Material Code
const generateMaterialCode = async (materialName, category) => {
  const categoryPrefix = category.substring(0, 3).toUpperCase();
  const namePrefix = materialName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '');
  const count = await Inventory.countDocuments();
  return `${categoryPrefix}-${namePrefix}-${String(count + 1).padStart(4, "0")}`;
};

// Create GRN (Goods Received Note)
exports.createGRN = async (req, res) => {
  try {
    const {
      poId,
      receivedQuantity,
      acceptedQuantity,
      rejectedQuantity,
      qualityCheck,
      vehicleNumber,
      driverName,
      driverContact,
      challanNumber,
      challanDate,
      invoiceNumber,
      rejectionReason,
      receivedBy,
      remarks,
    } = req.body;

    // Validation
    if (!poId || !receivedQuantity || !acceptedQuantity || !qualityCheck) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Get PO details
    const purchaseOrder = await PurchaseOrder.findById(poId).populate("vendorId");

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: "Purchase Order not found",
      });
    }

    // Generate GRN number
    const grnNumber = await generateGRNNumber();

    // Determine GRN status
    let grnStatus = "Accepted";
    if (acceptedQuantity === 0) {
      grnStatus = "Rejected";
    } else if (acceptedQuantity < receivedQuantity) {
      grnStatus = "Partially Accepted";
    }

    // Create GRN
    const grn = new GRN({
      grnNumber,
      poId,
      vendorId: purchaseOrder.vendorId._id,
      materialName: purchaseOrder.materialName,
      orderedQuantity: purchaseOrder.quantity,
      receivedQuantity,
      acceptedQuantity,
      rejectedQuantity: rejectedQuantity || receivedQuantity - acceptedQuantity,
      unit: purchaseOrder.unit,
      qualityCheck,
      vehicleNumber,
      driverName,
      driverContact,
      challanNumber,
      challanDate,
      invoiceNumber,
      rejectionReason,
      status: grnStatus,
      receivedBy,
      remarks,
      stockUpdated: false,
    });

    await grn.save();

    // Update PO status
    if (acceptedQuantity >= purchaseOrder.quantity) {
      purchaseOrder.status = "Completed";
    } else if (acceptedQuantity > 0) {
      purchaseOrder.status = "Partially Received";
    }
    await purchaseOrder.save();

    // ✅ AUTO STOCK-IN: Automatically update inventory when GRN is created
    if (acceptedQuantity > 0) {
      try {
        // Find or create inventory item
        let inventoryItem = await Inventory.findOne({
          materialName: { $regex: new RegExp(`^${purchaseOrder.materialName}$`, "i") },
        });

        if (!inventoryItem) {
          // Auto-create inventory item if not exists
          const materialCode = await generateMaterialCode(purchaseOrder.materialName, "Other");
          inventoryItem = new Inventory({
            materialName: purchaseOrder.materialName,
            materialCode: materialCode,
            category: "Other",
            unit: purchaseOrder.unit,
            currentStock: 0,
            reorderLevel: 10,
            averageRate: purchaseOrder.ratePerUnit,
            totalValue: 0,
            warehouse: "Central Warehouse",
          });
          await inventoryItem.save();
          console.log(`✅ Auto-created inventory item: ${purchaseOrder.materialName} (${materialCode})`);
        }

        // Calculate new average rate
        const currentValue = inventoryItem.currentStock * inventoryItem.averageRate;
        const newValue = acceptedQuantity * purchaseOrder.ratePerUnit;
        const totalStock = inventoryItem.currentStock + acceptedQuantity;
        const newAverageRate = totalStock > 0 ? (currentValue + newValue) / totalStock : purchaseOrder.ratePerUnit;

        // Update inventory (Stock In)
        inventoryItem.currentStock += acceptedQuantity;
        inventoryItem.averageRate = newAverageRate;
        inventoryItem.totalValue = inventoryItem.currentStock * inventoryItem.averageRate;
        inventoryItem.lastUpdated = new Date();
        await inventoryItem.save();

        // Create stock transaction
        const transactionNumber = `ST-IN-${new Date().getFullYear()}-${String(
          (await StockTransaction.countDocuments({ transactionType: "Stock In" })) + 1
        ).padStart(4, "0")}`;

        console.log(`📝 Creating stock transaction: ${transactionNumber}`);
        console.log(`📦 Material: ${inventoryItem.materialName}, Quantity: ${acceptedQuantity}`);

        const stockTransaction = new StockTransaction({
          transactionNumber,
          transactionType: "Stock In",
          materialId: inventoryItem._id,
          quantity: acceptedQuantity,
          unit: purchaseOrder.unit,
          grnId: grn._id,
          rate: purchaseOrder.ratePerUnit,
          performedBy: receivedBy,
          remarks: `Auto Stock-In from GRN ${grnNumber}`,
          balanceAfterTransaction: inventoryItem.currentStock,
        });

        await stockTransaction.save();
        console.log(`✅ Stock transaction saved: ${stockTransaction._id}`);

        // Update GRN
        grn.stockUpdated = true;
        grn.stockTransactionId = stockTransaction._id;
        await grn.save();

        console.log(`✅ Auto Stock-In completed: ${acceptedQuantity} ${purchaseOrder.unit} of ${purchaseOrder.materialName}`);

        // ✅ AUTO-UPDATE PENDING INDENTS: Check if any pending indents can now be fulfilled
        const Indent = require("../model/Indent");
        const pendingIndents = await Indent.find({
          status: "Pending Purchase",
          materialName: { $regex: new RegExp(`^${purchaseOrder.materialName}$`, "i") },
        });

        for (const indent of pendingIndents) {
          if (inventoryItem.currentStock >= indent.quantity) {
            // Stock is now available for this indent
            indent.status = "Ready to Issue";
            indent.availableStock = inventoryItem.currentStock;
            indent.shortageQuantity = 0;
            await indent.save();
            console.log(`✅ Indent ${indent.indentNumber} is now Ready to Issue`);
          }
        }

      } catch (stockError) {
        console.error("❌ Error in auto stock-in:", stockError);
        console.error("❌ Stack trace:", stockError.stack);
        // Return error to user so they know stock-in failed
        return res.status(201).json({
          success: true,
          message: "⚠️ GRN created but stock update failed. Please update stock manually.",
          data: grn,
          stockError: stockError.message,
        });
      }
    }

    res.status(201).json({
      success: true,
      message: "✅ GRN created and stock updated automatically",
      data: grn,
    });
  } catch (error) {
    console.error("Error creating GRN:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create GRN",
      error: error.message,
    });
  }
};

// Update stock from GRN (Stock In)
exports.updateStockFromGRN = async (req, res) => {
  try {
    const { performedBy } = req.body;

    const grn = await GRN.findById(req.params.id).populate("poId");

    if (!grn) {
      return res.status(404).json({
        success: false,
        message: "GRN not found",
      });
    }

    if (grn.stockUpdated) {
      return res.status(400).json({
        success: false,
        message: "Stock already updated for this GRN",
      });
    }

    if (grn.acceptedQuantity === 0) {
      return res.status(400).json({
        success: false,
        message: "No accepted quantity to add to stock",
      });
    }

    // Find or create inventory item
    let inventoryItem = await Inventory.findOne({
      materialName: { $regex: new RegExp(`^${grn.materialName}$`, "i") },
    });

    if (!inventoryItem) {
      // Auto-create inventory item if not exists
      const materialCode = await generateMaterialCode(grn.materialName, "Other");
      inventoryItem = new Inventory({
        materialName: grn.materialName,
        materialCode: materialCode,
        category: "Other", // Default category
        unit: grn.unit,
        currentStock: 0,
        reorderLevel: 10,
        averageRate: grn.poId.ratePerUnit,
        totalValue: 0,
        warehouse: "Central Warehouse",
      });
      await inventoryItem.save();
      console.log(`Auto-created inventory item for: ${grn.materialName} (${materialCode})`);
    }

    // Calculate new average rate
    const currentValue = inventoryItem.currentStock * inventoryItem.averageRate;
    const newValue = grn.acceptedQuantity * grn.poId.ratePerUnit;
    const totalStock = inventoryItem.currentStock + grn.acceptedQuantity;
    const newAverageRate = totalStock > 0 ? (currentValue + newValue) / totalStock : grn.poId.ratePerUnit;

    // Update inventory (Stock In)
    inventoryItem.currentStock += grn.acceptedQuantity;
    inventoryItem.averageRate = newAverageRate;
    inventoryItem.totalValue = inventoryItem.currentStock * inventoryItem.averageRate;
    inventoryItem.lastUpdated = new Date();
    await inventoryItem.save();

    // Create stock transaction
    const transactionNumber = `ST-IN-${new Date().getFullYear()}-${String(
      (await StockTransaction.countDocuments({ transactionType: "Stock In" })) + 1
    ).padStart(4, "0")}`;

    const stockTransaction = new StockTransaction({
      transactionNumber,
      transactionType: "Stock In",
      materialId: inventoryItem._id,
      quantity: grn.acceptedQuantity,
      unit: grn.unit,
      grnId: grn._id,
      rate: grn.poId.ratePerUnit,
      performedBy,
      remarks: `Stock In from GRN ${grn.grnNumber}`,
      balanceAfterTransaction: inventoryItem.currentStock,
    });

    await stockTransaction.save();

    // Update GRN
    grn.stockUpdated = true;
    grn.stockTransactionId = stockTransaction._id;
    await grn.save();

    res.status(200).json({
      success: true,
      message: "Stock updated successfully from GRN",
      data: {
        grn,
        stockTransaction,
        updatedStock: inventoryItem.currentStock,
      },
    });
  } catch (error) {
    console.error("Error updating stock from GRN:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update stock from GRN",
      error: error.message,
    });
  }
};

// Get all GRNs
exports.getAllGRNs = async (req, res) => {
  try {
    const { poId, vendorId, status, startDate, endDate } = req.query;

    let query = {};

    if (poId) query.poId = poId;
    if (vendorId) query.vendorId = vendorId;
    if (status) query.status = status;

    if (startDate && endDate) {
      query.receivedDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const grns = await GRN.find(query)
      .populate("poId", "poNumber materialName")
      .populate("vendorId", "vendorName vendorCode")
      .populate("receivedBy", "name employeeId")
      .populate("qualityCheck.checkedBy", "name employeeId")
      .populate("stockTransactionId")
      .sort({ receivedDate: -1 });

    res.status(200).json({
      success: true,
      count: grns.length,
      data: grns,
    });
  } catch (error) {
    console.error("Error fetching GRNs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch GRNs",
      error: error.message,
    });
  }
};

// Get GRN by ID
exports.getGRNById = async (req, res) => {
  try {
    const grn = await GRN.findById(req.params.id)
      .populate("poId")
      .populate("vendorId")
      .populate("receivedBy", "name employeeId email")
      .populate("qualityCheck.checkedBy", "name employeeId")
      .populate("stockTransactionId");

    if (!grn) {
      return res.status(404).json({
        success: false,
        message: "GRN not found",
      });
    }

    res.status(200).json({
      success: true,
      data: grn,
    });
  } catch (error) {
    console.error("Error fetching GRN:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch GRN",
      error: error.message,
    });
  }
};

// Update GRN
exports.updateGRN = async (req, res) => {
  try {
    const grn = await GRN.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!grn) {
      return res.status(404).json({
        success: false,
        message: "GRN not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "GRN updated successfully",
      data: grn,
    });
  } catch (error) {
    console.error("Error updating GRN:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update GRN",
      error: error.message,
    });
  }
};

// Delete GRN
exports.deleteGRN = async (req, res) => {
  try {
    console.log("🗑️ Delete GRN request received for ID:", req.params.id);
    
    const grn = await GRN.findById(req.params.id).populate("poId");

    if (!grn) {
      console.log("❌ GRN not found");
      return res.status(404).json({
        success: false,
        message: "GRN not found",
      });
    }
    
    console.log("✅ GRN found:", grn.grnNumber);
    console.log("Stock updated?", grn.stockUpdated);
    console.log("Accepted quantity:", grn.acceptedQuantity);

    // If stock was updated, reverse it before deleting
    if (grn.stockUpdated && grn.acceptedQuantity > 0) {
      console.log(`⚠️ Reversing stock for GRN ${grn.grnNumber} before deletion`);
      
      // Find inventory item
      const inventoryItem = await Inventory.findOne({
        materialName: { $regex: new RegExp(`^${grn.materialName}$`, "i") },
      });

      if (inventoryItem) {
        // Reduce stock by accepted quantity
        inventoryItem.currentStock -= grn.acceptedQuantity;
        
        // Ensure stock doesn't go negative
        if (inventoryItem.currentStock < 0) {
          inventoryItem.currentStock = 0;
        }
        
        // Recalculate total value
        inventoryItem.totalValue = inventoryItem.currentStock * inventoryItem.averageRate;
        
        await inventoryItem.save();
        console.log(`✅ Stock reversed: ${grn.materialName} - Reduced by ${grn.acceptedQuantity}`);
      }

      // Delete associated stock transaction if exists
      if (grn.stockTransactionId) {
        await StockTransaction.findByIdAndDelete(grn.stockTransactionId);
        console.log(`✅ Stock transaction deleted`);
      }
    }

    // Delete the GRN
    await grn.deleteOne();

    res.status(200).json({
      success: true,
      message: grn.stockUpdated 
        ? "GRN deleted successfully (stock reversed)" 
        : "GRN deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting GRN:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete GRN",
      error: error.message,
    });
  }
};
