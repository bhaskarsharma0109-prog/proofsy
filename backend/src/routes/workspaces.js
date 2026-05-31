const express = require("express");
const router = express.Router();
const workspaceController = require("../controllers/workspaceController");
const { protect } = require("../middleware/auth");

router.post("/", protect, workspaceController.createWorkspace);
router.get("/", protect, workspaceController.listWorkspaces);
router.post("/:id/invite", protect, workspaceController.inviteMember);
router.put("/:id/smtp", protect, workspaceController.updateSmtpSettings);
router.get("/:id/members", protect, workspaceController.listWorkspaceMembers);

module.exports = router;
