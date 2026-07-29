const mongoose = require("mongoose");

// Counter schema for auto-generating indent numbers
const indentCounterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { strict: true }
);

const IndentCounter =
  mongoose.models.IndentCounter || mongoose.model("IndentCounter", indentCounterSchema);

// Item sub-schema
const indentItemSchema = new mongoose.Schema(
  {
    rawMaterial: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RawMaterial",
    },
    productName: {
      type: String,
      required: true,
    },
    requestedQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    requestedUnit: {
      type: String,
      required: true,
    },
    approvedQuantity: {
      type: Number,
      default: null,
    },
    issuedQuantity: {
      type: Number,
      default: null,
    },
    rate: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const indentSchema = new mongoose.Schema(
  {
    indentNumber: {
      type: String,
      unique: true,
    },
    department: {
      type: String,
      required: true,
      // Kitchen, Bar, Bakery, Pantry, etc.
    },
    raisedBy: {
      type: String,
      required: true,
    },
    raisedByContact: {
      type: String,
      default: null,
    },
    branch: {
      type: String,
      required: true,
    },
    items: [indentItemSchema],
    status: {
      type: String,
      enum: [
        "Pending",
        "HOD Approved",
        "HOD Partially Approved",
        "HOD Rejected",
        "Store Approved",
        "Store Issued",
        "Completed",
        "Cancelled",
      ],
      default: "Pending",
    },
    hodApproval: {
      approvedBy: { type: String, default: null },
      approvedAt: { type: Date, default: null },
      remarks: { type: String, default: null },
    },
    storeApproval: {
      approvedBy: { type: String, default: null },
      approvedAt: { type: Date, default: null },
      remarks: { type: String, default: null },
    },
    priority: {
      type: String,
      enum: ["Low", "Normal", "High", "Urgent"],
      default: "Normal",
    },
    requiredDate: {
      type: Date,
    },
    purpose: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to auto-generate indentNumber
indentSchema.pre("save", async function (next) {
  if (this.isNew && !this.indentNumber) {
    try {
      console.log("Generating indentNumber for new indent");
      const counter = await IndentCounter.findOneAndUpdate(
        { _id: "indentNumber" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      console.log("Indent counter document:", counter);
      this.indentNumber = `IND${String(counter.seq).padStart(4, "0")}`;
      next();
    } catch (error) {
      console.error("Error in indent pre-save hook:", error);
      next(error);
    }
  } else {
    next();
  }
});

console.log("Indent model defined");

module.exports =
  mongoose.models.Indent || mongoose.model("Indent", indentSchema);
