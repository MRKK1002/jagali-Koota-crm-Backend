const mongoose = require("mongoose");

const ledgerSchema = new mongoose.Schema(
  {
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChartOfAccounts",
      required: true,
    },
    accountCode: {
      type: String,
      required: true,
    },
    accountName: {
      type: String,
      required: true,
    },
    businessType: {
      type: String,
      required: true,
      enum: ["restaurant", "construction"],
    },
    transactionDate: {
      type: Date,
      required: true,
      index: true,
    },
    journalEntry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JournalEntry",
      required: true,
    },
    entryNumber: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    reference: {
      type: String,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    referenceModel: {
      type: String,
    },
    debitAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    creditAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    balance: {
      type: Number,
      default: 0,
    },
    balanceType: {
      type: String,
      enum: ["Debit", "Credit"],
    },
    fiscalYear: {
      type: String,
      required: true,
    },
    fiscalPeriod: {
      type: String,
      required: true,
    },
    isReversed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient querying
ledgerSchema.index({ account: 1, transactionDate: 1 });
ledgerSchema.index({ businessType: 1, transactionDate: 1 });
ledgerSchema.index({ fiscalYear: 1, fiscalPeriod: 1 });
ledgerSchema.index({ accountCode: 1, fiscalYear: 1 });

// Static method to get account balance
ledgerSchema.statics.getAccountBalance = async function (
  accountId,
  asOfDate = new Date()
) {
  const result = await this.aggregate([
    {
      $match: {
        account: mongoose.Types.ObjectId(accountId),
        transactionDate: { $lte: asOfDate },
        isReversed: false,
      },
    },
    {
      $group: {
        _id: "$account",
        totalDebit: { $sum: "$debitAmount" },
        totalCredit: { $sum: "$creditAmount" },
      },
    },
  ]);

  if (result.length === 0) {
    return { balance: 0, balanceType: "Debit" };
  }

  const { totalDebit, totalCredit } = result[0];
  const balance = Math.abs(totalDebit - totalCredit);
  const balanceType = totalDebit >= totalCredit ? "Debit" : "Credit";

  return { balance, balanceType, totalDebit, totalCredit };
};

// Static method to get ledger entries with running balance
ledgerSchema.statics.getLedgerWithBalance = async function (
  accountId,
  startDate,
  endDate
) {
  const entries = await this.find({
    account: accountId,
    transactionDate: { $gte: startDate, $lte: endDate },
    isReversed: false,
  }).sort({ transactionDate: 1, createdAt: 1 });

  // Get opening balance
  const openingBalance = await this.getAccountBalance(accountId, startDate);

  let runningBalance = openingBalance.balance;
  let runningBalanceType = openingBalance.balanceType;

  const entriesWithBalance = entries.map((entry) => {
    // Calculate new balance
    if (runningBalanceType === "Debit") {
      runningBalance += entry.debitAmount - entry.creditAmount;
    } else {
      runningBalance += entry.creditAmount - entry.debitAmount;
    }

    // Determine new balance type
    if (runningBalance < 0) {
      runningBalance = Math.abs(runningBalance);
      runningBalanceType =
        runningBalanceType === "Debit" ? "Credit" : "Debit";
    }

    return {
      ...entry.toObject(),
      balance: runningBalance,
      balanceType: runningBalanceType,
    };
  });

  return {
    openingBalance: {
      balance: openingBalance.balance,
      balanceType: openingBalance.balanceType,
    },
    entries: entriesWithBalance,
    closingBalance: {
      balance: runningBalance,
      balanceType: runningBalanceType,
    },
  };
};

// Static method to get trial balance
ledgerSchema.statics.getTrialBalance = async function (
  businessType,
  asOfDate = new Date()
) {
  const ChartOfAccounts = mongoose.model("ChartOfAccounts");

  // Get all accounts for the business type
  const accounts = await ChartOfAccounts.find({
    $or: [{ businessType }, { businessType: "both" }],
    isActive: true,
  });

  const trialBalance = [];

  for (const account of accounts) {
    const balanceInfo = await this.getAccountBalance(account._id, asOfDate);

    if (balanceInfo.balance > 0) {
      // Only include accounts with non-zero balance
      trialBalance.push({
        accountCode: account.accountCode,
        accountName: account.accountName,
        accountType: account.accountType,
        debitBalance:
          balanceInfo.balanceType === "Debit" ? balanceInfo.balance : 0,
        creditBalance:
          balanceInfo.balanceType === "Credit" ? balanceInfo.balance : 0,
      });
    }
  }

  // Calculate totals
  const totalDebit = trialBalance.reduce((sum, acc) => sum + acc.debitBalance, 0);
  const totalCredit = trialBalance.reduce(
    (sum, acc) => sum + acc.creditBalance,
    0
  );

  return {
    asOfDate,
    businessType,
    accounts: trialBalance,
    totalDebit,
    totalCredit,
    isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
  };
};

module.exports = mongoose.model("Ledger", ledgerSchema);


