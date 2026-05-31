const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const certificateController = require("../controllers/certificateController");
const lifecycleController = require("../controllers/lifecycleController");
const { protect } = require("../middleware/auth");
const { tenantProtect } = require("../middleware/tenantProtect");

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
router.post("/generate", protect, tenantProtect, upload.single("file"), certificateController.generateCertificates);
router.post("/send-emails", protect, tenantProtect, certificateController.sendEmails);
router.get("/stats", protect, tenantProtect, certificateController.getStats);
router.get("/verification-analytics", protect, tenantProtect, certificateController.getVerificationAnalytics);
router.get("/expiring", protect, tenantProtect, lifecycleController.listExpiringCertificates);
router.get("/", protect, tenantProtect, certificateController.listCertificates);
router.post("/bulk-revoke", protect, tenantProtect, lifecycleController.bulkRevokeCertificates);
router.get("/:id", protect, tenantProtect, certificateController.getCertificateById);
router.post("/:id/retry", protect, tenantProtect, certificateController.retryCertificate);
router.put("/:id/expiry", protect, tenantProtect, lifecycleController.setCertificateExpiry);
router.post("/:id/revoke", protect, tenantProtect, lifecycleController.revokeCertificate);
router.post("/:id/suspend", protect, tenantProtect, lifecycleController.suspendCertificate);
router.post("/:id/reinstate", protect, tenantProtect, lifecycleController.reinstateCertificate);
router.post("/:id/renew", protect, tenantProtect, lifecycleController.renewCertificate);

module.exports = router;
