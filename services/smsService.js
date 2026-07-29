// SMS Service using Twilio or any other SMS provider
// This is a template - configure with your preferred SMS provider

class SMSService {
  constructor() {
    // Initialize SMS provider (e.g., Twilio, AWS SNS, etc.)
    this.provider = process.env.SMS_PROVIDER || "twilio";
    this.configured = this.checkConfiguration();

    if (this.provider === "twilio" && this.configured) {
      const twilio = require("twilio");
      this.client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
    }
  }

  checkConfiguration() {
    if (this.provider === "twilio") {
      return !!(
        process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_PHONE_NUMBER
      );
    }
    return false;
  }

  /**
   * Send a single SMS
   */
  async sendSMS({ to, message }) {
    try {
      if (!this.configured) {
        console.log("📱 SMS not configured. Skipping SMS send.");
        console.log(`   Would send to ${to}: ${message}`);
        return {
          success: false,
          error: "SMS service not configured",
          simulation: true,
        };
      }

      // Ensure phone number has country code
      const phoneNumber = to.startsWith("+") ? to : `+91${to}`;

      if (this.provider === "twilio") {
        const result = await this.client.messages.create({
          body: message,
          from: this.fromNumber,
          to: phoneNumber,
        });

        console.log("✅ SMS sent successfully:", result.sid);

        return {
          success: true,
          messageId: result.sid,
          status: result.status,
        };
      }

      return {
        success: false,
        error: "SMS provider not implemented",
      };
    } catch (error) {
      console.error("❌ SMS send error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send bulk SMS
   */
  async sendBulkSMS(messages) {
    const results = [];

    for (const msg of messages) {
      const result = await this.sendSMS(msg);
      results.push({
        to: msg.to,
        ...result,
      });
    }

    return results;
  }

  /**
   * Send notification SMS
   */
  async sendNotificationSMS(notification) {
    try {
      const { channels } = notification;

      if (!channels.sms.enabled || !channels.sms.phoneNumbers) {
        return {
          success: false,
          error: "SMS not enabled or no phone numbers",
        };
      }

      const results = [];
      for (const phoneNumber of channels.sms.phoneNumbers) {
        const result = await this.sendSMS({
          to: phoneNumber,
          message: channels.sms.message || notification.message,
        });
        results.push(result);
      }

      const allSuccess = results.every((r) => r.success);

      if (allSuccess) {
        await notification.markAsSent("sms");
      } else {
        const errors = results
          .filter((r) => !r.success)
          .map((r) => r.error)
          .join(", ");
        await notification.markAsFailed("sms", errors);
      }

      return {
        success: allSuccess,
        results,
      };
    } catch (error) {
      console.error("❌ Notification SMS error:", error);
      await notification.markAsFailed("sms", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send OTP
   */
  async sendOTP({ to, otp, expiryMinutes = 10 }) {
    const message = `Your OTP is: ${otp}. Valid for ${expiryMinutes} minutes. Do not share with anyone.`;
    return await this.sendSMS({ to, message });
  }

  /**
   * Send payment reminder SMS
   */
  async sendPaymentReminderSMS({ to, invoiceNumber, amount, dueDate }) {
    const message = `Payment reminder: Invoice #${invoiceNumber} for ₹${amount} is due on ${new Date(
      dueDate
    ).toLocaleDateString()}. Please pay soon.`;
    return await this.sendSMS({ to, message });
  }

  /**
   * Send order confirmation SMS
   */
  async sendOrderConfirmationSMS({ to, orderNumber, amount, businessType }) {
    const message = `Order #${orderNumber} confirmed! Amount: ₹${amount}. Thank you for your order. ${businessType.toUpperCase()}`;
    return await this.sendSMS({ to, message });
  }

  /**
   * Send low stock alert SMS
   */
  async sendLowStockAlertSMS({ to, itemName, currentStock, businessType }) {
    const message = `⚠️ LOW STOCK ALERT [${businessType.toUpperCase()}]: ${itemName} - Current stock: ${currentStock}. Please reorder.`;
    return await this.sendSMS({ to, message });
  }

  /**
   * Send approval notification SMS
   */
  async sendApprovalNotificationSMS({ to, type, reference, amount }) {
    const message = `Approval required: ${type} #${reference}${
      amount ? ` (₹${amount})` : ""
    }. Please check your dashboard.`;
    return await this.sendSMS({ to, message });
  }

  /**
   * Send leave approval SMS
   */
  async sendLeaveApprovalSMS({ to, employeeName, leaveType, status }) {
    const message = `Leave ${status}: ${employeeName}'s ${leaveType} request has been ${status.toLowerCase()}.`;
    return await this.sendSMS({ to, message });
  }

  /**
   * Verify SMS configuration
   */
  async verifyConfiguration() {
    if (!this.configured) {
      return {
        success: false,
        message: "SMS service not configured. Please set environment variables.",
      };
    }

    return {
      success: true,
      message: `SMS service configured with ${this.provider}`,
      provider: this.provider,
    };
  }
}

module.exports = new SMSService();


