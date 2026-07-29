/**
 * Initialize Accounts & Finance System
 * This script will set up default chart of accounts and tax configurations
 * for both Restaurant and Construction business types
 */

require("dotenv").config();
const mongoose = require("mongoose");
const ChartOfAccounts = require("../model/ChartOfAccounts");
const TaxConfiguration = require("../model/TaxConfiguration");

const connectDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/hotelvirat",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    console.log("✅ MongoDB Connected Successfully");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error);
    process.exit(1);
  }
};

// Default Chart of Accounts for Restaurant
const getRestaurantAccounts = () => [
  // ASSETS
  { accountCode: "1000", accountName: "Assets", accountType: "Asset", accountCategory: "Current Assets", balanceType: "Debit", level: 1 },
  { accountCode: "1100", accountName: "Current Assets", accountType: "Asset", accountCategory: "Current Assets", balanceType: "Debit", level: 2 },
  { accountCode: "1110", accountName: "Cash on Hand", accountType: "Asset", accountCategory: "Cash & Bank", balanceType: "Debit", level: 3 },
  { accountCode: "1120", accountName: "Restaurant Bank Account", accountType: "Asset", accountCategory: "Cash & Bank", balanceType: "Debit", level: 3 },
  { accountCode: "1130", accountName: "Customer Receivables", accountType: "Asset", accountCategory: "Accounts Receivable", balanceType: "Debit", level: 3 },
  { accountCode: "1140", accountName: "Food Inventory", accountType: "Asset", accountCategory: "Inventory", balanceType: "Debit", level: 3 },
  { accountCode: "1150", accountName: "Beverage Inventory", accountType: "Asset", accountCategory: "Inventory", balanceType: "Debit", level: 3 },
  
  // LIABILITIES
  { accountCode: "2000", accountName: "Liabilities", accountType: "Liability", accountCategory: "Current Liabilities", balanceType: "Credit", level: 1 },
  { accountCode: "2100", accountName: "Current Liabilities", accountType: "Liability", accountCategory: "Current Liabilities", balanceType: "Credit", level: 2 },
  { accountCode: "2110", accountName: "Supplier Payables", accountType: "Liability", accountCategory: "Accounts Payable", balanceType: "Credit", level: 3 },
  { accountCode: "2120", accountName: "GST Payable", accountType: "Liability", accountCategory: "Other Liabilities", balanceType: "Credit", level: 3 },
  { accountCode: "2130", accountName: "TDS Payable", accountType: "Liability", accountCategory: "Other Liabilities", balanceType: "Credit", level: 3 },
  
  // EQUITY
  { accountCode: "3000", accountName: "Owner's Equity", accountType: "Equity", accountCategory: "Owner's Equity", balanceType: "Credit", level: 1 },
  { accountCode: "3100", accountName: "Restaurant Capital", accountType: "Equity", accountCategory: "Capital", balanceType: "Credit", level: 2 },
  { accountCode: "3200", accountName: "Retained Earnings", accountType: "Equity", accountCategory: "Retained Earnings", balanceType: "Credit", level: 2 },
  
  // REVENUE
  { accountCode: "4000", accountName: "Revenue", accountType: "Revenue", accountCategory: "Sales Revenue", balanceType: "Credit", level: 1 },
  { accountCode: "4100", accountName: "Food Sales", accountType: "Revenue", accountCategory: "Sales Revenue", balanceType: "Credit", level: 2 },
  { accountCode: "4200", accountName: "Beverage Sales", accountType: "Revenue", accountCategory: "Sales Revenue", balanceType: "Credit", level: 2 },
  { accountCode: "4300", accountName: "Catering Revenue", accountType: "Revenue", accountCategory: "Service Revenue", balanceType: "Credit", level: 2 },
  
  // EXPENSES
  { accountCode: "5000", accountName: "Expenses", accountType: "Expense", accountCategory: "Operating Expenses", balanceType: "Debit", level: 1 },
  { accountCode: "5100", accountName: "Food Cost", accountType: "Cost of Goods Sold", accountCategory: "Direct Materials", balanceType: "Debit", level: 2 },
  { accountCode: "5200", accountName: "Kitchen Staff Salaries", accountType: "Expense", accountCategory: "Payroll Expenses", balanceType: "Debit", level: 2 },
  { accountCode: "5300", accountName: "Restaurant Rent", accountType: "Expense", accountCategory: "Rent Expenses", balanceType: "Debit", level: 2 },
  { accountCode: "5400", accountName: "Utilities - Restaurant", accountType: "Expense", accountCategory: "Utility Expenses", balanceType: "Debit", level: 2 },
  { accountCode: "5500", accountName: "Marketing Expenses", accountType: "Expense", accountCategory: "Marketing Expenses", balanceType: "Debit", level: 2 },
];

