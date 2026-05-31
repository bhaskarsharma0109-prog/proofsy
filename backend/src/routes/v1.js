const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const crypto = require("crypto");
const { protectApiKey } = require("../middleware/auth");
const Event = require("../models/Event");
const User = require("../models/User");
const Certificate = require("../models/Certificate");
const { getCertificateQueue } = require("../services/certificateQueue");

// Apply API Key security middleware to all endpoints under /api/v1
router.use(protectApiKey);

function generateVerificationCode() {
  const token = crypto.randomBytes(16).toString("base64url").toUpperCase();
  return `CERT-${token}`;
}

// GET /api/v1/events
// Lists all events for the authenticated organization
router.get("/events", async (req, res) => {
  try {
    const events = await Event.find({ organizationId: req.organizationId }).sort({ createdAt: -1 });

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
    console.error("[v1 API] List events error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// POST /api/v1/certificates
// Issues a single certificate to a recipient and queues PDF generation
router.post("/certificates", async (req, res) => {
  try {
    const { eventId, name, email } = req.body;

    if (!eventId || !name || !email) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: eventId, name, email",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ success: false, error: "Invalid eventId" });
    }

    const trimmedName = String(name).trim().slice(0, 200);
    const trimmedEmail = String(email).trim().toLowerCase().slice(0, 320);

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ success: false, error: "Invalid email address format" });
    }

    // 1. Verify event exists AND belongs to the organization
    const event = await Event.findOne({ _id: eventId, organizationId: req.organizationId });
    if (!event) {
      return res.status(404).json({ success: false, error: "Event not found or unauthorized" });
    }

    // 2. Find or create user
    let user = await User.findOne({ email: trimmedEmail });
    if (!user) {
      user = await User.create({ email: trimmedEmail, name: trimmedName });
    }

    // 3. Check if certificate already exists
    let certificate = await Certificate.findOne({
      userId: user._id,
      eventId: event._id,
    });

    const Workspace = require("../models/Workspace");
    const workspace = await Workspace.findById(event.workspaceId);
    if (!workspace) {
      return res.status(404).json({ success: false, error: "Workspace context not found" });
    }

    let isNew = false;
    if (!certificate) {
      // Check credits before creating
      if (workspace.plan !== "annual-pass" && workspace.credits < 1) {
        return res.status(402).json({
          success: false,
          error: "Insufficient credits. Your workspace has 0 credits remaining. Please upgrade."
        });
      }

      isNew = true;
      certificate = await Certificate.create({
        userId: user._id,
        eventId: event._id,
        organizationId: req.organizationId,
        workspaceId: event.workspaceId,
        verificationCode: generateVerificationCode(),
        status: "pending",
      });

      // Deduct credit
      if (workspace.plan !== "annual-pass") {
        workspace.credits = Math.max(0, workspace.credits - 1);
        await workspace.save();
      }
    }

    // 4. Trigger worker queue for certificate generation if it's new or not yet generated
    if (isNew || certificate.status !== "generated") {
      const certQueue = getCertificateQueue();
      if (certQueue) {
        try {
          await certQueue.add({ eventId: event._id.toString() });
        } catch (e) {
          console.warn("[v1 API] Redis queue unavailable, generating synchronously:", e.message);
          const { queueCertificateGeneration } = require("../workers/certificateWorker");
          queueCertificateGeneration(event._id.toString());
        }
      } else {
        const { queueCertificateGeneration } = require("../workers/certificateWorker");
        queueCertificateGeneration(event._id.toString());
      }
    }

    if (isNew) {
      try {
        const auditService = require("../services/auditService");
        req.member = { _id: workspace.organizationId, name: "REST API Developer", email: "api-key@proofsy.io" };
        req.workspaceId = event.workspaceId;
        await auditService.logAction(
          req,
          "certificate_issued",
          certificate._id,
          "Certificate",
          `Programmatically issued certificate "${certificate.verificationCode}" to "${user.name}" (${user.email}) via Developer REST API`
        );
      } catch (auditErr) {
        console.warn("[v1 API] Failed to log API certificate issuance:", auditErr.message);
      }
    }

    return res.status(isNew ? 201 : 200).json({
      success: true,
      message: isNew ? "Certificate issued and queued for generation." : "Certificate already exists.",
      data: {
        id: certificate._id,
        recipientName: user.name,
        recipientEmail: user.email,
        verificationCode: certificate.verificationCode,
        status: certificate.status,
        pdfUrl: certificate.pdfUrl || null,
        issuedAt: certificate.createdAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("[v1 API] Issue certificate error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

module.exports = router;
