const KitchenDisplayOrder = require('../model/KitchenDisplayOrder');
const KitchenStation = require('../model/KitchenStation');
const Branch = require('../model/Branch');
const Employee = require('../model/EmployeeRegistration');
const { emitOrderUpdate, emitNewOrder, emitStatsUpdate } = require('../socketio');
const { calculateOrderPriority } = require('../utils/priorityCalculator');

// Create/Update KDS Order from any source
exports.syncOrderToKDS = async (req, res) => {
  try {
    const { orderSource, branchId, originalOrderId, originalOrderType, orderData } = req.body;

    // Validate inputs
    if (!orderSource || !branchId || !originalOrderId || !orderData) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Find or create KDS order
    let kdsOrder = await KitchenDisplayOrder.findOne({ originalOrderId, originalOrderType });

    if (kdsOrder) {
      // Update existing order
      Object.assign(kdsOrder, {
        orderNumber: orderData.orderId || orderData.orderNumber,
        customerName: orderData.customerName,
        customerContact: orderData.customerMobile || orderData.phone,
        tableNumber: orderData.tableNumber || 'N/A',
        peopleCount: orderData.peopleCount || 1,
        items: orderData.items.map(item => ({
          menuItemId: item.menuItemId || item._id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          category: item.category,
          cookingStation: item.cookingStation || 'main-kitchen',
          specialInstructions: item.specialInstructions || item.notes || '',
          status: item.status || 'pending'
        })),
        subtotal: orderData.subtotal,
        tax: orderData.tax,
        serviceCharge: orderData.serviceCharge,
        grandTotal: orderData.grandTotal,
        paymentStatus: orderData.paymentStatus
      });
      
      await kdsOrder.save();
    } else {
      // Calculate auto-priority
      const priorityData = calculateOrderPriority(orderData);
      
      // Create new KDS order
      kdsOrder = new KitchenDisplayOrder({
        orderSource,
        branchId,
        branchName: orderData.branchName,
        originalOrderId,
        originalOrderType,
        orderNumber: orderData.orderId || orderData.orderNumber,
        orderDate: new Date(orderData.orderTime || orderData.createdAt || Date.now()),
        tableNumber: orderData.tableNumber || 'N/A',
        customerName: orderData.customerName,
        customerContact: orderData.customerMobile || orderData.phone,
        peopleCount: orderData.peopleCount || 1,
        orderStatus: 'pending',
        priority: priorityData.priority,
        items: orderData.items.map(item => ({
          menuItemId: item.menuItemId || item._id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          category: item.category,
          cookingStation: item.cookingStation || 'main-kitchen',
          specialInstructions: item.specialInstructions || item.notes || '',
          status: 'pending'
        })),
        subtotal: orderData.subtotal,
        tax: orderData.tax,
        serviceCharge: orderData.serviceCharge,
        grandTotal: orderData.grandTotal,
        paymentStatus: orderData.paymentStatus,
        notes: orderData.notes
      });

      await kdsOrder.save();

      // Emit new order event via Socket.io
      emitNewOrder(branchId, kdsOrder);
    }

    res.status(200).json({
      success: true,
      message: 'Order synced to KDS successfully',
      order: kdsOrder
    });
  } catch (error) {
    console.error('Error syncing order to KDS:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync order to KDS',
      error: error.message
    });
  }
};

// Get all KDS orders for a branch
exports.getKDSOrders = async (req, res) => {
  try {
    const { branchId, status, priority, startDate, endDate } = req.query;

    const query = {};
    if (branchId) query.branchId = branchId;
    if (status) query.orderStatus = status;
    if (priority) query.priority = priority;
    if (startDate || endDate) {
      query.orderDate = {};
      if (startDate) query.orderDate.$gte = new Date(startDate);
      if (endDate) query.orderDate.$lte = new Date(endDate);
    }

    const orders = await KitchenDisplayOrder.find(query)
      .populate('branchId', 'name address')
      .populate('assignedTo', 'name')
      .populate('assignedStation', 'name type')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      success: true,
      orders,
      count: orders.length
    });
  } catch (error) {
    console.error('Error fetching KDS orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch KDS orders',
      error: error.message
    });
  }
};

// Update item status
exports.updateItemStatus = async (req, res) => {
  try {
    const { orderId, itemId, status } = req.body;

    const order = await KitchenDisplayOrder.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const item = order.items.id(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Update item status and timestamps
    item.status = status;
    if (status === 'preparing' && !item.startedAt) {
      item.startedAt = new Date();
    } else if (status === 'ready' && !item.readyAt) {
      item.readyAt = new Date();
    }

    // Check if all items are ready
    const allReady = order.items.every(i => i.status === 'ready');
    if (allReady && order.orderStatus !== 'ready') {
      order.orderStatus = 'ready';
      order.readyAt = new Date();
    }

    // Add notification if item is ready
    if (status === 'ready') {
      order.notifications.push({
        type: 'item-ready',
        message: `${item.name} is ready`,
        read: false
      });
    }

    await order.save();

    // Emit real-time update via Socket.io
    emitOrderUpdate(order.branchId, orderId, item.status, order);

    res.json({
      success: true,
      message: 'Item status updated',
      order
    });
  } catch (error) {
    console.error('Error updating item status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update item status',
      error: error.message
    });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId, status, reason } = req.body;

    const order = await KitchenDisplayOrder.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Add to status history
    order.statusHistory.push({
      status: order.orderStatus,
      changedAt: new Date(),
      reason
    });

    // Update status
    order.orderStatus = status;
    order.lastStatusChange = new Date();

    // Set timestamp based on status
    switch (status) {
      case 'acknowledged':
        order.acknowledgedAt = new Date();
        break;
      case 'preparing':
        order.startedAt = new Date();
        break;
      case 'ready':
        order.readyAt = new Date();
        break;
      case 'served':
      case 'delivered':
        order.servedAt = new Date();
        break;
      case 'completed':
        order.completedAt = new Date();
        break;
    }

    await order.save();

    // Emit real-time update via Socket.io
    emitOrderUpdate(order.branchId, orderId, status, order);

    res.json({
      success: true,
      message: 'Order status updated',
      order
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error.message
    });
  }
};

// Hold order
exports.holdOrder = async (req, res) => {
  try {
    const { orderId, reason } = req.body;

    const order = await KitchenDisplayOrder.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    order.orderStatus = 'on-hold';
    order.holdReason = reason;
    order.statusHistory.push({
      status: 'on-hold',
      changedAt: new Date(),
      reason
    });

    await order.save();

    res.json({
      success: true,
      message: 'Order placed on hold',
      order
    });
  } catch (error) {
    console.error('Error holding order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to hold order',
      error: error.message
    });
  }
};

// Cancel order
exports.cancelOrder = async (req, res) => {
  try {
    const { orderId, reason } = req.body;

    const order = await KitchenDisplayOrder.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    order.orderStatus = 'cancelled';
    order.cancelReason = reason;
    order.statusHistory.push({
      status: 'cancelled',
      changedAt: new Date(),
      reason
    });

    await order.save();

    res.json({
      success: true,
      message: 'Order cancelled',
      order
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order',
      error: error.message
    });
  }
};

// Get dashboard stats
exports.getDashboardStats = async (req, res) => {
  try {
    const { branchId } = req.params;

    const stats = await KitchenDisplayOrder.aggregate([
      {
        $match: { branchId: branchId }
      },
      {
        $group: {
          _id: '$orderStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats',
      error: error.message
    });
  }
};

