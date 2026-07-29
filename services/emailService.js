const nodemailer = require("nodemailer");

class EmailService {
  constructor() {
    // Initialize transporter with environment variables
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === "true", // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    this.from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  }

  /**
   * Send a single email
   */
  async sendEmail({ to, subject, text, html, cc, bcc, attachments }) {
    try {
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        console.log("📧 Email not configured. Skipping email send.");
        return {
          success: false,
          error: "Email service not configured",
        };
      }

      const mailOptions = {
        from: this.from,
        to: Array.isArray(to) ? to.join(", ") : to,
        subject,
        text: text || "",
        html: html || text || "",
      };

      if (cc && cc.length > 0) {
        mailOptions.cc = Array.isArray(cc) ? cc.join(", ") : cc;
      }

      if (bcc && bcc.length > 0) {
        mailOptions.bcc = Array.isArray(bcc) ? bcc.join(", ") : bcc;
      }

      if (attachments && attachments.length > 0) {
        mailOptions.attachments = attachments;
      }

      const info = await this.transporter.sendMail(mailOptions);

      console.log("✅ Email sent successfully:", info.messageId);

      return {
        success: true,
        messageId: info.messageId,
        response: info.response,
      };
    } catch (error) {
      console.error("❌ Email send error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send bulk emails
   */
  async sendBulkEmails(emails) {
    const results = [];

    for (const email of emails) {
      const result = await this.sendEmail(email);
      results.push({
        to: email.to,
        ...result,
      });
    }

    return results;
  }

  /**
   * Send notification email
   */
  async sendNotificationEmail(notification) {
    try {
      const { channels } = notification;

      if (!channels.email.enabled || !channels.email.emailTo) {
        return {
          success: false,
          error: "Email not enabled or no recipients",
        };
      }

      const result = await this.sendEmail({
        to: channels.email.emailTo,
        cc: channels.email.emailCc,
        bcc: channels.email.emailBcc,
        subject: channels.email.subject || notification.title,
        text: channels.email.body || notification.message,
        html: channels.email.body || notification.message,
        attachments: channels.email.attachments,
      });

      if (result.success) {
        await notification.markAsSent("email");
      } else {
        await notification.markAsFailed("email", result.error);
      }

      return result;
    } catch (error) {
      console.error("❌ Notification email error:", error);
      await notification.markAsFailed("email", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send templated email
   */
  async sendTemplatedEmail(template, data) {
    const { email } = template;

    if (!email.enabled) {
      return {
        success: false,
        error: "Email not enabled in template",
      };
    }

    return await this.sendEmail({
      to: data.to,
      cc: data.cc,
      bcc: data.bcc,
      subject: email.subject,
      text: email.body,
      html: email.htmlBody || email.body,
      attachments: data.attachments,
    });
  }

  /**
   * Verify email configuration
   */
  async verifyConfiguration() {
    try {
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        return {
          success: false,
          message: "Email credentials not configured",
        };
      }

      await this.transporter.verify();
      return {
        success: true,
        message: "Email service configured successfully",
      };
    } catch (error) {
      console.error("❌ Email configuration error:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Send invoice email
   */
  async sendInvoiceEmail({ to, invoiceNumber, customerName, amount, dueDate, pdfPath }) {
    const subject = `Invoice #${invoiceNumber} - ${customerName}`;
    const html = `
      <h2>Invoice #${invoiceNumber}</h2>
      <p>Dear ${customerName},</p>
      <p>Please find attached your invoice for ₹${amount}.</p>
      <p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>
      <p>Thank you for your business!</p>
      <br>
      <p>Best Regards,<br>Your Business Team</p>
    `;

    const attachments = pdfPath ? [{ filename: `invoice-${invoiceNumber}.pdf`, path: pdfPath }] : [];

    return await this.sendEmail({
      to,
      subject,
      html,
      attachments,
    });
  }

  /**
   * Send payment reminder
   */
  async sendPaymentReminder({ to, invoiceNumber, amount, dueDate, daysOverdue }) {
    const subject = `Payment Reminder - Invoice #${invoiceNumber}`;
    const html = `
      <h2>Payment Reminder</h2>
      <p>Dear Customer,</p>
      <p>This is a friendly reminder that payment for Invoice #${invoiceNumber} is ${daysOverdue > 0 ? `overdue by ${daysOverdue} days` : 'due soon'}.</p>
      <p><strong>Amount:</strong> ₹${amount}</p>
      <p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>
      <p>Please make the payment at your earliest convenience.</p>
      <br>
      <p>Best Regards,<br>Accounts Team</p>
    `;

    return await this.sendEmail({
      to,
      subject,
      html,
    });
  }

  /**
   * Send low stock alert
   */
  async sendLowStockAlert({ to, itemName, currentStock, reorderLevel, businessType }) {
    const subject = `⚠️ Low Stock Alert - ${itemName}`;
    const html = `
      <h2>Low Stock Alert</h2>
      <p><strong>Business:</strong> ${businessType.toUpperCase()}</p>
      <p><strong>Item:</strong> ${itemName}</p>
      <p><strong>Current Stock:</strong> ${currentStock}</p>
      <p><strong>Reorder Level:</strong> ${reorderLevel}</p>
      <p>Please reorder this item immediately to avoid stock-out.</p>
      <br>
      <p>Inventory Management System</p>
    `;

    return await this.sendEmail({
      to,
      subject,
      html,
    });
  }

  /**
   * Send approval notification
   */
  async sendApprovalNotification({ to, type, reference, requestedBy, amount, actionUrl }) {
    const subject = `Approval Required - ${type} #${reference}`;
    const html = `
      <h2>Approval Required</h2>
      <p>A new ${type} requires your approval.</p>
      <p><strong>Reference:</strong> ${reference}</p>
      <p><strong>Requested By:</strong> ${requestedBy}</p>
      ${amount ? `<p><strong>Amount:</strong> ₹${amount}</p>` : ''}
      <br>
      ${actionUrl ? `<p><a href="${actionUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Review & Approve</a></p>` : ''}
      <br>
      <p>Best Regards,<br>System</p>
    `;

    return await this.sendEmail({
      to,
      subject,
      html,
    });
  }
}

module.exports = new EmailService();


