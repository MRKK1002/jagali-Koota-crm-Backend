const mongoose = require('mongoose');

const workOrderSchema = new mongoose.Schema({
  workOrderNumber: { type: String, unique: true },
  taskName: { type: String, required: true },
  taskType: { type: String, required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  assignedTo: { type: String, required: true },
  dueDate: { type: Date, required: true },
  estimatedHours: { type: Number, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  rate: { type: Number, required: true },
  totalValue: { type: Number },
  status: { type: String, enum: ['pending', 'in-progress', 'completed', 'billed'], default: 'pending' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  description: { type: String },
  notes: { type: String },
  materials: { type: String },
  location: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  completedDate: { type: Date },
});

workOrderSchema.pre('save', async function (next) {
  if (this.isNew) {
    const count = await mongoose.model('WorkOrder').countDocuments();
    this.workOrderNumber = `WO-${(count + 1).toString().padStart(4, '0')}`;
    this.totalValue = this.quantity * this.rate;
  }
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('WorkOrder', workOrderSchema);