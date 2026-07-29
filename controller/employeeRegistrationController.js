// const Employee = require("../model/EmployeeRegistration");
// const { Parser } = require("json2csv");

// // Get all employees with pagination, search, and sorting
// exports.getAllEmployees = async (req, res) => {
//   try {
//     const {
//       page = 1,
//       limit = 5,
//       search = "",
//       sortBy,
//       sortOrder = "ascending",
//     } = req.query;
//     const query = search
//       ? {
//           $or: [
//             { empId: { $regex: search, $options: "i" } },
//             { name: { $regex: search, $options: "i" } },
//             { designation: { $regex: search, $options: "i" } },
//             { department: { $regex: search, $options: "i" } },
//           ],
//         }
//       : {};
//     const sort = sortBy ? { [sortBy]: sortOrder === "ascending" ? 1 : -1 } : {};
//     const employees = await Employee.find(query)
//       .select("-__v") // Exclude unnecessary fields
//       .sort(sort)
//       .skip((page - 1) * limit)
//       .limit(parseInt(limit));

//     const totalEmployees = await Employee.countDocuments(query);
//     const totalPages = Math.ceil(totalEmployees / limit);

//     res.json({
//       employees,
//       totalPages,
//       currentPage: parseInt(page),
//       totalEmployees,
//     });
//   } catch (error) {
//     console.error("Error fetching employees:", error);
//     res
//       .status(500)
//       .json({ message: "Error fetching employees", error: error.message });
//   }
// };

// // Get single employee by ID
// exports.getEmployeeById = async (req, res) => {
//   try {
//     const employee = await Employee.findById(req.params.id);
//     if (!employee) {
//       return res.status(404).json({ message: "Employee not found" });
//     }
//     res.json(employee);
//   } catch (error) {
//     res
//       .status(500)
//       .json({ message: "Error fetching employee", error: error.message });
//   }
// };

// exports.createEmployee = async (req, res) => {
//   try {
//     const { isValid, errors } = await validateEmployeeData(req.body);
//     if (!isValid) {
//       return res.status(400).json({ message: "Validation failed", errors });
//     }

//     const {
//       name,
//       empId,
//       designation,
//       department,
//       dateOfJoining,
//       bankName,
//       accountNumber,
//       ifscCode,
//       branch,
//       basicSalary,
//       salaryType,
//       hra,
//       conveyance,
//       medicalAllowance,
//       specialAllowance,
//       pf,
//       professionalTax,
//       tds,
//       otherDeductions,
//     } = req.body;

//     const basic = parseFloat(basicSalary);
//     const grossSalary =
//       basic +
//       (parseFloat(hra) || 0) +
//       (parseFloat(conveyance) || 0) +
//       (parseFloat(medicalAllowance) || 0) +
//       (parseFloat(specialAllowance) || 0);

//     const netSalary =
//       grossSalary -
//       ((parseFloat(pf) || 0) +
//         (parseFloat(professionalTax) || 0) +
//         (parseFloat(tds) || 0) +
//         (parseFloat(otherDeductions) || 0));

//     if (isNaN(grossSalary) || isNaN(netSalary)) {
//       return res.status(400).json({ message: "Invalid numeric inputs" });
//     }

//     const employee = new Employee({
//       name,
//       empId,
//       designation,
//       department,
//       dateOfJoining: new Date(dateOfJoining),
//       bankName,
//       accountNumber,
//       ifscCode: ifscCode.toUpperCase(),
//       branch,
//       basicSalary: basic,
//       salaryType: salaryType || "fixed",
//       hra: parseFloat(hra) || 0,
//       conveyance: parseFloat(conveyance) || 0,
//       medicalAllowance: parseFloat(medicalAllowance) || 0,
//       specialAllowance: parseFloat(specialAllowance) || 0,
//       pf: parseFloat(pf) || 0,
//       professionalTax: parseFloat(professionalTax) || 0,
//       tds: parseFloat(tds) || 0,
//       otherDeductions: parseFloat(otherDeductions) || 0,
//       grossSalary,
//       netSalary: Math.max(0, netSalary),
//     });

