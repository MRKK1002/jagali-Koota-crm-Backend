const ConstructionSalesInvoice = require("../model/ConstructionSalesInvoice")
const ConstructionPayment = require("../model/ConstructionPayment")
const ConstructionClient = require("../model/ConstructionClient")
const ConstructionWorkOrder = require("../model/ConstructionWorkOrder")
const asyncHandler = require("express-async-handler")

// @desc    Generate Construction GST Report
// @route   POST /api/construction/sales/reports/gst
// @access  Private
const generateConstructionGSTReport = asyncHandler(async (req, res) => {
  const { fromDate, toDate, gstPeriod } = req.body

  let dateFilter = {}
  if (fromDate && toDate) {
    dateFilter = {
      invoiceDate: {
        $gte: new Date(fromDate),
        $lte: new Date(toDate),
      },
    }
  }

  const invoices = await ConstructionSalesInvoice.find(dateFilter)
    .populate("clientId", "clientName gstin state")
    .populate("projectId", "projectName")
    .sort({ invoiceDate: 1 })

  const constructionGstReport = {
    period: gstPeriod || "Custom",
    fromDate,
    toDate,
    summary: {
      totalInvoices: invoices.length,
      totalTaxableAmount: 0,
      totalIGST: 0,
      totalCGST: 0,
      totalSGST: 0,
      totalTaxAmount: 0,
      totalInvoiceAmount: 0,
    },
    invoices: [],
  }

  invoices.forEach((invoice) => {
    const reportItem = {
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      clientName: invoice.clientId.clientName,
      clientGSTIN: invoice.clientId.gstin,
      clientState: invoice.clientId.state,
      projectName: invoice.projectId.projectName,
      taxableAmount: invoice.subtotal,
      taxType: invoice.taxType,
      taxRate: invoice.taxRate,
      taxAmount: invoice.taxAmount,
      totalAmount: invoice.totalAmount,
    }

    if (invoice.taxType === "IGST") {
      reportItem.igst = invoice.taxAmount
      constructionGstReport.summary.totalIGST += invoice.taxAmount
    } else {
      reportItem.cgst = invoice.taxAmount / 2
      reportItem.sgst = invoice.taxAmount / 2
      constructionGstReport.summary.totalCGST += invoice.taxAmount / 2
      constructionGstReport.summary.totalSGST += invoice.taxAmount / 2
    }

    constructionGstReport.summary.totalTaxableAmount += invoice.subtotal
    constructionGstReport.summary.totalTaxAmount += invoice.taxAmount
    constructionGstReport.summary.totalInvoiceAmount += invoice.totalAmount

    constructionGstReport.invoices.push(reportItem)
  })

  res.json(constructionGstReport)
})

// @desc    Generate Construction Custom Report
// @route   POST /api/construction/sales/reports/custom
// @access  Private
const generateConstructionCustomReport = asyncHandler(async (req, res) => {
  const { reportType, fromDate, toDate, clientId, status, groupBy } = req.body

  let report = {}

  switch (reportType) {
    case "client-wise":
      report = await generateConstructionClientWiseReport(fromDate, toDate, clientId)
      break
    case "payment-summary":
      report = await generateConstructionPaymentSummaryReport(fromDate, toDate, clientId)
      break
    case "outstanding":
      report = await generateConstructionOutstandingReport(clientId)
      break
    case "monthly":
      report = await generateConstructionMonthlySummaryReport(fromDate, toDate)
      break
    case "project-wise":
      report = await generateConstructionProjectWiseReport(fromDate, toDate)
      break
    default:
      res.status(400)
      throw new Error("Invalid construction report type")
  }

  res.json(report)
})

