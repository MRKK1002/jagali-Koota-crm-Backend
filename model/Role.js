// [nodemon] starting `node server.js`
// 🔌 Attempting to connect to MongoDB...
// Supplier model defined
// Supplier model defined
// Restaurant Supplier Controller loaded: {
//   createSupplier: 'function',
//   getAllSuppliers: 'function',
//   getSupplierById: 'function',
//   updateSupplier: 'function',
//   deleteSupplier: 'function'
// }
// ✓ Restaurant Supplier routes registered successfully
// ✓ Restaurant Supplier Routes loaded: function
// PurchaseOrder model loaded: {
//   modelName: 'RestaurantPurchaseOrder',
//   collectionName: 'restaurantpurchaseorders',
//   schemaPaths: [
//     'purchaseOrderId',  'invoiceNumber',
//     'supplierId',       'supplierName',
//     'branch.id',        'branch.name',
//     'branch.address',   'categoryId',
//     'categoryName',     'storeLocationId',
//     'storeLocation.id', 'storeLocation.name',
//     'storeType',        'orderDate',
//     'deliveryDate',     'status',
//     'deliveryStatus',   'deliveryPercentage',
//     'paymentStatus',    'paidAmount',
//     'pendingAmount',    'paymentPercentage',
//     'items',            'subtotal',
//     'tax',              'total',
//     'notes',            'paymentTerms',
//     'taxRate',          'grnGenerated',
//     'grnDate',          'grns',
//     'invoices',         'payments',
//     '_id',              'createdAt',
//     'updatedAt',        '__v'
//   ]
// }
// ✓ Restaurant Purchase Routes loaded: function
// ✓ Restaurant Invoice Routes loaded: function
// ✓ Restaurant Payment Routes loaded: function
// ✓ Restaurant Invoice routes registered at /api/v1/restaurant/invoice
// ✓ Restaurant Payment routes registered at /api/v1/restaurant/payment
// ✓ Restaurant Supplier routes registered at /api/v1/restaurant/supplier
// ✓ User management routes registered at /api/users
// C:\Users\Dell\Desktop\hotelvirat\crm_backend\server.js:601
// app.use("/api/v1/config/roles", roleRoutes);
//                                 ^

// ReferenceError: roleRoutes is not defined
//     at Object.<anonymous> (C:\Users\Dell\Desktop\hotelvirat\crm_backend\server.js:601:33)
//     at Module._compile (node:internal/modules/cjs/loader:1706:14)
//     at Object..js (node:internal/modules/cjs/loader:1839:10)
//     at Module.load (node:internal/modules/cjs/loader:1441:32)
//     at Function._load (node:internal/modules/cjs/loader:1263:12)
//     at TracingChannel.traceSync (node:diagnostics_channel:322:14)
//     at wrapModuleLoad (node:internal/modules/cjs/loader:237:24)
//     at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:171:5)
//     at node:internal/main/run_main_module:36:49

// Node.js v22.20.0
// [nodemon] app crashed - waiting for file changes before starting...
// const mongoose = require("mongoose");

// const roleSchema = new mongoose.Schema(
//   {
//     name: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     value: {
//       type: String,
//       required: true,
//       unique: true,
//       trim: true,
//       lowercase: true,
//     },
//     description: {
//       type: String,
//       trim: true,
//     },
//     type: {
//       type: String,
//       enum: ["common", "restaurant", "construction"],
//       required: true,
//     },
//     isDefault: {
//       type: Boolean,
//       default: false,
//     },
//     status: {
//       type: String,
//       enum: ["active", "inactive"],
//       default: "active",
//     },
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("Role", roleSchema);
