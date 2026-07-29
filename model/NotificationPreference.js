const mongoose = require("mongoose");

const notificationPreferenceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubAdmin",
      required: true,
      unique: true,
    },
    businessType: {
      type: String,
      enum: ["restaurant", "construction", "common"],
    },
    email: {
      enabled: { type: Boolean, default: true },
      categories: {
        Alert: { type: Boolean, default: true },
        Reminder: { type: Boolean, default: true },
        Approval: { type: Boolean, default: true },
        Payment: { type: Boolean, default: true },
        Invoice: { type: Boolean, default: true },
        Order: { type: Boolean, default: true },
        Inventory: { type: Boolean, default: true },
        HR: { type: Boolean, default: true },
        System: { type: Boolean, default: true },
        Marketing: { type: Boolean, default: false },
      },
    },
    sms: {
      enabled: { type: Boolean, default: false },
      phoneNumber: String,
      categories: {
        Alert: { type: Boolean, default: true },
        Reminder: { type: Boolean, default: false },
        Approval: { type: Boolean, default: true },
        Payment: { type: Boolean, default: true },
        Invoice: { type: Boolean, default: false },
        Order: { type: Boolean, default: false },
        Inventory: { type: Boolean, default: true },
        HR: { type: Boolean, default: false },
        System: { type: Boolean, default: true },
        Marketing: { type: Boolean, default: false },
      },
    },
    whatsapp: {
      enabled: { type: Boolean, default: false },
      phoneNumber: String,
      categories: {
        Alert: { type: Boolean, default: true },
        Reminder: { type: Boolean, default: true },
        Approval: { type: Boolean, default: true },
        Payment: { type: Boolean, default: true },
        Invoice: { type: Boolean, default: true },
        Order: { type: Boolean, default: true },
        Inventory: { type: Boolean, default: true },
        HR: { type: Boolean, default: false },
        System: { type: Boolean, default: false },
        Marketing: { type: Boolean, default: false },
      },
    },
    inApp: {
      enabled: { type: Boolean, default: true },
      categories: {
        Alert: { type: Boolean, default: true },
        Reminder: { type: Boolean, default: true },
        Approval: { type: Boolean, default: true },
        Payment: { type: Boolean, default: true },
        Invoice: { type: Boolean, default: true },
        Order: { type: Boolean, default: true },
        Inventory: { type: Boolean, default: true },
        HR: { type: Boolean, default: true },
        System: { type: Boolean, default: true },
        Marketing: { type: Boolean, default: true },
      },
    },
    doNotDisturb: {
      enabled: { type: Boolean, default: false },
      startTime: String, // HH:mm format
      endTime: String, // HH:mm format
    },
    quietHours: {
      enabled: { type: Boolean, default: false },
      startTime: String,
      endTime: String,
    },
  },
  {
    timestamps: true,
  }
);

// user index is automatically created by unique: true constraint

// Method to check if notification should be sent
notificationPreferenceSchema.methods.shouldSend = function (
  channel,
  category
) {
  // Check if channel is enabled
  if (!this[channel] || !this[channel].enabled) {
    return false;
  }

  // Check if category is enabled for this channel
  if (this[channel].categories && this[channel].categories[category] === false) {
    return false;
  }

  // Check do not disturb
  if (this.doNotDisturb.enabled) {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;

    if (
      currentTime >= this.doNotDisturb.startTime &&
      currentTime <= this.doNotDisturb.endTime
    ) {
      return false;
    }
  }

  return true;
};

// Static method to get or create preference for user
notificationPreferenceSchema.statics.getOrCreate = async function (userId) {
  let preference = await this.findOne({ user: userId });

  if (!preference) {
    preference = await this.create({ user: userId });
  }

  return preference;
};

module.exports = mongoose.model(
  "NotificationPreference",
  notificationPreferenceSchema
);


