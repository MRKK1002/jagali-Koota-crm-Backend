const mongoose = require("mongoose");

const securitySettingsSchema = new mongoose.Schema(
  {
    businessType: {
      type: String,
      enum: ["restaurant", "construction", "common"],
      required: true,
      unique: true,
    },
    // Password Policy
    passwordPolicy: {
      minLength: {
        type: Number,
        default: 8,
      },
      requireUppercase: {
        type: Boolean,
        default: true,
      },
      requireLowercase: {
        type: Boolean,
        default: true,
      },
      requireNumbers: {
        type: Boolean,
        default: true,
      },
      requireSpecialChars: {
        type: Boolean,
        default: true,
      },
      maxAge: {
        type: Number,
        default: 90, // Days
      },
      preventReuse: {
        type: Number,
        default: 5, // Remember last 5 passwords
      },
    },
    // Session Settings
    sessionSettings: {
      maxSessionDuration: {
        type: Number,
        default: 480, // Minutes (8 hours)
      },
      idleTimeout: {
        type: Number,
        default: 60, // Minutes
      },
      maxConcurrentSessions: {
        type: Number,
        default: 3,
      },
      rememberMeDuration: {
        type: Number,
        default: 30, // Days
      },
    },
    // 2FA Settings
    twoFactorSettings: {
      enforceFor: {
        type: String,
        enum: ["None", "Admins", "All"],
        default: "None",
      },
      allowedMethods: {
        type: [String],
        enum: ["email", "sms", "authenticator"],
        default: ["email", "sms", "authenticator"],
      },
      trustDeviceDuration: {
        type: Number,
        default: 30, // Days
      },
    },
    // Login Security
    loginSecurity: {
      maxFailedAttempts: {
        type: Number,
        default: 5,
      },
      lockoutDuration: {
        type: Number,
        default: 30, // Minutes
      },
      captchaAfterFailures: {
        type: Number,
        default: 3,
      },
      allowedIpRanges: [String], // Optional IP whitelisting
      blockSuspiciousIPs: {
        type: Boolean,
        default: true,
      },
    },
    // Access Control
    accessControl: {
      enforceIPWhitelist: {
        type: Boolean,
        default: false,
      },
      allowedIPs: [String],
      blockVPN: {
        type: Boolean,
        default: false,
      },
      blockTor: {
        type: Boolean,
        default: true,
      },
      geoBlocking: {
        enabled: {
          type: Boolean,
          default: false,
        },
        allowedCountries: [String],
        blockedCountries: [String],
      },
    },
    // Audit Settings
    auditSettings: {
      logAllActions: {
        type: Boolean,
        default: true,
      },
      retentionPeriod: {
        type: Number,
        default: 365, // Days
      },
      alertOnSuspiciousActivity: {
        type: Boolean,
        default: true,
      },
      notifyAdmins: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "SubAdmin",
        },
      ],
    },
    // Data Security
    dataSecurity: {
      encryptSensitiveData: {
        type: Boolean,
        default: true,
      },
      maskPII: {
        type: Boolean,
        default: true,
      },
      allowDataExport: {
        type: Boolean,
        default: true,
      },
      requireApprovalForExport: {
        type: Boolean,
        default: true,
      },
    },
    // API Security
    apiSecurity: {
      enableRateLimiting: {
        type: Boolean,
        default: true,
      },
      maxRequestsPerMinute: {
        type: Number,
        default: 100,
      },
      requireAPIKey: {
        type: Boolean,
        default: false,
      },
      allowedOrigins: [String], // CORS
    },
    // File Upload Security
    fileUploadSecurity: {
      allowedExtensions: {
        type: [String],
        default: ["pdf", "doc", "docx", "xls", "xlsx", "jpg", "jpeg", "png", "gif"],
      },
      maxFileSize: {
        type: Number,
        default: 10, // MB
      },
      scanForVirus: {
        type: Boolean,
        default: false,
      },
      allowExecutables: {
        type: Boolean,
        default: false,
      },
    },
    // Compliance
    compliance: {
      gdprCompliant: {
        type: Boolean,
        default: false,
      },
      dataRetentionPeriod: {
        type: Number,
        default: 1095, // Days (3 years)
      },
      rightToDelete: {
        type: Boolean,
        default: true,
      },
      consentRequired: {
        type: Boolean,
        default: false,
      },
    },
    // Metadata
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubAdmin",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
securitySettingsSchema.index({ businessType: 1 });

// Static method to get settings for business type
securitySettingsSchema.statics.getSettings = async function (businessType) {
  let settings = await this.findOne({ businessType, isActive: true });

  // If not found, create default settings
  if (!settings) {
    settings = await this.create({ businessType });
  }

  return settings;
};

// Validate password against policy
securitySettingsSchema.methods.validatePassword = function (password) {
  const { minLength, requireUppercase, requireLowercase, requireNumbers, requireSpecialChars } =
    this.passwordPolicy;

  const errors = [];

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }

  if (requireUppercase && !/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (requireLowercase && !/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (requireNumbers && !/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Check if IP is allowed
securitySettingsSchema.methods.isIPAllowed = function (ipAddress) {
  const { enforceIPWhitelist, allowedIPs } = this.accessControl;

  if (!enforceIPWhitelist) return true;
  if (!allowedIPs || allowedIPs.length === 0) return true;

  return allowedIPs.includes(ipAddress);
};

// Check if file is allowed
securitySettingsSchema.methods.isFileAllowed = function (filename, fileSize) {
  const { allowedExtensions, maxFileSize, allowExecutables } = this.fileUploadSecurity;

  const extension = filename.split(".").pop().toLowerCase();

  // Check extension
  if (!allowedExtensions.includes(extension)) {
    return { allowed: false, reason: `File type .${extension} is not allowed` };
  }

  // Check executable
  const executableExtensions = ["exe", "bat", "cmd", "sh", "app", "dmg"];
  if (!allowExecutables && executableExtensions.includes(extension)) {
    return { allowed: false, reason: "Executable files are not allowed" };
  }

  // Check file size (convert from bytes to MB)
  const fileSizeMB = fileSize / (1024 * 1024);
  if (fileSizeMB > maxFileSize) {
    return { allowed: false, reason: `File size exceeds ${maxFileSize}MB limit` };
  }

  return { allowed: true };
};

module.exports = mongoose.model("SecuritySettings", securitySettingsSchema);


