const Invoice = require('../model/counterInvoiceModel');
const Branch = require('../model/Branch');
const asyncHandler = require('express-async-handler');

exports.addInvoice = asyncHandler(async (req, res) => {
  const { customerName, phoneNumber, branchId, date, time } = req.body;

  // Validate input
  if (!customerName || !customerName.trim()) {
    res.status(400);
    throw new Error('Customer name is required');
  }

  if (!phoneNumber || !/^\d{10}$/.test(phoneNumber)) {
    res.status(400);
    throw new Error('Phone number must be a valid 10-digit number');
  }

  if (!branchId) {
    res.status(400);
    throw new Error('Branch is required');
  }

  if (!date || !time) {
    res.status(400);
    throw new Error('Date and time are required');
  }

  // Verify branch exists
  const branch = await Branch.findById(branchId);
  if (!branch) {
    res.status(404);
    throw new Error('Selected branch not found');
  }

  // Generate unique invoice number with branch prefix
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 1000);
  const branchPrefix = branchId.toUpperCase().substring(0, 3);
  const invoiceNumber = `${branchPrefix}-${timestamp.toString().slice(-6)}-${random}`;

  // Create new invoice
  const invoice = new Invoice({
    invoiceNumber,
    customerName: customerName.trim(),
    phoneNumber: phoneNumber.trim(),
    branch: branchId,
    date,
    time,
  });

  // Save to database
  await invoice.save();

  // Populate branch details in response
  const populatedInvoice = await Invoice.findById(invoice._id).populate('branch');

  // Respond with success
  res.status(201).json({
    message: 'Invoice created successfully',
    invoice: {
      invoiceNumber: populatedInvoice.invoiceNumber,
      customerName: populatedInvoice.customerName,
      phoneNumber: populatedInvoice.phoneNumber,
      branch: {
        id: populatedInvoice.branch._id,
        name: populatedInvoice.branch.name,
        location: populatedInvoice.branch.address,
      },
      date: populatedInvoice.date,
      time: populatedInvoice.time,
      id: populatedInvoice._id,
    },
  });
});