const mongoose = require('mongoose');

const paymentsSchema = new mongoose.Schema({
  paymentNumber: { type: String, unique: true },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'invoices', required: true },
  amount: { type: Number, required: true },
  paymentDate: { type: Date, required: true },
  paymentMethod: { type: String, required: true },
  referenceNumber: { type: String },
  remarks: { type: String },
  status: { type: String, enum: ['Pending', 'Received', 'Failed'], default: 'Received' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

paymentsSchema.pre('save', async function (next) {
  if (this.isNew) {
    const count = await mongoose.model('Payments').countDocuments();
    this.paymentNumber = `PAY-${(count + 1).toString().padStart(4, '0')}`;
  }
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Payments', paymentsSchema);
