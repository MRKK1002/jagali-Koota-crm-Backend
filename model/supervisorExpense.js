// const mongoose = require("mongoose");

// const supervisorExpenseSchema = new mongoose.Schema(
//   {
//     amount: {
//       type: Number,
//       required: [true, "Amount is required"],
//       min: [0, "Amount cannot be negative"],
//     },
//     description: {
//       type: String,
//       required: [true, "Description is required"],
//       trim: true,
//       maxlength: [200, "Description cannot exceed 200 characters"],
//     },
//     category: {
//       type: String,
//       required: [true, "Category is required"],
//       enum: [
//         "Materials",
//         "Labor",
//         "Equipment",
//         "Food",
//         "Transportation",
//         "Utilities",
//         "Other",
//       ],
//     },
//     date: {
//       type: Date,
//       default: Date.now,
//     },
//     status: {
//       type: String,
//       enum: ["pending", "approved", "rejected"],
//       default: "pending",
//     },

//     receipt: {
//       type: String,
//       default: "No receipt",
//     },
//     submittedBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },
//     project: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Project",
//       required: true,
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// // ✅ Indexes
// supervisorExpenseSchema.index({ status: 1 });
// supervisorExpenseSchema.index({ category: 1 });
// supervisorExpenseSchema.index({ date: 1 });

// // ✅ Correct Export
// module.exports = mongoose.model("SupervisorExpense", supervisorExpenseSchema);


const mongoose = require("mongoose");

const supervisorExpenseSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    },

    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [200, "Description cannot exceed 200 characters"],
    },

    // ✅ CATEGORY dynamic from Vendor API (NO ENUM!)
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
    },

    date: {
      type: Date,
      default: Date.now,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    receipt: {
      type: String,
      default: "No receipt",
    },

    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
  },
  { timestamps: true }
);

// Create index for better performance
supervisorExpenseSchema.index({ project: 1, createdAt: -1 });
supervisorExpenseSchema.index({ status: 1 });

module.exports = mongoose.model("SupervisorExpense", supervisorExpenseSchema);