const express = require("express");
const router = express.Router();
const eventController = require("../controllers/eventController");
const { protect } = require("../middleware/auth");
const { tenantProtect } = require("../middleware/tenantProtect");

router.post("/", protect, tenantProtect, eventController.createEvent);
router.get("/", protect, tenantProtect, eventController.listEvents);
router.get("/:id", protect, tenantProtect, eventController.getEvent);
router.delete("/:id", protect, tenantProtect, eventController.deleteEvent);
router.get("/:id/google-sheets/preview", protect, tenantProtect, eventController.previewGoogleSheets);
router.post("/:id/google-sheets/import", protect, tenantProtect, eventController.importGoogleSheets);

module.exports = router;
