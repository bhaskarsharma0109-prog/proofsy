const mongoose = require("mongoose");

const WorkspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TeamMember",
      required: true,
    },
    smtpSettings: {
      host: { type: String, default: "" },
      port: { type: Number, default: 587 },
      secure: { type: Boolean, default: false },
      authUser: { type: String, default: "" },
      authPass: { type: String, default: "" },
      fromName: { type: String, default: "" },
      fromEmail: { type: String, default: "" },
    },
    plan: {
      type: String,
      enum: ["free", "fest-pass", "mega-pass", "annual-pass"],
      default: "free",
    },
    credits: {
      type: Number,
      default: 250,
    },
    planExpiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Workspace", WorkspaceSchema);
