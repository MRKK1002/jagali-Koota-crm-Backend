const StockInwardRequest = require("../RestautantModel/RestaurantStockInwardModel");

// Create new stock inward request
// exports.createStockInwardRequest = async (req, res) => {
//   try {
//     const {
//       materialName,
//       unit,
//       locationId,
//       supplierId,
//       supplier,
//       quantity,
//       costPrice,
//       expiryDate,
//       batchNumber,
//       notes,
//       referenceNumber,
//       rawMaterialId,
      
//       requestedBy
//     } = req.body;

//     // Auto-calculate total value
//     const totalValue = quantity * costPrice;

//     const newRequest = new StockInwardRequest({
//       referenceNumber,
//       rawMaterialId,
//       materialName,
//       unit,
//       locationId,
//       supplierId,
//       supplier,
//       quantity,
//       costPrice,
//       totalValue,
//       expiryDate,
//       batchNumber,
//       notes,
//       requestedBy
//     });

//     const savedRequest = await newRequest.save();

//     console.log(referenceNumber)

//     res.status(201).json({
//       success: true,
//       message: "Stock inward request created successfully",
//       data: savedRequest
//     });
//   } catch (err) {
//     console.error("Error creating stock inward request:", err);
//     res.status(400).json({ error: err.message });
//   }
// };

// StockInwardRequest already declared at line 1
// const StockInwardRequest = require("../RestautantModel/RestaurantStockInwardModel");
const RawMaterial = require("../RestautantModel/RestaurantRawMaterialModel");
const rawMaterialModel = require("../RestautantModel/RestaurantRawMaterialModel");

exports.createStockInwardRequest = async (req, res) => {
  try {
    const {
      materialName,
      unit,
      locationId,
      supplierId,
      supplier,
      quantity,
      costPrice,
      expiryDate,
      batchNumber,
      notes,
      referenceNumber,
      rawMaterialId,
      requestedBy,
    } = req.body;

    if (!rawMaterialId || !locationId || !quantity || !costPrice) {
      return res.status(400).json({ error: "Missing required fields: rawMaterialId, locationId, quantity, costPrice" });
    }

    // Auto-calculate total value
    const totalValue = quantity * costPrice;

    // Step 1: Create the stock inward request
    const newRequest = new StockInwardRequest({
      referenceNumber: referenceNumber || `STK-IN-${Date.now()}`,
      rawMaterialId,
      unit,
      locationId,
      supplierId,
      quantity,
      costPrice,
      totalValue,
      expiryDate,
      batchNumber,
      notes,
      requestedBy,
      status: "approved",
      processed: true,
      processedAt: new Date(),
    });

    const savedRequest = await newRequest.save();

    // // Step 2: Update RawMaterial stock
    // if (rawMaterialId) {
    //   const rawMaterial = await rawMaterialModel.findById(rawMaterialId);

    //   if (!rawMaterial) {
    //     return res.status(404).json({ error: "RawMaterial not found" });
    //   }

    //   // ✅ Update supplier entry
    //   let supplierEntry = rawMaterial.suppliers.find(
    //     (s) => s.supplier.toString() === supplierId.toString()
    //   );

    //   if (supplierEntry) {
    //     supplierEntry.quantity += quantity;
    //     supplierEntry.price = costPrice; // update latest price
    //   } else {
    //     rawMaterial.suppliers.push({
    //       supplier: supplierId,
    //       quantity,
    //       price: costPrice,
    //     });
    //   }

    //   // ✅ Update location entry
    //   let locationEntry = rawMaterial.locations.find(
    //     (l) => l.location.toString() === locationId.toString()
    //   );

    //   if (locationEntry) {
    //     locationEntry.quantity += quantity;
    //   } else {
    //     rawMaterial.locations.push({
    //       location: locationId,
    //       quantity,
    //     });
    //   }

    //   await rawMaterial.save(); // triggers pre("save") to recalc totals/status
    // }

      let stock = await ResStock.findOne({ rawMaterial: rawMaterialId });

  if (!stock) {
    // Create new stock entry if doesn't exist
    stock = new ResStock({
      rawMaterial: rawMaterialId,
      totalQuantityPurchased: quantity,
      remainingStock: quantity,
      totalValue: quantity * costPrice,
      avgPrice: costPrice,
      purchaseHistory: [
        {
          supplierId,
          quantity,
          rate: costPrice,
          total: quantity * costPrice,
        },
      ],
    });
  } else {
    // Update existing stock
    stock.totalQuantityPurchased += quantity;
    stock.remainingStock += quantity;

    // Recalculate avgPrice
    stock.totalValue += quantity * costPrice;
    stock.avgPrice = stock.totalQuantityPurchased
      ? stock.totalValue / stock.totalQuantityPurchased
      : 0;

    // Push to purchase history
    stock.purchaseHistory.push({
      supplierId,
      quantity,
      rate: costPrice,
      total: quantity * costPrice,
    });
  }

    res.status(201).json({
      success: true,
      message: "Stock inward request created and stock updated successfully",
      data: savedRequest,
    });
  } catch (err) {
    console.error("Error creating stock inward request:", err);
    res.status(400).json({ error: err.message });
  }
};

