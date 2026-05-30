const Certificate = require("../models/Certificate");

// GET /api/verify/:code
exports.verifyCertificate = async (req, res) => {
  try {
    const { code } = req.params;

    const certificate = await Certificate.findOne({
      verificationCode: code.toUpperCase(),
    })
      .populate("userId")
      .populate("eventId");

    if (!certificate) {
      return res.status(404).json({
        success: false,
        error: "Invalid verification code or certificate not found.",
      });
    }

    return res.json({
      success: true,
      data: {
        isValid: true,
        certificate: {
          recipientName: certificate.userId?.name || "Unknown",
          eventName: certificate.eventId?.name || "Unknown Event",
          eventDate: certificate.eventId?.date?.toISOString() || null,
          issuedAt: certificate.createdAt.toISOString(),
          pdfUrl: certificate.pdfUrl,
        },
      },
    });
  } catch (err) {
    console.error("verifyCertificate error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};
