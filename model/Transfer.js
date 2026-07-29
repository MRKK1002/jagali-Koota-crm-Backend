const mongoose = require("mongoose")

const TransferSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "employeeModel",
    },
    employeeModel: {
      type: String,
      required: true,
      enum: ["Staff", "Employee"],
      default: function () {
        return this.businessType === "restaurant" ? "Staff" : "Employee"
      },
    },
    businessType: {
      type: String,
      enum: ["restaurant", "construction"],
      required: true,
    },
    currentPosition: { type: String, required: true },
    newPosition: { type: String, required: true },
    currentDepartment: { type: String, required: true },
    newDepartment: { type: String, required: true },
    effectiveDate: { type: Date, required: true },
    type: { type: String, enum: ["Transfer", "Promotion"], required: true },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "In Process"],
      default: "Pending",
    },
    salaryChange: { type: String, default: "No Change" },
  },
  { timestamps: true },
)

module.exports = mongoose.model("Transfer", TransferSchema)
