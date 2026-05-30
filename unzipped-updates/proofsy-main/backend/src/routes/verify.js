const express = require("express");
const router = express.Router();
const verifyController = require("../controllers/verifyController");

router.get("/:code", verifyController.verifyCertificate);

module.exports = router;
