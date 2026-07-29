// const Supplier = require("../model/resSupplierModel"); // Adjusted path based on project structure

// // Debug log to verify model import
// console.log("Supplier model in controller:", Supplier);

// // Create a new supplier
// const createSupplier = async (req, res) => {
//   try {
//     const {
//       name,
//       companyName,
//       contact,
//       email,
//       billingAddress,
//       gst,
//       pan,
//       branchId,
//     } = req.body;
//     console.log("Request body:", req.body); // Debug log
//     if (
//       !name ||
//       !companyName ||
//       !contact ||
//       !email ||
//       !billingAddress ||
//       !gst ||
//       !pan ||
//       !branchId
//     ) {
//       return res
//         .status(400)
//         .json({ message: "All required fields must be provided" });
//     }
//     const supplier = new Supplier({
//       name,
//       companyName,
//       contact,
//       email,
//       billingAddress,
//       gst,
//       pan,
//       branchId,
//     });
//     const savedSupplier = await supplier.save();
//     console.log("Saved supplier:", savedSupplier); // Debug log
//     res.status(201).json({
//       message: "Supplier created successfully",
//       data: savedSupplier,
//     });
//   } catch (error) {
//     console.error("Error creating supplier:", error); // Debug log
//     if (error.code === 11000) {
//       const field = Object.keys(error.keyValue)[0];
//       return res.status(400).json({ message: `${field} already exists` });
//     }
//     res
//       .status(500)
//       .json({ message: "Error creating supplier", error: error.message });
//   }
// };

// // Get all suppliers
// const axios = require("axios");

// const getAllSuppliers = async (req, res) => {
//   try {
//     const suppliers = await Supplier.find();

//     // Fetch branch list from Restaurant App
//     const { data: branches } = await axios.get("https://hotelvirat.com/api/v1/hotel/branch");

//     // Attach branch details
//     const enriched = suppliers.map((sup) => {
//       const branch = branches.find((b) => b._id === sup.branchId);
//       return {
//         ...sup._doc,
//         branch: branch ? { _id: branch._id, name: branch.name, address: branch.address, image: branch.image } : null,
//       };
//     });

//     res.status(200).json({
//       message: "Suppliers retrieved successfully",
//       data: enriched,
//     });
//   } catch (error) {
//     res.status(500).json({
//       message: "Error retrieving suppliers",
//       error: error.message,
//     });
//   }
// };

// // Get a single supplier by ID
// const getSupplierById = async (req, res) => {
//   try {
//     const supplier = await Supplier.findById(req.params.id).populate("branchId");
//     if (!supplier) {
//       return res.status(404).json({ message: "Supplier not found" });
//     }
//     res.status(200).json({
//       message: "Supplier retrieved successfully",
//       data: supplier,
//     });
//   } catch (error) {
//     res
//       .status(500)
//       .json({ message: "Error retrieving supplier", error: error.message });
//   }
// };

// // Update a supplier
// const updateSupplier = async (req, res) => {
//   try {
//     const {
//       name,
//       companyName,
//       contact,
//       email,
//       billingAddress,
//       gst,
//       pan,
//       branchId,
//     } = req.body;
//     console.log("Update request body:", req.body); // Debug log
//     if (
//       !name ||
//       !companyName ||
//       !contact ||
//       !email ||
//       !billingAddress ||
//       !gst ||
//       !pan ||
//       !branchId
//     ) {
//       return res
//         .status(400)
//         .json({ message: "All required fields must be provided" });
//     }
//     const supplier = await Supplier.findByIdAndUpdate(
//       req.params.id,
//       {
//         name,
//         companyName,
//         contact,
//         email,
//         billingAddress,
//         gst,
//         pan,
//         branchId,
//       },
//       { new: true, runValidators: true }
//     );
//     if (!supplier) {
//       return res.status(404).json({ message: "Supplier not found" });
//     }
//     res.status(200).json({
//       message: "Supplier updated successfully",
//       data: supplier,
//     });
//   } catch (error) {
//     if (error.code === 11000) {
//       const field = Object.keys(error.keyValue)[0];
//       return res.status(400).json({ message: `${field} already exists` });
//     }
//     res
//       .status(500)
//       .json({ message: "Error updating supplier", error: error.message });
//   }
// };

// // Delete a supplier
// const deleteSupplier = async (req, res) => {
//   try {
//     const supplier = await Supplier.findByIdAndDelete(req.params.id);
//     if (!supplier) {
//       return res.status(404).json({ message: "Supplier not found" });
//     }
//     res.status(200).json({ message: "Supplier deleted successfully" });
//   } catch (error) {
//     res
//       .status(500)
//       .json({ message: "Error deleting supplier", error: error.message });
//   }
// };

// module.exports = {
//   createSupplier,
//   getAllSuppliers,
//   getSupplierById,
//   updateSupplier,
//   deleteSupplier,
// };

