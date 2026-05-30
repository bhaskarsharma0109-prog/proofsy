const mongoose = require("mongoose");
const User = require("../models/User");
const Certificate = require("../models/Certificate");
const Event = require("../models/Event");

// GET /api/users?limit=&offset=
// Lists recipients who have at least one certificate in the caller's
// organization, with per-recipient aggregated counts computed in MongoDB.
exports.listUsers = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const orgId = new mongoose.Types.ObjectId(req.organizationId);

    const pipeline = [
      { $match: { organizationId: orgId } },
      {
        $group: {
          _id: "$userId",
          totalCertificates: { $sum: 1 },
          events: { $addToSet: "$eventId" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      { $sort: { "user.createdAt": -1 } },
    ];

    const [countResult, rows] = await Promise.all([
      Certificate.aggregate([...pipeline, { $count: "total" }]),
      Certificate.aggregate([...pipeline, { $skip: offset }, { $limit: limit }]),
    ]);

    const total = countResult[0]?.total || 0;

    const data = rows.map((r) => ({
      id: r.user._id,
      name: r.user.name,
      email: r.user.email,
      createdAt: r.user.createdAt,
      totalCertificates: r.totalCertificates,
      totalEventsAttended: r.events.length,
    }));

    return res.json({ success: true, pagination: { total, limit, offset }, data });
  } catch (err) {
    console.error("listUsers error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};
// GET /api/users/:email
exports.getUserByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Only count certificates issued within the caller's organization.
    const certificates = await Certificate.find({
      userId: user._id,
      organizationId: req.organizationId,
    }).populate("eventId");

    if (certificates.length === 0) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const uniqueEvents = new Set(certificates.map((certificate) => certificate.eventId?._id?.toString()));

    return res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        totalCertificates: certificates.length,
        totalEventsAttended: uniqueEvents.size,
      },
    });
  } catch (err) {
    console.error("getUserByEmail error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// POST /api/users
exports.createUser = async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: name, email",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: "User already exists",
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
    });

    return res.status(201).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("createUser error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// GET /api/users/:email/certificates
exports.getUserCertificates = async (req, res) => {
  try {
    const { email } = req.params;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const certificates = await Certificate.find({
      userId: user._id,
      organizationId: req.organizationId,
    })
      .populate("eventId")
      .sort({ createdAt: -1 });

    const uniqueEvents = new Set(certificates.map((c) => c.eventId?._id?.toString()));

    return res.json({
      success: true,
      data: {
        user: {
          name: user.name,
          email: user.email,
        },
        totalEventsAttended: uniqueEvents.size,
        certificates: certificates.map((c) => ({
          id: c._id,
          eventId: c.eventId?._id,
          eventName: c.eventId?.name || "Unknown Event",
          eventDate: c.eventId?.date?.toISOString() || null,
          verificationCode: c.verificationCode,
          pdfUrl: c.pdfUrl,
          issuedAt: c.createdAt.toISOString(),
        })),
      },
    });
  } catch (err) {
    console.error("getUserCertificates error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};
