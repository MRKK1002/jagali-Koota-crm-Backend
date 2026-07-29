const mongoose = require("mongoose");

const opportunitySchema = new mongoose.Schema(
  {
    businessType: {
      type: String,
      enum: ["restaurant", "construction", "common"],
      required: true,
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    customer: {
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
      trim: true,
    },
    stage: {
      type: String,
      enum: ["Qualification", "Proposal", "Negotiation", "Closed Won", "Closed Lost"],
      default: "Qualification",
    },
    value: {
      type: Number,
      required: true,
      default: 0,
    },
    probability: {
      type: Number,
      min: 0,
      max: 100,
      default: 50,
    },
    expectedCloseDate: {
      type: Date,
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubAdmin",
    },
    products: [
      {
        name: String,
        quantity: Number,
        price: Number,
      },
    ],
    notes: {
      type: String,
      trim: true,
    },
    competitorInfo: {
      type: String,
      trim: true,
    },
    lostReason: {
      type: String,
      trim: true,
    },
    convertedToQuotation: {
      type: Boolean,
      default: false,
    },
    quotationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quotation",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
opportunitySchema.index({ businessType: 1, stage: 1 });
opportunitySchema.index({ expectedCloseDate: 1 });
opportunitySchema.index({ createdAt: -1 });

module.exports = mongoose.models.Opportunity || mongoose.model("Opportunity", opportunitySchema);
