// const { default: mongoose } = require("mongoose");
// const PurchaseOrder = require("../model/purchaseOrder");

// // Helper function to apply fallbacks after populate
// const applyPopulateFallbacks = (data) => {
//   if (Array.isArray(data)) {
//     return data.map(order => {
//       const orderObj = order.toObject();
//       if (orderObj.branchId === null && orderObj.branchName) {
//         orderObj.branchId = { name: orderObj.branchName };
//       }
//       if (orderObj.categoryId === null && orderObj.categoryName) {
//         orderObj.categoryId = { name: orderObj.categoryName };
//       }
//       return orderObj;
//     });
//   } else {
//     const orderObj = data.toObject();
//     if (orderObj.branchId === null && orderObj.branchName) {
//       orderObj.branchId = { name: orderObj.branchName };
//     }
//     if (orderObj.categoryId === null && orderObj.categoryName) {
//       orderObj.categoryId = { name: orderObj.categoryName };
//     }
//     return orderObj;
//   }
// };

// // Get all purchase orders with proper population
// exports.getAll = async (req, res) => {
//   try {
//     const orders = await PurchaseOrder.find()
//       .populate("supplierId", "name supplierID")
//       .populate("branchId", "name")
//       .populate("categoryId", "name")
//       .populate("items.name", "name");

//     const finalData = applyPopulateFallbacks(orders);

//     res.json({
//       success: true,
//       data: finalData
//     });
//   } catch (err) {
//     res.status(500).json({
//       success: false,
//       error: err.message
//     });
//   }
// };

// // Get a single purchase order by ID
// exports.getOne = async (req, res) => {
//   try {
//     const order = await PurchaseOrder.findById(req.params.id)
//       .populate("supplierId", "name supplierID")
//       .populate("branchId", "name")
//       .populate("categoryId", "name")
//       .populate("items.name", "name");

//     if (!order) return res.status(404).json({
//       success: false,
//       error: "Purchase order not found"
//     });

//     const finalData = applyPopulateFallbacks(order);

//     res.json({
//       success: true,
//       data: finalData
//     });
//   } catch (err) {
//     res.status(500).json({
//       success: false,
//       error: err.message
//     });
//   }
// };

// // Create a new purchase order
// exports.create = async (req, res) => {
//   try {
//     const body = { ...req.body };
//     console.log("Received data:", body);
//     console.log("Branch ID:", body.branchId, "Type:", typeof body.branchId);
//     console.log("Category ID:", body.categoryId, "Type:", typeof body.categoryId);

//     // Validate required fields (removed storeLocationId)
//     if (!body.branchId || !body.categoryId || !body.orderDate || !body.deliveryDate) {
//       return res.status(400).json({
//         success: false,
//         error: "Missing required fields: branchId, categoryId, orderDate, deliveryDate"
//       });
//     }
//     if (body.branchId && !mongoose.Types.ObjectId.isValid(body.branchId)) {
//       return res.status(400).json({
//         success: false,
//         error: "Invalid branchId format"
//       });
//     }

//     if (body.categoryId && !mongoose.Types.ObjectId.isValid(body.categoryId)) {
//       return res.status(400).json({
//         success: false,
//         error: "Invalid categoryId format"
//       });
//     }
//     // Convert to ObjectId if provided
//     if (body.branchId) {
//       body.branchId = new mongoose.Types.ObjectId(body.branchId);
//     }
//     if (body.categoryId) {
//       body.categoryId = new mongoose.Types.ObjectId(body.categoryId);
//     }
//     if (body.supplierId && body.supplierId !== "") {
//       body.supplierId = new mongoose.Types.ObjectId(body.supplierId);
//     } else {
//       // Remove supplierId if empty or null
//       delete body.supplierId;
//     }

//     // Convert Material references inside items
//     if (Array.isArray(body.items)) {
//       body.items = body.items.map((item) => ({
//         ...item,
//         name: item.name ? new mongoose.Types.ObjectId(item.name) : null,
//         quantity: Number(item.quantity),
//         rate: Number(item.rate),
//         amount: Number(item.amount)
//       }));
//     }

//     // Calculate totals if not provided
//     if (!body.subtotal || !body.tax || !body.total) {
//       const subtotal = body.items.reduce((sum, item) => sum + (item.amount || 0), 0);
//       const taxAmount = subtotal * (body.taxRate || 0) / 100;
//       const total = subtotal + taxAmount;

//       body.subtotal = subtotal;
//       body.tax = taxAmount;
//       body.total = total;
//     }

