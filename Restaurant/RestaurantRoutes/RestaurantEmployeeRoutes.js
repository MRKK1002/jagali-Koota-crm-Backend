const express = require("express")
const router = express.Router()
const Employee = require("../model/Employee")

// Get all employees (unified endpoint)
router.get("/", async (req, res) => {
  try {
    const { businessType } = req.query
    const query = {}
    if (businessType) {
      query.businessType = businessType
    }
    const employees = await Employee.find(query)
    res.status(200).json(employees) // Return as array directly for frontend
  } catch (error) {
    console.error("Error in getAllEmployees:", error)
    res.status(500).json({ message: error.message })
  }
})

// Get employee by ID
router.get("/:id", async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" })
    }
    res.status(200).json(employee)
  } catch (error) {
    console.error("Error in getEmployeeById:", error)
    res.status(500).json({ message: error.message })
  }
})

// Create a new employee
router.post("/", async (req, res) => {
  try {
    const newEmployee = new Employee(req.body)
    await newEmployee.save()
    res.status(201).json(newEmployee)
  } catch (error) {
    console.error("Error in createEmployee:", error)
    res.status(400).json({ message: error.message, details: error.errors })
  }
})

// Update an employee by ID
router.put("/:id", async (req, res) => {
  try {
    const updatedEmployee = await Employee.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
    if (!updatedEmployee) {
      return res.status(404).json({ message: "Employee not found" })
    }
    res.status(200).json(updatedEmployee)
  } catch (error) {
    console.error("Error in updateEmployee:", error)
    res.status(400).json({ message: error.message, details: error.errors })
  }
})

// Delete an employee by ID
router.delete("/:id", async (req, res) => {
  try {
    const deletedEmployee = await Employee.findByIdAndDelete(req.params.id)
    if (!deletedEmployee) {
      return res.status(404).json({ message: "Employee not found" })
    }
    res.status(200).json({ message: "Employee deleted successfully" })
  } catch (error) {
    console.error("Error in deleteEmployee:", error)
    res.status(500).json({ message: error.message })
  }
})

module.exports = router
