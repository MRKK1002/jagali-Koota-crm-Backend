const mongoose = require("mongoose");

const kitchenPrinterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Printer name is required"],
      trim: true,
    },
    ipAddress: {
      type: String,
      required: [true, "IP address is required"],
      trim: true,
      match: [
        /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
        "Please enter a valid IP address",
      ],
    },
    port: {
      type: Number,
      required: [true, "Port is required"],
      default: 9100,
      min: 1,
      max: 65535,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: [true, "Branch is required"],
    },
    branchName: {
      type: String,
      required: true,
    },
    printerType: {
      type: String,
      enum: ["thermal", "inkjet", "laser", "dot-matrix"],
      default: "thermal",
    },
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Categoryy",
      },
    ],
    categoryNames: [String], // Store category names for easy access
    isActive: {
      type: Boolean,
      default: true,
    },
    paperSize: {
      type: String,
      enum: ["58mm", "80mm", "A4"],
      default: "80mm",
    },
    copies: {
      type: Number,
      default: 1,
      min: 1,
      max: 5,
    },
    description: {
      type: String,
      trim: true,
    },
    lastTestPrint: {
      type: Date,
    },
    testPrintStatus: {
      type: String,
      enum: ["success", "failed", "pending"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
kitchenPrinterSchema.index({ branchId: 1, isActive: 1 });
kitchenPrinterSchema.index({ ipAddress: 1 });

module.exports = mongoose.model("KitchenPrinter", kitchenPrinterSchema);

