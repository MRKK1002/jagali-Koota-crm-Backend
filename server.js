const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const fs = require("fs");
const path = require("path");
const dns = require("dns");

dotenv.config();

const app = express();

// Disable ETag so responses are always 200 (not 304 Not Modified)
app.set("etag", false);

app.use(express.json());
app.use(cors({ origin: "*", methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], allowedHeaders: ["Content-Type", "Authorization"] }));

// Disable caching for all API responses
app.use((req, res, next) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/authUser") || req.path.startsWith("/restaurant") || req.path.startsWith("/UOM") || req.path.startsWith("/subAdmin")) {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
  }
  next();
});

app.use(morgan("dev"));

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "img-src": ["'self'", "data:", "blob:", "https:", "http:"],
        "connect-src": ["'self'", "data:", "blob:", "https:", "http:"],
        "media-src": ["'self'", "blob:", "data:", "https:", "http:"],
        "worker-src": ["'self'", "blob:", "data:"],
        "frame-src": ["'self'", "blob:", "data:"],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// ─── Upload directories ────────────────────────────────────────────────────
const createDirIfNotExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
};
["uploads", "uploads/profile", "uploads/category", "uploads/menu", "uploads/offer", "uploads/table"].forEach(createDirIfNotExists);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ─── Cron: daily attendance ────────────────────────────────────────────────
const cron = require("node-cron");
const { processDailyAttendance } = require("./controller/attendanceMasterController");

cron.schedule("59 23 * * *", async () => {
  try {
    const mockReq = { body: { date: new Date().toISOString().split("T")[0] } };
    const mockRes = {
      status: (code) => ({
        json: (data) => {
          if (code === 200) console.log("Daily attendance processing completed:", data.message);
          else console.error("Daily attendance processing failed:", data);
        },
      }),
    };
    await processDailyAttendance(mockReq, mockRes);
  } catch (error) {
    console.error("Error in daily attendance processing:", error);
  }
});

// ─── MongoDB Connection ────────────────────────────────────────────────────

// Force Google DNS so Atlas SRV records always resolve
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

let isConnecting = false;
let reconnectTimer = null;

async function connectToMongoDB(mongoUri) {
  // Prevent multiple simultaneous connection attempts
  if (isConnecting) return;
  if (mongoose.connection.readyState === 1) return; // already connected

  isConnecting = true;
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }

  const opts = {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000,
    retryWrites: true,
    retryReads: true,
    family: 4,
  };

  try {
    await mongoose.connect(mongoUri, opts);
    console.log("✅ MongoDB Connected");
    isConnecting = false;

    // Wait for db to be fully ready before using it
    mongoose.connection.once("open", () => {
      if (mongoose.connection.db) {
        mongoose.connection.db.collection("grns").dropIndex("grnId_1").catch(() => {});
      }
    });

  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    isConnecting = false;
    // Retry after 8 seconds
    reconnectTimer = setTimeout(() => connectToMongoDB(mongoUri), 8000);
  }
}

if (!process.env.MONGO_URI) {
  console.error("⚠️  MONGO_URI is not set in .env");
} else {
  connectToMongoDB(process.env.MONGO_URI);
}

mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB error:", err.message);
  isConnecting = false;
});

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️  MongoDB disconnected — will retry in 8s");
  isConnecting = false;
  if (process.env.MONGO_URI) {
    reconnectTimer = setTimeout(() => connectToMongoDB(process.env.MONGO_URI), 8000);
  }
});

