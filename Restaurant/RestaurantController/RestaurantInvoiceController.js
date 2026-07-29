const Invoice = require('../RestautantModel/RestaurantInvoiceModel');
const PurchaseOrder = require('../RestautantModel/RestaurantPurchaseModel');
const GRN = require('../../model/GoodsReceiptNote'); // Use the correct GRN model

// Create invoice from GRN
const createInvoiceFromGRN = async (req, res) => {
  try {
    const { grnId, invoiceDate, dueDate, tax, notes, ...invoiceData } = req.body;
    
    console.log('📝 Creating invoice from GRN:', grnId);
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
    
    // Check if invoice already exists for this GRN
    const existingInvoice = await Invoice.findOne({ grn: grnId });
    if (existingInvoice) {
      return res.status(400).json({
        success: false,
        message: `Invoice already exists for this GRN (${existingInvoice.invoiceNumber})`
      });
    }
    
    // Get GRN
    const grn = await GRN.findById(grnId).populate('poId'); // Use poId, not purchaseOrder
    if (!grn) {
      return res.status(404).json({
        success: false,
        message: "GRN not found"
      });
    }
    
    console.log('✅ Found GRN:', grn.grnNumber, 'PO ID:', grn.poId);
    
    // Get PO - grn.poId might already be populated or just an ID
    let po;
    if (grn.poId) {
      // If poId is already populated (has _id property), use it directly
      if (grn.poId._id) {
        po = grn.poId;
      } else {
        // Otherwise, fetch it
        po = await PurchaseOrder.findById(grn.poId);
      }
    }
    
    if (!po) {
      return res.status(404).json({
        success: false,
        message: "Purchase Order not found for this GRN"
      });
    }
    
    console.log('✅ Found PO:', po.purchaseOrderId);
    
    // Generate invoice number
    const invoiceNumber = await Invoice.generateInvoiceNumber();
    console.log('🔢 Generated invoice number:', invoiceNumber);
    
    // Create invoice
    const invoice = new Invoice({
      invoiceNumber,
      purchaseOrder: po._id, // Use the PO's _id
      grn: grnId,
      supplier: grn.supplierId || grn.supplier, // Use supplierId if available
      supplierName: grn.supplier, // supplier field contains the name
      invoiceDate: invoiceDate || new Date(),
      dueDate,
      items: grn.items.map(item => ({
        name: item.product,
        quantity: item.receivedQty || item.quantity,
        rate: item.rate,
        amount: item.amount,
        unit: item.unit
      })),
      subtotal: grn.totalAmount,
      tax: tax || 0,
      totalAmount: (grn.totalAmount || 0) + (tax || 0),
      notes,
      ...invoiceData
    });
    
    await invoice.save();
    console.log('✅ Invoice created:', invoice.invoiceNumber);
    
    // Add invoice reference to PO
    if (!po.invoices) po.invoices = [];
    if (!po.invoices.includes(invoice._id)) {
      po.invoices.push(invoice._id);
      await po.save();
      console.log('✅ Invoice added to PO');
    }
    
    // Update GRN with invoice reference (if field exists)
    if (grn.schema.path('invoice')) {
      grn.invoice = invoice._id;
      await grn.save();
      console.log('✅ Invoice reference added to GRN');
    }
    
    res.json({
      success: true,
      message: "Invoice created successfully",
      data: invoice
    });
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({
      success: false,
      message: "Failed to create invoice",
      error: error.message
    });
  }
};

// Create invoice manually
const createInvoice = async (req, res) => {
  try {
    const { purchaseOrderId, items, ...invoiceData } = req.body;
    
    // Get PO
    const po = await PurchaseOrder.findById(purchaseOrderId);
    if (!po) {
      return res.status(404).json({
        success: false,
        message: "Purchase Order not found"
      });
    }
    
    // Generate invoice number
    const invoiceNumber = await Invoice.generateInvoiceNumber();
    
    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalAmount = subtotal + (invoiceData.tax || 0);
    
    // Create invoice
    const invoice = new Invoice({
      invoiceNumber,
      purchaseOrder: purchaseOrderId,
      supplier: po.supplier,
      supplierName: po.supplierName,
      items,
      subtotal,
      totalAmount,
      ...invoiceData
    });
    
    await invoice.save();
    
    // Add invoice reference to PO
    if (!po.invoices.includes(invoice._id)) {
      po.invoices.push(invoice._id);
      await po.save();
    }
    
    res.json({
      success: true,
      message: "Invoice created successfully",
      data: invoice
    });
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({
      success: false,
      message: "Failed to create invoice",
      error: error.message
    });
  }
};

// Get all invoices
const getInvoices = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, supplier } = req.query;
    
    const query = {};
    if (status) query.paymentStatus = status;
    if (supplier) query.supplier = supplier;
    
    const invoices = await Invoice.find(query)
      .populate('purchaseOrder', 'purchaseOrderId')
      .populate('supplier', 'name')
      .populate('grn', 'grnNumber branch') // Add branch to populate
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Invoice.countDocuments(query);
    
    res.json({
      success: true,
      data: invoices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch invoices",
      error: error.message
    });
  }
};

// Get invoice by ID
const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const invoice = await Invoice.findById(id)
      .populate('purchaseOrder')
      .populate('supplier', 'name email phone')
      .populate('grn')
      .populate('payments');
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found"
      });
    }
    
    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch invoice",
      error: error.message
    });
  }
};

// Get invoices by Purchase Order
const getInvoicesByPO = async (req, res) => {
  try {
    const { poId } = req.params;
    
    const invoices = await Invoice.find({ purchaseOrder: poId })
      .populate('grn', 'grnNumber')
      .populate('payments')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: invoices
    });
  } catch (error) {
    console.error('Error fetching invoices by PO:', error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch invoices",
      error: error.message
    });
  }
};

// Update invoice
const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const invoice = await Invoice.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found"
      });
    }
    
    res.json({
      success: true,
      message: "Invoice updated successfully",
      data: invoice
    });
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({
      success: false,
      message: "Failed to update invoice",
      error: error.message
    });
  }
};

// Delete invoice
const deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    
    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found"
      });
    }
    
    // Check if invoice has payments
    if (invoice.payments && invoice.payments.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete invoice with payments"
      });
    }
    
    await Invoice.findByIdAndDelete(id);
    
    // Remove invoice reference from PO
    const po = await PurchaseOrder.findById(invoice.purchaseOrder);
    if (po) {
      po.invoices = po.invoices.filter(invId => invId.toString() !== id);
      await po.save();
    }
    
    res.json({
      success: true,
      message: "Invoice deleted successfully"
    });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({
      success: false,
      message: "Failed to delete invoice",
      error: error.message
    });
  }
};

module.exports = {
  createInvoiceFromGRN,
  createInvoice,
  getInvoices,
  getInvoiceById,
  getInvoicesByPO,
  updateInvoice,
  deleteInvoice
};
