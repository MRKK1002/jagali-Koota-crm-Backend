const CounterOrder = require("../../model/counterOrderModel")
const Branch = require("../../model/Branch")
const CounterInvoice = require("../../model/counterInvoiceModel")
const Menu = require("../../model/menuModel")
const Counter = require("../../model/counterLoginModel")
const asyncHandler = require("express-async-handler")
const Recipe = require("../RestautantModel/RestaurantRecipeModel")
const RawMaterial = require("../RestautantModel/RestaurantRawMaterialModel")

/**
 * Deduct raw material stock for every item in the order.
 * Each menu item has a Recipe linked by menu field.
 * Each recipe has ingredients: [{ rawMaterialId, quantity }]
 * We deduct (ingredient.quantity * orderItem.quantity) from the raw material's
 * totalQuantity and from each supplier's quantity proportionally (FIFO by supplier index).
 */
async function deductRawMaterialsForOrder(items) {
  for (const item of items) {
    if (!item.menuItemId) continue

    // Find the recipe that belongs to this menu item
    const recipe = await Recipe.findOne({ menu: item.menuItemId })
    if (!recipe || !recipe.ingredients || recipe.ingredients.length === 0) continue

    for (const ingredient of recipe.ingredients) {
      const neededQty = ingredient.quantity * item.quantity
      if (neededQty <= 0) continue

      const rawMaterial = await RawMaterial.findById(ingredient.rawMaterialId)
      if (!rawMaterial) continue

      // Deduct from supplier quantities FIFO style
      let remaining = neededQty
      for (const supplier of rawMaterial.suppliers) {
        if (remaining <= 0) break
        const deduct = Math.min(supplier.quantity, remaining)
        supplier.quantity -= deduct
        remaining -= deduct
      }

      // The pre-save hook will recalculate totalQuantity, totalValue, and status
      try {
        await rawMaterial.save()
      } catch (err) {
        // Log but don't fail the order if stock update has issues
        console.error(`[Stock Deduct] Failed for rawMaterial ${rawMaterial._id}:`, err.message)
      }
    }
  }
}

// Tax and service charge rates (same as staff order)
const TAX_RATE = 0.05 // 5%
const SERVICE_CHARGE_RATE = 0.1 // 10%

