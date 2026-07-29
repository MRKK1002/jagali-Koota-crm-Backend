const Ledger = require("../model/Ledger");
const ChartOfAccounts = require("../model/ChartOfAccounts");

// Get account ledger
exports.getAccountLedger = async (req, res) => {
  try {
    const { accountId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Start date and end date are required",
      });
    }

    const ledgerData = await Ledger.getLedgerWithBalance(
      accountId,
      new Date(startDate),
      new Date(endDate)
    );

    // Get account details
    const account = await ChartOfAccounts.findById(accountId);

    res.status(200).json({
      success: true,
      data: {
        account: {
          _id: account._id,
          accountCode: account.accountCode,
          accountName: account.accountName,
          accountType: account.accountType,
        },
        ...ledgerData,
      },
    });
  } catch (error) {
    console.error("Error fetching account ledger:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching account ledger",
    });
  }
};

// Get account balance
exports.getAccountBalance = async (req, res) => {
  try {
    const { accountId } = req.params;
    const { asOfDate } = req.query;

    const date = asOfDate ? new Date(asOfDate) : new Date();
    const balanceInfo = await Ledger.getAccountBalance(accountId, date);

    // Get account details
    const account = await ChartOfAccounts.findById(accountId);

    res.status(200).json({
      success: true,
      data: {
        account: {
          _id: account._id,
          accountCode: account.accountCode,
          accountName: account.accountName,
          accountType: account.accountType,
        },
        asOfDate: date,
        ...balanceInfo,
      },
    });
  } catch (error) {
    console.error("Error fetching account balance:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching account balance",
    });
  }
};

// Get trial balance
exports.getTrialBalance = async (req, res) => {
  try {
    const { businessType } = req.params;
    const { asOfDate } = req.query;

    const date = asOfDate ? new Date(asOfDate) : new Date();
    const trialBalance = await Ledger.getTrialBalance(businessType, date);

    res.status(200).json({
      success: true,
      data: trialBalance,
    });
  } catch (error) {
    console.error("Error fetching trial balance:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching trial balance",
    });
  }
};

// Get general ledger (all accounts)
exports.getGeneralLedger = async (req, res) => {
  try {
    const { businessType } = req.params;
    const { startDate, endDate, accountType } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Start date and end date are required",
      });
    }

    // Get accounts based on business type
    const accountsQuery = {
      $or: [{ businessType }, { businessType: "both" }],
      isActive: true,
    };

    if (accountType) {
      accountsQuery.accountType = accountType;
    }

    const accounts = await ChartOfAccounts.find(accountsQuery).sort({
      accountCode: 1,
    });

    const generalLedger = [];

    for (const account of accounts) {
      const entries = await Ledger.find({
        account: account._id,
        transactionDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
        isReversed: false,
      }).sort({ transactionDate: 1 });

      if (entries.length > 0) {
        const openingBalance = await Ledger.getAccountBalance(
          account._id,
          new Date(startDate)
        );

        const closingBalance = await Ledger.getAccountBalance(
          account._id,
          new Date(endDate)
        );

        generalLedger.push({
          account: {
            _id: account._id,
            accountCode: account.accountCode,
            accountName: account.accountName,
            accountType: account.accountType,
          },
          openingBalance,
          entries,
          closingBalance,
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        businessType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        accounts: generalLedger,
      },
    });
  } catch (error) {
    console.error("Error fetching general ledger:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching general ledger",
    });
  }
};


