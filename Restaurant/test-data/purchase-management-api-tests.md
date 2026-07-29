# Purchase Management API Test Guide

This guide provides step-by-step instructions to test all Purchase Management routes with sample data.

## Prerequisites

1. Ensure your server is running
2. Have MongoDB connection active
3. Get authentication token if required
4. Note: Replace placeholder IDs with actual IDs from your database

---

## Test Data Setup Order

Follow this order to create test data (each step depends on previous ones):

### Step 1: Create Store Locations

**Endpoint:** `POST /api/v1/hotel/store-location`

**Request Body:**
```json
{
  "name": "Main Store",
  "address": "123 Restaurant Street, City, State 12345",
  "manager": "John Manager",
  "contact": "9876543210"
}
```

**Repeat for:**
- Kitchen Store
- Cold Storage

**Save the `_id` from response - you'll need it for later steps**

---

### Step 2: Create Raw Materials

**Endpoint:** `POST /api/v1/hotel/raw-material`

**Request Body:**
```json
{
  "name": "Tomatoes",
  "category": "Vegetables",
  "unit": "kg",
  "minLevel": 10,
  "description": "Fresh red tomatoes"
}
```

**Repeat for:**
- Cheese (Dairy)
- Flour (Grains)
- Onions (Vegetables)
- Chicken (Meat)
- Rice (Grains)
- Oil (Cooking)
- Spices Mix (Spices)

**Save the `_id` from each response**

---

### Step 3: Create Suppliers/Vendors

**Endpoint:** `POST /api/v1/hotel/res-supplier/add`

**Request Body:**
```json
{
  "name": "Rajesh Kumar",
  "companyName": "Fresh Vegetables Supply Co.",
  "contact": "9876543210",
  "email": "rajesh@freshveg.com",
  "billingAddress": "123 Vegetable Market, City, State 12345",
  "gst": "GST123456789",
  "pan": "ABCDE1234F"
}
```

**Repeat for:**
- Mohan Dairy Products Ltd.
- Premium Grain Suppliers
- Fresh Meat Suppliers
- Spice World Trading

**Save the `_id` from each response**

---

### Step 4: Get Branch and Category IDs

**Get Branches:**
```
GET /api/v1/hotel/branch
```

**Get Categories:**
```
GET /api/v1/hotel/category
```

**Save the IDs you need**

---

### Step 5: Create Purchase Orders

**Endpoint:** `POST /api/v1/hotel/purchase-orders`

**Request Body (Example - Pending PO):**
```json
{
  "supplierId": "<supplier_id_from_step3>",
  "supplierName": "Fresh Vegetables Supply Co.",
  "branch": {
    "id": "<branch_id>",
    "name": "Main Branch",
    "address": "123 Restaurant Street, City, State 12345"
  },
  "categoryId": "<category_id>",
  "categoryName": "Vegetables",
  "storeLocationId": "<store_location_id_from_step1>",
  "storeLocation": {
    "id": "<store_location_id>",
    "name": "Main Store"
  },
  "storeType": "Main Store",
  "orderDate": "2024-01-15",
  "deliveryDate": "2024-01-22",
  "status": "Pending",
  "paymentStatus": "Pending",
  "items": [
    {
      "name": "<tomatoes_raw_material_id>",
      "quantity": 50,
      "unit": "kg",
      "rate": 40,
      "amount": 2000
    },
    {
      "name": "<onions_raw_material_id>",
      "quantity": 30,
      "unit": "kg",
      "rate": 35,
      "amount": 1050
    }
  ],
  "subtotal": 3050,
  "tax": 549,
  "total": 3599,
  "taxRate": 18,
  "notes": "Urgent delivery required",
  "paymentTerms": "Net 30"
}
```

**Create multiple POs with different statuses:**
- One with status: "Pending"
- One with status: "In Transit"
- One with status: "Delivered"
- One with paymentStatus: "Paid"

**Save the `_id` and `purchaseOrderId` from responses**

---

### Step 6: Create Goods Receipt Notes (GRN)

**Endpoint:** `POST /api/v1/hotel/grn`

**Request Body (Example):**
```json
{
  "supplier": "Fresh Vegetables Supply Co.",
  "supplierId": "<supplier_id>",
  "branch": "Main Branch",
  "branchId": "<branch_id>",
  "poId": "<purchase_order_id_from_step5>",
  "storeType": "Main Store",
  "items": [
    {
      "product": "Tomatoes",
      "description": "Fresh red tomatoes",
      "quantity": 50,
      "unit": "kg",
      "rate": 40,
      "amount": 2000,
      "gstRate": 18,
      "category": "Vegetables",
      "storeType": "Main Store"
    },
    {
      "product": "Onions",
      "description": "Fresh onions",
      "quantity": 30,
      "unit": "kg",
      "rate": 35,
      "amount": 1050,
      "gstRate": 18,
      "category": "Vegetables",
      "storeType": "Main Store"
    }
  ],
  "totalQuantity": 80,
  "totalTax": 549,
  "totalAmount": 3599,
  "status": "Pending",
  "notes": "Items received in good condition",
  "receivedBy": "Store Manager"
}
```

**Save the `_id` and `grnNumber` from response**

---

