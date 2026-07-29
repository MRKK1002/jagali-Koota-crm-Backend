const ResStock = require("../model/ResStockModel");

// Create new stock
exports.createStock = async (req, res) => {
  try {
    const stock = new ResStock(req.body);
    await stock.save();
    res.status(201).json({ success: true, message: "Stock created", data: stock });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get all stocks
exports.getAllStocks = async (req, res) => {
  try {
    const stocks = await ResStock.find()
      .populate("rawMaterial", "name unit") // adjust fields based on Material schema
      .populate("purchaseHistory.supplierId", "name email") 
      .populate("purchaseHistory.purchaseOrderId", "purchaseOrderId");
    res.status(200).json({ success: true, data: stocks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get stock by ID
exports.getStockById = async (req, res) => {
  try {
    const stock = await ResStock.findById(req.params.id)
      .populate("rawMaterial", "name unit")
      .populate("purchaseHistory.supplierId", "name email")
      .populate("purchaseHistory.purchaseOrderId", "orderNumber");

    if (!stock) return res.status(404).json({ success: false, message: "Stock not found" });

    res.status(200).json({ success: true, data: stock });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update stock
exports.updateStock = async (req, res) => {
  try {
    const stock = await ResStock.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate("rawMaterial", "name unit")
      .populate("purchaseHistory.supplierId", "name email")
      .populate("purchaseHistory.purchaseOrderId", "orderNumber");

    if (!stock) return res.status(404).json({ success: false, message: "Stock not found" });

    res.status(200).json({ success: true, message: "Stock updated", data: stock });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete stock
exports.deleteStock = async (req, res) => {
  try {
    const stock = await ResStock.findByIdAndDelete(req.params.id);
    if (!stock) return res.status(404).json({ success: false, message: "Stock not found" });

    res.status(200).json({ success: true, message: "Stock deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
