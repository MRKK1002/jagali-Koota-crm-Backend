const mongoose = require("mongoose");

const poSchema = new mongoose.Schema(
  {
    poNumber: {
      type: String,
      required: [false, "PO number is required"],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: [true, "Vendor ID is required"],
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "completed", "in-transit"],
      default: "pending",
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
    },
    items: [
      {
        itemName: {
          type: String,
          required: [true, "Item name is required"],
          trim: true,
        },
        quantity: {
          type: Number,
          required: [true, "Quantity is required"],
          min: [1, "Quantity must be at least 1"],
        },
        unitPrice: {
          type: Number,
          required: [true, "Unit price is required"],
          min: [0, "Unit price cannot be negative"],
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Po", poSchema);