//     await employee.save();
//     res
//       .status(201)
//       .json({ message: "Employee registered successfully", employee });
//   } catch (error) {
//     res
//       .status(500)
//       .json({ message: "Error registering employee", error: error.message });
//   }
// };

// exports.updateEmployee = async (req, res) => {
//   try {
//     const { isValid, errors } = await validateEmployeeData(
//       req.body,
//       req.params.id
//     );
//     if (!isValid) {
//       return res.status(400).json({ message: "Validation failed", errors });
//     }

//     const {
//       name,
//       empId,
//       designation,
//       department,
//       dateOfJoining,
//       bankName,
//       accountNumber,
//       ifscCode,
//       branch,
//       basicSalary,
//       salaryType,
//       hra,
//       conveyance,
//       medicalAllowance,
//       specialAllowance,
//       pf,
//       professionalTax,
//       tds,
//       otherDeductions,
//     } = req.body;

//     const basic = parseFloat(basicSalary);
//     const grossSalary =
//       basic +
//       (parseFloat(hra) || 0) +
//       (parseFloat(conveyance) || 0) +
//       (parseFloat(medicalAllowance) || 0) +
//       (parseFloat(specialAllowance) || 0);

//     const netSalary =
//       grossSalary -
//       ((parseFloat(pf) || 0) +
//         (parseFloat(professionalTax) || 0) +
//         (parseFloat(tds) || 0) +
//         (parseFloat(otherDeductions) || 0));

//     if (isNaN(grossSalary) || isNaN(netSalary)) {
//       return res.status(400).json({ message: "Invalid numeric inputs" });
//     }

//     const employee = await Employee.findByIdAndUpdate(
//       req.params.id,
//       {
//         name,
//         empId,
//         designation,
//         department,
//         dateOfJoining: new Date(dateOfJoining),
//         bankName,
//         accountNumber,
//         ifscCode: ifscCode.toUpperCase(),
//         branch,
//         basicSalary: basic,
//         salaryType: salaryType || "fixed",
//         hra: parseFloat(hra) || 0,
//         conveyance: parseFloat(conveyance) || 0,
//         medicalAllowance: parseFloat(medicalAllowance) || 0,
//         specialAllowance: parseFloat(specialAllowance) || 0,
//         pf: parseFloat(pf) || 0,
//         professionalTax: parseFloat(professionalTax) || 0,
//         tds: parseFloat(tds) || 0,
//         otherDeductions: parseFloat(otherDeductions) || 0,
//         grossSalary,
//         netSalary: Math.max(0, netSalary),
//         updatedAt: new Date(),
//       },
//       { new: true, runValidators: true }
//     );

//     if (!employee) {
//       return res.status(404).json({ message: "Employee not found" });
//     }

//     res.json({ message: "Employee updated successfully", employee });
//   } catch (error) {
//     res
//       .status(500)
//       .json({ message: "Error updating employee", error: error.message });
//   }
// };

// // Delete employee
// exports.deleteEmployee = async (req, res) => {
//   try {
//     const employee = await Employee.findByIdAndDelete(req.params.id);
//     if (!employee) {
//       return res.status(404).json({ message: "Employee not found" });
//     }
//     res.json({ message: "Employee deleted successfully" });
//   } catch (error) {
//     res
//       .status(500)
//       .json({ message: "Error deleting employee", error: error.message });
//   }
// };

// // Export employees to CSV

// exports.exportEmployees = async (req, res) => {
//   try {
//     console.log("Starting employee export...");
//     const employees = await Employee.find().lean(); // Use lean() for plain JSON
//     console.log("Employees fetched:", employees.length);

//     if (!employees || employees.length === 0) {
//       console.log("No employees found");
//       return res.status(404).json({ message: "No employees found to export" });
//     }