const Supplier = require("../RestautantModel/RestaurantResSupplier");

// Create a new supplier
const createSupplier = async (req, res) => {
  try {
    console.log("=== CREATE SUPPLIER REQUEST ===");
    console.log("Route hit: POST /api/v1/restaurant/supplier/add");
    console.log("Request body:", req.body);
    
    let {
      name,
      companyName,
      contact,
      contact2,
      email,
      billingAddress,
      gst,
      pan,
      branchId,
    } = req.body;

    // Trim all string fields
    if (name) name = name.trim();
    if (companyName) companyName = companyName.trim();
    if (contact) contact = contact.trim().replace(/\s+/g, ''); // Remove all spaces
    if (contact2) contact2 = contact2.trim().replace(/\s+/g, ''); // Remove all spaces
    if (email) email = email.trim();
    if (billingAddress) billingAddress = billingAddress.trim();
    if (gst) gst = gst.trim();
    if (pan) pan = pan.trim();

    // Validate required fields (branchId, email, gst, pan are optional)
    if (
      !name ||
      !companyName ||
      !contact ||
      !billingAddress
    ) {
      return res.status(400).json({
        message: "All required fields must be provided",
        missingFields: {
          name: !name,
          companyName: !companyName,
          contact: !contact,
          billingAddress: !billingAddress,
        },
      });
    }

    // Validate email format only if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res
          .status(400)
          .json({ message: "Please provide a valid email address" });
      }
    }

    // Validate contact (exactly 10 digits, allow spaces/dashes but strip them)
    const contactRegex = /^\d{10}$/;
    if (!contactRegex.test(contact)) {
      return res
        .status(400)
        .json({ 
          message: "Contact number must be exactly 10 digits",
          received: contact,
          length: contact.length
        });
    }

    // Validate contact2 if provided (exactly 10 digits)
    if (contact2 && !contactRegex.test(contact2)) {
      return res
        .status(400)
        .json({ 
          message: "Second contact number must be exactly 10 digits",
          received: contact2,
          length: contact2.length
        });
    }

    // Check if GST already exists (only if provided)
    if (gst) {
      const existingGST = await Supplier.findOne({ gst: gst.toUpperCase() });
      if (existingGST) {
        return res.status(400).json({
          message: "GST number already exists",
          field: "gst",
        });
      }
    }

    // Check if PAN already exists (only if provided)
    if (pan) {
      const existingPAN = await Supplier.findOne({ pan: pan.toUpperCase() });
      if (existingPAN) {
        return res.status(400).json({
          message: "PAN number already exists",
          field: "pan",
        });
      }
    }

    // Check if email already exists (only if provided)
    if (email) {
      const existingEmail = await Supplier.findOne({
        email: email.toLowerCase(),
      });
      if (existingEmail) {
        return res.status(400).json({
          message: "Email already exists",
          field: "email",
        });
      }
    }

    // Create new supplier
    const supplierData = {
      name: name.trim(),
      companyName: companyName.trim(),
      contact: contact.trim(),
      billingAddress: billingAddress.trim(),
    };

    // Add optional fields only if provided
    if (email && email.trim() !== "") {
      supplierData.email = email.trim().toLowerCase();
    }
    if (gst && gst.trim() !== "") {
      supplierData.gst = gst.trim().toUpperCase();
    }
    if (pan && pan.trim() !== "") {
      supplierData.pan = pan.trim().toUpperCase();
    }
    
    // Add contact2 if provided
    if (contact2 && contact2.trim() !== "") {
      supplierData.contact2 = contact2.trim();
    }
    
    // Only add branchId if it's provided and not empty
    // Don't include it at all if not provided - Mongoose will use default or skip validation
    if (branchId && branchId.trim() !== "") {
      supplierData.branchId = branchId.trim();
    }
    // If branchId is not provided, don't include it in supplierData at all
    
    console.log("Creating supplier with data:", supplierData);
    const supplier = new Supplier(supplierData);

    const savedSupplier = await supplier.save();
    console.log("Supplier created successfully:", savedSupplier);

    res.status(201).json({
      message: "Supplier created successfully",
      data: savedSupplier,
    });
  } catch (error) {
    console.error("Error creating supplier:", error);

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      const value = error.keyValue[field];
      return res.status(400).json({
        message: `${field} '${value}' already exists`,
        field: field,
      });
    }

    // Handle validation errors
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        message: "Validation failed",
        errors,
      });
    }

    res.status(500).json({
      message: "Error creating supplier",
      error: error.message,
    });
  }
};

// Get all suppliers
const axios = require("axios");

const getAllSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ createdAt: -1 });

    // Fetch branch list from Restaurant App
    let branches = [];
    try {
      const response = await axios.get(
        "https://hotelvirat.com/api/v1/hotel/branch"
      );
      branches = response.data || [];
    } catch (branchError) {
      console.error("Error fetching branches:", branchError);
      // Continue without branch data
    }

    // Attach branch details
    const enriched = suppliers.map((sup) => {
      const branch = branches.find((b) => b._id === sup.branchId);
      return {
        ...sup._doc,
        branch: branch
          ? {
              _id: branch._id,
              name: branch.name,
              address: branch.address,
              image: branch.image,
            }
          : null,
      };
    });

    res.status(200).json({
      message: "Suppliers retrieved successfully",
      data: enriched,
    });
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    res.status(500).json({
      message: "Error retrieving suppliers",
      error: error.message,
    });
  }
};

// Get a single supplier by ID
const getSupplierById = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }
    res.status(200).json({
      message: "Supplier retrieved successfully",
      data: supplier,
    });
  } catch (error) {
    console.error("Error fetching supplier:", error);
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid supplier ID format" });
    }
    res.status(500).json({
      message: "Error retrieving supplier",
      error: error.message,
    });
  }
};

// Update a supplier
const updateSupplier = async (req, res) => {
  try {
    const {
      name,
      companyName,
      contact,
      contact2,
      email,
      billingAddress,
      gst,
      pan,
      branchId,
    } = req.body;

    console.log("Update request body:", req.body);

    // Validate required fields (branchId, email, gst, pan are optional)
    if (
      !name ||
      !companyName ||
      !contact ||
      !billingAddress
    ) {
      return res.status(400).json({
        message: "All required fields must be provided",
      });
    }

    // Validate email format only if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res
          .status(400)
          .json({ message: "Please provide a valid email address" });
      }
    }

    // Validate contact (exactly 10 digits)
    const contactRegex = /^\d{10}$/;
    if (!contactRegex.test(contact)) {
      return res
        .status(400)
        .json({ message: "Contact number must be exactly 10 digits" });
    }

    // Validate contact2 if provided (exactly 10 digits)
    if (contact2 && !contactRegex.test(contact2)) {
      return res
        .status(400)
        .json({ message: "Second contact number must be exactly 10 digits" });
    }

    // Check for duplicate GST (excluding current supplier) - only if provided
    if (gst) {
      const existingGST = await Supplier.findOne({
        gst: gst.toUpperCase(),
        _id: { $ne: req.params.id },
      });
      if (existingGST) {
        return res.status(400).json({
          message: "GST number already exists",
          field: "gst",
        });
      }
    }

    // Check for duplicate PAN (excluding current supplier) - only if provided
    if (pan) {
      const existingPAN = await Supplier.findOne({
        pan: pan.toUpperCase(),
        _id: { $ne: req.params.id },
      });
      if (existingPAN) {
        return res.status(400).json({
          message: "PAN number already exists",
          field: "pan",
        });
      }
    }

    // Check for duplicate email (excluding current supplier) - only if provided
    if (email) {
      const existingEmail = await Supplier.findOne({
        email: email.toLowerCase(),
        _id: { $ne: req.params.id },
      });
      if (existingEmail) {
        return res.status(400).json({
          message: "Email already exists",
          field: "email",
        });
      }
    }

    const updateData = {
      name: name.trim(),
      companyName: companyName.trim(),
      contact: contact.trim(),
      billingAddress: billingAddress.trim(),
    };

    // Add optional fields
    if (email && email.trim() !== "") {
      updateData.email = email.trim().toLowerCase();
    } else {
      updateData.email = null;
    }
    if (gst && gst.trim() !== "") {
      updateData.gst = gst.trim().toUpperCase();
    } else {
      updateData.gst = null;
    }
    if (pan && pan.trim() !== "") {
      updateData.pan = pan.trim().toUpperCase();
    } else {
      updateData.pan = null;
    }
    
    // Add contact2 if provided, otherwise remove it
    if (contact2 && contact2.trim() !== "") {
      updateData.contact2 = contact2.trim();
    } else {
      updateData.contact2 = "";
    }
    
    // Explicitly set branchId to null if not provided
    if (branchId && branchId.trim() !== "") {
      updateData.branchId = branchId.trim();
    } else {
      updateData.branchId = null;
    }

    const updatedSupplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedSupplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    res.status(200).json({
      message: "Supplier updated successfully",
      data: updatedSupplier,
    });
  } catch (error) {
    console.error("Error updating supplier:", error);

    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      const value = error.keyValue[field];
      return res.status(400).json({
        message: `${field} '${value}' already exists`,
        field: field,
      });
    }

    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid supplier ID format" });
    }

    res.status(500).json({
      message: "Error updating supplier",
      error: error.message,
    });
  }
};

// Delete a supplier
const deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndDelete(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }
    res.status(200).json({
      message: "Supplier deleted successfully",
      deletedSupplier: supplier,
    });
  } catch (error) {
    console.error("Error deleting supplier:", error);
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid supplier ID format" });
    }
    res.status(500).json({
      message: "Error deleting supplier",
      error: error.message,
    });
  }
};

module.exports = {
  createSupplier,
  getAllSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
};

