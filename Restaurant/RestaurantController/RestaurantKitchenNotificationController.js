// Controller for Kitchen Notifications (simple notifications for kitchen display system)
const KitchenNotification = require('../model/NotificationModel');

// Create notification
exports.createNotification = async (req, res) => {
  try {
    const notification = new KitchenNotification(req.body);
    await notification.save();

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      data: notification
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error creating notification'
    });
  }
};

// Get notifications
exports.getNotifications = async (req, res) => {
  try {
    const { branchId, read, type, limit = 50 } = req.query;

    const filter = {};
    if (branchId) filter.branchId = branchId;
    if (read !== undefined) filter.read = read === 'true';
    if (type) filter.type = type;

    const notifications = await KitchenNotification.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('orderId', 'orderNumber items')
      .populate('branchId', 'name');

    const unreadCount = await KitchenNotification.countDocuments({
      ...filter,
      read: false
    });

    res.status(200).json({
      success: true,
      count: notifications.length,
      unreadCount,
      data: notifications
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications'
    });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await KitchenNotification.findByIdAndUpdate(
      id,
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking notification as read'
    });
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    const { branchId } = req.body;

    const filter = { read: false };
    if (branchId) filter.branchId = branchId;

    const result = await KitchenNotification.updateMany(
      filter,
      { read: true }
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking all notifications as read'
    });
  }
};

// Delete notification
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await KitchenNotification.findByIdAndDelete(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting notification'
    });
  }
};


