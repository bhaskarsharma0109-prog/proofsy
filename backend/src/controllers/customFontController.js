const fs = require("fs");
const path = require("path");
const CustomFont = require("../models/CustomFont");
const auditService = require("../services/auditService");

// POST /api/custom-fonts
exports.uploadCustomFont = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "Please upload a TTF font file." });
    }

    const { name, fontWeight } = req.body;
    if (!name) {
      // Clean up uploaded temp file
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, error: "Font name is required." });
    }

    const weight = fontWeight === "bold" ? "bold" : "normal";
    const family = name.replace(/[^a-zA-Z0-9]/g, "");
    
    if (!family) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, error: "Font name must contain alphanumeric characters." });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext !== ".ttf") {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, error: "Only .ttf (TrueType Font) files are supported." });
    }

    const fontsDir = path.join(__dirname, "../../storage/fonts");
    if (!fs.existsSync(fontsDir)) {
      fs.mkdirSync(fontsDir, { recursive: true });
    }

    const targetFileName = `${family}-${weight}.ttf`;
    const targetPath = path.join(fontsDir, targetFileName);

    // Save/move physical TTF file to storage
    try {
      fs.renameSync(req.file.path, targetPath);
    } catch (renameErr) {
      if (renameErr.code === "EXDEV") {
        fs.copyFileSync(req.file.path, targetPath);
        fs.unlinkSync(req.file.path);
      } else {
        throw renameErr;
      }
    }

    const fontUrl = `/storage/fonts/${targetFileName}`;

    // Overwrite existing family+weight configuration or insert fresh
    let customFont = await CustomFont.findOne({
      workspaceId: req.workspaceId,
      family: family,
      fontWeight: weight
    });

    if (customFont) {
      customFont.name = name;
      customFont.fontUrl = fontUrl;
      customFont.uploadedBy = req.member.id;
      await customFont.save();
    } else {
      customFont = await CustomFont.create({
        name,
        family,
        fontWeight: weight,
        fontUrl,
        workspaceId: req.workspaceId,
        uploadedBy: req.member.id
      });
    }

    await auditService.logAction(req, "font_uploaded", customFont._id, "CustomFont", `Uploaded brand custom font "${customFont.name}" (${customFont.fontWeight})`);

    return res.status(201).json({
      success: true,
      data: {
        id: customFont._id,
        name: customFont.name,
        family: customFont.family,
        fontWeight: customFont.fontWeight,
        fontUrl: customFont.fontUrl,
        createdAt: customFont.createdAt
      }
    });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    console.error("uploadCustomFont error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// GET /api/custom-fonts
exports.listCustomFonts = async (req, res, next) => {
  try {
    const customFonts = await CustomFont.find({ workspaceId: req.workspaceId })
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: customFonts.map(f => ({
        id: f._id,
        name: f.name,
        family: f.family,
        fontWeight: f.fontWeight,
        fontUrl: f.fontUrl,
        createdAt: f.createdAt
      }))
    });
  } catch (err) {
    console.error("listCustomFonts error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// DELETE /api/custom-fonts/:id
exports.deleteCustomFont = async (req, res, next) => {
  try {
    const { id } = req.params;
    const customFont = await CustomFont.findOne({ _id: id, workspaceId: req.workspaceId });

    if (!customFont) {
      return res.status(404).json({ success: false, error: "Font not found or unauthorized." });
    }

    // Unlink the physical file in storage
    const fontsDir = path.join(__dirname, "../../storage/fonts");
    const targetFileName = `${customFont.family}-${customFont.fontWeight}.ttf`;
    const filePath = path.join(fontsDir, targetFileName);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await customFont.deleteOne();

    await auditService.logAction(req, "font_deleted", customFont._id, "CustomFont", `Deleted brand custom font "${customFont.name}" (${customFont.fontWeight})`);

    return res.json({ success: true, message: "Custom font deleted successfully." });
  } catch (err) {
    console.error("deleteCustomFont error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};
