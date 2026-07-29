const mongoose = require("mongoose");

const contractSchema = new mongoose.Schema(
  {
    customerId: {
      type: String,
      required: true,
    },
    contractNumber: {
      type: String,
      unique: true,
    },
    type: {
      type: String,
      enum: ["Service Agreement", "AMC", "Warranty", "Maintenance", "SLA", "Other"],
      default: "Service Agreement",
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
    slaTerms: {
      type: String,
      trim: true,
    },
    termsAndConditions: {
      type: String,
      trim: true,
    },
    autoRenewal: {
      type: Boolean,
      default: false,
    },
    renewalNoticePeriod: {
      type: Number, // in days
      default: 30,
    },
    status: {
      type: String,
      enum: ["Draft", "Active", "Expired", "Renewed", "Cancelled", "Terminated"],
      default: "Draft",
    },
    paymentTerms: {
      type: String,
      trim: true,
    },
    billingCycle: {
      type: String,
      enum: ["Monthly", "Quarterly", "Half-Yearly", "Yearly", "One-Time"],
      default: "Yearly",
    },
    attachments: [
      {
        fileName: String,
        fileUrl: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    signedBy: {
      type: String,
      trim: true,
    },
    signedDate: {
      type: Date,
    },
    renewedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contract",
    },
  },
  {
    timestamps: true,
  }
);

// Generate contract number before saving
contractSchema.pre("save", async function (next) {
  if (!this.contractNumber) {
    const count = await mongoose.model("Contract").countDocuments();
    this.contractNumber = `CNT-${Date.now()}-${count + 1}`;
  }
  next();
});

contractSchema.index({ customerId: 1, status: 1 });
// contractNumber index is automatically created by unique: true constraint
contractSchema.index({ endDate: 1 });

module.exports = mongoose.models.Contract || mongoose.model("Contract", contractSchema);
