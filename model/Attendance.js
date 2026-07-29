const mongoose = require("mongoose");

const attendanceProfessionalSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    date: { type: Date, required: true },
    status: {
      type: String,
      enum: ["Present", "Late", "Absent"],
      required: true,
    },
    checkIn: { type: String }, // e.g., "08:45 AM"
    checkOut: { type: String }, // e.g., "05:30 PM"
    hours: { type: String }, // e.g., "8h 45m"
    location: { type: String },
    // Exact location data from Google Maps API
    exactLocation: {
      // Check-in location data
      coordinates: {
        latitude: { type: Number },
        longitude: { type: Number }
      },
      accuracy: { type: Number }, // GPS accuracy in meters
      timestamp: { type: String }, // ISO timestamp
      address: {
        building: { type: String },
        street: { type: String },
        area: { type: String },
        city: { type: String },
        state: { type: String },
        pincode: { type: String },
        fullAddress: { type: String }
      },
      // Check-out location data
      checkoutCoordinates: {
        latitude: { type: Number },
        longitude: { type: Number }
      },
      checkoutAccuracy: { type: Number }, // GPS accuracy in meters for checkout
      checkoutTimestamp: { type: String }, // ISO timestamp for checkout
      checkoutAddress: {
        building: { type: String },
        street: { type: String },
        area: { type: String },
        city: { type: String },
        state: { type: String },
        pincode: { type: String },
        fullAddress: { type: String }
      }
    }
  },
  { timestamps: true }
);

attendanceProfessionalSchema.index(
  { employeeId: 1, date: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "AttendanceConstruction",
  attendanceProfessionalSchema
);
