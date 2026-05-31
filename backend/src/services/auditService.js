const AuditLog = require("../models/AuditLog");

/**
 * Centralized service helper to capture and log administrative actions
 * asynchronously without blocking response streams.
 *
 * @param {Object} req Express request object containing member and workspace context
 * @param {String} action Name of audited action
 * @param {String} targetId ID of affected resource (optional)
 * @param {String} targetModel Model name of affected resource (optional)
 * @param {String} description Human-readable description summary of action
 * @param {Object} metadata Arbitrary JSON details (optional)
 */
exports.logAction = async (req, action, targetId = null, targetModel = null, description, metadata = null) => {
  try {
    // Gracefully handle requests missing auth/tenant decoration (e.g. keyless public or system updates)
    if (!req || !req.member || !req.workspaceId) {
      return;
    }

    const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
    const userAgent = req.headers["user-agent"] || "";

    await AuditLog.create({
      workspaceId: req.workspaceId,
      actorId: req.member._id || req.member.id,
      actorName: req.member.name,
      actorEmail: req.member.email,
      action,
      targetId: targetId || undefined,
      targetModel: targetModel || undefined,
      description,
      ipAddress,
      userAgent,
      metadata: metadata || undefined,
    });
  } catch (err) {
    console.error("[AuditService] Failed to record college audit log:", err.message);
  }
};