//     // Save names if provided (from frontend)
//     if (body.branchName) {
//       body.branchName = body.branchName.trim();
//     }
//     if (body.categoryName) {
//       body.categoryName = body.categoryName.trim();
//     }

//     const order = new PurchaseOrder(body);
//     await order.save();

//     // Populate the saved order for response
//     let populatedOrder = await PurchaseOrder.findById(order._id)
//       .populate("supplierId", "name supplierID")
//       .populate("branchId", "name")
//       .populate("categoryId", "name")
//       .populate("items.name", "name");

//     populatedOrder = applyPopulateFallbacks(populatedOrder);

//     res.status(201).json({
//       success: true,
//       data: populatedOrder
//     });
//   } catch (err) {
//     console.error("Create purchase order error:", err);
//     res.status(400).json({
//       success: false,
//       error: err.message
//     });
//   }
// };

// // Update a purchase order
// exports.update = async (req, res) => {
//   try {
//     const body = { ...req.body };

//     // Convert to ObjectId if provided
//     if (body.branchId) {
//       body.branchId = new mongoose.Types.ObjectId(body.branchId);
//     }
//     if (body.categoryId) {
//       body.categoryId = new mongoose.Types.ObjectId(body.categoryId);
//     }
//     if (body.supplierId && body.supplierId !== "") {
//       body.supplierId = new mongoose.Types.ObjectId(body.supplierId);
//     } else {
//       delete body.supplierId;
//     }

//     // Convert Material references inside items
//     if (Array.isArray(body.items)) {
//       body.items = body.items.map((item) => ({
//         ...item,
//         name: item.name ? new mongoose.Types.ObjectId(item.name) : null,
//         quantity: Number(item.quantity),
//         rate: Number(item.rate),
//         amount: Number(item.amount)
//       }));
//     }

//     // Recalculate totals
//     const subtotal = body.items.reduce((sum, item) => sum + (item.amount || 0), 0);
//     const taxAmount = subtotal * (body.taxRate || 0) / 100;
//     const total = subtotal + taxAmount;

//     body.subtotal = subtotal;
//     body.tax = taxAmount;
//     body.total = total;

//     // Save/update names if provided
//     if (body.branchName !== undefined) {
//       body.branchName = body.branchName.trim();
//     }
//     if (body.categoryName !== undefined) {
//       body.categoryName = body.categoryName.trim();
//     }

//     let order = await PurchaseOrder.findByIdAndUpdate(
//       req.params.id,
//       body,
//       {
//         new: true,
//         runValidators: true
//       }
//     )
//       .populate("supplierId", "name supplierID")
//       .populate("branchId", "name")
//       .populate("categoryId", "name")
//       .populate("items.name", "name");

//     if (!order) return res.status(404).json({
//       success: false,
//       error: "Purchase order not found"
//     });

//     order = applyPopulateFallbacks(order);

//     res.json({
//       success: true,
//       data: order
//     });
//   } catch (err) {
//     console.error("Update purchase order error:", err);
//     res.status(400).json({
//       success: false,
//       error: err.message
//     });
//   }
// };

// // Delete a purchase order
// exports.remove = async (req, res) => {
//   try {
//     const order = await PurchaseOrder.findByIdAndDelete(req.params.id);

//     if (!order) return res.status(404).json({
//       success: false,
//       error: "Purchase order not found"
//     });

//     res.json({
//       success: true,
//       message: "Purchase order deleted successfully"
//     });
//   } catch (err) {
//     res.status(500).json({
//       success: false,
//       error: err.message
//     });
//   }
// };

const { default: mongoose } = require("mongoose");
const RestaurantPurchaseOrderModel = require("../RestautantModel/RestaurantPurchaseModel");
const GoodsReceiptNote = require("../RestautantModel/RestaurantGoodReceiptNotesmodel");
const ResSupplier = require("../RestautantModel/RestaurantResSupplier");
const RestaurantProfile = require("../RestautantModel/RestaurantProfileModel");

// Explicitly get the model to ensure we're using the correct one
const PurchaseOrder = mongoose.models.RestaurantPurchaseOrder || RestaurantPurchaseOrderModel;

console.log("PurchaseOrder model loaded:", {
  modelName: PurchaseOrder?.modelName,
  collectionName: PurchaseOrder?.collection?.name,
  schemaPaths: PurchaseOrder?.schema ? Object.keys(PurchaseOrder.schema.paths) : 'no schema'
});

