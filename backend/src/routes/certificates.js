const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const certificateController = require("../controllers/certificateController");
const { protect } = require("../middleware/auth");

// Configure multer for CSV uploads.
// We require BOTH a CSV extension and an acceptable CSV-ish MIME type to reduce
// the risk of disguised uploads being processed.
const CSV_MIME_TYPES = new Set([
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "text/plain",
  "application/octet-stream",
]);

const upload = multer({
  dest: path.join(__dirname, "../../uploads/"),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".csv" && CSV_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// All certificate routes require authentication and are organization-scoped.
router.post("/generate", protect, upload.single("file"), certificateController.generateCertificates);
router.post("/send-emails", protect, certificateController.sendEmails);
router.get("/stats", protect, certificateController.getStats);
router.get("/", protect, certificateController.listCertificates);
router.get("/:id", protect, certificateController.getCertificateById);

module.exports = router;
