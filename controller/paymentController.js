const Payments = require("../model/Payment") // Assuming this is the correct Payment model
const Invoices = require("../model/ConstructionSalesInvoice")
const Invoice = require('../model/Invoice'); // Assuming ConstructionSalesInvoice is the correct Invoice model

exports.createPayment = async (req, res, next) => {
  try {
    console.log("Request body:", req.body)
    const {
      invoiceId,
      amount,
      paymentDate,
      paymentMethod, // Frontend sends paymentMethod, backend expects paymentMode
      referenceNumber,
      remarks, // Frontend sends description, backend expects remarks
    } = req.body

    // Validate required fields
    if (!invoiceId || !amount || !paymentDate || !paymentMethod) {
      return res.status(400).json({
        message: "Invoice ID, amount, payment date, and payment method are required",
      })
    }

    // Check if paymentId is accidentally sent in create request
    if (req.body.paymentId !== undefined) {
      return res.status(400).json({ message: "paymentId is not allowed in create request body" })
    }

    const invoice = await Invoices.findById(invoiceId)
    if (!invoice) {
      return res.status(400).json({ message: "Invalid invoice ID" })
    }

    if (amount <= 0 || amount > invoice.outstandingAmount) {
      return res.status(400).json({ message: "Invalid payment amount" })
    }

    const payment = new Payments({
      invoiceId,
      amount,
      paymentDate,
      paymentMethod, // Use paymentMethod directly as it matches the model enum
      referenceNumber,
      description: remarks, // Map backend 'remarks' to frontend 'description' for consistency
      status: "Received", // Default status for new payments
      // The Payment model has 'customer' and 'businessType' fields, but they are not populated by this controller.
      // If needed, they should be added to the request body and handled here.
    })

    await payment.save()

    // Update invoice outstanding amount and status
    invoice.outstandingAmount -= amount
    invoice.paymentStatus = invoice.outstandingAmount <= 0 ? "Paid" : "Partial" // Changed from "Pending" to "Partial" for clarity
    await invoice.save()

    const populatedPayment = await Payments.findById(payment._id).populate(
      "invoiceId",
      "invoiceNumber clientId projectId",
    ) // Populate invoice details

    res.status(201).json(populatedPayment)
  } catch (error) {
    console.error("Error creating payment:", error)
    next(error)
  }
}

exports.getPayments = async (req, res, next) => {
  try {
    const payments = await Payments.find().populate({
      path: "invoiceId",
      select: "invoiceNumber clientId projectId vendorId", // Added vendorId to populate if needed for frontend display
      populate: {
        path: "clientId",
        select: "clientName contactEmail contactPhone",
      },
    })
    res.status(200).json(payments)
  } catch (error) {
    next(error)
  }
}

exports.getRecentPayments = async (req, res, next) => {
  try {
    const payments = await Payments.find()
      .sort({ paymentDate: -1 })
      .limit(5)
      .populate("invoiceId", "invoiceNumber clientId projectId")
    res.status(200).json(payments)
  } catch (error) {
    next(error)
  }
}

// Placeholder for updatePayment - This function is missing in your backend
exports.updatePayment = async (req, res, next) => {
  try {
    const { id } = req.params
    const updatedPayment = await Payments.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    }).populate("invoiceId", "invoiceNumber clientId projectId")

    if (!updatedPayment) {
      return res.status(404).json({ message: "Payment not found" })
    }

    // Re-calculate invoice outstanding amount if payment amount changed
    // This logic can be complex and depends on how you track payment history.
    // For simplicity, this example just updates the payment record.
    // A more robust solution would involve re-evaluating the associated invoice's total paid amount.

    res.status(200).json(updatedPayment)
  } catch (error) {
    console.error("Error updating payment:", error)
    next(error)
  }
}

// Placeholder for deletePayment - This function is missing in your backend
exports.deletePayment = async (req, res, next) => {
  try {
    const { id } = req.params
    const deletedPayment = await Payments.findByIdAndDelete(id)

    if (!deletedPayment) {
      return res.status(404).json({ message: "Payment not found" })
    }

    // Revert invoice outstanding amount if payment is deleted
    const invoice = await Invoices.findById(deletedPayment.invoiceId)
    if (invoice) {
      invoice.outstandingAmount += deletedPayment.amount
      invoice.paymentStatus = invoice.outstandingAmount > 0 ? "Partial" : "Paid" // Adjust status
      await invoice.save()
    }

    res.status(200).json({ message: "Payment deleted successfully" })
  } catch (error) {
    console.error("Error deleting payment:", error)
    next(error)
  }
}
