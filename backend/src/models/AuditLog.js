const mongoose = require("mongoose");

const AuditLogSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TeamMember",
      required: true,
    },
    actorName: {
      type: String,
      required: true,
      trim: true,
    },
    actorEmail: {
      type: String,
      required: true,
      trim: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "certificate_issued",
        "certificate_revoked",
        "template_created",
        "template_updated",
        "template_deleted",
        "event_created",
        "event_updated",
        "event_deleted",
        "font_uploaded",
        "font_deleted",
        "rest_api_toggled",
      ],
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    targetModel: {
      type: String,
      required: false,
      enum: ["Certificate", "Event", "Template", "CustomFont", "Integration"],
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    ipAddress: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: "",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
  },
  { timestamps: true }
);

// High-speed index for multi-tenant chronological audits
AuditLogSchema.index({ workspaceId: 1, createdAt: -1 });
AuditLogSchema.index({ workspaceId: 1, action: 1 });
AuditLogSchema.index({ workspaceId: 1, actorEmail: 1 });

module.exports = mongoose.model("AuditLog", AuditLogSchema);
