const mongoose = require("mongoose");
const Indent = require("../construction/models/Indent");
const Inventory = require("../construction/models/Inventory");
const PurchaseRequest = require("../construction/models/PurchaseRequest");
const StockTransaction = require("../construction/models/StockTransaction");

// Generate unique indent number with retry logic
const generateIndentNumber = async (retryCount = 0) => {
  const prefix = "IND";
  const year = new Date().getFullYear();
  
  // Find all indents for current year and get the highest number
  const indents = await Indent.find({
    indentNumber: { $regex: `^${prefix}-${year}-` }
  }).sort({ indentNumber: -1 }).limit(1);
  
  let newNumber = 1;
  if (indents.length > 0) {
    const lastNumber = parseInt(indents[0].indentNumber.split("-")[2]) || 0;
    newNumber = lastNumber + 1;
  }
  
  const indentNumber = `${prefix}-${year}-${String(newNumber).padStart(3, "0")}`;
  
  // Check if this number already exists (race condition protection)
  const exists = await Indent.findOne({ indentNumber });
  if (exists) {
    if (retryCount < 5) {
      // Retry with a small delay
      await new Promise(resolve => setTimeout(resolve, 100));
      return generateIndentNumber(retryCount + 1);
    }
    throw new Error("Failed to generate unique indent number after multiple attempts");
  }
  
  return indentNumber;
};



// Site Supervisor: Create Indent Request
exports.createIndent = async (req, res) => {
  try {
    const {
      siteId,
      materialId,
      materialName, // For backward compatibility
      quantity,
      unit,
      priority,
      expectedDate,
      remarks,
      raisedBy,
    } = req.body;

    // Validation - now requires materialId
    if (!siteId || !materialId || !quantity || !expectedDate) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields (siteId, materialId, quantity, expectedDate)",
      });
    }

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(siteId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid site ID",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(materialId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid material ID",
      });
    }

    // Handle raisedBy - convert employeeId or email to Employee ObjectId
    let validRaisedBy = null;
    if (raisedBy) {
      if (mongoose.Types.ObjectId.isValid(raisedBy)) {
        // If it's already an ObjectId, use it
        validRaisedBy = raisedBy;
      } else {
        // Try to find by employeeId or email
        const Employee = require("../model/Employee");
        const employee = await Employee.findOne({
          $or: [
            { employeeId: raisedBy },
            { email: raisedBy }
          ]
        });
        if (employee) {
          validRaisedBy = employee._id;
        }
      }
    }

    // Fetch material details to get name and unit
    const MaterialType = require("../model/MaterialType");
    const material = await MaterialType.findById(materialId);
    
    if (!material) {
      return res.status(404).json({
        success: false,
        message: "Material type not found",
      });
    }

    // Generate indent number
    const indentNumber = await generateIndentNumber();

    // Create indent
    const indent = new Indent({
      indentNumber,
      siteId,
      raisedBy: validRaisedBy,
      materialId,
      materialName: material.materialName, // Auto-populate from MaterialType
      quantity,
      unit: unit || material.unit, // Use material's default unit if not provided
      priority: priority || "Medium",
      expectedDate,
      remarks,
      status: "Pending Approval",
    });

    await indent.save();

    res.status(201).json({
      success: true,
      message: "Indent request created successfully",
      data: indent,
    });
  } catch (error) {
    console.error("Error creating indent:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create indent",
      error: error.message,
    });
  }
};

// Project Manager: Approve/Reject Indent
exports.approveRejectIndent = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, approvedBy, rejectionReason } = req.body;

    if (!action || !approvedBy) {
      return res.status(400).json({
        success: false,
        message: "Please provide action and approvedBy",
      });
    }

    const indent = await Indent.findById(id);

    if (!indent) {
      return res.status(404).json({
        success: false,
        message: "Indent not found",
      });
    }

    if (indent.status !== "Pending Approval") {
      return res.status(400).json({
        success: false,
        message: "Indent is not in pending approval status",
      });
    }

    if (action === "approve") {
      indent.status = "Approved";
      // Only set approvedBy if it's a valid ObjectId
      if (mongoose.Types.ObjectId.isValid(approvedBy)) {
        indent.approvedBy = approvedBy;
      }
      indent.approvalDate = new Date();
    } else if (action === "reject") {
      indent.status = "Rejected";
      // Only set approvedBy if it's a valid ObjectId
      if (mongoose.Types.ObjectId.isValid(approvedBy)) {
        indent.approvedBy = approvedBy;
      }
      indent.approvalDate = new Date();
      indent.rejectionReason = rejectionReason;
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid action. Use 'approve' or 'reject'",
      });
    }

    await indent.save();

    res.status(200).json({
      success: true,
      message: `Indent ${action}d successfully`,
      data: indent,
    });
  } catch (error) {
    console.error("Error approving/rejecting indent:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process indent",
      error: error.message,
    });
  }
};