//     const fields = [
//       { label: "Employee ID", value: "empId" },
//       { label: "Name", value: "name" },
//       { label: "Designation", value: "designation" },
//       { label: "Department", value: "department" },
//       {
//         label: "Date of Joining",
//         value: (row) =>
//           row.dateOfJoining
//             ? new Date(row.dateOfJoining).toLocaleDateString("en-US", {
//                 year: "numeric",
//                 month: "short",
//                 day: "numeric",
//               })
//             : "",
//       },
//       { label: "Bank Name", value: "bankName" },
//       { label: "Account Number", value: "accountNumber" },
//       { label: "IFSC Code", value: "ifscCode" },
//       { label: "Branch", value: "branch" },
//       { label: "Basic Salary", value: (row) => `₹${row.basicSalary || 0}` },
//       { label: "HRA", value: (row) => `₹${row.hra || 0}` },
//       { label: "Conveyance", value: (row) => `₹${row.conveyance || 0}` },
//       {
//         label: "Medical Allowance",
//         value: (row) => `₹${row.medicalAllowance || 0}`,
//       },
//       {
//         label: "Special Allowance",
//         value: (row) => `₹${row.specialAllowance || 0}`,
//       },
//       { label: "Provident Fund", value: (row) => `₹${row.pf || 0}` },
//       {
//         label: "Professional Tax",
//         value: (row) => `₹${row.professionalTax || 0}`,
//       },
//       { label: "TDS", value: (row) => `₹${row.tds || 0}` },
//       {
//         label: "Other Deductions",
//         value: (row) => `₹${row.otherDeductions || 0}`,
//       },
//       { label: "Gross Salary", value: (row) => `₹${row.grossSalary || 0}` },
//       { label: "Net Salary", value: (row) => `₹${row.netSalary || 0}` },
//       {
//         label: "Registration Date",
//         value: (row) =>
//           row.createdAt
//             ? new Date(row.createdAt).toLocaleDateString("en-US", {
//                 year: "numeric",
//                 month: "short",
//                 day: "numeric",
//               })
//             : "",
//       },
//     ];

//     console.log("Parsing CSV...");
//     const json2csvParser = new Parser({ fields });
//     const csv = json2csvParser.parse(employees);
//     console.log("CSV generated, length:", csv.length);

//     res.header("Content-Type", "text/csv; charset=utf-8");
//     res.header(
//       "Content-Disposition",
//       `attachment; filename=employee-data-${new Date()
//         .toISOString()
//         .slice(0, 10)}.csv`
//     );
//     res.send("\uFEFF" + csv);
//   } catch (error) {
//     console.error("Export error:", error.message, error.stack);
//     res
//       .status(500)
//       .json({ message: "Error exporting employees", error: error.message });
//   }
// };

// const validateEmployeeData = async (data, employeeId = null) => {
//   const errors = {};

//   // Required fields
//   const requiredFields = [
//     "name",
//     "empId",
//     "designation",
//     "department",
//     "dateOfJoining",
//     "bankName",
//     "accountNumber",
//     "ifscCode",
//     "branch",
//     "basicSalary",
//   ];
//   requiredFields.forEach((field) => {
//     if (!data[field]) errors[field] = `${field} is required`;
//   });

//   // IFSC code format
//   if (
//     data.ifscCode &&
//     !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(data.ifscCode.toUpperCase())
//   ) {
//     errors.ifscCode = "Invalid IFSC code format";
//   }

//   // Account number format
//   if (data.accountNumber && !/^\d{9,18}$/.test(data.accountNumber)) {
//     errors.accountNumber = "Account number must be 9-18 digits";
//   }

//   // Basic salary validation
//   const basic = parseFloat(data.basicSalary);
//   if (isNaN(basic) || basic <= 0) {
//     errors.basicSalary = "Basic salary must be a positive number";
//   }

//   // Check for duplicate empId
//   if (data.empId) {
//     const existingEmployee = await Employee.findOne({
//       empId: data.empId,
//       _id: { $ne: employeeId },
//     });
//     if (existingEmployee) {
//       errors.empId = "Employee ID already exists";
//     }
//   }

//   return { isValid: Object.keys(errors).length === 0, errors };
// };
const Employee = require("../model/EmployeeRegistration");
const { Parser } = require("json2csv");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, "../uploads/faces");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "face-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Export upload middleware
exports.upload = upload;

