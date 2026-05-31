const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const Workspace = require("../models/Workspace");
const storageService = require("../services/storageService");
const { protect } = require("../middleware/auth");
const { tenantProtect, restrictToRoles } = require("../middleware/tenantProtect");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (/^image\/(png|jpeg|jpg|webp|svg\+xml)$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PNG, JPG, WEBP, or SVG logos are allowed"), false);
    }
  },
  limits: { fileSize: 2 * 1024 * 1024 },
});

const defaultBranding = {
  logo: "",
  primaryColor: "#2563EB",
  accentColor: "#16A34A",
  customDomain: "",
  brandingEnabled: false,
  verificationPageTitle: "",
  footerText: "",
};

function normalizeBranding(branding = {}) {
  const plainBranding = typeof branding.toObject === "function" ? branding.toObject() : branding;
  return {
    ...defaultBranding,
    ...plainBranding,
  };
}

function sanitizeBranding(body) {
  const next = {};
  const textFields = ["logo", "customDomain", "verificationPageTitle", "footerText"];
  for (const field of textFields) {
    if (body[field] !== undefined) {
      next[field] = String(body[field]).trim();
    }
  }

  const colorFields = ["primaryColor", "accentColor"];
  for (const field of colorFields) {
    if (body[field] !== undefined) {
      const value = String(body[field]).trim();
      if (!/^#[0-9a-fA-F]{6}$/.test(value)) {
        const error = new Error(`${field} must be a valid hex color`);
        error.statusCode = 400;
        throw error;
      }
      next[field] = value;
    }
  }

  if (body.brandingEnabled !== undefined) {
    next.brandingEnabled = Boolean(body.brandingEnabled);
  }

  return next;
}

// Public branding config for verification pages.
router.get("/:workspaceId", async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
      return res.status(400).json({ success: false, error: "Invalid workspace id" });
    }

    const workspace = await Workspace.findById(workspaceId).select("name branding").lean();
    if (!workspace) {
      return res.status(404).json({ success: false, error: "Workspace not found" });
    }

    return res.json({
      success: true,
      data: {
        workspaceId: workspace._id,
        workspaceName: workspace.name,
        branding: normalizeBranding(workspace.branding),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Update branding for the active workspace.
router.put("/", protect, tenantProtect, restrictToRoles("owner", "admin"), async (req, res, next) => {
  try {
    const updates = sanitizeBranding(req.body || {});
    req.workspace.branding = {
      ...normalizeBranding(req.workspace.branding),
      ...updates,
    };
    await req.workspace.save();

    return res.json({
      success: true,
      data: {
        workspaceId: req.workspace._id,
        workspaceName: req.workspace.name,
        branding: normalizeBranding(req.workspace.branding),
      },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    next(error);
  }
});

// Upload and attach an organization logo for the active workspace.
router.post(
  "/logo",
  protect,
  tenantProtect,
  restrictToRoles("owner", "admin"),
  upload.single("logo"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: "Missing logo file" });
      }

      const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
      const key = `branding/${req.workspaceId}/${Date.now()}-${safeName}`;
      const logoUrl = await storageService.uploadFile(req.file.buffer, key, req.file.mimetype);

      req.workspace.branding = {
        ...normalizeBranding(req.workspace.branding),
        logo: logoUrl,
      };
      await req.workspace.save();

      return res.status(201).json({
        success: true,
        data: {
          logo: logoUrl,
          branding: normalizeBranding(req.workspace.branding),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
