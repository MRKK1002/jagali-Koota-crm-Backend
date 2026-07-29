const mongoose = require("mongoose")

const opportunitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    stage: {
      type: String,
      enum: ["Proposal", "Negotiation", "Won", "Lost"],
      default: "Proposal",
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
    probability: {
      type: Number,
      min: 0,
      max: 100,
      default: 50,
    },
    expectedClose: {
      type: Date,
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
    },
    customer: {
      type: String,
      trim: true,
    },
    projectType: {
      type: String,
    },
    serviceType: {
      type: String,
    },
    businessType: {
      type: String,
      enum: ["construction", "restaurant"],
      default: "restaurant",
    },
  },
  {
    timestamps: true,
  },
)

module.exports = mongoose.model("Opportunity", opportunitySchema)