// Get all employees with pagination, search, and sorting
exports.getAllEmployees = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 5,
      search = "",
      sortBy,
      sortOrder = "ascending",
    } = req.query;
    // Filter by businessType (default to restaurant for HRMS)
    const businessTypeFilter = req.query.businessType || "restaurant";
    
    const searchQuery = search
      ? {
          $or: [
            { empId: { $regex: search, $options: "i" } },
            { employeeId: { $regex: search, $options: "i" } },
            { name: { $regex: search, $options: "i" } },
            { designation: { $regex: search, $options: "i" } },
            { department: { $regex: search, $options: "i" } },
          ],
        }
      : {};
    
    // Combine businessType filter with search query
    const query = {
      businessType: businessTypeFilter,
      ...searchQuery,
    };
    
    const sort = sortBy ? { [sortBy]: sortOrder === "ascending" ? 1 : -1 } : {};
    const employees = await Employee.find(query)
      .select("-__v") // Exclude unnecessary fields
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const totalEmployees = await Employee.countDocuments(query);
    const totalPages = Math.ceil(totalEmployees / limit);

    res.json({
      success: true,
      employees,
      totalPages,
      currentPage: parseInt(page),
      total: totalEmployees,
    });
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching employees",
      error: error.message,
    });
  }
};

// Get single employee by ID
exports.getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }
    res.json({
      success: true,
      employee,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching employee",
      error: error.message,
    });
  }
};

// Register employee with face image
exports.registerEmployeeWithFace = async (req, res) => {
  try {
    console.log("Registration request received:", {
      body: Object.keys(req.body),
      file: req.file ? "Present" : "Not present",
    });

    const { isValid, errors } = await validateEmployeeData(req.body);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    const {
      name,
      empId,
      designation,
      department,
      dateOfJoining,
      phoneNumber,
      email,
      bankName,
      accountNumber,
      ifscCode,
      branch,
      basicSalary,
      salaryType,
      hra,
      conveyance,
      medicalAllowance,
      specialAllowance,
      pf,
      professionalTax,
      tds,
      otherDeductions,
      businessType,
      faceEmbedding,
    } = req.body;

    const basic = parseFloat(basicSalary);
    let grossSalary, netSalary;

    if (salaryType === "fixed") {
      grossSalary =
        basic +
        (parseFloat(hra) || 0) +
        (parseFloat(conveyance) || 0) +
        (parseFloat(medicalAllowance) || 0) +
        (parseFloat(specialAllowance) || 0);

      netSalary =
        grossSalary -
        ((parseFloat(pf) || 0) +
          (parseFloat(professionalTax) || 0) +
          (parseFloat(tds) || 0) +
          (parseFloat(otherDeductions) || 0));
    } else {
      // For daily/hourly rates, gross and net are the same as basic
      grossSalary = basic;
      netSalary = basic;
    }

    if (isNaN(grossSalary) || isNaN(netSalary)) {
      return res.status(400).json({
        success: false,
        message: "Invalid numeric inputs",
      });
    }

    const employeeData = {
      name: name.trim(),
      // Don't set empId if it's "Auto-generated" - let the pre-save hook handle it
      // Only set it if a custom value is provided
      ...(empId && empId !== "Auto-generated" ? { empId: empId } : {}),
      designation: designation.trim(),
      department: department.trim(),
      dateOfJoining: new Date(dateOfJoining),
      phoneNumber: phoneNumber?.trim(),
      email: email?.trim().toLowerCase(),
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      ifscCode: ifscCode.trim().toUpperCase(),
      branch: branch.trim(),
      basicSalary: basic,
      salaryType: salaryType || "fixed",
      hra: parseFloat(hra) || 0,
      conveyance: parseFloat(conveyance) || 0,
      medicalAllowance: parseFloat(medicalAllowance) || 0,
      specialAllowance: parseFloat(specialAllowance) || 0,
      pf: parseFloat(pf) || 0,
      professionalTax: parseFloat(professionalTax) || 0,
      tds: parseFloat(tds) || 0,
      otherDeductions: parseFloat(otherDeductions) || 0,
      grossSalary,
      netSalary: Math.max(0, netSalary),
      businessType: businessType || "restaurant",
      status: "Active",
    };

    // Handle face image
    if (req.file) {
      employeeData.faceImage = `/uploads/faces/${req.file.filename}`;
      employeeData.hasFaceData = true;
    }

    // Handle face embedding
    if (faceEmbedding) {
      try {
        employeeData.faceEmbedding = JSON.parse(faceEmbedding);
        employeeData.hasFaceData = true;
      } catch (e) {
        console.warn("Failed to parse face embedding:", e);
      }
    }

    const employee = new Employee(employeeData);
    await employee.save();

    console.log("Employee created successfully:", employee.empId);

    res.status(201).json({
      success: true,
      message: "Employee registered successfully",
      employee,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Error registering employee",
      error: error.message,
    });
  }
};

