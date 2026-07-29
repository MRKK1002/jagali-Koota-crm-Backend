const VendorPayment = require("../construction/models/VendorPayment");
const VendorInvoice = require("../construction/models/VendorInvoice");

// Get all payments
exports.getAllPayments = async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;

    let query = {};

    if (status) {
      query.status = status;
    }

    if (startDate && endDate) {
      query.paymentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const payments = await VendorPayment.find(query)
      .populate({
        path: "invoiceId",
        populate: {
          path: "vendorId",
          select: "vendorName vendorCode contactPerson phone email",
        },
      })
      .sort({ paymentDate: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payments",
      error: error.message,
    });
  }
};

// Schedule a new payment
exports.schedulePayment = async (req, res) => {
  try {
    const { invoiceId, amount, paymentDate, paymentMethod, referenceNumber, notes } = req.body;

    // Validation
    if (!invoiceId || !amount || !paymentDate || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Please provide invoiceId, amount, paymentDate, and paymentMethod",
      });
    }

    // Check if invoice exists
    const invoice = await VendorInvoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    // Check if invoice is already paid
    if (invoice.status === "paid") {
      return res.status(400).json({
        success: false,
        message: "Invoice is already paid",
      });
    }

    // Create payment
    const payment = new VendorPayment({
      invoiceId,
      amount: parseFloat(amount),
      paymentDate,
      paymentMethod,
      referenceNumber: referenceNumber || "",
      notes: notes || "",
      status: "scheduled",
    });

    await payment.save();

    // Update invoice status to scheduled
    invoice.status = "scheduled";
    await invoice.save();

    // Populate payment details
    await payment.populate({
      path: "invoiceId",
      populate: {
        path: "vendorId",
        select: "vendorName vendorCode",
      },
    });

    res.status(201).json({
      success: true,
      message: "Payment scheduled successfully",
      data: payment,
    });
  } catch (error) {
    console.error("Error scheduling payment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to schedule payment",
      error: error.message,
    });
  }
};

// Get payment by ID
exports.getPaymentById = async (req, res) => {
  try {
    const payment = await VendorPayment.findById(req.params.id)
      .populate({
        path: "invoiceId",
        populate: {
          path: "vendorId",
          select: "vendorName vendorCode contactPerson phone email",
        },
      });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error("Error fetching payment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment",
      error: error.message,
    });
  }
};

// Update payment
exports.updatePayment = async (req, res) => {
  try {
    const payment = await VendorPayment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate({
      path: "invoiceId",
      populate: {
        path: "vendorId",
        select: "vendorName vendorCode",
      },
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Payment updated successfully",
      data: payment,
    });
  } catch (error) {
    console.error("Error updating payment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update payment",
      error: error.message,
    });
  }
};

// Complete payment
exports.completePayment = async (req, res) => {
  try {
    const payment = await VendorPayment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // Update payment status
    payment.status = "completed";
    await payment.save();

    // Update invoice status to paid
    const invoice = await VendorInvoice.findById(payment.invoiceId);
    if (invoice) {
      invoice.status = "paid";
      invoice.paidAmount = (invoice.paidAmount || 0) + payment.amount;
      invoice.paidDate = new Date();
      await invoice.save();
    }

    await payment.populate({
      path: "invoiceId",
      populate: {
        path: "vendorId",
        select: "vendorName vendorCode",
      },
    });

    res.status(200).json({
      success: true,
      message: "Payment completed successfully",
      data: payment,
    });
  } catch (error) {
    console.error("Error completing payment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to complete payment",
      error: error.message,
    });
  }
};

// Delete payment
exports.deletePayment = async (req, res) => {
  try {
    const payment = await VendorPayment.findByIdAndDelete(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // Update invoice status back to pending if this was the only payment
    const invoice = await VendorInvoice.findById(payment.invoiceId);
    if (invoice) {
      const remainingPayments = await VendorPayment.find({
        invoiceId: payment.invoiceId,
      });

      if (remainingPayments.length === 0) {
        invoice.status = "pending";
        await invoice.save();
      }
    }

    res.status(200).json({
      success: true,
      message: "Payment deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting payment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete payment",
      error: error.message,
    });
  }
};

// Get payments by status
exports.getPaymentsByStatus = async (req, res) => {
  try {
    const { status } = req.params;

    const payments = await VendorPayment.find({ status })
      .populate({
        path: "invoiceId",
        populate: {
          path: "vendorId",
          select: "vendorName vendorCode",
        },
      })
      .sort({ paymentDate: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    console.error("Error fetching payments by status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payments",
      error: error.message,
    });
  }
};