mongoose.connection.on("reconnected", () => {
  console.log("✅ MongoDB reconnected");
  isConnecting = false;
});
const restaurantCounterOrderRoutes = require("./Restaurant/RestaurantRoutes/RestaurantCounterOrderRoutes");
const restaurantBranchRoutes     = require("./Restaurant/RestaurantRoutes/RestaurantBranchRoutes");
const restaurantProfileRoutes    = require("./Restaurant/RestaurantRoutes/RestaurantProfileRoutes");
const restaurantTableRoutes      = require("./Restaurant/RestaurantRoutes/RestaurantTabelRoutes");
const restaurantGRNRoutes        = require("./Restaurant/RestaurantRoutes/RestaurantGoodReceiptNotesRoutes");
const restaurantSupplierRoutes   = require("./Restaurant/RestaurantRoutes/RestaurantSupplierRoutes");
const restaurantPurchaseRoutes   = require("./Restaurant/RestaurantRoutes/RestaurantPurchaseRoutes");
const restaurantInvoiceRoutes    = require("./Restaurant/RestaurantRoutes/RestaurantInvoiceRoutes");
const restaurantPaymentRoutes    = require("./Restaurant/RestaurantRoutes/RestaurantPaymentRoutes");
const restaurantMenuRoutes       = require("./routes/restaurantMenuRoutes");
const recipeRoutes               = require("./Restaurant/RestaurantRoutes/RestaurantRecipeRoutes");
const rawMaterialRoutes          = require("./Restaurant/RestaurantRoutes/RestaurantRawMaterialRoutes");
const stockInwardRoutes          = require("./Restaurant/RestaurantRoutes/RestaurantStockInvardRoutes");
const storeLocationRoutes        = require("./Restaurant/RestaurantRoutes/RestaurantStoreLocationRoutes");
const inventoryDistributionRoutes = require("./Restaurant/routes/inventoryDistributionRoutes");
const hrmsRoutes                 = require("./Restaurant/RestaurantRoutes/RestaurantHrmsRoutes");
const resInventoryRoutes         = require("./Restaurant/RestaurantRoutes/RestaurantStockRoutes");
const userRoutes             = require("./routes/userRoutes");
const categoryRoutes         = require("./routes/categoryRoutes");
const subcategoryRoutes      = require("./routes/subcategoryRoutes");
const menuRoutes             = require("./routes/menuRoutes");
const cartRoutes             = require("./routes/cartRoutes");
const orderRoutes            = require("./routes/orderRoutes");
const couponRoutes           = require("./routes/couponRoutes");
const aboutUsRoutes          = require("./routes/aboutUsRoutes");
const helpSupportRoutes      = require("./routes/helpSupportRoutes");
const termsRoutes            = require("./routes/termsRoutes");
const addressRoutes          = require("./routes/addressRoutes");
const adminRoutes            = require("./routes/adminRoutes");
const counterLoginRoutes     = require("./routes/counterLoginRoutes");
const customerDetailsRoutes  = require("./routes/customerDetailsRoutes");
const counterInvoiceRoutes   = require("./routes/counterInvoiceRoutes");
const staffLoginRoutes       = require("./routes/staffLoginRoutes");
const peopleSelectionRoutes  = require("./routes/peopleSelectionRoutes");
const staffOrderRoutes       = require("./routes/staffOrderRoutes");
const counterOrderRoutes     = require("./routes/counterOrderRoutes");
const counterBillRoutes      = require("./routes/counterBillRoutes");
const staffInvoiceRoutes     = require("./routes/staffInvoiceRoutes");
const customerRoutes         = require("./routes/customerRoutes");
const supplierRoutes         = require("./routes/supplierRoutes");
const reservationRoutes      = require("./routes/reservationRoutes");
const expenseRoutes          = require("./routes/expenseRoutes");
const payrollRoutes          = require("./routes/payrollRoutes");
const staffRoutes            = require("./routes/staffRoutes");
const stockRoutes            = require("./routes/stockRoutes");
const storeInventoryRoutes   = require("./routes/storeInventoryRoutes");
const distributionRoutes     = require("./routes/distributionRoutes");
const kitchenRoutes          = require("./routes/kitchenRoutes");
const kitchenDisplayRoutes   = require("./routes/kitchenDisplayRoutes");
const kitchenPrinterRoutes   = require("./routes/kitchenPrinterRoutes");
const salesReportRoutes      = require("./routes/salesReport");
const newRecipeRequirementRoutes = require("./routes/newRecipeRequirementRoutes");
const configurationRoutes    = require("./routes/configurationRoutes");
const employeeRoutes         = require("./routes/employeeRoutes");
const employeeAuthRoutes     = require("./routes/employeeAuthRoutes");
const employeeRegistrationRoutes = require("./routes/employeeRegistrationRoutes");
const employeeAttendanceRoutes   = require("./routes/employeeAttendanceRoutes");
const subAdminRoutes         = require("./routes/subAdminRoutes");
const authUser               = require("./routes/authRoutes");
const settingsRoutes         = require("./routes/settingsRoutes");
const claimRoutes            = require("./routes/claimRoutes");
const expenseManagementRoutes = require("./routes/expenseManagementRoutes");
const departmentRoutes       = require("./routes/departmentRoutes");
// Attendance / HR
const attendanceMasterRoutes = require("./routes/attendanceMaster");
const attendanceRecordRoutes = require("./routes/attendanceRecord");
const leaveRoutes            = require("./routes/leaveRoutes");
const salarySlipRoutes       = require("./routes/salarySlipRoutes");
const salaryStructureRoutes  = require("./routes/salaryStructureRoutes");
const hrsPayrollRoutes       = require("./routes/payrollRoutesConstruction");
const simpleAttendanceRoutes = require("./routes/simpleAttendanceRoutes");
const holidayRoutes          = require("./routes/holidayRoutes");
const probationRoutes        = require("./routes/probationRoutes");
const accountsRoutes         = require("./routes/accountsRoutes");
const journalRoutes          = require("./routes/journalRoutes");
const ledgerRoutes           = require("./routes/ledgerRoutes");
const financialStatementRoutes = require("./routes/financialStatementRoutes");
const taxRoutes              = require("./routes/taxRoutes");
const expenseAdminRoutes     = require("./routes/expenseAdminRoutes");
const accountantExpenseRoutes = require("./routes/accountantExpenseRoutes");
const crmRoutes              = require("./routes/crmRoutes");
const salesRoutes            = require("./routes/salesRoutes");
const leadRoutes             = require("./routes/leadRoutes");
const opportunityRoutes      = require("./routes/opportunityRoutes");
const followUpRoutes         = require("./routes/followUpRoutes");
const communicationRoutes    = require("./routes/communicationRoutes");
const ticketRoutes           = require("./routes/ticketRoutes");
const contractRoutes         = require("./routes/contractRoutes");
const deliveryRoutes         = require("./routes/deliveryRoutes");
const notificationRoutes     = require("./routes/notificationRoutes");
const approvalRoutes         = require("./routes/approvalRoutes");
const securityRoutes         = require("./routes/securityRoutes");
const auditLogRoutes         = require("./routes/auditLogRoutes");
const taskRoutes             = require("./routes/taskRoutes");
const alertRoutes            = require("./routes/alertRoutes");
const transferRoutes         = require("./routes/transferRoutes");
const resUOMroutes           = require("./routes/resUOMroute");
const resTaxSlabRoutes       = require("./routes/resTaxSlabRoute");
const resSupplierRoutes      = require("./routes/resSupplierRoute");
const resRawMaterialRoutes   = require("./routes/resRawMaterialRoute");
const materialCategoryRoutes = require("./routes/materialCategoryRoutes");
const restaurantRoomRoutes   = require("./routes/restaurantRoomRoutes");
const resStockRoutes         = require("./routes/resStockRoutes");
const purchaseUserRoutes     = require("./routes/purchaseUserRoutes");
const productSubmissionRoutes = require("./routes/productSubmissionRoutes");
const vendorRoutes           = require("./routes/vendorRoutes");
const feedbackRoutes         = require("./routes/feedbackRoutes");
app.use("/api/v1/hotel",                      restaurantProfileRoutes);
app.use("/api/v1/hotel/branch",               restaurantBranchRoutes);
app.use("/api/v1/hotel/table",                restaurantTableRoutes);
app.use("/api/v1/hotel/grn",                  restaurantGRNRoutes);
app.use("/api/v1/hotel/category",             categoryRoutes);
app.use("/api/v1/hotel/subcategory",          subcategoryRoutes);
app.use("/api/v1/hotel/menu",                 menuRoutes);
app.use("/api/v1/hotel/recipemanagement",     menuRoutes);
app.use("/api/v1/hotel/cart",                 cartRoutes);
app.use("/api/v1/hotel/order",                orderRoutes);
app.use("/api/v1/hotel/coupon",               couponRoutes);
app.use("/api/v1/hotel/about-us",             aboutUsRoutes);
app.use("/api/v1/hotel/help-support",         helpSupportRoutes);
app.use("/api/v1/hotel/terms",                termsRoutes);
app.use("/api/v1/hotel/address",              addressRoutes);
app.use("/api/v1/hotel/admin-auth",           adminRoutes);
app.use("/api/v1/hotel/counter-auth",         counterLoginRoutes);
app.use("/api/v1/hotel/customer-details",     customerDetailsRoutes);
app.use("/api/v1/hotel/counter-invoice",      counterInvoiceRoutes);
app.use("/api/v1/hotel/staff-auth",           staffLoginRoutes);
app.use("/api/v1/hotel/people-selection",     peopleSelectionRoutes);
app.use("/api/v1/hotel/staff-order",          staffOrderRoutes);
app.use("/api/v1/hotel/counter-order",        counterOrderRoutes);
app.use("/api/v1/hotel/counter-bill",         counterBillRoutes);
app.use("/api/v1/hotel/staff-invoice",        staffInvoiceRoutes);
app.use("/api/v1/hotel/recipes",              recipeRoutes);
app.use("/api/v1/hotel/customer",             customerRoutes);
app.use("/api/v1/hotel/supplier",             supplierRoutes);
app.use("/api/v1/hotel/raw-material",         rawMaterialRoutes);
app.use("/api/v1/hotel/reservation",          reservationRoutes);
app.use("/api/v1/hotel/expense",              expenseRoutes);
app.use("/api/v1/hotel/payroll",              payrollRoutes);
app.use("/api/v1/hotel/staff",                staffRoutes);
app.use("/api/v1/hotel/store-location",       storeLocationRoutes);
app.use("/api/v1/hotel/stock-inward",         stockInwardRoutes);
app.use("/api/v1/hotel/stock",                stockRoutes);
app.use("/api/v1/hotel/distribution",         distributionRoutes);
app.use("/api/v1/hotel/inventory-distribution", inventoryDistributionRoutes);
app.use("/api/v1/hotel/indent", require("./Restaurant/RestaurantRoutes/RestaurantIndentRoutes"));
app.use("/api/v1/hotel/departments", require("./routes/departmentMasterRoutes"));
app.use("/api/v1/hotel/recipe-master", require("./Restaurant/RestaurantRoutes/RestaurantRecipeMasterRoutes"));
app.use("/api/v1/hotel/department-stock", require("./Restaurant/RestaurantRoutes/DepartmentStockRoutes"));
app.use("/api/v1/hotel/store-inventory",      storeInventoryRoutes);
app.use("/api/v1/hotel/inventory",            resInventoryRoutes);
app.use("/api/v1/hotel/user-auth",            userRoutes);
app.use("/api/v1/hotel/purchase-user-auth",   purchaseUserRoutes);
app.use("/api/v1/hotel/product-submission",   productSubmissionRoutes);
app.use("/api/v1/hotel/vendor",               vendorRoutes);
app.use("/api/v1/hotel/matCategory",          materialCategoryRoutes);
app.use("/api/v1/hotel/matRawMaterial",       resRawMaterialRoutes);
app.use("/api/v1/hotel/sales-report",         salesReportRoutes);
app.use("/api/v1/hotel/restaurant-menu",      restaurantMenuRoutes);
app.use("/api/v1/hotel/kitchen-printer",      kitchenPrinterRoutes);
app.use("/api/v1/hotel/employee",             employeeRoutes);
app.use("/api/v1/hotel/feedback",             feedbackRoutes);
// Restaurant purchase/payment/invoice/supplier
app.use("/api/v1/restaurant/supplier",        restaurantSupplierRoutes);
app.use("/api/v1/restaurant/purchase-orders", restaurantPurchaseRoutes);
app.use("/api/v1/restaurant/invoice",         restaurantInvoiceRoutes);
app.use("/api/v1/restaurant/payment",         restaurantPaymentRoutes);
app.use("/api/v1/restaurant/menu",            restaurantRoomRoutes);
app.use("/api/v1/restaurant/quotation",       require("./Restaurant/RestaurantRoutes/RestaurantQuotationRoutes"));
app.use("/api/v1/restaurant/counter",         restaurantCounterOrderRoutes);
// Kitchen
app.use("/api/kitchen",                       kitchenRoutes);
app.use("/api/v1/kds",                        kitchenDisplayRoutes);
// HRMS / Attendance
app.use("/api/v1/hrms",                       hrmsRoutes);
app.use("/api/v1/attendance-master",          attendanceMasterRoutes);
app.use("/api/v1/attendance-record",          attendanceRecordRoutes);
app.use("/api/v1/attendance",                 simpleAttendanceRoutes);
app.use("/api/v1/leaves",                     leaveRoutes);
app.use("/api/v1/payroll",                    hrsPayrollRoutes);
app.use("/api/v1/salary-slip",                salarySlipRoutes);
app.use("/salary-structure",                  salaryStructureRoutes);
app.use("/holiday",                           holidayRoutes);
// Employees
app.use("/api/v1/employees",                  employeeRoutes);
app.use("/api/v1/employee-auth",              employeeAuthRoutes);
app.use("/api/v1/employee",                   employeeRegistrationRoutes);
app.use("/api/v1/employee/attendance",        employeeAttendanceRoutes);
app.use("/api/v1/config/employee",            employeeRoutes);
app.use("/api/v1/config/departments",         departmentRoutes);
app.use("/api/v1/config/configuration",       configurationRoutes);
app.use("/api/v1/accounts",                   accountsRoutes);
app.use("/api/v1/journal",                    journalRoutes);
app.use("/api/v1/ledger",                     ledgerRoutes);
app.use("/api/v1/financial-statements",       financialStatementRoutes);
app.use("/api/v1/tax",                        taxRoutes);
app.use("/api/accountant",                    accountantExpenseRoutes);
app.use("/api/v1/subadmin",                   subAdminRoutes);
app.use("/api/v1/auth",                       authUser);
app.use("/api/v1/common/transfers",           transferRoutes);
app.use("/api/v1/common/probation",           probationRoutes);
app.use("/api/settings",                      settingsRoutes);
app.use("/api/claims",                        claimRoutes);
app.use("/api/expenses",                      expenseManagementRoutes);

