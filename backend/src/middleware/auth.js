const jwt = require("jsonwebtoken");
const TeamMember = require("../models/TeamMember");
const Organization = require("../models/Organization");
const User = require("../models/User");

const protect = async (req, res, next) => {
  let token;

  if (req.cookies.token) {
    token = req.cookies.token;
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Not authorized to access this route",
    });
  }

  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        error: "Server authentication is not configured",
      });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.member = await TeamMember.findById(decoded.id);
    if (!req.member) {
      return res.status(401).json({
        success: false,
        error: "Not authorized, user not found",
      });
    }

    req.organizationId = req.member.organizationId;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: "Not authorized, token failed",
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.member.role)) {
      return res.status(403).json({
        success: false,
        error: `User role ${req.member.role} is not authorized to access this route`,
      });
    }
    next();
  };
};

const protectRecipient = async (req, res, next) => {
  let token;

  if (req.cookies.recipientToken) {
    token = req.cookies.recipientToken;
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Not authorized to access this route",
    });
  }

  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        error: "Server authentication is not configured",
      });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id);
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Not authorized, user not found",
      });
    }

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: "Not authorized, token failed",
    });
  }
};

const protectApiKey = async (req, res, next) => {
  let apiKey;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    apiKey = req.headers.authorization.split(" ")[1];
  } else if (req.query.apiKey) {
    apiKey = req.query.apiKey;
  } else if (req.headers["x-api-key"]) {
    apiKey = req.headers["x-api-key"];
  }

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: "Missing API key in Authorization header or query parameters",
    });
  }

  try {
    const org = await Organization.findOne({
      "integrations.restApi.apiKey": apiKey,
      "integrations.restApi.connected": true,
    });

    if (!org) {
      return res.status(401).json({
        success: false,
        error: "Invalid or inactive API key",
      });
    }

    req.organizationId = org._id;
    next();
  } catch (err) {
    console.error("protectApiKey error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error during API key authentication",
    });
  }
};

module.exports = { protect, authorize, protectRecipient, protectApiKey };
