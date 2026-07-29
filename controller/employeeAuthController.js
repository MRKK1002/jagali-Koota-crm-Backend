const EmployeeAuth = require("../model/EmployeeAuth");
const Employee = require("../model/Employee");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Register employee for mobile app
exports.registerEmployee = async (req, res) => {
  try {
    const { employeeId, email, password, mobileAppRole } = req.body;

    console.log('Registration request:', { employeeId, email, mobileAppRole });

    // Validation
    if (!employeeId || !email || !password || !mobileAppRole) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields including mobile app role",
      });
    }

    // Validate role
    const validRoles = ["Site Supervisor", "Project Manager", "Employee", "Admin"];
    if (!validRoles.includes(mobileAppRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid mobile app role",
      });
    }

    // Check if already registered
    const existingAuth = await EmployeeAuth.findOne({
      $or: [{ employeeId }, { email }],
    });

    if (existingAuth) {
      return res.status(400).json({
        success: false,
        message: "Employee already registered for mobile app",
      });
    }

    // Create new employee auth
    const employeeAuth = new EmployeeAuth({
      employeeId,
      email,
      password,
      mobileAppRole,
    });

    await employeeAuth.save();

    console.log('Employee registered with role:', mobileAppRole);

    res.status(201).json({
      success: true,
      message: `Employee registered successfully for mobile app with ${mobileAppRole} role`,
      data: {
        employeeId: employeeAuth.employeeId,
        email: employeeAuth.email,
        mobileAppRole: employeeAuth.mobileAppRole,
        isActive: employeeAuth.isActive,
      },
    });
  } catch (error) {
    console.error("Error registering employee:", error);
    res.status(500).json({
      success: false,
      message: "Failed to register employee",
      error: error.message,
    });
  }
};

// Employee login for mobile app
exports.loginEmployee = async (req, res) => {
  try {
    const { employeeId, mobileNumber, password } = req.body;

    // Validation - accept either employeeId or mobileNumber
    if ((!employeeId && !mobileNumber) || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide employee ID/mobile number and password",
      });
    }

    let employeeAuth;
    let employee;

    if (mobileNumber) {
      // Find employee by mobile number first
      employee = await Employee.findOne({
        $or: [
          { phone: mobileNumber },
          { mobile: mobileNumber },
          { phoneNumber: mobileNumber }
        ]
      });
      
      if (!employee) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Find employee auth using the employeeId from employee record
      employeeAuth = await EmployeeAuth.findOne({ employeeId: employee.employeeId });
    } else {
      // Find employee auth by employeeId (original logic)
      employeeAuth = await EmployeeAuth.findOne({ employeeId });
    }

    if (!employeeAuth) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check if active
    if (!employeeAuth.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Please contact HR.",
      });
    }

    // Check mobile app role - only "Employee" role can login to construction app
    if (employeeAuth.mobileAppRole !== "Employee") {
      console.log(`Login denied for role: ${employeeAuth.mobileAppRole}`);
      return res.status(403).json({
        success: false,
        message: `You don't have access to this app. Your current role is "${employeeAuth.mobileAppRole}". Only employees with "Employee" role can access the construction app. Please contact your HR administrator.`,
      });
    }

    // Verify password
    const isPasswordValid = await employeeAuth.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Get employee details (if not already fetched)
    if (!employee) {
      employee = await Employee.findOne({ employeeId: employeeAuth.employeeId });
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: "Employee details not found",
        });
      }
    }

    // Update last login
    employeeAuth.lastLogin = new Date();
    await employeeAuth.save();

    // Generate JWT token
    const token = jwt.sign(
      {
        id: employeeAuth._id,
        employeeId: employeeAuth.employeeId,
        email: employeeAuth.email,
        type: "employee",
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "30d" }
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      data: {
        _id: employee._id, // MongoDB ObjectId needed for leave/attendance
        employeeId: employee.employeeId,
        name: employee.name,
        email: employee.email,
        department: employee.department,
        designation: employee.designation,
        phone: employee.phone,
        profilePicture: employee.profilePicture,
      },
    });
  } catch (error) {
    console.error("Error logging in employee:", error);
    res.status(500).json({
      success: false,
      message: "Failed to login",
      error: error.message,
    });
  }
};

