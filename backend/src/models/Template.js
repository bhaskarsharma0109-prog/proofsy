const mongoose = require("mongoose");

const TextLayerSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    variable: {
      type: String,
      required: true,
      enum: [
        "recipient_name",
        "event_name",
        "date",
        "verification_code",
        "organizer",
        "duration",
        "custom",
      ],
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    x: {
      type: Number,
      required: true,
    },
    y: {
      type: Number,
      required: true,
    },
    fontSize: {
      type: Number,
      required: true,
      default: 32,
    },
    fontFamily: {
      type: String,
      default: "Inter",
      trim: true,
    },
    fontWeight: {
      type: String,
      enum: ["normal", "bold"],
      default: "normal",
    },
    color: {
      type: String,
      default: "#000000",
      trim: true,
    },
    textAlign: {
      type: String,
      enum: ["left", "center", "right"],
      default: "center",
    },
    maxWidth: {
      type: Number,
      default: null,
    },
    customText: {
      type: String,
      default: null,
      trim: true,
    },
  },
  { _id: true }
);

const TemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    backgroundType: {
      type: String,
      enum: ["image", "pdf"],
      required: true,
    },
    backgroundUrl: {
      type: String,
      required: true,
    },
    width: {
      type: Number,
      default: 1056,
    },
    height: {
      type: Number,
      default: 746,
    },
    textLayers: [TextLayerSchema],
    isStarter: {
      type: Boolean,
      default: false,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: false, // null for starter templates
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: false, // null for starter templates
      index: true,
    },
    // Fixed QR code position
    qrCode: {
      enabled: { type: Boolean, default: true },
      x: { type: Number, default: 880 },
      y: { type: Number, default: 580 },
      size: { type: Number, default: 120 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Template", TemplateSchema);