// Get all purchase orders
// Supported query params (all optional — omitting them keeps the old behaviour):
//   search        text match on purchaseOrderId / invoiceNumber / supplierName
//   month         "YYYY-MM" — filters on orderDate
//   status        Pending | Approved | In Transit | Delivered | Cancelled
//   paymentStatus Pending | Partial | Paid
//   supplierId    ObjectId
//   page, limit   pagination; when supplied, response includes `pagination`
//
// Filtering happens in MongoDB rather than in the browser so the client no
// longer downloads every purchase order just to filter a handful.
exports.getAll = async (req, res) => {
  try {
    const { search, month, status, paymentStatus, supplierId, page, limit } = req.query;

    const query = {};

    if (status && status !== "all") query.status = status;
    if (paymentStatus && paymentStatus !== "all") query.paymentStatus = paymentStatus;
    if (supplierId && mongoose.isValidObjectId(supplierId)) query.supplierId = supplierId;

    // month = "YYYY-MM" -> [start of month, start of next month)
    if (month && month !== "all" && /^\d{4}-\d{2}$/.test(month)) {
      const [y, m] = month.split("-").map(Number);
      query.orderDate = {
        $gte: new Date(y, m - 1, 1),
        $lt: new Date(y, m, 1),
      };
    }

    if (search && search.trim()) {
      // escape regex metacharacters so a user typing "(" doesn't error
      const safe = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = new RegExp(safe, "i");
      query.$or = [
        { purchaseOrderId: rx },
        { invoiceNumber: rx },
        { supplierName: rx },
        { "branch.name": rx },
      ];
    }

    const usePaging = page !== undefined || limit !== undefined;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const perPage = Math.min(500, Math.max(1, parseInt(limit) || 25));

    let q = PurchaseOrder.find(query)
      .populate("supplierId", "name supplierID")
      .populate("categoryId", "name")
      .populate("storeLocationId", "name")
      .populate({
        path: "items.name",
        model: "RawMaterial",
        select: "name"
      })
      .sort({ createdAt: -1 });

    if (usePaging) q = q.skip((pageNum - 1) * perPage).limit(perPage);

    const [orders, totalCount] = await Promise.all([
      q.exec(),
      usePaging ? PurchaseOrder.countDocuments(query) : Promise.resolve(undefined),
    ]);

    // Fetch all restaurant profiles to populate branch data
    const restaurantProfiles = await RestaurantProfile.find().lean();
    const branchMap = new Map();
    const addressMap = new Map();

    restaurantProfiles.forEach(profile => {
      const profileAddress = profile.address ? `${profile.address.street || ""}, ${profile.address.city || ""}, ${profile.address.state || ""}`.toLowerCase().trim() : "";
      branchMap.set(profile._id.toString(), {
        id: profile._id.toString(),
        name: profile.branchName || profile.restaurantName || "Unnamed Branch",
        address: profile.address ? `${profile.address.street || ""}, ${profile.address.city || ""}, ${profile.address.state || ""}, ${profile.address.country || ""}`.trim() : ""
      });
      // Also create address-based mapping for old purchase orders
      if (profileAddress) {
        addressMap.set(profileAddress, {
          id: profile._id.toString(),
          name: profile.branchName || profile.restaurantName || "Unnamed Branch",
          address: profile.address ? `${profile.address.street || ""}, ${profile.address.city || ""}, ${profile.address.state || ""}, ${profile.address.country || ""}`.trim() : ""
        });
      }
    });

    // Ensure storeLocation object is properly set from populated storeLocationId
    // Also update branch data from Restaurant Profile if branch.id matches or address matches
    const ordersWithStoreLocation = orders.map((order) => {
      const orderObj = order.toObject ? order.toObject() : order;

      // Try to update branch data from Restaurant Profile
      if (orderObj.branch && orderObj.branch.id) {
        const branchId = orderObj.branch.id.toString();

        // First try exact ID match
        if (branchMap.has(branchId)) {
          const profileBranch = branchMap.get(branchId);
          orderObj.branch = {
            id: profileBranch.id,
            name: profileBranch.name,
            address: profileBranch.address || orderObj.branch.address || ""
          };
        } else {
          // If ID doesn't match, try address matching for old purchase orders
          const orderAddress = orderObj.branch.address ? orderObj.branch.address.toLowerCase().trim() : "";

          // Try to find a matching restaurant profile by address similarity
          let bestMatch = null;
          let bestScore = 0;

          for (const [profileAddress, profileData] of addressMap.entries()) {
            // Simple address matching - check if key parts match
            const orderStreet = orderAddress.split(',')[0]?.trim().toLowerCase() || "";
            const profileStreet = profileAddress.split(',')[0]?.trim().toLowerCase() || "";

            if (orderStreet && profileStreet && (
              orderStreet.includes(profileStreet) ||
              profileStreet.includes(orderStreet) ||
              orderAddress.includes(profileData.address.split(',')[1]?.trim().toLowerCase() || "") // city match
            )) {
              // Found a potential match
              orderObj.branch = {
                id: profileData.id,
                name: profileData.name,
                address: profileData.address || orderObj.branch.address || ""
              };
              bestMatch = profileData;
              break; // Take first reasonable match
            }
          }

          // If no address match found, check for specific cases like "Taj Hotel"
          if (!bestMatch) {
            // Special handling for PO-002 with "Taj Hotel" - assign to a default current branch
            if (orderObj.purchaseOrderId === "PO-002" && orderObj.branch.name === "Taj Hotel") {
              // Find "Hotel Virat RNS Tumkur road" branch (same as PO-001)
              const defaultBranch = restaurantProfiles.find(p =>
                (p.branchName || p.restaurantName) === "Hotel Virat RNS Tumkur road"
              );
              if (defaultBranch) {
                orderObj.branch = {
                  id: defaultBranch._id.toString(),
                  name: defaultBranch.branchName || defaultBranch.restaurantName || "Unnamed Branch",
                  address: defaultBranch.address ? `${defaultBranch.address.street || ""}, ${defaultBranch.address.city || ""}, ${defaultBranch.address.state || ""}, ${defaultBranch.address.country || ""}`.trim() : ""
                };
                console.log(`Updated PO-002 branch to match PO-001: ${orderObj.branch.name}`);
              }
            } else {
              console.log(`Purchase Order ${orderObj.purchaseOrderId} has branch ID ${branchId} that doesn't match any current restaurant profile`);
            }
          }
        }
      }
      
      if (orderObj.storeLocationId && typeof orderObj.storeLocationId === "object") {
        // If storeLocationId is populated, use it to set storeLocation
        if (!orderObj.storeLocation || !orderObj.storeLocation.name) {
          orderObj.storeLocation = {
            id: orderObj.storeLocationId._id.toString(),
            name: orderObj.storeLocationId.name || orderObj.storeType || ""
          };
        }
        // Also set storeType for backward compatibility
        if (!orderObj.storeType && orderObj.storeLocationId.name) {
          orderObj.storeType = orderObj.storeLocationId.name;
        }
      } else if (orderObj.storeLocationId && typeof orderObj.storeLocationId === "string") {
        // If storeLocationId is just an ID string, ensure storeLocation has the ID
        if (orderObj.storeLocation && !orderObj.storeLocation.id) {
          orderObj.storeLocation.id = orderObj.storeLocationId;
        }
      }
      return orderObj;
    });

    const payload = {
      success: true,
      data: ordersWithStoreLocation
    };

    // Only present when the caller asked for a page — keeps older callers,
    // which expect just { success, data }, working unchanged.
    if (usePaging) {
      payload.pagination = {
        total: totalCount,
        page: pageNum,
        limit: perPage,
        totalPages: Math.ceil(totalCount / perPage),
        hasMore: pageNum * perPage < totalCount,
      };
    }

    res.json(payload);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
// Get a single purchase order by ID
exports.getOne = async (req, res) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id)
      .populate("supplierId", "name supplierID")
      .populate("categoryId", "name")
      .populate("storeLocationId", "name")
      .populate({
        path: "items.name",
        model: "RawMaterial",
        select: "name"
      });

    if (!order) return res.status(404).json({
      success: false,
      error: "Purchase order not found"
    });

    const orderObj = order.toObject ? order.toObject() : order;

    // Fetch restaurant profile to populate branch data if branch.id exists
    if (orderObj.branch && orderObj.branch.id) {
      try {
        const branchId = orderObj.branch.id.toString();
        const restaurantProfile = await RestaurantProfile.findById(branchId).lean();
        if (restaurantProfile) {
          orderObj.branch = {
            id: restaurantProfile._id.toString(),
            name: restaurantProfile.branchName || restaurantProfile.restaurantName || "Unnamed Branch",
            address: restaurantProfile.address ? `${restaurantProfile.address.street || ""}, ${restaurantProfile.address.city || ""}, ${restaurantProfile.address.state || ""}, ${restaurantProfile.address.country || ""}`.trim() : orderObj.branch.address || ""
          };
        }
      } catch (branchErr) {
        console.error("Error fetching branch from Restaurant Profile:", branchErr);
        // Keep existing branch data if lookup fails
      }
    }

    // Try to update branch data from Restaurant Profile for single order
    if (orderObj.branch && orderObj.branch.id) {
      const branchId = orderObj.branch.id.toString();

      try {
        const restaurantProfile = await RestaurantProfile.findById(branchId).lean();
        if (restaurantProfile) {
          orderObj.branch = {
            id: restaurantProfile._id.toString(),
            name: restaurantProfile.branchName || restaurantProfile.restaurantName || "Unnamed Branch",
            address: restaurantProfile.address ? `${restaurantProfile.address.street || ""}, ${restaurantProfile.address.city || ""}, ${restaurantProfile.address.state || ""}, ${restaurantProfile.address.country || ""}`.trim() : orderObj.branch.address || ""
          };
        } else {
          // Try address matching if ID doesn't exist
          const restaurantProfiles = await RestaurantProfile.find().lean();
          const orderAddress = orderObj.branch.address ? orderObj.branch.address.toLowerCase().trim() : "";

          let addressMatchFound = false;
          for (const profile of restaurantProfiles) {
            const profileAddress = profile.address ? `${profile.address.street || ""}, ${profile.address.city || ""}`.toLowerCase().trim() : "";
            const orderStreet = orderAddress.split(',')[0]?.trim().toLowerCase() || "";
            const profileStreet = profileAddress.split(',')[0]?.trim().toLowerCase() || "";

            if (orderStreet && profileStreet && (
              orderStreet.includes(profileStreet) ||
              profileStreet.includes(orderStreet)
            )) {
              orderObj.branch = {
                id: profile._id.toString(),
                name: profile.branchName || profile.restaurantName || "Unnamed Branch",
                address: profile.address ? `${profile.address.street || ""}, ${profile.address.city || ""}, ${profile.address.state || ""}, ${profile.address.country || ""}`.trim() : orderObj.branch.address || ""
              };
              addressMatchFound = true;
              break;
            }
          }

          // Special handling for PO-002 with "Taj Hotel" if no address match
          if (!addressMatchFound && orderObj.purchaseOrderId === "PO-002" && orderObj.branch.name === "Taj Hotel") {
            const defaultBranch = restaurantProfiles.find(p =>
              (p.branchName || p.restaurantName) === "Hotel Virat RNS Tumkur road"
            );
            if (defaultBranch) {
              orderObj.branch = {
                id: defaultBranch._id.toString(),
                name: defaultBranch.branchName || defaultBranch.restaurantName || "Unnamed Branch",
                address: defaultBranch.address ? `${defaultBranch.address.street || ""}, ${defaultBranch.address.city || ""}, ${defaultBranch.address.state || ""}, ${defaultBranch.address.country || ""}`.trim() : ""
              };
              console.log(`Updated PO-002 branch to match PO-001: ${orderObj.branch.name}`);
            }
          }
        }
      } catch (branchErr) {
        console.error("Error fetching/updating branch from Restaurant Profile:", branchErr);
        // Keep existing branch data if lookup fails
      }
    }

    // Ensure storeLocation object is properly set
    if (orderObj.storeLocationId && typeof orderObj.storeLocationId === "object") {
      if (!orderObj.storeLocation || !orderObj.storeLocation.name) {
        orderObj.storeLocation = {
          id: orderObj.storeLocationId._id.toString(),
          name: orderObj.storeLocationId.name || orderObj.storeType || ""
        };
      }
      if (!orderObj.storeType && orderObj.storeLocationId.name) {
        orderObj.storeType = orderObj.storeLocationId.name;
      }
    }

    res.json({
      success: true,
      data: orderObj
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
// Create a new purchase order
exports.create = async (req, res) => {
  try {
    const body = { ...req.body };
    console.log("Received data:", body);

    // Validate required fields
    if (!body.branch || !body.branch.id || !body.branch.name || !body.branch.address) {
      return res.status(400).json({
        success: false,
        error: "Missing required branch fields: branch.id, branch.name, branch.address"
      });
    }

    // Validate required fields (categoryId is now optional)
    if (!body.orderDate || !body.deliveryDate) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: orderDate, deliveryDate"
      });
    }

    // Validate categoryId only if provided
    if (body.categoryId && !mongoose.Types.ObjectId.isValid(body.categoryId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid categoryId format"
      });
    }

    // Convert to ObjectId if provided
    if (body.categoryId) {
      body.categoryId = new mongoose.Types.ObjectId(body.categoryId);
    }
    
    if (body.supplierId && body.supplierId !== "") {
      body.supplierId = new mongoose.Types.ObjectId(body.supplierId);
    } else {
      delete body.supplierId;
    }

    // Convert storeLocationId to ObjectId if provided
    if (body.storeLocationId && mongoose.Types.ObjectId.isValid(body.storeLocationId)) {
      body.storeLocationId = new mongoose.Types.ObjectId(body.storeLocationId);
    } else if (body.storeLocation?.id && mongoose.Types.ObjectId.isValid(body.storeLocation.id)) {
      // If storeLocation.id is provided, use it as storeLocationId
      body.storeLocationId = new mongoose.Types.ObjectId(body.storeLocation.id);
    }

    // Ensure storeType is set from storeLocation.name if available
    if (body.storeLocation?.name && !body.storeType) {
      body.storeType = body.storeLocation.name;
    }
    
    // Log store location data for debugging (especially for Delivered status)
    console.log("CREATE - Store location processing:", {
      status: body.status,
      storeLocationId: body.storeLocationId,
      storeLocation: body.storeLocation,
      storeType: body.storeType,
      hasStoreLocationId: !!body.storeLocationId,
      hasStoreLocation: !!body.storeLocation,
      hasStoreType: !!body.storeType
    });
    
    // Ensure storeLocation object is properly structured before save
    if (body.storeLocationId && body.storeLocation) {
      // Make sure storeLocation.id matches storeLocationId (as string)
      const locationIdStr = body.storeLocationId.toString();
      if (!body.storeLocation.id || body.storeLocation.id !== locationIdStr) {
        body.storeLocation.id = locationIdStr;
      }
      // Ensure name is set
      if (!body.storeLocation.name && body.storeType) {
        body.storeLocation.name = body.storeType;
      }
    } else if (body.storeLocationId && !body.storeLocation) {
      // If we have storeLocationId but no storeLocation object, create one
      // We'll populate the name from storeType if available
      body.storeLocation = {
        id: body.storeLocationId.toString(),
        name: body.storeType || ""
      };
    }

    // Convert Material references inside items
    if (Array.isArray(body.items)) {
      body.items = body.items.map((item) => ({
        ...item,
        name: item.name ? new mongoose.Types.ObjectId(item.name) : null,
        quantity: Number(item.quantity),
        rate: Number(item.rate),
        amount: Number(item.amount)
      }));
    }

    // Set taxRate if provided, otherwise default to 0
    body.taxRate = body.taxRate || 0;
    
    console.log("CREATE - Final body before save (store location):", {
      storeLocationId: body.storeLocationId,
      storeLocation: body.storeLocation,
      storeType: body.storeType
    });

    // Calculate totals if not provided
    if (!body.subtotal || !body.tax || !body.total) {
      const subtotal = body.items.reduce((sum, item) => sum + (item.amount || 0), 0);
      const taxAmount = subtotal * (body.taxRate || 0) / 100;
      const total = subtotal + taxAmount;

      body.subtotal = subtotal;
      body.tax = taxAmount;
      body.total = total;
    }

    // If invoiceNumber is provided, use it; otherwise, it will be auto-generated in the pre-save hook
    if (body.invoiceNumber) {
      // Check if invoice number already exists
      const existingInvoice = await PurchaseOrder.findOne({ invoiceNumber: body.invoiceNumber });
      if (existingInvoice) {
        return res.status(400).json({
          success: false,
          error: "Invoice number already exists"
        });
      }
    }

    // Remove any fields that don't exist in the schema to prevent validation errors
    const validFields = [
      'purchaseOrderId', 'invoiceNumber', 'supplierId', 'supplierName',
      'branch', 'categoryId', 'categoryName', 'storeLocationId', 'storeLocation',
      'storeType', 'orderDate', 'deliveryDate', 'status', 'paymentStatus',
      'items', 'subtotal', 'tax', 'total', 'notes', 'paymentTerms', 'taxRate',
      'grnGenerated', 'grnDate'
    ];
    
    const cleanedBody = {};
    validFields.forEach(field => {
      if (body[field] !== undefined) {
        cleanedBody[field] = body[field];
      }
    });
    
    console.log("Cleaned body before creating PO:", cleanedBody);
    console.log("Using PurchaseOrder model:", {
      modelName: PurchaseOrder.modelName,
      isModel: typeof PurchaseOrder === 'function'
    });
    
    // Ensure we're using the correct model
    const OrderModel = mongoose.models.RestaurantPurchaseOrder || PurchaseOrder;
    const order = new OrderModel(cleanedBody);
    
    console.log("Order instance created, validating...");
    await order.save();
    
    // Log what was actually saved to database
    console.log("CREATE - Order saved to database:", {
      _id: order._id,
      purchaseOrderId: order.purchaseOrderId,
      status: order.status,
      storeLocationId: order.storeLocationId,
      storeLocation: order.storeLocation,
      storeType: order.storeType
    });

    // Populate the saved order for response
    const populatedOrder = await PurchaseOrder.findById(order._id)
      .populate("supplierId", "name supplierID")
      .populate("categoryId", "name")
      .populate("storeLocationId", "name")
      .populate({
        path: "items.name",
        model: "RawMaterial",
        select: "name"
      });
    
    console.log("CREATE - Populated order before processing:", {
      purchaseOrderId: populatedOrder.purchaseOrderId,
      status: populatedOrder.status,
      storeLocationId: populatedOrder.storeLocationId,
      storeLocation: populatedOrder.storeLocation,
      storeType: populatedOrder.storeType
    });

    // Ensure storeLocation object is properly set
    if (populatedOrder.storeLocationId && typeof populatedOrder.storeLocationId === "object") {
      if (!populatedOrder.storeLocation || !populatedOrder.storeLocation.name) {
        populatedOrder.storeLocation = {
          id: populatedOrder.storeLocationId._id.toString(),
          name: populatedOrder.storeLocationId.name || populatedOrder.storeType || ""
        };
      }
      if (!populatedOrder.storeType && populatedOrder.storeLocationId.name) {
        populatedOrder.storeType = populatedOrder.storeLocationId.name;
      }
    } else if (populatedOrder.storeLocation && populatedOrder.storeLocation.name) {
      // If storeLocation is already set, ensure storeType is also set
      if (!populatedOrder.storeType) {
        populatedOrder.storeType = populatedOrder.storeLocation.name;
      }
    }
    
    console.log("CREATE - Final populated order for response:", {
      purchaseOrderId: populatedOrder.purchaseOrderId,
      status: populatedOrder.status,
      storeLocationId: populatedOrder.storeLocationId,
      storeLocation: populatedOrder.storeLocation,
      storeType: populatedOrder.storeType
    });

    res.status(201).json({
      success: true,
      data: populatedOrder
    });
  } catch (err) {
    console.error("Create purchase order error:", err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};
// Update a purchase order
exports.update = async (req, res) => {
  try {
    const body = { ...req.body };

    // Validate branch data
    if (body.branch && (!body.branch.id || !body.branch.name || !body.branch.address)) {
      return res.status(400).json({
        success: false,
        error: "Branch must include id, name, and address"
      });
    }

    // Convert to ObjectId if provided
    if (body.categoryId) {
      body.categoryId = new mongoose.Types.ObjectId(body.categoryId);
    }
    
    if (body.supplierId && body.supplierId !== "") {
      body.supplierId = new mongoose.Types.ObjectId(body.supplierId);
    } else {
      delete body.supplierId;
    }

    // Convert storeLocationId to ObjectId if provided
    if (body.storeLocationId && mongoose.Types.ObjectId.isValid(body.storeLocationId)) {
      body.storeLocationId = new mongoose.Types.ObjectId(body.storeLocationId);
    } else if (body.storeLocation?.id && mongoose.Types.ObjectId.isValid(body.storeLocation.id)) {
      // If storeLocation.id is provided, use it as storeLocationId
      body.storeLocationId = new mongoose.Types.ObjectId(body.storeLocation.id);
    }

    // Ensure storeType is set from storeLocation.name if available
    if (body.storeLocation?.name && !body.storeType) {
      body.storeType = body.storeLocation.name;
    }

    // Convert Material references inside items
    if (Array.isArray(body.items)) {
      body.items = body.items.map((item) => ({
        ...item,
        name: item.name ? new mongoose.Types.ObjectId(item.name) : null,
        quantity: Number(item.quantity),
        rate: Number(item.rate),
        amount: Number(item.amount)
      }));
    }

    // Set taxRate if provided
    body.taxRate = body.taxRate || 0;

    // Recalculate totals
    const subtotal = body.items.reduce((sum, item) => sum + (item.amount || 0), 0);
    const taxAmount = subtotal * (body.taxRate || 0) / 100;
    const total = subtotal + taxAmount;

    body.subtotal = subtotal;
    body.tax = taxAmount;
    body.total = total;

    // Check if invoice number is being updated and if it already exists
    if (body.invoiceNumber) {
      const existingInvoice = await PurchaseOrder.findOne({ 
        invoiceNumber: body.invoiceNumber,
        _id: { $ne: req.params.id } // Exclude current order
      });
      if (existingInvoice) {
        return res.status(400).json({
          success: false,
          error: "Invoice number already exists"
        });
      }
    }

    const order = await PurchaseOrder.findByIdAndUpdate(
      req.params.id,
      body,
      {
        new: true,
        runValidators: true
      }
    )
      .populate("supplierId", "name supplierID")
      .populate("categoryId", "name")
      .populate("storeLocationId", "name")
      .populate({
        path: "items.name",
        model: "RawMaterial",
        select: "name"
      });

    if (!order) return res.status(404).json({
      success: false,
      error: "Purchase order not found"
    });

    // Ensure storeLocation object is properly set
    if (order.storeLocationId && typeof order.storeLocationId === "object") {
      if (!order.storeLocation || !order.storeLocation.name) {
        order.storeLocation = {
          id: order.storeLocationId._id.toString(),
          name: order.storeLocationId.name || order.storeType || ""
        };
      }
      if (!order.storeType && order.storeLocationId.name) {
        order.storeType = order.storeLocationId.name;
      }
    } else if (order.storeLocation && order.storeLocation.name) {
      // If storeLocation is already set, ensure storeType is also set
      if (!order.storeType) {
        order.storeType = order.storeLocation.name;
      }
    }

    res.json({
      success: true,
      data: order
    });
  } catch (err) {
    console.error("Update purchase order error:", err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};
// Delete a purchase order
exports.remove = async (req, res) => {
  try {
    const order = await PurchaseOrder.findByIdAndDelete(req.params.id);

    if (!order) return res.status(404).json({
      success: false,
      error: "Purchase order not found"
    });

    res.json({
      success: true,
      message: "Purchase order deleted successfully"
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
// Get pending purchase orders
exports.getPendingPOs = async (req, res) => {
  try {
    const orders = await PurchaseOrder.find({
      status: { $in: ["Pending", "In Transit"] }
    })
      .populate("supplierId", "name supplierID contact email")
      .populate("categoryId", "name")
      .populate("storeLocationId", "name")
      .sort({ orderDate: 1 });

    res.json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
// Update PO status
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["Pending", "In Transit", "Delivered", "Cancelled"].includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Invalid status. Must be one of: Pending, In Transit, Delivered, Cancelled"
      });
    }

    const order = await PurchaseOrder.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    )
      .populate("supplierId", "name supplierID")
      .populate("categoryId", "name")
      .populate("storeLocationId", "name");

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Purchase order not found"
      });
    }

    res.json({
      success: true,
      message: "PO status updated successfully",
      data: order
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
// Update payment status
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body;

    if (!["Pending", "Paid", "Overdue"].includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        error: "Invalid payment status. Must be one of: Pending, Paid, Overdue"
      });
    }

    const order = await PurchaseOrder.findByIdAndUpdate(
      id,
      { paymentStatus },
      { new: true, runValidators: true }
    )
      .populate("supplierId", "name supplierID")
      .populate("categoryId", "name")
      .populate("storeLocationId", "name");

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Purchase order not found"
      });
    }

    res.json({
      success: true,
      message: "Payment status updated successfully",
      data: order
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
// Get PO statistics
exports.getPOStats = async (req, res) => {
  try {
    const [
      totalPOs,
      pendingPOs,
      inTransitPOs,
      deliveredPOs,
      cancelledPOs,
      pendingPayments,
      paidPayments,
      overduePayments,
      totalValue,
      pendingValue
    ] = await Promise.all([
      PurchaseOrder.countDocuments(),
      PurchaseOrder.countDocuments({ status: "Pending" }),
      PurchaseOrder.countDocuments({ status: "In Transit" }),
      PurchaseOrder.countDocuments({ status: "Delivered" }),
      PurchaseOrder.countDocuments({ status: "Cancelled" }),
      PurchaseOrder.countDocuments({ paymentStatus: "Pending" }),
      PurchaseOrder.countDocuments({ paymentStatus: "Paid" }),
      PurchaseOrder.countDocuments({ paymentStatus: "Overdue" }),
      PurchaseOrder.aggregate([
        { $group: { _id: null, total: { $sum: "$total" } } }
      ]),
      PurchaseOrder.aggregate([
        { $match: { paymentStatus: "Pending" } },
        { $group: { _id: null, total: { $sum: "$total" } } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        totalPOs,
        statusCounts: {
          pending: pendingPOs,
          inTransit: inTransitPOs,
          delivered: deliveredPOs,
          cancelled: cancelledPOs
        },
        paymentStatusCounts: {
          pending: pendingPayments,
          paid: paidPayments,
          overdue: overduePayments
        },
        totalValue: totalValue[0]?.total || 0,
        pendingValue: pendingValue[0]?.total || 0
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
// Get GRNs linked to a PO
exports.getPOGRNs = async (req, res) => {
  try {
    const { id } = req.params;

    const grns = await GoodsReceiptNote.find({ poId: id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: grns.length,
      data: grns
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};