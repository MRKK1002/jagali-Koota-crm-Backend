const mongoose = require("mongoose");

const dailyReportSchema = new mongoose.Schema(
  {
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: true,
    },
    reportDate: {
      type: Date,
      required: true,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: false, // Made optional for now
    },
    workCompleted: {
      type: String,
      required: true,
    },
    workersPresent: {
      type: Number,
      default: 0,
    },
    workersAbsent: {
      type: Number,
      default: 0,
    },
    materialsUsed: [
      {
        materialName: String,
        quantity: Number,
        unit: String,
      },
    ],
    equipmentUsed: [
      {
        equipmentName: String,
        hours: Number,
      },
    ],
    issues: {
      type: String,
    },
    weatherConditions: {
      type: String,
    },
    photos: [
      {
        url: String,
        caption: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    videos: [
      {
        url: String,
        caption: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    safetyIncidents: {
      type: String,
    },
    remarks: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for site and date
dailyReportSchema.index({ siteId: 1, reportDate: 1 }, { unique: true });

module.exports = mongoose.model("DailyReport", dailyReportSchema);
