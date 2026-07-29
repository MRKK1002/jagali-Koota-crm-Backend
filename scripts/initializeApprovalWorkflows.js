/**
 * Initialize Approval Workflows
 * This script will set up default approval workflows
 * for both Restaurant and Construction business types
 */

require("dotenv").config();
const mongoose = require("mongoose");
const ApprovalWorkflow = require("../model/ApprovalWorkflow");

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

// Note: You'll need to replace userId placeholders with actual user IDs from your system
const MANAGER_ID = "REPLACE_WITH_MANAGER_USER_ID";
const DIRECTOR_ID = "REPLACE_WITH_DIRECTOR_USER_ID";
const FINANCE_HEAD_ID = "REPLACE_WITH_FINANCE_HEAD_USER_ID";
const HR_HEAD_ID = "REPLACE_WITH_HR_HEAD_USER_ID";

// Default approval workflows
const getDefaultWorkflows = () => [
  // ================== RESTAURANT WORKFLOWS ==================
  
  // 1. Restaurant Purchase Request (Small Amount)
  {
    name: "Restaurant Purchase Request - Small (< ₹10,000)",
    code: "RES_PR_SMALL",
    description: "Purchase request approval for amounts less than ₹10,000",
    businessType: "restaurant",
    workflowType: "Purchase Request",
    category: "Procurement",
    levels: [
      {
        level: 1,
        name: "Manager Approval",
        approvers: [
          { user: MANAGER_ID, role: "Manager" },
        ],
        approvalType: "Any",
        minimumApprovers: 1,
        autoApprove: false,
        escalationTime: 24,
        canDelegate: true,
      },
    ],
    conditions: {
      amountRange: { min: 0, max: 10000 },
    },
    rules: {
      requiresJustification: true,
      requiresAttachment: false,
      allowParallelApproval: false,
      allowResubmission: true,
      maxResubmissions: 3,
      notifyOnSubmit: true,
      notifyOnApproval: true,
      notifyOnRejection: true,
    },
    isActive: true,
    priority: 10,
  },

  // 2. Restaurant Purchase Request (Large Amount)
  {
    name: "Restaurant Purchase Request - Large (> ₹10,000)",
    code: "RES_PR_LARGE",
    description: "Purchase request approval for amounts above ₹10,000",
    businessType: "restaurant",
    workflowType: "Purchase Request",
    category: "Procurement",
    levels: [
      {
        level: 1,
        name: "Manager Approval",
        approvers: [{ user: MANAGER_ID, role: "Manager" }],
        approvalType: "Any",
        minimumApprovers: 1,
        escalationTime: 24,
      },
      {
        level: 2,
        name: "Finance Head Approval",
        approvers: [{ user: FINANCE_HEAD_ID, role: "Finance Head" }],
        approvalType: "Any",
        minimumApprovers: 1,
        escalationTime: 48,
      },
    ],
    conditions: {
      amountRange: { min: 10000, max: null },
    },
    rules: {
      requiresJustification: true,
      requiresAttachment: true,
      allowParallelApproval: false,
      allowResubmission: true,
      maxResubmissions: 3,
      notifyOnSubmit: true,
      notifyOnApproval: true,
      notifyOnRejection: true,
    },
    isActive: true,
    priority: 20,
  },

  // 3. Restaurant Purchase Order
  {
    name: "Restaurant Purchase Order Approval",
    code: "RES_PO",
    description: "Purchase order approval workflow",
    businessType: "restaurant",
    workflowType: "Purchase Order",
    category: "Procurement",
    levels: [
      {
        level: 1,
        name: "Manager Approval",
        approvers: [{ user: MANAGER_ID, role: "Manager" }],
        approvalType: "Any",
        minimumApprovers: 1,
        escalationTime: 24,
      },
      {
        level: 2,
        name: "Director Approval",
        approvers: [{ user: DIRECTOR_ID, role: "Director" }],
        approvalType: "Any",
        minimumApprovers: 1,
        escalationTime: 48,
      },
    ],
    conditions: {
      amountRange: { min: 5000, max: null },
    },
    rules: {
      requiresJustification: true,
      requiresAttachment: true,
      allowParallelApproval: false,
      allowResubmission: true,
      maxResubmissions: 2,
      notifyOnSubmit: true,
      notifyOnApproval: true,
      notifyOnRejection: true,
    },
    isActive: true,
    priority: 15,
  },

  // 4. Restaurant Leave Request
  {
    name: "Restaurant Leave Request",
    code: "RES_LEAVE",
    description: "Employee leave request approval",
    businessType: "restaurant",
    workflowType: "Leave Request",
    category: "HR",
    levels: [
      {
        level: 1,
        name: "Manager Approval",
        approvers: [{ user: MANAGER_ID, role: "Manager" }],
        approvalType: "Any",
        minimumApprovers: 1,
        escalationTime: 24,
      },
    ],
    rules: {
      requiresJustification: true,
      requiresAttachment: false,
      allowParallelApproval: false,
      allowResubmission: true,
      maxResubmissions: 2,
      notifyOnSubmit: true,
      notifyOnApproval: true,
      notifyOnRejection: true,
    },
    isActive: true,
    priority: 10,
  },

  // ================== CONSTRUCTION WORKFLOWS ==================

  // 5. Construction Purchase Request (Small Amount)
  {
    name: "Construction Purchase Request - Small (< ₹50,000)",
    code: "CONS_PR_SMALL",
    description: "Purchase request approval for amounts less than ₹50,000",
    businessType: "construction",
    workflowType: "Purchase Request",
    category: "Procurement",
    levels: [
      {
        level: 1,
        name: "Site Manager Approval",
        approvers: [{ user: MANAGER_ID, role: "Site Manager" }],
        approvalType: "Any",
        minimumApprovers: 1,
        escalationTime: 24,
      },
    ],
    conditions: {
      amountRange: { min: 0, max: 50000 },
    },
    rules: {
      requiresJustification: true,
      requiresAttachment: false,
      allowParallelApproval: false,
      allowResubmission: true,
      maxResubmissions: 3,
      notifyOnSubmit: true,
      notifyOnApproval: true,
      notifyOnRejection: true,
    },
    isActive: true,
    priority: 10,
  },

  // 6. Construction Purchase Request (Large Amount)
  {
    name: "Construction Purchase Request - Large (> ₹50,000)",
    code: "CONS_PR_LARGE",
    description: "Purchase request approval for amounts above ₹50,000",
    businessType: "construction",
    workflowType: "Purchase Request",
    category: "Procurement",
    levels: [
      {
        level: 1,
        name: "Site Manager Approval",
        approvers: [{ user: MANAGER_ID, role: "Site Manager" }],
        approvalType: "Any",
        minimumApprovers: 1,
        escalationTime: 24,
      },
      {
        level: 2,
        name: "Project Director Approval",
        approvers: [{ user: DIRECTOR_ID, role: "Project Director" }],
        approvalType: "Any",
        minimumApprovers: 1,
        escalationTime: 48,
      },
      {
        level: 3,
        name: "Finance Head Approval",
        approvers: [{ user: FINANCE_HEAD_ID, role: "Finance Head" }],
        approvalType: "Any",
        minimumApprovers: 1,
        escalationTime: 48,
      },
    ],
    conditions: {
      amountRange: { min: 50000, max: null },
    },
    rules: {
      requiresJustification: true,
      requiresAttachment: true,
      allowParallelApproval: false,
      allowResubmission: true,
      maxResubmissions: 3,
      notifyOnSubmit: true,
      notifyOnApproval: true,
      notifyOnRejection: true,
    },
    isActive: true,
    priority: 20,
  },

  // 7. Construction Purchase Order
  {
    name: "Construction Purchase Order Approval",
    code: "CONS_PO",
    description: "Purchase order approval workflow for construction",
    businessType: "construction",
    workflowType: "Purchase Order",
    category: "Procurement",
    levels: [
      {
        level: 1,
        name: "Site Manager Approval",
        approvers: [{ user: MANAGER_ID, role: "Site Manager" }],
        approvalType: "Any",
        minimumApprovers: 1,
        escalationTime: 24,
      },
      {
        level: 2,
        name: "Project Director Approval",
        approvers: [{ user: DIRECTOR_ID, role: "Project Director" }],
        approvalType: "Any",
        minimumApprovers: 1,
        escalationTime: 48,
      },
    ],
    conditions: {
      amountRange: { min: 10000, max: null },
    },
    rules: {
      requiresJustification: true,
      requiresAttachment: true,
      allowParallelApproval: false,
      allowResubmission: true,
      maxResubmissions: 2,
      notifyOnSubmit: true,
      notifyOnApproval: true,
      notifyOnRejection: true,
    },
    isActive: true,
    priority: 15,
  },

  // 8. Construction Leave Request
  {
    name: "Construction Leave Request",
    code: "CONS_LEAVE",
    description: "Employee leave request approval",
    businessType: "construction",
    workflowType: "Leave Request",
    category: "HR",
    levels: [
      {
        level: 1,
        name: "Site Manager Approval",
        approvers: [{ user: MANAGER_ID, role: "Site Manager" }],
        approvalType: "Any",
        minimumApprovers: 1,
        escalationTime: 24,
      },
    ],
    rules: {
      requiresJustification: true,
      requiresAttachment: false,
      allowParallelApproval: false,
      allowResubmission: true,
      maxResubmissions: 2,
      notifyOnSubmit: true,
      notifyOnApproval: true,
      notifyOnRejection: true,
    },
    isActive: true,
    priority: 10,
  },

  // 9. Material Request (Construction)
  {
    name: "Construction Material Request",
    code: "CONS_MR",
    description: "Material request approval workflow",
    businessType: "construction",
    workflowType: "Material Request",
    category: "Operations",
    levels: [
      {
        level: 1,
        name: "Site Supervisor Approval",
        approvers: [{ user: MANAGER_ID, role: "Site Supervisor" }],
        approvalType: "Any",
        minimumApprovers: 1,
        escalationTime: 12,
      },
    ],
    rules: {
      requiresJustification: true,
      requiresAttachment: false,
      allowParallelApproval: false,
      allowResubmission: true,
      maxResubmissions: 3,
      notifyOnSubmit: true,
      notifyOnApproval: true,
      notifyOnRejection: true,
    },
    isActive: true,
    priority: 5,
  },

  // 10. Common Expense Claim (Both)
  {
    name: "Expense Claim Approval",
    code: "COMMON_EXPENSE",
    description: "Employee expense claim approval",
    businessType: "both",
    workflowType: "Expense Claim",
    category: "Finance",
    levels: [
      {
        level: 1,
        name: "Manager Approval",
        approvers: [{ user: MANAGER_ID, role: "Manager" }],
        approvalType: "Any",
        minimumApprovers: 1,
        escalationTime: 24,
      },
      {
        level: 2,
        name: "Finance Approval",
        approvers: [{ user: FINANCE_HEAD_ID, role: "Finance Head" }],
        approvalType: "Any",
        minimumApprovers: 1,
        escalationTime: 48,
      },
    ],
    conditions: {
      amountRange: { min: 1000, max: null },
    },
    rules: {
      requiresJustification: true,
      requiresAttachment: true,
      allowParallelApproval: false,
      allowResubmission: true,
      maxResubmissions: 2,
      notifyOnSubmit: true,
      notifyOnApproval: true,
      notifyOnRejection: true,
    },
    isActive: true,
    priority: 10,
  },
];

