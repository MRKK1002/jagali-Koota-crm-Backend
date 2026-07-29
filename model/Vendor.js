const mongoose = require("mongoose");

const vendorSchema = new mongoose.Schema(
  {
    vendorCode: {
      type: String,
      unique: true,
      required: true,
    },
    vendorName: {
      type: String,
      required: true,
    },
    contactPerson: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
    },
    gstNumber: {
      type: String,
    },
    panNumber: {
      type: String,
    },
    bankDetails: {
      bankName: String,
      accountNumber: String,
      ifscCode: String,
      branch: String,
    },
    materialSupplied: [
      {
        type: String,
      },
    ],
    paymentTerms: {
      type: String,
      default: "Net 30",
    },
    creditLimit: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 3,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Blacklisted"],
      default: "Active",
    },
    remarks: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.Vendor || mongoose.model("Vendor", vendorSchema);
