const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose");
const User = require("../models/User");
const Event = require("../models/Event");
const Certificate = require("../models/Certificate");

// POST /api/certificates/generate
exports.generateCertificates = async (req, res) => {
  try {
    const { eventId } = req.body;
    const file = req.file;

    if (!eventId) {
      return res.status(400).json({ success: false, error: "Missing eventId" });
    }
    if (!file) {
      return res.status(400).json({ success: false, error: "Missing CSV file" });
    }

    // Verify event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, error: "Event not found" });
    }

    // Parse CSV and collect rows
    const rows = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(file.path)
        .pipe(csv())
        .on("data", (row) => {
          if (row.name && row.email) {
            rows.push({
              name: row.name.trim(),
              email: row.email.trim().toLowerCase(),
            });
          }
        })
        .on("end", resolve)
        .on("error", reject);
    });

    if (rows.length === 0) {
      // Clean up uploaded file
      fs.unlinkSync(file.path);
      return res.status(400).json({
        success: false,
        error: "CSV is empty or missing required columns (name, email).",
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

    // 2. Identify missing users and perform a single bulk insert
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
          verificationCode: `CERT-${uuidv4().slice(0, 8).toUpperCase()}`,
          status: "pending"
        });
      }
    }

    let created = 0;
    const jobId = uuidv4();

    if (newCertificates.length > 0) {
      // Chunk bulk inserts if extremely large (e.g., > 100k), but insertMany handles 10k perfectly fine
      const insertedCerts = await Certificate.insertMany(newCertificates, { ordered: false });
      created = insertedCerts.length;
    }

    // Clean up uploaded file
    fs.unlinkSync(file.path);

    // Push certificate generation to the background worker via Bull/Redis
    try {
      const Queue = require("bull");
      const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
      const certQueue = new Queue("certificate-generation", REDIS_URL);
      await certQueue.add({ eventId: event._id.toString() });
      console.log(`[API] Queued certificate generation for event ${event._id}`);
    } catch (e) {
      // Redis unavailable — fall back to synchronous generation
      console.warn("[API] Redis queue unavailable, generating synchronously:", e.message);
      const { queueCertificateGeneration } = require("../workers/certificateWorker");
      queueCertificateGeneration(event._id.toString());
    }

    return res.status(202).json({
      success: true,
      message: "Certificate generation job queued successfully.",
      data: {
        jobId,
        totalRowsProcessed: created,
      },
    });
  } catch (err) {
    console.error("generateCertificates error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// GET /api/certificates
exports.listCertificates = async (req, res) => {
  try {
    const certificates = await Certificate.find()
      .populate("userId")
      .populate("eventId")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: certificates.map((c) => ({
        id: c._id,
        verificationCode: c.verificationCode,
        recipientName: c.userId?.name || "Unknown",
        recipientEmail: c.userId?.email || "Unknown",
        eventName: c.eventId?.name || "Unknown Event",
        eventDate: c.eventId?.date?.toISOString() || null,
        templateId: c.eventId?.templateId || "modern",
        pdfUrl: c.pdfUrl,
        status: c.status,
        issuedAt: c.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("listCertificates error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// GET /api/certificates/:id
exports.getCertificateById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid certificate id",
      });
    }

    const certificate = await Certificate.findById(id)
      .populate("userId")
      .populate("eventId");

    if (!certificate) {
      return res.status(404).json({
        success: false,
        error: "Certificate not found",
      });
    }

    return res.json({
      success: true,
      data: {
        id: certificate._id,
        verificationCode: certificate.verificationCode,
        recipientName: certificate.userId?.name || "Unknown",
        recipientEmail: certificate.userId?.email || "Unknown",
        eventName: certificate.eventId?.name || "Unknown Event",
        eventDate: certificate.eventId?.date?.toISOString() || null,
        organizerName: certificate.eventId?.organizerName || "Unknown Organizer",
        templateId: certificate.eventId?.templateId || "modern",
        pdfUrl: certificate.pdfUrl,
        status: certificate.status,
        issuedAt: certificate.createdAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("getCertificateById error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// POST /api/certificates/send-emails
exports.sendEmails = async (req, res) => {
  try {
    const { eventId } = req.body;

    if (!eventId) {
      return res.status(400).json({ success: false, error: "Missing eventId" });
    }

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ success: false, error: "Invalid eventId" });
    }

    const { sendEventEmails } = require("../services/emailService");
    const result = await sendEventEmails(eventId);

    return res.json({
      success: true,
      message: `Emails sent: ${result.sent}, failed: ${result.failed}`,
      data: result,
    });
  } catch (err) {
    console.error("sendEmails error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// GET /api/certificates/stats
exports.getStats = async (req, res) => {
  try {
    // Run all aggregate counts in parallel
    const [
      totalCertificates,
      generated,
      pending,
      failed,
      totalEvents,
      totalUsers,
      recentEvents
    ] = await Promise.all([
      Certificate.countDocuments(),
      Certificate.countDocuments({ status: "generated" }),
      Certificate.countDocuments({ status: "pending" }),
      Certificate.countDocuments({ status: "failed" }),
      Event.countDocuments(),
      User.countDocuments(),
      Event.find().sort({ createdAt: -1 }).limit(5).lean()
    ]);

    // Verification rate = generated / total
    const verificationRate = totalCertificates > 0
      ? Math.round((generated / totalCertificates) * 100)
      : 0;

    // Fetch cert counts for recent events in parallel
    const recentWithCounts = await Promise.all(
      recentEvents.map(async (event) => {
        const [certCount, genCount] = await Promise.all([
          Certificate.countDocuments({ eventId: event._id }),
          Certificate.countDocuments({ eventId: event._id, status: "generated" })
        ]);
        
        return {
          id: event._id,
          name: event.name,
          date: event.date.toISOString(),
          organizerName: event.organizerName,
          totalCertificates: certCount,
          generatedCertificates: genCount,
          createdAt: event.createdAt.toISOString(),
        };
      })
    );

    // Top recipients
    const topRecipients = await Certificate.aggregate([
      { $group: { _id: "$userId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 0,
          name: "$user.name",
          email: "$user.email",
          certificateCount: "$count",
        },
      },
    ]);

    return res.json({
      success: true,
      data: {
        totalCertificates,
        generated,
        pending,
        failed,
        totalEvents,
        totalUsers,
        verificationRate,
        recentEvents: recentWithCounts,
        topRecipients,
      },
    });
  } catch (err) {
    console.error("getStats error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};

