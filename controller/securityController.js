const AuditLog = require("../model/AuditLog");
const TwoFactorAuth = require("../model/TwoFactorAuth");
const UserSession = require("../model/UserSession");
const SecuritySettings = require("../model/SecuritySettings");

// ==================== AUDIT LOGS ====================

// Get all audit logs with filtering
exports.getAuditLogs = async (req, res) => {
  try {
    const {
      businessType,
      userId,
      action,
      module,
      startDate,
      endDate,
      status,
      severity,
      page = 1,
      limit = 50,
    } = req.query;

    const query = {};

    if (businessType) query.businessType = businessType;
    if (userId) query.user = userId;
    if (action) query.action = action;
    if (module) query.module = module;
    if (status) query.status = status;
    if (severity) query.severity = severity;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .populate("user", "name email");

    const total = await AuditLog.countDocuments(query);

    res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching audit logs",
      error: error.message,
    });
  }
};

// Get user activity
exports.getUserActivity = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, action, module, limit = 50 } = req.query;

    const logs = await AuditLog.getUserActivity(userId, {
      startDate,
      endDate,
      action,
      module,
      limit: parseInt(limit),
    });

    res.status(200).json({
      success: true,
      data: logs,
      count: logs.length,
    });
  } catch (error) {
    console.error("Error fetching user activity:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user activity",
      error: error.message,
    });
  }
};

// Get suspicious activities
exports.getSuspiciousActivities = async (req, res) => {
  try {
    const { businessType, limit = 50 } = req.query;

    const logs = await AuditLog.getSuspiciousActivities(businessType, {
      limit: parseInt(limit),
    });

    res.status(200).json({
      success: true,
      data: logs,
      count: logs.length,
    });
  } catch (error) {
    console.error("Error fetching suspicious activities:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching suspicious activities",
      error: error.message,
    });
  }
};

// Flag audit log
exports.flagAuditLog = async (req, res) => {
  try {
    const { logId } = req.params;
    const { suspiciousReason } = req.body;

    const log = await AuditLog.findByIdAndUpdate(
      logId,
      {
        isSuspicious: true,
        suspiciousReason,
        flaggedForReview: true,
      },
      { new: true }
    );

    if (!log) {
      return res.status(404).json({
        success: false,
        message: "Audit log not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Audit log flagged successfully",
      data: log,
    });
  } catch (error) {
    console.error("Error flagging audit log:", error);
    res.status(500).json({
      success: false,
      message: "Error flagging audit log",
      error: error.message,
    });
  }
};

// Review audit log
exports.reviewAuditLog = async (req, res) => {
  try {
    const { logId } = req.params;
    const { reviewNotes } = req.body;

    const log = await AuditLog.findByIdAndUpdate(
      logId,
      {
        reviewedBy: req.user._id,
        reviewedAt: new Date(),
        reviewNotes,
        flaggedForReview: false,
      },
      { new: true }
    );

    if (!log) {
      return res.status(404).json({
        success: false,
        message: "Audit log not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Audit log reviewed successfully",
      data: log,
    });
  } catch (error) {
    console.error("Error reviewing audit log:", error);
    res.status(500).json({
      success: false,
      message: "Error reviewing audit log",
      error: error.message,
    });
  }
};

// Get audit statistics
exports.getAuditStats = async (req, res) => {
  try {
    const { businessType, days = 7 } = req.query;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const query = {
      createdAt: { $gte: since },
    };

    if (businessType) query.businessType = businessType;

    const stats = await AuditLog.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            action: "$action",
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.date": 1 } },
    ]);

    const summary = await AuditLog.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalActions: { $sum: 1 },
          uniqueUsers: { $addToSet: "$user" },
          failedActions: {
            $sum: { $cond: [{ $eq: ["$status", "Failed"] }, 1, 0] },
          },
          suspiciousActions: {
            $sum: { $cond: ["$isSuspicious", 1, 0] },
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        timeline: stats,
        summary: summary[0] || {},
      },
    });
  } catch (error) {
    console.error("Error fetching audit stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching audit stats",
      error: error.message,
    });
  }
};

// ==================== 2FA ====================

