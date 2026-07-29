const mongoose = require("mongoose")

const leadSchema = new mongoose.Schema(
  {
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
      trim: true,
    },
    source: {
      type: String,
      enum: [
        "Website",
        "Referral",
        "Cold Call",
        "Trade Show",
        "Online Inquiry",
        "Social Media",
        "Advertisement",
        "Walk-in",
      ],
    },
    status: {
      type: String,
      enum: ["New", "Contacted", "Qualified", "Proposal", "Negotiation", "Won", "Lost"],
      default: "New",
    },
    value: {
      type: Number,
      min: 0,
    },
    projectType: {
      type: String,
      enum: ["Residential Building", "Commercial Complex", "Villa Construction", "Renovation", "Infrastructure"],
    },
    serviceType: {
      type: String,
      enum: [
        "Kitchen Equipment Supply",
        "Complete Restaurant Setup",
        "Catering Equipment",
        "POS System",
        "Interior Design",
      ],
    },
    location: {
      type: String,
      trim: true,
    },
    assignedTo: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
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

module.exports = mongoose.model("Lead", leadSchema)
