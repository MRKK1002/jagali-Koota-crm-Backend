const JournalEntry = require("../model/JournalEntry");
const Ledger = require("../model/Ledger");
const ChartOfAccounts = require("../model/ChartOfAccounts");

// Create journal entry
exports.createJournalEntry = async (req, res) => {
  try {
    const { businessType, fiscalYear } = req.body;

    // Generate entry number if not provided
    if (!req.body.entryNumber) {
      req.body.entryNumber = await JournalEntry.generateEntryNumber(
        businessType,
        fiscalYear
      );
    }

    // Set createdBy
    req.body.createdBy = req.user?._id || req.body.createdBy;

    const journalEntry = new JournalEntry(req.body);
    await journalEntry.save();

    res.status(201).json({
      success: true,
      message: "Journal entry created successfully",
      data: journalEntry,
    });
  } catch (error) {
    console.error("Error creating journal entry:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error creating journal entry",
    });
  }
};

// Get all journal entries
exports.getAllJournalEntries = async (req, res) => {
  try {
    const { businessType, status, entryType, startDate, endDate } = req.query;

    const query = {};
    if (businessType) {
      query.businessType = businessType;
    }
    if (status) {
      query.status = status;
    }
    if (entryType) {
      query.entryType = entryType;
    }
    if (startDate || endDate) {
      query.entryDate = {};
      if (startDate) query.entryDate.$gte = new Date(startDate);
      if (endDate) query.entryDate.$lte = new Date(endDate);
    }

    const journalEntries = await JournalEntry.find(query)
      .populate("lines.account", "accountCode accountName")
      .populate("createdBy", "name email")
      .populate("postedBy", "name email")
      .sort({ entryDate: -1 });

    res.status(200).json({
      success: true,
      count: journalEntries.length,
      data: journalEntries,
    });
  } catch (error) {
    console.error("Error fetching journal entries:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching journal entries",
    });
  }
};

// Get journal entry by ID
exports.getJournalEntryById = async (req, res) => {
  try {
    const journalEntry = await JournalEntry.findById(req.params.id)
      .populate("lines.account")
      .populate("createdBy", "name email")
      .populate("postedBy", "name email")
      .populate("reversedBy", "name email");

    if (!journalEntry) {
      return res.status(404).json({
        success: false,
        message: "Journal entry not found",
      });
    }

    res.status(200).json({
      success: true,
      data: journalEntry,
    });
  } catch (error) {
    console.error("Error fetching journal entry:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching journal entry",
    });
  }
};

// Update journal entry
exports.updateJournalEntry = async (req, res) => {
  try {
    const journalEntry = await JournalEntry.findById(req.params.id);

    if (!journalEntry) {
      return res.status(404).json({
        success: false,
        message: "Journal entry not found",
      });
    }

    if (journalEntry.status === "Posted") {
      return res.status(400).json({
        success: false,
        message: "Cannot update posted journal entry",
      });
    }

    Object.assign(journalEntry, req.body);
    journalEntry.updatedBy = req.user?._id;
    await journalEntry.save();

    res.status(200).json({
      success: true,
      message: "Journal entry updated successfully",
      data: journalEntry,
    });
  } catch (error) {
    console.error("Error updating journal entry:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error updating journal entry",
    });
  }
};

// Delete journal entry
exports.deleteJournalEntry = async (req, res) => {
  try {
    const journalEntry = await JournalEntry.findById(req.params.id);

    if (!journalEntry) {
      return res.status(404).json({
        success: false,
        message: "Journal entry not found",
      });
    }

    if (journalEntry.status === "Posted") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete posted journal entry. Please reverse instead.",
      });
    }

    await journalEntry.deleteOne();

    res.status(200).json({
      success: true,
      message: "Journal entry deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting journal entry:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting journal entry",
    });
  }
};

// Post journal entry
exports.postJournalEntry = async (req, res) => {
  try {
    const journalEntry = await JournalEntry.findById(req.params.id);

    if (!journalEntry) {
      return res.status(404).json({
        success: false,
        message: "Journal entry not found",
      });
    }

    await journalEntry.post(req.user?._id);

    // Create ledger entries
    for (const line of journalEntry.lines) {
      const ledgerEntry = new Ledger({
        account: line.account,
        accountCode: line.accountCode,
        accountName: line.accountName,
        businessType: journalEntry.businessType,
        transactionDate: journalEntry.entryDate,
        journalEntry: journalEntry._id,
        entryNumber: journalEntry.entryNumber,
        description: line.description || journalEntry.description,
        reference: journalEntry.reference,
        referenceId: journalEntry.referenceId,
        referenceModel: journalEntry.referenceModel,
        debitAmount: line.debitAmount,
        creditAmount: line.creditAmount,
        fiscalYear: journalEntry.fiscalYear,
        fiscalPeriod: journalEntry.fiscalPeriod,
      });
      await ledgerEntry.save();
    }

    res.status(200).json({
      success: true,
      message: "Journal entry posted successfully",
      data: journalEntry,
    });
  } catch (error) {
    console.error("Error posting journal entry:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error posting journal entry",
    });
  }
};

// Reverse journal entry
exports.reverseJournalEntry = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Reversal reason is required",
      });
    }

    const journalEntry = await JournalEntry.findById(req.params.id);

    if (!journalEntry) {
      return res.status(404).json({
        success: false,
        message: "Journal entry not found",
      });
    }

    const reversalEntry = await journalEntry.reverse(req.user?._id, reason);

    // Create ledger entries for reversal
    for (const line of reversalEntry.lines) {
      const ledgerEntry = new Ledger({
        account: line.account,
        accountCode: line.accountCode,
        accountName: line.accountName,
        businessType: reversalEntry.businessType,
        transactionDate: reversalEntry.entryDate,
        journalEntry: reversalEntry._id,
        entryNumber: reversalEntry.entryNumber,
        description: line.description,
        reference: reversalEntry.reference,
        debitAmount: line.debitAmount,
        creditAmount: line.creditAmount,
        fiscalYear: reversalEntry.fiscalYear,
        fiscalPeriod: reversalEntry.fiscalPeriod,
      });
      await ledgerEntry.save();
    }

    // Mark original ledger entries as reversed
    await Ledger.updateMany(
      { journalEntry: journalEntry._id },
      { isReversed: true }
    );

    res.status(200).json({
      success: true,
      message: "Journal entry reversed successfully",
      data: {
        originalEntry: journalEntry,
        reversalEntry,
      },
    });
  } catch (error) {
    console.error("Error reversing journal entry:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Error reversing journal entry",
    });
  }
};

// Get journal entries by date range
exports.getJournalEntriesByDateRange = async (req, res) => {
  try {
    const { businessType } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Start date and end date are required",
      });
    }

    const journalEntries = await JournalEntry.find({
      businessType,
      entryDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
      status: "Posted",
    })
      .populate("lines.account", "accountCode accountName")
      .sort({ entryDate: 1 });

    res.status(200).json({
      success: true,
      count: journalEntries.length,
      data: journalEntries,
    });
  } catch (error) {
    console.error("Error fetching journal entries by date range:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching journal entries",
    });
  }
};


