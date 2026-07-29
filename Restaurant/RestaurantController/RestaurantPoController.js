const Vendor = require('../model/Vendor');
const PurchaseOrder = require('../model/poModel');

// Vendor Controllers
exports.getVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find().lean();
    res.status(200).json(vendors);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching vendors', error: error.message });
  }
};

exports.createVendor = async (req, res) => {
  try {
    const vendor = new Vendor(req.body);
    await vendor.save();
    res.status(201).json(vendor);
  } catch (error) {
    res.status(400).json({ message: 'Error creating vendor', error: error.message });
  }
};

exports.updateVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    res.status(200).json(vendor);
  } catch (error) {
    res.status(400).json({ message: 'Error updating vendor', error: error.message });
  }
};

exports.deleteVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndDelete(req.params.id);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    res.status(200).json({ message: 'Vendor deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting vendor', error: error.message });
  }
};

// Purchase Order Controllers
exports.getPurchaseOrders = async (req, res) => {
  try {
    const { status, type } = req.query;
    let query = {};
    if (status) {
      query.status = status;
    }
    if (type === 'recent') {
      query.status = { $in: ['completed', 'in-transit', 'approved'] };
    }
    const purchaseOrders = await PurchaseOrder.find(query)
      .populate({
        path: 'vendor',
        select: 'vendorName contactInfo',
        strictPopulate: false
      })
      .sort({ date: -1 })
      .lean();
    res.status(200).json(purchaseOrders);
  } catch (error) {
    console.error('Error in getPurchaseOrders:', error);
    res.status(500).json({ message: 'Error fetching purchase orders', error: error.message });
  }
};

exports.createPurchaseOrder = async (req, res) => {
  try {
    const purchaseOrder = new PurchaseOrder(req.body);
    await purchaseOrder.save();
    const populatedPO = await PurchaseOrder.findById(purchaseOrder._id)
      .populate('vendor', 'vendorName contactInfo');
    res.status(201).json(populatedPO);
  } catch (error) {
    res.status(400).json({ message: 'Error creating purchase order', error: error.message });
  }
};

exports.updatePurchaseOrder = async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('vendor', 'vendorName contactInfo');
    if (!purchaseOrder) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }
    res.status(200).json(purchaseOrder);
  } catch (error) {
    res.status(400).json({ message: 'Error updating purchase order', error: error.message });
  }
};

exports.deletePurchaseOrder = async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.findByIdAndDelete(req.params.id);
    if (!purchaseOrder) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }
    res.status(200).json({ message: 'Purchase order deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting purchase order', error: error.message });
  }
};