// Procurement Officer: Check Inventory and Process Indent
exports.checkInventoryAndProcess = async (req, res) => {
  try {
    console.log("✅ checkInventoryAndProcess called!");
    console.log("Request params:", req.params);
    console.log("Request body:", req.body);
    
    const { id } = req.params;
    const { checkedBy } = req.body;

    const indent = await Indent.findById(id);
    console.log("Indent found:", indent ? "YES" : "NO");

    if (!indent) {
      console.log("❌ Returning 404: Indent not found");
      return res.status(404).json({
        success: false,
        message: "Indent not found",
      });
    }

    console.log("Indent status:", indent.status);
    console.log("Indent material:", indent.materialName);

    if (indent.status !== "Approved") {
      console.log("❌ Returning 400: Indent not approved");
      return res.status(400).json({
        success: false,
        message: "Indent must be approved first",
      });
    }

    // Check inventory
    console.log("Searching inventory for:", indent.materialName);
    const inventoryItem = await Inventory.findOne({
      materialName: { $regex: new RegExp(indent.materialName, "i") },
    });
    console.log("Inventory item found:", inventoryItem ? "YES" : "NO");

    // If material not in inventory, treat as zero stock and create purchase request
    const currentStock = inventoryItem ? inventoryItem.currentStock : 0;
    
    if (!inventoryItem || currentStock === 0) {
      console.log("⚠️ Material not in inventory or zero stock - creating purchase request");
      
      // Check if PR already exists for this indent
      const existingPR = await PurchaseRequest.findOne({ indentId: indent._id });
      
      if (existingPR) {
        console.log("✅ Purchase Request already exists:", existingPR.prNumber);
        
        // Update indent status if not already updated
        if (indent.status !== "Pending Purchase") {
          await Indent.findByIdAndUpdate(indent._id, {
            status: "Pending Purchase",
            inventoryCheckDate: new Date(),
            availableStock: 0,
            shortageQuantity: indent.quantity,
            purchaseRequestId: existingPR._id,
            inventoryCheckedBy: (checkedBy && mongoose.Types.ObjectId.isValid(checkedBy)) ? checkedBy : undefined
          }, { runValidators: false });
        }
        
        // Refresh indent data
        const updatedIndent = await Indent.findById(indent._id)
          .populate("siteId")
          .populate("materialId")
          .populate("purchaseRequestId");

        return res.status(200).json({
          success: true,
          message: `Purchase request ${existingPR.prNumber} already exists for this indent.`,
          data: {
            indent: updatedIndent,
            stockAvailable: false,
            availableQuantity: 0,
            shortageQuantity: indent.quantity,
            purchaseRequest: existingPR,
          },
        });
      }
      
      // Update indent using findByIdAndUpdate to avoid validation issues
      const updateData = {
        inventoryCheckDate: new Date(),
        availableStock: 0,
        shortageQuantity: indent.quantity,
        status: "Pending Purchase"
      };
      
      // Only set checkedBy if it's a valid ObjectId
      if (checkedBy && mongoose.Types.ObjectId.isValid(checkedBy)) {
        updateData.inventoryCheckedBy = checkedBy;
      }

      // Auto-generate Purchase Request with unique number
      let prNumber;
      let prExists = true;
      let counter = (await PurchaseRequest.countDocuments()) + 1;
      
      // Keep trying until we find a unique PR number
      while (prExists) {
        prNumber = `PR-${new Date().getFullYear()}-${String(counter).padStart(3, "0")}`;
        const existing = await PurchaseRequest.findOne({ prNumber });
        if (!existing) {
          prExists = false;
        } else {
          counter++;
        }
      }

      const purchaseRequest = new PurchaseRequest({
        prNumber,
        indentId: indent._id,
        siteId: indent.siteId,
        materialName: indent.materialName,
        quantity: indent.quantity,
        unit: indent.unit,
        priority: indent.priority || "Medium",
        requiredBy: indent.expectedDate,
        status: "Pending Quotation",
        remarks: `Auto-created from indent ${indent.indentNumber}`,
      });

      await purchaseRequest.save();
      
      // Update indent with purchase request ID
      updateData.purchaseRequestId = purchaseRequest._id;
      
      await Indent.findByIdAndUpdate(indent._id, updateData, { runValidators: false });
      
      // Refresh indent data
      const updatedIndent = await Indent.findById(indent._id)
        .populate("siteId")
        .populate("materialId")
        .populate("purchaseRequestId");

      return res.status(200).json({
        success: true,
        message: "Material not in inventory. Purchase request created automatically.",
        data: {
          indent: updatedIndent,
          stockAvailable: false,
          availableQuantity: 0,
          shortageQuantity: indent.quantity,
          purchaseRequest,
        },
      });
    }

    // Check if stock is available
    if (currentStock >= indent.quantity) {
      // Stock available - mark as Ready to Issue
      const updateData = {
        availableStock: currentStock,
        status: "Ready to Issue",
        shortageQuantity: 0,
        inventoryCheckDate: new Date(),
      };
      
      // Only set checkedBy if it's a valid ObjectId
      if (checkedBy && mongoose.Types.ObjectId.isValid(checkedBy)) {
        updateData.inventoryCheckedBy = checkedBy;
      }
      
      await Indent.findByIdAndUpdate(indent._id, updateData, { runValidators: false });

      // Refresh indent data
      const updatedIndent = await Indent.findById(indent._id)
        .populate("siteId")
        .populate("materialId");

      return res.status(200).json({
        success: true,
        message: "✅ Stock available! Material ready to issue to site.",
        data: {
          indent: updatedIndent,
          stockAvailable: true,
          availableQuantity: currentStock,
        },
      });
    } else {
      // Stock not available or insufficient - create purchase request
      const shortageQty = indent.quantity - currentStock;

      // Check if PR already exists for this indent
      const existingPR = await PurchaseRequest.findOne({ indentId: indent._id });
      
      if (existingPR) {
        console.log("✅ Purchase Request already exists:", existingPR.prNumber);
        
        // Update indent status if not already updated
        if (indent.status !== "Pending Purchase") {
          await Indent.findByIdAndUpdate(indent._id, {
            status: "Pending Purchase",
            inventoryCheckDate: new Date(),
            availableStock: currentStock,
            shortageQuantity: shortageQty,
            purchaseRequestId: existingPR._id,
            inventoryCheckedBy: (checkedBy && mongoose.Types.ObjectId.isValid(checkedBy)) ? checkedBy : undefined
          }, { runValidators: false });
        }
        
        // Refresh indent data
        const updatedIndent = await Indent.findById(indent._id)
          .populate("siteId")
          .populate("materialId")
          .populate("purchaseRequestId");

        return res.status(200).json({
          success: true,
          message: `Purchase request ${existingPR.prNumber} already exists for this indent.`,
          data: {
            indent: updatedIndent,
            purchaseRequest: existingPR,
            stockAvailable: false,
            availableQuantity: currentStock,
            shortageQuantity: shortageQty,
          },
        });
      }

      // Auto-generate Purchase Request with unique number
      let prNumber;
      let prExists = true;
      let counter = (await PurchaseRequest.countDocuments()) + 1;
      
      // Keep trying until we find a unique PR number
      while (prExists) {
        prNumber = `PR-${new Date().getFullYear()}-${String(counter).padStart(3, "0")}`;
        const existing = await PurchaseRequest.findOne({ prNumber });
        if (!existing) {
          prExists = false;
        } else {
          counter++;
        }
      }

      const prData = {
        prNumber,
        indentId: indent._id,
        siteId: indent.siteId,
        materialName: indent.materialName,
        quantity: shortageQty,
        unit: indent.unit,
        priority: indent.priority,
        requiredBy: indent.expectedDate,
        status: "Pending Quotation",
      };
      
      // Only set createdBy if it's a valid ObjectId
      if (checkedBy && mongoose.Types.ObjectId.isValid(checkedBy)) {
        prData.createdBy = checkedBy;
      }

      const purchaseRequest = new PurchaseRequest(prData);
      await purchaseRequest.save();

      // Update indent with purchase request ID (use findByIdAndUpdate to avoid validation issues)
      const updateData = {
        purchaseRequestId: purchaseRequest._id,
        status: "Pending Purchase",
        shortageQuantity: shortageQty,
        availableStock: currentStock,
        inventoryCheckDate: new Date(),
      };
      
      // Only set checkedBy if it's a valid ObjectId
      if (checkedBy && mongoose.Types.ObjectId.isValid(checkedBy)) {
        updateData.inventoryCheckedBy = checkedBy;
      }
      
      await Indent.findByIdAndUpdate(indent._id, updateData, { runValidators: false });

      // Refresh indent data
      const updatedIndent = await Indent.findById(indent._id)
        .populate("siteId")
        .populate("materialId")
        .populate("purchaseRequestId");

      return res.status(200).json({
        success: true,
        message: "Insufficient stock. Purchase request created automatically.",
        data: {
          indent: updatedIndent,
          purchaseRequest,
          stockAvailable: false,
          availableQuantity: inventoryItem ? inventoryItem.currentStock : 0,
          shortageQuantity: shortageQty,
        },
      });
    }
  } catch (error) {
    console.error("Error checking inventory:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check inventory",
      error: error.message,
    });
  }
};

