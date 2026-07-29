const mongoose = require("mongoose")

const procurementVendorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Vendor name is required"],
      trim: true,
      maxlength: [100, "Vendor name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email"],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      match: [/^\d{10,15}$/, "Please enter a valid phone number"],
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    taxId: {
      type: String,
      unique: true,
      sparse: true,
    },
    paymentTerms: {
      type: String,
      enum: ["NET_15", "NET_30", "NET_45", "NET_60", "IMMEDIATE"],
      default: "NET_30",
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Made optional
    },
  },
  {
    timestamps: true,
  },
)

// Index for better query performance
procurementVendorSchema.index({ name: 1, status: 1 })
procurementVendorSchema.index({ email: 1 })

module.exports = mongoose.model("ProcurementVendor", procurementVendorSchema)
