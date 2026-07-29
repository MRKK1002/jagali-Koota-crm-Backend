const mongoose = require("mongoose");

const constructionWorkerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    trade: {
      type: String,
      required: true,
      enum: [
        "Mason",
        "Carpenter",
        "Electrician",
        "Plumber",
        "Painter",
        "Helper",
        "Supervisor",
        "Operator",
        "General",
      ],
    },
    dailyWage: {
      type: Number,
      required: true,
      min: 0,
    },
    address: {
      type: String,
      trim: true,
    },
    emergencyContact: {
      type: String,
      trim: true,
    },
    joiningDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Terminated"],
      default: "Active",
    },
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: true,
    },
    registeredBy: {
      type: String,
      default: "Site Supervisor",
    },
    aadharNumber: {
      type: String,
      trim: true,
    },
    bankDetails: {
      accountNumber: String,
      ifscCode: String,
      bankName: String,
    },
    skills: [
      {
        type: String,
      },
    ],
    experience: {
      type: Number, // in years
      min: 0,
    },
    profileImage: {
      type: String, // URL to image
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
constructionWorkerSchema.index({ siteId: 1, status: 1 });
// phone index is automatically created by unique: true constraint
constructionWorkerSchema.index({ name: 1 });

module.exports = mongoose.model("ConstructionWorker", constructionWorkerSchema);
