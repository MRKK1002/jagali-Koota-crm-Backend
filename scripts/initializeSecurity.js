const mongoose = require("mongoose");
const dotenv = require("dotenv");
const SecuritySettings = require("../model/SecuritySettings");

dotenv.config();

async function initializeSecurity() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ MongoDB Connected");

    const businessTypes = ["restaurant", "construction", "common"];

    for (const businessType of businessTypes) {
      // Check if settings already exist
      const existing = await SecuritySettings.findOne({ businessType });

      if (existing) {
        console.log(`⚠️  Security settings already exist for ${businessType}`);
        continue;
      }

      // Create default security settings
      const settings = new SecuritySettings({
        businessType,
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true,
          maxAge: 90, // Days
          preventReuse: 5,
        },
        sessionSettings: {
          maxSessionDuration: 480, // 8 hours
          idleTimeout: 60,
          maxConcurrentSessions: 3,
          rememberMeDuration: 30,
        },
        twoFactorSettings: {
          enforceFor: "None", // Can be "None", "Admins", "All"
          allowedMethods: ["email", "sms", "authenticator"],
          trustDeviceDuration: 30,
        },
        loginSecurity: {
          maxFailedAttempts: 5,
          lockoutDuration: 30,
          captchaAfterFailures: 3,
          allowedIpRanges: [],
          blockSuspiciousIPs: true,
        },
        accessControl: {
          enforceIPWhitelist: false,
          allowedIPs: [],
          blockVPN: false,
          blockTor: true,
          geoBlocking: {
            enabled: false,
            allowedCountries: [],
            blockedCountries: [],
          },
        },
        auditSettings: {
          logAllActions: true,
          retentionPeriod: 365, // Days
          alertOnSuspiciousActivity: true,
          notifyAdmins: [],
        },
        dataSecurity: {
          encryptSensitiveData: true,
          maskPII: true,
          allowDataExport: true,
          requireApprovalForExport: true,
        },
        apiSecurity: {
          enableRateLimiting: true,
          maxRequestsPerMinute: 100,
          requireAPIKey: false,
          allowedOrigins: [
            "http://localhost:5173",
            "https://hotelviratrestaurant.netlify.app",
            "https://hotelvirat.netlify.app",
          ],
        },
        fileUploadSecurity: {
          allowedExtensions: ["pdf", "doc", "docx", "xls", "xlsx", "jpg", "jpeg", "png", "gif"],
          maxFileSize: 10, // MB
          scanForVirus: false,
          allowExecutables: false,
        },
        compliance: {
          gdprCompliant: false,
          dataRetentionPeriod: 1095, // 3 years
          rightToDelete: true,
          consentRequired: false,
        },
        isActive: true,
      });

      await settings.save();
      console.log(`✅ Created default security settings for ${businessType}`);
    }

    console.log("\n🎉 Security initialization complete!");
    console.log("\n📋 Summary:");
    console.log("   - Password Policy: 8+ chars with uppercase, lowercase, numbers, special chars");
    console.log("   - Session Timeout: 8 hours max, 60 min idle");
    console.log("   - 2FA: Available but not enforced by default");
    console.log("   - Login Security: 5 attempts before lockout");
    console.log("   - Audit Logs: Enabled for all actions");
    console.log("   - File Uploads: Max 10MB, common formats allowed");
    console.log("\n💡 Next Steps:");
    console.log("   1. Configure email/SMS providers for 2FA");
    console.log("   2. Customize security policies per business type");
    console.log("   3. Enable 2FA for admin users");
    console.log("   4. Review and adjust IP whitelisting if needed");

    mongoose.connection.close();
  } catch (error) {
    console.error("❌ Error initializing security:", error);
    mongoose.connection.close();
    process.exit(1);
  }
}

initializeSecurity();