// Legacy create employee method (for backward compatibility)
exports.createEmployee = exports.registerEmployeeWithFace;

// Update employee with face image support
exports.updateEmployeeWithImage = async (req, res) => {
  try {
    const { isValid, errors } = await validateEmployeeData(
      req.body,
      req.params.id
    );
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    const {
      name,
      empId,
      designation,
      department,
      dateOfJoining,
      phoneNumber,
      email,
      bankName,
      accountNumber,
      ifscCode,
      branch,
      basicSalary,
      salaryType,
      hra,
      conveyance,
      medicalAllowance,
      specialAllowance,
      pf,
      professionalTax,
      tds,
      otherDeductions,
      faceEmbedding,
    } = req.body;

    const basic = parseFloat(basicSalary);
    let grossSalary, netSalary;

    if (salaryType === "fixed") {
      grossSalary =
        basic +
        (parseFloat(hra) || 0) +
        (parseFloat(conveyance) || 0) +
        (parseFloat(medicalAllowance) || 0) +
        (parseFloat(specialAllowance) || 0);

      netSalary =
        grossSalary -
        ((parseFloat(pf) || 0) +
          (parseFloat(professionalTax) || 0) +
          (parseFloat(tds) || 0) +
          (parseFloat(otherDeductions) || 0));
    } else {
      grossSalary = basic;
      netSalary = basic;
    }

    if (isNaN(grossSalary) || isNaN(netSalary)) {
      return res.status(400).json({
        success: false,
        message: "Invalid numeric inputs",
      });
    }

    const updateData = {
      name: name.trim(),
      empId,
      designation: designation.trim(),
      department: department.trim(),
      dateOfJoining: new Date(dateOfJoining),
      phoneNumber: phoneNumber?.trim(),
      email: email?.trim().toLowerCase(),
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      ifscCode: ifscCode.trim().toUpperCase(),
      branch: branch.trim(),
      basicSalary: basic,
      salaryType: salaryType || "fixed",
      hra: parseFloat(hra) || 0,
      conveyance: parseFloat(conveyance) || 0,
      medicalAllowance: parseFloat(medicalAllowance) || 0,
      specialAllowance: parseFloat(specialAllowance) || 0,
      pf: parseFloat(pf) || 0,
      professionalTax: parseFloat(professionalTax) || 0,
      tds: parseFloat(tds) || 0,
      otherDeductions: parseFloat(otherDeductions) || 0,
      grossSalary,
      netSalary: Math.max(0, netSalary),
      updatedAt: new Date(),
    };

    // Handle face image update
    if (req.file) {
      updateData.faceImage = `/uploads/faces/${req.file.filename}`;
      updateData.hasFaceData = true;
    }

    // Handle face embedding update
    if (faceEmbedding) {
      try {
        updateData.faceEmbedding = JSON.parse(faceEmbedding);
        updateData.hasFaceData = true;
      } catch (e) {
        console.warn("Failed to parse face embedding:", e);
      }
    }

    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    res.json({
      success: true,
      message: "Employee updated successfully",
      employee,
    });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating employee",
      error: error.message,
    });
  }
};

// Legacy update method
exports.updateEmployee = exports.updateEmployeeWithImage;

