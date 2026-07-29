const jwt = require('jsonwebtoken');
const EmployeeAuth = require('../model/EmployeeAuth');
const Employee = require('../model/Employee');

// Protect routes - verify JWT token for employees
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Please login to access this resource.'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

      // Get employee auth from token
      const employeeAuth = await EmployeeAuth.findById(decoded.id).select('-password');

      if (!employeeAuth) {
        return res.status(401).json({
          success: false,
          message: 'User not found. Token is invalid.'
        });
      }

      // Check if employee is active
      if (!employeeAuth.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated. Please contact HR.'
        });
      }

      // Get full employee details
      const employee = await Employee.findOne({ employeeId: employeeAuth.employeeId });

      // Attach user to request
      req.user = {
        id: employeeAuth._id,
        employeeId: employeeAuth.employeeId,
        email: employeeAuth.email,
        type: 'employee',
        employeeDetails: employee
      };
      
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token is invalid or expired. Please login again.'
      });
    }
  } catch (error) {
    console.error('Employee auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: error.message
    });
  }
};
