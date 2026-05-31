const express = require("express");
const router = express.Router();
const auditController = require("../controllers/auditController");
const { protect } = require("../middleware/auth");
const { tenantProtect } = require("../middleware/tenantProtect");

router.get("/", protect, tenantProtect, auditController.listAuditLogs);

module.exports = router;