exports.createCounterOrder = asyncHandler(async (req, res) => {
  const {
    userId,
    customerName,
    phoneNumber,
    branchId,
    invoiceId,
    items,
    paymentMethod,
    status,
    // Optional: allow frontend to send these, but we'll calculate them
    subtotal: providedSubtotal,
    tax: providedTax,
    serviceCharge: providedServiceCharge,
    totalAmount: providedTotalAmount,
    grandTotal: providedGrandTotal,
    gstAmount: providedGstAmount, // Accept GST amount from frontend
  } = req.body

  // 🔍 DEBUG: Log what we received
  console.log('🔍 [createCounterOrder] Received gstAmount from frontend:', providedGstAmount)
  console.log('🔍 [createCounterOrder] Full request body GST fields:', {
    gstAmount: req.body.gstAmount,
    providedGstAmount,
    subtotal: providedSubtotal,
    grandTotal: providedGrandTotal
  })

  // Validate input
  if (!userId) {
    res.status(400)
    throw new Error("User ID is required")
  }

  if (!customerName || !customerName.trim()) {
    res.status(400)
    throw new Error("Customer name is required")
  }

  if (!phoneNumber || !/^\d{10}$/.test(phoneNumber)) {
    res.status(400)
    throw new Error("Phone number must be a valid 10-digit number")
  }

  if (!branchId) {
    res.status(400)
    throw new Error("Branch is required")
  }

  if (!invoiceId) {
    res.status(400)
    throw new Error("Invoice is required")
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400)
    throw new Error("Items are required")
  }

  if (!paymentMethod || !["cash", "card", "upi", "qr"].includes(paymentMethod)) {
    res.status(400)
    throw new Error("Invalid payment method")
  }

  // Verify counter user exists
  const counterUser = await Counter.findById(userId)
  if (!counterUser) {
    res.status(404)
    throw new Error("Counter user not found")
  }

  // Verify branch exists
  const branch = await Branch.findById(branchId)
  if (!branch) {
    res.status(404)
    throw new Error("Branch not found")
  }

  // Verify invoice exists
  const invoice = await CounterInvoice.findById(invoiceId)
  if (!invoice) {
    res.status(404)
    throw new Error("Invoice not found")
  }

  // Calculate subtotal and validate items
  let calculatedSubtotal = 0
  for (const item of items) {
    if (!item.menuItemId || !item.name || !item.quantity || !item.price) {
      res.status(400)
      throw new Error("Invalid item data")
    }

    const menuItem = await Menu.findById(item.menuItemId)
    if (!menuItem) {
      res.status(404)
      throw new Error(`Menu item ${item.name} not found`)
    }

    if (menuItem.price !== item.price) {
      res.status(400)
      throw new Error(`Price mismatch for ${item.name}`)
    }

    if (menuItem.branchId.toString() !== branchId) {
      res.status(400)
      throw new Error(`Item ${item.name} does not belong to the selected branch`)
    }

    // Add to subtotal
    calculatedSubtotal += item.price * item.quantity
  }

  // Calculate tax and service charges (same as staff order)
  const calculatedTax = calculatedSubtotal * TAX_RATE
  const calculatedServiceCharge = calculatedSubtotal * SERVICE_CHARGE_RATE
  const calculatedTotalAmount = calculatedSubtotal
  const calculatedGrandTotal = calculatedSubtotal + calculatedTax + calculatedServiceCharge

  // Validate provided amounts if they exist
  if (providedSubtotal !== undefined && Math.abs(providedSubtotal - calculatedSubtotal) > 0.01) {
    res.status(400)
    throw new Error(`Subtotal mismatch: provided ₹${providedSubtotal}, calculated ₹${calculatedSubtotal}`)
  }

  if (providedTax !== undefined && Math.abs(providedTax - calculatedTax) > 0.01) {
    res.status(400)
    throw new Error(`Tax mismatch: provided ₹${providedTax}, calculated ₹${calculatedTax}`)
  }

  if (providedServiceCharge !== undefined && Math.abs(providedServiceCharge - calculatedServiceCharge) > 0.01) {
    res.status(400)
    throw new Error(
      `Service charge mismatch: provided ₹${providedServiceCharge}, calculated ₹${calculatedServiceCharge}`,
    )
  }

  if (providedTotalAmount !== undefined && Math.abs(providedTotalAmount - calculatedTotalAmount) > 0.01) {
    res.status(400)
    throw new Error(`Total amount mismatch: provided ₹${providedTotalAmount}, calculated ₹${calculatedTotalAmount}`)
  }

  if (providedGrandTotal !== undefined && Math.abs(providedGrandTotal - calculatedGrandTotal) > 0.01) {
    res.status(400)
    throw new Error(`Grand total mismatch: provided ₹${providedGrandTotal}, calculated ₹${calculatedGrandTotal}`)
  }

  // Create order with calculated amounts (same structure as staff order)
  const counterOrder = new CounterOrder({
    userId,
    customerName: customerName.trim(),
    phoneNumber: phoneNumber.trim(),
    branch: branchId,
    invoice: invoiceId,
    items,
    subtotal: calculatedSubtotal,
    gstAmount: providedGstAmount || 0, // Save GST amount from frontend
    tax: calculatedTax,
    serviceCharge: calculatedServiceCharge,
    totalAmount: calculatedTotalAmount,
    grandTotal: calculatedGrandTotal,
    paymentMethod,
    orderStatus: "processing", // Default order status
    paymentStatus: status || "completed", // Payment status based on payment completion
  })

  // Save to database
  await counterOrder.save()

  // Auto-deduct raw material stock based on recipe ingredients
  try {
    await deductRawMaterialsForOrder(items)
  } catch (err) {
    console.error('[Recipe Stock Deduct] Error during deduction:', err.message)
    // Non-fatal: order is already saved, log and continue
  }

  // Populate related data
  const populatedOrder = await CounterOrder.findById(counterOrder._id)
    .populate("userId", "name mobile")
    .populate("branch", "name address")
    .populate("invoice", "invoiceNumber")
    .populate("items.menuItemId", "name")

  res.status(201).json({
    message: "Counter order created successfully",
    order: {
      id: populatedOrder._id,
      userId: {
        id: populatedOrder.userId._id,
        name: populatedOrder.userId.name,
        mobile: populatedOrder.userId.mobile,
      },
      customerName: populatedOrder.customerName,
      phoneNumber: populatedOrder.phoneNumber,
      branch: {
        id: populatedOrder.branch._id,
        name: populatedOrder.branch.name,
        location: populatedOrder.branch.address,
      },
      invoice: {
        id: populatedOrder.invoice._id,
        invoiceNumber: populatedOrder.invoice.invoiceNumber,
      },
      items: populatedOrder.items,
      subtotal: populatedOrder.subtotal,
      gstAmount: populatedOrder.gstAmount || 0,
      tax: populatedOrder.tax,
      serviceCharge: populatedOrder.serviceCharge,
      totalAmount: populatedOrder.totalAmount,
      grandTotal: populatedOrder.grandTotal,
      paymentMethod: populatedOrder.paymentMethod,
      orderStatus: populatedOrder.orderStatus,
      paymentStatus: populatedOrder.paymentStatus,
      cancellationReason: populatedOrder.cancellationReason,
      cancelledAt: populatedOrder.cancelledAt,
      createdAt: populatedOrder.createdAt,
    },
  })
})

