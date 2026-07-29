const mongoose = require("mongoose");

const inventoryBatchSchema = new mongoose.Schema(
  {
    batchNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true,
    },
    itemName: {
      type: String,
      required: true,
    },
    businessType: {
      type: String,
      required: true,
      enum: ["restaurant", "construction"],
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
    },
    warehouseName: String,
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    originalQuantity: {
      type: Number,
      required: true,
    },
    unit: {
      type: String,
      required: true,
    },
    purchasePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    sellingPrice: {
      type: Number,
      min: 0,
    },
    totalValue: {
      type: Number,
      required: true,
    },
    manufactureDate: {
      type: Date,
    },
    expiryDate: {
      type: Date,
    },
    daysToExpiry: {
      type: Number,
    },
    isExpired: {
      type: Boolean,
      default: false,
    },
    isNearExpiry: {
      type: Boolean,
      default: false,
    },
    nearExpiryThresholdDays: {
      type: Number,
      default: 30, // Alert if expiring within 30 days
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
    },
    supplierName: String,
    purchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseOrder",
    },
    poNumber: String,
    receivedDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["Active", "Depleted", "Expired", "Returned", "Damaged"],
      default: "Active",
    },
    qualityCheck: {
      status: {
        type: String,
        enum: ["Pending", "Passed", "Failed"],
        default: "Passed",
      },
      checkedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SubAdmin",
      },
      checkedDate: Date,
      remarks: String,
    },
    location: {
      rack: String,
      bin: String,
      zone: String,
    },
    notes: String,
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubAdmin",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubAdmin",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
inventoryBatchSchema.index({ batchNumber: 1 });
inventoryBatchSchema.index({ item: 1, status: 1 });
inventoryBatchSchema.index({ businessType: 1, warehouse: 1 });
inventoryBatchSchema.index({ expiryDate: 1, status: 1 });
inventoryBatchSchema.index({ isExpired: 1, isNearExpiry: 1 });

// Pre-save middleware to calculate expiry status
inventoryBatchSchema.pre("save", function (next) {
  if (this.expiryDate) {
    const now = new Date();
    const expiryDate = new Date(this.expiryDate);

    // Calculate days to expiry
    this.daysToExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

    // Check if expired
    if (expiryDate < now) {
      this.isExpired = true;
      this.isNearExpiry = false;
      this.status = "Expired";
    } else if (this.daysToExpiry <= this.nearExpiryThresholdDays) {
      this.isNearExpiry = true;
    }
  }

  // Update total value
  this.totalValue = this.quantity * this.purchasePrice;

  // Check if depleted
  if (this.quantity === 0 && this.status === "Active") {
    this.status = "Depleted";
  }

  next();
});

// Method to consume quantity (FIFO/FEFO)
inventoryBatchSchema.methods.consumeQuantity = async function (consumedQty) {
  if (consumedQty > this.quantity) {
    throw new Error(`Cannot consume ${consumedQty} - only ${this.quantity} available`);
  }

  this.quantity -= consumedQty;
  this.totalValue = this.quantity * this.purchasePrice;

  if (this.quantity === 0) {
    this.status = "Depleted";
  }

  await this.save();
  return this;
};

// Method to return quantity to batch
inventoryBatchSchema.methods.returnQuantity = async function (returnedQty) {
  this.quantity += returnedQty;
  this.totalValue = this.quantity * this.purchasePrice;

  if (this.status === "Depleted") {
    this.status = "Active";
  }

  await this.save();
  return this;
};

// Static method to get batches by item (sorted for FIFO/FEFO)
inventoryBatchSchema.statics.getBatchesForItem = async function (
  itemId,
  warehouseId,
  valuationMethod = "FIFO"
) {
  const query = {
    item: itemId,
    status: "Active",
    quantity: { $gt: 0 },
  };

  if (warehouseId) {
    query.warehouse = warehouseId;
  }

  let sortCriteria;
  switch (valuationMethod) {
    case "FIFO":
      sortCriteria = { receivedDate: 1 }; // First In First Out
      break;
    case "LIFO":
      sortCriteria = { receivedDate: -1 }; // Last In First Out
      break;
    case "FEFO":
      sortCriteria = { expiryDate: 1, receivedDate: 1 }; // First Expiry First Out
      break;
    default:
      sortCriteria = { receivedDate: 1 };
  }

  return await this.find(query).sort(sortCriteria);
};

// Static method to get expiring batches
inventoryBatchSchema.statics.getExpiringBatches = async function (
  businessType,
  daysThreshold = 30
) {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

  return await this.find({
    businessType,
    status: "Active",
    quantity: { $gt: 0 },
    expiryDate: {
      $gte: new Date(),
      $lte: thresholdDate,
    },
  })
    .sort({ expiryDate: 1 })
    .populate("item", "name code")
    .populate("warehouse", "name");
};

// Static method to get expired batches
inventoryBatchSchema.statics.getExpiredBatches = async function (businessType) {
  return await this.find({
    businessType,
    status: { $ne: "Expired" },
    quantity: { $gt: 0 },
    expiryDate: { $lt: new Date() },
  })
    .populate("item", "name code")
    .populate("warehouse", "name");
};

// Static method to mark expired batches
inventoryBatchSchema.statics.markExpiredBatches = async function () {
  const expiredBatches = await this.updateMany(
    {
      status: { $ne: "Expired" },
      expiryDate: { $lt: new Date() },
      quantity: { $gt: 0 },
    },
    {
      $set: {
        status: "Expired",
        isExpired: true,
        isNearExpiry: false,
      },
    }
  );

  return expiredBatches;
};

// Static method to generate batch number
inventoryBatchSchema.statics.generateBatchNumber = async function (businessType) {
  const prefix = businessType === "restaurant" ? "BR" : "BC";
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  const count = await this.countDocuments({
    businessType,
    createdAt: {
      $gte: new Date(year, date.getMonth(), 1),
      $lt: new Date(year, date.getMonth() + 1, 1),
    },
  });

  return `${prefix}${year}${month}${String(count + 1).padStart(5, "0")}`;
};

module.exports = mongoose.model("InventoryBatch", inventoryBatchSchema);


