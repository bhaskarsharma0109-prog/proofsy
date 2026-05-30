const jwt = require("jsonwebtoken");
const TeamMember = require("../models/TeamMember");
const Organization = require("../models/Organization");

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "proofsy_secret_key");

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

module.exports = { protect, authorize };
