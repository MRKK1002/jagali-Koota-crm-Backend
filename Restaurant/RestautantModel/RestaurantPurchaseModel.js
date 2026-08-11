const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
  name: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RawMaterial", // Changed from "Material" to "RawMaterial" to match the actual model name
    required: true
  },
  quantity: { type: Number, required: true },
  receivedQty: { type: Number, default: 0 }, // Track received quantity
  unit: { type: String, required: true },
  rate: { type: Number, required: true },
  // Per-item tax percentage — each raw material can carry a different rate.
  // `amount` is stored inclusive of this tax: (qty * rate) + tax.
  tax: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  amount: { type: Number, required: true },
});

const purchaseOrdersSchema = new mongoose.Schema(
  {
    purchaseOrderId: { type: String, unique: true },
    invoiceNumber: { 
      type: String, 
      unique: true,
      sparse: true // This allows multiple null values but ensures unique invoice numbers
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ResSupplier",
      required: false
    },
    supplierName: { type: String },
    branch: {
      id: {
        type: String,
        required: true
      },
      name: {
        type: String,
        required: true
      },
      address: {
        type: String,
        required: true
      }
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Categoryy",
      required: false // Made optional since category is removed from frontend
    },
    categoryName: { type: String, default: "" },
    storeLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StoreLocation",
      required: false
    },
    storeLocation: {
      id: { type: String },
      name: { type: String }
    },
    storeType: { type: String }, // For backward compatibility
    orderDate: { type: Date, required: true },
    deliveryDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["Pending", "Approved", "In Transit", "Delivered", "Cancelled"],
      default: "Pending",
    },
    
    // Delivery Status Tracking
    deliveryStatus: {
      type: String,
      enum: ["Pending", "Partially Received", "Fully Received"],
      default: "Pending"
    },
    deliveryPercentage: { type: Number, default: 0 },
    
    // Payment Status Tracking
    paymentStatus: {
      type: String,
      enum: ["Pending", "Partial", "Paid"],
      default: "Pending"
    },
    paidAmount: { type: Number, default: 0 },
    pendingAmount: { type: Number, default: 0 },
    paymentPercentage: { type: Number, default: 0 },
    items: [itemSchema],
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    notes: { type: String, default: "" },
    paymentTerms: { type: String, default: "None" },
    taxRate: { type: Number, default: 0 }, // Add this field for tax rate
    grnGenerated: { type: Boolean, default: false },
    grnDate: { type: Date, default: null },
    
    // References to related documents
    grns: [{ type: mongoose.Schema.Types.ObjectId, ref: "GRN" }],
    invoices: [{ type: mongoose.Schema.Types.ObjectId, ref: "Invoice" }],
    payments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Payment" }],
  },
  { timestamps: true }
);

// Method to update delivery status based on received quantities
purchaseOrdersSchema.methods.updateDeliveryStatus = function() {
  let totalOrdered = 0;
  let totalReceived = 0;
  
  this.items.forEach(item => {
    totalOrdered += item.quantity;
    totalReceived += item.receivedQty || 0;
  });
  
  this.deliveryPercentage = totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : 0;
  
  if (this.deliveryPercentage === 0) {
    this.deliveryStatus = "Pending";
  } else if (this.deliveryPercentage >= 100) {
    this.deliveryStatus = "Fully Received";
  } else {
    this.deliveryStatus = "Partially Received";
  }
};

// Method to update payment status
purchaseOrdersSchema.methods.updatePaymentStatus = function() {
  this.pendingAmount = this.total - this.paidAmount;
  this.paymentPercentage = this.total > 0 ? (this.paidAmount / this.total) * 100 : 0;
  
  if (this.paidAmount === 0) {
    this.paymentStatus = "Pending";
  } else if (this.paidAmount >= this.total) {
    this.paymentStatus = "Paid";
  } else {
    this.paymentStatus = "Partial";
  }
};

// Middleware to auto-generate purchaseOrderId
purchaseOrdersSchema.pre("save", async function (next) {
  if (!this.purchaseOrderId) {
    const lastPurchaseOrder = await mongoose
      .model("RestaurantPurchaseOrder")
      .findOne()
      .sort({ createdAt: -1 });
    
    let newId = "PO-001";

    if (lastPurchaseOrder && lastPurchaseOrder.purchaseOrderId) {
      const lastIdNumber = parseInt(lastPurchaseOrder.purchaseOrderId.split('-')[1]);
      newId = `PO-${String(lastIdNumber + 1).padStart(3, "0")}`;
    }

    this.purchaseOrderId = newId;
  }
  
  // Auto-generate invoice number if not provided
  if (!this.invoiceNumber) {
    const lastInvoice = await mongoose
      .model("RestaurantPurchaseOrder")
      .findOne({ invoiceNumber: /^INV-\d+$/ })
      .sort({ createdAt: -1 });
    
    let newInvoiceNumber = "INV-00001";

    if (lastInvoice && lastInvoice.invoiceNumber) {
      const lastInvNumber = parseInt(lastInvoice.invoiceNumber.split('-')[1]);
      if (!isNaN(lastInvNumber)) {
        newInvoiceNumber = `INV-${String(lastInvNumber + 1).padStart(5, "0")}`;
      }
    }

    this.invoiceNumber = newInvoiceNumber;
  }
  
  next();
});

// Prevent model overwrite error - Use unique model name for Restaurant
// Delete existing model if it exists to force recompilation
if (mongoose.models.RestaurantPurchaseOrder) {
  delete mongoose.models.RestaurantPurchaseOrder;
  if (mongoose.modelSchemas && mongoose.modelSchemas.RestaurantPurchaseOrder) {
    delete mongoose.modelSchemas.RestaurantPurchaseOrder;
  }
}

// Method to update payment status based on paid amount
purchaseOrdersSchema.methods.updatePaymentStatus = function() {
  const totalAmount = this.total || 0; // Use 'total' field, not 'totalAmount'
  const paidAmount = this.paidAmount || 0;
  
  // Use small tolerance for floating-point comparison (0.01 = 1 paisa)
  const tolerance = 0.01;
  
  // Calculate payment percentage
  this.paymentPercentage = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
  
  // Update payment status
  if (paidAmount < tolerance) {
    this.paymentStatus = 'Pending';
  } else if (paidAmount >= (totalAmount - tolerance)) {
    this.paymentStatus = 'Paid';
    this.paymentPercentage = 100; // Ensure it's exactly 100
  } else {
    this.paymentStatus = 'Partial';
  }
  
  // Update pending amount
  this.pendingAmount = Math.max(0, totalAmount - paidAmount);
};

module.exports = mongoose.model("RestaurantPurchaseOrder", purchaseOrdersSchema);