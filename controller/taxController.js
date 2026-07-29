const TaxConfiguration = require("../model/TaxConfiguration");
const Invoice = require("../model/Invoice");
const Payment = require("../model/Payment");

// Create tax configuration
exports.createTaxConfiguration = async (req, res) => {
  try {
    const taxConfig = new TaxConfiguration({
      ...req.body,
      createdBy: req.user?._id,
    });
    await taxConfig.save();

    res.status(201).json({
      success: true,
      message: "Tax configuration created successfully",
      data: taxConfig,
    });
  } catch (error) {
    console.error("Error creating tax configuration:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error creating tax configuration",
    });
  }
};

// Get all tax configurations
exports.getAllTaxConfigurations = async (req, res) => {
  try {
    const { businessType, taxType, isActive } = req.query;

    const query = {};
    if (businessType && businessType !== "both") {
      query.$or = [{ businessType }, { businessType: "both" }];
    }
    if (taxType) query.taxType = taxType;
    if (isActive !== undefined) query.isActive = isActive === "true";

    const taxConfigs = await TaxConfiguration.find(query).sort({ taxCode: 1 });

    res.status(200).json({
      success: true,
      count: taxConfigs.length,
      data: taxConfigs,
    });
  } catch (error) {
    console.error("Error fetching tax configurations:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching tax configurations",
    });
  }
};

// Get tax configuration by ID
exports.getTaxConfigurationById = async (req, res) => {
  try {
    const taxConfig = await TaxConfiguration.findById(req.params.id);

    if (!taxConfig) {
      return res.status(404).json({
        success: false,
        message: "Tax configuration not found",
      });
    }

    res.status(200).json({
      success: true,
      data: taxConfig,
    });
  } catch (error) {
    console.error("Error fetching tax configuration:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching tax configuration",
    });
  }
};

// Update tax configuration
exports.updateTaxConfiguration = async (req, res) => {
  try {
    const taxConfig = await TaxConfiguration.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user?._id },
      { new: true, runValidators: true }
    );

    if (!taxConfig) {
      return res.status(404).json({
        success: false,
        message: "Tax configuration not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Tax configuration updated successfully",
      data: taxConfig,
    });
  } catch (error) {
    console.error("Error updating tax configuration:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error updating tax configuration",
    });
  }
};

// Delete tax configuration
exports.deleteTaxConfiguration = async (req, res) => {
  try {
    const taxConfig = await TaxConfiguration.findByIdAndDelete(req.params.id);

    if (!taxConfig) {
      return res.status(404).json({
        success: false,
        message: "Tax configuration not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Tax configuration deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting tax configuration:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting tax configuration",
    });
  }
};

// Get GST rates
exports.getGSTRates = async (req, res) => {
  try {
    const { businessType } = req.params;
    const gstRates = await TaxConfiguration.getActiveGSTRates(businessType);

    res.status(200).json({
      success: true,
      count: gstRates.length,
      data: gstRates,
    });
  } catch (error) {
    console.error("Error fetching GST rates:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching GST rates",
    });
  }
};

// Calculate GST
exports.calculateGST = async (req, res) => {
  try {
    const { amount, gstRate, isInterState } = req.body;

    if (!amount || !gstRate) {
      return res.status(400).json({
        success: false,
        message: "Amount and GST rate are required",
      });
    }

    const gstCalculation = TaxConfiguration.calculateGST(
      amount,
      gstRate,
      isInterState
    );

    res.status(200).json({
      success: true,
      data: {
        amount,
        gstRate,
        isInterState,
        ...gstCalculation,
      },
    });
  } catch (error) {
    console.error("Error calculating GST:", error);
    res.status(500).json({
      success: false,
      message: "Error calculating GST",
    });
  }
};

// Get TDS sections
exports.getTDSSections = async (req, res) => {
  try {
    const { businessType } = req.params;
    const tdsSections = await TaxConfiguration.getActiveTDSSections(
      businessType
    );

    res.status(200).json({
      success: true,
      count: tdsSections.length,
      data: tdsSections,
    });
  } catch (error) {
    console.error("Error fetching TDS sections:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching TDS sections",
    });
  }
};

// Calculate TDS
exports.calculateTDS = async (req, res) => {
  try {
    const { amount, tdsSection, tdsRate, threshold } = req.body;

    if (!amount || !tdsSection || !tdsRate) {
      return res.status(400).json({
        success: false,
        message: "Amount, TDS section, and TDS rate are required",
      });
    }

    const tdsCalculation = TaxConfiguration.calculateTDS(
      amount,
      tdsSection,
      tdsRate,
      threshold || 0
    );

    res.status(200).json({
      success: true,
      data: {
        amount,
        ...tdsCalculation,
      },
    });
  } catch (error) {
    console.error("Error calculating TDS:", error);
    res.status(500).json({
      success: false,
      message: "Error calculating TDS",
    });
  }
};

