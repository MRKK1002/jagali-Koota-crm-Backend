const mongoose = require("mongoose");

const financialStatementSchema = new mongoose.Schema(
  {
    statementType: {
      type: String,
      required: true,
      enum: [
        "Profit and Loss",
        "Balance Sheet",
        "Cash Flow Statement",
        "Trial Balance",
      ],
    },
    businessType: {
      type: String,
      required: true,
      enum: ["restaurant", "construction", "combined"],
    },
    fiscalYear: {
      type: String,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    totalRevenue: {
      type: Number,
      default: 0,
    },
    totalExpense: {
      type: Number,
      default: 0,
    },
    netProfit: {
      type: Number,
      default: 0,
    },
    totalAssets: {
      type: Number,
      default: 0,
    },
    totalLiabilities: {
      type: Number,
      default: 0,
    },
    totalEquity: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["Draft", "Final", "Audited"],
      default: "Draft",
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubAdmin",
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
financialStatementSchema.index({
  businessType: 1,
  fiscalYear: 1,
  statementType: 1,
});
financialStatementSchema.index({ startDate: 1, endDate: 1 });

// Static method to generate P&L Statement
financialStatementSchema.statics.generateProfitAndLoss = async function (
  businessType,
  startDate,
  endDate
) {
  const Ledger = mongoose.model("Ledger");
  const ChartOfAccounts = mongoose.model("ChartOfAccounts");

  // Get all revenue and expense accounts
  const revenueAccounts = await ChartOfAccounts.find({
    $or: [{ businessType }, { businessType: "both" }],
    accountType: "Revenue",
    isActive: true,
  });

  const expenseAccounts = await ChartOfAccounts.find({
    $or: [{ businessType }, { businessType: "both" }],
    accountType: { $in: ["Expense", "Cost of Goods Sold"] },
    isActive: true,
  });

  // Calculate revenue
  const revenueData = [];
  let totalRevenue = 0;

  for (const account of revenueAccounts) {
    const entries = await Ledger.aggregate([
      {
        $match: {
          account: account._id,
          transactionDate: { $gte: startDate, $lte: endDate },
          isReversed: false,
        },
      },
      {
        $group: {
          _id: null,
          totalCredit: { $sum: "$creditAmount" },
          totalDebit: { $sum: "$debitAmount" },
        },
      },
    ]);

    if (entries.length > 0) {
      const amount = entries[0].totalCredit - entries[0].totalDebit;
      if (amount > 0) {
        revenueData.push({
          accountCode: account.accountCode,
          accountName: account.accountName,
          category: account.accountCategory,
          amount,
        });
        totalRevenue += amount;
      }
    }
  }

  // Calculate expenses
  const expenseData = [];
  let totalExpense = 0;

  for (const account of expenseAccounts) {
    const entries = await Ledger.aggregate([
      {
        $match: {
          account: account._id,
          transactionDate: { $gte: startDate, $lte: endDate },
          isReversed: false,
        },
      },
      {
        $group: {
          _id: null,
          totalDebit: { $sum: "$debitAmount" },
          totalCredit: { $sum: "$creditAmount" },
        },
      },
    ]);

    if (entries.length > 0) {
      const amount = entries[0].totalDebit - entries[0].totalCredit;
      if (amount > 0) {
        expenseData.push({
          accountCode: account.accountCode,
          accountName: account.accountName,
          category: account.accountCategory,
          accountType: account.accountType,
          amount,
        });
        totalExpense += amount;
      }
    }
  }

  // Group expenses by category
  const groupedExpenses = expenseData.reduce((acc, expense) => {
    const category = expense.category;
    if (!acc[category]) {
      acc[category] = {
        category,
        accounts: [],
        total: 0,
      };
    }
    acc[category].accounts.push(expense);
    acc[category].total += expense.amount;
    return acc;
  }, {});

  const netProfit = totalRevenue - totalExpense;

  return {
    statementType: "Profit and Loss",
    businessType,
    startDate,
    endDate,
    revenue: revenueData,
    expenses: Object.values(groupedExpenses),
    totalRevenue,
    totalExpense,
    netProfit,
    profitMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
  };
};

// Static method to generate Balance Sheet
financialStatementSchema.statics.generateBalanceSheet = async function (
  businessType,
  asOfDate
) {
  const Ledger = mongoose.model("Ledger");
  const ChartOfAccounts = mongoose.model("ChartOfAccounts");

  // Get all asset, liability, and equity accounts
  const assetAccounts = await ChartOfAccounts.find({
    $or: [{ businessType }, { businessType: "both" }],
    accountType: "Asset",
    isActive: true,
  });

  const liabilityAccounts = await ChartOfAccounts.find({
    $or: [{ businessType }, { businessType: "both" }],
    accountType: "Liability",
    isActive: true,
  });

  const equityAccounts = await ChartOfAccounts.find({
    $or: [{ businessType }, { businessType: "both" }],
    accountType: "Equity",
    isActive: true,
  });

  // Calculate assets
  const assetData = [];
  let totalAssets = 0;

  for (const account of assetAccounts) {
    const balanceInfo = await Ledger.getAccountBalance(account._id, asOfDate);
    if (balanceInfo.balance > 0) {
      assetData.push({
        accountCode: account.accountCode,
        accountName: account.accountName,
        category: account.accountCategory,
        amount: balanceInfo.balance,
      });
      totalAssets += balanceInfo.balance;
    }
  }

  // Calculate liabilities
  const liabilityData = [];
  let totalLiabilities = 0;

  for (const account of liabilityAccounts) {
    const balanceInfo = await Ledger.getAccountBalance(account._id, asOfDate);
    if (balanceInfo.balance > 0) {
      liabilityData.push({
        accountCode: account.accountCode,
        accountName: account.accountName,
        category: account.accountCategory,
        amount: balanceInfo.balance,
      });
      totalLiabilities += balanceInfo.balance;
    }
  }

  // Calculate equity
  const equityData = [];
  let totalEquity = 0;

  for (const account of equityAccounts) {
    const balanceInfo = await Ledger.getAccountBalance(account._id, asOfDate);
    if (balanceInfo.balance > 0) {
      equityData.push({
        accountCode: account.accountCode,
        accountName: account.accountName,
        category: account.accountCategory,
        amount: balanceInfo.balance,
      });
      totalEquity += balanceInfo.balance;
    }
  }

  // Group by category
  const groupByCategory = (data) => {
    return data.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = {
          category: item.category,
          accounts: [],
          total: 0,
        };
      }
      acc[item.category].accounts.push(item);
      acc[item.category].total += item.amount;
      return acc;
    }, {});
  };

  return {
    statementType: "Balance Sheet",
    businessType,
    asOfDate,
    assets: Object.values(groupByCategory(assetData)),
    liabilities: Object.values(groupByCategory(liabilityData)),
    equity: Object.values(groupByCategory(equityData)),
    totalAssets,
    totalLiabilities,
    totalEquity,
    isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
  };
};

module.exports = mongoose.model("FinancialStatement", financialStatementSchema);


