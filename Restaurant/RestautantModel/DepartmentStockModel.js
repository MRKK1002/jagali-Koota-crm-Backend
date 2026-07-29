const mongoose = require("mongoose");

const departmentStockSchema = new mongoose.Schema({
  department: {
    type: String,
    required: true,
  },
  branch: {
    type: String,
    required: true,
  },
  rawMaterial: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RawMaterial",
    required: true,
  },
  productName: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    default: 0,
    min: 0,
  },
  unit: {
    type: String,
    required: true,
  },
  lastIssuedAt: {
    type: Date,
  },
  lastIssuedQuantity: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Unique constraint: one entry per material per department per branch
departmentStockSchema.index({ department: 1, branch: 1, rawMaterial: 1 }, { unique: true });

module.exports = mongoose.models.DepartmentStock || mongoose.model("DepartmentStock", departmentStockSchema);
