const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema({
  clientName: { type: String, required: true },
  contactEmail: { type: String, required: true, unique: true },
  contactPhone: { type: String },
  address: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Client", clientSchema);
