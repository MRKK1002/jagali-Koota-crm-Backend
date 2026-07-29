const mongoose = require('mongoose');

const invoicesSchema = new mongoose.Schema({
  invoiceNumber: { type: String, unique: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  workOrderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'WorkOrder' }],
  totalAmount: { type: Number },
  outstandingAmount: { type: Number },
  invoiceDate: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  paymentStatus: { type: String, enum: ['Draft', 'Pending', 'Paid', 'Overdue'], default: 'Draft' },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

invoicesSchema.pre('save', async function (next) {
  if (this.isNew) {
    const count = await mongoose.model('invoices').countDocuments();
    this.invoiceNumber = `INV-${(count + 1).toString().padStart(4, '0')}`;
    this.outstandingAmount = this.totalAmount;
  }
  this.updatedAt = Date.now();
  next();
});

// invoiceNumber index is automatically created by unique: true constraint

module.exports = mongoose.model('invoices', invoicesSchema);