// Enable 2FA
exports.enable2FA = async (req, res) => {
  try {
    const { method, phoneNumber, email } = req.body;

    let twoFA = await TwoFactorAuth.findOne({ user: req.user._id });

    if (!twoFA) {
      twoFA = new TwoFactorAuth({
        user: req.user._id,
        businessType: req.user.type,
      });
    }

    twoFA.enable(method);

    if (method === "sms" && phoneNumber) {
      twoFA.phoneNumber = phoneNumber;
    }

    if (method === "email" && email) {
      twoFA.email = email;
    }

    // Generate OTP for verification
    const otp = twoFA.generateOTP();
    await twoFA.save();

    // TODO: Send OTP via email/SMS based on method
    // await sendOTP(method, phoneNumber || email, otp);

    res.status(200).json({
      success: true,
      message: `2FA enabled via ${method}. OTP sent for verification.`,
      otp, // Remove in production
    });
  } catch (error) {
    console.error("Error enabling 2FA:", error);
    res.status(500).json({
      success: false,
      message: "Error enabling 2FA",
      error: error.message,
    });
  }
};

// Disable 2FA
exports.disable2FA = async (req, res) => {
  try {
    const twoFA = await TwoFactorAuth.findOne({ user: req.user._id });

    if (!twoFA) {
      return res.status(404).json({
        success: false,
        message: "2FA not configured",
      });
    }

    twoFA.disable();
    await twoFA.save();

    res.status(200).json({
      success: true,
      message: "2FA disabled successfully",
    });
  } catch (error) {
    console.error("Error disabling 2FA:", error);
    res.status(500).json({
      success: false,
      message: "Error disabling 2FA",
      error: error.message,
    });
  }
};

// Verify 2FA OTP
exports.verify2FA = async (req, res) => {
  try {
    const { otp, backupCode } = req.body;

    const twoFA = await TwoFactorAuth.findOne({ user: req.user._id }).select("+backupCodes");

    if (!twoFA || !twoFA.isEnabled) {
      return res.status(400).json({
        success: false,
        message: "2FA not enabled",
      });
    }

    let result;

    if (backupCode) {
      result = twoFA.verifyBackupCode(backupCode);
    } else if (otp) {
      result = twoFA.verifyOTP(otp);
    } else {
      return res.status(400).json({
        success: false,
        message: "OTP or backup code required",
      });
    }

    await twoFA.save();

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    console.error("Error verifying 2FA:", error);
    res.status(500).json({
      success: false,
      message: "Error verifying 2FA",
      error: error.message,
    });
  }
};

// Generate backup codes
exports.generate2FABackupCodes = async (req, res) => {
  try {
    const twoFA = await TwoFactorAuth.findOne({ user: req.user._id });

    if (!twoFA || !twoFA.isEnabled) {
      return res.status(400).json({
        success: false,
        message: "2FA not enabled",
      });
    }

    const codes = twoFA.generateBackupCodes();
    await twoFA.save();

    res.status(200).json({
      success: true,
      message: "Backup codes generated successfully",
      backupCodes: codes,
    });
  } catch (error) {
    console.error("Error generating backup codes:", error);
    res.status(500).json({
      success: false,
      message: "Error generating backup codes",
      error: error.message,
    });
  }
};

// Get trusted devices
exports.getTrustedDevices = async (req, res) => {
  try {
    const twoFA = await TwoFactorAuth.findOne({ user: req.user._id });

    if (!twoFA) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    res.status(200).json({
      success: true,
      data: twoFA.trustedDevices,
    });
  } catch (error) {
    console.error("Error fetching trusted devices:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching trusted devices",
      error: error.message,
    });
  }
};

// Add trusted device
exports.addTrustedDevice = async (req, res) => {
  try {
    const { deviceId, deviceName, ipAddress, userAgent } = req.body;

    let twoFA = await TwoFactorAuth.findOne({ user: req.user._id });

    if (!twoFA) {
      twoFA = new TwoFactorAuth({
        user: req.user._id,
        businessType: req.user.type,
      });
    }

    twoFA.addTrustedDevice(deviceId, deviceName, ipAddress, userAgent);
    await twoFA.save();

    res.status(200).json({
      success: true,
      message: "Device trusted successfully",
      data: twoFA.trustedDevices,
    });
  } catch (error) {
    console.error("Error adding trusted device:", error);
    res.status(500).json({
      success: false,
      message: "Error adding trusted device",
      error: error.message,
    });
  }
};