// Helper function for construction client-wise report
const generateConstructionClientWiseReport = async (fromDate, toDate, clientId) => {
  const clientFilter = {}
  if (clientId) clientFilter._id = clientId

  const dateFilter = {}
  if (fromDate && toDate) {
    dateFilter.invoiceDate = {
      $gte: new Date(fromDate),
      $lte: new Date(toDate),
    }
  }

  const clients = await ConstructionClient.find(clientFilter)
  const report = {
    reportType: "Construction Client-wise Report",
    period: { fromDate, toDate },
    clients: [],
  }

  for (const client of clients) {
    const invoices = await ConstructionSalesInvoice.find({
      clientId: client._id,
      ...dateFilter,
    }).populate("projectId", "projectName")

    const payments = await ConstructionPayment.find({
      clientId: client._id,
      ...(fromDate && toDate
        ? {
            paymentDate: {
              $gte: new Date(fromDate),
              $lte: new Date(toDate),
            },
          }
        : {}),
    })

    const clientData = {
      clientName: client.clientName,
      clientId: client._id,
      totalInvoices: invoices.length,
      totalInvoiceAmount: invoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
      totalPayments: payments.reduce((sum, pay) => sum + pay.amount, 0),
      outstandingAmount: invoices.reduce((sum, inv) => sum + inv.outstandingAmount, 0),
      invoices: invoices.map((inv) => ({
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        projectName: inv.projectId.projectName,
        amount: inv.totalAmount,
        paidAmount: inv.paidAmount,
        outstandingAmount: inv.outstandingAmount,
        status: inv.paymentStatus,
      })),
    }

    report.clients.push(clientData)
  }

  return report
}

// Helper function for construction payment summary report
const generateConstructionPaymentSummaryReport = async (fromDate, toDate, clientId) => {
  const filter = {}
  if (clientId) filter.clientId = clientId
  if (fromDate && toDate) {
    filter.paymentDate = {
      $gte: new Date(fromDate),
      $lte: new Date(toDate),
    }
  }

  const payments = await ConstructionPayment.find(filter)
    .populate("clientId", "clientName")
    .populate("invoiceId", "invoiceNumber")
    .sort({ paymentDate: -1 })

  const summary = {
    totalPayments: payments.length,
    totalAmount: payments.reduce((sum, pay) => sum + pay.amount, 0),
    paymentMethods: {},
  }

  payments.forEach((payment) => {
    if (!summary.paymentMethods[payment.paymentMethod]) {
      summary.paymentMethods[payment.paymentMethod] = {
        count: 0,
        amount: 0,
      }
    }
    summary.paymentMethods[payment.paymentMethod].count++
    summary.paymentMethods[payment.paymentMethod].amount += payment.amount
  })

  return {
    reportType: "Construction Payment Summary Report",
    period: { fromDate, toDate },
    summary,
    payments: payments.map((pay) => ({
      paymentNumber: pay.paymentNumber,
      paymentDate: pay.paymentDate,
      clientName: pay.clientId.clientName,
      invoiceNumber: pay.invoiceId.invoiceNumber,
      amount: pay.amount,
      paymentMethod: pay.paymentMethod,
      referenceNumber: pay.referenceNumber,
    })),
  }
}

// Helper function for construction outstanding report
const generateConstructionOutstandingReport = async (clientId) => {
  const filter = {
    paymentStatus: { $in: ["Unpaid", "Partial"] },
  }
  if (clientId) filter.clientId = clientId

  const outstandingInvoices = await ConstructionSalesInvoice.find(filter)
    .populate("clientId", "clientName")
    .populate("projectId", "projectName")
    .sort({ dueDate: 1 })

  const summary = {
    totalOutstandingInvoices: outstandingInvoices.length,
    totalOutstandingAmount: outstandingInvoices.reduce((sum, inv) => sum + inv.outstandingAmount, 0),
    overdueInvoices: outstandingInvoices.filter((inv) => new Date(inv.dueDate) < new Date()).length,
    overdueAmount: outstandingInvoices
      .filter((inv) => new Date(inv.dueDate) < new Date())
      .reduce((sum, inv) => sum + inv.outstandingAmount, 0),
  }

  return {
    reportType: "Construction Outstanding Balances Report",
    generatedDate: new Date(),
    summary,
    invoices: outstandingInvoices.map((inv) => ({
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate,
      dueDate: inv.dueDate,
      clientName: inv.clientId.clientName,
      projectName: inv.projectId.projectName,
      totalAmount: inv.totalAmount,
      paidAmount: inv.paidAmount,
      outstandingAmount: inv.outstandingAmount,
      daysOverdue: Math.max(0, Math.floor((new Date() - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24))),
      status: new Date(inv.dueDate) < new Date() ? "Overdue" : "Pending",
    })),
  }
}

