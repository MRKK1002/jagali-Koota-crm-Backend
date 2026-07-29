
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const authUserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    role: {
      type: String,
      enum: [
        "Admin",
        "HR Manager",
        "Employee",
        "Project Manager",
        "Procurement Officer",
        "Accountant",
        "subadmin",
        // Restaurant-specific roles
        "Manager",
        "Cashier",
        "Chef",
        "Waiter",
        "Store Manager",
        "Purchase Manager",
      ],
      required: [true, "Role is required"],
    },
    crmType: {
      type: String,
      enum: ["restaurant", "construction", "common"],
      required: [true, "CRM type is required"],
    },
    allowedModules: {
      type: [String],
      default: [],
      // Removed enum to allow any module names
    },
  },
  { timestamps: true }
);

// Hash password before saving
authUserSchema.pre("save", async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) {
    return next();
  }

  try {
    // Generate salt and hash password
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password for login
authUserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("AuthUser", authUserSchema);