const mongoose = require("mongoose");

const VerificationAuditSchema = new mongoose.Schema(
  {
    certificateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Certificate",
      required: true,
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    referralSource: {
      type: String,
      enum: ["linkedin", "twitter", "qr", "direct", "offline"],
      default: "direct",
    },
    deviceType: {
      type: String,
      enum: ["desktop", "mobile", "tablet"],
      default: "desktop",
    },
    browser: {
      type: String,
      default: "Other",
    },
    os: {
      type: String,
      default: "Other",
    },
    country: {
      type: String,
      default: "Unknown",
    },
  },
  { timestamps: true }
);

// High-speed indices for analytics scaling
VerificationAuditSchema.index({ workspaceId: 1, createdAt: -1 });
VerificationAuditSchema.index({ workspaceId: 1, referralSource: 1 });

module.exports = mongoose.model("VerificationAudit", VerificationAuditSchema);
