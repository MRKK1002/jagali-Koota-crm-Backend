const ChartOfAccounts = require("../model/ChartOfAccounts");
const Ledger = require("../model/Ledger");

// Create a new account
exports.createAccount = async (req, res) => {
  try {
    const account = new ChartOfAccounts(req.body);
    await account.save();
    res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: account,
    });
  } catch (error) {
    console.error("Error creating account:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error creating account",
    });
  }
};

// Get all accounts
exports.getAllAccounts = async (req, res) => {
  try {
    const { businessType, accountType, isActive } = req.query;
    
    const query = {};
    if (businessType && businessType !== "both") {
      query.$or = [{ businessType }, { businessType: "both" }];
    }
    if (accountType) {
      query.accountType = accountType;
    }
    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    const accounts = await ChartOfAccounts.find(query)
      .populate("parentAccount", "accountCode accountName")
      .sort({ accountCode: 1 });

    res.status(200).json({
      success: true,
      count: accounts.length,
      data: accounts,
    });
  } catch (error) {
    console.error("Error fetching accounts:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching accounts",
    });
  }
};

// Get account hierarchy
exports.getAccountHierarchy = async (req, res) => {
  try {
    const { businessType = "both" } = req.query;
    const hierarchy = await ChartOfAccounts.getAccountHierarchy(businessType);

    res.status(200).json({
      success: true,
      data: hierarchy,
    });
  } catch (error) {
    console.error("Error fetching account hierarchy:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching account hierarchy",
    });
  }
};

// Get account by ID
exports.getAccountById = async (req, res) => {
  try {
    const account = await ChartOfAccounts.findById(req.params.id).populate(
      "parentAccount"
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    res.status(200).json({
      success: true,
      data: account,
    });
  } catch (error) {
    console.error("Error fetching account:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching account",
    });
  }
};

// Update account
exports.updateAccount = async (req, res) => {
  try {
    const account = await ChartOfAccounts.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user?._id },
      { new: true, runValidators: true }
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Account updated successfully",
      data: account,
    });
  } catch (error) {
    console.error("Error updating account:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error updating account",
    });
  }
};

// Delete account
exports.deleteAccount = async (req, res) => {
  try {
    // Check if account has any transactions
    const hasTransactions = await Ledger.countDocuments({
      account: req.params.id,
    });

    if (hasTransactions > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete account with existing transactions. Please deactivate instead.",
      });
    }

    // Check if account has child accounts
    const hasChildren = await ChartOfAccounts.countDocuments({
      parentAccount: req.params.id,
    });

    if (hasChildren > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete account with sub-accounts.",
      });
    }

    const account = await ChartOfAccounts.findByIdAndDelete(req.params.id);

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting account",
    });
  }
};

// Get account balance
exports.getAccountBalance = async (req, res) => {
  try {
    const { asOfDate } = req.query;
    const date = asOfDate ? new Date(asOfDate) : new Date();

    const balanceInfo = await Ledger.getAccountBalance(req.params.id, date);

    res.status(200).json({
      success: true,
      data: {
        accountId: req.params.id,
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

// Initialize default chart of accounts
exports.initializeChartOfAccounts = async (req, res) => {
  try {
    const { businessType } = req.body;

    // Default accounts structure
    const defaultAccounts = [
      // ASSETS
      { accountCode: "1000", accountName: "Assets", accountType: "Asset", accountCategory: "Current Assets", balanceType: "Debit", level: 1 },
      { accountCode: "1100", accountName: "Current Assets", accountType: "Asset", accountCategory: "Current Assets", balanceType: "Debit", level: 2 },
      { accountCode: "1110", accountName: "Cash", accountType: "Asset", accountCategory: "Cash & Bank", balanceType: "Debit", level: 3 },
      { accountCode: "1120", accountName: "Bank Accounts", accountType: "Asset", accountCategory: "Cash & Bank", balanceType: "Debit", level: 3 },
      { accountCode: "1130", accountName: "Accounts Receivable", accountType: "Asset", accountCategory: "Accounts Receivable", balanceType: "Debit", level: 3 },
      { accountCode: "1140", accountName: "Inventory", accountType: "Asset", accountCategory: "Inventory", balanceType: "Debit", level: 3 },
      
      // LIABILITIES
      { accountCode: "2000", accountName: "Liabilities", accountType: "Liability", accountCategory: "Current Liabilities", balanceType: "Credit", level: 1 },
      { accountCode: "2100", accountName: "Current Liabilities", accountType: "Liability", accountCategory: "Current Liabilities", balanceType: "Credit", level: 2 },
      { accountCode: "2110", accountName: "Accounts Payable", accountType: "Liability", accountCategory: "Accounts Payable", balanceType: "Credit", level: 3 },
      { accountCode: "2120", accountName: "Loans Payable", accountType: "Liability", accountCategory: "Loans", balanceType: "Credit", level: 3 },
      
      // EQUITY
      { accountCode: "3000", accountName: "Owner's Equity", accountType: "Equity", accountCategory: "Owner's Equity", balanceType: "Credit", level: 1 },
      { accountCode: "3100", accountName: "Capital", accountType: "Equity", accountCategory: "Capital", balanceType: "Credit", level: 2 },
      { accountCode: "3200", accountName: "Retained Earnings", accountType: "Equity", accountCategory: "Retained Earnings", balanceType: "Credit", level: 2 },
      
      // REVENUE
      { accountCode: "4000", accountName: "Revenue", accountType: "Revenue", accountCategory: "Sales Revenue", balanceType: "Credit", level: 1 },
      { accountCode: "4100", accountName: businessType === "restaurant" ? "Food Sales" : "Project Revenue", accountType: "Revenue", accountCategory: "Sales Revenue", balanceType: "Credit", level: 2 },
      { accountCode: "4200", accountName: "Other Income", accountType: "Revenue", accountCategory: "Other Income", balanceType: "Credit", level: 2 },
      
      // EXPENSES
      { accountCode: "5000", accountName: "Expenses", accountType: "Expense", accountCategory: "Operating Expenses", balanceType: "Debit", level: 1 },
      { accountCode: "5100", accountName: businessType === "restaurant" ? "Food Cost" : "Material Cost", accountType: "Cost of Goods Sold", accountCategory: "Direct Materials", balanceType: "Debit", level: 2 },
      { accountCode: "5200", accountName: "Salaries & Wages", accountType: "Expense", accountCategory: "Payroll Expenses", balanceType: "Debit", level: 2 },
      { accountCode: "5300", accountName: "Rent Expense", accountType: "Expense", accountCategory: "Rent Expenses", balanceType: "Debit", level: 2 },
      { accountCode: "5400", accountName: "Utilities", accountType: "Expense", accountCategory: "Utility Expenses", balanceType: "Debit", level: 2 },
    ];

    const createdAccounts = [];
    for (const accountData of defaultAccounts) {
      const account = new ChartOfAccounts({
        ...accountData,
        businessType,
        createdBy: req.user?._id,
      });
      await account.save();
      createdAccounts.push(account);
    }

    res.status(201).json({
      success: true,
      message: `Initialized ${createdAccounts.length} default accounts for ${businessType}`,
      data: createdAccounts,
    });
  } catch (error) {
    console.error("Error initializing chart of accounts:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error initializing chart of accounts",
    });
  }
};