// Procurement Officer: Issue Material to Site (Stock Out)
exports.issueMaterialToSite = async (req, res) => {
  try {
    const { id } = req.params;
    const { issuedBy, remarks } = req.body;

    console.log("🔵 issueMaterialToSite called for indent:", id);
    console.log("🔵 Request body:", req.body);

    const indent = await Indent.findById(id).populate("siteId");

    if (!indent) {
      console.log("❌ Indent not found");
      return res.status(404).json({
        success: false,
        message: "Indent not found",
      });
    }

    console.log("🔵 Indent found:", {
      indentNumber: indent.indentNumber,
      status: indent.status,
      statusType: typeof indent.status,
      materialName: indent.materialName,
      quantity: indent.quantity
    });

    if (indent.status !== "Ready to Issue") {
      console.log(`❌ Status mismatch! Expected: "Ready to Issue", Got: "${indent.status}"`);
      return res.status(400).json({
        success: false,
        message: `Indent is not ready for issue. Current status: ${indent.status}. Please check inventory first.`,
      });
    }
    
    console.log("✅ Status check passed!");

    // Find inventory item
    const inventoryItem = await Inventory.findOne({
      materialName: { $regex: new RegExp(indent.materialName, "i") },
    });

    if (!inventoryItem || inventoryItem.currentStock < indent.quantity) {
      return res.status(400).json({
        success: false,
        message: "Insufficient stock to issue",
      });
    }

    // Update inventory (Stock Out)
    inventoryItem.currentStock -= indent.quantity;
    inventoryItem.lastUpdated = new Date();
    await inventoryItem.save();

    // Create stock transaction
    const transactionNumber = `ST-OUT-${new Date().getFullYear()}-${String(
      (await StockTransaction.countDocuments({ transactionType: "Stock Out" })) + 1
    ).padStart(4, "0")}`;

    const stockTransaction = new StockTransaction({
      transactionNumber,
      transactionType: "Stock Out",
      materialId: inventoryItem._id,
      quantity: indent.quantity,
      unit: indent.unit,
      indentId: indent._id,
      siteId: indent.siteId,
      issuedTo: indent.raisedBy,
      performedBy: issuedBy,
      remarks,
      balanceAfterTransaction: inventoryItem.currentStock,
    });

    await stockTransaction.save();

    // Update indent - mark as Completed
    indent.status = "Completed";
    indent.issuedQuantity = indent.quantity;
    indent.issueDate = new Date();
    await indent.save();

    res.status(200).json({
      success: true,
      message: "✅ Material issued to site successfully. Indent completed!",
      data: {
        indent,
        stockTransaction,
        remainingStock: inventoryItem.currentStock,
      },
    });
  } catch (error) {
    console.error("Error issuing material:", error);
    res.status(500).json({
      success: false,
      message: "Failed to issue material",
      error: error.message,
    });
  }
};

