const Shift = require("../RestautantModel/RestaurantShiftModel");
const Employee = require("../RestautantModel/RestaurantEmployeeSchema");

// Get all shifts with filtering
exports.getAllShifts = async (req, res) => {
  try {
    const { branch, employeeId, isActive, page = 1, limit = 100 } = req.query;

    const query = {};

    if (branch) {
      query.branch = branch;
    }

    if (employeeId) {
      query.employeeId = employeeId;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    const shifts = await Shift.find(query)
      .populate("employeeId", "name empId designation department branch")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Shift.countDocuments(query);

    res.json({
      success: true,
      shifts,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching shifts:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching shifts",
      error: error.message,
    });
  }
};

// Get shift by ID
exports.getShiftById = async (req, res) => {
  try {
    const shift = await Shift.findById(req.params.id).populate(
      "employeeId",
      "name empId designation department branch"
    );

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: "Shift not found",
      });
    }

    res.json({
      success: true,
      shift,
    });
  } catch (error) {
    console.error("Error fetching shift:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching shift",
      error: error.message,
    });
  }
};

// Get active shift for an employee
exports.getEmployeeShift = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const today = new Date();

    const shift = await Shift.findOne({
      employeeId,
      isActive: true,
      effectiveFrom: { $lte: today },
      $or: [{ effectiveTo: { $gte: today } }, { effectiveTo: null }],
    }).populate("employeeId", "name empId designation department branch");

    res.json({
      success: true,
      shift,
    });
  } catch (error) {
    console.error("Error fetching employee shift:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching employee shift",
      error: error.message,
    });
  }
};

// Create new shift
exports.createShift = async (req, res) => {
  try {
    const {
      employeeId,
      shiftName,
      shiftType,
      startTime,
      endTime,
      breakDuration,
      workingHours,
      overtimeEnabled,
      overtimeRate,
      weekendOvertimeRate,
      effectiveFrom,
      effectiveTo,
      isActive,
    } = req.body;

    // Validate employee exists
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // Check if employee already has an active shift for the same period
    const existingShift = await Shift.findOne({
      employeeId,
      isActive: true,
      $or: [
        {
          effectiveFrom: { $lte: new Date(effectiveFrom) },
          $or: [
            { effectiveTo: { $gte: new Date(effectiveFrom) } },
            { effectiveTo: null },
          ],
        },
      ],
    });

    if (existingShift) {
      return res.status(400).json({
        success: false,
        message:
          "Employee already has an active shift for this period. Please deactivate the existing shift first.",
      });
    }

    const shift = new Shift({
      employeeId,
      employeeName: employee.name,
      empId: employee.empId || employee.employeeId,
      branch: employee.branch,
      shiftName,
      shiftType,
      startTime,
      endTime,
      breakDuration,
      workingHours,
      overtimeEnabled,
      overtimeRate,
      weekendOvertimeRate,
      effectiveFrom,
      effectiveTo,
      isActive,
    });

    await shift.save();

    res.status(201).json({
      success: true,
      message: "Shift assigned successfully",
      shift,
    });
  } catch (error) {
    console.error("Error creating shift:", error);
    res.status(500).json({
      success: false,
      message: "Error creating shift",
      error: error.message,
    });
  }
};

// Update shift
exports.updateShift = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // If employeeId is being updated, validate and update employee details
    if (updateData.employeeId) {
      const employee = await Employee.findById(updateData.employeeId);
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: "Employee not found",
        });
      }
      updateData.employeeName = employee.name;
      updateData.empId = employee.empId || employee.employeeId;
      updateData.branch = employee.branch;
    }

    const shift = await Shift.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("employeeId", "name empId designation department branch");

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: "Shift not found",
      });
    }

    res.json({
      success: true,
      message: "Shift updated successfully",
      shift,
    });
  } catch (error) {
    console.error("Error updating shift:", error);
    res.status(500).json({
      success: false,
      message: "Error updating shift",
      error: error.message,
    });
  }
};

// Delete shift
exports.deleteShift = async (req, res) => {
  try {
    const { id } = req.params;

    const shift = await Shift.findByIdAndDelete(id);

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: "Shift not found",
      });
    }

    res.json({
      success: true,
      message: "Shift deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting shift:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting shift",
      error: error.message,
    });
  }
};