exports.getCounterOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params

  // Validate ObjectId format
  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    res.status(400)
    throw new Error("Invalid order ID format")
  }

  const counterOrder = await CounterOrder.findById(id)
    .populate("userId", "name mobile")
    .populate("branch", "name address")
    .populate("invoice", "invoiceNumber")
    .populate("items.menuItemId", "name")

  if (!counterOrder) {
    res.status(404)
    throw new Error("Counter order not found")
  }

  res.status(200).json({
    order: {
      id: counterOrder._id,
      userId: {
        id: counterOrder.userId._id,
        name: counterOrder.userId.name,
        mobile: counterOrder.userId.mobile,
      },
      customerName: counterOrder.customerName,
      phoneNumber: counterOrder.phoneNumber,
      branch: {
        id: counterOrder.branch._id,
        name: counterOrder.branch.name,
        location: counterOrder.branch.address,
      },
      invoice: {
        id: counterOrder.invoice._id,
        invoiceNumber: counterOrder.invoice.invoiceNumber,
      },
      items: counterOrder.items,
      subtotal: counterOrder.subtotal,
      gstAmount: counterOrder.gstAmount || 0,
      tax: counterOrder.tax,
      serviceCharge: counterOrder.serviceCharge,
      totalAmount: counterOrder.totalAmount,
      grandTotal: counterOrder.grandTotal,
      paymentMethod: counterOrder.paymentMethod,
      orderStatus: counterOrder.orderStatus,
      paymentStatus: counterOrder.paymentStatus,
      cancellationReason: counterOrder.cancellationReason,
      cancelledAt: counterOrder.cancelledAt,
      createdAt: counterOrder.createdAt,
    },
  })
})

exports.getAllCounterOrders = asyncHandler(async (req, res) => {
  const counterOrders = await CounterOrder.find()
    .populate("userId", "name mobile")
    .populate("branch", "name address")
    .populate("invoice", "invoiceNumber")
    .populate("items.menuItemId", "name")
    .sort({ createdAt: -1 })

  if (!counterOrders || counterOrders.length === 0) {
    return res.status(200).json({
      message: "No counter orders found",
      orders: [],
    })
  }

  // Add null checks to prevent undefined errors
  const formattedOrders = counterOrders
    .map((order) => {
      // Check if all required populated fields exist
      if (!order.userId || !order.branch || !order.invoice) {
        console.warn(`Order ${order._id} has missing populated references`)
        return null
      }

      return {
        id: order._id,
        userId: {
          id: order.userId._id,
          name: order.userId.name,
          mobile: order.userId.mobile,
        },
        customerName: order.customerName,
        phoneNumber: order.phoneNumber,
        branch: {
          id: order.branch._id,
          name: order.branch.name,
          location: order.branch.address,
        },
        invoice: {
          id: order.invoice._id,
          invoiceNumber: order.invoice.invoiceNumber,
        },
        items: order.items || [],
        subtotal: order.subtotal,
        gstAmount: order.gstAmount || 0,
        tax: order.tax,
        serviceCharge: order.serviceCharge,
        totalAmount: order.totalAmount,
        grandTotal: order.grandTotal,
        paymentMethod: order.paymentMethod,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        cancellationReason: order.cancellationReason,
        cancelledAt: order.cancelledAt,
        createdAt: order.createdAt,
      }
    })
    .filter((order) => order !== null) // Remove any null entries

  res.status(200).json({
    message: "Counter orders retrieved successfully",
    count: formattedOrders.length,
    orders: formattedOrders,
  })
})

