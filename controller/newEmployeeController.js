const Employee = require('../models/newEmployee');
const cloudinary = require('../config/cloudinary');
const { generateFaceEmbedding } = require('../utils/faceRecognition');

// @desc    Get all employees with filtering, pagination, and search
// @route   GET /api/employees
// @access  Private
exports.getEmployees = async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Build query
  let query = { isActive: true };

  // Search functionality
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { empId: { $regex: search, $options: 'i' } },
      { designation: { $regex: search, $options: 'i' } },
      { department: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  // Sorting
  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

  // Execute query with pagination
  const employees = await Employee.find(query)
    .sort(sortOptions)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .select('-faceEmbedding');

  // Get total count for pagination
  const total = await Employee.countDocuments(query);

  res.status(200).json({
    success: true,
    count: employees.length,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    employees
  });
};

// @desc    Get single employee
// @route   GET /api/employees/:id
// @access  Private
exports.getEmployee = async (req, res, next) => {
  const employee = await Employee.findById(req.params.id).select('-faceEmbedding');

  if (!employee) {
    return res.status(404).json({
      success: false,
      message: 'Employee not found'
    });
  }

  res.status(200).json({
    success: true,
    employee
  });
};

// @desc    Create employee
// @route   POST /api/employees
// @access  Private
exports.createEmployee = async (req, res, next) => {
  req.body.createdBy = req.user.id;
  
  const employee = await Employee.create(req.body);

  res.status(201).json({
    success: true,
    employee
  });
};

// @desc    Update employee
// @route   PUT /api/employees/:id
// @access  Private
exports.updateEmployee = async (req, res, next) => {
  let employee = await Employee.findById(req.params.id);

  if (!employee) {
    return res.status(404).json({
      success: false,
      message: 'Employee not found'
    });
  }

  employee = await Employee.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  }).select('-faceEmbedding');

  res.status(200).json({
    success: true,
    employee
  });
};

// @desc    Delete employee
// @route   DELETE /api/employees/:id
// @access  Private/Admin
exports.deleteEmployee = async (req, res, next) => {
  const employee = await Employee.findById(req.params.id);

  if (!employee) {
    return res.status(404).json({
      success: false,
      message: 'Employee not found'
    });
  }

  // Soft delete
  employee.isActive = false;
  await employee.save();

  res.status(200).json({
    success: true,
    message: 'Employee deleted successfully'
  });
};

// @desc    Create employee with image and face embedding
// @route   POST /api/employees/with-image
// @access  Private
exports.createEmployeeWithImage = async (req, res, next) => {
  try {
    const employeeData = { ...req.body };
    employeeData.createdBy = req.user.id;

    // Handle image upload if present
    if (req.files && req.files.faceImage) {
      const result = await cloudinary.uploader.upload(req.files.faceImage.tempFilePath, {
        folder: 'employee_faces',
        width: 500,
        height: 500,
        crop: 'fill'
      });

      employeeData.faceImage = {
        public_id: result.public_id,
        url: result.secure_url
      };

      // Generate face embedding if image is provided
      if (req.body.faceEmbedding) {
        employeeData.faceEmbedding = JSON.parse(req.body.faceEmbedding);
      }
    }

    const employee = await Employee.create(employeeData);

    res.status(201).json({
      success: true,
      employee
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update employee with image and face embedding
// @route   PUT /api/employees/:id/with-image
// @access  Private
exports.updateEmployeeWithImage = async (req, res, next) => {
  try {
    let employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const updateData = { ...req.body };

    // Handle image upload if present
    if (req.files && req.files.faceImage) {
      // Delete old image if exists
      if (employee.faceImage && employee.faceImage.public_id) {
        await cloudinary.uploader.destroy(employee.faceImage.public_id);
      }

      const result = await cloudinary.uploader.upload(req.files.faceImage.tempFilePath, {
        folder: 'employee_faces',
        width: 500,
        height: 500,
        crop: 'fill'
      });

      updateData.faceImage = {
        public_id: result.public_id,
        url: result.secure_url
      };

      // Update face embedding if provided
      if (req.body.faceEmbedding) {
        updateData.faceEmbedding = JSON.parse(req.body.faceEmbedding);
      }
    }

    employee = await Employee.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    }).select('-faceEmbedding');

    res.status(200).json({
      success: true,
      employee
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};