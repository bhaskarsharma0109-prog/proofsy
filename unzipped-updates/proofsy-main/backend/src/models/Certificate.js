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

module.exports = mongoose.model("Certificate", CertificateSchema);
