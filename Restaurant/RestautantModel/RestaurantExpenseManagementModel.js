const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    person: {
      type: String,
      required: true,
    },
    documentName: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    branch: {
      id: {
        type: String,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      address: {
        type: String,
        required: true,
      }
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ExpenseManagement", expenseSchema);
