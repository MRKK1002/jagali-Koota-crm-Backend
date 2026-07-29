const Notification = require("../model/Notification");
const NotificationTemplate = require("../model/NotificationTemplate");
const NotificationPreference = require("../model/NotificationPreference");
const notificationService = require("../services/notificationService");
const emailService = require("../services/emailService");
const smsService = require("../services/smsService");
const whatsappService = require("../services/whatsappService");

// Send notification
exports.sendNotification = async (req, res) => {
  try {
    const result = await notificationService.sendNotification(req.body);

    res.status(201).json({
      success: true,
      message: "Notification sent successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error sending notification:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error sending notification",
    });
  }
};

// Send templated notification
exports.sendTemplatedNotification = async (req, res) => {
  try {
    const result = await notificationService.sendTemplatedNotification(req.body);

    res.status(201).json({
      success: true,
      message: "Templated notification sent successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error sending templated notification:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error sending templated notification",
    });
  }
};

// Get all notifications
exports.getAllNotifications = async (req, res) => {
  try {
    const { businessType, notificationType, status, startDate, endDate, limit = 50, skip = 0 } = req.query;

    const query = {};
    if (businessType) query.businessType = businessType;
    if (notificationType) query.notificationType = notificationType;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate("recipients.user", "name email")
      .populate("createdBy", "name email");

    const total = await Notification.countDocuments(query);

    res.status(200).json({
      success: true,
      count: notifications.length,
      total,
      data: notifications,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching notifications",
    });
  }
};

// Get user notifications
exports.getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const { businessType, unreadOnly, limit = 50, skip = 0 } = req.query;

    const notifications = await Notification.getUserNotifications(
      userId,
      businessType,
      {
        limit: parseInt(limit),
        skip: parseInt(skip),
        unreadOnly: unreadOnly === "true",
      }
    );

    const unreadCount = await Notification.getUnreadCount(userId, businessType);

    res.status(200).json({
      success: true,
      count: notifications.length,
      unreadCount,
      data: notifications,
    });
  } catch (error) {
    console.error("Error fetching user notifications:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user notifications",
    });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const notification = await Notification.findById(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    await notification.markAsRead(userId);

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: notification,
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({
      success: false,
      message: "Error marking notification as read",
    });
  }
};

// Get notification by ID
exports.getNotificationById = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)
      .populate("recipients.user", "name email")
      .populate("createdBy", "name email");

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error("Error fetching notification:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching notification",
    });
  }
};

// Create notification template
exports.createTemplate = async (req, res) => {
  try {
    const template = new NotificationTemplate({
      ...req.body,
      createdBy: req.user?._id,
    });
    await template.save();

    res.status(201).json({
      success: true,
      message: "Notification template created successfully",
      data: template,
    });
  } catch (error) {
    console.error("Error creating template:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error creating template",
    });
  }
};

// Get all templates
exports.getAllTemplates = async (req, res) => {
  try {
    const { businessType, category, isActive } = req.query;

    const query = {};
    if (businessType && businessType !== "both") {
      query.$or = [{ businessType }, { businessType: "both" }];
    }
    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive === "true";

    const templates = await NotificationTemplate.find(query).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: templates.length,
      data: templates,
    });
  } catch (error) {
    console.error("Error fetching templates:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching templates",
    });
  }
};

// Update template
exports.updateTemplate = async (req, res) => {
  try {
    const template = await NotificationTemplate.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user?._id },
      { new: true, runValidators: true }
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Template updated successfully",
      data: template,
    });
  } catch (error) {
    console.error("Error updating template:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error updating template",
    });
  }
};

// Get user preferences
exports.getUserPreferences = async (req, res) => {
  try {
    const { userId } = req.params;
    const preference = await NotificationPreference.getOrCreate(userId);

    res.status(200).json({
      success: true,
      data: preference,
    });
  } catch (error) {
    console.error("Error fetching preferences:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching preferences",
    });
  }
};

// Update user preferences
exports.updateUserPreferences = async (req, res) => {
  try {
    const { userId } = req.params;

    let preference = await NotificationPreference.findOne({ user: userId });

    if (!preference) {
      preference = new NotificationPreference({ user: userId, ...req.body });
    } else {
      Object.assign(preference, req.body);
    }

    await preference.save();

    res.status(200).json({
      success: true,
      message: "Preferences updated successfully",
      data: preference,
    });
  } catch (error) {
    console.error("Error updating preferences:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error updating preferences",
    });
  }
};

// Test email service
exports.testEmail = async (req, res) => {
  try {
    const { to, subject, message } = req.body;

    const result = await emailService.sendEmail({
      to,
      subject: subject || "Test Email",
      text: message || "This is a test email from the notification system.",
    });

    res.status(200).json({
      success: result.success,
      message: result.success ? "Test email sent successfully" : "Failed to send test email",
      data: result,
    });
  } catch (error) {
    console.error("Error sending test email:", error);
    res.status(500).json({
      success: false,
      message: "Error sending test email",
    });
  }
};

// Test SMS service
exports.testSMS = async (req, res) => {
  try {
    const { to, message } = req.body;

    const result = await smsService.sendSMS({
      to,
      message: message || "This is a test SMS from the notification system.",
    });

    res.status(200).json({
      success: result.success,
      message: result.success ? "Test SMS sent successfully" : "Failed to send test SMS",
      data: result,
    });
  } catch (error) {
    console.error("Error sending test SMS:", error);
    res.status(500).json({
      success: false,
      message: "Error sending test SMS",
    });
  }
};

// Test WhatsApp service
exports.testWhatsApp = async (req, res) => {
  try {
    const { to, message } = req.body;

    const result = await whatsappService.sendMessage({
      to,
      message: message || "This is a test WhatsApp message from the notification system.",
    });

    res.status(200).json({
      success: result.success,
      message: result.success ? "Test WhatsApp sent successfully" : "Failed to send test WhatsApp",
      data: result,
    });
  } catch (error) {
    console.error("Error sending test WhatsApp:", error);
    res.status(500).json({
      success: false,
      message: "Error sending test WhatsApp",
    });
  }
};

// Get notification statistics
exports.getStatistics = async (req, res) => {
  try {
    const { businessType, startDate, endDate } = req.query;

    const query = {};
    if (businessType) query.businessType = businessType;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const total = await Notification.countDocuments(query);
    const sent = await Notification.countDocuments({ ...query, status: "Sent" });
    const pending = await Notification.countDocuments({ ...query, status: "Pending" });
    const failed = await Notification.countDocuments({ ...query, status: "Failed" });

    const byType = await Notification.aggregate([
      { $match: query },
      { $group: { _id: "$notificationType", count: { $sum: 1 } } },
    ]);

    const byPriority = await Notification.aggregate([
      { $match: query },
      { $group: { _id: "$priority", count: { $sum: 1 } } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        total,
        sent,
        pending,
        failed,
        byType,
        byPriority,
      },
    });
  } catch (error) {
    console.error("Error fetching statistics:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching statistics",
    });
  }
};