const initializeWorkflows = async () => {
  try {
    console.log("\n🚀 Starting Approval Workflows Initialization...\n");

    console.log("⚠️  IMPORTANT: Before running, please update user IDs in the script!");
    console.log("   Replace MANAGER_ID, DIRECTOR_ID, FINANCE_HEAD_ID, HR_HEAD_ID");
    console.log("   with actual MongoDB ObjectIds from your SubAdmin collection.\n");

    const workflows = getDefaultWorkflows();
    let createdCount = 0;
    let skippedCount = 0;

    for (const workflowData of workflows) {
      try {
        const workflow = new ApprovalWorkflow(workflowData);
        await workflow.save();
        console.log(`✅ Created: ${workflowData.name} (${workflowData.code})`);
        createdCount++;
      } catch (err) {
        if (err.code === 11000) {
          console.log(`⏭️  Skipped: ${workflowData.name} (already exists)`);
          skippedCount++;
        } else {
          console.error(`❌ Error creating ${workflowData.name}:`, err.message);
        }
      }
    }

    console.log("\n═══════════════════════════════════════════════════");
    console.log("🎉 INITIALIZATION COMPLETE!");
    console.log("═══════════════════════════════════════════════════");
    console.log(`✅ Workflows Created: ${createdCount}`);
    console.log(`⏭️  Workflows Skipped: ${skippedCount}`);
    console.log(`📊 Total Workflows: ${createdCount + skippedCount}`);
    console.log("═══════════════════════════════════════════════════\n");

    console.log("📝 Workflow Summary:");
    console.log("  Restaurant:");
    console.log("    • Purchase Request (Small & Large)");
    console.log("    • Purchase Order");
    console.log("    • Leave Request");
    console.log("  Construction:");
    console.log("    • Purchase Request (Small & Large)");
    console.log("    • Purchase Order");
    console.log("    • Leave Request");
    console.log("    • Material Request");
    console.log("  Common:");
    console.log("    • Expense Claim\n");

    console.log("📝 Next Steps:");
    console.log("1. Update user IDs in this script with actual IDs");
    console.log("2. Test approval workflows via API");
    console.log("3. Create approval requests");
    console.log("4. Approve/Reject requests");
    console.log("5. Check notification integration!\n");

  } catch (error) {
    console.error("❌ Initialization Error:", error);
  }
};

// Run initialization
connectDB()
  .then(initializeWorkflows)
  .then(() => {
    console.log("✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });


