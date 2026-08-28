const Indent = require("../RestautantModel/RestaurantIndentModel");
const GoodsReceiptNote = require("../../model/GoodsReceiptNote");
const RawMaterial = require("../RestautantModel/RestaurantRawMaterialModel");
const UnitConversion = require("../../model/UnitConversionModel");
const { addStock } = require("./DepartmentStockController");
const DepartmentStock = require("../RestautantModel/DepartmentStockModel");
const Department = require("../../model/departmentModel");


async function getConversionFactor(fromUnit, toUnit) {
  if (fromUnit === toUnit) return 1;
  let conv = await UnitConversion.findOne({ fromUnit, toUnit });
  if (conv) return conv.factor;

  // Reverse conversion
  conv = await UnitConversion.findOne({ fromUnit: toUnit, toUnit: fromUnit });
  if (conv) return 1 / conv.factor;

  return null;
}
exports.createIndent = async (req, res) => {
  try {
    const {
      department,
      raisedBy,
      raisedByContact,
      branch,
      items,
      priority,
      requiredDate,
      purpose,
    } = req.body;

    const indent = new Indent({
      department,
      raisedBy,
      raisedByContact,
      branch,
      items,
      priority,
      requiredDate,
      purpose,
      status: "Pending",
    });

    await indent.save();
    console.log("✅ Indent created:", indent.indentNumber);

    res.status(201).json({
      success: true,
      message: "Indent created successfully",
      data: indent,
    });
  } catch (error) {
    console.error("Error creating indent:", error);
    res.status(500).json({
      success: false,
      message: "Error creating indent",
      error: error.message,
    });
  }
};
exports.getAllIndents = async (req, res) => {
  try {
    const { status, department, branch, startDate, endDate } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (department) filter.department = department;
    if (branch) filter.branch = branch;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const indents = await Indent.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: indents.length,
      data: indents,
    });
  } catch (error) {
    console.error("Error fetching indents:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching indents",
      error: error.message,
    });
  }
};
exports.getIndentById = async (req, res) => {
  try {
    const { id } = req.params;
    const indent = await Indent.findById(id);

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
      message: "Error fetching indent",
      error: error.message,
    });
  }
};
exports.hodApproveIndent = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, approvedBy, remarks, items } = req.body;
    // action: "approve" | "partial" | "reject"
    // items: array with approvedQuantity per item (for partial approval)

    const indent = await Indent.findById(id);
    if (!indent) {
      return res.status(404).json({
        success: false,
        message: "Indent not found",
      });
    }

    if (indent.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot approve indent with status "${indent.status}". Only "Pending" indents can be approved by HOD.`,
      });
    }

    // Set HOD approval details
    indent.hodApproval = {
      approvedBy: approvedBy || "HOD",
      approvedAt: new Date(),
      remarks: remarks || "",
    };

    if (action === "approve") {
      // Full approval - set approvedQuantity = requestedQuantity for all items
      indent.status = "HOD Approved";
      for (const item of indent.items) {
        item.approvedQuantity = item.requestedQuantity;
      }
    } else if (action === "partial") {
      // Partial approval - set approvedQuantity per item from request body
      indent.status = "HOD Partially Approved";
      if (items && items.length > 0) {
        for (let i = 0; i < indent.items.length; i++) {
          const updateItem = items.find(
            (it) =>
              it.productName === indent.items[i].productName ||
              it.index === i
          );
          if (updateItem && updateItem.approvedQuantity !== undefined) {
            indent.items[i].approvedQuantity = updateItem.approvedQuantity;
          } else {
            // Default: approve full requested quantity if not specified
            indent.items[i].approvedQuantity = indent.items[i].requestedQuantity;
          }
        }
      }
    } else if (action === "reject") {
      indent.status = "HOD Rejected";
      for (const item of indent.items) {
        item.approvedQuantity = 0;
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Use "approve", "partial", or "reject".',
      });
    }

    await indent.save();
    console.log(`✅ Indent ${indent.indentNumber} - HOD action: ${action}`);

    res.status(200).json({
      success: true,
      message: `Indent ${action === "approve" ? "approved" : action === "partial" ? "partially approved" : "rejected"} by HOD`,
      data: indent,
    });
  } catch (error) {
    console.error("Error in HOD approval:", error);
    res.status(500).json({
      success: false,
      message: "Error processing HOD approval",
      error: error.message,
    });
  }
};
exports.storeApproveAndIssue = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy, remarks, items } = req.body;
    // items: array with issuedQuantity per item

    const indent = await Indent.findById(id);
    if (!indent) {
      return res.status(404).json({
        success: false,
        message: "Indent not found",
      });
    }

    if (
      indent.status !== "HOD Approved" &&
      indent.status !== "HOD Partially Approved"
    ) {
      return res.status(400).json({
        success: false,
        message: `Cannot issue material for indent with status "${indent.status}". Only HOD approved indents can be issued.`,
      });
    }

    // Set issued quantities from request body
    if (items && items.length > 0) {
      for (let i = 0; i < indent.items.length; i++) {
        const updateItem = items.find(
          (it) =>
            it.productName === indent.items[i].productName ||
            it.index === i
        );
        if (updateItem && updateItem.issuedQuantity !== undefined) {
          indent.items[i].issuedQuantity = updateItem.issuedQuantity;
        }
        if (updateItem && updateItem.rate !== undefined) {
          indent.items[i].rate = updateItem.rate;
        }
      }
    }

    // FIFO deduction from GRN inventory for each item
    for (const item of indent.items) {
      if (!item.issuedQuantity || item.issuedQuantity <= 0) continue;

      let baseQtyToDeduct = item.issuedQuantity;

      // Check if unit conversion is needed
      const mat = await RawMaterial.findById(item.rawMaterial);
      if (
        mat &&
        mat.distributionUnit &&
        mat.conversionFactor &&
        item.requestedUnit === mat.distributionUnit
      ) {
        // Convert from distribution unit to base unit
        baseQtyToDeduct = item.issuedQuantity / mat.conversionFactor;
        console.log(
          `🔄 Unit conversion for ${item.productName}: ${item.issuedQuantity} ${item.requestedUnit} = ${baseQtyToDeduct} ${mat.unit} (factor: ${mat.conversionFactor})`
        );
      }

      // FIFO deduction from GRN
      const grns = await GoodsReceiptNote.find({
        "items.product": item.productName,
        branch: indent.branch,
      }).sort({ createdAt: 1 }); // Oldest first (FIFO)

      let remaining = baseQtyToDeduct;

      for (const grn of grns) {
        if (remaining <= 0) break;

        let grnModified = false;

        for (const grnItem of grn.items) {
          if (
            grnItem.product === item.productName &&
            grnItem.availableQuantity > 0 &&
            remaining > 0
          ) {
            const deduct = Math.min(grnItem.availableQuantity, remaining);
            grnItem.consumedQuantity = (grnItem.consumedQuantity || 0) + deduct;
            grnItem.availableQuantity -= deduct;
            remaining -= deduct;
            grnModified = true;

            console.log(
              `✅ GRN ${grn.grnNumber}: Deducted ${deduct} of "${item.productName}", Remaining available: ${grnItem.availableQuantity}`
            );
          }
        }

        if (grnModified) {
          await grn.save();
        }
      }

      if (remaining > 0) {
        console.warn(
          `⚠️ Warning: Insufficient stock for "${item.productName}". Remaining undeducted: ${remaining}`
        );
      }

      // Credit department stock
      try {
        await addStock(
          indent.department,
          indent.branch,
          item.rawMaterial,
          item.productName,
          item.issuedQuantity, // in the requested unit
          item.requestedUnit
        );
        console.log(`✅ Department stock credited: ${item.productName} +${item.issuedQuantity} ${item.requestedUnit} to ${indent.department}`);
      } catch (deptErr) {
        console.error(`⚠️ Error crediting department stock for ${item.productName}:`, deptErr.message);
      }

      // Also deduct from LocationInventory (keeps department distribution system in sync)
      try {
        const { LocationInventory } = require('../../model/inventoryModel');
        const StoreLocation = require('../../model/storeLocationModel');
        // Find the source store by matching indent's fromStoreId or branch
        const fromStoreId = indent.fromStoreId;
        if (fromStoreId && item.rawMaterial) {
          const locInv = await LocationInventory.findOne({
            locationId: fromStoreId,
            rawMaterialId: item.rawMaterial,
          });
          if (locInv && locInv.quantity >= baseQtyToDeduct) {
            locInv.quantity -= baseQtyToDeduct;
            locInv.lastUpdated = new Date();
            await locInv.save();
            console.log(`📦 LocationInventory deducted: ${item.productName} -${baseQtyToDeduct} from store ${fromStoreId}`);
          }
        }
      } catch (syncErr) {
        console.warn('⚠️ LocationInventory sync in indent issue:', syncErr.message);
      }
    }

    // Update indent status and store approval
    indent.status = "Store Issued";
    indent.storeApproval = {
      approvedBy: approvedBy || "Store Manager",
      approvedAt: new Date(),
      remarks: remarks || "",
    };

    await indent.save();
    console.log(`✅ Indent ${indent.indentNumber} - Store issued successfully`);

    res.status(200).json({
      success: true,
      message: "Material issued successfully and inventory updated",
      data: indent,
    });
  } catch (error) {
    console.error("Error in store issue:", error);
    res.status(500).json({
      success: false,
      message: "Error processing store issue",
      error: error.message,
    });
  }
};
exports.cancelIndent = async (req, res) => {
  try {
    const { id } = req.params;

    const indent = await Indent.findById(id);
    if (!indent) {
      return res.status(404).json({
        success: false,
        message: "Indent not found",
      });
    }

    if (indent.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel indent with status "${indent.status}". Only "Pending" indents can be cancelled.`,
      });
    }

    indent.status = "Cancelled";
    await indent.save();
    console.log(`✅ Indent ${indent.indentNumber} cancelled`);

    res.status(200).json({
      success: true,
      message: "Indent cancelled successfully",
      data: indent,
    });
  } catch (error) {
    console.error("Error cancelling indent:", error);
    res.status(500).json({
      success: false,
      message: "Error cancelling indent",
      error: error.message,
    });
  }
};
exports.getIndentsByDepartment = async (req, res) => {
  try {
    const { department } = req.params;

    const indents = await Indent.find({ department }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: indents.length,
      data: indents,
    });
  } catch (error) {
    console.error("Error fetching indents by department:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching indents by department",
      error: error.message,
    });
  }
};
exports.getPendingForHOD = async (req, res) => {
  try {
    const indents = await Indent.find({ status: "Pending" }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: indents.length,
      data: indents,
    });
  } catch (error) {
    console.error("Error fetching pending indents for HOD:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching pending indents for HOD",
      error: error.message,
    });
  }
};
exports.getPendingForStore = async (req, res) => {
  try {
    const indents = await Indent.find({
      status: { $in: ["HOD Approved", "HOD Partially Approved"] },
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: indents.length,
      data: indents,
    });
  } catch (error) {
    console.error("Error fetching pending indents for store:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching pending indents for store",
      error: error.message,
    });
  }
};

