const ProcurementInvoice = require('../model/ProcurementInvoice');

// Get all procurement invoices
exports.getAllInvoices = async (req, res) => {
  try {
    const { status, vendor, startDate, endDate } = req.query;
    let query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (vendor) {
      query.vendor = vendor;
    }
    
    if (startDate || endDate) {
      query.issueDate = {};
      if (startDate) query.issueDate.$gte = new Date(startDate);
      if (endDate) query.issueDate.$lte = new Date(endDate);
    }
    
    const invoices = await ProcurementInvoice.find(query)
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email');
      
    res.status(200).json({
      success: true,
      count: invoices.length,
      data: invoices
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching invoices',
      error: error.message
    });
  }
};

// Get a single invoice by ID
exports.getInvoiceById = async (req, res) => {
  try {
    const invoice = await ProcurementInvoice.findById(req.params.id)
      .populate('createdBy', 'name email');
      
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching invoice',
      error: error.message
    });
  }
};

// Create a new invoice
exports.createInvoice = async (req, res) => {
  try {
    const invoice = new ProcurementInvoice(req.body);
    await invoice.save();
    
    const populatedInvoice = await ProcurementInvoice.findById(invoice._id)
      .populate('createdBy', 'name email');
      
    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: populatedInvoice
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Invoice number already exists'
      });
    }
    res.status(400).json({
      success: false,
      message: 'Error creating invoice',
      error: error.message
    });
  }
};

// Update an invoice
exports.updateInvoice = async (req, res) => {
  try {
    const invoice = await ProcurementInvoice.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Invoice updated successfully',
      data: invoice
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating invoice',
      error: error.message
    });
  }
};

// Delete an invoice
exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await ProcurementInvoice.findByIdAndDelete(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Invoice deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting invoice',
      error: error.message
    });
  }
};

// Get invoice statistics
exports.getInvoiceStats = async (req, res) => {
  try {
    const stats = await ProcurementInvoice.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);
    
    const overdue = await ProcurementInvoice.countDocuments({
      status: 'pending',
      dueDate: { $lt: new Date() }
    });
    
    res.status(200).json({
      success: true,
      data: {
        byStatus: stats,
        overdueCount: overdue
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching invoice statistics',
      error: error.message
    });
  }
};

// Mark invoice as paid
exports.markAsPaid = async (req, res) => {
  try {
    const invoice = await ProcurementInvoice.findByIdAndUpdate(
      req.params.id,
      { status: 'paid' },
      { new: true, runValidators: true }
    );
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Invoice marked as paid',
      data: invoice
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating invoice status',
      error: error.message
    });
  }
};
