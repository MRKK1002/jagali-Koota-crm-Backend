const mongoose = require('mongoose');
// controllers/kitchenOrderController.js
const KitchenOrder = require('../model/KitchenOrderModel');
const KitchenNotification = require('../model/NotificationModel');
const Order = require('../model/orderModel');
const StaffOrder = require('../model/staffOrderModel');
const CounterOrder = require('../model/counterLoginModel');
const Menu = require('../model/menuModel');


// Create kitchen order from original order
// Create kitchen order from original order
// Create kitchen order from original order
// Create kitchen order from original order
// Create kitchen order from original order
// Create kitchen order from original order
// Create kitchen order from original order
exports.createKitchenOrder = async (req, res) => {
  try {
    const { orderId, orderType } = req.body;
    console.log('Creating kitchen order for:', { orderId, orderType });

    let originalOrder;
    let orderData;

    // Fetch the original order based on type
    switch (orderType) {
      case 'Online Order':
        originalOrder = await Order.findById(orderId)
          .populate('branchId')
          .populate('items.menuItemId');
        break;
      case 'Restaurant Order':
        // For StaffOrder - check if orderId is a valid ObjectId first
        if (mongoose.Types.ObjectId.isValid(orderId)) {
          originalOrder = await StaffOrder.findById(orderId)
            .populate('branchId')
            .populate('userId');
        } else {
          originalOrder = await StaffOrder.findOne({ orderId: orderId })
            .populate('branchId')
            .populate('userId');
        }
        break;
      case 'Darshini Order':
        originalOrder = await CounterOrder.findById(orderId)
          .populate('branch')
          .populate('userId');
        break;
      default:
        return res.status(400).json({ message: 'Invalid order type' });
    }

    if (!originalOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Convert to plain object to avoid mongoose document issues
    const originalOrderPlain = originalOrder.toObject ? originalOrder.toObject() : originalOrder;

    // DEBUG: Log the original order structure
    console.log('Original Order branchId:', originalOrderPlain.branchId);
    console.log('Original Order branchName:', originalOrderPlain.branchName);

    // Prepare kitchen order data
    orderData = {
      originalOrderId: orderId,
      orderType,
      orderNumber: originalOrderPlain.orderNumber || originalOrderPlain.orderId,
      orderTime: originalOrderPlain.createdAt || originalOrderPlain.orderTime || new Date()
    };

    // Handle branchId - use existing branchId if available, otherwise use fallback
    if (originalOrderPlain.branchId && originalOrderPlain.branchId !== null) {
      orderData.branchId = originalOrderPlain.branchId;
      console.log('Using existing branchId:', orderData.branchId);
    } else {
      // Use a known branch ID from your database
      orderData.branchId = '683fe1cf84f0e8efaf2131bc'; // Replace with actual branch ID
      console.log('Using fallback branchId:', orderData.branchId);
    }

    // Extract data based on order type with fallbacks
    if (orderType === 'Online Order') {
      orderData.customerName = originalOrderPlain.name || originalOrderPlain.customerName || 'Online Customer';
      orderData.customerPhone = originalOrderPlain.phone || originalOrderPlain.customerPhone || '';
      orderData.deliveryAddress = originalOrderPlain.deliveryAddress || '';
      orderData.paymentStatus = originalOrderPlain.paymentStatus || 'pending';
    } 
    else if (orderType === 'Restaurant Order') {
      orderData.customerName = originalOrderPlain.customerName || 
                              (originalOrderPlain.userId && originalOrderPlain.userId.name) || 
                              `Table ${originalOrderPlain.tableNumber || 'Unknown'}`;
      
      orderData.customerPhone = originalOrderPlain.customerMobile || 
                               originalOrderPlain.customerPhone || 
                               originalOrderPlain.mobile || 
                               '';
      
      orderData.tableNumber = originalOrderPlain.tableNumber || '';
      orderData.waiterName = (originalOrderPlain.userId && originalOrderPlain.userId.name) || '';
      orderData.paymentStatus = originalOrderPlain.paymentStatus || 'pending';
    } 
    else if (orderType === 'Darshini Order') {
      orderData.customerName = originalOrderPlain.name || 'Counter Customer';
      orderData.customerPhone = originalOrderPlain.mobile || '';
      orderData.tableNumber = 'Counter';
      orderData.paymentStatus = 'paid at counter';
    }

    // DEBUG: Log the prepared order data
    console.log('PREPARED ORDER DATA:');
    console.log(JSON.stringify(orderData, null, 2));

    // Process items
    orderData.items = await Promise.all(
      originalOrderPlain.items.map(async (item) => {
        let menuItem;
        if (item.menuItemId) {
          menuItem = await Menu.findById(item.menuItemId);
        }

        return {
          menuItemId: item.menuItemId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          category: menuItem?.category || 'Uncategorized',
          notes: item.notes || item.specialInstructions || ''
        };
      })
    );

    // Check if kitchen order already exists
    const existingKitchenOrder = await KitchenOrder.findOne({
      orderType,
      originalOrderId: orderId
    });

    if (existingKitchenOrder) {
      return res.status(200).json({
        message: 'Kitchen order already exists',
        kitchenOrder: existingKitchenOrder
      });
    }

    const kitchenOrder = new KitchenOrder(orderData);
    await kitchenOrder.save();

    // Create notification for new order
    const notification = new KitchenNotification({
      type: 'new_order',
      message: `New order received: ${orderData.orderNumber}`,
      orderId: kitchenOrder._id,
      orderNumber: orderData.orderNumber,
      branchId: orderData.branchId,
      priority: 'high'
    });
    await notification.save();

    res.status(201).json({
      message: 'Kitchen order created successfully',
      kitchenOrder
    });
  } catch (error) {
    console.error('Error creating kitchen order:', error);
    res.status(500).json({
      message: 'Error creating kitchen order',
      error: error.message
    });
  }
};

// Get all kitchen orders with filters
exports.getKitchenOrders = async (req, res) => {
    try {
        const {
            branchId,
            status,
            orderType,
            category,
            search,
            page = 1,
            limit = 20
        } = req.query;

        const filter = {};
        if (branchId) filter.branchId = branchId;
        if (status && status !== 'All') filter.status = status;
        if (orderType && orderType !== 'All') filter.orderType = orderType;

        // Search functionality
        if (search) {
            filter.$or = [
                { orderNumber: { $regex: search, $options: 'i' } },
                { customerName: { $regex: search, $options: 'i' } },
                { tableNumber: { $regex: search, $options: 'i' } },
                { 'items.name': { $regex: search, $options: 'i' } }
            ];
        }

        // Category filter for items
        let categoryFilter = {};
        if (category && category !== 'All') {
            categoryFilter = { 'items.category': category };
        }

        const orders = await KitchenOrder.find({ ...filter, ...categoryFilter })
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await KitchenOrder.countDocuments({ ...filter, ...categoryFilter });

        res.status(200).json({
            orders,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error fetching kitchen orders',
            error: error.message
        });
    }
};

// Update item status
exports.updateItemStatus = async (req, res) => {
    try {
        const { orderId, itemId, status } = req.body;

        const kitchenOrder = await KitchenOrder.findById(orderId);
        if (!kitchenOrder) {
            return res.status(404).json({ message: 'Kitchen order not found' });
        }

        const item = kitchenOrder.items.id(itemId);
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }

        // Update item status and timestamps
        item.status = status;
        if (status === 'In Progress' && !item.startedAt) {
            item.startedAt = new Date();
        } else if (status === 'Ready' && !item.completedAt) {
            item.completedAt = new Date();
        }

        // Check if all items are ready to update order status
        const allItemsReady = kitchenOrder.items.every(item => item.status === 'Ready');
        const anyInProgress = kitchenOrder.items.some(item => item.status === 'In Progress');

        if (allItemsReady) {
            kitchenOrder.status = 'Ready';
        } else if (anyInProgress) {
            kitchenOrder.status = 'In Progress';
        }

        await kitchenOrder.save();

        // Create notification if item is marked as ready
        if (status === 'Ready') {
            const KitchenNotification = require('../RestautantModel/RestaurantKitchenNotificationModel');
            const notification = new KitchenNotification({
                type: 'item_ready',
                message: `${item.name} for Order ${kitchenOrder.orderNumber} is ready!`,
                orderId: kitchenOrder._id,
                orderNumber: kitchenOrder.orderNumber,
                branchId: kitchenOrder.branchId,
                priority: 'medium'
            });
            await notification.save();

            // 🔥 AUTOMATION: Notify waiters via Socket.io when item is ready
            try {
                const { getIO } = require('../../socketio');
                const io = getIO();
                
                if (io && kitchenOrder.branchId) {
                    // Emit to waiter room for this branch
                    io.to(`branch-${kitchenOrder.branchId}`).emit('kot-item-ready', {
                        orderId: kitchenOrder._id,
                        orderNumber: kitchenOrder.orderNumber,
                        itemName: item.name,
                        tableNumber: kitchenOrder.tableNumber || 'N/A',
                        message: `${item.name} for Order ${kitchenOrder.orderNumber} is ready for serving!`,
                        timestamp: new Date(),
                    });
                    
                    // Also emit to waiter-specific room if waiter is assigned
                    if (kitchenOrder.waiterId) {
                        io.to(`waiter-${kitchenOrder.waiterId}`).emit('kot-item-ready', {
                            orderId: kitchenOrder._id,
                            orderNumber: kitchenOrder.orderNumber,
                            itemName: item.name,
                            tableNumber: kitchenOrder.tableNumber || 'N/A',
                            message: `${item.name} for Order ${kitchenOrder.orderNumber} is ready!`,
                            timestamp: new Date(),
                        });
                    }
                    
                    console.log(`[KOT Notification] Sent ready notification for item ${item.name} to waiters`);
                }
            } catch (socketError) {
                console.error('[KOT Notification] Error sending socket notification:', socketError);
                // Don't fail the request if socket fails
            }
        }

        res.status(200).json({
            message: 'Item status updated successfully',
            kitchenOrder
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error updating item status',
            error: error.message
        });
    }
};

