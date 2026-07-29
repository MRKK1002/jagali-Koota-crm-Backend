const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RawMaterial"
  },
  name: String,
  quantity: Number,
  rate: Number,
  amount: Number,
  unit: String
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    unique: true,
    required: true
  },
  
  // References
  purchaseOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RestaurantPurchaseOrder",
    required: true
  },
  grn: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "GoodsReceiptNote"
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ResSupplier"
  },
  supplierName: String,
  
  // Dates
  invoiceDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  dueDate: Date,
  
  // Items
  items: [invoiceItemSchema],
  
  // Amounts
  subtotal: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  
  // Payment tracking
  paymentStatus: {
    type: String,
    enum: ['Unpaid', 'Partially Paid', 'Paid'],
    default: 'Unpaid'
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  pendingAmount: { type: Number, default: 0 },
  
  // References
  payments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "RestaurantPayment"
  }],
  
  notes: String
}, { timestamps: true });

// Auto-generate invoice number
invoiceSchema.pre('save', function(next) {
  // Calculate pending amount
  this.pendingAmount = this.totalAmount - this.paidAmount;
  next();
});

// Method to update payment status based on paid amount
invoiceSchema.methods.updatePaymentStatus = function() {
  const totalAmount = this.totalAmount || 0;
  const paidAmount = this.paidAmount || 0;
  
  // Use small tolerance for floating-point comparison (0.01 = 1 paisa)
  const tolerance = 0.01;
  
  if (paidAmount < tolerance) {
    this.paymentStatus = 'Unpaid';
  } else if (paidAmount >= (totalAmount - tolerance)) {
    this.paymentStatus = 'Paid';
  } else {
    this.paymentStatus = 'Partially Paid';
  }
  
  // Update pending amount
  this.pendingAmount = totalAmount - paidAmount;
};

// Static method to generate invoice number
invoiceSchema.statics.generateInvoiceNumber = async function() {
  // Find the latest invoice number
  const latestInvoice = await this.findOne()
    .sort({ createdAt: -1 })
    .select('invoiceNumber');
  
  let startNumber = 1;
  
  if (latestInvoice && latestInvoice.invoiceNumber) {
    // Extract the number from the invoice number (e.g., "INV-0003" -> 3)
    const match = latestInvoice.invoiceNumber.match(/INV-(\d+)/);
    if (match) {
      startNumber = parseInt(match[1], 10) + 1;
    }
  }
  
  // Keep trying until we find an available invoice number
  let attempts = 0;
  const maxAttempts = 100;
  
  while (attempts < maxAttempts) {
    const invoiceNumber = `INV-${String(startNumber).padStart(4, '0')}`;
    
    // Check if this invoice number already exists
    const existing = await this.findOne({ invoiceNumber });
    
    if (!existing) {
      return invoiceNumber;
    }
    
    startNumber++;
    attempts++;
  }
  
  // Fallback: use timestamp if we can't find an available number
  return `INV-${Date.now()}`;
};

// Method to update payment status
invoiceSchema.methods.updatePaymentStatus = function() {
  if (this.paidAmount === 0) {
    this.paymentStatus = 'Unpaid';
  } else if (this.paidAmount >= this.totalAmount) {
    this.paymentStatus = 'Paid';
  } else {
    this.paymentStatus = 'Partially Paid';
  }
};

module.exports = mongoose.model('RestaurantInvoice', invoiceSchema, 'restaurantinvoices');
