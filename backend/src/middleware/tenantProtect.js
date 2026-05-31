const Workspace = require("../models/Workspace");

/**
 * Middleware to enforce tenant separation and resolve workspace context.
 * Requires the `protect` middleware to have run first (populating req.member and req.organizationId).
 */
const tenantProtect = async (req, res, next) => {
  try {
    let workspaceId = req.headers["x-workspace-id"] || req.query.workspaceId;

    // If no workspaceId provided, fallback to the default (first created) workspace of the organization
    if (!workspaceId) {
      const defaultWorkspace = await Workspace.findOne({ organizationId: req.organizationId }).sort({ createdAt: 1 });
      if (!defaultWorkspace) {
        return res.status(404).json({
          success: false,
          error: "No workspaces found for this college. Please create one.",
        });
      }
      workspaceId = defaultWorkspace._id.toString();
    }

    const workspace = await Workspace.findOne({ _id: workspaceId, organizationId: req.organizationId });
    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: "Workspace not found or unauthorized",
      });
    }

    // Role-based boundaries:
    // If the member is not a college 'owner' (e.g. Dean/Principal), they must be assigned to this workspace specifically.
    if (req.member.role !== "owner" && (!req.member.workspaceId || req.member.workspaceId.toString() !== workspaceId.toString())) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized access to this department/club workspace",
      });
    }

    req.workspaceId = workspace._id;
    req.workspace = workspace;
    next();
  } catch (err) {
    console.error("tenantProtect error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error during workspace authorization",
    });
  }
};

/**
 * Middleware to restrict endpoints to specific team roles (owner, admin, editor, viewer).
 */
const restrictToRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.member || !allowedRoles.includes(req.member.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Your role (${req.member?.role || "unknown"}) does not have permissions to perform this action.`,
      });
    }
    next();
  };
};

module.exports = { tenantProtect, restrictToRoles };
