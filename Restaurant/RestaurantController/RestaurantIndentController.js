const Indent = require("../RestautantModel/RestaurantIndentModel");
const GoodsReceiptNote = require("../../model/GoodsReceiptNote");
const RawMaterial = require("../RestautantModel/RestaurantRawMaterialModel");
const UnitConversion = require("../../model/UnitConversionModel");
const { addStock } = require("./DepartmentStockController");

// Helper: get conversion factor between units
async function getConversionFactor(fromUnit, toUnit) {
  if (fromUnit === toUnit) return 1;
  let conv = await UnitConversion.findOne({ fromUnit, toUnit });
  if (conv) return conv.factor;

  // Reverse conversion
  conv = await UnitConversion.findOne({ fromUnit: toUnit, toUnit: fromUnit });
  if (conv) return 1 / conv.factor;

  return null;
}

// Create a new indent (status = Pending)
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

// Get all indents with optional filters (status, department, branch, date range)
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

// Get single indent by ID
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

// HOD Approve/Partially Approve/Reject indent
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

// Store Approve and Issue material (with FIFO deduction from GRN)
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

// Cancel an indent (only if status is "Pending")
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

// Get indents by department
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

// Get all pending indents for HOD dashboard (status = "Pending")
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

// Get all HOD-approved indents for Store Manager dashboard
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
