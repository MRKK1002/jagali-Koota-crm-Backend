const mongoose = require("mongoose");

const ShiftSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RestaurantEmployee",
      required: true,
    },
    employeeName: { type: String, required: true },
    empId: { type: String, required: true },
    branch: { type: String, required: true },
    shiftName: { type: String },
    shiftType: {
      type: String,
      enum: ["Morning", "Evening", "Night", "Rotational", "Flexible"],
      required: true,
    },
    startTime: { type: String, required: true }, // Format: "HH:MM"
    endTime: { type: String, required: true }, // Format: "HH:MM"
    breakDuration: { type: Number, default: 60 }, // in minutes
    workingHours: { type: Number, required: true },
    overtimeEnabled: { type: Boolean, default: false },
    overtimeRate: { type: Number, default: 1.5 }, // multiplier
    weekendOvertimeRate: { type: Number, default: 2.0 }, // multiplier
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date }, // optional
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Index for faster queries
ShiftSchema.index({ employeeId: 1, isActive: 1 });
ShiftSchema.index({ branch: 1 });
ShiftSchema.index({ effectiveFrom: 1, effectiveTo: 1 });

module.exports =
  mongoose.models.RestaurantShift ||
  mongoose.model("RestaurantShift", ShiftSchema, "restaurantshifts");
