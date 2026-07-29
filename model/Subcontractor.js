const mongoose = require("mongoose");

const subcontractorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    contactNumber: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      pincode: { type: String },
    },
    specialization: {
      type: [String],
      default: [],
    },
    panNumber: {
      type: String,
    },
    bankDetails: {
      bankName: { type: String },
      accountNumber: { type: String },
      ifscCode: { type: String },
      accountHolderName: { type: String },
    },
    assignedSites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Site",
      },
    ],
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 3,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "blacklisted"],
      default: "active",
    },
    documents: [
      {
        name: { type: String },
        url: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    agreementDocument: {
      name: { type: String },
      url: { type: String },
      uploadedAt: { type: Date },
    },
    aadharCardDocument: {
      name: { type: String },
      url: { type: String },
      uploadedAt: { type: Date },
    },
    panCardDocument: {
      name: { type: String },
      url: { type: String },
      uploadedAt: { type: Date },
    },
    passbookDocument: {
      name: { type: String },
      url: { type: String },
      uploadedAt: { type: Date },
    },
    tdsPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subcontractor", subcontractorSchema);
