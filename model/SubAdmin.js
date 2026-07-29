const mongoose = require("mongoose");

const permissionSchema = new mongoose.Schema({
  dashboard: { type: Boolean, default: false },
  salesManagement: { type: Boolean, default: false },
  purchaseManagement: { type: Boolean, default: false },
  inventoryManagement: { type: Boolean, default: false },
  menu: { type: Boolean, default: false },
  tableManagement: { type: Boolean, default: false },
  customerManagement: { type: Boolean, default: false },
  hrManagement: { type: Boolean, default: false },
  employee:{type: Boolean, default: false},
  hr:{type: Boolean, default: false},
  attendanceLeave: { type: Boolean, default: false },
  payroll: { type: Boolean, default: false },
  finance: { type: Boolean, default: false },
  reports: { type: Boolean, default: false },
  security: { type: Boolean, default: false },
  alerts: { type: Boolean, default: false },
  kitchenDisplay: { type: Boolean, default: false },
  POS: { type: Boolean, default: false },
  RestaurantDashboard: { type: Boolean, default: false },
  RestaurantSetup: { type: Boolean, default: false },
  MenuManagement: { type: Boolean, default: false },
  StockManagement: { type: Boolean, default: false },
  PurchaseManagement: { type: Boolean, default: false },
  OrderBilling: { type: Boolean, default: false },
  CustomerManagement: { type: Boolean, default: false },
  ReservationsManagement: { type: Boolean, default: false },
  KitchenManagement: { type: Boolean, default: false },
  HRManagement: { type: Boolean, default: false },
  ExpenseManagement: { type: Boolean, default: false },
  RestaurantAnalytics: { type: Boolean, default: false },
  SubAdmin: { type: Boolean, default: false },
  UserManagement: { type: Boolean, default: false },
  SiteManagement: { type: Boolean, default: false },
  allAccess: { type: Boolean, default: false },
});

const subAdminSchema = new mongoose.Schema(
  {
    username: { type: String, trim: true },
    name: { type: String, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { 
      type: String, 
      required: true
    },
    permissions: permissionSchema, // This will store the object with boolean flags
    type: {
      type: String,
      enum: ["common", "restaurant", "construction"],
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active"
    },
    lastLogin: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SubAdmin", subAdminSchema);
