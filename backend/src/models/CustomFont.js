const mongoose = require("mongoose");

const CustomFontSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    family: {
      type: String,
      required: true,
      trim: true,
    },
    fontWeight: {
      type: String,
      enum: ["normal", "bold"],
      default: "normal",
    },
    fontUrl: {
      type: String,
      required: true,
      trim: true,
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TeamMember",
      required: true,
    },
  },
  { timestamps: true }
);

// Enforce unique fonts per family and weight inside each tenant workspace
CustomFontSchema.index({ workspaceId: 1, family: 1, fontWeight: 1 }, { unique: true });

module.exports = mongoose.model("CustomFont", CustomFontSchema);
