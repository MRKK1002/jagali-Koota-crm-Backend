const Payments = require("../model/ConstructionPayment");
const Invoices = require("../model/ConstructionSalesInvoice");

exports.createPayment = async (req, res, next) => {
  try {
    console.log("Request body:", req.body);
    const {
      invoiceId,
      amount,
      paymentDate,
      paymentMethod,
      referenceNumber,
      remarks,
    } = req.body;

    if (req.body.paymentId !== undefined) {
      return res
        .status(400)
        .json({ message: "paymentId is not allowed in request body" });
    }

    if (!invoiceId || !amount || !paymentDate || !paymentMethod) {
      return res
        .status(400)
        .json({
          message:
            "Invoice ID, amount, payment date, and payment method are required",
        });
    }

    const invoice = await Invoices.findById(invoiceId);
    if (!invoice) {
      return res.status(400).json({ message: "Invalid invoice ID" });
    }

    if (amount <= 0 || amount > invoice.outstandingAmount) {
      return res.status(400).json({ message: "Invalid payment amount" });
    }

    const payment = new Payments({
      invoiceId,
      amount,
      paymentDate,
      paymentMethod,
      referenceNumber,
      remarks,
      status: "Received",
    });

    await payment.save();

    invoice.outstandingAmount -= amount;
    invoice.paymentStatus = invoice.outstandingAmount <= 0 ? "Paid" : "Pending";
    await invoice.save();

    const populatedPayment = await Payments.findById(payment._id)
      .populate("invoiceId", "invoiceNumber clientId projectId");

    res.status(201).json(populatedPayment);
  } catch (error) {
    console.error("Error creating payment:", error);
    next(error);
  }
};

exports.getPayments = async (req, res, next) => {
  try {
    const payments = await Payments.find().populate({
      path: "invoiceId",
      select: "invoiceNumber clientId projectId",
      populate: {
        path: "clientId",
        select: "clientName contactEmail contactPhone",
      },
    });

    res.status(200).json(payments);
  } catch (error) {
    next(error);
  }
};

exports.getRecentPayments = async (req, res, next) => {
  try {
    const payments = await Payments.find()
      .sort({ paymentDate: -1 })
      .limit(5)
      .populate("invoiceId", "invoiceNumber clientId projectId");
    res.status(200).json(payments);
  } catch (error) {
    next(error);
  }
};

// Get payment by ID
exports.getPaymentById = async (req, res, next) => {
  try {
    const payment = await Payments.findById(req.params.id).populate({
      path: "invoiceId",
      select: "invoiceNumber clientId projectId",
      populate: {
        path: "clientId",
        select: "clientName contactEmail contactPhone",
      },
    });

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    res.status(200).json(payment);
  } catch (error) {
    next(error);
  }
};

// Update payment
exports.updatePayment = async (req, res, next) => {
  try {
    const { amount, paymentDate, paymentMethod, referenceNumber, remarks, status } = req.body;
    
    const payment = await Payments.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    // If amount is being changed, update invoice outstanding amount
    if (amount && amount !== payment.amount) {
      const invoice = await Invoices.findById(payment.invoiceId);
      if (invoice) {
        // Revert old amount
        invoice.outstandingAmount += payment.amount;
        // Apply new amount
        invoice.outstandingAmount -= amount;
        invoice.paymentStatus = invoice.outstandingAmount <= 0 ? "Paid" : "Pending";
        await invoice.save();
      }
    }

    // Update payment fields
    if (amount) payment.amount = amount;
    if (paymentDate) payment.paymentDate = paymentDate;
    if (paymentMethod) payment.paymentMethod = paymentMethod;
    if (referenceNumber) payment.referenceNumber = referenceNumber;
    if (remarks) payment.remarks = remarks;
    if (status) payment.status = status;

    await payment.save();

    const updatedPayment = await Payments.findById(payment._id).populate({
      path: "invoiceId",
      select: "invoiceNumber clientId projectId",
      populate: {
        path: "clientId",
        select: "clientName contactEmail contactPhone",
      },
    });

    res.status(200).json(updatedPayment);
  } catch (error) {
    next(error);
  }
};

// Delete payment
exports.deletePayment = async (req, res, next) => {
  try {
    const payment = await Payments.findById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    // Update invoice outstanding amount
    const invoice = await Invoices.findById(payment.invoiceId);
    if (invoice) {
      invoice.outstandingAmount += payment.amount;
      invoice.paymentStatus = invoice.outstandingAmount <= 0 ? "Paid" : "Pending";
      await invoice.save();
    }

    await Payments.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Payment deleted successfully" });
  } catch (error) {
    next(error);
  }
};
