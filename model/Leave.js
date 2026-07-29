const mongoose = require("mongoose");

const LeaveSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    leaveType: {
      type: String,
      enum: ["sick", "casual", "earned", "unpaid"],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedDate: {
      type: Date,
    },
    remarks: {
      type: String,
    },
  },
  { timestamps: true }
);

// Index to improve query performance for checking overlapping leaves
LeaveSchema.index({ employeeId: 1, startDate: 1, endDate: 1 });
LeaveSchema.index({ employeeId: 1, status: 1 });

// Validation to prevent end date before start date
LeaveSchema.pre('save', function(next) {
  if (this.endDate < this.startDate) {
    next(new Error('End date cannot be before start date'));
  }
  next();
});

module.exports = mongoose.models.Leave || mongoose.model("Leave", LeaveSchema);
