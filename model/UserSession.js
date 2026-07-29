const mongoose = require("mongoose");

const userSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubAdmin",
      required: true,
    },
    sessionId: {
      type: String,
      required: true,
      unique: true,
    },
    jwtToken: {
      type: String,
      required: true,
    },
    refreshToken: String,
    // Device & Location Info
    deviceInfo: {
      deviceId: String,
      deviceName: String,
      browser: String,
      os: String,
      deviceType: {
        type: String,
        enum: ["Desktop", "Mobile", "Tablet", "Other"],
        default: "Other",
      },
    },
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: String,
    location: {
      country: String,
      city: String,
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
    },
    // Session Status
    isActive: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["Active", "Expired", "Revoked", "Logged Out"],
      default: "Active",
    },
    // Timestamps
    loginAt: {
      type: Date,
      default: Date.now,
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    logoutAt: Date,
    // Business Type
    businessType: {
      type: String,
      enum: ["restaurant", "construction", "common"],
    },
    // Security
    is2FAVerified: {
      type: Boolean,
      default: false,
    },
    isTrustedDevice: {
      type: Boolean,
      default: false,
    },
    loginMethod: {
      type: String,
      enum: ["password", "social", "sso", "otp"],
      default: "password",
    },
    // Session Metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
userSessionSchema.index({ user: 1, isActive: 1 });
// sessionId index is automatically created by unique: true constraint
userSessionSchema.index({ jwtToken: 1 });
userSessionSchema.index({ isActive: 1, expiresAt: 1 });
userSessionSchema.index({ businessType: 1 });

// TTL index to auto-delete expired sessions
userSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 }); // 24 hours after expiry

// Update last activity
userSessionSchema.methods.updateActivity = function () {
  this.lastActivityAt = new Date();
};

// Revoke session
userSessionSchema.methods.revoke = function (reason = "Manual") {
  this.isActive = false;
  this.status = "Revoked";
  this.logoutAt = new Date();
  this.metadata = { ...this.metadata, revokeReason: reason };
};

// Mark as expired
userSessionSchema.methods.markExpired = function () {
  this.isActive = false;
  this.status = "Expired";
};

// Logout
userSessionSchema.methods.logout = function () {
  this.isActive = false;
  this.status = "Logged Out";
  this.logoutAt = new Date();
};

// Static method to get user's active sessions
userSessionSchema.statics.getActiveSessions = async function (userId) {
  return await this.find({
    user: userId,
    isActive: true,
    expiresAt: { $gt: new Date() },
  }).sort({ loginAt: -1 });
};

// Static method to revoke all user sessions
userSessionSchema.statics.revokeAllUserSessions = async function (
  userId,
  exceptSessionId = null
) {
  const query = {
    user: userId,
    isActive: true,
  };

  if (exceptSessionId) {
    query.sessionId = { $ne: exceptSessionId };
  }

  const result = await this.updateMany(query, {
    $set: {
      isActive: false,
      status: "Revoked",
      logoutAt: new Date(),
    },
  });

  return result.modifiedCount;
};

// Static method to clean up expired sessions
userSessionSchema.statics.cleanupExpiredSessions = async function () {
  const result = await this.updateMany(
    {
      isActive: true,
      expiresAt: { $lt: new Date() },
    },
    {
      $set: {
        isActive: false,
        status: "Expired",
      },
    }
  );

  return result.modifiedCount;
};

// Static method to get session by token
userSessionSchema.statics.getSessionByToken = async function (jwtToken) {
  return await this.findOne({
    jwtToken,
    isActive: true,
    expiresAt: { $gt: new Date() },
  }).populate("user", "name email type");
};

// Static method to get session statistics
userSessionSchema.statics.getSessionStats = async function (businessType, days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const query = {
    loginAt: { $gte: since },
  };

  if (businessType) {
    query.businessType = businessType;
  }

  const stats = await this.aggregate([
    { $match: query },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$loginAt" } },
          businessType: "$businessType",
        },
        totalLogins: { $sum: 1 },
        uniqueUsers: { $addToSet: "$user" },
        activeNow: {
          $sum: {
            $cond: [{ $and: [{ $eq: ["$isActive", true] }] }, 1, 0],
          },
        },
      },
    },
    {
      $project: {
        _id: 1,
        totalLogins: 1,
        uniqueUsers: { $size: "$uniqueUsers" },
        activeNow: 1,
      },
    },
    { $sort: { "_id.date": 1 } },
  ]);

  return stats;
};

// Static method to detect suspicious sessions
userSessionSchema.statics.detectSuspiciousSessions = async function (userId) {
  const sessions = await this.find({
    user: userId,
    isActive: true,
  }).sort({ loginAt: -1 });

  if (sessions.length < 2) return [];

  const suspicious = [];

  // Detect concurrent logins from different locations
  const ipAddresses = new Set(sessions.map((s) => s.ipAddress));
  if (ipAddresses.size > 1) {
    suspicious.push({
      type: "Multiple IPs",
      message: "User logged in from multiple IP addresses",
      sessions: sessions.map((s) => ({
        sessionId: s.sessionId,
        ipAddress: s.ipAddress,
        location: s.location,
        loginAt: s.loginAt,
      })),
    });
  }

  // Detect unusual device types
  const desktopSessions = sessions.filter((s) => s.deviceInfo.deviceType === "Desktop");
  const mobileSessions = sessions.filter((s) => s.deviceInfo.deviceType === "Mobile");

  if (desktopSessions.length > 0 && mobileSessions.length > 0) {
    suspicious.push({
      type: "Mixed Devices",
      message: "User logged in from both desktop and mobile devices",
      sessions: sessions.map((s) => ({
        sessionId: s.sessionId,
        deviceType: s.deviceInfo.deviceType,
        loginAt: s.loginAt,
      })),
    });
  }

  return suspicious;
};

module.exports = mongoose.model("UserSession", userSessionSchema);