// Delete employee
exports.deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // Clean up face image file if exists
    if (employee.faceImage) {
      const imagePath = path.join(__dirname, "..", employee.faceImage);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    res.json({
      success: true,
      message: "Employee deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting employee",
      error: error.message,
    });
  }
};

// Export employees to CSV

exports.exportEmployees = async (req, res) => {
  try {
    console.log("Starting employee export...");
    const employees = await Employee.find().lean(); // Use lean() for plain JSON
    console.log("Employees fetched:", employees.length);

    if (!employees || employees.length === 0) {
      console.log("No employees found");
      return res.status(404).json({ message: "No employees found to export" });
    }

    const fields = [
      { label: "Employee ID", value: "empId" },
      { label: "Name", value: "name" },
      { label: "Designation", value: "designation" },
      { label: "Department", value: "department" },
      {
        label: "Date of Joining",
        value: (row) =>
          row.dateOfJoining
            ? new Date(row.dateOfJoining).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })
            : "",
      },
      { label: "Bank Name", value: "bankName" },
      { label: "Account Number", value: "accountNumber" },
      { label: "IFSC Code", value: "ifscCode" },
      { label: "Branch", value: "branch" },
      { label: "Basic Salary", value: (row) => `₹${row.basicSalary || 0}` },
      { label: "HRA", value: (row) => `₹${row.hra || 0}` },
      { label: "Conveyance", value: (row) => `₹${row.conveyance || 0}` },
      {
        label: "Medical Allowance",
        value: (row) => `₹${row.medicalAllowance || 0}`,
      },
      {
        label: "Special Allowance",
        value: (row) => `₹${row.specialAllowance || 0}`,
      },
      { label: "Provident Fund", value: (row) => `₹${row.pf || 0}` },
      {
        label: "Professional Tax",
        value: (row) => `₹${row.professionalTax || 0}`,
      },
      { label: "TDS", value: (row) => `₹${row.tds || 0}` },
      {
        label: "Other Deductions",
        value: (row) => `₹${row.otherDeductions || 0}`,
      },
      { label: "Gross Salary", value: (row) => `₹${row.grossSalary || 0}` },
      { label: "Net Salary", value: (row) => `₹${row.netSalary || 0}` },
      { label: "Photo", value: "photo" },
      {
        label: "Registration Date",
        value: (row) =>
          row.createdAt
            ? new Date(row.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })
            : "",
      },
    ];

    console.log("Parsing CSV...");
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(employees);
    console.log("CSV generated, length:", csv.length);

    res.header("Content-Type", "text/csv; charset=utf-8");
    res.header(
      "Content-Disposition",
      `attachment; filename=employee-data-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`
    );
    res.send("\uFEFF" + csv);
  } catch (error) {
    console.error("Export error:", error.message, error.stack);
    res
      .status(500)
      .json({ message: "Error exporting employees", error: error.message });
  }
};

const validateEmployeeData = async (data, employeeId = null) => {
  const errors = {};

  // Required fields
  const requiredFields = [
    "name",
    "empId",
    "designation",
    "department",
    "dateOfJoining",
    "bankName",
    "accountNumber",
    "ifscCode",
    "branch",
    "basicSalary",
  ];
  requiredFields.forEach((field) => {
    if (!data[field]) errors[field] = `${field} is required`;
  });

  // IFSC code format
  if (
    data.ifscCode &&
    !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(data.ifscCode.toUpperCase())
  ) {
    errors.ifscCode = "Invalid IFSC code format";
  }

  // Account number format
  if (data.accountNumber && !/^\d{9,18}$/.test(data.accountNumber)) {
    errors.accountNumber = "Account number must be 9-18 digits";
  }

  // Basic salary validation
  const basic = parseFloat(data.basicSalary);
  if (isNaN(basic) || basic <= 0) {
    errors.basicSalary = "Basic salary must be a positive number";
  }

  // Check for duplicate empId
  if (data.empId) {
    const existingEmployee = await Employee.findOne({
      empId: data.empId,
      _id: { $ne: employeeId },
    });
    if (existingEmployee) {
      errors.empId = "Employee ID already exists";
    }
  }

  return { isValid: Object.keys(errors).length === 0, errors };
};
