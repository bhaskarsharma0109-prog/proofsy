const mongoose = require("mongoose");

const EventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    organizerName: {
      type: String,
      required: true,
      trim: true,
    },
    duration: {
      type: String,
      trim: true,
      default: null,
    },
    templateId: {
      type: String,
      enum: ["classic", "modern", "elegant", "corporate", "academic", "creative"],
      default: "modern",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", EventSchema);
