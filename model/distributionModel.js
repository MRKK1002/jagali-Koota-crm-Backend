const mongoose = require("mongoose")

const distributionSchema = new mongoose.Schema(
  {
    distributionNumber: {
      type: String,
      required: true,
      unique: true,
    },
    fromStoreId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StoreLocation",
      required: true,
    },
    toStoreId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StoreLocation",
      required: true,
    },
    rawMaterialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RawMaterial",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0.01,
    },
    unit: {
      type: String,
      default: "unit",
    },
    costPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    distributionDate: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["Completed", "Cancelled", "Pending"],
      default: "Completed",
    },
    fromStoreStockBefore: {
      type: Number,
      default: 0,
    },
    fromStoreStockAfter: {
      type: Number,
      default: 0,
    },
    toStoreStockBefore: {
      type: Number,
      default: 0,
    },
    toStoreStockAfter: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

distributionSchema.index({ fromStoreId: 1, createdAt: -1 })
distributionSchema.index({ toStoreId: 1, createdAt: -1 })
distributionSchema.index({ rawMaterialId: 1 })
distributionSchema.index({ status: 1 })

module.exports = mongoose.models.Distribution || mongoose.model("Distribution", distributionSchema)
