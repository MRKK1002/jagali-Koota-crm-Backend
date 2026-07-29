const mongoose = require("mongoose");
const PurchaseOrder = require("../construction/models/PurchaseOrder");
const PurchaseRequest = require("../construction/models/PurchaseRequest");
const Quotation = require("../construction/models/Quotation");

// Generate PO number
const generatePONumber = async () => {
  const prefix = "PO";
  const count = await PurchaseOrder.countDocuments();
  return `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
};

// Create Purchase Order from approved quotation
exports.createPurchaseOrder = async (req, res) => {
  try {
    console.log("📥 Received PO creation request");
    console.log("Request body keys:", Object.keys(req.body));
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    console.log("Request method:", req.method);
    console.log("Request URL:", req.url);
    
    const {
      purchaseRequestId,
      quotationId,
      vendorId,
      siteId,
      deliveryAddress,
      termsAndConditions,
      remarks,
      createdBy,
      indentId, // Optional: if provided, we can auto-create PR
      // Restaurant-style fields
      branch,
      supplierId,
      storeLocation,
      storeLocationId,
      storeType,
      items,
      orderDate,
      deliveryDate,
      subtotal,
      tax,
      taxRate,
      total,
      paymentTerms,
      status,
      notes,
    } = req.body;

    // Check if this is a restaurant-style purchase order
    // Restaurant PO has branch/supplierId/items but no quotationId
    // More robust check: ensure construction fields are truly missing (not just empty strings)
    const hasRestaurantFields = (branch && (branch.id || branch._id)) || supplierId || (items && Array.isArray(items) && items.length > 0);
    // Check if construction fields exist and are not empty
    const hasQuotationId = quotationId && quotationId !== '' && quotationId !== null && quotationId !== undefined;
    const hasVendorSiteDelivery = vendorId && vendorId !== '' && vendorId !== null && vendorId !== undefined &&
                                  siteId && siteId !== '' && siteId !== null && siteId !== undefined &&
                                  deliveryAddress && deliveryAddress !== '' && deliveryAddress !== null && deliveryAddress !== undefined;
    const hasConstructionFields = hasQuotationId || hasVendorSiteDelivery;
    const isRestaurantPO = hasRestaurantFields && !hasConstructionFields;
    
    console.log("🔍 Checking PO type:");
    console.log("  branch:", branch ? JSON.stringify(branch).substring(0, 200) : "missing");
    console.log("  branch.id:", branch?.id);
    console.log("  branch._id:", branch?._id);
    console.log("  supplierId:", supplierId);
    console.log("  items:", items ? `${Array.isArray(items) ? items.length : 'not array'} items` : "missing");
    console.log("  quotationId:", quotationId, typeof quotationId);
    console.log("  vendorId:", vendorId, typeof vendorId);
    console.log("  siteId:", siteId, typeof siteId);
    console.log("  deliveryAddress:", deliveryAddress, typeof deliveryAddress);
    console.log("  hasRestaurantFields:", hasRestaurantFields);
    console.log("  hasQuotationId:", hasQuotationId);
    console.log("  hasVendorSiteDelivery:", hasVendorSiteDelivery);
    console.log("  hasConstructionFields:", hasConstructionFields);
    console.log("  isRestaurantPO:", isRestaurantPO);

    if (isRestaurantPO) {
      console.log("✅ Detected Restaurant-style PO");
      // Restaurant-style validation
      if (!supplierId) {
        console.log("❌ Missing supplierId");
        return res.status(400).json({
          success: false,
          message: "Please provide supplierId",
        });
      }
      if (!branch || (!branch.id && !branch._id)) {
        console.log("❌ Missing branch or branch.id");
        return res.status(400).json({
          success: false,
          message: "Please provide branch with id",
        });
      }
      if (!items || !Array.isArray(items) || items.length === 0) {
        console.log("❌ Missing items array");
        return res.status(400).json({
          success: false,
          message: "Please provide items array",
        });
      }

      // Validate and extract branch ID
      const branchId = branch?.id || branch?._id || (typeof branch === 'string' ? branch : null);
      console.log("Extracted branchId:", branchId);
      if (!branchId || !mongoose.Types.ObjectId.isValid(branchId)) {
        console.log("❌ Invalid Branch ID:", branchId);
        return res.status(400).json({
          success: false,
          message: `Invalid Branch ID: ${branchId}`,
        });
      }

      if (!mongoose.Types.ObjectId.isValid(supplierId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid Supplier ID",
        });
      }

      // Generate PO number
      const poNumber = await generatePONumber();

      // Calculate totals from items if not provided
      let finalSubtotal = subtotal || 0;
      let finalTax = tax || 0;
      let finalTotal = total || 0;

      if (!subtotal && items && items.length > 0) {
        finalSubtotal = items.reduce((sum, item) => sum + (item.amount || item.quantity * (item.rate || item.unitPrice || 0)), 0);
      }
      if (!tax && taxRate && finalSubtotal) {
        finalTax = (finalSubtotal * taxRate) / 100;
      }
      if (!total) {
        finalTotal = finalSubtotal + finalTax;
      }

      // Check if approval is required (threshold: ₹1,00,000)
      const approvalThreshold = 100000;
      const requiresApproval = finalTotal > approvalThreshold;
      const initialStatus = status || (requiresApproval ? "Pending Approval" : "Pending");

      // For restaurant POs, we need to handle purchaseRequestId and quotationId
      // Since they're required by schema but don't exist for restaurant orders,
      // we'll create minimal dummy records that can be reused
      
      let dummyPRId, dummyQuotationId;
      
      try {
        console.log("🔧 Creating/finding dummy PR and Quotation records...");
        
        // Check if dummy PR exists, create if not
        let existingPR = await PurchaseRequest.findOne({ prNumber: 'RESTAURANT-DUMMY-PR' });
        if (!existingPR) {
          console.log("Creating dummy PurchaseRequest...");
          existingPR = new PurchaseRequest({
            prNumber: 'RESTAURANT-DUMMY-PR',
            siteId: branchId,
            materialName: 'Restaurant Purchase Order',
            quantity: 1,
            unit: 'pcs',
            priority: 'Low',
            status: 'PO Created',
            remarks: 'Dummy PR for restaurant purchase orders',
          });
          await existingPR.save();
          console.log("✅ Dummy PR created:", existingPR._id);
        } else {
          console.log("✅ Using existing dummy PR:", existingPR._id);
        }
        dummyPRId = existingPR._id;
        
        // Check if dummy Quotation exists, create if not
        let existingQuotation = await Quotation.findOne({ quotationNumber: 'RESTAURANT-DUMMY-QT' });
        if (!existingQuotation) {
          console.log("Creating dummy Quotation...");
          existingQuotation = new Quotation({
            quotationNumber: 'RESTAURANT-DUMMY-QT',
            vendorId: supplierId,
            siteId: branchId,
            materialName: 'Restaurant Purchase Order',
            quantity: 1,
            unit: 'pcs',
            ratePerUnit: 0,
            totalAmount: 0,
            gstPercentage: 0,
            gstAmount: 0,
            grandTotal: 0,
            deliveryTime: '0 days',
            paymentTerms: 'Net 30 days',
            status: 'Selected',
            remarks: 'Dummy Quotation for restaurant purchase orders',
          });
          await existingQuotation.save();
          console.log("✅ Dummy Quotation created:", existingQuotation._id);
        } else {
          console.log("✅ Using existing dummy Quotation:", existingQuotation._id);
        }
        dummyQuotationId = existingQuotation._id;
      } catch (error) {
        console.error("❌ Error creating dummy records:", error.message);
        console.error("Error stack:", error.stack);
        return res.status(500).json({
          success: false,
          message: "Failed to create purchase order: " + error.message,
          error: error.message,
        });
      }

      // Create Purchase Order for restaurant
      const purchaseOrder = new PurchaseOrder({
        poNumber,
        purchaseRequestId: dummyPRId, // Dummy ID - required by schema
        quotationId: dummyQuotationId, // Dummy ID - required by schema
        vendorId: supplierId, // Map supplierId to vendorId
        siteId: branchId, // Map branchId to siteId
        materialName: items.map(item => item.name || item.itemName).join(", "), // Combine item names
        quantity: items.reduce((sum, item) => sum + (item.quantity || 0), 0),
        unit: "pcs",
        ratePerUnit: finalSubtotal / (items.reduce((sum, item) => sum + (item.quantity || 0), 0) || 1),
        totalAmount: finalSubtotal,
        gstPercentage: taxRate || 5,
        gstAmount: finalTax,
        grandTotal: finalTotal,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : new Date(),
        deliveryAddress: (branch?.address && typeof branch.address === 'string' ? branch.address : (typeof branch.address === 'object' ? JSON.stringify(branch.address) : null)) || storeLocation?.address || (branch?.name || "Restaurant Branch"),
        paymentTerms: paymentTerms || "Net 30 days",
        termsAndConditions: termsAndConditions || "",
        remarks: notes || remarks || "",
        status: initialStatus,
        requiresApproval,
        approvalThreshold,
        poDate: orderDate ? new Date(orderDate) : new Date(),
        createdBy: (createdBy && mongoose.Types.ObjectId.isValid(createdBy)) ? createdBy : null,
        // Store restaurant-specific data in remarks or as additional fields
        // Note: The schema doesn't have branch/storeLocation fields, so we'll store them in remarks
        // For a proper solution, you'd need to extend the schema
      });

      await purchaseOrder.save();

      res.status(201).json({
        success: true,
        message: requiresApproval 
          ? "Purchase Order created and sent for admin approval (high value)"
          : "Purchase Order created successfully",
        data: purchaseOrder,
        requiresApproval,
      });
      return;
    }

    // Construction-style validation (original logic)
    // Only validate if this is NOT a restaurant PO (double-check)
    if (!isRestaurantPO && (!quotationId || !vendorId || !siteId || !deliveryAddress)) {
      console.log("❌ Missing required construction fields");
      console.log("quotationId:", quotationId);
      console.log("vendorId:", vendorId);
      console.log("siteId:", siteId);
      console.log("deliveryAddress:", deliveryAddress);
      console.log("⚠️ This might be a restaurant PO that wasn't detected correctly!");
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields (quotationId, vendorId, siteId, deliveryAddress) OR restaurant fields (supplierId, branch, items)",
      });
    }
    
    // If we reach here and it's not a restaurant PO, proceed with construction logic
    if (!isRestaurantPO) {
      console.log("📋 Processing as Construction-style PO");
    }

    // Handle purchaseRequestId - if not provided but indentId is, create PR
    let finalPurchaseRequestId = purchaseRequestId;
    
    console.log("purchaseRequestId:", purchaseRequestId);
    console.log("indentId:", indentId);
    
    if (!finalPurchaseRequestId && indentId) {
      console.log("🔄 Auto-creating purchase request from indent");
      // Auto-create purchase request from indent
      const Indent = require("../model/Indent");
      const indent = await Indent.findById(indentId);
      
      if (indent) {
        console.log("✅ Indent found:", indent.indentNumber);
        // Check if PR already exists for this indent
        let existingPR = await PurchaseRequest.findOne({ indentId: indent._id });
        
        if (!existingPR) {
          console.log("Creating new PR...");
          // Create new PR
          let prNumber;
          let prExists = true;
          let counter = (await PurchaseRequest.countDocuments()) + 1;
          
          while (prExists) {
            prNumber = `PR-${new Date().getFullYear()}-${String(counter).padStart(3, "0")}`;
            const existing = await PurchaseRequest.findOne({ prNumber });
            if (!existing) {
              prExists = false;
            } else {
              counter++;
            }
          }

          existingPR = new PurchaseRequest({
            prNumber,
            indentId: indent._id,
            siteId: indent.siteId,
            materialName: indent.materialName,
            quantity: indent.quantity,
            unit: indent.unit,
            priority: indent.priority || "Medium",
            requiredBy: indent.expectedDate,
            status: "Pending Quotation",
            remarks: `Auto-created from indent ${indent.indentNumber} during PO creation`,
          });

          await existingPR.save();
          console.log("✅ PR created:", existingPR.prNumber);
          
          // Update indent with PR ID
          await Indent.findByIdAndUpdate(indent._id, {
            purchaseRequestId: existingPR._id,
          });
        } else {
          console.log("✅ Using existing PR:", existingPR.prNumber);
        }
        
        finalPurchaseRequestId = existingPR._id;
      } else {
        console.log("❌ Indent not found");
      }
    }

    console.log("Final purchaseRequestId:", finalPurchaseRequestId);

    // Now validate purchaseRequestId
    if (!finalPurchaseRequestId) {
      console.log("❌ No purchase request ID available");
      return res.status(400).json({
        success: false,
        message: "Purchase Request ID is required. Please provide purchaseRequestId or indentId.",
      });
    }

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(finalPurchaseRequestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Purchase Request ID",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(quotationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Quotation ID",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Vendor ID",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(siteId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Site ID",
      });
    }

    // Get quotation details
    const quotation = await Quotation.findById(quotationId).populate("siteId");

    if (!quotation || (quotation.status !== "Selected" && quotation.status !== "Submitted")) {
      return res.status(400).json({
        success: false,
        message: "Quotation must be submitted or selected first",
      });
    }

    // Use siteId from quotation (auto-populated from purchase request/indent)
    const finalSiteId = quotation.siteId?._id || quotation.siteId;

    // Generate PO number
    const poNumber = await generatePONumber();

    // Calculate delivery date (add delivery time to current date)
    const deliveryDays = parseInt(quotation.deliveryTime.match(/\d+/)?.[0]) || 7;
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + deliveryDays);

    // Check if approval is required (threshold: ₹1,00,000)
    const approvalThreshold = 100000;
    const requiresApproval = quotation.grandTotal > approvalThreshold;
    const initialStatus = requiresApproval ? "Pending Approval" : "Draft";

    // Create Purchase Order
    const purchaseOrder = new PurchaseOrder({
      poNumber,
      purchaseRequestId: finalPurchaseRequestId,
      quotationId,
      vendorId,
      siteId: finalSiteId, // Use siteId from quotation
      materialName: quotation.materialName,
      quantity: quotation.quantity,
      unit: quotation.unit,
      ratePerUnit: quotation.ratePerUnit,
      totalAmount: quotation.totalAmount,
      gstPercentage: quotation.gstPercentage || 18,
      gstAmount: quotation.gstAmount,
      grandTotal: quotation.grandTotal,
      deliveryDate,
      deliveryAddress,
      paymentTerms: quotation.paymentTerms || "Net 30 days",
      termsAndConditions: termsAndConditions || "Standard terms and conditions apply",
      remarks: remarks || "",
      status: initialStatus,
      requiresApproval,
      approvalThreshold,
      createdBy: (createdBy && mongoose.Types.ObjectId.isValid(createdBy)) ? createdBy : null,
    });

    await purchaseOrder.save();

    // Update purchase request status
    await PurchaseRequest.findByIdAndUpdate(finalPurchaseRequestId, {
      status: "PO Created",
    });

    const message = requiresApproval 
      ? "Purchase Order created and sent for admin approval (high value)"
      : "Purchase Order created successfully";

    res.status(201).json({
      success: true,
      message,
      data: purchaseOrder,
      requiresApproval,
    });
  } catch (error) {
    console.error("❌ Error creating purchase order:", error);
    console.error("Error stack:", error.stack);
    console.error("Error details:", {
      message: error.message,
      name: error.name,
      code: error.code,
    });
    res.status(500).json({
      success: false,
      message: "Failed to create purchase order: " + error.message,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

// Approve Purchase Order
exports.approvePurchaseOrder = async (req, res) => {
  try {
    const { approvedBy, remarks } = req.body;

    const purchaseOrder = await PurchaseOrder.findById(req.params.id);

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: "Purchase Order not found",
      });
    }

    if (purchaseOrder.status !== "Draft" && purchaseOrder.status !== "Pending Approval") {
      return res.status(400).json({
        success: false,
        message: "Purchase Order is not in draft or pending approval status",
      });
    }

    purchaseOrder.status = "Approved";
    // Only set approvedBy if it's a valid ObjectId
    if (approvedBy && mongoose.Types.ObjectId.isValid(approvedBy)) {
      purchaseOrder.approvedBy = approvedBy;
    }
    purchaseOrder.approvalDate = new Date();
    if (remarks) purchaseOrder.remarks = remarks;

    await purchaseOrder.save();

    res.status(200).json({
      success: true,
      message: "Purchase Order approved successfully",
      data: purchaseOrder,
    });
  } catch (error) {
    console.error("Error approving purchase order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to approve purchase order",
      error: error.message,
    });
  }
};

// Send PO to Vendor
exports.sendPOToVendor = async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.findById(req.params.id)
      .populate("vendorId")
      .populate("siteId");

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: "Purchase Order not found",
      });
    }

    if (purchaseOrder.status !== "Approved") {
      return res.status(400).json({
        success: false,
        message: "Purchase Order must be approved first",
      });
    }

    purchaseOrder.status = "Sent to Vendor";
    purchaseOrder.sentToVendorDate = new Date();

    await purchaseOrder.save();

    // Here you can add email/SMS notification logic to vendor

    res.status(200).json({
      success: true,
      message: "Purchase Order sent to vendor successfully",
      data: purchaseOrder,
    });
  } catch (error) {
    console.error("Error sending PO to vendor:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send PO to vendor",
      error: error.message,
    });
  }
};

// Vendor acknowledges PO
exports.acknowledgePO = async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.findById(req.params.id);

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: "Purchase Order not found",
      });
    }

    purchaseOrder.status = "Acknowledged";
    purchaseOrder.acknowledgedDate = new Date();

    await purchaseOrder.save();

    res.status(200).json({
      success: true,
      message: "Purchase Order acknowledged successfully",
      data: purchaseOrder,
    });
  } catch (error) {
    console.error("Error acknowledging PO:", error);
    res.status(500).json({
      success: false,
      message: "Failed to acknowledge PO",
      error: error.message,
    });
  }
};

// Get all Purchase Orders
exports.getAllPurchaseOrders = async (req, res) => {
  try {
    const { status, vendorId, siteId, startDate, endDate } = req.query;

    let query = {};

    if (status) query.status = status;
    if (vendorId) query.vendorId = vendorId;
    if (siteId) query.siteId = siteId;

    if (startDate && endDate) {
      query.poDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const purchaseOrders = await PurchaseOrder.find(query)
      .populate("purchaseRequestId", "prNumber")
      .populate("quotationId", "quotationNumber")
      .populate("vendorId", "vendorName vendorCode contactPerson phone")
      .populate("siteId", "siteName siteCode")
      .populate("createdBy", "name employeeId")
      .populate("approvedBy", "name employeeId")
      .sort({ poDate: -1 });

    res.status(200).json({
      success: true,
      count: purchaseOrders.length,
      data: purchaseOrders,
    });
  } catch (error) {
    console.error("Error fetching purchase orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch purchase orders",
      error: error.message,
    });
  }
};

// Get Purchase Order by ID
exports.getPurchaseOrderById = async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.findById(req.params.id)
      .populate("purchaseRequestId")
      .populate("quotationId")
      .populate("vendorId")
      .populate("siteId")
      .populate("createdBy", "name employeeId email")
      .populate("approvedBy", "name employeeId");

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: "Purchase Order not found",
      });
    }

    res.status(200).json({
      success: true,
      data: purchaseOrder,
    });
  } catch (error) {
    console.error("Error fetching purchase order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch purchase order",
      error: error.message,
    });
  }
};

// Update Purchase Order
exports.updatePurchaseOrder = async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: "Purchase Order not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Purchase Order updated successfully",
      data: purchaseOrder,
    });
  } catch (error) {
    console.error("Error updating purchase order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update purchase order",
      error: error.message,
    });
  }
};

// Cancel Purchase Order
exports.cancelPurchaseOrder = async (req, res) => {
  try {
    const { remarks } = req.body;

    const purchaseOrder = await PurchaseOrder.findById(req.params.id);

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: "Purchase Order not found",
      });
    }

    if (purchaseOrder.status === "Completed") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel completed purchase order",
      });
    }

    purchaseOrder.status = "Cancelled";
    if (remarks) purchaseOrder.remarks = remarks;

    await purchaseOrder.save();

    res.status(200).json({
      success: true,
      message: "Purchase Order cancelled successfully",
      data: purchaseOrder,
    });
  } catch (error) {
    console.error("Error cancelling purchase order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel purchase order",
      error: error.message,
    });
  }
};

// Delete Purchase Order
exports.deletePurchaseOrder = async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.findByIdAndDelete(req.params.id);

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: "Purchase Order not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Purchase Order deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting purchase order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete purchase order",
      error: error.message,
    });
  }
};


// Admin: Approve High-Value Purchase Order
exports.adminApprovePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalRemarks } = req.body;

    const purchaseOrder = await PurchaseOrder.findById(id);

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
    }

    if (purchaseOrder.status !== "Pending Approval") {
      return res.status(400).json({
        success: false,
        message: "Purchase order is not pending approval",
      });
    }

    // Update PO status
    purchaseOrder.status = "Approved";
    purchaseOrder.approvedBy = req.user?.id || null;
    purchaseOrder.approvedAt = new Date();
    purchaseOrder.approvalRemarks = approvalRemarks || "";

    await purchaseOrder.save();

    // Populate for response
    await purchaseOrder.populate([
      { path: "vendorId", select: "name email phone" },
      { path: "quotationId", select: "quotationNumber" },
      { path: "approvedBy", select: "name email" },
    ]);

    res.status(200).json({
      success: true,
      message: "Purchase order approved successfully",
      data: purchaseOrder,
    });
  } catch (error) {
    console.error("Error approving purchase order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to approve purchase order",
      error: error.message,
    });
  }
};

// Admin: Reject Purchase Order
exports.rejectPurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionRemarks } = req.body;

    if (!rejectionRemarks) {
      return res.status(400).json({
        success: false,
        message: "Rejection remarks are required",
      });
    }

    const purchaseOrder = await PurchaseOrder.findById(id);

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
    }

    if (purchaseOrder.status !== "Pending Approval") {
      return res.status(400).json({
        success: false,
        message: "Purchase order is not pending approval",
      });
    }

    // Update PO status
    purchaseOrder.status = "Rejected";
    purchaseOrder.rejectedBy = req.user?.id || null;
    purchaseOrder.rejectedAt = new Date();
    purchaseOrder.rejectionRemarks = rejectionRemarks;

    await purchaseOrder.save();

    // Populate for response
    await purchaseOrder.populate([
      { path: "vendorId", select: "name email phone" },
      { path: "quotationId", select: "quotationNumber" },
      { path: "rejectedBy", select: "name email" },
    ]);

    res.status(200).json({
      success: true,
      message: "Purchase order rejected",
      data: purchaseOrder,
    });
  } catch (error) {
    console.error("Error rejecting purchase order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reject purchase order",
      error: error.message,
    });
  }
};

// Get Purchase Orders Pending Approval
exports.getPendingApprovalPOs = async (req, res) => {
  try {
    const pendingPOs = await PurchaseOrder.find({ status: "Pending Approval" })
      .populate("vendorId", "name email phone")
      .populate("quotationId", "quotationNumber")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: pendingPOs.length,
      data: pendingPOs,
    });
  } catch (error) {
    console.error("Error fetching pending approval POs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending approval POs",
      error: error.message,
    });
  }
};

// Auto-close PO after payment
exports.closePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { closureRemarks } = req.body;

    const purchaseOrder = await PurchaseOrder.findById(id);

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
    }

    // Check if all invoices are paid
    const VendorInvoice = require("../model/VendorInvoice");
    const unpaidInvoices = await VendorInvoice.find({
      purchaseOrderId: id,
      paymentStatus: { $ne: "Paid" },
    });

    if (unpaidInvoices.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot close PO. There are unpaid invoices.",
        unpaidCount: unpaidInvoices.length,
      });
    }

    // Update PO status
    purchaseOrder.status = "Completed";
    purchaseOrder.completedAt = new Date();
    purchaseOrder.closureRemarks = closureRemarks || "Auto-closed after payment completion";

    await purchaseOrder.save();

    res.status(200).json({
      success: true,
      message: "Purchase order closed successfully",
      data: purchaseOrder,
    });
  } catch (error) {
    console.error("Error closing purchase order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to close purchase order",
      error: error.message,
    });
  }
};