### Step 7: Approve GRN (This will inward stock automatically)

**Endpoint:** `POST /api/v1/hotel/grn/{grnId}/approve`

**Request Body:**
```json
{
  "approvedBy": "Admin"
}
```

**This will:**
- Update GRN status to "Approved"
- Add stock to LocationInventory
- Update RawMaterial stock
- Create StockTransaction records
- Update PurchaseOrder status to "Delivered"

---

## Testing All Routes

### Suppliers Tab (`/restaurant/purchase/res-supplier`)

1. **Get All Suppliers**
   ```
   GET /api/v1/hotel/res-supplier
   ```

2. **Get Single Supplier**
   ```
   GET /api/v1/hotel/res-supplier/{supplierId}
   ```

3. **Update Supplier**
   ```
   PUT /api/v1/hotel/res-supplier/{supplierId}
   Body: { ...updated fields }
   ```

4. **Delete Supplier**
   ```
   DELETE /api/v1/hotel/res-supplier/{supplierId}
   ```

---

### Purchase Orders Tab (`/restaurant/purchase/purchase-orders`)

1. **Get All Purchase Orders**
   ```
   GET /api/v1/hotel/purchase-orders
   ```

2. **Get Pending Purchase Orders**
   ```
   GET /api/v1/hotel/purchase-orders/pending
   ```

3. **Get PO Statistics**
   ```
   GET /api/v1/hotel/purchase-orders/stats
   ```

4. **Get Single PO**
   ```
   GET /api/v1/hotel/purchase-orders/{poId}
   ```

5. **Get GRNs Linked to PO**
   ```
   GET /api/v1/hotel/purchase-orders/{poId}/grns
   ```

6. **Update PO Status**
   ```
   PATCH /api/v1/hotel/purchase-orders/{poId}/status
   Body: { "status": "Delivered" }
   ```

7. **Update Payment Status**
   ```
   PATCH /api/v1/hotel/purchase-orders/{poId}/payment-status
   Body: { "paymentStatus": "Paid" }
   ```

---

### GRN Tab (`/restaurant/purchase/GRN`)

1. **Get All GRNs**
   ```
   GET /api/v1/hotel/grn
   ```

2. **Get Single GRN**
   ```
   GET /api/v1/hotel/grn/{grnId}
   ```

3. **Get GRN by Number**
   ```
   GET /api/v1/hotel/grn/number/{grnNumber}
   ```

4. **Approve GRN** (inwards stock)
   ```
   POST /api/v1/hotel/grn/{grnId}/approve
   Body: { "approvedBy": "Admin" }
   ```

5. **Reject GRN**
   ```
   POST /api/v1/hotel/grn/{grnId}/reject
   Body: { 
     "rejectionReason": "Items damaged",
     "rejectedBy": "Admin"
   }
   ```

6. **Get GRN Statistics**
   ```
   GET /api/v1/hotel/grn/stats
   ```

---

### Pending POs Tab (`/restaurant/purchase/pending`)

Uses the same endpoint as Purchase Orders:
```
GET /api/v1/hotel/purchase-orders/pending
```

---

### Store Location (`/restaurant/purchase/store-location`)

1. **Get All Store Locations**
   ```
   GET /api/v1/hotel/store-location
   ```

2. **Get Single Store Location**
   ```
   GET /api/v1/hotel/store-location/{locationId}
   ```

3. **Create Store Location**
   ```
   POST /api/v1/hotel/store-location
   Body: { name, address, manager, contact }
   ```

4. **Update Store Location**
   ```
   PUT /api/v1/hotel/store-location/{locationId}
   Body: { ...updated fields }
   ```

5. **Delete Store Location**
   ```
   DELETE /api/v1/hotel/store-location/{locationId}
   ```

---

### Vendor Payment Tracking (`/restaurant/purchase/purchase-vendors`)

This component handles vendor payments and invoices. Test with:
- GRNs that have been approved
- Purchase Orders with different payment statuses

---

## Quick Test Checklist

- [ ] Create 3 Store Locations
- [ ] Create 5-8 Raw Materials
- [ ] Create 3-5 Suppliers
- [ ] Create 4 Purchase Orders (different statuses)
- [ ] Create 2-3 GRNs (link to POs)
- [ ] Approve 1 GRN (verify stock is added)
- [ ] Update PO status from Pending to Delivered
- [ ] Update payment status from Pending to Paid
- [ ] Check pending POs list
- [ ] Check PO statistics
- [ ] View GRN details
- [ ] Test search and filters in frontend

---

## Expected Results

After completing all steps:

1. **Suppliers Tab:** Should show all created suppliers
2. **Purchase Orders Tab:** Should show all POs with correct statuses
3. **GRN Tab:** Should show all GRNs, one approved
4. **Pending POs Tab:** Should show only POs with status "Pending" or "In Transit"
5. **Store Location:** Should show all created locations
6. **Stock:** After approving GRN, check that stock was added to inventory

---

## Troubleshooting

- **If IDs are missing:** Make sure to save IDs from each creation response
- **If stock not updating:** Check that GRN approval endpoint is called correctly
- **If routes not working:** Verify routes are registered in server.js
- **If frontend not showing data:** Check API URLs match backend endpoints






