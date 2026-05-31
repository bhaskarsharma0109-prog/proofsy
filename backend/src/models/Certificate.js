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
      enum: ["pending", "generated", "failed", "revoked", "expired", "suspended"],
      default: "pending",
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TeamMember",
      default: null,
    },
    revocationReason: {
      type: String,
      default: "",
    },
    suspendedAt: {
      type: Date,
      default: null,
    },
    renewedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Certificate",
      default: null,
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

// Prevent duplicate original certificates for the same user+event, while
// allowing renewal records linked through renewedFrom.
CertificateSchema.index(
  { userId: 1, eventId: 1 },
  { unique: true, partialFilterExpression: { renewedFrom: null } }
);
// Common query patterns: scope by workspace, filter by status, sort by date.
CertificateSchema.index({ workspaceId: 1, createdAt: -1 });
CertificateSchema.index({ workspaceId: 1, status: 1 });
CertificateSchema.index({ eventId: 1, status: 1 });
CertificateSchema.index({ expiresAt: 1, status: 1 });

module.exports = mongoose.model("Certificate", CertificateSchema);