// Get all stock inward requests
exports.getAllStockInwardRequests = async (req, res) => {
  try {
    const requests = await StockInwardRequest.find()
      .sort({ createdAt: -1 })
      .populate("rawMaterialId", "name")
      .populate("locationId", "name")
      .populate("supplierId", "name");

    res.json({ success: true, data: requests });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get one by ID
exports.getStockInwardRequestById = async (req, res) => {
  try {
    const request = await StockInwardRequest.findById(req.params.id)
      .populate("rawMaterialId", "name")
      .populate("locationId", "name")
      .populate("supplierId", "name");

    if (!request) return res.status(404).json({ error: "Not found" });

    res.json({ success: true, data: request });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateStockInwardStatus = async (req, res) => {
  try {
    const { status, approvedBy, approvalNotes, processed, processedAt, transactionId } = req.body;

    const request = await StockInwardRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: "Request not found" });

    // Only process if approving & not already processed
    if (status === "approved" && !request.processed) {
      const rawMaterial = await RawMaterial.findById(request.rawMaterialId);

      if (!rawMaterial) {
        return res.status(404).json({ error: "RawMaterial not found" });
      }

      // Update supplier entry
      let supplierEntry = rawMaterial.suppliers.find(
        s => s.supplier.toString() === request.supplierId.toString()
      );

      if (supplierEntry) {
        supplierEntry.quantity += request.quantity;
        supplierEntry.price = request.costPrice;
      } else {
        rawMaterial.suppliers.push({
          supplier: request.supplierId,
          quantity: request.quantity,
          price: request.costPrice,
        });
      }

      // Update location entry
      let locationEntry = rawMaterial.locations.find(
        l => l.location.toString() === request.locationId.toString()
      );

      if (locationEntry) {
        locationEntry.quantity += request.quantity;
      } else {
        rawMaterial.locations.push({
          location: request.locationId,
          quantity: request.quantity,
        });
      }

      await rawMaterial.save();

      // Update LocationInventory
      let locationInventory = await LocationInventory.findOne({
        locationId: request.locationId,
        rawMaterialId: request.rawMaterialId,
      });

      if (locationInventory) {
        locationInventory.quantity += request.quantity;
        locationInventory.costPrice = request.costPrice;
        locationInventory.lastUpdated = new Date();
      } else {
        locationInventory = new LocationInventory({
          locationId: request.locationId,
          rawMaterialId: request.rawMaterialId,
          quantity: request.quantity,
          costPrice: request.costPrice,
        });
      }

      await locationInventory.save();

      // Create stock transaction
      const transaction = new StockTransaction({
        type: "inward",
        locationId: request.locationId,
        rawMaterialId: request.rawMaterialId,
        quantity: request.quantity,
        costPrice: request.costPrice,
        reference: request.referenceNumber || request._id.toString(),
        source: "Stock Inward Approval",
      });

      await transaction.save();

      // Mark inward as processed
      request.processed = true;
      request.processedAt = new Date();
    }

    // Update request status
    request.status = status;
    request.approvedBy = approvedBy;
    request.approvalNotes = approvalNotes;
    request.transactionId = transactionId;
    request.approvedAt = new Date();

    await request.save();

    res.json({ success: true, message: "Status updated & stock adjusted", data: request });
  } catch (err) {
    console.error("Error updating inward status:", err);
    res.status(400).json({ error: err.message });
  }
};