// Get available stock for all raw materials (aggregated from GRN availableQuantity)
// Returns: { data: { "Product Name": totalAvailable, ... } }
exports.getAvailableStock = async (req, res) => {
  try {
    const pipeline = [
      { $unwind: "$items" },
      { $match: { "items.availableQuantity": { $gt: 0 } } },
      {
        $group: {
          _id: "$items.product",
          totalAvailable: { $sum: "$items.availableQuantity" },
        },
      },
    ];

    const results = await GoodsReceiptNote.aggregate(pipeline);

    const stockMap = {};
    results.forEach((r) => {
      stockMap[r._id] = r.totalAvailable;
    });

    res.json({ success: true, data: stockMap });
  } catch (error) {
    console.error("Error fetching available stock:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching available stock",
      error: error.message,
    });
  }
};

// Change the department of an indent.
// Allowed for ANY status. If the indent has already been "Store Issued",
// the department-wise stock that was credited to the old department is moved
// to the new department (per item, by issuedQuantity) so DepartmentStock stays in sync.
exports.changeDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { department: newDepartment, changedBy } = req.body;

    if (!newDepartment || !newDepartment.trim()) {
      return res.status(400).json({
        success: false,
        message: "New department is required",
      });
    }

    const indent = await Indent.findById(id);
    if (!indent) {
      return res.status(404).json({
        success: false,
        message: "Indent not found",
      });
    }

    const targetDept = newDepartment.trim();
    const oldDepartment = indent.department;

    if (oldDepartment === targetDept) {
      return res.status(400).json({
        success: false,
        message: "Indent is already in this department",
      });
    }

    // Validate the target department exists and is active
    const deptExists = await Department.findOne({ name: targetDept, isActive: true });
    if (!deptExists) {
      return res.status(400).json({
        success: false,
        message: `Department "${targetDept}" does not exist`,
      });
    }

    // If material was already issued, move the department-wise stock.
    const stockMoves = [];
    if (indent.status === "Store Issued") {
      for (const item of indent.items) {
        const movedQty = item.issuedQuantity;
        if (!movedQty || movedQty <= 0 || !item.rawMaterial) continue;

        // Decrement from old department (never below zero)
        const oldStock = await DepartmentStock.findOne({
          department: oldDepartment,
          branch: indent.branch,
          rawMaterial: item.rawMaterial,
        });
        if (oldStock) {
          oldStock.quantity = Math.max(0, (oldStock.quantity || 0) - movedQty);
          await oldStock.save();
        }

        // Credit new department (upsert)
        await addStock(
          targetDept,
          indent.branch,
          item.rawMaterial,
          item.productName,
          movedQty,
          item.requestedUnit
        );

        stockMoves.push({
          productName: item.productName,
          quantity: movedQty,
          unit: item.requestedUnit,
        });

        console.log(
          `🔀 Moved ${movedQty} ${item.requestedUnit} of "${item.productName}" from ${oldDepartment} → ${targetDept} (branch: ${indent.branch})`
        );
      }
    }

    // Update indent department
    indent.department = targetDept;
    await indent.save();

    console.log(
      `✅ Indent ${indent.indentNumber} department changed: ${oldDepartment} → ${targetDept}${changedBy ? ` by ${changedBy}` : ""}`
    );

    res.status(200).json({
      success: true,
      message:
        stockMoves.length > 0
          ? `Department changed and stock moved from "${oldDepartment}" to "${targetDept}"`
          : `Department changed to "${targetDept}"`,
      data: indent,
      stockMoves,
    });
  } catch (error) {
    console.error("Error changing indent department:", error);
    res.status(500).json({
      success: false,
      message: "Error changing indent department",
      error: error.message,
    });
  }
};
