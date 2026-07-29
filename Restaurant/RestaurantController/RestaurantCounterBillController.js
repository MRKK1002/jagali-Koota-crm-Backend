const CounterBill = require("../model/counterBillModel")
const CounterOrder = require("../model/counterOrderModel")
const CounterInvoice = require("../model/counterInvoiceModel")
const Branch = require("../model/Branch")
const Menu = require("../model/menuModel")
const Counter = require("../model/counterLoginModel")
const asyncHandler = require("express-async-handler")

const TAX_RATE = 0.05 // 5%
const SERVICE_CHARGE_RATE = 0.1 // 10%

exports.createCounterBill = asyncHandler(async (req, res) => {
  const {
    userId,
    orderId,
    invoiceId,
    branchId,
    customerName,
    phoneNumber,
    items,
    subtotal,
    tax,
    serviceCharge,
    totalAmount,
    grandTotal,
    date,
    time,
  } = req.body

  // Input validation
  if (!userId || !orderId || !invoiceId || !branchId || !customerName || !phoneNumber || !items || !date || !time) {
    res.status(400)
    throw new Error("All required fields must be provided")
  }

  if (!/^\d{10}$/.test(phoneNumber)) {
    res.status(400)
    throw new Error("Phone number must be a valid 10-digit number")
  }

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400)
    throw new Error("Items array is required and must not be empty")
  }

  if (subtotal <= 0 || tax < 0 || serviceCharge < 0 || totalAmount <= 0 || grandTotal <= 0) {
    res.status(400)
    throw new Error(
      "Subtotal, total amount and grand total must be greater than zero; tax and service charge cannot be negative",
    )
  }

  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
    res.status(400)
    throw new Error("Date must be in DD/MM/YYYY format")
  }

  if (!/^\d{1,2}:\d{2}\s(?:AM|PM)$/.test(time)) {
    res.status(400)
    throw new Error("Time must be in HH:MM AM/PM format")
  }

  // Parallel validation
  const [counterUser, counterOrder, invoice, branch] = await Promise.all([
    Counter.findById(userId),
    CounterOrder.findById(orderId),
    CounterInvoice.findById(invoiceId),
    Branch.findById(branchId),
  ])

  if (!counterUser) {
    res.status(404)
    throw new Error("Counter user not found")
  }

  if (!counterOrder) {
    res.status(404)
    throw new Error("Counter order not found")
  }

  if (!invoice) {
    res.status(404)
    throw new Error("Invoice not found")
  }

  if (!branch) {
    res.status(404)
    throw new Error("Branch not found")
  }

  if (counterOrder.userId.toString() !== userId) {
    res.status(400)
    throw new Error("User ID does not match the order")
  }

  const existingBill = await CounterBill.findOne({ order: orderId })
  if (existingBill) {
    res.status(400)
    throw new Error("A counter bill already exists for this order")
  }

  if (items.length !== counterOrder.items.length) {
    res.status(400)
    throw new Error(`Item count mismatch: provided ${items.length}, expected ${counterOrder.items.length}`)
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const orderItem = counterOrder.items[i]

    if (!item.menuItemId || !item.name || !item.quantity || !item.price) {
      res.status(400)
      throw new Error("Invalid item data: missing required fields")
    }

    const menuItem = await Menu.findById(item.menuItemId)
    if (!menuItem) {
      res.status(404)
      throw new Error(`Menu item ${item.name} not found`)
    }

    if (menuItem.price !== item.price) {
      res.status(400)
      throw new Error(`Price mismatch for ${item.name}: provided ₹${item.price}, expected ₹${menuItem.price}`)
    }

    if (
      item.menuItemId.toString() !== orderItem.menuItemId.toString() ||
      item.name !== orderItem.name ||
      item.quantity !== orderItem.quantity ||
      item.price !== orderItem.price
    ) {
      res.status(400)
      throw new Error(`Item ${item.name} does not match counter order details`)
    }
  }

  // Validate calculations against counter order (using same field names as staff order)
  if (Math.abs(subtotal - counterOrder.subtotal) > 0.01) {
    res.status(400)
    throw new Error("Subtotal mismatch with counter order")
  }

  if (Math.abs(tax - counterOrder.tax) > 0.01) {
    res.status(400)
    throw new Error("Tax mismatch with counter order")
  }

  if (Math.abs(serviceCharge - counterOrder.serviceCharge) > 0.01) {
    res.status(400)
    throw new Error("Service charge mismatch with counter order")
  }

  if (Math.abs(totalAmount - counterOrder.totalAmount) > 0.01) {
    res.status(400)
    throw new Error("Total amount mismatch with counter order")
  }

  if (Math.abs(grandTotal - counterOrder.grandTotal) > 0.01) {
    res.status(400)
    throw new Error("Grand total mismatch with counter order")
  }

  // Additional validation for calculation consistency
  const calculatedTax = subtotal * TAX_RATE
  const calculatedServiceCharge = subtotal * SERVICE_CHARGE_RATE
  const calculatedGrandTotal = subtotal + calculatedTax + calculatedServiceCharge

  if (Math.abs(tax - calculatedTax) > 0.01) {
    res.status(400)
    throw new Error("Tax calculation mismatch")
  }

  if (Math.abs(serviceCharge - calculatedServiceCharge) > 0.01) {
    res.status(400)
    throw new Error("Service charge calculation mismatch")
  }

  if (Math.abs(grandTotal - calculatedGrandTotal) > 0.01) {
    res.status(400)
    throw new Error("Grand total calculation mismatch")
  }

  // Create bill
  const counterBill = new CounterBill({
    userId,
    order: orderId,
    invoice: invoiceId,
    branch: branchId,
    customerName,
    phoneNumber,
    items,
    subtotal,
    tax,
    serviceCharge,
    totalAmount,
    grandTotal,
    date,
    time,
  })

  await counterBill.save()

  const populatedBill = await CounterBill.findById(counterBill._id)
    .populate("userId", "name mobile")
    .populate("order", "items subtotal tax serviceCharge totalAmount grandTotal paymentMethod")
    .populate("branch", "name address")
    .populate("invoice", "invoiceNumber")
    .populate("items.menuItemId", "name")

  if (!populatedBill.branch || !populatedBill.invoice || !populatedBill.order || !populatedBill.userId) {
    res.status(500)
    throw new Error("Failed to populate required counter bill references")
  }

  res.status(201).json({
    message: "Counter bill created successfully",
    bill: {
      id: populatedBill._id,
      userId: {
        id: populatedBill.userId._id,
        name: populatedBill.userId.name,
        mobile: populatedBill.userId.mobile,
      },
      order: {
        id: populatedBill.order._id,
        items: populatedBill.order.items,
        subtotal: populatedBill.order.subtotal,
        tax: populatedBill.order.tax,
        serviceCharge: populatedBill.order.serviceCharge,
        totalAmount: populatedBill.order.totalAmount,
        grandTotal: populatedBill.order.grandTotal,
        paymentMethod: populatedBill.order.paymentMethod,
      },
      invoice: {
        id: populatedBill.invoice._id,
        invoiceNumber: populatedBill.invoice.invoiceNumber,
      },
      branch: {
        id: populatedBill.branch._id,
        name: populatedBill.branch.name,
        location: populatedBill.branch.address,
      },
      customerName: populatedBill.customerName,
      phoneNumber: populatedBill.phoneNumber,
      items: populatedBill.items,
      subtotal: populatedBill.subtotal,
      tax: populatedBill.tax,
      serviceCharge: populatedBill.serviceCharge,
      totalAmount: populatedBill.totalAmount,
      grandTotal: populatedBill.grandTotal,
      date: populatedBill.date,
      time: populatedBill.time,
      createdAt: populatedBill.createdAt,
    },
  })
})

