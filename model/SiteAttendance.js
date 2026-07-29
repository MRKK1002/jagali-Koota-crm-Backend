const mongoose = require("mongoose");

const siteAttendanceSchema = new mongoose.Schema(
  {
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: true,
    },
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker", // Changed from Employee to Worker - site workers are different from office employees
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["Present", "Absent", "Half Day", "Late", "On Leave"],
      required: true,
    },
    checkInTime: {
      type: String, // Format: "HH:MM AM/PM"
    },
    checkOutTime: {
      type: String,
    },
    hoursWorked: {
      type: Number,
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: false, // Made optional - will be added when authentication is implemented
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for site, worker, and date
siteAttendanceSchema.index({ siteId: 1, workerId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("SiteAttendance", siteAttendanceSchema);
