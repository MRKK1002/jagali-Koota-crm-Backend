const ProbationRecord = require("../model/ProbationRecord")
const Employee = require("../model/Employee")
const Staff = require("../model/staffModel")
const mongoose = require("mongoose")

// Get all probation records
exports.getAllProbationRecords = async (req, res) => {
  try {
    const { businessType } = req.query
    const query = businessType ? { businessType } : {}

    let probationRecords = await ProbationRecord.find(query)
      .populate({
        path: 'employeeId',
        select: 'name role department',
        model: businessType === 'restaurant' ? 'Staff' : 'Employee'
      });

    // Transform records to include employee details
    const transformedRecords = probationRecords.map(record => {
      const employee = record.employeeId || {};
      return {
        ...record.toObject(),
        employeeName: employee.name || 'Unknown',
        employeeRole: employee.role || record.position,
        employeeDepartment: employee.department || record.department
      };
    });

    res.status(200).json({ success: true, data: transformedRecords })
  } catch (error) {
    console.error("Error in getAllProbationRecords:", error)
    res.status(500).json({ 
      success: false, 
      message: error.message 
    })
  }
}

// Get a single probation record by ID
exports.getProbationRecordById = async (req, res) => {
  try {
    const probationRecord = await ProbationRecord.findById(req.params.id).populate("employeeId", "name")
    if (!probationRecord) {
      return res.status(404).json({ success: false, message: "Probation record not found" })
    }
    res.status(200).json({ success: true, data: probationRecord })
  } catch (error) {
    console.error("Error in getProbationRecordById:", error) // Detailed logging
    res.status(500).json({ success: false, message: error.message, details: error.errors })
  }
}

// Create a new probation record
exports.createProbationRecord = async (req, res) => {
  try {
    const {
      employeeId,
      businessType,
      position,
      department,
      probationStart,
      probationEnd,
      status,
      reviewDate,
      performance
    } = req.body;

    // Validate employee exists
    const ModelClass = businessType === 'restaurant' ? Staff : Employee;
    const employee = await ModelClass.findById(employeeId);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: `${businessType === 'restaurant' ? 'Staff' : 'Employee'} not found`
      });
    }

    const probationRecord = new ProbationRecord({
      employeeId,
      employeeModel: businessType === 'restaurant' ? 'Staff' : 'Employee',
      businessType,
      position,
      department,
      probationStart,
      probationEnd,
      status,
      reviewDate,
      performance
    });

    await probationRecord.save();

    // Populate employee details before sending response
    const populatedRecord = await ProbationRecord.findById(probationRecord._id)
      .populate({
        path: 'employeeId',
        select: 'name role department',
        model: businessType === 'restaurant' ? 'Staff' : 'Employee'
      });

    res.status(201).json({
      success: true,
      data: populatedRecord
    });

  } catch (error) {
    console.error("Error in createProbationRecord:", error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

// Update a probation record by ID
exports.updateProbationRecord = async (req, res) => {
  try {
    const { employeeId, businessType } = req.body // Destructure employeeId and businessType from body

    // Validate employeeId if it's being updated
    if (employeeId && !mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ success: false, message: "Invalid employeeId provided for update" })
    }

    // If employeeId is provided, check if employee exists and matches businessType
    if (employeeId) {
      const employee = await Employee.findById(employeeId)
      if (!employee) {
        return res.status(404).json({ success: false, message: "Employee not found with provided ID for update" })
      }
      if (businessType && employee.businessType !== businessType) {
        return res.status(400).json({
          success: false,
          message: "Employee business type does not match probation record business type for update",
        })
      }
    }

    const updatedProbationRecord = await ProbationRecord.findByIdAndUpdate(
      req.params.id,
      req.body, // Pass req.body directly
      { new: true, runValidators: true },
    )
    if (!updatedProbationRecord) {
      return res.status(404).json({ success: false, message: "Probation record not found" })
    }
    res.status(200).json({ success: true, data: updatedProbationRecord })
  } catch (error) {
    console.error("Error in updateProbationRecord:", error) // Detailed logging
    res.status(400).json({ success: false, message: error.message, details: error.errors })
  }
}

// Delete a probation record by ID
exports.deleteProbationRecord = async (req, res) => {
  try {
    const deletedProbationRecord = await ProbationRecord.findByIdAndDelete(req.params.id)
    if (!deletedProbationRecord) {
      return res.status(404).json({ success: false, message: "Probation record not found" })
    }
    res.status(200).json({ success: true, message: "Probation record deleted successfully" })
  } catch (error) {
    console.error("Error in deleteProbationRecord:", error) // Detailed logging
    res.status(500).json({ success: false, message: error.message, details: error.errors })
  }
}