// CRM / Sales
app.use("/api/v1/sales",                      salesRoutes);
app.use("/api/v1/crm",                        crmRoutes);
app.use("/lead",                              leadRoutes);
app.use("/opportunities",                     opportunityRoutes);
app.use("/followUp",                          followUpRoutes);
app.use("/communication",                     communicationRoutes);
app.use("/ticket",                            ticketRoutes);
app.use("/contract",                          contractRoutes);
app.use("/delivery",                          deliveryRoutes);
app.use("/salesOrder",                        salesRoutes);
app.use("/api/v1/notifications",              notificationRoutes);
app.use("/api/v1/approvals",                  approvalRoutes);
app.use("/api/v1/security",                   securityRoutes);
app.use("/auditLog",                          auditLogRoutes);
app.use("/api/new-recipe-requirements",       newRecipeRequirementRoutes);
app.use("/api/v1/hotel/restaurant-menu",      restaurantMenuRoutes);
app.use("/api/users",                         userRoutes);
app.use("/UOM",                               resUOMroutes);
app.use("/api/v1/unit-conversion",            require("./routes/unitConversionRoutes"));
app.use("/taxSlab",                           resTaxSlabRoutes);
app.use("/res/supplier",                      resSupplierRoutes);
app.use("/subAdmin",                          subAdminRoutes);
app.use("/authUser",                          authUser);

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ success: true, message: "Server is running", timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// Serve frontend build
app.use(express.static(path.join(__dirname, "build")));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/") || req.path.startsWith("/UOM")) return next();
  return res.sendFile(path.join(__dirname, "build", "index.html"));
});
const PORT = process.env.PORT || 5000;
const http = require("http");
const { initializeSocketIO } = require("./socketio");

const server = http.createServer(app);
initializeSocketIO(server);

if (process.env.NODE_ENV !== "test") {
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  }).on("error", (err) => {
    if (err.code === "EADDRINUSE") { console.error(`Port ${PORT} already in use.`); process.exit(1); }
  });
} else {
  module.exports = app;
}
module.exports = { app, server };
