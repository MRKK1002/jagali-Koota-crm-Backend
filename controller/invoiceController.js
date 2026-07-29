const ConstructionSalesInvoice = require("../model/ConstructionSalesInvoice") // Assuming this is the correct model
const ConstructionWorkOrder = require("../model/ConstructionWorkOrder") // Assuming this model exists
const ConstructionClient = require("../model/ConstructionClient") // Assuming this model exists
const ConstructionProject = require("../model/ConstructionProject") // Assuming this model exists
const ConstructionInvoiceSettings = require("../model/ConstructionInvoiceSettings") // Assuming this model exists
const asyncHandler = require("express-async-handler")
const mongoose = require("mongoose") // Import mongoose for ObjectId validation

// Generate invoice number
const generateConstructionInvoiceNumber = async () => {
  const settings = await ConstructionInvoiceSettings.findOne()
  const prefix = settings?.prefix || "SAL"
  const nextNumber = settings?.nextNumber || 1
  const year = new Date().getFullYear()
  const invoiceNumber = `${prefix}-${year}-${String(nextNumber).padStart(3, "0")}`
  if (settings) {
    settings.nextNumber = nextNumber + 1
    await settings.save()
  }
  return invoiceNumber
}

const getConstructionInvoices = asyncHandler(async (req, res) => {
  const { status, clientId, paymentStatus } = req.query
  const filter = {}
  if (status) filter.status = status
  if (clientId) filter.clientId = clientId
  if (paymentStatus) filter.paymentStatus = paymentStatus
  const invoices = await ConstructionSalesInvoice.find(filter)
    .populate("clientId", "clientName email")
    .populate("projectId", "projectName")
    // .populate("items.workOrderId", "taskName workOrderNumber") // Uncomment if items.workOrderId needs population
    .sort({ createdAt: -1 })
  res.json(invoices)
})

const getConstructionInvoice = asyncHandler(async (req, res) => {
  const invoice = await ConstructionSalesInvoice.findById(req.params.id)
    .populate("clientId", "clientName email") // Changed 'name' to 'clientName' for consistency
    .populate("projectId", "projectName") // Changed 'name' to 'projectName' for consistency
    .populate("items.workOrderId")
  if (!invoice) {
    res.status(404)
    throw new Error("Construction invoice not found")
  }
  res.json(invoice)
})

const createConstructionInvoice = asyncHandler(async (req, res) => {
  const { clientId, projectId, workOrderIds, dueDate, notes, totalAmount, paymentStatus, invoiceNumber } = req.body

  // Validate client and project IDs
  if (!mongoose.Types.ObjectId.isValid(clientId)) {
    res.status(400)
    throw new Error("Invalid client ID format")
  }
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    res.status(400)
    throw new Error("Invalid project ID format")
  }

  const client = await ConstructionClient.findById(clientId)
  if (!client) {
    res.status(404)
    throw new Error("Construction client not found")
  }
  const project = await ConstructionProject.findById(projectId)
  if (!project) {
    res.status(404)
    throw new Error("Construction project not found")
  }

  // IMPORTANT: The frontend does not send `workOrderIds`.
  // If `workOrderIds` are strictly required by your backend logic,
  // the frontend needs to be updated to select and send them.
  // For now, if `workOrderIds` is empty or not provided, this part will be skipped or throw an error.
  let workOrders = []
  if (workOrderIds && workOrderIds.length > 0) {
    workOrders = await ConstructionWorkOrder.find({
      _id: { $in: workOrderIds },
      status: "completed",
    })
    if (workOrders.length !== workOrderIds.length) {
      res.status(400)
      throw new Error("Some construction work orders are not completed or not found")
    }
  }

  const settings = await ConstructionInvoiceSettings.findOne()
  const taxRate = settings?.taxRate || 18
  const companyState = settings?.companyState || ""
  const taxType = client.state === companyState ? "CGST_SGST" : "IGST"

  // If workOrders are not provided by frontend, items array might be empty or derived differently
  const items = workOrders.map((wo) => ({
    workOrderId: wo._id,
    description: wo.description,
    quantity: wo.quantity,
    rate: wo.rate,
    amount: wo.totalValue,
  }))

  // Use provided invoiceNumber or generate one
  const finalInvoiceNumber = invoiceNumber || (await generateConstructionInvoiceNumber())

  // Calculate totalAmount if not provided by frontend, or use provided
  const calculatedTotalAmount = totalAmount || items.reduce((sum, item) => sum + item.amount, 0)

  const invoice = await ConstructionSalesInvoice.create({
    invoiceNumber: finalInvoiceNumber,
    clientId,
    projectId,
    dueDate,
    items,
    taxType,
    taxRate,
    notes,
    totalAmount: calculatedTotalAmount, // Use calculated or provided totalAmount
    paymentStatus: paymentStatus || "Draft", // Use provided paymentStatus or default
    outstandingAmount: calculatedTotalAmount, // Initially outstanding is total amount
  })

  // Update work order status if workOrders were processed
  if (workOrders.length > 0) {
    await ConstructionWorkOrder.updateMany({ _id: { $in: workOrderIds } }, { status: "billed" })
  }

  const populatedInvoice = await ConstructionSalesInvoice.findById(invoice._id)
    .populate("clientId", "clientName email")
    .populate("projectId", "projectName")
    .populate("items.workOrderId", "taskName workOrderNumber")
  res.status(201).json(populatedInvoice)
})