exports.getCounterOrdersByUserId = asyncHandler(async (req, res) => {
  const { userId } = req.params

  // Validate ObjectId format
  if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
    res.status(400)
    throw new Error("Invalid user ID format")
  }

  const counterOrders = await CounterOrder.find({ userId })
    .populate("userId", "name mobile")
    .populate("branch", "name address")
    .populate("invoice", "invoiceNumber")
    .populate("items.menuItemId", "name")
    .sort({ createdAt: -1 })

  if (!counterOrders || counterOrders.length === 0) {
    return res.status(200).json({
      message: "No counter orders found for this user",
      orders: [],
    })
  }

  const formattedOrders = counterOrders.map((order) => ({
    id: order._id,
    userId: {
      id: order.userId._id,
      name: order.userId.name,
      mobile: order.userId.mobile,
    },
    customerName: order.customerName,
    phoneNumber: order.phoneNumber,
    branch: {
      id: order.branch._id,
      name: order.branch.name,
      location: order.branch.address,
    },
    invoice: {
      id: order.invoice._id,
      invoiceNumber: order.invoice.invoiceNumber,
    },
    items: order.items || [],
    subtotal: order.subtotal,
    gstAmount: order.gstAmount || 0,
    tax: order.tax,
    serviceCharge: order.serviceCharge,
    totalAmount: order.totalAmount,
    grandTotal: order.grandTotal,
    paymentMethod: order.paymentMethod,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    cancellationReason: order.cancellationReason,
    cancelledAt: order.cancelledAt,
    createdAt: order.createdAt,
  }))

  res.status(200).json({
    message: "Counter orders retrieved successfully",
    count: formattedOrders.length,
    orders: formattedOrders,
  })
})

exports.updateCounterOrder = asyncHandler(async (req, res) => {
  const { id } = req.params
  const updateData = req.body

  // Validate ObjectId format
  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    res.status(400)
    throw new Error("Invalid order ID format")
  }

  const counterOrder = await CounterOrder.findById(id)
  if (!counterOrder) {
    res.status(404)
    throw new Error("Counter order not found")
  }

  // If items are being updated, recalculate totals
  if (updateData.items) {
    let calculatedSubtotal = 0
    for (const item of updateData.items) {
      calculatedSubtotal += item.price * item.quantity
    }

    updateData.subtotal = calculatedSubtotal
    updateData.tax = calculatedSubtotal * TAX_RATE
    updateData.serviceCharge = calculatedSubtotal * SERVICE_CHARGE_RATE
    updateData.totalAmount = calculatedSubtotal
    updateData.grandTotal = calculatedSubtotal + updateData.tax + updateData.serviceCharge
  }

  // Update the order
  Object.keys(updateData).forEach((key) => {
    if (updateData[key] !== undefined) {
      counterOrder[key] = updateData[key]
    }
  })

  await counterOrder.save()

  const populatedOrder = await CounterOrder.findById(id)
    .populate("userId", "name mobile")
    .populate("branch", "name address")
    .populate("invoice", "invoiceNumber")
    .populate("items.menuItemId", "name")

  res.status(200).json({
    message: "Counter order updated successfully",
    order: {
      id: populatedOrder._id,
      userId: {
        id: populatedOrder.userId._id,
        name: populatedOrder.userId.name,
        mobile: populatedOrder.userId.mobile,
      },
      customerName: populatedOrder.customerName,
      phoneNumber: populatedOrder.phoneNumber,
      branch: {
        id: populatedOrder.branch._id,
        name: populatedOrder.branch.name,
        location: populatedOrder.branch.address,
      },
      invoice: {
        id: populatedOrder.invoice._id,
        invoiceNumber: populatedOrder.invoice.invoiceNumber,
      },
      items: populatedOrder.items,
      subtotal: populatedOrder.subtotal,
      gstAmount: populatedOrder.gstAmount || 0,
      tax: populatedOrder.tax,
      serviceCharge: populatedOrder.serviceCharge,
      totalAmount: populatedOrder.totalAmount,
      grandTotal: populatedOrder.grandTotal,
      paymentMethod: populatedOrder.paymentMethod,
      orderStatus: populatedOrder.orderStatus,
      paymentStatus: populatedOrder.paymentStatus,
      cancellationReason: populatedOrder.cancellationReason,
      cancelledAt: populatedOrder.cancelledAt,
      createdAt: populatedOrder.createdAt,
    },
  })
})

