const mongoose = require("mongoose");
const crypto = require("crypto");

const twoFactorAuthSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubAdmin",
      required: true,
      unique: true,
    },
    // 2FA Status
    isEnabled: {
      type: Boolean,
      default: false,
    },
    method: {
      type: String,
      enum: ["email", "sms", "authenticator", "none"],
      default: "none",
    },
    // Secret for TOTP (Time-based One-Time Password) - Google Authenticator
    secret: {
      type: String,
      select: false, // Don't return in queries by default
    },
    backupCodes: {
      type: [String],
      select: false, // Don't return in queries by default
    },
    // Contact Info for OTP
    phoneNumber: String,
    email: String,
    // Current OTP Session
    currentOTP: {
      code: String,
      expiresAt: Date,
      attempts: {
        type: Number,
        default: 0,
      },
    },
    // Security Settings
    maxOTPAttempts: {
      type: Number,
      default: 5,
    },
    otpExpiryMinutes: {
      type: Number,
      default: 10,
    },
    // Trust Devices
    trustedDevices: [
      {
        deviceId: String,
        deviceName: String,
        ipAddress: String,
        userAgent: String,
        trustedAt: {
          type: Date,
          default: Date.now,
        },
        expiresAt: Date, // Optional: auto-expire trust after 30 days
        lastUsed: Date,
      },
    ],
    // Recovery
    recoveryEmail: String,
    recoveryPhone: String,
    // Last 2FA events
    lastVerifiedAt: Date,
    lastFailedAttempt: Date,
    failedAttempts: {
      type: Number,
      default: 0,
    },
    // Lockout
    isLockedOut: {
      type: Boolean,
      default: false,
    },
    lockoutUntil: Date,
    // Metadata
    enabledAt: Date,
    disabledAt: Date,
    businessType: {
      type: String,
      enum: ["restaurant", "construction", "common"],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
// user index is automatically created by unique: true constraint
twoFactorAuthSchema.index({ isEnabled: 1, businessType: 1 });

// Generate OTP
twoFactorAuthSchema.methods.generateOTP = function () {
  const otp = crypto.randomInt(100000, 999999).toString(); // 6-digit OTP
  this.currentOTP = {
    code: otp,
    expiresAt: new Date(Date.now() + this.otpExpiryMinutes * 60 * 1000),
    attempts: 0,
  };
  return otp;
};

// Verify OTP
twoFactorAuthSchema.methods.verifyOTP = function (inputOTP) {
  // Check lockout
  if (this.isLockedOut && this.lockoutUntil > new Date()) {
    return {
      success: false,
      message: "Account temporarily locked due to too many failed attempts",
      lockedUntil: this.lockoutUntil,
    };
  }

  // Reset lockout if expired
  if (this.isLockedOut && this.lockoutUntil <= new Date()) {
    this.isLockedOut = false;
    this.lockoutUntil = null;
    this.failedAttempts = 0;
  }

  // Check if OTP exists
  if (!this.currentOTP || !this.currentOTP.code) {
    return { success: false, message: "No OTP generated" };
  }

  // Check expiry
  if (this.currentOTP.expiresAt < new Date()) {
    return { success: false, message: "OTP expired" };
  }

  // Check attempts
  if (this.currentOTP.attempts >= this.maxOTPAttempts) {
    return { success: false, message: "Maximum OTP attempts exceeded" };
  }

  // Verify OTP
  if (this.currentOTP.code === inputOTP) {
    this.lastVerifiedAt = new Date();
    this.failedAttempts = 0;
    this.currentOTP = null; // Clear OTP
    return { success: true, message: "OTP verified successfully" };
  } else {
    this.currentOTP.attempts += 1;
    this.failedAttempts += 1;
    this.lastFailedAttempt = new Date();

    // Lock account after 10 failed attempts
    if (this.failedAttempts >= 10) {
      this.isLockedOut = true;
      this.lockoutUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes lockout
    }

    return { success: false, message: "Invalid OTP", attemptsLeft: this.maxOTPAttempts - this.currentOTP.attempts };
  }
};

// Generate Backup Codes
twoFactorAuthSchema.methods.generateBackupCodes = function (count = 10) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase(); // 8-char hex
    codes.push(code);
  }
  this.backupCodes = codes;
  return codes;
};

// Verify Backup Code
twoFactorAuthSchema.methods.verifyBackupCode = function (code) {
  const codeIndex = this.backupCodes.findIndex((c) => c === code.toUpperCase());
  if (codeIndex > -1) {
    this.backupCodes.splice(codeIndex, 1); // Remove used code
    this.lastVerifiedAt = new Date();
    return { success: true, message: "Backup code verified", codesRemaining: this.backupCodes.length };
  }
  return { success: false, message: "Invalid backup code" };
};

// Check if device is trusted
twoFactorAuthSchema.methods.isDeviceTrusted = function (deviceId) {
  const device = this.trustedDevices.find(
    (d) => d.deviceId === deviceId && (!d.expiresAt || d.expiresAt > new Date())
  );
  return !!device;
};

// Add trusted device
twoFactorAuthSchema.methods.addTrustedDevice = function (
  deviceId,
  deviceName,
  ipAddress,
  userAgent,
  expiryDays = 30
) {
  // Remove existing device if present
  this.trustedDevices = this.trustedDevices.filter((d) => d.deviceId !== deviceId);

  // Add new trusted device
  this.trustedDevices.push({
    deviceId,
    deviceName,
    ipAddress,
    userAgent,
    trustedAt: new Date(),
    expiresAt: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000),
    lastUsed: new Date(),
  });
};

// Update device last used
twoFactorAuthSchema.methods.updateDeviceLastUsed = function (deviceId) {
  const device = this.trustedDevices.find((d) => d.deviceId === deviceId);
  if (device) {
    device.lastUsed = new Date();
  }
};

// Remove trusted device
twoFactorAuthSchema.methods.removeTrustedDevice = function (deviceId) {
  this.trustedDevices = this.trustedDevices.filter((d) => d.deviceId !== deviceId);
};

// Enable 2FA
twoFactorAuthSchema.methods.enable = function (method) {
  this.isEnabled = true;
  this.method = method;
  this.enabledAt = new Date();
  this.disabledAt = null;
};

// Disable 2FA
twoFactorAuthSchema.methods.disable = function () {
  this.isEnabled = false;
  this.method = "none";
  this.disabledAt = new Date();
  this.currentOTP = null;
  this.trustedDevices = [];
};

module.exports = mongoose.model("TwoFactorAuth", twoFactorAuthSchema);


