// const mongoose = require("mongoose")

// const StaffSchema = new mongoose.Schema(
//   {
//     name: {
//       type: String,
//       required: [true, "Name is required"],
//       trim: true,
//     },
//     role: {
//       type: String,
//       required: [true, "Role is required"],
    
//     },
//     salary: {
//       type: Number,
//       required: [true, "Salary is required"],
//       min: [0, "Salary cannot be negative"],
//     },
//     shift: {
//       type: String,
//       required: [true, "Shift is required"],
//       enum: {
//         values: ["Morning", "Evening", "Night"],
//         message: "Shift must be Morning, Evening, or Night",
//       },
//     },
//     joiningDate: {
//       type: Date,
//       required: [true, "Joining date is required"],
//     },
//     mobile: {
//       type: String,
//       required: [true, "Mobile number is required"],
//       match: [/^\d{10}$/, "Mobile number must be exactly 10 digits"],
//     },
//     email: {
//       type: String,
//       trim: true,
//       lowercase: true,
//       match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
//     },
//     isActive: {
//       type: Boolean,
//       default: true,
//     },
//   },
//   {
//     timestamps: true,
//     versionKey: false,
//   }
// )

// module.exports = mongoose.model("Staff", StaffSchema)


const mongoose = require("mongoose")

const StaffSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      unique: true,
      sparse: true, // Allows null values during creation
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    role: {
      type: String,
      required: [true, "Role is required"],
    },
    department: {
      type: String,
      default: "General",
    },
    salary: {
      type: Number,
      required: [true, "Salary is required"],
      min: [0, "Salary cannot be negative"],
    },
    shift: {
      type: String,
      required: [true, "Shift is required"],
      enum: {
        values: ["Morning", "Evening", "Night"],
        message: "Shift must be Morning, Evening, or Night",
      },
    },
    joiningDate: {
      type: Date,
      required: [true, "Joining date is required"],
    },
    mobile: {
      type: String,
      required: [true, "Mobile number is required"],
      match: [/^\d{10}$/, "Mobile number must be exactly 10 digits"],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Local path to stored face image (from registration)
    faceImagePath: {
      type: String,
      default: null,
    },
    // Face embedding vector generated from face-api.js
    faceEmbedding: {
      type: [Number],
      default: undefined,
      select: false, // avoid returning in queries by default
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

// Auto-generate employeeId before saving
StaffSchema.pre('save', async function(next) {
  if (!this.employeeId) {
    const count = await this.constructor.countDocuments();
    this.employeeId = `EMP${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model("Staff", StaffSchema)


