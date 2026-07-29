// const mongoose = require("mongoose");

// const employeeRegistrationSchema = new mongoose.Schema(
//   {
//     name: { type: String, required: true },
//     empId: { type: String, required: true, unique: true },
//     designation: { type: String, required: true },
//     department: { type: String, required: true },
//     dateOfJoining: { type: Date, required: true },
//     bankName: { type: String, required: true },
//     accountNumber: { type: String, required: true },
//     ifscCode: { type: String, required: true },
//     branch: { type: String, required: true },
//     basicSalary: { type: Number, required: true, min: 0 }, // Changed to Number
//     salaryType: { type: String, enum: ["fixed", "variable"], default: "fixed" },
//     hra: { type: Number, default: 0, min: 0 },
//     conveyance: { type: Number, default: 0, min: 0 },
//     medicalAllowance: { type: Number, default: 0, min: 0 },
//     specialAllowance: { type: Number, default: 0, min: 0 },
//     pf: { type: Number, default: 0, min: 0 },
//     professionalTax: { type: Number, default: 0, min: 0 },
//     tds: { type: Number, default: 0, min: 0 },
//     otherDeductions: { type: Number, default: 0, min: 0 },
//     grossSalary: { type: Number, required: true, min: 0 },
//     netSalary: { type: Number, required: true, min: 0 },
//   },
//   { timestamps: true }
// );

// const EmployeeRegistration = mongoose.model(
//   "EmployeeRegistration",
//   employeeRegistrationSchema
// );
// module.exports = EmployeeRegistration;
const mongoose = require("mongoose");

const employeeRegistrationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    empId: { type: String, unique: true, sparse: true },
    designation: { type: String, required: true },
    department: { type: String, required: true },
    dateOfJoining: { type: Date, required: true },
    phoneNumber: { type: String },
    email: { type: String },

    // Bank Details
    bankName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    ifscCode: { type: String, required: true },
    branch: { type: String, required: true },

    // Salary Structure
    basicSalary: { type: Number, required: true, min: 0 },
    salaryType: {
      type: String,
      enum: ["fixed", "daily", "hourly"],
      default: "fixed",
    },
    hra: { type: Number, default: 0, min: 0 },
    conveyance: { type: Number, default: 0, min: 0 },
    medicalAllowance: { type: Number, default: 0, min: 0 },
    specialAllowance: { type: Number, default: 0, min: 0 },
    pf: { type: Number, default: 0, min: 0 },
    professionalTax: { type: Number, default: 0, min: 0 },
    tds: { type: Number, default: 0, min: 0 },
    otherDeductions: { type: Number, default: 0, min: 0 },
    grossSalary: { type: Number, required: true, min: 0 },
    netSalary: { type: Number, required: true, min: 0 },

    // Face Recognition Fields
    photo: { type: String }, // Path to stored face image
    faceImage: { type: String }, // URL to stored face image
    faceEmbedding: { type: Array }, // Face embedding data for recognition
    hasFaceData: { type: Boolean, default: false }, // Flag to check if face data exists

    // Business and Status
    businessType: {
      type: String,
      enum: ["restaurant", "construction"],
      default: "restaurant",
    },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  },
  { timestamps: true }
);

// Pre-save hook to generate empId if not provided
employeeRegistrationSchema.pre("save", async function (next) {
  console.log("Pre-save hook called. isNew:", this.isNew, "empId:", this.empId);
  if (this.isNew && (!this.empId || this.empId === "Auto-generated")) {
    const count = await mongoose.model("EmployeeRegistration").countDocuments();
    this.empId = `EMP-${(count + 1).toString().padStart(4, "0")}`;
    console.log("Generated empId:", this.empId);
  }
  next();
});

const EmployeeRegistration = mongoose.model(
  "EmployeeRegistration",
  employeeRegistrationSchema
);
module.exports = EmployeeRegistration;
