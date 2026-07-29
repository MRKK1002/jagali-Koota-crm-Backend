const mongoose = require("mongoose");

const consumptionLogSchema = new mongoose.Schema({
  department: { type: String, required: true },
  branch: { type: String, required: true },
  orderId: { type: String, default: null },
  orderNumber: { type: String, default: null },
  items: [{
    productName: String,
    quantity: Number,
    unit: String,
    menuItem: String,
  }],
  deductedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.models.ConsumptionLog || mongoose.model("ConsumptionLog", consumptionLogSchema);