// Default Chart of Accounts for Construction
const getConstructionAccounts = () => [
  // ASSETS
  { accountCode: "C1000", accountName: "Assets", accountType: "Asset", accountCategory: "Current Assets", balanceType: "Debit", level: 1 },
  { accountCode: "C1100", accountName: "Current Assets", accountType: "Asset", accountCategory: "Current Assets", balanceType: "Debit", level: 2 },
  { accountCode: "C1110", accountName: "Cash on Hand", accountType: "Asset", accountCategory: "Cash & Bank", balanceType: "Debit", level: 3 },
  { accountCode: "C1120", accountName: "Construction Bank Account", accountType: "Asset", accountCategory: "Cash & Bank", balanceType: "Debit", level: 3 },
  { accountCode: "C1130", accountName: "Client Receivables", accountType: "Asset", accountCategory: "Accounts Receivable", balanceType: "Debit", level: 3 },
  { accountCode: "C1140", accountName: "Raw Materials Inventory", accountType: "Asset", accountCategory: "Inventory", balanceType: "Debit", level: 3 },
  { accountCode: "C1200", accountName: "Fixed Assets", accountType: "Asset", accountCategory: "Fixed Assets", balanceType: "Debit", level: 2 },
  { accountCode: "C1210", accountName: "Construction Equipment", accountType: "Asset", accountCategory: "Fixed Assets", balanceType: "Debit", level: 3 },
  
  // LIABILITIES
  { accountCode: "C2000", accountName: "Liabilities", accountType: "Liability", accountCategory: "Current Liabilities", balanceType: "Credit", level: 1 },
  { accountCode: "C2100", accountName: "Current Liabilities", accountType: "Liability", accountCategory: "Current Liabilities", balanceType: "Credit", level: 2 },
  { accountCode: "C2110", accountName: "Vendor Payables", accountType: "Liability", accountCategory: "Accounts Payable", balanceType: "Credit", level: 3 },
  { accountCode: "C2120", accountName: "GST Payable", accountType: "Liability", accountCategory: "Other Liabilities", balanceType: "Credit", level: 3 },
  { accountCode: "C2130", accountName: "TDS Payable", accountType: "Liability", accountCategory: "Other Liabilities", balanceType: "Credit", level: 3 },
  
  // EQUITY
  { accountCode: "C3000", accountName: "Owner's Equity", accountType: "Equity", accountCategory: "Owner's Equity", balanceType: "Credit", level: 1 },
  { accountCode: "C3100", accountName: "Construction Capital", accountType: "Equity", accountCategory: "Capital", balanceType: "Credit", level: 2 },
  { accountCode: "C3200", accountName: "Retained Earnings", accountType: "Equity", accountCategory: "Retained Earnings", balanceType: "Credit", level: 2 },
  
  // REVENUE
  { accountCode: "C4000", accountName: "Revenue", accountType: "Revenue", accountCategory: "Sales Revenue", balanceType: "Credit", level: 1 },
  { accountCode: "C4100", accountName: "Project Revenue", accountType: "Revenue", accountCategory: "Sales Revenue", balanceType: "Credit", level: 2 },
  { accountCode: "C4200", accountName: "Consultation Fees", accountType: "Revenue", accountCategory: "Service Revenue", balanceType: "Credit", level: 2 },
  
  // EXPENSES
  { accountCode: "C5000", accountName: "Expenses", accountType: "Expense", accountCategory: "Operating Expenses", balanceType: "Debit", level: 1 },
  { accountCode: "C5100", accountName: "Material Cost", accountType: "Cost of Goods Sold", accountCategory: "Direct Materials", balanceType: "Debit", level: 2 },
  { accountCode: "C5200", accountName: "Labor Cost", accountType: "Cost of Goods Sold", accountCategory: "Direct Labor", balanceType: "Debit", level: 2 },
  { accountCode: "C5300", accountName: "Site Expenses", accountType: "Expense", accountCategory: "Operating Expenses", balanceType: "Debit", level: 2 },
  { accountCode: "C5400", accountName: "Equipment Rental", accountType: "Expense", accountCategory: "Operating Expenses", balanceType: "Debit", level: 2 },
];

