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
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
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
    pngUrl: {
      type: String,
      default: null,
    },
    svgUrl: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "generated", "failed"],
      default: "pending",
    },
    attemptsCount: {
      type: Number,
      default: 0,
    },
    errorLog: {
      type: String,
      default: "",
    },
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
    },
    cryptographicSignature: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Prevent duplicate certificates for the same user+event
CertificateSchema.index({ userId: 1, eventId: 1 }, { unique: true });
// Common query patterns: scope by workspace, filter by status, sort by date.
CertificateSchema.index({ workspaceId: 1, createdAt: -1 });
CertificateSchema.index({ workspaceId: 1, status: 1 });
CertificateSchema.index({ eventId: 1, status: 1 });

module.exports = mongoose.model("Certificate", CertificateSchema);