exports.getCounterBillById = asyncHandler(async (req, res) => {
  const { id } = req.params

  // Validate ObjectId format
  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    res.status(400)
    throw new Error("Invalid bill ID format")
  }

  const counterBill = await CounterBill.findById(id)
    .populate("userId", "name mobile")
    .populate("order", "items subtotal tax serviceCharge totalAmount grandTotal paymentMethod")
    .populate("branch", "name address")
    .populate("invoice", "invoiceNumber")
    .populate("items.menuItemId", "name")

  if (!counterBill) {
    res.status(404)
    throw new Error("Counter bill not found")
  }

  if (!counterBill.branch || !counterBill.invoice || !counterBill.order || !counterBill.userId) {
    res.status(500)
    throw new Error("Required counter bill references are missing")
  }

  res.status(200).json({
    bill: {
      id: counterBill._id,
      userId: {
        id: counterBill.userId._id,
        name: counterBill.userId.name,
        mobile: counterBill.userId.mobile,
      },
      order: {
        id: counterBill.order._id,
        items: counterBill.order.items,
        subtotal: counterBill.order.subtotal,
        tax: counterBill.order.tax,
        serviceCharge: counterBill.order.serviceCharge,
        totalAmount: counterBill.order.totalAmount,
        grandTotal: counterBill.order.grandTotal,
        paymentMethod: counterBill.order.paymentMethod,
      },
      invoice: {
        id: counterBill.invoice._id,
        invoiceNumber: counterBill.invoice.invoiceNumber,
      },
      branch: {
        id: counterBill.branch._id,
        name: counterBill.branch.name,
        location: counterBill.branch.address,
      },
      customerName: counterBill.customerName,
      phoneNumber: counterBill.phoneNumber,
      items: counterBill.items,
      subtotal: counterBill.subtotal,
      tax: counterBill.tax,
      serviceCharge: counterBill.serviceCharge,
      totalAmount: counterBill.totalAmount,
      grandTotal: counterBill.grandTotal,
      date: counterBill.date,
      time: counterBill.time,
      createdAt: counterBill.createdAt,
    },
  })
})

