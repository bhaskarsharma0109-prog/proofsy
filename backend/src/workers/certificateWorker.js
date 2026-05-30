const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");
const { PDFDocument, rgb } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");
const Certificate = require("../models/Certificate");
const User = require("../models/User");
const Event = require("../models/Event");
const Template = require("../models/Template");
const { getFontBuffer } = require("../services/fontService");

const PDF_DIR = path.join(__dirname, "../../storage/pdfs");
const TEMPLATES_DIR = path.join(__dirname, "../../storage/templates");
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || "http://localhost:3000";

if (!fs.existsSync(PDF_DIR)) {
  fs.mkdirSync(PDF_DIR, { recursive: true });
}

// Convert hex to rgb object for pdf-lib (0-1 range)
function hexToRgb(hex) {
  // Remove # if present
  hex = hex.replace(/^#/, "");
  if (hex.length === 3) {
    hex = hex.split("").map((c) => c + c).join("");
  }
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  return rgb(r, g, b);
}

/**
 * Generate a PDF using pdf-lib and custom template variables
 */
async function generatePDFWithPdfLib(template, user, event, certificate) {
  const dateStr = new Date(event.date).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const variables = {
    recipient_name: user.name,
    event_name: event.name,
    date: dateStr,
    organizer: event.organizerName || "",
    verification_code: certificate.verificationCode,
    duration: event.duration || "",
  };

  // 1. Load Background
  // Determine absolute path to the background file.
  let bgPath = "";
  if (template.backgroundUrl.startsWith("/storage/templates/")) {
    bgPath = path.join(__dirname, "../../", template.backgroundUrl);
  } else {
    // Fallback if the path is somehow weird
    bgPath = path.join(TEMPLATES_DIR, path.basename(template.backgroundUrl));
  }
  
  if (!fs.existsSync(bgPath)) {
    throw new Error(`Background file not found at ${bgPath}`);
  }
  
  const bgBytes = fs.readFileSync(bgPath);
  
  let doc;
  if (template.backgroundType === "pdf") {
    doc = await PDFDocument.load(bgBytes);
  } else {
    doc = await PDFDocument.create();
    const image = bgPath.toLowerCase().endsWith(".png") 
      ? await doc.embedPng(bgBytes) 
      : await doc.embedJpg(bgBytes);
    const page = doc.addPage([template.width, template.height]);
    page.drawImage(image, { x: 0, y: 0, width: template.width, height: template.height });
  }
  
  // Register fontkit
  doc.registerFontkit(fontkit);

  // We only draw on the first page
  const page = doc.getPages()[0];

  // 2. Add Text Layers
  // Cache embedded fonts so we don't load the same TTF multiple times
  const embeddedFonts = {};

  for (const layer of template.textLayers) {
    const text = layer.variable === "custom" ? layer.customText : variables[layer.variable];
    if (!text) continue;

    // Load and embed font
    const fontKey = `${layer.fontFamily}-${layer.fontWeight}`;
    if (!embeddedFonts[fontKey]) {
      const fontBuffer = await getFontBuffer(layer.fontFamily, layer.fontWeight);
      embeddedFonts[fontKey] = await doc.embedFont(fontBuffer);
    }
    const pdfFont = embeddedFonts[fontKey];

    // Measure text width for alignment
    const textWidth = pdfFont.widthOfTextAtSize(text, layer.fontSize);
    
    let drawX = layer.x;
    if (layer.textAlign === "center") {
      drawX = layer.x - (textWidth / 2);
    } else if (layer.textAlign === "right") {
      drawX = layer.x - textWidth;
    }

    // PDF coordinates originate from BOTTOM-LEFT, whereas frontend canvas originates from TOP-LEFT.
    // We need to invert Y axis!
    const drawY = template.height - layer.y;
    // We must adjust drawY slightly down by the font size, as y is baseline in pdf-lib, but center in canvas
    // Wait, in canvas our label was centered at `transform: translate(-50%, -50%)`.
    // So the baseline is approximately `drawY - (layer.fontSize / 3)`.
    const adjustedY = drawY - (layer.fontSize / 3);

    page.drawText(text, {
      x: drawX,
      y: adjustedY,
      size: layer.fontSize,
      font: pdfFont,
      color: hexToRgb(layer.color),
    });
  }

  // 3. Add QR Code
  if (template.qrCode && template.qrCode.enabled) {
    const verificationUrl = `${FRONTEND_BASE_URL}/verify?code=${encodeURIComponent(certificate.verificationCode)}`;
    const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: "M",
      margin: 0,
      width: template.qrCode.size,
      color: { dark: "#000000", light: "#FFFFFF" }
    });
    
    // Extract base64 without prefix
    const qrBase64 = qrDataUrl.split(',')[1];
    const qrBuffer = Buffer.from(qrBase64, 'base64');
    const qrImage = await doc.embedPng(qrBuffer);
    
    // Invert Y and adjust for center alignment
    const qrY = template.height - template.qrCode.y;
    const drawX = template.qrCode.x - (template.qrCode.size / 2);
    const drawY = qrY - (template.qrCode.size / 2);

    page.drawImage(qrImage, {
      x: drawX,
      y: drawY,
      width: template.qrCode.size,
      height: template.qrCode.size,
    });
  }

  const pdfBytes = await doc.save();
  const pdfFileName = `${certificate.verificationCode}.pdf`;
  const pdfFilePath = path.join(PDF_DIR, pdfFileName);
  
  fs.writeFileSync(pdfFilePath, pdfBytes);
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

  let template;
  // Fallback logic for legacy string templateIds
  if (typeof event.templateId === "string" && !event.templateId.match(/^[0-9a-fA-F]{24}$/)) {
    // If it's a legacy string (e.g. "modern"), fetch a starter template of that name
    template = await Template.findOne({ name: { $regex: new RegExp(event.templateId, "i") }, isStarter: true });
    if (!template) {
       // If no starter, just grab the first one
       template = await Template.findOne();
    }
  } else {
    template = await Template.findById(event.templateId);
  }

  if (!template) {
    console.error(`[Worker] Template ${event.templateId} not found.`);
    return { success: 0, failed: 0 };
  }

  const pendingCerts = await Certificate.find({ eventId, status: "pending" }).populate("userId");
  console.log(`[Worker] Found ${pendingCerts.length} pending certificates`);

  if (pendingCerts.length === 0) return { success: 0, failed: 0 };
  
  let success = 0;
  let failed = 0;
  let bulkUpdates = [];
    
  for (const cert of pendingCerts) {
    try {
      const user = cert.userId;
      if (!user) throw new Error("User missing");

      // Generate the PDF
      const pdfUrl = await generatePDFWithPdfLib(template, user, event, cert);
      
      bulkUpdates.push({
        updateOne: {
          filter: { _id: cert._id },
          update: { $set: { pdfUrl, status: "generated" } }
        }
      });

      success++;
      if (success % 50 === 0) {
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

    if (bulkUpdates.length >= 200) {
      await Certificate.bulkWrite(bulkUpdates);
      bulkUpdates = [];
    }
  }
  
  if (bulkUpdates.length > 0) {
    await Certificate.bulkWrite(bulkUpdates);
  }
    
  console.log(`[Worker] Done. Success: ${success}, Failed: ${failed}`);
  return { success, failed };
}

module.exports = { queueCertificateGeneration };
