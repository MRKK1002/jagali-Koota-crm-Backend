/**
 * Test Data for Purchase Management Routes
 * 
 * This file contains sample data to test all Purchase Management functionality:
 * - Suppliers/Vendors
 * - Purchase Orders (POs)
 * - Goods Receipt Notes (GRN)
 * - Store Locations
 * - Raw Materials (for POs and GRNs)
 * 
 * Usage:
 * 1. Use these as API request bodies for POST requests
 * 2. Or import and use in a seed script
 */

// ============================================
// 1. STORE LOCATIONS
// ============================================
const storeLocations = [
  {
    name: "Main Store",
    address: "123 Restaurant Street, City, State 12345",
    manager: "John Manager",
    contact: "9876543210"
  },
  {
    name: "Kitchen Store",
    address: "456 Kitchen Avenue, City, State 12345",
    manager: "Jane Kitchen",
    contact: "9876543211"
  },
  {
    name: "Cold Storage",
    address: "789 Storage Road, City, State 12345",
    manager: "Bob Storage",
    contact: "9876543212"
  }
];

// ============================================
// 2. RAW MATERIALS (for testing POs and GRNs)
// ============================================
const rawMaterials = [
  {
    name: "Tomatoes",
    category: "Vegetables",
    unit: "kg",
    minLevel: 10,
    description: "Fresh red tomatoes"
  },
  {
    name: "Cheese",
    category: "Dairy",
    unit: "kg",
    minLevel: 5,
    description: "Mozzarella cheese"
  },
  {
    name: "Flour",
    category: "Grains",
    unit: "kg",
    minLevel: 20,
    description: "All-purpose flour"
  },
  {
    name: "Onions",
    category: "Vegetables",
    unit: "kg",
    minLevel: 15,
    description: "Fresh onions"
  },
  {
    name: "Chicken",
    category: "Meat",
    unit: "kg",
    minLevel: 8,
    description: "Fresh chicken"
  },
  {
    name: "Rice",
    category: "Grains",
    unit: "kg",
    minLevel: 25,
    description: "Basmati rice"
  },
  {
    name: "Oil",
    category: "Cooking",
    unit: "liters",
    minLevel: 10,
    description: "Cooking oil"
  },
  {
    name: "Spices Mix",
    category: "Spices",
    unit: "kg",
    minLevel: 2,
    description: "Mixed spices"
  }
];

// ============================================
// 3. SUPPLIERS/VENDORS
// ============================================
const suppliers = [
  {
    name: "Rajesh Kumar",
    companyName: "Fresh Vegetables Supply Co.",
    contact: "9876543210",
    email: "rajesh@freshveg.com",
    billingAddress: "123 Vegetable Market, City, State 12345",
    gst: "GST123456789",
    pan: "ABCDE1234F",
    branchId: "" // Add branch ID if needed
  },
  {
    name: "Mohan Dairy",
    companyName: "Mohan Dairy Products Ltd.",
    contact: "9876543211",
    email: "mohan@dairy.com",
    billingAddress: "456 Dairy Street, City, State 12345",
    gst: "GST987654321",
    pan: "FGHIJ5678K",
    branchId: ""
  },
  {
    name: "Grain Suppliers Inc",
    companyName: "Premium Grain Suppliers",
    contact: "9876543212",
    email: "grain@suppliers.com",
    billingAddress: "789 Grain Road, City, State 12345",
    gst: "GST456789123",
    pan: "LMNOP9012Q",
    branchId: ""
  },
  {
    name: "Meat & Poultry Co",
    companyName: "Fresh Meat Suppliers",
    contact: "9876543213",
    email: "meat@suppliers.com",
    billingAddress: "321 Meat Avenue, City, State 12345",
    gst: "GST789123456",
    pan: "RSTUV3456W",
    branchId: ""
  },
  {
    name: "Spice World",
    companyName: "Spice World Trading",
    contact: "9876543214",
    email: "spice@world.com",
    billingAddress: "654 Spice Lane, City, State 12345",
    gst: "GST321654987",
    pan: "XYZAB7890C",
    branchId: ""
  }
];

