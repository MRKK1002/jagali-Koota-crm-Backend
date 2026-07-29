const mongoose = require("mongoose");

const notificationTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      trim: true,
    },
    businessType: {
      type: String,
      required: true,
      enum: ["restaurant", "construction", "both"],
    },
    category: {
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
      ],
    },
    channels: {
      email: {
        enabled: { type: Boolean, default: true },
        subject: { type: String },
        body: { type: String },
        htmlBody: { type: String },
      },
      sms: {
        enabled: { type: Boolean, default: false },
        message: { type: String },
      },
      whatsapp: {
        enabled: { type: Boolean, default: false },
        message: { type: String },
      },
      inApp: {
        enabled: { type: Boolean, default: true },
        title: { type: String },
        message: { type: String },
      },
    },
    variables: [
      {
        name: { type: String, required: true },
        description: String,
        required: { type: Boolean, default: false },
        defaultValue: String,
      },
    ],
    priority: {
      type: String,
      enum: ["Low", "Normal", "High", "Urgent"],
      default: "Normal",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    recipientRoles: [String],
    triggerEvent: {
      type: String,
      enum: [
        "invoice_created",
        "invoice_overdue",
        "payment_received",
        "payment_failed",
        "order_placed",
        "order_confirmed",
        "order_delivered",
        "stock_low",
        "stock_out",
        "leave_applied",
        "leave_approved",
        "leave_rejected",
        "attendance_marked",
        "salary_processed",
        "purchase_order_created",
        "purchase_order_approved",
        "vendor_payment_due",
        "project_milestone_completed",
        "task_assigned",
        "task_overdue",
        "custom",
      ],
    },
    autoSend: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubAdmin",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubAdmin",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
// code index is automatically created by unique: true constraint
notificationTemplateSchema.index({ businessType: 1, isActive: 1 });
notificationTemplateSchema.index({ category: 1 });
notificationTemplateSchema.index({ triggerEvent: 1 });

// Method to replace variables in template
notificationTemplateSchema.methods.replaceVariables = function (data) {
  const result = {
    email: {},
    sms: {},
    whatsapp: {},
    inApp: {},
  };

  // Helper function to replace variables
  const replace = (text, data) => {
    if (!text) return text;
    let replaced = text;
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{${key}}}`, "g");
      replaced = replaced.replace(regex, value);
    }
    return replaced;
  };

  // Replace variables in each channel
  if (this.channels.email.enabled) {
    result.email = {
      enabled: true,
      subject: replace(this.channels.email.subject, data),
      body: replace(this.channels.email.body, data),
      htmlBody: replace(this.channels.email.htmlBody, data),
    };
  }

  if (this.channels.sms.enabled) {
    result.sms = {
      enabled: true,
      message: replace(this.channels.sms.message, data),
    };
  }

  if (this.channels.whatsapp.enabled) {
    result.whatsapp = {
      enabled: true,
      message: replace(this.channels.whatsapp.message, data),
    };
  }

  if (this.channels.inApp.enabled) {
    result.inApp = {
      enabled: true,
      title: replace(this.channels.inApp.title, data),
      message: replace(this.channels.inApp.message, data),
    };
  }

  return result;
};

// Static method to get template by code
notificationTemplateSchema.statics.getByCode = async function (code) {
  return await this.findOne({ code: code.toUpperCase(), isActive: true });
};

// Static method to get templates by business type
notificationTemplateSchema.statics.getByBusinessType = async function (
  businessType
) {
  return await this.find({
    $or: [{ businessType }, { businessType: "both" }],
    isActive: true,
  }).sort({ name: 1 });
};

module.exports = mongoose.model(
  "NotificationTemplate",
  notificationTemplateSchema
);


