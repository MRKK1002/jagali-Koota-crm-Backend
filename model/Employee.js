const mongoose = require("mongoose");

const EmployeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    employeeId: { type: String, unique: true, sparse: true, required: false }, // Auto-generated, unique ID for display
    empId: { type: String, unique: true, sparse: true }, // Alias for employeeId for compatibility
    businessType: {
      type: String,
      enum: ["restaurant", "construction"],
      required: true,
    },
    // Common fields
    email: { type: String, unique: true, sparse: true }, // Made optional for compatibility
    phone: { type: String }, // Made optional for compatibility
    phoneNumber: { type: String }, // Added for compatibility
    joiningDate: { type: Date, required: true },
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
    // Document uploads
    aadharCardImage: { type: String }, // URL to Aadhar card image
    panCardImage: { type: String }, // URL to PAN card image
    bankPassbookImage: { type: String }, // URL to bank passbook image
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
      enum: ["monthly", "daily", "hourly", "fixed"],
      default: "monthly",
    },
    basicSalary: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    allowances: { type: Number, default: 0 },
    conveyance: { type: Number, default: 0 },
    medicalAllowance: { type: Number, default: 0 },
    specialAllowance: { type: Number, default: 0 },
    pfDeduction: { type: Number, default: 0 },
    esiDeduction: { type: Number, default: 0 },
    taxDeduction: { type: Number, default: 0 },
    pf: { type: Number, default: 0 },
    professionalTax: { type: Number, default: 0 },
    tds: { type: Number, default: 0 },
    otherDeductions: { type: Number, default: 0 },
    grossSalary: { type: Number, default: 0 },
    netSalary: { type: Number, default: 0 },
    address: { type: String },
  },
  { timestamps: true }
);

// Pre-save hook to generate employeeId and empId if not provided
EmployeeSchema.pre("save", async function (next) {
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
      // Generate employeeId based on businessType if neither is provided
      const count = await mongoose.model("Employee").countDocuments();
      this.employeeId = `${this.businessType.substring(0, 3).toUpperCase()}-${(
        count + 1
      )
        .toString()
        .padStart(4, "0")}`;
      this.empId = this.employeeId;
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

module.exports = mongoose.models.Employee || mongoose.model("Employee", EmployeeSchema);
