const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { protect } = require("../middleware/auth");

// All admin user-directory routes require authentication and are
// organization-scoped. The recipient self-service certificate list now lives
// behind the recipient auth flow (see routes/recipient.js), not here.
router.post("/", protect, userController.createUser);
router.get("/", protect, userController.listUsers);
router.get("/:email/certificates", protect, userController.getUserCertificates);
router.get("/:email", protect, userController.getUserByEmail);

module.exports = router;
