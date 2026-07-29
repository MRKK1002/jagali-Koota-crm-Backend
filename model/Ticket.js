const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    customerId: {
      type: String,
      required: true,
    },
    ticketNumber: {
      type: String,
      unique: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },
    category: {
      type: String,
      enum: ["General", "Technical", "Billing", "Product", "Service", "Complaint", "Query", "Other"],
      default: "General",
    },
    status: {
      type: String,
      enum: ["Open", "In Progress", "Pending", "Resolved", "Closed", "Reopened"],
      default: "Open",
    },
    assignedTo: {
      type: String,
      trim: true,
    },
    resolution: {
      type: String,
      trim: true,
    },
    resolvedAt: {
      type: Date,
    },
    closedAt: {
      type: Date,
    },
    attachments: [
      {
        fileName: String,
        fileUrl: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    comments: [
      {
        author: String,
        comment: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Generate ticket number before saving
ticketSchema.pre("save", async function (next) {
  if (!this.ticketNumber) {
    const count = await mongoose.model("Ticket").countDocuments();
    this.ticketNumber = `TKT-${Date.now()}-${count + 1}`;
  }
  next();
});

ticketSchema.index({ customerId: 1, status: 1 });
// ticketNumber index is automatically created by unique: true constraint
ticketSchema.index({ createdAt: -1 });

module.exports = mongoose.models.Ticket || mongoose.model("Ticket", ticketSchema);
