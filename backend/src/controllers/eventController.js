const Event = require("../models/Event");
const Certificate = require("../models/Certificate");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const auditService = require("../services/auditService");

// POST /api/events
exports.createEvent = async (req, res) => {
  try {
    const { name, date, organizerName, templateId, duration } = req.body;

    if (!name || !date || !organizerName) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: name, date, organizerName",
      });
    }

    const event = await Event.create({ name, date, organizerName, templateId, duration, organizationId: req.organizationId, workspaceId: req.workspaceId });

    await auditService.logAction(req, "event_created", event._id, "Event", `Created academic event "${event.name}"`);

    return res.status(201).json({
      success: true,
      data: {
        id: event._id,
        name: event.name,
        date: event.date.toISOString(),
        organizerName: event.organizerName,
        createdAt: event.createdAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("createEvent error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// GET /api/events
exports.listEvents = async (req, res) => {
  try {
    const events = await Event.find({ workspaceId: req.workspaceId }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: events.map((e) => ({
        id: e._id,
        name: e.name,
        date: e.date.toISOString(),
        organizerName: e.organizerName,
        createdAt: e.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("listEvents error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// GET /api/events/:id
exports.getEvent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "Invalid event id" });
    }

    const event = await Event.findOne({ _id: id, workspaceId: req.workspaceId });
    if (!event) {
      return res.status(404).json({ success: false, error: "Event not found or unauthorized" });
    }

    const certificates = await Certificate.find({ eventId: event._id })
      .populate("userId")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: {
        id: event._id,
        name: event.name,
        date: event.date.toISOString(),
        organizerName: event.organizerName,
        templateId: event.templateId || null,
        duration: event.duration || null,
        createdAt: event.createdAt.toISOString(),
        certificates: certificates.map((c) => ({
          id: c._id,
          recipientName: c.userId?.name || "Unknown",
          recipientEmail: c.userId?.email || "Unknown",
          verificationCode: c.verificationCode,
          status: c.status,
          pdfUrl: c.pdfUrl,
          expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
          revokedAt: c.revokedAt ? c.revokedAt.toISOString() : null,
          revocationReason: c.revocationReason || "",
          suspendedAt: c.suspendedAt ? c.suspendedAt.toISOString() : null,
          issuedAt: c.createdAt.toISOString(),
        })),
      },
    });
  } catch (err) {
    console.error("getEvent error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// DELETE /api/events/:id
exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid event id",
      });
    }

    const event = await Event.findOne({ _id: id, workspaceId: req.workspaceId });
    if (!event) {
      return res.status(404).json({
        success: false,
        error: "Event not found or unauthorized",
      });
    }

    const certificates = await Certificate.find({ eventId: event._id });

    for (const certificate of certificates) {
      if (certificate.pdfUrl) {
        const relativePdfPath = certificate.pdfUrl.replace(/^\/storage\//, "");
        const absolutePdfPath = path.join(__dirname, "../../storage", relativePdfPath);

        if (fs.existsSync(absolutePdfPath)) {
          fs.unlinkSync(absolutePdfPath);
        }
      }
    }

    await Certificate.deleteMany({ eventId: event._id });
    await Event.findByIdAndDelete(event._id);

    await auditService.logAction(req, "event_deleted", event._id, "Event", `Deleted event "${event.name}" and removed all related certificates`);

    return res.json({
      success: true,
      message: "Event and related certificates deleted successfully.",
      data: {
        id: event._id,
        deletedCertificates: certificates.length,
      },
    });
  } catch (err) {
    console.error("deleteEvent error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// --- Google Sheets Integration Helper & Endpoints ---

const Organization = require("../models/Organization");
const User = require("../models/User");
const { getCertificateQueue } = require("../services/certificateQueue");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");

function generateVerificationCode() {
  const token = crypto.randomBytes(16).toString("base64url").toUpperCase();
  return `CERT-${token}`;
}

async function fetchGoogleSheetRecipients(org) {
  const googleSheetsConfig = org?.integrations?.googleSheets;
  if (!googleSheetsConfig || !googleSheetsConfig.connected || !googleSheetsConfig.sheetUrl) {
    throw new Error("Google Sheets integration is not connected or configured.");
  }

  const sheetUrl = googleSheetsConfig.sheetUrl;
  const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
  const spreadsheetId = match ? match[1] : sheetUrl;

  const response = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`);
  if (!response.ok) {
    throw new Error("Failed to fetch spreadsheet. Verify that your sheet is shared with 'Anyone with the link can view'.");
  }

  const csvText = await response.text();
  const { Readable } = require("stream");
  const csv = require("csv-parser");

  const rows = [];
  await new Promise((resolve, reject) => {
    Readable.from([csvText])
      .pipe(csv())
      .on("data", (row) => {
        const nameKey = Object.keys(row).find(k => k.toLowerCase() === "name");
        const emailKey = Object.keys(row).find(k => k.toLowerCase() === "email");
        
        const name = nameKey ? row[nameKey] : null;
        const email = emailKey ? row[emailKey] : null;

        if (name && email) {
          rows.push({
            name: String(name).trim().slice(0, 200),
            email: String(email).trim().toLowerCase().slice(0, 320),
          });
        }
      })
      .on("end", resolve)
      .on("error", reject);
  });

  return rows;
}

// GET /api/events/:id/google-sheets/preview
exports.previewGoogleSheets = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "Invalid event id" });
    }

    const event = await Event.findOne({ _id: id, workspaceId: req.workspaceId });
    if (!event) {
      return res.status(404).json({ success: false, error: "Event not found or unauthorized" });
    }

    const org = await Organization.findById(req.organizationId);
    if (!org) {
      return res.status(404).json({ success: false, error: "Organization not found" });
    }

    try {
      const rows = await fetchGoogleSheetRecipients(org);
      
      // Deduplicate rows by email
      const uniqueRowsMap = new Map();
      for (const row of rows) {
        if (!uniqueRowsMap.has(row.email)) {
          uniqueRowsMap.set(row.email, row.name);
        }
      }
      const uniqueRows = Array.from(uniqueRowsMap.entries()).map(([email, name]) => ({ name, email }));

      return res.json({
        success: true,
        data: {
          sheetUrl: org.integrations.googleSheets.sheetUrl,
          totalCount: uniqueRows.length,
          recipients: uniqueRows
        }
      });
    } catch (fetchErr) {
      return res.status(400).json({ success: false, error: fetchErr.message });
    }
  } catch (err) {
    console.error("previewGoogleSheets error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// POST /api/events/:id/google-sheets/import
exports.importGoogleSheets = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "Invalid event id" });
    }

    const event = await Event.findOne({ _id: id, workspaceId: req.workspaceId });
    if (!event) {
      return res.status(404).json({ success: false, error: "Event not found or unauthorized" });
    }

    const org = await Organization.findById(req.organizationId);
    if (!org) {
      return res.status(404).json({ success: false, error: "Organization not found" });
    }

    let rows;
    try {
      rows = await fetchGoogleSheetRecipients(org);
    } catch (fetchErr) {
      return res.status(400).json({ success: false, error: fetchErr.message });
    }

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Google Sheet is empty or missing required columns (name, email).",
      });
    }

    // Deduplicate rows by email in-memory
    const uniqueRowsMap = new Map();
    for (const row of rows) {
      if (!uniqueRowsMap.has(row.email)) {
        uniqueRowsMap.set(row.email, row.name);
      }
    }

    const uniqueEmails = Array.from(uniqueRowsMap.keys());

    // 1. Bulk find existing users
    const existingUsers = await User.find({ email: { $in: uniqueEmails } }).lean();
    const existingUserMap = new Map();
    for (const user of existingUsers) {
      existingUserMap.set(user.email, user._id);
    }

    // 2. Identify missing users and perform bulk insert
    const missingUsers = [];
    for (const email of uniqueEmails) {
      if (!existingUserMap.has(email)) {
        missingUsers.push({ email, name: uniqueRowsMap.get(email) });
      }
    }

    if (missingUsers.length > 0) {
      const insertedUsers = await User.insertMany(missingUsers, { ordered: false });
      for (const user of insertedUsers) {
        existingUserMap.set(user.email, user._id);
      }
    }

    // 3. Collect all user IDs associated with the event
    const allUserIds = Array.from(existingUserMap.values());

    // 4. Bulk find existing certificates for these users & event
    const existingCerts = await Certificate.find({
      userId: { $in: allUserIds },
      eventId: event._id
    }).lean();

    const existingCertSet = new Set();
    for (const cert of existingCerts) {
      existingCertSet.add(cert.userId.toString());
    }

    // 5. Prepare and execute single bulk insert for remaining certificates
    const newCertificates = [];
    for (const userId of allUserIds) {
      if (!existingCertSet.has(userId.toString())) {
        newCertificates.push({
          userId: userId,
          eventId: event._id,
          organizationId: event.organizationId,
          workspaceId: event.workspaceId,
          verificationCode: generateVerificationCode(),
          status: "pending"
        });
      }
    }

    let created = 0;
    const jobId = uuidv4();

    if (newCertificates.length > 0) {
      try {
        const insertedCerts = await Certificate.insertMany(newCertificates, { ordered: false });
        created = insertedCerts.length;
      } catch (insertErr) {
        created = insertErr.result?.insertedCount ?? insertErr.insertedDocs?.length ?? 0;
        if (created === 0) throw insertErr;
      }
    }

    // Push certificate generation to the background worker via Bull queue
    const certQueue = getCertificateQueue();
    if (certQueue) {
      try {
        await certQueue.add({ eventId: event._id.toString() });
        console.log(`[API] Queued certificate generation for event ${event._id}`);
      } catch (e) {
        console.warn("[API] Redis queue unavailable, generating synchronously:", e.message);
        const { queueCertificateGeneration } = require("../workers/certificateWorker");
        queueCertificateGeneration(event._id.toString());
      }
    } else {
      const { queueCertificateGeneration } = require("../workers/certificateWorker");
      queueCertificateGeneration(event._id.toString());
    }

    if (created > 0) {
      await auditService.logAction(
        req,
        "certificate_issued",
        event._id,
        "Event",
        `Imported and issued ${created} certificates in bulk for event "${event.name}" via Google Sheets sync`
      );
    }

    return res.status(202).json({
      success: true,
      message: "Sync complete! Certificate generation queued.",
      data: {
        jobId,
        totalRowsProcessed: created,
      },
    });
  } catch (err) {
    console.error("importGoogleSheets error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};
