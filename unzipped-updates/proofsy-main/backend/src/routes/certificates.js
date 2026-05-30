const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const certificateController = require("../controllers/certificateController");

// Configure multer for CSV uploads
const upload = multer({
  dest: path.join(__dirname, "../../uploads/"),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

router.post("/generate", upload.single("file"), certificateController.generateCertificates);
router.post("/send-emails", certificateController.sendEmails);
router.get("/stats", certificateController.getStats);
router.get("/", certificateController.listCertificates);
router.get("/:id", certificateController.getCertificateById);

module.exports = router;