// Default Tax Configurations
const getTaxConfigurations = (businessType) => [
  // GST Configurations
  {
    taxType: "GST",
    taxName: "GST 5% - CGST",
    taxCode: `GST-5-CGST-${businessType}`,
    gstType: "CGST",
    gstRate: 2.5,
    businessType,
    effectiveFrom: new Date("2017-07-01"),
    isActive: true,
  },
  {
    taxType: "GST",
    taxName: "GST 5% - SGST",
    taxCode: `GST-5-SGST-${businessType}`,
    gstType: "SGST",
    gstRate: 2.5,
    businessType,
    effectiveFrom: new Date("2017-07-01"),
    isActive: true,
  },
  {
    taxType: "GST",
    taxName: "GST 12% - CGST",
    taxCode: `GST-12-CGST-${businessType}`,
    gstType: "CGST",
    gstRate: 6,
    businessType,
    effectiveFrom: new Date("2017-07-01"),
    isActive: true,
  },
  {
    taxType: "GST",
    taxName: "GST 12% - SGST",
    taxCode: `GST-12-SGST-${businessType}`,
    gstType: "SGST",
    gstRate: 6,
    businessType,
    effectiveFrom: new Date("2017-07-01"),
    isActive: true,
  },
  {
    taxType: "GST",
    taxName: "GST 18% - CGST",
    taxCode: `GST-18-CGST-${businessType}`,
    gstType: "CGST",
    gstRate: 9,
    businessType,
    effectiveFrom: new Date("2017-07-01"),
    isActive: true,
  },
  {
    taxType: "GST",
    taxName: "GST 18% - SGST",
    taxCode: `GST-18-SGST-${businessType}`,
    gstType: "SGST",
    gstRate: 9,
    businessType,
    effectiveFrom: new Date("2017-07-01"),
    isActive: true,
  },
  // TDS Configurations
  {
    taxType: "TDS",
    taxName: "TDS on Professional Fees",
    taxCode: `TDS-194J-${businessType}`,
    tdsSection: "194J",
    tdsRate: 10,
    tdsThreshold: 30000,
    businessType,
    effectiveFrom: new Date(),
    isActive: true,
  },
  {
    taxType: "TDS",
    taxName: "TDS on Contractor Payment",
    taxCode: `TDS-194C-${businessType}`,
    tdsSection: "194C",
    tdsRate: 2,
    tdsThreshold: 100000,
    businessType,
    effectiveFrom: new Date(),
    isActive: true,
  },
];

