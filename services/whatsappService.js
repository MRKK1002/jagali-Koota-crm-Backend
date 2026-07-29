// WhatsApp Service using Twilio, WhatsApp Business API, or other providers
// This is a template - configure with your preferred WhatsApp provider

class WhatsAppService {
  constructor() {
    this.provider = process.env.WHATSAPP_PROVIDER || "twilio";
    this.configured = this.checkConfiguration();

    if (this.provider === "twilio" && this.configured) {
      const twilio = require("twilio");
      this.client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      this.fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886"; // Twilio sandbox
    }
  }

  checkConfiguration() {
    if (this.provider === "twilio") {
      return !!(
        process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN
      );
    }
    return false;
  }

  /**
   * Send a single WhatsApp message
   */
  async sendMessage({ to, message, mediaUrl }) {
    try {
      if (!this.configured) {
        console.log("💬 WhatsApp not configured. Skipping WhatsApp send.");
        console.log(`   Would send to ${to}: ${message}`);
        return {
          success: false,
          error: "WhatsApp service not configured",
          simulation: true,
        };
      }

      // Format phone number for WhatsApp
      let phoneNumber = to.replace(/\D/g, ""); // Remove non-digits
      if (!phoneNumber.startsWith("91")) {
        phoneNumber = `91${phoneNumber}`;
      }
      const whatsappNumber = `whatsapp:+${phoneNumber}`;

      const messageOptions = {
        body: message,
        from: this.fromNumber,
        to: whatsappNumber,
      };

      if (mediaUrl) {
        messageOptions.mediaUrl = [mediaUrl];
      }

      if (this.provider === "twilio") {
        const result = await this.client.messages.create(messageOptions);

        console.log("✅ WhatsApp message sent successfully:", result.sid);

        return {
          success: true,
          messageId: result.sid,
          status: result.status,
        };
      }

      return {
        success: false,
        error: "WhatsApp provider not implemented",
      };
    } catch (error) {
      console.error("❌ WhatsApp send error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send bulk WhatsApp messages
   */
  async sendBulkMessages(messages) {
    const results = [];

    for (const msg of messages) {
      const result = await this.sendMessage(msg);
      results.push({
        to: msg.to,
        ...result,
      });
    }

    return results;
  }

  /**
   * Send notification via WhatsApp
   */
  async sendNotificationWhatsApp(notification) {
    try {
      const { channels } = notification;

      if (!channels.whatsapp.enabled || !channels.whatsapp.phoneNumbers) {
        return {
          success: false,
          error: "WhatsApp not enabled or no phone numbers",
        };
      }

      const results = [];
      for (const phoneNumber of channels.whatsapp.phoneNumbers) {
        const result = await this.sendMessage({
          to: phoneNumber,
          message: channels.whatsapp.message || notification.message,
        });
        results.push(result);
      }

      const allSuccess = results.every((r) => r.success);

      if (allSuccess) {
        await notification.markAsSent("whatsapp");
      } else {
        const errors = results
          .filter((r) => !r.success)
          .map((r) => r.error)
          .join(", ");
        await notification.markAsFailed("whatsapp", errors);
      }

      return {
        success: allSuccess,
        results,
      };
    } catch (error) {
      console.error("❌ Notification WhatsApp error:", error);
      await notification.markAsFailed("whatsapp", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send invoice via WhatsApp
   */
  async sendInvoice({ to, invoiceNumber, customerName, amount, pdfUrl }) {
    const message = `Dear ${customerName},\n\nYour invoice #${invoiceNumber} for ₹${amount} is ready.\n\nThank you for your business!`;
    return await this.sendMessage({ to, message, mediaUrl: pdfUrl });
  }

  /**
   * Send payment reminder via WhatsApp
   */
  async sendPaymentReminder({ to, invoiceNumber, amount, dueDate, daysOverdue }) {
    const message = `Payment Reminder\n\nInvoice: #${invoiceNumber}\nAmount: ₹${amount}\nDue Date: ${new Date(
      dueDate
    ).toLocaleDateString()}\n${
      daysOverdue > 0 ? `Overdue by: ${daysOverdue} days\n` : ""
    }\nPlease make the payment soon.`;
    return await this.sendMessage({ to, message });
  }

  /**
   * Send order confirmation via WhatsApp
   */
  async sendOrderConfirmation({ to, orderNumber, amount, items, estimatedDelivery }) {
    const message = `Order Confirmed! 🎉\n\nOrder #${orderNumber}\nAmount: ₹${amount}\nItems: ${items}\n${
      estimatedDelivery
        ? `Estimated Delivery: ${estimatedDelivery}`
        : ""
    }\n\nThank you for your order!`;
    return await this.sendMessage({ to, message });
  }

  /**
   * Send low stock alert via WhatsApp
   */
  async sendLowStockAlert({ to, itemName, currentStock, reorderLevel, businessType }) {
    const message = `⚠️ LOW STOCK ALERT\n\nBusiness: ${businessType.toUpperCase()}\nItem: ${itemName}\nCurrent Stock: ${currentStock}\nReorder Level: ${reorderLevel}\n\nPlease reorder immediately!`;
    return await this.sendMessage({ to, message });
  }

  /**
   * Send approval notification via WhatsApp
   */
  async sendApprovalNotification({ to, type, reference, requestedBy, amount }) {
    const message = `Approval Required ✅\n\nType: ${type}\nReference: #${reference}\nRequested By: ${requestedBy}\n${
      amount ? `Amount: ₹${amount}\n` : ""
    }\nPlease review and approve.`;
    return await this.sendMessage({ to, message });
  }

  /**
   * Send templated message
   */
  async sendTemplatedMessage({ to, templateName, parameters }) {
    // For WhatsApp Business API with approved templates
    console.log("WhatsApp template messages require WhatsApp Business API");
    return {
      success: false,
      error: "Template messages require WhatsApp Business API",
    };
  }

  /**
   * Verify WhatsApp configuration
   */
  async verifyConfiguration() {
    if (!this.configured) {
      return {
        success: false,
        message: "WhatsApp service not configured. Please set environment variables.",
      };
    }

    return {
      success: true,
      message: `WhatsApp service configured with ${this.provider}`,
      provider: this.provider,
    };
  }
}

module.exports = new WhatsAppService();


