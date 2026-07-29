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

const Supplier = require("../model/resSupplierModel");
const XLSX = require('xlsx');
const multer = require('multer');
const path = require('path');
const axios = require('axios');

// Configure multer for Excel file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.xlsx', '.xls'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Create a new supplier
const createSupplier = async (req, res) => {
  try {
    const {
      name,
      companyName,
      contact,
      email,
      billingAddress,
      gst,
      pan,
      branchId,
    } = req.body;

    console.log("Request body:", req.body);

    // Validate required fields
    if (
      !name ||
      !companyName ||
      !contact ||
      !email ||
      !billingAddress ||
      !gst ||
      !pan ||
      !branchId
    ) {
      return res.status(400).json({
        message: "All required fields must be provided",
        missingFields: {
          name: !name,
          companyName: !companyName,
          contact: !contact,
          email: !email,
          billingAddress: !billingAddress,
          gst: !gst,
          pan: !pan,
          branchId: !branchId,
        },
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res
        .status(400)
        .json({ message: "Please provide a valid email address" });
    }

    // Validate contact (exactly 10 digits)
    const contactRegex = /^\d{10}$/;
    if (!contactRegex.test(contact)) {
      return res
        .status(400)
        .json({ message: "Contact number must be exactly 10 digits" });
    }

    // Check if GST already exists
    const existingGST = await Supplier.findOne({ gst: gst.toUpperCase() });
    if (existingGST) {
      return res.status(400).json({
        message: "GST number already exists",
        field: "gst",
      });
    }

    // Check if PAN already exists
    const existingPAN = await Supplier.findOne({ pan: pan.toUpperCase() });
    if (existingPAN) {
      return res.status(400).json({
        message: "PAN number already exists",
        field: "pan",
      });
    }

    // Check if email already exists
    const existingEmail = await Supplier.findOne({
      email: email.toLowerCase(),
    });
    if (existingEmail) {
      return res.status(400).json({
        message: "Email already exists",
        field: "email",
      });
    }

    // Create new supplier
    const supplier = new Supplier({
      name: name.trim(),
      companyName: companyName.trim(),
      contact: contact.trim(),
      email: email.trim().toLowerCase(),
      billingAddress: billingAddress.trim(),
      gst: gst.trim().toUpperCase(),
      pan: pan.trim().toUpperCase(),
      branchId: branchId.trim(),
    });

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
      email,
      billingAddress,
      gst,
      pan,
      branchId,
    } = req.body;

    console.log("Update request body:", req.body);

    // Validate required fields
    if (
      !name ||
      !companyName ||
      !contact ||
      !email ||
      !billingAddress ||
      !gst ||
      !pan ||
      !branchId
    ) {
      return res.status(400).json({
        message: "All required fields must be provided",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res
        .status(400)
        .json({ message: "Please provide a valid email address" });
    }

    // Validate contact (exactly 10 digits)
    const contactRegex = /^\d{10}$/;
    if (!contactRegex.test(contact)) {
      return res
        .status(400)
        .json({ message: "Contact number must be exactly 10 digits" });
    }

    // Check for duplicate GST (excluding current supplier)
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

    // Check for duplicate PAN (excluding current supplier)
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

    // Check for duplicate email (excluding current supplier)
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

    const updatedSupplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      {
        name: name.trim(),
        companyName: companyName.trim(),
        contact: contact.trim(),
        email: email.trim().toLowerCase(),
        billingAddress: billingAddress.trim(),
        gst: gst.trim().toUpperCase(),
        pan: pan.trim().toUpperCase(),
        branchId: branchId.trim(),
      },
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

// Export suppliers to Excel
const exportSuppliersToExcel = async (req, res) => {
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
    }

    // Prepare data for Excel export
    const excelData = suppliers.map((supplier, index) => {
      const branch = branches.find((b) => b._id === supplier.branchId);
      return {
        'S.No': index + 1,
        'Supplier ID': supplier.supplierID || '',
        'Name': supplier.name || '',
        'Company Name': supplier.companyName || '',
        'Contact': supplier.contact || '',
        'Email': supplier.email || '',
        'Billing Address': supplier.billingAddress || '',
        'GST Number': supplier.gst || '',
        'PAN Number': supplier.pan || '',
        'Branch': branch ? branch.name : 'N/A',
        'Created Date': supplier.createdAt ? new Date(supplier.createdAt).toLocaleDateString('en-IN') : '',
        'Updated Date': supplier.updatedAt ? new Date(supplier.updatedAt).toLocaleDateString('en-IN') : '',
      };
    });

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const columnWidths = [
      { wch: 8 },   // S.No
      { wch: 15 },  // Supplier ID
      { wch: 20 },  // Name
      { wch: 25 },  // Company Name
      { wch: 15 },  // Contact
      { wch: 30 },  // Email
      { wch: 40 },  // Billing Address
      { wch: 20 },  // GST Number
      { wch: 15 },  // PAN Number
      { wch: 20 },  // Branch
      { wch: 15 },  // Created Date
      { wch: 15 },  // Updated Date
    ];
    worksheet['!cols'] = columnWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Suppliers');

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set response headers
    const fileName = `suppliers_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', excelBuffer.length);

    // Send the Excel file
    res.send(excelBuffer);

  } catch (error) {
    console.error("Error exporting suppliers to Excel:", error);
    res.status(500).json({
      message: "Error exporting suppliers to Excel",
      error: error.message,
    });
  }
};

// Import suppliers from Excel
const importSuppliersFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No Excel file uploaded" });
    }

    // Read the Excel file from buffer
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert worksheet to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
      return res.status(400).json({ message: "Excel file is empty or has no valid data" });
    }

    const results = {
      total: jsonData.length,
      successful: 0,
      failed: 0,
      errors: []
    };

    // Process each row
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowNumber = i + 2; // Excel row number (accounting for header)

      try {
        // Map Excel columns to database fields (flexible column names)
        const supplierData = {
          name: row['Name'] || row['name'] || row['Supplier Name'] || '',
          companyName: row['Company Name'] || row['companyName'] || row['Company'] || '',
          contact: row['Contact'] || row['contact'] || row['Phone'] || row['Mobile'] || '',
          email: row['Email'] || row['email'] || row['Email Address'] || '',
          billingAddress: row['Billing Address'] || row['billingAddress'] || row['Address'] || '',
          gst: row['GST Number'] || row['gst'] || row['GST'] || '',
          pan: row['PAN Number'] || row['pan'] || row['PAN'] || '',
          branchId: row['Branch ID'] || row['branchId'] || '', // This needs to be mapped properly
        };

        // Validate required fields
        const requiredFields = ['name', 'companyName', 'contact', 'email', 'billingAddress', 'gst', 'pan'];
        const missingFields = requiredFields.filter(field => !supplierData[field]?.toString().trim());

        if (missingFields.length > 0) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            error: `Missing required fields: ${missingFields.join(', ')}`,
            data: supplierData
          });
          continue;
        }

        // Clean and validate data
        supplierData.name = supplierData.name.toString().trim();
        supplierData.companyName = supplierData.companyName.toString().trim();
        supplierData.contact = supplierData.contact.toString().replace(/\D/g, '').slice(0, 10);
        supplierData.email = supplierData.email.toString().trim().toLowerCase();
        supplierData.billingAddress = supplierData.billingAddress.toString().trim();
        supplierData.gst = supplierData.gst.toString().trim().toUpperCase();
        supplierData.pan = supplierData.pan.toString().trim().toUpperCase();

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(supplierData.email)) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            error: "Invalid email format",
            data: supplierData
          });
          continue;
        }

        // Validate contact (exactly 10 digits)
        if (supplierData.contact.length !== 10) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            error: "Contact number must be exactly 10 digits",
            data: supplierData
          });
          continue;
        }

        // Check for duplicates in database
        const existingSupplier = await Supplier.findOne({
          $or: [
            { gst: supplierData.gst },
            { pan: supplierData.pan },
            { email: supplierData.email }
          ]
        });

        if (existingSupplier) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            error: "Supplier with same GST, PAN, or Email already exists",
            data: supplierData
          });
          continue;
        }

        // If no branchId provided, you might want to set a default or skip
        if (!supplierData.branchId) {
          // You can either set a default branch or require it
          results.failed++;
          results.errors.push({
            row: rowNumber,
            error: "Branch ID is required",
            data: supplierData
          });
          continue;
        }

        // Create new supplier
        const supplier = new Supplier(supplierData);
        await supplier.save();
        
        results.successful++;

      } catch (error) {
        results.failed++;
        results.errors.push({
          row: rowNumber,
          error: error.message,
          data: row
        });
      }
    }

    res.status(200).json({
      message: "Excel import completed",
      results: results
    });

  } catch (error) {
    console.error("Error importing suppliers from Excel:", error);
    res.status(500).json({
      message: "Error importing suppliers from Excel",
      error: error.message,
    });
  }
};

// Download Excel template
const downloadExcelTemplate = async (req, res) => {
  try {
    // Fetch branches for the template
    let branches = [];
    try {
      const response = await axios.get(
        "https://hotelvirat.com/api/v1/hotel/branch"
      );
      branches = response.data || [];
    } catch (branchError) {
      console.error("Error fetching branches:", branchError);
    }

    // Create template data with sample row and instructions
    const templateData = [
      {
        'Name': 'John Doe',
        'Company Name': 'ABC Suppliers Pvt Ltd',
        'Contact': '9876543210',
        'Email': 'john@abcsuppliers.com',
        'Billing Address': '123 Main Street, City, State - 123456',
        'GST Number': '27ABCDE1234F1Z5',
        'PAN Number': 'ABCDE1234F',
        'Branch ID': branches.length > 0 ? branches[0]._id : 'BRANCH_ID_HERE',
        'Branch Name (Reference Only)': branches.length > 0 ? branches[0].name : 'Branch Name Here',
      }
    ];

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Set column widths
    const columnWidths = [
      { wch: 20 },  // Name
      { wch: 25 },  // Company Name
      { wch: 15 },  // Contact
      { wch: 30 },  // Email
      { wch: 40 },  // Billing Address
      { wch: 20 },  // GST Number
      { wch: 15 },  // PAN Number
      { wch: 25 },  // Branch ID
      { wch: 30 },  // Branch Name (Reference Only)
    ];
    worksheet['!cols'] = columnWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Supplier Template');

    // Create instructions sheet
    const instructions = [
      { 'Instructions': 'How to use this template:' },
      { 'Instructions': '1. Fill in all required fields for each supplier' },
      { 'Instructions': '2. Name: Full name of the supplier contact person' },
      { 'Instructions': '3. Company Name: Official company name' },
      { 'Instructions': '4. Contact: 10-digit mobile number (numbers only)' },
      { 'Instructions': '5. Email: Valid email address' },
      { 'Instructions': '6. Billing Address: Complete address with pincode' },
      { 'Instructions': '7. GST Number: Valid GST number (15 characters)' },
      { 'Instructions': '8. PAN Number: Valid PAN number (10 characters)' },
      { 'Instructions': '9. Branch ID: Use the exact Branch ID from your system' },
      { 'Instructions': '10. Delete this sample row before importing' },
      { 'Instructions': '' },
      { 'Instructions': 'Available Branch IDs:' },
      ...branches.map(branch => ({ 'Instructions': `${branch._id} - ${branch.name}` }))
    ];

    const instructionsSheet = XLSX.utils.json_to_sheet(instructions);
    instructionsSheet['!cols'] = [{ wch: 60 }];
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set response headers
    const fileName = `supplier_import_template.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', excelBuffer.length);

    // Send the Excel file
    res.send(excelBuffer);

  } catch (error) {
    console.error("Error generating Excel template:", error);
    res.status(500).json({
      message: "Error generating Excel template",
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
  exportSuppliersToExcel,
  importSuppliersFromExcel,
  downloadExcelTemplate,
  upload, // Export multer upload middleware
};

