const mongoose = require("mongoose");

const journalEntryLineSchema = new mongoose.Schema({
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
  description: {
    type: String,
    trim: true,
  },
});

const journalEntrySchema = new mongoose.Schema(
  {
    entryNumber: {
      type: String,
      required: true,
      unique: true,
    },
    entryDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    businessType: {
      type: String,
      required: true,
      enum: ["restaurant", "construction"],
    },
    entryType: {
      type: String,
      required: true,
      enum: [
        "Manual",
        "Sales Invoice",
        "Purchase Invoice",
        "Payment",
        "Receipt",
        "Expense",
        "Payroll",
        "Opening Balance",
        "Closing",
        "Adjustment",
        "Depreciation",
      ],
    },
    reference: {
      type: String,
      trim: true,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      // Can reference Invoice, Payment, etc.
    },
    referenceModel: {
      type: String,
      enum: [
        "Invoice",
        "Payment",
        "PurchaseCons",
        "VendorPayment",
        "Expense",
        "Payroll",
      ],
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    lines: {
      type: [journalEntryLineSchema],
      required: true,
      validate: {
        validator: function (lines) {
          return lines && lines.length >= 2;
        },
        message: "Journal entry must have at least 2 lines",
      },
    },
    totalDebit: {
      type: Number,
      required: true,
      default: 0,
    },
    totalCredit: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: ["Draft", "Posted", "Reversed"],
      default: "Draft",
    },
    postedDate: {
      type: Date,
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubAdmin",
    },
    reversedDate: {
      type: Date,
    },
    reversedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubAdmin",
    },
    reversalReason: {
      type: String,
    },
    reversalEntry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JournalEntry",
    },
    fiscalYear: {
      type: String,
      required: true,
    },
    fiscalPeriod: {
      type: String,
      required: true,
    },
    attachments: [
      {
        filename: String,
        url: String,
        uploadDate: Date,
      },
    ],
    notes: {
      type: String,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubAdmin",
      required: true,
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
// entryNumber index is automatically created by unique: true constraint
journalEntrySchema.index({ entryDate: 1 });
journalEntrySchema.index({ businessType: 1 });
journalEntrySchema.index({ status: 1 });
journalEntrySchema.index({ fiscalYear: 1, fiscalPeriod: 1 });
journalEntrySchema.index({ entryType: 1 });

// Pre-save validation: Debit must equal Credit
journalEntrySchema.pre("save", function (next) {
  // Calculate totals
  this.totalDebit = this.lines.reduce(
    (sum, line) => sum + (line.debitAmount || 0),
    0
  );
  this.totalCredit = this.lines.reduce(
    (sum, line) => sum + (line.creditAmount || 0),
    0
  );

  // Validate balance
  const difference = Math.abs(this.totalDebit - this.totalCredit);
  if (difference > 0.01) {
    // Allow 1 paisa difference for rounding
    return next(
      new Error(
        `Journal entry not balanced. Debit: ${this.totalDebit}, Credit: ${this.totalCredit}`
      )
    );
  }

  // Validate that each line has either debit or credit, not both
  for (const line of this.lines) {
    if (line.debitAmount > 0 && line.creditAmount > 0) {
      return next(
        new Error("A line cannot have both debit and credit amounts")
      );
    }
    if (line.debitAmount === 0 && line.creditAmount === 0) {
      return next(new Error("A line must have either debit or credit amount"));
    }
  }

  next();
});

// Method to post the journal entry
journalEntrySchema.methods.post = async function (userId) {
  if (this.status === "Posted") {
    throw new Error("Journal entry is already posted");
  }

  // Update account balances
  const ChartOfAccounts = mongoose.model("ChartOfAccounts");

  for (const line of this.lines) {
    const account = await ChartOfAccounts.findById(line.account);
    if (!account) {
      throw new Error(`Account not found: ${line.accountCode}`);
    }

    if (line.debitAmount > 0) {
      await account.updateBalance(line.debitAmount, "debit");
    } else if (line.creditAmount > 0) {
      await account.updateBalance(line.creditAmount, "credit");
    }
  }

  this.status = "Posted";
  this.postedDate = new Date();
  this.postedBy = userId;
  await this.save();

  return this;
};

// Method to reverse the journal entry
journalEntrySchema.methods.reverse = async function (userId, reason) {
  if (this.status !== "Posted") {
    throw new Error("Only posted entries can be reversed");
  }

  // Create reversal entry
  const reversalLines = this.lines.map((line) => ({
    account: line.account,
    accountCode: line.accountCode,
    accountName: line.accountName,
    debitAmount: line.creditAmount, // Swap debit and credit
    creditAmount: line.debitAmount,
    description: `Reversal: ${line.description}`,
  }));

  const reversalEntry = new this.constructor({
    entryNumber: `REV-${this.entryNumber}`,
    entryDate: new Date(),
    businessType: this.businessType,
    entryType: "Adjustment",
    reference: this.reference,
    description: `Reversal of ${this.entryNumber}: ${reason}`,
    lines: reversalLines,
    fiscalYear: this.fiscalYear,
    fiscalPeriod: this.fiscalPeriod,
    createdBy: userId,
  });

  await reversalEntry.save();
  await reversalEntry.post(userId);

  this.status = "Reversed";
  this.reversedDate = new Date();
  this.reversedBy = userId;
  this.reversalReason = reason;
  this.reversalEntry = reversalEntry._id;
  await this.save();

  return reversalEntry;
};

// Static method to generate entry number
journalEntrySchema.statics.generateEntryNumber = async function (
  businessType,
  fiscalYear
) {
  const prefix = businessType === "restaurant" ? "JE-R" : "JE-C";
  const count = await this.countDocuments({
    businessType,
    fiscalYear,
  });
  return `${prefix}-${fiscalYear}-${String(count + 1).padStart(6, "0")}`;
};

module.exports = mongoose.model("JournalEntry", journalEntrySchema);