const updateConstructionInvoice = asyncHandler(async (req, res) => {
  const invoice = await ConstructionSalesInvoice.findById(req.params.id)
  if (!invoice) {
    res.status(404)
    throw new Error("Construction invoice not found")
  }

  // Validate clientId and projectId if they are being updated
  const { clientId, projectId } = req.body
  if (clientId && !mongoose.Types.ObjectId.isValid(clientId)) {
    res.status(400)
    throw new Error("Invalid client ID format")
  }
  if (projectId && !mongoose.Types.ObjectId.isValid(projectId)) {
    res.status(400)
    throw new Error("Invalid project ID format")
  }

  const updatedInvoice = await ConstructionSalesInvoice.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })
    .populate("clientId", "clientName email")
    .populate("projectId", "projectName")
    .populate("items.workOrderId", "taskName workOrderNumber")
  res.json(updatedInvoice)
})

const deleteConstructionInvoice = asyncHandler(async (req, res) => {
  const invoice = await ConstructionSalesInvoice.findById(req.params.id)
  if (!invoice) {
    res.status(404)
    throw new Error("Construction invoice not found")
  }
  const workOrderIds = invoice.items.map((item) => item.workOrderId)
  await ConstructionWorkOrder.updateMany({ _id: { $in: workOrderIds } }, { status: "completed" })
  await ConstructionSalesInvoice.findByIdAndDelete(req.params.id)
  res.json({ message: "Construction invoice deleted successfully" })
})

const getConstructionOutstandingBalances = asyncHandler(async (req, res) => {
  const outstandingInvoices = await ConstructionSalesInvoice.find({
    paymentStatus: { $in: ["Unpaid", "Partial"] },
  })
    .populate("clientId", "clientName")
    .select("invoiceNumber clientId totalAmount paidAmount outstandingAmount dueDate paymentStatus")
    .sort({ dueDate: 1 })
  const balances = outstandingInvoices.map((invoice) => ({
    id: invoice._id,
    invoiceNumber: invoice.invoiceNumber,
    client: invoice.clientId.clientName,
    amount: invoice.outstandingAmount,
    dueDate: invoice.dueDate,
    status: new Date(invoice.dueDate) < new Date() ? "Overdue" : "Pending",
  }))
  res.json(balances)
})

const getConstructionInvoiceStats = asyncHandler(async (req, res) => {
  const totalInvoices = await ConstructionSalesInvoice.countDocuments()
  const paidInvoices = await ConstructionSalesInvoice.countDocuments({
    paymentStatus: "Paid",
  })
  const unpaidInvoices = await ConstructionSalesInvoice.countDocuments({
    paymentStatus: "Unpaid",
  })
  const overdueInvoices = await ConstructionSalesInvoice.countDocuments({
    paymentStatus: { $in: ["Unpaid", "Partial"] },
    dueDate: { $lt: new Date() },
  })
  const totalAmount = await ConstructionSalesInvoice.aggregate([
    { $group: { _id: null, total: { $sum: "$totalAmount" } } },
  ])
  const outstandingAmount = await ConstructionSalesInvoice.aggregate([
    { $group: { _id: null, total: { $sum: "$outstandingAmount" } } },
  ])
  res.json({
    totalInvoices,
    paidInvoices,
    unpaidInvoices,
    overdueInvoices,
    totalAmount: totalAmount[0]?.total || 0,
    outstandingAmount: outstandingAmount[0]?.total || 0,
  })
})

module.exports = {
  getConstructionInvoices,
  getConstructionInvoice,
  createConstructionInvoice,
  updateConstructionInvoice,
  deleteConstructionInvoice,
  getConstructionOutstandingBalances,
  getConstructionInvoiceStats,
}
