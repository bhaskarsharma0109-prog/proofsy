const Workspace = require("../models/Workspace");
const TeamMember = require("../models/TeamMember");
const mongoose = require("mongoose");

// POST /api/workspaces — Create a new workspace (department or club)
exports.createWorkspace = async (req, res) => {
  try {
    const { name, slug } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: "Please provide a workspace name" });
    }

    const workspaceSlug = (slug || name)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    let finalSlug = workspaceSlug || "dept";
    let slugExists = await Workspace.findOne({ slug: finalSlug });
    while (slugExists) {
      finalSlug = `${workspaceSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
      slugExists = await Workspace.findOne({ slug: finalSlug });
    }

    // Only college owners can create workspaces
    if (req.member.role !== "owner") {
      return res.status(403).json({ success: false, error: "Only college owners/deans can create new departments/clubs" });
    }

    const workspace = await Workspace.create({
      name,
      organizationId: req.organizationId,
      slug: finalSlug,
      createdBy: req.member._id,
    });

    return res.status(201).json({
      success: true,
      data: workspace,
    });
  } catch (err) {
    console.error("createWorkspace error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// GET /api/workspaces — List workspaces the user is authorized to access
exports.listWorkspaces = async (req, res) => {
  try {
    let filter = { organizationId: req.organizationId };

    // Strict multi-tenant boundaries:
    // College owner has access to all workspaces.
    // Admin, editor, and viewer only see the workspace they are assigned to.
    if (req.member.role !== "owner") {
      if (!req.member.workspaceId) {
        return res.json({ success: true, data: [] });
      }
      filter._id = req.member.workspaceId;
    }

    const workspaces = await Workspace.find(filter).sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: workspaces,
    });
  } catch (err) {
    console.error("listWorkspaces error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// POST /api/workspaces/:id/invite — Invite/add a student lead or faculty advisor to a specific workspace
exports.inviteMember = async (req, res) => {
  try {
    const { id } = req.params; // workspace ID
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, error: "Please provide name, email, password, and role" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "Invalid workspace id" });
    }

    const workspace = await Workspace.findOne({ _id: id, organizationId: req.organizationId });
    if (!workspace) {
      return res.status(404).json({ success: false, error: "Workspace not found or unauthorized" });
    }

    // RBAC: Only college owners or department admins can invite new members to a workspace
    if (req.member.role !== "owner" && req.member.role !== "admin") {
      return res.status(403).json({ success: false, error: "Only college owners or department admins can invite members" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already in use
    const existing = await TeamMember.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ success: false, error: "Email already registered in college team" });
    }

    const newMember = await TeamMember.create({
      organizationId: req.organizationId,
      workspaceId: workspace._id,
      name,
      email: normalizedEmail,
      password,
      role, // admin, editor, viewer
    });

    return res.status(201).json({
      success: true,
      data: {
        id: newMember._id,
        name: newMember.name,
        email: newMember.email,
        role: newMember.role,
        workspaceId: newMember.workspaceId,
      },
    });
  } catch (err) {
    console.error("inviteMember error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// PUT /api/workspaces/:id/smtp — Configure custom SMTP mail delivery settings for official college fests
exports.updateSmtpSettings = async (req, res) => {
  try {
    const { id } = req.params; // workspace ID
    const { host, port, secure, authUser, authPass, fromName, fromEmail } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "Invalid workspace id" });
    }

    const workspace = await Workspace.findOne({ _id: id, organizationId: req.organizationId });
    if (!workspace) {
      return res.status(404).json({ success: false, error: "Workspace not found or unauthorized" });
    }

    // RBAC: Only college owners or department admins can update SMTP details
    if (req.member.role !== "owner" && req.member.role !== "admin") {
      return res.status(403).json({ success: false, error: "Only college owners or department admins can update mail configuration" });
    }

    workspace.smtpSettings = {
      host: host || "",
      port: Number(port) || 587,
      secure: secure === true,
      authUser: authUser || "",
      authPass: authPass || "",
      fromName: fromName || "",
      fromEmail: fromEmail || "",
    };

    await workspace.save();

    return res.json({
      success: true,
      message: "College SMTP settings updated successfully",
      data: workspace.smtpSettings,
    });
  } catch (err) {
    console.error("updateSmtpSettings error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// GET /api/workspaces/:id/members — List team members of a specific workspace
exports.listWorkspaceMembers = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "Invalid workspace id" });
    }

    const workspace = await Workspace.findOne({ _id: id, organizationId: req.organizationId });
    if (!workspace) {
      return res.status(404).json({ success: false, error: "Workspace not found or unauthorized" });
    }

    if (req.member.role !== "owner" && (!req.member.workspaceId || req.member.workspaceId.toString() !== id.toString())) {
      return res.status(403).json({ success: false, error: "Unauthorized access to this department/club members list" });
    }

    const members = await TeamMember.find({ workspaceId: id }).select("-password");

    return res.json({
      success: true,
      data: members,
    });
  } catch (err) {
    console.error("listWorkspaceMembers error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};
