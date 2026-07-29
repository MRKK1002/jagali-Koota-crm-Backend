const mongoose = require("mongoose");

const inventoryValuationSchema = new mongoose.Schema(
  {
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
    valuationDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    valuationMethod: {
      type: String,
      required: true,
      enum: ["FIFO", "LIFO", "Weighted Average", "Specific Identification"],
    },
    totalQuantity: {
      type: Number,
      required: true,
      default: 0,
    },
    unit: {
      type: String,
      required: true,
    },
    // FIFO Valuation
    fifo: {
      averageCost: {
        type: Number,
        default: 0,
      },
      totalValue: {
        type: Number,
        default: 0,
      },
      batches: [
        {
          batchNumber: String,
          quantity: Number,
          unitCost: Number,
          value: Number,
          receivedDate: Date,
        },
      ],
    },
    // LIFO Valuation
    lifo: {
      averageCost: {
        type: Number,
        default: 0,
      },
      totalValue: {
        type: Number,
        default: 0,
      },
      batches: [
        {
          batchNumber: String,
          quantity: Number,
          unitCost: Number,
          value: Number,
          receivedDate: Date,
        },
      ],
    },
    // Weighted Average Valuation
    weightedAverage: {
      averageCost: {
        type: Number,
        default: 0,
      },
      totalValue: {
        type: Number,
        default: 0,
      },
      calculation: {
        totalPurchaseValue: Number,
        totalPurchaseQuantity: Number,
      },
    },
    // Current valuation (based on selected method)
    currentValuation: {
      method: String,
      averageCost: Number,
      totalValue: Number,
    },
    // Cost of Goods Sold (COGS)
    cogs: {
      currentMonth: {
        type: Number,
        default: 0,
      },
      currentYear: {
        type: Number,
        default: 0,
      },
    },
    // Valuation adjustments
    adjustments: [
      {
        date: Date,
        reason: String,
        previousValue: Number,
        newValue: Number,
        adjustedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "SubAdmin",
        },
      },
    ],
    lastCalculated: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
inventoryValuationSchema.index({ item: 1, warehouse: 1, valuationDate: -1 });
inventoryValuationSchema.index({ businessType: 1, valuationDate: -1 });

// Method to calculate FIFO valuation
inventoryValuationSchema.methods.calculateFIFO = async function () {
  const InventoryBatch = require("./InventoryBatch");

  const batches = await InventoryBatch.find({
    item: this.item,
    warehouse: this.warehouse,
    status: "Active",
    quantity: { $gt: 0 },
  }).sort({ receivedDate: 1 });

  let totalQuantity = 0;
  let totalValue = 0;
  const batchDetails = [];

  for (const batch of batches) {
    totalQuantity += batch.quantity;
    const batchValue = batch.quantity * batch.purchasePrice;
    totalValue += batchValue;

    batchDetails.push({
      batchNumber: batch.batchNumber,
      quantity: batch.quantity,
      unitCost: batch.purchasePrice,
      value: batchValue,
      receivedDate: batch.receivedDate,
    });
  }

  this.fifo = {
    averageCost: totalQuantity > 0 ? totalValue / totalQuantity : 0,
    totalValue,
    batches: batchDetails,
  };

  this.totalQuantity = totalQuantity;
  return this.fifo;
};

// Method to calculate LIFO valuation
inventoryValuationSchema.methods.calculateLIFO = async function () {
  const InventoryBatch = require("./InventoryBatch");

  const batches = await InventoryBatch.find({
    item: this.item,
    warehouse: this.warehouse,
    status: "Active",
    quantity: { $gt: 0 },
  }).sort({ receivedDate: -1 });

  let totalQuantity = 0;
  let totalValue = 0;
  const batchDetails = [];

  for (const batch of batches) {
    totalQuantity += batch.quantity;
    const batchValue = batch.quantity * batch.purchasePrice;
    totalValue += batchValue;

    batchDetails.push({
      batchNumber: batch.batchNumber,
      quantity: batch.quantity,
      unitCost: batch.purchasePrice,
      value: batchValue,
      receivedDate: batch.receivedDate,
    });
  }

  this.lifo = {
    averageCost: totalQuantity > 0 ? totalValue / totalQuantity : 0,
    totalValue,
    batches: batchDetails,
  };

  return this.lifo;
};

// Method to calculate Weighted Average valuation
inventoryValuationSchema.methods.calculateWeightedAverage = async function () {
  const InventoryBatch = require("./InventoryBatch");

  const batches = await InventoryBatch.find({
    item: this.item,
    warehouse: this.warehouse,
    status: "Active",
    quantity: { $gt: 0 },
  });

  let totalQuantity = 0;
  let totalPurchaseValue = 0;

  for (const batch of batches) {
    totalQuantity += batch.quantity;
    totalPurchaseValue += batch.quantity * batch.purchasePrice;
  }

  const averageCost = totalQuantity > 0 ? totalPurchaseValue / totalQuantity : 0;
  const totalValue = totalQuantity * averageCost;

  this.weightedAverage = {
    averageCost,
    totalValue,
    calculation: {
      totalPurchaseValue,
      totalPurchaseQuantity: totalQuantity,
    },
  };

  return this.weightedAverage;
};

// Method to calculate all valuation methods
inventoryValuationSchema.methods.calculateAllMethods = async function () {
  await this.calculateFIFO();
  await this.calculateLIFO();
  await this.calculateWeightedAverage();

  // Set current valuation based on selected method
  switch (this.valuationMethod) {
    case "FIFO":
      this.currentValuation = {
        method: "FIFO",
        averageCost: this.fifo.averageCost,
        totalValue: this.fifo.totalValue,
      };
      break;
    case "LIFO":
      this.currentValuation = {
        method: "LIFO",
        averageCost: this.lifo.averageCost,
        totalValue: this.lifo.totalValue,
      };
      break;
    case "Weighted Average":
      this.currentValuation = {
        method: "Weighted Average",
        averageCost: this.weightedAverage.averageCost,
        totalValue: this.weightedAverage.totalValue,
      };
      break;
  }

  this.lastCalculated = new Date();
  await this.save();

  return this;
};

// Static method to get valuation comparison
inventoryValuationSchema.statics.getValuationComparison = async function (
  itemId,
  warehouseId
) {
  let valuation = await this.findOne({
    item: itemId,
    warehouse: warehouseId,
  });

  if (!valuation) {
    // Create new valuation
    const Item = require("./Item");
    const item = await Item.findById(itemId);

    valuation = new this({
      item: itemId,
      itemName: item.name,
      businessType: item.businessType,
      warehouse: warehouseId,
      valuationMethod: "FIFO",
      unit: item.unit,
    });
  }

  await valuation.calculateAllMethods();

  return {
    item: valuation.itemName,
    totalQuantity: valuation.totalQuantity,
    unit: valuation.unit,
    valuations: {
      fifo: {
        averageCost: valuation.fifo.averageCost.toFixed(2),
        totalValue: valuation.fifo.totalValue.toFixed(2),
        batchCount: valuation.fifo.batches.length,
      },
      lifo: {
        averageCost: valuation.lifo.averageCost.toFixed(2),
        totalValue: valuation.lifo.totalValue.toFixed(2),
        batchCount: valuation.lifo.batches.length,
      },
      weightedAverage: {
        averageCost: valuation.weightedAverage.averageCost.toFixed(2),
        totalValue: valuation.weightedAverage.totalValue.toFixed(2),
      },
    },
    difference: {
      fifoVsLifo: (
        valuation.fifo.totalValue - valuation.lifo.totalValue
      ).toFixed(2),
      fifoVsWeighted: (
        valuation.fifo.totalValue - valuation.weightedAverage.totalValue
      ).toFixed(2),
      lifoVsWeighted: (
        valuation.lifo.totalValue - valuation.weightedAverage.totalValue
      ).toFixed(2),
    },
  };
};

// Static method to get total inventory value by business type
inventoryValuationSchema.statics.getTotalInventoryValue = async function (
  businessType,
  valuationMethod = "FIFO"
) {
  const valuations = await this.find({ businessType });

  let totalValue = 0;
  for (const valuation of valuations) {
    await valuation.calculateAllMethods();

    switch (valuationMethod) {
      case "FIFO":
        totalValue += valuation.fifo.totalValue;
        break;
      case "LIFO":
        totalValue += valuation.lifo.totalValue;
        break;
      case "Weighted Average":
        totalValue += valuation.weightedAverage.totalValue;
        break;
    }
  }

  return totalValue;
};

module.exports = mongoose.model("InventoryValuation", inventoryValuationSchema);


