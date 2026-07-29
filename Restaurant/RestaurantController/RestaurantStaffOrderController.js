const StaffOrder = require("../model/staffOrderModel")
const StaffLogin = require("../model/staffLoginModel")
const mongoose = require("mongoose")

// Create a new staff order after payment success (EXISTING - UPDATED)
exports.createStaffOrderAfterPayment = async (req, res) => {
  try {
    const {
      userId, // Add userId to destructuring
      restaurant,
      table,
      peopleCount,
      cart,
      totalAmount,
      orderId,
      orderTime,
      grandTotal,
      paymentMethod,
      notes,
      branchId,
      tableId,
    } = req.body

    console.log("Received staff order creation request with userId:", userId)

    // Validate userId
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required for staff orders",
      })
    }

    // Verify user exists
    const user = await StaffLogin.findById(userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    // Validate required fields
    if (!restaurant || !restaurant.name) {
      return res.status(400).json({
        success: false,
        message: "Restaurant/Branch information is required",
      })
    }

    if (!table || !table.number) {
      return res.status(400).json({
        success: false,
        message: "Table information is required",
      })
    }

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order must contain at least one item",
      })
    }

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      })
    }

    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Payment method is required",
      })
    }

    // Check if order already exists
    const existingOrder = await StaffOrder.findOne({ orderId })
    if (existingOrder) {
      return res.status(200).json({
        success: true,
        message: "Order already exists",
        order: existingOrder,
      })
    }

    // Process cart items
    const orderItems = cart.map((item) => ({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      image: item.image || "",
      description: item.description || "",
    }))

    // Calculate totals
    const subtotal = totalAmount
    const tax = subtotal * 0.05 // 5% tax
    const serviceCharge = subtotal * 0.1 // 10% service charge
    const calculatedGrandTotal = subtotal + tax + serviceCharge

    // Prepare order data
    const orderData = {
      userId, // Include userId in order data
      orderId,
      branchName: restaurant.name,
      tableNumber: table.number.toString(),
      peopleCount,
      items: orderItems,
      subtotal,
      tax,
      serviceCharge,
      totalAmount: subtotal,
      grandTotal: grandTotal || calculatedGrandTotal,
      paymentStatus: "completed",
      paymentMethod,
      orderTime: new Date(orderTime),
      notes: notes || "",
      status: "pending",
      isGuestOrder: false, // This is a staff order
    }

    // Add IDs if provided by frontend
    if (branchId) {
      orderData.branchId = branchId
    } else {
  // Don't create a random ID - either require branchId or look it up
  console.error('branchId is required but not provided!');
  return res.status(400).json({
    success: false,
    message: 'Branch ID is required',
  });
}

    if (tableId) {
      orderData.tableId = tableId
    } else {
  console.error('tableId is required but not provided!');
  return res.status(400).json({
    success: false,
    message: 'Table ID is required',
  });
}

    // Create the staff order
    const staffOrder = new StaffOrder(orderData)
    await staffOrder.save()

    console.log("Staff order created successfully for user:", userId, "Order ID:", staffOrder.orderId)

    res.status(201).json({
      success: true,
      message: "Staff order created successfully",
      order: staffOrder,
    })
  } catch (error) {
    console.error("Error creating staff order after payment:", error)
    res.status(500).json({
      success: false,
      message: "Error creating staff order after payment",
      error: error.message,
    })
  }
}

