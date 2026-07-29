const Invoices = require('../model/ConstructionSalesInvoice'); // Changed 'Invoice' to 'Invoices'
const WorkOrder = require('../model/ConstructionWorkOrder');

exports.getInvoices = async (req, res, next) => {
  try {
    const invoices = await Invoices.find() // Changed 'Invoice' to 'Invoices'
      .populate('clientId', 'clientName')
      .populate('projectId', 'projectName')
      .populate('workOrderIds', 'taskName totalValue');
    res.status(200).json(invoices);
  } catch (error) {
    next(error);
  }
};

exports.getOutstandingInvoices = async (req, res, next) => {
  try {
    const invoices = await Invoices.find({ // Changed 'Invoice' to 'Invoices'
      paymentStatus: { $in: ['Pending', 'Overdue'] },
      outstandingAmount: { $gt: 0 },
    })
      .populate('clientId', 'clientName')
      .populate('projectId', 'projectName');
    res.status(200).json(invoices);
  } catch (error) {
    next(error);
  }
};

exports.createInvoice = async (req, res, next) => {
  try {
    console.log('Request body:', req.body); // Debug log
    const { clientId, projectId, workOrderIds, dueDate, notes, totalAmount } = req.body;

    // Reject invoiceId to prevent previous E11000 error
    if (req.body.invoiceId !== undefined) {
      return res.status(400).json({ message: 'invoiceId is not allowed in request body' });
    }

    // Validate required fields
    if (!clientId || !projectId || !dueDate ) {
      return res.status(400).json({ message: 'Client ID, Project ID, Due Date, and Total Amount are required' });
    }

    // Validate workOrderIds
    if (workOrderIds && workOrderIds.length > 0) {
      const workOrders = await WorkOrder.find({ _id: { $in: workOrderIds } });
      if (workOrders.length !== workOrderIds.length) {
        return res.status(400).json({ message: 'One or more workOrderIds are invalid' });
      }
      // Calculate totalAmount from work orders (override request body if needed)
      const calculatedTotal = workOrders.reduce((sum, wo) => sum + (wo.totalValue || 0), 0);
      if (totalAmount !== calculatedTotal) {
        console.warn(`Total amount mismatch: Request=${totalAmount}, Calculated=${calculatedTotal}`);
      }
    }

    const invoice = new Invoices({ // Changed 'Invoice' to 'Invoices'
      clientId,
      projectId,
      workOrderIds: workOrderIds || [],
      totalAmount,
      dueDate,
      notes,
      paymentStatus: 'Pending',
    });

    await invoice.save();

    // Update work orders to status 'billed'
    if (workOrderIds && workOrderIds.length > 0) {
      await WorkOrder.updateMany({ _id: { $in: workOrderIds } }, { status: 'billed' });
    }

    const populatedInvoice = await Invoices.findById(invoice._id) // Changed 'Invoice' to 'Invoices'
      .populate('clientId', 'clientName')
      .populate('projectId', 'projectName')
      .populate('workOrderIds', 'taskName totalValue');
    res.status(201).json(populatedInvoice);
  } catch (error) {
    console.error('Error creating invoice:', error);
    next(error);
  }
};