// ============================================
// 4. PURCHASE ORDERS
// ============================================
// Note: You'll need to replace ObjectIds with actual IDs from your database
const purchaseOrders = [
  {
    supplierId: "", // Replace with actual supplier ID
    supplierName: "Fresh Vegetables Supply Co.",
    branch: {
      id: "", // Replace with actual branch ID
      name: "Main Branch",
      address: "123 Restaurant Street, City, State 12345"
    },
    categoryId: "", // Replace with actual category ID
    categoryName: "Vegetables",
    storeLocationId: "", // Replace with actual store location ID (Main Store)
    storeLocation: {
      id: "",
      name: "Main Store"
    },
    storeType: "Main Store",
    orderDate: new Date().toISOString().split('T')[0],
    deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
    status: "Pending",
    paymentStatus: "Pending",
    items: [
      {
        name: "", // Replace with raw material ID (Tomatoes)
        quantity: 50,
        unit: "kg",
        rate: 40,
        amount: 2000
      },
      {
        name: "", // Replace with raw material ID (Onions)
        quantity: 30,
        unit: "kg",
        rate: 35,
        amount: 1050
      }
    ],
    subtotal: 3050,
    tax: 549, // 18% GST
    total: 3599,
    taxRate: 18,
    notes: "Urgent delivery required",
    paymentTerms: "Net 30"
  },
  {
    supplierId: "", // Replace with actual supplier ID
    supplierName: "Mohan Dairy Products Ltd.",
    branch: {
      id: "",
      name: "Main Branch",
      address: "123 Restaurant Street, City, State 12345"
    },
    categoryId: "",
    categoryName: "Dairy",
    storeLocationId: "", // Replace with actual store location ID (Cold Storage)
    storeLocation: {
      id: "",
      name: "Cold Storage"
    },
    storeType: "Cold Storage",
    orderDate: new Date().toISOString().split('T')[0],
    deliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: "In Transit",
    paymentStatus: "Pending",
    items: [
      {
        name: "", // Replace with raw material ID (Cheese)
        quantity: 20,
        unit: "kg",
        rate: 250,
        amount: 5000
      }
    ],
    subtotal: 5000,
    tax: 900,
    total: 5900,
    taxRate: 18,
    notes: "Keep refrigerated",
    paymentTerms: "Net 15"
  },
  {
    supplierId: "", // Replace with actual supplier ID
    supplierName: "Premium Grain Suppliers",
    branch: {
      id: "",
      name: "Main Branch",
      address: "123 Restaurant Street, City, State 12345"
    },
    categoryId: "",
    categoryName: "Grains",
    storeLocationId: "", // Replace with actual store location ID (Main Store)
    storeLocation: {
      id: "",
      name: "Main Store"
    },
    storeType: "Main Store",
    orderDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days ago
    deliveryDate: new Date().toISOString().split('T')[0], // Today
    status: "Delivered",
    paymentStatus: "Paid",
    items: [
      {
        name: "", // Replace with raw material ID (Flour)
        quantity: 100,
        unit: "kg",
        rate: 45,
        amount: 4500
      },
      {
        name: "", // Replace with raw material ID (Rice)
        quantity: 80,
        unit: "kg",
        rate: 60,
        amount: 4800
      }
    ],
    subtotal: 9300,
    tax: 1674,
    total: 10974,
    taxRate: 18,
    notes: "Delivered on time",
    paymentTerms: "Net 30"
  },
  {
    supplierId: "", // Replace with actual supplier ID
    supplierName: "Fresh Meat Suppliers",
    branch: {
      id: "",
      name: "Main Branch",
      address: "123 Restaurant Street, City, State 12345"
    },
    categoryId: "",
    categoryName: "Meat",
    storeLocationId: "", // Replace with actual store location ID (Cold Storage)
    storeLocation: {
      id: "",
      name: "Cold Storage"
    },
    storeType: "Cold Storage",
    orderDate: new Date().toISOString().split('T')[0],
    deliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: "Pending",
    paymentStatus: "Pending",
    items: [
      {
        name: "", // Replace with raw material ID (Chicken)
        quantity: 25,
        unit: "kg",
        rate: 180,
        amount: 4500
      }
    ],
    subtotal: 4500,
    tax: 810,
    total: 5310,
    taxRate: 18,
    notes: "Fresh delivery only",
    paymentTerms: "Cash on Delivery"
  }
];

