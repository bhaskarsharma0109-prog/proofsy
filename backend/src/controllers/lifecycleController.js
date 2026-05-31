const crypto = require("crypto");
const mongoose = require("mongoose");
const Certificate = require("../models/Certificate");
const auditService = require("../services/auditService");
const { getCertificateQueue } = require("../services/certificateQueue");

function generateVerificationCode() {
  const token = crypto.randomBytes(16).toString("base64url").toUpperCase();
  return `CERT-${token}`;
}

function parseOptionalDate(value, fieldName) {
  if (value === null || value === "") return null;
  const parsed = new Date(value);
  if (!value || Number.isNaN(parsed.getTime())) {
    const error = new Error(`${fieldName} must be a valid date`);
    error.statusCode = 400;
    throw error;
  }
  return parsed;
}

async function loadCertificate(req, id, populate = true) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error("Invalid certificate id");
    error.statusCode = 400;
    throw error;
  }

  let query = Certificate.findOne({ _id: id, workspaceId: req.workspaceId });
  if (populate) {
    query = query.populate("userId").populate("eventId");
  }
  const certificate = await query;
  if (!certificate) {
    const error = new Error("Certificate not found or unauthorized");
    error.statusCode = 404;
    throw error;
  }
  return certificate;
}

function serializeCertificate(certificate) {
  return {
    id: certificate._id,
    verificationCode: certificate.verificationCode,
    recipientName: certificate.userId?.name || "Unknown",
    recipientEmail: certificate.userId?.email || "Unknown",
    eventId: certificate.eventId?._id || certificate.eventId || null,
    eventName: certificate.eventId?.name || "Unknown Event",
    status: certificate.status,
    pdfUrl: certificate.pdfUrl,
    expiresAt: certificate.expiresAt ? certificate.expiresAt.toISOString() : null,
    revokedAt: certificate.revokedAt ? certificate.revokedAt.toISOString() : null,
    revocationReason: certificate.revocationReason || "",
    suspendedAt: certificate.suspendedAt ? certificate.suspendedAt.toISOString() : null,
    renewedFrom: certificate.renewedFrom || null,
    issuedAt: certificate.createdAt.toISOString(),
  };
}

async function enqueueGeneration(eventId) {
  const certQueue = getCertificateQueue();
  if (certQueue) {
    try {
      await certQueue.add({ eventId: eventId.toString() });
      return;
    } catch (error) {
      console.warn("[Lifecycle] Redis queue unavailable, renewing synchronously:", error.message);
    }
  }

  const { queueCertificateGeneration } = require("../workers/certificateWorker");
  queueCertificateGeneration(eventId.toString());
}

function handleControllerError(res, error, label) {
  if (error.statusCode) {
    return res.status(error.statusCode).json({ success: false, error: error.message });
  }
  console.error(`${label} error:`, error);
  return res.status(500).json({ success: false, error: "Internal server error" });
}

exports.revokeCertificate = async (req, res) => {
  try {
    const certificate = await loadCertificate(req, req.params.id);
    const reason = String(req.body?.reason || "Revoked by organization").trim().slice(0, 500);

    certificate.status = "revoked";
    certificate.revokedAt = new Date();
    certificate.revokedBy = req.member._id || req.member.id;
    certificate.revocationReason = reason;
    await certificate.save();

    await auditService.logAction(
      req,
      "certificate_revoked",
      certificate._id,
      "Certificate",
      `Revoked certificate "${certificate.verificationCode}"`,
      { reason }
    );

    return res.json({ success: true, data: serializeCertificate(certificate) });
  } catch (error) {
    return handleControllerError(res, error, "revokeCertificate");
  }
};

exports.bulkRevokeCertificates = async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (ids.length === 0) {
      return res.status(400).json({ success: false, error: "Provide at least one certificate id" });
    }
    if (ids.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
      return res.status(400).json({ success: false, error: "One or more certificate ids are invalid" });
    }

    const reason = String(req.body?.reason || "Bulk revoked by organization").trim().slice(0, 500);
    const certificates = await Certificate.find({ _id: { $in: ids }, workspaceId: req.workspaceId });
    const now = new Date();

    for (const certificate of certificates) {
      certificate.status = "revoked";
      certificate.revokedAt = now;
      certificate.revokedBy = req.member._id || req.member.id;
      certificate.revocationReason = reason;
      await certificate.save();
    }

    if (certificates.length > 0) {
      await auditService.logAction(
        req,
        "certificate_revoked",
        null,
        null,
        `Bulk revoked ${certificates.length} certificate(s)`,
        { ids: certificates.map((c) => c._id), reason }
      );
    }

    return res.json({
      success: true,
      data: {
        updated: certificates.length,
        ids: certificates.map((c) => c._id),
      },
    });
  } catch (error) {
    return handleControllerError(res, error, "bulkRevokeCertificates");
  }
};

