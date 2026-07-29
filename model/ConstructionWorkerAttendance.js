const mongoose = require("mongoose");

const constructionWorkerAttendanceSchema = new mongoose.Schema(
  {
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ConstructionWorker",
      required: true,
    },
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["Present", "Absent", "Late", "Half Day"],
      required: true,
    },
    checkInTime: {
      type: Date,
    },
    checkOutTime: {
      type: Date,
    },
    workingHours: {
      type: Number, // in hours
      default: 0,
    },
    overtimeHours: {
      type: Number,
      default: 0,
    },
    markedBy: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    location: {
      latitude: Number,
      longitude: Number,
      address: String,
    },
    dailyWage: {
      type: Number,
      required: true,
    },
    totalEarnings: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one attendance record per worker per date
constructionWorkerAttendanceSchema.index(
  { workerId: 1, date: 1 },
  { unique: true }
);
constructionWorkerAttendanceSchema.index({ siteId: 1, date: 1 });
constructionWorkerAttendanceSchema.index({ date: 1, status: 1 });

// Calculate total earnings based on status and hours
constructionWorkerAttendanceSchema.pre("save", function (next) {
  if (this.status === "Present") {
    this.totalEarnings = this.dailyWage;
  } else if (this.status === "Half Day") {
    this.totalEarnings = this.dailyWage * 0.5;
  } else if (this.status === "Late") {
    this.totalEarnings = this.dailyWage * 0.9; // 10% deduction for late
  } else {
    this.totalEarnings = 0;
  }

  // Add overtime earnings
  if (this.overtimeHours > 0) {
    const overtimeRate = (this.dailyWage / 8) * 1.5; // 1.5x rate for overtime
    this.totalEarnings += this.overtimeHours * overtimeRate;
  }

  next();
});

module.exports = mongoose.model(
  "ConstructionWorkerAttendance",
  constructionWorkerAttendanceSchema
);