// NEW: Create a guest order
exports.createGuestOrder = async (req, res) => {
  try {
    const {
      orderId,
      customerName,
      customerMobile,
      branchId,
      branchName,
      tableNumber,
      peopleCount,
      items,
      subtotal,
      tax,
      serviceCharge,
      totalAmount,
      grandTotal,
      paymentMethod,
      orderTime,
      notes,
    } = req.body

    console.log("Received guest order creation request:", req.body)

    // Validate required fields for guest orders
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      })
    }

    if (!customerName || !customerName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Customer name is required",
      })
    }

    if (!customerMobile || !customerMobile.trim()) {
      return res.status(400).json({
        success: false,
        message: "Customer mobile is required",
      })
    }

    // Validate mobile number format
    if (!/^[0-9]{10}$/.test(customerMobile.trim())) {
      return res.status(400).json({
        success: false,
        message: "Mobile number must be 10 digits",
      })
    }

    if (!branchId || !branchName) {
      return res.status(400).json({
        success: false,
        message: "Branch information is required",
      })
    }

    if (!tableNumber) {
      return res.status(400).json({
        success: false,
        message: "Table number is required",
      })
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order must contain at least one item",
      })
    }

    // Check if order already exists
    const existingOrder = await StaffOrder.findOne({ orderId })
    if (existingOrder) {
      return res.status(200).json({
        success: true,
        message: "Order already exists",
        order: existingOrder,
      })
    }

    // Import Table model
    const Table = require("../RestautantModel/RestaurantTabelModel")

    // Find the table by branch and table number
    const table = await Table.findOne({
      branchId: branchId,
      number: Number.parseInt(tableNumber),
    })

    let tableId = new mongoose.Types.ObjectId() // Default to a new ObjectId

    // If table exists, use its ID and update its status
    if (table) {
      tableId = table._id

      // Update table status to reserved
      await Table.findByIdAndUpdate(tableId, { status: "reserved" }, { new: true })

      console.log(`Table ${tableNumber} status updated to reserved`)
    }

    // Create the guest order using StaffOrder model
    const guestOrder = new StaffOrder({
      orderId,
      customerName: customerName.trim(),
      customerMobile: customerMobile.trim(),
      branchId: branchId,
      branchName,
      tableId: tableId,
      tableNumber,
      peopleCount: Number.parseInt(peopleCount) || 1,
      items,
      subtotal: Number.parseFloat(subtotal) || 0,
      tax: Number.parseFloat(tax) || 0,
      serviceCharge: Number.parseFloat(serviceCharge) || 0,
      totalAmount: Number.parseFloat(totalAmount) || 0,
      grandTotal: Number.parseFloat(grandTotal) || 0,
      paymentMethod: paymentMethod || "cash",
      paymentStatus: "pending", // Guest orders start as pending payment
      orderTime: new Date(orderTime) || new Date(),
      notes: notes || `Guest order from Table ${tableNumber}`,
      status: "pending",
      isGuestOrder: true, // Mark as guest order
    })

    await guestOrder.save()

    console.log("Guest order created successfully:", guestOrder.orderId)

    res.status(201).json({
      success: true,
      message: "Guest order created successfully",
      order: guestOrder,
    })
  } catch (error) {
    console.error("Error creating guest order:", error)
    res.status(500).json({
      success: false,
      message: "Error creating guest order",
      error: error.message,
    })
  }
}

// Get orders by userId - EXISTING FUNCTION
exports.getOrdersByUserId = async (req, res) => {
  try {
    const { userId } = req.params

    console.log("Fetching orders for userId:", userId)

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      })
    }

    // Verify user exists
    const user = await StaffLogin.findById(userId)
    if (!user) {
      console.log("User not found for userId:", userId)
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    console.log("User found:", user.name)

    const orders = await StaffOrder.find({ userId, isGuestOrder: false }) // Only staff orders
      .populate("branchId", "name address")
      .populate("tableId", "number capacity")
      .populate("userId", "name mobile") // Populate user details
      .sort({ createdAt: -1 })

    console.log("Found staff orders:", orders.length)

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
      user: {
        name: user.name,
        mobile: user.mobile,
      },
    })
  } catch (error) {
    console.error("Error fetching user orders:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching orders",
      error: error.message,
    })
  }
}