exports.suspendCertificate = async (req, res) => {
  try {
    const certificate = await loadCertificate(req, req.params.id);
    certificate.status = "suspended";
    certificate.suspendedAt = new Date();
    await certificate.save();

    await auditService.logAction(
      req,
      "certificate_suspended",
      certificate._id,
      "Certificate",
      `Suspended certificate "${certificate.verificationCode}"`
    );

    return res.json({ success: true, data: serializeCertificate(certificate) });
  } catch (error) {
    return handleControllerError(res, error, "suspendCertificate");
  }
};

exports.reinstateCertificate = async (req, res) => {
  try {
    const certificate = await loadCertificate(req, req.params.id);
    const now = new Date();

    certificate.status = certificate.expiresAt && certificate.expiresAt < now ? "expired" : "generated";
    certificate.suspendedAt = null;
    if (certificate.status === "generated") {
      certificate.revokedAt = null;
      certificate.revokedBy = null;
      certificate.revocationReason = "";
    }
    await certificate.save();

    await auditService.logAction(
      req,
      "certificate_reinstated",
      certificate._id,
      "Certificate",
      `Reinstated certificate "${certificate.verificationCode}"`
    );

    return res.json({ success: true, data: serializeCertificate(certificate) });
  } catch (error) {
    return handleControllerError(res, error, "reinstateCertificate");
  }
};

exports.renewCertificate = async (req, res) => {
  try {
    const certificate = await loadCertificate(req, req.params.id, false);
    const expiresAt = req.body?.expiresAt !== undefined
      ? parseOptionalDate(req.body.expiresAt, "expiresAt")
      : null;

    const renewed = await Certificate.create({
      userId: certificate.userId,
      eventId: certificate.eventId,
      organizationId: certificate.organizationId,
      workspaceId: certificate.workspaceId,
      verificationCode: generateVerificationCode(),
      status: "pending",
      expiresAt,
      renewedFrom: certificate._id,
    });

    await enqueueGeneration(certificate.eventId);

    await auditService.logAction(
      req,
      "certificate_renewed",
      renewed._id,
      "Certificate",
      `Renewed certificate "${certificate.verificationCode}" as "${renewed.verificationCode}"`,
      { renewedFrom: certificate._id }
    );

    await renewed.populate("userId");
    await renewed.populate("eventId");

    return res.status(201).json({ success: true, data: serializeCertificate(renewed) });
  } catch (error) {
    return handleControllerError(res, error, "renewCertificate");
  }
};

exports.setCertificateExpiry = async (req, res) => {
  try {
    const certificate = await loadCertificate(req, req.params.id);
    const expiresAt = parseOptionalDate(req.body?.expiresAt, "expiresAt");
    const now = new Date();

    certificate.expiresAt = expiresAt;
    if (expiresAt && expiresAt < now && certificate.status === "generated") {
      certificate.status = "expired";
    } else if (expiresAt && expiresAt >= now && certificate.status === "expired") {
      certificate.status = "generated";
    }
    await certificate.save();

    await auditService.logAction(
      req,
      "certificate_expiry_updated",
      certificate._id,
      "Certificate",
      `Updated expiry for certificate "${certificate.verificationCode}"`,
      { expiresAt: expiresAt ? expiresAt.toISOString() : null }
    );

    return res.json({ success: true, data: serializeCertificate(certificate) });
  } catch (error) {
    return handleControllerError(res, error, "setCertificateExpiry");
  }
};

exports.listExpiringCertificates = async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 365);
    const now = new Date();
    const until = new Date(now);
    until.setDate(until.getDate() + days);

    const certificates = await Certificate.find({
      workspaceId: req.workspaceId,
      status: "generated",
      expiresAt: { $gte: now, $lte: until },
    })
      .populate("userId")
      .populate("eventId")
      .sort({ expiresAt: 1 });

    return res.json({
      success: true,
      data: certificates.map(serializeCertificate),
    });
  } catch (error) {
    return handleControllerError(res, error, "listExpiringCertificates");
  }
};