// Get GSTR-1 Report
exports.getGSTR1Report = async (req, res) => {
  try {
    const { businessType } = req.params;
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "Month and year are required",
      });
    }

    // TODO: Implement GSTR-1 report generation
    // This would query invoices and calculate GST liability

    res.status(200).json({
      success: true,
      message: "GSTR-1 report generation in progress",
      data: {
        businessType,
        month,
        year,
        b2b: [], // Business to Business
        b2c: [], // Business to Consumer
        totalTaxableValue: 0,
        totalTax: 0,
      },
    });
  } catch (error) {
    console.error("Error generating GSTR-1 report:", error);
    res.status(500).json({
      success: false,
      message: "Error generating GSTR-1 report",
    });
  }
};

// Get GSTR-3B Report
exports.getGSTR3BReport = async (req, res) => {
  try {
    const { businessType } = req.params;
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "Month and year are required",
      });
    }

    // TODO: Implement GSTR-3B report generation

    res.status(200).json({
      success: true,
      message: "GSTR-3B report generation in progress",
      data: {
        businessType,
        month,
        year,
        outwardSupplies: {},
        inwardSupplies: {},
        itc: {},
        taxPayable: 0,
      },
    });
  } catch (error) {
    console.error("Error generating GSTR-3B report:", error);
    res.status(500).json({
      success: false,
      message: "Error generating GSTR-3B report",
    });
  }
};

// Get TDS Summary
exports.getTDSSummary = async (req, res) => {
  try {
    const { businessType } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Start date and end date are required",
      });
    }

    // TODO: Implement TDS summary calculation

    res.status(200).json({
      success: true,
      message: "TDS summary generation in progress",
      data: {
        businessType,
        startDate,
        endDate,
        totalTDSDeducted: 0,
        bySection: [],
      },
    });
  } catch (error) {
    console.error("Error generating TDS summary:", error);
    res.status(500).json({
      success: false,
      message: "Error generating TDS summary",
    });
  }
};

// Initialize default tax configurations
exports.initializeTaxConfigurations = async (req, res) => {
  try {
    const { businessType } = req.body;

    const defaultConfigs = [
      // GST Configurations
      {
        taxType: "GST",
        taxName: "GST 5%",
        taxCode: "GST-5",
        gstType: "CGST",
        gstRate: 2.5,
        businessType,
        effectiveFrom: new Date("2017-07-01"),
        isActive: true,
      },
      {
        taxType: "GST",
        taxName: "GST 5%",
        taxCode: "GST-5-SGST",
        gstType: "SGST",
        gstRate: 2.5,
        businessType,
        effectiveFrom: new Date("2017-07-01"),
        isActive: true,
      },
      {
        taxType: "GST",
        taxName: "GST 12%",
        taxCode: "GST-12",
        gstType: "CGST",
        gstRate: 6,
        businessType,
        effectiveFrom: new Date("2017-07-01"),
        isActive: true,
      },
      {
        taxType: "GST",
        taxName: "GST 12%",
        taxCode: "GST-12-SGST",
        gstType: "SGST",
        gstRate: 6,
        businessType,
        effectiveFrom: new Date("2017-07-01"),
        isActive: true,
      },
      {
        taxType: "GST",
        taxName: "GST 18%",
        taxCode: "GST-18",
        gstType: "CGST",
        gstRate: 9,
        businessType,
        effectiveFrom: new Date("2017-07-01"),
        isActive: true,
      },
      {
        taxType: "GST",
        taxName: "GST 18%",
        taxCode: "GST-18-SGST",
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
        taxCode: "TDS-194J",
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
        taxCode: "TDS-194C",
        tdsSection: "194C",
        tdsRate: 2,
        tdsThreshold: 100000,
        businessType,
        effectiveFrom: new Date(),
        isActive: true,
      },
    ];

    const createdConfigs = [];
    for (const config of defaultConfigs) {
      try {
        const taxConfig = new TaxConfiguration({
          ...config,
          createdBy: req.user?._id,
        });
        await taxConfig.save();
        createdConfigs.push(taxConfig);
      } catch (err) {
        console.log(`Skipping duplicate: ${config.taxCode}`);
      }
    }

    res.status(201).json({
      success: true,
      message: `Initialized ${createdConfigs.length} tax configurations`,
      data: createdConfigs,
    });
  } catch (error) {
    console.error("Error initializing tax configurations:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error initializing tax configurations",
    });
  }
};


