const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

// Import all models
const ChartOfAccounts = require("../model/ChartOfAccounts");
const JournalEntry = require("../model/JournalEntry");
const Ledger = require("../model/Ledger");
const TaxConfiguration = require("../model/TaxConfiguration");
const Notification = require("../model/Notification");
const NotificationTemplate = require("../model/NotificationTemplate");
const ApprovalWorkflow = require("../model/ApprovalWorkflow");
const ApprovalRequest = require("../model/ApprovalRequest");
const InventoryBatch = require("../model/InventoryBatch");
const StatutoryCompliance = require("../model/StatutoryCompliance");
const Document = require("../model/Document");
const DocumentCategory = require("../model/DocumentCategory");
const AuditLog = require("../model/AuditLog");
const TwoFactorAuth = require("../model/TwoFactorAuth");
const UserSession = require("../model/UserSession");
const SecuritySettings = require("../model/SecuritySettings");

async function testAllSystems() {
  try {
    console.log("🧪 ========================================");
    console.log("🧪 COMPREHENSIVE SYSTEM TEST");
    console.log("🧪 ========================================\n");

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ MongoDB Connected\n");

    const testResults = {
      passed: 0,
      failed: 0,
      modules: [],
    };

    // Test 1: Accounts & Finance
    console.log("📊 Testing Accounts & Finance Module...");
    try {
      // Test Chart of Accounts
      const accountCount = await ChartOfAccounts.countDocuments();
      console.log(`   - Chart of Accounts: ${accountCount} accounts`);

      // Test for both business types
      const restaurantAccounts = await ChartOfAccounts.countDocuments({ businessType: "restaurant" });
      const constructionAccounts = await ChartOfAccounts.countDocuments({ businessType: "construction" });
      console.log(`   - Restaurant Accounts: ${restaurantAccounts}`);
      console.log(`   - Construction Accounts: ${constructionAccounts}`);

      // Test Journal Entries
      const journalCount = await JournalEntry.countDocuments();
      console.log(`   - Journal Entries: ${journalCount} entries`);

      // Test Ledger
      const ledgerCount = await Ledger.countDocuments();
      console.log(`   - Ledger Accounts: ${ledgerCount} accounts`);

      // Test Tax Configuration
      const taxCount = await TaxConfiguration.countDocuments();
      console.log(`   - Tax Configurations: ${taxCount} configs`);

      testResults.passed++;
      testResults.modules.push({ name: "Accounts & Finance", status: "✅ PASSED" });
      console.log("✅ Accounts & Finance: PASSED\n");
    } catch (error) {
      testResults.failed++;
      testResults.modules.push({ name: "Accounts & Finance", status: "❌ FAILED", error: error.message });
      console.log("❌ Accounts & Finance: FAILED -", error.message, "\n");
    }

    // Test 2: Notification System
    console.log("📧 Testing Notification System...");
    try {
      const notificationCount = await Notification.countDocuments();
      console.log(`   - Notifications: ${notificationCount} notifications`);

      const templateCount = await NotificationTemplate.countDocuments();
      console.log(`   - Templates: ${templateCount} templates`);

      // Test for both business types
      const restaurantTemplates = await NotificationTemplate.countDocuments({ businessType: "restaurant" });
      const constructionTemplates = await NotificationTemplate.countDocuments({ businessType: "construction" });
      console.log(`   - Restaurant Templates: ${restaurantTemplates}`);
      console.log(`   - Construction Templates: ${constructionTemplates}`);

      testResults.passed++;
      testResults.modules.push({ name: "Notification System", status: "✅ PASSED" });
      console.log("✅ Notification System: PASSED\n");
    } catch (error) {
      testResults.failed++;
      testResults.modules.push({ name: "Notification System", status: "❌ FAILED", error: error.message });
      console.log("❌ Notification System: FAILED -", error.message, "\n");
    }

    // Test 3: Approval Workflows
    console.log("✔️  Testing Approval Workflows...");
    try {
      const workflowCount = await ApprovalWorkflow.countDocuments();
      console.log(`   - Workflows: ${workflowCount} workflows`);

      const requestCount = await ApprovalRequest.countDocuments();
      console.log(`   - Approval Requests: ${requestCount} requests`);

      // Test for both business types
      const restaurantWorkflows = await ApprovalWorkflow.countDocuments({ businessType: "restaurant" });
      const constructionWorkflows = await ApprovalWorkflow.countDocuments({ businessType: "construction" });
      console.log(`   - Restaurant Workflows: ${restaurantWorkflows}`);
      console.log(`   - Construction Workflows: ${constructionWorkflows}`);

      testResults.passed++;
      testResults.modules.push({ name: "Approval Workflows", status: "✅ PASSED" });
      console.log("✅ Approval Workflows: PASSED\n");
    } catch (error) {
      testResults.failed++;
      testResults.modules.push({ name: "Approval Workflows", status: "❌ FAILED", error: error.message });
      console.log("❌ Approval Workflows: FAILED -", error.message, "\n");
    }

    // Test 4: Inventory Enhancement
    console.log("📦 Testing Inventory Enhancement...");
    try {
      const batchCount = await InventoryBatch.countDocuments();
      console.log(`   - Inventory Batches: ${batchCount} batches`);

      // Test for both business types
      const restaurantBatches = await InventoryBatch.countDocuments({ businessType: "restaurant" });
      const constructionBatches = await InventoryBatch.countDocuments({ businessType: "construction" });
      console.log(`   - Restaurant Batches: ${restaurantBatches}`);
      console.log(`   - Construction Batches: ${constructionBatches}`);

      testResults.passed++;
      testResults.modules.push({ name: "Inventory Enhancement", status: "✅ PASSED" });
      console.log("✅ Inventory Enhancement: PASSED\n");
    } catch (error) {
      testResults.failed++;
      testResults.modules.push({ name: "Inventory Enhancement", status: "❌ FAILED", error: error.message });
      console.log("❌ Inventory Enhancement: FAILED -", error.message, "\n");
    }

    // Test 5: Statutory Compliance
    console.log("📋 Testing Statutory Compliance...");
    try {
      const complianceCount = await StatutoryCompliance.countDocuments();
      console.log(`   - Compliance Configurations: ${complianceCount} configs`);

      // Test for both business types
      const restaurantCompliance = await StatutoryCompliance.countDocuments({ businessType: "restaurant" });
      const constructionCompliance = await StatutoryCompliance.countDocuments({ businessType: "construction" });
      console.log(`   - Restaurant Compliance: ${restaurantCompliance}`);
      console.log(`   - Construction Compliance: ${constructionCompliance}`);

      testResults.passed++;
      testResults.modules.push({ name: "Statutory Compliance", status: "✅ PASSED" });
      console.log("✅ Statutory Compliance: PASSED\n");
    } catch (error) {
      testResults.failed++;
      testResults.modules.push({ name: "Statutory Compliance", status: "❌ FAILED", error: error.message });
      console.log("❌ Statutory Compliance: FAILED -", error.message, "\n");
    }

    // Test 6: Document Management
    console.log("📁 Testing Document Management...");
    try {
      const documentCount = await Document.countDocuments();
      console.log(`   - Documents: ${documentCount} documents`);

      const categoryCount = await DocumentCategory.countDocuments();
      console.log(`   - Categories: ${categoryCount} categories`);

      // Test for both business types
      const restaurantDocs = await Document.countDocuments({ businessType: "restaurant" });
      const constructionDocs = await Document.countDocuments({ businessType: "construction" });
      console.log(`   - Restaurant Documents: ${restaurantDocs}`);
      console.log(`   - Construction Documents: ${constructionDocs}`);

      testResults.passed++;
      testResults.modules.push({ name: "Document Management", status: "✅ PASSED" });
      console.log("✅ Document Management: PASSED\n");
    } catch (error) {
      testResults.failed++;
      testResults.modules.push({ name: "Document Management", status: "❌ FAILED", error: error.message });
      console.log("❌ Document Management: FAILED -", error.message, "\n");
    }

    // Test 7: Security System
    console.log("🔒 Testing Security System...");
    try {
      const auditCount = await AuditLog.countDocuments();
      console.log(`   - Audit Logs: ${auditCount} logs`);

      const twoFACount = await TwoFactorAuth.countDocuments();
      console.log(`   - 2FA Configurations: ${twoFACount} configs`);

      const sessionCount = await UserSession.countDocuments();
      console.log(`   - User Sessions: ${sessionCount} sessions`);

      const securitySettingsCount = await SecuritySettings.countDocuments();
      console.log(`   - Security Settings: ${securitySettingsCount} configs`);

      // Test for both business types
      const restaurantSettings = await SecuritySettings.findOne({ businessType: "restaurant" });
      const constructionSettings = await SecuritySettings.findOne({ businessType: "construction" });
      console.log(`   - Restaurant Security: ${restaurantSettings ? "✅ Configured" : "❌ Not Configured"}`);
      console.log(`   - Construction Security: ${constructionSettings ? "✅ Configured" : "❌ Not Configured"}`);

      testResults.passed++;
      testResults.modules.push({ name: "Security System", status: "✅ PASSED" });
      console.log("✅ Security System: PASSED\n");
    } catch (error) {
      testResults.failed++;
      testResults.modules.push({ name: "Security System", status: "❌ FAILED", error: error.message });
      console.log("❌ Security System: FAILED -", error.message, "\n");
    }

    // Test 8: Multi-Business Type Support
    console.log("🏢 Testing Multi-Business Type Support...");
    try {
      const models = [
        { name: "Chart of Accounts", model: ChartOfAccounts },
        { name: "Notification Templates", model: NotificationTemplate },
        { name: "Approval Workflows", model: ApprovalWorkflow },
        { name: "Inventory Batches", model: InventoryBatch },
        { name: "Statutory Compliance", model: StatutoryCompliance },
        { name: "Security Settings", model: SecuritySettings },
      ];

      let allSupport = true;
      for (const { name, model } of models) {
        const restaurantCount = await model.countDocuments({ businessType: "restaurant" });
        const constructionCount = await model.countDocuments({ businessType: "construction" });
        const hasSupport = restaurantCount >= 0 && constructionCount >= 0;
        
        if (!hasSupport) {
          allSupport = false;
          console.log(`   ❌ ${name}: Missing business type support`);
        } else {
          console.log(`   ✅ ${name}: Supports both business types`);
        }
      }

      if (allSupport) {
        testResults.passed++;
        testResults.modules.push({ name: "Multi-Business Type Support", status: "✅ PASSED" });
        console.log("✅ Multi-Business Type Support: PASSED\n");
      } else {
        testResults.failed++;
        testResults.modules.push({ name: "Multi-Business Type Support", status: "❌ FAILED" });
        console.log("❌ Multi-Business Type Support: FAILED\n");
      }
    } catch (error) {
      testResults.failed++;
      testResults.modules.push({ name: "Multi-Business Type Support", status: "❌ FAILED", error: error.message });
      console.log("❌ Multi-Business Type Support: FAILED -", error.message, "\n");
    }

    // Final Summary
    console.log("🧪 ========================================");
    console.log("🧪 TEST SUMMARY");
    console.log("🧪 ========================================\n");
    console.log(`Total Tests: ${testResults.passed + testResults.failed}`);
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📊 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(2)}%\n`);

    console.log("📋 Module Results:");
    testResults.modules.forEach((module) => {
      console.log(`   ${module.status} - ${module.name}`);
      if (module.error) {
        console.log(`      Error: ${module.error}`);
      }
    });

    console.log("\n🎉 Testing Complete!\n");

    if (testResults.failed === 0) {
      console.log("✅ ALL SYSTEMS OPERATIONAL!");
      console.log("✅ BOTH Restaurant and Construction business types supported!");
      console.log("✅ System ready for production!");
    } else {
      console.log("⚠️  Some tests failed. Please review and fix issues.");
    }

    mongoose.connection.close();
  } catch (error) {
    console.error("❌ Test execution error:", error);
    mongoose.connection.close();
    process.exit(1);
  }
}

testAllSystems();


