const SafetyIncident = require('../model/SafetyModel');

// Get all incidents
exports.getAllIncidents = async (req, res) => {
  try {
    const incidents = await SafetyIncident.find().populate('employeeId');
    res.json(incidents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create new incident
exports.createIncident = async (req, res) => {
  try {
    const incident = new SafetyIncident(req.body);
    await incident.save();
    res.status(201).json(incident);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get single incident
exports.getIncident = async (req, res) => {
  try {
    const incident = await SafetyIncident.findById(req.params.id).populate('employeeId');
    if (!incident) return res.status(404).json({ error: 'Not found' });
    res.json(incident);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update incident
exports.updateIncident = async (req, res) => {
  try {
    const incident = await SafetyIncident.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!incident) return res.status(404).json({ error: 'Not found' });
    res.json(incident);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete incident
exports.deleteIncident = async (req, res) => {
  try {
    const incident = await SafetyIncident.findByIdAndDelete(req.params.id);
    if (!incident) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};