const User = require("../models/User");
const Certificate = require("../models/Certificate");
const Event = require("../models/Event");

// GET /api/users
exports.listUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    const certs = await Certificate.find().populate("eventId");

    const userMap = {};
    for (const user of users) {
      userMap[user._id.toString()] = {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        totalCertificates: 0,
        totalEventsAttended: 0,
        events: new Set(),
      };
    }

    for (const cert of certs) {
      const entry = userMap[cert.userId?.toString()];
      if (entry) {
        entry.totalCertificates++;
        if (cert.eventId?._id) entry.events.add(cert.eventId._id.toString());
      }
    }

    const data = Object.values(userMap).map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      createdAt: u.createdAt,
      totalCertificates: u.totalCertificates,
      totalEventsAttended: u.events.size,
    }));

    return res.json({ success: true, data });
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

    const certificates = await Certificate.find({ userId: user._id }).populate("eventId");
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

    const certificates = await Certificate.find({ userId: user._id })
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
