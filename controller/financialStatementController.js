const FinancialStatement = require("../model/FinancialStatement");
const moment = require("moment");

// Get Profit and Loss statement
exports.getProfitAndLoss = async (req, res) => {
  try {
    const { businessType } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Start date and end date are required",
      });
    }

    const profitAndLoss = await FinancialStatement.generateProfitAndLoss(
      businessType,
      new Date(startDate),
      new Date(endDate)
    );

    res.status(200).json({
      success: true,
      data: profitAndLoss,
    });
  } catch (error) {
    console.error("Error generating P&L statement:", error);
    res.status(500).json({
      success: false,
      message: "Error generating P&L statement",
    });
  }
};

// Get Balance Sheet
exports.getBalanceSheet = async (req, res) => {
  try {
    const { businessType } = req.params;
    const { asOfDate } = req.query;

    const date = asOfDate ? new Date(asOfDate) : new Date();

    const balanceSheet = await FinancialStatement.generateBalanceSheet(
      businessType,
      date
    );

    res.status(200).json({
      success: true,
      data: balanceSheet,
    });
  } catch (error) {
    console.error("Error generating balance sheet:", error);
    res.status(500).json({
      success: false,
      message: "Error generating balance sheet",
    });
  }
};

// Get Cash Flow Statement
exports.getCashFlowStatement = async (req, res) => {
  try {
    const { businessType } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Start date and end date are required",
      });
    }

    // TODO: Implement cash flow statement logic
    // This is a simplified version

    res.status(200).json({
      success: true,
      message: "Cash flow statement generation in progress",
      data: {
        businessType,
        startDate,
        endDate,
        operatingActivities: [],
        investingActivities: [],
        financingActivities: [],
      },
    });
  } catch (error) {
    console.error("Error generating cash flow statement:", error);
    res.status(500).json({
      success: false,
      message: "Error generating cash flow statement",
    });
  }
};

// Get combined P&L (both business types)
exports.getCombinedProfitAndLoss = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Start date and end date are required",
      });
    }

    // Generate P&L for both business types
    const restaurantPL = await FinancialStatement.generateProfitAndLoss(
      "restaurant",
      new Date(startDate),
      new Date(endDate)
    );

    const constructionPL = await FinancialStatement.generateProfitAndLoss(
      "construction",
      new Date(startDate),
      new Date(endDate)
    );

    // Combine the results
    const combinedPL = {
      statementType: "Profit and Loss",
      businessType: "combined",
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      restaurant: restaurantPL,
      construction: constructionPL,
      combined: {
        totalRevenue: restaurantPL.totalRevenue + constructionPL.totalRevenue,
        totalExpense: restaurantPL.totalExpense + constructionPL.totalExpense,
        netProfit: restaurantPL.netProfit + constructionPL.netProfit,
      },
    };

    combinedPL.combined.profitMargin =
      combinedPL.combined.totalRevenue > 0
        ? (combinedPL.combined.netProfit / combinedPL.combined.totalRevenue) *
          100
        : 0;

    res.status(200).json({
      success: true,
      data: combinedPL,
    });
  } catch (error) {
    console.error("Error generating combined P&L:", error);
    res.status(500).json({
      success: false,
      message: "Error generating combined P&L",
    });
  }
};

// Get combined Balance Sheet
exports.getCombinedBalanceSheet = async (req, res) => {
  try {
    const { asOfDate } = req.query;
    const date = asOfDate ? new Date(asOfDate) : new Date();

    // Generate Balance Sheet for both business types
    const restaurantBS = await FinancialStatement.generateBalanceSheet(
      "restaurant",
      date
    );

    const constructionBS = await FinancialStatement.generateBalanceSheet(
      "construction",
      date
    );

    // Combine the results
    const combinedBS = {
      statementType: "Balance Sheet",
      businessType: "combined",
      asOfDate: date,
      restaurant: restaurantBS,
      construction: constructionBS,
      combined: {
        totalAssets: restaurantBS.totalAssets + constructionBS.totalAssets,
        totalLiabilities:
          restaurantBS.totalLiabilities + constructionBS.totalLiabilities,
        totalEquity: restaurantBS.totalEquity + constructionBS.totalEquity,
      },
    };

    combinedBS.combined.isBalanced =
      Math.abs(
        combinedBS.combined.totalAssets -
          (combinedBS.combined.totalLiabilities + combinedBS.combined.totalEquity)
      ) < 0.01;

    res.status(200).json({
      success: true,
      data: combinedBS,
    });
  } catch (error) {
    console.error("Error generating combined balance sheet:", error);
    res.status(500).json({
      success: false,
      message: "Error generating combined balance sheet",
    });
  }
};

// Save financial statement
exports.saveFinancialStatement = async (req, res) => {
  try {
    const financialStatement = new FinancialStatement({
      ...req.body,
      generatedBy: req.user?._id,
    });

    await financialStatement.save();

    res.status(201).json({
      success: true,
      message: "Financial statement saved successfully",
      data: financialStatement,
    });
  } catch (error) {
    console.error("Error saving financial statement:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error saving financial statement",
    });
  }
};

// Get all financial statements
exports.getAllFinancialStatements = async (req, res) => {
  try {
    const { businessType, statementType, fiscalYear } = req.query;

    const query = {};
    if (businessType) query.businessType = businessType;
    if (statementType) query.statementType = statementType;
    if (fiscalYear) query.fiscalYear = fiscalYear;

    const statements = await FinancialStatement.find(query)
      .populate("generatedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: statements.length,
      data: statements,
    });
  } catch (error) {
    console.error("Error fetching financial statements:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching financial statements",
    });
  }
};

// Get financial statement by ID
exports.getFinancialStatementById = async (req, res) => {
  try {
    const statement = await FinancialStatement.findById(
      req.params.id
    ).populate("generatedBy", "name email");

    if (!statement) {
      return res.status(404).json({
        success: false,
        message: "Financial statement not found",
      });
    }

    res.status(200).json({
      success: true,
      data: statement,
    });
  } catch (error) {
    console.error("Error fetching financial statement:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching financial statement",
    });
  }
};