// Get all orders (both staff and guest) - UPDATED FUNCTION
exports.getAllStaffOrders = async (req, res) => {
  try {
    const { branchId, branchName, tableId, tableNumber, status, paymentStatus, userId, search, orderType } = req.query

    // Build filter based on query parameters
    const filter = {}
    if (branchId) filter.branchId = branchId
    if (branchName) filter.branchName = new RegExp(branchName, "i")
    if (tableId) filter.tableId = tableId
    if (tableNumber) filter.tableNumber = tableNumber
    if (status) filter.status = status
    if (paymentStatus) filter.paymentStatus = paymentStatus
    if (userId) filter.userId = userId

    // NEW: Filter by order type
    if (orderType === "staff") {
      filter.isGuestOrder = false
    } else if (orderType === "guest") {
      filter.isGuestOrder = true
    }
    // If orderType is "all" or not specified, don't add filter

    // Add search functionality
    if (search) {
      const searchRegex = new RegExp(search, "i")
      filter.$or = [
        { orderId: searchRegex },
        { tableNumber: searchRegex },
        { branchName: searchRegex },
        { customerName: searchRegex }, // NEW: Search guest customer names
        { customerMobile: searchRegex }, // NEW: Search guest mobile numbers
      ]
    }

    const staffOrders = await StaffOrder.find(filter)
      .populate("branchId", "name address")
      .populate("tableId", "number capacity")
      .populate("userId", "name mobile") // This will be null for guest orders
      .sort({ createdAt: -1 })

    res.status(200).json({
      success: true,
      count: staffOrders.length,
      orders: staffOrders,
    })
  } catch (error) {
    console.error("Error fetching orders:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching orders",
      error: error.message,
    })
  }
}

// Get a staff order by ID - EXISTING FUNCTION
exports.getStaffOrderById = async (req, res) => {
  try {
    const staffOrder = await StaffOrder.findById(req.params.id)
      .populate("branchId", "name address")
      .populate("tableId", "number capacity")
      .populate("userId", "name mobile")

    if (!staffOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }
    res.status(200).json({
      success: true,
      order: staffOrder,
    })
  } catch (error) {
    console.error("Error fetching order:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching order",
      error: error.message,
    })
  }
}

// Get staff order by orderId - EXISTING FUNCTION
exports.getStaffOrderByOrderId = async (req, res) => {
  try {
    const { orderId } = req.params
    console.log("Looking for order with orderId:", orderId)

    const staffOrder = await StaffOrder.findOne({ orderId })
      .populate("branchId", "name address")
      .populate("tableId", "number capacity")
      .populate("userId", "name mobile")

    if (!staffOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    console.log("Found order:", staffOrder.orderId)

    res.status(200).json({
      success: true,
      order: staffOrder,
    })
  } catch (error) {
    console.error("Error fetching order by orderId:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching order",
      error: error.message,
    })
  }
}

// Update a staff order status - EXISTING FUNCTION (works for both staff and guest orders)
exports.updateStaffOrderStatus = async (req, res) => {
  try {
    const { status, paymentStatus, paymentMethod, notes } = req.body

    const updateData = {}
    if (status) updateData.status = status
    if (paymentStatus) updateData.paymentStatus = paymentStatus
    if (paymentMethod) updateData.paymentMethod = paymentMethod
    if (notes !== undefined) updateData.notes = notes

    // Validate payment status if provided
    if (paymentStatus) {
      const validPaymentStatuses = ["pending", "completed", "failed", "refunded"]
      if (!validPaymentStatuses.includes(paymentStatus)) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment status",
        })
      }
    }

    // Validate payment method if provided
    if (paymentMethod) {
      const validPaymentMethods = ["card", "upi", "netbanking", "cash", "wallet"]
      if (!validPaymentMethods.includes(paymentMethod)) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment method",
        })
      }
    }

    const previousOrder = await StaffOrder.findById(req.params.id);
    
    const staffOrder = await StaffOrder.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("branchId", "name address")
      .populate("tableId", "number capacity")
      .populate("userId", "name mobile")

    if (!staffOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    // 🔥 AUTOMATION: Trigger stock deduction and CRM update when payment is completed
    if (paymentStatus === "completed" && previousOrder?.paymentStatus !== "completed") {
      try {
        const automationService = require("../services/restaurantAutomationService");
        
        // Deduct stock based on recipe ingredients
        const stockResult = await automationService.deductStockOnOrderCompletion(staffOrder);
        console.log("[Automation] Stock deduction result:", stockResult);

        // Update CRM (loyalty points, visit count, tier upgrade)
        const crmResult = await automationService.updateCustomerCRM(staffOrder);
        console.log("[Automation] CRM update result:", crmResult);

        // Check for low stock and generate purchase suggestions
        await automationService.checkLowStockAndSuggestPurchase();
      } catch (automationError) {
        console.error("[Automation] Error in automation triggers:", automationError);
        // Don't fail the request if automation fails
      }
    }

    res.status(200).json({
      success: true,
      message: "Order updated successfully",
      order: staffOrder,
    })
  } catch (error) {
    console.error("Error updating order:", error)
    res.status(400).json({
      success: false,
      message: "Error updating order",
      error: error.message,
    })
  }
}

