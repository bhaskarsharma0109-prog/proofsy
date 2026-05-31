const express = require("express");
const router = express.Router();
const Organization = require("../models/Organization");
const { protect } = require("../middleware/auth");
const { AppError } = require("../middleware/errorHandler");

// Ensure all routes are protected
router.use(protect);

// GET /api/integrations
// Get all integrations for the current organization
router.get("/", async (req, res, next) => {
  try {
    const org = await Organization.findById(req.organizationId);
    if (!org) {
      return next(new AppError("Organization not found", 404));
    }

    res.json({
      success: true,
      data: org.integrations || {},
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/integrations/zapier
// Update Zapier integration settings
router.put("/zapier", async (req, res, next) => {
  try {
    const { connected, webhookUrl } = req.body;

    const org = await Organization.findById(req.organizationId);
    if (!org) {
      return next(new AppError("Organization not found", 404));
    }

    // Initialize integrations if it doesn't exist
    if (!org.integrations) {
      org.integrations = {};
    }
    if (!org.integrations.zapier) {
      org.integrations.zapier = {};
    }

    if (connected !== undefined) {
      org.integrations.zapier.connected = connected;
    }
    
    if (webhookUrl !== undefined) {
      org.integrations.zapier.webhookUrl = webhookUrl;
    }

    org.markModified("integrations");
    await org.save();

    res.json({
      success: true,
      data: org.integrations.zapier,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/integrations/google-sheets
// Update Google Sheets integration settings
router.put("/google-sheets", async (req, res, next) => {
  try {
    const { connected, sheetUrl } = req.body;

    const org = await Organization.findById(req.organizationId);
    if (!org) {
      return next(new AppError("Organization not found", 404));
    }

    // Initialize integrations if it doesn't exist
    if (!org.integrations) {
      org.integrations = {};
    }
    if (!org.integrations.googleSheets) {
      org.integrations.googleSheets = {};
    }

    if (connected !== undefined) {
      org.integrations.googleSheets.connected = connected;
    }
    
    if (sheetUrl !== undefined) {
      org.integrations.googleSheets.sheetUrl = sheetUrl;
    }

    org.markModified("integrations");
    await org.save();

    res.json({
      success: true,
      data: org.integrations.googleSheets,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/integrations/rest-api
// Connect, disconnect, or regenerate REST API developer key
router.put("/rest-api", async (req, res, next) => {
  try {
    const { connected, regenerate } = req.body;
    const crypto = require("crypto");

    const org = await Organization.findById(req.organizationId);
    if (!org) {
      return next(new AppError("Organization not found", 404));
    }

    if (!org.integrations) {
      org.integrations = {};
    }
    if (!org.integrations.restApi) {
      org.integrations.restApi = { connected: false, apiKey: "" };
    }

    if (connected === false) {
      org.integrations.restApi.connected = false;
      org.integrations.restApi.apiKey = "";
    } else if (connected === true || regenerate === true) {
      org.integrations.restApi.connected = true;
      if (!org.integrations.restApi.apiKey || regenerate === true) {
        org.integrations.restApi.apiKey = "pf_live_" + crypto.randomBytes(24).toString("hex");
      }
    }

    org.markModified("integrations");
    await org.save();

    // Log audit log
    try {
      const Workspace = require("../models/Workspace");
      const auditService = require("../services/auditService");
      const defaultWorkspace = await Workspace.findOne({ organizationId: org._id }).sort({ createdAt: 1 });
      if (defaultWorkspace) {
        req.workspaceId = defaultWorkspace._id;
        const state = org.integrations.restApi.connected ? "activated" : "deactivated";
        await auditService.logAction(
          req,
          "rest_api_toggled",
          org._id,
          "Integration",
          `Developer REST API credentials ${state} for organization`
        );
      }
    } catch (e) {
      console.warn("Failed to log integrations change:", e.message);
    }

    res.json({
      success: true,
      data: org.integrations.restApi,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/integrations/slack
// Update Slack integration settings
router.put("/slack", async (req, res, next) => {
  try {
    const { connected, webhookUrl } = req.body;

    const org = await Organization.findById(req.organizationId);
    if (!org) {
      return next(new AppError("Organization not found", 404));
    }

    if (!org.integrations) {
      org.integrations = {};
    }
    if (!org.integrations.slack) {
      org.integrations.slack = {};
    }

    if (connected !== undefined) {
      org.integrations.slack.connected = connected;
    }
    
    if (webhookUrl !== undefined) {
      org.integrations.slack.webhookUrl = webhookUrl;
    }

    org.markModified("integrations");
    await org.save();

    res.json({
      success: true,
      data: org.integrations.slack,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
