const mongoose = require("mongoose");

const batchLineSchema = new mongoose.Schema({
  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "InventoryBatch",
    required: true,
  },
  batchNumber: String,
  quantity: {
    type: Number,
    required: true,
  },
  unitCost: Number,
  value: Number,
});

const inventoryTransactionSchema = new mongoose.Schema(
  {
    transactionNumber: {
      type: String,
      required: true,
      unique: true,
    },
    transactionType: {
      type: String,
      required: true,
      enum: [
        "Purchase",
        "Sale",
        "Transfer",
        "Adjustment",
        "Return",
        "Damage",
        "Wastage",
        "Production",
        "Consumption",
        "Opening Stock",
        "Closing Stock",
      ],
    },
    businessType: {
      type: String,
      required: true,
      enum: ["restaurant", "construction"],
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
    // Warehouse information
    fromWarehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
    },
    toWarehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
    },
    // Quantity details
    quantity: {
      type: Number,
      required: true,
    },
    unit: {
      type: String,
      required: true,
    },
    // Batch tracking
    batches: [batchLineSchema],
    // Valuation
    valuationMethod: {
      type: String,
      enum: ["FIFO", "LIFO", "Weighted Average", "Specific Identification"],
      default: "FIFO",
    },
    unitCost: {
      type: Number,
      default: 0,
    },
    totalValue: {
      type: Number,
      default: 0,
    },
    // Reference documents
    referenceType: {
      type: String,
      enum: [
        "Purchase Order",
        "Sales Order",
        "Invoice",
        "GRN",
        "Delivery Note",
        "Transfer Note",
        "Adjustment Note",
        "Other",
      ],
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    referenceNumber: String,
    // Stock levels before and after
    stockBefore: {
      type: Number,
      default: 0,
    },
    stockAfter: {
      type: Number,
      default: 0,
    },
    transactionDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    reason: String,
    remarks: String,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubAdmin",
    },
    approvalDate: Date,
    status: {
      type: String,
      enum: ["Draft", "Pending", "Approved", "Rejected", "Completed"],
      default: "Completed",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubAdmin",
      required: true,
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
inventoryTransactionSchema.index({ transactionNumber: 1 });
inventoryTransactionSchema.index({ item: 1, transactionDate: -1 });
inventoryTransactionSchema.index({ businessType: 1, transactionType: 1 });
inventoryTransactionSchema.index({ transactionDate: -1 });
inventoryTransactionSchema.index({ fromWarehouse: 1 });
inventoryTransactionSchema.index({ toWarehouse: 1 });

// Static method to generate transaction number
inventoryTransactionSchema.statics.generateTransactionNumber = async function (
  businessType,
  transactionType
) {
  const prefix = businessType === "restaurant" ? "IT-R" : "IT-C";
  const typeCode = transactionType.substring(0, 3).toUpperCase();
  const year = new Date().getFullYear();

  const count = await this.countDocuments({
    businessType,
    transactionType,
    createdAt: {
      $gte: new Date(year, 0, 1),
      $lt: new Date(year + 1, 0, 1),
    },
  });

  return `${prefix}-${typeCode}-${year}-${String(count + 1).padStart(5, "0")}`;
};

// Method to process stock IN transaction
inventoryTransactionSchema.statics.processStockIn = async function ({
  businessType,
  item,
  warehouse,
  quantity,
  unit,
  unitCost,
  batch,
  transactionType,
  referenceType,
  referenceId,
  referenceNumber,
  reason,
  createdBy,
}) {
  const InventoryBatch = require("./InventoryBatch");
  const Item = require("./Item");

  // Get item details
  const itemDoc = await Item.findById(item);

  // Get current stock
  const currentStock = await this.getCurrentStock(item, warehouse);

  // Create or update batch
  let batchDoc;
  if (batch && batch.batchNumber) {
    batchDoc = await InventoryBatch.findOne({
      batchNumber: batch.batchNumber,
    });

    if (batchDoc) {
      await batchDoc.returnQuantity(quantity);
    } else {
      batchDoc = new InventoryBatch({
        batchNumber: batch.batchNumber,
        item,
        itemName: itemDoc.name,
        businessType,
        warehouse,
        quantity,
        originalQuantity: quantity,
        unit,
        purchasePrice: unitCost,
        totalValue: quantity * unitCost,
        manufactureDate: batch.manufactureDate,
        expiryDate: batch.expiryDate,
        supplier: batch.supplier,
        supplierName: batch.supplierName,
        purchaseOrder: batch.purchaseOrder,
        poNumber: batch.poNumber,
        receivedDate: new Date(),
        createdBy,
      });
      await batchDoc.save();
    }
  } else {
    // Auto-generate batch
    const batchNumber = await InventoryBatch.generateBatchNumber(businessType);
    batchDoc = new InventoryBatch({
      batchNumber,
      item,
      itemName: itemDoc.name,
      businessType,
      warehouse,
      quantity,
      originalQuantity: quantity,
      unit,
      purchasePrice: unitCost,
      totalValue: quantity * unitCost,
      receivedDate: new Date(),
      createdBy,
    });
    await batchDoc.save();
  }

  // Generate transaction number
  const transactionNumber = await this.generateTransactionNumber(
    businessType,
    transactionType
  );

  // Create transaction
  const transaction = new this({
    transactionNumber,
    transactionType,
    businessType,
    item,
    itemName: itemDoc.name,
    toWarehouse: warehouse,
    quantity,
    unit,
    batches: [
      {
        batch: batchDoc._id,
        batchNumber: batchDoc.batchNumber,
        quantity,
        unitCost,
        value: quantity * unitCost,
      },
    ],
    unitCost,
    totalValue: quantity * unitCost,
    referenceType,
    referenceId,
    referenceNumber,
    stockBefore: currentStock,
    stockAfter: currentStock + quantity,
    reason,
    status: "Completed",
    createdBy,
  });

  await transaction.save();

  // Update item stock
  await itemDoc.updateStock(warehouse, quantity, "in");

  return transaction;
};

// Method to process stock OUT transaction
inventoryTransactionSchema.statics.processStockOut = async function ({
  businessType,
  item,
  warehouse,
  quantity,
  unit,
  valuationMethod = "FIFO",
  transactionType,
  referenceType,
  referenceId,
  referenceNumber,
  reason,
  createdBy,
}) {
  const InventoryBatch = require("./InventoryBatch");
  const Item = require("./Item");

  // Get item details
  const itemDoc = await Item.findById(item);

  // Get current stock
  const currentStock = await this.getCurrentStock(item, warehouse);

  if (currentStock < quantity) {
    throw new Error(`Insufficient stock. Available: ${currentStock}, Required: ${quantity}`);
  }

  // Get batches based on valuation method
  const batches = await InventoryBatch.getBatchesForItem(
    item,
    warehouse,
    valuationMethod
  );

  let remainingQty = quantity;
  const consumedBatches = [];
  let totalCost = 0;

  // Consume from batches
  for (const batch of batches) {
    if (remainingQty <= 0) break;

    const consumeQty = Math.min(batch.quantity, remainingQty);
    await batch.consumeQuantity(consumeQty);

    const batchValue = consumeQty * batch.purchasePrice;
    totalCost += batchValue;

    consumedBatches.push({
      batch: batch._id,
      batchNumber: batch.batchNumber,
      quantity: consumeQty,
      unitCost: batch.purchasePrice,
      value: batchValue,
    });

    remainingQty -= consumeQty;
  }

  if (remainingQty > 0) {
    throw new Error(`Could not consume full quantity. Remaining: ${remainingQty}`);
  }

  // Generate transaction number
  const transactionNumber = await this.generateTransactionNumber(
    businessType,
    transactionType
  );

  const avgCost = quantity > 0 ? totalCost / quantity : 0;

  // Create transaction
  const transaction = new this({
    transactionNumber,
    transactionType,
    businessType,
    item,
    itemName: itemDoc.name,
    fromWarehouse: warehouse,
    quantity,
    unit,
    batches: consumedBatches,
    valuationMethod,
    unitCost: avgCost,
    totalValue: totalCost,
    referenceType,
    referenceId,
    referenceNumber,
    stockBefore: currentStock,
    stockAfter: currentStock - quantity,
    reason,
    status: "Completed",
    createdBy,
  });

  await transaction.save();

  // Update item stock
  await itemDoc.updateStock(warehouse, quantity, "out");

  return transaction;
};

// Static method to get current stock
inventoryTransactionSchema.statics.getCurrentStock = async function (
  itemId,
  warehouseId
) {
  const InventoryBatch = require("./InventoryBatch");

  const result = await InventoryBatch.aggregate([
    {
      $match: {
        item: mongoose.Types.ObjectId(itemId),
        warehouse: mongoose.Types.ObjectId(warehouseId),
        status: "Active",
      },
    },
    {
      $group: {
        _id: null,
        totalQuantity: { $sum: "$quantity" },
      },
    },
  ]);

  return result.length > 0 ? result[0].totalQuantity : 0;
};

// Static method to get stock movement report
inventoryTransactionSchema.statics.getStockMovementReport = async function (
  itemId,
  warehouseId,
  startDate,
  endDate
) {
  const query = {
    item: itemId,
    transactionDate: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
  };

  if (warehouseId) {
    query.$or = [{ fromWarehouse: warehouseId }, { toWarehouse: warehouseId }];
  }

  const transactions = await this.find(query)
    .sort({ transactionDate: 1 })
    .populate("fromWarehouse", "name")
    .populate("toWarehouse", "name");

  // Calculate opening stock
  const openingStockTransactions = await this.find({
    item: itemId,
    transactionDate: { $lt: new Date(startDate) },
  });

  let openingStock = 0;
  for (const txn of openingStockTransactions) {
    if (txn.toWarehouse && txn.toWarehouse.toString() === warehouseId.toString()) {
      openingStock += txn.quantity;
    }
    if (txn.fromWarehouse && txn.fromWarehouse.toString() === warehouseId.toString()) {
      openingStock -= txn.quantity;
    }
  }

  // Calculate totals
  let totalIn = 0;
  let totalOut = 0;
  let runningStock = openingStock;

  const movementDetails = transactions.map((txn) => {
    let stockChange = 0;

    if (txn.toWarehouse && txn.toWarehouse._id.toString() === warehouseId.toString()) {
      totalIn += txn.quantity;
      stockChange = txn.quantity;
    }

    if (txn.fromWarehouse && txn.fromWarehouse._id.toString() === warehouseId.toString()) {
      totalOut += txn.quantity;
      stockChange = -txn.quantity;
    }

    runningStock += stockChange;

    return {
      date: txn.transactionDate,
      transactionNumber: txn.transactionNumber,
      type: txn.transactionType,
      reference: txn.referenceNumber,
      inQty: stockChange > 0 ? txn.quantity : 0,
      outQty: stockChange < 0 ? txn.quantity : 0,
      balance: runningStock,
      value: txn.totalValue,
    };
  });

  return {
    openingStock,
    totalIn,
    totalOut,
    closingStock: runningStock,
    transactions: movementDetails,
  };
};

module.exports = mongoose.model("InventoryTransaction", inventoryTransactionSchema);


