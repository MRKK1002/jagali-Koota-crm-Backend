const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    businessType: {
      type: String,
      required: true,
      enum: ["restaurant", "construction", "common"],
    },
    notificationType: {
      type: String,
      required: true,
      enum: [
        "Alert",
        "Reminder",
        "Approval",
        "Payment",
        "Invoice",
        "Order",
        "Inventory",
        "HR",
        "System",
        "Marketing",
        "Custom",
      ],
    },
    priority: {
      type: String,
      enum: ["Low", "Normal", "High", "Urgent"],
      default: "Normal",
    },
    channels: {
      email: {
        enabled: { type: Boolean, default: false },
        sent: { type: Boolean, default: false },
        sentAt: Date,
        emailTo: [String],
        emailCc: [String],
        emailBcc: [String],
        subject: String,
        body: String,
        attachments: [
          {
            filename: String,
            path: String,
          },
        ],
        error: String,
      },
      sms: {
        enabled: { type: Boolean, default: false },
        sent: { type: Boolean, default: false },
        sentAt: Date,
        phoneNumbers: [String],
        message: String,
        error: String,
      },
      whatsapp: {
        enabled: { type: Boolean, default: false },
        sent: { type: Boolean, default: false },
        sentAt: Date,
        phoneNumbers: [String],
        message: String,
        error: String,
      },
      inApp: {
        enabled: { type: Boolean, default: true },
        read: { type: Boolean, default: false },
        readAt: Date,
      },
    },
    recipients: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "SubAdmin",
        },
        role: String,
        department: String,
      },
    ],
    relatedTo: {
      model: {
        type: String,
        enum: [
          "Invoice",
          "Payment",
          "Order",
          "Purchase",
          "Inventory",
          "Employee",
          "Leave",
          "Attendance",
          "Customer",
          "Vendor",
          "Project",
          "Task",
          "Other",
        ],
      },
      id: mongoose.Schema.Types.ObjectId,
      reference: String,
    },
    status: {
      type: String,
      enum: ["Pending", "Sent", "Failed", "Scheduled"],
      default: "Pending",
    },
    scheduledFor: {
      type: Date,
    },
    expiresAt: {
      type: Date,
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NotificationTemplate",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
    actionUrl: {
      type: String,
    },
    actionLabel: {
      type: String,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubAdmin",
    },
    sentBy: {
      type: String,
      default: "System",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
notificationSchema.index({ businessType: 1, status: 1 });
notificationSchema.index({ "recipients.user": 1, "channels.inApp.read": 1 });
notificationSchema.index({ notificationType: 1 });
notificationSchema.index({ scheduledFor: 1, status: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Method to mark as sent
notificationSchema.methods.markAsSent = async function (channel) {
  if (channel === "all") {
    this.status = "Sent";
    if (this.channels.email.enabled) {
      this.channels.email.sent = true;
      this.channels.email.sentAt = new Date();
    }
    if (this.channels.sms.enabled) {
      this.channels.sms.sent = true;
      this.channels.sms.sentAt = new Date();
    }
    if (this.channels.whatsapp.enabled) {
      this.channels.whatsapp.sent = true;
      this.channels.whatsapp.sentAt = new Date();
    }
  } else if (this.channels[channel]) {
    this.channels[channel].sent = true;
    this.channels[channel].sentAt = new Date();

    // Check if all enabled channels are sent
    const allSent =
      (!this.channels.email.enabled || this.channels.email.sent) &&
      (!this.channels.sms.enabled || this.channels.sms.sent) &&
      (!this.channels.whatsapp.enabled || this.channels.whatsapp.sent);

    if (allSent) {
      this.status = "Sent";
    }
  }

  await this.save();
};

// Method to mark as failed
notificationSchema.methods.markAsFailed = async function (channel, error) {
  if (this.channels[channel]) {
    this.channels[channel].error = error;
  }
  this.status = "Failed";
  await this.save();
};

// Method to mark as read (in-app)
notificationSchema.methods.markAsRead = async function (userId) {
  this.channels.inApp.read = true;
  this.channels.inApp.readAt = new Date();
  await this.save();
};

// Static method to get unread count for user
notificationSchema.statics.getUnreadCount = async function (
  userId,
  businessType
) {
  const query = {
    "recipients.user": userId,
    "channels.inApp.enabled": true,
    "channels.inApp.read": false,
  };

  if (businessType && businessType !== "common") {
    query.businessType = businessType;
  }

  return await this.countDocuments(query);
};

// Static method to get user notifications
notificationSchema.statics.getUserNotifications = async function (
  userId,
  businessType,
  options = {}
) {
  const { limit = 50, skip = 0, unreadOnly = false } = options;

  const query = {
    "recipients.user": userId,
    "channels.inApp.enabled": true,
  };

  if (businessType && businessType !== "common") {
    query.businessType = businessType;
  }

  if (unreadOnly) {
    query["channels.inApp.read"] = false;
  }

  return await this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate("createdBy", "name email");
};

// Static method to create notification
notificationSchema.statics.createNotification = async function (data) {
  const notification = new this(data);
  await notification.save();
  return notification;
};

// Static method to send scheduled notifications
notificationSchema.statics.sendScheduledNotifications = async function () {
  const now = new Date();
  const notifications = await this.find({
    status: "Scheduled",
    scheduledFor: { $lte: now },
  });

  const results = [];
  for (const notification of notifications) {
    try {
      // This will be handled by the notification service
      notification.status = "Pending";
      await notification.save();
      results.push({ id: notification._id, status: "queued" });
    } catch (error) {
      results.push({ id: notification._id, status: "error", error: error.message });
    }
  }

  return results;
};

module.exports = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);

