// utils/kitchenService.js
const KitchenOrder = require('../model/KitchenOrderModel');
const KitchenNotification = require('../model/NotificationModel');

exports.createKitchenOrderFromOriginal = async (orderId, orderType) => {
  try {
    let originalOrder;
    let orderModel;
    
    // Determine which model to use based on orderType
    switch (orderType) {
      case 'StaffOrder':
        orderModel = require('../models/StaffOrder');
        break;
      case 'CounterOrder':
        orderModel = require('../models/CounterOrder');
        break;
      case 'Order':
      default:
        orderModel = require('../models/Order');
        break;
    }

    // Fetch the original order
    originalOrder = await orderModel.findById(orderId)
      .populate('branchId')
      .populate('branch')
      .populate('items.menuItemId');

    if (!originalOrder) {
      throw new Error(`Original order not found with ID: ${orderId}`);
    }

    // Check if kitchen order already exists
    const existingKitchenOrder = await KitchenOrder.findOne({
      orderType,
      originalOrderId: orderId
    });

    if (existingKitchenOrder) {
      return existingKitchenOrder;
    }

    // Prepare kitchen order data
    const orderData = {
      originalOrderId: orderId,
      orderType,
      orderNumber: originalOrder.orderNumber || originalOrder.orderId,
      branchId: originalOrder.branchId || originalOrder.branch?._id || originalOrder.branch,
      customerName: originalOrder.customerName || originalOrder.name,
      customerPhone: originalOrder.customerPhone || originalOrder.phone,
      orderTime: originalOrder.createdAt || new Date(),
      status: 'Pending'
    };

    // Add type-specific fields
    if (orderType === 'StaffOrder') {
      orderData.tableNumber = originalOrder.tableNumber || '';
      orderData.waiterName = originalOrder.userId?.name || '';
    } else if (orderType === 'CounterOrder') {
      orderData.tableNumber = 'Counter';
      orderData.customerName = originalOrder.customerName;
      orderData.customerPhone = originalOrder.phoneNumber;
    }

    // Process items
    orderData.items = originalOrder.items.map(item => ({
      menuItemId: item.menuItemId,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      category: item.category || item.menuItemId?.category || 'Uncategorized',
      notes: item.notes || item.specialInstructions || '',
      status: 'Pending'
    }));

    const kitchenOrder = new KitchenOrder(orderData);
    await kitchenOrder.save();

    // Create notification for new order
    const notification = new KitchenNotification({
      type: 'new_order',
      message: `New ${orderType} received: ${orderData.orderNumber}`,
      orderId: kitchenOrder._id,
      orderNumber: orderData.orderNumber,
      branchId: orderData.branchId,
      priority: 'high'
    });
    await notification.save();

    return kitchenOrder;
  } catch (error) {
    console.error('Error creating kitchen order:', error.message);
    throw error;
  }
};