const SalaryStructure = require("../model/SalaryStructure");

// Create salary structure
exports.createSalaryStructure = async (req, res) => {
  try {
    const data = req.body;

    // Set employeeModel based on businessType
    if (data.businessType === "construction") {
      data.employeeModel = "Employee";
    } else if (data.businessType === "restaurant") {
      data.employeeModel = "Staff";
    } else {
      return res.status(400).json({ message: "Invalid business type" });
    }

    const salary = new SalaryStructure(data);
    await salary.save();

    return res.status(201).json({ message: "Salary structure created", salary });
  } catch (error) {
    console.error("Error creating salary structure:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// Get all salary structures
exports.getAllSalaryStructures = async (req, res) => {
  try {
    const salaries = await SalaryStructure.find()
      .populate("employeeId") // auto-populates based on `refPath`
      .sort({ createdAt: -1 });

    return res.status(200).json(salaries);
  } catch (error) {
    console.error("Error fetching salary structures:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// Get salary structure by ID
exports.getSalaryStructureById = async (req, res) => {
  try {
    const { id } = req.params;
    const salary = await SalaryStructure.findById(id).populate("employeeId");

    if (!salary) {
      return res.status(404).json({ message: "Salary structure not found" });
    }

    return res.status(200).json(salary);
  } catch (error) {
    console.error("Error fetching salary structure:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// Delete salary structure
exports.deleteSalaryStructure = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await SalaryStructure.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Salary structure not found" });
    }

    return res.status(200).json({ message: "Salary structure deleted successfully" });
  } catch (error) {
    console.error("Error deleting salary structure:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};
