const mongoose = require("mongoose");

const followUpSchema = new mongoose.Schema(
  {
    customerId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["Call", "Email", "Meeting", "WhatsApp", "SMS", "Other"],
      default: "Call",
    },
    date: {
      type: Date,
      required: true,
    },
    time: {
      type: String,
    },
    notes: {
      type: String,
      trim: true,
    },
    assignedTo: {
      type: String,
      trim: true,
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
    },
    status: {
      type: String,
      enum: ["Scheduled", "Completed", "Cancelled", "Rescheduled"],
      default: "Scheduled",
    },
    outcome: {
      type: String,
      trim: true,
    },
    nextAction: {
      type: String,
      trim: true,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

followUpSchema.index({ customerId: 1, date: -1 });
followUpSchema.index({ status: 1, date: 1 });

module.exports = mongoose.models.FollowUp || mongoose.model("FollowUp", followUpSchema);
