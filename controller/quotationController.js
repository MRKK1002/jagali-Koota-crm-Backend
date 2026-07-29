const mongoose = require("mongoose");
const Quotation = require("../model/Quotation");
const QuotationComparison = require("../model/QuotationComparison");
const PurchaseRequest = require("../model/PurchaseRequest");

// Generate quotation number
const generateQuotationNumber = async () => {
  const prefix = "QT";
  const count = await Quotation.countDocuments();
  return `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
};

// Create quotation
exports.createQuotation = async (req, res) => {
  try {
    const {
      purchaseRequestId,
      vendorId,
      materialName,
      quantity,
      unit,
      ratePerUnit,
      gstPercentage,
      deliveryTime,
      paymentTerms,
      validityDate,
      remarks,
      createdBy,
    } = req.body;

    // Validation
    if (!purchaseRequestId || !vendorId || !materialName || !quantity || !ratePerUnit || !deliveryTime || !paymentTerms || !validityDate) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(purchaseRequestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Purchase Request ID",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Vendor ID",
      });
    }

    // Generate quotation number
    const quotationNumber = await generateQuotationNumber();

    // Calculate amounts
    const totalAmount = quantity * ratePerUnit;
    const gstAmount = (totalAmount * (gstPercentage || 18)) / 100;
    const grandTotal = totalAmount + gstAmount;

    // Create quotation
    const quotation = new Quotation({
      quotationNumber,
      purchaseRequestId,
      vendorId,
      materialName,
      quantity,
      unit,
      ratePerUnit,
      totalAmount,
      gstPercentage: gstPercentage || 18,
      gstAmount,
      grandTotal,
      deliveryTime,
      paymentTerms,
      validityDate,
      remarks,
      createdBy: mongoose.Types.ObjectId.isValid(createdBy) ? createdBy : null,
      status: "Pending",
    });

    await quotation.save();

    // Update purchase request status
    await PurchaseRequest.findByIdAndUpdate(purchaseRequestId, {
      status: "Quotation Sent",
    });

    res.status(201).json({
      success: true,
      message: "Quotation created successfully",
      data: quotation,
    });
  } catch (error) {
    console.error("Error creating quotation:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create quotation",
      error: error.message,
    });
  }
};

// Get all quotations
exports.getAllQuotations = async (req, res) => {
  try {
    const { purchaseRequestId, vendorId, status } = req.query;

    let query = {};

    if (purchaseRequestId) query.purchaseRequestId = purchaseRequestId;
    if (vendorId) query.vendorId = vendorId;
    if (status) query.status = status;

    const quotations = await Quotation.find(query)
      .populate("purchaseRequestId", "prNumber materialName")
      .populate("vendorId", "vendorName vendorCode contactPerson")
      .populate("createdBy", "name employeeId")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: quotations.length,
      data: quotations,
    });
  } catch (error) {
    console.error("Error fetching quotations:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch quotations",
      error: error.message,
    });
  }
};

// Get quotation by ID
exports.getQuotationById = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id)
      .populate("purchaseRequestId")
      .populate("vendorId")
      .populate("createdBy", "name employeeId email");

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found",
      });
    }

    res.status(200).json({
      success: true,
      data: quotation,
    });
  } catch (error) {
    console.error("Error fetching quotation:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch quotation",
      error: error.message,
    });
  }
};

// Submit quotation (vendor submits)
exports.submitQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findByIdAndUpdate(
      req.params.id,
      {
        status: "Submitted",
        submittedDate: new Date(),
      },
      { new: true }
    );

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found",
      });
    }

    // Update purchase request status
    await PurchaseRequest.findByIdAndUpdate(quotation.purchaseRequestId, {
      status: "Quotation Received",
    });

    res.status(200).json({
      success: true,
      message: "Quotation submitted successfully",
      data: quotation,
    });
  } catch (error) {
    console.error("Error submitting quotation:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit quotation",
      error: error.message,
    });
  }
};

// Create quotation comparison
exports.createQuotationComparison = async (req, res) => {
  try {
    const { purchaseRequestId, quotationIds, comparedBy } = req.body;

    if (!purchaseRequestId || !quotationIds || quotationIds.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Please provide purchase request and at least 2 quotations to compare",
      });
    }

    // Fetch all quotations
    const quotations = await Quotation.find({
      _id: { $in: quotationIds },
      purchaseRequestId,
    }).populate("vendorId");

    if (quotations.length < 2) {
      return res.status(400).json({
        success: false,
        message: "At least 2 valid quotations required for comparison",
      });
    }

    // Get purchase request details
    const purchaseRequest = await PurchaseRequest.findById(purchaseRequestId);

    // Generate comparison number
    const comparisonNumber = `QC-${new Date().getFullYear()}-${String(
      (await QuotationComparison.countDocuments()) + 1
    ).padStart(3, "0")}`;

    // Prepare quotations array for comparison
    const quotationsArray = quotations.map((q) => ({
      quotationId: q._id,
      vendorId: q.vendorId._id,
      ratePerUnit: q.ratePerUnit,
      totalAmount: q.totalAmount,
      grandTotal: q.grandTotal,
      deliveryTime: q.deliveryTime,
      paymentTerms: q.paymentTerms,
      isSelected: false,
    }));

    // Check if requires admin approval (if total > threshold)
    const maxTotal = Math.max(...quotations.map((q) => q.grandTotal));
    const requiresAdminApproval = maxTotal > 100000; // 1 lakh threshold

    // Create comparison
    const comparison = new QuotationComparison({
      comparisonNumber,
      purchaseRequestId,
      materialName: purchaseRequest.materialName,
      quantity: purchaseRequest.quantity,
      unit: purchaseRequest.unit,
      quotations: quotationsArray,
      comparedBy,
      status: "Draft",
      requiresAdminApproval,
      valueThreshold: 100000,
    });

    await comparison.save();

    // Update quotations status
    await Quotation.updateMany(
      { _id: { $in: quotationIds } },
      { status: "Under Review" }
    );

    res.status(201).json({
      success: true,
      message: "Quotation comparison created successfully",
      data: comparison,
    });
  } catch (error) {
    console.error("Error creating quotation comparison:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create quotation comparison",
      error: error.message,
    });
  }
};

// Select quotation from comparison
exports.selectQuotation = async (req, res) => {
  try {
    const { quotationId, selectionReason } = req.body;

    const comparison = await QuotationComparison.findById(req.params.id);

    if (!comparison) {
      return res.status(404).json({
        success: false,
        message: "Quotation comparison not found",
      });
    }

    // Find the selected quotation in the array
    const selectedQuotation = comparison.quotations.find(
      (q) => q.quotationId.toString() === quotationId
    );

    if (!selectedQuotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found in comparison",
      });
    }

    // Update comparison
    comparison.quotations.forEach((q) => {
      q.isSelected = q.quotationId.toString() === quotationId;
    });

    comparison.selectedQuotationId = quotationId;
    comparison.selectedVendorId = selectedQuotation.vendorId;
    comparison.selectionReason = selectionReason;
    comparison.status = comparison.requiresAdminApproval ? "Under Review" : "Approved";

    await comparison.save();

    // Update selected quotation status
    await Quotation.findByIdAndUpdate(quotationId, { status: "Selected" });

    // Update rejected quotations
    const rejectedQuotationIds = comparison.quotations
      .filter((q) => !q.isSelected)
      .map((q) => q.quotationId);

    await Quotation.updateMany(
      { _id: { $in: rejectedQuotationIds } },
      { status: "Rejected" }
    );

    res.status(200).json({
      success: true,
      message: comparison.requiresAdminApproval
        ? "Quotation selected. Awaiting admin approval."
        : "Quotation selected and approved.",
      data: comparison,
    });
  } catch (error) {
    console.error("Error selecting quotation:", error);
    res.status(500).json({
      success: false,
      message: "Failed to select quotation",
      error: error.message,
    });
  }
};

// Admin approve/reject quotation comparison
exports.approveRejectComparison = async (req, res) => {
  try {
    const { action, approvedBy, approvalRemarks } = req.body;

    const comparison = await QuotationComparison.findById(req.params.id);

    if (!comparison) {
      return res.status(404).json({
        success: false,
        message: "Quotation comparison not found",
      });
    }

    if (action === "approve") {
      comparison.status = "Approved";
      comparison.approvedBy = approvedBy;
      comparison.approvalDate = new Date();
      comparison.approvalRemarks = approvalRemarks;

      // Update purchase request status
      await PurchaseRequest.findByIdAndUpdate(comparison.purchaseRequestId, {
        status: "Quotation Approved",
      });
    } else if (action === "reject") {
      comparison.status = "Rejected";
      comparison.approvedBy = approvedBy;
      comparison.approvalDate = new Date();
      comparison.approvalRemarks = approvalRemarks;

      // Reset quotations to submitted status
      const quotationIds = comparison.quotations.map((q) => q.quotationId);
      await Quotation.updateMany(
        { _id: { $in: quotationIds } },
        { status: "Submitted" }
      );
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid action. Use 'approve' or 'reject'",
      });
    }

    await comparison.save();

    res.status(200).json({
      success: true,
      message: `Quotation comparison ${action}d successfully`,
      data: comparison,
    });
  } catch (error) {
    console.error("Error approving/rejecting comparison:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process comparison",
      error: error.message,
    });
  }
};

// Get all quotation comparisons
exports.getAllComparisons = async (req, res) => {
  try {
    const { status, purchaseRequestId } = req.query;

    let query = {};

    if (status) query.status = status;
    if (purchaseRequestId) query.purchaseRequestId = purchaseRequestId;

    const comparisons = await QuotationComparison.find(query)
      .populate("purchaseRequestId", "prNumber materialName")
      .populate("quotations.quotationId")
      .populate("quotations.vendorId", "vendorName vendorCode")
      .populate("selectedVendorId", "vendorName")
      .populate("comparedBy", "name employeeId")
      .populate("approvedBy", "name employeeId")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: comparisons.length,
      data: comparisons,
    });
  } catch (error) {
    console.error("Error fetching comparisons:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch comparisons",
      error: error.message,
    });
  }
};

// Update quotation
exports.updateQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Quotation updated successfully",
      data: quotation,
    });
  } catch (error) {
    console.error("Error updating quotation:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update quotation",
      error: error.message,
    });
  }
};

// Delete quotation
exports.deleteQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findByIdAndDelete(req.params.id);

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Quotation deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting quotation:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete quotation",
      error: error.message,
    });
  }
};
