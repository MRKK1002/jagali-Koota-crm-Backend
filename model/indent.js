const mongoose = require("mongoose");

const indentSchema = new mongoose.Schema(
  {
    indentNumber: {
      type: String,
      unique: true,
      required: true,
    },
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: true,
    },
    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: false, // Made optional for now
    },
    materialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MaterialType",
      required: false, // Made optional for backward compatibility
    },
    // Keep materialName for backward compatibility (will be auto-populated)
    materialName: {
      type: String,
      required: true, // Make this required instead
    },
    quantity: {
      type: Number,
      required: true,
    },
    unit: {
      type: String,
      required: true,
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
    },
    expectedDate: {
      type: Date,
      required: true,
    },
    remarks: {
      type: String,
    },
    status: {
      type: String,
      enum: [
        "Pending Approval",
        "Approved",
        "Rejected",
        "Pending Purchase",
        "Ready to Issue",
        "Issued",
        "Completed",
      ],
      default: "Pending Approval",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    approvalDate: {
      type: Date,
    },
    rejectionReason: {
      type: String,
    },
    inventoryCheckedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    inventoryCheckDate: {
      type: Date,
    },
    availableStock: {
      type: Number,
    },
    shortageQuantity: {
      type: Number,
    },
    issuedQuantity: {
      type: Number,
    },
    issueDate: {
      type: Date,
    },
    purchaseRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseRequest",
    },
    isDirectPurchase: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.Indent || mongoose.model("Indent", indentSchema);