// Get all indents with filters
exports.getAllIndents = async (req, res) => {
  try {
    const { siteId, status, priority, startDate, endDate } = req.query;

    let query = {};

    if (siteId) query.siteId = siteId;
    if (status) query.status = status;
    if (priority) query.priority = priority;

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const indents = await Indent.find(query)
      .populate("siteId", "siteName siteCode")
      .populate("materialId", "materialName materialCode category unit")
      .populate("raisedBy", "name employeeId")
      .populate("approvedBy", "name employeeId")
      .populate("inventoryCheckedBy", "name employeeId")
      .populate("purchaseRequestId")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: indents.length,
      data: indents,
    });
  } catch (error) {
    console.error("Error fetching indents:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch indents",
      error: error.message,
    });
  }
};

// Get indent by ID
exports.getIndentById = async (req, res) => {
  try {
    const indent = await Indent.findById(req.params.id)
      .populate("siteId")
      .populate("raisedBy", "name employeeId email")
      .populate("approvedBy", "name employeeId")
      .populate("inventoryCheckedBy", "name employeeId")
      .populate("purchaseRequestId");

    if (!indent) {
      return res.status(404).json({
        success: false,
        message: "Indent not found",
      });
    }

    res.status(200).json({
      success: true,
      data: indent,
    });
  } catch (error) {
    console.error("Error fetching indent:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch indent",
      error: error.message,
    });
  }
};

// Update indent
exports.updateIndent = async (req, res) => {
  try {
    const indent = await Indent.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!indent) {
      return res.status(404).json({
        success: false,
        message: "Indent not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Indent updated successfully",
      data: indent,
    });
  } catch (error) {
    console.error("Error updating indent:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update indent",
      error: error.message,
    });
  }
};

// Delete indent
exports.deleteIndent = async (req, res) => {
  try {
    const indent = await Indent.findByIdAndDelete(req.params.id);

    if (!indent) {
      return res.status(404).json({
        success: false,
        message: "Indent not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Indent deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting indent:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete indent",
      error: error.message,
    });
  }
};