// Delete a staff order - EXISTING FUNCTION (works for both staff and guest orders)
exports.deleteStaffOrder = async (req, res) => {
  try {
    const staffOrder = await StaffOrder.findById(req.params.id)

    if (!staffOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    // Only allow deletion of pending orders
    if (staffOrder.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending orders can be deleted",
      })
    }

    await StaffOrder.findByIdAndDelete(req.params.id)

    res.status(200).json({
      success: true,
      message: "Order deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting order:", error)
    res.status(500).json({
      success: false,
      message: "Error deleting order",
      error: error.message,
    })
  }
}

// Add items to an existing staff order - EXISTING FUNCTION
exports.addItemsToStaffOrder = async (req, res) => {
  try {
    const { items } = req.body

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Request must contain at least one item",
      })
    }

    // Find the staff order
    const staffOrder = await StaffOrder.findById(req.params.id)
    if (!staffOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    // Only allow adding items to pending or preparing orders
    if (!["pending", "preparing"].includes(staffOrder.status)) {
      return res.status(400).json({
        success: false,
        message: "Items can only be added to pending or preparing orders",
      })
    }

    // Process each new item
    for (const item of items) {
      // Check if the item already exists in the order
      const existingItemIndex = staffOrder.items.findIndex(
        (orderItem) => orderItem.menuItemId.toString() === item.menuItemId,
      )

      if (existingItemIndex !== -1) {
        // Update quantity of existing item
        staffOrder.items[existingItemIndex].quantity += item.quantity
      } else {
        // Add new item to order
        staffOrder.items.push({
          menuItemId: item.menuItemId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image || "",
          description: item.description || "",
        })
      }
      // Update subtotal
      staffOrder.subtotal += item.price * item.quantity
    }

    // Recalculate tax, service charge, and total
    staffOrder.tax = staffOrder.subtotal * 0.05
    staffOrder.serviceCharge = staffOrder.subtotal * 0.1
    staffOrder.totalAmount = staffOrder.subtotal
    staffOrder.grandTotal = staffOrder.subtotal + staffOrder.tax + staffOrder.serviceCharge

    await staffOrder.save()

    res.status(200).json({
      success: true,
      message: "Items added to order successfully",
      order: staffOrder,
    })
  } catch (error) {
    console.error("Error adding items to order:", error)
    res.status(400).json({
      success: false,
      message: "Error adding items to order",
      error: error.message,
    })
  }
}

// Get staff orders by branch and table - EXISTING FUNCTION
exports.getStaffOrdersByTable = async (req, res) => {
  try {
    const { branchId, tableId } = req.params

    const filter = {
      status: { $in: ["pending", "preparing", "served"] },
    }

    if (branchId) filter.branchId = branchId
    if (tableId) filter.tableId = tableId

    const staffOrders = await StaffOrder.find(filter)
      .populate("branchId", "name address")
      .populate("tableId", "number capacity")
      .populate("userId", "name mobile")
      .sort({ createdAt: -1 })

    res.status(200).json({
      success: true,
      count: staffOrders.length,
      orders: staffOrders,
    })
  } catch (error) {
    console.error("Error fetching orders for table:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching orders for table",
      error: error.message,
    })
  }
}

