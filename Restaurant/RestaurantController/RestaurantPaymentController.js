const Payment = require('../RestautantModel/RestaurantPaymentModel');
const Invoice = require('../RestautantModel/RestaurantInvoiceModel');
const PurchaseOrder = require('../RestautantModel/RestaurantPurchaseModel');

// Create payment
const createPayment = async (req, res) => {
  try {
    const { invoiceId, paidAmount, paymentMethod, reference, notes, ...paymentData } = req.body;
    
    // Get invoice
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found"
      });
    }
    
    // Validate payment amount
    if (paidAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Payment amount must be greater than 0"
      });
    }
    
    if (paidAmount > invoice.pendingAmount) {
      return res.status(400).json({
        success: false,
        message: `Payment amount (₹${paidAmount}) exceeds pending amount (₹${invoice.pendingAmount})`
      });
    }
    
    // Determine payment type
    const paymentType = paidAmount >= invoice.pendingAmount ? 'Full' : 'Partial';
    
    // Generate payment number
    const paymentNumber = await Payment.generatePaymentNumber();
    
    // Create payment
    const payment = new Payment({
      paymentNumber,
      invoice: invoiceId,
      purchaseOrder: invoice.purchaseOrder,
      supplier: invoice.supplier,
      supplierName: invoice.supplierName,
      invoiceAmount: invoice.totalAmount,
      paidAmount,
      paymentMethod,
      paymentType,
      reference,
      notes,
      ...paymentData
    });
    
    await payment.save();
    
    // Update invoice
    invoice.paidAmount = (invoice.paidAmount || 0) + paidAmount;
    invoice.updatePaymentStatus();
    invoice.payments.push(payment._id);
    await invoice.save();
    
    // Update PO
    const po = await PurchaseOrder.findById(invoice.purchaseOrder);
    if (po) {
      po.paidAmount = (po.paidAmount || 0) + paidAmount;
      po.updatePaymentStatus();
      if (!po.payments.includes(payment._id)) {
        po.payments.push(payment._id);
      }
      await po.save();
    }
    
    res.json({
      success: true,
      message: "Payment recorded successfully",
      data: {
        payment,
        invoice: {
          paymentStatus: invoice.paymentStatus,
          paidAmount: invoice.paidAmount,
          pendingAmount: invoice.pendingAmount
        },
        po: po ? {
          paymentStatus: po.paymentStatus,
          paymentPercentage: po.paymentPercentage,
          paidAmount: po.paidAmount,
          pendingAmount: po.pendingAmount
        } : null
      }
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({
      success: false,
      message: "Failed to record payment",
      error: error.message
    });
  }
};

// Get all payments
const getPayments = async (req, res) => {
  try {
    const { page = 1, limit = 10, supplier, paymentMethod, status } = req.query;
    
    const query = {};
    if (supplier) query.supplier = supplier;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (status) query.status = status;
    
    const payments = await Payment.find(query)
      .populate('invoice', 'invoiceNumber totalAmount')
      .populate('purchaseOrder', 'purchaseOrderId')
      .populate('supplier', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Payment.countDocuments(query);
    
    res.json({
      success: true,
      data: payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payments",
      error: error.message
    });
  }
};

// Get payment by ID
const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const payment = await Payment.findById(id)
      .populate('invoice')
      .populate('purchaseOrder')
      .populate('supplier', 'name email phone');
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found"
      });
    }
    
    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment",
      error: error.message
    });
  }
};

// Get payments by invoice
const getPaymentsByInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    
    const payments = await Payment.find({ invoice: invoiceId })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error('Error fetching payments by invoice:', error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payments",
      error: error.message
    });
  }
};

// Get payments by Purchase Order
const getPaymentsByPO = async (req, res) => {
  try {
    const { poId } = req.params;
    
    const payments = await Payment.find({ purchaseOrder: poId })
      .populate('invoice', 'invoiceNumber')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error('Error fetching payments by PO:', error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payments",
      error: error.message
    });
  }
};

// Update payment
const updatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Don't allow updating payment amount after creation
    delete updateData.paidAmount;
    delete updateData.invoiceAmount;
    
    const payment = await Payment.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found"
      });
    }
    
    res.json({
      success: true,
      message: "Payment updated successfully",
      data: payment
    });
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({
      success: false,
      message: "Failed to update payment",
      error: error.message
    });
  }
};

// Delete payment (reverse payment)
const deletePayment = async (req, res) => {
  try {
    const { id } = req.params;
    
    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found"
      });
    }
    
    // Get invoice and PO
    const invoice = await Invoice.findById(payment.invoice);
    const po = await PurchaseOrder.findById(payment.purchaseOrder);
    
    // Reverse payment amounts
    if (invoice) {
      invoice.paidAmount = Math.max(0, (invoice.paidAmount || 0) - payment.paidAmount);
      invoice.updatePaymentStatus();
      invoice.payments = invoice.payments.filter(payId => payId.toString() !== id);
      await invoice.save();
    }
    
    if (po) {
      po.paidAmount = Math.max(0, (po.paidAmount || 0) - payment.paidAmount);
      po.updatePaymentStatus();
      po.payments = po.payments.filter(payId => payId.toString() !== id);
      await po.save();
    }
    
    // Delete payment
    await Payment.findByIdAndDelete(id);
    
    res.json({
      success: true,
      message: "Payment reversed successfully",
      data: {
        invoice: invoice ? {
          paymentStatus: invoice.paymentStatus,
          paidAmount: invoice.paidAmount,
          pendingAmount: invoice.pendingAmount
        } : null,
        po: po ? {
          paymentStatus: po.paymentStatus,
          paymentPercentage: po.paymentPercentage
        } : null
      }
    });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({
      success: false,
      message: "Failed to reverse payment",
      error: error.message
    });
  }
};

// Get payment statistics
const getPaymentStats = async (req, res) => {
  try {
    const stats = await Payment.aggregate([
      {
        $group: {
          _id: null,
          totalPayments: { $sum: 1 },
          totalAmount: { $sum: '$paidAmount' },
          avgPayment: { $avg: '$paidAmount' }
        }
      }
    ]);
    
    const paymentsByMethod = await Payment.aggregate([
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          amount: { $sum: '$paidAmount' }
        }
      }
    ]);
    
    const paymentsByStatus = await Payment.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          amount: { $sum: '$paidAmount' }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        overview: stats[0] || { totalPayments: 0, totalAmount: 0, avgPayment: 0 },
        byMethod: paymentsByMethod,
        byStatus: paymentsByStatus
      }
    });
  } catch (error) {
    console.error('Error fetching payment stats:', error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment statistics",
      error: error.message
    });
  }
};

module.exports = {
  createPayment,
  getPayments,
  getPaymentById,
  getPaymentsByInvoice,
  getPaymentsByPO,
  updatePayment,
  deletePayment,
  getPaymentStats
};
