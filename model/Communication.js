const mongoose = require("mongoose");

const communicationSchema = new mongoose.Schema(
  {
    customerId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["Email", "SMS", "WhatsApp", "Call", "Meeting", "Other"],
      default: "Email",
    },
    subject: {
      type: String,
      trim: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    direction: {
      type: String,
      enum: ["Inbound", "Outbound"],
      default: "Outbound",
    },
    status: {
      type: String,
      enum: ["Draft", "Sent", "Delivered", "Read", "Failed", "Scheduled"],
      default: "Sent",
    },
    scheduledFor: {
      type: Date,
    },
    sentAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    readAt: {
      type: Date,
    },
    from: {
      type: String,
      trim: true,
    },
    to: {
      type: String,
      trim: true,
    },
    cc: {
      type: String,
      trim: true,
    },
    bcc: {
      type: String,
      trim: true,
    },
    attachments: [
      {
        fileName: String,
        fileUrl: String,
        fileSize: Number,
      },
    ],
    linkedTo: {
      entityType: {
        type: String,
        enum: ["Lead", "Opportunity", "Ticket", "FollowUp", "Order", "Invoice"],
      },
      entityId: String,
    },
  },
  {
    timestamps: true,
  }
);

communicationSchema.index({ customerId: 1, createdAt: -1 });
communicationSchema.index({ type: 1, status: 1 });

module.exports = mongoose.models.Communication || mongoose.model("Communication", communicationSchema);
