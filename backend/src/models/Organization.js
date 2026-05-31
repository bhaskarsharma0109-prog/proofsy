const mongoose = require("mongoose");

const OrganizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    integrations: {
      zapier: {
        connected: { type: Boolean, default: false },
        webhookUrl: { type: String, default: "" },
      },
      googleSheets: {
        connected: { type: Boolean, default: false },
        sheetUrl: { type: String, default: "" },
      },
      restApi: {
        connected: { type: Boolean, default: false },
        apiKey: { type: String, default: "" },
      },
      slack: {
        connected: { type: Boolean, default: false },
        webhookUrl: { type: String, default: "" },
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Organization", OrganizationSchema);
