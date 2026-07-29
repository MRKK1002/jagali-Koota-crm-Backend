const mongoose = require("mongoose");
const VendorInvoice = require("../construction/models/VendorInvoice");
const GRN = require("../construction/models/GRN");
const PurchaseOrder = require("../construction/models/PurchaseOrder");

// Generate invoice number
const generateInvoiceNumber = async () => {
  const prefix = "INV";
  const count = await VendorInvoice.countDocuments();
  return `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
};

// Create Vendor Invoice
exports.createVendorInvoice = async (req, res) => {
  try {
    const {
      vendorInvoiceNumber,
      poId,
      grnId,
      invoiceDate,
      dueDate,
      tdsPercentage,
      otherCharges,
      enteredBy,
      remarks,
    } = req.body;

    // Validation
    if (!vendorInvoiceNumber || !poId || !grnId || !invoiceDate || !dueDate) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Get GRN and PO details
    const grn = await GRN.findById(grnId);
    const purchaseOrder = await PurchaseOrder.findById(poId);

    if (!grn || !purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: "GRN or Purchase Order not found",
      });
    }

    // Generate internal invoice number
    const invoiceNumber = await generateInvoiceNumber();

    // Calculate amounts
    const quantity = grn.acceptedQuantity;
    const ratePerUnit = purchaseOrder.ratePerUnit;
    const totalAmount = quantity * ratePerUnit;
    const gstAmount = (totalAmount * purchaseOrder.gstPercentage) / 100;
    const tdsAmount = (totalAmount * (tdsPercentage || 2)) / 100;
    const grandTotal = totalAmount + gstAmount + (otherCharges || 0);
    const netPayable = grandTotal - tdsAmount;

    // Create invoice
    const invoice = new VendorInvoice({
      invoiceNumber,
      vendorInvoiceNumber,
      poId,
      grnId,
      vendorId: purchaseOrder.vendorId,
      invoiceDate,
      dueDate,
      materialName: purchaseOrder.materialName,
      quantity,
      unit: purchaseOrder.unit,
      ratePerUnit,
      totalAmount,
      gstPercentage: purchaseOrder.gstPercentage,
      gstAmount,
      tdsPercentage: tdsPercentage || 2,
      tdsAmount,
      otherCharges: otherCharges || 0,
      grandTotal,
      netPayable,
      paymentStatus: "Pending",
      paidAmount: 0,
      balanceAmount: netPayable,
      enteredBy,
      remarks,
    });

    await invoice.save();

    res.status(201).json({
      success: true,
      message: "Vendor invoice created successfully",
      data: invoice,
    });
  } catch (error) {
    console.error("Error creating vendor invoice:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create vendor invoice",
      error: error.message,
    });
  }
};

// Record payment
exports.recordPayment = async (req, res) => {
  try {
    const {
      amount,
      paymentMode,
      transactionReference,
      paidBy,
      remarks,
    } = req.body;

    if (!amount || !paymentMode) {
      return res.status(400).json({
        success: false,
        message: "Please provide amount and payment mode",
      });
    }

    const invoice = await VendorInvoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    if (invoice.paymentStatus === "Paid") {
      return res.status(400).json({
        success: false,
        message: "Invoice is already fully paid",
      });
    }

    // Add payment to history
    const paymentEntry = {
      paymentDate: new Date(),
      amount,
      paymentMode,
      transactionReference,
      remarks,
    };
    
    // Only add paidBy if it's a valid ObjectId
    if (paidBy && mongoose.Types.ObjectId.isValid(paidBy)) {
      paymentEntry.paidBy = paidBy;
    }
    
    invoice.paymentHistory.push(paymentEntry);

    // Update paid amount
    invoice.paidAmount += amount;

    // Save will trigger pre-save hook to update balance and status
    await invoice.save();

    res.status(200).json({
      success: true,
      message: "Payment recorded successfully",
      data: invoice,
    });
  } catch (error) {
    console.error("Error recording payment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to record payment",
      error: error.message,
    });
  }
};

// Verify invoice
exports.verifyInvoice = async (req, res) => {
  try {
    const { verifiedBy, remarks } = req.body;

    const invoice = await VendorInvoice.findByIdAndUpdate(
      req.params.id,
      {
        verifiedBy,
        verificationDate: new Date(),
        remarks,
      },
      { new: true }
    );

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Invoice verified successfully",
      data: invoice,
    });
  } catch (error) {
    console.error("Error verifying invoice:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify invoice",
      error: error.message,
    });
  }
};

// Get all invoices
exports.getAllInvoices = async (req, res) => {
  try {
    const { vendorId, paymentStatus, startDate, endDate, includeDeleted } = req.query;

    let query = {};

    // Exclude deleted invoices by default
    if (includeDeleted !== "true") {
      query.isDeleted = { $ne: true };
    }

    if (vendorId) query.vendorId = vendorId;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    if (startDate && endDate) {
      query.invoiceDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const invoices = await VendorInvoice.find(query)
      .populate("poId", "poNumber")
      .populate("grnId", "grnNumber")
      .populate("vendorId", "vendorName vendorCode")
      .populate("enteredBy", "name employeeId")
      .populate("verifiedBy", "name employeeId")
      .populate("paymentHistory.paidBy", "name employeeId")
      .sort({ invoiceDate: -1 });

    res.status(200).json({
      success: true,
      count: invoices.length,
      data: invoices,
    });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch invoices",
      error: error.message,
    });
  }
};

// Get invoice by ID
exports.getInvoiceById = async (req, res) => {
  try {
    const invoice = await VendorInvoice.findById(req.params.id)
      .populate("poId")
      .populate("grnId")
      .populate("vendorId")
      .populate("enteredBy", "name employeeId email")
      .populate("verifiedBy", "name employeeId")
      .populate("paymentHistory.paidBy", "name employeeId");

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error("Error fetching invoice:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch invoice",
      error: error.message,
    });
  }
};

// Get pending payments
exports.getPendingPayments = async (req, res) => {
  try {
    const pendingInvoices = await VendorInvoice.find({
      paymentStatus: { $in: ["Pending", "Partial", "Overdue"] },
    })
      .populate("vendorId", "vendorName vendorCode")
      .populate("poId", "poNumber")
      .sort({ dueDate: 1 });

    // Calculate total pending amount
    const totalPending = pendingInvoices.reduce(
      (sum, inv) => sum + inv.balanceAmount,
      0
    );

    res.status(200).json({
      success: true,
      count: pendingInvoices.length,
      totalPendingAmount: totalPending,
      data: pendingInvoices,
    });
  } catch (error) {
    console.error("Error fetching pending payments:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending payments",
      error: error.message,
    });
  }
};

// Get overdue payments
exports.getOverduePayments = async (req, res) => {
  try {
    const overdueInvoices = await VendorInvoice.find({
      paymentStatus: "Overdue",
    })
      .populate("vendorId", "vendorName vendorCode contactPerson phone")
      .populate("poId", "poNumber")
      .sort({ dueDate: 1 });

    const totalOverdue = overdueInvoices.reduce(
      (sum, inv) => sum + inv.balanceAmount,
      0
    );

    res.status(200).json({
      success: true,
      count: overdueInvoices.length,
      totalOverdueAmount: totalOverdue,
      data: overdueInvoices,
    });
  } catch (error) {
    console.error("Error fetching overdue payments:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch overdue payments",
      error: error.message,
    });
  }
};

// Update invoice
exports.updateInvoice = async (req, res) => {
  try {
    const invoice = await VendorInvoice.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Invoice updated successfully",
      data: invoice,
    });
  } catch (error) {
    console.error("Error updating invoice:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update invoice",
      error: error.message,
    });
  }
};

// Soft Delete invoice
exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await VendorInvoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    if (invoice.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Invoice is already deleted",
      });
    }

    // Soft delete - mark as deleted instead of removing
    invoice.isDeleted = true;
    invoice.deletedAt = new Date();
    // invoice.deletedBy = req.user?._id; // Add this if you have auth middleware
    await invoice.save();

    res.status(200).json({
      success: true,
      message: invoice.paidAmount > 0 
        ? "Invoice marked as deleted (payments preserved for audit)" 
        : "Invoice deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete invoice",
      error: error.message,
    });
  }
};

// Restore deleted invoice
exports.restoreInvoice = async (req, res) => {
  try {
    const invoice = await VendorInvoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    if (!invoice.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Invoice is not deleted",
      });
    }

    // Restore invoice
    invoice.isDeleted = false;
    invoice.deletedAt = null;
    invoice.deletedBy = null;
    await invoice.save();

    res.status(200).json({
      success: true,
      message: "Invoice restored successfully",
      data: invoice,
    });
  } catch (error) {
    console.error("Error restoring invoice:", error);
    res.status(500).json({
      success: false,
      message: "Failed to restore invoice",
      error: error.message,
    });
  }
};