// Update order status only
exports.updateCounterOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { orderStatus } = req.body

  // Validate ObjectId format
  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    res.status(400)
    throw new Error("Invalid order ID format")
  }

  if (!orderStatus || !["pending", "processing", "completed", "cancelled"].includes(orderStatus)) {
    res.status(400)
    throw new Error("Invalid order status. Must be one of: pending, processing, completed, cancelled")
  }

  const counterOrder = await CounterOrder.findById(id)
  if (!counterOrder) {
    res.status(404)
    throw new Error("Counter order not found")
  }

  // Check if order is already cancelled
  if (counterOrder.orderStatus === "cancelled") {
    res.status(400)
    throw new Error("Cannot update status of a cancelled order")
  }

  counterOrder.orderStatus = orderStatus
  await counterOrder.save()

  const populatedOrder = await CounterOrder.findById(id)
    .populate("userId", "name mobile")
    .populate("branch", "name address")
    .populate("invoice", "invoiceNumber")
    .populate("items.menuItemId", "name")

  res.status(200).json({
    message: "Counter order status updated successfully",
    order: {
      id: populatedOrder._id,
      userId: {
        id: populatedOrder.userId._id,
        name: populatedOrder.userId.name,
        mobile: populatedOrder.userId.mobile,
      },
      customerName: populatedOrder.customerName,
      phoneNumber: populatedOrder.phoneNumber,
      branch: {
        id: populatedOrder.branch._id,
        name: populatedOrder.branch.name,
        location: populatedOrder.branch.address,
      },
      invoice: {
        id: populatedOrder.invoice._id,
        invoiceNumber: populatedOrder.invoice.invoiceNumber,
      },
      items: populatedOrder.items,
      subtotal: populatedOrder.subtotal,
      gstAmount: populatedOrder.gstAmount || 0,
      tax: populatedOrder.tax,
      serviceCharge: populatedOrder.serviceCharge,
      totalAmount: populatedOrder.totalAmount,
      grandTotal: populatedOrder.grandTotal,
      paymentMethod: populatedOrder.paymentMethod,
      orderStatus: populatedOrder.orderStatus,
      paymentStatus: populatedOrder.paymentStatus,
      cancellationReason: populatedOrder.cancellationReason,
      cancelledAt: populatedOrder.cancelledAt,
      createdAt: populatedOrder.createdAt,
    },
  })
})

// Update payment status only
exports.updateCounterPaymentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { paymentStatus } = req.body

  // Validate ObjectId format
  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    res.status(400)
    throw new Error("Invalid order ID format")
  }

  if (!paymentStatus || !["pending", "completed", "failed", "refunded"].includes(paymentStatus)) {
    res.status(400)
    throw new Error("Invalid payment status. Must be one of: pending, completed, failed, refunded")
  }

  const counterOrder = await CounterOrder.findById(id)
  if (!counterOrder) {
    res.status(404)
    throw new Error("Counter order not found")
  }

  // Check if order is cancelled
  if (counterOrder.orderStatus === "cancelled") {
    res.status(400)
    throw new Error("Cannot update payment status of a cancelled order")
  }

  const previousPaymentStatus = counterOrder.paymentStatus;
  counterOrder.paymentStatus = paymentStatus
  await counterOrder.save()

  const populatedOrder = await CounterOrder.findById(id)
    .populate("userId", "name mobile")
    .populate("branch", "name address")
    .populate("invoice", "invoiceNumber")
    .populate("items.menuItemId", "name")

  // 🔥 AUTOMATION: Trigger stock deduction and CRM update when payment is completed
  if (paymentStatus === "completed" && previousPaymentStatus !== "completed") {
    try {
      const automationService = require("../services/restaurantAutomationService");
      
      // Deduct stock based on recipe ingredients
      const stockResult = await automationService.deductStockOnOrderCompletion(populatedOrder);
      console.log("[Automation] Stock deduction result:", stockResult);

      // Update CRM (loyalty points, visit count, tier upgrade)
      const crmResult = await automationService.updateCustomerCRM(populatedOrder);
      console.log("[Automation] CRM update result:", crmResult);

      // Check for low stock and generate purchase suggestions
      await automationService.checkLowStockAndSuggestPurchase();
    } catch (automationError) {
      console.error("[Automation] Error in automation triggers:", automationError);
      // Don't fail the request if automation fails
    }
  }

  res.status(200).json({
    message: "Counter payment status updated successfully",
    order: {
      id: populatedOrder._id,
      userId: {
        id: populatedOrder.userId._id,
        name: populatedOrder.userId.name,
        mobile: populatedOrder.userId.mobile,
      },
      customerName: populatedOrder.customerName,
      phoneNumber: populatedOrder.phoneNumber,
      branch: {
        id: populatedOrder.branch._id,
        name: populatedOrder.branch.name,
        location: populatedOrder.branch.address,
      },
      invoice: {
        id: populatedOrder.invoice._id,
        invoiceNumber: populatedOrder.invoice.invoiceNumber,
      },
      items: populatedOrder.items,
      subtotal: populatedOrder.subtotal,
      gstAmount: populatedOrder.gstAmount || 0,
      tax: populatedOrder.tax,
      serviceCharge: populatedOrder.serviceCharge,
      totalAmount: populatedOrder.totalAmount,
      grandTotal: populatedOrder.grandTotal,
      paymentMethod: populatedOrder.paymentMethod,
      orderStatus: populatedOrder.orderStatus,
      paymentStatus: populatedOrder.paymentStatus,
      cancellationReason: populatedOrder.cancellationReason,
      cancelledAt: populatedOrder.cancelledAt,
      createdAt: populatedOrder.createdAt,
    },
  })
})

