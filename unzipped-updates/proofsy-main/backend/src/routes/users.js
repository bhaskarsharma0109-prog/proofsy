const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

router.post("/", userController.createUser);
router.get("/", userController.listUsers);
router.get("/:email/certificates", userController.getUserCertificates);
router.get("/:email", userController.getUserByEmail);

module.exports = router;
