const SalesOrder = require('../model/SalesOrder');

// Controller functions
exports.getAllSalesOrders = async (req, res) => {
    try {
        const salesOrders = await SalesOrder.find();
        res.status(200).json(salesOrders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createSalesOrder = async (req, res) => {
    try {
        const newSalesOrder = new SalesOrder(req.body);
        await newSalesOrder.save();
        res.status(201).json(newSalesOrder);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.getSalesOrderById = async (req, res) => {
    try {
        const salesOrder = await SalesOrder.findById(req.params.id);
        if (!salesOrder) {
            return res.status(404).json({ message: 'Sales order not found' });
        }
        res.status(200).json(salesOrder);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateSalesOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedSalesOrder = await SalesOrder.findByIdAndUpdate(id, req.body, { new: true });
        if (!updatedSalesOrder) {
            return res.status(404).json({ message: 'Sales order not found' });
        }
        res.status(200).json(updatedSalesOrder);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.deleteSalesOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedSalesOrder = await SalesOrder.findByIdAndDelete(id);
        if (!deletedSalesOrder) {
            return res.status(404).json({ message: 'Sales order not found' });
        }
        res.status(200).json({ message: 'Sales order deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
