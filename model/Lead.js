const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema(
  {
    businessType: {
      type: String,
      enum: ["restaurant", "construction", "common"],
      required: true,
    },
    source: {
      type: String,
      required: true,
      enum: ["Website", "Referral", "Advertisement", "Direct", "Social Media", "Cold Call", "Other"],
      default: "Website",
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    industry: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["New", "Contacted", "Qualified", "Proposal", "Negotiation", "Won", "Lost"],
      default: "New",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubAdmin",
    },
    estimatedValue: {
      type: Number,
      default: 0,
    },
    probability: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    expectedCloseDate: {
      type: Date,
    },
    lastContactDate: {
      type: Date,
    },
    convertedToOpportunity: {
      type: Boolean,
      default: false,
    },
    opportunityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Opportunity",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
leadSchema.index({ businessType: 1, status: 1 });
leadSchema.index({ email: 1 });
leadSchema.index({ phone: 1 });
leadSchema.index({ createdAt: -1 });

module.exports = mongoose.models.Lead || mongoose.model("Lead", leadSchema);
