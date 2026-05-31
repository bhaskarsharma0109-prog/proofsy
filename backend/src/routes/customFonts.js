const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const customFontController = require("../controllers/customFontController");
const { protect } = require("../middleware/auth");
const { tenantProtect } = require("../middleware/tenantProtect");

// Configure multer for temporary font file destination
const upload = multer({
  dest: path.join(__dirname, "../../uploads/"),
  fileFilter: (req, file, cb) => {
    const allowed = [".ttf"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only TrueType (.ttf) fonts are supported"), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max font size
});

router.post(
  "/",
  protect,
  tenantProtect,
  upload.single("fontFile"),
  customFontController.uploadCustomFont
);

router.get(
  "/",
  protect,
  tenantProtect,
  customFontController.listCustomFonts
);

router.delete(
  "/:id",
  protect,
  tenantProtect,
  customFontController.deleteCustomFont
);

module.exports = router;
