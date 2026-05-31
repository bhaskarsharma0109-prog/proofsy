const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Template = require("../models/Template");
const auditService = require("../services/auditService");

const TEMPLATES_DIR = path.join(__dirname, "../../storage/templates");

// Ensure templates directory exists
if (!fs.existsSync(TEMPLATES_DIR)) {
  fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
}

// Helper to move files across device boundaries (essential for Docker volumes)
const safeMove = (src, dest) => {
  try {
    fs.renameSync(src, dest);
  } catch (err) {
    if (err.code === "EXDEV") {
      fs.copyFileSync(src, dest);
      fs.unlinkSync(src);
    } else {
      throw err;
    }
  }
};

// POST /api/templates — Create a new template
exports.createTemplate = async (req, res) => {
  try {
    const { name, width, height, textLayers, qrCode } = req.body;
    const file = req.file;

    if (!name) {
      return res.status(400).json({ success: false, error: "Missing template name" });
    }
    if (!file) {
      return res.status(400).json({ success: false, error: "Missing background file" });
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const backgroundType = ext === ".pdf" ? "pdf" : "image";
    const fileName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const destPath = path.join(TEMPLATES_DIR, fileName);

    // Move file from uploads to templates storage
    safeMove(file.path, destPath);

    const template = await Template.create({
      name,
      backgroundType,
      backgroundUrl: `/storage/templates/${fileName}`,
      width: parseInt(width) || 1056,
      height: parseInt(height) || 746,
      textLayers: textLayers ? JSON.parse(textLayers) : [],
      qrCode: qrCode ? JSON.parse(qrCode) : undefined,
      organizationId: req.organizationId,
      workspaceId: req.workspaceId,
    });

    await auditService.logAction(req, "template_created", template._id, "Template", `Created event template "${template.name}"`);

    return res.status(201).json({
      success: true,
      data: template,
    });
  } catch (err) {
    console.error("createTemplate error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// GET /api/templates — List all templates
exports.listTemplates = async (req, res) => {
  try {
    const templates = await Template.find({
      $or: [{ workspaceId: req.workspaceId }, { isStarter: true }],
    })
      .sort({ isStarter: -1, createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      data: templates.map((t) => ({
        id: t._id,
        name: t.name,
        backgroundType: t.backgroundType,
        backgroundUrl: t.backgroundUrl,
        width: t.width,
        height: t.height,
        textLayerCount: t.textLayers?.length || 0,
        isStarter: t.isStarter,
        qrCode: t.qrCode,
        createdAt: t.createdAt,
      })),
    });
  } catch (err) {
    console.error("listTemplates error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// GET /api/templates/:id — Get a single template with full text layers
exports.getTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "Invalid template id" });
    }

    const template = await Template.findOne({
      _id: id,
      $or: [{ workspaceId: req.workspaceId }, { isStarter: true }],
    });
    if (!template) {
      return res.status(404).json({ success: false, error: "Template not found or unauthorized" });
    }

    return res.json({
      success: true,
      data: template,
    });
  } catch (err) {
    console.error("getTemplate error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// PUT /api/templates/:id — Update template (text layers, name, qrCode)
exports.updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, textLayers, qrCode, width, height } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "Invalid template id" });
    }

    const template = await Template.findOne({
      _id: id,
      $or: [{ workspaceId: req.workspaceId }, { isStarter: true }],
    });
    if (!template) {
      return res.status(404).json({ success: false, error: "Template not found or unauthorized" });
    }

    if (name) template.name = name;
    if (textLayers) template.textLayers = textLayers;
    if (qrCode) template.qrCode = qrCode;
    if (width) template.width = width;
    if (height) template.height = height;
    if (req.body.backgroundUrl) template.backgroundUrl = req.body.backgroundUrl;
    if (req.body.backgroundType) template.backgroundType = req.body.backgroundType;

    // If a new background file is uploaded, replace the old one
    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      const fileName = `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const destPath = path.join(TEMPLATES_DIR, fileName);
      safeMove(req.file.path, destPath);

      // Delete old background
      const oldPath = path.join(__dirname, "../..", template.backgroundUrl);
      if (fs.existsSync(oldPath) && !template.isStarter) {
        fs.unlinkSync(oldPath);
      }

      template.backgroundType = ext === ".pdf" ? "pdf" : "image";
      template.backgroundUrl = `/storage/templates/${fileName}`;
    }

    await template.save();

    await auditService.logAction(req, "template_updated", template._id, "Template", `Updated event template "${template.name}"`);

    return res.json({
      success: true,
      data: template,
    });
  } catch (err) {
    console.error("updateTemplate error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// DELETE /api/templates/:id — Delete a template
exports.deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "Invalid template id" });
    }

    const template = await Template.findOne({
      _id: id,
      workspaceId: req.workspaceId,
    });
    if (!template) {
      return res.status(404).json({ success: false, error: "Template not found or unauthorized" });
    }

    if (template.isStarter) {
      return res.status(403).json({ success: false, error: "Cannot delete starter templates" });
    }

    // Delete background file
    const bgPath = path.join(__dirname, "../..", template.backgroundUrl);
    if (fs.existsSync(bgPath)) {
      fs.unlinkSync(bgPath);
    }

    await Template.findByIdAndDelete(id);

    await auditService.logAction(req, "template_deleted", id, "Template", `Deleted event template "${template.name}"`);

    return res.json({
      success: true,
      data: { id },
    });
  } catch (err) {
    console.error("deleteTemplate error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// POST /api/templates/seed — Seed starter templates (run once)
exports.seedStarterTemplates = async (req, res) => {
  try {
    const existing = await Template.countDocuments({ isStarter: true });
    if (existing > 0) {
      return res.json({ success: true, message: `${existing} starter templates already exist.` });
    }

    const starters = [
      {
        name: "Elegant Gold",
        backgroundUrl: "/storage/templates/elegant-gold.png",
        textLayers: [
          { variable: "recipient_name", label: "Recipient Name", x: 528, y: 320, fontSize: 42, fontFamily: "Inter", fontWeight: "bold", color: "#1a1a1a", textAlign: "center", maxWidth: 700 },
          { variable: "event_name", label: "Event Name", x: 528, y: 400, fontSize: 22, fontFamily: "Inter", fontWeight: "normal", color: "#555555", textAlign: "center", maxWidth: 600 },
          { variable: "date", label: "Date", x: 528, y: 460, fontSize: 16, fontFamily: "Inter", fontWeight: "normal", color: "#777777", textAlign: "center", maxWidth: 400 },
          { variable: "verification_code", label: "Verification Code", x: 528, y: 650, fontSize: 12, fontFamily: "monospace", fontWeight: "normal", color: "#999999", textAlign: "center", maxWidth: 300 },
          { variable: "organizer", label: "Organizer", x: 200, y: 580, fontSize: 16, fontFamily: "Inter", fontWeight: "normal", color: "#555555", textAlign: "center", maxWidth: 300 },
        ],
      },
      {
        name: "Modern Blue",
        backgroundUrl: "/storage/templates/modern-blue.png",
        textLayers: [
          { variable: "recipient_name", label: "Recipient Name", x: 528, y: 300, fontSize: 44, fontFamily: "Inter", fontWeight: "bold", color: "#0f172a", textAlign: "center", maxWidth: 700 },
          { variable: "event_name", label: "Event Name", x: 528, y: 380, fontSize: 24, fontFamily: "Inter", fontWeight: "normal", color: "#2563eb", textAlign: "center", maxWidth: 600 },
          { variable: "date", label: "Date", x: 528, y: 440, fontSize: 16, fontFamily: "Inter", fontWeight: "normal", color: "#64748b", textAlign: "center", maxWidth: 400 },
          { variable: "verification_code", label: "Verification Code", x: 528, y: 650, fontSize: 12, fontFamily: "monospace", fontWeight: "normal", color: "#94a3b8", textAlign: "center", maxWidth: 300 },
          { variable: "organizer", label: "Organizer", x: 200, y: 580, fontSize: 16, fontFamily: "Inter", fontWeight: "normal", color: "#475569", textAlign: "center", maxWidth: 300 },
        ],
      },
      {
        name: "Creative Gradient",
        backgroundUrl: "/storage/templates/creative-gradient.png",
        textLayers: [
          { variable: "recipient_name", label: "Recipient Name", x: 528, y: 310, fontSize: 40, fontFamily: "Inter", fontWeight: "bold", color: "#4c1d95", textAlign: "center", maxWidth: 700 },
          { variable: "event_name", label: "Event Name", x: 528, y: 390, fontSize: 22, fontFamily: "Inter", fontWeight: "normal", color: "#7c3aed", textAlign: "center", maxWidth: 600 },
          { variable: "date", label: "Date", x: 528, y: 450, fontSize: 16, fontFamily: "Inter", fontWeight: "normal", color: "#8b5cf6", textAlign: "center", maxWidth: 400 },
          { variable: "verification_code", label: "Verification Code", x: 528, y: 640, fontSize: 12, fontFamily: "monospace", fontWeight: "normal", color: "#a78bfa", textAlign: "center", maxWidth: 300 },
          { variable: "organizer", label: "Organizer", x: 200, y: 570, fontSize: 16, fontFamily: "Inter", fontWeight: "normal", color: "#6d28d9", textAlign: "center", maxWidth: 300 },
        ],
      },
      {
        name: "Dark Premium",
        backgroundUrl: "/storage/templates/dark-premium.png",
        textLayers: [
          { variable: "recipient_name", label: "Recipient Name", x: 528, y: 300, fontSize: 44, fontFamily: "Inter", fontWeight: "bold", color: "#f8fafc", textAlign: "center", maxWidth: 700 },
          { variable: "event_name", label: "Event Name", x: 528, y: 380, fontSize: 24, fontFamily: "Inter", fontWeight: "normal", color: "#cbd5e1", textAlign: "center", maxWidth: 600 },
          { variable: "date", label: "Date", x: 528, y: 440, fontSize: 16, fontFamily: "Inter", fontWeight: "normal", color: "#94a3b8", textAlign: "center", maxWidth: 400 },
          { variable: "verification_code", label: "Verification Code", x: 528, y: 650, fontSize: 12, fontFamily: "monospace", fontWeight: "normal", color: "#64748b", textAlign: "center", maxWidth: 300 },
          { variable: "organizer", label: "Organizer", x: 200, y: 580, fontSize: 16, fontFamily: "Inter", fontWeight: "normal", color: "#94a3b8", textAlign: "center", maxWidth: 300 },
        ],
        qrCode: { enabled: true, x: 880, y: 580, size: 120 },
      },
      {
        name: "Nature Green",
        backgroundUrl: "/storage/templates/nature-green.png",
        textLayers: [
          { variable: "recipient_name", label: "Recipient Name", x: 528, y: 310, fontSize: 42, fontFamily: "Inter", fontWeight: "bold", color: "#14532d", textAlign: "center", maxWidth: 700 },
          { variable: "event_name", label: "Event Name", x: 528, y: 390, fontSize: 22, fontFamily: "Inter", fontWeight: "normal", color: "#166534", textAlign: "center", maxWidth: 600 },
          { variable: "date", label: "Date", x: 528, y: 450, fontSize: 16, fontFamily: "Inter", fontWeight: "normal", color: "#4d7c0f", textAlign: "center", maxWidth: 400 },
          { variable: "verification_code", label: "Verification Code", x: 528, y: 650, fontSize: 12, fontFamily: "monospace", fontWeight: "normal", color: "#65a30d", textAlign: "center", maxWidth: 300 },
          { variable: "organizer", label: "Organizer", x: 200, y: 580, fontSize: 16, fontFamily: "Inter", fontWeight: "normal", color: "#166534", textAlign: "center", maxWidth: 300 },
        ],
      },
      {
        name: "Minimal Mono",
        backgroundUrl: "/storage/templates/minimal-mono.png",
        textLayers: [
          { variable: "recipient_name", label: "Recipient Name", x: 528, y: 300, fontSize: 44, fontFamily: "Inter", fontWeight: "bold", color: "#000000", textAlign: "center", maxWidth: 700 },
          { variable: "event_name", label: "Event Name", x: 528, y: 380, fontSize: 22, fontFamily: "Inter", fontWeight: "normal", color: "#333333", textAlign: "center", maxWidth: 600 },
          { variable: "date", label: "Date", x: 528, y: 440, fontSize: 16, fontFamily: "Inter", fontWeight: "normal", color: "#666666", textAlign: "center", maxWidth: 400 },
          { variable: "verification_code", label: "Verification Code", x: 528, y: 650, fontSize: 12, fontFamily: "monospace", fontWeight: "normal", color: "#888888", textAlign: "center", maxWidth: 300 },
          { variable: "organizer", label: "Organizer", x: 200, y: 580, fontSize: 16, fontFamily: "Inter", fontWeight: "normal", color: "#444444", textAlign: "center", maxWidth: 300 },
        ],
      },
    ];

    const docs = starters.map((s) => ({
      ...s,
      backgroundType: "image",
      width: 1056,
      height: 746,
      isStarter: true,
    }));

    await Template.insertMany(docs);

    return res.status(201).json({
      success: true,
      message: `Seeded ${docs.length} starter templates.`,
    });
  } catch (err) {
    console.error("seedStarterTemplates error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};