// Get orders by payment status - EXISTING FUNCTION
exports.getOrdersByPaymentStatus = async (req, res) => {
  try {
    const { paymentStatus } = req.params

    const orders = await StaffOrder.find({ paymentStatus })
      .populate("branchId", "name address")
      .populate("tableId", "number capacity")
      .populate("userId", "name mobile")
      .sort({ createdAt: -1 })

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    })
  } catch (error) {
    console.error("Error fetching orders by payment status:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching orders by payment status",
      error: error.message,
    })
  }
}

// Get orders by branch - EXISTING FUNCTION
exports.getOrdersByBranch = async (req, res) => {
  try {
    const { branchId } = req.params
    const { status, paymentStatus, userId, orderType } = req.query

    const filter = { branchId }
    if (status) filter.status = status
    if (paymentStatus) filter.paymentStatus = paymentStatus
    if (userId) filter.userId = userId

    // NEW: Filter by order type
    if (orderType === "staff") {
      filter.isGuestOrder = false
    } else if (orderType === "guest") {
      filter.isGuestOrder = true
    }

    const orders = await StaffOrder.find(filter)
      .populate("branchId", "name address")
      .populate("tableId", "number capacity")
      .populate("userId", "name mobile")
      .sort({ createdAt: -1 })

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    })
  } catch (error) {
    console.error("Error fetching orders by branch:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching orders by branch",
      error: error.message,
    })
  }
}

// Get order statistics - UPDATED FUNCTION
exports.getOrderStatistics = async (req, res) => {
  try {
    const { branchId, userId, orderType } = req.query

    const matchFilter = {}
    if (branchId) matchFilter.branchId = new mongoose.Types.ObjectId(branchId)
    if (userId) matchFilter.userId = new mongoose.Types.ObjectId(userId)

    // NEW: Filter by order type
    if (orderType === "staff") {
      matchFilter.isGuestOrder = false
    } else if (orderType === "guest") {
      matchFilter.isGuestOrder = true
    }

    const stats = await StaffOrder.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$grandTotal" },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          completedOrders: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          staffOrders: {
            $sum: { $cond: [{ $eq: ["$isGuestOrder", false] }, 1, 0] },
          },
          guestOrders: {
            $sum: { $cond: [{ $eq: ["$isGuestOrder", true] }, 1, 0] },
          },
          averageOrderValue: { $avg: "$grandTotal" },
        },
      },
    ])

    const paymentStats = await StaffOrder.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: "$paymentMethod",
          count: { $sum: 1 },
          totalAmount: { $sum: "$grandTotal" },
        },
      },
    ])

    const branchStats = await StaffOrder.aggregate([
      { $match: userId ? { userId: new mongoose.Types.ObjectId(userId) } : {} },
      {
        $group: {
          _id: "$branchId",
          branchName: { $first: "$branchName" },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$grandTotal" },
          staffOrders: {
            $sum: { $cond: [{ $eq: ["$isGuestOrder", false] }, 1, 0] },
          },
          guestOrders: {
            $sum: { $cond: [{ $eq: ["$isGuestOrder", true] }, 1, 0] },
          },
        },
      },
      { $sort: { totalRevenue: -1 } },
    ])

    res.status(200).json({
      success: true,
      statistics: stats[0] || {},
      paymentMethodStats: paymentStats,
      branchStats,
    })
  } catch (error) {
    console.error("Error fetching order statistics:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching order statistics",
      error: error.message,
    })
  }
}

// NEW: Get guest orders by mobile number
exports.getGuestOrdersByMobile = async (req, res) => {
  try {
    const { mobile } = req.params

    if (!mobile || !/^[0-9]{10}$/.test(mobile)) {
      return res.status(400).json({
        success: false,
        message: "Valid 10-digit mobile number is required",
      })
    }

    const orders = await StaffOrder.find({
      customerMobile: mobile,
      isGuestOrder: true,
    })
      .populate("branchId", "name address")
      .populate("tableId", "number capacity")
      .sort({ createdAt: -1 })

    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    })
  } catch (error) {
    console.error("Error fetching guest orders by mobile:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching guest orders by mobile",
      error: error.message,
    })
  }
}