// Complete entire order
exports.completeOrder = async (req, res) => {
    try {
        const { orderId } = req.params;

        const kitchenOrder = await KitchenOrder.findById(orderId);
        if (!kitchenOrder) {
            return res.status(404).json({ message: 'Kitchen order not found' });
        }

        kitchenOrder.status = 'Completed';
        kitchenOrder.completedAt = new Date();
        await kitchenOrder.save();

        // Create notification
        const notification = new KitchenNotification({
            type: 'order_completed',
            message: `Order ${kitchenOrder.orderNumber} completed!`,
            orderId: kitchenOrder._id,
            orderNumber: kitchenOrder.orderNumber,
            branchId: kitchenOrder.branchId,
            priority: 'low'
        });
        await notification.save();

        res.status(200).json({
            message: 'Order marked as completed',
            kitchenOrder
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error completing order',
            error: error.message
        });
    }
};

// Get kitchen dashboard statistics
exports.getKitchenStats = async (req, res) => {
    try {
        const { branchId } = req.query;

        const filter = branchId ? { branchId } : {};

        const stats = await KitchenOrder.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Format stats
        const statusCounts = {
            Pending: 0,
            'In Progress': 0,
            Ready: 0,
            Completed: 0
        };

        stats.forEach(stat => {
            statusCounts[stat._id] = stat.count;
        });

        // Get recent notifications
        const notifications = await KitchenNotification.find(filter)
            .sort({ createdAt: -1 })
            .limit(10);

        res.status(200).json({
            statusCounts,
            notifications,
            totalOrders: Object.values(statusCounts).reduce((a, b) => a + b, 0)
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error fetching kitchen stats',
            error: error.message
        });
    }
};