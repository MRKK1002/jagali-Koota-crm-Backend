const mongoose = require("mongoose");

const siteIssueSchema = new mongoose.Schema(
  {
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: true,
    },
    issueType: {
      type: String,
      enum: ["Injury", "Theft", "Delay", "Equipment Failure", "Safety Hazard", "Quality Issue", "Other"],
      required: true,
    },
    severity: {
      type: String,
      enum: ["Minor", "Moderate", "Major", "Critical"],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: false,
    },
    reportedDate: {
      type: Date,
      default: Date.now,
    },
    affectedPersons: [
      {
        name: String,
        role: String,
        injury: String,
      },
    ],
    location: {
      type: String,
    },
    immediateAction: {
      type: String,
    },
    status: {
      type: String,
      enum: ["Reported", "Under Investigation", "Resolved", "Closed"],
      default: "Reported",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    resolution: {
      type: String,
    },
    resolvedDate: {
      type: Date,
    },
    photos: [
      {
        url: String,
        caption: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("SiteIssue", siteIssueSchema);
