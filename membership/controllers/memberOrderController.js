const MemberOrder = require("../models/MemberOrder");
const Member = require("../models/Member");
const asyncHandler = require("express-async-handler");

// @desc    Place a new order (Member)
// @route   POST /api/v1/hotel/member-orders
// @access  Private/Member
exports.placeOrder = asyncHandler(async (req, res) => {
  const { items, notes, branchId } = req.body;

  if (!items || items.length === 0) {
    res.status(400);
    throw new Error("Please provide items to order");
  }

  // Calculate total
  const totalAmount = items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);

  // Check if member has sufficient balance
  const member = await Member.findById(req.member._id);
  if (!member) {
    res.status(404);
    throw new Error("Member not found");
  }

  if (member.walletBalance < totalAmount) {
    res.status(400);
    throw new Error(`Insufficient wallet balance. You have ₹${member.walletBalance}, but order total is ₹${totalAmount}`);
  }

  // Format items with subtotal
  const formattedItems = items.map(item => ({
    menuItemId: item._id || item.menuItemId,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    subtotal: item.price * item.quantity,
  }));

  // Create order
  const order = await MemberOrder.create({
    memberId: req.member._id,
    memberName: req.member.name || "Member",
    memberEmail: req.member.email || "",
    memberPhone: req.member.phone || req.member.mobile || "",
    items: formattedItems,
    totalAmount,
    notes: notes || "",
    branchId: branchId || null,
    status: "pending",
    paymentStatus: "pending",
  });

  res.status(201).json({
    success: true,
    message: "Order placed successfully! Waiting for admin confirmation.",
    order,
  });
});

// @desc    Get member's own orders
// @route   GET /api/v1/hotel/member-orders/my-orders
// @access  Private/Member
exports.getMyOrders = asyncHandler(async (req, res) => {
  const orders = await MemberOrder.find({ memberId: req.member._id })
    .sort({ createdAt: -1 })
    .populate("branchId", "name address");

  res.json({
    success: true,
    orders,
  });
});

// @desc    Get all member orders (Admin)
// @route   GET /api/v1/hotel/member-orders/all
// @access  Private/Admin
exports.getAllOrders = asyncHandler(async (req, res) => {
  const {
    status,
    paymentStatus,
    startDate,
    endDate,
    page = 1,
    limit = 20,
  } = req.query;

  const query = {};

  if (status) query.status = status;
  if (paymentStatus) query.paymentStatus = paymentStatus;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;

  const orders = await MemberOrder.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .populate("branchId", "name address");

  const total = await MemberOrder.countDocuments(query);

  res.json({
    success: true,
    orders,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
  });
});

// @desc    Complete order and deduct from wallet (Admin)
// @route   PUT /api/v1/hotel/member-orders/:id/complete
// @access  Private/Admin
exports.completeOrder = asyncHandler(async (req, res) => {
  const order = await MemberOrder.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (order.status === "completed") {
    res.status(400);
    throw new Error("Order is already completed");
  }

  if (order.paymentStatus === "paid") {
    res.status(400);
    throw new Error("Payment already processed");
  }

  // Get member and deduct amount
  const member = await Member.findById(order.memberId);
  
  if (!member) {
    res.status(404);
    throw new Error("Member not found");
  }

  if (member.walletBalance < order.totalAmount) {
    res.status(400);
    throw new Error(`Member has insufficient balance. Current balance: ₹${member.walletBalance}`);
  }

  // Deduct from wallet
  member.walletBalance -= order.totalAmount;
  await member.save();

  // Update order status
  order.status = "completed";
  order.paymentStatus = "paid";
  order.completedAt = new Date();
  order.completedBy = req.admin?._id || req.user?._id;
  await order.save();

  res.json({
    success: true,
    message: `Order completed! ₹${order.totalAmount} deducted from member's wallet.`,
    order,
    remainingBalance: member.walletBalance,
  });
});

// @desc    Update order status (Admin)
// @route   PUT /api/v1/hotel/member-orders/:id/status
// @access  Private/Admin
exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!["pending", "preparing", "completed", "cancelled"].includes(status)) {
    res.status(400);
    throw new Error("Invalid status");
  }

  const order = await MemberOrder.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  order.status = status;
  await order.save();

  res.json({
    success: true,
    message: "Order status updated",
    order,
  });
});

// @desc    Cancel order (Member/Admin)
// @route   PUT /api/v1/hotel/member-orders/:id/cancel
// @access  Private
exports.cancelOrder = asyncHandler(async (req, res) => {
  const order = await MemberOrder.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (order.status === "completed") {
    res.status(400);
    throw new Error("Cannot cancel completed order");
  }

  if (order.paymentStatus === "paid") {
    res.status(400);
    throw new Error("Cannot cancel paid order. Please contact admin for refund.");
  }

  order.status = "cancelled";
  await order.save();

  res.json({
    success: true,
    message: "Order cancelled successfully",
    order,
  });
});
