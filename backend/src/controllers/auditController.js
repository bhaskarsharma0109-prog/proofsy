const AuditLog = require("../models/AuditLog");

// GET /api/audit-logs
exports.listAuditLogs = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    const query = { workspaceId: req.workspaceId };

    // Apply filtering options
    if (req.query.action) {
      query.action = req.query.action;
    }
    if (req.query.actorEmail) {
      query.actorEmail = req.query.actorEmail.toLowerCase().trim();
    }
    if (req.query.search) {
      query.description = { $regex: req.query.search, $options: "i" };
    }

    const [total, logs] = await Promise.all([
      AuditLog.countDocuments(query),
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit),
    ]);

    return res.json({
      success: true,
      pagination: {
        total,
        limit,
        offset,
      },
      data: logs.map((log) => ({
        id: log._id,
        actorName: log.actorName,
        actorEmail: log.actorEmail,
        action: log.action,
        targetId: log.targetId || null,
        targetModel: log.targetModel || null,
        description: log.description,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        createdAt: log.createdAt,
      })),
    });
  } catch (err) {
    console.error("listAuditLogs error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};
