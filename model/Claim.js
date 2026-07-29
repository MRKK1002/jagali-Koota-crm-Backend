const mongoose = require("mongoose");

const claimSchema = new mongoose.Schema(
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
    },
    documentName: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      default: "pending",
    },
    approvedAmount: {
      type: Number,
      default: 0,
    },
    remarks: {
      type: String,
      default: "",
    },
    approvedBy: {
      type: String,
      default: "",
    },
    approvalDate: {
      type: Date,
    },
    paymentStatus: {
      type: String,
      default: "unpaid",
    },
    transactionNo: {
      type: String,
      default: "",
    },
    paymentRemarks: {
      type: String,
      default: "",
    },
    paymentDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Claim", claimSchema);