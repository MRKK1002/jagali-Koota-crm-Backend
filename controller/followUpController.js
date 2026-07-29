const FollowUp = require("../model/FollowUp");

// Create a follow-up
exports.createFollowUp = async (req, res) => {
  try {
    const followUp = new FollowUp(req.body);
    await followUp.save();
    res.status(201).json(followUp);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all follow-ups
exports.getFollowUps = async (req, res) => {
  try {
    const followUps = await FollowUp.find().populate("customerId");
    res.json(followUps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get follow-up by ID
exports.getFollowUpById = async (req, res) => {
  try {
    const followUp = await FollowUp.findById(req.params.id).populate("customerId");
    if (!followUp) return res.status(404).json({ message: "Follow-up not found" });
    res.json(followUp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update follow-up
exports.updateFollowUp = async (req, res) => {
  try {
    const updated = await FollowUp.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: "Follow-up not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete follow-up
exports.deleteFollowUp = async (req, res) => {
  try {
    const deleted = await FollowUp.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Follow-up not found" });
    res.json({ message: "Follow-up deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
