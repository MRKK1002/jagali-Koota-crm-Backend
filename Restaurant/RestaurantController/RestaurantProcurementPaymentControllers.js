const ProcurementPayment = require('../model/ProcurementPayment');
const ProcurementInvoice = require('../model/ProcurementInvoice');

// Get all payments
exports.getAllPayments = async (req, res) => {
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
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate);
      if (endDate) query.paymentDate.$lte = new Date(endDate);
    }
    
    const payments = await ProcurementPayment.find(query)
      .sort({ createdAt: -1 })
      .populate('invoice')
      .populate('createdBy', 'name email')
      .populate('processedBy', 'name email')
      .populate('approvedBy', 'name email');
      
    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching payments',
      error: error.message
    });
  }
};

// Get a single payment by ID
exports.getPaymentById = async (req, res) => {
  try {
    const payment = await ProcurementPayment.findById(req.params.id)
      .populate('invoice')
      .populate('createdBy', 'name email')
      .populate('processedBy', 'name email')
      .populate('approvedBy', 'name email');
      
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching payment',
      error: error.message
    });
  }
};

// Create a new payment
exports.createPayment = async (req, res) => {
  try {
    // Check if invoice exists
    if (req.body.invoice) {
      const invoice = await ProcurementInvoice.findById(req.body.invoice);
      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: 'Invoice not found'
        });
      }
    }
    
    const payment = new ProcurementPayment(req.body);
    await payment.save();
    
    // If payment is completed, update invoice status
    if (payment.status === 'completed' && payment.invoice) {
      await ProcurementInvoice.findByIdAndUpdate(
        payment.invoice,
        { status: 'paid' }
      );
    }
    
    const populatedPayment = await ProcurementPayment.findById(payment._id)
      .populate('invoice')
      .populate('createdBy', 'name email');
      
    res.status(201).json({
      success: true,
      message: 'Payment created successfully',
      data: populatedPayment
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error creating payment',
      error: error.message
    });
  }
};

// Update a payment
exports.updatePayment = async (req, res) => {
  try {
    const oldPayment = await ProcurementPayment.findById(req.params.id);
    
    const payment = await ProcurementPayment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('invoice')
      .populate('createdBy', 'name email')
      .populate('processedBy', 'name email');
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    // If payment status changed to completed, update invoice
    if (payment.status === 'completed' && oldPayment.status !== 'completed' && payment.invoice) {
      await ProcurementInvoice.findByIdAndUpdate(
        payment.invoice,
        { status: 'paid' }
      );
    }
    
    res.status(200).json({
      success: true,
      message: 'Payment updated successfully',
      data: payment
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating payment',
      error: error.message
    });
  }
};

// Delete a payment
exports.deletePayment = async (req, res) => {
  try {
    const payment = await ProcurementPayment.findByIdAndDelete(req.params.id);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Payment deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting payment',
      error: error.message
    });
  }
};

// Get payment statistics
exports.getPaymentStats = async (req, res) => {
  try {
    const stats = await ProcurementPayment.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);
    
    const byMethod = await ProcurementPayment.aggregate([
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);
    
    const scheduled = await ProcurementPayment.countDocuments({
      status: 'pending',
      scheduledDate: { $lte: new Date() }
    });
    
    res.status(200).json({
      success: true,
      data: {
        byStatus: stats,
        byMethod: byMethod,
        dueForProcessing: scheduled
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching payment statistics',
      error: error.message
    });
  }
};

// Approve a payment
exports.approvePayment = async (req, res) => {
  try {
    const payment = await ProcurementPayment.findByIdAndUpdate(
      req.params.id,
      {
        status: 'completed',
        approvalDate: new Date(),
        approvedBy: req.body.approvedBy || null
      },
      { new: true, runValidators: true }
    ).populate('invoice');
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    // Update invoice status
    if (payment.invoice) {
      await ProcurementInvoice.findByIdAndUpdate(
        payment.invoice,
        { status: 'paid' }
      );
    }
    
    res.status(200).json({
      success: true,
      message: 'Payment approved successfully',
      data: payment
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error approving payment',
      error: error.message
    });
  }
};

// Schedule a payment
exports.schedulePayment = async (req, res) => {
  try {
    const { scheduledDate } = req.body;
    
    if (!scheduledDate) {
      return res.status(400).json({
        success: false,
        message: 'Scheduled date is required'
      });
    }
    
    const payment = await ProcurementPayment.findByIdAndUpdate(
      req.params.id,
      { scheduledDate: new Date(scheduledDate) },
      { new: true, runValidators: true }
    );
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Payment scheduled successfully',
      data: payment
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error scheduling payment',
      error: error.message
    });
  }
};
