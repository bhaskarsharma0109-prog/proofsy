const Event = require("../models/Event");
const Certificate = require("../models/Certificate");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

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

    const event = await Event.create({ name, date, organizerName, templateId, duration });

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
    const events = await Event.find().sort({ createdAt: -1 });

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

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ success: false, error: "Event not found" });
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

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: "Event not found",
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