// Cancel order with reason
exports.cancelCounterOrder = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { cancellationReason } = req.body

  // Validate ObjectId format
  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    res.status(400)
    throw new Error("Invalid order ID format")
  }

  if (!cancellationReason || !cancellationReason.trim()) {
    res.status(400)
    throw new Error("Cancellation reason is required")
  }

  if (cancellationReason.trim().length > 500) {
    res.status(400)
    throw new Error("Cancellation reason cannot exceed 500 characters")
  }

  const counterOrder = await CounterOrder.findById(id)
  if (!counterOrder) {
    res.status(404)
    throw new Error("Counter order not found")
  }

  // Check if order is already cancelled
  if (counterOrder.orderStatus === "cancelled") {
    res.status(400)
    throw new Error("Order is already cancelled")
  }

  // Check if order is completed
  if (counterOrder.orderStatus === "completed") {
    res.status(400)
    throw new Error("Cannot cancel a completed order")
  }

  // Update order status to cancelled and add cancellation reason
  counterOrder.orderStatus = "cancelled"
  counterOrder.cancellationReason = cancellationReason.trim()
  counterOrder.cancelledAt = new Date()
  await counterOrder.save()

  const populatedOrder = await CounterOrder.findById(id)
    .populate("userId", "name mobile")
    .populate("branch", "name address")
    .populate("invoice", "invoiceNumber")
    .populate("items.menuItemId", "name")

  res.status(200).json({
    message: "Counter order cancelled successfully",
    order: {
      id: populatedOrder._id,
      userId: {
        id: populatedOrder.userId._id,
        name: populatedOrder.userId.name,
        mobile: populatedOrder.userId.mobile,
      },
      customerName: populatedOrder.customerName,
      phoneNumber: populatedOrder.phoneNumber,
      branch: {
        id: populatedOrder.branch._id,
        name: populatedOrder.branch.name,
        location: populatedOrder.branch.address,
      },
      invoice: {
        id: populatedOrder.invoice._id,
        invoiceNumber: populatedOrder.invoice.invoiceNumber,
      },
      items: populatedOrder.items,
      subtotal: populatedOrder.subtotal,
      gstAmount: populatedOrder.gstAmount || 0,
      tax: populatedOrder.tax,
      serviceCharge: populatedOrder.serviceCharge,
      totalAmount: populatedOrder.totalAmount,
      grandTotal: populatedOrder.grandTotal,
      paymentMethod: populatedOrder.paymentMethod,
      orderStatus: populatedOrder.orderStatus,
      paymentStatus: populatedOrder.paymentStatus,
      cancellationReason: populatedOrder.cancellationReason,
      cancelledAt: populatedOrder.cancelledAt,
      createdAt: populatedOrder.createdAt,
    },
  })
})
