const Communication = require("../model/Communication");

// Create Communication
exports.createCommunication = async (req, res) => {
  try {
    const communication = new Communication(req.body);
    await communication.save();
    res.status(201).json(communication);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all Communications
exports.getCommunications = async (req, res) => {
  try {
    const comms = await Communication.find().populate("customerId");
    res.json(comms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get Communication by ID
exports.getCommunicationById = async (req, res) => {
  try {
    const comm = await Communication.findById(req.params.id).populate("customerId");
    if (!comm) return res.status(404).json({ message: "Communication not found" });
    res.json(comm);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update Communication
exports.updateCommunication = async (req, res) => {
  try {
    const updated = await Communication.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: "Communication not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete Communication
exports.deleteCommunication = async (req, res) => {
  try {
    const deleted = await Communication.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Communication not found" });
    res.json({ message: "Communication deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
