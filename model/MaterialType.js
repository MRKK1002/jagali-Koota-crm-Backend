const mongoose = require("mongoose");

const materialTypeSchema = new mongoose.Schema(
  {
    materialCode: {
      type: String,
      required: true,
      unique: true,
    },
    materialName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "Cement",
        "Steel",
        "Sand",
        "Aggregate",
        "Bricks",
        "Tiles",
        "Paint",
        "Electrical",
        "Plumbing",
        "Wood",
        "Hardware",
        "Other",
      ],
    },
    unit: {
      type: String,
      required: true,
      enum: ["Bags", "Tons", "Cubic Meter", "Pieces", "Kg", "Liters", "Meters", "Sq.Ft", "Units"],
    },
    description: {
      type: String,
    },
    specifications: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
// materialName index is automatically created by unique: true constraint
materialTypeSchema.index({ category: 1 });
materialTypeSchema.index({ isActive: 1 });

module.exports = mongoose.models.MaterialType || mongoose.model("MaterialType", materialTypeSchema);
