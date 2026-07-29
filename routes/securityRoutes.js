const express = require("express");
const router = express.Router();
const {
  // Audit Logs
  getAuditLogs,
  getUserActivity,
  getSuspiciousActivities,
  flagAuditLog,
  reviewAuditLog,
  getAuditStats,
  
  // 2FA
  enable2FA,
  disable2FA,
  verify2FA,
  generate2FABackupCodes,
  getTrustedDevices,
  addTrustedDevice,
  removeTrustedDevice,
  
  // Session Management
  getActiveSessions,
  revokeSession,
  revokeAllSessions,
  getSessionStats,
  getCurrentSession,
  
  // Security Settings
  getSecuritySettings,
  updateSecuritySettings,
  validatePassword,
} = require("../controller/securityController");

// Middleware (using existing authMiddleware)
const authenticate = require("../middleware/authMiddleware");

// ==================== AUDIT LOGS ====================
router.get("/audit-logs", authenticate, getAuditLogs);
router.get("/audit-logs/user/:userId", authenticate, getUserActivity);
router.get("/audit-logs/suspicious", authenticate, getSuspiciousActivities);
router.patch("/audit-logs/:logId/flag", authenticate, flagAuditLog);
router.patch("/audit-logs/:logId/review", authenticate, reviewAuditLog);
router.get("/audit-logs/stats", authenticate, getAuditStats);

// ==================== 2FA ====================
router.post("/2fa/enable", authenticate, enable2FA);
router.post("/2fa/disable", authenticate, disable2FA);
router.post("/2fa/verify", authenticate, verify2FA);
router.post("/2fa/backup-codes", authenticate, generate2FABackupCodes);
router.get("/2fa/trusted-devices", authenticate, getTrustedDevices);
router.post("/2fa/trusted-devices", authenticate, addTrustedDevice);
router.delete("/2fa/trusted-devices/:deviceId", authenticate, removeTrustedDevice);

// ==================== SESSION MANAGEMENT ====================
router.get("/sessions", authenticate, getActiveSessions);
router.get("/sessions/current", authenticate, getCurrentSession);
router.delete("/sessions/:sessionId", authenticate, revokeSession);
router.delete("/sessions/revoke-all", authenticate, revokeAllSessions);
router.get("/sessions/stats", authenticate, getSessionStats);

// ==================== SECURITY SETTINGS ====================
router.get("/settings/:businessType", authenticate, getSecuritySettings);
router.put("/settings/:businessType", authenticate, updateSecuritySettings);
router.post("/settings/validate-password", authenticate, validatePassword);

module.exports = router;

