const Transfer = require("../model/Transfer")
const Employee = require("../model/Employee")
const Staff = require("../model/staffModel")

// Get all transfers
exports.getAllTransfers = async (req, res) => {
  try {
    const { businessType } = req.query
    const query = businessType ? { businessType } : {}

    const transfers = await Transfer.find(query)
      .populate({
        path: 'employeeId',
        select: 'name role department',
        model: query.businessType === 'restaurant' ? 'Staff' : 'Employee'
      })

    const transformedTransfers = transfers.map(transfer => {
      const employee = transfer.employeeId || {}
      return {
        ...transfer.toObject(),
        employeeName: employee.name || 'Unknown',
        employeeRole: employee.role || transfer.currentPosition,
        employeeDepartment: employee.department || transfer.currentDepartment
      }
    })

    res.status(200).json({
      success: true,
      data: transformedTransfers
    })
  } catch (error) {
    console.error("Error in getAllTransfers:", error)
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
}

// Get a single transfer by ID
exports.getTransferById = async (req, res) => {
  try {
    const transfer = await Transfer.findById(req.params.id).populate("employeeId", "name")
    if (!transfer) {
      return res.status(404).json({ success: false, message: "Transfer not found" })
    }
    res.status(200).json({ success: true, data: transfer })
  } catch (error) {
    console.error("Error in getTransferById:", error) // Detailed logging
    res.status(500).json({ success: false, message: error.message, details: error.errors })
  }
}

// Create a new transfer
exports.createTransfer = async (req, res) => {
  try {
    const {
      employeeId,
      businessType,
      currentPosition,
      newPosition,
      currentDepartment,
      newDepartment,
      effectiveDate,
      type,
      status,
      salaryChange
    } = req.body

    // Validate employee exists
    const ModelClass = businessType === 'restaurant' ? Staff : Employee
    const employee = await ModelClass.findById(employeeId)

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: `${businessType === 'restaurant' ? 'Staff' : 'Employee'} not found`
      })
    }

    const transfer = new Transfer({
      employeeId,
      employeeModel: businessType === 'restaurant' ? 'Staff' : 'Employee',
      businessType,
      currentPosition,
      newPosition,
      currentDepartment,
      newDepartment,
      effectiveDate,
      type,
      status,
      salaryChange
    })

    await transfer.save()

    // Populate employee details before sending response
    const populatedTransfer = await Transfer.findById(transfer._id)
      .populate({
        path: 'employeeId',
        select: 'name role department',
        model: businessType === 'restaurant' ? 'Staff' : 'Employee'
      })

    res.status(201).json({
      success: true,
      data: populatedTransfer
    })
  } catch (error) {
    console.error("Error in createTransfer:", error)
    res.status(400).json({
      success: false,
      message: error.message
    })
  }
}

// Update a transfer by ID
exports.updateTransfer = async (req, res) => {
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
        return res
          .status(400)
          .json({ success: false, message: "Employee business type does not match transfer business type for update" })
      }
    }

    const updatedTransfer = await Transfer.findByIdAndUpdate(
      req.params.id,
      req.body, // Pass req.body directly
      { new: true, runValidators: true },
    )
    if (!updatedTransfer) {
      return res.status(404).json({ success: false, message: "Transfer not found" })
    }
    res.status(200).json({ success: true, data: updatedTransfer })
  } catch (error) {
    console.error("Error in updateTransfer:", error) // Detailed logging
    res.status(400).json({ success: false, message: error.message, details: error.errors })
  }
}

// Delete a transfer by ID
exports.deleteTransfer = async (req, res) => {
  try {
    const deletedTransfer = await Transfer.findByIdAndDelete(req.params.id)
    if (!deletedTransfer) {
      return res.status(404).json({ success: false, message: "Transfer not found" })
    }
    res.status(200).json({ success: true, message: "Transfer deleted successfully" })
  } catch (error) {
    console.error("Error in deleteTransfer:", error) // Detailed logging
    res.status(500).json({ success: false, message: error.message, details: error.errors })
  }
}
