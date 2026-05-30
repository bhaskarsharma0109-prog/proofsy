const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const QRCode = require("qrcode");
const Certificate = require("../models/Certificate");
const User = require("../models/User");
const Event = require("../models/Event");

const TEMPLATES_DIR = path.join(__dirname, "../templates");
const PDF_DIR = path.join(__dirname, "../../storage/pdfs");
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || "http://localhost:3000";

// Valid template IDs
const VALID_TEMPLATES = ["classic", "modern", "elegant", "corporate", "academic", "creative"];
const TEMPLATE_ASSETS_DIR = path.join(TEMPLATES_DIR, "assets");

if (!fs.existsSync(PDF_DIR)) {
  fs.mkdirSync(PDF_DIR, { recursive: true });
}

/**
 * Load and inject data into the selected template.
 */
async function buildHTML(templateId, data) {
  const id = VALID_TEMPLATES.includes(templateId) ? templateId : "modern";
  const templatePath = path.join(TEMPLATES_DIR, `${id}.html`);

  // Fallback to modern if template file doesn't exist
  let html;
  if (fs.existsSync(templatePath)) {
    html = fs.readFileSync(templatePath, "utf-8");
  } else {
    html = fs.readFileSync(path.join(TEMPLATES_DIR, "modern.html"), "utf-8");
  }

  const dateStr = new Date(data.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const durationStr = data.duration ? `Duration: ${data.duration}` : "";
  const verificationUrl = `${FRONTEND_BASE_URL}/verify?code=${encodeURIComponent(data.verificationCode)}`;
  const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 180,
    color: {
      dark: "#0F172A",
      light: "#FFFFFF",
    },
  });

  const assetDataUrl = (fileName, mimeType) => {
    const assetPath = path.join(TEMPLATE_ASSETS_DIR, fileName);
    if (!fs.existsSync(assetPath)) return "";
    return `data:${mimeType};base64,${fs.readFileSync(assetPath).toString("base64")}`;
  };

  return html
    .replace(/\{\{name\}\}/g, data.name)
    .replace(/\{\{event\}\}/g, data.eventName)
    .replace(/\{\{date\}\}/g, dateStr)
    .replace(/\{\{organizer\}\}/g, data.organizer)
    .replace(/\{\{verificationCode\}\}/g, data.verificationCode)
    .replace(/\{\{duration\}\}/g, durationStr)
    .replace(/\{\{verificationUrl\}\}/g, verificationUrl)
    .replace(/\{\{qrCodeDataUrl\}\}/g, qrCodeDataUrl)
    .replace(/\{\{snistLogoDataUrl\}\}/g, assetDataUrl("snist-logo.jpg", "image/jpeg"))
    .replace(/\{\{snistLogoStripDataUrl\}\}/g, assetDataUrl("snist-logo-strip.jpg", "image/jpeg"));
}

/**
 * Renders a single certificate to PDF using a reused Puppeteer page.
 */
async function renderCertificatePDF(page, certificate, user, event) {
  const html = await buildHTML(event.templateId || "modern", {
    name: user.name,
    eventName: event.name,
    date: event.date,
    organizer: event.organizerName,
    verificationCode: certificate.verificationCode,
    duration: event.duration,
  });

  await page.setContent(html, { waitUntil: "domcontentloaded" });
  await page.evaluateHandle('document.fonts.ready');
  
  const pdfFileName = `${certificate.verificationCode}.pdf`;
  const pdfPath = path.join(PDF_DIR, pdfFileName);

  await page.pdf({
    path: pdfPath,
    width: "1056px",
    height: "746px",
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });

  return `/storage/pdfs/${pdfFileName}`;
}

/**
 * Process all pending certificates for a given event.
 */
async function queueCertificateGeneration(eventId) {
  console.log(`[Worker] Starting certificate generation for event: ${eventId}`);

  const event = await Event.findById(eventId);
  if (!event) {
    console.error(`[Worker] Event ${eventId} not found.`);
    return { success: 0, failed: 0 };
  }

  const pendingCerts = await Certificate.find({ eventId, status: "pending" }).populate("userId");
  console.log(`[Worker] Found ${pendingCerts.length} pending certificates`);

  if (pendingCerts.length === 0) return { success: 0, failed: 0 };

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath(),
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  
  let success = 0;
  let failed = 0;
  
  try {
    const page = await browser.newPage();
    
    // We update statuses in batches to avoid locking the DB
    let bulkUpdates = [];
    
    for (const cert of pendingCerts) {
      try {
        const user = cert.userId;
        if (!user) {
          throw new Error("User missing");
        }

        const pdfUrl = await renderCertificatePDF(page, cert, user, event);
        
        bulkUpdates.push({
          updateOne: {
            filter: { _id: cert._id },
            update: { $set: { pdfUrl, status: "generated" } }
          }
        });

        success++;
        if (success % 100 === 0) {
          console.log(`[Worker] Generated ${success} certificates...`);
        }
      } catch (err) {
        console.error(`[Worker] Failed: ${cert.verificationCode}`, err.message);
        bulkUpdates.push({
          updateOne: {
            filter: { _id: cert._id },
            update: { $set: { status: "failed" } }
          }
        });
        failed++;
      }

      // Execute bulk updates every 500 records
      if (bulkUpdates.length >= 500) {
        await Certificate.bulkWrite(bulkUpdates);
        bulkUpdates = [];
      }
    }
    
    // Final flush
    if (bulkUpdates.length > 0) {
      await Certificate.bulkWrite(bulkUpdates);
    }
    
  } finally {
    await browser.close();
  }

  console.log(`[Worker] Done. Success: ${success}, Failed: ${failed}`);
  return { success, failed };
}

module.exports = { renderCertificatePDF, queueCertificateGeneration };
