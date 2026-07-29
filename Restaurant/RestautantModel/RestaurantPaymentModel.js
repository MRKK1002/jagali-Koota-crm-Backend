const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  paymentNumber: {
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
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RestaurantInvoice",
    required: true
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ResSupplier"
  },
  supplierName: String,
  
  // Payment details
  paymentDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'Card', 'NEFT', 'RTGS'],
    required: true
  },
  
  // Amounts
  invoiceAmount: { type: Number, required: true },
  paidAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Payment type
  paymentType: {
    type: String,
    enum: ['Full', 'Partial'],
    required: true
  },
  
  // Additional info
  reference: String, // Cheque number, transaction ID, etc.
  bankName: String,
  chequeNumber: String,
  transactionId: String,
  notes: String,
  
  // Status
  status: {
    type: String,
    enum: ['Pending', 'Cleared', 'Bounced'],
    default: 'Cleared'
  }
}, { timestamps: true });

// Static method to generate payment number
paymentSchema.statics.generatePaymentNumber = async function() {
  const count = await this.countDocuments();
  return `PAY-${String(count + 1).padStart(4, '0')}`;
};

// Pre-save middleware to auto-generate payment number
paymentSchema.pre('save', async function(next) {
  if (!this.paymentNumber) {
    this.paymentNumber = await this.constructor.generatePaymentNumber();
  }
  next();
});

module.exports = mongoose.model('RestaurantPayment', paymentSchema, 'restaurantpayments');
