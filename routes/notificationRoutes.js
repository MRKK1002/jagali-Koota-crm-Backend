const express = require("express");
const router = express.Router();
const notificationController = require("../controller/NotificationController");

// Notification routess
router.post("/send", notificationController.sendNotification);
router.post("/send-templated", notificationController.sendTemplatedNotification);
router.get("/", notificationController.getAllNotifications);
router.get("/:id", notificationController.getNotificationById);
router.post("/:id/read", notificationController.markAsRead);

// User notifications
router.get("/user/:userId", notificationController.getUserNotifications);

// Template routes
router.post("/templates", notificationController.createTemplate);
router.get("/templates/list", notificationController.getAllTemplates);
router.put("/templates/:id", notificationController.updateTemplate);

// Preference routes
router.get("/preferences/:userId", notificationController.getUserPreferences);
router.put("/preferences/:userId", notificationController.updateUserPreferences);

// Testing routes
router.post("/test/email", notificationController.testEmail);
router.post("/test/sms", notificationController.testSMS);
router.post("/test/whatsapp", notificationController.testWhatsApp);

// Statistics
router.get("/stats/overview", notificationController.getStatistics);

module.exports = router;