const initializeAccounts = async () => {
  try {
    console.log("\n🚀 Starting Accounts & Finance Initialization...\n");

    // Check if accounts already exist
    const existingAccounts = await ChartOfAccounts.countDocuments();
    if (existingAccounts > 0) {
      console.log(`⚠️  Found ${existingAccounts} existing accounts`);
      console.log("Do you want to skip initialization? (Existing data will be preserved)");
    }

    // Initialize Restaurant Accounts
    console.log("📊 Creating Restaurant Chart of Accounts...");
    const restaurantAccounts = getRestaurantAccounts();
    let restaurantCount = 0;
    for (const accountData of restaurantAccounts) {
      try {
        const account = new ChartOfAccounts({
          ...accountData,
          businessType: "restaurant",
        });
        await account.save();
        restaurantCount++;
      } catch (err) {
        if (err.code === 11000) {
          console.log(`   ⏭️  Skipping duplicate: ${accountData.accountCode}`);
        } else {
          console.error(`   ❌ Error: ${accountData.accountCode}`, err.message);
        }
      }
    }
    console.log(`✅ Created ${restaurantCount} Restaurant accounts\n`);

    // Initialize Construction Accounts
    console.log("🏗️  Creating Construction Chart of Accounts...");
    const constructionAccounts = getConstructionAccounts();
    let constructionCount = 0;
    for (const accountData of constructionAccounts) {
      try {
        const account = new ChartOfAccounts({
          ...accountData,
          businessType: "construction",
        });
        await account.save();
        constructionCount++;
      } catch (err) {
        if (err.code === 11000) {
          console.log(`   ⏭️  Skipping duplicate: ${accountData.accountCode}`);
        } else {
          console.error(`   ❌ Error: ${accountData.accountCode}`, err.message);
        }
      }
    }
    console.log(`✅ Created ${constructionCount} Construction accounts\n`);

    // Initialize Restaurant Tax Configurations
    console.log("💰 Creating Restaurant Tax Configurations...");
    const restaurantTaxes = getTaxConfigurations("restaurant");
    let restaurantTaxCount = 0;
    for (const taxData of restaurantTaxes) {
      try {
        const tax = new TaxConfiguration(taxData);
        await tax.save();
        restaurantTaxCount++;
      } catch (err) {
        if (err.code === 11000) {
          console.log(`   ⏭️  Skipping duplicate: ${taxData.taxCode}`);
        } else {
          console.error(`   ❌ Error: ${taxData.taxCode}`, err.message);
        }
      }
    }
    console.log(`✅ Created ${restaurantTaxCount} Restaurant tax configs\n`);

    // Initialize Construction Tax Configurations
    console.log("💰 Creating Construction Tax Configurations...");
    const constructionTaxes = getTaxConfigurations("construction");
    let constructionTaxCount = 0;
    for (const taxData of constructionTaxes) {
      try {
        const tax = new TaxConfiguration(taxData);
        await tax.save();
        constructionTaxCount++;
      } catch (err) {
        if (err.code === 11000) {
          console.log(`   ⏭️  Skipping duplicate: ${taxData.taxCode}`);
        } else {
          console.error(`   ❌ Error: ${taxData.taxCode}`, err.message);
        }
      }
    }
    console.log(`✅ Created ${constructionTaxCount} Construction tax configs\n`);

    // Summary
    console.log("═══════════════════════════════════════════════════");
    console.log("🎉 INITIALIZATION COMPLETE!");
    console.log("═══════════════════════════════════════════════════");
    console.log(`✅ Restaurant Accounts: ${restaurantCount}`);
    console.log(`✅ Construction Accounts: ${constructionCount}`);
    console.log(`✅ Restaurant Tax Configs: ${restaurantTaxCount}`);
    console.log(`✅ Construction Tax Configs: ${constructionTaxCount}`);
    console.log(`📊 Total Items Created: ${restaurantCount + constructionCount + restaurantTaxCount + constructionTaxCount}`);
    console.log("═══════════════════════════════════════════════════\n");

    console.log("📝 Next Steps:");
    console.log("1. Start your backend server: cd crm_backend && npm start");
    console.log("2. Test the APIs using Postman");
    console.log("3. Connect the frontend to the backend");
    console.log("4. Start creating journal entries!\n");

  } catch (error) {
    console.error("❌ Initialization Error:", error);
  }
};

// Run initialization
connectDB()
  .then(initializeAccounts)
  .then(() => {
    console.log("✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });


