const nodemailer = require("nodemailer");

/**
 * Email service for Proofsy.
 *
 * Supports three modes:
 *   1. SMTP (Gmail, custom SMTP) — set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 *   2. SendGrid — set SENDGRID_API_KEY
 *   3. Ethereal (dev fallback) — auto-creates a test account, logs preview URLs
 */

let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  // Mode 1: SendGrid
  if (process.env.SENDGRID_API_KEY) {
    transporter = nodemailer.createTransport({
      host: "smtp.sendgrid.net",
      port: 587,
      auth: {
        user: "apikey",
        pass: process.env.SENDGRID_API_KEY,
      },
    });
    console.log("[Email] Using SendGrid transport");
    return transporter;
  }

  // Mode 2: Custom SMTP (Gmail, etc.)
  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log(`[Email] Using SMTP transport: ${process.env.SMTP_HOST}`);
    return transporter;
  }

  // Mode 3: Ethereal (free dev testing — emails are captured, not delivered)
  const testAccount = await nodemailer.createTestAccount();
  transporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
  console.log("[Email] Using Ethereal test transport (emails captured, not delivered)");
  console.log(`[Email] Ethereal user: ${testAccount.user}`);
  return transporter;
}

/**
 * Send a certificate delivery email to a recipient.
 */
async function sendCertificateEmail({ recipientName, recipientEmail, eventName, eventDate, verificationCode, pdfUrl, verifyUrl }) {
  const transport = await getTransporter();
  const fromAddress = process.env.EMAIL_FROM || "noreply@proofsy.io";

  const dateStr = eventDate
    ? new Date(eventDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "N/A";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#4F46E5,#6366F1);padding:32px 24px;text-align:center;">
      <div style="width:48px;height:48px;background:rgba(255,255,255,0.2);border-radius:12px;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:24px;color:#fff;">✓</span>
      </div>
      <h1 style="color:#fff;font-size:20px;margin:0;">Your Credential is Ready</h1>
      <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:8px 0 0;">Powered by Proofsy</p>
    </div>

    <!-- Body -->
    <div style="padding:32px 24px;">
      <p style="color:#111;font-size:15px;margin:0 0 16px;">Hi <strong>${recipientName}</strong>,</p>
      <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 24px;">
        Congratulations! Your credential for <strong>${eventName}</strong> has been issued and is ready for download.
      </p>

      <!-- Info cards -->
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:0 0 24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:4px 0;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Event</td>
            <td style="padding:4px 0;color:#111;font-size:14px;font-weight:600;text-align:right;">${eventName}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Date</td>
            <td style="padding:4px 0;color:#111;font-size:14px;text-align:right;">${dateStr}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Code</td>
            <td style="padding:4px 0;color:#4F46E5;font-size:14px;font-weight:700;font-family:monospace;text-align:right;">${verificationCode}</td>
          </tr>
        </table>
      </div>

      <!-- CTA buttons -->
      ${pdfUrl ? `
      <a href="${pdfUrl}" style="display:block;background:#4F46E5;color:#fff;text-align:center;padding:14px 24px;border-radius:12px;text-decoration:none;font-size:14px;font-weight:600;margin:0 0 12px;">
        Download Certificate PDF
      </a>
      ` : ""}

      <a href="${verifyUrl}" style="display:block;background:#fff;color:#4F46E5;text-align:center;padding:14px 24px;border-radius:12px;text-decoration:none;font-size:14px;font-weight:600;border:2px solid #4F46E5;">
        Verify Certificate
      </a>
    </div>

    <!-- Footer -->
    <div style="padding:16px 24px;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="color:#9ca3af;font-size:11px;margin:0;">Sent via Proofsy · Certificate authenticity guaranteed</p>
    </div>
  </div>
</body>
</html>`;

  const info = await transport.sendMail({
    from: `"Proofsy" <${fromAddress}>`,
    to: recipientEmail,
    subject: `Your credential for ${eventName} is ready`,
    text: `Hi ${recipientName},\n\nYour credential for ${eventName} (${dateStr}) is ready.\nCode: ${verificationCode}\n\nDownload: ${pdfUrl || "pending"}\nVerify: ${verifyUrl}\n\n— Proofsy`,
    html,
  });

  // Log Ethereal preview URL for dev
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`[Email] Preview: ${previewUrl}`);
  }

  return { messageId: info.messageId, previewUrl: previewUrl || null };
}

/**
 * Send emails for all generated certificates of a given event.
 */
async function sendEventEmails(eventId) {
  const Certificate = require("../models/Certificate");
  const User = require("../models/User");
  const Event = require("../models/Event");

  const event = await Event.findById(eventId);
  if (!event) return { sent: 0, failed: 0 };

  const certs = await Certificate.find({ eventId, status: "generated" }).populate("userId");

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";

  let sent = 0;
  let failed = 0;

  for (const cert of certs) {
    if (!cert.userId?.email) { failed++; continue; }

    try {
      await sendCertificateEmail({
        recipientName: cert.userId.name,
        recipientEmail: cert.userId.email,
        eventName: event.name,
        eventDate: event.date,
        verificationCode: cert.verificationCode,
        pdfUrl: cert.pdfUrl ? `${backendUrl}${cert.pdfUrl}` : null,
        verifyUrl: `${frontendUrl}/verify?code=${encodeURIComponent(cert.verificationCode)}`,
      });
      sent++;
      console.log(`[Email] Sent to ${cert.userId.email}`);
    } catch (err) {
      failed++;
      console.error(`[Email] Failed to send to ${cert.userId.email}:`, err.message);
    }
  }

  console.log(`[Email] Event ${event.name}: sent=${sent}, failed=${failed}`);
  return { sent, failed };
}

module.exports = { sendCertificateEmail, sendEventEmails, getTransporter };
