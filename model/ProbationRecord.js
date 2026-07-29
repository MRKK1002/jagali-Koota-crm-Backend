const mongoose = require("mongoose")

const ProbationRecordSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Employee ID is required"],
      refPath: 'employeeModel'
    },
    employeeModel: {
      type: String,
      required: true,
      enum: ['Staff', 'Employee'],
      default: function() {
        return this.businessType === 'restaurant' ? 'Staff' : 'Employee'
      }
    },
    businessType: {
      type: String,
      required: true,
      enum: ["restaurant", "construction"]
    },
    position: {
      type: String,
      required: [true, "Position is required"],
      trim: true,
    },
    department: {
      type: String,
      required: [true, "Department is required"],
      trim: true,
    },
    probationStart: {
      type: Date,
      required: [true, "Probation start date is required"],
    },
    probationEnd: {
      type: Date,
      required: [true, "Probation end date is required"],
    },
    status: {
      type: String,
      enum: {
        values: ["On Probation", "Confirmed", "Extended", "Terminated"],
        message: "Status must be one of 'On Probation', 'Confirmed', 'Extended', 'Terminated'",
      },
      default: "On Probation",
    },
    reviewDate: {
      type: Date,
    },
    performance: {
      type: String,
      enum: {
        values: ["Excellent", "Good", "Average", "Needs Improvement", "Poor"],
        message: "Performance must be one of 'Excellent', 'Good', 'Average', 'Needs Improvement', or 'Poor'",
      },
      default: "Good",
    },
  },
  {
    timestamps: true,
    versionKey: false
  },
)

// Add pre-save middleware to validate employee existence
ProbationRecordSchema.pre('save', async function(next) {
  try {
    const model = this.businessType === 'restaurant' ? 'Staff' : 'Employee'
    const ModelClass = mongoose.model(model)
    const employee = await ModelClass.findById(this.employeeId)
    
    if (!employee) {
      throw new Error(`${model} with ID ${this.employeeId} not found`)
    }
    
    this.employeeModel = model
    next()
  } catch (error) {
    next(error)
  }
})

module.exports = mongoose.model("ProbationRecord", ProbationRecordSchema)
