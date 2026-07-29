const mongoose = require("mongoose");

const workerSchema = new mongoose.Schema(
  {
    workerCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
    },
    alternatePhone: {
      type: String,
    },
    address: {
      type: String,
    },
    city: {
      type: String,
    },
    state: {
      type: String,
    },
    pincode: {
      type: String,
    },
    workerType: {
      type: String,
      enum: ["Mason", "Carpenter", "Electrician", "Plumber", "Painter", "Helper", "Laborer", "Other"],
      required: true,
    },
    skillLevel: {
      type: String,
      enum: ["Unskilled", "Semi-Skilled", "Skilled", "Highly Skilled"],
      default: "Unskilled",
    },
    dailyWage: {
      type: Number,
      required: true,
    },
    aadharNumber: {
      type: String,
    },
    emergencyContact: {
      name: String,
      phone: String,
      relation: String,
    },
    joiningDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive", "On Leave", "Terminated"],
      default: "Active",
    },
    currentSite: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
    },
    assignedSites: [
      {
        siteId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Site",
        },
        assignedDate: {
          type: Date,
          default: Date.now,
        },
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],
    photo: {
      type: String,
    },
    documents: [
      {
        documentType: String,
        documentUrl: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Worker", workerSchema);
