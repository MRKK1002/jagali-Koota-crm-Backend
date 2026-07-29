const mongoose = require('mongoose');

const kitchenDisplayOrderSchema = new mongoose.Schema({
  // Order Source & Branch Information
  orderSource: {
    type: String,
    enum: ['dine-in', 'counter', 'online', 'takeaway'],
    required: true,
    index: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true,
    index: true
  },
  branchName: {
    type: String,
    required: true
  },
  
  // Original Order Reference (for tracking back to source)
  originalOrderId: {
    type: String,
    required: true,
    index: true
  },
  originalOrderType: {
    type: String,
    enum: ['staff-order', 'counter-order', 'online-order'],
    required: true
  },
  
  // Order Details
  orderNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  orderDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Table/Counter/Customer Information
  tableNumber: {
    type: String,
    default: 'N/A'
  },
  customerName: {
    type: String,
    required: true
  },
  customerContact: {
    type: String
  },
  peopleCount: {
    type: Number,
    default: 1
  },
  
  // Kitchen Workflow Status
  orderStatus: {
    type: String,
    enum: ['pending', 'acknowledged', 'preparing', 'ready', 'served', 'delivered', 'completed', 'cancelled', 'on-hold'],
    default: 'pending',
    required: true,
    index: true
  },
  
  // Priority & Timing
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent', 'VIP'],
    default: 'normal',
    index: true
  },
  estimatedPrepTime: {
    type: Number, // in minutes
    default: 20
  },
  actualPrepTime: {
    type: Number // calculated when completed
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  acknowledgedAt: {
    type: Date
  },
  startedAt: {
    type: Date
  },
  readyAt: {
    type: Date
  },
  servedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  
  // Kitchen Station Assignment
  assignedStation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'KitchenStation'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  
  // Order Items
  items: [{
    menuItemId: mongoose.Schema.Types.ObjectId,
    name: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      default: 1
    },
    price: {
      type: Number,
      required: true
    },
    category: {
      type: String
    },
    cookingStation: {
      type: String // e.g., 'Tandoor', 'Chinese', 'Bar', 'Main Kitchen'
    },
    specialInstructions: {
      type: String
    },
    status: {
      type: String,
      enum: ['pending', 'preparing', 'ready', 'served', 'remake', 'cancelled'],
      default: 'pending'
    },
    startedAt: Date,
    readyAt: Date,
    delayWarningAt: Date,
    prepStartTime: Date,
    prepEndTime: Date
  }],
  
  // Notifications & Alerts
  notifications: [{
    type: {
      type: String,
      enum: ['delay-warning', 'item-ready', 'chef-acknowledge', 'order-complete', 'order-cancelled'],
      required: true
    },
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    read: {
      type: Boolean,
      default: false
    }
  }],
  
  // Payment & Billing
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'partial'],
    default: 'pending'
  },
  subtotal: {
    type: Number,
    required: true
  },
  tax: {
    type: Number,
    default: 0
  },
  serviceCharge: {
    type: Number,
    default: 0
  },
  grandTotal: {
    type: Number,
    required: true
  },
  
  // Additional Features
  tags: [String], // e.g., ['VIP', 'Rush', 'Special']
  notes: String,
  
  // KOT Printing
  kotPrinted: {
    type: Boolean,
    default: false
  },
  kotPrintedAt: Date,
  kotPrintCount: {
    type: Number,
    default: 0
  },
  
  // Hold & Cancel Reason
  holdReason: String,
  cancelReason: String,
  
  // Performance Metrics
  averageItemPrepTime: Number,
  efficiencyScore: Number,
  
  // Audit Trail
  lastStatusChange: Date,
  statusHistory: [{
    status: String,
    changedAt: Date,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    reason: String
  }]
}, {
  timestamps: true
});

// Indexes for efficient querying
kitchenDisplayOrderSchema.index({ branchId: 1, orderStatus: 1, createdAt: -1 });
kitchenDisplayOrderSchema.index({ orderDate: -1 });
kitchenDisplayOrderSchema.index({ priority: 1, orderStatus: 1 });
kitchenDisplayOrderSchema.index({ assignedStation: 1, orderStatus: 1 });

// Pre-save middleware to calculate times
kitchenDisplayOrderSchema.pre('save', function(next) {
  // Calculate actual prep time when completed
  if (this.isModified('orderStatus') && this.orderStatus === 'completed' && this.startedAt) {
    this.actualPrepTime = Math.round((new Date() - this.startedAt) / 60000); // minutes
  }
  next();
});

module.exports = mongoose.model('KitchenDisplayOrder', kitchenDisplayOrderSchema);


