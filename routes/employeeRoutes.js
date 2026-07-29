const express = require("express")
const router = express.Router()
const multer = require("multer")
const path = require("path")
const fs = require("fs")
const Employee = require("../model/Employee")

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "..", "uploads", "employees");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for document uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `employee-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  // Allow images and PDFs
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "application/pdf"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image and PDF files are allowed!"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Configure multer for multiple file fields
const uploadFields = upload.fields([
  { name: "aadharCardImage", maxCount: 1 },
  { name: "panCardImage", maxCount: 1 },
  { name: "bankPassbookImage", maxCount: 1 },
]);

// Get all employees
router.get("/", async (req, res) => {
  try {
    const { businessType } = req.query;
    const query = businessType ? { businessType } : {};
    
    console.log("Fetching employees with query:", query);
    const employees = await Employee.find(query).sort({ createdAt: -1 });
    console.log(`Found ${employees.length} employees`);
    
    res.status(200).json({
      success: true,
      count: employees.length,
      data: employees,
    });
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching employees",
      error: error.message,
    });
  }
});

// Get employee by ID
router.get("/:id", async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
    if (!employee) {
      return res.status(404).json({ 
        success: false,
        message: "Employee not found" 
      })
    }
    res.status(200).json({
      success: true,
      data: employee
    })
  } catch (error) {
    console.error("Error in getEmployeeById:", error)
    res.status(500).json({ 
      success: false,
      message: error.message 
    })
  }
})

// Create a new employee
router.post("/", uploadFields, async (req, res) => {
  try {
    // Handle file uploads
    let aadharCardImage = null;
    let panCardImage = null;
    let bankPassbookImage = null;

    if (req.files) {
      if (req.files.aadharCardImage && req.files.aadharCardImage[0]) {
        aadharCardImage = `/uploads/employees/${req.files.aadharCardImage[0].filename}`;
      }
      if (req.files.panCardImage && req.files.panCardImage[0]) {
        panCardImage = `/uploads/employees/${req.files.panCardImage[0].filename}`;
      }
      if (req.files.bankPassbookImage && req.files.bankPassbookImage[0]) {
        bankPassbookImage = `/uploads/employees/${req.files.bankPassbookImage[0].filename}`;
      }
    }

    // Auto-generate employeeId if not provided or if duplicate
    if (!req.body.employeeId || req.body.employeeId === '') {
      // Get the latest employee for this business type
      const businessType = req.body.businessType || 'construction';
      const prefix = businessType === 'construction' ? 'CON' : 'RES';
      
      const latestEmployee = await Employee.findOne({ 
        employeeId: new RegExp(`^${prefix}-`) 
      }).sort({ employeeId: -1 });
      
      let nextNumber = 1;
      if (latestEmployee && latestEmployee.employeeId) {
        const match = latestEmployee.employeeId.match(/\d+$/);
        if (match) {
          nextNumber = parseInt(match[0]) + 1;
        }
      }
      
      req.body.employeeId = `${prefix}-${String(nextNumber).padStart(4, '0')}`;
      console.log('Auto-generated employeeId:', req.body.employeeId);
    }
    
    const employeeData = {
      ...req.body,
      aadharCardImage,
      panCardImage,
      bankPassbookImage,
    };
    
    const newEmployee = new Employee(employeeData)
    await newEmployee.save()
    res.status(201).json({
      success: true,
      message: "Employee created successfully",
      data: newEmployee
    })
  } catch (error) {
    console.error("Error in createEmployee:", error)
    
    // Handle duplicate key error - retry with new ID
    if (error.code === 11000 && error.keyValue?.employeeId) {
      try {
        // Generate a new unique ID
        const businessType = req.body.businessType || 'construction';
        const prefix = businessType === 'construction' ? 'CON' : 'RES';
        const timestamp = Date.now().toString().slice(-4);
        req.body.employeeId = `${prefix}-${timestamp}`;
        
        console.log('Retry with new employeeId:', req.body.employeeId);
        const newEmployee = new Employee(req.body);
        await newEmployee.save();
        return res.status(201).json({
          success: true,
          message: "Employee created successfully",
          data: newEmployee
        });
      } catch (retryError) {
        console.error("Retry failed:", retryError);
        return res.status(400).json({ 
          message: "Failed to generate unique employee ID. Please try again.",
          error: retryError.message
        });
      }
    }
    
    res.status(400).json({ 
      success: false,
      message: error.message, 
      details: error.errors 
    })
  }
})

// Update an employee by ID
router.put("/:id", uploadFields, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ 
        success: false,
        message: "Employee not found" 
      })
    }

    // Handle file uploads - only update if new files are provided
    let updateData = { ...req.body };

    if (req.files) {
      // Delete old files if new ones are uploaded
      if (req.files.aadharCardImage && req.files.aadharCardImage[0]) {
        if (employee.aadharCardImage) {
          const oldFilePath = path.join(__dirname, "..", employee.aadharCardImage);
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        }
        updateData.aadharCardImage = `/uploads/employees/${req.files.aadharCardImage[0].filename}`;
      }
      if (req.files.panCardImage && req.files.panCardImage[0]) {
        if (employee.panCardImage) {
          const oldFilePath = path.join(__dirname, "..", employee.panCardImage);
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        }
        updateData.panCardImage = `/uploads/employees/${req.files.panCardImage[0].filename}`;
      }
      if (req.files.bankPassbookImage && req.files.bankPassbookImage[0]) {
        if (employee.bankPassbookImage) {
          const oldFilePath = path.join(__dirname, "..", employee.bankPassbookImage);
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        }
        updateData.bankPassbookImage = `/uploads/employees/${req.files.bankPassbookImage[0].filename}`;
      }
    }

    const updatedEmployee = await Employee.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
    
    res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      data: updatedEmployee
    })
  } catch (error) {
    console.error("Error in updateEmployee:", error)
    res.status(400).json({ 
      success: false,
      message: error.message, 
      details: error.errors 
    })
  }
})

// Delete an employee by ID
router.delete("/:id", async (req, res) => {
  try {
    const deletedEmployee = await Employee.findByIdAndDelete(req.params.id)
    if (!deletedEmployee) {
      return res.status(404).json({ 
        success: false,
        message: "Employee not found" 
      })
    }
    res.status(200).json({ 
      success: true,
      message: "Employee deleted successfully" 
    })
  } catch (error) {
    console.error("Error in deleteEmployee:", error)
    res.status(500).json({ 
      success: false,
      message: error.message 
    })
  }
})

module.exports = router
