const Contract = require("../model/Contract");

// Create Contract
exports.createContract = async (req, res) => {
  try {
    const contract = new Contract(req.body);
    await contract.save();
    res.status(201).json(contract);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all Contracts
exports.getContracts = async (req, res) => {
  try {
    const contracts = await Contract.find().populate("customerId");
    res.json(contracts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get Contract by ID
exports.getContractById = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id).populate("customerId");
    if (!contract) return res.status(404).json({ message: "Contract not found" });
    res.json(contract);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update Contract
exports.updateContract = async (req, res) => {
  try {
    const updated = await Contract.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: "Contract not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete Contract
exports.deleteContract = async (req, res) => {
  try {
    const deleted = await Contract.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Contract not found" });
    res.json({ message: "Contract deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
