const mongoose = require("mongoose");

const chartOfAccountsSchema = new mongoose.Schema(
  {
    accountCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    accountName: {
      type: String,
      required: true,
      trim: true,
    },
    accountType: {
      type: String,
      required: true,
      enum: [
        "Asset",
        "Liability",
        "Equity",
        "Revenue",
        "Expense",
        "Cost of Goods Sold",
      ],
    },
    accountCategory: {
      type: String,
      required: true,
      enum: [
        // Assets
        "Current Assets",
        "Fixed Assets",
        "Other Assets",
        "Cash & Bank",
        "Accounts Receivable",
        "Inventory",
        "Prepaid Expenses",
        // Liabilities
        "Current Liabilities",
        "Long Term Liabilities",
        "Accounts Payable",
        "Loans",
        "Other Liabilities",
        // Equity
        "Owner's Equity",
        "Retained Earnings",
        "Capital",
        // Revenue
        "Sales Revenue",
        "Service Revenue",
        "Other Income",
        // Expenses
        "Operating Expenses",
        "Administrative Expenses",
        "Marketing Expenses",
        "Payroll Expenses",
        "Utility Expenses",
        "Rent Expenses",
        "Depreciation",
        // COGS
        "Direct Materials",
        "Direct Labor",
        "Manufacturing Overhead",
      ],
    },
    businessType: {
      type: String,
      required: true,
      enum: ["restaurant", "construction", "both"],
      default: "both",
    },
    parentAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChartOfAccounts",
      default: null,
    },
    level: {
      type: Number,
      default: 1, // 1 = main account, 2 = sub-account, etc.
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    openingBalance: {
      type: Number,
      default: 0,
    },
    currentBalance: {
      type: Number,
      default: 0,
    },
    balanceType: {
      type: String,
      enum: ["Debit", "Credit"],
      required: true,
    },
    taxApplicable: {
      type: Boolean,
      default: false,
    },
    taxRate: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },
    notes: {
      type: String,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubAdmin",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubAdmin",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
// accountCode index is automatically created by unique: true constraint
chartOfAccountsSchema.index({ businessType: 1 });
chartOfAccountsSchema.index({ accountType: 1, businessType: 1 });
chartOfAccountsSchema.index({ isActive: 1 });

// Virtual for full account path
chartOfAccountsSchema.virtual("fullAccountPath").get(function () {
  return `${this.accountCode} - ${this.accountName}`;
});

// Method to calculate balance
chartOfAccountsSchema.methods.updateBalance = async function (amount, type) {
  if (this.balanceType === "Debit") {
    if (type === "debit") {
      this.currentBalance += amount;
    } else {
      this.currentBalance -= amount;
    }
  } else {
    // Credit balance
    if (type === "credit") {
      this.currentBalance += amount;
    } else {
      this.currentBalance -= amount;
    }
  }
  await this.save();
};

// Static method to get account hierarchy
chartOfAccountsSchema.statics.getAccountHierarchy = async function (
  businessType = "both"
) {
  const query = businessType === "both" ? {} : { businessType };

  const accounts = await this.find(query).sort({ accountCode: 1 });

  const buildTree = (parentId = null) => {
    return accounts
      .filter((acc) => {
        const parent = acc.parentAccount
          ? acc.parentAccount.toString()
          : null;
        return parent === parentId;
      })
      .map((acc) => ({
        ...acc.toObject(),
        children: buildTree(acc._id.toString()),
      }));
  };

  return buildTree();
};

// Pre-save middleware to set level based on parent
chartOfAccountsSchema.pre("save", async function (next) {
  if (this.parentAccount) {
    const parent = await this.constructor.findById(this.parentAccount);
    if (parent) {
      this.level = parent.level + 1;
    }
  }
  next();
});

module.exports = mongoose.model("ChartOfAccounts", chartOfAccountsSchema);


