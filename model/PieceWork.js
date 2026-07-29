const mongoose = require("mongoose");

const pieceWorkSchema = new mongoose.Schema(
  {
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: true,
    },
    workNumber: {
      type: String,
      required: true,
    },
    workType: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    quantity: {
      type: Number,
      required: true,
    },
    unit: {
      type: String,
      required: true,
      enum: ["sqft", "sqm", "rft", "cft", "nos", "kg", "ton", "ltr", "bag", "houses"],
    },
    ratePerUnit: {
      type: Number,
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    // Payment tracking
    paidAmount: {
      type: Number,
      default: 0,
    },
    pendingAmount: {
      type: Number,
      default: 0,
    },
    holdAmountPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    holdAmount: {
      type: Number,
      default: 0,
    },
    holdRemarks: {
      type: String,
      default: "",
    },
    balanceAmount: {
      type: Number,
      default: 0,
    },
    // TDS fields
    tdsPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    tdsAmount: {
      type: Number,
      default: 0,
    },
    netPayableAmount: {
      type: Number,
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "partial", "paid"],
      default: "unpaid",
    },
    paymentHistory: [
      {
        amount: { type: Number, required: true },
        date: { type: Date, default: Date.now },
        remarks: { type: String },
        receivedBy: { type: String },
      },
    ],
    // Reference to Subcontractor
    subcontractorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subcontractor",
    },
    // Legacy contractor fields (for backward compatibility)
    contractor: {
      name: { type: String },
      contact: { type: String },
    },
    startDate: {
      type: Date,
    },
    completionDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["pending", "in-progress", "completed", "verified"],
      default: "pending",
    },
    pdfUrl: {
      type: String,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    withMaterials: {
      type: Boolean,
      default: false,
    },
    materials: [
      {
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        unit: { type: String, required: true },
        addedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Calculate total amount and pending amount before saving
pieceWorkSchema.pre("save", function (next) {
  // Only recalculate totalAmount if quantity and ratePerUnit are modified
  if (this.isModified("quantity") || this.isModified("ratePerUnit")) {
    this.totalAmount = this.quantity * this.ratePerUnit;
  }
  
  this.pendingAmount = this.totalAmount - (this.paidAmount || 0);
  
  // Calculate hold amount based on percentage (only if holdAmountPercentage is set)
  const holdPercentage = this.holdAmountPercentage != null ? this.holdAmountPercentage : 0;
  this.holdAmount = (this.totalAmount * holdPercentage) / 100;
  
  // Calculate TDS amount based on percentage
  const tdsPercentage = this.tdsPercentage != null ? this.tdsPercentage : 0;
  this.tdsAmount = (this.totalAmount * tdsPercentage) / 100;
  
  // Calculate balance amount (pending - hold)
  this.balanceAmount = Math.max(0, this.pendingAmount - this.holdAmount);
  
  // Calculate net payable amount (balance - TDS)
  this.netPayableAmount = Math.max(0, this.balanceAmount - this.tdsAmount);
  
  // Update payment status based on amounts
  if (this.paidAmount <= 0) {
    this.paymentStatus = "unpaid";
  } else if (this.paidAmount >= this.totalAmount) {
    this.paymentStatus = "paid";
    this.pendingAmount = 0;
    this.balanceAmount = 0;
    this.netPayableAmount = 0;
  } else {
    this.paymentStatus = "partial";
  }
  next();
});

module.exports = mongoose.model("PieceWork", pieceWorkSchema);