// ============================================
// 5. GOODS RECEIPT NOTES (GRN)
// ============================================
const grns = [
  {
    supplier: "Fresh Vegetables Supply Co.",
    supplierId: "", // Replace with actual supplier ID
    branch: "Main Branch",
    branchId: "", // Replace with actual branch ID
    poId: "", // Replace with actual PO ID (link to first PO)
    storeType: "Main Store",
    items: [
      {
        product: "Tomatoes",
        description: "Fresh red tomatoes",
        quantity: 50,
        unit: "kg",
        rate: 40,
        amount: 2000,
        gstRate: 18,
        category: "Vegetables",
        storeType: "Main Store"
      },
      {
        product: "Onions",
        description: "Fresh onions",
        quantity: 30,
        unit: "kg",
        rate: 35,
        amount: 1050,
        gstRate: 18,
        category: "Vegetables",
        storeType: "Main Store"
      }
    ],
    totalQuantity: 80,
    totalTax: 549,
    totalAmount: 3599,
    status: "Pending",
    notes: "Items received in good condition",
    receivedBy: "Store Manager",
    createdBy: "System"
  },
  {
    supplier: "Mohan Dairy Products Ltd.",
    supplierId: "", // Replace with actual supplier ID
    branch: "Main Branch",
    branchId: "",
    poId: "", // Replace with actual PO ID (link to second PO)
    storeType: "Cold Storage",
    items: [
      {
        product: "Cheese",
        description: "Mozzarella cheese",
        quantity: 20,
        unit: "kg",
        rate: 250,
        amount: 5000,
        gstRate: 18,
        category: "Dairy",
        storeType: "Cold Storage"
      }
    ],
    totalQuantity: 20,
    totalTax: 900,
    totalAmount: 5900,
    status: "Pending",
    notes: "Properly refrigerated",
    receivedBy: "Cold Storage Manager",
    createdBy: "System"
  },
  {
    supplier: "Premium Grain Suppliers",
    supplierId: "", // Replace with actual supplier ID
    branch: "Main Branch",
    branchId: "",
    poId: "", // Replace with actual PO ID (link to third PO - Delivered)
    storeType: "Main Store",
    items: [
      {
        product: "Flour",
        description: "All-purpose flour",
        quantity: 100,
        unit: "kg",
        rate: 45,
        amount: 4500,
        gstRate: 18,
        category: "Grains",
        storeType: "Main Store"
      },
      {
        product: "Rice",
        description: "Basmati rice",
        quantity: 80,
        unit: "kg",
        rate: 60,
        amount: 4800,
        gstRate: 18,
        category: "Grains",
        storeType: "Main Store"
      }
    ],
    totalQuantity: 180,
    totalTax: 1674,
    totalAmount: 10974,
    status: "Approved",
    notes: "Approved and stock added",
    receivedBy: "Store Manager",
    createdBy: "System",
    approvedBy: "Admin",
    approvedAt: new Date()
  }
];

// ============================================
// 6. STOCK INWARD REQUESTS
// ============================================
const stockInwardRequests = [
  {
    rawMaterialId: "", // Replace with actual raw material ID (Tomatoes)
    locationId: "", // Replace with actual location ID (Main Store)
    supplierId: "", // Replace with actual supplier ID
    quantity: 50,
    costPrice: 40,
    totalValue: 2000,
    unit: "kg",
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    batchNumber: "BATCH-001",
    notes: "Fresh stock received",
    status: "approved",
    requestedBy: "Store Manager"
  },
  {
    rawMaterialId: "", // Replace with actual raw material ID (Cheese)
    locationId: "", // Replace with actual location ID (Cold Storage)
    supplierId: "", // Replace with actual supplier ID
    quantity: 20,
    costPrice: 250,
    totalValue: 5000,
    unit: "kg",
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    batchNumber: "BATCH-002",
    notes: "Dairy products",
    status: "approved",
    requestedBy: "Cold Storage Manager"
  }
];

// ============================================
// EXPORT FOR USE
// ============================================
module.exports = {
  storeLocations,
  rawMaterials,
  suppliers,
  purchaseOrders,
  grns,
  stockInwardRequests
};

// ============================================
// API TESTING EXAMPLES
// ============================================
/*
 * 
 * 1. CREATE STORE LOCATION
 * POST /api/v1/hotel/store-location
 * Body: storeLocations[0]
 * 
 * 2. CREATE RAW MATERIAL
 * POST /api/v1/hotel/raw-material
 * Body: rawMaterials[0]
 * 
 * 3. CREATE SUPPLIER
 * POST /api/v1/hotel/res-supplier/add
 * Body: suppliers[0]
 * 
 * 4. CREATE PURCHASE ORDER
 * POST /api/v1/hotel/purchase-orders
 * Body: purchaseOrders[0] (with actual IDs)
 * 
 * 5. CREATE GRN
 * POST /api/v1/hotel/grn
 * Body: grns[0] (with actual IDs)
 * 
 * 6. APPROVE GRN (this will inward stock)
 * POST /api/v1/hotel/grn/{grnId}/approve
 * Body: { approvedBy: "Admin" }
 * 
 * 7. CREATE STOCK INWARD
 * POST /api/v1/hotel/stock-inward
 * Body: stockInwardRequests[0] (with actual IDs)
 * 
 * 8. GET PENDING POS
 * GET /api/v1/hotel/purchase-orders/pending
 * 
 * 9. GET PO STATS
 * GET /api/v1/hotel/purchase-orders/stats
 * 
 * 10. UPDATE PO STATUS
 * PATCH /api/v1/hotel/purchase-orders/{poId}/status
 * Body: { status: "Delivered" }
 * 
 * 11. UPDATE PAYMENT STATUS
 * PATCH /api/v1/hotel/purchase-orders/{poId}/payment-status
 * Body: { paymentStatus: "Paid" }
 */






