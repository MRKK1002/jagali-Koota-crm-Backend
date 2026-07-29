// models/GoodsReceiptNote.js
// Model compatible with local frontend GRN creation (saving optional)

const mongoose = require('mongoose');

const grnItemSchema = new mongoose.Schema({
  product: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  receivedQty: {
    type: Number,
    default: 0,
    min: 0
  },
  rejectedQty: {
    type: Number,
    default: 0,
    min: 0
  },
  acceptedQty: {
    type: Number,
    default: 0,
    min: 0
  },
  rate: {
    type: Number,
    required: true,
    min: 0
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    default: 'pcs'
  },
  gstRate: {
    type: Number,
    default: 0, 
    min: 0,
    max: 100
  },
  supplier: String,
  branch: String,
  category: String,
  poNumber: String,
  storeType: {
    type: String,
    default: 'Main Store',
    trim: true
  },
  consumedQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  availableQuantity: {
    type: Number,
    default: 0,
    min: 0
  }
}, { _id: false });

const goodsReceiptNoteSchema = new mongoose.Schema({
  grnNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  supplier: {
    type: String, // Can be ID or name based on frontend
    required: true
  },
  branch: {
    type: String, // Can be ID or name based on frontend
    required: true
  },
  items: [grnItemSchema],
  totalQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  taxRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  totalTax: {
    type: Number,
    required: true,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['Pending', 'Received', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  notes: {
    type: String,
    default: ''
  },
  supplierId: String, // Additional field for frontend compatibility
  branchId: String,   // Additional field for frontend compatibility
  poId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RestaurantPurchaseOrder', // Fixed: use correct model name
    required: false
  },
  poNumber: String, // PO Number for display
  storeType: {
    type: String,
    default: 'Main Store',
    trim: true
  },
  receivedBy: String,
  createdBy: {
    type: String,
    default: 'System'
  },
  approvedBy: String,
  approvedAt: Date,
  rejectionReason: String
}, {
  timestamps: true
});

// Indexes for better query performance
goodsReceiptNoteSchema.index({ supplier: 1 });
goodsReceiptNoteSchema.index({ branch: 1 });
goodsReceiptNoteSchema.index({ status: 1 });
goodsReceiptNoteSchema.index({ createdAt: -1 });
goodsReceiptNoteSchema.index({ poId: 1 });
goodsReceiptNoteSchema.index({ storeType: 1 });
goodsReceiptNoteSchema.index({ notes: 1 }); // For filtering frontend GRNs (if needed later)

// Virtual for total value calculation
goodsReceiptNoteSchema.virtual('totalValue').get(function() {
  return this.totalAmount;
});

// Pre-save middleware to calculate totals if not provided
goodsReceiptNoteSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    // Calculate totalQuantity if not provided
    if (!this.totalQuantity) {
      this.totalQuantity = this.items.reduce((sum, item) => sum + item.quantity, 0);
    }
    
    // Calculate totalTax if not provided
    if (!this.totalTax) {
      this.totalTax = this.items.reduce((sum, item) => {
        const itemTax = (item.amount * item.gstRate) / 100;
        return sum + itemTax;
      }, 0);
    }
    
    // Calculate totalAmount if not provided (base amount + tax)
    if (!this.totalAmount) {
      const baseAmount = this.items.reduce((sum, item) => sum + item.amount, 0);
      this.totalAmount = baseAmount + this.totalTax;
    }
  }
  next();
});

// Static method to generate GRN number
goodsReceiptNoteSchema.statics.generateGRNNumber = async function() {
  const count = await this.countDocuments();
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
  return `GRN-${year}${month}-${String(count + 1).padStart(4, '0')}`;
};

// Instance method to approve GRN
goodsReceiptNoteSchema.methods.approve = function(approvedBy) {
  this.status = 'Approved';
  this.approvedBy = approvedBy;
  this.approvedAt = new Date();
  return this.save();
};

// Instance method to reject GRN
goodsReceiptNoteSchema.methods.reject = function(rejectionReason, rejectedBy) {
  this.status = 'Rejected';
  this.rejectionReason = rejectionReason;
  this.approvedBy = rejectedBy; // Track who rejected it
  this.approvedAt = new Date();
  return this.save();
};

const GoodsReceiptNote = mongoose.model('GoodsReceiptNote', goodsReceiptNoteSchema);

module.exports = GoodsReceiptNote;