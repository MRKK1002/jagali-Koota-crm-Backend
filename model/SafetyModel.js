const mongoose = require('mongoose');

const safetyIncidentSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  site: { type: String, required: true },
  type: { type: String, required: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ['Resolved', 'Under Review', 'Open'], default: 'Open' },
  severity: { type: String, enum: ['Low', 'Medium', 'High'], required: true },
  avatar: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('SafetyIncident', safetyIncidentSchema);