// Get all registered employees
exports.getRegisteredEmployees = async (req, res) => {
  try {
    const registeredEmployees = await EmployeeAuth.find()
      .select("-password")
      .sort({ createdAt: -1 });

    // Get employee details for each registered employee
    const employeesWithDetails = await Promise.all(
      registeredEmployees.map(async (auth) => {
        const employee = await Employee.findOne({ employeeId: auth.employeeId });
        return {
          _id: auth._id,
          employeeId: auth.employeeId,
          email: auth.email,
          mobileAppRole: auth.mobileAppRole,
          isActive: auth.isActive,
          lastLogin: auth.lastLogin,
          createdAt: auth.createdAt,
          // Employee details
          employeeName: employee?.name || 'Unknown',
          phone: employee?.phone || employee?.mobile || employee?.phoneNumber,
          department: employee?.department,
          designation: employee?.designation,
        };
      })
    );

    console.log('Registered employees with roles:', employeesWithDetails.map(emp => ({
      name: emp.employeeName,
      role: emp.mobileAppRole,
      canAccessApp: emp.mobileAppRole === 'Employee'
    })));

    res.status(200).json({
      success: true,
      data: employeesWithDetails,
    });
  } catch (error) {
    console.error("Error fetching registered employees:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch registered employees",
      error: error.message,
    });
  }
};

// Update employee credentials
exports.updateEmployeeCredentials = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, password } = req.body;

    const employeeAuth = await EmployeeAuth.findById(id);
    if (!employeeAuth) {
      return res.status(404).json({
        success: false,
        message: "Employee registration not found",
      });
    }

    // Update email if provided
    if (email) {
      employeeAuth.email = email;
    }

    // Update password if provided
    if (password) {
      employeeAuth.password = password; // Will be hashed by pre-save hook
    }

    await employeeAuth.save();

    res.status(200).json({
      success: true,
      message: "Employee credentials updated successfully",
      data: {
        employeeId: employeeAuth.employeeId,
        email: employeeAuth.email,
      },
    });
  } catch (error) {
    console.error("Error updating employee credentials:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update credentials",
      error: error.message,
    });
  }
};

// Delete employee registration
exports.deleteEmployeeRegistration = async (req, res) => {
  try {
    const { id } = req.params;

    const employeeAuth = await EmployeeAuth.findByIdAndDelete(id);
    if (!employeeAuth) {
      return res.status(404).json({
        success: false,
        message: "Employee registration not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Employee registration deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting employee registration:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete registration",
      error: error.message,
    });
  }
};

// Get employee profile (for mobile app)
exports.getEmployeeProfile = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    res.status(200).json({
      success: true,
      data: employee,
    });
  } catch (error) {
    console.error("Error fetching employee profile:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
      error: error.message,
    });
  }
};

// Get all registered employees (for admin panel)
exports.getRegisteredEmployees = async (req, res) => {
  try {
    const registeredEmployees = await EmployeeAuth.find()
      .select("-password")
      .sort({ createdAt: -1 });

    // Get employee details for each registered employee
    const transformedData = await Promise.all(
      registeredEmployees.map(async (auth) => {
        try {
          // Find employee by employeeId string
          const employee = await Employee.findOne({ employeeId: auth.employeeId });
          
          return {
            _id: auth._id,
            employeeId: auth.employeeId,
            employeeName: employee?.name || 'Unknown Employee',
            email: auth.email,
            phone: employee?.phone || '',
            mobileAppRole: 'Employee', // Default role
            isActive: auth.isActive,
            lastLogin: auth.lastLogin,
            createdAt: auth.createdAt
          };
        } catch (err) {
          console.error(`Error fetching employee ${auth.employeeId}:`, err);
          return {
            _id: auth._id,
            employeeId: auth.employeeId,
            employeeName: 'Unknown Employee',
            email: auth.email,
            phone: '',
            mobileAppRole: 'Employee',
            isActive: auth.isActive,
            lastLogin: auth.lastLogin,
            createdAt: auth.createdAt
          };
        }
      })
    );

    res.status(200).json({
      success: true,
      data: transformedData,
    });
  } catch (error) {
    console.error("Error fetching registered employees:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch registered employees",
      error: error.message,
    });
  }
};
