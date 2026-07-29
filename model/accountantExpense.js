const mongoose = require("mongoose");

const accountantExpenseSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      trim: true, // removed enum — now dynamic
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },

    paymentMethod: {
      type: String,
      required: true,
      trim: true, // REMOVED enum → Now accepts ANY string
      // Validation will be done in CONTROLLER
    },
    date: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["paid", "pending", "processed"],
      default: "paid",
    },
    vendor: {
      type: String,
      trim: true,
    },
    reference: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AccountantExpense", accountantExpenseSchema);
