const mongoose = require("mongoose");

const CertificateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    verificationCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    pdfUrl: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "generated", "failed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// Prevent duplicate certificates for the same user+event
CertificateSchema.index({ userId: 1, eventId: 1 }, { unique: true });
// Common query patterns: scope by organization, filter by status, sort by date.
CertificateSchema.index({ organizationId: 1, createdAt: -1 });
CertificateSchema.index({ organizationId: 1, status: 1 });
CertificateSchema.index({ eventId: 1, status: 1 });

module.exports = mongoose.model("Certificate", CertificateSchema);
