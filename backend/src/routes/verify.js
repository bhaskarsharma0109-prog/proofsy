const express = require("express");
const router = express.Router();
const verifyController = require("../controllers/verifyController");

router.get("/public-key", verifyController.getPublicKey);
router.get("/:code", verifyController.verifyCertificate);
router.get("/:workspaceSlug/:code", verifyController.verifyCertificate);

module.exports = router;
