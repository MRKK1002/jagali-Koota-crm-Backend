const mongoose = require('mongoose');

const workOrderSchema = new mongoose.Schema({
  workOrderNumber: {
    type: String,
    unique: true,
    required: true
  },
  taskName: {
    type: String,
    required: true
  },
  taskType: {
    type: String,
    required: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  assignedTo: {
    type: String,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  estimatedHours: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  unit: {
    type: String,
    required: true
  },
  rate: {
    type: Number,
    required: true
  },
  totalValue: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    default: 'pending',
    enum: ['pending', 'in-progress', 'completed', 'billed']
  },
  priority: {
    type: String,
    default: 'medium',
    enum: ['low', 'medium', 'high']
  },
  description: {
    type: String
  },
  notes: {
    type: String
  },
  materials: {
    type: String
  },
  location: {
    type: String
  },
  completedDate: {
    type: Date
  },
  totalCost: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// ✅ Auto calculate values
workOrderSchema.pre('save', function(next) {
  this.totalValue = this.quantity * this.rate;
  this.totalCost = this.totalValue;  
  next();
});

// ✅ Prevent OverwriteModelError
const WorkOrder = mongoose.models.WorkOrder || mongoose.model('WorkOrder', workOrderSchema);

module.exports = WorkOrder;
