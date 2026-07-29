const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  street: {
    type: String,
    required: true,
    trim: true,
  },
  city: {
    type: String,
    required: true,
    trim: true,
  },
  state: {
    type: String,
    required: true,
    trim: true,
  },
  country: {
    type: String,
    required: true,
    trim: true,
  },
});

const contactSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
});

const openingHoursSchema = new mongoose.Schema({
  mondayToFriday: {
    type: String,
    default: "11:00 AM - 11:00 PM",
  },
  saturday: {
    type: String,
    default: "11:00 AM - 12:00 AM",
  },
  sunday: {
    type: String,
    default: "12:00 PM - 10:00 PM",
  },
});

const restaurantSchema = new mongoose.Schema(
  {
    branchName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    restaurantName: {
      type: String,
      required: false,
      trim: true,
      maxlength: 100,
    },
    gstNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    address: {
      type: addressSchema,
      required: true,
    },
    contact: {
      type: contactSchema,
      required: true,
    },
    openingHours: {
      type: openingHoursSchema,
      default: () => ({}),
    },
    image: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
restaurantSchema.index({ branchName: 1 });
restaurantSchema.index({ restaurantName: 1 });
restaurantSchema.index({ gstNumber: 1 });
restaurantSchema.index({ "address.city": 1, "address.state": 1 });

// Ensure virtual fields are serialized
restaurantSchema.set("toJSON", { virtuals: true });
restaurantSchema.set("toObject", { virtuals: true });

// Virtual for full address
restaurantSchema.virtual("fullAddress").get(function () {
  // Check if address exists before accessing its properties
  if (!this.address) {
    return "";
  }

  let address = `${this.address.street}, ${this.address.city}, ${this.address.state}`;

  if (this.address.pincode) {
    address += ` - ${this.address.pincode}`;
  }

  address += `, ${this.address.country}`;
  return address;
});

module.exports = mongoose.model("RestaurantProfile", restaurantSchema);