// Helper function for construction monthly summary report
const generateConstructionMonthlySummaryReport = async (fromDate, toDate) => {
  const startDate = fromDate ? new Date(fromDate) : new Date(new Date().getFullYear(), 0, 1)
  const endDate = toDate ? new Date(toDate) : new Date()

  const invoices = await ConstructionSalesInvoice.aggregate([
    {
      $match: {
        invoiceDate: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$invoiceDate" },
          month: { $month: "$invoiceDate" },
        },
        totalInvoices: { $sum: 1 },
        totalAmount: { $sum: "$totalAmount" },
        totalTax: { $sum: "$taxAmount" },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ])

  const payments = await ConstructionPayment.aggregate([
    {
      $match: {
        paymentDate: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$paymentDate" },
          month: { $month: "$paymentDate" },
        },
        totalPayments: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ])

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  const monthlyData = []
  const invoiceMap = new Map()
  const paymentMap = new Map()

  invoices.forEach((inv) => {
    const key = `${inv._id.year}-${inv._id.month}`
    invoiceMap.set(key, inv)
  })

  payments.forEach((pay) => {
    const key = `${pay._id.year}-${pay._id.month}`
    paymentMap.set(key, pay)
  })

  // Generate monthly data
  const currentDate = new Date(startDate)
  while (currentDate <= endDate) {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth() + 1
    const key = `${year}-${month}`

    const invoiceData = invoiceMap.get(key) || { totalInvoices: 0, totalAmount: 0, totalTax: 0 }
    const paymentData = paymentMap.get(key) || { totalPayments: 0, totalAmount: 0 }

    monthlyData.push({
      year,
      month,
      monthName: monthNames[month - 1],
      invoices: {
        count: invoiceData.totalInvoices,
        amount: invoiceData.totalAmount,
        tax: invoiceData.totalTax,
      },
      payments: {
        count: paymentData.totalPayments,
        amount: paymentData.totalAmount,
      },
    })

    currentDate.setMonth(currentDate.getMonth() + 1)
  }

  return {
    reportType: "Construction Monthly Summary Report",
    period: { fromDate: startDate, toDate: endDate },
    monthlyData,
  }
}

// Helper function for construction project-wise report
const generateConstructionProjectWiseReport = async (fromDate, toDate) => {
  const dateFilter = {}
  if (fromDate && toDate) {
    dateFilter.createdAt = {
      $gte: new Date(fromDate),
      $lte: new Date(toDate),
    }
  }

  const workOrders = await ConstructionWorkOrder.find(dateFilter).populate({
    path: "projectId",
    populate: {
      path: "clientId",
      select: "clientName",
    },
  })

  const projectMap = new Map()

  workOrders.forEach((wo) => {
    const projectId = wo.projectId._id.toString()
    if (!projectMap.has(projectId)) {
      projectMap.set(projectId, {
        projectName: wo.projectId.projectName,
        clientName: wo.projectId.clientId.clientName,
        totalWorkOrders: 0,
        completedWorkOrders: 0,
        totalValue: 0,
        completedValue: 0,
        pendingValue: 0,
        workOrders: [],
      })
    }

    const project = projectMap.get(projectId)
    project.totalWorkOrders++
    project.totalValue += wo.totalValue

    if (wo.status === "completed" || wo.status === "billed") {
      project.completedWorkOrders++
      project.completedValue += wo.totalValue
    } else {
      project.pendingValue += wo.totalValue
    }

    project.workOrders.push({
      workOrderNumber: wo.workOrderNumber,
      taskName: wo.taskName,
      status: wo.status,
      value: wo.totalValue,
      dueDate: wo.dueDate,
      completionDate: wo.completionDate,
    })
  })

  return {
    reportType: "Construction Project-wise Report",
    period: { fromDate, toDate },
    projects: Array.from(projectMap.values()),
  }
}

module.exports = {
  generateConstructionGSTReport,
  generateConstructionCustomReport,
}