exports.listCounterBills = asyncHandler(async (req, res) => {
  const { 
    branchId, 
    customerName, 
    phoneNumber, 
    startDate, 
    endDate,
    page = 1,
    limit = 10,
    paymentMethod,
    search
  } = req.query
  
  const query = {}

  if (branchId) query.branch = branchId
  if (customerName) query.customerName = { $regex: customerName, $options: "i" }
  if (phoneNumber) query.phoneNumber = phoneNumber
  if (startDate && endDate) {
    query.date = { $gte: startDate, $lte: endDate }
  }

  // Handle search query - search across multiple fields
  if (search) {
    query.$or = [
      { customerName: { $regex: search, $options: "i" } },
      { phoneNumber: { $regex: search, $options: "i" } },
    ]
  }

  // First, get all bills with populate (using exec() to get actual data)
  let counterBills = await CounterBill.find(query)
    .populate("userId", "name mobile")
    .populate("order", "items subtotal tax serviceCharge totalAmount grandTotal paymentMethod paymentStatus")
    .populate("branch", "name address")
    .populate("invoice", "invoiceNumber")
    .sort({ createdAt: -1 })
    .exec()

  // Filter by paymentStatus if provided (paymentStatus is in order.paymentStatus)
  if (req.query.paymentStatus) {
    counterBills = counterBills.filter(bill => 
      bill.order && 
      bill.order.paymentStatus && 
      bill.order.paymentStatus.toLowerCase() === req.query.paymentStatus.toLowerCase()
    )
  }

  // Filter by paymentMethod if provided (paymentMethod is in order.paymentMethod)
  if (paymentMethod) {
    counterBills = counterBills.filter(bill => 
      bill.order && 
      bill.order.paymentMethod && 
      bill.order.paymentMethod.toLowerCase() === paymentMethod.toLowerCase()
    )
  }

  // Calculate pagination
  const pageNum = parseInt(page, 10) || 1
  const limitNum = parseInt(limit, 10) || 10
  const skip = (pageNum - 1) * limitNum
  const totalCount = counterBills.length

  // Apply pagination
  const paginatedBills = counterBills.slice(skip, skip + limitNum)

  // Format the response to match expected structure
  const formattedBills = paginatedBills
    .map((bill) => {
      // Check if all required populated fields exist
      if (!bill.userId || !bill.order || !bill.invoice || !bill.branch) {
        console.warn(`Bill ${bill._id} has missing populated references`)
        return null
      }

      return {
        id: bill._id,
        userId: {
          id: bill.userId._id,
          name: bill.userId.name,
          mobile: bill.userId.mobile,
        },
        order: {
          id: bill.order._id,
          items: bill.order.items || [],
          subtotal: bill.order.subtotal,
          tax: bill.order.tax,
          serviceCharge: bill.order.serviceCharge,
          totalAmount: bill.order.totalAmount,
          grandTotal: bill.order.grandTotal,
          paymentMethod: bill.order.paymentMethod,
        },
        invoice: {
          id: bill.invoice._id,
          invoiceNumber: bill.invoice.invoiceNumber,
        },
        branch: {
          id: bill.branch._id,
          name: bill.branch.name,
          location: bill.branch.address,
        },
        customerName: bill.customerName,
        phoneNumber: bill.phoneNumber,
        items: bill.items || [],
        subtotal: bill.subtotal,
        tax: bill.tax,
        serviceCharge: bill.serviceCharge,
        totalAmount: bill.totalAmount,
        grandTotal: bill.grandTotal,
        date: bill.date,
        time: bill.time,
        createdAt: bill.createdAt,
      }
    })
    .filter((bill) => bill !== null) // Remove any null entries

  res.status(200).json({
    message: "Counter bills retrieved successfully",
    count: totalCount, // Total count before pagination
    bills: formattedBills,
    pagination: {
      currentPage: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum),
      totalItems: totalCount
    }
  })
})