// Remove trusted device
exports.removeTrustedDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;

    const twoFA = await TwoFactorAuth.findOne({ user: req.user._id });

    if (!twoFA) {
      return res.status(404).json({
        success: false,
        message: "2FA not configured",
      });
    }

    twoFA.removeTrustedDevice(deviceId);
    await twoFA.save();

    res.status(200).json({
      success: true,
      message: "Device removed successfully",
      data: twoFA.trustedDevices,
    });
  } catch (error) {
    console.error("Error removing trusted device:", error);
    res.status(500).json({
      success: false,
      message: "Error removing trusted device",
      error: error.message,
    });
  }
};

// ==================== SESSION MANAGEMENT ====================

// Get active sessions
exports.getActiveSessions = async (req, res) => {
  try {
    const sessions = await UserSession.getActiveSessions(req.user._id);

    res.status(200).json({
      success: true,
      data: sessions,
      count: sessions.length,
    });
  } catch (error) {
    console.error("Error fetching active sessions:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching active sessions",
      error: error.message,
    });
  }
};

// Get current session
exports.getCurrentSession = async (req, res) => {
  try {
    const session = await UserSession.findOne({
      sessionId: req.sessionId, // Assuming middleware sets this
      isActive: true,
    });

    res.status(200).json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error("Error fetching current session:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching current session",
      error: error.message,
    });
  }
};

// Revoke specific session
exports.revokeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await UserSession.findOne({ sessionId, user: req.user._id });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    session.revoke("User requested");
    await session.save();

    res.status(200).json({
      success: true,
      message: "Session revoked successfully",
    });
  } catch (error) {
    console.error("Error revoking session:", error);
    res.status(500).json({
      success: false,
      message: "Error revoking session",
      error: error.message,
    });
  }
};

// Revoke all sessions
exports.revokeAllSessions = async (req, res) => {
  try {
    const { exceptCurrent } = req.query;

    const count = await UserSession.revokeAllUserSessions(
      req.user._id,
      exceptCurrent ? req.sessionId : null
    );

    res.status(200).json({
      success: true,
      message: `${count} session(s) revoked successfully`,
      count,
    });
  } catch (error) {
    console.error("Error revoking all sessions:", error);
    res.status(500).json({
      success: false,
      message: "Error revoking all sessions",
      error: error.message,
    });
  }
};

// Get session statistics
exports.getSessionStats = async (req, res) => {
  try {
    const { businessType, days = 7 } = req.query;

    const stats = await UserSession.getSessionStats(businessType, parseInt(days));

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching session stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching session stats",
      error: error.message,
    });
  }
};

// ==================== SECURITY SETTINGS ====================

// Get security settings
exports.getSecuritySettings = async (req, res) => {
  try {
    const { businessType } = req.params;

    const settings = await SecuritySettings.getSettings(businessType);

    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error("Error fetching security settings:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching security settings",
      error: error.message,
    });
  }
};

// Update security settings
exports.updateSecuritySettings = async (req, res) => {
  try {
    const { businessType } = req.params;
    const updates = req.body;

    let settings = await SecuritySettings.findOne({ businessType });

    if (!settings) {
      settings = new SecuritySettings({ businessType, ...updates });
    } else {
      Object.assign(settings, updates);
    }

    settings.lastUpdatedBy = req.user._id;
    await settings.save();

    res.status(200).json({
      success: true,
      message: "Security settings updated successfully",
      data: settings,
    });
  } catch (error) {
    console.error("Error updating security settings:", error);
    res.status(500).json({
      success: false,
      message: "Error updating security settings",
      error: error.message,
    });
  }
};

// Validate password against policy
exports.validatePassword = async (req, res) => {
  try {
    const { password, businessType } = req.body;

    const settings = await SecuritySettings.getSettings(businessType);
    const validation = settings.validatePassword(password);

    res.status(200).json({
      success: true,
      ...validation,
    });
  } catch (error) {
    console.error("Error validating password:", error);
    res.status(500).json({
      success: false,
      message: "Error validating password",
      error: error.message,
    });
  }
};


