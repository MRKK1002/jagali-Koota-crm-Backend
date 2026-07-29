const mongoose = require("mongoose");
const { getNextSequenceValue } = require("../../helpers/sequenceHelper");

const EmployeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    employeeId: { type: String}, // Unique ID for display, separate from _id
    empId: { type: String }, // Alias for employeeId for compatibility
    businessType: {
      type: String,
      enum: ["restaurant", "construction"],
      required: true,
    },
    // Common fields
    email: { type: String, unique: true, sparse: true }, // sparse for optional unique
    phone: { type: String },
    phoneNumber: { type: String }, // Alias for phone - used by controllers
    joiningDate: { type: Date, required: false },
    dateOfJoining: { type: Date, required: false }, // Alias for joiningDate - used by controllers
    department: { type: String },
    position: { type: String }, // Unified field for role/designation
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },

    // Face recognition fields
    faceImage: { type: String }, // URL to stored face image
    faceEmbedding: { type: Array }, // Face embedding data for recognition
    hasFaceData: { type: Boolean, default: false }, // Flag to check if face data exists

    // Restaurant specific fields (kept for existing data structure compatibility)
    role: { type: String }, // Can be redundant if 'position' is used
    shift: { type: String, enum: ["Morning", "Evening", "Night"] },
    mobile: { type: String }, // Can be redundant if 'phone' is used

    // Construction specific fields (kept for existing data structure compatibility)
    designation: { type: String }, // Can be redundant if 'position' is used
    adharNumber: { type: String },
    panNumber: { type: String },
    earnings: { type: Object, default: {} },
    deductions: { type: Object, default: {} },
    leaveBalance: { type: Number, default: 0 },

    // Bank Details
    bankName: { type: String },
    accountNumber: { type: String },
    ifscCode: { type: String },
    branch: { type: String },

    // Salary Structure
    salaryType: {
      type: String,
      enum: ["fixed", "daily", "hourly"],
      default: "fixed",
    },
    basicSalary: { type: Number, default: 0 }, // Main salary amount - REQUIRED FIELD
    hra: { type: Number, default: 0 },
    conveyance: { type: Number, default: 0 },
    medicalAllowance: { type: Number, default: 0 },
    specialAllowance: { type: Number, default: 0 },
    pf: { type: Number, default: 0 },
    professionalTax: { type: Number, default: 0 },
    tds: { type: Number, default: 0 },
    otherDeductions: { type: Number, default: 0 },
    // grossSalary and netSalary removed - these are calculated during salary slip generation
    // based on actual attendance, not stored in employee record
  },
  { timestamps: true }
);

// Pre-save hook to generate employeeId and empId if not provided
EmployeeSchema.pre("save", async function (next) {
  // Sync phone and phoneNumber fields
  if (this.phoneNumber && !this.phone) {
    this.phone = this.phoneNumber;
  } else if (this.phone && !this.phoneNumber) {
    this.phoneNumber = this.phone;
  }
  
  // Sync joiningDate and dateOfJoining fields
  if (this.dateOfJoining && !this.joiningDate) {
    this.joiningDate = this.dateOfJoining;
  } else if (this.joiningDate && !this.dateOfJoining) {
    this.dateOfJoining = this.joiningDate;
  }
  
  // Ensure at least one joining date is set
  if (!this.dateOfJoining && !this.joiningDate) {
    this.dateOfJoining = new Date();
    this.joiningDate = new Date();
  }
  
  if (this.isNew) {
    // If empId is provided, use it for both fields
    if (this.empId && this.empId !== "Auto-generated") {
      if (!this.employeeId) {
        this.employeeId = this.empId;
      }
    } else if (this.employeeId) {
      // If employeeId is provided, use it for empId
      this.empId = this.employeeId;
    } else {
      // Generate employeeId - JK prefix for Jagali Koota
      try {
        const sequenceId = `${this.businessType}_employee_id`;
        const nextId = await getNextSequenceValue(sequenceId);
        this.employeeId = `JK-${nextId
          .toString()
          .padStart(3, "0")}`;
        this.empId = this.employeeId;
      } catch (error) {
        console.error("Error generating employee ID:", error);
        // Fallback to timestamp-based ID if sequence fails
        const timestamp = Date.now().toString().slice(-3);
        this.employeeId = `JK-${timestamp}`;
        this.empId = this.employeeId;
      }
    }
  } else {
    // On update, keep fields in sync
    if (this.isModified('employeeId') && this.employeeId && !this.empId) {
      this.empId = this.employeeId;
    } else if (this.isModified('empId') && this.empId && !this.employeeId) {
      this.employeeId = this.empId;
    }
  }
  next();
});

module.exports = mongoose.models.RestaurantEmployee || mongoose.model("RestaurantEmployee", EmployeeSchema, "restaurantemployees");
