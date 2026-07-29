const Notification = require("../model/Notification");
const NotificationTemplate = require("../model/NotificationTemplate");
const NotificationPreference = require("../model/NotificationPreference");
const emailService = require("./emailService");
const smsService = require("./smsService");
const whatsappService = require("./whatsappService");

class NotificationService {
  /**
   * Send notification through all enabled channels
   */
  async sendNotification(notificationData) {
    try {
      // Create notification record
      const notification = await Notification.createNotification(
        notificationData
      );

      const results = {
        notificationId: notification._id,
        email: null,
        sms: null,
        whatsapp: null,
        inApp: true,
      };

      // Send via enabled channels
      if (notification.channels.email.enabled) {
        results.email = await emailService.sendNotificationEmail(notification);
      }

      if (notification.channels.sms.enabled) {
        results.sms = await smsService.sendNotificationSMS(notification);
      }

      if (notification.channels.whatsapp.enabled) {
        results.whatsapp = await whatsappService.sendNotificationWhatsApp(
          notification
        );
      }

      return {
        success: true,
        notification,
        results,
      };
    } catch (error) {
      console.error("❌ Notification service error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send notification using template
   */
  async sendTemplatedNotification({
    templateCode,
    businessType,
    recipients,
    data,
    channels,
  }) {
    try {
      // Get template
      const template = await NotificationTemplate.getByCode(templateCode);

      if (!template) {
        throw new Error(`Template ${templateCode} not found`);
      }

      // Replace variables in template
      const replacedChannels = template.replaceVariables(data);

      // Merge with custom channels if provided
      const finalChannels = {
        email: {
          ...replacedChannels.email,
          ...channels?.email,
        },
        sms: {
          ...replacedChannels.sms,
          ...channels?.sms,
        },
        whatsapp: {
          ...replacedChannels.whatsapp,
          ...channels?.whatsapp,
        },
        inApp: {
          ...replacedChannels.inApp,
          ...channels?.inApp,
        },
      };

      // Create notification data
      const notificationData = {
        title: replacedChannels.inApp.title || template.name,
        message: replacedChannels.inApp.message || template.name,
        businessType: businessType || template.businessType,
        notificationType: template.category,
        priority: template.priority,
        channels: finalChannels,
        recipients,
        templateId: template._id,
        metadata: data,
      };

      return await this.sendNotification(notificationData);
    } catch (error) {
      console.error("❌ Templated notification error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send notification to specific user with preference check
   */
  async sendToUser({
    userId,
    title,
    message,
    businessType,
    notificationType,
    priority,
    email,
    sms,
    whatsapp,
    relatedTo,
    actionUrl,
  }) {
    try {
      // Get user preferences
      const preference = await NotificationPreference.getOrCreate(userId);

      // Prepare channels based on preferences
      const channels = {
        email: {
          enabled: preference.shouldSend("email", notificationType) && !!email,
          ...email,
        },
        sms: {
          enabled: preference.shouldSend("sms", notificationType) && !!sms,
          ...sms,
        },
        whatsapp: {
          enabled:
            preference.shouldSend("whatsapp", notificationType) && !!whatsapp,
          ...whatsapp,
        },
        inApp: {
          enabled: preference.shouldSend("inApp", notificationType),
        },
      };

      const notificationData = {
        title,
        message,
        businessType,
        notificationType,
        priority,
        channels,
        recipients: [{ user: userId }],
        relatedTo,
        actionUrl,
      };

      return await this.sendNotification(notificationData);
    } catch (error) {
      console.error("❌ Send to user error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send to multiple users
   */
  async sendToMultipleUsers({
    userIds,
    title,
    message,
    businessType,
    notificationType,
    priority,
    email,
    sms,
    whatsapp,
    relatedTo,
    actionUrl,
  }) {
    const results = [];

    for (const userId of userIds) {
      const result = await this.sendToUser({
        userId,
        title,
        message,
        businessType,
        notificationType,
        priority,
        email,
        sms,
        whatsapp,
        relatedTo,
        actionUrl,
      });
      results.push(result);
    }

    return results;
  }

  /**
   * Auto-alert: Low Stock
   */
  async sendLowStockAlert({ itemName, currentStock, reorderLevel, businessType, recipients }) {
    const title = `⚠️ Low Stock Alert - ${itemName}`;
    const message = `${itemName} stock is low. Current: ${currentStock}, Reorder Level: ${reorderLevel}`;

    return await this.sendNotification({
      title,
      message,
      businessType,
      notificationType: "Inventory",
      priority: "High",
      channels: {
        email: {
          enabled: true,
          emailTo: recipients.emails,
          subject: title,
          body: message,
        },
        sms: {
          enabled: true,
          phoneNumbers: recipients.phones,
          message: `LOW STOCK: ${itemName} - ${currentStock} left`,
        },
        whatsapp: {
          enabled: true,
          phoneNumbers: recipients.phones,
          message,
        },
        inApp: { enabled: true },
      },
      recipients: recipients.users?.map((userId) => ({ user: userId })),
    });
  }

  /**
   * Auto-alert: Invoice Overdue
   */
  async sendInvoiceOverdueAlert({ invoiceNumber, customerName, amount, dueDate, daysOverdue, businessType, recipients }) {
    const title = `💰 Invoice Overdue - #${invoiceNumber}`;
    const message = `Invoice #${invoiceNumber} from ${customerName} is overdue by ${daysOverdue} days. Amount: ₹${amount}`;

    return await this.sendNotification({
      title,
      message,
      businessType,
      notificationType: "Payment",
      priority: "Urgent",
      channels: {
        email: {
          enabled: true,
          emailTo: recipients.emails,
          subject: title,
          body: message,
        },
        sms: {
          enabled: true,
          phoneNumbers: recipients.phones,
          message: `OVERDUE: Invoice #${invoiceNumber} - ${daysOverdue} days`,
        },
        inApp: { enabled: true },
      },
      recipients: recipients.users?.map((userId) => ({ user: userId })),
      relatedTo: {
        model: "Invoice",
        reference: invoiceNumber,
      },
    });
  }

  /**
   * Auto-alert: Payment Received
   */
  async sendPaymentReceivedNotification({ invoiceNumber, customerName, amount, paymentMethod, businessType, recipients }) {
    const title = `✅ Payment Received - #${invoiceNumber}`;
    const message = `Payment of ₹${amount} received from ${customerName} via ${paymentMethod}`;

    return await this.sendNotification({
      title,
      message,
      businessType,
      notificationType: "Payment",
      priority: "Normal",
      channels: {
        email: {
          enabled: true,
          emailTo: recipients.emails,
          subject: title,
          body: message,
        },
        inApp: { enabled: true },
      },
      recipients: recipients.users?.map((userId) => ({ user: userId })),
    });
  }

  /**
   * Auto-alert: Order Placed
   */
  async sendOrderPlacedNotification({ orderNumber, customerName, amount, items, businessType, recipients }) {
    const title = `🛒 New Order - #${orderNumber}`;
    const message = `New order from ${customerName}. Amount: ₹${amount}, Items: ${items}`;

    return await this.sendNotification({
      title,
      message,
      businessType,
      notificationType: "Order",
      priority: "High",
      channels: {
        email: {
          enabled: true,
          emailTo: recipients.emails,
          subject: title,
          body: message,
        },
        sms: {
          enabled: true,
          phoneNumbers: recipients.phones,
          message: `NEW ORDER #${orderNumber} - ₹${amount}`,
        },
        whatsapp: {
          enabled: true,
          phoneNumbers: recipients.phones,
          message,
        },
        inApp: { enabled: true },
      },
      recipients: recipients.users?.map((userId) => ({ user: userId })),
    });
  }

  /**
   * Auto-alert: Leave Application
   */
  async sendLeaveApplicationAlert({ employeeName, leaveType, startDate, endDate, reason, businessType, recipients }) {
    const title = `📝 Leave Application - ${employeeName}`;
    const message = `${employeeName} applied for ${leaveType} from ${startDate} to ${endDate}`;

    return await this.sendNotification({
      title,
      message,
      businessType,
      notificationType: "HR",
      priority: "Normal",
      channels: {
        email: {
          enabled: true,
          emailTo: recipients.emails,
          subject: title,
          body: `${message}\n\nReason: ${reason}`,
        },
        inApp: { enabled: true },
      },
      recipients: recipients.users?.map((userId) => ({ user: userId })),
    });
  }

  /**
   * Auto-alert: Approval Required
   */
  async sendApprovalRequiredAlert({ type, reference, requestedBy, amount, businessType, recipients, actionUrl }) {
    const title = `✅ Approval Required - ${type} #${reference}`;
    const message = `${type} #${reference} requires your approval. Requested by: ${requestedBy}${
      amount ? `, Amount: ₹${amount}` : ""
    }`;

    return await this.sendNotification({
      title,
      message,
      businessType,
      notificationType: "Approval",
      priority: "High",
      channels: {
        email: {
          enabled: true,
          emailTo: recipients.emails,
          subject: title,
          body: message,
        },
        sms: {
          enabled: true,
          phoneNumbers: recipients.phones,
          message: `APPROVAL: ${type} #${reference}`,
        },
        inApp: { enabled: true },
      },
      recipients: recipients.users?.map((userId) => ({ user: userId })),
      actionUrl,
      actionLabel: "Review & Approve",
    });
  }

  /**
   * Schedule notification
   */
  async scheduleNotification(notificationData, scheduledFor) {
    const notification = await Notification.createNotification({
      ...notificationData,
      status: "Scheduled",
      scheduledFor: new Date(scheduledFor),
    });

    return {
      success: true,
      notification,
      message: "Notification scheduled successfully",
    };
  }

  /**
   * Process scheduled notifications (to be called by cron job)
   */
  async processScheduledNotifications() {
    const notifications = await Notification.sendScheduledNotifications();

    for (const notification of notifications) {
      if (notification.status === "queued") {
        const fullNotification = await Notification.findById(notification.id);
        await this.sendNotification(fullNotification);
      }
    }

    return notifications;
  }
}

module.exports = new NotificationService();


