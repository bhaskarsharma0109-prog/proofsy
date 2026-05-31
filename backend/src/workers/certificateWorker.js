const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");
const { PDFDocument, rgb } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");
const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");
const Certificate = require("../models/Certificate");
const User = require("../models/User");
const Event = require("../models/Event");
const Template = require("../models/Template");
const Organization = require("../models/Organization");
const Workspace = require("../models/Workspace");
const { getFontBuffer } = require("../services/fontService");
const { signCertificateData } = require("../services/signatureService");
const storageService = require("../services/storageService");

// Draw rounded rectangle helper for custom Finder patterns
function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// Generate premium circular branded styled QR Code
async function generatePremiumQRCode(text, size, themeColor = "#2563eb") {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'H' });
  const count = qr.modules.size;
  
  const scale = 4; // High-res scaling for sharp PDF rendering
  const canvasSize = size * scale;
  const canvas = createCanvas(canvasSize, canvasSize);
  const ctx = canvas.getContext('2d');
  
  // Background circle
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.arc(canvasSize / 2, canvasSize / 2, canvasSize / 2, 0, Math.PI * 2);
  ctx.fill();
  
  // Outer elegant colored circle border
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 3 * scale;
  ctx.beginPath();
  ctx.arc(canvasSize / 2, canvasSize / 2, (canvasSize / 2) - (4 * scale), 0, Math.PI * 2);
  ctx.stroke();

  // Dynamic aesthetic dashed ring
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 1.5 * scale;
  ctx.setLineDash([4 * scale, 6 * scale]);
  ctx.beginPath();
  ctx.arc(canvasSize / 2, canvasSize / 2, (canvasSize / 2) - (8 * scale), 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]); // Reset dash

  // Calculate cell size leaving margin for border
  const qrMargin = 14 * scale;
  const qrSize = canvasSize - (qrMargin * 2);
  const cellSize = qrSize / count;

  // Finder pattern regions boundaries
  const isFinderPattern = (r, c) => {
    if (r >= 0 && r <= 6 && c >= 0 && c <= 6) return true;
    if (r >= 0 && r <= 6 && c >= count - 7 && c <= count - 1) return true;
    if (r >= count - 7 && r <= count - 1 && c >= 0 && c <= 6) return true;
    return false;
  };

  // Center logo region boundary (middle 30% of matrix)
  const centerStart = Math.floor(count * 0.35);
  const centerEnd = Math.ceil(count * 0.65);
  const isInCenterLogo = (r, c) => {
    return r >= centerStart && r <= centerEnd && c >= centerStart && c <= centerEnd;
  };

  // Draw regular modules as premium rounded dots
  ctx.fillStyle = themeColor;
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.modules.get(r, c)) {
        if (isFinderPattern(r, c)) continue;
        if (isInCenterLogo(r, c)) continue;

        const posX = qrMargin + c * cellSize + cellSize / 2;
        const posY = qrMargin + r * cellSize + cellSize / 2;
        const radius = (cellSize / 2) * 0.85;

        ctx.beginPath();
        ctx.arc(posX, posY, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Draw modern rounded-corner finder patterns
  const drawCustomFinder = (startX, startY) => {
    ctx.fillStyle = themeColor;
    const outerX = qrMargin + startX * cellSize;
    const outerY = qrMargin + startY * cellSize;
    const outerW = 7 * cellSize;
    const radius = 1.5 * cellSize;

    drawRoundedRect(ctx, outerX, outerY, outerW, outerW, radius);
    ctx.fill();

    ctx.fillStyle = "#FFFFFF";
    const midX = outerX + cellSize;
    const midY = outerY + cellSize;
    const midW = 5 * cellSize;
    const midRadius = 1.0 * cellSize;

    drawRoundedRect(ctx, midX, midY, midW, midW, midRadius);
    ctx.fill();

    ctx.fillStyle = themeColor;
    const innerX = outerX + 2 * cellSize;
    const innerY = outerY + 2 * cellSize;
    const innerW = 3 * cellSize;
    const innerRadius = 0.5 * cellSize;

    drawRoundedRect(ctx, innerX, innerY, innerW, innerW, innerRadius);
    ctx.fill();
  };

  drawCustomFinder(0, 0);
  drawCustomFinder(count - 7, 0);
  drawCustomFinder(0, count - 7);

  // Center circular brand badge
  const centerSize = (centerEnd - centerStart + 1) * cellSize;
  const logoCenterX = qrMargin + (centerStart + (centerEnd - centerStart) / 2) * cellSize + cellSize / 2;
  const logoCenterY = qrMargin + (centerStart + (centerEnd - centerStart) / 2) * cellSize + cellSize / 2;
  const logoRadius = (centerSize / 2) * 1.15;

  // Solid background circle for logo
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.arc(logoCenterX, logoCenterY, logoRadius, 0, Math.PI * 2);
  ctx.fill();

  // Solid theme circle
  ctx.fillStyle = themeColor;
  ctx.beginPath();
  ctx.arc(logoCenterX, logoCenterY, logoRadius * 0.82, 0, Math.PI * 2);
  ctx.fill();

  // White "P" badge
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold ${logoRadius * 1.1}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("P", logoCenterX, logoCenterY);

  return canvas.toBuffer('image/png');
}

const PDF_DIR = path.join(__dirname, "../../storage/pdfs");
const PNG_DIR = path.join(__dirname, "../../storage/pngs");
const SVG_DIR = path.join(__dirname, "../../storage/svgs");
const TEMPLATES_DIR = path.join(__dirname, "../../storage/templates");
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || "http://localhost:3000";

if (!fs.existsSync(PDF_DIR)) {
  fs.mkdirSync(PDF_DIR, { recursive: true });
}
if (!fs.existsSync(PNG_DIR)) {
  fs.mkdirSync(PNG_DIR, { recursive: true });
}
if (!fs.existsSync(SVG_DIR)) {
  fs.mkdirSync(SVG_DIR, { recursive: true });
}

// Generate premium high-res PNG utilizing canvas
async function generatePremiumPNG(template, user, event, certificate, themeColor) {
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

  const scale = 2; // 2x high-res rendering
  const canvasW = template.width * scale;
  const canvasH = template.height * scale;

  const canvas = createCanvas(canvasW, canvasH);
  const ctx = canvas.getContext('2d');

  // Dynamic Google Font download and canvas registration mapping
  const registeredFonts = new Set();
  for (const layer of template.textLayers) {
    const fontKey = `${layer.fontFamily}-${layer.fontWeight}`;
    if (!registeredFonts.has(fontKey)) {
      try {
        const fontBuffer = await getFontBuffer(layer.fontFamily, layer.fontWeight);
        GlobalFonts.register(fontBuffer, layer.fontFamily);
        registeredFonts.add(fontKey);
        console.log(`[Worker] Dynamic Font Registered for Canvas: ${fontKey}`);
      } catch (fontErr) {
        console.error(`[Worker] Failed to dynamically register font ${layer.fontFamily} on Canvas:`, fontErr.message);
      }
    }
  }

  let bgPath = "";
  if (template.backgroundUrl.startsWith("/storage/templates/")) {
    bgPath = path.join(__dirname, "../../", template.backgroundUrl);
  } else {
    bgPath = path.join(TEMPLATES_DIR, path.basename(template.backgroundUrl));
  }

  if (fs.existsSync(bgPath)) {
    const bgImage = await loadImage(bgPath);
    ctx.drawImage(bgImage, 0, 0, canvasW, canvasH);
  } else {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  for (const layer of template.textLayers) {
    const text = layer.variable === "custom" ? layer.customText : variables[layer.variable];
    if (!text) continue;

    const scaledFontSize = layer.fontSize * scale;
    const fontStyle = layer.fontWeight === "bold" ? "bold" : "normal";
    
    ctx.font = `${fontStyle} ${scaledFontSize}px "${layer.fontFamily}", Arial, sans-serif`;
    ctx.fillStyle = layer.color;
    ctx.textAlign = layer.textAlign;
    ctx.textBaseline = "middle";

    const posX = layer.x * scale;
    const posY = layer.y * scale;

    ctx.fillText(text, posX, posY);
  }

  if (template.qrCode && template.qrCode.enabled) {
    const workspace = await Workspace.findById(certificate.workspaceId);
    const workspaceSlug = workspace ? workspace.slug : "verify";
    const verificationUrl = `${FRONTEND_BASE_URL}/verify/${workspaceSlug}/${certificate.verificationCode}?ref=qr`;

    const qrBuffer = await generatePremiumQRCode(verificationUrl, template.qrCode.size, themeColor);
    const qrImage = await loadImage(qrBuffer);

    const qrSize = template.qrCode.size * scale;
    const qrX = (template.qrCode.x * scale) - (qrSize / 2);
    const qrY = (template.qrCode.y * scale) - (qrSize / 2);

    ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
  }

  if (template.qrCode && template.qrCode.enabled) {
    const signature = certificate.cryptographicSignature || "";
    if (signature) {
      const fingerprintText = `SECURE DIGITAL SIGNATURE: 0X${signature.substring(0, 16).toUpperCase()}`;
      const fingerSize = 5.5 * scale;
      
      ctx.font = `normal ${fingerSize}px "Fira Code", Courier, monospace`;
      ctx.fillStyle = "#6B7280";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      
      const fingerX = template.qrCode.x * scale;
      const fingerY = (template.qrCode.y * scale) + (template.qrCode.size * scale / 2) + (5 * scale);
      
      ctx.fillText(fingerprintText, fingerX, fingerY);
    }
  }

  const pngBytes = canvas.toBuffer('image/png');
  const pngKey = `pngs/${certificate.verificationCode}.png`;
  const pngUrl = await storageService.uploadFile(pngBytes, pngKey, "image/png");

  return pngUrl;
}

// Generate premium scalable vector SVG
async function generatePremiumSVG(template, user, event, certificate, themeColor) {
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

  const width = template.width;
  const height = template.height;

  let qrCodeElement = "";
  if (template.qrCode && template.qrCode.enabled) {
    const workspace = await Workspace.findById(certificate.workspaceId);
    const workspaceSlug = workspace ? workspace.slug : "verify";
    const verificationUrl = `${FRONTEND_BASE_URL}/verify/${workspaceSlug}/${certificate.verificationCode}?ref=qr`;

    const qrBuffer = await generatePremiumQRCode(verificationUrl, template.qrCode.size, themeColor);
    const qrBase64 = qrBuffer.toString("base64");
    
    const qrSize = template.qrCode.size;
    const qrX = template.qrCode.x - (qrSize / 2);
    const qrY = template.qrCode.y - (qrSize / 2);

    qrCodeElement = `<image href="data:image/png;base64,${qrBase64}" x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}" />`;
  }

  let signatureElement = "";
  const signature = certificate.cryptographicSignature || "";
  if (template.qrCode && template.qrCode.enabled && signature) {
    const fingerprintText = `SECURE DIGITAL SIGNATURE: 0X${signature.substring(0, 16).toUpperCase()}`;
    const fingerX = template.qrCode.x;
    const fingerY = template.qrCode.y + (template.qrCode.size / 2) + 12;
    signatureElement = `<text x="${fingerX}" y="${fingerY}" font-family="'Fira Code', Courier, monospace" font-size="5.5" fill="#6B7280" text-anchor="middle">${fingerprintText}</text>`;
  }

  let textLayersElements = "";
  for (const layer of template.textLayers) {
    const text = layer.variable === "custom" ? layer.customText : variables[layer.variable];
    if (!text) continue;

    const fontStyle = layer.fontWeight === "bold" ? "font-weight='bold'" : "";
    const textAnchor = layer.textAlign === "center" ? "middle" : layer.textAlign === "right" ? "end" : "start";

    textLayersElements += `  <text x="${layer.x}" y="${layer.y}" font-family="'${layer.fontFamily}', Arial, sans-serif" font-size="${layer.fontSize}" ${fontStyle} fill="${layer.color}" text-anchor="${textAnchor}" dominant-baseline="middle">${text}</text>\n`;
  }

  const bgUrl = template.backgroundUrl;
  
  const svgContent = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&amp;family=Fira+Code&amp;display=swap');
    </style>
  </defs>

  <image href="${FRONTEND_BASE_URL}${bgUrl}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none" />

${textLayersElements}
  ${qrCodeElement}

  ${signatureElement}
</svg>`;

  const svgKey = `svgs/${certificate.verificationCode}.svg`;
  const svgUrl = await storageService.uploadFile(Buffer.from(svgContent, "utf-8"), svgKey, "image/svg+xml");

  return svgUrl;
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

  // Dynamically derive template accent color early
  let themeColor = "#2563eb";
  if (template.textLayers && template.textLayers.length > 0) {
    const accentLayer = template.textLayers.find(l => l.variable === "recipient_name") || template.textLayers[0];
    if (accentLayer && accentLayer.color) {
      themeColor = accentLayer.color;
    }
  }

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
    const isPng = bgBytes.length > 4 && 
                  bgBytes[0] === 0x89 && 
                  bgBytes[1] === 0x50 && 
                  bgBytes[2] === 0x4E && 
                  bgBytes[3] === 0x47;
    const image = isPng 
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
    const workspace = await Workspace.findById(certificate.workspaceId);
    const workspaceSlug = workspace ? workspace.slug : "verify";
    const verificationUrl = `${FRONTEND_BASE_URL}/verify/${workspaceSlug}/${certificate.verificationCode}?ref=qr`;

    // Generate stunning branded premium circular QR Code
    const qrBuffer = await generatePremiumQRCode(verificationUrl, template.qrCode.size, themeColor);
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

  // 4. Cryptographic Asymmetric Signing & Metadata Embedding
  const deterministicPayload = {
    verificationCode: certificate.verificationCode,
    recipientName: user.name,
    recipientEmail: user.email,
    eventName: event.name,
    issuedAt: certificate.createdAt ? certificate.createdAt.toISOString() : new Date().toISOString()
  };
  const signature = signCertificateData(deterministicPayload);

  // Set signature on the certificate object so PNG/SVG helpers can access it
  certificate.cryptographicSignature = signature;

  // Embed metadata and signature inside PDF properties
  doc.setSubject(JSON.stringify(deterministicPayload));
  doc.setKeywords([signature]);

  // Draw precise visual signature fingerprint under the QR code if enabled
  if (template.qrCode && template.qrCode.enabled) {
    try {
      const firaBuffer = await getFontBuffer("Fira Code", "normal");
      const firaFont = await doc.embedFont(firaBuffer);
      const fingerprintText = `SECURE DIGITAL SIGNATURE: 0X${signature.substring(0, 16).toUpperCase()}`;
      const fingerSize = 5;
      const fingerWidth = firaFont.widthOfTextAtSize(fingerprintText, fingerSize);
      
      const qrY = template.height - template.qrCode.y;
      const fingerY = qrY - (template.qrCode.size / 2) - 10;
      
      page.drawText(fingerprintText, {
        x: template.qrCode.x - (fingerWidth / 2),
        y: fingerY,
        size: fingerSize,
        font: firaFont,
        color: hexToRgb("#6B7280"), // Subtle gray-500
      });
    } catch (fontErr) {
      console.warn("[Worker] Failed to embed Fira Code visual fingerprint:", fontErr.message);
    }
  }

  const pdfBytes = await doc.save();
  const pdfKey = `pdfs/${certificate.verificationCode}.pdf`;
  const pdfUrl = await storageService.uploadFile(Buffer.from(pdfBytes), pdfKey, "application/pdf");

  // Generate premium high-res PNG and vector SVG
  let pngUrl = null;
  let svgUrl = null;
  try {
    pngUrl = await generatePremiumPNG(template, user, event, certificate, themeColor);
  } catch (pngErr) {
    console.error(`[Worker] Failed to generate PNG for ${certificate.verificationCode}:`, pngErr);
  }

  try {
    svgUrl = await generatePremiumSVG(template, user, event, certificate, themeColor);
  } catch (svgErr) {
    console.error(`[Worker] Failed to generate SVG for ${certificate.verificationCode}:`, svgErr);
  }

  return { 
    pdfUrl, 
    signature,
    pngUrl,
    svgUrl
  };
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

  const org = await Organization.findById(event.organizationId);
  const zapierConfig = org?.integrations?.zapier;
  const slackConfig = org?.integrations?.slack;

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

  const pendingCount = await Certificate.countDocuments({
    eventId,
    $or: [
      { status: "pending" },
      { status: "failed", attemptsCount: { $lt: 3 } }
    ]
  });
  console.log(`[Worker] Found ${pendingCount} certificates to process`);

  if (pendingCount === 0) return { success: 0, failed: 0 };

  let success = 0;
  let failed = 0;
  let bulkUpdates = [];

  // Stream pending certificates with a cursor instead of loading them all into
  // memory. PDFs are generated one at a time so a single slow op doesn't pin
  // the entire batch in memory, and updates are flushed in batches of 200.
  const cursor = Certificate.find({
    eventId,
    $or: [
      { status: "pending" },
      { status: "failed", attemptsCount: { $lt: 3 } }
    ]
  })
    .populate("userId")
    .cursor();

  for (let cert = await cursor.next(); cert != null; cert = await cursor.next()) {
    try {
      const user = cert.userId;
      if (!user) throw new Error("User missing");

      // Generate the PDF and return signed signature
      const { pdfUrl, signature, pngUrl, svgUrl } = await generatePDFWithPdfLib(template, user, event, cert);

      bulkUpdates.push({
        updateOne: {
          filter: { _id: cert._id },
          update: { 
            $set: { 
              pdfUrl, 
              status: "generated",
              cryptographicSignature: signature,
              pngUrl,
              svgUrl
            } 
          }
        }
      });

      // Zapier Webhook Trigger
      if (zapierConfig && zapierConfig.connected && zapierConfig.webhookUrl) {
        try {
          // Native Node.js fetch (available in Node 18+)
          await fetch(zapierConfig.webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              eventName: event.name,
              recipientName: user.name,
              recipientEmail: user.email,
              verificationCode: cert.verificationCode,
              pdfUrl: `${FRONTEND_BASE_URL}${pdfUrl}`,
              issuedAt: new Date().toISOString()
            })
          });
        } catch (webhookErr) {
          console.error(`[Worker] Failed to trigger Zapier webhook for ${cert.verificationCode}`, webhookErr.message);
        }
      }

      // Slack Webhook Trigger
      if (slackConfig && slackConfig.connected && slackConfig.webhookUrl) {
        try {
          const workspace = await Workspace.findById(cert.workspaceId);
          const workspaceSlug = workspace ? workspace.slug : "verify";
          const verificationUrl = `${FRONTEND_BASE_URL}/verify/${workspaceSlug}/${cert.verificationCode}`;
          const payload = {
            text: `🎓 *New Certificate Generated for ${user.name}*`,
            blocks: [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `🎓 *New Certificate Generated!*`
                }
              },
              {
                type: "section",
                fields: [
                  {
                    type: "mrkdwn",
                    text: `*Event:*\n${event.name}`
                  },
                  {
                    type: "mrkdwn",
                    text: `*Recipient:*\n${user.name} (${user.email})`
                  },
                  {
                    type: "mrkdwn",
                    text: `*Verification Code:*\n\`${cert.verificationCode}\``
                  },
                  {
                    type: "mrkdwn",
                    text: `*Issued At:*\n${new Date().toLocaleString()}`
                  }
                ]
              },
              {
                type: "actions",
                elements: [
                  {
                    type: "button",
                    text: {
                      type: "plain_text",
                      text: "Verify Certificate",
                      emoji: true
                    },
                    url: verificationUrl,
                    action_id: "verify_cert_click"
                  }
                ]
              }
            ]
          };

          await fetch(slackConfig.webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
        } catch (webhookErr) {
          console.error(`[Worker] Failed to trigger Slack webhook for ${cert.verificationCode}`, webhookErr.message);
        }
      }

      success++;
      if (success % 50 === 0) {
        console.log(`[Worker] Generated ${success} certificates...`);
      }
    } catch (err) {
      console.error(`[Worker] Failed: ${cert.verificationCode}`, err);
      const currentAttempts = (cert.attemptsCount || 0) + 1;
      bulkUpdates.push({
        updateOne: {
          filter: { _id: cert._id },
          update: { 
            $set: { 
              status: "failed", 
              attemptsCount: currentAttempts,
              errorLog: err.stack || err.message || String(err)
            } 
          }
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

module.exports = { 
  queueCertificateGeneration,
  generatePremiumPNG,
  generatePremiumSVG
};
